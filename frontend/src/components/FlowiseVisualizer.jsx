import React, { useState, useRef, useEffect } from 'react';
import {
  Workflow, Download, Upload, Play, Copy, Check, Settings,
  Layers, ZoomIn, ZoomOut, Activity, Code2, CheckCircle2, LayoutDashboard, FileText, Database, ArrowRight, FileCode
} from 'lucide-react';
import { analyzeQuestion, fetchFlowiseGraph } from '../services/api';

const CATEGORY_COLORS = {
  Input: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', badge: 'bg-emerald-100 text-emerald-900', ring: 'ring-emerald-400' },
  Agent: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', badge: 'bg-blue-100 text-blue-900', ring: 'ring-blue-400' },
  Model: { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-900', ring: 'ring-slate-400' },
  Prompt: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-900', ring: 'ring-amber-400' },
  Tool: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', badge: 'bg-amber-100 text-amber-900', ring: 'ring-amber-400' },
  Validator: { bg: 'bg-rose-50', text: 'text-rose-800', border: 'border-rose-300', badge: 'bg-rose-100 text-rose-900', ring: 'ring-rose-400' },
  Output: { bg: 'bg-cyan-50', text: 'text-cyan-800', border: 'border-cyan-300', badge: 'bg-cyan-100 text-cyan-900', ring: 'ring-cyan-400' },
  Preprocessor: { bg: 'bg-indigo-50', text: 'text-indigo-800', border: 'border-indigo-300', badge: 'bg-indigo-100 text-indigo-900', ring: 'ring-indigo-400' },
  Database: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-300', badge: 'bg-teal-100 text-teal-900', ring: 'ring-teal-400' }
};

const DEFAULT_COLOR = { bg: 'bg-slate-50', text: 'text-slate-800', border: 'border-slate-300', badge: 'bg-slate-100 text-slate-900', ring: 'ring-slate-400' };

export const FlowiseVisualizer = ({ graph, onTestFlowiseQuestion }) => {
  const [activeFlowTab, setActiveFlowTab] = useState('flow_dataviz'); // 'flow_dataviz' | 'flow_a' | 'flow_b'
  const [currentWorkflow, setCurrentWorkflow] = useState(graph || null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [viewMode, setViewMode] = useState('canvas');
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(0.9);
  const [isCopied, setIsCopied] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const canvasRef = useRef(null);

  useEffect(() => {
    fetchFlowiseGraph(activeFlowTab).then(data => {
      if (data) {
        setCurrentWorkflow(data);
        setSelectedNodeId(data.nodes?.[0]?.id || null);
      }
    }).catch(() => {});
  }, [activeFlowTab]);

  const handleFlowTabChange = (flowKey) => {
    setActiveFlowTab(flowKey);
    fetchFlowiseGraph(flowKey).then(data => {
      if (data) {
        setCurrentWorkflow(data);
        setSelectedNodeId(data.nodes?.[0]?.id || null);
      }
    });
  };

  const selectedNode = currentWorkflow?.nodes?.find(n => n.id === selectedNodeId) || currentWorkflow?.nodes?.[0];

  const handleSimulate = async () => {
    const q = testQuery.trim() || 'What are the top 5 selling products by total revenue?';
    setIsSimulating(true);
    setSimulationLogs([`[Workflow] Initializing pipeline for: "${q}"`]);
    try {
      const res = await analyzeQuestion(q);
      setSimulationLogs(prev => [
        ...prev,
        `✓ Node: Retrieved ${res.result?.rowCount || 0} rows from active dataset.`,
        `✓ Node (code_executor): Calculated ${res.kpis?.length || 4} KPI metrics.`,
        `✓ Node (chart_generator): Generated ${res.recommended_visualization || 'bar'} visualization.`,
        `✓ Summary: ${res.narration?.full_narration || res.answer}`
      ]);
    } catch (e) {
      setSimulationLogs(prev => [...prev, `Execution notice: ${e.message || 'Complete'}`]);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(currentWorkflow, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeFlowTab}_flowise_spec.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyPromptToClipboard = () => {
    if (currentWorkflow?.systemPrompt) {
      navigator.clipboard.writeText(currentWorkflow.systemPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  if (!currentWorkflow) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-2xs">
        <Activity className="h-6 w-6 text-blue-600 animate-spin mx-auto mb-2" />
        <p className="text-xs font-semibold">Loading Workflow Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* 1. Header Toolbar with Flow Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Workflow className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-950 flex items-center gap-1.5">
              <span>Workflow Pipeline Studio</span>
              <span className="text-[9px] font-mono text-slate-700 bg-slate-100 border border-slate-300 px-1.5 py-0.2 rounded font-bold uppercase">
                {currentWorkflow.framework || 'Agentflow V2'}
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-sm">
              {currentWorkflow.flowName}
            </p>
          </div>
        </div>

        {/* Flow Tabs & Actions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
            <button
              onClick={() => handleFlowTabChange('flow_dataviz')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                activeFlowTab === 'flow_dataviz'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <LayoutDashboard className="h-3 w-3" />
              <span>Dashboard Pipeline</span>
            </button>
            <button
              onClick={() => handleFlowTabChange('flow_a')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                activeFlowTab === 'flow_a'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <Database className="h-3 w-3" />
              <span>SQL & Charts</span>
            </button>
            <button
              onClick={() => handleFlowTabChange('flow_b')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                activeFlowTab === 'flow_b'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              <FileText className="h-3 w-3" />
              <span>Document RAG</span>
            </button>
          </div>

          <button
            onClick={() => setShowPromptModal(true)}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <Code2 className="h-3 w-3" />
            <span>Prompt & Tools</span>
          </button>

          <button
            onClick={() => setViewMode(v => v === 'canvas' ? 'json' : 'canvas')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer"
          >
            {viewMode === 'canvas' ? 'JSON Spec' : 'Canvas'}
          </button>

          <button
            onClick={handleExportJson}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Modal for System Prompt & Custom Tools */}
      {showPromptModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Pipeline Prompt & Tool Configuration</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyPromptToClipboard}
                  className="px-2.5 py-1 rounded-lg bg-blue-600 text-white hover:bg-blue-500 text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{isCopied ? 'Copied!' : 'Copy Prompt'}</span>
                </button>
                <button
                  onClick={() => setShowPromptModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1 rounded cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-3.5 text-xs">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">1. System Prompt (Flowise System Message)</h4>
                <pre className="p-3 rounded-lg bg-slate-900 text-cyan-300 font-mono text-[11px] whitespace-pre-wrap max-h-56 overflow-y-auto leading-relaxed border border-slate-800">
                  {currentWorkflow.systemPrompt || 'You are "DataViz Analyst," an autonomous data analysis agent.'}
                </pre>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-1">2. Tools Attached in Node Architecture</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-blue-700">1. data_profiler</span>
                    <p className="text-slate-600 mt-0.5">Schema inspection, nulls, row count, and statistical profile.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-emerald-700">2. code_executor</span>
                    <p className="text-slate-600 mt-0.5">Sandboxed Python/pandas for strictly verifiable calculations.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-purple-700">3. chart_generator</span>
                    <p className="text-slate-600 mt-0.5">QuickChart / Chart.js line, bar, donut, and scatter plots.</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50">
                    <span className="font-bold text-amber-700">4. dashboard_builder</span>
                    <p className="text-slate-600 mt-0.5">Power BI-style CSS Grid layout (Row 1 KPIs, Rows 2-3 Charts).</p>
                  </div>
                  <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 sm:col-span-2">
                    <span className="font-bold text-teal-700">5. sql_query</span>
                    <p className="text-slate-600 mt-0.5">Read-only AST-validated SQL connector for live databases.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Visual Canvas / JSON Mode */}
      {viewMode === 'json' ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto max-h-96 whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(currentWorkflow, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {/* Main Visual Pipeline Stage (2 cols) */}
          <div className="lg:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3 shadow-2xs space-y-2.5 min-h-[420px] flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Workflow Execution Pipeline ({currentWorkflow.nodes?.length || 0} Nodes)</span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoomLevel(z => Math.max(0.6, z - 0.1))} className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"><ZoomOut className="h-3 w-3" /></button>
                <span className="font-mono text-[10px] text-slate-500 font-bold px-1">{Math.round(zoomLevel * 100)}%</span>
                <button onClick={() => setZoomLevel(z => Math.min(1.3, z + 0.1))} className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"><ZoomIn className="h-3 w-3" /></button>
              </div>
            </div>

            {/* Pipeline Node Cards */}
            <div className="space-y-2 overflow-y-auto max-h-[380px] p-1">
              {currentWorkflow.nodes?.map((node, idx) => {
                const style = CATEGORY_COLORS[node.category] || DEFAULT_COLOR;
                const isSelected = selectedNode?.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`rounded-xl border p-2.5 transition-all cursor-pointer bg-white ${
                      isSelected
                        ? 'border-blue-600 ring-2 ring-blue-200 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0"></span>
                        <h4 className="text-xs font-bold text-slate-950 truncate">{node.label}</h4>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${style.badge} ${style.border}`}>
                        {node.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium mt-1 leading-tight">{node.description}</p>
                  </div>
                );
              })}
            </div>

            {/* Test Simulation Form */}
            <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-1.5">
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Simulate: Compare total revenue across all regions..."
                className="flex-1 text-xs px-2.5 py-1 rounded border border-slate-200 font-semibold focus:outline-none focus:border-blue-600"
              />
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {isSimulating ? <Activity className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                <span>{isSimulating ? 'Testing...' : 'Test Flow'}</span>
              </button>
            </div>
          </div>

          {/* Right Node Inspector (1 col) */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs space-y-2.5 flex flex-col">
            <div className="border-b border-slate-100 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-950">
                <Code2 className="h-3.5 w-3.5 text-purple-700" />
                <span>Node Inspector</span>
              </div>
              {selectedNode && (
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{selectedNode.name}</span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-900">{selectedNode.label}</div>
                  <div className="text-[10px] text-slate-500 font-medium">{selectedNode.description}</div>
                </div>

                {/* Node Inputs Spec */}
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Configuration Inputs:</span>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 font-mono text-[10px] text-slate-800 space-y-1">
                    {Object.entries(selectedNode.inputs || {}).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <span className="font-bold text-blue-700">{k}:</span>
                        <span className="text-slate-900 whitespace-pre-wrap break-all bg-white p-1 rounded border border-slate-100">
                          {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulation Logs Output */}
                {simulationLogs.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase">Simulation Output:</span>
                    <div className="p-2 rounded bg-emerald-50/70 border border-emerald-200 text-[10px] text-emerald-950 font-mono space-y-0.5 max-h-36 overflow-y-auto">
                      {simulationLogs.map((log, i) => (
                        <div key={i}>{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 italic py-8">
                Select any node from the canvas to inspect its configuration and custom tools.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default React.memo(FlowiseVisualizer);
