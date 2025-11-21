import React, { useMemo } from 'react';
import { 
  ComposedChart, 
  Area, 
  Line,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { Asset } from '../types';

interface ChartProps {
  asset: Asset;
}

// Helper to calculate Simple Moving Average
const calculateSMA = (data: any[], window: number) => {
  return data.map((entry, index) => {
    if (index < window - 1) return { ...entry, sma: null };
    const slice = data.slice(index - window + 1, index + 1);
    const sum = slice.reduce((acc, curr) => acc + curr.price, 0);
    return { ...entry, sma: sum / window };
  });
};

const Chart: React.FC<ChartProps> = ({ asset }) => {
  const isPositive = asset.change24h >= 0;
  const color = isPositive ? '#10b981' : '#f43f5e'; 

  // Prepare data with SMA
  const dataWithSMA = useMemo(() => {
    return calculateSMA(asset.history, 5); // 5-point moving average
  }, [asset.history]);

  const prices = asset.history.map(h => h.price);
  const minPrice = Math.min(...prices) * 0.99;
  const maxPrice = Math.max(...prices) * 1.01;

  return (
    <div className="w-full h-full min-h-[350px] relative flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none z-10">
        <div className="flex items-center gap-3">
          <span className="text-4xl filter drop-shadow-lg">{asset.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-white drop-shadow-md">{asset.name}</h1>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-mono font-light text-white drop-shadow-md">
                ${asset.current_price.toFixed(2)}
              </span>
              <span className={`px-2 py-1 rounded text-xs font-bold font-mono backdrop-blur-md ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {isPositive ? '+' : ''}{asset.change24h.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-4 flex gap-4 text-xs font-mono text-slate-400 z-10">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
          <span>SMA (5)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-slate-600"></div>
          <span>Vol</span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={dataWithSMA}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
          
          <XAxis 
            dataKey="time" 
            hide={true} 
            type="number" 
            domain={['auto', 'auto']}
          />
          
          {/* Price Y Axis */}
          <YAxis 
            yAxisId="price"
            domain={[minPrice, maxPrice]} 
            orientation="right" 
            tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
            tickFormatter={(value) => `$${value.toFixed(2)}`}
            axisLine={false}
            tickLine={false}
            width={60}
          />

          {/* Volume Y Axis (Hidden, scaled down) */}
          <YAxis 
            yAxisId="volume"
            orientation="left" 
            hide={true}
            domain={[0, 'dataMax * 4']} // Scale volume so it stays at bottom
          />

          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #334155', 
              borderRadius: '8px',
              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)'
            }}
            itemStyle={{ fontFamily: 'monospace', fontSize: '12px' }}
            labelStyle={{ display: 'none' }}
            formatter={(value: number, name: string) => {
              if (name === 'price') return [`$${value.toFixed(2)}`, 'Price'];
              if (name === 'sma') return [`$${value.toFixed(2)}`, 'SMA (5)'];
              if (name === 'volume') return [Math.round(value).toLocaleString(), 'Vol'];
              return [value, name];
            }}
          />

          {/* Volume Bars */}
          <Bar 
            yAxisId="volume"
            dataKey="volume" 
            fill="#475569" 
            opacity={0.3} 
            barSize={8}
          />

          {/* Main Price Area */}
          <Area 
            yAxisId="price"
            type="monotone" 
            dataKey="price" 
            stroke={color} 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            isAnimationActive={false}
          />

          {/* SMA Line */}
          <Line 
            yAxisId="price"
            type="monotone" 
            dataKey="sma" 
            stroke="#818cf8" 
            strokeWidth={2} 
            dot={false}
            strokeDasharray="5 5"
            isAnimationActive={false}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Chart;