import React, { useState } from 'react';
import { ServiceItem, Professional } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { 
  Calendar, 
  Plus, 
  Search, 
  Clock, 
  User, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Scissors
} from 'lucide-react';

interface ServicesTabProps {
  services: ServiceItem[];
  professionals: Professional[];
  onAddService: (service: Omit<ServiceItem, 'id'>) => void;
  onUpdateService: (service: ServiceItem) => void;
  onDeleteService: (id: string) => void;
}

const ALL_DAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

export const ServicesTab: React.FC<ServicesTabProps> = ({
  services,
  professionals,
  onAddService,
  onUpdateService,
  onDeleteService,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(60);
  const [durationMin, setDurationMin] = useState<number>(30);
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);
  const [availableHours, setAvailableHours] = useState<string>('09:00, 10:00, 11:00, 14:00, 15:00, 16:00, 17:00, 18:00');
  const [status, setStatus] = useState<'ativo' | 'inativo'>('ativo');

  const categories = ['TODAS', ...Array.from(new Set(services.map((s) => s.category)))];

  const handleOpenAddModal = () => {
    setEditingService(null);
    setName('');
    setCategory('Barbearia & Estética');
    setDescription('');
    setPrice(60);
    setDurationMin(40);
    setSelectedProfIds(professionals.filter(p => p.status === 'ativo').map(p => p.id));
    setAvailableDays(['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']);
    setAvailableHours('09:00, 10:00, 11:00, 14:00, 15:00, 16:00, 17:00, 18:00');
    setStatus('ativo');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setName(service.name);
    setCategory(service.category);
    setDescription(service.description);
    setPrice(service.price);
    setDurationMin(service.durationMin);
    setSelectedProfIds(service.professionalIds || []);
    setAvailableDays(service.availableDays || []);
    setAvailableHours(service.availableHours ? service.availableHours.join(', ') : '09:00, 10:00, 11:00');
    setStatus(service.status || (service.active ? 'ativo' : 'inativo'));
    setIsModalOpen(true);
  };

  const handleToggleProf = (profId: string) => {
    if (selectedProfIds.includes(profId)) {
      setSelectedProfIds(selectedProfIds.filter((id) => id !== profId));
    } else {
      setSelectedProfIds([...selectedProfIds, profId]);
    }
  };

  const handleToggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter((d) => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedHours = availableHours
      .split(',')
      .map((h) => h.trim())
      .filter((h) => h.length > 0);

    const assignedProfs = professionals.filter((p) => selectedProfIds.includes(p.id));
    const profNames = assignedProfs.map((p) => p.name);
    const primaryProfName = profNames.join(' / ') || 'Qualquer Profissional Disponível';

    const isServiceActive = status === 'ativo';

    if (editingService) {
      onUpdateService({
        ...editingService,
        name,
        category,
        description,
        price: Number(price),
        durationMin: Number(durationMin),
        professionalIds: selectedProfIds,
        professionalNames: profNames,
        professional: primaryProfName,
        availableDays,
        availableHours: parsedHours,
        intervalsMin: 30,
        status,
        active: isServiceActive,
      });
    } else {
      onAddService({
        name,
        category,
        description,
        price: Number(price),
        durationMin: Number(durationMin),
        professionalIds: selectedProfIds,
        professionalNames: profNames,
        professional: primaryProfName,
        availableDays,
        availableHours: parsedHours,
        intervalsMin: 30,
        status,
        active: isServiceActive,
      });
    }

    setIsModalOpen(false);
  };

  const filteredServices = services.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.professional.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'TODAS' || s.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <Calendar className="w-4 h-4" />
              <span>Catálogo de Procedimentos & Serviços</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Serviços da Empresa</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Cadastre os serviços oferecidos com nome, preço em R$, duração em minutos, profissionais qualificados e horários disponíveis.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Novo Serviço</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar serviço ou profissional..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredServices.map((serv) => {
          const isAtivo = serv.status === 'ativo' || serv.active;

          return (
            <div
              key={serv.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                !isAtivo ? 'border-slate-200 bg-slate-50/60' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md uppercase border border-blue-100">
                    {serv.category}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      isAtivo
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {isAtivo ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                    <span>{isAtivo ? 'Ativo' : 'Inativo'}</span>
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{serv.name}</h3>
                <p className="text-slate-500 text-xs mt-1 line-clamp-2">{serv.description}</p>

                <div className="my-3 p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs">
                  <div className="flex items-center justify-between text-slate-700 font-semibold">
                    <span className="flex items-center gap-1 text-slate-500">
                      <Clock className="w-3.5 h-3.5" /> Duração:
                    </span>
                    <span className="font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-bold">
                      {serv.durationMin} min
                    </span>
                  </div>
                  <div className="flex items-start justify-between text-slate-700 font-semibold gap-2">
                    <span className="flex items-center gap-1 text-slate-500 shrink-0">
                      <User className="w-3.5 h-3.5" /> Profissional(is):
                    </span>
                    <span className="text-right text-xs font-bold text-slate-800 line-clamp-2">
                      {serv.professionalNames && serv.professionalNames.length > 0
                        ? serv.professionalNames.join(', ')
                        : serv.professional || 'Qualquer especialista'}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p><strong>Dias:</strong> {serv.availableDays?.join(', ')}</p>
                  <p className="truncate"><strong>Horários:</strong> {serv.availableHours?.join(' | ')}</p>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold">Valor em R$</span>
                  <span className="text-lg font-black text-emerald-600">{formatBRL(serv.price)}</span>
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(serv)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteService(serv.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Cadastrar/Editar Serviço */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                <Scissors className="w-5 h-5 text-blue-600" />
                <span>{editingService ? 'Editar Serviço' : 'Cadastrar Novo Serviço'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex. Corte Masculino + Barba"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Categoria</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="Ex. Barbearia"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Preço em R$</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono font-bold text-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duração (minutos)</label>
                  <input
                    type="number"
                    required
                    min="5"
                    step="5"
                    value={durationMin}
                    onChange={(e) => setDurationMin(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as 'ativo' | 'inativo')}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-bold text-slate-900"
                  >
                    <option value="ativo">Ativo (Diponível no Catálogo IA)</option>
                    <option value="inativo">Inativo (Indisponível)</option>
                  </select>
                </div>
              </div>

              {/* Professional Selection Checklist */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Profissional(is) Habilitados para este Serviço
                </label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 max-h-36 overflow-y-auto">
                  {professionals.length === 0 ? (
                    <p className="text-slate-400 text-[11px] col-span-2">Nenhum profissional cadastrado.</p>
                  ) : (
                    professionals.map((prof) => (
                      <label
                        key={prof.id}
                        className="flex items-center space-x-2 text-xs font-semibold text-slate-800 cursor-pointer p-1 hover:bg-slate-100 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProfIds.includes(prof.id)}
                          onChange={() => handleToggleProf(prof.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="truncate">{prof.name}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição do Serviço</label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhamento do procedimento..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Dias Disponíveis</label>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {ALL_DAYS.map((day) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => handleToggleDay(day)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                        availableDays.includes(day)
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Horários de Início Sugeridos (separados por vírgula)</label>
                <input
                  type="text"
                  required
                  value={availableHours}
                  onChange={(e) => setAvailableHours(e.target.value)}
                  placeholder="09:00, 10:00, 11:00, 14:00, 15:00, 16:00"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-mono text-slate-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-md"
                >
                  {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

