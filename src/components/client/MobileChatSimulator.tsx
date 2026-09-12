import React, { useState, useRef, useEffect } from 'react';
import { 
  BusinessConfig, 
  CatalogItem, 
  ServiceItem, 
  ChatMessage, 
  LeadIntentLevel, 
  CapturedLead,
  UnansweredQuestion,
  CartItem,
  CustomerOrder
} from '../../types';
import { formatBRL } from '../../utils/formatters';
import { 
  Send, 
  Smartphone, 
  Bot, 
  User, 
  ShoppingBag, 
  CheckCircle2, 
  MessageSquare, 
  Sparkles, 
  X, 
  PhoneCall, 
  Calendar, 
  Clock, 
  Check, 
  ShieldCheck,
  Scissors,
  Scale,
  Mic,
  MicOff,
  UserCheck,
  Volume2,
  Play,
  Square,
  PackageCheck,
  Headphones,
  ShoppingCart,
  AlertCircle,
  Trash2,
  Plus,
  Minus
} from 'lucide-react';

export interface ConversationalCheckoutState {
  step:
    | 'waiting_payment_method'
    | 'waiting_name'
    | 'waiting_phone'
    | 'waiting_address'
    | 'waiting_number'
    | 'waiting_reference'
    | 'waiting_notes'
    | 'waiting_confirmation'
    | 'waiting_correction_field'
    | 'completed';
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  total: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddress?: string;
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  reference?: string;
  deliveryType?: 'delivery' | 'pickup';
  notes?: string;
}

interface MobileChatSimulatorProps {
  config: BusinessConfig;
  catalog: CatalogItem[];
  services: ServiceItem[];
  isOpen: boolean;
  onClose: () => void;
  onCaptureLead?: (lead: CapturedLead) => void;
  onAddUnansweredQuestion?: (q: UnansweredQuestion) => void;
  projectId?: string;
  empresaId?: number;
  aiKnowledge?: any[];
  faqs?: any[];
  appointments?: any[];
  professionals?: any[];
  workingHours?: any;
  orders?: any[];
  cart?: CartItem[];
  onUpdateCart?: (cart: CartItem[]) => void;
  onAddAppointment?: (appt: any) => void;
  onAddOrder?: (order: any) => void;
}

