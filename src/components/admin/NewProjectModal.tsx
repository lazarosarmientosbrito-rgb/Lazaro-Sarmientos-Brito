import React, { useState, useEffect, useRef } from 'react';
import { X, Sparkles, Store, Building, Phone, MapPin, DollarSign, Bot, Check, Clock, Globe, Loader2, AlertTriangle, Upload, Image as ImageIcon, Trash2, RefreshCw, Smartphone } from 'lucide-react';
import { BusinessProject, BusinessConfig, ServiceType, SalesTone, CurrencyCode } from '../../types';
import { compressImageToDataUrl } from '../../utils/imageOptimizer';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: BusinessProject) => Promise<boolean | void> | void;
  onUpdateProject?: (project: BusinessProject) => Promise<boolean | void> | void;
  initialProject?: BusinessProject | null;
}

export const BUSINESS_CATEGORIES = [
  { id: 'Barbería', label: '💈 Barbería', icon: '💈', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'venda_agendamento' as ServiceType },
  { id: 'Dulcería', label: '🍬 Dulcería / Postres', icon: '🍬', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'venda' as ServiceType },
  { id: 'Cafetería', label: '☕ Cafetería / Bistró', icon: '☕', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'venda' as ServiceType },
  { id: 'Carnicería', label: '🥩 Carnicería / Churrasco', icon: '🥩', defaultTone: 'direct' as SalesTone, defaultServiceType: 'venda' as ServiceType },
  { id: 'Restaurante', label: '🍽️ Restaurante / Gastronomía', icon: '🍽️', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'venda' as ServiceType },
  { id: 'Tienda de ropa', label: '👗 Tienda de ropa / Moda', icon: '👗', defaultTone: 'enthusiastic' as SalesTone, defaultServiceType: 'venda' as ServiceType },
  { id: 'Salón de belleza', label: '💇‍♀️ Salón de belleza', icon: '💇‍♀️', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'agendamento' as ServiceType },
  { id: 'Uñas', label: '💅 Uñas / Manicura & Spa', icon: '💅', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'agendamento' as ServiceType },
  { id: 'Peluquería', label: '✂️ Peluquería', icon: '✂️', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'agendamento' as ServiceType },
  { id: 'Otro', label: '✨ Otro negocio', icon: '✨', defaultTone: 'friendly' as SalesTone, defaultServiceType: 'venda_agendamento' as ServiceType },
];

export const COUNTRIES = [
  { code: 'BR', name: 'Brasil', defaultCurrency: 'BRL' as CurrencyCode, defaultPhone: '+55 11 9' },
  { code: 'MX', name: 'México', defaultCurrency: 'MXN' as CurrencyCode, defaultPhone: '+52 55 ' },
  { code: 'CO', name: 'Colombia', defaultCurrency: 'COP' as CurrencyCode, defaultPhone: '+57 300 ' },
  { code: 'AR', name: 'Argentina', defaultCurrency: 'ARS' as CurrencyCode, defaultPhone: '+54 9 11 ' },
  { code: 'CL', name: 'Chile', defaultCurrency: 'CLP' as CurrencyCode, defaultPhone: '+56 9 ' },
  { code: 'PE', name: 'Perú', defaultCurrency: 'PEN' as CurrencyCode, defaultPhone: '+51 9' },
  { code: 'ES', name: 'España', defaultCurrency: 'EUR' as CurrencyCode, defaultPhone: '+34 6' },
  { code: 'US', name: 'Estados Unidos', defaultCurrency: 'USD' as CurrencyCode, defaultPhone: '+1 ' },
  { code: 'OTHER', name: 'Otro País', defaultCurrency: 'USD' as CurrencyCode, defaultPhone: '+' },
];

