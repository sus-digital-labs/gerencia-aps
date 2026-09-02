import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, Home, Layers, ZoomIn, ZoomOut, Search, Plus, Navigation, Building2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polygon, useMap, Circle, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const conditionColors = {
  gestante: '#ec4899',
  hipertenso: '#ef4444',
  diabetico: '#f59e0b',
  idoso: '#8b5cf6',
  crianca: '#10b981',
  default: '#3b82f6'
};

const createConditionIcon = (conditions) => {
  const color = conditions?.includes('gestante') ? 'violet' :
                conditions?.includes('hipertenso') ? 'red' :
                conditions?.includes('diabetico') ? 'orange' :
                conditions?.includes('idoso') ? 'grey' :
                conditions?.includes('crianca') ? 'green' : 'blue';
  
  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [20, 33],
    iconAnchor: [10, 33],
    popupAnchor: [1, -28],
    shadowSize: [33, 33]
  });
};

function MapController({ areas, citizens }) {
  const map = useMap();
  
  useEffect(() => {
    const allCoords = [];
    areas.forEach(a => {
      if (a.polygon_coordinates?.length > 0) {
        a.polygon_coordinates.forEach(c => allCoords.push([c.lat, c.lng]));
      } else if (a.center_lat && a.center_lng) {
        allCoords.push([a.center_lat, a.center_lng]);
      }
    });
    citizens.forEach(c => {
      if (c.latitude && c.longitude) {
        allCoords.push([c.latitude, c.longitude]);
      }
    });
    
    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [areas, citizens, map]);
  
  return null;
}

export default function TerritoryMap({ 
  areas = [], 
  citizens = [],
  pointsOfInterest = [],
  showCitizens = true,
  showAreas = true,
  selectedArea = null,
  onAreaClick,
  onAddPOI
}) {
  const [showLayer, setShowLayer] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [routePoints, setRoutePoints] = useState([]);
  const [showPOIDialog, setShowPOIDialog] = useState(false);
  const [newPOI, setNewPOI] = useState({ name: '', type: 'ubs', latitude: '', longitude: '' });
  
  // Search address using Nominatim
  const searchAddress = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

  // Generate optimized route for visits
  const generateRoute = () => {
    const citizensWithCoords = citizens
      .filter(c => c.latitude && c.longitude)
      .slice(0, 20); // Limit for performance
    
    if (citizensWithCoords.length < 2) return;
    
    // Simple nearest neighbor algorithm
    const route = [];
    const remaining = [...citizensWithCoords];
    let current = remaining.shift();
    route.push([current.latitude, current.longitude]);
    
    while (remaining.length > 0) {
      let nearestIdx = 0;
      let nearestDist = Infinity;
      
      remaining.forEach((c, idx) => {
        const dist = Math.sqrt(
          Math.pow(c.latitude - current.latitude, 2) + 
          Math.pow(c.longitude - current.longitude, 2)
        );
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestIdx = idx;
        }
      });
      
      current = remaining.splice(nearestIdx, 1)[0];
      route.push([current.latitude, current.longitude]);
    }
    
    setRoutePoints(route);
    setShowRoute(true);
  };

  const poiIcons = {
    ubs: '🏥',
    hospital: '🏨',
    escola: '🏫',
    farmacia: '💊',
    cras: '🏛️',
    igreja: '⛪',
    comercio: '🏪',
    outro: '📍'
  };

  const createPOIIcon = (type) => {
    return L.divIcon({
      className: 'poi-marker',
      html: `<div style="font-size: 24px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">${poiIcons[type] || '📍'}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });
  };
  
  // Default center (Barra do Choça, BA)
  const defaultCenter = [-14.8683986, -40.5862535];
  const center = areas.length > 0 && areas[0].center_lat 
    ? [areas[0].center_lat, areas[0].center_lng]
    : citizens.length > 0 && citizens[0].latitude
    ? [citizens[0].latitude, citizens[0].longitude]
    : defaultCenter;

  // Filter citizens by condition
  const filteredCitizens = showLayer === 'all' 
    ? citizens 
    : citizens.filter(c => c.conditions?.includes(showLayer));

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Mapeamento de Território
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge className="bg-white/20 text-white">
              {areas.length} áreas
            </Badge>
            <Badge className="bg-white/20 text-white">
              {filteredCitizens.filter(c => c.latitude && c.longitude).length} cidadãos
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {/* Search and Tools */}
        <div className="p-3 bg-gray-50 border-b space-y-3">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar endereço..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
                className="pl-10"
              />
            </div>
            <Button onClick={searchAddress} disabled={isSearching} size="sm">
              {isSearching ? 'Buscando...' : 'Buscar'}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={generateRoute}
              className="gap-1"
            >
              <Navigation className="w-4 h-4" />
              Rota
            </Button>
            <Dialog open={showPOIDialog} onOpenChange={setShowPOIDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  POI
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Ponto de Interesse</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input
                      value={newPOI.name}
                      onChange={(e) => setNewPOI({ ...newPOI, name: e.target.value })}
                      placeholder="Nome do local"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newPOI.type} onValueChange={(v) => setNewPOI({ ...newPOI, type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ubs">🏥 UBS</SelectItem>
                        <SelectItem value="hospital">🏨 Hospital</SelectItem>
                        <SelectItem value="escola">🏫 Escola</SelectItem>
                        <SelectItem value="farmacia">💊 Farmácia</SelectItem>
                        <SelectItem value="cras">🏛️ CRAS</SelectItem>
                        <SelectItem value="igreja">⛪ Igreja</SelectItem>
                        <SelectItem value="comercio">🏪 Comércio</SelectItem>
                        <SelectItem value="outro">📍 Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Latitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={newPOI.latitude}
                        onChange={(e) => setNewPOI({ ...newPOI, latitude: e.target.value })}
                        placeholder="-23.5505"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Longitude</Label>
                      <Input
                        type="number"
                        step="any"
                        value={newPOI.longitude}
                        onChange={(e) => setNewPOI({ ...newPOI, longitude: e.target.value })}
                        placeholder="-46.6333"
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      if (onAddPOI && newPOI.name && newPOI.latitude && newPOI.longitude) {
                        onAddPOI({
                          ...newPOI,
                          latitude: parseFloat(newPOI.latitude),
                          longitude: parseFloat(newPOI.longitude)
                        });
                        setNewPOI({ name: '', type: 'ubs', latitude: '', longitude: '' });
                        setShowPOIDialog(false);
                      }
                    }}
                  >
                    Adicionar Ponto
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="bg-white rounded-lg border p-2 max-h-40 overflow-y-auto">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  className="p-2 hover:bg-gray-100 rounded cursor-pointer text-sm"
                  onClick={() => {
                    setNewPOI({ 
                      ...newPOI, 
                      latitude: result.lat, 
                      longitude: result.lon,
                      name: result.display_name.split(',')[0]
                    });
                    setSearchResults([]);
                    setSearchQuery('');
                  }}
                >
                  <p className="font-medium truncate">{result.display_name}</p>
                  <p className="text-xs text-gray-500">Lat: {parseFloat(result.lat).toFixed(4)}, Lng: {parseFloat(result.lon).toFixed(4)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm font-medium text-gray-600">Filtrar:</span>
            <Badge 
              className={`cursor-pointer ${showLayer === 'all' ? 'bg-blue-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              onClick={() => setShowLayer('all')}
            >
              Todos
            </Badge>
            <Badge 
              className={`cursor-pointer ${showLayer === 'gestante' ? 'bg-pink-600' : 'bg-pink-100 text-pink-700 hover:bg-pink-200'}`}
              onClick={() => setShowLayer('gestante')}
            >
              Gestantes
            </Badge>
            <Badge 
              className={`cursor-pointer ${showLayer === 'hipertenso' ? 'bg-red-600' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}
              onClick={() => setShowLayer('hipertenso')}
            >
              Hipertensos
            </Badge>
            <Badge 
              className={`cursor-pointer ${showLayer === 'diabetico' ? 'bg-amber-600' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
              onClick={() => setShowLayer('diabetico')}
            >
              Diabéticos
            </Badge>
            <Badge 
              className={`cursor-pointer ${showLayer === 'idoso' ? 'bg-purple-600' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
              onClick={() => setShowLayer('idoso')}
            >
              Idosos
            </Badge>
            <Badge 
              className={`cursor-pointer ${showLayer === 'crianca' ? 'bg-green-600' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
              onClick={() => setShowLayer('crianca')}
            >
              Crianças
            </Badge>
            {showRoute && (
              <Badge 
                className="cursor-pointer bg-orange-600 hover:bg-orange-700"
                onClick={() => setShowRoute(false)}
              >
                ✕ Ocultar Rota
              </Badge>
            )}
          </div>
        </div>

        {/* Mapa */}
        <div className="h-[600px]">
          <MapContainer
            center={center}
            zoom={14}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController areas={areas} citizens={filteredCitizens} />
            
            {/* Polygons for areas */}
            {showAreas && areas.map((area, idx) => (
              area.polygon_coordinates?.length > 0 ? (
                <Polygon
                  key={area.id || idx}
                  positions={area.polygon_coordinates.map(c => [c.lat, c.lng])}
                  pathOptions={{
                    color: area.color || '#3b82f6',
                    fillColor: area.color || '#3b82f6',
                    fillOpacity: selectedArea?.id === area.id ? 0.4 : 0.2,
                    weight: selectedArea?.id === area.id ? 3 : 2
                  }}
                  eventHandlers={{
                    click: () => onAreaClick?.(area)
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <h4 className="font-bold text-gray-800 mb-2">{area.name}</h4>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Microárea:</span>
                          <span className="font-medium">{area.microarea_code}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">ACS:</span>
                          <span className="font-medium">{area.acs_name || '-'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Famílias:</span>
                          <span className="font-medium">{area.total_families || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Cidadãos:</span>
                          <span className="font-medium">{area.total_citizens || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              ) : area.center_lat && area.center_lng ? (
                <Circle
                  key={area.id || idx}
                  center={[area.center_lat, area.center_lng]}
                  radius={500}
                  pathOptions={{
                    color: area.color || '#3b82f6',
                    fillColor: area.color || '#3b82f6',
                    fillOpacity: 0.2
                  }}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <h4 className="font-bold text-gray-800 mb-2">{area.name}</h4>
                      <p className="text-sm text-gray-500">Microárea {area.microarea_code}</p>
                      <p className="text-sm">{area.total_citizens || 0} cidadãos</p>
                    </div>
                  </Popup>
                </Circle>
              ) : null
            ))}
            
            {/* Citizen markers */}
            {showCitizens && filteredCitizens.filter(c => c.latitude && c.longitude).map((citizen, idx) => (
              <Marker
                key={citizen.id || idx}
                position={[citizen.latitude, citizen.longitude]}
                icon={createConditionIcon(citizen.conditions)}
              >
                <Popup>
                  <div className="min-w-[180px]">
                    <h4 className="font-bold text-gray-800 mb-1">{citizen.citizen_name}</h4>
                    <p className="text-xs text-gray-500 mb-2">{citizen.address}</p>
                    {citizen.conditions?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {citizen.conditions.map((cond, i) => (
                          <Badge key={i} className="text-xs" style={{
                            backgroundColor: conditionColors[cond] || conditionColors.default,
                            color: 'white'
                          }}>
                            {cond}
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Última visita: {citizen.last_visit_date ? new Date(citizen.last_visit_date).toLocaleDateString('pt-BR') : 'Não registrada'}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Points of Interest */}
            {pointsOfInterest.filter(p => p.latitude && p.longitude).map((poi, idx) => (
              <Marker
                key={`poi-${poi.id || idx}`}
                position={[poi.latitude, poi.longitude]}
                icon={createPOIIcon(poi.type)}
              >
                <Popup>
                  <div className="min-w-[150px]">
                    <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                      <span>{poiIcons[poi.type]}</span>
                      {poi.name}
                    </h4>
                    <p className="text-xs text-gray-500">{poi.address}</p>
                    {poi.phone && (
                      <p className="text-xs text-gray-600 mt-1">📞 {poi.phone}</p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Optimized Route */}
            {showRoute && routePoints.length > 1 && (
              <Polyline
                positions={routePoints}
                pathOptions={{
                  color: '#f97316',
                  weight: 3,
                  dashArray: '10, 10',
                  opacity: 0.8
                }}
              />
            )}
          </MapContainer>
        </div>

        {/* Legenda */}
        <div className="p-3 bg-gray-50 border-t">
          <div className="flex items-center gap-4 text-xs text-gray-500 flex-wrap">
            <span className="font-medium flex items-center gap-1">
              <Users className="w-4 h-4" />
              Legenda:
            </span>
            {Object.entries({ gestante: 'Gestante', hipertenso: 'Hipertenso', diabetico: 'Diabético', idoso: 'Idoso', crianca: 'Criança' }).map(([key, label]) => (
              <span key={key} className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: conditionColors[key] }} />
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}