export type TabKey = 'captacion' | 'leads' | 'embudo' | 'estrategia';

export type LeadStatus = 'Nuevo' | 'Contactado' | 'Visita' | 'Separó' | 'Compró';

export type LeadSource =
  | 'Facebook'
  | 'TikTok'
  | 'Instagram'
  | 'WhatsApp'
  | 'Recomendación'
  | 'Cartel en proyecto'
  | 'Otro';

export type PaymentMethod = 'En cuotas' | 'Al contado';

export type LotPurpose = 'Vivienda' | 'Inversión' | 'Casa de playa';

export interface Lead {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  district: string;
  source: LeadSource;
  paymentMethod: PaymentMethod;
  purpose: LotPurpose;
  consent: boolean;
  status: LeadStatus;
  notes?: string;
}

export interface ProjectInfo {
  causeLabel: string;
  causeTitle: string;
  description: string;
}

export interface StrategyTool {
  id: string;
  label: string;
  title: string;
  description: string;
  items: string[];
}

export interface ProjectPhoto {
  id: string;
  src: string;
  alt: string;
  captionTitle: string;
  captionDetail: string;
}

export interface AppStateResponse {
  projectInfo: ProjectInfo;
  leads: Lead[];
  tools: StrategyTool[];
  photos: ProjectPhoto[];
}

export interface LeadAlertEvent {
  id: string;
  lead: Lead;
  timestamp: string;
  read: boolean;
}
