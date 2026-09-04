"""
Flowise Workflow Service in Python
Provides Flowise Agentflow V2 graph definitions for:
- Flow A: Structured Data / Text-to-SQL & Chart Flow (Main Chatflow)
- Flow B: PDF & Document RAG Flow (Unstructured Data & PGVector / In-Memory Vector Store)
"""

from typing import Dict, Any, List, Optional
import os

# ==============================================================================
# FLOW A: STRUCTURED DATA / TEXT-TO-SQL & DYNAMIC CHART FLOW (MAIN CHATFLOW)
# ==============================================================================
FLOW_A_NODES = [
    {
        "id": "node_user_input",
        "name": "chatInput",
        "label": "1. User Input & Voice",
        "category": "Input",
        "description": "Receives natural language analytical question or voice prompt",
        "inputs": {"question": "string", "language": "en / hi / hinglish"},
        "outputs": ["node_master_prompt"],
        "status": "completed",
        "position": {"x": 30, "y": 180}
    },
    {
        "id": "node_chat_model",
        "name": "chatOpenAI",
        "label": "2. Chat Model (Gemini / GPT-4o / Groq)",
        "category": "Model",
        "description": "LLM Chat Engine: Google Gemini / gpt-4o-mini / llama-3.3-70b",
        "inputs": {"model": "gemini-flash / gpt-4o-mini", "temperature": 0.1, "maxTokens": 1500},
        "outputs": ["node_agent_tool_caller"],
        "status": "completed",
        "position": {"x": 290, "y": 60}
    },
    {
        "id": "node_master_prompt",
        "name": "promptTemplate",
        "label": "3. Master Prompt Template (LUMIN AI)",
        "category": "Prompt",
        "description": "System prompt enforcing JSON output: answer, sql_query, recommended_visualization, chart_data",
        "inputs": {
            "template": "You are LUMIN AI, an autonomous Data Analyst.\n1. Analyze Schema: {schema}\n2. Question: {question}\n3. Generate SQL and execute via 'execute_sql_query' tool.\n4. Output strictly JSON: answer, sql_query, recommended_visualization, chart_data."
        },
        "outputs": ["node_agent_tool_caller"],
        "status": "completed",
        "position": {"x": 290, "y": 280}
    },
    {
        "id": "node_sql_tool",
        "name": "customTool",
        "label": "4. Custom Tool: execute_sql_query",
        "category": "Tool",
        "description": "Node.js / Python PostgreSQL & SQLite database execution connector",
        "inputs": {
            "name": "execute_sql_query",
            "code": "const { Client } = require('pg'); ... await client.query($query); return JSON.stringify(res.rows);"
        },
        "outputs": ["node_agent_tool_caller"],
        "status": "completed",
        "position": {"x": 550, "y": 60}
    },
    {
        "id": "node_agent_tool_caller",
        "name": "toolCallingAgent",
        "label": "5. Tool Calling Agent Node",
        "category": "Agent",
        "description": "Autonomous ReAct Agent orchestrating LLM, SQL tool execution, and schema context",
        "inputs": {"tools": ["execute_sql_query"], "model": "chatModel"},
        "outputs": ["node_ast_validator"],
        "status": "completed",
        "position": {"x": 550, "y": 280}
    },
    {
        "id": "node_ast_validator",
        "name": "sqlSafetyGate",
        "label": "6. AST SQL Safety Gate",
        "category": "Validator",
        "description": "Enforces strict read-only SELECT security to block destructive DDL/DML statements",
        "inputs": {"mode": "AST Validation", "allowedOperations": ["SELECT"]},
        "outputs": ["node_chart_synthesis"],
        "status": "completed",
        "position": {"x": 810, "y": 180}
    },
    {
        "id": "node_chart_synthesis",
        "name": "chartSynthesisNode",
        "label": "7. Executive Summary & Chart Engine",
        "category": "Output",
        "description": "Generates dynamic Chart.js data (Bar/Line/Pie) + Interactive Tabular Grid + Bold Executive Takeaway",
        "inputs": {"chartTypes": ["bar", "line", "pie", "horizontal_bar"], "format": "Structured JSON"},
        "outputs": [],
        "status": "completed",
        "position": {"x": 1070, "y": 180}
    }
]

