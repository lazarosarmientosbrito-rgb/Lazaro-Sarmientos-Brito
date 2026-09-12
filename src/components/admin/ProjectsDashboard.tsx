import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  ArrowRight,
  Sparkles,
  ShoppingBag,
  Scissors,
  CalendarCheck,
  HelpCircle,
  Users,
  CheckCircle2,
  Trash2,
  Copy,
  ExternalLink,
  MessageSquare,
  Clock,
  MapPin,
  Phone,
  Filter,
  Edit,
  Globe,
  DollarSign,
  QrCode,
  Lock,
  ShieldCheck
} from 'lucide-react';
import { BusinessProject, AppUser } from '../../types';

interface ProjectsDashboardProps {
  projects: BusinessProject[];
  activeProjectId: string;
  onSelectProject: (projectId: string) => void;
  onOpenProject?: (projectId: string) => void;
  onOpenNewProjectModal?: () => void;
  onNewProject?: () => void;
  onEditProject?: (project: BusinessProject) => void;
  onDeleteProject: (projectId: string) => void;
  onRequestDeleteProject?: (project: BusinessProject) => void;
  onDuplicateProject: (projectId: string) => void;
  onOpenChatSimulator?: (projectId?: string) => void;
  currentUser?: AppUser | null;
  onOpenOwnerQR?: (project: BusinessProject) => void;
}

