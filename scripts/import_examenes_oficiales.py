#!/usr/bin/env python3
"""
Import official ITA/IA JCCM exam questions into Supabase.

Prerequisites:
    pip install supabase python-dotenv

Setup:
    Add to .env in the project root:
        SUPABASE_SERVICE_ROLE_KEY=<your service role key>
    Get it at: https://supabase.com/dashboard/project/pakyheklnfpwibyahmcg/settings/api

Usage:
    python scripts/import_examenes_oficiales.py

Run the SQL migration first:
    supabase/migrations/20260521000000_examenes_oficiales.sql
"""

import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client, Client

# Force UTF-8 stdout on Windows (default cp1252 chokes on em dash, arrows, etc.)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv()

SUPABASE_URL = os.environ.get("VITE_SUPABASE_URL")
SERVICE_KEY  = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SERVICE_KEY:
    sys.exit(
        "\nError: faltan variables de entorno en .env\n"
        "  VITE_SUPABASE_URL        — ya deberías tenerla\n"
        "  SUPABASE_SERVICE_ROLE_KEY — obtenla en:\n"
        "    https://supabase.com/dashboard/project/pakyheklnfpwibyahmcg/settings/api\n"
    )

DATA_DIR       = Path(r"C:\Users\MARIO\Documents\Academia Yeray\extracted")
TAXONOMIA_FILE = Path(r"C:\Users\MARIO\Documents\Academia Yeray\data\temas_taxonomia.json")

ACADEMIAS_INFO = {
    "ITA": {"nombre": "ITA — Exámenes Oficiales (A2)", "grupo": "A2"},
    "IA":  {"nombre": "IA — Exámenes Oficiales (A1)",  "grupo": "A1"},
}

EXAM_FILES = {
    "ITA": [
        "1_ITA_2016.json",
        "1_ITA_2020.json",
        "1_ITA_2022.json",
        "1_ITA_2024.json",
    ],
    "IA": [
        "1_IA_2016.json",
        "1_IA_2018.json",
        "1_IA_2020.json",
        "1_IA_2022.json",
        "1_IA_2022_Interna.json",
        "1_IA_2024.json",
        "1_IA_2024_Interna.json",
    ],
}

BATCH_SIZE = 50


# ── JSON parsing ──────────────────────────────────────────────────────────────

def parse_exam(data: dict) -> tuple[dict, list]:
    """
    Normalize exam metadata from both JSON formats:
      - ITA: metadata at root level  (keys: oep, convocatoria, preguntas_anuladas, ...)
      - IA:  metadata under 'exam'   (keys: anio_oep, sistema_acceso, anuladas, ...)
    Returns (normalized_meta, questions_list).
    """
    if "exam" in data:
        raw = data["exam"]
        # Derive convocatoria type from sistema_acceso
        sistema = raw.get("sistema_acceso", "Libre")
        convocatoria_tipo = "Interna" if "interna" in sistema.lower() else "Libre"
    else:
        # ITA: metadata fields are at root (excluding 'questions')
        raw = {k: v for k, v in data.items() if k != "questions"}
        convocatoria_tipo = raw.get("convocatoria", "Libre")

    # Normalize anuladas: may be list OR missing; field names vary across file versions
    anuladas_raw = raw.get("anuladas") or raw.get("preguntas_anuladas") or []
    anuladas = [int(n) for n in anuladas_raw] if isinstance(anuladas_raw, list) else []

    meta = {
        "exam_id":                    raw["exam_id"],
        "convocatoria":               convocatoria_tipo,
        "oep":                        str(raw.get("oep") or raw.get("anio_oep") or ""),
        "fecha_examen":               raw.get("fecha_examen"),
        "total_preguntas":            raw.get("total_preguntas") or raw.get("num_preguntas"),
        "preguntas_regulares":        raw.get("preguntas_regulares"),
        "preguntas_reserva":          (
            raw.get("preguntas_reserva")
            or raw.get("total_reserva")
            or raw.get("num_reserva")
        ),
        "preguntas_anuladas_numeros": anuladas,
        "plantilla_tipo":             raw.get("plantilla_tipo"),
        "plantilla_nota":             raw.get("plantilla_nota"),
    }
    return meta, data["questions"]


