"""
Text-to-SQL Synthesis Service in Python
Pure dynamic Google Gemini LLM text-to-SQL generation with schema relationship awareness.
"""

import re
from typing import Dict, Any, Optional
from backend.gemini_service import generate_gemini_content
from backend.validator import validate_analytical_sql

async def generate_sql_query(
    question: str,
    nlp_result: Dict[str, Any],
    schema_context: Dict[str, Any],
    active_schema: Dict[str, Any]
) -> Dict[str, Any]:
    prompt = build_text_to_sql_prompt(question, nlp_result, schema_context, active_schema)
    dialect = active_schema.get("dialect", "sqlite").upper()
    
    system_instruction = (
        f"You are an expert Data Analyst AI Agent specializing in direct text-to-SQL conversion for relational database '{active_schema.get('databaseName', 'database')}' ({dialect}).\n"
        f"Generate ONLY valid, read-only standard {dialect} SELECT queries that EXACTLY answer the user's natural language question.\n"
        f"Ensure correct JOIN conditions, GROUP BY clauses, and ORDER BY clauses.\n"
        f"Do NOT include any markdown explanations, comments, or conversational text. Return ONLY the raw SQL query."
    )

    try:
        gemini_res = await generate_gemini_content(
            prompt,
            system_instruction=system_instruction,
            temperature=0.1,
            max_output_tokens=600
        )
        if gemini_res and gemini_res.get("text"):
            raw_text = gemini_res["text"]
            cleaned_sql = extract_clean_sql(raw_text)
            if cleaned_sql:
                validation = validate_analytical_sql(cleaned_sql)
                if validation.get("isValid"):
                    return {
                        "sql": validation.get("sanitizedSql", cleaned_sql),
                        "isAiGenerated": True,
                        "modelUsed": f"Google Gemini ({gemini_res.get('model', 'gemini-flash')})",
                        "validation": validation,
                        "correctionAttempts": 0
                    }
                else:
                    return {
                        "sql": "",
                        "isAiGenerated": False,
                        "modelUsed": "AST Safety Gate",
                        "validation": validation,
                        "correctionAttempts": 0
                    }
    except Exception as e:
        print(f"[Gemini Text2SQL Error]: {str(e)}")

    # Fast Instant Fallback: PS-SQL Semantic Heuristic Engine (sub-10ms response)
    fallback_sql = generate_heuristic_sql(question, nlp_result, active_schema)
    if fallback_sql:
        validation = validate_analytical_sql(fallback_sql)
        if validation.get("isValid"):
            return {
                "sql": validation.get("sanitizedSql", fallback_sql),
                "isAiGenerated": False,
                "modelUsed": "PS-SQL Semantic Engine (Fast Fallback)",
                "validation": validation,
                "correctionAttempts": 0
            }

    return {
        "sql": "",
        "isAiGenerated": False,
        "modelUsed": "Google Gemini LLM",
        "validation": {
            "isValid": False,
            "error": f"Unable to generate SQL query for question '{question}'."
        },
        "correctionAttempts": 0
    }

