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

interface CorporateYearData {
  year: number;
  revenue: number; // in USD or INR, e.g. 9000 for 9.0K
  profit: number;  // absolute profit
  margin: number;  // in percent (e.g. 10.3)
  ebitda: number;  // ebitda value
  growth: number;  // growth percent (e.g. 8.3)
  roce: number;    // return on capital employed (e.g. 35.2)
}

const CORPORATE_DATA: CorporateYearData[] = [
  { year: 2016, revenue: 9000, profit: 931, margin: 10.34, ebitda: 1720, growth: 8.3, roce: 35.2 },
  { year: 2017, revenue: 9600, profit: 990, margin: 10.31, ebitda: 1840, growth: 6.67, roce: 37.8 },
  { year: 2018, revenue: 11200, profit: 1180, margin: 10.54, ebitda: 2150, growth: 16.67, roce: 42.1 },
  { year: 2019, revenue: 13800, profit: 1450, margin: 10.51, ebitda: 2650, growth: 23.21, roce: 46.5 },
  { year: 2020, revenue: 13100, profit: 1550, margin: 11.83, ebitda: 2510, growth: -5.07, roce: 41.2 },
  { year: 2021, revenue: 13700, profit: 1630, margin: 11.90, ebitda: 2630, growth: 4.58, roce: 43.4 },
  { year: 2022, revenue: 14100, profit: 1700, margin: 12.06, ebitda: 2710, growth: 2.92, roce: 44.0 },
  { year: 2023, revenue: 15800, profit: 2139, margin: 13.54, ebitda: 3040, growth: 12.06, roce: 49.8 },
  { year: 2024, revenue: 16400, profit: 2082, margin: 12.69, ebitda: 3150, growth: 3.80, roce: 47.3 },
  { year: 2025, revenue: 15000, profit: 2131, margin: 14.21, ebitda: 2880, growth: -8.54, roce: 45.5 },
];

interface DmartMonthlyData {
  month: string;
  actual2025: number;
  forecast2026: number;
  budget2027: number;
}

interface DmartStackedData {
  month: string;
  salaries: number;
  general: number;
  allocated: number;
}

const DMART_NET_INCOME: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 2000, forecast2026: 2150, budget2027: 2300 },
  { month: "Feb", actual2025: 2050, forecast2026: 2200, budget2027: 2350 },
  { month: "Mar", actual2025: 2100, forecast2026: 2250, budget2027: 2400 },
  { month: "Apr", actual2025: 2150, forecast2026: 2300, budget2027: 2450 },
  { month: "May", actual2025: 2200, forecast2026: 2350, budget2027: 2500 },
  { month: "Jun", actual2025: 2250, forecast2026: 2400, budget2027: 2550 },
  { month: "Jul", actual2025: 2300, forecast2026: 2450, budget2027: 2600 },
  { month: "Aug", actual2025: 2320, forecast2026: 2480, budget2027: 2620 },
  { month: "Sep", actual2025: 2350, forecast2026: 2520, budget2027: 2680 },
  { month: "Oct", actual2025: 2400, forecast2026: 2580, budget2027: 2750 },
  { month: "Nov", actual2025: 2430, forecast2026: 2620, budget2027: 2900 },
  { month: "Dec", actual2025: 2400, forecast2026: 2600, budget2027: 3100 }
];

const DMART_GROSS_MARGIN: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 5600, forecast2026: 6100, budget2027: 6600 },
  { month: "Feb", actual2025: 5750, forecast2026: 6250, budget2027: 6750 },
  { month: "Mar", actual2025: 5900, forecast2026: 6400, budget2027: 6900 },
  { month: "Apr", actual2025: 6000, forecast2026: 6550, budget2027: 7050 },
  { month: "May", actual2025: 6100, forecast2026: 6700, budget2027: 7200 },
  { month: "Jun", actual2025: 6200, forecast2026: 6850, budget2027: 7350 },
  { month: "Jul", actual2025: 6300, forecast2026: 7000, budget2027: 7500 },
  { month: "Aug", actual2025: 6350, forecast2026: 7100, budget2027: 7600 },
  { month: "Sep", actual2025: 6400, forecast2026: 7250, budget2027: 7750 },
  { month: "Oct", actual2025: 6500, forecast2026: 7400, budget2027: 7900 },
  { month: "Nov", actual2025: 6630, forecast2026: 7550, budget2027: 8200 },
  { month: "Dec", actual2025: 6600, forecast2026: 7700, budget2027: 8520 }
];

const DMART_OP_EXPENSES: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 2500, forecast2026: 2700, budget2027: 3000 },
  { month: "Feb", actual2025: 2550, forecast2026: 2750, budget2027: 3050 },
  { month: "Mar", actual2025: 2600, forecast2026: 2800, budget2027: 3100 },
  { month: "Apr", actual2025: 2650, forecast2026: 2850, budget2027: 3150 },
  { month: "May", actual2025: 2700, forecast2026: 2900, budget2027: 3200 },
  { month: "Jun", actual2025: 2750, forecast2026: 2950, budget2027: 3250 },
  { month: "Jul", actual2025: 2800, forecast2026: 3000, budget2027: 3300 },
  { month: "Aug", actual2025: 2820, forecast2026: 3050, budget2027: 3350 },
  { month: "Sep", actual2025: 2850, forecast2026: 3100, budget2027: 3400 },
  { month: "Oct", actual2025: 2900, forecast2026: 3200, budget2027: 3500 },
  { month: "Nov", actual2025: 3100, forecast2026: 3400, budget2027: 3600 },
  { month: "Dec", actual2025: 3090, forecast2026: 3350, budget2027: 3600 }
];

const DMART_SALARIES_EXPENSES: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 1000, forecast2026: 1080, budget2027: 1200 },
  { month: "Feb", actual2025: 1020, forecast2026: 1100, budget2027: 1220 },
  { month: "Mar", actual2025: 1040, forecast2026: 1120, budget2027: 1240 },
  { month: "Apr", actual2025: 1060, forecast2026: 1140, budget2027: 1260 },
  { month: "May", actual2025: 1080, forecast2026: 1160, budget2027: 1280 },
  { month: "Jun", actual2025: 1100, forecast2026: 1180, budget2027: 1300 },
  { month: "Jul", actual2025: 1120, forecast2026: 1200, budget2027: 1320 },
  { month: "Aug", actual2025: 1130, forecast2026: 1220, budget2027: 1340 },
  { month: "Sep", actual2025: 1150, forecast2026: 1240, budget2027: 1360 },
  { month: "Oct", actual2025: 1170, forecast2026: 1280, budget2027: 1400 },
  { month: "Nov", actual2025: 1210, forecast2026: 1340, budget2027: 1480 },
  { month: "Dec", actual2025: 1120, forecast2026: 1340, budget2027: 1400 }
];

const DMART_STACKED_EXPENSES: DmartStackedData[] = [
  { month: "Jan", salaries: 1200, general: 1520, allocated: 280 },
  { month: "Feb", salaries: 1220, general: 1540, allocated: 290 },
  { month: "Mar", salaries: 1240, general: 1570, allocated: 290 },
  { month: "Apr", salaries: 1260, general: 1590, allocated: 300 },
  { month: "May", salaries: 1280, general: 1620, allocated: 300 },
  { month: "Jun", salaries: 1300, general: 1640, allocated: 310 },
  { month: "Jul", salaries: 1320, general: 1670, allocated: 310 },
  { month: "Aug", salaries: 1340, general: 1700, allocated: 310 },
  { month: "Sep", salaries: 1360, general: 1730, allocated: 310 },
  { month: "Oct", salaries: 1400, general: 1780, allocated: 320 },
  { month: "Nov", salaries: 1480, general: 1840, allocated: 280 },
  { month: "Dec", salaries: 1400, general: 1840, allocated: 360 }
];

interface CustomerStackedData {
  month: string;
  productSales: number;
  privateLabel: number;
  onlineSub: number;
}

interface DmartOperationalStackedData {
  month: string;
  salaries: number;
  general: number;
  allocated: number;
  depreciation: number;
}

const OPERATIONAL_EXPENSES_LINE: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 300, forecast2026: 340, budget2027: 390 },
  { month: "Feb", actual2025: 305, forecast2026: 345, budget2027: 395 },
  { month: "Mar", actual2025: 315, forecast2026: 355, budget2027: 405 },
  { month: "Apr", actual2025: 320, forecast2026: 360, budget2027: 410 },
  { month: "May", actual2025: 325, forecast2026: 365, budget2027: 415 },
  { month: "Jun", actual2025: 330, forecast2026: 370, budget2027: 420 },
  { month: "Jul", actual2025: 335, forecast2026: 375, budget2027: 425 },
  { month: "Aug", actual2025: 340, forecast2026: 380, budget2027: 430 },
  { month: "Sep", actual2025: 350, forecast2026: 390, budget2027: 440 },
  { month: "Oct", actual2025: 370, forecast2026: 410, budget2027: 460 },
  { month: "Nov", actual2025: 380, forecast2026: 420, budget2027: 475 },
  { month: "Dec", actual2025: 388, forecast2026: 556, budget2027: 364 }
];

const OPERATIONAL_EXPENSES_CATEGORY: DmartOperationalStackedData[] = [
  { month: "Jan", salaries: 155, general: 195, allocated: 26, depreciation: 14 },
  { month: "Feb", salaries: 158, general: 198, allocated: 26, depreciation: 13 },
  { month: "Mar", salaries: 162, general: 203, allocated: 27, depreciation: 13 },
  { month: "Apr", salaries: 164, general: 205, allocated: 27, depreciation: 14 },
  { month: "May", salaries: 166, general: 208, allocated: 27, depreciation: 14 },
  { month: "Jun", salaries: 168, general: 210, allocated: 28, depreciation: 14 },
  { month: "Jul", salaries: 170, general: 213, allocated: 28, depreciation: 14 },
  { month: "Aug", salaries: 172, general: 215, allocated: 28, depreciation: 15 },
  { month: "Sep", salaries: 176, general: 220, allocated: 29, depreciation: 15 },
  { month: "Oct", salaries: 184, general: 230, allocated: 30, depreciation: 16 },
  { month: "Nov", salaries: 190, general: 238, allocated: 31, depreciation: 16 },
  { month: "Dec", salaries: 146, general: 188, allocated: 24, depreciation: 6 }
];

