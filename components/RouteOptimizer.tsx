"use client";

import { useState } from "react";
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
  const [slowMsg, setSlowMsg] = useState(false);

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
      setError("Por favor, insira no máximo 50 endereços por vez.");
      return;
    }

    setLoading(true);
    setSlowMsg(false);
    const slowTimer = setTimeout(() => setSlowMsg(true), 8000);

    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addresses: lines }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Erro ao otimizar rota.");
        return;
      }

      setResult(data);
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      clearTimeout(slowTimer);
      setSlowMsg(false);
      setLoading(false);
    }
  };

  // 🔥 ÚNICA ADIÇÃO (LÓGICA DE TEMPO)
  const formatDuration = (minutes: number) => {
    const total = Math.round(minutes);
    const h = Math.floor(total / 60);
    const m = total % 60;

    if (h === 0) return `${m} min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const openGoogleMaps = () => {
    if (!result?.route) return;

    const url =
      "https://www.google.com/maps/dir/" +
      result.route.map((s) => `${s.lat},${s.lng}`).join("/");

    window.open(url, "_blank");
  };

  const openWaze = () => {
    if (!result?.route) return;

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

              {error && <div className={styles.error}>{error}</div>}

              {result && result.route.length >= 2 && (
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
                    <button
                      onClick={openGoogleMaps}
                      style={{
                        background: "#34A853",
                        color: "#fff",
                        padding: "10px 16px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      📍 Abrir com Google Maps
                    </button>

                    <button
                      onClick={openWaze}
                      style={{
                        background: "#1F9DE7",
                        color: "#fff",
                        padding: "10px 16px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      🚗 Abrir com Waze
                    </button>
                  </div>
                </>
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