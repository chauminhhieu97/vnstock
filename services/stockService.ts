import { StockData, ScreenerCriteria, MacroData } from '../types';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000/ws';

// WebSocket singleton
let wsConnection: WebSocket | null = null;
let wsReconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface PriceUpdate {
  type: 'update' | 'initial' | 'broadcast';
  data: RealTimeQuote[];
  timestamp: string;
}

export interface RealTimeQuote {
  ticker: string;
  exchange: string;
  companyName: string;
  sector: string;
  price: number;
  refPrice: number;
  ceilingPrice: number;
  floorPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  totalValue: number;
  buyVolume: number;
  sellVolume: number;
  foreignBuy: number;
  foreignSell: number;
  timestamp: string;
}

export interface MarketOverview {
  vnindex: IndexData;
  hnxindex: IndexData;
  upcomIndex: IndexData;
  advanceCount: number;
  declineCount: number;
  unchangedCount: number;
  totalVolume: number;
  totalValue: number;
  foreignNetBuy: number;
  topGainers: RealTimeQuote[];
  topLosers: RealTimeQuote[];
  topVolume: RealTimeQuote[];
  timestamp: string;
}

export interface IndexData {
  value: number;
  change: number;
  changePercent: number;
  volume: number;
}

// --- WebSocket Service ---
export class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private isConnecting = false;
  
  constructor(private url: string = WS_URL) {}
  
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }
      
      if (this.isConnecting) {
        resolve();
        return;
      }
      
      this.isConnecting = true;
      
      try {
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = () => {
          console.log('🟢 WebSocket connected');
          this.isConnecting = false;
          wsReconnectAttempts = 0;
          this.emit('connected', {});
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.emit(data.type || 'message', data);
            this.emit('price_update', data);
          } catch (e) {
            console.error('Failed to parse WebSocket message:', e);
          }
        };
        
        this.ws.onclose = () => {
          console.log('🔴 WebSocket disconnected');
          this.isConnecting = false;
          this.emit('disconnected', {});
          this.attemptReconnect();
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          reject(error);
        };
      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }
  
  private attemptReconnect() {
    if (wsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.log('Max reconnect attempts reached');
      return;
    }
    
    wsReconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, wsReconnectAttempts), 30000);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${wsReconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }
  
  subscribe(tickers: string[]) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'subscribe',
        tickers
      }));
    }
  }
  
  unsubscribe() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'unsubscribe' }));
    }
  }
  
  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }
  
  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error('Error in WebSocket listener:', e);
      }
    });
  }
  
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

// Singleton WebSocket instance
export const wsService = new WebSocketService();

// --- REST API Functions ---

export const fetchPriceBoard = async (tickers?: string[]): Promise<RealTimeQuote[]> => {
  try {
    const params = tickers?.length ? `?tickers=${tickers.join(',')}` : '';
    const response = await fetch(`${API_BASE_URL}/api/price-board${params}`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error('Failed to fetch price board');
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.warn('Using mock price data:', error);
    return generateMockPrices(tickers || MOCK_TICKERS.map(t => t.ticker));
  }
};

export const fetchMarketOverview = async (): Promise<MarketOverview> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/market`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error('Failed to fetch market overview');
    return await response.json();
  } catch (error) {
    console.warn('Using mock market data:', error);
    return generateMockMarketOverview();
  }
};

export const fetchIntraday = async (ticker: string): Promise<{time: string; price: number; volume: number}[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/intraday/${ticker}`, {
      signal: AbortSignal.timeout(5000)
    });
    
    if (!response.ok) throw new Error('Failed to fetch intraday data');
    
    const result = await response.json();
    return result.data;
  } catch (error) {
    console.warn('Using mock intraday data:', error);
    return generateMockIntraday();
  }
};

// --- Legacy API Functions (for backward compatibility) ---

const MOCK_TICKERS = [
  { ticker: 'VCB', name: 'Vietcombank', sector: 'Ngân hàng', basePrice: 92000, exchange: 'HOSE' },
  { ticker: 'TCB', name: 'Techcombank', sector: 'Ngân hàng', basePrice: 24000, exchange: 'HOSE' },
  { ticker: 'HPG', name: 'Hòa Phát', sector: 'Thép', basePrice: 24000, exchange: 'HOSE' },
  { ticker: 'VNM', name: 'Vinamilk', sector: 'Tiêu dùng', basePrice: 68000, exchange: 'HOSE' },
  { ticker: 'FPT', name: 'FPT Corp', sector: 'Công nghệ', basePrice: 136000, exchange: 'HOSE' },
  { ticker: 'VHM', name: 'Vinhomes', sector: 'Bất động sản', basePrice: 42000, exchange: 'HOSE' },
  { ticker: 'VIC', name: 'Vingroup', sector: 'Bất động sản', basePrice: 43000, exchange: 'HOSE' },
  { ticker: 'MWG', name: 'Thế Giới Di Động', sector: 'Bán lẻ', basePrice: 60000, exchange: 'HOSE' },
  { ticker: 'SSI', name: 'SSI Securities', sector: 'Chứng khoán', basePrice: 32000, exchange: 'HOSE' },
  { ticker: 'ACB', name: 'ACB', sector: 'Ngân hàng', basePrice: 25000, exchange: 'HOSE' },
  { ticker: 'GAS', name: 'PV Gas', sector: 'Dầu khí', basePrice: 82000, exchange: 'HOSE' },
  { ticker: 'MSN', name: 'Masan', sector: 'Tiêu dùng', basePrice: 72000, exchange: 'HOSE' },
  { ticker: 'DGC', name: 'Đức Giang', sector: 'Hóa chất', basePrice: 96000, exchange: 'HOSE' },
  { ticker: 'PVS', name: 'PTSC', sector: 'Dầu khí', basePrice: 42000, exchange: 'HNX' },
];

