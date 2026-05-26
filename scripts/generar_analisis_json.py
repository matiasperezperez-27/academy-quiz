"""Genera src/data/analisisExamenes.json para el panel del profesor.

Lee el dataset de la academia (dataset_completo.csv) y precomputa los agregados
estadisticos (ranking, probabilidad, evolucion temporal, bloques, correlacion,
calientes/olvidados) por cuerpo ITA/IA. El frontend solo renderiza, no calcula.

Convenciones (acordadas):
- IA = 7 examenes juntos (Libre + Interna).
- Pregunta valida = no anulada y no reserva-inactiva (reservas activadas se conservan).
- Eje temporal = exam_id en orden cronologico (por fecha_examen).

Uso:  python scripts/generar_analisis_json.py
"""
import json
import re
import unicodedata
from collections import Counter
from difflib import SequenceMatcher
from pathlib import Path
from datetime import date
import numpy as np
import pandas as pd

CSV = Path(r'C:\Users\MARIO\Documents\Academia Yeray\data\dataset_completo.csv')
OUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'analisisExamenes.json'

df_raw = pd.read_csv(CSV, encoding='utf-8-sig')
activada = df_raw['reserva'] & df_raw['sustituye_a'].notna()
valid = (~df_raw['anulada']) & ((~df_raw['reserva']) | activada)
df = df_raw[valid].copy()

orden_exam = df_raw.groupby('exam_id')['fecha_examen'].first().sort_values().index.tolist()
exam_cuerpo = df_raw.groupby('exam_id')['cuerpo_corto'].first()
titulo_map = df_raw.drop_duplicates('tema_id').set_index('tema_id')['titulo_tema']
all_temas = sorted(titulo_map.index)

NEG_PAT = re.compile(r'\b(?:NO|EXCEPTO|INCORRECTA?|FALSA?|SALVO|NUNCA|JAM[ÁA]S)\b', re.I)
TN_PAT = re.compile(r'(?:todas|ninguna)\s+(?:las\s+)?(?:de\s+las\s+)?(?:anteriores|respuestas|opciones)'
                    r'|son\s+correctas|son\s+verdaderas', re.I)


def norm(s: str) -> str:
    """Normaliza un enunciado para detectar repeticiones (sin acentos/puntuacion)."""
    s = str(s).lower()
    s = ''.join(c for c in unicodedata.normalize('NFKD', s) if not unicodedata.combining(c))
    s = re.sub(r'[^a-z0-9 ]', ' ', s)
    return re.sub(r'\s+', ' ', s).strip()


df['n'] = df['enunciado'].map(norm)


def etiqueta(exam_id: str) -> str:
    return (exam_id.replace('1_ITA_', '').replace('1_IA_', '')
            .replace('_Interna', ' Int'))


def ranking(d, n_exams):
    g = d.groupby(['tema_id', 'titulo_tema', 'bloque']).size().rename('total').reset_index()
    g['media'] = (g['total'] / n_exams).round(2)
    g['pct'] = (100 * g['total'] / g['total'].sum()).round(1)
    g = g.sort_values('total', ascending=False).reset_index(drop=True)
    return [
        {'temaId': r.tema_id, 'titulo': r.titulo_tema, 'bloque': r.bloque,
         'total': int(r.total), 'media': float(r.media), 'pct': float(r.pct)}
        for r in g.itertuples()
    ]


def prob(d, n_exams):
    m = d.pivot_table(index='tema_id', columns='exam_id', values='question_id',
                      aggfunc='count', fill_value=0)
    return (m > 0).sum(axis=1) / n_exams


