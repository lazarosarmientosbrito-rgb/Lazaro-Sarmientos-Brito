import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  BusinessConfig, 
  CatalogItem, 
  ServiceItem, 
  Appointment, 
  FAQItem, 
  CapturedLead,
  Professional,
  WorkingHoursConfig,
  BusinessProject,
  AiKnowledgeItem,
  UnansweredQuestion,
  CustomerOrder,
  OrderStatus,
  PromotionItem,
  Employee,
  DeliveryConfig,
  AppUser
} from './types';
import { 
  INITIAL_PROJECTS,
  INITIAL_BUSINESS_CONFIG, 
  INITIAL_SERVICES, 
  INITIAL_APPOINTMENTS, 
  SAMPLE_INITIAL_LEADS, 
  INITIAL_PROFESSIONALS,
  INITIAL_WORKING_HOURS
} from './data/defaultConfig';
import { Header, TabType } from './components/Header';
import { ProjectsDashboard } from './components/admin/ProjectsDashboard';
import { BusinessOverviewTab } from './components/admin/BusinessOverviewTab';
import { OrdersTab } from './components/admin/OrdersTab';
import { AnalyticsTab } from './components/admin/AnalyticsTab';
import { EmployeesTab } from './components/admin/EmployeesTab';
import { DeliveriesTab } from './components/admin/DeliveriesTab';
import { PromotionsTab } from './components/admin/PromotionsTab';
import { OnlineCatalogTab } from './components/admin/OnlineCatalogTab';
import { ToastContainer, ToastMessage } from './components/common/ToastContainer';
import { NewProjectModal } from './components/admin/NewProjectModal';
import { AiKnowledgeTab } from './components/admin/AiKnowledgeTab';
import { UnansweredQuestionsTab } from './components/admin/UnansweredQuestionsTab';
import { BusinessConfigTab } from './components/admin/BusinessConfigTab';
import { CatalogTab } from './components/admin/CatalogTab';
import { ServicesTab } from './components/admin/ServicesTab';
import { ProfessionalsTab } from './components/admin/ProfessionalsTab';
import { WorkingHoursTab } from './components/admin/WorkingHoursTab';
import { AppointmentsTab } from './components/admin/AppointmentsTab';
import { FaqTab } from './components/admin/FaqTab';
import { LeadsAndChatsTab } from './components/admin/LeadsAndChatsTab';
import { PaymentsTab } from './components/admin/PaymentsTab';
import { WhatsappConfigTab } from './components/admin/WhatsappConfigTab';
import { AiConfigTab } from './components/admin/AiConfigTab';
import { MobileChatSimulator } from './components/client/MobileChatSimulator';
import { PublicCatalogView } from './components/public/PublicCatalogView';
import { UnsavedChangesModal } from './components/common/UnsavedChangesModal';
import { DeleteProjectModal } from './components/common/DeleteProjectModal';
import { AccountModal } from './components/common/AccountModal';
import { Save, AlertCircle, CheckCircle2, Loader2, Cloud, WifiOff, RefreshCw, QrCode, ShieldAlert, ShieldCheck, Lock, PowerOff } from 'lucide-react';
import { 
  isSupabaseConfigured, 
  fetchEmpresasFromSupabase, 
  createEmpresaInSupabase, 
  getNextEmpresaIdFromSupabase,
  fetchProductosByEmpresa, 
  createProductoInSupabase, 
  updateProductoInSupabase, 
  deleteProductoFromSupabase,
  deleteEmpresaFromSupabase,
  subscribeToProductosByEmpresa,
  syncCatalogToSupabase,
  generateUUID,
  fetchProjectsFromSupabase,
  saveProjectToSupabase,
  deleteProjectFromSupabase,
  updateOrderStatusInSupabase,
  subscribeToProjectsFromSupabase,
  revokeOwnerAccessInSupabase,
  restoreOwnerAccessInSupabase
} from './lib/supabase';
import { SupabaseModal } from './components/SupabaseModal';
import { OwnerPanelQRModal } from './components/admin/OwnerPanelQRModal';

// Default sample data for rich SaaS initial views
const DEFAULT_SAMPLE_ORDERS: CustomerOrder[] = [
  {
    id: 'ord-101',
    customerName: 'Mariana Gómez',
    customerPhone: '+55 11 98765-4321',
    customerAddress: 'Av. Paulista 1200, Apto 42',
    items: [
      {
        productId: 'prod-1',
        productName: 'Torta Artesanal de Chocolate',
        quantity: 1,
        unitPrice: 65,
        totalPrice: 65,
      },
      {
        productId: 'prod-2',
        productName: 'Caja de Bombones Gourmet',
        quantity: 2,
        unitPrice: 28,
        totalPrice: 56,
      }
    ],
    subtotal: 121,
    discountAmount: 10,
    total: 111,
    status: 'NUEVO',
    paymentMethod: 'Pix',
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    notes: 'Entregar antes de las 18:00hs',
  },
  {
    id: 'ord-102',
    customerName: 'Lucas Ferreira',
    customerPhone: '+55 11 97654-3210',
    customerAddress: 'Rua Augusta 450',
    items: [
      {
        productId: 'prod-3',
        productName: 'Café Especial en Grano 250g',
        quantity: 2,
        unitPrice: 32,
        totalPrice: 64,
      }
    ],
    subtotal: 64,
    discountAmount: 0,
    total: 64,
    status: 'EN_CAMINO',
    paymentMethod: 'Tarjeta de Crédito',
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  },
  {
    id: 'ord-103',
    customerName: 'Camila Rodríguez',
    customerPhone: '+55 11 96543-2109',
    customerAddress: 'Alameda Santos 800',
    items: [
      {
        productId: 'prod-4',
        productName: 'Croissant Francés Mantequilla',
        quantity: 4,
        unitPrice: 12,
        totalPrice: 48,
      }
    ],
    subtotal: 48,
    discountAmount: 5,
    total: 43,
    status: 'ENTREGADO',
    paymentMethod: 'Pix',
    createdAt: new Date(Date.now() - 26 * 3600 * 1000).toISOString(),
  }
];

const DEFAULT_SAMPLE_PROMOTIONS: PromotionItem[] = [
  {
    id: 'promo-1',
    code: 'BIENVENIDO10',
    title: '10% OFF Primera Compra',
    name: '10% OFF Primera Compra',
    type: 'percentual',
    discountPercentage: 10,
    discountValue: 10,
    minOrderValue: 50,
    active: true,
  },
  {
    id: 'promo-2',
    code: 'ENVIOGRATIS',
    title: 'Envío sin costo en compras mayores a R$ 100',
    name: 'Envío sin costo en compras mayores a R$ 100',
    type: 'fixo',
    discountPercentage: 0,
    discountValue: 15,
    minOrderValue: 100,
    active: true,
  }
];

const DEFAULT_SAMPLE_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'Roberto Da Silva',
    role: 'ADMINISTRADOR',
    position: 'Gerente General & Ventas',
    phone: '+55 11 98111-2233',
    email: 'roberto@empresa.com',
    status: 'ativo',
  },
  {
    id: 'emp-2',
    name: 'Juliana Mendes',
    role: 'EMPLEADO',
    position: 'Atención al Cliente & Despacho',
    phone: '+55 11 98222-3344',
    email: 'juliana@empresa.com',
    status: 'ativo',
  }
];

// Helper to ensure every project instance has all required fields & array properties
const sanitizeProject = (p: Partial<BusinessProject> | undefined | null): BusinessProject => {
  const fallback = INITIAL_PROJECTS[0];
  if (!p) return fallback;
  return {
    id: p.id || `proj-${Date.now()}`,
    empresaId: typeof p.empresaId === 'number' ? p.empresaId : undefined,
    name: p.name || 'Negocio',
    businessType: p.businessType || 'Comercio',
    category: p.category || 'General',
    description: p.description || '',
    logoUrl: p.logoUrl || p.config?.logoUrl || '',
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: p.updatedAt || new Date().toISOString(),
    status: p.status || 'ativo',
    config: {
      ...(p.config || INITIAL_BUSINESS_CONFIG),
      logoUrl: p.logoUrl || p.config?.logoUrl || '',
    },
    catalog: Array.isArray(p.catalog) ? p.catalog : [],
    services: Array.isArray(p.services) ? p.services : [],
    professionals: Array.isArray(p.professionals) ? p.professionals : [],
    workingHours: p.workingHours || INITIAL_WORKING_HOURS,
    appointments: Array.isArray(p.appointments) ? p.appointments : [],
    faqs: Array.isArray(p.faqs) ? p.faqs : [],
    aiKnowledge: Array.isArray(p.aiKnowledge) ? p.aiKnowledge : [],
    unansweredQuestions: Array.isArray(p.unansweredQuestions) ? p.unansweredQuestions : [],
    leads: Array.isArray(p.leads) ? p.leads : [],
    orders: Array.isArray(p.orders) && p.orders.length > 0 ? p.orders : DEFAULT_SAMPLE_ORDERS,
    promotions: Array.isArray(p.promotions) && p.promotions.length > 0 ? p.promotions : DEFAULT_SAMPLE_PROMOTIONS,
    employees: Array.isArray(p.employees) && p.employees.length > 0 ? p.employees : DEFAULT_SAMPLE_EMPLOYEES,
  };
};

// Normalized snapshot string for deterministic unsaved changes detection
const getProjectComparableString = (p: Partial<BusinessProject> | undefined | null): string => {
  const sanitized = sanitizeProject(p);
  // Compare all functional business data (excluding transient timestamp differences)
  const { updatedAt, ...functionalData } = sanitized;
  return JSON.stringify(functionalData);
};

type PendingNavigation = 
  | { type: 'select_project'; targetProjectId: string }
  | { type: 'open_project'; targetProjectId: string }
  | { type: 'switch_tab'; targetTab: TabType };

