export const money = (value: any) => 'EGP ' + Math.abs(Number(value || 0)).toLocaleString();

export const isPaymentPaid = (status?: string) => status === 'COMPLETED' || status === 'PAID';

export const PAID_COLOR = '#10B981';
export const UNPAID_COLOR = '#EF4444';
