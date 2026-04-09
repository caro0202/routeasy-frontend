"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import styles from "./RouteOptimizer.module.css";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

interface RouteStop {
  address: string;
  lat: number;
  lng: number;
  stopIndex: number;
  distanceToNext: number | null;
}

interface OptimizeResult {
  route: RouteStop[];
  invalidAddresses: string[];
  totalDistance: number;
  estimatedDuration: number;
}

const EXAMPLE_ADDRESSES = `Rua A, São Paulo
Av. Paulista, 1000, São Paulo
Aeroporto de Guarulhos, SP`;

export default function RouteOptimizer() {
  const [input, setInput] = useState(EXAMPLE_ADDRESSES);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [slowMsg, setSlowMsg] = useState(false);
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;

      const lines = text
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      setInput(lines.join("\n"));
    };

    reader.readAsText(file);
  };

  const handleOptimize = async () => {
    setError(null);
    setResult(null);

    const lines = input
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      setError("Por favor, insira pelo menos 2 endereços.");
      return;
    }

    if (lines.length > 50) {
      setError("Por favor, insira no máximo 50 endereços.");
      return;
    }

    setLoading(true);
    setSlowMsg(false);
    const slowTimer = setTimeout(() => setSlowMsg(true), 8000);

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

      setResult({
        route: data.route || [],
        invalidAddresses: data.invalidAddresses || [],
        totalDistance: data.totalDistance || 0,
        estimatedDuration: data.estimatedDuration || 0
      });

      saveToHistory(input);

    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      clearTimeout(slowTimer);
      setSlowMsg(false);
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;

    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const openGoogleMaps = () => {
    if (!result?.route?.length) return;

    const url =
      "https://www.google.com/maps/dir/" +
      result.route.map((s) => `${s.lat},${s.lng}`).join("/");

    window.open(url, "_blank");
  };

  const openWaze = () => {
    if (!result?.route?.length) return;

    const first = result.route[0];
    window.open(`https://waze.com/ul?ll=${first.lat},${first.lng}&navigate=yes`, "_blank");
  };

  const mapLocations = result?.route ?? [];

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

              <label className={styles.label}>
                Insira os endereços na caixa abaixo e clique "Otimizar Rota":
              </label>

              <textarea
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
              />

              <button className={styles.button} onClick={handleOptimize}>
                {loading ? (slowMsg ? "Aguardando servidor..." : "Calculando...") : "Otimizar Rota"}
              </button>

              {/* CSV RESTAURADO */}
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
              {result?.route?.length >= 2 && (
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
                        {formatDuration(result.estimatedDuration)}
                      </span>
                      <span className={styles.statLabel}>Tempo</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={openGoogleMaps}>Google Maps</button>
                    <button onClick={openWaze}>Waze</button>
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
            <MapView locations={mapLocations} />
          </div>

        </div>
      </main>
    </div>
  );
}