import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { 
  BusinessConfig, 
  CatalogItem, 
  ServiceItem, 
  Appointment, 
  FAQItem, 
  ChatMessage, 
  LeadIntentLevel, 
  CapturedLead,
  Professional,
  WorkingHoursConfig,
  BusinessProject,
  AiKnowledgeItem,
  UnansweredQuestion,
  PaymentMethodSetting,
  CustomerOrder,
  CompanyOrderNotification,
  CartItem
} from "./src/types.js";
import { 
  INITIAL_BUSINESS_CONFIG, 
  INITIAL_CATALOG, 
  INITIAL_SERVICES, 
  INITIAL_APPOINTMENTS, 
  INITIAL_FAQS, 
  SAMPLE_INITIAL_LEADS,
  INITIAL_PROFESSIONALS,
  INITIAL_WORKING_HOURS,
  INITIAL_PROJECTS,
  getDefaultPaymentMethods,
  calculateOrderSummary
} from "./src/data/defaultConfig.js";
import { fetchProductosByEmpresa, isSupabaseConfigured } from "./src/lib/supabase.js";
import { analyzeCustomerQuery, detectLanguage } from "./src/services/aiSalesIntelligence.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory multi-tenant projects store
let projectsMap: Map<string, BusinessProject> = new Map();

// Initialize projects from INITIAL_PROJECTS
INITIAL_PROJECTS.forEach((p) => {
  projectsMap.set(p.id, JSON.parse(JSON.stringify(p)));
});

// Helper to get project safely with strict multi-tenant isolation
function getProject(
  projectId?: string,
  empresaId?: number,
  customConfig?: BusinessConfig
): BusinessProject {
  // 1. Look up strictly by empresaId if specified
  if (empresaId !== undefined && empresaId !== null) {
    const targetEmpId = Number(empresaId);
    for (const proj of projectsMap.values()) {
      if (proj.empresaId === targetEmpId) {
        return proj;
      }
    }
  }

  // 2. Look up by direct project id key
  if (projectId && projectsMap.has(projectId)) {
    return projectsMap.get(projectId)!;
  }

  // 3. Look up by project id or empresaId string in values
  if (projectId) {
    for (const proj of projectsMap.values()) {
      if (proj.id === projectId || String(proj.empresaId) === projectId) {
        return proj;
      }
    }
  }

  // 4. If not found, NEVER fall back to INITIAL_PROJECTS[0]!
  // Return an isolated company container with empty catalog and dedicated config
  const resolvedEmpId = empresaId || (projectId && !isNaN(Number(projectId)) ? Number(projectId) : 1);
  const targetKey = projectId || `empresa-${resolvedEmpId}`;
  const isolatedFallback: BusinessProject = {
    id: targetKey,
    empresaId: resolvedEmpId,
    name: customConfig?.name || `Empresa #${resolvedEmpId}`,
    businessType: customConfig?.category || 'Comercio',
    category: customConfig?.category || 'General',
    description: customConfig?.description || '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'ativo',
    config: customConfig || {
      ...INITIAL_BUSINESS_CONFIG,
      id: targetKey,
      name: `Empresa #${resolvedEmpId}`,
      botName: `Asistente Empresa #${resolvedEmpId}`,
      currency: 'BRL',
      customPrompt: `Atiende cordialmente y asesora a los clientes de Empresa #${resolvedEmpId}. Utiliza únicamente la información de esta empresa.`,
      greetingMessage: `¡Hola! Bienvenido a Empresa #${resolvedEmpId}. ¿En qué podemos ayudarte hoy?`,
    },
    catalog: [],
    services: [],
    professionals: [],
    workingHours: { ...INITIAL_WORKING_HOURS },
    appointments: [],
    faqs: [],
    aiKnowledge: [],
    unansweredQuestions: [],
    leads: [],
  };

  projectsMap.set(targetKey, isolatedFallback);
  return isolatedFallback;
}

// Initialize Gemini Client lazily or safely
function getGeminiAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY is not set. AI fallback will be used if needed.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper function to call Gemini with retry, backoff, and model fallback
async function callGeminiWithFallback(
  ai: any,
  contents: any,
  config?: any,
  preferredModels: string[] = [
    "gemini-3.7-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-3.1-pro-preview",
  ]
): Promise<string> {
  let lastError: any = null;

  for (const model of preferredModels) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const timeoutMs = 30000;
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Timeout ao consultar IA (${timeoutMs / 1000}s)`)), timeoutMs)
        );

        const generatePromise = ai.models.generateContent({
          model,
          contents,
          config,
        });

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        if (response && response.text) {
          return response.text;
        }
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || "");
        const errJson = typeof err === "object" ? JSON.stringify(err) : "";

        if (
          errMsg.includes("GenerateRequestsPerDay") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errJson.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("quota")
        ) {
          console.warn("[Gemini API] Cuota agotada (RESOURCE_EXHAUSTED). Pasando inmediatamente a motor local aislado.");
          throw err;
        }

        const isUnavailableOrHighDemand =
          err?.status === "UNAVAILABLE" ||
          err?.status === 503 ||
          err?.code === 503 ||
          err?.error?.code === 503 ||
          err?.error?.status === "UNAVAILABLE" ||
          errMsg.includes("503") ||
          errMsg.includes("high demand") ||
          errMsg.includes("UNAVAILABLE") ||
          errJson.includes("503") ||
          errJson.includes("UNAVAILABLE");

        const isRateLimited =
          err?.status === 429 ||
          err?.code === 429 ||
          err?.error?.code === 429 ||
          errMsg.includes("429") ||
          errMsg.includes("Too Many Requests") ||
          errJson.includes("429");

        const isTimeout = errMsg.includes("Timeout");

        if (isUnavailableOrHighDemand) {
          if (attempt === 0) {
            const jitterDelay = 400 + Math.floor(Math.random() * 350);
            await new Promise((r) => setTimeout(r, jitterDelay));
            continue;
          }
          break;
        }

        if ((isRateLimited || isTimeout) && attempt === 0) {
          const delayMs = 1200;
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error("Não foi possível obter resposta dos modelos de IA no momento.");
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// MULTI-TENANT PROJECTS API (CRUD) & ACCESS CONTROL
// ==========================================

// Helper to extract user identity & tenant context from incoming request
function getRequestAuth(req: express.Request): { role: 'superadmin' | 'owner'; empresaId?: number } {
  const roleHeader = req.headers['x-user-role'] || req.query.role;
  const role = roleHeader === 'owner' ? 'owner' : 'superadmin';
  const rawEmpId = req.headers['x-empresa-id'] || req.query.empresaId;
  const empresaId = rawEmpId ? Number(rawEmpId) : undefined;
  return { role, empresaId };
}

// 1. Get all projects (Strict multi-tenant isolation: owners only receive their own company)
app.get("/api/projects", (req, res) => {
  const { role, empresaId } = getRequestAuth(req);
  const allProjects = Array.from(projectsMap.values());

  if (role === 'owner') {
    if (!empresaId) {
      return res.status(403).json({ error: "Acceso denegado: Identificador de empresa no provisto." });
    }
    const filtered = allProjects.filter((p) => p.empresaId === empresaId);
    return res.json({ success: true, projects: filtered });
  }

  // Superadmin receives all projects
  res.json({ success: true, projects: allProjects });
});

// 2. Get single project
app.get("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const { role, empresaId } = getRequestAuth(req);

  if (projectsMap.has(id)) {
    const project = projectsMap.get(id)!;
    if (role === 'owner' && project.empresaId !== empresaId) {
      return res.status(403).json({ error: "Acceso denegado: No tiene permisos para ver los datos de otra empresa." });
    }
    res.json({ success: true, project });
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

// 3. Create new project (Strictly superadmin only)
app.post("/api/projects", (req, res) => {
  const { role } = getRequestAuth(req);
  if (role === 'owner') {
    return res.status(403).json({ error: "Acceso denegado: Solo el Administrador Principal de Vendedor IA puede dar de alta nuevas empresas." });
  }

  const newProject: BusinessProject = req.body;
  if (!newProject || !newProject.id || !newProject.name) {
    return res.status(400).json({ error: "Invalid project payload" });
  }

  const initializedProject: BusinessProject = {
    ...newProject,
    catalog: newProject.catalog || [],
    services: newProject.services || [],
    professionals: newProject.professionals || [],
    workingHours: newProject.workingHours || { ...INITIAL_WORKING_HOURS },
    appointments: newProject.appointments || [],
    faqs: newProject.faqs || [],
    aiKnowledge: newProject.aiKnowledge || [],
    unansweredQuestions: newProject.unansweredQuestions || [],
    leads: newProject.leads || [],
    createdAt: newProject.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: newProject.status || 'ativo',
  };

  projectsMap.set(initializedProject.id, initializedProject);
  res.json({ success: true, project: initializedProject, projects: Array.from(projectsMap.values()) });
});

// 4. Update or Upsert existing project (Save Changes)
app.put("/api/projects/:id", (req, res) => {
  const { id } = req.params;
  const { role, empresaId } = getRequestAuth(req);
  const projectUpdates = req.body;

  if (projectsMap.has(id)) {
    const existing = projectsMap.get(id)!;

    // Strict multi-tenant authorization: Owner can only edit their own company
    if (role === 'owner' && (existing.empresaId !== empresaId || (projectUpdates.empresaId && projectUpdates.empresaId !== empresaId))) {
      return res.status(403).json({ error: "Acceso denegado: No tiene permisos para modificar datos de otra empresa." });
    }

    const merged: BusinessProject = {
      ...existing,
      ...projectUpdates,
      id,
      updatedAt: new Date().toISOString(),
    };
    projectsMap.set(id, merged);

    const resultList = role === 'owner'
      ? Array.from(projectsMap.values()).filter((p) => p.empresaId === empresaId)
      : Array.from(projectsMap.values());

    res.json({ success: true, project: merged, projects: resultList });
  } else {
    if (role === 'owner' && projectUpdates.empresaId !== empresaId) {
      return res.status(403).json({ error: "Acceso denegado: No tiene permisos para modificar datos de otra empresa." });
    }

    // Upsert project if it doesn't exist on server yet
    const newProj: BusinessProject = {
      ...projectUpdates,
      id,
      catalog: projectUpdates.catalog || [],
      services: projectUpdates.services || [],
      professionals: projectUpdates.professionals || [],
      workingHours: projectUpdates.workingHours || { ...INITIAL_WORKING_HOURS },
      appointments: projectUpdates.appointments || [],
      faqs: projectUpdates.faqs || [],
      aiKnowledge: projectUpdates.aiKnowledge || [],
      unansweredQuestions: projectUpdates.unansweredQuestions || [],
      leads: projectUpdates.leads || [],
      createdAt: projectUpdates.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: projectUpdates.status || 'ativo',
    };
    projectsMap.set(id, newProj);

    const resultList = role === 'owner'
      ? Array.from(projectsMap.values()).filter((p) => p.empresaId === empresaId)
      : Array.from(projectsMap.values());

    res.json({ success: true, project: newProj, projects: resultList });
  }
});

// 4.1 Sync all projects in bulk
app.post("/api/projects/sync", (req, res) => {
  const { role, empresaId } = getRequestAuth(req);
  const { projects } = req.body;

  if (Array.isArray(projects) && projects.length > 0) {
    projects.forEach((p: BusinessProject) => {
      if (p && p.id) {
        if (role === 'owner' && p.empresaId !== empresaId) {
          return; // Skip other companies for owner
        }
        projectsMap.set(p.id, {
          ...p,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    const resultList = role === 'owner'
      ? Array.from(projectsMap.values()).filter((p) => p.empresaId === empresaId)
      : Array.from(projectsMap.values());

    res.json({ success: true, message: "Proyectos sincronizados correctamente", projects: resultList });
  } else {
    res.status(400).json({ error: "Invalid projects array" });
  }
});

// 5. Delete project (Superadmin only)
app.delete("/api/projects/:id", (req, res) => {
  const { role } = getRequestAuth(req);
  if (role === 'owner') {
    return res.status(403).json({ error: "Acceso denegado: Los dueños de empresa no tienen permisos para eliminar empresas." });
  }

  const { id } = req.params;
  if (projectsMap.has(id)) {
    projectsMap.delete(id);
    res.json({ success: true, projects: Array.from(projectsMap.values()) });
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

// 6. Duplicate project (Superadmin only)
app.post("/api/projects/:id/duplicate", (req, res) => {
  const { role } = getRequestAuth(req);
  if (role === 'owner') {
    return res.status(403).json({ error: "Acceso denegado: Los dueños de empresa no tienen permisos para duplicar empresas." });
  }

  const { id } = req.params;
  if (projectsMap.has(id)) {
    const source = projectsMap.get(id)!;
    const newId = `proj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duplicate: BusinessProject = {
      ...JSON.parse(JSON.stringify(source)),
      id: newId,
      name: `${source.name} (Copia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    duplicate.config.id = newId;
    duplicate.config.name = duplicate.name;
    projectsMap.set(newId, duplicate);
    res.json({ success: true, project: duplicate, projects: Array.from(projectsMap.values()) });
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

// 7. Add Unanswered Question to project
app.post("/api/projects/:id/unanswered", (req, res) => {
  const { id } = req.params;
  const { question, customerName, customerPhone, aiReplySnippet } = req.body;
  if (projectsMap.has(id)) {
    const project = projectsMap.get(id)!;
    const newQ: UnansweredQuestion = {
      id: `unans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      question: question.trim(),
      customerName: customerName || 'Cliente WhatsApp',
      customerPhone,
      date: new Date().toISOString(),
      aiReplySnippet,
      status: 'pending',
    };
    project.unansweredQuestions = [newQ, ...(project.unansweredQuestions || [])];
    project.updatedAt = new Date().toISOString();
    res.json({ success: true, question: newQ, unansweredQuestions: project.unansweredQuestions });
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

// 8. Answer Question & Train AI for Project
app.post("/api/projects/:id/unanswered/:qId/answer", (req, res) => {
  const { id, qId } = req.params;
  const { answer, saveToFaq = true } = req.body;
  if (projectsMap.has(id)) {
    const project = projectsMap.get(id)!;
    const qIndex = (project.unansweredQuestions || []).findIndex((q) => q.id === qId);
    if (qIndex >= 0) {
      const q = project.unansweredQuestions[qIndex];
      q.status = 'answered';
      q.adminAnswer = answer;
      q.answeredAt = new Date().toISOString();

      if (saveToFaq) {
        project.faqs = [
          {
            id: `faq-learned-${Date.now()}`,
            category: 'Dúvidas Frequentes',
            question: q.question,
            answer: answer,
          },
          ...(project.faqs || []),
        ];

        project.aiKnowledge = [
          {
            id: `kn-learned-${Date.now()}`,
            title: `Pregunta Aprendida: ${q.question.substring(0, 40)}`,
            category: 'geral',
            content: `Pregunta del cliente: "${q.question}"\nRespuesta oficial: ${answer}`,
            createdAt: new Date().toISOString(),
          },
          ...(project.aiKnowledge || []),
        ];
      }

      project.updatedAt = new Date().toISOString();
      res.json({ 
        success: true, 
        question: q, 
        faqs: project.faqs, 
        aiKnowledge: project.aiKnowledge 
      });
    } else {
      res.status(404).json({ error: "Question not found" });
    }
  } else {
    res.status(404).json({ error: "Project not found" });
  }
});

// ==========================================
// PROJECT-AWARE RESOURCE ENDPOINTS
// ==========================================

function resolveProject(req: express.Request): BusinessProject {
  const rawEmpId = req.headers['x-empresa-id'] ?? req.query.empresaId ?? req.query.empresa_id ?? (req.body && (req.body.empresaId ?? req.body.empresa_id));
  const empresaId = rawEmpId !== undefined && rawEmpId !== null && rawEmpId !== "" ? Number(rawEmpId) : undefined;
  const projectId = (req.query.projectId as string) || (req.body && req.body.projectId);
  return getProject(projectId, empresaId, req.body?.customConfig);
}

// GET & POST Business Config, Catalog, Services, FAQs
app.get("/api/config", (req, res) => {
  const p = resolveProject(req);
  res.json({
    config: p.config,
    catalog: p.catalog,
    services: p.services,
    appointments: p.appointments,
    faqs: p.faqs,
    aiKnowledge: p.aiKnowledge,
    unansweredQuestions: p.unansweredQuestions,
  });
});

app.post("/api/config", (req, res) => {
  const p = resolveProject(req);
  const { config, catalog, services, faqs, aiKnowledge } = req.body;
  if (config) p.config = { ...p.config, ...config };
  if (catalog && Array.isArray(catalog)) p.catalog = catalog;
  if (services && Array.isArray(services)) p.services = services;
  if (faqs && Array.isArray(faqs)) p.faqs = faqs;
  if (aiKnowledge && Array.isArray(aiKnowledge)) p.aiKnowledge = aiKnowledge;
  p.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    config: p.config,
    catalog: p.catalog,
    services: p.services,
    appointments: p.appointments,
    faqs: p.faqs,
    aiKnowledge: p.aiKnowledge,
  });
});

