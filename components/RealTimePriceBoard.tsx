import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Minus, Activity, Wifi, WifiOff,
    ArrowUpCircle, ArrowDownCircle, BarChart3, RefreshCw, Eye
} from 'lucide-react';
import { RealTimeQuote, wsService, fetchPriceBoard } from '../services/stockService';

interface RealTimePriceBoardProps {
    onSelectStock?: (ticker: string) => void;
}

// Price change animation component
const PriceCell: React.FC<{
    value: number;
    prevValue?: number;
    format?: 'price' | 'percent' | 'volume';
    showArrow?: boolean;
}> = ({ value, prevValue, format = 'price', showArrow = false }) => {
    const [flash, setFlash] = useState<'up' | 'down' | null>(null);
    const prevRef = useRef(value);

    useEffect(() => {
        if (prevRef.current !== value) {
            if (value > prevRef.current) {
                setFlash('up');
            } else if (value < prevRef.current) {
                setFlash('down');
            }
            prevRef.current = value;

            const timer = setTimeout(() => setFlash(null), 500);
            return () => clearTimeout(timer);
        }
    }, [value]);

    const formatValue = () => {
        switch (format) {
            case 'percent':
                return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
            case 'volume':
                if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
                if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
                return value.toString();
            default:
                return value.toLocaleString('vi-VN');
        }
    };

    const colorClass = value > 0
        ? 'text-emerald-500'
        : value < 0
            ? 'text-red-500'
            : 'text-amber-500';

    return (
        <span className={`
      font-mono font-semibold transition-all duration-300
      ${format === 'percent' ? colorClass : ''}
      ${flash === 'up' ? 'bg-emerald-500/30 text-emerald-400 scale-105' : ''}
      ${flash === 'down' ? 'bg-red-500/30 text-red-400 scale-105' : ''}
      px-1 rounded
    `}>
            {showArrow && value !== 0 && (
                value > 0 ? <TrendingUp className="inline w-3 h-3 mr-1" /> : <TrendingDown className="inline w-3 h-3 mr-1" />
            )}
            {formatValue()}
        </span>
    );
};

