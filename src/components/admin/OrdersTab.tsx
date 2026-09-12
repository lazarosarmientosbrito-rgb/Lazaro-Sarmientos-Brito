import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Truck, 
  XCircle, 
  Phone, 
  MapPin, 
  Calendar, 
  CreditCard, 
  User, 
  ArrowRight,
  Eye,
  Plus,
  MessageSquare,
  AlertCircle,
  Edit3,
  Save,
  Bot,
  FileText
} from 'lucide-react';
import { CustomerOrder, OrderStatus, BusinessProject } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface OrdersTabProps {
  orders: CustomerOrder[];
  project: BusinessProject;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onUpdateOrder?: (orderId: string, updatedFields: Partial<CustomerOrder>) => void;
  onAddManualOrder?: (order: Omit<CustomerOrder, 'id' | 'createdAt'>) => void;
  selectedOrderId?: string | null;
  onClearSelectedOrderId?: () => void;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  project,
  onUpdateOrderStatus,
  onUpdateOrder,
  onAddManualOrder,
  selectedOrderId,
  onClearSelectedOrderId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('TODOS');
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isEditingOrder, setIsEditingOrder] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<Partial<CustomerOrder>>({});

  // Auto-open order if selectedOrderId passed from notification
  React.useEffect(() => {
    if (selectedOrderId) {
      const match = orders.find((o) => o.id === selectedOrderId || o.orderNumber === selectedOrderId);
      if (match) {
        setSelectedOrder(match);
      }
    }
  }, [selectedOrderId, orders]);

  // Sync editForm when selectedOrder changes
  React.useEffect(() => {
    if (selectedOrder) {
      setEditForm({
        customerName: selectedOrder.customerName || '',
        customerPhone: selectedOrder.customerPhone || '',
        customerAddress: selectedOrder.customerAddress || '',
        deliveryType: selectedOrder.deliveryType || 'delivery',
        streetNumber: selectedOrder.streetNumber || '',
        complement: selectedOrder.complement || '',
        neighborhood: selectedOrder.neighborhood || '',
        city: selectedOrder.city || '',
        reference: selectedOrder.reference || '',
        paymentMethod: selectedOrder.paymentMethod || '',
        paymentStatus: selectedOrder.paymentStatus || 'PENDIENTE',
        notes: selectedOrder.notes || '',
      });
      setIsEditingOrder(false);
    }
  }, [selectedOrder?.id]);

  const handleSaveEdit = async () => {
    if (!selectedOrder) return;
    setIsSavingEdit(true);

    const updated: CustomerOrder = {
      ...selectedOrder,
      ...editForm,
    };

    // Recalculate pendingFields
    const pending: Array<'customerName' | 'customerPhone' | 'customerAddress' | 'paymentMethod'> = [];
    if (!updated.customerName || updated.customerName === 'Cliente') pending.push('customerName');
    if (!updated.customerPhone) pending.push('customerPhone');
    if (!updated.customerAddress && updated.deliveryType !== 'pickup') pending.push('customerAddress');
    if (!updated.paymentMethod) pending.push('paymentMethod');
    updated.pendingFields = pending;

    setSelectedOrder(updated);
    setIsEditingOrder(false);

    if (onUpdateOrder) {
      onUpdateOrder(selectedOrder.id, updated);
    }

    try {
      await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-empresa-id': String(selectedOrder.empresaId || project.id || 1),
        },
        body: JSON.stringify(editForm),
      });
    } catch (e) {
      console.warn('Error al guardar edición en backend:', e);
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Auto-open order if selectedOrderId passed from notification
  React.useEffect(() => {
    if (selectedOrderId) {
      const match = orders.find((o) => o.id === selectedOrderId || o.orderNumber === selectedOrderId);
      if (match) {
        setSelectedOrder(match);
      }
    }
  }, [selectedOrderId, orders]);

  const currency = project.config?.currency || 'BRL';

  const statusConfigs: { value: OrderStatus; label: string; icon: string; bgBadge: string }[] = [
    { value: 'NUEVO', label: 'Nuevo', icon: '✨', bgBadge: 'bg-amber-100 text-amber-800 border-amber-300' },
    { value: 'PENDIENTE', label: 'Pendiente', icon: '⏳', bgBadge: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    { value: 'EN_ATENCION', label: 'En Atención', icon: '💬', bgBadge: 'bg-blue-100 text-blue-800 border-blue-300' },
    { value: 'CONFIRMADO', label: 'Confirmado', icon: '✓', bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { value: 'EN_PREPARACION', label: 'En Preparación', icon: '🍳', bgBadge: 'bg-purple-100 text-purple-800 border-purple-300' },
    { value: 'EN_CAMINO', label: 'En Camino', icon: '🚚', bgBadge: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { value: 'ENTREGADO', label: 'Entregado', icon: '📦', bgBadge: 'bg-teal-100 text-teal-800 border-teal-300' },
    { value: 'FINALIZADO', label: 'Finalizado', icon: '🏁', bgBadge: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { value: 'CANCELADO', label: 'Cancelado', icon: '✕', bgBadge: 'bg-rose-100 text-rose-800 border-rose-300' },
  ];

  const handleStatusChange = (orderId: string, newStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(orderId, newStatus);
    }
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
    }
    setTimeout(() => {
      setUpdatingOrderId(null);
    }, 800);
  };

  const getNextRecommendedStatus = (current: OrderStatus): OrderStatus | null => {
    switch (current) {
      case 'NUEVO':
      case 'PENDIENTE':
        return 'EN_ATENCION';
      case 'EN_ATENCION':
      case 'CONFIRMADO':
        return 'EN_PREPARACION';
      case 'EN_PREPARACION':
        return 'EN_CAMINO';
      case 'EN_CAMINO':
        return 'ENTREGADO';
      default:
        return null;
    }
  };

  const getNextStatusLabel = (next: OrderStatus): string => {
    switch (next) {
      case 'EN_ATENCION':
        return 'Atender Pedido';
      case 'EN_PREPARACION':
        return 'Preparar';
      case 'EN_CAMINO':
        return 'Despachar';
      case 'ENTREGADO':
        return 'Marcar Entregado';
      default:
        return 'Avanzar Estado';
    }
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      (order.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.customerPhone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.notes || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      selectedStatus === 'TODOS' || order.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    const conf = statusConfigs.find((c) => c.value === status);
    if (conf) {
      return (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border flex items-center space-x-1 ${conf.bgBadge}`}>
          <span>{conf.icon}</span>
          <span>{conf.label.toUpperCase()}</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 text-xs font-bold border border-slate-200">
        {status}
      </span>
    );
  };

  const statusOptions: OrderStatus[] = [
    'NUEVO',
    'PENDIENTE',
    'EN_ATENCION',
    'CONFIRMADO',
    'EN_PREPARACION',
    'EN_CAMINO',
    'ENTREGADO',
    'FINALIZADO',
    'CANCELADO',
  ];

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'NUEVO' || o.status === 'PENDIENTE' || o.status === 'EN_ATENCION').length;
  const completedCount = orders.filter(o => o.status === 'ENTREGADO' || o.status === 'FINALIZADO' || o.status === 'CONFIRMADO').length;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Banner & Quick KPI */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Gestión de Pedidos & Ventas</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Pedidos de {project.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visualiza los pedidos originados por la IA en WhatsApp o a través del catálogo digital.
          </p>
        </div>

        {/* Mini KPI */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-center min-w-[100px]">
            <span className="text-[11px] font-bold text-slate-500 block">Total Pedidos</span>
            <span className="text-xl font-black text-slate-900">{orders.length}</span>
          </div>
          <div className="bg-amber-50 p-3 rounded-2xl border border-amber-200 text-center min-w-[100px]">
            <span className="text-[11px] font-bold text-amber-700 block">Por Atender</span>
            <span className="text-xl font-black text-amber-900">{pendingCount}</span>
          </div>
          <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-200 text-center min-w-[110px]">
            <span className="text-[11px] font-bold text-emerald-700 block">Facturado</span>
            <span className="text-base font-black text-emerald-900">{formatCurrency(totalRevenue, currency)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por cliente, teléfono, número de pedido o notas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-blue-600 outline-none text-xs text-slate-800 font-medium transition"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none text-xs">
          <button
            onClick={() => setSelectedStatus('TODOS')}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
              selectedStatus === 'TODOS'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos ({orders.length})
          </button>
          {statusOptions.map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                selectedStatus === st
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List / Table */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <div className="w-16 h-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto text-2xl">
            📦
          </div>
          <h3 className="text-lg font-bold text-slate-800">No se encontraron pedidos</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchTerm || selectedStatus !== 'TODOS'
              ? 'No hay pedidos que coincidan con los filtros aplicados.'
              : 'Cuando tus clientes hagan pedidos por el chat de WhatsApp o mediante el catálogo online, aparecerán aquí con todos sus detalles.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const nextStatus = getNextRecommendedStatus(order.status);
            const isBeingUpdated = updatingOrderId === order.id;

            return (
              <div
                key={order.id}
                className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                {/* Order Info Left */}
                <div className="flex items-start space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center text-xl font-black shrink-0">
                    📦
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        {order.customerName || 'Cliente'}
                      </span>
                      {getStatusBadge(order.status)}
                      {order.transferredToHuman && (
                        <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> De IA a Humano
                        </span>
                      )}
                      {order.pendingFields && order.pendingFields.length > 0 && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-300 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> {order.pendingFields.length} dato(s) pendiente(s)
                        </span>
                      )}
                      {isBeingUpdated && (
                        <span className="text-[10px] text-blue-600 font-bold animate-pulse bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          Guardando...
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-slate-400">
                        #{order.orderNumber || order.id.slice(-6).toUpperCase()}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {order.customerPhone || 'Sin teléfono'}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        {order.paymentMethod || 'Efectivo/Pix'}
                      </span>
                    </div>

                    {/* Items summary */}
                    <p className="text-xs text-slate-700 font-medium line-clamp-1 pt-1">
                      {order.items?.map(i => `${i.quantity}x ${i.productName}`).join(', ') || 'Productos del catálogo'}
                    </p>
                  </div>
                </div>

                {/* Order Info Right & Actions */}
                <div className="flex flex-wrap items-center justify-between lg:justify-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                  <div className="text-left lg:text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Pedido</span>
                    <span className="text-lg font-black text-slate-900">
                      {formatCurrency(order.total, currency)}
                    </span>
                  </div>

                  {/* One-click quick advance button if available */}
                  {nextStatus && onUpdateOrderStatus && (
                    <button
                      type="button"
                      onClick={() => handleStatusChange(order.id, nextStatus)}
                      title={`Avanzar pedido a ${nextStatus}`}
                      className="px-3 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                    >
                      <span>⚡</span>
                      <span>{getNextStatusLabel(nextStatus)}</span>
                    </button>
                  )}

                  {/* Status Switcher Dropdown */}
                  {onUpdateOrderStatus && (
                    <div className="relative">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                        className="bg-slate-50 hover:bg-slate-100 text-xs font-bold text-slate-700 px-3 py-2 rounded-xl border border-slate-200 outline-none cursor-pointer pr-8"
                      >
                        {statusConfigs.map((cfg) => (
                          <option key={cfg.value} value={cfg.value}>
                            {cfg.icon} Estado: {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Contact via WhatsApp Button */}
                  {order.customerPhone && (
                    <a
                      href={`https://wa.me/${order.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${order.customerName || ''}, te contactamos de ${project.name} respecto a tu pedido #${order.id.slice(-6).toUpperCase()}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition flex items-center space-x-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {/* Open Modal Detail */}
                  <button
                    onClick={() => setSelectedOrder(order)}
                    className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Ver Detalle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header section */}
            <div className="pb-3 border-b border-slate-200 flex items-start justify-between">
              <div className="space-y-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xl">🛎️</span>
                  <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                    {selectedOrder.status === 'NUEVO' ? 'NUEVO PEDIDO' : 'DETALLE DEL PEDIDO'}
                  </span>
                  {selectedOrder.transferredToHuman && (
                    <span className="text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Bot className="w-3 h-3" /> De IA a Humano
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-black text-slate-900">
                  Pedido #{selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}
                </h3>
                <span className="text-[11px] text-slate-500 font-mono block">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingOrder(!isEditingOrder)}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    isEditingOrder
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingOrder ? 'Ver detalles' : 'Editar / Completar'}</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditingOrder(false);
                    if (onClearSelectedOrderId) onClearSelectedOrderId();
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-black transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Banner: Transfer to Human Attendant */}
            {selectedOrder.transferredToHuman && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-3.5 flex items-start gap-3 text-xs text-indigo-950">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="font-extrabold text-indigo-950 flex items-center gap-2">
                    <span>Pedido entregado por Vendedor IA a Atención Humana</span>
                    {selectedOrder.transferredAt && (
                      <span className="text-[10px] bg-indigo-200/80 text-indigo-900 px-1.5 py-0.5 rounded font-mono font-bold">
                        {new Date(selectedOrder.transferredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-indigo-800 leading-relaxed">
                    Este pedido fue conversado inicialmente con el Vendedor IA y transferido para seguimiento del personal humano. Todos los datos recopilados por la IA se conservan aquí intactos.
                  </p>
                </div>
              </div>
            )}

            {/* Banner: Pending Fields Alert */}
            {selectedOrder.pendingFields && selectedOrder.pendingFields.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 flex items-start justify-between gap-3 text-xs text-amber-950">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-950 block">
                      ⚠️ Datos pendientes por proporcionar o completar ({selectedOrder.pendingFields.length})
                    </span>
                    <span className="text-[11px] text-amber-800 block mt-0.5">
                      Campos pendientes:{' '}
                      <strong>
                        {selectedOrder.pendingFields
                          .map((f) => {
                            if (f === 'customerName') return 'Nombre del cliente';
                            if (f === 'customerPhone') return 'Teléfono/WhatsApp';
                            if (f === 'customerAddress') return 'Dirección de entrega';
                            if (f === 'paymentMethod') return 'Forma de pago';
                            return f;
                          })
                          .join(', ')}
                      </strong>
                    </span>
                  </div>
                </div>
                {!isEditingOrder && (
                  <button
                    type="button"
                    onClick={() => setIsEditingOrder(true)}
                    className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs transition shrink-0 cursor-pointer"
                  >
                    Completar ahora
                  </button>
                )}
              </div>
            )}

            {/* Quick action bar to change status */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                  Acciones del Encargado / Estado:
                </span>
                {updatingOrderId === selectedOrder.id && (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-ping" /> Actualizando...
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {statusConfigs.map((cfg) => {
                  const isCurrent = selectedOrder.status === cfg.value;
                  return (
                    <button
                      key={cfg.value}
                      type="button"
                      onClick={() => handleStatusChange(selectedOrder.id, cfg.value)}
                      className={`px-2 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 border cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-300'
                          : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      <span className="text-xs">{cfg.icon}</span>
                      <span className="truncate text-[11px]">{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* EDIT MODE: Attendant Editor Form */}
            {isEditingOrder ? (
              <div className="rounded-2xl border border-blue-200 bg-blue-50/30 p-4 space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center gap-1.5 font-black text-slate-900 text-sm">
                    <Edit3 className="w-4 h-4 text-blue-600" />
                    <span>Editar / Completar Datos del Pedido</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Guardado directo en el pedido
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Nombre */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      👤 Nombre del Cliente
                    </label>
                    <input
                      type="text"
                      value={editForm.customerName || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, customerName: e.target.value }))}
                      placeholder="Ej: Carlos Silva"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Teléfono */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      📱 WhatsApp / Teléfono
                    </label>
                    <input
                      type="text"
                      value={editForm.customerPhone || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                      placeholder="Ej: +55 11 98765-4321"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Modalidad de entrega */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      🚚 Modalidad de Entrega
                    </label>
                    <select
                      value={editForm.deliveryType || 'delivery'}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, deliveryType: e.target.value as 'delivery' | 'pickup' }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="delivery">Entrega a domicilio</option>
                      <option value="pickup">Retiro en el local</option>
                    </select>
                  </div>

                  {/* Forma de pago */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      💳 Forma de Pago
                    </label>
                    <input
                      type="text"
                      value={editForm.paymentMethod || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      placeholder="Ej: Pix, Tarjeta, Efectivo..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Estado de pago */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      💰 Estado de Pago
                    </label>
                    <select
                      value={editForm.paymentStatus || 'PENDIENTE'}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, paymentStatus: e.target.value as any }))}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600 cursor-pointer"
                    >
                      <option value="PENDIENTE">PENDIENTE</option>
                      <option value="CONFIRMADO">CONFIRMADO</option>
                      <option value="PAGADO">PAGADO</option>
                    </select>
                  </div>

                  {/* Punto de Referencia */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      📌 Punto de Referencia
                    </label>
                    <input
                      type="text"
                      value={editForm.reference || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, reference: e.target.value }))}
                      placeholder="Ej: Frente al supermercado, portón blanco"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Dirección completa de entrega */}
                {editForm.deliveryType !== 'pickup' && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                      📍 Dirección Completa de Entrega (Calle, Número, Barrio, Ciudad)
                    </label>
                    <input
                      type="text"
                      value={editForm.customerAddress || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, customerAddress: e.target.value }))}
                      placeholder="Ej: Av. Paulista 1000, Apto 42, Bela Vista, São Paulo"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                    />
                  </div>
                )}

                {/* Observaciones adicionales */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                    📝 Observaciones Adicionales proporcionadas por el cliente o atendente
                  </label>
                  <textarea
                    rows={2}
                    value={editForm.notes || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Ej: Sin cebolla, tocar timbre dos veces..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-blue-100">
                  <button
                    type="button"
                    onClick={() => setIsEditingOrder(false)}
                    className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 font-bold hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={isSavingEdit}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{isSavingEdit ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
                </div>
              </div>
            ) : (
              /* VIEW MODE: Structured Real Order Card (Todos los datos recopilados organizados) */
              <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden text-xs">
                {/* 1. Cliente */}
                <div className="p-3.5 bg-slate-50/70 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      👤 NOMBRE DEL CLIENTE
                    </span>
                    {selectedOrder.customerName && selectedOrder.customerName !== 'Cliente' ? (
                      <span className="text-sm font-extrabold text-slate-900 block mt-0.5">
                        {selectedOrder.customerName}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                        ⏳ Pendiente de proporcionar por el cliente
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Contacto / WhatsApp */}
                <div className="p-3.5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                      📱 WHATSAPP / TELÉFONO
                    </span>
                    {selectedOrder.customerPhone ? (
                      <span className="font-bold text-slate-800 block mt-0.5 font-mono text-xs">
                        {selectedOrder.customerPhone}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block mt-1">
                        ⏳ Pendiente de proporcionar por el cliente
                      </span>
                    )}
                  </div>
                  {selectedOrder.customerPhone && (
                    <a
                      href={`https://wa.me/${selectedOrder.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(
                        `Hola ${selectedOrder.customerName || 'Cliente'}, te contactamos de ${project.name} respecto a tu pedido #${selectedOrder.orderNumber || selectedOrder.id.slice(-6).toUpperCase()}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1.5 shadow-sm transition"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Abrir WhatsApp</span>
                    </a>
                  )}
                </div>

                {/* 3. Productos Seleccionados */}
                <div className="p-3.5 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    🛍️ PRODUCTOS SELECCIONADOS ({selectedOrder.items?.length || 0})
                  </span>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start text-xs border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                        <div>
                          <div className="font-extrabold text-slate-900">
                            {item.quantity} × {item.productName}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Precio unitario: {formatCurrency(item.unitPrice, currency)}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500">Subtotal: </span>
                          <span className="font-black text-slate-900 font-mono">
                            {formatCurrency(item.totalPrice, currency)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Total del Pedido */}
                <div className="p-3.5 bg-emerald-50/70 flex justify-between items-center">
                  <div>
                    <span className="font-black text-emerald-950 uppercase tracking-wide text-xs block">
                      💰 TOTAL DEL PEDIDO
                    </span>
                    {selectedOrder.subtotal !== undefined && selectedOrder.subtotal !== selectedOrder.total && (
                      <span className="text-[11px] text-emerald-800">
                        Subtotal: {formatCurrency(selectedOrder.subtotal, currency)}
                      </span>
                    )}
                  </div>
                  <span className="text-base font-black text-emerald-700 font-mono">
                    {formatCurrency(selectedOrder.total, currency)}
                  </span>
                </div>

                {/* 5. Forma de Pago Elegida */}
                <div className="p-3.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    💳 FORMA DE PAGO ELEGIDA
                  </span>
                  <div className="flex items-center justify-between mt-0.5">
                    {selectedOrder.paymentMethod ? (
                      <span className="font-extrabold text-slate-900 text-xs">
                        {selectedOrder.paymentMethod}
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        ⏳ Pendiente de confirmar método de pago
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedOrder.paymentStatus === 'PAGADO'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {selectedOrder.paymentStatus || 'PENDIENTE'}
                    </span>
                  </div>
                </div>

                {/* 6. Modalidad y Dirección Completa de Entrega */}
                <div className="p-3.5 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    🚚 {selectedOrder.deliveryType === 'pickup' ? 'MODALIDAD: RETIRO EN EL LOCAL' : 'DIRECCIÓN COMPLETA DE ENTREGA'}
                  </span>
                  {selectedOrder.deliveryType === 'pickup' ? (
                    <p className="font-extrabold text-slate-900 text-xs">
                      🏬 Retiro en el local de la empresa
                    </p>
                  ) : selectedOrder.customerAddress ? (
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs">
                        {selectedOrder.customerAddress}
                      </p>
                      {selectedOrder.neighborhood && (
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Barrio: {selectedOrder.neighborhood} {selectedOrder.city ? `• Ciudad: ${selectedOrder.city}` : ''}
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 inline-block">
                      ⏳ Dirección pendiente de proporcionar por el cliente
                    </span>
                  )}
                </div>

                {/* 7. Punto de Referencia */}
                {selectedOrder.reference && (
                  <div className="p-3.5 bg-amber-50/40">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 block">
                      📌 PUNTO DE REFERENCIA
                    </span>
                    <p className="font-medium text-amber-950 text-xs mt-0.5">
                      {selectedOrder.reference}
                    </p>
                  </div>
                )}

                {/* 8. Observaciones Adicionales proporcionadas por el cliente */}
                <div className="p-3.5 bg-slate-50/40">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                    📝 OBSERVACIONES ADICIONALES PROPORCIONADAS POR EL CLIENTE
                  </span>
                  {selectedOrder.notes ? (
                    <p className="text-slate-800 text-xs mt-1 bg-white p-2 rounded-xl border border-slate-200">
                      {selectedOrder.notes}
                    </p>
                  ) : (
                    <p className="text-slate-400 text-xs mt-0.5 italic">
                      Sin observaciones adicionales registradas.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 flex justify-between items-center">
              <span className="text-[11px] text-slate-400">
                Empresa: {selectedOrder.empresaName || project.name}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingOrder(!isEditingOrder)}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
                >
                  {isEditingOrder ? 'Cancelar edición' : '✏️ Editar datos'}
                </button>
                <button
                  onClick={() => {
                    setSelectedOrder(null);
                    setIsEditingOrder(false);
                    if (onClearSelectedOrderId) onClearSelectedOrderId();
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
                >
                  Cerrar Detalle
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
