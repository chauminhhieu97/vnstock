import os
import tempfile
import pandas as pd
import numpy as np
import mplfinance as mpf
import matplotlib
# Force Agg backend for headless/thread-safe plotting
matplotlib.use('Agg')

from datetime import datetime, timedelta
import warnings

# --- 1. DATA SOURCES & CONFIGURATION ---
try:
    from vnstock import stock_historical_data, listing_companies, financial_ratio, financial_flow
    VNSTOCK_AVAILABLE = True
except ImportError:
    VNSTOCK_AVAILABLE = False
    print("❌ CRITICAL: vnstock library not found. Install it via `pip install vnstock`")

warnings.filterwarnings('ignore')

# Configuration
LOOKBACK_DAYS = 365  # 1 Year for TA
MIN_VOLUME_AVG = 50000  # Minimum liquidity requirement

# --- 2. DATA FETCHING (STRICT ZERO FABRICATION) ---

def fetch_safe_data(func, *args, **kwargs):
    """Wrapper to safely fetch data from API and handle errors."""
    if not VNSTOCK_AVAILABLE:
        return None
    try:
        return func(*args, **kwargs)
    except Exception as e:
        # print(f"API Error ({func.__name__}): {e}")
        return None

def get_sector_median_pe(sector_name, all_tickers_df):
    """
    Calculate the median P/E of a specific sector dynamically.
    Args:
        sector_name: Name of the industry sector.
        all_tickers_df: DataFrame containing ticker and sector info.
    Returns:
        float: Median P/E of the sector, or None if insufficient data.
    """
    if not VNSTOCK_AVAILABLE or all_tickers_df.empty:
        return None
        
    # Get all tickers in the same sector
    sector_tickers = all_tickers_df[all_tickers_df['organName'] == sector_name]['ticker'].tolist()
    
    if len(sector_tickers) < 3: # Need at least 3 peers for a meaningful median
        return None
        
    pe_values = []
    # For performance, we might limit this to a sample if the sector is huge, 
    # but for accuracy we try to get as many as possible.
    # To avoid API rate limits, we'll take a random sample of up to 10 peers + the target
    sample_size = min(len(sector_tickers), 10)
    import random
    sampled_tickers = random.sample(sector_tickers, sample_size)
    
    for t in sampled_tickers:
        try:
            ratio = fetch_safe_data(financial_ratio, t, report_range='yearly', is_all=True)
            if ratio is not None and not ratio.empty:
                pe = ratio.iloc[0].get('priceToEarning', ratio.iloc[0].get('pe'))
                if pe and pe > 0: # Filter out negative or zero P/E
                    pe_values.append(pe)
        except:
            continue
            
    if not pe_values:
        return None
        
    return np.median(pe_values)

def fetch_full_financials(symbol):
    """Fetch all necessary financial statements for scoring."""
    ratio = fetch_safe_data(financial_ratio, symbol, report_range='yearly', is_all=True)
    cashflow = fetch_safe_data(financial_flow, symbol, report_type='cashflow', report_range='yearly')
    income = fetch_safe_data(financial_flow, symbol, report_type='incomestatement', report_range='yearly')
    
    if any(x is None or x.empty for x in [ratio, cashflow, income]):
        return None
        
    return {
        'ratio': ratio.iloc[0],
        'cashflow': cashflow, # Need history for 2-year check
        'income': income.iloc[0]
    }

def fetch_market_data(symbol):
    """Fetch OHLCV data for Technical Analysis."""
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=LOOKBACK_DAYS)).strftime('%Y-%m-%d')
    
    df = fetch_safe_data(stock_historical_data, symbol, start_date, end_date, "1D", "stock")
    if df is None or df.empty or len(df) < 50:
        return None
        
    df['time'] = pd.to_datetime(df['time'])
    df = df.set_index('time')
    df = df.rename(columns={
        'open': 'Open', 'high': 'High', 'low': 'Low', 
        'close': 'Close', 'volume': 'Volume'
    })
    return df

# --- 3. SCORING LOGIC (THE ALGORITHM) ---

