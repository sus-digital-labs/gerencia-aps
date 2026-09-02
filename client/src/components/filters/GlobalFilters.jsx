import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar, Building2, Users, MapPin, RotateCcw } from 'lucide-react';

const months = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

export default function GlobalFilters({
  filters,
  onFilterChange,
  units = [],
  teams = [],
  onReset
}) {
  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Período */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <Select
              value={String(filters.month || new Date().getMonth() + 1)}
              onValueChange={(v) => handleChange('month', parseInt(v))}
            >
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {months.map(m => (
                  <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(filters.year || currentYear)}
              onValueChange={(v) => handleChange('year', parseInt(v))}
            >
              <SelectTrigger className="w-24 bg-white">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(y => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          {/* Unidade */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-gray-400" />
            <Select
              value={filters.unitId || 'all'}
              onValueChange={(v) => handleChange('unitId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Todas as Unidades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Unidades</SelectItem>
                {units.map(unit => (
                  <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equipe */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <Select
              value={filters.teamId || 'all'}
              onValueChange={(v) => handleChange('teamId', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-48 bg-white">
                <SelectValue placeholder="Todas as Equipes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Equipes</SelectItem>
                {teams.map(team => (
                  <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Microárea */}
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <Select
              value={filters.microarea || 'all'}
              onValueChange={(v) => handleChange('microarea', v === 'all' ? null : v)}
            >
              <SelectTrigger className="w-36 bg-white">
                <SelectValue placeholder="Microárea" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                  <SelectItem key={n} value={String(n)}>Microárea {n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1" />

          {/* Reset */}
          <Button variant="ghost" size="sm" onClick={onReset} className="gap-2 text-gray-500">
            <RotateCcw className="w-4 h-4" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}