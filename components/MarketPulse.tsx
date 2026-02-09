import React from 'react';
import { StockData, MacroData } from '../types';
import { TrendingUp, TrendingDown, Gauge, Globe2, Coins, DollarSign, Activity, BrainCircuit } from 'lucide-react';

interface MarketPulseProps {
  stocks: StockData[];
  macro: MacroData | null;
  loading: boolean;
}

const MarketPulse: React.FC<MarketPulseProps> = ({ stocks, macro, loading }) => {
  if (loading && !macro) return null;

  const gainers = stocks.filter(s => s.change >= 0).length;
  const losers = stocks.filter(s => s.change < 0).length;
  
  // Format helpers
  const fmtNum = (n: number) => n?.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const getTrendColor = (val: number) => val > 0 ? 'text-emerald-600' : val < 0 ? 'text-rose-600' : 'text-gray-500';
  const getTrendIcon = (val: number) => val >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />;

  return (
    <div className="space-y-6 mb-8">
      
      {/* MACRO ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* GOLD (XAU/USD) CARD */}
        <div className="bg-white border border-yellow-200 p-5 rounded-2xl shadow-sm hover:border-yellow-400 transition-colors relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins size={64} className="text-yellow-600" />
          </div>
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="text-xs text-yellow-700 uppercase font-bold tracking-wide flex items-center gap-1">
                <Globe2 size={12}/> Gold (XAU/USD)
              </p>
              <div className="flex items-baseline gap-2 mt-1">
                 <span className="text-2xl font-mono font-bold text-gray-900">${fmtNum(macro?.gold?.price || 0)}</span>
                 <span className={`flex items-center gap-0.5 text-sm font-bold ${getTrendColor(macro?.gold?.change || 0)}`}>
                    {getTrendIcon(macro?.gold?.change || 0)} {macro?.gold?.change}%
                 </span>
              </div>
            </div>
          </div>
          
          {/* AI Gold Insight */}
          <div className="mt-3 pt-3 border-t border-yellow-100">
            <div className="flex items-center gap-1.5 mb-1">
              <BrainCircuit size={12} className="text-purple-600" />
              <span className="text-[10px] font-bold text-purple-700 uppercase">AI Prediction</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed line-clamp-2" title={macro?.gold?.aiPrediction}>
              {macro?.gold?.aiPrediction || "Analyzing..."}
            </p>
          </div>
        </div>

        {/* DXY & US10Y SPLIT CARD */}
        <div className="grid grid-rows-2 gap-4">
           {/* DXY */}
           <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">DXY (USD Index)</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold">{fmtNum(macro?.dxy?.price || 0)}</span>
                  <span className={`text-xs font-bold ${getTrendColor(macro?.dxy?.change || 0)}`}>
                    {macro?.dxy?.change > 0 ? '+' : ''}{macro?.dxy?.change}%
                  </span>
                </div>
              </div>
              <DollarSign size={24} className="text-gray-300" />
           </div>

           {/* US 10Y */}
           <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex justify-between items-center">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold">US 10Y Yield</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono font-bold">{fmtNum(macro?.us10y?.price || 0)}%</span>
                  <span className={`text-xs font-bold ${getTrendColor(macro?.us10y?.change || 0)}`}>
                    {macro?.us10y?.change > 0 ? '+' : ''}{macro?.us10y?.change}%
                  </span>
                </div>
              </div>
              <Activity size={24} className="text-gray-300" />
           </div>
        </div>

        {/* MARKET BREADTH (VNSTOCK) */}
        <div className="bg-white border border-gray-200 p-5 rounded-2xl shadow-sm flex flex-col justify-center">
           <div className="flex justify-between items-center mb-4">
              <p className="text-xs text-gray-500 uppercase font-bold tracking-wide">VN Market Breadth</p>
              <div className="flex items-center gap-2 text-xs font-mono">
                 <span className="text-emerald-600 font-bold">{gainers} Up</span>
                 <span className="text-gray-300">|</span>
                 <span className="text-rose-600 font-bold">{losers} Down</span>
              </div>
           </div>
           
           {/* Visual Bar */}
           <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500" 
                style={{ width: `${(gainers / (gainers + losers || 1)) * 100}%` }} 
              />
              <div 
                className="h-full bg-rose-500 transition-all duration-500" 
                style={{ width: `${(losers / (gainers + losers || 1)) * 100}%` }} 
              />
           </div>
           <p className="text-[10px] text-gray-400 text-center mt-2">Active Stocks Count</p>
        </div>

      </div>
    </div>
  );
};

export default MarketPulse;