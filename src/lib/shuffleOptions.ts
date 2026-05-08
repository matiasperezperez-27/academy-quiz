import type { PreguntaForm } from '@/hooks/useGestionPreguntas';

export function shuffleOptions(form: PreguntaForm): PreguntaForm {
  const letras = ['A', 'B', 'C', 'D'];

  // Build active slots tracking original index so we can find the correct one after shuffle
  type Slot = { texto: string; exp: string | null; origIdx: number };
  const slots: Slot[] = [];
  if (form.opcion_a) slots.push({ texto: form.opcion_a, exp: form.explicacion_a ?? null, origIdx: 0 });
  if (form.opcion_b) slots.push({ texto: form.opcion_b, exp: form.explicacion_b ?? null, origIdx: 1 });
  if (form.opcion_c) slots.push({ texto: form.opcion_c, exp: form.explicacion_c ?? null, origIdx: 2 });
  if (form.opcion_d) slots.push({ texto: form.opcion_d, exp: form.explicacion_d ?? null, origIdx: 3 });

  const correctOrigIdx = letras.indexOf(form.solucion_letra);

  // Fisher-Yates shuffle
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  const newCorrectPos = slots.findIndex(s => s.origIdx === correctOrigIdx);

  return {
    ...form,
    opcion_a: slots[0]?.texto ?? form.opcion_a,
    opcion_b: slots[1]?.texto ?? form.opcion_b,
    opcion_c: slots[2]?.texto ?? '',
    opcion_d: slots[3]?.texto ?? '',
    explicacion_a: slots[0]?.exp ?? null,
    explicacion_b: slots[1]?.exp ?? null,
    explicacion_c: slots[2]?.exp ?? null,
    explicacion_d: slots[3]?.exp ?? null,
    solucion_letra: letras[newCorrectPos] ?? form.solucion_letra,
  };
}
