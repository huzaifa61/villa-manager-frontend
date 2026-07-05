export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'GENERAL_MANAGER' | 'VILLA_MANAGER' | 'VIEWER';
}

export interface Apartment {
  id: number;
  apartmentNumber: string;
  currentBalance: number;
}

export interface Payment {
  id: number;
  amount: number;
  status: string;
}

export interface Expense {
  id: number;
  amount: number;
  description: string;
}
