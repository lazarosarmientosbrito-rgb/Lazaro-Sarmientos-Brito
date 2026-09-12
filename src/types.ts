export type SalesTone = 'friendly' | 'professional' | 'direct' | 'persuasive' | 'enthusiastic';

export type ServiceType = 'venda' | 'agendamento' | 'venda_agendamento';

export type AutomationMode = 'manual' | 'assistido' | 'automatico';

export type LeadIntentLevel = 'BAJA' | 'MEDIA' | 'ALTA' | 'COMPRA_LISTA' | 'AGENDAMENTO_SOLICITADO';

export type ProductStatus = 'disponivel' | 'esgotado' | 'oculto';

export type AppointmentStatus = 'disponivel' | 'reservado' | 'confirmado' | 'cancelado' | 'concluido';

export interface CatalogItem {
  id: string;
  name: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  features: string[];
  inStock: boolean;
  imageUrl: string;
  popular?: boolean;
  sku?: string;
  variations?: string[];
  availability?: string;
  stockQuantity: number;
  minStock?: number; // Estoque mínimo para alerta de stock bajo
  maxStock?: number; // Estoque máximo
  stockControlEnabled?: boolean; // Control activado/desactivado
  status: ProductStatus;
  saleType?: 'unit' | 'weight'; // 'unit' (default) o 'weight' (por peso)
  weightUnit?: 'kg' | 'g'; // 'kg' por defecto para cálculo de precio por kg
  pricePerKg?: number; // Precio por kilogramo cuando saleType === 'weight'
  additionalInfo?: string;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  status: 'ativo' | 'inativo';
  avatarUrl?: string;
  phone?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  durationMin: number;
  professionalIds?: string[];
  professionalNames?: string[];
  professional: string; // Para exibição primária / retrocompatibilidade
  availableDays: string[];
  availableHours: string[];
  intervalsMin: number;
  status: 'ativo' | 'inativo';
  active: boolean;
}

export interface DayWorkingHours {
  dayOfWeek: 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
  dayLabel: string;
  active: boolean;
  startTime: string; // "08:00"
  endTime: string;   // "19:00"
}

export interface BlockedSlot {
  id: string;
  date?: string; // YYYY-MM-DD or empty for recurring
  startTime: string; // "12:00"
  endTime: string;   // "13:00"
  reason: string;    // "Horário de Almoço", "Folga", "Manutenção"
  professionalId?: string; // All or specific professional
}

export interface WorkingHoursConfig {
  intervalMin: number; // e.g. 15, 30 min
  workingDays: DayWorkingHours[];
  blockedSlots: BlockedSlot[];
}

export interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  customerName: string;
  customerPhone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  durationMin?: number;
  professionalId?: string;
  professional: string;
  price: number;
  status: AppointmentStatus;
  createdAt: string;
  notes?: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface AiKnowledgeItem {
  id: string;
  title: string;
  category: 'politica' | 'promocao' | 'entrega' | 'pagamento' | 'atendimento' | 'geral' | 'regras_venda';
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UnansweredQuestion {
  id: string;
  question: string;
  customerName?: string;
  customerPhone?: string;
  date: string;
  aiReplySnippet?: string;
  status: 'pending' | 'answered';
  adminAnswer?: string;
  answeredAt?: string;
}

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'COP' | 'MXN' | 'ARS' | 'CLP' | 'PEN';

export interface PromotionItem {
  id: string;
  code: string;
  title: string;
  name?: string;
  description?: string;
  discountPercentage: number;
  discountValue?: number;
  type?: 'percentual' | 'fixo';
  active: boolean;
  validUntil?: string;
  minOrderValue?: number;
}

export interface PaymentMethodSetting {
  id: string; // 'pix' | 'tarjeta' | 'efectivo' | 'transferencia' | 'boleto' | 'mercadopago' | string
  name: string; // e.g. "PIX", "Tarjeta", "Efectivo", "Transferencia bancaria"
  enabled: boolean; // active/deactive
  discountPercentage: number; // e.g. 10 (for 10%), 0, 5, 3
  couponCode?: string; // optional coupon/code e.g. "DULCE10"
  instructions?: string; // optional instructions / chave PIX / bank details
  badge?: string; // e.g. "10% Descuento", "0% Descuento", "5% Descuento", "3% Descuento"
  iconType?: 'pix' | 'card' | 'cash' | 'bank' | 'wallet' | 'delivery';
}

export interface OrderItem {
  productId?: string;
  productName: string;
  quantity: number; // Cantidad en unidades (ej: 2) o cantidad de porciones
  unitPrice: number; // Precio unitario o precio por kg
  totalPrice: number;
  saleType?: 'unit' | 'weight'; // 'unit' o 'weight'
  weightGrams?: number; // ej: 500, 750 (g)
  weightKg?: number; // ej: 0.50, 0.75, 1.2 (kg)
  isApproximate?: boolean; // Para cantidades estimadas ej: ~1.2kg
  weightNote?: string; // ej: "750 g (0,75 kg)"
  imageUrl?: string;
  description?: string;
}

export type OrderStatus = 
  | 'NUEVO'
  | 'EN_ATENCION'
  | 'CONFIRMADO'
  | 'PENDIENTE'
  | 'EN_PREPARACION'
  | 'EN_CAMINO'
  | 'ENTREGADO'
  | 'FINALIZADO'
  | 'CANCELADO';

export interface CustomerOrder {
  id: string;
  orderNumber?: string;
  empresaId?: number; // id_empresa asignado
  empresaName?: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  deliveryType?: 'delivery' | 'pickup';
  streetNumber?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  reference?: string;
  paymentStatus?: 'PENDIENTE' | 'CONFIRMADO' | 'PAGADO';
  items: OrderItem[];
  subtotal: number;
  discountPercentage?: number;
  discount?: number;
  discountAmount?: number;
  subtotalWithDiscount?: number;
  shippingFee?: number;
  total: number;
  paymentMethod: string;
  paymentMethodId?: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
  transferredToHuman?: boolean;
  transferredAt?: string;
  pendingFields?: string[];
  currency?: CurrencyCode | string;
}

export interface CompanyOrderNotification {
  id: string;
  orderId: string;
  orderNumber: string;
  empresaId: number;
  empresaName?: string;
  customerName: string;
  customerPhone?: string;
  total: number;
  paymentMethod: string;
  itemsSummary: string;
  deliveryAddress?: string;
  deliveryType?: 'delivery' | 'pickup';
  reference?: string;
  notes?: string;
  items?: OrderItem[];
  pendingFields?: string[];
  createdAt: string;
  read?: boolean;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  description?: string;
  imageUrl?: string;
  quantity: number;
  unitPrice: number;
  saleType: 'unit' | 'weight';
  weightGrams?: number;
  weightKg?: number;
  isApproximate?: boolean;
  subtotal: number;
  selected?: boolean;
  productRef?: CatalogItem;
}


export type AppLanguage = 'pt-BR' | 'es' | 'en' | 'fr' | 'it' | 'de' | 'pt-PT';

export interface Employee {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  username?: string; // Usuario para login seguro
  role: 'ADMINISTRADOR' | 'GERENTE' | 'EMPLEADO';
  position?: string;
  status: 'ativo' | 'inativo';
  avatarUrl?: string;
  createdAt?: string;
  permissions?: string[];
}

export interface NotificationSettings {
  newOrder: boolean;
  cancelledOrder: boolean;
  lowStock: boolean;
  outOfStock: boolean;
  newCustomer: boolean;
  newAppointment: boolean;
  orderReady: boolean;
  orderDelivered: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  deliveryTimeEstimate?: string;
}

export interface DeliveryConfig {
  allowPickup: boolean;
  allowDelivery: boolean;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  zones?: DeliveryZone[];
  estimatedDeliveryMin?: number;
}

export interface BusinessConfig {
  id?: string;
  name: string;
  description: string;
  tagline: string;
  industry: string;
  category?: string;
  country?: string;
  city: string;
  state: string;
  address: string;
  phoneWhatsapp: string;
  instagram: string;
  website: string;
  businessHours: string;
  currency: CurrencyCode;
  language?: AppLanguage;
  serviceType: ServiceType;
  automationMode: AutomationMode;
  tone: SalesTone;
  botName: string;
  greetingMessage: string;
  salesObjective: string;
  customPrompt: string;
  discountCode?: string;
  discountPercentage?: number;
  shippingPolicy: string;
  exchangePolicy: string;
  cancellationPolicy: string;
  importantNotes: string;
  paymentMethods: string[];
  paymentMethodSettings?: PaymentMethodSetting[];
  shippingFee?: number;
  freeShippingThreshold?: number;
  pixKey?: string;
  autoCollectLead: boolean;
  logoUrl?: string; // URL o DataURL del logo oficial de la empresa
  deliveryConfig?: DeliveryConfig;
  // Conexión WhatsApp Oficial (WhatsApp normal o WhatsApp Business)
  whatsappAppType?: 'both' | 'whatsapp' | 'whatsapp_business';
  whatsappConnected?: boolean;
  whatsappConnectedNumber?: string;
  whatsappConnectedApp?: 'WhatsApp' | 'WhatsApp Business';
  whatsappConnectedAt?: string;
  whatsappQrSessionId?: string;
  // Acceso y WhatsApp exclusivo del Dueño
  ownerWhatsapp?: string; // Número de WhatsApp personal del dueño para acceso a su panel
  ownerAccessRevoked?: boolean; // Indica si el admin desconectó/revocó el acceso del dueño
  ownerAccessToken?: string; // Token único de validación para el enlace / QR del dueño
  ownerAccessRevokedAt?: string; // Fecha de revocación del acceso
  notificationSettings?: NotificationSettings;
}

export interface BusinessProject {
  id: string;
  empresaId?: number; // Identificación entero8 en tabla 'empresa' de Supabase
  name: string;
  businessType: string;
  category: string;
  description: string;
  logoUrl?: string;
  ownerWhatsapp?: string; // WhatsApp exclusivo del dueño
  ownerAccessRevoked?: boolean; // Acceso del dueño revocado/desconectado
  ownerAccessToken?: string; // Token de acceso del dueño
  ownerAccessRevokedAt?: string;
  createdAt: string;
  updatedAt: string;
  status: 'ativo' | 'inativo' | 'pausado';
  config: BusinessConfig;
  catalog: CatalogItem[];
  services: ServiceItem[];
  professionals: Professional[];
  workingHours: WorkingHoursConfig;
  appointments: Appointment[];
  faqs: FAQItem[];
  aiKnowledge: AiKnowledgeItem[];
  unansweredQuestions: UnansweredQuestion[];
  leads: CapturedLead[];
  orders?: CustomerOrder[];
  cart?: CartItem[];
  promotions?: PromotionItem[];
  employees?: Employee[];
}

export type Company = BusinessProject;

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot' | 'system';
  text: string;
  timestamp: string;
  recommendedProducts?: CatalogItem[];
  recommendedServices?: ServiceItem[];
  bookingDetails?: {
    serviceName?: string;
    date?: string;
    time?: string;
    professional?: string;
    customerName?: string;
    customerPhone?: string;
    price?: number;
    confirmed?: boolean;
  };
  intent?: LeadIntentLevel;
  suggestedQuickReplies?: string[];
  actionType?: string;
  needsHumanAttention?: boolean;
  isAudio?: boolean;
  audioDuration?: string;
  orderSummaryData?: any;
  initialQuantities?: Record<string, number>;
  humanAttentionReason?: string;
  whatsappRedirectUrl?: string;
}

