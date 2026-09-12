import React, { useState } from 'react';
import { 
  QrCode, 
  Copy, 
  Check, 
  ExternalLink, 
  Download, 
  ShieldCheck, 
  ShieldAlert,
  Smartphone, 
  Sparkles, 
  X, 
  Building2, 
  RefreshCw,
  Share2,
  Lock,
  PowerOff,
  MessageSquare
} from 'lucide-react';
import { BusinessProject } from '../../types';

interface OwnerPanelQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: BusinessProject | null;
  empresaId: number;
  onRevokeOwnerAccess?: () => void;
  onRestoreOwnerAccess?: () => void;
}

export const OwnerPanelQRModal: React.FC<OwnerPanelQRModalProps> = ({
  isOpen,
  onClose,
  project,
  empresaId,
  onRevokeOwnerAccess,
  onRestoreOwnerAccess,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !project) return null;

  const isRevoked = Boolean(project.ownerAccessRevoked ?? project.config?.ownerAccessRevoked);
  const ownerWhatsapp = project.ownerWhatsapp || project.config?.ownerWhatsapp || '';
  const accessToken = project.ownerAccessToken || project.config?.ownerAccessToken || 'valid';

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendedor-ia.app';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '/';
  
  // Clean URL for Owner's private panel with token
  const ownerAccessUrl = `${origin}${pathname}?empresaId=${empresaId}&role=owner&token=${accessToken}`;
  
  // QR code image URL pointing exclusively to the owner's private panel
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=12&format=png&data=${encodeURIComponent(
    ownerAccessUrl
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(ownerAccessUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleDownloadQR = () => {
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `QR_Panel_Dueno_${project.name.replace(/\s+/g, '_')}_Empresa_${empresaId}.png`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenTest = () => {
    window.open(ownerAccessUrl, '_blank');
  };

  const handleSendToOwnerWhatsapp = () => {
    if (!ownerWhatsapp) return;
    const cleanNumber = ownerWhatsapp.replace(/\D/g, '');
    const message = encodeURIComponent(
      `¡Hola! Aquí tienes el acceso exclusivo a tu Panel de Control de *${project.name}* en Vendedor IA:\n\n${ownerAccessUrl}\n\nDesde aquí puedes actualizar tus productos, precios, fotos, horarios y preguntas. Cualquier cambio se guarda automáticamente.`
    );
    window.open(`https://wa.me/${cleanNumber}?text=${message}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl relative max-h-[92vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          title="Cerrar ventana"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0 ${
            isRevoked
              ? 'bg-red-600/80 border border-red-400/50 shadow-red-600/30'
              : 'bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-indigo-600/30'
          }`}>
            {isRevoked ? <ShieldAlert className="w-6 h-6 text-white" /> : <QrCode className="w-6 h-6 text-white" />}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                isRevoked
                  ? 'text-red-300 bg-red-500/20 border-red-500/30'
                  : 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20'
              }`}>
                QR 2: Panel Privado del Dueño
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                #{empresaId}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isRevoked
                  ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              }`}>
                {isRevoked ? 'Desconectado' : 'Activo'}
              </span>
            </div>
            <h3 className="text-xl font-black text-white tracking-tight mt-0.5">
              Acceso Móvil para el Dueño
            </h3>
            <p className="text-xs text-slate-400">
              {project.name}
            </p>
          </div>
        </div>

        {/* Status Alert if Revoked */}
        {isRevoked && (
          <div className="p-3.5 bg-red-950/70 border border-red-500/50 rounded-2xl text-xs space-y-2 mb-5 text-red-200">
            <div className="flex items-center space-x-2 font-bold text-red-100">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>Acceso al Panel del Dueño Revocado</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              El dueño tiene su acceso desconectado actualmente. Los productos, precios, fotos, horarios y WhatsApp del negocio se mantienen 100% intactos y seguros en Supabase.
            </p>
            {onRestoreOwnerAccess && (
              <button
                type="button"
                onClick={onRestoreOwnerAccess}
                className="mt-1 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center space-x-1.5 shadow"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Reactivar / Volver a dar acceso al dueño</span>
              </button>
            )}
          </div>
        )}

        {/* Distinctive Note: WhatsApp QR vs Owner Panel QR */}
        <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-2xl text-xs space-y-1 mb-5">
          <div className="flex items-center space-x-1.5 font-bold text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Diferenciación de Códigos QR oficiales</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            • <strong>QR 1 (WhatsApp):</strong> Vincula la línea del bot para atención y ventas.<br />
            • <strong>QR 2 (Este Código):</strong> Abre el panel de control exclusivo para el dueño del negocio en su teléfono o tablet.
          </p>
        </div>

        {/* QR Code Container */}
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-5 text-center space-y-4">
          <div className={`p-3 bg-white rounded-2xl inline-block shadow-2xl border-4 relative group ${
            isRevoked ? 'border-red-500/40 opacity-50 grayscale' : 'border-indigo-500/30'
          }`}>
            <img
              src={qrCodeUrl}
              alt={`Código QR Panel del Dueño para ${project.name}`}
              className="w-56 h-56 sm:w-60 sm:h-60 object-contain mx-auto transition-transform group-hover:scale-[1.02]"
            />
            {isRevoked ? (
              <div className="mt-2 text-[11px] font-extrabold text-red-600 flex items-center justify-center space-x-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Acceso suspendido temporalmente</span>
              </div>
            ) : (
              <div className="mt-2 text-[11px] font-extrabold text-slate-700 flex items-center justify-center space-x-1.5">
                <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                <span>Escanea con la cámara del celular</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold text-white">
              Panel 100% Aislado y Sincronizado en Tiempo Real
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
              El dueño de <strong>{project.name}</strong> podrá modificar productos, precios, fotos, descripciones, pesaje, horarios y preguntas. Todos los cambios se guardan en Supabase y se actualizan en tu panel de administrador automáticamente.
            </p>
          </div>
        </div>

        {/* WhatsApp del Dueño Info Box */}
        {ownerWhatsapp ? (
          <div className="mt-4 p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between gap-2">
            <div className="text-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">WhatsApp del Dueño</span>
              <strong className="text-indigo-300 font-mono text-sm">{ownerWhatsapp}</strong>
            </div>
            <button
              type="button"
              onClick={handleSendToOwnerWhatsapp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center space-x-1.5 shadow"
              title="Abrir WhatsApp y enviar el enlace de acceso al dueño"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Enviar acceso por WhatsApp</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 p-2.5 bg-slate-800/40 border border-slate-800 rounded-xl text-[11px] text-slate-400 flex items-center justify-between">
            <span>Puedes registrar el WhatsApp del dueño en Configuración de la Empresa para enviarle el acceso directo.</span>
          </div>
        )}

        {/* Direct Link Box */}
        <div className="mt-4 space-y-2">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Enlace Directo del Panel del Dueño:
          </label>
          <div className="flex items-center bg-slate-950 p-2 rounded-xl border border-slate-800 space-x-2">
            <input
              type="text"
              readOnly
              value={ownerAccessUrl}
              className="bg-transparent text-indigo-300 font-mono text-[11px] w-full focus:outline-none select-all px-1"
            />
            <button
              type="button"
              onClick={handleCopyLink}
              className={`p-2 rounded-lg text-xs font-bold transition flex items-center space-x-1 shrink-0 ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow'
              }`}
              title="Copiar enlace"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
          </div>
        </div>

        {/* Security & Isolation Callout */}
        <div className="mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl flex items-start space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-[11px] text-emerald-200/90 leading-relaxed">
            <strong>Seguridad Supabase RLS:</strong> El dueño tiene acceso exclusivo a la empresa <strong>#{empresaId}</strong>. No tiene acceso a datos ni productos de otras empresas registradas en la plataforma.
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={handleDownloadQR}
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4 text-indigo-400" />
            <span>Descargar Código QR</span>
          </button>

          <button
            type="button"
            onClick={handleOpenTest}
            className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-extrabold shadow-lg shadow-indigo-600/25 transition flex items-center justify-center space-x-2"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Probar / Abrir Panel</span>
          </button>
        </div>

        {/* Disconnect action at the bottom */}
        {!isRevoked && onRevokeOwnerAccess && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">¿Deseas suspender el acceso de este panel?</span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm('¿Desconectar el panel del dueño?\n\nEl dueño perderá acceso inmediatamente a su panel. Ningún producto ni dato de la empresa será eliminado. Podrás reactivarlo en cualquier momento.')) {
                  onRevokeOwnerAccess();
                }
              }}
              className="text-red-400 hover:text-red-300 font-bold transition flex items-center space-x-1"
            >
              <PowerOff className="w-3.5 h-3.5" />
              <span>Desconectar panel del dueño</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

