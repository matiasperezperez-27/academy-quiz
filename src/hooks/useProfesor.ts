import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useProfesor() {
  const { user } = useAuth();
  const [isProfesor, setIsProfesor] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setIsProfesor(false);
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase
          .rpc('is_user_profesor' as any, { p_user_id: user.id });
        if (error) throw error;
        setIsProfesor(Boolean(data));
      } catch (err) {
        console.error('useProfesor:', err);
        setIsProfesor(false);
      } finally {
        setLoading(false);
      }
    };
    check();
  }, [user]);

  return { isProfesor, loading };
}