export interface CapturedLead {
  id: string;
  customerName?: string;
  phone?: string;
  email?: string;
  interestedProduct?: string;
  interestedService?: string;
  needSummary?: string;
  intentLevel: LeadIntentLevel;
  type: 'VENDA' | 'AGENDAMENTO' | 'AMBOS' | 'GENERAL';
  status: 'NUEVO' | 'CONTACTADO' | 'VENTA_CERRADA' | 'AGENDADO' | 'PERDIDO';
  createdAt: string;
  lastMessage: string;
  messages: ChatMessage[];
  source: 'WEB_CHAT' | 'SIMULADOR_WHATSAPP';
  appointmentDetails?: Appointment;
  needsHumanAttention?: boolean;
  orderId?: string;
  orderSummary?: string;
}

export interface SalesChatAPIResponse {
  replyText: string;
  recommendedProductIds?: string[];
  recommendedServiceIds?: string[];
  detectedIntent: LeadIntentLevel;
  detectedAction?: 'COMPRA' | 'AGENDAMENTO' | 'AMBOS' | 'CONSULTA';
  needsHumanAttention?: boolean;
  orderData?: {
    items: {
      productId?: string;
      productName: string;
      saleType?: 'unit' | 'weight';
      quantity?: number;
      weightGrams?: number;
      weightKg?: number;
      unitPrice: number;
      totalPrice: number;
      isApproximate?: boolean;
    }[];
    subtotal: number;
    discountPercentage?: number;
    discountAmount: number;
    total: number;
    paymentMethod?: string;
    isEstimated?: boolean;
  };
  bookingData?: {
    serviceId?: string;
    serviceName?: string;
    date?: string;
    time?: string;
    professional?: string;
    customerName?: string;
    customerPhone?: string;
    price?: number;
    status?: 'CONFIRMADO' | 'PENDENTE';
  };
  leadInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    summaryOfNeed?: string;
  };
  suggestedQuickReplies?: string[];
  actionSuggested?: string;
  cartUpdates?: {
    action: 'set' | 'add' | 'remove' | 'clear';
    items: CartItem[];
    summaryText?: string;
  };
  orderClosed?: boolean;
  orderConfirmation?: CustomerOrder;
  unansweredQuestion?: {
    question: string;
    reason: string;
  };
  initialQuantities?: Record<string, number>;
}

// Supabase Interfaces
export interface SupabaseEmpresaRow {
  identificación?: number;
  identificacion?: number;
  nombre?: string;
  creado_en?: string;
}

export interface SupabaseProductoRow {
  id: string; // uuid
  id_empresa: number; // entero8
  nombre: string; // texto
  descripcion: string; // texto
  precio: number; // numérico
  imagen_url: string; // texto
  creado_en?: string; // timestamp
}

// User Roles & Authentication Types
export type UserRole = 'superadmin' | 'owner';

export interface AppUser {
  id: string;
  name: string;
  email?: string;
  role: UserRole; // 'superadmin' = Administrador Principal | 'owner' = Dueño de negocio
  empresaId?: number; // Identificación numérica asignada a su empresa exclusiva
  empresaName?: string;
}

