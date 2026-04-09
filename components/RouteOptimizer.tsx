"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import * as XLSX from "xlsx";
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

  // 🔥 PROCESSAR ARQUIVO
  const processFile = (file: File) => {
    setFileName(file.name);

    const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");

    const reader = new FileReader();

    reader.onload = (e) => {
      let lines: string[] = [];

      if (isExcel) {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });

        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

        lines = json
          .flat()
          .map((l) => String(l).trim())
          .filter((l) => l.length > 0);

      } else {
        const text = e.target?.result as string;

        lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
      }

      // 🔥 VALIDAÇÃO
      if (lines.length < 2) {
        setError("Arquivo precisa ter pelo menos 2 endereços.");
        return;
      }

      if (lines.length > 50) {
        setError("Máximo de 50 endereços permitido.");
        return;
      }

      setError(null);
      setInput(lines.join("\n"));
    };

    if (isExcel) reader.readAsArrayBuffer(file);
    else reader.readAsText(file);
  };

  // 🔥 INPUT FILE
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // 🔥 DRAG & DROP
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
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
      setError("Erro ao conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const mapLocations = result?.route ?? [];

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.panel}>
            <div className={styles.inputSection}>

              <textarea
                className={styles.textarea}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={8}
              />

              <button className={styles.button} onClick={handleOptimize}>
                {loading ? "Calculando..." : "Otimizar Rota"}
              </button>

              {/* 🔥 DRAG & DROP */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                style={{
                  marginTop: 12,
                  padding: 20,
                  border: "2px dashed #ccc",
                  borderRadius: 8,
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                Arraste um arquivo CSV ou Excel aqui
              </div>

              {/* 🔥 BOTÃO */}
              <label style={{ display: "block", marginTop: 10 }}>
                📁 Ou clique para carregar arquivo
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
              </label>

              {fileName && <p>Arquivo: {fileName}</p>}
              {error && <div className={styles.error}>{error}</div>}

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