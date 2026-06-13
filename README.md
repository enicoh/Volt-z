# 🌐 Antigravity Trading Edge

**Antigravity Trading Edge** is an advanced, premium Chromium browser extension trading assistant HUD designed for **TradingView**. It evaluates real-time market data across multiple strategies and multiple timeframes to generate institutional-grade trade setups (Entry, Stop Loss, and Take Profit) directly on your charts.

Equipped with a real-time price tracker, custom audio alerts, and automated Pine Script v5 generation, this extension serves as a fully integrated companion HUD for retail and professional traders looking for a systematic edge on assets like Bitcoin (**BTCUSD**), Gold (**XAUUSD**), and major Forex/Crypto markets.

---

## ✨ Key Features

### 🖥️ Real-Time TradingView HUD Overlay
*   **Draggable HUD Widget**: A sleek, dark-themed, glassmorphic HUD is injected directly onto TradingView charts (`tradingview.com/chart`).
*   **Drag & Minimize**: Drag the HUD to any section of the screen, or collapse/minimize it with a single click to keep your workspace clean.
*   **Visual Guide Lines**: Injects horizontal, colored target lines overlaying the chart viewport for **Entry** (Blue), **Stop Loss** (Red), **Take Profit** (Green), **BSL** (Yellow), and **SSL** (Orange).
*   **Live Price Tracking & Audio Alerts**: Monitors live prices from the TradingView page title and triggers real-time alert banners with distinct sound frequencies for entry hit, profit reached, or invalidation (stop loss) hit.

### 📊 Multi-Timeframe (Multi-TF) Consensus Engine
*   **6-Timeframe Scan**: Simultaneously fetches historical data for 6 intervals: `4H`, `1H`, `15M`, `5M`, `3M`, and `1M`.
*   **Trend Gauge**: Displays live trend alignment dots for all timeframes on the HUD.
*   **Interactive Sparkline Canvas Charts**: Injects 6 real-time miniature candlestick canvases representing each timeframe.
*   **Timeframe Chart Lightbox**: Clicking any sparkline launches an interactive, enlarged chart modal overlay showing the indicators, target zones, and candle details.

### 🧠 8 Advanced Algorithmic Strategies
The core analytical engine processes 100 historical candles from Binance endpoints to calculate:
1.  **Accumulation & Distribution (A/D)**: Evaluates volume flow multipliers and detects bullish accumulation or bearish institutional distribution divergences.
2.  **Supply & Demand Zones (Order Blocks)**: Scans for high-momentum candle imbalances and detects active demand/supply zone touch rejections.
3.  **Support & Resistance (Fractal-Based)**: Finds key horizontal pivot swings, clustering extremes within $0.15\%$ tolerance boundaries.
4.  **Fibonacci Retracement**: Pinpoints swing extremes to identify golden pocket ($0.50$ - $0.618$) tests for pullback setups.
5.  **Price Action Patterns**: Scans active and completed candles for Bullish/Bearish Engulfing, Hammer pinbars, Shooting Stars, and Doji indecision candles.
6.  **Market Structure (SMC)**: Tracks Higher Highs/Lows and Lower Highs/Lows to identify underlying trends and Change of Character (CHoCH) break structures.
7.  **Volume Profile (VPVR)**: Calculates Point of Control (POC), Value Area High (VAH), and Value Area Low (VAL) based on volume-at-price bins.
8.  **Liquidity Analysis (SMC)**: Monitors Buy-Side Liquidity (BSL) and Sell-Side Liquidity (SSL) sweeps alongside unmitigated Fair Value Gaps (FVG).

### 📐 Smart Tools for Execution
*   **Dynamic Risk Calculator**: Computes risk-based position sizing in Lots/Ounces for **XAU/USD**, lots/units for **Forex** (e.g., **EURUSD**, **GBPUSD**), or exact coin sizes for **Crypto** based on account size ($) and risk percentage (%).
*   **Pine Script Generator**: Generates custom Pine Script v5 code matching the exact calculated setup parameters. Traders can instantly copy and paste it into the TradingView Pine Editor to shade profit/loss zones.
*   **1-Click Clipboard Copies**: Clickable copy icons next to Entry, SL, and TP prices for immediate use in brokers or terminals.

