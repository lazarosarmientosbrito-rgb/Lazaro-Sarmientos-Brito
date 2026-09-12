import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Table,
  PlayCircle,
  Activity
} from 'lucide-react';
import { 
  checkSupabaseStatus, 
  getSupabaseSetupScript, 
  SupabaseStatusDiagnosis, 
  runSupabasePersistenceSelfTest,
  SupabaseSelfTestResult,
  isSupabaseConfigured 
} from '../lib/supabase';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEmpresaId: number;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  activeEmpresaId,
}) => {
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<SupabaseStatusDiagnosis | null>(null);

  // Self-test states
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<{ allPassed: boolean; results: SupabaseSelfTestResult[] } | null>(null);

  const runCheck = async () => {
    setIsChecking(true);
    try {
      const res = await checkSupabaseStatus(activeEmpresaId);
      setStatus(res);
    } catch {
      // safe ignore
    } finally {
      setIsChecking(false);
    }
  };

  const handleRunSelfTest = async () => {
    setIsRunningTest(true);
    setTestResults(null);
    try {
      const res = await runSupabasePersistenceSelfTest();
      setTestResults(res);
      await runCheck();
    } catch (err: any) {
      setTestResults({
        allPassed: false,
        results: [
          {
            step: 'Error inesperado',
            success: false,
            message: err?.message || 'Error en prueba de persistencia.',
          },
        ],
      });
    } finally {
      setIsRunningTest(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sqlScript = getSupabaseSetupScript();

  const handleCopySql = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-100 ring-1 ring-white/10">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Conexión Supabase (PostgreSQL)
                <span className="text-xs px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono font-bold border border-teal-500/30">
                  Fuente Principal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Aislamiento estricto por empresa: <code className="text-teal-300 font-bold">productos.id_empresa = #{activeEmpresaId}</code>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">
          
          {/* Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Tabla Empresa */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-white text-xs">Tabla public.empresa</span>
                </div>
                {status?.empresaReady ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Lista
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Pendiente SQL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Columnas: <code className="text-slate-300 font-mono">identificación (int8, PK), creado_en</code>
              </p>
              {status?.empresaMessage && (
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {status.empresaMessage}
                </p>
              )}
            </div>

            {/* Tabla Productos */}
            <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-700/70">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                  <Table className="w-4 h-4 text-teal-400" />
                  <span className="font-bold text-white text-xs">Tabla public.productos</span>
                </div>
                {status?.productosReady ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Conectada
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Pendiente SQL
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {status?.detectedColumns ? (
                  <span>Mapeo activo: <code className="text-teal-300 font-mono text-[10px]">{status.detectedColumns.id_empresa}, {status.detectedColumns.nombre}, {status.detectedColumns.precio}</code></span>
                ) : (
                  <span>Relación: <code className="text-slate-300 font-mono">id_empresa (int8 FK)</code></span>
                )}
              </p>
              {status?.productosMessage && (
                <p className="text-[10px] text-slate-400 mt-1 truncate">
                  {status.productosMessage}
                </p>
              )}
            </div>
          </div>

          {/* Fallback Resilience Notice */}
          <div className="bg-blue-950/40 border border-blue-800/50 rounded-xl p-3.5 text-xs text-blue-200 flex items-start space-x-3">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-100">
                Adaptabilidad dinámica de esquema activa
              </p>
              <p className="text-[11px] text-blue-300/90 mt-0.5 leading-relaxed">
                La aplicación detecta automáticamente las columnas disponibles en Supabase y adapta los envíos sin generar errores de caché. Los datos se mantienen respaldados en Firebase y en memoria local en todo momento.
              </p>
            </div>
          </div>

          {/* Interactive Persistence Test Runner */}
          <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs uppercase tracking-wider">
                  Prueba Obligatoria de Persistencia y Aislamiento
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunSelfTest}
                disabled={isRunningTest}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-lg font-bold text-xs shadow transition active:scale-95 cursor-pointer disabled:cursor-not-allowed"
              >
                {isRunningTest ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Ejecutando prueba...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-100" />
                    <span>Ejecutar Prueba Completa</span>
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Ejecuta un flujo real de INSERT, SELECT, prueba de aislamiento entre empresas y limpieza para verificar que Supabase guarda y separa correctamente los datos.
            </p>

            {testResults && (
              <div className="mt-3 space-y-2">
                <div className={`p-2.5 rounded-lg border text-xs font-bold flex items-center justify-between ${testResults.allPassed ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300' : 'bg-rose-950/60 border-rose-500/50 text-rose-300'}`}>
                  <span>{testResults.allPassed ? '✅ Todas las pruebas de Supabase fueron superadas con éxito' : '❌ Fallo en las pruebas de persistencia'}</span>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {testResults.results.map((r, idx) => (
                    <div key={idx} className="flex items-start space-x-2 text-[11px] p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      {r.success ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <span className="font-bold text-slate-200">{r.step}: </span>
                        <span className="text-slate-300">{r.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SQL Setup Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <span>Script de creación y RLS para Supabase SQL Editor</span>
              </label>
              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold text-xs shadow transition active:scale-95"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-200" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <pre className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-56 leading-relaxed select-all">
                {sqlScript}
              </pre>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Abre el panel de tu proyecto en Supabase, ve a <strong>SQL Editor</strong>, pega este script y presiona <strong>Run</strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-800/80 border-t border-slate-700 flex items-center justify-between">
          <button
            type="button"
            onClick={runCheck}
            disabled={isChecking}
            className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition border border-slate-600 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Verificando...' : 'Verificar esquema ahora'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs rounded-xl transition"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
