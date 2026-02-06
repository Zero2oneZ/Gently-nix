// GentlyOS TradingView Client - Real-time DOM Manipulation & PineScript Injection
// Chart data extraction, strategy building, and live trading integration

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

// TradingView connection states
const TV_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  AUTHENTICATED: 'authenticated',
  ERROR: 'error',
};

// Chart timeframes
const TIMEFRAME = {
  M1: '1',
  M5: '5',
  M15: '15',
  M30: '30',
  H1: '60',
  H4: '240',
  D1: '1D',
  W1: '1W',
  MN: '1M',
};

// Chart types
const CHART_TYPE = {
  CANDLES: 'Candles',
  BARS: 'Bars',
  LINE: 'Line',
  AREA: 'Area',
  HEIKIN_ASHI: 'Heikin Ashi',
  HOLLOW_CANDLES: 'Hollow Candles',
  RENKO: 'Renko',
  KAGI: 'Kagi',
  POINT_FIGURE: 'Point & Figure',
};

// Indicator categories
const INDICATOR_CATEGORY = {
  TREND: 'trend',
  MOMENTUM: 'momentum',
  VOLATILITY: 'volatility',
  VOLUME: 'volume',
  CUSTOM: 'custom',
};

// Order types for strategy
const ORDER_TYPE = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit',
};

// Position side
const POSITION_SIDE = {
  LONG: 'long',
  SHORT: 'short',
};

// PineScript templates
const PINESCRIPT_TEMPLATES = {
  basic_strategy: `
//@version=5
strategy("{{name}}", overlay=true, initial_capital={{capital}}, default_qty_type=strategy.percent_of_equity, default_qty_value={{qty}})

// Inputs
length = input.int({{length}}, "Length", minval=1)
src = input.source(close, "Source")

// Calculations
sma_fast = ta.sma(src, length)
sma_slow = ta.sma(src, length * 2)

// Conditions
longCondition = ta.crossover(sma_fast, sma_slow)
shortCondition = ta.crossunder(sma_fast, sma_slow)

// Entries
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)

// Plots
plot(sma_fast, color=color.blue, title="Fast SMA")
plot(sma_slow, color=color.red, title="Slow SMA")
`,

  rsi_strategy: `
//@version=5
strategy("RSI Strategy - {{name}}", overlay=false, initial_capital={{capital}})

// Inputs
rsi_length = input.int({{rsi_length}}, "RSI Length", minval=1)
overbought = input.int({{overbought}}, "Overbought", minval=50, maxval=100)
oversold = input.int({{oversold}}, "Oversold", minval=0, maxval=50)

// RSI Calculation
rsi = ta.rsi(close, rsi_length)

// Conditions
longCondition = ta.crossover(rsi, oversold)
shortCondition = ta.crossunder(rsi, overbought)

// Entries
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)

// Plots
plot(rsi, color=color.purple, title="RSI")
hline(overbought, color=color.red, linestyle=hline.style_dashed)
hline(oversold, color=color.green, linestyle=hline.style_dashed)
`,

  macd_strategy: `
//@version=5
strategy("MACD Strategy - {{name}}", overlay=false, initial_capital={{capital}})

// Inputs
fast_length = input.int({{fast}}, "Fast Length")
slow_length = input.int({{slow}}, "Slow Length")
signal_length = input.int({{signal}}, "Signal Length")

// MACD Calculation
[macdLine, signalLine, histLine] = ta.macd(close, fast_length, slow_length, signal_length)

// Conditions
longCondition = ta.crossover(macdLine, signalLine)
shortCondition = ta.crossunder(macdLine, signalLine)

// Entries
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)

// Plots
plot(macdLine, color=color.blue, title="MACD")
plot(signalLine, color=color.orange, title="Signal")
plot(histLine, style=plot.style_histogram, color=histLine >= 0 ? color.green : color.red, title="Histogram")
`,

  bollinger_strategy: `
//@version=5
strategy("Bollinger Bands - {{name}}", overlay=true, initial_capital={{capital}})

// Inputs
length = input.int({{length}}, "Length")
mult = input.float({{mult}}, "StdDev Multiplier")

// Bollinger Bands
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev

// Conditions
longCondition = ta.crossover(close, lower)
shortCondition = ta.crossunder(close, upper)

// Entries
if longCondition
    strategy.entry("Long", strategy.long)
if shortCondition
    strategy.entry("Short", strategy.short)

// Plots
plot(basis, color=color.orange, title="Basis")
plot(upper, color=color.blue, title="Upper")
plot(lower, color=color.blue, title="Lower")
fill(plot(upper), plot(lower), color=color.new(color.blue, 90))
`,

  custom_indicator: `
//@version=5
indicator("{{name}}", overlay={{overlay}})

// Inputs
{{inputs}}

// Calculations
{{calculations}}

// Plots
{{plots}}
`,
};

