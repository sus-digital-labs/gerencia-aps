import trpc from "@/lib/trpc-adapter";
import { runtimeConfig } from "@/config/runtime";
import React, { useState, useCallback, useRef, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MapPin,
  Plus,
  Layers,
  Users,
  Home,
  Building2,
  Edit2,
  Trash2,
  Save,
  Download,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  User,
  AlertTriangle,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "@/lib/react-leaflet-compat";
import { DynamicTileLayer } from "@/hooks/useMapConfig";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const unitColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
];
const microareaColors = [
  "#93c5fd",
  "#86efac",
  "#fcd34d",
  "#c4b5fd",
  "#fca5a5",
  "#f9a8d4",
  "#67e8f9",
  "#a5b4fc",
  "#fda4af",
  "#99f6e4",
];

function MapEventHandler({ onMapClick, drawMode }) {
  useMapEvents({
    click: e => {
      if (drawMode && onMapClick) {
        onMapClick(e.latlng);
      }
    },
  });
  return null;
}

function MapBoundsController({ areas, units }) {
  const map = useMap();

  useEffect(() => {
    const allCoords = [];
    units.forEach(u => {
      if (u.polygon_coordinates?.length > 0) {
        u.polygon_coordinates.forEach(c => allCoords.push([c.lat, c.lng]));
      }
    });
    areas.forEach(a => {
      if (a.polygon_coordinates?.length > 0) {
        a.polygon_coordinates.forEach(c => allCoords.push([c.lat, c.lng]));
      }
    });

    if (allCoords.length > 0) {
      const bounds = L.latLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [areas, units, map]);

  return null;
}

export default function TerritoryRemapping() {
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState("unidades");
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [selectedMicroarea, setSelectedMicroarea] = useState(null);
  const [drawMode, setDrawMode] = useState(null); // 'unidade' | 'microarea' | null
  const [drawingPoints, setDrawingPoints] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState(null); // 'unidade' | 'microarea'
  const [formData, setFormData] = useState({});
  const [draggedACS, setDraggedACS] = useState(null);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const queryClient = useQueryClient();

  // Fetch Health Units (as polygon areas)
  const { data: healthUnits = [] } = useQuery({
    queryKey: ["healthUnits"],
    queryFn: () => trpc.HealthUnit.filter({ active: true }),
  });

  // Fetch Territory Areas (microareas)
  const { data: microareas = [], refetch: refetchMicroareas } = useQuery({
    queryKey: ["territoryAreas"],
    queryFn: () => trpc.TerritoryArea.filter({ active: true }),
  });

  // Fetch ACS
  const { data: acsList = [] } = useQuery({
    queryKey: ["acsList"],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true }),
  });

  // Fetch Citizens
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizens"],
    queryFn: () => trpc.CitizenLocation.filter({}, "-created_date", 500),
  });

  // Create mutations
  const createUnitMutation = useMutation({
    mutationFn: data => trpc.HealthUnit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["healthUnits"]);
      toast.success("Unidade criada com sucesso!");
      resetDrawing();
    },
  });

  const updateUnitMutation = useMutation({
    mutationFn: ({ id, data }) => trpc.HealthUnit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["healthUnits"]);
      toast.success("Unidade atualizada!");
    },
  });

  const createMicroareaMutation = useMutation({
    mutationFn: data => trpc.TerritoryArea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["territoryAreas"]);
      toast.success("Microárea criada com sucesso!");
      resetDrawing();
    },
  });

  const updateMicroareaMutation = useMutation({
    mutationFn: ({ id, data }) => trpc.TerritoryArea.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(["territoryAreas"]);
      toast.success("Microárea atualizada!");
    },
  });

  const deleteMicroareaMutation = useMutation({
    mutationFn: id => trpc.TerritoryArea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["territoryAreas"]);
      setSelectedMicroarea(null);
      toast.success("Microárea excluída!");
    },
  });

  // Filter microareas by selected unit
  const filteredMicroareas = selectedUnit
    ? microareas.filter(m => m.team_id === selectedUnit.id)
    : microareas;

  // Filter ACS by selected unit
  const filteredACS = selectedUnit
    ? acsList.filter(a => a.unit_id === selectedUnit.id)
    : acsList;

  const resetDrawing = () => {
    setDrawMode(null);
    setDrawingPoints([]);
    setIsDialogOpen(false);
    setFormData({});
  };

  const handleMapClick = latlng => {
    if (drawMode) {
      setDrawingPoints(prev => [...prev, { lat: latlng.lat, lng: latlng.lng }]);
    }
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      toast.error("Desenhe pelo menos 3 pontos para formar um polígono");
      return;
    }
    setDialogType(drawMode);
    setIsDialogOpen(true);
  };

  const cancelDrawing = () => {
    resetDrawing();
    toast.info("Desenho cancelado");
  };

  const handleFormSubmit = e => {
    e.preventDefault();

    if (dialogType === "unidade") {
      createUnitMutation.mutate({
        name: formData.name,
        cnes_code: formData.cnes_code || "",
        type: "UBS",
        polygon_coordinates: drawingPoints,
        center_lat:
          drawingPoints.reduce((sum, p) => sum + p.lat, 0) /
          drawingPoints.length,
        center_lng:
          drawingPoints.reduce((sum, p) => sum + p.lng, 0) /
          drawingPoints.length,
        active: true,
      });
    } else if (dialogType === "microarea") {
      if (!selectedUnit) {
        toast.error("Selecione uma Unidade de Saúde primeiro");
        return;
      }

      const colorIndex = filteredMicroareas.length % microareaColors.length;
      createMicroareaMutation.mutate({
        name: formData.name,
        microarea_code: formData.microarea_code,
        team_id: selectedUnit.id,
        acs_id: formData.acs_id || null,
        acs_name: formData.acs_name || null,
        polygon_coordinates: drawingPoints,
        center_lat:
          drawingPoints.reduce((sum, p) => sum + p.lat, 0) /
          drawingPoints.length,
        center_lng:
          drawingPoints.reduce((sum, p) => sum + p.lng, 0) /
          drawingPoints.length,
        total_families: parseInt(formData.total_families) || 0,
        total_citizens: parseInt(formData.total_citizens) || 0,
        color: microareaColors[colorIndex],
        active: true,
      });
    }
  };

  const handleACSDrop = microareaId => {
    if (!draggedACS) return;

    const microarea = microareas.find(m => m.id === microareaId);
    if (!microarea) return;

    // Validate ACS belongs to the same unit
    if (
      draggedACS.unit_id &&
      microarea.team_id &&
      draggedACS.unit_id !== microarea.team_id
    ) {
      toast.error("ACS só pode ser atribuído a microáreas da própria Unidade");
      setDraggedACS(null);
      return;
    }

    updateMicroareaMutation.mutate({
      id: microareaId,
      data: {
        acs_id: draggedACS.id,
        acs_name: draggedACS.name,
      },
    });

    setDraggedACS(null);
    toast.success(`ACS ${draggedACS.name} atribuído à microárea`);
  };

  const exportGeoJSON = () => {
    const features = [];

    // Add units
    healthUnits.forEach(unit => {
      if (unit.polygon_coordinates?.length > 0) {
        features.push({
          type: "Feature",
          properties: {
            id: unit.id,
            name: unit.name,
            type: "unidade",
            cnes: unit.cnes_code,
          },
          geometry: {
            type: "Polygon",
            coordinates: [unit.polygon_coordinates.map(c => [c.lng, c.lat])],
          },
        });
      }
    });

    // Add microareas
    microareas.forEach(ma => {
      if (ma.polygon_coordinates?.length > 0) {
        features.push({
          type: "Feature",
          properties: {
            id: ma.id,
            name: ma.name,
            type: "microarea",
            microarea_code: ma.microarea_code,
            acs_name: ma.acs_name,
            unit_id: ma.team_id,
          },
          geometry: {
            type: "Polygon",
            coordinates: [ma.polygon_coordinates.map(c => [c.lng, c.lat])],
          },
        });
      }
    });

    const geojson = {
      type: "FeatureCollection",
      features,
    };

    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "territorio_sus_analytics.geojson";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("GeoJSON exportado!");
  };

  const defaultCenter = [
    runtimeConfig.municipality.center.lat,
    runtimeConfig.municipality.center.lng,
  ];

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <AnimatePresence mode="wait">
        <motion.aside
          initial={false}
          animate={{ width: panelCollapsed ? 0 : 380 }}
          className="bg-white border-r shadow-lg flex flex-col overflow-hidden relative z-20"
        >
          {!panelCollapsed && (
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <Layers className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="font-bold text-lg">
                      Remapeamento Territorial
                    </h1>
                    <p className="text-white/70 text-xs">Gestão de Áreas ACS</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{healthUnits.length}</p>
                    <p className="text-[10px] text-white/70">Unidades</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{microareas.length}</p>
                    <p className="text-[10px] text-white/70">Microáreas</p>
                  </div>
                  <div className="bg-white/10 rounded-lg p-2 text-center">
                    <p className="text-lg font-bold">{acsList.length}</p>
                    <p className="text-[10px] text-white/70">ACS</p>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col"
              >
                <TabsList className="grid grid-cols-3 mx-4 mt-4">
                  <TabsTrigger value="unidades" className="text-xs gap-1">
                    <Building2 className="w-3 h-3" />
                    Unidades
                  </TabsTrigger>
                  <TabsTrigger value="acs" className="text-xs gap-1">
                    <User className="w-3 h-3" />
                    ACS
                  </TabsTrigger>
                  <TabsTrigger value="microareas" className="text-xs gap-1">
                    <MapPin className="w-3 h-3" />
                    Microáreas
                  </TabsTrigger>
                </TabsList>

                {/* Tab: Unidades */}
                <TabsContent
                  value="unidades"
                  className="flex-1 flex flex-col p-4 pt-2"
                >
                  <Button
                    className="w-full gap-2 mb-3"
                    onClick={() => {
                      setDrawMode("unidade");
                      toast.info(
                        "Clique no mapa para desenhar a área da Unidade"
                      );
                    }}
                    disabled={drawMode !== null}
                  >
                    <Plus className="w-4 h-4" />
                    Criar Área de Unidade
                  </Button>

                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {healthUnits.map((unit, idx) => (
                        <Card
                          key={unit.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${selectedUnit?.id === unit.id ? "ring-2 ring-indigo-500" : ""}`}
                          onClick={() => {
                            setSelectedUnit(
                              selectedUnit?.id === unit.id ? null : unit
                            );
                            setActiveTab("microareas");
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{
                                  backgroundColor:
                                    unitColors[idx % unitColors.length],
                                }}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">
                                  {unit.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  CNES: {unit.cnes_code || "N/A"}
                                </p>
                              </div>
                              <Badge variant="outline" className="text-xs">
                                {
                                  microareas.filter(m => m.team_id === unit.id)
                                    .length
                                }{" "}
                                MA
                              </Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {healthUnits.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhuma unidade cadastrada</p>
                          <p className="text-xs">
                            Clique em "Criar Área de Unidade"
                          </p>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Tab: ACS */}
                <TabsContent
                  value="acs"
                  className="flex-1 flex flex-col p-4 pt-2"
                >
                  <p className="text-xs text-gray-500 mb-3">
                    Arraste um ACS para atribuir a uma microárea
                  </p>

                  <ScrollArea className="flex-1">
                    <div className="space-y-2">
                      {filteredACS.map(acs => {
                        const assignedMicroarea = microareas.find(
                          m => m.acs_id === acs.id
                        );
                        return (
                          <Card
                            key={acs.id}
                            className="cursor-grab active:cursor-grabbing hover:shadow-md transition-all"
                            draggable
                            onDragStart={() => setDraggedACS(acs)}
                            onDragEnd={() => setDraggedACS(null)}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center gap-3">
                                <GripVertical className="w-4 h-4 text-gray-400" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">
                                    {acs.name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Matrícula: {acs.cns || "N/A"}
                                  </p>
                                </div>
                                {assignedMicroarea ? (
                                  <Badge className="bg-green-100 text-green-700 text-xs">
                                    MA {assignedMicroarea.microarea_code}
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="text-xs text-amber-600 border-amber-300"
                                  >
                                    Sem área
                                  </Badge>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}

                      {filteredACS.length === 0 && (
                        <div className="text-center py-8 text-gray-400">
                          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">Nenhum ACS encontrado</p>
                          {selectedUnit && (
                            <p className="text-xs">Para esta unidade</p>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>

                {/* Tab: Microáreas */}
                <TabsContent
                  value="microareas"
                  className="flex-1 flex flex-col p-4 pt-2"
                >
                  {selectedUnit ? (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="font-medium text-sm">
                            {selectedUnit.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {filteredMicroareas.length} microáreas
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="gap-1"
                          onClick={() => {
                            setDrawMode("microarea");
                            toast.info(
                              "Clique no mapa para desenhar a microárea"
                            );
                          }}
                          disabled={drawMode !== null}
                        >
                          <Plus className="w-3 h-3" />
                          Nova Microárea
                        </Button>
                      </div>

                      <ScrollArea className="flex-1">
                        <div className="space-y-2">
                          {filteredMicroareas.map(ma => (
                            <Card
                              key={ma.id}
                              className={`transition-all hover:shadow-md ${
                                selectedMicroarea?.id === ma.id
                                  ? "ring-2 ring-purple-500"
                                  : ""
                              } ${draggedACS ? "border-dashed border-2 border-indigo-300" : ""}`}
                              onClick={() => setSelectedMicroarea(ma)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => handleACSDrop(ma.id)}
                            >
                              <CardContent className="p-3">
                                <div className="flex items-start gap-3">
                                  <div
                                    className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5"
                                    style={{
                                      backgroundColor: ma.color || "#93c5fd",
                                    }}
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="font-medium text-sm">
                                        {ma.name}
                                      </p>
                                      <Badge
                                        variant="outline"
                                        className="text-xs"
                                      >
                                        {ma.microarea_code}
                                      </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                                      <span className="flex items-center gap-1">
                                        <Users className="w-3 h-3" />
                                        {ma.total_citizens || 0} cidadãos
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Home className="w-3 h-3" />
                                        {ma.total_families || 0} famílias
                                      </span>
                                    </div>
                                    <div className="mt-1.5 flex items-center justify-between">
                                      <span className="text-xs">
                                        {ma.acs_name ? (
                                          <span className="text-green-600 flex items-center gap-1">
                                            <Check className="w-3 h-3" />
                                            {ma.acs_name}
                                          </span>
                                        ) : (
                                          <span className="text-amber-600 flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" />
                                            Sem ACS atribuído
                                          </span>
                                        )}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        onClick={e => {
                                          e.stopPropagation();
                                          deleteMicroareaMutation.mutate(ma.id);
                                        }}
                                      >
                                        <Trash2 className="w-3 h-3 text-red-500" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Selecione uma Unidade</p>
                        <p className="text-xs">Para ver suas microáreas</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              {/* Footer Actions */}
              <div className="p-4 border-t bg-gray-50">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 gap-1"
                    onClick={exportGeoJSON}
                  >
                    <Download className="w-4 h-4" />
                    Exportar
                  </Button>
                  <Button
                    className="flex-1 gap-1"
                    onClick={() => toast.success("Território salvo!")}
                  >
                    <Save className="w-4 h-4" />
                    Salvar
                  </Button>
                </div>
              </div>
            </div>
          )}
        </motion.aside>
      </AnimatePresence>

      {/* Collapse Toggle */}
      <button
        className="absolute left-0 top-1/2 -translate-y-1/2 z-30 bg-white shadow-lg rounded-r-lg p-2 hover:bg-gray-50 transition-all"
        style={{ left: panelCollapsed ? 0 : 380 }}
        onClick={() => setPanelCollapsed(!panelCollapsed)}
      >
        {panelCollapsed ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <ChevronLeft className="w-4 h-4" />
        )}
      </button>

      {/* Map */}
      <div className="flex-1 relative">
        {/* Drawing Mode Toolbar */}
        <AnimatePresence>
          {drawMode && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-white rounded-xl shadow-xl p-4"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-3 h-3 rounded-full ${drawMode === "unidade" ? "bg-blue-500" : "bg-purple-500"}`}
                  />
                  <span className="font-medium">
                    {drawMode === "unidade"
                      ? "Desenhando Área de Unidade"
                      : "Desenhando Microárea"}
                  </span>
                </div>
                <Separator orientation="vertical" className="h-6" />
                <span className="text-sm text-gray-500">
                  {drawingPoints.length} pontos
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={cancelDrawing}>
                    <X className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={finishDrawing}
                    disabled={drawingPoints.length < 3}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Finalizar
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <MapContainer
          center={defaultCenter}
          zoom={12}
          style={{ height: "100%", width: "100%" }}
          className="z-10"
        >
          <DynamicTileLayer fallbackProvider="openstreetmap" />

          <MapEventHandler onMapClick={handleMapClick} drawMode={drawMode} />
          <MapBoundsController areas={microareas} units={healthUnits} />

          {/* Units polygons */}
          {healthUnits.map(
            (unit, idx) =>
              unit.polygon_coordinates?.length > 0 && (
                <Polygon
                  key={`unit-${unit.id}`}
                  positions={unit.polygon_coordinates.map(c => [c.lat, c.lng])}
                  pathOptions={{
                    color: unitColors[idx % unitColors.length],
                    fillColor: unitColors[idx % unitColors.length],
                    fillOpacity: 0.1,
                    weight: 3,
                    dashArray: selectedUnit?.id === unit.id ? "" : "10, 5",
                  }}
                  eventHandlers={{
                    click: () => setSelectedUnit(unit),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h4 className="font-bold text-gray-800 flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        {unit.name}
                      </h4>
                      <p className="text-xs text-gray-500 mt-1">
                        CNES: {unit.cnes_code || "N/A"}
                      </p>
                      <p className="text-xs text-gray-500">
                        {microareas.filter(m => m.team_id === unit.id).length}{" "}
                        microáreas
                      </p>
                    </div>
                  </Popup>
                </Polygon>
              )
          )}

          {/* Microareas polygons */}
          {microareas.map(
            ma =>
              ma.polygon_coordinates?.length > 0 && (
                <Polygon
                  key={`ma-${ma.id}`}
                  positions={ma.polygon_coordinates.map(c => [c.lat, c.lng])}
                  pathOptions={{
                    color: ma.color || "#93c5fd",
                    fillColor: ma.color || "#93c5fd",
                    fillOpacity: selectedMicroarea?.id === ma.id ? 0.5 : 0.3,
                    weight: selectedMicroarea?.id === ma.id ? 3 : 2,
                  }}
                  eventHandlers={{
                    click: () => setSelectedMicroarea(ma),
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-gray-800">{ma.name}</h4>
                        <Badge>{ma.microarea_code}</Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p className="flex justify-between">
                          <span className="text-gray-500">ACS:</span>
                          <span className="font-medium">
                            {ma.acs_name || "Não atribuído"}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-500">Cidadãos:</span>
                          <span className="font-medium">
                            {ma.total_citizens || 0}
                          </span>
                        </p>
                        <p className="flex justify-between">
                          <span className="text-gray-500">Famílias:</span>
                          <span className="font-medium">
                            {ma.total_families || 0}
                          </span>
                        </p>
                      </div>
                    </div>
                  </Popup>
                </Polygon>
              )
          )}

          {/* Drawing preview */}
          {drawingPoints.length > 0 && (
            <>
              {drawingPoints.map((point, idx) => (
                <Marker key={idx} position={[point.lat, point.lng]} />
              ))}
              {drawingPoints.length >= 2 && (
                <Polygon
                  positions={drawingPoints.map(p => [p.lat, p.lng])}
                  pathOptions={{
                    color: drawMode === "unidade" ? "#3b82f6" : "#8b5cf6",
                    fillColor: drawMode === "unidade" ? "#3b82f6" : "#8b5cf6",
                    fillOpacity: 0.2,
                    weight: 2,
                    dashArray: "5, 10",
                  }}
                />
              )}
            </>
          )}
        </MapContainer>
      </div>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {dialogType === "unidade"
                ? "Nova Unidade de Saúde"
                : "Nova Microárea"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={formData.name || ""}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={
                  dialogType === "unidade" ? "UBS Centro" : "Microárea 01"
                }
                required
              />
            </div>

            {dialogType === "unidade" && (
              <div className="space-y-2">
                <Label>Código CNES</Label>
                <Input
                  value={formData.cnes_code || ""}
                  onChange={e =>
                    setFormData({ ...formData, cnes_code: e.target.value })
                  }
                  placeholder="1234567"
                />
              </div>
            )}

            {dialogType === "microarea" && (
              <>
                <div className="space-y-2">
                  <Label>Código da Microárea</Label>
                  <Input
                    value={formData.microarea_code || ""}
                    onChange={e =>
                      setFormData({
                        ...formData,
                        microarea_code: e.target.value,
                      })
                    }
                    placeholder="001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>ACS Responsável</Label>
                  <Select
                    value={formData.acs_id || ""}
                    onValueChange={v => {
                      const acs = acsList.find(a => a.id === v);
                      setFormData({
                        ...formData,
                        acs_id: v,
                        acs_name: acs?.name,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um ACS" />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredACS.map(acs => (
                        <SelectItem key={acs.id} value={acs.id}>
                          {acs.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Total de Famílias</Label>
                    <Input
                      type="number"
                      value={formData.total_families || ""}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          total_families: e.target.value,
                        })
                      }
                      placeholder="150"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total de Cidadãos</Label>
                    <Input
                      type="number"
                      value={formData.total_citizens || ""}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          total_citizens: e.target.value,
                        })
                      }
                      placeholder="750"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">
                Polígono com {drawingPoints.length} pontos
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">Criar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
