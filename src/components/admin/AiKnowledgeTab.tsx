import React, { useState } from 'react';
import {
  BrainCircuit,
  Plus,
  Search,
  BookOpen,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Tag,
  ShieldCheck,
  Truck,
  CreditCard,
  Flame,
} from 'lucide-react';
import { AiKnowledgeItem, BusinessProject } from '../../types';

interface AiKnowledgeTabProps {
  project?: BusinessProject;
  knowledgeItems?: AiKnowledgeItem[];
  onUpdateKnowledge?: (knowledge: AiKnowledgeItem[]) => void;
  onAddItem?: (item: AiKnowledgeItem) => void;
  onUpdateItem?: (item: AiKnowledgeItem) => void;
  onDeleteItem?: (id: string) => void;
}

const CATEGORY_MAP = {
  entrega: { label: '🚚 Entrega & Envíos', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  politica: { label: '🛡️ Políticas & Garantías', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  pagamento: { label: '💳 Formas de Pago', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  promocao: { label: '🔥 Promociones & Descuentos', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  regras_venda: { label: '💼 Reglas de Venta & Pedidos', color: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  atendimento: { label: '⏰ Horarios & Atención', color: 'bg-cyan-50 text-cyan-800 border-cyan-200' },
  geral: { label: '📌 Conocimiento General', color: 'bg-slate-100 text-slate-800 border-slate-200' },
};

export const AiKnowledgeTab: React.FC<AiKnowledgeTabProps> = ({
  project,
  knowledgeItems: propKnowledgeItems,
  onUpdateKnowledge,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AiKnowledgeItem | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<AiKnowledgeItem['category']>('geral');
  const [content, setContent] = useState('');

  const knowledgeList = propKnowledgeItems || project?.aiKnowledge || [];
  const projectName = project?.name || 'Negocio';

  const handleOpenNewModal = () => {
    setEditingItem(null);
    setTitle('');
    setCategory('geral');
    setContent('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: AiKnowledgeItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setCategory(item.category);
    setContent(item.content);
    setIsModalOpen(true);
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('¿Deseas eliminar esta regla de conocimiento de la IA?')) {
      if (onDeleteItem) {
        onDeleteItem(id);
      } else if (onUpdateKnowledge) {
        const updated = knowledgeList.filter((k) => k.id !== id);
        onUpdateKnowledge(updated);
      }
    }
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (editingItem) {
      const updatedItem: AiKnowledgeItem = {
        ...editingItem,
        title: title.trim(),
        category,
        content: content.trim(),
        updatedAt: new Date().toISOString(),
      };

      if (onUpdateItem) {
        onUpdateItem(updatedItem);
      } else if (onUpdateKnowledge) {
        const updated = knowledgeList.map((k) => (k.id === editingItem.id ? updatedItem : k));
        onUpdateKnowledge(updated);
      }
    } else {
      const newItem: AiKnowledgeItem = {
        id: `kn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        title: title.trim(),
        category,
        content: content.trim(),
        createdAt: new Date().toISOString(),
      };

      if (onAddItem) {
        onAddItem(newItem);
      } else if (onUpdateKnowledge) {
        onUpdateKnowledge([newItem, ...knowledgeList]);
      }
    }

    setIsModalOpen(false);
  };

  const filteredKnowledge = knowledgeList.filter((item) => {
    const matchesSearch =
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-950 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-400/30">
            <BrainCircuit className="w-3.5 h-3.5" />
            <span>Base de Conocimiento • {projectName}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            🧠 Conocimiento de la IA ({knowledgeList.length} reglas)
          </h2>
          <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
            Entrena al asistente virtual con las políticas exactas, condiciones de entrega, formas de
            pago y reglas exclusivas de <strong>{projectName}</strong>. La IA usará únicamente esta
            información para responder a los clientes.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-lg shadow-blue-600/30 transition flex items-center space-x-2 shrink-0 border border-blue-400/30"
        >
          <Plus className="w-4 h-4" />
          <span>+ Agregar Conocimiento</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por política, entrega, pago, regla de atención..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs text-slate-800 font-medium"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedCategory === 'ALL'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todas ({knowledgeList.length})
          </button>
          {Object.entries(CATEGORY_MAP).map(([catKey, catVal]) => (
            <button
              key={catKey}
              onClick={() => setSelectedCategory(catKey)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === catKey
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {catVal.label.split(' ')[1] || catKey}
            </button>
          ))}
        </div>
      </div>

      {/* Knowledge Cards Grid */}
      {filteredKnowledge.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            💡
          </div>
          <h3 className="text-base font-bold text-slate-800">Sin reglas de conocimiento registradas</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm
              ? 'No hay reglas que coincidan con la búsqueda actual.'
              : 'Agrega instrucciones sobre cómo tu negocio hace entregas, métodos de pago, reservas o condiciones especiales.'}
          </p>
          <button
            onClick={handleOpenNewModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition"
          >
            + Agregar primera regla
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredKnowledge.map((item) => {
            const catInfo = CATEGORY_MAP[item.category] || CATEGORY_MAP.geral;

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <span className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border ${catInfo.color}`}>
                      {catInfo.label}
                    </span>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                        title="Editar regla"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                        title="Eliminar regla"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-black text-slate-900 text-sm mb-2">{item.title}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-xl border border-slate-100">
                    {item.content}
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                  <span>ID: {item.id}</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BrainCircuit className="w-5 h-5 text-blue-400" />
                <h3 className="font-black text-base text-white">
                  {editingItem ? 'Editar Regla de Conocimiento' : 'Nueva Regla de Conocimiento'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="p-6 space-y-4 text-xs text-slate-700">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Título / Tema de la regla *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Política de Envíos Rápidos, Reglas de Señal 50%..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 outline-none font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AiKnowledgeItem['category'])}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 outline-none font-semibold text-slate-800"
                >
                  <option value="entrega">🚚 Entrega & Envíos</option>
                  <option value="politica">🛡️ Políticas & Garantías</option>
                  <option value="pagamento">💳 Formas de Pago</option>
                  <option value="promocao">🔥 Promociones & Descuentos</option>
                  <option value="regras_venda">💼 Reglas de Venta & Pedidos</option>
                  <option value="atendimento">⏰ Horarios & Atención</option>
                  <option value="geral">📌 Conocimiento General</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Contenido / Instrucción detallada para la IA *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Explica detalladamente cómo funciona la regla para que la IA la comunique al cliente de forma precisa..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 outline-none leading-relaxed"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md transition"
                >
                  {editingItem ? 'Guardar Cambios' : 'Crear Regla'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