// OHLCV data point
class OHLCVData {
  constructor(data = {}) {
    this.timestamp = data.timestamp || Date.now();
    this.open = data.open || 0;
    this.high = data.high || 0;
    this.low = data.low || 0;
    this.close = data.close || 0;
    this.volume = data.volume || 0;
  }

  toArray() {
    return [this.timestamp, this.open, this.high, this.low, this.close, this.volume];
  }

  toCSV() {
    const date = new Date(this.timestamp).toISOString();
    return `${date},${this.open},${this.high},${this.low},${this.close},${this.volume}`;
  }
}

// Chart data container
class ChartData {
  constructor(config = {}) {
    this.symbol = config.symbol || 'UNKNOWN';
    this.timeframe = config.timeframe || TIMEFRAME.H1;
    this.data = [];  // Array of OHLCVData
    this.indicators = {};  // indicator_name -> values array
    this.drawings = [];  // Trend lines, fib levels, etc.
  }

  addCandle(candle) {
    if (!(candle instanceof OHLCVData)) {
      candle = new OHLCVData(candle);
    }
    this.data.push(candle);
  }

  getLastN(n) {
    return this.data.slice(-n);
  }

  toCSV(includeIndicators = false) {
    let headers = 'timestamp,open,high,low,close,volume';
    if (includeIndicators) {
      headers += ',' + Object.keys(this.indicators).join(',');
    }

    const rows = this.data.map((candle, i) => {
      let row = candle.toCSV();
      if (includeIndicators) {
        Object.values(this.indicators).forEach(ind => {
          row += ',' + (ind[i] !== undefined ? ind[i] : '');
        });
      }
      return row;
    });

    return headers + '\n' + rows.join('\n');
  }

  toJSON() {
    return {
      symbol: this.symbol,
      timeframe: this.timeframe,
      candles: this.data.length,
      data: this.data.map(d => d.toArray()),
      indicators: this.indicators,
    };
  }
}

// Strategy configuration
class StrategyConfig {
  constructor(config = {}) {
    this.id = config.id || `strategy_${Date.now()}`;
    this.name = config.name || 'Untitled Strategy';
    this.symbol = config.symbol || 'BTCUSD';
    this.timeframe = config.timeframe || TIMEFRAME.H1;
    this.capital = config.capital || 10000;
    this.positionSize = config.positionSize || 10;  // percent
    this.stopLoss = config.stopLoss || null;
    this.takeProfit = config.takeProfit || null;
    this.maxDrawdown = config.maxDrawdown || 20;
    this.template = config.template || 'basic_strategy';
    this.parameters = config.parameters || {};
    this.pineScript = config.pineScript || '';
    this.enabled = config.enabled || false;
    this.createdAt = config.createdAt || Date.now();
  }

