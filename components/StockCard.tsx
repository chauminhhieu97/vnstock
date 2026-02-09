import React, { useState } from 'react';
import { StockData } from '../types';
import StockChart from './StockChart';
import { ArrowUpRight, ArrowDownRight, Activity, TrendingUp, Star, BrainCircuit, ChevronDown, ChevronUp, Zap, Radio } from 'lucide-react';

interface StockCardProps {
  stock: StockData;
  isFavorite: boolean;
  onToggleFavorite: (ticker: string) => void;
}

// Helper: Metric Forecasting Logic
const getForecast = (metric: string, value: number) => {
  if (metric === 'RSI') {
    if (value >= 70) return "Vùng Quá mua. Rủi ro điều chỉnh giảm cao trong ngắn hạn.";
    if (value <= 30) return "Vùng Quá bán. Cơ hội bắt đáy kỹ thuật, giá có thể bật tăng.";
    return "Vùng Trung tính. Xu hướng hiện tại tiếp diễn.";
  }
  if (metric === 'ROE') {
    if (value >= 20) return "Hiệu quả sử dụng vốn Tuyệt vời.";
    if (value >= 15) return "Hiệu quả Tốt.";
    return "Hiệu quả Trung bình.";
  }
  if (metric === 'PE') {
    if (value > 25) return "Định giá cao/Kỳ vọng lớn.";
    if (value < 10) return "Định giá rẻ.";
    return "Định giá hợp lý.";
  }
  if (metric === 'RS') {
    if (value > 80) return "Cổ phiếu Leader (Mạnh).";
    if (value < 40) return "Cổ phiếu Laggard (Yếu).";
    return "Vận động cùng pha thị trường.";
  }
  return "";
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('vi-VN', { style: 'decimal', maximumFractionDigits: 0 }).format(val);
};

