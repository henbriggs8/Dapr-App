import { useEffect, useState } from "react";
import { onBootStage } from "@/lib/boot-debug";

interface StageEntry {
  ts: string;
  stage: string;
  detail?: string;
  ok: boolean;
}

const IS_IOS = typeof window !== "undefined" && window.location.protocol === "capacitor:";

export function IosDebugOverlay() {
  const [entries, setEntries] = useState<StageEntry[]>([]);
  const [visible, setVisible] = useState(true);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    if (!IS_IOS) return;
    const unsub = onBootStage((stage, detail) => {
      const ts = new Date().toISOString().slice(11, 19);
      const ok = !stage.includes("fail") && !stage.includes("timeout") && !stage.includes("error");
      setEntries(prev => [...prev, { ts, stage, detail, ok }]);
    });
    return unsub;
  }, []);

  // Hidden on desktop — only shows on capacitor:// protocol
  if (!IS_IOS) return null;
  if (!visible) {
    // Small tap target to re-open
    return (
      <button
        onClick={() => setVisible(true)}
        style={{
          position: "fixed", bottom: 90, right: 12, zIndex: 999999,
          background: "#8c52ff", color: "#fff", border: "none",
          borderRadius: 20, padding: "6px 12px", fontSize: 11, opacity: 0.85,
        }}
      >
        Debug
      </button>
    );
  }

  const hasFailed = entries.some(e => !e.ok);
  const isReady = entries.some(e => e.stage === "ready");

  return (
    <div
      style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 999999,
        background: "rgba(0,0,0,0.92)", color: "#d4d4d4",
        fontFamily: "Menlo, monospace", fontSize: 11,
        paddingTop: 52, paddingBottom: 8, maxHeight: "55vh", overflowY: "auto",
        borderBottom: `2px solid ${hasFailed ? "#ef4444" : isReady ? "#22c55e" : "#8c52ff"}`,
      }}
    >
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, background: "rgba(0,0,0,0.95)",
        padding: "4px 12px 4px 12px", display: "flex", justifyContent: "space-between",
        alignItems: "center", borderBottom: "1px solid #333",
      }}>
        <span style={{ color: "#8c52ff", fontWeight: "bold" }}>
          🔍 iOS Boot Log {hasFailed ? "❌" : isReady ? "✅" : "⏳"}
        </span>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => setEntries([])}
            style={{ color: "#888", background: "none", border: "none", fontSize: 11, cursor: "pointer" }}
          >
            Clear
          </button>
          <button
            onClick={() => setVisible(false)}
            style={{ color: "#888", background: "none", border: "none", fontSize: 13, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Stage list */}
      <div style={{ padding: "4px 12px" }}>
        {entries.length === 0 && (
          <div style={{ color: "#666", padding: "8px 0" }}>Waiting for boot events…</div>
        )}
        {entries.map((e, i) => (
          <div key={i} style={{ padding: "2px 0", color: e.ok ? "#86efac" : "#f87171", lineHeight: 1.4 }}>
            <span style={{ color: "#666" }}>{e.ts} </span>
            <span style={{ color: e.ok ? "#86efac" : "#f87171" }}>{e.stage}</span>
            {e.detail && <span style={{ color: "#a3a3a3" }}> — {e.detail}</span>}
          </div>
        ))}
      </div>

      {/* Retry button on failure */}
      {hasFailed && (
        <div style={{ padding: "8px 12px" }}>
          <button
            onClick={() => window.location.reload()}
            style={{
              background: "#8c52ff", color: "#fff", border: "none",
              borderRadius: 8, padding: "8px 20px", fontSize: 13, cursor: "pointer", width: "100%",
            }}
          >
            Retry (reload app)
          </button>
        </div>
      )}
    </div>
  );
}
