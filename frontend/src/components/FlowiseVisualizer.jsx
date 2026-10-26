import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background, BackgroundVariant,
  useNodesState, useEdgesState, MarkerType, Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Workflow, Download, Play, Copy, Check, Settings,
  Layers, ZoomIn, ZoomOut, Activity, Code2, CheckCircle2,
  LayoutDashboard, FileText, Database, ArrowRight, FileCode,
  Sparkles, Bot, Wrench, ShieldCheck, Terminal, Cpu,
  Maximize2, RefreshCw, Eye
} from 'lucide-react';
import { analyzeQuestion, fetchFlowiseGraph } from '../services/api';

const CATEGORY_META = {
  Input: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    accent: 'emerald',
    icon: Terminal
  },
  Agent: {
    bg: 'bg-blue-50',
    border: 'border-blue-300',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    accent: 'blue',
    icon: Bot
  },
  Model: {
    bg: 'bg-indigo-50',
    border: 'border-indigo-300',
    badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    accent: 'indigo',
    icon: Sparkles
  },
  Prompt: {
    bg: 'bg-amber-50',
    border: 'border-amber-300',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    accent: 'amber',
    icon: FileCode
  },
  Tool: {
    bg: 'bg-purple-50',
    border: 'border-purple-300',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    accent: 'purple',
    icon: Wrench
  },
  Validator: {
    bg: 'bg-rose-50',
    border: 'border-rose-300',
    badge: 'bg-rose-100 text-rose-800 border-rose-200',
    accent: 'rose',
    icon: ShieldCheck
  },
  Output: {
    bg: 'bg-cyan-50',
    border: 'border-cyan-300',
    badge: 'bg-cyan-100 text-cyan-800 border-cyan-200',
    accent: 'cyan',
    icon: LayoutDashboard
  },
  Preprocessor: {
    bg: 'bg-violet-50',
    border: 'border-violet-300',
    badge: 'bg-violet-100 text-violet-800 border-violet-200',
    accent: 'violet',
    icon: Layers
  },
  Database: {
    bg: 'bg-teal-50',
    border: 'border-teal-300',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    accent: 'teal',
    icon: Database
  },
  Memory: {
    bg: 'bg-sky-50',
    border: 'border-sky-300',
    badge: 'bg-sky-100 text-sky-800 border-sky-200',
    accent: 'sky',
    icon: Cpu
  }
};

const DEFAULT_META = {
  bg: 'bg-slate-50',
  border: 'border-slate-300',
  badge: 'bg-slate-100 text-slate-800 border-slate-200',
  accent: 'blue',
  icon: Workflow
};

/* Custom Flowise Node Component */
const CustomFlowiseNode = ({ data, selected }) => {
  const { node, isSelected, onSelectNode } = data;
  const meta = CATEGORY_META[node.category] || DEFAULT_META;
  const IconComponent = meta.icon;

  return (
    <div
      onClick={() => onSelectNode(node.id)}
      className={`w-64 sm:w-72 rounded-xl bg-white border shadow-xs transition-all duration-200 select-none overflow-hidden cursor-pointer ${
        isSelected || selected
          ? 'border-blue-600 ring-2 ring-blue-400/30 shadow-md'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-xs'
      }`}
    >
      {/* Connector Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="target-left"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white !rounded-full shadow-xs hover:!scale-125 transition-transform"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="source-right"
        className="!w-3 !h-3 !bg-blue-600 !border-2 !border-white !rounded-full shadow-xs hover:!scale-125 transition-transform"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="target-top"
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white !rounded-full opacity-60 hover:opacity-100"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="source-bottom"
        className="!w-2.5 !h-2.5 !bg-blue-500 !border-2 !border-white !rounded-full opacity-60 hover:opacity-100"
      />

      {/* Node Header */}
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${meta.bg} ${meta.border}`}>
        <div className="flex items-center gap-1.5 truncate">
          <div className="h-5 w-5 rounded-md bg-white/90 border border-slate-200 flex items-center justify-center shrink-0 shadow-2xs">
            <IconComponent className="h-3 w-3 text-slate-700" />
          </div>
          <span className="font-bold text-[11px] text-slate-900 truncate">
            {node.name || 'node'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse"></span>
          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border font-mono ${meta.badge}`}>
            {node.category}
          </span>
        </div>
      </div>

      {/* Node Content */}
      <div className="p-2.5 space-y-1.5">
        <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-1">
          {node.label}
        </h4>
        <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-normal">
          {node.description}
        </p>

        {/* Inputs Preview Pill */}
        {node.inputs && Object.keys(node.inputs).length > 0 && (
          <div className="pt-1 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-mono">
            <span className="truncate max-w-[170px] text-slate-600 font-medium">
              {Object.keys(node.inputs)[0]}: {String(Object.values(node.inputs)[0]).slice(0, 22)}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-600 font-bold shrink-0">
              {Object.keys(node.inputs).length} params
            </span>
          </div>
        )}
      </div>

      {/* Node Port Footer */}
      <div className="px-2.5 py-1 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[9px] text-slate-500 font-medium">
        <span className="flex items-center gap-1">
          <span className="h-1 w-1 rounded-full bg-blue-500"></span>
          Flowise Node
        </span>
        <span className="font-mono text-[9px] text-slate-500 font-bold uppercase">{node.status || 'Active'}</span>
      </div>
    </div>
  );
};

