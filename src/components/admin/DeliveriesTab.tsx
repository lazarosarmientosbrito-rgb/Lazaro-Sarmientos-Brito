import React, { useState } from 'react';
import { 
  Truck, 
  MapPin, 
  DollarSign, 
  Plus, 
  Trash2, 
  Clock, 
  Store, 
  CheckCircle2, 
  Save 
} from 'lucide-react';
import { BusinessProject, DeliveryConfig, DeliveryZone } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DeliveriesTabProps {
  project: BusinessProject;
  onUpdateDeliveryConfig: (config: DeliveryConfig) => void;
}

export const DeliveriesTab: React.FC<DeliveriesTabProps> = ({
  project,
  onUpdateDeliveryConfig,
}) => {
  const currency = project.config?.currency || 'BRL';
  const existingConfig = project.config?.deliveryConfig || {
    allowPickup: true,
    allowDelivery: true,
    deliveryFee: project.config?.shippingFee || 10,
    freeDeliveryThreshold: project.config?.freeShippingThreshold || 100,
    estimatedDeliveryMin: 45,
    zones: [
      { id: 'zone-1', name: 'Zona Centro / Cercanías', fee: 5, deliveryTimeEstimate: '30-45 min' },
      { id: 'zone-2', name: 'Zona Norte / Sur', fee: 12, deliveryTimeEstimate: '45-60 min' },
    ],
  };

  const [config, setConfig] = useState<DeliveryConfig>(existingConfig);
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneFee, setNewZoneFee] = useState<number | string>(8);
  const [newZoneTime, setNewZoneTime] = useState('30-50 min');

  const handleTogglePickup = () => {
    setConfig({ ...config, allowPickup: !config.allowPickup });
  };

  const handleToggleDelivery = () => {
    setConfig({ ...config, allowDelivery: !config.allowDelivery });
  };

  const handleAddZone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    const newZone: DeliveryZone = {
      id: 'zone-' + Date.now(),
      name: newZoneName,
      fee: Number(newZoneFee) || 0,
      deliveryTimeEstimate: newZoneTime || '30-60 min',
    };

    setConfig({
      ...config,
      zones: [...(config.zones || []), newZone],
    });
    setNewZoneName('');
    setNewZoneFee(8);
  };

  const handleDeleteZone = (id: string) => {
    setConfig({
      ...config,
      zones: (config.zones || []).filter((z) => z.id !== id),
    });
  };

  const handleSave = () => {
    onUpdateDeliveryConfig(config);
    alert('¡Configuración de entregas guardada correctamente para esta empresa!');
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
            <Truck className="w-4 h-4" />
            <span>Configuración de Envíos & Retiro</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Entregas & Delivery — {project.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Define los métodos de entrega, costos y zonas de cobertura. La IA usará estos valores para responder a los clientes.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/25 transition flex items-center space-x-2 shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>Guardar Configuración</span>
        </button>
      </div>

      {/* Main Delivery Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Retiro en Tienda */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Retiro en Local / Tienda</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                El cliente puede pasar a retirar su pedido personalmente en:
              </p>
              <p className="text-xs font-semibold text-slate-700 mt-1 bg-slate-50 p-2 rounded-xl border border-slate-200">
                📍 {project.config?.address || 'Dirección de la empresa'}
              </p>
            </div>
          </div>
          <button
            onClick={handleTogglePickup}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
              config.allowPickup
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {config.allowPickup ? '✓ Activado' : 'Desactivado'}
          </button>
        </div>

        {/* Entrega a Domicilio */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex items-start justify-between">
          <div className="flex items-start space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-extrabold text-sm text-slate-900">Entrega a Domicilio (Delivery)</h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Envío por moto o repartidor propio de la empresa hasta el domicilio del cliente.
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs font-semibold text-slate-700">
                <span>Tarifa Base: <strong>{formatCurrency(config.deliveryFee, currency)}</strong></span>
                <span>•</span>
                <span>Gratis desde: <strong>{formatCurrency(config.freeDeliveryThreshold || 0, currency)}</strong></span>
              </div>
            </div>
          </div>
          <button
            onClick={handleToggleDelivery}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs transition shrink-0 ${
              config.allowDelivery
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-200 text-slate-600'
            }`}
          >
            {config.allowDelivery ? '✓ Activado' : 'Desactivado'}
          </button>
        </div>
      </div>

      {/* General Delivery Settings */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <h3 className="font-extrabold text-slate-900 text-base">Tarifas y Tiempos de Entrega</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="font-bold text-slate-700 block mb-1">Costo de Entrega Base</label>
            <div className="relative">
              <input
                type="number"
                value={config.deliveryFee}
                onChange={(e) => setConfig({ ...config, deliveryFee: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                {currency}
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Envío Gratis desde:</label>
            <div className="relative">
              <input
                type="number"
                value={config.freeDeliveryThreshold || 0}
                onChange={(e) => setConfig({ ...config, freeDeliveryThreshold: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                {currency}
              </span>
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Tiempo Estimado Promedio</label>
            <div className="relative">
              <input
                type="number"
                value={config.estimatedDeliveryMin || 45}
                onChange={(e) => setConfig({ ...config, estimatedDeliveryMin: Number(e.target.value) })}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-900"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 font-bold">
                minutos
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Zones */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-900 text-base">Zonas y Barrios de Cobertura</h3>
            <p className="text-xs text-slate-500">Tarifas especiales según la ubicación del cliente</p>
          </div>
        </div>

        {/* Add Zone Form */}
        <form onSubmit={handleAddZone} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="sm:col-span-2">
            <label className="font-bold text-slate-700 block mb-1">Nombre de la Zona / Barrio</label>
            <input
              type="text"
              required
              placeholder="Ej: Zona Sur, Barrio Industrial..."
              value={newZoneName}
              onChange={(e) => setNewZoneName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
            />
          </div>
          <div>
            <label className="font-bold text-slate-700 block mb-1">Tarifa ({currency})</label>
            <input
              type="number"
              value={newZoneFee}
              onChange={(e) => setNewZoneFee(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 outline-none"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition flex items-center justify-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Añadir Zona</span>
            </button>
          </div>
        </form>

        {/* Zones List */}
        <div className="space-y-2">
          {(config.zones || []).map((zone) => (
            <div
              key={zone.id}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200 text-xs shadow-sm"
            >
              <div className="flex items-center space-x-3">
                <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="font-bold text-slate-900">{zone.name}</span>
                  <span className="text-slate-500 block text-[11px]">
                    Tiempo estimado: {zone.deliveryTimeEstimate || '30-45 min'}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <span className="font-black text-slate-900 text-sm">
                  {formatCurrency(zone.fee, currency)}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteZone(zone.id)}
                  className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 flex items-center justify-center transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
