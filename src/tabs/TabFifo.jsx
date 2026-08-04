import React from 'react';
import {
  AlertTriangle,
  ArrowDownUp,
  BarChart3,
  Calendar,
  CheckCircle,
  MapPin,
  Package,
  Plus,
  Trash2,
  TrendingDown,
} from 'lucide-react';
import SearchableSelectDropdown from '../components/SearchableSelectDropdown';

const FIFO_PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const TabFifo = (props) => {
  const {
    mainTab,
    fifoTotalStock,
    fifoActiveLots,
    fifoDepletedLots,
    fifoTotalLots,
    selectedFifoKanban,
    setSelectedFifoKanban,
    fifoKanbanItems,
    handleFifoReceive,
    handleFifoIssue,
    filteredFifoLots,
    getFifoStatusBadge,
    getFifoQualityBadge,
    handleFifoDelete,
    canDeleteRecords,
  } = props;

  const [fifoPage, setFifoPage] = React.useState(1);
  const [fifoPageSize, setFifoPageSize] = React.useState(10);

  const sortedFifoLots = React.useMemo(
    () => [...filteredFifoLots].sort((a, b) => a.fifoSequence - b.fifoSequence),
    [filteredFifoLots],
  );
  const fifoTotalPages = Math.max(1, Math.ceil(sortedFifoLots.length / fifoPageSize));
  const fifoPageStart = sortedFifoLots.length === 0 ? 0 : (fifoPage - 1) * fifoPageSize + 1;
  const fifoPageEnd = Math.min(sortedFifoLots.length, fifoPage * fifoPageSize);
  const paginatedFifoLots = sortedFifoLots.slice((fifoPage - 1) * fifoPageSize, fifoPage * fifoPageSize);

  React.useEffect(() => {
    setFifoPage(1);
  }, [selectedFifoKanban, fifoPageSize, filteredFifoLots.length]);

  React.useEffect(() => {
    if (fifoPage > fifoTotalPages) {
      setFifoPage(fifoTotalPages);
    }
  }, [fifoPage, fifoTotalPages]);

  return (
    <>
            {/* FIFO Management */}
            {mainTab === 'fifo' && (
            <div className="space-y-6">
              <div className="bg-white rounded-xl border p-4">
                <div className="text-2xl font-bold text-slate-900">FIFO Management System</div>
                <div className="text-xs text-slate-500">First-in-first-out lot tracking and inventory management.</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold">
                    <span>Total Stock</span>
                    <Package size={14} />
                  </div>
                  <div className="text-2xl font-bold mt-2">{fifoTotalStock}</div>
                  <div className="text-xs text-slate-400">Units available</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold">
                    <span>Active Lots</span>
                    <CheckCircle size={14} className="text-emerald-500" />
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mt-2">{fifoActiveLots}</div>
                  <div className="text-xs text-slate-400">Available for issue</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold">
                    <span>Depleted Lots</span>
                    <AlertTriangle size={14} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-bold text-amber-600 mt-2">{fifoDepletedLots}</div>
                  <div className="text-xs text-slate-400">Fully consumed</div>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between text-xs text-slate-500 uppercase font-bold">
                    <span>Total Lots</span>
                    <BarChart3 size={14} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-2">{fifoTotalLots}</div>
                  <div className="text-xs text-slate-400">All FIFO lots</div>
                </div>
              </div>

              <div className="bg-white rounded-xl border p-4">
                <div className="text-sm font-semibold">FIFO Operations</div>
                <div className="text-xs text-slate-500 mb-4">Manage material receiving and issuing with FIFO compliance.</div>
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600">Select Kanban Item</label>
                    <SearchableSelectDropdown
                      className="mt-1"
                      value={selectedFifoKanban}
                      options={fifoKanbanItems}
                      onChange={(value) => setSelectedFifoKanban(value)}
                      placeholder="Choose a kanban item..."
                      searchPlaceholder="Ketik kode Kanban / nama barang"
                      emptyText="Item Kanban tidak ditemukan."
                      getOptionValue={(item) => String(item?.kanbanId || '').trim()}
                      getOptionLabel={(item) => `${item?.kanbanId || ''} - ${item?.itemCode || ''} - ${item?.itemName || ''}`.trim().replace(/^-+\s*|\s*-\s*$/g, '')}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <button
                      type="button"
                      onClick={handleFifoReceive}
                      disabled={!selectedFifoKanban}
                      className="px-3 py-2 rounded text-sm bg-indigo-600 text-white disabled:opacity-50"
                    >
                      <Plus size={14} className="inline-block mr-1" /> Auto Receive
                    </button>
                    <button
                      type="button"
                      onClick={handleFifoIssue}
                      disabled={!selectedFifoKanban || fifoTotalStock === 0}
                      className="px-3 py-2 rounded text-sm border border-slate-200 text-slate-700 disabled:opacity-50"
                    >
                      <TrendingDown size={14} className="inline-block mr-1" /> Auto Issue
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border overflow-hidden">
                <div className="p-4 border-b">
                  <div className="text-sm font-semibold flex items-center gap-2">
                    <ArrowDownUp size={16} />
                    FIFO Lots - {selectedFifoKanban ? (fifoKanbanItems.find((k) => k.kanbanId === selectedFifoKanban)?.itemName || '-') : 'All Items'}
                  </div>
                  <div className="text-xs text-slate-500">
                    Lots are displayed in FIFO order (oldest first). Material is issued from the top of this list.
                  </div>
                </div>
                {filteredFifoLots.length === 0 ? (
                  <div className="p-6 text-center text-sm text-slate-400">
                    {selectedFifoKanban ? 'No FIFO lots found for this item.' : 'Please select a kanban item to view FIFO lots.'}
                  </div>
                ) : (
                  <>
                  <div className="overflow-x-auto">
                    <table className="w-max table-auto text-xs whitespace-nowrap">
                      <thead className="bg-slate-100 text-[11px] uppercase text-slate-500">
                        <tr>
                          <th className="px-2.5 py-2 text-left">FIFO Seq</th>
                          <th className="px-2.5 py-2 text-left">Lot Number</th>
                          <th className="px-2.5 py-2 text-left">Batch Number</th>
                          <th className="px-2.5 py-2 text-left">Received Date</th>
                          <th className="px-2.5 py-2 text-left">Expiry Date</th>
                          <th className="px-2.5 py-2 text-left">Location</th>
                          <th className="px-2.5 py-2 text-right">Initial Qty</th>
                          <th className="px-2.5 py-2 text-right">Remaining Qty</th>
                          <th className="px-2.5 py-2 text-left">Status</th>
                          <th className="px-2.5 py-2 text-left">Quality</th>
                          <th className="px-2.5 py-2 text-left">Days in Stock</th>
                          <th className="px-2.5 py-2 text-left">Usage</th>
                          <th className="px-2.5 py-2 text-left">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {paginatedFifoLots
                          .map((lot, pageIndex) => {
                            const index = (fifoPage - 1) * fifoPageSize + pageIndex;
                            const usagePct = lot.initialQty ? Math.round(((lot.initialQty - lot.remainingQty) / lot.initialQty) * 100) : 0;
                            return (
                              <tr key={lot.id} className={`${index === 0 && lot.status === 'Active' ? 'bg-emerald-50' : ''}`}>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{lot.fifoSequence}</span>
                                    {index === 0 && lot.status === 'Active' && (
                                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-emerald-600 text-white">Next</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2 font-medium">{lot.lotNumber}</td>
                                <td className="px-2.5 py-2">{lot.batchNumber || '-'}</td>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center gap-1">
                                    <Calendar size={12} className="text-slate-400" />
                                    {lot.receivedDate}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2">
                                  {lot.expiryDate ? (
                                    <div className="flex items-center gap-1">
                                      <Calendar size={12} className="text-slate-400" />
                                      <span className={lot.expiryDate < new Date().toISOString().split('T')[0] ? 'text-red-600' : 'text-slate-700'}>
                                        {lot.expiryDate}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-400">-</span>
                                  )}
                                </td>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center gap-1">
                                    <MapPin size={12} className="text-slate-400" />
                                    {lot.location}
                                  </div>
                                </td>
                                <td className="px-2.5 py-2 text-right">{lot.initialQty}</td>
                                <td className="px-2.5 py-2 text-right">
                                  <span className={`${lot.remainingQty === 0 ? 'text-slate-400' : lot.remainingQty < lot.initialQty * 0.2 ? 'text-amber-600' : 'text-emerald-600'} font-semibold`}>
                                    {lot.remainingQty}
                                  </span>
                                </td>
                                <td className="px-2.5 py-2">
                                  <span className={`px-2 py-0.5 rounded-full border text-xs ${getFifoStatusBadge(lot.status)}`}>{lot.status}</span>
                                </td>
                                <td className="px-2.5 py-2">
                                  <span className={`px-2 py-0.5 rounded-full border text-xs ${getFifoQualityBadge(lot.qualityStatus)}`}>{lot.qualityStatus}</span>
                                </td>
                                <td className="px-2.5 py-2">
                                  <span className={lot.daysInStock > 30 ? 'text-amber-600' : 'text-slate-700'}>{lot.daysInStock}d</span>
                                </td>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-12 bg-slate-200 rounded-full h-2">
                                      <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${usagePct}%` }}></div>
                                    </div>
                                    <span className="text-xs text-slate-500">{usagePct}%</span>
                                  </div>
                                </td>
                                <td className="px-2.5 py-2">
                                  <div className="flex items-center gap-2">
                                    {canDeleteRecords && (
                                      <button
                                        type="button"
                                        onClick={() => handleFifoDelete(lot.id)}
                                        className="text-red-600 hover:text-red-700"
                                        title="Delete"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-col gap-2 border-t px-3 py-2 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      Showing <span className="font-semibold text-slate-800">{fifoPageStart}</span>-<span className="font-semibold text-slate-800">{fifoPageEnd}</span> of <span className="font-semibold text-slate-800">{sortedFifoLots.length}</span> lots
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={fifoPageSize}
                        onChange={(event) => setFifoPageSize(Number(event.target.value))}
                        className="h-8 rounded border border-slate-200 bg-white px-2 text-xs"
                      >
                        {FIFO_PAGE_SIZE_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option} / page</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setFifoPage((page) => Math.max(1, page - 1))}
                        disabled={fifoPage <= 1}
                        className="h-8 rounded border border-slate-200 px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Prev
                      </button>
                      <span className="min-w-[72px] text-center font-semibold text-slate-800">
                        {fifoPage} / {fifoTotalPages}
                      </span>
                      <button
                        type="button"
                        onClick={() => setFifoPage((page) => Math.min(fifoTotalPages, page + 1))}
                        disabled={fifoPage >= fifoTotalPages}
                        className="h-8 rounded border border-slate-200 px-3 font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                  </>
                )}
              </div>
            </div>
            )}
    </>
  );
};

export default TabFifo;
