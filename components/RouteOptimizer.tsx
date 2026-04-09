"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import styles from "./RouteOptimizer.module.css";

const MapView = dynamic(() => import("./MapView"), { ssr: false });

export default function RouteOptimizer() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleOptimize = async () => {
    setError(null);
    setResult(null);

    const lines = input.split("\n").filter((l) => l.trim());

    try {
      const res = await fetch("https://routeasy-backend.onrender.com/optimize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ addresses: lines })
      });

      const data = await res.json();

      console.log("API RESPONSE:", data); // 🔥 DEBUG

      if (!res.ok) {
        setError("Erro ao otimizar rota.");
        return;
      }

      setResult(data);

    } catch {
      setError("Erro ao conectar ao servidor.");
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
              placeholder="Digite os endereços..."
            />

            <button className={styles.button} onClick={handleOptimize}>
              Otimizar Rota
            </button>

            {error && <div className={styles.error}>{error}</div>}

            {/* 🔥 DEBUG VISUAL */}
            {result && (
              <pre style={{ fontSize: 12, marginTop: 10 }}>
                {JSON.stringify(result, null, 2)}
              </pre>
            )}

          </div>
        </div>

        <div className={styles.mapPanel}>
          <MapView locations={result?.route || []} />
        </div>

      </div>
    </div>
  );
}