import React, { useState } from 'react';
import { WorkingHoursConfig, Professional, BlockedSlot, DayWorkingHours } from '../../types';
import { 
  Clock, 
  Calendar, 
  Plus, 
  Trash2, 
  Save, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  Coffee,
  Ban
} from 'lucide-react';

interface WorkingHoursTabProps {
  workingHours: WorkingHoursConfig;
  professionals: Professional[];
  onSaveWorkingHours: (config: WorkingHoursConfig) => void;
}

export const WorkingHoursTab: React.FC<WorkingHoursTabProps> = ({
  workingHours,
  professionals = [],
  onSaveWorkingHours,
}) => {
  const [config, setConfig] = useState<WorkingHoursConfig>(workingHours);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync internal state when workingHours prop changes (e.g. project switch or save reload)
  React.useEffect(() => {
    if (workingHours) {
      setConfig(workingHours);
    }
  }, [workingHours]);

  // New Blocked Slot Form
  const [isAddBlockOpen, setIsAddBlockOpen] = useState(false);
  const [reason, setReason] = useState('Horário de Almoço');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [specificDate, setSpecificDate] = useState('');
  const [selectedProfId, setSelectedProfId] = useState('');

  const handleToggleDay = (dayIndex: number) => {
    const updatedDays = [...config.workingDays];
    updatedDays[dayIndex].active = !updatedDays[dayIndex].active;
    setConfig({ ...config, workingDays: updatedDays });
  };

  const handleTimeChange = (dayIndex: number, field: 'startTime' | 'endTime', value: string) => {
    const updatedDays = [...config.workingDays];
    updatedDays[dayIndex][field] = value;
    setConfig({ ...config, workingDays: updatedDays });
  };

  const handleAddBlockedSlot = (e: React.FormEvent) => {
    e.preventDefault();
    const newBlock: BlockedSlot = {
      id: `blk-${Date.now()}`,
      reason,
      startTime,
      endTime,
      date: specificDate || undefined,
      professionalId: selectedProfId || undefined,
    };

    setConfig({
      ...config,
      blockedSlots: [...config.blockedSlots, newBlock],
    });

    setIsAddBlockOpen(false);
    setReason('Horário de Almoço');
    setStartTime('12:00');
    setEndTime('13:00');
    setSpecificDate('');
    setSelectedProfId('');
  };

  const handleRemoveBlockedSlot = (id: string) => {
    setConfig({
      ...config,
      blockedSlots: config.blockedSlots.filter((b) => b.id !== id),
    });
  };

  const handleSaveAll = () => {
    onSaveWorkingHours(config);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Clock className="w-4 h-4" />
              <span>Escala & Expediente da Empresa</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Horários de Atendimento e Bloqueios</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Configure os dias de funcionamento, hora de abertura e fechamento, intervalo padrão entre agendamentos e horários/dias bloqueados para a IA respeitar estritamente.
            </p>
          </div>

          <button
            onClick={handleSaveAll}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Alterações de Horário</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Horários de funcionamento e bloqueios atualizados com sucesso!</span>
        </div>
      )}

      {/* Interval & Config Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            Intervalo padrão entre consultas/agendamentos
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            A IA vai gerar slots de horários com base nessa janela de minutos.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {[15, 30, 45, 60].map((min) => (
            <button
              key={min}
              onClick={() => setConfig({ ...config, intervalMin: min })}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                config.intervalMin === min
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {min} min
            </button>
          ))}
        </div>
      </div>

      {/* Days of Week Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <span>Jornada Semanal de Atendimento</span>
        </h3>

        <div className="divide-y divide-slate-100">
          {config.workingDays.map((day, idx) => (
            <div
              key={day.dayOfWeek}
              className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                !day.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center space-x-3 w-48">
                <input
                  type="checkbox"
                  checked={day.active}
                  onChange={() => handleToggleDay(idx)}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="font-bold text-slate-900 text-sm">{day.dayLabel}</span>
              </div>

              {day.active ? (
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500 font-semibold">Abertura:</span>
                  <input
                    type="time"
                    value={day.startTime}
                    onChange={(e) => handleTimeChange(idx, 'startTime', e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-900 text-xs"
                  />
                  <span className="text-slate-400">até</span>
                  <span className="text-slate-500 font-semibold">Fechamento:</span>
                  <input
                    type="time"
                    value={day.endTime}
                    onChange={(e) => handleTimeChange(idx, 'endTime', e.target.value)}
                    className="p-1.5 bg-slate-50 border border-slate-200 rounded-md font-mono font-bold text-slate-900 text-xs"
                  />
                </div>
              ) : (
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1 rounded-md border border-rose-100">
                  Fechado / Sem expediente
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Blocked Slots & Dates */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-600" />
              <span>Horários e Dias Bloqueados</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Defina intervalos recorrentes (como horário de almoço) ou datas específicas em que a IA NUNCA deve permitir agendamentos.
            </p>
          </div>

          <button
            onClick={() => setIsAddBlockOpen(true)}
            className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-3.5 py-2 rounded-xl text-xs shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Bloqueio</span>
          </button>
        </div>

        {config.blockedSlots.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            Nenhum horário bloqueado configurado no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {config.blockedSlots.map((block) => {
              const prof = (professionals || []).find((p) => p.id === block.professionalId);

              return (
                <div
                  key={block.id}
                  className="bg-rose-50/50 border border-rose-200 rounded-xl p-3.5 flex items-start justify-between gap-2"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-xs">{block.reason}</span>
                      {block.date && (
                        <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded font-mono font-bold">
                          {block.date}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-rose-700 font-bold font-mono flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-rose-500" />
                      <span>{block.startTime} às {block.endTime}</span>
                    </div>

                    <p className="text-[10px] text-slate-500 font-medium">
                      Aplica-se a: <strong>{prof ? prof.name : 'Todos os Profissionais'}</strong>
                    </p>
                  </div>

                  <button
                    onClick={() => handleRemoveBlockedSlot(block.id)}
                    className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-100 rounded-lg transition-colors"
                    title="Remover Bloqueio"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Add Blocked Slot */}
      {isAddBlockOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Ban className="w-5 h-5 text-rose-600" />
                <span>Adicionar Bloqueio de Agenda</span>
              </h3>
              <button onClick={() => setIsAddBlockOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddBlockedSlot} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo do Bloqueio</label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Ex. Horário de Almoço / Manutenção"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Início</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hora Término</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Data Específica (Opcional)</label>
                <input
                  type="date"
                  value={specificDate}
                  onChange={(e) => setSpecificDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Deixe em branco se for um bloqueio recorrente diário (ex: Almoço).
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profissional Afetado</label>
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                >
                  <option value="">Todos os Profissionais da Empresa</option>
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      Apenas {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBlockOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-lg shadow-md"
                >
                  Confirmar Bloqueio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