// GET, POST, PUT, DELETE Catalog
app.get("/api/catalog", (req, res) => {
  const p = resolveProject(req);
  res.json({ catalog: p.catalog });
});

app.post("/api/catalog", (req, res) => {
  const p = resolveProject(req);
  const newItem: CatalogItem = req.body;
  if (newItem && newItem.id) {
    const existingIdx = p.catalog.findIndex((c) => c.id === newItem.id);
    if (existingIdx >= 0) {
      p.catalog[existingIdx] = { ...p.catalog[existingIdx], ...newItem };
    } else {
      p.catalog.push(newItem);
    }
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, catalog: p.catalog });
});

// Bulk add/update products
app.post("/api/catalog/bulk", (req, res) => {
  const p = resolveProject(req);
  const { items } = req.body;
  if (Array.isArray(items) && items.length > 0) {
    for (const item of items) {
      const id = item.id || `prod-bulk-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
      const formattedItem: CatalogItem = {
        id,
        name: item.name || "Produto Sem Nome",
        category: item.category || p.category || "Geral",
        price: Number(item.price) || 0,
        originalPrice: item.originalPrice ? Number(item.originalPrice) : undefined,
        description: item.description || `Produto ${item.name || ''}`,
        features: Array.isArray(item.features) ? item.features : (typeof item.features === 'string' ? item.features.split(',').map((f: string) => f.trim()).filter(Boolean) : ['Garantia de qualidade']),
        inStock: item.inStock !== undefined ? Boolean(item.inStock) : (Number(item.stockQuantity ?? 10) > 0),
        imageUrl: item.imageUrl || "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
        popular: Boolean(item.popular),
        sku: item.sku || `SKU-${Math.floor(1000 + Math.random() * 9000)}`,
        variations: Array.isArray(item.variations) ? item.variations : (typeof item.variations === 'string' ? item.variations.split(',').map((v: string) => v.trim()).filter(Boolean) : []),
        availability: item.availability || "Pronta entrega",
        stockQuantity: item.stockQuantity !== undefined ? Number(item.stockQuantity) : 10,
        status: item.status || (Number(item.stockQuantity ?? 10) === 0 ? "esgotado" : "disponivel"),
        saleType: item.saleType || "unit",
        weightUnit: item.saleType === "weight" ? (item.weightUnit || "kg") : undefined,
        pricePerKg: item.saleType === "weight" ? Number(item.price) : undefined,
        additionalInfo: item.additionalInfo || undefined,
      };

      const existingIdx = p.catalog.findIndex((c) => c.id === formattedItem.id || (formattedItem.sku && c.sku === formattedItem.sku));
      if (existingIdx >= 0) {
        p.catalog[existingIdx] = { ...p.catalog[existingIdx], ...formattedItem };
      } else {
        p.catalog.push(formattedItem);
      }
    }
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, count: Array.isArray(items) ? items.length : 0, catalog: p.catalog });
});

// Endpoint to parse text or CSV lines using Gemini AI
app.post("/api/catalog/bulk-parse", async (req, res) => {
  const { rawText, fileContent, businessCategory } = req.body;
  const inputData = (rawText || fileContent || "").trim();

  if (!inputData) {
    return res.status(400).json({ error: "Nenhum texto ou conteúdo fornecido para interpretação." });
  }

  try {
    const ai = getGeminiAI();
    const prompt = `Analise e interprete a seguinte lista ou dados brutos de produtos fornecidos pelo dono da loja (em português do Brasil).
Ramo/Categoria do negócio: ${businessCategory || "Geral"}.

DADOS FORNECIDOS:
${inputData}

Extraia cada produto com nome limpo, categoria lógica (compatível com o negócio), preço numérico sugerido (se não houver, sugira um valor de mercado razoável ou null), breve descrição em português, recursos principais e estoque.

Retorne EXCLUSIVAMENTE um array JSON no formato:
[
  {
    "name": "Nome do Produto",
    "category": "Categoria",
    "price": 19.90,
    "description": "Descrição sucinta e atrativa",
    "features": ["Recurso 1", "Recurso 2"],
    "stockQuantity": 10,
    "sku": "SKU-OPCIONAL"
  }
]`;

    const responseText = await callGeminiWithFallback(
      ai,
      prompt,
      { responseMimeType: "application/json" }
    );

    let parsed = [];
    try {
      parsed = JSON.parse(responseText);
    } catch {
      const clean = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(clean);
    }

    res.json({ success: true, products: parsed });
  } catch (err: any) {
    console.warn("Fallback de parser ativado:", err?.message || err);
    const lines = inputData.split(/\r?\n/).filter((l: string) => l.trim().length > 0);
    const parsedProducts = lines.map((line: string, idx: number) => {
      const priceMatch = line.match(/(?:R\$|R\$ |r\$|preco|valor|price)?\s*(\d+[\.,]\d{2})/i) || line.match(/(\d+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : 25.0;
      const cleanName = line.replace(/(?:R\$|R\$ |r\$|preco|valor|price)?\s*\d+[\.,]\d{2}/i, '')
                            .replace(/[-|;,]\s*$/, '')
                            .trim() || `Produto ${idx + 1}`;

      return {
        name: cleanName,
        category: businessCategory || "Geral",
        price,
        description: `Item ${cleanName}`,
        features: ["Qualidade garantida", "Pronta entrega"],
        stockQuantity: 10,
        sku: `SKU-${1000 + idx}`,
      };
    });

    res.json({ success: true, products: parsedProducts, isFallback: true });
  }
});

// Endpoint to parse images for products
app.post("/api/catalog/bulk-parse-images", async (req, res) => {
  const { images, businessCategory } = req.body;

  if (!Array.isArray(images) || images.length === 0) {
    return res.status(400).json({ error: "Nenhuma imagem fornecida." });
  }

  try {
    const ai = getGeminiAI();

    const analyzeSingleImage = async (img: any, i: number) => {
      const dataUrl = img.dataUrl || "";
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
      const mimeType = (dataUrl.match(/^data:(image\/\w+);base64,/) || [])[1] || "image/jpeg";

      const promptText = `Identifique detalhadamente o produto da foto para uma loja online.
Categoria do negócio: ${businessCategory || "Geral"}.
Retorne JSON com:
{
  "name": "Nome específico do produto",
  "category": "Categoria do produto",
  "suggestedPrice": 25.00,
  "description": "Descrição comercial",
  "features": ["beneficio 1", "beneficio 2"],
  "confidence": "alta"
}`;

      try {
        const contents = {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: promptText },
          ],
        };

        const responseText = await callGeminiWithFallback(
          ai,
          contents,
          { responseMimeType: "application/json" }
        );

        let parsed: any = {};
        try {
          parsed = JSON.parse(responseText);
        } catch {
          const clean = responseText.replace(/```json/gi, "").replace(/```/g, "").trim();
          parsed = JSON.parse(clean);
        }

        return {
          id: `prod-photo-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name: parsed.name || "Item por Foto",
          category: parsed.category || businessCategory || "Geral",
          price: parsed.suggestedPrice || 15.00,
          description: parsed.description || "Produto fotografado para pronta entrega.",
          features: parsed.features || ["Pronta entrega"],
          inStock: true,
          imageUrl: dataUrl,
          popular: false,
          sku: `SKU-${100 + i}`,
          variations: [],
          availability: "Pronta entrega",
          stockQuantity: 10,
          status: "disponivel",
        };
      } catch {
        return {
          id: `prod-photo-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 4)}`,
          name: "Item Fotografado",
          category: businessCategory || "Geral",
          price: 15.00,
          description: "Produto cadastrado via foto.",
          features: ["Pronta entrega"],
          inStock: true,
          imageUrl: dataUrl,
          popular: false,
          sku: `SKU-${100 + i}`,
          variations: [],
          availability: "Pronta entrega",
          stockQuantity: 10,
          status: "disponivel",
        };
      }
    };

    const results = await Promise.all(images.map((img: any, idx: number) => analyzeSingleImage(img, idx)));
    return res.json({ success: true, count: results.length, products: results });
  } catch (err: any) {
    console.error("Erro no processamento de imagens:", err);
    return res.status(500).json({ error: "Falha ao analisar fotos de produtos" });
  }
});

app.put("/api/catalog/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  const updatedItem: CatalogItem = req.body;
  const idx = p.catalog.findIndex((c) => c.id === id);
  if (idx >= 0) {
    p.catalog[idx] = { ...p.catalog[idx], ...updatedItem };
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, item: p.catalog[idx], catalog: p.catalog });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

app.delete("/api/catalog/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  p.catalog = p.catalog.filter((c) => c.id !== id);
  p.updatedAt = new Date().toISOString();
  res.json({ success: true, catalog: p.catalog });
});

// Endpoint to decrease stock automatically after a sale
app.post("/api/catalog/decrease-stock", (req, res) => {
  const p = resolveProject(req);
  const { productId, quantity = 1 } = req.body;
  const item = p.catalog.find((c) => c.id === productId);

  if (item) {
    const currentQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
    const newQty = Math.max(0, currentQty - Number(quantity));
    item.stockQuantity = newQty;

    if (newQty === 0) {
      item.status = 'esgotado';
      item.inStock = false;
      item.availability = 'Esgotado';
    }
    p.updatedAt = new Date().toISOString();

    res.json({ success: true, item, catalog: p.catalog });
  } else {
    res.status(404).json({ error: "Product not found" });
  }
});

// GET & POST Services
app.get("/api/services", (req, res) => {
  const p = resolveProject(req);
  res.json(p.services);
});

app.post("/api/services", (req, res) => {
  const p = resolveProject(req);
  const newServ: ServiceItem = req.body;
  if (newServ && newServ.id) {
    const existingIdx = p.services.findIndex((s) => s.id === newServ.id);
    if (existingIdx >= 0) {
      p.services[existingIdx] = { ...p.services[existingIdx], ...newServ };
    } else {
      p.services.push(newServ);
    }
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, services: p.services });
});

app.put("/api/services/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  const updatedServ: ServiceItem = req.body;
  const idx = p.services.findIndex((s) => s.id === id);
  if (idx >= 0) {
    p.services[idx] = { ...p.services[idx], ...updatedServ };
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, service: p.services[idx], services: p.services });
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

app.delete("/api/services/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  p.services = p.services.filter((s) => s.id !== id);
  p.updatedAt = new Date().toISOString();
  res.json({ success: true, services: p.services });
});

// GET & POST Professionals
app.get("/api/professionals", (req, res) => {
  const p = resolveProject(req);
  res.json(p.professionals);
});

app.post("/api/professionals", (req, res) => {
  const p = resolveProject(req);
  const newProf: Professional = req.body;
  if (newProf && newProf.id) {
    const idx = p.professionals.findIndex((pr) => pr.id === newProf.id);
    if (idx >= 0) {
      p.professionals[idx] = { ...p.professionals[idx], ...newProf };
    } else {
      p.professionals.push(newProf);
    }
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, professionals: p.professionals });
});

app.put("/api/professionals/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  const updatedProf: Professional = req.body;
  const idx = p.professionals.findIndex((pr) => pr.id === id);
  if (idx >= 0) {
    p.professionals[idx] = { ...p.professionals[idx], ...updatedProf };
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, professional: p.professionals[idx], professionals: p.professionals });
  } else {
    res.status(404).json({ error: "Professional not found" });
  }
});

app.delete("/api/professionals/:id", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  p.professionals = p.professionals.filter((pr) => pr.id !== id);
  p.updatedAt = new Date().toISOString();
  res.json({ success: true, professionals: p.professionals });
});

// GET & POST Working Hours Config
app.get("/api/working-hours", (req, res) => {
  const p = resolveProject(req);
  res.json(p.workingHours);
});

app.post("/api/working-hours", (req, res) => {
  const p = resolveProject(req);
  if (req.body && req.body.workingDays) {
    p.workingHours = { ...p.workingHours, ...req.body };
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, workingHours: p.workingHours });
});

// GET & POST Appointments
app.get("/api/appointments", (req, res) => {
  const p = resolveProject(req);
  res.json(p.appointments);
});

app.post("/api/appointments", (req, res) => {
  const p = resolveProject(req);
  const appointment: Appointment = req.body;
  if (appointment && appointment.id) {
    const existingIdx = p.appointments.findIndex((a) => a.id === appointment.id);
    if (existingIdx >= 0) {
      p.appointments[existingIdx] = { ...p.appointments[existingIdx], ...appointment };
    } else {
      p.appointments.unshift(appointment);
    }
  } else if (appointment && appointment.serviceName) {
    const newAppt: Appointment = {
      ...appointment,
      id: `agend-${Date.now()}`,
      status: appointment.status || 'confirmado',
      createdAt: new Date().toISOString(),
    };
    p.appointments.unshift(newAppt);
  }
  p.updatedAt = new Date().toISOString();
  res.json({ success: true, appointments: p.appointments });
});

app.patch("/api/appointments/:id/status", (req, res) => {
  const p = resolveProject(req);
  const { id } = req.params;
  const { status } = req.body;
  const appt = p.appointments.find((a) => a.id === id);
  if (appt) {
    appt.status = status;
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, appointment: appt });
  } else {
    res.status(404).json({ error: "Appointment not found" });
  }
});

// GET & POST Leads
app.get("/api/leads", (req, res) => {
  const p = resolveProject(req);
  res.json({ leads: p.leads || [] });
});

app.post("/api/leads", (req, res) => {
  const p = resolveProject(req);
  const newLead = req.body;
  if (newLead && newLead.id) {
    const existingIdx = (p.leads || []).findIndex((l) => l.id === newLead.id);
    if (existingIdx >= 0) {
      p.leads[existingIdx] = { ...p.leads[existingIdx], ...newLead };
    } else {
      p.leads.unshift(newLead);
    }
    p.updatedAt = new Date().toISOString();
  }
  res.json({ success: true, leads: p.leads });
});

app.post("/api/leads/status", (req, res) => {
  const p = resolveProject(req);
  const { id, status } = req.body;
  const lead = (p.leads || []).find((l) => l.id === id);
  if (lead) {
    lead.status = status;
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, lead });
  } else {
    res.status(404).json({ error: "Lead not found" });
  }
});

