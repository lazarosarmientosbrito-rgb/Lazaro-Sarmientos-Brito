import React, { useState } from 'react';
import { 
  Ticket, 
  Plus, 
  Trash2, 
  Edit2, 
  Tag, 
  CheckCircle2, 
  Clock, 
  Percent, 
  DollarSign,
  Copy,
  Check
} from 'lucide-react';
import { PromotionItem, BusinessProject } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface PromotionsTabProps {
  project: BusinessProject;
  onUpdatePromotions: (promotions: PromotionItem[]) => void;
}

export const PromotionsTab: React.FC<PromotionsTabProps> = ({
  project,
  onUpdatePromotions,
}) => {
  const promotions = project.promotions || [];
  const currency = project.config?.currency || 'BRL';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromotionItem | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Form State
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [type, setType] = useState<'percentual' | 'fixo'>('percentual');
  const [discountValue, setDiscountValue] = useState<number | string>(10);
  const [minOrderValue, setMinOrderValue] = useState<number | string>(0);
  const [active, setActive] = useState(true);

  const handleOpenAdd = () => {
    setEditingPromo(null);
    setCode('');
    setName('');
    setType('percentual');
    setDiscountValue(10);
    setMinOrderValue(0);
    setActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (promo: PromotionItem) => {
    setEditingPromo(promo);
    setCode(promo.code);
    setName(promo.name || promo.title || '');
    setType(promo.type || 'percentual');
    setDiscountValue(promo.discountValue ?? promo.discountPercentage ?? 0);
    setMinOrderValue(promo.minOrderValue || 0);
    setActive(promo.active);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    const formattedCode = code.toUpperCase().trim().replace(/\s+/g, '');
    const discVal = Number(discountValue);

    if (editingPromo) {
      const updated = promotions.map((p) =>
        p.id === editingPromo.id
          ? {
              ...p,
              code: formattedCode,
              title: name || formattedCode,
              name: name || formattedCode,
              type,
              discountPercentage: type === 'percentual' ? discVal : 0,
              discountValue: discVal,
              minOrderValue: Number(minOrderValue),
              active,
            }
          : p
      );
      onUpdatePromotions(updated);
    } else {
      const newPromo: PromotionItem = {
        id: 'promo-' + Date.now(),
        code: formattedCode,
        title: name || formattedCode,
        name: name || formattedCode,
        type,
        discountPercentage: type === 'percentual' ? discVal : 0,
        discountValue: discVal,
        minOrderValue: Number(minOrderValue),
        active,
      };
      onUpdatePromotions([...promotions, newPromo]);
    }
    setIsModalOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Seguro que deseas eliminar esta promoción?')) {
      onUpdatePromotions(promotions.filter((p) => p.id !== id));
    }
  };

  const handleToggleActive = (id: string) => {
    const updated = promotions.map((p) =>
      p.id === id ? { ...p, active: !p.active } : p
    );
    onUpdatePromotions(updated);
  };

  const handleCopyCode = (promoCode: string) => {
    navigator.clipboard.writeText(promoCode);
    setCopiedCode(promoCode);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Ticket className="w-4 h-4" />
            <span>Cupones de Descuento & Promociones</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Promociones de {project.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Crea cupones que la IA pueda ofrecer o validar automáticamente al momento de cerrar ventas.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition flex items-center space-x-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Nuevo Cupón</span>
        </button>
      </div>

      {/* Promotions List */}
      {promotions.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto text-2xl">
            🎟️
          </div>
          <h3 className="text-lg font-bold text-slate-800">Sin cupones activos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Agrega cupones promocionales (ej: BIENVENIDO10, PRIMERACOMPRA) para incentivar a tus clientes.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow"
          >
            + Crear Primer Cupón
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {promotions.map((promo) => (
            <div
              key={promo.id}
              className={`bg-white rounded-3xl p-5 border transition flex flex-col justify-between ${
                promo.active ? 'border-slate-200 shadow-sm hover:shadow-md' : 'border-slate-200/60 bg-slate-50/50 opacity-70'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-sm">
                      %
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {promo.code}
                        </span>
                        <button
                          onClick={() => handleCopyCode(promo.code)}
                          className="text-slate-400 hover:text-slate-600 transition"
                          title="Copiar código"
                        >
                          {copiedCode === promo.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[11px] text-slate-500 font-medium block mt-0.5">{promo.name}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleActive(promo.id)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black transition ${
                      promo.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {promo.active ? 'ACTIVO' : 'PAUSADO'}
                  </button>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Descuento:</span>
                    <span className="font-black text-indigo-600">
                      {promo.type === 'percentual' ? `${promo.discountValue}% OFF` : formatCurrency(promo.discountValue, currency)}
                    </span>
                  </div>
                  {promo.minOrderValue ? (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Compra mínima:</span>
                      <span className="font-bold text-slate-800">
                        {formatCurrency(promo.minOrderValue, currency)}
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  onClick={() => handleOpenEdit(promo)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center space-x-1"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => handleDelete(promo.id)}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Promo Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleSave}
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-slate-900 text-base">
                {editingPromo ? 'Editar Cupón' : 'Nuevo Cupón de Descuento'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Código del Cupón *</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej: VERANO15, PROMO20..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-mono font-bold text-slate-900 uppercase"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Descriptivo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Descuento de temporada"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Tipo de Descuento</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-800"
                  >
                    <option value="percentual">Porcentaje (%)</option>
                    <option value="fixo">Valor Fijo ({currency})</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Valor Descuento</label>
                  <input
                    type="number"
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Compra Mínima ({currency})</label>
                <input
                  type="number"
                  value={minOrderValue}
                  onChange={(e) => setMinOrderValue(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center space-x-2 cursor-pointer font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-0"
                  />
                  <span>Cupón activo para que la IA lo aplique</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow transition"
              >
                Guardar Cupón
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
