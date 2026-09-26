import sqlite3
import os

for path in ['gestor_actividades.db', '../gestor_actividades.db']:
    if os.path.exists(path):
        conn = sqlite3.connect(path)
        tables = [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").fetchall()]
        print(f"Path: {path} (size: {os.path.getsize(path)})")
        counts = {}
        for t in tables:
            counts[t] = conn.execute(f'SELECT count(*) FROM "{t}"').fetchone()[0]
        print("  Tables and row counts:", counts)
        conn.close()
