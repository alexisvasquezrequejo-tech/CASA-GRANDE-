import React, { useState } from 'react';
import { Pencil, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { StrategyTool } from '../types';

interface EstrategiaViewProps {
  tools: StrategyTool[];
  onCreateTool: (payload: { title: string; description: string; items: string[] }) => Promise<void>;
  onUpdateTool: (id: string, payload: { label: string; title: string; description: string; items: string[] }) => Promise<void>;
  onDeleteTool: (id: string) => Promise<void>;
  onResetTools: () => Promise<void>;
}

export default function EstrategiaView({
  tools,
  onCreateTool,
  onUpdateTool,
  onDeleteTool,
  onResetTools,
}: EstrategiaViewProps) {
  const [editingTool, setEditingTool] = useState<StrategyTool | null>(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const [labelDraft, setLabelDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [itemsTextDraft, setItemsTextDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const openEditModal = (tool: StrategyTool) => {
    setCreatingNew(false);
    setEditingTool(tool);
    setLabelDraft(tool.label);
    setTitleDraft(tool.title);
    setDescriptionDraft(tool.description);
    setItemsTextDraft(tool.items.join('\n'));
    setErrorMsg(null);
  };

  const openCreateModal = () => {
    setEditingTool(null);
    setCreatingNew(true);
    setLabelDraft(`Herramienta ${tools.length + 1}`);
    setTitleDraft('');
    setDescriptionDraft('');
    setItemsTextDraft('');
    setErrorMsg(null);
  };

  const closeModal = () => {
    setEditingTool(null);
    setCreatingNew(false);
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!titleDraft.trim() || !descriptionDraft.trim()) {
      setErrorMsg('El título y la descripción son obligatorios.');
      return;
    }
    const items = itemsTextDraft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setSaving(true);
    try {
      if (creatingNew) {
        await onCreateTool({
          title: titleDraft.trim(),
          description: descriptionDraft.trim(),
          items,
        });
      } else if (editingTool) {
        await onUpdateTool(editingTool.id, {
          label: labelDraft.trim() || editingTool.label,
          title: titleDraft.trim(),
          description: descriptionDraft.trim(),
          items,
        });
      }
      closeModal();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-[#23214B]">
            Herramientas del plan de mejora
          </h2>
          <p className="text-sm text-[#5A5F69]">
            Estrategias comerciales y de marketing para elevar la conversión en Las Gaviotas de Reque.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onResetTools}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#4A4E57] transition-colors cursor-pointer whitespace-nowrap"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar base
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] text-white text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            Agregar herramienta
          </button>
        </div>
      </div>

      {tools.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center space-y-4">
          <p className="text-sm text-[#5A5F69]">
            No hay herramientas estratégicas configuradas en este momento.
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={onResetTools}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-[#23214B] cursor-pointer"
            >
              Restaurar herramientas iniciales
            </button>
            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 rounded-lg bg-[#23214B] text-white text-sm font-semibold hover:bg-[#191738] cursor-pointer"
            >
              Agregar herramienta
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          {tools.map((tool) => (
            <article
              key={tool.id}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-3">
                <p className="text-xs font-semibold text-[#C85A2B]">{tool.label}</p>
                <h3 className="font-display text-lg font-bold text-[#23214B] leading-snug">
                  {tool.title}
                </h3>
                <p className="text-sm text-[#5A5F69] leading-relaxed">{tool.description}</p>

                {tool.items.length > 0 && (
                  <ul className="pt-3 border-t border-slate-100 space-y-2 text-sm text-[#2D313B]">
                    {tool.items.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span aria-hidden="true" className="text-[#C85A2B] font-bold leading-5">
                          ·
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => openEditModal(tool)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-medium text-[#23214B] transition-colors cursor-pointer"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteTool(tool.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-xs font-medium text-[#DC2626] transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Quitar
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Edit / Create Strategy Tool Modal */}
      {(editingTool || creatingNew) && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="tool-modal-title"
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center p-4"
        >
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-lg p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 id="tool-modal-title" className="font-display text-lg font-bold text-[#23214B]">
                {creatingNew ? 'Nueva herramienta estratégica' : `Editar ${editingTool?.label}`}
              </h3>
              <button
                type="button"
                onClick={closeModal}
                aria-label="Cerrar"
                className="p-1.5 rounded-md text-slate-400 hover:text-[#23214B] hover:bg-slate-100 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!creatingNew && (
                <div>
                  <label htmlFor="tool-label" className="block text-sm font-medium text-[#23214B] mb-1">
                    Etiqueta
                  </label>
                  <input
                    id="tool-label"
                    type="text"
                    value={labelDraft}
                    onChange={(e) => setLabelDraft(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                  />
                </div>
              )}

              <div>
                <label htmlFor="tool-title" className="block text-sm font-medium text-[#23214B] mb-1">
                  Título
                </label>
                <input
                  id="tool-title"
                  type="text"
                  required
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  placeholder="Ej. Segmentación de clientes"
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div>
                <label htmlFor="tool-desc" className="block text-sm font-medium text-[#23214B] mb-1">
                  Descripción
                </label>
                <textarea
                  id="tool-desc"
                  rows={2}
                  required
                  value={descriptionDraft}
                  onChange={(e) => setDescriptionDraft(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              <div>
                <label htmlFor="tool-items" className="block text-sm font-medium text-[#23214B] mb-1">
                  Acciones o puntos clave (uno por línea)
                </label>
                <textarea
                  id="tool-items"
                  rows={4}
                  value={itemsTextDraft}
                  onChange={(e) => setItemsTextDraft(e.target.value)}
                  placeholder="Escribe cada punto en una nueva línea..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                />
              </div>

              {errorMsg && (
                <p className="text-xs font-medium text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-medium text-[#4A4E57] hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-[#23214B] hover:bg-[#191738] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer"
                >
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
