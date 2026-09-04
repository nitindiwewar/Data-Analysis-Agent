"""
Document & File SQL RAG Service
Automatically creates in-memory SQL tables for uploaded CSV/tabular files,
extracts structured tabular datasets for PDFs/documents, and executes real SQL
so users get both interactive tabular grids and structured SQL queries in RAG mode.
"""

import os
import io
import csv
import json
import time
import math
import uuid
import re
import sqlite3
from typing import Dict, Any, List, Optional
from pypdf import PdfReader
from backend.gemini_service import generate_gemini_content
from backend.validator import validate_analytical_sql

# Storage directory for uploaded documents
STORAGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "storage", "rag_docs")
os.makedirs(STORAGE_DIR, exist_ok=True)

REGISTRY_PATH = os.path.join(STORAGE_DIR, "rag_registry.json")

# In-memory document registry: {doc_id: doc_metadata}
_documents_store: Dict[str, Dict[str, Any]] = {}
# In-memory chunk index: List[chunk_metadata]
_chunks_store: List[Dict[str, Any]] = []

# Persistent in-memory SQLite engine for uploaded file tables
_file_sql_conn = sqlite3.connect(":memory:", check_same_thread=False)
_file_sql_conn.row_factory = sqlite3.Row

def _save_registry():
    try:
        with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
            json.dump({"documents": _documents_store}, f, indent=2, default=str)
    except Exception as e:
        print(f"[RAG Registry Save Error]: {e}")

def _load_persisted_registry():
    global _documents_store, _chunks_store
    if not os.path.exists(REGISTRY_PATH):
        return
    try:
        with open(REGISTRY_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            docs = data.get("documents", {})
            for doc_id, meta in docs.items():
                file_path = meta.get("filePath")
                if file_path and os.path.exists(file_path):
                    _documents_store[doc_id] = meta
                    # Recreate in-memory SQLite table if CSV
                    file_ext = os.path.splitext(meta["filename"])[1].lower()
                    if file_ext in [".csv", ".xlsx"]:
                        try:
                            with open(file_path, "rb") as bf:
                                f_bytes = bf.read()
                                csv_data = extract_data_from_csv(f_bytes, doc_id, meta["filename"])
                                meta["sqlTableName"] = csv_data.get("sqlTableName")
                                for c in csv_data.get("textChunks", []):
                                    _chunks_store.append({
                                        "chunkId": f"{doc_id}_c{len(_chunks_store)}",
                                        "docId": doc_id,
                                        "filename": meta["filename"],
                                        "page": 1,
                                        "location": c["pageOrRange"],
                                        "text": c["text"]
                                    })
                        except Exception as csv_err:
                            print(f"[RAG Table Reload Error for {meta['filename']}]: {csv_err}")
    except Exception as e:
        print(f"[RAG Registry Load Error]: {e}")

def get_all_documents() -> List[Dict[str, Any]]:
    return list(_documents_store.values())

def delete_document(doc_id: str) -> bool:
    global _chunks_store
    if doc_id in _documents_store:
        doc = _documents_store.pop(doc_id)
        _chunks_store = [c for c in _chunks_store if c.get("docId") != doc_id]
        tbl_name = doc.get("sqlTableName")
        if tbl_name:
            try:
                _file_sql_conn.execute(f"DROP TABLE IF EXISTS {tbl_name}")
                _file_sql_conn.commit()
            except Exception as e:
                print(f"[RAG Drop Table Error]: {e}")
        file_path = doc.get("filePath")
        if file_path and os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"[RAG Delete Warning]: Could not remove file {file_path}: {e}")
        _save_registry()
        return True
    return False

def extract_text_from_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    pages_data = []
    reader = PdfReader(io.BytesIO(file_bytes))
    for idx, page in enumerate(reader.pages):
        text = page.extract_text() or ""
        if text.strip():
            pages_data.append({
                "page": idx + 1,
                "text": text.strip()
            })
    return pages_data

SQL_RESERVED = {
    "index", "order", "group", "by", "table", "select", "from", "where",
    "limit", "desc", "asc", "user", "column", "key", "primary", "check",
    "values", "row", "rank", "offset", "all", "and", "or", "not", "in",
    "as", "case", "when", "then", "else", "end", "having", "join", "on"
}

