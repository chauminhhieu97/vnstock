import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random
import os
from functools import lru_cache

# --- 1. VNSTOCK INTEGRATION ---
try:
    from vnstock import stock_historical_data, listing_companies, financial_ratio, financial_flow
    VNSTOCK_AVAILABLE = True
except ImportError:
    VNSTOCK_AVAILABLE = False
    print("⚠️ vnstock library not found. Install via: pip install vnstock")

# --- 2. DATA FETCHING (STRICT ZERO FABRICATION) ---

def fetch_safe_data(func, *args, **kwargs):
    """Wrapper to safely fetch data from API and handle errors with retry."""
    if not VNSTOCK_AVAILABLE:
        return None
    
    # Retry logic (max 3 attempts) - Optimized for speed (less sleep)
    for attempt in range(3):
        try:
            # Micro-delay to avoid hitting limits
            time.sleep(random.uniform(0.05, 0.2)) 
            return func(*args, **kwargs)
        except Exception:
            if attempt < 2:
                time.sleep(0.5 + attempt) # Faster backoff
            else:
                return None
    return None

def get_sector_median_pe(sector_name, all_tickers_df):
    """
    Dynamically calculate Sector P/E Median.
    Refuses to use hardcoded values.
    """
    if not VNSTOCK_AVAILABLE: return None

    # Filter tickers in the same sector
    sector_tickers = all_tickers_df[all_tickers_df['organName'] == sector_name]['ticker'].tolist()
    
    if len(sector_tickers) < 3: return None
    
    pe_values = []
    # Fetch P/E for a sample of sector peers (limit to 5 to speed up)
    sample_size = min(len(sector_tickers), 5) 
    sampled_tickers = random.sample(sector_tickers, sample_size)
    
    for t in sampled_tickers:
        try:
            ratio = fetch_safe_data(financial_ratio, t, report_range='yearly', is_all=True)
            if ratio is not None and not ratio.empty:
                pe = ratio.iloc[0].get('priceToEarning', ratio.iloc[0].get('pe'))
                if pe and pe > 0: 
                    pe_values.append(pe)
        except:
            continue
            
    if not pe_values:
        return None
        
    return np.median(pe_values)

# --- DISK CACHING FOR SPEED ---
import pickle
import hashlib
from pathlib import Path

CACHE_DIR = Path(__file__).parent / "cache"
CACHE_DIR.mkdir(exist_ok=True)
CACHE_EXPIRY_HOURS = 6  # Financial data cached for 6 hours

def get_cache_path(symbol):
    return CACHE_DIR / f"{symbol}_financials.pkl"

def load_from_cache(symbol):
    """Load cached financial data if valid"""
    cache_file = get_cache_path(symbol)
    if cache_file.exists():
        try:
            mod_time = cache_file.stat().st_mtime
            age_hours = (time.time() - mod_time) / 3600
            if age_hours < CACHE_EXPIRY_HOURS:
                with open(cache_file, 'rb') as f:
                    return pickle.load(f)
        except:
            pass
    return None

def save_to_cache(symbol, data):
    """Save financial data to disk cache"""
    try:
        with open(get_cache_path(symbol), 'wb') as f:
            pickle.dump(data, f)
    except:
        pass

def fetch_full_financials(symbol):
    """Fetch financial statements with disk caching for speed."""
    # Check cache first
    cached = load_from_cache(symbol)
    if cached:
        # print(f"💾 Cache hit: {symbol}")
        return cached
    
    # Fetch from API
    ratio = fetch_safe_data(financial_ratio, symbol, report_range='yearly', is_all=True)
    if ratio is None or ratio.empty: return None

    cashflow = fetch_safe_data(financial_flow, symbol, report_type='cashflow', report_range='yearly')
    if cashflow is None or cashflow.empty: return None
        
    income = fetch_safe_data(financial_flow, symbol, report_type='incomestatement', report_range='yearly')
    if income is None or income.empty: return None
    
    result = {
        'ratio': ratio.iloc[0],
        'cashflow': cashflow, 
        'income': income # Return full DF
    }
    
    # Save to disk cache for future speed
    save_to_cache(symbol, result)
    return result

