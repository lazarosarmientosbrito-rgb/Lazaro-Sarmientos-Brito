import React from 'react';
import { BusinessConfig, SalesTone } from '../../types';
import { Bot, Sparkles, CheckCircle2, Cpu, MessageSquare, Target } from 'lucide-react';

interface AiConfigTabProps {
  config: BusinessConfig;
  onChange: (updatedConfig: BusinessConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const AiConfigTab: React.FC<AiConfigTabProps> = ({
  config,
  onChange,
  onSave,
  isSaving,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Bot className="w-4 h-4" />
              <span>Cérebro & Comportamento do Assistente de IA</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Configuração da IA de Vendas & Agendamento</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Personalize o tom de voz, nome e instruções estratégicas que orientam as respostas automáticas em Português do Brasil.
            </p>
          </div>

          <button
            onClick={onSave}
            disabled={isSaving}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all shrink-0 disabled:opacity-50"
          >
            {isSaving ? <span>Salvando...</span> : <><CheckCircle2 className="w-4 h-4" /><span>Salvar Cérebro da IA</span></>}
          </button>
        </div>
      </div>

      {/* Identidade e Tom de Voz */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">Identidade e Tom da Conversa</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Nome do Assistente / Agente Virtual</label>
            <input
              type="text"
              value={config.botName}
              onChange={(e) => onChange({ ...config, botName: e.target.value })}
              placeholder="Ex. Camila - Assistente Comercial"
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Tom de Voz da IA</label>
            <select
              value={config.tone}
              onChange={(e) => onChange({ ...config, tone: e.target.value as SalesTone })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
            >
              <option value="friendly">😊 Cordial, Acolhedor e Amigável (Recomendado)</option>
              <option value="professional">💼 Estritamente Profissional e Formal</option>
              <option value="direct">⚡ Direto, Ágil e Objetivo</option>
              <option value="persuasive">🎯 Consultivo e Persuasivo</option>
              <option value="enthusiastic">🔥 Entusiasta e Dinâmico</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Mensagem de Boas-Vindas Padrão</label>
            <textarea
              rows={2}
              value={config.greetingMessage}
              onChange={(e) => onChange({ ...config, greetingMessage: e.target.value })}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
              placeholder="Olá! Como posso te ajudar hoje?"
            />
          </div>
        </div>
      </div>

      {/* Prompt / Instruções Especiais do Negócio */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Cpu className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-base">Instruções Customizadas / System Prompt</h3>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Objetivo Comercial Principal</label>
          <input
            type="text"
            value={config.salesObjective}
            onChange={(e) => onChange({ ...config, salesObjective: e.target.value })}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-semibold mb-4"
            placeholder="Ex. Vender produtos do catálogo e agendar serviços de beleza confirmando dia e horário."
          />

          <label className="block text-xs font-bold text-slate-400 mb-1 uppercase">Prompt / Regras Internas da IA</label>
          <textarea
            rows={5}
            value={config.customPrompt}
            onChange={(e) => onChange({ ...config, customPrompt: e.target.value })}
            className="w-full p-3 bg-slate-900 text-slate-100 border border-slate-800 rounded-xl text-xs font-mono leading-relaxed"
            placeholder="Digite regras específicas que a IA deve respeitar..."
          />
          <p className="text-[11px] text-slate-400 mt-2">
            A IA nunca inventará produtos, horários ou preços que não constem no catálogo e agenda oficial.
          </p>
        </div>
      </div>
    </div>
  );
};
