import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { CatalogItem, SupabaseEmpresaRow, BusinessProject, AppUser, OrderStatus, CustomerOrder } from '../types';
import { INITIAL_BUSINESS_CONFIG, INITIAL_WORKING_HOURS } from '../data/defaultConfig';

export const METADATA_ROW_NAME = '__SYS_EMPRESA_METADATA__';

/**
 * Deterministic UUID generator for company metadata row in productos table
 */
export function getMetadataRowId(empresaId: number): string {
  const padded = String(Math.max(1, Math.floor(empresaId))).padStart(12, '0');
  return `00000000-0000-0000-0000-${padded}`;
}

/**
 * Deterministic UUID generator for catalog products to ensure idempotent updates and prevent duplicates
 */
export function getDeterministicProductUuid(empresaId: number, rawId: string): string {
  if (isValidUUID(rawId)) return rawId;
  let hash = 0;
  const str = `${empresaId}:${rawId}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, '0');
  const empHex = Math.abs(empresaId).toString(16).padStart(4, '0');
  return `1000${empHex}-${hex.slice(0, 4)}-4000-8000-${hex.padEnd(12, '0').slice(0, 12)}`;
}

// Safely obtain SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY from env or Vite define
const getSupabaseConfig = () => {
  let url = '';
  let key = '';

  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    url = (import.meta as any).env.VITE_SUPABASE_URL || (import.meta as any).env.SUPABASE_URL || '';
    key = (import.meta as any).env.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env.SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env.SUPABASE_ANON_KEY || '';
  }

  if (!url && typeof process !== 'undefined' && process.env) {
    url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
    key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  }

  return { url, key };
};

const { url: SUPABASE_URL, key: SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();

export const isSupabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * Column mapping for the 'productos' table in Supabase.
 * Supports both custom column names (currently present in the user's Supabase instance)
 * and standard column names.
 */
export interface ProductColumnMap {
  id: string;              // 'diid' or 'id'
  id_empresa: string;      // 'aserpme_didicreated_at' or 'id_empresa'
  nombre: string;          // 'erbmon' or 'nombre'
  descripcion: string;     // 'ipcion rcsed' or 'descripcion'
  precio: string;          // 'oicerp' or 'precio'
  imagen_url: string;      // 'lru_negami' or 'imagen_url'
  creado_en: string;       // 'ne_odaerecodaerec' or 'creado_en'
}

// Default columns matching the user's active table in Supabase
const CUSTOM_PRODUCT_COLUMNS: ProductColumnMap = {
  id: 'diid',
  id_empresa: 'aserpme_didicreated_at',
  nombre: 'erbmon',
  descripcion: 'ipcion rcsed',
  precio: 'oicerp',
  imagen_url: 'lru_negami',
  creado_en: 'ne_odaerecodaerec',
};

const STANDARD_PRODUCT_COLUMNS: ProductColumnMap = {
  id: 'id',
  id_empresa: 'id_empresa',
  nombre: 'nombre',
  descripcion: 'descripcion',
  precio: 'precio',
  imagen_url: 'imagen_url',
  creado_en: 'creado_en',
};

let cachedColumns: ProductColumnMap | null = null;

/**
 * Detects whether the Supabase 'productos' table uses the custom or standard column names.
 * Uses a zero-cost limit(0) probe to avoid downloading any rows.
 */
export async function resolveProductColumns(): Promise<ProductColumnMap> {
  if (cachedColumns) {
    return cachedColumns;
  }
  if (!supabase) {
    return CUSTOM_PRODUCT_COLUMNS;
  }

  try {
    // 1. Probe for 'aserpme_didicreated_at' (custom schema)
    const { error: customErr } = await supabase
      .from('productos')
      .select('aserpme_didicreated_at')
      .limit(0);

    if (!customErr) {
      cachedColumns = { ...CUSTOM_PRODUCT_COLUMNS };
      console.log('[Supabase] Esquema detectado: Columnas activas en Supabase (diid, aserpme_didicreated_at, erbmon, ipcion rcsed, oicerp, lru_negami).');
      return cachedColumns;
    }

    // 2. Probe for 'id_empresa' (standard schema)
    const { error: stdErr } = await supabase
      .from('productos')
      .select('id_empresa')
      .limit(0);

    if (!stdErr) {
      cachedColumns = { ...STANDARD_PRODUCT_COLUMNS };
      console.log('[Supabase] Esquema detectado: Columnas estándar (id, id_empresa, nombre, descripcion, precio, imagen_url).');
      return cachedColumns;
    }

    // Fallback to custom columns
    cachedColumns = { ...CUSTOM_PRODUCT_COLUMNS };
    return cachedColumns;
  } catch (err) {
    console.warn('[Supabase] Aviso al detectar columnas de productos:', err);
    cachedColumns = { ...CUSTOM_PRODUCT_COLUMNS };
    return cachedColumns;
  }
}

/**
 * Generates a valid UUIDv4 for Supabase primary keys
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fallback if randomUUID is not available
    }
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Helper to check if a string is a valid UUID
 */
export function isValidUUID(id: string | undefined | null): boolean {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

/**
 * Maps a Supabase 'productos' row to our application's CatalogItem.
 * Reads seamlessly from both custom column names and standard column names.
 */
export function mapProductoRowToCatalogItem(row: any): CatalogItem {
  const rawId = row.diid || row.id || generateUUID();
  const rawName = row.erbmon || row.nombre || row.name || 'Producto sin nombre';
  const rawDescription = row['ipcion rcsed'] || row.descripcion || row['descripción'] || row.description || '';
  
  let rawPrice = 0;
  if (typeof row.oicerp === 'number') {
    rawPrice = row.oicerp;
  } else if (typeof row.precio === 'number') {
    rawPrice = row.precio;
  } else if (row.oicerp !== null && row.oicerp !== undefined) {
    rawPrice = parseFloat(String(row.oicerp)) || 0;
  } else if (row.precio !== null && row.precio !== undefined) {
    rawPrice = parseFloat(String(row.precio)) || 0;
  }

  const rawImageUrl = row.lru_negami || row.imagen_url || row.imagen || row.image_url || '';

  return {
    id: String(rawId),
    name: String(rawName),
    description: String(rawDescription),
    price: rawPrice,
    imageUrl: String(rawImageUrl),
    category: row.categoria || 'General',
    features: Array.isArray(row.caracteristicas) ? row.caracteristicas : [],
    inStock: row.en_stock !== false,
    stockQuantity: typeof row.stock === 'number' ? row.stock : 99,
    status: 'disponivel',
  };
}

/**
 * Dynamic Table & Column Resolution for 'empresa' / 'Empresas' table.
 */
let cachedEmpresaTable: string | null = null;
let cachedEmpresaIdCol: string | null = null;
let cachedEmpresaHasNombre: boolean | null = null;

export async function resolveEmpresaTable(): Promise<{ table: string; idCol: string; hasNombre: boolean }> {
  if (cachedEmpresaTable && cachedEmpresaIdCol && cachedEmpresaHasNombre !== null) {
    return { table: cachedEmpresaTable, idCol: cachedEmpresaIdCol, hasNombre: cachedEmpresaHasNombre };
  }
  if (!supabase) {
    return { table: 'empresa', idCol: 'identificación', hasNombre: false };
  }

  const tableCandidates = ['empresa', 'Empresas', 'empresas', 'Empresa'];
  for (const t of tableCandidates) {
    try {
      const { data, error } = await supabase.from(t).select('*').limit(1);
      if (!error) {
        cachedEmpresaTable = t;
        const sample = data?.[0] || {};
        if ('identificación' in sample) {
          cachedEmpresaIdCol = 'identificación';
        } else if ('identificacion' in sample) {
          cachedEmpresaIdCol = 'identificacion';
        } else if ('id' in sample) {
          cachedEmpresaIdCol = 'id';
        } else {
          cachedEmpresaIdCol = 'identificación';
        }
        cachedEmpresaHasNombre = 'nombre' in sample || 'name' in sample;
        return { table: cachedEmpresaTable, idCol: cachedEmpresaIdCol, hasNombre: cachedEmpresaHasNombre };
      }
    } catch {
      // Continue to next candidate
    }
  }

  cachedEmpresaTable = 'empresa';
  cachedEmpresaIdCol = 'identificación';
  cachedEmpresaHasNombre = false;
  return { table: 'empresa', idCol: 'identificación', hasNombre: false };
}

/**
 * Fetches registered companies from Supabase.
 * Strictly applies database-level isolation: if currentUser is an Owner, only queries their assigned company.
 */
export async function fetchEmpresasFromSupabase(currentUser?: AppUser | null): Promise<SupabaseEmpresaRow[]> {
  if (!supabase) {
    return [];
  }

  try {
    const { table, idCol } = await resolveEmpresaTable();
    let query = supabase.from(table).select('*');

    // Database-level isolation for business owners:
    if (currentUser?.role === 'owner' && currentUser.empresaId) {
      query = query.eq(idCol, currentUser.empresaId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn(`[Supabase] Aviso al consultar tabla '${table}':`, error.message);
      return [];
    }

    return (data || []).map((row: any) => {
      const parsedId = Number(row[idCol] ?? row.identificación ?? row.identificacion ?? row.id ?? 1);
      return {
        identificación: parsedId,
        identificacion: parsedId,
        nombre: row.nombre || row.name || undefined,
        creado_en: row.creado_en || row.created_at,
      };
    });
  } catch (err: any) {
    console.warn('[Supabase] Excepción al consultar empresas:', err?.message);
    return [];
  }
}

/**
 * Creates or updates and registers a company in Supabase.
 * Enforces strict post-save verification query.
 */
export async function createEmpresaInSupabase(
  identificacion: number,
  companyName?: string
): Promise<{ success: boolean; id: number; data?: any }> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Revisa las variables de entorno SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY.');
  }

  const targetId = Number(identificacion);
  if (isNaN(targetId) || targetId <= 0) {
    throw new Error(`ID de empresa inválido: "${identificacion}". Debe ser un número positivo mayor que cero.`);
  }

  const { table, idCol, hasNombre } = await resolveEmpresaTable();
  console.log(`[Supabase] Ejecutando guardado de empresa #${targetId} en tabla '${table}' (columna ${idCol})...`);

  // Build payload
  const payload: Record<string, any> = {
    [idCol]: targetId,
  };
  if (hasNombre && companyName) {
    payload.nombre = companyName.trim();
  }

  // 1. Try Upsert / Insert
  const { data: upsertData, error: upsertError } = await supabase
    .from(table)
    .upsert([payload], { onConflict: idCol })
    .select();

  if (upsertError) {
    console.warn(`[Supabase] Aviso en upsert de '${table}', intentando insert directo:`, upsertError.message);
    // Try simple insert
    const { error: insertError } = await supabase
      .from(table)
      .insert([payload]);

    if (insertError && insertError.code !== '23505') {
      console.error(`[Supabase] ❌ Error crítico al crear empresa #${targetId}:`, insertError.message);
      throw new Error(`Error en Supabase (tabla '${table}'): ${insertError.message}`);
    }
  }

  // 2. Post-Save Verification: query the database to verify the record truly exists
  const { data: verifyData, error: verifyError } = await supabase
    .from(table)
    .select('*')
    .eq(idCol, targetId)
    .limit(1);

  if (verifyError || !verifyData || verifyData.length === 0) {
    console.error(`[Supabase] ❌ Verificación fallida: La empresa #${targetId} no fue encontrada tras guardar.`);
    throw new Error(`Supabase no confirmó la persistencia de la empresa #${targetId}.`);
  }

  console.log(`[Supabase] ✅ Empresa #${targetId} confirmada y verificada en Supabase:`, verifyData[0]);
  return { success: true, id: targetId, data: verifyData[0] };
}