def fetch_market_data(symbol):
    """Fetch OHLCV data for Technical Analysis."""
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
    
    df = fetch_safe_data(stock_historical_data, symbol=symbol, start_date=start_date, end_date=end_date, resolution='1D', type='stock')
    
    if df is None or df.empty or len(df) < 50:
        return None
        
    # Standardize columns
    df = df.rename(columns={'time': 'Date', 'open': 'Open', 'high': 'High', 'low': 'Low', 'close': 'Close', 'volume': 'Volume', 'ticker': 'Symbol'})
    return df

# --- 3. SCORING ENGINE (AI FIN-CORE 3.0: PRO TRADER) ---

def calculate_stock_score(symbol, sector_info_df):
    """
    Main scoring function. 
    Total Score = 40% FA + 60% TA.
    Returns dict with detailed breakdown and reasoning.
    """
    # 1. Fetch Data
    fin = fetch_full_financials(symbol)
    df = fetch_market_data(symbol)
    
    if not fin and df is None:
        return None  # Both failed
        
    # --- PART A: FUNDAMENTAL ANALYSIS (40 Points) ---
    score_fa = 0
    fa_notes = []
    
    if fin:
        # 1. Valuation (10 pts)
        ticker_info = sector_info_df[sector_info_df['ticker'] == symbol]
        if not ticker_info.empty:
            sector_name = ticker_info.iloc[0]['organName']
            sector_median_pe = get_sector_median_pe(sector_name, sector_info_df)
        else:
            sector_median_pe = None
            
        pe = fin['ratio'].get('priceToEarning', fin['ratio'].get('pe'))
        if pe and sector_median_pe and pe < (0.9 * sector_median_pe):
            score_fa += 10
            fa_notes.append("Định giá hấp dẫn")

        # 2. Growth & Quality (20 pts)
        try:
            inc = fin['income']
            if len(inc) >= 2:
                curr = inc.iloc[0]
                prev = inc.iloc[1]
                
                # Growth: Net Profit > 15% AND Revenue > 10%
                current_np = curr.get('netIncome', curr.get('postTaxProfit', 0))
                prev_np = prev.get('netIncome', prev.get('postTaxProfit', 1)) 
                current_rev = curr.get('revenue', 0)
                prev_rev = prev.get('revenue', 1)
                
                if prev_np > 0 and prev_rev > 0:
                    ni_growth = (current_np - prev_np) / abs(prev_np)
                    rev_growth = (current_rev - prev_rev) / prev_rev
                    
                    if ni_growth > 0.15 and rev_growth > 0.10:
                        score_fa += 10
                        fa_notes.append(f"Tăng trưởng mạnh (+{int(ni_growth*100)}%)")
                    
                # Margin Expansion: Gross Margin improvement
                curr_gm = curr.get('grossProfit', 0) / (current_rev if current_rev else 1)
                prev_gm = prev.get('grossProfit', 0) / (prev_rev if prev_rev else 1)
                
                if curr_gm > prev_gm * 1.05: # 5% improvement
                    score_fa += 10
                    fa_notes.append("Biên lợi nhuận cải thiện")
        except Exception as e:
            pass
            
        # 3. Health (10 pts)
        debt_equity = fin['ratio'].get('debtOnEquity', fin['ratio'].get('debtToEquity', 100))
        if debt_equity <= 0.8: # Safer debt level
            score_fa += 10
            fa_notes.append("Tài chính lành mạnh")
    else:
        fa_notes.append("(Không có dữ liệu tài chính)")
        pe = 0
        roe = 0

    # --- PART B: TECHNICAL ANALYSIS (60 Points) ---
    score_ta = 0
    ta_notes = []
    
    if df is not None and not df.empty:
        # Pre-calc Indicators
        close = df['Close']
        high = df['High']
        low = df['Low']
        
        # MACD (12, 26, 9)
        exp12 = close.ewm(span=12, adjust=False).mean()
        exp26 = close.ewm(span=26, adjust=False).mean()
        macd = exp12 - exp26
        signal = macd.ewm(span=9, adjust=False).mean()
        hist = macd - signal
        
        # Ichimoku Cloud (9, 26, 52)
        nine_high = high.rolling(window=9).max()
        nine_low = low.rolling(window=9).min()
        tenkan_sen = (nine_high + nine_low) / 2
        
        twenty_six_high = high.rolling(window=26).max()
        twenty_six_low = low.rolling(window=26).min()
        kijun_sen = (twenty_six_high + twenty_six_low) / 2
        
        # RSI (14)
        delta = close.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        current_rsi = rsi.iloc[-1]
        
        current_price = close.iloc[-1]
        
        # 1. Trend - Ichimoku (15 pts)
        if current_price > kijun_sen.iloc[-1]:
            score_ta += 5
            if tenkan_sen.iloc[-1] > kijun_sen.iloc[-1]:
                score_ta += 10
                ta_notes.append("Xu hướng tăng mạnh")
            else:
                ta_notes.append("Trên đường xu hướng")
                
        # 2. Momentum - MACD (15 pts)
        if macd.iloc[-1] > signal.iloc[-1] and hist.iloc[-1] > 0:
            score_ta += 15
            ta_notes.append("Động lực MUA đang tăng")
        elif hist.iloc[-1] > hist.iloc[-2] and macd.iloc[-1] > 0: # Losing momentum but still positive
            score_ta += 10
            ta_notes.append("Động lực tích cực")
            
        # 3. RSI Divergence / Structure (15 pts)
        if 45 <= current_rsi <= 65:
            score_ta += 15
            ta_notes.append("Vùng tích lũy tốt")
        elif current_rsi < 30:
            score_ta += 15
            ta_notes.append("Quá bán - Cơ hội đảo chiều")
            
        # 4. Volume Spread Analysis (VSA) (15 pts)
        avg_vol_20 = df['Volume'].iloc[-21:-1].mean()
        current_vol = df['Volume'].iloc[-1]
        spread = abs(close.iloc[-1] - df['Open'].iloc[-1])
        avg_spread = abs(close - df['Open']).rolling(20).mean().iloc[-1]
        
        if avg_vol_20 > 0:
            if current_vol > 1.3 * avg_vol_20 and spread > 1.2 * avg_spread and close.iloc[-1] > df['Open'].iloc[-1]:
                score_ta += 15
                ta_notes.append("Dòng tiền lớn đang vào")
            elif current_vol > 1.3 * avg_vol_20:
                score_ta += 10
                ta_notes.append("Khối lượng đột biến")
    else:
        ta_notes.append("(Không có dữ liệu giá)")

    # --- FINAL SCORE & RECOMMENDATION ---
    total_score = score_fa + score_ta
    
    # Recommendation Logic
    recommendation = "CHỜ"
    if total_score >= 80:
        recommendation = "MUA MẠNH"
    elif total_score >= 60:
        recommendation = "THEO DÕI"
        
    return {
        "symbol": symbol,
        "score_fa": score_fa,
        "score_ta": score_ta,
        "total_score": total_score,
        "pe": pe if pe else 0,
        "roe": roe if 'roe' in locals() else 0,
        "recommendation": recommendation,
        "notes_fa": ", ".join(fa_notes),
        "notes_ta": ", ".join(ta_notes),
        "fa_detail": {
            "valuation": {"score": 10 if (pe and sector_median_pe and pe < 0.9*sector_median_pe) else 0, "max": 10, "desc": "P/E thấp hơn trung vị ngành"},
            "growth": {"score": 10 if "Tăng trưởng" in ', '.join(fa_notes) else 0, "max": 10, "desc": "Lợi nhuận và doanh thu tăng >15%"},
            "margin": {"score": 10 if "Biên lợi nhuận" in ', '.join(fa_notes) else 0, "max": 10, "desc": "Biên lợi nhuận gộp cải thiện"},
            "health": {"score": 10 if "Tài chính lành mạnh" in ', '.join(fa_notes) else 0, "max": 10, "desc": "Nợ/Vốn CSH < 0.8"}
        },
        "ta_detail": {
            "trend": {"score": 15 if "Xu hướng tăng" in ', '.join(ta_notes) else (5 if "Trên đường" in ', '.join(ta_notes) else 0), "max": 15, "desc": "Giá trên đường Ichimoku"},
            "momentum": {"score": 15 if "Động lực MUA" in ', '.join(ta_notes) else (10 if "Động lực tích cực" in ', '.join(ta_notes) else 0), "max": 15, "desc": "MACD dương và tăng"},
            "rsi": {"score": 15 if "tích lũy" in ', '.join(ta_notes) or "đảo chiều" in ', '.join(ta_notes) else 0, "max": 15, "desc": "RSI trong vùng 45-65 hoặc <30"},
            "volume": {"score": 15 if "Dòng tiền" in ', '.join(ta_notes) else (10 if "đột biến" in ', '.join(ta_notes) else 0), "max": 15, "desc": "Khối lượng cao + Nến tăng"}
        },
        "df": df # Return DF for charting
    }

