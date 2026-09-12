import React, { useRef, useState } from 'react';
import { BusinessConfig, ServiceType, CurrencyCode, AppUser } from '../../types';
import { 
  Building2, 
  MapPin, 
  Phone, 
  Globe, 
  Instagram, 
  Clock, 
  Sparkles, 
  RotateCcw, 
  Calendar, 
  ShoppingBag, 
  Zap,
  Info,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  DollarSign,
  Upload,
  Image as ImageIcon,
  RefreshCw,
  Loader2,
  Store,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
  PowerOff,
  Bell
} from 'lucide-react';
import { COUNTRIES, CURRENCIES } from './NewProjectModal';
import { compressImageToDataUrl } from '../../utils/imageOptimizer';
import { AppLanguage } from '../../types';

export const ASSISTANT_LANGUAGES: { code: AppLanguage; label: string; flag: string }[] = [
  { code: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'en', label: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'pt-PT', label: 'Português de Portugal', flag: '🇵🇹' },
];

interface BusinessConfigTabProps {
  config: BusinessConfig;
  onChange: (updatedConfig: BusinessConfig) => void;
  onSave: () => void;
  isSaving: boolean;
  projectName?: string;
  onDeleteCurrentProject?: () => void;
  currentUser?: AppUser | null;
  onOpenOwnerQR?: () => void;
  activeEmpresaId?: number;
  onRevokeOwnerAccess?: () => void;
  onRestoreOwnerAccess?: () => void;
  isOwnerAccessRevoked?: boolean;
}

