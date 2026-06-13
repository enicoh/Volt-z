/**
 * Content Script for TradingView Chart Integration
 * Antigravity Trading Edge HUD Overlay
 */

(function () {
  let livePriceInterval = null;
  let hasAlertedEntry = false;
  let hasAlertedSl = false;
  let hasAlertedTp = false;

  function getFormatDecimals(pair) {
    if (pair === 'EURUSD' || pair === 'GBPUSD') return 4;
    if (pair === 'XAUUSD' || pair === 'SOLUSD' || pair === 'ETHUSD') return 2;
    return 1;
  }

  function playAlertSound(type) {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = 'sine';
      if (type === 'tp') {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
      } else if (type === 'sl') {
        osc.frequency.setValueAtTime(220, ctx.currentTime);
      } else {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
      }
      
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch (e) {
      console.error("Audio beep error:", e);
    }
  }

  function triggerHUDAlertBanner(text, type) {
    const banner = document.getElementById('antigravity-hud-alert-banner');
    if (banner) {
      banner.textContent = text;
      banner.className = `antigravity-hud-alert-banner show ${type}`;
      setTimeout(() => {
        banner.className = 'antigravity-hud-alert-banner';
      }, 8000);
    }
  }

  function startLivePriceTracker(analysis, pair) {
    if (livePriceInterval) clearInterval(livePriceInterval);
    
    hasAlertedEntry = false;
    hasAlertedSl = false;
    hasAlertedTp = false;

    if (analysis.signal === 'NEUTRAL') return;

    const entry = analysis.entry;
    const sl = analysis.sl;
    const tp = analysis.tp;
    const isBuy = analysis.signal === 'BUY';
    const isSell = analysis.signal === 'SELL';
    
    livePriceInterval = setInterval(() => {
      const title = document.title;
      const match = title.match(/[\d\.]+/);
      if (!match) return;
      const currentPrice = parseFloat(match[0]);

      if (isBuy) {
        if (!hasAlertedEntry && currentPrice <= entry) {
          hasAlertedEntry = true;
          playAlertSound('entry');
          triggerHUDAlertBanner(`🔔 ENTRY HIT: Price reached Entry level at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'entry');
        }
        if (!hasAlertedTp && currentPrice >= tp) {
          hasAlertedTp = true;
          playAlertSound('tp');
          triggerHUDAlertBanner(`🎯 TAKE PROFIT HIT: Target reached at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'tp');
        }
        if (!hasAlertedSl && currentPrice <= sl) {
          hasAlertedSl = true;
          playAlertSound('sl');
          triggerHUDAlertBanner(`⚠️ STOP LOSS HIT: Invalidation level hit at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'sl');
        }
      } else if (isSell) {
        if (!hasAlertedEntry && currentPrice >= entry) {
          hasAlertedEntry = true;
          playAlertSound('entry');
          triggerHUDAlertBanner(`🔔 ENTRY HIT: Price reached Entry level at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'entry');
        }
        if (!hasAlertedTp && currentPrice <= tp) {
          hasAlertedTp = true;
          playAlertSound('tp');
          triggerHUDAlertBanner(`🎯 TAKE PROFIT HIT: Target reached at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'tp');
        }
        if (!hasAlertedSl && currentPrice >= sl) {
          hasAlertedSl = true;
          playAlertSound('sl');
          triggerHUDAlertBanner(`⚠️ STOP LOSS HIT: Invalidation level hit at ${currentPrice.toFixed(getFormatDecimals(pair))}!`, 'sl');
        }
      }
    }, 2500);
  }
  // Check if we are running in extension context
  if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
    console.log("Antigravity HUD: Extension storage APIs not available. Running in isolation mode.");
    return;
  }

  // Check storage for active analysis trigger
  chrome.storage.local.get(['lastAnalysisResult', 'targetPair', 'runHUD', 'riskSettings'], (data) => {
    if (data.runHUD && data.lastAnalysisResult) {
      console.log("Antigravity HUD: Active trading signal detected. Constructing HUD...", data.lastAnalysisResult);
      
      // Build and inject the HUD
      injectHUD(data.lastAnalysisResult, data.targetPair, data.riskSettings);
      
      // Start live price tracking and alerts
      startLivePriceTracker(data.lastAnalysisResult, data.targetPair);
      
      // Clear HUD trigger status in storage so it doesn't pop up again unless requested
      chrome.storage.local.set({ runHUD: false });
    }
  });

  function injectHUD(analysis, pair, riskSettings) {
    // Prevent duplicate HUD
    const existingHud = document.getElementById('antigravity-hud-container');
    if (existingHud) {
      existingHud.remove();
    }

    // Create HUD container element
    const hud = document.createElement('div');
    hud.id = 'antigravity-hud-container';
    
    // Setup Header & Collapse toggle
    const collapsedHtml = `
      <div class="antigravity-hud-header" id="antigravity-hud-header">
        <div class="antigravity-hud-title">
          <span class="antigravity-logo-accent">●</span> Trading Assistant
        </div>
        <button class="antigravity-toggle-btn" id="antigravity-hud-toggle" title="Minimize/Maximize HUD">✕</button>
      </div>
      <!-- Alert Banner Overlay -->
      <div class="antigravity-hud-alert-banner" id="antigravity-hud-alert-banner"></div>
    `;

    // Strategy checklist generation
    let checklistHtml = '';
    const strategyDisplayNames = {
      accumulationDistribution: 'Accumulation/Distribution',
      supplyDemand: 'Supply & Demand Zones',
      supportResistance: 'Support & Resistance',
      fibonacci: 'Fibonacci Retracement',
      priceAction: 'Price Action Patterns',
      marketStructure: 'Market Structure Trend',
      volumeProfile: 'Volume Profile (VPVR)',
      liquidity: 'Liquidity Analysis (SMC)'
    };

    for (const [key, details] of Object.entries(analysis.strategies)) {
      const name = strategyDisplayNames[key] || key;
      const sig = details.signal || 'NEUTRAL';
      const sigClass = sig.toLowerCase();
      const dotSymbol = sig === 'BUY' ? '▲' : (sig === 'SELL' ? '▼' : '●');
      
      checklistHtml += `
        <div class="antigravity-check-item">
          <span class="antigravity-check-name">${name}</span>
          <span class="antigravity-check-status ${sigClass}">${dotSymbol} ${sig}</span>
        </div>
      `;
    }

    // Timeframe row dots generation
    const timeframes = ['4h', '1h', '15m', '5m', '3m', '1m'];
    let tfDotsHtml = '';
    
    if (analysis.timeframeSignals) {
      timeframes.forEach(tf => {
        const sig = analysis.timeframeSignals[tf] || 'NEUTRAL';
        const sigClass = sig.toLowerCase();
        tfDotsHtml += `
          <div class="antigravity-tf-badge" title="${tf} trend: ${sig}">
            <span class="antigravity-tf-name">${tf}</span>
            <div class="antigravity-tf-dot ${sigClass}"></div>
          </div>
        `;
      });
    }

    const formatDecimals = getFormatDecimals(pair);
    
    // Timeframe chart snapshots structure
    let snapshotsHtml = '';
    if (analysis.timeframeCandles) {
      snapshotsHtml = `
        <div class="antigravity-checklist-title" style="margin-top: 10px !important; margin-bottom: 6px !important;">Chart Snapshots (4H-1M)</div>
        <div class="antigravity-snapshots-grid">
          <div class="antigravity-snapshot-card" data-tf="4h" title="Expand 4H chart">
            <span class="antigravity-snapshot-tf">4H</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-4h" width="100" height="40"></canvas>
          </div>
          <div class="antigravity-snapshot-card" data-tf="1h" title="Expand 1H chart">
            <span class="antigravity-snapshot-tf">1H</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-1h" width="100" height="40"></canvas>
          </div>
          <div class="antigravity-snapshot-card" data-tf="15m" title="Expand 15M chart">
            <span class="antigravity-snapshot-tf">15M</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-15m" width="100" height="40"></canvas>
          </div>
          <div class="antigravity-snapshot-card" data-tf="5m" title="Expand 5M chart">
            <span class="antigravity-snapshot-tf">5M</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-5m" width="100" height="40"></canvas>
          </div>
          <div class="antigravity-snapshot-card" data-tf="3m" title="Expand 3M chart">
            <span class="antigravity-snapshot-tf">3M</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-3m" width="100" height="40"></canvas>
          </div>
          <div class="antigravity-snapshot-card" data-tf="1m" title="Expand 1M chart">
            <span class="antigravity-snapshot-tf">1M</span>
            <canvas class="antigravity-mini-chart" id="hud-chart-1m" width="100" height="40"></canvas>
          </div>
        </div>
      `;
    }

    const bodyHtml = `
      <div class="antigravity-hud-body">
        <!-- Signal & Pair Info -->
        <div class="antigravity-alert-strip">
          <div class="antigravity-hud-pair">${pair === 'XAUUSD' ? 'XAU/USD' : 'BTC/USD'}</div>
          <div class="antigravity-hud-signal ${analysis.signal.toLowerCase()}">${analysis.signal} (${analysis.confidence}★)</div>
        </div>

        <!-- Timeframe Trend Gauge -->
        ${analysis.timeframeSignals ? `<div class="antigravity-tf-row">${tfDotsHtml}</div>` : ''}

        <!-- Levels Matrix -->
        <div class="antigravity-levels-table">
          <div class="antigravity-level-item">
            <span class="antigravity-level-label">Order Type</span>
            <span class="antigravity-level-val">${analysis.orderType}</span>
          </div>
          <div class="antigravity-level-item">
            <span class="antigravity-level-label">Approx. Entry</span>
            <div class="antigravity-level-val-wrapper">
              <span class="antigravity-level-val entry" id="hud-entry-val">${analysis.entry.toFixed(formatDecimals)}</span>
              <button class="antigravity-level-copy" data-target="hud-entry-val">📋</button>
            </div>
          </div>
          <div class="antigravity-level-item">
            <span class="antigravity-level-label">Stop Loss (SL)</span>
            <div class="antigravity-level-val-wrapper">
              <span class="antigravity-level-val sl" id="hud-sl-val">${analysis.sl.toFixed(formatDecimals)}</span>
              <button class="antigravity-level-copy" data-target="hud-sl-val">📋</button>
            </div>
          </div>
          <div class="antigravity-level-item">
            <span class="antigravity-level-label">Take Profit (TP)</span>
            <div class="antigravity-level-val-wrapper">
              <span class="antigravity-level-val tp" id="hud-tp-val">${analysis.tp.toFixed(formatDecimals)}</span>
              <button class="antigravity-level-copy" data-target="hud-tp-val">📋</button>
            </div>
          </div>
          ${(function() {
            if (riskSettings && analysis.signal !== 'NEUTRAL') {
              const balance = parseFloat(riskSettings.balance) || 10000;
              const pct = parseFloat(riskSettings.pct) || 1;
              const riskAmt = balance * (pct / 100);
              const priceDiff = Math.abs(analysis.entry - analysis.sl);
              if (priceDiff > 0) {
                const size = riskAmt / priceDiff;
                let sizeText = '';
                if (pair === 'XAUUSD') {
                  const lots = size / 100;
                  sizeText = `${lots.toFixed(2)} Lots (${size.toFixed(1)} oz)`;
                } else {
                  sizeText = `${size.toFixed(4)} BTC`;
                }
                return `
                  <div class="antigravity-level-item" style="margin-top: 6px !important; border-top: 1px solid rgba(255, 255, 255, 0.03) !important; padding-top: 6px !important;">
                    <span class="antigravity-level-label" style="color: #fbbf24 !important;">Risk Position Size</span>
                    <span class="antigravity-level-val" style="color: #fbbf24 !important;">${sizeText}</span>
                  </div>
                `;
              }
            }
            return '';
          })()}
        </div>

        <!-- Strategy Checklist -->
        <div class="antigravity-checklist-title">Strategy Alignment</div>
        <div class="antigravity-checklist">
          ${checklistHtml}
        </div>

        <!-- Timeframe Snapshots -->
        ${snapshotsHtml}

        <!-- Explanation -->
        <div class="antigravity-explanation-box">
          <span class="antigravity-explanation-title">HUD Explanation</span>
          <p class="antigravity-explanation-text">${analysis.explanation}</p>
        </div>
        
        <!-- Copy Pine Script Button -->
        <button class="antigravity-hud-btn" id="antigravity-hud-copy-pinescript" style="
          width: 100% !important;
          background: rgba(255, 255, 255, 0.03) !important;
          border: 1px solid #27282c !important;
          border-radius: 4px !important;
          color: #e2e8f0 !important;
          font-family: inherit !important;
          font-size: 10px !important;
          font-weight: 600 !important;
          padding: 6px 0 !important;
          margin-top: 8px !important;
          cursor: pointer !important;
          transition: all 0.15s ease !important;
        ">📋 Copy Pine Script Code</button>
      </div>
    `;

    hud.innerHTML = collapsedHtml + bodyHtml;
    document.body.appendChild(hud);

    // Draw mini charts on canvases
    if (analysis.timeframeCandles) {
      setTimeout(() => {
        Object.entries(analysis.timeframeCandles).forEach(([tf, candles]) => {
          const canvas = hud.querySelector(`#hud-chart-${tf}`);
          if (canvas) {
            drawCandlestickChart(canvas, candles, analysis, true);
          }
        });
      }, 100);

      // Set up click handlers for snapshot cards
      const cards = hud.querySelectorAll('.antigravity-snapshot-card');
      cards.forEach(card => {
        card.addEventListener('click', (e) => {
          e.stopPropagation();
          const tf = card.getAttribute('data-tf');
          const candles = analysis.timeframeCandles[tf];
          if (candles) {
            openChartModal(tf, candles, analysis);
          }
        });
      });
    }

    // Set up level overlay lines on page
    if (analysis.signal !== 'NEUTRAL') {
      overlayLevelLines(analysis, formatDecimals);
    }

    // Toggle Collapsed Mode
    const toggleBtn = hud.querySelector('#antigravity-hud-toggle');
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleHUDState(hud, toggleBtn);
    });

    // Handle clicks when collapsed to restore HUD
    hud.addEventListener('click', () => {
      if (hud.classList.contains('collapsed')) {
        hud.classList.remove('collapsed');
        toggleBtn.innerHTML = '✕';
        toggleBtn.title = "Minimize HUD";
      }
    });

    // Copy Event Handlers
    const copies = hud.querySelectorAll('.antigravity-level-copy');
    copies.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const targetId = btn.getAttribute('data-target');
        const valText = hud.querySelector(`#${targetId}`).textContent;
        
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

    // Make HUD Draggable
    const header = hud.querySelector('#antigravity-hud-header');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;

    header.style.cursor = 'grab';

    // Load saved position offset from storage
    chrome.storage.local.get(['hudOffset'], (res) => {
      if (res.hudOffset) {
        xOffset = res.hudOffset.x || 0;
        yOffset = res.hudOffset.y || 0;
        setTranslate(xOffset, yOffset, hud);
      }
    });

    header.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', dragEnd);

    function dragStart(e) {
      if (e.button !== 0 || e.target.id === 'antigravity-hud-toggle') return;
      
      initialX = e.clientX - xOffset;
      initialY = e.clientY - yOffset;
      isDragging = true;
      header.style.cursor = 'grabbing';
    }

    function drag(e) {
      if (isDragging) {
        e.preventDefault();
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;

        xOffset = currentX;
        yOffset = currentY;

        setTranslate(currentX, currentY, hud);
      }
    }

    function dragEnd() {
      if (isDragging) {
        isDragging = false;
        header.style.cursor = 'grab';
        chrome.storage.local.set({ hudOffset: { x: xOffset, y: yOffset } });
      }
    }

    function setTranslate(xPos, yPos, el) {
      el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    }

    // Copy Pine Script Handler
    const btnCopyPine = hud.querySelector('#antigravity-hud-copy-pinescript');
    if (btnCopyPine) {
      if (analysis.signal === 'NEUTRAL') {
        btnCopyPine.style.display = 'none';
      } else {
        btnCopyPine.addEventListener('click', (e) => {
          e.stopPropagation();
          const pineCode = generatePineScript(analysis, pair);
          navigator.clipboard.writeText(pineCode).then(() => {
            btnCopyPine.textContent = '✓ Pine Script Copied!';
            setTimeout(() => {
              btnCopyPine.textContent = '📋 Copy Pine Script Code';
            }, 2000);
          });
        });
      }
    }
  }

  function toggleHUDState(hud, toggleBtn) {
    if (hud.classList.contains('collapsed')) {
      hud.classList.remove('collapsed');
      toggleBtn.innerHTML = '✕';
      toggleBtn.title = "Minimize HUD";
    } else {
      hud.classList.add('collapsed');
      toggleBtn.innerHTML = '▲';
      toggleBtn.title = "Restore HUD";
    }
  }

  // Overlays visual entry/SL/TP guide lines in a viewport container
  function overlayLevelLines(analysis, formatDecimals) {
    // Remove old lines if any
    const oldContainer = document.getElementById('antigravity-lines-overlay-container');
    if (oldContainer) oldContainer.remove();

    // Create canvas/overlay covering the chart viewport
    const container = document.createElement('div');
    container.id = 'antigravity-lines-overlay-container';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 99999;
    `;

    // Since we cannot scrape TV's exact candle scale because it's rendered inside a black-box Canvas,
    // we will place 3 beautifully styled absolute lines distributed vertically in the upper, middle,
    // and lower halves of the screen to give the trader a direct visual scale reference of the setup!
    // Green (TP) at the top, Blue (Entry) in the middle, Red (SL) at the bottom for BUY setups, and vice-versa for SELL.
    const isBuy = analysis.signal === 'BUY';
    
    const levels = [
      { type: 'tp', label: `TP: ${analysis.tp.toFixed(formatDecimals)}`, percent: isBuy ? 32 : 68 },
      { type: 'entry', label: `ENTRY: ${analysis.entry.toFixed(formatDecimals)}`, percent: 50 },
      { type: 'sl', label: `SL: ${analysis.sl.toFixed(formatDecimals)}`, percent: isBuy ? 68 : 32 }
    ];

    // Add ERL Liquidity levels if available
    if (analysis.strategies && analysis.strategies.liquidity) {
      const liq = analysis.strategies.liquidity;
      if (liq.bsl > 0) {
        levels.push({ type: 'bsl', label: `BSL (Liquidity): ${liq.bsl.toFixed(formatDecimals)}`, percent: 18 });
      }
      if (liq.ssl > 0) {
        levels.push({ type: 'ssl', label: `SSL (Liquidity): ${liq.ssl.toFixed(formatDecimals)}`, percent: 82 });
      }
    }

    levels.forEach(level => {
      const line = document.createElement('div');
      line.className = `antigravity-chart-price-line ${level.type}`;
      line.style.top = `${level.percent}%`;
      
      const dash = document.createElement('div');
      dash.className = 'antigravity-line-dash';
      
      const label = document.createElement('div');
      label.className = 'antigravity-line-label';
      label.textContent = level.label;
      
      line.appendChild(dash);
      line.appendChild(label);
      container.appendChild(line);
    });

    document.body.appendChild(container);

    // Auto-remove lines container after 15 seconds to keep the chart clean, 
    // or let them stay. Let's add an auto-fade out after 20 seconds.
    setTimeout(() => {
      container.style.transition = 'opacity 1.5s ease';
      container.style.opacity = '0';
      setTimeout(() => container.remove(), 1500);
    }, 20000);
  }

  // Draw Candlestick chart on canvas element
  function drawCandlestickChart(canvas, candles, analysis, isMini = true) {
    if (!canvas || !candles || candles.length === 0) return;
    
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    // Choose display size (last 35 candles for mini sparklines, all 100 for lightbox modal)
    const displayCount = isMini ? 35 : candles.length;
    const activeCandles = candles.slice(candles.length - displayCount);
    
    // Get scaling min/max ranges
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    activeCandles.forEach(c => {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    });
    
    // Price margins padding
    const pricePadding = (maxPrice - minPrice) * (isMini ? 0.08 : 0.15) || 1.0;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    
    const priceRange = maxPrice - minPrice;
    
    // Drawing dimensions
    const candleWidth = width / displayCount;
    const bodyPadding = candleWidth * 0.22;
    
    function getOffsetY(price) {
      return height - ((price - minPrice) / priceRange) * height;
    }
    
    // 1. Draw horizontal guide lines
    const formatDecimals = analysis.price > 10000 ? 1 : (analysis.price < 5 ? 4 : 2);
    const drawLevelLine = (price, color, labelText = "") => {
      if (price >= minPrice && price <= maxPrice) {
        const y = getOffsetY(price);
        ctx.strokeStyle = color;
        ctx.lineWidth = isMini ? 0.75 : 1;
        ctx.setLineDash([2, 2]);
        
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.setLineDash([]);
        
        if (!isMini && labelText) {
          ctx.fillStyle = color;
          ctx.font = '500 9px Inter';
          const txtWidth = ctx.measureText(labelText).width;
          ctx.fillRect(width - txtWidth - 12, y - 6, txtWidth + 10, 12);
          ctx.fillStyle = color.toLowerCase().includes('ffd600') ? '#000000' : '#ffffff';
          ctx.fillText(labelText, width - txtWidth - 7, y + 3);
        }
      }
    };
    
    // Draw BSL and SSL if active
    if (analysis.strategies && analysis.strategies.liquidity) {
      const liq = analysis.strategies.liquidity;
      drawLevelLine(liq.bsl, '#fbbf24', `BSL: ${liq.bsl.toFixed(formatDecimals)}`);
      drawLevelLine(liq.ssl, '#f97316', `SSL: ${liq.ssl.toFixed(formatDecimals)}`);
    }
    
    // Draw Entry, SL, TP target lines
    drawLevelLine(analysis.entry, '#3b82f6', `ENTRY: ${analysis.entry.toFixed(formatDecimals)}`);
    drawLevelLine(analysis.sl, '#ef4444', `SL: ${analysis.sl.toFixed(formatDecimals)}`);
    drawLevelLine(analysis.tp, '#10b981', `TP: ${analysis.tp.toFixed(formatDecimals)}`);
    
    // 2. Draw Candlesticks
    activeCandles.forEach((c, i) => {
      const x = i * candleWidth + bodyPadding;
      const w = candleWidth - (bodyPadding * 2);
      
      const yHigh = getOffsetY(c.high);
      const yLow = getOffsetY(c.low);
      const yOpen = getOffsetY(c.open);
      const yClose = getOffsetY(c.close);
      
      const isBullish = c.close >= c.open;
      const color = isBullish ? '#10b981' : '#ef4444';
      
      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = isMini ? 0.75 : 1;
      ctx.beginPath();
      ctx.moveTo(x + w / 2, yHigh);
      ctx.lineTo(x + w / 2, yLow);
      ctx.stroke();
      
      // Body
      ctx.fillStyle = color;
      const bodyH = Math.max(1.0, Math.abs(yClose - yOpen));
      ctx.fillRect(x, Math.min(yOpen, yClose), w, bodyH);
    });
  }

  // Opens fullscreen lightbox modal displaying larger candlestick chart
  function openChartModal(tf, candles, analysis) {
    const existing = document.getElementById('antigravity-chart-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'antigravity-chart-modal';
    
    const tfNames = {
      '4h': '4 Hours',
      '1h': '1 Hour',
      '15m': '15 Minutes',
      '5m': '5 Minutes',
      '3m': '3 Minutes',
      '1m': '1 Minute'
    };
    const tfName = tfNames[tf] || tf;
    
    modal.innerHTML = `
      <div class="antigravity-modal-content">
        <div class="antigravity-modal-header">
          <span class="antigravity-modal-title">Timeframe Chart: ${tfName}</span>
          <button class="antigravity-modal-close" id="antigravity-modal-close-btn">✕</button>
        </div>
        <div class="antigravity-modal-canvas-wrapper">
          <canvas id="antigravity-modal-canvas" width="660" height="320"></canvas>
        </div>
        <div class="antigravity-modal-footer">
          Close this view by clicking outside or pressing '✕'. Reference levels: 
          <span style="color: #3b82f6; font-weight: 600;">ENTRY (Blue)</span> | 
          <span style="color: #ef4444; font-weight: 600;">SL (Red)</span> | 
          <span style="color: #10b981; font-weight: 600;">TP (Green)</span>
          ${analysis.strategies && analysis.strategies.liquidity ? ` | <span style="color: #fbbf24; font-weight: 600;">BSL (Yellow)</span> | <span style="color: #f97316; font-weight: 600;">SSL (Orange)</span>` : ''}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Draw enlarged candlestick chart
    const canvas = document.getElementById('antigravity-modal-canvas');
    drawCandlestickChart(canvas, candles, analysis, false);
    
    // Event listeners to close modal
    modal.querySelector('#antigravity-modal-close-btn').addEventListener('click', () => {
      modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
  }

  function generatePineScript(result, pair) {
    const isBuy = result.signal === 'BUY';
    return `//@version=5
// Antigravity Trading Edge Setup
indicator("Antigravity Setup: ${pair} - ${result.signal}", overlay=true)

// Level Inputs
entryPrice = input.float(${result.entry.toFixed(2)}, title="Entry Price")
slPrice    = input.float(${result.sl.toFixed(2)}, title="Stop Loss")
tpPrice    = input.float(${result.tp.toFixed(2)}, title="Take Profit")

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
})();
