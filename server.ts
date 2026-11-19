import express from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

interface LeadRecord {
  id: string;
  createdAt: string;
  name: string;
  phone: string;
  district: string;
  source: string;
  paymentMethod: string;
  purpose: string;
  consent: boolean;
  status: 'Nuevo' | 'Contactado' | 'Visita' | 'Separó' | 'Compró';
  notes?: string;
}

interface ProjectInfoRecord {
  causeLabel: string;
  causeTitle: string;
  description: string;
}

interface StrategyToolRecord {
  id: string;
  label: string;
  title: string;
  description: string;
  items: string[];
}

interface ProjectPhotoRecord {
  id: string;
  src: string;
  alt: string;
  captionTitle: string;
  captionDetail: string;
}

interface DbSchema {
  projectInfo: ProjectInfoRecord;
  leads: LeadRecord[];
  tools: StrategyToolRecord[];
  photos: ProjectPhotoRecord[];
}

const DEFAULT_DB: DbSchema = {
  projectInfo: {
    causeLabel: 'Causa priorizada del proyecto de mejora',
    causeTitle: 'Baja estrategia de marketing definida',
    description:
      'Sistema para atraer, registrar y dar seguimiento a los interesados en los lotes de Las Gaviotas de Reque, y medir cuántos se convierten en clientes.',
  },
  leads: [],
  tools: [
    {
      id: 'tool-1',
      label: 'Herramienta 1',
      title: 'Segmentación de clientes',
      description: 'Definir a quién se le vende para no gastar en público que no compra.',
      items: [
        'Familias jóvenes de Chiclayo y Reque que buscan su primera vivienda.',
        'Inversionistas que compran para revender o alquilar.',
        'Personas que quieren casa de playa cerca de la ciudad.',
      ],
    },
    {
      id: 'tool-2',
      label: 'Herramienta 2',
      title: 'Plan de marketing digital',
      description: 'Calendario semanal de contenidos y anuncios que llevan al formulario de este sistema.',
      items: [
        'Lun: video recorrido del lote (TikTok / Reels).',
        'Mié: testimonio de cliente o avance de obras.',
        'Vie: anuncio en Meta Ads con enlace al formulario.',
        'Sáb: visita guiada gratuita al proyecto.',
      ],
    },
    {
      id: 'tool-3',
      label: 'Herramienta 3',
      title: 'Embudo de ventas (CRM)',
      description: 'Seguimiento de cada lead hasta la compra; mide la tasa de conversión.',
      items: [
        'Nuevo → Contactado (antes de 24 h).',
        'Contactado → Visita al lote.',
        'Visita → Separó → Compró.',
      ],
    },
  ],
  photos: [
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
  ],
};

function ensureDb(): DbSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
    return structuredClone(DEFAULT_DB);
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DbSchema>;
    return {
      projectInfo: parsed.projectInfo ?? structuredClone(DEFAULT_DB.projectInfo),
      leads: Array.isArray(parsed.leads) ? parsed.leads : [],
      tools: Array.isArray(parsed.tools) ? parsed.tools : structuredClone(DEFAULT_DB.tools),
      photos:
        Array.isArray(parsed.photos) && parsed.photos.length > 0
          ? parsed.photos
          : structuredClone(DEFAULT_DB.photos),
    };
  } catch {
    return structuredClone(DEFAULT_DB);
  }
}

function saveDb(db: DbSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf-8');
}

const sseClients = new Set<express.Response>();