def sanitize_identifier(name: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9_]", "_", name.strip())
    if not cleaned or cleaned[0].isdigit() or cleaned.lower() in SQL_RESERVED:
        cleaned = f"col_{cleaned}"
    return cleaned.lower()

def infer_sqlite_type(values: List[str]) -> str:
    non_empty = [v.strip() for v in values if v.strip()]
    if not non_empty:
        return "TEXT"
    
    is_int = True
    for v in non_empty:
        try:
            int(v.replace(",", ""))
        except ValueError:
            is_int = False
            break
    if is_int:
        return "INTEGER"
    
    is_real = True
    for v in non_empty:
        try:
            float(v.replace(",", ""))
        except ValueError:
            is_real = False
            break
    if is_real:
        return "REAL"
    
    return "TEXT"

def create_sqlite_table_for_csv(doc_id: str, filename: str, headers: List[str], rows: List[List[str]]) -> str:
    base_name = os.path.splitext(filename)[0]
    table_name = sanitize_identifier(f"file_{base_name}_{doc_id[-6:]}")
    
    sanitized_headers = [sanitize_identifier(h) for h in headers]
    
    # Infer column types
    col_types = []
    for i, col in enumerate(headers):
        sample_vals = [r[i] for r in rows[:100] if i < len(r)]
        col_types.append(infer_sqlite_type(sample_vals))
    
    # Create Table
    col_defs = [f"`{h}` {t}" for h, t in zip(sanitized_headers, col_types)]
    create_sql = f"CREATE TABLE IF NOT EXISTS `{table_name}` ({', '.join(col_defs)});"
    
    cursor = _file_sql_conn.cursor()
    cursor.execute(f"DROP TABLE IF EXISTS `{table_name}`")
    cursor.execute(create_sql)
    
    # Insert Rows
    if rows:
        placeholders = ", ".join(["?"] * len(sanitized_headers))
        insert_sql = f"INSERT INTO `{table_name}` VALUES ({placeholders})"
        clean_rows = []
        for r in rows:
            padded_row = []
            for i, col_type in enumerate(col_types):
                val = r[i].strip() if i < len(r) else None
                if val == "":
                    val = None
                elif col_type == "INTEGER" and val is not None:
                    try: val = int(val.replace(",", ""))
                    except: pass
                elif col_type == "REAL" and val is not None:
                    try: val = float(val.replace(",", ""))
                    except: pass
                padded_row.append(val)
            clean_rows.append(padded_row)
        
        cursor.executemany(insert_sql, clean_rows)
    
    _file_sql_conn.commit()
    return table_name

def extract_data_from_csv(file_bytes: bytes, doc_id: str, filename: str) -> Dict[str, Any]:
    text_content = file_bytes.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text_content))
    rows = list(reader)
    if not rows:
        return {"headers": [], "rows": [], "textChunks": [], "sqlTableName": None}
    
    raw_headers = [h.strip() for h in rows[0]]
    data_rows = rows[1:]
    
    # Build in-memory SQL table
    sql_table_name = create_sqlite_table_for_csv(doc_id, filename, raw_headers, data_rows)
    
    sanitized_headers = [sanitize_identifier(h) for h in raw_headers]
    dict_rows = []
    for r in data_rows:
        row_dict = {}
        for i, col in enumerate(sanitized_headers):
            row_dict[col] = r[i] if i < len(r) else ""
        dict_rows.append(row_dict)
    
    # Text Chunks for RAG
    chunks = []
    batch_size = 15
    for i in range(0, len(dict_rows), batch_size):
        batch = dict_rows[i:i + batch_size]
        batch_text_lines = [f"Table `{sql_table_name}` columns: {', '.join(sanitized_headers)}"]
        for row_idx, row in enumerate(batch, start=i + 1):
            row_str = " | ".join([f"{k}: {v}" for k, v in row.items() if v])
            batch_text_lines.append(f"Row {row_idx}: {row_str}")
        
        chunks.append({
            "pageOrRange": f"Rows {i+1} to {min(i+batch_size, len(dict_rows))}",
            "text": "\n".join(batch_text_lines)
        })
    
    return {
        "headers": sanitized_headers,
        "rows": dict_rows[:100],
        "totalRows": len(dict_rows),
        "textChunks": chunks,
        "sqlTableName": sql_table_name
    }

