import React, { useLayoutEffect, useRef, useState } from 'react';
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Radar,
  RadarChart,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import ChartBox from '../components/ChartBox';

const SafeResponsiveContainer = ({ children }) => {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const node = containerRef.current;
    if (!node) return undefined;
    let raf;
    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const nextWidth = Math.max(0, Math.floor(rect.width));
      const nextHeight = Math.max(0, Math.floor(rect.height));
      setSize((prev) => {
        if (prev.width === nextWidth && prev.height === nextHeight) return prev;
        return { width: nextWidth, height: nextHeight };
      });
    };
    const scheduleUpdate = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(updateSize);
    };
    scheduleUpdate();
    window.addEventListener('resize', scheduleUpdate);
    let observer;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(scheduleUpdate);
      observer.observe(node);
    }
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener('resize', scheduleUpdate);
      if (observer) observer.disconnect();
    };
  }, []);

  const content = size.width > 0 && size.height > 0 && React.isValidElement(children)
    ? React.cloneElement(children, { width: size.width, height: size.height })
    : null;

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', minWidth: 1, minHeight: 1 }}>
      {content}
    </div>
  );
};

const formatNumberFallback = (value) => Number(value || 0).toLocaleString('id-ID');

const applyMonitoringDateFilter = (dateKey, handlers = {}) => {
  if (!dateKey) return;
  const { setFilterStart, setFilterEnd, setMainTab } = handlers;
  if (typeof setFilterStart === 'function') setFilterStart(dateKey);
  if (typeof setFilterEnd === 'function') setFilterEnd(dateKey);
  if (typeof setMainTab === 'function') setMainTab('monitoring');
};

