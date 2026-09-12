import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { CatalogItem, ProductStatus } from '../../types';
import { formatBRL } from '../../utils/formatters';
import { compressImageToDataUrl } from '../../utils/imageOptimizer';
import {
  Sparkles,
  Upload,
  FileSpreadsheet,
  FileText,
  Camera,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  X,
  Download,
  Info,
  Layers,
  HelpCircle,
  Image as ImageIcon,
  Bot,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  Package,
  DollarSign
} from 'lucide-react';

interface BulkProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveProducts: (products: CatalogItem[]) => Promise<void>;
  existingCategories?: string[];
  businessCategory?: string;
}

interface PhotoUploadItem {
  id: string;
  name: string;
  size: number;
  dataUrl: string;
}

interface EditableCatalogItem extends CatalogItem {
  _stockUnset?: boolean;
  _priceUnset?: boolean;
  _isPriceSuggested?: boolean;
  _isNameSuggested?: boolean;
  _confidence?: 'alta' | 'media' | 'baixa';
  _needsReview?: boolean;
  _reviewReason?: string;
  _detectedBrand?: string | null;
  _detectedProductType?: string | null;
  _detectedTextOnPackage?: string | null;
}

export const BulkProductImportModal: React.FC<BulkProductImportModalProps> = ({
  isOpen,
  onClose,
  onSaveProducts,
  existingCategories = [],
  businessCategory = '',
}) => {
  // Step 1: Input | Step 2: Preview & Edit
  const [step, setStep] = useState<1 | 2>(1);
  const [activeInputTab, setActiveInputTab] = useState<'file' | 'text' | 'photos'>('photos');

  // Input states
  const [rawText, setRawText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number; rows: number; rawContent: string } | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoUploadItem[]>([]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Preview & Edit states
  const [parsedProducts, setParsedProducts] = useState<EditableCatalogItem[]>([]);
  const [globalCategory, setGlobalCategory] = useState('');
  const [globalStock, setGlobalStock] = useState<string>('');
  const [globalPrice, setGlobalPrice] = useState<string>('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal dialog for bulk stock setting
  const [isBulkStockModalOpen, setIsBulkStockModalOpen] = useState(false);
  const [bulkStockModalValue, setBulkStockModalValue] = useState('10');

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const multiPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const itemPhotoInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  if (!isOpen) return null;

  // Helper to compress image in client-side canvas
  const compressImage = (file: File): Promise<string> => {
    return compressImageToDataUrl(file, 400, 0.65);
  };

  // Handle Multi-Photo selection from device gallery / camera
  const handleMultiPhotoSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMessage(null);

    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) {
      setErrorMessage('Por favor selecione arquivos de imagem válidos (JPG, PNG, WebP).');
      return;
    }

    try {
      const newPhotoItems: PhotoUploadItem[] = [];
      for (const file of validFiles) {
        const compressed = await compressImage(file);
        newPhotoItems.push({
          id: `photo-item-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          name: file.name,
          size: file.size,
          dataUrl: compressed,
        });
      }

      setSelectedPhotos((prev) => [...prev, ...newPhotoItems]);
    } catch (err) {
      console.error('Erro ao carregar fotos:', err);
      setErrorMessage('Ocorreu um erro ao carregar as imagens selecionadas.');
    }
  };

  const handleRemoveSelectedPhoto = (id: string) => {
    setSelectedPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleClearAllPhotos = () => {
    setSelectedPhotos([]);
  };

  // Handle Excel / CSV File upload
  const handleFileUpload = async (file: File) => {
    if (!file) return;
    setErrorMessage(null);

    const validExtensions = ['.xlsx', '.xls', '.csv', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setErrorMessage('Por favor selecione um arquivo válido (.xlsx, .xls ou .csv).');
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      const csvData = XLSX.utils.sheet_to_csv(worksheet);
      const jsonRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      const validRowsCount = jsonRows.filter((r) => r.length > 0 && r.some((c) => String(c).trim().length > 0)).length;

      setUploadedFile({
        name: file.name,
        size: file.size,
        rows: Math.max(0, validRowsCount - 1),
        rawContent: csvData,
      });
    } catch (err) {
      console.error('Erro ao ler arquivo:', err);
      setErrorMessage('Erro ao ler o arquivo. Verifique o formato e tente novamente.');
    }
  };

  // Sample Templates
  const handleLoadSampleText = () => {
    setRawText(
`Coca-Cola 2L – R$10,00 – Bebidas – 25 unidades em estoque
Pepsi 2L – R$9,00 – Bebidas – 20 unidades em estoque
Guaraná Antarctica 2L – R$8,50 – Bebidas – 30 unidades em estoque
Água Mineral 500ml – R$3,50 – Bebidas – 50 unidades em estoque
Suco Del Valle Uva 1L – R$7,90 – Bebidas – 15 unidades em estoque`
    );
    setActiveInputTab('text');
  };

  const handleDownloadSampleCSV = () => {
    const csvContent = `Nome do Produto,Preço (R$),Categoria,Estoque,Descrição,SKU
Coca-Cola 2L,10.00,Bebidas,25,Refrigerante Coca-Cola 2 Litros gelado,BEB-001
Pepsi 2L,9.00,Bebidas,20,Refrigerante Pepsi 2 Litros,BEB-002
Guaraná 2L,8.50,Bebidas,30,Guaraná Antarctica 2 Litros,BEB-003
Água Mineral 500ml,3.50,Bebidas,50,Água mineral sem gás 500ml,BEB-004`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_produtos_vendedor_ia.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // AI Interpretation process
  const handleProcessWithAI = async () => {
    setErrorMessage(null);

    // Flow for Photos
    if (activeInputTab === 'photos') {
      if (selectedPhotos.length === 0) {
        setErrorMessage('Por favor selecione pelo menos uma foto de produto da sua galeria.');
        return;
      }

      setIsProcessing(true);
      try {
        const response = await fetch('/api/catalog/bulk-parse-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: selectedPhotos,
            businessCategory,
          }),
        });

        let data: any = {};
        const responseText = await response.text();
        try {
          data = JSON.parse(responseText);
        } catch {
          console.warn('Resposta não é JSON válido:', responseText);
          throw new Error('O servidor retornou uma resposta inesperada. Tente novamente com menos imagens ou reconecte.');
        }

        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          const formatted: EditableCatalogItem[] = data.products.map((p: any, idx: number) => {
            const hasSuggestedPrice = typeof p.price === 'number' && p.price > 0;
            const priceVal = hasSuggestedPrice ? Number(p.price) : 0;
            const hasValidStock = typeof p.stockQuantity === 'number' && !isNaN(p.stockQuantity) && p.stockQuantity >= 0;
            const stockVal = hasValidStock ? Number(p.stockQuantity) : 0;
            const isStockUnset = p.stockQuantity === undefined || p.stockQuantity === null || !hasValidStock;
            const categoryVal = p.category && p.category !== 'Geral' ? p.category : (businessCategory || 'Sobremesas');

            let rawName = String(p.name || '').trim();
            let isNameSuggested = Boolean(p.isNameSuggested);
            const forbiddenClientPatterns = [
              /^item\s+de\s+item/i,
              /^item\s+por\s+foto/i,
              /^item\s+sugerido/i,
              /^produto\s*\d*/i,
              /^item\s*\d*/i,
              /^revisar\s+nome/i,
              /^\d+$/,
              /^img[_\-\d]+/i,
              /^foto[_\-\d]+/i,
              /^whatsapp[_\-\d]+/i,
              /\.(jpg|jpeg|png|webp|gif)$/i,
            ];
            if (!rawName || forbiddenClientPatterns.some((rg) => rg.test(rawName))) {
              const baseCat = categoryVal && categoryVal !== 'Revisar categoria' ? categoryVal : 'Sobremesas';
              rawName = baseCat.toLowerCase().includes('sobremesa') || baseCat.toLowerCase().includes('doce')
                ? 'Pudim Artesanal'
                : `${baseCat} Artesanal`;
              isNameSuggested = true;
            }

            return {
              id: p.id || `prod-photo-${Date.now()}-${idx}`,
              name: rawName,
              category: categoryVal,
              price: priceVal,
              originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
              description: p.description || `Produto: ${rawName}`,
              features: Array.isArray(p.features) && p.features.length > 0
                ? p.features
                : ['Qualidade garantida', 'Pronta entrega'],
              inStock: hasValidStock ? stockVal > 0 : true,
              imageUrl: p.imageUrl || (selectedPhotos[idx] ? selectedPhotos[idx].dataUrl : ''),
              popular: false,
              sku: p.sku || `SKU-${100 + idx}`,
              variations: Array.isArray(p.variations) ? p.variations : [],
              availability: 'Pronta entrega',
              stockQuantity: stockVal,
              status: (hasValidStock && stockVal === 0 ? 'esgotado' : 'disponivel') as ProductStatus,
              _stockUnset: isStockUnset,
              _priceUnset: !hasSuggestedPrice,
              _isPriceSuggested: hasSuggestedPrice,
              _isNameSuggested: isNameSuggested,
              _confidence: p.confidence || (categoryVal === 'Revisar categoria' ? 'baixa' : 'media'),
              _needsReview: p.needsReview !== undefined ? p.needsReview : (!hasSuggestedPrice || isStockUnset),
              _reviewReason: p.reviewReason || (!hasSuggestedPrice ? 'Preço não identificado na foto' : 'Confirme os dados antes de publicar'),
              _detectedBrand: p.brand || null,
              _detectedProductType: p.productType || null,
              _detectedTextOnPackage: p.textOnPackage || null,
            };
          });

          setParsedProducts(formatted);
          if (data.warning) {
            setErrorMessage('');
          }
          setStep(2);
        } else {
          setErrorMessage('Não foi possível identificar os produtos nas fotos enviadas. Tente novamente.');
        }
      } catch (err: any) {
        console.error('Erro ao analisar fotos:', err);
        setErrorMessage(err?.message || 'Erro ao analisar as fotos com IA. Tente novamente.');
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Flow for Text or File
    const contentToParse = activeInputTab === 'text' ? rawText.trim() : (uploadedFile?.rawContent || '').trim();

    if (!contentToParse) {
      setErrorMessage(
        activeInputTab === 'text'
          ? 'Por favor cole o texto com a lista de produtos antes de continuar.'
          : 'Por favor envie um arquivo Excel ou CSV com os produtos.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/catalog/bulk-parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rawText: activeInputTab === 'text' ? rawText : '',
          fileContent: activeInputTab === 'file' ? uploadedFile?.rawContent : '',
          businessCategory,
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor');
      }

      const data = await response.json();
      if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        const formatted: EditableCatalogItem[] = data.products.map((p: any, idx: number) => {
          const priceVal = Number(p.price) || 0;
          const stockVal = p.stockQuantity !== undefined ? Number(p.stockQuantity) : 10;
          return {
            id: p.id || `prod-bulk-${Date.now()}-${idx}`,
            name: p.name || `Produto ${idx + 1}`,
            category: p.category || 'Geral',
            price: priceVal,
            originalPrice: p.originalPrice ? Number(p.originalPrice) : undefined,
            description: p.description || `${p.name || ''}`,
            features: Array.isArray(p.features) ? p.features : ['Qualidade garantida'],
            inStock: p.inStock !== undefined ? p.inStock : stockVal > 0,
            imageUrl: p.imageUrl || '',
            popular: false,
            sku: p.sku || `SKU-${100 + idx}`,
            variations: Array.isArray(p.variations) ? p.variations : [],
            availability: 'Pronta entrega',
            stockQuantity: stockVal,
            status: (stockVal === 0 ? 'esgotado' : 'disponivel') as ProductStatus,
            _priceUnset: priceVal <= 0,
            _stockUnset: stockVal < 0,
          };
        });

        setParsedProducts(formatted);
        setStep(2);
      } else {
        setErrorMessage('Não foi possível identificar produtos no conteúdo informado. Verifique os dados e tente novamente.');
      }
    } catch (err) {
      console.error('Erro ao interpretar produtos:', err);
      setErrorMessage('Ocorreu um erro ao processar os produtos. Verifique sua conexão e tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Editing individual item in preview
  const handleUpdatePreviewItem = (id: string, field: keyof EditableCatalogItem, value: any) => {
    setParsedProducts((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'stockQuantity') {
            const raw = typeof value === 'string' ? value.trim() : value;
            if (raw === '' || raw === null || raw === undefined) {
              updated.stockQuantity = 0;
              updated._stockUnset = true;
            } else {
              const qty = Math.max(0, parseInt(raw) || 0);
              updated.stockQuantity = qty;
              updated._stockUnset = false;
              updated.inStock = qty > 0;
              if (qty === 0) updated.status = 'esgotado';
              else if (updated.status === 'esgotado') updated.status = 'disponivel';
            }
          }
          if (field === 'price') {
            const raw = typeof value === 'string' ? value.trim() : value;
            if (raw === '' || raw === null || raw === undefined) {
              updated.price = 0;
              updated._priceUnset = true;
            } else {
              const priceNum = Math.max(0, parseFloat(raw) || 0);
              updated.price = priceNum;
              updated._priceUnset = priceNum <= 0;
            }
            updated._isPriceSuggested = false;
          }
          if (field === 'name') {
            updated.name = String(value || '');
          }
          return updated;
        }
        return item;
      })
    );
  };

  const handleRemovePreviewItem = (id: string) => {
    setParsedProducts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAddNewItemToPreview = () => {
    const newItem: EditableCatalogItem = {
      id: `prod-bulk-manual-${Date.now()}`,
      name: 'Novo Produto',
      category: globalCategory || 'Geral',
      price: 0,
      description: 'Descrição do novo produto.',
      features: ['Qualidade garantida'],
      inStock: true,
      imageUrl: '',
      popular: false,
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      variations: [],
      availability: 'Pronta entrega',
      stockQuantity: 0,
      status: 'disponivel',
      _priceUnset: true,
      _stockUnset: true,
    };
    setParsedProducts((prev) => [...prev, newItem]);
  };

  const handleApplyGlobalCategory = () => {
    if (!globalCategory.trim()) return;
    setParsedProducts((prev) =>
      prev.map((item) => ({ ...item, category: globalCategory.trim() }))
    );
  };

  const handleApplyGlobalStock = () => {
    const qty = parseInt(globalStock);
    if (isNaN(qty) || qty < 0) return;
    setParsedProducts((prev) =>
      prev.map((item) => ({
        ...item,
        stockQuantity: qty,
        _stockUnset: false,
        inStock: qty > 0,
        status: qty === 0 ? 'esgotado' : 'disponivel',
      }))
    );
    setGlobalStock('');
    setSuccessMessage(`✅ Estoque de ${qty} un. definido para todos os ${parsedProducts.length} produtos!`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleApplyBulkStockModal = (customQty?: number) => {
    const qty = customQty !== undefined ? customQty : parseInt(bulkStockModalValue);
    if (isNaN(qty) || qty < 0) {
      setErrorMessage('Por favor informe uma quantidade válida de estoque (número maior ou igual a 0).');
      return;
    }
    setParsedProducts((prev) =>
      prev.map((item) => ({
        ...item,
        stockQuantity: qty,
        _stockUnset: false,
        inStock: qty > 0,
        status: qty === 0 ? 'esgotado' : 'disponivel',
      }))
    );
    setIsBulkStockModalOpen(false);
    setSuccessMessage(`✅ Estoque de ${qty} ${qty === 1 ? 'unidade' : 'unidades'} definido para todos os ${parsedProducts.length} produtos!`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  const handleApplyGlobalPrice = () => {
    const pr = parseFloat(globalPrice.replace(',', '.'));
    if (isNaN(pr) || pr <= 0) return;
    setParsedProducts((prev) =>
      prev.map((item) => ({
        ...item,
        price: pr,
        _priceUnset: false,
      }))
    );
    setGlobalPrice('');
    setSuccessMessage(`✅ Preço de ${formatBRL(pr)} aplicado a todos os ${parsedProducts.length} produtos!`);
    setTimeout(() => setSuccessMessage(null), 3500);
  };

  // Helper validation checkers
  const isItemMissingPrice = (item: EditableCatalogItem) => {
    return item._priceUnset || !item.price || item.price <= 0 || isNaN(item.price);
  };

  const isItemMissingStock = (item: EditableCatalogItem) => {
    return item._stockUnset || item.stockQuantity === undefined || item.stockQuantity === null || isNaN(item.stockQuantity) || item.stockQuantity < 0;
  };

  const isItemInvalid = (item: EditableCatalogItem) => {
    return !item.name.trim() || isItemMissingPrice(item) || isItemMissingStock(item);
  };

  const invalidProductsCount = parsedProducts.filter(isItemInvalid).length;

  // Handle uploading photo for a preview item
  const handleItemPhotoUpload = async (id: string, file: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const compressed = await compressImage(file);
      handleUpdatePreviewItem(id, 'imageUrl', compressed);
    } catch (err) {
      console.error('Erro ao atualizar foto:', err);
    }
  };

  // Save all to Catalog
  const handleConfirmSaveAll = async () => {
    setErrorMessage(null);
    if (parsedProducts.length === 0) return;

    // Strict validation
    const invalidItems = parsedProducts.filter(isItemInvalid);
    if (invalidItems.length > 0) {
      setErrorMessage(
        `⚠️ Falta informar preço (> R$ 0) e/ou estoque em ${invalidItems.length} ${
          invalidItems.length === 1 ? 'produto' : 'produtos'
        }. Por favor preencha os campos destacados antes de adicionar ao catálogo.`
      );
      return;
    }

    setIsSaving(true);
    try {
      // Clean up internal metadata fields before saving
      const cleanProducts: CatalogItem[] = parsedProducts.map((p) => {
        const {
          _stockUnset,
          _priceUnset,
          _isPriceSuggested,
          _isNameSuggested,
          _confidence,
          _needsReview,
          _reviewReason,
          _detectedBrand,
          _detectedProductType,
          _detectedTextOnPackage,
          ...cleanItem
        } = p;
        return cleanItem;
      });

      await onSaveProducts(cleanProducts);
      onClose();
    } catch (err) {
      console.error('Erro ao salvar produtos em massa:', err);
      setErrorMessage('Erro ao salvar os produtos. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const totalInventoryValue = parsedProducts.reduce(
    (acc, item) => acc + (item.price || 0) * (item.stockQuantity || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-900 px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 text-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-base text-white tracking-tight">
                  📦 Carga Masiva de Produtos com IA
                </h3>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-500/30">
                  Visão Computacional & IA
                </span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                {step === 1
                  ? 'Escolha entre fotos da galeria, planilha Excel/CSV ou lista de texto'
                  : `Vista prévia de produtos: ${parsedProducts.length} itens identificados para revisão`}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center space-x-1.5 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700/50 text-xs font-semibold text-slate-300 mr-2">
              <span className={`px-2 py-0.5 rounded-md ${step === 1 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}>
                1. Entrada
              </span>
              <span className="text-slate-600">→</span>
              <span className={`px-2 py-0.5 rounded-md ${step === 2 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400'}`}>
                2. Vista Prévia & Revisão
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-2xl text-xs font-semibold flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 text-xs font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 1: Input options */}
          {step === 1 && (
            <div className="space-y-5">
              {/* Tab Selector: Photos vs Excel/CSV vs Text */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {/* Tab 1: Photos */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveInputTab('photos');
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    activeInputTab === 'photos'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="truncate">📸 Cargar productos con fotos</span>
                </button>

                {/* Tab 2: Excel / CSV */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveInputTab('file');
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    activeInputTab === 'file'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="truncate">📄 Arquivo Excel ou CSV</span>
                </button>

                {/* Tab 3: Text */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveInputTab('text');
                    setErrorMessage(null);
                  }}
                  className={`py-3 px-3 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all ${
                    activeInputTab === 'text'
                      ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="truncate">📝 Colar Lista em Texto Livre</span>
                </button>
              </div>

              {/* OPTION 1: Multi-Photo Picker & AI Vision */}
              {activeInputTab === 'photos' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={multiPhotoInputRef}
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      handleMultiPhotoSelect(e.target.files);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Dropzone & Gallery Selector */}
                  <div
                    onClick={() => multiPhotoInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMultiPhotoSelect(e.dataTransfer.files);
                    }}
                    className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      selectedPhotos.length > 0
                        ? 'border-blue-400 bg-blue-50/40 hover:bg-blue-50/70'
                        : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${
                        selectedPhotos.length > 0
                          ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}
                    >
                      <Camera className="w-7 h-7" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-800">
                        {selectedPhotos.length > 0
                          ? `+ Selecionar mais fotos da galeria (${selectedPhotos.length} fotos carregadas)`
                          : 'Selecione várias fotos de produtos da galeria do seu celular ou computador'}
                      </p>
                      <p className="text-xs text-slate-500">
                        Toque aqui para abrir a galeria ou arraste várias imagens de uma só vez (JPG, PNG, WebP)
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        multiPhotoInputRef.current?.click();
                      }}
                      className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-2 transition-all active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Abrir Galeria de Fotos</span>
                    </button>
                  </div>

                  {/* Selected Photos Grid Preview */}
                  {selectedPhotos.length > 0 && (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-0.5 rounded-lg shadow-sm">
                            {selectedPhotos.length} {selectedPhotos.length === 1 ? 'foto selecionada' : 'fotos selecionadas'}
                          </span>
                          <span className="text-xs text-slate-600 font-medium hidden sm:inline">
                            Cada foto será analisada individualmente pela IA para extrair nome, categoria e descrição.
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearAllPhotos}
                          className="text-xs text-rose-600 hover:text-rose-700 font-bold hover:underline"
                        >
                          Limpar todas
                        </button>
                      </div>

                      {/* Photo Cards Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[36vh] overflow-y-auto p-1">
                        {selectedPhotos.map((photo, index) => (
                          <div
                            key={photo.id}
                            className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm relative group flex flex-col hover:border-blue-400 transition-all"
                          >
                            <div className="aspect-square w-full relative overflow-hidden bg-slate-100">
                              <img
                                src={photo.dataUrl}
                                alt={photo.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-1.5 left-1.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                                #{index + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSelectedPhoto(photo.id)}
                                className="absolute top-1.5 right-1.5 bg-rose-600 text-white p-1 rounded-lg opacity-80 hover:opacity-100 shadow-md transition-opacity"
                                title="Remover esta foto"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="p-2 text-center bg-white border-t border-slate-100">
                              <p className="text-[11px] font-bold text-slate-800 truncate" title={photo.name}>
                                {photo.name}
                              </p>
                              <span className="text-[9px] text-blue-600 font-semibold">
                                Pronto para IA
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* AI Rule Notice */}
                  <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl text-xs text-blue-900 flex items-start space-x-2.5">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold">Análise Visual Inteligente com IA:</p>
                      <p className="text-blue-800 leading-relaxed text-[11px]">
                        A IA detectará automaticamente o <strong>Nome do produto, Categoria, Descrição comercial, Características e Variações</strong> direto de cada foto. <em>Os preços e estoques permanecerão vazios para que você defina com total controle.</em>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* OPTION 2: Excel / CSV File */}
              {activeInputTab === 'file' && (
                <div className="space-y-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx, .xls, .csv, .txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />

                  {/* Dropzone */}
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
                      if (file) handleFileUpload(file);
                    }}
                    className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                      uploadedFile
                        ? 'border-emerald-400 bg-emerald-50/40 hover:bg-emerald-50/70'
                        : 'border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50/30'
                    }`}
                  >
                    <div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
                        uploadedFile
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-600 text-white'
                      }`}
                    >
                      {uploadedFile ? (
                        <CheckCircle2 className="w-7 h-7" />
                      ) : (
                        <Upload className="w-7 h-7" />
                      )}
                    </div>

                    {uploadedFile ? (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">
                          {uploadedFile.name}
                        </p>
                        <p className="text-xs text-emerald-700 font-medium">
                          Arquivo carregado com sucesso • ~{uploadedFile.rows} linhas detectadas • {(uploadedFile.size / 1024).toFixed(1)} KB
                        </p>
                        <p className="text-[11px] text-slate-500 pt-1">
                          Clique aqui caso queira escolher outro arquivo.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-800">
                          Arraste seu arquivo Excel (.xlsx, .xls) ou CSV aqui
                        </p>
                        <p className="text-xs text-slate-500">
                          Ou clique para selecionar direto do seu computador / dispositivo
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Template & Helper Bar */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div className="flex items-center space-x-2 text-xs text-slate-600">
                      <Info className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>
                        Colunas sugeridas: <strong>Nome, Preço, Categoria, Estoque, Descrição, SKU</strong> (A IA detecta variações de títulos automaticamente).
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadSampleCSV}
                      className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-all whitespace-nowrap active:scale-95"
                    >
                      <Download className="w-3.5 h-3.5 text-blue-600" />
                      <span>Baixar Planilha Modelo (.csv)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* OPTION 3: Free text list */}
              {activeInputTab === 'text' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Cole aqui a sua lista de produtos (1 produto por linha ou anotação):</span>
                    </label>

                    <button
                      type="button"
                      onClick={handleLoadSampleText}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold hover:underline"
                    >
                      ✨ Preencher com exemplo de bebidas
                    </button>
                  </div>

                  <textarea
                    rows={8}
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder={`Exemplo de como colar:
Coca-Cola 2L – R$10 – bebidas
Pepsi 2L – R$9 – bebidas
Guaraná 2L – R$8,50 – bebidas
Água Mineral 500ml – R$3,50 – bebidas`}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 font-mono focus:border-blue-500 focus:bg-white outline-none transition-all"
                  />

                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800 flex items-start space-x-2">
                    <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <span>
                      <strong>Sem formato fixo:</strong> A IA do Vendedor IA entende traços, vírgulas, preços com R$ ou decimais, quantidades em estoque e categorias escritas livremente.
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: Interactive Preview & Editable Cards / Table */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Top Summary Banner */}
              <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-slate-900 text-white rounded-2xl p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Vista previa de productos
                    </span>
                    <span className="text-slate-300 text-xs font-medium">
                      • {parsedProducts.length} produtos identificados
                    </span>
                  </div>
                  <h4 className="font-bold text-sm sm:text-base text-white">
                    {parsedProducts.length} {parsedProducts.length === 1 ? 'produto identificado' : 'produtos identificados'}. Revisa y completa la información antes de guardar.
                  </h4>
                </div>

                {/* View Mode Toggle: Cards vs Table */}
                <div className="flex items-center bg-slate-800/90 p-1 rounded-xl border border-slate-700/60 shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      viewMode === 'cards'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>Cards (Celular)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center space-x-1.5 transition-all ${
                      viewMode === 'table'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Tabela</span>
                  </button>
                </div>
              </div>

              {/* Success Notification Alert */}
              {successMessage && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSuccessMessage(null)}
                    className="text-emerald-700 hover:text-emerald-950 text-xs font-bold px-2 py-0.5"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Warning Alert if any product lacks price or stock */}
              {invalidProductsCount > 0 && (
                <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl flex items-start justify-between gap-3 shadow-sm animate-in fade-in">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-xs sm:text-sm">
                        ⚠️ Falta informar precio y/o estoque en {invalidProductsCount} {invalidProductsCount === 1 ? 'producto' : 'productos'}
                      </p>
                      <p className="text-[11px] sm:text-xs text-amber-800">
                        Cada producto debe tener un <strong>precio mayor a R$ 0</strong> y <strong>unidades de estoque</strong> definidas. Puedes llenarlos individualmente o usar las acciones rápidas de abajo.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bulk Quick Control Bar */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* Dedicated Button for Bulk Stock */}
                  <button
                    type="button"
                    onClick={() => {
                      setBulkStockModalValue(globalStock || '10');
                      setIsBulkStockModalOpen(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 text-xs shadow-sm flex items-center gap-1.5"
                    title="Definir a mesma quantidade de estoque para todos os produtos"
                  >
                    <Package className="w-4 h-4 text-blue-100" />
                    <span>Definir estoque para todos</span>
                  </button>

                  {/* Inline Bulk Stock input & apply */}
                  <div className="flex items-center gap-1.5 bg-blue-50/60 p-1.5 rounded-xl border border-blue-200/80">
                    <input
                      type="number"
                      min="0"
                      value={globalStock}
                      onChange={(e) => setGlobalStock(e.target.value)}
                      placeholder="Qtd (ex: 10)"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none w-24 sm:w-28 focus:border-blue-500 font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={handleApplyGlobalStock}
                      className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-all whitespace-nowrap active:scale-95 text-[11px] shadow-xs"
                      title="Aplicar quantidade digitada a todos"
                    >
                      Aplicar
                    </button>
                  </div>

                  {/* Bulk Price apply */}
                  <div className="flex items-center gap-1.5 bg-emerald-50/60 p-1.5 rounded-xl border border-emerald-200/80">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      type="text"
                      value={globalPrice}
                      onChange={(e) => setGlobalPrice(e.target.value)}
                      placeholder="Preço p/ todos (R$)"
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 outline-none w-28 sm:w-32 focus:border-emerald-500 font-bold"
                    />
                    <button
                      type="button"
                      onClick={handleApplyGlobalPrice}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all whitespace-nowrap active:scale-95 text-[11px] shadow-xs"
                      title="Aplicar este preço a todos os produtos"
                    >
                      Aplicar Preço
                    </button>
                  </div>

                  {/* Bulk Category apply */}
                  <div className="flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={globalCategory}
                      onChange={(e) => setGlobalCategory(e.target.value)}
                      placeholder="Categoria p/ todos..."
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none w-32 sm:w-40 focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleApplyGlobalCategory}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all whitespace-nowrap active:scale-95 text-[11px]"
                      title="Aplicar esta categoria a todos os produtos"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>

                <div className="text-slate-600 font-semibold text-[11px] flex items-center gap-3">
                  <span>Estoque total: <strong className="text-slate-900">{parsedProducts.reduce((sum, p) => sum + (p._stockUnset ? 0 : (p.stockQuantity || 0)), 0)} un.</strong></span>
                  <span>Valor estoque: <strong className="text-emerald-700">{formatBRL(totalInventoryValue)}</strong></span>
                </div>
              </div>

              {/* MODE A: RESPONSIVE CARDS VIEW (Optimized for Mobile) */}
              {viewMode === 'cards' && (
                <div className="space-y-4 max-h-[54vh] overflow-y-auto p-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {parsedProducts.map((prod, idx) => {
                      const missingPrice = isItemMissingPrice(prod);
                      const missingStock = isItemMissingStock(prod);
                      const hasWarning = missingPrice || missingStock;

                      return (
                        <div
                          key={prod.id}
                          className={`bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all relative flex flex-col gap-3 ${
                            hasWarning ? 'border-amber-400 ring-1 ring-amber-300' : 'border-slate-200'
                          }`}
                        >
                          {/* Top Warning Banner inside card */}
                          {hasWarning && (
                            <div className="bg-amber-50 border border-amber-300 text-amber-900 px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>
                                  ⚠️ Falta informar {missingPrice && missingStock ? 'preço e estoque' : missingPrice ? 'preço de venda' : 'estoque'}
                                </span>
                              </div>
                              <span className="text-[10px] text-amber-700 uppercase font-semibold">Obrigatório</span>
                            </div>
                          )}

                          {/* Card Header with Status Badge & Meta */}
                          <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md">
                                #{idx + 1}
                              </span>

                              {/* Confidence Badge */}
                              {prod._confidence === 'alta' && !prod._needsReview ? (
                                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Foto Identificada
                                </span>
                              ) : prod._confidence === 'media' ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-600" />
                                  Sugerido por IA • Revisar
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-orange-900 bg-orange-100 border border-orange-300 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-orange-600" />
                                  Revisar Identificação
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemovePreviewItem(prod.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Remover da lista"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Visual AI Detections (Brand, Type, Package Text) */}
                          {(prod._detectedBrand || prod._detectedProductType || prod._detectedTextOnPackage || prod._reviewReason) && (
                            <div className="flex flex-wrap items-center gap-1 bg-slate-50 border border-slate-200/80 p-1.5 rounded-xl text-[10px]">
                              {prod._detectedBrand && (
                                <span className="font-bold text-blue-700 bg-blue-100/70 border border-blue-200 px-1.5 py-0.5 rounded">
                                  🏷️ Marca: {prod._detectedBrand}
                                </span>
                              )}
                              {prod._detectedProductType && (
                                <span className="font-medium text-slate-700 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                  📦 {prod._detectedProductType}
                                </span>
                              )}
                              {prod._detectedTextOnPackage && (
                                <span className="font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded truncate max-w-[200px]" title={prod._detectedTextOnPackage}>
                                  🔍 "{prod._detectedTextOnPackage}"
                                </span>
                              )}
                              {prod._reviewReason && !prod._detectedBrand && !prod._detectedProductType && (
                                <span className="text-slate-600 italic">
                                  💡 {prod._reviewReason}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Card Header with Photo & Basic Info */}
                          <div className="flex items-start gap-3">
                            {/* Photo with Change Trigger */}
                            <div className="shrink-0">
                              <input
                                type="file"
                                accept="image/*"
                                ref={(el) => (itemPhotoInputRefs.current[prod.id] = el)}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleItemPhotoUpload(prod.id, file);
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                              {prod.imageUrl ? (
                                <div
                                  onClick={() => itemPhotoInputRefs.current[prod.id]?.click()}
                                  className="w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 relative group cursor-pointer shadow-sm bg-slate-100"
                                  title="Toque para trocar foto"
                                >
                                  <img
                                    src={prod.imageUrl}
                                    alt={prod.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <Camera className="w-5 h-5" />
                                  </div>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => itemPhotoInputRefs.current[prod.id]?.click()}
                                  className="w-20 h-20 rounded-2xl border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all"
                                  title="Subir foto para este produto"
                                >
                                  <Camera className="w-5 h-5" />
                                  <span className="text-[9px] font-bold mt-1">Adicionar Foto</span>
                                </button>
                              )}
                            </div>

                            {/* Name Input */}
                            <div className="flex-1 min-w-0 space-y-1.5">
                              <div className="flex items-center justify-between gap-1 flex-wrap">
                                <label className="block text-[10px] font-bold text-slate-700 uppercase">
                                  Nome do Produto <span className="text-rose-600">*</span>
                                </label>
                                {prod._isNameSuggested ? (
                                  <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                    Nome sugerido pela IA
                                  </span>
                                ) : prod._detectedTextOnPackage || prod._confidence === 'alta' ? (
                                  <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                    Identificado da Foto
                                  </span>
                                ) : null}
                              </div>
                              <input
                                type="text"
                                value={prod.name}
                                onChange={(e) => handleUpdatePreviewItem(prod.id, 'name', e.target.value)}
                                placeholder="Nome descritivo do produto..."
                                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                              />
                            </div>
                          </div>

                          {/* Price & Stock & Category Row */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            {/* Price */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-bold text-slate-700">
                                  Preço de Venda <span className="text-rose-600">*</span>
                                </label>
                                {prod._isPriceSuggested ? (
                                  <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">Sugerido por IA</span>
                                ) : missingPrice ? (
                                  <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Preço não identificado</span>
                                ) : null}
                              </div>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={missingPrice ? '' : prod.price}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'price', e.target.value)}
                                  placeholder="0,00"
                                  className={`w-full pl-8 pr-2 py-2 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-none text-right transition-colors ${
                                    missingPrice
                                      ? 'bg-amber-50 border-2 border-amber-400 placeholder:text-amber-700/70 focus:border-amber-600'
                                      : 'bg-slate-50 border border-slate-200 focus:border-blue-500'
                                  }`}
                                />
                              </div>
                            </div>

                            {/* Stock */}
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[10px] font-bold text-slate-700">
                                  Estoque (unidades) <span className="text-rose-600">*</span>
                                </label>
                                {missingStock ? (
                                  <span className="text-[8px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">Não informado</span>
                                ) : prod.stockQuantity === 0 ? (
                                  <span className="text-[8px] font-bold text-slate-700 bg-slate-200 px-1.5 py-0.5 rounded">Esgotado (0 un)</span>
                                ) : null}
                              </div>
                              <input
                                type="number"
                                min="0"
                                value={missingStock ? '' : prod.stockQuantity}
                                onChange={(e) => handleUpdatePreviewItem(prod.id, 'stockQuantity', e.target.value)}
                                placeholder="Definir estoque..."
                                className={`w-full px-3 py-2 rounded-xl text-xs font-bold text-slate-900 focus:bg-white outline-none text-center transition-colors ${
                                  missingStock
                                    ? 'bg-amber-50 border-2 border-amber-400 placeholder:text-amber-700/70 focus:border-amber-600'
                                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500'
                                }`}
                              />
                            </div>

                            {/* Category */}
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-1">
                                Categoria
                              </label>
                              <input
                                type="text"
                                value={prod.category}
                                onChange={(e) => handleUpdatePreviewItem(prod.id, 'category', e.target.value)}
                                placeholder="Categoria..."
                                className={`w-full px-3 py-2 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white outline-none ${
                                  prod.category === 'Revisar categoria' || !prod.category
                                    ? 'bg-amber-50 border border-amber-400 text-amber-950'
                                    : 'bg-slate-50 border border-slate-200 focus:border-blue-500'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Quick Category Buttons for Fast Selection */}
                          <div className="flex flex-wrap items-center gap-1 pt-0.5">
                            <span className="text-[9px] text-slate-400 font-bold uppercase mr-0.5">Categorias rápidas:</span>
                            {['Sobremesas', 'Doces & Confeitaria', 'Bebidas', 'Lanches', 'Carnes', 'Cafeteria', 'Cosméticos', 'Barbearia', 'Moda', 'Calçados']
                              .slice(0, 6)
                              .map((cat) => (
                                <button
                                  key={cat}
                                  type="button"
                                  onClick={() => handleUpdatePreviewItem(prod.id, 'category', cat)}
                                  className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border transition-all ${
                                    prod.category === cat
                                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                                      : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  {cat}
                                </button>
                              ))}
                          </div>

                          {/* Commercial Description */}
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 mb-1">
                              Descrição Comercial
                            </label>
                            <textarea
                              rows={2}
                              value={prod.description}
                              onChange={(e) => handleUpdatePreviewItem(prod.id, 'description', e.target.value)}
                              placeholder="Descrição comercial do produto..."
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:border-blue-500 outline-none resize-none"
                            />
                          </div>

                          {/* Features & SKU line */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Características:
                              </label>
                              <input
                                type="text"
                                value={Array.isArray(prod.features) ? prod.features.join(', ') : ''}
                                onChange={(e) =>
                                  handleUpdatePreviewItem(
                                    prod.id,
                                    'features',
                                    e.target.value.split(',').map((f) => f.trim()).filter(Boolean)
                                  )
                                }
                                placeholder="Ex: Original, Embalagem segura"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:bg-white"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                                Código SKU:
                              </label>
                              <input
                                type="text"
                                value={prod.sku || ''}
                                onChange={(e) => handleUpdatePreviewItem(prod.id, 'sku', e.target.value)}
                                placeholder="SKU-100"
                                className="w-full px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-700 outline-none focus:bg-white"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add manual item footer */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleAddNewItemToPreview}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 hover:underline"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Adicionar outro produto manualmente</span>
                    </button>

                    <span className="text-[11px] text-slate-500 font-medium">
                      Total: <strong className="text-slate-900">{parsedProducts.length} itens</strong> na lista de importação
                    </span>
                  </div>
                </div>
              )}

              {/* MODE B: TABLE VIEW (For Desktop bulk review) */}
              {viewMode === 'table' && (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                  <div className="overflow-x-auto max-h-[50vh]">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-white font-bold sticky top-0 z-10 text-[11px] uppercase tracking-wider">
                        <tr>
                          <th className="py-3 px-3 w-16">Foto</th>
                          <th className="py-3 px-3 min-w-[180px]">Nome do Produto</th>
                          <th className="py-3 px-3 w-32">Preço (R$) *</th>
                          <th className="py-3 px-3 min-w-[130px]">Categoria</th>
                          <th className="py-3 px-3 w-28">Estoque *</th>
                          <th className="py-3 px-3 min-w-[180px]">Descrição Comercial</th>
                          <th className="py-3 px-3 w-24">SKU</th>
                          <th className="py-3 px-3 w-12 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedProducts.map((prod) => {
                          const missingPrice = isItemMissingPrice(prod);
                          const missingStock = isItemMissingStock(prod);
                          const hasWarning = missingPrice || missingStock;

                          return (
                            <tr
                              key={prod.id}
                              className={`transition-colors ${
                                hasWarning ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-blue-50/30'
                              }`}
                            >
                              {/* Photo column */}
                              <td className="p-2 align-middle">
                                <input
                                  type="file"
                                  accept="image/*"
                                  ref={(el) => (itemPhotoInputRefs.current[prod.id] = el)}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleItemPhotoUpload(prod.id, file);
                                    e.target.value = '';
                                  }}
                                  className="hidden"
                                />
                                {prod.imageUrl ? (
                                  <div
                                    onClick={() => itemPhotoInputRefs.current[prod.id]?.click()}
                                    className="w-11 h-11 rounded-lg overflow-hidden border border-slate-200 relative group cursor-pointer bg-slate-100 shadow-sm"
                                    title="Clique para trocar foto"
                                  >
                                    <img
                                      src={prod.imageUrl}
                                      alt={prod.name}
                                      className="w-full h-full object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                      <Camera className="w-3.5 h-3.5" />
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => itemPhotoInputRefs.current[prod.id]?.click()}
                                    className="w-11 h-11 rounded-lg border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50 hover:bg-blue-50 flex flex-col items-center justify-center text-slate-400 hover:text-blue-600 transition-all"
                                    title="Subir foto para este produto"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span className="text-[8px] font-bold mt-0.5">Foto</span>
                                  </button>
                                )}
                              </td>

                              {/* Name column */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={prod.name}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'name', e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                                  placeholder="Nome do produto"
                                />
                                <div className="flex flex-wrap items-center gap-1 mt-1">
                                  {prod._isNameSuggested ? (
                                    <span className="text-[9px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                                      Nome sugerido pela IA
                                    </span>
                                  ) : prod._detectedTextOnPackage || prod._confidence === 'alta' ? (
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                                      Identificado da Foto
                                    </span>
                                  ) : null}
                                  {prod._detectedBrand && (
                                    <span className="text-[9px] font-bold text-blue-800 bg-blue-100/80 px-1.5 py-0.5 rounded">
                                      🏷️ {prod._detectedBrand}
                                    </span>
                                  )}
                                  {prod._detectedProductType && (
                                    <span className="text-[9px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                      📦 {prod._detectedProductType}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Price column */}
                              <td className="p-2">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-slate-400 text-xs font-bold">R$</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={missingPrice ? '' : prod.price}
                                    onChange={(e) => handleUpdatePreviewItem(prod.id, 'price', e.target.value)}
                                    placeholder="Informar"
                                    className={`w-full pl-8 pr-2 py-2 rounded-lg text-xs font-bold text-slate-900 focus:bg-white outline-none text-right ${
                                      missingPrice
                                        ? 'bg-amber-50 border-2 border-amber-400 placeholder:text-amber-700/60'
                                        : 'bg-slate-50 border border-slate-200 focus:border-blue-500'
                                    }`}
                                  />
                                </div>
                              </td>

                              {/* Category column */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={prod.category}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'category', e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:border-blue-500 outline-none"
                                  placeholder="Categoria"
                                />
                              </td>

                              {/* Stock column */}
                              <td className="p-2">
                                <input
                                  type="number"
                                  min="0"
                                  value={missingStock ? '' : prod.stockQuantity}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'stockQuantity', e.target.value)}
                                  placeholder="Informar"
                                  className={`w-full p-2 rounded-lg text-xs font-bold text-slate-900 focus:bg-white outline-none text-center ${
                                    missingStock
                                      ? 'bg-amber-50 border-2 border-amber-400 placeholder:text-amber-700/60'
                                      : 'bg-slate-50 border border-slate-200 focus:border-blue-500'
                                  }`}
                                />
                              </td>

                              {/* Description column */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={prod.description}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'description', e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:bg-white focus:border-blue-500 outline-none"
                                  placeholder="Descrição..."
                                />
                              </td>

                              {/* SKU column */}
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={prod.sku || ''}
                                  onChange={(e) => handleUpdatePreviewItem(prod.id, 'sku', e.target.value)}
                                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 focus:bg-white focus:border-blue-500 outline-none font-mono text-[11px]"
                                  placeholder="SKU"
                                />
                              </td>

                              {/* Actions */}
                              <td className="p-2 text-center align-middle">
                                <button
                                  type="button"
                                  onClick={() => handleRemovePreviewItem(prod.id)}
                                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Remover da lista"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Table Footer */}
                  <div className="bg-slate-50 p-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleAddNewItemToPreview}
                      className="text-xs text-blue-600 hover:text-blue-700 font-bold flex items-center gap-1.5 hover:underline"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Adicionar outro produto manualmente a esta lista</span>
                    </button>

                    <span className="text-[11px] text-slate-400 font-medium">
                      Total: {parsedProducts.length} itens prontos para importar
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-5 sm:px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {step === 1 ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all active:scale-95"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={isProcessing || (activeInputTab === 'photos' && selectedPhotos.length === 0)}
                onClick={handleProcessWithAI}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95"
              >
                {isProcessing ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>A IA está analisando {activeInputTab === 'photos' ? `${selectedPhotos.length} fotos...` : 'os produtos...'}</span>
                  </>
                ) : (
                  <>
                    {activeInputTab === 'photos' ? (
                      <>
                        <Bot className="w-4 h-4 text-blue-200" />
                        <span>🤖 Analizar productos con IA ({selectedPhotos.length} fotos)</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-200" />
                        <span>Interpretar com IA e Gerar Vista Prévia</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Voltar e Modificar Fotos / Entrada</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Descartar
                </button>

                <button
                  type="button"
                  disabled={isSaving || parsedProducts.length === 0}
                  onClick={handleConfirmSaveAll}
                  className={`w-full sm:w-auto px-6 py-2.5 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 active:scale-95 ${
                    invalidProductsCount > 0
                      ? 'bg-amber-600 hover:bg-amber-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-400 text-white'
                  }`}
                  title={
                    invalidProductsCount > 0
                      ? `Falta informar preço ou estoque em ${invalidProductsCount} produto(s)`
                      : 'Salvar produtos no catálogo'
                  }
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Salvando no catálogo...</span>
                    </>
                  ) : (
                    <>
                      {invalidProductsCount > 0 ? (
                        <>
                          <AlertCircle className="w-4 h-4 text-amber-200" />
                          <span>⚠️ Falta informar preço/estoque ({invalidProductsCount})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>✅ Agregar productos al catálogo ({parsedProducts.length})</span>
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Dedicated Dialog Modal for "Definir estoque para todos" */}
      {isBulkStockModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 animate-in zoom-in-95 space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 text-blue-700">
                <div className="p-2.5 bg-blue-100 rounded-2xl">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Definir Estoque para Todos</h3>
                  <p className="text-xs text-slate-500">Aplicar às {parsedProducts.length} fotos/produtos importados</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkStockModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">
                Quantidade de estoque (unidades por produto):
              </label>
              <input
                type="number"
                min="0"
                autoFocus
                value={bulkStockModalValue}
                onChange={(e) => setBulkStockModalValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleApplyBulkStockModal();
                }}
                placeholder="Ex: 10"
                className="w-full px-4 py-3 bg-slate-50 border-2 border-blue-500 rounded-2xl text-xl font-bold text-slate-900 text-center focus:bg-white outline-none"
              />

              {/* Quick suggestion chips */}
              <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-400 font-semibold">Atalhos rápidos:</span>
                {[5, 10, 15, 20, 50, 0].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => {
                      setBulkStockModalValue(String(val));
                      handleApplyBulkStockModal(val);
                    }}
                    className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-blue-100 hover:text-blue-700 rounded-lg text-slate-700 transition-colors"
                  >
                    {val === 0 ? '0 (Esgotado)' : `${val} un.`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-blue-50/70 border border-blue-200/80 p-3 rounded-2xl text-[11px] text-blue-900">
              💡 <strong>Dica:</strong> Ao aplicar, cada produto receberá {bulkStockModalValue || 0} unidades. Você poderá alterar o estoque de qualquer produto individualmente depois.
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkStockModalOpen(false)}
                className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleApplyBulkStockModal()}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Aplicar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

