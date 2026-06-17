export const formatVND = (amount: number): string => {
  const value = amount / 1000;
  return value.toLocaleString('vi-VN');
};

export const parseVND = (str: string): number => {
  // Remove all non-digit characters
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

/**
 * Normalizes input bet amount.
 * If the amount is less than 15000 (e.g. they typed 50 meaning 50k, or 20 meaning 20k),
 * we multiply by 1000 to convert to full VND.
 * If the amount is >= 15000 (e.g. they typed 50000 or 20000), we keep it as is.
 */
export const normalizeBetAmount = (amount: number): number => {
  return amount < 15000 ? amount * 1000 : amount;
};


export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

/**
 * Convert a percentage rate (e.g. 97, 90, 100) to decimal display (0.97, 0.9, 1).
 * Strips trailing zeros for cleaner display.
 */
export const formatRate = (rate: number): string => {
  const decimal = rate / 100;
  // Use parseFloat to strip trailing zeros (e.g. 0.90 → 0.9, 1.00 → 1)
  return parseFloat(decimal.toFixed(2)).toString();
};

export const formatHandicap = (h: number): string => {
  const absH = Math.abs(h);
  if (absH === 0) return '0';
  const integerPart = Math.floor(absH);
  const decimalPart = absH - integerPart;
  let fraction = '';
  if (decimalPart === 0.25) fraction = '1/4';
  else if (decimalPart === 0.5) fraction = '1/2';
  else if (decimalPart === 0.75) fraction = '3/4';

  if (integerPart === 0) return fraction || decimalPart.toString();
  return fraction ? `${integerPart} ${fraction}` : `${integerPart}`;
};