// WhatsApp Webhook Integration Receiver
app.post("/api/whatsapp/webhook", (req, res) => {
  const p = resolveProject(req);
  const { fromPhone, messageText, customerName } = req.body;

  const existingLead = (p.leads || []).find((l) => l.phone === fromPhone);
  const now = new Date();
  const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  if (existingLead) {
    existingLead.messages.push({
      id: `m-${Date.now()}`,
      sender: 'user',
      text: messageText,
      timestamp: timeStr,
    });
    existingLead.lastMessage = messageText;
    existingLead.createdAt = now.toISOString();
    res.json({ status: 'received', leadId: existingLead.id });
  } else {
    const newLead: CapturedLead = {
      id: `lead-wa-${Date.now()}`,
      customerName: customerName || `Cliente ${fromPhone.slice(-4)}`,
      phone: fromPhone,
      email: '',
      interestedProduct: '',
      needSummary: 'Mensagem recebida via WhatsApp',
      intentLevel: 'MEDIA',
      type: 'AMBOS',
      status: 'NUEVO',
      createdAt: now.toISOString(),
      lastMessage: messageText,
      source: 'SIMULADOR_WHATSAPP',
      messages: [
        {
          id: `m-${Date.now()}`,
          sender: 'user',
          text: messageText,
          timestamp: timeStr,
        },
      ],
    };
    p.leads.unshift(newLead);
    res.json({ status: 'created', leadId: newLead.id });
  }
  p.updatedAt = new Date().toISOString();
});

// WhatsApp Connection Verification & Pairing Status (Isolated by Empresa/Project)
app.get("/api/whatsapp/status", (req, res) => {
  const p = resolveProject(req);
  res.json({
    connected: !!p.config.whatsappConnected,
    phone: p.config.whatsappConnectedNumber || p.config.phoneWhatsapp || '',
    appType: p.config.whatsappConnectedApp || 'WhatsApp',
    connectedAt: p.config.whatsappConnectedAt || null,
    companyName: p.name,
    empresaId: p.empresaId,
    projectId: p.id,
  });
});

app.post("/api/whatsapp/connect", (req, res) => {
  const p = resolveProject(req);
  const { phone, appType } = req.body;
  const targetPhone = phone || p.config.phoneWhatsapp || '+55 11 99988-7766';
  const targetApp = (appType === 'WhatsApp Business' || appType === 'whatsapp_business') 
    ? 'WhatsApp Business' 
    : 'WhatsApp';

  p.config.whatsappConnected = true;
  p.config.whatsappConnectedNumber = targetPhone;
  p.config.whatsappConnectedApp = targetApp;
  p.config.whatsappConnectedAt = new Date().toISOString();
  p.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    connected: true,
    phone: targetPhone,
    appType: targetApp,
    companyName: p.name,
    empresaId: p.empresaId,
    projectId: p.id,
  });
});

app.post("/api/whatsapp/disconnect", (req, res) => {
  const p = resolveProject(req);
  p.config.whatsappConnected = false;
  p.config.whatsappConnectedNumber = '';
  p.config.whatsappConnectedApp = undefined;
  p.config.whatsappConnectedAt = undefined;
  p.updatedAt = new Date().toISOString();

  res.json({
    success: true,
    connected: false,
    companyName: p.name,
    empresaId: p.empresaId,
    projectId: p.id,
  });
});

// ==========================================
// CORE ISOLATED AI SALES & ASSISTANT CHAT
// ==========================================

