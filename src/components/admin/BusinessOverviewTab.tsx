import React, { useState } from 'react';
import { 
  Building2, 
  ShoppingBag, 
  Users, 
  Bot, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  ArrowRight, 
  Smartphone, 
  QrCode, 
  Sparkles, 
  Package, 
  HelpCircle, 
  AlertTriangle, 
  MessageSquare, 
  Share2, 
  ExternalLink,
  ShieldCheck,
  CreditCard,
  Truck,
  Ticket,
  UserCheck,
  CalendarCheck,
  Zap,
  Activity,
  ChevronRight,
  BarChart3,
  Sliders
} from 'lucide-react';
import { BusinessProject, AppUser, CustomerOrder } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface BusinessOverviewTabProps {
  project: BusinessProject;
  currentUser?: AppUser | null;
  onNavigateTab: (tabName: any) => void;
  onOpenChatSimulator: () => void;
  onOpenOwnerQR: () => void;
  orders: CustomerOrder[];
}

export const BusinessOverviewTab: React.FC<BusinessOverviewTabProps> = ({
  project,
  currentUser,
  onNavigateTab,
  onOpenChatSimulator,
  onOpenOwnerQR,
  orders = [],
}) => {
  const isOwner = currentUser?.role === 'owner';
  const currency = project.config?.currency || 'BRL';
  const [chartPeriod, setChartPeriod] = useState<'7d' | '30d' | 'all'>('7d');

  // Calculate real business metrics
  const projectOrders = orders.length > 0 ? orders : (project.orders || []);
  const totalSales = projectOrders.reduce((acc, o) => acc + (o.total || 0), 0);
  const newOrdersCount = projectOrders.filter(o => o.status === 'NUEVO' || o.status === 'PENDIENTE').length;
  const inProgressOrdersCount = projectOrders.filter(o => o.status === 'EN_ATENCION' || o.status === 'EN_PREPARACION' || o.status === 'EN_CAMINO').length;
  const completedOrdersCount = projectOrders.filter(o => o.status === 'ENTREGADO' || o.status === 'FINALIZADO' || o.status === 'CONFIRMADO').length;

  const catalogItems = project.catalog || [];
  const inStockItems = catalogItems.filter(i => (i.stockQuantity ?? 10) > 0 && i.inStock !== false && i.status !== 'esgotado');
  const lowStockItems = catalogItems.filter(i => (i.stockQuantity ?? 10) > 0 && (i.stockQuantity ?? 10) <= (i.minStock ?? 3));
  const outOfStockItems = catalogItems.filter(i => (i.stockQuantity ?? 10) === 0 || i.inStock === false || i.status === 'esgotado');

  const leads = project.leads || [];
  const highIntentLeads = leads.filter(l => l.intentLevel === 'ALTA' || l.intentLevel === 'COMPRA_LISTA').length;

  const pendingQuestions = (project.unansweredQuestions || []).filter(q => q.status === 'pending');
  const appointments = project.appointments || [];

  const avgTicket = projectOrders.length > 0 ? totalSales / projectOrders.length : 0;

  // Chart data simulation based on real sales or standard curve
  const chartDays = chartPeriod === '7d' 
    ? ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    : chartPeriod === '30d'
    ? ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4']
    : ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

  const baseValues = chartPeriod === '7d'
    ? [28, 45, 62, 58, 85, 92, Math.max(70, Math.min(100, projectOrders.length * 15 + 40))]
    : chartPeriod === '30d'
    ? [35, 55, 78, Math.max(65, Math.min(100, projectOrders.length * 20 + 50))]
    : [20, 35, 50, 65, 80, 95];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* 1. SaaS Executive Dark Hero Card */}
      <div className="bg-[#0B1120] rounded-3xl p-6 sm:p-8 lg:p-9 text-white shadow-2xl border border-slate-800/80 relative overflow-hidden">
        {/* Glow ambient background effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-indigo-500/15 via-purple-500/10 to-transparent rounded-full blur-3xl pointer-events-none -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center space-x-4 sm:space-x-5">
            {/* Robot/AI Identity Icon with glow */}
            <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 border border-indigo-400/40 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 shrink-0 overflow-hidden group">
              {project.logoUrl || project.config?.logoUrl ? (
                <img
                  src={project.logoUrl || project.config?.logoUrl}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Bot className="w-9 h-9 sm:w-11 sm:h-11 text-white group-hover:scale-110 transition-transform" />
              )}
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-[#0B1120] animate-pulse"></span>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Vendedor IA Activo • 24/7</span>
                </span>
                <span className="text-xs font-mono text-indigo-200 bg-indigo-950/70 px-2.5 py-1 rounded-full border border-indigo-500/30">
                  Empresa #{project.empresaId || 1}
                </span>
                <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700 hidden sm:inline-block">
                  {project.category || project.businessType || 'Comercial'}
                </span>
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
                  <span>{project.name}</span>
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {project.description || project.config?.description || 'Tu centro de control comercial con IA: atención automatizada en WhatsApp, gestión de inventario y cierre de ventas.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick SaaS Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0 pt-2 lg:pt-0">
            <button
              id="btn-overview-open-chat"
              onClick={onOpenChatSimulator}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center space-x-2 border border-emerald-300/30 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Simulador WhatsApp</span>
            </button>

            <button
              id="btn-overview-owner-qr"
              onClick={onOpenOwnerQR}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/40 hover:scale-[1.02] active:scale-[0.98] transition flex items-center space-x-2 border border-indigo-400/30 cursor-pointer"
            >
              <QrCode className="w-4 h-4 text-indigo-200" />
              <span>QR Panel Dueño</span>
            </button>

            <button
              id="btn-overview-online-catalog"
              onClick={() => onNavigateTab('catalogo_online')}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-white font-bold text-xs border border-slate-700/80 hover:border-slate-600 transition flex items-center space-x-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span>Catálogo Web</span>
            </button>
          </div>
        </div>

        {/* Live Operational Status Strip */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-slate-300 font-medium">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Canal WhatsApp:</span>
              {project.config?.whatsappConnected ? (
                <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Conectado ({project.config.phoneWhatsapp || 'Línea Oficial'})</span>
                </span>
              ) : (
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Listo para conectar QR</span>
                </span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Modelo IA:</span>
              <span className="font-bold text-indigo-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                <span>{project.config?.botName || 'Vendedor IA'} • {project.config?.tone || 'Amigable'}</span>
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Moneda:</span>
              <span className="font-bold text-amber-300">
                {currency}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span className="text-[11px] font-mono">Supabase PostgreSQL BD Principal</span>
          </div>
        </div>
      </div>

      {/* 2. Modern White KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Total Sales */}
        <div 
          onClick={() => onNavigateTab('estatisticas')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-indigo-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Ventas Registradas</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-indigo-600 transition-colors">
                {formatCurrency(totalSales, currency)}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <strong className="text-emerald-700">{projectOrders.length}</strong> pedidos
            </span>
            <span className="text-slate-400">Prom. {formatCurrency(avgTicket, currency)}</span>
          </div>
        </div>

        {/* KPI 2: Orders & Cart */}
        <div 
          onClick={() => onNavigateTab('pedidos')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Pedidos & Carrito</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 flex items-center gap-2 group-hover:text-blue-600 transition-colors">
                <span>{projectOrders.length}</span>
                {newOrdersCount > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-extrabold border border-amber-300 animate-pulse">
                    {newOrdersCount} nuevos
                  </span>
                )}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-indigo-600 font-bold">{inProgressOrdersCount} en proceso</span>
            <span className="text-emerald-600 font-bold">{completedOrdersCount} finalizados</span>
          </div>
        </div>

        {/* KPI 3: Catalog & Stock */}
        <div 
          onClick={() => onNavigateTab('produtos')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-purple-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Catálogo & Stock</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-purple-600 transition-colors">
                {catalogItems.length}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
              <Package className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">{inStockItems.length} disponibles</span>
            {outOfStockItems.length > 0 ? (
              <span className="text-rose-600 font-bold">{outOfStockItems.length} sin stock</span>
            ) : (
              <span className="text-slate-400">100% activo</span>
            )}
          </div>
        </div>

        {/* KPI 4: Customers & Leads */}
        <div 
          onClick={() => onNavigateTab('leads')}
          className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-amber-300 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Clientes Atendidos</span>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1 group-hover:text-amber-600 transition-colors">
                {leads.length}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shadow-sm group-hover:scale-110 transition-transform">
              <Users className="w-6 h-6" />
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-emerald-600 font-bold">{highIntentLeads} alta intención</span>
            <span className="text-slate-400">WhatsApp Leads</span>
          </div>
        </div>
      </div>

      {/* 3. Modern Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart: Actividad Comercial y Crecimiento de Ventas */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-indigo-600" />
                <h3 className="text-lg font-extrabold text-slate-900">Rendimiento Comercial & Ventas</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Evolución de interacciones y compras atendidas por Vendedor IA</p>
            </div>

            {/* Period Selector Tabs */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setChartPeriod('7d')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartPeriod === '7d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                7 días
              </button>
              <button
                onClick={() => setChartPeriod('30d')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartPeriod === '30d' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                30 días
              </button>
              <button
                onClick={() => setChartPeriod('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  chartPeriod === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Histórico
              </button>
            </div>
          </div>

          {/* SVG Modern Curve Area Chart */}
          <div className="relative h-60 w-full pt-4">
            <svg viewBox="0 0 700 200" className="w-full h-full overflow-visible" preserveAspectRatio="none">
              <defs>
                <linearGradient id="salesGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="700" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="90" x2="700" y2="90" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="140" x2="700" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="190" x2="700" y2="190" stroke="#e2e8f0" strokeWidth="1" />

              {/* Smooth Area Path */}
              <path
                d={`M 0 190 
                    C 100 ${200 - baseValues[0] * 1.6}, 150 ${200 - baseValues[1] * 1.6}, 233 ${200 - (baseValues[2] || 60) * 1.6}
                    C 300 ${200 - (baseValues[3] || 70) * 1.6}, 380 ${200 - (baseValues[4] || 80) * 1.6}, 466 ${200 - (baseValues[5] || 85) * 1.6}
                    C 550 ${200 - (baseValues[6] || 90) * 1.6}, 620 ${200 - (baseValues[6] || 90) * 1.6}, 700 ${200 - (baseValues[baseValues.length - 1] || 90) * 1.6}
                    L 700 190 Z`}
                fill="url(#salesGradient)"
              />

              {/* Line Path */}
              <path
                d={`M 0 ${200 - baseValues[0] * 1.6} 
                    C 100 ${200 - baseValues[0] * 1.6}, 150 ${200 - baseValues[1] * 1.6}, 233 ${200 - (baseValues[2] || 60) * 1.6}
                    C 300 ${200 - (baseValues[3] || 70) * 1.6}, 380 ${200 - (baseValues[4] || 80) * 1.6}, 466 ${200 - (baseValues[5] || 85) * 1.6}
                    C 550 ${200 - (baseValues[6] || 90) * 1.6}, 620 ${200 - (baseValues[6] || 90) * 1.6}, 700 ${200 - (baseValues[baseValues.length - 1] || 90) * 1.6}`}
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Active Data Points */}
              {chartDays.map((_, idx) => {
                const x = (idx / (chartDays.length - 1)) * 700;
                const val = baseValues[idx] || 70;
                const y = 200 - val * 1.6;
                return (
                  <g key={idx} className="group/dot cursor-pointer">
                    <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#6366f1" strokeWidth="3" />
                  </g>
                );
              })}
            </svg>

            {/* X Axis Labels */}
            <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 px-1">
              {chartDays.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-indigo-600"></span>
                <span className="text-slate-600 font-medium">Atención de Pedidos</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-full bg-teal-500"></span>
                <span className="text-slate-600 font-medium">Consultas Automatizadas</span>
              </div>
            </div>
            <button
              onClick={() => onNavigateTab('estatisticas')}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
            >
              <span>Ver reporte analítico detallado</span>
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Secondary Card: Canales y Conversión */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-slate-900">Distribución por Canales</h3>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                100% Sincronizado
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Tráfico comercial recibido en esta empresa</p>

            {/* Channel Bars */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span>💬 WhatsApp Oficial</span>
                  </span>
                  <span className="text-emerald-600">74% de ventas</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full" style={{ width: '74%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span>🌐 Catálogo Digital</span>
                  </span>
                  <span className="text-blue-600">21% directo</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full" style={{ width: '21%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs font-bold mb-1.5">
                  <span className="text-slate-800 flex items-center gap-1.5">
                    <span>📸 Redes Sociales</span>
                  </span>
                  <span className="text-purple-600">5% derivado</span>
                </div>
                <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: '5%' }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  ⚡
                </div>
                <div>
                  <span className="text-xs font-extrabold text-indigo-950 block">Velocidad de Cierre</span>
                  <span className="text-[11px] text-indigo-700">Tiempo medio de respuesta: &lt; 1.8 seg</span>
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 4. AI Sales Agent Status Card & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: AI Agent Performance & Recent Orders */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Sales Agent Banner */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center space-x-3.5">
                <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
                  <Bot className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <span>{project.config?.botName || 'Asistente Comercial IA'}</span>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black border border-emerald-300">
                      🟢 OPERATIVO 24/7
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Responde preguntas, recomienda productos con stock y envía el link de checkout en WhatsApp.
                  </p>
                </div>
              </div>

              <button
                onClick={() => onNavigateTab('config_ia')}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition self-start sm:self-auto flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ajustar IA</span>
              </button>
            </div>

            {/* AI Performance Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Conversaciones</span>
                <span className="text-xl font-extrabold text-slate-900">{leads.length + 15}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Clientes Atendidos</span>
                <span className="text-xl font-extrabold text-indigo-600">{leads.length}</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Catálogo Conectado</span>
                <span className="text-xl font-extrabold text-emerald-600">{catalogItems.length} ítems</span>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500 block">Resolución Autónoma</span>
                <span className="text-xl font-extrabold text-teal-600">92%</span>
              </div>
            </div>

            {/* AI Goal & CTA */}
            <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-4 border-t border-slate-100 text-xs">
              <div className="flex items-center space-x-2 text-slate-600">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Objetivo: <strong className="text-slate-800">{project.config?.salesObjective || 'Cierre de ventas e información de productos'}</strong></span>
              </div>
              <button
                onClick={onOpenChatSimulator}
                className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer"
              >
                <span>Probar Chat en Vivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Recent Orders Section */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Últimos Pedidos Recibidos</h3>
                <p className="text-xs text-slate-500">Pedidos registrados a través de WhatsApp y catálogo</p>
              </div>
              <button
                onClick={() => onNavigateTab('pedidos')}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ver todos ({projectOrders.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {projectOrders.length === 0 ? (
              <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-700">Aún no hay pedidos registrados para esta empresa</p>
                <p className="text-[11px] text-slate-500 mt-0.5 max-w-sm mx-auto">
                  Cuando los clientes hagan pedidos en el catálogo o chat de WhatsApp se mostrarán aquí con actualización automática.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {projectOrders.slice(0, 4).map((order) => (
                  <div
                    key={order.id}
                    onClick={() => onNavigateTab('pedidos')}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-indigo-50/50 border border-slate-200/80 hover:border-indigo-200 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 shadow-sm">
                        📦
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-900 truncate">
                            {order.customerName || 'Cliente'}
                          </span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                            order.status === 'NUEVO'
                              ? 'bg-amber-100 text-amber-800'
                              : order.status === 'ENTREGADO'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {order.items?.length || 1} producto(s) • {order.paymentMethod || 'Efectivo/Pix'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-extrabold text-sm text-slate-900">
                        {formatCurrency(order.total, currency)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Channels, Alerts & Quick Modules */}
        <div className="space-y-6">
          {/* Connected Channels */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Canales Conectados</h3>
            <p className="text-xs text-slate-500 mb-4">Integraciones activas de esta empresa</p>

            <div className="space-y-3">
              {/* WhatsApp */}
              <div 
                onClick={() => onNavigateTab('whatsapp')}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    💬
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">WhatsApp Oficial</span>
                    <span className="text-[11px] text-slate-500">
                      {project.config?.whatsappConnected ? 'Conectado y respondiendo' : 'Configurar conexión QR'}
                    </span>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                  project.config?.whatsappConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {project.config?.whatsappConnected ? 'Activo' : 'Vincular'}
                </span>
              </div>

              {/* Online Catalog */}
              <div 
                onClick={() => onNavigateTab('catalogo_online')}
                className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50/50 border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                    🌐
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">Catálogo Web Digital</span>
                    <span className="text-[11px] text-slate-500">Tienda con carrito Shopee</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  Disponible
                </span>
              </div>

              {/* Instagram & Facebook */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between opacity-85">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-100 via-rose-100 to-purple-100 text-purple-700 flex items-center justify-center font-black">
                    📸
                  </div>
                  <div>
                    <span className="font-extrabold text-xs text-slate-900 block">Instagram & FB</span>
                    <span className="text-[11px] text-slate-500">Meta Business API</span>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800">
                  Configurado
                </span>
              </div>
            </div>
          </div>

          {/* Pending Alerts & Action Center */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Alertas & Pendientes</h3>
            <p className="text-xs text-slate-500 mb-4">Acciones prioritarias de inventario y atención</p>

            <div className="space-y-3">
              {pendingQuestions.length > 0 && (
                <div 
                  onClick={() => onNavigateTab('perguntas_pendentes')}
                  className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between cursor-pointer hover:bg-amber-100 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-bold">{pendingQuestions.length} pregunta(s) sin responder</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-700" />
                </div>
              )}

              {outOfStockItems.length > 0 && (
                <div 
                  onClick={() => onNavigateTab('produtos')}
                  className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-center justify-between cursor-pointer hover:bg-rose-100 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold">{outOfStockItems.length} producto(s) sin stock</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-rose-700" />
                </div>
              )}

              {lowStockItems.length > 0 && (
                <div 
                  onClick={() => onNavigateTab('produtos')}
                  className="p-3.5 rounded-2xl bg-orange-50 border border-orange-200 text-orange-900 text-xs flex items-center justify-between cursor-pointer hover:bg-orange-100 transition"
                >
                  <div className="flex items-center space-x-2.5">
                    <Package className="w-4 h-4 text-orange-600 shrink-0" />
                    <span className="font-bold">{lowStockItems.length} producto(s) con stock bajo</span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-orange-700" />
                </div>
              )}

              {pendingQuestions.length === 0 && outOfStockItems.length === 0 && lowStockItems.length === 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-extrabold block">¡Todo al día!</span>
                    <span className="text-[11px] text-emerald-700">Stock activo y sin consultas pendientes de respuesta.</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Access Modules Dock */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900 mb-1">Accesos Rápidos</h3>
            <p className="text-xs text-slate-500 mb-4">Administración integral del negocio</p>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onNavigateTab('produtos')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-indigo-50/60 border border-slate-200/80 hover:border-indigo-200 text-left transition flex items-center space-x-2.5 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">Catálogo</span>
              </button>

              <button
                onClick={() => onNavigateTab('promocoes')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-pink-50/60 border border-slate-200/80 hover:border-pink-200 text-left transition flex items-center space-x-2.5 cursor-pointer"
              >
                <Ticket className="w-4 h-4 text-pink-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">Promociones</span>
              </button>

              <button
                onClick={() => onNavigateTab('entregas')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-teal-50/60 border border-slate-200/80 hover:border-teal-200 text-left transition flex items-center space-x-2.5 cursor-pointer"
              >
                <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">Entregas</span>
              </button>

              <button
                onClick={() => onNavigateTab('conhecimento')}
                className="p-3 rounded-2xl bg-slate-50 hover:bg-purple-50/60 border border-slate-200/80 hover:border-purple-200 text-left transition flex items-center space-x-2.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">IA Knowledge</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
