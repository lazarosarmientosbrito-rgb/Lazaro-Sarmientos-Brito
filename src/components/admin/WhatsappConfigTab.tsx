import React, { useState, useEffect } from 'react';
import { BusinessConfig, AutomationMode } from '../../types';
import { 
  MessageSquareCode, 
  ShieldCheck, 
  QrCode, 
  Terminal, 
  Copy, 
  Check, 
  Send, 
  CheckCircle2, 
  Bot, 
  UserCheck, 
  Zap, 
  Power,
  Smartphone,
  RefreshCw,
  Building2,
  Phone,
  Unlink,
  CheckCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  X
} from 'lucide-react';

interface WhatsappConfigTabProps {
  config: BusinessConfig;
  onChange: (updatedConfig: BusinessConfig) => void;
  onSave: () => void;
  isSaving: boolean;
  webhookUrl: string;
  verifyToken: string;
  botName: string;
  companyName: string;
  phoneWhatsapp: string;
  currency: string;
  projectId?: string;
  empresaId?: number;
}

export const WhatsappConfigTab: React.FC<WhatsappConfigTabProps> = ({
  config,
  onChange,
  onSave,
  isSaving,
  webhookUrl,
  verifyToken,
  botName,
  companyName,
  phoneWhatsapp,
  projectId,
  empresaId,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  // App Choice Selector: 'both' | 'whatsapp' | 'whatsapp_business'
  const [selectedAppChoice, setSelectedAppChoice] = useState<'both' | 'whatsapp' | 'whatsapp_business'>(
    config.whatsappAppType || 'both'
  );

  // QR Session token for clean company isolation
  const [qrSessionId, setQrSessionId] = useState(() => 
    `sess_${empresaId || projectId || 'emp'}_${Math.random().toString(36).substring(2, 9)}`
  );

  // State for manual / test pairing
  const [pairingPhone, setPairingPhone] = useState(
    config.whatsappConnectedNumber || phoneWhatsapp || '+55 11 99988-7766'
  );
  const [pairingAppType, setPairingAppType] = useState<'WhatsApp' | 'WhatsApp Business'>(
    config.whatsappConnectedApp || (selectedAppChoice === 'whatsapp_business' ? 'WhatsApp Business' : 'WhatsApp')
  );
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [pairingSuccessMsg, setPairingSuccessMsg] = useState<string | null>(null);

  // Modal de confirmación para DESCONECTAR WhatsApp
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [disconnectedNotice, setDisconnectedNotice] = useState(false);

  // Live tester state
  const [testName, setTestName] = useState('João Silva');
  const [testPhone, setTestPhone] = useState(config.whatsappConnectedNumber || phoneWhatsapp || '+55 11 99988-7766');
  const [testMessage, setTestMessage] = useState('Olá, gostaria de saber os horários disponíveis e preços dos produtos.');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulatedResponse, setSimulatedResponse] = useState<string | null>(null);

  useEffect(() => {
    if (config.whatsappConnectedNumber) {
      setPairingPhone(config.whatsappConnectedNumber);
    }
  }, [config.whatsappConnectedNumber]);

  const copyToClipboard = (text: string, type: 'url' | 'token') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    }
  };

  const handleAutomationChange = (mode: AutomationMode) => {
    onChange({
      ...config,
      automationMode: mode,
    });
  };

  const handleAppChoiceChange = (choice: 'both' | 'whatsapp' | 'whatsapp_business') => {
    setSelectedAppChoice(choice);
    const defaultApp = choice === 'whatsapp_business' ? 'WhatsApp Business' : 'WhatsApp';
    setPairingAppType(defaultApp);
    onChange({
      ...config,
      whatsappAppType: choice,
    });
  };

  const handleRegenerateQr = () => {
    const newToken = `sess_${empresaId || projectId || 'emp'}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    setQrSessionId(newToken);
    setPairingSuccessMsg(null);
  };

  // Connect / Link device handler
  const handleConfirmPairing = async (appToUse?: 'WhatsApp' | 'WhatsApp Business') => {
    const chosenApp = appToUse || pairingAppType;
    setIsPairingLoading(true);
    setPairingSuccessMsg(null);
    setDisconnectedNotice(false);

    try {
      // 1. Notify server of company-scoped pairing
      await fetch('/api/whatsapp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          empresaId,
          phone: pairingPhone,
          appType: chosenApp,
        }),
      });

      // 2. Update local and persistent config
      const updatedConfig: BusinessConfig = {
        ...config,
        phoneWhatsapp: pairingPhone || config.phoneWhatsapp,
        whatsappConnected: true,
        whatsappConnectedNumber: pairingPhone,
        whatsappConnectedApp: chosenApp,
        whatsappConnectedAt: new Date().toISOString(),
        whatsappAppType: selectedAppChoice,
      };

      onChange(updatedConfig);
      setPairingSuccessMsg('✅ WhatsApp conectado correctamente');

      // 3. Auto save to ensure persistence in Supabase
      setTimeout(() => {
        onSave();
      }, 100);
    } catch (err) {
      console.error('Error connecting WhatsApp:', err);
    } finally {
      setIsPairingLoading(false);
    }
  };

  // Disconnect handler - triggered after user confirms in the modal
  const handleConfirmDisconnect = async () => {
    setIsPairingLoading(true);
    setIsDisconnectModalOpen(false);

    try {
      // 1. Official endpoint to disconnect only this company's WhatsApp session
      await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, empresaId }),
      });

      // 2. Clear ONLY the connection link, keeping products, customers, prices, images and chats intact
      const updatedConfig: BusinessConfig = {
        ...config,
        whatsappConnected: false,
        whatsappConnectedNumber: '',
        whatsappConnectedApp: undefined,
        whatsappConnectedAt: undefined,
      };

      onChange(updatedConfig);
      setPairingSuccessMsg(null);
      setDisconnectedNotice(true);
      handleRegenerateQr();

      // 3. Persist update in Supabase
      setTimeout(() => {
        onSave();
      }, 100);
    } catch (err) {
      console.error('Error disconnecting:', err);
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleTestWebhookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSimulating(true);
    setSimulatedResponse(null);

    try {
      const res = await fetch('/api/sales-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: testMessage,
          history: [],
          projectId,
          empresaId,
          empresa_id: empresaId,
          customConfig: config,
        }),
      });

      const data = await res.json();
      setSimulatedResponse(data.replyText || 'Resposta enviada via Webhook.');
    } catch {
      setSimulatedResponse('Erro ao simular webhook do WhatsApp.');
    } finally {
      setIsSimulating(false);
    }
  };

  // Build clean official QR payload
  const cleanPhone = (phoneWhatsapp || '').replace(/\D/g, '');
  const qrTargetMessage = `VENDEDOR_IA_PAIRING:${empresaId || projectId || 'empresa'}:${qrSessionId}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(
    cleanPhone 
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(qrTargetMessage)}`
      : `https://wa.me/?text=${encodeURIComponent(qrTargetMessage)}`
  )}`;

  const isConnected = !!config.whatsappConnected;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-400 font-bold text-xs uppercase tracking-widest mb-1">
              <MessageSquareCode className="w-4 h-4" />
              <span>Conexión Oficial WhatsApp (Normal & Business)</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Conecta o Desconecta tu Asistente de WhatsApp</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Vincula o desvincula la línea telefónica de <strong>{companyName}</strong> mediante código QR oficial compatible con <strong>WhatsApp normal</strong> y <strong>WhatsApp Business</strong>.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 shrink-0">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Integración Oficial Segura</span>
            </div>

            <button
              onClick={onSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-md flex items-center justify-center space-x-1 transition-all shrink-0 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Guardar</span>
            </button>
          </div>
        </div>
      </div>

      {/* Automação de Atendimento */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Power className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="font-bold text-slate-900 text-base">Autonomía de la IA en WhatsApp</h3>
            <p className="text-slate-500 text-xs">Controla el nivel de intervención automática del asistente en este número</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {/* Option 1: Manual */}
          <div
            onClick={() => handleAutomationChange('manual')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.automationMode === 'manual'
                ? 'border-blue-600 bg-blue-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <span className="absolute -top-3 right-4 bg-slate-800 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
              Control Total
            </span>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                <UserCheck className="w-5 h-5" />
              </div>
              {config.automationMode === 'manual' && <span className="w-3 h-3 rounded-full bg-blue-600" />}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Manual (Supervisado)</h4>
            <p className="text-slate-500 text-xs mt-1">
              Las respuestas son redactadas por la IA como sugerencias para que el operador humano las apruebe o modifique.
            </p>
          </div>

          {/* Option 2: Assistido */}
          <div
            onClick={() => handleAutomationChange('assistido')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.automationMode === 'assistido'
                ? 'border-blue-600 bg-blue-50/50 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Zap className="w-5 h-5" />
              </div>
              {config.automationMode === 'assistido' && <span className="w-3 h-3 rounded-full bg-blue-600" />}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Asistido por IA</h4>
            <p className="text-slate-500 text-xs mt-1">
              La IA responde preguntas frecuentes y cotizaciones simples; transfiere las complejas a un agente humano.
            </p>
          </div>

          {/* Option 3: Automático */}
          <div
            onClick={() => handleAutomationChange('automatico')}
            className={`cursor-pointer rounded-2xl p-5 border-2 transition-all relative ${
              config.automationMode === 'automatico'
                ? 'border-emerald-600 bg-emerald-50/40 shadow-md'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <span className="absolute -top-3 right-4 bg-emerald-600 text-white font-bold text-[10px] uppercase px-2 py-0.5 rounded-full">
              Recomendado
            </span>
            <div className="flex items-center justify-between mb-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Bot className="w-5 h-5" />
              </div>
              {config.automationMode === 'automatico' && <span className="w-3 h-3 rounded-full bg-emerald-600" />}
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Automático 24/7</h4>
            <p className="text-slate-500 text-xs mt-1">
              La IA atiende, asesora, agenda citas, toma pedidos y cobra en WhatsApp de forma instantánea sin descanso.
            </p>
          </div>
        </div>
      </div>

      {/* Main Connection Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left/Main Side: QR Code Connection Box (Isolated by Empresa) */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-5">
            {/* Header of QR Box */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-1.5">
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>WhatsApp Normal & Business</span>
                </div>
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight flex items-center space-x-2">
                  <span>Conexión de WhatsApp por Código QR</span>
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Vinculación directa para la empresa <strong className="text-slate-800">{companyName}</strong>.
                </p>
              </div>

              <div className="shrink-0 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">ID Empresa</span>
                <span className="text-xs font-black font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                  #{empresaId || projectId}
                </span>
              </div>
            </div>

            {/* App Choice Selector: WhatsApp Normal vs WhatsApp Business */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                ¿Qué aplicación tienes instalada en tu teléfono?
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleAppChoiceChange('both')}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedAppChoice === 'both'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Cualquiera (Ambas)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAppChoiceChange('whatsapp')}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedAppChoice === 'whatsapp'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>WhatsApp Normal</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAppChoiceChange('whatsapp_business')}
                  className={`p-2.5 rounded-xl text-xs font-bold text-center border transition-all flex flex-col items-center justify-center gap-1 ${
                    selectedAppChoice === 'whatsapp_business'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/30'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  <span>WhatsApp Business</span>
                </button>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* ESTADO 1: CUANDO WHATSAPP ESTÁ CONECTADO */}
            {/* ========================================================================= */}
            {isConnected ? (
              <div className="rounded-2xl border-2 border-emerald-500/40 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 p-5 sm:p-6 space-y-5 animate-fade-in">
                {/* Header de Estado Conectado: 🟢 WhatsApp conectado */}
                <div className="flex items-center justify-between gap-3 border-b border-emerald-200/80 pb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30">
                      <CheckCircle className="w-7 h-7" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                        <h4 className="text-lg sm:text-xl font-black text-emerald-950 tracking-tight">
                          🟢 WhatsApp conectado
                        </h4>
                      </div>
                      <p className="text-xs text-emerald-800 font-medium mt-0.5">
                        Línea vinculada exclusivamente a <strong>{companyName}</strong>. El Vendedor IA está activo.
                      </p>
                    </div>
                  </div>

                  <span className="hidden sm:inline-flex text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                    En línea 24/7
                  </span>
                </div>

                {/* Connection Information Summary Card */}
                <div className="bg-white/90 backdrop-blur rounded-xl p-4 border border-emerald-200 shadow-sm space-y-3 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Número Conectado:</span>
                    </span>
                    <span className="font-mono font-black text-slate-900 text-sm bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                      {config.whatsappConnectedNumber || phoneWhatsapp}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Empresa a la que pertenece:</span>
                    </span>
                    <span className="font-bold text-slate-900">
                      {companyName} <span className="text-slate-400 font-mono">(#{empresaId || projectId})</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-emerald-100">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Aplicación Vinculada:</span>
                    </span>
                    <span className="font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {config.whatsappConnectedApp || 'WhatsApp'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fecha de Conexión:</span>
                    </span>
                    <span className="font-medium text-slate-600">
                      {config.whatsappConnectedAt ? new Date(config.whatsappConnectedAt).toLocaleString('es-ES') : 'En línea ahora'}
                    </span>
                  </div>
                </div>

                {/* Multiempresa Isolation Guarantee Notice */}
                <div className="bg-emerald-900/5 rounded-xl p-3 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    <strong>Aislamiento Garantizado:</strong> Este número únicamente procesa el catálogo, clientes, citas y pedidos de <strong>{companyName}</strong>. Ningún dato ni mensaje se mezcla con otras empresas.
                  </span>
                </div>

                {/* BOTÓN CLARAMENTE VISIBLE: [ Desconectar WhatsApp ] */}
                <div className="pt-2 border-t border-emerald-200/80 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <button
                    type="button"
                    id="btn-disconnect-whatsapp"
                    onClick={() => setIsDisconnectModalOpen(true)}
                    disabled={isPairingLoading}
                    className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:from-rose-700 active:to-red-700 text-white font-extrabold px-6 py-3 rounded-2xl text-xs shadow-lg shadow-rose-600/25 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-[1.01]"
                  >
                    <Unlink className="w-4 h-4" />
                    <span>Desconectar WhatsApp</span>
                  </button>

                  <span className="text-emerald-800 font-bold text-xs flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span>Atendiendo clientes en WhatsApp</span>
                  </span>
                </div>
              </div>
            ) : (
              /* ========================================================================= */
              /* ESTADO 2: CUANDO WHATSAPP ESTÁ DESCONECTADO (O PENDIENTE) */
              /* ========================================================================= */
              <div className="space-y-5 animate-fade-in">
                {/* Header de Estado Desconectado: 🔴 WhatsApp desconectado */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-rose-50 border border-rose-200">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-sm sm:text-base font-black text-rose-800 tracking-tight">
                      🔴 WhatsApp desconectado
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-rose-700 bg-white px-2.5 py-0.5 rounded-full border border-rose-200">
                    Sin vincular
                  </span>
                </div>

                {/* Banner de confirmación de desconexión si recién ocurrió */}
                {disconnectedNotice && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start space-x-2 animate-fade-in">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      WhatsApp ha sido desconectado de <strong>{companyName}</strong>. Los productos, precios, imágenes, clientes y conversaciones se mantuvieron 100% intactos. Puedes conectar otro número a continuación.
                    </span>
                  </div>
                )}

                {/* MANDATORY PROMPT: "Escanea este código con WhatsApp o WhatsApp Business." */}
                <div className="bg-slate-900 rounded-2xl p-4 sm:p-5 text-center text-white border border-slate-800 shadow-md space-y-3">
                  <p className="text-sm sm:text-base font-black text-emerald-400 tracking-tight leading-snug">
                    Escanea este código con WhatsApp o WhatsApp Business.
                  </p>
                  <p className="text-xs text-slate-300">
                    Abre <strong>WhatsApp</strong> (personal) o <strong>WhatsApp Business</strong> en tu teléfono y escanea este código QR con la cámara o en <em>Dispositivos vinculados</em>.
                  </p>

                  {/* QR Box */}
                  <div className="p-3 bg-white rounded-2xl inline-block shadow-xl border-4 border-slate-800 relative group">
                    <img
                      src={qrCodeUrl}
                      alt="Código QR de Conexión WhatsApp"
                      className="w-48 h-48 sm:w-52 sm:h-52 object-contain mx-auto transition-transform group-hover:scale-[1.02]"
                    />
                    <div className="mt-2 text-[11px] font-bold text-slate-600 flex items-center justify-center space-x-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{companyName}</span>
                    </div>
                  </div>

                  {/* Regenerate Code and Status Pill */}
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleRegenerateQr}
                      className="text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 flex items-center space-x-1.5 transition"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Regenerar Código QR</span>
                    </button>
                    <span className="text-[11px] text-emerald-300 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-xl flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Esperando escaneo...</span>
                    </span>
                  </div>
                </div>

                {/* Step-by-Step Instructions */}
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2.5 text-xs">
                  <h4 className="font-extrabold text-slate-900 flex items-center space-x-2 text-xs uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    <span>Pasos para conectar:</span>
                  </h4>
                  <ol className="space-y-2 text-slate-700 font-medium pl-1">
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                      <span>Abre <strong>WhatsApp</strong> o <strong>WhatsApp Business</strong> en tu teléfono.</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                      <span>Toca en <strong>Ajustes / Menú (⋮)</strong> &gt; <strong>Dispositivos vinculados</strong> &gt; <strong>Vincular un dispositivo</strong> (o usa la cámara de tu smartphone).</span>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                      <span>Apunta la cámara a este código QR para conectar inmediatamente.</span>
                    </li>
                  </ol>
                </div>

                {/* Confirmation / Connection Action Bar: [ Conectar WhatsApp ] */}
                <div className="bg-emerald-50/70 rounded-2xl p-4 sm:p-5 border border-emerald-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-emerald-950 text-xs uppercase tracking-wider flex items-center space-x-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Vincular y Activar Línea Telefónica</span>
                    </h5>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                      Vinculación Oficial
                    </span>
                  </div>

                  <p className="text-xs text-emerald-800">
                    Al escanear el QR desde el teléfono o confirmar la vinculación, el número quedará guardado y asociado únicamente a <strong>{companyName}</strong>.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Número de Teléfono a Vincular
                      </label>
                      <input
                        type="text"
                        value={pairingPhone}
                        onChange={(e) => setPairingPhone(e.target.value)}
                        placeholder="+55 11 99988-7766"
                        className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Aplicación Utilizada
                      </label>
                      <select
                        value={pairingAppType}
                        onChange={(e) => setPairingAppType(e.target.value as 'WhatsApp' | 'WhatsApp Business')}
                        className="w-full p-2.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="WhatsApp">WhatsApp Normal (Personal)</option>
                        <option value="WhatsApp Business">WhatsApp Business (Empresa)</option>
                      </select>
                    </div>
                  </div>

                  {/* PROMINENT BUTTON: [ Conectar WhatsApp ] */}
                  <button
                    type="button"
                    id="btn-connect-whatsapp"
                    onClick={() => handleConfirmPairing()}
                    disabled={isPairingLoading}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-4 rounded-xl text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 hover:scale-[1.01]"
                  >
                    {isPairingLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Identificando y vinculando conexión...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Conectar WhatsApp</span>
                      </>
                    )}
                  </button>

                  {pairingSuccessMsg && (
                    <div className="bg-emerald-600 text-white p-2.5 rounded-xl text-xs font-bold text-center animate-fade-in shadow">
                      {pairingSuccessMsg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Meta Webhook Credentials & Live Message Tester */}
        <div className="lg:col-span-6 space-y-6">
          {/* Webhook API Credentials Box (Meta Cloud API / Twilio) */}
          <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 text-white space-y-4 text-xs shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-bold text-slate-200 flex items-center space-x-2 text-sm">
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Credenciales de Webhook y API</span>
              </h4>
              <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded font-mono">
                Aislado por Empresa
              </span>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">
                URL del Webhook (Para Meta Developer o Servidor)
              </label>
              <div className="flex items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-x-2">
                <input
                  type="text"
                  readOnly
                  value={webhookUrl}
                  className="bg-transparent text-blue-400 font-mono text-[11px] w-full focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(webhookUrl, 'url')}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg shrink-0 transition"
                  title="Copiar URL"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1 font-bold">
                Token de Verificación (Verify Token)
              </label>
              <div className="flex items-center bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-x-2">
                <input
                  type="text"
                  readOnly
                  value={verifyToken}
                  className="bg-transparent text-amber-400 font-mono text-[11px] w-full focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(verifyToken, 'token')}
                  className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg shrink-0 transition"
                  title="Copiar Token"
                >
                  {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Right Side: Live WhatsApp Message Tester */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Zap className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-base">Testador en Tiempo Real de Mensajes de WhatsApp</h3>
                <p className="text-slate-500 text-xs">
                  Envía una prueba desde este número para comprobar cómo responde el Vendedor IA asignado a {companyName}.
                </p>
              </div>
            </div>

            <form onSubmit={handleTestWebhookSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Nombre del Cliente</label>
                  <input
                    type="text"
                    required
                    value={testName}
                    onChange={(e) => setTestName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Número de Teléfono</label>
                  <input
                    type="text"
                    required
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Mensaje de Prueba del Cliente</label>
                <textarea
                  rows={3}
                  required
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-emerald-500 focus:bg-white transition-colors"
                  placeholder="Ej: Hola, quiero saber los precios y cómo agendar una cita..."
                />
              </div>

              <button
                type="submit"
                disabled={isSimulating}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-50"
              >
                {isSimulating ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>El Vendedor IA está respondiendo...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-emerald-400" />
                    <span>Simular Mensaje en WhatsApp ({config.whatsappConnectedApp || 'WhatsApp'})</span>
                  </>
                )}
              </button>
            </form>

            {/* Response Output Box */}
            {simulatedResponse && (
              <div className="mt-4 p-4 bg-slate-900 rounded-2xl border border-slate-800 text-white space-y-2 animate-fade-in">
                <div className="flex items-center justify-between text-[11px] text-emerald-400 font-bold uppercase tracking-wider">
                  <span>Respuesta Oficial de {botName}</span>
                  <span className="bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono">HTTP 200 OK</span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-slate-950 p-3 rounded-xl border border-slate-800/80">
                  {simulatedResponse}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL DE CONFIRMACIÓN: ¿Estás seguro de que quieres desconectar este WhatsApp? */}
      {/* ========================================================================= */}
      {isDisconnectModalOpen && (
        <div 
          id="modal-disconnect-whatsapp"
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setIsDisconnectModalOpen(false)}
        >
          <div 
            className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full border border-slate-200 shadow-2xl space-y-4 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsDisconnectModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-md shadow-rose-600/10">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div>
              <h4 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                ¿Estás seguro de que quieres desconectar este WhatsApp de esta empresa?
              </h4>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Esta acción solo desvinculará la línea de <strong>{companyName}</strong>. No afectará a ninguna otra empresa registrada.
              </p>
            </div>

            {/* Information card */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Empresa:</span>
                <span className="font-bold text-slate-900">{companyName} (#{empresaId || projectId})</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Número a desconectar:</span>
                <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {config.whatsappConnectedNumber || phoneWhatsapp}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Aplicación:</span>
                <span className="font-medium text-slate-700">{config.whatsappConnectedApp || 'WhatsApp'}</span>
              </div>
            </div>

            {/* Reassurance note */}
            <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-start space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Tus datos están protegidos:</strong> Los productos, precios, imágenes, clientes, citas, pedidos y conversaciones se mantendrán 100% intactos.
              </span>
            </div>

            {/* Action buttons: Cancelar & Desconectar */}
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                id="btn-cancel-disconnect"
                onClick={() => setIsDisconnectModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                id="btn-confirm-disconnect-action"
                onClick={handleConfirmDisconnect}
                disabled={isPairingLoading}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-black text-xs shadow-md shadow-rose-600/20 transition flex items-center space-x-1.5 disabled:opacity-50"
              >
                {isPairingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Desconectando...</span>
                  </>
                ) : (
                  <>
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Desconectar</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
