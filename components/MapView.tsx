"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import styles from "./MapView.module.css";

interface GeoLocation {
  address: string;
  lat: number;
  lng: number;
}

interface MapViewProps {
  locations: GeoLocation[];
}

// ---------------------------------------------------------------------------
// Marker HTML helpers
// ---------------------------------------------------------------------------

function startMarkerHtml() {
  return `
    <div style="position:relative;width:44px;height:52px;">
      <div class="map-marker-pulse" style="
        position:absolute;top:2px;left:50%;transform:translateX(-50%);
        width:40px;height:40px;border-radius:50%;
        background:rgba(34,197,94,0.22);
      "></div>
      <div style="
        position:absolute;top:2px;left:50%;
        width:32px;height:32px;border-radius:50% 50% 50% 0;
        transform:translateX(-50%) rotate(-45deg);
        background:#16a34a;box-shadow:0 3px 10px rgba(0,0,0,0.28);
        border:3px solid #fff;
      "></div>
      <div style="
        position:absolute;top:2px;left:50%;transform:translateX(-50%);
        width:32px;height:32px;
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:11px;font-weight:800;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        pointer-events:none;
      ">S</div>
      <div style="
        position:absolute;bottom:0;left:50%;transform:translateX(-50%);
        width:6px;height:4px;border-radius:50%;background:rgba(0,0,0,0.15);
      "></div>
    </div>`;
}

function stopMarkerHtml(label: string, color: string) {
  return `
    <div style="position:relative;width:32px;height:40px;">
      <div style="
        position:absolute;top:0;left:50%;
        width:28px;height:28px;border-radius:50% 50% 50% 0;
        transform:translateX(-50%) rotate(-45deg);
        background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.25);
        border:2.5px solid #fff;
      "></div>
      <div style="
        position:absolute;top:0;left:50%;transform:translateX(-50%);
        width:28px;height:28px;
        display:flex;align-items:center;justify-content:center;
        color:#fff;font-size:13px;font-weight:700;
        font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
        pointer-events:none;
      ">${label}</div>
      <div style="
        position:absolute;bottom:0;left:50%;transform:translateX(-50%);
        width:5px;height:3px;border-radius:50%;background:rgba(0,0,0,0.13);
      "></div>
    </div>`;
}

