import React, { useState, useMemo, useEffect } from 'react';
import {
  ReactFlow, MiniMap, Controls, Background, BackgroundVariant,
  useNodesState, useEdgesState, MarkerType, Handle, Position
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Database, Table as TableIcon, Key, Link as LinkIcon, Search,
  Code2, Layers, ArrowRight, Columns, X
} from 'lucide-react';

const CustomTableNode = ({ data }) => {
  const { tableName, description, rowCount, columns, isSelected, isMatch, hasSearchQuery, onSelectTable } = data;
  const isDimmed = hasSearchQuery && !isMatch;

  return (
    <div
      onClick={() => onSelectTable(tableName)}
      className={`w-72 rounded-xl border bg-white shadow-xs transition-all text-xs select-none overflow-hidden cursor-pointer ${
        isDimmed ? 'opacity-30' : 'opacity-100'
      } ${isSelected ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
    >
      <Handle type="target" position={Position.Left} id="left" className="!w-2 !h-2 !bg-blue-500 !border-white" />
      <Handle type="source" position={Position.Right} id="right" className="!w-2 !h-2 !bg-blue-500 !border-white" />

      <div className={`px-3.5 py-2.5 flex items-center justify-between border-b ${isSelected ? 'bg-blue-600 text-white border-blue-700' : 'bg-slate-900 text-white border-slate-800'}`}>
        <div className="flex items-center gap-2 truncate">
          <TableIcon className="h-3.5 w-3.5 shrink-0 text-blue-300" />
          <span className="font-mono font-bold text-xs truncate">{tableName}</span>
        </div>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{rowCount} rows</span>
      </div>

      <div className="px-3.5 py-1.5 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 truncate font-sans">{description}</div>

      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
        {(columns || []).map((col) => (
          <div key={col.name} className="px-3.5 py-1.5 flex items-center justify-between hover:bg-slate-50">
            <div className="flex items-center gap-1.5 truncate">
              {col.isPrimaryKey && <Key className="h-2.5 w-2.5 text-amber-500 shrink-0" />}
              {col.isForeignKey && <LinkIcon className="h-2.5 w-2.5 text-blue-500 shrink-0" />}
              <span className="font-mono text-[11px] text-slate-700 truncate">{col.name}</span>
            </div>
            <span className="font-mono text-[10px] text-slate-400 shrink-0">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = { tableNode: CustomTableNode };

export const DatabaseExplorer = ({ schema, onSelectSqlConsole }) => {
  const [selectedTableName, setSelectedTableName] = useState('sales');
  const [searchTerm, setSearchTerm] = useState('');

  const tables = schema?.tables || [];
  const selectedTable = tables.find(t => t.name === selectedTableName) || tables[0];

  const layoutPositions = {
    sales: { x: 420, y: 160 },
    products: { x: 50, y: 40 },
    customers: { x: 50, y: 320 },
    regions: { x: 790, y: 220 }
  };

  const initialNodes = useMemo(() => {
    return tables.map(t => {
      const pos = layoutPositions[t.name] || { x: 100, y: 100 };
      const isMatch = !searchTerm || t.name.toLowerCase().includes(searchTerm.toLowerCase()) || t.columns.some(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
      return {
        id: t.name,
        type: 'tableNode',
        position: pos,
        data: {
          tableName: t.name,
          description: t.description,
          rowCount: t.rowCount,
          columns: t.columns,
          primaryKey: t.primaryKey,
          isSelected: t.name === selectedTableName,
          isMatch,
          hasSearchQuery: Boolean(searchTerm),
          onSelectTable: (name) => setSelectedTableName(name)
        }
      };
    });
  }, [tables, selectedTableName, searchTerm]);

  const initialEdges = useMemo(() => {
    const edges = [];
    tables.forEach(t => {
      (t.foreignKeys || []).forEach(fk => {
        edges.push({
          id: `e_${t.name}_${fk.targetTable}`,
          source: t.name,
          target: fk.targetTable,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#3b82f6', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }
        });
      });
    });
    return edges;
  }, [tables]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <div className="space-y-4">
      {/* 1. Top Controls */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
            <Database className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>Relational Schema Explorer</span>
              <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                MySQL 8.0 DDL
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">{schema?.databaseName || 'retail_sales_db'} · {tables.length} tables · 4 Foreign Keys</p>
          </div>
        </div>

        <div className="relative w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search tables or columns..."
            className="w-full pl-9 pr-8 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Interactive ReactFlow Canvas + Details Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas (3 cols) */}
        <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-slate-50/50 shadow-sm relative h-[600px] overflow-hidden">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.5}
            maxZoom={1.5}
          >
            <Background color="#cbd5e1" gap={16} variant={BackgroundVariant.Dots} />
            <Controls className="!bg-white !border-slate-200 !rounded-xl !shadow-xs" />
            <MiniMap className="!bg-white !border-slate-200 !rounded-xl !shadow-xs" nodeColor="#3b82f6" />
          </ReactFlow>
        </div>

        {/* Selected Table Inspector (1 col) */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4 h-[600px] overflow-y-auto">
          {selectedTable ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-blue-600" />
                  <h3 className="text-sm font-bold text-slate-900 font-mono">{selectedTable.name}</h3>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedTable.description}</p>
                <div className="mt-2 text-[11px] font-mono text-slate-400">Primary Key: <span className="text-slate-700 font-semibold">{selectedTable.primaryKey}</span></div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700">Columns Schema ({selectedTable.columns?.length})</h4>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {selectedTable.columns?.map(col => (
                    <div key={col.name} className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-slate-900">{col.name}</span>
                        <span className="text-[10px] text-slate-400">{col.type}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-tight">{col.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {onSelectSqlConsole && (
                <button
                  onClick={() => onSelectSqlConsole(`SELECT * FROM ${selectedTable.name} LIMIT 10;`)}
                  className="w-full py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Code2 className="h-3.5 w-3.5" />
                  <span>Preview Top 10 Rows</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-10">Select a table node on the canvas to inspect its schema.</p>
          )}
        </div>
      </div>
    </div>
  );
};
