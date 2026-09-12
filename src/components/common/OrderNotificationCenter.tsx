import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, ExternalLink, CheckCheck, ShoppingBag, MapPin, Phone, CreditCard } from 'lucide-react';
import { CompanyOrderNotification, CustomerOrder } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface OrderNotificationCenterProps {
  empresaId?: number;
  empresaName?: string;
  currency?: string;
  onOpenOrder: (orderId: string) => void;
  onNewOrderReceived?: (order: CustomerOrder) => void;
}

// Play clean gentle chime using Web Audio API (safe, offline-capable, no missing MP3s)
function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Note 1 (E5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Note 2 (B5)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.12);
    gain2.gain.setValueAtTime(0.25, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.55);
  } catch (err) {
    // AudioContext blocked before first user gesture; silently ignore
  }
}

export const OrderNotificationCenter: React.FC<OrderNotificationCenterProps> = ({
  empresaId,
  empresaName,
  currency = 'BRL',
  onOpenOrder,
  onNewOrderReceived,
}) => {
  const [notifications, setNotifications] = useState<CompanyOrderNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [floatingAlert, setFloatingAlert] = useState<CompanyOrderNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const activeEmpId = empresaId || 1;

  // Fetch initial notifications and setup polling + SSE
  useEffect(() => {
    let isMounted = true;

    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/api/notifications?empresaId=${activeEmpId}`, {
          headers: { 'x-empresa-id': String(activeEmpId) },
        });
        if (res.ok) {
          const data = await res.json();
          if (isMounted && Array.isArray(data.notifications)) {
            setNotifications(data.notifications);
            data.notifications.forEach((n: CompanyOrderNotification) => seenIdsRef.current.add(n.id));
          }
        }
      } catch (e) {
        // network silent catch
      }
    };

    fetchNotifications();

    // 1. Polling interval every 4.5s for infallible update
    const interval = setInterval(fetchNotifications, 4500);

    // 2. Real-time SSE Stream
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`/api/orders/stream`);
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'NEW_ORDER' && data.notification) {
            const notif: CompanyOrderNotification = data.notification;
            // Check company isolation
            if (notif.empresaId === activeEmpId) {
              setNotifications((prev) => {
                if (prev.some((p) => p.id === notif.id)) return prev;
                return [notif, ...prev];
              });

              if (!seenIdsRef.current.has(notif.id)) {
                seenIdsRef.current.add(notif.id);
                // Trigger audible and visual notification
                playNotificationChime();
                setFloatingAlert(notif);
                // Inform parent about new order
                if (data.order && onNewOrderReceived) {
                  onNewOrderReceived(data.order);
                }
              }
            }
          }
        } catch (err) {
          // SSE JSON parse ignore
        }
      };
    } catch (e) {
      console.warn('SSE not supported, fallback to polling');
    }

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (eventSource) eventSource.close();
    };
  }, [activeEmpId]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'x-empresa-id': String(activeEmpId) },
      });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch(`/api/notifications/clear?empresaId=${activeEmpId}`, {
        method: 'POST',
        headers: { 'x-empresa-id': String(activeEmpId) },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      // ignore
    }
  };

  const handleOpenNotificationOrder = (notif: CompanyOrderNotification) => {
    handleMarkAsRead(notif.id);
    setIsOpen(false);
    setFloatingAlert(null);
    onOpenOrder(notif.orderId);
  };

  return (
    <>
      {/* Floating High-Visibility Real-time Order Alert Banner */}
      {floatingAlert && (
        <div className="fixed top-4 right-4 z-[9999] max-w-md w-full animate-bounce-short shadow-2xl">
          <div className="bg-slate-900 text-white rounded-3xl border-2 border-emerald-500 p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
            {/* Top glowing accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 animate-pulse" />

            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <span className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/40 flex items-center justify-center text-xl shrink-0 animate-pulse">
                  🔔
                </span>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                      NUEVO PEDIDO
                    </span>
                    <span className="text-xs font-black text-emerald-300">
                      Pedido #{floatingAlert.orderNumber || floatingAlert.orderId.slice(-6).toUpperCase()}
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-white mt-0.5">
                    {floatingAlert.customerName && floatingAlert.customerName !== 'Cliente (Nombre pendiente)' ? (
                      <span>👤 {floatingAlert.customerName}</span>
                    ) : (
                      <span className="text-amber-300 font-semibold italic text-xs">👤 Nombre pendiente de proporcionar</span>
                    )}
                  </h4>
                  {floatingAlert.customerPhone ? (
                    <span className="text-[11px] text-emerald-300 font-mono block">
                      📱 {floatingAlert.customerPhone}
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-400/90 font-medium block">
                      📱 WhatsApp/Teléfono pendiente
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setFloatingAlert(null)}
                className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Cerrar aviso"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content summary */}
            <div className="mt-3 bg-slate-950/70 rounded-2xl p-3 border border-slate-800 space-y-2 text-xs text-slate-300">
              {/* Total & Payment */}
              <div className="flex justify-between items-center font-bold text-slate-100 border-b border-slate-800/80 pb-1.5">
                <span>Total del pedido:</span>
                <span className="text-emerald-400 font-mono text-sm font-black">
                  {formatCurrency(floatingAlert.total, currency)}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-400">Forma de pago:</span>
                <span className="font-semibold text-slate-200">
                  {floatingAlert.paymentMethod && floatingAlert.paymentMethod !== 'Pendiente' ? (
                    floatingAlert.paymentMethod
                  ) : (
                    <span className="text-amber-400 font-normal">Pendiente de confirmar</span>
                  )}
                </span>
              </div>

              {/* Items Detail */}
              {floatingAlert.itemsSummary && (
                <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-bold block mb-0.5">🛍️ Productos seleccionados:</span>
                  <p className="text-slate-200 font-medium line-clamp-3 whitespace-pre-line">
                    {floatingAlert.itemsSummary}
                  </p>
                </div>
              )}

              {/* Delivery Address */}
              <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-left">
                  <span className="text-slate-400 font-bold block">Entrega:</span>
                  {floatingAlert.deliveryType === 'pickup' ? (
                    <span className="text-emerald-300 font-semibold">Retiro en el local</span>
                  ) : floatingAlert.deliveryAddress ? (
                    <span className="text-slate-200 font-medium">{floatingAlert.deliveryAddress}</span>
                  ) : (
                    <span className="text-amber-400 font-normal italic">Dirección pendiente de proporcionar</span>
                  )}
                  {floatingAlert.reference && (
                    <span className="block text-[10px] text-amber-300 font-normal mt-0.5">
                      Ref: {floatingAlert.reference}
                    </span>
                  )}
                </div>
              </div>

              {/* Observaciones adicionales */}
              {floatingAlert.notes && (
                <div className="pt-1 border-t border-slate-800/80 text-[11px] text-slate-300">
                  <span className="text-slate-400 font-bold">📝 Observaciones: </span>
                  <span className="text-slate-200 italic">{floatingAlert.notes}</span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-3.5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenNotificationOrder(floatingAlert)}
                className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black text-xs rounded-xl shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>VER PEDIDO</span>
              </button>
              <button
                type="button"
                onClick={() => setFloatingAlert(null)}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header Notification Bell Icon with Counter Badge */}
      <div className="relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2 sm:px-3 sm:py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
            unreadCount > 0
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 hover:bg-amber-500/20 ring-2 ring-amber-400/30'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
          title="Notificaciones de nuevos pedidos"
          aria-label={`Notificaciones (${unreadCount} nuevos)`}
        >
          <Bell className={`w-4 h-4 ${unreadCount > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-300'}`} />
          <span className="hidden sm:inline">Pedidos</span>

          {/* Badge */}
          {unreadCount > 0 && (
            <span className="ml-0.5 bg-amber-500 text-slate-950 font-black text-[10px] px-1.5 py-0.2 rounded-full min-w-[18px] text-center shadow">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 z-[999] overflow-hidden animate-fade-in text-slate-900">
            {/* Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">🔔</span>
                <div>
                  <h4 className="font-black text-xs text-white">Notificaciones de Pedidos</h4>
                  <span className="text-[10px] text-slate-400">
                    {empresaName || `Empresa #${activeEmpId}`}
                  </span>
                </div>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 transition"
                >
                  <CheckCheck className="w-3 h-3" />
                  <span>Marcar leídas</span>
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-1">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto text-xl">
                    📦
                  </div>
                  <p className="text-xs font-semibold">No hay notificaciones de pedidos todavía</p>
                  <p className="text-[10px] text-slate-400">
                    Los nuevos pedidos realizados por clientes aparecerán aquí en tiempo real.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleOpenNotificationOrder(notif)}
                    className={`p-3 rounded-2xl transition cursor-pointer flex flex-col gap-1.5 hover:bg-slate-50 relative ${
                      !notif.read ? 'bg-amber-50/60 border border-amber-200/80 shadow-xs' : ''
                    }`}
                  >
                    {!notif.read && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-500 ring-4 ring-amber-100" />
                    )}

                    <div className="flex items-center justify-between pr-4">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-xs font-black text-slate-900">
                          #{notif.orderNumber || notif.orderId.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-1.5 py-0.2 rounded">
                          NUEVO
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="flex items-start justify-between">
                        <span className="font-bold text-slate-900">
                          {notif.customerName && notif.customerName !== 'Cliente (Nombre pendiente)' ? (
                            <span>👤 {notif.customerName}</span>
                          ) : (
                            <span className="text-amber-700 italic font-semibold">👤 Nombre pendiente</span>
                          )}
                        </span>
                        <span className="font-black text-emerald-700 text-xs font-mono">
                          {formatCurrency(notif.total, currency)}
                        </span>
                      </div>

                      {notif.customerPhone ? (
                        <p className="text-[11px] text-slate-600 font-mono">
                          📱 {notif.customerPhone}
                        </p>
                      ) : (
                        <p className="text-[10px] text-amber-600 italic">
                          📱 WhatsApp/Teléfono pendiente
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] pt-0.5">
                        <span className="text-slate-500">
                          Pago: <strong className="text-slate-800">{notif.paymentMethod || 'Pendiente'}</strong>
                        </span>
                        <span className="text-slate-500 text-[10px]">
                          {notif.deliveryType === 'pickup' ? 'Retiro' : 'Entrega'}
                        </span>
                      </div>

                      {notif.itemsSummary && (
                        <p className="text-[11px] text-slate-700 line-clamp-2 bg-slate-50 p-1 rounded border border-slate-100">
                          <span className="font-bold text-slate-900">🛍️ </span>{notif.itemsSummary}
                        </p>
                      )}

                      {notif.deliveryAddress ? (
                        <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{notif.deliveryType === 'pickup' ? 'Retiro en el local' : notif.deliveryAddress}</span>
                        </p>
                      ) : notif.deliveryType !== 'pickup' && (
                        <p className="text-[10px] text-amber-600 italic flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Dirección pendiente</span>
                        </p>
                      )}

                      {notif.notes && (
                        <p className="text-[10px] text-slate-600 italic line-clamp-1 bg-amber-50/70 p-1 rounded border border-amber-100">
                          📝 {notif.notes}
                        </p>
                      )}
                    </div>

                    <div className="pt-1 flex items-center justify-between text-[11px]">
                      <span className="text-emerald-700 font-bold flex items-center gap-1 hover:underline">
                        <span>[VER PEDIDO COMPLETO]</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(notif.id, e)}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          Marcar visto
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
