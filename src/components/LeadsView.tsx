import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bell,
  BellRing,
  Download,
  MessageCircle,
  Plus,
  Search,
  Trash2,
  FileText,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { Lead, LeadSource, LeadStatus, LotPurpose, PaymentMethod } from '../types';
import {
  buildLeadContactWhatsAppLink,
  formatLeadDate,
  getLeadAgeInfo,
} from '../utils/alerts';

interface LeadsViewProps {
  leads: Lead[];
  highlightedLeadId: string | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  desktopPermission: NotificationPermission | 'unsupported';
  onRequestDesktopPermission: () => void;
  onAddLead: (payload: {
    name: string;
    phone: string;
    district: string;
    source: LeadSource;
    paymentMethod: PaymentMethod;
    purpose: LotPurpose;
    consent: boolean;
    status: LeadStatus;
    notes?: string;
  }) => Promise<Lead>;
  onUpdateLead: (id: string, patch: Partial<Lead>) => Promise<void>;
  onDeleteLead: (id: string) => Promise<void>;
  onGoToCaptacion: () => void;
}

const ALL_STATUSES: LeadStatus[] = ['Nuevo', 'Contactado', 'Visita', 'Separó', 'Compró'];
const ALL_SOURCES: LeadSource[] = [
  'Facebook',
  'TikTok',
  'Instagram',
  'WhatsApp',
  'Recomendación',
  'Cartel en proyecto',
  'Otro',
];

function getStatusSelectStyles(status: LeadStatus): string {
  switch (status) {
    case 'Nuevo':
      return 'border-amber-300 bg-amber-50 text-amber-900';
    case 'Contactado':
      return 'border-sky-300 bg-sky-50 text-sky-900';
    case 'Visita':
      return 'border-indigo-300 bg-indigo-50 text-indigo-900';
    case 'Separó':
      return 'border-orange-300 bg-orange-50 text-orange-900';
    case 'Compró':
      return 'border-emerald-300 bg-emerald-50 text-emerald-900';
  }
}

