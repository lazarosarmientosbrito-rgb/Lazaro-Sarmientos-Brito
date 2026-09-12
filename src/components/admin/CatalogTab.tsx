import React, { useState, useRef } from 'react';
import { CatalogItem, ProductStatus } from '../../types';
import { formatBRL, getCurrencySymbol } from '../../utils/formatters';
import { compressImageToDataUrl } from '../../utils/imageOptimizer';
import { BulkProductImportModal } from './BulkProductImportModal';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Star, 
  ShoppingBag, 
  Tag, 
  Layers,
  EyeOff,
  Package,
  MinusCircle,
  PlusCircle,
  Camera,
  UploadCloud,
  Image as ImageIcon,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  AlertCircle,
  X,
  Info,
  Check,
  Scale
} from 'lucide-react';
import { convertGramsToKg, calculateWeightPrice, formatWeightDisplay } from '../../utils/weightCalculators';

interface CatalogTabProps {
  catalog: CatalogItem[];
  onAddItem: (item: Omit<CatalogItem, 'id'>) => void;
  onAddMultipleItems?: (items: CatalogItem[]) => Promise<void>;
  onUpdateItem: (item: CatalogItem) => void;
  onDeleteItem: (id: string) => void;
  currency: string;
  businessCategory?: string;
}