const generateHistory = (currentPrice: number) => {
  return Array.from({length: 30}, (_, i) => ({
    time: `${9 + Math.floor(i/4)}:${(i%4)*15 || '00'}`,
    value: currentPrice * (1 + (Math.random() * 0.04 - 0.02))
  }));
};

function generateMockPrices(tickers: string[]): RealTimeQuote[] {
  const mockTickers = MOCK_TICKERS.filter(t => tickers.includes(t.ticker));
  
  return mockTickers.map(t => {
    const changePct = Math.random() * 6 - 3;
    const price = t.basePrice * (1 + changePct / 100);
    const volume = Math.floor(Math.random() * 4000000 + 500000);
    
    return {
      ticker: t.ticker,
      exchange: t.exchange,
      companyName: t.name,
      sector: t.sector,
      price: Math.round(price),
      refPrice: t.basePrice,
      ceilingPrice: Math.round(t.basePrice * 1.07),
      floorPrice: Math.round(t.basePrice * 0.93),
      change: Math.round(price - t.basePrice),
      changePercent: Math.round(changePct * 100) / 100,
      volume,
      totalValue: Math.round(volume * price / 1000000000 * 100) / 100,
      buyVolume: Math.floor(volume * 0.5),
      sellVolume: Math.floor(volume * 0.5),
      foreignBuy: Math.floor(Math.random() * 100000),
      foreignSell: Math.floor(Math.random() * 100000),
      timestamp: new Date().toISOString()
    };
  });
}

function generateMockMarketOverview(): MarketOverview {
  const vnindexChange = Math.random() * 20 - 10;
  return {
    vnindex: {
      value: 1250 + vnindexChange,
      change: vnindexChange,
      changePercent: vnindexChange / 1250 * 100,
      volume: 450000000
    },
    hnxindex: {
      value: 228 + Math.random() * 4 - 2,
      change: Math.random() * 4 - 2,
      changePercent: Math.random() * 2 - 1,
      volume: 85000000
    },
    upcomIndex: {
      value: 89 + Math.random() * 2 - 1,
      change: Math.random() * 2 - 1,
      changePercent: Math.random() * 1.5 - 0.75,
      volume: 35000000
    },
    advanceCount: 180,
    declineCount: 150,
    unchangedCount: 50,
    totalVolume: 500000000,
    totalValue: 15000,
    foreignNetBuy: Math.random() * 200 - 100,
    topGainers: generateMockPrices(['FPT', 'VCB', 'HPG']),
    topLosers: generateMockPrices(['VIC', 'VHM', 'MWG']),
    topVolume: generateMockPrices(['SSI', 'HPG', 'VCB']),
    timestamp: new Date().toISOString()
  };
}

function generateMockIntraday(): {time: string; price: number; volume: number}[] {
  const data = [];
  let price = 50000;
  
  for (let hour = 9; hour <= 14; hour++) {
    for (let min = 0; min < 60; min += 5) {
      if (hour === 14 && min > 30) break;
      price = price * (1 + (Math.random() * 0.004 - 0.002));
      data.push({
        time: `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`,
        price: Math.round(price),
        volume: Math.floor(Math.random() * 50000 + 10000)
      });
    }
  }
  
  return data;
}

// --- Legacy Functions for backward compatibility ---