def calculate_stock_score(symbol, sector_info_df):
    """
    Calculate the 100-point score for a stock.
    Returns: Dict containing score breakdown and recommendation.
    """
    # 1. Fetch Data
    fin = fetch_full_financials(symbol)
    df = fetch_market_data(symbol)
    
    if not fin or df is None:
        return None
        
    # --- PART A: FUNDAMENTAL ANALYSIS (40 Points) ---
    score_fa = 0
    fa_notes = []
    
    # 1. Valuation (10 pts)
    # Get Sector Median P/E
    ticker_info = sector_info_df[sector_info_df['ticker'] == symbol]
    if not ticker_info.empty:
        sector_name = ticker_info.iloc[0]['organName']
        sector_median_pe = get_sector_median_pe(sector_name, sector_info_df)
    else:
        sector_median_pe = None
        
    pe = fin['ratio'].get('priceToEarning', fin['ratio'].get('pe'))
    
    if pe and sector_median_pe and pe < (0.8 * sector_median_pe):
        score_fa += 10
        fa_notes.append("Undervalued")
        
    # 2. Efficiency (10 pts)
    roe = fin['ratio'].get('roe', 0)
    if roe and roe >= 0.15:
        score_fa += 10
        fa_notes.append("High ROE")
        
    # 3. Cash Flow Quality (15 pts)
    # Check 1: CFO > Net Income (Real money vs Paper money)
    cfo = fin['cashflow'].iloc[0].get('fromOper', 0) if not fin['cashflow'].empty else 0
    net_income = fin['income'].get('postTaxProfit', 0)
    
    # Check 2: Positive CFO last 2 years
    cfo_history = fin['cashflow']['fromOper'].head(2) if 'fromOper' in fin['cashflow'].columns else []
    cfo_positive_2y = len(cfo_history) >= 2 and all(c > 0 for c in cfo_history)
    
    if cfo > net_income:
        score_fa += 10
        fa_notes.append("Quality Earnings")
        
    if cfo_positive_2y:
        score_fa += 5
        fa_notes.append("Stable Cashflow")
        
    # 4. Financial Health (5 pts)
    debt = fin['ratio'].get('debtOnEquity', fin['ratio'].get('debtToEquity', 100))
    if debt <= 1.0:
        score_fa += 5
        fa_notes.append("Low Debt")
        
    # --- PART B: TECHNICAL ANALYSIS (60 Points) ---
    score_ta = 0
    ta_notes = []
    
    # Pre-calc Indicators
    df['SMA_50'] = df['Close'].rolling(window=50).mean()
    df['EMA_200'] = df['Close'].ewm(span=200, adjust=False).mean()
    current_price = df['Close'].iloc[-1]
    
    # 1. Trend Filter (10 pts)
    if current_price > df['EMA_200'].iloc[-1]: # Using EMA 200 for broader trend as per typical Wyckoff
        score_ta += 5
        ta_notes.append("Uptrend (EMA200)")
        
    if current_price > df['SMA_50'].iloc[-1]:
        score_ta += 5
        ta_notes.append("Uptrend (SMA50)")

    # 2. Wyckoff Structure - Spring (20 pts)
    # Logic: Lowest Low of last 40 days < Recent Support, but Close > Support
    window = df.iloc[-40:-2]
    if not window.empty:
        support_level = window['Low'].min()
        recent_low = df['Low'].iloc[-1]
        recent_close = df['Close'].iloc[-1]
        
        if recent_low < support_level and recent_close > support_level:
            score_ta += 20
            ta_notes.append("Wyckoff Spring")
            
    # 3. ICT Order Block (15 pts)
    # Simplified detection: Bullish engulfing near SMA 50 pullback
    # Check pullback first: 3 red candles in last 5
    is_pullback = (df['Close'].iloc[-5:] < df['Open'].iloc[-5:]).sum() >= 3
    near_support = abs(current_price - df['SMA_50'].iloc[-1]) / df['SMA_50'].iloc[-1] < 0.03
    
    if is_pullback and near_support:
        score_ta += 15
        ta_notes.append("ICT Order Block Retest")
        
    # 4. Smart Money Volume (15 pts)
    avg_vol_20 = df['Volume'].iloc[-21:-1].mean()
    current_vol = df['Volume'].iloc[-1]
    
    if current_vol > 1.2 * avg_vol_20:
        score_ta += 15
        ta_notes.append("Volume Spike")
        
    # --- FINAL SCORE & RECOMMENDATION ---
    total_score = score_fa + score_ta
    
    if total_score >= 80:
        recommendation = "STRONG BUY"
    elif total_score >= 60:
        recommendation = "WATCH / ACCUMULATE"
    else:
        recommendation = "WAIT"
        
    return {
        "symbol": symbol,
        "score_fa": score_fa,
        "score_ta": score_ta,
        "total_score": total_score,
        "pe": pe,
        "roe": roe,
        "recommendation": recommendation,
        "notes_fa": ", ".join(fa_notes),
        "notes_ta": ", ".join(ta_notes),
        "df": df # Return DF for charting
    }

