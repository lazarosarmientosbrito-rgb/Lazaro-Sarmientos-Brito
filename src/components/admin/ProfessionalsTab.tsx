import React, { useState } from 'react';
import { Professional } from '../../types';
import { 
  UserCheck, 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Phone, 
  User, 
  Award,
  Filter
} from 'lucide-react';

interface ProfessionalsTabProps {
  professionals: Professional[];
  onAddProfessional: (prof: Omit<Professional, 'id'>) => void;
  onUpdateProfessional: (prof: Professional) => void;
  onDeleteProfessional: (id: string) => void;
}

export const ProfessionalsTab: React.FC<ProfessionalsTabProps> = ({
  professionals,
  onAddProfessional,
  onUpdateProfessional,
  onDeleteProfessional,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'ativo' | 'inativo'>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProf, setEditingProf] = useState<Professional | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  const handleOpenAdd = () => {
    setEditingProf(null);
    setName('');
    setSpecialty('Especialista Visagista / Estética');
    setStatus('ativo');
    setPhone('+55 11 98888-7777');
    setAvatarUrl('https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (prof: Professional) => {
    setEditingProf(prof);
    setName(prof.name);
    setSpecialty(prof.specialty);
    setStatus(prof.status);
    setPhone(prof.phone || '');
    setAvatarUrl(prof.avatarUrl || '');
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingProf) {
      onUpdateProfessional({
        ...editingProf,
        name,
        specialty,
        status,
        phone,
        avatarUrl,
      });
    } else {
      onAddProfessional({
        name,
        specialty,
        status,
        phone,
        avatarUrl,
      });
    }
    setIsModalOpen(false);
  };

  const filteredProfessionals = professionals.filter((prof) => {
    const matchesSearch =
      prof.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prof.specialty.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'TODOS' || prof.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-1">
              <UserCheck className="w-4 h-4" />
              <span>Equipe & Corpo Técnico</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Profissionais e Especialistas</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Cadastre os profissionais da sua empresa (barbeiros, manicures, esteticistas, etc.), definindo suas especialidades e status de disponibilidade para agendamentos.
            </p>
          </div>

          <button
            onClick={handleOpenAdd}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Profissional</span>
          </button>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome ou especialidade..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'ativo', label: 'Ativos' },
            { id: 'inativo', label: 'Inativos' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                statusFilter === st.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Professionals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProfessionals.map((prof) => (
          <div
            key={prof.id}
            className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
              prof.status === 'inativo' ? 'border-slate-200 bg-slate-50/60 opacity-80' : 'border-slate-200'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center space-x-3">
                  <img
                    src={prof.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                    alt={prof.name}
                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                  <div>
                    <h3 className="font-bold text-slate-900 text-base leading-snug">{prof.name}</h3>
                    <span className="text-xs text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                      <Award className="w-3.5 h-3.5" />
                      {prof.specialty}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shrink-0 ${
                    prof.status === 'ativo'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {prof.status === 'ativo' ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                  <span>{prof.status === 'ativo' ? 'Ativo' : 'Inativo'}</span>
                </span>
              </div>

              {prof.phone && (
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-2 bg-slate-50 p-2 rounded-lg">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{prof.phone}</span>
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                {prof.status === 'ativo' ? '🟢 Disponível para IA' : '🔴 Fora da escala IA'}
              </span>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleOpenEdit(prof)}
                  className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Editar Profissional"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDeleteProfessional(prof.id)}
                  className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Excluir Profissional"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Add / Edit Professional */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-blue-600" />
                <span>{editingProf ? 'Editar Profissional' : 'Cadastrar Profissional'}</span>
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Profissional</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Marcos Silva"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Especialidade / Cargo</label>
                <input
                  type="text"
                  required
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex. Barbeiro Visagista & Corte Clássico"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ativo' | 'inativo')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                  >
                    <option value="ativo">Ativo (Agendável)</option>
                    <option value="inativo">Inativo (Bloqueado)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Telefone WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+55 11 98888-7777"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Foto / Avatar URL</label>
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://..."
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
                  {editingProf ? 'Salvar Alterações' : 'Cadastrar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
