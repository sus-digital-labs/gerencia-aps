import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  Users,
  Plus,
  Search,
  Building2,
  MapPin,
  UserCheck,
  Edit2,
  Trash2,
  Trophy,
  Target,
  TrendingUp,
  Star,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

const teamTypeColors = {
  eSF: "bg-blue-100 text-blue-700 border-blue-200",
  eAP: "bg-cyan-100 text-cyan-700 border-cyan-200",
  eSB: "bg-purple-100 text-purple-700 border-purple-200",
  eMulti: "bg-orange-100 text-orange-700 border-orange-200",
  NASF: "bg-pink-100 text-pink-700 border-pink-200",
};

export default function Teams() {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);
  const [formData, setFormData] = useState({
    ine_code: "",
    name: "",
    type: "eSF",
    coordinator_name: "",
    population_covered: "",
    microareas_count: "",
  });

  const queryClient = useQueryClient();

  // Fetch teams
  const { data: teams = [], isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => trpc.HealthTeam.filter({}, "name"),
  });

  // Fetch units
  const { data: units = [] } = useQuery({
    queryKey: ["units"],
    queryFn: () => trpc.HealthUnit.filter({ active: true }),
  });

  // Fetch scores for ranking
  const { data: scores = [] } = useQuery({
    queryKey: ["latestScores"],
    queryFn: () =>
      trpc.TeamScore.filter(
        {
          month: new Date().getMonth() + 1,
          year: new Date().getFullYear(),
        },
        "-total_score"
      ),
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: data => {
      if (editingTeam) {
        return trpc.HealthTeam.update(editingTeam.id, data);
      }
      return trpc.HealthTeam.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["teams"]);
      setIsDialogOpen(false);
      resetForm();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: id => trpc.HealthTeam.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["teams"]),
  });

  // Filter teams
  const filteredTeams = teams.filter(team => {
    const matchesSearch =
      !search ||
      team.name?.toLowerCase().includes(search.toLowerCase()) ||
      team.ine_code?.includes(search);
    const matchesType = filterType === "all" || team.type === filterType;
    return matchesSearch && matchesType;
  });

  const resetForm = () => {
    setFormData({
      ine_code: "",
      name: "",
      type: "eSF",
      coordinator_name: "",
      population_covered: "",
      microareas_count: "",
    });
    setEditingTeam(null);
  };

  const handleEdit = team => {
    setEditingTeam(team);
    setFormData({
      ine_code: team.ine_code || "",
      name: team.name || "",
      type: team.type || "eSF",
      coordinator_name: team.coordinator_name || "",
      population_covered: team.population_covered || "",
      microareas_count: team.microareas_count || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      population_covered: formData.population_covered
        ? parseInt(formData.population_covered)
        : null,
      microareas_count: formData.microareas_count
        ? parseInt(formData.microareas_count)
        : null,
      active: true,
    });
  };

  const getTeamScore = teamId => {
    return scores.find(s => s.team_id === teamId);
  };

  const getTeamRank = teamId => {
    const index = scores.findIndex(s => s.team_id === teamId);
    return index >= 0 ? index + 1 : null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">
                  Equipes de Saúde
                </h1>
                <p className="text-white/70">
                  Gerenciamento de equipes do município
                </p>
              </div>
            </div>
            <Dialog
              open={isDialogOpen}
              onOpenChange={open => {
                setIsDialogOpen(open);
                if (!open) resetForm();
              }}
            >
              <DialogTrigger asChild>
                <Button className="gap-2 bg-white text-blue-600 hover:bg-blue-50">
                  <Plus className="w-4 h-4" />
                  Nova Equipe
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingTeam ? "Editar Equipe" : "Nova Equipe"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Código INE</Label>
                      <Input
                        value={formData.ine_code}
                        onChange={e =>
                          setFormData({ ...formData, ine_code: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo</Label>
                      <Select
                        value={formData.type}
                        onValueChange={v =>
                          setFormData({ ...formData, type: v })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="eSF">eSF</SelectItem>
                          <SelectItem value="eAP">eAP</SelectItem>
                          <SelectItem value="eSB">eSB</SelectItem>
                          <SelectItem value="eMulti">eMulti</SelectItem>
                          <SelectItem value="NASF">NASF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome da Equipe</Label>
                    <Input
                      value={formData.name}
                      onChange={e =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Coordenador</Label>
                    <Input
                      value={formData.coordinator_name}
                      onChange={e =>
                        setFormData({
                          ...formData,
                          coordinator_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>População</Label>
                      <Input
                        type="number"
                        value={formData.population_covered}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            population_covered: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Microáreas</Label>
                      <Input
                        type="number"
                        value={formData.microareas_count}
                        onChange={e =>
                          setFormData({
                            ...formData,
                            microareas_count: e.target.value,
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
                    <Button type="submit" disabled={saveMutation.isPending}>
                      {saveMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-200" />
                <div>
                  <p className="text-white/70 text-sm">Total de Equipes</p>
                  <p className="text-2xl font-bold">{teams.length}</p>
                </div>
              </div>
            </motion.div>
            {["eSF", "eSB", "eMulti"].map((type, i) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: (i + 1) * 0.1 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full ${type === "eSF" ? "bg-blue-400" : type === "eSB" ? "bg-purple-400" : "bg-orange-400"} flex items-center justify-center text-white font-bold text-sm`}
                  >
                    {type.charAt(1)}
                  </div>
                  <div>
                    <p className="text-white/70 text-sm">{type}</p>
                    <p className="text-2xl font-bold">
                      {teams.filter(t => t.type === type).length}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nome ou código INE..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="eSF">eSF</SelectItem>
                  <SelectItem value="eAP">eAP</SelectItem>
                  <SelectItem value="eSB">eSB</SelectItem>
                  <SelectItem value="eMulti">eMulti</SelectItem>
                  <SelectItem value="NASF">NASF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Teams Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {filteredTeams.map((team, index) => {
              const score = getTeamScore(team.id);
              const rank = getTeamRank(team.id);
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all overflow-hidden">
                    <div
                      className={`h-1 ${team.type === "eSF" ? "bg-blue-500" : team.type === "eSB" ? "bg-purple-500" : team.type === "eMulti" ? "bg-orange-500" : "bg-gray-400"}`}
                    />
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-12 h-12 rounded-xl ${team.type === "eSF" ? "bg-blue-100" : team.type === "eSB" ? "bg-purple-100" : team.type === "eMulti" ? "bg-orange-100" : "bg-gray-100"} flex items-center justify-center`}
                          >
                            <Users
                              className={`w-6 h-6 ${team.type === "eSF" ? "text-blue-600" : team.type === "eSB" ? "text-purple-600" : team.type === "eMulti" ? "text-orange-600" : "text-gray-600"}`}
                            />
                          </div>
                          <div>
                            <h3 className="font-bold text-gray-800">
                              {team.name}
                            </h3>
                            <div className="flex items-center gap-2">
                              <Badge className={teamTypeColors[team.type]}>
                                {team.type}
                              </Badge>
                              <span className="text-xs text-gray-400">
                                {team.ine_code}
                              </span>
                            </div>
                          </div>
                        </div>
                        {rank && rank <= 3 && (
                          <div
                            className={`p-2 rounded-lg ${rank === 1 ? "bg-yellow-100" : rank === 2 ? "bg-gray-100" : "bg-orange-100"}`}
                          >
                            <Trophy
                              className={`w-5 h-5 ${rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : "text-orange-500"}`}
                            />
                          </div>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">População</p>
                          <p className="font-bold text-gray-800">
                            {team.population_covered?.toLocaleString() || "-"}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-xs text-gray-500">Microáreas</p>
                          <p className="font-bold text-gray-800">
                            {team.microareas_count || "-"}
                          </p>
                        </div>
                      </div>

                      {score && (
                        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg mb-4">
                          <div className="flex items-center gap-2">
                            <Star className="w-4 h-4 text-indigo-500" />
                            <span className="text-sm font-medium text-indigo-700">
                              Pontuação
                            </span>
                          </div>
                          <span className="font-bold text-indigo-600">
                            {score.total_score?.toLocaleString()} pts
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handleEdit(team)}
                        >
                          <Edit2 className="w-4 h-4 mr-1" />
                          Editar
                        </Button>
                        <Link
                          to={createPageUrl(`Dashboard?teamId=${team.id}`)}
                          className="flex-1"
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                          >
                            <Target className="w-4 h-4 mr-1" />
                            Ver Indicadores
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredTeams.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">Nenhuma equipe encontrada</p>
            <p className="text-sm">
              Tente ajustar os filtros ou cadastre uma nova equipe
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