  generatePineScript() {
    let script = PINESCRIPT_TEMPLATES[this.template] || PINESCRIPT_TEMPLATES.basic_strategy;

    // Replace placeholders
    script = script.replace(/\{\{name\}\}/g, this.name);
    script = script.replace(/\{\{capital\}\}/g, this.capital);
    script = script.replace(/\{\{qty\}\}/g, this.positionSize);

    // Replace parameter placeholders
    Object.entries(this.parameters).forEach(([key, value]) => {
      script = script.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    this.pineScript = script;
    return script;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      timeframe: this.timeframe,
      capital: this.capital,
      positionSize: this.positionSize,
      stopLoss: this.stopLoss,
      takeProfit: this.takeProfit,
      maxDrawdown: this.maxDrawdown,
      template: this.template,
      parameters: this.parameters,
      pineScript: this.pineScript,
      enabled: this.enabled,
      createdAt: this.createdAt,
    };
  }
}

// Backtest results
class BacktestResult {
  constructor(data = {}) {
    this.strategyId = data.strategyId;
    this.symbol = data.symbol;
    this.timeframe = data.timeframe;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.initialCapital = data.initialCapital || 10000;
    this.finalCapital = data.finalCapital || 10000;
    this.totalTrades = data.totalTrades || 0;
    this.winningTrades = data.winningTrades || 0;
    this.losingTrades = data.losingTrades || 0;
    this.winRate = data.winRate || 0;
    this.profitFactor = data.profitFactor || 0;
    this.maxDrawdown = data.maxDrawdown || 0;
    this.sharpeRatio = data.sharpeRatio || 0;
    this.trades = data.trades || [];
    this.equityCurve = data.equityCurve || [];
  }

  get netProfit() {
    return this.finalCapital - this.initialCapital;
  }

  get netProfitPercent() {
    return ((this.finalCapital - this.initialCapital) / this.initialCapital) * 100;
  }

  toJSON() {
    return {
      strategyId: this.strategyId,
      symbol: this.symbol,
      timeframe: this.timeframe,
      startDate: this.startDate,
      endDate: this.endDate,
      initialCapital: this.initialCapital,
      finalCapital: this.finalCapital,
      netProfit: this.netProfit,
      netProfitPercent: this.netProfitPercent,
      totalTrades: this.totalTrades,
      winningTrades: this.winningTrades,
      losingTrades: this.losingTrades,
      winRate: this.winRate,
      profitFactor: this.profitFactor,
      maxDrawdown: this.maxDrawdown,
      sharpeRatio: this.sharpeRatio,
    };
  }
}

// DOM selectors for TradingView elements
const TV_SELECTORS = {
  // Main containers
  chart: '.chart-container',
  chartCanvas: 'canvas.chart-markup-table',
  priceScale: '.price-axis',
  timeScale: '.time-axis',

  // Header elements
  symbolInput: 'input[data-role="search"]',
  symbolName: '.chart-widget .title',
  currentPrice: '.chart-widget .price',
  priceChange: '.chart-widget .change',

  // Toolbar
  timeframeSelector: '[data-name="time-interval-button"]',
  chartTypeButton: '[data-name="chart-type-button"]',
  indicatorButton: '[data-name="indicators"]',
  strategyButton: '[data-name="strategy-tester"]',
  replayButton: '[data-name="replay-button"]',

  // Pine Editor
  pineEditor: '.pine-editor',
  pineEditorTextarea: '.pine-editor textarea',
  pineEditorSave: '[data-name="save"]',
  pineEditorCompile: '[data-name="compile"]',
  pineOutput: '.pine-output',

  // Strategy tester
  strategyTester: '.backtesting-root',
  strategyOverview: '.report-tabs-overview',
  strategyTrades: '.report-tabs-trades',
  strategyEquity: '.equity-curve',

  // Order panel
  orderPanel: '.order-panel',
  orderSide: '.order-side',
  orderType: '.order-type',
  orderQuantity: '.order-quantity',
  orderPrice: '.order-price',
  orderSubmit: '.order-submit',

  // Watchlist
  watchlist: '.watchlist',
  watchlistItem: '.watchlist-item',

  // Drawing tools
  drawingToolbar: '.drawing-toolbar',
  trendLine: '[data-name="trend-line"]',
  horizontalLine: '[data-name="horizontal-line"]',
  fibRetracement: '[data-name="fib-retracement"]',
};

// Main TradingView client
class TradingViewClient extends EventEmitter {
  constructor(config = {}) {
    super();
    this.state = TV_STATE.DISCONNECTED;
    this.webContents = null;  // Electron webContents reference
    this.currentSymbol = config.symbol || 'BTCUSD';
    this.currentTimeframe = config.timeframe || TIMEFRAME.H1;
    this.chartData = new Map();  // symbol -> ChartData
    this.strategies = new Map();  // id -> StrategyConfig
    this.backtestResults = new Map();  // strategyId -> BacktestResult
    this.watchlist = [];
    this.dataPollingInterval = null;
    this.pollingRate = config.pollingRate || 1000;  // ms

    // DOM injection state
    this.injected = false;
    this.observers = [];
  }