// Sparkline mini chart
const MiniSparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    if (!data.length) return null;

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 60;
        const y = 20 - ((v - min) / range) * 18;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg width="60" height="24" className="opacity-70">
            <polyline
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export const RealTimePriceBoard: React.FC<RealTimePriceBoardProps> = ({ onSelectStock }) => {
    const [quotes, setQuotes] = useState<RealTimeQuote[]>([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [viewMode, setViewMode] = useState<'compact' | 'detailed'>('compact');
    const priceHistory = useRef<Map<string, number[]>>(new Map());

    // Fetch initial data and setup WebSocket
    useEffect(() => {
        const initData = async () => {
            try {
                const data = await fetchPriceBoard();
                setQuotes(data);
                setIsLoading(false);
                setLastUpdate(new Date());

                // Initialize price history
                data.forEach(q => {
                    priceHistory.current.set(q.ticker, [q.price]);
                });
            } catch (error) {
                console.error('Failed to fetch initial data:', error);
                setIsLoading(false);
            }
        };

        initData();

        // Setup WebSocket connection
        wsService.connect()
            .then(() => setIsConnected(true))
            .catch(() => setIsConnected(false));

        const unsubscribeUpdate = wsService.on('price_update', (data) => {
            if (data.data && Array.isArray(data.data)) {
                setQuotes(data.data);
                setLastUpdate(new Date());

                // Update price history
                data.data.forEach((q: RealTimeQuote) => {
                    const history = priceHistory.current.get(q.ticker) || [];
                    history.push(q.price);
                    if (history.length > 20) history.shift();
                    priceHistory.current.set(q.ticker, history);
                });
            }
        });

        const unsubscribeConnect = wsService.on('connected', () => setIsConnected(true));
        const unsubscribeDisconnect = wsService.on('disconnected', () => setIsConnected(false));

        // Fallback polling if WebSocket fails
        const pollInterval = setInterval(async () => {
            if (!wsService.isConnected) {
                try {
                    const data = await fetchPriceBoard();
                    setQuotes(data);
                    setLastUpdate(new Date());
                } catch (e) {
                    // Ignore polling errors
                }
            }
        }, 10000);

        return () => {
            unsubscribeUpdate();
            unsubscribeConnect();
            unsubscribeDisconnect();
            clearInterval(pollInterval);
        };
    }, []);

    const handleRefresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await fetchPriceBoard();
            setQuotes(data);
            setLastUpdate(new Date());
        } catch (e) {
            console.error('Refresh failed:', e);
        }
        setIsLoading(false);
    }, []);

    const getPriceColor = (quote: RealTimeQuote) => {
        if (quote.price >= quote.ceilingPrice) return 'text-purple-500 bg-purple-500/10';
        if (quote.price <= quote.floorPrice) return 'text-cyan-400 bg-cyan-500/10';
        if (quote.changePercent > 0) return 'text-emerald-500';
        if (quote.changePercent < 0) return 'text-red-500';
        return 'text-amber-500';
    };

    return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 p-4 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-lg backdrop-blur-sm">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold tracking-tight">Bảng Giá Real-Time</h2>
                            <p className="text-xs text-gray-400">
                                Cập nhật lúc: {lastUpdate.toLocaleTimeString('vi-VN')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Connection Status */}
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                            }`}>
                            {isConnected ? (
                                <>
                                    <Wifi className="w-3.5 h-3.5" />
                                    <span>Live</span>
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                                </>
                            ) : (
                                <>
                                    <WifiOff className="w-3.5 h-3.5" />
                                    <span>Offline</span>
                                </>
                            )}
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex bg-white/10 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('compact')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'compact' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Compact
                            </button>
                            <button
                                onClick={() => setViewMode('detailed')}
                                className={`px-3 py-1 text-xs rounded-md transition-all ${viewMode === 'detailed' ? 'bg-white text-gray-900' : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                Chi tiết
                            </button>
                        </div>

                        {/* Refresh */}
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider">
                            <th className="px-4 py-3 text-left font-semibold">Mã CK</th>
                            <th className="px-4 py-3 text-right font-semibold">Giá</th>
                            <th className="px-4 py-3 text-right font-semibold">+/-</th>
                            <th className="px-4 py-3 text-right font-semibold">%</th>
                            <th className="px-4 py-3 text-right font-semibold">KL</th>
                            {viewMode === 'detailed' && (
                                <>
                                    <th className="px-4 py-3 text-right font-semibold">Mua</th>
                                    <th className="px-4 py-3 text-right font-semibold">Bán</th>
                                    <th className="px-4 py-3 text-right font-semibold">NN Mua</th>
                                    <th className="px-4 py-3 text-right font-semibold">NN Bán</th>
                                </>
                            )}
                            <th className="px-4 py-3 text-center font-semibold">Trend</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {isLoading ? (
                            // Loading skeleton
                            Array.from({ length: 10 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 ml-auto" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12 ml-auto" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-14 ml-auto" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-14 ml-auto" /></td>
                                    <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-16 mx-auto" /></td>
                                </tr>
                            ))
                        ) : (
                            quotes.map((quote) => (
                                <tr
                                    key={quote.ticker}
                                    onClick={() => onSelectStock?.(quote.ticker)}
                                    className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                >
                                    {/* Ticker */}
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`
                        w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm
                        ${quote.changePercent > 0 ? 'bg-emerald-500/10 text-emerald-600' :
                                                    quote.changePercent < 0 ? 'bg-red-500/10 text-red-600' :
                                                        'bg-amber-500/10 text-amber-600'}
                        group-hover:scale-105 transition-transform
                      `}>
                                                {quote.ticker.slice(0, 3)}
                                            </div>
                                            <div>
                                                <div className="font-semibold text-gray-900">{quote.ticker}</div>
                                                <div className="text-xs text-gray-400">{quote.exchange}</div>
                                            </div>
                                        </div>
                                    </td>

                                    {/* Price */}
                                    <td className={`px-4 py-3 text-right font-mono font-bold ${getPriceColor(quote)}`}>
                                        <PriceCell value={quote.price} />
                                    </td>

                                    {/* Change */}
                                    <td className="px-4 py-3 text-right">
                                        <PriceCell value={quote.change} />
                                    </td>

                                    {/* Change Percent */}
                                    <td className="px-4 py-3 text-right">
                                        <span className={`
                      inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold
                      ${quote.changePercent > 0 ? 'bg-emerald-500/10 text-emerald-600' :
                                                quote.changePercent < 0 ? 'bg-red-500/10 text-red-600' :
                                                    'bg-gray-100 text-gray-600'}
                    `}>
                                            {quote.changePercent > 0 ? <ArrowUpCircle className="w-3 h-3" /> :
                                                quote.changePercent < 0 ? <ArrowDownCircle className="w-3 h-3" /> :
                                                    <Minus className="w-3 h-3" />}
                                            <PriceCell value={quote.changePercent} format="percent" />
                                        </span>
                                    </td>

                                    {/* Volume */}
                                    <td className="px-4 py-3 text-right">
                                        <PriceCell value={quote.volume} format="volume" />
                                    </td>

                                    {viewMode === 'detailed' && (
                                        <>
                                            <td className="px-4 py-3 text-right text-emerald-600">
                                                <PriceCell value={quote.buyVolume} format="volume" />
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-500">
                                                <PriceCell value={quote.sellVolume} format="volume" />
                                            </td>
                                            <td className="px-4 py-3 text-right text-emerald-600">
                                                <PriceCell value={quote.foreignBuy} format="volume" />
                                            </td>
                                            <td className="px-4 py-3 text-right text-red-500">
                                                <PriceCell value={quote.foreignSell} format="volume" />
                                            </td>
                                        </>
                                    )}

                                    {/* Mini Chart */}
                                    <td className="px-4 py-3">
                                        <div className="flex justify-center">
                                            <MiniSparkline
                                                data={priceHistory.current.get(quote.ticker) || [quote.price]}
                                                color={quote.changePercent >= 0 ? '#10b981' : '#ef4444'}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer Stats */}
            <div className="bg-gray-50 px-4 py-3 border-t border-gray-100">
                <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                            Tăng: {quotes.filter(q => q.changePercent > 0).length}
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-red-500 rounded-full" />
                            Giảm: {quotes.filter(q => q.changePercent < 0).length}
                        </span>
                        <span className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full" />
                            Đứng: {quotes.filter(q => q.changePercent === 0).length}
                        </span>
                    </div>
                    <div>
                        Tổng: {quotes.length} mã |
                        KL: {(quotes.reduce((s, q) => s + q.volume, 0) / 1000000).toFixed(1)}M
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimePriceBoard;
