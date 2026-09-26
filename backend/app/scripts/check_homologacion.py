import os
import sys
import sqlite3
import httpx

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.core.config import settings

def parse_cell(cell):
    if not isinstance(cell, dict):
        return cell
    t = cell.get("type")
    if t == "null":
        return None
    return cell.get("value")

def get_sqlite_schema(db_path):
    conn = sqlite3.connect(db_path)
    tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").fetchall()]
    schema = {}
    for t in tables:
        cols = conn.execute(f"PRAGMA table_info('{t}')").fetchall()
        schema[t] = {c[1]: {'cid': c[0], 'type': c[2].upper(), 'notnull': bool(c[3]), 'dflt': c[4], 'pk': bool(c[5])} for c in cols}
    conn.close()
    return schema

def get_turso_schema():
    headers = {
        'Authorization': f'Bearer {settings.TURSO_AUTH_TOKEN}',
        'Content-Type': 'application/json'
    }
    url = f"{settings.TURSO_DATABASE_URL.rstrip('/')}/v2/pipeline"
    res = httpx.post(url, headers=headers, json={
        'requests': [
            {'type': 'execute', 'stmt': {'sql': "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"}},
            {'type': 'close'}
        ]
    })
    turso_data = res.json()
    turso_tables = [parse_cell(r[0]) for r in turso_data['results'][0]['response']['result']['rows']]

    turso_schema = {}
    reqs = []
    for t in turso_tables:
        reqs.append({'type': 'execute', 'stmt': {'sql': f"PRAGMA table_info('{t}')"}})
    reqs.append({'type': 'close'})
    
    res_cols = httpx.post(url, headers=headers, json={'requests': reqs})
    cols_data = res_cols.json()
    for idx, t in enumerate(turso_tables):
        rows = cols_data['results'][idx]['response']['result']['rows']
        cols = {}
        for r in rows:
            col_cid = parse_cell(r[0])
            col_name = parse_cell(r[1])
            col_type = (parse_cell(r[2]) or "").upper()
            col_notnull = bool(parse_cell(r[3]))
            col_dflt = parse_cell(r[4])
            col_pk = bool(parse_cell(r[5]))
            cols[col_name] = {'cid': col_cid, 'type': col_type, 'notnull': col_notnull, 'dflt': col_dflt, 'pk': col_pk}
        turso_schema[t] = cols

    return turso_schema

def print_summary():
    sqlite_path = settings.local_sqlite_path
    if not os.path.exists(sqlite_path) and os.path.exists("../gestor_actividades.db"):
        sqlite_path = os.path.abspath("../gestor_actividades.db")

    loc = get_sqlite_schema(sqlite_path)
    tur = get_turso_schema()

    print("\n" + "=" * 80)
    print("REPORTE DETALLADO DE HOMOLOGACION (SQLITE LOCAL vs TURSO CLOUD)")
    print("=" * 80)
    print(f"{'TABLA':<26} | {'SQLITE COLS':<12} | {'TURSO COLS':<12} | {'ESTADO'}")
    print("-" * 80)

    all_tables = sorted(list(set(loc.keys()).union(set(tur.keys()))))
    total_homologadas = 0

    for t in all_tables:
        in_loc = t in loc
        in_tur = t in tur

        if in_loc and in_tur:
            cols_l = list(loc[t].keys())
            cols_t = list(tur[t].keys())
            if cols_l == cols_t:
                status = "100% HOMOLOGADA"
                total_homologadas += 1
            elif set(cols_l) == set(cols_t):
                status = "100% HOMOLOGADA (Orden diferente)"
                total_homologadas += 1
            else:
                status = f"DIFERENCIA (Faltan en Turso: {set(cols_l)-set(cols_t)}, Faltan en SQLite: {set(cols_t)-set(cols_l)})"
            print(f"{t:<26} | {len(cols_l):<12} | {len(cols_t):<12} | {status}")
            if cols_l != cols_t:
                print(f"   SQLite cols: {cols_l}")
                print(f"   Turso cols:  {cols_t}")
        elif in_loc:
            print(f"{t:<26} | {len(loc[t]):<12} | {'NO EXISTE':<12} | FALTA EN TURSO")
        else:
            print(f"{t:<26} | {'NO EXISTE':<12} | {len(tur[t]):<12} | FALTA EN SQLITE")

    print("-" * 80)
    print(f"Total tablas analizadas: {len(all_tables)}")
    print(f"Total tablas homologadas idénticamente: {total_homologadas}/{len(all_tables)}")
    print("=" * 80)

if __name__ == '__main__':
    print_summary()