  // Connect to TradingView webview
  async connect(webContents) {
    this.webContents = webContents;
    this.state = TV_STATE.CONNECTING;
    this.emit('state', this.state);

    try {
      // Wait for TradingView to load
      await this._waitForLoad();

      // Inject our DOM manipulation scripts
      await this._injectScripts();

      this.state = TV_STATE.CONNECTED;
      this.emit('state', this.state);
      this.emit('connected');

      // Start data polling
      this._startDataPolling();

      return { success: true };
    } catch (e) {
      this.state = TV_STATE.ERROR;
      this.emit('error', { message: e.message });
      return { success: false, error: e.message };
    }
  }

  // Wait for TradingView chart to load
  async _waitForLoad() {
    return this._executeJS(`
      new Promise((resolve, reject) => {
        let attempts = 0;
        const check = () => {
          attempts++;
          if (document.querySelector('${TV_SELECTORS.chart}')) {
            resolve(true);
          } else if (attempts > 30) {
            reject(new Error('TradingView chart not found'));
          } else {
            setTimeout(check, 500);
          }
        };
        check();
      });
    `);
  }

  // Inject DOM manipulation scripts
  async _injectScripts() {
    const injectionScript = `
      (function() {
        if (window.__gentlyTV) return;
        window.__gentlyTV = {
          // Extract OHLCV data from chart
          getChartData: function() {
            try {
              // Access TradingView's internal data
              const chart = document.querySelector('${TV_SELECTORS.chart}');
              if (!chart) return null;

              // Try to access widget API if available
              if (window.tvWidget && window.tvWidget.activeChart) {
                const series = window.tvWidget.activeChart().getSeries();
                if (series) {
                  const data = series.data();
                  return {
                    symbol: series.symbol(),
                    resolution: series.resolution(),
                    data: data.map(bar => ({
                      timestamp: bar.time * 1000,
                      open: bar.open,
                      high: bar.high,
                      low: bar.low,
                      close: bar.close,
                      volume: bar.volume || 0
                    }))
                  };
                }
              }

              // Fallback: parse from DOM
              return this.parseChartDOM();
            } catch(e) {
              console.error('getChartData error:', e);
              return null;
            }
          },

          // Parse chart data from DOM (fallback)
          parseChartDOM: function() {
            const priceEl = document.querySelector('${TV_SELECTORS.currentPrice}');
            const symbolEl = document.querySelector('${TV_SELECTORS.symbolName}');
            return {
              symbol: symbolEl ? symbolEl.textContent : 'UNKNOWN',
              currentPrice: priceEl ? parseFloat(priceEl.textContent.replace(/[^0-9.-]/g, '')) : 0,
              timestamp: Date.now()
            };
          },

          // Get current symbol info
          getSymbolInfo: function() {
            const symbolEl = document.querySelector('${TV_SELECTORS.symbolName}');
            const priceEl = document.querySelector('${TV_SELECTORS.currentPrice}');
            const changeEl = document.querySelector('${TV_SELECTORS.priceChange}');

            return {
              symbol: symbolEl ? symbolEl.textContent.trim() : '',
              price: priceEl ? priceEl.textContent.trim() : '',
              change: changeEl ? changeEl.textContent.trim() : ''
            };
          },

          // Change symbol
          setSymbol: function(symbol) {
            const input = document.querySelector('${TV_SELECTORS.symbolInput}');
            if (input) {
              input.focus();
              input.value = symbol;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              setTimeout(() => {
                const enterEvent = new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13 });
                input.dispatchEvent(enterEvent);
              }, 500);
              return true;
            }
            return false;
          },

          // Change timeframe
          setTimeframe: function(tf) {
            const btn = document.querySelector('${TV_SELECTORS.timeframeSelector}');
            if (btn) {
              btn.click();
              setTimeout(() => {
                const option = document.querySelector('[data-value="' + tf + '"]');
                if (option) option.click();
              }, 200);
              return true;
            }
            return false;
          },

          // Open Pine Editor
          openPineEditor: function() {
            const btn = document.querySelector('[data-name="scripteditor"]');
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          },

          // Inject PineScript code
          injectPineScript: function(code) {
            const editor = document.querySelector('${TV_SELECTORS.pineEditorTextarea}');
            if (editor) {
              editor.value = code;
              editor.dispatchEvent(new Event('input', { bubbles: true }));
              return true;
            }

            // Try CodeMirror
            const cm = document.querySelector('.CodeMirror');
            if (cm && cm.CodeMirror) {
              cm.CodeMirror.setValue(code);
              return true;
            }

            return false;
          },

          // Compile Pine Script
          compilePineScript: function() {
            const compileBtn = document.querySelector('${TV_SELECTORS.pineEditorCompile}');
            if (compileBtn) {
              compileBtn.click();
              return true;
            }

            // Try keyboard shortcut
            const event = new KeyboardEvent('keydown', {
              key: 's',
              code: 'KeyS',
              ctrlKey: true,
              bubbles: true
            });
            document.dispatchEvent(event);
            return true;
          },

          // Get Pine Script errors
          getPineErrors: function() {
            const output = document.querySelector('${TV_SELECTORS.pineOutput}');
            if (output) {
              const errors = output.querySelectorAll('.error');
              return Array.from(errors).map(e => e.textContent);
            }
            return [];
          },

          // Open Strategy Tester
          openStrategyTester: function() {
            const btn = document.querySelector('${TV_SELECTORS.strategyButton}');
            if (btn) {
              btn.click();
              return true;
            }
            return false;
          },

          // Get Strategy Tester results
          getStrategyResults: function() {
            const tester = document.querySelector('${TV_SELECTORS.strategyTester}');
            if (!tester) return null;

            const parseValue = (selector) => {
              const el = tester.querySelector(selector);
              return el ? el.textContent.trim() : '';
            };

            return {
              netProfit: parseValue('.net-profit'),
              totalTrades: parseValue('.total-trades'),
              winRate: parseValue('.win-rate'),
              profitFactor: parseValue('.profit-factor'),
              maxDrawdown: parseValue('.max-drawdown'),
              sharpeRatio: parseValue('.sharpe-ratio')
            };
          },

          // Add indicator
          addIndicator: function(name) {
            const btn = document.querySelector('${TV_SELECTORS.indicatorButton}');
            if (btn) {
              btn.click();
              setTimeout(() => {
                const searchInput = document.querySelector('.tv-dialog input[type="text"]');
                if (searchInput) {
                  searchInput.value = name;
                  searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                  setTimeout(() => {
                    const firstResult = document.querySelector('.tv-dialog .item');
                    if (firstResult) firstResult.click();
                  }, 300);
                }
              }, 200);
              return true;
            }
            return false;
          },

          // Set up mutation observer for real-time updates
          setupObserver: function(callback) {
            const chart = document.querySelector('${TV_SELECTORS.chart}');
            if (!chart) return false;

            const observer = new MutationObserver((mutations) => {
              const data = this.getChartData();
              if (data && typeof callback === 'function') {
                callback(data);
              }
            });

            observer.observe(chart, {
              childList: true,
              subtree: true,
              attributes: true
            });

            return true;
          },

          // Take chart screenshot
          captureChart: function() {
            const canvas = document.querySelector('${TV_SELECTORS.chartCanvas}');
            if (canvas) {
              return canvas.toDataURL('image/png');
            }
            return null;
          },

          // Get watchlist
          getWatchlist: function() {
            const items = document.querySelectorAll('${TV_SELECTORS.watchlistItem}');
            return Array.from(items).map(item => {
              const symbol = item.querySelector('.symbol-name');
              const price = item.querySelector('.price');
              const change = item.querySelector('.change');
              return {
                symbol: symbol ? symbol.textContent : '',
                price: price ? price.textContent : '',
                change: change ? change.textContent : ''
              };
            });
          },

          // Draw trend line
          drawTrendLine: function(x1, y1, x2, y2) {
            // This would need TradingView's drawing API
            return false;
          }
        };

        console.log('[Gently] TradingView DOM integration loaded');
      })();
    `;

    await this._executeJS(injectionScript);
    this.injected = true;
    this.emit('injected');
  }

