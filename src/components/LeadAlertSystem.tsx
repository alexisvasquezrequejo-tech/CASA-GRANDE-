import { Bell, MessageCircle, ArrowRight, X, Volume2, VolumeX } from 'lucide-react';
import { LeadAlertEvent } from '../types';
import { buildLeadContactWhatsAppLink, formatLeadDate } from '../utils/alerts';

interface LeadAlertSystemProps {
  alerts: LeadAlertEvent[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDismissAlert: (alertId: string) => void;
  onDismissAll: () => void;
  onInspectLead: (leadId: string) => void;
}

export default function LeadAlertSystem({
  alerts,
  soundEnabled,
  onToggleSound,
  onDismissAlert,
  onDismissAll,
  onInspectLead,
}: LeadAlertSystemProps) {
  const visibleAlerts = alerts.slice(0, 2);

  if (visibleAlerts.length === 0) return null;

  return (
    <aside
      aria-live="assertive"
      aria-label="Alertas de nuevos leads"
      className="fixed bottom-4 right-4 z-50 w-[calc(100vw-2rem)] max-w-md space-y-2"
    >
      {visibleAlerts.map((alertItem) => {
        const { lead } = alertItem;
        return (
          <div
            key={alertItem.id}
            role="alert"
            className="bg-[#23214B] text-white border border-white/15 rounded-xl p-4 shadow-xl transition-transform duration-200"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#C85A2B] text-white">
                  <Bell className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span className="font-semibold text-white">Nuevo lead registrado</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{formatLeadDate(lead.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold text-white truncate">{lead.name}</p>
                  <p className="mt-0.5 text-xs text-slate-300 tabular-nums truncate">
                    {lead.phone} · {lead.district} · {lead.source} · {lead.paymentMethod}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={onToggleSound}
                  title={soundEnabled ? 'Silenciar sonido de alerta' : 'Activar sonido de alerta'}
                  aria-label={soundEnabled ? 'Silenciar sonido de alerta' : 'Activar sonido de alerta'}
                  className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => onDismissAlert(alertItem.id)}
                  aria-label="Cerrar alerta"
                  className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
              <a
                href={buildLeadContactWhatsAppLink(lead)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Contactar WhatsApp
              </a>
              <div className="flex items-center gap-2">
                {alerts.length > 1 && (
                  <button
                    type="button"
                    onClick={onDismissAll}
                    className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                  >
                    Descartar ({alerts.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onInspectLead(lead.id)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white text-[#23214B] hover:bg-slate-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Ver en Leads
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </aside>
  );
}
