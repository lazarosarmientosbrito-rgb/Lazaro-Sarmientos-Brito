import { CatalogItem, CartItem, PaymentMethodSetting, BusinessConfig, ChatMessage } from '../types.js';

export interface IntelligentAnalysis {
  intent: 
    | 'CATALOG_BROWSE'
    | 'RECOMMENDATION'
    | 'CONTEXTUAL_REFERENCE'
    | 'MULTI_CONDITION_SEARCH'
    | 'SPECIFIC_PRODUCT'
    | 'CART_OPERATION'
    | 'CHECKOUT'
    | 'COMPANY_INFO'
    | 'HUMAN_HANDOFF'
    | 'GREETING'
    | 'UNKNOWN_QUESTION';
  language: 'es' | 'pt';
  targetProducts: CatalogItem[];
  quantities: Record<string, number>;
  contextualRefType?: string;
  cartAction?: 'view' | 'add' | 'remove' | 'clear' | 'set';
  companyInfoTopic?: 'payments' | 'shipping' | 'location' | 'hours';
  isAskingForMoreOptions?: boolean;
  replyText: string;
  quickReplies: string[];
  cartUpdates?: { action: string; items: CartItem[] };
}

// 1. Language detection helper
export function detectLanguage(text: string): 'es' | 'pt' {
  const lower = text.toLowerCase();
  const spanishKeywords = [
    'hola', 'dulces', 'dulce', 'que', 'qué', 'tienes', 'tienen', 'tiene', 'disponible', 'disponibles',
    'cuanto', 'cuánto', 'cuesta', 'precio', 'precios', 'quiero', 'postre', 'postres', 'torta', 'tortas',
    'carnes', 'carne', 'asado', 'envio', 'envíos', 'envios', 'donde', 'dónde', 'estan', 'están',
    'horario', 'abren', 'gracias', 'buenas', 'dias', 'días', 'tardes', 'noches', 'por favor', 'pedir',
    'comprar', 'opciones', 'menu', 'menú', 'catalogo', 'catálogo', 'pago', 'pagar', 'tarjeta', 'efectivo',
    'primera', 'segunda', 'tercera', 'primero', 'segundo', 'tercero', 'parecido', 'similar', 'barato',
    'negro', 'negra', 'blanco', 'blanca', 'rojo', 'roja', 'hombre', 'mujer', 'esposa', 'recomiendas',
    'agrega', 'quitar', 'sacar', 'elimina', 'carrito'
  ];
  const portugueseKeywords = [
    'olá', 'ola', 'oi', 'tudo bem', 'doces', 'doce', 'tem', 'têm', 'tem aí', 'disponível', 'disponivel',
    'quanto custa', 'quanto é', 'quanto tá', 'qual o valor', 'quero', 'sobremesa', 'sobremesas',
    'carnes', 'carne', 'churrasco', 'entrega', 'frete', 'onde fica', 'endereço', 'horário', 'abrem',
    'obrigado', 'obrigada', 'bom dia', 'boa tarde', 'boa noite', 'por favor', 'pedir', 'comprar',
    'cardápio', 'cardapio', 'pagamento', 'pagar', 'cartão', 'dinheiro', 'primeira', 'segunda',
    'primeiro', 'segundo', 'mais barata', 'mais barato', 'preta', 'preto', 'branca', 'branco',
    'vermelha', 'vermelho', 'homem', 'mulher', 'recomenda', 'adiciona', 'tirar', 'remover', 'carrinho',
    'vocês têm', 'voces tem', 'o que tem'
  ];

  let esScore = 0;
  let ptScore = 0;

  spanishKeywords.forEach(kw => {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) esScore += 2;
  });
  portugueseKeywords.forEach(kw => {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(lower)) ptScore += 2;
  });

  if (/[¿¡]/.test(text) || /\b(del|al|las|los|para mi)\b/i.test(lower)) esScore += 3;
  if (/\b(do|da|dos|das|para mim|pra mim|voce|você)\b/i.test(lower)) ptScore += 3;

  return esScore >= ptScore ? 'es' : 'pt';
}

// 2. Normalization: Spell Correction, Typo Mapping & Informal slang
export function normalizeUserMessage(text: string): { normalized: string; tokens: string[] } {
  let clean = (text || '').toLowerCase().trim();

  // Common typos and phonetic mistakes in PT & ES
  const replacements: [RegExp, string][] = [
    [/\bcamiza\b/g, 'camisa'],
    [/\bprta\b/g, 'preta'],
    [/\bcalca\b/g, 'calça'],
    [/\bsapato\b/g, 'zapato'],
    [/\btenis\b/g, 'tênis'],
    [/\bdisponivel\b/g, 'disponible'],
    [/\bdisponiveis\b/g, 'disponibles'],
    [/\bdisponibil\b/g, 'disponible'],
    [/\bvc\b/g, 'você'],
    [/\btbm\b/g, 'também'],
    [/\bcatlogo\b/g, 'catálogo'],
    [/\bcatalgo\b/g, 'catálogo'],
    [/\bcardapio\b/g, 'cardápio'],
    [/\bprecos\b/g, 'preços'],
    [/\bopcoes\b/g, 'opções'],
    [/\bpq\b/g, 'porque'],
    [/\bq\b/g, 'que'],
    [/\bmt\b/g, 'muito'],
    [/\brecomenda\b/g, 'recomendar'],
    [/\brecomiendas\b/g, 'recomendar'],
    [/\bhorario\b/g, 'horário'],
    [/\bendereco\b/g, 'endereço'],
  ];

  for (const [pattern, rep] of replacements) {
    clean = clean.replace(pattern, rep);
  }

  const tokens = clean
    .replace(/[¿?¡!.,;:()]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0);

  return { normalized: clean, tokens };
}

// Extract previously mentioned product IDs from history messages
export function extractPreviousProductsFromHistory(
  history: ChatMessage[],
  catalog: CatalogItem[]
): CatalogItem[] {
  const referencedProds: CatalogItem[] = [];
  const seenIds = new Set<string>();

  // Iterate backwards through bot messages
  const botMsgs = [...(history || [])].reverse().filter((m) => m.sender === 'bot');

  for (const msg of botMsgs) {
    if (msg.recommendedProducts && msg.recommendedProducts.length > 0) {
      for (const p of msg.recommendedProducts) {
        if (!seenIds.has(p.id)) {
          seenIds.add(p.id);
          referencedProds.push(p);
        }
      }
    } else if (msg.text) {
      // Find catalog product names mentioned in quotes or bold in bot text
      for (const catItem of catalog) {
        if (
          !seenIds.has(catItem.id) &&
          (msg.text.includes(`**${catItem.name}**`) ||
            msg.text.toLowerCase().includes(catItem.name.toLowerCase()))
        ) {
          seenIds.add(catItem.id);
          referencedProds.push(catItem);
        }
      }
    }
    if (referencedProds.length >= 6) break;
  }

  return referencedProds;
}

// Format currency in BRL standard (R$ XX,XX)
export function formatBRL(amount: number): string {
  return `R$ ${amount.toFixed(2).replace('.', ',')}`;
}