function broadcastEvent(eventName: string, payload: unknown): void {
  const data = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // SSE stream for real-time lead registration alerts
  app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write('event: connected\ndata: {"ok":true}\n\n');

    sseClients.add(res);
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(keepAlive);
      sseClients.delete(res);
    });
  });

  app.get('/api/state', (_req, res) => {
    const db = ensureDb();
    res.json(db);
  });

  app.put('/api/project-info', (req, res) => {
    const { causeLabel, causeTitle, description } = req.body ?? {};
    if (typeof causeTitle !== 'string' || !causeTitle.trim() || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'El título y la descripción son obligatorios.' });
      return;
    }
    const db = ensureDb();
    db.projectInfo = {
      causeLabel: typeof causeLabel === 'string' && causeLabel.trim() ? causeLabel.trim() : db.projectInfo.causeLabel,
      causeTitle: causeTitle.trim(),
      description: description.trim(),
    };
    saveDb(db);
    res.json(db.projectInfo);
  });

  app.post('/api/leads', (req, res) => {
    const body = req.body ?? {};
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phoneRaw = typeof body.phone === 'string' ? body.phone.replace(/\D/g, '') : '';
    const district = typeof body.district === 'string' ? body.district.trim() : '';
    const source = typeof body.source === 'string' ? body.source.trim() : 'Facebook';
    const paymentMethod = typeof body.paymentMethod === 'string' ? body.paymentMethod.trim() : 'En cuotas';
    const purpose = typeof body.purpose === 'string' ? body.purpose.trim() : 'Vivienda';
    const consent = Boolean(body.consent);
    const status =
      body.status && ['Nuevo', 'Contactado', 'Visita', 'Separó', 'Compró'].includes(body.status)
        ? body.status
        : 'Nuevo';
    const notes = typeof body.notes === 'string' ? body.notes.trim() : '';

    if (!name) {
      res.status(400).json({ error: 'Ingresa el nombre completo.' });
      return;
    }
    if (!/^\d{9}$/.test(phoneRaw)) {
      res.status(400).json({ error: 'Ingresa un número de celular válido de 9 dígitos.' });
      return;
    }
    if (!district) {
      res.status(400).json({ error: 'Ingresa el distrito de procedencia.' });
      return;
    }
    if (!consent) {
      res.status(400).json({ error: 'Debe aceptar la autorización de contacto.' });
      return;
    }

    const newLead: LeadRecord = {
      id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      name,
      phone: phoneRaw,
      district,
      source,
      paymentMethod,
      purpose,
      consent,
      status,
      notes,
    };

    const db = ensureDb();
    db.leads.unshift(newLead);
    saveDb(db);

    broadcastEvent('lead_created', newLead);
    res.status(201).json(newLead);
  });

  app.patch('/api/leads/:id', (req, res) => {
    const { id } = req.params;
    const { status, notes, name, phone, district, source, paymentMethod, purpose } = req.body ?? {};
    const db = ensureDb();
    const index = db.leads.findIndex((item) => item.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Lead no encontrado.' });
      return;
    }

    const current = db.leads[index];
    const updated: LeadRecord = {
      ...current,
      status:
        status && ['Nuevo', 'Contactado', 'Visita', 'Separó', 'Compró'].includes(status)
          ? status
          : current.status,
      notes: typeof notes === 'string' ? notes : current.notes,
      name: typeof name === 'string' && name.trim() ? name.trim() : current.name,
      phone: typeof phone === 'string' && /^\d{9}$/.test(phone.replace(/\D/g, ''))
        ? phone.replace(/\D/g, '')
        : current.phone,
      district: typeof district === 'string' && district.trim() ? district.trim() : current.district,
      source: typeof source === 'string' && source.trim() ? source.trim() : current.source,
      paymentMethod:
        typeof paymentMethod === 'string' && paymentMethod.trim() ? paymentMethod.trim() : current.paymentMethod,
      purpose: typeof purpose === 'string' && purpose.trim() ? purpose.trim() : current.purpose,
    };

    db.leads[index] = updated;
    saveDb(db);
    broadcastEvent('lead_updated', updated);
    res.json(updated);
  });

  app.delete('/api/leads/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDb();
    const nextLeads = db.leads.filter((item) => item.id !== id);
    if (nextLeads.length === db.leads.length) {
      res.status(404).json({ error: 'Lead no encontrado.' });
      return;
    }
    db.leads = nextLeads;
    saveDb(db);
    broadcastEvent('lead_deleted', { id });
    res.json({ ok: true });
  });

  app.post('/api/tools', (req, res) => {
    const { title, description, items } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'El título y la descripción son obligatorios.' });
      return;
    }
    const db = ensureDb();
    const nextNumber = db.tools.length + 1;
    const newTool: StrategyToolRecord = {
      id: `tool-${Date.now()}`,
      label: `Herramienta ${nextNumber}`,
      title: title.trim(),
      description: description.trim(),
      items: Array.isArray(items) ? items.map((s) => String(s).trim()).filter(Boolean) : [],
    };
    db.tools.push(newTool);
    saveDb(db);
    res.status(201).json(db.tools);
  });

  app.put('/api/tools/:id', (req, res) => {
    const { id } = req.params;
    const { label, title, description, items } = req.body ?? {};
    if (typeof title !== 'string' || !title.trim() || typeof description !== 'string' || !description.trim()) {
      res.status(400).json({ error: 'El título y la descripción son obligatorios.' });
      return;
    }
    const db = ensureDb();
    const index = db.tools.findIndex((t) => t.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Herramienta no encontrada.' });
      return;
    }
    db.tools[index] = {
      ...db.tools[index],
      label: typeof label === 'string' && label.trim() ? label.trim() : db.tools[index].label,
      title: title.trim(),
      description: description.trim(),
      items: Array.isArray(items) ? items.map((s) => String(s).trim()).filter(Boolean) : [],
    };
    saveDb(db);
    res.json(db.tools);
  });

  app.delete('/api/tools/:id', (req, res) => {
    const { id } = req.params;
    const db = ensureDb();
    db.tools = db.tools
      .filter((t) => t.id !== id)
      .map((t, idx) => ({ ...t, label: `Herramienta ${idx + 1}` }));
    saveDb(db);
    res.json(db.tools);
  });

  app.post('/api/tools/reset', (_req, res) => {
    const db = ensureDb();
    db.tools = structuredClone(DEFAULT_DB.tools);
    saveDb(db);
    res.json(db.tools);
  });

  app.put('/api/photos/:id', (req, res) => {
    const { id } = req.params;
    const { src, alt, captionTitle, captionDetail } = req.body ?? {};
    const db = ensureDb();
    const index = db.photos.findIndex((p) => p.id === id);
    if (index === -1) {
      res.status(404).json({ error: 'Foto no encontrada.' });
      return;
    }
    const current = db.photos[index];
    db.photos[index] = {
      ...current,
      src: typeof src === 'string' && src.trim() ? src.trim() : current.src,
      alt: typeof alt === 'string' && alt.trim() ? alt.trim() : current.alt,
      captionTitle:
        typeof captionTitle === 'string' && captionTitle.trim()
          ? captionTitle.trim()
          : current.captionTitle,
      captionDetail:
        typeof captionDetail === 'string' && captionDetail.trim()
          ? captionDetail.trim()
          : current.captionDetail,
    };
    saveDb(db);
    res.json(db.photos);
  });

  app.post('/api/photos/reset', (_req, res) => {
    const db = ensureDb();
    db.photos = structuredClone(DEFAULT_DB.photos);
    saveDb(db);
    res.json(db.photos);
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
