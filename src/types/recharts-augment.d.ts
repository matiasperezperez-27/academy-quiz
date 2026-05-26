// Augmentación de tipos para recharts v3.
// Con `moduleResolution: "bundler"`, TS no resuelve algunos re-exports de recharts
// (p.ej. ReferenceLine, Cell) aunque SÍ existen en runtime y en su index.d.ts: sus
// submódulos no resuelven bajo bundler. Esto los redeclara para que `tsc` no falle.
// Si en el futuro recharts/TS arreglan la resolución, este archivo puede borrarse.
declare module 'recharts' {
  export const ReferenceLine: any;
  export const Cell: any;
}