  // Execute JavaScript in webview
  async _executeJS(code) {
    if (!this.webContents) {
      throw new Error('No webContents connected');
    }
    return this.webContents.executeJavaScript(code);
  }

  // Start polling for chart data
  _startDataPolling() {
    if (this.dataPollingInterval) {
      clearInterval(this.dataPollingInterval);
    }

    this.dataPollingInterval = setInterval(async () => {
      try {
        const data = await this.getChartData();
        if (data) {
          this.emit('chartData', data);
        }
      } catch (e) {
        // Ignore polling errors
      }
    }, this.pollingRate);
  }

  // Stop data polling
  _stopDataPolling() {
    if (this.dataPollingInterval) {
      clearInterval(this.dataPollingInterval);
      this.dataPollingInterval = null;
    }
  }

  // Get current chart data
  async getChartData() {
    if (!this.injected) return null;
    return this._executeJS('window.__gentlyTV.getChartData()');
  }

  // Get symbol info
  async getSymbolInfo() {
    if (!this.injected) return null;
    return this._executeJS('window.__gentlyTV.getSymbolInfo()');
  }

  // Set symbol
  async setSymbol(symbol) {
    if (!this.injected) return false;
    this.currentSymbol = symbol;
    return this._executeJS(`window.__gentlyTV.setSymbol('${symbol}')`);
  }

