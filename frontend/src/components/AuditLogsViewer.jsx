import React, { useState } from 'react';
import { Shield, Trash2, Search, CheckCircle2, AlertCircle } from 'lucide-react';

export const AuditLogsViewer = ({
  logs = [],
  onClearLogs,
  onSelectQuestion
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedLog, setInspectedLog] = useState(null);

  const filteredLogs = logs.filter(l =>
    l.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.generatedSql.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.intent.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Central Agent Audit & Telemetry Log
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time trace logs capturing Question, Intent, PS-SQL schema candidates, generated SQL, AST safety status, latency and answers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onClearLogs}
            disabled={logs.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer shadow-2xs"
          >
            <Trash2 className="h-4 w-4 text-slate-500" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Logs Table Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-slate-500 font-semibold">
            {filteredLogs.length} audit entries recorded
          </span>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search audit trail..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-8 rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none w-48 sm:w-64"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-800">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-xs tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Question</th>
                <th className="py-2.5 px-3">Intent</th>
                <th className="py-2.5 px-3">Schema Tables</th>
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length > 0 ? (
                filteredLogs.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-slate-500 text-xs">
                      {new Date(item.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-3">
                      {item.status === 'SUCCESS' ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs font-semibold border border-rose-200 inline-flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          <span>ERROR</span>
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-900 max-w-xs truncate">
                      {item.question}
                    </td>
                    <td className="py-2.5 px-3 text-purple-700 font-semibold text-xs">{item.intent}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs">
                      {item.selectedTables.join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 text-xs">{item.executionTimeMs}ms</td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setInspectedLog(item)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 cursor-pointer font-sans"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400 text-sm">
                    No transactions recorded yet. Ask a question in Analyst Studio or run benchmarks.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {inspectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Audit Transaction Record</h3>
              </div>
              <button
                onClick={() => setInspectedLog(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2.5 py-1 rounded bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Question</span>
                <div className="text-sm font-medium text-slate-900 mt-1 font-sans">{inspectedLog.question}</div>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Generated MySQL SQL</span>
                <pre className="mt-1 rounded-xl bg-slate-900 p-3.5 text-blue-300 font-mono text-xs overflow-x-auto leading-relaxed">
                  {inspectedLog.generatedSql}
                </pre>
              </div>

              <div>
                <span className="text-[10px] font-semibold text-slate-400 uppercase block">Synthesized Answer</span>
                <div className="text-slate-700 mt-1 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm font-sans leading-relaxed">
                  {inspectedLog.finalAnswer}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
