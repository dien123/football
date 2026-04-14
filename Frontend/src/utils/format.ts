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