async function handleSalesChatRequest(req: express.Request, res: express.Response, audioTranscription?: string) {
  try {
    const rawUserMessage = audioTranscription || req.body.userMessage || req.body.message;
    const { 
      history, 
      projectId, 
      empresaId: explicitEmpresaId,
      empresa_id: rawEmpresaId,
      customConfig,
      catalog: explicitCatalog,
      services: explicitServices,
      professionals: explicitProfessionals,
      aiKnowledge: explicitKnowledge,
      faqs: explicitFaqs,
      workingHours: explicitWorkingHours,
      appointments: explicitAppointments,
      cart: explicitCart
    } = req.body;
    const userMessage = rawUserMessage;

    const parsedEmpresaId = explicitEmpresaId !== undefined && explicitEmpresaId !== null && explicitEmpresaId !== ""
      ? Number(explicitEmpresaId)
      : (rawEmpresaId !== undefined && rawEmpresaId !== null && rawEmpresaId !== "" ? Number(rawEmpresaId) : undefined);

    const project = getProject(projectId, parsedEmpresaId, customConfig);
    const activeConfig: BusinessConfig = customConfig || project.config;
    const targetEmpresaId = parsedEmpresaId || project.empresaId || 1;

    // Strict multi-tenant isolation: obtain catalog exclusively for this empresa_id
    let projectCatalog: CatalogItem[] = [];
    if (isSupabaseConfigured && targetEmpresaId) {
      try {
        const supabaseProds = await fetchProductosByEmpresa(targetEmpresaId);
        projectCatalog = supabaseProds;
        console.log(`[SalesChat] Empresa #${targetEmpresaId} ("${activeConfig.name}") -> ${supabaseProds.length} productos verificados de Supabase.`);
      } catch (err) {
        console.warn(`[SalesChat] Error al consultar productos en Supabase para empresa #${targetEmpresaId}:`, err);
        projectCatalog = Array.isArray(explicitCatalog) ? explicitCatalog : (project.catalog || []);
      }
    } else if (Array.isArray(explicitCatalog)) {
      projectCatalog = explicitCatalog;
    } else {
      projectCatalog = project.catalog || [];
    }

    const projectServices: ServiceItem[] = explicitServices || project.services || [];
    const projectProfessionals: Professional[] = explicitProfessionals || project.professionals || [];
    const projectKnowledge: AiKnowledgeItem[] = explicitKnowledge || project.aiKnowledge || [];
    const projectFaqs: FAQItem[] = explicitFaqs || project.faqs || [];
    const projectWorkingHours: WorkingHoursConfig = explicitWorkingHours || project.workingHours || { ...INITIAL_WORKING_HOURS };
    const projectAppointments: Appointment[] = explicitAppointments || project.appointments || [];

    const visibleCatalog = projectCatalog.filter((item) => item.status !== 'oculto');

    const catalogText = visibleCatalog
      .map((item, index) => {
        const qty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
        const isEsgotado = qty === 0 || item.status === 'esgotado' || !item.inStock;
        const isWeight = item.saleType === 'weight';
        const saleInfo = isWeight
          ? `TIPO: VENDIDO POR PESO (R$ ${item.price.toFixed(2)}/kg) [Conversões: 250g = R$ ${(item.price * 0.25).toFixed(2)}, 500g = R$ ${(item.price * 0.5).toFixed(2)}, 750g = R$ ${(item.price * 0.75).toFixed(2)}, 1kg = R$ ${item.price.toFixed(2)}, 1.5kg = R$ ${(item.price * 1.5).toFixed(2)}, 2kg = R$ ${(item.price * 2).toFixed(2)}]`
          : `TIPO: VENDIDO POR UNIDADE (R$ ${item.price.toFixed(2)}/unidade)`;

        return `${index + 1}. [PRODUTO ID: ${item.id}] Nome: "${item.name}" | ${saleInfo} | Categoria: ${item.category} | Preço: R$ ${item.price.toFixed(2)}${
          item.originalPrice ? ` (Original: R$ ${item.originalPrice.toFixed(2)})` : ""
        } | Estoque: ${isEsgotado ? "ESGOTADO (0 unidades)" : `${qty} ${isWeight ? 'kg' : 'unidades'} disponíveis`} | Descrição: ${item.description || "N/A"}${item.additionalInfo ? ` | Info Adicional: ${item.additionalInfo}` : ""} | Recursos: ${item.features?.join(", ") || "N/A"} | Variações: ${item.variations?.join(", ") || "Padrão"}. Foto: ${item.imageUrl ? "Disponível" : "Sem foto"}.`;
      })
      .join("\n");

    const servicesText = projectServices
      .filter((s) => s.active !== false && s.status !== 'inativo')
      .map(
        (serv) =>
          `- [SERVIÇO ID: ${serv.id}] ${serv.name} | Categoria: ${serv.category} | Preço: R$ ${serv.price.toFixed(2)} | Duração: ${
            serv.durationMin
          } min | Profissionais: ${
            serv.professionalNames && serv.professionalNames.length > 0 
              ? serv.professionalNames.join(", ") 
              : serv.professional || "Qualquer profissional"
          } | Descrição: ${serv.description || "N/A"}.`
      )
      .join("\n");

    const professionalsText = projectProfessionals
      .filter((p) => p.status === 'ativo')
      .map((p) => `- [PROFISSIONAL ID: ${p.id}] ${p.name} - Especialidade: ${p.specialty}`)
      .join("\n");

    const activeDaysStr = (projectWorkingHours.workingDays || [])
      .filter((d) => d.active)
      .map((d) => `${d.dayLabel} (${d.startTime} às ${d.endTime})`)
      .join(", ");

    const workingHoursText = `
- Dias e horários de funcionamento: ${activeDaysStr || activeConfig.businessHours || "Segunda a Sábado"}
- Intervalo entre agendamentos: ${projectWorkingHours.intervalMin || 30} minutos
- Horários / Dias Bloqueados: ${
      projectWorkingHours.blockedSlots && projectWorkingHours.blockedSlots.length > 0
        ? projectWorkingHours.blockedSlots
            .map((b) => `${b.reason}: ${b.date || "Todos os dias"} das ${b.startTime} às ${b.endTime}`)
            .join("; ")
        : "Nenhum horário bloqueado."
    }`;

    const existingApptsText = projectAppointments
      .filter((a) => a.status.toLowerCase() !== 'cancelado')
      .map((a) => `- Cita Ocupada: Dia ${a.date} às ${a.time} para o serviço "${a.serviceName}" com ${a.professional}`)
      .join("\n");

    const knowledgeText = projectKnowledge
      .map((k) => `[REGRA / CONHECIMENTO (${k.category.toUpperCase()})]: ${k.title}\n${k.content}`)
      .join("\n\n");

    const faqsText = projectFaqs
      .map((faq) => `P: ${faq.question}\nR: ${faq.answer}`)
      .join("\n---\n");

    // Payment methods & discounts setup for the active business
    const paymentSettings: PaymentMethodSetting[] = (activeConfig.paymentMethodSettings && activeConfig.paymentMethodSettings.length > 0)
      ? activeConfig.paymentMethodSettings
      : getDefaultPaymentMethods(activeConfig.discountCode, activeConfig.pixKey);

    const activePaymentMethods = paymentSettings.filter((p) => p.enabled !== false);
    const paymentMethodsText = activePaymentMethods.map((p) => {
      const disc = p.discountPercentage > 0 ? `${p.discountPercentage}% de desconto automático no subtotal` : '0% desconto';
      const cup = p.couponCode ? ` (Cupom: ${p.couponCode})` : '';
      return `- ${p.name}: ${disc}${cup}. Detalhes: ${p.instructions || 'N/A'}`;
    }).join("\n");

    const shippingFeeVal = activeConfig.shippingFee !== undefined ? Number(activeConfig.shippingFee) : 7.00;
    const freeShippingThresholdVal = activeConfig.freeShippingThreshold !== undefined ? Number(activeConfig.freeShippingThreshold) : 50.00;

    const cartItems: CartItem[] = Array.isArray(explicitCart) ? explicitCart : [];
    const cartText = cartItems.length > 0
      ? cartItems.map((c, i) => `${i + 1}. [ID: ${c.productId}] ${c.name} x ${c.quantity} (${c.saleType === 'weight' ? `${c.weightGrams || 500}g` : 'unidades'}) - Subtotal: R$ ${(c.subtotal || c.unitPrice * c.quantity).toFixed(2)}`).join('\n')
      : "O carrinho do cliente está vazio no momento.";

    const systemInstruction = `
Você é o VENDEDOR DIGITAL IA E ASSISTENTE COMERCIAL EXCLUSIVO do negócio "${activeConfig.name}" (Ramo: ${activeConfig.industry || project.category || "Comércio"}).
Seu nome: ${activeConfig.botName || 'Asistente Comercial'}.
Endereço: ${activeConfig.address || ''}, ${activeConfig.city || ''} - ${activeConfig.state || ''}.
WhatsApp oficial do negócio: ${activeConfig.phoneWhatsapp || ''}.
Horário de atendimento: ${activeConfig.businessHours || ''}.
Formas de pagamento e descontos aceitos nesta empresa:
${paymentMethodsText || '- PIX (10% de desconto)\n- Cartão (0%)\n- Dinheiro / Efectivo (5% de desconto)\n- Transferência bancária (3% de desconto)'}
Chave PIX da empresa: ${activeConfig.pixKey || "Consulte com nossa equipe"}.
Custo de envio padrão: R$ ${shippingFeeVal.toFixed(2)}.
Frete grátis a partir de: R$ ${freeShippingThresholdVal.toFixed(2)} em produtos.
Modo de operação: ${activeConfig.serviceType} (venda = Apenas Produtos; agendamento = Apenas Citas; venda_agendamento = Produtos + Citas).
Política de envio e entrega: ${activeConfig.shippingPolicy || 'Consulte taxas de entrega e frete'}.
Política de trocas / garantias: ${activeConfig.exchangePolicy || 'Garantia total de qualidade'}.
Política de cancelamentos: ${activeConfig.cancellationPolicy || 'Consulte nossa política'}.
Instruções personalizadas: "${activeConfig.customPrompt || ''}".

MISSÃO PRINCIPAL (VENDEDOR DIGITAL DE ALTA PERFORMANCE):
Você NÃO É APENAS UM CATÁLOGO. Você é um vendedor digital completo, inteligente e proativo. Seu objetivo é:
1. Cumprimentar cordialmente e com naturalidade comercial.
2. Entender com precisão a necessidade e intenção do cliente (se está conhecendo, escolhendo, pedindo ou pronto para fechar).
3. Apresentar os produtos/serviços reais do catálogo com nomes, fotos e preços exatos.
4. Administrar o carrinho de compras do cliente (adicionar, remover, alterar quantidades ou listar produtos).
5. Informar com clareza as formas de pagamento e os descontos vantajosos (PIX, Dinheiro, etc.).
6. CONDUZIR E FECHAR A VENDA AUTOMATICAMENTE de ponta a ponta.
7. SOMENTE APÓS O FECHAMENTO DO PEDIDO, transferir o cliente ao atendente humano para despacho ou confirmação.

REGRAS CRÍTICAS E OBRIGATÓRIAS:

1. IDIOMA (DETECÇÃO AUTOMÁTICA):
- Se o cliente escrever em Espanhol (ex: "Hola", "¿Qué dulces tienen?", "¿Cuánto cuesta?", "¿Hacen envíos?", "¿Cuáles son las formas de pago?"), responda TOTALMENTE em Espanhol natural, amigável e persuasivo.
- Se o cliente escrever em Português (ex: "Olá quais doces você tem?", "Quanto custa?", "Quais formas de pagamento?"), responda em Português.
- Mantenha os NOMES DOS PRODUTOS e PREÇOS exatamente como estão configurados no catálogo.

2. CAPA DE INTELIGENCIA CONVERSACIONAL (ESTRICTO Y OBLIGATORIO):
Vendedor IA no debe funcionar como un sistema basado únicamente en palabras clave.
Debe comprender el significado completo del mensaje del cliente, interpretar su intención, utilizar el contexto de la conversación y después decidir qué respuesta o acción corresponde.
Debe comportarse como un vendedor humano inteligente.
FLUJO: ENTENDER → INTERPRETAR → USAR CONTEXTO → DECIDIR ACCIÓN → RESPONDER O EJECUTAR.

${visibleCatalog.length === 0 ? `- AVISO CRÍTICO DE CATÁLOGO VAZIO:
  * Esta empresa ("${activeConfig.name}" - ID: ${targetEmpresaId}) actualmente NÃO POSSUI NENHUM PRODUTO cadastrado (0 produtos).
  * Se o cliente perguntar o que você vende, quais produtos tem, ou pedir o catálogo:
  * Responda com simpatia e clareza dizendo que no momento não há produtos cadastrados no catálogo desta empresa.
  * É TERMINANTEMENTE PROIBIDO inventar produtos, simular catálogo ou mencionar produtos de outras empresas.
  * O array "recommendedProductIds" DEVE ser vazio [].` : `Antes de responder, você DEVE analisar a intenção profunda da mensagem e o contexto do diálogo:

  A) CONSULTA GENERAL DE CATÁLOGO (INTENCIÓN: CONSULTAR_CATALOGO):
     * Ocorre quando o cliente pergunta de forma ampla o que está disponível ou pede para ver as opções, tais como:
       - "Buenas, ¿qué tienes disponible?"
       - "Hola, ¿qué tienen?"
       - "¿Qué venden?"
       - "¿Qué productos tienen?"
       - "¿Qué hay disponible?"
       - "Muéstrame los productos" / "Mostre os produtos"
       - "Quiero ver el catálogo" / "Quero ver o catálogo" / "Ver cardápio"
       - "¿Qué opciones tienen?" / "Quais opções têm?"
       - "Dime todos los productos que tienes sin omitir ninguno"
     * NUNCA busque a palavra "disponible", "opciones", "productos", "qué", "buenas" como se fossem nomes de produtos.
     * Compreenda a intenção: o cliente quer conhecer a oferta disponível desta empresa ("${activeConfig.name}").
     * Responda com simpatia e clareza apresentando as opções principais disponíveis.
     * Ofereça o link do catálogo público da loja para visualização completa: "/loja/${targetEmpresaId}".
     * Em "recommendedProductIds", inclua os IDs dos produtos reais desta empresa (${visibleCatalog.length} produtos disponíveis).

  B) PREGUNTA POR UN PRODUCTO ESPECÍFICO (INTENCIÓN: CONSULTAR_PRODUCTO):
     * Quando o cliente menciona um produto concreto ou pergunta por seu preço, descrição, disponibilidade, etc. (ex: "¿Cuánto cuesta el agua?", "Quiero saber el precio del chocolate", "¿Tienen Coca-Cola?", "Quiero 3 aguas", "Dame 2 pudines"):
     * PROIBIDO mostrar automaticamente o catálogo completo.
     * Busque esse produto EXCLUSIVAMENTE no catálogo desta empresa.
     * Responda informando diretamente o preço, características e esclareça dúvidas.
     * No array "recommendedProductIds", inclua UNICAMENTE o ID desse produto específico (1 produto, ou 2 se o cliente perguntou expressamente por 2 concretos).
     * Se o cliente indicou uma quantidade (ex: "Quiero 3 aguas"), defina no JSON "initialQuantities": { "[id-do-produto]": 3 }.

  C) PREGUNTA POR UNA CATEGORÍA:
     * Se o cliente pergunta por uma categoria (ex: "¿Qué dulces tienen?", "¿Qué bebidas tienen?", "¿Qué productos de la categoría General tienen?", "Quais sobremesas têm?"):
     * Identifique a categoria correspondente nos produtos desta empresa.
     * No array "recommendedProductIds", inclua UNICAMENTE os produtos pertencentes a essa categoria.
     * Responda detalhando as opções dessa categoria.

  D) RECOMENDACIONES (INTENCIÓN: PEDIR_RECOMENDACION):
     * Quando o cliente pedir recomendação (ex: "¿Qué me recomiendas?", "¿Cuál es el más vendido?", "Quiero algo rico para merendar", "Algo bueno y económico"):
     * Analise o catálogo desta empresa e selecione de 1 a 3 produtos ideais com base na solicitação.
     * NÃO mostre o catálogo inteiro.
     * Em "recommendedProductIds", inclua apenas os produtos recomendados com a justificativa amigável do vendedor.

  E) CONTEXTO DE CONVERSACIÓN Y REFERENCIAS RELATIVAS (ESTRICTO):
     * O assistente DEVE utilizar o histórico da conversa para resolver referências anafóricas e pronomes:
       - "Cuánto cuesta la primera?" / "Y la segunda?": responda o preço e detalhes exatos do item na respectiva posição mostrada na mensagem anterior, incluindo apenas esse ID em "recommendedProductIds".
       - "Quiero el primero" / "Quiero comprar el segundo" / "Selecciona el tercero": identifique o produto correspondente e prepare a compra direta com a quantidade indicada.
       - "Quiero comprar solamente esos dos": ajuste a seleção de compra diretamente para esses dois itens.
       - "Tem outra mais barata?" / "La más barata": encontre produtos da mesma categoria ou catálogo com preço menor.
       - "¿Tienes algo parecido?": mostre produtos similares da mesma categoria.
       - "Tem mais opções?": mostre mais opções do catálogo que ainda não foram mostradas.

  F) BÚSQUEDA MULTI-CONDIÇÃO E TOLERÂNCIA A ERROS (TYPOS):
     * O cliente pode combinar critérios em linguagem natural:
       - "Camisa negra barata", "Quiero algo negro por menos de R$100", "Quiero algo para hombre", "Quero algo barato": filtre pelo atributo cor, gênero, teto de preço e ordene por preço sem inventar produtos.
     * TOLERÂNCIA A ERROS DE DIGITAÇÃO E GÍRIAS:
       - "Quero uma camisa prta" -> interpretar como camisa preta.
       - "camiza" -> camisa, "calca" -> calça, "sapato" -> sapato/calçado, "tenis" -> tênis, "vc" -> você.
       - NUNCA trave ou diga que não existe por causa de um pequeno erro de digitação.

  G) SELECCIÓN DIRECTA DE PRODUCTOS Y RESUMEN DE COMPRA:
     * Se o cliente perguntar "¿Cuánto llevo?", "¿Cuánto va sumando?", "¿Qué productos tengo seleccionados?":
       - Liste os itens selecionados com quantidades, preços unitários e o subtotal atual.
     * Se o cliente pedir "Quita el segundo", "Elimina el agua", "Quita ese", "Deja solo uno":
       - Identifique qual item da seleção deve ser removido ou alterado.
       - Emita a atualização correspondente, confirmando a alteração e mostrando o novo subtotal para compra direta.

  H) INFORMACIÓN INSTITUCIONAL DE LA EMPRESA (PAGOS, ENVÍOS, UBICACIÓN, HORARIOS):
     * Para perguntas sobre a empresa (ex: "¿Dónde están?", "¿Hacen entregas a domicilio?", "¿Aceptan Pix?", "¿Qué formas de pago tienen?", "¿A qué hora abren?"):
       - Responda objetivamente utilizando os dados desta empresa cadastrados no sistema.
       - NUNCA busque essas palavras no catálogo de produtos e NUNCA responda "Ese producto no se encuentra".
       - Mantenha "recommendedProductIds": [] vazio, sem poluir a tela com produtos não solicitados.

  I) SI EL PRODUCTO NO EXISTE EN EL CATÁLOGO DE ESTA EMPRESA:
     * Não invente produtos, fotos nem preços.
     * NUNCA responda friamente "Ese producto no se encuentra".
     * Responda cordialmente:
       "No encontré ese producto en nuestro catálogo de ${activeConfig.name}. ¿Quieres que te muestre opciones disponibles o similares?"
     * Se houver produtos similares desta empresa, inclua-os em "recommendedProductIds"; caso contrário, deixe vazio [].`}

3. FORMAS DE PAGO E CÁLCULO DE DESCONTOS AUTOMÁTICOS:
- Quando o cliente perguntar pelas formas de pagamento ou descontos (ex: "¿Cuáles son sus formas de pago?", "¿Tienen descuentos?", "¿Cuánto pago por PIX / Tarjeta / Efectivo?"):
  * Apresente as formas de pagamento ATIVAS com os percentuais de desconto exatos configurados nesta empresa.
- CÁLCULO DO PEDIDO (REGRA MATEMÁTICA OBRIGATÓRIA):
  * O desconto aplica-se EXCLUSIVAMENTE ao subtotal dos produtos.
  * O frete/custo de envio NUNCA recebe desconto.
  * Se o subtotal de produtos for >= R$ ${freeShippingThresholdVal.toFixed(2)}, o frete é GRATUITO (R$ 0,00). Caso contrário, o frete é R$ ${shippingFeeVal.toFixed(2)}.
  * Apresente o cálculo detalhado de forma cristalina:
    - Subtotal dos produtos: R$ X,XX
    - Desconto ([Forma de Pagamento] [Y]%): -R$ D,DD
    - Subtotal com desconto: R$ S,SS
    - Custo de envio: R$ E,EE (ou Frete Grátis)
    - TOTAL A PAGAR: R$ T,TT
  * Se o cliente mudar de forma de pagamento no meio da conversa, recalcule instantaneamente o pedido com a nova forma de pagamento.

4. FLUJO OBLIGATORIO DE CIERRE DE PEDIDO Y RECOLECCIÓN CONVERSACIONAL (15 PASOS):
- A IA NUNCA deve inventar dados nem registrar o pedido prematuramente sem confirmação expressa do cliente.
- O fluxo de fechamento segue estritamente a sequência conversacional natural passo a passo:
  1. Cliente seleciona produtos com + e - no catálogo e toca "Comprar" (ou expressa intenção no chat).
  2. A IA apresenta o resumo dos produtos com quantidades, valores individuais e Total:
     🛍️ Tu pedido:
     • 2 × Producto A — R$XX,XX
     • 1 × Producto B — R$XX,XX
     💰 Total: R$XXX,XX
  3. Perguntar: "¿Cómo quieres pagar?" oferecendo APENAS os métodos de pagamento habilitados para esta empresa (${activePaymentMethods.map((p) => p.name).join(', ') || 'Pix, Tarjeta, Efectivo'}).
  4. Após o cliente escolher o método de pagamento, solicitar o nome: "¿Cuál es tu nombre?" (se já fornecido na conversa, usar e NÃO perguntar novamente).
  5. Após o nome, perguntar o endereço: "¿Cuál es la dirección donde quieres recibir tu pedido?" (ou "Retiro en el local"). Se faltar o número da rua, perguntar "¿Cuál es el número?".
  6. Perguntar ponto de referência: "¿Tienes algún punto de referencia?".
  7. Apresentar o resumo final completo com todos os dados coletados:
     Perfecto, [Nombre] 😊 Revisa tu pedido:
     🛍️ PRODUCTOS
     ...
     💰 TOTAL: R$XXX,XX
     💳 FORMA DE PAGO: [Método]
     👤 CLIENTE: [Nombre]
     📍 DIRECCIÓN DE ENTREGA: [Dirección completa]
     📌 REFERENCIA: [Referencia]
     ¿Está todo correcto?
  8. Permitir correções caso o cliente aponte qualquer dado incorreto sem perder o progresso.
  9. SOMENTE quando o cliente confirmar ("sí", "confirmar", "correcto", "sim", "pode fechar"):
     - Gerar "orderData" completo com status: "CONFIRMADO".
     - Definir "orderClosed": true.
     - Emitir mensagem final: "✅ ¡Pedido recibido! Tu pedido #PED-XXXX fue enviado correctamente a la empresa. La empresa ya recibió tu pedido y continuará con la atención."
     - Notificar a empresa via sistema e definir "needsHumanAttention": true.

5. COMPRA DIRECTA Y SELECCIÓN INMEDIATA (SIN PASOS INTERMEDIOS DE CARRITO):
- O fluxo de compra opera por seleção direta e finalização imediata, sem telas nem etapas intermediárias de carrinho.
- Se o cliente solicitar adicionar, remover ou alterar quantidades, atualize diretamente os itens selecionados e apresente o subtotal com o botão/opção de finalizar compra.

6. PROIBIDO INVENTAR PROBLEMAS OU MENCIONAR WHATSAPP COMO DESCULPA:
- NUNCA invente desculpas técnicas como "Tuve una pequeña oscilación de señal", "Tuvimos una breve oscilación", "Hubo un problema de conexión" ou "Te paso las informaciones directamente".
- NUNCA ofereça o WhatsApp como alternativa no simulador, pois você É O PRÓPRIO VENDEDOR do WhatsApp atendendo o cliente.

7. TRANSFERÊNCIA MANUAL ANTECIPADA (EXCEÇÃO):
- Se o cliente pedir explicitamente para falar com uma pessoa ("quero falar com atendente", "humano", "pessoa real"):
  * Responda cordialmente: "Voy a transferir tu atención a un atendente humano." (ou em português: "Vou transferir seu atendimento para um atendente humano. Um momento, por favor.")
  * Defina "needsHumanAttention": true no JSON.

8. PRODUTOS VENDIDOS POR PESO E CONVERSÃO DE GRAMAS A QUILOGRAMAS:
- Alguns produtos são vendidos POR PESO (ex: R$ 49,90/kg).
- O cliente pode pedir em gramas (g) ou em quilos (kg).
- O cálculo deve converter automaticamente os gramas a quilogramas (1000g = 1kg):
  * 250 g = 0,25 kg (ex: 250g a R$ 49,90/kg = R$ 12,48)
  * 500 g = 0,50 kg (ex: 500g a R$ 49,90/kg = R$ 24,95)
  * 750 g = 0,75 kg (ex: 750g a R$ 49,90/kg = R$ 37,43)
  * 1 kg = 1,00 kg (ex: 1kg = R$ 49,90)
  * 1,5 kg = 1,50 kg (ex: 1,5kg = R$ 74,85)
- Para pesos aproximados (ex: "aproximadamente 1,2 kg"): informe o valor estimado e esclareça que o valor final pode variar conforme a pesagem exata.

9. ISOLAMENTO ABSOLUTO DA EMPRESA (MULTI-TENANT):
- Você atende EXCLUSIVAMENTE a empresa "${activeConfig.name}" (ID: ${targetEmpresaId}).
- NUNCA consulte, misture ou mencione dados, produtos, serviços, preços ou políticas de qualquer outra empresa.

BASE DE CONHECIMENTO E REGRAS DO NEGÓCIO:
${knowledgeText || "Nenhuma regra adicional."}

PERGUNTAS FREQUENTES (FAQS):
${faqsText || "Nenhum FAQ registrado."}

CATÁLOGO REAL DE PRODUTOS:
${catalogText || "Nenhum produto cadastrado no momento."}

CARRINHO ATUAL DO CLIENTE:
${cartText}

SERVIÇOS DE AGENDAMENTO:
${servicesText || "Nenhum serviço de agendamento neste negócio."}

PROFISSIONAIS:
${professionalsText || "Sem profissionais específicos."}

JORNADA DE TRABALHO E HORÁRIOS:
${workingHoursText}

HORÁRIOS JÁ OCUPADOS NA AGENDA:
${existingApptsText || "Nenhum horário ocupado no momento."}

FORMATO DE RESPOSTA (EXCLUSIVAMENTE JSON):
{
  "replyText": "Texto da resposta para o cliente (em Espanhol se o cliente usou Espanhol, ou Português se usou Português).",
  "recommendedProductIds": ["id-do-produto-1"],
  "initialQuantities": { "id-do-produto-1": 3 },
  "recommendedServiceIds": ["id-do-servico-1"],
  "detectedIntent": "BAJA" | "MEDIA" | "ALTA" | "COMPRA_LISTA" | "AGENDAMENTO_SOLICITADO",
  "detectedAction": "COMPRA" | "AGENDAMENTO" | "AMBOS" | "CONSULTA",
  "needsHumanAttention": false,
  "orderClosed": false,
  "cartUpdates": {
    "action": "set" | "add" | "remove" | "clear",
    "items": []
  },
  "orderData": {
    "items": [
      {
        "productId": "id-do-produto",
        "productName": "Nome do Produto",
        "saleType": "unit" | "weight",
        "quantity": 1,
        "weightGrams": 500,
        "weightKg": 0.5,
        "unitPrice": 49.90,
        "totalPrice": 24.95,
        "isApproximate": false
      }
    ],
    "subtotal": 24.95,
    "discountPercentage": 5,
    "discountAmount": 1.25,
    "shippingFee": 7.00,
    "total": 30.70,
    "paymentMethod": "PIX",
    "deliveryType": "delivery" | "pickup",
    "customerAddress": "Endereço se delivery",
    "customerName": "Nome do cliente"
  },
  "bookingData": {
    "serviceId": "id-do-servico",
    "serviceName": "Nome do Serviço",
    "date": "YYYY-MM-DD",
    "time": "HH:MM",
    "professional": "Nome do Profissional",
    "customerName": "Nome do Cliente",
    "customerPhone": "Telefone",
    "price": 0.00,
    "status": "CONFIRMADO"
  },
  "leadInfo": {
    "name": "Nome do Cliente",
    "phone": "Telefone",
    "email": "Email",
    "summaryOfNeed": "Resumo do interesse do cliente"
  },
  "suggestedQuickReplies": ["Opção 1", "Opção 2", "Opção 3"],
  "actionSuggested": "VENDA" | "AGENDAMENTO" | "DUVIDA" | "CONFIRMADO",
  "unansweredQuestion": {
    "question": "Pergunta do cliente caso não tenha resposta no catálogo/base de conhecimento",
    "reason": "Motivo da dúvida"
  }
}
`;

    const chatHistoryFormatted = (history || [])
      .slice(-10)
      .map((msg: ChatMessage) => `${msg.sender === "user" ? "Cliente" : "Assistente"}: ${msg.text}`)
      .join("\n");

    const fullPrompt = `HISTÓRICO DA CONVERSA:\n${chatHistoryFormatted}\n\nMENSAGEM DO CLIENTE: "${userMessage}"\n\nResponda estritamente em formato JSON respeitando todas as regras.`;

    const ai = getGeminiAI();
    let responseText = "";
    try {
      responseText = await callGeminiWithFallback(
        ai,
        fullPrompt,
        {
          systemInstruction,
          responseMimeType: "application/json",
          temperature: 0.7,
        }
      );
    } catch (chatAiErr) {
      // Intelligent deterministic Salesperson fallback that perfectly respects active project data, language, and catalog
      const userMsgLower = String(userMessage || "").toLowerCase();

      // Language detection
      const spanishKeywords = [
        "hola", "dulces", "dulce", "que", "qué", "tienes", "tienen", "tiene", "disponible", "disponibles",
        "cuanto", "cuánto", "cuesta", "precio", "precios", "quiero", "postre", "postres", "torta", "tortas",
        "carnes", "carne", "asado", "envio", "envíos", "envios", "donde", "dónde", "estan", "están",
        "horario", "abren", "gracias", "buenas", "dias", "días", "tardes", "noches", "por favor", "pedir",
        "comprar", "opciones", "menu", "menú", "catalogo", "catálogo", "pago", "pagar", "tarjeta", "efectivo"
      ];
      const isSpanish = spanishKeywords.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(userMsgLower)) ||
        /[áéíóúñ¿¡]/.test(userMessage);

      // Check if user is asking about catalog / available products
      // 1. Explicit Full Catalog Inquiry
      const isFullCatalogInquiry =
        userMsgLower.includes("todo el catalogo") ||
        userMsgLower.includes("todo el catálogo") ||
        userMsgLower.includes("todos los productos") ||
        userMsgLower.includes("todos os produtos") ||
        userMsgLower.includes("que tienen") ||
        userMsgLower.includes("qué tienen") ||
        userMsgLower.includes("que vendem") ||
        userMsgLower.includes("o que tem") ||
        userMsgLower.includes("muéstrame los productos") ||
        userMsgLower.includes("muestrame los productos") ||
        userMsgLower.includes("mostre os produtos") ||
        userMsgLower.includes("ver el catalogo") ||
        userMsgLower.includes("ver el catálogo") ||
        userMsgLower.includes("ver catálogo") ||
        userMsgLower.includes("ver cardapio") ||
        userMsgLower.includes("ver cardápio") ||
        userMsgLower.includes("cardapio completo") ||
        userMsgLower.includes("cardápio completo") ||
        userMsgLower.includes("que opciones tienen") ||
        userMsgLower.includes("qué opciones tienen") ||
        userMsgLower.includes("quais opções têm") ||
        userMsgLower.includes("dime todos los productos");

      const inStockProducts = visibleCatalog.filter((p) => {
        const qty = p.stockQuantity !== undefined ? p.stockQuantity : (p.inStock ? 10 : 0);
        return qty > 0 && p.status !== 'esgotado' && p.inStock !== false;
      });

      // 2. Explicit Product Identification
      const cleanUserMsg = userMsgLower.replace(/[¿?¡!.,;:()]/g, " ");
      const explicitProductMatches: { product: CatalogItem; requestedQty: number }[] = [];
      for (const p of visibleCatalog) {
        const pName = (p.name || "").toLowerCase().trim();
        if (!pName) continue;
        const nameWords = pName.split(/\s+/).filter((w) => w.length > 2);
        const isExactName = cleanUserMsg.includes(pName);
        const allWordsInMsg = nameWords.length > 1 && nameWords.every((w) => new RegExp(`\\b${w}\\b`, 'i').test(cleanUserMsg));
        const singleDistinctWord = nameWords.length === 1 && new RegExp(`\\b${nameWords[0]}\\b`, 'i').test(cleanUserMsg);

        if (isExactName || allWordsInMsg || singleDistinctWord) {
          let qty = 1;
          const firstWord = nameWords[0] || pName;
          const qtyMatch = cleanUserMsg.match(new RegExp(`(\\d+)\\s*(?:unidades?|unid|x)?\\s*(?:de\\s+)?${firstWord}`, 'i')) ||
            cleanUserMsg.match(new RegExp(`(?:quiero|dame|pedir|comprar|necesito)\\s*(\\d+)\\s*(?:unidades?|unid|x)?\\s*(?:de\\s+)?${firstWord}?`, 'i')) ||
            cleanUserMsg.match(/(\d+)\s*(?:unidades?|unid|x)/i);
          if (qtyMatch && parseInt(qtyMatch[1], 10) > 0 && parseInt(qtyMatch[1], 10) < 500) {
            qty = parseInt(qtyMatch[1], 10);
          }
          explicitProductMatches.push({ product: p, requestedQty: qty });
        }
      }

      // 3. Category Match
      const availableCategories = Array.from(new Set(visibleCatalog.map((p) => (p.category || "").trim()).filter(Boolean)));
      let matchedCategory: string | null = null;
      for (const cat of availableCategories) {
        const catLower = cat.toLowerCase();
        if (new RegExp(`\\b${catLower}\\b`, 'i').test(cleanUserMsg)) {
          matchedCategory = cat;
          break;
        }
        if ((catLower.includes("dulce") || catLower.includes("doce")) && (cleanUserMsg.includes("dulce") || cleanUserMsg.includes("doce") || cleanUserMsg.includes("postre") || cleanUserMsg.includes("sobremesa"))) {
          matchedCategory = cat;
          break;
        }
        if ((catLower.includes("bebida") || catLower.includes("trago")) && (cleanUserMsg.includes("bebida") || cleanUserMsg.includes("refresco") || cleanUserMsg.includes("tomar"))) {
          matchedCategory = cat;
          break;
        }
        if (catLower.includes("carne") && (cleanUserMsg.includes("carne") || cleanUserMsg.includes("asado"))) {
          matchedCategory = cat;
          break;
        }
      }

      const matchedProducts = explicitProductMatches.map((m) => m.product);

      // 4. Non-existent Product Intent Check
      const isAskingForSpecificItem = /(?:cuanto cuesta|cuánto cuesta|precio de|precio del|tienen|tienes|venden|hay|quiero comprar|quiero saber el precio|têm|tem|qual o valor)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s]{3,30})/i.test(cleanUserMsg);

      const matchedServices = projectServices.filter((s) => {
        const nameMatch = s.name && userMsgLower.includes(s.name.toLowerCase());
        const catMatch = s.category && userMsgLower.includes(s.category.toLowerCase());
        return nameMatch || catMatch;
      });

      let fallbackReply = "";
      let recommendedProds: string[] = [];
      let detectedInitialQuantities: Record<string, number> = {};
      let recommendedServs: string[] = [];
      let detectedIntent: LeadIntentLevel = "MEDIA";
      let actionSuggested = "DUVIDA";
      let quickReplies: string[] = [];
      let unansweredQ: { question: string; reason: string } | null = null;
      let cartUpdates: { action: string; items: CartItem[] } | null = null;
      let orderClosed = false;
      let orderData: any = null;
      let needsHumanAttention = false;

      // Extract conversation memory and customer details from history
      const fullConversationText = [...(history || []).map((m: ChatMessage) => m.text), userMessage].join("\n").toLowerCase();
      
      // Check customer name mentioned in history (e.g., "me llamo Carlos", "soy Carlos", "meu nome é Carlos")
      const nameMatch = fullConversationText.match(/(?:me llamo|soy|mi nombre es|meu nome é|chamo-me)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+)/i);
      const extractedCustomerName = nameMatch ? nameMatch[1].trim() : "Cliente";

      // Check delivery preference
      const isPickup = fullConversationText.includes("retiro") || fullConversationText.includes("retirar") || fullConversationText.includes("buscar") || fullConversationText.includes("retirada");
      const isDelivery = fullConversationText.includes("domicilio") || fullConversationText.includes("envio") || fullConversationText.includes("envío") || fullConversationText.includes("entregar") || fullConversationText.includes("entrega") || fullConversationText.includes("casa");
      const deliveryMode: 'delivery' | 'pickup' = isPickup ? 'pickup' : 'delivery';

      // Check payment preference
      let detectedPaymentMethod: PaymentMethodSetting = activePaymentMethods[0] || { id: 'pix', name: 'PIX', discountPercentage: 10, enabled: true };
      if (fullConversationText.includes("pix")) {
        detectedPaymentMethod = activePaymentMethods.find((p) => p.id === "pix") || detectedPaymentMethod;
      } else if (fullConversationText.includes("tarjeta") || fullConversationText.includes("cartão") || fullConversationText.includes("crédito") || fullConversationText.includes("debito")) {
        detectedPaymentMethod = activePaymentMethods.find((p) => p.id === "tarjeta") || detectedPaymentMethod;
      } else if (fullConversationText.includes("efectivo") || fullConversationText.includes("dinheiro")) {
        detectedPaymentMethod = activePaymentMethods.find((p) => p.id === "efectivo") || detectedPaymentMethod;
      } else if (fullConversationText.includes("transferencia") || fullConversationText.includes("transferência")) {
        detectedPaymentMethod = activePaymentMethods.find((p) => p.id === "transferencia") || detectedPaymentMethod;
      }

      // Check address
      const addressMatch = fullConversationText.match(/(?:vivo en|dirección|direccion|endereço|calle|rua|av|avenida)\s+([a-záéíóúñ0-9\s,.-]+)/i);
      const extractedAddress = addressMatch ? addressMatch[1].trim() : (deliveryMode === 'pickup' ? 'Retiro en Local' : 'Entrega a domicilio');

      // Check if last bot message was asking for confirmation of the order
      const lastBotMsg = (history || []).filter((m: ChatMessage) => m.sender === 'bot').slice(-1)[0]?.text?.toLowerCase() || '';
      const isAwaitingConfirmation = lastBotMsg.includes("confirmar") || lastBotMsg.includes("confirmas") || lastBotMsg.includes("confirma") || lastBotMsg.includes("resumen de tu pedido") || lastBotMsg.includes("total a pagar");

      // Active working cart (either from request or reconstructed)
      let currentCart: CartItem[] = [...cartItems];

      // INTENT A: Explicit Human Request (BEFORE sale)
      if (
        userMsgLower.includes("humano") ||
        userMsgLower.includes("atendente") ||
        userMsgLower.includes("falar com pessoa") ||
        userMsgLower.includes("pessoa real") ||
        userMsgLower.includes("persona real") ||
        userMsgLower.includes("hablar con una persona")
      ) {
        needsHumanAttention = true;
        detectedIntent = "MEDIA";
        actionSuggested = "DUVIDA";
        if (isSpanish) {
          fallbackReply = `¡Por supuesto! Voy a transferir tu atención a un atendente humano de nuestro equipo. Un momento, por favor.`;
          quickReplies = ["Continuar por WhatsApp", "Ver productos"];
        } else {
          fallbackReply = `Com certeza! Vou transferir seu atendimento para um atendente humano da nossa equipe. Um momento, por favor.`;
          quickReplies = ["Continuar pelo WhatsApp", "Ver produtos"];
        }
      }

      // INTENT B: Confirm & Close Sale ("sí", "confirmo", "dale", "sim", "pode fechar", "está bien", "perfecto")
      else if (
        (isAwaitingConfirmation || userMsgLower.includes("confirmo") || userMsgLower.includes("confirmar") || userMsgLower.includes("cerrar pedido") || userMsgLower.includes("finalizar pedido")) &&
        (userMsgLower.includes("si") || userMsgLower.includes("sí") || userMsgLower.includes("sim") || userMsgLower.includes("confirmo") || userMsgLower.includes("dale") || userMsgLower.includes("perfecto") || userMsgLower.includes("ok") || userMsgLower.includes("pode fechar") || userMsgLower.includes("correcto"))
      ) {
        // Collect items to confirm
        let itemsToOrder: { product: CatalogItem; quantity: number }[] = [];
        if (currentCart.length > 0) {
          currentCart.forEach((c) => {
            const prod = visibleCatalog.find((p) => p.id === c.productId);
            if (prod) itemsToOrder.push({ product: prod, quantity: c.quantity });
          });
        } else if (matchedProducts.length > 0) {
          itemsToOrder.push({ product: matchedProducts[0], quantity: 1 });
        } else if (inStockProducts.length > 0) {
          itemsToOrder.push({ product: inStockProducts[0], quantity: 1 });
        }

        if (itemsToOrder.length > 0) {
          const orderNumber = `PED-${Math.floor(100000 + Math.random() * 900000)}`;
          const summary = calculateOrderSummary(
            itemsToOrder.map((it) => ({ price: it.product.price, quantity: it.quantity, name: it.product.name })),
            detectedPaymentMethod,
            deliveryMode === 'pickup' ? 0 : shippingFeeVal,
            freeShippingThresholdVal
          );

          const newCustomerOrder: CustomerOrder = {
            id: orderNumber,
            customerName: extractedCustomerName,
            customerPhone: activeConfig.phoneWhatsapp || '+55 11 98877-6655',
            customerAddress: deliveryMode === 'pickup' ? 'Retiro en Local' : extractedAddress,
            items: itemsToOrder.map((it) => ({
              productId: it.product.id,
              productName: it.product.name,
              saleType: (it.product.saleType as any) || 'unit',
              quantity: it.quantity,
              unitPrice: it.product.price,
              totalPrice: it.product.price * it.quantity,
            })),
            subtotal: summary.subtotal,
            discountPercentage: summary.discountPercentage,
            discount: summary.discount,
            subtotalWithDiscount: summary.subtotalWithDiscount,
            shippingFee: summary.shippingFee,
            total: summary.total,
            paymentMethod: detectedPaymentMethod.name,
            status: 'CONFIRMADO',
            createdAt: new Date().toISOString(),
          };

          // Register into project memory
          project.orders = [newCustomerOrder, ...(project.orders || [])];
          project.updatedAt = new Date().toISOString();

          // Deduct stock
          itemsToOrder.forEach((it) => {
            const catItem = project.catalog.find((p) => p.id === it.product.id);
            if (catItem) {
              const currentStock = catItem.stockQuantity !== undefined ? catItem.stockQuantity : (catItem.inStock ? 10 : 0);
              const nextStock = Math.max(0, currentStock - it.quantity);
              catItem.stockQuantity = nextStock;
              if (nextStock === 0) {
                catItem.status = 'esgotado';
                catItem.inStock = false;
              }
            }
          });

          orderClosed = true;
          orderData = newCustomerOrder;
          cartUpdates = { action: 'clear', items: [] };
          // ONLY NOW: transfer to human after closing
          needsHumanAttention = true;
          detectedIntent = "COMPRA_LISTA";
          actionSuggested = "CONFIRMADO";

          const itemsText = itemsToOrder.map((it) => `• ${it.quantity}x **${it.product.name}** — R$ ${(it.product.price * it.quantity).toFixed(2).replace('.', ',')}`).join('\n');

          if (isSpanish) {
            fallbackReply = `✅ **¡PEDIDO CONFIRMADO CON ÉXITO!** 🎉\n\n` +
              `📋 **Número de Pedido:** #${orderNumber}\n` +
              `👤 **Cliente:** ${extractedCustomerName}\n` +
              `📦 **Modalidad:** ${deliveryMode === 'pickup' ? 'Retiro en local' : `Entrega a domicilio (${extractedAddress})`}\n` +
              `💳 **Forma de pago:** ${detectedPaymentMethod.name}\n\n` +
              `🛒 **Detalle:**\n${itemsText}\n\n` +
              `• Subtotal: R$ ${summary.subtotal.toFixed(2).replace('.', ',')}\n` +
              (summary.discount > 0 ? `• Descuento (${summary.discountPercentage}%): -R$ ${summary.discount.toFixed(2).replace('.', ',')}\n` : '') +
              `• Envío: ${summary.shippingFee === 0 ? 'GRATIS' : `R$ ${summary.shippingFee.toFixed(2).replace('.', ',')}`}\n` +
              `💰 **TOTAL A PAGAR: R$ ${summary.total.toFixed(2).replace('.', ',')}**\n\n` +
              `🎉 **Tu pedido ya fue registrado en nuestro sistema comercial.**\n` +
              `Hemos transferido la atención a nuestro equipo humano para la preparación y despacho. Puedes continuar por WhatsApp con nuestro atendente pulsando a continuación.`;
            quickReplies = ["Ver detalles del pedido", "Hablar con el atendente"];
          } else {
            fallbackReply = `✅ **PEDIDO CONFIRMADO COM SUCESSO!** 🎉\n\n` +
              `📋 **Número do Pedido:** #${orderNumber}\n` +
              `👤 **Cliente:** ${extractedCustomerName}\n` +
              `📦 **Modalidade:** ${deliveryMode === 'pickup' ? 'Retirada no local' : `Entrega em domicílio (${extractedAddress})`}\n` +
              `💳 **Forma de pagamento:** ${detectedPaymentMethod.name}\n\n` +
              `🛒 **Itens:**\n${itemsText}\n\n` +
              `• Subtotal: R$ ${summary.subtotal.toFixed(2).replace('.', ',')}\n` +
              (summary.discount > 0 ? `• Desconto (${summary.discountPercentage}%): -R$ ${summary.discount.toFixed(2).replace('.', ',')}\n` : '') +
              `• Frete: ${summary.shippingFee === 0 ? 'GRÁTIS' : `R$ ${summary.shippingFee.toFixed(2).replace('.', ',')}`}\n` +
              `💰 **TOTAL A PAGAR: R$ ${summary.total.toFixed(2).replace('.', ',')}**\n\n` +
              `🎉 **Seu pedido já foi cadastrado no nosso sistema comercial.**\n` +
              `Transferimos seu atendimento para nossa equipe humana para o preparo e despacho. Você pode continuar no WhatsApp com o atendente clicando abaixo.`;
            quickReplies = ["Ver detalhes do pedido", "Falar com atendente"];
          }
        }
      }

      // INTENT C: Cart Operations (Add, Remove, View, Clear)
      else if (
        userMsgLower.includes("carrito") ||
        userMsgLower.includes("carrinho") ||
        userMsgLower.includes("agregar") ||
        userMsgLower.includes("añadir") ||
        userMsgLower.includes("adicionar") ||
        userMsgLower.includes("sacar") ||
        userMsgLower.includes("remover") ||
        userMsgLower.includes("eliminar")
      ) {
        detectedIntent = "ALTA";
        actionSuggested = "VENDA";

        // 1. Remove from cart
        if (userMsgLower.includes("sacar") || userMsgLower.includes("remover") || userMsgLower.includes("eliminar") || userMsgLower.includes("quitar")) {
          const toRemove = matchedProducts[0] || (currentCart.length > 0 ? visibleCatalog.find(p => p.id === currentCart[0].productId) : null);
          if (toRemove) {
            currentCart = currentCart.filter((it) => it.productId !== toRemove.id);
            cartUpdates = { action: 'remove', items: currentCart };
            const subtotal = currentCart.reduce((sum, it) => sum + (it.subtotal || it.unitPrice * it.quantity), 0);
            if (isSpanish) {
              fallbackReply = `Listo, retiré **${toRemove.name}** de tu selección. Tienes ${currentCart.length} producto(s) por un subtotal de **R$ ${subtotal.toFixed(2).replace('.', ',')}**. ¿Deseas finalizar tu compra o seleccionar algún otro producto?`;
              quickReplies = ["Finalizar compra", "Ver catálogo de productos"];
            } else {
              fallbackReply = `Pronto, retirei **${toRemove.name}** da sua seleção. Você tem ${currentCart.length} produto(s) no subtotal de **R$ ${subtotal.toFixed(2).replace('.', ',')}**. Deseja finalizar a compra ou selecionar mais produtos?`;
              quickReplies = ["Finalizar compra", "Ver catálogo de produtos"];
            }
          } else {
            if (isSpanish) {
              fallbackReply = `¿Qué producto te gustaría retirar de tu selección?`;
            } else {
              fallbackReply = `Qual produto você gostaria de retirar da sua seleção?`;
            }
          }
        }
        // 2. Clear selection
        else if (userMsgLower.includes("vaciar") || userMsgLower.includes("limpiar") || userMsgLower.includes("limpar")) {
          currentCart = [];
          cartUpdates = { action: 'clear', items: [] };
          if (isSpanish) {
            fallbackReply = `He limpiado tu selección de productos. ¿Te gustaría ver nuestro catálogo para elegir algún producto?`;
            quickReplies = ["Ver catálogo de productos", "Formas de pago"];
          } else {
            fallbackReply = `Limpei sua seleção de produtos. Gostaria de ver nosso catálogo para escolher algum produto?`;
            quickReplies = ["Ver catálogo de produtos", "Formas de pagamento"];
          }
        }
        // 3. View selection / subtotal
        else if (userMsgLower.includes("ver carrito") || userMsgLower.includes("ver carrinho") || userMsgLower.includes("qué tengo") || userMsgLower.includes("o que tem") || userMsgLower.includes("cuánto llevo") || userMsgLower.includes("quanto tá") || userMsgLower.includes("resumen")) {
          if (currentCart.length === 0) {
            if (isSpanish) {
              fallbackReply = `Aún no has seleccionado productos. ¿Te gustaría consultar nuestros productos disponibles para comprar?`;
              quickReplies = inStockProducts.length > 0 ? ["Ver catálogo de productos", "Formas de pago"] : ["Formas de pago"];
            } else {
              fallbackReply = `Você ainda não selecionou produtos. Gostaria de conferir nossos produtos disponíveis para comprar?`;
              quickReplies = inStockProducts.length > 0 ? ["Ver catálogo de produtos", "Formas de pagamento"] : ["Formas de pagamento"];
            }
          } else {
            const cartLines = currentCart.map((it) => `• ${it.quantity}x **${it.name}** — R$ ${(it.subtotal || it.unitPrice * it.quantity).toFixed(2).replace('.', ',')}`).join('\n');
            const subtotal = currentCart.reduce((sum, it) => sum + (it.subtotal || it.unitPrice * it.quantity), 0);
            if (isSpanish) {
              fallbackReply = `🛍️ **Tu pedido actual:**\n\n${cartLines}\n\n💵 **Subtotal de productos: R$ ${subtotal.toFixed(2).replace('.', ',')}**\n\n¿Deseas finalizar tu pedido ahora o seleccionar algún otro producto?`;
              quickReplies = ["Finalizar pedido", "Ver más productos", "Formas de pago"];
            } else {
              fallbackReply = `🛍️ **Seu pedido atual:**\n\n${cartLines}\n\n💵 **Subtotal de produtos: R$ ${subtotal.toFixed(2).replace('.', ',')}**\n\nDeseja fechar seu pedido agora ou selecionar mais produtos?`;
              quickReplies = ["Finalizar pedido", "Ver mais produtos", "Formas de pagamento"];
            }
          }
        }
        // 4. Add product to selection
        else {
          const prodToAdd = matchedProducts[0] || inStockProducts[0];
          if (prodToAdd) {
            const existingIdx = currentCart.findIndex((c) => c.productId === prodToAdd.id);
            if (existingIdx >= 0) {
              currentCart[existingIdx].quantity += 1;
              currentCart[existingIdx].subtotal = currentCart[existingIdx].quantity * prodToAdd.price;
            } else {
              currentCart.push({
                id: `cart-${prodToAdd.id}-${Date.now()}`,
                productId: prodToAdd.id,
                name: prodToAdd.name,
                unitPrice: prodToAdd.price,
                quantity: 1,
                subtotal: prodToAdd.price,
                saleType: (prodToAdd.saleType as any) || 'unit',
              });
            }
            cartUpdates = { action: 'set', items: currentCart };
            recommendedProds = [prodToAdd.id];
            const subtotal = currentCart.reduce((sum, it) => sum + (it.subtotal || it.unitPrice * it.quantity), 0);

            if (isSpanish) {
              fallbackReply = `¡Excelente! He seleccionado **${prodToAdd.name}** (R$ ${prodToAdd.price.toFixed(2).replace('.', ',')}) para tu compra. 🛍️\n\nTu subtotal actual es de **R$ ${subtotal.toFixed(2).replace('.', ',')}** (${currentCart.length} producto(s)).\n\n¿Deseas finalizar tu compra o seleccionar algo más?`;
              quickReplies = ["Comprar ahora", "Ver más productos", "Formas de pago"];
            } else {
              fallbackReply = `Excelente! Selecionei **${prodToAdd.name}** (R$ ${prodToAdd.price.toFixed(2).replace('.', ',')}) para sua compra. 🛍️\n\nSeu subtotal atual é de **R$ ${subtotal.toFixed(2).replace('.', ',')}** (${currentCart.length} produto(s)).\n\nDeseja finalizar sua compra ou selecionar mais produtos?`;
              quickReplies = ["Comprar agora", "Ver mais produtos", "Formas de pagamento"];
            }
          } else {
            if (isSpanish) {
              fallbackReply = `¿Qué producto te gustaría comprar? Puedo mostrarte nuestro catálogo disponible.`;
              quickReplies = ["Ver catálogo de productos", "Formas de pago"];
            } else {
              fallbackReply = `Qual produto você gostaria de comprar? Posso te mostrar nosso catálogo disponível.`;
              quickReplies = ["Ver catálogo de produtos", "Formas de pagamento"];
            }
          }
        }
      }

      // INTENT D: Checkout & Automated Closing Flow ("quiero comprar", "hacer pedido", "finalizar compra", "cerrar venta", "cerrar pedido", "pedir", "me lo llevo")
      else if (
        userMsgLower.includes("comprar") ||
        userMsgLower.includes("pedir") ||
        userMsgLower.includes("cerrar pedido") ||
        userMsgLower.includes("finalizar pedido") ||
        userMsgLower.includes("finalizar compra") ||
        userMsgLower.includes("fechar pedido") ||
        userMsgLower.includes("me lo llevo") ||
        userMsgLower.includes("hacer pedido") ||
        userMsgLower.includes("hacer el pedido") ||
        userMsgLower.includes("quero comprar") ||
        userMsgLower.includes("quero pedir")
      ) {
        detectedIntent = "COMPRA_LISTA";
        actionSuggested = "VENDA";

        // Determine products to buy
        let prodsToBuy: { product: CatalogItem; quantity: number }[] = [];
        if (currentCart.length > 0) {
          currentCart.forEach((c) => {
            const p = visibleCatalog.find((x) => x.id === c.productId);
            if (p) prodsToBuy.push({ product: p, quantity: c.quantity });
          });
        } else if (matchedProducts.length > 0) {
          prodsToBuy.push({ product: matchedProducts[0], quantity: 1 });
          // Also sync to cart
          currentCart = [{
            id: `cart-${matchedProducts[0].id}-${Date.now()}`,
            productId: matchedProducts[0].id,
            name: matchedProducts[0].name,
            unitPrice: matchedProducts[0].price,
            quantity: 1,
            subtotal: matchedProducts[0].price,
            saleType: (matchedProducts[0].saleType as any) || 'unit',
          }];
          cartUpdates = { action: 'set', items: currentCart };
        } else if (inStockProducts.length > 0) {
          prodsToBuy.push({ product: inStockProducts[0], quantity: 1 });
          currentCart = [{
            id: `cart-${inStockProducts[0].id}-${Date.now()}`,
            productId: inStockProducts[0].id,
            name: inStockProducts[0].name,
            unitPrice: inStockProducts[0].price,
            quantity: 1,
            subtotal: inStockProducts[0].price,
            saleType: (inStockProducts[0].saleType as any) || 'unit',
          }];
          cartUpdates = { action: 'set', items: currentCart };
        }

        if (prodsToBuy.length === 0) {
          if (isSpanish) {
            fallbackReply = `¡Con mucho gusto te tomo el pedido! ¿Cuál de nuestros productos te gustaría comprar hoy?`;
            quickReplies = ["Ver catálogo de productos", "Formas de pago"];
          } else {
            fallbackReply = `Com muito prazer anoto seu pedido! Qual de nossos produtos você gostaria de comprar hoje?`;
            quickReplies = ["Ver catálogo de produtos", "Formas de pagamento"];
          }
        } else {
          recommendedProds = prodsToBuy.map((p) => p.product.id);
          const summary = calculateOrderSummary(
            prodsToBuy.map((p) => ({ price: p.product.price, quantity: p.quantity, name: p.product.name })),
            detectedPaymentMethod,
            deliveryMode === 'pickup' ? 0 : shippingFeeVal,
            freeShippingThresholdVal
          );

          const itemsSummaryLines = prodsToBuy.map((p) => `• ${p.quantity}x **${p.product.name}** — R$ ${(p.product.price * p.quantity).toFixed(2).replace('.', ',')}`).join('\n');

          if (isSpanish) {
            fallbackReply = `📋 **RESUMEN DE TU PEDIDO:**\n\n` +
              `${itemsSummaryLines}\n\n` +
              `• Subtotal: R$ ${summary.subtotal.toFixed(2).replace('.', ',')}\n` +
              (summary.discount > 0 ? `• Descuento ${detectedPaymentMethod.name} (${summary.discountPercentage}%): -R$ ${summary.discount.toFixed(2).replace('.', ',')}\n` : '') +
              `• Envío: ${summary.shippingFee === 0 ? 'GRATIS' : `R$ ${summary.shippingFee.toFixed(2).replace('.', ',')}`}\n` +
              `💰 **TOTAL A PAGAR: R$ ${summary.total.toFixed(2).replace('.', ',')}**\n\n` +
              `📍 **Modalidad:** ${deliveryMode === 'pickup' ? 'Retiro en el local' : `Entrega a domicilio`}\n` +
              `💳 **Forma de pago:** ${detectedPaymentMethod.name}\n\n` +
              `¿Confirmas tu pedido para registrarlo y enviarlo a preparación?`;
            quickReplies = ["Sí, confirmo el pedido", "Cambiar forma de pago", "Retiro en local"];
          } else {
            fallbackReply = `📋 **RESUMO DO SEU PEDIDO:**\n\n` +
              `${itemsSummaryLines}\n\n` +
              `• Subtotal: R$ ${summary.subtotal.toFixed(2).replace('.', ',')}\n` +
              (summary.discount > 0 ? `• Desconto ${detectedPaymentMethod.name} (${summary.discountPercentage}%): -R$ ${summary.discount.toFixed(2).replace('.', ',')}\n` : '') +
              `• Frete: ${summary.shippingFee === 0 ? 'GRÁTIS' : `R$ ${summary.shippingFee.toFixed(2).replace('.', ',')}`}\n` +
              `💰 **TOTAL A PAGAR: R$ ${summary.total.toFixed(2).replace('.', ',')}**\n\n` +
              `📍 **Modalidade:** ${deliveryMode === 'pickup' ? 'Retirada no local' : `Entrega em domicílio`}\n` +
              `💳 **Forma de pagamento:** ${detectedPaymentMethod.name}\n\n` +
              `Você confirma o pedido para registrarmos e enviarmos ao preparo?`;
            quickReplies = ["Sim, confirmo o pedido", "Trocar forma de pagamento", "Retirar no local"];
          }
        }
      }

      // 1. Service / Appointment inquiry
      else if (
        (userMsgLower.includes("agendar") || userMsgLower.includes("cita") || userMsgLower.includes("marcar") || matchedServices.length > 0) &&
        projectServices.length > 0
      ) {
        const serv = matchedServices[0] || projectServices[0];
        recommendedServs = [serv.id];
        detectedIntent = "AGENDAMENTO_SOLICITADO";
        actionSuggested = "AGENDAMENTO";

        if (isSpanish) {
          fallbackReply = `¡Con gusto! Tenemos disponible el servicio **${serv.name}** por R$ ${serv.price.toFixed(2)} (${serv.durationMin} min). ¿Qué día y horario te queda más cómodo para agendar?`;
          quickReplies = ["Agendar para hoy", "Agendar para mañana", "Ver todos los servicios"];
        } else {
          fallbackReply = `Com certeza! Temos disponível o serviço **${serv.name}** por R$ ${serv.price.toFixed(2)} (${serv.durationMin} min). Qual dia e horário você prefere agendar?`;
          quickReplies = ["Agendar para hoje", "Agendar para amanhã", "Ver todos os serviços"];
        }
      }

      // 2. Comprehensive Conversational Intelligence Engine
      else {
        const analysis = analyzeCustomerQuery({
          userMessage: String(userMessage || ""),
          history: history || [],
          catalog: visibleCatalog,
          cart: currentCart,
          config: activeConfig,
          paymentMethods: activePaymentMethods,
        });

        fallbackReply = analysis.replyText;
        recommendedProds = analysis.targetProducts.map((p) => p.id);
        detectedInitialQuantities = analysis.quantities || {};
        quickReplies = analysis.quickReplies || [];

        if (analysis.cartUpdates) {
          cartUpdates = analysis.cartUpdates;
        }

        if (analysis.intent === "CATALOG_BROWSE" || analysis.intent === "MULTI_CONDITION_SEARCH" || analysis.intent === "SPECIFIC_PRODUCT") {
          detectedIntent = "ALTA";
          actionSuggested = "VENDA";
        } else if (analysis.intent === "RECOMMENDATION" || analysis.intent === "CONTEXTUAL_REFERENCE") {
          detectedIntent = "ALTA";
          actionSuggested = "VENDA";
        } else if (analysis.intent === "HUMAN_HANDOFF") {
          needsHumanAttention = true;
          detectedIntent = "MEDIA";
          actionSuggested = "DUVIDA";
        } else {
          detectedIntent = "MEDIA";
          actionSuggested = "DUVIDA";
        }
      }

      responseText = JSON.stringify({
        replyText: fallbackReply,
        recommendedProductIds: recommendedProds,
        initialQuantities: detectedInitialQuantities,
        recommendedServiceIds: recommendedServs,
        detectedIntent,
        actionSuggested,
        suggestedQuickReplies: quickReplies,
        unansweredQuestion: unansweredQ,
        cartUpdates,
        orderClosed,
        orderData,
        needsHumanAttention,
      });
    }

    let jsonResult;
    try {
      jsonResult = JSON.parse(responseText);
    } catch {
      jsonResult = {
        replyText: responseText || `¡Hola! Te damos la bienvenida a ${activeConfig.name}. ¿Cómo podemos ayudarte hoy?`,
        recommendedProductIds: [],
        recommendedServiceIds: [],
        detectedIntent: "MEDIA",
        suggestedQuickReplies: ["Ver catálogo", "Formas de pago"],
      };
    }

    // Post-processing guard to ensure intent discipline and multi-tenant isolation
    if (jsonResult && typeof jsonResult === 'object') {
      // 1. Strict multi-tenant isolation: filter out any product IDs not in this project's catalog
      if (Array.isArray(jsonResult.recommendedProductIds)) {
        jsonResult.recommendedProductIds = jsonResult.recommendedProductIds.filter((id: string) =>
          visibleCatalog.some((p) => p.id === id)
        );
      } else {
        jsonResult.recommendedProductIds = [];
      }

      const cleanUserMsgPost = String(userMessage || "").toLowerCase().replace(/[¿?¡!.,;:()]/g, " ");

      // Check if user asked for a specific product
      const explicitMatchesPost: { product: CatalogItem; qty: number }[] = [];
      for (const p of visibleCatalog) {
        const pName = (p.name || "").toLowerCase().trim();
        if (!pName) continue;
        const nameWords = pName.split(/\s+/).filter((w) => w.length > 2);
        const isExactName = cleanUserMsgPost.includes(pName);
        const allWords = nameWords.length > 1 && nameWords.every((w) => new RegExp(`\\b${w}\\b`, 'i').test(cleanUserMsgPost));
        const singleDistinct = nameWords.length === 1 && new RegExp(`\\b${nameWords[0]}\\b`, 'i').test(cleanUserMsgPost);
        if (isExactName || allWords || singleDistinct) {
          let qty = 1;
          const firstWord = nameWords[0] || pName;
          const qtyMatch = cleanUserMsgPost.match(new RegExp(`(\\d+)\\s*(?:unidades?|unid|x)?\\s*(?:de\\s+)?${firstWord}`, 'i')) ||
            cleanUserMsgPost.match(new RegExp(`(?:quiero|dame|pedir|comprar|necesito)\\s*(\\d+)\\s*(?:unidades?|unid|x)?\\s*(?:de\\s+)?${firstWord}?`, 'i')) ||
            cleanUserMsgPost.match(/(\d+)\s*(?:unidades?|unid|x)/i);
          if (qtyMatch && parseInt(qtyMatch[1], 10) > 0 && parseInt(qtyMatch[1], 10) < 500) {
            qty = parseInt(qtyMatch[1], 10);
          }
          explicitMatchesPost.push({ product: p, qty });
        }
      }

      const isFullCatalogPost =
        cleanUserMsgPost.includes("que tienes disponible") ||
        cleanUserMsgPost.includes("qué tienes disponible") ||
        cleanUserMsgPost.includes("que tienen disponible") ||
        cleanUserMsgPost.includes("qué tienen disponible") ||
        cleanUserMsgPost.includes("que hay disponible") ||
        cleanUserMsgPost.includes("qué hay disponible") ||
        cleanUserMsgPost.includes("todo el catalogo") ||
        cleanUserMsgPost.includes("todo el catálogo") ||
        cleanUserMsgPost.includes("todos los productos") ||
        cleanUserMsgPost.includes("todos os produtos") ||
        cleanUserMsgPost.includes("que tienen") ||
        cleanUserMsgPost.includes("qué tienen") ||
        cleanUserMsgPost.includes("que vendem") ||
        cleanUserMsgPost.includes("que venden") ||
        cleanUserMsgPost.includes("o que tem") ||
        cleanUserMsgPost.includes("o que tem disponível") ||
        cleanUserMsgPost.includes("o que tem disponivel") ||
        cleanUserMsgPost.includes("manda o catalogo") ||
        cleanUserMsgPost.includes("manda o catálogo") ||
        cleanUserMsgPost.includes("muéstrame los productos") ||
        cleanUserMsgPost.includes("muestrame los productos") ||
        cleanUserMsgPost.includes("ver el catalogo") ||
        cleanUserMsgPost.includes("ver el catálogo") ||
        cleanUserMsgPost.includes("ver catálogo") ||
        cleanUserMsgPost.includes("ver cardapio") ||
        cleanUserMsgPost.includes("cardapio completo") ||
        cleanUserMsgPost.includes("que opciones tienen") ||
        cleanUserMsgPost.includes("qué opciones tienen") ||
        cleanUserMsgPost.includes("quais opções têm") ||
        cleanUserMsgPost.includes("dime todos");

      const isRecommendationOrContextPost =
        cleanUserMsgPost.includes("recomiend") ||
        cleanUserMsgPost.includes("recomenda") ||
        cleanUserMsgPost.includes("primero") ||
        cleanUserMsgPost.includes("primera") ||
        cleanUserMsgPost.includes("segundo") ||
        cleanUserMsgPost.includes("segunda") ||
        cleanUserMsgPost.includes("tercero") ||
        cleanUserMsgPost.includes("terceiro") ||
        cleanUserMsgPost.includes("mais barata") ||
        cleanUserMsgPost.includes("más barata") ||
        cleanUserMsgPost.includes("parecido") ||
        cleanUserMsgPost.includes("mais opções") ||
        cleanUserMsgPost.includes("más opciones");

      // Check category
      const availableCategoriesPost = Array.from(new Set(visibleCatalog.map((p) => (p.category || "").trim()).filter(Boolean)));
      let matchedCategoryPost: string | null = null;
      for (const cat of availableCategoriesPost) {
        const catLower = cat.toLowerCase();
        if (new RegExp(`\\b${catLower}\\b`, 'i').test(cleanUserMsgPost)) {
          matchedCategoryPost = cat;
          break;
        }
      }

      // If user message is general inquiry or greeting without product intent, clear recommendedProductIds
      const isGeneralGreetingOrInfo =
        (cleanUserMsgPost === "hola" ||
          cleanUserMsgPost === "buenas" ||
          cleanUserMsgPost === "buen dia" ||
          cleanUserMsgPost === "buenos dias" ||
          cleanUserMsgPost === "olá" ||
          cleanUserMsgPost === "ola" ||
          cleanUserMsgPost === "oi" ||
          cleanUserMsgPost.includes("horario") ||
          cleanUserMsgPost.includes("donde estan") ||
          cleanUserMsgPost.includes("dónde están") ||
          cleanUserMsgPost.includes("ubicacion") ||
          cleanUserMsgPost.includes("ubicación") ||
          cleanUserMsgPost.includes("formas de pago")) &&
        !isFullCatalogPost &&
        !isRecommendationOrContextPost &&
        explicitMatchesPost.length === 0;

      if (isGeneralGreetingOrInfo) {
        jsonResult.recommendedProductIds = [];
      } else if (isFullCatalogPost) {
        if (!jsonResult.recommendedProductIds || jsonResult.recommendedProductIds.length === 0) {
          jsonResult.recommendedProductIds = visibleCatalog.map((p) => p.id);
        }
      } else if (!isRecommendationOrContextPost && explicitMatchesPost.length > 0) {
        // Enforce only requested products
        jsonResult.recommendedProductIds = explicitMatchesPost.map(m => m.product.id);
        const autoQuantities: Record<string, number> = {};
        explicitMatchesPost.forEach(m => {
          autoQuantities[m.product.id] = m.qty;
        });
        jsonResult.initialQuantities = {
          ...(jsonResult.initialQuantities || {}),
          ...autoQuantities,
        };
      } else if (!isRecommendationOrContextPost && matchedCategoryPost && explicitMatchesPost.length === 0) {
        const catIds = visibleCatalog.filter(p => p.category && p.category.toLowerCase() === matchedCategoryPost!.toLowerCase()).map(p => p.id);
        jsonResult.recommendedProductIds = catIds;
      }
    }

    // Auto-register unanswered question in project state if flagged
    if (jsonResult.unansweredQuestion && jsonResult.unansweredQuestion.question) {
      const qText = jsonResult.unansweredQuestion.question;
      const alreadyExists = (project.unansweredQuestions || []).some(
        (q) => q.question.toLowerCase() === qText.toLowerCase()
      );
      if (!alreadyExists) {
        const newUnansweredItem: UnansweredQuestion = {
          id: `unans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          question: qText,
          customerName: jsonResult.leadInfo?.name || 'Cliente Simulador',
          customerPhone: jsonResult.leadInfo?.phone || '',
          date: new Date().toISOString(),
          aiReplySnippet: jsonResult.replyText?.substring(0, 100),
          status: 'pending',
        };
        project.unansweredQuestions = [
          newUnansweredItem,
          ...(project.unansweredQuestions || []),
        ];
        project.updatedAt = new Date().toISOString();
        // Also attach the registered item in result so client knows
        jsonResult.registeredUnansweredQuestion = newUnansweredItem;
      }
    }

    // Register completed order from Gemini AI or fallback
    if (jsonResult.orderData && (jsonResult.orderClosed || jsonResult.orderData.status === 'CONFIRMADO')) {
      const ordNumber = jsonResult.orderData.id || `PED-${Math.floor(100000 + Math.random() * 900000)}`;
      const alreadyInOrders = (project.orders || []).some((o) => o.id === ordNumber);
      if (!alreadyInOrders) {
        const fullOrder: CustomerOrder = {
          id: ordNumber,
          customerName: jsonResult.orderData.customerName || jsonResult.leadInfo?.name || 'Cliente',
          customerPhone: jsonResult.orderData.customerPhone || jsonResult.leadInfo?.phone || activeConfig.phoneWhatsapp || '+55 11 98877-6655',
          customerAddress: jsonResult.orderData.customerAddress || (jsonResult.orderData.deliveryType === 'pickup' ? 'Retiro en Local' : 'Entrega a domicilio'),
          items: (jsonResult.orderData.items || []).map((it: any) => ({
            productId: it.productId || it.id || 'item',
            productName: it.productName || it.name || 'Producto',
            saleType: it.saleType || 'unit',
            quantity: it.quantity || 1,
            unitPrice: it.unitPrice || it.price || 0,
            totalPrice: it.totalPrice || (it.unitPrice || it.price || 0) * (it.quantity || 1),
          })),
          subtotal: jsonResult.orderData.subtotal || 0,
          discountPercentage: jsonResult.orderData.discountPercentage || 0,
          discount: jsonResult.orderData.discountAmount || jsonResult.orderData.discount || 0,
          subtotalWithDiscount: jsonResult.orderData.subtotalWithDiscount || jsonResult.orderData.subtotal || 0,
          shippingFee: jsonResult.orderData.shippingFee || 0,
          total: jsonResult.orderData.total || jsonResult.orderData.subtotal || 0,
          paymentMethod: jsonResult.orderData.paymentMethod || 'PIX',
          status: 'CONFIRMADO',
          createdAt: new Date().toISOString(),
        };

        project.orders = [fullOrder, ...(project.orders || [])];

        // Deduct stock for items in order
        (fullOrder.items || []).forEach((it) => {
          const item = project.catalog.find((p) => p.id === it.productId);
          if (item) {
            const currentQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
            const newQty = Math.max(0, currentQty - (it.quantity || 1));
            item.stockQuantity = newQty;
            if (newQty === 0) {
              item.status = 'esgotado';
              item.inStock = false;
              item.availability = 'Esgotado';
            }
          }
        });
        project.updatedAt = new Date().toISOString();
        jsonResult.orderData = fullOrder;
        jsonResult.orderClosed = true;
      }
      // ONLY NOW after sale is closed: transfer to human
      jsonResult.needsHumanAttention = true;
    } else if (jsonResult && (jsonResult.detectedAction === 'COMPRA' || jsonResult.detectedIntent === 'COMPRA_LISTA')) {
      if (Array.isArray(jsonResult.recommendedProductIds)) {
        jsonResult.recommendedProductIds.forEach((prodId: string) => {
          const item = project.catalog.find((p) => p.id === prodId);
          if (item) {
            const currentQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
            if (currentQty > 0) {
              const newQty = currentQty - 1;
              item.stockQuantity = newQty;
              if (newQty === 0) {
                item.status = 'esgotado';
                item.inStock = false;
                item.availability = 'Esgotado';
              }
            }
          }
        });
        project.updatedAt = new Date().toISOString();
      }
    }

    if (audioTranscription) {
      jsonResult.transcription = audioTranscription;
      jsonResult.isAudio = true;
    }

    // Auto-detect explicit human attention request keywords
    const userMsgLower = (userMessage || '').toLowerCase();
    if (
      userMsgLower.includes("humano") ||
      userMsgLower.includes("atendente") ||
      userMsgLower.includes("falar com alguem") ||
      userMsgLower.includes("hablar con una persona") ||
      userMsgLower.includes("persona real") ||
      userMsgLower.includes("pessoa real")
    ) {
      jsonResult.needsHumanAttention = true;
    }

    res.json(jsonResult);
  } catch (error: any) {
    console.error("Error in sales-chat API:", error);
    // Safe salesperson fallback - NEVER mention signal oscillation or WhatsApp issues
    res.json({
      replyText: "¡Hola! Te damos la bienvenida. ¿En qué producto o servicio te podemos ayudar hoy?",
      recommendedProductIds: [],
      recommendedServiceIds: [],
      detectedIntent: "MEDIA",
      suggestedQuickReplies: ["Ver catálogo", "Formas de pago"],
    });
  }
}

app.post("/api/sales-chat", async (req, res) => {
  return handleSalesChatRequest(req, res);
});

// Audio message interpretation endpoint
app.post("/api/sales-chat/audio", async (req, res) => {
  try {
    const { audioDataUrl, audioMimeType, userTextHint } = req.body;
    let transcribedText = userTextHint || "";

    if (audioDataUrl && typeof audioDataUrl === "string") {
      try {
        const ai = getGeminiAI();
        const base64Data = audioDataUrl.includes(",") ? audioDataUrl.split(",")[1] : audioDataUrl;
        const mime = audioMimeType || "audio/webm";

        const result = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mime,
                  },
                },
                {
                  text: "Por favor transcribe con máxima precisión el contenido de este mensaje de voz de WhatsApp enviado por un cliente en su idioma original (español o portugués). Retorna EXCLUSIVAMENTE el texto transcrito, sin comillas, notas ni encabezados adicionales.",
                },
              ],
            },
          ],
        });
        transcribedText = result.text?.trim() || transcribedText;
      } catch (err) {
        console.warn("[Audio] Error transcribiendo con Gemini:", err);
      }
    }

    if (!transcribedText) {
      transcribedText = userTextHint || "Hola, me gustaría consultar por sus productos y precios por favor.";
    }

    return handleSalesChatRequest(req, res, transcribedText);
  } catch (error: any) {
    console.error("Error in sales-chat/audio API:", error);
    res.json({
      transcription: "Mensaje de voz recibido",
      replyText: "¡Hola! He recibido tu mensaje de audio. ¿En qué producto o servicio te podemos ayudar hoy?",
      recommendedProductIds: [],
      recommendedServiceIds: [],
      detectedIntent: "MEDIA",
      suggestedQuickReplies: ["Ver catálogo", "Formas de pago"],
    });
  }
});

// In-memory notifications store and real-time SSE connections
const notificationsStore: CompanyOrderNotification[] = [];
const sseClientsByEmpresa = new Map<number | string, Set<express.Response>>();

function broadcastOrderNotification(empresaId: number | string, notif: CompanyOrderNotification, order: CustomerOrder) {
  // 1. Direct subscribers to this specific empresa
  const targets = new Set<express.Response>();
  const specificClients = sseClientsByEmpresa.get(empresaId);
  if (specificClients) {
    specificClients.forEach((c) => targets.add(c));
  }
  // 2. Superadmin subscribers (empresaId 'all')
  const allClients = sseClientsByEmpresa.get('all');
  if (allClients) {
    allClients.forEach((c) => targets.add(c));
  }

  const payload = JSON.stringify({ type: 'NEW_ORDER', notification: notif, order });
  targets.forEach((client) => {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch (e) {
      console.warn("SSE write error:", e);
    }
  });
}

// Real-time SSE Stream endpoint
app.get("/api/orders/stream", (req, res) => {
  const { role, empresaId } = getRequestAuth(req);
  const targetEmpresa: number | string = role === 'owner' ? (empresaId || 1) : (empresaId || 'all');

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  if (!sseClientsByEmpresa.has(targetEmpresa)) {
    sseClientsByEmpresa.set(targetEmpresa, new Set());
  }
  sseClientsByEmpresa.get(targetEmpresa)!.add(res);

  // Send initial ping
  res.write(`data: ${JSON.stringify({ type: 'CONNECTED', targetEmpresa })}\n\n`);

  req.on("close", () => {
    const clients = sseClientsByEmpresa.get(targetEmpresa);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) sseClientsByEmpresa.delete(targetEmpresa);
    }
  });
});

// Notifications list endpoint (Company-isolated)
app.get("/api/notifications", (req, res) => {
  const { role, empresaId } = getRequestAuth(req);
  const rawTargetEmpId = req.headers['x-empresa-id'] || req.query.empresaId;
  const targetEmpId = rawTargetEmpId ? Number(rawTargetEmpId) : empresaId;

  if (role === 'owner') {
    if (!targetEmpId) {
      return res.status(403).json({ error: "No autorizado para ver notificaciones" });
    }
    const filtered = notificationsStore.filter((n) => n.empresaId === targetEmpId);
    return res.json({ notifications: filtered });
  }

  // If superadmin has filtered by company:
  if (targetEmpId) {
    const filtered = notificationsStore.filter((n) => n.empresaId === targetEmpId);
    return res.json({ notifications: filtered });
  }

  // Superadmin seeing all:
  res.json({ notifications: notificationsStore });
});

app.patch("/api/notifications/:id/read", (req, res) => {
  const notif = notificationsStore.find((n) => n.id === req.params.id);
  if (notif) {
    notif.read = true;
    res.json({ success: true, notification: notif });
  } else {
    res.status(404).json({ error: "Notificación no encontrada" });
  }
});

app.post("/api/notifications/clear", (req, res) => {
  const rawTargetEmpId = req.headers['x-empresa-id'] || req.query.empresaId;
  const targetEmpId = rawTargetEmpId ? Number(rawTargetEmpId) : undefined;
  if (targetEmpId) {
    notificationsStore.forEach((n) => {
      if (n.empresaId === targetEmpId) n.read = true;
    });
  } else {
    notificationsStore.forEach((n) => (n.read = true));
  }
  res.json({ success: true });
});

// Orders endpoints
app.get("/api/orders", (req, res) => {
  const p = resolveProject(req);
  res.json({ orders: p.orders || [] });
});

app.post("/api/orders", (req, res) => {
  const p = resolveProject(req);
  const empresaIdNumber = p.empresaId || (req.headers['x-empresa-id'] ? Number(req.headers['x-empresa-id']) : 1);
  const rawOrderNum = req.body.orderNumber ? String(req.body.orderNumber).replace(/^#/, '') : String(Math.floor(1000 + Math.random() * 9000));
  const orderNumber = `#${rawOrderNum}`;

  const pendingFields: string[] = [];
  if (!req.body.customerName || req.body.customerName.trim() === '' || req.body.customerName.toLowerCase() === 'cliente') {
    pendingFields.push('customerName');
  }
  if (!req.body.customerPhone || req.body.customerPhone.trim() === '') {
    pendingFields.push('customerPhone');
  }
  if (!req.body.customerAddress && req.body.deliveryType !== 'pickup') {
    pendingFields.push('customerAddress');
  }
  if (!req.body.paymentMethod || req.body.paymentMethod.trim() === '') {
    pendingFields.push('paymentMethod');
  }

  const newOrder: CustomerOrder = {
    id: req.body.id || `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    orderNumber,
    empresaId: empresaIdNumber,
    empresaName: p.name || `Empresa #${empresaIdNumber}`,
    customerName: req.body.customerName || '',
    customerPhone: req.body.customerPhone || '',
    customerAddress: req.body.customerAddress || '',
    deliveryType: req.body.deliveryType || (req.body.customerAddress && req.body.customerAddress.toLowerCase() !== 'retiro en tienda' ? 'delivery' : 'pickup'),
    streetNumber: req.body.streetNumber || '',
    complement: req.body.complement || '',
    neighborhood: req.body.neighborhood || '',
    city: req.body.city || '',
    reference: req.body.reference || '',
    items: req.body.items || [],
    subtotal: Number(req.body.subtotal) || 0,
    discountPercentage: Number(req.body.discountPercentage) || 0,
    discount: Number(req.body.discount) || 0,
    discountAmount: Number(req.body.discountAmount) || Number(req.body.discount) || 0,
    subtotalWithDiscount: Number(req.body.subtotalWithDiscount) || Number(req.body.subtotal) || 0,
    shippingFee: Number(req.body.shippingFee) || 0,
    total: Number(req.body.total) || 0,
    paymentMethod: req.body.paymentMethod || '',
    paymentMethodId: req.body.paymentMethodId,
    paymentStatus: req.body.paymentStatus || 'PENDIENTE',
    status: (req.body.status as any) || 'NUEVO',
    createdAt: req.body.createdAt || new Date().toISOString(),
    notes: req.body.notes || '',
    transferredToHuman: req.body.transferredToHuman ?? false,
    transferredAt: req.body.transferredAt || (req.body.transferredToHuman ? new Date().toISOString() : undefined),
    pendingFields,
  };

  if (!p.orders) p.orders = [];
  p.orders.unshift(newOrder);
  p.updatedAt = new Date().toISOString();

  // Deduct catalog stock on server
  if (Array.isArray(newOrder.items) && newOrder.items.length > 0 && Array.isArray(p.catalog)) {
    p.catalog = p.catalog.map((catItem) => {
      const match = newOrder.items.find((i) => i.productId === catItem.id);
      if (match) {
        const currentQty = catItem.stockQuantity !== undefined ? catItem.stockQuantity : (catItem.inStock ? 10 : 0);
        const newQty = Math.max(0, currentQty - (match.quantity || 1));
        return {
          ...catItem,
          stockQuantity: newQty,
          inStock: newQty > 0,
          status: newQty === 0 ? 'esgotado' : catItem.status,
          availability: newQty === 0 ? 'Esgotado' : catItem.availability,
        };
      }
      return catItem;
    });
  }

  // Create highly visible Notification
  const newNotif: CompanyOrderNotification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    orderId: newOrder.id,
    orderNumber: newOrder.orderNumber,
    empresaId: empresaIdNumber,
    empresaName: p.name,
    customerName: newOrder.customerName || 'Cliente (Nombre pendiente)',
    customerPhone: newOrder.customerPhone || '',
    total: newOrder.total,
    paymentMethod: newOrder.paymentMethod || 'Pendiente',
    itemsSummary: newOrder.items.map((i) => `${i.quantity} × ${i.productName} (R$ ${Number(i.unitPrice).toFixed(2)})`).join(', '),
    deliveryAddress: newOrder.customerAddress || (newOrder.deliveryType === 'pickup' ? 'Retiro en el local' : ''),
    deliveryType: newOrder.deliveryType,
    reference: newOrder.reference,
    notes: newOrder.notes,
    items: newOrder.items,
    pendingFields: newOrder.pendingFields,
    createdAt: new Date().toISOString(),
    read: false,
  };

  notificationsStore.unshift(newNotif);
  if (notificationsStore.length > 200) notificationsStore.pop();

  // Send real-time notification to the company's users
  broadcastOrderNotification(empresaIdNumber, newNotif, newOrder);

  res.json({ success: true, order: newOrder, notification: newNotif, orders: p.orders });
});