def generate_heuristic_sql(question: str, nlp_result: Dict[str, Any], active_schema: Dict[str, Any]) -> Optional[str]:
    """Generates instant, highly accurate SQL queries for common business analyst questions."""
    q = question.lower().strip()
    tables = [t["name"].lower() for t in active_schema.get("tables", [])]
    
    # 0. Check for specific ID lookups (e.g. "user with id 6", "customer id 105", "product 3")
    id_explicit = re.search(r'\b(?:id|no|number)\s*(?:=|is|:)?\s*(\d+)\b', q)
    num_match = re.search(r'\b(\d+)\b', q)
    has_with_id = "with id" in q or "id is" in q or "id=" in q or "id =" in q

    # Check for Users / Customers table
    is_user_query = any(k in q for k in ["user", "users", "customer", "customers", "client", "clients", "grahak", "buyer", "account"])
    if is_user_query and "customers" in tables:
        # Case A: Specific customer ID lookup
        if (has_with_id and num_match) or (id_explicit and not any(k in q for k in ["list", "top", "first", "show me 5", "limit"])):
            target_id = (id_explicit or num_match).group(1)
            return f"SELECT * FROM customers WHERE customer_id = {target_id};"
        
        # Case B: Top / Ranked Customers by spending
        if any(k in q for k in ["top", "highest", "best", "spend", "revenue", "rank"]) and "sales" in tables:
            limit = int(num_match.group(1)) if num_match else 5
            return f"SELECT c.customer_name, c.city, c.customer_type, SUM(s.revenue) AS total_spent, COUNT(s.sale_id) AS orders_count FROM customers c JOIN sales s ON c.customer_id = s.customer_id GROUP BY c.customer_id, c.customer_name, c.city, c.customer_type ORDER BY total_spent DESC LIMIT {limit};"
            
        # Case C: Listing users/customers (e.g. "list down the user 5", "show 5 users", "list customers")
        limit = int(num_match.group(1)) if num_match else 10
        return f"SELECT customer_id, customer_name, customer_type, email, city, signup_date FROM customers LIMIT {limit};"

    # 1. Top products by revenue / sales / volume
    if any(k in q for k in ["top", "highest", "best", "leading"]) and any(k in q for k in ["product", "item", "selling"]):
        limit = int(num_match.group(1)) if num_match else 5
        if "sales" in tables and "products" in tables:
            return f"SELECT p.product_name, p.category, SUM(s.revenue) AS total_revenue, SUM(s.quantity) AS units_sold FROM sales s JOIN products p ON s.product_id = p.product_id GROUP BY p.product_id, p.product_name, p.category ORDER BY total_revenue DESC LIMIT {limit};"
        elif "products" in tables:
            return f"SELECT product_name, category, unit_price, stock_quantity FROM products ORDER BY unit_price DESC LIMIT {limit};"

    # 2. Check for Products specific ID or listing
    is_product_query = any(k in q for k in ["product", "products", "item", "items", "saman", "goods", "catalog"])
    if is_product_query and "products" in tables:
        if has_with_id and num_match:
            return f"SELECT * FROM products WHERE product_id = {num_match.group(1)};"
        limit = int(num_match.group(1)) if num_match else 15
        if any(k in q for k in ["price", "daam", "expensive", "cost"]):
            return f"SELECT product_id, product_name, category, unit_price, stock_quantity FROM products ORDER BY unit_price DESC LIMIT {limit};"
        return f"SELECT product_id, product_name, category, unit_price, stock_quantity FROM products LIMIT {limit};"

    # 3. Sales / Revenue by region
    if any(k in q for k in ["region", "regions", "state", "zone", "location"]) and any(k in q for k in ["sale", "revenue", "turnover", "performance", "compare"]):
        if "sales" in tables and "regions" in tables:
            return "SELECT r.region_name, SUM(s.revenue) AS total_revenue, SUM(s.profit) AS total_profit, COUNT(s.sale_id) AS total_orders FROM sales s JOIN regions r ON s.region_id = r.region_id GROUP BY r.region_name ORDER BY total_revenue DESC;"
        elif "regions" in tables:
            return "SELECT region_name, country, regional_manager FROM regions;"

    # 4. Sales / Revenue by category
    if any(k in q for k in ["category", "categories", "segment"]) and any(k in q for k in ["sale", "revenue", "profit", "compare"]):
        if "sales" in tables and "products" in tables:
            return "SELECT p.category, SUM(s.revenue) AS total_revenue, SUM(s.profit) AS total_profit, COUNT(s.sale_id) AS order_count FROM sales s JOIN products p ON s.product_id = p.product_id GROUP BY p.category ORDER BY total_revenue DESC;"

    # 5. Total revenue / profit / summary
    if any(k in q for k in ["total", "overall", "gross", "sum"]) and any(k in q for k in ["revenue", "sales", "profit", "income", "bikri"]):
        if "sales" in tables:
            return "SELECT SUM(revenue) AS total_revenue, SUM(profit) AS total_profit, SUM(cost) AS total_cost, COUNT(*) AS total_transactions, ROUND(AVG(revenue), 2) AS average_order_value FROM sales;"

    # 6. Monthly trend / over time
    if any(k in q for k in ["month", "monthly", "trend", "over time", "timeline", "date"]):
        if "sales" in tables:
            return "SELECT SUBSTR(sale_date, 1, 7) AS sale_month, SUM(revenue) AS monthly_revenue, SUM(profit) AS monthly_profit, COUNT(sale_id) AS orders_count FROM sales GROUP BY sale_month ORDER BY sale_month ASC;"

    # 7. Low stock / inventory alerts
    if any(k in q for k in ["low stock", "inventory", "stock below", "out of stock", "reorder"]):
        threshold = int(num_match.group(1)) if num_match else 50
        if "products" in tables:
            return f"SELECT product_name, category, stock_quantity, unit_price FROM products WHERE stock_quantity < {threshold} ORDER BY stock_quantity ASC;"

    # 8. Generic table select if a table name is mentioned in question
    for t in active_schema.get("tables", []):
        t_name = t["name"]
        stem = t_name.rstrip("s")
        if t_name.lower() in q or stem.lower() in q:
            limit = int(num_match.group(1)) if num_match else 15
            return f"SELECT * FROM {t_name} LIMIT {limit};"

    # 9. Default fallback: recent sales summary
    if "sales" in tables:
        return "SELECT s.sale_id, s.sale_date, p.product_name, s.quantity, s.revenue, s.profit FROM sales s JOIN products p ON s.product_id = p.product_id ORDER BY s.sale_date DESC LIMIT 10;"
    
    first_table = active_schema.get("tables", [{}])[0].get("name")
    if first_table:
        return f"SELECT * FROM {first_table} LIMIT 15;"
        
    return None