FLOW_A_EDGES = [
    {"id": "e_in_prompt", "source": "node_user_input", "target": "node_master_prompt", "animated": True},
    {"id": "e_model_agent", "source": "node_chat_model", "target": "node_agent_tool_caller", "animated": True},
    {"id": "e_prompt_agent", "source": "node_master_prompt", "target": "node_agent_tool_caller", "animated": True},
    {"id": "e_tool_agent", "source": "node_sql_tool", "target": "node_agent_tool_caller", "animated": True},
    {"id": "e_agent_ast", "source": "node_agent_tool_caller", "target": "node_ast_validator", "animated": True},
    {"id": "e_ast_chart", "source": "node_ast_validator", "target": "node_chart_synthesis", "animated": True}
]

# ==============================================================================
# FLOW B: PDF & DOCUMENT RAG FLOW (UNSTRUCTURED DATA & VECTOR RETRIEVAL)
# ==============================================================================
FLOW_B_NODES = [
    {
        "id": "node_doc_loader",
        "name": "documentLoader",
        "label": "1. Document Loader (PDF/CSV/TXT)",
        "category": "Input",
        "description": "Parses uploaded PDF reports, spreadsheets, and text documents",
        "inputs": {"fileTypes": [".pdf", ".csv", ".xlsx", ".txt", ".json"]},
        "outputs": ["node_text_splitter"],
        "status": "completed",
        "position": {"x": 30, "y": 180}
    },
    {
        "id": "node_text_splitter",
        "name": "recursiveTextSplitter",
        "label": "2. Recursive Text Splitter",
        "category": "Preprocessor",
        "description": "Splits documents into semantic passages with Chunk Size 1000, Overlap 200",
        "inputs": {"chunkSize": 1000, "chunkOverlap": 200},
        "outputs": ["node_embeddings"],
        "status": "completed",
        "position": {"x": 290, "y": 180}
    },
    {
        "id": "node_embeddings",
        "name": "embeddingsNode",
        "label": "3. Embeddings (OpenAI / Gemini)",
        "category": "Model",
        "description": "Generates dense semantic vector embeddings for chunked passages",
        "inputs": {"model": "text-embedding-3-small / text-embedding-004"},
        "outputs": ["node_vector_store"],
        "status": "completed",
        "position": {"x": 550, "y": 180}
    },
    {
        "id": "node_vector_store",
        "name": "vectorStore",
        "label": "4. Vector Store (PGVector / In-Memory)",
        "category": "Database",
        "description": "Stores vector index and performs cosine similarity Top-K search",
        "inputs": {"vectorStore": "PGVector (PostgreSQL) / In-Memory Index", "topK": 6},
        "outputs": ["node_qa_chain"],
        "status": "completed",
        "position": {"x": 810, "y": 180}
    },
    {
        "id": "node_qa_chain",
        "name": "conversationalRetrievalQA",
        "label": "5. Conversational Retrieval QA Chain",
        "category": "Agent",
        "description": "Synthesizes cited answer, extracted data table, and exact page/location references",
        "inputs": {"model": "gemini-flash", "temperature": 0.2, "returnSourceDocuments": True},
        "outputs": [],
        "status": "completed",
        "position": {"x": 1070, "y": 180}
    }
]

FLOW_B_EDGES = [
    {"id": "e_load_split", "source": "node_doc_loader", "target": "node_text_splitter", "animated": True},
    {"id": "e_split_embed", "source": "node_text_splitter", "target": "node_embeddings", "animated": True},
    {"id": "e_embed_vector", "source": "node_embeddings", "target": "node_vector_store", "animated": True},
    {"id": "e_vector_qa", "source": "node_vector_store", "target": "node_qa_chain", "animated": True}
]

