import React, { useState } from 'react';
import {
  Check,
  MessageCircle,
  PhoneCall,
  Calculator,
  MapPin,
  Image as ImageIcon,
  X,
  Maximize2,
} from 'lucide-react';
import { Lead, LeadSource, LotPurpose, PaymentMethod, ProjectPhoto } from '../types';
import {
  WHATSAPP_DISPLAY_NUMBER,
  buildAdvisorWhatsAppLink,
  formatCurrencyPEN,
} from '../utils/alerts';

interface CaptacionViewProps {
  photos: ProjectPhoto[];
  onSubmitLead: (payload: {
    name: string;
    phone: string;
    district: string;
    source: LeadSource;
    paymentMethod: PaymentMethod;
    purpose: LotPurpose;
    consent: boolean;
  }) => Promise<Lead>;
  onGoToLeads: () => void;
}

const LEAD_SOURCES: LeadSource[] = [
  'Facebook',
  'TikTok',
  'Instagram',
  'WhatsApp',
  'Recomendación',
  'Cartel en proyecto',
  'Otro',
];

const PAYMENT_METHODS: PaymentMethod[] = ['En cuotas', 'Al contado'];
const LOT_PURPOSES: LotPurpose[] = ['Vivienda', 'Inversión', 'Casa de playa'];

const DEFAULT_PROJECT_PHOTOS: ProjectPhoto[] = [
  {
    id: 'portada',
    src: '/src/assets/images/portada_gaviotas_reque_real_1795050095094.jpg',
    alt: 'Portada de ingreso naranja con el letrero Las Gaviotas de Reque',
    captionTitle: 'Portada de ingreso',
    captionDetail: 'Entrada principal del proyecto',
  },
  {
    id: 'lotes',
    src: '/src/assets/images/lotes_delimitados_reque_real_1795050094108.jpg',
    alt: 'Terreno con lotes delimitados, calles afirmadas y postes de luz',
    captionTitle: 'Lotes delimitados',
    captionDetail: 'Calles trazadas y postes de luz',
  },
];

