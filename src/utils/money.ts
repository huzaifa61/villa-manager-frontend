export const money = (value: any) => 'EGP ' + Math.abs(Number(value || 0)).toLocaleString();

export const isPaymentPaid = (status?: string) => status === 'COMPLETED' || status === 'PAID';

/** Balance from payment − expense: negative = owed, positive = credit. */
export const balanceFromPaymentExpense = (opening: number, paid: number, expenses: number) =>
  Number(opening || 0) + Number(paid || 0) - Number(expenses || 0);

/**
 * Amount owed / outstanding for display and unpaid totals.
 * Supports both API conventions:
 * - expense − payment (positive = owed) — current production API
 * - payment − expense (negative = owed) — updated backend
 */
export const apartmentBalanceDue = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  if (n === 0) return 0;
  return Math.abs(n);
};

export const isApartmentPaidUp = (currentBalance: number) =>
  apartmentBalanceDue(currentBalance) === 0;

/** Credit only under payment−expense (positive balance after payments exceed expenses). */
export const apartmentCreditBalance = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  return n > 0 ? n : 0;
};

/** Parse a payment−expense balance for statement UI (computed locally). */
export const parsePaymentExpenseBalance = (balance: number) => {
  const n = Number(balance || 0);
  if (n < 0) return { due: Math.abs(n), credit: 0, isPaidUp: false };
  if (n > 0) return { due: 0, credit: n, isPaidUp: true };
  return { due: 0, credit: 0, isPaidUp: true };
};

export const PAID_COLOR = '#10B981';
export const UNPAID_COLOR = '#EF4444';
