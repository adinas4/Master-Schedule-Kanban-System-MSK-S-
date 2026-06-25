import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Key, RefreshCw, Save } from 'lucide-react';

const TabSettings = ({ apiFetch, user, aiConfigured, aiStatusLoading, refreshAiConfigStatus }) => {
  const isAdmin = user?.role === 'admin';
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [geminiModel, setGeminiModel] = useState('');
  const [modelOptions, setModelOptions] = useState([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsError, setModelsError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showKey, setShowKey] = useState(false);

  const loadSettings = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    setStatusMessage('');
    try {
      const data = await apiFetch('/api/settings/ai');
      setGeminiApiKey(data?.geminiApiKey || '');
      setGeminiModel(data?.geminiModel || '');
    } catch (err) {
      setError(err.message || 'Gagal memuat pengaturan AI.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, isAdmin]);

  const loadModels = useCallback(async () => {
    if (!isAdmin) return;
    setModelsLoading(true);
    setModelsError('');
    try {
      const data = await apiFetch('/api/settings/ai/models');
      const models = Array.isArray(data?.models) ? data.models : [];
      setModelOptions(models);
    } catch (err) {
      setModelOptions([]);
      setModelsError(err.message || 'Gagal memuat daftar model AI.');
    } finally {
      setModelsLoading(false);
    }
  }, [apiFetch, isAdmin]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  const modelDropdownOptions = useMemo(() => {
    const list = Array.isArray(modelOptions) ? [...modelOptions] : [];
    if (geminiModel && !list.find((model) => model.name === geminiModel)) {
      list.unshift({
        name: geminiModel,
        displayName: `${geminiModel} (manual)`,
        description: '',
      });
    }
    return list;
  }, [geminiModel, modelOptions]);

  const handleSave = async (event) => {
    event.preventDefault();
    if (!isAdmin) return;
    setSaving(true);
    setError('');
    setStatusMessage('');
    try {
      await apiFetch('/api/settings/ai', {
        method: 'PUT',
        body: JSON.stringify({ geminiApiKey, geminiModel }),
      });
      setStatusMessage('API Key berhasil disimpan.');
      if (refreshAiConfigStatus) {
        await refreshAiConfigStatus();
      }
    } catch (err) {
      setError(err.message || 'Gagal menyimpan API Key.');
    } finally {
      setSaving(false);
    }
  };

  const handleRefreshStatus = async () => {
    setStatusMessage('');
    if (refreshAiConfigStatus) {
      const configured = await refreshAiConfigStatus();
      setStatusMessage(configured ? 'Status AI: Aktif.' : 'Status AI: Belum dikonfigurasi.');
    }
  };

  const handleChangePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordStatus('');
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Lengkapi password lama, password baru, dan konfirmasi password.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak sama.');
      return;
    }
    setPasswordSaving(true);
    try {
      const result = await apiFetch('/api/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus(result?.message || 'Password berhasil diubah.');
    } catch (err) {
      setPasswordError(err.message || 'Gagal mengubah password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Key size={16} /> Ubah Password
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Ganti password akun Anda sendiri. Password baru minimal 6 karakter.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPasswordFields((prev) => !prev)}
            className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
            title={showPasswordFields ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPasswordFields ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <form onSubmit={handleChangePassword} className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Password Lama</label>
            <input
              type={showPasswordFields ? 'text' : 'password'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={passwordSaving}
              placeholder="Masukkan password lama"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Password Baru</label>
            <input
              type={showPasswordFields ? 'text' : 'password'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={passwordSaving}
              placeholder="Masukkan password baru"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Konfirmasi Password</label>
            <input
              type={showPasswordFields ? 'text' : 'password'}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={passwordSaving}
              placeholder="Ulangi password baru"
            />
          </div>

          {passwordError && (
            <div className="md:col-span-3 rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {passwordError}
            </div>
          )}

          {passwordStatus && (
            <div className="md:col-span-3 rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
              {passwordStatus}
            </div>
          )}

          <div className="md:col-span-3 flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save size={16} />
              {passwordSaving ? 'Menyimpan...' : 'Ubah Password'}
            </button>
          </div>
        </form>
      </div>

      {isAdmin && (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Key size={16} /> Pengaturan AI
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Simpan API Key Gemini hanya sekali. Hanya Super Admin yang bisa mengubahnya.
            </div>
          </div>
          <div className="text-xs">
            <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 ${
              aiStatusLoading ? 'bg-slate-100 text-slate-500' : (aiConfigured ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700')
            }`}
            >
              {aiStatusLoading ? 'Memeriksa...' : (aiConfigured ? 'AI Aktif' : 'Belum Diisi')}
            </span>
          </div>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Gemini API Key</label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Tempel API Key Gemini di sini"
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                disabled={loading || saving}
              />
              <button
                type="button"
                onClick={() => setShowKey((prev) => !prev)}
                className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                title={showKey ? 'Sembunyikan' : 'Lihat'}
              >
                {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Kunci ini disimpan aman di database dan tidak tampil di modal AI untuk user biasa.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase">Pilih Model AI</label>
            <div className="flex items-center gap-2">
              <select
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={geminiModel}
                onChange={(e) => setGeminiModel(e.target.value)}
                disabled={loading || saving || modelsLoading}
              >
                {!modelDropdownOptions.length && (
                  <option value="">Muat daftar model terlebih dulu</option>
                )}
                {modelDropdownOptions.map((model) => (
                  <option key={model.name} value={model.name}>
                    {model.displayName || model.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadModels}
                disabled={modelsLoading || saving}
                className="px-3 py-2 border rounded-lg text-slate-600 hover:bg-slate-50"
                title="Muat daftar model"
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div className="text-[11px] text-slate-500 mt-2">
              Hanya menampilkan model yang mendukung generateContent.
            </div>
            {modelsError && (
              <div className="mt-2 text-[11px] text-rose-600">{modelsError}</div>
            )}
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs text-emerald-700">
              {statusMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
            >
              <Save size={16} />
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
            <button
              type="button"
              onClick={loadSettings}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              {loading ? 'Memuat...' : 'Muat Ulang'}
            </button>
            <button
              type="button"
              onClick={handleRefreshStatus}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={16} />
              Cek Status AI
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
};

export default TabSettings;
