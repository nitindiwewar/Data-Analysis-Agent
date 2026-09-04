import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TopNavbar } from './components/TopNav.jsx';
import { ChatAnalyst } from './components/ChatAnalyst.jsx';
import { DatabaseExplorer } from './components/DatabaseExplorer.jsx';
import { FlowiseVisualizer } from './components/FlowiseVisualizer.jsx';
import { BenchmarkEvaluation } from './components/BenchmarkEvaluation.jsx';
import { SqlConsole } from './components/SqlConsole.jsx';
import { AuditLogsViewer } from './components/AuditLogsViewer.jsx';
import {
  analyzeQuestion,
  fetchSchema,
  fetchFlowiseGraph,
  runBenchmarks,
  fetchAuditLogs,
  clearAuditLogsApi,
  fetchDatabases,
  switchDatabase,
  connectCustomDatabase,
  fetchLlmConfig,
  saveLlmApiKey,
  fetchRagDocuments,
  uploadRagFile,
  deleteRagDocument,
  analyzeRagQuestion
} from './services/api';
import { Key } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState('studio');
  const [analysisMode, setAnalysisMode] = useState('db'); // 'db' or 'rag'
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState(null);

  // Database State
  const [schema, setSchema] = useState(null);
  const [databases, setDatabases] = useState([]);
  const [activeDatabaseId, setActiveDatabaseId] = useState('default_sqlite');
  
  // Document RAG State
  const [ragDocuments, setRagDocuments] = useState([]);
  const [selectedRagDocId, setSelectedRagDocId] = useState(null);
  const [isUploadingRag, setIsUploadingRag] = useState(false);

  // Telemetry & Studio State
  const [flowiseGraph, setFlowiseGraph] = useState(null);
  const [benchmarkReport, setBenchmarkReport] = useState(null);
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeConsoleSql, setActiveConsoleSql] = useState('');

  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isLlmActive, setIsLlmActive] = useState(false);

  // Fast core initial load
  useEffect(() => {
    let isMounted = true;
    const loadCoreData = async () => {
      try {
        const [sData, dbData, llmCfg, ragDocs] = await Promise.all([
          fetchSchema().catch(() => null),
          fetchDatabases().catch(() => ({ activeId: 'default_sqlite', databases: [] })),
          fetchLlmConfig().catch(() => ({ isConfigured: false })),
          fetchRagDocuments().catch(() => ({ documents: [] }))
        ]);
        if (!isMounted) return;
        if (sData) setSchema(sData);
        if (dbData) {
          setDatabases(dbData.databases || []);
          setActiveDatabaseId(dbData.activeId || 'default_sqlite');
        }
        if (llmCfg) setIsLlmActive(llmCfg.isConfigured || false);
        if (ragDocs?.documents) setRagDocuments(ragDocs.documents);
      } catch (e) {
        console.warn('Initial load error:', e);
      }
    };
    loadCoreData();
    return () => { isMounted = false; };
  }, []);

  // Lazy tab data fetching
  useEffect(() => {
    if (activeTab === 'flowise' && !flowiseGraph) {
      fetchFlowiseGraph().then(g => g && setFlowiseGraph(g)).catch(() => {});
    } else if (activeTab === 'logs') {
      fetchAuditLogs().then(logs => logs && setAuditLogs(logs)).catch(() => {});
    }
  }, [activeTab, flowiseGraph]);

  const handleToggleMode = useCallback((mode) => {
    setAnalysisMode(mode);
    setCurrentAnalysis(null);
    setAnalysisError(null);
    if (mode === 'rag') {
      fetchRagDocuments().then(res => res?.documents && setRagDocuments(res.documents)).catch(() => {});
    }
  }, []);

  const handleUploadRagFile = useCallback(async (file) => {
    setIsUploadingRag(true);
    try {
      const res = await uploadRagFile(file);
      if (res?.document) {
        setRagDocuments(prev => [res.document, ...prev]);
        setSelectedRagDocId(res.document.id);
      }
    } finally {
      setIsUploadingRag(false);
    }
  }, []);

  const handleDeleteRagDocument = useCallback(async (docId) => {
    try {
      await deleteRagDocument(docId);
      setRagDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedRagDocId === docId) setSelectedRagDocId(null);
    } catch (err) {
      alert(err.message || 'Failed to delete document');
    }
  }, [selectedRagDocId]);

  const handleSaveApiKey = useCallback(async (e) => {
    e.preventDefault();
    if (!apiKeyInput.trim() || isSavingKey) return;
    setIsSavingKey(true);
    try {
      await saveLlmApiKey(apiKeyInput.trim());
      setIsLlmActive(true);
      setShowKeyModal(false);
      setApiKeyInput('');
      alert('Gemini API Key configured successfully!');
    } catch (err) {
      alert(err.message || 'Failed to save Gemini key');
    } finally {
      setIsSavingKey(false);
    }
  }, [apiKeyInput, isSavingKey]);

  const handleSwitchDatabase = useCallback(async (dbId) => {
    try {
      const res = await switchDatabase(dbId);
      setActiveDatabaseId(res.activeId);
      setSchema(res.schema);
      setCurrentAnalysis(null);
      const dbList = await fetchDatabases();
      setDatabases(dbList.databases || []);
    } catch (err) {
      alert(err.message || 'Failed to switch database');
    }
  }, []);

  const handleConnectCustomDb = useCallback(async (config) => {
    const res = await connectCustomDatabase(config);
    if (res.success && res.schema) {
      setActiveDatabaseId(res.databaseId || 'custom_db');
      setSchema(res.schema);
      const dbList = await fetchDatabases();
      setDatabases(dbList.databases || []);
    }
    return res;
  }, []);

  const handleAnalyzeQuestion = useCallback(async (question) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      if (analysisMode === 'rag') {
        const result = await analyzeRagQuestion(question, selectedRagDocId);
        setCurrentAnalysis(result);
      } else {
        const result = await analyzeQuestion(question);
        setCurrentAnalysis(result);
      }
    } catch (err) {
      setAnalysisError(err.message || 'Analysis processing failed');
    } finally {
      setIsAnalyzing(false);
    }
  }, [analysisMode, selectedRagDocId]);

  const handleRunBenchmarks = useCallback(async () => {
    setIsBenchmarking(true);
    setActiveTab('benchmarks');
    try {
      const report = await runBenchmarks();
      setBenchmarkReport(report);
    } catch (err) {
      console.error('Benchmark execution error:', err);
    } finally {
      setIsBenchmarking(false);
    }
  }, []);

  const handleClearLogs = useCallback(async () => {
    try {
      await clearAuditLogsApi();
      setAuditLogs([]);
    } catch (err) {
      console.error('Failed to clear logs:', err);
    }
  }, []);

  const handleRunSampleQueryInConsole = useCallback((sql) => {
    setActiveConsoleSql(sql);
    setActiveTab('console');
  }, []);

  const handleBenchmarkSingleTest = useCallback((question) => {
    setActiveTab('studio');
    handleAnalyzeQuestion(question);
  }, [handleAnalyzeQuestion]);

  return (
    <div className="h-screen w-screen bg-slate-100/80 text-slate-900 flex flex-col font-sans antialiased overflow-hidden">
      {/* 1. Modern Top Header Navigation Bar with Mode Switcher */}
      <TopNavbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        analysisMode={analysisMode}
        onToggleMode={handleToggleMode}
        onRunBenchmarks={handleRunBenchmarks}
        isBenchmarking={isBenchmarking}
        databases={databases}
        activeDatabaseId={activeDatabaseId}
        onSwitchDatabase={handleSwitchDatabase}
        onConnectCustomDb={handleConnectCustomDb}
        schema={schema}
        isLlmActive={isLlmActive}
        onOpenKeyModal={() => setShowKeyModal(true)}
        ragDocsCount={ragDocuments.length}
      />

      {/* 2. Main Analytics Studio Stage */}
      <main className="flex-1 min-h-0 w-full overflow-hidden p-1.5 sm:p-2">
        {activeTab === 'studio' && (
          <ChatAnalyst
            analysisMode={analysisMode}
            onToggleMode={handleToggleMode}
            onAnalyze={handleAnalyzeQuestion}
            isLoading={isAnalyzing}
            currentAnalysis={currentAnalysis}
            error={analysisError}
            schema={schema}
            activeDatabaseId={activeDatabaseId}
            onSelectSqlConsole={handleRunSampleQueryInConsole}
            // RAG props
            ragDocuments={ragDocuments}
            onUploadRagFile={handleUploadRagFile}
            onDeleteRagDocument={handleDeleteRagDocument}
            isUploadingRag={isUploadingRag}
            selectedRagDocId={selectedRagDocId}
            onSelectRagDocId={setSelectedRagDocId}
          />
        )}

        {activeTab === 'schema' && (
          <div className="h-full overflow-y-auto max-w-6xl mx-auto w-full">
            <DatabaseExplorer
              schema={schema}
              onRunSampleQuery={handleRunSampleQueryInConsole}
            />
          </div>
        )}

        {activeTab === 'flowise' && (
          <div className="h-full overflow-y-auto max-w-6xl mx-auto w-full">
            <FlowiseVisualizer
              graph={flowiseGraph}
              onTestFlowiseQuestion={handleBenchmarkSingleTest}
            />
          </div>
        )}

        {activeTab === 'console' && (
          <div className="h-full overflow-y-auto max-w-6xl mx-auto w-full">
            <SqlConsole
              initialSql={activeConsoleSql}
              schema={schema}
            />
          </div>
        )}

        {activeTab === 'benchmarks' && (
          <div className="h-full overflow-y-auto max-w-6xl mx-auto w-full">
            <BenchmarkEvaluation
              report={benchmarkReport}
              isRunning={isBenchmarking}
              onRunBenchmarks={handleRunBenchmarks}
              onTestSingle={handleBenchmarkSingleTest}
            />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="h-full overflow-y-auto max-w-6xl mx-auto w-full">
            <AuditLogsViewer
              logs={auditLogs}
              onClearLogs={handleClearLogs}
            />
          </div>
        )}
      </main>

      {/* LLM Key Configuration Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-slate-800" />
                <h3 className="text-sm font-semibold text-slate-900">Google Gemini API Key</h3>
              </div>
              <button onClick={() => setShowKeyModal(false)} className="text-slate-400 hover:text-slate-700 text-sm cursor-pointer">✕</button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your Google Gemini API Key to enable real-time natural language query synthesis.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3">
              <input
                type="password"
                required
                placeholder="AIzaSy..."
                value={apiKeyInput}
                onChange={e => setApiKeyInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 p-2 text-xs text-slate-900 font-mono focus:outline-none focus:border-slate-400"
              />
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowKeyModal(false)} className="flex-1 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSavingKey || !apiKeyInput.trim()} className="flex-1 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs text-white font-medium disabled:opacity-50 cursor-pointer">
                  {isSavingKey ? 'Saving...' : 'Save Key'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(App);
