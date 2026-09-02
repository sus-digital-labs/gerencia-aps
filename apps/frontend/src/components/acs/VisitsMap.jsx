import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Layers, Route } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "@/lib/react-leaflet-compat";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import RouteOptimizer from "./RouteOptimizer";
import { runtimeConfig } from "@/config/runtime";

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const createIcon = color =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const visitTypeColors = {
  cadastro: "blue",
  acompanhamento: "green",
  busca_ativa: "orange",
  campanha: "violet",
  entrega_medicamento: "yellow",
  outros: "grey",
};

const typeLabels = {
  cadastro: "Cadastro",
  acompanhamento: "Acompanhamento",
  busca_ativa: "Busca Ativa",
  campanha: "Campanha",
  entrega_medicamento: "Entrega Medicamento",
  outros: "Outros",
};

function MapBounds({ visits }) {
  const map = useMap();

  useEffect(() => {
    if (visits.length > 0) {
      const validVisits = visits.filter(v => v.latitude && v.longitude);
      if (validVisits.length > 0) {
        const bounds = L.latLngBounds(
          validVisits.map(v => [v.latitude, v.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [visits, map]);

  return null;
}

export default function VisitsMap({
  visits = [],
  showRoute = false,
  title = "Mapa de Visitas",
}) {
  const [selectedType, setSelectedType] = useState("all");
  const [showOptimizer, setShowOptimizer] = useState(false);
  const [optimizedRoute, setOptimizedRoute] = useState([]);

  const validVisits = visits.filter(v => v.latitude && v.longitude);
  const filteredVisits =
    selectedType === "all"
      ? validVisits
      : validVisits.filter(v => v.visit_type === selectedType);

  const defaultCenter = [
    runtimeConfig.municipality.center.lat,
    runtimeConfig.municipality.center.lng,
  ];
  const center =
    validVisits.length > 0
      ? [validVisits[0].latitude, validVisits[0].longitude]
      : defaultCenter;

  // Route coordinates for polyline
  const routeCoords = showRoute
    ? filteredVisits
        .sort((a, b) => new Date(a.visit_date) - new Date(b.visit_date))
        .map(v => [v.latitude, v.longitude])
    : [];

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {title}
          </CardTitle>
          <Badge className="bg-white/20 text-white">
            {filteredVisits.length} visitas no mapa
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Filtros */}
        <div className="p-3 bg-gray-50 border-b flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <Badge
              className={`cursor-pointer ${selectedType === "all" ? "bg-blue-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
              onClick={() => setSelectedType("all")}
            >
              Todos
            </Badge>
            {Object.entries(typeLabels).map(([type, label]) => (
              <Badge
                key={type}
                className={`cursor-pointer ${selectedType === type ? "bg-blue-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300"}`}
                onClick={() => setSelectedType(type)}
              >
                {label}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowOptimizer(!showOptimizer)}
            className="gap-2"
          >
            <Route className="w-4 h-4" />
            {showOptimizer ? "Fechar Otimizador" : "Otimizar Rota"}
          </Button>
        </div>

        {/* Route Optimizer */}
        {showOptimizer && (
          <div className="p-4 bg-gray-50 border-b">
            <RouteOptimizer
              visits={filteredVisits}
              onRouteOptimized={route => setOptimizedRoute(route)}
              onClose={() => setShowOptimizer(false)}
            />
          </div>
        )}

        {/* Mapa */}
        <div className="h-[500px]">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapBounds visits={filteredVisits} />

            {/* Route line */}
            {showRoute && routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}

            {/* Optimized Route line */}
            {optimizedRoute.length > 1 && (
              <Polyline
                positions={optimizedRoute.map(p => [p.lat, p.lng])}
                color="#16a34a"
                weight={4}
                opacity={0.9}
              />
            )}

            {/* Visit markers */}
            {filteredVisits.map((visit, idx) => (
              <Marker
                key={visit.id || idx}
                position={[visit.latitude, visit.longitude]}
                icon={createIcon(visitTypeColors[visit.visit_type] || "blue")}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <h4 className="font-bold text-gray-800 mb-1">
                      {visit.citizen_name}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {visit.address}
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Data:</span>
                        <span className="font-medium">
                          {new Date(visit.visit_date).toLocaleDateString(
                            "pt-BR"
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Tipo:</span>
                        <span className="font-medium">
                          {typeLabels[visit.visit_type] || visit.visit_type}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Desfecho:</span>
                        <span className="font-medium">
                          {visit.desfecho?.replace("_", " ") || "Realizada"}
                        </span>
                      </div>
                      {visit.observations && (
                        <div className="mt-2 pt-2 border-t">
                          <span className="text-gray-500">Obs:</span>
                          <p className="text-gray-700">{visit.observations}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>

        {/* Legenda */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
            <Layers className="w-4 h-4" />
            <span className="font-medium">Legenda:</span>
            {Object.entries(typeLabels).map(([type, label]) => (
              <span key={type} className="flex items-center gap-1">
                <span
                  className={`w-3 h-3 rounded-full`}
                  style={{
                    backgroundColor: {
                      cadastro: "#2563eb",
                      acompanhamento: "#16a34a",
                      busca_ativa: "#ea580c",
                      campanha: "#7c3aed",
                      entrega_medicamento: "#ca8a04",
                      outros: "#6b7280",
                    }[type],
                  }}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
