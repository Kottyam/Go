import { emptyBlob, monthKey, shiftISO, shiftMonth, todayISO } from "./logic";
import type { Customer, Item, Order, Payment, ShopBlob } from "./types";

const OWNER = "demo-owner";

function item(
  id: string,
  shopId: string,
  name: string,
  unit: string,
  price: number,
  stock: number,
): Item {
  return { id, shopId, name, unit, price, stock, active: true };
}

function customer(
  id: string,
  shopId: string,
  name: string,
  phone: string,
  route: string,
  creditLimit: number,
  note = "",
): Customer {
  return { id, shopId, name, phone, route, creditLimit, note };
}

function order(
  id: string,
  shopId: string,
  customerId: string,
  customerName: string,
  date: string,
  lines: Order["lines"],
  mode: Order["mode"],
  status: Order["status"],
  note = "",
): Order {
  return { id, shopId, customerId, customerName, date, lines, mode, status, note };
}

function pay(
  id: string,
  shopId: string,
  customerId: string,
  customerName: string,
  date: string,
  amount: number,
  method: Payment["method"],
  note = "",
): Payment {
  return { id, shopId, customerId, customerName, date, amount, method, note };
}

export function seed(): ShopBlob[] {
  const today = todayISO();
  const yday = shiftISO(today, -1);
  const d3 = shiftISO(today, -3);
  const prev = `${shiftMonth(monthKey(today), -1)}-12`;
  const prevPay = `${shiftMonth(monthKey(today), -1)}-28`;

  const bake = emptyBlob(
    {
      id: "shop-bake",
      name: "മാവേലി ബേക്കറി",
      kind: "bakery",
      phone: "9847001100",
      address: "പാലയം, കൊച്ചി",
      upi: "mavelibakery@upi",
      code: "GO2048",
    },
    OWNER,
  );
  bake.items = [
    item("bun", "shop-bake", "ബൺ", "എണ്ണം", 12, 40),
    item("bread", "shop-bake", "ബ്രഡ്", "ലോഫ്", 45, 18),
    item("puff", "shop-bake", "പഫ്", "എണ്ണം", 18, 24),
    item("cake", "shop-bake", "കേക്ക് സ്ലൈസ്", "എണ്ണം", 35, 8),
    item("tea", "shop-bake", "ടീ കേക്ക്", "എണ്ണം", 20, 4),
    item("biskit", "shop-bake", "ബിസ്കറ്റ് പാക്കറ്റ്", "പാക്ക്", 30, 16),
  ];
  bake.customers = [
    customer("rahim", "shop-bake", "റഹീം ടീ സ്റ്റാൾ", "9847011122", "പാലയം", 3000, "രാവിലെ 7 മണിക്ക്"),
    customer("mary", "shop-bake", "മേരി കോൺവെന്റ്", "9847022233", "ഫോർട്ട് കൊച്ചി", 8000),
    customer("anil", "shop-bake", "അനിൽ കാന്റീൻ", "9847033344", "ഇടപ്പള്ളി", 5000),
  ];
  bake.orders = [
    order("o1", "shop-bake", "rahim", "റഹീം ടീ സ്റ്റാൾ", prev, [{ itemId: "bun", name: "ബൺ", unit: "എണ്ണം", qty: 40, price: 12 }, { itemId: "puff", name: "പഫ്", unit: "എണ്ണം", qty: 20, price: 18 }], "credit", "delivered"),
    order("o2", "shop-bake", "rahim", "റഹീം ടീ സ്റ്റാൾ", d3, [{ itemId: "bread", name: "ബ്രഡ്", unit: "ലോഫ്", qty: 4, price: 45 }, { itemId: "biskit", name: "ബിസ്കറ്റ് പാക്കറ്റ്", unit: "പാക്ക്", qty: 6, price: 30 }], "credit", "delivered"),
    order("o3", "shop-bake", "mary", "മേരി കോൺവെന്റ്", yday, [{ itemId: "cake", name: "കേക്ക് സ്ലൈസ്", unit: "എണ്ണം", qty: 12, price: 35 }, { itemId: "bread", name: "ബ്രഡ്", unit: "ലോഫ്", qty: 6, price: 45 }], "credit", "delivered"),
    order("o4", "shop-bake", "rahim", "റഹീം ടീ സ്റ്റാൾ", today, [{ itemId: "bun", name: "ബൺ", unit: "എണ്ണം", qty: 20, price: 12 }, { itemId: "tea", name: "ടീ കേക്ക്", unit: "എണ്ണം", qty: 6, price: 20 }], "credit", "pending", "രാവിലെ ഡെലിവറി"),
    order("o5", "shop-bake", "anil", "അനിൽ കാന്റീൻ", today, [{ itemId: "puff", name: "പഫ്", unit: "എണ്ണം", qty: 30, price: 18 }], "cash", "packed"),
  ];
  bake.payments = [
    pay("p1", "shop-bake", "rahim", "റഹീം ടീ സ്റ്റാൾ", prevPay, 500, "upi", "കഴിഞ്ഞ മാസം ഭാഗികം"),
    pay("p2", "shop-bake", "mary", "മേരി കോൺവെന്റ്", yday, 200, "cash"),
  ];

  const whole = emptyBlob(
    {
      id: "shop-whole",
      name: "കൊട്ടയം റൈസ് ആൻഡ് ഓയിൽ",
      kind: "wholesale",
      phone: "9847002200",
      address: "ബാനർജി റോഡ്, എറണാകുളം",
      upi: "kottayamrice@upi",
      code: "GO3391",
    },
    OWNER,
  );
  whole.items = [
    item("matta", "shop-whole", "മട്ട അരി", "കി.ഗ്രാം", 54, 800),
    item("raw", "shop-whole", "പച്ച അരി", "കി.ഗ്രാം", 48, 420),
    item("oil", "shop-whole", "സൺഫ്ലവർ ഓയിൽ", "ലീറ്റർ", 145, 60),
    item("sugar", "shop-whole", "പഞ്ചസാര", "കി.ഗ്രാം", 42, 12),
    item("podi", "shop-whole", "അരിപ്പൊടി", "കി.ഗ്രാം", 55, 90),
  ];
  whole.customers = [
    customer("hotel", "shop-whole", "ഹോട്ടൽ ഐശ്വര്യ", "9847044455", "എംജി റോഡ്", 25000),
    customer("mini", "shop-whole", "മിനി സ്റ്റോർസ്", "9847055566", "ആലുവ", 15000),
    customer("hostel", "shop-whole", "ഗ്രീൻ ഹോസ്റ്റൽ", "9847066678", "കലൂർ", 20000, "മാസാവസാനം ബിൽ"),
  ];
  whole.orders = [
    order("w1", "shop-whole", "hostel", "ഗ്രീൻ ഹോസ്റ്റൽ", prev, [{ itemId: "sugar", name: "പഞ്ചസാര", unit: "കി.ഗ്രാം", qty: 40, price: 42 }, { itemId: "raw", name: "പച്ച അരി", unit: "കി.ഗ്രാം", qty: 50, price: 48 }], "credit", "delivered"),
    order("w2", "shop-whole", "mini", "മിനി സ്റ്റോർസ്", yday, [{ itemId: "oil", name: "സൺഫ്ലവർ ഓയിൽ", unit: "ലീറ്റർ", qty: 10, price: 145 }, { itemId: "matta", name: "മട്ട അരി", unit: "കി.ഗ്രാം", qty: 25, price: 54 }], "credit", "out"),
    order("w3", "shop-whole", "hotel", "ഹോട്ടൽ ഐശ്വര്യ", today, [{ itemId: "matta", name: "മട്ട അരി", unit: "കി.ഗ്രാം", qty: 40, price: 54 }, { itemId: "podi", name: "അരിപ്പൊടി", unit: "കി.ഗ്രാം", qty: 8, price: 55 }], "credit", "pending"),
  ];
  whole.payments = [
    pay("wp1", "shop-whole", "mini", "മിനി സ്റ്റോർസ്", today, 1000, "bank", "ആദ്യ ഗഡു"),
  ];

  return [bake, whole];
}
