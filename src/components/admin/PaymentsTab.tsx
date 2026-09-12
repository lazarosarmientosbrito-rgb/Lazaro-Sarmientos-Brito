import React, { useState } from 'react';
import { BusinessConfig, PaymentMethodSetting } from '../../types';
import { getDefaultPaymentMethods, calculateOrderSummary } from '../../data/defaultConfig';
import { 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  Building, 
  Banknote,
  Percent,
  Tag,
  Truck, 
  Info,
  DollarSign,
  Plus,
  Trash2,
  Calculator,
  Sparkles,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface PaymentsTabProps {
  config: BusinessConfig;
  onChange: (updatedConfig: BusinessConfig) => void;
  onSave: () => void;
  isSaving: boolean;
}

export const PaymentsTab: React.FC<PaymentsTabProps> = ({
  config,
  onChange,
  onSave,
  isSaving,
}) => {
  // Ensure paymentMethodSettings is populated
  const paymentSettings: PaymentMethodSetting[] = React.useMemo(() => {
    if (config.paymentMethodSettings && config.paymentMethodSettings.length > 0) {
      return config.paymentMethodSettings;
    }
    return getDefaultPaymentMethods(config.discountCode, config.pixKey);
  }, [config.paymentMethodSettings, config.discountCode, config.pixKey]);

  // Live order calculator state
  const [simSubtotal, setSimSubtotal] = useState<number>(31.00);
  const [simShipping, setSimShipping] = useState<number>(config.shippingFee ?? 7.00);
  const [selectedSimMethodId, setSelectedSimMethodId] = useState<string>('pix');
  const [customMethodName, setCustomMethodName] = useState<string>('');
  const [isAddingCustom, setIsAddingCustom] = useState<boolean>(false);

  // Helper to update a single payment method setting
  const handleUpdateMethod = (id: string, updates: Partial<PaymentMethodSetting>) => {
    const updated = paymentSettings.map((item) => {
      if (item.id === id) {
        return { ...item, ...updates };
      }
      return item;
    });

    // Also update legacy paymentMethods array for backward compatibility
    const activeNames = updated.filter((p) => p.enabled).map((p) => p.name);

    onChange({
      ...config,
      paymentMethodSettings: updated,
      paymentMethods: activeNames,
    });
  };

  // Helper to add custom payment method
  const handleAddCustomMethod = () => {
    if (!customMethodName.trim()) return;
    const newId = `custom-${Date.now()}`;
    const newMethod: PaymentMethodSetting = {
      id: newId,
      name: customMethodName.trim(),
      enabled: true,
      discountPercentage: 0,
      couponCode: '',
      badge: 'Personalizado',
      instructions: 'Instrucciones de pago para el cliente',
      iconType: 'wallet',
    };

    const updated = [...paymentSettings, newMethod];
    const activeNames = updated.filter((p) => p.enabled).map((p) => p.name);

    onChange({
      ...config,
      paymentMethodSettings: updated,
      paymentMethods: activeNames,
    });

    setCustomMethodName('');
    setIsAddingCustom(false);
  };

  // Helper to delete custom payment method
  const handleDeleteCustomMethod = (id: string) => {
    const updated = paymentSettings.filter((p) => p.id !== id);
    const activeNames = updated.filter((p) => p.enabled).map((p) => p.name);

    onChange({
      ...config,
      paymentMethodSettings: updated,
      paymentMethods: activeNames,
    });
  };

  // Live simulation calculation
  const currentSimMethod = paymentSettings.find((p) => p.id === selectedSimMethodId) || paymentSettings[0];
  const simCalculation = calculateOrderSummary(
    [{ price: simSubtotal, quantity: 1, name: 'Pedido de Prueba' }],
    currentSimMethod,
    simShipping,
    config.freeShippingThreshold ?? 50.00
  );

  const getMethodIcon = (id: string, iconType?: string) => {
    switch (id) {
      case 'pix':
        return <QrCode className="w-5 h-5 text-emerald-400" />;
      case 'tarjeta':
        return <CreditCard className="w-5 h-5 text-blue-400" />;
      case 'efectivo':
        return <Banknote className="w-5 h-5 text-amber-400" />;
      case 'transferencia':
        return <Building className="w-5 h-5 text-indigo-400" />;
      default:
        return <DollarSign className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Banner: Formas de pago y descuentos */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 border border-slate-700/80 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
              <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Configuración Financiera Independiente</span>
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Formas de pago y descuentos
            </h2>
            
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Configura para <strong className="text-white underline">{config.name}</strong> los métodos de pago aceptados, porcentajes de descuento automático y cupones. El asistente de IA aplicará los descuentos automáticamente sobre el subtotal.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-lg shadow-blue-600/30 flex items-center justify-center space-x-2 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <span>Guardando...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Guardar Formas de Pago</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Essential Rule Notice */}
        <div className="mt-5 bg-amber-500/10 border border-amber-400/30 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-amber-200">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-snug">
            <strong className="text-amber-300 font-bold">Regla matemática estricta:</strong> Los descuentos automáticos por forma de pago se calculan <u>únicamente sobre el subtotal de productos o servicios</u>. El costo de envío <strong>nunca recibe descuento</strong> y se suma íntegro al total final.
          </div>
        </div>
      </div>

      {/* Main Grid: Formas de Pago Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Formas de pago configurables */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-slate-900 text-base flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span>Métodos de Pago de esta Empresa ({paymentSettings.filter(p => p.enabled).length} Activos)</span>
            </h3>
            
            <button
              onClick={() => setIsAddingCustom(true)}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-xl border border-blue-200 flex items-center space-x-1.5 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agregar otra forma</span>
            </button>
          </div>

          {/* Form to add custom payment method */}
          {isAddingCustom && (
            <div className="bg-blue-50/70 border-2 border-dashed border-blue-300 rounded-2xl p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-blue-900 uppercase">Nueva Forma de Pago</span>
                <button
                  onClick={() => setIsAddingCustom(false)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  Cancelar
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customMethodName}
                  onChange={(e) => setCustomMethodName(e.target.value)}
                  placeholder="Ej. Boleto bancário, Vale Refeição, Mercado Pago..."
                  className="flex-1 p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleAddCustomMethod}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs"
                >
                  Guardar
                </button>
              </div>
            </div>
          )}

          {/* List of configured payment methods */}
          <div className="space-y-3.5">
            {paymentSettings.map((method) => {
              const isEnabled = method.enabled !== false;
              const isDefaultPrimary = ['pix', 'tarjeta', 'efectivo', 'transferencia'].includes(method.id);

              return (
                <div
                  key={method.id}
                  className={`rounded-2xl border-2 transition-all p-4 sm:p-5 ${
                    isEnabled
                      ? 'bg-white border-slate-300/80 shadow-sm'
                      : 'bg-slate-50/80 border-slate-200 opacity-60'
                  }`}
                >
                  {/* Top Bar: Switch + Name + Discount Badge */}
                  <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black ${
                        isEnabled ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-200 text-slate-400'
                      }`}>
                        {getMethodIcon(method.id, method.iconType)}
                      </div>

                      <div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={method.name}
                            onChange={(e) => handleUpdateMethod(method.id, { name: e.target.value })}
                            className="font-extrabold text-slate-900 text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white px-1 py-0.5 rounded outline-none"
                          />
                          {method.discountPercentage > 0 && (
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md">
                              {method.discountPercentage}% OFF
                            </span>
                          )}
                          {method.discountPercentage === 0 && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                              0% Descuento
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Enable / Disable Switch */}
                    <div className="flex items-center space-x-3 shrink-0">
                      <label className="flex items-center cursor-pointer space-x-2">
                        <span className="text-xs font-bold text-slate-600 hidden sm:inline">
                          {isEnabled ? 'Activo' : 'Inactivo'}
                        </span>
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={(e) => handleUpdateMethod(method.id, { enabled: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 relative"></div>
                      </label>

                      {!isDefaultPrimary && (
                        <button
                          onClick={() => handleDeleteCustomMethod(method.id)}
                          className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition"
                          title="Eliminar forma de pago"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Settings Form Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-3">
                    {/* Discount Percentage */}
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center space-x-1">
                        <Percent className="w-3 h-3 text-emerald-600" />
                        <span>Descuento en %</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={method.discountPercentage}
                          onChange={(e) => handleUpdateMethod(method.id, { discountPercentage: Math.max(0, Math.min(100, Number(e.target.value))) })}
                          className="w-full pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                          placeholder="0"
                        />
                        <span className="absolute right-3 top-2 text-xs font-black text-slate-400">%</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {method.discountPercentage > 0
                          ? `Aplica ${method.discountPercentage}% al subtotal de productos`
                          : 'Sin descuento al seleccionar'}
                      </p>
                    </div>

                    {/* Optional Coupon Code */}
                    <div className="sm:col-span-7">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-blue-600" />
                        <span>Código / Cupón opcional</span>
                      </label>
                      <input
                        type="text"
                        value={method.couponCode || ''}
                        onChange={(e) => handleUpdateMethod(method.id, { couponCode: e.target.value.toUpperCase() })}
                        placeholder={method.id === 'pix' ? 'Ej. DULCE10' : 'Opcional (Ej. PROMO5)'}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold uppercase text-blue-700 focus:bg-white focus:border-blue-500 outline-none"
                      />
                      <p className="text-[10px] text-slate-400 mt-1">
                        Código de referencia que la IA puede mencionar al cliente.
                      </p>
                    </div>

                    {/* Method Instructions / Details */}
                    <div className="sm:col-span-12">
                      <label className="block text-[11px] font-bold text-slate-500 mb-1 uppercase tracking-wider">
                        {method.id === 'pix' ? 'Chave PIX / Instrucciones' : 'Instrucciones o información de pago'}
                      </label>
                      <input
                        type="text"
                        value={method.instructions || ''}
                        onChange={(e) => {
                          handleUpdateMethod(method.id, { instructions: e.target.value });
                          if (method.id === 'pix') {
                            onChange({ ...config, pixKey: e.target.value });
                          }
                        }}
                        placeholder={
                          method.id === 'pix' 
                            ? 'Ej. Chave PIX: empresa@pix.com.br / 11988776655' 
                            : method.id === 'transferencia'
                            ? 'Ej. Banco do Brasil - Ag: 1234 C/C: 56789-0'
                            : 'Ej. Aceptamos todas las tarjetas en hasta 12x'
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Shipping & Threshold Configuration Card */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <Truck className="w-5 h-5 text-indigo-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">Costo de Envío y Política de Despacho</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Costo de Envío Base (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={config.shippingFee ?? 7.00}
                  onChange={(e) => onChange({ ...config, shippingFee: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                  placeholder="7.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">Costo estándar de flete/motoboy agregado al pedido.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Envío Gratis a partir de (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={config.freeShippingThreshold ?? 50.00}
                  onChange={(e) => onChange({ ...config, freeShippingThreshold: Number(e.target.value) })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                  placeholder="50.00"
                />
                <p className="text-[10px] text-slate-400 mt-1">Si el subtotal supera este monto, el flete es R$ 0,00.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Interactive Order Calculator & Example Breakdown */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl space-y-5 sticky top-24">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-extrabold text-white text-sm">Simulador de Pedido en Vivo</h4>
                  <p className="text-[10px] text-slate-400">Prueba cómo calcula Vendedor IA</p>
                </div>
              </div>

              <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                100% Automático
              </span>
            </div>

            {/* Test Inputs */}
            <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/60">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Subtotal Productos</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={simSubtotal}
                    onChange={(e) => setSimSubtotal(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-white focus:border-blue-400 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 mb-1 uppercase">Costo de Envío</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={simShipping}
                    onChange={(e) => setSimShipping(Math.max(0, Number(e.target.value)))}
                    className="w-full pl-8 pr-2 py-1.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-white focus:border-blue-400 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Selector Chips */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-300 uppercase tracking-wider mb-2">
                Selecciona la forma de pago para ver el cálculo:
              </label>
              
              <div className="grid grid-cols-2 gap-2">
                {paymentSettings.map((method) => {
                  const isSelected = selectedSimMethodId === method.id;
                  const isEnabled = method.enabled !== false;

                  return (
                    <button
                      key={method.id}
                      onClick={() => setSelectedSimMethodId(method.id)}
                      disabled={!isEnabled}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        isSelected
                          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30'
                          : isEnabled
                          ? 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800 hover:text-white'
                          : 'bg-slate-950/40 border-slate-800 text-slate-600 cursor-not-allowed opacity-40'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-xs truncate max-w-[100px]">{method.name}</span>
                        {method.discountPercentage > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.2 rounded ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-400'
                          }`}>
                            {method.discountPercentage}% OFF
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] opacity-80 truncate">
                        {method.discountPercentage > 0
                          ? `Descuento -R$ ${(simSubtotal * (method.discountPercentage / 100)).toFixed(2).replace('.', ',')}`
                          : 'Sin descuento adicional'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Exact Breakdown Display */}
            <div className="bg-slate-950/90 rounded-2xl p-4 border border-slate-800 space-y-2.5 font-mono text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Subtotal de productos:</span>
                <span className="font-bold text-slate-200">R$ {simCalculation.subtotal.toFixed(2).replace('.', ',')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1">
                  <span>Forma de pago:</span>
                  <strong className="text-white">[{currentSimMethod?.name || 'PIX'}]</strong>
                </span>
                <span className="font-bold text-blue-400">{simCalculation.discountPercentage}% desc.</span>
              </div>

              <div className="flex items-center justify-between text-emerald-400">
                <span>Valor descontado:</span>
                <span className="font-bold">
                  {simCalculation.discount > 0 ? `- R$ ${simCalculation.discount.toFixed(2).replace('.', ',')}` : 'R$ 0,00'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-2">
                <span>Subtotal con descuento:</span>
                <span className="font-bold text-white">R$ {simCalculation.subtotalWithDiscount.toFixed(2).replace('.', ',')}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Costo de envío:</span>
                <span className="font-bold text-slate-200">
                  {simCalculation.shippingFee === 0 ? 'GRATIS (R$ 0,00)' : `R$ ${simCalculation.shippingFee.toFixed(2).replace('.', ',')}`}
                </span>
              </div>

              <div className="border-t-2 border-slate-700/80 pt-3 mt-2 flex items-center justify-between">
                <span className="font-sans font-black text-sm text-white">TOTAL FINAL A PAGAR:</span>
                <span className="font-sans font-black text-lg text-emerald-400">
                  R$ {simCalculation.total.toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>

            {/* WhatsApp AI Quote Preview Box */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-3.5 text-xs text-emerald-200 space-y-1.5">
              <div className="flex items-center space-x-1.5 font-bold text-emerald-300">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Mensaje que el bot entregará al cliente:</span>
              </div>
              <p className="italic text-[11px] leading-relaxed text-emerald-100 bg-emerald-900/30 p-2.5 rounded-xl border border-emerald-500/20">
                "¡Excelente elección! 🍬 Tu pedido tiene un subtotal de <strong>R$ {simCalculation.subtotal.toFixed(2).replace('.', ',')}</strong>. Con tu pago en <strong>{currentSimMethod?.name} ({simCalculation.discountPercentage}% de descuento)</strong> ahorras <strong>R$ {simCalculation.discount.toFixed(2).replace('.', ',')}</strong>, quedando en <strong>R$ {simCalculation.subtotalWithDiscount.toFixed(2).replace('.', ',')}</strong> + envío de <strong>R$ {simCalculation.shippingFee.toFixed(2).replace('.', ',')}</strong>. El <strong>TOTAL A PAGAR</strong> es <strong>R$ {simCalculation.total.toFixed(2).replace('.', ',')}</strong>."
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
