import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const PARTE_PRESETS = ['Común', 'EXAMEN', 'Específica'];

export function useParteOptions(academiaIds: string[]) {
  const [options, setOptions] = useState<string[]>(PARTE_PRESETS);
  const key = academiaIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) { setOptions(PARTE_PRESETS); return; }

    Promise.all([
      // Partes registradas oficialmente en la tabla
      supabase
        .from('partes_academia')
        .select('nombre')
        .in('academia_id', academiaIds),
      // Valores de parte que ya existen en preguntas (compatibilidad con datos anteriores)
      supabase
        .from('preguntas')
        .select('parte')
        .in('academia_id', academiaIds)
        .not('parte', 'is', null)
        .neq('parte', ''),
    ]).then(([tableRes, pregsRes]) => {
      const tableValues = (tableRes.data ?? []).map((p: any) => p.nombre as string);
      const pregValues = (pregsRes.data ?? []).map((p: any) => p.parte as string).filter(Boolean);
      const merged = [...new Set([...PARTE_PRESETS, ...tableValues, ...pregValues])].sort((a, b) =>
        a.localeCompare(b, 'es')
      );
      setOptions(merged);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return options;
}