def cuerpo_payload(cuerpo):
    d = df[df['cuerpo_corto'] == cuerpo]
    exs = [e for e in orden_exam if exam_cuerpo[e] == cuerpo]
    n_exams = len(exs)
    rank = ranking(d, n_exams)

    # Matriz tema x examen (solo temas con >=1 aparicion), ordenada por total
    piv = d.pivot_table(index='titulo_tema', columns='exam_id', values='question_id',
                        aggfunc='count', fill_value=0).reindex(columns=exs, fill_value=0)
    piv = piv.loc[piv.sum(axis=1) > 0]
    piv = piv.loc[piv.sum(axis=1).sort_values(ascending=False).index]
    matriz = {
        'examenes': [etiqueta(e) for e in exs],
        'maximo': int(piv.values.max()) if piv.size else 0,
        'filas': [{'titulo': t, 'valores': [int(v) for v in piv.loc[t].values]}
                  for t in piv.index],
    }

    # Evolucion temporal: top 10 temas, formato apto para LineChart de recharts
    top10 = piv.head(10)
    temporal_data = []
    for j, e in enumerate(exs):
        punto = {'examen': etiqueta(e)}
        for t in top10.index:
            punto[t] = int(top10.loc[t].values[j])
        temporal_data.append(punto)
    temporal = {'data': temporal_data, 'temas': list(top10.index)}

    # Bloques comun/especifico por examen
    blo = d.groupby(['exam_id', 'bloque']).size().unstack(fill_value=0).reindex(exs, fill_value=0)
    for c in ['comun', 'especifico']:
        if c not in blo.columns:
            blo[c] = 0
    bloques = [{'examen': etiqueta(e), 'comun': int(blo.loc[e, 'comun']),
                'especifico': int(blo.loc[e, 'especifico'])} for e in exs]

    n_comun = int((d['bloque'] == 'comun').sum())
    n_esp = int((d['bloque'] == 'especifico').sum())
    total = n_comun + n_esp

    return {
        'nExamenes': n_exams,
        'nValidas': int(len(d)),
        'pctComun': round(100 * n_comun / total, 1),
        'pctEspecifico': round(100 * n_esp / total, 1),
        'examenes': [etiqueta(e) for e in exs],
        'ranking': rank,
        'matriz': matriz,
        'temporal': temporal,
        'bloques': bloques,
        'calientes': sorted(rank, key=lambda r: r['media'], reverse=True)[:10],
    }


# Probabilidad combinada ITA/IA
p_ita = prob(df[df.cuerpo_corto == 'ITA'], (exam_cuerpo == 'ITA').sum())
p_ia = prob(df[df.cuerpo_corto == 'IA'], (exam_cuerpo == 'IA').sum())
probabilidad = []
for t in all_temas:
    pi = round(float(p_ita.get(t, 0)), 2)
    pa = round(float(p_ia.get(t, 0)), 2)
    if pi == 0 and pa == 0:
        continue
    probabilidad.append({
        'temaId': t, 'titulo': titulo_map[t],
        'bloque': df_raw.loc[df_raw.tema_id == t, 'bloque'].iloc[0],
        'pIta': pi, 'pIa': pa, 'dif': round(pi - pa, 2),
    })
probabilidad.sort(key=lambda r: (r['pIta'], r['pIa']), reverse=True)

# Correlacion entre temas (todos los examenes), top 5 pares
mat_all = df.pivot_table(index='exam_id', columns='tema_id', values='question_id',
                         aggfunc='count', fill_value=0).reindex(orden_exam)
mat_all = mat_all.loc[:, mat_all.var() > 0]
corr = mat_all.corr()
tri = np.triu(np.ones(corr.shape), k=1).astype(bool)
cc = corr.where(tri).stack().sort_values(ascending=False)
correlacion = [
    {'temaA': titulo_map.get(a, a), 'temaB': titulo_map.get(b, b), 'r': round(float(v), 2)}
    for (a, b), v in cc.head(5).items()
]

