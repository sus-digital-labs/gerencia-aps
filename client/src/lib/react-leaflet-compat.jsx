import { useEffect } from "react";
import { Map, useLeaflet } from "react-leaflet";

export * from "react-leaflet";

export const MapContainer = Map;

export function useMap() {
  return useLeaflet().map;
}

export function useMapEvents(events) {
  const map = useMap();

  useEffect(() => {
    map.on(events);
    return () => map.off(events);
  }, [events, map]);

  return map;
}
