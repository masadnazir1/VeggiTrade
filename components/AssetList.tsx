import React from 'react';
import { Asset } from '../types';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface AssetListProps {
  assets: Asset[];
  selectedAssetId: string;
  onSelect: (id: string) => void;
}

const AssetList: React.FC<AssetListProps> = ({ assets, selectedAssetId, onSelect }) => {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-slate-700 bg-slate-800/50">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Market</h2>
      </div>
      <div className="overflow-y-auto flex-1 p-2 space-y-2">
        {assets.map((asset) => {
          const isPositive = asset.change24h >= 0;
          const isSelected = asset.id === selectedAssetId;

          return (
            <button
              key={asset.id}
              onClick={() => onSelect(asset.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 group ${
                isSelected 
                  ? 'bg-emerald-500/10 border border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' 
                  : 'bg-slate-750 hover:bg-slate-700 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-200">
                  {asset.icon}
                </span>
                <div className="flex flex-col items-start">
                  <span className={`font-bold text-sm ${isSelected ? 'text-emerald-400' : 'text-slate-200'}`}>
                    {asset.name}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">{asset.id}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <span className="font-mono text-sm font-medium text-slate-100">
                  ${asset.current_price.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 text-xs font-mono ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {Math.abs(asset.change24h).toFixed(2)}%
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AssetList;