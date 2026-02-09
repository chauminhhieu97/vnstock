import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import FilterPanel from './components/FilterPanel';
import StockCard from './components/StockCard';
import MarketPulse from './components/MarketPulse';
import GlossaryModal from './components/GlossaryModal';
import RealTimePriceBoard from './components/RealTimePriceBoard';
import MarketDashboard from './components/MarketDashboard';
import { StockData, ScreenerCriteria, SortOption, MacroData } from './types';
import { fetchScreenedStocks, fetchMacroData, wsService } from './services/stockService';
import { AlertCircle, LayoutGrid, Table, TrendingUp } from 'lucide-react';

const DEFAULT_CRITERIA: ScreenerCriteria = {
  minRoe: 10,
  minEpsGrowth: 10,
  maxPe: 25,
  minRsi: 20,
  maxRsi: 80,
  minRsRating: 40,
  minSentiment: 0,
  maxDebtToEquity: 2.0,
  volumeBreakout: false,
  priceAboveMa50: false,
  sector: 'ALL',
  favoritesOnly: false,
  minHybridScore: 0,
};

type ViewMode = 'dashboard' | 'priceboard' | 'cards';

function App() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [macro, setMacro] = useState<MacroData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [criteria, setCriteria] = useState<ScreenerCriteria>(DEFAULT_CRITERIA);
  const [sortOption, setSortOption] = useState<SortOption>(SortOption.HYBRID_DESC);
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');

  // Glossary Modal State
  const [isGlossaryOpen, setIsGlossaryOpen] = useState(false);

  // WebSocket connection status
  const [isConnected, setIsConnected] = useState(false);

  // Favorites Persistence
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('vnstock_favorites');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const toggleFavorite = (ticker: string) => {
    const newFavs = new Set(favorites);
    if (newFavs.has(ticker)) {
      newFavs.delete(ticker);
    } else {
      newFavs.add(ticker);
    }
    setFavorites(newFavs);
    localStorage.setItem('vnstock_favorites', JSON.stringify(Array.from(newFavs)));
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Parallel Fetch: Stocks & Macro
      const [stockData, macroData] = await Promise.all([
        fetchScreenedStocks(criteria),
        fetchMacroData()
      ]);

      setMacro(macroData);

      let filtered = stockData;
      if (criteria.favoritesOnly) {
        filtered = stockData.filter(s => favorites.has(s.ticker));
      }

      // Sort Data
      const sorted = [...filtered].sort((a, b) => {
        switch (sortOption) {
          case SortOption.PRICE_DESC: return b.price - a.price;
          case SortOption.CHANGE_DESC: return b.changePercent - a.changePercent;
          case SortOption.RSI_ASC: return a.rsi - b.rsi;
          case SortOption.RSI_DESC: return b.rsi - a.rsi;
          case SortOption.VOLUME_DESC: return b.volume - a.volume;
          case SortOption.RS_DESC: return b.rsRating - a.rsRating;
          case SortOption.SENTIMENT_DESC: return b.sentimentScore - a.sentimentScore;
          case SortOption.HYBRID_DESC: return b.hybridScore - a.hybridScore;
          case SortOption.TICKER: default: return a.ticker.localeCompare(b.ticker);
        }
      });

      setStocks(sorted);
      setLastUpdated(new Date());
    } catch (error) {
      console.error("Failed to load data", error);
    } finally {
      setLoading(false);
    }
  }, [criteria, sortOption, favorites]);

  // Initial Load & WebSocket Setup
  useEffect(() => {
    loadData();

    // Setup WebSocket
    wsService.connect()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    const unsubscribeConnect = wsService.on('connected', () => setIsConnected(true));
    const unsubscribeDisconnect = wsService.on('disconnected', () => setIsConnected(false));

    // Auto-refresh every 60 seconds
    const intervalId = setInterval(loadData, 60000);

    return () => {
      clearInterval(intervalId);
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [loadData]);

  const handleSelectStock = (ticker: string) => {
    console.log('Selected stock:', ticker);
    // Could open a detail modal here
  };

  return (
    <Layout>
      {/* View Mode Toggle */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            <button
              onClick={() => setViewMode('dashboard')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${viewMode === 'dashboard'
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <TrendingUp className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => setViewMode('priceboard')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${viewMode === 'priceboard'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <Table className="w-4 h-4" />
              Bảng Giá
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                ${viewMode === 'cards'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md'
                  : 'text-gray-600 hover:bg-gray-50'}
              `}
            >
              <LayoutGrid className="w-4 h-4" />
              Screener
            </button>
          </div>

          {/* Connection Status */}
          <div className={`
            flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold
            ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}
          `}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
            {isConnected ? 'Real-Time Connected' : 'Polling Mode'}
          </div>
        </div>
      </div>

      {/* Dashboard View */}
      {viewMode === 'dashboard' && (
        <main className="max-w-7xl mx-auto p-4 lg:p-6 space-y-6">
          <MarketDashboard />
          <MarketPulse stocks={stocks} macro={macro} loading={loading} />
        </main>
      )}

      {/* Price Board View */}
      {viewMode === 'priceboard' && (
        <main className="max-w-7xl mx-auto p-4 lg:p-6">
          <RealTimePriceBoard onSelectStock={handleSelectStock} />
        </main>
      )}

      {/* Cards/Screener View */}
      {viewMode === 'cards' && (
        <>
          <FilterPanel
            criteria={criteria}
            onCriteriaChange={setCriteria}
            onRefresh={loadData}
            isRefreshing={loading}
            sortOption={sortOption}
            onSortChange={setSortOption}
            lastUpdated={lastUpdated}
            onOpenGlossary={() => setIsGlossaryOpen(true)}
          />

          <GlossaryModal isOpen={isGlossaryOpen} onClose={() => setIsGlossaryOpen(false)} />

          <main className="max-w-7xl mx-auto p-4 lg:p-6">

            <MarketPulse stocks={stocks} macro={macro} loading={loading} />

            {loading && stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-mono text-sm font-medium">Quant AI is analyzing market layers...</p>
              </div>
            ) : stocks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 border border-dashed border-gray-300 rounded-2xl bg-gray-50/50">
                <AlertCircle size={48} className="mb-4 text-gray-300" />
                <h3 className="text-lg font-bold text-gray-800">No stocks found</h3>
                <p className="text-sm font-medium">
                  {criteria.favoritesOnly
                    ? "Your watchlist is empty or no favorites matched the filters."
                    : "Try relaxing your filters (e.g., lower Hybrid Score or Debt/Equity requirements)."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {stocks.map((stock) => (
                  <StockCard
                    key={stock.ticker}
                    stock={stock}
                    isFavorite={favorites.has(stock.ticker)}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
            )}
          </main>
        </>
      )}
    </Layout>
  );
}

export default App;