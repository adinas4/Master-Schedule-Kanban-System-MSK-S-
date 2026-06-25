import React, { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
import { createPortal } from 'react-dom';
import {
  CheckCircle, AlertTriangle, Clock, Plus, Save, Trash2, Package, 
  RefreshCw, Download, Printer, Sparkles, MessageSquare, X, Copy, Loader2, 
  Trophy, Star, Split, CalendarDays, Wand2, ArrowRightCircle, Percent, 
  Image as ImageIcon, Upload, CalendarOff, Search, Filter, Users, Edit, Bell,
  FileSpreadsheet, ChevronDown, FileUp, Calendar, Bot, Send, MessageCircle, 
  Minimize2, FileText, Mail, Truck, GitFork, LogOut, Lock, User, Rocket,
  QrCode, BarChart3, ArrowDownUp, MapPin, TrendingDown, TrendingUp, Scissors,
  Play, Pause, Eye, EyeOff, Check, X as XIcon, Coins, ListChecks
} from 'lucide-react';
import logoMatra from './assets/logo-matra.png';
import logoPrl from './assets/kop-mrp.png';
import {
  parseModelCodes,
  joinModelCodes,
  buildModelMap,
  formatModelCodes,
} from './utils/modelUtils';
import { QRCodeCanvas } from 'qrcode.react';
import { useScheduleStore } from './stores/useScheduleStore';

// ⚠️ PENTING: Hapus tanda '//' di bawah ini di komputer Anda agar fitur Excel aktif

const TabDashboard = React.lazy(() => import('./tabs/TabDashboard'));
const TabInbound = React.lazy(() => import('./tabs/TabInbound'));
const TabFifo = React.lazy(() => import('./tabs/TabFifo'));
const TabInventory = React.lazy(() => import('./tabs/TabInventory'));
  const TabPrl = React.lazy(() => import('./tabs/TabPrl'));
const TabMasterRef = React.lazy(() => import('./tabs/TabMasterRef'));
const TabKanban = React.lazy(() => import('./tabs/TabKanban'));
const TabReports = React.lazy(() => import('./tabs/TabReports'));
const TabSubcon = React.lazy(() => import('./tabs/TabSubcon'));
const TabSettings = React.lazy(() => import('./tabs/TabSettings'));
const TabSupplierPortal = React.lazy(() => import('./tabs/TabSupplierPortal'));
const TabAuditLogs = React.lazy(() => import('./tabs/TabAuditLogs'));

const NOTIFICATION_MODULE_OPTIONS = [
  { value: 'all', label: 'Semua Modul' },
  { value: 'BOM', label: 'BOM' },
  { value: 'Kanban', label: 'Kanban' },
  { value: 'Stock Opname', label: 'Stock Opname' },
  { value: 'Inbound', label: 'Inbound' },
  { value: 'Auth', label: 'Auth' },
  { value: 'Master Ref', label: 'Master Ref' },
  { value: 'System', label: 'System' },
  { value: 'Activity', label: 'Activity' },
];

const resolveApiBase = () => {
  const envValue = String(import.meta.env.VITE_API_BASE || '').trim();
  const fallbackHost = typeof window !== 'undefined' && window.location.hostname
    ? window.location.hostname
    : 'localhost';
  const fallbackBase = `http://${fallbackHost}:4000`;
  if (!envValue) return fallbackBase;
  if (/^https?:\/\/(:|$)/i.test(envValue)) return fallbackBase;
  if (/HOST_IP/i.test(envValue)) return fallbackBase;
  return envValue;
};

const API_BASE = resolveApiBase();
if (typeof window !== 'undefined') {
  const envValue = String(import.meta.env.VITE_API_BASE || '').trim();
  if (envValue && envValue !== API_BASE) {
    console.warn(`VITE_API_BASE invalid: "${envValue}". Fallback ke ${API_BASE}`);
  }
}
const API_TIMEOUT_MS = 20000;
const API_HEALTH_INTERVAL_MS = 15000;
const AUTO_LOGOUT_IDLE_MS = 15 * 60 * 1000;
const DEFAULT_RESET_PASSWORD = '123456';
const ADMIN_WHATSAPP_NUMBER = String(import.meta.env.VITE_ADMIN_WHATSAPP_NUMBER || '').replace(/[^\d]/g, '');
const ADMIN_WHATSAPP_MESSAGE = encodeURIComponent('Halo Admin/IT, saya lupa password. Mohon bantu reset password akun saya. Terima kasih.');
const ADMIN_WHATSAPP_LINK = ADMIN_WHATSAPP_NUMBER
  ? `https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${ADMIN_WHATSAPP_MESSAGE}`
  : '';

const pad2 = (value) => String(value).padStart(2, '0');

const formatDateKeyLocal = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
};

const formatMonthKeyLocal = (value) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: formatDateKeyLocal(start),
    end: formatDateKeyLocal(end),
  };
};

const normalizeDuplicateKey = (value) => String(value ?? '').trim().toLowerCase();

const apiRequest = async (path, options = {}, token) => {
  const {
    timeoutMs = API_TIMEOUT_MS,
    signal: externalSignal,
    headers: optionHeaders,
    ...fetchOptions
  } = options || {};
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const isBinaryBody =
    (typeof Blob !== 'undefined' && fetchOptions.body instanceof Blob)
    || (typeof ArrayBuffer !== 'undefined' && fetchOptions.body instanceof ArrayBuffer)
    || (typeof URLSearchParams !== 'undefined' && fetchOptions.body instanceof URLSearchParams)
    || (typeof ReadableStream !== 'undefined' && fetchOptions.body instanceof ReadableStream);
  const shouldSerializeJsonBody =
    fetchOptions.body != null
    && typeof fetchOptions.body === 'object'
    && !isFormData
    && !isBinaryBody;
  const requestBody = shouldSerializeJsonBody
    ? JSON.stringify(fetchOptions.body)
    : fetchOptions.body;
  const headers = isFormData
    ? { ...(optionHeaders || {}) }
    : { 'Content-Type': 'application/json', ...(optionHeaders || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const startedAt = Date.now();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let abortListener = null;
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      abortListener = () => controller.abort();
      externalSignal.addEventListener('abort', abortListener, { once: true });
    }
  }
  try {
    const response = await fetch(`${API_BASE}${path}`, {
      ...fetchOptions,
      body: requestBody,
      headers,
      signal: controller.signal,
    });
    const elapsed = Date.now() - startedAt;
    if (elapsed > 8000 && typeof window !== 'undefined') {
      console.warn(`API slow: ${path} (${elapsed}ms)`);
    }
    if (!response.ok) {
      let data = null;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json().catch(() => null);
      } else {
        const text = await response.text().catch(() => '');
        data = text ? { error: text } : null;
      }
      const error = new Error(data?.error || `HTTP ${response.status}`);
      error.status = response.status;
      error.response = data;
      throw error;
    }
    if (response.status === 204) return null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Request timeout. Coba lagi.');
    }
    const message = String(error?.message || '');
    if (/failed to fetch|networkerror|load failed|disconnected/i.test(message)) {
      throw new Error(`API tidak tersedia. Pastikan server berjalan di ${API_BASE}.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    if (abortListener && externalSignal) {
      externalSignal.removeEventListener('abort', abortListener);
    }
  }
};

class TabErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
    this.handleRetry = this.handleRetry.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (typeof window !== 'undefined') {
      console.error('Tab render error:', error, info);
    }
  }

  handleRetry() {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry();
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }
    return (
      <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
        <div className="font-semibold">Gagal memuat tab.</div>
        <div className="mt-1 text-xs text-red-600">
          {this.state.error?.message ? `Detail: ${this.state.error.message}` : 'Silakan coba lagi.'}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={this.handleRetry}
            className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Muat Ulang Tab
          </button>
          {typeof window !== 'undefined' && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
            >
              Reload Halaman
            </button>
          )}
        </div>
      </div>
    );
  }
}

const ApiStatusBanner = ({ online, checking, lastCheckedAt, lastError, lastLatencyMs, onRetry }) => {
  if (online) return null;
  const lastCheckLabel = lastCheckedAt
    ? new Date(lastCheckedAt).toLocaleTimeString()
    : 'Belum dicek';
  const latencyLabel = Number.isFinite(lastLatencyMs) ? `${Math.round(lastLatencyMs)}ms` : '-';
  const errorLabel = lastError ? String(lastError) : 'Tidak ada detail';
  return (
    <div className="fixed top-0 inset-x-0 z-[60] bg-red-600 text-white text-xs font-semibold px-4 py-2 text-center shadow-lg">
      <div>
        <span>API offline.</span>
        <span className="ml-2">Pastikan server backend menyala di {API_BASE}.</span>
        {checking && <span className="ml-2 opacity-80">Mencoba ulang...</span>}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-center gap-3 text-[11px] font-normal opacity-90">
        <span>Terakhir cek: {lastCheckLabel}</span>
        <span>Latency: {latencyLabel}</span>
        <span>Detail: {errorLabel}</span>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-white/40 bg-white/10 px-2 py-0.5 font-semibold hover:bg-white/20"
          disabled={checking}
        >
          Coba lagi
        </button>
      </div>
    </div>
  );
};

const useApiHealth = () => {
  const [state, setState] = useState({
    online: true,
    checking: false,
    lastCheckedAt: null,
    lastError: '',
    lastLatencyMs: null,
  });
  const aliveRef = useRef(true);

  const checkNow = useCallback(async () => {
    if (!aliveRef.current) return;
    setState((prev) => ({ ...prev, checking: true }));
    const controller = new AbortController();
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    try {
      const resp = await fetch(`${API_BASE}/api/health`, { signal: controller.signal });
      const latency = Date.now() - startedAt;
      if (!aliveRef.current) return;
      setState({
        online: resp.ok,
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: resp.ok ? '' : `HTTP ${resp.status}`,
        lastLatencyMs: latency,
      });
    } catch (error) {
      const latency = Date.now() - startedAt;
      if (!aliveRef.current) return;
      const message = error?.name === 'AbortError' ? 'Timeout' : (error?.message || 'Network error');
      setState({
        online: false,
        checking: false,
        lastCheckedAt: new Date().toISOString(),
        lastError: message,
        lastLatencyMs: latency,
      });
    } finally {
      clearTimeout(timeoutId);
    }
  }, []);

  useEffect(() => {
    aliveRef.current = true;
    checkNow();
    const timer = setInterval(checkNow, API_HEALTH_INTERVAL_MS);
    return () => {
      aliveRef.current = false;
      clearInterval(timer);
    };
  }, [checkNow]);

  return { ...state, checkNow };
};

const buildKanbanIdRegex = (format) => {
  const escaped = String(format || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped
    .replace(/{CATEGORY}/gi, '[A-Za-z0-9_-]+')
    .replace(/{SUPPLIER}/gi, '[A-Za-z0-9_-]+')
    .replace(/{MODEL}/gi, '[A-Za-z0-9_-]+')
    .replace(/{PART_NO}/gi, '[A-Za-z0-9_-]+')
    .replace(/{UNIQ}/gi, '(?<uniq>[A-Za-z0-9._-]+)')
    .replace(/{YEAR}/gi, '\\d{4}')
    .replace(/{YY}/gi, '\\d{2}')
    .replace(/{MONTH}/gi, '\\d{2}')
    .replace(/{ROMAN_MONTH}/gi, '[IVX]+')
    .replace(/{COUNTER(?::\\d+)?}/gi, '\\d+');
  return new RegExp(`^${pattern}$`, 'i');
};

// ==========================================
// 1. KOMPONEN LOGIN PAGE
// ==========================================
const LoginPage = ({ onLogin, notice = '' }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Username atau Password salah!');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="flex justify-center mb-6">
          <img src="/logo.png" alt="Logo MSKS" className="h-24 w-24 object-contain drop-shadow-sm" />
        </div>
        
        <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Selamat Datang</h2>
        <p className="text-center text-slate-500 mb-8 text-sm">Master Schedule &amp; Kanban System (MSK-S)</p>

        {notice && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {notice}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
              <input 
                type="password" 
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="mt-2 text-right">
              {ADMIN_WHATSAPP_LINK ? (
                <a
                  href={ADMIN_WHATSAPP_LINK}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                >
                  Lupa password? Hubungi Admin
                </a>
              ) : (
                <span className="text-xs text-slate-400">
                  Lupa password? Hubungi Admin
                </span>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg flex items-center gap-2 animate-pulse">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-indigo-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Masuk Sistem'}
          </button>
        </form>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          &copy; 2024 Logistik Corp. Versi Final
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 2. KOMPONEN DASHBOARD (INTI APLIKASI)
// ==========================================
const Dashboard = ({ onLogout, token, user }) => {
  // --- STATE MANAGEMENT ---
  const [toast, setToast] = useState({
    open: false,
    message: '',
    actionLabel: '',
    onAction: null,
    tone: 'info',
  });
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState({ query: '', groups: [] });
  const [globalSearchLoading, setGlobalSearchLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState('');
  const globalSearchInputRef = useRef(null);
  const globalSearchRequestRef = useRef(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationRecords, setNotificationRecords] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState('');
  const [notificationTotal, setNotificationTotal] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const [notificationModuleFilter, setNotificationModuleFilter] = useState('all');
  const toastTimerRef = useRef(null);
  const showToastMessage = useCallback((message, actionLabel = '', onAction = null, tone = 'auto') => {
    const raw = String(message || '');
    const lowered = raw.toLowerCase();
    const resolvedTone = tone === 'auto'
      ? (['gagal', 'error', 'failed', 'timeout', 'invalid', 'unauthorized', 'forbidden', 'melebihi', 'over', 'over-receive', 'over receive', 'exceed', 'sisa po'].some((key) => lowered.includes(key))
        ? 'error'
        : 'info')
      : tone;
    setToast({
      open: true,
      message: raw,
      actionLabel,
      onAction,
      tone: resolvedTone,
    });
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToast((prev) => ({ ...prev, open: false }));
    }, 4500);
  }, []);

  const apiFetch = useCallback(async (path, options = {}) => {
      try {
        return await apiRequest(path, options, token);
      } catch (error) {
        if (error?.status === 401 && typeof onLogout === 'function') {
          setTimeout(() => onLogout({ reasonMessage: error.message || 'Sesi berakhir. Silakan login ulang.' }), 0);
        }
        showToastMessage(error.message || 'Gagal memproses request.');
        throw error;
      }
    }, [token, onLogout, showToastMessage]);
    const safeApiFetch = useCallback(async (path, fallback) => {
      try {
        return await apiFetch(path);
      } catch (error) {
        if (String(error?.message || '').includes('HTTP 404')) {
          return fallback;
        }
        throw error;
      }
    }, [apiFetch]);

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setNotificationLoading(true);
    setNotificationError('');
    try {
      const moduleQuery = notificationModuleFilter && notificationModuleFilter !== 'all'
        ? `&module=${encodeURIComponent(notificationModuleFilter)}`
        : '';
      const result = await apiFetch(`/api/notifications?limit=50&offset=0${moduleQuery}`);
      setNotificationRecords(Array.isArray(result?.rows) ? result.rows : []);
      setNotificationTotal(Number(result?.total || 0));
      setNotificationUnreadCount(Number(result?.unreadCount || 0));
    } catch (error) {
      setNotificationError(error?.message || 'Gagal memuat notifikasi.');
    } finally {
      setNotificationLoading(false);
    }
  }, [apiFetch, token, notificationModuleFilter]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    if (!notificationId) return;
    try {
      await apiFetch(`/api/notifications/${notificationId}/read`, { method: 'POST' });
      await fetchNotifications();
      showToastMessage('Notifikasi ditandai sudah dibaca.', '', null, 'success');
    } catch (error) {
      setNotificationError(error?.message || 'Gagal menandai notifikasi.');
    }
  }, [apiFetch, fetchNotifications, showToastMessage]);

  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      await fetchNotifications();
      showToastMessage('Semua notifikasi ditandai sudah dibaca.', '', null, 'success');
    } catch (error) {
      setNotificationError(error?.message || 'Gagal menandai semua notifikasi.');
    }
  }, [apiFetch, fetchNotifications, showToastMessage]);

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [token, fetchNotifications]);

  useEffect(() => {
    if (!notificationsOpen || !token) return;
    fetchNotifications();
  }, [notificationsOpen, token, fetchNotifications]);

  const xlsxRef = useRef(null);
  const loadXlsx = async () => {
    if (xlsxRef.current) return xlsxRef.current;
    const mod = await import('xlsx');
    xlsxRef.current = mod;
    return mod;
  };
  const ensureXlsx = async () => {
    try {
      return await loadXlsx();
    } catch (error) {
      console.error('XLSX load error:', error);
      alert("Library 'xlsx' belum aktif.");
      return null;
    }
  };

  const [showScorecard, setShowScorecard] = useState(false);
  const [reportRows, setReportRows] = useState([]);
  const [reportSummary, setReportSummary] = useState(null);
  const [reportStart, setReportStart] = useState('');
  const [reportEnd, setReportEnd] = useState('');
  const [reportSupplier, setReportSupplier] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [stockCoverageRows, setStockCoverageRows] = useState([]);
  const [stockCoverageDays, setStockCoverageDays] = useState(30);
  const [slowMovingRows, setSlowMovingRows] = useState([]);
  const [inboundPerformanceRows, setInboundPerformanceRows] = useState([]);
  const [fifoViolationRows, setFifoViolationRows] = useState([]);
  const [inventoryValueRows, setInventoryValueRows] = useState([]);
  const [inventoryValueTotal, setInventoryValueTotal] = useState(0);
  const [rawMaterialLedgerPeriodType, setRawMaterialLedgerPeriodType] = useState('monthly');
  const [rawMaterialLedgerMonth, setRawMaterialLedgerMonth] = useState(() => formatMonthKeyLocal(new Date()));
  const [rawMaterialLedgerYear, setRawMaterialLedgerYear] = useState(() => String(new Date().getFullYear()));
  const [rawMaterialLedgerCategory, setRawMaterialLedgerCategory] = useState('raw');
  const [rawMaterialLedgerLocation, setRawMaterialLedgerLocation] = useState('');
  const [rawMaterialLedgerRows, setRawMaterialLedgerRows] = useState([]);
  const [rawMaterialLedgerLoading, setRawMaterialLedgerLoading] = useState(false);
  const [rawMaterialLedgerError, setRawMaterialLedgerError] = useState('');
  const [rawMaterialLedgerMeta, setRawMaterialLedgerMeta] = useState(null);
  const mutationDefaultRange = getCurrentMonthRange();
  const [allMutationStart, setAllMutationStart] = useState(mutationDefaultRange.start);
  const [allMutationEnd, setAllMutationEnd] = useState(mutationDefaultRange.end);
    const [allMutationCategory, setAllMutationCategory] = useState('');
  const [allMutationLocation, setAllMutationLocation] = useState('');
  const [allMutationRows, setAllMutationRows] = useState([]);
  const [allMutationLoading, setAllMutationLoading] = useState(false);
  const [allMutationError, setAllMutationError] = useState('');
  const [outstandingPrlRows, setOutstandingPrlRows] = useState([]);
  const [supplierShortageRows, setSupplierShortageRows] = useState([]);
  const [supplierShortageSummary, setSupplierShortageSummary] = useState({
    totalItems: 0,
    totalSuppliers: 0,
    urgentItems: 0,
    totalShortageQty: 0,
  });
  const [supplierShortageSupplier, setSupplierShortageSupplier] = useState('');
  const [qualityObjectivesMonth, setQualityObjectivesMonth] = useState(() => formatMonthKeyLocal(new Date()));
  const [qualityObjectivesData, setQualityObjectivesData] = useState({
    period: null,
    inboundSchedule: [],
    dnVsRn: [],
    deliveryVsPrl: [],
  });
  const [supplierShortageMonth, setSupplierShortageMonth] = useState(
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()],
  );
  const [supplierShortageYear, setSupplierShortageYear] = useState(String(new Date().getFullYear()));
  const [capacityPlanningMonth, setCapacityPlanningMonth] = useState(
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()],
  );
  const [capacityPlanningYear, setCapacityPlanningYear] = useState(String(new Date().getFullYear()));
  const [capacityPlanningData, setCapacityPlanningData] = useState({
    period: null,
    summary: null,
    workCenters: [],
    dailyRows: [],
    workCenterDailyRows: [],
    rows: [],
  });
  const [outstandingPrlMonth, setOutstandingPrlMonth] = useState(
    ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'][new Date().getMonth()],
  );
  const [outstandingPrlYear, setOutstandingPrlYear] = useState(String(new Date().getFullYear()));
  const [kpiSummary, setKpiSummary] = useState({ inventoryValue: 0, stockAlert: 0, pendingInbound: 0, outstandingPr: 0 });
  const [kpiLoading, setKpiLoading] = useState(false);

  const supplierShortageSupplierOptions = useMemo(() => {
    const seen = new Set();
    return supplierShortageRows
      .map((row) => {
        const supplierName = String(row?.supplierName || '').trim();
        const supplierId = String(row?.supplierId || '').trim();
        const value = supplierId || supplierName;
        if (!value || seen.has(value)) return null;
        seen.add(value);
        return {
          value,
          label: supplierId && supplierName ? `${supplierName} (${supplierId})` : supplierName || supplierId,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }, [supplierShortageRows]);

  const filteredSupplierShortageRows = useMemo(() => {
    if (!supplierShortageSupplier) return supplierShortageRows;
    return supplierShortageRows.filter((row) => {
      const supplierName = String(row?.supplierName || '').trim();
      const supplierId = String(row?.supplierId || '').trim();
      return supplierShortageSupplier === supplierId || supplierShortageSupplier === supplierName;
    });
  }, [supplierShortageRows, supplierShortageSupplier]);

  const filteredSupplierShortageSummary = useMemo(() => {
    const uniqueSuppliers = new Set();
    let urgentItems = 0;
    let totalShortageQty = 0;

    filteredSupplierShortageRows.forEach((row) => {
      const supplierKey = String(row?.supplierId || row?.supplierName || '').trim();
      if (supplierKey) uniqueSuppliers.add(supplierKey);
      if (String(row?.status || '').toUpperCase() === 'URGENT') urgentItems += 1;
      totalShortageQty += Number(row?.shortageQty || 0);
    });

    return {
      totalItems: filteredSupplierShortageRows.length,
      totalSuppliers: uniqueSuppliers.size,
      urgentItems,
      totalShortageQty: Math.round((totalShortageQty + Number.EPSILON) * 100) / 100,
    };
  }, [filteredSupplierShortageRows]);

  useEffect(() => {
    if (!supplierShortageSupplier) return;
    const stillExists = supplierShortageSupplierOptions.some((option) => option.value === supplierShortageSupplier);
    if (!stillExists) {
      setSupplierShortageSupplier('');
    }
  }, [supplierShortageSupplier, supplierShortageSupplierOptions]);

  const [showUserModal, setShowUserModal] = useState(false);
  const [showUserFormDrawer, setShowUserFormDrawer] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState('');
  const [userResettingId, setUserResettingId] = useState(null);
  const [mainTab, setMainTab] = useState('dashboard');
  const [tabReloadNonce, setTabReloadNonce] = useState(0);
  const handleTabRetry = useCallback(() => setTabReloadNonce((prev) => prev + 1), []);
  const [inboundNav, setInboundNav] = useState(null);
  const [masterVendorSearch, setMasterVendorSearch] = useState('');
  const [productionTab, setProductionTab] = useState('items');
  const [productionMenu, setProductionMenu] = useState(null);
  const [items, setItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [kanbanSettings, setKanbanSettings] = useState([]);
  const [kanbanRequests, setKanbanRequests] = useState([]);
  const [deliveryNotes, setDeliveryNotes] = useState([]);
  const [receiveNotes, setReceiveNotes] = useState([]);
  const [kanbanLoading, setKanbanLoading] = useState(false);
  const [kanbanError, setKanbanError] = useState('');
  const [deliveryNotesLoading, setDeliveryNotesLoading] = useState(false);
  const [receiveNotesLoading, setReceiveNotesLoading] = useState(false);
  const [soOpenSession, setSoOpenSession] = useState(null);
  const isStockOpnameLocked = Boolean(soOpenSession);
  const rnDefaultRange = getCurrentMonthRange();
  const [rnSearch, setRnSearch] = useState('');
  const [rnDateStart, setRnDateStart] = useState(rnDefaultRange.start);
  const [rnDateEnd, setRnDateEnd] = useState(rnDefaultRange.end);
  const [rnStatus, setRnStatus] = useState('all');
  const [kanbanView, setKanbanView] = useState('master');
  const [kanbanRequestStatusFilter, setKanbanRequestStatusFilter] = useState('all');
  const [kanbanRequestQuickFilter, setKanbanRequestQuickFilter] = useState('all');
  const [kanbanRequestFilters, setKanbanRequestFilters] = useState({
    requestId: '',
    date: '',
    kanbanId: '',
    item: '',
    trigger: '',
    onHand: '',
    suggested: '',
    status: '',
  });
  const [tablePagination, setTablePagination] = useState({
    kanbanRequests: { page: 1, perPage: 25 },
    prl: { page: 1, perPage: 25 },
    masterItems: { page: 1, perPage: 25 },
    kanbanDn: { page: 1, perPage: 25 },
    kanbanReceiving: { page: 1, perPage: 25 },
    kanbanEmpty: { page: 1, perPage: 25 },
  });
  const itemsByCode = useMemo(() => {
    const map = new Map();
    items.forEach((it) => map.set(it.code, it));
    return map;
  }, [items]);

  const kanbanSettingsByCode = useMemo(() => {
    const map = new Map();
    kanbanSettings.forEach((row) => map.set(row.item_code, row));
    return map;
  }, [kanbanSettings]);
  const [showKanbanEdit, setShowKanbanEdit] = useState(false);
  const [kanbanEditMode, setKanbanEditMode] = useState('edit');
  const [kanbanSubTab, setKanbanSubTab] = useState('items');
  const [kanbanSearch, setKanbanSearch] = useState('');
  const [kanbanCategoryFilter, setKanbanCategoryFilter] = useState('all');
  const [kanbanDashboardCategoryFilter, setKanbanDashboardCategoryFilter] = useState('all');
  const [kanbanSettingsForm, setKanbanSettingsForm] = useState({
    itemCode: '',
    minQty: '',
    maxQty: '',
    lotQty: '',
    leadTimeDays: '',
    defaultSupplier: '',
    dropZone: '',
    active: true,
  });
  const [kanbanCategory, setKanbanCategory] = useState('raw');
  const [selectedKanban, setSelectedKanban] = useState(null);
  const [showDnModal, setShowDnModal] = useState(false);
  const [showDnDetailModal, setShowDnDetailModal] = useState(false);
  const [dnDetailLoading, setDnDetailLoading] = useState(false);
  const [dnDetailRows, setDnDetailRows] = useState([]);
  const [dnDetailEdits, setDnDetailEdits] = useState({});
  const [dnDetailEditable, setDnDetailEditable] = useState(false);
  const [selectedDnDetail, setSelectedDnDetail] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showTriggerChoiceModal, setShowTriggerChoiceModal] = useState(false);
  const [showManualRequestModal, setShowManualRequestModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showKanbanCardModal, setShowKanbanCardModal] = useState(false);
  const [showInboundCardModal, setShowInboundCardModal] = useState(false);
  const [showDnPrintModal, setShowDnPrintModal] = useState(false);
  const [dnPrintPayload, setDnPrintPayload] = useState(null);
  const [dnPrintLoading, setDnPrintLoading] = useState(false);
  const [dnPrintAuto, setDnPrintAuto] = useState(false);
  const [dnPrintMode, setDnPrintMode] = useState('dn');
  const [inboundCardPrintRows, setInboundCardPrintRows] = useState([]);
  const [inboundCardScanOpen, setInboundCardScanOpen] = useState(false);
  const [inboundCardScanValue, setInboundCardScanValue] = useState('');
  const [inboundCardScanLoading, setInboundCardScanLoading] = useState(false);
  const [inboundCardAdjustOpen, setInboundCardAdjustOpen] = useState(false);
  const [inboundCardAdjustTarget, setInboundCardAdjustTarget] = useState('');
  const [inboundCardAdjustSchedule, setInboundCardAdjustSchedule] = useState(null);
  const [inboundCardAdjustLoading, setInboundCardAdjustLoading] = useState(false);
  const [dnForm, setDnForm] = useState({
    dnNumber: '',
    supplier: '',
    plannedDate: '',
    remarks: '',
    scheduleIndex: '',
    cycle: '',
    rit: '',
    deliveryTime: '',
  });
  const [scheduleForm, setScheduleForm] = useState({ poNumber: '', requestDate: '', deliveryTime: '' });
  const [receiveForm, setReceiveForm] = useState({ rnNumber: '', doNumber: '', arrivalDate: '', productionDate: '', expiredDate: '', receivedQty: '', docQty: '', qcStatus: 'ok' });
  const [manualRequestForm, setManualRequestForm] = useState({
    kanbanId: '',
    itemCode: '',
    triggerType: 'manual',
    onHand: '',
    requestQty: '',
  });
  const [qrPayload, setQrPayload] = useState('');
  const [qrTitle, setQrTitle] = useState('');
  const [emptyKanbanForm, setEmptyKanbanForm] = useState({ area: '', kanbanId: '' });
  useEffect(() => {
    document.body.classList.toggle(
      'kanban-print-active',
      showKanbanCardModal || showInboundCardModal || showDnPrintModal,
    );
    return () => document.body.classList.remove('kanban-print-active');
  }, [showKanbanCardModal, showInboundCardModal, showDnPrintModal]);

  const [selectedRequestIds, setSelectedRequestIds] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({ area: '', kanbanIds: '' });
  const [scanMode, setScanMode] = useState('manual');
  const [scanInput, setScanInput] = useState('');
  const [scanResults, setScanResults] = useState([]);
  const [scanActiveResult, setScanActiveResult] = useState(null);
  const [scanError, setScanError] = useState('');
  const [scanCameraEnabled, setScanCameraEnabled] = useState(false);
  const scanVideoRef = useRef(null);
  const scanInstanceRef = useRef(null);
    const [showConsumeModal, setShowConsumeModal] = useState(false);
    const [consumeQty, setConsumeQty] = useState('');

  const formatWarningRef = useRef(new Set());
  const requireConfigFormat = (value, label) => {
    const format = String(value || '').trim();
    if (format) return format;
    const key = String(label || 'format');
    if (!formatWarningRef.current.has(key)) {
      formatWarningRef.current.add(key);
      showToastMessage(`${label} belum diisi di Master Config.`);
    }
    return '';
  };
  const masterFetchedRef = useRef(false);
  const masterRefreshRef = useRef(0);
  const dataCacheRef = useRef({
    schedulesLoaded: false,
    kanbanSettingsLoaded: false,
    kanbanRequestsLoaded: false,
    deliveryNotesLoaded: false,
    receiveNotesLoaded: false,
    itemsLoaded: false,
    prlLoadedYear: null,
  });
  const masterTabKeys = useMemo(
    () => [
      'dashboard',
      'monitoring',
      'kanban',
      'fifo',
      'inventory',
      'prl',
      'dash-prl',
      'dash-kanban',
      'dash-inventory',
      'dash-schedule',
      'dash-masterref',
      'masterref',
    ],
    [],
  );
  const [isAutoTriggering, setIsAutoTriggering] = useState(false);
  const currentYear = new Date().getFullYear();
  const [prlRows, setPrlRows] = useState([]);
  const [prlLoading, setPrlLoading] = useState(false);
  const [prlFilters, setPrlFilters] = useState({
    search: '',
    model: [],
    category: [],
    supplier: '',
    month: '',
    year: String(currentYear),
    shortage: false,
    autoDraft: false,
  });
  const [prlMenuOpen, setPrlMenuOpen] = useState(false);
  const [prlFlowOpen, setPrlFlowOpen] = useState(false);
  const prlImportRef = useRef(null);
  const [masterRefTab, setMasterRefTab] = useState('org');
  const [masterLoading, setMasterLoading] = useState(false);
  const [masterError, setMasterError] = useState('');
  const [masterPlants, setMasterPlants] = useState([]);
  const [masterAreas, setMasterAreas] = useState([]);
  const [masterDeliveries, setMasterDeliveries] = useState([]);
  const [masterWarehouses, setMasterWarehouses] = useState([]);
  const [masterVendors, setMasterVendors] = useState([]);
  const [masterCustomers, setMasterCustomers] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [masterLocations, setMasterLocations] = useState([]);
  const [masterPackings, setMasterPackings] = useState([]);
  const [masterCategories, setMasterCategories] = useState([]);
  const [itemSupplierMap, setItemSupplierMap] = useState(new Map());
  const [itemCustomerMap, setItemCustomerMap] = useState(new Map());
  const [masterConfig, setMasterConfig] = useState({
    raw: 'FIFO by Lot/Batch + Received Date',
    indirect: 'FIFO by Received Date',
    consumable: 'FIFO by Received Date',
    subcon: 'FIFO by Received Date',
    dnFormat: '',
    rnFormat: '',
    sjSubFormat: '',
    prlFormat: '',
    dnStatusFlow: 'CREATED,SENT,RECEIVED,CLOSED',
    qrTextRule: 'KANBAN_ID|ITEM|QTY|AREA|CYCLE|RIT|TIME',
    qcStatus: 'OK,HOLD,REJECT',
    holdLocation: 'QC-HOLD-AREA',
    workingDays: '',
    kanbanIdFormat: '',
    requestIdFormat: '',
    locationPrefixWarehouse: 'LOC-WH',
    locationPrefixProduction: 'LOC-PR',
    locationPrefixWorkCenter: 'LOC-WC',
  });
  const [masterFormVisible, setMasterFormVisible] = useState({
    plant: false,
    area: false,
    delivery: false,
    warehouse: false,
    vendor: false,
    item: false,
    location: false,
    packing: false,
    category: false,
    customer: false,
  });
  const [modelFormVisible, setModelFormVisible] = useState(false);
  const [masterModels, setMasterModels] = useState([]);
  const masterModelsMap = useMemo(() => buildModelMap(masterModels), [masterModels]);
  const masterModelCodeSet = useMemo(
    () => new Set((masterModels || []).map((model) => String(model.code || '').trim()).filter(Boolean)),
    [masterModels],
  );
  const [processFormVisible, setProcessFormVisible] = useState(false);
  const [masterProcesses, setMasterProcesses] = useState([]);
  const masterItemsWithModelCodes = useMemo(
    () => masterItems.map((item) => ({
      ...item,
      modelCodes: parseModelCodes(item.model),
    })),
    [masterItems],
  );
  const itemDuplicateKeySets = useMemo(() => {
    const codeCounts = new Map();
    const partNoCounts = new Map();
    masterItems.forEach((item) => {
      const codeKey = normalizeDuplicateKey(item.code);
      if (codeKey) {
        codeCounts.set(codeKey, (codeCounts.get(codeKey) || 0) + 1);
      }
      const partKey = normalizeDuplicateKey(item.part_no || item.partNo);
      if (partKey) {
        partNoCounts.set(partKey, (partNoCounts.get(partKey) || 0) + 1);
      }
    });
    const code = new Set();
    const partNo = new Set();
    codeCounts.forEach((count, key) => {
      if (count > 1) code.add(key);
    });
    partNoCounts.forEach((count, key) => {
      if (count > 1) partNo.add(key);
    });
    return { code, partNo };
  }, [masterItems]);
  const [modelCatalogForm, setModelCatalogForm] = useState({ code: '', name: '' });
  const [editingModelCode, setEditingModelCode] = useState(null);
  const getDefaultProcessCatalogForm = () => ({
    code: '',
    name: '',
    processType: '',
    appliesToLevel: 'All',
    workCenter: '',
    sequence: '',
    standardTime: '',
  });
  const [processCatalogForm, setProcessCatalogForm] = useState(() => getDefaultProcessCatalogForm());
  const [editingProcessCode, setEditingProcessCode] = useState(null);
  const [configModalKey, setConfigModalKey] = useState(null);
  const [configModalValue, setConfigModalValue] = useState('');
  const [configModalDraft, setConfigModalDraft] = useState('');
  const [plantForm, setPlantForm] = useState({ id: '', name: '', site: '' });
  const [areaForm, setAreaForm] = useState({ id: '', name: '', warehouseId: '' });
  const [deliveryForm, setDeliveryForm] = useState({ id: '', areaId: '', address: '' });
  const [warehouseForm, setWarehouseForm] = useState({ id: '', name: '', site: '', type: 'MAIN' });
  const [vendorForm, setVendorForm] = useState({
    id: '',
    name: '',
    type: 'Supplier',
    role: 'Delivery Note',
    email: '',
    leadTimeDays: '',
    dailyCapacityQty: '',
    deliverySchedule: [],
  });
  const [itemMasterForm, setItemMasterForm] = useState({
    code: '',
    name: '',
    partNo: '',
    type: 'Raw Material',
    unit: 'PCS',
    typePack: '',
    packQty: '',
    orderLotSize: '',
    maxDeliveryPerRit: '',
    shelfLifeMonths: '',
    isSeasonal: false,
    suppliers: [],
    customers: [],
    modelCodes: [],
    weight: '',
    price: '',
    vendorId: '',
    locationId: '',
    imageUrl: '',
    imageThumbUrl: '',
    shelfLifeDays: '',
  });
  const [itemModelEntry, setItemModelEntry] = useState('');
  const [locationForm, setLocationForm] = useState({ id: '', lineDescription: '', areaId: '', warehouseId: '', category: 'Raw Material', fifoLane: '', machineNote: '' });
  const [packingForm, setPackingForm] = useState({ code: '', name: '' });
  const [categoryForm, setCategoryForm] = useState({ code: '', name: '' });
  const [customerForm, setCustomerForm] = useState({ id: '', name: '', email: '', leadTimeDays: '' });
  const [editingPlantId, setEditingPlantId] = useState(null);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [editingDeliveryId, setEditingDeliveryId] = useState(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState(null);
  const [editingVendorId, setEditingVendorId] = useState(null);
  const [masterEditingItemCode, setMasterEditingItemCode] = useState(null);
  const [editingLocationId, setEditingLocationId] = useState(null);
  const [editingPackingCode, setEditingPackingCode] = useState(null);
  const [editingCategoryCode, setEditingCategoryCode] = useState(null);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [selectedItemCodes, setSelectedItemCodes] = useState([]);
  const [itemBulkOpen, setItemBulkOpen] = useState(false);
  const [itemBulkCategory, setItemBulkCategory] = useState('');
  const [itemBulkTypePack, setItemBulkTypePack] = useState('');
  const [itemBulkSupplier, setItemBulkSupplier] = useState('');
  const [itemBulkCustomer, setItemBulkCustomer] = useState('');
  const [itemBulkShelfLife, setItemBulkShelfLife] = useState('');
  const [itemBulkSaving, setItemBulkSaving] = useState(false);
  const [itemTableFilters, setItemTableFilters] = useState({
    code: '',
    name: '',
    partNo: '',
    category: '',
    unit: '',
    typePack: '',
    model: '',
    supplier: '',
    customer: '',
    duplicatesOnly: false,
  });
  const [inventoryFilterBucket, setInventoryFilterBucket] = useState('all');
  const [inventoryDetailOpen, setInventoryDetailOpen] = useState(false);
  const [inventoryDetailItem, setInventoryDetailItem] = useState(null);
  const [fifoSimActive, setFifoSimActive] = useState(false);
  const [fifoSimStep, setFifoSimStep] = useState(0);
  const fifoSimTimerRef = useRef(null);
  const [inventoryShowKanban, setInventoryShowKanban] = useState(true);
  const [itemForm, setItemForm] = useState({ code: '', name: '', type: 'Finished', unit: 'Unit', model: '', weight: '', cycle: '', safetyStock: '' });
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemCode, setEditingItemCode] = useState(null);
  const [itemFilters, setItemFilters] = useState({
    code: '',
    name: '',
    type: '',
    unit: '',
    model: '',
    weight: '',
    cycle: '',
    stock: '',
    safety: '',
  });
  const [productionForm, setProductionForm] = useState({ productCode: '', qty: '' });
  const [productionSupplier, setProductionSupplier] = useState('');
  const [productionRequirements, setProductionRequirements] = useState([]);
  const [productionReqLoading, setProductionReqLoading] = useState(false);
  const [productionReqError, setProductionReqError] = useState('');
  const [productionBatches, setProductionBatches] = useState([]);
  const [productionBatchesLoading, setProductionBatchesLoading] = useState(false);
  const [productionResult, setProductionResult] = useState(null);
  const [productionReportStart, setProductionReportStart] = useState('');
  const [productionReportEnd, setProductionReportEnd] = useState('');
  const [productionReportRows, setProductionReportRows] = useState([]);
  const [productionReportLoading, setProductionReportLoading] = useState(false);
  const [productionOrders, setProductionOrders] = useState([]);
  const [productionOrdersLoading, setProductionOrdersLoading] = useState(false);
  const masterItemsByCode = useMemo(() => {
    const map = new Map();
    masterItems.forEach((item) => map.set(item.code, item));
    return map;
  }, [masterItems]);
  const resolveNspForItem = (itemCode) => {
    if (!itemCode) return 0;
    const item = itemsByCode.get(itemCode) || masterItemsByCode.get(itemCode);
    const packQty = Number(item?.pack_qty ?? item?.packQty ?? 0);
    if (Number.isFinite(packQty) && packQty > 0) return packQty;
    const setting = kanbanSettingsByCode.get(itemCode);
    const lotQty = Number(setting?.lot_qty ?? 0);
    return Number.isFinite(lotQty) && lotQty > 0 ? lotQty : 0;
  };
  const normalizeQtyByNsp = (qty, itemCode) => {
    const qtyValue = Number(qty);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) return qtyValue;
    const nsp = resolveNspForItem(itemCode);
    if (!Number.isFinite(nsp) || nsp <= 0) return qtyValue;
    return Math.ceil(qtyValue / nsp) * nsp;
  };
  const masterLocationsById = useMemo(() => {
    const map = new Map();
    masterLocations.forEach((loc) => map.set(loc.id, loc));
    return map;
  }, [masterLocations]);
  const masterVendorsById = useMemo(() => {
    const map = new Map();
    masterVendors.forEach((vendor) => map.set(vendor.id, vendor));
    return map;
  }, [masterVendors]);
  const masterVendorsLookup = useMemo(() => {
    const map = new Map();
    masterVendors.forEach((vendor) => {
      if (!vendor) return;
      const id = String(vendor.id || '').trim().toLowerCase();
      const name = String(vendor.name || '').trim().toLowerCase();
      if (id) map.set(id, vendor);
      if (name) map.set(name, vendor);
    });
    return map;
  }, [masterVendors]);
  const masterVendorNameMap = useMemo(() => {
    const map = new Map();
    masterVendors.forEach((vendor) => {
      if (!vendor) return;
      const id = String(vendor.id || '').trim();
      const name = String(vendor.name || '').trim();
      if (id) map.set(id.toLowerCase(), name || id);
      if (name) map.set(name.toLowerCase(), name);
    });
    return map;
  }, [masterVendors]);
  const resolveSupplierLabel = useCallback((rowOrValue) => {
    if (!rowOrValue) return '-';
    if (typeof rowOrValue === 'object') {
      const direct = rowOrValue.supplierName || rowOrValue.supplier_name || rowOrValue.supplierLabel;
      if (direct) return direct;
    }
    const raw = typeof rowOrValue === 'string'
      ? rowOrValue
      : (rowOrValue.supplier || rowOrValue.supplier_code || rowOrValue.supplierCode || rowOrValue.vendor_id || rowOrValue.vendorId || rowOrValue.default_supplier || '');
    const trimmed = String(raw || '').trim();
    if (!trimmed) return '-';
    return masterVendorNameMap.get(trimmed.toLowerCase()) || trimmed;
  }, [masterVendorNameMap]);
  const resolveScorecardSupplierMeta = useCallback((rowOrValue) => {
    const candidates = [];
    if (rowOrValue && typeof rowOrValue === 'object') {
      candidates.push(
        rowOrValue.supplier_id,
        rowOrValue.supplierId,
        rowOrValue.po_supplier_id,
        rowOrValue.poSupplierId,
        rowOrValue.vendor_id,
        rowOrValue.vendorId,
        rowOrValue.supplier,
        rowOrValue.supplier_name,
        rowOrValue.supplierName,
      );
    } else {
      candidates.push(rowOrValue);
    }

    let fallback = '';
    for (const candidate of candidates) {
      const trimmed = String(candidate || '').trim();
      if (!trimmed) continue;
      if (!fallback) fallback = trimmed;
      const vendor = masterVendorsLookup.get(trimmed.toLowerCase());
      if (vendor) {
        const id = String(vendor.id || trimmed).trim();
        const name = String(vendor.name || vendor.id || trimmed).trim();
        return { key: id || trimmed, name: name || id || trimmed };
      }
    }

    if (!fallback) return { key: '', name: '' };
    return { key: fallback, name: fallback };
  }, [masterVendorsLookup]);
  const qcStatusOptions = useMemo(() => (
    String(masterConfig.qcStatus || '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  ), [masterConfig.qcStatus]);
  const dnStatusFlowList = useMemo(() => (
    String(masterConfig.dnStatusFlow || '')
      .split(',')
      .map((value) => value.trim().toUpperCase())
      .filter(Boolean)
  ), [masterConfig.dnStatusFlow]);
    const isPrimaryTab = ['dashboard', 'monitoring', 'kanban', 'fifo', 'inventory', 'prl', 'subcon', 'supplier'].includes(mainTab);
  const isDashboardTab = ['dashboard', 'dash-prl', 'dash-kanban', 'dash-inventory', 'dash-masterref', 'dash-schedule'].includes(mainTab);
  const hasPrimaryCache = Boolean(
    dataCacheRef.current.itemsLoaded ||
    dataCacheRef.current.kanbanSettingsLoaded ||
    dataCacheRef.current.kanbanRequestsLoaded ||
    dataCacheRef.current.deliveryNotesLoaded ||
    dataCacheRef.current.receiveNotesLoaded ||
    dataCacheRef.current.schedulesLoaded ||
    dataCacheRef.current.prlLoadedYear,
  );
  const isPrimaryLoading = isPrimaryTab && !hasPrimaryCache && (
    masterLoading ||
    kanbanLoading ||
    itemsLoading ||
    prlLoading ||
    deliveryNotesLoading ||
    receiveNotesLoading
  );
  const isMasterEmpty = useMemo(() => {
    if (!masterFetchedRef.current || masterLoading) return false;
    return (
      masterPlants.length === 0 &&
      masterAreas.length === 0 &&
      masterDeliveries.length === 0 &&
      masterWarehouses.length === 0 &&
      masterVendors.length === 0 &&
      masterItems.length === 0 &&
      masterLocations.length === 0
    );
  }, [
    masterLoading,
    masterPlants.length,
    masterAreas.length,
    masterDeliveries.length,
    masterWarehouses.length,
    masterVendors.length,
    masterItems.length,
    masterLocations.length,
  ]);
  const [editingProductionId, setEditingProductionId] = useState(null);
  const [editingProductionQty, setEditingProductionQty] = useState('');
  const [reportTab, setReportTab] = useState('rekap');
  const [reportMenuOpen, setReportMenuOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [fifoLots, setFifoLots] = useState([]);
  const [selectedFifoKanban, setSelectedFifoKanban] = useState('');
  const [inventoryItems, setInventoryItems] = useState([]);
  const fifoKanbanItems = useMemo(() => {
    return inventoryItems.map((item) => ({
      id: item.kanbanId,
      kanbanId: item.kanbanId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      category: item.category,
      locationFIFO: item.location,
    }));
  }, [inventoryItems]);
  const fifoTotalsByItemCode = useMemo(() => {
    const totals = new Map();
    fifoLots.forEach((lot) => {
      const rawId = String(lot.kanbanId || '').trim();
      const itemCode = resolveKanbanItemCode(rawId);
      if (!itemCode) return;
      totals.set(itemCode, (totals.get(itemCode) || 0) + Number(lot.remainingQty || 0));
    });
    return totals;
  }, [fifoLots]);
  const criticalStockRows = useMemo(() => {
    return masterItems
      .map((item) => {
        const stock = Number(fifoTotalsByItemCode.get(item.code) ?? 0);
        const min = Number(item.safety_stock ?? 0);
        return {
          code: item.code,
          name: item.name,
          stock,
          min,
        };
      })
      .filter((row) => row.min > 0 && row.stock < row.min)
      .sort((a, b) => (a.stock - a.min) - (b.stock - b.min));
  }, [masterItems, fifoTotalsByItemCode]);
  const expiringSoonRows = useMemo(() => {
    const now = new Date();
    const thresholdDays = 14;
    return fifoLots
      .map((lot) => {
        if (!lot.expiryDate) return null;
        const expiry = new Date(lot.expiryDate);
        if (Number.isNaN(expiry.getTime())) return null;
        const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
        if (daysLeft < 0 || daysLeft > thresholdDays) return null;
        const rawId = String(lot.kanbanId || '').trim();
        const itemCode = resolveKanbanItemCode(rawId);
        const item = masterItemsByCode.get(itemCode);
        return {
          id: lot.id,
          kanbanId: lot.kanbanId,
          itemCode,
          itemName: item?.name || itemCode,
          expiryDate: lot.expiryDate,
          daysLeft,
          qty: lot.remainingQty,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [fifoLots, masterItemsByCode]);
  const rolePermissionPresets = {
    admin: {
      viewReport: true,
      viewScorecard: true,
      viewMaster: true,
      manageMaster: true,
      manageVendors: true,
      manageItems: true,
      viewPrl: true,
      prlProcess: true,
      prlImport: true,
      editSchedules: true,
      production: true,
      manageUsers: true,
      useAI: true,
      importExport: true,
      deleteRecords: true,
      resetAll: true,
    },
    ppic: {
      viewReport: true,
      viewScorecard: true,
      viewMaster: true,
      manageMaster: true,
      manageVendors: false,
      manageItems: true,
      viewPrl: true,
      prlProcess: false,
      prlImport: true,
      editSchedules: true,
      production: true,
      manageUsers: false,
      useAI: true,
      importExport: true,
      deleteRecords: false,
      resetAll: false,
    },
    warehouse: {
      viewReport: true,
      viewScorecard: false,
      viewMaster: true,
      manageMaster: false,
      manageVendors: false,
      manageItems: false,
      viewPrl: false,
      prlProcess: false,
      prlImport: false,
      editSchedules: true,
      production: true,
      manageUsers: false,
      useAI: false,
      importExport: true,
      deleteRecords: false,
      resetAll: false,
    },
    purchasing: {
      viewReport: true,
      viewScorecard: true,
      viewMaster: true,
      manageMaster: false,
      manageVendors: true,
      manageItems: false,
      viewPrl: true,
      prlProcess: true,
      prlImport: false,
      editSchedules: true,
      production: false,
      manageUsers: false,
      useAI: true,
      importExport: true,
      deleteRecords: false,
      resetAll: false,
    },
    management: {
      viewReport: true,
      viewScorecard: true,
      viewMaster: true,
      manageMaster: false,
      manageVendors: false,
      manageItems: false,
      viewPrl: true,
      prlProcess: false,
      prlImport: false,
      editSchedules: false,
      production: false,
      manageUsers: false,
      useAI: false,
      importExport: false,
      deleteRecords: false,
      resetAll: false,
    },
    user: {
      viewReport: true,
      viewScorecard: true,
      viewMaster: true,
      manageMaster: false,
      manageVendors: false,
      manageItems: false,
      viewPrl: true,
      prlProcess: false,
      prlImport: false,
      editSchedules: false,
      production: false,
      manageUsers: false,
      useAI: false,
      importExport: false,
      deleteRecords: false,
      resetAll: false,
    },
    supplier: {
      viewReport: false,
      viewScorecard: true,
      viewMaster: false,
      manageMaster: false,
      manageVendors: false,
      manageItems: false,
      viewPrl: false,
      prlProcess: false,
      prlImport: false,
      editSchedules: false,
      production: false,
      manageUsers: false,
      useAI: false,
      importExport: false,
      deleteRecords: false,
      resetAll: false,
    },
  };
  const defaultUserPermissions = {
    viewReport: false,
    viewScorecard: false,
    viewMaster: false,
    manageMaster: false,
    manageVendors: false,
    manageItems: false,
    viewPrl: false,
    prlProcess: false,
    prlImport: false,
    editSchedules: false,
    production: false,
    manageUsers: false,
    useAI: false,
    importExport: false,
    deleteRecords: false,
    resetAll: false,
  };
  const userRoleOptions = ['user', 'ppic', 'warehouse', 'purchasing', 'management', 'supplier', 'admin'];
  const userRoleDescriptions = {
    user: 'Akses dasar untuk user umum.',
    ppic: 'Fokus planning, PRL, dan monitoring.',
    warehouse: 'Fokus stok, schedule, dan operasi gudang.',
    purchasing: 'Fokus pembelian, PRL, dan supplier.',
    management: 'Fokus dashboard, report, dan review.',
    supplier: 'Akses terbatas ke data supplier sendiri.',
    admin: 'Kontrol penuh seluruh modul dan pengaturan.',
  };
  const permissionGroups = [
    {
      title: 'Laporan & Dashboard',
      keys: ['viewReport', 'viewScorecard'],
    },
    {
      title: 'Master Data',
      keys: ['viewMaster', 'manageMaster', 'manageVendors', 'manageItems'],
    },
    {
      title: 'Transaksi & PR',
      keys: ['viewPrl', 'prlProcess', 'prlImport', 'editSchedules', 'production'],
    },
    {
      title: 'Sistem & Admin',
      keys: ['manageUsers', 'useAI', 'importExport', 'deleteRecords', 'resetAll'],
    },
  ];
  const permissionLabels = {
    viewReport: 'View Report',
    viewScorecard: 'View Scorecard',
    viewMaster: 'View Master',
    manageMaster: 'Manage Master',
    manageVendors: 'Manage Vendor',
    manageItems: 'Manage Item',
    viewPrl: 'View PRL',
    prlProcess: 'PRL Process',
    prlImport: 'PRL Import',
    editSchedules: 'Edit Schedule',
    production: 'Production',
    manageUsers: 'Manage User',
    useAI: 'Use AI',
    importExport: 'Import / Export',
    deleteRecords: 'Delete Records',
    resetAll: 'Reset All',
  };
  const buildRolePresetPermissions = (roleValue) => {
    const role = String(roleValue || 'user').toLowerCase();
    const preset = rolePermissionPresets[role] || rolePermissionPresets.user;
    return { ...preset };
  };
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    password: '',
    role: 'user',
    supplierId: '',
    permissions: buildRolePresetPermissions('user'),
  });
  const [editingUserId, setEditingUserId] = useState(null);
  
  const filteredItems = useMemo(() => {
    const filters = {
      code: itemFilters.code.trim().toLowerCase(),
      name: itemFilters.name.trim().toLowerCase(),
      type: itemFilters.type.trim().toLowerCase(),
      unit: itemFilters.unit.trim().toLowerCase(),
      model: itemFilters.model.trim().toLowerCase(),
      weight: itemFilters.weight.trim().toLowerCase(),
      cycle: itemFilters.cycle.trim().toLowerCase(),
      stock: itemFilters.stock.trim().toLowerCase(),
      safety: itemFilters.safety.trim().toLowerCase(),
    };
    return items.filter((it) => {
      const code = String(it.code || '').toLowerCase();
      const name = String(it.name || '').toLowerCase();
      const type = String(it.type || '').toLowerCase();
      const unit = String(it.unit || '').toLowerCase();
      const model = String(it.model || '').toLowerCase();
      const weight = String(it.weight ?? '').toLowerCase();
      const cycle = String(it.cycle || '').toLowerCase();
      const stock = String(it.stock_qty ?? '').toLowerCase();
      const safety = String(it.safety_stock ?? '').toLowerCase();
      return (
        (!filters.code || code.includes(filters.code)) &&
        (!filters.name || name.includes(filters.name)) &&
        (!filters.type || type.includes(filters.type)) &&
        (!filters.unit || unit.includes(filters.unit)) &&
        (!filters.model || model.includes(filters.model)) &&
        (!filters.weight || weight.includes(filters.weight)) &&
        (!filters.cycle || cycle.includes(filters.cycle)) &&
        (!filters.stock || stock.includes(filters.stock)) &&
        (!filters.safety || safety.includes(filters.safety))
      );
    });
  }, [items, itemFilters]);

  const filteredFifoLots = useMemo(() => {
    return selectedFifoKanban
      ? fifoLots.filter((lot) => lot.kanbanId === selectedFifoKanban)
      : fifoLots;
  }, [selectedFifoKanban, fifoLots]);

  const fifoTotalStock = useMemo(() => {
    return filteredFifoLots
      .filter((lot) => lot.status === 'Active')
      .reduce((sum, lot) => sum + Number(lot.remainingQty || 0), 0);
  }, [filteredFifoLots]);

  const fifoTotalLots = filteredFifoLots.length;
  const fifoActiveLots = filteredFifoLots.filter((lot) => lot.status === 'Active').length;
  const fifoDepletedLots = filteredFifoLots.filter((lot) => lot.status === 'Depleted').length;

  // Filter States Scorecard
  const [scorecardFilterSupplier, setScorecardFilterSupplier] = useState('All');
  const [scorecardFilterMonthStart, setScorecardFilterMonthStart] = useState('');
  const [scorecardFilterMonthEnd, setScorecardFilterMonthEnd] = useState('');
  const [scorecardSchedules, setScorecardSchedules] = useState([]);
  const [scorecardSchedulesLoading, setScorecardSchedulesLoading] = useState(false);

  const [dashboardSchedules, setDashboardSchedules] = useState([]);
  const [dashboardSchedulesLoading, setDashboardSchedulesLoading] = useState(false);
  const [dashboardStats, setDashboardStats] = useState({
    totalPO: 0,
    totalSchedules: 0,
    totalScheduleDates: 0,
    onTime: 0,
    late: 0,
    pending: 0,
    tooEarly: 0,
  });
  const [dashboardStatsLoading, setDashboardStatsLoading] = useState(false);
  const [scheduleReadinessData, setScheduleReadinessData] = useState([]);
  const [scheduleReadinessMeta, setScheduleReadinessMeta] = useState(null);
  const [scheduleReadinessLoading, setScheduleReadinessLoading] = useState(false);
  const [scheduleReceivedSummary, setScheduleReceivedSummary] = useState({
    currentMonth: '',
    prevMonth: '',
    currentReceived: 0,
    prevReceived: 0,
  });
  const [todayScheduleSummary, setTodayScheduleSummary] = useState({
    date: '',
    target: 0,
    ready: 0,
  });

  // AI Modal States
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiResponse, setAiResponse] = useState(null); 
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiActionTitle, setAiActionTitle] = useState('');

  // Chatbot States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'Halo! Saya Asisten Logistik Anda. 🤖nAda yang bisa saya bantu mengenai data jadwal pengiriman hari ini?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Parse Modal States
  const [parseModalOpen, setParseModalOpen] = useState(false);
  const [rawInputText, setRawInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState(null); 
  const [imagePreview, setImagePreview] = useState(null);
  const [isParsing, setIsParsing] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [aiStatusLoading, setAiStatusLoading] = useState(false);
  
  const [activeMenu, setActiveMenu] = useState(null);
  const [itemMenuOpen, setItemMenuOpen] = useState(false);

  const fileInputRef = useRef(null);
  const excelInputRef = useRef(null); 
  const itemsImportRef = useRef(null);
  const productionImportRef = useRef(null);

  const DELIVERY_CYCLES = [
    { label: 'Cycle 1 (08:00)', value: '08:00 (Cycle 1)' },
    { label: 'Cycle 2 (13:30)', value: '13:30 (Cycle 2)' },
    { label: 'Cycle 3 (20:30)', value: '20:30 (Cycle 3)' },
    { label: 'Cycle 4 (01:30)', value: '01:30 (Cycle 4)' },
  ];

  const isAdmin = user?.role === 'admin';
  const isSupplier = user?.role === 'supplier';
  const can = (perm) => user?.role === 'admin' || user?.permissions?.[perm];
  const canViewReport = can('viewReport');
  const canViewScorecard = can('viewScorecard');
  const canViewMaster = can('viewMaster');
  const canManageMaster = can('manageMaster');
  const canManageVendors = can('manageVendors');
  const canManageItems = can('manageItems');
  const canViewPrl = can('viewPrl');
  const canPrlProcess = can('prlProcess');
  const canPrlImport = can('prlImport');
  const canEditSchedules = can('editSchedules');
  const canDeleteRecords = can('deleteRecords');
  const canImportExport = can('importExport');
  const canImportSchedules = canImportExport || canEditSchedules;
  const canUseAI = can('useAI');
  const canManageUsers = can('manageUsers');
  const canResetAll = can('resetAll');
  const canSubcon = canEditSchedules || canViewReport;
  const canProduction = can('production');

  const refreshAiConfigStatus = useCallback(async ({ silent = false } = {}) => {
    if (!canUseAI) {
      if (!silent) setAiConfigured(false);
      return false;
    }
    if (!silent) setAiStatusLoading(true);
    try {
      const data = await apiFetch('/api/settings/ai/status');
      const configured = Boolean(data?.configured);
      setAiConfigured(configured);
      return configured;
    } catch (error) {
      if (!silent) setAiConfigured(false);
      return false;
    } finally {
      if (!silent) setAiStatusLoading(false);
    }
  }, [apiFetch, canUseAI]);

  useEffect(() => {
    refreshAiConfigStatus({ silent: true });
  }, [refreshAiConfigStatus]);

  const ensureAiConfigured = useCallback(async () => {
    if (!canUseAI) {
      alert('Anda tidak punya akses AI.');
      return false;
    }
    if (aiConfigured) return true;
    const configured = await refreshAiConfigStatus();
    if (configured) return true;
    alert('API Key AI belum dikonfigurasi. Hubungi Admin untuk mengaktifkan fitur ini.');
    if (isAdmin) {
      setMainTab('settings');
    }
    return false;
  }, [aiConfigured, canUseAI, isAdmin, refreshAiConfigStatus, setMainTab]);

  const createSchedule = (payload) => apiFetch('/api/schedules', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  const createSchedulesBulk = (items) => apiFetch('/api/schedules/bulk', {
    method: 'POST',
    body: JSON.stringify({ items }),
  });

  const updateSchedule = (id, payload) => apiFetch(`/api/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  const deleteSchedule = (id) => apiFetch(`/api/schedules/${id}`, {
    method: 'DELETE',
  });

  const deleteAllSchedules = () => apiFetch('/api/schedules', {
    method: 'DELETE',
  });

  const unlockSchedule = (id) => apiFetch(`/api/schedules/${id}/unlock`, {
    method: 'POST',
  });

  const formatDateKey = (value) => formatDateKeyLocal(value);

  const resolveMonthRange = (monthInput) => {
    if (!monthInput) return { start: '', end: '' };
    const [yearStr, monthStr] = String(monthInput).split('-');
    const yearNum = Number(yearStr || 0);
    const monthNum = Number(monthStr || 0);
    if (!yearNum || !monthNum) return { start: '', end: '' };
    const start = new Date(yearNum, monthNum - 1, 1);
    const end = new Date(yearNum, monthNum, 0);
    return {
      start: formatDateKey(start),
      end: formatDateKey(end),
    };
  };
  const normalizeMonthRange = (startMonth, endMonth) => {
    const startValue = String(startMonth || '').trim();
    const endValue = String(endMonth || '').trim();
    if (startValue && endValue) {
      return startValue <= endValue
        ? { startMonth: startValue, endMonth: endValue }
        : { startMonth: endValue, endMonth: startValue };
    }
    return {
      startMonth: startValue || endValue,
      endMonth: endValue || startValue,
    };
  };
  const resolveMonthPeriodRange = (startMonth, endMonth) => {
    const normalized = normalizeMonthRange(startMonth, endMonth);
    const startRange = resolveMonthRange(normalized.startMonth);
    const endRange = resolveMonthRange(normalized.endMonth);
    return {
      startMonth: normalized.startMonth,
      endMonth: normalized.endMonth,
      start: startRange.start,
      end: endRange.end,
    };
  };
  const isMonthWithinRange = (dateValue, startMonth, endMonth) => {
    const monthKey = String(dateValue || '').slice(0, 7);
    if (!monthKey) return false;
    const normalized = normalizeMonthRange(startMonth, endMonth);
    if (normalized.startMonth && monthKey < normalized.startMonth) return false;
    if (normalized.endMonth && monthKey > normalized.endMonth) return false;
    return true;
  };

  const fetchDashboardStats = async ({ start, end } = {}) => {
    setDashboardStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const query = params.toString();
      const data = await apiFetch(`/api/schedules/stats${query ? `?${query}` : ''}`);
      setDashboardStats({
        totalPO: Number(data?.totalPO || 0),
        totalSchedules: Number(data?.totalSchedules || 0),
        totalScheduleDates: Number(data?.totalScheduleDates || 0),
        onTime: Number(data?.onTime || 0),
        late: Number(data?.late || 0),
        pending: Number(data?.pending || 0),
        tooEarly: Number(data?.tooEarly || 0),
      });
    } catch (error) {
      console.error('Gagal memuat dashboard stats:', error);
    } finally {
      setDashboardStatsLoading(false);
    }
  };

  const fetchScheduleReadiness = async ({ month, start, end } = {}) => {
    setScheduleReadinessLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      if (start) params.set('start', start);
      if (end) params.set('end', end);
      const query = params.toString();
      const data = await apiFetch(`/api/schedules/readiness${query ? `?${query}` : ''}`);
      setScheduleReadinessData(Array.isArray(data?.rows) ? data.rows : []);
      setScheduleReadinessMeta({
        month: data?.month || month || '',
        start: data?.start || start || '',
        end: data?.end || end || '',
      });
    } catch (error) {
      console.error('Gagal memuat schedule readiness:', error);
      setScheduleReadinessData([]);
      setScheduleReadinessMeta(null);
    } finally {
      setScheduleReadinessLoading(false);
    }
  };

  const fetchScheduleReceivedSummary = async ({ month } = {}) => {
    try {
      const params = new URLSearchParams();
      if (month) params.set('month', month);
      const query = params.toString();
      const data = await apiFetch(`/api/schedules/received-summary${query ? `?${query}` : ''}`);
      setScheduleReceivedSummary({
        currentMonth: data?.currentMonth || month || '',
        prevMonth: data?.prevMonth || '',
        currentReceived: Number(data?.currentReceived || 0),
        prevReceived: Number(data?.prevReceived || 0),
      });
    } catch (error) {
      console.error('Gagal memuat schedule received summary:', error);
      setScheduleReceivedSummary({
        currentMonth: month || '',
        prevMonth: '',
        currentReceived: 0,
        prevReceived: 0,
      });
    }
  };

  const fetchTodayScheduleSummary = async ({ date } = {}) => {
    try {
      const params = new URLSearchParams();
      if (date) params.set('date', date);
      const query = params.toString();
      const data = await apiFetch(`/api/schedules/today-summary${query ? `?${query}` : ''}`);
      setTodayScheduleSummary({
        date: data?.date || date || '',
        target: Number(data?.target || 0),
        ready: Number(data?.ready || 0),
      });
    } catch (error) {
      console.error('Gagal memuat summary hari ini:', error);
      setTodayScheduleSummary({ date: date || '', target: 0, ready: 0 });
    }
  };

  const fetchDashboardSchedules = async ({ silent = false } = {}) => {
    if (!silent) setDashboardSchedulesLoading(true);
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 7);
      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 2);
      const params = new URLSearchParams({
        start: formatDateKey(startDate),
        end: formatDateKey(endDate),
        order: 'asc',
        limit: '1000',
      });
      const data = await apiFetch(`/api/schedules?${params.toString()}`);
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      setDashboardSchedules(rows);
    } catch (error) {
      console.error('Gagal memuat dashboard schedule:', error);
      setDashboardSchedules([]);
    } finally {
      if (!silent) setDashboardSchedulesLoading(false);
    }
  };

  const fetchScorecardSchedules = async ({ startMonth, endMonth, supplier } = {}) => {
    const period = resolveMonthPeriodRange(startMonth, endMonth);
    if (!period.startMonth || !period.endMonth) {
      setScorecardSchedules([]);
      return;
    }
    setScorecardSchedulesLoading(true);
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (period.start) params.set('start', period.start);
      if (period.end) params.set('end', period.end);
      if (supplier && supplier !== 'All') params.set('supplier', supplier);
      params.set('order', 'asc');
      params.set('limit', '5000');
      const data = await apiFetch(`/api/schedules?${params.toString()}`);
      const rows = Array.isArray(data) ? data : (data?.rows || []);
      setScorecardSchedules(rows);
    } catch (error) {
      console.error('Gagal memuat data scorecard:', error);
      setScorecardSchedules([]);
    } finally {
      setReportLoading(false);
      setScorecardSchedulesLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUserLoading(true);
    setUserError('');
    try {
      const data = await apiFetch('/api/users');
      setUserList(data);
    } catch (error) {
      setUserError('Gagal memuat user.');
    } finally {
      setUserLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      if (editingUserId) {
        const updated = await apiFetch(`/api/users/${editingUserId}`, {
          method: 'PUT',
          body: JSON.stringify({
            role: newUserForm.role,
            supplierId: newUserForm.supplierId,
            permissions: newUserForm.permissions,
          }),
        });
        setUserList((prev) => prev.map((u) => (u.id === editingUserId ? updated : u)));
      } else {
        if (!newUserForm.username || !newUserForm.password) {
          alert('Username dan password wajib diisi.');
          return;
        }
        const created = await apiFetch('/api/users', {
          method: 'POST',
          body: JSON.stringify(newUserForm),
        });
        setUserList((prev) => [...prev, created]);
      }
      setNewUserForm({ username: '', password: '', role: 'user', supplierId: '', permissions: buildRolePresetPermissions('user') });
      setEditingUserId(null);
      setShowUserFormDrawer(false);
    } catch (error) {
      alert(`Gagal menyimpan user: ${error.message || 'Unknown error'}`);
    }
  };

  const handleResetUserPassword = async (userRow) => {
    const username = String(userRow?.username || '').trim();
    if (!userRow?.id || !username) return;
    const confirmed = window.confirm(`Reset password user "${username}" ke default ${DEFAULT_RESET_PASSWORD}?`);
    if (!confirmed) return;
    setUserResettingId(userRow.id);
    try {
      const result = await apiFetch(`/api/users/${userRow.id}/reset-password`, {
        method: 'POST',
      });
      showToastMessage(result?.message || `Password ${username} berhasil direset ke ${DEFAULT_RESET_PASSWORD}.`, '', null, 'success');
      alert(`Password user "${username}" sudah direset ke default: ${result?.defaultPassword || DEFAULT_RESET_PASSWORD}`);
    } catch (error) {
      alert(`Gagal reset password user "${username}": ${error.message || 'Unknown error'}`);
    } finally {
      setUserResettingId(null);
    }
  };

  const fetchItems = async ({ silent = false } = {}) => {
    if (!silent && !items.length) setItemsLoading(true);
    try {
      const data = await apiFetch('/api/items');
      setItems(data);
      dataCacheRef.current.itemsLoaded = true;
    } catch (error) {
      alert(`Gagal memuat items: ${error.message || 'Unknown error'}`);
    } finally {
      if (!silent && !items.length) setItemsLoading(false);
    }
  };

  const fetchKanbanSettings = async ({ silent = false } = {}) => {
    if (!silent && !kanbanSettings.length) setKanbanLoading(true);
    setKanbanError('');
    try {
      const data = await apiFetch('/api/kanban/settings');
      setKanbanSettings(data);
      dataCacheRef.current.kanbanSettingsLoaded = true;
    } catch (error) {
      setKanbanError(error.message || 'Gagal memuat kanban settings.');
    } finally {
      if (!silent && !kanbanSettings.length) setKanbanLoading(false);
    }
  };

  const fetchKanbanRequests = async ({ silent = false } = {}) => {
    if (!silent && !kanbanRequests.length) setKanbanLoading(true);
    setKanbanError('');
    try {
      const data = await apiFetch('/api/kanban/requests');
      setKanbanRequests(data);
      dataCacheRef.current.kanbanRequestsLoaded = true;
    } catch (error) {
      setKanbanError(error.message || 'Gagal memuat kanban requests.');
    } finally {
      if (!silent && !kanbanRequests.length) setKanbanLoading(false);
    }
  };

  const fetchDeliveryNotes = async ({ silent = false } = {}) => {
    if (!silent && !deliveryNotes.length) setDeliveryNotesLoading(true);
    try {
      const data = await apiFetch('/api/delivery-notes');
      setDeliveryNotes(data);
      dataCacheRef.current.deliveryNotesLoaded = true;
    } catch (error) {
      setKanbanError(error.message || 'Gagal memuat delivery notes.');
    } finally {
      if (!silent && !deliveryNotes.length) setDeliveryNotesLoading(false);
    }
  };

  const buildFifoLotsFromReceiveNotes = (notes) => {
    const sequenceMap = new Map();
    return (notes || []).map((note) => {
      const itemCode = note.item_code || '';
      if (!itemCode) return null;
      const masterItem = masterItemsByCode.get(itemCode);
      const masterLocation = masterLocationsById.get(masterItem?.location_id);
      const receivedAt = note.received_at || note.arrival_date || null;
      const receivedDate = receivedAt ? new Date(receivedAt).toISOString().slice(0, 10) : '';
      const shelfLifeDays = Number(masterItem?.shelf_life_days ?? 0);
      const shelfLifeMonths = Number(masterItem?.shelf_life_months ?? 0);
      const productionDateValue = note.production_date ? new Date(note.production_date).toISOString().slice(0, 10) : '';
      const expiredDateValue = note.expired_date ? new Date(note.expired_date).toISOString().slice(0, 10) : '';
      let computedExpiry = '';
      if (!expiredDateValue && productionDateValue && shelfLifeMonths > 0) {
        const base = new Date(`${productionDateValue}T00:00:00.000Z`);
        base.setUTCMonth(base.getUTCMonth() + Math.round(shelfLifeMonths));
        computedExpiry = base.toISOString().slice(0, 10);
      }
      const fallbackExpiry = receivedDate && shelfLifeDays > 0
        ? new Date(new Date(receivedDate).getTime() + shelfLifeDays * 86400000).toISOString().slice(0, 10)
        : '';
      const expiryDate = expiredDateValue || computedExpiry || fallbackExpiry;
      const daysInStock = receivedAt
        ? Math.max(0, Math.floor((Date.now() - new Date(receivedAt).getTime()) / 86400000))
        : 0;
      const nextSeq = (sequenceMap.get(itemCode) || 0) + 1;
      sequenceMap.set(itemCode, nextSeq);
      const qty = Number(note.received_qty || 0);
      const kanbanId = buildKanbanId(itemCode, masterItem?.type || '');
      return {
        id: String(note.id || `${kanbanId}-${nextSeq}`),
        kanbanId,
        lotNumber: `LOT-${receivedDate || 'NA'}-${String(nextSeq).padStart(3, '0')}`,
        batchNumber: masterItem?.type === 'Raw Material' ? `BATCH-${String(nextSeq).padStart(3, '0')}` : '',
        receivedDate,
        expiryDate,
        fifoSequence: nextSeq,
        location: masterLocation?.id || masterLocation?.name || '',
        initialQty: qty,
        remainingQty: qty,
        status: qty > 0 ? 'Active' : 'Depleted',
        daysInStock,
        qualityStatus: note.qc_status ? String(note.qc_status).toUpperCase() : 'OK',
        supplier: note.supplier || '',
        dnNumber: note.dn_number || '',
        rnNumber: note.rn_number || '',
      };
    }).filter(Boolean);
  };

  const buildInventoryFromSources = (notes) => {
    const receivedTotals = new Map();
    (notes || []).forEach((note) => {
      const itemCode = note.item_code || '';
      if (!itemCode) return;
      const prev = receivedTotals.get(itemCode) || 0;
      receivedTotals.set(itemCode, prev + Number(note.received_qty || 0));
    });
    const reservedStatuses = new Set(['triggered', 'requested', 'approved', 'dn_created', 'scheduled', 'in_transit']);
    const reservedTotals = new Map();
    (kanbanRequests || []).forEach((row) => {
      const itemCode = row.item_code || '';
      const status = String(row.status || '').toLowerCase();
      if (!itemCode || !reservedStatuses.has(status)) return;
      const prev = reservedTotals.get(itemCode) || 0;
      reservedTotals.set(itemCode, prev + Number(row.request_qty || 0));
    });
    const allCodes = new Set([
      ...kanbanSettings.map((row) => row.item_code).filter(Boolean),
      ...receivedTotals.keys(),
      ...reservedTotals.keys(),
    ]);
    const rows = [];
    allCodes.forEach((itemCode) => {
      const setting = kanbanSettingsByCode.get(itemCode);
      const masterItem = masterItemsByCode.get(itemCode);
      const masterLocation = masterLocationsById.get(masterItem?.location_id);
      const masterVendor = masterVendorsById.get(masterItem?.vendor_id);
      const minQty = Number(setting?.min_qty || 0);
      const maxQty = Number(setting?.max_qty || 0);
      const kanbanQty = Number(setting?.lot_qty || 0);
      const onHand = Number(masterItem?.stock_qty ?? receivedTotals.get(itemCode) ?? 0);
      const reserved = Number(reservedTotals.get(itemCode) || 0);
      const available = onHand - reserved;
      const noOfCards = kanbanQty ? Math.ceil(maxQty / kanbanQty) : 0;
      const category = masterItem?.type || setting?.item_type || '';
      const kanbanId = buildKanbanId(itemCode, category);
      let status = 'Active';
      if (available < 0) {
        status = 'Minus';
      } else if (minQty > 0 && available <= minQty) {
        status = 'Critical';
      } else if (reserved > 0) {
        status = 'Reserved';
      }
      rows.push({
        id: kanbanId,
        kanbanId,
        itemCode,
        itemName: masterItem?.name || setting?.item_name || '',
        category,
        location: masterLocation?.id || masterLocation?.name || '',
        onHand,
        reserved,
        available,
        minQty,
        maxQty,
        noOfCards,
        kanbanQty,
        supplier: masterVendor?.name || setting?.default_supplier || '',
        leadTime: Number(setting?.lead_time_days || 0),
        uom: masterItem?.unit || '',
        status,
      });
    });
    return rows;
  };

  const fetchReceiveNotes = async ({ silent = false } = {}) => {
    if (!silent && !receiveNotes.length) setReceiveNotesLoading(true);
    try {
      const data = await apiFetch('/api/receive-notes');
      setReceiveNotes(data);
      dataCacheRef.current.receiveNotesLoaded = true;
    } catch (error) {
      setKanbanError(error.message || 'Gagal memuat receiving notes.');
    } finally {
      if (!silent && !receiveNotes.length) setReceiveNotesLoading(false);
    }
  };

  const fetchSoOpenSession = async () => {
    try {
      const data = await apiFetch('/api/so-sessions/open');
      setSoOpenSession(data || null);
    } catch (error) {
      setSoOpenSession(null);
    }
  };

  const handleSaveKanbanSetting = async (e) => {
    e.preventDefault();
    if (!kanbanSettingsForm.itemCode) {
      alert('Item wajib dipilih.');
      return;
    }
    try {
      const payload = {
        ...kanbanSettingsForm,
        category: kanbanCategory,
        minQty: Number(kanbanSettingsForm.minQty) || 0,
        maxQty: Number(kanbanSettingsForm.maxQty) || 0,
        lotQty: Number(kanbanSettingsForm.lotQty) || 0,
        leadTimeDays: Number(kanbanSettingsForm.leadTimeDays) || 0,
      };
      await apiFetch('/api/kanban/settings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setKanbanSettingsForm({
        itemCode: '',
        minQty: '',
        maxQty: '',
        lotQty: '',
        leadTimeDays: '',
        defaultSupplier: '',
        dropZone: '',
        active: true,
      });
      await fetchKanbanSettings();
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal menyimpan kanban settings: ${error.message || 'Unknown error'}`);
    }
  };

  const buildAutoKanbanSettingPayload = (item) => {
    const lotQty = Math.max(1, Number(item?.pack_qty ?? item?.order_lot_size ?? item?.packQty ?? item?.orderLotSize ?? 0) || 1);
    const minQty = Math.max(0, Number(item?.safety_stock ?? item?.safetyStock ?? 0) || 0);
    const maxQty = Math.max(minQty, lotQty * 4);
    return {
      itemCode: item?.code || '',
      minQty,
      maxQty,
      lotQty,
      leadTimeDays: Number(item?.lead_time_days ?? item?.leadTimeDays ?? 0) || 0,
      defaultSupplier: item?.vendor_id || item?.supplier_name || item?.supplierName || '',
      dropZone: item?.line_production || item?.location_name || item?.location_id || '',
      active: true,
    };
  };

  const handleGenerateKanbanFromMasterItems = async ({ itemCodes } = {}) => {
    const requestedCodes = Array.isArray(itemCodes)
      ? Array.from(new Set(itemCodes.map((code) => String(code || '').trim()).filter(Boolean)))
      : [];
    const existingKanbanCodes = new Set(kanbanSettings.map((row) => String(row.item_code || '').trim()).filter(Boolean));
    const fallbackCodes = requestedCodes.length > 0
      ? requestedCodes
      : items
          .map((item) => String(item?.code || '').trim())
          .filter(Boolean)
          .filter((code) => !existingKanbanCodes.has(code));
    if (fallbackCodes.length === 0) {
      alert('Tidak ada item master yang belum punya kanban.');
      return;
    }
    try {
      const result = await apiRequest('/api/kanban/settings/generate-from-items', {
        method: 'POST',
        body: JSON.stringify({
          onlyMissing: requestedCodes.length === 0,
          itemCodes: fallbackCodes,
        }),
      }, token);
      const createdCount = Number(result?.created_count || 0);
      const candidateCount = Number(result?.candidate_count || 0);
      if (candidateCount > 0) {
        await fetchKanbanSettings();
        const requestedCount = Number(result?.requested_count || 0);
        const scopeLabel = requestedCount > 0 ? `dari ${requestedCount} item terpilih` : 'dari semua item master';
        alert(`Sinkron kanban selesai. ${createdCount} item baru ditambahkan ${scopeLabel}.`);
        return;
      }
    } catch (bulkError) {
      try {
        let createdCount = 0;
        for (const itemCode of fallbackCodes) {
          const item = itemsByCode.get(itemCode);
          if (!item) continue;
          if (existingKanbanCodes.has(itemCode)) continue;
          await apiRequest('/api/kanban/settings', {
            method: 'POST',
            body: JSON.stringify(buildAutoKanbanSettingPayload(item)),
          }, token);
          createdCount += 1;
        }
        await fetchKanbanSettings();
        alert(`Sinkron kanban selesai. ${createdCount} item baru ditambahkan.`);
        return;
      } catch (fallbackError) {
        alert(`Gagal generate kanban dari master item: ${fallbackError.message || bulkError.message || 'Unknown error'}`);
      }
    }
  };

  const scheduleStore = useScheduleStore({
    apiFetch,
    onLogout,
    user,
    canEditSchedules,
    canImportSchedules,
    canImportExport,
    canResetAll,
    isStockOpnameLocked,
    parseDateOnly,
    formatDateID,
    getNextBusinessDay,
    formatExcelDate,
    ensureXlsx,
    showToastMessage,
    createSchedule,
    createSchedulesBulk,
    updateSchedule,
    deleteSchedule,
    deleteAllSchedules,
    unlockSchedule,
    normalizeQtyByNsp,
    resolveNspForItem,
    prefetchAllSchedules: false,
    isInboundActive: mainTab === 'monitoring',
  });

  const {
    schedulesLoaded,
    schedules,
    selectedScheduleIds,
    setSelectedScheduleIds,
    showForm,
    setShowForm,
    isEditing,
    inputMode,
    setInputMode,
    newPlan,
    setNewPlan,
    searchQuery,
    setSearchQuery,
    filterStart,
    setFilterStart,
    filterEnd,
    setFilterEnd,
    filterStatus,
    setFilterStatus,
    filterSupplier,
    setFilterSupplier,
    scheduleSupplierOptions,
    filteredSchedules,
    schedulePage,
    schedulePerPage,
    scheduleTotal,
    scheduleTotalPages,
    scheduleLoading,
    handleSchedulePageChange,
    handleSchedulePerPageChange,
    stats: inboundStats,
    schedulesByDate,
    printSupplierGroups,
    showInboundPrint,
    setShowInboundPrint,
    inboundPrintOrientation,
    setInboundPrintOrientation,
    scheduleEditOpen,
    scheduleEditForm,
    setScheduleEditForm,
    scheduleEditSaving,
    scheduleEditError,
    closeScheduleEdit,
    handleScheduleEditSave,
    refreshSchedules,
    refreshAllSchedules,
    ensureSchedulesLoaded,
    getDisplayOrderQty,
    getTotalOrderQty,
    getRemainingQty,
    getPoLineRemainingAfterSchedule,
    getKpiStatus,
    getPrintStatusClass,
    handleAddPlan,
    handleCancelEdit,
    handleEdit,
    handleUpdateActual,
    handleSaveActual,
    handleUnlockActual,
    handleDelete,
    handleResetData,
    handlePrintPDF,
    handleDownloadTemplate,
    handleImportExcel,
    handleExportExcel,
    handleSendEmail,
    handleSendEmailReminder,
  } = scheduleStore;

  useEffect(() => {
    if (schedulesLoaded) {
      dataCacheRef.current.schedulesLoaded = true;
    }
  }, [schedulesLoaded]);

  useEffect(() => {
    if (!showInboundPrint || typeof window === 'undefined') return;
    const orientationStyle = document.createElement('style');
    orientationStyle.setAttribute('data-print-orientation', 'inbound');
    orientationStyle.innerHTML = `
      @page {
        size: A4 ${inboundPrintOrientation};
        margin: 8mm;
      }
    `;
    document.head.appendChild(orientationStyle);
    const disableInboundPrint = () => {
      document.body.classList.remove('inbound-print-active');
      setShowInboundPrint(false);
      window.removeEventListener('afterprint', disableInboundPrint);
      orientationStyle.remove();
    };
    document.body.classList.add('inbound-print-active');
    window.addEventListener('afterprint', disableInboundPrint);
    const timeoutId = setTimeout(() => {
      window.print();
    }, 80);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('afterprint', disableInboundPrint);
      document.body.classList.remove('inbound-print-active');
      orientationStyle.remove();
    };
  }, [showInboundPrint, inboundPrintOrientation]);

  const getCriticalSnapshot = () => {
    const activeSet = new Set(
      kanbanRequests
        .filter((row) => !['closed', 'rejected'].includes(row.status))
        .map((row) => row.item_code),
    );
    let criticalCount = 0;
    let pendingCount = 0;
    kanbanSettings.forEach((row) => {
      const stock = Number(fifoTotalsByItemCode.get(row.item_code) ?? 0);
      const min = Number(masterItemsByCode.get(row.item_code)?.safety_stock ?? 0);
      if (stock < min) {
        criticalCount += 1;
        if (activeSet.has(row.item_code)) {
          pendingCount += 1;
        }
      }
    });
    return { criticalCount, pendingCount };
  };

  const handleAutoTriggerKanban = async () => {
    if (isAutoTriggering) return;
    setIsAutoTriggering(true);
    try {
      const snapshot = getCriticalSnapshot();
      const result = await apiFetch('/api/kanban/requests/auto-trigger', { method: 'POST' });
      await fetchKanbanRequests();
      const created = Number(result?.created || 0);
      const pendingAfter = Math.max(0, snapshot.criticalCount - created);
      if (created > 0) {
        showToastMessage(
          `Auto-trigger: ${snapshot.criticalCount} critical, ${created} request dibuat, ${pendingAfter} sudah pending.`,
          'Lihat',
          () => setKanbanSubTab('requests'),
        );
      } else {
        showToastMessage(
          `Auto-trigger: ${snapshot.criticalCount} critical, 0 request dibuat, ${snapshot.pendingCount} sudah pending.`,
        );
      }
    } catch (error) {
      alert(`Gagal auto-trigger: ${error.message || 'Unknown error'}`);
    } finally {
      setIsAutoTriggering(false);
    }
  };

  const formatNumber0 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value ?? '';
    return num.toLocaleString('id-ID', { maximumFractionDigits: 0 });
  };

  const formatNumber2 = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value ?? '';
    return num.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatRupiah = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return value ?? '';
    return `Rp ${num.toLocaleString('id-ID', { maximumFractionDigits: 0 })}`;
  };

  const handleGlobalSearch = () => {
    setGlobalSearchOpen(true);
  };

  const handleNotifications = () => {
    setNotificationsOpen(true);
  };

  const globalSearchGroupMeta = useMemo(() => ({
    po: { label: 'Master PO', icon: '[PO]' },
    vendors: { label: 'Master Vendor', icon: '[VENDOR]' },
    items: { label: 'Master Item', icon: '[ITEM]' },
    schedules: { label: 'Jadwal Inbound', icon: '[SCHEDULE]' },
  }), []);

  const clearInboundNav = useCallback(() => setInboundNav(null), []);

  const openInboundScheduleFromToast = useCallback((query = '') => {
    setMainTab('monitoring');
    setInboundNav({
      tab: 'schedule',
      scheduleQuery: String(query || '').trim(),
    });
  }, [setMainTab]);

  const handleGlobalSearchResultClick = useCallback((groupKey, item) => {
    if (groupKey === 'po') {
      const poNumber = item?.po_number || item?.poNumber || '';
      setMainTab('monitoring');
      setInboundNav({ tab: 'master-po', poSearch: poNumber, expandPo: poNumber });
    } else if (groupKey === 'schedules') {
      const query = item?.po_number || item?.poNumber || item?.item || item?.supplier || '';
      openInboundScheduleFromToast(query);
    } else if (groupKey === 'vendors') {
      const vendorQuery = item?.id || item?.name || '';
      setMainTab('masterref');
      setMasterRefTab('vendor');
      if (vendorQuery) setMasterVendorSearch(vendorQuery);
    } else if (groupKey === 'items') {
      const code = item?.code || '';
      setMainTab('masterref');
      setMasterRefTab('item');
      if (code) {
        setItemTableFilters((prev) => ({ ...prev, code }));
      }
    }
    setGlobalSearchOpen(false);
  }, [openInboundScheduleFromToast, setItemTableFilters, setMainTab, setMasterRefTab, setMasterVendorSearch]);

  useEffect(() => {
    if (!globalSearchOpen) return;
    const query = String(globalSearchQuery || '').trim();
    if (!query) {
      setGlobalSearchResults({ query: '', groups: [] });
      setGlobalSearchError('');
      return;
    }
    const requestId = ++globalSearchRequestRef.current;
    const handle = setTimeout(async () => {
      setGlobalSearchLoading(true);
      setGlobalSearchError('');
      try {
        const params = new URLSearchParams({ q: query, limit: '8' });
        const result = await apiFetch(`/api/search?${params.toString()}`);
        if (globalSearchRequestRef.current !== requestId) return;
        setGlobalSearchResults(result || { query, groups: [] });
      } catch (error) {
        if (globalSearchRequestRef.current !== requestId) return;
        setGlobalSearchError(error?.message || 'Gagal mencari data.');
        setGlobalSearchResults({ query, groups: [] });
      } finally {
        if (globalSearchRequestRef.current === requestId) {
          setGlobalSearchLoading(false);
        }
      }
    }, 250);
    return () => clearTimeout(handle);
  }, [apiFetch, globalSearchOpen, globalSearchQuery]);

  const unreadNotificationItems = useMemo(
    () => notificationRecords.filter((item) => !item.is_read),
    [notificationRecords],
  );
  const readNotificationItems = useMemo(
    () => notificationRecords.filter((item) => item.is_read),
    [notificationRecords],
  );
  const notificationCount = notificationUnreadCount;

  useEffect(() => {
    if (!globalSearchOpen) return;
    const handle = setTimeout(() => {
      globalSearchInputRef.current?.focus();
    }, 80);
    return () => clearTimeout(handle);
  }, [globalSearchOpen]);

  useEffect(() => {
    if (!globalSearchOpen && !notificationsOpen) return;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setGlobalSearchOpen(false);
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [globalSearchOpen, notificationsOpen]);

  const kanbanIdCounterMap = useMemo(() => {
    const codes = new Set([
      ...kanbanSettings.map((row) => row.item_code).filter(Boolean),
      ...masterItems.map((row) => row.code).filter(Boolean),
    ]);
    const sorted = Array.from(codes).sort();
    const map = new Map();
    sorted.forEach((code, index) => {
      map.set(code, index + 1);
    });
    return map;
  }, [kanbanSettings, masterItems]);

  const sanitizeKanbanToken = (value) => {
    if (!value) return '';
    return String(value)
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^A-Za-z0-9_-]/g, '');
  };

  const buildKanbanId = (itemCode, categoryOverride = '') => {
    const format = requireConfigFormat(masterConfig.kanbanIdFormat, 'Kanban ID format');
    if (!itemCode) return '';
    if (!format) return '';
    const now = new Date();
    const yearFull = String(now.getFullYear());
    const yearShort = yearFull.slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[now.getMonth()];
    const counterRaw = kanbanIdCounterMap.get(itemCode) || 1;
    const masterItem = masterItemsByCode.get(itemCode);
    const categoryCodeRaw = masterItem?.type || categoryOverride || '';
    const categoryCode = (() => {
      const raw = String(categoryCodeRaw || '').trim();
      if (!raw) return '';
      if (categoryNameByCode.has(raw)) return raw;
      return categoryCodeByName.get(raw.toLowerCase()) || raw;
    })();
    const supplierRow = (itemSupplierMap.get(itemCode) || [])[0];
    const supplierId = supplierRow?.vendorId || masterItem?.vendor_id || '';
    const modelValue = masterItem?.model || '';
    const partNoValue = masterItem?.part_no || masterItem?.partNo || masterItem?.code || itemCode;

    let result = format
      .replaceAll('{CATEGORY}', sanitizeKanbanToken(categoryCode))
      .replaceAll('{SUPPLIER}', sanitizeKanbanToken(supplierId))
      .replaceAll('{MODEL}', sanitizeKanbanToken(modelValue))
      .replaceAll('{PART_NO}', sanitizeKanbanToken(partNoValue))
      .replaceAll('{UNIQ}', sanitizeKanbanToken(itemCode))
      .replaceAll('{YEAR}', yearFull)
      .replaceAll('{YY}', yearShort)
      .replaceAll('{MONTH}', month)
      .replaceAll('{ROMAN_MONTH}', romanMonth);

    result = result.replace(/{COUNTER(?::(\d+))?}/gi, (_match, pad) => {
      const padValue = Number(pad || 3);
      return String(counterRaw).padStart(padValue, '0');
    });

    return result;
  };

  const getRequestIdLabel = (row) => {
    const groupCode = row?.request_group || row?.requestGroup || '';
    const splitTotal = Number(row?.split_total ?? row?.splitTotal);
    const splitIndex = Number(row?.split_index ?? row?.splitIndex);
    if (groupCode && Number.isFinite(splitTotal) && splitTotal > 1 && Number.isFinite(splitIndex)) {
      return `${groupCode} (${splitIndex}/${splitTotal})`;
    }
    if (row?.request_code) return row.request_code;
    if (Number.isFinite(Number(row?.id))) return `KR-${row.id}`;
    return '-';
  };

  const formatRelationList = (rows = [], idKey = 'vendorId', nameKey = 'vendorName') => {
    if (!Array.isArray(rows) || rows.length === 0) return '-';
    return rows
      .map((row) => {
        const name = row[nameKey] || row[idKey];
        const share = Number(row.sharePercent || 0);
        return share ? `${name} (${share}%)` : String(name);
      })
      .join(', ');
  };

  const resolvePrlSupplierInfo = (row) => {
    const item = masterItemsByCode.get(row.uniq);
    const vendorId = item?.vendor_id || '';
    const vendor = (vendorId && masterVendorsById.get(vendorId)) || masterVendors.find((v) => (
      String(v.id).toLowerCase() === String(vendorId).toLowerCase()
      || String(v.name || '').toLowerCase() === String(item?.supplier_name || '').toLowerCase()
    ));
    const supplierName = vendor?.name || item?.supplier_name || vendorId || 'UNASSIGNED';
    const supplierCode = String(vendor?.id || vendorId || supplierName)
      .replace(/\s+/g, '')
      .replace(/[^A-Za-z0-9-]/g, '')
      .toUpperCase() || 'UNASSIGNED';
    return {
      name: supplierName,
      code: supplierCode,
      attention: vendor?.email || '-',
    };
  };

  const parseWorkingDaysInput = (value) => {
    if (!value) return {};
    try {
      return JSON.parse(value);
    } catch (error) {
      const cleaned = String(value).replace(/[{}]/g, '');
      const pairs = cleaned.split(/[n,]+/).map((item) => item.trim()).filter(Boolean);
      const result = {};
      for (const pair of pairs) {
        const [rawKey, rawValue] = pair.split(/[:=]/);
        if (!rawKey || !rawValue) return null;
        const key = rawKey.trim().toUpperCase();
        const num = Number(rawValue.trim());
        if (!Number.isFinite(num)) return null;
        result[key] = num;
      }
      return result;
    }
  };

  const prlColumns = [
    'NO',
    'UNIQ',
    'PART NO',
    'DESKRIPSI',
    'MODEL',
    'Qty/KBN',
    'UOM',
    'TYPE PACK',
    'VOL/DAY',
    'JAN',
    'FEB',
    'MAR',
    'APR',
    'MAY',
    'JUN',
    'JUL',
    'AUG',
    'SEP',
    'OCT',
    'NOV',
    'DEC',
  ];

  const prlMonthKeys = [
    { key: 'jan', label: 'JAN' },
    { key: 'feb', label: 'FEB' },
    { key: 'mar', label: 'MAR' },
    { key: 'apr', label: 'APR' },
    { key: 'may', label: 'MAY' },
    { key: 'jun', label: 'JUN' },
    { key: 'jul', label: 'JUL' },
    { key: 'aug', label: 'AUG' },
    { key: 'sep', label: 'SEP' },
    { key: 'oct', label: 'OCT' },
    { key: 'nov', label: 'NOV' },
    { key: 'dec', label: 'DEC' },
  ];
  const monthKeyByIndex = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  const monthLabelByIndex = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const prlCategoryOptions = useMemo(() => {
    if (masterCategories.length > 0) {
      return masterCategories.map((category) => category.code);
    }
    return ['Raw Material', 'Indirect Material', 'Consumable', 'Subcon'];
  }, [masterCategories]);

  const getPrlTypePack = (row) => {
    const item = masterItemsByCode.get(row.uniq);
    return item?.type_pack || row.typePack || row.item_type_pack || '';
  };
  const workingDaysConfig = useMemo(() => {
    if (!masterConfig.workingDays) return {};
    try {
      return JSON.parse(masterConfig.workingDays);
    } catch (error) {
      return {};
    }
  }, [masterConfig.workingDays]);

  const getWorkingDays = (monthKey, yearValue) => {
    if (!monthKey) return null;
    const yearKey = String(yearValue || currentYear);
    const monthLabel = monthKey.toUpperCase();
    const yearConfig = workingDaysConfig[yearKey] || workingDaysConfig;
    if (!yearConfig || typeof yearConfig !== 'object') return null;
    const value = yearConfig[monthLabel] ?? yearConfig[monthLabel.toLowerCase()] ?? yearConfig[monthKey];
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const getPrlVolPerDay = (row) => {
    const monthKey = prlFilters.month || monthKeyByIndex[new Date().getMonth()];
    const workDays = getWorkingDays(monthKey, prlFilters.year || currentYear);
    if (!workDays) return '';
    const qty = Number(row.months?.[monthKey] || 0);
    if (!qty) return '';
    return qty / workDays;
  };

  const isAutoDraftPrlRow = (row) => Number(row?.suggestedQty || 0) > 0;
  const prlActiveMonthKey = prlFilters.month || monthKeyByIndex[new Date().getMonth()];
  const prlActiveMonthLabel = prlMonthLabel(prlActiveMonthKey) || monthLabelByIndex[new Date().getMonth()];

  const filteredPrlRows = useMemo(() => {
    const search = prlFilters.search.trim().toLowerCase();
    const supplierFilter = String(prlFilters.supplier || '').trim().toLowerCase();
    return prlRows.filter((row) => {
      const hay = [
        row.uniq,
        row.partNo,
        row.description,
        row.model,
        row.category,
        row.uom,
        row.typePack,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (search && !hay.includes(search)) return false;
      const rowModelCodes = parseModelCodes(row.model);
      if (prlFilters.model?.length && !prlFilters.model.some((code) => rowModelCodes.includes(code))) return false;
      if ((prlFilters.category || []).length && !(prlFilters.category || []).includes(row.category)) return false;
      if (supplierFilter) {
        const info = resolvePrlSupplierInfo(row);
        const codeKey = String(info.code || '').toLowerCase();
        const nameKey = String(info.name || '').toLowerCase();
        if (supplierFilter !== codeKey && supplierFilter !== nameKey) return false;
      }
      if (prlFilters.year && String(row.year || '') !== String(prlFilters.year)) return false;
      if (prlFilters.month) {
        const monthValue = Number(row.months?.[prlFilters.month] || 0);
        if (!monthValue) return false;
      }
      if (prlFilters.shortage && prlFilters.month) {
        const need = Number(row.months?.[prlFilters.month] || 0);
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        if (need <= stock) return false;
      }
      if (prlFilters.autoDraft && !isAutoDraftPrlRow(row)) return false;
      return true;
    });
  }, [prlRows, prlFilters]);

  const prlAutoDraftSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let rows = 0;
    let suggestedQty = 0;
    let urgent = 0;
    let focusMonthQty = 0;
    filteredPrlRows.forEach((row) => {
      if (!isAutoDraftPrlRow(row)) return;
      rows += 1;
      suggestedQty += Number(row.suggestedQty || 0);
      focusMonthQty += Number(row.months?.[prlActiveMonthKey] || 0);
      if (row.dueDate) {
        const dueDate = new Date(row.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        if (!Number.isNaN(dueDate.getTime()) && dueDate <= today) urgent += 1;
      }
    });
    return {
      rows,
      suggestedQty,
      urgent,
      focusMonthQty,
      focusMonthKey: prlActiveMonthKey,
      focusMonthLabel: prlActiveMonthLabel,
    };
  }, [filteredPrlRows, prlActiveMonthKey, prlActiveMonthLabel]);

  const filteredMasterItems = useMemo(() => {
    const codeFilter = itemTableFilters.code.trim().toLowerCase();
    const nameFilter = itemTableFilters.name.trim().toLowerCase();
    const partNoFilter = itemTableFilters.partNo.trim().toLowerCase();
    const modelFilter = itemTableFilters.model.trim().toLowerCase();
    const unitFilter = itemTableFilters.unit.trim().toLowerCase();
    const typePackFilter = itemTableFilters.typePack.trim().toLowerCase();
    const supplierFilter = itemTableFilters.supplier.trim();
    const customerFilter = itemTableFilters.customer.trim();
    return masterItemsWithModelCodes.filter((item) => {
      if (codeFilter && !String(item.code || '').toLowerCase().includes(codeFilter)) return false;
      if (partNoFilter) {
        const partValue = String(item.part_no || item.partNo || '').toLowerCase();
        if (!partValue.includes(partNoFilter)) return false;
      }
      if (nameFilter && !String(item.name || '').toLowerCase().includes(nameFilter)) return false;
      if (modelFilter && !String(item.model || '').toLowerCase().includes(modelFilter)) return false;
      if (unitFilter && !String(item.unit || '').toLowerCase().includes(unitFilter)) return false;
      if (typePackFilter && !String(item.type_pack || '').toLowerCase().includes(typePackFilter)) return false;
      if (itemTableFilters.category && String(item.type || '') !== itemTableFilters.category) return false;
      if (itemTableFilters.duplicatesOnly) {
        const codeKey = normalizeDuplicateKey(item.code);
        const partKey = normalizeDuplicateKey(item.part_no || item.partNo);
        const isDuplicate = itemDuplicateKeySets.code.has(codeKey) || itemDuplicateKeySets.partNo.has(partKey);
        if (!isDuplicate) return false;
      }
      if (supplierFilter) {
        const suppliers = itemSupplierMap.get(item.code) || [];
        if (!suppliers.some((row) => String(row.vendorId) === supplierFilter)) return false;
      }
      if (customerFilter) {
        const customers = itemCustomerMap.get(item.code) || [];
        if (!customers.some((row) => String(row.customerId) === customerFilter)) return false;
      }
      return true;
    });
  }, [masterItemsWithModelCodes, itemTableFilters, itemSupplierMap, itemCustomerMap, itemDuplicateKeySets]);

  const fetchPrlRows = async (yearValue, { silent = false } = {}) => {
    if (!silent && !prlRows.length) setPrlLoading(true);
    try {
      const yearParam = yearValue || prlFilters.year || currentYear;
      const data = await apiFetch(`/api/prl?year=${encodeURIComponent(yearParam)}`);
        const normalized = (data || []).map((row) => {
          const rowModelCodes = parseModelCodes(row.model);
          return {
            id: row.id,
            uniq: row.item_code,
            partNo: row.part_no || row.item_code,
            description: row.description || '',
            model: row.model || '',
            modelCodes: rowModelCodes,
            qtyPerKanban: row.qty_per_kanban ?? '',
            uom: row.uom || '',
            typePack: row.type_pack || row.item_type_pack || '',
            volume: row.volume || '',
            months: row.months || {},
            status: row.status || {},
            category: row.category || '',
            year: row.year,
            sourceType: row.source_type || '',
            sourceRef: row.source_ref || '',
            suggestedQty: Number(row.suggested_qty || 0),
            dueDate: row.due_date || '',
            priorityScore: Number(row.priority_score || 0),
            approvedQty: Number(row.approved_qty || 0),
            approvedBy: row.approved_by || null,
            approvedByName: row.approved_by_name || '',
            approvedAt: row.approved_at || '',
          };
        });
      setPrlRows(normalized);
      dataCacheRef.current.prlLoadedYear = String(yearParam);
    } catch (error) {
      showToastMessage(`Gagal memuat PRL: ${error.message || 'Unknown error'}`);
    } finally {
      if (!silent && !prlRows.length) setPrlLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab !== 'prl') return;
    const yearParam = prlFilters.year || currentYear;
    const silent = dataCacheRef.current.prlLoadedYear === String(yearParam);
    fetchPrlRows(yearParam, { silent });
  }, [mainTab, prlFilters.year]);

  const buildPrlTemplateRows = () => ([
    {
      Uniq: '',
      JAN: '',
      FEB: '',
      MAR: '',
      APR: '',
      MAY: '',
      JUN: '',
      JUL: '',
      AUG: '',
      SEP: '',
      OCT: '',
      NOV: '',
      DEC: '',
    },
  ]);

  const handlePrlTemplateDownload = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = buildPrlTemplateRows();
    const ws = XLSX.utils.json_to_sheet(rows, { header: Object.keys(rows[0]) });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PRL_Template');
    XLSX.writeFile(wb, `PRL_Template_${prlFilters.year || currentYear}.xlsx`);
  };

  const handlePrlExport = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = prlRows.map((row, idx) => ({
      NO: idx + 1,
      UNIQ: row.uniq || '',
      'PART NO': row.partNo || '',
      DESKRIPSI: row.description || '',
        MODEL: joinModelCodes(row.modelCodes) || row.model || '',
      'Qty/KBN': row.qtyPerKanban ?? '',
      UOM: row.uom || '',
      'TYPE PACK': getPrlTypePack(row) || '',
      'VOL/DAY': getPrlVolPerDay(row) || '',
      JAN: row.months?.jan ?? '',
      FEB: row.months?.feb ?? '',
      MAR: row.months?.mar ?? '',
      APR: row.months?.apr ?? '',
      MAY: row.months?.may ?? '',
      JUN: row.months?.jun ?? '',
      JUL: row.months?.jul ?? '',
      AUG: row.months?.aug ?? '',
      SEP: row.months?.sep ?? '',
      OCT: row.months?.oct ?? '',
      NOV: row.months?.nov ?? '',
      DEC: row.months?.dec ?? '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows, { header: prlColumns });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PRL');
    XLSX.writeFile(wb, `PRL_${prlFilters.year || currentYear}.xlsx`);
    showToastMessage(`Export PRL selesai: ${prlRows.length} baris.`);
  };

  const handlePrlPrintPdf = async () => {
    if (!filteredPrlRows.length) {
      alert('Tidak ada data PRL untuk dicetak.');
      return;
    }
    const prlFormat = requireConfigFormat(masterConfig.prlFormat, 'PRL format');
    if (!prlFormat) return;
    let jsPDF;
    let autoTable;
    try {
      const jsPDFModule = await import('jspdf');
      const autoTableModule = await import('jspdf-autotable');
      jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
      autoTable = autoTableModule.default || autoTableModule;
    } catch (error) {
      alert('Modul PDF belum terpasang. Jalankan: npm install jspdf jspdf-autotable');
      return;
    }
    if (!jsPDF || !autoTable) {
      alert('Modul PDF tidak tersedia.');
      return;
    }

    const loadImageAsDataUrl = (src) => new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const logoData = await loadImageAsDataUrl(logoPrl || logoMatra);
    const baseYear = Number(prlFilters.year) || currentYear;
    const rawMonthIndex = prlFilters.month ? monthKeyByIndex.indexOf(prlFilters.month) : new Date().getMonth();
    const baseMonthIndex = rawMonthIndex >= 0 ? rawMonthIndex : new Date().getMonth();
    const formatShortMonthLabel = (monthIndex, yearValue) => {
      const rawLabel = monthLabelByIndex[monthIndex] || '';
      const monthLabel = rawLabel
        ? `${rawLabel.charAt(0)}${rawLabel.slice(1).toLowerCase()}`
        : '';
      const yearShort = String(yearValue || '').slice(-2);
      return `${monthLabel}-${yearShort}`;
    };
    const monthSlots = [-1, 0, 1, 2, 3].map((offset) => {
      let idx = baseMonthIndex + offset;
      let year = baseYear;
      while (idx < 0) { idx += 12; year -= 1; }
      while (idx >= 12) { idx -= 12; year += 1; }
      return {
        idx,
        year,
        key: monthKeyByIndex[idx],
        label: formatShortMonthLabel(idx, year),
        workDays: getWorkingDays(monthKeyByIndex[idx], year),
      };
    });
    const periodLabel = monthSlots[1].label;
    const printDate = new Date().toLocaleDateString('id-ID');

    const resolveSupplierInfo = (row) => resolvePrlSupplierInfo(row);

    const grouped = new Map();
    filteredPrlRows.forEach((row) => {
      const info = resolveSupplierInfo(row);
      const key = info.code || info.name;
      if (!grouped.has(key)) {
        grouped.set(key, { info, rows: [] });
      }
      grouped.get(key).rows.push(row);
    });
    if (grouped.size === 0) {
      grouped.set('ALL', { info: { name: 'All Supplier', code: 'ALL', attention: '-' }, rows: filteredPrlRows });
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 24;

    const signatureLabels = ['Confirmation', 'Acknowledged', 'Approved', 'Checked', 'Prepared'];
    const signatureSubLabels = ['', 'Div. Head PPIC', 'Sec. Head MKT', 'Sec. Head PPIC', 'Staff PPIC'];

    const drawHeader = (supplierInfo, prlNo, showSignature = true) => {
      const top = 24;
      const logoWidth = 72;
      const logoHeight = 40;
      if (logoData) {
        doc.addImage(logoData, 'PNG', margin, top, logoWidth, logoHeight);
      }
      const textX = logoData ? margin + logoWidth + 12 : margin;
      doc.setFontSize(12);
      doc.setTextColor(30);
      doc.text('PT. MATRA RODA PIRANTI', textX, top + 14);
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text('PRODUCTION CONTROL DEPARTMENT', textX, top + 28);
      doc.text('PART PROCUREMENT & LOGISTIC DEPARTMENT', textX, top + 40);

      const boxW = 130;
      const boxH = 52;
      const boxX = (pageWidth - boxW) / 2;
      const boxY = top + 2;
      doc.setDrawColor(100);
      doc.rect(boxX, boxY, boxW, boxH);
      doc.setFillColor(90, 99, 109);
      doc.rect(boxX, boxY, boxW, 16, 'F');
      doc.setFontSize(9);
      doc.setTextColor(255);
      doc.text('#PRL NUMBER', boxX + boxW / 2, boxY + 12, { align: 'center' });
      doc.setFontSize(12);
      doc.setTextColor(60);
      doc.text(prlNo, boxX + boxW / 2, boxY + 36, { align: 'center' });

      const infoTop = top + 58;
      doc.setFontSize(9);
      doc.setTextColor(60);
      doc.text('FORECAST ORDER', margin, infoTop);
      doc.text(`MONTH : ${periodLabel}`, margin, infoTop + 14);
      doc.text(`SUPPLIER : ${supplierInfo.name}`, margin, infoTop + 28);
      doc.text(`CODE : ${supplierInfo.code || '-'}`, margin, infoTop + 42);
      doc.text('', margin, infoTop + 56);
      doc.text('', margin, infoTop + 70);

      doc.setFontSize(8);
      doc.setTextColor(90);
      doc.text(`PRINT DATE : ${printDate}`, pageWidth - margin, infoTop + 70, { align: 'right' });

      doc.setDrawColor(180);
      if (showSignature) {
        const signatureGap = 0;
        const signatureBoxHeight = 32;
        const signatureAreaLeft = boxX + boxW + 8;
        const signatureAreaRight = pageWidth - margin;
        const signatureAvailableWidth = Math.max(0, signatureAreaRight - signatureAreaLeft);
        let signatureBoxWidth = Math.floor(
          (signatureAvailableWidth - signatureGap * (signatureLabels.length - 1)) / signatureLabels.length,
        );
        signatureBoxWidth = Math.max(36, Math.min(62, signatureBoxWidth));
        const signatureTotalWidth = signatureLabels.length * signatureBoxWidth
          + (signatureLabels.length - 1) * signatureGap;
        const signatureStartX = signatureAreaRight - signatureTotalWidth;
        const signatureLabelY = top + 8;
        const signatureBoxY = signatureLabelY + 6;
        signatureLabels.forEach((label, index) => {
          const x = signatureStartX + index * (signatureBoxWidth + signatureGap);
          doc.setFontSize(8);
          doc.setTextColor(30);
          if (label) {
            doc.text(label, x + signatureBoxWidth / 2, signatureLabelY, { align: 'center' });
          }
          doc.setDrawColor(90);
          doc.rect(x, signatureBoxY, signatureBoxWidth, signatureBoxHeight);
          const subLabel = signatureSubLabels[index] || '';
          if (subLabel) {
            doc.setFontSize(7);
            doc.setTextColor(40);
            doc.text(subLabel, x + signatureBoxWidth / 2, signatureBoxY + signatureBoxHeight + 10, { align: 'center' });
          }
        });
      }

      const separatorY = infoTop + 80;
      doc.line(margin, separatorY, pageWidth - margin, separatorY);
    };

    const getMonthValue = (row, slot) => {
      if (Number(row.year) !== Number(slot.year)) return 0;
      return Number(row.months?.[slot.key] || 0);
    };

    const buildPrlNumber = (supplierInfo, counterValue = 1) => {
      const format = prlFormat;
      const yearFull = String(baseYear);
      const yearShort = yearFull.slice(-2);
      const monthValue = String(baseMonthIndex + 1).padStart(2, '0');
      const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
      const romanMonth = romanMonths[baseMonthIndex] || '';
      const supplierCode = String(supplierInfo.code || supplierInfo.name || 'ALL')
        .replace(/\s+/g, '')
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase();
      const supplierName = String(supplierInfo.name || supplierInfo.code || 'ALL')
        .replace(/\s+/g, '')
        .replace(/[^A-Za-z0-9-]/g, '')
        .toUpperCase();
      let result = format
        .replaceAll('{SUPPLIER_CODE}', supplierCode)
        .replaceAll('{SUPPLIER}', supplierName)
        .replaceAll('{YEAR}', yearFull)
        .replaceAll('{YY}', yearShort)
        .replaceAll('{MONTH}', monthValue)
        .replaceAll('{ROMAN_MONTH}', romanMonth);
      result = result.replace(/{COUNTER(?::(\d+))?}/gi, (_match, pad) => {
        const padValue = Number(pad || 3);
        return String(counterValue).padStart(padValue, '0');
      });
      return result;
    };

    let firstGroup = true;
    let prlCounter = 0;
    const prlGroups = Array.from(grouped.values()).sort((a, b) => {
      const aKey = String(a.info?.code || a.info?.name || '').toLowerCase();
      const bKey = String(b.info?.code || b.info?.name || '').toLowerCase();
      return aKey.localeCompare(bKey);
    });
    for (const group of prlGroups) {
      if (!firstGroup) doc.addPage();
      firstGroup = false;
      const supplierInfo = group.info;
      prlCounter += 1;
      const prlNo = buildPrlNumber(supplierInfo, prlCounter);
      drawHeader(supplierInfo, prlNo, true);

      const buildMonthHeaderLabel = (slot) => {
        const workValue = slot.workDays ?? '-';
        return `(${slot.label})\n(${workValue} HK)`;
      };
      const getVolPerDayForSlot = (qty, slot) => {
        const workDays = Number(slot.workDays || 0);
        if (!workDays || !qty) return '';
        return qty / workDays;
      };
      const roundUpToPack = (value, pack) => {
        if (!Number.isFinite(value) || value <= 0) return '';
        if (Number.isFinite(pack) && pack > 0) return Math.ceil(value / pack) * pack;
        return Math.ceil(value);
      };
      const head = [
        [
          { content: 'No', rowSpan: 2 },
          { content: 'Part No / Deskripsi', rowSpan: 2 },
          { content: 'Model', rowSpan: 2 },
          { content: 'SNP', rowSpan: 2 },
          { content: 'QTY/DAY', colSpan: 2, styles: { halign: 'center' } },
          { content: 'UOM', rowSpan: 2 },
          { content: 'Type Pack', rowSpan: 2 },
          { content: 'QTY/WEEK', colSpan: 4, styles: { halign: 'center' } },
          { content: `N-1\n${buildMonthHeaderLabel(monthSlots[0])}`, rowSpan: 2 },
          { content: `N\n${buildMonthHeaderLabel(monthSlots[1])}`, rowSpan: 2 },
          { content: `N+1\n${buildMonthHeaderLabel(monthSlots[2])}`, rowSpan: 2 },
          { content: `N+2\n${buildMonthHeaderLabel(monthSlots[3])}`, rowSpan: 2 },
          { content: `N+3\n${buildMonthHeaderLabel(monthSlots[4])}`, rowSpan: 2 },
          { content: 'Fluctuation\n(N-1 => N)', rowSpan: 2 },
        ],
        [
          'N-1',
          'N',
          'I',
          'II',
          'III',
          'IV',
        ],
      ];

      const body = group.rows.map((row, idx) => {
        const nMinus = getMonthValue(row, monthSlots[0]);
        const nValue = getMonthValue(row, monthSlots[1]);
        let diffPct = 0;
        let trend = '→';
        if (nMinus > 0) {
          diffPct = ((nValue - nMinus) / nMinus) * 100;
          if (diffPct > 5) trend = '▲';
          else if (diffPct < -5) trend = '▼';
        }
        const diffValue = nMinus > 0 ? Math.round(diffPct) : null;
        const diffLabel = nMinus > 0 ? `${trend} ${formatNumber0(diffValue)}%` : '-';
        const color = trend === '▲'
          ? [185, 28, 28]
          : trend === '▼'
            ? [21, 128, 61]
            : [31, 41, 55];

        const itemCode = row.uniq || '';
        const partNoValue = row.partNo || '';
        const itemLabel = itemCode && partNoValue
          ? `${itemCode} / ${partNoValue}`
          : (itemCode || partNoValue || '');
        const partLabel = `${itemLabel}\n${row.description || ''}`.trim();
        const modelLabel = joinModelCodes(row.modelCodes) || row.model || '-';
        const stdPackRaw = row.qtyPerKanban ?? masterItemsByCode.get(row.uniq)?.pack_qty ?? '';
        const stdPack = Number(stdPackRaw);
        const typePack = packingNameByCode.get(getPrlTypePack(row)) || getPrlTypePack(row) || '-';
        const volPerDayNMinus = roundUpToPack(getVolPerDayForSlot(nMinus, monthSlots[0]), stdPack);
        const volPerDayN = roundUpToPack(getVolPerDayForSlot(nValue, monthSlots[1]), stdPack);
        const uomValue = row.uom
          || masterItemsByCode.get(row.uniq)?.unit
          || masterItemsByCode.get(row.uniq)?.uom
          || '-';
        const weekBase = nValue ? Math.floor(nValue / 4) : 0;
        const weekRemainder = nValue ? nValue - weekBase * 4 : 0;
        const weekValues = [
          weekBase + (weekRemainder > 0 ? 1 : 0),
          weekBase + (weekRemainder > 1 ? 1 : 0),
          weekBase + (weekRemainder > 2 ? 1 : 0),
          weekBase,
        ];
        return [
          idx + 1,
          partLabel,
          modelLabel,
          formatNumber0(stdPackRaw),
          formatNumber0(volPerDayNMinus),
          formatNumber0(volPerDayN),
          uomValue,
          typePack,
          ...weekValues.map((value) => formatNumber0(value)),
          formatNumber0(nMinus),
          formatNumber0(nValue),
          formatNumber0(getMonthValue(row, monthSlots[2])),
          formatNumber0(getMonthValue(row, monthSlots[3])),
          formatNumber0(getMonthValue(row, monthSlots[4])),
          { content: diffLabel, styles: { textColor: color, fontStyle: 'bold' } },
        ];
      });

      let headerPageIndex = 0;
      autoTable(doc, {
        head,
        body,
        startY: 170,
        margin: { left: margin, right: margin, top: 170, bottom: 70 },
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2.2, textColor: [20, 20, 20], halign: 'center', valign: 'middle', lineWidth: 0.2, lineColor: [200, 200, 200] },
        headStyles: { fillColor: [238, 242, 248], textColor: [30, 41, 59], fontStyle: 'bold', halign: 'center', valign: 'middle', lineWidth: 0.3, lineColor: [180, 180, 180], cellPadding: 2.4 },
        showHead: 'everyPage',
        columnStyles: {
          0: { cellWidth: 22, halign: 'center' },
          1: { cellWidth: 160, halign: 'left', overflow: 'linebreak' },
          2: { cellWidth: 56, halign: 'center', overflow: 'ellipsize' },
          3: { cellWidth: 30, halign: 'right' },
          4: { cellWidth: 34, halign: 'right' },
          5: { cellWidth: 34, halign: 'right' },
          6: { cellWidth: 28, halign: 'center' },
          7: { cellWidth: 44, halign: 'center', overflow: 'linebreak' },
          8: { cellWidth: 32, halign: 'right' },
          9: { cellWidth: 32, halign: 'right' },
          10: { cellWidth: 32, halign: 'right' },
          11: { cellWidth: 32, halign: 'right' },
          12: { cellWidth: 38, halign: 'right' },
          13: { cellWidth: 38, halign: 'right' },
          14: { cellWidth: 38, halign: 'right' },
          15: { cellWidth: 38, halign: 'right' },
          16: { cellWidth: 38, halign: 'right' },
          17: { cellWidth: 66, halign: 'center' },
        },
        didDrawPage: () => {
          drawHeader(supplierInfo, prlNo, headerPageIndex === 0);
          headerPageIndex += 1;
        },
      });
    }

    const sanitizePrlFilenamePart = (value) => String(value || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_-]/g, '')
      .toUpperCase();
    const periodSlug = sanitizePrlFilenamePart(periodLabel);
    let supplierSlug = 'ALL';
    if (grouped.size === 1) {
      const onlyGroup = grouped.values().next().value;
      supplierSlug = sanitizePrlFilenamePart(onlyGroup?.info?.name || onlyGroup?.info?.code || 'ALL');
    } else if (grouped.size > 1) {
      supplierSlug = 'MULTI';
    }
    doc.save(`PRL_${periodSlug}_${supplierSlug}.pdf`);
  };

  const parsePrlSheet = (sheet, XLSX) => {
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
    if (!rows.length) return [];
    const headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => String(cell || '').toLowerCase().includes('uniq')),
    );
    const headerRow = headerRowIndex >= 0 ? rows[headerRowIndex] : rows[0];
    const headerMap = headerRow.reduce((acc, cell, idx) => {
      const label = String(cell || '').trim().toLowerCase();
      acc[label] = idx;
      return acc;
    }, {});

    const getIndex = (name) => headerMap[name] ?? headerMap[name.toLowerCase()];
    const uniqIndex = getIndex('uniq') ?? 0;

    const monthIndexMap = {
      jan: getIndex('jan'),
      feb: getIndex('feb'),
      mar: getIndex('mar'),
      apr: getIndex('apr'),
      may: getIndex('may'),
      jun: getIndex('jun'),
      jul: getIndex('jul'),
      aug: getIndex('aug'),
      sep: getIndex('sep'),
      oct: getIndex('oct'),
      nov: getIndex('nov'),
      dec: getIndex('dec'),
    };

    const dataRows = rows.slice(headerRowIndex >= 0 ? headerRowIndex + 1 : 1);
    return dataRows
      .map((row) => {
        const uniq = String(row[uniqIndex] || '').trim();
        if (!uniq) return null;
        return {
          uniq,
          months: {
            jan: row[monthIndexMap.jan] ?? '',
            feb: row[monthIndexMap.feb] ?? '',
            mar: row[monthIndexMap.mar] ?? '',
            apr: row[monthIndexMap.apr] ?? '',
            may: row[monthIndexMap.may] ?? '',
            jun: row[monthIndexMap.jun] ?? '',
            jul: row[monthIndexMap.jul] ?? '',
            aug: row[monthIndexMap.aug] ?? '',
            sep: row[monthIndexMap.sep] ?? '',
            oct: row[monthIndexMap.oct] ?? '',
            nov: row[monthIndexMap.nov] ?? '',
            dec: row[monthIndexMap.dec] ?? '',
          },
        };
      })
      .filter(Boolean);
  };

  const handlePrlImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = parsePrlSheet(sheet, XLSX);
    if (rows.length === 0) {
      showToastMessage('Import PRL gagal: tidak ada data yang valid.');
      return;
    }
    try {
      const payload = {
        year: Number(prlFilters.year) || currentYear,
        rows,
      };
      const result = await apiFetch('/api/prl/import', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await fetchPrlRows(prlFilters.year);
      showToastMessage(
        `Import PRL selesai: ${result.saved || 0} tersimpan, ${result.skipped || 0} dilewati.`,
      );
    } catch (error) {
      showToastMessage(`Import PRL gagal: ${error.message || 'Unknown error'}`);
    }
    event.target.value = '';
  };

  function prlMonthLabel(monthKey) {
    const month = prlMonthKeys.find((entry) => entry.key === monthKey);
    return month ? month.label : '';
  }

    const handlePrlPeriodChange = (value) => {
      if (!value) {
        setPrlFilters({ ...prlFilters, month: '', year: String(currentYear), shortage: false });
        return;
      }
      const [yearPart, monthPart] = value.split('-');
      const monthIndex = Number(monthPart);
      const monthKey = monthKeyByIndex[monthIndex - 1] || '';
      setPrlFilters({ ...prlFilters, month: monthKey, year: yearPart });
    };

    const handlePrlModelSelection = (event) => {
      const selected = Array.from(event.target.selectedOptions).map((option) => option.value);
      setPrlFilters({ ...prlFilters, model: selected });
    };

  const handlePrlRelease = async () => {
    if (!prlFilters.month) {
      showToastMessage('Pilih bulan terlebih dahulu.');
      return;
    }
    try {
      const payload = {
        year: Number(prlFilters.year) || currentYear,
        month: prlFilters.month,
      };
      const result = await apiFetch('/api/prl/release', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await fetchPrlRows(prlFilters.year);
      const parts = [`${result.updated || 0} item aktif`];
      if (Number(result.autoDraftReleased || 0) > 0) parts.push(`${result.autoDraftReleased} auto draft diproses`);
      if (Number(result.alreadyActive || 0) > 0) parts.push(`${result.alreadyActive} sudah aktif`);
      showToastMessage(
        `Rilis Kanban ${prlMonthLabel(prlFilters.month)} ${prlFilters.year}: ${parts.join(', ')}.`,
      );
    } catch (error) {
      showToastMessage(`Gagal rilis kanban: ${error.message || 'Unknown error'}`);
    }
  };

  const openKanbanShortageInPrl = (row) => {
    if (!canViewPrl) {
      showToastMessage('Anda tidak memiliki akses ke PRL.');
      return;
    }
    const today = new Date();
    const monthKey = monthKeyByIndex[today.getMonth()] || '';
    const yearValue = String(today.getFullYear());
    const itemCode = String(row?.item_code || row?.itemCode || '').trim();
    setPrlFilters((prev) => ({
      ...prev,
      search: itemCode,
      model: [],
      category: [],
      supplier: '',
      month: monthKey,
      year: yearValue,
      shortage: false,
      autoDraft: true,
    }));
    setTablePagination((prev) => ({
      ...prev,
      prl: { ...(prev.prl || defaultPagination), page: 1 },
    }));
    setMainTab('prl');
  };

  const prlCoverageData = useMemo(() => {
    const targetYear = String(prlFilters.year || currentYear);
    const months = ['jan', 'feb', 'mar'];
    return months.map((monthKey) => {
      let covered = 0;
      let shortage = 0;
      prlRows.forEach((row) => {
        if (String(row.year || '') !== targetYear) return;
        const need = Number(row.months?.[monthKey] || 0);
        if (!need) return;
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        const used = Math.min(stock, need);
        covered += used;
        shortage += Math.max(0, need - stock);
      });
      return {
        period: prlMonthLabel(monthKey),
        covered,
        shortage,
      };
    });
  }, [prlRows, prlFilters.year, itemsByCode]);

  const prlShortageSummary = useMemo(() => {
    const now = new Date();
    const monthKey = monthKeyByIndex[now.getMonth()];
    const monthLabel = monthLabelByIndex[now.getMonth()];
    const targetYear = String(prlFilters.year || currentYear);
    let shortageCount = 0;
    const spark = [];
    ['jan', 'feb', 'mar'].forEach((key) => {
      let shortage = 0;
      prlRows.forEach((row) => {
        if (String(row.year || '') !== targetYear) return;
        const need = Number(row.months?.[key] || 0);
        if (!need) return;
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        shortage += Math.max(0, need - stock);
      });
      spark.push({ key, value: shortage });
    });
    prlRows.forEach((row) => {
      if (String(row.year || '') !== targetYear) return;
      const need = Number(row.months?.[monthKey] || 0);
      if (!need) return;
      const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
      if (need > stock) shortageCount += 1;
    });
    return { shortageCount, monthKey, monthLabel, spark };
  }, [prlRows, prlFilters.year, itemsByCode]);

  const kanbanPipelineSummary = useMemo(() => {
    let total = kanbanRequests.length;
    let completed = 0;
    let inTransit = 0;
    kanbanRequests.forEach((row) => {
      if (['receiving', 'fifo', 'closed'].includes(row.status)) completed += 1;
      if (row.status === 'in_transit') inTransit += 1;
    });
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inTransit, percent };
  }, [kanbanRequests]);

  const inventoryValueSummary = useMemo(() => {
    const totalStock = items.reduce((acc, item) => acc + Number(item.stock_qty || 0), 0);
    const currentReceived = Number(scheduleReceivedSummary.currentReceived || 0);
    const prevReceived = Number(scheduleReceivedSummary.prevReceived || 0);
    const diff = currentReceived - prevReceived;
    return { totalStock, diff };
  }, [items, scheduleReceivedSummary.currentReceived, scheduleReceivedSummary.prevReceived]);

  const productionTodaySummary = useMemo(() => {
    const target = Number(todayScheduleSummary.target || 0);
    const ready = Number(todayScheduleSummary.ready || 0);
    if (target <= 0) return { label: 'No Schedule', status: 'idle' };
    if (ready >= target) return { label: 'Schedule: Safe', status: 'safe' };
    return { label: 'Schedule: Risk', status: 'risk' };
  }, [todayScheduleSummary.target, todayScheduleSummary.ready]);

  const kanbanStatusData = useMemo(() => {
    const totals = {
      open: 0,
      ordered: 0,
      transit: 0,
      received: 0,
    };
    kanbanRequests.forEach((row) => {
      const status = row.status || 'requested';
      if (['triggered', 'requested'].includes(status)) totals.open += 1;
      else if (['approved', 'dn_created', 'scheduled'].includes(status)) totals.ordered += 1;
      else if (status === 'in_transit') totals.transit += 1;
      else if (['receiving', 'fifo', 'closed'].includes(status)) totals.received += 1;
    });
    return [
      { name: 'Open', value: totals.open, color: '#f59e0b' },
      { name: 'Ordered', value: totals.ordered, color: '#6366f1' },
      { name: 'In-Transit', value: totals.transit, color: '#0ea5e9' },
      { name: 'Received', value: totals.received, color: '#10b981' },
    ];
  }, [kanbanRequests]);

  const inventoryAgingData = useMemo(() => {
    const buckets = [
      { label: '< 30 Hari', min: 0, max: 29, color: '#22c55e' },
      { label: '30-60 Hari', min: 30, max: 59, color: '#f59e0b' },
      { label: '60-90 Hari', min: 60, max: 89, color: '#fb7185' },
      { label: '> 90 Hari', min: 90, max: 100000, color: '#ef4444' },
    ];
    const counts = buckets.map((b) => ({ label: b.label, value: 0, color: b.color }));
    fifoLots.forEach((lot) => {
      const days = Number(lot.daysInStock || 0);
      const idx = buckets.findIndex((b) => days >= b.min && days <= b.max);
      if (idx >= 0) counts[idx].value += 1;
    });
    return counts;
  }, [fifoLots]);

  const inventoryCategoryAgingData = useMemo(() => {
    const categoryMap = new Map();
    inventoryItems.forEach((item) => {
      categoryMap.set(item.kanbanId, item.category);
    });
    const categories = ['Raw Material', 'Indirect Material', 'Consumable', 'Subcon'];
    const initial = categories.map((label) => ({
      category: label,
      fresh: 0,
      slow: 0,
      dead: 0,
    }));
    const byCategory = new Map(initial.map((row) => [row.category, row]));
    fifoLots.forEach((lot) => {
      const category = categoryMap.get(lot.kanbanId) || 'Raw Material';
      const row = byCategory.get(category);
      if (!row) return;
      const days = Number(lot.daysInStock || 0);
      const qty = Number(lot.remainingQty || 0);
      if (days < 30) row.fresh += qty;
      else if (days <= 90) row.slow += qty;
      else row.dead += qty;
    });
    return Array.from(byCategory.values());
  }, [fifoLots, inventoryItems]);

  const inventoryHeatmapData = useMemo(() => {
    return fifoLots.map((lot) => {
      const stock = Number(lot.remainingQty || 0);
      const usage = Math.max(0, Number(lot.initialQty || 0) - Number(lot.remainingQty || 0));
      return { name: lot.lotNumber, stock, usage };
    });
  }, [fifoLots]);

  const inventoryHealthSummary = useMemo(() => {
    const totalStock = inventoryItems.reduce((acc, item) => acc + Number(item.onHand || 0), 0);
    const deadStock = fifoLots.reduce((acc, lot) => {
      const days = Number(lot.daysInStock || 0);
      if (days > 90) return acc + Number(lot.remainingQty || 0);
      return acc;
    }, 0);
    const receivedThis = Number(scheduleReceivedSummary.currentReceived || 0);
    const avgStock = totalStock || 1;
    const turnoverRate = Number(((receivedThis / avgStock) * 12).toFixed(1));
    return { totalStock, deadStock, turnoverRate };
  }, [inventoryItems, fifoLots, scheduleReceivedSummary.currentReceived]);

  const inventoryDetailLots = useMemo(() => {
    if (!inventoryDetailItem) return [];
    return fifoLots
      .filter((lot) => lot.kanbanId === inventoryDetailItem.kanbanId)
      .sort((a, b) => Number(a.fifoSequence || 0) - Number(b.fifoSequence || 0));
  }, [inventoryDetailItem, fifoLots]);

  const masterDataHealth = useMemo(() => {
    const total = masterItems.length || 1;
    const priceInfo = masterItems.filter((item) => Number(item.price || 0) > 0).length;
    const dimension = masterItems.filter((item) => Number(item.weight || 0) > 0 || item.model).length;
    const location = masterItems.filter((item) => item.location_id).length;
    const supplier = masterItems.filter((item) => item.vendor_id).length;
    const image = masterItems.filter((item) => item.image_url).length;
    const axes = [
      { axis: 'Price Info', value: Math.round((priceInfo / total) * 100) },
      { axis: 'Dimension/Weight', value: Math.round((dimension / total) * 100) },
      { axis: 'Location/Bin', value: Math.round((location / total) * 100) },
      { axis: 'Supplier Link', value: Math.round((supplier / total) * 100) },
      { axis: 'Image', value: Math.round((image / total) * 100) },
    ];
    const overallRaw = axes.reduce((acc, row) => acc + row.value, 0) / axes.length;
    const overall = Number(overallRaw.toFixed(1));
    const incompleteCount = masterItems.filter((item) => (
      !(Number(item.price || 0) > 0) ||
      !(Number(item.weight || 0) > 0 || item.model) ||
      !item.location_id ||
      !item.vendor_id ||
      !item.image_url
    )).length;
    return { axes, overall, incompleteCount, total };
  }, [masterItems]);

  const supplierPerformanceData = useMemo(() => {
    return [...masterVendors]
      .filter((vendor) => vendor.type === 'Supplier')
      .sort((a, b) => Number(a.lead_time_days || 0) - Number(b.lead_time_days || 0))
      .slice(0, 10)
      .map((vendor) => ({
        name: vendor.name,
        leadTime: Number(vendor.lead_time_days || 0),
      }));
  }, [masterVendors]);

  const prlScatterData = useMemo(() => {
    const targetYear = String(prlFilters.year || currentYear);
    return prlRows
      .filter((row) => String(row.year || '') === targetYear)
      .map((row) => {
        const need = Object.values(row.months || {}).reduce((acc, val) => acc + Number(val || 0), 0);
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        return { name: row.uniq, need, stock };
      });
  }, [prlRows, prlFilters.year, itemsByCode]);

  const prlParetoData = useMemo(() => {
    if (!prlFilters.month) return [];
    const targetYear = String(prlFilters.year || currentYear);
    const monthKey = prlFilters.month;
    const shortages = prlRows
      .filter((row) => String(row.year || '') === targetYear)
      .map((row) => {
        const need = Number(row.months?.[monthKey] || 0);
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        return { name: row.uniq, shortage: Math.max(0, need - stock) };
      })
      .filter((row) => row.shortage > 0)
      .sort((a, b) => b.shortage - a.shortage)
      .slice(0, 8);
    const total = shortages.reduce((acc, row) => acc + row.shortage, 0) || 1;
    let cumulative = 0;
    return shortages.map((row) => {
      cumulative += row.shortage;
      return { ...row, cumulative: Math.round((cumulative / total) * 100) };
    });
  }, [prlRows, prlFilters.month, prlFilters.year, itemsByCode]);

  const prlClusteredData = useMemo(() => {
    if (!prlFilters.month) return [];
    const targetYear = String(prlFilters.year || currentYear);
    const monthKey = prlFilters.month;
    const categories = ['Raw Material', 'Indirect Material', 'Consumable', 'Subcon'];
    return categories.map((category) => {
      let covered = 0;
      let shortage = 0;
      prlRows.forEach((row) => {
        if (String(row.year || '') !== targetYear) return;
        if (row.category !== category) return;
        const need = Number(row.months?.[monthKey] || 0);
        if (!need) return;
        const stock = Number(itemsByCode.get(row.uniq)?.stock_qty ?? 0);
        covered += Math.min(stock, need);
        shortage += Math.max(0, need - stock);
      });
      return { category, covered, shortage };
    });
  }, [prlRows, prlFilters.month, prlFilters.year, itemsByCode]);

  const fifoMethodOptions = [
    'FIFO by Lot/Batch + Received Date',
    'FIFO by Received Date',
  ];
  const qrRuleTokens = ['KANBAN_ID', 'ITEM', 'QTY', 'AREA'];
  const dnFormatTokens = ['{PREFIX}', '{SUPPLIER_CODE}', '{SUPPLIER}', '{YY}', '{YEAR}', '{COUNTER}', '{ROMAN_MONTH}', '{MONTH}'];
  const sjSubFormatTokens = ['{YEAR}', '{YY}', '{MONTH}', '{ROMAN_MONTH}', '{COUNTER}'];
  const prlFormatTokens = ['{SUPPLIER_CODE}', '{SUPPLIER}', '{YY}', '{YEAR}', '{COUNTER}', '{ROMAN_MONTH}', '{MONTH}'];
  const configModalMeta = {
    dnFormat: { label: 'DN Format', type: 'text', helper: dnFormatTokens },
    rnFormat: { label: 'RN Format', type: 'text' },
    sjSubFormat: { label: 'SJ Subcon Format', type: 'text', helper: sjSubFormatTokens },
    prlFormat: { label: 'PRL Format', type: 'text', helper: prlFormatTokens },
    dnStatusFlow: { label: 'DN Status Flow', type: 'tags' },
    qrTextRule: { label: 'QR Text Rule', type: 'text', helper: qrRuleTokens },
    qcStatus: { label: 'QC Status', type: 'tags' },
    holdLocation: { label: 'Hold Location', type: 'text' },
    kanbanIdFormat: { label: 'Kanban ID Format', type: 'text', helper: ['{CATEGORY}', '{SUPPLIER}', '{MODEL}', '{PART_NO}', '{UNIQ}', '{COUNTER}', '{YEAR}', '{YY}', '{MONTH}', '{ROMAN_MONTH}'] },
    requestIdFormat: { label: 'Request ID Format', type: 'text', helper: ['{ITEM_ID}', '{COUNTER}'] },
    locationPrefixWarehouse: { label: 'Location Prefix - Warehouse', type: 'text' },
    locationPrefixProduction: { label: 'Location Prefix - Production Line', type: 'text' },
    locationPrefixWorkCenter: { label: 'Location Prefix - Work Center', type: 'text' },
    workingDays: { label: 'Working Days (JSON)', type: 'textarea' },
    raw: { label: 'FIFO Raw Material', type: 'select', options: fifoMethodOptions },
    indirect: { label: 'FIFO Indirect Material', type: 'select', options: fifoMethodOptions },
    consumable: { label: 'FIFO Consumable', type: 'select', options: fifoMethodOptions },
    subcon: { label: 'FIFO Subcon', type: 'select', options: fifoMethodOptions },
  };
  const activeConfigModal = configModalKey ? configModalMeta[configModalKey] : null;

  const masterCategoryOptions = useMemo(() => {
    if (masterCategories.length > 0) {
      return masterCategories.map((category) => category.code);
    }
    return ['Raw Material', 'Indirect Material', 'Consumable', 'Subcon', 'Finished'];
  }, [masterCategories]);
  const categoryNameByCode = useMemo(() => {
    const map = new Map();
    masterCategories.forEach((category) => {
      map.set(category.code, category.name);
    });
    return map;
  }, [masterCategories]);
  const categoryCodeByName = useMemo(() => {
    const map = new Map();
    masterCategories.forEach((category) => {
      const name = String(category.name || '').trim();
      if (name) map.set(name.toLowerCase(), category.code);
    });
    return map;
  }, [masterCategories]);
  const packingNameByCode = useMemo(() => {
    const map = new Map();
    masterPackings.forEach((packing) => {
      map.set(packing.code, packing.name);
    });
    return map;
  }, [masterPackings]);
  const vendorTypeOptions = ['Supplier', 'Subcon'];
  const warehouseTypeOptions = ['MAIN', 'VENDOR_LOCATION'];

  const bomProcessOptions = useMemo(() => {
    const set = new Set();
    [...(masterProcesses || [])]
      .sort((left, right) => {
        const leftSequence = Number(left?.sequence || 0);
        const rightSequence = Number(right?.sequence || 0);
        if (leftSequence !== rightSequence) return leftSequence - rightSequence;
        return String(left?.code || '').localeCompare(String(right?.code || ''));
      })
      .forEach((proc) => {
      const nameValue = String(proc?.name || '').trim();
      if (nameValue) set.add(nameValue);
    });
    if (set.size === 0) {
      masterItems.forEach((item) => {
        (item.processes || []).forEach((proc) => {
          const trimmed = String(proc || '').trim();
          if (trimmed) set.add(trimmed);
        });
      });
    }
    return Array.from(set);
  }, [masterItems, masterProcesses]);

  const resetMasterForms = () => {
    setPlantForm({ id: '', name: '', site: '' });
    setAreaForm({ id: '', name: '', warehouseId: '' });
    setDeliveryForm({ id: '', areaId: '', address: '' });
    setWarehouseForm({ id: '', name: '', site: '', type: 'MAIN' });
    setVendorForm({
      id: '',
      name: '',
      type: 'Supplier',
      role: 'Delivery Note',
      email: '',
      leadTimeDays: '',
      dailyCapacityQty: '',
      deliverySchedule: [],
    });
      setItemMasterForm({ code: '', name: '', partNo: '', type: 'Raw Material', unit: 'PCS', typePack: '', packQty: '', orderLotSize: '', maxDeliveryPerRit: '', shelfLifeMonths: '', isSeasonal: false, suppliers: [], customers: [], modelCodes: [], weight: '', price: '', vendorId: '', locationId: '', imageUrl: '', imageThumbUrl: '', shelfLifeDays: '' });
      setItemModelEntry('');
    setLocationForm({ id: '', lineDescription: '', areaId: '', warehouseId: '', category: 'Raw Material', fifoLane: '', machineNote: '' });
    setPackingForm({ code: '', name: '' });
    setCategoryForm({ code: '', name: '' });
    setCustomerForm({ id: '', name: '', email: '', leadTimeDays: '' });
    setEditingPlantId(null);
    setEditingAreaId(null);
    setEditingDeliveryId(null);
    setEditingWarehouseId(null);
    setEditingVendorId(null);
    setMasterEditingItemCode(null);
    setEditingLocationId(null);
    setEditingPackingCode(null);
    setEditingCategoryCode(null);
    setEditingCustomerId(null);
    setModelCatalogForm({ code: '', name: '' });
    setEditingModelCode(null);
    setModelFormVisible(false);
    setProcessCatalogForm(getDefaultProcessCatalogForm());
    setEditingProcessCode(null);
    setProcessFormVisible(false);
  };

  const fetchMasterReferences = async ({ silent = false } = {}) => {
    if (!silent) setMasterLoading(true);
    setMasterError('');
    try {
      const [
        plants,
        areas,
        deliveries,
        warehouses,
        vendors,
        customers,
        categories,
        itemsMaster,
        locations,
        packings,
        models,
        processes,
        relations,
        config,
      ] = await Promise.all([
        apiFetch('/api/master/plants'),
        apiFetch('/api/master/areas'),
        apiFetch('/api/master/deliveries'),
        apiFetch('/api/master/warehouses'),
        apiFetch('/api/master/vendors'),
        apiFetch('/api/master/customers'),
        apiFetch('/api/master/categories'),
        apiFetch('/api/master/items'),
        apiFetch('/api/master/locations'),
        apiFetch('/api/master/packings'),
        safeApiFetch('/api/master/models', []),
        safeApiFetch('/api/master/processes', []),
        safeApiFetch('/api/master/item-relations', { suppliers: [], customers: [] }),
        apiFetch('/api/master/config'),
      ]);
      setMasterPlants(plants || []);
      setMasterAreas(areas || []);
      setMasterDeliveries(deliveries || []);
      setMasterWarehouses(warehouses || []);
      setMasterVendors(vendors || []);
      setMasterCustomers(customers || []);
      setMasterItems(itemsMaster || []);
      setMasterLocations(locations || []);
     setMasterPackings(packings || []);
     setMasterCategories(categories || []);
      setMasterModels(models || []);
      setMasterProcesses(processes || []);
      const supplierMap = new Map();
      const customerMap = new Map();
      (relations?.suppliers || []).forEach((row) => {
        if (!supplierMap.has(row.item_code)) supplierMap.set(row.item_code, []);
        supplierMap.get(row.item_code).push({
          vendorId: row.vendor_id,
          vendorName: row.vendor_name || row.vendor_id,
          sharePercent: row.share_percent,
        });
      });
      (relations?.customers || []).forEach((row) => {
        if (!customerMap.has(row.item_code)) customerMap.set(row.item_code, []);
        customerMap.get(row.item_code).push({
          customerId: row.customer_id,
          customerName: row.customer_name || row.customer_id,
          sharePercent: row.share_percent,
        });
      });
      setItemSupplierMap(supplierMap);
      setItemCustomerMap(customerMap);
      const fifoMethod = config?.fifo_method || {};
      const docNumbering = config?.document_numbering || {};
      const qcStatus = Array.isArray(config?.qc_status) ? config.qc_status : [];
      setMasterConfig({
        raw: fifoMethod['Raw Material'] || masterConfig.raw,
        indirect: fifoMethod['Indirect Material'] || masterConfig.indirect,
        consumable: fifoMethod.Consumable || masterConfig.consumable,
        subcon: fifoMethod.Subcon || masterConfig.subcon,
        dnFormat: docNumbering.dnFormat || '',
        rnFormat: docNumbering.rnFormat || '',
        sjSubFormat: docNumbering.sjSubFormat || '',
        prlFormat: docNumbering.prlFormat || '',
        dnStatusFlow: Array.isArray(docNumbering.dnStatusFlow)
          ? docNumbering.dnStatusFlow.join(',')
          : masterConfig.dnStatusFlow,
        qrTextRule: docNumbering.qrTextRule || masterConfig.qrTextRule,
        qcStatus: qcStatus.length ? qcStatus.join(',') : masterConfig.qcStatus,
        holdLocation: config?.hold_location || masterConfig.holdLocation,
        workingDays: config?.working_days ? JSON.stringify(config.working_days, null, 2) : masterConfig.workingDays,
        kanbanIdFormat: config?.kanban_id_format || '',
        requestIdFormat: config?.request_id_format || '',
        locationPrefixWarehouse: docNumbering.locationPrefixWarehouse || masterConfig.locationPrefixWarehouse,
        locationPrefixProduction: docNumbering.locationPrefixProduction || masterConfig.locationPrefixProduction,
        locationPrefixWorkCenter: docNumbering.locationPrefixWorkCenter || masterConfig.locationPrefixWorkCenter,
      });
      masterFetchedRef.current = true;
      masterRefreshRef.current = Date.now();
      return true;
    } catch (error) {
      masterFetchedRef.current = false;
      setMasterError(error.message || 'Gagal memuat master referensi.');
      return false;
    } finally {
      if (!silent) setMasterLoading(false);
    }
  };

  const finalizeMasterSave = async (successMessage) => {
    const refreshed = await fetchMasterReferences();
    if (refreshed) {
      showToastMessage(successMessage, '', null, 'success');
      setTablePagination((prev) => ({
        ...prev,
        masterItems: { ...(prev.masterItems || { page: 1, perPage: 25 }), page: 1 },
      }));
      return true;
    }
    showToastMessage('Data tersimpan, tapi tabel master gagal dimuat ulang.', '', null, 'error');
    return false;
  };

  useEffect(() => {
    if (!canViewMaster) return;
    if (masterFetchedRef.current) return;
    fetchMasterReferences({ silent: true });
  }, [canViewMaster]);

  useEffect(() => {
    if (!canViewMaster) return;
    if (!masterTabKeys.includes(mainTab)) return;
    if (masterFetchedRef.current) return;
    fetchMasterReferences();
  }, [mainTab, masterTabKeys, canViewMaster]);

  const handleSavePlant = async () => {
    if (!plantForm.id || !plantForm.name || !plantForm.site) {
      alert('Plant ID, Name, Site wajib diisi.');
      return;
    }
    const payload = { ...plantForm };
    if (editingPlantId) {
      await apiFetch(`/api/master/plants/${editingPlantId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/plants', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, plant: false }));
    await finalizeMasterSave('Plant berhasil disimpan.');
  };

  const handleSaveArea = async () => {
    if (!areaForm.id || !areaForm.name || !areaForm.warehouseId) {
      alert('Area ID, Name, Warehouse wajib diisi.');
      return;
    }
    const payload = { ...areaForm };
    if (editingAreaId) {
      await apiFetch(`/api/master/areas/${editingAreaId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/areas', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, area: false }));
    await finalizeMasterSave('Area berhasil disimpan.');
  };

  const handleSaveDelivery = async () => {
    if (!deliveryForm.id || !deliveryForm.areaId || !deliveryForm.address) {
      alert('Delivery ID, Area, Address wajib diisi.');
      return;
    }
    const payload = { ...deliveryForm };
    if (editingDeliveryId) {
      await apiFetch(`/api/master/deliveries/${editingDeliveryId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/deliveries', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, delivery: false }));
    await finalizeMasterSave('Delivery berhasil disimpan.');
  };

  const handleSaveWarehouse = async () => {
    if (!warehouseForm.id || !warehouseForm.name || !warehouseForm.site || !warehouseForm.type) {
      alert('Warehouse ID, Name, Site, Type wajib diisi.');
      return;
    }
    const payload = { ...warehouseForm };
    if (editingWarehouseId) {
      await apiFetch(`/api/master/warehouses/${editingWarehouseId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/warehouses', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, warehouse: false }));
    await finalizeMasterSave('Warehouse berhasil disimpan.');
  };

  const handleSaveVendor = async () => {
    if (!vendorForm.id || !vendorForm.name || !vendorForm.type || !vendorForm.role) {
      alert('Vendor ID, Name, Type wajib diisi.');
      return;
    }
    const leadTimeValue = parseFloat(String(vendorForm.leadTimeDays || '').replace(',', '.'));
    const dailyCapacityValue = parseFloat(String(vendorForm.dailyCapacityQty || '').replace(',', '.'));
    const scheduleRows = normalizeDeliveryScheduleRows(vendorForm.deliverySchedule || []);
    const firstSchedule = scheduleRows[0] || {};
    const cycleValue = String(firstSchedule.cycle || '').trim() || null;
    const ritValue = String(firstSchedule.rit || '').trim() || null;
    const deliveryTimeValue = String(firstSchedule.time || '').trim() || null;
    const payload = {
      ...vendorForm,
      leadTimeDays: Number.isFinite(leadTimeValue) ? Math.max(0, Math.round(leadTimeValue)) : 0,
      dailyCapacityQty: Number.isFinite(dailyCapacityValue) ? Math.max(0, dailyCapacityValue) : 0,
      deliverySchedule: scheduleRows,
      cycle: cycleValue,
      rit: ritValue,
      deliveryTime: deliveryTimeValue,
    };
    if (editingVendorId) {
      await apiFetch(`/api/master/vendors/${editingVendorId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/vendors', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, vendor: false }));
    await finalizeMasterSave('Vendor berhasil disimpan.');
  };

  const handleSaveItemMaster = async () => {
    if (!itemMasterForm.code || !itemMasterForm.name || !itemMasterForm.type || !itemMasterForm.unit) {
      alert('UNIQ, Nama, Category, Unit wajib diisi.');
      return;
    }
    const supplierShareTotal = (itemMasterForm.suppliers || []).reduce((acc, row) => acc + Number(row.sharePercent || 0), 0);
    const customerShareTotal = (itemMasterForm.customers || []).reduce((acc, row) => acc + Number(row.sharePercent || 0), 0);
    if (supplierShareTotal > 100) {
      alert('Total share supplier melebihi 100%.');
      return;
    }
    if (customerShareTotal > 100) {
      alert('Total share customer melebihi 100%.');
      return;
    }
    const shelfLifeValue = parseFloat(String(itemMasterForm.shelfLifeDays || '').replace(',', '.'));
    const shelfLifeMonthsValue = parseFloat(String(itemMasterForm.shelfLifeMonths || '').replace(',', '.'));
    const packQtyValue = parseFloat(String(itemMasterForm.packQty || '').replace(',', '.'));
    const orderLotValue = parseFloat(String(itemMasterForm.orderLotSize || '').replace(',', '.'));
    const maxDeliveryValue = parseFloat(String(itemMasterForm.maxDeliveryPerRit || '').replace(',', '.'));
    const isMultipleOfPack = (value, pack) => {
      if (!Number.isFinite(value) || !Number.isFinite(pack) || pack <= 0) return false;
      const ratio = value / pack;
      return Math.abs(ratio - Math.round(ratio)) < 1e-6;
    };
    if (!Number.isFinite(orderLotValue) || orderLotValue <= 0) {
      alert('Order Lot Size wajib diisi dan > 0.');
      return;
    }
    if (!Number.isFinite(maxDeliveryValue) || maxDeliveryValue <= 0) {
      alert('Max Delivery / RIT wajib diisi dan > 0.');
      return;
    }
    if (!Number.isFinite(packQtyValue) || packQtyValue <= 0) {
      alert('SNP / Pack Qty wajib diisi untuk Order Lot Size dan Max Delivery / RIT.');
      return;
    }
    if (!isMultipleOfPack(orderLotValue, packQtyValue)) {
      alert('Order Lot Size harus kelipatan SNP / Pack Qty.');
      return;
    }
    if (!isMultipleOfPack(maxDeliveryValue, packQtyValue)) {
      alert('Max Delivery / RIT harus kelipatan SNP / Pack Qty.');
      return;
    }
    const payload = {
      ...itemMasterForm,
      shelfLifeDays: Number.isFinite(shelfLifeValue) ? Math.max(0, Math.round(shelfLifeValue)) : 0,
      shelfLifeMonths: Number.isFinite(shelfLifeMonthsValue) ? Math.max(0, Math.round(shelfLifeMonthsValue)) : null,
      isSeasonal: !!itemMasterForm.isSeasonal,
      packQty: Number.isFinite(packQtyValue) ? Math.max(0, packQtyValue) : 0,
      orderLotSize: Number.isFinite(orderLotValue) ? Math.max(0, orderLotValue) : 0,
      maxDeliveryPerRit: Number.isFinite(maxDeliveryValue) ? Math.max(0, maxDeliveryValue) : 0,
      suppliers: itemMasterForm.suppliers || [],
      customers: itemMasterForm.customers || [],
    };
    if (masterEditingItemCode) {
      await apiFetch(`/api/master/items/${masterEditingItemCode}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/items', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, item: false }));
      await finalizeMasterSave('Item master berhasil disimpan.');
    };

    const addModelCodeToItemForm = (value) => {
      const trimmed = String(value || '').trim();
      if (!trimmed) return;
      if (!masterModelCodeSet.has(trimmed)) {
        showToastMessage('Model harus dipilih dari master ref model.', '', null, 'error');
        return;
      }
      setItemMasterForm((prev) => {
        const existing = prev.modelCodes || [];
        if (existing.includes(trimmed)) return prev;
        return { ...prev, modelCodes: [...existing, trimmed] };
      });
      setItemModelEntry('');
    };

    const removeModelCodeFromItemForm = (code) => {
      setItemMasterForm((prev) => ({
        ...prev,
        modelCodes: (prev.modelCodes || []).filter((value) => value !== code),
      }));
    };

  const handleSaveLocation = async () => {
    if (!locationForm.id || !locationForm.lineDescription || (!locationForm.areaId && !locationForm.warehouseId)) {
      alert('Kode Lokasi, Tipe Lokasi, dan Area wajib diisi.');
      return;
    }
    const isProcessType = /production\s*line|work\s*center/i.test(String(locationForm.lineDescription || ''));
    if (isProcessType && !String(locationForm.fifoLane || '').trim()) {
      alert('Process Name wajib diisi untuk Production Line / Work Center.');
      return;
    }
    const resolvedCategory = locationForm.category
      || masterCategories?.[0]?.code
      || masterCategoryOptions?.[0]
      || 'Raw Material';
    const payload = {
      ...locationForm,
      category: resolvedCategory,
      machineNote: isProcessType ? locationForm.machineNote : '',
    };
    if (editingLocationId) {
      await apiFetch(`/api/master/locations/${editingLocationId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/locations', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, location: false }));
    await finalizeMasterSave('Location berhasil disimpan.');
  };

  const handleSavePacking = async () => {
    if (!packingForm.code || !packingForm.name) {
      alert('Code dan Name wajib diisi.');
      return;
    }
    const payload = { ...packingForm };
    if (editingPackingCode) {
      await apiFetch(`/api/master/packings/${editingPackingCode}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/packings', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, packing: false }));
    await finalizeMasterSave('Packing berhasil disimpan.');
  };

  const handleSaveCategory = async () => {
    if (!categoryForm.code || !categoryForm.name) {
      alert('Code dan Name wajib diisi.');
      return;
    }
    const payload = { ...categoryForm };
    if (editingCategoryCode) {
      await apiFetch(`/api/master/categories/${editingCategoryCode}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/categories', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, category: false }));
    await finalizeMasterSave('Category berhasil disimpan.');
  };

  const handleSaveModel = async () => {
    if (!modelCatalogForm.code || !modelCatalogForm.name) {
      alert('Code dan Name model wajib diisi.');
      return;
    }
    const payload = { code: modelCatalogForm.code.trim(), name: modelCatalogForm.name.trim() };
    if (editingModelCode) {
      await apiFetch(`/api/master/models/${editingModelCode}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/models', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setModelFormVisible(false);
    const refreshed = await finalizeMasterSave('Model berhasil disimpan.');
    if (!refreshed) return null;
    return payload;
  };

  const handleEditModel = (model) => {
    setModelCatalogForm({ code: model.code, name: model.name });
    setEditingModelCode(model.code);
    setModelFormVisible(true);
  };

  const handleDeleteModel = async (code) => {
    if (!confirm('Hapus model ini?')) return;
    await apiFetch(`/api/master/models/${code}`, { method: 'DELETE' });
    await fetchMasterReferences();
  };

  const handleSaveProcess = async () => {
    if (!processCatalogForm.code || !processCatalogForm.name || !processCatalogForm.processType) {
      alert('Code, Name, dan Process Type wajib diisi.');
      return;
    }
    const normalizeProcessType = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      if (raw.toLowerCase() === 'subcon') return 'Subcon';
      return raw;
    };
    const standardTimeValue = parseFloat(String(processCatalogForm.standardTime || '').replace(',', '.'));
    const normalizeProcessWorkCenter = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const lowered = raw.toLowerCase();
      const match = (masterLocations || []).find((location) => {
        const locationId = String(location.id || '').trim();
        const locationType = String(location.line_description || location.lineDescription || '').trim();
        const fifoLane = String(location.fifo_lane || location.fifoLane || '').trim();
        const aliases = [
          locationId,
          locationType,
          fifoLane,
          `${locationId} - ${locationType}`,
          `${locationId} ? ${locationType}`,
          `${locationId} ? ${locationType}${fifoLane ? ` ? ${fifoLane}` : ''}`,
        ].filter(Boolean);
        return aliases.some((alias) => String(alias).trim().toLowerCase() === lowered);
      });
      return match ? String(match.id || '').trim() : '';
    };
    const normalizedWorkCenter = normalizeProcessWorkCenter(processCatalogForm.workCenter);
    if (!normalizedWorkCenter) {
      alert('Work Center / Production Line harus dipilih dari master ref.');
      return;
    }
    const payload = {
      code: processCatalogForm.code.trim(),
      name: processCatalogForm.name.trim(),
      processType: normalizeProcessType(processCatalogForm.processType),
      appliesToLevel: processCatalogForm.appliesToLevel || 'All',
      workCenter: normalizedWorkCenter,
      sequence: Number.parseInt(String(processCatalogForm.sequence || '').trim(), 10) || 0,
      standardTime: Number.isFinite(standardTimeValue) ? Math.max(0, standardTimeValue) : 0,
    };
    try {
      let savedProcess = null;
      if (editingProcessCode) {
        savedProcess = await apiFetch(`/api/master/processes/${editingProcessCode}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        savedProcess = await apiFetch('/api/master/processes', { method: 'POST', body: JSON.stringify(payload) });
      }
      const nextProcess = savedProcess || {
        code: payload.code,
        name: payload.name,
        process_type: payload.processType,
        applies_to_level: payload.appliesToLevel,
        work_center: payload.workCenter,
        sequence: payload.sequence,
        standard_time: payload.standardTime,
      };
      setMasterProcesses((prev) => {
        const referenceCode = String(editingProcessCode || payload.code || '').trim();
        const resultCode = String(nextProcess.code || payload.code || referenceCode || '').trim();
        const next = (prev || []).filter((process) => {
          const processCode = String(process.code || '').trim();
          return processCode !== referenceCode && processCode !== resultCode;
        });
        return [...next, nextProcess];
      });
      resetMasterForms();
      setProcessFormVisible(false);
      await finalizeMasterSave('Process berhasil disimpan.');
    } catch (error) {
      showToastMessage(error.message || 'Gagal menyimpan process.', '', null, 'error');
    }
  };

  const handleEditProcess = (process) => {
    const resolveProcessWorkCenterValue = (value) => {
      const raw = String(value || '').trim();
      if (!raw) return '';
      const lowered = raw.toLowerCase();
      const match = (masterLocations || []).find((location) => {
        const locationId = String(location.id || '').trim();
        const locationType = String(location.line_description || location.lineDescription || '').trim();
        const fifoLane = String(location.fifo_lane || location.fifoLane || '').trim();
        const aliases = [
          locationId,
          locationType,
          fifoLane,
          `${locationId} - ${locationType}`,
          `${locationId} ? ${locationType}`,
          `${locationId} ? ${locationType}${fifoLane ? ` ? ${fifoLane}` : ''}`,
        ].filter(Boolean);
        return aliases.some((alias) => String(alias).trim().toLowerCase() === lowered);
      });
      return match ? String(match.id || '').trim() : raw;
    };
    setProcessCatalogForm({
      code: process.code || '',
      name: process.name || '',
      processType: process.process_type || process.processType || process.name || '',
      appliesToLevel: process.applies_to_level || process.appliesToLevel || 'All',
      workCenter: resolveProcessWorkCenterValue(process.work_center || process.workCenter || ''),
      sequence: String(process.sequence ?? ''),
      standardTime: String(process.standard_time ?? process.standardTime ?? ''),
    });
    setEditingProcessCode(process.code);
    setProcessFormVisible(true);
  };

  const handleDeleteProcess = async (code) => {
    if (!confirm('Hapus process ini?')) return;
    await apiFetch(`/api/master/processes/${code}`, { method: 'DELETE' });
    await fetchMasterReferences();
  };

  const handleSaveCustomer = async () => {
    if (!customerForm.id || !customerForm.name) {
      alert('Customer ID dan Name wajib diisi.');
      return;
    }
    const leadTimeValue = parseFloat(String(customerForm.leadTimeDays || '').replace(',', '.'));
    const payload = {
      ...customerForm,
      leadTimeDays: Number.isFinite(leadTimeValue) ? Math.max(0, Math.round(leadTimeValue)) : 0,
    };
    if (editingCustomerId) {
      await apiFetch(`/api/master/customers/${editingCustomerId}`, { method: 'PUT', body: JSON.stringify(payload) });
    } else {
      await apiFetch('/api/master/customers', { method: 'POST', body: JSON.stringify(payload) });
    }
    resetMasterForms();
    setMasterFormVisible((prev) => ({ ...prev, customer: false }));
    await finalizeMasterSave('Customer berhasil disimpan.');
  };

  const handleSaveConfig = async (override = null) => {
    const nextConfig = override ? { ...masterConfig, ...override } : masterConfig;
    if (override) {
      setMasterConfig(nextConfig);
    }
    let workingDaysPayload = {};
    if (nextConfig.workingDays) {
      const parsedWorkingDays = parseWorkingDaysInput(nextConfig.workingDays);
      if (!parsedWorkingDays) {
        alert('Format Working Days harus JSON atau list sederhana (contoh: JAN=22, FEB=20).');
        return;
      }
      workingDaysPayload = parsedWorkingDays;
    }
    const payload = {
      fifoMethod: {
        'Raw Material': nextConfig.raw,
        'Indirect Material': nextConfig.indirect,
        Consumable: nextConfig.consumable,
        Subcon: nextConfig.subcon,
      },
      documentNumbering: {
        dnFormat: nextConfig.dnFormat,
        rnFormat: nextConfig.rnFormat,
        sjSubFormat: nextConfig.sjSubFormat,
        prlFormat: nextConfig.prlFormat,
        dnStatusFlow: nextConfig.dnStatusFlow.split(',').map((val) => val.trim()).filter(Boolean),
        qrTextRule: nextConfig.qrTextRule,
        locationPrefixWarehouse: String(nextConfig.locationPrefixWarehouse || '').trim(),
        locationPrefixProduction: String(nextConfig.locationPrefixProduction || '').trim(),
        locationPrefixWorkCenter: String(nextConfig.locationPrefixWorkCenter || '').trim(),
      },
      qcStatus: nextConfig.qcStatus.split(',').map((val) => val.trim()).filter(Boolean),
      holdLocation: nextConfig.holdLocation,
      workingDays: workingDaysPayload,
      kanbanIdFormat: nextConfig.kanbanIdFormat,
      requestIdFormat: nextConfig.requestIdFormat,
    };
    await apiFetch('/api/master/config', { method: 'PUT', body: JSON.stringify(payload) });
    await finalizeMasterSave('Konfigurasi master berhasil disimpan.');
  };

  const openConfigModal = (key) => {
    const baseValue = masterConfig[key] ?? '';
    if (key === 'qcStatus' || key === 'dnStatusFlow') {
      setConfigModalValue(
        String(baseValue)
          .split(',')
          .map((val) => val.trim())
          .filter(Boolean)
      );
    } else {
      setConfigModalValue(baseValue);
    }
    setConfigModalDraft('');
    setConfigModalKey(key);
  };

  const closeConfigModal = () => {
    setConfigModalKey(null);
    setConfigModalValue('');
    setConfigModalDraft('');
  };

  const appendConfigToken = (token) => {
    const base = String(configModalValue || '');
    if (configModalKey === 'qrTextRule') {
      const separator = base.includes(',') ? ',' : '|';
      const next = base ? `${base}${separator}${token}` : token;
      setConfigModalValue(next);
      return;
    }
    const next = base ? `${base}${token}` : token;
    setConfigModalValue(next);
  };

  const handleDeleteMaster = async (path) => {
    if (!window.confirm('Hapus data ini?')) return;
    await apiFetch(path, { method: 'DELETE' });
    await fetchMasterReferences();
  };

  const handleApproveKanban = async (row) => {
    try {
      await apiFetch(`/api/kanban/requests/${row.id}/approve`, { method: 'POST' });
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal approve: ${error.message || 'Unknown error'}`);
    }
  };

  const handleApproveAndCreateDn = async (row) => {
    const setting = kanbanSettingsByCode.get(row.item_code);
    const supplier = setting?.default_supplier || row.supplier || '';
    if (!supplier) {
      alert('Supplier belum ada. Silakan isi supplier dulu.');
      openDnModal(row);
      return;
    }
    const vendorMatch = masterVendors.find(
      (vendor) => String(vendor.id).toLowerCase() === String(supplier).toLowerCase()
        || String(vendor.name).toLowerCase() === String(supplier).toLowerCase()
    );
    if (vendorMatch && vendorMatch.role && vendorMatch.role !== 'Delivery Note') {
      alert(`Vendor ${vendorMatch.name} tidak berperan sebagai Delivery Note.`);
      return;
    }
    const plannedDate = new Date().toISOString().slice(0, 10);
    const ok = window.confirm(`Approve ${getRequestIdLabel(row)} dan buat DN untuk supplier ${supplier}?`);
    if (!ok) return;
    try {
      await apiFetch(`/api/kanban/requests/${row.id}/approve-dn`, {
        method: 'POST',
        body: JSON.stringify({
          dnNumber: null,
          supplier,
          plannedDate,
        }),
      });
      showToastMessage(`Approved & DN dibuat untuk ${supplier}.`);
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
    } catch (error) {
      alert(`Gagal approve/DN: ${error.message || 'Unknown error'}`);
    }
  };

  const handleRejectKanban = async (row) => {
    try {
      await apiFetch(`/api/kanban/requests/${row.id}/reject`, { method: 'POST' });
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal reject: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteKanbanRequest = async (row) => {
    if (!window.confirm(`Hapus request ${getRequestIdLabel(row)}?`)) return;
    try {
      await apiFetch(`/api/kanban/requests/${row.id}`, { method: 'DELETE' });
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal hapus request: ${error.message || 'Unknown error'}`);
    }
  };

  const handleManualRequest = async (e) => {
    e.preventDefault();
    const itemCode = manualRequestForm.itemCode || resolveKanbanItemCode(manualRequestForm.kanbanId);
    if (!itemCode || !manualRequestForm.requestQty || !manualRequestForm.onHand) {
      alert('Item, on hand, dan quantity wajib diisi.');
      return;
    }
    const rawQty = Number(manualRequestForm.requestQty) || 0;
    const nsp = resolveNspForItem(itemCode);
    const normalizedQty = normalizeQtyByNsp(rawQty, itemCode);
    if (nsp > 0 && normalizedQty !== rawQty) {
      showToastMessage(`Qty dibulatkan ke kelipatan NSP ${nsp}: ${rawQty} → ${normalizedQty}.`);
    }
    try {
      await apiFetch('/api/kanban/requests', {
        method: 'POST',
        body: JSON.stringify({
          itemCode,
          requestQty: normalizedQty,
          triggerType: manualRequestForm.triggerType || 'manual',
          notes: manualRequestForm.onHand ? `onHand:${manualRequestForm.onHand}` : null,
        }),
      });
      setShowManualRequestModal(false);
      setManualRequestForm({ kanbanId: '', itemCode: '', triggerType: 'manual', onHand: '', requestQty: '' });
      showToastMessage(`Request manual dibuat untuk ${itemCode} (qty ${normalizedQty}).`);
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal membuat request: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateDn = async (e) => {
    e.preventDefault();
    if (!selectedKanban) return;
    if (!dnForm.supplier || !dnForm.plannedDate) {
      alert('Supplier dan planned date wajib diisi.');
      return;
    }
    const vendor = resolveVendorFromSupplier(dnForm.supplier);
    const scheduleRows = getVendorScheduleRows(vendor);
    if (scheduleRows.length > 0 && !String(dnForm.scheduleIndex || '').trim()) {
      alert('Pilih Rit/Jam terlebih dahulu.');
      return;
    }
    const vendorMatch = masterVendors.find(
      (vendor) => String(vendor.id).toLowerCase() === String(dnForm.supplier).toLowerCase()
        || String(vendor.name).toLowerCase() === String(dnForm.supplier).toLowerCase()
    );
    if (vendorMatch && vendorMatch.role && vendorMatch.role !== 'Delivery Note') {
      alert(`Vendor ${vendorMatch.name} tidak berperan sebagai Delivery Note.`);
      return;
    }
    try {
      await apiFetch(`/api/kanban/requests/${selectedKanban.id}/create-dn`, {
        method: 'POST',
        body: JSON.stringify({
          ...dnForm,
          dnNumber: dnForm.dnNumber?.trim() || null,
          remarks: dnForm.remarks?.trim() || null,
          deliveryScheduleIndex: dnForm.scheduleIndex,
        }),
      });
      setShowDnModal(false);
      setSelectedKanban(null);
      setDnForm({ dnNumber: '', supplier: '', plannedDate: '', remarks: '', scheduleIndex: '', cycle: '', rit: '', deliveryTime: '' });
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
    } catch (error) {
      alert(`Gagal membuat DN: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    const dnId = selectedKanban?.dn_id ?? selectedKanban?.id;
    if (!dnId) return;
    try {
      await apiFetch(`/api/dn/${dnId}/create-schedule`, {
        method: 'POST',
        body: JSON.stringify({
          ...scheduleForm,
          requestId: selectedKanban?.request_id ?? (selectedKanban?.item_code ? selectedKanban.id : undefined),
        }),
      });
      setShowScheduleModal(false);
      setSelectedKanban(null);
      setScheduleForm({ poNumber: '', requestDate: '', deliveryTime: '' });
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
    } catch (error) {
      alert(`Gagal membuat schedule: ${error.message || 'Unknown error'}`);
    }
  };

  const handleReceive = async (e) => {
    e.preventDefault();
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    if (!selectedKanban?.schedule_id) return;
    if (!receiveForm.receivedQty || !receiveForm.arrivalDate || !receiveForm.docQty) {
      alert('Qty dokumen, qty fisik, dan tanggal tiba wajib diisi.');
      return;
    }
    const itemCode = selectedKanban?.item_code || selectedKanban?.item || '';
    const masterItem = masterItemsByCode.get(itemCode);
    const shelfLifeMonths = Number(masterItem?.shelf_life_months ?? 0);
    if (shelfLifeMonths > 0 && !receiveForm.productionDate) {
      alert('Production Date wajib diisi untuk item dengan Shelf Life.');
      return;
    }
    const rawReceived = Number(receiveForm.receivedQty) || 0;
    const rawDoc = Number(receiveForm.docQty) || 0;
    const nsp = resolveNspForItem(itemCode);
    if (nsp > 0 && rawReceived > 0 && rawReceived % nsp !== 0) {
      const ok = window.confirm(`Qty yang diterima (${rawReceived}) tidak sesuai Standar Packing (${nsp}). Apakah Anda yakin melanjutkan penerimaan Loose Item?`);
      if (!ok) return;
    }
    try {
      await apiFetch(`/api/schedules/${selectedKanban.schedule_id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          rnNumber: receiveForm.rnNumber?.trim() || null,
          doNumber: receiveForm.doNumber || null,
          arrivalDate: receiveForm.arrivalDate,
          productionDate: receiveForm.productionDate || null,
          expiredDate: receiveForm.expiredDate || null,
          receivedQty: rawReceived,
          docQty: rawDoc,
          qcStatus: receiveForm.qcStatus,
        }),
      });
      setShowReceiveModal(false);
      setSelectedKanban(null);
      setReceiveForm({ rnNumber: '', doNumber: '', arrivalDate: '', productionDate: '', expiredDate: '', receivedQty: '', docQty: '', qcStatus: 'ok' });
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
      await fetchReceiveNotes();
      await fetchItems();
    } catch (error) {
      alert(`Gagal receive: ${error.message || 'Unknown error'}`);
    }
  };

  const handleUpdateKanbanStatus = async (row, nextStatus) => {
    try {
      await apiFetch(`/api/kanban/requests/${row.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      await fetchKanbanRequests();
    } catch (error) {
      alert(`Gagal update status: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDropKanban = async (row, targetStatus) => {
    if (!row || row.status === targetStatus) return;
    if (targetStatus === 'approved') {
      await handleApproveKanban(row);
      return;
    }
    if (targetStatus === 'rejected') {
      await handleRejectKanban(row);
      return;
    }
    if (targetStatus === 'dn_created') {
      if (!row.dn_id) {
        openDnModal(row);
        return;
      }
    }
    if (targetStatus === 'scheduled') {
      if (!row.schedule_id) {
        openScheduleModal(row);
        return;
      }
    }
    if (targetStatus === 'receiving') {
      if (row.schedule_id) {
        openReceiveModal(row);
        return;
      }
    }
    if (targetStatus === 'closed') {
      await apiFetch(`/api/kanban/requests/${row.id}/close`, { method: 'POST' });
      await fetchKanbanRequests();
      return;
    }
    await handleUpdateKanbanStatus(row, targetStatus);
  };

  const openDnModal = (row) => {
    const setting = kanbanSettings.find((item) => item.item_code === row.item_code);
    const today = new Date().toISOString().slice(0, 10);
    const supplierValue = setting?.default_supplier || '';
    const vendor = resolveVendorFromSupplier(supplierValue);
    const scheduleRows = getVendorScheduleRows(vendor);
    const firstSchedule = scheduleRows[0] || {};
    setSelectedKanban(row);
    setDnForm({
      dnNumber: '',
      supplier: supplierValue,
      plannedDate: today,
      remarks: '',
      scheduleIndex: scheduleRows.length > 0 ? '0' : '',
      cycle: firstSchedule.cycle || '',
      rit: firstSchedule.rit || '',
      deliveryTime: firstSchedule.time || '',
    });
    setShowDnModal(true);
  };

  const openScheduleModal = (row) => {
    const today = new Date().toISOString().slice(0, 10);
    const planned = row?.planned_date || row?.plannedDate || today;
    setSelectedKanban(row);
    setScheduleForm({
      poNumber: '',
      requestDate: planned,
      deliveryTime: '',
    });
    setShowScheduleModal(true);
  };

  const openReceiveModal = (row) => {
    const today = new Date().toISOString().slice(0, 10);
    setSelectedKanban(row);
    setReceiveForm({
      rnNumber: '',
      doNumber: '',
      arrivalDate: today,
      productionDate: '',
      expiredDate: '',
      receivedQty: row.request_qty || '',
      docQty: row.request_qty || '',
      qcStatus: 'ok',
    });
    setShowReceiveModal(true);
  };

  const resolveVendorFromSupplier = (supplierValue) => {
    if (!supplierValue) return null;
    const direct = masterVendorsById.get(supplierValue);
    if (direct) return direct;
    return masterVendorsLookup.get(String(supplierValue).trim().toLowerCase()) || null;
  };

  function normalizeDeliveryScheduleRows(input) {
    let rows = input;
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch (error) {
        return [];
      }
    }
    if (typeof rows === 'string') {
      try {
        rows = JSON.parse(rows);
      } catch (error) {
        return [];
      }
    }
    if (!Array.isArray(rows)) return [];
    return rows
      .map((row) => {
        const ritRaw = row?.rit ?? row?.RIT ?? row?.rit_no ?? row?.ritNo ?? '';
        const ritValue = ritRaw !== null && ritRaw !== undefined ? String(ritRaw).trim() : '';
        const timeValue = String(row?.time ?? row?.delivery_time ?? row?.deliveryTime ?? '').trim();
        const cycleValue = String(row?.cycle ?? '').trim();
        return {
          rit: ritValue,
          time: timeValue,
          cycle: cycleValue,
        };
      })
      .filter((row) => row.rit || row.time || row.cycle);
  }

  function getVendorScheduleRows(vendor) {
    if (!vendor) return [];
    const schedule = normalizeDeliveryScheduleRows(vendor.delivery_schedule || vendor.deliverySchedule);
    if (schedule.length > 0) return schedule;
    const legacy = {
      rit: String(vendor.rit ?? '').trim(),
      time: String(vendor.delivery_time ?? vendor.deliveryTime ?? '').trim(),
      cycle: String(vendor.cycle ?? '').trim(),
    };
    return normalizeDeliveryScheduleRows([legacy]);
  }

  const openVendorDetail = (vendor) => {
    if (!vendor) return;
    setMainTab('masterref');
    setMasterRefTab('vendor');
    const scheduleRows = getVendorScheduleRows(vendor);
    setVendorForm({
      id: vendor.id,
      name: vendor.name,
      type: vendor.type || 'Supplier',
      role: vendor.role || 'Delivery Note',
      email: vendor.email || '',
      leadTimeDays: String(vendor.lead_time_days ?? ''),
      dailyCapacityQty: String(vendor.daily_capacity_qty ?? ''),
      deliverySchedule: scheduleRows,
    });
    setEditingVendorId(vendor.id);
    setMasterFormVisible((prev) => ({ ...prev, vendor: true }));
  };

  const openDnDetailModal = async (dn, editable = false) => {
    if (!dn?.id) return;
    setSelectedDnDetail(dn);
    setDnDetailEditable(Boolean(editable));
    setShowDnDetailModal(true);
    setDnDetailLoading(true);
    try {
      const rows = await apiFetch(`/api/kanban/requests?dnId=${dn.id}`);
      setDnDetailRows(rows);
      const nextEdits = {};
      rows.forEach((row) => {
        nextEdits[row.id] = row.request_qty;
      });
      setDnDetailEdits(nextEdits);
    } catch (error) {
      alert(error.message || 'Gagal memuat detail DN.');
    } finally {
      setDnDetailLoading(false);
    }
  };

  const handleDnDetailSave = async () => {
    if (!selectedDnDetail?.id) return;
    const updates = dnDetailRows.filter((row) => {
      const nextValue = Number(dnDetailEdits[row.id]);
      return Number.isFinite(nextValue) && Number(nextValue) !== Number(row.request_qty);
    });
    if (updates.length === 0) {
      closeDnDetailModal();
      return;
    }
    try {
      for (const row of updates) {
        await apiFetch(`/api/kanban/requests/${row.id}/qty`, {
          method: 'PUT',
          body: JSON.stringify({ requestQty: Number(dnDetailEdits[row.id]) }),
        });
      }
      closeDnDetailModal();
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
    } catch (error) {
      alert(error.message || 'Gagal menyimpan perubahan DN.');
    }
  };

  const handleForceCloseDn = async (dn) => {
    if (!dn?.id) return;
    const label = dn.dn_number || dn.id;
    const ok = window.confirm(`Force close DN ${label}?`);
    if (!ok) return;
    try {
      const updated = await apiFetch(`/api/delivery-notes/${dn.id}/force-close`, { method: 'POST' });
      setSelectedDnDetail((prev) => (
        prev && prev.id === dn.id ? { ...prev, ...updated } : prev
      ));
      await fetchDeliveryNotes();
      alert('DN berhasil ditutup.');
    } catch (error) {
      alert(error.message || 'Gagal force close DN.');
    }
  };

  const closeDnDetailModal = () => {
    setShowDnDetailModal(false);
    setSelectedDnDetail(null);
    setDnDetailRows([]);
    setDnDetailEdits({});
  };

  const handleDeleteDn = async (dn) => {
    if (!dn?.id) return;
    if (!window.confirm(`Hapus DN ${dn.dn_number}?`)) return;
    try {
      await apiFetch(`/api/dn/${dn.id}`, { method: 'DELETE' });
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
    } catch (error) {
      alert(error.message || 'Gagal menghapus DN.');
    }
  };

  const closeDnPrintModal = () => {
    setShowDnPrintModal(false);
    setDnPrintPayload(null);
    setDnPrintAuto(false);
    setDnPrintLoading(false);
  };

  const publishDnIfDraft = async (dn) => {
    if (!dn?.id) return dn;
    const statusValue = String(dn.status || '').toLowerCase();
    if (statusValue !== 'draft') return dn;
    const updated = await apiFetch(`/api/dn/${dn.id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'open' }),
    });
    await fetchDeliveryNotes();
    return updated || dn;
  };

  const buildDnPrintPayload = (dn, itemRows = [], requestRows = [], cardRows = []) => {
    const vendor = resolveVendorFromSupplier(dn?.supplier);
    const supplierName = vendor?.name || dn?.supplier || '-';
    const supplierEmail = vendor?.email || '';
    const supplierCode = vendor?.id || '';

    const primaryDelivery = masterDeliveries[0] || null;
    const deliveryArea = masterAreas.find((area) => area.id === primaryDelivery?.area_id) || null;
    const deliveryPlant = masterPlants.find((plant) => plant.id === deliveryArea?.plant_id) || masterPlants[0] || null;

    const formatDateLabel = (value) => {
      if (!value) return '-';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '-';
      return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const requestLabels = Array.from(new Set(requestRows.map((row) => getRequestIdLabel(row)).filter(Boolean)));
    const referenceLabel = requestLabels.length <= 2
      ? requestLabels.join(', ')
      : `${requestLabels[0]} +${requestLabels.length - 1} lainnya`;

    const dnCycle = String(dn?.cycle || '').trim();
    const dnRit = String(dn?.rit || '').trim();
    const dnTime = String(dn?.delivery_time || dn?.deliveryTime || '').trim();
    const vendorSchedule = getVendorScheduleRows(vendor);
    const fallbackSchedule = vendorSchedule[0] || {};
    const cycleLabel = dnCycle || fallbackSchedule.cycle || '-';
    const ritLabel = dnRit || fallbackSchedule.rit || '-';
    const timeLabel = dnTime || fallbackSchedule.time || '-';

    const requestCodeByItem = new Map();
    requestRows.forEach((row) => {
      const code = row.item_code || '';
      if (!code) return;
      if (!requestCodeByItem.has(code)) {
        requestCodeByItem.set(code, row.request_code || row.requestCode || '');
      }
    });

    const sourceItems = itemRows.length > 0 ? itemRows : requestRows;
    const items = sourceItems.map((row, index) => {
      const itemCode = row.item_code || '';
      const masterItem = masterItemsByCode.get(itemCode);
      const partNo = row.part_no || masterItem?.part_no || masterItem?.partNo || '-';
      const partName = row.item_name || masterItem?.name || '-';
      const packQtyRaw = row.pack_qty ?? resolveNspForItem(itemCode);
      const packQty = Number.isFinite(Number(packQtyRaw)) ? Number(packQtyRaw) : 0;
      const unit = row.unit || row.item_unit || masterItem?.unit || '-';
      const typePack = row.type_pack || masterItem?.type_pack || '-';
      const packing = row.packing_name || packingNameByCode.get(typePack) || typePack || '-';
      const orderUnit = Number(row.request_qty || 0);
      const orderKbn = packQty > 0 ? orderUnit / packQty : 0;
      const dropZoneRaw = row.drop_zone || kanbanSettingsByCode.get(itemCode)?.drop_zone || '';
      return {
        no: index + 1,
        uniq: itemCode || '-',
        partNo,
        partName,
        packing,
        qtyKbn: packQty > 0 ? packQty : null,
        unit,
        orderUnit,
        orderKbn,
        dropZone: String(dropZoneRaw || '').trim() || '-',
        requestCode: row.request_code || requestCodeByItem.get(itemCode) || '',
      };
    });

    const totals = items.reduce(
      (acc, row) => {
        acc.orderUnit += Number(row.orderUnit || 0);
        acc.orderKbn += Number(row.orderKbn || 0);
        return acc;
      },
      { orderUnit: 0, orderKbn: 0 },
    );

    const primaryDropZone = items.find((item) => item.dropZone && item.dropZone !== '-')?.dropZone || '-';
    const areaLabel = primaryDropZone;
    const deliveryAddress = primaryDelivery?.address || deliveryPlant?.site || masterPlants[0]?.site || '-';
    const companyName = deliveryPlant?.name || masterPlants[0]?.name || '-';
    const recipientLabel = 'PPIC / Receiving Warehouse';

    return {
      sourceDn: dn,
      dnNumber: dn?.dn_number || '-',
      referenceLabel,
      supplierName,
      supplierCode,
      supplierEmail,
      dateLabel: formatDateLabel(dn?.created_at || dn?.planned_date),
      deliveryDateLabel: formatDateLabel(dn?.planned_date),
      deliveryAddress,
      recipientLabel,
      areaLabel,
      cycleLabel,
      timeLabel,
      ritLabel,
      companyName,
      qrValue: dn?.dn_number || '',
      remarksText: dn?.remarks || '',
      items,
      cards: Array.isArray(cardRows) ? cardRows : [],
      totals,
    };
  };

  const openDnPrintPreview = async (dn, { autoPrint = false, mode = 'dn' } = {}) => {
    if (!dn?.id) return;
    setDnPrintLoading(true);
    setShowDnPrintModal(true);
    setDnPrintAuto(Boolean(autoPrint));
    setDnPrintMode(mode);
    try {
      const resolvedDn = autoPrint ? await publishDnIfDraft(dn) : dn;
      let itemRows = [];
      try {
        itemRows = await apiFetch(`/api/delivery-notes/${dn.id}/items`);
      } catch (error) {
        itemRows = [];
      }
      const requestRows = await apiFetch(`/api/kanban/requests?dnId=${dn.id}`);
      let cardRows = [];
      try {
        cardRows = await apiFetch(`/api/delivery-notes/${dn.id}/kanban-cards`);
      } catch (error) {
        cardRows = [];
      }
      const payload = buildDnPrintPayload(resolvedDn || dn, itemRows || [], requestRows || [], cardRows || []);
      setDnPrintPayload(payload);
    } catch (error) {
      alert(error.message || 'Gagal memuat detail DN.');
      closeDnPrintModal();
    } finally {
      setDnPrintLoading(false);
    }
  };

  const handleDnPreview = async (dn) => {
    await openDnPrintPreview(dn, { autoPrint: false, mode: 'dn' });
  };

  const handleDnPrintPdf = async (dn) => {
    await openDnPrintPreview(dn, { autoPrint: true, mode: 'dn' });
  };

  const handleDnPrintKanban = async (dn) => {
    await openDnPrintPreview(dn, { autoPrint: false, mode: 'cards' });
  };

  const formatPrintDateCode = (dateValue = new Date()) => {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    const day = String(date.getDate()).padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    return `${day}${month}`;
  };

  const buildPrintFileName = (prefix, refValue) => {
    const ref = String(refValue || '')
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, '')
      .replace(/-+/g, '-')
      .trim();
    const dateCode = formatPrintDateCode();
    return `${prefix}-${ref || 'DOC'}-${dateCode}`;
  };

  const handleDnEmail = async (dn) => {
    if (!dn?.id) return;
    try {
      const resolvedDn = await publishDnIfDraft(dn);
      let itemRows = [];
      try {
        itemRows = await apiFetch(`/api/delivery-notes/${dn.id}/items`);
      } catch (error) {
        itemRows = [];
      }
      const payload = buildDnPrintPayload(resolvedDn || dn, itemRows || [], []);
      const subject = `Delivery Note ${payload.dnNumber}`;
      let body = `Yth. ${payload.supplierName},\n\n`;
      body += `Berikut Delivery Note ${payload.dnNumber}.\n`;
      body += `Tanggal: ${payload.dateLabel}\n`;
      body += `Delivery: ${payload.deliveryDateLabel}\n`;
      body += `Area: ${payload.areaLabel}\n`;
      body += `Recipient: ${payload.recipientLabel || 'PPIC / Receiving Warehouse'}\n\n`;
      body += `Detail Item:\n`;
      payload.items.forEach((item, idx) => {
        const qty = Number.isFinite(Number(item.orderUnit)) ? formatNumber0(item.orderUnit) : item.orderUnit || '-';
        body += `${idx + 1}. ${item.uniq} - ${item.partNo} ${item.partName} | Qty ${qty} ${item.unit}\n`;
      });
      const totalQty = Number.isFinite(Number(payload.totals.orderUnit))
        ? formatNumber0(payload.totals.orderUnit)
        : payload.totals.orderUnit || '-';
      body += `\nTotal: ${totalQty}\n\nTerima kasih.`;
      if (payload.remarksText) {
        body += `\n\nRemarks: ${payload.remarksText}`;
      }
      const email = payload.supplierEmail || '';
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    } catch (error) {
      alert(error.message || 'Gagal menyiapkan email DN.');
    }
  };

  useEffect(() => {
    if (!showDnPrintModal || !dnPrintAuto || dnPrintLoading || !dnPrintPayload) return;
    const hasItems = Array.isArray(dnPrintPayload.items) ? dnPrintPayload.items.length > 0 : true;
    if (!hasItems) return;
    setDnPrintAuto(false);
    let timer;
    const raf = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        const originalTitle = document.title;
        const filename = buildPrintFileName('DN', dnPrintPayload?.dnNumber);
        document.title = filename;
        const cleanup = () => {
          document.title = originalTitle;
          window.removeEventListener('afterprint', cleanup);
        };
        window.addEventListener('afterprint', cleanup);
        window.print();
      }, 600);
    });
    return () => {
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, [showDnPrintModal, dnPrintAuto, dnPrintLoading, dnPrintPayload]);

  const openQrModal = (row) => {
    const code = row?.item_code || row?.itemCode || '';
    const name = row?.item_name || row?.itemName || code;
    const category = row?.item_type || row?.type || '';
    const kanbanId = buildKanbanId(code, category);
    const { separator, tokens } = getQrRuleConfig();
    const tokenValues = {
      kanban_id: kanbanId,
      kanban: kanbanId,
      kanbanid: kanbanId,
      item: code,
      qty: row?.lot_qty || row?.lotQty || row?.min_qty || row?.minQty || '',
      area: row?.area || '',
      cycle: row?.cycle || '',
      rit: row?.rit || '',
      time: row?.time || '',
    };
    let payload = '';
    if (tokens.length > 0) {
      payload = tokens.map((token) => tokenValues[token.toLowerCase()] ?? '').join(separator);
    } else {
      payload = kanbanId;
    }
    setQrPayload(payload);
    setQrTitle(name || 'Kanban Item');
    setShowQrModal(true);
  };

  function resolveKanbanItemCode(kanbanId) {
    if (!kanbanId) return '';
    const trimmed = String(kanbanId).trim();
    if (masterItemsByCode.has(trimmed)) return trimmed;
    const format = requireConfigFormat(masterConfig.kanbanIdFormat, 'Kanban ID format');
    if (!format) return trimmed;
    const regex = buildKanbanIdRegex(format);
    const match = trimmed.match(regex);
    if (match?.groups?.uniq) {
      return match.groups.uniq;
    }
    const separatorMatch = trimmed.match(/^(.+?)[-_\/](\d+)(?:[-_\/].*)?$/);
    if (separatorMatch?.[1] && masterItemsByCode.has(separatorMatch[1])) {
      return separatorMatch[1];
    }
    const lastDash = trimmed.lastIndexOf('-');
    if (lastDash > 0) {
      const prefix = trimmed.slice(0, lastDash).trim();
      if (masterItemsByCode.has(prefix)) return prefix;
    }
    return trimmed;
  }

  const extractAreaNote = (notes) => {
    if (!notes) return '-';
    const match = String(notes).match(/area:s*([^|]+)/i);
    return match ? match[1].trim() : '-';
  };

  const extractKanbanIdNote = (notes) => {
    if (!notes) return '';
    const match = String(notes).match(/kanban:s*([^|]+)/i);
    return match ? match[1].trim() : '';
  };

  const getQrRuleConfig = () => {
    const rule = String(masterConfig.qrTextRule || '').trim();
    if (!rule) {
      return { separator: '|', tokens: [] };
    }
    const match = rule.match(/[|,;/]/);
    const separator = match ? match[0] : '|';
    const tokens = rule.split(separator).map((token) => token.trim()).filter(Boolean);
    return { separator, tokens };
  };

  const parseScanLine = (line) => {
    if (!line) return null;
    const { separator, tokens } = getQrRuleConfig();
    if (!line.includes(separator) && !line.includes(':')) {
      return { kanbanId: line, item: '', qty: '', area: '' };
    }
    let parts = {};
    if (line.includes(':')) {
      parts = Object.fromEntries(
        line.split(separator).map((chunk) => {
          const [key, ...rest] = chunk.split(':');
          return [String(key || '').trim().toLowerCase(), rest.join(':').trim()];
        }),
      );
    } else if (tokens.length > 0) {
      const values = line.split(separator).map((val) => val.trim());
      parts = Object.fromEntries(tokens.map((token, index) => [token.toLowerCase(), values[index] || '']));
    }
    return {
      kanbanId: parts.kanban_id || parts.kanban || parts.kanbanid || parts.kanban_id || line,
      item: parts.item || '',
      qty: parts.qty || '',
      area: parts.area || '',
    };
  };

  const buildScanResult = (payload, index = 0) => {
    const code = resolveKanbanItemCode(payload.kanbanId);
    const setting = kanbanSettingsByCode.get(code);
    const item = itemsByCode.get(code);
    const masterItem = masterItemsByCode.get(code);
    const masterLocation = masterLocationsById.get(masterItem?.location_id);
    const actionMeta = resolveKanbanActionMeta(masterItem?.type || setting?.item_type || item?.type || payload.category || '');
    const stock = Number(fifoTotalsByItemCode.get(code) ?? 0);
    const min = Number(masterItem?.safety_stock ?? 0);
    const max = Number(setting?.max_qty ?? 0);
    const status = stock < min ? 'Critical' : 'Normal';
    return {
      id: index + 1,
      kanbanId: payload.kanbanId,
      itemCode: code,
      itemName: masterItem?.name || item?.name || payload.item || '-',
      qty: payload.qty || setting?.lot_qty || setting?.min_qty || '-',
      stock,
      min,
      max,
      status,
      itemCategoryCode: actionMeta.categoryCode,
      itemCategoryLabel: actionMeta.categoryLabel,
      actionType: actionMeta.actionType,
      actionLabel: actionMeta.actionLabel,
      actionHint: actionMeta.actionHint,
      nextDestination: actionMeta.nextDestination,
      scannedAt: new Date().toISOString(),
      category: getCategoryLabel(setting?.item_type || ''),
      location: masterLocation?.id || masterLocation?.name || '-',
    };
  };

  const fetchScanPreview = async (payload, index = 0) => {
    const fallback = buildScanResult(payload, index);
    try {
      const data = await apiFetch('/api/kanban/scan-preview', {
        method: 'POST',
        body: JSON.stringify({
          kanbanId: payload.kanbanId || '',
          itemCode: payload.item || fallback.itemCode || '',
          qty: payload.qty || '',
          area: payload.area || '',
        }),
      });
      return {
        ...fallback,
        ...data,
        currentPosition: data.currentPosition || fallback.currentPosition,
        nextProcess: data.nextProcess || fallback.nextProcess,
        routingSteps: Array.isArray(data.routingSteps) ? data.routingSteps : [],
      };
    } catch (error) {
      return {
        ...fallback,
        scanPreviewError: error.message || 'Gagal mengambil preview routing.',
      };
    }
  };

  const refreshScanPreviewResult = async (result) => {
    if (!result?.kanbanId) return result;
    const refreshed = await fetchScanPreview({
      kanbanId: result.kanbanId,
      item: result.itemCode || '',
      qty: result.qty || '',
      area: result.area || '',
    }, Number(result.id || 1) - 1);
    setScanActiveResult(refreshed);
    setScanResults((prev) => prev.map((row) => (row.id === result.id ? refreshed : row)));
    return refreshed;
  };

  const handleKanbanProcessStart = async (result) => {
    if (!result?.kanbanId) {
      return { ok: false, reason: 'Kanban ID tidak valid.' };
    }
    try {
      await apiFetch('/api/kanban/process/start', {
        method: 'POST',
        body: JSON.stringify({
          kanbanId: result.kanbanId,
          itemCode: result.itemCode || '',
          qty: result.qty || '',
          area: result.area || '',
        }),
      });
      await refreshScanPreviewResult(result);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message || 'Gagal start proses.' };
    }
  };

  const handleKanbanProcessFinish = async (result) => {
    if (!result?.kanbanId) {
      return { ok: false, reason: 'Kanban ID tidak valid.' };
    }
    try {
      await apiFetch('/api/kanban/process/finish', {
        method: 'POST',
        body: JSON.stringify({
          kanbanId: result.kanbanId,
          itemCode: result.itemCode || '',
          qty: result.qty || '',
          area: result.area || '',
        }),
      });
      await refreshScanPreviewResult(result);
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message || 'Gagal finish proses.' };
    }
  };

  const createRequestFromScan = async (result) => {
    if (!result?.itemCode) {
      return { ok: false, reason: 'ID kanban tidak valid.' };
    }
    const setting = kanbanSettingsByCode.get(result.itemCode);
    if (!setting) {
      return { ok: false, reason: 'ID kanban tidak ditemukan di Master Kanban.' };
    }
    const qty = Number(setting.lot_qty || setting.min_qty || 0);
    if (!qty) {
      return { ok: false, reason: 'Kanban qty belum diatur.' };
    }
    try {
      await apiFetch('/api/kanban/requests', {
        method: 'POST',
        body: JSON.stringify({
          itemCode: result.itemCode,
          requestQty: qty,
          triggerType: 'scan',
          notes: 'scan',
        }),
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message || 'Gagal membuat request.' };
    }
  };

  const consumeStockFromScan = async (result, qtyOverride) => {
    if (isStockOpnameLocked) {
      return { ok: false, reason: 'Selesaikan dulu Stock Opname!' };
    }
    const itemCode = result?.itemCode;
    if (!itemCode) {
      return { ok: false, reason: 'Item belum terdeteksi.' };
    }
    const setting = kanbanSettingsByCode.get(itemCode);
    const qtyValue = Number((qtyOverride ?? result?.qty) || 0) || Number(setting?.lot_qty || setting?.min_qty || 0);
    if (!qtyValue) {
      return { ok: false, reason: 'Qty belum valid.' };
    }
    try {
      await apiFetch('/api/stock/consume', {
        method: 'POST',
        body: JSON.stringify({ itemCode, qty: qtyValue }),
      });
      await fetchItems();
      await fetchKanbanRequests();
      return { ok: true };
    } catch (error) {
      return { ok: false, reason: error.message || 'Gagal keluarkan material.' };
    }
  };

  const handleEmptyKanbanSubmit = async (e) => {
    e.preventDefault();
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    const code = resolveKanbanItemCode(emptyKanbanForm.kanbanId);
    if (!code) {
      alert('ID Kanban wajib diisi.');
      return;
    }
    if (emptyKanbanForm.area && !masterAreas.some((area) => area.id === emptyKanbanForm.area)) {
      alert('Area tidak valid. Pilih dari Master Referensi.');
      return;
    }
    const setting = kanbanSettingsByCode.get(code);
    if (!setting) {
      alert('ID Kanban tidak ditemukan di Master Kanban.');
      return;
    }
    const qty = Number(setting.lot_qty || setting.min_qty || 0);
    if (!qty) {
      alert('Kanban qty belum diatur.');
      return;
    }
    try {
      const result = await apiFetch('/api/kanban/empty', {
        method: 'POST',
        body: JSON.stringify({
          itemCode: code,
          requestQty: qty,
          area: emptyKanbanForm.area || null,
          kanbanId: emptyKanbanForm.kanbanId || null,
        }),
      });
      setEmptyKanbanForm({ area: '', kanbanId: '' });
      const consumedQty = Number(result?.consumedQty ?? qty);
      const consumedBatches = Number(result?.consumedBatches ?? result?.updatedLots ?? 0);
      const stockNote = `Stok terpotong ${formatNumber0(consumedQty)}${consumedBatches ? ` (${consumedBatches} lot)` : ''}.`;
      if (result?.notice) {
        showToastMessage(`${stockNote} ${result.notice}`);
      } else if (result?.requestCreated) {
        showToastMessage(`Kanban kosong diproses. ${stockNote} Request dibuat.`);
      } else {
        showToastMessage(`Kanban kosong diproses. ${stockNote} Request sudah ada.`);
      }
      await fetchKanbanRequests();
      await fetchItems();
    } catch (error) {
      alert(`Gagal catat kanban kosong: ${error.message || 'Unknown error'}`);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    if (batchForm.area && !masterAreas.some((area) => area.id === batchForm.area)) {
      alert('Area tidak valid. Pilih dari Master Referensi.');
      return;
    }
    const ids = batchForm.kanbanIds
      .split(/r?n|,/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (ids.length === 0) {
      alert('Masukkan minimal 1 ID kanban.');
      return;
    }
    const failed = [];
    const notices = [];
    for (const id of ids) {
      const code = resolveKanbanItemCode(id);
      const setting = kanbanSettingsByCode.get(code);
      const qty = Number(setting?.lot_qty || setting?.min_qty || 0);
      if (!setting || !qty) {
        failed.push(id);
        continue;
      }
      try {
        const result = await apiFetch('/api/kanban/empty', {
          method: 'POST',
          body: JSON.stringify({
            itemCode: code,
            requestQty: qty,
            area: batchForm.area || null,
            kanbanId: id,
          }),
        });
        if (result?.notice) {
          const consumedQty = Number(result?.consumedQty ?? qty);
          const consumedBatches = Number(result?.consumedBatches ?? result?.updatedLots ?? 0);
          const stockNote = `Stok terpotong ${formatNumber0(consumedQty)}${consumedBatches ? ` (${consumedBatches} lot)` : ''}.`;
          notices.push(`${id}: ${stockNote} ${result.notice}`);
        }
      } catch (_error) {
        failed.push(id);
      }
    }
    setShowBatchModal(false);
    setBatchForm({ area: '', kanbanIds: '' });
    await fetchKanbanRequests();
    await fetchItems();
    if (failed.length > 0) {
      alert(`Sebagian gagal diproses: ${failed.join(', ')}`);
    }
    if (notices.length > 0) {
      showToastMessage(notices.join('n'));
    }
  };

  const handlePrintInboundCards = async (scheduleIds) => {
    const ids = Array.isArray(scheduleIds) ? scheduleIds : [];
    if (ids.length === 0) {
      alert('Pilih jadwal terlebih dahulu.');
      return;
    }
    try {
      const params = new URLSearchParams();
      params.set('scheduleIds', ids.join(','));
      const rows = await apiFetch(`/api/inbound-cards?${params.toString()}`);
      if (!rows || rows.length === 0) {
        alert('Belum ada kartu inbound untuk jadwal ini.');
        return;
      }
      setInboundCardPrintRows(rows);
      setShowInboundCardModal(true);
    } catch (error) {
      alert(`Gagal memuat kartu inbound: ${error.message || 'Unknown error'}`);
    }
  };

  const handleInboundCardScanSubmit = async () => {
    const value = inboundCardScanValue.trim();
    if (!value) {
      showToastMessage('Masukkan ID kartu inbound.');
      return;
    }
    setInboundCardScanLoading(true);
    try {
      const result = await apiFetch('/api/inbound-cards/scan', {
        method: 'POST',
        body: JSON.stringify({ cardUid: value }),
      });
      const qty = Number(result?.card?.card_qty || 0);
      const rn = result?.receiveNote?.rn_number || '';
      showToastMessage(`Inbound diterima. RN ${rn} dibuat. +${formatNumber0(qty)}.`);
      setInboundCardScanValue('');
      await refreshSchedules();
      await refreshAllSchedules();
      await fetchReceiveNotes();
      await fetchItems();
    } catch (error) {
      const message = error.message || 'Gagal scan inbound card.';
      const lowered = String(message).toLowerCase();
      const tone = ['melebihi', 'over', 'sisa po', 'over-receive', 'over receive', 'exceed'].some((key) => lowered.includes(key))
        ? 'error'
        : 'auto';
      showToastMessage(message, '', null, tone);
    } finally {
      setInboundCardScanLoading(false);
    }
  };

  const openInboundCardAdjustModal = (schedule) => {
    if (!schedule) return;
    setInboundCardAdjustSchedule(schedule);
    setInboundCardAdjustTarget(String(schedule.requestQty || ''));
    setInboundCardAdjustOpen(true);
  };

  const handleInboundCardAdjustSubmit = async () => {
    if (!inboundCardAdjustSchedule) return;
    const qtyValue = Number(inboundCardAdjustTarget);
    if (!Number.isFinite(qtyValue) || qtyValue <= 0) {
      showToastMessage('Target qty tidak valid.');
      return;
    }
    setInboundCardAdjustLoading(true);
    try {
      await apiFetch('/api/inbound-cards/adjust', {
        method: 'POST',
        body: JSON.stringify({ scheduleId: inboundCardAdjustSchedule.id, targetQty: qtyValue }),
      });
      showToastMessage('Kartu inbound disesuaikan.');
      setInboundCardAdjustOpen(false);
      setInboundCardAdjustSchedule(null);
      setInboundCardAdjustTarget('');
    } catch (error) {
      showToastMessage(error.message || 'Gagal menyesuaikan kartu.');
    } finally {
      setInboundCardAdjustLoading(false);
    }
  };

  const handleProcessScan = async () => {
    const lines = scanInput
      .split(/r?n/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setScanError('Masukkan data QR terlebih dahulu.');
      return;
    }
    setScanError('');
    const parsed = lines.map((line) => parseScanLine(line)).filter(Boolean);
    const results = await Promise.all(parsed.map((payload, idx) => fetchScanPreview(payload, idx)));
    setScanResults(results);
    setScanActiveResult(results[0] || null);
    const failures = results
      .filter((result) => result.scanPreviewError)
      .map((result) => `${result.kanbanId}: ${result.scanPreviewError}`);
    if (failures.length > 0) {
      setScanError(failures.join('\n'));
    }
  };

  const handleLoadSampleScan = () => {
    setScanInput(
      [
        'KANBAN_ID:KB-RM-000124|ITEM:RM-STKM11AH-22216|QTY:30',
        'KANBAN_ID:KB-IM-000089|ITEM:IM-BRG-0456|QTY:50',
        'KANBAN_ID:KB-CS-000034|ITEM:CS-OIL-001|QTY:20',
      ].join('n'),
    );
  };

  const handleCreateItem = async (e) => {
    e.preventDefault();
    if (!itemForm.code || !itemForm.name || !itemForm.type || !itemForm.unit) {
      alert('Kode, nama, tipe, satuan wajib diisi.');
      return;
    }
    try {
      const payload = {
        ...itemForm,
        weight: itemForm.weight ? Number(itemForm.weight) : null,
        safetyStock: itemForm.safetyStock ? Number(itemForm.safetyStock) : 0,
      };
      await apiFetch('/api/items', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await fetchItems();
      setItemForm({ code: '', name: '', type: 'Finished', unit: 'Unit', model: '', weight: '', cycle: '', safetyStock: '' });
      setEditingItemCode(null);
      setShowItemForm(false);
    } catch (error) {
      alert(`Gagal membuat item: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEditItem = (item) => {
    setItemForm({
      code: item.code || '',
      name: item.name || '',
      type: item.type || 'Finished',
      unit: item.unit || 'Unit',
      model: item.model || '',
      weight: item.weight ?? '',
      cycle: item.cycle || '',
      safetyStock: item.safety_stock ?? '',
    });
    setEditingItemCode(item.code);
    setShowItemForm(true);
  };

  const handleDeleteItem = async (code) => {
    if (!code) return;
    if (!window.confirm(`Hapus item ${code}?`)) return;
    try {
      await apiFetch(`/api/items/${encodeURIComponent(code)}`, { method: 'DELETE' });
      await fetchItems();
    } catch (error) {
      alert(`Gagal menghapus item: ${error.message || 'Unknown error'}`);
    }
  };

  const handleConsumeProduction = async (e) => {
    e.preventDefault();
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    if (!productionForm.productCode || !productionForm.qty) {
      alert('Product dan qty wajib diisi.');
      return;
    }
    try {
      const result = await apiFetch('/api/production/consume', {
        method: 'POST',
        body: JSON.stringify({
          productCode: productionForm.productCode,
          qty: Number(productionForm.qty),
          supplier: productionSupplier || null,
        }),
      });
      setProductionResult(result);
      setProductionForm({ ...productionForm, qty: '' });
      await fetchItems();
      await fetchProductionOrders();
    } catch (error) {
      alert(`Gagal input produksi: ${error.message || 'Unknown error'}`);
    }
  };

  const handleEditProduction = (order) => {
    setEditingProductionId(order.id);
    setEditingProductionQty(order.qty);
  };

  const handleSaveProduction = async (orderId) => {
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    const qtyNumber = Number(editingProductionQty);
    if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      alert('Qty wajib diisi.');
      return;
    }
    try {
      await apiFetch(`/api/production/orders/${orderId}`, {
        method: 'PUT',
        body: JSON.stringify({ qty: qtyNumber }),
      });
      setEditingProductionId(null);
      setEditingProductionQty('');
      await fetchItems();
      await fetchProductionOrders();
    } catch (error) {
      alert(`Gagal update produksi: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteProduction = async (orderId) => {
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      return;
    }
    if (!window.confirm(`Hapus produksi #${orderId}?`)) return;
    try {
      await apiFetch(`/api/production/orders/${orderId}`, { method: 'DELETE' });
      await fetchItems();
      await fetchProductionOrders();
    } catch (error) {
      alert(`Gagal menghapus produksi: ${error.message || 'Unknown error'}`);
    }
  };

  const fetchProductionBatches = async (itemCodes, supplier) => {
    if (!itemCodes.length) {
      setProductionBatches([]);
      return;
    }
    setProductionBatchesLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('itemCodes', itemCodes.join(','));
      if (supplier) params.set('supplier', supplier);
      const data = await apiFetch(`/api/stock/batches?${params.toString()}`);
      setProductionBatches(data);
    } catch (error) {
      alert(`Gagal memuat batch stok: ${error.message || 'Unknown error'}`);
    } finally {
      setProductionBatchesLoading(false);
    }
  };

  const fetchProductionReport = async () => {
    setProductionReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (productionReportStart) params.set('start', productionReportStart);
      if (productionReportEnd) params.set('end', productionReportEnd);
      const query = params.toString();
      const data = await apiFetch(`/api/production/report${query ? `?${query}` : ''}`);
      setProductionReportRows(data);
    } catch (error) {
      alert(`Gagal memuat laporan: ${error.message || 'Unknown error'}`);
    } finally {
      setProductionReportLoading(false);
    }
  };

  const fetchProductionOrders = async () => {
    setProductionOrdersLoading(true);
    try {
      const data = await apiFetch('/api/production/orders');
      setProductionOrders(data);
    } catch (error) {
      alert(`Gagal memuat produksi: ${error.message || 'Unknown error'}`);
    } finally {
      setProductionOrdersLoading(false);
    }
  };

  const handleImportItemsXls = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    readItemImportRows(file).then(async (rows) => {
      if (!rows.length) { showToastMessage('File kosong.'); return; }
      try {
        const existingCodes = new Set(masterItems.map((item) => String(item.code || '').trim()).filter(Boolean));
        let inserted = 0;
        let updated = 0;
        let skipped = 0;
        const payloads = [];
        const skippedReasons = [];
        rows.forEach((row, index) => {
          const rowNumber = index + 2;
          const sheetName = String(row.__sheetName || '').trim();
          const code = getImportValue(row, ['Kode Item', 'UNIQ', 'Uniq', 'UNIQ NO', 'Code', 'code', 'Kode Material']);
          const name = getImportValue(row, ['Nama Item', 'Part Name', 'PART NAME', 'PartName', 'Name', 'name']);
          const partNo = getImportValue(row, ['Part No', 'PART NO', 'PartNo', 'partNo', 'Part Number', 'part number']);
          const typeRaw = getImportValue(row, ['Type', 'type', 'Category', 'category', 'Kategori', 'kategori']);
          const unit = getImportValue(row, ['Satuan', 'Unit', 'unit', 'UOM', 'uom', 'OUM', 'oum']);
          const model = getImportValue(row, ['Model', 'model']);
          const weight = getImportValue(row, ['Berat', 'Weight', 'weight', 'Kgs', 'kgs']);
          const cycle = getImportValue(row, ['Cycle', 'cycle']);
          const safetyStock = getImportValue(row, ['Safety Stock', 'Safety', 'safetyStock']);
          const packQty = getImportValue(row, ['SNP', 'Pack Qty', 'PackQty', 'packQty', 'QTY / KBN RM', 'QTY / KBN FG']);
          const type = inferImportType(typeRaw, sheetName, file.name);
          if (!code || !name || !type || !unit) {
            skipped += 1;
            skippedReasons.push(
              `Baris ${rowNumber}${sheetName ? ` [${sheetName}]` : ''}: field wajib kurang (${!code ? 'UNIQ/Kode Item, ' : ''}${!name ? 'Part Name/Nama Item, ' : ''}${!type ? `Type/Kategori "${String(typeRaw || '').trim() || '-'}", ` : ''}${!unit ? 'Unit/UOM, ' : ''})`
                .replace(/, $/, ''),
            );
            return;
          }
          payloads.push({
            code: String(code).trim(),
            name: String(name).trim(),
            partNo: partNo ? String(partNo).trim() : '',
            type,
            unit: String(unit).trim(),
            model: model ? String(model).trim() : '',
            weight: weight ? Number(weight) : null,
            cycle: cycle ? String(cycle).trim() : '',
            safetyStock: safetyStock ? Number(safetyStock) : 0,
            packQty: packQty ? Number(packQty) : 0,
          });
        });
        for (const payload of payloads) {
          try {
            await apiFetch('/api/items', { method: 'POST', body: JSON.stringify(payload) });
            if (existingCodes.has(payload.code)) {
              updated += 1;
            } else {
              inserted += 1;
              existingCodes.add(payload.code);
            }
          } catch (error) {
            skipped += 1;
            skippedReasons.push(`${payload.code}: ${error.message || 'gagal simpan'}`);
          }
        }
        await fetchItems();
        const summaryMessage = `Import items selesai. Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}.`;
        showToastMessage(summaryMessage);
        if (skippedReasons.length > 0) {
          alert(`${summaryMessage}\n\nDetail skip:\n- ${skippedReasons.slice(0, 12).join('\n- ')}${skippedReasons.length > 12 ? `\n- ... dan ${skippedReasons.length - 12} lainnya` : ''}`);
        }
      } catch (error) {
        showToastMessage(`Import items gagal: ${error.message || 'Unknown error'}`);
      }
    }).catch((error) => {
      showToastMessage(`Import items gagal: ${error.message || 'Unknown error'}`);
    });
    if (itemsImportRef.current) itemsImportRef.current.value = '';
  };

  const handleImportProductionXls = (e) => {
    if (isStockOpnameLocked) {
      alert('Selesaikan dulu Stock Opname!');
      if (productionImportRef.current) productionImportRef.current.value = '';
      return;
    }
    const file = e.target.files[0];
    if (!file) return;
    readXlsRows(file, async (rows) => {
      if (!rows.length) { alert('File kosong.'); return; }
      try {
        const itemCodes = new Set(items.map((it) => it.code));
        const payloads = rows.map((row) => {
          const productCode = row['Product Item'] || row['Product'] || row['ProductCode'] || row['productCode'];
          const qty = row['Qty'] || row['qty'];
          if (!productCode || !qty) {
            throw new Error(`Data produksi tidak lengkap: ${productCode || '(tanpa produk)'}`);
          }
          if (!itemCodes.has(String(productCode).trim())) {
            throw new Error(`Kode produk belum ada: ${productCode}`);
          }
          if (Number(qty) <= 0) {
            throw new Error(`Qty harus > 0 untuk ${productCode}`);
          }
          return { productCode: String(productCode).trim(), qty: Number(qty) };
        });
        await postSequential(payloads, (payload) => apiFetch('/api/production/consume', { method: 'POST', body: JSON.stringify(payload) }));
        alert('Import produksi selesai.');
      } catch (error) {
        alert(`Import produksi gagal: ${error.message || 'Unknown error'}`);
      }
    });
    if (productionImportRef.current) productionImportRef.current.value = '';
  };

  const handleDownloadItemsTemplate = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = [
      { "Kode Item": "AS-FR-FRAME", "Nama Item": "Full Assy Rangka Kursi", "Part No": "FR-0001", "Type": "Finished", "Satuan": "Unit", "SNP": 20, "Model": "Driver Seat", "Berat": 12.5, "Cycle": "C1", "Safety Stock": 5 },
      { "Kode Item": "RM-ST-TUBE", "Nama Item": "Pipa Baja High-Tensile", "Part No": "ST-HT-010", "Type": "Raw", "Satuan": "Meter", "SNP": 50, "Model": "", "Berat": 1.8, "Cycle": "", "Safety Stock": 100 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Items");
    XLSX.writeFile(wb, "Template_Items.xlsx");
  };

  const handleExportItemsXls = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = masterItems.map((item) => {
      const suppliers = (itemSupplierMap.get(item.code) || []).map((row) => row.vendorId).filter(Boolean).join(', ');
      const customers = (itemCustomerMap.get(item.code) || []).map((row) => row.customerId).filter(Boolean).join(', ');
      return {
        "Kode Item": item.code,
        "Nama Item": item.name,
        "Part No": item.part_no || item.partNo || '',
        "Type": item.type,
        "Satuan": item.unit,
        "SNP": item.pack_qty ?? '',
        "Type Pack": packingNameByCode.get(item.type_pack) || item.type_pack || '',
        "Model": item.model || '',
        "Berat": item.weight ?? '',
        "Harga": item.price ?? '',
        "Vendor": item.vendor_id || '',
        "Lokasi": item.location_id || '',
        Suppliers: suppliers,
        Customers: customers,
        "Shelf Life (hari)": item.shelf_life_days ?? '',
        "Safety Stock": item.safety_stock ?? '',
        "Image URL": item.image_url || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Master Items");
    XLSX.writeFile(wb, `Master_Items_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadProductionTemplate = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = [
      { "Product Item": "AS-FR-FRAME", "Qty": 10 },
    ];
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Production");
    XLSX.writeFile(wb, "Template_Production.xlsx");
  };

  const handleOpenCreateUserForm = () => {
    setEditingUserId(null);
    setNewUserForm({
      username: '',
      password: '',
      role: 'user',
      supplierId: '',
      permissions: buildRolePresetPermissions('user'),
    });
    setShowUserFormDrawer(true);
  };

  const handleUserRoleChange = (nextRole) => {
    setNewUserForm((prev) => ({
      ...prev,
      role: nextRole,
      supplierId: nextRole === 'supplier' ? prev.supplierId : '',
      permissions: buildRolePresetPermissions(nextRole),
    }));
  };

  const handleEditUser = (userItem) => {
    setEditingUserId(userItem.id);
    setNewUserForm({
      username: userItem.username,
      password: '',
      role: userItem.role || 'user',
      supplierId: userItem.supplier_id || userItem.supplierId || '',
      permissions: { ...defaultUserPermissions, ...(userItem.permissions || {}) },
    });
    setShowUserFormDrawer(true);
  };

  const getEnabledPermissionKeys = (permissions = {}) => (
    Object.keys(permissions).filter((key) => permissions[key])
  );

  const getPermissionGroupSummary = (permissions = {}, keys = []) => {
    const enabledCount = keys.filter((key) => permissions[key]).length;
    return {
      enabledCount,
      totalCount: keys.length,
      allEnabled: keys.length > 0 && enabledCount === keys.length,
      someEnabled: enabledCount > 0 && enabledCount < keys.length,
    };
  };

  const handlePermissionToggle = (key, checked) => {
    setNewUserForm((prev) => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: checked },
    }));
  };

  const handlePermissionGroupToggle = (keys, checked) => {
    setNewUserForm((prev) => {
      const nextPermissions = { ...prev.permissions };
      keys.forEach((key) => {
        nextPermissions[key] = checked;
      });
      return {
        ...prev,
        permissions: nextPermissions,
      };
    });
  };

  const formatUserCreatedAt = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFifoStatusBadge = (status) => {
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Low Stock') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Expired' || status === 'Quarantine') return 'bg-red-50 text-red-700 border-red-200';
    return 'bg-slate-100 text-slate-600 border-slate-200';
  };

  const getFifoQualityBadge = (status) => {
    if (status === 'OK') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'HOLD') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const getInventoryStatusBadge = (status) => {
    if (status === 'Minus') return 'bg-rose-50 text-rose-700 border-rose-200';
    if (status === 'Critical') return 'bg-red-50 text-red-700 border-red-200';
    if (status === 'Reserved') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (status === 'Active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'Inactive') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-amber-50 text-amber-700 border-amber-200';
  };

  const handleFifoReceive = () => {
    if (!selectedFifoKanban) {
      alert('Pilih kanban terlebih dahulu.');
      return;
    }
    const selected = fifoKanbanItems.find((item) => item.kanbanId === selectedFifoKanban);
    const inventory = inventoryItems.find((item) => item.kanbanId === selectedFifoKanban);
    const now = new Date().toISOString().split('T')[0];
    const nextSequence = Math.max(0, ...filteredFifoLots.map((lot) => Number(lot.fifoSequence || 0))) + 1;
    const autoQty = Number(inventory?.kanbanQty || inventory?.minQty || 0);
    if (!autoQty) {
      alert('Kanban Qty belum tersedia.');
      return;
    }
    const lotNumber = `LOT-${now.replaceAll('-', '')}-${String(nextSequence).padStart(3, '0')}`;
    const batchNumber = selected?.category === 'Raw Material' ? `BATCH-${String(nextSequence).padStart(3, '0')}` : '';
    const newLot = {
      id: String(Date.now()),
      kanbanId: selectedFifoKanban,
      lotNumber,
      batchNumber,
      receivedDate: now,
      expiryDate: '',
      fifoSequence: nextSequence,
      location: inventory?.location || selected?.locationFIFO || '',
      initialQty: autoQty,
      remainingQty: autoQty,
      status: inventory?.minQty && autoQty <= inventory.minQty ? 'Low Stock' : 'Active',
      daysInStock: 0,
      qualityStatus: 'OK',
      supplier: inventory?.supplier || '',
      dnNumber: `DN-${String(Date.now()).slice(-6)}`,
      rnNumber: `RN-${String(Date.now()).slice(-6)}`,
    };
    setFifoLots((prev) => [...prev, newLot]);
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.kanbanId === selectedFifoKanban
          ? { ...item, onHand: Number(item.onHand || 0) + autoQty }
          : item
      )
    );
    setShowFifoReceive(false);
  };

  const handleFifoIssue = () => {
    if (!selectedFifoKanban) {
      alert('Pilih kanban terlebih dahulu.');
      return;
    }
    const inventory = inventoryItems.find((item) => item.kanbanId === selectedFifoKanban);
    const issueQty = Number(inventory?.kanbanQty || 0);
    if (!issueQty) {
      alert('Kanban Qty belum tersedia.');
      return;
    }
    if (issueQty > fifoTotalStock) {
      alert(`Stok tidak cukup. Tersedia: ${fifoTotalStock}`);
      return;
    }
    let remaining = issueQty;
    const updated = filteredFifoLots.map((lot) => ({ ...lot }));
    for (let i = 0; i < updated.length && remaining > 0; i += 1) {
      const lot = updated[i];
      if (lot.status === 'Active' && lot.remainingQty > 0) {
        const qty = Math.min(remaining, lot.remainingQty);
        lot.remainingQty -= qty;
        if (lot.remainingQty === 0) {
          lot.status = 'Depleted';
        }
        remaining -= qty;
      }
    }
    setFifoLots((prev) => prev.map((lot) => updated.find((u) => u.id === lot.id) || lot));
    setInventoryItems((prev) =>
      prev.map((item) =>
        item.kanbanId === selectedFifoKanban
          ? { ...item, onHand: Math.max(0, Number(item.onHand || 0) - issueQty) }
          : item
      )
    );
    setShowFifoIssue(false);
  };

  const handleFifoDelete = (lotId) => {
    if (!window.confirm('Hapus lot FIFO ini?')) return;
    setFifoLots((prev) => prev.filter((lot) => lot.id !== lotId));
  };

  const handleInventoryDelete = (itemId) => {
    if (!window.confirm('Hapus item inventory ini?')) return;
    setInventoryItems((prev) => prev.filter((item) => item.id !== itemId));
    if (selectedFifoKanban === itemId) {
      setSelectedFifoKanban('');
    }
  };

  const toggleRequestSelection = (requestId) => {
    setSelectedRequestIds((prev) => (
      prev.includes(requestId) ? prev.filter((id) => id !== requestId) : [...prev, requestId]
    ));
  };

  const handleRequestDnBatch = async ({ remarksBySupplier = null, remarks = '' } = {}) => {
    if (selectedRequestIds.length === 0) {
      alert('Pilih minimal 1 request.');
      return false;
    }
    const eligibleIds = selectedRequestIds.filter((id) => {
      const row = kanbanRequests.find((reqRow) => reqRow.id === id);
      if (!row) return false;
      const statusKey = String(row?.status || 'requested').trim().toLowerCase();
      return ['triggered', 'requested', 'approved'].includes(statusKey) && !row?.dn_id;
    });
    if (eligibleIds.length === 0) {
      alert('Tidak ada request yang valid untuk dibuat DN. Pastikan status masih Pending/Approved dan belum punya DN.');
      return false;
    }
    const invalidSupplierItems = [];
    const invalidRoleItems = [];
    const validIds = eligibleIds.filter((id) => {
      const row = kanbanRequests.find((reqRow) => reqRow.id === id);
      if (!row) return false;
      const setting = kanbanSettingsByCode.get(row.item_code);
      const supplier = String(setting?.default_supplier || '').trim();
      if (!supplier) {
        invalidSupplierItems.push(row.item_code);
        return false;
      }
      const vendor = masterVendors.find((v) => String(v.id).toLowerCase() === supplier.toLowerCase()
        || String(v.name || '').toLowerCase() === supplier.toLowerCase());
      const vendorRole = String(vendor?.role || '').trim().toLowerCase();
      if (vendorRole && vendorRole !== 'delivery note') {
        invalidRoleItems.push(row.item_code);
        return false;
      }
      return true;
    });
    if (invalidSupplierItems.length > 0) {
      const preview = Array.from(new Set(invalidSupplierItems)).slice(0, 3).join(', ');
      const suffix = invalidSupplierItems.length > 3 ? ` dan ${invalidSupplierItems.length - 3} lainnya` : '';
      showToastMessage(`Default supplier belum diisi untuk item: ${preview}${suffix}.`);
    }
    if (invalidRoleItems.length > 0) {
      const preview = Array.from(new Set(invalidRoleItems)).slice(0, 3).join(', ');
      const suffix = invalidRoleItems.length > 3 ? ` dan ${invalidRoleItems.length - 3} lainnya` : '';
      showToastMessage(`Supplier bukan role Delivery Note untuk item: ${preview}${suffix}.`);
    }
    if (validIds.length === 0) {
      alert('Tidak ada request yang valid untuk dibuat DN.');
      return false;
    }
    if (eligibleIds.length !== selectedRequestIds.length) {
      showToastMessage('Sebagian request di-skip karena status tidak valid atau sudah punya DN.');
    }
    try {
      const result = await apiFetch('/api/kanban/requests/batch-dn', {
        method: 'POST',
        body: JSON.stringify({
          requestIds: validIds,
          remarksBySupplier,
          remarks,
        }),
      });
      setSelectedRequestIds([]);
      const dns = Array.isArray(result?.dns) ? result.dns : result?.dn ? [result.dn] : [];
      const skippedCount = Array.isArray(result?.skipped) ? result.skipped.length : 0;
      const dnLabels = dns.map((dn) => dn?.dn_number).filter(Boolean);
      const dnText = dnLabels.length ? dnLabels.join(', ') : '';
      const dnPrefix = dnText ? `DN ${dnText}` : 'DN';
      showToastMessage(`${dnPrefix} dibuat untuk ${validIds.length} request.${skippedCount ? ` (${skippedCount} di-skip)` : ''}`);
      if (skippedCount) {
        console.warn('Batch DN skipped rows:', result.skipped);
      }
      await fetchKanbanRequests();
      await fetchDeliveryNotes();
      return true;
    } catch (error) {
      alert(error.message || 'Gagal membuat DN.');
      return false;
    }
  };

  const openInventoryDetail = (item) => {
    setInventoryDetailItem(item);
    setInventoryDetailOpen(true);
    setFifoSimActive(false);
    setFifoSimStep(0);
  };

  const closeInventoryDetail = () => {
    setInventoryDetailOpen(false);
    setInventoryDetailItem(null);
    setFifoSimActive(false);
    setFifoSimStep(0);
  };

  const handleSyncInventoryFromKanban = () => {
    if (!kanbanSettings.length) {
      alert('Data master kanban belum tersedia.');
      return;
    }
    const synced = kanbanSettings.map((row) => {
      const masterItem = masterItemsByCode.get(row.item_code);
      const masterLocation = masterLocationsById.get(masterItem?.location_id);
      const masterVendor =
        masterVendorsById.get(row.default_supplier) ||
        masterVendors.find((vendor) => vendor.name === row.default_supplier);
      const category = masterItem?.type || row.item_type || '';
      const kanbanId = buildKanbanId(row.item_code || 'ITEM', category);
      const kanbanQty = Number(row.lot_qty || 0);
      const maxQty = Number(row.max_qty || 0);
      const minQty = Number(row.min_qty || 0);
      const noOfCards = kanbanQty ? Math.ceil(maxQty / kanbanQty) : 0;
      const onHand = 0;
      const status = onHand <= minQty ? 'Critical' : 'Normal';
      return {
        id: kanbanId,
        kanbanId,
        itemCode: row.item_code || '',
        itemName: masterItem?.name || row.item_name || '',
        category,
        location: masterLocation?.id || masterLocation?.name || '',
        onHand,
        minQty,
        maxQty,
        noOfCards,
        kanbanQty,
        supplier: masterVendor?.name || row.default_supplier || '',
        leadTime: Number(row.lead_time_days || 0),
        uom: masterItem?.unit || '',
        status,
      };
    });
    setInventoryItems(synced);
  };

  const buildReportQuery = () => {
    const params = new URLSearchParams();
    if (reportStart) params.set('start', reportStart);
    if (reportEnd) params.set('end', reportEnd);
    if (reportSupplier) params.set('supplier', reportSupplier);
    const query = params.toString();
    return query ? `?${query}` : '';
  };

  const fetchReport = async () => {
    setReportLoading(true);
    try {
      const query = buildReportQuery();
      const [summary, rows] = await Promise.all([
        apiFetch(`/api/reports/summary${query}`),
        apiFetch(`/api/reports/by-supplier-po${query}`),
      ]);
      setReportSummary(summary);
      setReportRows(rows);
    } catch (error) {
      alert('Gagal memuat report.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportReportExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const exportRows = reportRows.map(row => ({
      Supplier: resolveSupplierLabel(row),
      'No PO': row.poNumber,
      'Qty PO': row.totalRequested,
      'Qty Incoming': row.totalReceived,
      'On Time': row.onTimeCount,
      Late: row.lateCount,
      'Too Early': row.tooEarlyCount,
      Pending: row.pendingCount,
      'SNP Tidak Sesuai': row.looseCount || 0,
      'Packing/SNP %': row.rnCount > 0 ? Math.round(((row.rnCount - (row.looseCount || 0)) / row.rnCount) * 100) : '-',
      Fulfilled: row.totalReceived >= row.totalRequested ? 'Ya' : 'Tidak',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchStockCoverageReport = async () => {
    setReportLoading(true);
    try {
      const query = `?days=${encodeURIComponent(stockCoverageDays || 30)}`;
      const data = await apiFetch(`/api/reports/stock-coverage${query}`);
      setStockCoverageRows(Array.isArray(data?.rows) ? data.rows : []);
      if (Number.isFinite(Number(data?.days))) {
        setStockCoverageDays(Number(data.days));
      }
    } catch (error) {
      alert('Gagal memuat report stock coverage.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportStockCoverageExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = stockCoverageRows.map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      Category: row.category,
      Unit: row.unit,
      'Stock Qty': row.stockQty,
      'Avg Daily Consumption': Number(row.avgDailyConsumption || 0),
      'Coverage Days': row.coverageDays === null ? '-' : Number(row.coverageDays || 0),
      'Safety Stock': row.safetyStock,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Stock Coverage');
    XLSX.writeFile(wb, `Stock_Coverage_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchSlowMovingReport = async () => {
    setReportLoading(true);
    try {
      const data = await apiFetch('/api/reports/slow-moving');
      setSlowMovingRows(Array.isArray(data) ? data : []);
    } catch (error) {
      alert('Gagal memuat report slow moving.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportSlowMovingExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = slowMovingRows.map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      Category: row.category,
      Unit: row.unit,
      'Stock Qty': row.stockQty,
      'Last Out': row.lastOutAt ? new Date(row.lastOutAt).toISOString().split('T')[0] : '-',
      'Days Since Last Out': row.daysSinceLastOut ?? '-',
      Status: row.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Slow Moving');
    XLSX.writeFile(wb, `Slow_Moving_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchInboundPerformanceReport = async () => {
    setReportLoading(true);
    try {
      const query = buildReportQuery();
      const data = await apiFetch(`/api/reports/inbound-performance${query}`);
      setInboundPerformanceRows(Array.isArray(data) ? data : []);
    } catch (error) {
      alert('Gagal memuat report inbound performance.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportInboundPerformanceExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = inboundPerformanceRows.map((row) => ({
      Supplier: resolveSupplierLabel(row),
      'No PO': row.poNumber,
      Item: row.item,
      'Plan Date': row.requestDate || '-',
      'Arrival Date': row.arrivalDate || '-',
      'Qty Order': row.requestQty,
      'Qty Received': row.receivedQty,
      Status: row.status,
      'Day Diff': row.dayDiff ?? '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inbound Performance');
    XLSX.writeFile(wb, `Inbound_Performance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchFifoViolationReport = async () => {
    setReportLoading(true);
    try {
      const data = await apiFetch('/api/reports/fifo-violations');
      setFifoViolationRows(Array.isArray(data) ? data : []);
    } catch (error) {
      alert('Gagal memuat report FIFO violations.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportFifoViolationExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = fifoViolationRows.map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      'Chosen Batch': row.chosenBatchNo || '-',
      'Oldest Batch': row.oldestBatchNo || '-',
      Reason: row.reason || '-',
      'Created At': row.createdAt ? new Date(row.createdAt).toISOString() : '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'FIFO Violations');
    XLSX.writeFile(wb, `FIFO_Violations_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchInventoryValueReport = async () => {
    setReportLoading(true);
    try {
      const data = await apiFetch('/api/reports/inventory-value');
      setInventoryValueRows(Array.isArray(data?.rows) ? data.rows : []);
      setInventoryValueTotal(Number(data?.totalValue || 0));
    } catch (error) {
      alert('Gagal memuat report inventory value.');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchRawMaterialLedgerReport = async () => {
    setRawMaterialLedgerLoading(true);
    setRawMaterialLedgerError('');
    try {
      const period = rawMaterialLedgerPeriodType === 'yearly' ? 'yearly' : 'monthly';
      if (period === 'yearly' && !String(rawMaterialLedgerYear || '').trim()) {
        setRawMaterialLedgerError('Tahun wajib diisi.');
        return;
      }
      if (period === 'monthly' && !String(rawMaterialLedgerMonth || '').trim()) {
        setRawMaterialLedgerError('Bulan wajib diisi.');
        return;
      }
      const params = new URLSearchParams();
      params.set('period', period);
      if (rawMaterialLedgerCategory) params.set('category', rawMaterialLedgerCategory);
      if (String(rawMaterialLedgerLocation || '').trim()) {
        params.set('location', String(rawMaterialLedgerLocation || '').trim());
      }
      if (period === 'yearly') {
        params.set('year', rawMaterialLedgerYear || '');
      } else {
        const [yearPart, monthPart] = String(rawMaterialLedgerMonth || '').split('-');
        params.set('year', yearPart || rawMaterialLedgerYear || '');
        params.set('month', monthPart || '');
      }
      const data = await apiFetch(`/api/reports/raw-material-ledger?${params.toString()}`);
      setRawMaterialLedgerRows(Array.isArray(data?.rows) ? data.rows : []);
      setRawMaterialLedgerMeta({
        start: data?.start || null,
        end: data?.end || null,
        period: data?.period || period,
        year: data?.year || null,
        month: data?.month || null,
        category: data?.category || rawMaterialLedgerCategory,
        location: data?.location || (rawMaterialLedgerLocation || null),
      });
    } catch (error) {
      setRawMaterialLedgerRows([]);
      setRawMaterialLedgerMeta(null);
      setRawMaterialLedgerError(error?.message || 'Gagal memuat laporan mutasi material.');
    } finally {
      setRawMaterialLedgerLoading(false);
    }
  };

  const fetchAllMutationReport = async () => {
    setAllMutationLoading(true);
    setAllMutationError('');
    try {
      if (!String(allMutationStart || '').trim() || !String(allMutationEnd || '').trim()) {
        setAllMutationError('Tanggal mulai dan akhir wajib diisi.');
        return;
      }
      const params = new URLSearchParams();
      params.set('start', allMutationStart);
      params.set('end', allMutationEnd);
      if (allMutationCategory) params.set('category', allMutationCategory);
      if (String(allMutationLocation || '').trim()) {
        params.set('location', String(allMutationLocation || '').trim());
      }
      const data = await apiFetch(`/api/reports/all-mutations?${params.toString()}`);
      setAllMutationRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (error) {
      setAllMutationRows([]);
      setAllMutationError(error?.message || 'Gagal memuat laporan mutasi.');
    } finally {
      setAllMutationLoading(false);
    }
  };

  const handleExportRawMaterialLedgerExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = rawMaterialLedgerRows.map((row) => ({
      'Item Code': row.itemCode,
      'Part No': row.partNo || '-',
      'Item Name': row.itemName,
      Unit: row.unit,
      'Opening Balance': row.openingBalance,
      'Qty In': row.totalIn,
      'Qty Out': row.totalOut,
      'Closing Balance': row.closingBalance,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi');
    const periodTag = rawMaterialLedgerMeta?.period === 'yearly'
      ? `${rawMaterialLedgerMeta?.year || rawMaterialLedgerYear}`
      : `${rawMaterialLedgerMeta?.year || ''}${rawMaterialLedgerMeta?.month ? `-${String(rawMaterialLedgerMeta.month).padStart(2, '0')}` : ''}`;
    const categoryTag = rawMaterialLedgerMeta?.category || rawMaterialLedgerCategory || 'material';
    const locationTag = rawMaterialLedgerMeta?.location
      ? String(rawMaterialLedgerMeta.location).trim().replace(/\s+/g, '-')
      : '';
    const fileTag = [categoryTag, periodTag, locationTag].filter(Boolean).join('_') || 'mutasi';
    XLSX.writeFile(wb, `Mutasi_${fileTag}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportInventoryValueExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = inventoryValueRows.map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      Unit: row.unit,
      'Stock Qty': row.stockQty,
      Price: row.price,
      Value: row.value,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory Value');
    XLSX.writeFile(wb, `Inventory_Value_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchSupplierShortageReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (supplierShortageMonth) params.set('month', supplierShortageMonth);
      if (supplierShortageYear) params.set('year', supplierShortageYear);
      const query = params.toString();
      const data = await apiFetch(`/api/reports/supplier-shortage${query ? `?${query}` : ''}`);
      setSupplierShortageRows(Array.isArray(data?.rows) ? data.rows : []);
      setSupplierShortageSummary({
        totalItems: Number(data?.summary?.totalItems || 0),
        totalSuppliers: Number(data?.summary?.totalSuppliers || 0),
        urgentItems: Number(data?.summary?.urgentItems || 0),
        totalShortageQty: Number(data?.summary?.totalShortageQty || 0),
      });
      if (data?.monthKey) setSupplierShortageMonth(data.monthKey);
      if (data?.year) setSupplierShortageYear(String(data.year));
    } catch (error) {
      setSupplierShortageRows([]);
      setSupplierShortageSummary({
        totalItems: 0,
        totalSuppliers: 0,
        urgentItems: 0,
        totalShortageQty: 0,
      });
      alert('Gagal memuat report shortage supplier.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportSupplierShortageExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = filteredSupplierShortageRows.map((row) => ({
      Supplier: row.supplierName,
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      'Part No': row.partNo || '-',
      Unit: row.unit || '-',
      'Type Pack': row.typePack || '-',
      'Stock Qty': row.stockQty,
      'Safety Stock': row.safetyStock,
      'Plan Qty': row.planQty,
      'Daily Usage': row.dailyUsageQty,
      'Lead Time (Days)': row.leadTimeDays,
      'Shortage Qty': row.shortageQty,
      'Coverage (Days)': row.coverageDays ?? '-',
      Status: row.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Supplier Shortage');
    XLSX.writeFile(wb, `Supplier_Shortage_${supplierShortageYear}_${supplierShortageMonth}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchOutstandingPrlReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (outstandingPrlMonth) params.set('month', outstandingPrlMonth);
      if (outstandingPrlYear) params.set('year', outstandingPrlYear);
      const query = params.toString();
      const data = await apiFetch(`/api/reports/outstanding-prl${query ? `?${query}` : ''}`);
      setOutstandingPrlRows(Array.isArray(data?.rows) ? data.rows : []);
      if (data?.monthKey) setOutstandingPrlMonth(data.monthKey);
      if (data?.year) setOutstandingPrlYear(String(data.year));
    } catch (error) {
      alert('Gagal memuat report outstanding PRL.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportOutstandingPrlExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const rows = outstandingPrlRows.map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      Model: row.model,
      UOM: row.uom,
      'Type Pack': row.typePack,
      'Plan Qty': row.planQty,
      Status: row.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Outstanding PRL');
    XLSX.writeFile(wb, `Outstanding_PRL_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const fetchQualityObjectivesReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (qualityObjectivesMonth) params.set('month', qualityObjectivesMonth);
      const query = params.toString();
      const data = await apiFetch(`/api/reports/quality-objectives${query ? `?${query}` : ''}`);
      setQualityObjectivesData({
        period: data?.period || null,
        inboundSchedule: Array.isArray(data?.inboundSchedule) ? data.inboundSchedule : [],
        dnVsRn: Array.isArray(data?.dnVsRn) ? data.dnVsRn : [],
        deliveryVsPrl: Array.isArray(data?.deliveryVsPrl) ? data.deliveryVsPrl : [],
      });
      if (data?.period?.year && data?.period?.month) {
        const monthValue = String(data.period.month).padStart(2, '0');
        setQualityObjectivesMonth(`${data.period.year}-${monthValue}`);
      }
    } catch (error) {
      alert('Gagal memuat report sasaran mutu.');
    } finally {
      setReportLoading(false);
    }
  };

  const fetchCapacityPlanningReport = async () => {
    setReportLoading(true);
    try {
      const params = new URLSearchParams();
      if (capacityPlanningMonth) params.set('month', capacityPlanningMonth);
      if (capacityPlanningYear) params.set('year', capacityPlanningYear);
      const query = params.toString();
      const data = await apiFetch(`/api/reports/capacity-planning-daily${query ? `?${query}` : ''}`);
      setCapacityPlanningData({
        period: data?.period || null,
        summary: data?.summary || null,
        workCenters: Array.isArray(data?.workCenters) ? data.workCenters : [],
        dailyRows: Array.isArray(data?.dailyRows) ? data.dailyRows : [],
        workCenterDailyRows: Array.isArray(data?.workCenterDailyRows) ? data.workCenterDailyRows : [],
        rows: Array.isArray(data?.rows) ? data.rows : [],
      });
      if (data?.period?.monthKey) setCapacityPlanningMonth(data.period.monthKey);
      if (data?.period?.year) setCapacityPlanningYear(String(data.period.year));
    } catch (error) {
      setCapacityPlanningData({
        period: null,
        summary: null,
        workCenters: [],
        dailyRows: [],
        workCenterDailyRows: [],
        rows: [],
      });
      alert('Gagal memuat laporan capacity planning.');
    } finally {
      setReportLoading(false);
    }
  };

  const handleExportCapacityPlanningExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const summary = capacityPlanningData?.summary || {};
    const rows = (capacityPlanningData?.rows || []).map((row) => ({
      'Item Code': row.itemCode,
      'Item Name': row.itemName,
      Type: row.itemType,
      'Planned Qty': row.plannedQty,
      'Actual Qty': row.actualQty,
      'Lead Time / Unit (Hours)': row.unitLeadTimeHours,
      'Planned Load Hours': row.plannedLoadHours,
      'Actual Load Hours': row.actualLoadHours,
      Routing: row.routingSummary || '-',
    }));
    const workCenters = (capacityPlanningData?.workCenters || []).map((row) => ({
      'Work Center': row.workCenter,
      'Planned Qty': row.plannedQty,
      'Actual Qty': row.actualQty,
      'Planned Load Hours': row.plannedLoadHours,
      'Actual Load Hours': row.actualLoadHours,
      'Total Load Hours': row.totalLoadHours,
      Processes: Array.isArray(row.processNames) ? row.processNames.join(', ') : '-',
    }));
    const dailyRows = (capacityPlanningData?.dailyRows || []).map((row) => ({
      Date: row.date,
      'Planned Qty': row.plannedQty,
      'Actual Qty': row.actualQty,
      'Planned Load Hours': row.plannedLoadHours,
      'Actual Load Hours': row.actualLoadHours,
      'Total Load Hours': row.totalLoadHours,
    }));
    const workCenterDailyRows = (capacityPlanningData?.workCenterDailyRows || []).map((row) => ({
      Date: row.date,
      'Work Center': row.workCenter,
      'Planned Qty': row.plannedQty,
      'Actual Qty': row.actualQty,
      'Planned Load Hours': row.plannedLoadHours,
      'Actual Load Hours': row.actualLoadHours,
      'Total Load Hours': row.totalLoadHours,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      Period: capacityPlanningData?.period?.label || `${capacityPlanningMonth || '-'} ${capacityPlanningYear || ''}`.trim(),
      'Total Planned Qty': summary.totalPlannedQty || 0,
      'Total Actual Qty': summary.totalActualQty || 0,
      'Total Planned Load Hours': summary.totalPlannedLoadHours || 0,
      'Total Actual Load Hours': summary.totalActualLoadHours || 0,
      'Routed Items': summary.routedItems || 0,
      'Work Centers': summary.workCenters || 0,
      'Dates': summary.dates || 0,
    }]), 'Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workCenters.length ? workCenters : [{ Info: 'Tidak ada data' }]), 'Work Centers');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ Info: 'Tidak ada data' }]), 'Daily');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(workCenterDailyRows.length ? workCenterDailyRows : [{ Info: 'Tidak ada data' }]), 'WorkCenter Daily');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'Tidak ada data' }]), 'Items');
    XLSX.writeFile(wb, `Capacity_Planning_${capacityPlanningYear || new Date().getFullYear()}_${capacityPlanningMonth || 'all'}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExportQualityObjectivesExcel = async () => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const periodLabel = qualityObjectivesData?.period?.label || qualityObjectivesMonth || '';
    const sheets = [
      {
        name: 'Inbound vs Incoming',
        rows: (qualityObjectivesData.inboundSchedule || []).map((row, idx) => ({
          No: idx + 1,
          Supplier: row.name,
          Period: row.period,
          'Plan Qty': row.planQty,
          'Actual Qty': row.actualQty,
          'Achievement %': row.percent,
          Status: row.status,
        })),
      },
      {
        name: 'DN vs RN',
        rows: (qualityObjectivesData.dnVsRn || []).map((row, idx) => ({
          No: idx + 1,
          Supplier: row.name,
          Period: row.period,
          'Doc Qty': row.planQty,
          'Actual Qty': row.actualQty,
          'Achievement %': row.percent,
          Status: row.status,
        })),
      },
      {
        name: 'Delivery vs PRL',
        rows: (qualityObjectivesData.deliveryVsPrl || []).map((row, idx) => ({
          No: idx + 1,
          Customer: row.name,
          Period: row.period,
          'Plan Qty': row.planQty,
          'Actual Qty': row.actualQty,
          'Achievement %': row.percent,
          Status: row.status,
        })),
      },
    ];
    const wb = XLSX.utils.book_new();
    sheets.forEach((sheet) => {
      const ws = XLSX.utils.json_to_sheet(sheet.rows.length > 0 ? sheet.rows : [{ Info: 'Tidak ada data' }]);
      XLSX.utils.book_append_sheet(wb, ws, sheet.name);
    });
    XLSX.writeFile(wb, `Sasaran_Mutu_${periodLabel || new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrintQualityObjectives = () => {
    if (typeof window === 'undefined') return;
    const periodLabel = qualityObjectivesData?.period?.label || qualityObjectivesMonth || '';
    const buildRows = (rows, emptyLabel) => {
      if (!rows || rows.length === 0) {
        return `<tr><td colspan="7" style="padding:8px;text-align:center;color:#777;">${emptyLabel}</td></tr>`;
      }
      return rows.map((row, idx) => `
        <tr>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${idx + 1}</td>
          <td style="padding:8px;border:1px solid #ddd;">${row.name || '-'}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${row.period || periodLabel}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${Number(row.planQty || 0).toLocaleString('id-ID')}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${Number(row.actualQty || 0).toLocaleString('id-ID')}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${Number(row.percent || 0).toFixed(2)}%</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">
            <span style="display:inline-block;padding:4px 8px;border-radius:6px;font-size:12px;background:${row.status === 'TERCAPAI' ? '#d1fae5' : '#fee2e2'};color:${row.status === 'TERCAPAI' ? '#065f46' : '#991b1b'};">${row.status || '-'}</span>
          </td>
        </tr>
      `).join('');
    };
    const html = `
      <html>
        <head>
          <title>Laporan Sasaran Mutu</title>
          <meta charset="utf-8" />
        </head>
        <body style="font-family: Arial, sans-serif; color:#111; margin:24px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">
            <div>
              <div style="font-size:18px;font-weight:bold;">PT. MATRA</div>
              <div style="font-size:12px;color:#666;">Laporan Sasaran Mutu</div>
            </div>
            <div style="text-align:right;font-size:12px;color:#444;">
              <div>Periode: <strong>${periodLabel}</strong></div>
              <div>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</div>
            </div>
          </div>

          <h3 style="margin:18px 0 6px;font-size:14px;">1) Inbound Schedule vs Incoming</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;border:1px solid #ddd;">No</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Supplier</th>
                <th style="padding:8px;border:1px solid #ddd;">Periode</th>
                <th style="padding:8px;border:1px solid #ddd;">Plan Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">Actual Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">% Pencapaian</th>
                <th style="padding:8px;border:1px solid #ddd;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${buildRows(qualityObjectivesData.inboundSchedule, 'Tidak ada data inbound.')}
            </tbody>
          </table>

          <h3 style="margin:18px 0 6px;font-size:14px;">2) DN vs RN (Akurasi Surat Jalan)</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;border:1px solid #ddd;">No</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Supplier</th>
                <th style="padding:8px;border:1px solid #ddd;">Periode</th>
                <th style="padding:8px;border:1px solid #ddd;">Doc Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">Actual Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">% Pencapaian</th>
                <th style="padding:8px;border:1px solid #ddd;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${buildRows(qualityObjectivesData.dnVsRn, 'Tidak ada data DN/RN.')}
            </tbody>
          </table>

          <h3 style="margin:18px 0 6px;font-size:14px;">3) Delivery vs PRL</h3>
          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#f3f4f6;">
                <th style="padding:8px;border:1px solid #ddd;">No</th>
                <th style="padding:8px;border:1px solid #ddd;text-align:left;">Customer</th>
                <th style="padding:8px;border:1px solid #ddd;">Periode</th>
                <th style="padding:8px;border:1px solid #ddd;">Plan Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">Actual Qty</th>
                <th style="padding:8px;border:1px solid #ddd;">% Pencapaian</th>
                <th style="padding:8px;border:1px solid #ddd;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${buildRows(qualityObjectivesData.deliveryVsPrl, 'Tidak ada data delivery.')}
            </tbody>
          </table>

          <div style="margin-top:48px; display:flex; justify-content:flex-end;">
            <div style="text-align:center; font-size:12px;">
              <div>Disetujui,</div>
              <div>Manager</div>
              <div style="height:72px;"></div>
              <div style="border-top:1px solid #333; width:180px; margin:0 auto;"></div>
            </div>
          </div>
        </body>
      </html>
    `;
    const preview = window.open('', '_blank', 'noopener');
    if (!preview) return;
    preview.document.open();
    preview.document.write(html);
    preview.document.close();
    preview.focus();
    setTimeout(() => preview.print(), 200);
  };

  const fetchKpiSummary = async () => {
    setKpiLoading(true);
    try {
      const data = await apiFetch('/api/kpi/summary');
      setKpiSummary({
        inventoryValue: Number(data?.inventoryValue || 0),
        stockAlert: Number(data?.stockAlert || 0),
        pendingInbound: Number(data?.pendingInbound || 0),
        outstandingPr: Number(data?.outstandingPr || 0),
      });
    } catch (error) {
      console.error('Gagal memuat KPI summary:', error);
    } finally {
      setKpiLoading(false);
    }
  };

  useEffect(() => {
    if (mainTab === 'dashboard' && canViewReport) {
      fetchKpiSummary();
    }
  }, [mainTab, canViewReport]);

  useEffect(() => {
    const handleClickOutside = () => {
      setActiveMenu(null);
      setItemMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleClickOutside = () => {
      setReportMenuOpen(false);
      setSettingsMenuOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!fifoSimActive) {
      if (fifoSimTimerRef.current) {
        clearInterval(fifoSimTimerRef.current);
        fifoSimTimerRef.current = null;
      }
      return;
    }
    if (!inventoryDetailLots.length) return;
    fifoSimTimerRef.current = setInterval(() => {
      setFifoSimStep((prev) => (prev + 1) % inventoryDetailLots.length);
    }, 700);
    return () => {
      if (fifoSimTimerRef.current) {
        clearInterval(fifoSimTimerRef.current);
        fifoSimTimerRef.current = null;
      }
    };
  }, [fifoSimActive, inventoryDetailLots.length]);


  useEffect(() => {
    if (showUserModal) fetchUsers();
    if (!showUserModal) {
      setShowUserFormDrawer(false);
      setEditingUserId(null);
    }
  }, [showUserModal]);

  useEffect(() => {
    if ((mainTab === 'fifo' || mainTab === 'inventory') && !kanbanSettings.length) {
      fetchKanbanSettings();
    }
  }, [mainTab, kanbanSettings.length]);

  useEffect(() => {
    if (mainTab !== 'reports') return;
    if (reportTab !== 'scorecard') return;
    fetchItems({ silent: dataCacheRef.current.itemsLoaded });
    fetchReceiveNotes({ silent: dataCacheRef.current.receiveNotesLoaded });
    const currentMonth = formatMonthKeyLocal(new Date());
    if (!scorecardFilterMonthStart || !scorecardFilterMonthEnd) {
      if (!scorecardFilterMonthStart) setScorecardFilterMonthStart(currentMonth);
      if (!scorecardFilterMonthEnd) setScorecardFilterMonthEnd(currentMonth);
      return;
    }
    fetchScorecardSchedules({
      startMonth: scorecardFilterMonthStart,
      endMonth: scorecardFilterMonthEnd,
      supplier: scorecardFilterSupplier,
    });
    if (!masterVendors.length && canViewMaster) {
      fetchMasterReferences({ silent: true });
    }
  }, [mainTab, reportTab, scorecardFilterMonthStart, scorecardFilterMonthEnd, scorecardFilterSupplier, masterVendors.length, canViewMaster]);

  useEffect(() => {
    if (mainTab !== 'reports') return;
    if (reportTab !== 'capacity-planning') return;
    fetchCapacityPlanningReport();
  }, [mainTab, reportTab, capacityPlanningMonth, capacityPlanningYear]);

  useEffect(() => {
    if (mainTab === 'kanban') {
      fetchKanbanSettings({ silent: dataCacheRef.current.kanbanSettingsLoaded });
      fetchKanbanRequests({ silent: dataCacheRef.current.kanbanRequestsLoaded });
      fetchDeliveryNotes({ silent: dataCacheRef.current.deliveryNotesLoaded });
      fetchReceiveNotes({ silent: dataCacheRef.current.receiveNotesLoaded });
      fetchItems({ silent: dataCacheRef.current.itemsLoaded });
    }
  }, [mainTab]);

  useEffect(() => {
    if (!['dashboard', 'dash-prl', 'dash-kanban', 'dash-inventory', 'dash-schedule'].includes(mainTab)) return;
    fetchItems({ silent: dataCacheRef.current.itemsLoaded });
    fetchKanbanRequests({ silent: dataCacheRef.current.kanbanRequestsLoaded });
    fetchPrlRows(prlFilters.year, { silent: dataCacheRef.current.prlLoadedYear === String(prlFilters.year || currentYear) });
  }, [mainTab]);

  useEffect(() => {
    if (!['dashboard', 'dash-prl', 'dash-kanban', 'dash-inventory', 'dash-schedule'].includes(mainTab)) return;
    const monthKey = formatMonthKeyLocal(new Date());
    const range = resolveMonthRange(monthKey);
    fetchDashboardStats(range);
    fetchDashboardSchedules({ silent: dashboardSchedules.length > 0 });
    fetchScheduleReadiness({ month: monthKey, start: range.start, end: range.end });
    fetchScheduleReceivedSummary({ month: monthKey });
    fetchTodayScheduleSummary({ date: formatDateKey(new Date()) });
  }, [mainTab]);

  useEffect(() => {
    if (qcStatusOptions.length === 0) return;
    const normalized = String(receiveForm.qcStatus || '').toLowerCase();
    const available = qcStatusOptions.map((status) => status.toLowerCase());
    if (!available.includes(normalized)) {
      setReceiveForm((prev) => ({ ...prev, qcStatus: available[0] }));
    }
  }, [qcStatusOptions, receiveForm.qcStatus]);

  useEffect(() => {
    if (!isPrimaryTab) return;
    if (receiveNotesLoading) return;
    fetchReceiveNotes({ silent: dataCacheRef.current.receiveNotesLoaded });
  }, [mainTab, isPrimaryTab, receiveNotesLoading]);

  useEffect(() => {
    if (!user) return;
    fetchSoOpenSession();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'supplier' && mainTab !== 'supplier') {
      setMainTab('supplier');
    }
    if (user.role !== 'supplier' && mainTab === 'supplier') {
      setMainTab('dashboard');
    }
    if (user.role !== 'admin' && mainTab === 'audit') {
      setMainTab('dashboard');
    }
  }, [user, mainTab, setMainTab]);

  useEffect(() => {
    if (!receiveNotes.length && !kanbanSettings.length) {
      setFifoLots([]);
      setInventoryItems([]);
      return;
    }
    setFifoLots(buildFifoLotsFromReceiveNotes(receiveNotes));
    setInventoryItems(buildInventoryFromSources(receiveNotes));
  }, [receiveNotes, kanbanSettings, kanbanRequests, masterItems, masterLocations, masterVendors]);

  useEffect(() => {
    const startScanner = async () => {
      if (kanbanSubTab !== 'scan' || scanMode !== 'camera' || !scanCameraEnabled) return;
      if (!scanVideoRef.current) return;
      if (scanInstanceRef.current) return;
      const qrModule = await import('qr-scanner');
      const QrScanner = qrModule.default || qrModule;
      const scanner = new QrScanner(
        scanVideoRef.current,
        async (result) => {
          const value = result?.data || '';
          const now = Date.now();
          if (!value) return;
          if (lastScanRef.current.value === value && now - lastScanRef.current.time < 2000) {
            return;
          }
          lastScanRef.current = { value, time: now };
          const payload = parseScanLine(value);
          const built = await fetchScanPreview(payload, 0);
          setScanResults([built]);
          setScanActiveResult(built);
          setScanError(built.scanPreviewError ? built.scanPreviewError : '');
        },
        { returnDetailedScanResult: true },
      );
      scanInstanceRef.current = scanner;
      await scanner.start();
    };

    const stopScanner = async () => {
      if (scanInstanceRef.current) {
        await scanInstanceRef.current.stop();
        scanInstanceRef.current.destroy();
        scanInstanceRef.current = null;
      }
    };

    if (scanMode === 'camera' && kanbanSubTab === 'scan' && scanCameraEnabled) {
      startScanner();
    } else {
      stopScanner();
    }

    return () => {
      stopScanner();
    };
  }, [kanbanSubTab, scanMode, scanCameraEnabled, itemsByCode, kanbanSettingsByCode]);

  useEffect(() => {
    const itemCodes = productionRequirements.map((row) => row.itemCode).filter(Boolean);
    fetchProductionBatches(itemCodes, productionSupplier);
  }, [productionRequirements, productionSupplier]);

  useEffect(() => {
    let isActive = true;
    const qtyNumber = Number(productionForm.qty);
    if (!productionForm.productCode || !Number.isFinite(qtyNumber) || qtyNumber <= 0) {
      setProductionRequirements([]);
      setProductionReqError('');
      return () => { isActive = false; };
    }
    setProductionReqLoading(true);
    setProductionReqError('');
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          productCode: productionForm.productCode,
          qty: String(qtyNumber),
        });
        if (productionSupplier) params.set('supplier', productionSupplier);
        const data = await apiFetch(`/api/production/requirements?${params.toString()}`);
        if (isActive) setProductionRequirements(data);
      } catch (error) {
        if (isActive) {
          setProductionRequirements([]);
          setProductionReqError(error.message || 'Gagal cek stok.');
        }
      } finally {
        if (isActive) setProductionReqLoading(false);
      }
    }, 300);
    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [productionForm.productCode, productionForm.qty, productionSupplier]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  function parseDateOnly(value) {
    if (!value) return null;
    const parts = String(value).split('-').map(Number);
    if (parts.length !== 3) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  const ROW_OPTIONS = [25, 50, 75, 100];
  const defaultPagination = { page: 1, perPage: 25 };
  const getPaginationConfig = (key) => tablePagination[key] || defaultPagination;
  const handleRowsPerPageChange = (key, perPage) => {
    setTablePagination((prev) => ({
      ...prev,
      [key]: { ...getPaginationConfig(key), page: 1, perPage },
    }));
  };
  const handlePageChange = (key, nextPage, totalPages = 1) => {
    setTablePagination((prev) => {
      const config = getPaginationConfig(key);
      const safeTotal = Math.max(1, totalPages);
      const safePage = Math.min(Math.max(1, nextPage), safeTotal);
      return {
        ...prev,
        [key]: { ...config, page: safePage },
      };
    });
  };
  const paginateRows = (key, rows) => {
    const config = getPaginationConfig(key);
    const perPage = config.perPage || defaultPagination.perPage;
    const page = config.page || defaultPagination.page;
    const total = rows.length;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    const safePage = Math.min(Math.max(1, page), totalPages);
    const startIndex = total === 0 ? 0 : (safePage - 1) * perPage + 1;
    const endIndex = Math.min(total, safePage * perPage);
    const paged = rows.slice((safePage - 1) * perPage, (safePage - 1) * perPage + perPage);
    return { page: safePage, perPage, total, totalPages, startIndex, endIndex, rows: paged };
  };
  const buildPageSequence = (current, total) => {
    const items = [];
    const maxButtons = 5;
    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + maxButtons - 1);
    if (end - start < maxButtons - 1) {
      start = Math.max(1, end - maxButtons + 1);
    }
    if (start > 1) {
      items.push({ type: 'page', value: 1 });
      if (start > 2) items.push({ type: 'ellipsis' });
    }
    for (let i = start; i <= end; i += 1) {
      items.push({ type: 'page', value: i });
    }
    if (end < total) {
      if (end < total - 1) items.push({ type: 'ellipsis' });
      items.push({ type: 'page', value: total });
    }
    return items;
  };
  const renderPaginationControls = (key, meta) => {
    if (!meta) return null;
    const sequence = buildPageSequence(meta.page, meta.totalPages);
    return (
      <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select
            className="border rounded px-2 py-1 bg-white text-xs"
            value={meta.perPage}
            onChange={(e) => handleRowsPerPageChange(key, Number(e.target.value))}
          >
            {ROW_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <button
            type="button"
            onClick={() => handlePageChange(key, meta.page - 1, meta.totalPages)}
            disabled={meta.page <= 1}
            className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
          >
            Previous
          </button>
          {sequence.map((item, index) => (
            item.type === 'ellipsis' ? (
              <span key={`ell-${index}`} className="px-2 text-[12px]">
                …
              </span>
            ) : (
              <button
                type="button"
                key={`page-${item.value}`}
            onClick={() => handlePageChange(key, item.value, meta.totalPages)}
                className={`px-2 py-1 rounded border text-[10px] ${item.value === meta.page ? 'bg-slate-900 text-white' : 'bg-white'}`}
              >
                {item.value}
              </button>
            )
          ))}
          <button
            type="button"
            onClick={() => handlePageChange(key, meta.page + 1, meta.totalPages)}
            disabled={meta.page >= meta.totalPages}
            className="px-2 py-1 rounded border bg-white disabled:opacity-40 text-[10px]"
          >
            Next
          </button>
        </div>
        <div>
          Showing {meta.startIndex} to {meta.endIndex} of {meta.total} entries
        </div>
      </div>
    );
  };

  const getKanbanCardsLabel = (row) => {
    const lot = Number(row?.lot_qty ?? 0);
    const max = Number(row?.max_qty ?? 0);
    if (!Number.isFinite(lot) || lot <= 0) return '-';
    const cards = Math.max(1, Math.ceil(max / lot));
    return `${cards} x ${lot}`;
  };

  const getCategoryLabel = (value) => {
    if (!value) return 'Material';
    const raw = String(value).toLowerCase();
    if (raw.includes('raw')) return 'Raw Material';
    if (raw.includes('indirect')) return 'Indirect Material';
    if (raw.includes('consum')) return 'Consumable';
    if (raw.includes('subcon')) return 'Subcon';
    if (raw.includes('finished')) return 'Finished';
    return value;
  };

  const resolveKanbanActionMeta = (itemType) => {
    const text = String(itemType || '').trim().toLowerCase();
    if (!text) {
      return {
        categoryCode: 'UNKNOWN',
        categoryLabel: 'Material',
        actionType: 'routing_execution',
        actionLabel: 'Routing Execution',
        actionHint: 'Kategori belum ditentukan, cek routing item.',
        nextDestination: 'Routing Master',
      };
    }
    if (text.includes('raw')) {
      return {
        categoryCode: 'RM',
        categoryLabel: 'Raw Material',
        actionType: 'issue',
        actionLabel: 'Stock Movement / Issue',
        actionHint: 'Scan ini dipakai untuk issue stok ke line / work order.',
        nextDestination: 'Gudang / Line',
      };
    }
    if (text.includes('indirect') || text.includes('consum')) {
      return {
        categoryCode: 'IM',
        categoryLabel: 'Indirect Material',
        actionType: 'consumption',
        actionLabel: 'Consumption',
        actionHint: 'Scan ini dipakai untuk pemakaian consumable / indirect.',
        nextDestination: 'Work Center / Department',
      };
    }
    if (text.includes('subcon')) {
      return {
        categoryCode: 'SUBCON',
        categoryLabel: 'Subcon',
        actionType: 'external_transfer',
        actionLabel: 'External Transfer / Subcon',
        actionHint: 'Scan ini dipakai untuk kirim / terima material subcon.',
        nextDestination: 'Vendor / Subcon',
      };
    }
    if (text.includes('fg') || text.includes('finish') || text.includes('sub assy') || text.includes('subassy') || text.includes('child part') || text === 'cp' || text.startsWith('cp')) {
      const categoryCode = text.includes('sub assy') || text.includes('subassy')
        ? 'SA'
        : text.includes('child part') || text === 'cp' || text.startsWith('cp')
          ? 'CP'
          : 'FG';
      return {
        categoryCode,
        categoryLabel: categoryCode === 'SA'
          ? 'Sub-Assy'
          : categoryCode === 'CP'
            ? 'Child Part'
            : 'Finished Goods',
        actionType: 'routing_execution',
        actionLabel: 'Routing Execution',
        actionHint: 'Scan ini mengikuti routing proses aktif item.',
        nextDestination: 'Routing / Work Center',
      };
    }
    return {
      categoryCode: 'MATERIAL',
      categoryLabel: itemType || 'Material',
      actionType: 'routing_execution',
      actionLabel: 'Routing Execution',
      actionHint: 'Kategori tidak dikenali, gunakan routing aktif item.',
      nextDestination: 'Routing / Work Center',
    };
  };

  const formatScanTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredKanbanItems = useMemo(() => {
    const search = kanbanSearch.trim().toLowerCase();
    const category = kanbanCategoryFilter;
    return kanbanSettings.filter((row) => {
      const name = String(row.item_name || '').toLowerCase();
      const code = String(row.item_code || '').toLowerCase();
      const categoryLabel = getCategoryLabel(row.item_type || '').toLowerCase();
      const matchesSearch = !search || code.includes(search) || name.includes(search);
      const matchesCategory =
        category === 'all' ||
        (category === 'raw' && categoryLabel.includes('raw')) ||
        (category === 'indirect' && categoryLabel.includes('indirect')) ||
        (category === 'consumable' && categoryLabel.includes('consumable')) ||
        (category === 'subcon' && categoryLabel.includes('subcon'));
      return matchesSearch && matchesCategory;
    });
  }, [kanbanSettings, kanbanSearch, kanbanCategoryFilter]);

  const kanbanCardPayloads = useMemo(() => {
    const payloads = [];
    filteredKanbanItems.forEach((row) => {
      const lotQty = Number(row.lot_qty ?? row.min_qty ?? 0);
      const maxQty = Number(row.max_qty ?? 0);
      const totalCards = lotQty > 0 ? Math.max(1, Math.ceil(maxQty / lotQty)) : 1;
      const supplier = row.default_supplier || '-';
      const itemName = row.item_name || row.item_code || '-';
      const sidNumber = row.item_code || '-';
      const qtyBox = lotQty || row.min_qty || '-';
      const areaId = masterAreas[0]?.id || '-';
      const dockCode = masterDeliveries[0]?.id || 'N/A';
      const progressLine = masterWarehouses[0]?.id || 'N/A';
      const plantName = masterPlants[0]?.name || 'PLANT';
      Array.from({ length: totalCards }).forEach((_, idx) => {
        const arrivalTime = new Date().toISOString().slice(0, 16).replace('T', ' ');
        const orderNo = `${String(idx + 1).padStart(2, '0')} / ${totalCards}`;
        const uniqueNo = `${row.item_code || 'ITEM'}-${String(idx + 1).padStart(3, '0')}`;
        const conveyanceNo = `CV-${String(idx + 1).padStart(2, '0')}`;
        const pressBarcodeValue = `${row.item_code || 'ITEM'}-${String(idx + 1).padStart(3, '0')}`;
        payloads.push({
          key: `${row.item_code}-${idx}-${row.item_name}`,
          supplier,
          itemName,
          sidNumber,
          qtyBox,
          areaId,
          dockCode,
          progressLine,
          arrivalTime,
          orderNo,
          uniqueNo,
          pressLocation: areaId,
          conveyanceNo,
          pressBarcodeValue,
          plantName,
        });
      });
    });
    return payloads;
  }, [filteredKanbanItems, masterAreas, masterDeliveries, masterWarehouses, masterPlants]);

  const renderKanbanCard = (payload) => (
    <div
      key={payload.key}
      className="bg-white border border-slate-400 text-[10px] text-slate-900 shadow-sm print:shadow-none kanban-card"
      style={{ width: '190mm', height: '65mm' }}
    >
      <div className="grid grid-cols-[2fr_1fr] gap-1 p-2 h-full">
        <div className="border border-slate-400 flex flex-col h-full">
          <div className="grid grid-cols-3 border-b border-slate-400">
            <div className="col-span-2 border-r border-slate-400 p-1">
              <div className="text-[9px] uppercase text-slate-500">Supplier Part / Kode Supplier</div>
              <div className="text-[12px] font-bold">{payload.supplier} / {payload.sidNumber}</div>
            </div>
            <div className="p-1">
              <div className="text-[9px] uppercase text-slate-500">Penerima Part</div>
              <div className="text-[11px] font-bold">{payload.plantName}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-b border-slate-400">
            <div className="col-span-2 border-r border-slate-400 p-1">
              <div className="text-[9px] uppercase text-slate-500">Waktu Kedatangan Truck</div>
              <div className="text-[11px] font-bold">{payload.arrivalTime}</div>
            </div>
            <div className="p-1">
              <div className="text-[9px] uppercase text-slate-500">Unique No</div>
              <div className="text-[12px] font-bold">{payload.uniqueNo}</div>
            </div>
          </div>
          <div className="grid grid-cols-3 border-b border-slate-400 flex-1">
            <div className="col-span-2 border-r border-slate-400 p-1">
              <div className="text-[9px] uppercase text-slate-500">Barcode Nomor Part</div>
              <div className="mt-2 flex items-center gap-2">
                <QRCodeCanvas value={payload.sidNumber} size={42} />
                <div className="text-[10px] font-semibold">{payload.sidNumber}</div>
              </div>
            </div>
            <div className="p-1">
              <div className="text-[9px] uppercase text-slate-500">Qty per Kanban</div>
              <div className="text-[14px] font-bold">{payload.qtyBox}</div>
              <div className="text-[9px] uppercase text-slate-500 mt-2">Nomor Urut Order</div>
              <div className="text-[12px] font-bold">{payload.orderNo}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 border-b border-slate-400">
            <div className="border-r border-slate-400 p-1">
              <div className="text-[9px] uppercase text-slate-500">Nomor & Nama Part</div>
              <div className="text-[10px] font-semibold">{payload.sidNumber} - {payload.itemName}</div>
            </div>
            <div className="p-1">
              <div className="text-[9px] uppercase text-slate-500">Lokasi Press Part</div>
              <div className="text-[11px] font-bold">{payload.pressLocation}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 p-1">
            <div>
              <div className="text-[9px] uppercase text-slate-500">Supplier</div>
              <div className="text-[10px] font-semibold">{payload.supplier}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-slate-500">Area Store</div>
              <div className="text-[10px] font-semibold">{payload.areaId}</div>
            </div>
          </div>
        </div>
        <div className="border border-slate-400 flex flex-col h-full">
          <div className="border-b border-slate-400 p-1">
            <div className="text-[9px] uppercase text-slate-500">Dock Code</div>
            <div className="text-[14px] font-bold">{payload.dockCode}</div>
          </div>
          <div className="border-b border-slate-400 p-1">
            <div className="text-[9px] uppercase text-slate-500">Progress Line</div>
            <div className="text-[14px] font-bold">{payload.progressLine}</div>
          </div>
          <div className="border-b border-slate-400 p-1">
            <div className="text-[9px] uppercase text-slate-500">Conveyance No</div>
            <div className="text-[12px] font-bold">{payload.conveyanceNo}</div>
          </div>
          <div className="flex-1 p-1">
            <div className="text-[9px] uppercase text-slate-500">QR Nomor Press Part</div>
            <div className="mt-2 flex items-center gap-2">
              <QRCodeCanvas value={payload.pressBarcodeValue} size={60} />
              <div className="text-[10px] font-semibold">{payload.pressBarcodeValue}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const kanbanPrintPages = useMemo(() => {
    const cards = kanbanCardPayloads.map(renderKanbanCard);
    const pages = [];
    for (let i = 0; i < cards.length; i += 4) {
      const slice = cards.slice(i, i + 4);
      pages.push(
        <div key={`page-${i}`} className="kanban-page">
          {slice.map((card, idx) => (
            <React.Fragment key={`print-${i}-${idx}`}>
              {card}
              {idx < slice.length - 1 && (
                <div className="kanban-cutline-row">
                  <span className="kanban-cutline-icon">
                    <Scissors size={12} />
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }
    return pages;
  }, [kanbanCardPayloads]);

  const renderInboundCard = (card) => (
    <div
      key={card.card_uid}
      className="bg-white border border-slate-400 text-[10px] text-slate-900 shadow-sm print:shadow-none kanban-card"
      style={{ width: '190mm', height: '65mm' }}
    >
      <div className="grid grid-cols-[2fr_1fr] gap-2 p-2 h-full">
        <div className="border border-slate-400 flex flex-col h-full">
          <div className="border-b border-slate-400 p-1">
            <div className="text-[9px] uppercase text-slate-500">PO / Supplier</div>
            <div className="text-[12px] font-bold">{card.po_number || '-'} • {resolveSupplierLabel(card)}</div>
          </div>
          <div className="border-b border-slate-400 p-1">
            <div className="text-[9px] uppercase text-slate-500">Item</div>
            <div className="text-[11px] font-semibold">{card.item_code} - {card.item_name || card.schedule_item || '-'}</div>
          </div>
          <div className="grid grid-cols-3 border-b border-slate-400">
            <div className="col-span-2 border-r border-slate-400 p-1">
              <div className="text-[9px] uppercase text-slate-500">Batch / Lot</div>
              <div className="text-[11px] font-semibold">{card.batch_no || '-'}</div>
            </div>
            <div className="p-1">
              <div className="text-[9px] uppercase text-slate-500">Qty / Box</div>
              <div className="text-[14px] font-bold">{card.card_qty}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 p-1">
            <div>
              <div className="text-[9px] uppercase text-slate-500">Schedule</div>
              <div className="text-[10px] font-semibold">
                {card.request_date ? formatDateID(card.request_date) : '-'} {card.delivery_time || ''}
              </div>
            </div>
            <div>
              <div className="text-[9px] uppercase text-slate-500">Card</div>
              <div className="text-[11px] font-semibold">{String(card.card_seq || 0).padStart(2, '0')} / {card.total_cards || 0}</div>
            </div>
          </div>
        </div>
        <div className="border border-slate-400 flex flex-col h-full p-1">
          <div className="text-[9px] uppercase text-slate-500">QR Card</div>
          <div className="mt-1 flex items-center gap-2">
            <QRCodeCanvas value={card.card_uid} size={60} />
            <div className="text-[10px] font-semibold break-all">{card.card_uid}</div>
          </div>
          <div className="mt-auto text-[9px] uppercase text-slate-500">Status</div>
          <div className="text-[10px] font-semibold">{String(card.status || 'pending').toUpperCase()}</div>
        </div>
      </div>
    </div>
  );

  const inboundCardPrintPages = useMemo(() => {
    const cards = inboundCardPrintRows.map(renderInboundCard);
    const pages = [];
    for (let i = 0; i < cards.length; i += 4) {
      const slice = cards.slice(i, i + 4);
      pages.push(
        <div key={`inbound-page-${i}`} className="kanban-page">
          {slice.map((card, idx) => (
            <React.Fragment key={`inbound-print-${i}-${idx}`}>
              {card}
              {idx < slice.length - 1 && (
                <div className="kanban-cutline-row">
                  <span className="kanban-cutline-icon">
                    <Scissors size={12} />
                  </span>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      );
    }
    return pages;
  }, [inboundCardPrintRows]);

  const kanbanColumns = [
    { key: 'triggered', label: 'Triggered', tone: 'bg-amber-50 border-amber-200 text-amber-700' },
    { key: 'requested', label: 'Requested', tone: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { key: 'approved', label: 'Approved', tone: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { key: 'dn_created', label: 'DN Issued', tone: 'bg-blue-50 border-blue-200 text-blue-700' },
    { key: 'scheduled', label: 'Scheduled', tone: 'bg-sky-50 border-sky-200 text-sky-700' },
    { key: 'in_transit', label: 'In Transit', tone: 'bg-violet-50 border-violet-200 text-violet-700' },
    { key: 'receiving', label: 'Receiving/QC', tone: 'bg-orange-50 border-orange-200 text-orange-700' },
    { key: 'fifo', label: 'FIFO', tone: 'bg-lime-50 border-lime-200 text-lime-700' },
    { key: 'closed', label: 'Closed', tone: 'bg-slate-100 border-slate-200 text-slate-600' },
    { key: 'rejected', label: 'Rejected', tone: 'bg-red-50 border-red-200 text-red-700' },
  ];

  const kanbanByStatus = useMemo(() => {
    const groups = {};
    kanbanColumns.forEach((col) => { groups[col.key] = []; });
    kanbanRequests.forEach((row) => {
      const key = row.status || 'requested';
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });
    return groups;
  }, [kanbanRequests]);

  const getKanbanRequestHealth = (row) => {
    const statusKey = String(row?.status || 'requested').trim().toLowerCase();
    const onHand = Number(fifoTotalsByItemCode.get(row?.item_code) ?? 0);
    const requestQty = Number(row?.request_qty ?? 0);
    const createdAt = row?.created_at ? new Date(row.created_at) : null;
    const slaDueAt = row?.sla_due_at ? new Date(row.sla_due_at) : null;
    const nowMs = Date.now();
    const createdAtMs = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.getTime() : null;
    const slaDueAtMs = slaDueAt && !Number.isNaN(slaDueAt.getTime()) ? slaDueAt.getTime() : null;
    const ageHours = createdAtMs ? Math.max(0, Math.floor((nowMs - createdAtMs) / 3600000)) : 0;
    const hasException = Boolean(String(row?.exception_code || '').trim() || String(row?.exception_note || '').trim());
    const hasStockGap = ['triggered', 'requested', 'approved'].includes(statusKey) && onHand < requestQty;
    const isClosedLike = ['closed', 'rejected', 'fifo'].includes(statusKey);
    const fallbackOverdue = !isClosedLike && createdAtMs && ageHours >= 24;
    const isOverdue = !isClosedLike && (
      (slaDueAtMs && slaDueAtMs < nowMs) ||
      (!slaDueAtMs && fallbackOverdue)
    );
    const isBlocked = hasException || hasStockGap;
    return {
      onHand,
      requestQty,
      ageHours,
      hasException,
      hasStockGap,
      isBlocked,
      isOverdue,
      slaDueAt,
      createdAt,
    };
  };

  const filteredKanbanRequests = useMemo(() => {
    const statusFiltered = kanbanRequestStatusFilter === 'all'
      ? kanbanRequests
      : kanbanRequests.filter((row) => {
        const statusKey = String(row?.status || 'requested').trim().toLowerCase();
        if (kanbanRequestStatusFilter === 'pending') {
          return statusKey === 'triggered' || statusKey === 'requested';
        }
        return statusKey === kanbanRequestStatusFilter;
      });

    const quickFiltered = kanbanRequestQuickFilter === 'all'
      ? statusFiltered
      : statusFiltered.filter((row) => {
        const health = getKanbanRequestHealth(row);
        if (kanbanRequestQuickFilter === 'overdue') return health.isOverdue;
        if (kanbanRequestQuickFilter === 'blocked') return health.isBlocked;
        if (kanbanRequestQuickFilter === 'stock-gap') return health.hasStockGap;
        return true;
      });

    const filterValues = Object.values(kanbanRequestFilters || {}).some((val) => String(val || '').trim() !== '');
    if (!filterValues) return quickFiltered;

    const norm = (value) => String(value || '').trim().toLowerCase();
    const filters = {
      requestId: norm(kanbanRequestFilters.requestId),
      date: norm(kanbanRequestFilters.date),
      kanbanId: norm(kanbanRequestFilters.kanbanId),
      item: norm(kanbanRequestFilters.item),
      trigger: norm(kanbanRequestFilters.trigger),
      onHand: norm(kanbanRequestFilters.onHand),
      suggested: norm(kanbanRequestFilters.suggested),
      status: norm(kanbanRequestFilters.status),
    };

    return quickFiltered.filter((row) => {
      const health = getKanbanRequestHealth(row);
      const onHand = health.onHand;
      const orderQty = health.requestQty;
      const requestIdLabel = getRequestIdLabel(row);
      const createdLabel = row.created_at ? new Date(row.created_at).toLocaleString('id-ID') : '';
      const kanbanIdLabel = buildKanbanId(row.item_code, row.item_type);
      const itemLabel = `${row.item_code} - ${row.item_name || ''}`.trim();
      const triggerLabel = row.trigger_type === 'manual' ? 'Manual' : 'Auto';
      const statusLabel = row.status === 'triggered' || row.status === 'requested'
        ? 'Pending'
        : row.status === 'approved'
          ? 'Approved'
          : row.status === 'rejected'
            ? 'Rejected'
            : String(row.status || '');

      if (filters.requestId && !norm(requestIdLabel).includes(filters.requestId)) return false;
      if (filters.date && !norm(createdLabel).includes(filters.date)) return false;
      if (filters.kanbanId && !norm(kanbanIdLabel).includes(filters.kanbanId)) return false;
      if (filters.item && !norm(itemLabel).includes(filters.item)) return false;
      if (filters.trigger && !norm(triggerLabel).includes(filters.trigger)) return false;
      if (filters.status && !norm(statusLabel).includes(filters.status)) return false;
      if (filters.onHand) {
        const onHandText = norm(onHand);
        const onHandFormatted = norm(formatNumber0(onHand));
        if (!onHandText.includes(filters.onHand) && !onHandFormatted.includes(filters.onHand)) return false;
      }
      if (filters.suggested) {
        const orderText = norm(orderQty);
        const orderFormatted = norm(formatNumber0(orderQty));
        if (!orderText.includes(filters.suggested) && !orderFormatted.includes(filters.suggested)) return false;
      }
      return true;
    });
  }, [
    kanbanRequests,
    kanbanRequestStatusFilter,
    kanbanRequestQuickFilter,
    kanbanRequestFilters,
    fifoTotalsByItemCode,
    buildKanbanId,
    formatNumber0,
    getRequestIdLabel,
  ]);

  const kanbanPaginationMeta = useMemo(
    () => paginateRows('kanbanRequests', filteredKanbanRequests),
    [filteredKanbanRequests, tablePagination.kanbanRequests?.page, tablePagination.kanbanRequests?.perPage],
  );
  const prlPaginationMeta = useMemo(
    () => paginateRows('prl', filteredPrlRows),
    [filteredPrlRows, tablePagination.prl?.page, tablePagination.prl?.perPage],
  );
  const masterItemsPaginationMeta = useMemo(
    () => paginateRows('masterItems', filteredMasterItems),
    [filteredMasterItems, tablePagination.masterItems?.page, tablePagination.masterItems?.perPage],
  );
  const deliveryNotesSorted = useMemo(() => {
    if (!Array.isArray(deliveryNotes)) return [];
    return [...deliveryNotes].sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.planned_date || 0).getTime();
      const dateB = new Date(b?.created_at || b?.planned_date || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return Number(b?.id || 0) - Number(a?.id || 0);
    });
  }, [deliveryNotes]);
  const kanbanDnPaginationMeta = useMemo(
    () => paginateRows('kanbanDn', deliveryNotesSorted),
    [deliveryNotesSorted, tablePagination.kanbanDn?.page, tablePagination.kanbanDn?.perPage],
  );
  const receiveNoteHeaders = useMemo(() => {
    const groups = new Map();
    (receiveNotes || []).forEach((note) => {
      if (!note) return;
      const isHeader = note.rn_type === 'header' && note.rn_header_id;
      const key = isHeader ? `header-${note.rn_header_id}` : `legacy-${note.rn_number || note.id}`;
      if (!groups.has(key)) {
        groups.set(key, {
          id: key,
          rn_number: note.rn_number || '-',
          rn_type: note.rn_type || 'legacy',
          rn_header_id: note.rn_header_id || null,
          supplier: note.supplier || '-',
          received_at: note.received_at || note.arrival_date || null,
          notes: note.notes || '',
          truck_no: note.truck_no || '',
          driver_name: note.driver_name || '',
          dn_numbers: new Set(),
          qc_statuses: new Set(),
          status_set: new Set(),
          expected_total: 0,
          received_total: 0,
          item_ids: [],
          items: [],
        });
      }
      const group = groups.get(key);
      const expected = Number(note.expected_qty ?? note.doc_qty ?? 0);
      const actual = Number(note.received_qty ?? 0);
      group.expected_total += Number.isFinite(expected) ? expected : 0;
      group.received_total += Number.isFinite(actual) ? actual : 0;
      const receivedAt = note.received_at || note.arrival_date || null;
      if (receivedAt && (!group.received_at || new Date(receivedAt) > new Date(group.received_at))) {
        group.received_at = receivedAt;
      }
      if (!group.supplier && note.supplier) group.supplier = note.supplier;
      if (!group.notes && note.notes) group.notes = note.notes;
      if (!group.truck_no && note.truck_no) group.truck_no = note.truck_no;
      if (!group.driver_name && note.driver_name) group.driver_name = note.driver_name;
      if (note.dn_number) group.dn_numbers.add(note.dn_number);
      if (note.qc_status) group.qc_statuses.add(String(note.qc_status).toUpperCase());
      if (note.status) group.status_set.add(String(note.status).toLowerCase());
      if (note.id) group.item_ids.push(note.id);
      group.items.push(note);
    });
    const rows = Array.from(groups.values()).map((group) => {
      const dnList = Array.from(group.dn_numbers);
      const qcList = Array.from(group.qc_statuses);
      const statusList = Array.from(group.status_set);
      const expectedTotal = group.expected_total;
      const receivedTotal = group.received_total;
      return {
        ...group,
        dn_numbers: dnList,
        dn_reference: dnList.length > 1 ? `${dnList[0]} +${dnList.length - 1}` : (dnList[0] || '-'),
        qc_status: qcList.length > 1 ? 'MIX' : (qcList[0] || 'OK'),
        status: statusList.length > 1 ? 'mixed' : (statusList[0] || 'posted'),
        expected_total: expectedTotal,
        received_total: receivedTotal,
        variance: receivedTotal - expectedTotal,
        item_count: group.items.length,
      };
    });
    rows.sort((a, b) => {
      const left = a.received_at ? new Date(a.received_at).getTime() : 0;
      const right = b.received_at ? new Date(b.received_at).getTime() : 0;
      return right - left;
    });
    return rows;
  }, [receiveNotes]);
  const filteredReceiveNoteHeaders = useMemo(() => {
    const search = String(rnSearch || '').trim().toLowerCase();
    const start = rnDateStart ? String(rnDateStart) : '';
    const end = rnDateEnd ? String(rnDateEnd) : '';
    return receiveNoteHeaders.filter((row) => {
      const dateValue = row.received_at ? String(row.received_at).slice(0, 10) : '';
      if (start && (!dateValue || dateValue < start)) return false;
      if (end && (!dateValue || dateValue > end)) return false;
      const expected = Number(row.expected_total || 0);
      const actual = Number(row.received_total || 0);
      const isPartial = expected > 0 && actual < expected;
      const statusKey = isPartial ? 'partial' : 'received';
      if (rnStatus && rnStatus !== 'all' && statusKey !== rnStatus) return false;
      if (!search) return true;
      const dnText = Array.isArray(row.dn_numbers) ? row.dn_numbers.join(' ') : String(row.dn_reference || '');
      const haystack = [
        row.rn_number,
        row.supplier,
        row.dn_reference,
        dnText,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [receiveNoteHeaders, rnSearch, rnDateStart, rnDateEnd, rnStatus]);
  const kanbanReceivingPaginationMeta = useMemo(
    () => paginateRows('kanbanReceiving', filteredReceiveNoteHeaders),
    [filteredReceiveNoteHeaders, tablePagination.kanbanReceiving?.page, tablePagination.kanbanReceiving?.perPage],
  );
  const kanbanEmptyPaginationMeta = useMemo(
    () => paginateRows('kanbanEmpty', kanbanRequests),
    [kanbanRequests, tablePagination.kanbanEmpty?.page, tablePagination.kanbanEmpty?.perPage],
  );

  const getGroupedSchedules = () => {
    const groups = {};
    const sortedData = [...filteredSchedules].sort((a, b) => new Date(a.requestDate) - new Date(b.requestDate));
    sortedData.forEach(item => {
      const date = item.requestDate;
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return Object.keys(groups).map(date => ({ date, items: groups[date] }));
  };

  // --- HELPER LOGIC ---
  const scorecardSupplierOptions = useMemo(() => {
    const masterOptions = (masterVendors || [])
      .filter((vendor) => String(vendor?.type || '').toLowerCase() === 'supplier')
      .map((vendor) => {
        const value = String(vendor?.id || '').trim();
        const name = String(vendor?.name || '').trim();
        if (!value) return null;
        return {
          value,
          label: name ? `${value} - ${name}` : value,
        };
      })
      .filter(Boolean);
    if (masterOptions.length > 0) {
      return masterOptions.sort((a, b) => a.label.localeCompare(b.label, 'id'));
    }

    const seen = new Set();
    const fallbackRows = scorecardSchedules.length ? scorecardSchedules : schedules;
    return fallbackRows
      .map((row) => resolveScorecardSupplierMeta(row))
      .filter((supplier) => supplier.key && !seen.has(supplier.key) && seen.add(supplier.key))
      .map((supplier) => ({ value: supplier.key, label: supplier.name || supplier.key }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id'));
  }, [masterVendors, resolveScorecardSupplierMeta, schedules, scorecardSchedules]);
  const getUniqueSuppliers = () => {
    const vendorNames = masterVendors
      .filter((vendor) => String(vendor.type || '').toLowerCase() === 'supplier')
      .map((vendor) => vendor.id || vendor.name)
      .filter(Boolean);
    const uniqueVendors = [...new Set(vendorNames)];
    if (uniqueVendors.length > 0) return uniqueVendors.sort();
    const fallbackRows = scorecardSchedules.length ? scorecardSchedules : schedules;
    return [...new Set(fallbackRows.map((item) => resolveScorecardSupplierMeta(item).key).filter(Boolean))].sort();
  };
  function formatDateID(dateString) {
    if (!dateString) return "-";
    const date = parseDateOnly(dateString);
    if (!date) return "-";
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  }
  
  const isHolidayOrWeekend = (date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) return true;
    const holidays = ['2023-12-25', '2024-01-01', '2024-04-10', '2024-04-11', '2024-05-01', '2024-06-17', '2024-08-17', '2024-12-25'];
    const dateString = date.toISOString().split('T')[0];
    return holidays.includes(dateString);
  };

  function getNextBusinessDay(date) {
    let nextDate = new Date(date);
    while (isHolidayOrWeekend(nextDate)) { nextDate.setDate(nextDate.getDate() + 1); }
    return nextDate;
  }

  function formatExcelDate(dateVal) {
    if (!dateVal) return "";
    if (dateVal instanceof Date && !Number.isNaN(dateVal.getTime())) {
      return dateVal.toISOString().split('T')[0];
    }
    if (typeof dateVal === 'number' && Number.isFinite(dateVal)) {
      const epoch = Date.UTC(1899, 11, 30);
      const date = new Date(epoch + Math.round(dateVal) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    const raw = String(dateVal).trim();
    if (!raw) return "";
    if (/^\d+(\.\d+)?$/.test(raw)) {
      const num = Number(raw);
      if (Number.isFinite(num)) {
        const epoch = Date.UTC(1899, 11, 30);
        const date = new Date(epoch + Math.round(num) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
      const [dd, mm, yyyy] = raw.split('-');
      return `${yyyy}-${mm}-${dd}`;
    }
    return raw;
  }

  const formatPrintDateHeading = (value) => {
    const date = parseDateOnly(value);
    if (!date) return 'TANPA TANGGAL';
    const weekday = date.toLocaleDateString('id-ID', { weekday: 'long' }).toUpperCase();
    const rest = date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return `${weekday}, ${rest}`;
  };

  const normalizeType = (value) => {
    const rawValue = String(value || '').trim();
    const val = rawValue.toLowerCase();
    if (!val) return '';
    const directCode = masterCategories.find((category) => String(category.code || '').trim().toLowerCase() === val)?.code
      || masterCategoryOptions.find((category) => String(category || '').trim().toLowerCase() === val);
    if (directCode) return directCode;
    const byName = categoryCodeByName.get(val);
    if (byName) return byName;
    const findByKeyword = (keywords, fallback) => {
      const foundMaster = masterCategories.find((category) => {
        const codeValue = String(category.code || '').trim().toLowerCase();
        const nameValue = String(category.name || '').trim().toLowerCase();
        return keywords.some((keyword) => codeValue.includes(keyword) || nameValue.includes(keyword));
      });
      if (foundMaster?.code) return foundMaster.code;
      const foundOption = masterCategoryOptions.find((category) => {
        const optionValue = String(category || '').trim().toLowerCase();
        return keywords.some((keyword) => optionValue.includes(keyword));
      });
      return foundOption || fallback;
    };
    if (val.includes('raw') || val === 'rm') return findByKeyword(['raw', 'rm'], 'Raw Material');
    if (val.includes('indirect') || val === 'im') return findByKeyword(['indirect', 'im'], 'Indirect Material');
    if (val.includes('consum')) return findByKeyword(['consum'], 'Consumable');
    if (val.includes('subcon')) return findByKeyword(['subcon'], 'Subcon');
    if (val.includes('child') || val === 'cp' || val.startsWith('cp ')) return findByKeyword(['child', 'cp'], 'Child Part');
    if (val.includes('sub assy') || val.includes('sub-assy') || val.includes('subassy') || val === 'sa') return findByKeyword(['sub assy', 'sub-assy', 'subassy', 'sa'], 'Sub-Assy');
    if (val.includes('fin') || val.includes('fg')) return findByKeyword(['finished', 'fg'], 'Finished');
    return '';
  };

  const normalizeImportRow = (row = {}) => {
    const normalized = {};
    Object.entries(row || {}).forEach(([key, value]) => {
      const normalizedKey = String(key || '').trim().toLowerCase();
      if (!normalizedKey || normalized[normalizedKey] !== undefined) return;
      normalized[normalizedKey] = value;
    });
    return normalized;
  };

  const getImportValue = (row, keys = []) => {
    const normalizedRow = normalizeImportRow(row);
    for (const key of keys) {
      const normalizedKey = String(key || '').trim().toLowerCase();
      if (!normalizedKey) continue;
      const value = normalizedRow[normalizedKey];
      if (value !== undefined && String(value ?? '').trim() !== '') return value;
    }
    return '';
  };

  const inferImportType = (typeValue, sheetName = '', fileName = '') => {
    const directType = normalizeType(typeValue);
    if (directType) return directType;
    const context = `${sheetName} ${fileName}`.toLowerCase();
    if (context.includes('raw') || /\brm\b/.test(context)) return normalizeType('raw');
    if (context.includes('indirect') || /\bim\b/.test(context)) return normalizeType('indirect');
    if (context.includes('consum')) return normalizeType('consumable');
    if (context.includes('subcon')) return normalizeType('subcon');
    if (context.includes('child') || /\bcp\b/.test(context)) return normalizeType('child part');
    if (context.includes('sub assy') || context.includes('sub-assy') || context.includes('subassy') || /\bsa\b/.test(context)) return normalizeType('sub assy');
    if (context.includes('finish') || /\bfg\b/.test(context) || context.includes('master product')) return normalizeType('finished');
    return '';
  };

  const readItemImportRows = async (file) => {
    const XLSX = await ensureXlsx();
    if (!XLSX || !file) return [];
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const headerHints = ['kode item', 'uniq', 'uniq no', 'part name', 'nama item', 'part no', 'type', 'kategori', 'category', 'unit', 'uom', 'oum'];
          const collectedRows = [];
          wb.SheetNames.forEach((sheetName) => {
            const ws = wb.Sheets[sheetName];
            const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' });
            if (!Array.isArray(matrix) || matrix.length === 0) return;
            let headerIndex = -1;
            for (let index = 0; index < Math.min(matrix.length, 12); index += 1) {
              const row = Array.isArray(matrix[index]) ? matrix[index] : [];
              const normalizedCells = row.map((cell) => String(cell || '').trim().toLowerCase());
              const hitCount = headerHints.filter((hint) => normalizedCells.some((cell) => cell.includes(hint))).length;
              if (hitCount >= 2) {
                headerIndex = index;
                break;
              }
            }
            if (headerIndex === -1) return;
            const headerRow = (matrix[headerIndex] || []).map((cell, index) => {
              const label = String(cell || '').trim();
              return label || `column_${index + 1}`;
            });
            for (let index = headerIndex + 1; index < matrix.length; index += 1) {
              const row = Array.isArray(matrix[index]) ? matrix[index] : [];
              if (!row.some((cell) => String(cell || '').trim() !== '')) continue;
              const rowObject = {};
              headerRow.forEach((header, cellIndex) => {
                rowObject[header] = row[cellIndex] ?? '';
              });
              rowObject.__sheetName = sheetName;
              collectedRows.push(rowObject);
            }
          });
          if (collectedRows.length > 0) {
            resolve(collectedRows);
            return;
          }
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);
          resolve(Array.isArray(data) ? data : []);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Gagal membaca file Excel.'));
      reader.readAsBinaryString(file);
    });
  };

  const readXlsRows = async (file, onRows) => {
    const XLSX = await ensureXlsx();
    if (!XLSX) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        onRows(data);
      } catch (error) {
        alert('Gagal membaca file XLS.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const postSequential = async (items, handler) => {
    const results = [];
    for (const item of items) {
      const res = await handler(item);
      results.push(res);
    }
    return results;
  };

    // --- SCORECARD LOGIC ---
  const calculateSupplierPerformance = () => {
    const performance = {};
    const baseSchedules = scorecardSchedules;
    const scheduleById = new Map(baseSchedules.map((row) => [row.id, row]));
    const normalizedScorecardPeriod = normalizeMonthRange(scorecardFilterMonthStart, scorecardFilterMonthEnd);
    const getMonthKey = (value) => String(value || '').slice(0, 7);
    const formatPeriodLabel = (periodKey) => {
      const [yearStr, monthStr] = String(periodKey || '').split('-');
      const yearNum = Number(yearStr || 0);
      const monthNum = Number(monthStr || 0);
      if (!yearNum || !monthNum) return '';
      return new Date(yearNum, monthNum - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    };
    const selectedSupplierKey = scorecardFilterSupplier === 'All'
      ? 'All'
      : resolveScorecardSupplierMeta(scorecardFilterSupplier).key;
    const filteredForScorecard = baseSchedules.filter(item => {
        const supplierMeta = resolveScorecardSupplierMeta(item);
        const matchesSupplier = selectedSupplierKey === 'All' || supplierMeta.key === selectedSupplierKey;
        const matchesMonth = (!normalizedScorecardPeriod.startMonth && !normalizedScorecardPeriod.endMonth)
          || isMonthWithinRange(item.requestDate, normalizedScorecardPeriod.startMonth, normalizedScorecardPeriod.endMonth);
        return matchesSupplier && matchesMonth;
    });

    filteredForScorecard.forEach(item => {
      // ? FILTER: Abaikan item hasil split dari perhitungan "Total Jadwal"
      if (item.isSplitResult) return;

      const supplierMeta = resolveScorecardSupplierMeta(item);
      const supplierKey = String(supplierMeta.key || '').trim();
      const periodKey = getMonthKey(item.requestDate);
      if (!supplierKey) return;
      if (!periodKey) return;
      const bucketKey = `${supplierKey}::${periodKey}`;
      if (!performance[bucketKey]) {
        performance[bucketKey] = {
          supplierId: supplierKey,
          name: supplierMeta.name || supplierKey,
          periodKey,
          periodLabel: formatPeriodLabel(periodKey),
          totalSchedules: 0,
          onTime: 0,
          late: 0,
          pending: 0,
          tooEarly: 0,
          items: new Set(),
          totalOrdered: 0,
          totalReceived: 0,
          lastDate: item.requestDate,
          packingTotal: 0,
          packingLoose: 0,
        };
      }
      performance[bucketKey].name = supplierMeta.name || performance[bucketKey].name || supplierKey;
      performance[bucketKey].totalSchedules += 1;
      performance[bucketKey].items.add(item.item);
      performance[bucketKey].totalOrdered += parseInt(item.requestQty || 0);
      performance[bucketKey].totalReceived += parseInt(item.receivedQty || 0);
      if(new Date(item.requestDate) > new Date(performance[bucketKey].lastDate)) performance[bucketKey].lastDate = item.requestDate;

      const kpiStatus = getKpiStatus(item);
      if (kpiStatus === 'On Time') performance[bucketKey].onTime += 1;
      else if (kpiStatus === 'Late') performance[bucketKey].late += 1;
      else if (kpiStatus === 'Too Early') performance[bucketKey].tooEarly += 1;
      else performance[bucketKey].pending += 1;
    });

    (receiveNotes || []).forEach((note) => {
      const schedule = scheduleById.get(note.schedule_id);
      const supplierMeta = resolveScorecardSupplierMeta({
        supplier_id: schedule?.supplier_id || schedule?.po_supplier_id,
        supplier: note.supplier || schedule?.supplier,
        supplier_name: schedule?.supplier_name,
      });
      const supplierKey = String(supplierMeta.key || '').trim();
      if (!supplierKey) return;
      if (selectedSupplierKey !== 'All' && supplierKey !== selectedSupplierKey) return;
      const dateRef = schedule?.requestDate || String(note.received_at || '').slice(0, 10);
      if ((normalizedScorecardPeriod.startMonth || normalizedScorecardPeriod.endMonth)
        && !isMonthWithinRange(dateRef, normalizedScorecardPeriod.startMonth, normalizedScorecardPeriod.endMonth)) return;
      const periodKey = getMonthKey(dateRef);
      if (!periodKey) return;
      const bucketKey = `${supplierKey}::${periodKey}`;
      if (!performance[bucketKey]) {
        performance[bucketKey] = {
          supplierId: supplierKey,
          name: supplierMeta.name || supplierKey,
          periodKey,
          periodLabel: formatPeriodLabel(periodKey),
          totalSchedules: 0,
          onTime: 0,
          late: 0,
          pending: 0,
          tooEarly: 0,
          items: new Set(),
          totalOrdered: 0,
          totalReceived: 0,
          lastDate: dateRef || new Date().toISOString().slice(0, 10),
          packingTotal: 0,
          packingLoose: 0,
        };
      }
      performance[bucketKey].name = supplierMeta.name || performance[bucketKey].name || supplierKey;
      const itemCode = note.item_code || schedule?.item || '';
      const packQty = Number(masterItemsByCode.get(itemCode)?.pack_qty ?? 0);
      const receivedQty = Number(note.received_qty || 0);
      if (!Number.isFinite(packQty) || packQty <= 0 || receivedQty <= 0) return;
      const isLooseFlag = Boolean(note.is_loose);
      const computedLoose = packQty > 0 && receivedQty % packQty !== 0;
      const isLoose = isLooseFlag || computedLoose;
      performance[bucketKey].packingTotal += 1;
      if (isLoose) performance[bucketKey].packingLoose += 1;
      performance[bucketKey].items.add(itemCode);
      const lastRef = performance[bucketKey].lastDate || '';
      if (String(dateRef || '') > String(lastRef || '')) performance[bucketKey].lastDate = dateRef;
    });

    return Object.keys(performance).map(key => {
      const data = performance[key];
      const timeScore = data.totalSchedules > 0 ? (data.onTime / data.totalSchedules) * 100 : 0;
      const qtyScore = data.totalOrdered > 0 ? (data.totalReceived / data.totalOrdered) * 100 : 0;
      const hasPacking = data.packingTotal > 0;
      const packingScore = hasPacking ? ((data.packingTotal - data.packingLoose) / data.packingTotal) * 100 : null;
      const timeWeight = hasPacking ? 0.6 : 0.7;
      const qtyWeight = hasPacking ? 0.3 : 0.3;
      const packingWeight = hasPacking ? 0.1 : 0;
      const weightedScore = (timeScore * timeWeight) + (qtyScore * qtyWeight) + (hasPacking ? (packingScore * packingWeight) : 0);
      let rating = 1;
      if (weightedScore >= 95) rating = 5;
      else if (weightedScore >= 80) rating = 4;
      else if (weightedScore >= 60) rating = 3;
      else if (weightedScore >= 40) rating = 2;
      return {
        ...data,
        items: Array.from(data.items),
        timeScore: Math.round(timeScore),
        qtyScore: Math.round(qtyScore),
        packingScore: Number.isFinite(packingScore) ? Math.round(packingScore) : null,
        rating,
        monthLabel: data.periodLabel || '',
      };
    }).sort((a, b) => {
      if (a.periodKey !== b.periodKey) return String(a.periodKey || '').localeCompare(String(b.periodKey || ''));
      if (a.name !== b.name) return String(a.name || '').localeCompare(String(b.name || ''), 'id');
      if (b.rating !== a.rating) return b.rating - a.rating;
      return b.timeScore - a.timeScore;
    });
  };

  // --- VALIDATE & AI ---
  const callAiGenerate = useCallback(async ({ contents, responseMimeType }) => {
    return apiFetch('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify({ contents, responseMimeType }),
    });
  }, [apiFetch]);
  
  const callGeminiAI = async (prompt, title, isJson = false) => {
    const ready = await ensureAiConfigured();
    if (!ready) return;
    setAiActionTitle(title); setAiModalOpen(true); setIsAiLoading(true); setAiResponse(null);
    try {
      const data = await callAiGenerate({
        contents: [{ parts: [{ text: prompt }] }],
        responseMimeType: isJson ? "application/json" : undefined,
      });
      if (data?.error) throw new Error(data.error.message || data.error);
      if (data?.candidates?.length) {
          const text = data.candidates[0].content.parts[0].text;
          setAiResponse(isJson ? JSON.parse(text) : text);
      } else {
          setAiResponse('AI tidak memberikan jawaban.');
      }
    } catch (error) { setAiResponse(`Error: ${error.message}`); } finally { setIsAiLoading(false); }
  };

  // --- GENERATE AI REPORT (VISUAL) ---
  const handleGenerateReport = async () => {
      const rows = await ensureSchedulesLoaded();
      if (!Array.isArray(rows) || rows.length === 0) { alert("Data kosong!"); return; }
      const summary = rows.map(s => `- ${s.supplier}: PO ${s.poNumber}, Item ${s.item}, Status ${s.status}, Qty ${s.requestQty}, Tiba ${s.receivedQty}`).join('n');
      const prompt = `Analisis data logistik ini dan berikan respons dalam format JSON murni. Data:n${summary}nFormat JSON: {"summary": "Ringkasan singkat...", "stats": {"onTime": 0, "late": 0, "pending": 0, "totalQtyReceived": 0}, "criticalIssues": ["Isu 1"], "recommendations": ["Saran 1"]}`;
      callGeminiAI(prompt, "✨ Laporan Statistik Cerdas (AI)", true); 
  };

  const handleAnalyzeData = async () => {
      await handleGenerateReport();
  };

  // --- OTHER AI HANDLERS ---
  const handleImageSelect = (e) => { 
    const file = e.target.files[0]; 
    if (file) { 
        setSelectedImage(file); 
        const reader = new FileReader(); 
        reader.onloadend = () => setImagePreview(reader.result); 
        reader.readAsDataURL(file); 
    } 
  };
  
  const fileToGenerativePart = (file) => new Promise((resolve) => { const reader = new FileReader(); reader.onloadend = () => resolve(reader.result.split(',')[1]); reader.readAsDataURL(file); });
  const handleSmartParse = async () => {
    const ready = await ensureAiConfigured();
    if (!ready) return;
    if (!rawInputText.trim() && !selectedImage) { alert("Masukkan teks/foto."); return; }
    setIsParsing(true);
    try {
      let parts = []; if (selectedImage) { const b64 = await fileToGenerativePart(selectedImage); parts.push({ inline_data: { mime_type: selectedImage.type, data: b64 } }); parts.push({ text: "Analisa gambar." }); }
      parts.push({ text: `Extract JSON: poNumber, supplier, item, requestQty (number), requestDate (YYYY-MM-DD), deliveryTime (string e.g '08:00'). ${rawInputText} Return ONLY valid JSON.` });
      const data = await callAiGenerate({ contents: [{ parts: parts }], responseMimeType: "application/json" });
      if (data?.error) throw new Error(data.error.message || data.error);
      if (data.candidates) { const parsed = JSON.parse(data.candidates[0].content.parts[0].text); let time = parsed.deliveryTime || '08:00 (Cycle 1)'; if (time.includes('13')) time = '13:30 (Cycle 2)'; else if (time.includes('20')) time = '20:30 (Cycle 3)'; else if (time.includes('01')) time = '01:30 (Cycle 4)'; setNewPlan(prev => ({ ...prev, poNumber: parsed.poNumber||prev.poNumber, supplier: parsed.supplier||prev.supplier, item: parsed.item||prev.item, requestQty: parsed.requestQty||prev.requestQty, requestDate: parsed.requestDate||prev.requestDate, deliveryTime: time })); setParseModalOpen(false); setRawInputText(''); setSelectedImage(null); setImagePreview(null); alert("Data diekstrak!"); }
    } catch (e) { alert("Error: " + e.message); } finally { setIsParsing(false); }
  };

  // --- CHATBOT HANDLER ---
  const handleChatSubmit = async (e) => {
    e.preventDefault(); if (!chatInput.trim()) return;
    const ready = await ensureAiConfigured();
    if (!ready) return;
    const newMessages = [...chatMessages, { role: 'user', text: chatInput }]; setChatMessages(newMessages); setChatInput(''); setIsChatLoading(true);
    const rows = await ensureSchedulesLoaded();
    const contextData = (Array.isArray(rows) ? rows : []).map(s => `${s.supplier} (PO ${s.poNumber}): ${s.item} ${s.requestQty}pcs, Jadwal ${s.requestDate}, Status: ${s.status}`).join('n');
    const prompt = `Asisten Logistik. Data:n${contextData}nJawab user: ${chatInput}`;
    try {
        const data = await callAiGenerate({ contents: [{ parts: [{ text: prompt }] }] });
        if (data?.candidates?.length) {
            const aiText = String(data.candidates[0].content.parts[0].text);
            setChatMessages([...newMessages, { role: 'ai', text: aiText }]);
        } else {
            setChatMessages([...newMessages, { role: 'ai', text: "Maaf, saya sedang pusing." }]);
        }
    } catch (error) { setChatMessages([...newMessages, { role: 'ai', text: "Gagal terhubung ke AI." }]); } finally { setIsChatLoading(false); }
  };

  const inboundPrintMeta = (() => {
    const supplierLabel = printSupplierGroups.length === 1
      ? (printSupplierGroups[0]?.supplierLabel || 'Semua Supplier')
      : 'Semua Supplier';
    const startLabel = filterStart ? formatDateID(filterStart) : '';
    const endLabel = filterEnd ? formatDateID(filterEnd) : '';
    const startMonthLabel = filterStart
      ? new Date(filterStart).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : '';
    const endMonthLabel = filterEnd
      ? new Date(filterEnd).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      : '';
    let periodLabel = '';
    if (filterStart && filterEnd) {
      periodLabel = `${startLabel} - ${endLabel}`;
    } else if (filterStart) {
      periodLabel = `Mulai ${startLabel}`;
    } else if (filterEnd) {
      periodLabel = `Sampai ${endLabel}`;
    } else {
      periodLabel = new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    let titleMonthLabel = '';
    if (startMonthLabel && endMonthLabel) {
      titleMonthLabel = startMonthLabel === endMonthLabel ? startMonthLabel : `${startMonthLabel} - ${endMonthLabel}`;
    } else {
      titleMonthLabel = startMonthLabel || endMonthLabel || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    }
    const printDateLabel = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    return { supplierLabel, periodLabel, printDateLabel, titleMonthLabel };
  })();

  const inboundPrintLayout = (
    <div className="inbound-print-portal">
      <div className="inbound-schedule-print-wrapper hidden">
        {printSupplierGroups.length === 0 ? (
          <div className="text-xs text-slate-500 mt-4">Belum ada jadwal untuk periode ini.</div>
        ) : printSupplierGroups.map((supplierGroup, supplierIndex) => (
          <div
            key={supplierGroup.supplierKey || `supplier-${supplierIndex}`}
            className="print-supplier-group"
            style={supplierIndex > 0 ? { breakBefore: 'page', pageBreakBefore: 'always' } : undefined}
          >
            <div className="print-header">
              <div className="header-left">
                <h1>Jadwal Kedatangan Supplier-{inboundPrintMeta.titleMonthLabel}</h1>
                <p>Platform Terintegrasi: Perencanaan &amp; Evaluasi Kinerja</p>
                <div className="print-report-meta">
                  <div><span>Nama Supplier:</span> <strong>{supplierGroup.supplierLabel || inboundPrintMeta.supplierLabel}</strong></div>
                  <div><span>Periode:</span> <strong>{inboundPrintMeta.periodLabel}</strong></div>
                </div>
              </div>
              <div className="header-right">
                <img src={logoMatra} alt="Logo PT. Matra Roda Piranti" />
              </div>
            </div>
            <div className="inbound-schedule-summary-grid">
              <div className="summary-card summary-card--total">
                <div className="summary-label">
                  TOTAL PO{searchQuery || (filterSupplier && filterSupplier !== 'All') ? ' (Filtered)' : ''}
                </div>
                <div className="summary-value">{supplierGroup.stats.totalPO}</div>
                <div className="summary-meta">Total Jadwal {supplierGroup.stats.totalScheduleDates}</div>
              </div>
              <div className="summary-card summary-card--ontime">
                <div className="summary-label">ON TIME</div>
                <div className="summary-value">{supplierGroup.stats.onTime}</div>
              </div>
              <div className="summary-card summary-card--late">
                <div className="summary-label">LATE</div>
                <div className="summary-value">{supplierGroup.stats.late}</div>
              </div>
              <div className="summary-card summary-card--early">
                <div className="summary-label">TOO EARLY</div>
                <div className="summary-value">{supplierGroup.stats.tooEarly}</div>
              </div>
              <div className="summary-card summary-card--pending">
                <div className="summary-label">PENDING</div>
                <div className="summary-value">{supplierGroup.stats.pending}</div>
              </div>
            </div>
            <div className="print-schedule-groups">
              {supplierGroup.schedulesByDate.map((group, idx) => (
                <div key={`${supplierGroup.supplierKey}-${group.date ?? 'nodate'}-${idx}`} className="print-date-group">
                  <div className="print-date-heading">
                    <span className="print-date-icon">
                      <CalendarDays size={16} />
                    </span>
                    <span className="print-date-label">{formatPrintDateHeading(group.date)}</span>
                  </div>
                  <div className="print-date-table-wrapper">
                    <table className="print-date-table">
                      <thead>
                        <tr>
                          <th>No PO</th>
                          <th>Supplier</th>
                          <th>Barang</th>
                          <th>Waktu</th>
                          <th>No SJ</th>
                          <th>Order</th>
                          <th>Actual</th>
                          <th>Balance +/-</th>
                          <th>Status</th>
                          <th>Catatan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.rows.map((row) => {
                          const displayOrderQty = getDisplayOrderQty(row);
                          const balance = (Number(row.receivedQty) || 0) - (Number(displayOrderQty) || 0);
                          const balanceText = balance === 0 ? '-' : (balance > 0 ? `+${balance}` : `${balance}`);
                          const balanceClass = balance < 0 ? 'print-balance--negative' : 'print-balance--positive';
                          return (
                            <tr key={`print-${supplierGroup.supplierKey}-${row.id}`}>
                              <td>{row.poNumber}</td>
                              <td>{resolveSupplierLabel(row)}</td>
                              <td>{row.itemName || row.item}</td>
                              <td>{row.deliveryTime || '-'}</td>
                              <td>{row.doNumber || '-'}</td>
                              <td>{displayOrderQty ?? '-'}</td>
                              <td>{row.receivedQty ?? '-'}</td>
                              <td className={balanceClass}>{balanceText}</td>
                              <td>
                                <span className={`print-status-badge ${getPrintStatusClass(row.status)}`}>
                                  {row.status || '-'}
                                </span>
                              </td>
                              <td>{row.notes || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const inboundPrintPortal = showInboundPrint && typeof document !== 'undefined'
    ? createPortal(inboundPrintLayout, document.body)
    : null;

  const tabProps = {
    activeConfigModal,
    addModelCodeToItemForm,
    apiFetch,
    appendConfigToken,
    areaForm,
    batchForm,
    bomProcessOptions,
    buildKanbanId,
    inboundCardAdjustLoading,
    inboundCardAdjustOpen,
    inboundCardAdjustSchedule,
    inboundCardAdjustTarget,
    inboundCardScanLoading,
    inboundCardScanOpen,
    inboundCardScanValue,
    inboundNav,
    clearInboundNav,
    calculateSupplierPerformance,
    canEditSchedules,
    isStockOpnameLocked,
    canImportExport,
    canProduction,
    canViewMaster,
    canManageMaster,
    canManageVendors,
    canManageItems,
    canViewPrl,
    canPrlProcess,
    canPrlImport,
    canDeleteRecords,
    canUseAI,
    canViewReport,
      canViewScorecard,
      aiConfigured,
      aiStatusLoading,
    refreshAiConfigStatus,
    ensureAiConfigured,
    resolveSupplierLabel,
    categoryForm,
    categoryNameByCode,
    closeConfigModal,
    closeDnDetailModal,
    closeDnPrintModal,
    closeInventoryDetail,
    configModalDraft,
    configModalKey,
    configModalValue,
    consumeQty,
    consumeStockFromScan,
    createRequestFromScan,
    criticalStockRows,
    currentYear,
    customerForm,
    DELIVERY_CYCLES,
    deliveryForm,
    deliveryNotesLoading,
    dnDetailEditable,
    dnDetailEdits,
    dnDetailLoading,
    dnDetailRows,
    dnForm,
    dnPrintLoading,
    dnPrintPayload,
    dnPrintMode,
    dnStatusFlowList,
    emptyKanbanForm,
    expiringSoonRows,
    extractAreaNote,
    extractKanbanIdNote,
    fetchKanbanRequests,
    fetchKanbanSettings,
    fetchDeliveryNotes,
    fetchReceiveNotes,
    refreshSchedules,
    fetchMasterReferences,
    fetchReport,
    fetchQualityObjectivesReport,
    fetchStockCoverageReport,
    fetchSlowMovingReport,
    fetchInboundPerformanceReport,
      fetchFifoViolationReport,
      fetchInventoryValueReport,
      fetchSupplierShortageReport,
      fetchRawMaterialLedgerReport,
      fetchAllMutationReport,
      fetchOutstandingPrlReport,
    fetchKpiSummary,
    fifoActiveLots,
    fifoDepletedLots,
    fifoKanbanItems,
    fifoLots,
    fifoMethodOptions,
    fifoSimActive,
    fifoSimStep,
    fetchSoOpenSession,
    fifoTotalLots,
    fifoTotalsByItemCode,
    fifoTotalStock,
    filteredFifoLots,
    filteredKanbanItems,
    filteredMasterItems,
    filteredSchedules,
    dashboardSchedules,
    dashboardSchedulesLoading,
    dashboardStats,
    dashboardStatsLoading,
    scheduleLoading,
    schedulePage,
    schedulePerPage,
    scheduleTotal,
    scheduleTotalPages,
    handleSchedulePageChange,
    handleSchedulePerPageChange,
    filterEnd,
    filterStart,
    filterStatus,
    filterSupplier,
    formatDateID,
    getNextBusinessDay,
    formatModelCodes,
    formatNumber0,
    formatNumber2,
    formatRelationList,
    formatRupiah,
    formatScanTime,
    normalizeQtyByNsp,
    getCategoryLabel,
    getDisplayOrderQty,
    getTotalOrderQty,
    getFifoQualityBadge,
    getFifoStatusBadge,
    getInventoryStatusBadge,
    getKanbanCardsLabel,
    getPrlTypePack,
    getPrlVolPerDay,
    getRemainingQty,
    getPoLineRemainingAfterSchedule,
    getRequestIdLabel,
    getUniqueSuppliers,
    ensureXlsx,
    ensureSchedulesLoaded: scheduleStore.ensureSchedulesLoaded,
    handleAnalyzeData,
    handleAddPlan,
    handleApproveAndCreateDn,
    handleBatchSubmit,
    handleCancelEdit,
    handleInboundCardAdjustSubmit,
    handleInboundCardScanSubmit,
    handlePrintInboundCards,
    scheduleSupplierOptions,
    handleCreateDn,
    handleCreateSchedule,
    handleDelete,
    handleDeleteDn,
    handleDownloadTemplate,
    handleImportExcel,
    handleExportExcel,
    scheduleEditOpen,
    scheduleEditForm,
    setScheduleEditForm,
    scheduleEditSaving,
    scheduleEditError,
    closeScheduleEdit,
    handleScheduleEditSave,
    handleGenerateReport,
    handleDeleteKanbanRequest,
    handleDeleteMaster,
    handleDeleteModel,
    handleDeleteProcess,
    handleDnEmail,
    handleDnDetailSave,
    handleForceCloseDn,
    handleDnPreview,
    handleDnPrintPdf,
    handleDnPrintKanban,
    handleDownloadItemsTemplate,
    handleEdit,
    handleEditModel,
    handleEditProcess,
    handleEmptyKanbanSubmit,
    handleExportItemsXls,
    handleExportReportExcel,
    handleExportQualityObjectivesExcel,
    handleExportStockCoverageExcel,
    handleExportSlowMovingExcel,
    handleExportInboundPerformanceExcel,
    handleExportFifoViolationExcel,
    handleExportInventoryValueExcel,
    handleExportSupplierShortageExcel,
    handleExportRawMaterialLedgerExcel,
    handleExportOutstandingPrlExcel,
    handleFifoDelete,
    handleFifoIssue,
    handleFifoReceive,
    handleInventoryDelete,
    handleLoadSampleScan,
    handleManualRequest,
    handlePrintPDF,
    handlePrintQualityObjectives,
    handlePrlPrintPdf,
    handlePrlExport,
    handlePrlImport,
    handlePrlModelSelection,
    handlePrlPeriodChange,
    handlePrlRelease,
    handlePrlTemplateDownload,
    openKanbanShortageInPrl,
    handleProcessScan,
    handleReceive,
    handleRejectKanban,
    handleRequestDnBatch,
    handleSaveArea,
    handleSaveCategory,
    handleSaveConfig,
    handleSaveCustomer,
    handleSaveDelivery,
    handleSaveItemMaster,
    handleSaveKanbanSetting,
    handleGenerateKanbanFromMasterItems,
    handleSaveLocation,
    handleSaveModel,
    handleSaveProcess,
    handleSavePacking,
    handleSavePlant,
    handleSaveVendor,
    handleSaveWarehouse,
    handleSendEmail,
    handleSendEmailReminder,
    handleSyncInventoryFromKanban,
    handleUnlockActual,
    handleUpdateActual,
    inputMode,
    inventoryAgingData,
    inventoryCategoryAgingData,
    inventoryDetailItem,
    inventoryDetailLots,
    inventoryDetailOpen,
    inventoryFilterBucket,
    inventoryHealthSummary,
    inventoryHeatmapData,
    inventoryItems,
    inventoryShowKanban,
    isEditing,
    itemBulkCategory,
    itemBulkCustomer,
    itemBulkOpen,
    itemBulkSaving,
    itemBulkShelfLife,
    itemBulkSupplier,
    itemBulkTypePack,
    itemCustomerMap,
    itemMasterForm,
    itemMenuOpen,
    itemModelEntry,
    items,
    itemsImportRef,
    itemSupplierMap,
    itemTableFilters,
    itemDuplicateKeySets,
    kanbanCategory,
    kanbanCategoryFilter,
    kanbanDashboardCategoryFilter,
    kanbanDnPaginationMeta,
    kanbanEditMode,
    kanbanEmptyPaginationMeta,
    kanbanError,
    kanbanLoading,
    kanbanPaginationMeta,
    kanbanPipelineSummary,
    kanbanRequestStatusFilter,
    kanbanRequestQuickFilter,
    kanbanRequestFilters,
    kanbanReceivingPaginationMeta,
    kanbanRequests,
    filteredKanbanRequests,
    getKanbanRequestHealth,
    kanbanSearch,
    kanbanSettings,
    kanbanSettingsByCode,
    kanbanSettingsForm,
    kanbanStatusData,
    kanbanSubTab,
    kanbanView,
    locationForm,
    editingLocationId,
    mainTab,
    manualRequestForm,
    masterAreas,
    masterCategories,
    masterCategoryOptions,
    masterConfig,
    masterCustomers,
    masterDataHealth,
    masterDeliveries,
    masterError,
    masterFormVisible,
    masterEditingItemCode,
    masterItems,
    masterItemsByCode,
    masterItemsPaginationMeta,
    masterLoading,
    masterLocations,
    masterLocationsById,
    masterModels,
    masterModelsMap,
    masterProcesses,
    masterPackings,
    masterPlants,
    masterRefTab,
    masterVendorSearch,
    masterVendors,
    masterWarehouses,
    modelCatalogForm,
    modelFormVisible,
    processCatalogForm,
    processFormVisible,
    monthKeyByIndex,
    newPlan,
    openConfigModal,
    openDnDetailModal,
    openDnModal,
    openInboundCardAdjustModal,
    openInboundScheduleFromToast,
    openInventoryDetail,
    openQrModal,
    openReceiveModal,
    openScheduleModal,
    openVendorDetail,
    packingForm,
    packingNameByCode,
    parseDateOnly,
    parseModelCodes,
    plantForm,
    prlCategoryOptions,
    prlClusteredData,
    prlColumns,
    prlCoverageData,
    prlAutoDraftSummary,
    prlActiveMonthKey,
    prlActiveMonthLabel,
    prlMonthKeys,
    prlFilters,
    prlFlowOpen,
    prlImportRef,
    prlLoading,
    prlMenuOpen,
    prlMonthLabel,
    prlPaginationMeta,
    prlParetoData,
    prlScatterData,
    prlShortageSummary,
    productionTodaySummary,
    qcStatusOptions,
    qrPayload,
    qrTitle,
    receiveForm,
    receiveNotesLoading,
    removeModelCodeFromItemForm,
    renderPaginationControls,
    reportEnd,
    reportLoading,
    reportRows,
    reportStart,
    reportSummary,
    reportSupplier,
    reportTab,
    getWorkingDays,
    capacityPlanningMonth,
    setCapacityPlanningMonth,
    capacityPlanningYear,
    setCapacityPlanningYear,
    capacityPlanningData,
    qualityObjectivesMonth,
    qualityObjectivesData,
    stockCoverageDays,
    stockCoverageRows,
    slowMovingRows,
    inboundPerformanceRows,
    fifoViolationRows,
    inventoryValueRows,
    inventoryValueTotal,
    rawMaterialLedgerPeriodType,
    rawMaterialLedgerMonth,
    rawMaterialLedgerYear,
      rawMaterialLedgerRows,
      rawMaterialLedgerLoading,
      rawMaterialLedgerError,
      rawMaterialLedgerMeta,
      rawMaterialLedgerCategory,
      rawMaterialLedgerLocation,
      setRawMaterialLedgerCategory,
      setRawMaterialLedgerLocation,
      allMutationStart,
      setAllMutationStart,
      allMutationEnd,
      setAllMutationEnd,
      allMutationCategory,
      setAllMutationCategory,
      allMutationLocation,
      setAllMutationLocation,
      allMutationRows,
      allMutationLoading,
      allMutationError,
      supplierShortageRows: filteredSupplierShortageRows,
      supplierShortageSummary: filteredSupplierShortageSummary,
      supplierShortageSupplier,
      setSupplierShortageSupplier,
      supplierShortageSupplierOptions,
      supplierShortageMonth,
      setSupplierShortageMonth,
    supplierShortageYear,
    setSupplierShortageYear,
    outstandingPrlRows,
    outstandingPrlMonth,
    outstandingPrlYear,
    fetchCapacityPlanningReport,
    handleExportCapacityPlanningExcel,
    kpiSummary,
    kpiLoading,
    resetMasterForms,
    resolveVendorFromSupplier,
    handleKanbanProcessStart,
    handleKanbanProcessFinish,
    scanActiveResult,
    scanError,
    scanInput,
    scanMode,
    scanResults,
    scanVideoRef,
    scheduleForm,
    scheduleReadinessData,
    scheduleReadinessMeta,
    scheduleReadinessLoading,
    scorecardSchedulesLoading,
    scorecardSupplierOptions,
    schedules,
    scorecardFilterMonthStart,
    scorecardFilterMonthEnd,
    scorecardFilterSupplier,
    searchQuery,
    selectedDnDetail,
    selectedFifoKanban,
    selectedItemCodes,
    selectedRequestIds,
    selectedScheduleIds,
    setActiveMenu,
    setAreaForm,
    setBatchForm,
    setInboundCardAdjustOpen,
    setInboundCardAdjustTarget,
    setInboundCardScanOpen,
    setInboundCardScanValue,
    setCategoryForm,
    setConfigModalDraft,
    setConfigModalValue,
    setConsumeQty,
    setCustomerForm,
    setDeliveryForm,
    setDnDetailEdits,
    setDnForm,
    setEditingAreaId,
    setEditingCategoryCode,
    setEditingCustomerId,
    setEditingDeliveryId,
    setEditingLocationId,
    setEditingModelCode,
    setEditingProcessCode,
    setEditingPackingCode,
    setEditingPlantId,
    setEditingVendorId,
    setEditingWarehouseId,
    setEmptyKanbanForm,
    setFifoSimActive,
    setFilterEnd,
    setFilterStart,
    setFilterStatus,
    setFilterSupplier,
    setScorecardFilterMonthStart,
    setScorecardFilterMonthEnd,
    setInputMode,
    setInventoryFilterBucket,
    setInventoryShowKanban,
    setItemBulkCategory,
    setItemBulkCustomer,
    setItemBulkOpen,
    setItemBulkSaving,
    setItemBulkShelfLife,
    setItemBulkSupplier,
    setRawMaterialLedgerPeriodType,
    setRawMaterialLedgerMonth,
    setRawMaterialLedgerYear,
    setItemBulkTypePack,
    setItemMasterForm,
    setItemMenuOpen,
    setItemModelEntry,
    setItemTableFilters,
    setKanbanCategory,
    setKanbanCategoryFilter,
    setKanbanDashboardCategoryFilter,
    setKanbanEditMode,
    setKanbanRequestStatusFilter,
    setKanbanRequestQuickFilter,
    setKanbanRequestFilters,
    setKanbanSearch,
    setKanbanSettingsForm,
    setKanbanSubTab,
    setKanbanView,
    setLocationForm,
    setMainTab,
    setManualRequestForm,
    setMasterEditingItemCode,
    setMasterFormVisible,
    setMasterRefTab,
    setMasterVendorSearch,
    setModelCatalogForm,
    setModelFormVisible,
    setProcessCatalogForm,
    setProcessFormVisible,
    setNewPlan,
    setPackingForm,
    setParseModalOpen,
    setPlantForm,
    setPrlFilters,
    setPrlFlowOpen,
    setPrlMenuOpen,
    setReceiveForm,
    setReportEnd,
    setReportStart,
    setReportSupplier,
    setStockCoverageDays,
    setQualityObjectivesMonth,
    setOutstandingPrlMonth,
    setOutstandingPrlYear,
    setScanCameraEnabled,
    setScanError,
    setScanInput,
    setScanMode,
    setScheduleForm,
    setScorecardFilterSupplier,
    setRnDateEnd,
    setRnDateStart,
    setRnSearch,
    setRnStatus,
    setSearchQuery,
    setSelectedFifoKanban,
    setSelectedItemCodes,
    setSelectedRequestIds,
    setSelectedScheduleIds,
    setShowBatchModal,
    setShowConsumeModal,
    setShowDnModal,
    setShowForm,
    setShowKanbanCardModal,
    setShowKanbanEdit,
    setShowManualRequestModal,
    setShowQrModal,
    setShowReceiveModal,
    setShowScheduleModal,
    setShowTriggerChoiceModal,
    setVendorForm,
    setWarehouseForm,
    showBatchModal,
    showConsumeModal,
    showDnDetailModal,
    showDnModal,
    showDnPrintModal,
    showForm,
    showKanbanEdit,
    showManualRequestModal,
    showQrModal,
    showReceiveModal,
    showScheduleModal,
    showToastMessage,
    soOpenSession,
    stats: dashboardStats,
    supplierPerformanceData,
    toggleRequestSelection,
    user,
    vendorForm,
    vendorTypeOptions,
    warehouseTypeOptions,
    warehouseForm,
    rnDateEnd,
    rnDateStart,
    rnSearch,
    rnStatus,
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 p-4 font-sans text-slate-800 print:bg-white print:p-0 app-container">
        <div className="max-w-7xl mx-auto content-wrapper">
        {/* HEADER SECTION */}
        <div className={showScorecard ? 'print:hidden' : ''}>
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:mb-4 print:hidden">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3 text-indigo-900 print:text-black">
                  <img src="/logo.png" alt="Logo Sistem" className="h-9 w-9 object-contain" />
                  <span className="print:hidden">Master Schedule &amp; Kanban System (MSK-S)</span>
                  <span className="hidden print:block">Master Schedule &amp; Kanban System (MSK-S)</span>
                </h1>
                <p className="text-gray-500 print:text-sm print:text-black">Platform Integrated PRL &amp; Material Forecasting System (kanban)</p>
                {user && (<div className="text-xs text-gray-400 print:text-black">Login: {user.username} ({user.role})</div>)}
              </div>
              <div className="flex flex-wrap gap-2 print:hidden">
                  {/* ICON ONLY BUTTONS WITH TOOLTIPS */}
                  {canEditSchedules && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGlobalSearch}
                        className="bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50 transition"
                        title="Global Search"
                      >
                        <Search size={20} />
                      </button>
                      <button
                        type="button"
                        onClick={handleNotifications}
                        className="relative bg-white border border-slate-200 text-slate-600 p-2 rounded-lg shadow-sm hover:bg-slate-50 transition"
                        title="Notifikasi"
                      >
                        <Bell size={20} />
                        {notificationCount > 0 && (
                          <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
                            {notificationCount}
                          </span>
                        )}
                      </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenu(null);
                        setReportMenuOpen(false);
                        setShowForm(false);
                        setMainTab('kanban');
                        setKanbanView('board');
                        setKanbanSubTab('scan');
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white p-2 rounded-lg shadow transition"
                      title="Pemindai QR/Barcode"
                    >
                      <QrCode size={20} />
                    </button>
                    </div>
                  )}
                  




                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    ref={itemsImportRef}
                    onChange={handleImportItemsXls}
                  />

                  {canManageUsers && (
                    <button onClick={() => setShowUserModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 rounded-lg shadow transition" title="Manajemen User">
                      <Users size={20} />
                    </button>
                  )}


                  <div className="w-px h-8 bg-gray-300 mx-1"></div>
                  <button onClick={onLogout} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg shadow transition" title="Keluar"><LogOut size={20} /></button>
              </div>
            </header>
            {isPrimaryLoading && (
              <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
                Memuat data...
              </div>
            )}
            {isPrimaryTab && !isPrimaryLoading && isMasterEmpty && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Data Master belum tersedia. Silakan input di menu Master Referensi.
              </div>
            )}
            {soOpenSession && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Stock Opname sedang OPEN ({soOpenSession.period}). Hindari input produksi/receiving sampai selesai.
              </div>
            )}

            {isSupplier ? (
              <div className="mb-6 flex flex-wrap gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur">
                  <button
                    onClick={() => setMainTab('supplier')}
                    className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'supplier' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Supplier Portal
                  </button>
                </div>
              </div>
            ) : (
              <div className="mb-6 flex flex-wrap gap-3 print:hidden">
                <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 p-1 shadow-sm backdrop-blur">
                  <button
                    onClick={() => setMainTab('dashboard')}
                    className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'dashboard' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => setMainTab('monitoring')}
                    className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'monitoring' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Inbound Schedule
                  </button>
                  {canEditSchedules && (
                    <button
                      onClick={() => setMainTab('kanban')}
                      className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'kanban' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Kanban Board
                    </button>
                  )}
                  <button
                    onClick={() => setMainTab('fifo')}
                    className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'fifo' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Management FIFO
                  </button>
                  <button
                    onClick={() => setMainTab('inventory')}
                    className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'inventory' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Inventory
                  </button>
                  {canSubcon && (
                    <button
                      onClick={() => setMainTab('subcon')}
                      className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'subcon' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Subcon
                    </button>
                  )}
                  {canViewPrl && (
                    <button
                      onClick={() => setMainTab('prl')}
                      className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'prl' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      PRL
                    </button>
                  )}
                  {canViewMaster && (
                    <button
                      onClick={() => setMainTab('masterref')}
                      className={`px-4 py-2 rounded-full text-sm transition ${mainTab === 'masterref' ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      Master Referensi
                    </button>
                  )}
                  {isAdmin ? (
                    <div className={`relative ${settingsMenuOpen ? 'z-[120]' : 'z-10'}`}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportMenuOpen(false);
                          setSettingsMenuOpen((prev) => !prev);
                        }}
                        className={`px-4 py-2 rounded-full text-sm border transition flex items-center gap-2 ${(mainTab === 'settings' || mainTab === 'audit') ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                      >
                        Pengaturan
                        <ChevronDown size={14} />
                      </button>
                      {settingsMenuOpen && (
                        <div className="absolute left-0 top-full mt-2 w-48 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl z-[130]">
                          <button
                            onClick={() => {
                              setMainTab('settings');
                              setSettingsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                          >
                            Pengaturan
                          </button>
                          <button
                            onClick={() => {
                              setMainTab('audit');
                              setSettingsMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700"
                          >
                            Audit Trail
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setMainTab('settings')}
                      className={`px-4 py-2 rounded-full text-sm border transition ${(mainTab === 'settings') ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      Pengaturan
                    </button>
                  )}
                </div>

                {(canViewReport || canViewScorecard) && (
                  <div className={`relative ${reportMenuOpen ? 'z-[120]' : 'z-10'}`}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSettingsMenuOpen(false);
                        setReportMenuOpen((prev) => !prev);
                      }}
                      className={`px-4 py-2 rounded-full text-sm border transition flex items-center gap-2 ${mainTab === 'reports' ? 'bg-slate-900 text-white border-slate-900 shadow' : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                    >
                      Laporan
                      <ChevronDown size={14} />
                    </button>
                    {reportMenuOpen && (
                      <div className="absolute left-0 top-full mt-2 w-56 overflow-hidden rounded-lg border border-gray-100 bg-white shadow-xl z-[130]">
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('rekap'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText size={14} /> Report Rekap Supplier/PO
                          </button>
                        )}
                        {canViewScorecard && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('scorecard'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Trophy size={14} /> Rapor Kinerja Supplier
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('stock-coverage'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <BarChart3 size={14} /> Stock Coverage
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('slow-moving'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <TrendingDown size={14} /> Slow &amp; Dead Stock
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('inbound-performance'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ArrowDownUp size={14} /> Inbound Performance
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('inbound-matrix'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileSpreadsheet size={14} /> Delivery Matrix Inbound
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('fifo-violations'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <AlertTriangle size={14} /> FIFO Violation Log
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('inventory-value'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <Coins size={14} /> Inventory Value
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('supplier-shortage'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <AlertTriangle size={14} /> Report Shortage Supplier
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('all-mutations'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <FileText size={14} /> All Laporan Mutasi
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('sasaran-mutu'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <CheckCircle size={14} /> Sasaran Mutu
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('outstanding-prl'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <ListChecks size={14} /> Outstanding PRL
                          </button>
                        )}
                        {canViewReport && (
                          <button
                            onClick={() => { setMainTab('reports'); setReportTab('capacity-planning'); setReportMenuOpen(false); }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                          >
                            <BarChart3 size={14} /> Capacity Planning
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
            
            <TabErrorBoundary key={`${mainTab}-${tabReloadNonce}`} onRetry={handleTabRetry}>
              <Suspense
                fallback={(
                  <div className="mb-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                    Memuat tab...
                  </div>
                )}
              >
                {isDashboardTab && <TabDashboard {...tabProps} />}
                {mainTab === 'supplier' && <TabSupplierPortal {...tabProps} />}
                {mainTab === 'monitoring' && <TabInbound {...tabProps} />}
                {mainTab === 'fifo' && <TabFifo {...tabProps} />}
                  {mainTab === 'inventory' && <TabInventory {...tabProps} />}
                {mainTab === 'prl' && <TabPrl {...tabProps} />}
                {mainTab === 'masterref' && <TabMasterRef {...tabProps} />}
                {mainTab === 'kanban' && <TabKanban {...tabProps} />}
                {mainTab === 'reports' && <TabReports {...tabProps} />}
                {mainTab === 'subcon' && <TabSubcon {...tabProps} />}
                {mainTab === 'audit' && <TabAuditLogs {...tabProps} />}
                {mainTab === 'settings' && <TabSettings {...tabProps} />}
              </Suspense>
            </TabErrorBoundary>
                    {/* MODALS */}
                    {showTriggerChoiceModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh] overflow-hidden">
                          <div className="p-4 border-b flex justify-between items-center">
                            <div className="text-sm font-semibold">Buat Kanban</div>
                            <button onClick={() => setShowTriggerChoiceModal(false)} className="text-slate-500"><X size={18} /></button>
                          </div>
                          <div className="p-5 space-y-3 text-sm text-slate-600">
                            <div className="text-xs text-slate-500">
                              Pilih mode pembuatan request. Otomatis hanya untuk item Critical tanpa request aktif.
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              <button
                                className="px-4 py-2 rounded border text-left hover:bg-slate-50"
                                onClick={() => {
                                  setShowTriggerChoiceModal(false);
                                  setShowManualRequestModal(true);
                                }}
                              >
                                Manual Request
                              </button>
                              <button
                                className="px-4 py-2 rounded bg-slate-900 text-white text-left hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed"
                                onClick={async () => {
                                  setShowTriggerChoiceModal(false);
                                  await handleAutoTriggerKanban();
                                }}
                                disabled={isAutoTriggering}
                              >
                                {isAutoTriggering ? 'Memproses...' : 'Auto Trigger (Critical)'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    {parseModalOpen && canUseAI && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden"><div className="bg-white rounded-xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-y-auto"><div className="p-4 border-b bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-xl flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><Wand2 className="text-yellow-300" size={20} /> Isi Otomatis (AI)</h3><button onClick={() => setParseModalOpen(false)} className="text-white/80"><X size={20} /></button></div><div className="p-6"><div className="mb-4"><label className="block text-sm font-semibold text-gray-700 mb-2">Opsi 1: Upload Foto Dokumen/PO</label><div onClick={() => fileInputRef.current.click()} className="border-2 border-dashed border-gray-300 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition">{imagePreview ? (<div className="relative w-full h-32"><img src={imagePreview} alt="Preview" className="w-full h-full object-contain rounded"/><button onClick={(e) => { e.stopPropagation(); setImagePreview(null); setSelectedImage(null); }} className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"><X size={12} /></button></div>) : (<><ImageIcon className="text-gray-400 mb-2" size={32} /><p className="text-xs text-gray-500">Klik untuk upload foto (JPG/PNG)</p></>)}<input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageSelect}/></div></div><div className="relative flex py-2 items-center"><div className="flex-grow border-t border-gray-200"></div><span className="flex-shrink-0 mx-4 text-gray-400 text-xs">ATAU</span><div className="flex-grow border-t border-gray-200"></div></div><div className="mt-2"><label className="block text-sm font-semibold text-gray-700 mb-2">Opsi 2: Paste Teks Pesan</label><textarea className="w-full border p-3 rounded-lg text-sm h-24 focus:ring-2 focus:ring-purple-500 outline-none" placeholder="Contoh: 'Pak, kiriman PT Maju Jaya PO-9905 bsk dikirim separuh dulu ya 500 pcs.'" value={rawInputText} onChange={(e) => setRawInputText(e.target.value)}/></div></div><div className="p-4 border-t flex justify-end gap-2 bg-gray-50 rounded-b-xl"><button onClick={() => setParseModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">Batal</button><button onClick={handleSmartParse} disabled={isParsing} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2 disabled:opacity-50 shadow-lg">{isParsing ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} {isParsing ? 'Sedang Memproses...' : 'Ekstrak Data'}</button></div></div></div>)}
            
                    {showKanbanCardModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none kanban-print-page">
                          <div className="p-4 border-b flex justify-between items-center print:hidden">
                            <div className="text-sm font-semibold">Kanban Cards</div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border rounded">Print</button>
                              <button onClick={() => setShowKanbanCardModal(false)} className="text-slate-500"><X size={18} /></button>
                            </div>
                          </div>
                        <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0 kanban-print-scroll">
                          <div className="kanban-print-screen print:hidden">
                            <div className="kanban-preview-page">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 kanban-print-grid kanban-preview-grid">
                                {kanbanPrintPages}
                              </div>
                            </div>
                          </div>
                          <div className="kanban-print-only hidden print:block">
                            {kanbanPrintPages}
                          </div>
                        </div>
                      </div>
                    </div>
                    )}

                    {showInboundCardModal && (
                      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:static print:bg-white print:p-0 print:items-start print:justify-start kanban-print-scope">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden print:shadow-none print:rounded-none print:max-h-none kanban-print-page">
                          <div className="p-4 border-b flex justify-between items-center print:hidden">
                            <div className="text-sm font-semibold">Inbound Kanban Cards</div>
                            <div className="flex items-center gap-2">
                              <button onClick={() => window.print()} className="px-3 py-1.5 text-xs border rounded">Print</button>
                              <button onClick={() => { setShowInboundCardModal(false); setInboundCardPrintRows([]); }} className="text-slate-500"><X size={18} /></button>
                            </div>
                          </div>
                          <div className="p-4 overflow-y-auto bg-slate-50 print:bg-white print:p-0 kanban-print-scroll">
                            <div className="kanban-print-screen print:hidden">
                              <div className="kanban-preview-page">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 kanban-print-grid kanban-preview-grid">
                                  {inboundCardPrintPages}
                                </div>
                              </div>
                            </div>
                            <div className="kanban-print-only hidden print:block">
                              {inboundCardPrintPages}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
            
                    {/* AI REPORT MODAL (VISUAL) */}
                    {aiModalOpen && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
                                <div className="p-4 border-b bg-indigo-600 rounded-t-xl flex justify-between items-center text-white">
                                    <h3 className="font-bold flex items-center gap-2"><Sparkles size={20} /> {aiActionTitle}</h3>
                                    <button onClick={() => setAiModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded"><X size={20} /></button>
                                </div>
                                <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                                    {isAiLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                                            <Loader2 className="animate-spin text-indigo-500 mb-2" size={40} />
                                            <p className="text-sm font-medium animate-pulse">AI sedang menganalisis data...</p>
                                        </div>
                                    ) : (
                                        aiResponse && typeof aiResponse === 'object' ? (
                                            <div className="space-y-6">
                                                <div className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-indigo-500">
                                                    <h4 className="text-indigo-900 font-bold mb-2">Ringkasan Eksekutif</h4>
                                                    <p className="text-gray-700 text-sm leading-relaxed">{aiResponse.summary}</p>
                                                </div>
                                                {aiResponse.stats && (
                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                        <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
                                                            <div className="text-2xl font-bold text-green-600">{aiResponse.stats.onTime}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold">On Time</div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
                                                            <div className="text-2xl font-bold text-red-600">{aiResponse.stats.late}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Late</div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
                                                            <div className="text-2xl font-bold text-yellow-600">{aiResponse.stats.pending}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Pending</div>
                                                        </div>
                                                        <div className="bg-white p-3 rounded-lg shadow-sm text-center border border-gray-100">
                                                            <div className="text-lg font-bold text-gray-800">{aiResponse.stats.totalQtyReceived?.toLocaleString()}</div>
                                                            <div className="text-[10px] text-gray-500 uppercase font-bold">Qty Diterima</div>
                                                        </div>
                                                    </div>
                                                )}
                                                <div className="grid md:grid-cols-2 gap-4">
                                                    <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                                                        <h4 className="text-red-800 font-bold mb-3 flex items-center gap-2"><AlertTriangle size={16}/> Isu Kritis</h4>
                                                        <ul className="list-disc pl-5 space-y-1 text-sm text-red-700">
                                                            {aiResponse.criticalIssues?.map((issue, i) => <li key={i}>{issue}</li>)}
                                                        </ul>
                                                    </div>
                                                    <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                                        <h4 className="text-green-800 font-bold mb-3 flex items-center gap-2"><CheckCircle size={16}/> Rekomendasi</h4>
                                                        <ul className="list-disc pl-5 space-y-1 text-sm text-green-700">
                                                            {aiResponse.recommendations?.map((rec, i) => <li key={i}>{rec}</li>)}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="prose prose-sm max-w-none bg-white p-6 rounded-lg shadow-sm whitespace-pre-wrap">{aiResponse}</div>
                                        )
                                    )}
                                </div>
                                {!isAiLoading && (
                                    <div className="p-4 border-t flex justify-end bg-gray-50">
                                        <button onClick={() => setAiModalOpen(false)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm shadow-lg transition">Tutup Laporan</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
            {/* USER MANAGEMENT MODAL */}
            {showUserModal && canManageUsers && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm print:hidden">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
                  <div className="p-4 border-b bg-indigo-600 rounded-t-xl flex justify-between items-center text-white">
                    <h3 className="font-bold flex items-center gap-2"><Users size={20} /> Manajemen User</h3>
                    <button onClick={() => setShowUserModal(false)} className="text-white/80"><X size={18} /></button>
                  </div>
                  <div className="p-6 overflow-y-auto bg-slate-50 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-slate-600">Kelola akun user, role, dan hak akses.</div>
                      <button
                        type="button"
                        onClick={handleOpenCreateUserForm}
                        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded-lg text-sm shadow-sm"
                      >
                        <Plus size={14} /> Tambah User
                      </button>
                    </div>
                    {userError && <div className="text-sm text-red-600 mb-2">{userError}</div>}
                    <div className="bg-white rounded-lg border overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="text-left p-3">Username</th>
                            <th className="text-left p-3">Role</th>
                            <th className="text-left p-3">Supplier</th>
                            <th className="text-left p-3">Akses</th>
                            <th className="text-left p-3">Created</th>
                            <th className="text-left p-3">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userLoading && (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-400">Memuat...</td></tr>
                          )}
                          {!userLoading && userList.length === 0 && (
                            <tr><td colSpan="6" className="p-4 text-center text-gray-400">Belum ada user.</td></tr>
                          )}
                          {!userLoading && userList.map((u) => {
                            const enabledPermissions = getEnabledPermissionKeys(u.permissions || {});
                            const permissionTooltip = enabledPermissions.length
                              ? enabledPermissions.map((key) => permissionLabels[key] || key).join(', ')
                              : 'Tidak ada akses';
                            return (
                              <tr key={u.id} className="border-t">
                                <td className="p-3 font-medium">{u.username}</td>
                                <td className="p-3">
                                  <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                                    {u.role}
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-gray-500">{u.supplier_id || u.supplierId || '-'}</td>
                                <td className="p-3">
                                  <span title={permissionTooltip} className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-xs text-sky-700">
                                    {enabledPermissions.length} Akses
                                  </span>
                                </td>
                                <td className="p-3 text-xs text-gray-500">{formatUserCreatedAt(u.created_at)}</td>
                                <td className="p-3">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <button onClick={() => handleEditUser(u)} className="text-indigo-600 text-xs">Edit</button>
                                    <button
                                      type="button"
                                      onClick={() => handleResetUserPassword(u)}
                                      disabled={userResettingId === u.id}
                                      className="text-rose-600 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {userResettingId === u.id ? 'Resetting...' : 'Reset Password'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                {showUserFormDrawer && (
                  <div className="absolute inset-0 z-10 flex justify-end bg-slate-950/20" onClick={() => setShowUserFormDrawer(false)}>
                    <div className="h-full w-full max-w-3xl bg-white shadow-2xl border-l border-slate-200 p-5 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="text-lg font-semibold text-slate-900">{editingUserId ? 'Edit User' : 'Tambah User'}</div>
                          <div className="text-xs text-slate-500">Role akan mengisi preset hak akses otomatis, lalu bisa Anda custom.</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowUserFormDrawer(false)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <form onSubmit={handleCreateUser} className="grid grid-cols-1 gap-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Username</label>
                            <input
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              placeholder="Username"
                              value={newUserForm.username}
                              onChange={(e) => setNewUserForm((prev) => ({ ...prev, username: e.target.value }))}
                              disabled={!!editingUserId}
                            />
                          </div>
                          {!editingUserId && (
                            <div>
                              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Password</label>
                              <input
                                type="password"
                                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                                placeholder="Password"
                                value={newUserForm.password}
                                onChange={(e) => setNewUserForm((prev) => ({ ...prev, password: e.target.value }))}
                              />
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                            <div>
                              <div className="text-sm font-semibold text-slate-900">Role Matrix</div>
                              <div className="text-xs text-slate-500">Pilih role preset, lalu custom checkbox jika perlu.</div>
                            </div>
                            <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-700">
                              Role aktif: {newUserForm.role}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {userRoleOptions.map((role) => {
                              const rolePermissions = buildRolePresetPermissions(role);
                              const enabledCount = getEnabledPermissionKeys(rolePermissions).length;
                              const isActiveRole = newUserForm.role === role;
                              return (
                                <button
                                  key={role}
                                  type="button"
                                  onClick={() => handleUserRoleChange(role)}
                                  className={`rounded-xl border p-3 text-left transition ${
                                    isActiveRole
                                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                                      : 'border-slate-200 bg-white hover:border-slate-300'
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <div className="text-sm font-semibold uppercase tracking-wide text-slate-900">{role}</div>
                                      <div className="mt-1 text-xs text-slate-500">{userRoleDescriptions[role] || '-'}</div>
                                    </div>
                                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                      isActiveRole ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                                    }`}
                                    >
                                      {enabledCount} akses
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white">
                            <table className="min-w-[760px] w-full text-xs">
                              <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                  <th className="p-2 text-left font-semibold">Grup Akses</th>
                                  {userRoleOptions.map((role) => (
                                    <th key={role} className="p-2 text-center font-semibold uppercase tracking-wide">{role}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {permissionGroups.map((group) => (
                                  <tr key={group.title} className="border-t border-slate-100">
                                    <td className="p-2 font-medium text-slate-700">{group.title}</td>
                                    {userRoleOptions.map((role) => {
                                      const summary = getPermissionGroupSummary(buildRolePresetPermissions(role), group.keys);
                                      return (
                                        <td key={`${group.title}-${role}`} className="p-2 text-center">
                                          <span className={`inline-flex min-w-[68px] items-center justify-center rounded-full px-2 py-1 font-semibold ${
                                            summary.allEnabled
                                              ? 'bg-emerald-100 text-emerald-700'
                                              : summary.someEnabled
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-slate-100 text-slate-500'
                                          }`}
                                          >
                                            {summary.enabledCount}/{summary.totalCount}
                                          </span>
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {newUserForm.role === 'supplier' && (
                          <div>
                            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Supplier</label>
                            <select
                              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              value={newUserForm.supplierId}
                              onChange={(e) => setNewUserForm((prev) => ({ ...prev, supplierId: e.target.value }))}
                            >
                              <option value="">Pilih Supplier</option>
                              {masterVendors.map((vendor) => (
                                <option key={vendor.id} value={vendor.id}>{vendor.id} - {vendor.name}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="space-y-3">
                          {permissionGroups.map((group) => {
                            const summary = getPermissionGroupSummary(newUserForm.permissions || {}, group.keys);
                            return (
                              <div key={group.title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{group.title}</div>
                                    <div className="text-xs text-slate-500">{summary.enabledCount} dari {summary.totalCount} akses aktif</div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handlePermissionGroupToggle(group.keys, !summary.allEnabled)}
                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${
                                      summary.allEnabled
                                        ? 'border-rose-200 bg-rose-50 text-rose-700'
                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    }`}
                                  >
                                    {summary.allEnabled ? 'Clear Group' : 'Check Group'}
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                                  {group.keys.map((key) => {
                                    const checked = Boolean(newUserForm.permissions?.[key]);
                                    return (
                                      <label
                                        key={key}
                                        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                                          checked
                                            ? 'border-indigo-300 bg-indigo-50 text-indigo-900'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                                        }`}
                                      >
                                        <input
                                          type="checkbox"
                                          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                          checked={checked}
                                          onChange={(e) => handlePermissionToggle(key, e.target.checked)}
                                        />
                                        <div className="min-w-0">
                                          <div className="font-medium">{permissionLabels[key] || key}</div>
                                          <div className="mt-1 text-[11px] uppercase tracking-wide text-slate-400">{key}</div>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            className="px-4 py-2 text-sm rounded bg-gray-100 text-gray-600"
                            onClick={() => setShowUserFormDrawer(false)}
                          >
                            Batal
                          </button>
                          <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded text-sm">
                            {editingUserId ? 'Simpan' : 'Buat User'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
        {globalSearchOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm print:hidden">
            <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Pencarian Global</div>
                  <div className="text-xs text-slate-500">Cari PO, vendor, item, dan jadwal inbound dalam satu tempat.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalSearchOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="px-5 py-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    ref={globalSearchInputRef}
                    value={globalSearchQuery}
                    onChange={(e) => setGlobalSearchQuery(e.target.value)}
                    placeholder="Ketik No. PO / Item / Supplier / Vendor..."
                    className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-700 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-200"
                  />
                </div>
                <div className="mt-4 max-h-[520px] overflow-y-auto rounded-xl border border-slate-200">
                  {globalSearchQuery.trim() === '' ? (
                    <div className="p-4 text-xs text-slate-500">Mulai mengetik untuk menampilkan hasil.</div>
                  ) : globalSearchLoading ? (
                    <div className="p-4 text-xs text-slate-500">Mencari data...</div>
                  ) : globalSearchError ? (
                    <div className="p-4 text-xs text-rose-600">{globalSearchError}</div>
                  ) : (globalSearchResults?.groups || []).every((group) => (group.items || []).length === 0) ? (
                    <div className="p-4 text-xs text-slate-500">Tidak ditemukan hasil.</div>
                  ) : (
                    (globalSearchResults?.groups || []).map((group) => {
                      const meta = globalSearchGroupMeta[group.key] || { label: group.label || group.key, icon: '[?]' };
                      if (!group.items || group.items.length === 0) return null;
                      return (
                        <div key={group.key} className="border-b border-slate-100 last:border-b-0">
                          <div className="px-4 py-2 text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                            {meta.icon} {meta.label} ({group.count || group.items.length})
                          </div>
                          <div className="divide-y divide-slate-100">
                            {group.items.map((item) => {
                              if (group.key === 'po') {
                                const supplierLabel = item.supplier_name || item.supplier_code || '-';
                                return (
                                  <button
                                    key={`po-${item.po_number}`}
                                    type="button"
                                    onClick={() => handleGlobalSearchResultClick(group.key, item)}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <div className="font-semibold text-slate-900">{item.po_number}</div>
                                    <div className="text-xs text-slate-500">{supplierLabel} - {item.status || '-'} - {item.po_date || '-'}</div>
                                  </button>
                                );
                              }
                              if (group.key === 'vendors') {
                                return (
                                  <button
                                    key={`vendor-${item.id}`}
                                    type="button"
                                    onClick={() => handleGlobalSearchResultClick(group.key, item)}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <div className="font-semibold text-slate-900">{item.name || item.id}</div>
                                    <div className="text-xs text-slate-500">{item.id || '-'} - {item.type || 'Vendor'}</div>
                                  </button>
                                );
                              }
                              if (group.key === 'items') {
                                return (
                                  <button
                                    key={`item-${item.code}`}
                                    type="button"
                                    onClick={() => handleGlobalSearchResultClick(group.key, item)}
                                    className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    <div className="font-semibold text-slate-900">{item.code}</div>
                                    <div className="text-xs text-slate-500">{item.name || '-'} - {item.part_no || '-'}</div>
                                  </button>
                                );
                              }
                              return (
                                <button
                                  key={`schedule-${item.id}`}
                                  type="button"
                                  onClick={() => handleGlobalSearchResultClick(group.key, item)}
                                  className="w-full px-4 py-3 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  <div className="font-semibold text-slate-900">{item.po_number || '-'}</div>
                                  <div className="text-xs text-slate-500">{item.item || '-'} - {item.supplier_name || item.supplier || '-'} - {item.request_date || '-'}</div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {notificationsOpen && (
          <div className="fixed inset-0 z-[60] print:hidden">
            <div className="absolute inset-0 bg-slate-900/30" onClick={() => setNotificationsOpen(false)} />
            <div className="absolute right-0 top-0 h-full w-full max-w-sm bg-white shadow-2xl border-l border-slate-200">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <div className="text-sm font-semibold text-slate-900">Notifikasi</div>
                  <div className="text-xs text-slate-500">Update terbaru untuk operasional.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="border-b border-slate-100 px-5 py-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{notificationTotal} notifikasi tersimpan</span>
                    <button
                      type="button"
                      onClick={markAllNotificationsAsRead}
                      className="font-semibold text-indigo-600 hover:text-indigo-700 disabled:text-slate-400"
                      disabled={!notificationUnreadCount || notificationLoading}
                    >
                      Tandai semua dibaca
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={notificationModuleFilter}
                      onChange={(event) => setNotificationModuleFilter(event.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    >
                      {NOTIFICATION_MODULE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setNotificationModuleFilter('all')}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      disabled={notificationModuleFilter === 'all'}
                    >
                      Reset
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto h-[calc(100%-118px)]">
                {notificationLoading && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                    Memuat notifikasi...
                  </div>
                )}
                {notificationError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                    {notificationError}
                  </div>
                )}
                {!notificationLoading && !notificationError && notificationRecords.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs text-slate-500">
                    Tidak ada notifikasi baru.
                  </div>
                )}
                {unreadNotificationItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Belum dibaca</div>
                    {unreadNotificationItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">{item.module}</div>
                            <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              item.severity === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : item.severity === 'error'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                            }`}>
                              {item.severity}
                            </span>
                            <button
                              type="button"
                              onClick={() => markNotificationAsRead(item.id)}
                              className="rounded-md border border-amber-300 bg-white px-2 py-1 text-[10px] font-semibold text-amber-700 hover:bg-amber-100"
                            >
                              Dibaca
                            </button>
                          </div>
                        </div>
                        <div className="mt-1 text-xs text-slate-600">{item.detail}</div>
                        <div className="mt-2 text-[10px] text-slate-400">
                          {item.created_at ? new Date(item.created_at).toLocaleString('id-ID') : '-'}
                          {item.status ? ` • ${String(item.status).toUpperCase()}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {readNotificationItems.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Riwayat</div>
                    {readNotificationItems.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[10px] uppercase tracking-wide text-slate-400">{item.module}</div>
                            <div className="text-sm font-semibold text-slate-900">{item.title}</div>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            item.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-700'
                              : item.severity === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : item.severity === 'error'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}>
                            {String(item.status || item.severity || 'info').toUpperCase()}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
                        <div className="mt-2 text-[10px] text-slate-400">
                          {item.read_at ? `Dibaca: ${new Date(item.read_at).toLocaleString('id-ID')}` : ''}
                          {item.created_at ? ` • Dibuat: ${new Date(item.created_at).toLocaleString('id-ID')}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {toast.open && (
            <div className="fixed top-6 right-6 z-50 print:hidden">
              <div
                role={toast.onAction ? 'button' : undefined}
                tabIndex={toast.onAction ? 0 : undefined}
                onClick={toast.onAction ? () => {
                  toast.onAction();
                  setToast((prev) => ({ ...prev, open: false }));
                } : undefined}
                onKeyDown={toast.onAction ? (event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    toast.onAction();
                    setToast((prev) => ({ ...prev, open: false }));
                  }
                } : undefined}
                className={`rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 border ${
                  toast.tone === 'error'
                    ? 'bg-rose-50 border-rose-200 text-rose-700'
                    : toast.tone === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-white border-slate-200 text-slate-700'
                } ${toast.onAction ? 'cursor-pointer hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-200' : ''}`}
              >
                <div className="text-sm">{toast.message}</div>
                {toast.actionLabel && toast.onAction && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      toast.onAction();
                      setToast((prev) => ({ ...prev, open: false }));
                    }}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                  >
                    {toast.actionLabel}
                  </button>
                )}
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setToast((prev) => ({ ...prev, open: false }));
                  }}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )}

        {/* AI Chat Widget */}
        {canUseAI && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
          {isChatOpen && (
            <div className="bg-white rounded-xl shadow-2xl w-80 h-96 flex flex-col border border-gray-200 mb-2 overflow-hidden animate-fade-in-up">
              <div className="bg-indigo-600 p-3 flex justify-between items-center text-white">
                <div className="flex items-center gap-2"><Bot size={18} /><span className="font-bold text-sm">Asisten Logistik</span></div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-indigo-700 p-1 rounded"><Minimize2 size={16} /></button>
              </div>
              <div className="flex-1 p-3 overflow-y-auto bg-gray-50 space-y-3">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none shadow-sm'}`}>{msg.text}</div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
              <form onSubmit={handleChatSubmit} className="p-2 bg-white border-t flex gap-2">
                <input 
                  className="flex-1 border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tanya jadwal, status, dll..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={isChatLoading}
                />
                <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition">
                  {isChatLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                </button>
              </form>
            </div>
          )}
          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all hover:scale-110 flex items-center justify-center"
            title="Chat dengan AI"
          >
            {isChatOpen ? <X size={24} /> : <MessageCircle size={24} />}
          </button>
        </div>
        )}
        
        <div className="mt-4 text-xs text-gray-400 text-center print:mt-8"><span>*Laporan ini dicetak otomatis dari sistem monitoring.</span></div>
      </div>
    </div>
            {inboundPrintPortal}
          </>
          );
};

// --- KOMPONEN UTAMA (WRAPPER) ---
const MainApp = () => {
  const [auth, setAuth] = useState({ token: null, user: null, loading: true });
  const [authNotice, setAuthNotice] = useState('');
  const apiHealth = useApiHealth();
  const authBootstrappedRef = useRef(false);
  const idleLogoutTimerRef = useRef(null);
  const idleLogoutPendingRef = useRef(false);

  useEffect(() => {
    if (authBootstrappedRef.current) return;
    authBootstrappedRef.current = true;
    const token = localStorage.getItem('authToken');
    if (!token) {
      setAuth({ token: null, user: null, loading: false });
      return;
    }
    const verify = async () => {
      try {
        const data = await apiRequest('/api/auth/me', {}, token);
        setAuth({ token, user: data.user, loading: false });
      } catch (error) {
        localStorage.removeItem('authToken');
        setAuth({ token: null, user: null, loading: false });
      }
    };
    verify();
  }, []);


  const handleLogin = useCallback((token, user) => {
    setAuthNotice('');
    idleLogoutPendingRef.current = false;
    localStorage.setItem('authToken', token);
    setAuth({ token, user, loading: false });
  }, []);

  const handleLogout = useCallback(async (options = {}) => {
    const reasonMessage = String(options?.reasonMessage || '').trim();
    if (auth.token) {
      try {
        await apiRequest('/api/auth/logout', { method: 'POST' }, auth.token);
      } catch {
        // ignore logout errors; local session is cleared regardless
      }
    }
    if (idleLogoutTimerRef.current) {
      clearTimeout(idleLogoutTimerRef.current);
      idleLogoutTimerRef.current = null;
    }
    idleLogoutPendingRef.current = false;
    localStorage.removeItem('authToken');
    setAuthNotice(reasonMessage);
    setAuth({ token: null, user: null, loading: false });
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) {
      if (idleLogoutTimerRef.current) {
        clearTimeout(idleLogoutTimerRef.current);
        idleLogoutTimerRef.current = null;
      }
      idleLogoutPendingRef.current = false;
      return undefined;
    }

    const triggerIdleLogout = () => {
      if (idleLogoutPendingRef.current) return;
      idleLogoutPendingRef.current = true;
      handleLogout({ reasonMessage: 'Sesi berakhir otomatis setelah 15 menit tanpa aktivitas. Silakan login kembali.' });
    };

    const resetIdleTimer = () => {
      if (idleLogoutTimerRef.current) {
        clearTimeout(idleLogoutTimerRef.current);
      }
      idleLogoutPendingRef.current = false;
      idleLogoutTimerRef.current = setTimeout(triggerIdleLogout, AUTO_LOGOUT_IDLE_MS);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, resetIdleTimer, { passive: true });
    });
    resetIdleTimer();

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetIdleTimer);
      });
      if (idleLogoutTimerRef.current) {
        clearTimeout(idleLogoutTimerRef.current);
        idleLogoutTimerRef.current = null;
      }
    };
  }, [auth.token, handleLogout]);

  if (auth.loading) {
    return <div className="min-h-screen bg-slate-100 flex items-center justify-center text-slate-600">Loading...</div>;
  }

  return (
    <>
      <ApiStatusBanner
        online={apiHealth.online}
        checking={apiHealth.checking}
        lastCheckedAt={apiHealth.lastCheckedAt}
        lastError={apiHealth.lastError}
        lastLatencyMs={apiHealth.lastLatencyMs}
        onRetry={apiHealth.checkNow}
      />
      {auth.token
        ? <Dashboard onLogout={handleLogout} token={auth.token} user={auth.user} />
        : <LoginPage onLogin={handleLogin} notice={authNotice} />}
    </>
  );
};

export default MainApp;