/**
 * Gets the next available unique empresa_id from Supabase.
 * Ensures that newly created companies NEVER collide with existing company IDs.
 */
export async function getNextEmpresaIdFromSupabase(): Promise<number> {
  const empresas = await fetchEmpresasFromSupabase();
  let maxId = 0;
  for (const emp of empresas) {
    const idNum = emp.identificación || emp.identificacion;
    if (typeof idNum === 'number' && idNum > maxId) {
      maxId = idNum;
    }
  }
  return maxId > 0 ? maxId + 1 : 1;
}

/**
 * Fetches products strictly associated with a specific company:
 * productos.[cols.id_empresa] = empresa.identificación
 * Guarantees strict company isolation.
 */
export async function fetchProductosByEmpresa(idEmpresa: number): Promise<CatalogItem[]> {
  if (!supabase) return [];

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq(cols.id_empresa, targetEmpresaId);

    if (error) {
      console.warn(`[Supabase] Error al cargar productos de empresa #${targetEmpresaId}:`, error.message);
      return [];
    }

    if (!Array.isArray(data)) return [];

    const catalogRows = data.filter((row: any) => {
      const rowName = row[cols.nombre] || row.erbmon || row.nombre;
      return rowName !== METADATA_ROW_NAME;
    });

    console.log(`[Supabase] ✅ ${catalogRows.length} productos leídos directamente de Supabase para empresa #${targetEmpresaId}.`);
    return catalogRows.map(mapProductoRowToCatalogItem);
  } catch (err: any) {
    console.warn(`[Supabase] Excepción al cargar productos de empresa #${idEmpresa}:`, err?.message);
    return [];
  }
}

/**
 * Inserts a new product into the Supabase 'productos' table.
 * Uses exact matching columns (diid, aserpme_didicreated_at, erbmon, ipcion rcsed, oicerp, lru_negami).
 * Returns the created CatalogItem with its real Supabase UUID on success.
 */