const TabDashboard = (props) => {
  const {
    mainTab,
    setMainTab,
    setKanbanView,
    setKanbanSubTab,
    setFilterStart,
    setFilterEnd,
    setPrlFilters,
    canEditSchedules,
    canViewMaster,
    canManageMaster,
    canManageVendors,
    canManageItems,
    canViewPrl,
    canPrlProcess,
    canPrlImport,
    canViewReport,
    prlFilters,
    prlShortageSummary = {},
    currentYear,
    kanbanPipelineSummary = {},
    inventoryHealthSummary = {},
    productionTodaySummary = {},
    kpiSummary = {},
    kpiLoading,
    formatRupiah,
    formatNumber0,
    prlCoverageData = [],
    prlScatterData = [],
    prlParetoData = [],
    prlClusteredData = [],
    kanbanStatusData = [],
    inventoryAgingData = [],
    inventoryCategoryAgingData = [],
    inventoryHeatmapData = [],
    masterDataHealth,
    scheduleReadinessData = [],
    supplierPerformanceData = [],
    dashboardSchedules = [],
    dashboardStats,
    dashboardSchedulesLoading,
    dashboardStatsLoading,
    scheduleReadinessLoading,
    schedules = [],
    stats = {},
    user,
    resolveSupplierLabel: resolveSupplierLabelProp,
  } = props;

  const resolveSupplierLabel = (row) => {
    if (typeof resolveSupplierLabelProp === 'function') return resolveSupplierLabelProp(row);
    return row?.supplierName || row?.supplier_name || row?.supplier || '-';
  };

  const formatMoney = typeof formatRupiah === 'function' ? formatRupiah : formatNumberFallback;
  const formatNum = typeof formatNumber0 === 'function' ? formatNumber0 : formatNumberFallback;
  const isProductionUser = String(user?.role || '').trim().toLowerCase() === 'production';
  const canOpenDashboardTarget = (target) => {
    const normalized = String(target || '').trim();
    if (!normalized) return false;
    if (['dash-kanban', 'kanban'].includes(normalized)) return true;
    if (['dash-prl', 'prl'].includes(normalized)) return Boolean(canViewPrl || canPrlProcess || canPrlImport);
    if (['dash-inventory', 'inventory'].includes(normalized)) return Boolean(canViewReport);
    if (['dash-masterref', 'masterref'].includes(normalized)) return Boolean(canViewMaster || canManageMaster || canManageVendors || canManageItems);
    if (['dash-schedule', 'monitoring'].includes(normalized)) return Boolean(canEditSchedules || canViewReport);
    if (normalized === 'dashboard') return true;
    return true;
  };
  const getDashboardTargetAccessMessage = (target) => {
    const normalized = String(target || '').trim();
    if (['dash-prl', 'prl'].includes(normalized)) return 'Anda tidak memiliki akses PRL.';
    if (['dash-inventory', 'inventory'].includes(normalized)) return 'Anda tidak memiliki akses inventory / report.';
    if (['dash-masterref', 'masterref'].includes(normalized)) return 'Anda tidak memiliki akses master data.';
    if (['dash-schedule', 'monitoring'].includes(normalized)) return 'Anda tidak memiliki akses schedule / monitoring.';
    return 'Anda tidak memiliki akses ke menu ini.';
  };
  const getDashboardCardClassName = (target, baseClassName) => {
    return `${baseClassName} disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none`;
  };
  const getDashboardCardTitle = (target, label) => {
    if (canOpenDashboardTarget(target)) return undefined;
    return getDashboardTargetAccessMessage(target);
  };
  const openDashboardTarget = (target) => {
    const normalized = String(target || '').trim();
    if (!canOpenDashboardTarget(normalized)) return;
    if (normalized === 'kanban') {
      if (typeof setMainTab === 'function') setMainTab('kanban');
      if (typeof setKanbanView === 'function') setKanbanView('board');
      if (typeof setKanbanSubTab === 'function') setKanbanSubTab('scan');
      return;
    }
    if (normalized === 'dashboard') {
      if (typeof setMainTab === 'function') setMainTab('dashboard');
      return;
    }
    if (typeof setMainTab === 'function') setMainTab(normalized);
  };
  const openKanbanTarget = () => {
    if (isProductionUser) {
      if (typeof setMainTab === 'function') setMainTab('kanban');
      if (typeof setKanbanView === 'function') setKanbanView('board');
      if (typeof setKanbanSubTab === 'function') setKanbanSubTab('scan');
      return;
    }
    if (typeof setMainTab === 'function') setMainTab('dash-kanban');
  };

  const pad = (value) => String(value).padStart(2, '0');
  const toDateKey = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const formatDateLabel = (dateKey) => {
    if (!dateKey) return '-';
    const date = new Date(dateKey);
    if (Number.isNaN(date.getTime())) return dateKey;
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
  };
  const extractTimeValue = (value) => {
    const match = String(value || '').match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
    return hours * 60 + minutes;
  };
  const extractRitLabel = (row) => {
    if (row?.rit) return `Rit ${row.rit}`;
    const raw = String(row?.deliveryTime || '');
    const ritMatch = raw.match(/rit\s*(\d+)/i);
    if (ritMatch) return `Rit ${ritMatch[1]}`;
    const cycleMatch = raw.match(/cycle\s*(\d+)/i);
    if (cycleMatch) return `Rit ${cycleMatch[1]}`;
    return '';
  };
  const resolveStatusLabel = (row) => {
    const statusValue = String(row?.status || '').toLowerCase();
    if (row?.arrivalDate || Number(row?.receivedQty || 0) > 0) return 'Received';
    if (['completed', 'partial', 'on time', 'late', 'too early'].includes(statusValue)) return 'Received';
    if (statusValue.includes('transit')) return 'Sent';
    return 'Open';
  };
  const resolveStatusBadge = (label) => {
    if (label === 'Received') return 'bg-emerald-100 text-emerald-700';
    if (label === 'Sent') return 'bg-blue-100 text-blue-700';
    return 'bg-amber-100 text-amber-700';
  };
  const resolveItemLabel = (row) => {
    const name = row?.itemName || row?.item_name;
    if (name) return name;
    return row?.item || '-';
  };
  const sortByTime = (rows) => [...rows].sort((a, b) => {
    const timeA = extractTimeValue(a.deliveryTime) ?? 9999;
    const timeB = extractTimeValue(b.deliveryTime) ?? 9999;
    if (timeA !== timeB) return timeA - timeB;
    const ritA = Number(String(a.rit || '').replace(/\D/g, '')) || 0;
    const ritB = Number(String(b.rit || '').replace(/\D/g, '')) || 0;
    return ritA - ritB;
  });

  const todayDate = new Date();
  const todayKey = toDateKey(todayDate);
  const yesterdayKey = toDateKey(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() - 1));
  const tomorrowKey = toDateKey(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 1));
  const dayTwoKey = toDateKey(new Date(todayDate.getFullYear(), todayDate.getMonth(), todayDate.getDate() + 2));

  const scheduleRows = dashboardSchedules.length ? dashboardSchedules : schedules;
  const scheduleStats = dashboardStats || stats;
  const rowsWithDates = scheduleRows.filter((row) => row?.requestDate);
  const yesterdayRows = sortByTime(
    rowsWithDates.filter((row) => row.requestDate < todayKey && resolveStatusLabel(row) !== 'Received'),
  );
  const todayRows = sortByTime(rowsWithDates.filter((row) => row.requestDate === todayKey));
  const tomorrowRows = sortByTime(rowsWithDates.filter((row) => row.requestDate === tomorrowKey));
  const dayTwoRows = sortByTime(rowsWithDates.filter((row) => row.requestDate === dayTwoKey));

  const boardColumns = [
    { key: 'yesterday', title: 'KEMARIN', dateKey: yesterdayKey, dateLabel: formatDateLabel(yesterdayKey), tone: 'border-slate-200', rows: yesterdayRows },
    { key: 'today', title: 'HARI INI', dateKey: todayKey, dateLabel: formatDateLabel(todayKey), tone: 'border-amber-200 bg-amber-50/40', rows: todayRows, highlight: true },
    { key: 'tomorrow', title: 'BESOK', dateKey: tomorrowKey, dateLabel: formatDateLabel(tomorrowKey), tone: 'border-slate-200', rows: tomorrowRows },
    { key: 'day2', title: 'LUSA', dateKey: dayTwoKey, dateLabel: formatDateLabel(dayTwoKey), tone: 'border-slate-200', rows: dayTwoRows },
  ];

  const SkeletonBlock = ({ className }) => (
    <div className={`animate-pulse rounded bg-slate-200/70 ${className}`} />
  );
  const SkeletonCard = ({ lines = 3 }) => (
    <div className="w-full bg-white rounded-2xl border border-slate-100/80 p-3 shadow-sm">
      <SkeletonBlock className="h-3 w-16 mb-2" />
      <SkeletonBlock className="h-3 w-32 mb-2" />
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonBlock key={idx} className="h-2 w-full mb-1" />
      ))}
    </div>
  );
  const SkeletonStatValue = () => <SkeletonBlock className="h-7 w-16" />;
  const dashboardTabs = ['dashboard', 'dash-prl', 'dash-kanban', 'dash-inventory', 'dash-masterref', 'dash-schedule'];
  if (!dashboardTabs.includes(mainTab)) return null;

  if (mainTab === 'dash-prl') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-emerald-100">PRL Coverage</div>
              <div className="text-2xl font-bold">Planning Coverage & Shortage</div>
            </div>
            <button onClick={() => openDashboardTarget('dashboard')} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs">Kembali</button>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Coverage vs Shortage (Q1)</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={prlCoverageData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="covered" stackId="a" fill="#22c55e" />
                  <Bar dataKey="shortage" stackId="a" fill="#ef4444" />
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Scatter: Total Need vs Stock</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="need" name="Need" />
                  <YAxis dataKey="stock" name="Stock" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={prlScatterData} fill="#0ea5e9" />
                </ScatterChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Pareto Shortage (Top 8)</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <ComposedChart data={prlParetoData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="shortage" fill="#f97316" />
                  <Line type="monotone" dataKey="cumulative" stroke="#6366f1" />
                </ComposedChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Clustered: Category Coverage</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={prlClusteredData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="covered" fill="#10b981" />
                  <Bar dataKey="shortage" fill="#ef4444" />
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
        </div>
      </div>
    );
  }

  if (mainTab === 'dash-kanban') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-indigo-600 via-indigo-500 to-blue-500 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-indigo-100">Kanban Flow</div>
              <div className="text-2xl font-bold">Request Status Breakdown</div>
            </div>
            <button onClick={() => openDashboardTarget('dashboard')} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs">Kembali</button>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Donut Status</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <PieChart>
                  <Pie data={kanbanStatusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                    {kanbanStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Status Count</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={kanbanStatusData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value">
                    {kanbanStatusData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
        </div>
      </div>
    );
  }

  if (mainTab === 'dash-inventory') {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-amber-100">Inventory</div>
              <div className="text-2xl font-bold">Aging Overview</div>
            </div>
            <button onClick={() => openDashboardTarget('dashboard')} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs">Kembali</button>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Inventory Aging (Lots)</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={inventoryAgingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#f97316">
                    {inventoryAgingData.map((entry) => (
                      <Cell key={entry.label} fill={entry.color || '#f97316'} />
                    ))}
                  </Bar>
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Category Aging (Qty)</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={inventoryCategoryAgingData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="fresh" stackId="a" fill="#22c55e" />
                  <Bar dataKey="slow" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="dead" stackId="a" fill="#ef4444" />
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4 xl:col-span-2">
            <div className="text-sm font-semibold mb-2">Heatmap: Stock vs Usage</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stock" name="Stock" />
                  <YAxis dataKey="usage" name="Usage" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={inventoryHeatmapData} fill="#38bdf8" />
                </ScatterChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
        </div>
      </div>
    );
  }

  if (mainTab === 'dash-masterref') {
    const axes = masterDataHealth?.axes || [];
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-500 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-200">Master Data</div>
              <div className="text-2xl font-bold">Data Quality Health</div>
            </div>
            <button onClick={() => openDashboardTarget('dashboard')} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs">Kembali</button>
          </div>
        </div>
        <div className="bg-white rounded-2xl border p-4">
          <div className="text-sm font-semibold mb-2">Completeness Radar</div>
          <ChartBox height={320}>
            <SafeResponsiveContainer>
              <RadarChart data={axes}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                <Tooltip />
              </RadarChart>
            </SafeResponsiveContainer>
          </ChartBox>
          <div className="mt-3 text-xs text-slate-500">
            Overall Health: <span className="font-semibold text-slate-900">{masterDataHealth?.overall || 0}%</span> •
            Incomplete: <span className="font-semibold text-rose-600">{masterDataHealth?.incompleteCount || 0}</span> /
            {masterDataHealth?.total || 0} item
          </div>
        </div>
      </div>
    );
  }

  if (mainTab === 'dash-schedule') {
    const inboundStatusData = [
      { name: 'On Time', value: scheduleStats.onTime || 0, color: '#22c55e' },
      { name: 'Late', value: scheduleStats.late || 0, color: '#ef4444' },
      { name: 'Pending', value: scheduleStats.pending || 0, color: '#f59e0b' },
    ];
    return (
      <div className="space-y-4">
        <div className="rounded-3xl p-6 bg-gradient-to-br from-sky-600 via-sky-500 to-cyan-500 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wide text-sky-100">Schedule</div>
              <div className="text-2xl font-bold">Readiness & Supplier Lead Time</div>
            </div>
            <button onClick={() => openDashboardTarget('dashboard')} className="px-3 py-1.5 rounded-full bg-white/15 text-white text-xs">Kembali</button>
          </div>
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Schedule Readiness (Daily)</div>
            <ChartBox height={288}>
              {scheduleReadinessLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <SkeletonBlock className="h-40 w-56" />
                </div>
              ) : (
                <SafeResponsiveContainer>
                  <LineChart data={scheduleReadinessData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="target" stroke="#6366f1" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="ready" stroke="#10b981" strokeWidth={2} dot={false} />
                  </LineChart>
                </SafeResponsiveContainer>
              )}
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Inbound Status Breakdown</div>
            <ChartBox height={288}>
              {dashboardStatsLoading ? (
                <div className="h-full w-full flex items-center justify-center">
                  <SkeletonBlock className="h-36 w-36 rounded-full" />
                </div>
              ) : (
                <SafeResponsiveContainer>
                  <PieChart>
                    <Pie data={inboundStatusData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={3}>
                      {inboundStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </SafeResponsiveContainer>
              )}
            </ChartBox>
          </div>
          <div className="bg-white rounded-2xl border p-4">
            <div className="text-sm font-semibold mb-2">Supplier Lead Time (Top 10)</div>
            <ChartBox height={288}>
              <SafeResponsiveContainer>
                <BarChart data={supplierPerformanceData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={140} />
                  <Tooltip />
                  <Bar dataKey="leadTime" fill="#0ea5e9" />
                </BarChart>
              </SafeResponsiveContainer>
            </ChartBox>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'bg-white rounded-2xl border p-4 text-left hover:shadow-sm transition')}
        >
          <div className="text-[10px] uppercase tracking-wide text-slate-400 font-semibold">Total PO</div>
          <div className="text-2xl font-bold text-slate-900">
            {dashboardStatsLoading ? <SkeletonStatValue /> : (scheduleStats.totalPO || 0)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Total Jadwal {dashboardStatsLoading ? '...' : (scheduleStats.totalScheduleDates || 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'bg-emerald-50/60 rounded-2xl border border-emerald-100 p-4 text-left hover:shadow-sm transition')}
        >
          <div className="text-[10px] uppercase tracking-wide text-emerald-600 font-semibold">On Time</div>
          <div className="text-2xl font-bold text-emerald-700">
            {dashboardStatsLoading ? <SkeletonStatValue /> : (scheduleStats.onTime || 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'bg-rose-50/60 rounded-2xl border border-rose-100 p-4 text-left hover:shadow-sm transition')}
        >
          <div className="text-[10px] uppercase tracking-wide text-rose-600 font-semibold">Late</div>
          <div className="text-2xl font-bold text-rose-700">
            {dashboardStatsLoading ? <SkeletonStatValue /> : (scheduleStats.late || 0)}
          </div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'bg-amber-50/60 rounded-2xl border border-amber-100 p-4 text-left hover:shadow-sm transition')}
        >
          <div className="text-[10px] uppercase tracking-wide text-amber-600 font-semibold">Pending</div>
          <div className="text-2xl font-bold text-amber-700">
            {dashboardStatsLoading ? <SkeletonStatValue /> : (scheduleStats.pending || 0)}
          </div>
        </button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        <button
          type="button"
          onClick={() => openDashboardTarget('inventory')}
          disabled={!canOpenDashboardTarget('inventory')}
          title={getDashboardCardTitle('inventory', 'Buka dashboard inventory')}
          className={getDashboardCardClassName('inventory', 'text-left w-full bg-white p-4 rounded-xl shadow-sm border border-emerald-200 hover:shadow-md transition')}
        >
          <div className="text-gray-500 text-xs uppercase font-bold tracking-wide">Inventory Value</div>
          <div className="text-xl font-bold text-emerald-600">{kpiLoading ? '...' : formatMoney(kpiSummary.inventoryValue || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Total nilai stok</div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('inventory')}
          disabled={!canOpenDashboardTarget('inventory')}
          title={getDashboardCardTitle('inventory', 'Buka dashboard inventory')}
          className={getDashboardCardClassName('inventory', 'text-left w-full bg-white p-4 rounded-xl shadow-sm border border-rose-200 hover:shadow-md transition')}
        >
          <div className="text-gray-500 text-xs uppercase font-bold tracking-wide">Stock Alert</div>
          <div className="text-xl font-bold text-rose-600">{kpiLoading ? '...' : formatNum(kpiSummary.stockAlert || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Item di bawah safety</div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'text-left w-full bg-white p-4 rounded-xl shadow-sm border border-amber-200 hover:shadow-md transition')}
        >
          <div className="text-gray-500 text-xs uppercase font-bold tracking-wide">Pending Inbound</div>
          <div className="text-xl font-bold text-amber-600">{kpiLoading ? '...' : formatNum(kpiSummary.pendingInbound || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-1">Plan/partial hari ini</div>
        </button>
        <button
          type="button"
          onClick={() => openDashboardTarget('prl')}
          disabled={!canOpenDashboardTarget('prl')}
          title={getDashboardCardTitle('prl', 'Buka dashboard PRL')}
          className={getDashboardCardClassName('prl', 'text-left w-full bg-white p-4 rounded-xl shadow-sm border border-indigo-200 hover:shadow-md transition')}
        >
          <div className="text-gray-500 text-xs uppercase font-bold tracking-wide">Outstanding PR</div>
          <div className="text-xl font-bold text-indigo-600">{kpiLoading ? '...' : formatNum(kpiSummary.outstandingPr || 0)}</div>
          <div className="text-[10px] text-slate-400 mt-1">PRL belum diproses PO</div>
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        {boardColumns.map((column) => {
          const displayRows = column.rows.slice(0, 5);
          const hasMore = column.rows.length > 5;
          const wrapperTone = column.highlight
            ? 'border-amber-200 bg-amber-50/50 shadow-[0_8px_24px_rgba(245,158,11,0.08)]'
            : 'border-slate-200 bg-white';
          return (
            <div
              key={column.key}
              className={`rounded-3xl border px-3 py-4 flex flex-col items-stretch ${wrapperTone}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="space-y-1">
                  <div className="text-xs font-semibold tracking-wide text-slate-700">{column.title}</div>
                  <div className="text-[10px] text-slate-400">{column.dateLabel}</div>
                </div>
                <div className="text-[10px] text-slate-400">{column.rows.length} DN</div>
              </div>
              <div className="space-y-2 flex-1">
                {dashboardSchedulesLoading ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : (
                  <>
                    {displayRows.length === 0 && (
                      <div className="text-[11px] text-slate-400 py-6 text-center">Tidak ada jadwal.</div>
                    )}
                    {displayRows.map((row, idx) => {
                      const timeText = (String(row.deliveryTime || '').match(/\d{1,2}:\d{2}/) || [])[0] || '--:--';
                      const ritText = extractRitLabel(row);
                      const statusLabel = resolveStatusLabel(row);
                      const badgeClass = resolveStatusBadge(statusLabel);
                      return (
                        <button
                          type="button"
                          key={`${row.id || row.poNumber}-${idx}`}
                          onClick={() => applyMonitoringDateFilter(row.requestDate, { setFilterStart, setFilterEnd, setMainTab })}
                          className="w-full bg-white rounded-2xl border border-slate-100/80 p-3 text-left shadow-sm hover:shadow-md transition"
                        >
                          <div className="text-[11px] font-semibold text-slate-700">
                            {timeText}{ritText ? ` - ${ritText}` : ''}
                          </div>
                          <div className="text-xs text-slate-900 font-semibold uppercase">{resolveSupplierLabel(row)}</div>
                          <div className="text-[11px] text-slate-500 truncate">{resolveItemLabel(row)}</div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="text-[10px] text-slate-400">Qty {formatNum(row.requestQty || 0)}</div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${badgeClass}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </>
                )}
              </div>
                {hasMore && (
                  <button
                    type="button"
                    className="mt-3 text-[11px] text-indigo-600 hover:text-indigo-800 text-left"
                    onClick={() => applyMonitoringDateFilter(column.dateKey, { setFilterStart, setFilterEnd, setMainTab })}
                  >
                    Lihat Detail ({column.rows.length - 5} lagi)
                  </button>
                )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          onClick={() => {
            if (setPrlFilters) {
              setPrlFilters({
                ...prlFilters,
                month: prlShortageSummary.monthKey,
                year: String(currentYear),
                shortage: true,
              });
            }
            openDashboardTarget('prl');
          }}
          disabled={!canOpenDashboardTarget('prl')}
          title={getDashboardCardTitle('prl', 'Buka dashboard PRL')}
          className={getDashboardCardClassName('prl', 'text-left bg-white border border-rose-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-rose-600 font-semibold mb-2">PRL Alert</div>
          <div className="text-lg font-semibold text-slate-900">
            {prlShortageSummary.shortageCount || 0} Item Shortage ({prlShortageSummary.monthLabel || '-'} {currentYear || ''})
          </div>
          <ChartBox height={40} className="mt-3">
            <SafeResponsiveContainer>
              <LineChart data={prlShortageSummary.spark || []}>
                <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} dot={false} />
              </LineChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>

        <button
          onClick={openKanbanTarget}
          title="Buka dashboard Kanban"
          className="text-left bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="text-xs uppercase tracking-wide text-indigo-600 font-semibold mb-2">Kanban Pipeline</div>
          <div className="text-lg font-semibold text-slate-900">
            {kanbanPipelineSummary.inTransit || 0} Requests In-Transit
          </div>
          <div className="mt-3">
            <div className="h-2 w-full rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-indigo-500"
                style={{ width: `${kanbanPipelineSummary.percent || 0}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-2">{kanbanPipelineSummary.percent || 0}% selesai</div>
          </div>
        </button>

        <button
          onClick={() => openDashboardTarget('inventory')}
          disabled={!canOpenDashboardTarget('inventory')}
          title={getDashboardCardTitle('inventory', 'Buka dashboard inventory')}
          className={getDashboardCardClassName('inventory', 'text-left bg-white border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-emerald-600 font-semibold mb-2">Stock Health</div>
          <div className="text-sm font-semibold text-slate-900">Total Value</div>
          <div className="text-lg font-bold text-emerald-700">{formatMoney(inventoryHealthSummary.totalStock || 0)}</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">Aging &gt; 90 Days</div>
          <div className="text-base font-bold text-rose-600">{formatMoney(inventoryHealthSummary.deadStock || 0)}</div>
          <div className="mt-2 text-sm font-semibold text-slate-900">Turnover Rate</div>
          <div className="text-base font-bold text-indigo-600">{inventoryHealthSummary.turnoverRate || 0}x</div>
        </button>

        <button
          onClick={() => openDashboardTarget('monitoring')}
          disabled={!canOpenDashboardTarget('monitoring')}
          title={getDashboardCardTitle('monitoring', 'Buka dashboard monitoring')}
          className={getDashboardCardClassName('monitoring', 'text-left bg-white border border-sky-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-sky-600 font-semibold mb-2">Production Today</div>
          <div className="text-lg font-semibold text-slate-900">{productionTodaySummary.label || '-'}</div>
          <div className="mt-2 text-xs text-slate-500">
            Status: {String(productionTodaySummary.status || 'idle').toUpperCase()}
          </div>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button
          onClick={() => openDashboardTarget('dash-prl')}
          disabled={!canOpenDashboardTarget('dash-prl')}
          title={getDashboardCardTitle('dash-prl', 'Buka PRL Coverage')}
          className={getDashboardCardClassName('dash-prl', 'text-left bg-gradient-to-br from-emerald-50 via-white to-emerald-100 border border-emerald-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-emerald-700 font-semibold mb-2">PRL Coverage</div>
          <ChartBox height={140}>
            <SafeResponsiveContainer>
              <BarChart data={prlCoverageData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="period" fontSize={10} />
                <YAxis fontSize={10} />
                <Bar dataKey="covered" stackId="a" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="shortage" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>

        <button
          onClick={openKanbanTarget}
          title="Buka dashboard Kanban"
          className="text-left bg-gradient-to-br from-indigo-50 via-white to-indigo-100 border border-indigo-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition"
        >
          <div className="text-xs uppercase tracking-wide text-indigo-700 font-semibold mb-2">Kanban Status</div>
          <ChartBox height={140}>
            <SafeResponsiveContainer>
              <PieChart>
                <Pie data={kanbanStatusData} dataKey="value" nameKey="name" innerRadius={38} outerRadius={60} paddingAngle={3}>
                  {kanbanStatusData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>

        <button
          onClick={() => openDashboardTarget('dash-inventory')}
          disabled={!canOpenDashboardTarget('dash-inventory')}
          title={getDashboardCardTitle('dash-inventory', 'Buka inventory aging')}
          className={getDashboardCardClassName('dash-inventory', 'text-left bg-gradient-to-br from-amber-50 via-white to-amber-100 border border-amber-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-amber-700 font-semibold mb-2">Inventory Aging</div>
          <ChartBox height={140}>
            <SafeResponsiveContainer>
              <BarChart data={inventoryAgingData}>
                <XAxis dataKey="label" fontSize={10} />
                <YAxis fontSize={10} />
                <Bar dataKey="value" fill="#f97316">
                  {inventoryAgingData.map((entry) => (
                    <Cell key={entry.label} fill={entry.color || '#f97316'} />
                  ))}
                </Bar>
              </BarChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>

        <button
          onClick={() => openDashboardTarget('dash-masterref')}
          disabled={!canOpenDashboardTarget('dash-masterref')}
          title={getDashboardCardTitle('dash-masterref', 'Buka master data health')}
          className={getDashboardCardClassName('dash-masterref', 'text-left bg-gradient-to-br from-slate-50 via-white to-slate-100 border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-slate-700 font-semibold mb-2">Master Data Health</div>
          <ChartBox height={140}>
            <SafeResponsiveContainer>
              <RadarChart data={masterDataHealth?.axes || []}>
                <PolarGrid />
                <PolarAngleAxis dataKey="axis" fontSize={9} />
                <Radar dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              </RadarChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-4">
        <button
          onClick={() => openDashboardTarget('dash-schedule')}
          disabled={!canOpenDashboardTarget('dash-schedule')}
          title={getDashboardCardTitle('dash-schedule', 'Buka schedule readiness')}
          className={getDashboardCardClassName('dash-schedule', 'text-left bg-gradient-to-br from-sky-50 via-white to-sky-100 border border-sky-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-sky-700 font-semibold mb-2">Schedule Readiness</div>
          <ChartBox height={160}>
            {scheduleReadinessLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <SkeletonBlock className="h-24 w-32" />
              </div>
            ) : (
              <SafeResponsiveContainer>
                <LineChart data={scheduleReadinessData}>
                  <XAxis dataKey="day" fontSize={10} />
                  <YAxis fontSize={10} />
                  <Line type="monotone" dataKey="target" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="ready" stroke="#10b981" strokeWidth={2} dot={false} />
                </LineChart>
              </SafeResponsiveContainer>
            )}
          </ChartBox>
        </button>

        <button
          onClick={() => openDashboardTarget('dash-schedule')}
          disabled={!canOpenDashboardTarget('dash-schedule')}
          title={getDashboardCardTitle('dash-schedule', 'Buka supplier lead time')}
          className={getDashboardCardClassName('dash-schedule', 'text-left bg-gradient-to-br from-cyan-50 via-white to-cyan-100 border border-cyan-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition')}
        >
          <div className="text-xs uppercase tracking-wide text-cyan-700 font-semibold mb-2">Supplier Lead Time</div>
          <ChartBox height={160}>
            <SafeResponsiveContainer>
              <BarChart data={supplierPerformanceData} layout="vertical">
                <XAxis type="number" fontSize={10} />
                <YAxis dataKey="name" type="category" width={120} fontSize={10} />
                <Bar dataKey="leadTime" fill="#0ea5e9" />
              </BarChart>
            </SafeResponsiveContainer>
          </ChartBox>
        </button>
      </div>
    </div>
  );
};

export default TabDashboard;
