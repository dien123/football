export const formatVND = (amount: number): string => {
  return amount.toLocaleString('vi-VN') + 'đ';
};

export const parseVND = (str: string): number => {
  // Remove all non-digit characters
  const cleaned = str.replace(/[^\d]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
};

export const formatHandicap = (h: number): string => {
  if (h === 0) return '0';
  const integerPart = Math.floor(h);
  const decimalPart = h - integerPart;
  let fraction = '';
  if (decimalPart === 0.25) fraction = '1/4';
  else if (decimalPart === 0.5) fraction = '1/2';
  else if (decimalPart === 0.75) fraction = '3/4';

  if (integerPart === 0) return fraction || decimalPart.toString();
  return fraction ? `${integerPart} ${fraction}` : `${integerPart}`;
};
