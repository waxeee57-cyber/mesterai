export const formatHUF = (amount: number): string => {
  return new Intl.NumberFormat('hu-HU', {
    style: 'currency',
    currency: 'HUF',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' });
};

export const formatDateShort = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
};

export const formatTime = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
};

export const calcVat = (net: number, vatRate: number): number =>
  Math.round(net * (vatRate / 100));

export const calcGross = (net: number, vatRate: number): number =>
  net + calcVat(net, vatRate);

export const calcItemTotal = (qty: number, price: number, vatRate: number) => {
  const net = qty * price;
  return { net, vat: calcVat(net, vatRate), gross: calcGross(net, vatRate) };
};

export const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Jó reggelt';
  if (hour < 18) return 'Jó napot';
  return 'Jó estét';
};

export const generateInvoiceNumber = (count: number): string => {
  const year = new Date().getFullYear();
  return `MST-${year}-${String(count).padStart(3, '0')}`;
};