// Main Intelligent Sales Analysis Function
export function analyzeCustomerQuery(params: {
  userMessage: string;
  history: ChatMessage[];
  catalog: CatalogItem[];
  cart: CartItem[];
  config: BusinessConfig;
  paymentMethods: PaymentMethodSetting[];
}): IntelligentAnalysis {
  const { userMessage, history, catalog, cart, config, paymentMethods } = params;
  const lang = detectLanguage(userMessage);
  const isSpanish = lang === 'es';
  const { normalized, tokens } = normalizeUserMessage(userMessage);
  const cleanMsg = normalized.replace(/[¿?¡!.,;:()]/g, ' ');

  const visibleCatalog = catalog.filter((p) => p.status !== 'oculto');
  const inStockCatalog = visibleCatalog.filter((p) => {
    const qty = p.stockQuantity !== undefined ? p.stockQuantity : (p.inStock ? 10 : 0);
    return qty > 0 && p.status !== 'esgotado' && p.inStock !== false;
  });

  const previousProds = extractPreviousProductsFromHistory(history, visibleCatalog);

  // ----------------------------------------------------
  // Intent 1: Human Hand-off Request
  // ----------------------------------------------------
  if (
    cleanMsg.includes('humano') ||
    cleanMsg.includes('atendente') ||
    cleanMsg.includes('falar com pessoa') ||
    cleanMsg.includes('pessoa real') ||
    cleanMsg.includes('persona real') ||
    cleanMsg.includes('hablar con una persona') ||
    cleanMsg.includes('operador') ||
    cleanMsg.includes('asesor humano')
  ) {
    return {
      intent: 'HUMAN_HANDOFF',
      language: lang,
      targetProducts: [],
      quantities: {},
      replyText: isSpanish
        ? `¡Por supuesto! Con mucho gusto voy a transferir tu conversación a un atendente humano de nuestro equipo. Puedes continuar por WhatsApp tocando el botón a continuación.`
        : `Com certeza! Com muito prazer vou transferir sua conversa para um atendente humano da nossa equipe. Você pode continuar pelo WhatsApp clicando no botão abaixo.`,
      quickReplies: isSpanish
        ? ['Continuar por WhatsApp', 'Ver catálogo de productos']
        : ['Continuar pelo WhatsApp', 'Ver catálogo de produtos'],
    };
  }

  // ----------------------------------------------------
  // Intent 1.5: Checkout / Order Finalize ("cerrar pedido", "fechar pedido", "finalizar compra", "voy a pagar con PIX")
  // ----------------------------------------------------
  const isFinalizeOrCheckout =
    cleanMsg.includes('cerrar mi pedido') ||
    cleanMsg.includes('cerrar el pedido') ||
    cleanMsg.includes('cerrar pedido') ||
    cleanMsg.includes('fechar meu pedido') ||
    cleanMsg.includes('fechar o pedido') ||
    cleanMsg.includes('fechar pedido') ||
    cleanMsg.includes('finalizar compra') ||
    cleanMsg.includes('finalizar pedido') ||
    cleanMsg.includes('finalizar meu pedido') ||
    cleanMsg.includes('concluir pedido') ||
    cleanMsg.includes('voy a pagar') ||
    cleanMsg.includes('vou pagar') ||
    cleanMsg.includes('quero pagar') ||
    cleanMsg.includes('quiero pagar') ||
    cleanMsg.includes('pagar con pix') ||
    cleanMsg.includes('pagar com pix') ||
    cleanMsg.includes('pagar con tarjeta') ||
    cleanMsg.includes('pagar com cartao') ||
    cleanMsg.includes('pagar com cartão') ||
    cleanMsg.includes('pagar en efectivo') ||
    cleanMsg.includes('pagar em dinheiro');

  if (isFinalizeOrCheckout) {
    if (cart.length > 0) {
      // Determine payment method from message
      const isPix = cleanMsg.includes('pix');
      const isCard = cleanMsg.includes('tarjeta') || cleanMsg.includes('cartao') || cleanMsg.includes('cartão');
      const isCash = cleanMsg.includes('efectivo') || cleanMsg.includes('dinheiro');

      const cartSubtotal = cart.reduce((sum, item) => sum + (item.subtotal || item.unitPrice * item.quantity), 0);
      const shippingFee = config.shippingFee !== undefined ? Number(config.shippingFee) : 7.0;
      const freeThreshold = config.freeShippingThreshold !== undefined ? Number(config.freeShippingThreshold) : 50.0;
      const appliedShipping = cartSubtotal >= freeThreshold ? 0 : shippingFee;

      let discountPercent = 0;
      let paymentName = isSpanish ? 'A convenir' : 'A combinar';
      if (isPix) {
        discountPercent = 10;
        paymentName = 'PIX';
      } else if (isCash) {
        discountPercent = 5;
        paymentName = isSpanish ? 'Efectivo' : 'Dinheiro';
      } else if (isCard) {
        discountPercent = 0;
        paymentName = isSpanish ? 'Tarjeta' : 'Cartão';
      }

      const discountAmount = (cartSubtotal * discountPercent) / 100;
      const finalTotal = cartSubtotal - discountAmount + appliedShipping;

      const itemsSummary = cart.map((c) => `• **${c.quantity}x ${c.name}** — ${formatBRL(c.subtotal || c.unitPrice * c.quantity)}`).join('\n');

      const configuredMethods = (config.paymentMethodSettings || [])
        .filter((p) => p.enabled !== false)
        .map((p) => p.name.trim());
      const paymentQuickReplies = configuredMethods.length > 0
        ? configuredMethods
        : (isSpanish ? ['Pix', 'Tarjeta', 'Efectivo', 'Transferencia'] : ['Pix', 'Cartão', 'Dinheiro', 'Transferência']);

      const reply = isSpanish
        ? `🛍️ Tu pedido:\n\n${itemsSummary}\n\n💰 Total: ${formatBRL(finalTotal)}\n\n¿Cómo quieres pagar?`
        : `🛍️ Seu pedido:\n\n${itemsSummary}\n\n💰 Total: ${formatBRL(finalTotal)}\n\nComo você quer pagar?`;

      return {
        intent: 'CONTEXTUAL_REFERENCE',
        language: lang,
        targetProducts: [],
        quantities: {},
        replyText: reply,
        quickReplies: paymentQuickReplies,
      };
    } else {
      // Cart is currently empty
      const reply = isSpanish
        ? `Tu carrito está vacío en este momento en **${config.name}**. 😊\n\n¿Qué producto te gustaría agregar para comenzar tu pedido? Aquí tienes las opciones disponibles:`
        : `Seu carrinho está vazio no momento na **${config.name}**. 😊\n\nQual produto você gostaria de adicionar para começar seu pedido? Aqui estão as opções disponíveis:`;

      return {
        intent: 'CATALOG_BROWSE',
        language: lang,
        targetProducts: inStockCatalog.slice(0, 3),
        quantities: {},
        replyText: reply,
        quickReplies: inStockCatalog.slice(0, 3).map((p) => (isSpanish ? `Quiero ${p.name}` : `Quero ${p.name}`)),
      };
    }
  }

  // ----------------------------------------------------
  // Intent 2: Company Info (Payments, Hours, Location, Shipping)
  // NEVER search catalog when asking these questions!
  // ----------------------------------------------------
  // Payments / PIX
  if (
    cleanMsg.includes('forma de pago') ||
    cleanMsg.includes('formas de pago') ||
    cleanMsg.includes('formas de pagamento') ||
    cleanMsg.includes('forma de pagamento') ||
    cleanMsg.includes('como puedo pagar') ||
    cleanMsg.includes('como pagar') ||
    cleanMsg.includes('acepta pix') ||
    cleanMsg.includes('aceitam pix') ||
    cleanMsg.includes('acepta tarjeta') ||
    cleanMsg.includes('aceitam cartao') ||
    cleanMsg.includes('aceitam cartão') ||
    cleanMsg.includes('descuento') ||
    cleanMsg.includes('desconto') ||
    cleanMsg.includes('chave pix') ||
    cleanMsg.includes('clave pix')
  ) {
    const activeMethods = paymentMethods.filter((p) => p.enabled !== false);
    const methodsList = activeMethods
      .map((p) => {
        const disc = p.discountPercentage > 0
          ? (isSpanish ? `👉 **${p.name}**: **${p.discountPercentage}% de descuento automático**` : `👉 **${p.name}**: **${p.discountPercentage}% de desconto automático**`)
          : `👉 **${p.name}**: ${isSpanish ? 'Precio estándar (0% descuento)' : 'Preço padrão (0% desconto)'}`;
        return disc;
      })
      .join('\n');

    const reply = isSpanish
      ? `💳 **Formas de pago y beneficios en ${config.name}:**\n\n${methodsList}\n\n${
          config.pixKey ? `📌 **Chave PIX:** \`${config.pixKey}\`\n\n` : ''
        }¿Deseas elegir algún producto para calcular tu total con descuento?`
      : `💳 **Formas de pagamento e vantagens na ${config.name}:**\n\n${methodsList}\n\n${
          config.pixKey ? `📌 **Chave PIX:** \`${config.pixKey}\`\n\n` : ''
        }Deseja escolher algum produto para calcularmos seu total com desconto?`;

    return {
      intent: 'COMPANY_INFO',
      language: lang,
      companyInfoTopic: 'payments',
      targetProducts: [],
      quantities: {},
      replyText: reply,
      quickReplies: isSpanish
        ? ['Ver productos disponibles', 'Consultar envíos', 'Horario de atención']
        : ['Ver produtos disponíveis', 'Consultar entrega', 'Horário de atendimento'],
    };
  }

  // Shipping / Delivery
  if (
    cleanMsg.includes('hacen entrega') ||
    cleanMsg.includes('hacen envios') ||
    cleanMsg.includes('hacen envíos') ||
    cleanMsg.includes('fazem entrega') ||
    cleanMsg.includes('fazem frete') ||
    cleanMsg.includes('custo de envio') ||
    cleanMsg.includes('costo de envio') ||
    cleanMsg.includes('costo de envío') ||
    cleanMsg.includes('valor do frete') ||
    cleanMsg.includes('entrega a domicilio') ||
    cleanMsg.includes('quanto e o frete') ||
    cleanMsg.includes('quanto é o frete')
  ) {
    const shippingFee = config.shippingFee !== undefined ? Number(config.shippingFee) : 7.0;
    const freeThreshold = config.freeShippingThreshold !== undefined ? Number(config.freeShippingThreshold) : 50.0;
    const policy = config.shippingPolicy || (isSpanish ? 'Realizamos entregas a domicilio seguras y rápidas.' : 'Realizamos entregas a domicílio rápidas e seguras.');

    const reply = isSpanish
      ? `📦 **Información de envíos y entregas:**\n\n${policy}\n\n• Costo estándar de envío: **${formatBRL(shippingFee)}**\n• Envío **GRATIS** en pedidos a partir de **${formatBRL(freeThreshold)}**.\n\nTambién puedes retirar tu pedido directamente en nuestro local si lo prefieres.`
      : `📦 **Informações de frete e entregas:**\n\n${policy}\n\n• Valor padrão de frete: **${formatBRL(shippingFee)}**\n• Frete **GRÁTIS** para compras a partir de **${formatBRL(freeThreshold)}**.\n\nVocê também pode optar por retirar diretamente em nosso local se preferir.`;

    return {
      intent: 'COMPANY_INFO',
      language: lang,
      companyInfoTopic: 'shipping',
      targetProducts: [],
      quantities: {},
      replyText: reply,
      quickReplies: isSpanish
        ? ['Ver productos disponibles', 'Formas de pago', 'Ubicación']
        : ['Ver produtos disponíveis', 'Formas de pagamento', 'Localização'],
    };
  }

  // Location / Address
  if (
    cleanMsg.includes('donde estan') ||
    cleanMsg.includes('dónde están') ||
    cleanMsg.includes('donde queda') ||
    cleanMsg.includes('dónde queda') ||
    cleanMsg.includes('onde fica') ||
    cleanMsg.includes('onde voces ficam') ||
    cleanMsg.includes('onde vocês ficam') ||
    cleanMsg.includes('qual o endereco') ||
    cleanMsg.includes('qual o endereço') ||
    cleanMsg.includes('cual es la direccion') ||
    cleanMsg.includes('cuál es la dirección')
  ) {
    const addr = config.address
      ? `${config.address}${config.city ? `, ${config.city}` : ''}${config.state ? ` - ${config.state}` : ''}`
      : (config.city || (isSpanish ? 'Atención online con envíos' : 'Atendimento online com entregas'));

    const reply = isSpanish
      ? `📍 **Ubicación de ${config.name}:**\n${addr}\n\nRealizamos entregas a domicilio y también atendemos para retiro coordinado.`
      : `📍 **Localização da ${config.name}:**\n${addr}\n\nRealizamos entregas e também atendemos para retirada combinada.`;

    return {
      intent: 'COMPANY_INFO',
      language: lang,
      companyInfoTopic: 'location',
      targetProducts: [],
      quantities: {},
      replyText: reply,
      quickReplies: isSpanish
        ? ['Ver productos disponibles', 'Horario de atención', 'Formas de pago']
        : ['Ver produtos disponíveis', 'Horário de atendimento', 'Formas de pagamento'],
    };
  }

  // Hours
  if (
    cleanMsg.includes('a que hora abren') ||
    cleanMsg.includes('a qué hora abren') ||
    cleanMsg.includes('que horario tienen') ||
    cleanMsg.includes('qué horario tienen') ||
    cleanMsg.includes('horario de atencion') ||
    cleanMsg.includes('horario de atención') ||
    cleanMsg.includes('horario de funcionamento') ||
    cleanMsg.includes('que horas abre') ||
    cleanMsg.includes('estao abertos') ||
    cleanMsg.includes('están abiertos')
  ) {
    const hours = config.businessHours || (isSpanish ? 'Lunes a Sábado de 09:00 a 19:00' : 'Segunda a Sábado das 09:00 às 19:00');
    const reply = isSpanish
      ? `⏰ **Horario de atención:**\n${hours}\n\n¡Nuestro asistente virtual está disponible para ayudarte a cualquier hora!`
      : `⏰ **Horário de atendimento:**\n${hours}\n\nNosso assistente virtual está disponível para te ajudar a qualquer momento!`;

    return {
      intent: 'COMPANY_INFO',
      language: lang,
      companyInfoTopic: 'hours',
      targetProducts: [],
      quantities: {},
      replyText: reply,
      quickReplies: isSpanish
        ? ['Ver productos disponibles', 'Formas de pago', 'Ubicación']
        : ['Ver produtos disponíveis', 'Formas de pagamento', 'Localização'],
    };
  }

  // ----------------------------------------------------
  // Intent 3: General Catalog Inquiry (THE CORE FIX FOR "¿Qué tienes disponible?")
  // Phrases asking what is available, what they sell, show options, show catalog
  // ----------------------------------------------------
  const isCatalogGeneralInquiry =
    // Spanish broad inquiries
    cleanMsg.includes('que tienes disponible') ||
    cleanMsg.includes('qué tienes disponible') ||
    cleanMsg.includes('que tienen disponible') ||
    cleanMsg.includes('qué tienen disponible') ||
    cleanMsg.includes('que hay disponible') ||
    cleanMsg.includes('qué hay disponible') ||
    cleanMsg.includes('que tienen') ||
    cleanMsg.includes('qué tienen') ||
    cleanMsg.includes('que venden') ||
    cleanMsg.includes('qué venden') ||
    cleanMsg.includes('que productos tienen') ||
    cleanMsg.includes('qué productos tienen') ||
    cleanMsg.includes('muestrame los productos') ||
    cleanMsg.includes('muéstrame los productos') ||
    cleanMsg.includes('muestrame lo que tienes') ||
    cleanMsg.includes('muéstrame lo que tienes') ||
    cleanMsg.includes('quiero ver las opciones') ||
    cleanMsg.includes('ver las opciones') ||
    cleanMsg.includes('que opciones tienen') ||
    cleanMsg.includes('qué opciones tienen') ||
    cleanMsg.includes('enseñame el catalogo') ||
    cleanMsg.includes('enséñame el catálogo') ||
    cleanMsg.includes('ver el catalogo') ||
    cleanMsg.includes('ver el catálogo') ||
    cleanMsg.includes('ver catalogo') ||
    cleanMsg.includes('ver catálogo') ||
    cleanMsg.includes('que me puedes ofrecer') ||
    cleanMsg.includes('qué me puedes ofrecer') ||
    cleanMsg.includes('dime todos los productos') ||
    cleanMsg.includes('todos los productos') ||
    // Portuguese broad inquiries
    cleanMsg.includes('o que tem disponivel') ||
    cleanMsg.includes('o que tem disponível') ||
    cleanMsg.includes('tem disponivel') ||
    cleanMsg.includes('tem disponível') ||
    cleanMsg.includes('o que tem') ||
    cleanMsg.includes('o que voces tem') ||
    cleanMsg.includes('o que vocês têm') ||
    cleanMsg.includes('o que voces vendem') ||
    cleanMsg.includes('o que vocês vendem') ||
    cleanMsg.includes('mostre os produtos') ||
    cleanMsg.includes('manda o catalogo') ||
    cleanMsg.includes('manda o catálogo') ||
    cleanMsg.includes('ver cardapio') ||
    cleanMsg.includes('ver cardápio') ||
    cleanMsg.includes('cardapio completo') ||
    cleanMsg.includes('cardápio completo') ||
    cleanMsg.includes('quais opcoes tem') ||
    cleanMsg.includes('quais opções têm') ||
    cleanMsg.includes('quero ver o catalogo') ||
    cleanMsg.includes('quero ver o catálogo') ||
    cleanMsg.includes('tem aí') ||
    cleanMsg.includes('tem ai') ||
    (cleanMsg === 'tem?' || cleanMsg === 'tem' || cleanMsg === 'o que tem?') ||
    cleanMsg.includes('me mostra') ||
    cleanMsg.includes('quero ver');

  if (isCatalogGeneralInquiry) {
    if (inStockCatalog.length === 0) {
      return {
        intent: 'CATALOG_BROWSE',
        language: lang,
        targetProducts: [],
        quantities: {},
        replyText: isSpanish
          ? `¡Hola! 👋 Actualmente no tenemos productos registrados en el catálogo de **${config.name}**. ¿Deseas consultar sobre nuestro horario, ubicación o formas de pago?`
          : `Olá! 👋 No momento não temos produtos cadastrados no catálogo da **${config.name}**. Deseja consultar nosso horário, localização ou formas de pagamento?`,
        quickReplies: isSpanish
          ? ['Horario de atención', 'Ubicación', 'Formas de pago']
          : ['Horário de funcionamento', 'Localização', 'Formas de pagamento'],
      };
    }

    const previewList = inStockCatalog.slice(0, 5);
    const prodLines = previewList
      .map((p, i) => `${i + 1}. **${p.name}** — ${formatBRL(p.price)}${p.saleType === 'weight' ? ' / kg' : ''}`)
      .join('\n');

    const reply = isSpanish
      ? `¡Hola! 😊 Tenemos excelentes productos disponibles en **${config.name}**:\n\n${prodLines}\n\n` +
        (inStockCatalog.length > 5
          ? `Contamos con ${inStockCatalog.length} productos en total. Puedes pulsar cualquiera de las fichas abajo para elegir cantidades o pedirme algo específico.`
          : `Puedes pulsar cualquiera de las fichas abajo para agregar al carrito o decirme cuál prefieres.`)
      : `Olá! 😊 Temos ótimos produtos disponíveis na **${config.name}**:\n\n${prodLines}\n\n` +
        (inStockCatalog.length > 5
          ? `Temos ${inStockCatalog.length} opções no total. Você pode clicar nas fichas abaixo para escolher quantidades ou me dizer o que prefere.`
          : `Você pode clicar nas fichas abaixo para adicionar ao carrinho ou me dizer qual deles prefere.`);

    return {
      intent: 'CATALOG_BROWSE',
      language: lang,
      targetProducts: previewList,
      quantities: {},
      replyText: reply,
      quickReplies: previewList.slice(0, 3).map((p) => (isSpanish ? `Quiero ${p.name}` : `Quero ${p.name}`)),
    };
  }

  // ----------------------------------------------------
  // Intent 4: Smart Recommendation ("¿Qué me recomiendas?", "el más vendido", "para mi esposa")
  // ----------------------------------------------------
  const isRecommendation =
    cleanMsg.includes('que me recomiendas') ||
    cleanMsg.includes('qué me recomiendas') ||
    cleanMsg.includes('recomiendame') ||
    cleanMsg.includes('recomiéndame') ||
    cleanMsg.includes('cual me recomiendas') ||
    cleanMsg.includes('cuál me recomiendas') ||
    cleanMsg.includes('el mas vendido') ||
    cleanMsg.includes('el más vendido') ||
    cleanMsg.includes('o mais vendido') ||
    cleanMsg.includes('qual vc recomenda') ||
    cleanMsg.includes('qual você recomenda') ||
    cleanMsg.includes('o que você me indica') ||
    cleanMsg.includes('o que voce me indica') ||
    cleanMsg.includes('algo bueno') ||
    cleanMsg.includes('algo legal') ||
    cleanMsg.includes('para regalar') ||
    cleanMsg.includes('pra presentear') ||
    cleanMsg.includes('para mi esposa') ||
    cleanMsg.includes('pra minha esposa') ||
    cleanMsg.includes('para mi esposo') ||
    cleanMsg.includes('pra namorada');

  if (isRecommendation) {
    // Select popular items, or highest rated/featured items, or first 2-3 items
    const populars = inStockCatalog.filter((p) => p.popular || (p.features && p.features.length > 0));
    const recommended = populars.length > 0 ? populars.slice(0, 3) : inStockCatalog.slice(0, 3);

    if (recommended.length === 0) {
      return {
        intent: 'RECOMMENDATION',
        language: lang,
        targetProducts: [],
        quantities: {},
        replyText: isSpanish
          ? `En este momento no tenemos productos disponibles para recomendarte. ¡Pronto tendremos novedades en **${config.name}**!`
          : `No momento não temos produtos disponíveis para recomendar. Em breve teremos novidades na **${config.name}**!`,
        quickReplies: isSpanish ? ['Formas de pago', 'Horario de atención'] : ['Formas de pagamento', 'Horário de atendimento'],
      };
    }

    const lines = recommended
      .map((p, i) => `${i + 1}. **${p.name}** (${formatBRL(p.price)}) — ${p.description || 'Una de las opciones favoritas de nuestros clientes'}`)
      .join('\n\n');

    const reply = isSpanish
      ? `¡Con mucho gusto! 😊 Te recomiendo especialmente estas opciones destacadas de **${config.name}**:\n\n${lines}\n\n¿Te gustaría ver alguno en detalle o agregarlo a tu carrito?`
      : `Com muito prazer! 😊 Recomendo especialmente estas opções de destaque da **${config.name}**:\n\n${lines}\n\nVocê gostaria de mais detalhes de algum deles ou adicionar ao carrinho?`;

    return {
      intent: 'RECOMMENDATION',
      language: lang,
      targetProducts: recommended,
      quantities: {},
      replyText: reply,
      quickReplies: recommended.map((p) => (isSpanish ? `Ver ${p.name}` : `Ver ${p.name}`)),
    };
  }

  // ----------------------------------------------------
  // Intent 5: Contextual References ("el primero", "la primera", "la segunda", "el segundo", "el tercero", "la más barata", "ese", "quiero dos de esos")
  // ----------------------------------------------------
  const isAskingFirst =
    cleanMsg.includes('la primera') ||
    cleanMsg.includes('el primero') ||
    cleanMsg.includes('o primeiro') ||
    cleanMsg.includes('a primeira') ||
    cleanMsg.includes('numero 1') ||
    cleanMsg.includes('número 1');

  const isAskingSecond =
    cleanMsg.includes('la segunda') ||
    cleanMsg.includes('el segundo') ||
    cleanMsg.includes('o segundo') ||
    cleanMsg.includes('a segunda') ||
    cleanMsg.includes('numero 2') ||
    cleanMsg.includes('número 2');

  const isAskingThird =
    cleanMsg.includes('la tercera') ||
    cleanMsg.includes('el tercero') ||
    cleanMsg.includes('o terceiro') ||
    cleanMsg.includes('a terceira') ||
    cleanMsg.includes('numero 3') ||
    cleanMsg.includes('número 3');

  const isAskingCheapestContext =
    cleanMsg.includes('la mas barata') ||
    cleanMsg.includes('la más barata') ||
    cleanMsg.includes('el mas barato') ||
    cleanMsg.includes('el más barato') ||
    cleanMsg.includes('o mais barato') ||
    cleanMsg.includes('a mais barata') ||
    cleanMsg.includes('tem outra mais barata') ||
    cleanMsg.includes('tienen otra más barata');

  const isAskingThatOne =
    cleanMsg.includes('quiero ese') ||
    cleanMsg.includes('quiero esa') ||
    cleanMsg.includes('quero esse') ||
    cleanMsg.includes('quero essa') ||
    cleanMsg.includes('ese producto') ||
    cleanMsg.includes('esse produto') ||
    cleanMsg.includes('ese de arriba') ||
    cleanMsg.includes('esse aqui') ||
    cleanMsg.includes('me gusta el segundo') ||
    cleanMsg.includes('me gusta la segunda') ||
    cleanMsg.includes('me gusta el primero') ||
    cleanMsg.includes('gostei desse') ||
    cleanMsg.includes('dos de esos') ||
    cleanMsg.includes('dois desses');

  const isAskingBothOrMultiple =
    cleanMsg.includes('solamente esos dos') ||
    cleanMsg.includes('somente esses dois') ||
    cleanMsg.includes('los dos') ||
    cleanMsg.includes('os dois') ||
    cleanMsg.includes('el primero y el segundo') ||
    cleanMsg.includes('o primeiro e o segundo') ||
    cleanMsg.includes('el primero y el tercero') ||
    cleanMsg.includes('o primeiro e o terceiro');

  const isAskingMore =
    cleanMsg.includes('tem mais opcoes') ||
    cleanMsg.includes('tem mais opções') ||
    cleanMsg.includes('tienen más opciones') ||
    cleanMsg.includes('tienen mas opciones') ||
    cleanMsg.includes('tem mais') ||
    cleanMsg.includes('hay más') ||
    cleanMsg.includes('mostrar más') ||
    cleanMsg.includes('mostre mais');

  const isAskingSimilar =
    cleanMsg.includes('algo parecido') ||
    cleanMsg.includes('algo similar') ||
    cleanMsg.includes('tem parecido') ||
    cleanMsg.includes('tienen parecido') ||
    cleanMsg.includes('outro tipo') ||
    cleanMsg.includes('otro parecido');

  const prodsForContext = previousProds.length > 0 ? previousProds : inStockCatalog;

  // If there are products in context or catalog and user makes a contextual reference:
  if (prodsForContext.length > 0 && (isAskingFirst || isAskingSecond || isAskingThird || isAskingThatOne || isAskingBothOrMultiple || isAskingMore || isAskingCheapestContext || isAskingSimilar)) {
    // 5A. "Tem mais opções?" -> Show remaining products
    if (isAskingMore) {
      const shownIds = new Set(prodsForContext.map((p) => p.id));
      const remaining = inStockCatalog.filter((p) => !shownIds.has(p.id));
      const nextBatch = remaining.length > 0 ? remaining.slice(0, 4) : inStockCatalog.slice(0, 4);

      const listStr = nextBatch.map((p, i) => `${i + 1}. **${p.name}** — ${formatBRL(p.price)}`).join('\n');
      const reply = isSpanish
        ? `¡Claro! 😊 Aquí tienes más opciones disponibles en nuestro catálogo:\n\n${listStr}\n\n¿Te interesa conocer detalles de alguna de ellas?`
        : `Com certeza! 😊 Aqui estão mais opções disponíveis em nosso catálogo:\n\n${listStr}\n\nTem interesse em saber mais de alguma delas?`;

      return {
        intent: 'CONTEXTUAL_REFERENCE',
        language: lang,
        targetProducts: nextBatch,
        quantities: {},
        isAskingForMoreOptions: true,
        replyText: reply,
        quickReplies: nextBatch.slice(0, 3).map((p) => (isSpanish ? `Ver ${p.name}` : `Ver ${p.name}`)),
      };
    }

    // 5B. "Tem outra mais barata?"
    if (isAskingCheapestContext) {
      const currentRefPrice = prodsForContext[0]?.price || 9999;
      // Find items cheaper than the referenced item
      const cheaperItems = inStockCatalog
        .filter((p) => p.price < currentRefPrice)
        .sort((a, b) => a.price - b.price);

      if (cheaperItems.length > 0) {
        const topCheaper = cheaperItems.slice(0, 3);
        const lines = topCheaper.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');
        const reply = isSpanish
          ? `¡Sí! Tenemos estas opciones más económicas disponibles:\n\n${lines}\n\n¿Quieres que te prepare la ficha de alguna de ellas?`
          : `Sim! Temos estas opções mais em conta disponíveis:\n\n${lines}\n\nQuer que eu prepare a ficha de alguma delas?`;

        return {
          intent: 'CONTEXTUAL_REFERENCE',
          language: lang,
          targetProducts: topCheaper,
          quantities: {},
          replyText: reply,
          quickReplies: topCheaper.map((p) => (isSpanish ? `Quiero ${p.name}` : `Quero ${p.name}`)),
        };
      } else {
        const cheapestOverall = [...inStockCatalog].sort((a, b) => a.price - b.price)[0];
        const reply = isSpanish
          ? `La opción más económica que tenemos actualmente es **${cheapestOverall.name}** por ${formatBRL(cheapestOverall.price)}. ¿Te gustaría pedirla?`
          : `A opção mais em conta que temos no momento é **${cheapestOverall.name}** por ${formatBRL(cheapestOverall.price)}. Gostaria de pedir?`;

        return {
          intent: 'CONTEXTUAL_REFERENCE',
          language: lang,
          targetProducts: cheapestOverall ? [cheapestOverall] : [],
          quantities: {},
          replyText: reply,
          quickReplies: cheapestOverall ? [(isSpanish ? `Pedir ${cheapestOverall.name}` : `Pedir ${cheapestOverall.name}`)] : [],
        };
      }
    }

    // 5C. "¿Tienes algo parecido?"
    if (isAskingSimilar) {
      const baseProduct = prodsForContext[0];
      const sameCategory = inStockCatalog.filter(
        (p) => p.id !== baseProduct.id && p.category && baseProduct.category && p.category.toLowerCase() === baseProduct.category.toLowerCase()
      );
      const similarOptions = sameCategory.length > 0 ? sameCategory.slice(0, 3) : inStockCatalog.filter((p) => p.id !== baseProduct.id).slice(0, 3);

      if (similarOptions.length > 0) {
        const lines = similarOptions.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');
        const reply = isSpanish
          ? `Similar a **${baseProduct.name}**, tenemos estas excelentes alternativas:\n\n${lines}\n\n¿Cuál de ellas te llama más la atención?`
          : `Parecido com **${baseProduct.name}**, temos estas excelentes alternativas:\n\n${lines}\n\nQual delas chama mais sua atenção?`;

        return {
          intent: 'CONTEXTUAL_REFERENCE',
          language: lang,
          targetProducts: similarOptions,
          quantities: {},
          replyText: reply,
          quickReplies: similarOptions.map((p) => (isSpanish ? `Ver ${p.name}` : `Ver ${p.name}`)),
        };
      }
    }

    // 5D. Multiple selection: "los dos", "el primero y el tercero", "solamente esos dos"
    if (isAskingBothOrMultiple) {
      let selected: CatalogItem[] = [];
      if (cleanMsg.includes('tercero') || cleanMsg.includes('terceiro')) {
        if (prodsForContext[0]) selected.push(prodsForContext[0]);
        if (prodsForContext[2]) selected.push(prodsForContext[2]);
      } else {
        selected = prodsForContext.slice(0, 2);
      }

      const total = selected.reduce((sum, p) => sum + p.price, 0);
      const lines = selected.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');

      // Update cart to these items if user wants to buy only these two
      let cartUpdates: { action: string; items: CartItem[] } | undefined;
      if (cleanMsg.includes('comprar') || cleanMsg.includes('pedir') || cleanMsg.includes('solamente esos dos')) {
        const newCartItems: CartItem[] = selected.map((p) => ({
          id: `cart-${p.id}-${Date.now()}`,
          productId: p.id,
          name: p.name,
          unitPrice: p.price,
          quantity: 1,
          subtotal: p.price,
          saleType: (p.saleType as any) || 'unit',
        }));
        cartUpdates = { action: 'set', items: newCartItems };
      }

      const reply = isSpanish
        ? `¡Perfecto! Preparé tu selección con ambos productos:\n\n${lines}\n\n💰 **Subtotal: ${formatBRL(total)}**\n\n¿Deseas agregarlos al carrito o prefieres cerrar tu pedido ahora?`
        : `Perfeito! Preparei sua seleção com ambos os produtos:\n\n${lines}\n\n💰 **Subtotal: ${formatBRL(total)}**\n\nDeseja adicioná-los ao carrinho ou prefere fechar seu pedido agora?`;

      return {
        intent: 'CONTEXTUAL_REFERENCE',
        language: lang,
        targetProducts: selected,
        quantities: selected.reduce((acc, p) => ({ ...acc, [p.id]: 1 }), {}),
        cartUpdates,
        replyText: reply,
        quickReplies: isSpanish
          ? ['Cerrar pedido', 'Ver carrito', 'Formas de pago']
          : ['Fechar pedido', 'Ver carrinho', 'Formas de pagamento'],
      };
    }

    // 5E. Single item ordinal references: "la primera", "el segundo", "el tercero", "ese"
    let targetIndex = -1;
    if (isAskingFirst) targetIndex = 0;
    else if (isAskingSecond) targetIndex = 1;
    else if (isAskingThird) targetIndex = 2;
    else if (isAskingThatOne) targetIndex = 0;

    if (targetIndex >= 0 && prodsForContext[targetIndex]) {
      const prod = prodsForContext[targetIndex];

      // Detect quantity: e.g. "quiero dos de esos", "agrega 3", "2 unidades"
      let qty = 1;
      const qtyMatch = cleanMsg.match(/(\d+)\s*(?:unidades?|unid|de esos|desses)?/);
      if (qtyMatch && parseInt(qtyMatch[1], 10) > 0 && parseInt(qtyMatch[1], 10) < 100) {
        qty = parseInt(qtyMatch[1], 10);
      } else if (cleanMsg.includes('dos') || cleanMsg.includes('dois')) {
        qty = 2;
      } else if (cleanMsg.includes('tres') || cleanMsg.includes('três')) {
        qty = 3;
      }

      // Check if user asked specifically to add to cart
      let cartUpdates: { action: string; items: CartItem[] } | undefined;
      const isAddToCart =
        cleanMsg.includes('agrega') ||
        cleanMsg.includes('agregar') ||
        cleanMsg.includes('adiciona') ||
        cleanMsg.includes('adicionar') ||
        cleanMsg.includes('ao carrinho') ||
        cleanMsg.includes('al carrito');

      if (isAddToCart) {
        const updatedCart = [...cart];
        const existIdx = updatedCart.findIndex((c) => c.productId === prod.id);
        if (existIdx >= 0) {
          updatedCart[existIdx].quantity += qty;
          updatedCart[existIdx].subtotal = updatedCart[existIdx].quantity * prod.price;
        } else {
          updatedCart.push({
            id: `cart-${prod.id}-${Date.now()}`,
            productId: prod.id,
            name: prod.name,
            unitPrice: prod.price,
            quantity: qty,
            subtotal: prod.price * qty,
            saleType: (prod.saleType as any) || 'unit',
          });
        }
        cartUpdates = { action: 'set', items: updatedCart };
      }

      const totalPrice = prod.price * qty;
      const priceText = `${formatBRL(totalPrice)}${qty > 1 ? ` (${qty}x ${formatBRL(prod.price)})` : ''}`;

      let reply = '';
      if (cleanMsg.includes('cuanto cuesta') || cleanMsg.includes('cuánto cuesta') || cleanMsg.includes('quanto custa') || cleanMsg.includes('quanto e') || cleanMsg.includes('quanto é')) {
        reply = isSpanish
          ? `**${prod.name}** cuesta **${formatBRL(prod.price)}**${prod.saleType === 'weight' ? ' por kg' : ''}.\n\n${prod.description ? `${prod.description}\n\n` : ''}Aquí tienes su ficha individual para agregarla a tu carrito o comprarla directamente.`
          : `**${prod.name}** custa **${formatBRL(prod.price)}**${prod.saleType === 'weight' ? ' por kg' : ''}.\n\n${prod.description ? `${prod.description}\n\n` : ''}Aqui está a ficha individual para adicioná-la ao carrinho ou comprar diretamente.`;
      } else if (isAddToCart) {
        reply = isSpanish
          ? `¡Listo! He agregado **${qty}x ${prod.name}** (${formatBRL(totalPrice)}) a tu carrito. 🛒\n\n¿Quieres agregar algo más o procedemos a finalizar tu compra?`
          : `Pronto! Adicionei **${qty}x ${prod.name}** (${formatBRL(totalPrice)}) ao seu carrinho. 🛒\n\nDeseja adicionar mais algo ou vamos finalizar seu pedido?`;
      } else {
        reply = isSpanish
          ? `¡Excelente elección! **${prod.name}** cuesta **${priceText}**.\n\n${prod.description ? `${prod.description}\n\n` : ''}Aquí tienes su ficha interactiva para elegir cantidades y agregar al carrito o comprar directamente.`
          : `Excelente escolha! **${prod.name}** custa **${priceText}**.\n\n${prod.description ? `${prod.description}\n\n` : ''}Aqui está a ficha interativa para escolher quantidades e adicionar ao carrinho ou comprar diretamente.`;
      }

      return {
        intent: 'CONTEXTUAL_REFERENCE',
        language: lang,
        targetProducts: [prod],
        quantities: { [prod.id]: qty },
        cartUpdates,
        replyText: reply,
        quickReplies: isSpanish
          ? [`Comprar ${prod.name}`, `Agregar ${prod.name}`, 'Ver carrito']
          : [`Comprar ${prod.name}`, `Adicionar ${prod.name}`, 'Ver carrinho'],
      };
    }
  }

  // ----------------------------------------------------
  // Intent 6: Multi-Condition Search & Attribute Filtering
  // (e.g. "camisa negra barata", "algo para hombre por menos de R$100", "algo negro y barato", "camisa prta")
  // ----------------------------------------------------
  // Extract color
  let filterColor: string | null = null;
  if (cleanMsg.includes('negro') || cleanMsg.includes('negra') || cleanMsg.includes('preto') || cleanMsg.includes('preta')) {
    filterColor = 'negro';
  } else if (cleanMsg.includes('blanco') || cleanMsg.includes('blanca') || cleanMsg.includes('branco') || cleanMsg.includes('branca')) {
    filterColor = 'blanco';
  } else if (cleanMsg.includes('rojo') || cleanMsg.includes('roja') || cleanMsg.includes('vermelho') || cleanMsg.includes('vermelha')) {
    filterColor = 'rojo';
  } else if (cleanMsg.includes('azul')) {
    filterColor = 'azul';
  }

  // Extract target audience / gender
  let filterGender: string | null = null;
  if (cleanMsg.includes('hombre') || cleanMsg.includes('masculino') || cleanMsg.includes('masculina') || cleanMsg.includes('homem')) {
    filterGender = 'hombre';
  } else if (cleanMsg.includes('mujer') || cleanMsg.includes('femenino') || cleanMsg.includes('feminina') || cleanMsg.includes('mulher')) {
    filterGender = 'mujer';
  }

  // Extract price ceiling (e.g. "por menos de 100", "até 80", "hasta 100")
  let priceCeiling: number | null = null;
  const priceMatch = cleanMsg.match(/(?:menos de|hasta|ate|até|por menos de)\s*(?:r\$)?\s*(\d+)/i);
  if (priceMatch && parseFloat(priceMatch[1]) > 0) {
    priceCeiling = parseFloat(priceMatch[1]);
  }

  // Check if user requested cheap / economical
  const wantsCheap =
    cleanMsg.includes('barato') ||
    cleanMsg.includes('barata') ||
    cleanMsg.includes('economico') ||
    cleanMsg.includes('económico') ||
    cleanMsg.includes('mais em conta') ||
    cleanMsg.includes('mas barata') ||
    cleanMsg.includes('más barata') ||
    cleanMsg.includes('mas barato') ||
    cleanMsg.includes('más barato');

  // Check category or general semantic term:
  // "camisa", "pantalon", "zapato", "calzado", "sandalia", "dulce", "carne", "bebida"
  const semanticTerms = [
    { key: 'camisa', matches: ['camisa', 'camiseta', 'remera', 'blusa', 't-shirt', 'ropa'] },
    { key: 'pantalon', matches: ['pantalon', 'pantalón', 'calça', 'calca', 'jeans', 'bermuda'] },
    { key: 'calzado', matches: ['zapato', 'calzado', 'sapato', 'tenis', 'tênis', 'sandalia', 'sandália', 'chinelo'] },
    { key: 'dulce', matches: ['dulce', 'postre', 'torta', 'chocolate', 'alfajor', 'doce', 'sobremesa', 'pudim'] },
    { key: 'carne', matches: ['carne', 'asado', 'churrasco', 'picanha', 'corte'] },
    { key: 'bebida', matches: ['bebida', 'refrigerante', 'jugo', 'suco', 'agua', 'água', 'cerveza', 'coca'] },
  ];

  let matchedSemanticKey: string | null = null;
  for (const term of semanticTerms) {
    if (term.matches.some((m) => cleanMsg.includes(m))) {
      matchedSemanticKey = term.key;
      break;
    }
  }

  // If user requested conditions (color, gender, price ceiling, cheap, or semantic terms)
  if (filterColor || filterGender || priceCeiling !== null || wantsCheap || matchedSemanticKey) {
    let candidates = [...inStockCatalog];

    // Filter by semantic category if detected
    if (matchedSemanticKey) {
      const termDef = semanticTerms.find((t) => t.key === matchedSemanticKey);
      if (termDef) {
        const matchingCatProds = candidates.filter((p) => {
          const fullPText = `${p.name} ${p.category || ''} ${p.description || ''} ${(p.features || []).join(' ')}`.toLowerCase();
          return termDef.matches.some((m) => fullPText.includes(m));
        });
        candidates = matchingCatProds;
      }
    }

    // Filter by color
    if (filterColor) {
      const colorSynonyms: Record<string, string[]> = {
        negro: ['negro', 'negra', 'preto', 'preta', 'black', 'oscuro'],
        blanco: ['blanco', 'blanca', 'branco', 'branca', 'white'],
        rojo: ['rojo', 'roja', 'vermelho', 'vermelha', 'red'],
        azul: ['azul', 'blue'],
      };
      const syns = colorSynonyms[filterColor] || [filterColor];
      const colorMatches = candidates.filter((p) => {
        const fullPText = `${p.name} ${p.description || ''} ${(p.features || []).join(' ')} ${(p.variations || []).join(' ')}`.toLowerCase();
        return syns.some((s) => fullPText.includes(s));
      });
      if (colorMatches.length > 0) {
        candidates = colorMatches;
      }
    }

    // Filter by gender / target
    if (filterGender) {
      const genderSyns = filterGender === 'hombre'
        ? ['hombre', 'masculino', 'masculina', 'homem', 'men']
        : ['mujer', 'femenino', 'feminina', 'mulher', 'women', 'dama'];
      const genderMatches = candidates.filter((p) => {
        const fullPText = `${p.name} ${p.category || ''} ${p.description || ''} ${(p.features || []).join(' ')}`.toLowerCase();
        return genderSyns.some((s) => fullPText.includes(s));
      });
      if (genderMatches.length > 0) {
        candidates = genderMatches;
      }
    }

    // Filter by price ceiling
    if (priceCeiling !== null) {
      const priceMatches = candidates.filter((p) => p.price <= priceCeiling!);
      if (priceMatches.length > 0) {
        candidates = priceMatches;
      }
    }

    // Sort by cheapest if requested
    if (wantsCheap) {
      candidates.sort((a, b) => a.price - b.price);
    }

    if (candidates.length > 0) {
      const topMatches = candidates.slice(0, 3);
      const lines = topMatches.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');

      let reply = '';
      if (wantsCheap && filterColor) {
        reply = isSpanish
          ? `¡Claro! 😊 Estas son las opciones en color **${filterColor}** más económicas que tenemos disponibles en **${config.name}**:\n\n${lines}\n\n¿Quieres que prepare la ficha de alguna para ti?`
          : `Com certeza! 😊 Estas são as opções na cor **${filterColor === 'negro' ? 'preta' : filterColor}** mais em conta que temos disponíveis na **${config.name}**:\n\n${lines}\n\nQuer que eu prepare a ficha de alguma delas para você?`;
      } else if (priceCeiling !== null) {
        reply = isSpanish
          ? `¡Excelente! Encontramos estas opciones por menos de **${formatBRL(priceCeiling)}** en **${config.name}**:\n\n${lines}\n\n¿Cuál de ellas te gustaría pedir?`
          : `Excelente! Encontramos estas opções por menos de **${formatBRL(priceCeiling)}** na **${config.name}**:\n\n${lines}\n\nQual delas você gostaria de pedir?`;
      } else if (wantsCheap) {
        reply = isSpanish
          ? `¡Por supuesto! 😊 Tenemos estas opciones muy accesibles en **${config.name}**:\n\n${lines}\n\n¿Te gustaría ver alguna en detalle?`
          : `Com certeza! 😊 Temos estas ótimas opções bem acessíveis na **${config.name}**:\n\n${lines}\n\nGostaria de ver alguma delas em detalhes?`;
      } else {
        reply = isSpanish
          ? `¡Encontré estas opciones que coinciden con lo que buscas! 🎯\n\n${lines}\n\n¿Deseas agregar alguna al carrito o consultar más detalles?`
          : `Encontrei estas opções que combinam com o que você procura! 🎯\n\n${lines}\n\nDeseja adicionar alguma ao carrinho ou ver mais detalhes?`;
      }

      return {
        intent: 'MULTI_CONDITION_SEARCH',
        language: lang,
        targetProducts: topMatches,
        quantities: {},
        replyText: reply,
        quickReplies: topMatches.map((p) => (isSpanish ? `Pedir ${p.name}` : `Pedir ${p.name}`)),
      };
    } else {
      const reply = isSpanish
        ? `No encontré ese producto específico en nuestro catálogo actual de **${config.name}**. 😊\n\n¿Te gustaría ver los productos que tenemos disponibles o estás buscando algo en particular?`
        : `Não encontrei esse produto específico no catálogo atual da **${config.name}**. 😊\n\nGostaria de ver os produtos que temos disponíveis ou está procurando algo em particular?`;

      return {
        intent: 'CATALOG_BROWSE',
        language: lang,
        targetProducts: inStockCatalog.slice(0, 3),
        quantities: {},
        replyText: reply,
        quickReplies: isSpanish
          ? ['Ver catálogo completo', 'Formas de pago', 'Horario de atención']
          : ['Ver catálogo completo', 'Formas de pagamento', 'Horário de funcionamento'],
      };
    }
  }

  // ----------------------------------------------------
  // Intent 7: Specific Product Search by Name or Distinct Keywords
  // ----------------------------------------------------
  const matchedDirectProds: { product: CatalogItem; qty: number }[] = [];
  for (const prod of visibleCatalog) {
    const pName = prod.name.toLowerCase().trim();
    const pWords = pName.split(/\s+/).filter((w) => w.length > 2);

    const exactMatch = cleanMsg.includes(pName);
    const wordsMatch = pWords.length > 1 && pWords.every((w) => new RegExp(`\\b${w}\\b`, 'i').test(cleanMsg));
    const singleWordMatch = pWords.length === 1 && new RegExp(`\\b${pWords[0]}\\b`, 'i').test(cleanMsg);

    if (exactMatch || wordsMatch || singleWordMatch) {
      let qty = 1;
      const qtyMatch = cleanMsg.match(new RegExp(`(\\d+)\\s*(?:unidades?|unid|x)?\\s*(?:de\\s+)?${pWords[0]}?`, 'i'));
      if (qtyMatch && parseInt(qtyMatch[1], 10) > 0 && parseInt(qtyMatch[1], 10) < 500) {
        qty = parseInt(qtyMatch[1], 10);
      }
      matchedDirectProds.push({ product: prod, qty });
    }
  }

  if (matchedDirectProds.length > 0) {
    if (matchedDirectProds.length === 1) {
      const { product: prod, qty } = matchedDirectProds[0];
      const stockQty = prod.stockQuantity !== undefined ? prod.stockQuantity : (prod.inStock ? 10 : 0);
      const isEsgotado = stockQty === 0 || prod.status === 'esgotado' || !prod.inStock;

      if (isEsgotado) {
        const reply = isSpanish
          ? `El producto **${prod.name}** se encuentra agotado temporalmente en **${config.name}**. ¿Te gustaría consultar otras opciones disponibles?`
          : `O produto **${prod.name}** está esgotado temporariamente na **${config.name}**. Gostaria de ver outras opções disponíveis?`;

        return {
          intent: 'SPECIFIC_PRODUCT',
          language: lang,
          targetProducts: [prod],
          quantities: {},
          replyText: reply,
          quickReplies: isSpanish ? ['Ver otras opciones', 'Ver catálogo'] : ['Ver outras opções', 'Ver catálogo'],
        };
      }

      const total = prod.price * qty;
      const priceStr = formatBRL(total);

      const reply = isSpanish
        ? qty > 1
          ? `¡Excelente elección! Preparé la ficha de **${prod.name}** con **${qty} unidades** por un total de **${priceStr}** (${formatBRL(prod.price)} c/u).\n\n${
              prod.description ? `${prod.description}\n\n` : ''
            }Puedes pulsar **Agregar** al carrito o **Comprar** directamente a continuación.`
          : `Tenemos disponible **${prod.name}** por **${formatBRL(prod.price)}**${prod.saleType === 'weight' ? ' / kg' : ''}.\n\n${
              prod.description ? `${prod.description}\n\n` : ''
            }Aquí tienes su ficha para agregarlo a tu carrito o comprarlo directamente. ¿Cuántas unidades te gustaría llevar?`
        : qty > 1
        ? `Excelente escolha! Preparei a ficha de **${prod.name}** com **${qty} unidades** no total de **${priceStr}** (${formatBRL(prod.price)} cada).\n\n${
            prod.description ? `${prod.description}\n\n` : ''
          }Você pode clicar em **Adicionar** ao carrinho ou **Comprar** diretamente abaixo.`
        : `Temos disponível **${prod.name}** por **${formatBRL(prod.price)}**${prod.saleType === 'weight' ? ' / kg' : ''}.\n\n${
            prod.description ? `${prod.description}\n\n` : ''
          }Aqui está a ficha para adicionar ao seu carrinho ou comprar diretamente. Quantas unidades você gostaria?`;

      return {
        intent: 'SPECIFIC_PRODUCT',
        language: lang,
        targetProducts: [prod],
        quantities: { [prod.id]: qty },
        replyText: reply,
        quickReplies: isSpanish
          ? [`Comprar ${prod.name}`, `Agregar ${prod.name}`, 'Formas de pago']
          : [`Comprar ${prod.name}`, `Adicionar ${prod.name}`, 'Formas de pagamento'],
      };
    } else {
      const prods = matchedDirectProds.map((m) => m.product);
      const lines = prods.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');
      const reply = isSpanish
        ? `¡Encontré los productos que consultaste! 🛍️\n\n${lines}\n\nPuedes ajustar la cantidad de cada uno y agregarlos al carrito.`
        : `Encontrei os produtos que você consultou! 🛍️\n\n${lines}\n\nVocê pode ajustar a quantidade de cada um e adicionar ao carrinho.`;

      return {
        intent: 'SPECIFIC_PRODUCT',
        language: lang,
        targetProducts: prods,
        quantities: matchedDirectProds.reduce((acc, m) => ({ ...acc, [m.product.id]: m.qty }), {}),
        replyText: reply,
        quickReplies: isSpanish ? ['Ver carrito', 'Formas de pago'] : ['Ver carrinho', 'Formas de pagamento'],
      };
    }
  }

  // ----------------------------------------------------
  // Intent 8: Asking for an item that is not in the catalog
  // ("Quiero una camisa azul", "tienen coca cola", etc.)
  // NEVER say bluntly "Ese producto no se encuentra"!
  // Instead: check similar products or offer polite helpful alternatives
  // ----------------------------------------------------
  const isAskingSpecificNonExistent = /(?:cuanto cuesta|cuánto cuesta|precio de|precio del|tienen|tienes|venden|hay|quiero|busco|tem|têm|qual o valor)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ0-9\s]{3,30})/i.test(cleanMsg);

  if (isAskingSpecificNonExistent) {
    // Look for partial similarity or similar categories
    const words = tokens.filter((w) => w.length > 3 && !['quiero', 'tienen', 'tienes', 'venden', 'precio', 'cuanto', 'cuánto', 'cuesta'].includes(w));
    const similarProducts = visibleCatalog.filter((p) => {
      const pFull = `${p.name} ${p.category || ''} ${p.description || ''}`.toLowerCase();
      return words.some((w) => pFull.includes(w));
    });

    if (similarProducts.length > 0) {
      const topSimilar = similarProducts.slice(0, 3);
      const lines = topSimilar.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');
      const reply = isSpanish
        ? `En este momento no tenemos exactamente ese modelo en **${config.name}**, pero tenemos estas excelentes opciones similares disponibles:\n\n${lines}\n\n¿Te gustaría ver alguna de ellas?`
        : `No momento não temos exatamente esse modelo na **${config.name}**, mas temos estas ótimas opções similares disponíveis:\n\n${lines}\n\nGostaria de ver alguma delas?`;

      return {
        intent: 'MULTI_CONDITION_SEARCH',
        language: lang,
        targetProducts: topSimilar,
        quantities: {},
        replyText: reply,
        quickReplies: topSimilar.map((p) => (isSpanish ? `Ver ${p.name}` : `Ver ${p.name}`)),
      };
    } else {
      // Gentle helpful alternative
      const preview = inStockCatalog.slice(0, 3);
      const lines = preview.map((p) => `• **${p.name}** — ${formatBRL(p.price)}`).join('\n');
      const reply = isSpanish
        ? `No encontré ese producto específico en nuestro catálogo actual de **${config.name}**. 😊\n\n¿Te gustaría ver los productos que tenemos disponibles o estás buscando algo en particular?`
        : `Não encontrei esse produto específico no nosso catálogo atual da **${config.name}**. 😊\n\nGostaria de ver as opções que temos disponíveis ou está procurando algo em particular?`;

      return {
        intent: 'CATALOG_BROWSE',
        language: lang,
        targetProducts: preview,
        quantities: {},
        replyText: reply,
        quickReplies: isSpanish
          ? ['Ver catálogo completo', 'Formas de pago', 'Horario de atención']
          : ['Ver catálogo completo', 'Formas de pagamento', 'Horário de atendimento'],
      };
    }
  }

  // ----------------------------------------------------
  // Intent 9: Greetings ("Hola", "Buenas", "Olá", "Bom dia")
  // ----------------------------------------------------
  if (
    cleanMsg === 'hola' ||
    cleanMsg === 'buenas' ||
    cleanMsg === 'buen dia' ||
    cleanMsg === 'buenos dias' ||
    cleanMsg === 'buenas tardes' ||
    cleanMsg === 'buenas noches' ||
    cleanMsg === 'olá' ||
    cleanMsg === 'ola' ||
    cleanMsg === 'oi' ||
    cleanMsg === 'bom dia' ||
    cleanMsg === 'boa tarde' ||
    cleanMsg === 'boa noite' ||
    cleanMsg.length <= 10
  ) {
    const preview = inStockCatalog.slice(0, 3);
    const reply = isSpanish
      ? `¡Hola! Te damos la bienvenida a **${config.name}**. Soy ${config.botName || 'tu asistente comercial'}. 😊\n\n¿Qué te gustaría ver hoy? Puedes consultarme sobre nuestros productos disponibles, formas de pago o envíos.`
      : `Olá! Seja muito bem-vindo à **${config.name}**. Sou ${config.botName || 'seu consultor virtual'}. 😊\n\nO que você gostaria de ver hoje? Pode me perguntar sobre nossos produtos disponíveis, formas de pagamento ou entrega.`;

    return {
      intent: 'GREETING',
      language: lang,
      targetProducts: preview,
      quantities: {},
      replyText: reply,
      quickReplies: isSpanish
        ? ['¿Qué tienes disponible?', 'Ver catálogo', 'Formas de pago']
        : ['O que tem disponível?', 'Ver catálogo', 'Formas de pagamento'],
    };
  }

  // ----------------------------------------------------
  // Intent 10: Fallback Inteligente (Clarifying Question, NEVER "Ese producto no se encuentra")
  // ----------------------------------------------------
  const fallbackPreview = inStockCatalog.slice(0, 3);
  const reply = isSpanish
    ? `¡Hola! 😊 ¿Estás buscando algún producto específico o te gustaría ver todo nuestro catálogo disponible en **${config.name}**?`
    : `Olá! 😊 Você está procurando algum produto específico ou gostaria de ver nosso catálogo disponível na **${config.name}**?`;

  return {
    intent: 'CATALOG_BROWSE',
    language: lang,
    targetProducts: fallbackPreview,
    quantities: {},
    replyText: reply,
    quickReplies: isSpanish
      ? ['¿Qué tienes disponible?', 'Ver catálogo completo', 'Formas de pago']
      : ['O que tem disponível?', 'Ver catálogo completo', 'Formas de pagamento'],
  };
}
