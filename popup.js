/**
 * Popup UI Controller for Antigravity Trading Edge
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const pairSelector = document.getElementById('pair-selector');
  const autoStrategies = document.getElementById('auto-strategies');
  const strategiesGrid = document.getElementById('strategies-grid');
  const strategyChecks = document.querySelectorAll('.strategy-check');
  const btnDecide = document.getElementById('btn-decide');
  const btnMultiTF = document.getElementById('btn-multi-tf');

  const paramAtr = document.getElementById('param-atr');
  const paramFib = document.getElementById('param-fib');
  const paramSr = document.getElementById('param-sr');
  
  const resultsPanel = document.getElementById('results-panel');
  const signalBadge = document.getElementById('signal-badge');
  const starsContainer = document.getElementById('stars-container');
  const valOrderType = document.getElementById('val-order-type');
  const valEntry = document.getElementById('val-entry');
  const valSl = document.getElementById('val-sl');
  const valTp = document.getElementById('val-tp');
  const valExplanation = document.getElementById('val-explanation');
  
  const riskBalance = document.getElementById('risk-balance');
  const riskPct = document.getElementById('risk-pct');
  const valPosSize = document.getElementById('val-pos-size');
  const btnCopyPineScript = document.getElementById('btn-copy-pinescript');
  
  const loadingOverlay = document.getElementById('loading-overlay');
  const copyBtns = document.querySelectorAll('.copy-btn');

  let lastResult = null;

  // Optimized Strategy Recommendations by Asset Pair
  const STRATEGY_RECOMMENDATIONS = {
    XAUUSD: ['supplyDemand', 'supportResistance', 'fibonacci', 'liquidity'],
    BTCUSD: ['accumulationDistribution', 'volumeProfile', 'marketStructure', 'priceAction', 'supplyDemand'],
    ETHUSD: ['supportResistance', 'fibonacci', 'marketStructure', 'volumeProfile'],
    SOLUSD: ['marketStructure', 'priceAction', 'supplyDemand', 'liquidity'],
    EURUSD: ['supportResistance', 'supplyDemand', 'volumeProfile', 'fibonacci'],
    GBPUSD: ['liquidity', 'supportResistance', 'marketStructure', 'priceAction']
  };

  // Restore saved state from storage
  function restoreState() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['selectedPair', 'autoSelect', 'strategies', 'riskSettings', 'strategyParams'], (result) => {
        if (result.selectedPair) {
          pairSelector.value = result.selectedPair;
        }
        
        if (result.autoSelect !== undefined) {
          autoStrategies.checked = result.autoSelect;
        }

        if (result.riskSettings) {
          if (result.riskSettings.balance !== undefined) riskBalance.value = result.riskSettings.balance;
          if (result.riskSettings.pct !== undefined) riskPct.value = result.riskSettings.pct;
        }

        if (result.strategyParams) {
          if (result.strategyParams.atrPeriod !== undefined) paramAtr.value = result.strategyParams.atrPeriod;
          if (result.strategyParams.fibLookback !== undefined) paramFib.value = result.strategyParams.fibLookback;
          if (result.strategyParams.srLookback !== undefined) paramSr.value = result.strategyParams.srLookback;
        }

        if (result.strategies) {
          strategyChecks.forEach(check => {
            const strat = check.getAttribute('data-strategy');
            if (result.strategies[strat] !== undefined) {
              check.checked = result.strategies[strat];
            }
          });
        }
        
        applyAutoStrategyRecommendations();
      });
    } else {
      // Offline/local testing defaults
      applyAutoStrategyRecommendations();
    }
  }

  // Save state to storage
  function saveState() {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const selectedPair = getSelectedPair();
      const autoSelect = autoStrategies.checked;
      const strategies = {};
      
      strategyChecks.forEach(check => {
        strategies[check.getAttribute('data-strategy')] = check.checked;
      });

      const riskSettings = {
        balance: parseFloat(riskBalance.value) || 10000,
        pct: parseFloat(riskPct.value) || 1
      };

      const strategyParams = {
        atrPeriod: parseInt(paramAtr.value) || 14,
        fibLookback: parseInt(paramFib.value) || 60,
        srLookback: parseInt(paramSr.value) || 3
      };

      chrome.storage.local.set({ selectedPair, autoSelect, strategies, riskSettings, strategyParams });
    }
  }

  // Get selected pair
  function getSelectedPair() {
    return pairSelector.value;
  }

  // Auto Select Logic: Check/uncheck and disable/enable checkboxes based on pair
  function applyAutoStrategyRecommendations() {
    const isAuto = autoStrategies.checked;
    const pair = getSelectedPair();
    const recommended = STRATEGY_RECOMMENDATIONS[pair] || STRATEGY_RECOMMENDATIONS['BTCUSD'];

    strategyChecks.forEach(check => {
      const strategyKey = check.getAttribute('data-strategy');
      const card = check.closest('.strategy-card');
      
      if (isAuto) {
        // Enforce recommendation
        check.checked = recommended.includes(strategyKey);
        card.classList.add('disabled');
        check.disabled = true;
      } else {
        // Let user check manually
        card.classList.remove('disabled');
        check.disabled = false;
      }
    });
    
    saveState();
  }

  // Render Star Ratings
  function renderStars(rating) {
    starsContainer.innerHTML = '';
    const maxStars = 5;
    for (let i = 1; i <= maxStars; i++) {
      const star = document.createElement('span');
      star.className = `star-icon ${i <= rating ? 'filled' : ''}`;
      star.innerHTML = '★';
      starsContainer.appendChild(star);
    }
  }

  // Get decimal places for asset
  function getFormatDecimals(pair) {
    if (pair === 'EURUSD' || pair === 'GBPUSD') return 4;
    if (pair === 'XAUUSD' || pair === 'SOLUSD' || pair === 'ETHUSD') return 2;
    return 1;
  }

  // Calculate suggested position size based on account balance and risk percentage
  function calculatePositionSize(entry, sl, pair) {
    const balance = parseFloat(riskBalance.value) || 10000;
    const pct = parseFloat(riskPct.value) || 1;
    const riskAmt = balance * (pct / 100);
    const priceDiff = Math.abs(entry - sl);
    if (priceDiff === 0) return "--";
    
    const size = riskAmt / priceDiff;
    if (pair === 'XAUUSD') {
      const lots = size / 100;
      return `${lots.toFixed(2)} Lots (${size.toFixed(1)} oz) [Risk: $${riskAmt.toFixed(0)}]`;
    } else if (pair === 'EURUSD') {
      const lots = size / 100000; // 1 standard Forex lot = 100,000 units
      return `${lots.toFixed(2)} Lots (${size.toFixed(0)} units) [Risk: $${riskAmt.toFixed(0)}]`;
    } else if (pair === 'GBPUSD') {
      const lots = size / 100000;
      return `${lots.toFixed(2)} Lots (${size.toFixed(0)} units) [Risk: $${riskAmt.toFixed(0)}]`;
    } else {
      return `${size.toFixed(4)} ${pair.substring(0, 3)} [Risk: $${riskAmt.toFixed(0)}]`;
    }
  }

  // Generate copyable Pine Script block
  function generatePineScript(result, pair) {
    const isBuy = result.signal === 'BUY';
    const decimals = getFormatDecimals(pair);
    return `//@version=5
// Antigravity Trading Edge Setup
indicator("Antigravity Setup: ${pair} - ${result.signal}", overlay=true)

// Level Inputs
entryPrice = input.float(${result.entry.toFixed(decimals)}, title="Entry Price")
slPrice    = input.float(${result.sl.toFixed(decimals)}, title="Stop Loss")
tpPrice    = input.float(${result.tp.toFixed(decimals)}, title="Take Profit")

// Plot Levels
plot(entryPrice, "Entry", color=color.blue, linewidth=2, style=plot.style_line)
plot(slPrice, "Stop Loss", color=color.red, linewidth=2, style=plot.style_line)
plot(tpPrice, "Take Profit", color=color.green, linewidth=2, style=plot.style_line)

// Shade Zones
var color profitColor = color.new(color.green, 88)
var color lossColor   = color.new(color.red, 88)

isLong = ${isBuy ? 'true' : 'false'}
tpPlot = plot(tpPrice, color=color.new(color.green, 100), display=display.none)
entryPlot = plot(entryPrice, color=color.new(color.blue, 100), display=display.none)
slPlot = plot(slPrice, color=color.new(color.red, 100), display=display.none)

fill(entryPlot, tpPlot, isLong ? profitColor : lossColor, title="Profit Target Zone")
fill(entryPlot, slPlot, isLong ? lossColor : profitColor, title="Stop Loss Zone")
`;
  }

  // Render Analysis Results
  function renderResults(result) {
    lastResult = result;
    // Set signal badge
    signalBadge.className = 'signal-badge';
    signalBadge.classList.add(result.signal.toLowerCase());
    signalBadge.textContent = result.signal;
    
    // Set stars
    renderStars(result.confidence);
    
    // Set targets
    const formatDecimals = getFormatDecimals(getSelectedPair());
    valOrderType.textContent = result.orderType;
    valEntry.textContent = result.entry.toFixed(formatDecimals);
    valSl.textContent = result.sl.toFixed(formatDecimals);
    valTp.textContent = result.tp.toFixed(formatDecimals);

    // Set position size
    valPosSize.textContent = calculatePositionSize(result.entry, result.sl, getSelectedPair());
    
    // Set rationale
    valExplanation.textContent = result.explanation;
    
    // Reveal panel
    resultsPanel.classList.remove('hidden');
    resultsPanel.scrollIntoView({ behavior: 'smooth' });
  }

  // Get Strategy Parameter overrides
  function getStrategyParams() {
    return {
      atrPeriod: parseInt(paramAtr.value) || 14,
      fibLookback: parseInt(paramFib.value) || 60,
      srLookback: parseInt(paramSr.value) || 3
    };
  }

  // Run Technical Analysis
  async function performAnalysis() {
    const pair = getSelectedPair();
    const symbol = TradingAnalysisEngine.getProxySymbol(pair);
    const params = getStrategyParams();
    
    // Get active strategies
    const activeStrategies = {};
    strategyChecks.forEach(check => {
      activeStrategies[check.getAttribute('data-strategy')] = check.checked;
    });

    showLoader(true, `Fetching ${TradingAnalysisEngine.getDisplayName(pair)} price feed...`);
    
    try {
      // Fetch 100 historical candles at 15m interval
      const candles = await TradingAnalysisEngine.fetchCandles(symbol, '15m', 100);
      
      showLoader(true, "Evaluating market indicators...");
      
      // Run calculations (simulating short loading step for satisfying premium aesthetics)
      setTimeout(() => {
        const analysis = TradingAnalysisEngine.analyzeSymbol(candles, activeStrategies, params);
        renderResults(analysis);
        showLoader(false);
        saveState();
      }, 700);

    } catch (error) {
      console.error(error);
      showLoader(false);
      alert("Failed to analyze chart data. Please check internet connection.");
    }
  }

  // Run Multi-TF Analysis and redirect to TradingView
  async function performMultiTFAnalysis() {
    const pair = getSelectedPair();
    const symbol = TradingAnalysisEngine.getProxySymbol(pair);
    const intervals = ['4h', '1h', '15m', '5m', '3m', '1m'];
    const activeStrategies = {};
    const params = getStrategyParams();
    
    strategyChecks.forEach(check => {
      activeStrategies[check.getAttribute('data-strategy')] = check.checked;
    });

    showLoader(true, `Scanning charts on 6 timeframes: ${intervals.join(', ')}...`);

    const tfResults = {};
    const tfCandles = {};
    let candles15m = null;

    try {
      // Fetch data sequentially for the timeframes
      for (const tf of intervals) {
        showLoader(true, `Analyzing ${tf} timeframe trend...`);
        const candles = await TradingAnalysisEngine.fetchCandles(symbol, tf, 100);
        const analysis = TradingAnalysisEngine.analyzeSymbol(candles, activeStrategies, params);
        tfResults[tf] = analysis.signal;
        tfCandles[tf] = candles;
        
        if (tf === '15m') {
          candles15m = candles; // Save 15m as base signal
        }
      }

      showLoader(true, "Synthesizing multi-timeframe consensus...");

      setTimeout(() => {
        // Base analysis using 15m candles
        const baseAnalysis = TradingAnalysisEngine.analyzeSymbol(candles15m, activeStrategies, params);
        
        // Enhance explanation with Multi-TF information
        let tfBullishCount = 0;
        let tfBearishCount = 0;
        for (const [tf, sig] of Object.entries(tfResults)) {
          if (sig === 'BUY') tfBullishCount++;
          if (sig === 'SELL') tfBearishCount++;
        }

        let tfConsensus = 'NEUTRAL';
        if (tfBullishCount >= 5) tfConsensus = 'STRONG BUY';
        else if (tfBullishCount >= 4) tfConsensus = 'BUY';
        else if (tfBearishCount >= 5) tfConsensus = 'STRONG SELL';
        else if (tfBearishCount >= 4) tfConsensus = 'SELL';

        // Adjust confidence stars based on timeframe alignment
        let finalConfidence = baseAnalysis.confidence;
        if (tfConsensus.includes('STRONG') && baseAnalysis.signal === tfConsensus.split(' ')[1]) {
          finalConfidence = Math.min(5, finalConfidence + 1);
        } else if (tfConsensus === 'NEUTRAL') {
          finalConfidence = Math.max(1, finalConfidence - 1);
        }

        const compositeAnalysis = {
          ...baseAnalysis,
          confidence: finalConfidence,
          timeframeSignals: tfResults,
          tfConsensus: tfConsensus,
          explanation: `[Multi-TF Alignment: ${tfConsensus}] ` + baseAnalysis.explanation,
          timeframeCandles: tfCandles
        };

        // Get TradingView charting ticker
        function getTradingViewSymbol(pair) {
          if (pair === 'XAUUSD') return 'FX:XAUUSD';
          if (pair === 'EURUSD') return 'FX:EURUSD';
          if (pair === 'GBPUSD') return 'FX:GBPUSD';
          if (pair === 'BTCUSD') return 'BINANCE:BTCUSDT';
          if (pair === 'ETHUSD') return 'BINANCE:ETHUSDT';
          if (pair === 'SOLUSD') return 'BINANCE:SOLUSDT';
          return `BINANCE:${pair}T`;
        }

        // Save composite result to storage so the content script can read and show it
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            lastAnalysisResult: compositeAnalysis,
            targetPair: pair,
            runHUD: true,
            riskSettings: {
              balance: parseFloat(riskBalance.value) || 10000,
              pct: parseFloat(riskPct.value) || 1
            },
            strategyParams: params
          }, () => {
            // Open TradingView chart page
            let tvSymbol = getTradingViewSymbol(pair);
            const tvUrl = `https://www.tradingview.com/chart/?symbol=${tvSymbol}`;
            
            chrome.tabs.create({ url: tvUrl });
            showLoader(false);
          });
        } else {
          // Fallback rendering in the popup if not in Chrome extension context
          renderResults(compositeAnalysis);
          showLoader(false);
          console.log("Multi-TF results (mocked extension redirect):", compositeAnalysis);
        }
      }, 800);

    } catch (error) {
      console.error(error);
      showLoader(false);
      alert("Failed to compile Multi-TF data.");
    }
  }

  // Loader Toggle
  function showLoader(show, text = "") {
    if (show) {
      if (text) {
        loadingOverlay.querySelector('.loading-text').textContent = text;
      }
      loadingOverlay.classList.remove('hidden');
    } else {
      loadingOverlay.classList.add('hidden');
    }
  }

  // Clipboard Copier
  copyBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetId = btn.getAttribute('data-target');
      const valText = document.getElementById(targetId).textContent;
      
      navigator.clipboard.writeText(valText).then(() => {
        btn.classList.add('copied');
        btn.textContent = '✓';
        setTimeout(() => {
          btn.classList.remove('copied');
          btn.textContent = '📋';
        }, 1500);
      });
    });
  });

  // Event Listeners
  pairSelector.addEventListener('change', () => {
    applyAutoStrategyRecommendations();
    saveState();
  });
  autoStrategies.addEventListener('change', applyAutoStrategyRecommendations);
  
  strategyChecks.forEach(check => {
    check.addEventListener('change', saveState);
  });

  riskBalance.addEventListener('change', saveState);
  riskPct.addEventListener('change', saveState);
  paramAtr.addEventListener('change', saveState);
  paramFib.addEventListener('change', saveState);
  paramSr.addEventListener('change', saveState);

  btnDecide.addEventListener('click', performAnalysis);
  btnMultiTF.addEventListener('click', performMultiTFAnalysis);

  btnCopyPineScript.addEventListener('click', () => {
    if (!lastResult || lastResult.signal === 'NEUTRAL') {
      alert("No active Buy/Sell setup to generate Pine Script for.");
      return;
    }
    const pineCode = generatePineScript(lastResult, getSelectedPair());
    navigator.clipboard.writeText(pineCode).then(() => {
      const btnText = btnCopyPineScript.querySelector('.btn-text');
      btnText.textContent = '✓ Pine Script Copied!';
      setTimeout(() => {
        btnText.textContent = '📋 Copy Pine Script Code';
      }, 2000);
    });
  });

  // Initialize
  restoreState();
});