export const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'BRL', label: 'Real Brasileño (R$)', symbol: 'R$' },
  { code: 'USD', label: 'Dólar Estadounidense ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'MXN', label: 'Peso Mexicano ($)', symbol: '$' },
  { code: 'COP', label: 'Peso Colombiano ($)', symbol: '$' },
  { code: 'ARS', label: 'Peso Argentino ($)', symbol: '$' },
  { code: 'CLP', label: 'Peso Chileno ($)', symbol: '$' },
  { code: 'PEN', label: 'Sol Peruano (S/)', symbol: 'S/' },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onUpdateProject,
  initialProject,
}) => {
  const isEditing = Boolean(initialProject);

  const [name, setName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Barbería');
  const [customCategory, setCustomCategory] = useState('');
  const [country, setCountry] = useState('Brasil');
  const [currency, setCurrency] = useState<CurrencyCode>('BRL');
  const [description, setDescription] = useState('');
  const [tagline, setTagline] = useState('');
  const [city, setCity] = useState('São Paulo');
  const [state, setState] = useState('SP');
  const [address, setAddress] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('+55 11 9');
  const [ownerWhatsapp, setOwnerWhatsapp] = useState('');
  const [businessHours, setBusinessHours] = useState('Segunda a Sábado: 09:00 às 20:00');
  const [serviceType, setServiceType] = useState<ServiceType>('venda_agendamento');
  const [tone, setTone] = useState<SalesTone>('friendly');
  const [botName, setBotName] = useState('Asistente Virtual');
  const [pixKey, setPixKey] = useState('');
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'PIX',
    'Cartão de crédito',
    'Cartão de débito',
    'Dinheiro / Pagamento na entrega',
  ]);
  const [deliveryInfo, setDeliveryInfo] = useState('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Populate form if in edit mode
  useEffect(() => {
    if (initialProject) {
      setName(initialProject.name || '');
      setLogoUrl(initialProject.logoUrl || initialProject.config?.logoUrl || '');
      const cat = initialProject.category || initialProject.businessType || 'Barbería';
      const exists = BUSINESS_CATEGORIES.some((c) => c.id === cat);
      if (exists) {
        setSelectedCategory(cat);
      } else {
        setSelectedCategory('Otro');
        setCustomCategory(cat);
      }
      setCountry(initialProject.config?.country || 'Brasil');
      setCurrency(initialProject.config?.currency || 'BRL');
      setDescription(initialProject.description || initialProject.config?.description || '');
      setTagline(initialProject.config?.tagline || '');
      setCity(initialProject.config?.city || 'São Paulo');
      setState(initialProject.config?.state || 'SP');
      setAddress(initialProject.config?.address || '');
      setPhoneWhatsapp(initialProject.config?.phoneWhatsapp || '+55 11 9');
      setOwnerWhatsapp(initialProject.ownerWhatsapp || initialProject.config?.ownerWhatsapp || '');
      setBusinessHours(initialProject.config?.businessHours || 'Segunda a Sábado: 09:00 às 20:00');
      setServiceType(initialProject.config?.serviceType || 'venda_agendamento');
      setTone(initialProject.config?.tone || 'friendly');
      setBotName(initialProject.config?.botName || 'Asistente Virtual');
      setPixKey(initialProject.config?.pixKey || '');
      if (initialProject.config?.paymentMethods && initialProject.config.paymentMethods.length > 0) {
        setPaymentMethods(initialProject.config.paymentMethods);
      }
      setDeliveryInfo(initialProject.config?.shippingPolicy || '');
    } else {
      // Reset defaults for creation
      setName('');
      setLogoUrl('');
      setSelectedCategory('Barbería');
      setCustomCategory('');
      setCountry('Brasil');
      setCurrency('BRL');
      setDescription('');
      setTagline('');
      setCity('São Paulo');
      setState('SP');
      setAddress('');
      setPhoneWhatsapp('+55 11 9');
      setOwnerWhatsapp('');
      setBusinessHours('Segunda a Sábado: 09:00 às 20:00');
      setServiceType('venda_agendamento');
      setTone('friendly');
      setBotName('Asistente Virtual');
      setPixKey('');
      setPaymentMethods([
        'PIX',
        'Cartão de crédito',
        'Cartão de débito',
        'Dinheiro / Pagamento na entrega',
      ]);
      setDeliveryInfo('');
    }
  }, [initialProject, isOpen]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const optimized = await compressImageToDataUrl(file, 400, 0.8);
      if (optimized) {
        setLogoUrl(optimized);
      }
    } catch (err) {
      console.error('Error al procesar logo:', err);
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteLogo = () => {
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  const handleTogglePaymentMethod = (method: string) => {
    if (paymentMethods.includes(method)) {
      setPaymentMethods(paymentMethods.filter((m) => m !== method));
    } else {
      setPaymentMethods([...paymentMethods, method]);
    }
  };

  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    const found = BUSINESS_CATEGORIES.find((c) => c.id === catId);
    if (found) {
      setServiceType(found.defaultServiceType);
      setTone(found.defaultTone);
      if (!name && !isEditing) {
        if (catId === 'Dulcería') setName('Dulcería ');
        else if (catId === 'Barbería') setName('Barbería ');
        else if (catId === 'Cafetería') setName('Café ');
        else if (catId === 'Carnicería') setName('Carnicería ');
        else if (catId === 'Restaurante') setName('Restaurante ');
        else if (catId === 'Tienda de ropa') setName('Boutique ');
        else if (catId === 'Salón de belleza') setName('Salón ');
        else if (catId === 'Uñas') setName('Studio Uñas ');
        else if (catId === 'Peluquería') setName('Peluquería ');
      }
      if (!isEditing) {
        setBotName(`Asistente ${found.label.split(' ')[1] || 'Virtual'}`);
      }
    }
  };

  const handleCountryChange = (cName: string) => {
    setCountry(cName);
    const cObj = COUNTRIES.find((c) => c.name === cName);
    if (cObj && !isEditing) {
      setCurrency(cObj.defaultCurrency);
      if (phoneWhatsapp === '+55 11 9' || !phoneWhatsapp) {
        setPhoneWhatsapp(cObj.defaultPhone);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    setSubmitError('');

    try {
      const projectId = isEditing && initialProject ? initialProject.id : `proj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const finalCategory = selectedCategory === 'Otro' && customCategory ? customCategory : selectedCategory;
      const catObj = BUSINESS_CATEGORIES.find((c) => c.id === selectedCategory);
      const emojiPrefix = catObj ? catObj.icon + ' ' : '🏢 ';
      const formattedName = name.startsWith(emojiPrefix) ? name : `${emojiPrefix}${name.trim()}`;

      const newConfig: BusinessConfig = {
        ...(initialProject?.config || {}),
        id: projectId,
        name: formattedName,
        logoUrl: logoUrl || '',
        description: description || `Negocio de ${finalCategory} con atención y ventas automatizadas por WhatsApp e IA.`,
        tagline: tagline || `Calidad, atención personalizada y el mejor servicio en ${finalCategory}`,
        industry: `${finalCategory}`,
        category: finalCategory,
        country: country || 'Brasil',
        city: city || 'São Paulo',
        state: state || 'SP',
        address: address || 'Dirección principal del negocio',
        phoneWhatsapp: phoneWhatsapp || '+55 11 99999-8888',
        ownerWhatsapp: ownerWhatsapp.trim(),
        instagram: initialProject?.config?.instagram || `@${name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        website: initialProject?.config?.website || `https://${name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
        businessHours: businessHours || 'Segunda a Sábado: 08:00 às 20:00',
        currency: currency,
        serviceType: serviceType,
        automationMode: initialProject?.config?.automationMode || 'automatico',
        tone: tone,
        botName: botName || 'Asistente de Ventas',
        greetingMessage: initialProject?.config?.greetingMessage || `¡Hola! 👋 Te damos la bienvenida a ${formattedName}. ¿Cómo podemos ayudarte hoy?`,
        salesObjective: initialProject?.config?.salesObjective || `Atender con amabilidad, responder dudas, asesorar y cerrar ventas para ${formattedName}.`,
        customPrompt: initialProject?.config?.customPrompt || `Atiende en un tono ${tone} y profesional. Responde dudas con precisión usando únicamente los datos de esta empresa.`,
        discountCode: initialProject?.config?.discountCode || 'PROMO10',
        discountPercentage: initialProject?.config?.discountPercentage ?? 10,
        shippingPolicy: deliveryInfo || initialProject?.config?.shippingPolicy || 'Entregas locales el mismo día y envíos garantizados.',
        exchangePolicy: initialProject?.config?.exchangePolicy || 'Garantía total de satisfacción en todos nuestros productos.',
        cancellationPolicy: initialProject?.config?.cancellationPolicy || 'Cancelaciones o cambios coordinados con anticipación.',
        importantNotes: initialProject?.config?.importantNotes || 'Atención personalizada vía WhatsApp.',
        paymentMethods: paymentMethods.length > 0 ? paymentMethods : ['PIX', 'Cartão de crédito'],
        pixKey: pixKey || phoneWhatsapp,
        autoCollectLead: initialProject?.config?.autoCollectLead ?? true,
      };

      if (isEditing && initialProject && onUpdateProject) {
        const updatedProject: BusinessProject = {
          ...initialProject,
          name: formattedName,
          businessType: finalCategory,
          category: finalCategory,
          description: newConfig.description,
          logoUrl: logoUrl || '',
          ownerWhatsapp: ownerWhatsapp.trim(),
          updatedAt: new Date().toISOString(),
          config: newConfig,
        };
        await onUpdateProject(updatedProject);
      } else {
        const newProject: BusinessProject = {
          id: projectId,
          name: formattedName,
          businessType: finalCategory,
          category: finalCategory,
          description: newConfig.description,
          logoUrl: logoUrl || '',
          ownerWhatsapp: ownerWhatsapp.trim(),
          ownerAccessRevoked: false,
          ownerAccessToken: `token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          status: 'ativo',
          config: newConfig,
          catalog: [],
          services: [],
          professionals: [],
          workingHours: {
            intervalMin: 30,
            workingDays: [
              { dayOfWeek: 'segunda', dayLabel: 'Segunda-feira', active: true, startTime: '08:00', endTime: '19:00' },
              { dayOfWeek: 'terca', dayLabel: 'Terça-feira', active: true, startTime: '08:00', endTime: '19:00' },
              { dayOfWeek: 'quarta', dayLabel: 'Quarta-feira', active: true, startTime: '08:00', endTime: '19:00' },
              { dayOfWeek: 'quinta', dayLabel: 'Quinta-feira', active: true, startTime: '08:00', endTime: '19:00' },
              { dayOfWeek: 'sexta', dayLabel: 'Sexta-feira', active: true, startTime: '08:00', endTime: '19:00' },
              { dayOfWeek: 'sabado', dayLabel: 'Sábado', active: true, startTime: '08:00', endTime: '18:00' },
              { dayOfWeek: 'domingo', dayLabel: 'Domingo', active: false, startTime: '09:00', endTime: '14:00' },
            ],
            blockedSlots: [],
          },
          appointments: [],
          faqs: [
            {
              id: `faq-${Date.now()}-1`,
              category: 'Horarios y Atención',
              question: '¿Cuál es el horario de atención?',
              answer: `Atendemos de ${businessHours}. Puedes consultar o hacer pedidos aquí las 24 horas.`,
            },
            {
              id: `faq-${Date.now()}-2`,
              category: 'Pagos',
              question: '¿Qué formas de pago aceptan?',
              answer: `Aceptamos: ${paymentMethods.join(', ')}. Moneda oficial: ${currency}. ${pixKey ? `Chave PIX: ${pixKey}` : ''}`,
            },
          ],
          aiKnowledge: [
            {
              id: `kn-${Date.now()}-1`,
              title: 'Regla de Atención y Envíos',
              category: 'entrega',
              content: deliveryInfo || `Horario de atención y entregas coordinado directamente por WhatsApp.`,
              createdAt: new Date().toISOString(),
            }
          ],
          unansweredQuestions: [],
          leads: [],
        };
        const result = await onCreateProject(newProject);
        if (result === false) {
          return;
        }
      }

      onClose();
    } catch (err: any) {
      console.error('[NewProjectModal] Error al crear/actualizar empresa:', err);
      setSubmitError(err?.message || 'Error al guardar la empresa en Supabase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-xl shadow-inner">
              🏢
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                {isEditing ? 'Editar Empresa / Negocio' : 'Crear Nueva Empresa / Negocio'}
              </h2>
              <p className="text-xs text-blue-200">
                {isEditing 
                  ? 'Modifica los datos principales de esta empresa. Todos los cambios se guardan en Firebase.'
                  : 'Cada empresa tiene sus propios productos, servicios, precios, clientes, horarios e IA aislados.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800 text-sm">
          {/* Step 1: Category Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span>1. Tipo o Categoría de Empresa</span>
              <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {BUSINESS_CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`p-3 rounded-2xl text-left border text-xs font-bold transition flex items-center space-x-2 ${
                    selectedCategory === cat.id
                      ? 'bg-blue-50 border-blue-600 text-blue-950 ring-2 ring-blue-600/20 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="text-base shrink-0">{cat.icon}</span>
                  <span className="truncate">{cat.label.replace(/^[^\s]+\s/, '')}</span>
                </button>
              ))}
            </div>

            {selectedCategory === 'Otro' && (
              <div className="mt-3">
                <input
                  type="text"
                  placeholder="Especifica el tipo de negocio (ej: Gimnasio, Veterinaria, Inmobiliaria)..."
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-xs"
                />
              </div>
            )}
          </div>

          {/* Step 2: Basic Business Info */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Datos del Negocio & Ubicación
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Nombre del Negocio / Empresa *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 💈 Barbería Los Reyes, 🍬 Dulcería La Rosa, ☕ Café Aroma..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none font-bold text-slate-900 text-sm"
              />
            </div>

            {/* Logo de la empresa */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition-all">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-blue-600" />
                  <span>Logo de la empresa</span>
                </label>
                <span className="text-[10px] text-slate-400 font-medium">JPG, PNG o WebP</span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
                Sube el logo oficial de la empresa desde la galería o archivos. Quedará vinculado exclusivamente a esta empresa y guardado permanentemente en la nube.
              </p>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Preview Thumbnail */}
                <div className="relative w-20 h-20 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden shrink-0 shadow-inner group">
                  {logoUrl ? (
                    <>
                      <img
                        src={logoUrl}
                        alt="Logo de la empresa"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-1.5 bg-white/95 text-slate-800 rounded-full hover:bg-white shadow transition transform active:scale-95"
                          title="Cambiar logo"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="text-center p-2">
                      <Store className="w-7 h-7 text-slate-400 mx-auto mb-0.5" />
                      <span className="text-[9px] text-slate-400 font-bold block">Sin logo</span>
                    </div>
                  )}
                </div>

                {/* Upload / Replace / Delete buttons */}
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="company-logo-input"
                  />

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                      className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition inline-flex items-center space-x-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {isUploadingLogo ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Procesando...</span>
                        </>
                      ) : logoUrl ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Cambiar / Reemplazar logo</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5" />
                          <span>Subir logo desde galería</span>
                        </>
                      )}
                    </button>

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="px-3 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition inline-flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                        title="Eliminar logo actual"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Eliminar logo</span>
                      </button>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-500 block">
                    {logoUrl
                      ? '✓ Logo listo para guardarse con la empresa.'
                      : 'Puedes subir una foto desde tu celular o computadora.'}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>País *</span>
                </label>
                <select
                  value={country}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-bold bg-white"
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.name}>
                      {c.name} ({c.defaultCurrency})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  <span>Moneda Principal *</span>
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-bold bg-white"
                >
                  {CURRENCIES.map((cur) => (
                    <option key={cur.code} value={cur.code}>
                      {cur.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Slogan o Frase Destacada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calidad y excelencia en cada detalle"
                  value={tagline}
                  onChange={(e) => setTagline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span>WhatsApp del Negocio *</span>
                  </span>
                  <span className="text-[10px] text-blue-600 font-medium">Bot / Clientes</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="+55 11 98877-6655"
                  value={phoneWhatsapp}
                  onChange={(e) => setPhoneWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-600" />
                    <span>WhatsApp del Dueño</span>
                  </span>
                  <span className="text-[10px] text-indigo-600 font-medium">Acceso Privado</span>
                </label>
                <input
                  type="text"
                  placeholder="+55 11 99988-7766"
                  value={ownerWhatsapp}
                  onChange={(e) => setOwnerWhatsapp(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-indigo-200 bg-indigo-50/30 focus:border-indigo-600 outline-none text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Descripción del Negocio y lo que ofrece
              </label>
              <textarea
                rows={2}
                placeholder="Describe qué productos, servicios o especialidades ofrece este negocio..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>Dirección</span>
                </label>
                <input
                  type="text"
                  placeholder="Calle, Número, Barrio..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Ciudad / Estado
                </label>
                <input
                  type="text"
                  placeholder="São Paulo - SP"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Horario de Atención</span>
              </label>
              <input
                type="text"
                placeholder="Segunda a Sábado: 09:00 às 20:00 | Domingo: 10:00 às 16:00"
                value={businessHours}
                onChange={(e) => setBusinessHours(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-medium"
              />
            </div>
          </div>

          {/* Step 3: Service Type & Operations */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Modalidad de Operación
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setServiceType('venda')}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  serviceType === 'venda'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>🛍️ Solo Venta de Productos</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Dulcerías, Carnicerías, Tiendas (sin reserva de citas).
                </p>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('agendamento')}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  serviceType === 'agendamento'
                    ? 'bg-blue-50 border-blue-500 text-blue-950 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>✂️ Solo Agendamiento de Citas</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Peluquerías, Salones de belleza, Consultorios, Uñas.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setServiceType('venda_agendamento')}
                className={`p-3.5 rounded-2xl border text-left transition ${
                  serviceType === 'venda_agendamento'
                    ? 'bg-purple-50 border-purple-500 text-purple-950 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span>🛍️+✂️ Ambos (Productos + Citas)</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Barberías con productos, Spas con venta de cosméticos.
                </p>
              </button>
            </div>
          </div>

          {/* Step 4: Payments & Delivery */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              4. Pagos y Envíos
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Métodos de Pago Aceptados
              </label>
              <div className="flex flex-wrap gap-2">
                {[
                  'PIX',
                  'Cartão de crédito',
                  'Cartão de débito',
                  'Dinheiro / Pagamento na entrega',
                  'Mercado Pago',
                  'Transferência bancária',
                  'Boleto bancário',
                ].map((pm) => {
                  const active = paymentMethods.includes(pm);
                  return (
                    <button
                      type="button"
                      key={pm}
                      onClick={() => handleTogglePaymentMethod(pm)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border ${
                        active
                          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {active && <Check className="w-3 h-3" />}
                      <span>{pm}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chave PIX del Negocio (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej: contacto@empresa.com o CNPJ"
                  value={pixKey}
                  onChange={(e) => setPixKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Política de Entrega / Cobertura
                </label>
                <input
                  type="text"
                  placeholder="ej: Entregas locales en 45 min. Envíos gratis +$50"
                  value={deliveryInfo}
                  onChange={(e) => setDeliveryInfo(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs"
                />
              </div>
            </div>
          </div>

          {/* Step 5: AI Personality */}
          <div className="space-y-4 pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-blue-600" />
              <span>5. Personalidad de la IA Vendedora</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Nombre del Asistente Virtual
                </label>
                <input
                  type="text"
                  placeholder="ej: Lucas - Asistente Barbería"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Tono de Comunicación
                </label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as SalesTone)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-blue-600 outline-none text-xs font-semibold bg-white"
                >
                  <option value="friendly">😊 Amable y Caluroso (Barberías, Dulcerías, Cafés, Salones)</option>
                  <option value="professional">💼 Profesional y Formal (Clínicas, Consultorios, Negocios B2B)</option>
                  <option value="direct">⚡ Directo y Veloz (Carnicerías, Ferreterías, Repuestos)</option>
                  <option value="persuasive">🎯 Persuasivo y Comercial (Tiendas de Moda, Joyería)</option>
                  <option value="enthusiastic">🎉 Entusiasta y Enérgico (Deportes, Eventos, Fiestas)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error notice if Supabase rejection happens */}
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl flex items-center space-x-2 text-rose-700 text-xs font-bold animate-shake">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="px-6 py-3 rounded-2xl text-xs font-black text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Guardando en Supabase...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>{isEditing ? 'Guardar Cambios de la Empresa' : 'Crear Empresa y Comenzar'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
