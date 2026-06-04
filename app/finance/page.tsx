"use client";

import Link from "next/link";
import ThreeBackground from "../components/ThreeBackground";
import FinanceDashboard from "../components/FinanceDashboard";

export default function Page() {
  return (
    <>
      <ThreeBackground activeTab="finance" />
      <div className="container glow-finance" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <header style={{ padding: "2rem clamp(2rem, 8vw, 8rem)", zIndex: 10 }}>
          <Link href="/" className="btn-xai-outline" style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
            ← BACK TO HOME
          </Link>
        </header>
        <main style={{ flex: 1, padding: "2rem 0" }}>
          <section className="animate-fade-in-up" style={{ padding: "0 clamp(2rem, 8vw, 8rem)" }}>
            <div style={{ minHeight: "400px" }}>
              <FinanceDashboard />
            </div>
          </section>
        </main>
        <footer style={{ padding: "2rem", textAlign: "center", zIndex: 10 }}>
          <p>© {new Date().getFullYear()} UM MOHAMMAD. BUILT WITH NEXT.JS, THREE.JS & TYPESCRIPT. LIGHTWEIGHT & FLUID.</p>
        </footer>
      </div>
    </>
  );
}
