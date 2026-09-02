import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";

export default function VisitsFilters({
  filters,
  onFilterChange,
  onReset,
  units = [],
  teams = [],
  acsList = [],
}) {
  // Filter teams by selected unit
  const filteredTeams =
    filters.unit_id && filters.unit_id !== "all"
      ? teams.filter(t => t.unit_id === filters.unit_id)
      : teams;

  // Filter ACS by selected team
  const filteredACS =
    filters.team_id && filters.team_id !== "all"
      ? acsList.filter(a => a.team_id === filters.team_id)
      : filters.unit_id && filters.unit_id !== "all"
        ? acsList.filter(a => a.unit_id === filters.unit_id)
        : acsList;

  return (
    <Card className="border-0 shadow-md bg-white/90 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Data Início */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Data Início</Label>
            <Input
              type="date"
              value={filters.start_date || ""}
              onChange={e =>
                onFilterChange({ ...filters, start_date: e.target.value })
              }
              className="h-9"
            />
          </div>

          {/* Data Fim */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Data Fim</Label>
            <Input
              type="date"
              value={filters.end_date || ""}
              onChange={e =>
                onFilterChange({ ...filters, end_date: e.target.value })
              }
              className="h-9"
            />
          </div>

          {/* Unidade de Saúde */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Unidade de Saúde</Label>
            <Select
              value={filters.unit_id || "all"}
              onValueChange={v =>
                onFilterChange({
                  ...filters,
                  unit_id: v === "all" ? "" : v,
                  team_id: "", // Reset team when unit changes
                  acs_id: "", // Reset ACS when unit changes
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {units.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>
                    {unit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipe */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">Equipe</Label>
            <Select
              value={filters.team_id || "all"}
              onValueChange={v =>
                onFilterChange({
                  ...filters,
                  team_id: v === "all" ? "" : v,
                  acs_id: "", // Reset ACS when team changes
                })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {filteredTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ACS */}
          <div className="space-y-1">
            <Label className="text-xs text-gray-500">ACS</Label>
            <Select
              value={filters.acs_id || "all"}
              onValueChange={v =>
                onFilterChange({ ...filters, acs_id: v === "all" ? "" : v })
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os ACS</SelectItem>
                {filteredACS.map(acs => (
                  <SelectItem key={acs.id} value={acs.id}>
                    {acs.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reset Button */}
          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="h-9 gap-2"
            >
              <X className="w-4 h-4" />
              Limpar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
