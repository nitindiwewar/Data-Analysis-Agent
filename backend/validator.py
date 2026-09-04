"""
AST SQL Safety Gate & Analytical Query Validator in Python
Ensures only read-only SELECT analytical queries are executed.
"""

import sqlparse
from typing import Dict, Any

FORBIDDEN_KEYWORDS = {
    "DROP", "DELETE", "UPDATE", "INSERT", "ALTER", "TRUNCATE",
    "CREATE", "REPLACE", "GRANT", "REVOKE", "EXEC", "EXECUTE", "SHUTDOWN"
}

def validate_analytical_sql(sql: str) -> Dict[str, Any]:
    if not sql or not sql.strip():
        return {
            "isValid": False,
            "error": "Empty SQL query string provided.",
            "queryType": "EMPTY",
            "analysis": {"isReadOnly": True}
        }

    cleaned = sql.strip().rstrip(";")
    parsed = sqlparse.parse(cleaned)
    if not parsed:
        return {
            "isValid": False,
            "error": "Unable to parse SQL syntax.",
            "queryType": "UNKNOWN",
            "analysis": {"isReadOnly": False}
        }

    for stmt in parsed:
        stmt_type = stmt.get_type()
        if stmt_type not in ("SELECT", "UNKNOWN"):
            return {
                "isValid": False,
                "error": f"Rejected query type '{stmt_type}'. Only read-only SELECT queries are allowed.",
                "queryType": stmt_type,
                "analysis": {"isReadOnly": False}
            }

        # Check for forbidden mutation keywords
        tokens_upper = [token.value.upper() for token in stmt.flatten() if not token.is_whitespace]
        for token in tokens_upper:
            if token in FORBIDDEN_KEYWORDS:
                return {
                    "isValid": False,
                    "error": f"Security violation: Forbidden keyword '{token}' detected in analytical sandbox.",
                    "queryType": "FORBIDDEN",
                    "analysis": {"isReadOnly": False}
                }

    return {
        "isValid": True,
        "sanitizedSql": cleaned,
        "queryType": "SELECT",
        "analysis": {
            "isReadOnly": True,
            "hasJoin": "JOIN" in cleaned.upper(),
            "hasAggregation": any(agg in cleaned.upper() for agg in ["SUM(", "COUNT(", "AVG(", "MIN(", "MAX("]),
            "hasGroupBy": "GROUP BY" in cleaned.upper(),
            "hasOrderBy": "ORDER BY" in cleaned.upper()
        }
    }
