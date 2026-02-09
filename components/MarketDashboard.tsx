import React, { useState, useEffect, useCallback } from 'react';
import {
    TrendingUp, TrendingDown, Activity, Globe, DollarSign,
    BarChart2, Users, ArrowUpRight, ArrowDownRight, Zap,
    Clock, ChevronRight, Sparkles
} from 'lucide-react';
import { fetchMarketOverview, MarketOverview, IndexData, RealTimeQuote } from '../services/stockService';

// Animated counter component
const AnimatedNumber: React.FC<{
    value: number;
    decimals?: number;
    prefix?: string;
    suffix?: string;
    className?: string;
}> = ({ value, decimals = 2, prefix = '', suffix = '', className = '' }) => {
    const [displayValue, setDisplayValue] = useState(value);

    useEffect(() => {
        const startValue = displayValue;
        const diff = value - startValue;
        const duration = 500;
        const steps = 20;
        const stepValue = diff / steps;
        let step = 0;

        const timer = setInterval(() => {
            step++;
            if (step >= steps) {
                setDisplayValue(value);
                clearInterval(timer);
            } else {
                setDisplayValue(startValue + stepValue * step);
            }
        }, duration / steps);

        return () => clearInterval(timer);
    }, [value]);

    return (
        <span className={className}>
            {prefix}{displayValue.toFixed(decimals)}{suffix}
        </span>
    );
};

