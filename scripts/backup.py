#!/usr/bin/env python3
"""
Script de Respaldo y Restauración para Gestor de Actividades
Compatible con SQLite y exportaciones lógicas SQL.
"""
import os
import sys
import sqlite3
import argparse
from datetime import datetime

def hacer_backup(db_path: str, backup_dir: str):
    if not os.path.exists(db_path):
        print(f"[ERROR] No se encontró el archivo de base de datos en: {db_path}")
        sys.exit(1)

    os.makedirs(backup_dir, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"backup_gestor_{timestamp}.sql")

    print(f"[*] Iniciando respaldo lógico de '{db_path}' a '{backup_file}'...")
    con = sqlite3.connect(db_path)
    with open(backup_file, "w", encoding="utf-8") as f:
        for line in con.iterdump():
            f.write(f"{line}\n")
    con.close()
    
    tamano_kb = os.path.getsize(backup_file) / 1024
    print(f"[OK] Respaldo completado exitosamente: {backup_file} ({tamano_kb:.2f} KB)")
    return backup_file

def restaurar_backup(sql_file: str, target_db_path: str):
    if not os.path.exists(sql_file):
        print(f"[ERROR] Archivo de volcado no encontrado: {sql_file}")
        sys.exit(1)

    print(f"[*] Restaurando respaldo '{sql_file}' en '{target_db_path}'...")
    con = sqlite3.connect(target_db_path)
    with open(sql_file, "r", encoding="utf-8") as f:
        sql_script = f.read()
    
    con.executescript(sql_script)
    con.close()
    print(f"[OK] Base de datos restaurada correctamente en: {target_db_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Backup y Restauración de Base de Datos")
    parser.add_argument("--backup", action="store_true", help="Crear respaldo SQL")
    parser.add_argument("--restore", type=str, help="Ruta al archivo .sql para restaurar")
    parser.add_argument("--db", type=str, default="backend/gestor_actividades.db", help="Ruta al archivo SQLite")
    parser.add_argument("--outdir", type=str, default="backups", help="Directorio destino para respaldos")

    args = parser.parse_args()

    if args.restore:
        restaurar_backup(args.restore, args.db)
    else:
        hacer_backup(args.db, args.outdir)