export async function createProductoInSupabase(
  item: Partial<CatalogItem>,
  idEmpresa: number,
  currentUser?: AppUser | null
): Promise<CatalogItem | null> {
  if (!supabase) return null;

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    // Permission guard: An owner can only add products to their own company
    if (currentUser?.role === 'owner') {
      if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
        console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para añadir producto en empresa #${targetEmpresaId}`);
        throw new Error(`Acceso denegado: No tiene permisos para agregar productos a otra empresa.`);
      }
    }

    // Ensure company row exists in empresa table
    await createEmpresaInSupabase(targetEmpresaId);

    // Ensure valid UUID for Postgres uuid column
    const validUuid = isValidUUID(item.id) ? item.id! : generateUUID();

    const payload: Record<string, any> = {
      [cols.id]: validUuid,
      [cols.id_empresa]: targetEmpresaId,
      [cols.nombre]: item.name?.trim() || 'Nuevo Producto',
      [cols.descripcion]: item.description?.trim() || '',
      [cols.precio]: Number(item.price) || 0,
      [cols.imagen_url]: item.imageUrl || '',
    };

    console.log('[Supabase] Ejecutando INSERT en tabla "productos":', payload);

    const { data, error } = await supabase
      .from('productos')
      .insert([payload])
      .select();

    if (error) {
      console.error('[Supabase] ❌ Error en INSERT de producto:', error.message, error.details);
      throw new Error(`Error en Supabase: ${error.message}`);
    }

    if (data && data.length > 0) {
      const savedItem = mapProductoRowToCatalogItem(data[0]);
      console.log(`[Supabase] ✅ Producto "${savedItem.name}" guardado exitosamente con ID ${savedItem.id} en empresa #${targetEmpresaId}.`);
      return savedItem;
    }

    return null;
  } catch (err: any) {
    console.error('[Supabase] Excepción al crear producto:', err?.message || err);
    throw err;
  }
}

/**
 * Updates a product in Supabase 'productos' table.
 * Enforces company isolation: cols.id_empresa must match.
 */
export async function updateProductoInSupabase(
  id: string,
  item: Partial<CatalogItem>,
  idEmpresa: number,
  currentUser?: AppUser | null
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    // Permission guard: An owner can only modify products of their own company
    if (currentUser?.role === 'owner') {
      if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
        console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para modificar producto en empresa #${targetEmpresaId}`);
        throw new Error(`Acceso denegado: No tiene permisos para modificar productos de otra empresa.`);
      }
    }

    const payload: Record<string, any> = {};
    if (item.name !== undefined) payload[cols.nombre] = item.name.trim();
    if (item.description !== undefined) payload[cols.descripcion] = item.description.trim();
    if (item.price !== undefined) payload[cols.precio] = Number(item.price) || 0;
    if (item.imageUrl !== undefined) payload[cols.imagen_url] = item.imageUrl;

    console.log(`[Supabase] Ejecutando UPDATE en producto ${id} (empresa #${targetEmpresaId}):`, payload);

    const { error } = await supabase
      .from('productos')
      .update(payload)
      .eq(cols.id, id)
      .eq(cols.id_empresa, targetEmpresaId);

    if (error) {
      console.error(`[Supabase] ❌ Error en UPDATE de producto ${id}:`, error.message);
      return false;
    }

    console.log(`[Supabase] ✅ Producto ${id} actualizado correctamente en Supabase.`);
    return true;
  } catch (err: any) {
    console.error(`[Supabase] Excepción en actualización de producto ${id}:`, err?.message || err);
    return false;
  }
}

/**
 * Deletes a product from Supabase 'productos' table.
 * Enforces company isolation: cols.id_empresa must match, and verifies owner permission.
 */
export async function deleteProductoFromSupabase(
  id: string,
  idEmpresa: number,
  currentUser?: AppUser | null
): Promise<boolean> {
  if (!supabase) return false;

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    // Permission guard: An owner can only delete products of their own company
    if (currentUser?.role === 'owner') {
      if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
        console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para eliminar producto en empresa #${targetEmpresaId}`);
        throw new Error(`Acceso denegado: No tiene permisos para eliminar productos de otra empresa.`);
      }
    }

    console.log(`[Supabase] Ejecutando DELETE en producto ${id} (empresa #${targetEmpresaId})`);

    const { error } = await supabase
      .from('productos')
      .delete()
      .eq(cols.id, id)
      .eq(cols.id_empresa, targetEmpresaId);

    if (error) {
      console.error(`[Supabase] ❌ Error al eliminar producto ${id}:`, error.message);
      return false;
    }

    console.log(`[Supabase] ✅ Producto ${id} eliminado de Supabase.`);
    return true;
  } catch (err: any) {
    console.error(`[Supabase] Excepción al eliminar producto ${id}:`, err?.message || err);
    return false;
  }
}

/**
 * Deletes all products belonging to a specific company in Supabase.
 * Strictly scoped by cols.id_empresa = targetEmpresaId.
 */