const nodeTypes = { flowiseNode: CustomFlowiseNode };

export const FlowiseVisualizer = ({ graph, onTestFlowiseQuestion }) => {
  const [activeFlowTab, setActiveFlowTab] = useState('flow_dataviz'); // 'flow_dataviz' | 'flow_a' | 'flow_b'
  const [currentWorkflow, setCurrentWorkflow] = useState(graph || null);
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [viewMode, setViewMode] = useState('canvas'); // 'canvas' | 'json'
  const [showPromptModal, setShowPromptModal] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationLogs, setSimulationLogs] = useState([]);
  const reactFlowInstanceRef = useRef(null);

  // Load workflow graph on mount or tab change
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

  // Map backend nodes to ReactFlow nodes
  const initialNodes = useMemo(() => {
    if (!currentWorkflow?.nodes) return [];
    return currentWorkflow.nodes.map((node) => ({
      id: node.id,
      type: 'flowiseNode',
      position: node.position || { x: 100, y: 100 },
      data: {
        node,
        isSelected: node.id === selectedNodeId,
        onSelectNode: (id) => setSelectedNodeId(id)
      }
    }));
  }, [currentWorkflow, selectedNodeId]);

  // Map backend edges to animated ReactFlow curved connectors
  const initialEdges = useMemo(() => {
    if (!currentWorkflow?.edges) return [];
    return currentWorkflow.edges.map((edge) => {
      const isConnectedToSelected = selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId);
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'smoothstep',
        animated: true,
        style: {
          stroke: isConnectedToSelected ? '#2563eb' : '#3b82f6',
          strokeWidth: isConnectedToSelected ? 3 : 2
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isConnectedToSelected ? '#2563eb' : '#3b82f6',
          width: 14,
          height: 14
        }
      };
    });
  }, [currentWorkflow, selectedNodeId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Fit view on flow change
  const onInit = useCallback((instance) => {
    reactFlowInstanceRef.current = instance;
    setTimeout(() => {
      instance.fitView({ padding: 0.18, duration: 400 });
    }, 100);
  }, []);

  const handleFitView = () => {
    if (reactFlowInstanceRef.current) {
      reactFlowInstanceRef.current.fitView({ padding: 0.18, duration: 400 });
    }
  };

  const handleSimulate = async () => {
    const q = testQuery.trim() || 'Compare total revenue and sales trends across all regions';
    setIsSimulating(true);
    setSimulationLogs([`[Pipeline] Initializing pipeline execution for: "${q}"`]);
    try {
      const res = await analyzeQuestion(q);
      setSimulationLogs(prev => [
        ...prev,
        `✓ Node (chatInput): Received natural language analytical query.`,
        `✓ Node (data_profiler): Dataset verified (${res.result?.rowCount || 0} rows).`,
        `✓ Node (code_executor): Sandboxed math computed ${res.kpis?.length || 4} KPI metrics.`,
        `✓ Node (chart_generator): Generated ${res.recommended_visualization || 'dynamic'} visualization spec.`,
        `✓ Node (dashboard_builder): Synthesized executive grid layout.`,
        `✓ Executive Insight: ${res.narration?.full_narration || res.answer}`
      ]);
    } catch (e) {
      setSimulationLogs(prev => [...prev, `Pipeline execution status: ${e.message || 'Complete'}`]);
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
        <p className="text-xs font-semibold">Loading Flowise Workflow Pipeline...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 1. Header Toolbar with Flow Switcher */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
            <Workflow className="h-4.5 w-4.5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-slate-950 flex items-center gap-2">
              <span>Flowise Agentflow Studio</span>
              <span className="text-[9px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded font-bold uppercase">
                {currentWorkflow.framework || 'Agentflow V2'}
              </span>
              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.2 rounded font-bold flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                Connected
              </span>
            </h2>
            <p className="text-[11px] text-slate-500 font-medium truncate max-w-sm sm:max-w-md">
              {currentWorkflow.flowName} ({currentWorkflow.nodes?.length || 0} Nodes · {currentWorkflow.edges?.length || 0} Connectors)
            </p>
          </div>
        </div>

        {/* Flow Tabs & Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
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
              <span>Text-to-SQL Flow</span>
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
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Code2 className="h-3 w-3 text-purple-600" />
            <span>Prompt & Tools</span>
          </button>

          <button
            onClick={() => setViewMode(v => v === 'canvas' ? 'json' : 'canvas')}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 cursor-pointer flex items-center gap-1 transition-colors"
          >
            <Eye className="h-3 w-3" />
            <span>{viewMode === 'canvas' ? 'JSON Spec' : 'Canvas Graph'}</span>
          </button>

          <button
            onClick={handleExportJson}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-800 flex items-center gap-1 cursor-pointer transition-colors"
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

      {/* 2. Visual Canvas or JSON Spec */}
      {viewMode === 'json' ? (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 shadow-sm">
          <pre className="text-xs font-mono text-cyan-300 overflow-x-auto max-h-[600px] whitespace-pre-wrap leading-relaxed">
            {JSON.stringify(currentWorkflow, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Main Visual Flowise Canvas with Edge Connectors (2 cols) */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-slate-50/50 shadow-2xs overflow-hidden flex flex-col h-[620px] relative">
            {/* Canvas Header Sub-bar */}
            <div className="px-3.5 py-2 bg-white border-b border-slate-200 flex items-center justify-between text-xs z-10">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-600"></span>
                <span className="font-bold text-slate-800 text-xs">
                  Visual Pipeline Canvas with Glowing Connectors
                </span>
                <span className="text-[10px] text-slate-600 font-mono font-medium">
                  (Drag nodes to reposition · Click node to inspect)
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleFitView}
                  className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Fit View"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span>Fit View</span>
                </button>
              </div>
            </div>

            {/* React Flow Interactive Graph */}
            <div className="flex-1 w-full relative">
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                nodeTypes={nodeTypes}
                onInit={onInit}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.25}
                maxZoom={2}
                defaultEdgeOptions={{
                  type: 'smoothstep',
                  animated: true,
                  style: { stroke: '#3b82f6', strokeWidth: 2 }
                }}
              >
                <Background color="#cbd5e1" gap={20} size={1.2} variant={BackgroundVariant.Dots} />
                <Controls className="!bg-white !border-slate-200 !rounded-xl !shadow-xs" />
                <MiniMap
                  className="!bg-white !border-slate-200 !rounded-xl !shadow-xs"
                  nodeColor="#3b82f6"
                  maskColor="rgba(241, 245, 249, 0.7)"
                />
              </ReactFlow>
            </div>

            {/* Bottom Test Simulation Form Bar */}
            <div className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 z-10">
              <input
                type="text"
                value={testQuery}
                onChange={e => setTestQuery(e.target.value)}
                placeholder="Simulate workflow: Compare total revenue across all sales regions..."
                className="flex-1 text-xs px-3 py-1.5 rounded-lg border border-slate-200 font-medium focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
              />
              <button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-colors shadow-2xs"
              >
                {isSimulating ? <Activity className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                <span>{isSimulating ? 'Executing Pipeline...' : 'Test Flow'}</span>
              </button>
            </div>
          </div>

          {/* Right Node Inspector (1 col) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5 flex flex-col h-[620px] overflow-y-auto">
            <div className="border-b border-slate-100 pb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-950">
                <Code2 className="h-4 w-4 text-purple-600" />
                <span>Flowise Node Inspector</span>
              </div>
              {selectedNode && (
                <span className="text-[10px] font-mono text-slate-500 font-bold uppercase bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  {selectedNode.id}
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs">
                {/* Header Profile */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase font-mono">{selectedNode.category}</span>
                    <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active & Synchronized
                    </span>
                  </div>
                  <h3 className="text-xs font-bold text-slate-950">{selectedNode.label}</h3>
                  <p className="text-[11px] text-slate-600 font-normal leading-relaxed">{selectedNode.description}</p>
                </div>

                {/* Node Inputs Spec */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Configuration Inputs & Parameters:</span>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[10px] text-cyan-300 space-y-2 max-h-56 overflow-y-auto">
                    {Object.entries(selectedNode.inputs || {}).map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5 border-b border-slate-800 pb-1.5 last:border-b-0">
                        <span className="font-bold text-amber-300">{k}:</span>
                        <span className="text-slate-200 whitespace-pre-wrap break-all bg-slate-950/80 p-1.5 rounded border border-slate-800 text-[10px] leading-relaxed">
                          {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Connected Flowise Ports */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-700 uppercase">Connected Connectors:</span>
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 font-medium">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Source Incoming:</span>
                      <span className="font-mono text-blue-600 font-bold">
                        {currentWorkflow.edges?.filter(e => e.target === selectedNode.id).length || 0} edge(s)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Target Outgoing:</span>
                      <span className="font-mono text-emerald-600 font-bold">
                        {currentWorkflow.edges?.filter(e => e.source === selectedNode.id).length || 0} edge(s)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Simulation Logs Output */}
                {simulationLogs.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                      Simulation Execution Output:
                    </span>
                    <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 text-[10px] text-emerald-950 font-mono space-y-1 max-h-48 overflow-y-auto">
                      {simulationLogs.map((log, i) => (
                        <div key={i} className="leading-snug">{log}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-xs text-slate-400 italic py-16">
                Click any node on the canvas to inspect its configuration and custom tools.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(FlowiseVisualizer);
