import React from 'react';
import { X } from 'lucide-react';

const countValue = (summary, key) => Number(summary?.[key] || 0);

export default function ImportSummaryModal({
  open,
  title,
  subtitle,
  summary,
  detailRows = [],
  detailColumns = [],
  onClose,
}) {
  if (!open) return null;

  const fileName = String(summary?.fileName || '-').trim() || '-';
  const totalRows = countValue(summary, 'totalRows');
  const inserted = countValue(summary, 'inserted');
  const updated = countValue(summary, 'updated');
  const duplicate = countValue(summary, 'duplicate');
  const skipped = countValue(summary, 'skipped');
  const statusLabel = String(summary?.status || 'success').toLowerCase() === 'failed' ? 'Failed' : 'Success';

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 px-4 py-4 text-xs md:grid-cols-6">
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">File</div>
            <div className="mt-1 font-semibold text-slate-800 break-words">{fileName}</div>
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-slate-500">Rows</div>
            <div className="mt-1 font-semibold text-slate-800">{totalRows}</div>
          </div>
          <div className="rounded-xl bg-emerald-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-emerald-600">Inserted</div>
            <div className="mt-1 font-semibold text-emerald-700">{inserted}</div>
          </div>
          <div className="rounded-xl bg-sky-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-sky-600">Updated</div>
            <div className="mt-1 font-semibold text-sky-700">{updated}</div>
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-amber-600">Duplicate</div>
            <div className="mt-1 font-semibold text-amber-700">{duplicate}</div>
          </div>
          <div className="rounded-xl bg-rose-50 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wide text-rose-600">Skipped</div>
            <div className="mt-1 font-semibold text-rose-700">{skipped}</div>
          </div>
        </div>

        {summary?.message && (
          <div className={`px-4 py-3 text-xs ${statusLabel === 'Failed' ? 'text-rose-700 bg-rose-50' : 'text-emerald-700 bg-emerald-50'}`}>
            {summary.message}
          </div>
        )}

        <div className="max-h-[52vh] overflow-auto p-4">
          <div className="mb-2 text-xs font-semibold text-slate-700">Detail Baris</div>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  {detailColumns.map((column) => (
                    <th key={column.key} className={`p-2 text-left ${column.className || ''}`.trim()}>
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detailRows.length === 0 ? (
                  <tr>
                    <td colSpan={detailColumns.length || 1} className="p-3 text-center text-slate-400">
                      Tidak ada detail tambahan.
                    </td>
                  </tr>
                ) : detailRows.map((row, rowIndex) => (
                  <tr key={`${rowIndex}-${row.rowNumber || row.row || row.uniq || row.code || row.parentCode || row.childCode || 'row'}`} className="border-t">
                    {detailColumns.map((column) => {
                      const value = typeof column.render === 'function'
                        ? column.render(row, rowIndex)
                        : row?.[column.key];
                      return (
                        <td key={column.key} className={`p-2 align-top ${column.className || ''}`.trim()}>
                          {value === null || value === undefined || value === '' ? '-' : value}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-4 py-3">
          <div className="text-xs text-slate-500">
            Status: <span className="font-semibold text-slate-700">{statusLabel}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
