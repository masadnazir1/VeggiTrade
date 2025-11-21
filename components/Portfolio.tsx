import React, { useState } from 'react';
import { Asset, Portfolio as PortfolioType, Transaction, LimitOrder } from '../types';
import { Coins, Briefcase, History, List, XCircle } from 'lucide-react';

interface PortfolioProps {
  portfolio: PortfolioType;
  assets: Asset[];
  onCancelOrder: (orderId: string) => void;
}

const Portfolio: React.FC<PortfolioProps> = ({ portfolio, assets, onCancelOrder }) => {
  const [tab, setTab] = useState<'HOLDINGS' | 'ORDERS' | 'HISTORY'>('HOLDINGS');

  // Calculate total values
  const holdingsValue = Object.entries(portfolio.holdings).reduce((acc, [id, holding]) => {
    const asset = assets.find(a => a.id === id);
    return acc + (holding.quantity * (asset?.current_price || 0));
  }, 0);

  const totalNetWorth = portfolio.cashBalance + holdingsValue;

  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full shadow-xl">
      {/* Summary Header */}
      <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-slate-800 to-slate-900">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">My Portfolio</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
             <span className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1 mb-1">
               <Coins size={12} /> Net Worth
             </span>
             <div className="text-2xl font-mono font-bold text-white">
               ${totalNetWorth.toFixed(2)}
             </div>
          </div>
          <div className="text-right">
             <span className="text-xs text-slate-500 uppercase font-semibold flex items-center gap-1 justify-end mb-1">
               <Briefcase size={12} /> Cash Balance
             </span>
             <div className="text-2xl font-mono font-bold text-emerald-400">
               ${portfolio.cashBalance.toFixed(2)}
             </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700 bg-slate-800/50">
        <button 
          onClick={() => setTab('HOLDINGS')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${tab === 'HOLDINGS' ? 'border-emerald-500 text-emerald-400 bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Holdings
        </button>
        <button 
          onClick={() => setTab('ORDERS')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 flex items-center justify-center gap-2 ${tab === 'ORDERS' ? 'border-indigo-500 text-indigo-400 bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          Orders
          {portfolio.openOrders.length > 0 && (
            <span className="bg-indigo-500 text-white text-[10px] px-1.5 rounded-full">{portfolio.openOrders.length}</span>
          )}
        </button>
        <button 
          onClick={() => setTab('HISTORY')}
          className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${tab === 'HISTORY' ? 'border-blue-500 text-blue-400 bg-slate-800' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
        >
          History
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-0">
        {/* Holdings Tab */}
        {tab === 'HOLDINGS' && (
          <div className="p-4 space-y-3">
            {Object.entries(portfolio.holdings).map(([id, holding]) => {
              if (holding.quantity === 0) return null;
              const asset = assets.find(a => a.id === id);
              if (!asset) return null;
              
              const currentValue = holding.quantity * asset.current_price;
              const costBasis = holding.quantity * holding.avgCost;
              const gainLoss = currentValue - costBasis;
              const gainLossPercent = (gainLoss / costBasis) * 100;
              const isGain = gainLoss >= 0;

              return (
                <div key={id} className="bg-slate-750 p-3 rounded-lg border border-slate-700 hover:bg-slate-700 transition-colors group">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl grayscale group-hover:grayscale-0 transition-all">{asset.icon}</span>
                      <span className="font-bold text-slate-200">{asset.name}</span>
                    </div>
                    <span className="font-mono font-bold text-slate-100">${currentValue.toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between text-xs text-slate-400 font-mono">
                    <span>{holding.quantity} units @ ${holding.avgCost.toFixed(2)}</span>
                    <span className={isGain ? 'text-emerald-400' : 'text-rose-400'}>
                      {isGain ? '+' : ''}{gainLoss.toFixed(2)} ({isGain ? '+' : ''}{gainLossPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              );
            })}
            {holdingsValue === 0 && (
               <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2 opacity-50">
                 <Briefcase size={32} />
                 <p>No positions yet.</p>
               </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {tab === 'ORDERS' && (
          <div className="p-4 space-y-2">
            {portfolio.openOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2 opacity-50">
                 <List size={32} />
                 <p>No open orders.</p>
               </div>
            ) : (
              portfolio.openOrders.map((order) => {
                 const asset = assets.find(a => a.id === order.assetId);
                 return (
                   <div key={order.id} className="bg-slate-750 p-3 rounded-lg border border-slate-700 flex justify-between items-center group hover:border-slate-600">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${order.type === 'BUY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                            {order.type}
                          </span>
                          <span className="font-bold text-slate-200">{asset?.name || order.assetId}</span>
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          {order.quantity} units @ ${order.targetPrice.toFixed(2)}
                        </div>
                      </div>
                      <button 
                        onClick={() => onCancelOrder(order.id)}
                        className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-full transition-colors"
                        title="Cancel Order"
                      >
                        <XCircle size={18} />
                      </button>
                   </div>
                 );
              })
            )}
          </div>
        )}

        {/* History Tab */}
        {tab === 'HISTORY' && (
          <div className="divide-y divide-slate-700/50">
             {portfolio.transactions && portfolio.transactions.length > 0 ? (
               [...portfolio.transactions].reverse().map((tx) => (
                 <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-800/50 transition-colors">
                    <div>
                       <div className="flex items-center gap-2">
                         <span className={`font-bold text-sm ${tx.type === 'BUY' ? 'text-emerald-400' : 'text-rose-400'}`}>
                           {tx.type}
                         </span>
                         <span className="text-slate-200 text-sm font-semibold">{tx.assetName}</span>
                       </div>
                       <span className="text-xs text-slate-500">
                         {new Date(tx.timestamp).toLocaleTimeString()} • {tx.orderType}
                       </span>
                    </div>
                    <div className="text-right">
                       <div className="text-slate-200 font-mono text-sm font-bold">
                         ${(tx.price * tx.quantity).toFixed(2)}
                       </div>
                       <div className="text-xs text-slate-500 font-mono">
                         {tx.quantity} @ ${tx.price.toFixed(2)}
                       </div>
                    </div>
                 </div>
               ))
             ) : (
               <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-sm gap-2 opacity-50">
                 <History size={32} />
                 <p>No transaction history.</p>
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Portfolio;