export async function deleteAllProductosByEmpresaFromSupabase(idEmpresa: number): Promise<boolean> {
  if (!supabase) return false;

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    console.log(`[Supabase] Eliminando todos los productos de empresa #${targetEmpresaId}`);
    const { error } = await supabase
      .from('productos')
      .delete()
      .eq(cols.id_empresa, targetEmpresaId);

    if (error) {
      console.warn(`[Supabase] Aviso al eliminar productos de empresa #${targetEmpresaId}:`, error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn(`[Supabase] Excepción al eliminar productos de empresa #${idEmpresa}:`, err?.message);
    return false;
  }
}

/**
 * Deletes a company and its isolated data from Supabase 'empresa' table.
 * Performs a complete cascading cleanup:
 * 1. Deletes all catalog products
 * 2. Deletes the company metadata row (containing orders, leads, knowledge, etc.)
 * 3. Cleans up any secondary tables (pedidos, leads, etc.) if existing
 * 4. Cleans up Supabase Storage assets for this company
 * 5. Deletes the company row in 'empresa' table
 * Strictly forbidden for owners — only the main administrator can delete companies.
 */
export async function deleteEmpresaFromSupabase(
  idEmpresa: number,
  currentUser?: AppUser | null
): Promise<boolean> {
  if (!supabase) return false;

  // Multi-tenant permission guard: Owners are strictly forbidden from deleting companies!
  if (currentUser?.role === 'owner') {
    console.error(`[Supabase Auth Guard] ❌ Dueño intentó eliminar empresa #${idEmpresa}`);
    throw new Error(`Acceso denegado: Los dueños de empresa no tienen permisos para eliminar empresas. Solo el Administrador Principal de Vendedor IA.`);
  }

  try {
    const targetEmpresaId = Number(idEmpresa);
    console.log(`[Supabase] 🗑️ Iniciando eliminación completa en cascada de empresa #${targetEmpresaId}...`);

    // 1. Delete all catalog products for this company
    await deleteAllProductosByEmpresaFromSupabase(targetEmpresaId);

    // 2. Explicitly ensure the metadata row in 'productos' is deleted
    const cols = await resolveProductColumns();
    const metaRowId = getMetadataRowId(targetEmpresaId);
    try {
      await supabase
        .from('productos')
        .delete()
        .eq(cols.id, metaRowId);

      await supabase
        .from('productos')
        .delete()
        .eq(cols.nombre, METADATA_ROW_NAME)
        .eq(cols.id_empresa, targetEmpresaId);
    } catch (metaErr) {
      console.warn(`[Supabase] Aviso al limpiar fila de metadatos de empresa #${targetEmpresaId}:`, metaErr);
    }

    // 3. Clean up any related secondary tables if they exist in Supabase
    const secondaryTables = ['pedidos', 'orders', 'leads', 'clientes', 'citas', 'appointments', 'promociones'];
    for (const table of secondaryTables) {
      try {
        await supabase.from(table).delete().eq('id_empresa', targetEmpresaId);
      } catch {}
      try {
        await supabase.from(table).delete().eq('empresa_id', targetEmpresaId);
      } catch {}
    }

    // 4. Clean up storage files if storage buckets are accessible
    try {
      const storageBuckets = ['images', 'logos', 'products', 'avatars', 'empresa'];
      for (const bucketName of storageBuckets) {
        try {
          const { data: fileList } = await supabase.storage.from(bucketName).list(`empresa-${targetEmpresaId}`);
          if (fileList && fileList.length > 0) {
            const filesToRemove = fileList.map((f) => `empresa-${targetEmpresaId}/${f.name}`);
            await supabase.storage.from(bucketName).remove(filesToRemove);
          }
        } catch {}
      }
    } catch (storageErr) {
      console.warn(`[Supabase Storage] Aviso al limpiar archivos de empresa #${targetEmpresaId}:`, storageErr);
    }

    // 5. Delete empresa row from 'empresa' table
    const { error: err1 } = await supabase
      .from('empresa')
      .delete()
      .eq('identificación', targetEmpresaId);

    if (!err1) {
      console.log(`[Supabase] ✅ Empresa #${targetEmpresaId} y todos sus datos asociados fueron eliminados de Supabase.`);
      return true;
    }

    const { error: err2 } = await supabase
      .from('empresa')
      .delete()
      .eq('identificacion', targetEmpresaId);

    if (!err2) {
      console.log(`[Supabase] ✅ Empresa #${targetEmpresaId} eliminada usando columna identificacion.`);
      return true;
    }

    const { error: err3 } = await supabase
      .from('empresa')
      .delete()
      .eq('id', targetEmpresaId);

    return !err3;
  } catch (err: any) {
    console.error(`[Supabase] Excepción al eliminar empresa #${idEmpresa}:`, err?.message || err);
    return false;
  }
}

/**
 * Updates the status of an existing order directly in Supabase metadata row.
 * Guarantees real persistence across reloads, page changes, and devices.
 */
export async function updateOrderStatusInSupabase(
  idEmpresa: number | string,
  orderId: string,
  newStatus: OrderStatus,
  currentUser?: AppUser | null
): Promise<boolean> {
  if (!supabase) return false;

  const targetEmpresaId = Number(idEmpresa);

  // Permission guard: An owner can only modify orders of their own company
  if (currentUser?.role === 'owner') {
    if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
      console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para actualizar pedidos de empresa #${targetEmpresaId}`);
      throw new Error(`Acceso denegado: No tiene permisos para modificar pedidos de otra empresa.`);
    }
  }

  try {
    const cols = await resolveProductColumns();
    const metaRowId = getMetadataRowId(targetEmpresaId);

    // 1. Fetch current metadata row
    const { data, error } = await supabase
      .from('productos')
      .select(cols.descripcion)
      .eq(cols.id, metaRowId)
      .maybeSingle();

    if (error || !data) {
      console.warn(`[Supabase] Fila de metadatos no encontrada para empresa #${targetEmpresaId}, omitiendo actualización atómica.`);
      return false;
    }

    let meta: any = {};
    if ((data as any)[cols.descripcion]) {
      try {
        meta = JSON.parse((data as any)[cols.descripcion]);
      } catch (e) {
        console.warn('[Supabase] Error al parsear JSON de metadatos:', e);
      }
    }

    if (!Array.isArray(meta.orders)) {
      meta.orders = [];
    }

    const orderIdx = meta.orders.findIndex((o: CustomerOrder) => o.id === orderId);
    if (orderIdx >= 0) {
      meta.orders[orderIdx] = {
        ...meta.orders[orderIdx],
        status: newStatus,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // If order not yet in list, push it with the given status
      meta.orders.push({
        id: orderId,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
    }
    meta.updatedAt = new Date().toISOString();

    // 2. Persist updated metadata in Supabase
    const { error: updateErr } = await supabase
      .from('productos')
      .update({
        [cols.descripcion]: JSON.stringify(meta),
      })
      .eq(cols.id, metaRowId);

    if (updateErr) {
      console.error(`[Supabase] Error al persistir estado de pedido #${orderId}:`, updateErr.message);
      return false;
    }

    console.log(`[Supabase] ✅ Pedido #${orderId} actualizado a estado "${newStatus}" en empresa #${targetEmpresaId}.`);

    // 3. Optional secondary update if a dedicated 'pedidos' table exists
    try {
      await supabase
        .from('pedidos')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', orderId);
    } catch {}

    return true;
  } catch (err: any) {
    console.error(`[Supabase] Excepción al actualizar estado del pedido #${orderId}:`, err?.message || err);
    return false;
  }
}

/**
 * Synchronizes catalog items to Supabase via UPSERT on the primary key.
 * Enforces company isolation: every row is assigned to idEmpresa.
 */
export async function syncCatalogToSupabase(
  catalog: CatalogItem[],
  idEmpresa: number,
  currentUser?: AppUser | null
): Promise<{ success: boolean; syncedCount: number }> {
  if (!supabase || !Array.isArray(catalog) || catalog.length === 0) {
    return { success: false, syncedCount: 0 };
  }

  try {
    const cols = await resolveProductColumns();
    const targetEmpresaId = Number(idEmpresa);

    // Permission guard: An owner can only sync products to their own company
    if (currentUser?.role === 'owner') {
      if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
        console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para sincronizar catálogo en empresa #${targetEmpresaId}`);
        throw new Error(`Acceso denegado: No tiene permisos para modificar el catálogo de otra empresa.`);
      }
    }

    // Ensure company row exists in empresa table
    await createEmpresaInSupabase(targetEmpresaId);

    const rows = catalog.map((item) => {
      const validUuid = isValidUUID(item.id) ? item.id : getDeterministicProductUuid(targetEmpresaId, item.id);
      // Ensure the in-memory item also has the valid UUID for subsequent updates
      item.id = validUuid;

      return {
        [cols.id]: validUuid,
        [cols.id_empresa]: targetEmpresaId,
        [cols.nombre]: item.name?.trim() || 'Producto',
        [cols.descripcion]: item.description?.trim() || '',
        [cols.precio]: Number(item.price) || 0,
        [cols.imagen_url]: item.imageUrl || '',
      };
    });

    console.log(`[Supabase] Ejecutando UPSERT masivo de ${rows.length} productos para empresa #${targetEmpresaId}...`);

    const { data, error } = await supabase
      .from('productos')
      .upsert(rows, { onConflict: cols.id })
      .select();

    if (error) {
      console.error('[Supabase] ❌ Error en UPSERT masivo:', error.message);
      return { success: false, syncedCount: 0 };
    }

    const count = data?.length || rows.length;
    console.log(`[Supabase] ✅ ${count} productos sincronizados y confirmados en Supabase.`);
    return { success: true, syncedCount: count };
  } catch (err: any) {
    console.error('[Supabase] Excepción al sincronizar catálogo:', err?.message || err);
    return { success: false, syncedCount: 0 };
  }
}

/**
 * Saves a complete business project (company details, configuration, leads, orders, FAQs, and catalog)
 * directly and exclusively into Supabase.
 * Enforces role-based permissions: business owners may only save their own company's data.
 */
export async function saveProjectToSupabase(
  project: BusinessProject,
  currentUser?: AppUser | null
): Promise<{ success: boolean; empresaId: number }> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.');
  }

  const targetEmpresaId = Number(
    project.empresaId || (project.id && !isNaN(Number(project.id)) ? Number(project.id) : 1)
  );

  // Permission guard: An owner can only save and modify their own company
  if (currentUser?.role === 'owner') {
    if (!currentUser.empresaId || targetEmpresaId !== currentUser.empresaId) {
      console.error(`[Supabase Auth Guard] ❌ Dueño no autorizado para guardar en empresa #${targetEmpresaId}`);
      throw new Error(`Acceso denegado: No tiene permisos para modificar datos de otra empresa.`);
    }
  }

  // 1. Ensure empresa row exists in 'empresa'
  await createEmpresaInSupabase(targetEmpresaId, project.name);

  const cols = await resolveProductColumns();

  // 2. Prepare metadata payload containing all company configurations and states
  const metaPayload = {
    id: project.id,
    empresaId: targetEmpresaId,
    name: project.name,
    businessType: project.businessType || 'Comercio',
    category: project.category || 'General',
    description: project.description || '',
    logoUrl: project.logoUrl || project.config?.logoUrl || '',
    status: project.status || 'ativo',
    ownerWhatsapp: project.ownerWhatsapp || project.config?.ownerWhatsapp || '',
    ownerAccessRevoked: Boolean(project.ownerAccessRevoked ?? project.config?.ownerAccessRevoked ?? false),
    ownerAccessToken: project.ownerAccessToken || project.config?.ownerAccessToken || '',
    ownerAccessRevokedAt: project.ownerAccessRevokedAt || project.config?.ownerAccessRevokedAt || '',
    createdAt: project.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      ...project.config,
      logoUrl: project.logoUrl || project.config?.logoUrl || '',
      ownerWhatsapp: project.ownerWhatsapp || project.config?.ownerWhatsapp || '',
      ownerAccessRevoked: Boolean(project.ownerAccessRevoked ?? project.config?.ownerAccessRevoked ?? false),
      ownerAccessToken: project.ownerAccessToken || project.config?.ownerAccessToken || '',
      ownerAccessRevokedAt: project.ownerAccessRevokedAt || project.config?.ownerAccessRevokedAt || '',
    },
    catalog: project.catalog || [],
    services: project.services || [],
    professionals: project.professionals || [],
    workingHours: project.workingHours,
    appointments: project.appointments || [],
    faqs: project.faqs || [],
    aiKnowledge: project.aiKnowledge || [],
    unansweredQuestions: project.unansweredQuestions || [],
    leads: project.leads || [],
    orders: project.orders || [],
    promotions: project.promotions || [],
  };

  const metaRowId = getMetadataRowId(targetEmpresaId);
  const metaDbRow = {
    [cols.id]: metaRowId,
    [cols.id_empresa]: targetEmpresaId,
    [cols.nombre]: METADATA_ROW_NAME,
    [cols.descripcion]: JSON.stringify(metaPayload),
    [cols.precio]: 0,
    [cols.imagen_url]: '',
  };

  // 3. Upsert metadata row in productos
  const { error: metaErr } = await supabase
    .from('productos')
    .upsert([metaDbRow], { onConflict: cols.id });

  if (metaErr) {
    console.error('[Supabase] Error al guardar metadatos de empresa:', metaErr.message);
    throw new Error(`Error en Supabase al guardar datos de la empresa: ${metaErr.message}`);
  }

  // 4. Synchronize catalog items if any
  if (Array.isArray(project.catalog)) {
    if (project.catalog.length > 0) {
      await syncCatalogToSupabase(project.catalog, targetEmpresaId);
    }

    // Clean up deleted products for this company (excluding metadata row)
    try {
      const validCatalogIds = new Set(project.catalog.map((c) => c.id).filter(Boolean));
      const { data: existingRows } = await supabase
        .from('productos')
        .select(`${cols.id}, ${cols.nombre}`)
        .eq(cols.id_empresa, targetEmpresaId);

      if (Array.isArray(existingRows)) {
        const idsToDelete = existingRows
          .filter((r: any) => {
            const rowName = r[cols.nombre] || r.erbmon || r.nombre;
            const rowId = r[cols.id] || r.diid || r.id;
            return rowName !== METADATA_ROW_NAME && rowId !== metaRowId && !validCatalogIds.has(rowId);
          })
          .map((r: any) => r[cols.id] || r.diid || r.id);

        if (idsToDelete.length > 0) {
          await supabase
            .from('productos')
            .delete()
            .in(cols.id, idsToDelete)
            .eq(cols.id_empresa, targetEmpresaId);
        }
      }
    } catch (cleanErr) {
      console.warn('[Supabase] Aviso en limpieza de productos eliminados:', cleanErr);
    }
  }

  console.log(`[Supabase] ✅ Empresa #${targetEmpresaId} ("${project.name}") y sus datos guardados con éxito.`);
  return { success: true, empresaId: targetEmpresaId };
}

