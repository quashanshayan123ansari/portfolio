"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ThreeBackground from "./components/ThreeBackground";
import NeuralNetworkChord from "./components/NeuralNetworkChord";
import FinanceDashboard from "./components/FinanceDashboard";
import { CERTS } from "./certificates/page";

type TabType = "education" | "certificates" | "socials" | "neural" | "finance" | "research" | "corporate";

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>("education");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [terminalText, setTerminalText] = useState("");
  const [activeCursor, setActiveCursor] = useState<"line1" | "line2" | "terminal" | "none">("line1");




  useEffect(() => {
    const text1 = "Hello everyone!";
    const text2 = "I am Quashan";
    const text3 = "specializing in financial mathematics and quantitative finance, developing options pricing models, simulating stochastic processes, and engineering algorithmic trading frameworks.";
    
    let i1 = 0;
    let i2 = 0;
    let i3 = 0;
    
    let timer1: ReturnType<typeof setInterval> | undefined;
    let timer2: ReturnType<typeof setInterval> | undefined;
    let timer3: ReturnType<typeof setInterval> | undefined;
    let timeout1: ReturnType<typeof setTimeout> | undefined;
    let timeout2: ReturnType<typeof setTimeout> | undefined;
    
    // Type line 1
    timer1 = setInterval(() => {
      if (i1 < text1.length) {
        setLine1(text1.substring(0, i1 + 1));
        i1++;
      } else {
        clearInterval(timer1);
        setActiveCursor("line2");
        
        // Type line 2 (starts after a small delay of 100ms)
        timeout1 = setTimeout(() => {
          timer2 = setInterval(() => {
            if (i2 < text2.length) {
              setLine2(text2.substring(0, i2 + 1));
              i2++;
            } else {
              clearInterval(timer2);
              setActiveCursor("terminal");
              
              // Type terminal text (starts after a delay of 150ms)
              timeout2 = setTimeout(() => {
                timer3 = setInterval(() => {
                  if (i3 < text3.length) {
                    setTerminalText(text3.substring(0, i3 + 1));
                    i3++;
                  } else {
                    clearInterval(timer3);
                    setActiveCursor("none");
                  }
                }, 15); // terminal types slightly faster
              }, 150);
            }
          }, 30);
        }, 100);
      }
    }, 30);
    
    return () => {
      if (timer1) clearInterval(timer1);
      if (timer2) clearInterval(timer2);
      if (timer3) clearInterval(timer3);
      if (timeout1) clearTimeout(timeout1);
      if (timeout2) clearTimeout(timeout2);
    };
  }, []);

  const handleTabClick = (tab: TabType) => {
    setActiveTab(tab);
    const hubSection = document.getElementById("hub");
    if (hubSection) {
      hubSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToHub = () => {
    const hubSection = document.getElementById("hub");
    if (hubSection) {
      hubSection.scrollIntoView({ behavior: "smooth" });
    }
  };



  return (
    <div className={`glow-${activeTab}`}>
      {/* High-performance lightweight 3D Background */}
      <ThreeBackground activeTab={activeTab} />


      {/* Hero Section */}
      <section style={{
        position: "relative",
        minHeight: "100vh",
        height: "auto",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "clamp(3rem, 8vh, 5rem) clamp(1.5rem, 3vw, 2.5rem) clamp(2rem, 5vh, 4rem)",
        overflow: "hidden"
      }}>
        {/* Left-heavy layout */}
        <div style={{ zIndex: 2, maxWidth: "900px", marginTop: "20px" }}>
          <h1 style={{
            fontSize: "clamp(2.2rem, 5.5vw, 4.5rem)",
            fontWeight: 400,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            color: "var(--foreground)",
            marginBottom: "1.5rem",
            fontFamily: "var(--font-sans)",
            opacity: 0.95
          }}>
            <div style={{ minHeight: "1.25em" }}>
              {line1}
              {activeCursor === "line1" && <span className="typing-cursor">|</span>}
            </div>
            <div style={{ minHeight: "1.25em" }} className="dynamic-gradient-text">
              {line2}
              {activeCursor === "line2" && <span className="typing-cursor">|</span>}
            </div>
          </h1>

          {/* Terminal Command Line */}
          <div style={{
            fontFamily: "var(--font-mono)",
            fontSize: "clamp(0.85rem, 2vw, 1.1rem)",
            marginBottom: "2.5rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "8px",
            lineHeight: 1.5,
            minHeight: "2em"
          }}>
            {(activeCursor === "terminal" || terminalText || activeCursor === "none") && (
              <>
                <span style={{ color: "#38bdf8", flexShrink: 0, fontWeight: 600 }}>quashan@root:~$</span>
                <span style={{ color: "var(--foreground)", wordBreak: "break-word" }}>
                  {terminalText}
                  {(activeCursor === "terminal" || activeCursor === "none") && <span className="terminal-cursor">█</span>}
                </span>
              </>
            )}
          </div>

          {/* Row of 5 buttons */}
          <div style={{
            display: "flex",
            gap: "14px",
            flexWrap: "wrap",
            alignItems: "center"
          }}>
            <Link
              href="/neural-graph"
              className="btn-xai-green"
            >
              MASTER NEURAL ↗
            </Link>


            <button
              onClick={() => handleTabClick("education")}
              className={activeTab === "education" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "education" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#a855f7",
                  boxShadow: "0 0 6px #a855f7",
                  marginRight: "8px"
                }} />
              )}
              MY EDUCATION ↗
            </button>

            <button
              onClick={() => handleTabClick("certificates")}
              className={activeTab === "certificates" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "certificates" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#ef4444",
                  boxShadow: "0 0 6px #ef4444",
                  marginRight: "8px"
                }} />
              )}
              MY CERTIFICATES ↗
            </button>

            <button
              onClick={() => handleTabClick("socials")}
              className={activeTab === "socials" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "socials" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#d946ef",
                  boxShadow: "0 0 6px #d946ef",
                  marginRight: "8px"
                }} />
              )}
              SOCIAL CONNECT ↗
            </button>

            <button
              onClick={() => handleTabClick("corporate")}
              className={activeTab === "corporate" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "corporate" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 6px #22c55e",
                  marginRight: "8px"
                }} />
              )}
              COMPANY PERFORMANCE ↗
            </button>

            <button
              onClick={() => handleTabClick("finance")}
              className={activeTab === "finance" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "finance" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#06b6d4",
                  boxShadow: "0 0 6px #06b6d4",
                  marginRight: "8px"
                }} />
              )}
              FINANCIAL ANALYTICS ↗
            </button>

            <button
              onClick={() => handleTabClick("research")}
              className={activeTab === "research" ? "btn-xai-white" : "btn-xai-outline"}
            >
              {activeTab === "research" && (
                <span style={{
                  display: "inline-block",
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: "#10b981",
                  boxShadow: "0 0 6px #10b981",
                  marginRight: "8px"
                }} />
              )}
              MY RESEARCH ↗
            </button>
          </div>
        </div>

        {/* Bottom Elements Row */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
          marginTop: "3rem",
          zIndex: 2,
          gap: "16px"
        }}>
          <div /> {/* Left empty space to push chevron to exact center */}

          {/* Down arrow indicator */}
          <button
            onClick={scrollToHub}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--foreground)",
              cursor: "pointer",
              padding: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.7,
              transition: "opacity 0.3s ease, transform 0.3s ease",
              margin: "0 auto"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateY(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "0.7";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <polyline points="19 12 12 19 5 12"></polyline>
            </svg>
          </button>

          {/* NEURAL DOCUMENTATION link */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Link
              href="/neural-graph"
              className="btn-xai-outline"
              style={{
                padding: "8px 20px",
                fontSize: "0.75rem",
                letterSpacing: "0.1em",
                fontWeight: 600
              }}
            >
              NEURAL DOCUMENTATION ↗
            </Link>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="container" style={{ display: "flex", flexDirection: "column" }}>
        
        {/* Hero & About Section Removed */}
        <main style={{ flex: 1, padding: "3rem 0" }}>

          {/* Interactive Hub Section */}
          <section id="hub" className="animate-fade-in-up delay-100" style={{ scrollMarginTop: "100px" }}>
            


            {/* Dynamic Content Panel */}
            <div style={{ minHeight: "400px" }}>
              
              {/* TAB: NEURAL MAP */}
              {activeTab === "neural" && (
                <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
                  <NeuralNetworkChord />
                </div>
              )}
              



              {/* TAB: EDUCATION - SWAPPED ORDER WITH BEAUTIFUL CIRCULAR SVGs & DIRECT VERIFICATION LINKS */}
              {activeTab === "education" && (
                <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
                  <div className="timeline" style={{ padding: "10px 0 10px 32px" }}>
                    
                    {/* Education Item 1: BHU (Banaras Hindu University) */}
                    <div className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="glass-panel" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                          
                          {/* Beautiful Circular BHU Vector SVG Image */}
                          <div style={{
                            width: "54px",
                            height: "54px",
                            borderRadius: "14px",
                            background: "rgba(255, 255, 255, 0.95)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 6px 16px rgba(255, 128, 0, 0.12)",
                            border: "1px solid rgba(0, 0, 0, 0.08)",
                            padding: "2px",
                            flexShrink: 0
                          }}>
                            <img 
                              src="/bhu-logo-custom.png" 
                              alt="BHU Logo" 
                              style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Bachelor of Science (BS) in Mathematics</h3>
                              <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--secondary)", background: "rgba(6, 182, 212, 0.08)", padding: "4px 8px", borderRadius: "6px" }}>
                                2023 — Present
                              </span>
                            </div>
                            <h4 style={{ fontSize: "1rem", color: "var(--primary)", fontWeight: 500, marginBottom: "12px" }}>
                              Banaras Hindu University (BHU)
                            </h4>
                            <p style={{ color: "var(--slate-400)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "14px" }}>
                              Pursuing core theoretical mathematics, focusing heavily on algebraic structures, mathematical analysis, differential geometry, numerical analysis, data analysis, LaTeX typesetting, vector databases, and computational mathematics. Strengthening analytical problem-solving and rigorous scientific proofs.
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                              <div style={{ fontSize: "0.85rem", color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                <strong>Academic Track:</strong> Dual Degree • Core Mathematics Major
                              </div>
                              <a href="https://verify.bhu.ac.in/student/verify/eECba2CD-F10A-dF9F-7Aa0-C9a83f6b2CDc" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                                Verify Student Profile ↗
                              </a>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                    {/* Education Item 2: IITM (Indian Institute of Technology Madras - ONLINE) */}
                    <div className="timeline-item">
                      <div className="timeline-dot" />
                      <div className="glass-panel" style={{ padding: "24px" }}>
                        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
                          
                          {/* Official IITM Logo SVG Image */}
                          <div style={{
                            width: "54px",
                            height: "54px",
                            borderRadius: "14px",
                            background: "rgba(255, 255, 255, 0.95)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow: "0 6px 16px rgba(122, 28, 28, 0.12)",
                            border: "1px solid rgba(0, 0, 0, 0.08)",
                            padding: "2px",
                            flexShrink: 0
                          }}>
                            <img 
                              src="/iitm-logo.svg" 
                              alt="IITM Logo" 
                              style={{ width: "100%", height: "100%", objectFit: "contain" }} 
                            />
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "8px" }}>
                              <h3 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Bachelor of Science (BS) in Data Science & Applications (Online)</h3>
                              <span style={{ fontSize: "0.85rem", fontFamily: "var(--font-mono)", color: "var(--secondary)", background: "rgba(6, 182, 212, 0.08)", padding: "4px 8px", borderRadius: "6px" }}>
                                2023 — Present
                              </span>
                            </div>
                            <h4 style={{ fontSize: "1rem", color: "var(--primary)", fontWeight: 500, marginBottom: "12px" }}>
                              Indian Institute of Technology Madras (IITM) (Online)
                            </h4>
                            <p style={{ color: "var(--slate-400)", fontSize: "0.9rem", lineHeight: 1.5, marginBottom: "14px" }}>
                              Pursuing a rigorous program specializing in Machine Learning, Statistical Modeling, Big Data Analytics, Database Management, Algebra, Calculus, and programming frameworks. Gaining deep hands-on expertise in algorithm construction, data processing pipelines, and AI systems.
                            </p>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                              <div style={{ fontSize: "0.85rem", color: "var(--foreground)", fontFamily: "var(--font-mono)" }}>
                                <strong>Academic Track:</strong> Dual Degree • Diploma Level (Diploma in Programming) (Online)
                              </div>
                              <a href="https://ds.study.iitm.ac.in/student/24F2001627" target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: "4px", color: "var(--primary)", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
                                Verify Student Profile ↗
                              </a>
                            </div>
                          </div>

                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: CERTIFICATES */}
              {activeTab === "certificates" && (
                <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
                  <div className="cards-grid">
                    {CERTS.map((cert) => (
                      <div
                        key={cert.url}
                        className="glass-panel"
                        style={{
                          padding: "20px 22px",
                          borderRadius: "16px",
                          display: "flex",
                          gap: "14px",
                          alignItems: "flex-start",
                          transition: "transform 0.22s ease, box-shadow 0.22s ease",
                          borderTop: `2px solid ${cert.color}28`,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                          (e.currentTarget as HTMLElement).style.boxShadow = `0 16px 40px -8px ${cert.color}28`;
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.transform = "";
                          (e.currentTarget as HTMLElement).style.boxShadow = "";
                        }}
                      >
                        {/* Icon */}
                        <div
                          style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "12px",
                            background: cert.iconBg,
                            border: `1px solid ${cert.color}22`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {cert.icon}
                        </div>

                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3 style={{ fontSize: "0.87rem", fontWeight: 650, color: "var(--foreground)", margin: "0 0 3px", lineHeight: 1.4 }}>
                            {cert.title}
                          </h3>
                          <p style={{ color: "var(--slate-400)", fontSize: "0.76rem", margin: "0 0 4px" }}>
                            {cert.issuer} · {cert.year}
                          </p>
                          {cert.desc && (
                            <p style={{ color: "var(--slate-400)", fontSize: "0.72rem", margin: "0 0 10px", lineHeight: 1.5, opacity: 0.8 }}>
                              {cert.desc}
                            </p>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                            <span
                              style={{
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                background: `${cert.color}15`,
                                color: cert.color,
                                border: `1px solid ${cert.color}25`,
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                              }}
                            >
                              {cert.platform}
                            </span>
                            <a
                              href={cert.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "0.73rem",
                                color: "var(--primary)",
                                fontWeight: 500,
                                textDecoration: "none",
                              }}
                            >
                              View Certificate ↗
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: SOCIALS - WITH DIRECT ACADEMIC AND PERSONAL EMAILS */}
              {activeTab === "socials" && (
                <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>
                  
                  <div style={{ textAlign: "center", maxWidth: "600px", margin: "0 auto 1.5rem auto" }}>
                    <p style={{ color: "var(--slate-400)", fontSize: "0.95rem", lineHeight: 1.6 }}>
                      Let's sync up! I am actively engaged across multiple engineering and computational platforms. Explore my technical profiles below:
                    </p>
                  </div>

                  <div className="socials-grid" style={{ marginBottom: "3rem" }}>
                    
                    {/* GitHub (Sleek Charcoal) */}
                    <a href="https://github.com/quashanshayan123ansari" target="_blank" rel="noopener noreferrer" className="glass-panel social-btn social-github">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" fill="#181717" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>GitHub</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.8, fontFamily: "var(--font-mono)" }}>@quashanshayan123ansari</div>
                      </div>
                    </a>

                    {/* LinkedIn (Rich Brand Blue) */}
                    <a href="https://www.linkedin.com/in/mqansari123" target="_blank" rel="noopener noreferrer" className="glass-panel social-btn social-linkedin">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0z" fill="#0A66C2" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>LinkedIn</div>
                        <div style={{ fontSize: "0.75rem", opacity: 0.8, fontFamily: "var(--font-mono)" }}>@mqansari123</div>
                      </div>
                    </a>

                    {/* Kaggle (Brilliant Cyan) */}
                    <a href="https://www.kaggle.com/quashanshayan123ansari" target="_blank" rel="noopener noreferrer" className="glass-panel social-btn social-kaggle">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M19 2.25L11.5 12l7.5 9.75h-3.75L8.75 13.5v8.25H5.5V2.25h3.25v9L15.25 2.25H19z" fill="#20BEFF" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>Kaggle</div>
                      </div>
                    </a>

                    {/* LeetCode (Vibrant Orange) */}
                    <a href="https://leetcode.com/u/quashanshayan123ansari/" target="_blank" rel="noopener noreferrer" className="glass-panel social-btn social-leetcode">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path fillRule="evenodd" clipRule="evenodd" d="M13.483 0a1.374 1.374 0 0 0-.961.411L7.11 5.823a1.372 1.372 0 0 0-.025 1.917l.025.026a1.372 1.372 0 0 0 1.917.025l5.228-5.011a1.372 1.372 0 0 0-.025-1.917L13.483 0zm5.111 8.248a1.375 1.375 0 0 0-1.917-.025L11.45 13.234a1.372 1.372 0 0 0-.025 1.917l.025.026a1.372 1.372 0 0 0 1.917.025l5.228-5.011a1.372 1.372 0 0 0-.025-1.917l-.001-.026zm-7.618 6.47l-1.637 1.637a1.372 1.372 0 0 1-1.94 0l-4.26-4.26a1.372 1.372 0 0 1 0-1.94l6.197-6.197c.536-.536 1.405-.536 1.94 0l1.638 1.637c.536.536.536 1.405 0 1.94l-5.228 5.228a1.372 1.372 0 0 0 0 1.94l3.29 3.29c.536.536.536 1.405 0 1.94l-.001.002z" fill="#FFA116" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>LeetCode</div>
                      </div>
                    </a>

                    {/* HackerRank (Vibrant Green Block) */}
                    <a href="https://www.hackerrank.com/profile/quashanshayan123ansari" target="_blank" rel="noopener noreferrer" className="glass-panel social-btn social-hackerrank">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <rect width="24" height="24" rx="5" fill="#2EC866" />
                        <path d="M7 6h2.5v4h3V6H15v12h-2.5v-4.5h-3V18H7V6z" fill="#FFF" />
                      </svg>
                      <div>
                        <div style={{ fontWeight: 600 }}>HackerRank</div>
                      </div>
                    </a>

                  </div>

                  {/* Elegant Separator */}
                  <hr style={{ border: 0, height: "1px", background: "linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.08) 50%, transparent)", margin: "2rem 0" }} />

                  {/* Direct Contact Channels Section */}
                  <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                    <h3 className="gradient-text" style={{ fontSize: "1.4rem", fontWeight: 700 }}>Direct Channels</h3>
                    <p style={{ color: "var(--slate-400)", fontSize: "0.95rem", marginTop: "4px" }}>Reach out directly via email</p>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap", maxWidth: "830px", margin: "0 auto" }}>
                    <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", width: "100%", maxWidth: "390px", flex: "1 1 300px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "rgba(79, 70, 229, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(79, 70, 229, 0.15)",
                        flexShrink: 0
                      }}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--primary)" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--slate-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Personal Email</div>
                        <a href="mailto:quashanshayan123@gmail.com" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--slate-900)", textDecoration: "none", wordBreak: "break-all" }}>
                          quashanshayan123@gmail.com
                        </a>
                      </div>
                    </div>

                    <div className="glass-panel" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: "16px", width: "100%", maxWidth: "390px", flex: "1 1 300px" }}>
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "10px",
                        background: "rgba(6, 182, 212, 0.08)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(6, 182, 212, 0.15)",
                        flexShrink: 0
                      }}>
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="var(--secondary)" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--slate-400)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Contact Email</div>
                        <a href="mailto:mdquashan7497@gmail.com" style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--slate-900)", textDecoration: "none", wordBreak: "break-all" }}>
                          mdquashan7497@gmail.com
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: COMPANY PERFORMANCE */}
              {activeTab === "corporate" && (
                <FinanceDashboard 
                  defaultTab="corporate" 
                  allowedTabs={["corporate", "dmart"]} 
                  title="Corporate Performance Dashboard"
                  subtitle="Enterprise financial metrics and trends reconstructed from actual performance datasets."
                />
              )}

              {/* TAB: FINANCE (FINANCIAL ANALYTICS) */}
              {activeTab === "finance" && (
                <FinanceDashboard 
                  defaultTab="wealth" 
                  allowedTabs={["wealth", "optimization"]} 
                  title="Financial Analytics & Optimization"
                  subtitle="Interactive Modern Portfolio Theory (MPT) simulator combined with a stochastic Monte Carlo wealth projector. Adjust weights manually or run advanced mathematical optimizations."
                />
              )}

              {/* TAB: RESEARCH PAPERS */}
              {activeTab === "research" && (
                <div style={{ animation: "fadeInUp 0.5s ease forwards" }}>

                  {/* Section header */}
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "1.75rem" }}>
                    <div style={{
                      width: "42px", height: "42px", borderRadius: "12px",
                      background: "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.15))",
                      border: "1px solid rgba(16,185,129,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <div>
                      <h2 style={{ fontSize: "1.35rem", fontWeight: 700, margin: 0, color: "var(--foreground)" }}>My Research Papers</h2>
                      <p style={{ color: "var(--slate-400)", fontSize: "0.78rem", margin: 0 }}>Peer-reviewed academic publications · Quantitative Finance & Mathematics</p>
                    </div>
                  </div>

                  {/* Paper card */}
                  <div className="glass-panel" style={{
                    padding: "28px 32px", borderRadius: "20px",
                    position: "relative", overflow: "hidden",
                    borderLeft: "4px solid #06b6d4",
                  }}>
                    <div style={{
                      position: "absolute", top: "-40px", right: "-40px",
                      width: "220px", height: "220px",
                      background: "radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)",
                      pointerEvents: "none",
                    }}/>

                    {/* Badges */}
                    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "14px" }}>
                      {[
                        { label: "✦ Published · May 2026", bg: "rgba(6,182,212,0.12)", color: "#06b6d4", border: "rgba(6,182,212,0.25)" },
                        { label: "Peer Reviewed", bg: "rgba(16,185,129,0.12)", color: "#10b981", border: "rgba(16,185,129,0.25)" },
                        { label: "DOI: 10.2139/ssrn.6692678", bg: "rgba(139,92,246,0.12)", color: "#8b5cf6", border: "rgba(139,92,246,0.25)" },
                      ].map(b => (
                        <span key={b.label} style={{
                          fontSize: "0.68rem", fontWeight: 700, padding: "4px 12px", borderRadius: "20px",
                          background: b.bg, color: b.color, border: `1px solid ${b.border}`,
                          textTransform: "uppercase" as const, letterSpacing: "0.06em",
                        }}>{b.label}</span>
                      ))}
                    </div>

                    <h3 style={{ fontSize: "1.1rem", fontWeight: 750, color: "var(--foreground)", margin: "0 0 10px", lineHeight: 1.45, letterSpacing: "-0.01em" }}>
                      Beyond Markowitz: Evaluating Maximum Diversification in Multi-Asset Portfolios Under Stressed Market Conditions
                    </h3>
                    <p style={{ color: "var(--foreground)", fontSize: "0.83rem", margin: "0 0 3px", fontWeight: 600 }}>
                      Mohammad Quashan Ansari, Dr. Pankaj
                    </p>
                    <p style={{ color: "var(--slate-400)", fontSize: "0.79rem", margin: "0 0 3px", fontStyle: "italic" }}>
                      Department of Mathematics, Banaras Hindu University (BHU), Varanasi
                    </p>
                    <p style={{ color: "var(--primary)", fontSize: "0.79rem", margin: "0 0 16px", fontWeight: 500 }}>
                      International Journal of Research Publication and Reviews · May 2026
                    </p>

                    <div style={{ background: "rgba(0,0,0,0.03)", borderRadius: "12px", padding: "14px 16px", marginBottom: "14px", borderLeft: "3px solid rgba(6,182,212,0.3)" }}>
                      <p style={{ color: "var(--slate-400)", fontSize: "0.82rem", lineHeight: 1.75, margin: 0 }}>
                        <strong style={{ color: "var(--foreground)", fontSize: "0.72rem", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Abstract — </strong>
                        Investigates the limitations of Markowitz&apos;s Mean-Variance Optimization (MVO) — its sensitivity to estimation errors and instability during stressed market regimes — and evaluates Maximum Diversification (MD) portfolios as a robust alternative. Using data from the COVID-19 pandemic, the Russia-Ukraine conflict, and global interest rate tightening cycles, the study analyzes five major asset classes through Diversification Ratio, Sharpe Ratio, and realized volatility.
                      </p>
                    </div>

                    {/* Keywords */}
                    <div style={{ display: "flex", gap: "7px", flexWrap: "wrap", marginBottom: "16px" }}>
                      {["Portfolio Optimization", "Maximum Diversification", "Markowitz MVO", "Quantitative Finance", "Market Stress", "Sharpe Ratio"].map(kw => (
                        <span key={kw} style={{
                          fontSize: "0.68rem", padding: "3px 10px", borderRadius: "20px",
                          background: "rgba(6,182,212,0.08)", color: "var(--primary)",
                          border: "1px solid rgba(6,182,212,0.18)", fontWeight: 500,
                        }}>{kw}</span>
                      ))}
                    </div>

                    {/* Links */}
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", paddingTop: "14px", borderTop: "1px solid rgba(0,0,0,0.07)" }}>
                      {[
                        { label: "SSRN Abstract", href: "https://ssrn.com/abstract=6692678", c: "#a855f7", b: "rgba(168,85,247,0.10)", br: "rgba(168,85,247,0.25)" },
                        { label: "DOI Link", href: "https://doi.org/10.2139/ssrn.6692678", c: "#06b6d4", b: "rgba(6,182,212,0.10)", br: "rgba(6,182,212,0.25)" },
                        { label: "LinkedIn", href: "https://www.linkedin.com/in/mqansari123", c: "#0a66c2", b: "rgba(10,102,194,0.10)", br: "rgba(10,102,194,0.25)" },
                      ].map(lk => (
                        <a key={lk.label} href={lk.href} target="_blank" rel="noopener noreferrer" style={{
                          display: "inline-flex", alignItems: "center", gap: "5px",
                          padding: "7px 14px", borderRadius: "10px",
                          background: lk.b, color: lk.c, border: `1px solid ${lk.br}`,
                          fontSize: "0.76rem", fontWeight: 600, textDecoration: "none",
                          transition: "opacity 0.2s ease",
                        }}>{lk.label} ↗</a>
                      ))}
                    </div>
                  </div>

                  {/* Coming soon */}
                  <div style={{
                    marginTop: "14px", padding: "18px 24px", borderRadius: "14px",
                    background: "rgba(6,182,212,0.04)", border: "1px dashed rgba(6,182,212,0.25)",
                    display: "flex", alignItems: "center", gap: "14px",
                  }}>
                    <div style={{
                      width: "34px", height: "34px", borderRadius: "9px",
                      background: "rgba(6,182,212,0.10)", border: "1px solid rgba(6,182,212,0.2)",
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: "0.85rem", margin: "0 0 2px", color: "var(--foreground)" }}>More research in progress</p>
                      <p style={{ color: "var(--slate-400)", fontSize: "0.78rem", margin: 0 }}>Ongoing work in stochastic processes, options pricing models & algorithmic trading at BHU.</p>
                    </div>
                  </div>

                </div>
              )}
            </div>

          </section>

        </main>

        {/* Footer */}
        <footer>
          <p>© {new Date().getFullYear()} Mohammad Quashan. Designed & built by Mohammad Quashan. All Rights Reserved.</p>
        </footer>

      </div>
    </div>
  );
}