# ==============================================================================
# FLOW DATAVIZ: DATAVIZ ANALYST (POWER BI DASHBOARD AGENTFLOW)
# ==============================================================================
DATAVIZ_SYSTEM_PROMPT = """You are "DataViz Analyst," an autonomous data analysis agent.

## MISSION
Turn raw, uploaded, or queried data into accurate insights and a clean,
Power BI–style visual dashboard, without ever inventing numbers.

## TOOLS AVAILABLE TO YOU
- data_profiler: returns schema, row count, dtypes, nulls, and summary
  stats for the loaded dataset.
- code_executor: runs Python (pandas/numpy) in a sandbox for any
  calculation, aggregation, or transformation. ALWAYS use this for
  math — never compute sums, averages, growth rates, or counts yourself.
- chart_generator: takes a chart type + data + labels and returns a
  rendered chart (image or HTML).
- dashboard_builder: assembles multiple chart_generator outputs plus
  KPI cards into a single grid-layout HTML dashboard.
- sql_query (if connected): runs read-only SQL against the connected
  database.

## WORKFLOW (follow in order, do not skip steps)
1. INGEST — Confirm the dataset is loaded. If a file was uploaded, call
   data_profiler before doing anything else.
2. CLARIFY — If the user's goal is ambiguous (e.g., "analyze this")
   infer the 3-5 most business-relevant questions from the column
   names (trends over time, breakdowns by category, top/bottom
   performers, outliers) rather than asking the user to specify
   everything. Only ask a clarifying question if the data genuinely
   supports multiple incompatible interpretations.
3. CLEAN — Flag missing values, duplicate rows, or obvious type issues
   found by data_profiler. Note them briefly; don't block analysis
   over minor issues.
4. ANALYZE — Use code_executor for every calculation. Never estimate,
   round dramatically, or "eyeball" a number from a sample.
5. CHOOSE VISUALS — Match chart type to data shape:
   - Trend over time -> line chart
   - Compare categories -> bar chart (horizontal if >6 categories or long labels)
   - Part-to-whole (<=5 slices) -> donut chart; avoid pie/donut beyond 5 categories, use a bar chart instead
   - Relationship between two numeric variables -> scatter plot
   - Single important number (total revenue, growth %, count) -> KPI card, not a chart
   - Ranking -> sorted horizontal bar chart
6. BUILD DASHBOARD — Call dashboard_builder once with all chart specs
   and KPI cards together, arranged as:
   - Row 1: 3-4 KPI cards (the headline numbers)
   - Row 2-3: 2-3 charts per row, most important trend chart first
   - Consistent color palette across all charts (pass the same palette to every chart_generator call)
7. NARRATE — After the dashboard renders, give a short summary: 2-4
   sentences covering the single most important finding, one notable
   anomaly or risk, and one actionable next step. Do not restate every
   number already visible on the dashboard.

## OUTPUT RULES
- Every number in your narration must trace back to a code_executor
  result. If you can't verify it, say so instead of guessing.
- Keep prose concise — the dashboard carries the detail, your text
  carries the "so what."
- If the dataset is too large to reason about directly, work from
  data_profiler's summary and push full computation to code_executor;
  never ask the LLM context window to hold raw rows for math.
- If a request would require exposing sensitive columns (PII, salaries,
  etc.) beyond what's needed to answer the question, aggregate or mask
  before displaying.
- If data is insufficient to answer confidently, state the limitation
  plainly rather than filling the gap with a plausible-sounding number."""

