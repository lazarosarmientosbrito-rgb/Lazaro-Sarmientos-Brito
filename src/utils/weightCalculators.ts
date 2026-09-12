import { formatBRL } from './formatters';

export interface WeightPreset {
  label: string;
  grams: number;
  kg: number;
}

export const COMMON_WEIGHT_PRESETS: WeightPreset[] = [
  { label: '250 g', grams: 250, kg: 0.25 },
  { label: '500 g', grams: 500, kg: 0.50 },
  { label: '750 g', grams: 750, kg: 0.75 },
  { label: '1 kg', grams: 1000, kg: 1.00 },
  { label: '1,5 kg', grams: 1500, kg: 1.50 },
  { label: '2 kg', grams: 2000, kg: 2.00 },
];

/**
 * Convierte gramos a kilogramos automáticamente con precisión decimal.
 * 250 g = 0,25 kg
 * 500 g = 0,50 kg
 * 750 g = 0,75 kg
 * 1000 g = 1,00 kg
 */
export function convertGramsToKg(grams: number): number {
  if (!grams || isNaN(grams) || grams < 0) return 0;
  return Number((grams / 1000).toFixed(3));
}

/**
 * Convierte kilogramos a gramos.
 * 0,5 kg = 500 g
 */
export function convertKgToGrams(kg: number): number {
  if (!kg || isNaN(kg) || kg < 0) return 0;
  return Math.round(kg * 1000);
}

/**
 * Calcula el precio exacto basado en el precio por kg y el peso en kilogramos.
 * Ejemplo: R$ 49,90/kg:
 * 500 g (0,5 kg) = R$ 24,95
 * 750 g (0,75 kg) = R$ 37,43
 * 1 kg = R$ 49,90
 * 1,5 kg = R$ 74,85
 * 2 kg = R$ 99,80
 */
export function calculateWeightPrice(pricePerKg: number, weightKg: number): number {
  if (!pricePerKg || !weightKg || isNaN(pricePerKg) || isNaN(weightKg)) return 0;
  return Number((pricePerKg * weightKg).toFixed(2));
}

/**
 * Formatea el peso en formato legible para el cliente.
 * Ejemplos: "500 g (0,50 kg)", "750 g (0,75 kg)", "1 kg", "1,5 kg"
 */
export function formatWeightDisplay(weightKg: number, weightGrams?: number): string {
  const kg = weightKg !== undefined ? weightKg : (weightGrams ? weightGrams / 1000 : 0);
  const grams = weightGrams !== undefined ? weightGrams : Math.round(kg * 1000);

  if (kg < 1) {
    return `${grams} g (${kg.toFixed(2).replace('.', ',')} kg)`;
  }
  if (kg === Math.floor(kg)) {
    return `${kg} kg`;
  }
  return `${kg.toFixed(2).replace('.', ',')} kg`;
}

/**
 * Genera el texto reglamentario para peso aproximado según especificación:
 * "El valor estimado para 1,2 kg sería R$ 59,88. El valor final puede variar según el peso exacto."
 */
export function getApproximateWeightDisclaimer(
  weightKg: number, 
  pricePerKg: number, 
  currency: string = 'BRL'
): string {
  const estimatedPrice = calculateWeightPrice(pricePerKg, weightKg);
  const formattedWeight = formatWeightDisplay(weightKg);
  return `El valor estimado para ${formattedWeight} sería ${formatBRL(estimatedPrice)}. El valor final puede variar según el peso exacto.`;
}
