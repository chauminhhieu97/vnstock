import React from 'react';
import { ScreenerCriteria, SortOption } from '../types';
import { Sliders, RefreshCw, Download, Star, Layers, BrainCircuit, Wallet, Zap, CircleHelp, BarChart3 } from 'lucide-react';

interface FilterPanelProps {
  criteria: ScreenerCriteria;
  onCriteriaChange: (newCriteria: ScreenerCriteria) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  lastUpdated: Date;
  onOpenGlossary: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
  criteria, 
  onCriteriaChange, 
  onRefresh, 
  isRefreshing,
  sortOption,
  onSortChange,
  lastUpdated,
  onOpenGlossary
}) => {
  const handleChange = (key: keyof ScreenerCriteria, value: any) => {
    onCriteriaChange({ ...criteria, [key]: value });
  };

  const SECTORS = ['ALL', 'Financial Services', 'Banking', 'Construction', 'Steel', 'Utilities', 'Retail', 'Technology', 'Oil & Gas'];

  const formattedDate = lastUpdated.toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  });

  return (
    <div className="bg-white/90 border-b border-gray-200 p-4 sticky top-0 z-30 shadow-sm backdrop-blur-md">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 tracking-tight">
                <span className="text-emerald-600">VNStock</span> Quant <span className="px-1.5 py-0.5 rounded bg-black text-white text-[10px] font-bold border border-gray-900">AI POWERED</span>
              </h1>
              <button 
                onClick={onOpenGlossary}
                className="text-gray-400 hover:text-black transition-colors" 
                title="Methodology & Definitions"
              >
                <CircleHelp size={20} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
              </span>
              <p className="text-xs text-gray-500 font-medium font-mono">
                Market Data • {formattedDate}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3 w-full lg:w-auto">
             <button 
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-black hover:bg-gray-800 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-70 shadow-lg shadow-gray-400/20"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
              {isRefreshing ? 'Scanning...' : 'Scan Market'}
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold transition-all">
              <Download size={16} /> Export
            </button>
          </div>
        </div>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-gray-50 p-5 rounded-2xl border border-gray-200">
          
          {/* Advanced Scoring */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-purple-700 uppercase tracking-wider flex items-center gap-1.5">
              <BrainCircuit size={14} /> AI & Quant Score
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Min Hybrid Score</span>
                  <span className="text-purple-700 font-bold font-mono">{criteria.minHybridScore || 0}/100</span>
                </div>
                <input 
                  type="range" min="0" max="90" step="10"
                  value={criteria.minHybridScore || 0}
                  onChange={(e) => handleChange('minHybridScore', Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-black"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Min Sentiment</span>
                  <span className="text-blue-600 font-bold font-mono">{criteria.minSentiment}/100</span>
                </div>
                <input 
                  type="range" min="0" max="90" step="10"
                  value={criteria.minSentiment}
                  onChange={(e) => handleChange('minSentiment', Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Fundamental (FA) */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
              <Wallet size={14} /> Fundamental (FA)
            </h3>
             <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Min EPS Growth</span>
                  <span className="text-emerald-700 font-bold font-mono">>{criteria.minEpsGrowth}%</span>
                </div>
                <input 
                  type="range" min="0" max="25" step="5"
                  value={criteria.minEpsGrowth}
                  onChange={(e) => handleChange('minEpsGrowth', Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Max Debt/Equity</span>
                  <span className="text-emerald-700 font-bold font-mono">{criteria.maxDebtToEquity}x</span>
                </div>
                <input 
                  type="range" min="0.5" max="3" step="0.5"
                  value={criteria.maxDebtToEquity}
                  onChange={(e) => handleChange('maxDebtToEquity', Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
            </div>
          </div>

          {/* Market & Context */}
          <div className="space-y-4">
             <h3 className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} /> Market Context
            </h3>
            <div className="space-y-3">
              <select 
                value={criteria.sector}
                onChange={(e) => handleChange('sector', e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm"
              >
                {SECTORS.map(s => <option key={s} value={s}>{s === 'ALL' ? 'All Sectors' : s}</option>)}
              </select>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input 
                    type="checkbox"
                    checked={criteria.favoritesOnly}
                    onChange={(e) => handleChange('favoritesOnly', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-xs text-gray-500 font-medium group-hover:text-black flex items-center gap-1">
                    <Star size={12} className={criteria.favoritesOnly ? "fill-yellow-400 text-yellow-400" : "text-gray-400"} /> Watchlist
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <input 
                    type="checkbox"
                    checked={criteria.volumeBreakout}
                    onChange={(e) => handleChange('volumeBreakout', e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                  />
                  <span className="text-xs text-gray-500 font-medium group-hover:text-black flex items-center gap-1">
                    <Zap size={12} className={criteria.volumeBreakout ? "fill-orange-500 text-orange-500" : "text-gray-400"} /> Vol Breakout
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Sliders size={14} /> Sorting
            </h3>
            <select 
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as SortOption)}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900 focus:outline-none focus:border-black focus:ring-1 focus:ring-black shadow-sm"
            >
              <option value={SortOption.HYBRID_DESC}>✨ Hybrid Score (Best)</option>
              <option value={SortOption.RS_DESC}>Relative Strength (High)</option>
              <option value={SortOption.SENTIMENT_DESC}>AI Sentiment (High)</option>
              <option value={SortOption.CHANGE_DESC}>% Change (High to Low)</option>
              <option value={SortOption.VOLUME_DESC}>Volume (High to Low)</option>
              <option value={SortOption.TICKER}>Ticker (A-Z)</option>
            </select>
          </div>

        </div>
      </div>
    </div>
  );
};

export default FilterPanel;