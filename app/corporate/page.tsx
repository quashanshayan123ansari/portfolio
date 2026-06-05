"use client";

import Link from "next/link";
import ThreeBackground from "../components/ThreeBackground";
import FinanceDashboard from "../components/FinanceDashboard";

export default function Page() {
  return (
    <>
      <ThreeBackground activeTab="corporate" />
      <div className="container glow-corporate" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ padding: "2rem clamp(2rem, 8vw, 8rem)", zIndex: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link href="/" className="btn-xai-outline" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            ← BACK TO HOME
          </Link>
          <Link href="/finance" className="btn-xai-white" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            VIEW INVESTMENT ANALYTICS →
          </Link>
        </header>
        <main style={{ flex: 1, padding: "2rem 0" }}>
          <section className="animate-fade-in-up" style={{ padding: "0 clamp(2rem, 8vw, 8rem)" }}>
            <div style={{ minHeight: "400px" }}>
              <FinanceDashboard 
                defaultTab="corporate" 
                allowedTabs={["corporate", "dmart"]} 
                title="Corporate Performance Dashboard"
                subtitle="Enterprise financial metrics and trends reconstructed from actual performance datasets, featuring a multi-page interactive layout."
              />
            </div>
          </section>
        </main>
        <footer style={{ padding: "2rem", textAlign: "center", zIndex: 10 }}>
          <p>© {new Date().getFullYear()} Mohammad Quashan. Designed & built by Mohammad Quashan. All Rights Reserved.</p>
        </footer>
      </div>
    </>
  );
}
