"""
Universal Database Connector & Direct Execution Engine in Python
Optimized with persistent connection pooling, thread-safe schema introspection caching, and query safeguards.
"""

import time
import sqlite3
import os
import urllib.parse
from typing import Dict, Any, List, Optional, Tuple
import sqlalchemy
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
import pymysql

DEFAULT_SQLITE_PATH = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "database", "sales_analytics.sqlite")).replace("\\", "/")

# Ensure default real DB file exists
if not os.path.exists(DEFAULT_SQLITE_PATH):
    from backend.init_db import initialize_real_database
    initialize_real_database()

# Registry State
_active_database_id = "default_sqlite"
_connected_databases: Dict[str, Dict[str, Any]] = {
    "default_sqlite": {
        "id": "default_sqlite",
        "name": "Default Database (sales_analytics.sqlite)",
        "dialect": "sqlite",
        "icon": "🗄️",
        "uri": f"sqlite:///{DEFAULT_SQLITE_PATH}",
        "description": "Local persistent SQLite analytical database",
        "isCustom": False
    }
}

# Performance: Engine Connection Pool Cache (reuses connection pool instead of recreating per call)
_engine_pool: Dict[str, Engine] = {}

# Performance: Introspection Schema Cache (TTL: 300 seconds)
_schema_cache: Dict[str, Tuple[float, Dict[str, Any]]] = {}
SCHEMA_CACHE_TTL_SEC = 300.0

def get_engine_for_db(db_info: Dict[str, Any]) -> Engine:
    uri = db_info["uri"]
    if uri not in _engine_pool:
        # SQLite vs client-server engines
        if uri.startswith("sqlite"):
            _engine_pool[uri] = create_engine(uri, pool_pre_ping=True)
        else:
            _engine_pool[uri] = create_engine(
                uri,
                pool_size=10,
                max_overflow=20,
                pool_recycle=3600,
                pool_pre_ping=True
            )
    return _engine_pool[uri]

def introspect_schema_from_engine(engine: Engine, db_name: str, dialect: str, force_refresh: bool = False) -> Dict[str, Any]:
    cache_key = f"{db_name}:{dialect}"
    now = time.time()
    
    if not force_refresh and cache_key in _schema_cache:
        cached_time, cached_schema = _schema_cache[cache_key]
        if (now - cached_time) < SCHEMA_CACHE_TTL_SEC:
            return cached_schema

    inspector = inspect(engine)
    table_names = inspector.get_table_names()
    tables = []
    relationships = []

    for tname in table_names:
        cols_raw = inspector.get_columns(tname)
        pk_constraint = inspector.get_pk_constraint(tname)
        pk_cols = set(pk_constraint.get("constrained_columns", [])) if pk_constraint else set()
        
        columns = []
        for c in cols_raw:
            col_name = c["name"]
            col_type = str(c.get("type", "TEXT"))
            columns.append({
                "name": col_name,
                "type": col_type,
                "primaryKey": col_name in pk_cols,
                "description": f"Column {col_name} ({col_type})"
            })

        # Foreign keys
        try:
            fks = inspector.get_foreign_keys(tname)
            for fk in fks:
                referred_table = fk.get("referred_table")
                for from_col, to_col in zip(fk.get("constrained_columns", []), fk.get("referred_columns", [])):
                    relationships.append({
                        "fromTable": tname,
                        "fromColumn": from_col,
                        "toTable": referred_table,
                        "toColumn": to_col,
                        "type": "N:1"
                    })
        except Exception:
            pass

        tables.append({
            "name": tname,
            "description": f"Table '{tname}' in {db_name}",
            "columns": columns
        })

    schema_result = {
        "databaseName": db_name,
        "dialect": dialect,
        "version": f"{dialect.upper()} Database (Live Connected)",
        "tables": tables,
        "relationships": relationships
    }

    _schema_cache[cache_key] = (now, schema_result)
    return schema_result

def get_active_database_id() -> str:
    return _active_database_id

def list_available_databases() -> List[Dict[str, Any]]:
    db_list = []
    for db_id, info in _connected_databases.items():
        try:
            engine = get_engine_for_db(info)
            schema = introspect_schema_from_engine(engine, info["name"], info["dialect"])
            db_list.append({
                "id": db_id,
                "name": info["name"],
                "dialect": info["dialect"],
                "icon": info["icon"],
                "description": f"{len(schema['tables'])} tables discovered",
                "tableCount": len(schema['tables']),
                "schema": schema,
                "isCustom": info.get("isCustom", False)
            })
        except Exception as e:
            db_list.append({
                "id": db_id,
                "name": info["name"],
                "dialect": info["dialect"],
                "icon": "⚠️",
                "description": f"Connection error: {str(e)[:40]}",
                "tableCount": 0,
                "schema": {"databaseName": info["name"], "dialect": info["dialect"], "tables": [], "relationships": []},
                "isCustom": info.get("isCustom", False)
            })
    return db_list

def set_active_database_id(db_id: str) -> bool:
    global _active_database_id
    if db_id in _connected_databases:
        _active_database_id = db_id
        return True
    return False

def get_active_database_schema() -> Dict[str, Any]:
    info = _connected_databases.get(_active_database_id) or _connected_databases["default_sqlite"]
    try:
        engine = get_engine_for_db(info)
        return introspect_schema_from_engine(engine, info["name"], info["dialect"])
    except Exception as e:
        return {
            "databaseName": info["name"],
            "dialect": info["dialect"],
            "version": f"Error: {str(e)}",
            "tables": [],
            "relationships": []
        }

