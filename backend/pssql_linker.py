"""
PS-SQL Schema Linker & Relational Subgraph Pruner in Python
"""

from typing import Dict, Any, List

def link_question_to_schema(
    question: str,
    nlp_result: Dict[str, Any],
    schema: Dict[str, Any]
) -> Dict[str, Any]:
    lower_q = question.lower()
    tables = schema.get("tables", [])
    relevant_tables = []
    phrase_links = []

    for t in tables:
        t_name = t["name"].lower()
        t_desc = (t.get("description") or "").lower()
        cols = t.get("columns", [])

        # Check if table or its columns are relevant
        is_relevant = False
        metrics = nlp_result.get("metrics", [])
        stem = t_name.rstrip("s")
        if (t_name in lower_q or stem in lower_q or
            (stem == "customer" and any(w in lower_q for w in ["user", "users", "client", "clients", "grahak", "people"])) or
            (stem == "sale" and any(w in lower_q for w in ["order", "orders", "transaction", "revenue", "bikri"])) or
            (stem == "product" and any(w in lower_q for w in ["item", "items", "saman", "stock"])) or
            any(w in t_desc for w in metrics) or
            any(m == stem for m in metrics)):
            is_relevant = True

        relevant_cols = []
        for c in cols:
            c_name = c["name"].lower()
            c_desc = (c.get("description") or "").lower()
            
            # Check column matches
            if c_name in lower_q or any(m in c_name or m in c_desc for m in nlp_result.get("metrics", [])):
                relevant_cols.append({
                    "name": c["name"],
                    "type": c.get("type", "VARCHAR"),
                    "description": c.get("description", ""),
                    "reason": f"Matched metric or entity from question"
                })
                phrase_links.append({
                    "phrase": c["name"],
                    "targetTable": t["name"],
                    "targetColumn": c["name"],
                    "sourceType": "METRIC_MATCH",
                    "score": 0.95,
                    "explanation": f"Linked to column {t['name']}.{c['name']}"
                })
                is_relevant = True

        if is_relevant:
            relevant_tables.append({
                "tableName": t["name"],
                "tableDescription": t.get("description", ""),
                "columns": relevant_cols if relevant_cols else [{"name": c["name"], "type": c.get("type", "VARCHAR"), "description": c.get("description", ""), "reason": "Table member"} for c in cols[:5]]
            })

    # If nothing specific matched, include default tables
    if not relevant_tables and tables:
        relevant_tables = [{"tableName": t["name"], "tableDescription": t.get("description", ""), "columns": [{"name": c["name"], "type": c.get("type", "VARCHAR"), "description": c.get("description", ""), "reason": "Default context"} for c in t.get("columns", [])]} for t in tables]

    relationships = schema.get("relationships", [])
    join_paths = []
    for r in relationships:
        join_paths.append({
            "from": r.get("fromTable", ""),
            "to": r.get("toTable", ""),
            "type": r.get("type", "INNER JOIN")
        })

    return {
        "relevantTables": relevant_tables,
        "phraseLinks": phrase_links,
        "joinPaths": join_paths
    }
