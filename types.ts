export interface Asset {
  id: string;
  name: string;
  icon: string;
  initial_price: number;
  current_price: number;
  history: { time: number; price: number; volume: number }[];
  change24h: number; // Percentage
}

export interface Holding {
  quantity: number;
  avgCost: number;
}

export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  assetId: string;
  assetName: string;
  quantity: number;
  price: number;
  timestamp: number;
  orderType: 'MARKET' | 'LIMIT';
}

export interface LimitOrder {
  id: string;
  assetId: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  targetPrice: number;
  timestamp: number;
}

export interface Portfolio {
  cashBalance: number;
  holdings: Record<string, Holding>;
  transactions: Transaction[];
  openOrders: LimitOrder[];
}

export interface OrderBookItem {
  price: number;
  size: number;
  total: number;
}

// Global variable declarations provided by the environment
declare global {
  interface Window {
    __app_id?: string;
    __firebase_config?: any;
    __initial_auth_token?: string;
  }
}