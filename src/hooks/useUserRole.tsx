import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export const useUserRole = () => {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [userAccounts, setUserAccounts] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setIsAdmin(false);
        setUserAccounts([]);
        setLoading(false);
        return;
      }

      try {
        // Buscar roles do usuário
        const { data: roles, error } = await supabase
          .from('user_roles')
          .select('role, id_account')
          .eq('user_id', user.id);

        if (error) {
          console.error('Error fetching user roles:', error);
          setIsAdmin(false);
          setUserAccounts([]);
        } else {
          const adminRole = roles?.find(role => role.role === 'admin');
          setIsAdmin(!!adminRole);
          
          // Se não for admin, pegar as contas associadas
          if (!adminRole) {
            const accounts = roles?.filter(role => role.id_account).map(role => role.id_account) || [];
            setUserAccounts(accounts);
          } else {
            setUserAccounts([]);
          }
        }
      } catch (error) {
        console.error('Unexpected error fetching user role:', error);
        setIsAdmin(false);
        setUserAccounts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { isAdmin, userAccounts, loading };
};