"""
Python FastAPI Application & REST Controller for Data Analyst AI Agent
Universal Database Engine supporting MySQL, PostgreSQL, SQLite, MariaDB, and Custom URIs,
along with Document RAG (Retrieval-Augmented Generation) for PDF, CSV, and Text files.
"""

from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import time
import os

from backend.agent_orchestrator import process_data_analyst_question
from backend.database_registry import (
    get_active_database_schema,
    get_active_database_id,
    list_available_databases,
    set_active_database_id,
    connect_universal_database,
    execute_active_query,
    dispose_engine_pools
)
from backend.gemini_service import is_gemini_configured, set_runtime_gemini_key, close_http_client
from backend.flowise_service import (
    get_flowise_graph,
    get_flowise_templates,
    get_flowise_node_types
)
from backend.validator import validate_analytical_sql
from backend.benchmarks import run_full_benchmark_suite
from backend.logger_service import (
    get_audit_logs,
    clear_audit_logs,
    get_query_history,
    delete_query_history_item,
    clear_query_history
)
from backend.rag_service import (
    process_uploaded_file,
    get_all_documents,
    delete_document,
    analyze_documents_rag
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown: Clean up pooled connection resources
    await close_http_client()
    dispose_engine_pools()

app = FastAPI(
    title="Data Analyst AI Agent (Universal Database & RAG Engine)",
    description="Python FastAPI backend supporting SQL Databases and Document RAG on PDF/CSV.",
    version="2.2.0",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Request Models
class AnalyzeRequest(BaseModel):
    question: str

class RagAnalyzeRequest(BaseModel):
    question: str
    docId: Optional[str] = None

class SwitchDbRequest(BaseModel):
    databaseId: str

class ConnectUniversalDbRequest(BaseModel):
    dialect: Optional[str] = "mysql"
    name: Optional[str] = None
    host: Optional[str] = "localhost"
    port: Optional[int] = 3306
    user: Optional[str] = "root"
    password: Optional[str] = ""
    database: Optional[str] = ""
    databasePath: Optional[str] = None
    connectionUri: Optional[str] = None

class ExecuteSqlRequest(BaseModel):
    sql: str

class ConfigLlmRequest(BaseModel):
    apiKey: str

# 1. Health Check
@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "Data Analyst (Universal Database & RAG Engine)",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "activeDatabase": get_active_database_id(),
        "aiModel": "Google Gemini (Python Engine)",
        "geminiConfigured": is_gemini_configured(),
        "ragDocumentsCount": len(get_all_documents()),
        "flowiseConfigured": bool(os.environ.get("FLOWISE_URL"))
    }

# 2. Natural Language Analysis (Database SQL Mode)
@app.post("/api/analyze")
async def analyze_question(req: AnalyzeRequest):
    q = req.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Valid question string is required.")
    try:
        result = await process_data_analyst_question(q)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. Document RAG APIs (PDF, CSV, TXT)
@app.post("/api/rag/upload")
async def upload_rag_file(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        
        doc_meta = await process_uploaded_file(file.filename, file_bytes)
        return {
            "success": True,
            "message": f"Successfully ingested '{file.filename}'",
            "document": doc_meta
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process file: {str(e)}")

@app.get("/api/rag/documents")
async def list_rag_documents():
    docs = get_all_documents()
    return {
        "count": len(docs),
        "documents": docs
    }

@app.delete("/api/rag/documents/{doc_id}")
async def delete_rag_document(doc_id: str):
    success = delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {
        "success": True,
        "message": f"Document '{doc_id}' deleted."
    }

@app.post("/api/rag/analyze")
async def analyze_rag(req: RagAnalyzeRequest):
    q = req.question.strip()
    if not q:
        raise HTTPException(status_code=400, detail="Valid question string is required.")
    try:
        res = await analyze_documents_rag(q, doc_id=req.docId)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 4. Database Management & Schema (Universal Multi-DB)
@app.get("/api/schema")
async def get_schema():
    return get_active_database_schema()

@app.get("/api/db/list")
async def get_db_list():
    return {
        "activeId": get_active_database_id(),
        "databases": list_available_databases()
    }

@app.get("/api/db/active")
async def get_active_db():
    return {
        "activeId": get_active_database_id(),
        "schema": get_active_database_schema()
    }

@app.post("/api/db/switch")
async def switch_database(req: SwitchDbRequest):
    success = set_active_database_id(req.databaseId)
    if not success:
        raise HTTPException(status_code=400, detail=f"Database '{req.databaseId}' not found.")
    return {
        "success": True,
        "activeId": get_active_database_id(),
        "schema": get_active_database_schema(),
        "message": f"Switched active database to '{req.databaseId}'"
    }

@app.post("/api/db/connect")
async def connect_db(req: ConnectUniversalDbRequest):
    data = req.model_dump() if hasattr(req, "model_dump") else req.dict()
    res = await connect_universal_database(data)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error", "Database connection failed"))
    return res

# 5. SQL Sandbox
@app.post("/api/sql/execute")
async def execute_sql(req: ExecuteSqlRequest):
    validation = validate_analytical_sql(req.sql)
    if not validation.get("isValid"):
        raise HTTPException(status_code=400, detail=validation.get("error", "Invalid SQL"))
    try:
        result = await execute_active_query(validation.get("sanitizedSql", req.sql))
        return {"validation": validation, "result": result}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# 6. LLM API Key Configuration
@app.get("/api/config/llm")
async def get_llm_config():
    return {
        "isConfigured": is_gemini_configured(),
        "model": "Google Gemini (Python Engine)",
        "provider": "Google AI Studio (Python)"
    }

@app.post("/api/config/llm")
async def set_llm_config(req: ConfigLlmRequest):
    success = set_runtime_gemini_key(req.apiKey)
    if not success:
        raise HTTPException(status_code=400, detail="Invalid API key provided.")
    return {
        "success": True,
        "isConfigured": True,
        "message": "Gemini API Key configured successfully."
    }

# 3. Data Ingestion Endpoint (Step 3: CSV/Excel to Dynamic DB Table)
@app.post("/api/data/v1/upload-spreadsheet")
async def upload_spreadsheet(file: UploadFile = File(...)):
    try:
        file_bytes = await file.read()
        if not file_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")
        doc_meta = await process_uploaded_file(file.filename, file_bytes)
        return {
            "success": True,
            "table_name": doc_meta.get("sqlTableName") or f"dataset_{doc_meta['id'][-8:]}",
            "schema": {c: "NUMERIC/TEXT" for c in doc_meta.get("columns", [])},
            "rowCount": doc_meta.get("rowCount", 0),
            "document": doc_meta
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to ingest spreadsheet: {str(e)}")

# 7. Flowise Integration (Flow A: Text-to-SQL & Charts | Flow B: Document RAG)
@app.get("/api/flowise/graph")
async def get_flowise_graph_endpoint(flowType: Optional[str] = "flow_a", template: Optional[str] = None):
    from backend.flowise_service import get_flowise_graph_data
    selected_flow = flowType or template or "flow_a"
    return get_flowise_graph_data(selected_flow)

# 8. Benchmarks & Audit Logs
@app.get("/api/benchmark/run")
async def run_benchmark():
    return await run_full_benchmark_suite()

@app.get("/api/logs")
async def get_logs():
    return get_audit_logs()

@app.post("/api/logs/clear")
async def clear_logs():
    clear_audit_logs()
    return {"success": True, "message": "Audit logs cleared"}

# 9. Persistent User Question History
@app.get("/api/history")
async def get_history(limit: int = 60):
    return {
        "history": get_query_history(limit)
    }

@app.delete("/api/history")
async def clear_all_history():
    success = clear_query_history()
    return {"success": success, "message": "All user query history cleared."}

@app.delete("/api/history/{history_id}")
async def delete_single_history(history_id: str):
    success = delete_query_history_item(history_id)
    return {"success": success, "message": f"Query history item '{history_id}' deleted."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