export default function LeadsView({
  leads,
  highlightedLeadId,
  soundEnabled,
  onToggleSound,
  desktopPermission,
  onRequestDesktopPermission,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onGoToCaptacion,
}: LeadsViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Add lead modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newSource, setNewSource] = useState<LeadSource>('Facebook');
  const [newPayment, setNewPayment] = useState<PaymentMethod>('En cuotas');
  const [newPurpose, setNewPurpose] = useState<LotPurpose>('Vivienda');
  const [newStatus, setNewStatus] = useState<LeadStatus>('Nuevo');
  const [newNotes, setNewNotes] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [savingNew, setSavingNew] = useState(false);

  // Notes modal state
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const totalLeads = leads.length;
  const uncontactedLeads = leads.filter((l) => l.status === 'Nuevo');
  const uncontactedCount = uncontactedLeads.length;
  const overdueLeadsCount = uncontactedLeads.filter((l) => getLeadAgeInfo(l.createdAt).isOver24h).length;
  const boughtCount = leads.filter((l) => l.status === 'Compró').length;
  const conversionRate = totalLeads > 0 ? ((boughtCount / totalLeads) * 100).toFixed(1) : '0.0';

  const filteredLeads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return leads.filter((lead) => {
      const matchesQuery =
        !q ||
        lead.name.toLowerCase().includes(q) ||
        lead.phone.includes(q) ||
        lead.district.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter;
      const matchesSource = sourceFilter === 'ALL' || lead.source === sourceFilter;
      return matchesQuery && matchesStatus && matchesSource;
    });
  }, [leads, searchQuery, statusFilter, sourceFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    const cleanPhone = newPhone.replace(/\D/g, '');
    if (!newName.trim()) {
      setAddError('Ingresa el nombre completo.');
      return;
    }
    if (!/^\d{9}$/.test(cleanPhone)) {
      setAddError('Ingresa un celular válido de 9 dígitos.');
      return;
    }
    if (!newDistrict.trim()) {
      setAddError('Ingresa el distrito.');
      return;
    }

    setSavingNew(true);
    try {
      await onAddLead({
        name: newName.trim(),
        phone: cleanPhone,
        district: newDistrict.trim(),
        source: newSource,
        paymentMethod: newPayment,
        purpose: newPurpose,
        consent: true,
        status: newStatus,
        notes: newNotes.trim(),
      });
      setShowAddModal(false);
      setNewName('');
      setNewPhone('');
      setNewDistrict('');
      setNewNotes('');
      setNewStatus('Nuevo');
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Error al guardar el lead.');
    } finally {
      setSavingNew(false);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    setSavingNotes(true);
    try {
      await onUpdateLead(editingLead.id, { notes: notesDraft.trim() });
      setEditingLead(null);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredLeads.length === 0) return;
    const headers = ['Fecha', 'Nombre', 'Celular', 'Distrito', 'Fuente', 'Forma de pago', 'Uso', 'Estado', 'Notas'];
    const rows = filteredLeads.map((l) => [
      formatLeadDate(l.createdAt),
      l.name,
      l.phone,
      l.district,
      l.source,
      l.paymentMethod,
      l.purpose,
      l.status,
      l.notes ?? '',
    ]);
    const escapeCell = (val: string) => `"${val.replace(/"/g, '""')}"`;
    const csvContent = [headers.map(escapeCell).join(','), ...rows.map((r) => r.map(escapeCell).join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads-las-gaviotas-reque-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* 4-Column KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[#6E7175]">Leads totales</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#23214B] tabular-nums">
            {totalLeads}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[#6E7175]">Sin contactar</p>
          <p className={`mt-1.5 font-display text-3xl font-bold tabular-nums ${uncontactedCount > 0 ? 'text-[#C85A2B]' : 'text-[#23214B]'}`}>
            {uncontactedCount}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[#6E7175]">Compraron</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#16A34A] tabular-nums">
            {boughtCount}
          </p>
        </div>
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium text-[#6E7175]">Tasa de conversión</p>
          <p className="mt-1.5 font-display text-3xl font-bold text-[#23214B] tabular-nums">
            {conversionRate}%
          </p>
        </div>
      </div>

      {/* Lead Alert & SLA Bar */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {overdueLeadsCount > 0 ? (
            <AlertTriangle className="h-5 w-5 text-[#DC2626] shrink-0" />
          ) : uncontactedCount > 0 ? (
            <BellRing className="h-5 w-5 text-[#C85A2B] shrink-0" />
          ) : (
            <Bell className="h-5 w-5 text-[#23214B] shrink-0" />
          )}
          <div className="text-sm">
            {uncontactedCount > 0 ? (
              <p className="text-[#171923]">
                <strong className="font-semibold tabular-nums">
                  {uncontactedCount} {uncontactedCount === 1 ? 'lead sin contactar' : 'leads sin contactar'}
                </strong>
                <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                <span className="text-[#5A5F69]">
                  Meta de atención: antes de 24 h
                  {overdueLeadsCount > 0 && ` (${overdueLeadsCount} con más de 24 h de espera)`}
                </span>
              </p>
            ) : (
              <p className="text-[#4A4E57]">
                <strong className="font-semibold text-[#23214B]">Sistema de alertas activo</strong>
                <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                <span>Recibirás un aviso visual y sonoro cada vez que ingrese un nuevo lead.</span>
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleSound}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
              soundEnabled
                ? 'border-slate-300 bg-slate-50 text-[#23214B] hover:bg-slate-100'
                : 'border-slate-200 bg-white text-[#6E7175] hover:bg-slate-50'
            }`}
          >
            {soundEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#16A34A]" /> : <VolumeX className="h-3.5 w-3.5" />}
            {soundEnabled ? 'Sonido activado' : 'Sonido silenciado'}
          </button>

          {desktopPermission !== 'unsupported' && (
            <button
              type="button"
              onClick={onRequestDesktopPermission}
              disabled={desktopPermission === 'granted'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors whitespace-nowrap ${
                desktopPermission === 'granted'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800 cursor-default'
                  : 'border-slate-300 bg-white text-[#23214B] hover:bg-slate-50 cursor-pointer'
              }`}
            >
              <Bell className="h-3.5 w-3.5" />
              {desktopPermission === 'granted'
                ? 'Alertas de escritorio activas'
                : desktopPermission === 'denied'
                  ? 'Alertas bloqueadas en navegador'
                  : 'Activar alertas de escritorio'}
            </button>
          )}
        </div>
      </div>

      {/* Filter & Action Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nombre o celular"
                aria-label="Buscar nombre o celular"
                className="w-full pl-9 pr-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filtrar por estado"
              className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
            >
              <option value="ALL">Todos los estados</option>
              {ALL_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              aria-label="Filtrar por fuente"
              className="px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
            >
              <option value="ALL">Todas las fuentes</option>
              {ALL_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {leads.length > 0 && (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-[#23214B] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              Agregar lead
            </button>
          </div>
        </div>

        {/* Leads Data Table */}
        <div className="overflow-x-auto border-t border-slate-200 -mx-4 sm:-mx-5 px-4 sm:px-5 pt-2">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-200 text-xs font-semibold text-[#6E7175]">
                <th className="py-3 pr-4">Fecha</th>
                <th className="py-3 pr-4">Nombre</th>
                <th className="py-3 pr-4">Celular</th>
                <th className="py-3 pr-4">Distrito</th>
                <th className="py-3 pr-4">Fuente</th>
                <th className="py-3 pr-4">Pago / uso</th>
                <th className="py-3 pr-4">Estado</th>
                <th className="py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <div className="max-w-md mx-auto space-y-4">
                      <p className="text-sm text-[#5A5F69]">
                        {leads.length === 0
                          ? 'Aún no hay leads. Comparte la página de Captación en tus anuncios y aparecerán aquí.'
                          : 'No se encontraron leads con los filtros seleccionados.'}
                      </p>
                      <div className="flex flex-wrap items-center justify-center gap-3">
                        {leads.length === 0 ? (
                          <>
                            <button
                              type="button"
                              onClick={onGoToCaptacion}
                              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-[#23214B] transition-colors cursor-pointer"
                            >
                              Ir a Captación
                            </button>
                            <button
                              type="button"
                              onClick={() => setShowAddModal(true)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] text-white text-sm font-semibold transition-colors cursor-pointer"
                            >
                              <Plus className="h-4 w-4" />
                              Agregar lead
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSearchQuery('');
                              setStatusFilter('ALL');
                              setSourceFilter('ALL');
                            }}
                            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-[#23214B] transition-colors cursor-pointer"
                          >
                            Limpiar filtros
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const age = getLeadAgeInfo(lead.createdAt);
                  const isHighlighted = highlightedLeadId === lead.id;
                  const isUrgent = lead.status === 'Nuevo' && age.isOver24h;

                  return (
                    <tr
                      key={lead.id}
                      className={`transition-colors ${
                        isHighlighted ? 'bg-amber-50/70' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <div className="font-mono-tabular text-xs text-[#23214B]">
                          {formatLeadDate(lead.createdAt)}
                        </div>
                        <div className={`text-xs ${isUrgent ? 'text-[#DC2626] font-medium' : 'text-[#6E7175]'}`}>
                          {age.label}
                          {isUrgent ? ' · Vencido >24h' : ''}
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-[#171923]">{lead.name}</div>
                        {lead.notes && (
                          <div className="text-xs text-[#6E7175] truncate max-w-[200px]" title={lead.notes}>
                            {lead.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-mono-tabular text-[#23214B] whitespace-nowrap">
                        {lead.phone}
                      </td>
                      <td className="py-3 pr-4 text-[#4A4E57] whitespace-nowrap">{lead.district}</td>
                      <td className="py-3 pr-4 text-[#4A4E57] whitespace-nowrap">{lead.source}</td>
                      <td className="py-3 pr-4 text-[#4A4E57] whitespace-nowrap">
                        <span>{lead.paymentMethod}</span>
                        <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                        <span>{lead.purpose}</span>
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateLead(lead.id, { status: e.target.value as LeadStatus })}
                          aria-label={`Cambiar estado de ${lead.name}`}
                          className={`px-2.5 py-1 rounded-md border text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 cursor-pointer ${getStatusSelectStyles(
                            lead.status
                          )}`}
                        >
                          {ALL_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <a
                            href={buildLeadContactWhatsAppLink(lead)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar por WhatsApp"
                            aria-label={`Contactar a ${lead.name} por WhatsApp`}
                            className="p-1.5 rounded-md text-[#16A34A] hover:bg-emerald-50 transition-colors"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLead(lead);
                              setNotesDraft(lead.notes ?? '');
                            }}
                            title="Notas de seguimiento"
                            aria-label={`Notas de seguimiento para ${lead.name}`}
                            className="p-1.5 rounded-md text-[#4A4E57] hover:text-[#23214B] hover:bg-slate-100 transition-colors cursor-pointer"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          {confirmDeleteId === lead.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteLead(lead.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 rounded text-xs font-semibold bg-[#DC2626] text-white hover:bg-red-700 cursor-pointer"
                              >
                                Eliminar
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded text-xs text-[#5A5F69] hover:bg-slate-100 cursor-pointer"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(lead.id)}
                              title="Eliminar lead"
                              aria-label={`Eliminar lead ${lead.name}`}
                              className="p-1.5 rounded-md text-slate-400 hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-lead-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="add-lead-modal-title" className="font-display text-lg font-bold text-[#23214B]">
                Agregar lead manualmente
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                aria-label="Cerrar ventana"
                className="p-1.5 rounded-md text-slate-400 hover:text-[#23214B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="space-y-4">
              <div>
                <label htmlFor="modal-name" className="block text-sm font-medium text-[#23214B] mb-1">
                  Nombre completo
                </label>
                <input
                  id="modal-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-phone" className="block text-sm font-medium text-[#23214B] mb-1">
                    Celular (9 dígitos)
                  </label>
                  <input
                    id="modal-phone"
                    type="tel"
                    inputMode="numeric"
                    maxLength={9}
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    placeholder="987654321"
                    className="w-full px-3.5 py-2 text-sm font-mono-tabular rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                  />
                </div>
                <div>
                  <label htmlFor="modal-district" className="block text-sm font-medium text-[#23214B] mb-1">
                    Distrito
                  </label>
                  <input
                    id="modal-district"
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="Ej. Reque"
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-source" className="block text-sm font-medium text-[#23214B] mb-1">
                    Fuente
                  </label>
                  <select
                    id="modal-source"
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value as LeadSource)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {ALL_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-status" className="block text-sm font-medium text-[#23214B] mb-1">
                    Estado inicial
                  </label>
                  <select
                    id="modal-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as LeadStatus)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    {ALL_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="modal-payment" className="block text-sm font-medium text-[#23214B] mb-1">
                    Forma de pago
                  </label>
                  <select
                    id="modal-payment"
                    value={newPayment}
                    onChange={(e) => setNewPayment(e.target.value as PaymentMethod)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="En cuotas">En cuotas</option>
                    <option value="Al contado">Al contado</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="modal-purpose" className="block text-sm font-medium text-[#23214B] mb-1">
                    Uso del lote
                  </label>
                  <select
                    id="modal-purpose"
                    value={newPurpose}
                    onChange={(e) => setNewPurpose(e.target.value as LotPurpose)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="Vivienda">Vivienda</option>
                    <option value="Inversión">Inversión</option>
                    <option value="Casa de playa">Casa de playa</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="modal-notes" className="block text-sm font-medium text-[#23214B] mb-1">
                  Notas (opcional)
                </label>
                <textarea
                  id="modal-notes"
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="Horario preferido, lote de interés o comentarios..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              {addError && (
                <p className="text-xs font-medium text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {addError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-[#4A4E57] hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNew}
                  className="px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {savingNew ? 'Guardando...' : 'Guardar lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      {editingLead && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="notes-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 id="notes-modal-title" className="font-display text-lg font-bold text-[#23214B]">
                  Seguimiento · {editingLead.name}
                </h3>
                <p className="text-xs text-[#6E7175] font-mono-tabular">
                  {editingLead.phone} · {editingLead.district}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingLead(null)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-slate-400 hover:text-[#23214B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNotes} className="space-y-4">
              <div>
                <label htmlFor="lead-notes-input" className="block text-sm font-medium text-[#23214B] mb-1.5">
                  Notas del asesor
                </label>
                <textarea
                  id="lead-notes-input"
                  rows={4}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Registra la fecha de visita, lote elegido o acuerdos de pago..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-[#4A4E57] hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingNotes}
                  className="px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] text-white text-sm font-semibold cursor-pointer"
                >
                  {savingNotes ? 'Guardando...' : 'Guardar notas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
