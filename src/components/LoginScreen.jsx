import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, AlertCircle, CalendarDays, Check, Eye, EyeOff, Layers3, Loader2, LockKeyhole, Pause, Play, Quote, RefreshCw, ShieldCheck, Sparkles, Truck, UserRound } from 'lucide-react';
import { createQuoteOrder, QUOTE_INTERVAL_MS, WORK_QUOTES } from '../data/workQuotes';
import './LoginScreen.css';

function initialQuoteState() {
  let previousId;
  try { previousId = sessionStorage.getItem('msks.lastWorkQuote'); } catch { /* Storage is optional. */ }
  return { order: createQuoteOrder(previousId), position: 0, revision: 0 };
}

function InspirationPanel() {
  const [selection, setSelection] = useState(initialQuoteState);
  const [paused, setPaused] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  const [visible, setVisible] = useState(() => !document.hidden);
  const quote = WORK_QUOTES[selection.order[selection.position]];
  const nextQuote = useCallback(() => {
    setSelection((current) => {
      const atEnd = current.position === current.order.length - 1;
      return {
        order: atEnd ? createQuoteOrder(WORK_QUOTES[current.order[current.position]].id) : current.order,
        position: atEnd ? 0 : current.position + 1,
        revision: current.revision + 1,
      };
    });
  }, []);

  useEffect(() => {
    const onVisibilityChange = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  useEffect(() => {
    try { sessionStorage.setItem('msks.lastWorkQuote', quote.id); } catch { /* Storage is optional. */ }
  }, [quote.id]);

  useEffect(() => {
    if (paused || !visible) return undefined;
    const timer = window.setTimeout(nextQuote, QUOTE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [nextQuote, paused, visible, selection.revision]);

  return (
    <aside className="login-inspiration" aria-label="Inspirasi untuk bekerja">
      <div className="login-hero-top"><span className="login-eyebrow"><span className="login-status-dot" /> SATU TIM. SATU TUJUAN.</span><Sparkles size={20} aria-hidden="true" /></div>
      <div className="login-inspiration-heading"><h2>Awali dengan semangat.<br /><span>Wujudkan lewat karya.</span></h2><p>Setiap langkah kecilmu membuat perbedaan.</p></div>
      <div className="login-quote-card">
        <div className="login-quote-topic"><Quote size={27} aria-hidden="true" /><span>{quote.topic}</span></div>
        <div className="login-quote-content" key={quote.id}>
          <blockquote>“{quote.text}”</blockquote>
          <div className="login-quote-author"><span className="login-author-line" /><div><strong>{quote.author}</strong><span>{quote.role}</span></div></div>
          <a className="login-quote-source" href={quote.url} target="_blank" rel="noopener noreferrer">{quote.source}<ArrowUpRight size={14} aria-hidden="true" /></a>
          <span className="login-translation">Terjemahan bahasa Indonesia</span>
        </div>
        <div className="login-quote-controls">
          <span>{paused ? 'Pergantian dijeda' : 'Inspirasi baru setiap 15 detik'}</span>
          <div><button type="button" onClick={() => setPaused((value) => !value)} aria-label={paused ? 'Lanjutkan pergantian kutipan' : 'Jeda pergantian kutipan'} title={paused ? 'Lanjutkan' : 'Jeda'}>{paused ? <Play size={16} /> : <Pause size={16} />}</button><button type="button" onClick={nextQuote} aria-label="Tampilkan kutipan berikutnya" title="Kutipan berikutnya"><RefreshCw size={16} /></button></div>
        </div>
        <div className="login-quote-progress" aria-hidden="true"><span key={`${selection.revision}-${paused}-${visible}`} className={!paused && visible ? 'is-running' : ''} /></div>
      </div>
      <div className="login-workflow" aria-label="Alur operasional"><span><CalendarDays size={17} />Rencanakan</span><i /><span><Layers3 size={17} />Koordinasikan</span><i /><span><Truck size={17} />Wujudkan</span></div>
      <div className="login-hero-footer"><span className="login-footer-rule" />Kerja terarah. Kolaborasi lebih mudah.</div>
    </aside>
  );
}

export default function LoginScreen({ onLogin, notice = '', request, adminWhatsappLink = '' }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const submitting = useRef(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setIsLoading(true);
    setError('');
    try {
      const data = await request('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ username, password }),
      });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message || 'Username atau password salah. Silakan coba kembali.');
    } finally {
      submitting.current = false;
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page">
      <header className="login-header"><a className="login-brand" href="/" aria-label="MSK-S halaman utama"><img src="/logo.png" alt="" width="46" height="46" /><div><strong>MSK-S<span>WORKSPACE</span></strong><p>Master Schedule &amp; Kanban System</p></div></a><span className="login-header-note"><span />Terhubung untuk hasil yang lebih baik</span></header>
      <div className="login-layout">
        <InspirationPanel />
        <section className="login-form-panel" aria-labelledby="login-title">
          <div className="login-form-content">
            <div className="login-welcome-icon"><Layers3 size={25} strokeWidth={1.6} aria-hidden="true" /><span><Check size={11} strokeWidth={3} /></span></div>
            <span className="login-form-eyebrow">RUANG KERJA ANDA</span>
            <h1 id="login-title">Selamat datang<span>kembali.</span></h1>
            <p className="login-intro">Siap untuk hari yang produktif? Masuk untuk<br className="login-desktop-break" /> melanjutkan aktivitas operasional Anda.</p>
            {notice && <div className="login-notice" role="status"><AlertCircle size={18} aria-hidden="true" /><span>{notice}</span></div>}
            <form onSubmit={handleSubmit} aria-busy={isLoading}>
              <label htmlFor="login-username">Username</label>
              <div className="login-input-wrap"><UserRound size={19} aria-hidden="true" /><input id="login-username" name="username" type="text" placeholder="Masukkan username Anda" autoComplete="username" autoCapitalize="none" spellCheck={false} value={username} onChange={(event) => setUsername(event.target.value)} required disabled={isLoading} /></div>
              <label htmlFor="login-password">Password</label>
              <div className="login-input-wrap"><LockKeyhole size={19} aria-hidden="true" /><input id="login-password" name="password" type={showPassword ? 'text' : 'password'} placeholder="Masukkan password Anda" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required disabled={isLoading} /><button className="login-password-toggle" type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
              <div className="login-password-help">{adminWhatsappLink ? <a href={adminWhatsappLink} target="_blank" rel="noopener noreferrer">Lupa password? <span>Hubungi Admin<ArrowUpRight size={13} /></span></a> : <span>Lupa password? Hubungi Admin/IT Anda.</span>}</div>
              {error && <div className="login-error" role="alert"><AlertCircle size={18} aria-hidden="true" /><span>{error}</span></div>}
              <button className="login-submit" type="submit" disabled={isLoading}>{isLoading ? <><Loader2 size={19} className="login-spinner" aria-hidden="true" />Sedang masuk...</> : <>Masuk ke workspace<ArrowRight size={19} aria-hidden="true" /></>}</button>
            </form>
            <div className="login-security"><ShieldCheck size={16} aria-hidden="true" /><span>Akses khusus pengguna terdaftar</span></div>
          </div>
          <p className="login-form-bottom">Rencana yang baik dimulai dari sini.</p>
        </section>
      </div>
      <footer className="login-page-footer"><span>© {new Date().getFullYear()} MSK-S. Master Schedule &amp; Kanban System.</span><span>Plan better.<span className="login-footer-dot">·</span>Work together.<span className="login-footer-dot">·</span>Grow stronger.</span></footer>
    </main>
  );
}
