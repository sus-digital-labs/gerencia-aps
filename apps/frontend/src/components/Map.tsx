/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

const apiKey =
  typeof import.meta.env.VITE_FRONTEND_FORGE_API_KEY === "string"
    ? import.meta.env.VITE_FRONTEND_FORGE_API_KEY.trim()
    : "";
const forgeBaseUrl =
  typeof import.meta.env.VITE_FRONTEND_FORGE_API_URL === "string"
    ? import.meta.env.VITE_FRONTEND_FORGE_API_URL.trim()
    : "";
const mapsProxyUrl = forgeBaseUrl ? `${forgeBaseUrl}/v1/maps/proxy` : "";

function loadMapScript(): Promise<void> {
  if (!apiKey || !mapsProxyUrl) {
    return Promise.reject(
      new Error("CONFIGURATION_ERROR: integração de mapas não configurada")
    );
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${mapsProxyUrl}/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&libraries=marker,places,geocoding,geometry`;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () => {
      script.remove();
      resolve();
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("API_UNAVAILABLE: serviço de mapas não respondeu"));
    };
    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

export function MapView({
  className,
  initialCenter,
  initialZoom,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [status, setStatus] = useState<"idle" | "ready" | "error">("idle");

  const init = usePersistFn(async () => {
    if (!initialCenter || initialZoom === undefined) {
      setStatus("error");
      return;
    }

    try {
      await loadMapScript();
      if (!mapContainer.current || !window.google)
        throw new Error("API_UNAVAILABLE: mapa não carregado");
      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });
      setStatus("ready");
      onMapReady?.(map.current);
    } catch (error) {
      console.error("[Map configuration]", error);
      setStatus("error");
    }
  });

  useEffect(() => {
    void init();
  }, [init]);

  if (status === "error") {
    return (
      <div
        className={cn(
          "flex min-h-[300px] items-center justify-center rounded-md bg-slate-100 p-6 text-sm text-slate-600",
          className
        )}
      >
        Mapa indisponível: configure API, centro e zoom válidos.
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={cn("min-h-[500px] w-full", className)}
      aria-busy={status === "idle"}
    />
  );
}
