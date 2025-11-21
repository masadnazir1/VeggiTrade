import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Asset, Portfolio as PortfolioType, Transaction, LimitOrder } from './types';
import { INITIAL_ASSETS, SIMULATION_INTERVAL_MS, HISTORY_POINTS, DEFAULT_PORTFOLIO_DATA } from './constants';
import { authenticateUser, subscribeToPortfolio, updatePortfolio } from './services/firebaseService';
import AssetList from './components/AssetList';
import Chart from './components/Chart';
import TradePanel from './components/TradePanel';
import Portfolio from './components/Portfolio';
import { LayoutGrid, Bell } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

// Simple unique ID generator if uuid package not avail, but we assume standard env or use Date
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

const App: React.FC = () => {
  // -- State --
  const [assets, setAssets] = useState<Asset[]>(() => 
    INITIAL_ASSETS.map(a => ({
      ...a,
      current_price: a.initial_price,
      history: Array(HISTORY_POINTS).fill(0).map((_, i) => ({
        time: Date.now() - (HISTORY_POINTS - i) * 1000,
        price: a.initial_price,
        volume: Math.floor(Math.random() * 1000)
      })),
      change24h: 0
    }))
  );
  
  const [selectedAssetId, setSelectedAssetId] = useState<string>(INITIAL_ASSETS[0].id);
  const [portfolio, setPortfolio] = useState<PortfolioType>(DEFAULT_PORTFOLIO_DATA);
  const [user, setUser] = useState<any>(null);
  const [isTrading, setIsTrading] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, message: string, type: 'success' | 'info'}[]>([]);

  // Refs for simulation access to current state without dependency loops
  const portfolioRef = useRef(portfolio);
  useEffect(() => { portfolioRef.current = portfolio; }, [portfolio]);

  const addNotification = (message: string, type: 'success' | 'info' = 'info') => {
    const id = generateId();
    setNotifications(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 4000);
  };

  // -- Simulation Effect --
  useEffect(() => {
    const interval = setInterval(() => {
      setAssets(prevAssets => {
        const newAssets = prevAssets.map(asset => {
          // Random Walk Logic
          const volatility = 0.02;
          const change = (Math.random() * (volatility * 2)) - volatility;
          const newPrice = Math.max(0.01, asset.current_price * (1 + change));
          const newVolume = Math.floor(Math.random() * 2000) + 100; // Simulated volume
          
          const newHistoryPoint = {
            time: Date.now(),
            price: newPrice,
            volume: newVolume
          };

          const newHistory = [...asset.history.slice(1), newHistoryPoint];
          
          const startPrice = newHistory[0].price;
          const priceChange = ((newPrice - startPrice) / startPrice) * 100;

          return {
            ...asset,
            current_price: newPrice,
            history: newHistory,
            change24h: priceChange
          };
        });

        // -- Limit Order Matching Logic --
        // We check if any open orders can be filled with the NEW prices
        const currentPortfolio = portfolioRef.current;
        if (user && currentPortfolio.openOrders.length > 0) {
          let portfolioChanged = false;
          const newPortfolio = JSON.parse(JSON.stringify(currentPortfolio)) as PortfolioType;
          const remainingOrders: LimitOrder[] = [];

          newPortfolio.openOrders.forEach(order => {
            const asset = newAssets.find(a => a.id === order.assetId);
            if (!asset) {
              remainingOrders.push(order);
              return;
            }

            let executed = false;
            // BUY Limit: Execute if Current Price <= Target Price
            if (order.type === 'BUY' && asset.current_price <= order.targetPrice) {
              // Execute Buy
              const cost = order.quantity * order.targetPrice;
              // Cash was already deducted when order was placed? 
              // Standard practice: Reserve cash. In this simple app, we reserve cash at placement.
              // So we just move the holding.
              const currentHolding = newPortfolio.holdings[asset.id] || { quantity: 0, avgCost: 0 };
              const oldTotalVal = currentHolding.quantity * currentHolding.avgCost;
              const newTotalVal = oldTotalVal + cost;
              const newQty = currentHolding.quantity + order.quantity;
              
              newPortfolio.holdings[asset.id] = {
                 quantity: newQty,
                 avgCost: newTotalVal / newQty
              };
              
              executed = true;
            } 
            // SELL Limit: Execute if Current Price >= Target Price
            else if (order.type === 'SELL' && asset.current_price >= order.targetPrice) {
              // Execute Sell
              const revenue = order.quantity * order.targetPrice;
              newPortfolio.cashBalance += revenue;
              // Holdings were already deducted when order was placed.
              executed = true;
            }

            if (executed) {
              portfolioChanged = true;
              // Record Transaction
              newPortfolio.transactions.push({
                id: generateId(),
                type: order.type,
                assetId: asset.id,
                assetName: asset.name,
                quantity: order.quantity,
                price: order.targetPrice,
                timestamp: Date.now(),
                orderType: 'LIMIT'
              });
              addNotification(`Limit ${order.type} filled: ${order.quantity} ${asset.name} @ $${order.targetPrice.toFixed(2)}`, 'success');
            } else {
              remainingOrders.push(order);
            }
          });

          if (portfolioChanged) {
            newPortfolio.openOrders = remainingOrders;
            // We need to update state and firestore without triggering infinite loops or race conditions
            // We use the ref to ensure we aren't overwriting a user action that happened milliseconds ago
            setPortfolio(newPortfolio); 
            updatePortfolio(user.uid, newPortfolio);
          }
        }

        return newAssets;
      });
    }, SIMULATION_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user]); // Dependency on user ensures we have ID for updates

  // -- Firebase Init --
  useEffect(() => {
    const init = async () => {
      const currentUser = await authenticateUser();
      setUser(currentUser);
      
      if (currentUser) {
        const unsubscribe = subscribeToPortfolio(currentUser.uid, (data) => {
          // Merge incoming data with defaults to prevent crashes on missing fields
          setPortfolio({
            ...DEFAULT_PORTFOLIO_DATA,
            ...data,
            transactions: data.transactions || [],
            openOrders: data.openOrders || []
          });
        });
        return () => unsubscribe();
      }
    };
    init();
  }, []);

  // -- Handlers --
  const handleTrade = useCallback(async (type: 'BUY' | 'SELL', quantity: number, orderType: 'MARKET' | 'LIMIT', limitPrice?: number) => {
    if (!user) {
      alert("Authentication required.");
      return;
    }

    setIsTrading(true);
    const asset = assets.find(a => a.id === selectedAssetId);
    if (!asset) return;

    const price = orderType === 'LIMIT' ? (limitPrice || 0) : asset.current_price;
    const cost = price * quantity;

    const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PortfolioType;
    const currentHolding = newPortfolio.holdings[selectedAssetId] || { quantity: 0, avgCost: 0 };

    // Validation and State Update Logic
    if (type === 'BUY') {
      if (newPortfolio.cashBalance < cost) {
        setIsTrading(false);
        addNotification("Insufficient funds", 'info');
        return;
      }
      
      // Deduct cash immediately for both Market and Limit (Escrow)
      newPortfolio.cashBalance -= cost;

      if (orderType === 'MARKET') {
        const oldTotalValue = currentHolding.quantity * currentHolding.avgCost;
        const newTotalValue = oldTotalValue + cost;
        const newQuantity = currentHolding.quantity + quantity;
        
        newPortfolio.holdings[selectedAssetId] = {
          quantity: newQuantity,
          avgCost: newTotalValue / newQuantity
        };
      } else {
        // Limit Order: Add to Open Orders
        newPortfolio.openOrders.push({
          id: generateId(),
          assetId: selectedAssetId,
          type: 'BUY',
          quantity,
          targetPrice: price,
          timestamp: Date.now()
        });
      }

    } else { // SELL
      if (currentHolding.quantity < quantity) {
        setIsTrading(false);
        addNotification("Insufficient holdings", 'info');
        return;
      }

      // Deduct holdings immediately for both (Escrow)
      newPortfolio.holdings[selectedAssetId] = {
        ...currentHolding,
        quantity: currentHolding.quantity - quantity
      };

      if (orderType === 'MARKET') {
        newPortfolio.cashBalance += cost;
      } else {
         // Limit Order: Add to Open Orders
         newPortfolio.openOrders.push({
          id: generateId(),
          assetId: selectedAssetId,
          type: 'SELL',
          quantity,
          targetPrice: price,
          timestamp: Date.now()
        });
      }
    }

    // Add Transaction record only for Market orders (Limit orders add transaction on execution)
    if (orderType === 'MARKET') {
      newPortfolio.transactions.push({
        id: generateId(),
        type,
        assetId: selectedAssetId,
        assetName: asset.name,
        quantity,
        price,
        timestamp: Date.now(),
        orderType: 'MARKET'
      });
    }

    try {
      setPortfolio(newPortfolio);
      await updatePortfolio(user.uid, newPortfolio);
      addNotification(`${orderType === 'MARKET' ? 'Trade executed' : 'Order placed'} successfully`, 'success');
    } catch (error) {
      console.error("Trade failed", error);
      addNotification("Trade failed", 'info');
    } finally {
      setIsTrading(false);
    }
  }, [assets, selectedAssetId, portfolio, user]);

  const handleCancelOrder = useCallback(async (orderId: string) => {
    if (!user) return;
    
    const newPortfolio = JSON.parse(JSON.stringify(portfolio)) as PortfolioType;
    const orderIndex = newPortfolio.openOrders.findIndex(o => o.id === orderId);
    if (orderIndex === -1) return;

    const order = newPortfolio.openOrders[orderIndex];
    
    // Refund Cash or Holdings
    if (order.type === 'BUY') {
      newPortfolio.cashBalance += (order.quantity * order.targetPrice);
    } else {
      const holding = newPortfolio.holdings[order.assetId] || { quantity: 0, avgCost: 0 };
      newPortfolio.holdings[order.assetId] = {
        ...holding,
        quantity: holding.quantity + order.quantity
      };
    }

    newPortfolio.openOrders.splice(orderIndex, 1);
    
    setPortfolio(newPortfolio);
    await updatePortfolio(user.uid, newPortfolio);
    addNotification("Order cancelled", 'info');
  }, [portfolio, user]);

  const selectedAsset = useMemo(() => 
    assets.find(a => a.id === selectedAssetId) || assets[0]
  , [assets, selectedAssetId]);

  // -- Render --
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 font-sans flex flex-col selection:bg-emerald-500/30">
      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map(n => (
          <div key={n.id} className={`px-4 py-3 rounded shadow-lg border flex items-center gap-3 animate-fade-in-up ${n.type === 'success' ? 'bg-emerald-900/90 border-emerald-700 text-emerald-100' : 'bg-slate-800/90 border-slate-600 text-slate-200'}`}>
            <Bell size={16} />
            <span className="text-sm font-medium">{n.message}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm flex items-center px-6 justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 p-2 rounded-lg shadow-lg shadow-emerald-500/20">
            <LayoutGrid size={20} className="text-slate-950" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-emerald-400">Veggie</span>Trade <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-1 border border-slate-700">PRO</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <div className="hidden sm:block text-right">
             <div className="text-xs text-slate-500">Connected as</div>
             <div className="font-mono text-slate-200">{user ? user.uid.substring(0,8) : 'Guest'}</div>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-bold text-emerald-500 shadow-inner">
            {user ? 'U' : 'G'}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 lg:p-6 overflow-hidden">
        <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Asset List */}
          <div className="lg:col-span-3 h-[300px] lg:h-auto flex flex-col">
            <AssetList 
              assets={assets} 
              selectedAssetId={selectedAssetId} 
              onSelect={setSelectedAssetId} 
            />
          </div>

          {/* Middle Column: Chart & Trade */}
          <div className="lg:col-span-6 flex flex-col gap-6 h-full overflow-y-auto lg:overflow-visible">
            {/* Chart Area */}
            <div className="flex-1 min-h-[400px] bg-slate-800 rounded-xl border border-slate-700 p-1 shadow-2xl overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-800/50 to-transparent pointer-events-none" />
              <Chart asset={selectedAsset} />
            </div>
            
            {/* Trading Interface */}
            <div className="flex-none">
               <TradePanel 
                 asset={selectedAsset} 
                 portfolio={portfolio} 
                 onTrade={handleTrade} 
                 isTrading={isTrading}
               />
            </div>
          </div>

          {/* Right Column: Portfolio */}
          <div className="lg:col-span-3 h-auto lg:h-full flex flex-col">
            <Portfolio 
              portfolio={portfolio} 
              assets={assets} 
              onCancelOrder={handleCancelOrder}
            />
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;