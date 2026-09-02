import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, CheckCircle, AlertTriangle, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (color) => new L.Icon({
  iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const expectedIcon = createCustomIcon('blue');
const actualIcon = createCustomIcon('green');
const invalidIcon = createCustomIcon('red');

export default function TaskLocationMap({ task }) {
  if (!task.latitude || !task.longitude) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-12 text-center text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="font-medium">Localização não registrada</p>
          <p className="text-sm">Esta tarefa não possui coordenadas de geolocalização</p>
        </CardContent>
      </Card>
    );
  }

  const hasExpectedLocation = task.expected_latitude && task.expected_longitude;
  const distance = task.location_distance || 0;
  const isValid = task.location_validated;
  const accuracy = task.location_accuracy || 0;

  const center = hasExpectedLocation 
    ? [(task.latitude + task.expected_latitude) / 2, (task.longitude + task.expected_longitude) / 2]
    : [task.latitude, task.longitude];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Geolocalização da Tarefa
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Validation Status */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isValid ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-500" />
              )}
              <div>
                <p className="font-semibold text-gray-900">
                  {isValid ? 'Localização Validada' : 'Localização Fora do Esperado'}
                </p>
                <p className="text-sm text-gray-600">
                  {hasExpectedLocation 
                    ? `Distância do local esperado: ${distance.toFixed(0)}m`
                    : 'Sem localização esperada para comparação'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Precisão GPS</p>
              <p className="font-bold text-lg text-gray-900">±{accuracy.toFixed(0)}m</p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="h-[400px]">
          <MapContainer
            center={center}
            zoom={hasExpectedLocation ? 16 : 17}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; OpenStreetMap'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* Expected Location */}
            {hasExpectedLocation && (
              <>
                <Marker position={[task.expected_latitude, task.expected_longitude]} icon={expectedIcon}>
                  <Popup>
                    <div className="min-w-[200px]">
                      <h4 className="font-bold text-blue-700 mb-2">📍 Local Esperado</h4>
                      <p className="text-sm text-gray-600">{task.related_address || 'Endereço não informado'}</p>
                      <div className="mt-2 text-xs text-gray-500">
                        <p>Lat: {task.expected_latitude.toFixed(6)}</p>
                        <p>Lng: {task.expected_longitude.toFixed(6)}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
                {/* Tolerance Circle (100m) */}
                <Circle
                  center={[task.expected_latitude, task.expected_longitude]}
                  radius={100}
                  pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                />
              </>
            )}

            {/* Actual Location */}
            <Marker 
              position={[task.latitude, task.longitude]} 
              icon={isValid ? actualIcon : invalidIcon}
            >
              <Popup>
                <div className="min-w-[200px]">
                  <h4 className={`font-bold mb-2 ${isValid ? 'text-green-700' : 'text-red-700'}`}>
                    {isValid ? '✅ Local Registrado' : '⚠️ Local Registrado (Fora do Esperado)'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2">
                    Registrado em: {new Date(task.completed_at).toLocaleString('pt-BR')}
                  </p>
                  {hasExpectedLocation && (
                    <p className="text-sm font-medium text-gray-900 mb-2">
                      Distância: {distance.toFixed(0)}m do esperado
                    </p>
                  )}
                  <div className="text-xs text-gray-500">
                    <p>Lat: {task.latitude.toFixed(6)}</p>
                    <p>Lng: {task.longitude.toFixed(6)}</p>
                    <p>Precisão: ±{accuracy.toFixed(0)}m</p>
                  </div>
                </div>
              </Popup>
            </Marker>
            {/* Accuracy Circle */}
            <Circle
              center={[task.latitude, task.longitude]}
              radius={accuracy}
              pathOptions={{ color: isValid ? 'green' : 'red', fillColor: isValid ? 'green' : 'red', fillOpacity: 0.1 }}
            />
          </MapContainer>
        </div>

        {/* Legend */}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex items-center justify-around text-sm">
            {hasExpectedLocation && (
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <span>Local Esperado</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isValid ? 'bg-green-500' : 'bg-red-500'}`} />
              <span>Local Registrado</span>
            </div>
            {hasExpectedLocation && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-blue-500 opacity-30" />
                <span>Raio de Tolerância (100m)</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}