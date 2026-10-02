export type ShopKind =
  | "bakery"
  | "stationery"
  | "kirana"
  | "wholesale"
  | "steel"
  | "paint"
  | "hotel"
  | "medical"
  | "textile"
  | "electronics"
  | "custom";

export type Shop = {
  id: string;
  name: string;
  kind: ShopKind;
  serviceName?: string;
  phone: string;
  address: string;
  upi: string;
  code: string;
};

export type Item = {
  id: string;
  shopId: string;
  name: string;
  unit: string;
  price: number;
  stock: number;
  active: boolean;
};

export type Customer = {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  route: string;
  creditLimit: number;
  note: string;
  linkedUid?: string;
  username?: string;
  passHash?: string;
  memberUid?: string;
};

export type OrderLine = {
  itemId: string;
  name: string;
  unit: string;
  qty: number;
  price: number;
};

export type OrderStatus = "pending" | "packed" | "out" | "delivered" | "cancelled";
export type PayMode = "credit" | "cash";
export type PayMethod = "cash" | "upi" | "bank";

export type Order = {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  date: string;
  lines: OrderLine[];
  mode: PayMode;
  status: OrderStatus;
  note: string;
};

export type Payment = {
  id: string;
  shopId: string;
  customerId: string;
  customerName: string;
  date: string;
  amount: number;
  method: PayMethod;
  note: string;
};

export type ShopBlob = {
  shop: Shop;
  ownerUid: string;
  items: Item[];
  customers: Customer[];
  orders: Order[];
  payments: Payment[];
  rev: number;
};

export type FirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export type Session =
  | {
      kind: "owner";
      backend: "demo" | "firebase";
      name: string;
      uid: string;
      email: string;
    }
  | {
      kind: "customer";
      backend: "demo" | "firebase";
      name: string;
      uid: string;
      email: string;
      shopId: string;
      customerId: string;
    };
