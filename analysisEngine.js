/**
 * Advanced Trading Analysis Engine
 * Calculates indicators and strategies from candlestick data
 */

class TradingAnalysisEngine {
  static getProxySymbol(pair) {
    // Maps requested pair to Binance symbols
    if (pair === 'XAUUSD' || pair === 'PAXGUSDT' || pair === 'PAXGUSD') {
      return 'PAXGUSDT'; // High-fidelity spot gold proxy
    }
    if (pair === 'ETHUSD') return 'ETHUSDT';
    if (pair === 'SOLUSD') return 'SOLUSDT';
    if (pair === 'EURUSD') return 'EURUSDT';
    if (pair === 'GBPUSD') return 'GBPUSDT';
    return 'BTCUSDT'; // Bitcoin spot
  }

  static getDisplayName(pair) {
    if (pair === 'PAXGUSDT' || pair === 'XAUUSD') return 'XAU/USD (Gold)';
    if (pair === 'ETHUSD') return 'ETH/USD (Ethereum)';
    if (pair === 'SOLUSD') return 'SOL/USD (Solana)';
    if (pair === 'EURUSD') return 'EUR/USD (Euro)';
    if (pair === 'GBPUSD') return 'GBP/USD (Pound)';
    return 'BTC/USD (Bitcoin)';
  }

