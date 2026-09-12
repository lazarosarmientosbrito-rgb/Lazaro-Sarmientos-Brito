import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  Check, 
  Trash2, 
  Plus, 
  Minus, 
  CheckSquare, 
  Square, 
  ArrowRight, 
  ExternalLink, 
  Share2, 
  Copy, 
  Phone, 
  MapPin, 
  CreditCard, 
  Scale,
  Sparkles,
  Store,
  Truck
} from 'lucide-react';
import { CatalogItem, BusinessProject, CustomerOrder } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CartItem {
  product: CatalogItem;
  quantity: number;
  selected: boolean; // Shopee-style individual item selector
}

interface OnlineCatalogTabProps {
  project: BusinessProject;
  onPlaceOrder?: (order: Omit<CustomerOrder, 'id' | 'createdAt'>) => void;
  onOpenWhatsAppSimulator?: () => void;
}

export const OnlineCatalogTab: React.FC<OnlineCatalogTabProps> = ({
  project,
  onPlaceOrder,
  onOpenWhatsAppSimulator,
}) => {
  const catalog = project.catalog || [];
  const currency = project.config?.currency || 'BRL';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  // Direct Selection State (Quantity directly per product, starts at 0, no intermediate cart)
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [buyWarning, setBuyWarning] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Customer Checkout Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerAddress, setCustomerAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Pix / Efectivo');
  const [customerNotes, setCustomerNotes] = useState('');
  const [orderCompletedData, setOrderCompletedData] = useState<any | null>(null);

  const categories = ['TODOS', ...Array.from(new Set(catalog.map((i) => i.category || 'General')))];

  const filteredItems = catalog.filter((item) => {
    if (item.status === 'oculto') return false;
    const matchesCategory = selectedCategory === 'TODOS' || item.category === selectedCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getQty = (itemId: string) => itemQuantities[itemId] || 0;

  // Silent update - changes quantity directly in UI without sending messages or creating cart steps
  const updateQty = (itemId: string, delta: number, maxStock = 99) => {
    setItemQuantities((prev) => {
      const current = prev[itemId] || 0;
      const next = Math.max(0, Math.min(maxStock, current + delta));
      return { ...prev, [itemId]: next };
    });
  };

  // Real-time calculation of ONLY products with quantity > 0
  const selectedProducts = catalog
    .filter((item) => (itemQuantities[item.id] || 0) > 0)
    .map((item) => ({
      product: item,
      quantity: itemQuantities[item.id],
      subtotal: item.price * itemQuantities[item.id],
    }));

  const selectedUnitsCount = selectedProducts.reduce((sum, i) => sum + i.quantity, 0);
  const selectedTotal = selectedProducts.reduce((sum, i) => sum + i.subtotal, 0);

  // Direct purchase trigger
  const handleStartPurchase = () => {
    if (selectedUnitsCount === 0) {
      setBuyWarning('Selecciona al menos un producto para continuar.');
      setTimeout(() => setBuyWarning(null), 3500);
      return;
    }
    setBuyWarning(null);
    setIsCheckoutOpen(true);
  };

  // Submit Order & Human Hand-off
  const handleFinalizeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProducts.length === 0) return;

    const orderPayload: Omit<CustomerOrder, 'id' | 'createdAt'> = {
      customerName: customerName.trim() || 'Cliente Digital',
      customerPhone: customerPhone.trim(),
      customerAddress: deliveryType === 'delivery' ? customerAddress.trim() : 'Retiro en Tienda',
      paymentMethod,
      items: selectedProducts.map((i) => ({
        productId: i.product.id,
        productName: i.product.name,
        quantity: i.quantity,
        unitPrice: i.product.price,
        totalPrice: i.subtotal,
        saleType: i.product.saleType,
        weightKg: i.product.weightUnit === 'g' ? 0.5 : 1,
      })),
      subtotal: selectedTotal,
      discount: 0,
      discountAmount: 0,
      total: selectedTotal,
      status: 'NUEVO',
      notes: customerNotes || 'Pedido realizado directamente desde el catálogo.',
    };

    if (onPlaceOrder) {
      onPlaceOrder(orderPayload);
    }

    // Reset quantities after placing order
    setItemQuantities({});

    setOrderCompletedData({
      ...orderPayload,
      orderNumber: 'PED-' + Math.floor(100000 + Math.random() * 900000),
    });
    setIsCheckoutOpen(false);
  };

  const getPublicCatalogUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendedor-ia.app';
    const targetId = project.empresaId || project.id;
    return `${origin}?loja=${targetId}`;
  };

  const handleShareLink = async () => {
    const link = getPublicCatalogUrl();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Catálogo Oficial de ${project.name}`,
          text: `🛍️ Conoce nuestro catálogo digital y haz tu pedido online en ${project.name}:`,
          url: link,
        });
        return;
      } catch (e) {
        // Fallback to copy
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (e) {
      prompt('Copia el enlace de tu catálogo público:', link);
    }
  };

  const handleOpenPublicView = () => {
    const link = getPublicCatalogUrl();
    window.open(link, '_blank');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Top Banner with Store Information */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shrink-0 overflow-hidden">
            {project.logoUrl || project.config?.logoUrl ? (
              <img
                src={project.logoUrl || project.config?.logoUrl}
                alt={project.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span>🛍️</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30">
                TIENDA & CATÁLOGO DIGITAL
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {catalog.length} productos disponibles
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {project.name}
            </h2>
            <p className="text-xs text-slate-300 max-w-xl line-clamp-1 mt-0.5">
              {project.config?.tagline || project.description || 'Haz tu pedido online con carrito interactivo.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleOpenPublicView}
            className="px-3.5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition flex items-center space-x-1.5"
            title="Abrir el catálogo público en una nueva pestaña como si fueras un cliente"
          >
            <ExternalLink className="w-3.5 h-3.5 text-indigo-200" />
            <span>Ver Catálogo Público</span>
          </button>

          <button
            type="button"
            onClick={handleShareLink}
            className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition flex items-center space-x-2"
          >
            <Share2 className="w-4 h-4 text-blue-300" />
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Catálogo'}</span>
          </button>

          {/* Direct Buy Header Trigger */}
          <button
            type="button"
            onClick={handleStartPurchase}
            className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 hover:scale-105 transition flex items-center space-x-2 border border-emerald-400/30 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>COMPRAR {selectedUnitsCount > 0 ? `(${selectedUnitsCount})` : ''} — {formatCurrency(selectedTotal, currency)}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción de producto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 outline-none text-xs text-slate-800 font-medium transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid (Shopee style with quantity, Add to Cart & Buy Now) */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
            🔍
          </div>
          <h3 className="text-base font-bold text-slate-800">No se encontraron productos</h3>
          <p className="text-xs text-slate-500">
            Intenta buscar con otro término o selecciona otra categoría.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredItems.map((item) => {
            const qty = getQty(item.id);
            const inStock = item.inStock !== false && (item.stockQuantity ?? 10) > 0;
            const isByWeight = item.saleType === 'weight';

            return (
              <div
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col overflow-hidden group"
              >
                {/* Product Image */}
                <div className="relative aspect-video bg-slate-100 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                  />
                  {isByWeight && (
                    <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-md bg-indigo-900/80 backdrop-blur-sm text-indigo-200 text-[10px] font-bold flex items-center gap-1">
                      <Scale className="w-3 h-3" />
                      Venta por Peso ({item.weightUnit || 'kg'})
                    </span>
                  )}
                  {!inStock && (
                    <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-[2px] flex items-center justify-center">
                      <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-extrabold text-xs tracking-wider uppercase">
                        AGOTADO
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        {item.category || 'General'}
                      </span>
                      {item.popular && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                          ★ Destacado
                        </span>
                      )}
                    </div>
                    <h3 className="font-extrabold text-sm text-slate-900 line-clamp-1">
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Price and Weight */}
                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-black text-slate-900">
                        {formatCurrency(item.price, currency)}
                      </span>
                      {isByWeight && (
                        <span className="text-[11px] text-slate-500 font-medium ml-1">
                          / {item.weightUnit || 'kg'}
                        </span>
                      )}
                    </div>
                    {item.originalPrice && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatCurrency(item.originalPrice, currency)}
                      </span>
                    )}
                  </div>

                  {/* Quantity Stepper [-] 0 [+] Directly on card (Silent update) */}
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-2xl border border-slate-200 text-xs">
                    <span className="font-bold text-slate-700 pl-1">Cantidad:</span>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={!inStock || qty <= 0}
                        onClick={() => updateQty(item.id, -1)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center font-black transition cursor-pointer shadow-xs active:scale-95"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 text-center font-black text-slate-900 font-mono text-sm">{qty}</span>
                      <button
                        type="button"
                        disabled={!inStock || (item.stockQuantity !== undefined && qty >= item.stockQuantity)}
                        onClick={() => updateQty(item.id, 1, item.stockQuantity ?? 99)}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center font-black transition cursor-pointer shadow-xs active:scale-95"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom COMPRAR Bar */}
      <div className="sticky bottom-4 z-40 bg-white/95 backdrop-blur-md rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5 text-center sm:text-left">
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <span className="text-xs font-bold text-slate-600">
              {selectedUnitsCount > 0 ? `${selectedUnitsCount} producto(s) seleccionado(s)` : 'Selecciona las cantidades con + y -'}
            </span>
            {selectedUnitsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                Listo para comprar
              </span>
            )}
          </div>
          <div className="text-xl font-black text-slate-900 font-mono">
            Total: <span className="text-emerald-600">{formatCurrency(selectedTotal, currency)}</span>
          </div>
        </div>

        {buyWarning && (
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center animate-fade-in">
            ⚠️ {buyWarning}
          </div>
        )}

        <button
          type="button"
          onClick={handleStartPurchase}
          className="w-full sm:w-auto px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm shadow-xl shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider"
        >
          <ShoppingBag className="w-5 h-5" />
          <span>COMPRAR</span>
          {selectedUnitsCount > 0 && <span className="font-mono">({formatCurrency(selectedTotal, currency)})</span>}
        </button>
      </div>

      {/* Checkout Form Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <form
            onSubmit={handleFinalizeOrder}
            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Confirmar y Finalizar Pedido
                </h3>
                <p className="text-xs text-slate-500">
                  Completa tus datos para transferir el pedido al atendente humano.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-black"
              >
                ✕
              </button>
            </div>

            {/* Selected Items Summary */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
              <span className="font-extrabold text-slate-700 block">Resumen de Compra:</span>
              {selectedProducts.map((i) => (
                <div key={i.product.id} className="flex justify-between text-slate-600">
                  <span>{i.quantity}x {i.product.name}</span>
                  <span className="font-bold text-slate-900 font-mono">
                    {formatCurrency(i.subtotal, currency)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>Total a Pagar:</span>
                <span className="text-emerald-600 font-mono">{formatCurrency(selectedTotal, currency)}</span>
              </div>
            </div>

            {/* Customer Information Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Tu nombre y apellido"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Teléfono / WhatsApp *</label>
                <input
                  type="text"
                  required
                  placeholder="+55 11 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-medium"
                />
              </div>

              {/* Delivery or Pickup */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Método de Entrega</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType('delivery')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition ${
                      deliveryType === 'delivery'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Entrega a Domicilio</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType('pickup')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center space-x-1.5 transition ${
                      deliveryType === 'pickup'
                        ? 'bg-indigo-50 border-indigo-600 text-indigo-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" />
                    <span>Retiro en Local</span>
                  </button>
                </div>
              </div>

              {deliveryType === 'delivery' && (
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Dirección de Entrega</label>
                  <input
                    type="text"
                    required
                    placeholder="Calle, Número, Barrio, Ciudad..."
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-medium"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">Forma de Pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-800"
                >
                  <option value="Pix">Pix / Transferencia</option>
                  <option value="Efectivo contra entrega">Efectivo contra entrega</option>
                  <option value="Tarjeta de Crédito">Tarjeta de Crédito</option>
                  <option value="Tarjeta de Débito">Tarjeta de Débito</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Observaciones (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones para el repartidor o detalles del pedido..."
                  value={customerNotes}
                  onChange={(e) => setCustomerNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none resize-none font-medium"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-3 flex justify-end space-x-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCheckoutOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
              >
                Volver
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md transition"
              >
                Confirmar y Enviar Pedido
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Order Confirmation & Transfer to Human Modal */}
      {orderCompletedData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-black">
              ✓
            </div>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black border border-emerald-300 mb-2">
                <span>✅ PEDIDO RECIBIDO</span>
              </div>
              <h3 className="text-xl font-black text-slate-900">
                Tu pedido:
              </h3>
              <p className="text-xs font-mono font-bold text-indigo-600 mt-0.5">
                {orderCompletedData.orderNumber}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-left text-xs space-y-2">
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {orderCompletedData.items?.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-slate-700 text-xs">
                    <span className="font-medium">
                      {item.quantity} × {item.productName}
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {formatCurrency(item.totalPrice, currency)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-extrabold text-slate-900 text-sm">TOTAL:</span>
                <span className="font-black text-emerald-600 text-base font-mono">
                  {formatCurrency(orderCompletedData.total, currency)}
                </span>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 text-blue-900 flex items-start gap-2 mt-2">
                <span className="text-base shrink-0">👤</span>
                <p className="text-[11px] leading-relaxed font-bold">
                  Un atendente continuará contigo para confirmar tu pedido.
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <a
                href={`https://wa.me/${(project.config?.phoneWhatsapp || '5511999999999').replace(/\D/g, '')}?text=${encodeURIComponent(
                  `Hola ${project.name}, acabo de realizar el pedido ${orderCompletedData.orderNumber} por ${formatCurrency(orderCompletedData.total, currency)}. Mi nombre es ${orderCompletedData.customerName}. Solicito confirmación con el atendente.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Continuar por WhatsApp con Atendente</span>
              </a>

              <button
                onClick={() => setOrderCompletedData(null)}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Cerrar y Seguir Comprando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
