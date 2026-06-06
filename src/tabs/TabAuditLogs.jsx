import React, { useEffect, useMemo, useState } from 'react';
import { Search, Filter, User as UserIcon, Calendar, Eye, X } from 'lucide-react';

const PER_PAGE_OPTIONS = [25, 50, 100, 200];

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('id-ID');
};

const prettyJson = (value) => {
  if (!value) return '';
  try {
    return JSON.stringify(value, null, 2);
  } catch (error) {
    return String(value);
  }
};

const normalizeErrorMessage = (message) => {
  const text = String(message || '').trim();
  if (!text) return 'Gagal memuat audit logs.';
  if (text.includes('Cannot GET') || /<!doctype html>/i.test(text) || /<html/i.test(text)) {
    return 'Endpoint audit logs belum tersedia. Pastikan backend sudah restart.';
  }
  return text;
};

const TabAuditLogs = ({ apiFetch, user, showToastMessage }) => {
  const isAdmin = user?.role === 'admin';
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filters, setFilters] = useState({ q: '', start: '', end: '', userId: '' });
  const [applied, setApplied] = useState({ q: '', start: '', end: '', userId: '' });
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailRow, setDetailRow] = useState(null);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const rows = await apiFetch('/api/users');
        if (!active) return;
        const normalized = Array.isArray(rows) ? rows.map((row) => ({
          id: row.id,
          username: row.username,
          role: row.role,
        })) : [];
        setUsers(normalized);
      } catch (err) {
        if (!active) return;
        setUsers([]);
        if (showToastMessage) {
          showToastMessage('Gagal memuat daftar user.', '', null, 'error');
        }
      } finally {
        if (active) setUsersLoading(false);
      }
    };
    loadUsers();
    return () => { active = false; };
  }, [apiFetch, isAdmin, showToastMessage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / perPage)), [total, perPage]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    let active = true;
    const loadLogs = async () => {
      setLoading(true);
      setError('');
      const params = new URLSearchParams();
      if (applied.q) params.set('q', applied.q);
      if (applied.start) params.set('start', applied.start);
      if (applied.end) params.set('end', applied.end);
      if (applied.userId) params.set('userId', applied.userId);
      params.set('includeTotal', '1');
      params.set('limit', String(perPage));
      params.set('offset', String((page - 1) * perPage));
      try {
        const data = await apiFetch(`/api/audit-logs?${params.toString()}`);
        if (!active) return;
        const rows = Array.isArray(data) ? data : (data?.rows || []);
        setLogs(rows);
        setTotal(Number(data?.total ?? rows.length ?? 0));
      } catch (err) {
        if (!active) return;
        setLogs([]);
        setTotal(0);
        setError(normalizeErrorMessage(err?.message));
      } finally {
        if (active) setLoading(false);
      }
    };
    loadLogs();
    return () => { active = false; };
  }, [apiFetch, isAdmin, applied, page, perPage]);

  const handleApply = () => {
    setPage(1);
    setApplied({
      q: String(filters.q || '').trim(),
      start: filters.start || '',
      end: filters.end || '',
      userId: filters.userId || '',
    });
  };

  const handleReset = () => {
    setFilters({ q: '', start: '', end: '', userId: '' });
    setApplied({ q: '', start: '', end: '', userId: '' });
    setPage(1);
  };

  const openDetail = (row) => {
    setDetailRow(row);
    setDetailOpen(true);
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailRow(null);
  };

  if (!isAdmin) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
        Akses Audit Logs hanya untuk Admin.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold text-slate-900">Audit Trail</div>
            <div className="text-xs text-slate-500">Riwayat perubahan data dari semua modul.</div>
          </div>
          <div className="text-xs text-slate-500">Total: {total}</div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
              placeholder="Cari table, action, user, record id..."
              value={filters.q}
              onChange={(e) => setFilters((prev) => ({ ...prev, q: e.target.value }))}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
              value={filters.start}
              onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="date"
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
              value={filters.end}
              onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
            />
          </div>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <select
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
              value={filters.userId}
              onChange={(e) => setFilters((prev) => ({ ...prev, userId: e.target.value }))}
              disabled={usersLoading}
            >
              <option value="">Semua User</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm text-white"
            >
              <Filter size={14} /> Terapkan
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            Menampilkan {logs.length} dari {total} data
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Per halaman</span>
            <select
              className="rounded border border-slate-200 px-2 py-1"
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {PER_PAGE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase tracking-wide">
              <tr>
                <th className="p-3 text-left">Tanggal</th>
                <th className="p-3 text-left">User</th>
                <th className="p-3 text-left">Action</th>
                <th className="p-3 text-left">Table</th>
                <th className="p-3 text-left">Record ID</th>
                <th className="p-3 text-left">Detail</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400">Memuat data...</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-rose-600">{error}</td>
                </tr>
              )}
              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400">Tidak ada audit log.</td>
                </tr>
              )}
              {!loading && !error && logs.map((row) => (
                <tr key={row.id} className="border-t border-slate-200">
                  <td className="p-3 text-slate-700">{formatDateTime(row.created_at)}</td>
                  <td className="p-3 text-slate-700">{row.username || row.user_id || '-'}</td>
                  <td className="p-3 text-slate-700">{row.action || '-'}</td>
                  <td className="p-3 text-slate-700">{row.table_name || '-'}</td>
                  <td className="p-3 text-slate-700">{row.record_id ?? '-'}</td>
                  <td className="p-3">
                    <button
                      type="button"
                      onClick={() => openDetail(row)}
                      className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-50"
                    >
                      <Eye size={12} /> Lihat
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <div>Halaman {page} dari {totalPages}</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={page <= 1 || loading}
              className="rounded border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={page >= totalPages || loading}
              className="rounded border border-slate-200 bg-white px-3 py-1 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {detailOpen && detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onClick={closeDetail}>
          <div className="w-full max-w-4xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-lg font-semibold text-slate-900">Detail Audit</div>
                <div className="text-xs text-slate-500">
                  {detailRow.action || '-'} · {detailRow.table_name || '-'} · ID {detailRow.record_id ?? '-'}
                </div>
              </div>
              <button onClick={closeDetail} className="text-slate-500 hover:text-slate-700" title="Tutup">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Data Sebelum</div>
                <pre className="mt-2 max-h-[360px] overflow-auto text-[11px] text-slate-700">
                  {prettyJson(detailRow.old_data) || '-'}
                </pre>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="text-xs font-semibold text-slate-600">Data Sesudah</div>
                <pre className="mt-2 max-h-[360px] overflow-auto text-[11px] text-slate-700">
                  {prettyJson(detailRow.new_data) || '-'}
                </pre>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={closeDetail} className="rounded border border-slate-200 px-4 py-2 text-sm">Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TabAuditLogs;