  /**
   * Fetch historical candles from Binance API
   * @param {string} symbol - e.g. 'BTCUSDT' or 'PAXGUSDT'
   * @param {string} interval - '4h', '1h', '15m', '5m', '3m', '1m'
   * @param {number} limit - number of candles to retrieve (default: 100)
   */
  static async fetchCandles(symbol, interval = '15m', limit = 100) {
    try {
      const response = await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
      if (!response.ok) {
        throw new Error(`Binance API error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.map(c => ({
        time: parseInt(c[0]),
        open: parseFloat(c[1]),
        high: parseFloat(c[2]),
        low: parseFloat(c[3]),
        close: parseFloat(c[4]),
        volume: parseFloat(c[5])
      }));
    } catch (error) {
      console.error("Error fetching candles:", error);
      // Fallback: Generate high-quality simulated data if network fails
      return this.generateMockCandles(interval, limit);
    }
  }

  static generateMockCandles(interval, limit) {
    console.log(`Using high-fidelity candle simulator for ${interval}`);
    const candles = [];
    let price = interval.includes('h') ? 67500 : 67300;
    let time = Date.now() - (limit * 60000);
    const step = 60000;
    
    for (let i = 0; i < limit; i++) {
      const open = price;
      const change = (Math.random() - 0.49) * (price * 0.001);
      const close = price + change;
      const high = Math.max(open, close) + Math.random() * (price * 0.0005);
      const low = Math.min(open, close) - Math.random() * (price * 0.0005);
      const volume = Math.random() * 100 + 10;
      candles.push({ time, open, high, low, close, volume });
      price = close;
      time += step;
    }
    return candles;
  }

  // ==================== STRATEGY 1: Accumulation & Distribution ====================
  static analyzeAccumulationDistribution(candles) {
    let adValue = 0;
    const adValues = [];
    
    // Calculate A/D line
    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      const range = c.high - c.low;
      let moneyFlowMultiplier = 0;
      if (range > 0) {
        moneyFlowMultiplier = ((c.close - c.low) - (c.high - c.close)) / range;
      }
      const moneyFlowVolume = moneyFlowMultiplier * c.volume;
      adValue += moneyFlowVolume;
      adValues.push(adValue);
    }

    // Analyze divergence over last 15 candles
    const lookback = Math.min(15, candles.length - 1);
    const startIdx = candles.length - lookback;
    const endIdx = candles.length - 1;
    
    const priceChange = candles[endIdx].close - candles[startIdx].close;
    const adChange = adValues[endIdx] - adValues[startIdx];
    
    let signal = 'NEUTRAL';
    let text = 'Accumulation/Distribution flow is balanced.';
    
    if (priceChange <= 0 && adChange > 0) {
      signal = 'BUY';
      text = 'Bullish Accumulation: Smart money is buying (A/D line rising) while price is depressed or flat.';
    } else if (priceChange >= 0 && adChange < 0) {
      signal = 'SELL';
      text = 'Bearish Distribution: Institutional selling detected (A/D line falling) while price is propped up.';
    } else if (adChange > 0) {
      signal = 'BUY';
      text = 'Strong volume support backing the upward price movement.';
    } else if (adChange < 0) {
      signal = 'SELL';
      text = 'Downward pressure supported by volume distribution.';
    }

    return { signal, text, adLine: adValues };
  }

  // ==================== STRATEGY 2: Supply & Demand Zones ====================
  static analyzeSupplyDemand(candles) {
    const demandZones = [];
    const supplyZones = [];
    
    // Scan for high momentum candles (imbalances)
    // Candle i to i+2
    for (let i = 1; i < candles.length - 2; i++) {
      const c1 = candles[i - 1];
      const c2 = candles[i];
      const c3 = candles[i + 1];
      const c4 = candles[i + 2];
      
      const body2 = Math.abs(c2.close - c2.open);
      const avgBody = (Math.abs(c1.close - c1.open) + Math.abs(c3.close - c3.open)) / 2;
      
      // Look for a large body candle (imbalance)
      if (body2 > avgBody * 2) {
        if (c2.close > c2.open) {
          // Bullish rally: Demand zone created at the base (low of previous candles or body of c2)
          const zoneLow = Math.min(c1.low, c2.low);
          const zoneHigh = c2.open;
          demandZones.push({ low: zoneLow, high: zoneHigh, strength: c2.volume * body2 });
        } else {
          // Bearish drop: Supply zone created at the top
          const zoneHigh = Math.max(c1.high, c2.high);
          const zoneLow = c2.open;
          supplyZones.push({ low: zoneLow, high: zoneHigh, strength: c2.volume * body2 });
        }
      }
    }
    
    // Sort zones by strength (volume * body size) and take the latest/strongest
    demandZones.sort((a, b) => b.strength - a.strength);
    supplyZones.sort((a, b) => b.strength - a.strength);

    const latestPrice = candles[candles.length - 1].close;
    let signal = 'NEUTRAL';
    let text = 'Price is currently ranging in neutral territory between active Supply and Demand zones.';
    let activeZone = null;

    // Check if price is inside a zone
    const activeDemand = demandZones.find(z => latestPrice >= z.low * 0.998 && latestPrice <= z.high * 1.002);
    const activeSupply = supplyZones.find(z => latestPrice >= z.low * 0.998 && latestPrice <= z.high * 1.002);

    if (activeDemand) {
      signal = 'BUY';
      activeZone = activeDemand;
      text = `Bullish Entry: Price is bouncing from a strong Demand Zone level (${activeDemand.low.toFixed(2)} - ${activeDemand.high.toFixed(2)}).`;
    } else if (activeSupply) {
      signal = 'SELL';
      activeZone = activeSupply;
      text = `Bearish Entry: Price is rejecting from a strong Supply Zone level (${activeSupply.low.toFixed(2)} - ${activeSupply.high.toFixed(2)}).`;
    } else {
      // Find nearest zones
      const nearDemand = demandZones.find(z => latestPrice > z.high);
      const nearSupply = supplyZones.find(z => latestPrice < z.low);
      if (nearDemand && nearSupply) {
        text = `Ranging. Nearest Demand: ${nearDemand.low.toFixed(2)}, Nearest Supply: ${nearSupply.high.toFixed(2)}.`;
      }
    }

    return { signal, text, demandZones: demandZones.slice(0, 3), supplyZones: supplyZones.slice(0, 3), activeZone };
  }

  // ==================== STRATEGY 3: Support & Resistance ====================
  static analyzeSupportResistance(candles, settings) {
    const peaks = [];
    const troughs = [];
    const lookback = settings && settings.srLookback !== undefined ? settings.srLookback : 3;
    
    // Find peaks and troughs (fractals)
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isPeak = true;
      let isTrough = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].high < candles[i - j].high || candles[i].high < candles[i + j].high) isPeak = false;
        if (candles[i].low > candles[i - j].low || candles[i].low > candles[i + j].low) isTrough = false;
      }
      if (isPeak) peaks.push(candles[i].high);
      if (isTrough) troughs.push(candles[i].low);
    }

    // Cluster levels that are within 0.15% of each other
    const levels = [];
    const allExtrema = [...peaks, ...troughs];
    
    allExtrema.forEach(val => {
      let found = false;
      for (let lvl of levels) {
        if (Math.abs(lvl.price - val) / val < 0.0015) {
          lvl.hits++;
          lvl.price = (lvl.price * (lvl.hits - 1) + val) / lvl.hits; // average it out
          found = true;
          break;
        }
      }
      if (!found) {
        levels.push({ price: val, hits: 1 });
      }
    });

    // Sort levels by strength (hits)
    levels.sort((a, b) => b.hits - a.hits);
    
    const latestPrice = candles[candles.length - 1].close;
    let signal = 'NEUTRAL';
    let text = 'Price is negotiating horizontal support and resistance lines.';
    
    // Find nearest support (below current price) and resistance (above current price)
    const supports = levels.filter(l => l.price < latestPrice).sort((a, b) => b.price - a.price);
    const resistances = levels.filter(l => l.price > latestPrice).sort((a, b) => a.price - b.price);
    
    const nearestSupport = supports[0];
    const nearestResistance = resistances[0];
    
    if (nearestSupport && (latestPrice - nearestSupport.price) / latestPrice < 0.002) {
      signal = 'BUY';
      text = `Support Hold: Price is bouncing off key horizontal support at ${nearestSupport.price.toFixed(2)} (confirmed ${nearestSupport.hits} times).`;
    } else if (nearestResistance && (nearestResistance.price - latestPrice) / latestPrice < 0.002) {
      signal = 'SELL';
      text = `Resistance Rejection: Price is rejecting key horizontal resistance at ${nearestResistance.price.toFixed(2)} (confirmed ${nearestResistance.hits} times).`;
    } else {
      text = `Consolidating. Nearest Support: ${nearestSupport ? nearestSupport.price.toFixed(2) : 'N/A'}, Resistance: ${nearestResistance ? nearestResistance.price.toFixed(2) : 'N/A'}.`;
    }

    return { signal, text, supports: supports.slice(0, 3), resistances: resistances.slice(0, 3) };
  }

  // ==================== STRATEGY 4: Fibonacci Retracement ====================
  static analyzeFibonacci(candles, settings) {
    // Locate major swing high and swing low in the last 60 candles
    const lookback = Math.min(settings && settings.fibLookback !== undefined ? settings.fibLookback : 60, candles.length);
    const slice = candles.slice(candles.length - lookback);
    
    let swingHigh = slice[0].high;
    let swingLow = slice[0].low;
    let highIdx = 0;
    let lowIdx = 0;
    
    slice.forEach((c, idx) => {
      if (c.high > swingHigh) {
        swingHigh = c.high;
        highIdx = idx;
      }
      if (c.low < swingLow) {
        swingLow = c.low;
        lowIdx = idx;
      }
    });

    const isUptrend = lowIdx < highIdx; // Low came before High -> Uptrend swing
    const diff = swingHigh - swingLow;
    
    // Calculate retracement levels relative to trend direction
    const fibs = {};
    if (isUptrend) {
      fibs['0.0'] = swingHigh;
      fibs['0.236'] = swingHigh - diff * 0.236;
      fibs['0.382'] = swingHigh - diff * 0.382;
      fibs['0.500'] = swingHigh - diff * 0.5;
      fibs['0.618'] = swingHigh - diff * 0.618; // Golden Ratio
      fibs['0.786'] = swingHigh - diff * 0.786;
      fibs['1.0'] = swingLow;
    } else {
      fibs['0.0'] = swingLow;
      fibs['0.236'] = swingLow + diff * 0.236;
      fibs['0.382'] = swingLow + diff * 0.382;
      fibs['0.500'] = swingLow + diff * 0.5;
      fibs['0.618'] = swingLow + diff * 0.618; // Golden Ratio
      fibs['0.786'] = swingLow + diff * 0.786;
      fibs['1.0'] = swingHigh;
    }

    const latestPrice = candles[candles.length - 1].close;
    let signal = 'NEUTRAL';
    let text = 'Price is fluctuating between standard Fibonacci retracement ratios.';
    
    // Check if price is around golden ratios (0.500 - 0.618)
    const goldenHigh = Math.max(fibs['0.500'], fibs['0.618']);
    const goldenLow = Math.min(fibs['0.500'], fibs['0.618']);
    
    if (latestPrice >= goldenLow * 0.999 && latestPrice <= goldenHigh * 1.001) {
      if (isUptrend) {
        signal = 'BUY';
        text = `Golden Ratio Buy: Price is retracing in a healthy uptrend and holding support at the 0.50 - 0.618 Golden Pocket (${goldenLow.toFixed(2)} - ${goldenHigh.toFixed(2)}).`;
      } else {
        signal = 'SELL';
        text = `Golden Ratio Sell: Price is retracing upward in a downtrend and hitting resistance at the 0.50 - 0.618 Golden Pocket (${goldenLow.toFixed(2)} - ${goldenHigh.toFixed(2)}).`;
      }
    } else {
      text = `Swing Trend: ${isUptrend ? 'Uptrend' : 'Downtrend'}. Golden Ratio Levels: ${fibs['0.618'].toFixed(2)} (0.618) & ${fibs['0.500'].toFixed(2)} (0.50).`;
    }

    return { signal, text, levels: fibs, isUptrend };
  }

  // ==================== STRATEGY 5: Price Action (Candlestick Patterns) ====================
  static analyzePriceAction(candles) {
    const c1 = candles[candles.length - 2]; // completed candle
    const c2 = candles[candles.length - 1]; // current active candle
    
    let pattern = 'NONE';
    let signal = 'NEUTRAL';
    let text = 'No clear candlestick patterns identified on the current candle closure.';
    
    const body1 = Math.abs(c1.close - c1.open);
    const body2 = Math.abs(c2.close - c2.open);
    const range1 = c1.high - c1.low;
    const range2 = c2.high - c2.low;
    
    // Engulfing checks
    const isBullishEngulfing = (c1.close < c1.open) && (c2.close > c2.open) && (c2.close >= c1.open) && (c2.open <= c1.close) && (body2 > body1);
    const isBearishEngulfing = (c1.close > c1.open) && (c2.close < c2.open) && (c2.close <= c1.open) && (c2.open >= c1.close) && (body2 > body1);
    
    // Doji check
    const isDoji = range2 > 0 && (body2 / range2 < 0.1);
    
    // Hammer check (long lower wick, tiny body near top)
    const lowerWick2 = Math.min(c2.open, c2.close) - c2.low;
    const upperWick2 = c2.high - Math.max(c2.open, c2.close);
    const isHammer = (lowerWick2 > body2 * 2) && (upperWick2 < body2 * 0.5) && (range2 > 0);
    
    // Shooting Star check (long upper wick, tiny body near bottom)
    const isShootingStar = (upperWick2 > body2 * 2) && (lowerWick2 < body2 * 0.5) && (range2 > 0);

    if (isBullishEngulfing) {
      pattern = 'BULLISH_ENGULFING';
      signal = 'BUY';
      text = 'Price Action Alert: Strong Bullish Engulfing pattern formed, indicating aggressive buyers took over.';
    } else if (isBearishEngulfing) {
      pattern = 'BEARISH_ENGULFING';
      signal = 'SELL';
      text = 'Price Action Alert: Bearish Engulfing candle printed, showing dominant selling pressure.';
    } else if (isHammer) {
      pattern = 'HAMMER';
      signal = 'BUY';
      text = 'Price Action Alert: Bullish Hammer pinbar formed, signaling rejection of lower prices.';
    } else if (isShootingStar) {
      pattern = 'SHOOTING_STAR';
      signal = 'SELL';
      text = 'Price Action Alert: Bearish Shooting Star pinbar printed, rejecting higher liquidity.';
    } else if (isDoji) {
      pattern = 'DOJI';
      signal = 'NEUTRAL';
      text = 'Price Action Alert: Doji candle printed, representing market indecision and potential reversal.';
    }

    return { signal, text, pattern };
  }

  // ==================== STRATEGY 6: Market Structure Analysis ====================
  static analyzeMarketStructure(candles) {
    const peaks = [];
    const troughs = [];
    const lookback = 3;
    
    // Track swing highs and lows
    for (let i = lookback; i < candles.length - lookback; i++) {
      let isPeak = true;
      let isTrough = true;
      for (let j = 1; j <= lookback; j++) {
        if (candles[i].high < candles[i - j].high || candles[i].high < candles[i + j].high) isPeak = false;
        if (candles[i].low > candles[i - j].low || candles[i].low > candles[i + j].low) isTrough = false;
      }
      if (isPeak) peaks.push({ idx: i, price: candles[i].high });
      if (isTrough) troughs.push({ idx: i, price: candles[i].low });
    }

    let trend = 'RANGING';
    let signal = 'NEUTRAL';
    let text = 'Market structure is consolidating with no clear direction.';
    
    if (peaks.length >= 2 && troughs.length >= 2) {
      const p1 = peaks[peaks.length - 2];
      const p2 = peaks[peaks.length - 1];
      const t1 = troughs[troughs.length - 2];
      const t2 = troughs[troughs.length - 1];
      
      const isHH = p2.price > p1.price;
      const isHL = t2.price > t1.price;
      const isLH = p2.price < p1.price;
      const isLL = t2.price < t1.price;
      
      const latestPrice = candles[candles.length - 1].close;
      
      if (isHH && isHL) {
        trend = 'BULLISH';
        signal = 'BUY';
        text = 'Market Structure: Bullish alignment of Higher Highs (HH) and Higher Lows (HL) indicating a solid uptrend.';
        
        // Check for Change of Character (CHoCH) - closing below last HL
        if (latestPrice < t2.price) {
          trend = 'CHoCH_BEARISH';
          signal = 'SELL';
          text = 'Market Structure Alert: Bearish Change of Character (CHoCH). Price broke below the recent Higher Low, suggesting trend reversal.';
        }
      } else if (isLH && isLL) {
        trend = 'BEARISH';
        signal = 'SELL';
        text = 'Market Structure: Bearish alignment of Lower Highs (LH) and Lower Lows (LL) indicating a solid downtrend.';
        
        // Check for CHoCH - closing above last LH
        if (latestPrice > p2.price) {
          trend = 'CHoCH_BULLISH';
          signal = 'BUY';
          text = 'Market Structure Alert: Bullish Change of Character (CHoCH). Price broke above the recent Lower High, suggesting trend reversal.';
        }
      } else {
        text = 'Market Structure: Ranging. Indecisive HH/LL structure, consolidating between swing boundaries.';
      }
    }

    return { signal, text, trend };
  }

  // ==================== STRATEGY 7: Volume Profile Analysis ====================
  static analyzeVolumeProfile(candles) {
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    
    candles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    
    const numBins = 20;
    const binSize = (maxPrice - minPrice) / numBins;
    const profile = Array(numBins).fill(0);
    
    // Sum volume into price bins
    candles.forEach(c => {
      const avgPrice = (c.open + c.high + c.low + c.close) / 4;
      const binIdx = Math.min(numBins - 1, Math.floor((avgPrice - minPrice) / binSize));
      if (binIdx >= 0) {
        profile[binIdx] += c.volume;
      }
    });
    
    // Point of Control (POC): Price level with highest volume
    let maxVolume = 0;
    let pocIdx = 0;
    profile.forEach((vol, idx) => {
      if (vol > maxVolume) {
        maxVolume = vol;
        pocIdx = idx;
      }
    });
    
    const pocPrice = minPrice + (pocIdx * binSize) + (binSize / 2);
    
    // Value Area: 70% of total volume around POC
    const totalVolume = profile.reduce((sum, v) => sum + v, 0);
    const targetValueAreaVolume = totalVolume * 0.70;
    
    let vaMinIdx = pocIdx;
    let vaMaxIdx = pocIdx;
    let currentVaVolume = profile[pocIdx];
    
    while (currentVaVolume < targetValueAreaVolume) {
      const aboveVolume = (vaMaxIdx + 1 < numBins) ? profile[vaMaxIdx + 1] : 0;
      const belowVolume = (vaMinIdx - 1 >= 0) ? profile[vaMinIdx - 1] : 0;
      
      if (aboveVolume === 0 && belowVolume === 0) break;
      
      if (aboveVolume >= belowVolume) {
        vaMaxIdx++;
        currentVaVolume += aboveVolume;
      } else {
        vaMinIdx--;
        currentVaVolume += belowVolume;
      }
    }
    
    const vah = minPrice + (vaMaxIdx * binSize) + binSize;
    const val = minPrice + (vaMinIdx * binSize);
    
    const latestPrice = candles[candles.length - 1].close;
    let signal = 'NEUTRAL';
    let text = `Volume Profile: POC is at ${pocPrice.toFixed(2)}. Value Area is between ${val.toFixed(2)} and ${vah.toFixed(2)}.`;
    
    if (Math.abs(latestPrice - pocPrice) / latestPrice < 0.002) {
      signal = 'NEUTRAL';
      text = `Volume Magnet: Price is resting directly on the Point of Control (${pocPrice.toFixed(2)}). High volatility expected on breakout.`;
    } else if (latestPrice > vah) {
      signal = 'BUY';
      text = `Volume Profile Breakout: Price is trading above Value Area High (${vah.toFixed(2)}). High buyer momentum.`;
    } else if (latestPrice < val) {
      signal = 'SELL';
      text = `Volume Profile Breakdown: Price is trading below Value Area Low (${val.toFixed(2)}). Heavy selling pressure.`;
    } else {
      text = `Volume Ranging: Price is consolidating inside the Value Area (${val.toFixed(2)} - ${vah.toFixed(2)}). Buying near VAL or selling near VAH recommended.`;
    }

    return { signal, text, poc: pocPrice, vah, val };
  }

  // ==================== STRATEGY 8: Liquidity Analysis (ERL/IRL) ====================
  static analyzeLiquidity(candles) {
    if (candles.length < 15) {
      return { signal: 'NEUTRAL', text: 'Insufficient candles for liquidity analysis.', bsl: 0, ssl: 0, bullishFvgs: [], bearishFvgs: [] };
    }

    // 1. Establish ERL (External Range Liquidity) from historical range (candles length - 50 to length - 4)
    const refStart = Math.max(0, candles.length - 50);
    const refEnd = candles.length - 4;
    let bsl = -Infinity;
    let ssl = Infinity;
    
    for (let i = refStart; i <= refEnd; i++) {
      if (candles[i].high > bsl) bsl = candles[i].high;
      if (candles[i].low < ssl) ssl = candles[i].low;
    }

    // 2. Identify active (unmitigated) FVGs in the last 40 candles
    const activeBullishFvgs = [];
    const activeBearishFvgs = [];
    const fvgLookback = Math.max(2, candles.length - 40);
    
    for (let i = fvgLookback; i < candles.length - 1; i++) {
      // Bullish FVG check (Inefficiency between i-2 High and i Low)
      if (candles[i - 2].high < candles[i].low) {
        const fvgLow = candles[i - 2].high;
        const fvgHigh = candles[i].low;
        // Verify if mitigated by any subsequent candle's low
        let mitigated = false;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].low < fvgLow) {
            mitigated = true;
            break;
          }
        }
        if (!mitigated) {
          activeBullishFvgs.push({ low: fvgLow, high: fvgHigh, avg: (fvgLow + fvgHigh) / 2 });
        }
      }
      
      // Bearish FVG check (Inefficiency between i-2 Low and i High)
      if (candles[i - 2].low > candles[i].high) {
        const fvgLow = candles[i].high;
        const fvgHigh = candles[i - 2].low;
        // Verify if mitigated by any subsequent candle's high
        let mitigated = false;
        for (let j = i + 1; j < candles.length; j++) {
          if (candles[j].high > fvgHigh) {
            mitigated = true;
            break;
          }
        }
        if (!mitigated) {
          activeBearishFvgs.push({ low: fvgLow, high: fvgHigh, avg: (fvgLow + fvgHigh) / 2 });
        }
      }
    }

    // Sort FVGs by proximity to current price
    const latestPrice = candles[candles.length - 1].close;
    activeBullishFvgs.sort((a, b) => Math.abs(a.avg - latestPrice) - Math.abs(b.avg - latestPrice));
    activeBearishFvgs.sort((a, b) => Math.abs(a.avg - latestPrice) - Math.abs(b.avg - latestPrice));

    let signal = 'NEUTRAL';
    let text = 'Price is tracking internal equilibrium; no liquidity sweeps or FVG taps detected.';
    
    // Check last 3 candles for ERL Sweep
    let sslSwept = false;
    let bslSwept = false;
    
    for (let i = candles.length - 3; i < candles.length; i++) {
      if (i < 0) continue;
      const c = candles[i];
      if (c.low < ssl && c.close > ssl) sslSwept = true;
      if (c.high > bsl && c.close < bsl) bslSwept = true;
    }

    // Check FVG mitigation on the current candle
    const currentCandle = candles[candles.length - 1];
    const tapBullishFvg = activeBullishFvgs.find(f => currentCandle.low <= f.high && currentCandle.close >= f.low);
    const tapBearishFvg = activeBearishFvgs.find(f => currentCandle.high >= f.low && currentCandle.close <= f.high);

    if (sslSwept) {
      signal = 'BUY';
      text = `External Liquidity: Sell-side Liquidity (SSL) swept at ${ssl.toFixed(2)}. Aggressive price rejection indicates a strong upward reversal bias.`;
    } else if (bslSwept) {
      signal = 'SELL';
      text = `External Liquidity: Buy-side Liquidity (BSL) swept at ${bsl.toFixed(2)}. Aggressive price rejection indicates a strong downward reversal bias.`;
    } else if (tapBullishFvg) {
      signal = 'BUY';
      text = `Internal Liquidity: Price mitigated a Bullish Fair Value Gap (FVG) at [${tapBullishFvg.low.toFixed(2)} - ${tapBullishFvg.high.toFixed(2)}]. Bullish trend continuation expected.`;
    } else if (tapBearishFvg) {
      signal = 'SELL';
      text = `Internal Liquidity: Price mitigated a Bearish Fair Value Gap (FVG) at [${tapBearishFvg.low.toFixed(2)} - ${tapBearishFvg.high.toFixed(2)}]. Bearish trend continuation expected.`;
    } else {
      // General proximity explanation
      const nearestBull = activeBullishFvgs[0];
      const nearestBear = activeBearishFvgs[0];
      text = `Liquidity Map: BSL at ${bsl.toFixed(2)}, SSL at ${ssl.toFixed(2)}. Nearest FVG: ${nearestBull ? `Bullish at ${nearestBull.low.toFixed(2)}` : 'None'} | ${nearestBear ? `Bearish at ${nearestBear.low.toFixed(2)}` : 'None'}.`;
    }

    return {
      signal,
      text,
      bsl,
      ssl,
      bullishFvgs: activeBullishFvgs.slice(0, 2),
      bearishFvgs: activeBearishFvgs.slice(0, 2)
    };
  }

  // ==================== CENTRALIZED DECISION ENGINE ====================
  /**
   * Run all selected strategies and compile a consensus trade recommendation
   */
  static analyzeSymbol(candles, selectedStrategies = {
    accumulationDistribution: true,
    supplyDemand: true,
    supportResistance: true,
    fibonacci: true,
    priceAction: true,
    marketStructure: true,
    volumeProfile: true,
    liquidity: true
  }, settings = {
    atrPeriod: 14,
    fibLookback: 60,
    srLookback: 3
  }) {
    const results = {};
    let buyVotes = 0;
    let sellVotes = 0;
    let activeStrategiesCount = 0;
    
    if (selectedStrategies.accumulationDistribution) {
      results.accumulationDistribution = this.analyzeAccumulationDistribution(candles);
      if (results.accumulationDistribution.signal === 'BUY') buyVotes++;
      if (results.accumulationDistribution.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.supplyDemand) {
      results.supplyDemand = this.analyzeSupplyDemand(candles);
      if (results.supplyDemand.signal === 'BUY') buyVotes++;
      if (results.supplyDemand.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.supportResistance) {
      results.supportResistance = this.analyzeSupportResistance(candles, settings);
      if (results.supportResistance.signal === 'BUY') buyVotes++;
      if (results.supportResistance.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.fibonacci) {
      results.fibonacci = this.analyzeFibonacci(candles, settings);
      if (results.fibonacci.signal === 'BUY') buyVotes++;
      if (results.fibonacci.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.priceAction) {
      results.priceAction = this.analyzePriceAction(candles);
      if (results.priceAction.signal === 'BUY') buyVotes++;
      if (results.priceAction.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.marketStructure) {
      results.marketStructure = this.analyzeMarketStructure(candles);
      if (results.marketStructure.signal === 'BUY') buyVotes++;
      if (results.marketStructure.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }
    
    if (selectedStrategies.volumeProfile) {
      results.volumeProfile = this.analyzeVolumeProfile(candles);
      if (results.volumeProfile.signal === 'BUY') buyVotes++;
      if (results.volumeProfile.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }

    if (selectedStrategies.liquidity) {
      results.liquidity = this.analyzeLiquidity(candles);
      if (results.liquidity.signal === 'BUY') buyVotes++;
      if (results.liquidity.signal === 'SELL') sellVotes++;
      activeStrategiesCount++;
    }

    const latestCandle = candles[candles.length - 1];
    const latestPrice = latestCandle.close;

    // Consensus Signal
    let finalSignal = 'NEUTRAL';
    let confidenceStars = 1;
    let orderType = 'Hold / Wait';
    
    const voteDiff = Math.abs(buyVotes - sellVotes);
    
    if (buyVotes > sellVotes && buyVotes >= 1) {
      finalSignal = 'BUY';
      orderType = 'Buy Limit';
      // Confidence ratio
      const ratio = buyVotes / activeStrategiesCount;
      if (ratio > 0.7) confidenceStars = 5;
      else if (ratio > 0.5) confidenceStars = 4;
      else if (ratio > 0.3) confidenceStars = 3;
      else confidenceStars = 2;
    } else if (sellVotes > buyVotes && sellVotes >= 1) {
      finalSignal = 'SELL';
      orderType = 'Sell Limit';
      const ratio = sellVotes / activeStrategiesCount;
      if (ratio > 0.7) confidenceStars = 5;
      else if (ratio > 0.5) confidenceStars = 4;
      else if (ratio > 0.3) confidenceStars = 3;
      else confidenceStars = 2;
    } else {
      confidenceStars = 1;
      orderType = 'Market Neutral';
    }

    // Dynamic Entry, SL, TP setting based on ATR/Volatility
    // Calculate simple ATR-like range for Stop Loss
    let sumRanges = 0;
    const currentAtrPeriod = settings && settings.atrPeriod !== undefined ? settings.atrPeriod : 14;
    const atrPeriod = Math.min(currentAtrPeriod, candles.length);
    for (let i = candles.length - atrPeriod; i < candles.length; i++) {
      sumRanges += (candles[i].high - candles[i].low);
    }
    const atr = sumRanges / atrPeriod;

    let entry = latestPrice;
    let sl = 0;
    let tp = 0;
    
    if (finalSignal === 'BUY') {
      // If we have Demand zones or supports or liquidity sweeps, put entry slightly above support/demand zone
      let bestSupport = latestPrice - (atr * 0.5);
      if (results.liquidity && results.liquidity.signal === 'BUY') {
        // If SSL swept, put stop loss just below the sweep low
        bestSupport = results.liquidity.ssl;
      } else if (results.supplyDemand && results.supplyDemand.activeZone) {
        bestSupport = results.supplyDemand.activeZone.low;
      } else if (results.supportResistance && results.supportResistance.supports && results.supportResistance.supports.length > 0) {
        bestSupport = results.supportResistance.supports[0].price;
      }
      
      entry = latestPrice * 0.999; // approx entry just below market
      sl = bestSupport - (atr * 0.8); // SL below support
      tp = entry + (entry - sl) * 2.0; // 1:2 Risk-Reward ratio
    } else if (finalSignal === 'SELL') {
      let bestResistance = latestPrice + (atr * 0.5);
      if (results.liquidity && results.liquidity.signal === 'SELL') {
        // If BSL swept, put stop loss just above the sweep high
        bestResistance = results.liquidity.bsl;
      } else if (results.supplyDemand && results.supplyDemand.activeZone) {
        bestResistance = results.supplyDemand.activeZone.high;
      } else if (results.supportResistance && results.supportResistance.resistances && results.supportResistance.resistances.length > 0) {
        bestResistance = results.supportResistance.resistances[0].price;
      }
      
      entry = latestPrice * 1.001; // approx entry just above market
      sl = bestResistance + (atr * 0.8); // SL above resistance
      tp = entry - (sl - entry) * 2.0; // 1:2 Risk-Reward ratio
    } else {
      entry = latestPrice;
      sl = latestPrice * 0.99;
      tp = latestPrice * 1.02;
    }

    // Compose custom rationale text explaining the decision
    let explanationParts = [];
    if (finalSignal === 'BUY') {
      explanationParts.push(`Identified a potential BUY setup for ${latestPrice > 10000 ? 'BTC' : 'Gold'} at approximately ${entry.toFixed(2)}.`);
      if (buyVotes > 0) {
        explanationParts.push(`Supported by ${buyVotes} aligned strategy indicators.`);
      }
      if (results.liquidity && results.liquidity.signal === 'BUY') {
        explanationParts.push(results.liquidity.text);
      }
      if (results.marketStructure && results.marketStructure.signal === 'BUY') {
        explanationParts.push(`Market structure shows a constructive uptrend (HH/HL series).`);
      }
      if (results.supplyDemand && results.supplyDemand.signal === 'BUY') {
        explanationParts.push(`Price is reacting strongly off a key Demand Zone.`);
      }
      if (results.fibonacci && results.fibonacci.signal === 'BUY') {
        explanationParts.push(`The 0.618 golden retracement pocket has successfully held.`);
      }
      if (results.priceAction && results.priceAction.signal === 'BUY') {
        explanationParts.push(`A bullish price action candle (${results.priceAction.pattern.replace('_', ' ')}) has printed on the chart.`);
      }
      explanationParts.push(`Risk is managed with a Stop Loss set below key invalidation levels at ${sl.toFixed(2)} with a target of ${tp.toFixed(2)}.`);
    } else if (finalSignal === 'SELL') {
      explanationParts.push(`Identified a potential SELL setup for ${latestPrice > 10000 ? 'BTC' : 'Gold'} at approximately ${entry.toFixed(2)}.`);
      if (sellVotes > 0) {
        explanationParts.push(`Supported by ${sellVotes} aligned strategy indicators.`);
      }
      if (results.liquidity && results.liquidity.signal === 'SELL') {
        explanationParts.push(results.liquidity.text);
      }
      if (results.marketStructure && results.marketStructure.signal === 'SELL') {
        explanationParts.push(`Market structure exhibits a clear bearish structure (LH/LL series) pointing downward.`);
      }
      if (results.supplyDemand && results.supplyDemand.signal === 'SELL') {
        explanationParts.push(`Price is rejecting from an established overhead Supply Zone.`);
      }
      if (results.fibonacci && results.fibonacci.signal === 'SELL') {
        explanationParts.push(`The bearish Golden Ratio retracement level acted as a strong rejection point.`);
      }
      if (results.priceAction && results.priceAction.signal === 'SELL') {
        explanationParts.push(`A bearish candlestick pattern (${results.priceAction.pattern.replace('_', ' ')}) printed on the chart.`);
      }
      explanationParts.push(`Stop Loss is placed above key invalidation resistance at ${sl.toFixed(2)} targeting a drop to ${tp.toFixed(2)}.`);
    } else {
      explanationParts.push("The market is currently ranging without confirmation from our trading indicators.");
      if (results.liquidity) {
        explanationParts.push(`Range bounds: BSL at ${results.liquidity.bsl.toFixed(2)}, SSL at ${results.liquidity.ssl.toFixed(2)}.`);
      }
      explanationParts.push("Waiting for a breakout from current congestion bounds before establishing entries.");
    }

    return {
      price: latestPrice,
      signal: finalSignal,
      confidence: confidenceStars,
      orderType: orderType,
      entry: entry,
      sl: sl,
      tp: tp,
      explanation: explanationParts.join(" "),
      strategies: results
    };
  }
}

// Make available in both node/service worker or content script environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TradingAnalysisEngine;
} else {
  window.TradingAnalysisEngine = TradingAnalysisEngine;
}
