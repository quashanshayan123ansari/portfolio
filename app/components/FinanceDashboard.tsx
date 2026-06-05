"use client";

import { useState, useMemo, useEffect } from "react";

// Types
type StockType = string;

interface Asset {
  ticker: string;
  expectedReturn: number; // in decimal (e.g. 0.15 for 15%)
  volatility: number;     // in decimal (e.g. 0.22 for 22%)
  currentPrice?: number;
  currency?: string;
  fullName?: string;
}

// Seeded pseudorandom number generator (Linear Congruential Generator)
function createSeededRandom(seed: number) {
  let s = seed;
  return function() {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// Box-Muller transform for normal distribution sampling
function boxMuller(rand: () => number, mean: number, stdDev: number) {
  let u = 0, v = 0;
  while (u === 0) u = rand(); 
  while (v === 0) v = rand();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

const formatCurrencyVal = (val: number, currency: string = "USD") => {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency: currency,
    maximumFractionDigits: 0
  }).format(val);
};

const searchStock = async (query: string, region: "US" | "IN") => {
  let q = query.trim();
  if (!q) return [];
  const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10`;
  const targetUrl = typeof window === 'undefined' ? url : `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) return [];
    const data = await res.json();
    return data.quotes || [];
  } catch (err) {
    console.error("Search failed:", err);
    return [];
  }
};