async def connect_universal_database(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Connects to ANY database with auto-url encoding & detailed diagnostics.
    """
    global _active_database_id
    db_type = (config.get("dialect") or "mysql").lower()
    custom_uri = (config.get("connectionUri") or "").strip()

    if custom_uri:
        uri = custom_uri
        name = config.get("name") or "Custom URI Database"
        dialect = custom_uri.split(":")[0].split("+")[0]
    elif db_type in ("sqlite", "sqlite3"):
        raw_path = config.get("databasePath") or config.get("database") or DEFAULT_SQLITE_PATH
        db_path = os.path.abspath(raw_path).replace("\\", "/")
        uri = f"sqlite:///{db_path}"
        name = config.get("name") or os.path.basename(db_path) or "Custom SQLite"
        dialect = "sqlite"
    elif db_type in ("postgres", "postgresql"):
        host = config.get("host") or "localhost"
        port = int(config.get("port") or 5432)
        user = config.get("user") or "postgres"
        pwd = config.get("password") or ""
        dbname = config.get("database") or "postgres"
        
        safe_user = urllib.parse.quote_plus(user)
        safe_pwd = urllib.parse.quote_plus(pwd)
        uri = f"postgresql+pg8000://{safe_user}:{safe_pwd}@{host}:{port}/{dbname}"
        name = f"PostgreSQL ({dbname})"
        dialect = "postgres"
    else:  # MySQL / MariaDB default
        host = config.get("host") or "localhost"
        port = int(config.get("port") or 3306)
        user = config.get("user") or "root"
        pwd = config.get("password") or ""
        dbname = config.get("database") or ""

        # Pre-flight check via native PyMySQL for exact error diagnosis
        try:
            test_conn = pymysql.connect(
                host=host,
                port=port,
                user=user,
                password=pwd,
                database=dbname if dbname else None,
                connect_timeout=5
            )
            test_conn.close()
        except pymysql.MySQLError as mysql_err:
            err_code, err_msg = mysql_err.args if len(mysql_err.args) >= 2 else (0, str(mysql_err))
            if err_code == 1045:
                return {
                    "success": False,
                    "error": f"Access Denied (1045): Incorrect MySQL password or username for '{user}'@'{host}'."
                }
            elif err_code == 1049:
                return {
                    "success": False,
                    "error": f"Database Not Found (1049): Database '{dbname}' does not exist on MySQL server."
                }
            elif err_code == 2003:
                return {
                    "success": False,
                    "error": f"Connection Refused (2003): Could not connect to MySQL on {host}:{port}. Is MySQL server running?"
                }
            else:
                return {
                    "success": False,
                    "error": f"MySQL Error ({err_code}): {err_msg}"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"MySQL Connection Error: {str(e)}"
            }

        safe_user = urllib.parse.quote_plus(user)
        safe_pwd = urllib.parse.quote_plus(pwd)
        uri = f"mysql+pymysql://{safe_user}:{safe_pwd}@{host}:{port}/{dbname}"
        name = f"MySQL ({dbname})"
        dialect = "mysql"

    db_id = f"db_{int(time.time())}"
    icon_map = {"mysql": "🐬", "postgres": "🐘", "postgresql": "🐘", "sqlite": "🗄️", "mariadb": "🦭", "sqlserver": "🏢"}
    icon = icon_map.get(dialect, "⚡")

    try:
        db_entry = {
            "id": db_id,
            "name": name,
            "dialect": dialect,
            "icon": icon,
            "uri": uri,
            "description": f"Connected {dialect.upper()} Database",
            "isCustom": True
        }
        engine = get_engine_for_db(db_entry)
        schema = introspect_schema_from_engine(engine, name, dialect, force_refresh=True)
        db_entry["description"] = f"Connected {dialect.upper()} Database with {len(schema['tables'])} tables"
        
        _connected_databases[db_id] = db_entry
        _active_database_id = db_id

        return {
            "success": True,
            "databaseId": db_id,
            "message": f"Connected to {dialect.upper()} database '{name}' successfully with {len(schema['tables'])} live tables.",
            "schema": schema
        }
    except Exception as err:
        return {
            "success": False,
            "error": f"Database Connection Error: {str(err)}"
        }

async def execute_active_query(sql: str, max_rows: int = 5000) -> Dict[str, Any]:
    """
    Executes raw SQL query on active database with connection reuse and max-row safety guards.
    """
    t0 = time.time()
    info = _connected_databases.get(_active_database_id) or _connected_databases["default_sqlite"]
    
    try:
        engine = get_engine_for_db(info)
        with engine.connect() as conn:
            result = conn.execute(text(sql))
            if result.returns_rows:
                cols = list(result.keys())
                rows = [dict(row._mapping) for row in result.fetchmany(max_rows)]
            else:
                cols = []
                rows = []

        return {
            "columns": cols,
            "rows": rows,
            "rowCount": len(rows),
            "executionTimeMs": round((time.time() - t0) * 1000, 2),
            "source": info["name"]
        }
    except Exception as e:
        raise RuntimeError(f"Database execution error on {info['name']}: {str(e)}")

def dispose_engine_pools():
    """Cleanly disposes all open engine connection pools."""
    global _engine_pool
    for uri, engine in _engine_pool.items():
        try:
            engine.dispose()
        except Exception:
            pass
    _engine_pool.clear()
    _schema_cache.clear()
