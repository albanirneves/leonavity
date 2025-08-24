-- Fix failed migration by removing invalid SELECT triggers and using existing audit function

-- 1) Attach existing generic audit function to sensitive tables (no SELECT triggers in Postgres)
DROP TRIGGER IF EXISTS audit_votes_access_trigger ON public.votes;
DROP TRIGGER IF EXISTS audit_accounts_access_trigger ON public.accounts;

-- Use the existing public.audit_sensitive_operations() to log changes
CREATE TRIGGER audit_votes_operations
  BEFORE INSERT OR UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operations();

CREATE TRIGGER audit_accounts_operations
  BEFORE INSERT OR UPDATE OR DELETE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_sensitive_operations();

-- 2) Add lightweight security alerting for admin-sensitive actions
CREATE OR REPLACE FUNCTION public.trigger_security_alert(_alert_type text, _details text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RAISE LOG 'SECURITY ALERT: % - % - user: % - at: %', _alert_type, _details, auth.uid(), now();
END;
$$;

CREATE OR REPLACE FUNCTION public.monitor_admin_activities()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'votes' AND TG_OP = 'DELETE' THEN
    PERFORM public.trigger_security_alert('BULK_DELETE', 'Vote row deleted');
  ELSIF TG_TABLE_NAME = 'accounts' AND TG_OP = 'UPDATE' AND OLD.access_token IS DISTINCT FROM NEW.access_token THEN
    PERFORM public.trigger_security_alert('TOKEN_CHANGE', 'Account access_token changed for id=' || NEW.id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS monitor_votes_admin_activity ON public.votes;
CREATE TRIGGER monitor_votes_admin_activity
  AFTER UPDATE OR DELETE ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_admin_activities();

DROP TRIGGER IF EXISTS monitor_accounts_admin_activity ON public.accounts;
CREATE TRIGGER monitor_accounts_admin_activity
  AFTER UPDATE ON public.accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.monitor_admin_activities();