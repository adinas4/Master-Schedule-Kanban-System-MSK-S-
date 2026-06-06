import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

const outDir = path.join('docs', 'templates');
fs.mkdirSync(outDir, { recursive: true });

const writeTemplate = (filename, sheetName, headers, rows) => {
  const data = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const target = path.join(outDir, filename);
  XLSX.writeFile(wb, target);
};

writeTemplate(
  'phase2-master-capacity.xlsx',
  'Master Kapasitas',
  [
    'location_id',
    'dock_id',
    'dock_name',
    'max_truck_per_day',
    'max_rit_per_day',
    'operational_start',
    'operational_end',
    'break_start',
    'break_end',
    'notes',
    'is_closed',
  ],
  [
    ['WH-01', 'DOCK-A', 'Dock A', 20, 40, '08:00', '17:00', '12:00', '13:00', 'Default', false],
  ],
);

writeTemplate(
  'phase2-calendar.xlsx',
  'Kalender Kerja',
  ['date', 'is_holiday', 'description', 'shift_override'],
  [
    ['2026-03-17', true, 'Libur Nasional', ''],
  ],
);

writeTemplate(
  'phase2-slot-time-window.xlsx',
  'Slot Waktu',
  ['location_id', 'rit_code', 'start_time', 'end_time', 'capacity_per_rit', 'priority_order', 'active'],
  [
    ['WH-01', 'RIT-1', '08:00', '10:00', 8, 1, true],
  ],
);

writeTemplate(
  'phase2-sla-supplier.xlsx',
  'SLA Supplier',
  [
    'supplier_id',
    'otd_target_pct',
    'allowed_late_days',
    'allowed_early_days',
    'minus_tolerance_pct',
    'over_tolerance_pct',
    'note',
  ],
  [
    ['__DEFAULT__', 95, 0, 0, 0, 0, 'Default Global'],
    ['SUP-01', 92, 1, 0, 2, 2, 'Override Vendor'],
  ],
);

writeTemplate(
  'phase2-item-daily-usage.xlsx',
  'Daily Usage',
  ['item_code', 'daily_usage_qty', 'uom', 'source', 'effective_date'],
  [
    ['RM-0001', 120, 'PCS', 'Avg 3 months', '2026-03-01'],
  ],
);

writeTemplate(
  'phase2-item-supplier-mapping.xlsx',
  'Item Supplier',
  ['item_code', 'supplier_id', 'share_percent', 'priority_rank', 'min_order_qty', 'lead_time_days_override'],
  [
    ['RM-0001', 'SUP-01', 100, 1, 500, ''],
  ],
);

console.log('Phase 2 templates generated in', outDir);
