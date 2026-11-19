import { Lead, LeadStatus } from '../types';

interface EmbudoKpiViewProps {
  leads: Lead[];
}

const TARGET_CONVERSION = 15;

export default function EmbudoKpiView({ leads }: EmbudoKpiViewProps) {
  const totalLeads = leads.length;

  // Cumulative funnel progression: a lead in 'Compró' progressed through Contactado -> Visita -> Separó -> Compró
  const stageRank: Record<LeadStatus, number> = {
    Nuevo: 1,
    Contactado: 2,
    Visita: 3,
    Separó: 4,
    Compró: 5,
  };

  const reachedCount = (minRank: number) =>
    leads.filter((l) => stageRank[l.status] >= minRank).length;

  const exactCount = (status: LeadStatus) =>
    leads.filter((l) => l.status === status).length;

  const stages = [
    {
      label: 'Leads',
      count: totalLeads,
      activeInStage: exactCount('Nuevo'),
      barColor: 'bg-[#23214B]',
    },
    {
      label: 'Contactado',
      count: reachedCount(2),
      activeInStage: exactCount('Contactado'),
      barColor: 'bg-[#3B4275]',
    },
    {
      label: 'Visita',
      count: reachedCount(3),
      activeInStage: exactCount('Visita'),
      barColor: 'bg-[#54628F]',
    },
    {
      label: 'Separó',
      count: reachedCount(4),
      activeInStage: exactCount('Separó'),
      barColor: 'bg-[#C85A2B]',
    },
    {
      label: 'Compró',
      count: reachedCount(5),
      activeInStage: exactCount('Compró'),
      barColor: 'bg-[#16A34A]',
    },
  ];

  const boughtCount = exactCount('Compró');
  const conversionPct = totalLeads > 0 ? (boughtCount / totalLeads) * 100 : 0;
  const targetProgress = Math.min(100, (conversionPct / TARGET_CONVERSION) * 100);

  // Leads by source aggregation
  const sourceMap = new Map<string, { total: number; bought: number }>();
  for (const lead of leads) {
    const entry = sourceMap.get(lead.source) ?? { total: 0, bought: 0 };
    entry.total += 1;
    if (lead.status === 'Compró') entry.bought += 1;
    sourceMap.set(lead.source, entry);
  }
  const sourceStats = Array.from(sourceMap.entries())
    .map(([source, stats]) => ({
      source,
      total: stats.total,
      bought: stats.bought,
      sharePct: totalLeads > 0 ? Math.round((stats.total / totalLeads) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Embudo de ventas */}
      <section aria-labelledby="funnel-title" className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="funnel-title" className="font-display text-xl font-bold text-[#23214B]">
            Embudo de ventas
          </h2>
          <span className="text-xs text-[#6E7175] tabular-nums">
            Total registrados: {totalLeads}
          </span>
        </div>

        <div className="space-y-4">
          {stages.map((stage) => {
            const pct = totalLeads > 0 ? Math.round((stage.count / totalLeads) * 100) : 0;
            return (
              <div key={stage.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#23214B]">{stage.label}</span>
                    {totalLeads > 0 && stage.label !== 'Leads' && (
                      <span className="text-xs text-[#6E7175] tabular-nums">
                        ({stage.activeInStage} en etapa actual)
                      </span>
                    )}
                  </div>
                  <span className="font-mono-tabular font-semibold text-[#23214B]">
                    {stage.count} · {pct}%
                  </span>
                </div>
                <div className="h-3 w-full rounded-md bg-slate-100 overflow-hidden">
                  <div
                    className={`h-full rounded-md transition-all duration-300 ${stage.barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="pt-5 border-t border-slate-200 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <p className="font-semibold text-[#23214B] tabular-nums">
              Tasa de conversión: {conversionPct.toFixed(1)}% · meta {TARGET_CONVERSION}%
            </p>
            <span className="text-xs font-medium text-[#6E7175] tabular-nums">
              {conversionPct >= TARGET_CONVERSION ? 'Meta alcanzada' : `Falta ${(TARGET_CONVERSION - conversionPct).toFixed(1)}% para la meta`}
            </span>
          </div>

          <div className="h-2.5 w-full rounded-md bg-slate-100 overflow-hidden">
            <div
              className={`h-full rounded-md transition-all duration-300 ${
                conversionPct >= TARGET_CONVERSION ? 'bg-[#16A34A]' : 'bg-[#C85A2B]'
              }`}
              style={{ width: `${targetProgress}%` }}
            />
          </div>

          <p className="text-xs text-[#6E7175] font-mono-tabular">
            Fórmula: clientes que compraron ÷ leads totales × 100 ({boughtCount} ÷ {totalLeads}).
          </p>
        </div>
      </section>

      {/* Leads por fuente */}
      <section aria-labelledby="sources-title" className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
        <h2 id="sources-title" className="font-display text-xl font-bold text-[#23214B]">
          Leads por fuente
        </h2>

        {sourceStats.length === 0 ? (
          <div className="py-10 text-center border border-dashed border-slate-200 rounded-lg bg-[#F8F9FB]">
            <p className="text-sm font-medium text-[#5A5F69]">Sin datos todavía.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sourceStats.map((item) => (
              <div key={item.source} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-[#23214B]">{item.source}</span>
                  <span className="font-mono-tabular text-xs font-semibold text-[#23214B]">
                    {item.total} ({item.sharePct}%)
                    {item.bought > 0 ? ` · ${item.bought} compró` : ''}
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-md bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-md bg-[#23214B] transition-all duration-300"
                    style={{ width: `${item.sharePct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="pt-4 border-t border-slate-200 text-sm text-[#5A5F69] leading-relaxed">
          Muestra qué canal trae más interesados, para invertir el presupuesto de publicidad donde rinde.
        </p>
      </section>
    </div>
  );
}
