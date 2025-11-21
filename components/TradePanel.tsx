import React, { useState, useEffect, useMemo } from 'react';
import { Asset, Portfolio } from '../types';
import { ArrowUpCircle, ArrowDownCircle, Wallet, AlertCircle, Target, Zap } from 'lucide-react';

interface TradePanelProps {
  asset: Asset;
  portfolio: Portfolio;
  onTrade: (type: 'BUY' | 'SELL', quantity: number, orderType: 'MARKET' | 'LIMIT', price?: number) => Promise<void>;
  isTrading: boolean;
}

// Simulated Order Book Component
const OrderBook: React.FC<{ asset: Asset }> = ({ asset }) => {
  const price = asset.current_price;
  
  // Generate fake order book based on current price
  const asks = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    price: price * (1 + (0.005 * (5 - i))), // Ascending
    size: Math.floor(Math.random() * 100) + 10
  })).reverse(), [price]);

  const bids = useMemo(() => Array.from({ length: 5 }, (_, i) => ({
    price: price * (1 - (0.005 * (i + 1))), // Descending
    size: Math.floor(Math.random() * 100) + 10
  })), [price]);

  return (
    <div className="flex flex-col gap-1 text-xs font-mono">
      <div className="grid grid-cols-3 text-slate-500 pb-1 border-b border-slate-700/50">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>
      <div className="flex flex-col-reverse gap-0.5">
        {asks.map((ask, i) => (
          <div key={`ask-${i}`} className="grid grid-cols-3 text-rose-400 hover:bg-rose-500/10 cursor-pointer rounded px-1">
            <span>{ask.price.toFixed(2)}</span>
            <span className="text-right text-slate-300">{ask.size}</span>
            <span className="text-right text-slate-500">{(ask.price * ask.size).toFixed(0)}</span>
          </div>
        ))}
      </div>
      <div className="py-1 text-center font-bold text-lg text-slate-100 bg-slate-800/50 my-1 rounded border border-slate-700">
        ${price.toFixed(2)}
      </div>
      <div className="flex flex-col gap-0.5">
        {bids.map((bid, i) => (
          <div key={`bid-${i}`} className="grid grid-cols-3 text-emerald-400 hover:bg-emerald-500/10 cursor-pointer rounded px-1">
            <span>{bid.price.toFixed(2)}</span>
            <span className="text-right text-slate-300">{bid.size}</span>
            <span className="text-right text-slate-500">{(bid.price * bid.size).toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const TradePanel: React.FC<TradePanelProps> = ({ asset, portfolio, onTrade, isTrading }) => {
  const [mode, setMode] = useState<'BUY' | 'SELL'>('BUY');
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [quantity, setQuantity] = useState<string>('');
  const [limitPrice, setLimitPrice] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuantity('');
    setLimitPrice(asset.current_price.toFixed(2));
    setError(null);
    setMode('BUY');
  }, [asset.id]);

  // Update default limit price when switching to limit tab
  useEffect(() => {
    if (orderType === 'LIMIT' && !limitPrice) {
      setLimitPrice(asset.current_price.toFixed(2));
    }
  }, [orderType, asset.current_price]);

  const holding = portfolio.holdings[asset.id] || { quantity: 0, avgCost: 0 };
  const numericQty = parseInt(quantity) || 0;
  const numericLimitPrice = parseFloat(limitPrice) || 0;
  
  const executionPrice = orderType === 'MARKET' ? asset.current_price : numericLimitPrice;
  const totalCost = numericQty * executionPrice;
  
  const canBuy = portfolio.cashBalance >= totalCost;
  const canSell = holding.quantity >= numericQty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (numericQty <= 0) {
      setError("Enter a valid quantity");
      return;
    }

    if (orderType === 'LIMIT' && numericLimitPrice <= 0) {
      setError("Enter a valid price");
      return;
    }

    if (mode === 'BUY' && !canBuy) {
      setError("Insufficient funds");
      return;
    }

    if (mode === 'SELL' && !canSell) {
      setError("Insufficient holdings");
      return;
    }

    setError(null);
    await onTrade(mode, numericQty, orderType, orderType === 'LIMIT' ? numericLimitPrice : undefined);
    setQuantity('');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Order Book Column */}
      <div className="hidden md:block bg-slate-800 rounded-xl border border-slate-700 p-4">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Order Book</h3>
        <OrderBook asset={asset} />
      </div>

      {/* Trade Form Column */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 flex flex-col gap-4 shadow-lg relative overflow-hidden">
        {/* Background decoration */}
        <div className={`absolute top-0 right-0 w-32 h-32 rounded-full filter blur-[60px] opacity-20 pointer-events-none ${mode === 'BUY' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-4 relative z-10">
          <div className="flex gap-2 bg-slate-900 p-1 rounded-lg">
             <button 
               onClick={() => setOrderType('MARKET')}
               className={`px-3 py-1 text-xs font-bold rounded transition-all ${orderType === 'MARKET' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
               Market
             </button>
             <button 
               onClick={() => setOrderType('LIMIT')}
               className={`px-3 py-1 text-xs font-bold rounded transition-all ${orderType === 'LIMIT' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}
             >
               Limit
             </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400 bg-slate-900/50 px-3 py-1 rounded-full">
            <Wallet size={14} />
            <span className="font-mono">${portfolio.cashBalance.toFixed(2)}</span>
          </div>
        </div>

        {/* Buy/Sell Toggles */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900/50 rounded-lg relative z-10">
          <button
            onClick={() => setMode('BUY')}
            className={`py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'BUY' 
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ArrowUpCircle size={16} /> Buy
          </button>
          <button
            onClick={() => setMode('SELL')}
            className={`py-2 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              mode === 'SELL' 
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ArrowDownCircle size={16} /> Sell
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
          
          {/* Limit Price Input */}
          {orderType === 'LIMIT' && (
            <div className="space-y-1">
              <label className="text-xs text-slate-500 uppercase font-semibold">Limit Price</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={limitPrice}
                  onChange={(e) => {
                    setLimitPrice(e.target.value);
                    setError(null);
                  }}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-lg transition-all"
                  placeholder="0.00"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">
                  USD
                </div>
              </div>
            </div>
          )}

          {/* Quantity Input */}
          <div className="space-y-1">
            <label className="text-xs text-slate-500 uppercase font-semibold">Quantity</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="1"
                value={quantity}
                onChange={(e) => {
                  setQuantity(e.target.value);
                  setError(null);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-600 font-mono text-lg transition-all"
                placeholder="0"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">
                {asset.id}
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-slate-900/30 rounded-lg p-4 space-y-2 border border-slate-700/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Order Type</span>
              <span className="text-slate-200 font-mono flex items-center gap-1">
                {orderType === 'LIMIT' ? <Target size={12}/> : <Zap size={12}/>} {orderType}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total {mode === 'BUY' ? 'Cost' : 'Value'}</span>
              <span className={`font-mono font-bold ${mode === 'BUY' ? 'text-rose-400' : 'text-emerald-400'}`}>
                ${totalCost.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 pt-2 border-t border-slate-700/50">
               <span>Owned: {holding.quantity}</span>
               {mode === 'BUY' ? (
                  <span className={canBuy ? 'text-emerald-500' : 'text-rose-500'}>
                    Max Buy: {executionPrice > 0 ? Math.floor(portfolio.cashBalance / executionPrice) : 0}
                  </span>
               ) : (
                  <span className={canSell ? 'text-emerald-500' : 'text-rose-500'}>Max Sell: {holding.quantity}</span>
               )}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 animate-pulse">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isTrading || numericQty <= 0 || (mode === 'BUY' && !canBuy) || (mode === 'SELL' && !canSell)}
            className={`w-full py-4 rounded-lg font-bold text-lg shadow-xl transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'BUY'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20'
                : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20'
            }`}
          >
            {isTrading ? 'Processing...' : `Confirm ${mode}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default TradePanel;