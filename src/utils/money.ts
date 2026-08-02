export const money = (value: any) => 'EGP ' + Math.abs(Number(value || 0)).toLocaleString();

export const isPaymentPaid = (status?: string) => status === 'COMPLETED' || status === 'PAID';

/** Balance from payment − expense: negative = owed, positive = credit. */
export const balanceFromPaymentExpense = (opening: number, paid: number, expenses: number) =>
  Number(opening || 0) + Number(paid || 0) - Number(expenses || 0);

/** Backend / payment−expense balance: negative = amount owed. */
export const apartmentBalanceDue = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  return n < 0 ? Math.abs(n) : 0;
};

export const apartmentCreditBalance = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  return n > 0 ? n : 0;
};

export const isApartmentPaidUp = (currentBalance: number) => Number(currentBalance || 0) >= 0;

export const PAID_COLOR = '#10B981';
export const UNPAID_COLOR = '#EF4444';