export const MobileChatSimulator: React.FC<MobileChatSimulatorProps> = ({
  config,
  catalog = [],
  services = [],
  isOpen,
  onClose,
  onCaptureLead,
  onAddUnansweredQuestion,
  projectId,
  empresaId,
  aiKnowledge = [],
  faqs = [],
  appointments = [],
  professionals = [],
  workingHours,
  orders = [],
  cart = [],
  onUpdateCart,
  onAddAppointment,
  onAddOrder,
}) => {
  const getInitialWelcome = () => ({
    id: 'm-welcome',
    sender: 'bot' as const,
    text: config.greetingMessage || `¡Hola! 👋 Te damos la bienvenida a ${config.name}. Soy ${config.botName || 'el Asistente Comercial'}. ¿En qué podemos ayudarte hoy?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    suggestedQuickReplies: [
      services.length > 0 ? '📅 Agendar cita / servicio' : (catalog.length > 0 ? '🛍️ Ver catálogo de productos' : undefined),
      catalog.length > 0 && services.length > 0 ? '🛍️ Ver catálogo de productos' : undefined,
      '💳 Formas de pago y descuentos',
      '📍 Dirección y horario',
    ].filter(Boolean) as string[],
  });

  const [messages, setMessages] = useState<ChatMessage[]>([getInitialWelcome()]);
  const [simulatedCart, setSimulatedCart] = useState<CartItem[]>(cart || []);

  useEffect(() => {
    if (cart) setSimulatedCart(cart);
  }, [cart]);

  const applyCartUpdates = (updates?: { action: string; items?: CartItem[] } | null) => {
    if (!updates) return;
    if (updates.action === 'clear') {
      setSimulatedCart([]);
      if (onUpdateCart) onUpdateCart([]);
    } else if (Array.isArray(updates.items)) {
      setSimulatedCart(updates.items);
      if (onUpdateCart) onUpdateCart(updates.items);
    }
  };

  const handleAddToCart = (prod: CatalogItem) => {
    const existingIdx = simulatedCart.findIndex((c) => c.productId === prod.id);
    let updated: CartItem[];
    if (existingIdx >= 0) {
      updated = simulatedCart.map((c, i) => 
        i === existingIdx ? { ...c, quantity: c.quantity + 1, subtotal: (c.quantity + 1) * prod.price } : c
      );
    } else {
      updated = [...simulatedCart, {
        productId: prod.id,
        name: prod.name,
        unitPrice: prod.price,
        quantity: 1,
        subtotal: prod.price,
        saleType: (prod.saleType as any) || 'unit',
      }];
    }
    setSimulatedCart(updated);
    if (onUpdateCart) onUpdateCart(updated);
    handleSendMessage(`Quiero agregar 1 ${prod.name} al carrito`);
  };

  // Conversational Checkout State Machine definition
  const [conversationalOrder, setConversationalOrder] = useState<ConversationalCheckoutState | null>(null);
  const conversationalOrderRef = useRef<ConversationalCheckoutState | null>(null);
  conversationalOrderRef.current = conversationalOrder;

  // Stepper quantity management per product card (starts at 0 as per direct purchase flow)
  const [cardQuantities, setCardQuantities] = useState<Record<string, number>>({});
  const [buyWarning, setBuyWarning] = useState<string | null>(null);

  const getCardQty = (id: string) => cardQuantities[id] || 0;

  const updateCardQty = (id: string, delta: number, maxStock = 99) => {
    setCardQuantities((prev) => {
      const current = prev[id] || 0;
      const next = Math.max(0, Math.min(maxStock, current + delta));
      return { ...prev, [id]: next };
    });
  };

  // Helper to get company's enabled payment methods (multi-tenant safe)
  const getCompanyPaymentMethods = () => {
    const configured = (config.paymentMethodSettings || [])
      .filter((p) => p.enabled !== false)
      .map((p) => p.name.trim());
    return configured.length > 0
      ? configured
      : ['Pix', 'Tarjeta', 'Efectivo', 'Transferencia'];
  };

  // Starts the mandatory conversational checkout flow
  const startConversationalCheckoutFromItems = (
    selectedItems: Array<{ product: CatalogItem; quantity: number }>
  ) => {
    if (selectedItems.length === 0) {
      setBuyWarning('Selecciona al menos un producto para continuar.');
      setTimeout(() => setBuyWarning(null), 3500);
      return;
    }

    setBuyWarning(null);

    const total = selectedItems.reduce(
      (sum, item) => sum + item.quantity * item.product.price,
      0
    );

    const lines = selectedItems
      .map((item) => {
        const itemSubtotal = item.quantity * item.product.price;
        return `• ${item.quantity} × ${item.product.name} — ${formatBRL(itemSubtotal)}`;
      })
      .join('\n');

    const paymentOptions = getCompanyPaymentMethods();

    const summaryText = `🛍️ Tu pedido:\n\n${lines}\n\n💰 Total: ${formatBRL(total)}\n\n¿Cómo quieres pagar?`;

    const nextOrderState: ConversationalCheckoutState = {
      step: 'waiting_payment_method',
      items: selectedItems.map((it) => ({
        productId: it.product.id,
        productName: it.product.name,
        quantity: it.quantity,
        unitPrice: it.product.price,
        totalPrice: it.quantity * it.product.price,
      })),
      subtotal: total,
      total,
      deliveryType: 'delivery',
    };

    setConversationalOrder(nextOrderState);
    conversationalOrderRef.current = nextOrderState;

    setActiveTabMobile('chat');

    const botMessage: ChatMessage = {
      id: `msg-chk-${Date.now()}`,
      sender: 'bot',
      text: summaryText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedQuickReplies: paymentOptions,
    };

    setMessages((prev) => [...prev, botMessage]);
  };

  // Direct purchase trigger from Catalog or Product Cards: starts conversational data collection
  const handleExecuteDirectBuy = (productsPool?: CatalogItem[]) => {
    const pool = productsPool && productsPool.length > 0 ? productsPool : catalog;
    const selectedItems = pool
      .map((prod) => ({
        product: prod,
        quantity: cardQuantities[prod.id] || 0,
      }))
      .filter((item) => item.quantity > 0);

    if (selectedItems.length === 0) {
      if (simulatedCart.length > 0) {
        const fromCart = simulatedCart
          .map((c) => {
            const prod = catalog.find((p) => p.id === c.productId) || {
              id: c.productId,
              name: c.name,
              price: c.unitPrice,
              category: 'Geral',
              description: '',
              inStock: true,
              imageUrl: '',
            };
            return { product: prod as CatalogItem, quantity: c.quantity };
          })
          .filter((it) => it.quantity > 0);
        if (fromCart.length > 0) {
          startConversationalCheckoutFromItems(fromCart);
          return;
        }
      }

      setBuyWarning('Selecciona al menos un producto para continuar.');
      setTimeout(() => setBuyWarning(null), 3500);
      return;
    }

    startConversationalCheckoutFromItems(selectedItems);
  };

  // Reset chat when business changes
  useEffect(() => {
    setMessages([getInitialWelcome()]);
    setConversationalOrder(null);
    conversationalOrderRef.current = null;
  }, [config.id, config.name, projectId, empresaId]);

  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTabMobile, setActiveTabMobile] = useState<'chat' | 'catalog' | 'services'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Audio voice message state
  const [isAudioDrawerOpen, setIsAudioDrawerOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsAudioDrawerOpen(true);
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result as string;
          handleSendAudioMessage(base64String, "Mensaje de voz de WhatsApp", `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds || 5}`);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingAudio(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.warn("No se pudo acceder al micrófono:", err);
      setIsAudioDrawerOpen(true);
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const cancelVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
      if (timerRef.current) clearInterval(timerRef.current);
      audioChunksRef.current = [];
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isTyping]);

  const handleSendAudioMessage = async (audioDataUrl?: string, userTextHint?: string, durationStr = '0:05') => {
    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `m-usr-aud-${Date.now()}`,
      sender: 'user',
      text: userTextHint || '🎤 Mensaje de voz de WhatsApp',
      timestamp: userMsgTime,
      isAudio: true,
      audioDuration: durationStr,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setIsAudioDrawerOpen(false);

    try {
      const response = await fetch('/api/sales-chat/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audioDataUrl,
          audioMimeType: 'audio/webm',
          userTextHint,
          history: [...messages, userMsg],
          cart: simulatedCart,
          projectId: projectId || config.id,
          empresaId: empresaId,
          empresa_id: empresaId,
          customConfig: config,
          catalog,
          services,
          professionals,
          aiKnowledge,
          faqs,
          workingHours,
          appointments,
        }),
      });

      const data = await response.json();

      // Apply initial quantities if detected by AI
      if (data.initialQuantities && typeof data.initialQuantities === 'object') {
        setCardQuantities((prev) => ({
          ...prev,
          ...data.initialQuantities,
        }));
      }

      // Apply cart updates from AI response
      if (data.cartUpdates) {
        applyCartUpdates(data.cartUpdates);
      }

      if (data.orderClosed) {
        setSimulatedCart([]);
        if (onUpdateCart) onUpdateCart([]);
      }

      const recProds = (data.recommendedProductIds || [])
        .map((id: string) => (catalog || []).find((p) => p.id === id))
        .filter(Boolean) as CatalogItem[];

      const recServs = (data.recommendedServiceIds || [])
        .map((id: string) => (services || []).find((s) => s.id === id))
        .filter(Boolean) as ServiceItem[];

      const botMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsg: ChatMessage = {
        id: `m-bot-${Date.now()}`,
        sender: 'bot',
        text: data.replyText || `¡Hola! Recibí tu audio. ¿En qué te podemos ayudar?`,
        timestamp: botMsgTime,
        recommendedProducts: recProds.length > 0 ? recProds : undefined,
        recommendedServices: recServs.length > 0 ? recServs : undefined,
        bookingDetails: data.bookingData,
        intent: data.detectedIntent,
        needsHumanAttention: data.needsHumanAttention,
        orderSummaryData: data.orderData,
        suggestedQuickReplies: data.suggestedQuickReplies || [
          'Ver productos disponibles',
          'Formas de pago',
          '👤 Falar com atendente humano',
        ],
      };

      setMessages((prev) => [...prev, botMsg]);

      if (data.orderData && onAddOrder) {
        onAddOrder({
          id: `ord-${Date.now()}`,
          customerName: data.leadInfo?.name || 'Cliente Simulador (Voz)',
          customerPhone: data.leadInfo?.phone || '+55 11 98877-6655',
          items: data.orderData.items || [],
          subtotal: data.orderData.subtotal || 0,
          discountPercentage: data.orderData.discountPercentage || 0,
          discount: data.orderData.discountAmount || 0,
          total: data.orderData.total || data.orderData.subtotal || 0,
          paymentMethod: data.orderData.paymentMethod || 'PIX',
          status: 'CONFIRMADO',
          createdAt: new Date().toISOString(),
        });
      }

      if (data.leadInfo && onCaptureLead && (data.leadInfo.name || data.leadInfo.phone)) {
        onCaptureLead({
          id: `lead-sim-${Date.now()}`,
          customerName: data.leadInfo.name || 'Cliente Simulador (Voz)',
          phone: data.leadInfo.phone || '+55 11 98877-6655',
          email: data.leadInfo.email || '',
          interestedProduct: recProds[0]?.name || '',
          interestedService: recServs[0]?.name || '',
          needSummary: (data.needsHumanAttention ? '⚠️ [SOLICITUD DE ATENCIÓN HUMANA] ' : '') + (data.transcription ? `Transcripción: "${data.transcription}"` : (data.leadInfo.summaryOfNeed || 'Mensaje de voz')),
          intentLevel: data.detectedIntent || 'ALTA',
          type: 'AMBOS',
          status: data.needsHumanAttention ? 'CALIFICADO' : 'NUEVO',
          createdAt: new Date().toISOString(),
          lastMessage: userTextHint || '🎤 Audio enviado',
          messages: [...messages, userMsg, botMsg],
          source: 'SIMULADOR_WHATSAPP',
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `m-bot-err-${Date.now()}`,
          sender: 'bot',
          text: `¡Hola! Recibí tu nota de voz. Tenemos productos en catálogo y atención personalizada. ¿Deseas hacer un pedido o consultar opciones?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    const userMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const userMsg: ChatMessage = {
      id: `m-usr-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: userMsgTime,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsTyping(true);

    // =========================================================================
    // CONVERSATIONAL CHECKOUT STATE MACHINE (PASO A PASO)
    // =========================================================================
    const activeOrder = conversationalOrderRef.current;
    if (activeOrder && activeOrder.step !== 'completed') {
      const paymentOptions = getCompanyPaymentMethods();
      const trimmedText = text.trim();
      const lower = trimmedText.toLowerCase();

      // Check if customer wants to speak with human attendant during conversational checkout
      const isHumanRequest = /\b(atendente|humano|persona|humana|hablar con alguien|falar com atendente|falar com humano)\b/i.test(trimmedText);
      if (isHumanRequest && activeOrder && activeOrder.items.length > 0) {
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        const orderNumber = `#PED-${randomNum}`;
        const currentEmpresaId = empresaId || 1;
        const lines = activeOrder.items
          .map((it) => `• ${it.quantity} × ${it.productName} — ${formatBRL(it.totalPrice)}`)
          .join('\n');

        const pendingFields: Array<'customerName' | 'customerPhone' | 'customerAddress' | 'paymentMethod'> = [];
        if (!activeOrder.customerName || activeOrder.customerName === 'Cliente') pendingFields.push('customerName');
        if (!activeOrder.customerPhone) pendingFields.push('customerPhone');
        if (!activeOrder.customerAddress && activeOrder.deliveryType !== 'pickup') pendingFields.push('customerAddress');
        if (!activeOrder.paymentMethod) pendingFields.push('paymentMethod');

        const transferredOrder: CustomerOrder = {
          id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          orderNumber,
          empresaId: currentEmpresaId,
          empresaName: config.name || 'Empresa',
          customerName: activeOrder.customerName && activeOrder.customerName !== 'Cliente' ? activeOrder.customerName.trim() : '',
          customerPhone: activeOrder.customerPhone ? activeOrder.customerPhone.trim() : '',
          customerAddress: activeOrder.deliveryType === 'pickup' ? 'Retiro en el local' : (activeOrder.customerAddress || ''),
          deliveryType: activeOrder.deliveryType || 'delivery',
          reference: activeOrder.reference || '',
          items: activeOrder.items.map((i) => ({
            productId: i.productId,
            productName: i.productName,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            totalPrice: i.totalPrice,
          })),
          subtotal: activeOrder.subtotal,
          total: activeOrder.total,
          paymentMethod: activeOrder.paymentMethod || '',
          paymentStatus: 'PENDIENTE',
          status: 'EN_ATENCION',
          createdAt: new Date().toISOString(),
          notes: activeOrder.notes ? `${activeOrder.notes} (Transferido a atención humana)` : 'Pedido transferido por la IA a atención humana',
          transferredToHuman: true,
          transferredAt: new Date().toISOString(),
          pendingFields,
        };

        if (onAddOrder) onAddOrder(transferredOrder);
        fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-empresa-id': String(currentEmpresaId),
          },
          body: JSON.stringify(transferredOrder),
        }).catch((err) => console.warn('Order transfer post error:', err));

        setCardQuantities({});
        setSimulatedCart([]);
        if (onUpdateCart) onUpdateCart([]);
        setConversationalOrder(null);
        conversationalOrderRef.current = null;

        const phoneDigits = (config.phoneWhatsapp || '5511999999999').replace(/\D/g, '');
        const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
          `Hola ${config.name}, solicito atención humana para mi pedido ${orderNumber}:\n${lines}\nTotal: ${formatBRL(activeOrder.total)}`
        )}`;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: `Entendido 😊 He guardado todos los datos de tu pedido (${orderNumber}) y lo transferí de inmediato a nuestro equipo de atención humana. Un asesor de ${config.name} se pondrá en contacto contigo enseguida para continuar.`,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              needsHumanAttention: true,
              humanAttentionReason: `Transferencia solicitada con pedido ${orderNumber} (${formatBRL(activeOrder.total)})`,
              whatsappRedirectUrl: waUrl,
              suggestedQuickReplies: ['Continuar por WhatsApp', 'Ver catálogo'],
            },
          ]);
        }, 350);
        return;
      }

      // Helper function to build and show final confirmation summary
      const sendFinalConfirmation = (state: ConversationalCheckoutState, refPoint?: string, notesPoint?: string) => {
        const lines = state.items
          .map((it) => `• ${it.quantity} × ${it.productName} — ${formatBRL(it.totalPrice)}`)
          .join('\n');
        const totalFormatted = formatBRL(state.total);
        const addressText = state.deliveryType === 'pickup'
          ? 'Retiro en el local'
          : (state.customerAddress || '⏳ Pendiente');
        const referenceText = (refPoint !== undefined ? refPoint : (state.reference || '')).trim();
        const finalNotes = (notesPoint !== undefined ? notesPoint : (state.notes || '')).trim();

        const summaryText = `Perfecto, ${state.customerName || 'Cliente'} 😊 Revisa tu pedido:\n\n🛍️ PRODUCTOS:\n${lines}\n\n💰 TOTAL: ${totalFormatted}\n\n💳 FORMA DE PAGO:\n${state.paymentMethod || '⏳ Pendiente'}\n\n👤 CLIENTE:\n${state.customerName || '⏳ Pendiente de proporcionar'}\n\n📱 TELÉFONO / WHATSAPP:\n${state.customerPhone || '⏳ Pendiente de proporcionar'}\n\n📍 DIRECCIÓN DE ENTREGA:\n${addressText}${referenceText ? `\n\n📌 REFERENCIA:\n${referenceText}` : ''}${finalNotes ? `\n\n📝 OBSERVACIONES:\n${finalNotes}` : ''}\n\n¿Está todo correcto?`;

        const nextState: ConversationalCheckoutState = {
          ...state,
          reference: referenceText,
          notes: finalNotes,
          step: 'waiting_confirmation',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: summaryText,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Confirmar pedido', 'Corregir datos'],
            },
          ]);
        }, 350);
      };

      // STEP 1: Waiting for payment method
      if (activeOrder.step === 'waiting_payment_method') {
        const matchedMethod = paymentOptions.find((m) => lower.includes(m.toLowerCase())) || trimmedText;

        // Check if customer also mentioned their name in this message (e.g. "Pix, me llamo Carlos")
        let alreadyProvidedName: string | undefined = activeOrder.customerName;
        const nameMatch = trimmedText.match(/(?:me llamo|mi nombre es|soy|eu me chamo|o meu nome é)\s+([A-Za-zÀ-ÿ]+)/i);
        if (nameMatch && nameMatch[1]) {
          alreadyProvidedName = nameMatch[1].trim();
        }

        if (alreadyProvidedName) {
          const reply = `Perfecto 😊 Has elegido ${matchedMethod}.\n\nMucho gusto, ${alreadyProvidedName} 😊 ¿Cuál es tu número de WhatsApp o teléfono de contacto?`;
          const nextState: ConversationalCheckoutState = {
            ...activeOrder,
            paymentMethod: matchedMethod,
            customerName: alreadyProvidedName,
            step: 'waiting_phone',
          };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Omitir por ahora'],
              },
            ]);
          }, 350);
          return;
        }

        const reply = `Perfecto 😊 Ahora necesito algunos datos para tu pedido.\n\n¿Cuál es tu nombre?`;
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          paymentMethod: matchedMethod,
          step: 'waiting_name',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            },
          ]);
        }, 350);
        return;
      }

      // STEP 2: Waiting for customer's name
      if (activeOrder.step === 'waiting_name') {
        let cleanName = trimmedText
          .replace(/^(hola|buenas|ola)\s*,?\s*/i, '')
          .replace(/^(me llamo|mi nombre es|soy|eu me chamo|o meu nome é|o meu nome e)\s+/i, '')
          .replace(/[.!,;]+$/, '')
          .trim();
        if (!cleanName) cleanName = 'Cliente';

        // Check if phone was also provided in this message
        const phoneMatch = trimmedText.match(/\b(?:\+?55\s*)?(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4,5}[-\s]?\d{4}\b/);
        if (phoneMatch) {
          const foundPhone = phoneMatch[0].trim();
          const reply = `Mucho gusto, ${cleanName} 😊 ¿Cuál es la dirección donde quieres recibir tu pedido? (o escribe "Retiro en el local")`;
          const nextState: ConversationalCheckoutState = {
            ...activeOrder,
            customerName: cleanName,
            customerPhone: foundPhone,
            step: 'waiting_address',
          };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: reply,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Retiro en el local'],
              },
            ]);
          }, 350);
          return;
        }

        const reply = `Mucho gusto, ${cleanName} 😊 ¿Cuál es tu número de WhatsApp o teléfono de contacto?`;
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          customerName: cleanName,
          step: 'waiting_phone',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Omitir por ahora'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 2B: Waiting for phone/WhatsApp
      if (activeOrder.step === 'waiting_phone') {
        const isSkip = /\b(omitir|no tengo|despues|después|luego|nao|sem)\b/i.test(trimmedText);
        let phoneVal = '';
        if (!isSkip) {
          phoneVal = trimmedText.trim();
        }

        const reply = `Gracias 😊 ¿Cuál es la dirección donde quieres recibir tu pedido? (o escribe "Retiro en el local")`;
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          customerPhone: phoneVal || activeOrder.customerPhone || '',
          step: 'waiting_address',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: reply,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Retiro en el local'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 3: Waiting for address
      if (activeOrder.step === 'waiting_address') {
        const isPickup = /\b(retiro|retirar|local|loja|tienda|pickup|pegar no local)\b/i.test(trimmedText);
        if (isPickup) {
          const nextState: ConversationalCheckoutState = {
            ...activeOrder,
            deliveryType: 'pickup',
            customerAddress: 'Retiro en el local',
            step: 'waiting_notes',
          };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Tienes alguna observación adicional para tu pedido? (ej: horario de retiro, indicaciones especiales)',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Sin observaciones'],
              },
            ]);
          }, 350);
          return;
        }

        // Delivery address provided
        const hasNumber = /\d+/.test(trimmedText);
        if (!hasNumber && !/\b(s\/n|sin numero|sin número)\b/i.test(trimmedText)) {
          // Missing street number
          const nextState: ConversationalCheckoutState = {
            ...activeOrder,
            deliveryType: 'delivery',
            customerAddress: trimmedText,
            step: 'waiting_number',
          };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cuál es el número de la dirección?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }, 350);
          return;
        }

        // Has street and number (e.g. "Rua X, 123") -> Ask for reference point
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          deliveryType: 'delivery',
          customerAddress: trimmedText,
          step: 'waiting_reference',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: '¿Tienes algún punto de referencia?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Frente al supermercado', 'Cerca de la plaza', 'Sin referencia'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 4: Waiting for address number
      if (activeOrder.step === 'waiting_number') {
        const fullAddress = `${activeOrder.customerAddress || ''}, Nº ${trimmedText}`;
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          customerAddress: fullAddress,
          step: 'waiting_reference',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: '¿Tienes algún punto de referencia?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Frente al supermercado', 'Cerca de la plaza', 'Sin referencia'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 5: Waiting for reference point
      if (activeOrder.step === 'waiting_reference') {
        const isNone = /\b(sin referencia|ninguno|ninguna|no tengo|no|nao|nenhum)\b/i.test(trimmedText);
        const refPoint = isNone ? '' : trimmedText;
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          reference: refPoint,
          step: 'waiting_notes',
        };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: '¿Tienes alguna observación adicional para tu pedido? (ej: detalles de entrega, sin azúcar, etc.)',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Sin observaciones'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 5B: Waiting for additional notes / observations
      if (activeOrder.step === 'waiting_notes') {
        const isNone = /\b(sin observaciones|ninguna|ninguno|no|nao|nenhuma|nada|no tengo)\b/i.test(trimmedText);
        const notesVal = isNone ? '' : trimmedText.trim();
        const nextState: ConversationalCheckoutState = {
          ...activeOrder,
          notes: notesVal,
        };
        sendFinalConfirmation(nextState, nextState.reference, notesVal);
        return;
      }

      // STEP 6: Waiting for confirmation or corrections
      if (activeOrder.step === 'waiting_confirmation') {
        const isAffirmative = /\b(sí|si|confirmar pedido|confirmar|está correcto|esta correcto|correcto|dale|sim|pode fechar|tudo certo|ok|perfeito|confirmo)\b/i.test(trimmedText);
        const isNegativeOrCorrection = /\b(no|nao|corregir|corregir datos|cambiar|mal|error|equivocado)\b/i.test(trimmedText);

        if (isAffirmative && !isNegativeOrCorrection) {
          // CREAR PEDIDO DEFINITIVO SIN DATOS INVENTADOS
          const randomNum = Math.floor(1000 + Math.random() * 9000);
          const orderNumber = `#PED-${randomNum}`;
          const currentEmpresaId = empresaId || 1;
          const lines = activeOrder.items
            .map((it) => `• ${it.quantity} × ${it.productName} — ${formatBRL(it.totalPrice)}`)
            .join('\n');

          const pendingFields: Array<'customerName' | 'customerPhone' | 'customerAddress' | 'paymentMethod'> = [];
          if (!activeOrder.customerName || activeOrder.customerName === 'Cliente') pendingFields.push('customerName');
          if (!activeOrder.customerPhone) pendingFields.push('customerPhone');
          if (!activeOrder.customerAddress && activeOrder.deliveryType !== 'pickup') pendingFields.push('customerAddress');
          if (!activeOrder.paymentMethod) pendingFields.push('paymentMethod');

          const newOrderPayload: CustomerOrder = {
            id: `ord-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            orderNumber,
            empresaId: currentEmpresaId,
            empresaName: config.name || 'Empresa',
            customerName: activeOrder.customerName && activeOrder.customerName !== 'Cliente' ? activeOrder.customerName.trim() : '',
            customerPhone: activeOrder.customerPhone ? activeOrder.customerPhone.trim() : '',
            customerAddress: activeOrder.deliveryType === 'pickup' ? 'Retiro en el local' : (activeOrder.customerAddress || ''),
            deliveryType: activeOrder.deliveryType || 'delivery',
            reference: activeOrder.reference || '',
            items: activeOrder.items.map((i) => ({
              productId: i.productId,
              productName: i.productName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.totalPrice,
            })),
            subtotal: activeOrder.subtotal,
            total: activeOrder.total,
            paymentMethod: activeOrder.paymentMethod || '',
            paymentStatus: 'PENDIENTE',
            status: 'CONFIRMADO',
            createdAt: new Date().toISOString(),
            notes: activeOrder.notes || (activeOrder.reference ? `Referencia: ${activeOrder.reference}` : ''),
            transferredToHuman: false,
            pendingFields,
          };

          // 1. Add order to local project state
          if (onAddOrder) {
            onAddOrder(newOrderPayload);
          }

          // 2. Post to backend to trigger company notification & SSE broadcast
          fetch('/api/orders', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-empresa-id': String(currentEmpresaId),
            },
            body: JSON.stringify(newOrderPayload),
          }).catch((err) => console.warn('Order post error:', err));

          // 3. Clear shopping quantities
          setCardQuantities({});
          setSimulatedCart([]);
          if (onUpdateCart) onUpdateCart([]);
          setConversationalOrder(null);
          conversationalOrderRef.current = null;

          const finalClientMessage = `✅ ¡Pedido recibido!\n\nTu pedido ${orderNumber} fue enviado correctamente a la empresa.\n\n💰 Total: ${formatBRL(activeOrder.total)}\n💳 Forma de pago: ${activeOrder.paymentMethod || 'Pendiente'}\n\nLa empresa ya recibió tu pedido y continuará con la atención.`;

          const phoneDigits = (config.phoneWhatsapp || '5511999999999').replace(/\D/g, '');
          const waUrl = `https://wa.me/${phoneDigits}?text=${encodeURIComponent(
            `Hola ${config.name}, acabo de confirmar mi pedido ${orderNumber}:\n${lines}\nTotal: ${formatBRL(activeOrder.total)}\nForma de pago: ${activeOrder.paymentMethod || 'A convenir'}\nCliente: ${activeOrder.customerName || 'Cliente'}`
          )}`;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: finalClientMessage,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                needsHumanAttention: true,
                humanAttentionReason: `Nuevo pedido ${orderNumber} por ${formatBRL(activeOrder.total)}`,
                whatsappRedirectUrl: waUrl,
                suggestedQuickReplies: ['Continuar por WhatsApp', 'Ver catálogo'],
              },
            ]);
          }, 450);
          return;
        }

        // Customer wants to correct
        if (lower.includes('dirección') || lower.includes('direccion') || lower.includes('endereço')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_address' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: 'Claro 😊 Por favor escribe la dirección correcta donde quieres recibir tu pedido:',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Retiro en el local'],
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('nombre') || lower.includes('nome')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_name' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: 'Claro 😊 ¿Cuál es tu nombre correcto?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('teléfono') || lower.includes('telefono') || lower.includes('whatsapp') || lower.includes('celular')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_phone' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: 'Claro 😊 ¿Cuál es tu número de WhatsApp o teléfono de contacto?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Omitir por ahora'],
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('pago') || lower.includes('pagamento') || lower.includes('forma')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_payment_method' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: 'Claro 😊 ¿Cómo quieres pagar?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: paymentOptions,
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('observación') || lower.includes('observacion') || lower.includes('nota') || lower.includes('detalles')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_notes' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;

          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: 'Claro 😊 ¿Cuáles son las observaciones para tu pedido?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Sin observaciones'],
              },
            ]);
          }, 350);
          return;
        }

        // Generic correction inquiry
        const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_correction_field' };
        setConversationalOrder(nextState);
        conversationalOrderRef.current = nextState;

        setTimeout(() => {
          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: `m-bot-${Date.now()}`,
              sender: 'bot',
              text: 'Claro 😊 ¿Quieres corregir tu nombre, teléfono, dirección, forma de pago u observaciones?',
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedQuickReplies: ['Nombre', 'Teléfono', 'Dirección', 'Forma de pago', 'Observaciones'],
            },
          ]);
        }, 350);
        return;
      }

      // STEP 7: Waiting for which field to correct
      if (activeOrder.step === 'waiting_correction_field') {
        if (lower.includes('nombre') || lower.includes('nome')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_name' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cuál es tu nombre correcto?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('teléfono') || lower.includes('telefono') || lower.includes('whatsapp') || lower.includes('celular')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_phone' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cuál es tu número de WhatsApp o teléfono correcto?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Omitir por ahora'],
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('dirección') || lower.includes('direccion') || lower.includes('endereço')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_address' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cuál es la dirección correcta donde quieres recibir tu pedido?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Retiro en el local'],
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('pago') || lower.includes('pagamento') || lower.includes('forma')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_payment_method' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cómo quieres pagar?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: paymentOptions,
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('observación') || lower.includes('observacion') || lower.includes('nota') || lower.includes('detalles')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_notes' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Cuáles son las observaciones para tu pedido?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Sin observaciones'],
              },
            ]);
          }, 350);
          return;
        }

        if (lower.includes('referencia') || lower.includes('ponto')) {
          const nextState: ConversationalCheckoutState = { ...activeOrder, step: 'waiting_reference' };
          setConversationalOrder(nextState);
          conversationalOrderRef.current = nextState;
          setTimeout(() => {
            setIsTyping(false);
            setMessages((prev) => [
              ...prev,
              {
                id: `m-bot-${Date.now()}`,
                sender: 'bot',
                text: '¿Tienes algún punto de referencia?',
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                suggestedQuickReplies: ['Frente al supermercado', 'Cerca de la plaza', 'Sin referencia'],
              },
            ]);
          }, 350);
          return;
        }
      }
    }

    // Check if user initiated purchase intent while no checkout is active
    const isPurchaseIntent = /\b(quiero comprar|comprar|quero comprar|finalizar compra|hacer pedido|cerrar pedido|fechar pedido|hacer una compra)\b/i.test(text);
    if (isPurchaseIntent) {
      const selectedFromCards = catalog
        .map((p) => ({ product: p, quantity: cardQuantities[p.id] || 0 }))
        .filter((it) => it.quantity > 0);

      const selectedFromCart = simulatedCart
        .map((c) => {
          const prod = catalog.find((p) => p.id === c.productId) || {
            id: c.productId,
            name: c.name,
            price: c.unitPrice,
            category: 'Geral',
            description: '',
            inStock: true,
            imageUrl: '',
          };
          return { product: prod as CatalogItem, quantity: c.quantity };
        })
        .filter((it) => it.quantity > 0);

      const poolToUse = selectedFromCards.length > 0 ? selectedFromCards : selectedFromCart;

      if (poolToUse.length > 0) {
        startConversationalCheckoutFromItems(poolToUse);
        setIsTyping(false);
        return;
      }

      // No products selected yet
      setTimeout(() => {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `m-bot-${Date.now()}`,
            sender: 'bot',
            text: '¡Excelente! 😊 Para preparar tu pedido, dime qué productos deseas o selecciona las cantidades en la pestaña de **Catálogo** usando + y -.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            suggestedQuickReplies: [
              ...catalog.slice(0, 3).map((p) => `Quiero ${p.name}`),
              '🛍️ Ver catálogo de productos',
            ],
          },
        ]);
      }, 350);
      return;
    }

    try {
      const response = await fetch('/api/sales-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage: text,
          history: [...messages, userMsg],
          cart: simulatedCart,
          projectId: projectId || config.id,
          empresaId: empresaId,
          empresa_id: empresaId,
          customConfig: config,
          catalog,
          services,
          professionals,
          aiKnowledge,
          faqs,
          workingHours,
          appointments,
        }),
      });

      const data = await response.json();

      // Apply initial quantities if detected by AI
      if (data.initialQuantities && typeof data.initialQuantities === 'object') {
        setCardQuantities((prev) => ({
          ...prev,
          ...data.initialQuantities,
        }));
      }

      // Apply cart updates from AI response
      if (data.cartUpdates) {
        applyCartUpdates(data.cartUpdates);
      }

      if (data.orderClosed) {
        setSimulatedCart([]);
        if (onUpdateCart) onUpdateCart([]);
      }

      // Find recommended products
      const recProds = (data.recommendedProductIds || [])
        .map((id: string) => (catalog || []).find((p) => p.id === id))
        .filter(Boolean) as CatalogItem[];

      // Find recommended services
      const recServs = (data.recommendedServiceIds || [])
        .map((id: string) => (services || []).find((s) => s.id === id))
        .filter(Boolean) as ServiceItem[];

      const botMsgTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const botMsg: ChatMessage = {
        id: `m-bot-${Date.now()}`,
        sender: 'bot',
        text: data.replyText || `¡Hola! Te damos la bienvenida a ${config.name}. ¿Cómo te podemos ayudar hoy?`,
        timestamp: botMsgTime,
        recommendedProducts: recProds.length > 0 ? recProds : undefined,
        recommendedServices: recServs.length > 0 ? recServs : undefined,
        bookingDetails: data.bookingData,
        intent: data.detectedIntent,
        needsHumanAttention: data.needsHumanAttention,
        orderSummaryData: data.orderData,
        suggestedQuickReplies: data.suggestedQuickReplies || (
          services.length > 0
            ? ['Agendar cita', 'Ver productos disponibles', '👤 Falar com atendente humano']
            : ['Ver productos disponibles', 'Formas de pago', '👤 Falar com atendente humano']
        ),
      };

      setMessages((prev) => [...prev, botMsg]);

      // If order registered by AI
      if (data.orderData && onAddOrder) {
        onAddOrder({
          id: `ord-${Date.now()}`,
          customerName: data.leadInfo?.name || 'Cliente Simulador',
          customerPhone: data.leadInfo?.phone || '+55 11 98877-6655',
          items: data.orderData.items || [],
          subtotal: data.orderData.subtotal || 0,
          discountPercentage: data.orderData.discountPercentage || 0,
          discount: data.orderData.discountAmount || 0,
          total: data.orderData.total || data.orderData.subtotal || 0,
          paymentMethod: data.orderData.paymentMethod || 'PIX',
          status: 'CONFIRMADO',
          createdAt: new Date().toISOString(),
        });
      }

      // If unanswered question captured, register in project state
      if (data.registeredUnansweredQuestion && onAddUnansweredQuestion) {
        onAddUnansweredQuestion(data.registeredUnansweredQuestion);
      } else if (data.unansweredQuestion && data.unansweredQuestion.question && onAddUnansweredQuestion) {
        onAddUnansweredQuestion({
          id: `unans-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          question: data.unansweredQuestion.question,
          customerName: data.leadInfo?.name || 'Cliente Simulador',
          customerPhone: data.leadInfo?.phone || '',
          date: new Date().toISOString(),
          aiReplySnippet: data.replyText?.substring(0, 100),
          status: 'pending',
        });
      }

      // If lead captured
      if (data.leadInfo && onCaptureLead && (data.leadInfo.name || data.leadInfo.phone)) {
        onCaptureLead({
          id: `lead-sim-${Date.now()}`,
          customerName: data.leadInfo.name || 'Cliente Simulador',
          phone: data.leadInfo.phone || '+55 11 98877-6655',
          email: data.leadInfo.email || '',
          interestedProduct: recProds[0]?.name || '',
          interestedService: recServs[0]?.name || '',
          needSummary: (data.needsHumanAttention ? '⚠️ [SOLICITUD DE ATENCIÓN HUMANA] ' : '') + (data.leadInfo.summaryOfNeed || 'Atención en simulador comercial'),
          intentLevel: data.detectedIntent || 'MEDIA',
          type: 'AMBOS',
          status: data.needsHumanAttention ? 'CALIFICADO' : 'NUEVO',
          createdAt: new Date().toISOString(),
          lastMessage: text,
          messages: [...messages, userMsg, botMsg],
          source: 'SIMULADOR_WHATSAPP',
        });
      }
    } catch {
      // Graceful local salesperson response without artificial signal or connection excuses
      const inStockProds = (catalog || []).filter((p) => p.status !== 'oculto' && p.status !== 'esgotado' && p.inStock !== false);
      const isSpanish = /[áéíóúñ¿¡]|\b(hola|que|dulce|dulces|precio|cuanto|tienes|tienen|donde|abren|todos|omitas)\b/i.test(text);

      let fallbackText = "";
      if (inStockProds.length > 0) {
        const prodList = inStockProds.map((p) => {
          let emoji = "🛍️";
          const lowerName = p.name.toLowerCase();
          if (lowerName.includes("pudim") || lowerName.includes("flan")) emoji = "🍮";
          else if (lowerName.includes("bolo") || lowerName.includes("torta") || lowerName.includes("pastel") || lowerName.includes("cheesecake")) emoji = "🍰";
          else if (lowerName.includes("brigadeiro") || lowerName.includes("dulce") || lowerName.includes("doce") || lowerName.includes("trufa")) emoji = "🍬";
          else if (lowerName.includes("copo") || lowerName.includes("pote") || lowerName.includes("morango") || lowerName.includes("mousse")) emoji = "🍓";
          else if (lowerName.includes("cone") || lowerName.includes("sorvete") || lowerName.includes("helado")) emoji = "🍦";
          return `${emoji} ${p.name} — ${formatBRL(p.price)}`;
        }).join('\n');

        fallbackText = isSpanish 
          ? `¡Hola! 😊 Tenemos todos estos ${inStockProds.length} productos disponibles en nuestro catálogo:\n\n${prodList}\n\n¿Cuál te gustaría pedir o te gustaría ver más detalles?`
          : `Olá! 😊 Temos todos estes ${inStockProds.length} produtos disponíveis em nosso catálogo:\n\n${prodList}\n\nQual deles você gostaria de pedir ou deseja ver mais detalhes?`;
      } else {
        fallbackText = isSpanish
          ? `¡Hola! Te damos la bienvenida a ${config.name}. ¿En qué podemos ayudarte hoy com nossos produtos ${services.length > 0 ? 'y servicios' : ''}?`
          : `Olá! Te damos as boas-vindas à ${config.name}. Em que podemos te ajudar hoje com nossos produtos ${services.length > 0 ? 'e serviços' : ''}?`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `m-bot-err-${Date.now()}`,
          sender: 'bot',
          text: fallbackText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          recommendedProducts: inStockProds,
          suggestedQuickReplies: isSpanish 
            ? ['Ver productos disponibles', 'Formas de pago', 'Consultar envíos']
            : ['Ver produtos disponíveis', 'Formas de pagamento', 'Consultar entregas'],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-50 flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      {/* Mobile Device Frame */}
      <div className="bg-slate-950 rounded-[40px] border-4 border-slate-800 shadow-2xl w-full max-w-sm h-[680px] flex flex-col overflow-hidden relative">
        {/* Top Phone Speaker Notch */}
        <div className="bg-slate-950 h-6 flex items-center justify-center shrink-0">
          <div className="w-20 h-4 bg-slate-900 rounded-b-xl flex items-center justify-center">
            <div className="w-8 h-1 bg-slate-800 rounded-full" />
          </div>
        </div>

        {/* App Header (WhatsApp Style) */}
        <div className="bg-emerald-700 text-white p-3 flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center space-x-2.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-white border border-emerald-500 shadow-sm overflow-hidden">
                {config.logoUrl ? (
                  <img
                    src={config.logoUrl}
                    alt={config.name || 'Logo'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-emerald-700" />
            </div>

            <div className="leading-tight">
              <h3 className="font-bold text-xs truncate max-w-[170px]">{config.botName || 'Assistente IA'}</h3>
              <p className="text-[10px] text-emerald-200 truncate max-w-[170px]">
                {config.name || 'Studio Beleza & Estética'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <button onClick={onClose} className="p-1.5 hover:bg-emerald-600 rounded-full transition-colors text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Inside Simulator */}
        <div className="bg-emerald-800 text-white text-[11px] font-bold flex justify-around border-b border-emerald-600 shrink-0">
          <button
            onClick={() => setActiveTabMobile('chat')}
            className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1 ${
              activeTabMobile === 'chat' ? 'border-white text-white' : 'border-transparent text-emerald-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" /> Conversa
          </button>
          <button
            onClick={() => setActiveTabMobile('catalog')}
            className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1 ${
              activeTabMobile === 'catalog' ? 'border-white text-white' : 'border-transparent text-emerald-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" /> Produtos
          </button>
          <button
            onClick={() => setActiveTabMobile('services')}
            className={`py-2 px-3 border-b-2 transition-all flex items-center gap-1 ${
              activeTabMobile === 'services' ? 'border-white text-white' : 'border-transparent text-emerald-200'
            }`}
          >
            <Scissors className="w-3.5 h-3.5" /> Serviços
          </button>
        </div>

        {/* View 1: Chat Stream */}
        {activeTabMobile === 'chat' && (
          <div className="flex-1 bg-[#efeae2] p-3 overflow-y-auto space-y-3 font-sans">
            <div className="text-center my-1">
              <span className="bg-emerald-100/90 text-emerald-900 text-[9px] font-semibold px-2.5 py-1 rounded-md shadow-sm">
                💬 Asistente Comercial IA Oficial
              </span>
            </div>

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-xs leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#d9fdd3] text-slate-900 rounded-tr-none'
                      : 'bg-white text-slate-900 rounded-tl-none border border-slate-100'
                  }`}
                >
                  {msg.isAudio ? (
                    <div className="flex items-center gap-2.5 py-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 shadow-sm">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-[120px]">
                        <div className="flex items-center gap-0.5 h-4 my-1">
                          {[40, 70, 30, 90, 60, 80, 45, 100, 65, 50, 85, 30, 75, 55, 90, 40].map((h, i) => (
                            <span key={i} className="w-1 bg-emerald-600/80 rounded-full" style={{ height: `${h}%` }} />
                          ))}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                          <span>🎤 Mensaje de voz</span>
                          <span>{msg.audioDuration || '0:05'}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-line">{msg.text}</p>
                  )}

                  {/* Human Handoff Banner */}
                  {msg.needsHumanAttention && (
                    <div className="mt-2.5 p-2.5 bg-blue-50 border border-blue-200 rounded-xl space-y-1 text-blue-950">
                      <div className="flex items-center space-x-1.5 text-blue-800 font-extrabold text-[11px]">
                        <UserCheck className="w-4 h-4 text-blue-700" />
                        <span>Transferido a Atención Humana</span>
                      </div>
                      <p className="text-[10px] text-blue-800 leading-tight">
                        Esta conversación ha sido marcada para que un asesor del equipo de {config.name} tome el control de inmediato.
                      </p>
                    </div>
                  )}

                  {/* Order Summary Card */}
                  {msg.orderSummaryData && (
                    <div className="mt-2.5 p-3 bg-emerald-50 border border-emerald-300 rounded-xl space-y-2 text-slate-800 shadow-sm">
                      <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                        <div className="flex items-center space-x-1.5 text-emerald-800 font-extrabold text-xs">
                          <PackageCheck className="w-4 h-4 text-emerald-700" />
                          <span>¡Pedido Confirmado #{msg.orderSummaryData.id || ''}!</span>
                        </div>
                        <span className="bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          CERRADO
                        </span>
                      </div>
                      
                      <div className="text-[11px] space-y-0.5 text-slate-700">
                        {msg.orderSummaryData.customerName && (
                          <p><strong className="text-slate-900">Cliente:</strong> {msg.orderSummaryData.customerName}</p>
                        )}
                        {msg.orderSummaryData.customerAddress && (
                          <p><strong className="text-slate-900">Entrega/Dirección:</strong> {msg.orderSummaryData.customerAddress}</p>
                        )}
                        {msg.orderSummaryData.paymentMethod && (
                          <p><strong className="text-slate-900">Método de Pago:</strong> {msg.orderSummaryData.paymentMethod}</p>
                        )}
                      </div>

                      {msg.orderSummaryData.items && msg.orderSummaryData.items.length > 0 && (
                        <div className="space-y-1 text-[10px] text-slate-700 bg-white/80 rounded-lg p-2 border border-emerald-200/70">
                          <span className="font-bold text-slate-800 block text-[10px]">Detalle de Artículos:</span>
                          {msg.orderSummaryData.items.map((item: any, i: number) => (
                            <div key={i} className="flex justify-between items-center text-slate-600">
                              <span>{item.quantity || 1}x {item.productName || item.name} {item.weightGrams ? `(${item.weightGrams >= 1000 ? `${(item.weightGrams/1000).toFixed(1)}kg` : `${item.weightGrams}g`})` : ''}</span>
                              <span className="font-bold text-slate-900">{formatBRL(item.totalPrice || (item.price || item.unitPrice || 0) * (item.quantity || 1))}</span>
                            </div>
                          ))}
                          <div className="border-t border-slate-200 pt-1 flex justify-between items-center text-xs font-black text-emerald-900">
                            <span>Total Final:</span>
                            <span>{formatBRL(msg.orderSummaryData.total || msg.orderSummaryData.subtotal || 0)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Human hand-off notification banner */}
                  {msg.needsHumanAttention && (
                    <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-300 rounded-xl text-[11px] space-y-1.5 text-amber-900 shadow-sm">
                      <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                        <Headphones className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>Transferencia a Atención Humana</span>
                      </div>
                      <p className="text-[10px] text-amber-800 leading-snug">
                        {msg.orderSummaryData 
                          ? 'Tu venta fue cerrada y registrada con éxito. La conversación fue transferida a nuestro equipo para coordinar la entrega.' 
                          : 'Tu solicitud fue derivada a nuestro equipo de atención humana.'}
                      </p>
                      {config.phoneWhatsapp && (
                        <a
                          href={`https://wa.me/${config.phoneWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, vengo del chat con el pedido #${msg.orderSummaryData?.id || ''}`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] px-2.5 py-1 rounded-lg transition-colors shadow-sm"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Continuar por WhatsApp</span>
                        </a>
                      )}
                    </div>
                  )}

                  {/* Product Cards Attachment - Individual Product Card Display */}
                  {msg.recommendedProducts && msg.recommendedProducts.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                          🛍️ {msg.recommendedProducts.length === 1 ? 'Ficha del Producto' : 'Productos Encontrados'}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {config.name}
                        </span>
                      </div>
                      {msg.recommendedProducts.map((prod) => {
                        const currentQty = getCardQty(prod.id);
                        return (
                          <div 
                            key={prod.id} 
                            className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-sm hover:shadow transition-all space-y-2.5"
                          >
                            {/* Product Header: Image + Basic Info */}
                            <div className="flex items-start gap-2.5">
                              {prod.imageUrl ? (
                                <img 
                                  src={prod.imageUrl} 
                                  alt={prod.name} 
                                  referrerPolicy="no-referrer"
                                  className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0 border border-slate-100" 
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-50 to-teal-100 border border-emerald-200/60 flex items-center justify-center shrink-0 text-emerald-700 text-xl font-bold">
                                  📦
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className="font-extrabold text-slate-900 text-xs block leading-tight">
                                  {prod.name}
                                </span>
                                {prod.category && (
                                  <span className="text-[9px] text-slate-500 block truncate font-medium">
                                    {prod.category}
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5 mt-1">
                                  {prod.saleType === 'weight' ? (
                                    <div className="flex items-center gap-1">
                                      <span className="bg-amber-100 text-amber-900 text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                        <Scale className="w-2.5 h-2.5" /> Por peso
                                      </span>
                                      <span className="font-black text-emerald-700 text-xs">
                                        {formatBRL(prod.price)} / kg
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="font-black text-emerald-700 text-sm">
                                      {formatBRL(prod.price)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Product Description */}
                            {prod.description && (
                              <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/70 p-1.5 rounded-lg border border-slate-100">
                                {prod.description}
                              </p>
                            )}

                            {/* Quantity Stepper Directly on Card [-] 0 [+] (Silent update, no chat message) */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[11px] font-bold text-slate-600">
                                Cantidad:
                              </span>
                              <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => updateCardQty(prod.id, -1)}
                                  disabled={currentQty <= 0}
                                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition shadow-xs cursor-pointer active:scale-95"
                                  title="Disminuir cantidad"
                                  aria-label="Disminuir cantidad"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-8 text-center font-black text-xs text-slate-900 font-mono">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => updateCardQty(prod.id, 1, prod.stockQuantity ?? (prod.inStock ? 99 : 0))}
                                  disabled={prod.inStock === false || (prod.stockQuantity !== undefined && currentQty >= prod.stockQuantity)}
                                  className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition shadow-xs cursor-pointer active:scale-95"
                                  title="Aumentar cantidad"
                                  aria-label="Aumentar cantidad"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {/* Dedicated Direct Buy Bar below the catalog products */}
                      {(() => {
                        const cardList = msg.recommendedProducts;
                        const selectedCount = cardList.reduce((sum, p) => sum + (cardQuantities[p.id] || 0), 0);
                        const selectedSubtotal = cardList.reduce((sum, p) => sum + ((cardQuantities[p.id] || 0) * p.price), 0);

                        return (
                          <div className="mt-2.5 pt-2.5 border-t border-slate-200/90 space-y-2">
                            <div className="flex items-center justify-between px-1 text-xs">
                              <span className="text-slate-600 font-bold text-[11px]">
                                {selectedCount > 0 ? `${selectedCount} producto(s) seleccionado(s)` : 'Selecciona cantidades con + o -'}
                              </span>
                              <span className="font-black text-emerald-700 text-sm font-mono">
                                Total: {formatBRL(selectedSubtotal)}
                              </span>
                            </div>

                            {buyWarning && (
                              <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center animate-fade-in">
                                ⚠️ {buyWarning}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleExecuteDirectBuy(cardList)}
                              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                            >
                              <ShoppingBag className="w-4 h-4" />
                              <span>COMPRAR</span>
                              {selectedCount > 0 && <span className="font-mono">({formatBRL(selectedSubtotal)})</span>}
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Service Booking Attachment */}
                  {msg.recommendedServices && msg.recommendedServices.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 space-y-2">
                      <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider block">
                        📅 Serviço Disponível para Agendamento
                      </span>
                      {msg.recommendedServices.map((serv) => (
                        <div key={serv.id} className="bg-indigo-50/60 p-2.5 rounded-xl border border-indigo-100 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{serv.name}</span>
                            <span className="font-extrabold text-emerald-600 text-xs">{formatBRL(serv.price)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500">Duração: {serv.durationMin} min | {serv.professional}</p>
                          <button
                            onClick={() => handleSendMessage(`Gostaria de agendar o serviço "${serv.name}"`)}
                            className="w-full mt-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] py-1 rounded-lg"
                          >
                            Escolher Horário de {serv.name}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booking Confirmation Card */}
                  {msg.bookingDetails && msg.bookingDetails.serviceName && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-slate-800">
                      <div className="flex items-center space-x-1 text-emerald-700 font-extrabold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Agendamento Registrado!</span>
                      </div>
                      <p className="text-[11px] font-bold">{msg.bookingDetails.serviceName}</p>
                      <p className="text-[10px] text-slate-600">
                        🗓️ {msg.bookingDetails.date} às {msg.bookingDetails.time} | 👤 {msg.bookingDetails.professional}
                      </p>
                    </div>
                  )}

                  <span className="text-[9px] text-slate-400 block text-right mt-1 font-mono">{msg.timestamp}</span>
                </div>

                {/* Quick Reply Chips */}
                {msg.suggestedQuickReplies && msg.suggestedQuickReplies.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5 max-w-[90%]">
                    {msg.suggestedQuickReplies.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(chip)}
                        className="bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px] px-2.5 py-1 rounded-full shadow-sm transition-all"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="bg-white rounded-2xl p-2.5 w-20 shadow-sm border border-slate-100 flex items-center justify-center space-x-1">
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce" />
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.2s]" />
                <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* View 2: Catalog Browser */}
        {activeTabMobile === 'catalog' && (
          <div className="flex-1 bg-slate-50 flex flex-col overflow-hidden">
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 text-xs">Catálogo Oficial</h4>
                <span className="text-[10px] text-slate-500 font-medium">Selecciona con + y -</span>
              </div>
              <div className="space-y-2">
                {catalog
                  .filter((prod) => prod.status !== 'oculto')
                  .map((prod) => {
                    const qty = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.inStock ? 10 : 0);
                    const isEsgotado = qty === 0 || prod.status === 'esgotado' || !prod.inStock;
                    const currentQty = getCardQty(prod.id);

                    return (
                      <div key={prod.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center space-x-3">
                        <div className="relative shrink-0">
                          <img src={prod.imageUrl} alt={prod.name} className="w-14 h-14 object-cover rounded-xl" />
                          {isEsgotado && (
                            <span className="absolute inset-0 bg-slate-900/60 backdrop-blur-[1px] rounded-xl flex items-center justify-center text-[9px] font-bold text-white uppercase">
                              Esgotado
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <h5 className="font-bold text-slate-900 text-xs truncate">{prod.name}</h5>
                          </div>
                          <p className="text-[10px] text-slate-500 line-clamp-1">{prod.description}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span className="font-black text-emerald-600 text-xs">{formatBRL(prod.price)}</span>
                            <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${isEsgotado ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-slate-100 text-slate-600'}`}>
                              {isEsgotado ? 'Esgotado' : `${qty} em estoque`}
                            </span>
                          </div>
                        </div>

                        {/* Direct Stepper [-] 0 [+] without sending messages */}
                        <div className="flex items-center bg-slate-100 rounded-xl p-0.5 border border-slate-200 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateCardQty(prod.id, -1)}
                            disabled={isEsgotado || currentQty <= 0}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition shadow-xs cursor-pointer active:scale-95"
                            title="Disminuir cantidad"
                            aria-label="Disminuir cantidad"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-7 text-center font-black text-xs text-slate-900 font-mono">
                            {currentQty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCardQty(prod.id, 1, qty)}
                            disabled={isEsgotado || currentQty >= qty}
                            className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:hover:bg-white flex items-center justify-center transition shadow-xs cursor-pointer active:scale-95"
                            title="Aumentar cantidad"
                            aria-label="Aumentar cantidad"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Sticky COMPRAR Bar below catalog */}
            {(() => {
              const activeProds = catalog.filter((p) => p.status !== 'oculto');
              const selectedCount = activeProds.reduce((sum, p) => sum + (cardQuantities[p.id] || 0), 0);
              const selectedTotal = activeProds.reduce((sum, p) => sum + ((cardQuantities[p.id] || 0) * p.price), 0);

              return (
                <div className="bg-white/95 backdrop-blur-md p-3 border-t border-slate-200 shadow-lg space-y-2 shrink-0">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-bold">
                      {selectedCount > 0 ? `${selectedCount} producto(s) seleccionado(s)` : 'Selecciona tus productos:'}
                    </span>
                    <span className="font-black text-emerald-700 text-sm font-mono">
                      Total: {formatBRL(selectedTotal)}
                    </span>
                  </div>

                  {buyWarning && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold text-center animate-fade-in">
                      ⚠️ {buyWarning}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleExecuteDirectBuy(activeProds)}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-black text-xs shadow-md transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>COMPRAR</span>
                    {selectedCount > 0 && <span className="font-mono">({formatBRL(selectedTotal)})</span>}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {/* View 3: Services Browser */}
        {activeTabMobile === 'services' && (
          <div className="flex-1 bg-slate-50 p-3 overflow-y-auto space-y-3">
            <h4 className="font-bold text-slate-900 text-xs">Serviços Disponíveis para Agendamento</h4>
            <div className="space-y-2">
              {services.map((serv) => (
                <div key={serv.id} className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900 text-xs">{serv.name}</h5>
                    <span className="font-black text-emerald-600 text-xs">{formatBRL(serv.price)}</span>
                  </div>
                  <p className="text-[10px] text-slate-500">{serv.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-400">⏱️ {serv.durationMin} min | {serv.professional}</span>
                    <button
                      onClick={() => {
                        setActiveTabMobile('chat');
                        handleSendMessage(`Quero agendar o serviço: ${serv.name}`);
                      }}
                      className="bg-indigo-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-xl shadow-sm"
                    >
                      Agendar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Message Bar */}
        {activeTabMobile === 'chat' && (
          <div className="bg-slate-100 p-2 border-t border-slate-200 shrink-0 relative">
            {/* Audio Voice Note Drawer */}
            {isAudioDrawerOpen && (
              <div className="absolute bottom-full left-0 right-0 bg-white border-t border-slate-200 p-3 shadow-xl rounded-t-2xl space-y-2.5 z-20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Mic className="w-4 h-4 text-emerald-600" />
                    <span>Enviar Mensagem de Áudio (WhatsApp)</span>
                  </div>
                  <button
                    onClick={() => setIsAudioDrawerOpen(false)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {isRecordingAudio ? (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-rose-600 rounded-full animate-ping" />
                      <span className="text-xs font-bold text-rose-800">
                        🔴 Gravando: 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={cancelVoiceRecording}
                        className="text-slate-500 hover:text-slate-700 text-xs px-2 py-1 rounded"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={stopVoiceRecording}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-1 rounded-lg flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3.5 h-3.5" /> Enviar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      onClick={startVoiceRecording}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Mic className="w-4 h-4" /> Gravar com Microfone
                    </button>

                    <div className="pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Ou envie um áudio simulado rápido:
                      </span>
                      <div className="grid grid-cols-1 gap-1.5">
                        <button
                          onClick={() => handleSendAudioMessage(undefined, "Hola, cuánto cuesta el kilo de producto y qué opciones tienen?", "0:04")}
                          className="text-left text-[11px] bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 p-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">🎙️ "¿Cuánto cuesta el kilo y qué opciones tienen?"</span>
                        </button>
                        <button
                          onClick={() => handleSendAudioMessage(undefined, "Quiero pedir aproximadamente 1,2 kg y pagar con PIX", "0:05")}
                          className="text-left text-[11px] bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 p-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">🎙️ "Quiero pedir ~1,2 kg y pagar con PIX"</span>
                        </button>
                        <button
                          onClick={() => handleSendAudioMessage(undefined, "Hola, por favor necesito hablar con un atendente humano", "0:03")}
                          className="text-left text-[11px] bg-slate-50 hover:bg-blue-50 hover:border-blue-300 border border-slate-200 text-slate-700 p-2 rounded-xl transition-colors flex items-center gap-2 cursor-pointer"
                        >
                          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">🎙️ "Necesito hablar con un atendente humano"</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-1.5"
            >
              <button
                type="button"
                onClick={() => setIsAudioDrawerOpen((prev) => !prev)}
                className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-sm transition-colors cursor-pointer ${
                  isRecordingAudio
                    ? 'bg-rose-600 text-white animate-pulse'
                    : isAudioDrawerOpen
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-white hover:bg-slate-200 text-slate-600 border border-slate-300'
                }`}
                title="Mensagem de Voz / Áudio"
              >
                <Mic className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Digite sua mensagem no WhatsApp..."
                className="flex-1 bg-white border border-slate-300 rounded-full px-3.5 py-2 text-xs text-slate-900 outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isTyping}
                className="w-9 h-9 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full flex items-center justify-center shrink-0 shadow-md disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