# ---------------------------------------------------------------- recicladas
def recicladas_payload():
    out = {'exactas': [], 'nearDuplicados': [], 'compartidasEntreCuerpos': []}
    # Exactas: mismo enunciado normalizado en >1 examen del mismo cuerpo
    for cuerpo in ['ITA', 'IA']:
        s = df[df.cuerpo_corto == cuerpo]
        for _, g in s.groupby('n'):
            exams = sorted(g['exam_id'].unique())
            if len(exams) > 1:
                first = g.iloc[0]
                out['exactas'].append({
                    'cuerpo': cuerpo,
                    'enunciado': str(first['enunciado']),
                    'tema': str(first['titulo_tema']),
                    'examenes': [etiqueta(e) for e in exams],
                    'veces': int(len(g)),
                })
    out['exactas'].sort(key=lambda r: r['veces'], reverse=True)
    # Near-duplicados: pares de examenes distintos, 0.85 <= ratio < 0.999
    near = []
    for cuerpo in ['ITA', 'IA']:
        s = df[df.cuerpo_corto == cuerpo].reset_index(drop=True)
        texts, exams = s['n'].tolist(), s['exam_id'].tolist()
        enun, temas = s['enunciado'].tolist(), s['titulo_tema'].tolist()
        for i in range(len(texts)):
            for j in range(i + 1, len(texts)):
                if exams[i] == exams[j] or abs(len(texts[i]) - len(texts[j])) > 20:
                    continue
                r = SequenceMatcher(None, texts[i], texts[j]).ratio()
                if 0.85 <= r < 0.999:
                    near.append({
                        'cuerpo': cuerpo, 'similitud': round(r, 2), 'tema': str(temas[i]),
                        'a': {'examen': etiqueta(exams[i]), 'enunciado': str(enun[i])},
                        'b': {'examen': etiqueta(exams[j]), 'enunciado': str(enun[j])},
                    })
    near.sort(key=lambda r: r['similitud'], reverse=True)
    out['nearDuplicados'] = near[:40]
    # Compartidas entre cuerpos (mismo enunciado en ITA y en IA)
    for _, g in df.groupby('n'):
        if len(set(g['cuerpo_corto'])) > 1:
            ita = sorted(g[g.cuerpo_corto == 'ITA']['exam_id'].unique())
            ia = sorted(g[g.cuerpo_corto == 'IA']['exam_id'].unique())
            out['compartidasEntreCuerpos'].append({
                'enunciado': str(g.iloc[0]['enunciado']),
                'tema': str(g.iloc[0]['titulo_tema']),
                'examenesITA': [etiqueta(e) for e in ita],
                'examenesIA': [etiqueta(e) for e in ia],
            })
    return out


# ---------------------------------------------------------------- estrategia
def opciones_de(row):
    pares = [('A', 'opcion_a'), ('B', 'opcion_b'), ('C', 'opcion_c'), ('D', 'opcion_d')]
    return {k: str(row[c]) for k, c in pares if pd.notna(row[c]) and str(row[c]).strip()}


def estrategia_payload():
    v = df.copy()
    v['resp'] = v['respuesta_correcta'].astype(str).str.upper().str.strip()
    v = v[v['resp'].isin(list('ABCD'))]
    v['neg'] = v['enunciado'].astype(str).str.contains(NEG_PAT)
    v['mas_larga'] = v.apply(
        lambda row: (lambda o: bool(o) and row['resp'] in o
                     and max(o, key=lambda k: len(o[k])) == row['resp'])(opciones_de(row)),
        axis=1)
    out = {}
    for cuerpo in ['ITA', 'IA']:
        s = v[v.cuerpo_corto == cuerpo]
        letras = s['resp'].value_counts(normalize=True).reindex(list('ABCD')).fillna(0).round(3)
        por_ex = []
        for e in [x for x in orden_exam if exam_cuerpo[x] == cuerpo]:
            se = s[s.exam_id == e]['resp'].value_counts(normalize=True).reindex(list('ABCD')).fillna(0).round(3)
            por_ex.append({'examen': etiqueta(e), **{k: float(se[k]) for k in 'ABCD'}})
        out[cuerpo] = {
            'nValidas': int(len(s)),
            'sesgoLetra': {k: float(letras[k]) for k in 'ABCD'},
            'sesgoLetraPorExamen': por_ex,
            'pctNegativas': round(100 * float(s['neg'].mean()), 1),
            'pctCorrectaMasLarga': round(100 * float(s['mas_larga'].mean()), 1),
        }
    tn_mask = v.apply(lambda row: any(TN_PAT.search(o) for o in opciones_de(row).values()), axis=1)
    n_tn = int(tn_mask.sum())
    if n_tn:
        corr_tn = v[tn_mask].apply(
            lambda row: bool(opciones_de(row).get(row['resp']) and TN_PAT.search(opciones_de(row)[row['resp']])),
            axis=1)
        pct_corr = round(100 * float(corr_tn.mean()), 1)
    else:
        pct_corr = 0.0
    out['todasAnteriores'] = {'n': n_tn, 'pctCorrectaCuandoExiste': pct_corr}
    return out


