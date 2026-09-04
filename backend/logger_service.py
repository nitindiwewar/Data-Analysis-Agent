"""
Execution Telemetry & Audit Logger in Python with SQLite Database Persistence
"""

import time
import os
import sqlite3
import json
from typing import List, Dict, Any, Optional

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "database", "sales_analytics.sqlite")

_audit_logs: List[Dict[str, Any]] = []

def get_db_conn():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def log_agent_transaction(log_entry: Dict[str, Any]):
    global _audit_logs
    entry = {
        "id": f"log_{int(time.time() * 1000)}",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        **log_entry
    }
    _audit_logs.insert(0, entry)
    if len(_audit_logs) > 100:
        _audit_logs.pop()

def get_audit_logs() -> List[Dict[str, Any]]:
    return _audit_logs

def clear_audit_logs():
    global _audit_logs
    _audit_logs.clear()

def save_query_history(item: Dict[str, Any]) -> str:
    """Saves a user asked question and its analytical results permanently to SQLite."""
    history_id = item.get("id") or f"run_{int(time.time() * 1000)}"
    timestamp = item.get("timestamp") or time.strftime("%Y-%m-%d %H:%M:%S")
    question = item.get("question", "").strip()
    mode = item.get("mode", "db")
    sql_query = item.get("sql") or item.get("sql_query") or ""
    answer = item.get("answer") or item.get("analysis", {}).get("answer") or ""
    insights = item.get("keyInsights") or item.get("analysis", {}).get("keyInsights") or []
    result = item.get("result") or item.get("extractedTable") or {}
    exec_time = item.get("executionTimeMs") or item.get("totalPipelineDurationMs") or 0.0
    row_count = result.get("rowCount") or len(result.get("rows", []))

    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute("""
            INSERT OR REPLACE INTO query_history 
            (id, timestamp, question, mode, sql_query, answer, insights_json, result_json, execution_time_ms, row_count)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            history_id,
            timestamp,
            question,
            mode,
            sql_query,
            answer,
            json.dumps(insights),
            json.dumps(result),
            exec_time,
            row_count
        ))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"[Query History Save Error]: {e}")

    return history_id

def get_query_history(limit: int = 60) -> List[Dict[str, Any]]:
    """Retrieves all saved user questions and results from SQLite."""
    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute("""
            SELECT id, timestamp, question, mode, sql_query, answer, insights_json, result_json, execution_time_ms, row_count
            FROM query_history
            ORDER BY timestamp DESC
            LIMIT ?;
        """, (limit,))
        rows = c.fetchall()
        conn.close()

        history_list = []
        for r in rows:
            insights = []
            try:
                if r["insights_json"]:
                    insights = json.loads(r["insights_json"])
            except Exception:
                insights = []

            result = {}
            try:
                if r["result_json"]:
                    result = json.loads(r["result_json"])
            except Exception:
                result = {}

            history_list.append({
                "id": r["id"],
                "timestamp": r["timestamp"],
                "question": r["question"],
                "mode": r["mode"],
                "sql": r["sql_query"],
                "answer": r["answer"],
                "keyInsights": insights,
                "result": result if r["mode"] == "db" else None,
                "extractedTable": result if r["mode"] == "rag" else None,
                "executionTimeMs": r["execution_time_ms"],
                "rowCount": r["row_count"]
            })
        return history_list
    except Exception as e:
        print(f"[Query History Fetch Error]: {e}")
        return []

def delete_query_history_item(history_id: str) -> bool:
    """Deletes a specific user question from history."""
    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute("DELETE FROM query_history WHERE id = ?;", (history_id,))
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[Query History Delete Error]: {e}")
        return False

def clear_query_history() -> bool:
    """Clears all stored user query history."""
    try:
        conn = get_db_conn()
        c = conn.cursor()
        c.execute("DELETE FROM query_history;")
        conn.commit()
        conn.close()
        return True
    except Exception as e:
        print(f"[Query History Clear Error]: {e}")
        return False