export default function CaptacionView({
  photos,
  onSubmitLead,
  onGoToLeads,
}: CaptacionViewProps) {
  // Lead Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [district, setDistrict] = useState('');
  const [source, setSource] = useState<LeadSource>('Facebook');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('En cuotas');
  const [purpose, setPurpose] = useState<LotPurpose>('Vivienda');
  const [consent, setConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedLead, setSubmittedLead] = useState<Lead | null>(null);

  // Simulator State
  const [lotPrice, setLotPrice] = useState<number>(21000);
  const [downPayment, setDownPayment] = useState<number>(1500);
  const [months, setMonths] = useState<number>(36);

  // Image error fallback tracking + zoom lightbox
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [zoomPhoto, setZoomPhoto] = useState<ProjectPhoto | null>(null);

  const displayPhotos = photos.length > 0 ? photos : DEFAULT_PROJECT_PHOTOS;

  const safePrice = Number.isFinite(lotPrice) && lotPrice >= 5000 ? lotPrice : 21000;
  const safeDownPayment = Number.isFinite(downPayment)
    ? Math.max(0, Math.min(downPayment, safePrice - 500))
    : 1500;
  const safeMonths = Number.isFinite(months) ? Math.max(1, Math.min(60, months)) : 36;
  const financedBalance = Math.max(0, safePrice - safeDownPayment);
  const monthlyInstallment = Math.round(financedBalance / safeMonths);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) {
      setFormError('Ingresa tu nombre completo.');
      return;
    }
    if (!/^\d{9}$/.test(cleanPhone)) {
      setFormError('Ingresa un número de celular válido de 9 dígitos.');
      return;
    }
    if (!district.trim()) {
      setFormError('Ingresa tu distrito.');
      return;
    }
    if (!consent) {
      setFormError('Debes aceptar que CONISER Casa Grande te contacte.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await onSubmitLead({
        name: name.trim(),
        phone: cleanPhone,
        district: district.trim(),
        source,
        paymentMethod,
        purpose,
        consent,
      });
      setSubmittedLead(created);
      setName('');
      setPhone('');
      setDistrict('');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'No se pudo registrar tu solicitud.');
    } finally {
      setSubmitting(false);
    }
  };

  const simulationWhatsAppUrl = buildAdvisorWhatsAppLink(
    undefined,
    `Hola CONISER Casa Grande, hice una simulación de cuotas para Las Gaviotas de Reque:\n• Precio del lote: ${formatCurrencyPEN(
      safePrice
    )}\n• Cuota inicial: ${formatCurrencyPEN(safeDownPayment)}\n• Saldo a financiar: ${formatCurrencyPEN(
      financedBalance
    )}\n• Plazo: ${safeMonths} meses\n• Cuota mensual referencial: ${formatCurrencyPEN(
      monthlyInstallment
    )}\nQuisiera confirmar disponibilidad y agendar una visita.`
  );

  return (
    <div className="space-y-12">
      {/* Hero Split + 4-Column Strip Below */}
      <section aria-labelledby="hero-title" className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 sm:p-10 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center gap-2 text-sm font-medium text-[#6E7175]">
                <MapPin className="h-4 w-4 text-[#C85A2B] shrink-0" />
                <span>Las Gaviotas de Reque</span>
                <span aria-hidden="true">·</span>
                <span>Chiclayo</span>
              </div>

              <h1
                id="hero-title"
                className="font-display text-[clamp(2rem,3.6vw,3.15rem)] font-bold tracking-tight text-[#23214B] leading-[1.12] [text-wrap:balance]"
              >
                Tu lote propio cerca del mar, con facilidades de pago
              </h1>

              <div className="pt-2 pb-4 border-b border-slate-200 flex flex-wrap items-baseline gap-x-6 gap-y-2">
                <div>
                  <span className="text-sm text-[#6E7175] block">Desde</span>
                  <span className="font-display text-3xl sm:text-4xl font-bold text-[#23214B] tabular-nums">
                    S/ 21,000
                  </span>
                </div>
                <p className="text-sm sm:text-base text-[#4A4E57]">
                  Inicial desde <strong className="font-semibold text-[#23214B] tabular-nums">S/ 1,500</strong> · cuotas sin intereses
                </p>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm sm:text-base text-[#2D313B]">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span>Título de propiedad</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span>Agua y luz</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span>A minutos de la playa</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-[#16A34A] shrink-0" />
                  <span>Vías de acceso</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-[#6E7175]">Escríbenos al número:</p>
                <p className="mt-0.5 font-mono-tabular text-lg font-semibold text-[#23214B]">
                  {WHATSAPP_DISPLAY_NUMBER}
                </p>
              </div>
              <a
                href={buildAdvisorWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <MessageCircle className="h-4 w-4" />
                Escribir por WhatsApp
              </a>
            </div>
          </div>

          {/* Right Column: Lead Capture Form */}
          <div
            id="formulario-captacion"
            className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 flex flex-col justify-between"
          >
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-[#23214B]">
                Separa tu visita al lote
              </h2>
              <p className="mt-1.5 text-sm text-[#5A5F69]">
                Déjanos tus datos y un asesor te contacta en menos de 24 horas.
              </p>

              {submittedLead ? (
                <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="h-8 w-8 rounded-lg bg-[#16A34A] text-white flex items-center justify-center shrink-0">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-[#171923]">
                        Solicitud registrada correctamente
                      </h3>
                      <p className="mt-1 text-sm text-[#4A4E57]">
                        Gracias, <strong>{submittedLead.name}</strong>. Un asesor de CONISER Casa Grande se comunicará al{' '}
                        <span className="font-mono-tabular">{submittedLead.phone}</span> y ya se activó la alerta en el sistema.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <a
                      href={buildAdvisorWhatsAppLink(submittedLead)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar por WhatsApp ahora
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmittedLead(null)}
                      className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-sm font-medium text-[#23214B] transition-colors whitespace-nowrap"
                    >
                      Registrar otro interesado
                    </button>
                    <button
                      type="button"
                      onClick={onGoToLeads}
                      className="text-sm font-medium text-[#23214B] underline underline-offset-4 hover:text-[#C85A2B] whitespace-nowrap"
                    >
                      Ver en Leads
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFormSubmit} className="mt-6 space-y-4" noValidate>
                  <div>
                    <label htmlFor="lead-name" className="block text-sm font-medium text-[#23214B] mb-1.5">
                      Nombre completo
                    </label>
                    <input
                      id="lead-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ej. María Fernández Díaz"
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="lead-phone" className="block text-sm font-medium text-[#23214B] mb-1.5">
                        Celular
                      </label>
                      <input
                        id="lead-phone"
                        type="tel"
                        inputMode="numeric"
                        maxLength={9}
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        placeholder="9 dígitos"
                        className="w-full px-3.5 py-2.5 text-sm font-mono-tabular rounded-lg border border-slate-300 bg-white text-[#171923] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                      />
                    </div>
                    <div>
                      <label htmlFor="lead-district" className="block text-sm font-medium text-[#23214B] mb-1.5">
                        Distrito
                      </label>
                      <input
                        id="lead-district"
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        placeholder="Ej. Chiclayo"
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="lead-source" className="block text-sm font-medium text-[#23214B] mb-1.5">
                      ¿Cómo nos conociste?
                    </label>
                    <select
                      id="lead-source"
                      value={source}
                      onChange={(e) => setSource(e.target.value as LeadSource)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                    >
                      {LEAD_SOURCES.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="lead-payment" className="block text-sm font-medium text-[#23214B] mb-1.5">
                        Forma de pago
                      </label>
                      <select
                        id="lead-payment"
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                      >
                        {PAYMENT_METHODS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="lead-purpose" className="block text-sm font-medium text-[#23214B] mb-1.5">
                        ¿Para qué quieres el lote?
                      </label>
                      <select
                        id="lead-purpose"
                        value={purpose}
                        onChange={(e) => setPurpose(e.target.value as LotPurpose)}
                        className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-[#171923] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20 focus:border-[#23214B]"
                      >
                        {LOT_PURPOSES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-[#23214B] focus:ring-[#23214B]"
                    />
                    <span className="text-xs leading-relaxed text-[#4A4E57]">
                      Acepto que CONISER Casa Grande me contacte por llamada o WhatsApp.
                    </span>
                  </label>

                  {formError && (
                    <p role="alert" className="text-xs font-medium text-[#DC2626] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#23214B] hover:bg-[#191738] disabled:opacity-60 text-white text-sm font-semibold transition-colors cursor-pointer"
                  >
                    <PhoneCall className="h-4 w-4" />
                    {submitting ? 'Registrando...' : 'Quiero más información'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Full-Width 4-Column Key Specs Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-xl divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[#6E7175]">Desde</p>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#23214B] tabular-nums">
              S/ 21,000
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[#6E7175]">Área</p>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#23214B] tabular-nums">
              90 m²
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[#6E7175]">Cuotas</p>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#23214B] tabular-nums">
              hasta 36
            </p>
          </div>
          <div className="p-5 sm:p-6">
            <p className="text-xs font-medium text-[#6E7175]">Ubicación</p>
            <p className="mt-1 font-display text-xl sm:text-2xl font-bold text-[#23214B]">
              Reque
            </p>
          </div>
        </div>
      </section>

      {/* Fotos del proyecto */}
      <section aria-labelledby="photos-title" className="space-y-6">
        <div>
          <p className="text-xs font-medium text-[#C85A2B]">Fotos del proyecto</p>
          <h2 id="photos-title" className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#23214B] tracking-tight">
            Conoce Las Gaviotas de Reque
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayPhotos.map((photo) => (
            <figure
              key={photo.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col group"
            >
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                {brokenImages[photo.id] ? (
                  <div className="h-full w-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-slate-100 to-slate-200 text-[#6E7175]">
                    <ImageIcon className="h-8 w-8 mb-2 opacity-60" />
                    <span className="text-sm font-medium text-[#23214B]">{photo.captionTitle}</span>
                  </div>
                ) : (
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    referrerPolicy="no-referrer"
                    onClick={() => setZoomPhoto(photo)}
                    onError={() => setBrokenImages((prev) => ({ ...prev, [photo.id]: true }))}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03] cursor-zoom-in"
                  />
                )}
                <button
                  type="button"
                  onClick={() => setZoomPhoto(photo)}
                  aria-label={`Ampliar ${photo.captionTitle}`}
                  className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 text-[#23214B] opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shadow-sm cursor-pointer"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>
              <figcaption className="p-4 text-sm text-[#4A4E57]">
                <span className="font-semibold text-[#23214B]">{photo.captionTitle}</span>
                <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
                <span>{photo.captionDetail}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Lightbox de foto */}
      {zoomPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={zoomPhoto.captionTitle}
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl overflow-hidden max-w-4xl w-full shadow-2xl border border-slate-200"
          >
            <div className="aspect-[16/10] bg-slate-100 relative">
              <img
                src={zoomPhoto.src}
                alt={zoomPhoto.alt}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain bg-slate-950"
              />
              <button
                type="button"
                onClick={() => setZoomPhoto(null)}
                aria-label="Cerrar vista previa"
                className="absolute top-3 right-3 p-2 rounded-lg bg-white/95 text-[#23214B] hover:bg-white shadow cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="px-5 py-3.5 text-sm">
              <span className="font-semibold text-[#23214B]">{zoomPhoto.captionTitle}</span>
              <span aria-hidden="true" className="mx-1.5 text-slate-400">·</span>
              <span className="text-[#5A5F69]">{zoomPhoto.captionDetail}</span>
            </div>
          </div>
        </div>
      )}

      {/* Simulador de cuotas */}
      <section aria-labelledby="simulator-title" className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-medium text-[#C85A2B]">
                <Calculator className="h-4 w-4" />
                <span>Simulador de cuotas</span>
              </div>
              <h2 id="simulator-title" className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#23214B] tracking-tight">
                ¿Cuánto pagarías al mes?
              </h2>
            </div>

            <div className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <label htmlFor="sim-price" className="text-sm font-medium text-[#23214B]">
                    Precio del lote (S/)
                  </label>
                  <input
                    id="sim-price"
                    type="number"
                    min={10000}
                    max={100000}
                    step={500}
                    value={lotPrice}
                    onChange={(e) => setLotPrice(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 text-right text-sm font-mono-tabular font-semibold rounded-lg border border-slate-300 text-[#23214B] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                  />
                </div>
                <input
                  type="range"
                  min={15000}
                  max={60000}
                  step={500}
                  value={Math.min(60000, Math.max(15000, safePrice))}
                  onChange={(e) => setLotPrice(Number(e.target.value))}
                  aria-label="Ajustar precio del lote"
                  className="w-full accent-[#23214B] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <label htmlFor="sim-down" className="text-sm font-medium text-[#23214B]">
                    Cuota inicial: <span className="font-mono-tabular font-semibold">{formatCurrencyPEN(safeDownPayment)}</span>
                  </label>
                  <input
                    id="sim-down"
                    type="number"
                    min={0}
                    max={Math.max(0, safePrice - 500)}
                    step={500}
                    value={downPayment}
                    onChange={(e) => setDownPayment(Number(e.target.value))}
                    className="w-32 px-3 py-1.5 text-right text-sm font-mono-tabular font-semibold rounded-lg border border-slate-300 text-[#23214B] focus:outline-none focus:ring-2 focus:ring-[#23214B]/20"
                  />
                </div>
                <input
                  type="range"
                  min={1000}
                  max={Math.max(1500, Math.min(25000, safePrice - 500))}
                  step={500}
                  value={safeDownPayment}
                  onChange={(e) => setDownPayment(Number(e.target.value))}
                  aria-label="Ajustar cuota inicial"
                  className="w-full accent-[#23214B] cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <label htmlFor="sim-months" className="text-sm font-medium text-[#23214B]">
                    Número de cuotas
                  </label>
                  <span className="font-mono-tabular text-sm font-semibold text-[#23214B]">
                    {safeMonths} meses
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {[6, 12, 18, 24, 36].map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => setMonths(term)}
                      className={`px-3.5 py-2 rounded-lg text-sm font-medium tabular-nums transition-colors cursor-pointer whitespace-nowrap ${
                        safeMonths === term
                          ? 'bg-[#23214B] text-white'
                          : 'bg-slate-100 text-[#4A4E57] hover:bg-slate-200 hover:text-[#23214B]'
                      }`}
                    >
                      {term} meses
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Summary Panel */}
          <div className="lg:col-span-5 bg-[#F8F9FB] border border-slate-200 rounded-xl p-6 space-y-6">
            <div>
              <p className="text-xs font-medium text-[#6E7175]">Tu cuota mensual</p>
              <p className="mt-1 font-display text-4xl sm:text-5xl font-bold text-[#23214B] tabular-nums">
                {formatCurrencyPEN(monthlyInstallment)}
              </p>
            </div>

            <dl className="divide-y divide-slate-200 border-y border-slate-200 text-sm">
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-[#6E7175]">Precio</dt>
                <dd className="font-mono-tabular font-semibold text-[#23214B]">{formatCurrencyPEN(safePrice)}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-[#6E7175]">Inicial</dt>
                <dd className="font-mono-tabular font-semibold text-[#23214B]">{formatCurrencyPEN(safeDownPayment)}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-[#6E7175]">Saldo a financiar</dt>
                <dd className="font-mono-tabular font-semibold text-[#23214B]">{formatCurrencyPEN(financedBalance)}</dd>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <dt className="text-[#6E7175]">Plazo</dt>
                <dd className="font-mono-tabular font-semibold text-[#23214B]">{safeMonths} meses</dd>
              </div>
            </dl>

            <div className="space-y-3">
              <a
                href={simulationWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-sm font-semibold transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Enviar mi simulación por WhatsApp
              </a>
              <p className="text-xs text-[#6E7175] text-center">
                Simulación referencial sin intereses. Un asesor confirma el monto final.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
