"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./RouteOptimizer.module.css";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function RouteOptimizer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("route_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (data: string) => {
    const updated = [data, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("route_history", JSON.stringify(updated));
  };

  const handleOptimize = async () => {
    setLoading(true);
    setError("");
    setResult(null);

    const lines = input.split("\n").filter(l => l.trim());

    try {
      const res = await fetch("https://routeasy-backend.onrender.com/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ addresses: lines })
      });

      const data = await res.json();

      console.log("RESPONSE:", data);

      if (!res.ok) {
        setError("Erro ao otimizar rota.");
        return;
      }

      // 🔥 AJUSTE CRÍTICO
      const safeResult = {
        route: Array.isArray(data.route) ? data.route : [],
        totalDistance: Number(data.totalDistance) || 0,
        estimatedDuration: Number(data.estimatedDuration) || 0,
      };

      if (safeResult.route.length < 2) {
        setError("Nenhuma rota válida encontrada.");
        return;
      }

      setResult(safeResult);

      saveToHistory(input);

    } catch (e) {
      console.error(e);
      setError("Erro de conexão com servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        <div className={styles.panel}>
          <div className={styles.inputSection}>

            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite endereços..."
            />

            <button className={styles.button} onClick={handleOptimize}>
              {loading ? "Calculando..." : "Otimizar Rota"}
            </button>

            {error && <div className={styles.error}>{error}</div>}

            {/* 🔥 RESULTADO */}
            {result && result.route.length > 1 && (
              <>
                <div className={styles.stats}>
                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {result.totalDistance.toFixed(2)} km
                    </span>
                    <span className={styles.statLabel}>Distância</span>
                  </div>

                  <div className={styles.stat}>
                    <span className={styles.statValue}>
                      {Math.round(result.estimatedDuration)} min
                    </span>
                    <span className={styles.statLabel}>Tempo</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() =>
                      window.open(
                        "https://www.google.com/maps/dir/" +
                          result.route.map((p: any) => `${p.lat},${p.lng}`).join("/"),
                        "_blank"
                      )
                    }
                  >
                    Google Maps
                  </button>

                  <button
                    onClick={() =>
                      window.open(
                        `https://waze.com/ul?ll=${result.route[0].lat},${result.route[0].lng}&navigate=yes`,
                        "_blank"
                      )
                    }
                  >
                    Waze
                  </button>
                </div>
              </>
            )}

            {/* HISTÓRICO */}
            {history.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <strong>Histórico</strong>
                {history.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 12,
                      padding: 6,
                      border: "1px solid #ddd",
                      borderRadius: 6,
                      marginTop: 6,
                      cursor: "pointer"
                    }}
                    onClick={() => setInput(item)}
                  >
                    {item.split("\n")[0]}...
                  </div>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* 🔥 MAPA */}
        <div className={styles.mapPanel}>
          <MapView locations={result?.route || []} />
        </div>

      </div>
    </div>
  );
}