def generate_chart(symbol, df, pattern_found):
    """Generate simple chart using matplotlib"""
    try:
        import matplotlib
        matplotlib.use('Agg') # Use non-interactive backend
        import matplotlib.pyplot as plt
        
        # Setup paths
        current_dir = os.path.dirname(os.path.abspath(__file__))
        static_charts_dir = os.path.join(current_dir, "static", "charts")
        os.makedirs(static_charts_dir, exist_ok=True)
        
        plt.figure(figsize=(10, 5))
        plt.plot(df['Date'], df['Close'], label='Close Price')
        if 'SMA_50' in df.columns: plt.plot(df['Date'], df['SMA_50'], label='SMA 50', linestyle='--')
        plt.title(f"{symbol} - {pattern_found}")
        plt.legend()
        plt.grid(True, alpha=0.3)
        
        filename = f"{symbol}_{int(time.time())}.png"
        filepath = os.path.join(static_charts_dir, filename)
        plt.savefig(filepath)
        plt.close()
        return filename
    except Exception as e:
        print(f"Chart generation failed for {symbol}: {e}")
        return None

def process_single_stock(symbol, companies_df):
    """Wrapper function for processing a single stock in a thread"""
    try:
        # Reduced delay for caching/speed balance
        time.sleep(random.uniform(0.05, 0.2)) # Faster scan
        return calculate_stock_score(symbol, companies_df)
    except Exception as e:
        print(f"❌ Error processing {symbol}: {e}")
        return None

