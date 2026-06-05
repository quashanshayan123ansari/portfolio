"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

interface GraphNode {
  id: string;
  name: string;
  group: string;
  val: number;
  color: string;
  glowColor: string;
  description: string;
  url?: string;
  x?: number;
  y?: number;
}

interface GraphLink {
  source: string;
  target: string;
}

export default function MasterNeuralGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<HTMLDivElement>(null);

  // Interaction State
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  // Telemetry counts
  const [nodesCount, setNodesCount] = useState(0);
  const [linksCount, setLinksCount] = useState(0);

  useEffect(() => {
    // --- NODE & LINK DEFINITIONS ---
    
    // 1. Center Node
    const centerNode: GraphNode = {
      id: "center",
      name: "Mohammad Quashan",
      group: "center",
      val: 18,
      color: "#0f172a", // Slate 900
      glowColor: "rgba(15, 23, 42, 0.15)",
      description: "AI & Deep Learning Engineer specializing in neural architectures, predictive modeling, quantitative finance, and scalable intelligent systems.",
    };

    // 2. Hub Nodes (Level 1 Categories - New/Active Credentials Only)
    const hubs: GraphNode[] = [
      {
        id: "inst_bhu",
        name: "BHU Varanasi",
        group: "education",
        val: 12,
        color: "#0ea5e9", // Sky Blue
        glowColor: "rgba(14, 165, 233, 0.2)",
        description: "BS in Mathematics — Banaras Hindu University. Coursework covering Calculus, Real Analysis, Complex Analysis, Algebra, Differential Equations, and Graph Theory. Research internship at MMV on Complex Conformal Mapping.",
        url: "https://verify.bhu.ac.in/student/verify/eECba2CD-F10A-dF9F-7Aa0-C9a83f6b2CDc",
      },
      {
        id: "inst_cfi",
        name: "Corporate Finance Institute (CFI)",
        group: "finance",
        val: 12,
        color: "#f59e0b", // Gold
        glowColor: "rgba(245, 158, 11, 0.2)",
        description: "Credentials verifying corporate accounting, financial modeling guidelines, FP&A operations, statement analyses, and dynamic 3-statement spreadsheet designs.",
      },
      {
        id: "inst_yale",
        name: "Yale Online",
        group: "finance",
        val: 12,
        color: "#1e3a8a", // Yale Blue
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Yale University's online programs validating portfolio risk, capital markets, FINRA regulations, and Markowitz portfolio optimization.",
      },
      {
        id: "inst_mckinsey",
        name: "McKinsey Forward",
        group: "leadership",
        val: 12,
        color: "#0284c7", // Sky Blue
        glowColor: "rgba(2, 132, 199, 0.15)",
        description: "McKinsey Forward Program - digital toolkit, adaptable mindset, business communication, and systematic problem solving.",
      },
      {
        id: "inst_forage",
        name: "Forage Job Simulations",
        group: "finance",
        val: 12,
        color: "#10b981", // Emerald
        glowColor: "rgba(16, 185, 129, 0.2)",
        description: "Practical simulated job experiences in Investment Banking, Software Engineering, Consulting, and Data Analytics.",
      },
      {
        id: "inst_mathworks",
        name: "MathWorks Academy",
        group: "programming",
        val: 12,
        color: "#f97316", // Amber
        glowColor: "rgba(249, 115, 22, 0.2)",
        description: "MATLAB Onramp credentials covering mathematical computations, numerical arrays, and matrix plotting.",
      },
      {
        id: "inst_hplife",
        name: "HP LIFE Program",
        group: "leadership",
        val: 12,
        color: "#0891b2", // Cyan
        glowColor: "rgba(8, 145, 178, 0.2)",
        description: "HPLIFE business tools program, covering digital marketing campaigns and technological entrepreneurship.",
      },
      {
        id: "inst_research",
        name: "Research Publications",
        group: "research",
        val: 12,
        color: "#14b8a6", // Teal
        glowColor: "rgba(20, 184, 166, 0.2)",
        description: "Peer-reviewed scientific publications and quantitative finance research papers.",
      },
      {
        id: "hub_projects",
        name: "Portfolio Projects",
        group: "projects",
        val: 12,
        color: "#f43f5e", // Crimson
        glowColor: "rgba(244, 63, 94, 0.2)",
        description: "Full-scale software platforms, computational client engines, database indexers, and LLM chat interfaces.",
      },
      {
        id: "domain_quant_finance",
        name: "Quantitative Finance & Risk",
        group: "skills_domain",
        val: 12,
        color: "#6366f1", // Indigo
        glowColor: "rgba(99, 102, 241, 0.2)",
        description: "Asset valuations, portfolio risk measurement, covariance matrices, and mean-variance optimization models.",
      },
      {
        id: "domain_corp_finance",
        name: "Financial Modeling & Valuation",
        group: "skills_domain",
        val: 12,
        color: "#f59e0b", // Gold
        glowColor: "rgba(245, 158, 11, 0.2)",
        description: "Integrated spreadsheet modeling, DCF projections, peer transaction multiples, and strategic M&A metrics.",
      },
      {
        id: "domain_strategy",
        name: "Business Strategy & Analytics",
        group: "skills_domain",
        val: 12,
        color: "#10b981", // Emerald
        glowColor: "rgba(16, 185, 129, 0.2)",
        description: "Hypothesis-driven problem solving, market sizing diagnostics, data visualizations, and structured communications.",
      },
      {
        id: "domain_computation",
        name: "Computational Engine Design",
        group: "skills_domain",
        val: 12,
        color: "#06b6d4", // Cyan
        glowColor: "rgba(6, 182, 212, 0.2)",
        description: "Matrix scripting, numerical computing, and real-time streaming data interfaces.",
      },
    ];

    // 3. Leaf Nodes (Specific Subjects / Certificates / Skills)
    const leafNodes: GraphNode[] = [
      // --- BHU VARANASI TOPICS ---
      {
        id: "bhu_calculus",
        name: "Calculus I",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Single-variable calculus including limits, derivatives, sequences, infinite series, and convergence tests.",
      },
      {
        id: "bhu_algebra",
        name: "Algebra",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Abstract algebra covering groups, fields, rings, vector spaces, and homomorphisms.",
      },
      {
        id: "bhu_linear_algebra",
        name: "Linear Algebra",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Vector mappings, matrix decompositions, eigenvalues, and coordinate projections.",
      },
      {
        id: "bhu_analysis",
        name: "Analysis",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Real analysis: metric spaces, limits, continuity, differentiability, and Riemann integration.",
      },
      {
        id: "bhu_multivariable_calc",
        name: "Multivariable Calculus",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Partial differentiation, gradient vectors, double/triple integration, surface integrals, Stokes and Green theorems.",
      },
      {
        id: "bhu_vector_analysis",
        name: "Vector Analysis",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Vector fields, divergence, curl, line integrals, and conservative fields.",
      },
      {
        id: "bhu_tensor_analysis",
        name: "Tensor Analysis",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Covariant/contravariant tensors, metric tensors, and Riemann curvature geometries.",
      },
      {
        id: "bhu_ode",
        name: "Ordinary Differential Equations",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "First/second order linear and nonlinear ODEs, systems of differential equations, and power series solutions.",
      },
      {
        id: "bhu_pde",
        name: "Partial Differential Equations",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Heat/wave equations, Laplace equations, and boundary value problems.",
      },
      {
        id: "bhu_descriptive_stats",
        name: "Descriptive Statistics",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Measures of central tendency, dispersion, skewness, and kurtosis calculations.",
      },
      {
        id: "bhu_regression",
        name: "Regression Analysis",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Simple/multiple linear regression, least squares fitting, and correlation analysis.",
      },
      {
        id: "bhu_probability",
        name: "Probability Theory",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Axiomatic probability, Bayes' theorem, random variables, and expectation.",
      },
      {
        id: "bhu_prob_distributions",
        name: "Theoretical Probability Distributions",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Normal, Binomial, Poisson, Exponential, and Gamma distributions.",
      },
      {
        id: "bhu_stat_inference",
        name: "Statistical Inference I",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Point/interval estimation, sufficiency, consistency, and maximum likelihood estimation.",
      },
      {
        id: "bhu_large_sample",
        name: "Large Sample Test",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Z-test, testing proportion differences, and testing mean differences.",
      },
      {
        id: "bhu_small_sample",
        name: "Small Sample Test",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "t-test, F-test, and Chi-square tests of goodness of fit and independence.",
      },
      {
        id: "bhu_parametric",
        name: "Parametric Test",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Hypothesis testing under normality assumptions and ANOVA tests.",
      },
      {
        id: "bhu_non_parametric",
        name: "Non Parametric Test",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Sign test, Wilcoxon signed-rank test, and Mann-Whitney U test.",
      },
      {
        id: "bhu_writing",
        name: "Writing Skills",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Academic and business communication writing structures.",
      },
      {
        id: "bhu_listening",
        name: "Listening Skills",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Comprehensive listening and speech pattern analysis.",
      },
      {
        id: "bhu_speaking",
        name: "Speaking Skills",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Presentation structure and articulate speech.",
      },
      {
        id: "bhu_reading",
        name: "Reading Skills",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Technical paper review and context extraction.",
      },
      {
        id: "bhu_academic_writing",
        name: "Academic Writing",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Scientific typesetting using LaTeX, reference citing, and thesis structures.",
      },
      {
        id: "bhu_sagemath",
        name: "SageMath",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Scientific computation and algebraic equations modeling in Python/Sage.",
      },
      {
        id: "bhu_python",
        name: "Python Programming",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Algorithmic scripting, numerical libraries, and math data processing in Python.",
      },
      {
        id: "bhu_data_analytics",
        name: "Data Analytics",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Data exploration, profiling, cleaning, and visualizations.",
      },
      {
        id: "bhu_complex_analysis",
        name: "Complex Analysis",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Analytic functions, residues, Cauchy's theorem, and Laurent series.",
      },
      {
        id: "bhu_topology",
        name: "Topology",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Point-set topology, metric spaces, compactness, and connectedness.",
      },
      {
        id: "bhu_graph_theory",
        name: "Graph Theory",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Network paths, coloring, flow optimization, and tree structures.",
      },
      {
        id: "bhu_space_dynamics",
        name: "Space Dynamics",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Astrodynamics, orbital mechanics, and planetary trajectories.",
      },
      {
        id: "bhu_number_theory",
        name: "Number Theory",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Divisibility, prime factoring, modular arithmetic, and cryptography.",
      },
      {
        id: "bhu_conformal_mapping",
        name: "Complex Conformal Mapping",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Analytic mapping preserving angles, MMV research area.",
      },
      {
        id: "bhu_internship_mmv",
        name: "Research Internship (MMV)",
        group: "bhu_topics",
        val: 6,
        color: "#0ea5e9",
        glowColor: "rgba(14, 165, 233, 0.15)",
        description: "Research internship under MMV department studying conformal mappings.",
      },

      // --- CFI TOPICS & VERIFIED CERTIFICATE ---
      {
        id: "cfi_excel_fundamentals",
        name: "Excel Fundamentals",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Advanced lookups, Pivot Tables, conditional formatting, and keyboard shortcuts.",
      },
      {
        id: "cfi_formulas_finance",
        name: "Formulas for Finance",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Time-value formulas: FV, PV, IRR, NPV, PMT, and dynamic interest calculators.",
      },
      {
        id: "cfi_accounting_fundamentals",
        name: "Accounting Fundamentals",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Debits, credits, general ledgers, trial balances, and the complete accounting cycle.",
      },
      {
        id: "cfi_reading_statements",
        name: "Reading Financial Statements",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Deconstructing income statements, balance sheets, and cash flow statements.",
      },
      {
        id: "cfi_math_finance",
        name: "Math for Finance Professionals",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Compounded interests, annuity calculations, bond yields, and discount rates.",
      },
      {
        id: "cfi_fpa_role",
        name: "Role of FP&A Professional",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Corporate financial planning, budgeting operations, and strategic forecasting frameworks.",
      },
      {
        id: "cfi_analysis_fundamentals",
        name: "Financial Analysis Fundamentals",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Vertical/horizontal statements analysis and key corporate ratio profiling.",
      },
      {
        id: "cfi_modeling_guidelines",
        name: "Financial Modeling Guidelines",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Clean model design, standardized formatting, logic auditing, and sheet structuring.",
      },
      {
        id: "cfi_intro_3statement",
        name: "Introduction to 3-Statement Modeling",
        group: "cfi_topics",
        val: 7,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.25)",
        description: "Verified CFI Certificate. Designing integrated financial models in corporate spreadsheets.",
        url: "https://credentials.corporatefinanceinstitute.com/1446023c-a042-462c-a4c1-b85466ba2a69#acc.JKNzbRcp",
      },
      {
        id: "cfi_forecasting_techniques",
        name: "Forecasting Techniques",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Moving averages, regression trend lines, and seasonality adjustment modeling.",
      },
      {
        id: "cfi_ethics",
        name: "Professional Ethics",
        group: "cfi_topics",
        val: 6,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.15)",
        description: "Corporate codes of conduct, insider trading compliance, and financial integrity principles.",
      },

      // --- YALE ONLINE TOPICS & VERIFIED CERTIFICATES ---
      {
        id: "yale_financial_markets",
        name: "Financial Markets",
        group: "yale_topics",
        val: 7,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.25)",
        description: "Yale University — Verified Certificate. Behavioral finance, risk management, dividends, and market mechanics.",
        url: "https://www.coursera.org/account/accomplishments/verify/M4VAZKE6NIIG",
      },
      {
        id: "yale_portfolio_optimization",
        name: "Portfolio Optimization using Markowitz Model",
        group: "yale_topics",
        val: 7,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.25)",
        description: "Coursera — Verified Certificate. Constructing efficient frontiers, covariance matrix calculations, and risk-return optimization.",
        url: "https://coursera.org/share/3514683cfa918a52e723c7b13dc4b469",
      },
      {
        id: "yale_portfolio_risk",
        name: "Portfolio Risk",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Quantifying variance, standard deviation, Value-at-Risk (VaR), and asset beta factors.",
      },
      {
        id: "yale_regulations",
        name: "Financial Regulations",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Deconstructing SEC rules, central banking policies, and structural market regulations.",
      },
      {
        id: "yale_capital_markets",
        name: "Capital Markets",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Primary/secondary distributions, debt issuances, and global liquidity structures.",
      },
      {
        id: "yale_finra",
        name: "Financial Industry Regulatory Authorities",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "FINRA compliance guidelines, structural disclosures, and retail protection measures.",
      },
      {
        id: "yale_model_optimization",
        name: "Model Optimization",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Maximizing Sharpe ratios, minimum variance boundaries, and solver operations.",
      },
      {
        id: "yale_investments",
        name: "Investments",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Asset allocations, stock valuations, bond math, and alternative investments.",
      },
      {
        id: "yale_correlation_analysis",
        name: "Correlation Analysis",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Pearson correlation coefficient profiling and asset price synchronization mappings.",
      },
      {
        id: "yale_math_modeling",
        name: "Mathematical Modeling",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Mathematical modeling of financial processes, stock movements, and asset distributions.",
      },
      {
        id: "yale_financial_modeling",
        name: "Financial Modeling",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Simulating asset allocations, historical standard deviations, and risk tables.",
      },
      {
        id: "yale_roi",
        name: "Return On Investment",
        group: "yale_topics",
        val: 6,
        color: "#1e3a8a",
        glowColor: "rgba(30, 58, 138, 0.15)",
        description: "Compounded annualized growth rates, yields, and tracking portfolio returns.",
      },

      // --- GLOBAL MARKETS TOPICS ---
      {
        id: "gm_sales",
        name: "Global Markets Sales",
        group: "global_markets",
        val: 6,
        color: "#0891b2",
        glowColor: "rgba(8, 145, 178, 0.15)",
        description: "Structuring institutional products, derivative sales coverage, and presentation pitches.",
      },
      {
        id: "gm_trading_analysis",
        name: "Trading Analysis",
        group: "global_markets",
        val: 6,
        color: "#0891b2",
        glowColor: "rgba(8, 145, 178, 0.15)",
        description: "Order book mechanics, macro trend analysis, and quantitative technical indicators.",
      },
      {
        id: "gm_global_markets",
        name: "Global Markets",
        group: "global_markets",
        val: 6,
        color: "#0891b2",
        glowColor: "rgba(8, 145, 178, 0.15)",
        description: "Analyzing global currencies (FX), commodities, sovereign debt, and derivatives.",
      },

      // --- MCKINSEY FORWARD ---
      {
        id: "cert_mckinsey_forward",
        name: "McKinsey Forward Program",
        group: "mckinsey_certs",
        val: 7,
        color: "#0284c7",
        glowColor: "rgba(2, 132, 199, 0.25)",
        description: "Verified Credly Badge. Systematic business problem solving, structured communications, and agile toolkit.",
        url: "https://www.credly.com/badges/fe63b6ed-b8a5-4a8d-adae-8a43da3e7f2e/public_url",
      },

      // --- FORAGE SIMULATIONS ---
      {
        id: "cert_ib_sim",
        name: "Investment Banking Job Simulation",
        group: "forage_certs",
        val: 6,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.15)",
        description: "Simulating strategic pitchbooks, DCF asset valuation, and target M&A analyses.",
        url: "https://www.theforage.com/completion-certificates/fMCqmt8qR4G85Puue/rKCBL7y5yKgzDGZmR_fMCqmt8qR4G85Puue_rhTtGoJrLCRvnL2fG_1762849746421_completion_certificate.pdf",
      },
      {
        id: "cert_gs_sim",
        name: "Goldman Sachs Job Simulation",
        group: "forage_certs",
        val: 6,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.15)",
        description: "Goldman Sachs program covering quantitative calculations and portfolio risk models.",
        url: "https://www.theforage.com/completion-certificates/MBA4MnZTNFEoJZGnk/wNge9cjzNTXD2acrv_MBA4MnZTNFEoJZGnk_rhTtGoJrLCRvnL2fG_1758438210693_completion_certificate.pdf",
      },
      {
        id: "cert_deloitte_sim",
        name: "Deloitte Data Analytics Job Simulation",
        group: "forage_certs",
        val: 6,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.15)",
        description: "Deloitte simulation covering forensic table filtering and diagnostic analysis dashboards.",
        url: "https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/9PBTqmSxAf6zZTseP/io9DzWKe3PTsiS6GG_9PBTqmSxAf6zZTseP_rhTtGoJrLCRvnL2fG_1755236215404_completion_certificate.pdf",
      },
      {
        id: "cert_bcg_sim",
        name: "BCG Strategy Consulting Job Simulation",
        group: "forage_certs",
        val: 6,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.15)",
        description: "BCG consulting simulation covering market entry sizing and strategy matrices.",
        url: "https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/SKZxezskWgmFjRvj9/Pchc5rEGyCeozqY5Z_SKZxezskWgmFjRvj9_rhTtGoJrLCRvnL2fG_1755008157720_completion_certificate.pdf",
      },
      {
        id: "cert_jpmc_sim",
        name: "JPMC Software Engineering Job Simulation",
        group: "forage_certs",
        val: 6,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.15)",
        description: "Simulating live financial charts using JP Morgan's Perspective data grid visualizers.",
        url: "https://forage-uploads-prod.s3.amazonaws.com/completion-certificates/Sj7temL583QAYpHXD/YD2kY95RQxQtXxFTS_Sj7temL583QAYpHXD_rhTtGoJrLCRvnL2fG_1755019542046_completion_certificate.pdf",
      },

      // --- OTHER ACTIVE CERTIFICATES ---
      {
        id: "cert_matlab_onramp",
        name: "MATLAB Onramp",
        group: "mathworks_certs",
        val: 6,
        color: "#f97316",
        glowColor: "rgba(249, 115, 22, 0.15)",
        description: "MathWorks Academy certification validating matrix computing, plotting, and script structuring.",
        url: "https://matlabacademy.mathworks.com/progress/share/certificate.html?id=b8b0e340-7267-4d35-9fdb-5846500c52ff",
      },
      {
        id: "cert_hp_marketing",
        name: "HP LIFE Digital Marketing",
        group: "hplife_certs",
        val: 6,
        color: "#0891b2",
        glowColor: "rgba(8, 145, 178, 0.15)",
        description: "HP LIFE business systems validation, covering advertising, SEO indexing, and campaigns auditing.",
        url: "https://www.life-global.org/certificate/a761218a-e0be-4d06-a86a-73c0103e2f13",
      },
      {
        id: "pub_beyond_markowitz",
        name: "Beyond Markowitz: Evaluating Maximum Diversification in Multi-Asset Portfolios",
        group: "research_certs",
        val: 7,
        color: "#14b8a6",
        glowColor: "rgba(20, 184, 166, 0.25)",
        description: "Published Paper. Investigating the limits of Markowitz MVO and assessing Maximum Diversification as a robust alternative during stressed market regimes.",
        url: "https://ssrn.com/abstract=6692678",
      },

      // --- PORTFOLIO PROJECTS ---
      {
        id: "proj_deeplink",
        name: "DeepLink Social Platform",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "A beautiful links aggregator and deep-linking system that creates optimized paths for profile sharing and platform redirection.",
        url: "https://deeplink-friends.vercel.app/",
      },
      {
        id: "proj_placement",
        name: "Placement Portal Delta",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "A high-performance recruitment tracker and analytics dashboard featuring database integrity layers and transactional data exports.",
        url: "https://placement-project-delta.vercel.app/",
      },
      {
        id: "proj_library",
        name: "VRS Digital Library",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "A full-stack web library application featuring transactional member management, active waiting-rooms, and backup-recovery pipelines.",
        url: "https://vrs-library.vercel.app/",
      },
      {
        id: "proj_pdf",
        name: "Img-To-PDF Converter",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "High-performance client-side images compiler to PDF. Supports batch selection, visual re-ordering, and zero-server compiling.",
        url: "https://aryanpdf.vercel.app",
      },
      {
        id: "proj_chatbot",
        name: "AI Chatbot Client",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "An intelligent, custom conversational interface featuring natural typing visualizers and context-preserving system instructions.",
        url: "https://rn-ai-120b.vercel.app/",
      },
      {
        id: "proj_workshop",
        name: "Workshop Helper",
        group: "project_nodes",
        val: 6,
        color: "#f43f5e",
        glowColor: "rgba(244, 63, 94, 0.15)",
        description: "A serverless GenAI RAG system and interactive Next.js dashboard integrating Meta Llama 3 via Hugging Face inference and Three.js 3D WebGL simulations, powered by GCP pipelines.",
        url: "https://github.com/quashanshayan123ansari/workshop-helper",
      },

      // --- NEW CERTIFICATE-DERIVED SPECIALIZED SKILLS ---
      // 1. Quantitative Finance & Risk
      {
        id: "skill_mvo",
        name: "Mean-Variance Optimization",
        group: "quant_skills",
        val: 5,
        color: "#6366f1",
        glowColor: "rgba(99, 102, 241, 0.1)",
        description: "Mathematical framework to assemble assets maximizing expected return for a given level of risk.",
      },
      {
        id: "skill_frontier",
        name: "Efficient Frontier Construction",
        group: "quant_skills",
        val: 5,
        color: "#6366f1",
        glowColor: "rgba(99, 102, 241, 0.1)",
        description: "Plotting optimal portfolios offering the highest expected return for defined risk levels.",
      },
      {
        id: "skill_portfolio_theory",
        name: "Modern Portfolio Theory",
        group: "quant_skills",
        val: 5,
        color: "#6366f1",
        glowColor: "rgba(99, 102, 241, 0.1)",
        description: "Foundational economic theory modeling diversification to reduce idiosyncratic risk.",
      },
      {
        id: "skill_quantitative_risk",
        name: "Quantitative Risk Analysis",
        group: "quant_skills",
        val: 5,
        color: "#6366f1",
        glowColor: "rgba(99, 102, 241, 0.1)",
        description: "Measuring standard deviation of returns, tracking portfolios covariance, and calculating VaR.",
      },

      // 2. Financial Modeling & Corporate Valuation
      {
        id: "skill_three_statement",
        name: "3-Statement Modeling",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Building integrated financial statements linking IS, BS, and CFS inside spreadsheets.",
      },
      {
        id: "skill_dcf",
        name: "Discounted Cash Flow (DCF)",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Valuing target corporate assets based on future free cash flows projections.",
      },
      {
        id: "skill_cca",
        name: "Comparable Company Analysis",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Estimating business multiples (EV/EBITDA, P/E) against public peer sets.",
      },
      {
        id: "skill_pitchbook",
        name: "Pitchbook Preparation",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Designing corporate presentation templates summarizing valuation ranges and strategic alternatives.",
      },
      {
        id: "skill_mna",
        name: "M&A Strategic Valuation",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Evaluating accretion/dilution impacts and transaction synergy structures.",
      },
      {
        id: "skill_fin_ops",
        name: "Financial Operations",
        group: "corp_skills",
        val: 5,
        color: "#f59e0b",
        glowColor: "rgba(245, 158, 11, 0.1)",
        description: "Analyzing operational liquidity metrics, net working capital, and funding facilities.",
      },

      // 3. Business Strategy & Analytics
      {
        id: "skill_market_sizing",
        name: "Market Sizing Analysis",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Estimating TAM, SAM, and SOM figures using top-down and bottom-up consulting techniques.",
      },
      {
        id: "skill_hypothesis_solving",
        name: "Hypothesis-Driven Solving",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Structuring McKinsey/BCG MECE issues trees to identify core business drivers.",
      },
      {
        id: "skill_forensic",
        name: "Forensic Analysis",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Auditing database entries and financial ledgers to flag anomalies and discrepancies.",
      },
      {
        id: "skill_data_viz",
        name: "Strategic Data Visualisation",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Translating data queries into dynamic charts (waterfall, line, stacked column charts) to communicate insight.",
      },
      {
        id: "skill_digital_marketing",
        name: "Digital Marketing Analytics",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Leveraging organic search indexers, SEO auditing, and target ad budget planning.",
      },
      {
        id: "skill_digital_entrepreneurship",
        name: "Digital Entrepreneurship",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Formulating business models, pricing strategies, and lean startup operational plans.",
      },
      {
        id: "skill_structured_comm",
        name: "Structured Business Writing",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Pyramid principle writing and business presentation storytelling for executive clients.",
      },
      {
        id: "skill_adaptable_mindset",
        name: "Adaptable Digital Toolkit",
        group: "strategy_skills",
        val: 5,
        color: "#10b981",
        glowColor: "rgba(16, 185, 129, 0.1)",
        description: "Agile methodologies, continuous learning framework, and business toolkit adaptation.",
      },

      // 4. Computational Engine Design
      {
        id: "skill_matlab",
        name: "MATLAB Programming",
        group: "comp_skills",
        val: 5,
        color: "#06b6d4",
        glowColor: "rgba(6, 182, 212, 0.1)",
        description: "Numeric computations, vectorized arithmetic, and scientific visualization using script matrices.",
      },
      {
        id: "skill_realtime_feeds",
        name: "Real-Time Data Feeds",
        group: "comp_skills",
        val: 5,
        color: "#06b6d4",
        glowColor: "rgba(6, 182, 212, 0.1)",
        description: "Streaming stock exchange price feeds and mapping order book tickers dynamically.",
      },
    ];

    const allNodes: GraphNode[] = [
      centerNode,
      ...hubs,
      ...leafNodes,
    ];

    // --- CONNECTION RULESETS ---
    const connections: GraphLink[] = [];

    // A. Center to Hubs (Level 1)
    hubs.forEach((hub) => {
      connections.push({
        source: "center",
        target: hub.id,
      });
    });

    // B. Hubs to respective Leaf Nodes
    leafNodes.forEach((node) => {
      let targetHub = "";
      if (node.id.startsWith("bhu_")) targetHub = "inst_bhu";
      else if (node.id.startsWith("cfi_")) targetHub = "inst_cfi";
      else if (node.id.startsWith("yale_")) targetHub = "inst_yale";
      else if (node.id.startsWith("gm_")) targetHub = "inst_yale"; // link global markets under yale
      else if (node.id.startsWith("proj_")) targetHub = "hub_projects";
      else if (node.id === "cert_mckinsey_forward") targetHub = "inst_mckinsey";
      else if (node.id.endsWith("_sim")) targetHub = "inst_forage";
      else if (node.id === "cert_matlab_onramp") targetHub = "inst_mathworks";
      else if (node.id === "cert_hp_marketing") targetHub = "inst_hplife";
      else if (node.id === "pub_beyond_markowitz") targetHub = "inst_research";
      // Skill nodes connected to their new custom hubs
      else if (node.group === "quant_skills") targetHub = "domain_quant_finance";
      else if (node.group === "corp_skills") targetHub = "domain_corp_finance";
      else if (node.group === "strategy_skills") targetHub = "domain_strategy";
      else if (node.group === "comp_skills") targetHub = "domain_computation";

      if (targetHub) {
        connections.push({
          source: targetHub,
          target: node.id,
        });
      }
    });

    // C. Cross-link Certificates and Projects to their utilized Skills (Secondary Connections)
    const skillLinks = [
      // Portfolio Optimization & SSRN Paper
      { source: "yale_portfolio_optimization", target: "skill_mvo" },
      { source: "yale_portfolio_optimization", target: "skill_frontier" },
      { source: "yale_portfolio_optimization", target: "skill_portfolio_theory" },
      { source: "yale_portfolio_optimization", target: "skill_quantitative_risk" },
      { source: "pub_beyond_markowitz", target: "skill_mvo" },
      { source: "pub_beyond_markowitz", target: "skill_frontier" },
      { source: "pub_beyond_markowitz", target: "skill_portfolio_theory" },
      { source: "pub_beyond_markowitz", target: "skill_quantitative_risk" },

      // Financial Markets Yale
      { source: "yale_financial_markets", target: "skill_portfolio_theory" },
      { source: "yale_financial_markets", target: "skill_quantitative_risk" },

      // CFI 3-Statement modeling
      { source: "cfi_intro_3statement", target: "skill_three_statement" },

      // Investment Banking Simulation
      { source: "cert_ib_sim", target: "skill_dcf" },
      { source: "cert_ib_sim", target: "skill_cca" },
      { source: "cert_ib_sim", target: "skill_pitchbook" },
      { source: "cert_ib_sim", target: "skill_mna" },

      // Goldman Sachs Simulation
      { source: "cert_gs_sim", target: "skill_quantitative_risk" },
      { source: "cert_gs_sim", target: "skill_fin_ops" },

      // Deloitte Data Analytics
      { source: "cert_deloitte_sim", target: "skill_forensic" },
      { source: "cert_deloitte_sim", target: "skill_data_viz" },

      // BCG strategy consulting
      { source: "cert_bcg_sim", target: "skill_market_sizing" },
      { source: "cert_bcg_sim", target: "skill_hypothesis_solving" },

      // JPMorgan Simulation
      { source: "cert_jpmc_sim", target: "skill_realtime_feeds" },

      // McKinsey Forward Program
      { source: "cert_mckinsey_forward", target: "skill_hypothesis_solving" },
      { source: "cert_mckinsey_forward", target: "skill_structured_comm" },
      { source: "cert_mckinsey_forward", target: "skill_adaptable_mindset" },

      // MathWorks Onramp
      { source: "cert_matlab_onramp", target: "skill_matlab" },

      // HP LIFE marketing
      { source: "cert_hp_marketing", target: "skill_digital_marketing" },
      { source: "cert_hp_marketing", target: "skill_digital_entrepreneurship" },

      // Projects
      { source: "proj_workshop", target: "skill_data_viz" },
      { source: "proj_placement", target: "skill_data_viz" },
      { source: "proj_chatbot", target: "skill_realtime_feeds" },
    ];

    skillLinks.forEach((link) => {
      connections.push(link);
    });

    setNodesCount(allNodes.length);
    setLinksCount(connections.length);

    // --- INITIALIZE FORCE GRAPH ---
    let myGraph: any = null;

    const initGraph = async () => {
      const ForceGraphModule = await import("force-graph");
      const ForceGraph = ForceGraphModule.default;

      if (!graphRef.current) return;

      myGraph = new ForceGraph(graphRef.current)
        .graphData({ nodes: allNodes, links: connections })
        .backgroundColor("#fafafa")
        .nodeRelSize(6)
        .nodeVal((node: any) => node.val)
        .nodeColor((node: any) => node.color)
        .nodeLabel((node: any) => `
          <div style="background: rgba(255, 255, 255, 0.98); border: 1px solid ${node.color}; padding: 10px 14px; border-radius: 8px; color: #0f172a; font-family: system-ui, -apple-system, sans-serif; max-width: 280px; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
            <div style="font-weight: bold; color: ${node.color}; margin-bottom: 4px; font-size: 0.9rem;">${node.name}</div>
            <div style="font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-family: monospace; margin-bottom: 6px;">${node.group.replace("_", " ")}</div>
            <div style="font-size: 0.8rem; line-height: 1.4; color: #334155;">${node.description}</div>
            ${node.url ? '<div style="font-size: 0.7rem; color: #0284c7; margin-top: 6px; font-family: monospace;">CLICK TO OPEN VERIFICATION ↗</div>' : ''}
          </div>
        `)
        // Permanent canvas drawing of labels and shapes
        .nodeCanvasObject((node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
          const size = node.val;
          const isHovered = node === hoveredNode;
          const isSelected = node === selectedNode;

          // 1. Draw glowing outer circle/halo if active
          if (isHovered || isSelected) {
            ctx.beginPath();
            ctx.arc(node.x, node.y, size * 1.6, 0, 2 * Math.PI, false);
            ctx.fillStyle = node.glowColor || "rgba(15, 23, 42, 0.05)";
            ctx.fill();
          }

          // 2. Draw solid center circle
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.fillStyle = node.color || "#0f172a";
          ctx.fill();

          // 3. Draw border ring
          ctx.strokeStyle = isHovered || isSelected ? "#0f172a" : "rgba(255, 255, 255, 0.8)";
          ctx.lineWidth = isHovered || isSelected ? 2.5 : 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
          ctx.stroke();

          // 4. Render Permanent labels text directly underneath the node
          const label = node.name;
          const isHubOrCenter = node.group === "center" || node.group === "education" || node.group === "finance" || node.group === "leadership" || node.group === "research" || node.group === "projects" || node.group === "skills_domain";

          let fontSize = isHubOrCenter ? 12 : 8.5;
          
          // Hide small course labels only if zoomed out extremely far to avoid messy overlays
          if (!isHubOrCenter && globalScale < 0.65) {
            return;
          }

          ctx.font = `${isHubOrCenter ? "bold" : "500"} ${fontSize}px system-ui, -apple-system, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "top";

          // Text halo/outline for readability against grid lines
          ctx.strokeStyle = "#fafafa";
          ctx.lineWidth = 3.5;
          ctx.strokeText(label, node.x, node.y + size + 5);

          ctx.fillStyle = isHubOrCenter ? "#0f172a" : "#475569";
          ctx.fillText(label, node.x, node.y + size + 5);
        })
        // Subtle grey threads for connections matching light modes
        .linkColor(() => "rgba(15, 23, 42, 0.08)")
        .linkWidth(1.2)
        .linkDirectionalParticles(1)
        .linkDirectionalParticleSpeed(0.005)
        .linkDirectionalParticleWidth(2.5)
        .linkDirectionalParticleColor((link: any) => {
          const sourceNode = allNodes.find(n => n.id === (typeof link.source === 'object' ? link.source.id : link.source));
          return sourceNode ? sourceNode.color : "#0f172a";
        })
        .onNodeHover((node: any) => {
          if (graphRef.current) {
            graphRef.current.style.cursor = node ? "pointer" : "default";
          }
          setHoveredNode(node || null);
        })
        .onNodeClick((node: any) => {
          setSelectedNode(node || null);
          if (node.url) {
            window.open(node.url, "_blank");
          }
        });

      // Adjust force simulations for optimal label spacing
      myGraph.d3Force("charge").strength(-160);
      myGraph.d3Force("link").distance((link: any) => {
        const sourceId = typeof link.source === "object" ? link.source.id : link.source;
        const targetId = typeof link.target === "object" ? link.target.id : link.target;
        if (sourceId === "center" || targetId === "center") return 110;
        if (sourceId.startsWith("inst_") || targetId.startsWith("inst_") || sourceId.startsWith("domain_") || targetId.startsWith("domain_")) return 70;
        return 45;
      });

      // Fit to screen on mount
      setTimeout(() => {
        if (myGraph) {
          myGraph.zoomToFit(1000, 80);
        }
      }, 500);
    };

    initGraph();

    // Cleanup on unmount
    return () => {
      if (myGraph) {
        if (graphRef.current) {
          graphRef.current.innerHTML = "";
        }
      }
    };
  }, []);

  const activeDetailNode = hoveredNode || selectedNode;

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        background: "#fafafa",
        overflow: "hidden",
      }}
    >
      {/* Container for the force graph */}
      <div
        ref={graphRef}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
        }}
      />

      {/* Floating HUD Interface Header Overlay */}
      <div
        style={{
          position: "absolute",
          top: "24px",
          left: "24px",
          right: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        {/* Navigation & Title */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", pointerEvents: "auto" }}>
          <Link
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              color: "#475569",
              fontSize: "0.85rem",
              fontWeight: 600,
              textDecoration: "none",
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(0, 0, 0, 0.06)",
              padding: "8px 16px",
              borderRadius: "30px",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.02)",
              width: "fit-content",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#0f172a";
              e.currentTarget.style.borderColor = "var(--primary)";
              e.currentTarget.style.background = "#ffffff";
              e.currentTarget.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
              e.currentTarget.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.06)";
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.75)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.02)";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
          <h1
            style={{
              color: "#0f172a",
              fontSize: "1.25rem",
              fontWeight: 800,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.08em",
              marginTop: "8px",
            }}
          >
            MASTER NEURAL INTERFACE
          </h1>
        </div>

        {/* System telemetry stat labels */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "4px",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            color: "var(--primary)",
            textAlign: "right",
          }}
        >
          <span>DYNAMIC FORCE-GRAPH MODULE v1.44</span>
          <span style={{ color: "#64748b" }}>
            TENSORS INITIATED // {nodesCount} ACTIVE NODES // {linksCount} LINKS
          </span>
        </div>
      </div>

      {/* Floating HUD Node Detail Info Box */}
      {activeDetailNode && (
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "24px",
            maxWidth: "440px",
            width: "calc(100% - 48px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(12px)",
            border: `1px solid ${activeDetailNode.color || "rgba(0,0,0,0.1)"}`,
            boxShadow: `0 12px 32px rgba(0, 0, 0, 0.08), 0 0 15px ${activeDetailNode.glowColor || "rgba(0,0,0,0.05)"}`,
            borderRadius: "16px",
            padding: "24px",
            color: "#0f172a",
            zIndex: 10,
            transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                color: activeDetailNode.color,
                border: `1px solid ${activeDetailNode.color}`,
                padding: "2px 8px",
                borderRadius: "4px",
                textTransform: "uppercase",
                fontWeight: 600,
              }}
            >
              {activeDetailNode.group.replace("_", " ")} NODE
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {activeDetailNode.url && (
                <a
                  href={activeDetailNode.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: activeDetailNode.color,
                    fontSize: "0.75rem",
                    fontFamily: "var(--font-mono)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    background: "rgba(0,0,0,0.02)",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    border: "1px solid rgba(0, 0, 0, 0.05)",
                    transition: "all 0.2s ease",
                    fontWeight: 600,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = activeDetailNode.color;
                    e.currentTarget.style.color = "#ffffff";
                    e.currentTarget.style.borderColor = activeDetailNode.color;
                    e.currentTarget.style.boxShadow = `0 0 8px ${activeDetailNode.glowColor}`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                    e.currentTarget.style.color = activeDetailNode.color;
                    e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  VERIFY CREDENTIAL ↗
                </a>
              )}
              <button
                onClick={() => {
                  setSelectedNode(null);
                  setHoveredNode(null);
                }}
                style={{
                  background: "rgba(0,0,0,0.02)",
                  border: "1px solid rgba(0, 0, 0, 0.05)",
                  color: "#475569",
                  cursor: "pointer",
                  borderRadius: "6px",
                  padding: "4px 10px",
                  fontSize: "0.75rem",
                  fontFamily: "var(--font-mono)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.color = "rgb(239, 68, 68)";
                  e.currentTarget.style.borderColor = "rgb(239, 68, 68)";
                  e.currentTarget.style.boxShadow = "0 0 8px rgba(239, 68, 68, 0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(0,0,0,0.02)";
                  e.currentTarget.style.color = "#475569";
                  e.currentTarget.style.borderColor = "rgba(0,0,0,0.05)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                ✕ CLOSE
              </button>
            </div>
          </div>

          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: 700,
              fontFamily: "var(--font-sans)",
              marginBottom: "8px",
              color: "#0f172a",
              textShadow: `0 0 8px ${activeDetailNode.glowColor || "rgba(0,0,0,0.05)"}`,
            }}
          >
            {activeDetailNode.name}
          </h2>

          <p
            style={{
              fontSize: "0.85rem",
              color: "#475569",
              lineHeight: 1.5,
              marginBottom: "16px",
            }}
          >
            {activeDetailNode.description}
          </p>

          <div
            style={{
              borderTop: "1px solid rgba(0, 0, 0, 0.06)",
              paddingTop: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: "0.75rem",
              color: "#94a3b8",
              fontFamily: "var(--font-mono)",
            }}
          >
            <span>STATUS: ACTIVE SYNAPSE</span>
            <span>ZOOM OR DRAG NODE TO EXPLORE</span>
          </div>
        </div>
      )}

      {/* Mini Telemetry instruction banner */}
      {!activeDetailNode && (
        <div
          style={{
            position: "absolute",
            bottom: "24px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(255,255,255,0.75)",
            border: "1px solid rgba(0,0,0,0.06)",
            backdropFilter: "blur(4px)",
            borderRadius: "30px",
            padding: "8px 24px",
            color: "#64748b",
            fontFamily: "var(--font-mono)",
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            zIndex: 10,
            pointerEvents: "none",
            textAlign: "center",
            boxShadow: "0 4px 15px rgba(0,0,0,0.02)",
          }}
        >
          DRAG TO PAN · MOUSEWHEEL TO ZOOM · CLICK NODE TO VERIFY CREDENTIALS
        </div>
      )}

      {/* Global CSS Injectors for fade-in animations */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
}
