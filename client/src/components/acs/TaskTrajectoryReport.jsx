import trpc from '@/lib/trpc-adapter';
import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, Clock, Target } from 'lucide-react';
import { format } from 'date-fns';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const startIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const endIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const checkpointIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [20, 33],
  iconAnchor: [10, 33],
  popupAnchor: [1, -28],
  shadowSize: [33, 33]
});

export default function TaskTrajectoryReport({ task }) {
  const { data: locations = [] } = useQuery({
    queryKey: ['taskLocations', task.id],
    queryFn: () => trpc.TaskLocation.filter({ task_id: task.id }, 'timestamp')
  });

  if (!task.start_latitude || !task.latitude || locations.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Trajetória não disponível</p>
          <p className="text-sm">Esta tarefa não possui dados de localização suficientes</p>
        </CardContent>
      </Card>
    );
  }

  const allPoints = [
    { lat: task.start_latitude, lng: task.start_longitude, type: 'start' },
    ...locations.map(l => ({ lat: l.latitude, lng: l.longitude, type: l.location_type, timestamp: l.timestamp })),
    { lat: task.latitude, lng: task.longitude, type: 'end' }
  ];

  const center = [
    allPoints.reduce((sum, p) => sum + p.lat, 0) / allPoints.length,
    allPoints.reduce((sum, p) => sum + p.lng, 0) / allPoints.length
  ];

  const pathCoordinates = allPoints.map(p => [p.lat, p.lng]);

  // Calculate total distance
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  let totalDistance = 0;
  for (let i = 1; i < allPoints.length; i++) {
    totalDistance += calculateDistance(
      allPoints[i-1].lat, allPoints[i-1].lng,
      allPoints[i].lat, allPoints[i].lng
    );
  }

  const duration = task.completed_at && task.start_time
    ? new Date(task.completed_at) - new Date(task.start_time)
    : 0;

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-teal-500 to-cyan-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Navigation className="w-5 h-5" />
          Trajetória da Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Stats */}
        <div className="p-4 grid grid-cols-3 gap-4 border-b bg-gray-50">
          <div>
            <p className="text-xs text-gray-500">Distância Percorrida</p>
            <p className="text-lg font-bold text-gray-900">{(totalDistance / 1000).toFixed(2)} km</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Duração</p>
            <p className="text-lg font-bold text-gray-900">
              {duration > 0 ? `${Math.floor(duration / 60000)} min` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pontos Registrados</p>
            <p className="text-lg font-bold text-gray-900">{allPoints.length}</p>
          </div>
        </div>

        {/* Map */}
        <div className="h-[500px]">
          <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Path */}
            <Polyline
              positions={pathCoordinates}
              color="#06b6d4"
              weight={4}
              opacity={0.8}
            />

            {/* Start Marker */}
            <Marker position={[task.start_latitude, task.start_longitude]} icon={startIcon}>
              <Popup>
                <div className="min-w-[150px]">
                  <h4 className="font-bold text-green-700 mb-1">🟢 Início</h4>
                  <p className="text-xs text-gray-600">
                    {format(new Date(task.start_time), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
              </Popup>
            </Marker>

            {/* Checkpoint Markers */}
            {locations.filter(l => l.location_type === 'checkpoint').map((loc, idx) => (
              <Marker key={idx} position={[loc.latitude, loc.longitude]} icon={checkpointIcon}>
                <Popup>
                  <div className="min-w-[150px]">
                    <h4 className="font-bold text-blue-700 mb-1">📍 Ponto {idx + 1}</h4>
                    <p className="text-xs text-gray-600">
                      {format(new Date(loc.timestamp), 'dd/MM/yyyy HH:mm')}
                    </p>
                    {loc.notes && <p className="text-xs text-gray-500 mt-1">{loc.notes}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* End Marker */}
            <Marker position={[task.latitude, task.longitude]} icon={endIcon}>
              <Popup>
                <div className="min-w-[150px]">
                  <h4 className="font-bold text-red-700 mb-1">🔴 Conclusão</h4>
                  <p className="text-xs text-gray-600">
                    {format(new Date(task.completed_at), 'dd/MM/yyyy HH:mm')}
                  </p>
                  {task.location_validated && (
                    <Badge className="bg-green-100 text-green-700 mt-1 text-xs">
                      ✓ Validado
                    </Badge>
                  )}
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-around text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Início</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500" />
              <span>Pontos Intermediários</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Conclusão</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}