// Update any order details (e.g. attendant completing missing data)
app.patch("/api/orders/:id", (req, res) => {
  const p = resolveProject(req);
  const order = (p.orders || []).find((o) => o.id === req.params.id);
  if (order) {
    if (req.body.customerName !== undefined) order.customerName = req.body.customerName;
    if (req.body.customerPhone !== undefined) order.customerPhone = req.body.customerPhone;
    if (req.body.customerAddress !== undefined) order.customerAddress = req.body.customerAddress;
    if (req.body.streetNumber !== undefined) order.streetNumber = req.body.streetNumber;
    if (req.body.complement !== undefined) order.complement = req.body.complement;
    if (req.body.neighborhood !== undefined) order.neighborhood = req.body.neighborhood;
    if (req.body.city !== undefined) order.city = req.body.city;
    if (req.body.reference !== undefined) order.reference = req.body.reference;
    if (req.body.deliveryType !== undefined) order.deliveryType = req.body.deliveryType;
    if (req.body.paymentMethod !== undefined) order.paymentMethod = req.body.paymentMethod;
    if (req.body.paymentStatus !== undefined) order.paymentStatus = req.body.paymentStatus;
    if (req.body.notes !== undefined) order.notes = req.body.notes;
    if (req.body.status !== undefined) order.status = req.body.status;
    if (req.body.transferredToHuman !== undefined) order.transferredToHuman = req.body.transferredToHuman;
    if (req.body.transferredAt !== undefined) order.transferredAt = req.body.transferredAt;

    // Recalculate pending fields
    const pendingFields: string[] = [];
    if (!order.customerName || order.customerName.trim() === '' || order.customerName.toLowerCase() === 'cliente') {
      pendingFields.push('customerName');
    }
    if (!order.customerPhone || order.customerPhone.trim() === '') {
      pendingFields.push('customerPhone');
    }
    if (!order.customerAddress && order.deliveryType !== 'pickup') {
      pendingFields.push('customerAddress');
    }
    if (!order.paymentMethod || order.paymentMethod.trim() === '') {
      pendingFields.push('paymentMethod');
    }
    order.pendingFields = pendingFields;

    order.updatedAt = new Date().toISOString();
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, order });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

app.patch("/api/orders/:id/status", (req, res) => {
  const p = resolveProject(req);
  const order = (p.orders || []).find((o) => o.id === req.params.id);
  if (order) {
    order.status = req.body.status;
    p.updatedAt = new Date().toISOString();
    res.json({ success: true, order });
  } else {
    res.status(404).json({ error: "Order not found" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
