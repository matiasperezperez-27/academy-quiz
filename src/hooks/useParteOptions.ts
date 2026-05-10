import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const PARTE_PRESETS = ['Común', 'EXAMEN', 'Específica'];

export function useParteOptions(academiaIds: string[]) {
  const [options, setOptions] = useState<string[]>(PARTE_PRESETS);
  const key = academiaIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) { setOptions(PARTE_PRESETS); return; }
    supabase
      .from('preguntas')
      .select('parte')
      .in('academia_id', academiaIds)
      .not('parte', 'is', null)
      .neq('parte', '')
      .then(({ data }) => {
        const dbValues = (data?.map(p => p.parte as string) ?? []).filter(Boolean);
        const merged = [...new Set([...PARTE_PRESETS, ...dbValues])].sort();
        setOptions(merged);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return options;
}