# List of VN100 (Sample for now)
VN100_TICKERS = [
    'ACB', 'BCM', 'BID', 'BVH', 'CTG', 'FPT', 'GAS', 'GVR', 'HDB', 'HPG',
    'MBB', 'MSN', 'MWG', 'PLX', 'POW', 'SAB', 'SHB', 'SSB', 'SSI', 'STB',
    'TCB', 'TPB', 'VCB', 'VHM', 'VIB', 'VIC', 'VJC', 'VNM', 'VPB', 'VRE',
    'ACG', 'APH', 'ASM', 'BCG', 'BMP', 'BWE', 'CMG', 'CTD', 'DBC', 'DCM',
    'DIG', 'DGC', 'DGW', 'DHC', 'DXG', 'EIB', 'FTS', 'GEX', 'GMD', 'HAG',
    'HAH', 'HCM', 'HDC', 'HDG', 'HHS', 'HPX', 'HSG', 'HT1', 'IJC', 'KBC',
    'KDC', 'KDH', 'KOS', 'LPB', 'MSB', 'NKG', 'NLG', 'NVL', 'OCB', 'ORS',
    'PAN', 'PC1', 'PDR', 'PHR', 'PNJ', 'PVD', 'PVT', 'REE', 'SBT', 'SCS',
    'SHI', 'SJS', 'SZC', 'TCH', 'TDM', 'THG', 'TIG', 'TLG', 'TMS', 'TNH',
    'VCI', 'VGC', 'VHC', 'VIX', 'VND', 'VOS', 'VPI', 'VSC', 'VSH' 
]

