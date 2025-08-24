-- Prevent deleting events/categories that have candidates

-- 1) Events: block delete when there are related candidates
CREATE OR REPLACE FUNCTION public.prevent_event_delete_if_candidates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id_event = COALESCE(OLD.id::int, OLD.id)
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir o evento %: existem candidatas cadastradas.', OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_event_delete_if_candidates ON public.events;
CREATE TRIGGER trg_prevent_event_delete_if_candidates
BEFORE DELETE ON public.events
FOR EACH ROW
EXECUTE FUNCTION public.prevent_event_delete_if_candidates();

-- 2) Categories: block delete when there are related candidates in that category of the event
CREATE OR REPLACE FUNCTION public.prevent_category_delete_if_candidates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.candidates c
    WHERE c.id_event = OLD.id_event
      AND c.id_category = OLD.id_category
  ) THEN
    RAISE EXCEPTION 'Não é possível excluir a categoria % do evento %: existem candidatas cadastradas.',
      OLD.id_category, OLD.id_event;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_category_delete_if_candidates ON public.categories;
CREATE TRIGGER trg_prevent_category_delete_if_candidates
BEFORE DELETE ON public.categories
FOR EACH ROW
EXECUTE FUNCTION public.prevent_category_delete_if_candidates();