export const BusinessConfigTab: React.FC<BusinessConfigTabProps> = ({
  config,
  onChange,
  onSave,
  isSaving,
  projectName = 'este negocio',
  onDeleteCurrentProject,
  currentUser,
  onOpenOwnerQR,
  activeEmpresaId,
  onRevokeOwnerAccess,
  onRestoreOwnerAccess,
  isOwnerAccessRevoked = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleChange = (field: keyof BusinessConfig, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const optimized = await compressImageToDataUrl(file, 400, 0.8);
      if (optimized) {
        handleChange('logoUrl', optimized);
      }
    } catch (err) {
      console.error('Error al subir logo de empresa:', err);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = () => {
    handleChange('logoUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Building2 className="w-4 h-4" />
              <span>Configuración Comercial del Negocio</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Perfil de la Empresa & Atención
            </h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Configura los datos oficiales de tu empresa para que el vendedor IA atienda a tus clientes con total precisión y guarde todo en Supabase.
            </p>
          </div>

          <button
            id="btn-save-business-config"
            onClick={onSave}
            disabled={isSaving}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center space-x-2 transition-all shrink-0 disabled:opacity-50"
          >
            {isSaving ? (
              <span>Guardando en Supabase...</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>💾 Guardar Cambios en Supabase</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Acceso Móvil / QR del Dueño y Control de Acceso */}
      {onOpenOwnerQR && (
        <div className={`rounded-2xl p-5 border text-white flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 shadow-xl transition-all ${
          isOwnerAccessRevoked
            ? 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950 border-red-500/40'
            : 'bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border-indigo-500/40'
        }`}>
          <div className="flex items-start space-x-3.5">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
              isOwnerAccessRevoked
                ? 'bg-red-600/80 border border-red-400/50 shadow-red-600/30'
                : 'bg-indigo-600/80 border border-indigo-400/50 shadow-indigo-600/30'
            }`}>
              {isOwnerAccessRevoked ? (
                <ShieldAlert className="w-6 h-6 text-white" />
              ) : (
                <QrCode className="w-6 h-6 text-white" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                  isOwnerAccessRevoked
                    ? 'text-red-300 bg-red-500/20 border-red-400/30'
                    : 'text-indigo-300 bg-indigo-500/20 border-indigo-400/30'
                }`}>
                  QR 2: Panel Privado del Dueño
                </span>
                {activeEmpresaId && (
                  <span className="text-xs text-indigo-300 font-mono font-bold">
                    Empresa #{activeEmpresaId}
                  </span>
                )}
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isOwnerAccessRevoked
                    ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                    : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOwnerAccessRevoked ? 'bg-red-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span>{isOwnerAccessRevoked ? 'Acceso Desconectado' : 'Acceso Activo'}</span>
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-1">
                {isOwnerAccessRevoked
                  ? 'Panel del Dueño Desconectado / Revocado'
                  : 'Código QR de Acceso al Panel del Dueño'}
              </h3>
              <p className="text-xs text-slate-300 max-w-xl mt-0.5 leading-relaxed">
                {isOwnerAccessRevoked ? (
                  <span className="text-red-200">
                    El acceso a este panel ha sido revocado. El dueño no puede entrar ni editar. <strong>Todos los productos, precios, fotos y WhatsApp del negocio se mantienen 100% seguros e intactos en Supabase.</strong>
                  </span>
                ) : (
                  <span>
                    El dueño administra exclusivamente su empresa desde el celular o tablet. Cualquier cambio se sincroniza en tiempo real: <strong>Mi panel ↔ Supabase ↔ Panel del dueño</strong>.
                  </span>
                )}
              </p>
              {config.ownerWhatsapp && (
                <div className="mt-2 text-[11px] text-indigo-200 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>WhatsApp del Dueño registrado:</span>
                  <strong className="font-mono text-white">{config.ownerWhatsapp}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto">
            {isOwnerAccessRevoked ? (
              onRestoreOwnerAccess && (
                <button
                  type="button"
                  onClick={onRestoreOwnerAccess}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30 hover:scale-105"
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-200" />
                  <span>Volver a dar acceso al dueño</span>
                </button>
              )
            ) : (
              <>
                <button
                  type="button"
                  onClick={onOpenOwnerQR}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 hover:scale-105"
                >
                  <QrCode className="w-4 h-4 text-indigo-200" />
                  <span>Ver Código QR del Dueño</span>
                </button>
                {onRevokeOwnerAccess && (
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('¿Desconectar el panel del dueño?\n\nEl dueño perderá acceso a su panel inmediatamente. Ningún producto ni dato del negocio será eliminado. Podrás reactivar su acceso en cualquier momento.')) {
                        onRevokeOwnerAccess();
                      }
                    }}
                    className="px-3 py-2.5 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-500/40 text-xs font-bold transition flex items-center justify-center space-x-1.5 hover:scale-105"
                    title="Desconectar panel del dueño sin borrar productos ni datos"
                  >
                    <PowerOff className="w-3.5 h-3.5 text-red-400" />
                    <span>Desconectar panel del dueño</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Modalidad de Operación */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Zap className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Modalidad de Operación</h3>
            <p className="text-slate-500 text-xs">Define el enfoque operativo del asistente de IA para este negocio</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Opción 1: Venta */}
          <div 
            onClick={() => handleChange('serviceType', 'venda')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.serviceType === 'venda'
                ? 'border-emerald-600 bg-emerald-50/40 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5" />
              </div>
              {config.serviceType === 'venda' && (
                <span className="w-3 h-3 rounded-full bg-emerald-600" />
              )}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">🛍️ Venta de Productos</h4>
            <p className="text-slate-500 text-xs mt-1">
              Catálogo físico, inventario, precios, stock y checkout (Dulcerías, Carnicerías, Tiendas).
            </p>
          </div>

          {/* Opción 2: Agendamiento */}
          <div 
            onClick={() => handleChange('serviceType', 'agendamento')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.serviceType === 'agendamento'
                ? 'border-blue-600 bg-blue-50/40 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                <Calendar className="w-5 h-5" />
              </div>
              {config.serviceType === 'agendamento' && (
                <span className="w-3 h-3 rounded-full bg-blue-600" />
              )}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">✂️ Agendamiento de Citas</h4>
            <p className="text-slate-500 text-xs mt-1">
              Reserva de turnos con profesionales, agenda, confirmaciones (Salones, Barberías, Spas).
            </p>
          </div>

          {/* Opción 3: Venda + Agendamento (RECOMENDADO) */}
          <div 
            onClick={() => handleChange('serviceType', 'venda_agendamento')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.serviceType === 'venda_agendamento'
                ? 'border-purple-600 bg-purple-50/40 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <span className="absolute -top-3 right-4 bg-purple-600 text-white font-extrabold text-[10px] uppercase px-2.5 py-0.5 rounded-full shadow-sm">
              Completo
            </span>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              {config.serviceType === 'venda_agendamento' && (
                <span className="w-3 h-3 rounded-full bg-purple-600" />
              )}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">🛍️+✂️ Venta + Agendamiento</h4>
            <p className="text-slate-500 text-xs mt-1">
              La IA administra productos en stock y la agenda de turnos en la misma conversación.
            </p>
          </div>
        </div>
      </div>

      {/* Datos Principales de la Empresa */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">Información Principal de la Empresa</h3>
        </div>

        {/* Logo de la empresa */}
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition-all">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-blue-600" />
              <span>Logo de la empresa</span>
            </label>
            <span className="text-[10px] text-slate-400 font-medium">JPG, PNG o WebP</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Sube el logo oficial de la empresa desde la galería o archivos. Vinculado exclusivamente a esta empresa y guardado permanentemente en la nube.
          </p>

          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Preview Thumbnail */}
            <div className="relative w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
              {config.logoUrl ? (
                <>
                  <img
                    src={config.logoUrl}
                    alt={config.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="p-1.5 bg-white/95 text-slate-800 rounded-full hover:bg-white shadow transition transform active:scale-95"
                      title="Cambiar logo"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-2">
                  <Store className="w-7 h-7 text-slate-400 mx-auto mb-0.5" />
                  <span className="text-[9px] text-slate-400 font-bold block">Sin logo</span>
                </div>
              )}
            </div>

            {/* Upload / Replace / Delete buttons */}
            <div className="flex-1 space-y-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="business-config-logo-input"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isUploadingLogo ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : config.logoUrl ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Cambiar / Reemplazar logo</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3.5 h-3.5" />
                      <span>Subir logo desde galería</span>
                    </>
                  )}
                </button>

                {config.logoUrl && (
                  <button
                    type="button"
                    onClick={handleDeleteLogo}
                    className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition inline-flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                    title="Eliminar logo actual"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar logo</span>
                  </button>
                )}
              </div>

              <span className="text-[10px] text-slate-500 block">
                {config.logoUrl
                  ? '✓ Logo guardado para esta empresa.'
                  : 'Puedes subir una imagen desde tu celular o computadora.'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre de la Empresa</label>
            <input
              type="text"
              required
              value={config.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold"
              placeholder="Ej. Studio Beleza & Barbería Pro"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Rubro / Categoría</label>
            <input
              type="text"
              value={config.industry || config.category || ''}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium"
              placeholder="Ej. Barbería, Dulcería, Cafetería, Carnicería, Moda..."
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Descripción del Negocio</label>
            <textarea
              rows={2}
              value={config.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="Describe qué ofrece tu negocio, especialidades y valor agregado..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>País</span>
            </label>
            <select
              value={config.country || 'Brasil'}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-400" />
              <span>Moneda Oficial</span>
            </label>
            <select
              value={config.currency || 'BRL'}
              onChange={(e) => handleChange('currency', e.target.value as CurrencyCode)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-bold"
            >
              {CURRENCIES.map((cur) => (
                <option key={cur.code} value={cur.code}>
                  {cur.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-indigo-500" />
              <span>Idioma del Asistente (IA)</span>
            </label>
            <select
              value={config.language || 'pt-BR'}
              onChange={(e) => handleChange('language', e.target.value as AppLanguage)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors font-bold"
            >
              {ASSISTANT_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-blue-600" />
                <span>WhatsApp del Negocio</span>
              </label>
              <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded">Atención al Cliente</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
              Línea con la que el bot atiende clientes y recibe pedidos. Vinculada con el QR 1 (WhatsApp).
            </p>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={config.phoneWhatsapp}
                onChange={(e) => handleChange('phoneWhatsapp', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-mono font-bold"
                placeholder="+55 11 98877-6655"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-indigo-900 uppercase flex items-center gap-1">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>WhatsApp del Dueño</span>
              </label>
              <span className="text-[10px] text-indigo-700 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">Acceso al Panel</span>
            </div>
            <p className="text-[11px] text-slate-500 mb-1.5 leading-snug">
              Número personal del dueño para acceso a su panel privado. Es independiente del WhatsApp del negocio.
            </p>
            <div className="relative">
              <Smartphone className="w-4 h-4 text-indigo-500 absolute left-3 top-2.5" />
              <input
                type="text"
                value={config.ownerWhatsapp || ''}
                onChange={(e) => handleChange('ownerWhatsapp', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-indigo-50/40 border border-indigo-200 rounded-xl text-xs text-slate-900 outline-none focus:border-indigo-500 focus:bg-white transition-colors font-mono font-bold"
                placeholder="+55 11 99988-7766"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Horario de Atención</label>
            <div className="relative">
              <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={config.businessHours}
                onChange={(e) => handleChange('businessHours', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors font-medium"
                placeholder="Ex. Segunda a Sábado: 09:00 às 20:00"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Instagram Oficial</label>
            <div className="relative">
              <Instagram className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={config.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                placeholder="@suaempresa"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Website Oficial</label>
            <div className="relative">
              <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={config.website}
                onChange={(e) => handleChange('website', e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
                placeholder="https://suaempresa.com"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ubicación & Dirección */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">Ubicación y Dirección</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Dirección Completa</label>
            <input
              type="text"
              value={config.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="Calle Oscar Freire, 1020 - Jardins..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Ciudad / Estado</label>
            <input
              type="text"
              value={config.city}
              onChange={(e) => handleChange('city', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="São Paulo - SP"
            />
          </div>
        </div>
      </div>

      {/* FASE 18: Notificaciones para el Dueño */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Bell className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Notificaciones para el Dueño</h3>
            <p className="text-slate-500 text-xs">
              Activa o desactiva las alertas automáticas para mantenerte al tanto de las actividades de tu empresa.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {[
            { key: 'newOrder', label: '📦 Nuevo Pedido', desc: 'Avisar cuando un cliente envíe un pedido' },
            { key: 'cancelledOrder', label: '❌ Pedido Cancelado', desc: 'Avisar cuando se cancele un pedido' },
            { key: 'lowStock', label: '🔔 Stock Bajo', desc: 'Avisar cuando un producto llegue al mínimo' },
            { key: 'outOfStock', label: '⚠️ Sin Stock', desc: 'Avisar cuando un producto se agote a 0' },
            { key: 'newCustomer', label: '👤 Nuevo Cliente', desc: 'Avisar ante un nuevo contacto registrado' },
            { key: 'newAppointment', label: '📅 Nuevo Agendamiento', desc: 'Avisar cuando se reserve una cita' },
            { key: 'orderReady', label: '✅ Pedido Listo', desc: 'Avisar cuando el pedido esté preparado' },
            { key: 'orderDelivered', label: '🚚 Entrega Realizada', desc: 'Avisar cuando el pedido sea entregado' },
          ].map((item) => {
            const notifSettings = config.notificationSettings || {
              newOrder: true,
              cancelledOrder: true,
              lowStock: true,
              outOfStock: true,
              newCustomer: true,
              newAppointment: true,
              orderReady: true,
              orderDelivered: true,
            };
            const isEnabled = notifSettings[item.key as keyof typeof notifSettings] !== false;

            return (
              <div
                key={item.key}
                onClick={() => {
                  handleChange('notificationSettings', {
                    ...notifSettings,
                    [item.key]: !isEnabled,
                  });
                }}
                className={`cursor-pointer p-3.5 rounded-xl border transition flex items-start justify-between gap-2 select-none ${
                  isEnabled
                    ? 'bg-indigo-50/50 border-indigo-200 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-500 opacity-60'
                }`}
              >
                <div>
                  <h4 className="font-bold text-xs">{item.label}</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
                <div
                  className={`w-9 h-5 rounded-full p-0.5 transition shrink-0 ${
                    isEnabled ? 'bg-indigo-600' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition transform ${
                      isEnabled ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Políticas Comerciais */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">Políticas Comerciales de la Empresa</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Política de Envíos / Entregas</label>
            <textarea
              rows={2}
              value={config.shippingPolicy}
              onChange={(e) => handleChange('shippingPolicy', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="Ex. Envíos el mismo día. Frete gratis en compras superiores..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Política de Cancelación / Devolución</label>
            <textarea
              rows={2}
              value={config.cancellationPolicy}
              onChange={(e) => handleChange('cancellationPolicy', e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-colors"
              placeholder="Ex. Citas cancelables con hasta 2 horas de anticipación..."
            />
          </div>
        </div>
      </div>

      {/* Danger Zone: Delete this company (Superadmin only) */}
      {onDeleteCurrentProject && currentUser?.role !== 'owner' && (
        <div className="bg-red-50/60 border border-red-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-red-900 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <span>Zona de Peligro: Eliminar Empresa</span>
            </h4>
            <p className="text-xs text-red-700 mt-0.5">
              Eliminará esta empresa ({config.name}) y todos sus productos, servicios y registros de Supabase de forma permanente.
            </p>
          </div>
          <button
            type="button"
            onClick={onDeleteCurrentProject}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-1.5 shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Eliminar esta Empresa</span>
          </button>
        </div>
      )}
    </div>
  );
};