FLOW_DATAVIZ_NODES = [
    {
        "id": "node_input",
        "name": "chatInput",
        "label": "1. Chat & File Upload Input",
        "category": "Input",
        "description": "Receives CSV/Excel upload or natural language data query",
        "inputs": {"supportedFormats": [".csv", ".xlsx", ".json", "SQL Query"], "chatPrompt": "string"},
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 40, "y": 200}
    },
    {
        "id": "node_llm_model",
        "name": "chatOpenAI",
        "label": "2. LLM Engine (Gemini / Claude / GPT-4o)",
        "category": "Model",
        "description": "Primary reasoning LLM for planning data analysis & tool routing",
        "inputs": {"model": "gemini-3.7-flash / gpt-4o", "temperature": 0.1, "maxTokens": 2048},
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 300, "y": 60}
    },
    {
        "id": "node_memory",
        "name": "bufferMemory",
        "label": "3. Conversational Buffer Memory",
        "category": "Memory",
        "description": "Retains active dataset schema, profile stats, and conversation turns",
        "inputs": {"memoryKey": "chat_history", "windowSize": 10},
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 300, "y": 340}
    },
    {
        "id": "node_agent_dataviz",
        "name": "toolCallingAgent",
        "label": "4. DataViz Analyst Agent Node",
        "category": "Agent",
        "description": "Autonomous Data Analysis Agent executing INGEST -> CLEAN -> ANALYZE -> VISUALIZE -> NARRATE",
        "inputs": {
            "systemPrompt": DATAVIZ_SYSTEM_PROMPT,
            "tools": ["data_profiler", "code_executor", "chart_generator", "dashboard_builder", "sql_query"]
        },
        "outputs": ["node_chat_output"],
        "status": "completed",
        "position": {"x": 620, "y": 200}
    },
    {
        "id": "node_tool_profiler",
        "name": "customTool",
        "label": "5. Tool: data_profiler",
        "category": "Tool",
        "description": "Returns schema, row count, dtypes, nulls, and statistical distribution",
        "inputs": {
            "name": "data_profiler",
            "type": "CustomTool",
            "code": """// Flowise Custom Tool: data_profiler
const profile = {
  rowCount: df.length,
  columns: Object.keys(df[0] || {}),
  dtypes: inferDataTypes(df),
  missingValues: calculateNulls(df),
  summaryStats: computeFiveNumberSummary(df)
};
return JSON.stringify(profile);"""
        },
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 920, "y": 40}
    },
    {
        "id": "node_tool_code_executor",
        "name": "customTool",
        "label": "6. Tool: code_executor (Sandbox)",
        "category": "Tool",
        "description": "Sandboxed Python (pandas/numpy) engine for strict deterministic math & aggregations",
        "inputs": {
            "name": "code_executor",
            "type": "CustomTool",
            "code": """// Flowise Custom Tool: code_executor (Sandboxed E2B / Python)
const res = await sandbox.runPython(`
import pandas as pd, numpy as np
df = pd.read_csv('$datasetPath')
# Deterministic Math Execution
result = $pythonSnippet
print(result.to_json(orient='records'))
`);
return res.stdout;"""
        },
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 920, "y": 120}
    },
    {
        "id": "node_tool_chart_gen",
        "name": "customTool",
        "label": "7. Tool: chart_generator",
        "category": "Tool",
        "description": "Renders high-definition Chart.js visual specs or QuickChart images",
        "inputs": {
            "name": "chart_generator",
            "type": "CustomTool",
            "code": """// Flowise Custom Tool: chart_generator
const chartConfig = {
  type: $chartType, // 'line' | 'bar' | 'doughnut' | 'scatter'
  data: { labels: $labels, datasets: [{ label: $title, data: $values, backgroundColor: $colors }] },
  options: { responsive: true, plugins: { legend: { display: true } } }
};
return JSON.stringify(chartConfig);"""
        },
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 920, "y": 200}
    },
    {
        "id": "node_tool_dashboard_builder",
        "name": "customTool",
        "label": "8. Tool: dashboard_builder",
        "category": "Tool",
        "description": "Assembles Power BI-style CSS Grid: Row 1 KPI cards + Rows 2-3 Multi-Chart Grid",
        "inputs": {
            "name": "dashboard_builder",
            "type": "CustomTool",
            "code": """// Flowise Custom Tool: dashboard_builder
const kpiCards = $kpis.map(k => `
  <div class="kpi-card" style="background:#fff;border-radius:8px;padding:14px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <div style="font-size:12px;color:#64748b;font-weight:600;">${k.label}</div>
    <div style="font-size:22px;font-weight:800;color:#0f172a;">${k.value}</div>
    ${k.change ? `<div style="font-size:11px;color:${k.change.startsWith('+') ? '#16a34a' : '#dc2626'};">${k.change}</div>` : ''}
  </div>`).join('');

const chartBlocks = $charts.map(c => `
  <div class="chart-tile" style="background:#fff;border-radius:8px;padding:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    ${c.html || c.rendered}
  </div>`).join('');

return `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;">${kpiCards}</div>
<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:12px;">${chartBlocks}</div>`;"""
        },
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 920, "y": 280}
    },
    {
        "id": "node_tool_sql_query",
        "name": "customTool",
        "label": "9. Tool: sql_query (Read-Only)",
        "category": "Tool",
        "description": "Executes read-only SQL queries against connected MySQL/PostgreSQL/SQLite database",
        "inputs": {
            "name": "sql_query",
            "type": "CustomTool",
            "code": """// Flowise Custom Tool: sql_query
if (!/^\\s*SELECT\\b/i.test($query)) throw new Error('Security Violation: Only SELECT statements allowed');
const res = await db.query($query);
return JSON.stringify(res.rows);"""
        },
        "outputs": ["node_agent_dataviz"],
        "status": "completed",
        "position": {"x": 920, "y": 360}
    },
    {
        "id": "node_chat_output",
        "name": "chatOutput",
        "label": "10. Chat & Dashboard Output",
        "category": "Output",
        "description": "Renders inline Power BI-style Visual Dashboard + 2-4 sentence Executive Narration",
        "inputs": {"format": "Power BI Inline HTML Dashboard + Narration"},
        "outputs": [],
        "status": "completed",
        "position": {"x": 1200, "y": 200}
    }
]

