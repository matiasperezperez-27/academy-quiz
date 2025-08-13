import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useAdmin() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('Checking admin status for user:', user.id);
        
        // Método 1: Intentar con RPC function
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc('is_user_admin', { user_id: user.id });

        if (!rpcError && rpcResult !== null) {
          console.log('RPC result:', rpcResult);
          setIsAdmin(rpcResult);
        } else {
          console.log('RPC failed, trying direct query. Error:', rpcError);
          
          // Método 2: Consulta directa como fallback
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

          if (profileError) {
            console.error('Profile query error:', profileError);
            setIsAdmin(false);
          } else {
            console.log('Profile role:', profile?.role);
            setIsAdmin(profile?.role === 'admin');
          }
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Debug: Log cuando cambie el estado
  useEffect(() => {
    console.log('Admin hook state changed:', { isAdmin, loading, userId: user?.id });
  }, [isAdmin, loading, user?.id]);

  return { isAdmin, loading };
}