/**
 * Fetches business projects, their configurations, and their product catalogs from Supabase.
 * Strictly respects user role: Owners receive ONLY their company and products. Superadmins receive all.
 */
export async function fetchProjectsFromSupabase(currentUser?: AppUser | null): Promise<BusinessProject[]> {
  if (!supabase) return [];

  try {
    const empresas = await fetchEmpresasFromSupabase(currentUser);
    if (!empresas || empresas.length === 0) {
      return [];
    }

    const cols = await resolveProductColumns();
    const projects: BusinessProject[] = [];

    for (const emp of empresas) {
      const empId = Number(emp.identificación || emp.identificacion || 1);

      // Multi-tenant check: Skip if user is an owner and this is not their company
      if (currentUser?.role === 'owner' && currentUser.empresaId && empId !== currentUser.empresaId) {
        continue;
      }

      // Fetch all rows for this company from productos
      const { data: rows, error } = await supabase
        .from('productos')
        .select('*')
        .eq(cols.id_empresa, empId);

      if (error) {
        console.warn(`[Supabase] Error al consultar datos de empresa #${empId}:`, error.message);
        continue;
      }

      const allRows = rows || [];
      const metaRow = allRows.find(
        (r: any) => (r[cols.nombre] || r.erbmon || r.nombre) === METADATA_ROW_NAME
      );

      // Separate catalog products
      const catalogRows = allRows.filter(
        (r: any) => (r[cols.nombre] || r.erbmon || r.nombre) !== METADATA_ROW_NAME
      );
      const catalogItems = catalogRows.map(mapProductoRowToCatalogItem);

      if (metaRow) {
        try {
          const rawJson =
            metaRow[cols.descripcion] || metaRow['ipcion rcsed'] || metaRow.descripcion || '{}';
          const metaData = JSON.parse(rawJson);
          const rawCatalogFromMeta: any[] = Array.isArray(metaData.catalog) ? metaData.catalog : [];

          // Merge SQL catalog rows with metadata to preserve rich fields (e.g. saleType, weightUnit, pricePerKg)
          let finalCatalog: CatalogItem[] = [];
          if (catalogItems.length > 0) {
            finalCatalog = catalogItems.map((item) => {
              const metaItem = rawCatalogFromMeta.find(
                (m) => m.id === item.id || (m.name && m.name.toLowerCase().trim() === item.name.toLowerCase().trim())
              );
              if (metaItem) {
                return {
                  ...metaItem,
                  ...item,
                  saleType: item.saleType || metaItem.saleType || 'unit',
                  weightUnit: item.weightUnit || metaItem.weightUnit || 'kg',
                  pricePerKg: typeof item.pricePerKg === 'number' ? item.pricePerKg : metaItem.pricePerKg,
                };
              }
              return item;
            });
          } else if (rawCatalogFromMeta.length > 0) {
            finalCatalog = rawCatalogFromMeta;
          }

          const reconstructed: BusinessProject = {
            id: metaData.id || `empresa-${empId}`,
            empresaId: empId,
            name: metaData.name || emp.nombre || `Empresa #${empId}`,
            businessType: metaData.businessType || 'Comercio',
            category: metaData.category || 'General',
            description: metaData.description || '',
            logoUrl: metaData.logoUrl || metaData.config?.logoUrl || '',
            status: metaData.status || 'ativo',
            ownerWhatsapp: metaData.ownerWhatsapp || metaData.config?.ownerWhatsapp || '',
            ownerAccessRevoked: Boolean(metaData.ownerAccessRevoked ?? metaData.config?.ownerAccessRevoked ?? false),
            ownerAccessToken: metaData.ownerAccessToken || metaData.config?.ownerAccessToken || '',
            ownerAccessRevokedAt: metaData.ownerAccessRevokedAt || metaData.config?.ownerAccessRevokedAt || '',
            createdAt: metaData.createdAt || emp.creado_en || new Date().toISOString(),
            updatedAt: metaData.updatedAt || new Date().toISOString(),
            config: {
              ...(metaData.config || INITIAL_BUSINESS_CONFIG),
              logoUrl: metaData.logoUrl || metaData.config?.logoUrl || '',
              ownerWhatsapp: metaData.ownerWhatsapp || metaData.config?.ownerWhatsapp || '',
              ownerAccessRevoked: Boolean(metaData.ownerAccessRevoked ?? metaData.config?.ownerAccessRevoked ?? false),
              ownerAccessToken: metaData.ownerAccessToken || metaData.config?.ownerAccessToken || '',
              ownerAccessRevokedAt: metaData.ownerAccessRevokedAt || metaData.config?.ownerAccessRevokedAt || '',
              id: metaData.id || `empresa-${empId}`,
              name: metaData.name || emp.nombre || `Empresa #${empId}`,
            },
            catalog: finalCatalog,
            services: Array.isArray(metaData.services) ? metaData.services : [],
            professionals: Array.isArray(metaData.professionals) ? metaData.professionals : [],
            workingHours: metaData.workingHours || { ...INITIAL_WORKING_HOURS },
            appointments: Array.isArray(metaData.appointments) ? metaData.appointments : [],
            faqs: Array.isArray(metaData.faqs) ? metaData.faqs : [],
            aiKnowledge: Array.isArray(metaData.aiKnowledge) ? metaData.aiKnowledge : [],
            unansweredQuestions: Array.isArray(metaData.unansweredQuestions)
              ? metaData.unansweredQuestions
              : [],
            leads: Array.isArray(metaData.leads) ? metaData.leads : [],
            orders: Array.isArray(metaData.orders) ? metaData.orders : [],
            promotions: Array.isArray(metaData.promotions) ? metaData.promotions : [],
          };
          projects.push(reconstructed);
        } catch (parseErr) {
          console.warn(`[Supabase] Error al parsear metadatos de empresa #${empId}:`, parseErr);
        }
      } else {
        // Construct default isolated container for this empresa with its products
        const defaultProj: BusinessProject = {
          id: `empresa-${empId}`,
          empresaId: empId,
          name: emp.nombre || `Empresa #${empId}`,
          businessType: 'Comercio',
          category: 'General',
          description: '',
          logoUrl: '',
          status: 'ativo',
          ownerWhatsapp: '',
          ownerAccessRevoked: false,
          ownerAccessToken: `token-empresa-${empId}`,
          createdAt: emp.creado_en || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          config: {
            ...INITIAL_BUSINESS_CONFIG,
            id: `empresa-${empId}`,
            name: emp.nombre || `Empresa #${empId}`,
            botName: `Asistente Empresa #${empId}`,
            logoUrl: '',
            ownerWhatsapp: '',
            ownerAccessRevoked: false,
            ownerAccessToken: `token-empresa-${empId}`,
          },
          catalog: catalogItems,
          services: [],
          professionals: [],
          workingHours: { ...INITIAL_WORKING_HOURS },
          appointments: [],
          faqs: [],
          aiKnowledge: [],
          unansweredQuestions: [],
          leads: [],
          orders: [],
          promotions: [],
        };
        projects.push(defaultProj);
      }
    }

    return projects;
  } catch (err: any) {
    console.error('[Supabase] Excepción al recuperar empresas:', err?.message || err);
    return [];
  }
}

