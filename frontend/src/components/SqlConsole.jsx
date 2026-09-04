import React, { useState, useEffect } from 'react';
import {
  Terminal,
  Play,
  CheckCircle2,
  AlertTriangle,
  History,
  Trash2,
  Copy,
  Check,
  Code2
} from 'lucide-react';
import { executeDirectSql } from '../services/api';
import { SqlResultTable } from './SqlResultTable.jsx';

const STORAGE_KEY = 'data_analyst_sql_console_history';

const SAMPLE_QUERIES = [
  { label: 'Top Products', sql: 'SELECT product_id, product_name, category, unit_price, total_revenue FROM products ORDER BY total_revenue DESC LIMIT 10;' },
  { label: 'Store Revenues', sql: 'SELECT s.store_name, s.city, SUM(sal.total_amount) AS revenue, COUNT(sal.sale_id) AS orders FROM stores s JOIN sales sal ON s.store_id = sal.store_id GROUP BY s.store_id, s.store_name, s.city ORDER BY revenue DESC;' },
  { label: 'Low Stock Alert', sql: 'SELECT product_name, sku, category, stock_quantity, reorder_level FROM products WHERE stock_quantity <= reorder_level ORDER BY stock_quantity ASC;' },
  { label: 'Monthly Trend', sql: "SELECT DATE_FORMAT(sale_date, '%Y-%m') AS month, SUM(total_amount) AS monthly_revenue, COUNT(*) AS transactions FROM sales GROUP BY month ORDER BY month DESC LIMIT 12;" }
];

export const SqlConsole = ({ initialSql = '' }) => {
  const [sqlInput, setSqlInput] = useState(initialSql || '');
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (initialSql) setSqlInput(initialSql);
  }, [initialSql]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (e) {
      console.warn('Failed to save query history', e);
    }
  }, [history]);

  const handleRun = async (overrideSql) => {
    const queryToRun = (overrideSql ?? sqlInput).trim();
    if (!queryToRun || isExecuting) return;

    if (overrideSql) setSqlInput(overrideSql);

    setIsExecuting(true);
    setError(null);
    const startTime = performance.now();

    try {
      const data = await executeDirectSql(queryToRun);
      const durationMs = Math.round(performance.now() - startTime);
      setResult(data.result);

      const historyEntry = {
        id: `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sql: queryToRun,
        timestamp: Date.now(),
        rowCount: data.result.rowCount,
        durationMs: data.result.executionTimeMs || durationMs,
        status: 'SUCCESS'
      };

      setHistory(prev => [historyEntry, ...prev.filter(item => item.sql.trim() !== queryToRun).slice(0, 49)]);
    } catch (err) {
      const durationMs = Math.round(performance.now() - startTime);
      setError(err.message);
      setResult(null);

      const historyEntry = {
        id: `query_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        sql: queryToRun,
        timestamp: Date.now(),
        durationMs,
        status: 'ERROR'
      };

      setHistory(prev => [historyEntry, ...prev.filter(item => item.sql.trim() !== queryToRun).slice(0, 49)]);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
      {/* Editor & Results */}
      <div className="lg:col-span-2 space-y-4">
        {/* Editor Box */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xs text-white space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
              <Terminal className="h-4 w-4 text-blue-400" />
              <span>SQL Query Editor</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              Read-Only Safe
            </span>
          </div>

          <textarea
            rows={5}
            value={sqlInput}
            onChange={e => setSqlInput(e.target.value)}
            placeholder="Enter read-only analytical SQL query..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-xs text-blue-300 placeholder-slate-500 focus:outline-none focus:border-blue-500 leading-relaxed"
          />

          {/* Quick Queries */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick query:</span>
            {SAMPLE_QUERIES.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSqlInput(sq.sql);
                  handleRun(sq.sql);
                }}
                className="text-[11px] text-slate-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {sq.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400 font-mono">Target: retail_sales_db (MySQL 8.0)</span>
            <div className="flex items-center gap-2">
              {sqlInput && (
                <button
                  onClick={() => setSqlInput('')}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                onClick={() => handleRun()}
                disabled={isExecuting || !sqlInput.trim()}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-40 cursor-pointer"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>{isExecuting ? 'Running...' : 'Execute'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-900">Query Error: </span>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Output Table */}
        {result && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3.5 animate-in fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <span className="text-xs font-bold text-slate-900">Query Results</span>
              <span className="text-xs font-mono text-slate-400">
                {result.rowCount} rows · {result.executionTimeMs}ms
              </span>
            </div>

            <SqlResultTable
              columns={result.columns}
              rows={result.rows}
              rowCount={result.rowCount}
              executionTimeMs={result.executionTimeMs}
              source={result.source}
            />
          </div>
        )}
      </div>

      {/* History Sidebar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
            <History className="h-3.5 w-3.5 text-blue-600" />
            <span>Query History ({history.length})</span>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem(STORAGE_KEY);
              }}
              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
              title="Clear History"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {history.length > 0 ? (
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {history.map((item) => (
              <div
                key={item.id}
                onClick={() => setSqlInput(item.sql)}
                className="p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-blue-200 transition-all cursor-pointer space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span className={item.status === 'SUCCESS' ? 'text-emerald-600' : 'text-rose-600'}>
                    {item.status} {item.rowCount !== undefined && `(${item.rowCount} rows)`}
                  </span>
                  <span>{item.durationMs}ms</span>
                </div>
                <pre className="text-[11px] font-mono text-slate-700 line-clamp-2 whitespace-pre-wrap">
                  {item.sql}
                </pre>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-400">
            No queries in history yet.
          </div>
        )}
      </div>
    </div>
  );
};