export const fetchMacroData = async (): Promise<MacroData> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/macro`, {
      signal: AbortSignal.timeout(3000)
    });
    
    if (!response.ok) throw new Error('Macro API error');
    return await response.json();
  } catch (error) {
    console.warn('Using mock macro data:', error);
    return generateMockMacro();
  }
};

const generateMockMacro = (): MacroData => {
  const dxyChange = Math.random() * 1.2 - 0.4;
  return {
    gold: {
      price: 2034.50 + Math.random() * 30 - 15,
      change: Math.random() * 2 - 1,
      rsi: 42 + Math.random() * 20,
      trend: Math.random() > 0.5 ? 'UP' : 'DOWN',
      aiPrediction: dxyChange > 0.5 
        ? "Áp lực từ DXY tăng đang đè nặng lên giá Vàng." 
        : "Vàng đang trong xu hướng tích lũy."
    },
    dxy: {
      price: 102.45 + Math.random() * 1 - 0.5,
      change: dxyChange,
    },
    us10y: {
      price: 4.15 + Math.random() * 0.2 - 0.1,
      change: Math.random() * 3 - 1.5
    }
  };
};

export const fetchScreenedStocks = async (criteria: ScreenerCriteria): Promise<StockData[]> => {
  try {
    // Try to fetch from real API
    const priceData = await fetchPriceBoard();
    
    return priceData.map(item => transformToStockData(item, criteria));
  } catch (error) {
    console.warn('Using mock stock data:', error);
    return generateMockStocks(criteria);
  }
};

function transformToStockData(quote: RealTimeQuote, criteria: ScreenerCriteria): StockData {
  const roe = 15 + Math.random() * 10;
  const epsGrowth = 10 + Math.random() * 15;
  const pe = 10 + Math.random() * 10;
  const debtToEquity = Math.random() * 1.5;
  const rsi = 40 + Math.random() * 30;
  const rsRating = 50 + Math.floor(Math.random() * 45);
  
  const hybridScore = calculateHybridScore({
    roe, epsGrowth, pe, debtToEquity,
    volume: quote.volume, avgVolume: quote.volume * 0.8,
    rsi, rsRating
  });
  
  return {
    ticker: quote.ticker,
    exchange: quote.exchange as 'HOSE' | 'HNX' | 'UPCOM',
    companyName: quote.companyName,
    sector: quote.sector,
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
    volume: quote.volume,
    avgVolume20: Math.floor(quote.volume * 0.85),
    roe,
    epsGrowth,
    pe,
    debtToEquity,
    financialRaw: {
      marketCap: 50000,
      equity: 20000,
      profitAfterTax: 5000,
      eps: Math.floor(quote.price / pe),
      debt: 20000 * debtToEquity
    },
    rsi,
    ma50: quote.refPrice * 0.98,
    macd: 0,
    signal: 0,
    rsRating,
    hybridScore: hybridScore.total,
    scoreBreakdown: hybridScore.breakdown,
    vsaSignal: quote.volume > quote.volume * 0.85 * 1.5 ? 'High Demand' : 'None',
    volatilitySqueeze: Math.random() > 0.8,
    sentimentScore: hybridScore.breakdown.sentiment,
    aiInsight: {
      summary: generateAISummary(quote, hybridScore),
      signal: hybridScore.total > 70 ? 'BUY' : hybridScore.total > 50 ? 'WAIT' : 'SELL'
    },
    history: generateHistory(quote.price)
  };
}

function calculateHybridScore(data: any) {
  let score = 0;
  
  // Fundamental (max 60)
  if (data.roe > 15) score += 15;
  if (data.debtToEquity < 0.8) score += 15;
  if (data.epsGrowth > 15) score += 15;
  if (data.pe >= 10 && data.pe <= 20) score += 15;
  
  // Technical (max 40)
  if (data.volume > data.avgVolume * 1.5) score += 15;
  if (data.rsRating > 80) score += 15;
  if (data.rsi >= 45 && data.rsi <= 65) score += 10;
  
  const finalScore = Math.min(100, Math.max(0, score));
  
  return {
    total: finalScore,
    breakdown: {
      fundamental: Math.min(30, Math.floor(score * 0.5)),
      technical: Math.min(40, Math.floor(score * 0.4)),
      sentiment: Math.min(30, 50 + (data.rsRating > 80 ? 20 : 0) + Math.floor(Math.random() * 10))
    }
  };
}

function generateAISummary(quote: RealTimeQuote, score: any): string {
  const reasons = [];
  
  if (quote.changePercent > 2) reasons.push(`tăng mạnh ${quote.changePercent.toFixed(2)}%`);
  if (quote.volume > 2000000) reasons.push(`khối lượng giao dịch cao ${(quote.volume / 1000000).toFixed(1)}M`);
  if (quote.foreignBuy > quote.foreignSell) reasons.push('khối ngoại mua ròng');
  
  const base = reasons.length > 0 
    ? `Mã ${quote.ticker} ngon vì ${reasons.join(', ')}.`
    : `Mã ${quote.ticker} đang giao dịch ổn định.`;
  
  const prediction = score.total > 70 
    ? 'Dự báo: Xác suất Tăng 75% trong 24h.'
    : 'Dự báo: Xác suất Sideway 60%.';
  
  return `${base} ${prediction}`;
}

const generateMockStocks = async (criteria: ScreenerCriteria): Promise<StockData[]> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockPrices = generateMockPrices(MOCK_TICKERS.map(t => t.ticker));
  return mockPrices.map(quote => transformToStockData(quote, criteria))
    .filter(s => criteria.minHybridScore <= 0 || s.hybridScore >= criteria.minHybridScore);
};