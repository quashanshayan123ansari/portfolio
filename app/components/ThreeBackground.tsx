"use client";

interface ThreeBackgroundProps {
  activeTab?: string;
}

export default function ThreeBackground({ activeTab = "projects" }: ThreeBackgroundProps) {
  return (
    <div
      className={`glow-${activeTab}`}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
        background: "var(--background)",
        overflow: "hidden",
        transition: "background 1s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      {/* High-performance glowing background container and divs */}
      <div className="xai-glow-container">
        <div className="xai-glow-amber" />
        <div className="xai-glow-white" />
      </div>
    </div>
  );
}