function arrowHtml(angleDeg: number) {
  return `<div style="
    width:0;height:0;
    border-left:6px solid transparent;
    border-right:6px solid transparent;
    border-bottom:11px solid #3b82f6;
    opacity:0.8;
    transform:rotate(${angleDeg}deg);
  "></div>`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function MapView({ locations }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  // Keep all Leaflet state in refs to avoid any hook ordering issues
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const groupRef = useRef<import("leaflet").LayerGroup | null>(null);
  const LRef = useRef<typeof import("leaflet") | null>(null);
  // Latest locations always accessible inside the async init callback
  const locationsRef = useRef<GeoLocation[]>(locations);

  // Track whether we have drawn anything yet (so we know to fit bounds on first load)
  const hasLocations = locations.length > 0;

  // Keep locationsRef in sync so the init callback can read the latest value
  useEffect(() => {
    locationsRef.current = locations;
  });

  // ---------- shared draw function (no state, pure refs) ----------
  function redraw(
    L: typeof import("leaflet"),
    map: import("leaflet").Map,
    group: import("leaflet").LayerGroup,
    locs: GeoLocation[]
  ) {
    group.clearLayers();

    if (locs.length === 0) return;

    // Filter out any bad coordinates defensively
    const valid = locs.filter(
      (l) => isFinite(l.lat) && isFinite(l.lng)
    );
    if (valid.length === 0) return;

    const latLngs: [number, number][] = valid.map((l) => [l.lat, l.lng]);

    // Route polyline
    if (latLngs.length > 1) {
      L.polyline(latLngs, {
        color: "#3b82f6",
        weight: 4,
        opacity: 0.75,
        lineJoin: "round",
        lineCap: "round",
      }).addTo(group);

      // Midpoint direction arrows
      for (let i = 0; i < latLngs.length - 1; i++) {
        const [lat1, lng1] = latLngs[i];
        const [lat2, lng2] = latLngs[i + 1];
        const midLat = (lat1 + lat2) / 2;
        const midLng = (lng1 + lng2) / 2;
        const dy = lat2 - lat1;
        const dx = (lng2 - lng1) * Math.cos((lat1 * Math.PI) / 180);
        const angle = (Math.atan2(dx, dy) * 180) / Math.PI;
        L.marker([midLat, midLng], {
          icon: L.divIcon({
            className: "",
            html: arrowHtml(angle),
            iconSize: [12, 11],
            iconAnchor: [6, 5.5],
          }),
          interactive: false,
          zIndexOffset: -1000,
        }).addTo(group);
      }
    }

    // Stop markers (drawn on top)
    valid.forEach((loc, idx) => {
      const isStart = idx === 0;
      const isEnd = idx === valid.length - 1 && valid.length > 1;
      const color = isEnd ? "#ef4444" : "#3b82f6";

      const icon = isStart
        ? L.divIcon({
            className: "",
            html: startMarkerHtml(),
            iconSize: [44, 52],
            iconAnchor: [22, 48],
            popupAnchor: [0, -50],
          })
        : L.divIcon({
            className: "",
            html: stopMarkerHtml(String(idx + 1), color),
            iconSize: [32, 40],
            iconAnchor: [16, 36],
            popupAnchor: [0, -38],
          });

      const role = isStart
        ? "Início"
        : isEnd
        ? `Parada ${idx + 1} · Fim`
        : `Parada ${idx + 1}`;

      L.marker([loc.lat, loc.lng], { icon })
        .bindPopup(
          `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
              font-size:13px;line-height:1.55;min-width:150px;max-width:220px;">
            <div style="font-weight:700;color:#1e293b;margin-bottom:2px;">${role}</div>
            <div style="color:#64748b;font-size:12px;">${loc.address}</div>
          </div>`,
          { maxWidth: 240 }
        )
        .addTo(group);
    });

    // Fit map — guard against zero-size container
    if (latLngs.length >= 1) {
      try {
        const size = map.getSize();
        if (size.x > 0 && size.y > 0) {
          if (latLngs.length === 1) {
            map.setView(latLngs[0], 14);
          } else {
            map.fitBounds(L.latLngBounds(latLngs), {
              padding: [55, 55],
              maxZoom: 15,
              animate: true,
            });
          }
        }
      } catch {
        // silently ignore layout-not-ready errors
      }
    }
  }

  // ---------- initialize Leaflet once on mount ----------
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;

      LRef.current = L;

      const map = L.map(containerRef.current, {
        center: [40.73, -73.98],
        zoom: 11,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      const group = L.layerGroup().addTo(map);
      mapRef.current = map;
      groupRef.current = group;

      // Draw any locations that were already set before init finished
      if (!cancelled && locationsRef.current.length > 0) {
        redraw(L, map, group, locationsRef.current);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- redraw whenever locations prop changes ----------
  useEffect(() => {
    if (!mapRef.current || !groupRef.current || !LRef.current) return;
    redraw(LRef.current, mapRef.current, groupRef.current, locations);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  // ---------- destroy on unmount ----------
  useEffect(() => {
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
      groupRef.current = null;
      LRef.current = null;
    };
  }, []);

  return (
    <div className={styles.wrapper}>
      <div ref={containerRef} className={styles.map} />
      {!hasLocations && (
        <div className={styles.hint}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
            <path d="M13 13l6 6" />
          </svg>
          Otimize uma rota para ver os marcadores
        </div>
      )}
      {hasLocations && (
        <div className={styles.legend}>
          <span
            className={styles.legendDot}
            style={{ background: "#16a34a" }}
          />
          Início
          <span
            className={styles.legendDot}
            style={{ background: "#3b82f6", marginLeft: 10 }}
          />
          Parada
          <span
            className={styles.legendDot}
            style={{ background: "#ef4444", marginLeft: 10 }}
          />
          Fim
        </div>
      )}
    </div>
  );
}
