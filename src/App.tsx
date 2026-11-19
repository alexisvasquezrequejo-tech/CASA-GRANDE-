import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, Pencil, X } from 'lucide-react';
import {
  AppStateResponse,
  Lead,
  LeadAlertEvent,
  LeadSource,
  LeadStatus,
  LotPurpose,
  PaymentMethod,
  ProjectInfo,
  ProjectPhoto,
  StrategyTool,
  TabKey,
} from './types';
import {
  WHATSAPP_DISPLAY_NUMBER,
  buildAdvisorWhatsAppLink,
  playNewLeadChime,
  triggerDesktopLeadNotification,
} from './utils/alerts';
import CaptacionView from './components/CaptacionView';
import LeadsView from './components/LeadsView';
import EmbudoKpiView from './components/EmbudoKpiView';
import EstrategiaView from './components/EstrategiaView';
import LeadAlertSystem from './components/LeadAlertSystem';

const DEFAULT_PROJECT_INFO: ProjectInfo = {
  causeLabel: 'Causa priorizada del proyecto de mejora',
  causeTitle: 'Baja estrategia de marketing definida',
  description:
    'Sistema para atraer, registrar y dar seguimiento a los interesados en los lotes de Las Gaviotas de Reque, y medir cuántos se convierten en clientes.',
};

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('captacion');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [projectInfo, setProjectInfo] = useState<ProjectInfo>(DEFAULT_PROJECT_INFO);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tools, setTools] = useState<StrategyTool[]>([]);
  const [photos, setPhotos] = useState<ProjectPhoto[]>([]);

  // Alert system state
  const [alerts, setAlerts] = useState<LeadAlertEvent[]>([]);
  const [highlightedLeadId, setHighlightedLeadId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('cg_alert_sound');
      return saved === null ? true : saved === 'true';
    } catch {
      return true;
    }
  });
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });

  // Edit project info modal
  const [editingInfo, setEditingInfo] = useState(false);
  const [causeLabelDraft, setCauseLabelDraft] = useState('');
  const [causeTitleDraft, setCauseTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoError, setInfoError] = useState<string | null>(null);

  const processedAlertIdsRef = useRef<Set<string>>(new Set());
  const soundEnabledRef = useRef(soundEnabled);
  soundEnabledRef.current = soundEnabled;

  const notifyNewLead = useCallback((lead: Lead) => {
    if (processedAlertIdsRef.current.has(lead.id)) return;
    processedAlertIdsRef.current.add(lead.id);

    const newAlert: LeadAlertEvent = {
      id: `alert-${lead.id}`,
      lead,
      timestamp: new Date().toISOString(),
      read: false,
    };
    setAlerts((prev) => [newAlert, ...prev]);

    if (soundEnabledRef.current) {
      playNewLeadChime();
    }
    triggerDesktopLeadNotification(lead);
  }, []);

  // Load initial state from backend
  useEffect(() => {
    let active = true;
    fetch('/api/state')
      .then(async (res) => {
        if (!res.ok) throw new Error('No se pudo cargar la información del sistema.');
        return (await res.json()) as AppStateResponse;
      })
      .then((data) => {
        if (!active) return;
        setProjectInfo(data.projectInfo);
        setLeads(data.leads);
        setTools(data.tools);
        setPhotos(Array.isArray(data.photos) ? data.photos : []);
        for (const lead of data.leads) {
          processedAlertIdsRef.current.add(lead.id);
        }
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setLoadError(err instanceof Error ? err.message : 'Error de conexión.');
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  // Subscribe to Server-Sent Events for real-time lead alerts
  useEffect(() => {
    const evtSource = new EventSource('/api/events');

    evtSource.addEventListener('lead_created', (event) => {
      try {
        const createdLead = JSON.parse((event as MessageEvent).data) as Lead;
        setLeads((prev) => {
          if (prev.some((l) => l.id === createdLead.id)) return prev;
          return [createdLead, ...prev];
        });
        notifyNewLead(createdLead);
      } catch {
        // Ignore malformed SSE payload
      }
    });

    evtSource.addEventListener('lead_updated', (event) => {
      try {
        const updatedLead = JSON.parse((event as MessageEvent).data) as Lead;
        setLeads((prev) => prev.map((l) => (l.id === updatedLead.id ? updatedLead : l)));
      } catch {
        // Ignore malformed SSE payload
      }
    });

    evtSource.addEventListener('lead_deleted', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { id: string };
        setLeads((prev) => prev.filter((l) => l.id !== payload.id));
      } catch {
        // Ignore malformed SSE payload
      }
    });

    return () => {
      evtSource.close();
    };
  }, [notifyNewLead]);

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('cg_alert_sound', String(next));
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  };

  const handleRequestDesktopPermission = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await Notification.requestPermission();
      setDesktopPermission(result);
    } catch {
      // Ignore permission rejection
    }
  };

  const handleCreateLead = async (payload: {
    name: string;
    phone: string;
    district: string;
    source: LeadSource;
    paymentMethod: PaymentMethod;
    purpose: LotPurpose;
    consent: boolean;
    status?: LeadStatus;
    notes?: string;
  }): Promise<Lead> => {
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo registrar el lead.');
    }
    const created = data as Lead;
    setLeads((prev) => (prev.some((l) => l.id === created.id) ? prev : [created, ...prev]));
    notifyNewLead(created);
    return created;
  };

  const handleUpdateLead = async (id: string, patch: Partial<Lead>): Promise<void> => {
    const res = await fetch(`/api/leads/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'No se pudo actualizar el lead.');
    }
    const updated = data as Lead;
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)));
  };

  const handleDeleteLead = async (id: string): Promise<void> => {
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    setLeads((prev) => prev.filter((l) => l.id !== id));
    setAlerts((prev) => prev.filter((a) => a.lead.id !== id));
  };

  const handleCreateTool = async (payload: { title: string; description: string; items: string[] }) => {
    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo agregar la herramienta.');
    setTools(data as StrategyTool[]);
  };

  const handleUpdateTool = async (
    id: string,
    payload: { label: string; title: string; description: string; items: string[] }
  ) => {
    const res = await fetch(`/api/tools/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'No se pudo actualizar la herramienta.');
    setTools(data as StrategyTool[]);
  };

  const handleDeleteTool = async (id: string) => {
    const res = await fetch(`/api/tools/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    const data = (await res.json()) as StrategyTool[];
    setTools(data);
  };

  const handleResetTools = async () => {
    const res = await fetch('/api/tools/reset', { method: 'POST' });
    if (!res.ok) return;
    const data = (await res.json()) as StrategyTool[];
    setTools(data);
  };

  const openEditInfoModal = () => {
    setCauseLabelDraft(projectInfo.causeLabel);
    setCauseTitleDraft(projectInfo.causeTitle);
    setDescDraft(projectInfo.description);
    setInfoError(null);
    setEditingInfo(true);
  };

  const handleSaveProjectInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setInfoError(null);
    if (!causeTitleDraft.trim() || !descDraft.trim()) {
      setInfoError('El título y la descripción son obligatorios.');
      return;
    }
    setSavingInfo(true);
    try {
      const res = await fetch('/api/project-info', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          causeLabel: causeLabelDraft.trim() || projectInfo.causeLabel,
          causeTitle: causeTitleDraft.trim(),
          description: descDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'No se pudo guardar.');
      setProjectInfo(data as ProjectInfo);
      setEditingInfo(false);
    } catch (err) {
      setInfoError(err instanceof Error ? err.message : 'Error al guardar.');
    } finally {
      setSavingInfo(false);
    }
  };

  const handleInspectLeadFromAlert = (leadId: string) => {
    setActiveTab('leads');
    setHighlightedLeadId(leadId);
    setAlerts((prev) => prev.filter((a) => a.lead.id !== leadId));
    setTimeout(() => {
      setHighlightedLeadId((current) => (current === leadId ? null : current));
    }, 4500);
  };

  const uncontactedCount = leads.filter((l) => l.status === 'Nuevo').length;

  const navTabs: { key: TabKey; label: string }[] = [
    { key: 'captacion', label: 'Captación' },
    { key: 'leads', label: uncontactedCount > 0 ? `Leads (${uncontactedCount})` : 'Leads' },
    { key: 'embudo', label: 'Embudo y KPI' },
    { key: 'estrategia', label: 'Estrategia' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FB] text-[#171923]">
      {/* Top Bar Contract: 3-zone single row */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Brand Lockup with Casa Grande Inmobiliaria Logo */}
          <button
            type="button"
            onClick={() => setActiveTab('captacion')}
            className="flex items-center gap-3 text-left cursor-pointer whitespace-nowrap shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#23214B] rounded-md"
          >
            <img
              src="/assets/aistudio/image_69c16287.png"
              alt="Casa Grande Inmobiliaria"
              referrerPolicy="no-referrer"
              className="h-10 w-auto object-contain shrink-0"
            />
            <span className="font-display text-base sm:text-lg font-bold tracking-tight text-[#23214B] whitespace-nowrap shrink-0">
              CONISER Casa Grande
            </span>
          </button>

          {/* Zone 2: Primary Navigation (4 concise single-line links) */}
          <nav aria-label="Navegación principal" className="hidden md:flex items-center gap-7">
            {navTabs.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative py-5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    isActive
                      ? 'text-[#23214B] font-semibold'
                      : 'text-[#5A5F69] hover:text-[#23214B]'
                  }`}
                >
                  {tab.label}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 bottom-0 h-0.5 bg-[#23214B]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 Primary Action */}
          <div className="flex items-center shrink-0">
            <a
              href={buildAdvisorWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] text-white text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="hidden sm:inline font-mono-tabular">{WHATSAPP_DISPLAY_NUMBER}</span>
              <span className="sm:hidden">WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Mobile Tab Navigation Strip (keeps header single-row on desktop, compact on mobile <= 15% vh) */}
        <nav
          aria-label="Navegación móvil"
          className="md:hidden border-t border-slate-100 bg-white px-4 flex items-center gap-5 overflow-x-auto"
        >
          {navTabs.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative py-2.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                  isActive ? 'text-[#23214B] font-semibold' : 'text-[#5A5F69]'
                }`}
              >
                {tab.label}
                {isActive && (
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-[#23214B]" />
                )}
              </button>
            );
          })}
        </nav>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Editable Project Context Banner */}
        <section
          aria-label="Contexto del proyecto de mejora"
          className="bg-white border border-slate-200 rounded-xl px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div className="space-y-1 max-w-4xl">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6E7175]">
              <span>Sistema de captación de leads</span>
              <span aria-hidden="true">·</span>
              <span>{projectInfo.causeLabel}</span>
            </div>
            <h2 className="font-display text-lg sm:text-xl font-bold text-[#23214B]">
              {projectInfo.causeTitle}
            </h2>
            <p className="text-sm text-[#4A4E57] leading-relaxed">{projectInfo.description}</p>
          </div>

          <button
            type="button"
            onClick={openEditInfoModal}
            className="self-start md:self-center inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#23214B] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Pencil className="h-3.5 w-3.5" />
            Editar título y descripción
          </button>
        </section>

        {loading ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 space-y-4">
            <div className="h-6 w-1/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-2/3 bg-slate-100 rounded animate-pulse" />
            <div className="h-32 w-full bg-slate-100 rounded animate-pulse" />
          </div>
        ) : loadError ? (
          <div className="bg-white border border-red-200 rounded-xl p-8 text-center space-y-3">
            <p className="text-sm font-medium text-[#DC2626]">{loadError}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg bg-[#23214B] text-white text-sm font-semibold cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'captacion' && (
              <CaptacionView
                photos={photos}
                onSubmitLead={handleCreateLead}
                onGoToLeads={() => setActiveTab('leads')}
              />
            )}
            {activeTab === 'leads' && (
              <LeadsView
                leads={leads}
                highlightedLeadId={highlightedLeadId}
                soundEnabled={soundEnabled}
                onToggleSound={handleToggleSound}
                desktopPermission={desktopPermission}
                onRequestDesktopPermission={handleRequestDesktopPermission}
                onAddLead={handleCreateLead}
                onUpdateLead={handleUpdateLead}
                onDeleteLead={handleDeleteLead}
                onGoToCaptacion={() => setActiveTab('captacion')}
              />
            )}
            {activeTab === 'embudo' && <EmbudoKpiView leads={leads} />}
            {activeTab === 'estrategia' && (
              <EstrategiaView
                tools={tools}
                onCreateTool={handleCreateTool}
                onUpdateTool={handleUpdateTool}
                onDeleteTool={handleDeleteTool}
                onResetTools={handleResetTools}
              />
            )}
          </>
        )}
      </main>

      {/* Quiet Institutional Footer */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E7175]">
          <div className="flex items-center gap-3">
            <img
              src="/assets/aistudio/image_69c16287.png"
              alt="Casa Grande Inmobiliaria"
              referrerPolicy="no-referrer"
              className="h-7 w-auto object-contain"
            />
            <span>Proyecto de mejora · SENATI · Administración de Empresas · CONISER Casa Grande, 2026.</span>
          </div>
          <a
            href={buildAdvisorWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono-tabular text-[#23214B] hover:underline whitespace-nowrap"
          >
            WhatsApp {WHATSAPP_DISPLAY_NUMBER}
          </a>
        </div>
      </footer>

      {/* Real-time New Lead Alert Stack */}
      <LeadAlertSystem
        alerts={alerts}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onDismissAlert={(alertId) => setAlerts((prev) => prev.filter((a) => a.id !== alertId))}
        onDismissAll={() => setAlerts([])}
        onInspectLead={handleInspectLeadFromAlert}
      />

      {/* Edit Project Title & Description Modal */}
      {editingInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-info-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="edit-info-modal-title" className="font-display text-lg font-bold text-[#23214B]">
                Editar título y descripción
              </h3>
              <button
                type="button"
                onClick={() => setEditingInfo(false)}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-slate-400 hover:text-[#23214B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectInfo} className="space-y-4">
              <div>
                <label htmlFor="info-cause-label" className="block text-sm font-medium text-[#23214B] mb-1">
                  Subtítulo / categoría
                </label>
                <input
                  id="info-cause-label"
                  type="text"
                  value={causeLabelDraft}
                  onChange={(e) => setCauseLabelDraft(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div>
                <label htmlFor="info-cause-title" className="block text-sm font-medium text-[#23214B] mb-1">
                  Título principal (Causa priorizada)
                </label>
                <input
                  id="info-cause-title"
                  type="text"
                  required
                  value={causeTitleDraft}
                  onChange={(e) => setCauseTitleDraft(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div>
                <label htmlFor="info-desc" className="block text-sm font-medium text-[#23214B] mb-1">
                  Descripción
                </label>
                <textarea
                  id="info-desc"
                  rows={3}
                  required
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              {infoError && (
                <p className="text-xs font-medium text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {infoError}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInfo(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-[#4A4E57] hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingInfo}
                  className="px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {savingInfo ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
