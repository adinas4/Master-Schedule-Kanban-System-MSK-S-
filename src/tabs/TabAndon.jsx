import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Expand,
  Factory,
  Minimize2,
  PackageX,
  Pause,
  Play,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

const REFRESH_INTERVAL_MS = 60_000;
const SLIDE_INTERVAL_MS = 10_000;

const getRowsPerSlide = () => {
  if (typeof window === 'undefined') return 6;
  const height = window.innerHeight;
  const width = window.innerWidth;
  if (width < 768) return height >= 800 ? 4 : 3;
  if (height >= 1000) return 7;
  if (height >= 850) return 6;
  if (height >= 700) return 5;
  return 4;
};

const formatQty = (value) => new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 2,
}).format(Number(value || 0));

const formatTime = (date) => new Intl.DateTimeFormat('id-ID', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
}).format(date);

const severityFor = (row) => {
  const coverage = Number(row.coverage || 0);
  if (Number(row.stock || 0) <= 0 || coverage <= 25) {
    return { label: 'KRITIS', className: 'andon-severity-danger' };
  }
  if (coverage <= 60) {
    return { label: 'SANGAT RENDAH', className: 'andon-severity-high' };
  }
  return { label: 'DI BAWAH MINIMUM', className: 'andon-severity-warning' };
};