# ── Database helpers ──────────────────────────────────────────────────────────

def ensure_academia(sb: Client, nombre: str) -> str:
    """Return the UUID of the academia, creating it (es_biblioteca=true) if absent."""
    res = sb.table("academias").select("id").eq("nombre", nombre).execute()
    if res.data:
        return res.data[0]["id"]
    res2 = sb.table("academias").insert({
        "nombre":        nombre,
        "es_biblioteca": True,
        "propietario_id": None,
    }).execute()
    return res2.data[0]["id"]


def upsert_temas(sb: Client, academia_id: str, taxonomia: list) -> dict:
    """
    Upsert 65 temas for this academia using the (academia_id, tema_id_origen) unique key.
    Returns {tema_id_origen: tema_uuid} map.
    """
    rows = [
        {
            "nombre":         t["titulo"],
            "academia_id":    academia_id,
            "bloque":         t["bloque"],
            "numero":         t["numero"],
            "resumen":        t.get("resumen"),
            "tema_id_origen": t["id"],
        }
        for t in taxonomia
    ]
    for i in range(0, len(rows), BATCH_SIZE):
        sb.table("temas").upsert(
            rows[i:i + BATCH_SIZE],
            on_conflict="academia_id,tema_id_origen",
        ).execute()

    # Fetch back the UUIDs assigned by Postgres
    res = (
        sb.table("temas")
        .select("id,tema_id_origen")
        .eq("academia_id", academia_id)
        .not_.is_("tema_id_origen", "null")
        .execute()
    )
    return {r["tema_id_origen"]: r["id"] for r in res.data}


def upsert_convocatoria(sb: Client, meta: dict, academia_id: str, cuerpo: str, grupo: str) -> str:
    """Upsert convocatoria row (key: exam_id). Returns its UUID."""
    sb.table("convocatorias").upsert(
        {
            "exam_id":                    meta["exam_id"],
            "academia_id":                academia_id,
            "cuerpo":                     cuerpo,
            "grupo":                      grupo,
            "convocatoria":               meta["convocatoria"],
            "oep":                        meta["oep"],
            "fecha_examen":               meta["fecha_examen"],
            "total_preguntas":            meta["total_preguntas"],
            "preguntas_regulares":        meta["preguntas_regulares"],
            "preguntas_reserva":          meta["preguntas_reserva"],
            "preguntas_anuladas_numeros": meta["preguntas_anuladas_numeros"],
            "plantilla_tipo":             meta["plantilla_tipo"],
            "plantilla_nota":             meta["plantilla_nota"],
        },
        on_conflict="exam_id",
    ).execute()

    res = sb.table("convocatorias").select("id").eq("exam_id", meta["exam_id"]).single().execute()
    return res.data["id"]


def build_row(q: dict, academia_id: str, convocatoria_id: str, tema_uuid: str, bloque: str) -> dict:
    resp = q.get("respuesta_correcta")
    return {
        "question_id_origen": q["question_id"],
        "pregunta_texto":     q["enunciado"],
        "opcion_a":           q["opcion_a"],
        "opcion_b":           q["opcion_b"],
        "opcion_c":           q.get("opcion_c"),
        "opcion_d":           q.get("opcion_d"),
        # respuesta_correcta is lowercase in ITA, uppercase in some IA — normalize to uppercase.
        # null → None (anulada questions; solucion_letra is nullable after migration).
        "solucion_letra":     resp.upper() if resp else None,
        "academia_id":        academia_id,
        "tema_id":            tema_uuid,
        "parte":              bloque,
        "numero_pregunta":    q["numero"],
        "anulada":            bool(q.get("anulada", False)),
        "reserva":            bool(q.get("reserva", False)),
        "sustituye_a":        q.get("sustituye_a"),
        "convocatoria_id":    convocatoria_id,
        "es_oficial":         True,
        "verificada":         True,
        "rechazada":          False,
        "modificada_por_ia":  False,
        "creada_por":         None,
    }


