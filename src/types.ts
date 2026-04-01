export interface Transaction {
  id: string;
  desc: string;
  date: string;
  time: string;
  timestamp: number;
  gave: number;
  got: number;
  balance: number;
  type: "customer" | "supplier";
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string;
  type: "customer" | "supplier";
  amount: number;
  transactions: Transaction[];
  updatedAt: number;
  deleted?: boolean;
}