def run_screener(limit=20, page=1):
    """Run the screener and return results as a list of dictionaries with pagination"""
    print(f"🚀 Master Stock Screener Initialized (Page {page}, Limit {limit})...")
    
    candidates = []
    try:
        companies = listing_companies() # Always fetch full list for sector info
    except:
        companies = pd.DataFrame(VN100_TICKERS, columns=['ticker']) # Minimal fallback
        
    try:
        # Paging logic for VN100
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        
        if limit <= 50: # Assuming paging if limit is small
            print(f"🔥 Mode: Hot Stocks (Page {page})")
            # Ensure we don't go out of bounds
            candidates = VN100_TICKERS[start_idx:end_idx]
            if not candidates: # Wrap around or empty
                candidates = VN100_TICKERS[:limit]
        else:
            # Legacy or Bulk mode
            companies = listing_companies()
            candidates = VN100_TICKERS[:limit]
    except:
        candidates = VN100_TICKERS[:limit]
        companies = pd.DataFrame(candidates, columns=['ticker']) # Minimal DF
        
    results = []
    print(f"🔍 Analyzing {len(candidates)} candidates using multi-threading (Max 6 workers)...")
    
    # Use ThreadPoolExecutor for concurrent fetching
    # OPTIMIZED: Increased workers, relying on random sleep to handle burst
    MAX_WORKERS = 6
    
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        future_to_symbol = {executor.submit(process_single_stock, symbol, companies): symbol for symbol in candidates}
        
        for i, future in enumerate(as_completed(future_to_symbol)):
            symbol = future_to_symbol[future]
            try:
                score_data = future.result()
                
                if score_data:
                    # Chart if Score > 60 OR if Pattern found
                    should_chart = score_data['total_score'] >= 60
                    
                    chart_url = None
                    pattern_label = score_data['recommendation']
                    
                    if should_chart:
                        if "Wyckoff" in score_data['notes_ta']: pattern_label = "Wyckoff Spring"
                        elif "Ichimoku" in score_data['notes_ta']: pattern_label = "Cloud Breakout"
                        elif "MACD" in score_data['notes_ta']: pattern_label = "MACD Momentum"
                        
                        chart_url = generate_chart(symbol, score_data['df'], pattern_label)
                        chart_url = f"/static/charts/{chart_url}" if chart_url else None
                    
                    result_item = {
                        "symbol": score_data['symbol'],
                        "pattern": pattern_label,
                        "signal": score_data['recommendation'],
                        "pe": score_data['pe'],
                        "roe": score_data['roe'],
                        "total_score": score_data['total_score'],
                        "score_fa": score_data['score_fa'],
                        "score_ta": score_data['score_ta'],
                        "cfo_vs_ni": f"Total: {score_data['total_score']}/100",
                        "ai_reasoning": f"{score_data['notes_fa']}. {score_data['notes_ta']}".strip('. '),
                        "fa_detail": score_data.get('fa_detail', {}),
                        "ta_detail": score_data.get('ta_detail', {}),
                        "support_level": 0,
                        "chart_url": chart_url
                    }
                    results.append(result_item)
                else:
                    # FAILSAFE
                    results.append({
                        "symbol": symbol, "pattern": "-", "signal": "No Data", "pe": 0, "roe": 0, "total_score": 0,
                        "score_fa": 0, "score_ta": 0, "cfo_vs_ni": "-", "ai_reasoning": "Data Unavailable", "support_level": 0, "chart_url": None
                    })
                    
            except Exception as e:
                print(f"Loop Error {symbol}: {e}")
                results.append({
                    "symbol": symbol, "pattern": "-", "signal": "Error", "pe": 0, "roe": 0, "total_score": 0,
                    "score_fa": 0, "score_ta": 0, "cfo_vs_ni": "-", "ai_reasoning": "System Error", "support_level": 0, "chart_url": None
                })
                continue
            
    # Sort by Score Descending
    results.sort(key=lambda x: x['total_score'], reverse=True)
    return results

if __name__ == "__main__":
    top_picks = run_screener(limit=10)
    print(f"\n🏆 FINAL RESULTS ({len(top_picks)} stocks):")
    for pick in top_picks:
        print(f"{pick['symbol']}: {pick['signal']} (Score: {pick['total_score']})")