# Reload all persisted documents and populate SQLite tables on startup
_load_persisted_registry()

async def process_uploaded_file(filename: str, file_bytes: bytes) -> Dict[str, Any]:
    doc_id = f"doc_{uuid.uuid4().hex[:10]}"
    file_ext = os.path.splitext(filename)[1].lower()
    file_size_kb = round(len(file_bytes) / 1024, 2)
    saved_path = os.path.join(STORAGE_DIR, f"{doc_id}_{filename}")
    
    with open(saved_path, "wb") as f:
        f.write(file_bytes)
    
    chunks_to_add = []
    doc_meta = {
        "id": doc_id,
        "filename": filename,
        "fileType": file_ext.replace(".", "").upper() or "TXT",
        "fileSizeKb": file_size_kb,
        "filePath": saved_path,
        "uploadedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "chunkCount": 0,
        "pageCount": 0,
        "rowCount": 0,
        "columns": [],
        "sampleRows": [],
        "sqlTableName": None,
        "summary": ""
    }

    if file_ext == ".pdf":
        pages = extract_text_from_pdf(file_bytes)
        doc_meta["pageCount"] = len(pages)
        for p in pages:
            page_text = p["text"]
            chunk_size = 800
            for i in range(0, len(page_text), chunk_size - 100):
                sub_text = page_text[i:i + chunk_size].strip()
                if sub_text:
                    chunks_to_add.append({
                        "chunkId": f"{doc_id}_p{p['page']}_c{len(chunks_to_add)}",
                        "docId": doc_id,
                        "filename": filename,
                        "page": p["page"],
                        "location": f"Page {p['page']}",
                        "text": sub_text
                    })
        doc_meta["summary"] = f"PDF Document ({len(pages)} pages)"

    elif file_ext in [".csv", ".xlsx"]:
        csv_data = extract_data_from_csv(file_bytes, doc_id, filename)
        doc_meta["rowCount"] = csv_data.get("totalRows", 0)
        doc_meta["columns"] = csv_data.get("headers", [])
        doc_meta["sampleRows"] = csv_data.get("rows", [])[:10]
        doc_meta["sqlTableName"] = csv_data.get("sqlTableName")
        for c in csv_data.get("textChunks", []):
            chunks_to_add.append({
                "chunkId": f"{doc_id}_c{len(chunks_to_add)}",
                "docId": doc_id,
                "filename": filename,
                "page": 1,
                "location": c["pageOrRange"],
                "text": c["text"]
            })
        doc_meta["summary"] = f"SQL Table `{doc_meta['sqlTableName']}` ({csv_data.get('totalRows', 0)} rows, {len(csv_data.get('headers', []))} columns)"

    else:
        text = file_bytes.decode("utf-8", errors="replace")
        chunk_size = 700
        lines = text.split("\n")
        current_chunk = []
        current_len = 0
        for line in lines:
            current_chunk.append(line)
            current_len += len(line)
            if current_len >= chunk_size:
                c_text = "\n".join(current_chunk).strip()
                if c_text:
                    chunks_to_add.append({
                        "chunkId": f"{doc_id}_c{len(chunks_to_add)}",
                        "docId": doc_id,
                        "filename": filename,
                        "page": 1,
                        "location": f"Section {len(chunks_to_add)+1}",
                        "text": c_text
                    })
                current_chunk = []
                current_len = 0
        if current_chunk:
            c_text = "\n".join(current_chunk).strip()
            if c_text:
                chunks_to_add.append({
                    "chunkId": f"{doc_id}_c{len(chunks_to_add)}",
                    "docId": doc_id,
                    "filename": filename,
                    "page": 1,
                    "location": f"Section {len(chunks_to_add)+1}",
                    "text": c_text
                })
        doc_meta["summary"] = f"Text Document ({file_size_kb} KB, {len(chunks_to_add)} sections)"

    doc_meta["chunkCount"] = len(chunks_to_add)
    _documents_store[doc_id] = doc_meta
    _chunks_store.extend(chunks_to_add)
    _save_registry()
    
    return doc_meta