  // Set timeframe
  async setTimeframe(timeframe) {
    if (!this.injected) return false;
    this.currentTimeframe = timeframe;
    return this._executeJS(`window.__gentlyTV.setTimeframe('${timeframe}')`);
  }

  // Inject PineScript
  async injectPineScript(code) {
    if (!this.injected) return { success: false, error: 'Not connected' };

    // Open Pine Editor first
    await this._executeJS('window.__gentlyTV.openPineEditor()');
    await this._sleep(500);

    // Inject the code
    const escaped = code.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
    const injected = await this._executeJS(`window.__gentlyTV.injectPineScript('${escaped}')`);

    if (!injected) {
      return { success: false, error: 'Failed to inject code' };
    }

    // Compile
    await this._sleep(200);
    await this._executeJS('window.__gentlyTV.compilePineScript()');
    await this._sleep(1000);

    // Check for errors
    const errors = await this._executeJS('window.__gentlyTV.getPineErrors()');

    this.emit('pineInjected', { code, errors });

    return {
      success: errors.length === 0,
      errors
    };
  }

  // Create strategy from template
  createStrategy(config = {}) {
    const strategy = new StrategyConfig(config);
    strategy.generatePineScript();
    this.strategies.set(strategy.id, strategy);
    this.emit('strategyCreated', strategy.toJSON());
    return strategy;
  }

  // Get strategy
  getStrategy(strategyId) {
    return this.strategies.get(strategyId);
  }

  // List strategies
  listStrategies() {
    return Array.from(this.strategies.values()).map(s => s.toJSON());
  }

  // Delete strategy
  deleteStrategy(strategyId) {
    return this.strategies.delete(strategyId);
  }

