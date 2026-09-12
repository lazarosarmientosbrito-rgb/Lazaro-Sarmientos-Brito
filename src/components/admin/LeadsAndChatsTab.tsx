import React, { useState } from 'react';
import { CapturedLead } from '../../types';
import { 
  Users, 
  Search, 
  MessageSquare, 
  Phone, 
  Mail, 
  Calendar, 
  ShoppingBag, 
  CheckCircle2, 
  Clock, 
  Filter, 
  User, 
  Sparkles,
  Scissors,
  UserCheck,
  AlertCircle
} from 'lucide-react';

interface LeadsAndChatsTabProps {
  leads: CapturedLead[];
  onUpdateStatus: (id: string, status: CapturedLead['status']) => void;
}

export const LeadsAndChatsTab: React.FC<LeadsAndChatsTabProps> = ({
  leads,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'TODOS' | 'VENDA' | 'AGENDAMENTO' | 'AMBOS' | 'ATENCAO_HUMANA'>('TODOS');
  const [selectedLead, setSelectedLead] = useState<CapturedLead | null>(leads[0] || null);

  const filteredLeads = leads.filter((l) => {
    const matchesSearch =
      (l.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.phone || '').includes(searchTerm) ||
      (l.interestedProduct || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (l.interestedService || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isHumanAttention = (l.needSummary || '').includes('HUMANA') || (l.needSummary || '').includes('SOLICITUD');

    const matchesType =
      filterType === 'TODOS' ||
      (filterType === 'ATENCAO_HUMANA' && isHumanAttention) ||
      (filterType !== 'ATENCAO_HUMANA' && (
        l.type === filterType ||
        (filterType === 'VENDA' && l.interestedProduct) ||
        (filterType === 'AGENDAMENTO' && l.interestedService)
      ));

    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Users className="w-4 h-4" />
              <span>CRM Comercial & Oportunidades</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Leads, Vendas e Agendamentos Capturados</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Gerencie contatos de clientes capturados pelo assistente virtual com relatórios detalhados de intenção.
            </p>
          </div>
        </div>
      </div>

      {/* Main CRM Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Leads List & Filters */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por cliente, telefone ou interesse..."
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar pt-1">
              {[
                { key: 'TODOS', label: 'Todos' },
                { key: 'VENDA', label: 'Vendas' },
                { key: 'AGENDAMENTO', label: 'Agendamentos' },
                { key: 'ATENCAO_HUMANA', label: '⚠️ Atenção Humana' },
                { key: 'AMBOS', label: 'Ambos' },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setFilterType(t.key as any)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    filterType === t.key
                      ? t.key === 'ATENCAO_HUMANA'
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredLeads.map((lead) => {
              const isSelected = selectedLead?.id === lead.id;
              const isHumanAttention = (lead.needSummary || '').includes('HUMANA') || (lead.needSummary || '').includes('SOLICITUD');
              return (
                <div
                  key={lead.id}
                  onClick={() => setSelectedLead(lead)}
                  className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                    isSelected
                      ? isHumanAttention
                        ? 'border-rose-500 bg-rose-50/50 shadow-md'
                        : 'border-blue-600 bg-blue-50/50 shadow-md'
                      : isHumanAttention
                      ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {lead.customerName || 'Cliente sem Nome'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400 font-mono">
                      {new Date(lead.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-1 mb-2 font-mono">{lead.phone || 'Sem telefone'}</p>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {isHumanAttention && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <UserCheck className="w-3 h-3 text-rose-600" /> Atenção Humana
                      </span>
                    )}
                    {lead.interestedProduct && (
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <ShoppingBag className="w-3 h-3" /> Venda
                      </span>
                    )}
                    {lead.interestedService && (
                      <span className="bg-indigo-100 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Scissors className="w-3 h-3" /> Agendamento
                      </span>
                    )}
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                      {lead.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Lead Conversation & Details */}
        <div className="lg:col-span-2">
          {selectedLead ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900 text-lg">{selectedLead.customerName}</h3>
                    {((selectedLead.needSummary || '').includes('HUMANA') || (selectedLead.needSummary || '').includes('SOLICITUD')) && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 border border-rose-200">
                        <UserCheck className="w-3 h-3 text-rose-600" /> Requiere Atención Humana
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-xs text-slate-500 mt-0.5 font-mono">
                    <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-slate-400" /> {selectedLead.phone}</span>
                    {selectedLead.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-400" /> {selectedLead.email}</span>}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedLead.phone && (
                    <a
                      href={`https://wa.me/${selectedLead.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
                      title="Abrir chat no WhatsApp com este cliente"
                    >
                      <MessageSquare className="w-3.5 h-3.5" /> Abrir no WhatsApp
                    </a>
                  )}
                  <label className="text-xs font-bold text-slate-400">Status:</label>
                  <select
                    value={selectedLead.status}
                    onChange={(e) => onUpdateStatus(selectedLead.id, e.target.value as any)}
                    className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 cursor-pointer"
                  >
                    <option value="NUEVO">NOVO</option>
                    <option value="CONTACTADO">CONTATADO</option>
                    <option value="AGENDADO">AGENDADO</option>
                    <option value="VENTA_CERRADA">VENDA CONCLUÍDA</option>
                    <option value="PERDIDO">PERDIDO</option>
                  </select>
                </div>
              </div>

              {/* Attention Alert Banner if Human Handoff requested */}
              {((selectedLead.needSummary || '').includes('HUMANA') || (selectedLead.needSummary || '').includes('SOLICITUD')) && (
                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start gap-3 text-rose-900 text-xs">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-extrabold text-rose-950 block">
                      Transferência para Atendente Humano Solicitada
                    </span>
                    <p className="text-rose-800 text-[11px] leading-relaxed">
                      O cliente solicitou falar com uma pessoa real ou a IA detectou que a dúvida necessita de um atendente especializado. Clique em <strong>"Abrir no WhatsApp"</strong> para continuar a conversa pessoalmente.
                    </p>
                  </div>
                </div>
              )}

              {/* Summary */}
              {selectedLead.needSummary && (
                <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-xl text-xs space-y-1">
                  <span className="font-bold text-blue-900 uppercase block text-[10px]">Resumo do Atendimento</span>
                  <p className="text-slate-700">{selectedLead.needSummary}</p>
                </div>
              )}

              {/* Chat Messages */}
              <div className="space-y-3 pt-2">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-blue-600" />
                  <span>Histórico da Conversa com o Assistente IA</span>
                </h4>

                <div className="bg-slate-900 rounded-2xl p-4 space-y-3 max-h-[380px] overflow-y-auto">
                  {(selectedLead.messages || []).map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                          msg.sender === 'user'
                            ? 'bg-slate-800 text-slate-100 border border-slate-700'
                            : 'bg-blue-600 text-white font-medium shadow-md'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span className="text-[9px] opacity-60 block text-right mt-1 font-mono">{msg.timestamp}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-xs">
              Selecione um lead da lista para visualizar os detalhes.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