export default function TabAndon({
  criticalStockRows = [],
  fetchReceiveNotes,
  fetchMasterReferences,
  masterLoading = false,
  receiveNotesLoading = false,
  setMainTab,
  setKanbanView,
  setKanbanSubTab,
}) {
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [activeSlide, setActiveSlide] = useState(0);
  const [slidesPaused, setSlidesPaused] = useState(false);
  const [rowsPerSlide, setRowsPerSlide] = useState(getRowsPerSlide);

  const rows = useMemo(() => [...criticalStockRows].sort((a, b) => {
    if (Number(a.stock || 0) <= 0 && Number(b.stock || 0) > 0) return -1;
    if (Number(b.stock || 0) <= 0 && Number(a.stock || 0) > 0) return 1;
    return Number(a.coverage || 0) - Number(b.coverage || 0);
  }), [criticalStockRows]);

  const lineGroups = useMemo(() => {
    const grouped = new Map();
    rows.forEach((row) => {
      const lineName = String(row.line || '').trim();
      const key = lineName && lineName !== '-' ? lineName : 'BELUM DIPETAKAN';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(row);
    });
    return Array.from(grouped.entries())
      .map(([line, lineRows]) => ({
        line,
        rows: lineRows,
        zeroStockCount: lineRows.filter((row) => Number(row.stock || 0) <= 0).length,
        totalShortage: lineRows.reduce((total, row) => total + Number(row.shortage || 0), 0),
        lowestCoverage: Math.min(...lineRows.map((row) => Number(row.coverage || 0))),
      }))
      .sort((a, b) => {
        if (b.zeroStockCount !== a.zeroStockCount) return b.zeroStockCount - a.zeroStockCount;
        if (a.lowestCoverage !== b.lowestCoverage) return a.lowestCoverage - b.lowestCoverage;
        return a.line.localeCompare(b.line, 'id');
      });
  }, [rows]);

  const lineSlides = useMemo(() => lineGroups.flatMap((group) => {
    const pageCount = Math.max(1, Math.ceil(group.rows.length / rowsPerSlide));
    return Array.from({ length: pageCount }, (_, pageIndex) => ({
      ...group,
      rows: group.rows.slice(pageIndex * rowsPerSlide, (pageIndex + 1) * rowsPerSlide),
      totalLineRows: group.rows.length,
      pageIndex,
      pageCount,
      slideKey: `${group.line}-${pageIndex}`,
    }));
  }), [lineGroups, rowsPerSlide]);

  const currentSlide = lineSlides[activeSlide] || null;
  const currentRows = currentSlide?.rows || [];
  const visibleSlideIndexes = useMemo(() => {
    const visibleCount = Math.min(9, lineSlides.length);
    const start = Math.max(0, Math.min(activeSlide - Math.floor(visibleCount / 2), lineSlides.length - visibleCount));
    return Array.from({ length: visibleCount }, (_, index) => start + index);
  }, [activeSlide, lineSlides.length]);

  useEffect(() => {
    if (activeSlide >= lineSlides.length) setActiveSlide(0);
  }, [activeSlide, lineSlides.length]);

  useEffect(() => {
    if (slidesPaused || lineSlides.length <= 1) return undefined;
    const timer = window.setTimeout(() => {
      setActiveSlide((activeSlide + 1) % lineSlides.length);
    }, SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [activeSlide, lineSlides.length, slidesPaused]);

  const changeSlide = (direction) => {
    if (lineSlides.length <= 1) return;
    setActiveSlide((current) => (current + direction + lineSlides.length) % lineSlides.length);
  };

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        typeof fetchMasterReferences === 'function' ? fetchMasterReferences() : Promise.resolve(),
        typeof fetchReceiveNotes === 'function' ? fetchReceiveNotes({ silent: true }) : Promise.resolve(),
      ]);
      setLastUpdated(new Date());
    } finally {
      setRefreshing(false);
    }
  }, [fetchMasterReferences, fetchReceiveNotes]);

  useEffect(() => {
    const timer = window.setInterval(refresh, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const handleFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    const handleResize = () => setRowsPerSlide(getRowsPerSlide());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else {
      await document.documentElement.requestFullscreen();
    }
  };

  const goBackToProduction = () => {
    setMainTab('kanban');
    setKanbanView('board');
    setKanbanSubTab('production');
  };

  return (
    <section className="andon-screen" aria-label="Andon TV stok kritis">
      <header className="andon-header">
        <div className="andon-title-wrap">
          <button type="button" className="andon-icon-button" onClick={goBackToProduction} title="Kembali ke Produksi">
            <ArrowLeft size={24} />
          </button>
          <div>
            <div className="andon-eyebrow">PRODUCTION MATERIAL CONTROL</div>
            <h1>ANDON TV — STOK KRITIS</h1>
          </div>
        </div>
        <div className="andon-actions">
          <div className="andon-updated"><Clock3 size={17} /> Diperbarui {formatTime(lastUpdated)}</div>
          <button type="button" className="andon-icon-button" onClick={refresh} disabled={refreshing} title="Perbarui data">
            <RefreshCw size={22} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button type="button" className="andon-icon-button" onClick={toggleFullscreen} title={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}>
            {isFullscreen ? <Minimize2 size={22} /> : <Expand size={22} />}
          </button>
        </div>
      </header>

      {currentSlide && (
        <div className="andon-slide-heading">
          <div className="andon-line-title">
            <Factory size={30} />
            <div>
              <span>LINE PRODUKSI</span>
              <strong>{currentSlide.line}</strong>
              {currentSlide.pageCount > 1 && (
                <em>Halaman {currentSlide.pageIndex + 1} dari {currentSlide.pageCount}</em>
              )}
            </div>
          </div>
          <div className="andon-slide-controls">
            <span>
              Slide {activeSlide + 1}/{lineSlides.length}
              {currentSlide.pageCount > 1 ? ` - halaman ${currentSlide.pageIndex + 1}/${currentSlide.pageCount}` : ''}
            </span>
            <button type="button" className="andon-icon-button" onClick={() => changeSlide(-1)} disabled={lineSlides.length <= 1} title="Line sebelumnya">
              <ChevronLeft size={22} />
            </button>
            <button type="button" className="andon-icon-button" onClick={() => setSlidesPaused((value) => !value)} disabled={lineSlides.length <= 1} title={slidesPaused ? 'Lanjutkan slide' : 'Jeda slide'}>
              {slidesPaused ? <Play size={21} /> : <Pause size={21} />}
            </button>
            <button type="button" className="andon-icon-button" onClick={() => changeSlide(1)} disabled={lineSlides.length <= 1} title="Line berikutnya">
              <ChevronRight size={22} />
            </button>
          </div>
        </div>
      )}

      <div className="andon-summary-grid" key={`summary-${currentSlide?.slideKey || 'all'}`}>
        <article className="andon-summary-card andon-summary-critical">
          <AlertTriangle size={32} />
          <div><strong>{currentSlide?.totalLineRows || 0}</strong><span>Item kritis di line ini</span></div>
        </article>
        <article className="andon-summary-card andon-summary-zero">
          <PackageX size={32} />
          <div><strong>{currentSlide?.zeroStockCount || 0}</strong><span>Item stok kosong</span></div>
        </article>
        <article className="andon-summary-card andon-summary-shortage">
          <RefreshCw size={32} />
          <div><strong>{formatQty(currentSlide?.totalShortage || 0)}</strong><span>Kekurangan line ini</span></div>
        </article>
      </div>

      {(masterLoading || receiveNotesLoading) && rows.length === 0 ? (
        <div className="andon-all-safe andon-loading-state">
          <RefreshCw size={64} className="animate-spin" />
          <h2>MEMUAT DATA STOK</h2>
          <p>Sinkronisasi stok material sedang berlangsung.</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="andon-all-safe">
          <ShieldCheck size={80} />
          <h2>STOK MATERIAL AMAN</h2>
          <p>Tidak ada item yang berada di bawah safety stock.</p>
        </div>
      ) : (
        <div className="andon-slide" key={currentSlide.slideKey}>
        <div className="andon-table-wrap">
          <table className="andon-table">
            <thead>
              <tr>
                <th>Prioritas</th>
                <th>Material</th>
                <th className="andon-number">Stok</th>
                <th className="andon-number">Minimum</th>
                <th className="andon-number">Kurang</th>
                <th>Ketersediaan</th>
              </tr>
            </thead>
            <tbody>
              {currentRows.map((row) => {
                const severity = severityFor(row);
                const coverage = Math.min(100, Math.max(0, Number(row.coverage || 0)));
                return (
                  <tr key={row.code}>
                    <td><span className={`andon-severity ${severity.className}`}>{severity.label}</span></td>
                    <td>
                      <strong className="andon-item-code">{row.code}</strong>
                      <span className="andon-item-name">{row.name || '-'}</span>
                    </td>
                    <td className="andon-number andon-stock-value">{formatQty(row.stock)} <small>{row.unit}</small></td>
                    <td className="andon-number">{formatQty(row.min)} <small>{row.unit}</small></td>
                    <td className="andon-number andon-shortage-value">-{formatQty(row.shortage)} <small>{row.unit}</small></td>
                    <td>
                      <div className="andon-progress-label"><span>{Math.round(coverage)}%</span><span>dari minimum</span></div>
                      <div className="andon-progress"><span style={{ width: `${coverage}%` }} /></div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </div>
      )}

      {lineSlides.length > 1 && (
        <div className="andon-slide-status" aria-label="Navigasi line produksi">
          <div className="andon-slide-dots">
            {visibleSlideIndexes.map((index) => {
              const slide = lineSlides[index];
              return (
              <button
                type="button"
                key={slide.slideKey}
                className={`${index === activeSlide ? 'is-active' : ''}${slide.pageIndex === 0 ? ' is-line-start' : ''}`}
                onClick={() => setActiveSlide(index)}
                aria-label={`Tampilkan ${slide.line}, halaman ${slide.pageIndex + 1}`}
                title={`${slide.line} - halaman ${slide.pageIndex + 1}/${slide.pageCount}`}
              />
              );
            })}
          </div>
          {!slidesPaused && <div className="andon-slide-timer" key={`timer-${activeSlide}`}><span /></div>}
        </div>
      )}

      <footer className="andon-footer">
        <span>Maks. {rowsPerSlide} item per slide - bergeser setiap 10 detik - refresh data setiap 60 detik</span>
        <span>Segera tindak lanjuti item berstatus KRITIS</span>
      </footer>
    </section>
  );
}
