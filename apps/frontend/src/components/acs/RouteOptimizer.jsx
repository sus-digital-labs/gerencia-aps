import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Navigation,
  MapPin,
  Clock,
  Route,
  Smartphone,
  QrCode,
  Copy,
  Check,
  RefreshCw,
  Play,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

// Simple nearest neighbor algorithm for route optimization
function optimizeRoute(points) {
  if (points.length <= 2) return points;

  const result = [];
  const remaining = [...points];

  // Start with first point
  let current = remaining.shift();
  result.push(current);

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((point, idx) => {
      const dist = Math.sqrt(
        Math.pow(point.lat - current.lat, 2) +
          Math.pow(point.lng - current.lng, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    current = remaining.splice(nearestIdx, 1)[0];
    result.push(current);
  }

  return result;
}

// Calculate estimated time based on distance (rough approximation)
function calculateEstimatedTime(points) {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const dist = Math.sqrt(
      Math.pow(points[i + 1].lat - points[i].lat, 2) +
        Math.pow(points[i + 1].lng - points[i].lng, 2)
    );
    totalDistance += dist;
  }

  // Rough estimation: 1 degree ≈ 111km, walking speed ≈ 5km/h
  const distanceKm = totalDistance * 111;
  const walkingHours = distanceKm / 5;
  const visitTimeHours = points.length * 0.25; // 15 min per visit

  return Math.round((walkingHours + visitTimeHours) * 60);
}

// Generate Google Maps URL for route
function generateGoogleMapsUrl(points) {
  if (points.length === 0) return "";

  const origin = `${points[0].lat},${points[0].lng}`;
  const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;
  const waypoints = points
    .slice(1, -1)
    .map(p => `${p.lat},${p.lng}`)
    .join("|");

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  return url;
}

export default function RouteOptimizer({
  visits = [],
  onRouteOptimized,
  onClose,
}) {
  const [selectedVisits, setSelectedVisits] = useState([]);
  const [optimizedRoute, setOptimizedRoute] = useState([]);
  const [showQRCode, setShowQRCode] = useState(false);
  const [copied, setCopied] = useState(false);

  // Filter visits with coordinates
  const visitsWithCoords = useMemo(
    () => visits.filter(v => v.latitude && v.longitude),
    [visits]
  );

  // Toggle visit selection
  const toggleVisit = visit => {
    setSelectedVisits(prev => {
      const exists = prev.find(v => v.id === visit.id);
      if (exists) {
        return prev.filter(v => v.id !== visit.id);
      }
      return [...prev, visit];
    });
  };

  // Select all
  const selectAll = () => {
    setSelectedVisits(visitsWithCoords);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedVisits([]);
    setOptimizedRoute([]);
  };

  // Optimize route
  const handleOptimize = () => {
    const points = selectedVisits.map(v => ({
      id: v.id,
      lat: v.latitude,
      lng: v.longitude,
      name: v.citizen_name,
      address: v.address,
    }));

    const optimized = optimizeRoute(points);
    setOptimizedRoute(optimized);

    if (onRouteOptimized) {
      onRouteOptimized(optimized);
    }
  };

  // Copy link
  const copyLink = () => {
    const url = generateGoogleMapsUrl(optimizedRoute);
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Open in Google Maps
  const openInMaps = () => {
    const url = generateGoogleMapsUrl(optimizedRoute);
    window.open(url, "_blank");
  };

  const estimatedTime = calculateEstimatedTime(optimizedRoute);
  const mapsUrl = generateGoogleMapsUrl(optimizedRoute);

  return (
    <Card className="border-0 shadow-xl bg-white">
      <CardHeader className="bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Route className="w-5 h-5" />
            Otimizador de Rotas
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="text-white hover:bg-white/20"
            >
              <X className="w-5 h-5" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Visit Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-700">
                Selecione as visitas
              </h4>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>
                  Selecionar Todas
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Limpar
                </Button>
              </div>
            </div>
            <ScrollArea className="h-64 border rounded-lg p-2">
              {visitsWithCoords.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Nenhuma visita com coordenadas disponível
                </p>
              ) : (
                <div className="space-y-2">
                  {visitsWithCoords.map(visit => (
                    <div
                      key={visit.id}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedVisits.find(v => v.id === visit.id)
                          ? "bg-green-50 border border-green-200"
                          : "hover:bg-gray-50"
                      }`}
                      onClick={() => toggleVisit(visit)}
                    >
                      <Checkbox
                        checked={!!selectedVisits.find(v => v.id === visit.id)}
                        className="pointer-events-none"
                      />
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {visit.citizen_name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {visit.address}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            <div className="mt-3">
              <Button
                onClick={handleOptimize}
                disabled={selectedVisits.length < 2}
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
              >
                <Navigation className="w-4 h-4" />
                Calcular Melhor Rota ({selectedVisits.length} pontos)
              </Button>
            </div>
          </div>

          {/* Optimized Route */}
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Rota Otimizada</h4>
            {optimizedRoute.length === 0 ? (
              <div className="h-64 border rounded-lg flex items-center justify-center text-gray-400">
                <div className="text-center">
                  <Route className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Selecione visitas e calcule a rota</p>
                </div>
              </div>
            ) : (
              <>
                <ScrollArea className="h-48 border rounded-lg p-2">
                  <div className="space-y-2">
                    {optimizedRoute.map((point, idx) => (
                      <div
                        key={point.id}
                        className="flex items-center gap-3 p-2"
                      >
                        <Badge
                          className={`w-6 h-6 flex items-center justify-center ${
                            idx === 0
                              ? "bg-green-500"
                              : idx === optimizedRoute.length - 1
                                ? "bg-red-500"
                                : "bg-blue-500"
                          }`}
                        >
                          {idx + 1}
                        </Badge>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            {point.name}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {point.address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                {/* Stats and Actions */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{optimizedRoute.length} paradas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span>~{estimatedTime} min</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={copyLink}
                      className="flex-1 gap-1"
                    >
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copiado!" : "Copiar Link"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowQRCode(true)}
                      className="flex-1 gap-1"
                    >
                      <QrCode className="w-4 h-4" />
                      QR Code
                    </Button>
                    <Button
                      size="sm"
                      onClick={openInMaps}
                      className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700"
                    >
                      <Smartphone className="w-4 h-4" />
                      Abrir no Maps
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* QR Code Dialog */}
        <Dialog open={showQRCode} onOpenChange={setShowQRCode}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>QR Code da Rota</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 bg-white border rounded-lg">
                <QRCodeSVG
                  value={mapsUrl}
                  size={192}
                  level="M"
                  title="QR Code da Rota"
                />
              </div>
              <p className="text-sm text-gray-500 text-center">
                Escaneie com o celular para abrir a rota no Google Maps
              </p>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={copyLink}
              >
                <Copy className="w-4 h-4" />
                Copiar Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