def import_exam(
    sb: Client,
    filepath: Path,
    cuerpo: str,
    academia_id: str,
    grupo: str,
    temas_map: dict,
    temas_by_origin: dict,
) -> tuple[int, int]:
    """Import questions from one exam JSON. Returns (imported_count, skipped_count)."""
    with open(filepath, encoding="utf-8") as f:
        data = json.load(f)

    meta, questions = parse_exam(data)
    convocatoria_id = upsert_convocatoria(sb, meta, academia_id, cuerpo, grupo)

    rows = []
    skipped = 0
    for q in questions:
        tid_origen = q.get("tema_id")
        if not tid_origen:
            print(f"    SKIP {q['question_id']}: sin tema_id")
            skipped += 1
            continue
        tema_uuid = temas_map.get(tid_origen)
        if not tema_uuid:
            print(f"    SKIP {q['question_id']}: tema '{tid_origen}' no está en taxonomía")
            skipped += 1
            continue
        bloque = temas_by_origin.get(tid_origen, {}).get("bloque")
        rows.append(build_row(q, academia_id, convocatoria_id, tema_uuid, bloque))

    imported = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i + BATCH_SIZE]
        sb.table("preguntas").upsert(
            batch,
            on_conflict="question_id_origen",
            ignore_duplicates=True,  # ON CONFLICT DO NOTHING — safe to re-run
        ).execute()
        imported += len(batch)

    return imported, skipped


# ── Main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    sb = create_client(SUPABASE_URL, SERVICE_KEY)

    print("Cargando taxonomía de temas...")
    with open(TAXONOMIA_FILE, encoding="utf-8") as f:
        taxonomia_data = json.load(f)
    taxonomia       = taxonomia_data["temas"]
    temas_by_origin = {t["id"]: t for t in taxonomia}
    print(f"  {len(taxonomia)} temas en taxonomía\n")

    # ── Paso 1: academias ──────────────────────────────────────────────────────
    print("=== Paso 1: Academias ===")
    academia_ids: dict[str, str] = {}
    for cuerpo, info in ACADEMIAS_INFO.items():
        aid = ensure_academia(sb, info["nombre"])
        academia_ids[cuerpo] = aid
        print(f"  [{cuerpo}] {info['nombre']}")

    # ── Paso 2: temas ──────────────────────────────────────────────────────────
    print("\n=== Paso 2: Temas (65 × 2 academias) ===")
    temas_maps: dict[str, dict] = {}
    for cuerpo, aid in academia_ids.items():
        temas_maps[cuerpo] = upsert_temas(sb, aid, taxonomia)
        print(f"  [{cuerpo}] {len(temas_maps[cuerpo])} temas listos")

    # ── Paso 3: preguntas ──────────────────────────────────────────────────────
    print("\n=== Paso 3: Preguntas ===")
    summary: dict[str, dict] = {}
    for cuerpo, files in EXAM_FILES.items():
        for filename in files:
            filepath = DATA_DIR / filename
            imported, skipped = import_exam(
                sb, filepath, cuerpo,
                academia_ids[cuerpo], ACADEMIAS_INFO[cuerpo]["grupo"],
                temas_maps[cuerpo], temas_by_origin,
            )
            summary[filename] = {"imported": imported, "skipped": skipped}
            status = f"{imported:3d} importadas" + (f", {skipped} omitidas" if skipped else "")
            print(f"  {filename[:-5]:28s} → {status}")

    # ── Resumen ────────────────────────────────────────────────────────────────
    print("\n=== Resumen ===")
    total       = sum(v["imported"] for v in summary.values())
    total_skip  = sum(v["skipped"]  for v in summary.values())
    ita_total   = sum(v["imported"] for k, v in summary.items() if "ITA" in k)
    ia_total    = sum(v["imported"] for k, v in summary.items() if "IA"  in k and "ITA" not in k)
    print(f"  ITA total: {ita_total:4d} preguntas")
    print(f"  IA  total: {ia_total:4d} preguntas")
    print(f"  TOTAL:     {total:4d} preguntas")
    if total_skip:
        print(f"  Omitidas:  {total_skip} (revisa los mensajes SKIP arriba)")
    print("\nDone. Verifica con los queries del Paso 4 en el prompt.")


if __name__ == "__main__":
    main()