// Index Card Component
const IndexCard: React.FC<{
    name: string;
    data: IndexData;
    color: 'blue' | 'emerald' | 'purple';
}> = ({ name, data, color }) => {
    const isPositive = data.change >= 0;

    const colorClasses = {
        blue: 'from-blue-500 to-indigo-600',
        emerald: 'from-emerald-500 to-teal-600',
        purple: 'from-purple-500 to-pink-600'
    };

    return (
        <div className={`
      relative overflow-hidden rounded-2xl p-5 text-white
      bg-gradient-to-br ${colorClasses[color]}
      shadow-lg hover:shadow-xl transition-all duration-300
      hover:scale-[1.02] cursor-pointer
    `}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-black/10 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium opacity-90">{name}</span>
                    <div className={`
            flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold
            ${isPositive ? 'bg-white/20' : 'bg-black/20'}
          `}>
                        {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        {Math.abs(data.changePercent).toFixed(2)}%
                    </div>
                </div>

                <div className="text-3xl font-bold tracking-tight mb-1">
                    <AnimatedNumber value={data.value} decimals={2} />
                </div>

                <div className="flex items-center gap-2 text-sm opacity-80">
                    <span className={isPositive ? '' : 'text-red-200'}>
                        {isPositive ? '+' : ''}{data.change.toFixed(2)} điểm
                    </span>
                    <span>•</span>
                    <span>KL: {(data.volume / 1000000).toFixed(0)}M</span>
                </div>
            </div>
        </div>
    );
};

// Top Movers Card
const TopMoversCard: React.FC<{
    title: string;
    stocks: RealTimeQuote[];
    type: 'gainers' | 'losers' | 'volume';
}> = ({ title, stocks, type }) => {
    const getIcon = () => {
        switch (type) {
            case 'gainers': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
            case 'losers': return <TrendingDown className="w-4 h-4 text-red-500" />;
            case 'volume': return <BarChart2 className="w-4 h-4 text-blue-500" />;
        }
    };

    const getColor = () => {
        switch (type) {
            case 'gainers': return 'emerald';
            case 'losers': return 'red';
            case 'volume': return 'blue';
        }
    };

    return (
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 mb-3">
                {getIcon()}
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
            </div>

            <div className="space-y-2">
                {stocks.slice(0, 5).map((stock, index) => (
                    <div key={stock.ticker} className="flex items-center justify-between py-1.5 hover:bg-gray-50 rounded px-1 -mx-1 transition-colors cursor-pointer">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-4">{index + 1}</span>
                            <span className="font-semibold text-gray-900 text-sm">{stock.ticker}</span>
                        </div>
                        <div className="text-right">
                            {type === 'volume' ? (
                                <span className="text-sm font-mono text-blue-600">
                                    {(stock.volume / 1000000).toFixed(1)}M
                                </span>
                            ) : (
                                <span className={`text-sm font-mono font-semibold ${stock.changePercent >= 0 ? 'text-emerald-600' : 'text-red-600'
                                    }`}>
                                    {stock.changePercent >= 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Main Dashboard Component
export const MarketDashboard: React.FC = () => {
    const [marketData, setMarketData] = useState<MarketOverview | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const loadData = useCallback(async () => {
        try {
            const data = await fetchMarketOverview();
            setMarketData(data);
            setLastUpdate(new Date());
        } catch (error) {
            console.error('Failed to load market data:', error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
        const interval = setInterval(loadData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [loadData]);

    if (isLoading || !marketData) {
        return (
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <div className="flex items-center justify-center h-48">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        <p className="text-gray-500 text-sm">Đang tải dữ liệu thị trường...</p>
                    </div>
                </div>
            </div>
        );
    }

    const totalStocks = marketData.advanceCount + marketData.declineCount + marketData.unchangedCount;
    const advancePercent = (marketData.advanceCount / totalStocks) * 100;
    const declinePercent = (marketData.declineCount / totalStocks) * 100;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg">
                        <Activity className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Tổng quan Thị trường</h2>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Cập nhật: {lastUpdate.toLocaleTimeString('vi-VN')}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-xs font-semibold">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Live
                    </span>
                </div>
            </div>

            {/* Main Indices */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <IndexCard name="VN-Index" data={marketData.vnindex} color="blue" />
                <IndexCard name="HNX-Index" data={marketData.hnxindex} color="emerald" />
                <IndexCard name="UPCOM" data={marketData.upcomIndex} color="purple" />
            </div>

            {/* Market Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {/* Market Breadth */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Độ rộng TT</span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="flex h-full">
                                <div
                                    className="bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${advancePercent}%` }}
                                />
                                <div
                                    className="bg-red-500 transition-all duration-500"
                                    style={{ width: `${declinePercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-between text-xs">
                        <span className="text-emerald-600 font-semibold">↑ {marketData.advanceCount}</span>
                        <span className="text-gray-400">{marketData.unchangedCount}</span>
                        <span className="text-red-600 font-semibold">↓ {marketData.declineCount}</span>
                    </div>
                </div>

                {/* Total Volume */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <BarChart2 className="w-4 h-4 text-blue-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Khối lượng</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {(marketData.totalVolume / 1000000).toFixed(0)}M
                    </div>
                    <p className="text-xs text-gray-400">cổ phiếu giao dịch</p>
                </div>

                {/* Total Value */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Giá trị GD</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900">
                        {(marketData.totalValue / 1000).toFixed(1)}K
                    </div>
                    <p className="text-xs text-gray-400">tỷ đồng</p>
                </div>

                {/* Foreign Flow */}
                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">NN Mua ròng</span>
                    </div>
                    <div className={`text-2xl font-bold ${marketData.foreignNetBuy >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {marketData.foreignNetBuy >= 0 ? '+' : ''}{marketData.foreignNetBuy.toFixed(0)}
                    </div>
                    <p className="text-xs text-gray-400">tỷ đồng</p>
                </div>
            </div>

            {/* Top Movers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <TopMoversCard
                    title="Top Tăng giá"
                    stocks={marketData.topGainers || []}
                    type="gainers"
                />
                <TopMoversCard
                    title="Top Giảm giá"
                    stocks={marketData.topLosers || []}
                    type="losers"
                />
                <TopMoversCard
                    title="Top Khối lượng"
                    stocks={marketData.topVolume || []}
                    type="volume"
                />
            </div>
        </div>
    );
};

export default MarketDashboard;
