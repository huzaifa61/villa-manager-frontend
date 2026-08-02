export const money = (value: any) => 'EGP ' + Math.abs(Number(value || 0)).toLocaleString();

export const isPaymentPaid = (status?: string) => status === 'COMPLETED' || status === 'PAID';

/** Backend sends negative currentBalance when the apartment owes money. */
export const apartmentBalanceDue = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  return n < 0 ? Math.abs(n) : 0;
};

export const isApartmentPaidUp = (currentBalance: number) => Number(currentBalance || 0) >= 0;

export const PAID_COLOR = '#10B981';
export const UNPAID_COLOR = '#EF4444';
