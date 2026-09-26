import os
import sys
import sqlite3
import shutil

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from app.core.config import settings
from app.models.entities import Base
from sqlalchemy import create_engine
from app.services.migration_service import migration_service
from app.scripts.check_homologacion import print_summary

def homologar():
    print("=" * 70)
    print("INICIANDO HOMOLOGACION Y SINCRONIZACION COMPLETA SQLITE <-> TURSO")
    print("=" * 70)

    # 1. Asegurar esquema en ambos SQLite locales (backend y root)
    backend_db = os.path.abspath(settings.local_sqlite_path)
    root_db = os.path.abspath(os.path.join(os.path.dirname(backend_db), "..", "gestor_actividades.db"))

    for p in [backend_db, root_db]:
        print(f"\n[1] Verificando y asegurando esquema SQLite en: {p}")
        engine = create_engine(f"sqlite:///{p}")
        Base.metadata.create_all(bind=engine)
        engine.dispose()

    # Copiar datos actualizados de backend a root
    if os.path.exists(backend_db):
        try:
            shutil.copy2(backend_db, root_db)
            print(f"  -> Base de datos sincronizada: {backend_db} -> {root_db}")
        except Exception as e:
            print(f"  -> Advertencia copiando a root: {e}")

    # 2. Migrar y sincronizar a Turso Cloud con copia fiel y validación de hash
    print("\n[2] Sincronizando esquema y datos a Turso Cloud...")
    report = migration_service.execute_migration(user_registro="ADMIN", target_db_name="gestor-actividades")

    print(f"\nEstado de sincronización Turso: {report.get('status')}")
    print(f"Validación de filas: {report.get('validation_status')}")
    print(f"Pruebas funcionales: {report.get('tests_status')}")

    if report.get("error_message"):
        print(f"ERROR: {report.get('error_message')}")

    # 3. Reporte final de homologación
    print_summary()

if __name__ == '__main__':
    homologar()
