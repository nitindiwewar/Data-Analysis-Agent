import React, { useState, useRef, useEffect } from 'react';
import {
  Send, Loader2, Database, ChevronDown, ChevronUp, Code2, CheckCircle2,
  Mic, MicOff, Terminal, Clock, ArrowRight, Table2, Search,
  History, CheckCircle, HelpCircle, X, Layers, AlertCircle, FileText,
  Upload, Trash2, FileSpreadsheet, FileCode, BookOpen, Paperclip, FileCheck,
  TrendingUp, Radio, UserCheck, ShieldAlert, Zap, Compass, Lightbulb,
  PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { SqlResultTable } from './SqlResultTable.jsx';
import { DynamicChartRenderer } from './DynamicChartRenderer.jsx';

const FLOWISE_DB_STAGES = [
  { id: 'nlp', label: '1. Query Parser' },
  { id: 't2s', label: '2. SQL Engine' },
  { id: 'ast', label: '3. Safety Validator' },
  { id: 'db',  label: '4. Database Query' },
  { id: 'sum', label: '5. Executive Summary' }
];

const FLOWISE_RAG_STAGES = [
  { id: 'chunk', label: '1. Document Parser' },
  { id: 'embed', label: '2. Passage Retrieval' },
  { id: 'synth', label: '3. Data Synthesis' },
  { id: 'cite',  label: '4. Citation Mapping' }
];

const ChatAnalystBase = ({
  analysisMode = 'db',
  onToggleMode,
  onAnalyze,
  isLoading,
  currentAnalysis,
  error,
  schema,
  activeDatabaseId = 'default_sqlite',
  // RAG Props
  ragDocuments = [],
  onUploadRagFile,
  onDeleteRagDocument,
  isUploadingRag = false,
  selectedRagDocId,
  onSelectRagDocId
}) => {
  const [history, setHistory] = useState([]);
  const [activeRunId, setActiveRunId] = useState(null);
  const [inputQuery, setInputQuery] = useState('');
  const [expandedTable, setExpandedTable] = useState(null);
  const [showSqlDrawer, setShowSqlDrawer] = useState(true);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [tableSearch, setTableSearch] = useState('');
  
  // Modern BI: Hyper-Personalization Persona & Real-Time Streaming State
  const [persona, setPersona] = useState('executive'); // 'executive' | 'analyst' | 'product'
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamTick, setStreamTick] = useState(0);

  // Layout Flexibility: Collapsible Panels
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);

  const inlineFileInputRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (currentAnalysis) {
      const newId = `run_${Date.now()}`;
      const newEntry = { ...currentAnalysis, id: newId, mode: analysisMode };
      setHistory(prev => {
        const filtered = prev.filter(item => item.question !== currentAnalysis.question || item.sql !== currentAnalysis.sql);
        return [newEntry, ...filtered];
      });
      setActiveRunId(newId);
    }
  }, [currentAnalysis, analysisMode]);

  const activeRun = history.find(h => h.id === activeRunId) || history[0] || currentAnalysis;

  // Real-Time Streaming Dashboard: simulated live polling
  useEffect(() => {
    if (!isStreaming) return;
    const interval = setInterval(() => {
      setStreamTick(t => t + 1);
      // If there's an active query in db mode, refresh it
      if (activeRun?.question && analysisMode === 'db' && !isLoading) {
        onAnalyze(activeRun.question);
      }
    }, 12000); // 12-second live streaming cycle
    return () => clearInterval(interval);
  }, [isStreaming, activeRun?.question, analysisMode, isLoading, onAnalyze]);

  const toggleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-IN';
      recognition.continuous = false;
      recognition.interimResults = true;

      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results).map(result => result[0].transcript).join('');
        setInputQuery(transcript);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  const handleExecute = (q) => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    const queryToRun = (q || inputQuery).trim();
    if (!queryToRun || isLoading) return;

    setInputQuery('');
    onAnalyze(queryToRun);
  };

  const handleCopySql = (sql) => {
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const handleAutoFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      if (onToggleMode && analysisMode !== 'rag') {
        onToggleMode('rag');
      }
      await onUploadRagFile(file);
      if (inlineFileInputRef.current) inlineFileInputRef.current.value = '';
    } catch (err) {
      alert(err.message || 'File upload failed');
    }
  };

  const activeRagDoc = ragDocuments.find(d => d.id === selectedRagDocId) || ragDocuments[0];

  const filteredTables = (schema?.tables || []).filter(t => 
    t.name.toLowerCase().includes(tableSearch.toLowerCase())
  );

  const isRagMode = analysisMode === 'rag';
  const flowiseStages = isRagMode ? FLOWISE_RAG_STAGES : FLOWISE_DB_STAGES;

  return (
    <div className="flex h-full w-full gap-2 overflow-hidden relative">
      {/* ========================================================================= */}
      {/* 1. LEFT PANE: Compact Schema / Document List (Collapsible) */}
      {/* ========================================================================= */}
      {showLeftSidebar && (
        <aside className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden hidden md:flex transition-all">
          {!isRagMode ? (
            <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <Table2 className="h-3.5 w-3.5 text-blue-700" />
                <span>Tables</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-slate-700 font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200">
                  {schema?.tables?.length || 0}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLeftSidebar(false)}
                  className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  title="Collapse Tables"
                >
                  <PanelLeftClose className="h-3 w-3" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2 border-b border-slate-100 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-1.5 text-xs font-bold text-purple-950">
                <FileText className="h-3.5 w-3.5 text-purple-700" />
                <span>Documents</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-mono text-purple-950 font-bold px-1.5 py-0.2 rounded bg-white border border-purple-200">
                  {ragDocuments.length}
                </span>
                <button
                  type="button"
                  onClick={() => setShowLeftSidebar(false)}
                  className="text-purple-400 hover:text-purple-600 p-0.5 rounded cursor-pointer"
                  title="Collapse Documents"
                >
                  <PanelLeftClose className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Database Mode: Tables list */}
          {!isRagMode && (
            <>
              <div className="p-1.5 border-b border-slate-100 bg-white">
                <div className="relative">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={e => setTableSearch(e.target.value)}
                    placeholder="Filter tables..."
                    className="w-full pl-6 pr-2 py-1 text-[11px] text-slate-950 font-medium rounded border border-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {filteredTables.map(t => {
                  const isExpanded = expandedTable === t.name;
                  return (
                    <div key={t.name} className="rounded-lg border border-slate-200 bg-white overflow-hidden text-xs">
                      <button
                        onClick={() => setExpandedTable(isExpanded ? null : t.name)}
                        className="w-full flex items-center justify-between p-1.5 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-600 shrink-0"></span>
                          <span className="font-bold text-slate-900 truncate text-xs">{t.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 font-semibold px-1 rounded bg-slate-100">
                          {t.columns?.length || 0}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="p-1.5 pt-0 border-t border-slate-100 bg-slate-50 space-y-0.5">
                          {t.columns?.map(col => (
                            <div
                              key={col.name}
                              onClick={() => setInputQuery(prev => `${prev} ${col.name}`.trim())}
                              title="Click to insert column into prompt"
                              className="flex items-center justify-between text-[11px] text-slate-800 font-medium px-1.5 py-0.5 rounded hover:bg-blue-100 cursor-pointer font-mono"
                            >
                              <span className="truncate">{col.name}</span>
                              <span className="text-[9px] text-slate-400 uppercase">{col.type}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* RAG Mode: Document List */}
          {isRagMode && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                {ragDocuments.length === 0 ? (
                  <div className="p-4 text-center text-[11px] text-slate-400 italic">
                    No documents uploaded yet. Attach a PDF or CSV above to begin.
                  </div>
                ) : (
                  ragDocuments.map(doc => {
                    const isSelected = doc.id === (selectedRagDocId || ragDocuments[0]?.id);
                    return (
                      <div
                        key={doc.id}
                        onClick={() => onSelectRagDocId && onSelectRagDocId(doc.id)}
                        className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50/70 text-purple-950 font-semibold shadow-2xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-bold text-[11px]">{doc.filename}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete ${doc.filename}?`)) onDeleteRagDocument(doc.id);
                            }}
                            className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer"
                            title="Delete file"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                          <span>{doc.pageCount ? `${doc.pageCount} pages` : `${doc.rowCount || 0} rows`}</span>
                          <span>{Math.round((doc.sizeBytes || 0) / 1024)} KB</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ========================================================================= */}
      {/* 2. CENTER STAGE: Query Command Bar + Main Analytics Studio (Flex-1) */}
      {/* ========================================================================= */}
      <section className="flex-1 min-w-0 flex flex-col gap-2 overflow-hidden">
        {/* Top Query Command Bar */}
        <div className="rounded-xl border border-slate-200 bg-white p-2 shadow-2xs space-y-1.5 shrink-0">
          {/* Active File Pill in RAG mode */}
          {isRagMode && activeRagDoc && (
            <div className="flex items-center justify-between px-2 py-0.5 rounded-md bg-purple-50 border border-purple-200 text-[11px] font-bold text-purple-950">
              <div className="flex items-center gap-1.5 truncate">
                <FileCheck className="h-3.5 w-3.5 text-purple-700 shrink-0" />
                <span className="truncate">{activeRagDoc.filename}</span>
                <span className="text-[10px] text-purple-700 font-normal">
                  ({activeRagDoc.pageCount ? `${activeRagDoc.pageCount}p` : `${activeRagDoc.rowCount || 0}r`})
                </span>
              </div>
              <button
                type="button"
                onClick={() => onToggleMode && onToggleMode('db')}
                className="text-purple-700 hover:text-purple-950 text-[10px] font-bold px-1 rounded hover:bg-purple-200 cursor-pointer"
              >
                Switch to DB ✕
              </button>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={inlineFileInputRef}
            onChange={handleAutoFileUpload}
            accept=".pdf,.csv,.xlsx,.txt,.json,.md"
            className="hidden"
          />

          <form
            onSubmit={(e) => { e.preventDefault(); handleExecute(); }}
            className="flex items-center gap-1.5"
          >
            {/* Left Sidebar Toggle Button */}
            {!showLeftSidebar && (
              <button
                type="button"
                onClick={() => setShowLeftSidebar(true)}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer hidden md:flex items-center justify-center shrink-0"
                title="Open Tables / Documents"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            )}

            {/* Attach File Button */}
            <button
              type="button"
              onClick={() => inlineFileInputRef.current?.click()}
              disabled={isUploadingRag || isLoading}
              title="Attach CSV or PDF dataset"
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-colors shrink-0 ${
                isUploadingRag
                  ? 'bg-purple-100 border-purple-300 text-purple-900 animate-pulse'
                  : 'bg-slate-50 hover:bg-slate-100 hover:border-slate-300 text-slate-700 border-slate-200'
              }`}
            >
              {isUploadingRag ? <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-700" /> : <Paperclip className="h-3.5 w-3.5 text-slate-700" />}
              <span className="hidden sm:inline">{isUploadingRag ? 'Uploading...' : 'Attach'}</span>
            </button>

            {/* Input Field */}
            <div className="relative flex-1 flex items-center">
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder={
                  isListening
                    ? 'Listening...'
                    : isRagMode
                    ? (activeRagDoc ? `Ask about ${activeRagDoc.filename}...` : 'Ask about uploaded files...')
                    : 'Ask any question about your data (e.g. top 5 products by revenue)...'
                }
                disabled={isLoading}
                className={`w-full rounded-lg border px-3 py-1.5 text-xs sm:text-sm text-slate-950 font-semibold placeholder-slate-400 focus:outline-none transition-colors ${
                  isListening
                    ? 'border-rose-400 bg-rose-50 ring-1 ring-rose-300'
                    : isRagMode
                    ? 'border-purple-200 bg-purple-50/30 focus:bg-white focus:border-purple-600'
                    : 'border-slate-200 bg-slate-50/70 focus:bg-white focus:border-blue-600'
                }`}
              />
            </div>

            {/* Voice Input Button */}
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={isLoading}
              title={isListening ? 'Stop' : 'Mic'}
              className={`p-1.5 rounded-lg border flex items-center justify-center cursor-pointer transition-colors shrink-0 ${
                isListening
                  ? 'bg-rose-600 border-rose-700 text-white animate-pulse'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
              }`}
            >
              {isListening ? <MicOff className="h-4 w-4 text-white" /> : <Mic className="h-4 w-4" />}
            </button>

            {/* Run Button */}
            <button
              type="submit"
              disabled={isLoading || !inputQuery.trim()}
              className={`inline-flex items-center gap-1 rounded-lg disabled:opacity-40 px-3.5 py-1.5 text-xs font-bold text-white cursor-pointer shadow-xs transition-colors shrink-0 ${
                isRagMode ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{isRagMode ? 'Analyze' : 'Run'}</span>
            </button>

            {/* Right Sidebar Toggle Button */}
            {!showRightSidebar && (
              <button
                type="button"
                onClick={() => setShowRightSidebar(true)}
                className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer hidden lg:flex items-center justify-center shrink-0"
                title="Open Pipeline / History"
              >
                <PanelRightOpen className="h-4 w-4" />
              </button>
            )}
          </form>
        </div>

        {/* Analytics Canvas Main View */}
        <div className="flex-1 min-h-0 rounded-xl border border-slate-200 bg-white shadow-2xs p-3 overflow-y-auto space-y-2.5">
          {isLoading && (
            <div className="p-8 text-center space-y-2">
              <Loader2 className={`h-6 w-6 animate-spin mx-auto ${isRagMode ? 'text-purple-600' : 'text-blue-600'}`} />
              <div className="text-xs font-bold text-slate-900">
                {isRagMode ? 'Scanning Document Passages & Synthesizing Findings...' : 'Executing SQL Query & Synthesizing Results...'}
              </div>
            </div>
          )}

          {error && (
            <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-bold text-rose-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isLoading && !activeRun && (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center max-w-xl mx-auto space-y-4">
              <div className="p-3 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                {isRagMode ? <FileText className="h-6 w-6 text-purple-600" /> : <Terminal className="h-6 w-6 text-blue-600" />}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  {isRagMode ? 'Document Intelligence Ready' : 'DataViz Analyst Studio Ready'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  {isRagMode
                    ? 'Attach any CSV, Excel, or PDF document to start conversational analytics with citations.'
                    : `Query ${schema?.databaseName || 'sales_analytics.sqlite'} directly or select a recommended prompt below.`}
                </p>
              </div>

              {/* Starter Question Chips */}
              {!isRagMode && (
                <div className="w-full space-y-1.5 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recommended Prompts</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-left">
                    {[
                      'Top 5 products by total revenue',
                      'Monthly revenue breakdown for 2025',
                      'Total sales count by customer region',
                      'Highest profit margins by category'
                    ].map((promptText, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleExecute(promptText)}
                        className="p-2 rounded-lg border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-800 hover:text-blue-900 text-xs font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                      >
                        <span className="truncate">{promptText}</span>
                        <ArrowRight className="h-3 w-3 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!isLoading && activeRun && (
            <div className="space-y-2.5 animate-in fade-in duration-100">
              {/* Header with Hyper-Personalization Persona & Real-Time Streaming */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${activeRun.mode === 'rag' ? 'bg-purple-600' : 'bg-emerald-600'}`}></span>
                  <h2 className="text-xs sm:text-sm font-bold text-slate-950">{activeRun.question}</h2>
                </div>

                <div className="flex items-center gap-2">
                  {/* Real-Time Streaming Toggle */}
                  <button
                    type="button"
                    onClick={() => setIsStreaming(s => !s)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer ${
                      isStreaming
                        ? 'bg-emerald-500 text-white border-emerald-600 animate-pulse'
                        : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                    }`}
                    title={isStreaming ? 'Streaming live updates every 12s' : 'Enable real-time continuous data stream'}
                  >
                    <Radio className="h-3 w-3" />
                    <span>{isStreaming ? 'Live Stream Active' : 'Go Live'}</span>
                  </button>

                  {/* Hyper-Personalization: Audience Persona Presets */}
                  <div className="flex items-center gap-0.5 bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setPersona('executive')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        persona === 'executive' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Executive Persona: High-level takeaway, bottom-line ROI, strategic action"
                    >
                      Executive
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersona('analyst')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        persona === 'analyst' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Analyst Persona: Statistical distributions, variance, data hygiene"
                    >
                      Analyst
                    </button>
                    <button
                      type="button"
                      onClick={() => setPersona('product')}
                      className={`px-1.5 py-0.5 rounded cursor-pointer transition-colors ${
                        persona === 'product' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-500 hover:text-slate-800'
                      }`}
                      title="Product Persona: User cohort behavior, engagement, expansion loops"
                    >
                      Growth
                    </button>
                  </div>

                  <div className="flex items-center gap-1 font-mono text-[10px] text-slate-600 font-bold">
                    <span className="px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200">
                      {activeRun.executionTimeMs || activeRun.totalPipelineDurationMs || 0} ms
                    </span>
                  </div>
                </div>
              </div>

              {/* 1. Clarity-First Executive Takeaway */}
              {activeRun.answer && (
                <div className="p-2.5 rounded-lg border border-slate-300 bg-slate-50 text-xs sm:text-sm font-semibold text-slate-950 leading-snug flex items-start gap-2 shadow-2xs">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-blue-600" />
                  <div className="flex-1">
                    <span>{activeRun.answer}</span>
                  </div>
                </div>
              )}

              {/* Hyper-Personalized Role Briefing */}
              {(() => {
                const narration = activeRun.narration || activeRun.analysis?.narration;
                const personaText = narration?.personas?.[persona];
                if (!personaText) return null;
                return (
                  <div className="p-2 rounded-lg bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 flex items-start gap-2">
                    <UserCheck className="h-3.5 w-3.5 text-blue-700 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-blue-700 block">
                        {persona.toUpperCase()} PERSPECTIVE
                      </span>
                      <p className="font-medium text-blue-900 mt-0.5 leading-relaxed">{personaText}</p>
                    </div>
                  </div>
                );
              })()}

              {/* 1b. Headline KPI Cards (Row 1) */}
              {(() => {
                const kpis = activeRun.kpis || activeRun.analysis?.kpis || [];
                if (!kpis || kpis.length === 0) return null;
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {kpis.map((kpi, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-2xs">
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider truncate">{kpi.label}</div>
                        <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate">{kpi.value}</div>
                        {kpi.subvalue && <div className="text-[10px] text-slate-600 font-medium truncate">{kpi.subvalue}</div>}
                        {kpi.change && (
                          <div className={`text-[10px] font-semibold mt-0.5 ${kpi.change.startsWith('+') ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {kpi.change} vs baseline
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* 2. Dynamic Graph / Chart (Rendered only when data requires graphical presentation) */}
              {(() => {
                const recViz = (activeRun.recommended_visualization || activeRun.analysis?.recommended_visualization || '').toLowerCase();
                const isChartEligible = recViz !== 'none' && recViz !== 'table' && recViz !== 'text' && recViz !== '';
                const cData = activeRun.chart_data || activeRun.chartData || activeRun.analysis?.chart_data || activeRun.analysis?.chartData;
                
                // Do not show chart for single-row lookups, table-only data, or when visualization is 'none'
                if (isChartEligible && cData && cData.labels && cData.labels.length > 1) {
                  return (
                    <DynamicChartRenderer
                      chartData={cData}
                      recommendedVisualization={recViz}
                      title={activeRun.question || 'Visual Breakdown'}
                    />
                  );
                }
                return null;
              })()}

              {/* 2b. Advanced Data Storytelling & Strategic Insights */}
              {(() => {
                const narration = activeRun.narration || activeRun.analysis?.narration;
                const rowCount = activeRun.result?.rowCount || activeRun.result?.rows?.length || 0;
                if (!narration || !narration.finding || rowCount <= 1) return null;
                return (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Table2 className="h-3.5 w-3.5 text-slate-700" />
                        <span>Data Storytelling & Strategic Assessment</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        Persona: {persona.charAt(0).toUpperCase() + persona.slice(1)} View
                      </span>
                    </div>

                    {/* The "So What?" Factor Card */}
                    {narration.so_what && (
                      <div className="p-2.5 rounded-lg bg-white border-l-4 border-l-blue-600 border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wide flex items-center gap-1 mb-0.5">
                          <Zap className="h-3 w-3" />
                          Executive "So What?" Factor
                        </span>
                        <p className="text-xs font-semibold text-slate-900 leading-relaxed">{narration.so_what}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block mb-0.5">Key Finding</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{narration.finding}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block mb-0.5">Risk & Anomaly</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{narration.risk}</p>
                      </div>
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block mb-0.5">Actionable Step</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{narration.action}</p>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. Interactive Tabular Result Data Grid */}
              {(() => {
                const rows = activeRun.result?.rows || activeRun.extractedTable?.rows || [];
                const cols = activeRun.result?.columns || activeRun.extractedTable?.columns || [];
                if (rows && rows.length > 0) {
                  return (
                    <SqlResultTable
                      columns={cols}
                      rows={rows}
                      rowCount={activeRun.result?.rowCount || rows.length}
                      executionTimeMs={activeRun.result?.executionTimeMs || activeRun.executionTimeMs || 0}
                      source={activeRun.result?.source || 'Query Result'}
                    />
                  );
                }
                return null;
              })()}

              {/* 4. Executed SQL Query */}
              {activeRun.sql && (
                <div className="rounded-lg border border-slate-800 overflow-hidden bg-slate-950 shadow-xs">
                  <div className="flex items-center justify-between px-3 py-1 bg-slate-900 border-b border-slate-800 text-xs font-mono text-slate-200">
                    <div className="flex items-center gap-1.5 font-bold text-slate-200">
                      <Code2 className="h-3.5 w-3.5 text-blue-400" />
                      <span>Executed SQL Query</span>
                    </div>
                    <button
                      onClick={() => handleCopySql(activeRun.sql)}
                      className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-[10px] text-white font-bold cursor-pointer transition-colors"
                    >
                      {copiedSql ? 'Copied!' : 'Copy SQL'}
                    </button>
                  </div>

                  <pre className="p-2.5 font-mono text-xs text-cyan-300 font-medium overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {activeRun.sql}
                  </pre>
                </div>
              )}

              {/* 5. Document Citations & Passages (RAG Mode) */}
              {activeRun.mode === 'rag' && activeRun.citations && activeRun.citations.length > 0 && (
                <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 space-y-1.5 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-purple-950 text-xs">
                    <FileCheck className="h-3.5 w-3.5 text-purple-700" />
                    <span>Document Citations & Provenance</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeRun.citations.map((cite, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-purple-200 text-purple-900 font-medium text-[11px]"
                      >
                        <BookOpen className="h-3 w-3 text-purple-600" />
                        {cite}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. RIGHT PANE: Compact Pipeline & History (Collapsible) */}
      {/* ========================================================================= */}
      {showRightSidebar && (
        <aside className="w-56 shrink-0 bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col overflow-hidden hidden lg:flex transition-all">
          {/* Pipeline Header */}
          <div className={`p-2 border-b border-slate-100 flex items-center justify-between ${isRagMode ? 'bg-purple-50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <Layers className={`h-3.5 w-3.5 ${isRagMode ? 'text-purple-700' : 'text-blue-700'}`} />
              <span>{isRagMode ? 'RAG Pipeline' : 'SQL Pipeline'}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${isRagMode ? 'bg-purple-100 text-purple-950' : 'bg-emerald-100 text-emerald-950'}`}>
                Active
              </span>
              <button
                type="button"
                onClick={() => setShowRightSidebar(false)}
                className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                title="Collapse Pipeline & History"
              >
                <PanelRightClose className="h-3 w-3" />
              </button>
            </div>
          </div>

        {/* Compact Stages */}
        <div className="p-1.5 border-b border-slate-100 bg-white space-y-1">
          {flowiseStages.map((st) => (
            <div
              key={st.id}
              className="flex items-center gap-1.5 p-1 rounded border border-slate-100 bg-slate-50 text-[11px]"
            >
              <CheckCircle className={`h-3 w-3 shrink-0 ${isRagMode ? 'text-purple-700' : 'text-blue-700'}`} />
              <span className="font-bold text-slate-900 truncate">{st.label}</span>
            </div>
          ))}
        </div>

        {/* History Header */}
        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <History className="h-3.5 w-3.5 text-slate-700" />
            <span>History</span>
          </div>
          <span className="text-[10px] font-mono text-slate-700 font-bold px-1.5 py-0.2 rounded bg-white border border-slate-200">
            {history.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {history.length === 0 ? (
            <div className="p-3 text-center text-[10px] text-slate-400 italic">No runs yet</div>
          ) : (
            history.map((h, i) => (
              <button
                key={h.id || i}
                onClick={() => setActiveRunId(h.id)}
                className={`w-full text-left p-1.5 rounded-lg text-xs transition-colors cursor-pointer border ${
                  activeRunId === h.id
                    ? h.mode === 'rag' ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold' : 'bg-blue-50 border-blue-300 text-blue-950 font-bold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-900'
                }`}
              >
                <div className="truncate text-[11px] font-bold">{h.question}</div>
                <div className="flex items-center justify-between mt-0.5 text-[9px] text-slate-500 font-mono">
                  <span>{h.mode === 'rag' ? 'RAG' : `${h.result?.rowCount || 0}r`}</span>
                  <span>{h.executionTimeMs || h.totalPipelineDurationMs || 0}ms</span>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>
      )}
    </div>
  );
};

export const ChatAnalyst = React.memo(ChatAnalystBase);
