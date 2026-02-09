export interface StockData {
  ticker: string;
  exchange: 'HOSE' | 'HNX' | 'UPCOM';
  companyName: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume20: number;
  
  // Fundamental Analysis
  roe: number;
  epsGrowth: number; 
  pe: number;
  debtToEquity: number; 
  
  // RAW Data for Tooltip Explanation (Transparency)
  financialRaw: {
    marketCap: number; // Tỷ đồng
    equity: number;    // Vốn chủ sở hữu (Tỷ đồng)
    profitAfterTax: number; // Lợi nhuận sau thuế 4 quý (Tỷ đồng)
    eps: number;       // Earnings Per Share (VND)
    debt: number;      // Tổng nợ (Tỷ đồng)
  };

  // Technical Analysis
  rsi: number;
  ma50: number;
  macd: number;
  signal: number;
  rsRating: number; 
  // Advanced Features (New)
  hybridScore: number; // 0-100 Composite Score
  scoreBreakdown: { // Explains "How we got this number"
    technical: number; // Max 40
    fundamental: number; // Max 30
    sentiment: number; // Max 30
  };
  vsaSignal: 'None' | 'Upthrust' | 'Stopping Volume' | 'No Demand' | 'Shakeout' | 'High Demand'; // VSA Logic
  volatilitySqueeze: boolean; // Bollinger Band Squeeze
  // AI Metrics
  sentimentScore: number; 
  aiInsight: {
    summary: string; 
    signal: 'BUY' | 'WAIT' | 'SELL';
  };
  // Chart Data
  history: { time: string; value: number }[];
}

export interface MacroData {
  gold: {
    price: number;
    change: number;
    rsi: number;
    trend: 'UP' | 'DOWN' | 'SIDEWAYS';
    aiPrediction: string;
  };
  dxy: {
    price: number;
    change: number;
  };
  us10y: {
    price: number;
    change: number;
  };
}

export interface ScreenerCriteria {
  minRoe: number;
  minEpsGrowth: number;
  maxPe: number;
  minRsi: number;
  maxRsi: number;
  minRsRating: number; 
  minSentiment: number; 
  maxDebtToEquity: number; 
  volumeBreakout: boolean; 
  priceAboveMa50: boolean;
  sector: string;
  favoritesOnly: boolean;
  minHybridScore: number; // New Filter
}

export enum SortOption {
  TICKER = 'TICKER',
  PRICE_DESC = 'PRICE_DESC',
  CHANGE_DESC = 'CHANGE_DESC',
  RSI_ASC = 'RSI_ASC',
  RSI_DESC = 'RSI_DESC',
  VOLUME_DESC = 'VOLUME_DESC',
  RS_DESC = 'RS_DESC', 
  SENTIMENT_DESC = 'SENTIMENT_DESC',
  HYBRID_DESC = 'HYBRID_DESC', // New Sort
}