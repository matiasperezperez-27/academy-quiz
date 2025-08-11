import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const {
      data: { subscription },
    } = (supabase.auth as any).onAuthStateChange((_event: any, newSession: any) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    (supabase.auth as any).getSession().then(({ data: { session } }: any) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await (supabase.auth as any).signOut();
  };

  return { user, session, loading, signOut };
}
