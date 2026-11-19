import { Lead } from '../types';

export const WHATSAPP_ADVISOR_NUMBER = '51901773203';
export const WHATSAPP_DISPLAY_NUMBER = '+51 901 773 203';

export function formatCurrencyPEN(amount: number): string {
  return `S/ ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatLeadDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getLeadAgeInfo(createdAt: string): {
  label: string;
  isOver24h: boolean;
  minutesElapsed: number;
} {
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) {
    return { label: 'Reciente', isOver24h: false, minutesElapsed: 0 };
  }
  const diffMs = Math.max(0, Date.now() - created);
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return { label: 'Ahora mismo', isOver24h: false, minutesElapsed: minutes };
  if (minutes < 60) return { label: `Hace ${minutes} min`, isOver24h: false, minutesElapsed: minutes };
  if (hours < 24) return { label: `Hace ${hours} h`, isOver24h: false, minutesElapsed: minutes };
  return {
    label: `Hace ${days} d (${hours} h)`,
    isOver24h: true,
    minutesElapsed: minutes,
  };
}

export function buildAdvisorWhatsAppLink(lead?: Partial<Lead>, customMessage?: string): string {
  if (customMessage) {
    return `https://wa.me/${WHATSAPP_ADVISOR_NUMBER}?text=${encodeURIComponent(customMessage)}`;
  }
  if (lead?.name) {
    const msg = `Hola, soy ${lead.name} (${lead.phone ?? ''}). Me interesa un lote en Las Gaviotas de Reque (${lead.district ?? 'Chiclayo'}). Forma de pago: ${lead.paymentMethod ?? 'En cuotas'}, uso: ${lead.purpose ?? 'Vivienda'}.`;
    return `https://wa.me/${WHATSAPP_ADVISOR_NUMBER}?text=${encodeURIComponent(msg)}`;
  }
  return `https://wa.me/${WHATSAPP_ADVISOR_NUMBER}?text=${encodeURIComponent(
    'Hola, quiero información sobre los lotes en Las Gaviotas de Reque.'
  )}`;
}

export function buildLeadContactWhatsAppLink(lead: Lead): string {
  const cleanPhone = lead.phone.replace(/\D/g, '');
  const fullPhone = cleanPhone.startsWith('51') ? cleanPhone : `51${cleanPhone}`;
  const msg = `Hola ${lead.name}, te saluda un asesor de CONISER Casa Grande sobre tu interés en los lotes de Las Gaviotas de Reque. ¿En qué horario te gustaría agendar tu visita guiada gratuita?`;
  return `https://wa.me/${fullPhone}?text=${encodeURIComponent(msg)}`;
}

/**
 * Plays a clear, pleasant two-tone notification chime using Web Audio API.
 * Safe when audio context is blocked by browser autoplay policy.
 */
export function playNewLeadChime(): void {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, startOffset: number, duration: number, peakGain: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + startOffset);
      gain.gain.setValueAtTime(0.0001, now + startOffset);
      gain.gain.exponentialRampToValueAtTime(peakGain, now + startOffset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startOffset + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + startOffset);
      osc.stop(now + startOffset + duration);
    };

    playTone(587.33, 0, 0.22, 0.14); // D5
    playTone(880.0, 0.12, 0.34, 0.16); // A5

    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 800);
  } catch {
    // Ignore audio context restrictions
  }
}

export function triggerDesktopLeadNotification(lead: Lead): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification('Nuevo lead registrado · Las Gaviotas de Reque', {
      body: `${lead.name} (${lead.phone}) · ${lead.district} · Fuente: ${lead.source}`,
      icon: '/assets/aistudio/image_69c16287.png',
    });
  } catch {
    // Ignore notification failure in restricted iframes
  }
}