---

## 🛠️ File Structure

The project is structured as follows:

*   **`manifest.json`**: Extension configuration defining manifest V3 settings, host permissions for Binance API, page matches for TradingView chart injection, and scripts.
*   **`analysisEngine.js`**: The algorithmic core class `TradingAnalysisEngine`. Downloads historical data, implements the 8 strategy logics, compiles consensus signals, and calculates ATR-based stop-loss ranges.
*   **`background.js`**: Background service worker monitoring extension installation, initializing default configuration states, and handling runtime API messaging.
*   **`popup.html` / `popup.js` / `popup.css`**: The modern extension popup interface. Features dark glass aesthetics, asset pair configuration dropdowns, auto-strategy toggles, risk parameters, and instant analysis triggers.
*   **`content.js` / `content.css`**: Injected script and styles. Constructs the interactive HUD DOM elements, executes Canvas renders, sets up dragging events, runs the live price tracker loop, and generates alert sounds.
*   **`icons/`**: Directory containing extension identity icons (`icon16.png`, `icon32.png`, `icon48.png`, `icon128.png`).

---

## 🚀 Installation Guide

Since this extension is in development and not hosted on the Chrome Web Store, you can load it locally:

1.  **Clone or Download this Repository** to your local machine.
2.  Open your Chromium-based browser (Google Chrome, Brave, Edge, Opera).
3.  Navigate to the extensions page by typing `chrome://extensions/` in the address bar.
4.  Enable **Developer Mode** by toggling the switch in the top-right corner.
5.  Click on the **Load unpacked** button in the top-left corner.
6.  Select the directory containing the extension files (where `manifest.json` is located).
7.  The **Antigravity Trading Edge** extension will appear in your extensions bar! Pin it for quick access.

---

## 📈 Usage Instructions

1.  **Open the Popup**: Click the extension icon.
2.  **Configure Parameters**:
    *   Select your target pair (e.g., `🪙 XAU/USD` or `₿ BTC/USD`).
    *   Enable **Auto Select** to let the extension load the optimal strategies for that specific asset, or disable it to manually select strategies.
    *   Input your **Account Size** and **Risk %** for automatic position size calculations.
3.  **Generate Fast Analysis**: Click **DECIDE** to run calculations instantly inside the popup.
4.  **Launch TradingView Overlay**: Click **Multi-TF HUD**. This will automatically scan all 6 timeframes, save the results, and open the active TradingView chart.
5.  **Interact with the HUD**:
    *   Once on TradingView, the HUD will appear.
    *   Click on any of the **Timeframe sparkline charts** to open a modal view.
    *   Hover over or copy the calculated levels.
    *   Click **Copy Pine Script Code** to copy the indicator script, then paste it directly into TradingView's Pine Editor to plot the zones directly on your main chart.
    *   Observe live price updates; you will hear beeps and see alerts when target levels are hit.

---

## 🔬 Mathematical & Strategic Logic

### Consensus Aggregation
Each selected strategy votes `BUY`, `SELL`, or `NEUTRAL` based on local indicators. The Consensus Engine:
*   Aggregates votes.
*   Determines confidence ratings on a 1–5 scale based on the ratio of active signals to total active strategies.
*   Sets the Order Type (`Buy Limit`, `Sell Limit`, or `Market Neutral`).

### ATR-Based Target Placement
To adapt to market volatility, the stop-loss is placed relative to average true range (ATR) levels:
$$\text{ATR} = \frac{1}{n} \sum_{i=1}^{n} (\text{High}_i - \text{Low}_i)$$
*   **Stop Loss (SL)** is placed below the nearest support (for BUYs) or above the nearest resistance (for SELLs) with a buffer of $0.8 \times \text{ATR}$.
*   **Take Profit (TP)** targets are projected to achieve a strict minimum of a **1:2 Risk-to-Reward ratio** relative to the entry price.

---

## 🔒 Security & Privacy
This extension fetches market candlestick data directly from public Binance endpoints. No personal data, api keys, credentials, or charting layouts are sent to external servers. All states are stored locally in `chrome.storage.local`.
