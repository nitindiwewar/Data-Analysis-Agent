/**
 * Frontend Client API Service with Universal Multi-Database Connector, LLM Configuration & Document RAG
 */

/**
 * Executes a full natural language query analysis pipeline (Database Mode)
 * @param {string} question 
 * @returns {Promise<Object>}
 */
export async function analyzeQuestion(question) {
  const res = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });

  const data = await res.json().catch(() => ({ error: 'Analysis failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Failed to analyze question');
  }

  return data;
}

/**
 * Fetches the current active database schema
 * @returns {Promise<Object>}
 */
export async function fetchSchema() {
  const res = await fetch('/api/schema');
  if (!res.ok) throw new Error('Failed to fetch schema metadata');
  return await res.json();
}

/**
 * Fetches the list of available databases
 * @returns {Promise<{ activeId: string, databases: Array }>}
 */
export async function fetchDatabases() {
  const res = await fetch('/api/db/list');
  if (!res.ok) throw new Error('Failed to fetch databases');
  return await res.json();
}

/**
 * Switches the active database
 * @param {string} databaseId 
 * @returns {Promise<Object>}
 */
export async function switchDatabase(databaseId) {
  const res = await fetch('/api/db/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ databaseId })
  });
  const data = await res.json().catch(() => ({ error: 'Failed to switch database' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Failed to switch database');
  }
  return data;
}

/**
 * Connects to ANY live database (MySQL, PostgreSQL, SQLite, Custom URI)
 * @param {Object} config 
 * @returns {Promise<Object>}
 */
export async function connectCustomDatabase(config) {
  const res = await fetch('/api/db/connect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  const data = await res.json().catch(() => ({ error: 'Connection failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Failed to connect to database');
  }
  return data;
}

/**
 * Executes a raw SQL query directly in sandbox
 * @param {string} sql 
 * @returns {Promise<Object>}
 */
export async function executeSqlSandbox(sql) {
  const res = await fetch('/api/sql/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql })
  });
  const data = await res.json().catch(() => ({ error: 'Query execution failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Execution error');
  }
  return data;
}

export const executeDirectSql = executeSqlSandbox;

/**
 * Uploads a document (PDF, CSV, TXT) for RAG Analysis
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export async function uploadRagFile(file) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch('/api/rag/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Failed to upload document');
  }
  return data;
}

/**
 * Lists all uploaded RAG documents
 * @returns {Promise<{ count: number, documents: Array }>}
 */
export async function fetchRagDocuments() {
  const res = await fetch('/api/rag/documents');
  if (!res.ok) return { count: 0, documents: [] };
  return await res.json();
}

/**
 * Deletes an uploaded RAG document
 * @param {string} docId 
 * @returns {Promise<Object>}
 */
export async function deleteRagDocument(docId) {
  const res = await fetch(`/api/rag/documents/${docId}`, {
    method: 'DELETE'
  });
  const data = await res.json().catch(() => ({ error: 'Delete failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || 'Failed to delete document');
  }
  return data;
}

/**
 * Analyzes a natural language question over uploaded RAG documents
 * @param {string} question 
 * @param {string|null} docId 
 * @returns {Promise<Object>}
 */
export async function analyzeRagQuestion(question, docId = null) {
  const res = await fetch('/api/rag/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, docId })
  });

  const data = await res.json().catch(() => ({ error: 'RAG analysis failed' }));
  if (!res.ok) {
    throw new Error(data.detail || data.error || data.message || 'Failed to analyze documents');
  }
  return data;
}

/**
 * Uploads a spreadsheet / CSV to dynamically create a database table (Step 3)
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export async function uploadSpreadsheet(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch('/api/data/v1/upload-spreadsheet', {
    method: 'POST',
    body: formData
  });
  const data = await res.json().catch(() => ({ error: 'Upload failed' }));
  if (!res.ok) throw new Error(data.detail || data.error || 'Failed to upload spreadsheet');
  return data;
}

/**
 * Fetches Flowise Workflow Graph (Flow A: Text2SQL & Charts | Flow B: Document RAG)
 * @param {string} flowType 
 * @returns {Promise<Object>}
 */
export async function fetchFlowiseGraph(flowType = 'flow_a') {
  const url = `/api/flowise/graph?flowType=${flowType}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load Flowise workflow');
  return await res.json();
}

/**
 * Fetches Flowise templates list
 * @returns {Promise<Object>}
 */
export async function fetchFlowiseTemplates() {
  const res = await fetch('/api/flowise/templates');
  if (!res.ok) throw new Error('Failed to load Flowise templates');
  return await res.json();
}

/**
 * Fetches Flowise available node types
 * @returns {Promise<Array>}
 */
export async function fetchFlowiseNodes() {
  const res = await fetch('/api/flowise/nodes/types');
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Runs the automated accuracy benchmark suite
 * @returns {Promise<Object>}
 */
export async function runBenchmarks() {
  const res = await fetch('/api/benchmark/run');
  if (!res.ok) throw new Error('Benchmark run failed');
  return await res.json();
}

/**
 * Fetches audit telemetry logs
 * @returns {Promise<Array>}
 */
export async function fetchAuditLogs() {
  const res = await fetch('/api/logs');
  if (!res.ok) return [];
  return await res.json();
}

/**
 * Clears audit telemetry logs
 * @returns {Promise<Object>}
 */
export async function clearAuditLogsApi() {
  const res = await fetch('/api/logs/clear', { method: 'POST' });
  return await res.json();
}

/**
 * Fetches Gemini LLM config status
 * @returns {Promise<Object>}
 */
export async function fetchLlmConfig() {
  const res = await fetch('/api/config/llm');
  if (!res.ok) return { isConfigured: false };
  return await res.json();
}

/**
 * Saves runtime Gemini API key
 * @param {string} apiKey 
 * @returns {Promise<Object>}
 */
export async function saveLlmApiKey(apiKey) {
  const res = await fetch('/api/config/llm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || 'Failed to save Gemini key');
  return data;
}

/**
 * Fetches saved user query history from SQLite backend
 * @param {number} limit 
 * @returns {Promise<Array>}
 */
export async function fetchQueryHistory(limit = 60) {
  try {
    const res = await fetch(`/api/history?limit=${limit}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.history || [];
  } catch (e) {
    return [];
  }
}

/**
 * Clears all user query history
 * @returns {Promise<Object>}
 */
export async function clearQueryHistoryApi() {
  const res = await fetch('/api/history', { method: 'DELETE' });
  return await res.json();
}

/**
 * Deletes a single user query history item
 * @param {string} historyId 
 * @returns {Promise<Object>}
 */
export async function deleteQueryHistoryApi(historyId) {
  const res = await fetch(`/api/history/${historyId}`, { method: 'DELETE' });
  return await res.json();
}

