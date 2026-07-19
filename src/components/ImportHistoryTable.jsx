import React from 'react';
import { RefreshCw } from 'lucide-react';

const formatDateTime = (value) => {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('id-ID');
  } catch {
    return String(value);
  }
};

const statusClassName = (status) => {
  const value = String(status || '').toLowerCase();
  if (value === 'success') return 'bg-emerald-50 text-emerald-700';
  if (value === 'failed') return 'bg-rose-50 text-rose-700';
  return 'bg-amber-50 text-amber-700';
};

export default function ImportHistoryTable({
  title,
  subtitle,
  rows = [],
  loading = false,
  error = '',
  onRefresh,
  noDataMessage = 'Belum ada data import.',
  columns = [],
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </div>
      )}

      <div className="mt-3 overflow-x-auto">
        <table className="min-w-[760px] w-full text-xs">
          <thead className="bg-slate-100 text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`p-2 text-left ${column.className || ''}`.trim()}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={columns.length || 1} className="p-3 text-center text-slate-400">
                  {noDataMessage}
                </td>
              </tr>
            )}
            {rows.map((row, rowIndex) => (
              <tr key={row.id || row.batchId || `${rowIndex}-${row.file_name || row.fileName || 'row'}`} className="border-t">
                {columns.map((column) => {
                  const value = typeof column.render === 'function'
                    ? column.render(row, rowIndex)
                    : row?.[column.key];
                  return (
                    <td key={column.key} className={`p-2 align-top ${column.className || ''}`.trim()}>
                      {value === null || value === undefined || value === ''
                        ? '-'
                        : column.key === 'status'
                          ? (
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClassName(value)}`}>
                              {String(value).toUpperCase()}
                            </span>
                          )
                          : column.key === 'created_at' || column.key === 'finished_at'
                            ? formatDateTime(value)
                            : value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