// Internal Component: Tooltip Item
const MetricItem = ({ 
  label, 
  value, 
  unit, 
  metricType, 
  stock 
}: { 
  label: string, 
  value: number | string, 
  unit?: string, 
  metricType: string,
  stock: StockData
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const numValue = typeof value === 'number' ? value : 0;
  const forecast = getForecast(metricType, numValue);
  
  // Logic to show MATH
  let mathExplanation = null;
  if (metricType === 'ROE') {
    mathExplanation = (
      <div className="mb-2 pb-2 border-b border-gray-700">
        <div className="text-gray-400 text-[9px] uppercase font-bold mb-1">Công thức tính (AI Verified):</div>
        <div className="font-mono text-emerald-300">
          ROE = <span className="text-white">{stock.financialRaw ? formatCurrency(stock.financialRaw.profitAfterTax) : 'N/A'} tỷ</span> / <span className="text-white">{stock.financialRaw ? formatCurrency(stock.financialRaw.equity) : 'N/A'} tỷ</span>
        </div>
        <div className="font-mono text-emerald-300 text-right mt-0.5">
           = {stock.roe}%
        </div>
        <div className="text-[9px] text-gray-500 mt-1 italic">
          (Lợi nhuận ST / Vốn chủ sở hữu)
        </div>
      </div>
    );
  } else if (metricType === 'PE') {
    mathExplanation = (
      <div className="mb-2 pb-2 border-b border-gray-700">
        <div className="text-gray-400 text-[9px] uppercase font-bold mb-1">Công thức tính (AI Verified):</div>
        <div className="font-mono text-emerald-300">
          P/E = <span className="text-white">{formatCurrency(stock.price)} đ</span> / <span className="text-white">{stock.financialRaw ? formatCurrency(stock.financialRaw.eps) : 'N/A'} đ</span>
        </div>
        <div className="font-mono text-emerald-300 text-right mt-0.5">
           = {stock.pe} lần
        </div>
        <div className="text-[9px] text-gray-500 mt-1 italic">
          (Giá thị trường / EPS 4 quý)
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative flex justify-between items-center group cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-1 text-gray-500 group-hover:text-black transition-colors underline decoration-dotted decoration-gray-300 underline-offset-2">
        {label}
      </div>
      <span className={`font-mono font-medium ${
        metricType === 'RSI' && numValue > 70 ? 'text-rose-600' : 
        metricType === 'RSI' && numValue < 30 ? 'text-emerald-600' : 
        metricType === 'RS' && numValue > 80 ? 'text-blue-600' : 'text-gray-900'
      }`}>
        {value}{unit}
      </span>

      {/* Tooltip Popup (Keep Dark for Contrast) */}
      {isHovered && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-gray-900 text-gray-200 text-[10px] p-3 rounded-lg shadow-xl shadow-black/20 z-50 animate-in fade-in zoom-in-95 duration-200 pointer-events-none border border-gray-800">
          
          {mathExplanation}

          <div className="font-bold mb-1 text-gray-100">Dự báo (Forecast):</div>
          <div className="leading-relaxed text-gray-400">{forecast}</div>
          <div className="absolute bottom-[-5px] left-4 w-2.5 h-2.5 bg-gray-900 border-r border-b border-gray-800 rotate-45"></div>
        </div>
      )}
    </div>
  );
};

const StockCard: React.FC<StockCardProps> = ({ stock, isFavorite, onToggleFavorite }) => {
  const [showAI, setShowAI] = useState(false);
  
  const isUp = stock.change >= 0;
  const colorClass = isUp ? 'text-emerald-600' : 'text-rose-600';
  const chartColor = isUp ? '#10b981' : '#f43f5e';
  
  const sentimentColor = stock.sentimentScore >= 70 ? 'text-emerald-600' : stock.sentimentScore <= 30 ? 'text-rose-600' : 'text-yellow-600';
  
  const signalBadgeColor = stock.aiInsight.signal === 'BUY' 
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
    : stock.aiInsight.signal === 'SELL' 
    ? 'bg-rose-50 text-rose-700 border-rose-200' 
    : 'bg-yellow-50 text-yellow-700 border-yellow-200';

  // Hybrid Score Color
  const hybridColor = stock.hybridScore >= 80 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' 
    : stock.hybridScore >= 60 ? 'text-blue-600 border-blue-200 bg-blue-50'
    : 'text-gray-500 border-gray-200 bg-gray-100';

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 hover:border-black hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full group relative overflow-visible">
      
      {/* VSA Signal Tag (Top Left) */}
      {stock.vsaSignal !== 'None' && (
        <div className="absolute top-0 left-0 bg-purple-600 text-[9px] text-white px-2 py-1 rounded-br-lg z-20 font-bold tracking-wide uppercase flex items-center gap-1">
          <Radio size={10} className="animate-pulse" /> {stock.vsaSignal}
        </div>
      )}

      {/* Squeeze Indicator */}
      {stock.volatilitySqueeze && (
        <div className="absolute top-8 left-0 bg-orange-600 text-[9px] text-white px-2 py-0.5 rounded-br-lg z-20 font-bold tracking-wide uppercase flex items-center gap-1" title="Volatility Squeeze detected">
          <Zap size={10} className="fill-white" /> Squeeze
        </div>
      )}

      {/* Favorite Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); onToggleFavorite(stock.ticker); }}
        className="absolute top-3 right-3 z-20 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
      >
        <Star 
          size={18} 
          className={`${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-gray-400'} transition-colors`} 
        />
      </button>

      {/* Header */}
      <div className="flex justify-between items-start mb-2 relative z-10 mt-6">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">{stock.ticker}</h3>
            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-medium border border-gray-200">{stock.sector}</span>
          </div>
          <p className="text-xs text-gray-500 font-medium truncate max-w-[140px] mt-0.5" title={stock.companyName}>
            {stock.companyName}
          </p>
        </div>
        
        {/* Hybrid Score Circle */}
        <div 
           className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 ${hybridColor} cursor-pointer hover:scale-105 transition-transform`}
           onClick={() => setShowAI(true)}
           title="Click to see score breakdown"
        >
          <span className="text-sm font-bold">{stock.hybridScore}</span>
          <span className="text-[8px] uppercase font-semibold opacity-70">Score</span>
        </div>
      </div>

      <div className={`flex items-end justify-between mb-3 ${colorClass}`}>
         <div className="text-xl font-bold font-mono">
            {stock.price.toLocaleString('vi-VN')}
         </div>
         <div className="text-xs font-bold flex items-center gap-1 mb-1">
            {isUp ? <ArrowUpRight size={14} strokeWidth={2.5} /> : <ArrowDownRight size={14} strokeWidth={2.5} />}
            {stock.changePercent.toFixed(2)}%
         </div>
      </div>

      {/* Chart */}
      <div className="mb-4 relative z-10 -mx-1 opacity-90">
        <StockChart data={stock.history} color={chartColor} />
      </div>

      {/* AI Sentiment Bar */}
      <div className="mb-4 relative z-10">
        <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1.5">
          <span className="flex items-center gap-1.5"><BrainCircuit size={12} className="text-purple-600"/> Sentiment</span>
          <span className={`${sentimentColor} font-bold`}>{stock.sentimentScore}/100</span>
        </div>
        <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden border border-gray-200">
          <div 
            className={`h-full rounded-full transition-all duration-500 ${stock.sentimentScore > 50 ? 'bg-emerald-500' : 'bg-rose-500'}`}
            style={{ width: `${stock.sentimentScore}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid with Tooltips */}
      <div className="grid grid-cols-2 gap-3 text-xs relative z-10 mb-4">
        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-1.5 uppercase text-[10px]">
            <TrendingUp size={12} /> Fundamentals
          </div>
          <div className="space-y-1">
            <MetricItem label="ROE" value={stock.roe} unit="%" metricType="ROE" stock={stock} />
            <MetricItem label="P/E" value={stock.pe} unit="x" metricType="PE" stock={stock} />
          </div>
        </div>

        <div className="bg-gray-50 p-2.5 rounded-xl border border-gray-100">
          <div className="flex items-center gap-1.5 text-gray-500 font-semibold mb-1.5 uppercase text-[10px]">
            <Activity size={12} /> Technicals
          </div>
          <div className="space-y-1">
             <MetricItem label="RS Rate" value={stock.rsRating} metricType="RS" stock={stock} />
             <MetricItem label="RSI" value={stock.rsi} metricType="RSI" stock={stock} />
          </div>
        </div>
      </div>

      {/* AI Explainer Toggle */}
      <div 
        className="relative z-10 border-t border-gray-100 pt-3 cursor-pointer group/ai mt-auto"
        onClick={() => setShowAI(!showAI)}
      >
        <div className="flex justify-between items-center">
          <div className={`text-[10px] font-bold px-2.5 py-1 border rounded-md ${signalBadgeColor} uppercase tracking-wide`}>
            {stock.aiInsight.signal}
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-gray-400 group-hover/ai:text-purple-600 transition-colors">
            Analysis {showAI ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        </div>
        
        {/* Expanded Content: Score Breakdown & Insight */}
        {showAI && (
          <div className="mt-3 text-xs text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-200 animate-in slide-in-from-top-2 fade-in duration-200 shadow-xl relative z-50">
            
            {/* Score Breakdown Bars */}
            <div className="mb-3 pb-3 border-b border-gray-200">
              <div className="text-[10px] font-bold text-gray-500 uppercase mb-2">Cách tính điểm ({stock.hybridScore})</div>
              
              <div className="space-y-2">
                <div>
                   <div className="flex justify-between text-[10px] mb-0.5">
                     <span title="Flow (30) + Timing (10)">Technical (Max 40)</span>
                     <span className="font-bold text-blue-600">{stock.scoreBreakdown?.technical || 0}</span>
                   </div>
                   <div className="w-full h-1 bg-gray-200 rounded-full"><div style={{width: `${(stock.scoreBreakdown?.technical/40)*100}%`}} className="h-full bg-blue-500 rounded-full"></div></div>
                </div>
                <div>
                   <div className="flex justify-between text-[10px] mb-0.5">
                     <span title="Health (30) + Growth (30)">Fundamental (Max 60)</span>
                     <span className="font-bold text-emerald-600">{stock.scoreBreakdown?.fundamental || 0}</span>
                   </div>
                   <div className="w-full h-1 bg-gray-200 rounded-full"><div style={{width: `${(stock.scoreBreakdown?.fundamental/60)*100}%`}} className="h-full bg-emerald-500 rounded-full"></div></div>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mb-1.5">
              <BrainCircuit size={14} className="text-purple-600 shrink-0 mt-0.5" />
              <span className="font-bold text-gray-900">Gemini Insight</span>
            </div>
            {stock.aiInsight.summary}
          </div>
        )}
      </div>

    </div>
  );
};

export default StockCard;