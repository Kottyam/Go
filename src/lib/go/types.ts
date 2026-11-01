export type Shop = {
  id: string;
  name: string;
  code: string;
  ownerUid: string;
  phone: string;
  upi: string;
  address: string;
  createdAt: number;
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  username: string;
  loginEmail: string;
  memberUid: string;
  note: string;
  createdAt: number;
};

export type Item = {
  id: string;
  name: string;
  unit: string;
  price: number;
  active: boolean;
};

export type OrderLine = { itemId: string; name: string; unit: string; qty: number; price: number };
export type OrderStatus = "placed" | "accepted" | "delivered" | "cancelled";

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  lines: OrderLine[];
  total: number;
  status: OrderStatus;
  by: "owner" | "customer";
  note: string;
  createdAt: number;
  updatedAt: number;
};

export type PayMethod = "cash" | "upi" | "bank";

export type Payment = {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  method: PayMethod;
  note: string;
  createdAt: number;
};

export type Notice = {
  id: string;
  to: string; // "owner" or a customerId
  from: string; // "owner" or a customerId
  text: string;
  read: boolean;
  createdAt: number;
};

export type Session =
  | { kind: "owner"; uid: string; name: string; email: string }
  | { kind: "customer"; uid: string; shopId: string; customerId: string }
  | { kind: "unlinked"; uid: string; email: string };
