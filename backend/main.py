"""
VNStock Real-Time API Server - Fixed for vnstock 0.2.9
======================================================
Backend for real-time Vietnam stock market data.
Uses vnstock library for actual market data from TCBS/SSI.
"""

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import pandas as pd
import numpy as np
import os
import asyncio
import json
from datetime import datetime, timedelta
import traceback
from quant_screener import run_screener

# --- VNSTOCK SETUP ---
VNSTOCK_AVAILABLE = False
try:
    from vnstock import stock_historical_data, listing_companies, price_board
    VNSTOCK_AVAILABLE = True
    print("✅ vnstock loaded successfully!")
except ImportError as e:
    print(f"⚠️  WARNING: vnstock import error: {e}")
    print("Running in simulation mode.")

# Optional: yfinance for macro data
YFINANCE_AVAILABLE = False
try:
    import yfinance as yf
    import pandas_ta as ta
    YFINANCE_AVAILABLE = True
    print("✅ yfinance + pandas_ta loaded!")
except ImportError:
    print("⚠️  yfinance not available for macro data")

app = FastAPI(
    title="VNStock Real-Time API",
    description="API for real-time Vietnam stock market data",
    version="2.1.0"
)

# Mount static files for charts
# Ensure directory exists: backend/static
static_dir = os.path.join(os.path.dirname(__file__), "static")
os.makedirs(static_dir, exist_ok=True)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- WEBSOCKET CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.subscribed_tickers: Dict[WebSocket, List[str]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        self.subscribed_tickers[websocket] = []

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        if websocket in self.subscribed_tickers:
            del self.subscribed_tickers[websocket]

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

# --- CACHE LAYER ---
class DataCache:
    def __init__(self, ttl_seconds: int = 10):
        self.cache: Dict[str, Any] = {}
        self.timestamps: Dict[str, datetime] = {}
        self.ttl = timedelta(seconds=ttl_seconds)

    def get(self, key: str) -> Optional[Any]:
        if key in self.cache:
            if datetime.now() - self.timestamps[key] < self.ttl:
                return self.cache[key]
        return None

    def set(self, key: str, value: Any):
        self.cache[key] = value
        self.timestamps[key] = datetime.now()

cache = DataCache(ttl_seconds=5)

# --- CONSTANTS ---
MAJOR_TICKERS = [
    'VCB', 'BID', 'VHM', 'VIC', 'HPG', 'FPT', 'VNM', 'GAS', 'CTG', 'TCB',
    'MWG', 'VPB', 'MSN', 'SAB', 'ACB', 'MBB', 'POW', 'PLX', 'VJC', 'VRE',
    'SSI', 'HDB', 'STB', 'TPB', 'VIB', 'BCM', 'GVR', 'PDR', 'NVL', 'DGC',
    'VHC', 'FRT', 'PNJ', 'REE', 'GMD', 'DPM', 'DCM', 'PVD', 'PVS', 'KDH'
]

SECTOR_MAP = {
    'VCB': 'Ngân hàng', 'BID': 'Ngân hàng', 'CTG': 'Ngân hàng', 'TCB': 'Ngân hàng',
    'VPB': 'Ngân hàng', 'ACB': 'Ngân hàng', 'MBB': 'Ngân hàng', 'HDB': 'Ngân hàng',
    'STB': 'Ngân hàng', 'TPB': 'Ngân hàng', 'VIB': 'Ngân hàng',
    'VHM': 'Bất động sản', 'VIC': 'Bất động sản', 'VRE': 'Bất động sản',
    'PDR': 'Bất động sản', 'NVL': 'Bất động sản', 'KDH': 'Bất động sản',
    'HPG': 'Thép', 'FPT': 'Công nghệ', 'VNM': 'Tiêu dùng',
    'GAS': 'Dầu khí', 'PLX': 'Dầu khí', 'PVD': 'Dầu khí', 'PVS': 'Dầu khí',
    'MWG': 'Bán lẻ', 'FRT': 'Bán lẻ', 'PNJ': 'Bán lẻ',
    'MSN': 'Tiêu dùng', 'SAB': 'Đồ uống', 'SSI': 'Chứng khoán',
    'POW': 'Điện', 'VJC': 'Hàng không', 'BCM': 'Bất động sản',
    'GVR': 'Cao su', 'DGC': 'Hóa chất', 'VHC': 'Thủy sản',
    'REE': 'Điện lạnh', 'GMD': 'Cảng biển', 'DPM': 'Phân bón', 'DCM': 'Phân bón'
}

COMPANY_NAMES = {
    'VCB': 'Vietcombank', 'BID': 'BIDV', 'CTG': 'VietinBank', 'TCB': 'Techcombank',
    'VPB': 'VPBank', 'ACB': 'ACB', 'MBB': 'MB Bank', 'HDB': 'HDBank',
    'STB': 'Sacombank', 'TPB': 'TPBank', 'VIB': 'VIB',
    'VHM': 'Vinhomes', 'VIC': 'Vingroup', 'VRE': 'Vincom Retail',
    'PDR': 'Phát Đạt', 'NVL': 'Novaland', 'KDH': 'Khang Điền',
    'HPG': 'Hòa Phát', 'FPT': 'FPT Corp', 'VNM': 'Vinamilk',
    'GAS': 'PV Gas', 'PLX': 'Petrolimex', 'PVD': 'PV Drilling', 'PVS': 'PTSC',
    'MWG': 'Thế Giới Di Động', 'FRT': 'FPT Retail', 'PNJ': 'PNJ',
    'MSN': 'Masan', 'SAB': 'Sabeco', 'SSI': 'SSI Securities',
    'POW': 'PV Power', 'VJC': 'Vietjet Air', 'BCM': 'Becamex',
    'GVR': 'Cao su VN', 'DGC': 'Đức Giang', 'VHC': 'Vĩnh Hoàn',
    'REE': 'REE Corp', 'GMD': 'Gemadept', 'DPM': 'Đạm Phú Mỹ', 'DCM': 'Đạm Cà Mau'
}

def get_exchange(ticker: str) -> str:
    hnx_tickers = ['PVS', 'SHS', 'TNG', 'PVB', 'DTD']
    upcom_tickers = ['ACV', 'BSR', 'OIL', 'QNS']
    if ticker in hnx_tickers:
        return 'HNX'
    elif ticker in upcom_tickers:
        return 'UPCOM'
    return 'HOSE'

# --- DATA FETCHING FUNCTIONS ---

def fetch_real_price_board(tickers: List[str]) -> List[Dict]:
    """Fetch real-time price data with historical fallback if price_board fails"""
    if not VNSTOCK_AVAILABLE:
        return []
    
    try:
        # Workaround: price_board is currently broken in legacy vnstock (KeyError: 'data')
        # We use stock_historical_data for each ticker as a replacement
        results = []
        for ticker in tickers:
            try:
                # Fetch only the last 7 days to get current price and change
                end_date = datetime.now().strftime('%Y-%m-%d')
                start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
                
                df = stock_historical_data(
                    symbol=ticker,
                    start_date=start_date,
                    end_date=end_date,
                    resolution='1D',
                    type='stock'
                )
                
                if df is not None and not df.empty and len(df) >= 1:
                    last = df.iloc[-1]
                    prev = df.iloc[-2] if len(df) >= 2 else last
                    
                    price = float(last.get('close', 0))
                    ref_price = float(prev.get('close', 0))
                    change = price - ref_price
                    change_pct = (change / ref_price * 100) if ref_price > 0 else 0
                    volume = int(last.get('volume', 0))
                    
                    results.append({
                        'ticker': ticker,
                        'exchange': get_exchange(ticker),
                        'companyName': COMPANY_NAMES.get(ticker, ticker),
                        'sector': SECTOR_MAP.get(ticker, 'Khác'),
                        'price': round(price),
                        'refPrice': round(ref_price),
                        'ceilingPrice': round(ref_price * 1.07),
                        'floorPrice': round(ref_price * 0.93),
                        'change': round(change),
                        'changePercent': round(change_pct, 2),
                        'volume': volume,
                        'totalValue': round(volume * price / 1000000000, 2) if price > 0 else 0,
                        'buyVolume': int(volume * 0.5), # Estimated
                        'sellVolume': int(volume * 0.5), # Estimated
                        'foreignBuy': 0,
                        'foreignSell': 0,
                        'timestamp': datetime.now().isoformat()
                    })
            except Exception as e:
                print(f"Error fetching {ticker}: {e}")
                continue
        
        if results:
            print(f"✅ Successfully fetched data using historical fallback for {len(results)} stocks")
            return results
        return results
            
    except Exception as e:
        print(f"❌ Error in fetch_real_price_board: {e}")
        traceback.print_exc()
        return []


def fetch_stock_history(ticker: str, days: int = 30) -> List[Dict]:
    """Fetch historical price data for a stock"""
    if not VNSTOCK_AVAILABLE:
        return []
    
    try:
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        df = stock_historical_data(
            symbol=ticker,
            start_date=start_date.strftime('%Y-%m-%d'),
            end_date=end_date.strftime('%Y-%m-%d'),
            resolution='1D',
            type='stock'
        )
        
        if df is None or df.empty:
            return []
        
        result = []
        for _, row in df.iterrows():
            result.append({
                'time': str(row.get('time', row.get('date', ''))),
                'open': float(row.get('open', 0)),
                'high': float(row.get('high', 0)),
                'low': float(row.get('low', 0)),
                'close': float(row.get('close', 0)),
                'volume': int(row.get('volume', 0))
            })
        
        return result
        
    except Exception as e:
        print(f"Error fetching history for {ticker}: {e}")
        return []


# Removed mock data generation functions to comply with Zero Fabrication policy.


def fetch_market_indices() -> Dict:
    """Fetch real market indices (VNIndex, HNX, UPCOM) using vnstock"""
    if not VNSTOCK_AVAILABLE:
        return {
            'vnindex': {'value': 0, 'change': 0, 'changePercent': 0, 'volume': 0},
            'hnxindex': {'value': 0, 'change': 0, 'changePercent': 0, 'volume': 0},
            'upcomIndex': {'value': 0, 'change': 0, 'changePercent': 0, 'volume': 0},
            'timestamp': datetime.now().isoformat()
        }
    
    indices_data = {}
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=7)).strftime('%Y-%m-%d')
    
    mapping = {
        'vnindex': 'VNINDEX',
        'hnxindex': 'HNX',
        'upcomIndex': 'UPCOM'
    }
    
    for key, symbol in mapping.items():
        try:
            df = stock_historical_data(
                symbol=symbol, 
                start_date=start_date, 
                end_date=end_date, 
                resolution='1D', 
                type='index'
            )
            
            if df is not None and not df.empty and len(df) >= 1:
                last = df.iloc[-1]
                prev = df.iloc[-2] if len(df) >= 2 else last
                
                val = float(last['close'])
                prev_val = float(prev['close'])
                change = val - prev_val
                change_pct = (change / prev_val * 100) if prev_val > 0 else 0
                
                indices_data[key] = {
                    'value': round(val, 2),
                    'change': round(change, 2),
                    'changePercent': round(change_pct, 2),
                    'volume': int(last['volume'])
                }
            else:
                indices_data[key] = {'value': 0, 'change': 0, 'changePercent': 0, 'volume': 0}
        except Exception as e:
            print(f"Error fetching index {symbol}: {e}")
            indices_data[key] = {'value': 0, 'change': 0, 'changePercent': 0, 'volume': 0}
            
    indices_data['timestamp'] = datetime.now().isoformat()
    return indices_data


