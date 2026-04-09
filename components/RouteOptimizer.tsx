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
}

interface OptimizeResult {
  route: RouteStop[];
  totalDistance: number;
  estimatedDuration: number;
}

export default function RouteOptimizer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  // 🔥 carregar histórico ao abrir
  useEffect(() => {
    const saved = localStorage.getItem("route_history");
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  // 🔥 salvar no histórico
  const saveToHistory = (data: string) => {
    const updated = [data, ...history].slice(0, 5);
    setHistory(updated);
    localStorage.setItem("route_history", JSON.stringify(updated));
  };

  const handleOptimize = async () => {
    const lines = input.split("\n").filter((l) => l.trim());

    if (lines.length < 2) return;

    const res = await fetch("https://routeasy-backend.onrender.com/optimize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addresses: lines }),
    });

    const data = await res.json();

    setResult(data);
    saveToHistory(input);
  };

  const mapLocations = result?.route ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.container}>

        {/* 🔹 PAINEL */}
        <div className={styles.panel}>
          <div className={styles.inputSection}>

            <textarea
              className={styles.textarea}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite endereços..."
            />

            <button className={styles.button} onClick={handleOptimize}>
              Otimizar Rota
            </button>

            {/* 🔥 HISTÓRICO */}
            {history.length > 0 && (
              <div>
                <h4 style={{ marginTop: 16 }}>Histórico</h4>

                {history.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 8,
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
                  style={{
                    marginTop: 10,
                    fontSize: 12,
                    color: "red"
                  }}
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

        {/* 🔹 MAPA */}
        <div className={styles.mapPanel}>
          <MapView locations={mapLocations} />
        </div>
      </div>
    </div>
  );
}