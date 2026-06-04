"use client";

import { useState, useMemo } from "react";

// Types
type StockType = "AAPL" | "GOOGL" | "MSFT" | "AMZN";

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
  while (u === 0) u = rand(); // Convert [0,1) to (0,1)
  while (v === 0) v = rand();
  const num = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return num * stdDev + mean;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(val);
};

export default function FinanceDashboard() {
  // 1. Asset Weights State
  const [weights, setWeights] = useState({
    AAPL: 25,
    GOOGL: 25,
    MSFT: 25,
    AMZN: 25
  });

  // 2. Monte Carlo Parameters State
  const [initialCapital, setInitialCapital] = useState(10000);
  const [monthlyContribution, setMonthlyContribution] = useState(200);
  const [horizon, setHorizon] = useState(10); // in years
  const [hoverYear, setHoverYear] = useState<number | null>(null);

  // Asset parameters (historical statistics)
  const returns = [0.15, 0.12, 0.14, 0.16];
  const vols = [0.22, 0.25, 0.20, 0.27];
  const corr = [
    [1.0, 0.45, 0.55, 0.40],
    [0.45, 1.0, 0.50, 0.48],
    [0.55, 0.50, 1.0, 0.42],
    [0.40, 0.48, 0.42, 1.0]
  ];

  const handleWeightChange = (stock: StockType, value: number) => {
    setWeights(prev => ({
      ...prev,
      [stock]: value
    }));
  };

  // 3. Portfolio Optimization Math (Mean-Variance)
  const portfolioStats = useMemo(() => {
    const totalWeight = weights.AAPL + weights.GOOGL + weights.MSFT + weights.AMZN;
    const wNorm = totalWeight > 0
      ? [weights.AAPL / totalWeight, weights.GOOGL / totalWeight, weights.MSFT / totalWeight, weights.AMZN / totalWeight]
      : [0.25, 0.25, 0.25, 0.25];

    let portReturn = 0;
    for (let i = 0; i < 4; i++) {
      portReturn += wNorm[i] * returns[i];
    }

    let portVar = 0;
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        portVar += wNorm[i] * wNorm[j] * vols[i] * vols[j] * corr[i][j];
      }
    }
    const portVol = Math.sqrt(portVar);
    const rf = 0.04; // risk-free rate (4%)
    const sharpe = portVol > 0 ? (portReturn - rf) / portVol : 0;

    return {
      wNorm,
      portReturn,
      portVol,
      sharpe,
      expectedReturnPct: portReturn * 100,
      volatilityPct: portVol * 100
    };
  }, [weights]);

  const { wNorm, portReturn, portVol, sharpe, expectedReturnPct, volatilityPct } = portfolioStats;

  // Efficient Frontier SVG coordinates mapper
  const getSvgCoords = (vol: number, ret: number) => {
    const x = 50 + ((vol - 10) / (35 - 10)) * 300;
    const y = 220 - ((ret - 5) / (20 - 5)) * 190;
    return { x: Math.max(50, Math.min(380, x)), y: Math.max(30, Math.min(220, y)) };
  };

  const userCoords = getSvgCoords(volatilityPct, expectedReturnPct);

  // 4. Monte Carlo Simulation Calculations
  const simulationData = useMemo(() => {
    const numPaths = 100;
    const rand = createSeededRandom(1337); // Seeded LCG
    const annualContribution = monthlyContribution * 12;

    // Generate simulated value paths
    const paths: number[][] = [];
    for (let p = 0; p < numPaths; p++) {
      const path = [initialCapital];
      let val = initialCapital;
      for (let y = 1; y <= horizon; y++) {
        // Sample annual return using Box-Muller transform
        const annReturn = boxMuller(rand, portReturn, portVol);
        // Portfolio value compounding with annual contribution added at beginning of year
        val = (val + annualContribution) * (1 + annReturn);
        path.push(Math.max(0, val));
      }
      paths.push(path);
    }

    // Process percentiles for each year
    const percentiles = [];
    for (let y = 0; y <= horizon; y++) {
      const values = paths.map(p => p[y]).sort((a, b) => a - b);
      const cash = initialCapital + y * annualContribution;
      
      percentiles.push({
        year: y,
        p10: values[Math.floor(numPaths * 0.15)], // 15th percentile (pessimistic)
        p50: values[Math.floor(numPaths * 0.50)], // Median (expected)
        p90: values[Math.floor(numPaths * 0.85)], // 85th percentile (optimistic)
        cash
      });
    }

    // Capture a few sample jagged paths to overlay (e.g. paths 3, 17, 42)
    const samplePaths = [paths[3], paths[17], paths[42]];

    return {
      percentiles,
      samplePaths
    };
  }, [initialCapital, monthlyContribution, horizon, portReturn, portVol]);

  const { percentiles, samplePaths } = simulationData;

  // Maximum value for scaling the simulation chart
  const simulationMaxY = useMemo(() => {
    const maxVal = Math.max(...percentiles.map(p => p.p90));
    return maxVal > 0 ? maxVal * 1.05 : 10000;
  }, [percentiles]);

  const getSimCoords = (year: number, value: number) => {
    const x = 60 + (year / horizon) * 410;
    const y = 240 - (value / simulationMaxY) * 200;
    return { x, y: Math.max(20, Math.min(240, y)) };
  };

  // Convert paths into SVG points strings
  const getPointsString = (series: number[]) => {
    return series
      .map((val, year) => {
        const { x, y } = getSimCoords(year, val);
        return `${x},${y}`;
      })
      .join(" ");
  };

  // Uncertainty band area SVG polygon points
  const getUncertaintyAreaPoints = () => {
    const p10Points = percentiles.map((p, year) => getSimCoords(year, p.p10));
    const p90Points = percentiles.map((p, year) => getSimCoords(year, p.p90));
    
    // SVG polygon goes left-to-right along p90, then right-to-left along p10
    const topPath = p90Points.map(p => `${p.x},${p.y}`).join(" ");
    const bottomPath = [...p10Points].reverse().map(p => `${p.x},${p.y}`).join(" ");
    return `${topPath} ${bottomPath}`;
  };

  // Find dynamic coordinates for hovered tooltip
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

  return (
    <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
      {/* 1. Dashboard Info Header */}
      <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 2.5rem auto" }}>
        <h2 className="gradient-text" style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: "12px" }}>
          Financial Analytics & Optimization
        </h2>
        <p style={{ color: "var(--slate-400)", fontSize: "0.95rem", lineHeight: 1.6 }}>
          Interactive Modern Portfolio Theory (MPT) simulator combined with a stochastic Monte Carlo wealth projector. Adjust your asset weightings, review risk metrics, and project your future compounding returns.
        </p>
      </div>

      {/* 2. Parameters & Stats Grid */}
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
            
            {/* AAPL */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600 }}>Apple Inc. (AAPL)</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>{Math.round(wNorm[0] * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weights.AAPL} 
                onChange={(e) => handleWeightChange("AAPL", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "4px" }}>
                <span>Return: 15%</span>
                <span>Vol: 22%</span>
              </div>
            </div>

            {/* GOOGL */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600 }}>Alphabet Inc. (GOOGL)</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>{Math.round(wNorm[1] * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weights.GOOGL} 
                onChange={(e) => handleWeightChange("GOOGL", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "4px" }}>
                <span>Return: 12%</span>
                <span>Vol: 25%</span>
              </div>
            </div>

            {/* MSFT */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600 }}>Microsoft Corp. (MSFT)</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>{Math.round(wNorm[2] * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weights.MSFT} 
                onChange={(e) => handleWeightChange("MSFT", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "4px" }}>
                <span>Return: 14%</span>
                <span>Vol: 20%</span>
              </div>
            </div>

            {/* AMZN */}
            <div style={{ marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "0.9rem" }}>
                <span style={{ fontWeight: 600 }}>Amazon.com Inc. (AMZN)</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--primary)", fontWeight: 600 }}>{Math.round(wNorm[3] * 100)}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={weights.AMZN} 
                onChange={(e) => handleWeightChange("AMZN", Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--primary)", background: "rgba(255,255,255,0.08)", height: "6px", borderRadius: "3px", cursor: "pointer" }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--slate-400)", marginTop: "4px" }}>
                <span>Return: 16%</span>
                <span>Vol: 27%</span>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setWeights({ AAPL: 25, GOOGL: 25, MSFT: 25, AMZN: 25 })}
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

      {/* 3. Side-by-Side Analytics Charts (Efficient Frontier & Monte Carlo Simulation) */}
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
              <line x1="50" y1="220" x2="380" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1="50" y1="30" x2="50" y2="220" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              
              {/* Y Grid */}
              <line x1="50" y1="157" x2="380" y2="157" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="93" x2="380" y2="93" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="50" y1="30" x2="380" y2="30" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />

              {/* X Grid */}
              <line x1="170" y1="30" x2="170" y2="220" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="290" y1="30" x2="290" y2="220" stroke="rgba(255,255,255,0.03)" strokeWidth="1" strokeDasharray="3 3" />

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
              <circle cx="194" cy="93.3" r="5" fill="#f59e0b" />
              <text x="202" y="91" fill="var(--slate-400)" fontSize="8" fontFamily="var(--font-sans)">AAPL</text>

              <circle cx="230" cy="131.3" r="5" fill="#ea580c" />
              <text x="238" y="134" fill="var(--slate-400)" fontSize="8" fontFamily="var(--font-sans)">GOOGL</text>

              <circle cx="170" cy="106" r="5" fill="#a855f7" />
              <text x="178" y="103" fill="var(--slate-400)" fontSize="8" fontFamily="var(--font-sans)">MSFT</text>

              <circle cx="254" cy="80.7" r="5" fill="#ef4444" />
              <text x="262" y="78" fill="var(--slate-400)" fontSize="8" fontFamily="var(--font-sans)">AMZN</text>

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
              <line x1="60" y1="240" x2="470" y2="240" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
              <line x1="60" y1="20" x2="60" y2="240" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              {/* Y Gridlines */}
              <line x1="60" y1="185" x2="470" y2="185" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="60" y1="130" x2="470" y2="130" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="60" y1="75" x2="470" y2="75" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="60" y1="20" x2="470" y2="20" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />

              {/* X Gridlines */}
              <line x1={60 + 410 * 0.25} y1="20" x2={60 + 410 * 0.25} y2="240" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={60 + 410 * 0.5} y1="20" x2={60 + 410 * 0.5} y2="240" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={60 + 410 * 0.75} y1="20" x2={60 + 410 * 0.75} y2="240" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="470" y1="20" x2="470" y2="240" stroke="rgba(255,255,255,0.02)" strokeWidth="1" strokeDasharray="3 3" />

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
                stroke="rgba(255, 255, 255, 0.3)"
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
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />

                  {/* Circle nodes on lines */}
                  <circle cx={hoverMetrics.coords.p90.x} cy={hoverMetrics.coords.p90.y} r="4" fill="#10b981" />
                  <circle cx={hoverMetrics.coords.p50.x} cy={hoverMetrics.coords.p50.y} r="5.5" fill="var(--primary)" stroke="#ffffff" strokeWidth="1" />
                  <circle cx={hoverMetrics.coords.p10.x} cy={hoverMetrics.coords.p10.y} r="4" fill="#f97316" />
                  <circle cx={hoverMetrics.coords.cash.x} cy={hoverMetrics.coords.cash.y} r="3.5" fill="rgba(255, 255, 255, 0.6)" />

                  {/* Tooltip Card inside the SVG */}
                  <g transform={`translate(${hoverMetrics.coords.p50.x > 250 ? hoverMetrics.coords.p50.x - 165 : hoverMetrics.coords.p50.x + 15}, 25)`}>
                    <rect
                      width="150"
                      height="125"
                      rx="8"
                      fill="rgba(2, 18, 22, 0.96)"
                      stroke="rgba(6, 182, 212, 0.25)"
                      strokeWidth="1.5"
                      style={{ backdropFilter: "blur(6px)" }}
                    />
                    
                    {/* Tooltip Content */}
                    <text x="12" y="20" fill="var(--foreground)" fontSize="9" fontWeight="bold" fontFamily="var(--font-mono)">
                      YEAR {hoverMetrics.p.year} METRICS
                    </text>
                    <line x1="12" y1="26" x2="138" y2="26" stroke="rgba(255, 255, 255, 0.1)" strokeWidth="1" />
                    
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

                    <text x="12" y="102" fill="rgba(255,255,255,0.6)" fontSize="9" fontFamily="var(--font-sans)">
                      ■ Saved Cash:
                    </text>
                    <text x="138" y="102" fill="rgba(255,255,255,0.6)" fontSize="9" fontWeight="bold" textAnchor="end" fontFamily="var(--font-mono)">
                      {formatCurrency(hoverMetrics.p.cash)}
                    </text>

                    {/* Growth factor calculation */}
                    <text x="12" y="116" fill="rgba(6, 182, 212, 0.7)" fontSize="8.5" fontFamily="var(--font-mono)">
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
  );
}
