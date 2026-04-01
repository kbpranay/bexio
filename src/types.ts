export interface Summary {
  arr: number;
  pilot: number;
  onetime: number;
  cashflowReceived: number;
  cashflowPending: number;
  updatedAt: string;
}

export interface ClientRevenue {
  clientId: string;
  clientName: string;
  arr: number;
  pilot: number;
  onetime: number;
  total: number;
}

export interface Invoice {
  invoiceId: string;
  invoiceNumber: string;
  clientName: string;
  amount: number;
  currency: string;
  dueDate: string;
  daysOutstanding: number;
  status: string;
}