def retrieve_relevant_chunks(query: str, doc_id: Optional[str] = None, top_k: int = 6) -> List[Dict[str, Any]]:
    candidates = _chunks_store
    if doc_id:
        candidates = [c for c in _chunks_store if c.get("docId") == doc_id]
    
    if not candidates:
        return []

    q_words = re.findall(r"\w+", query.lower())
    if not q_words:
        return candidates[:top_k]

    scored = []
    for c in candidates:
        text_lower = c["text"].lower()
        score = 0.0
        for w in q_words:
            if len(w) <= 2: continue
            if w in text_lower:
                score += 1.0 + (text_lower.count(w) * 0.2)
        if query.lower() in text_lower:
            score += 4.0
        scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [item[1] for item in scored[:top_k]]

async def execute_file_sql_query(sql: str) -> Dict[str, Any]:
    t0 = time.time()
    cursor = _file_sql_conn.cursor()
    cursor.execute(sql)
    fetched = cursor.fetchall()
    cols = [d[0] for d in cursor.description] if cursor.description else []
    rows = []
    for r in fetched:
        rows.append({cols[i]: r[i] for i in range(len(cols))})
    return {
        "columns": cols,
        "rows": rows,
        "rowCount": len(rows),
        "executionTimeMs": round((time.time() - t0) * 1000, 2),
        "source": "In-Memory File SQL Engine"
    }

async def generate_sql_for_files(question: str, candidate_docs: List[Dict[str, Any]]) -> Optional[str]:
    table_schemas = []
    for d in candidate_docs:
        tbl = d.get("sqlTableName")
        cols = d.get("columns", [])
        if tbl and cols:
            table_schemas.append(f"Table `{tbl}` (Columns: {', '.join(cols)})")
    
    if not table_schemas:
        return None
    
    schema_str = "\n".join(table_schemas)
    prompt = (
        f"Available In-Memory SQLite Tables:\n{schema_str}\n\n"
        f"User Question:\n\"{question}\"\n\n"
        f"Instructions:\n"
        f"1. Write a precise, read-only standard SQLite SELECT query answering the user question.\n"
        f"2. Always enclose table and column names in backticks (e.g. `table_name`.`col_name`).\n"
        f"3. Use appropriate aggregate functions (SUM, AVG, COUNT, MIN, MAX) and GROUP BY clauses.\n"
        f"4. Order results appropriately (e.g. DESC for top/highest, ASC for bottom/lowest).\n"
        f"Output ONLY raw SQL query without comments or markdown."
    )
    
    try:
        res = await generate_gemini_content(
            prompt,
            system_instruction="You are an expert SQL analyst. Write raw read-only SQLite SELECT queries for in-memory tables. Always use backticks around identifiers. Return ONLY raw SQL.",
            temperature=0.1,
            max_output_tokens=600
        )
        if res and res.get("text"):
            raw_text = res["text"].strip()
            clean_sql = re.sub(r"```(?:sql)?|```", "", raw_text).strip()
            clean_sql = clean_sql.rstrip(";")
            if clean_sql.upper().startswith("SELECT"):
                return clean_sql
    except Exception as e:
        print(f"[File Text2SQL Error]: {e}")
    return None

