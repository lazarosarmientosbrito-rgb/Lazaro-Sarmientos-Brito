import React, { useState } from 'react';
import { Trash2, AlertTriangle, X, ShieldAlert, CheckCircle2, AlertCircle, Database, Package, ShoppingBag, Users, Bot, QrCode } from 'lucide-react';
import { BusinessProject } from '../../types';

interface DeleteProjectModalProps {
  isOpen: boolean;
  project: BusinessProject | null;
  hasUnsavedChanges?: boolean;
  totalProjectsCount: number;
  onCancel: () => void;
  onConfirmDelete: (projectId: string) => void;
  isDeleting?: boolean;
}

export const DeleteProjectModal: React.FC<DeleteProjectModalProps> = ({
  isOpen,
  project,
  hasUnsavedChanges = false,
  totalProjectsCount,
  onCancel,
  onConfirmDelete,
  isDeleting = false,
}) => {
  const [typedConfirmation, setTypedConfirmation] = useState('');
  const [hasConfirmedCheckbox, setHasConfirmedCheckbox] = useState(false);

  // Reset internal state whenever modal opens or project changes
  React.useEffect(() => {
    if (isOpen) {
      setTypedConfirmation('');
      setHasConfirmedCheckbox(false);
    }
  }, [isOpen, project?.id]);

  if (!isOpen || !project) return null;

  const catalogCount = project.catalog?.length || 0;
  const ordersCount = project.orders?.length || 0;
  const servicesCount = project.services?.length || 0;
  const leadsCount = project.leads?.length || 0;
  const faqsCount = project.faqs?.length || 0;
  const knowledgeCount = project.aiKnowledge?.length || 0;
  const targetEmpresaId = project.empresaId || (project.id.startsWith('empresa-') ? project.id.replace('empresa-', '') : null);

  const isOnlyProject = totalProjectsCount <= 1;

  // Validation: User must type either the company name OR "ELIMINAR"
  const trimmedInput = typedConfirmation.trim().toLowerCase();
  const trimmedName = (project.name || '').trim().toLowerCase();
  const isInputValid = trimmedInput === 'eliminar' || trimmedInput === trimmedName;
  const isConfirmEnabled = isInputValid && hasConfirmedCheckbox && !isDeleting;

  const handleConfirm = () => {
    if (isConfirmEnabled) {
      onConfirmDelete(project.id);
    }
  };

  return (
    <div 
      id="delete-project-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
    >
      <div className="bg-slate-900 border border-red-500/30 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl text-white relative overflow-hidden animate-scale-up max-h-[92vh] overflow-y-auto">
        {/* Red Danger Glow Background */}
        <div className="absolute -top-24 -right-24 w-60 h-60 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
              <Trash2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-flex items-center space-x-1.5 text-[10px] font-black uppercase tracking-wider text-red-400 bg-red-500/10 px-2.5 py-0.5 rounded-full border border-red-500/20">
                <AlertTriangle className="w-3 h-3" />
                <span>Zona de Peligro • Eliminación Definitiva</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-tight mt-1">
                Eliminar Empresa por Completo
              </h3>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Targeted Project Card Info */}
        <div className="relative z-10 space-y-4 mb-5">
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-xl bg-slate-700/80 border border-slate-600 flex items-center justify-center text-2xl shrink-0 overflow-hidden">
                {project.logoUrl || project.config?.logoUrl ? (
                  <img src={project.logoUrl || project.config?.logoUrl} alt={project.name} className="w-full h-full object-cover" />
                ) : (
                  <span>{project.name?.match(/^([\p{Emoji}]+)/u)?.[0] || '🏢'}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="font-extrabold text-base text-white truncate">{project.name}</h4>
                <p className="text-xs text-slate-400 truncate">
                  {targetEmpresaId && (
                    <span className="font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[11px] font-bold mr-1.5">
                      Empresa #{targetEmpresaId}
                    </span>
                  )}
                  {project.category || project.businessType}
                </p>
              </div>
            </div>

            {/* Complete Data Breakdown that will be cascaded */}
            <div className="pt-2 border-t border-slate-700/50 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase block tracking-wider">
                Datos asociados que se eliminarán permanentemente:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <Package className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <span className="font-black text-white">{catalogCount}</span>
                    <span className="text-slate-400 text-[10px] block">Productos</span>
                  </div>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-blue-400 shrink-0" />
                  <div>
                    <span className="font-black text-white">{ordersCount}</span>
                    <span className="text-slate-400 text-[10px] block">Pedidos</span>
                  </div>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-purple-400 shrink-0" />
                  <div>
                    <span className="font-black text-white">{leadsCount}</span>
                    <span className="text-slate-400 text-[10px] block">Clientes/Leads</span>
                  </div>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <Bot className="w-4 h-4 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-black text-white">{knowledgeCount + faqsCount}</span>
                    <span className="text-slate-400 text-[10px] block">Reglas IA & FAQs</span>
                  </div>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <QrCode className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <span className="font-black text-rose-400">Revocado</span>
                    <span className="text-slate-400 text-[10px] block">Acceso QR Dueño</span>
                  </div>
                </div>
                <div className="bg-slate-900/70 p-2.5 rounded-xl border border-slate-700/40 flex items-center space-x-2">
                  <Database className="w-4 h-4 text-rose-400 shrink-0" />
                  <div>
                    <span className="font-black text-white">Supabase</span>
                    <span className="text-slate-400 text-[10px] block">Limpieza Total</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Esta acción ejecutará una eliminación en cascada completa en Supabase y el servidor local. Se borrarán todos los productos, registros de pedidos, conversaciones de WhatsApp, configuración y archivos de almacenamiento asociados.
          </p>

          {/* Unsaved Changes Notice if applicable */}
          {hasUnsavedChanges && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 text-xs text-amber-300 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Aviso de cambios sin guardar:</span>
                <span>Esta empresa tiene modificaciones recientes que se eliminarán definitivamente sin posibilidad de recuperación.</span>
              </div>
            </div>
          )}

          {isOnlyProject && (
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-3 text-xs text-blue-300 flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                Al ser la única empresa activa, el sistema inicializará automáticamente un nuevo negocio limpio tras la eliminación.
              </span>
            </div>
          )}

          {/* Security confirmation: typing prompt */}
          <div className="space-y-2 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
            <label className="text-xs text-slate-300 block">
              Para confirmar la eliminación, escribe <span className="font-mono font-bold text-red-400">ELIMINAR</span> o el nombre exacto de la empresa:
            </label>
            <input
              type="text"
              id="confirm-delete-input"
              value={typedConfirmation}
              onChange={(e) => setTypedConfirmation(e.target.value)}
              placeholder={`Escribe ELIMINAR o "${project.name}"`}
              disabled={isDeleting}
              className="w-full bg-slate-900 border border-slate-700 focus:border-red-500 text-white rounded-xl px-3.5 py-2.5 text-xs outline-none transition"
              autoFocus
            />
          </div>

          {/* Accidental deletion prevention: confirmation checkbox */}
          <label className="flex items-start space-x-3 bg-red-950/30 border border-red-900/50 hover:border-red-500/50 p-3 rounded-2xl cursor-pointer transition text-xs text-slate-300">
            <input
              type="checkbox"
              id="confirm-delete-checkbox"
              checked={hasConfirmedCheckbox}
              onChange={(e) => setHasConfirmedCheckbox(e.target.checked)}
              disabled={isDeleting}
              className="mt-0.5 h-4 w-4 rounded border-slate-700 bg-slate-800 text-red-600 focus:ring-red-500 cursor-pointer"
            />
            <span className="select-none">
              Entiendo que esta acción es <strong>100% irreversible</strong> y que todos los datos de <span className="text-white font-bold">{project.name}</span> se destruirán en Supabase de forma permanente.
            </span>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row-reverse gap-3 relative z-10 pt-2 border-t border-slate-800">
          <button
            id="btn-confirm-delete-project"
            onClick={handleConfirm}
            disabled={!isConfirmEnabled}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 disabled:border-slate-700 text-white font-black py-3 px-4 rounded-xl text-xs shadow-lg shadow-red-600/30 flex items-center justify-center space-x-2 transition-all cursor-pointer disabled:cursor-not-allowed border border-red-400/30 disabled:shadow-none"
          >
            <Trash2 className="w-4 h-4" />
            <span>{isDeleting ? 'Eliminando empresa y datos...' : 'Eliminar Empresa Definitivamente'}</span>
          </button>

          <button
            id="btn-cancel-delete-project"
            onClick={onCancel}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-3 text-slate-300 hover:text-white font-bold text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition flex items-center justify-center"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
