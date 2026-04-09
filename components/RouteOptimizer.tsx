"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./RouteOptimizer.module.css";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

interface RouteStop {
  address: string;
  lat: number;
  lng: number;
}

export default function RouteOptimizer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("route_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const saveToHistory = (data: string) => {
    const updated = [data, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("route_history", JSON.stringify(updated));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map(l => l.trim()).filter(l => l);
      setInput(lines.join("\n"));
    };
    reader.readAsText(file);
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

      if (!res.ok) {
        setError("Erro ao otimizar rota.");
        return;
      }

      const route = Array.isArray(data.route) ? data.route : [];

      if (route.length < 2) {
        setError("Nenhuma rota válida encontrada.");
        return;
      }

      setResult({
        route,
        distance: Number(data.totalDistance) || 0,
        duration: Number(data.estimatedDuration) || 0
      });

      saveToHistory(input);

    } catch {
      setError("Erro de conexão com servidor.");
    } finally {
      setLoading(false);
    }
  };

  const openGoogleMaps = () => {
    if (!result?.route?.length) return;

    const url =
      "https://www.google.com/maps/dir/" +
      result.route.map((p: RouteStop) => `${p.lat},${p.lng}`).join("/");

    window.open(url, "_blank");
  };

  const openWaze = () => {
    if (!result?.route?.length) return;

    const first = result.route[0];
    window.open(`https://waze.com/ul?ll=${first.lat},${first.lng}&navigate=yes`, "_blank");
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>⏱️ Caro's Route Planner</div>
          <p className={styles.tagline}>
            Encontre a ordem mais eficiente para suas paradas
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>

          <div className={styles.panel}>
            <div className={styles.inputSection}>

              <label className={styles.label} style={{ fontWeight: 400 }}>
                Insira os endereços abaixo e clique em <strong>Otimizar Rota</strong>
              </label>

              <textarea
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
              />

              <button className={styles.button} onClick={handleOptimize}>
                {loading ? "Calculando..." : "Otimizar Rota"}
              </button>

              {/* CSV */}
              <p className={styles.helperText}>
                Ou carregue um arquivo CSV com vários endereços:
              </p>

              <label className={styles.uploadBtn}>
                📁 Carregar CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  hidden
                />
              </label>

              {fileName && <p className={styles.fileName}>{fileName}</p>}

              {error && <div className={styles.error}>{error}</div>}

              {/* RESULTADO */}
              {result && (
                <>
                  <div className={styles.stats}>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {result.distance.toFixed(2)} km
                      </span>
                    </div>

                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {Math.round(result.duration)} min
                      </span>
                    </div>
                  </div>

                  {/* BOTÕES BONITOS */}
                  <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                    <button
                      className={styles.button}
                      style={{ background: "#34A853" }}
                      onClick={openGoogleMaps}
                    >
                      📍 Abrir no Maps
                    </button>

                    <button
                      className={styles.button}
                      style={{ background: "#1F9DE7" }}
                      onClick={openWaze}
                    >
                      🚗 Abrir no Waze
                    </button>
                  </div>
                </>
              )}

              {/* HISTÓRICO */}
              {history.length > 0 && (
                <div style={{ marginTop: 12 }}>
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

                  <button
                    style={{ marginTop: 6, fontSize: 12 }}
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem("route_history");
                    }}
                  >
                    Limpar histórico
                  </button>
                </div>
              )}

            </div>
          </div>

          <div className={styles.mapPanel}>
            <MapView locations={result?.route || []} />
          </div>

        </div>
      </main>
    </div>
  );
}