const FINANCIAL_NET_INCOME: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 210, forecast2026: 250, budget2027: 290 },
  { month: "Feb", actual2025: 215, forecast2026: 255, budget2027: 295 },
  { month: "Mar", actual2025: 225, forecast2026: 265, budget2027: 305 },
  { month: "Apr", actual2025: 230, forecast2026: 270, budget2027: 310 },
  { month: "May", actual2025: 235, forecast2026: 275, budget2027: 315 },
  { month: "Jun", actual2025: 240, forecast2026: 280, budget2027: 320 },
  { month: "Jul", actual2025: 245, forecast2026: 285, budget2027: 325 },
  { month: "Aug", actual2025: 250, forecast2026: 290, budget2027: 330 },
  { month: "Sep", actual2025: 260, forecast2026: 300, budget2027: 340 },
  { month: "Oct", actual2025: 280, forecast2026: 320, budget2027: 360 },
  { month: "Nov", actual2025: 290, forecast2026: 330, budget2027: 380 },
  { month: "Dec", actual2025: 347, forecast2026: 350, budget2027: 390 }
];

const FINANCIAL_GROSS_MARGIN: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 645, forecast2026: 750, budget2027: 855 },
  { month: "Feb", actual2025: 660, forecast2026: 765, budget2027: 870 },
  { month: "Mar", actual2025: 680, forecast2026: 789, budget2027: 893 },
  { month: "Apr", actual2025: 693, forecast2026: 803, budget2027: 908 },
  { month: "May", actual2025: 713, forecast2026: 818, budget2027: 923 },
  { month: "Jun", actual2025: 728, forecast2026: 833, budget2027: 938 },
  { month: "Jul", actual2025: 743, forecast2026: 848, budget2027: 953 },
  { month: "Aug", actual2025: 758, forecast2026: 863, budget2027: 968 },
  { month: "Sep", actual2025: 780, forecast2026: 885, budget2027: 990 },
  { month: "Oct", actual2025: 825, forecast2026: 930, budget2027: 1035 },
  { month: "Nov", actual2025: 848, forecast2026: 963, budget2027: 1058 },
  { month: "Dec", actual2025: 891, forecast2026: 975, budget2027: 1088 }
];

const FINANCIAL_REVENUE: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 4300, forecast2026: 5000, budget2027: 5700 },
  { month: "Feb", actual2025: 4400, forecast2026: 5100, budget2027: 5800 },
  { month: "Mar", actual2025: 4550, forecast2026: 5250, budget2027: 5950 },
  { month: "Apr", actual2025: 4650, forecast2026: 5350, budget2027: 6050 },
  { month: "May", actual2025: 4750, forecast2026: 5450, budget2027: 6150 },
  { month: "Jun", actual2025: 4850, forecast2026: 5550, budget2027: 6250 },
  { month: "Jul", actual2025: 4950, forecast2026: 5750, budget2027: 6350 },
  { month: "Aug", actual2025: 5050, forecast2026: 5850, budget2027: 6450 },
  { month: "Sep", actual2025: 5200, forecast2026: 5900, budget2027: 6600 },
  { month: "Oct", actual2025: 5500, forecast2026: 6200, budget2027: 6900 },
  { month: "Nov", actual2025: 5650, forecast2026: 6350, budget2027: 7050 },
  { month: "Dec", actual2025: 5940, forecast2026: 6500, budget2027: 7250 }
];

const CUSTOMER_DIRECT_REVENUE: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 4300, forecast2026: 5000, budget2027: 5700 },
  { month: "Feb", actual2025: 4400, forecast2026: 5100, budget2027: 5800 },
  { month: "Mar", actual2025: 4550, forecast2026: 5250, budget2027: 5950 },
  { month: "Apr", actual2025: 4650, forecast2026: 5350, budget2027: 6050 },
  { month: "May", actual2025: 4750, forecast2026: 5450, budget2027: 6150 },
  { month: "Jun", actual2025: 4850, forecast2026: 5550, budget2027: 6250 },
  { month: "Jul", actual2025: 4950, forecast2026: 5750, budget2027: 6350 },
  { month: "Aug", actual2025: 5050, forecast2026: 5850, budget2027: 6450 },
  { month: "Sep", actual2025: 5200, forecast2026: 5900, budget2027: 6600 },
  { month: "Oct", actual2025: 5500, forecast2026: 6200, budget2027: 6900 },
  { month: "Nov", actual2025: 5650, forecast2026: 6350, budget2027: 7050 },
  { month: "Dec", actual2025: 5940, forecast2026: 6500, budget2027: 7250 }
];

const CUSTOMER_REVENUE_BREAKDOWN: CustomerStackedData[] = [
  { month: "Jan", productSales: 3990, privateLabel: 1140, onlineSub: 570 },
  { month: "Feb", productSales: 4060, privateLabel: 1160, onlineSub: 580 },
  { month: "Mar", productSales: 4165, privateLabel: 1190, onlineSub: 595 },
  { month: "Apr", productSales: 4235, privateLabel: 1210, onlineSub: 605 },
  { month: "May", productSales: 4305, privateLabel: 1230, onlineSub: 615 },
  { month: "Jun", productSales: 4375, privateLabel: 1250, onlineSub: 625 },
  { month: "Jul", productSales: 4445, privateLabel: 1270, onlineSub: 635 },
  { month: "Aug", productSales: 4515, privateLabel: 1290, onlineSub: 645 },
  { month: "Sep", productSales: 4620, privateLabel: 1320, onlineSub: 660 },
  { month: "Oct", productSales: 4830, privateLabel: 1380, onlineSub: 690 },
  { month: "Nov", productSales: 4935, privateLabel: 1410, onlineSub: 705 },
  { month: "Dec", productSales: 5075, privateLabel: 1450, onlineSub: 725 }
];

const DMART_FTE_COUNT: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 16000, forecast2026: 17300, budget2027: 18800 },
  { month: "Feb", actual2025: 16100, forecast2026: 17500, budget2027: 19000 },
  { month: "Mar", actual2025: 16200, forecast2026: 17700, budget2027: 19200 },
  { month: "Apr", actual2025: 16300, forecast2026: 17900, budget2027: 19400 },
  { month: "May", actual2025: 16400, forecast2026: 18100, budget2027: 19600 },
  { month: "Jun", actual2025: 16500, forecast2026: 18300, budget2027: 19800 },
  { month: "Jul", actual2025: 16600, forecast2026: 18500, budget2027: 20000 },
  { month: "Aug", actual2025: 16700, forecast2026: 18700, budget2027: 20200 },
  { month: "Sep", actual2025: 16800, forecast2026: 18900, budget2027: 20400 },
  { month: "Oct", actual2025: 16900, forecast2026: 19200, budget2027: 20700 },
  { month: "Nov", actual2025: 16950, forecast2026: 19500, budget2027: 21000 },
  { month: "Dec", actual2025: 16959, forecast2026: 19600, budget2027: 21300 }
];

const PEOPLE_SALARIES_LINE: DmartMonthlyData[] = [
  { month: "Jan", actual2025: 120, forecast2026: 135, budget2027: 155 },
  { month: "Feb", actual2025: 122, forecast2026: 138, budget2027: 158 },
  { month: "Mar", actual2025: 128, forecast2026: 142, budget2027: 162 },
  { month: "Apr", actual2025: 128, forecast2026: 144, budget2027: 164 },
  { month: "May", actual2025: 130, forecast2026: 146, budget2027: 166 },
  { month: "Jun", actual2025: 132, forecast2026: 148, budget2027: 168 },
  { month: "Jul", actual2025: 134, forecast2026: 150, budget2027: 170 },
  { month: "Aug", actual2025: 136, forecast2026: 152, budget2027: 172 },
  { month: "Sep", actual2025: 140, forecast2026: 156, budget2027: 176 },
  { month: "Oct", actual2025: 148, forecast2026: 164, budget2027: 184 },
  { month: "Nov", actual2025: 152, forecast2026: 170, budget2027: 190 },
  { month: "Dec", actual2025: 156, forecast2026: 175, budget2027: 194 }
];

interface FinanceDashboardProps {
  defaultTab?: "wealth" | "optimization" | "corporate" | "dmart";
  allowedTabs?: Array<"wealth" | "optimization" | "corporate" | "dmart">;
  title?: string;
  subtitle?: string;
}