# --- 4. CHART GENERATION ---

def generate_chart(symbol, df, pattern_name):
    """Generate chart for high-scoring stocks"""
    try:
        plot_df = df.iloc[-100:]
        apds = [
            mpf.make_addplot(plot_df['SMA_50'], color='blue', panel=0, width=1.5),
            mpf.make_addplot(plot_df['EMA_200'], color='red', panel=0, width=1.5),
        ]
        
        chart_dir = os.path.join(os.path.dirname(__file__), 'static', 'charts')
        os.makedirs(chart_dir, exist_ok=True)
        
        filename = f"{symbol}_{pattern_name.replace(' ', '_').replace('/', '_')}.png"
        filepath = os.path.join(chart_dir, filename)
        
        mpf.plot(
            plot_df,
            type='candle',
            style='yahoo',
            addplot=apds,
            title=f"{symbol} - {pattern_name}",
            volume=True,
            savefig=dict(fname=filepath, dpi=100, bbox_inches='tight')
        )
        return filename
    except Exception as e:
        print(f"Chart Error {symbol}: {e}")
        return None

# --- 5. MAIN EXECUTION ---

def run_screener(limit=20):
    print(f"🚀 Master Stock Screener Initialized (Limit {limit})...")
    
    # 1. Fetch Universe
    try:
        # Get all listing companies with sector info
        companies = listing_companies()
        if companies is None or companies.empty:
            print("❌ Failed to fetch company list.")
            return []
            
        # Filter for HOSE/HNX
        companies = companies[companies['comGroupCode'].isin(['HOSE', 'HNX'])]
        all_tickers = companies['ticker'].tolist()
        
        # Shuffle to avoid always checking banks first (if sorted)
        import random
        random.shuffle(all_tickers)
        candidates = all_tickers[:limit] # Restrict for performance
        
    except Exception as e:
        print(f"❌ Error initializing screener: {e}")
        return []
        
    results = []
    print(f"🔍 Analyzing {len(candidates)} candidates...")
    
    for symbol in candidates:
        try:
            score_data = calculate_stock_score(symbol, companies)
            
            if score_data and score_data['total_score'] >= 60:
                # Generate Chart for Good Candidates
                pattern_label = score_data['recommendation']
                if "Wyckoff" in score_data['notes_ta']: pattern_label = "Wyckoff Spring"
                elif "ICT" in score_data['notes_ta']: pattern_label = "ICT Setup"
                
                chart_url = generate_chart(symbol, score_data['df'], pattern_label)
                
                # Format for Frontend
                result_item = {
                    "symbol": score_data['symbol'],
                    "pattern": pattern_label,
                    "signal": score_data['recommendation'],
                    "pe": score_data['pe'],
                    "roe": score_data['roe'],
                    "total_score": score_data['total_score'],
                    "cfo_vs_ni": f"Score: {score_data['score_fa']}/40 FA",
                    "support_level": 0, # Placeholder
                    "chart_url": f"/static/charts/{chart_url}" if chart_url else None
                }
                results.append(result_item)
                print(f"✅ FOUND: {symbol} - Score: {score_data['total_score']} ({score_data['recommendation']})")
                
        except Exception as e:
            # print(f"Skipping {symbol}: {e}")
            continue
            
    # Sort by Score Descending
    results.sort(key=lambda x: x['total_score'], reverse=True)
    return results

if __name__ == "__main__":
    top_picks = run_screener(limit=30)
    print("\n🏆 FINAL RESULTS:")
    for pick in top_picks:
        print(f"{pick['symbol']}: {pick['signal']} (Score: {pick['total_score']})")
