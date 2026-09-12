import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Cloud, 
  ShieldCheck, 
  Database, 
  X, 
  Loader2, 
  RefreshCw,
  UserCheck,
  Building2,
  Lock,
  Shield,
  KeyRound,
  QrCode
} from 'lucide-react';
import { isSupabaseConfigured, fetchEmpresasFromSupabase } from '../../lib/supabase';
import { AppUser, BusinessProject } from '../../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: AppUser | null;
  onSelectUser?: (user: AppUser) => void;
  onRefreshData?: () => Promise<void>;
  activeEmpresaId?: number;
  availableProjects?: BusinessProject[];
  onOpenOwnerQR?: (project?: BusinessProject) => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSelectUser,
  onRefreshData,
  activeEmpresaId = 1,
  availableProjects = [],
  onOpenOwnerQR,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [companyCount, setCompanyCount] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<'superadmin' | 'owner'>(
    currentUser?.role || 'superadmin'
  );
  const [selectedOwnerEmpresaId, setSelectedOwnerEmpresaId] = useState<number>(
    currentUser?.empresaId || activeEmpresaId || 1
  );

  if (!isOpen) return null;

  const handleTestSupabase = async () => {
    setIsLoading(true);
    setStatusMsg('');
    try {
      const empresas = await fetchEmpresasFromSupabase(currentUser);
      setCompanyCount(empresas.length);
      setStatusMsg(`¡Conexión exitosa con Supabase! ${empresas.length} empresa(s) disponible(s).`);
      if (onRefreshData) {
        await onRefreshData();
      }
    } catch (err: any) {
      setStatusMsg(`Error al consultar Supabase: ${err?.message || 'Error de conexión'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyUserRole = () => {
    if (!onSelectUser) return;

    if (selectedRole === 'superadmin') {
      onSelectUser({
        id: 'admin-super',
        email: 'admin@vendedoria.com',
        name: 'Administrador Principal Vendedor IA',
        role: 'superadmin',
      });
      setStatusMsg('Sesión cambiada a Administrador Principal (acceso a todas las empresas).');
    } else {
      const targetProj = availableProjects.find(
        (p) => p.empresaId === selectedOwnerEmpresaId || p.id === String(selectedOwnerEmpresaId)
      );
      const companyName = targetProj?.name || `Empresa #${selectedOwnerEmpresaId}`;
      onSelectUser({
        id: `owner-emp-${selectedOwnerEmpresaId}`,
        email: `dueno${selectedOwnerEmpresaId}@empresa.com`,
        name: `Dueño de ${companyName}`,
        role: 'owner',
        empresaId: selectedOwnerEmpresaId,
        companyName: companyName,
      });
      setStatusMsg(`Sesión cambiada a Dueño de "${companyName}". Acceso 100% aislado.`);
    }
  };

  const isOwnerActive = currentUser?.role === 'owner';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl p-6 max-w-lg w-full shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-black text-white">Autenticación y Acceso Aislado</h3>
            <p className="text-xs text-slate-400">Control de Acceso por Empresa y Supabase</p>
          </div>
        </div>

        {statusMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            {statusMsg}
          </div>
        )}

        {/* Role Selector Card */}
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-4 mb-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-blue-400" />
              Seleccionar Rol de Acceso
            </span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
              isOwnerActive 
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}>
              {isOwnerActive ? `Dueño (Empresa #${currentUser?.empresaId})` : 'Administrador Global'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {/* Superadmin Card */}
            <button
              type="button"
              onClick={() => setSelectedRole('superadmin')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedRole === 'superadmin'
                  ? 'bg-indigo-950/60 border-indigo-400 ring-2 ring-indigo-500/30 text-white'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-base">👑</span>
                <span className="font-extrabold text-xs">Administrador Vendedor IA</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Acceso a todas las empresas (A, B, C). Creación, edición y administración global.
              </p>
            </button>

            {/* Owner Card */}
            <button
              type="button"
              onClick={() => setSelectedRole('owner')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                selectedRole === 'owner'
                  ? 'bg-amber-950/60 border-amber-400 ring-2 ring-amber-500/30 text-white'
                  : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center space-x-2 mb-1.5">
                <span className="text-base">👔</span>
                <span className="font-extrabold text-xs">Dueño de Negocio</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-tight">
                Acceso 100% aislado exclusivamente a su empresa. No puede ver ni tocar otras empresas.
              </p>
            </button>
          </div>

          {/* If Owner selected, pick which company they own */}
          {selectedRole === 'owner' && (
            <div className="pt-2 border-t border-slate-700/80 space-y-2 animate-fade-in">
              <label className="block text-xs font-bold text-amber-300">
                Selecciona la Empresa Asignada a este Dueño:
              </label>
              <select
                value={selectedOwnerEmpresaId}
                onChange={(e) => setSelectedOwnerEmpresaId(Number(e.target.value))}
                className="w-full bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-amber-200 font-bold outline-none focus:ring-2 focus:ring-amber-400"
              >
                {availableProjects.map((p, idx) => {
                  const empId = p.empresaId || (idx + 1);
                  return (
                    <option key={p.id} value={empId}>
                      Empresa #{empId} — {p.name} ({p.category || 'Comercio'})
                    </option>
                  );
                })}
              </select>
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-[11px] flex items-start gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Aislamiento estricto:</strong> Este dueño solamente verá y modificará los productos, precios, configuración, preguntas y WhatsApp de la <strong>Empresa #{selectedOwnerEmpresaId}</strong>.
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleApplyUserRole}
            className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs transition shadow-md flex items-center justify-center space-x-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Aplicar Modo de Acceso</span>
          </button>

          {onOpenOwnerQR && (
            <button
              type="button"
              onClick={() => {
                const targetProj = availableProjects.find(
                  (p) => p.empresaId === selectedOwnerEmpresaId || p.id === String(selectedOwnerEmpresaId)
                );
                onOpenOwnerQR(targetProj);
                onClose();
              }}
              className="w-full py-2 px-4 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white border border-indigo-500/40 text-xs font-bold transition flex items-center justify-center space-x-2"
            >
              <QrCode className="w-4 h-4 text-indigo-400" />
              <span>Ver Código QR de Acceso para Dueño #{selectedOwnerEmpresaId}</span>
            </button>
          )}
        </div>

        {/* Database & Sync Status */}
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 mb-5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium">Fuente de Datos:</span>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Supabase PostgreSQL (En Vivo)
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Empresa Activa en Sesión:</span>
            <span className="font-mono text-[11px] text-emerald-300 font-bold">
              Empresa #{activeEmpresaId}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Sincronización Bidireccional:</span>
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Panel Dueño ⇄ Supabase ⇄ Panel Admin
            </span>
          </div>

          {companyCount !== null && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Empresas Consultadas:</span>
              <span className="font-bold text-white">{companyCount}</span>
            </div>
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleTestSupabase}
          disabled={isLoading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs transition flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-4 h-4" />
              <span>Verificar y Forzar Sincronización Supabase</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

