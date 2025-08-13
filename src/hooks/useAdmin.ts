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
        console.log('❌ useAdmin: No user found');
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      try {
        console.log('🔍 useAdmin: Checking admin status for user:', user.id);
        
        // Llamada directa sin tipado estricto para evitar problemas de tipos
        const { data, error } = await supabase
          .rpc('is_user_admin' as any, { user_id: user.id });

        console.log('📊 useAdmin: RPC response:', { data, error });

        if (error) {
          console.error('❌ useAdmin: RPC error:', error);
          throw error;
        }

        const adminStatus = Boolean(data);
        console.log('✅ useAdmin: Admin status determined:', adminStatus);
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error('❌ useAdmin: Error checking admin status:', error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
  }, [user]);

  // Log del estado actual para debugging
  console.log('🏠 useAdmin: Current state:', { isAdmin, loading, userId: user?.id });

  return { isAdmin, loading };
}