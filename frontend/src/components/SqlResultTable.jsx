import React, { useState, useMemo } from 'react';
import { FileDown, Search, ArrowUpDown, ArrowUp, ArrowDown, Database, ChevronLeft, ChevronRight } from 'lucide-react';

const SqlResultTableBase = ({
  columns = [],
  rows = [],
  rowCount = 0,
  executionTimeMs = 0,
  source = ''
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Dynamically ensure clean columns matching the actual row keys
  const activeColumns = useMemo(() => {
    if (columns && Array.isArray(columns) && columns.length > 0) {
      const cleanCols = columns.filter(c => c && typeof c === 'string' && c.trim().length > 0);
      if (cleanCols.length > 0) return cleanCols;
    }
    if (rows && Array.isArray(rows) && rows.length > 0) {
      const firstRow = rows[0];
      if (firstRow && typeof firstRow === 'object' && !Array.isArray(firstRow)) {
        return Object.keys(firstRow);
      }
    }
    return [];
  }, [columns, rows]);

  // Robust cell value extractor supporting object keys, arrays, and case-insensitive fallbacks
  const getCellValue = (row, col) => {
    if (!row) return null;
    if (Array.isArray(row)) {
      const idx = activeColumns.indexOf(col);
      return idx >= 0 ? row[idx] : null;
    }
    if (row[col] !== undefined) return row[col];
    // Case-insensitive fallback
    const lowerCol = String(col).toLowerCase();
    const matchKey = Object.keys(row).find(k => k.toLowerCase() === lowerCol);
    if (matchKey && row[matchKey] !== undefined) return row[matchKey];
    return null;
  };

  const filteredRows = useMemo(() => {
    let list = Array.isArray(rows) ? [...rows] : [];
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(row => {
        if (!row) return false;
        if (typeof row === 'object') {
          return Object.values(row).some(v => String(v ?? '').toLowerCase().includes(q));
        }
        return String(row).toLowerCase().includes(q);
      });
    }
    if (sortCol) {
      list.sort((a, b) => {
        const valA = getCellValue(a, sortCol);
        const valB = getCellValue(b, sortCol);
        if (valA === valB) return 0;
        if (valA === null || valA === undefined) return 1;
        if (valB === null || valB === undefined) return -1;
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDir === 'asc' ? valA - valB : valB - valA;
        }
        return sortDir === 'asc' ? String(valA).localeCompare(String(valB)) : String(valB).localeCompare(String(valA));
      });
    }
    return list;
  }, [rows, searchTerm, sortCol, sortDir, activeColumns]);

  const totalPages = Math.ceil(filteredRows.length / pageSize) || 1;
  const paginatedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);

  const handleSort = (col) => {
    if (sortCol === col) {
      if (sortDir === 'asc') setSortDir('desc');
      else { setSortCol(null); setSortDir('asc'); }
    } else {
      setSortCol(col);
      setSortDir('asc');
    }
    setPage(1);
  };

  const handleDownloadCsv = () => {
    if (!rows || rows.length === 0 || activeColumns.length === 0) return;
    const headerLine = activeColumns.join(',');
    const rowLines = rows.map(r => activeColumns.map(c => `"${String(getCellValue(r, c) ?? '').replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[headerLine, ...rowLines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dataset_export_${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCellValue = (key, val) => {
    if (val === null || val === undefined) return <span className="text-slate-400 font-mono text-xs italic">null</span>;
    if (typeof val === 'number') {
      const lowerKey = String(key || '').toLowerCase();
      if (lowerKey.includes('revenue') || lowerKey.includes('profit') || lowerKey.includes('price') || lowerKey.includes('cost') || lowerKey.includes('amount') || lowerKey.includes('sales')) {
        return <span className="font-mono tabular-nums font-bold text-slate-950">₹{val.toLocaleString('en-IN')}</span>;
      }
      return <span className="font-mono tabular-nums font-semibold text-slate-950">{val.toLocaleString('en-US')}</span>;
    }
    return <span className="text-slate-950 font-semibold">{String(val)}</span>;
  };

  const inferColumnType = (colName) => {
    if (!rows || rows.length === 0) return 'TEXT';
    const sampleRow = rows.find(r => getCellValue(r, colName) !== null && getCellValue(r, colName) !== undefined);
    const val = sampleRow ? getCellValue(sampleRow, colName) : null;
    if (typeof val === 'number') {
      return Number.isInteger(val) ? 'INT' : 'NUMERIC';
    }
    if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}/.test(val)) {
      return 'DATE';
    }
    return 'VARCHAR';
  };

  if (activeColumns.length === 0 || !rows || rows.length === 0) {
    return (
      <div className="p-3 text-center text-xs text-slate-600 font-semibold bg-slate-50 rounded-lg border border-slate-200">
        No records returned from this query.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white shadow-2xs overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-2.5 py-1.5 border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-950">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 font-mono text-[11px] font-bold text-slate-900">
            <Database className="h-3 w-3 text-blue-700" />
            <span>{rowCount || rows.length} rows</span>
          </span>
          <span className="text-[11px] font-mono text-slate-500 font-bold">{executionTimeMs} ms</span>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative w-40 sm:w-52">
            <Search className="absolute left-2 top-2 h-3 w-3 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Search table..."
              className="w-full pl-6 pr-2 py-0.5 text-xs text-slate-950 rounded border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:border-blue-600"
            />
          </div>
          <button
            onClick={handleDownloadCsv}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 text-xs font-bold text-slate-900 cursor-pointer shadow-2xs transition-colors"
          >
            <FileDown className="h-3.5 w-3.5 text-blue-700" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Compact Table Grid */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left text-xs data-grid-table border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-950 font-bold border-b border-slate-200">
              <th className="w-10 px-2.5 py-1.5 text-center font-mono text-slate-500 select-none">
                #
              </th>
              {activeColumns.map(col => {
                const colType = inferColumnType(col);
                const isNumeric = colType === 'NUMERIC' || colType === 'INT';

                return (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-2.5 py-1.5 whitespace-nowrap cursor-pointer hover:bg-slate-200/70 select-none text-slate-950 font-bold"
                  >
                    <div className={`flex items-center gap-1.5 ${isNumeric ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-xs text-slate-950">{col}</span>
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white text-blue-900 border border-slate-200 font-bold">
                        {colType}
                      </span>
                      {sortCol === col ? (
                        sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-blue-700" /> : <ArrowDown className="h-3 w-3 text-blue-700" />
                      ) : (
                        <ArrowUpDown className="h-2.5 w-2.5 text-slate-400 opacity-50" />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {paginatedRows.map((row, idx) => {
              const rowNum = (page - 1) * pageSize + idx + 1;
              return (
                <tr key={idx} className="hover:bg-blue-50/50 transition-colors">
                  <td className="px-2.5 py-1.5 text-center font-mono text-[11px] font-semibold text-slate-500 select-none border-r border-slate-100">
                    {rowNum}
                  </td>
                  {activeColumns.map(col => {
                    const colType = inferColumnType(col);
                    const isNumeric = colType === 'NUMERIC' || colType === 'INT';
                    const cellVal = getCellValue(row, col);
                    return (
                      <td key={col} className={`px-2.5 py-1.5 whitespace-nowrap ${isNumeric ? 'text-right' : 'text-left'}`}>
                        {formatCellValue(col, cellVal)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 3. Compact Footer */}
      {filteredRows.length > 0 && (
        <div className="flex items-center justify-between px-2.5 py-1 border-t border-slate-200 bg-slate-50 text-xs text-slate-700 font-semibold">
          <span className="font-mono text-[11px] text-slate-600">
            {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredRows.length)} of {filteredRows.length} rows
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-slate-900">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-1.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-30 cursor-pointer font-bold"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SqlResultTable = React.memo(SqlResultTableBase);