export const ProjectsDashboard: React.FC<ProjectsDashboardProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenProject,
  onOpenNewProjectModal,
  onNewProject,
  onEditProject,
  onDeleteProject,
  onRequestDeleteProject,
  onDuplicateProject,
  onOpenChatSimulator,
  currentUser,
  onOpenOwnerQR,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('ALL');

  const isOwner = currentUser?.role === 'owner';

  const handleOpenModal = () => {
    if (isOwner) return;
    if (onOpenNewProjectModal) onOpenNewProjectModal();
    else if (onNewProject) onNewProject();
  };

  const handleSelect = (id: string) => {
    if (onOpenProject) onOpenProject(id);
    else onSelectProject(id);
  };

  const categories = Array.from(
    new Set(projects.map((p) => p.category || p.businessType || 'General'))
  );

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.config?.city && p.config.city.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.config?.country && p.config.country.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory =
      selectedFilter === 'ALL' ||
      p.category === selectedFilter ||
      p.businessType === selectedFilter;

    return matchesSearch && matchesCategory;
  });

  const totalCatalogItems = projects.reduce((acc, p) => acc + (p.catalog?.length || 0), 0);
  const totalServices = projects.reduce((acc, p) => acc + (p.services?.length || 0), 0);
  const totalUnanswered = projects.reduce(
    (acc, p) => acc + (p.unansweredQuestions?.filter((q) => q.status === 'pending').length || 0),
    0
  );
  const totalLeads = projects.reduce((acc, p) => acc + (p.leads?.length || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Welcome Banner & Quick Stats */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              <Building2 className="w-3.5 h-3.5" />
              <span>{isOwner ? 'Panel de Dueño de Negocio • Acceso Aislado' : 'Plataforma Multiempresa • Supabase Cloud'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              {isOwner ? `🏢 ${projects[0]?.name || 'Mi Empresa'}` : '🏢 Mis Empresas y Negocios'}
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              {isOwner
                ? `Acceso exclusivo a los datos, productos, precios, imágenes, configuración y WhatsApp de su empresa. Los datos de otras empresas no son accesibles y los cambios se guardan directamente en Supabase.`
                : `Administra múltiples negocios desde un solo lugar. Cada empresa cuenta con su propio catálogo de productos, servicios, citas, clientes, horarios y agente de ventas IA completamente aislados en Supabase (PostgreSQL).`}
            </p>
          </div>

          {!isOwner && (
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                id="btn-create-new-company"
                onClick={handleOpenModal}
                className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm shadow-lg shadow-blue-600/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center space-x-2 border border-blue-400/30"
              >
                <Plus className="w-5 h-5" />
                <span>+ Crear Empresa</span>
              </button>
            </div>
          )}
        </div>

        {/* Mini KPI Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800/80 text-xs">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-700/50">
            <span className="text-slate-400 font-semibold block text-[11px]">Total Empresas</span>
            <span className="text-xl font-black text-white">{projects.length} empresas</span>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-700/50">
            <span className="text-slate-400 font-semibold block text-[11px]">Productos Registrados</span>
            <span className="text-xl font-black text-emerald-400">{totalCatalogItems} productos</span>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-700/50">
            <span className="text-slate-400 font-semibold block text-[11px]">Servicios & Citas</span>
            <span className="text-xl font-black text-blue-400">{totalServices} servicios</span>
          </div>
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-3.5 border border-slate-700/50">
            <span className="text-slate-400 font-semibold block text-[11px]">Leads & Clientes</span>
            <span className="text-xl font-black text-purple-400">{totalLeads} clientes</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar empresa por nombre, categoría, país, ciudad o descripción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-800 font-medium transition"
          />
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedFilter('ALL')}
            className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
              selectedFilter === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({projects.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedFilter(cat)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap transition ${
                selectedFilter === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Companies List */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-4">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            🏢
          </div>
          <h3 className="text-lg font-bold text-slate-800">No se encontraron empresas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? `No hay empresas que coincidan con "${searchTerm}".`
              : 'Comienza creando tu primera empresa o negocio para gestionar sus productos, servicios y activar su vendedor IA.'}
          </p>
          <button
            onClick={handleOpenModal}
            className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition inline-flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>+ Crear Empresa Ahora</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((proj) => {
            const isActive = proj.id === activeProjectId;
            const pendingQuestionsCount = proj.unansweredQuestions?.filter((q) => q.status === 'pending').length || 0;
            const hasServices = proj.config?.serviceType !== 'venda';
            const currencySymbol = proj.config?.currency === 'BRL' ? 'R$' : proj.config?.currency || '$';

            return (
              <div
                key={proj.id}
                className={`bg-white rounded-3xl p-5 border transition-all duration-200 flex flex-col justify-between relative group ${
                  isActive
                    ? 'border-blue-500 shadow-md ring-2 ring-blue-500/15'
                    : 'border-slate-200/80 hover:border-blue-300 hover:shadow-lg'
                }`}
              >
                {/* Header of Company Card */}
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-2xl shadow-inner shrink-0 overflow-hidden">
                        {proj.logoUrl || proj.config?.logoUrl ? (
                          <img
                            src={proj.logoUrl || proj.config?.logoUrl}
                            alt={proj.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          proj.name?.match(/^([\p{Emoji}]+)/u)?.[0] || '🏢'
                        )}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition">
                            {proj.name}
                          </h3>
                          {isActive && (
                            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1 border border-emerald-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              EMPRESA ACTIVA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span>{proj.category || proj.businessType}</span>
                          <span>•</span>
                          <span>{proj.config?.city || 'São Paulo'}</span>
                          {proj.config?.country && (
                            <>
                              <span>•</span>
                              <span>{proj.config.country}</span>
                            </>
                          )}
                          <span>•</span>
                          <span className="font-bold text-slate-700">{proj.config?.currency || 'BRL'} ({currencySymbol})</span>
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 text-[11px] font-bold shrink-0">
                      {proj.config?.serviceType === 'venda'
                        ? '🛍️ Solo Productos'
                        : proj.config?.serviceType === 'agendamento'
                        ? '✂️ Solo Citas'
                        : '🛍️+✂️ Híbrido'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || proj.config?.description || 'Empresa comercial con atención automatizada.'}
                  </p>

                  {/* Badges / Metrics */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{proj.catalog?.length || 0} productos</span>
                    </div>

                    {hasServices && (
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-800 text-xs font-semibold border border-blue-200">
                        <Scissors className="w-3.5 h-3.5 text-blue-600" />
                        <span>{proj.services?.length || 0} servicios</span>
                      </div>
                    )}

                    <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 text-xs font-semibold border border-purple-200">
                      <Users className="w-3.5 h-3.5 text-purple-600" />
                      <span>{proj.leads?.length || 0} clientes/leads</span>
                    </div>

                    {pendingQuestionsCount > 0 && (
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-300 animate-pulse">
                        <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                        <span>{pendingQuestionsCount} preguntas pendientes</span>
                      </div>
                    )}

                    {proj.config?.whatsappConnected ? (
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{proj.config.whatsappConnectedApp || 'WhatsApp'} Conectado</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl bg-slate-50 text-slate-600 text-xs font-medium border border-slate-200">
                        <QrCode className="w-3.5 h-3.5 text-slate-400" />
                        <span>QR Pendiente</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center flex-wrap gap-1.5">
                    <button
                      onClick={() => onOpenChatSimulator && onOpenChatSimulator(proj.id)}
                      title="Abrir Simulador WhatsApp de esta empresa"
                      className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition flex items-center space-x-1.5 border border-emerald-200"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Simulador</span>
                    </button>

                    {onEditProject && (
                      <button
                        onClick={() => onEditProject(proj)}
                        title="Editar datos de la empresa (Nombre, País, Moneda, Horarios, etc.)"
                        className="px-2.5 py-1.5 rounded-xl text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 text-xs font-bold transition flex items-center space-x-1 border border-blue-200"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>
                    )}

                    {onOpenOwnerQR && (
                      <button
                        onClick={() => onOpenOwnerQR(proj)}
                        title="Ver Código QR exclusivo para el Dueño de esta empresa"
                        className="px-2.5 py-1.5 rounded-xl text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold transition flex items-center space-x-1 border border-indigo-200 shadow-sm"
                      >
                        <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                        <span>QR Dueño</span>
                      </button>
                    )}

                    {!isOwner && (
                      <>
                        <button
                          onClick={() => onDuplicateProject(proj.id)}
                          title="Duplicar esta empresa con sus productos y configuración"
                          className="px-2.5 py-1.5 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 text-xs font-semibold transition flex items-center space-x-1"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Duplicar</span>
                        </button>

                        <button
                          onClick={() => {
                            if (onRequestDeleteProject) {
                              onRequestDeleteProject(proj);
                            } else {
                              onDeleteProject(proj.id);
                            }
                          }}
                          title="Eliminar esta empresa de forma permanente de Supabase"
                          className="px-2.5 py-1.5 rounded-xl text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 text-xs font-bold transition flex items-center space-x-1 border border-red-200"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                          <span>🗑️ Eliminar</span>
                        </button>
                      </>
                    )}
                  </div>

                  <button
                    onClick={() => handleSelect(proj.id)}
                    className={`px-4 py-2 rounded-xl font-bold text-xs transition flex items-center space-x-1.5 shadow-sm shrink-0 ${
                      isActive
                        ? 'bg-slate-900 text-white hover:bg-slate-800'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <span>{isActive ? 'Panel de la Empresa' : 'Seleccionar Empresa'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
