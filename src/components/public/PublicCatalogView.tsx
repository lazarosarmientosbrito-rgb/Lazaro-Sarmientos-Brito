import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Share2, 
  Check, 
  Copy, 
  Phone, 
  MapPin, 
  Clock, 
  CheckSquare, 
  Square, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ExternalLink, 
  Sparkles, 
  ShieldCheck, 
  Truck, 
  Store, 
  CreditCard, 
  DollarSign, 
  ChevronRight, 
  X, 
  MessageCircle,
  AlertCircle,
  HelpCircle,
  Scale,
  Edit3,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { CatalogItem, BusinessProject, CustomerOrder, PaymentMethodSetting } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  isSupabaseConfigured, 
  fetchProductosByEmpresa, 
  subscribeToProductosByEmpresa, 
  saveProjectToSupabase 
} from '../../lib/supabase';

interface CartItem {
  product: CatalogItem;
  quantity: number;
  selected: boolean;
}

interface PublicCatalogViewProps {
  project: BusinessProject;
  onExitPublicView?: () => void;
  onOrderPlaced?: (order: CustomerOrder) => void;
}

export const PublicCatalogView: React.FC<PublicCatalogViewProps> = ({
  project: initialProject,
  onExitPublicView,
  onOrderPlaced,
}) => {
  const [project, setProject] = useState<BusinessProject>(initialProject);
  const [catalog, setCatalog] = useState<CatalogItem[]>(initialProject.catalog || []);
  const config = project.config || {};
  const currency = config.currency || 'BRL';
  const empresaId = project.empresaId || (typeof project.id === 'string' && !isNaN(Number(project.id)) ? Number(project.id) : 1);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [buyWarning, setBuyWarning] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [directBuyItem, setDirectBuyItem] = useState<{ product: CatalogItem; quantity: number } | null>(null);

  // Sharing Feedback State
  const [copiedLink, setCopiedLink] = useState(false);
  const [shareToast, setShareToast] = useState('');

  // Progressive Checkout Flow State
  const [checkoutStep, setCheckoutStep] = useState<'cart_review' | 'customer_data' | 'confirmation'>('cart_review');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [customerAddress, setCustomerAddress] = useState('');
  const [streetNumber, setStreetNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('Pix');
  const [customerNotes, setCustomerNotes] = useState('');
  const [dataErrors, setDataErrors] = useState<Record<string, string>>({});
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<CustomerOrder | null>(null);

  // 1. Sync with Supabase real-time so changes from admin panel reflect live
  useEffect(() => {
    setProject(initialProject);
    setCatalog(initialProject.catalog || []);
  }, [initialProject]);

  useEffect(() => {
    if (!isSupabaseConfigured || !empresaId) return;

    let isMounted = true;
    // Initial fetch from Supabase
    fetchProductosByEmpresa(empresaId)
      .then((prods) => {
        if (isMounted && prods && prods.length > 0) {
          setCatalog(prods);
        }
      })
      .catch((e) => console.warn('Public catalog fetch:', e));

    // Realtime subscription
    const unsubscribe = subscribeToProductosByEmpresa(empresaId, () => {
      if (isMounted) {
        fetchProductosByEmpresa(empresaId)
          .then((prods) => {
            if (isMounted && prods && prods.length > 0) {
              setCatalog(prods);
            }
          })
          .catch((e) => console.warn('Public catalog realtime fetch:', e));
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [empresaId]);

  // Categories extraction
  const categories = useMemo(() => {
    const list = catalog.map((p) => p.category?.trim() || 'General').filter(Boolean);
    return ['TODOS', ...Array.from(new Set(list))];
  }, [catalog]);

  // Filtered products (only non-hidden)
  const filteredProducts = useMemo(() => {
    return catalog.filter((item) => {
      if (item.status === 'oculto') return false;
      const matchesCategory = selectedCategory === 'TODOS' || (item.category?.trim() || 'General') === selectedCategory;
      const matchesSearch =
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCategory, searchTerm]);

  // Silent quantity stepper helper
  const getQty = (id: string) => itemQuantities[id] || 0;
  const updateQty = (id: string, delta: number) => {
    setItemQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      const copy = { ...prev };
      if (next === 0) {
        delete copy[id];
      } else {
        copy[id] = next;
      }
      return copy;
    });
    if (buyWarning) setBuyWarning('');
  };

  // Direct purchase calculations (no cart required)
  const selectedProducts = useMemo(() => {
    return catalog
      .filter((item) => (itemQuantities[item.id] || 0) > 0)
      .map((product) => ({
        product,
        quantity: itemQuantities[product.id],
        subtotal: product.price * itemQuantities[product.id],
      }));
  }, [catalog, itemQuantities]);

  const selectedUnitsCount = selectedProducts.reduce((acc, i) => acc + i.quantity, 0);
  const selectedSubtotal = selectedProducts.reduce((acc, i) => acc + i.subtotal, 0);

  const handleStartPurchase = () => {
    if (selectedUnitsCount === 0) {
      setBuyWarning('Selecciona al menos un producto con [+] para comprar.');
      setTimeout(() => setBuyWarning(''), 4000);
      return;
    }
    setBuyWarning('');
    setDirectBuyItem(null);
    setCheckoutStep('cart_review');
    setDataErrors({});
    setIsCheckoutOpen(true);
  };

  const handleDirectBuy = (product: CatalogItem) => {
    const currentQty = itemQuantities[product.id] || 0;
    const targetQty = currentQty > 0 ? currentQty : 1;
    if (currentQty === 0) {
      setItemQuantities((prev) => ({ ...prev, [product.id]: 1 }));
    }
    setDirectBuyItem({ product, quantity: targetQty });
    setCheckoutStep('cart_review');
    setDataErrors({});
    setIsCheckoutOpen(true);
  };

  // Delivery and threshold calculations
  const shippingFee = deliveryType === 'delivery' ? (Number(config.shippingFee) || 7.0) : 0;
  const freeShippingThreshold = Number(config.freeShippingThreshold) || 50.0;
  const isFreeShipping = deliveryType === 'delivery' && selectedSubtotal >= freeShippingThreshold;
  const actualShippingFee = isFreeShipping ? 0 : shippingFee;

  // Payment methods
  const paymentMethods: PaymentMethodSetting[] = (config.paymentMethodSettings && config.paymentMethodSettings.length > 0)
    ? config.paymentMethodSettings.filter((p) => p.enabled !== false)
    : [
        { id: 'pay-pix', name: 'PIX (10% descuento)', discountPercentage: 10, enabled: true },
        { id: 'pay-card', name: 'Tarjeta Débito / Crédito', discountPercentage: 0, enabled: true },
        { id: 'pay-cash', name: 'Efectivo / Dinheiro (5% descuento)', discountPercentage: 5, enabled: true },
      ];

  const currentPayment = paymentMethods.find((p) => p.name === selectedPaymentMethod) || paymentMethods[0];
  const discountPercentage = currentPayment?.discountPercentage || 0;
  const discountAmount = (selectedSubtotal * discountPercentage) / 100;
  const grandTotal = Math.max(0, selectedSubtotal - discountAmount + actualShippingFee);

  // Active items in this purchase
  const itemsToOrder = useMemo(() => {
    return directBuyItem
      ? [
          {
            productId: directBuyItem.product.id,
            productName: directBuyItem.product.name,
            quantity: directBuyItem.quantity,
            unitPrice: directBuyItem.product.price,
            totalPrice: directBuyItem.product.price * directBuyItem.quantity,
          },
        ]
      : selectedProducts.map((c) => ({
          productId: c.product.id,
          productName: c.product.name,
          quantity: c.quantity,
          unitPrice: c.product.price,
          totalPrice: c.subtotal,
        }));
  }, [directBuyItem, selectedProducts]);

  const currentSubtotal = directBuyItem
    ? directBuyItem.product.price * directBuyItem.quantity
    : selectedSubtotal;
  const currentDiscount = (currentSubtotal * discountPercentage) / 100;
  const currentShipping = deliveryType === 'delivery' ? (currentSubtotal >= freeShippingThreshold ? 0 : shippingFee) : 0;
  const currentGrandTotal = Math.max(0, currentSubtotal - currentDiscount + currentShipping);

  // Step 1 -> Step 2 validation
  const handleProceedToCustomerData = () => {
    if (itemsToOrder.length === 0) {
      alert('Por favor selecciona al menos un producto para comprar.');
      return;
    }
    setCheckoutStep('customer_data');
  };

  // Step 2 -> Step 3 validation (Strict client data capture)
  const handleProceedToConfirmation = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!customerName.trim()) {
      errors.name = 'Por favor ingresa tu nombre completo.';
    }
    if (!customerPhone.trim() || customerPhone.trim().length < 6) {
      errors.phone = 'Por favor ingresa tu teléfono o WhatsApp de contacto.';
    }

    if (deliveryType === 'delivery') {
      if (!customerAddress.trim()) {
        errors.address = 'Ingresa la calle o avenida.';
      }
      if (!streetNumber.trim()) {
        errors.number = 'Ingresa el número (o S/N).';
      }
      if (!neighborhood.trim()) {
        errors.neighborhood = 'Ingresa el barrio o sector.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setDataErrors(errors);
      return;
    }

    setDataErrors({});
    setCheckoutStep('confirmation');
  };

  // Step 3 -> Execute Order (ONLY executed when user clicks [Confirmar pedido])
  const handleExecuteFinalOrder = async () => {
    if (itemsToOrder.length === 0) return;

    const fullAddress = deliveryType === 'delivery'
      ? [
          customerAddress.trim(),
          streetNumber.trim() ? `Nº ${streetNumber.trim()}` : '',
          neighborhood.trim() ? `Barrio: ${neighborhood.trim()}` : '',
          city.trim() ? city.trim() : '',
        ].filter(Boolean).join(', ')
      : 'Retiro en el establecimiento';

    const orderPayload: CustomerOrder = {
      id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      orderNumber: String(Math.floor(100000 + Math.random() * 900000)),
      empresaId: empresaId,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: fullAddress,
      deliveryType,
      streetNumber: streetNumber.trim(),
      neighborhood: neighborhood.trim(),
      city: city.trim(),
      reference: referencePoint.trim() || undefined,
      paymentStatus: 'PENDIENTE',
      items: itemsToOrder,
      subtotal: currentSubtotal,
      discountPercentage,
      discount: currentDiscount,
      discountAmount: currentDiscount,
      shippingFee: currentShipping,
      total: currentGrandTotal,
      paymentMethod: selectedPaymentMethod,
      status: 'NUEVO',
      createdAt: new Date().toISOString(),
      notes: customerNotes.trim() || undefined,
      currency,
    };

    setIsSubmittingOrder(true);

    try {
      // 1. Post to server backend (deducts stock and broadcasts real-time SSE to company dashboard)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-empresa-id': String(empresaId),
        },
        body: JSON.stringify(orderPayload),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          orderPayload.id = data.order.id;
          orderPayload.orderNumber = data.order.orderNumber;
        }
      }
    } catch (e) {
      console.warn('Order server sync warning:', e);
    }

    try {
      // 2. Save in project state and Supabase
      const updatedOrders = [orderPayload, ...(project.orders || [])];
      const updatedProject = {
        ...project,
        orders: updatedOrders,
        updatedAt: new Date().toISOString(),
      };
      setProject(updatedProject);
      if (isSupabaseConfigured) {
        await saveProjectToSupabase(updatedProject);
      }
      if (onOrderPlaced) {
        onOrderPlaced(orderPayload);
      }
    } catch (e) {
      console.warn('Order Supabase sync warning:', e);
    }

    // Reset item quantities upon confirmed purchase
    setItemQuantities({});
    setIsSubmittingOrder(false);
    setDirectBuyItem(null);
    setCompletedOrder(orderPayload);
    setIsCheckoutOpen(false);
    setCheckoutStep('cart_review');
  };

  // Share Catalog Handler
  const getPublicShareUrl = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://vendedor-ia.app';
    const targetId = project.empresaId || project.id;
    return `${origin}?loja=${targetId}`;
  };

  const handleShareCatalog = async () => {
    const shareUrl = getPublicShareUrl();
    const shareData = {
      title: project.name,
      text: `🛍️ Conoce el catálogo online de ${project.name} y haz tu pedido:`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // User cancelled or fallback to copy
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setShareToast('¡Enlace del catálogo copiado al portapapeles!');
      setTimeout(() => {
        setCopiedLink(false);
        setShareToast('');
      }, 3000);
    } catch (e) {
      setShareToast('Enlace: ' + shareUrl);
    }
  };

  // Open WhatsApp with pre-filled order
  const handleOpenWhatsAppOrder = (order: CustomerOrder) => {
    const storeWhatsapp = config.phoneWhatsapp || '5511999999999';
    const cleanPhone = storeWhatsapp.replace(/\D/g, '');

    const itemsSummary = (order.items || [])
      .map((it) => `• ${it.quantity}x ${it.productName} — ${formatCurrency(it.totalPrice, currency)}`)
      .join('\n');

    const addressStr = order.deliveryType === 'pickup'
      ? '🏬 Retiro en establecimiento'
      : `🛵 Entrega a: ${order.customerAddress || 'Domicilio'}${order.reference ? ` (Ref: ${order.reference})` : ''}`;

    const msg = `¡Hola *${project.name}*! 👋 Acabo de realizar este pedido desde su Catálogo Digital:\n\n*Pedido:* #${order.orderNumber || order.id.slice(-6).toUpperCase()}\n*Cliente:* ${order.customerName}\n*WhatsApp:* ${order.customerPhone}\n*Modalidad:* ${addressStr}\n\n*Productos:*\n${itemsSummary}\n\n*Subtotal:* ${formatCurrency(order.subtotal, currency)}\n${order.discount ? `*Descuento:* -${formatCurrency(order.discount, currency)}\n` : ''}${order.shippingFee ? `*Envío:* ${formatCurrency(order.shippingFee, currency)}\n` : '*Envío:* ¡Gratis!\n'}*TOTAL A PAGAR:* ${formatCurrency(order.total, currency)}\n*Forma de Pago:* ${order.paymentMethod}\n\n¿Me confirman la recepción del pedido? ¡Gracias!`;

    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-600 selection:text-white pb-28">
      {/* Toast Notification */}
      {shareToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-2 text-xs font-bold animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{shareToast}</span>
        </div>
      )}

      {/* Public Store Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Brand Info */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0 shadow-xs">
              {project.logoUrl || config.logoUrl ? (
                <img
                  src={project.logoUrl || config.logoUrl}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xl">🛍️</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1.5">
                <h1 className="text-sm sm:text-base font-black text-slate-900 truncate">
                  {project.name}
                </h1>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-100 text-emerald-800 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
                  Abierto
                </span>
              </div>
              <p className="text-[11px] text-slate-500 truncate">
                {config.tagline || project.description || 'Catálogo Digital Oficial'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Share Catalog Button */}
            <button
              onClick={handleShareCatalog}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition flex items-center space-x-1.5"
              title="Compartir catálogo con un amigo o cliente"
            >
              <Share2 className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">{copiedLink ? '¡Copiado!' : 'Compartir'}</span>
            </button>

            {/* Direct Buy Trigger */}
            <button
              onClick={handleStartPurchase}
              className="relative px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs transition shadow-sm flex items-center space-x-2 cursor-pointer uppercase tracking-wider"
              title="Comprar productos seleccionados"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>COMPRAR</span>
              {selectedUnitsCount > 0 && (
                <span className="bg-amber-400 text-slate-900 font-mono font-black text-[10px] px-2 py-0.5 rounded-full shadow-xs">
                  {selectedUnitsCount}
                </span>
              )}
            </button>

            {onExitPublicView && (
              <button
                onClick={onExitPublicView}
                className="text-[11px] font-medium text-slate-400 hover:text-slate-600 px-2 py-1"
                title="Volver al panel"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Store Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center text-3xl shrink-0 overflow-hidden shadow-md">
                {project.logoUrl || config.logoUrl ? (
                  <img
                    src={project.logoUrl || config.logoUrl}
                    alt={project.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>🛍️</span>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-400/30">
                    TIENDA OFICIAL
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {catalog.filter((i) => i.status !== 'oculto').length} productos disponibles
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  {project.name}
                </h2>
                <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2 leading-relaxed">
                  {project.description || config.tagline || 'Pide directamente desde nuestro catálogo online con entrega rápida o retiro.'}
                </p>

                {/* Business Perks Pill */}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[11px] text-slate-300">
                  {config.businessHours && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>{config.businessHours}</span>
                    </div>
                  )}
                  {config.city && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3.5 h-3.5 text-red-400" />
                      <span>{config.city}{config.state ? `, ${config.state}` : ''}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Envío R$ {shippingFee.toFixed(2).replace('.', ',')} (Gratis desde R$ {freeShippingThreshold.toFixed(2).replace('.', ',')})
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Share action box */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <button
                onClick={handleShareCatalog}
                className="px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 transition flex items-center justify-center space-x-2"
              >
                <Share2 className="w-4 h-4 text-blue-300" />
                <span>{copiedLink ? '¡Enlace Copiado!' : 'Compartir Catálogo'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Category Filters */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs">
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
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-2xl">
              🔍
            </div>
            <h3 className="font-extrabold text-slate-800 text-base">No se encontraron productos</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Prueba con otra palabra de búsqueda o selecciona otra categoría en los filtros superiores.
            </p>
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCategory('TODOS');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
              >
                Limpiar búsqueda
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredProducts.map((item) => {
              const qty = getQty(item.id);
              const inStock = item.status !== 'esgotado' && item.inStock !== false;
              const isByWeight = item.saleType === 'weight';

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow overflow-hidden flex flex-col justify-between group"
                >
                  {/* Image Container */}
                  <div className="relative aspect-square w-full bg-slate-100 overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-slate-300">
                        🛍️
                      </div>
                    )}

                    {!inStock && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                          Agotado
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
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
                        {item.description || 'Producto artesanal de excelente calidad y presentación.'}
                      </p>
                    </div>

                    {/* Price */}
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
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-slate-400 line-through">
                          {formatCurrency(item.originalPrice, currency)}
                        </span>
                      )}
                    </div>

                    {/* Quantity Stepper [-] [qty] [+] (Silent, no alerts) */}
                    <div className={`flex items-center justify-between p-2 rounded-2xl border transition text-xs ${
                      qty > 0 ? 'bg-emerald-50/70 border-emerald-300' : 'bg-slate-50 border-slate-200'
                    }`}>
                      <span className={`font-bold pl-1 ${qty > 0 ? 'text-emerald-900' : 'text-slate-600'}`}>
                        {qty > 0 ? `${qty} seleccionado${qty > 1 ? 's' : ''}` : 'Seleccionar:'}
                      </span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          disabled={qty === 0}
                          onClick={() => updateQty(item.id, -1)}
                          className={`w-7 h-7 rounded-xl border flex items-center justify-center font-black transition cursor-pointer ${
                            qty === 0
                              ? 'bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed'
                              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 active:scale-95'
                          }`}
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-black text-slate-900 font-mono text-sm">{qty}</span>
                        <button
                          type="button"
                          disabled={!inStock}
                          onClick={() => updateQty(item.id, 1)}
                          className="w-7 h-7 rounded-xl bg-white border border-slate-300 text-slate-800 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 flex items-center justify-center font-black transition active:scale-95 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Direct Buy Button */}
                    <button
                      type="button"
                      disabled={!inStock}
                      onClick={() => handleDirectBuy(item)}
                      className={`w-full py-2.5 px-3 rounded-xl font-black text-xs transition flex items-center justify-center space-x-1.5 uppercase tracking-wider ${
                        !inStock
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white shadow-xs cursor-pointer'
                      }`}
                    >
                      <ShoppingBag className="w-3.5 h-3.5" />
                      <span>Comprar ahora</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Sticky Bottom COMPRAR Bar */}
      <div className="fixed bottom-4 left-4 right-4 max-w-2xl mx-auto z-40 bg-white/95 backdrop-blur-md rounded-3xl p-3 sm:p-4 shadow-2xl border border-slate-200 flex items-center justify-between gap-4 animate-fade-in">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">
              {selectedUnitsCount > 0 ? `${selectedUnitsCount} producto(s) seleccionado(s)` : 'Selecciona las cantidades con + y -'}
            </span>
            {selectedUnitsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black">
                Listo para comprar
              </span>
            )}
          </div>
          <div className="text-base sm:text-lg font-black text-slate-900 font-mono">
            Total: <span className="text-emerald-600">{formatCurrency(selectedSubtotal, currency)}</span>
          </div>
        </div>

        {buyWarning && (
          <div className="text-amber-700 text-xs font-bold animate-fade-in hidden sm:block">
            ⚠️ {buyWarning}
          </div>
        )}

        <button
          type="button"
          onClick={handleStartPurchase}
          className="px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-emerald-600/30 transition flex items-center space-x-1.5 cursor-pointer uppercase tracking-wider shrink-0"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>COMPRAR</span>
          {selectedUnitsCount > 0 && <span className="font-mono hidden sm:inline">({formatCurrency(selectedSubtotal, currency)})</span>}
        </button>
      </div>

      {/* Progressive Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-6 space-y-5 transition-all">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center space-x-2.5">
                {checkoutStep === 'customer_data' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart_review')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                    title="Volver"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                {checkoutStep === 'confirmation' && (
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('customer_data')}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                    title="Corregir datos"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                )}
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base sm:text-lg">
                    {checkoutStep === 'cart_review' && '1. Resumen de tu Compra'}
                    {checkoutStep === 'customer_data' && '2. Datos para la Entrega'}
                    {checkoutStep === 'confirmation' && '3. Confirmar Pedido'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {checkoutStep === 'cart_review' && 'Revisa tus productos y elige la forma de pago'}
                    {checkoutStep === 'customer_data' && 'Ingresa tus datos para registrar y despachar tu pedido'}
                    {checkoutStep === 'confirmation' && 'Revisa el resumen completo antes de registrar el pedido'}
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  setIsCheckoutOpen(false);
                  setDirectBuyItem(null);
                  setCheckoutStep('cart_review');
                  setDataErrors({});
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer transition"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step Progress Indicators */}
            <div className="grid grid-cols-3 gap-2">
              <div className={`h-1.5 rounded-full transition-all ${
                checkoutStep === 'cart_review' || checkoutStep === 'customer_data' || checkoutStep === 'confirmation'
                  ? 'bg-emerald-600'
                  : 'bg-slate-200'
              }`} />
              <div className={`h-1.5 rounded-full transition-all ${
                checkoutStep === 'customer_data' || checkoutStep === 'confirmation'
                  ? 'bg-emerald-600'
                  : 'bg-slate-200'
              }`} />
              <div className={`h-1.5 rounded-full transition-all ${
                checkoutStep === 'confirmation'
                  ? 'bg-emerald-600'
                  : 'bg-slate-200'
              }`} />
            </div>

            {/* STEP 1: CART REVIEW & PAYMENT METHOD SELECTION */}
            {checkoutStep === 'cart_review' && (
              <div className="space-y-4 text-xs">
                {/* Products List */}
                <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 space-y-2">
                  <div className="flex justify-between items-center text-slate-700 font-bold border-b border-slate-200/80 pb-2">
                    <span>Productos seleccionados ({itemsToOrder.reduce((a, b) => a + b.quantity, 0)}):</span>
                    <span className="text-[11px] text-slate-500 font-normal">Cantidades</span>
                  </div>
                  
                  <div className="space-y-2 max-h-44 overflow-y-auto pr-1 divide-y divide-slate-100">
                    {itemsToOrder.map((item) => (
                      <div key={item.productId} className="pt-1.5 first:pt-0 flex justify-between items-center text-slate-800">
                        <div className="min-w-0 pr-2">
                          <p className="font-extrabold text-slate-900 truncate">{item.productName}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.quantity} x {formatCurrency(item.unitPrice, currency)}
                          </p>
                        </div>
                        <span className="font-mono font-black text-slate-900 shrink-0">
                          {formatCurrency(item.totalPrice, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* "¿CÓMO QUIERES PAGAR?" */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¿Cómo quieres pagar? *</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {paymentMethods.map((pm) => {
                      const isSelected = selectedPaymentMethod === pm.name;
                      return (
                        <button
                          key={pm.id || pm.name}
                          type="button"
                          onClick={() => setSelectedPaymentMethod(pm.name)}
                          className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold shadow-xs'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="font-bold leading-tight line-clamp-2">{pm.name}</span>
                          {pm.discountPercentage > 0 && (
                            <span className="mt-1 inline-block text-[10px] bg-emerald-200 text-emerald-900 font-black px-1.5 py-0.5 rounded w-fit">
                              -{pm.discountPercentage}% dto.
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Forma de Entrega */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 flex items-center space-x-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¿Cómo quieres recibir tu pedido?</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeliveryType('delivery')}
                      className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition border cursor-pointer ${
                        deliveryType === 'delivery'
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Truck className="w-4 h-4 text-emerald-600" />
                      <span>Envío a Domicilio</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeliveryType('pickup')}
                      className={`py-2.5 px-3 rounded-xl font-bold flex items-center justify-center space-x-2 transition border cursor-pointer ${
                        deliveryType === 'pickup'
                          ? 'bg-emerald-50/90 border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-950 font-bold'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Store className="w-4 h-4 text-emerald-600" />
                      <span>Retiro en Local</span>
                    </button>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl space-y-1.5 text-xs shadow-md">
                  <div className="flex justify-between text-slate-300">
                    <span>Subtotal productos:</span>
                    <span className="font-mono">{formatCurrency(currentSubtotal, currency)}</span>
                  </div>
                  {currentDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400 font-bold">
                      <span>Descuento por {selectedPaymentMethod} ({discountPercentage}%):</span>
                      <span className="font-mono">-{formatCurrency(currentDiscount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-300">
                    <span>Envío:</span>
                    <span className="font-mono">
                      {deliveryType === 'pickup'
                        ? 'Gratis (Retiro)'
                        : currentShipping === 0
                        ? '¡Gratis!'
                        : formatCurrency(currentShipping, currency)}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-800 flex justify-between text-sm sm:text-base font-black text-white">
                    <span>TOTAL:</span>
                    <span className="text-emerald-400 font-mono">
                      {formatCurrency(currentGrandTotal, currency)}
                    </span>
                  </div>
                </div>

                {/* Continue to Step 2 */}
                <button
                  type="button"
                  onClick={handleProceedToCustomerData}
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                >
                  <span>Continuar con mis Datos</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: CUSTOMER DATA CAPTURE */}
            {checkoutStep === 'customer_data' && (
              <form onSubmit={handleProceedToConfirmation} className="space-y-4 text-xs">
                <div className="bg-emerald-50/70 border border-emerald-200 text-emerald-900 p-2.5 rounded-xl text-[11px] leading-relaxed">
                  Por favor completa tus datos para procesar y coordinar la entrega de tu pedido.
                </div>

                {/* Customer Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">
                    Nombre Completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. María González"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      if (dataErrors.name) setDataErrors((prev) => ({ ...prev, name: '' }));
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl bg-slate-50 border outline-none font-medium transition ${
                      dataErrors.name
                        ? 'border-red-500 bg-red-50/30 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:border-emerald-600'
                    }`}
                  />
                  {dataErrors.name && (
                    <p className="text-[11px] text-red-600 font-bold">{dataErrors.name}</p>
                  )}
                </div>

                {/* Phone / WhatsApp */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-800 block">
                    Teléfono / WhatsApp de Contacto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ej. +55 11 98877-6655"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      if (dataErrors.phone) setDataErrors((prev) => ({ ...prev, phone: '' }));
                    }}
                    className={`w-full px-3 py-2.5 rounded-xl bg-slate-50 border outline-none font-medium transition ${
                      dataErrors.phone
                        ? 'border-red-500 bg-red-50/30 text-red-900'
                        : 'border-slate-200 focus:bg-white focus:border-emerald-600'
                    }`}
                  />
                  {dataErrors.phone && (
                    <p className="text-[11px] text-red-600 font-bold">{dataErrors.phone}</p>
                  )}
                </div>

                {/* Delivery Address Fields (if deliveryType === 'delivery') */}
                {deliveryType === 'delivery' ? (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <span className="font-bold text-slate-900 block text-xs">
                      Dirección completa de entrega:
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Calle / Avenida <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Av. Paulista"
                          value={customerAddress}
                          onChange={(e) => {
                            setCustomerAddress(e.target.value);
                            if (dataErrors.address) setDataErrors((prev) => ({ ...prev, address: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-slate-50 border outline-none font-medium transition ${
                            dataErrors.address
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-200 focus:bg-white focus:border-emerald-600'
                          }`}
                        />
                        {dataErrors.address && (
                          <p className="text-[10px] text-red-600 font-bold">{dataErrors.address}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Número <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. 1234"
                          value={streetNumber}
                          onChange={(e) => {
                            setStreetNumber(e.target.value);
                            if (dataErrors.number) setDataErrors((prev) => ({ ...prev, number: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-slate-50 border outline-none font-medium transition ${
                            dataErrors.number
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-200 focus:bg-white focus:border-emerald-600'
                          }`}
                        />
                        {dataErrors.number && (
                          <p className="text-[10px] text-red-600 font-bold">{dataErrors.number}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">
                          Barrio / Sector <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej. Jardins"
                          value={neighborhood}
                          onChange={(e) => {
                            setNeighborhood(e.target.value);
                            if (dataErrors.neighborhood) setDataErrors((prev) => ({ ...prev, neighborhood: '' }));
                          }}
                          className={`w-full px-3 py-2 rounded-xl bg-slate-50 border outline-none font-medium transition ${
                            dataErrors.neighborhood
                              ? 'border-red-500 bg-red-50/30'
                              : 'border-slate-200 focus:bg-white focus:border-emerald-600'
                          }`}
                        />
                        {dataErrors.neighborhood && (
                          <p className="text-[10px] text-red-600 font-bold">{dataErrors.neighborhood}</p>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="font-bold text-slate-700 block">Ciudad</label>
                        <input
                          type="text"
                          placeholder="Ej. São Paulo"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 outline-none font-medium"
                        />
                      </div>
                    </div>

                    {/* Reference Point */}
                    <div className="space-y-1">
                      <label className="font-bold text-slate-700 block">
                        Punto de Referencia (Opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ej. Casa blanca con rejas, frente a la farmacia"
                        value={referencePoint}
                        onChange={(e) => setReferencePoint(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 outline-none font-medium"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2 text-slate-700">
                    <Store className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Retiro en local seleccionado</p>
                      <p className="text-[11px] text-slate-500">
                        Te notificaremos vía WhatsApp en cuanto tu pedido esté preparado para retirar en nuestro local.
                      </p>
                    </div>
                  </div>
                )}

                {/* Additional Notes */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Observaciones (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ej. Sin cebolla, tocar timbre 2, etc."
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-600 outline-none font-medium"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep('cart_review')}
                    className="w-1/3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
                  >
                    <span>Revisar y Confirmar</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: CONFIRMACIÓN ANTES DE CREAR EL PEDIDO */}
            {checkoutStep === 'confirmation' && (
              <div className="space-y-4 text-xs">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-amber-900 space-y-1">
                  <p className="font-black text-xs sm:text-sm">¿Está todo correcto?</p>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    Revisa atentamente el resumen antes de crear tu pedido. Al confirmar, la empresa recibirá tu pedido al instante.
                  </p>
                </div>

                {/* Full Review Summary Card */}
                <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3.5">
                  {/* Products */}
                  <div>
                    <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-1.5">
                      1. Productos ({itemsToOrder.length}):
                    </span>
                    <div className="space-y-1 bg-white p-2.5 rounded-xl border border-slate-200/80">
                      {itemsToOrder.map((it) => (
                        <div key={it.productId} className="flex justify-between items-center text-slate-800">
                          <span className="truncate pr-2">
                            <strong>{it.quantity}x</strong> {it.productName}
                          </span>
                          <span className="font-mono font-bold shrink-0">
                            {formatCurrency(it.totalPrice, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Total */}
                  <div className="flex justify-between items-center bg-slate-900 text-white p-3 rounded-xl">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                        Total a Pagar
                      </span>
                      <span className="text-[11px] text-emerald-400">
                        Pago: {selectedPaymentMethod}
                      </span>
                    </div>
                    <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
                      {formatCurrency(currentGrandTotal, currency)}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 bg-white p-3 rounded-xl border border-slate-200/80">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Cliente:</span>
                      <p className="font-extrabold text-slate-900">{customerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">WhatsApp / Teléfono:</span>
                      <p className="font-extrabold text-slate-900 font-mono">{customerPhone}</p>
                    </div>
                  </div>

                  {/* Delivery Details */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 text-slate-700 space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Modalidad y Dirección:
                    </span>
                    {deliveryType === 'delivery' ? (
                      <div>
                        <p className="font-bold text-slate-900">
                          {customerAddress}, Nº {streetNumber}
                        </p>
                        <p className="text-[11px] text-slate-600">
                          Barrio: {neighborhood} {city ? `• ${city}` : ''}
                        </p>
                        {referencePoint && (
                          <p className="text-[11px] text-slate-500 italic mt-0.5">
                            Punto de referencia: {referencePoint}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="font-bold text-slate-900">Retiro en local / tienda física</p>
                    )}

                    {customerNotes && (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px]">
                        <span className="font-bold text-slate-500">Notas:</span> {customerNotes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Final Decision Action Buttons */}
                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmittingOrder}
                    onClick={handleExecuteFinalOrder}
                    className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition shadow-lg shadow-emerald-600/30 flex items-center justify-center space-x-2 cursor-pointer active:scale-98 disabled:opacity-60"
                  >
                    {isSubmittingOrder ? (
                      <span>Creando y notificando pedido...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Confirmar Pedido</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isSubmittingOrder}
                      onClick={() => setCheckoutStep('customer_data')}
                      className="py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition flex items-center justify-center space-x-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Corregir datos</span>
                    </button>

                    <button
                      type="button"
                      disabled={isSubmittingOrder}
                      onClick={() => {
                        setIsCheckoutOpen(false);
                        setCheckoutStep('cart_review');
                      }}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 text-slate-500 font-bold hover:bg-slate-100 transition cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* FINAL ORDER SUCCESS NOTIFICATION MODAL */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl border border-slate-200 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-sm">
              ✓
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                ¡Pedido Realizado con Éxito!
              </span>
              <h3 className="text-xl font-black text-slate-900 pt-1">
                #{completedOrder.orderNumber || completedOrder.id.slice(-6).toUpperCase()}
              </h3>
              
              {/* Mensaje exacto requerido */}
              <div className="bg-emerald-50/80 border border-emerald-200 text-emerald-950 p-3 rounded-2xl text-xs font-bold leading-relaxed text-center my-2">
                "Pedido recibido. La empresa ya recibió tu pedido y continuará con la atención."
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Gracias <strong>{completedOrder.customerName}</strong>. Registrado en <strong>{project.name}</strong> por un total de{' '}
                <strong>{formatCurrency(completedOrder.total, currency)}</strong> mediante <strong>{completedOrder.paymentMethod}</strong>.
              </p>
            </div>

            {/* WhatsApp Confirmation Action */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => handleOpenWhatsAppOrder(completedOrder)}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/30 transition flex items-center justify-center space-x-2 cursor-pointer active:scale-98"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Continuar por WhatsApp con la Tienda</span>
              </button>

              <button
                onClick={() => setCompletedOrder(null)}
                className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cerrar y seguir explorando el catálogo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
