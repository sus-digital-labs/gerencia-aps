import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Plus,
  Search,
  Layers,
  Users,
  Home,
  Edit2,
  Trash2,
  Eye,
  RefreshCw,
  Download,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TerritoryMap from "../components/territory/TerritoryMap";
import AreaStatsCard from "../components/territory/AreaStatsCard";

const areaColors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

export default function TerritoryMapping() {
  const [search, setSearch] = useState("");
  const [selectedArea, setSelectedArea] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterMicroarea, setFilterMicroarea] = useState("all");
  const [formData, setFormData] = useState({
    name: "",
    microarea_code: "",
    acs_name: "",
    center_lat: "",
    center_lng: "",
    total_families: "",
    total_citizens: "",
  });

  const queryClient = useQueryClient();

  // Fetch areas
  const {
    data: areas = [],
    isLoading: loadingAreas,
    refetch,
  } = useQuery({
    queryKey: ["territoryAreas"],
    queryFn: () =>
      trpc.TerritoryArea.filter({ active: true }, "microarea_code"),
  });

  // Fetch citizens
  const { data: citizens = [] } = useQuery({
    queryKey: ["citizenLocations"],
    queryFn: () => trpc.CitizenLocation.filter({}, "-created_date", 1000),
  });

  // Fetch ACS
  const { data: acsList = [] } = useQuery({
    queryKey: ["acs"],
    queryFn: () => trpc.CommunityHealthAgent.filter({ active: true }),
  });

  // Fetch POIs
  const { data: pointsOfInterest = [] } = useQuery({
    queryKey: ["pointsOfInterest"],
    queryFn: () => trpc.PointOfInterest.filter({ active: true }),
  });

  // Create POI mutation
  const createPOIMutation = useMutation({
    mutationFn: data => trpc.PointOfInterest.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["pointsOfInterest"]);
    },
  });

  // Create area mutation
  const createMutation = useMutation({
    mutationFn: data => trpc.TerritoryArea.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["territoryAreas"]);
      setIsDialogOpen(false);
      resetForm();
    },
  });

  // Delete area mutation
  const deleteMutation = useMutation({
    mutationFn: id => trpc.TerritoryArea.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["territoryAreas"]);
      setSelectedArea(null);
    },
  });

  // Filter areas
  const filteredAreas = areas.filter(area => {
    const matchesSearch =
      !search ||
      area.name?.toLowerCase().includes(search.toLowerCase()) ||
      area.microarea_code?.includes(search);
    const matchesMicroarea =
      filterMicroarea === "all" || area.microarea_code === filterMicroarea;
    return matchesSearch && matchesMicroarea;
  });

  // Filter citizens by selected area
  const filteredCitizens = selectedArea
    ? citizens.filter(c => c.microarea === selectedArea.microarea_code)
    : filterMicroarea !== "all"
      ? citizens.filter(c => c.microarea === filterMicroarea)
      : citizens;

  const resetForm = () => {
    setFormData({
      name: "",
      microarea_code: "",
      acs_name: "",
      center_lat: "",
      center_lng: "",
      total_families: "",
      total_citizens: "",
    });
  };

  const handleSubmit = e => {
    e.preventDefault();
    const colorIndex = areas.length % areaColors.length;
    createMutation.mutate({
      ...formData,
      center_lat: formData.center_lat ? parseFloat(formData.center_lat) : null,
      center_lng: formData.center_lng ? parseFloat(formData.center_lng) : null,
      total_families: formData.total_families
        ? parseInt(formData.total_families)
        : 0,
      total_citizens: formData.total_citizens
        ? parseInt(formData.total_citizens)
        : 0,
      color: areaColors[colorIndex],
      active: true,
    });
  };

  // Stats
  const totalCitizens = citizens.length;
  const totalFamilies = areas.reduce(
    (sum, a) => sum + (a.total_families || 0),
    0
  );
  const microareas = [...new Set(areas.map(a => a.microarea_code))];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Layers className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Mapeamento de Território
                </h1>
                <p className="text-white/70">
                  Geolocalização de cidadãos e áreas por microárea
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => refetch()}
                className="gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </Button>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-white text-indigo-600 hover:bg-indigo-50">
                    <Plus className="w-4 h-4" />
                    Nova Área
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Área</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Nome da Área/Bairro</Label>
                      <Input
                        value={formData.name}
                        onChange={e =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Código Microárea</Label>
                        <Input
                          value={formData.microarea_code}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              microarea_code: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>ACS Responsável</Label>
                        <Select
                          value={formData.acs_name}
                          onValueChange={v =>
                            setFormData({ ...formData, acs_name: v })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {acsList.map(acs => (
                              <SelectItem key={acs.id} value={acs.name}>
                                {acs.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Latitude Central</Label>
                        <Input
                          type="number"
                          step="any"
                          value={formData.center_lat}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              center_lat: e.target.value,
                            })
                          }
                          placeholder="-23.5505"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Longitude Central</Label>
                        <Input
                          type="number"
                          step="any"
                          value={formData.center_lng}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              center_lng: e.target.value,
                            })
                          }
                          placeholder="-46.6333"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Total de Famílias</Label>
                        <Input
                          type="number"
                          value={formData.total_families}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              total_families: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Total de Cidadãos</Label>
                        <Input
                          type="number"
                          value={formData.total_citizens}
                          onChange={e =>
                            setFormData({
                              ...formData,
                              total_citizens: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={createMutation.isPending}>
                        {createMutation.isPending ? "Salvando..." : "Cadastrar"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Layers className="w-8 h-8 text-indigo-200" />
                <div>
                  <p className="text-white/70 text-sm">Áreas Mapeadas</p>
                  <p className="text-2xl font-bold">{areas.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-8 h-8 text-purple-200" />
                <div>
                  <p className="text-white/70 text-sm">Microáreas</p>
                  <p className="text-2xl font-bold">{microareas.length}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-pink-200" />
                <div>
                  <p className="text-white/70 text-sm">Cidadãos</p>
                  <p className="text-2xl font-bold">{totalCitizens}</p>
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Home className="w-8 h-8 text-cyan-200" />
                <div>
                  <p className="text-white/70 text-sm">Famílias</p>
                  <p className="text-2xl font-bold">{totalFamilies}</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Filtros */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar área ou microárea..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterMicroarea}
                onValueChange={setFilterMicroarea}
              >
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Microárea" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Microáreas</SelectItem>
                  {microareas.map(ma => (
                    <SelectItem key={ma} value={ma}>
                      Microárea {ma}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedArea && (
                <Button variant="outline" onClick={() => setSelectedArea(null)}>
                  Limpar Seleção
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Mapa */}
          <div className="xl:col-span-3">
            <TerritoryMap
              areas={filteredAreas}
              citizens={filteredCitizens}
              pointsOfInterest={pointsOfInterest}
              selectedArea={selectedArea}
              onAreaClick={setSelectedArea}
              onAddPOI={poi =>
                createPOIMutation.mutate({ ...poi, active: true })
              }
            />
          </div>

          {/* Stats da Área */}
          <div className="space-y-6">
            <AreaStatsCard area={selectedArea} citizens={citizens} />

            {/* Lista de áreas */}
            <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-lg">Áreas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-80 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Área</TableHead>
                        <TableHead>MA</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAreas.map(area => (
                        <TableRow
                          key={area.id}
                          className={`cursor-pointer hover:bg-gray-50 ${selectedArea?.id === area.id ? "bg-indigo-50" : ""}`}
                          onClick={() => setSelectedArea(area)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: area.color }}
                              />
                              <span className="font-medium text-sm">
                                {area.name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {area.microarea_code}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={e => {
                                e.stopPropagation();
                                deleteMutation.mutate(area.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
