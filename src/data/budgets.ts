// ============================================
// 1. MAPEO PAÍS (ISO 3166-1 alpha-2) → MONEDA
// ============================================
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  'ES': 'EUR', 'MX': 'MXN', 'US': 'USD', 'GB': 'GBP',
  'DE': 'EUR', 'FR': 'EUR', 'IT': 'EUR', 'PT': 'EUR',
  'AR': 'ARS', 'BR': 'BRL', 'CL': 'CLP', 'CO': 'COP',
  'PE': 'PEN', 'UY': 'UYU', 'VE': 'VES', 'EC': 'USD',
  'PA': 'USD', 'CR': 'CRC', 'JP': 'JPY', 'CN': 'CNY',
  'KR': 'KRW', 'IN': 'INR', 'CA': 'CAD', 'AU': 'AUD',
  'ZA': 'ZAR', 'NG': 'NGN',
};

// ============================================
// 2. INTERFACES Y CONFIGURACIÓN
// ============================================
export interface BudgetRange {
  min: number;
  max: number | null;
  label: string;
  value: 'low' | 'medium' | 'high'; // Valores estandarizados para la IA
  description: string;
}

export interface CurrencyConfig {
  code: string;
  symbol: string;
  locale: string;
  name: string;
  ranges: BudgetRange[];
}

export const CURRENCY_CONFIG: Record<string, CurrencyConfig> = {
  EUR: {
    code: 'EUR', symbol: '€', locale: 'es-ES', name: 'Euro',
    ranges: [
      { min: 0, max: 15, label: 'Económico', value: 'low', description: 'Menos de 15€' },
      { min: 15, max: 40, label: 'Medio', value: 'medium', description: 'Entre 15€ y 40€' },
      { min: 40, max: null, label: 'Premium', value: 'high', description: 'Más de 40€' }
    ]
  },
  MXN: {
    code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Peso Mexicano',
    ranges: [
      { min: 0, max: 200, label: 'Económico', value: 'low', description: 'Menos de $200 MXN' },
      { min: 200, max: 600, label: 'Medio', value: 'medium', description: 'Entre $200 y $600 MXN' },
      { min: 600, max: null, label: 'Premium', value: 'high', description: 'Más de $600 MXN' }
    ]
  },
  USD: {
    code: 'USD', symbol: '$', locale: 'en-US', name: 'Dólar Estadounidense',
    ranges: [
      { min: 0, max: 25, label: 'Budget', value: 'low', description: 'Under $25' },
      { min: 25, max: 70, label: 'Standard', value: 'medium', description: '$25 to $70' },
      { min: 70, max: null, label: 'Fine Dining', value: 'high', description: 'Over $70' }
    ]
  },
  COP: {
    code: 'COP', symbol: '$', locale: 'es-CO', name: 'Peso Colombiano',
    ranges: [
      { min: 0, max: 30000, label: 'Económico', value: 'low', description: 'Menos de 30k COP' },
      { min: 30000, max: 80000, label: 'Medio', value: 'medium', description: 'Entre 30k y 80k COP' },
      { min: 80000, max: null, label: 'Premium', value: 'high', description: 'Más de 80k COP' }
    ]
  },
  // Fallback para países no configurados aún
  DEFAULT: {
    code: 'USD', symbol: '$', locale: 'en-US', name: 'Dólar',
    ranges: [
      { min: 0, max: 20, label: 'Económico', value: 'low', description: 'Bajo costo local' },
      { min: 20, max: 60, label: 'Medio', value: 'medium', description: 'Costo promedio local' },
      { min: 60, max: null, label: 'Premium', value: 'high', description: 'Costo alto local' }
    ]
  }
};

// ============================================
// 3. SERVICIO DE MONEDA
// ============================================
export class CurrencyService {
  
  /**
   * Obtiene la configuración de moneda basada en el código de país (MX, ES, etc)
   */
  static fromCountryCode(countryCode: string | undefined): CurrencyConfig {
    if (!countryCode) return CURRENCY_CONFIG.DEFAULT;
    const currencyCode = COUNTRY_TO_CURRENCY[countryCode.toUpperCase()];
    return CURRENCY_CONFIG[currencyCode] || CURRENCY_CONFIG.DEFAULT;
  }

  /**
   * Genera las opciones para el componente de UI
   */
  static getBudgetOptions(countryCode: string) {
    const config = this.fromCountryCode(countryCode);
    return config.ranges.map(range => ({
      label: `${range.label} (${this.formatRange(range, config.symbol)})`,
      value: range.value, // Enviamos 'low', 'medium' o 'high' a la API
      description: range.description
    }));
  }

  private static formatRange(range: BudgetRange, symbol: string): string {
    if (range.max === null) return `> ${symbol}${range.min}`;
    return `${symbol}${range.min} - ${symbol}${range.max}`;
  }

  /**
   * Formatea un número como moneda según el país
   */
  static formatCurrency(amount: number, countryCode: string): string {
    const config = this.fromCountryCode(countryCode);
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: 0
    }).format(amount);
  }
}