export const CatalogTab: React.FC<CatalogTabProps> = ({
  catalog,
  onAddItem,
  onAddMultipleItems,
  onUpdateItem,
  onDeleteItem,
  currency = 'BRL',
  businessCategory = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('TODOS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Geral');
  const [price, setPrice] = useState<number | string>(0);
  const [originalPrice, setOriginalPrice] = useState<number | string | undefined>(undefined);
  const [description, setDescription] = useState('');
  const [features, setFeatures] = useState<string>('');
  const [inStock, setInStock] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [popular, setPopular] = useState(false);
  const [sku, setSku] = useState('');
  const [variations, setVariations] = useState('');
  const [availability, setAvailability] = useState('Pronta entrega');
  const [stockQuantity, setStockQuantity] = useState<number | string>(10);
  const [minStock, setMinStock] = useState<number | string>(3);
  const [maxStock, setMaxStock] = useState<number | string>(100);
  const [stockControlEnabled, setStockControlEnabled] = useState<boolean>(true);
  const [status, setStatus] = useState<ProductStatus>('disponivel');
  const [saleType, setSaleType] = useState<'unit' | 'weight'>('unit');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'g'>('kg');
  const [additionalInfo, setAdditionalInfo] = useState<string>('');

  // Form validation errors state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Field element refs for smooth scrolling & auto-focus
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const categoryInputRef = useRef<HTMLInputElement | null>(null);
  const stockQuantityInputRef = useRef<HTMLInputElement | null>(null);
  const priceInputRef = useRef<HTMLInputElement | null>(null);
  const descriptionInputRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const formScrollContainerRef = useRef<HTMLDivElement | null>(null);

  const categories = ['TODOS', ...Array.from(new Set(catalog.map((i) => i.category)))];

  const handleImageFile = async (file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    setIsProcessingImage(true);

    try {
      const compressedUrl = await compressImageToDataUrl(file, 400, 0.65);
      if (compressedUrl) {
        setImageUrl(compressedUrl);
      }
    } catch (err) {
      console.warn('Error processing image:', err);
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageFile(file);
    }
    // reset value so re-selecting same file triggers change
    e.target.value = '';
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setCategory('Cosméticos');
    setPrice(65.00);
    setOriginalPrice(79.90);
    setDescription('');
    setFeatures('Alta durabilidade, Uso profissional, Embalagem reciclável');
    setInStock(true);
    setImageUrl('');
    setPopular(true);
    setSku('PROD-001');
    setVariations('Fixação Forte, Fixação Média');
    setAvailability('Pronta entrega');
    setStockQuantity(10);
    setMinStock(3);
    setMaxStock(100);
    setStockControlEnabled(true);
    setStatus('disponivel');
    setSaleType('unit');
    setWeightUnit('kg');
    setAdditionalInfo('');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(item.price);
    setOriginalPrice(item.originalPrice);
    setDescription(item.description);
    setFeatures(item.features ? item.features.join(', ') : '');
    setInStock(item.inStock);
    setImageUrl(item.imageUrl);
    setPopular(!!item.popular);
    setSku(item.sku || '');
    setVariations(item.variations ? item.variations.join(', ') : '');
    setAvailability(item.availability || 'Pronta entrega');
    setStockQuantity(item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0));
    setMinStock(item.minStock !== undefined ? item.minStock : 3);
    setMaxStock(item.maxStock !== undefined ? item.maxStock : 100);
    setStockControlEnabled(item.stockControlEnabled !== undefined ? item.stockControlEnabled : true);
    setStatus(item.status || (item.stockQuantity === 0 ? 'esgotado' : (item.inStock ? 'disponivel' : 'esgotado')));
    setSaleType(item.saleType || 'unit');
    setWeightUnit(item.weightUnit || 'kg');
    setAdditionalInfo(item.additionalInfo || '');
    setErrors({});
    setIsModalOpen(true);
  };

  const handleStockQuantityChange = (val: number | string) => {
    const numericVal = typeof val === 'string' ? (val === '' ? '' : Number(val)) : val;
    if (numericVal === '') {
      setStockQuantity('');
      return;
    }
    const qty = Math.max(0, Math.floor(Number(numericVal)));
    setStockQuantity(qty);
    if (qty === 0) {
      setStatus('esgotado');
      setInStock(false);
    } else if (status === 'esgotado') {
      setStatus('disponivel');
      setInStock(true);
    }
    if (errors.stockQuantity) {
      setErrors(prev => ({ ...prev, stockQuantity: '' }));
    }
  };

  const handleStatusChange = (newStatus: ProductStatus) => {
    setStatus(newStatus);
    if (newStatus === 'esgotado') {
      setStockQuantity(0);
      setInStock(false);
    } else if (newStatus === 'disponivel') {
      setInStock(true);
      if (Number(stockQuantity) === 0) setStockQuantity(5);
    }
  };

  const handleRecordSaleSingle = (item: CatalogItem) => {
    const currentQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
    const newQty = Math.max(0, currentQty - 1);
    const newStatus: ProductStatus = newQty === 0 ? 'esgotado' : item.status;
    const newInStock = newQty > 0;

    onUpdateItem({
      ...item,
      stockQuantity: newQty,
      status: newStatus,
      inStock: newInStock,
      availability: newQty === 0 ? 'Esgotado' : (item.availability || 'Pronta entrega')
    });
  };

  const handleQuickAddStock = (item: CatalogItem) => {
    const currentQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
    const newQty = currentQty + 5;
    const newStatus: ProductStatus = item.status === 'esgotado' ? 'disponivel' : item.status;

    onUpdateItem({
      ...item,
      stockQuantity: newQty,
      status: newStatus,
      inStock: true,
    });
  };

  // Helper to ensure keyboard visibility without obscuring the active input on mobile devices
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.currentTarget;
    setTimeout(() => {
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 160);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Rigorous Field Validation
    const newErrors: Record<string, string> = {};

    if (!name || !name.trim()) {
      newErrors.name = 'El nombre del producto es obligatorio.';
    }

    if (!category || !category.trim()) {
      newErrors.category = 'La categoría del producto es obligatoria.';
    }

    const parsedStock = Number(stockQuantity);
    if (stockQuantity === '' || stockQuantity === undefined || isNaN(parsedStock) || parsedStock < 0) {
      newErrors.stockQuantity = 'Indica una cantidad de stock válida (0 o más).';
    }

    const parsedPrice = Number(price);
    if (price === '' || price === undefined || isNaN(parsedPrice) || parsedPrice < 0) {
      newErrors.price = 'Ingresa un precio válido (mayor o igual a 0).';
    }

    if (!description || !description.trim()) {
      newErrors.description = 'La descripción es obligatoria para que el Vendedor IA brinde respuestas precisas.';
    }

    // 2. If validation fails, scroll smoothly to the first missing field and focus it
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Logical order of fields to focus
      const fieldSequence: Array<{ key: string; ref: React.RefObject<HTMLElement | null> }> = [
        { key: 'name', ref: nameInputRef },
        { key: 'category', ref: categoryInputRef },
        { key: 'stockQuantity', ref: stockQuantityInputRef },
        { key: 'price', ref: priceInputRef },
        { key: 'description', ref: descriptionInputRef },
      ];

      const firstError = fieldSequence.find((f) => !!newErrors[f.key]);

      if (firstError && firstError.ref.current) {
        const el = firstError.ref.current;
        // Smooth scroll the field to center
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Focus with slight delay to ensure smooth scrolling initiates
        setTimeout(() => {
          try {
            el.focus({ preventScroll: true });
          } catch {
            el.focus();
          }
        }, 150);
      }
      return;
    }

    // 3. Clear errors and proceed
    setErrors({});

    const featureArray = features.split(',').map((f) => f.trim()).filter((f) => f.length > 0);
    const variationArray = variations.split(',').map((v) => v.trim()).filter((v) => v.length > 0);

    const finalStock = Math.max(0, Math.floor(Number(stockQuantity) || 0));
    const finalStatus: ProductStatus = finalStock === 0 && status !== 'oculto' ? 'esgotado' : status;
    const finalInStock = finalStock > 0 && finalStatus !== 'esgotado';

    const finalImageUrl = imageUrl.trim() || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80';

    if (editingItem) {
      onUpdateItem({
        ...editingItem,
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        description: description.trim(),
        features: featureArray,
        inStock: finalInStock,
        imageUrl: finalImageUrl,
        popular,
        sku: sku.trim(),
        variations: variationArray,
        availability,
        stockQuantity: finalStock,
        minStock: Number(minStock) || 0,
        maxStock: Number(maxStock) || 0,
        stockControlEnabled,
        status: finalStatus,
        saleType,
        weightUnit: saleType === 'weight' ? weightUnit : undefined,
        pricePerKg: saleType === 'weight' ? Number(price) : undefined,
        additionalInfo: additionalInfo.trim() || undefined,
      });
    } else {
      onAddItem({
        name: name.trim(),
        category: category.trim(),
        price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : undefined,
        description: description.trim(),
        features: featureArray,
        inStock: finalInStock,
        imageUrl: finalImageUrl,
        popular,
        sku: sku.trim(),
        variations: variationArray,
        availability,
        stockQuantity: finalStock,
        minStock: Number(minStock) || 0,
        maxStock: Number(maxStock) || 0,
        stockControlEnabled,
        status: finalStatus,
        saleType,
        weightUnit: saleType === 'weight' ? weightUnit : undefined,
        pricePerKg: saleType === 'weight' ? Number(price) : undefined,
        additionalInfo: additionalInfo.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'TODOS' || item.category === selectedCategory;
    
    const itemStatus = item.status || (item.stockQuantity === 0 ? 'esgotado' : (item.inStock ? 'disponivel' : 'esgotado'));
    const matchesStatus =
      selectedStatusFilter === 'TODOS' ||
      (selectedStatusFilter === 'DISPONIVEL' && itemStatus === 'disponivel') ||
      (selectedStatusFilter === 'ESGOTADO' && itemStatus === 'esgotado') ||
      (selectedStatusFilter === 'OCULTO' && itemStatus === 'oculto');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs uppercase tracking-widest mb-1">
              <ShoppingBag className="w-4 h-4" />
              <span>Gestão de Catálogo de Produtos em R$</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Produtos & Estoque (BRL)</h2>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl">
              Cadastre e gerencie os produtos comercializados pela sua empresa. A IA utilizará exclusivamente essas informações no atendimento.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Botão de Carga Masiva com IA */}
            <button
              onClick={() => setIsBulkModalOpen(true)}
              className="bg-gradient-to-r from-indigo-600 via-blue-600 to-sky-600 hover:from-indigo-500 hover:via-blue-500 hover:to-sky-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-blue-900/40 flex items-center justify-center space-x-2 transition-all active:scale-95 border border-blue-400/30"
              title="Importar produtos em lote via Excel, CSV ou texto livre interpretado por IA"
            >
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>📦 Carga masiva de productos</span>
            </button>

            {/* Botão individual Cadastrar Produto */}
            <button
              onClick={handleOpenAddModal}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs shadow-md flex items-center justify-center space-x-2 transition-all active:scale-95 border border-slate-700"
            >
              <Plus className="w-4 h-4 text-blue-400" />
              <span>Cadastrar Produto</span>
            </button>
          </div>
        </div>
      </div>

      {/* Search & Category Filter */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar produto por nome, SKU ou descrição..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Categoria:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center space-x-2 pt-2 border-t border-slate-100 overflow-x-auto">
          <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Status:</span>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'DISPONIVEL', label: 'Disponíveis' },
            { id: 'ESGOTADO', label: 'Esgotados' },
            { id: 'OCULTO', label: 'Ocultos (Invisíveis)' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setSelectedStatusFilter(st.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap border transition-all ${
                selectedStatusFilter === st.id
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCatalog.map((item) => {
          const itemQty = item.stockQuantity !== undefined ? item.stockQuantity : (item.inStock ? 10 : 0);
          const itemStatus: ProductStatus = item.status || (itemQty === 0 ? 'esgotado' : (item.inStock ? 'disponivel' : 'esgotado'));

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between ${
                itemStatus === 'oculto' ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
              }`}
            >
              <div>
                <div className="relative h-44 rounded-xl overflow-hidden mb-3 bg-slate-100 border border-slate-100">
                  <img
                    src={item.imageUrl || 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80'}
                    alt={item.name}
                    className={`w-full h-full object-cover ${itemStatus === 'oculto' ? 'opacity-70 grayscale' : ''}`}
                  />
                  <span className="absolute top-2 left-2 text-[10px] font-bold text-slate-800 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md uppercase border border-slate-200 shadow-sm">
                    {item.category}
                  </span>

                  {/* Status Badge */}
                  <span
                    className={`absolute top-2 right-2 text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md ${
                      itemStatus === 'disponivel'
                        ? 'bg-emerald-500 text-white'
                        : itemStatus === 'oculto'
                        ? 'bg-purple-700 text-white'
                        : 'bg-rose-600 text-white'
                    }`}
                  >
                    {itemStatus === 'disponivel' && <CheckCircle2 className="w-3 h-3" />}
                    {itemStatus === 'esgotado' && <XCircle className="w-3 h-3" />}
                    {itemStatus === 'oculto' && <EyeOff className="w-3 h-3" />}
                    <span>
                      {itemStatus === 'disponivel' ? 'Disponível' : itemStatus === 'oculto' ? 'Oculto' : 'Esgotado'}
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 text-base">{item.name}</h3>
                  <div className="flex items-center gap-1">
                    {item.saleType === 'weight' && (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Scale className="w-3 h-3 text-emerald-600" /> Por peso
                      </span>
                    )}
                    {item.popular && (
                      <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> Destaque
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-slate-500 text-xs mt-1 line-clamp-2">{item.description}</p>

                {/* Stock Quantity Display & Controls */}
                <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Package className={`w-4 h-4 ${itemQty > 0 ? 'text-blue-600' : 'text-rose-500'}`} />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block uppercase">Quantidade em estoque</span>
                      <span className={`text-xs font-bold ${itemQty === 0 ? 'text-rose-600 font-mono' : 'text-slate-900 font-mono'}`}>
                        {itemQty} {item.saleType === 'weight' ? 'kg em estoque' : (itemQty === 1 ? 'unidade' : 'unidades')} {itemQty === 0 ? '(Esgotado)' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Stock quick adjustments for testing */}
                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleRecordSaleSingle(item)}
                      disabled={itemQty === 0}
                      className="px-2 py-1 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-md text-[10px] font-bold shadow-xs transition-all flex items-center gap-1"
                      title="Simular Venda (-1 no estoque)"
                    >
                      <MinusCircle className="w-3 h-3" />
                      <span>-1 {item.saleType === 'weight' ? 'kg' : 'Venda'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleQuickAddStock(item)}
                      className="p-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-md transition-all"
                      title="Repor Estoque (+5)"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.sku && (
                  <span className="text-[10px] font-mono text-slate-400 block mt-2">
                    SKU: {item.sku}
                  </span>
                )}

                {item.variations && item.variations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {item.variations.map((v, idx) => (
                      <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">
                        {v}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold flex items-center gap-1">
                    {item.saleType === 'weight' ? (
                      <>
                        <Scale className="w-3 h-3 text-emerald-600" />
                        <span>Preço por kg</span>
                      </>
                    ) : (
                      <span>Preço em R$</span>
                    )}
                  </span>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-lg font-black text-emerald-600">
                      {formatBRL(item.price)}
                      {item.saleType === 'weight' && <span className="text-xs font-bold text-slate-500"> / kg</span>}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-xs text-slate-400 line-through">
                        {formatBRL(item.originalPrice)}
                      </span>
                    )}
                  </div>
                  {item.saleType === 'weight' && (
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      500g = {formatBRL(item.price * 0.5)} • 750g = {formatBRL(item.price * 0.75)}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4 overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-modal-title"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[92dvh] sm:max-h-[88vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Fixed Modal Header */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white sticky top-0 z-20">
              <h3 id="product-modal-title" className="font-bold text-slate-900 text-sm sm:text-base flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Tag className="w-4 h-4" />
                </div>
                <span>{editingItem ? 'Editar Producto' : 'Cadastrar Produto'}</span>
              </h3>
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)} 
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center transition-colors"
                aria-label="Cerrar ventana"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Container with independent scrolling */}
            <form 
              id="product-form"
              noValidate
              onSubmit={handleSubmit} 
              className="flex flex-col flex-1 overflow-hidden min-h-0"
            >
              {/* Scrollable Form Body */}
              <div 
                ref={formScrollContainerRef}
                className="overflow-y-auto flex-1 px-5 sm:px-6 py-4 space-y-4 text-xs overscroll-contain touch-pan-y"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {/* Validation Summary Banner if errors exist */}
                {Object.keys(errors).length > 0 && (
                  <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-rose-800 text-xs animate-in fade-in slide-in-from-top-1 duration-150">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Completa los campos obligatorios</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Te hemos desplazado automáticamente hasta el primer campo pendiente para que lo completes.
                      </p>
                    </div>
                  </div>
                )}

                {/* 1. Nome do Produto */}
                <div id="group-name" className="space-y-1">
                  <label htmlFor="product-name" className="block font-bold text-slate-700">
                    Nome do Produto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="product-name"
                    ref={nameInputRef}
                    type="text"
                    value={name}
                    onFocus={handleInputFocus}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                    }}
                    placeholder="Ex. Pomada Modeladora Matte 150g"
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-semibold text-slate-900 transition-all outline-none ${
                      errors.name 
                        ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' 
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {errors.name && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{errors.name}</span>
                    </p>
                  )}
                </div>

                {/* 2. Categoria & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div id="group-category" className="space-y-1">
                    <label htmlFor="product-category" className="block font-bold text-slate-700">
                      Categoria <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="product-category"
                      ref={categoryInputRef}
                      type="text"
                      value={category}
                      onFocus={handleInputFocus}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        if (errors.category) setErrors(prev => ({ ...prev, category: '' }));
                      }}
                      placeholder="Ex. Cosméticos"
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 transition-all outline-none ${
                        errors.category 
                          ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' 
                          : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    {errors.category && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{errors.category}</span>
                      </p>
                    )}
                  </div>

                  <div id="group-sku" className="space-y-1">
                    <label htmlFor="product-sku" className="block font-bold text-slate-700">
                      Código / SKU <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      id="product-sku"
                      type="text"
                      value={sku}
                      onFocus={handleInputFocus}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="PROD-001"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 3. Stock Quantity & Status Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-blue-50/60 p-3 sm:p-3.5 rounded-2xl border border-blue-100">
                  <div id="group-stock" className="space-y-1">
                    <label htmlFor="product-stock" className="block font-bold text-blue-950">
                      Quantidade em estoque <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="product-stock"
                      ref={stockQuantityInputRef}
                      type="number"
                      min="0"
                      step="1"
                      value={stockQuantity}
                      onFocus={handleInputFocus}
                      onChange={(e) => handleStockQuantityChange(e.target.value)}
                      className={`w-full p-2.5 bg-white border rounded-xl text-xs font-bold font-mono text-slate-900 transition-all outline-none ${
                        errors.stockQuantity 
                          ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' 
                          : 'border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    {errors.stockQuantity ? (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{errors.stockQuantity}</span>
                      </p>
                    ) : (
                      <p className="text-[10px] text-blue-700 mt-0.5">
                        {Number(stockQuantity) === 0 ? '⚠️ Marcado como Esgotado' : `${stockQuantity} unidades em estoque`}
                      </p>
                    )}
                  </div>

                  <div id="group-status" className="space-y-1">
                    <label htmlFor="product-status" className="block font-bold text-blue-950">
                      Status do produto
                    </label>
                    <select
                      id="product-status"
                      value={status}
                      onFocus={handleInputFocus}
                      onChange={(e) => handleStatusChange(e.target.value as ProductStatus)}
                      className="w-full p-2.5 bg-white border border-blue-200 rounded-xl text-xs font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
                    >
                      <option value="disponivel">Disponível</option>
                      <option value="esgotado">Esgotado</option>
                      <option value="oculto">Oculto (Invisível na IA)</option>
                    </select>
                    <p className="text-[10px] text-blue-700 mt-0.5">
                      {status === 'oculto' ? '🔒 Oculto para a IA' : status === 'esgotado' ? '❌ Não vendido pela IA' : '✅ Visível na IA'}
                    </p>
                  </div>
                </div>

                {/* Advanced Stock Control (FASE 14) */}
                <div className="bg-slate-50 border border-slate-200 p-3 sm:p-3.5 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Control de Stock Avanzado</span>
                      <span className="text-[10px] text-slate-500">Descuenta automáticamente en ventas y alerta al dueño</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={stockControlEnabled}
                        onChange={(e) => setStockControlEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {stockControlEnabled && (
                    <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Stock Mínimo (Alerta)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={minStock}
                          onChange={(e) => setMinStock(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-blue-500"
                          placeholder="Ej. 3"
                        />
                        <span className="text-[9px] text-slate-500 block mt-0.5">Alerta al dueño si baja de este valor</span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Capacidad Máxima
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={maxStock}
                          onChange={(e) => setMaxStock(e.target.value)}
                          className="w-full p-2 bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-900 outline-none focus:border-blue-500"
                          placeholder="Ej. 100"
                        />
                        <span className="text-[9px] text-slate-500 block mt-0.5">Capacidad sugerida de inventario</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3.5. Tipo de Venda: Por Unidade ou Por Peso */}
                <div id="group-saletype" className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Scale className="w-3.5 h-3.5 text-blue-600" />
                      <span>Tipo de Venda</span>
                      <span className="text-[10px] text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {saleType === 'weight' ? '⚖️ Por Peso (g / kg)' : '📦 Por Unidade'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSaleType('unit')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        saleType === 'unit'
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Package className="w-4 h-4" />
                      <span>Por unidade</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSaleType('weight')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                        saleType === 'weight'
                          ? 'border-emerald-600 bg-emerald-600 text-white shadow-sm'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <Scale className="w-4 h-4" />
                      <span>Por peso (g / kg)</span>
                    </button>
                  </div>

                  {saleType === 'weight' ? (
                    <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-emerald-900 text-[11px] flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          Conversão Automática de Gramas a Quilogramas
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-800 leading-relaxed">
                        Defina o valor por kg abaixo. A IA calculará o preço exato ou proporcional automaticamente:
                      </p>

                      {/* Live weight conversion price table */}
                      <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] font-mono">
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">250 g</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0) * 0.25)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">500 g</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0) * 0.50)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">750 g</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0) * 0.75)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">1 kg</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0))}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">1,5 kg</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0) * 1.50)}</span>
                        </div>
                        <div className="bg-white p-1.5 rounded-lg border border-emerald-100 text-center">
                          <span className="block text-[10px] text-slate-500 font-sans">2 kg</span>
                          <span className="font-bold text-emerald-700">{formatBRL(Number(price || 0) * 2.00)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500">
                      📦 Produto comercializado por unidade simples (ex: item de prateleira, garrafa, caixa).
                    </p>
                  )}
                </div>

                {/* 4. Preço & Preço Original */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div id="group-price" className="space-y-1">
                    <label htmlFor="product-price" className="block font-bold text-slate-700">
                      {saleType === 'weight' ? 'Preço por Quilo (R$/kg)' : `Preço em ${currency || 'R$'}`} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="product-price"
                      ref={priceInputRef}
                      type="number"
                      step="0.01"
                      min="0"
                      value={price}
                      onFocus={handleInputFocus}
                      onChange={(e) => {
                        setPrice(e.target.value);
                        if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                      }}
                      className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-emerald-600 font-mono transition-all outline-none ${
                        errors.price 
                          ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' 
                          : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
                      }`}
                    />
                    {errors.price && (
                      <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>{errors.price}</span>
                      </p>
                    )}
                  </div>

                  <div id="group-original-price" className="space-y-1">
                    <label htmlFor="product-original-price" className="block font-bold text-slate-700">
                      Preço Original / De ({currency || 'R$'}) <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    <input
                      id="product-original-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={originalPrice !== undefined ? originalPrice : ''}
                      onFocus={handleInputFocus}
                      onChange={(e) => setOriginalPrice(e.target.value !== '' ? Number(e.target.value) : undefined)}
                      placeholder="Ex. 79.90"
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 font-mono outline-none focus:border-blue-500 focus:bg-white"
                    />
                  </div>
                </div>

                {/* 5. Foto do Produto com botão "📷 Subir foto" */}
                <div id="group-image" className="space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />

                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-700">
                      Foto do Produto <span className="text-slate-400 font-normal">(Opcional)</span>
                    </label>
                    {imageUrl && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Foto anexada
                      </span>
                    )}
                  </div>

                  {imageUrl ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-slate-200 border border-slate-200 shrink-0">
                        <img
                          src={imageUrl}
                          alt="Prévia do produto"
                          className="w-full h-full object-cover"
                        />
                        {isProcessingImage && (
                          <div className="absolute inset-0 bg-slate-900/50 flex items-center justify-center text-white text-[9px] font-bold">
                            Processando...
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-slate-800 truncate">
                          Imagem pronta para o catálogo
                        </p>
                        <p className="text-[10px] text-slate-500">
                          Esta foto será exibida no catálogo e no atendimento IA.
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Camera className="w-3 h-3" />
                            <span>📷 Subir foto</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="px-2 py-1 bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 font-semibold text-[10px] rounded-lg transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Remover</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleImageFile(file);
                      }}
                      className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30 rounded-xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2.5"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                        <Camera className="w-5 h-5" />
                      </div>

                      <div className="space-y-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-1.5 active:scale-95"
                        >
                          <Camera className="w-3.5 h-3.5" />
                          <span>📷 Subir foto</span>
                        </button>
                        <p className="text-[10px] text-slate-400">
                          Selecione uma imagem da galeria do seu dispositivo
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 6. Variações */}
                <div id="group-variations" className="space-y-1">
                  <label htmlFor="product-variations" className="block font-bold text-slate-700">
                    Variações (separadas por vírgula) <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    id="product-variations"
                    type="text"
                    value={variations}
                    onFocus={handleInputFocus}
                    onChange={(e) => setVariations(e.target.value)}
                    placeholder="Ex. Tamanho P, Tamanho M, Tamanho G ou Preto, Branco"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* 7. Descrição */}
                <div id="group-description" className="space-y-1">
                  <label htmlFor="product-description" className="block font-bold text-slate-700">
                    Descrição <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="product-description"
                    ref={descriptionInputRef}
                    rows={3}
                    value={description}
                    onFocus={handleInputFocus}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      if (errors.description) setErrors(prev => ({ ...prev, description: '' }));
                    }}
                    placeholder="Detalhamento completo do produto utilizado pelo Vendedor IA..."
                    className={`w-full p-2.5 bg-slate-50 border rounded-xl text-xs text-slate-900 transition-all outline-none resize-y ${
                      errors.description 
                        ? 'border-rose-400 bg-rose-50/40 ring-2 ring-rose-100' 
                        : 'border-slate-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  {errors.description && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <span>{errors.description}</span>
                    </p>
                  )}
                </div>

                {/* 8. Recursos / Benefícios */}
                <div id="group-features" className="space-y-1">
                  <label htmlFor="product-features" className="block font-bold text-slate-700">
                    Recursos / Benefícios (separados por vírgula) <span className="text-slate-400 font-normal">(Opcional)</span>
                  </label>
                  <input
                    id="product-features"
                    type="text"
                    value={features}
                    onFocus={handleInputFocus}
                    onChange={(e) => setFeatures(e.target.value)}
                    placeholder="Fixação forte, Efeito fosco, Cheiro suave"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* 8.5 Informações adicionais (corte, embalagem, etc.) */}
                <div id="group-additional-info" className="space-y-1">
                  <label htmlFor="product-additional-info" className="block font-bold text-slate-700">
                    Informações Adicionais <span className="text-slate-400 font-normal">(Opcional: corte, embalagem, origem)</span>
                  </label>
                  <input
                    id="product-additional-info"
                    type="text"
                    value={additionalInfo}
                    onFocus={handleInputFocus}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    placeholder="Ex: Peça inteira embalada a vácuo, corte nobre, sem glúten"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white"
                  />
                </div>

                {/* 9. Checkboxes (Estoque & Destaque) */}
                <div className="flex flex-wrap items-center gap-4 pt-1 pb-4">
                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInStock(checked);
                        if (!checked) {
                          setStatus('esgotado');
                        } else if (status === 'esgotado') {
                          setStatus('disponivel');
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <span className="font-bold text-slate-700 text-xs">Produto em Estoque</span>
                  </label>

                  <label className="flex items-center space-x-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={popular}
                      onChange={(e) => setPopular(e.target.checked)}
                      className="w-4 h-4 text-amber-500 rounded border-slate-300 focus:ring-amber-500"
                    />
                    <span className="font-bold text-slate-700 text-xs">Produto Destaque ⭐</span>
                  </label>
                </div>
              </div>

              {/* Fixed Footer Buttons - Always Accessible */}
              <div className="px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-end space-x-2 shrink-0 sticky bottom-0 z-20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-semibold rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/30 transition-all active:scale-95 flex items-center space-x-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingItem ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Carga Masiva de Produtos com IA */}
      <BulkProductImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        onSaveProducts={async (products) => {
          if (onAddMultipleItems) {
            await onAddMultipleItems(products);
          } else {
            for (const p of products) {
              onAddItem(p);
            }
          }
        }}
        existingCategories={categories.filter((c) => c !== 'TODOS')}
        businessCategory={businessCategory}
      />
    </div>
  );
};