  // Deploy strategy to TradingView
  async deployStrategy(strategyId) {
    const strategy = this.strategies.get(strategyId);
    if (!strategy) {
      return { success: false, error: 'Strategy not found' };
    }

    if (!strategy.pineScript) {
      strategy.generatePineScript();
    }

    const result = await this.injectPineScript(strategy.pineScript);

    if (result.success) {
      strategy.enabled = true;
      this.emit('strategyDeployed', { strategyId, symbol: strategy.symbol });
    }

    return result;
  }

  // Get strategy tester results
  async getStrategyResults() {
    if (!this.injected) return null;

    // Open strategy tester
    await this._executeJS('window.__gentlyTV.openStrategyTester()');
    await this._sleep(500);

    return this._executeJS('window.__gentlyTV.getStrategyResults()');
  }

  // Export chart data to CSV
  async exportToCSV(filename) {
    const data = await this.getChartData();
    if (!data || !data.data) {
      return { success: false, error: 'No data available' };
    }

    const chartData = new ChartData({
      symbol: data.symbol,
      timeframe: data.resolution
    });

    data.data.forEach(d => chartData.addCandle(d));

    const csv = chartData.toCSV(true);
    const filePath = filename || path.join(process.env.HOME, 'Downloads', `${data.symbol}_${Date.now()}.csv`);

    fs.writeFileSync(filePath, csv);

    this.emit('exported', { filePath, rows: data.data.length });
    return { success: true, filePath, rows: data.data.length };
  }

  // Get CSV string for chat display
  async getCSVString(limit = 100) {
    const data = await this.getChartData();
    if (!data || !data.data) {
      return null;
    }

    const chartData = new ChartData({
      symbol: data.symbol,
      timeframe: data.resolution
    });

    const sliced = data.data.slice(-limit);
    sliced.forEach(d => chartData.addCandle(d));

    return {
      symbol: data.symbol,
      timeframe: data.resolution,
      rows: sliced.length,
      csv: chartData.toCSV()
    };
  }

  // Add indicator
  async addIndicator(name) {
    if (!this.injected) return false;
    return this._executeJS(`window.__gentlyTV.addIndicator('${name}')`);
  }

  // Get watchlist
  async getWatchlist() {
    if (!this.injected) return [];
    const list = await this._executeJS('window.__gentlyTV.getWatchlist()');
    this.watchlist = list || [];
    return this.watchlist;
  }

  // Capture chart screenshot
  async captureChart() {
    if (!this.injected) return null;
    return this._executeJS('window.__gentlyTV.captureChart()');
  }

  // Get available templates
  getTemplates() {
    return Object.keys(PINESCRIPT_TEMPLATES);
  }

  // Get template code
  getTemplateCode(templateName) {
    return PINESCRIPT_TEMPLATES[templateName] || null;
  }

  // Helper: sleep
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Disconnect
  disconnect() {
    this._stopDataPolling();
    this.webContents = null;
    this.state = TV_STATE.DISCONNECTED;
    this.injected = false;
    this.emit('disconnected');
  }

  // Get status
  getStatus() {
    return {
      state: this.state,
      connected: this.state === TV_STATE.CONNECTED || this.state === TV_STATE.AUTHENTICATED,
      injected: this.injected,
      currentSymbol: this.currentSymbol,
      currentTimeframe: this.currentTimeframe,
      strategyCount: this.strategies.size,
      watchlistCount: this.watchlist.length,
      pollingRate: this.pollingRate,
    };
  }

  // Get constants
  getConstants() {
    return {
      TV_STATE,
      TIMEFRAME,
      CHART_TYPE,
      INDICATOR_CATEGORY,
      ORDER_TYPE,
      POSITION_SIDE,
    };
  }

  // Cleanup
  cleanup() {
    this.disconnect();
    this.strategies.clear();
    this.backtestResults.clear();
    this.chartData.clear();
  }
}

module.exports = {
  TradingViewClient,
  ChartData,
  OHLCVData,
  StrategyConfig,
  BacktestResult,
  TV_STATE,
  TIMEFRAME,
  CHART_TYPE,
  INDICATOR_CATEGORY,
  ORDER_TYPE,
  POSITION_SIDE,
  PINESCRIPT_TEMPLATES,
  TV_SELECTORS,
};
