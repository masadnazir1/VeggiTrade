import { Asset } from './types';

export const INITIAL_ASSETS: Omit<Asset, 'current_price' | 'history' | 'change24h'>[] = [
  { id: 'TOM', name: 'Tomato', icon: '🍅', initial_price: 10.50 },
  { id: 'CAR', name: 'Carrot', icon: '🥕', initial_price: 45.20 },
  { id: 'BRO', name: 'Broccoli', icon: '🥦', initial_price: 7.80 },
  { id: 'POT', name: 'Potato', icon: '🥔', initial_price: 22.00 },
  { id: 'PEP', name: 'Pepper', icon: '🌶️', initial_price: 31.90 },
];

export const SIMULATION_INTERVAL_MS = 1500;
export const HISTORY_POINTS = 50; // Increased for better SMA calculation
export const INITIAL_CASH = 10000.00;

export const DEFAULT_PORTFOLIO_DATA = {
  cashBalance: INITIAL_CASH,
  holdings: {
    'TOM': { quantity: 0, avgCost: 0 },
    'CAR': { quantity: 0, avgCost: 0 },
    'BRO': { quantity: 0, avgCost: 0 },
    'POT': { quantity: 0, avgCost: 0 },
    'PEP': { quantity: 0, avgCost: 0 },
  },
  transactions: [],
  openOrders: []
};