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

const EXAMPLE_ADDRESSES = `Rua A, São Paulo\nAv. Paulista, 1000, São Paulo\nAeroporto de Guarulhos, SP`;

export default function RouteOptimizer() {
  const [input, setInput] = useState(EXAMPLE_ADDRESSES);
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // 🔥 carregar histórico
  useEffect(() => {
    const saved = localStorage.getItem("route_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 🔥 salvar histórico
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

    setLoading(true);

    try {
      const res = await fetch("https://routeasy-backend.onrender.com/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: lines }),
      });

      const data = await res.json();

      setResult({
        route: Array.isArray(data.route) ? data.route : [],
        invalidAddresses: Array.isArray(data.invalidAddresses) ? data.invalidAddresses : [],
        totalDistance: data.totalDistance ?? 0,
        estimatedDuration: data.estimatedDuration ?? 0,
      });

      saveToHistory(input);

    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
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
    const url = `https://waze.com/ul?ll=${first.lat},${first.lng}&navigate=yes`;

    window.open(url, "_blank");
  };

  const mapLocations = result?.route ?? [];

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>⏱️Caro's Route Planner</div>
          <p className={styles.tagline}>
            Encontre a ordem mais eficiente para suas paradas
          </p>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.container}>

          {/* 🔹 PAINEL ORIGINAL */}
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
                {loading ? "Calculando..." : "Otimizar Rota"}
              </button>

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

              {/* 🔥 HISTÓRICO (SEM QUEBRAR LAYOUT) */}
              {history.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>Histórico:</strong>

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
                    style={{ marginTop: 8, fontSize: 12 }}
                    onClick={() => {
                      setHistory([]);
                      localStorage.removeItem("route_history");
                    }}
                  >
                    Limpar histórico
                  </button>
                </div>
              )}

              {result?.route?.length >= 2 && (
                <>
                  <div className={styles.stats}>
                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {result.totalDistance.toFixed(2)} km
                      </span>
                      <span className={styles.statLabel}>Distância Total</span>
                    </div>

                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {formatDuration(result.estimatedDuration)}
                      </span>
                      <span className={styles.statLabel}>Tempo Estimado</span>
                    </div>

                    <div className={styles.stat}>
                      <span className={styles.statValue}>
                        {result.route.length}
                      </span>
                      <span className={styles.statLabel}>Paradas</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 15 }}>
                    <button onClick={openGoogleMaps}>📍 Google Maps</button>
                    <button onClick={openWaze}>🚗 Waze</button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 🔹 MAPA (NÃO MEXER) */}
          <div className={styles.mapPanel}>
            <MapView locations={mapLocations} />
          </div>

        </div>
      </main>
    </div>
  );
}