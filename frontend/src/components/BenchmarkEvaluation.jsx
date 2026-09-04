import React, { useState } from 'react';
import {
  Play,
  CheckCircle2,
  XCircle,
  Activity,
  Award,
  Search,
  Code2
} from 'lucide-react';

export const BenchmarkEvaluation = ({
  report,
  isRunning,
  onRunBenchmark,
  onTestSingleQuestion
}) => {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [inspectedTest, setInspectedTest] = useState(null);

  const categories = [
    'ALL',
    'Revenue & Aggregation',
    'Ranking & Extremes',
    'Grouping & Breakdowns',
    'Comparisons',
    'Counting & Volumes',
    'Complex Multi-Table'
  ];

  const filteredResults = (report?.results || []).filter(item => {
    const matchCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchSearch =
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.generatedSql.toLowerCase().includes(searchTerm.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              32+ Benchmark Accuracy Scorecard
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated regression suite testing intent detection, schema linking, AST validity, and execution correctness.
          </p>
        </div>

        <button
          onClick={onRunBenchmark}
          disabled={isRunning}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 cursor-pointer shadow-xs"
        >
          {isRunning ? (
            <>
              <Activity className="h-3.5 w-3.5 animate-spin" />
              <span>Running Suite...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Execute 32 Tests</span>
            </>
          )}
        </button>
      </div>

      {/* Metrics Scorecards */}
      {report && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Overall Accuracy</span>
            <div className="text-xl font-bold font-mono text-emerald-600">
              {report.overallAccuracyPct}%
            </div>
            <span className="text-[10px] text-slate-400 block">{report.passedCount}/{report.totalTests} Passed</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Intent Accuracy</span>
            <div className="text-xl font-bold font-mono text-blue-600">
              {report.intentAccuracyPct}%
            </div>
            <span className="text-[10px] text-slate-400 block">NLP Intent Match</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Schema Linking</span>
            <div className="text-xl font-bold font-mono text-purple-600">
              {report.schemaLinkingAccuracyPct}%
            </div>
            <span className="text-[10px] text-slate-400 block">PS-SQL Alignment</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">SQL AST Validity</span>
            <div className="text-xl font-bold font-mono text-emerald-600">
              {report.sqlValidityPct}%
            </div>
            <span className="text-[10px] text-slate-400 block">Safety Passed</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Execution Success</span>
            <div className="text-xl font-bold font-mono text-emerald-600">
              {report.executionSuccessPct}%
            </div>
            <span className="text-[10px] text-slate-400 block">MySQL Queries</span>
          </div>

          <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 text-center shadow-2xs space-y-0.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400">Avg Latency</span>
            <div className="text-xl font-bold font-mono text-slate-800">
              {report.avgLatencyMs}ms
            </div>
            <span className="text-[10px] text-slate-400 block">Per Query</span>
          </div>
        </div>
      )}

      {/* Tests Table */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 space-y-3.5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap gap-1">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer transition-colors ${
                  selectedCategory === cat ? 'bg-slate-900 text-white font-semibold' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tests..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="h-7 rounded-lg border border-slate-300 bg-slate-50 pl-8 pr-2.5 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none w-44"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">#</th>
                <th className="py-2 px-3">Status</th>
                <th className="py-2 px-3">Question</th>
                <th className="py-2 px-3">Category</th>
                <th className="py-2 px-3">Latency</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredResults.map(item => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="py-2 px-3 text-slate-400">{item.id}</td>
                  <td className="py-2 px-3">
                    {item.status === 'PASSED' ? (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>PASS</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded font-semibold border border-rose-200">
                        <XCircle className="h-3 w-3" />
                        <span>FAIL</span>
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-900 max-w-xs truncate font-medium">
                    {item.question}
                  </td>
                  <td className="py-2 px-3 font-sans text-slate-500 text-[11px]">{item.category}</td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">{item.executionTimeMs}ms</td>
                  <td className="py-2 px-3 text-right space-x-1 font-sans">
                    <button
                      onClick={() => setInspectedTest(item)}
                      className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-[10px] text-slate-700 cursor-pointer"
                    >
                      View SQL
                    </button>
                    <button
                      onClick={() => onTestSingleQuestion(item.question)}
                      className="px-2 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-[10px] text-blue-700 cursor-pointer font-medium"
                    >
                      Studio
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {inspectedTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">Test #{inspectedTest.id} Inspection</span>
              <button
                onClick={() => setInspectedTest(null)}
                className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5 rounded bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="text-xs space-y-2.5">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Question</span>
                <span className="text-slate-900 font-medium">{inspectedTest.question}</span>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Generated SQL</span>
                <pre className="mt-1 rounded-xl bg-slate-900 p-3 text-blue-300 font-mono text-[11px] overflow-x-auto leading-relaxed">
                  {inspectedTest.generatedSql}
                </pre>
              </div>

              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 block">Answer Summary</span>
                <div className="text-slate-700 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  {inspectedTest.answerSummary}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
