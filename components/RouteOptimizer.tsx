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
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const processFile = (file: File) => {
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
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
      <main className={styles.main}>
        <div className={styles.container}>

          {/* 🔹 PAINEL ESQUERDO */}
          <div className={styles.panel}>
            <div className={styles.inputSection}>

              {/* 🔥 DRAG + TEXTAREA */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                style={{
                  border: dragActive ? "2px dashed #4f8cff" : "2px dashed #ccc",
                  borderRadius: 8,
                  padding: 10,
                  transition: "0.2s",
                  background: dragActive ? "rgba(79,140,255,0.1)" : "transparent"
                }}
              >
                <textarea
                  className={styles.textarea}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  rows={8}
                />
              </div>

              <button className={styles.button} onClick={handleOptimize}>
                {loading ? "Calculando..." : "Otimizar Rota"}
              </button>

              {/* 🔥 UPLOAD */}
              <p className={styles.helperText}>
                Ou arraste um arquivo CSV aqui ou clique abaixo para carregar:
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

              {result?.route?.length >= 2 && (
                <>
                  <div className={styles.stats}>
                    <div>
                      <strong>{result.totalDistance.toFixed(2)} km</strong>
                      <p>Distância</p>
                    </div>
                    <div>
                      <strong>{formatDuration(result.estimatedDuration)}</strong>
                      <p>Tempo</p>
                    </div>
                    <div>
                      <strong>{result.route.length}</strong>
                      <p>Paradas</p>
                    </div>
                  </div>

                  <div className={styles.buttonsRow}>
                    <button onClick={openGoogleMaps}>📍 Google Maps</button>
                    <button onClick={openWaze}>🚗 Waze</button>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* 🔹 MAPA */}
          <div className={styles.mapPanel}>
            <MapView locations={mapLocations} />
          </div>

        </div>
      </main>
    </div>
  );
}