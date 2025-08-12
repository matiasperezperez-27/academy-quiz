import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  // Mantenemos tus estados originales, incluyendo el uso de 'any'
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // La documentación de Supabase indica que onAuthStateChange se ejecuta
    // inmediatamente con la sesión actual, por lo que no necesitamos getSession().
    // Usaremos solo este método para evitar conflictos.
    const {
      data: { subscription },
    } = (supabase.auth as any).onAuthStateChange((_event: any, currentSession: any) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      
      // ¡ESTA ES LA CORRECCIÓN CLAVE!
      // Una vez que el "oyente" nos da la primera respuesta (sea una sesión
      // o sea null), significa que la comprobación inicial ha terminado.
      setLoading(false);
    });

    // Limpiamos la suscripción cuando el componente se desmonte
    return () => {
      subscription.unsubscribe();
    };
  }, []); // El array vacío asegura que este efecto se ejecute solo una vez.

  // Mantenemos tu función signOut intacta
  const signOut = async () => {
    await (supabase.auth as any).signOut();
  };

  return { user, session, loading, signOut };
}
