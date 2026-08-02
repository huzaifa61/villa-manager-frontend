export const money = (value: any) => 'EGP ' + Math.abs(Number(value || 0)).toLocaleString();

export const isPaymentPaid = (status?: string) => status === 'COMPLETED' || status === 'PAID';

/** Balance from payment − expense: negative = owed, positive = credit. */
export const balanceFromPaymentExpense = (opening: number, paid: number, expenses: number) =>
  Number(opening || 0) + Number(paid || 0) - Number(expenses || 0);

/** API currentBalance: positive = credit, negative = owed, zero = settled. */
export const parseApiCurrentBalance = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  if (n === 0) return { amount: 0, isCredit: false, isOwed: false };
  if (n > 0) return { amount: n, isCredit: true, isOwed: false };
  return { amount: Math.abs(n), isCredit: false, isOwed: true };
};

/** Sum of amounts owed (negative balances only). */
export const apartmentBalanceDue = (currentBalance: number) => {
  const n = Number(currentBalance || 0);
  return n < 0 ? Math.abs(n) : 0;
};

export const isApartmentPaidUp = (currentBalance: number) =>
  Number(currentBalance || 0) >= 0;

/** Parse a payment−expense balance for statement UI (computed locally). */
export const parsePaymentExpenseBalance = (balance: number) => {
  const n = Number(balance || 0);
  if (n < 0) return { due: Math.abs(n), credit: 0, isPaidUp: false };
  if (n > 0) return { due: 0, credit: n, isPaidUp: true };
  return { due: 0, credit: 0, isPaidUp: true };
};

export const PAID_COLOR = '#10B981';
export const UNPAID_COLOR = '#EF4444';