const fetchStockQuote = async (symbol: string) => {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
  const targetUrl = typeof window === 'undefined' ? url : `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(targetUrl);
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart?.result?.[0];
    if (!result) return null;
    
    const meta = result.meta;
    return {
      regularMarketPrice: meta.regularMarketPrice,
      fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: meta.fiftyTwoWeekLow,
      currency: meta.currency,
      longName: meta.longName || meta.shortName || symbol,
      shortName: meta.shortName || symbol,
      twoHundredDayAverage: meta.twoHundredDayAverage
    };
  } catch (err) {
    console.error("Quote fetch failed:", err);
    return null;
  }
};

const US_OPT_ASSETS: Asset[] = [
  { ticker: "AAPL", expectedReturn: 0.15, volatility: 0.22 },
  { ticker: "MSFT", expectedReturn: 0.14, volatility: 0.20 },
  { ticker: "GOOGL", expectedReturn: 0.12, volatility: 0.25 },
  { ticker: "NVDA", expectedReturn: 0.24, volatility: 0.38 },
  { ticker: "BTC-USD", expectedReturn: 0.40, volatility: 0.55 }
];
const IN_OPT_ASSETS: Asset[] = [
  { ticker: "RELIANCE.NS", expectedReturn: 0.16, volatility: 0.18 },
  { ticker: "TCS.NS", expectedReturn: 0.14, volatility: 0.16 },
  { ticker: "HDFCBANK.NS", expectedReturn: 0.13, volatility: 0.15 },
  { ticker: "INFY.NS", expectedReturn: 0.15, volatility: 0.19 },
  { ticker: "TATAMOTORS.NS", expectedReturn: 0.18, volatility: 0.25 },
  { ticker: "^NSEI", expectedReturn: 0.12, volatility: 0.12 }
];

export default function FinanceDashboard() {
  // --- MARKET REGION TOGGLE ---
  const [marketRegion, setMarketRegion] = useState<"US" | "IN">("US");

  // --- SUB-DASHBOARD TAB SELECTION ---
  const [dashboardTab, setDashboardTab] = useState<"wealth" | "optimization">("wealth");

  // ==========================================
  // TAB 1 & 2 UNIFIED STATES & SYNC HOOKS
  // ==========================================
  const [optAssetsUS, setOptAssetsUS] = useState<Asset[]>(US_OPT_ASSETS);
  const [optAssetsIN, setOptAssetsIN] = useState<Asset[]>(IN_OPT_ASSETS);

  const [optWeightsUS, setOptWeightsUS] = useState<Record<string, number>>({
    AAPL: 20, MSFT: 20, GOOGL: 20, NVDA: 20, "BTC-USD": 20
  });

  const [optWeightsIN, setOptWeightsIN] = useState<Record<string, number>>({
    "RELIANCE.NS": 17, "TCS.NS": 17, "HDFCBANK.NS": 17, "INFY.NS": 17, "TATAMOTORS.NS": 16, "^NSEI": 16
  });

  const optAssets = marketRegion === "US" ? optAssetsUS : optAssetsIN;
  const setOptAssets = marketRegion === "US" ? setOptAssetsUS : setOptAssetsIN;

  const optWeights = marketRegion === "US" ? optWeightsUS : optWeightsIN;
  const setOptWeights = marketRegion === "US" ? setOptWeightsUS : setOptWeightsIN;

  const [wealthWeightsUS, setWealthWeightsUS] = useState<Record<string, number>>({
    AAPL: 20, MSFT: 20, GOOGL: 20, NVDA: 20, "BTC-USD": 20
  });

  const [wealthWeightsIN, setWealthWeightsIN] = useState<Record<string, number>>({
    "RELIANCE.NS": 25, "TCS.NS": 25, "HDFCBANK.NS": 25, "INFY.NS": 25
  });

  const weights = marketRegion === "US" ? wealthWeightsUS : wealthWeightsIN;
  const setWeights = marketRegion === "US" ? setWealthWeightsUS : setWealthWeightsIN;

  const [newTicker, setNewTicker] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [avgCorrelation, setAvgCorrelation] = useState(0.40);
  const [riskFreeRate, setRiskFreeRate] = useState(0.04);
  const [optMethod, setOptMethod] = useState<"custom" | "max_sharpe" | "min_vol" | "risk_parity" | "equal_weight">("equal_weight");

  const [initialCapital, setInitialCapital] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [horizon, setHorizon] = useState(10);
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  const formatCurrency = (val: number) => {
    return formatCurrencyVal(val, marketRegion === "IN" ? "INR" : "USD");
  };

  // Keep wealth weights synced when list changes
  useEffect(() => {
    const defaultWeight = 100 / optAssets.length;
    const updatedWeights: Record<string, number> = {};
    optAssets.forEach(asset => {
      updatedWeights[asset.ticker] = weights[asset.ticker] !== undefined ? weights[asset.ticker] : defaultWeight;
    });
    setWeights(updatedWeights);
  }, [optAssets]);

  // Keep asset weights synced when list changes
  useEffect(() => {
    const defaultWeight = 100 / optAssets.length;
    const updatedWeights: Record<string, number> = {};
    optAssets.forEach(asset => {
      updatedWeights[asset.ticker] = optWeights[asset.ticker] !== undefined ? optWeights[asset.ticker] : defaultWeight;
    });
    setOptWeights(updatedWeights);
  }, [optAssets]);

  // Fetch live quotes for active assets in background on mount / region toggle
  useEffect(() => {
    let active = true;
    const loadQuotes = async () => {
      const updatedAssets = await Promise.all(
        optAssets.map(async (asset) => {
          if (asset.currentPrice) return asset; // Skip fetching if already loaded
          const quote = await fetchStockQuote(asset.ticker);
          if (quote && active) {
            const price = quote.regularMarketPrice || asset.currentPrice || 100;
            const high52 = quote.fiftyTwoWeekHigh || price * 1.2;
            const low52 = quote.fiftyTwoWeekLow || price * 0.8;
            const avg200 = quote.twoHundredDayAverage || (high52 + low52) / 2 || price;
            
            let estReturn = 0.14 + (price / avg200 - 1) * 0.25;
            estReturn = Math.max(0.05, Math.min(0.35, estReturn));
            
            let estVol = (high52 - low52) / avg200 * 0.45;
            estVol = Math.max(0.10, Math.min(0.80, estVol));
            
            return {
              ...asset,
              currentPrice: price,
              currency: quote.currency || (marketRegion === "IN" ? "INR" : "USD"),
              fullName: quote.longName || quote.shortName || asset.ticker,
              expectedReturn: parseFloat(estReturn.toFixed(3)),
              volatility: parseFloat(estVol.toFixed(3))
            };
          }
          return asset;
        })
      );
      if (active) {
        setOptAssets(updatedAssets);
      }
    };
    loadQuotes();
    return () => { active = false; };
  }, [marketRegion]);

  // Real-time stock suggestion search
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      const query = newTicker.trim();
      if (query.length < 2) {
        setSearchResults([]);
        return;
      }
      try {
        const results = await searchStock(query, marketRegion);
        if (marketRegion === "IN") {
          // Keep only NSE/BSE symbols (ending in .NS or .BO)
          const filtered = results.filter((r: any) => r.symbol && (r.symbol.endsWith(".NS") || r.symbol.endsWith(".BO")));
          setSearchResults(filtered);
        } else {
          setSearchResults(results.slice(0, 8));
        }
      } catch (err) {
        console.error("Suggestions fetch failed:", err);
      }
    }, 400);
    return () => clearTimeout(delayDebounce);
  }, [newTicker, marketRegion]);

  const handleWeightChange = (stock: StockType, value: number) => {
    setWeights(prev => ({
      ...prev,
      [stock]: value
    }));
  };

  const portfolioStats = useMemo(() => {
    let totalWeight = 0;
    optAssets.forEach(a => {
      totalWeight += weights[a.ticker] || 0;
    });

    const wNorm = optAssets.map(a => {
      return totalWeight > 0 ? (weights[a.ticker] || 0) / totalWeight : 1 / optAssets.length;
    });

    let portReturn = 0;
    optAssets.forEach((a, idx) => {
      portReturn += wNorm[idx] * a.expectedReturn;
    });

    let portVar = 0;
    for (let i = 0; i < optAssets.length; i++) {
      const aI = optAssets[i];
      for (let j = 0; j < optAssets.length; j++) {
        const aJ = optAssets[j];
        const rho = i === j ? 1.0 : avgCorrelation;
        portVar += wNorm[i] * wNorm[j] * aI.volatility * aJ.volatility * rho;
      }
    }
    const portVol = Math.sqrt(portVar);
    const rf = 0.04;
    const sharpe = portVol > 0 ? (portReturn - rf) / portVol : 0;

    return {
      wNorm,
      portReturn,
      portVol,
      sharpe,
      expectedReturnPct: portReturn * 100,
      volatilityPct: portVol * 100
    };
  }, [weights, optAssets, avgCorrelation]);

  const { wNorm, portReturn, portVol, sharpe, expectedReturnPct, volatilityPct } = portfolioStats;

  const getSvgCoords = (vol: number, ret: number) => {
    const x = 50 + ((vol - 10) / (35 - 10)) * 300;
    const y = 220 - ((ret - 5) / (20 - 5)) * 190;
    return { x: Math.max(50, Math.min(380, x)), y: Math.max(30, Math.min(220, y)) };
  };

  const userCoords = getSvgCoords(volatilityPct, expectedReturnPct);

  const simulationData = useMemo(() => {
    const numPaths = 100;
    const rand = createSeededRandom(1337); 
    const annualContribution = monthlyContribution * 12;

    const paths: number[][] = [];
    for (let p = 0; p < numPaths; p++) {
      const path = [initialCapital];
      let val = initialCapital;
      for (let y = 1; y <= horizon; y++) {
        const annReturn = boxMuller(rand, portReturn, portVol);
        val = (val + annualContribution) * (1 + annReturn);
        path.push(Math.max(0, val));
      }
      paths.push(path);
    }

    const percentiles = [];
    for (let y = 0; y <= horizon; y++) {
      const values = paths.map(p => p[y]).sort((a, b) => a - b);
      const cash = initialCapital + y * annualContribution;
      
      percentiles.push({
        year: y,
        p10: values[Math.floor(numPaths * 0.15)],
        p50: values[Math.floor(numPaths * 0.50)],
        p90: values[Math.floor(numPaths * 0.85)],
        cash
      });
    }

    const samplePaths = [paths[3], paths[17], paths[42]];

    return {
      percentiles,
      samplePaths
    };
  }, [initialCapital, monthlyContribution, horizon, portReturn, portVol]);

  const { percentiles, samplePaths } = simulationData;

  const simulationMaxY = useMemo(() => {
    const maxVal = Math.max(...percentiles.map(p => p.p90));
    return maxVal > 0 ? maxVal * 1.05 : 10000;
  }, [percentiles]);

  const getSimCoords = (year: number, value: number) => {
    const x = 60 + (year / horizon) * 410;
    const y = 240 - (value / simulationMaxY) * 200;
    return { x, y: Math.max(20, Math.min(240, y)) };
  };

  const getPointsString = (series: number[]) => {
    return series
      .map((val, year) => {
        const { x, y } = getSimCoords(year, val);
        return `${x},${y}`;
      })
      .join(" ");
  };

  const getUncertaintyAreaPoints = () => {
    const p10Points = percentiles.map((p, year) => getSimCoords(year, p.p10));
    const p90Points = percentiles.map((p, year) => getSimCoords(year, p.p90));
    
    const topPath = p90Points.map(p => `${p.x},${p.y}`).join(" ");
    const bottomPath = [...p10Points].reverse().map(p => `${p.x},${p.y}`).join(" ");
    return `${topPath} ${bottomPath}`;
  };

  const hoverMetrics = useMemo(() => {
    if (hoverYear === null || hoverYear > horizon) return null;
    const p = percentiles[hoverYear];
    const coords = {
      p90: getSimCoords(hoverYear, p.p90),
      p50: getSimCoords(hoverYear, p.p50),
      p10: getSimCoords(hoverYear, p.p10),
      cash: getSimCoords(hoverYear, p.cash)
    };
    return {
      p,
      coords
    };
  }, [hoverYear, percentiles, horizon]);


  // ==========================================
  // TAB 2: PORTFOLIO OPTIMIZATION CORE HANDLERS
  // ==========================================
  const addStockBySymbol = async (symbol: string) => {
    if (optAssets.some(a => a.ticker === symbol)) {
      alert(`Stock "${symbol}" is already in your portfolio.`);
      return;
    }

    setIsSearching(true);
    try {
      const quote = await fetchStockQuote(symbol);
      if (!quote) {
        alert(`Failed to fetch quote details for "${symbol}".`);
        setIsSearching(false);
        return;
      }

      const price = quote.regularMarketPrice || 100;
      const high52 = quote.fiftyTwoWeekHigh || price * 1.2;
      const low52 = quote.fiftyTwoWeekLow || price * 0.8;
      const avg200 = quote.twoHundredDayAverage || (high52 + low52) / 2 || price;

      let estReturn = 0.14 + (price / avg200 - 1) * 0.25;
      estReturn = Math.max(0.05, Math.min(0.35, estReturn));

      let estVol = (high52 - low52) / avg200 * 0.45;
      estVol = Math.max(0.10, Math.min(0.80, estVol));

      const newAsset: Asset = {
        ticker: symbol,
        expectedReturn: parseFloat(estReturn.toFixed(3)),
        volatility: parseFloat(estVol.toFixed(3)),
        currentPrice: price,
        currency: quote.currency || (marketRegion === "IN" ? "INR" : "USD"),
        fullName: quote.longName || symbol
      };

      setOptAssets(prev => [...prev, newAsset]);
      setOptMethod("equal_weight");
    } catch (err) {
      console.error(err);
      alert(`An error occurred while adding "${symbol}".`);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAssetAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const tickerInput = newTicker.trim().toUpperCase();
    if (!tickerInput) return;

    // Check if the ticker might be direct (e.g. has a dot or dash)
    const isDirect = tickerInput.includes(".") || tickerInput.includes("-") || tickerInput.length >= 8;
    
    if (isDirect) {
      await addStockBySymbol(tickerInput);
      setNewTicker("");
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Otherwise, search for matching quotes
      const results = await searchStock(tickerInput, marketRegion);
      if (results.length === 0) {
        alert(`No tickers found for "${tickerInput}". Please verify the symbol.`);
        setIsSearching(false);
        return;
      }

      let bestMatch = results[0];
      if (marketRegion === "IN") {
        // Find NSE stock if possible
        const nseMatch = results.find((q: any) => q.symbol && q.symbol.endsWith(".NS"));
        const bseMatch = results.find((q: any) => q.symbol && q.symbol.endsWith(".BO"));
        if (nseMatch) bestMatch = nseMatch;
        else if (bseMatch) bestMatch = bseMatch;
      }
      
      const symbol = bestMatch.symbol;
      await addStockBySymbol(symbol);
      setNewTicker("");
      setSearchResults([]);
    } catch (err) {
      console.error(err);
      alert("An error occurred while searching for the stock. Please try again.");
      setIsSearching(false);
    }
  };

  const handleAssetRemove = (ticker: string) => {
    if (optAssets.length <= 2) return; // Keep at least 2 assets for optimization
    setOptAssets(prev => prev.filter(a => a.ticker !== ticker));
    setOptMethod("equal_weight");
  };

  const handleAssetParamChange = (ticker: string, field: "expectedReturn" | "volatility", val: number) => {
    setOptAssets(prev => prev.map(a => {
      if (a.ticker === ticker) {
        return { ...a, [field]: val };
      }
      return a;
    }));
    // Recalculate optimization weights unless manual custom is selected
    if (optMethod !== "custom") {
      setOptMethod(optMethod);
    }
  };

  const handleOptWeightSliderChange = (ticker: string, val: number) => {
    setOptMethod("custom");
    setOptWeights(prev => ({
      ...prev,
      [ticker]: val
    }));
  };

  // Normalized weight vectors
  const optWeightsNorm = useMemo(() => {
    const total = Object.values(optWeights).reduce((a, b) => a + b, 0);
    const norm: Record<string, number> = {};
    optAssets.forEach(a => {
      norm[a.ticker] = total > 0 ? (optWeights[a.ticker] || 0) / total : 1 / optAssets.length;
    });
    return norm;
  }, [optWeights, optAssets]);

  // Compute portfolio return and volatility under uniform correlation model
  const calculatePortfolioStats = (weightsMap: Record<string, number>) => {
    let returnSum = 0;
    optAssets.forEach(a => {
      returnSum += (weightsMap[a.ticker] || 0) * a.expectedReturn;
    });

    let varianceSum = 0;
    for (let i = 0; i < optAssets.length; i++) {
      const aI = optAssets[i];
      const wI = weightsMap[aI.ticker] || 0;
      for (let j = 0; j < optAssets.length; j++) {
        const aJ = optAssets[j];
        const wJ = weightsMap[aJ.ticker] || 0;
        const rho = i === j ? 1.0 : avgCorrelation;
        varianceSum += wI * wJ * aI.volatility * aJ.volatility * rho;
      }
    }

    const vol = Math.sqrt(varianceSum);
    const sharpe = vol > 0 ? (returnSum - riskFreeRate) / vol : 0;

    // Calculate risk contributions
    const riskContributions: Record<string, number> = {};
    optAssets.forEach(aI => {
      const wI = weightsMap[aI.ticker] || 0;
      let covarianceSum = 0;
      optAssets.forEach(aJ => {
        const wJ = weightsMap[aJ.ticker] || 0;
        const rho = aI.ticker === aJ.ticker ? 1.0 : avgCorrelation;
        covarianceSum += wJ * aI.volatility * aJ.volatility * rho;
      });
      // Risk Contribution = w_i * Cov(R_i, R_p) / Vol_p
      riskContributions[aI.ticker] = vol > 0 ? (wI * covarianceSum) / vol : 0;
    });

    return {
      expectedReturn: returnSum,
      volatility: vol,
      sharpeRatio: sharpe,
      riskContributions
    };
  };

  // Run client-side Monte Carlo Portfolio Solver
  // Generates 1200 random portfolios to build the Efficient Frontier cloud
  const solverData = useMemo(() => {
    const numPortfolios = 1200;
    const lcg = createSeededRandom(42); // Seeded randomizer
    const portfolios: Array<{
      weights: Record<string, number>;
      expectedReturn: number;
      volatility: number;
      sharpeRatio: number;
      riskContributions: Record<string, number>;
    }> = [];

    let bestSharpeIdx = 0;
    let minVolIdx = 0;
    let bestSharpe = -Infinity;
    let minVol = Infinity;

    for (let p = 0; p < numPortfolios; p++) {
      // 1. Generate random weights
      const rawWeights: Record<string, number> = {};
      let sum = 0;
      optAssets.forEach(a => {
        const rVal = lcg();
        rawWeights[a.ticker] = rVal;
        sum += rVal;
      });

      // 2. Normalize
      const normWeights: Record<string, number> = {};
      optAssets.forEach(a => {
        normWeights[a.ticker] = sum > 0 ? rawWeights[a.ticker] / sum : 1 / optAssets.length;
      });

      // 3. Compute Stats
      const stats = calculatePortfolioStats(normWeights);
      
      const port = {
        weights: normWeights,
        expectedReturn: stats.expectedReturn,
        volatility: stats.volatility,
        sharpeRatio: stats.sharpeRatio,
        riskContributions: stats.riskContributions
      };

      portfolios.push(port);

      if (port.sharpeRatio > bestSharpe) {
        bestSharpe = port.sharpeRatio;
        bestSharpeIdx = p;
      }
      if (port.volatility < minVol) {
        minVol = port.volatility;
        minVolIdx = p;
      }
    }

    // 4. Numerical Solver for Risk Parity (Min variance of risk contributions)
    let bestRiskParityIdx = 0;
    let minRiskParityVariance = Infinity;
    
    portfolios.forEach((port, idx) => {
      // Mean Risk Contribution = portfolio volatility / N
      const targetRC = port.volatility / optAssets.length;
      let varianceSum = 0;
      optAssets.forEach(a => {
        const rc = port.riskContributions[a.ticker] || 0;
        varianceSum += Math.pow(rc - targetRC, 2);
      });
      
      if (varianceSum < minRiskParityVariance) {
        minRiskParityVariance = varianceSum;
        bestRiskParityIdx = idx;
      }
    });

    return {
      portfolios,
      maxSharpePortfolio: portfolios[bestSharpeIdx],
      minVolPortfolio: portfolios[minVolIdx],
      riskParityPortfolio: portfolios[bestRiskParityIdx]
    };
  }, [optAssets, avgCorrelation, riskFreeRate]);

  // Solver optimal metrics
  const activePortfolioStats = useMemo(() => {
    return calculatePortfolioStats(optWeightsNorm);
  }, [optWeightsNorm, optAssets, avgCorrelation, riskFreeRate]);

  // Handle setting optimization method weights
  const applyOptimizationMethod = (method: typeof optMethod) => {
    setOptMethod(method);
    const updatedWeights: Record<string, number> = {};
    
    if (method === "equal_weight") {
      const eq = 100 / optAssets.length;
      optAssets.forEach(a => {
        updatedWeights[a.ticker] = eq;
      });
    } else if (method === "max_sharpe") {
      const p = solverData.maxSharpePortfolio;
      optAssets.forEach(a => {
        updatedWeights[a.ticker] = Math.round((p.weights[a.ticker] || 0) * 100);
      });
    } else if (method === "min_vol") {
      const p = solverData.minVolPortfolio;
      optAssets.forEach(a => {
        updatedWeights[a.ticker] = Math.round((p.weights[a.ticker] || 0) * 100);
      });
    } else if (method === "risk_parity") {
      const p = solverData.riskParityPortfolio;
      optAssets.forEach(a => {
        updatedWeights[a.ticker] = Math.round((p.weights[a.ticker] || 0) * 100);
      });
    }
    
    if (method !== "custom") {
      setOptWeights(updatedWeights);
    }
  };

  // Sync weights if method changes or solver updates
  useEffect(() => {
    if (optMethod !== "custom") {
      applyOptimizationMethod(optMethod);
    }
  }, [solverData, optMethod]);

  // Boundaries for Efficient Frontier Scatter Plot
  const optPlotBoundaries = useMemo(() => {
    const returns = solverData.portfolios.map(p => p.expectedReturn * 100);
    const vols = solverData.portfolios.map(p => p.volatility * 100);
    
    const minVol = Math.min(...vols);
    const maxVol = Math.max(...vols);
    const minRet = Math.min(...returns);
    const maxRet = Math.max(...returns);

    return {
      minVol: Math.max(0, minVol - 2),
      maxVol: maxVol + 2,
      minRet: Math.max(0, minRet - 2),
      maxRet: maxRet + 2
    };
  }, [solverData]);

  const getOptSvgCoords = (volPct: number, retPct: number) => {
    const { minVol, maxVol, minRet, maxRet } = optPlotBoundaries;
    const x = 50 + ((volPct - minVol) / (maxVol - minVol)) * 300;
    const y = 220 - ((retPct - minRet) / (maxRet - minRet)) * 190;
    return { x: Math.max(50, Math.min(380, x)), y: Math.max(30, Math.min(220, y)) };
  };

  return (
    <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
      {/* 1. Dashboard Info Header */}
      <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 1.5rem auto" }}>
        <h2 className="gradient-text" style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: "12px" }}>
          Financial Analytics & Optimization
        </h2>
        <p style={{ color: "var(--slate-400)", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Interactive Modern Portfolio Theory (MPT) simulator combined with a stochastic Monte Carlo wealth projector. Adjust weights manually or run advanced mathematical optimizations.
        </p>
      </div>

      {/* MARKET REGION TOGGLE */}
      <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginBottom: "1.5rem" }}>
        <button
          onClick={() => setMarketRegion("US")}
          className={`tab-btn ${marketRegion === "US" ? "active" : ""}`}
          style={{ padding: "8px 20px", fontSize: "0.85rem", letterSpacing: "0.03em" }}
        >
          🇺🇸 US MARKETS & CRYPTO
        </button>
        <button
          onClick={() => setMarketRegion("IN")}
          className={`tab-btn ${marketRegion === "IN" ? "active" : ""}`}
          style={{ padding: "8px 20px", fontSize: "0.85rem", letterSpacing: "0.03em" }}
        >
          🇮🇳 INDIAN NSE STOCKS
        </button>
      </div>

      {/* SUB-TABS SELECTOR */}
      <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "2.5rem" }}>
        <button
          onClick={() => setDashboardTab("wealth")}
          className={`tab-btn ${dashboardTab === "wealth" ? "active" : ""}`}
          style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
        >
          WEALTH SIMULATOR & ALLOCATION
        </button>
        <button
          onClick={() => setDashboardTab("optimization")}
          className={`tab-btn ${dashboardTab === "optimization" ? "active" : ""}`}
          style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
        >
          QUANTITATIVE PORTFOLIO OPTIMIZATION
        </button>
      </div>

      {/* ==========================================
          TAB 1: WEALTH SIMULATION DASHBOARD VIEW
          ========================================== */}
      {dashboardTab === "wealth" && (
        <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
          {/* Parameters & Stats Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "30px",
            alignItems: "stretch",
            marginBottom: "2.5rem"
          }}>
            {/* Asset Weight Allocation Panel */}
            <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "24px", color: "var(--foreground)" }}>Asset Allocation</h3>
                
                {optAssets.map((asset, index) => {
                  const retPct = asset.expectedReturn * 100;
                  const volPct = asset.volatility * 100;
                  const currentWeight = weights[asset.ticker] !== undefined ? weights[asset.ticker] : 0;
                  const label = asset.fullName || asset.ticker;

                  return (
                    <div key={asset.ticker} style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                        <span style={{ fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "210px" }} title={label}>
                          {label}
                        </span>
                        <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>
                          {Math.round((wNorm[index] || 0) * 100)}%
                        </span>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={currentWeight} 
                        onChange={(e) => handleWeightChange(asset.ticker, Number(e.target.value))}
                        style={{ width: "100%", accentColor: "var(--primary)", background: "rgba(0,0,0,0.04)", height: "6px", borderRadius: "3px", cursor: "pointer" }}
                      />
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "4px" }}>
                        <span>Return: {retPct.toFixed(1)}% | Risk: {volPct.toFixed(1)}%</span>
                        {asset.currentPrice && (
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 500 }}>
                            {formatCurrencyVal(asset.currentPrice, asset.currency)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => {
                  const resetVal = Math.round(100 / optAssets.length);
                  const newW: Record<string, number> = {};
                  optAssets.forEach(a => { newW[a.ticker] = resetVal; });
                  setWeights(newW);
                }}
                className="btn-xai-outline" 
                style={{ width: "100%", padding: "10px", fontSize: "0.85rem", marginTop: "10px" }}
              >
                RESET EQUAL WEIGHTS
              </button>
            </div>

            {/* Dynamic Analytics Dashboard */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "space-between" }}>
              {/* Expected Return Card */}
              <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate-400)", marginBottom: "4px" }}>Expected Return</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)" }}>{expectedReturnPct.toFixed(2)}%</div>
                </div>
                <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(6, 182, 212, 0.08)", border: "1px solid rgba(6, 182, 212, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>

              {/* Volatility Card */}
              <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate-400)", marginBottom: "4px" }}>Portfolio Volatility (Risk)</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--foreground)" }}>{volatilityPct.toFixed(2)}%</div>
                </div>
                <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(234, 88, 12, 0.08)", border: "1px solid rgba(234, 88, 12, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ea580c" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>

              {/* Sharpe Ratio Card */}
              <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate-400)", marginBottom: "4px" }}>Sharpe Ratio (Risk-Adjusted)</div>
                  <div style={{ fontSize: "2rem", fontWeight: 700, color: "var(--primary)" }}>{sharpe.toFixed(3)}</div>
                </div>
                <div style={{ width: "50px", height: "50px", borderRadius: "50%", background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#10b981" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-Side Analytics Charts (Efficient Frontier & Monte Carlo Simulation) */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "30px",
            marginBottom: "3rem"
          }}>
            {/* Efficient Frontier Map */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" }}>Efficient Frontier Map</h3>
              <p style={{ color: "var(--slate-400)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
                Visualizes optimal risk vs. return profiles. The line represents optimal portfolios (Markowitz Efficient Frontier). The pulsing cyan dot is your allocation.
              </p>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", overflowX: "auto" }}>
                <svg viewBox="0 0 400 250" style={{ width: "100%", maxWidth: "450px", height: "auto", overflow: "visible" }}>
                  {/* Grid Background */}
                  <line x1="50" y1="220" x2="380" y2="220" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <line x1="50" y1="30" x2="50" y2="220" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  
                  {/* Y Grid */}
                  <line x1="50" y1="157" x2="380" y2="157" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="50" y1="93" x2="380" y2="93" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="50" y1="30" x2="380" y2="30" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* X Grid */}
                  <line x1="170" y1="30" x2="170" y2="220" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="290" y1="30" x2="290" y2="220" stroke="rgba(0,0,0,0.04)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Axes Labels */}
                  <text x="215" y="245" fill="var(--slate-400)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">Volatility (Risk %)</text>
                  <text x="15" y="125" fill="var(--slate-400)" fontSize="9" textAnchor="middle" transform="rotate(-90 15 125)" fontFamily="var(--font-mono)">Expected Return (%)</text>

                  {/* Grid ticks */}
                  <text x="50" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">10%</text>
                  <text x="170" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">20%</text>
                  <text x="290" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">30%</text>

                  <text x="42" y="223" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">5%</text>
                  <text x="42" y="160" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">10%</text>
                  <text x="42" y="96" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">15%</text>
                  <text x="42" y="33" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">20%</text>

                  {/* Curve */}
                  <path 
                    d="M 140 108 Q 130 110 145 95 T 260 55 T 380 40" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="2" 
                    opacity="0.3" 
                    strokeDasharray="4 2"
                  />
                  <path 
                    d="M 140 108 Q 130 110 145 95 T 260 55 T 380 40" 
                    fill="none" 
                    stroke="var(--primary)" 
                    strokeWidth="2" 
                    opacity="0.65" 
                  />
                  
                  {/* Assets */}
                  {optAssets.map((asset, index) => {
                    const retPct = asset.expectedReturn * 100;
                    const volPct = asset.volatility * 100;
                    const { x, y } = getSvgCoords(volPct, retPct);
                    const colors = ["#f59e0b", "#ea580c", "#a855f7", "#ef4444", "#10b981", "#06b6d4"];
                    const dotColor = colors[index % colors.length];

                    return (
                      <g key={asset.ticker}>
                        <circle cx={x} cy={y} r="5" fill={dotColor} />
                        <text x={x + 8} y={y - 3} fill="var(--slate-400)" fontSize="8" fontFamily="var(--font-sans)">{asset.ticker}</text>
                      </g>
                    );
                  })}

                  {/* Active Portfolio Dot */}
                  <g>
                    <circle 
                      cx={userCoords.x} 
                      cy={userCoords.y} 
                      r="9" 
                      fill="rgba(6, 182, 212, 0.4)" 
                      style={{ transition: "all 0.1s ease-out" }}
                    >
                      <animate attributeName="r" values="7;13;7" dur="2s" repeatCount="indefinite" />
                    </circle>
                    <circle 
                      cx={userCoords.x} 
                      cy={userCoords.y} 
                      r="4.5" 
                      fill="#06b6d4" 
                      stroke="#ffffff" 
                      strokeWidth="1.5"
                      style={{ transition: "all 0.1s ease-out" }}
                    />
                    <text 
                      x={userCoords.x + 8} 
                      y={userCoords.y - 8} 
                      fill="#06b6d4" 
                      fontSize="9" 
                      fontWeight="bold" 
                      fontFamily="var(--font-sans)"
                      style={{ transition: "all 0.1s ease-out" }}
                    >
                      My Portfolio
                    </text>
                  </g>
                </svg>
              </div>
            </div>

            {/* Monte Carlo Simulation Panel */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" }}>
                Monte Carlo Wealth Projection
              </h3>
              <p style={{ color: "var(--slate-400)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
                Stochastic projection of portfolio growth over time. The shaded band shows the range of potential outcomes (15th to 85th percentiles) under volatility.
              </p>

              {/* Simulation Sliders */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.8rem" }}>
                    <span>Initial Capital</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(initialCapital)}</span>
                  </div>
                  <input 
                    type="range"
                    min="1000"
                    max="250000"
                    step="1000"
                    value={initialCapital}
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                  />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.8rem" }}>
                    <span>Monthly Save</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>{formatCurrency(monthlyContribution)}</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="5000"
                    step="50"
                    value={monthlyContribution}
                    onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                  />
                </div>
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "0.8rem" }}>
                    <span>Horizon Length</span>
                    <span style={{ color: "var(--primary)", fontWeight: 600 }}>{horizon} Years</span>
                  </div>
                  <input 
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={horizon}
                    onChange={(e) => setHorizon(Number(e.target.value))}
                    style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                  />
                </div>
              </div>

              {/* SVG Simulation Chart */}
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
                <svg 
                  viewBox="0 0 500 280" 
                  style={{ width: "100%", height: "auto", overflow: "visible", cursor: "crosshair" }}
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const svgWidth = rect.width;
                    const relativeX = (mouseX / svgWidth) * 500;
                    if (relativeX >= 60 && relativeX <= 470) {
                      const yearFraction = ((relativeX - 60) / 410) * horizon;
                      const year = Math.round(yearFraction);
                      setHoverYear(Math.max(0, Math.min(horizon, year)));
                    } else {
                      setHoverYear(null);
                    }
                  }}
                  onMouseLeave={() => setHoverYear(null)}
                >
                  {/* Axes Guides */}
                  <line x1="60" y1="240" x2="470" y2="240" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <line x1="60" y1="20" x2="60" y2="240" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

                  {/* Y Gridlines */}
                  <line x1="60" y1="185" x2="470" y2="185" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="60" y1="130" x2="470" y2="130" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="60" y1="75" x2="470" y2="75" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="60" y1="20" x2="470" y2="20" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* X Gridlines */}
                  <line x1={60 + 410 * 0.25} y1="20" x2={60 + 410 * 0.25} y2="240" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={60 + 410 * 0.5} y1="20" x2={60 + 410 * 0.5} y2="240" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1={60 + 410 * 0.75} y1="20" x2={60 + 410 * 0.75} y2="240" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="470" y1="20" x2="470" y2="240" stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="3 3" />

                  {/* Axes values */}
                  <text x="60" y="252" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">Yr 0</text>
                  <text x={60 + 410 * 0.5} y="252" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">Yr {Math.round(horizon / 2)}</text>
                  <text x="470" y="252" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">Yr {horizon}</text>

                  <text x="52" y="243" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">$0</text>
                  <text x="52" y="133" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{formatCurrency(simulationMaxY / 2)}</text>
                  <text x="52" y="23" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{formatCurrency(simulationMaxY)}</text>

                  {/* Chart Labels */}
                  <text x="265" y="268" fill="var(--slate-400)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">Simulation Timeline (Years)</text>

                  {/* Shaded Uncertainty Band */}
                  <polygon
                    points={getUncertaintyAreaPoints()}
                    fill="rgba(6, 182, 212, 0.05)"
                    stroke="none"
                  />

                  {/* Light, Jagged Stochastic Sample Paths */}
                  {samplePaths.map((path, idx) => (
                    <polyline
                      key={idx}
                      fill="none"
                      stroke={idx === 0 ? "#f59e0b" : idx === 1 ? "#a855f7" : "#ef4444"}
                      strokeWidth="1"
                      strokeDasharray="2 2"
                      opacity="0.25"
                      points={getPointsString(path)}
                      style={{ transition: "points 0.2s ease" }}
                    />
                  ))}

                  {/* 10th Percentile Curve (Pessimistic) */}
                  <polyline
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                    points={getPointsString(percentiles.map(p => p.p10))}
                    style={{ transition: "points 0.2s ease" }}
                  />

                  {/* Cumulative Savings Line (Base Cash) */}
                  <polyline
                    fill="none"
                    stroke="rgba(0, 0, 0, 0.2)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                    points={getPointsString(percentiles.map(p => p.cash))}
                    style={{ transition: "points 0.2s ease" }}
                  />

                  {/* 90th Percentile Curve (Optimistic) */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                    points={getPointsString(percentiles.map(p => p.p90))}
                    style={{ transition: "points 0.2s ease" }}
                  />

                  {/* 50th Percentile Curve (Expected Median) */}
                  <polyline
                    fill="none"
                    stroke="var(--primary)"
                    strokeWidth="3.2"
                    points={getPointsString(percentiles.map(p => p.p50))}
                    style={{ transition: "points 0.2s ease" }}
                  />

                  {/* Interactive Hover Overlay & Tooltip */}
                  {hoverMetrics && (
                    <g>
                      {/* Vertical cursor line */}
                      <line
                        x1={hoverMetrics.coords.p50.x}
                        y1="20"
                        x2={hoverMetrics.coords.p50.x}
                        y2="240"
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth="1.5"
                        strokeDasharray="2 2"
                      />

                      {/* Circle nodes on lines */}
                      <circle cx={hoverMetrics.coords.p90.x} cy={hoverMetrics.coords.p90.y} r="4" fill="#10b981" />
                      <circle cx={hoverMetrics.coords.p50.x} cy={hoverMetrics.coords.p50.y} r="5.5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1" />
                      <circle cx={hoverMetrics.coords.p10.x} cy={hoverMetrics.coords.p10.y} r="4" fill="#f97316" />
                      <circle cx={hoverMetrics.coords.cash.x} cy={hoverMetrics.coords.cash.y} r="3.5" fill="rgba(0, 0, 0, 0.4)" />

                      {/* Tooltip Card inside the SVG */}
                      <g transform={`translate(${hoverMetrics.coords.p50.x > 250 ? hoverMetrics.coords.p50.x - 165 : hoverMetrics.coords.p50.x + 15}, 25)`}>
                        <rect
                          width="150"
                          height="125"
                          rx="8"
                          fill="rgba(255, 255, 255, 0.96)"
                          stroke="rgba(6, 182, 212, 0.25)"
                          strokeWidth="1.5"
                          style={{ backdropFilter: "blur(6px)" }}
                        />
                        
                        {/* Tooltip Content */}
                        <text x="12" y="20" fill="var(--foreground)" fontSize="9" fontWeight="bold" fontFamily="var(--font-mono)">
                          YEAR {hoverMetrics.p.year} METRICS
                        </text>
                        <line x1="12" y1="26" x2="138" y2="26" stroke="rgba(0, 0, 0, 0.08)" strokeWidth="1" />
                        
                        <text x="12" y="42" fill="#10b981" fontSize="9" fontFamily="var(--font-sans)">
                          ▲ Optimistic (85%):
                        </text>
                        <text x="138" y="42" fill="#10b981" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="var(--font-mono)">
                          {formatCurrency(hoverMetrics.p.p90)}
                        </text>

                        <text x="12" y="62" fill="var(--primary)" fontSize="9" fontFamily="var(--font-sans)">
                          ● Expected (50%):
                        </text>
                        <text x="138" y="62" fill="var(--primary)" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="var(--font-mono)">
                          {formatCurrency(hoverMetrics.p.p50)}
                        </text>

                        <text x="12" y="82" fill="#f97316" fontSize="9" fontFamily="var(--font-sans)">
                          ▼ Pessimistic (15%):
                        </text>
                        <text x="138" y="82" fill="#f97316" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="var(--font-mono)">
                          {formatCurrency(hoverMetrics.p.p10)}
                        </text>

                        <text x="12" y="102" fill="rgba(0,0,0,0.6)" fontSize="9" fontFamily="var(--font-sans)">
                          ■ Saved Cash:
                        </text>
                        <text x="138" y="102" fill="rgba(0,0,0,0.6)" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="var(--font-mono)">
                          {formatCurrency(hoverMetrics.p.cash)}
                        </text>

                        {/* Growth factor calculation */}
                        <text x="12" y="116" fill="rgba(6, 182, 212, 0.8)" fontSize="8.5" fontFamily="var(--font-mono)">
                          Multiplier: {(hoverMetrics.p.p50 / Math.max(1, initialCapital + hoverMetrics.p.year * monthlyContribution * 12)).toFixed(2)}x
                        </text>
                      </g>
                    </g>
                  )}
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          TAB 2: PORTFOLIO OPTIMIZATION VIEW
          ========================================== */}
      {dashboardTab === "optimization" && (
        <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
          {/* Main Controls Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "30px",
            alignItems: "stretch",
            marginBottom: "2.5rem"
          }}>
            {/* Custom Asset Editor & Params */}
            <div className="glass-panel" style={{ padding: "28px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "16px", color: "var(--foreground)" }}>Custom Asset Parameters</h3>
                
                {/* Ticker Add Form */}
                <div style={{ position: "relative", marginBottom: "20px" }}>
                  <form onSubmit={handleAssetAdd} style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      placeholder={marketRegion === "IN" ? "Search stock/company (e.g. ADANI)" : "Search stock/company (e.g. AAPL)"}
                      value={newTicker}
                      onChange={(e) => setNewTicker(e.target.value)}
                      onBlur={() => {
                        setTimeout(() => setSearchResults([]), 200);
                      }}
                      disabled={isSearching}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "20px",
                        background: "rgba(0,0,0,0.03)",
                        border: "1px solid var(--border-color)",
                        color: "var(--foreground)",
                        fontSize: "0.85rem",
                        fontFamily: "var(--font-mono)",
                        outline: "none",
                        opacity: isSearching ? 0.6 : 1
                      }}
                    />
                    <button 
                      type="submit" 
                      className="btn-xai-white" 
                      style={{ padding: "10px 18px", fontSize: "0.85rem", opacity: isSearching ? 0.7 : 1 }}
                      disabled={isSearching}
                    >
                      {isSearching ? "..." : "+ ADD"}
                    </button>
                  </form>

                  {/* Suggestions Dropdown */}
                  {searchResults.length > 0 && (
                    <div style={{
                      position: "absolute",
                      top: "45px",
                      left: 0,
                      right: 0,
                      background: "#ffffff",
                      border: "1px solid rgba(0,0,0,0.08)",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)",
                      zIndex: 100,
                      maxHeight: "220px",
                      overflowY: "auto",
                      padding: "6px"
                    }}>
                      {searchResults.map((item: any) => (
                        <div
                          key={item.symbol}
                          onClick={async () => {
                            setNewTicker("");
                            setSearchResults([]);
                            await addStockBySymbol(item.symbol);
                          }}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            fontSize: "0.85rem",
                            transition: "background 0.2s ease",
                            color: "var(--foreground)",
                            background: "transparent"
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(0,0,0,0.04)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "2px" }}>
                            <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                              {item.symbol}
                            </span>
                            <span style={{ color: "var(--slate-400)", fontSize: "0.75rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "230px" }}>
                              {item.longname || item.shortname}
                            </span>
                          </div>
                          <span style={{ fontSize: "0.7rem", color: "var(--primary)", fontWeight: 600, textTransform: "uppercase", padding: "2px 6px", borderRadius: "4px", background: "rgba(6, 182, 212, 0.08)" }}>
                            {item.exchDisp || item.exchange}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Parameters Editor List */}
                <div style={{ maxHeight: "310px", overflowY: "auto", paddingRight: "4px" }}>
                  {optAssets.map(asset => (
                    <div key={asset.ticker} className="glass-panel" style={{ padding: "14px", marginBottom: "12px", borderRadius: "12px", border: "1px solid rgba(0,0,0,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: "var(--font-mono)" }}>
                          {asset.ticker}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAssetRemove(asset.ticker)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 600
                          }}
                        >
                          REMOVE
                        </button>
                      </div>

                      {asset.fullName && (
                        <div style={{ fontSize: "0.75rem", color: "var(--slate-400)", marginBottom: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={asset.fullName}>
                          {asset.fullName}
                        </div>
                      )}

                      {asset.currentPrice && (
                        <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-mono)", marginBottom: "8px" }}>
                          Price: {formatCurrencyVal(asset.currentPrice, asset.currency)}
                        </div>
                      )}

                      {/* Return Slider */}
                      <div style={{ marginBottom: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                          <span style={{ color: "var(--slate-400)" }}>Expected Return</span>
                          <span style={{ fontWeight: 600 }}>{(asset.expectedReturn * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="0.5"
                          value={asset.expectedReturn * 100}
                          onChange={(e) => handleAssetParamChange(asset.ticker, "expectedReturn", Number(e.target.value) / 100)}
                          style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                        />
                      </div>

                      {/* Volatility Slider */}
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", marginBottom: "4px" }}>
                          <span style={{ color: "var(--slate-400)" }}>Asset Risk (Vol)</span>
                          <span style={{ fontWeight: 600 }}>{(asset.volatility * 100).toFixed(1)}%</span>
                        </div>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          step="0.5"
                          value={asset.volatility * 100}
                          onChange={(e) => handleAssetParamChange(asset.ticker, "volatility", Number(e.target.value) / 100)}
                          style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Correlation parameter */}
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "16px", marginTop: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 500 }}>Average Correlation (ρ)</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>
                    {avgCorrelation.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="95"
                  step="5"
                  value={avgCorrelation * 100}
                  onChange={(e) => {
                    setAvgCorrelation(Number(e.target.value) / 100);
                    if (optMethod !== "custom") setOptMethod(optMethod);
                  }}
                  style={{ width: "100%", accentColor: "var(--primary)", height: "5px", cursor: "pointer" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--slate-400)", marginTop: "4px" }}>
                  <span>Diversified (0.0)</span>
                  <span>Systemic (0.95)</span>
                </div>
              </div>
            </div>

            {/* Simulated Cloud Portfolio Solver Results */}
            <div style={{ display: "flex", flexDirection: "column", gap: "20px", justifyContent: "space-between" }}>
              {/* Method selector options */}
              <div className="glass-panel" style={{ padding: "20px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "14px", color: "var(--foreground)" }}>
                  Optimization Solver Method
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <button
                    onClick={() => applyOptimizationMethod("equal_weight")}
                    className={`tab-btn ${optMethod === "equal_weight" ? "active" : ""}`}
                    style={{ padding: "8px 12px", fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    1/N EQUAL WEIGHT
                  </button>
                  <button
                    onClick={() => applyOptimizationMethod("max_sharpe")}
                    className={`tab-btn ${optMethod === "max_sharpe" ? "active" : ""}`}
                    style={{ padding: "8px 12px", fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    MAX SHARPE RATIO
                  </button>
                  <button
                    onClick={() => applyOptimizationMethod("min_vol")}
                    className={`tab-btn ${optMethod === "min_vol" ? "active" : ""}`}
                    style={{ padding: "8px 12px", fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    MINIMUM VARIANCE
                  </button>
                  <button
                    onClick={() => applyOptimizationMethod("risk_parity")}
                    className={`tab-btn ${optMethod === "risk_parity" ? "active" : ""}`}
                    style={{ padding: "8px 12px", fontSize: "0.75rem", justifyContent: "center" }}
                  >
                    RISK PARITY (ERC)
                  </button>
                </div>
              </div>

              {/* Portfolio Performance Analytics */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ fontSize: "1.05rem", fontWeight: 600, marginBottom: "16px", color: "var(--foreground)" }}>
                  Optimized Statistics
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.04)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--slate-400)" }}>Expected Portfolio Return</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{(activePortfolioStats.expectedReturn * 100).toFixed(2)}%</span>
                  </div>
                  
                  <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid rgba(0,0,0,0.04)", paddingBottom: "8px" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--slate-400)" }}>Portfolio Volatility (Total Risk)</span>
                    <span style={{ fontWeight: 700, fontFamily: "var(--font-mono)" }}>{(activePortfolioStats.volatility * 100).toFixed(2)}%</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.85rem", color: "var(--slate-400)" }}>Sharpe Ratio (Rf = {(riskFreeRate*100).toFixed(0)}%)</span>
                    <span style={{ fontWeight: 700, color: "var(--primary)", fontFamily: "var(--font-mono)" }}>{activePortfolioStats.sharpeRatio.toFixed(3)}</span>
                  </div>
                </div>
              </div>

              {/* Asset Allocation Sliders Grid (Dynamic custom adjusting) */}
              <div className="glass-panel" style={{ padding: "20px" }}>
                <h4 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--slate-400)", marginBottom: "12px" }}>
                  Portfolio Allocation Breakdown {optMethod === "custom" ? "(Manual Adjust)" : `(${optMethod.replace("_", " ").toUpperCase()})`}
                </h4>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {optAssets.map(asset => {
                    const w = optWeights[asset.ticker] || 0;
                    return (
                      <div key={asset.ticker}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "3px" }}>
                          <span style={{ fontWeight: 600 }}>{asset.ticker}</span>
                          <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>
                            {Math.round(optWeightsNorm[asset.ticker] * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={w}
                          onChange={(e) => handleOptWeightSliderChange(asset.ticker, Number(e.target.value))}
                          style={{ width: "100%", accentColor: "var(--primary)", height: "4px", cursor: "pointer" }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Efficient Frontier Scatter Plot & Risk Contributions */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))",
            gap: "30px",
            marginBottom: "3rem"
          }}>
            {/* Efficient Frontier Simulated Cloud */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" }}>Efficient Frontier Scatter Plot</h3>
              <p style={{ color: "var(--slate-400)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
                Displays 1,200 simulated portfolios. Green represents maximum Sharpe ratio, blue represents minimum volatility. The red dot is your active allocation.
              </p>

              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <svg viewBox="0 0 400 250" style={{ width: "100%", maxWidth: "450px", height: "auto", overflow: "visible" }}>
                  {/* Grid lines */}
                  <line x1="50" y1="220" x2="380" y2="220" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                  <line x1="50" y1="30" x2="50" y2="220" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

                  {/* Axes labels */}
                  <text x="215" y="245" fill="var(--slate-400)" fontSize="9" textAnchor="middle" fontFamily="var(--font-mono)">Volatility (Risk %)</text>
                  <text x="15" y="125" fill="var(--slate-400)" fontSize="9" textAnchor="middle" transform="rotate(-90 15 125)" fontFamily="var(--font-mono)">Expected Return (%)</text>

                  {/* Grid ticks */}
                  <text x="50" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">{optPlotBoundaries.minVol.toFixed(0)}%</text>
                  <text x="215" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">{((optPlotBoundaries.minVol + optPlotBoundaries.maxVol)/2).toFixed(0)}%</text>
                  <text x="380" y="232" fill="var(--slate-400)" fontSize="8" textAnchor="middle" fontFamily="var(--font-mono)">{optPlotBoundaries.maxVol.toFixed(0)}%</text>

                  <text x="42" y="223" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{optPlotBoundaries.minRet.toFixed(0)}%</text>
                  <text x="42" y="125" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{((optPlotBoundaries.minRet + optPlotBoundaries.maxRet)/2).toFixed(0)}%</text>
                  <text x="42" y="33" fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{optPlotBoundaries.maxRet.toFixed(0)}%</text>

                  {/* Simulated cloud points */}
                  {solverData.portfolios.map((port, idx) => {
                    const coords = getOptSvgCoords(port.volatility * 100, port.expectedReturn * 100);
                    return (
                      <circle
                        key={idx}
                        cx={coords.x}
                        cy={coords.y}
                        r="1.5"
                        fill="var(--primary)"
                        opacity="0.18"
                      />
                    );
                  })}

                  {/* Draw Max Sharpe portfolio marker */}
                  {(() => {
                    const ms = solverData.maxSharpePortfolio;
                    const coords = getOptSvgCoords(ms.volatility * 100, ms.expectedReturn * 100);
                    return (
                      <g>
                        <circle cx={coords.x} cy={coords.y} r="6" fill="#10b981" />
                        <circle cx={coords.x} cy={coords.y} r="2.5" fill="#ffffff" />
                        <text x={coords.x + 8} y={coords.y - 4} fill="#10b981" fontSize="7" fontWeight="bold" fontFamily="var(--font-mono)">Max Sharpe</text>
                      </g>
                    );
                  })()}

                  {/* Draw Min Volatility portfolio marker */}
                  {(() => {
                    const mv = solverData.minVolPortfolio;
                    const coords = getOptSvgCoords(mv.volatility * 100, mv.expectedReturn * 100);
                    return (
                      <g>
                        <circle cx={coords.x} cy={coords.y} r="6" fill="#06b6d4" />
                        <circle cx={coords.x} cy={coords.y} r="2.5" fill="#ffffff" />
                        <text x={coords.x + 8} y={coords.y + 8} fill="#06b6d4" fontSize="7" fontWeight="bold" fontFamily="var(--font-mono)">Min Vol</text>
                      </g>
                    );
                  })()}

                  {/* Active Custom Portfolio pulse */}
                  {(() => {
                    const activeCoords = getOptSvgCoords(activePortfolioStats.volatility * 100, activePortfolioStats.expectedReturn * 100);
                    return (
                      <g>
                        <circle cx={activeCoords.x} cy={activeCoords.y} r="8" fill="rgba(239, 68, 68, 0.4)">
                          <animate attributeName="r" values="6;11;6" dur="1.8s" repeatCount="indefinite" />
                        </circle>
                        <circle cx={activeCoords.x} cy={activeCoords.y} r="4" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
                        <text x={activeCoords.x + 8} y={activeCoords.y - 8} fill="#ef4444" fontSize="8.5" fontWeight="bold" fontFamily="var(--font-sans)">Active</text>
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>

            {/* Risk Contribution Analysis */}
            <div className="glass-panel" style={{ padding: "28px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "8px", color: "var(--foreground)" }}>Risk Contribution Analysis</h3>
              <p style={{ color: "var(--slate-400)", fontSize: "0.85rem", marginBottom: "20px", lineHeight: 1.5 }}>
                Euler Decomposition of risk. Displays how much volatility contribution each asset supplies to the total portfolio risk. An equal-risk profile represents a balanced Risk Parity.
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "18px", marginTop: "10px" }}>
                {optAssets.map(asset => {
                  const weightNorm = optWeightsNorm[asset.ticker] || 0;
                  const riskContribution = activePortfolioStats.riskContributions[asset.ticker] || 0;
                  const totalRisk = activePortfolioStats.volatility;
                  const pctOfRisk = totalRisk > 0 ? (riskContribution / totalRisk) * 100 : 0;
                  
                  // Color depending on the ticker index
                  const colors = ["#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#a855f7", "#ec4899", "#3b82f6"];
                  const idx = optAssets.findIndex(a => a.ticker === asset.ticker);
                  const barColor = colors[idx % colors.length];

                  return (
                    <div key={asset.ticker}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                        <div>
                          <span style={{ fontWeight: 600, marginRight: "6px" }}>{asset.ticker}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--slate-400)" }}>(Weight: {Math.round(weightNorm*100)}%)</span>
                        </div>
                        <span style={{ fontWeight: 600, color: barColor, fontFamily: "var(--font-mono)" }}>
                          {(riskContribution * 100).toFixed(2)}% Risk ({Math.round(pctOfRisk)}%)
                        </span>
                      </div>
                      
                      {/* Stacked indicators */}
                      <div style={{ height: "10px", width: "100%", background: "rgba(0,0,0,0.03)", borderRadius: "5px", overflow: "hidden", position: "relative" }}>
                        <div
                          style={{
                            height: "100%",
                            width: `${pctOfRisk}%`,
                            background: barColor,
                            borderRadius: "5px",
                            transition: "width 0.4s ease"
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