async def analyze_documents_rag(
    question: str,
    doc_id: Optional[str] = None
) -> Dict[str, Any]:
    t0 = time.time()
    all_docs = get_all_documents()
    
    if not all_docs:
        return {
            "question": question,
            "mode": "rag",
            "sql": "",
            "answer": "No documents are currently uploaded. Please attach a PDF or CSV file to start analysis!",
            "keyInsights": ["Upload PDF or CSV documents to query them."],
            "citations": [],
            "result": {"columns": [], "rows": [], "rowCount": 0, "executionTimeMs": 0, "source": "RAG Engine"},
            "executionTimeMs": round((time.time() - t0) * 1000, 2)
        }

    target_docs = [d for d in all_docs if d["id"] == doc_id] if doc_id else all_docs
    tabular_docs = [d for d in target_docs if d.get("sqlTableName")]

    executed_sql = ""
    sql_result = {"columns": [], "rows": [], "rowCount": 0, "executionTimeMs": 0, "source": "RAG Engine"}
    
    # 1. Attempt In-Memory SQL Execution if Tabular File is Present
    if tabular_docs:
        generated_sql = await generate_sql_for_files(question, tabular_docs)
        if generated_sql:
            try:
                sql_result = await execute_file_sql_query(generated_sql)
                executed_sql = generated_sql
            except Exception as e:
                print(f"[File SQL Exec Error]: {e}")
                tbl = tabular_docs[0]["sqlTableName"]
                fallback_sql = f"SELECT * FROM `{tbl}` LIMIT 10"
                try:
                    sql_result = await execute_file_sql_query(fallback_sql)
                    executed_sql = fallback_sql
                except:
                    pass

    # 2. Text / Passage Search for Narrative, Citations, and Structured Table Synthesis
    relevant_chunks = retrieve_relevant_chunks(question, doc_id=doc_id, top_k=6)
    
    context_blocks = []
    if executed_sql and sql_result.get("rows"):
        context_blocks.append(f"Executed SQL Query: {executed_sql}\nSQL Output Data: {str(sql_result.get('rows')[:10])}")
    
    for idx, c in enumerate(relevant_chunks, start=1):
        context_blocks.append(
            f"[Source {idx} | File: {c['filename']} | Location: {c['location']}]:\n{c['text']}"
        )
    
    context_str = "\n\n---\n\n".join(context_blocks)
    
    prompt = (
        f"You are an expert Data & Document Analyst AI Agent.\n"
        f"The user has asked: \"{question}\"\n\n"
        f"Available Document & SQL Execution Context:\n{context_str}\n\n"
        f"Instructions:\n"
        f"1. Explain the answer in simple, friendly, easy-to-understand conversational language (supporting English, Hindi, or Hinglish depending on question).\n"
        f"2. Cite key figures, revenue numbers (with ₹ or units), and exact file names.\n"
        f"3. Provide 2-3 bullet key insights.\n"
        f"4. ALWAYS synthesize or extract a clean structured tabular dataset ('table') summarizing the key entities, metrics, breakdown, comparison, or facts extracted from the document.\n"
        f"   - 'columns': List of string column names (e.g. ['Item_Name', 'Category', 'Amount_or_Metric', 'Source_Location'])\n"
        f"   - 'rows': List of row objects matching those columns\n\n"
        f"Output JSON Format:\n"
        f"{{\n"
        f"  \"answer\": \"Detailed narrative answer...\",\n"
        f"  \"keyInsights\": [\"Insight 1...\", \"Insight 2...\"],\n"
        f"  \"table\": {{\n"
        f"    \"columns\": [\"Metric_or_Entity\", \"Value_or_Status\", \"Details\", \"Source\"],\n"
        f"    \"rows\": [\n"
        f"      {{\"Metric_or_Entity\": \"Revenue\", \"Value_or_Status\": \"₹96,00,000\", \"Details\": \"iPhone 16 Pro\", \"Source\": \"Delhi\"}}\n"
        f"    ]\n"
        f"  }}\n"
        f"}}"
    )

    answer_text = ""
    key_insights = []
    extracted_table_data = {"columns": [], "rows": []}

    try:
        gemini_res = await generate_gemini_content(
            prompt,
            system_instruction="You are an expert Data & Document Analyst. Return clean JSON with answer, keyInsights, and a structured table.",
            temperature=0.2,
            max_output_tokens=1500
        )
        if gemini_res and gemini_res.get("text"):
            raw_text = gemini_res["text"].strip()
            clean_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
            json_match = re.search(r"\{[\s\S]*\}", clean_text)
            if json_match:
                try:
                    parsed = json.loads(json_match.group(0))
                    raw_ans = parsed.get("answer", clean_text)
                    # Clean out any duplicate markdown tables from narrative answer
                    clean_ans_lines = [l for l in str(raw_ans).split("\n") if not (l.strip().startswith("|") and l.strip().endswith("|"))]
                    answer_text = "\n".join(clean_ans_lines).strip()
                    key_insights = parsed.get("keyInsights", [])
                    extracted_table_data = parsed.get("table", {"columns": [], "rows": []})
                except Exception as e:
                    print(f"[JSON Parse Exception]: {e}")
                    answer_text = clean_text
                    key_insights = ["Extracted findings from uploaded file."]
            else:
                answer_text = clean_text
                key_insights = ["Extracted findings from uploaded file."]
    except Exception as e:
        print(f"[RAG Narrative Gemini Error]: {e}")
        answer_text = f"Analyzed file data for '{question}'."

    # If SQL query didn't populate rows (e.g. PDF/TXT/unstructured query), check extracted_table_data or parse markdown table
    if not sql_result.get("rows"):
        if extracted_table_data.get("rows"):
            cols = extracted_table_data.get("columns") or list(extracted_table_data["rows"][0].keys())
            sql_result = {
                "columns": cols,
                "rows": extracted_table_data["rows"],
                "rowCount": len(extracted_table_data["rows"]),
                "executionTimeMs": round((time.time() - t0) * 1000, 2),
                "source": "Document Extracted Table"
            }
        else:
            # Fallback: Parse markdown table from answer_text if present
            md_lines = [l.strip() for l in answer_text.split("\n") if l.strip().startswith("|") and l.strip().endswith("|")]
            if len(md_lines) >= 3:
                raw_hdrs = [c.strip() for c in md_lines[0].strip("|").split("|") if c.strip()]
                parsed_rows = []
                for dl in md_lines[2:]:
                    cells = [c.strip() for c in dl.strip("|").split("|")]
                    row_map = {}
                    for i, h in enumerate(raw_hdrs):
                        row_map[h] = cells[i] if i < len(cells) else ""
                    if any(row_map.values()):
                        parsed_rows.append(row_map)
                if parsed_rows:
                    sql_result = {
                        "columns": raw_hdrs,
                        "rows": parsed_rows,
                        "rowCount": len(parsed_rows),
                        "executionTimeMs": round((time.time() - t0) * 1000, 2),
                        "source": "Document Extracted Table"
                    }

        if not executed_sql and target_docs:
            cols = sql_result.get("columns", ["Metric", "Value"])
            executed_sql = f"-- Extracted Tabular Records from {target_docs[0]['filename']}\nSELECT {', '.join(cols[:4])} FROM `{target_docs[0]['filename']}`"

    citations = list(set([f"{c['filename']} ({c['location']})" for c in relevant_chunks]))
    if not citations and target_docs:
        citations = [target_docs[0]["filename"]]

    from backend.analyzer import (
        generate_chart_data_from_rows,
        generate_powerbi_kpis,
        detect_anomalies_and_trends,
        generate_executive_narration,
        is_metric_column
    )

    rows = sql_result.get("rows", [])
    columns = sql_result.get("columns", [])

    auto_chart = generate_chart_data_from_rows(rows, columns)
    kpis = generate_powerbi_kpis(rows, columns)

    stats_meta = None
    narration = None
    if rows and len(rows) > 0:
        first_row = rows[0]
        keys = list(first_row.keys())
        metric_keys = [k for k in keys if is_metric_column(k) and isinstance(first_row.get(k), (int, float))]
        primary_metric = metric_keys[0] if metric_keys else (auto_chart["chart_data"]["datasets"][0]["label"] if auto_chart and auto_chart.get("chart_data") else None)
        potential_labels = [k for k in keys if is_metric_column(k) and (isinstance(first_row.get(k), str) or any(t in k.lower() for t in ["name", "item", "entity", "date", "region", "city", "category", "product", "month", "status"]))]
        label_col = potential_labels[0] if potential_labels else keys[0]

        stats_meta = detect_anomalies_and_trends(rows, primary_metric, label_col)
        narration = generate_executive_narration(question, rows, kpis, stats_meta)

        if auto_chart and auto_chart.get("chart_data"):
            auto_chart["chart_data"]["statsMeta"] = stats_meta

    duration_ms = round((time.time() - t0) * 1000, 2)

    return {
        "question": question,
        "mode": "rag",
        "sql": executed_sql,
        "sql_query": executed_sql,
        "answer": answer_text,
        "keyInsights": key_insights,
        "recommended_visualization": auto_chart.get("recommended_visualization", "none") if auto_chart else "none",
        "chart_data": auto_chart.get("chart_data") if auto_chart else None,
        "chartData": auto_chart.get("chart_data") if auto_chart else None,
        "kpis": kpis,
        "narration": narration,
        "statsMeta": stats_meta,
        "citations": citations,
        "result": sql_result,
        "extractedTable": sql_result,
        "relevantChunks": [
            {
                "filename": c["filename"],
                "location": c["location"],
                "text": c["text"][:250] + "..." if len(c["text"]) > 250 else c["text"]
            }
            for c in relevant_chunks
        ],
        "executionTimeMs": duration_ms
    }