export default function FinanceDashboard({
  defaultTab = "corporate",
  allowedTabs = ["corporate", "wealth", "optimization", "dmart"],
  title = "Financial Analytics & Optimization",
  subtitle = "Interactive Modern Portfolio Theory (MPT) simulator combined with a stochastic Monte Carlo wealth projector. Adjust weights manually or run advanced mathematical optimizations."
}: FinanceDashboardProps = {}) {
  // --- MARKET REGION TOGGLE ---
  const [marketRegion, setMarketRegion] = useState<"US" | "IN">("US");

  // --- SUB-DASHBOARD TAB SELECTION ---
  const [dashboardTab, setDashboardTab] = useState<"wealth" | "optimization" | "corporate" | "dmart">(defaultTab);

  // Sync state if defaultTab prop changes dynamically
  useEffect(() => {
    setDashboardTab(defaultTab);
  }, [defaultTab]);

  // --- DMART SHEET TAB STATE ---
  const [dmartSheet, setDmartSheet] = useState<"summary" | "financial" | "operational" | "workforce" | "customer">("summary");

  // --- CORPORATE YEAR DATA STATE ---
  const [corporateData, setCorporateData] = useState<CorporateYearData[]>(CORPORATE_DATA);

  // Load cached corporate data on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem("uploaded_corporate_data");
      if (cached) {
        try {
          setCorporateData(JSON.parse(cached));
        } catch (err) {
          console.error("Failed to parse cached corporate data", err);
        }
      }
    }
  }, []);

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const XLSX = await import("xlsx");
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawRows = XLSX.utils.sheet_to_json<any>(ws);

        if (rawRows.length === 0) {
          alert("The uploaded spreadsheet contains no data.");
          return;
        }

        const parsedData: CorporateYearData[] = rawRows.map((row: any) => {
          const getVal = (keys: string[]) => {
            const foundKey = Object.keys(row).find(k => 
              keys.some(key => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''))
            );
            return foundKey ? parseFloat(row[foundKey]) : 0;
          };

          const year = getVal(["year", "yr"]);
          const revenue = getVal(["revenue", "rev", "sales"]);
          const profit = getVal(["profit", "netincome", "earnings"]);
          const margin = getVal(["margin", "profitmargin", "pmargin"]);
          const ebitda = getVal(["ebitda", "ebitda"]);
          const growth = getVal(["growth", "revgrowth", "revenuegrowth"]);
          const roce = getVal(["roce", "roce", "returnoncapital"]);

          return { year, revenue, profit, margin, ebitda, growth, roce };
        }).filter(d => !isNaN(d.year) && d.year > 0);

        if (parsedData.length === 0) {
          alert("Could not parse any valid year data. Please download the template to check headers.");
          return;
        }

        parsedData.sort((a, b) => a.year - b.year);

        setCorporateData(parsedData);
        localStorage.setItem("uploaded_corporate_data", JSON.stringify(parsedData));
      } catch (err) {
        console.error("Excel parse failed", err);
        alert("Failed to parse the file. Please make sure it is a valid Excel (.xlsx, .xls) or CSV file.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const downloadExcelTemplate = () => {
    const headers = ["Year", "Revenue", "Profit", "EBITDA", "Margin", "Growth", "ROCE"];
    const rows = [
      [2016, 9000, 931, 1720, 10.34, 8.3, 35.2],
      [2017, 9600, 990, 1840, 10.31, 6.67, 37.8],
      [2018, 11200, 1180, 2150, 10.54, 16.67, 42.1],
      [2019, 13800, 1450, 2650, 10.51, 23.21, 46.5],
      [2020, 13100, 1550, 2510, 11.83, -5.07, 41.2],
      [2021, 13700, 1630, 2630, 11.90, 4.58, 43.4],
      [2022, 14100, 1700, 12.06, 2710, 2.92, 44.0],
      [2023, 15800, 2139, 3040, 13.54, 12.06, 49.8],
      [2024, 16400, 2082, 3150, 12.69, 3.80, 47.3],
      [2025, 15000, 2131, 2880, 14.21, -8.54, 45.5]
    ];
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "corporate_performance_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- CORPORATE PAGE SELECTION ---
  const [corpPage, setCorpPage] = useState<1 | 2>(1);

  const corpStats = useMemo(() => {
    if (corporateData.length === 0) {
      return { totalRevenue: "0", totalProfit: "0", totalEbitda: "0", overallMargin: "0%", overallGrowth: "0%", overallRoce: "0%" };
    }
    const totalRevVal = corporateData.reduce((acc, d) => acc + d.revenue, 0);
    const totalProfitVal = corporateData.reduce((acc, d) => acc + d.profit, 0);
    const totalEbitdaVal = corporateData.reduce((acc, d) => acc + d.ebitda, 0);
    const avgMarginVal = corporateData.reduce((acc, d) => acc + d.margin, 0) / corporateData.length;
    const avgGrowthVal = corporateData.reduce((acc, d) => acc + d.growth, 0) / corporateData.length;
    const avgRoceVal = corporateData.reduce((acc, d) => acc + d.roce, 0) / corporateData.length;

    const isDemo = corporateData.length === CORPORATE_DATA.length && corporateData[0]?.year === 2016 && corporateData[9]?.year === 2025;

    return {
      totalRevenue: isDemo ? "130K" : (totalRevVal >= 1000 ? Math.round(totalRevVal / 1000) + "K" : totalRevVal.toString()),
      totalProfit: isDemo ? "16K" : (totalProfitVal >= 1000 ? Math.round(totalProfitVal / 1000) + "K" : totalProfitVal.toString()),
      totalEbitda: isDemo ? "25K" : (totalEbitdaVal >= 1000 ? Math.round(totalEbitdaVal / 1000) + "K" : totalEbitdaVal.toString()),
      overallMargin: isDemo ? "12.11%" : avgMarginVal.toFixed(2) + "%",
      overallGrowth: isDemo ? "6.93%" : avgGrowthVal.toFixed(2) + "%",
      overallRoce: isDemo ? "43.71%" : avgRoceVal.toFixed(2) + "%"
    };
  }, [corporateData]);

  const corpInsights = useMemo(() => {
    if (corporateData.length === 0) return [];
    
    const isDemo = corporateData.length === CORPORATE_DATA.length && corporateData[0]?.year === 2016 && corporateData[9]?.year === 2025;
    if (isDemo) {
      return [
        { title: "Revenue shows consistent growth", text: "over 10 years, expanding from 9.0K in 2016 to peak at 16.4K in 2024." },
        { title: "Profit remains stable", text: "with a clear high peak around 2023 at 2,139 and consistent levels above 2.0K in recent years." },
        { title: "Profit Margins have improved", text: "overall, rising from 10.3% in 2016 to peak at 14.2% in 2025, after recovering from a slight decline in 2024." }
      ];
    }

    const firstYear = corporateData[0];
    const peakRev = [...corporateData].sort((a, b) => b.revenue - a.revenue)[0];
    const peakProfit = [...corporateData].sort((a, b) => b.profit - a.profit)[0];
    const peakMargin = [...corporateData].sort((a, b) => b.margin - a.margin)[0];

    return [
      {
        title: "Revenue expansion",
        text: `measured from ${(firstYear.revenue / 1000).toFixed(1)}K in ${firstYear.year} to peak at ${(peakRev.revenue / 1000).toFixed(1)}K in ${peakRev.year}.`
      },
      {
        title: "Profit peak performance",
        text: `recorded in ${peakProfit.year} at ${peakProfit.profit.toLocaleString()} with stability over the ${corporateData.length}-year horizon.`
      },
      {
        title: "Profit Margin progress",
        text: `shifting from a baseline of ${firstYear.margin.toFixed(1)}% in ${firstYear.year} to top out at ${peakMargin.margin.toFixed(1)}% in ${peakMargin.year}.`
      }
    ];
  }, [corporateData]);

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

  const renderDmartKpiCard = (
    title: string,
    budgetVal: string,
    actualVal: string,
    changeVal: string
  ) => {
    const isPositive = changeVal.includes("▲");
    const isNegative = changeVal.includes("▼");
    const changeColor = isPositive ? "#2e7d32" : isNegative ? "#c62828" : "#546e7a";

    return (
      <div style={{
        background: "#f8fafc",
        border: "1px solid #cbd5e1",
        borderRadius: "4px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 1px 2px rgba(0,0,0,0.02)",
        overflow: "hidden"
      }}>
        {/* Title Header with light blue accent */}
        <div style={{
          background: "#d9e1f2",
          color: "#1f4e78",
          fontWeight: 700,
          fontSize: "0.85rem",
          textAlign: "center",
          padding: "6px 8px",
          borderBottom: "1px solid #b4c6e7"
        }}>
          {title}
        </div>
        
        {/* Card Contents */}
        <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: "8px" }}>
          
          {/* Row 1: Budget */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
            <span style={{ fontSize: "1.45rem", fontWeight: 700, color: "#1e293b", fontFamily: "var(--font-mono)" }}>
              {budgetVal}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
              2027 Budget
            </span>
          </div>

          {/* Row 2: Actual */}
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", borderTop: "1px dashed #e2e8f0", paddingTop: "6px" }}>
            <span style={{ fontSize: "1.15rem", fontWeight: 600, color: "#475569", fontFamily: "var(--font-mono)" }}>
              {actualVal}
            </span>
            <span style={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 500 }}>
              2025 Actual
            </span>
          </div>

          {/* Row 3: Percent Change */}
          <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontWeight: 700,
            fontSize: "0.82rem",
            color: changeColor,
            paddingTop: "2px"
          }}>
            {changeVal}
          </div>
        </div>
      </div>
    );
  };

  const renderDmartLineChart = (
    title: string,
    data: DmartMonthlyData[],
    yFormatter: (val: number) => string
  ) => {
    const allVals = data.flatMap(d => [d.actual2025, d.forecast2026, d.budget2027]);
    const minVal = Math.min(...allVals);
    const maxVal = Math.max(...allVals);
    const diff = maxVal - minVal;
    const yMin = Math.max(0, Math.floor(minVal - diff * 0.1));
    const yMax = Math.ceil(maxVal + diff * 0.1);
    const yRange = yMax - yMin;

    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    const chartWidth = 500 - paddingLeft - paddingRight;
    const chartHeight = 240 - paddingTop - paddingBottom;

    const getX = (index: number) => paddingLeft + (index / 11) * chartWidth;
    const getY = (val: number) => paddingTop + chartHeight - ((val - yMin) / (yRange || 1)) * chartHeight;

    const ticks = Array.from({ length: 5 }, (_, i) => yMin + (i / 4) * yRange);

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h5 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>{title}</h5>
        <div style={{ position: "relative", width: "100%", height: "200px" }}>
          <svg viewBox="0 0 500 240" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {ticks.map((tick, idx) => {
              const y = getY(tick);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="var(--font-mono)">
                    {yFormatter(tick)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = getX(i);
              return (
                <g key={d.month}>
                  <line x1={x} y1={paddingTop + chartHeight} x2={x} y2={paddingTop + chartHeight + 4} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                  <text x={x} y={paddingTop + chartHeight + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="var(--font-sans)">
                    {d.month}
                  </text>
                </g>
              );
            })}

            {/* Actual 2025 (solid green line `#385723`) */}
            {(() => {
              const pts = data.map((d, i) => `${getX(i)},${getY(d.actual2025)}`).join(" ");
              return (
                <g>
                  <polyline points={pts} fill="none" stroke="#385723" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.actual2025)} r="3" fill="#385723" stroke="#ffffff" strokeWidth="0.8" />
                  ))}
                </g>
              );
            })()}

            {/* Forecast 2026 (blue dashed line `#2f5597`) */}
            {(() => {
              const pts = data.map((d, i) => `${getX(i)},${getY(d.forecast2026)}`).join(" ");
              return (
                <g>
                  <polyline points={pts} fill="none" stroke="#2f5597" strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" strokeLinejoin="round" />
                  {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.forecast2026)} r="3" fill="#2f5597" stroke="#ffffff" strokeWidth="0.8" />
                  ))}
                </g>
              );
            })()}

            {/* Budget 2027 (orange dotted line `#c55a11`) */}
            {(() => {
              const pts = data.map((d, i) => `${getX(i)},${getY(d.budget2027)}`).join(" ");
              return (
                <g>
                  <polyline points={pts} fill="none" stroke="#c55a11" strokeWidth="2" strokeDasharray="1 2" strokeLinecap="round" strokeLinejoin="round" />
                  {data.map((d, i) => (
                    <circle key={i} cx={getX(i)} cy={getY(d.budget2027)} r="3" fill="#c55a11" stroke="#ffffff" strokeWidth="0.8" />
                  ))}
                </g>
              );
            })()}
          </svg>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "8px", fontSize: "0.75rem" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "3px", background: "#c55a11" }} /> Budget - 2027
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "3px", borderBottom: "2px dashed #2f5597" }} /> Forecast - 2026
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "3px", background: "#385723" }} /> Actual - 2025
          </span>
        </div>
      </div>
    );
  };

  const renderDmartStackedBarChart = (
    title: string,
    data: DmartOperationalStackedData[],
    yFormatter: (val: number) => string
  ) => {
    const yMax = 500;
    
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    const chartWidth = 500 - paddingLeft - paddingRight;
    const chartHeight = 240 - paddingTop - paddingBottom;

    const getX = (index: number) => paddingLeft + (index / 12) * chartWidth;
    const getY = (val: number) => paddingTop + chartHeight - (val / yMax) * chartHeight;

    const ticks = [0, 100, 200, 300, 400, 500];

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h5 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>{title}</h5>
        <div style={{ position: "relative", width: "100%", height: "200px" }}>
          <svg viewBox="0 0 500 240" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {ticks.map((tick, idx) => {
              const y = getY(tick);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="var(--font-mono)">
                    {yFormatter(tick)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = getX(i) + (chartWidth / 12) / 2;
              return (
                <g key={d.month}>
                  <line x1={x} y1={paddingTop + chartHeight} x2={x} y2={paddingTop + chartHeight + 4} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                  <text x={x} y={paddingTop + chartHeight + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="var(--font-sans)">
                    {d.month}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const colW = (chartWidth / 12) * 0.6;
              const x = getX(i) + ((chartWidth / 12) - colW) / 2;

              const ySalaries = getY(d.salaries);
              const hSalaries = paddingTop + chartHeight - ySalaries;

              const yGeneral = getY(d.salaries + d.general);
              const hGeneral = ySalaries - yGeneral;

              const yAllocated = getY(d.salaries + d.general + d.allocated);
              const hAllocated = yGeneral - yAllocated;

              const yDepreciation = getY(d.salaries + d.general + d.allocated + d.depreciation);
              const hDepreciation = yAllocated - yDepreciation;

              return (
                <g key={d.month}>
                  <rect x={x} y={ySalaries} width={colW} height={hSalaries} fill="#c00000" />
                  <rect x={x} y={yGeneral} width={colW} height={hGeneral} fill="#385723" />
                  <rect x={x} y={yAllocated} width={colW} height={hAllocated} fill="#2f5597" />
                  <rect x={x} y={yDepreciation} width={colW} height={hDepreciation} fill="#c55a11" />
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "8px", fontSize: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#c00000" }} /> Salaries & Related
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#385723" }} /> General Operating Expenses
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#2f5597" }} /> Allocated Expenses
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#c55a11" }} /> Depreciation & Amortization
          </span>
        </div>
      </div>
    );
  };

  const renderDmartMonthlyTable = (
    budgetRows: {
      label: string;
      jan: number;
      feb: number;
      mar: number;
      apr: number;
      may: number;
      jun: number;
      jul: number;
      aug: number;
      sep: number;
      oct: number;
      nov: number;
      dec: number;
      fullYear: number;
    }[]
  ) => {
    return (
      <div style={{ overflowX: "auto", border: "1px solid #cbd5e1", borderRadius: "4px", background: "#ffffff", marginTop: "15px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", textAlign: "right" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "1px solid #cbd5e1" }}>
              <th style={{ textAlign: "left", padding: "8px 12px", color: "#475569", fontWeight: 700 }}>Account Analysis</th>
              {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Full Year"].map((m) => (
                <th key={m} style={{ padding: "8px 12px", color: "#475569", fontWeight: 700 }}>{m}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {budgetRows.map((row, idx) => {
              const isTotal = row.label === "Total";
              return (
                <tr key={idx} style={{
                  borderBottom: isTotal ? "2px double #475569" : "1px solid #e2e8f0",
                  fontWeight: isTotal ? "bold" : "normal",
                  background: isTotal ? "#f8fafc" : "transparent"
                }}>
                  <td style={{ textAlign: "left", padding: "8px 12px", color: isTotal ? "#1e293b" : "#475569", fontWeight: isTotal ? "bold" : 500 }}>{row.label}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.jan.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.feb.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.mar.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.apr.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.may.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.jun.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.jul.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.aug.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.sep.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.oct.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.nov.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)" }}>{row.dec.toLocaleString()}</td>
                  <td style={{ padding: "8px 12px", fontFamily: "var(--font-mono)", fontWeight: "bold", color: "#1e3a8a" }}>{row.fullYear.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  const renderCustomerStackedBarChart = (
    title: string,
    data: CustomerStackedData[],
    yFormatter: (val: number) => string
  ) => {
    const yMax = 8000;
    const paddingLeft = 55;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;
    const chartWidth = 500 - paddingLeft - paddingRight;
    const chartHeight = 240 - paddingTop - paddingBottom;

    const getX = (index: number) => paddingLeft + (index / 12) * chartWidth;
    const getY = (val: number) => paddingTop + chartHeight - (val / yMax) * chartHeight;

    const ticks = [0, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000];

    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "16px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <h5 style={{ fontSize: "0.95rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "6px" }}>{title}</h5>
        <div style={{ position: "relative", width: "100%", height: "200px" }}>
          <svg viewBox="0 0 500 240" style={{ width: "100%", height: "100%", overflow: "visible" }}>
            {ticks.map((tick, idx) => {
              const y = getY(tick);
              return (
                <g key={idx}>
                  <line x1={paddingLeft} y1={y} x2={500 - paddingRight} y2={y} stroke="rgba(0,0,0,0.05)" strokeWidth="1" />
                  <text x={paddingLeft - 8} y={y + 3} fill="#64748b" fontSize="8.5" textAnchor="end" fontFamily="var(--font-mono)">
                    {yFormatter(tick)}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const x = getX(i) + (chartWidth / 12) / 2;
              return (
                <g key={d.month}>
                  <line x1={x} y1={paddingTop + chartHeight} x2={x} y2={paddingTop + chartHeight + 4} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                  <text x={x} y={paddingTop + chartHeight + 14} fill="#64748b" fontSize="8" textAnchor="middle" fontFamily="var(--font-sans)">
                    {d.month}
                  </text>
                </g>
              );
            })}

            {data.map((d, i) => {
              const colW = (chartWidth / 12) * 0.6;
              const x = getX(i) + ((chartWidth / 12) - colW) / 2;

              const yProduct = getY(d.productSales);
              const hProduct = paddingTop + chartHeight - yProduct;

              const yPrivate = getY(d.productSales + d.privateLabel);
              const hPrivate = yProduct - yPrivate;

              const yOnline = getY(d.productSales + d.privateLabel + d.onlineSub);
              const hOnline = yPrivate - yOnline;

              return (
                <g key={d.month}>
                  <rect x={x} y={yProduct} width={colW} height={hProduct} fill="#7030a0" />
                  <rect x={x} y={yPrivate} width={colW} height={hPrivate} fill="#2f5597" />
                  <rect x={x} y={yOnline} width={colW} height={hOnline} fill="#385723" />
                </g>
              );
            })}
          </svg>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "8px", fontSize: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#7030a0" }} /> 4000 Product Sales
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#2f5597" }} /> 4010 Private Label Sales
          </span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "#475569" }}>
            <span style={{ width: "12px", height: "8px", background: "#385723" }} /> 4020 Online / Subscription Sales
          </span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
      {/* 1. Dashboard Info Header */}
      <div style={{ textAlign: "center", maxWidth: "700px", margin: "0 auto 1.5rem auto" }}>
        <h2 className="gradient-text" style={{ fontSize: "2.2rem", fontWeight: 700, marginBottom: "12px" }}>
          {title}
        </h2>
        <p style={{ color: "var(--slate-400)", fontSize: "0.95rem", lineHeight: 1.6 }}>
          {subtitle}
        </p>
      </div>

      {/* MARKET REGION TOGGLE */}
      {dashboardTab !== "corporate" && (
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
      )}

      {/* SUB-TABS SELECTOR */}
      {allowedTabs.length > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "2.5rem", flexWrap: "wrap" }}>
          {allowedTabs.includes("corporate") && (
            <button
              onClick={() => setDashboardTab("corporate")}
              className={`tab-btn ${dashboardTab === "corporate" ? "active" : ""}`}
              style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
            >
              COMPANY PERFORMANCE
            </button>
          )}
          {allowedTabs.includes("wealth") && (
            <button
              onClick={() => setDashboardTab("wealth")}
              className={`tab-btn ${dashboardTab === "wealth" ? "active" : ""}`}
              style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
            >
              WEALTH SIMULATOR
            </button>
          )}
          {allowedTabs.includes("optimization") && (
            <button
              onClick={() => setDashboardTab("optimization")}
              className={`tab-btn ${dashboardTab === "optimization" ? "active" : ""}`}
              style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
            >
              PORTFOLIO OPTIMIZATION
            </button>
          )}
          {allowedTabs.includes("dmart") && (
            <button
              onClick={() => setDashboardTab("dmart")}
              className={`tab-btn ${dashboardTab === "dmart" ? "active" : ""}`}
              style={{ padding: "8px 24px", fontSize: "0.85rem", letterSpacing: "0.05em" }}
            >
              DMART PERFORMANCE
            </button>
          )}
        </div>
      )}

      {/* ==========================================
          TAB 3: CORPORATE PERFORMANCE VIEW (POWER BI PORT)
          ========================================== */}
      {dashboardTab === "corporate" && (
        <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
          
          {/* Main Visual Panels Area */}
          <div className="glass-panel" style={{ padding: "30px", marginBottom: "2rem", display: "flex", flexDirection: "column", minHeight: "560px" }}>
            
            {/* Spreadsheet Uploader Control Panel */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(0, 0, 0, 0.02)",
              border: "1px solid rgba(0, 0, 0, 0.05)",
              borderRadius: "8px",
              padding: "10px 16px",
              marginBottom: "20px",
              gap: "10px",
              flexWrap: "wrap",
              boxShadow: "inset 0 1px 3px rgba(0,0,0,0.01)"
            }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <span style={{ fontSize: "1.1rem" }}>📊</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--slate-900)" }}>
                  {corporateData === CORPORATE_DATA ? "Viewing Demo Dataset" : `Viewing Uploaded Dataset (${corporateData.length} records)`}
                </span>
              </div>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                {corporateData !== CORPORATE_DATA && (
                  <button
                    onClick={() => {
                      setCorporateData(CORPORATE_DATA);
                      localStorage.removeItem("uploaded_corporate_data");
                    }}
                    className="btn-xai-outline"
                    style={{ padding: "6px 12px", fontSize: "0.75rem", borderColor: "#ef4444", color: "#ef4444", borderRadius: "6px" }}
                  >
                    Reset to Demo Data
                  </button>
                )}
                <label
                  className="btn-xai-green"
                  style={{ padding: "6px 12px", fontSize: "0.75rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "5px", borderRadius: "6px" }}
                >
                  📁 Upload Excel / CSV
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleExcelUpload}
                    style={{ display: "none" }}
                  />
                </label>
                <button
                  onClick={downloadExcelTemplate}
                  className="btn-xai-outline"
                  style={{ padding: "6px 12px", fontSize: "0.75rem", borderRadius: "6px" }}
                >
                  📥 Download Template
                </button>
              </div>
            </div>

            {/* PAGE 1: KPI Cards + Dual Axis Trend Chart */}
            {corpPage === 1 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "25px", animation: "fadeInUp 0.3s ease forwards" }}>
                
                {/* 6 KPI Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: "15px",
                  marginBottom: "10px"
                }}>
                  {/* Card 1: Total Revenue */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1e3a8a", marginBottom: "6px" }}>{corpStats.totalRevenue}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>Total Revenue</div>
                  </div>

                  {/* Card 2: Total Profit */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#166534", marginBottom: "6px" }}>{corpStats.totalProfit}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>Total Profit</div>
                  </div>

                  {/* Card 3: Total EBITDA */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#c2410c", marginBottom: "6px" }}>{corpStats.totalEbitda}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>Total EBITDA</div>
                  </div>

                  {/* Card 4: Profit Margin */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#0f172a", marginBottom: "6px" }}>{corpStats.overallMargin}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>Profit Margin</div>
                  </div>

                  {/* Card 5: Revenue Growth % */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#2563eb", marginBottom: "6px" }}>{corpStats.overallGrowth}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>Revenue Growth</div>
                  </div>

                  {/* Card 6: ROCE */}
                  <div style={{
                    background: "#ffffff",
                    border: "2px solid #e2e8f0",
                    borderRadius: "4px",
                    padding: "16px 12px",
                    textAlign: "center",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: "1.8rem", fontWeight: 700, color: "#7c3aed", marginBottom: "6px" }}>{corpStats.overallRoce}</div>
                    <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "#475569", textTransform: "uppercase", letterSpacing: "0.02em" }}>ROCE</div>
                  </div>
                </div>

                {/* Dual Axis Trend Chart Panel */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "10px" }}>
                    <h4 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--foreground)", margin: 0 }}>Total Profit and Total Revenue by Year</h4>
                    {/* Chart Legend */}
                    <div style={{ display: "flex", gap: "15px", fontSize: "0.75rem", flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--foreground)" }}>
                        <span style={{ width: "10px", height: "3px", background: "#22c55e", borderRadius: "1.5px" }} />
                        Total Profit (Green, Left Axis)
                      </span>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "5px", color: "var(--foreground)" }}>
                        <span style={{ width: "10px", height: "3px", background: "#3b82f6", borderRadius: "1.5px" }} />
                        Total Revenue (Blue, Right Axis)
                      </span>
                    </div>
                  </div>

                  {/* SVG Dual Axis Chart */}
                  <div style={{ flex: 1, minHeight: "300px", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
                    <svg viewBox="0 0 540 240" style={{ width: "100%", maxWidth: "560px", height: "auto", overflow: "visible" }}>
                      {/* Gridlines */}
                      <line x1="50" y1="210" x2="490" y2="210" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                      <line x1="50" y1="30" x2="50" y2="210" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                      <line x1="490" y1="30" x2="490" y2="210" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />

                      {/* Horizontal Grid Lines */}
                      {[60, 90, 120, 150, 180].map((yVal) => (
                        <line key={yVal} x1="50" y1={yVal} x2="490" y2={yVal} stroke="rgba(0,0,0,0.03)" strokeWidth="1" strokeDasharray="3 3" />
                      ))}

                      {/* X-axis ticks (Years) */}
                      {corporateData.map((d, i) => {
                        const x = 50 + (i / (corporateData.length - 1 || 1)) * 440;
                        return (
                          <g key={d.year}>
                            <line x1={x} y1="210" x2={x} y2="214" stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                            <text x={x} y="225" fill="var(--slate-400)" fontSize="8.5" textAnchor="middle" fontFamily="var(--font-mono)">{d.year}</text>
                          </g>
                        );
                      })}

                      {/* Left Y-axis ticks (Profit - 0 to 2500) */}
                      {[0, 500, 1000, 1500, 2000, 2500].map((p, i) => {
                        const y = 210 - (i / 5) * 180;
                        return (
                          <g key={p}>
                            <line x1="46" y1={y} x2="50" y2={y} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                            <text x="40" y={y + 3} fill="var(--slate-400)" fontSize="8" textAnchor="end" fontFamily="var(--font-mono)">{p}</text>
                          </g>
                        );
                      })}

                      {/* Right Y-axis ticks (Revenue - 0 to 18K) */}
                      {[0, 4, 8, 12, 16].map((r, i) => {
                        const y = 210 - (i / 4) * 180;
                        return (
                          <g key={r}>
                            <line x1="490" y1={y} x2="494" y2={y} stroke="rgba(0,0,0,0.15)" strokeWidth="1" />
                            <text x="498" y={y + 3} fill="var(--slate-400)" fontSize="8" textAnchor="start" fontFamily="var(--font-mono)">{r}K</text>
                          </g>
                        );
                      })}

                      {/* Left Axis label */}
                      <text x="12" y="120" fill="var(--slate-400)" fontSize="8.5" textAnchor="middle" transform="rotate(-90 12 120)" fontFamily="var(--font-sans)">Total Profit</text>
                      {/* Right Axis label */}
                      <text x="528" y="120" fill="var(--slate-400)" fontSize="8.5" textAnchor="middle" transform="rotate(90 528 120)" fontFamily="var(--font-sans)">Total Revenue</text>

                      {/* 1. Draw Revenue Line (Blue) - scale 0 to 18000 */}
                      {(() => {
                        const pts = corporateData.map((d, i) => {
                          const x = 50 + (i / (corporateData.length - 1 || 1)) * 440;
                          const y = 210 - (d.revenue / 18000) * 180;
                          return { x, y, val: (d.revenue / 1000).toFixed(1) + "K" };
                        });
                        const pathD = "M " + pts.map(p => `${p.x} ${p.y}`).join(" L ");
                        return (
                          <g>
                            <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="3.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1" />
                                <text x={p.x} y={p.y + 12} fill="#1e3a8a" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">{p.val}</text>
                              </g>
                            ))}
                          </g>
                        );
                      })()}

                      {/* 2. Draw Profit Line (Green) - scale 0 to 2500 */}
                      {(() => {
                        const pts = corporateData.map((d, i) => {
                          const x = 50 + (i / (corporateData.length - 1 || 1)) * 440;
                          const y = 210 - (d.profit / 2500) * 180;
                          return { x, y, val: d.profit };
                        });
                        const pathD = "M " + pts.map(p => `${p.x} ${p.y}`).join(" L ");
                        return (
                          <g>
                            <path d={pathD} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                            {pts.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="3.5" fill="#22c55e" stroke="#ffffff" strokeWidth="1" />
                                <text x={p.x} y={p.y - 8} fill="#14532d" fontSize="7.5" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">{p.val}</text>
                              </g>
                            ))}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

              </div>
            )}

            {/* PAGE 2: Profit, Growth & Margin detailed charts */}
            {corpPage === 2 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "25px", animation: "fadeInUp 0.3s ease forwards" }}>
                
                {/* Upper row of 2 charts */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "25px" }}>
                  
                  {/* Chart 1: Total Profit by Year (Bar Chart) */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px" }}>Total Profit by Year</h4>
                    <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
                      <svg viewBox="0 0 240 140" style={{ width: "100%", maxWidth: "260px", height: "auto", overflow: "visible" }}>
                        <line x1="30" y1="120" x2="230" y2="120" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                        
                        {/* Grid lines */}
                        {[30, 60, 90].map(y => (
                          <line key={y} x1="30" y1={y} x2="230" y2={y} stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="2 2" />
                        ))}

                        {/* Bars for each year */}
                        {corporateData.map((d, i) => {
                          const barW = 12;
                          const spacing = (200 / corporateData.length);
                          const x = 30 + i * spacing + (spacing - barW) / 2;
                          // Height based on profit, max profit 2500 matches 110px
                          const barH = (d.profit / 2500) * 110;
                          const y = 120 - barH;
                          return (
                            <g key={d.year}>
                              <rect x={x} y={y} width={barW} height={barH} fill="#3b82f6" rx="1" />
                              <text x={x + barW/2} y={y - 4} fill="#1e3a8a" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">
                                {d.profit >= 1000 ? (d.profit/1000).toFixed(2) + "K" : d.profit}
                              </text>
                              <text x={x + barW/2} y="128" fill="var(--slate-400)" fontSize="6" textAnchor="middle" fontFamily="var(--font-mono)">{d.year}</text>
                            </g>
                          );
                        })}

                        {/* Y axis ticks */}
                        {[0, 1, 2].map((k) => (
                          <text key={k} x="24" y={120 - (k/2.5)*100 + 2} fill="var(--slate-400)" fontSize="6" textAnchor="end" fontFamily="var(--font-mono)">{k}K</text>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* Chart 2: Revenue Growth % by Year (Bar Chart) */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px" }}>Revenue Growth % by Year</h4>
                    <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
                      <svg viewBox="0 0 240 140" style={{ width: "100%", maxWidth: "260px", height: "auto", overflow: "visible" }}>
                        <line x1="30" y1="90" x2="230" y2="90" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                        
                        {/* Grid lines */}
                        {[30, 60, 120].map(y => (
                          <line key={y} x1="30" y1={y} x2="230" y2={y} stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="2 2" />
                        ))}

                        {/* Bars for growth (positive & negative) */}
                        {corporateData.map((d, i) => {
                          const barW = 12;
                          const spacing = (200 / corporateData.length);
                          const x = 30 + i * spacing + (spacing - barW) / 2;
                          // Growth scale: 25% matches 50px height
                          const scale = 50 / 25;
                          const barH = Math.abs(d.growth) * scale;
                          const y = d.growth >= 0 ? 90 - barH : 90;

                          return (
                            <g key={d.year}>
                              <rect x={x} y={y} width={barW} height={barH} fill={d.growth >= 0 ? "#3b82f6" : "#ef4444"} rx="1" />
                              <text x={x + barW/2} y={d.growth >= 0 ? y - 3 : y + barH + 7} fill={d.growth >= 0 ? "#1e3a8a" : "#7f1d1d"} fontSize="5.5" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">
                                {d.growth >= 0 ? "+" : ""}{d.growth.toFixed(1)}%
                              </text>
                              <text x={x + barW/2} y="132" fill="var(--slate-400)" fontSize="6" textAnchor="middle" fontFamily="var(--font-mono)">{d.year}</text>
                            </g>
                          );
                        })}

                        {/* Y axis ticks */}
                        {[-10, 0, 10, 20].map((g) => (
                          <text key={g} x="24" y={90 - (g * (50/25)) + 2} fill="var(--slate-400)" fontSize="6" textAnchor="end" fontFamily="var(--font-mono)">{g}%</text>
                        ))}
                      </svg>
                    </div>
                  </div>

                </div>

                {/* Lower row: Margin chart + Bulleted Insights */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "25px", marginTop: "10px" }}>
                  
                  {/* Chart 3: Profit Margin by Year (Line Chart) */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px" }}>Profit Margin by Year</h4>
                    <div style={{ minHeight: "180px", display: "flex", alignItems: "center", justifyContent: "center", overflowX: "auto" }}>
                      <svg viewBox="0 0 240 140" style={{ width: "100%", maxWidth: "260px", height: "auto", overflow: "visible" }}>
                        <line x1="30" y1="120" x2="230" y2="120" stroke="rgba(0,0,0,0.08)" strokeWidth="1" />
                        
                        {/* Grid lines */}
                        {[30, 60, 90].map(y => (
                          <line key={y} x1="30" y1={y} x2="230" y2={y} stroke="rgba(0,0,0,0.02)" strokeWidth="1" strokeDasharray="2 2" />
                        ))}

                        {/* Line points. Scale: 10% to 15%. 10% matches 120px, 15% matches 20px (20px per 1%) */}
                        {(() => {
                          const pts = corporateData.map((d, i) => {
                            const spacing = (200 / corporateData.length);
                            const x = 30 + i * spacing + spacing / 2;
                            const y = 120 - (d.margin - 10) * 20; // 10% is baseline
                            return { x, y, val: d.margin.toFixed(1) + "%", year: d.year };
                          });
                          const pathD = "M " + pts.map(p => `${p.x} ${p.y}`).join(" L ");
                          return (
                            <g>
                              {/* Draw smooth-ish line */}
                              <path d={pathD} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                              {pts.map((p, i) => (
                                <g key={i}>
                                  <circle cx={p.x} cy={p.y} r="2.5" fill="#2563eb" stroke="#ffffff" strokeWidth="0.8" />
                                  <text x={p.x} y={p.y - 5} fill="#1e3a8a" fontSize="6" fontWeight="bold" textAnchor="middle" fontFamily="var(--font-mono)">{p.val}</text>
                                  <text x={p.x} y="128" fill="var(--slate-400)" fontSize="6" textAnchor="middle" fontFamily="var(--font-mono)">{p.year}</text>
                                </g>
                              ))}
                            </g>
                          );
                        })()}

                        {/* Y axis ticks */}
                        {[10, 12, 14].map((m) => (
                          <text key={m} x="24" y={120 - (m - 10)*20 + 2} fill="var(--slate-400)" fontSize="6" textAnchor="end" fontFamily="var(--font-mono)">{m}%</text>
                        ))}
                      </svg>
                    </div>
                  </div>

                  {/* Bulleted Insights Box */}
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h4 style={{ fontSize: "0.95rem", fontWeight: 700, color: "var(--foreground)", marginBottom: "10px" }}>Strategic Performance Observations</h4>
                    <div style={{
                      flex: 1,
                      background: "rgba(0, 0, 0, 0.02)",
                      border: "1px solid rgba(0,0,0,0.05)",
                      borderRadius: "8px",
                      padding: "20px",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      gap: "12px",
                      boxShadow: "inset 0 1px 3px rgba(0,0,0,0.01)"
                    }}>
                      {corpInsights.map((insight, index) => (
                        <div key={index} style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                          <span style={{ fontSize: "1.1rem", color: "#3b82f6", lineHeight: 1 }}>•</span>
                          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--slate-900)", lineHeight: 1.5 }}>
                            <strong>{insight.title}</strong> {insight.text}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* Power BI Styled Bottom Navigation Tabs Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#f1f5f9",
              borderTop: "1px solid #cbd5e1",
              borderBottom: "1px solid #cbd5e1",
              margin: "30px -30px -30px -30px",
              padding: "0 10px",
              borderBottomLeftRadius: "15px",
              borderBottomRightRadius: "15px",
              height: "40px"
            }}>
              {/* Page 1 Button */}
              <button
                onClick={() => setCorpPage(1)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: corpPage === 1 ? "#ffffff" : "transparent",
                  color: corpPage === 1 ? "#0f172a" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: corpPage === 1 ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #cbd5e1",
                  borderLeft: corpPage === 1 ? "1px solid #cbd5e1" : "none",
                  position: "relative",
                  transition: "background 0.2s ease"
                }}
              >
                Page 1
                {corpPage === 1 && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#22c55e" /* Power BI Green tab highlight line */
                  }} />
                )}
              </button>

              {/* Page 2 Button */}
              <button
                onClick={() => setCorpPage(2)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: corpPage === 2 ? "#ffffff" : "transparent",
                  color: corpPage === 2 ? "#0f172a" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: corpPage === 2 ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #cbd5e1",
                  position: "relative",
                  transition: "background 0.2s ease"
                }}
              >
                Page 2
                {corpPage === 2 && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#22c55e"
                  }} />
                )}
              </button>

              {/* Decorative '+' button */}
              <button
                disabled
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "40px",
                  height: "100%",
                  border: "none",
                  background: "transparent",
                  color: "#94a3b8",
                  fontSize: "1.1rem",
                  cursor: "default"
                }}
              >
                +
              </button>
            </div>

          </div>

        </div>
      )}

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

      {/* ==========================================
          TAB 4: DMART PERFORMANCE DASHBOARD VIEW (EXCEL PORT)
          ========================================== */}
      {dashboardTab === "dmart" && (
        <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
          
          {/* Main Visual Panels Area */}
          <div className="glass-panel" style={{ padding: "30px", marginBottom: "2rem", display: "flex", flexDirection: "column", minHeight: "560px" }}>
            
            {/* Title banner bar */}
            <div style={{
              background: "#4f81bd",
              color: "#ffffff",
              padding: "12px 20px",
              fontWeight: 700,
              fontSize: "1.1rem",
              borderRadius: "4px",
              marginBottom: "15px",
              letterSpacing: "0.02em"
            }}>
              DMart / Avenue Supermarts | Budget 2027 vs Forecast 2026 vs Actual 2025
            </div>

            {/* Subsection header */}
            <div style={{
              background: "#b4c6e7",
              color: "#1f4e78",
              padding: "10px 16px",
              fontWeight: "bold",
              fontSize: "1.1rem",
              borderRadius: "4px",
              marginBottom: "20px",
              display: "flex",
              alignItems: "center",
              gap: "8px"
            }}>
              <span>▶</span>
              <span>
                {dmartSheet === "summary" && "DMart / Avenue Supermarts Executive Summary"}
                {dmartSheet === "financial" && "Financial Performance"}
                {dmartSheet === "operational" && "Operational Performance"}
                {dmartSheet === "workforce" && "Workforce Performance"}
                {dmartSheet === "customer" && "Customer Performance"}
              </span>
            </div>

            {/* Render Tab Contents */}
            {dmartSheet === "summary" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "25px", animation: "fadeInUp 0.3s ease forwards" }}>
                {/* 4 Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "10px"
                }}>
                  {renderDmartKpiCard("Gross Margin", "87,020k", "74,330k", "▲ 17.1%")}
                  {renderDmartKpiCard("Net Income", "31,000k", "26,950k", "▲ 15.0%")}
                  {renderDmartKpiCard("Assets", "1,95,000m", "1,70,000m", "▲ 14.7%")}
                  {renderDmartKpiCard("Liabilities", "57,000m", "50,000m", "▲ 14.0%")}
                </div>

                {/* 2 Charts Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "25px" }}>
                  {renderDmartLineChart(
                    "Net Income, Multi Year / Scenario Analysis – DMart",
                    DMART_NET_INCOME,
                    (val) => val >= 1000 ? (val/1000).toFixed(1) + " k" : val.toString()
                  )}
                  {renderDmartLineChart(
                    "Gross Margin for DMart",
                    DMART_GROSS_MARGIN,
                    (val) => val >= 1000 ? (val/1000).toFixed(1) + " k" : val.toString()
                  )}
                </div>
              </div>
            )}

            {dmartSheet === "financial" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "35px", animation: "fadeInUp 0.3s ease forwards" }}>
                {/* 4 Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "10px"
                }}>
                  {renderDmartKpiCard("Gross Margin", "87,020k", "74,330k", "▲ 17.1%")}
                  {renderDmartKpiCard("Net Income", "31,000k", "26,950k", "▲ 15.0%")}
                  {renderDmartKpiCard("Assets", "1,95,000m", "1,70,000m", "▲ 14.7%")}
                  {renderDmartKpiCard("Liabilities", "57,000m", "50,000m", "▲ 14.0%")}
                </div>

                {/* Section 1: Net Income */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Net Income ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Net Income, Multi Year / Scenario Analysis – DMart",
                      FINANCIAL_NET_INCOME,
                      (val) => val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>10k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Scenario Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 290, feb: 295, mar: 305, apr: 310, may: 315, jun: 320, jul: 325, aug: 330, sep: 340, oct: 360, nov: 380, dec: 390, fullYear: 3950 },
                    { label: "Forecast - 2028", jan: 250, feb: 255, mar: 265, apr: 270, may: 275, jun: 280, jul: 285, aug: 290, sep: 300, oct: 320, nov: 330, dec: 350, fullYear: 3470 },
                    { label: "Actual - 2025", jan: 210, feb: 215, mar: 225, apr: 230, may: 235, jun: 240, jul: 245, aug: 250, sep: 260, oct: 280, nov: 290, dec: 347, fullYear: 3027 },
                    { label: "Total", jan: 750, feb: 765, mar: 795, apr: 810, may: 825, jun: 840, jul: 855, aug: 870, sep: 900, oct: 960, nov: 990, dec: 1087, fullYear: 10447 }
                  ])}
                </div>

                {/* Section 2: Gross Margin */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Gross Margin ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Gross Margin for DMart",
                      FINANCIAL_GROSS_MARGIN,
                      (val) => val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>31k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Account Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 855, feb: 870, mar: 893, apr: 908, may: 923, jun: 938, jul: 953, aug: 968, sep: 990, oct: 1035, nov: 1058, dec: 1088, fullYear: 11479 },
                    { label: "Forecast - 2026", jan: 750, feb: 765, mar: 789, apr: 803, may: 818, jun: 833, jul: 848, aug: 863, sep: 885, oct: 930, nov: 963, dec: 975, fullYear: 10211 },
                    { label: "Actual - 2025", jan: 645, feb: 660, mar: 680, apr: 693, may: 713, jun: 728, jul: 743, aug: 758, sep: 780, oct: 825, nov: 848, dec: 891, fullYear: 8972 },
                    { label: "Total", jan: 2250, feb: 2295, mar: 2364, apr: 2409, may: 2454, jun: 2499, jul: 2544, aug: 2589, sep: 2655, oct: 2790, nov: 2859, dec: 2954, fullYear: 30662 }
                  ])}
                </div>

                {/* Section 3: Revenue */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Revenue ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Revenue Scenario Analysis – DMart",
                      FINANCIAL_REVENUE,
                      (val) => val >= 1000 ? (val/1000).toFixed(0) + "k" : val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>204k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Account Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2028"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 5700, feb: 5800, mar: 5950, apr: 6050, may: 6150, jun: 6250, jul: 6350, aug: 6450, sep: 6600, oct: 6900, nov: 7050, dec: 7250, fullYear: 76500 },
                    { label: "Forecast - 2028", jan: 5000, feb: 5100, mar: 5250, apr: 5350, may: 5450, jun: 5550, jul: 5750, aug: 5850, sep: 5900, oct: 6200, nov: 6350, dec: 6500, fullYear: 68050 },
                    { label: "Actual - 2025", jan: 4300, feb: 4400, mar: 4550, apr: 4650, may: 4750, jun: 4850, jul: 4950, aug: 5050, sep: 5200, oct: 5500, nov: 5650, dec: 5940, fullYear: 59790 },
                    { label: "Total", jan: 15000, feb: 15300, mar: 15750, apr: 16050, may: 16350, jun: 16650, jul: 16950, aug: 17250, sep: 17700, oct: 18600, nov: 19050, dec: 19690, fullYear: 204340 }
                  ])}
                </div>
              </div>
            )}

            {dmartSheet === "operational" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "35px", animation: "fadeInUp 0.3s ease forwards" }}>
                {/* 4 Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "10px"
                }}>
                  {renderDmartKpiCard("Operating Expenses", "39,500m", "33,310m", "▲ 18.6%")}
                  {renderDmartKpiCard("Salaries & Related", "15,800m", "13,200m", "▲ 19.7%")}
                  {renderDmartKpiCard("General Operating Expenses", "20,040m", "17,000m", "▲ 17.9%")}
                  {renderDmartKpiCard("Gross Margin Percentage (%)", "15%", "15%", "-")}
                </div>

                {/* Section 1: Operating Expenses */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Operating Expenses ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Operating Expenses, Multi Year / Scenario Analysis – DMart",
                      OPERATIONAL_EXPENSES_LINE,
                      (val) => val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>14k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Scenario Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 390, feb: 395, mar: 405, apr: 410, may: 415, jun: 420, jul: 425, aug: 430, sep: 440, oct: 460, nov: 475, dec: 364, fullYear: 5029 },
                    { label: "Forecast - 2026", jan: 340, feb: 345, mar: 355, apr: 360, may: 365, jun: 370, jul: 375, aug: 380, sep: 390, oct: 410, nov: 420, dec: 556, fullYear: 4666 },
                    { label: "Actual - 2025", jan: 300, feb: 305, mar: 315, apr: 320, may: 325, jun: 330, jul: 335, aug: 340, sep: 350, oct: 370, nov: 380, dec: 388, fullYear: 4058 },
                    { label: "Total", jan: 1030, feb: 1045, mar: 1075, apr: 1090, may: 1105, jun: 1120, jul: 1135, aug: 1150, sep: 1180, oct: 1240, nov: 1275, dec: 1308, fullYear: 13753 }
                  ])}
                </div>

                {/* Section 2: Operating Expenses by Category */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Operating Expenses by Category ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartStackedBarChart(
                      "Operating Expenses by Category – DMart",
                      OPERATIONAL_EXPENSES_CATEGORY,
                      (val) => val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>5k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Account Analysis</div>
                        {["Allocated Expenses", "Depreciation & Amortization", "General Operating Expenses", "Salaries & Related"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Salaries & Related", jan: 155, feb: 158, mar: 162, apr: 164, may: 166, jun: 168, jul: 170, aug: 172, sep: 176, oct: 184, nov: 190, dec: 146, fullYear: 2011 },
                    { label: "General Operating Expenses", jan: 195, feb: 198, mar: 203, apr: 205, may: 208, jun: 210, jul: 213, aug: 215, sep: 220, oct: 230, nov: 238, dec: 188, fullYear: 2523 },
                    { label: "Allocated Expenses", jan: 26, feb: 26, mar: 27, apr: 27, may: 27, jun: 28, jul: 28, aug: 28, sep: 29, oct: 30, nov: 31, dec: 24, fullYear: 331 },
                    { label: "Depreciation & Amortization", jan: 14, feb: 13, mar: 13, apr: 14, may: 14, jun: 14, jul: 14, aug: 15, sep: 15, oct: 16, nov: 16, dec: 6, fullYear: 164 },
                    { label: "Total", jan: 390, feb: 395, mar: 405, apr: 410, may: 415, jun: 420, jul: 425, aug: 430, sep: 440, oct: 460, nov: 475, dec: 364, fullYear: 5029 }
                  ])}
                </div>
              </div>
            )}

            {dmartSheet === "workforce" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "35px", animation: "fadeInUp 0.3s ease forwards" }}>
                {/* 4 Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "10px"
                }}>
                  {renderDmartKpiCard("FTE", "85,000", "75,000", "▲ 13.3%")}
                  {renderDmartKpiCard("New Headcount", "11,600", "10,000", "▲ 16.0%")}
                  {renderDmartKpiCard("Revenue Per FTE ($)", "6,802k", "6,604k", "▲ 3.0%")}
                  {renderDmartKpiCard("Employee Survey", "80.0", "78", "▲ 2.6%")}
                </div>

                {/* Section 1: Salaries & Related */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Salaries & Related ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Salaries & Related, Multi Year / Scenario Analysis – DMart",
                      PEOPLE_SALARIES_LINE,
                      (val) => val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>6k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Scenario Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 155, feb: 158, mar: 162, apr: 164, may: 166, jun: 168, jul: 170, aug: 172, sep: 176, oct: 184, nov: 190, dec: 194, fullYear: 2059 },
                    { label: "Forecast - 2026", jan: 135, feb: 138, mar: 142, apr: 144, may: 146, jun: 148, jul: 150, aug: 152, sep: 156, oct: 164, nov: 170, dec: 175, fullYear: 1820 },
                    { label: "Actual - 2025", jan: 120, feb: 122, mar: 128, apr: 128, may: 130, jun: 132, jul: 134, aug: 136, sep: 140, oct: 148, nov: 152, dec: 156, fullYear: 1624 },
                    { label: "Total", jan: 410, feb: 418, mar: 430, apr: 436, may: 442, jun: 448, jul: 454, aug: 460, sep: 472, oct: 496, nov: 512, dec: 525, fullYear: 5503 }
                  ])}
                </div>

                {/* Section 2: Employee Stats */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Employee Stats ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Cumulative FTE Count – DMart",
                      DMART_FTE_COUNT,
                      (val) => val >= 1000 ? (val/1000).toFixed(0) + "k" : val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>659k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Account Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 18800, feb: 19000, mar: 19200, apr: 19400, may: 19600, jun: 19800, jul: 20000, aug: 20200, sep: 20400, oct: 20700, nov: 21000, dec: 21300, fullYear: 239400 },
                    { label: "Forecast - 2026", jan: 17300, feb: 17500, mar: 17700, apr: 17900, may: 18100, jun: 18300, jul: 18500, aug: 18700, sep: 18900, oct: 19200, nov: 19500, dec: 19600, fullYear: 221400 },
                    { label: "Actual - 2025", jan: 16000, feb: 16100, mar: 16200, apr: 16300, may: 16400, jun: 16500, jul: 16600, aug: 16700, sep: 16800, oct: 16900, nov: 16950, dec: 16959, fullYear: 198409 },
                    { label: "Total", jan: 52100, feb: 52600, mar: 53100, apr: 53600, may: 54100, jun: 54600, jul: 55100, aug: 55600, sep: 56100, oct: 56800, nov: 57450, dec: 58059, fullYear: 659209 }
                  ])}
                </div>
              </div>
            )}

            {dmartSheet === "customer" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "35px", animation: "fadeInUp 0.3s ease forwards" }}>
                {/* 4 Cards Grid */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                  gap: "20px",
                  marginBottom: "10px"
                }}>
                  {renderDmartKpiCard("Units Sold", "42,40,00,000", "36,50,00,000", "▲ 16.2%")}
                  {renderDmartKpiCard("Pipeline Opportunities", "1,200", "1,000", "▲ 20.0%")}
                  {renderDmartKpiCard("CSAT", "82.0", "80.0", "▲ 2.5%")}
                  {renderDmartKpiCard("CAC", "57.0", "60.0", "▼ 5.0%")}
                </div>

                {/* Section 1: Direct Revenue */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Direct Revenue ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderDmartLineChart(
                      "Direct Revenue, Multi Year / Scenario Analysis – DMart",
                      CUSTOMER_DIRECT_REVENUE,
                      (val) => val >= 1000 ? (val/1000).toFixed(0) + "k" : val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>204k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Scenario Analysis</div>
                        {["Actual - 2025", "Budget - 2027", "Forecast - 2026"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "Budget - 2027", jan: 5700, feb: 5800, mar: 5950, apr: 6050, may: 6150, jun: 6250, jul: 6350, aug: 6450, sep: 6600, oct: 6900, nov: 7050, dec: 7250, fullYear: 76500 },
                    { label: "Forecast - 2026", jan: 5000, feb: 5100, mar: 5250, apr: 5350, may: 5450, jun: 5550, jul: 5650, aug: 5750, sep: 5900, oct: 6200, nov: 6350, dec: 6500, fullYear: 68050 },
                    { label: "Actual - 2025", jan: 4300, feb: 4400, mar: 4550, apr: 4650, may: 4750, jun: 4850, jul: 4950, aug: 5050, sep: 5200, oct: 5500, nov: 5650, dec: 5940, fullYear: 59790 },
                    { label: "Total", jan: 15000, feb: 15300, mar: 15750, apr: 16050, may: 16350, jun: 16650, jul: 16950, aug: 17250, sep: 17700, oct: 18600, nov: 19050, dec: 19690, fullYear: 204340 }
                  ])}
                </div>

                {/* Section 2: Revenue Breakdown */}
                <div style={{ borderTop: "1px solid #cbd5e1", paddingTop: "20px" }}>
                  <div style={{ background: "#f1f5f9", padding: "10px 16px", borderLeft: "4px solid #1f4e78", fontWeight: "bold", fontSize: "0.95rem", color: "#1f4e78", marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Direct Revenue ▾</span>
                    <span style={{ fontSize: "0.75rem", color: "#64748b" }}>*Updates apply to Executive Summary</span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: "20px", marginBottom: "15px" }}>
                    {renderCustomerStackedBarChart(
                      "Revenue Breakdown for DMart – 2027 Budget",
                      CUSTOMER_REVENUE_BREAKDOWN,
                      (val) => val >= 1000 ? (val/1000).toFixed(0) + "k" : val.toString()
                    )}
                    <div style={{ background: "#f8fafc", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "16px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>Selection Total</div>
                        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#1e3a8a", margin: "5px 0" }}>77k</div>
                      </div>
                      <div>
                        <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#475569", marginBottom: "8px" }}>Account Analysis</div>
                        {["4000 Product Sales", "4010 Private Label Sales", "4020 Online / Subscription Sales", "Total"].map((item) => (
                          <div key={item} style={{ padding: "6px 10px", background: "#d9e1f2", color: "#1f4e78", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600, marginBottom: "5px" }}>
                            {item}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {renderDmartMonthlyTable([
                    { label: "4000 Product Sales", jan: 3990, feb: 4060, mar: 4165, apr: 4235, may: 4305, jun: 4375, jul: 4445, aug: 4515, sep: 4620, oct: 4830, nov: 4935, dec: 5075, fullYear: 53550 },
                    { label: "4010 Private Label Sales", jan: 1140, feb: 1160, mar: 1190, apr: 1210, may: 1230, jun: 1250, jul: 1270, aug: 1290, sep: 1320, oct: 1380, nov: 1410, dec: 1450, fullYear: 15300 },
                    { label: "4020 Online / Subscription Sales", jan: 570, feb: 580, mar: 595, apr: 605, may: 615, jun: 625, jul: 635, aug: 645, sep: 660, oct: 690, nov: 705, dec: 725, fullYear: 7650 },
                    { label: "Total", jan: 5700, feb: 5800, mar: 5950, apr: 6050, may: 6150, jun: 6250, jul: 6350, aug: 6450, sep: 6600, oct: 6900, nov: 7050, dec: 7250, fullYear: 76500 }
                  ])}
                </div>
              </div>
            )}

            {/* Excel Bottom Tab Bar */}
            <div style={{
              display: "flex",
              alignItems: "center",
              background: "#cbd5e1",
              borderTop: "1px solid #94a3b8",
              borderBottom: "1px solid #94a3b8",
              margin: "30px -30px -30px -30px",
              padding: "0 10px",
              borderBottomLeftRadius: "15px",
              borderBottomRightRadius: "15px",
              height: "40px",
              overflowX: "auto"
            }}>
              {/* Executive Summary Button */}
              <button
                onClick={() => setDmartSheet("summary")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: dmartSheet === "summary" ? "#ffffff" : "transparent",
                  color: dmartSheet === "summary" ? "#0f4c81" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: dmartSheet === "summary" ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #94a3b8",
                  borderLeft: dmartSheet === "summary" ? "1px solid #94a3b8" : "none",
                  position: "relative",
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                Executive Summary
                {dmartSheet === "summary" && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#0f4c81"
                  }} />
                )}
              </button>

              {/* Financial Button */}
              <button
                onClick={() => setDmartSheet("financial")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: dmartSheet === "financial" ? "#ffffff" : "transparent",
                  color: dmartSheet === "financial" ? "#0f4c81" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: dmartSheet === "financial" ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #94a3b8",
                  position: "relative",
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                Financial
                {dmartSheet === "financial" && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#0f4c81"
                  }} />
                )}
              </button>

              {/* Operational Button */}
              <button
                onClick={() => setDmartSheet("operational")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: dmartSheet === "operational" ? "#ffffff" : "transparent",
                  color: dmartSheet === "operational" ? "#0f4c81" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: dmartSheet === "operational" ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #94a3b8",
                  position: "relative",
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                Operational
                {dmartSheet === "operational" && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#0f4c81"
                  }} />
                )}
              </button>

              {/* People Button */}
              <button
                onClick={() => setDmartSheet("workforce")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: dmartSheet === "workforce" ? "#ffffff" : "transparent",
                  color: dmartSheet === "workforce" ? "#0f4c81" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: dmartSheet === "workforce" ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #94a3b8",
                  position: "relative",
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                People
                {dmartSheet === "workforce" && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#0f4c81"
                  }} />
                )}
              </button>

              {/* Customer Button */}
              <button
                onClick={() => setDmartSheet("customer")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "0 20px",
                  height: "100%",
                  border: "none",
                  background: dmartSheet === "customer" ? "#ffffff" : "transparent",
                  color: dmartSheet === "customer" ? "#0f4c81" : "#475569",
                  fontSize: "0.82rem",
                  fontWeight: dmartSheet === "customer" ? 700 : 500,
                  cursor: "pointer",
                  borderRight: "1px solid #94a3b8",
                  position: "relative",
                  transition: "background 0.2s ease",
                  whiteSpace: "nowrap"
                }}
              >
                Customer
                {dmartSheet === "customer" && (
                  <span style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: "#0f4c81"
                  }} />
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