def build_text_to_sql_prompt(
    question: str,
    nlp_result: Dict[str, Any],
    schema_context: Dict[str, Any],
    active_schema: Dict[str, Any]
) -> str:
    table_lines = []
    for t in active_schema.get("tables", []):
        cols = ", ".join([f"{c['name']} ({c.get('type', 'TEXT')})" for c in t.get("columns", [])])
        table_lines.append(f"- Table `{t['name']}`: ({cols})")

    schema_str = "\n".join(table_lines)
    
    rel_lines = []
    for r in active_schema.get("relationships", []):
        rel_lines.append(f"- `{r['fromTable']}.{r['fromColumn']}` -> `{r['toTable']}.{r['toColumn']}`")
    
    rel_str = "\n".join(rel_lines) if rel_lines else "None explicitly defined. Join on common ID columns."

    return (
        f"Database Schema ({active_schema.get('databaseName', 'database')} | Dialect: {active_schema.get('dialect', 'sqlite')}):\n"
        f"{schema_str}\n\n"
        f"Foreign Key Relationships:\n"
        f"{rel_str}\n\n"
        f"CRITICAL ENTITY MAPPINGS:\n"
        f"- 'user', 'users', 'client', 'clients', 'grahak', 'account', 'people' refer to the `customers` table.\n"
        f"- 'user 5' or 'user with id 5' means `WHERE customer_id = 5`.\n"
        f"- 'list down user 5' or 'show 5 users' means `SELECT * FROM customers LIMIT 5`.\n"
        f"- 'product', 'item', 'saman', 'hardware' refer to the `products` table.\n"
        f"- 'sale', 'order', 'transaction', 'revenue' refer to the `sales` table.\n\n"
        f"User Question:\n\"{question}\"\n\n"
        f"Instructions:\n"
        f"1. Write a precise, read-only SELECT SQL query matching the user question.\n"
        f"2. Use appropriate JOINs using foreign keys when querying across tables.\n"
        f"3. Use appropriate aggregate functions (SUM, AVG, COUNT, MIN, MAX) and GROUP BY when aggregations are required.\n"
        f"4. Order by relevant metrics (e.g. DESC for highest/top, ASC for lowest).\n"
        f"Output raw SQL only."
    )

def extract_clean_sql(raw: str) -> str:
    if not raw:
        return ""
    code_match = re.search(r"```(?:sql)?\s*([\s\S]*?)\s*```", raw, re.IGNORECASE)
    if code_match:
        sql = code_match.group(1).strip()
    else:
        sql = raw.strip()
    sql = re.sub(r'\n\s*\n+', '\n', sql)
    return sql.rstrip(";").strip()