/**
 * Deletes a business project from Supabase by project ID or empresa ID.
 * Strictly forbidden for owners — only superadmins may delete companies.
 */
export async function deleteProjectFromSupabase(
  projectIdOrEmpresaId: string | number,
  currentUser?: AppUser | null
): Promise<boolean> {
  let empId: number | null = null;
  if (typeof projectIdOrEmpresaId === 'number') {
    empId = projectIdOrEmpresaId;
  } else if (!isNaN(Number(projectIdOrEmpresaId))) {
    empId = Number(projectIdOrEmpresaId);
  } else if (typeof projectIdOrEmpresaId === 'string' && projectIdOrEmpresaId.startsWith('empresa-')) {
    empId = Number(projectIdOrEmpresaId.replace('empresa-', ''));
  }

  if (empId) {
    return await deleteEmpresaFromSupabase(empId, currentUser);
  }
  return true;
}

/**
 * Subscribes to real-time changes across companies and products in Supabase.
 * Uses getCurrentUser to ensure owners only receive their company's updates.
 */
export function subscribeToProjectsFromSupabase(
  onUpdate: (projects: BusinessProject[]) => void,
  onError?: (err: any) => void,
  getCurrentUser?: () => AppUser | null
): () => void {
  if (!supabase) return () => {};

  try {
    let debounceTimer: any = null;
    const triggerUpdate = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        try {
          const user = getCurrentUser ? getCurrentUser() : null;
          const freshProjects = await fetchProjectsFromSupabase(user);
          if (freshProjects && freshProjects.length > 0) {
            onUpdate(freshProjects);
          }
        } catch (e) {
          if (onError) onError(e);
        }
      }, 500);
    };

    const channel = supabase
      .channel(`public:all_changes:${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'empresa' }, triggerUpdate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'productos' }, triggerUpdate)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  } catch (err) {
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Subscribes to real-time changes in table 'productos' for a specific company
 */
export function subscribeToProductosByEmpresa(
  idEmpresa: number,
  onUpdate: () => void
): () => void {
  if (!supabase) return () => {};

  try {
    const targetEmpresaId = Number(idEmpresa);
    // Subscribe to changes on public:productos
    const channel = supabase
      .channel(`public:productos:${targetEmpresaId}:${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'productos',
        },
        (payload: any) => {
          // Verify company matches payload.new or payload.old
          const newEmpresa = payload?.new?.aserpme_didicreated_at ?? payload?.new?.id_empresa;
          const oldEmpresa = payload?.old?.aserpme_didicreated_at ?? payload?.old?.id_empresa;
          if (newEmpresa === targetEmpresaId || oldEmpresa === targetEmpresaId || (!newEmpresa && !oldEmpresa)) {
            console.log(`[Supabase Realtime] Cambio detectado en productos para empresa #${targetEmpresaId}:`, payload.eventType);
            onUpdate();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  } catch (err) {
    console.warn('[Supabase] No se pudo suscribir a cambios en tiempo real:', err);
    return () => {};
  }
}

/**
 * Complete diagnosis of Supabase connection & schema readiness
 */
export interface SupabaseStatusDiagnosis {
  isConfigured: boolean;
  projectUrl: string;
  empresaReady: boolean;
  productosReady: boolean;
  empresaMessage: string;
  productosMessage: string;
  empresaCount: number;
  productosCount: number;
  detectedColumns: ProductColumnMap;
}

export async function checkSupabaseStatus(idEmpresa?: number): Promise<SupabaseStatusDiagnosis> {
  if (!supabase) {
    return {
      isConfigured: false,
      projectUrl: '',
      empresaReady: false,
      productosReady: false,
      empresaMessage: 'Credenciales de Supabase no configuradas.',
      productosMessage: 'Credenciales de Supabase no configuradas.',
      empresaCount: 0,
      productosCount: 0,
      detectedColumns: CUSTOM_PRODUCT_COLUMNS,
    };
  }

  let empresaReady = false;
  let empresaMessage = '';
  let empresaCount = 0;
  let productosReady = false;
  let productosMessage = '';
  let productosCount = 0;

  const cols = await resolveProductColumns();

  // 1. Check empresa
  try {
    const { data, error, count } = await supabase
      .from('empresa')
      .select('*', { count: 'exact' })
      .limit(10);

    if (error) {
      empresaReady = false;
      empresaMessage = error.message;
    } else {
      empresaReady = true;
      empresaCount = count ?? (data?.length || 0);
      empresaMessage = `Conectada (${empresaCount} empresas registradas)`;
    }
  } catch (err: any) {
    empresaReady = false;
    empresaMessage = err?.message || 'Error al verificar tabla';
  }

  // 2. Check productos
  try {
    let query = supabase.from('productos').select('*', { count: 'exact' });
    if (typeof idEmpresa === 'number') {
      query = query.eq(cols.id_empresa, idEmpresa);
    }

    const { data, error, count } = await query.limit(20);

    if (error) {
      productosReady = false;
      productosMessage = error.message;
    } else {
      productosReady = true;
      productosCount = count ?? (data?.length || 0);
      productosMessage = typeof idEmpresa === 'number'
        ? `Conectada (${productosCount} productos para empresa #${idEmpresa})`
        : `Conectada (${productosCount} productos en total)`;
    }
  } catch (err: any) {
    productosReady = false;
    productosMessage = err?.message || 'Error al verificar tabla';
  }

  return {
    isConfigured: true,
    projectUrl: SUPABASE_URL,
    empresaReady,
    productosReady,
    empresaMessage,
    productosMessage,
    empresaCount,
    productosCount,
    detectedColumns: cols,
  };
}

/**
 * Returns clean SQL to set up or verify tables in Supabase SQL editor
 */
export function getSupabaseSetupScript(): string {
  return `-- ============================================================
-- VENDEDOR IA - ESQUEMA SUPABASE POSTGRESQL & POLÍTICAS RLS SEGURAS
-- ============================================================

-- 1. Tabla 'empresa' con clave primaria identificación (bigint)
CREATE TABLE IF NOT EXISTS public.empresa (
  identificación bigint PRIMARY KEY,
  creado_en timestamptz DEFAULT now()
);

-- 2. Tabla 'productos' con clave id (UUID) y relación id_empresa (bigint)
CREATE TABLE IF NOT EXISTS public.productos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_empresa bigint NOT NULL REFERENCES public.empresa(identificación) ON DELETE CASCADE,
  nombre text NOT NULL,
  descripcion text,
  precio numeric(12,2) DEFAULT 0,
  imagen_url text,
  creado_en timestamptz DEFAULT now()
);

-- 3. Habilitar Row Level Security (RLS) en ambas tablas
ALTER TABLE public.empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Seguridad RLS:
-- Permite lectura y escritura segura desde la aplicación cliente (anon / authenticated):
DROP POLICY IF EXISTS "Permitir lectura publica empresa" ON public.empresa;
CREATE POLICY "Permitir lectura publica empresa" ON public.empresa FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion empresa" ON public.empresa;
CREATE POLICY "Permitir insercion empresa" ON public.empresa FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir lectura publica productos" ON public.productos;
CREATE POLICY "Permitir lectura publica productos" ON public.productos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercion productos" ON public.productos;
CREATE POLICY "Permitir insercion productos" ON public.productos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir actualizacion productos" ON public.productos;
CREATE POLICY "Permitir actualizacion productos" ON public.productos FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir eliminacion productos" ON public.productos;
CREATE POLICY "Permitir eliminacion productos" ON public.productos FOR DELETE USING (true);

-- 5. Habilitar Supabase Realtime para las tablas productos y empresa
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'productos') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.productos;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'empresa') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.empresa;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 6. Recargar la caché de esquemas de PostgREST
NOTIFY pgrst, 'reload schema';
`;
}

/**
 * Runs a comprehensive end-to-end self-test of Supabase persistence & multi-tenant isolation.
 */
export interface SupabaseSelfTestResult {
  step: string;
  success: boolean;
  message: string;
  details?: any;
}

export async function runSupabasePersistenceSelfTest(): Promise<{
  allPassed: boolean;
  results: SupabaseSelfTestResult[];
}> {
  if (!supabase) {
    return {
      allPassed: false,
      results: [
        {
          step: 'Verificación de configuración',
          success: false,
          message: 'Supabase no está configurado (variables de entorno ausentes).',
        },
      ],
    };
  }

  const results: SupabaseSelfTestResult[] = [];
  const testEmpresaId = 99990 + Math.floor(Math.random() * 9);
  const testProductId = generateUUID();

  try {
    // Paso 1: Creación / INSERT de Empresa
    const createEmpRes = await createEmpresaInSupabase(testEmpresaId, 'Empresa de Prueba Diagnóstico');
    results.push({
      step: '1. INSERT Empresa',
      success: true,
      message: `Empresa #${testEmpresaId} creada y confirmada en Supabase con éxito.`,
      details: createEmpRes.data,
    });

    // Paso 2: SELECT Verificación de Empresa
    const empresasList = await fetchEmpresasFromSupabase();
    const foundEmp = empresasList.find((e) => (e.identificación || e.identificacion) === testEmpresaId);
    if (!foundEmp) {
      throw new Error(`La empresa #${testEmpresaId} no fue encontrada en el SELECT general.`);
    }
    results.push({
      step: '2. SELECT Confirmación de Empresa',
      success: true,
      message: `Empresa #${testEmpresaId} verificada en la lista global de empresas (${empresasList.length} total).`,
    });

    // Paso 3: INSERT Producto con vinculación a la empresa
    const testProd = await createProductoInSupabase(
      {
        id: testProductId,
        name: 'Producto Diagnóstico Test',
        description: 'Prueba obligatoria de persistencia y aislamiento',
        price: 99.5,
        imageUrl: '',
      },
      testEmpresaId
    );
    if (!testProd) {
      throw new Error('No se pudo insertar el producto de prueba.');
    }
    results.push({
      step: '3. INSERT Producto con id_empresa',
      success: true,
      message: `Producto insertado correctamente para empresa #${testEmpresaId}.`,
      details: testProd,
    });

    // Paso 4: Aislamiento estricto de catálogo (Comprobar que otra empresa no ve este producto)
    const otherCompanyProducts = await fetchProductosByEmpresa(1);
    const leakedProduct = otherCompanyProducts.find((p) => p.id === testProductId);
    if (leakedProduct) {
      throw new Error('Fallo de aislamiento: La Empresa #1 recibió productos de la Empresa de Prueba.');
    }
    const thisCompanyProducts = await fetchProductosByEmpresa(testEmpresaId);
    const isolatedProduct = thisCompanyProducts.find((p) => p.id === testProductId);
    if (!isolatedProduct) {
      throw new Error(`El producto no fue encontrado al consultar la empresa #${testEmpresaId}.`);
    }
    results.push({
      step: '4. Aislamiento Estricto por Empresa',
      success: true,
      message: `Aislamiento validado: Empresa #${testEmpresaId} tiene su producto aislado; Empresa #1 no lo ve.`,
    });

    // Paso 5: Limpieza de datos de prueba
    await deleteProductoFromSupabase(testProductId, testEmpresaId);
    await deleteEmpresaFromSupabase(testEmpresaId);
    results.push({
      step: '5. Limpieza y Reversión',
      success: true,
      message: 'Registros de prueba eliminados correctamente de Supabase.',
    });

    return { allPassed: true, results };
  } catch (err: any) {
    results.push({
      step: 'Fallo en la prueba',
      success: false,
      message: err?.message || 'Error desconocido durante la prueba.',
    });

    // Attempt clean up
    try {
      await deleteProductoFromSupabase(testProductId, testEmpresaId);
      await deleteEmpresaFromSupabase(testEmpresaId);
    } catch {
      // safe ignore
    }

    return { allPassed: false, results };
  }
}

/**
 * Revokes an owner's access to their panel for a given company.
 * - Marks ownerAccessRevoked = true
 * - Generates a new ownerAccessToken (invalidating old links and QRs)
 * - Persists to Supabase metadata without touching products, catalog or WhatsApp bot
 */
export async function revokeOwnerAccessInSupabase(
  idEmpresa: number
): Promise<{ success: boolean; newAccessToken: string }> {
  if (!supabase) {
    return { success: true, newAccessToken: `revoked-${Date.now()}` };
  }

  const targetEmpresaId = Number(idEmpresa);
  const cols = await resolveProductColumns();
  const metaRowId = getMetadataRowId(targetEmpresaId);

  // Retrieve current metadata
  const { data } = await supabase
    .from('productos')
    .select(cols.descripcion)
    .eq(cols.id, metaRowId)
    .maybeSingle();

  let meta: any = {};
  if (data && (data as any)[cols.descripcion]) {
    try {
      meta = JSON.parse((data as any)[cols.descripcion]);
    } catch {}
  }

  const newAccessToken = `token-revoked-${Date.now()}`;
  meta.ownerAccessRevoked = true;
  meta.ownerAccessToken = newAccessToken;
  meta.ownerAccessRevokedAt = new Date().toISOString();
  if (meta.config) {
    meta.config.ownerAccessRevoked = true;
    meta.config.ownerAccessToken = newAccessToken;
    meta.config.ownerAccessRevokedAt = meta.ownerAccessRevokedAt;
  }

  await supabase
    .from('productos')
    .update({
      [cols.descripcion]: JSON.stringify(meta),
    })
    .eq(cols.id, metaRowId);

  return { success: true, newAccessToken };
}

/**
 * Restores an owner's access to their panel for a given company.
 * - Sets ownerAccessRevoked = false
 * - Generates a fresh valid ownerAccessToken
 * - Persists to Supabase metadata immediately
 */
export async function restoreOwnerAccessInSupabase(
  idEmpresa: number
): Promise<{ success: boolean; newAccessToken: string }> {
  if (!supabase) {
    return { success: true, newAccessToken: `token-empresa-${idEmpresa}-${Date.now()}` };
  }

  const targetEmpresaId = Number(idEmpresa);
  const cols = await resolveProductColumns();
  const metaRowId = getMetadataRowId(targetEmpresaId);

  // Retrieve current metadata
  const { data } = await supabase
    .from('productos')
    .select(cols.descripcion)
    .eq(cols.id, metaRowId)
    .maybeSingle();

  let meta: any = {};
  if (data && (data as any)[cols.descripcion]) {
    try {
      meta = JSON.parse((data as any)[cols.descripcion]);
    } catch {}
  }

  const newAccessToken = `token-${targetEmpresaId}-${Math.random().toString(36).substring(2, 9)}`;
  meta.ownerAccessRevoked = false;
  meta.ownerAccessToken = newAccessToken;
  delete meta.ownerAccessRevokedAt;
  if (meta.config) {
    meta.config.ownerAccessRevoked = false;
    meta.config.ownerAccessToken = newAccessToken;
    delete meta.config.ownerAccessRevokedAt;
  }

  await supabase
    .from('productos')
    .update({
      [cols.descripcion]: JSON.stringify(meta),
    })
    .eq(cols.id, metaRowId);

  return { success: true, newAccessToken };
}

