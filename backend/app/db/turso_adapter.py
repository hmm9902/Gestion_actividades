import types
import httpx
from typing import Any, List, Optional, Tuple
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

class TursoCursor:
    def __init__(self, connection: 'TursoConnection'):
        self.connection = connection
        self.description: Optional[Tuple[Any, ...]] = None
        self.rowcount: int = -1
        self.lastrowid: Optional[int] = None
        self._rows: List[Tuple[Any, ...]] = []
        self._idx: int = 0

    def close(self):
        self._rows = []

    def _convert_param(self, val: Any) -> dict:
        if val is None:
            return {"type": "null"}
        elif isinstance(val, bool):
            return {"type": "integer", "value": "1" if val else "0"}
        elif isinstance(val, int):
            return {"type": "integer", "value": str(val)}
        elif isinstance(val, float):
            return {"type": "float", "value": val}
        elif isinstance(val, (bytes, bytearray)):
            import base64
            return {"type": "blob", "base64": base64.b64encode(val).decode("ascii")}
        else:
            return {"type": "text", "value": str(val)}

    def _parse_row_val(self, cell: dict) -> Any:
        t = cell.get("type")
        v = cell.get("value")
        if t == "null" or v is None:
            return None
        if t == "integer":
            return int(v)
        if t == "float":
            return float(v)
        if t == "blob":
            import base64
            return base64.b64decode(cell.get("base64", ""))
        return v

    def execute(self, operation: str, parameters: Any = None):
        args = []
        if parameters:
            if isinstance(parameters, dict):
                args = [self._convert_param(v) for v in parameters.values()]
            else:
                args = [self._convert_param(v) for v in parameters]

        stmt: dict = {"sql": operation}
        if args:
            stmt["args"] = args

        req_payload = {
            "requests": [
                {"type": "execute", "stmt": stmt},
                {"type": "close"}
            ]
        }

        r = self.connection.client.post(
            self.connection.pipeline_url,
            headers={
                "Authorization": f"Bearer {self.connection.token}",
                "Content-Type": "application/json"
            },
            json=req_payload,
            timeout=30.0
        )
        if r.status_code != 200:
            raise Exception(f"Turso HTTP {r.status_code}: {r.text}")

        data = r.json()
        results = data.get("results", [])
        if not results:
            self.description = None
            self._rows = []
            return self

        res_exec = results[0]
        if res_exec.get("type") == "error":
            raise Exception(f"Turso query error: {res_exec.get('error', {}).get('message', 'Error desconocido')}")

        resp_inner = res_exec.get("response", {})
        result_inner = resp_inner.get("result", {})

        cols = result_inner.get("cols", [])
        if cols:
            self.description = tuple(
                (c.get("name"), c.get("decltype"), None, None, None, None, True)
                for c in cols
            )
            raw_rows = result_inner.get("rows", [])
            self._rows = [tuple(self._parse_row_val(cell) for cell in row) for row in raw_rows]
            self._idx = 0
            self.rowcount = len(self._rows)
        else:
            self.description = None
            self._rows = []
            self._idx = 0
            self.rowcount = result_inner.get("affected_row_count", 0)
            lid = result_inner.get("last_insert_rowid")
            self.lastrowid = int(lid) if lid is not None else None

        return self

    def executemany(self, operation: str, seq_of_parameters: Any):
        for params in seq_of_parameters:
            self.execute(operation, params)
        return self

    def fetchone(self):
        if self._idx < len(self._rows):
            r = self._rows[self._idx]
            self._idx += 1
            return r
        return None

    def fetchall(self):
        if self._idx < len(self._rows):
            r = self._rows[self._idx:]
            self._idx = len(self._rows)
            return r
        return []

    def fetchmany(self, size: Optional[int] = None):
        if size is None:
            size = 1
        end = min(self._idx + size, len(self._rows))
        r = self._rows[self._idx:end]
        self._idx = end
        return r

class TursoConnection:
    def __init__(self, database_url: str, auth_token: str):
        self.url = database_url
        self.token = auth_token
        u = database_url.replace("libsql://", "https://").replace("wss://", "https://")
        if not u.startswith("http"):
            u = f"https://{u}"
        u = u.rstrip("/")
        if not u.endswith("/v2/pipeline"):
            u = f"{u}/v2/pipeline"
        self.pipeline_url = u
        self.client = httpx.Client(timeout=30.0)
        self.isolation_level = None

    def cursor(self) -> TursoCursor:
        return TursoCursor(self)

    def create_function(self, name, num_params, func, *args, **kwargs):
        pass

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        try:
            self.client.close()
        except Exception:
            pass

def create_turso_engine(database_url: str, auth_token: str) -> Engine:
    """
    Crea un motor SQLAlchemy adaptado para Turso mediante el protocolo HTTP pipeline libSQL.
    """
    turso_mod = types.ModuleType("turso_dbapi")
    turso_mod.paramstyle = "qmark"
    turso_mod.threadsafety = 1
    turso_mod.apilevel = "2.0"
    turso_mod.sqlite_version_info = (3, 45, 0)
    turso_mod.sqlite_version = "3.45.0"
    turso_mod.Error = Exception
    turso_mod.DatabaseError = Exception
    turso_mod.OperationalError = Exception
    turso_mod.IntegrityError = Exception
    turso_mod.ProgrammingError = Exception
    turso_mod.InternalError = Exception
    turso_mod.DataError = Exception
    turso_mod.NotSupportedError = Exception
    turso_mod.BINARY = "BINARY"
    turso_mod.DATETIME = "DATETIME"
    turso_mod.NUMBER = "NUMBER"
    turso_mod.STRING = "STRING"
    turso_mod.ROWID = "ROWID"

    def connect(database=None, *args, **kwargs):
        return TursoConnection(database_url, auth_token)

    turso_mod.connect = connect

    return create_engine("sqlite://", module=turso_mod, pool_pre_ping=True)