# ---------------------------------------------------------------- conceptos
def conceptos_payload():
    def topk(d, k=25):
        cnt = Counter()
        for kw in d['keywords'].astype(str):
            for token in kw.split(';'):
                token = token.strip()
                if token and token.lower() != 'nan':
                    cnt[token] += 1
        return [{'keyword': t, 'n': int(c)} for t, c in cnt.most_common(k)]
    return {'global': topk(df), 'ITA': topk(df[df.cuerpo_corto == 'ITA']),
            'IA': topk(df[df.cuerpo_corto == 'IA'])}


# ---------------------------------------------------------------- calidad
def calidad_payload():
    out = {}
    an = df_raw[df_raw['anulada']]
    for cuerpo in ['ITA', 'IA']:
        exs = [e for e in orden_exam if exam_cuerpo[e] == cuerpo]
        anc = an[an.cuerpo_corto == cuerpo]
        por_tema = anc.groupby('titulo_tema').size().sort_values(ascending=False).head(12)
        por_examen = anc.groupby('exam_id').size().reindex(exs, fill_value=0)
        cob = df[df.cuerpo_corto == cuerpo].groupby('exam_id')['tema_id'].nunique().reindex(exs, fill_value=0)
        reservas_act = int(((df_raw.cuerpo_corto == cuerpo) & df_raw.reserva & df_raw.sustituye_a.notna()).sum())
        out[cuerpo] = {
            'anuladasPorTema': [{'titulo': str(t), 'n': int(n)} for t, n in por_tema.items()],
            'anuladasPorExamen': [{'examen': etiqueta(e), 'n': int(por_examen[e])} for e in exs],
            'reservasActivadas': reservas_act,
            'cobertura': {'media': round(float(cob.mean()), 1), 'min': int(cob.min()),
                          'max': int(cob.max()), 'total': 65},
            'coberturaPorExamen': [{'examen': etiqueta(e), 'nTemas': int(cob[e])} for e in exs],
        }
    return out


payload = {
    'generado': date.today().isoformat(),
    'fuente': 'dataset_completo.csv — 11 examenes oficiales JCCM (ITA + IA)',
    'global': {'nValidas': int(len(df)), 'nExamenes': int(df['exam_id'].nunique())},
    'cuerpos': {'ITA': cuerpo_payload('ITA'), 'IA': cuerpo_payload('IA')},
    'probabilidad': probabilidad,
    'correlacion': correlacion,
    'recicladas': recicladas_payload(),
    'estrategia': estrategia_payload(),
    'conceptos': conceptos_payload(),
    'calidad': calidad_payload(),
}

OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding='utf-8')
print('Escrito:', OUT)
print('  ITA:', payload['cuerpos']['ITA']['nValidas'], 'validas /', payload['cuerpos']['ITA']['nExamenes'], 'examenes')
print('  IA :', payload['cuerpos']['IA']['nValidas'], 'validas /', payload['cuerpos']['IA']['nExamenes'], 'examenes')
print('  temas en probabilidad:', len(probabilidad), '| pares correlacion:', len(correlacion))
print('  recicladas exactas:', len(payload['recicladas']['exactas']),
      '| near-dup:', len(payload['recicladas']['nearDuplicados']),
      '| cross ITA/IA:', len(payload['recicladas']['compartidasEntreCuerpos']))
print('  sesgo letra ITA:', payload['estrategia']['ITA']['sesgoLetra'])
print('  conceptos top global:', payload['conceptos']['global'][0])
print('  anuladas ITA por tema:', len(payload['calidad']['ITA']['anuladasPorTema']),
      '| cobertura ITA media:', payload['calidad']['ITA']['cobertura']['media'])
print('  KB:', round(OUT.stat().st_size / 1024, 1))
