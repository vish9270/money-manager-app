export const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const formatCurrency = (amount: number, currency: string = '₹'): string => {
  const absAmount = Math.abs(amount);
  if (absAmount >= 10000000) {
    return `${currency}${(amount / 10000000).toFixed(2)}Cr`;
  } else if (absAmount >= 100000) {
    return `${currency}${(amount / 100000).toFixed(2)}L`;
  } else if (absAmount >= 1000) {
    return `${currency}${(amount / 1000).toFixed(1)}K`;
  }
  return `${currency}${amount.toLocaleString('en-IN')}`;
};

export const formatFullCurrency = (amount: number, currency: string = '₹'): string => {
  return `${currency}${Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const formatShortDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const getMonthYear = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

export const getMonthKey = (date: Date = new Date()): string => {
  return date.toISOString().slice(0, 7);
};

export const getStartOfMonth = (monthKey: string): Date => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month - 1, 1);
};

export const getEndOfMonth = (monthKey: string): Date => {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0, 23, 59, 59);
};

export const getPreviousMonths = (count: number): string[] => {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(getMonthKey(date));
  }
  return months;
};

export const calculateProgress = (current: number, target: number): number => {
  if (target === 0) return 0;
  return Math.min(Math.round((current / target) * 100), 100);
};

export const getDaysUntil = (dateString: string): number => {
  const target = new Date(dateString);
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getRelativeTime = (dateString: string): string => {
  const days = getDaysUntil(dateString);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.ceil(days / 7)} weeks`;
  if (days < 365) return `${Math.ceil(days / 30)} months`;
  return `${Math.ceil(days / 365)} years`;
};