export function App() {
  // Multi-tenant user & session role
  const [currentUser, setCurrentUser] = useState<AppUser>(() => {
    // 1. Check URL parameters first (e.g. from QR scan: ?empresaId=2&role=owner&token=...)
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const role = params.get('role');
        const empresaIdStr = params.get('empresaId');
        if (role === 'owner' && empresaIdStr) {
          const empId = Number(empresaIdStr);
          if (!isNaN(empId) && empId > 0) {
            return {
              id: `owner-empresa-${empId}`,
              email: `owner@empresa${empId}.com`,
              name: `Dueño Empresa #${empId}`,
              role: 'owner',
              empresaId: empId,
            };
          }
        }
      }
    } catch (e) {}

    try {
      const savedUser = localStorage.getItem('vendedor_ia_current_user');
      if (savedUser) {
        return JSON.parse(savedUser);
      }
    } catch (e) {}
    return {
      id: 'admin-super',
      email: 'admin@vendedoria.com',
      name: 'Administrador Principal Vendedor IA',
      role: 'superadmin',
    };
  });

  const currentUserRef = useRef<AppUser>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('role') === 'owner') {
          return 'negocio';
        }
      }
    } catch (e) {}
    return 'empresas';
  });

  const [isMobileSimulatorOpen, setIsMobileSimulatorOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<BusinessProject | null>(null);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedOrderIdForModal, setSelectedOrderIdForModal] = useState<string | null>(null);

  // Multi-tenant projects state
  const [projects, setProjects] = useState<BusinessProject[]>(() => {
    const saved = localStorage.getItem('vendedor_ia_projects');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeProject);
        }
      } catch (e) {
        console.error('Error parsing saved projects:', e);
      }
    }
    return INITIAL_PROJECTS.map(sanitizeProject);
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    try {
      if (typeof window !== 'undefined' && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        const empIdStr = params.get('empresaId');
        if (empIdStr) {
          const empId = Number(empIdStr);
          const found = INITIAL_PROJECTS.find((p) => p.empresaId === empId || p.id === String(empId));
          if (found) return found.id;
        }
      }
    } catch (e) {}
    const savedId = localStorage.getItem('vendedor_ia_active_project_id');
    if (savedId && projects.some((p) => p.id === savedId)) return savedId;
    return projects[0]?.id || 'proj-dulces-bom';
  });

  // Strict tenant isolation: Owners can ONLY see and access their assigned company
  const visibleProjects = useMemo(() => {
    if (currentUser.role === 'owner' && currentUser.empresaId) {
      const filtered = projects.filter(
        (p) => p.empresaId === currentUser.empresaId || p.id === String(currentUser.empresaId)
      );
      return filtered.length > 0 ? filtered : projects;
    }
    return projects;
  }, [projects, currentUser]);

  // Ensure owner is locked into their assigned company and allowed tabs
  useEffect(() => {
    if (currentUser.role === 'owner') {
      if (activeTab === 'empresas') {
        setActiveTab('negocio');
      }
      if (currentUser.empresaId) {
        const matchingProj = projects.find(
          (p) => p.empresaId === currentUser.empresaId || p.id === String(currentUser.empresaId)
        );
        if (matchingProj && activeProjectId !== matchingProj.id) {
          setActiveProjectId(matchingProj.id);
        }
      }
    }
  }, [currentUser, projects, activeProjectId, activeTab]);

  // Public Catalog URL detection (e.g. ?loja=ID, ?catalogo=ID, #loja/ID, /loja/ID)
  const [publicCatalogTargetId, setPublicCatalogTargetId] = useState<string | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const params = new URLSearchParams(window.location.search);
      if (params.get('role') === 'owner' || params.get('role') === 'superadmin') {
        return null;
      }
      const loja = params.get('loja') || params.get('catalogo') || params.get('tienda') || params.get('public');
      if (loja) return loja;

      if (window.location.hash) {
        const hash = window.location.hash;
        const match = hash.match(/#(?:catalogo-|loja\/|loja-|tienda-)([a-zA-Z0-9_-]+)/);
        if (match && match[1]) return match[1];
      }

      if (window.location.pathname) {
        const pathMatch = window.location.pathname.match(/\/(?:loja|catalogo|tienda)\/([a-zA-Z0-9_-]+)/);
        if (pathMatch && pathMatch[1]) return pathMatch[1];
      }
    } catch (e) {}
    return null;
  });

  // Listen to popstate or hashchange events for client navigation
  useEffect(() => {
    const handleUrlChange = () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('role') === 'owner' || params.get('role') === 'superadmin') {
          setPublicCatalogTargetId(null);
          return;
        }
        const loja = params.get('loja') || params.get('catalogo') || params.get('tienda') || params.get('public');
        if (loja) {
          setPublicCatalogTargetId(loja);
          return;
        }
        if (window.location.hash) {
          const match = window.location.hash.match(/#(?:catalogo-|loja\/|loja-|tienda-)([a-zA-Z0-9_-]+)/);
          if (match && match[1]) {
            setPublicCatalogTargetId(match[1]);
            return;
          }
        }
        const pathMatch = window.location.pathname.match(/\/(?:loja|catalogo|tienda)\/([a-zA-Z0-9_-]+)/);
        if (pathMatch && pathMatch[1]) {
          setPublicCatalogTargetId(pathMatch[1]);
          return;
        }
        setPublicCatalogTargetId(null);
      } catch (e) {}
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  // Determine active project for public store
  const publicStoreProject = useMemo(() => {
    if (!publicCatalogTargetId) return null;
    const target = String(publicCatalogTargetId).trim();
    const asNum = Number(target);
    const found = projects.find(
      (p) =>
        (!isNaN(asNum) && asNum > 0 && p.empresaId === asNum) ||
        p.id === target ||
        String(p.empresaId) === target ||
        p.name.toLowerCase().replace(/\s+/g, '-') === target.toLowerCase()
    );
    return found || projects[0];
  }, [publicCatalogTargetId, projects]);

  // Track saved snapshot per project to know if there are unsaved modifications
  const [savedSnapshots, setSavedSnapshots] = useState<Record<string, string>>(() => {
    const initialSnapshots: Record<string, string> = {};
    projects.forEach((p) => {
      initialSnapshots[p.id] = getProjectComparableString(p);
    });
    return initialSnapshots;
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [saveErrorMsg, setSaveErrorMsg] = useState('');
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [isCloudConnected, setIsCloudConnected] = useState(true);
  const [isInitialCloudLoading, setIsInitialCloudLoading] = useState(true);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState<boolean>(isSupabaseConfigured);
  const [isSupabaseLoading, setIsSupabaseLoading] = useState<boolean>(false);

  // Unsaved changes modal state
  const [isUnsavedModalOpen, setIsUnsavedModalOpen] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null);

  // Delete project confirmation modal state
  const [projectToDelete, setProjectToDelete] = useState<BusinessProject | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);

  // Owner Panel QR Modal state
  const [isOwnerQRModalOpen, setIsOwnerQRModalOpen] = useState(false);
  const [ownerQRProject, setOwnerQRProject] = useState<BusinessProject | null>(null);

  const handleOpenOwnerQR = useCallback((proj?: BusinessProject) => {
    setOwnerQRProject(proj || null);
    setIsOwnerQRModalOpen(true);
  }, []);

  // Admin Revoke Owner Access: Disconnects owner panel without touching business data, catalog, or WhatsApp bot
  const handleRevokeOwnerAccess = async (targetProj?: BusinessProject) => {
    const proj = targetProj || activeProject;
    const empId = getActiveEmpresaId(proj);
    setIsSaving(true);
    setSaveErrorMsg('');
    try {
      const { newAccessToken } = await revokeOwnerAccessInSupabase(empId);

      const updatedProject: BusinessProject = sanitizeProject({
        ...proj,
        ownerAccessRevoked: true,
        ownerAccessToken: newAccessToken,
        ownerAccessRevokedAt: new Date().toISOString(),
        config: {
          ...proj.config,
          ownerAccessRevoked: true,
          ownerAccessToken: newAccessToken,
          ownerAccessRevokedAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });

      const updatedList = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
      setProjects(updatedList);
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(updatedList));

      if (ownerQRProject && ownerQRProject.id === updatedProject.id) {
        setOwnerQRProject(updatedProject);
      }

      setSaveSuccessMsg(`Acceso del dueño a la Empresa #${empId} suspendido. Datos del negocio y bot intactos.`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Error al revocar acceso del dueño:', err);
      setSaveErrorMsg(`Error al desconectar acceso del dueño: ${err.message || 'Error de conexión'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Admin Restore Owner Access: Reactivates owner panel and regenerates active token
  const handleRestoreOwnerAccess = async (targetProj?: BusinessProject) => {
    const proj = targetProj || activeProject;
    const empId = getActiveEmpresaId(proj);
    setIsSaving(true);
    setSaveErrorMsg('');
    try {
      const { newAccessToken } = await restoreOwnerAccessInSupabase(empId);

      const updatedProject: BusinessProject = sanitizeProject({
        ...proj,
        ownerAccessRevoked: false,
        ownerAccessToken: newAccessToken,
        ownerAccessRevokedAt: undefined,
        config: {
          ...proj.config,
          ownerAccessRevoked: false,
          ownerAccessToken: newAccessToken,
          ownerAccessRevokedAt: undefined,
        },
        updatedAt: new Date().toISOString(),
      });

      const updatedList = projects.map((p) => (p.id === updatedProject.id ? updatedProject : p));
      setProjects(updatedList);
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(updatedList));

      if (ownerQRProject && ownerQRProject.id === updatedProject.id) {
        setOwnerQRProject(updatedProject);
      }

      setSaveSuccessMsg(`Acceso del dueño a la Empresa #${empId} reactivado con éxito.`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (err: any) {
      console.error('Error al reactivar acceso del dueño:', err);
      setSaveErrorMsg(`Error al reactivar acceso del dueño: ${err.message || 'Error de conexión'}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Persist projects to localStorage continuously as a fast offline backup
  useEffect(() => {
    try {
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(projects));
      localStorage.setItem('vendedor_ia_active_project_id', activeProjectId);
    } catch (e) {
      console.warn('LocalStorage quota or save issue:', e);
    }
  }, [projects, activeProjectId]);

  // Centralized function to fetch and sync exclusively from Supabase
  const handleRefreshFromSupabase = useCallback(async () => {
    setIsInitialCloudLoading(true);
    setSaveErrorMsg('');
    try {
      const supaProjects = await fetchProjectsFromSupabase(currentUserRef.current);
      if (Array.isArray(supaProjects) && supaProjects.length > 0) {
        const sanitized = supaProjects.map(sanitizeProject);
        setProjects(sanitized);
        const snaps: Record<string, string> = {};
        sanitized.forEach((p: BusinessProject) => {
          snaps[p.id] = getProjectComparableString(p);
        });
        setSavedSnapshots(snaps);
        setIsCloudConnected(true);
        setIsSupabaseConnected(true);
        setSaveSuccessMsg(`Sincronizadas ${sanitized.length} empresa(s) desde Supabase`);
        setTimeout(() => setSaveSuccessMsg(''), 4000);
      } else {
        setSaveSuccessMsg('Conectado a Supabase. Inicializando proyectos...');
        setTimeout(() => setSaveSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      console.error('Error al sincronizar con Supabase:', err);
      setIsCloudConnected(false);
      setIsSupabaseConnected(false);
      setSaveErrorMsg(`Error de sincronización con Supabase: ${err?.message || 'Revisa tu conexión'}`);
    } finally {
      setIsInitialCloudLoading(false);
    }
  }, []);

  // 2. Real-time Supabase synchronization across devices and browser sessions
  useEffect(() => {
    let isMounted = true;
    let unsubscribeSupabase = () => {};

    const setupSupabaseSync = async () => {
      setIsInitialCloudLoading(true);
      setSaveErrorMsg('');

      if (!isMounted) return;

      // 1. Initial Supabase fetch
      try {
        const supaProjects = await fetchProjectsFromSupabase(currentUserRef.current);
        if (!isMounted) return;

        if (Array.isArray(supaProjects) && supaProjects.length > 0) {
          console.log(`✅ ${supaProjects.length} empresas recuperadas de Supabase.`);
          const sanitized = supaProjects.map(sanitizeProject);
          setProjects(sanitized);

          const snaps: Record<string, string> = {};
          sanitized.forEach((p: BusinessProject) => {
            snaps[p.id] = getProjectComparableString(p);
          });
          setSavedSnapshots(snaps);
          setIsCloudConnected(true);
          setIsSupabaseConnected(true);
        } else {
          // If Supabase has no project metadata yet, initialize active project into Supabase
          if (projects.length > 0) {
            saveProjectToSupabase(projects[0], currentUserRef.current).catch(() => {});
          }
          setIsCloudConnected(true);
          setIsSupabaseConnected(true);
        }
      } catch (err: any) {
        console.warn('Supabase initial boot fetch notice:', err);
        setIsCloudConnected(false);
      } finally {
        if (isMounted) {
          setIsInitialCloudLoading(false);
        }
      }

      // 2. Real-time listener for remote changes from Supabase (Strict multi-tenant aware)
      unsubscribeSupabase = subscribeToProjectsFromSupabase(
        (freshProjects) => {
          if (!isMounted) return;
          setIsCloudConnected(true);
          setIsSupabaseConnected(true);
          if (Array.isArray(freshProjects) && freshProjects.length > 0) {
            const sanitized = freshProjects.map(sanitizeProject);
            setProjects(sanitized);

            const snaps: Record<string, string> = {};
            sanitized.forEach((p: BusinessProject) => {
              snaps[p.id] = getProjectComparableString(p);
            });
            setSavedSnapshots((prev) => ({ ...prev, ...snaps }));
          }
        },
        (err) => {
          console.warn('Supabase real-time connection status:', err);
        },
        () => currentUserRef.current
      );
    };

    setupSupabaseSync();

    // Fallback sync with local backend server
    fetch('/api/projects', {
      headers: {
        'x-user-role': currentUserRef.current.role,
        'x-empresa-id': String(currentUserRef.current.empresaId || 1),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects((prev) => (prev.length === 0 ? data.projects.map(sanitizeProject) : prev));
        }
      })
      .catch((err) => console.log('Conectando al backend local...', err));

    return () => {
      isMounted = false;
      unsubscribeSupabase();
    };
  }, []);

  // Resolve active project safely
  const resolvedProject = 
    projects.find((p) => p.id === activeProjectId) || 
    projects[0] || 
    INITIAL_PROJECTS[0];

  const activeProject: BusinessProject = sanitizeProject(resolvedProject);

  // Compute if active project has unsaved changes compared to last saved snapshot
  const activeComparable = useMemo(() => getProjectComparableString(activeProject), [activeProject]);
  const activeProjectSnapshot = savedSnapshots[activeProject.id];

  const hasUnsavedChanges = useMemo(() => {
    if (!activeProjectSnapshot) return false;
    return activeComparable !== activeProjectSnapshot;
  }, [activeComparable, activeProjectSnapshot]);

  // Obtener identificación numérica para la tabla 'empresa' y 'productos.id_empresa'
  const getActiveEmpresaId = useCallback((proj: BusinessProject | undefined): number => {
    if (!proj) return 1;
    if (typeof proj.empresaId === 'number' && proj.empresaId > 0) {
      return proj.empresaId;
    }
    const digitsOnly = proj.id.replace(/\D/g, '');
    const parsed = parseInt(digitsOnly, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
    const idx = projects.findIndex((p) => p.id === proj.id);
    return idx >= 0 ? idx + 1 : 1;
  }, [projects]);

  // Sincronización central con Supabase: loadEmpresas()
  const loadEmpresas = useCallback(async () => {
    if (!isSupabaseConfigured) return [];
    setIsSupabaseLoading(true);
    try {
      const empresas = await fetchEmpresasFromSupabase(currentUserRef.current);
      if (Array.isArray(empresas) && empresas.length > 0) {
        console.log(`[loadEmpresas] ✅ ${empresas.length} empresa(s) cargadas desde Supabase.`);
        setIsSupabaseConnected(true);

        setProjects((prevProjects) => {
          const updated = [...prevProjects];
          empresas.forEach((emp, index) => {
            const empIdNum = emp.identificación || emp.identificacion || (index + 1);
            const foundIdx = updated.findIndex(
              (p) => p.empresaId === empIdNum || p.id === String(empIdNum) || p.id === `empresa-${empIdNum}` || (index === 0 && p.id === 'proj-pudim-01')
            );
            if (foundIdx >= 0) {
              updated[foundIdx] = {
                ...updated[foundIdx],
                empresaId: empIdNum,
                name: emp.nombre || updated[foundIdx].name,
              };
            } else {
              const compName = emp.nombre || `Empresa #${empIdNum}`;
              updated.push(
                sanitizeProject({
                  id: String(empIdNum),
                  empresaId: empIdNum,
                  name: compName,
                  category: 'General',
                  businessType: 'Comercio',
                  config: {
                    ...INITIAL_BUSINESS_CONFIG,
                    id: String(empIdNum),
                    name: compName,
                    currency: 'BRL',
                  },
                  catalog: [],
                })
              );
            }
          });
          return updated;
        });
        return empresas;
      }
      return [];
    } catch (err: any) {
      console.warn('[loadEmpresas] Error al cargar empresas de Supabase:', err);
      return [];
    } finally {
      setIsSupabaseLoading(false);
    }
  }, []);

  // Carga inicial de empresas desde Supabase al iniciar la aplicación
  useEffect(() => {
    loadEmpresas();
  }, [loadEmpresas]);

  // Sincronización con Supabase: Cargar productos para la empresa activa
  // Enforce isolation: productos.id_empresa = empresa.identificación
  useEffect(() => {
    if (!isSupabaseConfigured || !activeProject) return;

    let isMounted = true;
    const currentEmpresaId = getActiveEmpresaId(activeProject);

    const loadProductos = async () => {
      try {
        const prods = await fetchProductosByEmpresa(currentEmpresaId);
        if (!isMounted) return;
        if (Array.isArray(prods)) {
          console.log(`[Supabase] ✅ ${prods.length} productos cargados para empresa #${currentEmpresaId}.`);
          setIsSupabaseConnected(true);
          setProjects((prev) =>
            prev.map((p) => {
              if (p.id === activeProject.id) {
                return {
                  ...p,
                  empresaId: currentEmpresaId,
                  catalog: prods,
                };
              }
              return p;
            })
          );
        }
      } catch (err) {
        console.warn(`[Supabase] Error al cargar productos de empresa #${currentEmpresaId}:`, err);
      }
    };

    loadProductos();

    // Suscripción a cambios en tiempo real en la tabla productos para esta empresa
    const unsubscribe = subscribeToProductosByEmpresa(currentEmpresaId, () => {
      if (isMounted) {
        loadProductos();
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeProjectId, activeProject?.empresaId, getActiveEmpresaId]);

  // Warn on page reload or close if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = 'Tienes cambios sin guardar. ¿Seguro que deseas salir?';
        return 'Tienes cambios sin guardar. ¿Seguro que deseas salir?';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Helper to update active project state
  const updateActiveProject = (updatedFields: Partial<BusinessProject>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === activeProjectId) {
          return {
            ...p,
            ...updatedFields,
            updatedAt: new Date().toISOString(),
          };
        }
        return p;
      })
    );
  };

  // Central Permanent Save Function (Supports manual and debounced auto-save)
  const handleSaveAllChanges = async (isAutoSave = false): Promise<boolean> => {
    setIsSaving(true);
    setSaveSuccessMsg('');
    setSaveErrorMsg('');

    try {
      // 1. Ensure project has updated timestamp and clean properties
      const projectToSave: BusinessProject = sanitizeProject({
        ...activeProject,
        updatedAt: new Date().toISOString(),
      });

      const updatedProjectsList = projects.map((p) =>
        p.id === projectToSave.id ? projectToSave : p
      );

      // 2. Persist directly and exclusively to Supabase
      if (isSupabaseConfigured) {
        await saveProjectToSupabase(projectToSave, currentUserRef.current);
      }

      // 3. Persist in LocalStorage under global and per-project keys
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(updatedProjectsList));
      localStorage.setItem('vendedor_ia_active_project_id', projectToSave.id);
      localStorage.setItem(`vendedor_ia_project_${projectToSave.id}`, JSON.stringify(projectToSave));

      // 4. Update React projects state
      setProjects(updatedProjectsList);
      setIsCloudConnected(true);
      setIsSupabaseConnected(true);

      // 5. Persist on server API in background with authenticated headers
      try {
        const authHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          'x-user-role': currentUserRef.current.role,
          'x-empresa-id': String(currentUserRef.current.empresaId || projectToSave.empresaId || 1),
        };

        await fetch(`/api/projects/${projectToSave.id}`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(projectToSave),
        });

        await fetch('/api/projects/sync', {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify({ projects: updatedProjectsList }),
        });
      } catch (err) {
        console.warn('Servidor local backend en segundo plano:', err);
      }

      // 6. ONLY AFTER ALL SAVES CONFIRMED: Update memory snapshots & clear dirty flag (immediately dismisses bottom banner)
      const serialized = getProjectComparableString(projectToSave);
      setSavedSnapshots((prev) => ({
        ...prev,
        [projectToSave.id]: serialized,
      }));

      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(nowTime);
      setSaveSuccessMsg(
        isAutoSave 
          ? `Guardado automático en Supabase (${projectToSave.name})` 
          : `¡Cambios de "${projectToSave.name}" guardados con éxito en Supabase!`
      );
      setTimeout(() => setSaveSuccessMsg(''), 4500);

      return true;
    } catch (e: any) {
      console.error('Error during permanent save to Supabase:', e);
      setIsCloudConnected(false);
      setIsSupabaseConnected(false);
      setSaveErrorMsg(
        navigator.onLine 
          ? `Error al guardar en Supabase: ${e?.message || 'Verifica la conexión a Supabase'}` 
          : 'Sin conexión a Internet. Cambios guardados localmente.'
      );
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // 3. Debounced Auto-Save: Whenever active project changes, automatically save to Supabase after 1 second of inactivity
  useEffect(() => {
    if (!hasUnsavedChanges || isSaving) return;

    const timer = setTimeout(() => {
      console.log('⚡ Guardado automático en Supabase activado...');
      handleSaveAllChanges(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [activeComparable, hasUnsavedChanges, isSaving]);

  // Navigation with Unsaved Changes Guard
  const handleSelectProjectWithGuard = (targetProjectId: string) => {
    if (targetProjectId === activeProjectId) return;
    if (hasUnsavedChanges) {
      setPendingNavigation({ type: 'select_project', targetProjectId });
      setIsUnsavedModalOpen(true);
    } else {
      setActiveProjectId(targetProjectId);
    }
  };

  const handleOpenProjectWithGuard = (targetProjectId: string) => {
    if (hasUnsavedChanges && targetProjectId !== activeProjectId) {
      setPendingNavigation({ type: 'open_project', targetProjectId });
      setIsUnsavedModalOpen(true);
    } else {
      setActiveProjectId(targetProjectId);
      setActiveTab('negocio');
    }
  };

  const handleTabChangeWithGuard = (targetTab: TabType) => {
    if (targetTab === 'proyectos' && hasUnsavedChanges && activeTab !== 'proyectos') {
      setPendingNavigation({ type: 'switch_tab', targetTab });
      setIsUnsavedModalOpen(true);
    } else {
      setActiveTab(targetTab);
    }
  };

  // Unsaved Modal Actions
  const handleModalSaveAndExit = async () => {
    const success = await handleSaveAllChanges();
    if (success && pendingNavigation) {
      if (pendingNavigation.type === 'select_project') {
        setActiveProjectId(pendingNavigation.targetProjectId);
      } else if (pendingNavigation.type === 'open_project') {
        setActiveProjectId(pendingNavigation.targetProjectId);
        setActiveTab('negocio');
      } else if (pendingNavigation.type === 'switch_tab') {
        setActiveTab(pendingNavigation.targetTab);
      }
    }
    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  };

  const handleModalExitWithoutSaving = () => {
    // Revert active project in state to last saved snapshot
    if (savedSnapshots[activeProject.id]) {
      try {
        const revertedProject = sanitizeProject(JSON.parse(savedSnapshots[activeProject.id]));
        setProjects((prev) =>
          prev.map((p) => (p.id === revertedProject.id ? revertedProject : p))
        );
      } catch (e) {
        console.error('Error reverting project snapshot:', e);
      }
    }

    if (pendingNavigation) {
      if (pendingNavigation.type === 'select_project') {
        setActiveProjectId(pendingNavigation.targetProjectId);
      } else if (pendingNavigation.type === 'open_project') {
        setActiveProjectId(pendingNavigation.targetProjectId);
        setActiveTab('negocio');
      } else if (pendingNavigation.type === 'switch_tab') {
        setActiveTab(pendingNavigation.targetTab);
      }
    }

    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  };

  const handleModalCancel = () => {
    setIsUnsavedModalOpen(false);
    setPendingNavigation(null);
  };

  // Central Create Empresa function with strict Supabase confirmation
  const handleCreateProject = async (newProj: BusinessProject): Promise<boolean> => {
    // 1. Validar los datos
    if (!newProj || !newProj.name || !newProj.name.trim()) {
      setSaveErrorMsg('El nombre de la empresa es obligatorio.');
      return false;
    }

    setIsSaving(true);
    setSaveErrorMsg('');
    setSaveSuccessMsg('');

    try {
      // 2. Obtener el próximo ID único para la empresa en Supabase
      let nextEmpresaId = newProj.empresaId;
      if (!nextEmpresaId || nextEmpresaId <= 0) {
        if (isSupabaseConfigured) {
          nextEmpresaId = await getNextEmpresaIdFromSupabase();
        } else {
          const maxExisting = Math.max(0, ...projects.map((p) => p.empresaId || 0));
          nextEmpresaId = maxExisting + 1;
        }
      }

      // 3. Crear y confirmar la empresa en Supabase primero (INSERT con .select())
      if (isSupabaseConfigured) {
        console.log(`[createEmpresa] Insertando empresa #${nextEmpresaId} ("${newProj.name}") en Supabase...`);
        const result = await createEmpresaInSupabase(nextEmpresaId, newProj.name);
        if (!result || !result.success) {
          throw new Error('Supabase no confirmó la creación de la empresa.');
        }
        setIsSupabaseConnected(true);
      }

      // 4. Inicializar registro completamente aislado
      const initialized: BusinessProject = {
        ...newProj,
        id: String(newProj.id || `proj-${Date.now()}-${nextEmpresaId}`),
        empresaId: nextEmpresaId,
        catalog: [], // Catálogo estrictamente vacío para nueva empresa (aislamiento total)
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        status: 'ativo',
      };

      // 5. Persistir en Supabase y Servidor
      try {
        await saveProjectToSupabase(initialized);
      } catch (supaErr: any) {
        console.warn('Aviso de persistencia Supabase:', supaErr?.message);
      }

      try {
        await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialized),
        });
      } catch (srvErr) {
        console.warn('Aviso de persistencia en servidor local:', srvErr);
      }

      // 6. Actualizar el estado de React y seleccionar automáticamente la nueva empresa
      const updatedList = [initialized, ...projects];
      setProjects(updatedList);
      setActiveProjectId(initialized.id);
      setSavedSnapshots((prev) => ({
        ...prev,
        [initialized.id]: getProjectComparableString(initialized),
      }));

      // 7. Cerrar modal y cambiar a pestaña de gestión
      setIsNewProjectModalOpen(false);
      setEditingProject(null);
      setActiveTab('negocio');

      // 8. Mostrar mensaje de confirmación exitosa de Supabase
      setSaveSuccessMsg(`¡Empresa "${initialized.name}" guardada y registrada correctamente en Supabase! (ID Empresa: ${nextEmpresaId})`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);

      return true;
    } catch (err: any) {
      console.error('[createEmpresa] ❌ Error real en creación de empresa:', err);
      setIsSupabaseConnected(false);
      setSaveErrorMsg(`Error al crear empresa en Supabase: ${err?.message || 'Fallo en INSERT'}`);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Update existing company / project
  const handleUpdateExistingProject = async (updatedProject: BusinessProject) => {
    const sanitized = sanitizeProject({
      ...updatedProject,
      updatedAt: new Date().toISOString(),
    });

    const updatedList = projects.map((p) => (p.id === sanitized.id ? sanitized : p));
    setProjects(updatedList);
    if (activeProjectId === sanitized.id) {
      setSavedSnapshots((prev) => ({
        ...prev,
        [sanitized.id]: getProjectComparableString(sanitized),
      }));
    }

    setIsNewProjectModalOpen(false);
    setEditingProject(null);

    try {
      await saveProjectToSupabase(sanitized);
      setSaveErrorMsg('');
      setSaveSuccessMsg(`¡Datos de "${sanitized.name}" actualizados y guardados en Supabase!`);
      setTimeout(() => setSaveSuccessMsg(''), 4500);
    } catch (e: any) {
      console.error('Error saving updated company to Supabase:', e);
      setSaveErrorMsg(`Cambios guardados localmente, pero falló Supabase: ${e?.message || 'Error de conexión'}`);
    }

    try {
      await fetch(`/api/projects/${sanitized.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitized),
      });
    } catch (e) {
      console.error('Error saving updated company to server:', e);
    }
  };

  // Duplicate Project
  const handleDuplicateProject = async (projectId: string) => {
    const source = projects.find((p) => p.id === projectId);
    if (!source) return;

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

    const updatedList = [duplicate, ...projects];
    setProjects(updatedList);
    setActiveProjectId(newId);
    setSavedSnapshots((prev) => ({
      ...prev,
      [newId]: getProjectComparableString(duplicate),
    }));

    try {
      await saveProjectToSupabase(duplicate);
      setSaveErrorMsg('');
      setSaveSuccessMsg(`Empresa "${source.name}" duplicada y guardada en Supabase.`);
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (e: any) {
      console.error('Error saving duplicated project to Supabase:', e);
      setSaveErrorMsg(`Empresa duplicada localmente, pero falló en Supabase: ${e?.message || 'Error de conexión'}`);
    }

    try {
      await fetch(`/api/projects/${projectId}/duplicate`, { method: 'POST' });
    } catch (e) {
      console.error('Error duplicating on server:', e);
    }
  };

  // Safe Project Deletion Handlers
  const handleRequestDeleteProject = (project: BusinessProject) => {
    setProjectToDelete(project);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeleteProject = async (projectId: string) => {
    const target = projects.find((p) => p.id === projectId) || projectToDelete;
    const targetName = target?.name || 'Proyecto';

    setIsDeletingProject(true);

    // 1. Delete on Supabase (full cascade: products, metadata row, secondary tables, and company)
    try {
      const targetEmpresaId = target?.empresaId || getActiveEmpresaId(target);
      if (targetEmpresaId) {
        await deleteEmpresaFromSupabase(targetEmpresaId, currentUserRef.current);
      }
      setSaveErrorMsg('');
      setSaveSuccessMsg(`Empresa "${targetName}" y todos sus datos han sido eliminados de Supabase.`);
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (e: any) {
      console.error('Error deleting project from Supabase:', e);
      setSaveErrorMsg(`Aviso al eliminar de Supabase: ${e?.message || 'Error'}`);
    }

    // 2. Delete on server backend
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'x-user-role': currentUserRef.current.role,
          'x-empresa-id': String(target?.empresaId || 1),
        },
      });
    } catch (e) {
      console.error('Error deleting project on server:', e);
    }

    // 3. Clean up snapshots cache & local storage
    try {
      localStorage.removeItem(`vendedor_ia_project_${projectId}`);
    } catch (err) {
      console.warn('LocalStorage cleanup error:', err);
    }

    setSavedSnapshots((prev) => {
      const copy = { ...prev };
      delete copy[projectId];
      return copy;
    });

    // 4. Update projects in state and localStorage
    const remaining = projects.filter((p) => p.id !== projectId);

    if (remaining.length === 0) {
      // If user deleted the last remaining project, create a fresh one to keep the app operational
      const freshProject: BusinessProject = {
        ...INITIAL_PROJECTS[0],
        id: `proj-${Date.now()}`,
        name: 'Mi Nuevo Negocio',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProjects([freshProject]);
      setActiveProjectId(freshProject.id);
      setSavedSnapshots({ [freshProject.id]: getProjectComparableString(freshProject) });
      localStorage.setItem('vendedor_ia_projects', JSON.stringify([freshProject]));
      localStorage.setItem('vendedor_ia_active_project_id', freshProject.id);
    } else {
      setProjects(remaining);
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(remaining));
      // If the deleted project was the active project, smoothly switch to the first available project
      if (activeProjectId === projectId) {
        setActiveProjectId(remaining[0].id);
        localStorage.setItem('vendedor_ia_active_project_id', remaining[0].id);
      }
    }

    addToast('info', 'Empresa eliminada', `La empresa "${targetName}" fue eliminada por completo.`);

    // 5. Close delete modal
    setIsDeletingProject(false);
    setIsDeleteModalOpen(false);
    setProjectToDelete(null);
  };

  const handleUpdateConfig = (newConfig: BusinessConfig) => {
    updateActiveProject({ config: newConfig, name: newConfig.name });
  };

  // Product CRUD (Supabase como fuente principal con aislamiento estricto por id_empresa)
  const handleAddCatalogItem = async (newItem: Omit<CatalogItem, 'id'>) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);

    let createdSupabaseItem: CatalogItem | null = null;
    if (isSupabaseConfigured) {
      try {
        createdSupabaseItem = await createProductoInSupabase(newItem, currentEmpresaId, currentUserRef.current);
        if (createdSupabaseItem) {
          setIsSupabaseConnected(true);
          // Recargar inmediatamente desde Supabase para verificar almacenamiento real
          const freshProds = await fetchProductosByEmpresa(currentEmpresaId);
          if (freshProds && freshProds.length > 0) {
            updateActiveProject({ catalog: freshProds });
            setSaveSuccessMsg(`¡Producto "${createdSupabaseItem.name}" guardado e indexado en Supabase! (Empresa #${currentEmpresaId})`);
            setTimeout(() => setSaveSuccessMsg(''), 4500);
            return;
          }
        }
      } catch (err: any) {
        console.error('[Supabase] Error al insertar producto en Supabase:', err);
        setSaveErrorMsg(`Error al guardar en Supabase: ${err?.message || 'Error en tabla productos'}`);
        setTimeout(() => setSaveErrorMsg(''), 5000);
      }
    }

    const itemWithId: CatalogItem = createdSupabaseItem || {
      ...newItem,
      id: generateUUID(),
    };

    const updated = [...(activeProject.catalog || []), itemWithId];
    updateActiveProject({ catalog: updated });
    setSaveSuccessMsg(`Producto "${itemWithId.name}" registrado en Supabase (Empresa #${currentEmpresaId}).`);
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  const handleAddMultipleCatalogItems = async (items: CatalogItem[]) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);

    if (isSupabaseConfigured && items.length > 0) {
      try {
        await syncCatalogToSupabase(items, currentEmpresaId, currentUserRef.current);
        const freshProds = await fetchProductosByEmpresa(currentEmpresaId);
        if (freshProds && freshProds.length > 0) {
          updateActiveProject({ catalog: freshProds });
          setSaveSuccessMsg(`${freshProds.length} producto(s) confirmados en Supabase (Empresa #${currentEmpresaId}).`);
          setTimeout(() => setSaveSuccessMsg(''), 5000);
          return;
        }
      } catch (err: any) {
        console.warn('[Supabase] Sincronización múltiple falló:', err?.message);
      }
    }

    const updated = [...(activeProject.catalog || [])];
    for (const item of items) {
      const existingIdx = updated.findIndex((c) => c.id === item.id || (item.sku && c.sku === item.sku));
      if (existingIdx >= 0) {
        updated[existingIdx] = item;
      } else {
        updated.push(item);
      }
    }
    updateActiveProject({ catalog: updated });
    setSaveSuccessMsg(`${items.length} producto(s) añadidos a ${activeProject.name} (Empresa #${currentEmpresaId}).`);
    setTimeout(() => setSaveSuccessMsg(''), 5000);
  };

  const handleUpdateCatalogItem = async (updatedItem: CatalogItem) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);

    if (isSupabaseConfigured) {
      try {
        await updateProductoInSupabase(updatedItem.id, updatedItem, currentEmpresaId, currentUserRef.current);
        const freshProds = await fetchProductosByEmpresa(currentEmpresaId);
        if (freshProds && freshProds.length > 0) {
          updateActiveProject({ catalog: freshProds });
          setSaveSuccessMsg(`Producto "${updatedItem.name}" actualizado y verificado en Supabase.`);
          setTimeout(() => setSaveSuccessMsg(''), 3500);
          return;
        }
      } catch (err: any) {
        console.warn('[Supabase] Error al actualizar producto en Supabase:', err);
      }
    }

    const updated = (activeProject.catalog || []).map((i) =>
      i.id === updatedItem.id ? updatedItem : i
    );
    updateActiveProject({ catalog: updated });
  };

  const handleDeleteCatalogItem = async (id: string) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);

    if (isSupabaseConfigured) {
      try {
        await deleteProductoFromSupabase(id, currentEmpresaId, currentUserRef.current);
        const freshProds = await fetchProductosByEmpresa(currentEmpresaId);
        updateActiveProject({ catalog: freshProds });
        setSaveSuccessMsg(`Producto eliminado de Supabase (Empresa #${currentEmpresaId}).`);
        setTimeout(() => setSaveSuccessMsg(''), 3500);
        return;
      } catch (err: any) {
        console.warn('[Supabase] Error al eliminar producto en Supabase:', err);
      }
    }

    const updated = (activeProject.catalog || []).filter((i) => i.id !== id);
    updateActiveProject({ catalog: updated });
  };

  // Services CRUD
  const handleAddService = async (newServ: Omit<ServiceItem, 'id'>) => {
    const servWithId: ServiceItem = { ...newServ, id: `serv-${Date.now()}` };
    const updated = [...(activeProject.services || []), servWithId];
    updateActiveProject({ services: updated });
  };

  const handleUpdateService = async (updatedServ: ServiceItem) => {
    const updated = (activeProject.services || []).map((s) =>
      s.id === updatedServ.id ? updatedServ : s
    );
    updateActiveProject({ services: updated });
  };

  const handleDeleteService = async (id: string) => {
    const updated = (activeProject.services || []).filter((s) => s.id !== id);
    updateActiveProject({ services: updated });
  };

  // Professionals CRUD
  const handleAddProfessional = async (newProf: Omit<Professional, 'id'>) => {
    const profWithId: Professional = { ...newProf, id: `prof-${Date.now()}` };
    const updated = [...(activeProject.professionals || []), profWithId];
    updateActiveProject({ professionals: updated });
  };

  const handleUpdateProfessional = async (updatedProf: Professional) => {
    const updated = (activeProject.professionals || []).map((p) =>
      p.id === updatedProf.id ? updatedProf : p
    );
    updateActiveProject({ professionals: updated });
  };

  const handleDeleteProfessional = async (id: string) => {
    const updated = (activeProject.professionals || []).filter((p) => p.id !== id);
    updateActiveProject({ professionals: updated });
  };

  // Working Hours Save
  const handleSaveWorkingHours = async (config: WorkingHoursConfig) => {
    updateActiveProject({ workingHours: config });
  };

  // Appointments CRUD
  const handleAddAppointment = async (newAppt: Omit<Appointment, 'id' | 'createdAt'>) => {
    const apptWithId: Appointment = {
      ...newAppt,
      id: `appt-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [apptWithId, ...(activeProject.appointments || [])];
    updateActiveProject({ appointments: updated });
  };

  const handleUpdateAppointmentStatus = async (id: string, status: Appointment['status']) => {
    const updated = (activeProject.appointments || []).map((a) =>
      a.id === id ? { ...a, status } : a
    );
    updateActiveProject({ appointments: updated });
  };

  // Orders CRUD
  const handleAddOrder = async (order: Partial<CustomerOrder>) => {
    const subtotal = order.subtotal || 0;
    const discount = order.discount || 0;
    const pendingFields = order.pendingFields || [];
    const orderWithId: CustomerOrder = {
      id: order.id || `order-${Date.now()}`,
      orderNumber: order.orderNumber,
      empresaId: order.empresaId || getActiveEmpresaId(activeProject),
      empresaName: order.empresaName || activeProject.name,
      customerName: order.customerName !== undefined ? order.customerName : 'Cliente',
      customerPhone: order.customerPhone || '',
      customerAddress: order.customerAddress || '',
      deliveryType: order.deliveryType || 'delivery',
      streetNumber: order.streetNumber || '',
      complement: order.complement || '',
      neighborhood: order.neighborhood || '',
      city: order.city || '',
      reference: order.reference || '',
      paymentStatus: order.paymentStatus || 'PENDIENTE',
      items: order.items || [],
      subtotal: subtotal,
      discountPercentage: order.discountPercentage || 0,
      discount: discount,
      subtotalWithDiscount: order.subtotalWithDiscount || (subtotal - discount),
      shippingFee: order.shippingFee || 0,
      total: order.total || (subtotal - discount),
      paymentMethod: order.paymentMethod || 'Efectivo',
      paymentMethodId: order.paymentMethodId || 'efectivo',
      status: (order.status as CustomerOrder['status']) || (order.transferredToHuman ? 'EN_ATENCION' : 'CONFIRMADO'),
      createdAt: order.createdAt || new Date().toISOString(),
      notes: order.notes || '',
      transferredToHuman: order.transferredToHuman || false,
      transferredAt: order.transferredAt,
      pendingFields,
    };
    const updated = [orderWithId, ...(activeProject.orders || [])];

    // Deduct stock for items in order
    let updatedCatalog = activeProject.catalog;
    if (Array.isArray(order.items) && order.items.length > 0) {
      updatedCatalog = (activeProject.catalog || []).map((catItem) => {
        const matchingItem = order.items?.find((it) => it.productId === catItem.id);
        if (matchingItem) {
          const currentQty = catItem.stockQuantity !== undefined ? catItem.stockQuantity : (catItem.inStock ? 10 : 0);
          const newQty = Math.max(0, currentQty - (matchingItem.quantity || 1));
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

    updateActiveProject({ orders: updated, catalog: updatedCatalog, cart: [] });

    // Notificación detallada de nuevo pedido con todos los datos recopilados por la IA
    const customerInfo = orderWithId.customerName && orderWithId.customerName !== 'Cliente'
      ? `${orderWithId.customerName}${orderWithId.customerPhone ? ` (${orderWithId.customerPhone})` : ''}`
      : (orderWithId.customerPhone ? `Tel: ${orderWithId.customerPhone}` : 'Cliente (Nombre pendiente)');
    
    const itemsCount = orderWithId.items?.reduce((s, it) => s + (it.quantity || 1), 0) || 0;
    const totalFormatted = `R$ ${orderWithId.total.toFixed(2)}`;
    const pendingMsg = pendingFields.length > 0
      ? ` • ⚠️ Falta completar: ${pendingFields.join(', ')}`
      : ' • ✅ Datos completos';

    addToast(
      orderWithId.transferredToHuman ? 'info' : 'success',
      orderWithId.transferredToHuman
        ? `🛎️ Pedido transferido a atención humana (${orderWithId.orderNumber || ''})`
        : `🛍️ ¡Nuevo pedido recibido! (${orderWithId.orderNumber || ''})`,
      `${customerInfo} | ${itemsCount} prod. | Total: ${totalFormatted} | Pago: ${orderWithId.paymentMethod || 'No indicado'}${pendingMsg}`
    );

    try {
      await saveProjectToSupabase({
        ...activeProject,
        orders: updated,
        catalog: updatedCatalog,
      });
    } catch (e) {
      console.warn('Auto-save order to Supabase:', e);
    }
  };

  // Knowledge Items CRUD
  const handleAddKnowledgeItem = (item: Omit<AiKnowledgeItem, 'id' | 'createdAt'>) => {
    const newItem: AiKnowledgeItem = {
      ...item,
      id: `kn-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [newItem, ...(activeProject.aiKnowledge || [])];
    updateActiveProject({ aiKnowledge: updated });
  };

  const handleUpdateKnowledgeItem = (item: AiKnowledgeItem) => {
    const updated = (activeProject.aiKnowledge || []).map((k) =>
      k.id === item.id ? item : k
    );
    updateActiveProject({ aiKnowledge: updated });
  };

  const handleDeleteKnowledgeItem = (id: string) => {
    const updated = (activeProject.aiKnowledge || []).filter((k) => k.id !== id);
    updateActiveProject({ aiKnowledge: updated });
  };

  // Unanswered Questions handling & auto training
  const handleAnswerQuestion = async (qId: string, answer: string, saveToFaq: boolean) => {
    const qIndex = (activeProject.unansweredQuestions || []).findIndex((q) => q.id === qId);
    if (qIndex >= 0) {
      const qList = [...(activeProject.unansweredQuestions || [])];
      const targetQ = { ...qList[qIndex] };
      targetQ.status = 'answered';
      targetQ.adminAnswer = answer;
      targetQ.answeredAt = new Date().toISOString();
      qList[qIndex] = targetQ;

      let updatedFaqs = [...(activeProject.faqs || [])];
      let updatedKnowledge = [...(activeProject.aiKnowledge || [])];

      if (saveToFaq) {
        updatedFaqs.unshift({
          id: `faq-learned-${Date.now()}`,
          category: 'Dudas Frecuentes',
          question: targetQ.question,
          answer: answer,
        });

        updatedKnowledge.unshift({
          id: `kn-learned-${Date.now()}`,
          title: `Pregunta Aprendida: ${targetQ.question.substring(0, 40)}`,
          category: 'geral',
          content: `Pregunta del cliente: "${targetQ.question}"\nRespuesta oficial: ${answer}`,
          createdAt: new Date().toISOString(),
        });
      }

      updateActiveProject({
        unansweredQuestions: qList,
        faqs: updatedFaqs,
        aiKnowledge: updatedKnowledge,
      });
    }
  };

  // FAQ CRUD
  const handleAddFaq = async (newFaq: Omit<FAQItem, 'id'>) => {
    const faqWithId: FAQItem = { ...newFaq, id: `faq-${Date.now()}` };
    const updated = [...(activeProject.faqs || []), faqWithId];
    updateActiveProject({ faqs: updated });
  };

  const handleUpdateFaq = async (updatedFaq: FAQItem) => {
    const updated = (activeProject.faqs || []).map((f) =>
      f.id === updatedFaq.id ? updatedFaq : f
    );
    updateActiveProject({ faqs: updated });
  };

  const handleDeleteFaq = async (id: string) => {
    const updated = (activeProject.faqs || []).filter((f) => f.id !== id);
    updateActiveProject({ faqs: updated });
  };

  // Leads
  const handleCaptureLeadFromSim = async (lead: CapturedLead) => {
    const updated = [lead, ...(activeProject.leads || [])];
    updateActiveProject({ leads: updated });
    try {
      await saveProjectToSupabase({
        ...activeProject,
        leads: updated,
      });
    } catch (e) {
      console.warn('Auto-save lead to Supabase:', e);
    }
  };

  const handleAddUnansweredQuestionFromSim = async (newQ: UnansweredQuestion) => {
    const exists = (activeProject.unansweredQuestions || []).some(
      (q) => q.question.toLowerCase() === newQ.question.toLowerCase()
    );
    if (!exists) {
      const updated = [newQ, ...(activeProject.unansweredQuestions || [])];
      updateActiveProject({ unansweredQuestions: updated });
      try {
        await saveProjectToSupabase({
          ...activeProject,
          unansweredQuestions: updated,
        });
      } catch (e) {
        console.warn('Auto-save unanswered question to Supabase:', e);
      }
    }
  };

  const handleUpdateLeadStatus = async (id: string, status: CapturedLead['status']) => {
    const updated = (activeProject.leads || []).map((l) =>
      l.id === id ? { ...l, status } : l
    );
    updateActiveProject({ leads: updated });
  };

  // Toast Notifications State
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const addToast = (type: 'success' | 'error' | 'info', title: string, message?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Orders Management Handlers
  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);
    const orders = activeProject.orders || [];
    const updatedOrders = orders.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));

    // 1. Optimistic UI update
    updateActiveProject({ orders: updatedOrders });

    // 2. Persist to Supabase metadata blob and dedicated tables
    try {
      if (isSupabaseConfigured) {
        await updateOrderStatusInSupabase(currentEmpresaId, orderId, newStatus, currentUserRef.current);
      }
      setIsSupabaseConnected(true);
    } catch (supaErr: any) {
      console.warn('[Supabase] Error al actualizar estado de pedido:', supaErr?.message || supaErr);
      // Fallback: full project save
      try {
        await saveProjectToSupabase({ ...activeProject, orders: updatedOrders }, currentUserRef.current);
      } catch (fallbackErr) {
        console.error('Fallback saveProjectToSupabase error:', fallbackErr);
      }
    }

    // 3. Persist to LocalStorage
    try {
      const updatedProject = {
        ...activeProject,
        orders: updatedOrders,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`vendedor_ia_project_${activeProject.id}`, JSON.stringify(updatedProject));
      const allUpdated = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(allUpdated));
    } catch (e) {
      console.warn('LocalStorage error:', e);
    }

    // 4. Update on server backend
    try {
      await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-empresa-id': String(currentEmpresaId),
          'x-user-role': currentUserRef.current.role,
        },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (srvErr) {
      console.warn('Error updating order on server backend:', srvErr);
    }

    addToast('success', 'Estado de pedido actualizado', `El pedido #${orderId.slice(-6).toUpperCase()} cambió a ${newStatus}.`);
  };

  // Update order details (attendant completing or editing missing/transferred customer data)
  const handleUpdateOrder = async (orderId: string, updatedFields: Partial<CustomerOrder>) => {
    const currentEmpresaId = getActiveEmpresaId(activeProject);
    const orders = activeProject.orders || [];
    const updatedOrders = orders.map((o) => {
      if (o.id !== orderId) return o;
      const merged = { ...o, ...updatedFields };
      const pending: Array<'customerName' | 'customerPhone' | 'customerAddress' | 'paymentMethod'> = [];
      if (!merged.customerName || merged.customerName.trim() === '' || merged.customerName.toLowerCase() === 'cliente') {
        pending.push('customerName');
      }
      if (!merged.customerPhone || merged.customerPhone.trim() === '') {
        pending.push('customerPhone');
      }
      if (!merged.customerAddress && merged.deliveryType !== 'pickup') {
        pending.push('customerAddress');
      }
      if (!merged.paymentMethod || merged.paymentMethod.trim() === '') {
        pending.push('paymentMethod');
      }
      merged.pendingFields = pending;
      merged.updatedAt = new Date().toISOString();
      return merged;
    });

    updateActiveProject({ orders: updatedOrders });

    try {
      const updatedProject = {
        ...activeProject,
        orders: updatedOrders,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(`vendedor_ia_project_${activeProject.id}`, JSON.stringify(updatedProject));
      const allUpdated = projects.map((p) => (p.id === activeProject.id ? updatedProject : p));
      localStorage.setItem('vendedor_ia_projects', JSON.stringify(allUpdated));
    } catch (e) {
      console.warn('LocalStorage error saving updated order:', e);
    }

    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-empresa-id': String(currentEmpresaId),
          'x-user-role': currentUserRef.current.role,
        },
        body: JSON.stringify(updatedFields),
      });
    } catch (srvErr) {
      console.warn('Error updating order on server backend:', srvErr);
    }

    try {
      await saveProjectToSupabase({
        ...activeProject,
        orders: updatedOrders,
      });
    } catch (supaErr) {
      console.warn('Auto-save updated order to Supabase:', supaErr);
    }

    addToast('success', 'Pedido actualizado', 'Los datos del pedido fueron guardados correctamente.');
  };

  // Stock deduction helper according to FASE 14
  const deductStockForOrder = (orderItems: CustomerOrder['items'] = []) => {
    const lowStockAlerts: string[] = [];
    const outOfStockAlerts: string[] = [];

    const updatedCatalog = (activeProject.catalog || []).map((prod) => {
      const matchingItem = orderItems.find(
        (i) => i.productId === prod.id || i.productName.toLowerCase() === prod.name.toLowerCase()
      );
      if (!matchingItem || prod.stockControlEnabled === false) return prod;

      const soldQty = matchingItem.quantity || (matchingItem.weightKg ? Math.ceil(matchingItem.weightKg) : 1);
      const currentQty = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.inStock ? 10 : 0);
      const newQty = Math.max(0, currentQty - soldQty);
      const inStock = newQty > 0;
      const minStock = prod.minStock !== undefined ? prod.minStock : 3;

      if (newQty === 0 && currentQty > 0) {
        outOfStockAlerts.push(prod.name);
      } else if (newQty <= minStock && currentQty > minStock) {
        lowStockAlerts.push(`${prod.name} (${newQty} rest.)`);
      }

      return {
        ...prod,
        stockQuantity: newQty,
        inStock,
        status: (newQty === 0 ? 'esgotado' : prod.status) as any,
        availability: newQty === 0 ? 'Esgotado' : (prod.availability || 'Pronta entrega'),
      };
    });

    return { updatedCatalog, lowStockAlerts, outOfStockAlerts };
  };

  const handleAddManualOrder = (newOrderData: Partial<CustomerOrder>) => {
    const newOrder: CustomerOrder = {
      id: 'ord-' + Date.now(),
      customerName: newOrderData.customerName || 'Cliente Manual',
      customerPhone: newOrderData.customerPhone || '',
      customerAddress: newOrderData.customerAddress || '',
      items: newOrderData.items || [],
      subtotal: newOrderData.subtotal || 0,
      discountAmount: newOrderData.discountAmount || 0,
      total: newOrderData.total || 0,
      status: (newOrderData.status as OrderStatus) || 'NUEVO',
      paymentMethod: newOrderData.paymentMethod || 'Efectivo',
      createdAt: new Date().toISOString(),
      notes: newOrderData.notes || '',
    };

    const { updatedCatalog, lowStockAlerts, outOfStockAlerts } = deductStockForOrder(newOrder.items);
    const orders = [newOrder, ...(activeProject.orders || [])];

    updateActiveProject({ orders, catalog: updatedCatalog });
    addToast('success', 'Pedido creado manualmente', `Pedido registrado con éxito.`);

    if (outOfStockAlerts.length > 0) {
      addToast('error', '⚠️ Sin stock en inventario', `${outOfStockAlerts.join(', ')} se ha quedado sin stock.`);
    }
    if (lowStockAlerts.length > 0) {
      addToast('info', '🔔 Alerta de stock bajo', `${lowStockAlerts.join(', ')} llegó al nivel mínimo.`);
    }
  };

  const handlePlaceOrder = (newOrderData: Omit<CustomerOrder, 'id' | 'createdAt'>) => {
    const newOrder: CustomerOrder = {
      ...newOrderData,
      id: 'ord-' + Date.now(),
      createdAt: new Date().toISOString(),
    };

    const { updatedCatalog, lowStockAlerts, outOfStockAlerts } = deductStockForOrder(newOrder.items);
    const orders = [newOrder, ...(activeProject.orders || [])];

    updateActiveProject({ orders, catalog: updatedCatalog });
    addToast('success', '¡Pedido recibido con éxito!', `Transferido al panel de pedidos para atención humana.`);

    if (outOfStockAlerts.length > 0) {
      addToast('error', '⚠️ Sin stock en inventario', `${outOfStockAlerts.join(', ')} se ha quedado sin stock.`);
    }
    if (lowStockAlerts.length > 0) {
      addToast('info', '🔔 Alerta de stock bajo', `${lowStockAlerts.join(', ')} llegó al nivel mínimo.`);
    }
  };

  // Promotions & Discounts Handlers
  const handleUpdatePromotions = (promotions: PromotionItem[]) => {
    updateActiveProject({ promotions });
    addToast('success', 'Promociones actualizadas', 'Los cupones y descuentos fueron guardados.');
  };

  // Employees Handlers
  const handleUpdateEmployees = (employees: Employee[]) => {
    updateActiveProject({ employees });
    addToast('success', 'Equipo de trabajo actualizado', 'La lista de colaboradores fue guardada.');
  };

  // Deliveries Handlers
  const handleUpdateDeliveryConfig = (deliveryConfig: DeliveryConfig) => {
    updateActiveProject({
      config: {
        ...activeProject.config,
        deliveryConfig,
        shippingFee: deliveryConfig.deliveryFee,
        freeShippingThreshold: deliveryConfig.freeDeliveryThreshold,
      },
    });
    addToast('success', 'Zonas y tarifas guardadas', 'Configuración de entrega y delivery actualizada.');
  };

  const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'https://vendedor-ia.app';
  const webhookUrl = `${hostUrl}/api/whatsapp/webhook?projectId=${activeProject.id}`;

  // If a public customer opens a shared catalog link (e.g. ?loja=ID, /loja/ID, #loja/ID)
  // render the standalone, mobile-first public catalog page with absolute tenant isolation
  if (publicCatalogTargetId && publicStoreProject) {
    return (
      <PublicCatalogView
        project={publicStoreProject}
        onExitPublicView={() => {
          setPublicCatalogTargetId(null);
          try {
            if (window.history && window.history.replaceState) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (e) {}
        }}
        onOrderPlaced={(order) => {
          handlePlaceOrder(order);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col antialiased selection:bg-blue-600 selection:text-white">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChangeWithGuard}
        onOpenMobileSimulator={() => setIsMobileSimulatorOpen(true)}
        activeProject={activeProject}
        projects={visibleProjects}
        onSelectProject={handleSelectProjectWithGuard}
        onOpenNewProjectModal={() => {
          if (currentUser.role === 'owner') return;
          setIsNewProjectModalOpen(true);
        }}
        hasUnsavedChanges={hasUnsavedChanges}
        isSaving={isSaving}
        onSaveAllChanges={() => handleSaveAllChanges(false)}
        saveSuccessMsg={saveSuccessMsg}
        lastSavedTime={lastSavedTime}
        isCloudConnected={isCloudConnected}
        isInitialCloudLoading={isInitialCloudLoading}
        isSupabaseConnected={isSupabaseConnected}
        activeEmpresaId={getActiveEmpresaId(activeProject)}
        currentUser={currentUser}
        onOpenAccountModal={() => setIsAccountModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        saveErrorMsg={saveErrorMsg}
        onRefreshSupabase={handleRefreshFromSupabase}
        onOpenOwnerQR={() => handleOpenOwnerQR(activeProject)}
        onOpenOrderModal={(orderId) => {
          setSelectedOrderIdForModal(orderId);
          setActiveTab('pedidos');
        }}
        onNewOrderReceived={(newOrder) => {
          if (newOrder.empresaId === getActiveEmpresaId(activeProject)) {
            setProjects((prev) =>
              prev.map((proj) => {
                if (getActiveEmpresaId(proj) === newOrder.empresaId) {
                  const existing = proj.orders || [];
                  if (existing.some((o) => o.id === newOrder.id)) return proj;
                  return {
                    ...proj,
                    orders: [newOrder, ...existing],
                  };
                }
                return proj;
              })
            );
          }
        }}
      />

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {/* Banner Exclusivo: Modo Dueño de Empresa */}
        {currentUser.role === 'owner' && (
          <div className="mb-6 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/40 text-white p-4 sm:p-5 rounded-2xl shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-2xl shrink-0 shadow-md">
                👔
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-400/30">
                    Panel Privado del Dueño
                  </span>
                  <span className="text-xs text-indigo-300 font-mono font-bold">
                    Empresa #{currentUser.empresaId || getActiveEmpresaId(activeProject)}
                  </span>
                  {Boolean(activeProject.ownerAccessRevoked ?? activeProject.config?.ownerAccessRevoked) && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-red-300 bg-red-500/20 px-2 py-0.5 rounded border border-red-400/30 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Acceso Suspendido</span>
                    </span>
                  )}
                </div>
                <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                  {activeProject.name}
                </h2>
                <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                  Acceso exclusivo y aislado. Cualquier modificación en productos, precios, fotos, horarios o configuración se guarda automáticamente en Supabase y se refleja en el panel del administrador.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenOwnerQR(activeProject)}
                className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-black text-xs transition flex items-center space-x-1.5 shadow-md shadow-indigo-600/30"
              >
                <QrCode className="w-4 h-4 text-indigo-200" />
                <span>Mi Código QR</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const adminUser: AppUser = {
                    id: 'admin-super',
                    email: 'admin@vendedoria.com',
                    name: 'Administrador Principal Vendedor IA',
                    role: 'superadmin',
                  };
                  setCurrentUser(adminUser);
                  try {
                    localStorage.setItem('vendedor_ia_current_user', JSON.stringify(adminUser));
                    if (window.history && window.history.replaceState) {
                      window.history.replaceState({}, document.title, window.location.pathname);
                    }
                  } catch (e) {}
                  setSaveSuccessMsg('Modo cambiado a Administrador Principal');
                  setTimeout(() => setSaveSuccessMsg(''), 3000);
                }}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition"
                title="Cambiar a vista de Administrador Principal"
              >
                <span>Volver a Admin</span>
              </button>
            </div>
          </div>
        )}

        {/* Notificación de Bloqueo si el acceso fue revocado para el Dueño */}
        {currentUser.role === 'owner' && Boolean(activeProject.ownerAccessRevoked ?? activeProject.config?.ownerAccessRevoked) && (
          <div className="mb-8 bg-red-950/90 border-2 border-red-500 text-white p-6 sm:p-8 rounded-3xl shadow-2xl">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-left">
              <div className="w-14 h-14 rounded-2xl bg-red-600/30 border border-red-400 flex items-center justify-center shrink-0 shadow-lg">
                <ShieldAlert className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-red-500/30 border border-red-400/50 text-red-200 font-black text-[11px] uppercase tracking-wider">
                    Acceso al Panel Desconectado
                  </span>
                  <span className="text-xs text-red-300 font-mono">
                    Empresa #{currentUser.empresaId || getActiveEmpresaId(activeProject)}
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black text-white">
                  El administrador ha suspendido el acceso a este panel
                </h3>
                <p className="text-sm text-red-200/90 max-w-2xl leading-relaxed">
                  Tu panel de administración se encuentra temporalmente desconectado por el administrador.
                  Todos tus productos, catálogo, precios, fotos, horarios y la línea de WhatsApp de <strong>{activeProject.name}</strong> permanecen seguros y atendiendo clientes normalmente.
                </p>
                <div className="pt-2 flex items-center gap-3 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleRefreshFromSupabase}
                    className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1.5 shadow"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Verificar Reconexión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Initial Cloud Loading Notification Banner */}
        {isInitialCloudLoading && (
          <div className="mb-5 bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-400/40 text-white px-5 py-3.5 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-lg shadow-emerald-900/20 animate-fade-in">
            <div className="flex items-center space-x-2.5">
              <Loader2 className="w-5 h-5 text-emerald-300 animate-spin shrink-0" />
              <span>Sincronizando empresas y catálogo desde Supabase...</span>
            </div>
            <span className="text-[11px] text-emerald-200 hidden sm:inline font-mono">Supabase PostgreSQL BD Principal</span>
          </div>
        )}

        {/* Global Save Success Notification Banner */}
        {saveSuccessMsg && (
          <div className="mb-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg shadow-emerald-600/20 animate-fade-in border border-emerald-400/30">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
              <span>✅ {saveSuccessMsg}</span>
            </div>
            <span className="text-[11px] text-emerald-100 font-semibold hidden sm:inline">
              Guardado en Supabase
            </span>
          </div>
        )}

        {/* Global Save Error Notification Banner */}
        {saveErrorMsg && (
          <div className="mb-5 bg-gradient-to-r from-rose-600 to-red-700 text-white px-5 py-3.5 rounded-2xl text-xs font-bold flex items-center justify-between shadow-lg shadow-rose-600/20 animate-fade-in border border-rose-400/30">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-100 shrink-0" />
              <span>{saveErrorMsg}</span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleSaveAllChanges(false)}
                className="bg-white text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-black transition shadow"
              >
                Reintentar Guardar
              </button>
              <button
                onClick={() => setSaveErrorMsg('')}
                className="text-rose-200 hover:text-white text-xs font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Tab 0: Modern SaaS Dashboard Overview */}
        {activeTab === 'dashboard' && (
          <BusinessOverviewTab
            project={activeProject}
            currentUser={currentUser}
            onNavigateTab={handleTabChangeWithGuard}
            onOpenChatSimulator={(projId) => {
              if (projId && projId !== activeProjectId) {
                setActiveProjectId(projId);
              }
              setIsMobileSimulatorOpen(true);
            }}
            onOpenOwnerQR={() => handleOpenOwnerQR(activeProject)}
            orders={activeProject.orders || []}
          />
        )}

        {/* Section 0: Mis Empresas / Proyectos Dashboard */}
        {(activeTab === 'empresas' || activeTab === 'proyectos') && (
          <ProjectsDashboard
            projects={visibleProjects}
            activeProjectId={activeProjectId}
            onSelectProject={handleSelectProjectWithGuard}
            onOpenProject={handleOpenProjectWithGuard}
            onOpenNewProjectModal={() => {
              if (currentUser.role === 'owner') return;
              setEditingProject(null);
              setIsNewProjectModalOpen(true);
            }}
            onNewProject={() => {
              if (currentUser.role === 'owner') return;
              setEditingProject(null);
              setIsNewProjectModalOpen(true);
            }}
            onEditProject={(proj) => {
              setEditingProject(proj);
              setIsNewProjectModalOpen(true);
            }}
            onDuplicateProject={currentUser.role === 'owner' ? undefined : handleDuplicateProject}
            onDeleteProject={(id) => {
              if (currentUser.role === 'owner') return;
              const p = projects.find((x) => x.id === id);
              if (p) handleRequestDeleteProject(p);
            }}
            onRequestDeleteProject={currentUser.role === 'owner' ? undefined : handleRequestDeleteProject}
            onOpenChatSimulator={(targetProjId) => {
              if (targetProjId) {
                setActiveProjectId(targetProjId);
              }
              setIsMobileSimulatorOpen(true);
            }}
            currentUser={currentUser}
            onOpenOwnerQR={handleOpenOwnerQR}
          />
        )}

        {/* Tab 1: Negócio / Empresa */}
        {activeTab === 'negocio' && (
          <BusinessConfigTab
            config={activeProject.config}
            onChange={handleUpdateConfig}
            onSave={handleSaveAllChanges}
            isSaving={isSaving}
            projectName={activeProject.name}
            onDeleteCurrentProject={
              currentUser.role === 'owner' ? undefined : () => handleRequestDeleteProject(activeProject)
            }
            currentUser={currentUser}
            onOpenOwnerQR={() => handleOpenOwnerQR(activeProject)}
            activeEmpresaId={getActiveEmpresaId(activeProject)}
            onRevokeOwnerAccess={() => handleRevokeOwnerAccess(activeProject)}
            onRestoreOwnerAccess={() => handleRestoreOwnerAccess(activeProject)}
            isOwnerAccessRevoked={Boolean(activeProject.ownerAccessRevoked ?? activeProject.config?.ownerAccessRevoked)}
          />
        )}

        {/* Tab 2: Base de Conocimiento IA */}
        {activeTab === 'conhecimento' && (
          <AiKnowledgeTab
            project={activeProject}
            knowledgeItems={activeProject.aiKnowledge || []}
            onAddItem={handleAddKnowledgeItem}
            onUpdateItem={handleUpdateKnowledgeItem}
            onDeleteItem={handleDeleteKnowledgeItem}
            onUpdateKnowledge={(knowledge) => updateActiveProject({ aiKnowledge: knowledge })}
          />
        )}

        {/* Tab 3: Preguntas sin Respuesta */}
        {activeTab === 'perguntas_pendentes' && (
          <UnansweredQuestionsTab
            project={activeProject}
            questions={activeProject.unansweredQuestions || []}
            onAnswerQuestion={handleAnswerQuestion}
          />
        )}

        {/* Tab 4: Produtos */}
        {activeTab === 'produtos' && (
          <CatalogTab
            catalog={activeProject.catalog || []}
            onAddItem={handleAddCatalogItem}
            onAddMultipleItems={handleAddMultipleCatalogItems}
            onUpdateItem={handleUpdateCatalogItem}
            onDeleteItem={handleDeleteCatalogItem}
            currency="BRL"
            businessCategory={activeProject.category || activeProject.config.category}
          />
        )}

        {/* Tab 4.1: Pedidos & Carrito */}
        {activeTab === 'pedidos' && (
          <OrdersTab
            orders={activeProject.orders || []}
            project={activeProject}
            onUpdateOrderStatus={handleUpdateOrderStatus}
            onUpdateOrder={handleUpdateOrder}
            onAddManualOrder={handleAddManualOrder}
            selectedOrderId={selectedOrderIdForModal}
            onClearSelectedOrderId={() => setSelectedOrderIdForModal(null)}
          />
        )}

        {/* Tab 4.2: Catálogo Online Shopee Style */}
        {activeTab === 'catalogo_online' && (
          <OnlineCatalogTab
            project={activeProject}
            onPlaceOrder={handlePlaceOrder}
            onOpenWhatsAppSimulator={() => setIsMobileSimulatorOpen(true)}
          />
        )}

        {/* Tab 4.3: Estadísticas & Métricas de Venta */}
        {activeTab === 'estatisticas' && (
          <AnalyticsTab
            project={activeProject}
            orders={activeProject.orders || []}
          />
        )}

        {/* Tab 4.4: Promociones & Cupones */}
        {activeTab === 'promocoes' && (
          <PromotionsTab
            project={activeProject}
            onUpdatePromotions={handleUpdatePromotions}
          />
        )}

        {/* Tab 4.5: Zonas de Entrega & Delivery */}
        {activeTab === 'entregas' && (
          <DeliveriesTab
            project={activeProject}
            onUpdateDeliveryConfig={handleUpdateDeliveryConfig}
          />
        )}

        {/* Tab 4.6: Empleados y Equipo de Trabajo */}
        {activeTab === 'funcionarios' && (
          <EmployeesTab
            project={activeProject}
            onUpdateEmployees={handleUpdateEmployees}
          />
        )}

        {/* Tab 5: Serviços */}
        {activeTab === 'servicos' && (
          <ServicesTab
            services={activeProject.services || []}
            professionals={activeProject.professionals || []}
            onAddService={handleAddService}
            onUpdateService={handleUpdateService}
            onDeleteService={handleDeleteService}
          />
        )}

        {/* Tab 6: Profissionais */}
        {activeTab === 'profissionais' && (
          <ProfessionalsTab
            professionals={activeProject.professionals || []}
            onAddProfessional={handleAddProfessional}
            onUpdateProfessional={handleUpdateProfessional}
            onDeleteProfessional={handleDeleteProfessional}
          />
        )}

        {/* Tab 7: Horários e Bloqueios */}
        {activeTab === 'horarios' && (
          <WorkingHoursTab
            workingHours={activeProject.workingHours || INITIAL_WORKING_HOURS}
            professionals={activeProject.professionals || []}
            onSaveWorkingHours={handleSaveWorkingHours}
          />
        )}

        {/* Tab 8: Agendamentos / Citas */}
        {activeTab === 'agendamentos' && (
          <AppointmentsTab
            appointments={activeProject.appointments || []}
            services={activeProject.services || []}
            professionals={activeProject.professionals || []}
            onAddAppointment={handleAddAppointment}
            onUpdateStatus={handleUpdateAppointmentStatus}
          />
        )}

        {/* Tab 9: FAQs */}
        {activeTab === 'faqs' && (
          <FaqTab
            faqs={activeProject.faqs || []}
            onAddFaq={handleAddFaq}
            onUpdateFaq={handleUpdateFaq}
            onDeleteFaq={handleDeleteFaq}
          />
        )}

        {/* Tab 10: Leads & Chats */}
        {activeTab === 'leads' && (
          <LeadsAndChatsTab
            leads={activeProject.leads || []}
            onUpdateStatus={handleUpdateLeadStatus}
          />
        )}

        {/* Tab 11: Pagamentos */}
        {activeTab === 'pagamentos' && (
          <PaymentsTab
            config={activeProject.config}
            onChange={handleUpdateConfig}
            onSave={handleSaveAllChanges}
            isSaving={isSaving}
          />
        )}

        {/* Tab 12: WhatsApp Integration */}
        {activeTab === 'whatsapp' && (
          <WhatsappConfigTab
            config={activeProject.config}
            onChange={handleUpdateConfig}
            onSave={handleSaveAllChanges}
            isSaving={isSaving}
            webhookUrl={webhookUrl}
            verifyToken="vendedor_ia_brasil_secret_token"
            botName={activeProject.config.botName}
            companyName={activeProject.config.name}
            phoneWhatsapp={activeProject.config.phoneWhatsapp}
            currency="BRL"
            projectId={activeProject.id}
            empresaId={getActiveEmpresaId(activeProject)}
          />
        )}
        
        {/* Tab 13: Configuração da IA */}
        {activeTab === 'config_ia' && (
          <AiConfigTab
            config={activeProject.config}
            onChange={handleUpdateConfig}
            onSave={handleSaveAllChanges}
            isSaving={isSaving}
          />
        )}
      </main>

      {/* Sticky Floating Save Bar when modifications are pending */}
      {hasUnsavedChanges && (
        <aside 
          aria-label="Aviso de cambios sin guardar"
          className="fixed bottom-5 right-5 z-40 animate-fade-in"
        >
          <div className="bg-slate-900/95 text-white backdrop-blur-md border-2 border-amber-400/70 p-3 sm:px-4 sm:py-3 rounded-2xl shadow-2xl flex items-center space-x-3 max-w-sm sm:max-w-md ring-4 ring-amber-500/20">
            <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div className="flex-1 min-w-0 pr-1">
              <p className="font-extrabold text-xs text-amber-300 truncate">
                Cambios pendientes
              </p>
              <p className="text-[10px] text-slate-300 truncate font-semibold">
                {activeProject.name}
              </p>
            </div>
            <button
              id="btn-floating-save-changes"
              onClick={handleSaveAllChanges}
              disabled={isSaving}
              className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs px-3.5 py-2 rounded-xl shadow-lg shadow-emerald-500/30 transition flex items-center space-x-1.5 shrink-0 active:scale-95 disabled:opacity-75"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>💾 GUARDAR CAMBIOS</span>
                </>
              )}
            </button>
          </div>
        </aside>
      )}

      {/* Delete Project Confirmation Modal */}
      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        project={projectToDelete}
        hasUnsavedChanges={
          projectToDelete?.id === activeProject.id ? hasUnsavedChanges : false
        }
        totalProjectsCount={projects.length}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setProjectToDelete(null);
        }}
        onConfirmDelete={handleConfirmDeleteProject}
        isDeleting={isDeletingProject}
      />

      {/* Unsaved Changes Confirmation Modal */}
      <UnsavedChangesModal
        isOpen={isUnsavedModalOpen}
        projectName={activeProject.name}
        isSaving={isSaving}
        onSaveAndExit={handleModalSaveAndExit}
        onExitWithoutSaving={handleModalExitWithoutSaving}
        onCancel={handleModalCancel}
      />

      {/* New / Edit Company Modal */}
      <NewProjectModal
        isOpen={isNewProjectModalOpen}
        onClose={() => {
          setIsNewProjectModalOpen(false);
          setEditingProject(null);
        }}
        onCreateProject={handleCreateProject}
        onUpdateProject={handleUpdateExistingProject}
        initialProject={editingProject}
      />

      {/* Mobile Chat Simulator Popup */}
      <MobileChatSimulator
        config={activeProject.config}
        catalog={activeProject.catalog || []}
        services={activeProject.services || []}
        professionals={activeProject.professionals || []}
        workingHours={activeProject.workingHours}
        appointments={activeProject.appointments || []}
        aiKnowledge={activeProject.aiKnowledge || []}
        faqs={activeProject.faqs || []}
        projectId={activeProject.id}
        isOpen={isMobileSimulatorOpen}
        onClose={() => setIsMobileSimulatorOpen(false)}
        onCaptureLead={handleCaptureLeadFromSim}
        onAddUnansweredQuestion={handleAddUnansweredQuestionFromSim}
        orders={activeProject.orders || []}
        cart={activeProject.cart || []}
        onUpdateCart={(newCart) => updateActiveProject({ cart: newCart })}
        onAddAppointment={handleAddAppointment}
        onAddOrder={handleAddOrder}
      />
      {/* Account and Cloud Sync Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        currentUser={currentUser}
        onSelectUser={(user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('vendedor_ia_current_user', JSON.stringify(user));
          } catch (e) {}
          if (user.role === 'owner' && user.empresaId) {
            const targetProj = projects.find(
              (p) => p.empresaId === user.empresaId || p.id === String(user.empresaId)
            );
            if (targetProj) {
              setActiveProjectId(targetProj.id);
            }
          }
        }}
        activeEmpresaId={getActiveEmpresaId(activeProject)}
        onRefreshData={handleRefreshFromSupabase}
        availableProjects={projects}
        onOpenOwnerQR={handleOpenOwnerQR}
      />
      {/* Supabase PostgreSQL Status and SQL Setup Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        activeEmpresaId={getActiveEmpresaId(activeProject)}
      />
      {/* Owner Panel QR Code Modal (QR 2 - Panel Exclusivo del Dueño) */}
      <OwnerPanelQRModal
        isOpen={isOwnerQRModalOpen}
        onClose={() => setIsOwnerQRModalOpen(false)}
        project={ownerQRProject || activeProject}
        empresaId={getActiveEmpresaId(ownerQRProject || activeProject)}
        onRevokeOwnerAccess={() => handleRevokeOwnerAccess(ownerQRProject || activeProject)}
        onRestoreOwnerAccess={() => handleRestoreOwnerAccess(ownerQRProject || activeProject)}
      />

      {/* Global Toast Notifications for SaaS actions */}
      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
      />
    </div>
  );
}

export default App;
