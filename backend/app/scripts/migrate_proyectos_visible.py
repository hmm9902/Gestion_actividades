import sqlite3
import os
import httpx
from app.core.config import settings

def run_migration():
    print("=" * 60)
    print("MIGRACION: AGREGAR COLUMNA VISIBLE A TABLA PROYECTOS")
    print("=" * 60)

    # 1. SQLite locales
    for path in ['gestor_actividades.db', '../gestor_actividades.db']:
        if os.path.exists(path):
            conn = sqlite3.connect(path)
            cols = [c[1] for c in conn.execute("PRAGMA table_info('PROYECTOS')").fetchall()]
            if 'VISIBLE' not in cols:
                conn.execute("ALTER TABLE PROYECTOS ADD COLUMN VISIBLE VARCHAR(2) NOT NULL DEFAULT 'SI'")
                conn.commit()
                print(f"[OK] Columna VISIBLE agregada en {path}")
            else:
                print(f"[INFO] Columna VISIBLE ya existía en {path}")
            conn.execute("UPDATE PROYECTOS SET VISIBLE = 'SI' WHERE VISIBLE IS NULL OR VISIBLE = ''")
            conn.commit()
            conn.close()

    # 2. Turso Cloud
    if settings.TURSO_DATABASE_URL and settings.TURSO_AUTH_TOKEN:
        headers = {
            'Authorization': f'Bearer {settings.TURSO_AUTH_TOKEN}',
            'Content-Type': 'application/json'
        }
        url = f"{settings.TURSO_DATABASE_URL.rstrip('/')}/v2/pipeline"
        res = httpx.post(url, headers=headers, json={
            'requests': [
                {'type': 'execute', 'stmt': {'sql': "PRAGMA table_info('PROYECTOS')"}},
                {'type': 'close'}
            ]
        }, timeout=15.0)
        data = res.json()
        first_res = data.get('results', [{}])[0]
        if first_res.get('type') == 'ok':
            turso_cols = [r[1]['value'] for r in first_res['response']['result']['rows']]
            if 'VISIBLE' not in turso_cols:
                res2 = httpx.post(url, headers=headers, json={
                    'requests': [
                        {'type': 'execute', 'stmt': {'sql': "ALTER TABLE PROYECTOS ADD COLUMN VISIBLE VARCHAR(2) DEFAULT 'SI'"}},
                        {'type': 'execute', 'stmt': {'sql': "UPDATE PROYECTOS SET VISIBLE = 'SI' WHERE VISIBLE IS NULL OR VISIBLE = ''"}},
                        {'type': 'close'}
                    ]
                }, timeout=15.0)
                print("[OK] Columna VISIBLE agregada y poblada en Turso Cloud")
            else:
                print("[INFO] Columna VISIBLE ya existía en Turso Cloud")
        else:
            print("[WARN] Error consultando Turso:", first_res)

    print("=" * 60)

if __name__ == '__main__':
    run_migration()