FLOW_DATAVIZ_EDGES = [
    {"id": "e_in_agent", "source": "node_input", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_model_agent", "source": "node_llm_model", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_mem_agent", "source": "node_memory", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_tool1_agent", "source": "node_tool_profiler", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_tool2_agent", "source": "node_tool_code_executor", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_tool3_agent", "source": "node_tool_chart_gen", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_tool4_agent", "source": "node_tool_dashboard_builder", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_tool5_agent", "source": "node_tool_sql_query", "target": "node_agent_dataviz", "animated": True},
    {"id": "e_agent_out", "source": "node_agent_dataviz", "target": "node_chat_output", "animated": True}
]

def get_flowise_graph_data(flow_type: str = "flow_dataviz") -> Dict[str, Any]:
    """Returns Flowise Agentflow graph based on flow_type:
       - 'flow_dataviz' / 'dataviz' / 'powerbi': DataViz Analyst (Power BI Dashboard Agent)
       - 'flow_a' / 'sql' / 'pssql': Structured Data / Text-to-SQL Flow
       - 'flow_b' / 'rag' / 'document': PDF & Document RAG Flow
    """
    flow_str = str(flow_type).lower()
    
    if flow_str in ["flow_dataviz", "dataviz", "powerbi", "dashboard"]:
        return {
            "flowId": "flow_dataviz_powerbi_agent",
            "flowName": "Flow A: DataViz Analyst (Power BI Visual Dashboard Agent)",
            "flowType": "flow_dataviz",
            "systemPrompt": DATAVIZ_SYSTEM_PROMPT,
            "nodes": FLOW_DATAVIZ_NODES,
            "edges": FLOW_DATAVIZ_EDGES,
            "totalNodes": len(FLOW_DATAVIZ_NODES),
            "totalEdges": len(FLOW_DATAVIZ_EDGES),
            "flowStatus": "Active & Synchronized",
            "framework": "Flowise Agentflow V2",
            "tools": ["data_profiler", "code_executor", "chart_generator", "dashboard_builder", "sql_query"]
        }
    
    if flow_str in ["flow_b", "rag", "document"]:
        return {
            "flowId": "flow_b_document_rag",
            "flowName": "Flow C: PDF & Document RAG Flow (Unstructured Data)",
            "flowType": "flow_b",
            "nodes": FLOW_B_NODES,
            "edges": FLOW_B_EDGES,
            "totalNodes": len(FLOW_B_NODES),
            "totalEdges": len(FLOW_B_EDGES),
            "flowStatus": "Active & Synchronized",
            "framework": "Flowise Agentflow V2"
        }
    
    return {
        "flowId": "flow_a_text2sql_charts",
        "flowName": "Flow B: Structured Data / PS-SQL & Dynamic Charts Flow",
        "flowType": "flow_a",
        "nodes": FLOW_A_NODES,
        "edges": FLOW_A_EDGES,
        "totalNodes": len(FLOW_A_NODES),
        "totalEdges": len(FLOW_A_EDGES),
        "flowStatus": "Active & Synchronized",
        "framework": "Flowise Agentflow V2"
    }

def get_flowise_graph(template: Optional[str] = None) -> Dict[str, Any]:
    flow_type = template if template in ["flow_b", "rag", "document", "flow_a", "sql"] else "flow_dataviz"
    return get_flowise_graph_data(flow_type)

def get_flowise_templates() -> Dict[str, Any]:
    return {
        "flow_dataviz": get_flowise_graph_data("flow_dataviz"),
        "flow_a": get_flowise_graph_data("flow_a"),
        "flow_b": get_flowise_graph_data("flow_b")
    }

def get_flowise_node_types() -> List[Dict[str, Any]]:
    return FLOW_DATAVIZ_NODES + FLOW_A_NODES + FLOW_B_NODES

