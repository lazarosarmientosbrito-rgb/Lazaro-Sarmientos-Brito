import React from 'react';
import { 
  Building2, 
  ShoppingBag, 
  Scissors, 
  UserCheck,
  Clock, 
  CalendarCheck, 
  HelpCircle, 
  Users, 
  CreditCard, 
  MessageSquareCode, 
  Bot, 
  Smartphone, 
  ChevronDown, 
  Sparkles,
  FolderKanban,
  Brain,
  MessageSquareX,
  Save,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Cloud,
  CloudCheck,
  Building,
  RefreshCw,
  QrCode,
  LayoutDashboard,
  TrendingUp,
  Ticket,
  Truck,
  ExternalLink
} from 'lucide-react';
import { BusinessProject, CustomerOrder } from '../types';
import { OrderNotificationCenter } from './common/OrderNotificationCenter';

export type TabType = 
  | 'dashboard'
  | 'empresas'
  | 'proyectos'
  | 'negocio' 
  | 'conhecimento'
  | 'perguntas_pendentes'
  | 'produtos' 
  | 'pedidos'
  | 'catalogo_online'
  | 'estatisticas'
  | 'promocoes'
  | 'entregas'
  | 'funcionarios'
  | 'servicos' 
  | 'profissionais'
  | 'horarios'
  | 'agendamentos' 
  | 'faqs' 
  | 'leads' 
  | 'pagamentos' 
  | 'whatsapp' 
  | 'config_ia';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onOpenMobileSimulator: () => void;
  activeProject: BusinessProject;
  projects: BusinessProject[];
  onSelectProject: (projectId: string) => void;
  onOpenNewProjectModal: () => void;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  onSaveAllChanges?: () => void;
  saveSuccessMsg?: string;
  saveErrorMsg?: string;
  lastSavedTime?: string | null;
  isCloudConnected?: boolean;
  isInitialCloudLoading?: boolean;
  isSupabaseConnected?: boolean;
  activeEmpresaId?: number;
  onRefreshSupabase?: () => void;
  currentUser?: any;
  onOpenAccountModal?: () => void;
  onOpenSupabaseModal?: () => void;
  onOpenOwnerQR?: () => void;
  onOpenOrderModal?: (orderId: string) => void;
  onNewOrderReceived?: (order: CustomerOrder) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileSimulator,
  activeProject,
  projects,
  onSelectProject,
  onOpenNewProjectModal,
  hasUnsavedChanges = false,
  isSaving = false,
  onSaveAllChanges,
  saveSuccessMsg = '',
  saveErrorMsg = '',
  lastSavedTime,
  isCloudConnected = true,
  isInitialCloudLoading = false,
  isSupabaseConnected = true,
  activeEmpresaId,
  onRefreshSupabase,
  currentUser,
  onOpenAccountModal,
  onOpenSupabaseModal,
  onOpenOwnerQR,
  onOpenOrderModal,
  onNewOrderReceived,
}) => {
  const pendingQuestionsCount = (activeProject?.unansweredQuestions || []).filter(
    (q) => q.status === 'pending'
  ).length;

  const leadCount = (activeProject?.leads || []).length;
  const appointmentCount = (activeProject?.appointments || []).length;
  const isEmpresasTabActive = activeTab === 'empresas' || activeTab === 'proyectos';

  return (
    <header className="bg-[#0A0F1D] border-b border-slate-850/80 text-white sticky top-0 z-40 shadow-2xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-3">
          {/* Brand & Multi-Company Switcher */}
          <div className="flex items-center space-x-3.5 shrink-0">
            {/* Modern Robot/IA Brand Icon */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-indigo-600/30 shrink-0 hover:scale-105 active:scale-95 transition border border-indigo-400/30 group"
              title="Vendedor IA - Ir al Dashboard"
            >
              <Bot className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#0A0F1D] animate-pulse"></span>
            </button>

            <div className="flex flex-col">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="text-left font-black text-base sm:text-lg tracking-tight text-white hover:text-indigo-300 transition flex items-center gap-1.5"
                >
                  <span>Vendedor IA</span>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                </button>

                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-gradient-to-r from-blue-500/20 to-violet-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full hidden sm:inline-block">
                  SaaS Pro
                </span>

                {isInitialCloudLoading ? (
                  <span 
                    className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                    title="Cargando empresas y catálogo desde Supabase..."
                  >
                    <Loader2 className="w-3 h-3 text-emerald-400 animate-spin" />
                    <span className="hidden md:inline">Cargando...</span>
                  </span>
                ) : isCloudConnected ? (
                  <span 
                    className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-500/40 px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-sm"
                    title="Conectado en tiempo real a Supabase (PostgreSQL). Base de datos principal sincronizada."
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <CloudCheck className="w-3 h-3 text-emerald-400" />
                    <span className="hidden md:inline font-mono">Supabase</span>
                  </span>
                ) : (
                  <span 
                    className="text-[10px] font-bold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm"
                    title="Modo local/offline activo. Los cambios se sincronizarán al reconectar con Supabase."
                  >
                    <AlertCircle className="w-3 h-3 text-amber-400" />
                    <span className="hidden md:inline">Local</span>
                  </span>
                )}

                {isSupabaseConnected && (
                  <button
                    type="button"
                    onClick={onOpenSupabaseModal}
                    className="text-[10px] font-bold text-teal-300 bg-teal-950/70 hover:bg-teal-900/90 border border-teal-500/40 hover:border-teal-400 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                    title={`Supabase activo como fuente principal de empresas y productos (Empresa #${activeEmpresaId || 1}). Clic para ver estado y SQL.`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                    <span className="font-bold text-teal-300">⚡ Supabase SQL</span>
                  </button>
                )}
              </div>

              {/* Subtitle & Business Switcher */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline tracking-tight">
                  Tu centro de control comercial con IA
                </span>
                <span className="text-slate-600 hidden md:inline">•</span>

                <div className="flex items-center space-x-1.5">
                  <span className="text-[10px] text-indigo-300/80 font-bold uppercase tracking-wider hidden lg:inline">
                    {currentUser?.role === 'owner' ? 'Empresa:' : 'Empresa:'}
                  </span>
                  {(activeProject?.logoUrl || activeProject?.config?.logoUrl) && (
                    <img
                      src={activeProject?.logoUrl || activeProject?.config?.logoUrl}
                      alt={activeProject?.name || 'Logo'}
                      className="w-4 h-4 rounded-md object-cover border border-slate-700 shrink-0 hidden sm:inline-block"
                    />
                  )}

                  {currentUser?.role === 'owner' ? (
                    <div 
                      className="flex items-center space-x-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-200 px-2 py-0.5 rounded-lg text-[11px] font-bold shadow-sm"
                      title={`Dueño con acceso aislado a la Empresa #${activeEmpresaId}.`}
                    >
                      <span className="truncate max-w-[120px] sm:max-w-[160px] text-white font-extrabold">
                        {activeProject?.name}
                      </span>
                      <span className="text-[9px] text-amber-300 font-mono bg-amber-950/80 px-1 py-0.2 rounded border border-amber-500/40">
                        #{activeEmpresaId}
                      </span>
                    </div>
                  ) : (
                    <>
                      <select
                        id="select-active-company"
                        value={activeProject?.id || ''}
                        onChange={(e) => onSelectProject(e.target.value)}
                        className="bg-slate-900/90 hover:bg-slate-800 text-[11px] text-indigo-200 font-bold px-2 py-0.5 rounded-lg border border-slate-750 outline-none cursor-pointer max-w-[130px] sm:max-w-[190px] truncate"
                        title="Cambiar empresa activa (Administrador Vendedor IA)"
                      >
                        {(projects || []).map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.category || p.businessType || 'General'})
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => setActiveTab('empresas')}
                        className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold underline hidden sm:inline"
                        title="Ver todas las empresas"
                      >
                        Cambiar
                      </button>
                    </>
                  )}

                  {hasUnsavedChanges ? (
                    <span className="text-[10px] text-amber-400 font-black flex items-center space-x-1 bg-amber-500/10 px-1.5 py-0.5 rounded-md border border-amber-400/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                      <span className="hidden xl:inline">Pendiente guardar</span>
                    </span>
                  ) : lastSavedTime ? (
                    <span className="text-[9px] text-slate-500 hidden 2xl:inline">
                      Guardado {lastSavedTime}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Prominent SAVE CHANGES Button */}
            {onSaveAllChanges && (
              <button
                id="btn-header-save-changes"
                onClick={onSaveAllChanges}
                disabled={isSaving}
                title={
                  hasUnsavedChanges
                    ? 'Hay cambios sin guardar. Clic para guardar toda la información de la empresa de forma permanente en Supabase.'
                    : 'Guardar todos los cambios en Supabase'
                }
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-black transition-all flex items-center space-x-2 shadow-md ${
                  hasUnsavedChanges
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/30 border border-emerald-300 ring-2 ring-emerald-400/40 animate-pulse'
                    : isSaving
                    ? 'bg-blue-700 text-white cursor-wait opacity-90'
                    : 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400'
                }`}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span className="hidden md:inline font-bold">Guardando en Supabase...</span>
                    <span className="md:hidden font-bold">Guardando</span>
                  </>
                ) : (
                  <>
                    <Save className={`w-4 h-4 ${hasUnsavedChanges ? 'text-white' : 'text-emerald-400'}`} />
                    <span className="tracking-tight uppercase">💾 GUARDAR CAMBIOS</span>
                    {hasUnsavedChanges && (
                      <span className="w-2 h-2 rounded-full bg-amber-300 animate-ping ml-0.5" />
                    )}
                  </>
                )}
              </button>
            )}

            {/* Real-time Order Notification Bell and Floating Alert Center */}
            <OrderNotificationCenter
              empresaId={activeEmpresaId || activeProject?.empresaId || 1}
              empresaName={activeProject?.name}
              currency={activeProject?.config?.currency || 'BRL'}
              onOpenOrder={(orderId) => {
                setActiveTab('pedidos');
                if (onOpenOrderModal) {
                  onOpenOrderModal(orderId);
                }
              }}
              onNewOrderReceived={onNewOrderReceived}
            />

            <button
              onClick={() => setActiveTab('empresas')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-extrabold transition flex items-center space-x-1.5 border shrink-0 ${
                isEmpresasTabActive
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30'
                  : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Empresas ({projects.length})</span>
              <span className="sm:hidden">Empresas</span>
            </button>

            {onOpenOwnerQR && (
              <button
                id="btn-header-owner-qr"
                onClick={onOpenOwnerQR}
                title="Código QR exclusivo para el Dueño de este negocio"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white border border-indigo-400/40 text-xs font-black transition flex items-center space-x-1.5 shrink-0 shadow-md shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98]"
              >
                <QrCode className="w-4 h-4 text-indigo-200" />
                <span className="hidden lg:inline">QR Panel Dueño</span>
                <span className="lg:hidden">QR Dueño</span>
              </button>
            )}

            <button
              onClick={onOpenMobileSimulator}
              className="flex items-center space-x-1.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-extrabold shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
            >
              <Smartphone className="w-4 h-4 animate-bounce" />
              <span className="hidden sm:inline">Simulador WhatsApp</span>
              <span className="sm:hidden">Chat</span>
            </button>

            {onRefreshSupabase && (
              <button
                id="btn-header-refresh-supabase"
                onClick={onRefreshSupabase}
                disabled={isInitialCloudLoading || isSaving}
                title="Sincronizar y recargar datos desde Supabase"
                className="p-2 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-bold transition flex items-center space-x-1.5 shrink-0 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 text-emerald-400 ${isInitialCloudLoading ? 'animate-spin' : ''}`} />
                <span className="hidden xl:inline">Sincronizar Supabase</span>
              </button>
            )}

            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                title="Cambiar entre Administrador Principal y Dueño de Negocio"
                className={`p-2 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-black transition flex items-center space-x-1.5 shrink-0 shadow-sm ${
                  currentUser?.role === 'owner'
                    ? 'bg-amber-950/70 hover:bg-amber-900 border-amber-500/50 text-amber-300'
                    : 'bg-indigo-950/70 hover:bg-indigo-900 border-indigo-500/50 text-indigo-300'
                }`}
              >
                <span>{currentUser?.role === 'owner' ? '👔' : '👑'}</span>
                <span className="hidden md:inline">
                  {currentUser?.role === 'owner' ? `Dueño (#${activeEmpresaId})` : 'Admin Vendedor IA'}
                </span>
              </button>
            )}

            {onOpenAccountModal && (
              <button
                onClick={onOpenAccountModal}
                title="Estado de base de datos Supabase"
                className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center space-x-1.5 shrink-0"
              >
                <Cloud className="w-4 h-4 text-emerald-400" />
                <span className="hidden lg:inline">
                  Supabase Cloud
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs Bar - Responsive & Scrollable */}
        <nav className="flex items-center space-x-1 py-2 overflow-x-auto no-scrollbar border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'dashboard' ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>🏠 Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('empresas')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              isEmpresasTabActive ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{currentUser?.role === 'owner' ? '🏢 Mi Empresa' : '🏢 Empresas'}</span>
            <span className="bg-indigo-500/30 text-indigo-200 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-indigo-400/40">
              {projects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('produtos')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'produtos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>🛍️ Productos ({(activeProject?.catalog || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pedidos')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'pedidos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            <span>🛒 Pedidos</span>
            {(activeProject?.orders || []).length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-emerald-500/40">
                {(activeProject?.orders || []).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('catalogo_online')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'catalogo_online' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
            <span>🌐 Catálogo Online</span>
          </button>

          <button
            onClick={() => setActiveTab('estatisticas')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'estatisticas' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
            <span>📊 Estadísticas</span>
          </button>

          <button
            onClick={() => setActiveTab('promocoes')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'promocoes' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Ticket className="w-3.5 h-3.5 text-pink-400" />
            <span>🎟️ Promociones</span>
          </button>

          <button
            onClick={() => setActiveTab('entregas')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'entregas' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-teal-400" />
            <span>🚚 Entregas</span>
          </button>

          <button
            onClick={() => setActiveTab('funcionarios')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'funcionarios' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-purple-400" />
            <span>👥 Empleados</span>
          </button>

          <button
            onClick={() => setActiveTab('negocio')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'negocio' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Negocio / Empresa</span>
          </button>

          <button
            onClick={() => setActiveTab('servicos')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'servicos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Servicios ({(activeProject?.services || []).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('profissionais')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'profissionais' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Profesionales</span>
          </button>

          <button
            onClick={() => setActiveTab('horarios')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'horarios' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Horarios & Bloqueos</span>
          </button>

          <button
            onClick={() => setActiveTab('agendamentos')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'agendamentos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CalendarCheck className="w-3.5 h-3.5" />
            <span>Citas</span>
            {appointmentCount > 0 && (
              <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-indigo-500/30">
                {appointmentCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('conhecimento')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'conhecimento' ? 'bg-purple-600 text-white shadow' : 'text-purple-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5 text-purple-400" />
            <span>🧠 Base Conocimiento</span>
            {(activeProject?.aiKnowledge || []).length > 0 && (
              <span className="bg-purple-500/30 text-purple-200 text-[10px] font-black px-1.5 py-0.2 rounded-full border border-purple-400/40">
                {(activeProject?.aiKnowledge || []).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('perguntas_pendentes')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'perguntas_pendentes' ? 'bg-amber-600 text-white shadow' : 'text-amber-300 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquareX className="w-3.5 h-3.5 text-amber-400" />
            <span>❓ Preguntas Pendientes</span>
            {pendingQuestionsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full animate-pulse">
                {pendingQuestionsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('faqs')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'faqs' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>FAQs</span>
          </button>

          <button
            onClick={() => setActiveTab('leads')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'leads' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Leads & Clientes</span>
            {leadCount > 0 && (
              <span className="bg-blue-500/20 text-blue-300 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-blue-500/30">
                {leadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pagamentos')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'pagamentos' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Formas de pago y descuentos</span>
          </button>

          <button
            onClick={() => setActiveTab('whatsapp')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'whatsapp' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquareCode className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>

          <button
            onClick={() => setActiveTab('config_ia')}
            className={`whitespace-nowrap flex items-center space-x-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'config_ia' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Configuración IA</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
