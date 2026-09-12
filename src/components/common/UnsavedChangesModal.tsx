import React from 'react';
import { AlertTriangle, Save, LogOut, X, ShieldAlert } from 'lucide-react';

interface UnsavedChangesModalProps {
  isOpen: boolean;
  projectName: string;
  isSaving: boolean;
  onSaveAndExit: () => void;
  onExitWithoutSaving: () => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  projectName,
  isSaving,
  onSaveAndExit,
  onExitWithoutSaving,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl text-white relative overflow-hidden animate-scale-up">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400 shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <button
            onClick={onCancel}
            disabled={isSaving}
            className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative z-10 space-y-2 mb-6">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20 inline-block">
            Advertencia de Proyecto
          </span>
          <h3 className="text-xl font-black text-white">
            Tienes cambios sin guardar
          </h3>
          <p className="text-slate-300 text-sm leading-relaxed">
            Has realizado modificaciones en <strong>{projectName}</strong> (productos, precios, horarios, servicios o configuración de IA) que aún no se han guardado.
          </p>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-3 text-xs text-slate-300 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
            <span>¿Quieres guardarlos antes de salir del proyecto?</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row-reverse gap-2.5 relative z-10">
          <button
            onClick={onSaveAndExit}
            disabled={isSaving}
            className="w-full sm:w-auto flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Guardando...' : 'Guardar y salir'}</span>
          </button>

          <button
            onClick={onExitWithoutSaving}
            disabled={isSaving}
            className="w-full sm:w-auto flex-1 bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-300 border border-slate-700 hover:border-red-500/40 font-bold py-3 px-3 rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-all disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Salir sin guardar</span>
          </button>

          <button
            onClick={onCancel}
            disabled={isSaving}
            className="w-full sm:w-auto px-4 py-3 text-slate-400 hover:text-white font-bold text-xs hover:bg-slate-800 rounded-xl transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