def fetch_macro_data() -> Dict:
    """Fetch global macro data (Gold, DXY, US10Y)"""
    if not YFINANCE_AVAILABLE:
        return {}
    
    try:
        data = yf.download("GC=F DX-Y.NYB ^TNX", period="5d", interval="1d", 
                          group_by='ticker', progress=False)
        
        def extract_asset(ticker):
            df = data[ticker] if ticker in data.columns.levels[0] else pd.DataFrame()
            if df.empty:
                return {"price": 0, "change": 0, "rsi": 50, "trend": "SIDEWAYS"}
            
            latest = df.iloc[-1]
            prev = df.iloc[-2] if len(df) > 1 else df.iloc[-1]
            change = ((latest['Close'] - prev['Close']) / prev['Close']) * 100

            trend = "UP" if change > 0 else "DOWN"
            return {"price": float(latest['Close']), "change": round(float(change), 2), 
                   "rsi": 50, "trend": trend}

        return {
            "gold": {**extract_asset("GC=F"), "aiPrediction": "Dữ liệu thời gian thực."},
            "dxy": extract_asset("DX-Y.NYB"),
            "us10y": extract_asset("^TNX"),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        print(f"Error fetching macro: {e}")
        return {}


# Removed mock macro function.


# --- REST API ENDPOINTS ---

@app.get("/")
async def root():
    return {
        "name": "VNStock Real-Time API",
        "version": "2.1.0",
        "vnstock_available": VNSTOCK_AVAILABLE,
        "endpoints": {
            "price_board": "/api/price-board",
            "history": "/api/history/{ticker}",
            "market": "/api/market",
            "macro": "/api/macro",
            "websocket": "/ws"
        }
    }


@app.get("/api/price-board")
async def get_price_board(tickers: str = None):
    """Get real-time price board for specified tickers"""
    if tickers:
        ticker_list = [t.strip().upper() for t in tickers.split(',')]
    else:
        ticker_list = MAJOR_TICKERS[:20]
    
    # Check cache
    cache_key = f"prices_{','.join(sorted(ticker_list))}"
    cached = cache.get(cache_key)
    if cached:
        return {"data": cached, "cached": True, "source": "vnstock" if VNSTOCK_AVAILABLE else "mock"}
    
    data = fetch_real_price_board(ticker_list)
    cache.set(cache_key, data)
    
    return {"data": data, "cached": False, "source": "vnstock" if VNSTOCK_AVAILABLE else "mock"}


@app.get("/api/history/{ticker}")
async def get_history(ticker: str, days: int = 30):
    """Get historical price data for a ticker"""
    ticker = ticker.upper()
    data = fetch_stock_history(ticker, days)
    return {"ticker": ticker, "data": data}


@app.get("/api/market")
async def get_market_overview():
    """Get market indices and overview"""
    cached = cache.get("market_overview")
    if cached:
        return cached
    
    indices = fetch_market_indices()
    prices = fetch_real_price_board(MAJOR_TICKERS)
    
    advance = len([p for p in prices if p['changePercent'] > 0])
    decline = len([p for p in prices if p['changePercent'] < 0])
    unchanged = len(prices) - advance - decline
    
    # Calculate more accurate market volume and value
    # indices volume is the number of shares
    total_vol = indices['vnindex']['volume'] + indices['hnxindex']['volume'] + indices['upcomIndex']['volume']
    
    # Estimate market value (if not directly available) 
    # Or just use the sum of major tickers which is more "real" than a random number
    # but still lower than the whole market. 
    # For now, let's use the sum of all price board data available.
    total_val = sum(p['totalValue'] for p in prices)
    
    result = {
        **indices,
        "advanceCount": advance,
        "declineCount": decline,
        "unchangedCount": unchanged,
        "totalVolume": total_vol,
        "totalValue": round(total_val, 2),
        "foreignNetBuy": round(sum(p['foreignBuy'] - p['foreignSell'] for p in prices) / 1000000, 2),
        "topGainers": sorted(prices, key=lambda x: x['changePercent'], reverse=True)[:5],
        "topLosers": sorted(prices, key=lambda x: x['changePercent'])[:5],
        "topVolume": sorted(prices, key=lambda x: x['volume'], reverse=True)[:5]
    }
    
    cache.set("market_overview", result)
    return result


@app.get("/api/macro")
async def get_macro():
    """Get global macro indicators"""
    cached = cache.get("macro")
    if cached:
        return cached
    
    data = fetch_macro_data()
    cache.set("macro", data)
    return data


@app.get("/api/tickers")
async def get_available_tickers():
    """Get list of available tickers"""
    return {
        "tickers": MAJOR_TICKERS,
        "count": len(MAJOR_TICKERS),
        "sectors": list(set(SECTOR_MAP.values()))
    }


# Legacy endpoint for compatibility with old frontend
@app.post("/api/screen")
async def smart_screener(criteria: dict = None):
    """Legacy screener endpoint - returns real price data only"""
    data = fetch_real_price_board(MAJOR_TICKERS)
    
    results = []
    for item in data:
        results.append({
            "ticker": item['ticker'],
            "exchange": item['exchange'],
            "price": item['price'],
            "change_percent": item['changePercent'],
            "volume": item['volume'],
            "roe": 0, # To be fetched from real FA if needed
            "pe": 0,
            "rsi": 0,
            "hybrid_score": 0,
            "ai_insight": {
                "summary": f"Mã {item['ticker']} đang giao dịch với giá {item['price']:,} VND.",
                "signal": "WAIT"
            }
        })
    
    return results


@app.get("/api/screener/quant")
async def get_quant_screener(limit: int = 20):
    """Run the advanced Wyckoff/ICT screener"""
    try:
        # Run in a separate thread using run_in_executor
        import asyncio
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, run_screener, limit)
        return {"count": len(results), "data": results}
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


# --- WEBSOCKET FOR REAL-TIME UPDATES ---

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    
    try:
        # Send initial data
        initial_data = fetch_real_price_board(MAJOR_TICKERS[:10])
        await websocket.send_json({
            "type": "initial",
            "data": initial_data,
            "timestamp": datetime.now().isoformat()
        })
        
        while True:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=5.0)
                
                if data.get("action") == "subscribe":
                    tickers = data.get("tickers", [])
                    manager.subscribed_tickers[websocket] = tickers
                    await websocket.send_json({
                        "type": "subscribed",
                        "tickers": tickers
                    })
                
            except asyncio.TimeoutError:
                pass
            
            # Push updates
            subscribed = manager.subscribed_tickers.get(websocket, [])
            if subscribed:
                updates = fetch_real_price_board(subscribed)
            else:
                updates = fetch_real_price_board(MAJOR_TICKERS[:10])
            
            await websocket.send_json({
                "type": "update",
                "data": updates,
                "timestamp": datetime.now().isoformat()
            })
            
            await asyncio.sleep(5)  # Update every 5 seconds
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
