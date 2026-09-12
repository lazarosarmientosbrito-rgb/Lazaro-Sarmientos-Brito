import React, { useState } from 'react';
import { Appointment, ServiceItem, Professional, AppointmentStatus } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { 
  CalendarCheck, 
  Clock, 
  User, 
  Phone, 
  Plus, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Filter, 
  Scissors,
  Check,
  Calendar as CalendarIcon,
  Grid,
  List,
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface AppointmentsTabProps {
  appointments: Appointment[];
  services: ServiceItem[];
  professionals: Professional[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => void;
  onUpdateStatus: (id: string, status: AppointmentStatus) => void;
}

const ALL_STATUSES: { id: AppointmentStatus | 'TODOS'; label: string; color: string }[] = [
  { id: 'TODOS', label: 'Todos os Status', color: 'bg-slate-800 text-white' },
  { id: 'confirmado', label: 'Confirmado', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  { id: 'reservado', label: 'Reservado / Pendente', color: 'bg-amber-100 text-amber-800 border-amber-200' },
  { id: 'concluido', label: 'Concluído', color: 'bg-blue-100 text-blue-800 border-blue-200' },
  { id: 'cancelado', label: 'Cancelado', color: 'bg-rose-100 text-rose-800 border-rose-200' },
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({
  appointments = [],
  services = [],
  professionals = [],
  onAddAppointment,
  onUpdateStatus,
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedProfFilter, setSelectedProfFilter] = useState<string>('TODOS');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [selectedServiceId, setSelectedServiceId] = useState((services && services[0]?.id) || '');
  const [selectedProfId, setSelectedProfId] = useState((professionals && professionals[0]?.id) || '');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:00');
  const [notes, setNotes] = useState('');
  const [conflictError, setConflictError] = useState('');

  // Normalize appointment status for filtering and display
  const getNormalizedStatus = (st: string): AppointmentStatus => {
    const lower = st.toLowerCase();
    if (lower === 'confirmado') return 'confirmado';
    if (lower === 'pendente' || lower === 'reservado') return 'reservado';
    if (lower === 'concluido') return 'concluido';
    if (lower === 'cancelado') return 'cancelado';
    return 'disponivel';
  };

  const filteredAppointments = (appointments || []).filter((appt) => {
    const normStatus = getNormalizedStatus(appt.status || '');
    const matchesSearch =
      (appt.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appt.customerPhone || '').includes(searchTerm) ||
      (appt.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (appt.professional || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = selectedStatus === 'TODOS' || normStatus === selectedStatus;
    const matchesProf = selectedProfFilter === 'TODOS' || appt.professionalId === selectedProfFilter || (appt.professional || '').includes(selectedProfFilter);

    return matchesSearch && matchesStatus && matchesProf;
  });

  // Check conflicts for manual booking
  const validateConflict = (profName: string, bookingDate: string, bookingTime: string) => {
    const existing = (appointments || []).find((a) => {
      const normSt = getNormalizedStatus(a.status || '');
      return (
        normSt !== 'cancelado' &&
        a.date === bookingDate &&
        a.time === bookingTime &&
        ((a.professional || '').toLowerCase().includes(profName.toLowerCase()) || profName.toLowerCase().includes((a.professional || '').toLowerCase()))
      );
    });

    if (existing) {
      return `Atenção: O profissional ${profName} já possui um agendamento marcado para as ${bookingTime} no dia ${bookingDate} (${existing.customerName}).`;
    }
    return '';
  };

  const handleSubmitNew = (e: React.FormEvent) => {
    e.preventDefault();
    const service = (services || []).find((s) => s.id === selectedServiceId) || services[0];
    const prof = (professionals || []).find((p) => p.id === selectedProfId) || professionals[0];
    if (!service) return;

    const profName = prof ? prof.name : service.professional;

    const conflict = validateConflict(profName, date, time);
    if (conflict) {
      setConflictError(conflict);
      return;
    }

    onAddAppointment({
      serviceId: service.id,
      serviceName: service.name,
      customerName,
      customerPhone,
      date,
      time,
      durationMin: service.durationMin,
      professionalId: prof?.id,
      professional: profName,
      price: service.price,
      status: 'confirmado',
      notes,
    });

    setIsModalOpen(false);
    setCustomerName('');
    setCustomerPhone('');
    setNotes('');
    setConflictError('');
  };

  const activeProfessionals = professionals.filter((p) => p.status === 'ativo');

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
              <CalendarCheck className="w-4 h-4" />
              <span>Agenda de Citas & Calendário Integrado</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Agenda de Atendimento da Empresa</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Visualize os agendamentos realizados pela inteligência artificial ou manualmente em modo calendário/grade ou em lista detalhada.
            </p>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* View Mode Switcher */}
            <div className="bg-slate-800 p-1 rounded-xl flex items-center space-x-1 border border-slate-700">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Grade Agenda</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                  viewMode === 'list' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Visão Lista</span>
              </button>
            </div>

            <button
              onClick={() => {
                setConflictError('');
                setIsModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Agendamento</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Confirmados</span>
            <span className="text-xl font-black text-slate-900">
              {appointments.filter((a) => getNormalizedStatus(a.status) === 'confirmado').length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Reservados / Pend.</span>
            <span className="text-xl font-black text-slate-900">
              {appointments.filter((a) => getNormalizedStatus(a.status) === 'reservado').length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold shrink-0">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Concluídos</span>
            <span className="text-xl font-black text-slate-900">
              {appointments.filter((a) => getNormalizedStatus(a.status) === 'concluido').length}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center font-bold shrink-0">
            <XCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Cancelados</span>
            <span className="text-xl font-black text-slate-900">
              {appointments.filter((a) => getNormalizedStatus(a.status) === 'cancelado').length}
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por cliente, telefone ou serviço..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Date Picker Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700">
            <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
            <span className="font-bold">Data:</span>
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-900 outline-none"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
            {ALL_STATUSES.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st.id
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* VIEW 1: AGENDA CALENDAR GRID (Profissionais x Horários) */}
      {viewMode === 'grid' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Grid className="w-4 h-4 text-blue-400" />
              <span>Grade de Agendamentos por Profissional — Dia {selectedDateFilter}</span>
            </h3>
            <span className="text-xs text-slate-400">Clique em uma célula vaga para agendar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider">
                  <th className="p-3 w-20 border-r border-slate-200 text-center">Horário</th>
                  {activeProfessionals.map((prof) => (
                    <th key={prof.id} className="p-3 border-r border-slate-200 text-center min-w-[160px]">
                      <div className="flex items-center justify-center space-x-2">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>{prof.name}</span>
                      </div>
                      <span className="block text-[10px] font-normal text-slate-500 normal-case mt-0.5">
                        {prof.specialty}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {TIME_SLOTS.map((slotTime) => (
                  <tr key={slotTime} className="hover:bg-slate-50/50">
                    <td className="p-3 font-mono font-bold text-slate-600 border-r border-slate-200 text-center bg-slate-50/80">
                      {slotTime}
                    </td>

                    {activeProfessionals.map((prof) => {
                      // Find appointment for this date, time and professional
                      const appt = (filteredAppointments || []).find(
                        (a) =>
                          a.date === selectedDateFilter &&
                          a.time === slotTime &&
                          (a.professionalId === prof.id || (a.professional || '').toLowerCase().includes((prof.name || '').toLowerCase()))
                      );

                      if (appt) {
                        const normSt = getNormalizedStatus(appt.status);

                        return (
                          <td key={prof.id} className="p-2 border-r border-slate-200 align-top">
                            <div
                              className={`p-2.5 rounded-xl border space-y-1 transition-all shadow-xs ${
                                normSt === 'confirmado'
                                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                                  : normSt === 'reservado'
                                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                                  : normSt === 'concluido'
                                  ? 'bg-blue-50 border-blue-200 text-blue-900'
                                  : 'bg-rose-50 border-rose-200 text-rose-900'
                              }`}
                            >
                              <div className="flex items-center justify-between font-bold text-xs">
                                <span>{appt.customerName}</span>
                                <span className="text-[10px] uppercase px-1.5 py-0.5 rounded font-black bg-white/80">
                                  {normSt}
                                </span>
                              </div>

                              <p className="text-[11px] font-semibold flex items-center gap-1">
                                <Scissors className="w-3 h-3 shrink-0" />
                                <span className="truncate">{appt.serviceName}</span>
                              </p>

                              <div className="flex items-center justify-between text-[10px] font-mono font-bold pt-1 border-t border-black/10">
                                <span>{formatBRL(appt.price)}</span>
                                <span className="text-slate-500">{appt.customerPhone}</span>
                              </div>

                              {/* Status Action Quick Switch */}
                              <div className="flex items-center space-x-1 pt-1">
                                {normSt !== 'confirmado' && (
                                  <button
                                    onClick={() => onUpdateStatus(appt.id, 'confirmado')}
                                    className="px-1.5 py-0.5 bg-emerald-600 text-white rounded text-[9px] font-bold"
                                    title="Marcar Confirmado"
                                  >
                                    Confirmar
                                  </button>
                                )}
                                {normSt !== 'concluido' && (
                                  <button
                                    onClick={() => onUpdateStatus(appt.id, 'concluido')}
                                    className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[9px] font-bold"
                                    title="Marcar Concluído"
                                  >
                                    Concluir
                                  </button>
                                )}
                                {normSt !== 'cancelado' && (
                                  <button
                                    onClick={() => onUpdateStatus(appt.id, 'cancelado')}
                                    className="px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded text-[9px] font-bold hover:bg-rose-300"
                                    title="Cancelar Cita"
                                  >
                                    Cancelar
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={prof.id} className="p-2 border-r border-slate-200 text-center align-middle">
                          <button
                            onClick={() => {
                              setSelectedProfId(prof.id);
                              setDate(selectedDateFilter);
                              setTime(slotTime);
                              setConflictError('');
                              setIsModalOpen(true);
                            }}
                            className="w-full py-2 border border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-all flex items-center justify-center space-x-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Livre</span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW 2: LIST VIEW */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
              Nenhum agendamento encontrado com os filtros selecionados.
            </div>
          ) : (
            filteredAppointments.map((appt) => {
              const normSt = getNormalizedStatus(appt.status);

              return (
                <div
                  key={appt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-slate-900 text-base">{appt.customerName}</span>
                      <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {appt.customerPhone}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-600 pt-0.5">
                      <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 flex items-center gap-1">
                        <Scissors className="w-3 h-3" />
                        {appt.serviceName}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3 h-3 text-slate-400" />
                        {appt.professional}
                      </span>
                    </div>

                    {appt.notes && (
                      <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg mt-1 italic">
                        "{appt.notes}"
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-600" />
                        <span>{appt.date}</span>
                        <Clock className="w-3.5 h-3.5 text-blue-600 ml-2" />
                        <span>{appt.time}</span>
                      </div>
                      <span className="text-sm font-black text-emerald-600 block mt-0.5">
                        {formatBRL(appt.price)}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {normSt === 'confirmado' && (
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Confirmado</span>
                        </span>
                      )}
                      {normSt === 'reservado' && (
                        <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Reservado</span>
                        </span>
                      )}
                      {normSt === 'concluido' && (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-blue-200">
                          <Check className="w-3.5 h-3.5 text-blue-600" />
                          <span>Concluído</span>
                        </span>
                      )}
                      {normSt === 'cancelado' && (
                        <span className="bg-rose-100 text-rose-800 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 border border-rose-200">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Cancelado</span>
                        </span>
                      )}

                      {/* Status Selector Dropdown */}
                      <select
                        value={normSt}
                        onChange={(e) => onUpdateStatus(appt.id, e.target.value as AppointmentStatus)}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="confirmado">Confirmar</option>
                        <option value="reservado">Reservar</option>
                        <option value="concluido">Concluir</option>
                        <option value="cancelado">Cancelar</option>
                      </select>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Novo Agendamento Manual */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                <span>Novo Agendamento Manual</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            {conflictError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{conflictError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitNew} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Selecionar Serviço</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {formatBRL(s.price)} ({s.durationMin} min)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Profissional Responsável</label>
                <select
                  value={selectedProfId}
                  onChange={(e) => setSelectedProfId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                >
                  {professionals.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.specialty})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ex. Gabriel Oliveira"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Telefone WhatsApp</label>
                <input
                  type="text"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+55 11 97766-5544"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => {
                      setDate(e.target.value);
                      setConflictError('');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Horário</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      setConflictError('');
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Observações do Agendamento</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex. Cliente solicitou atendimento preferencial..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md"
                >
                  Confirmar Agendamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
