export const getCurrencySymbol = (currencyCode: string = 'BRL'): string => {
  const symbols: Record<string, string> = {
    BRL: 'R$',
    USD: '$',
    EUR: '€',
    COP: 'COP $',
    MXN: 'MXN $',
    ARS: 'ARS $',
    CLP: 'CLP $',
    PEN: 'S/',
  };
  return symbols[currencyCode] || 'R$';
};

export const formatCurrency = (amount: number, currencyCode: string = 'BRL'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) amount = 0;
  const curr = currencyCode || 'BRL';
  const sym = getCurrencySymbol(curr);
  const formattedNumber = amount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${sym} ${formattedNumber}`;
};

export const formatBRL = (amount: number): string => {
  return formatCurrency(amount, 'BRL');
};

export const formatShortBRL = (amount: number, currencyCode: string = 'BRL'): string => {
  if (isNaN(amount)) return `${getCurrencySymbol(currencyCode)} 0`;
  return `${getCurrencySymbol(currencyCode)} ${amount.toLocaleString('pt-BR')}`;
};
