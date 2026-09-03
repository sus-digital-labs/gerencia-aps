import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart2, Sun, Sunset, Moon, Eye, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

interface ProductionTableProps {
  visits?: any[];
  acsList?: any[];
}

export default function ProductionTable({ visits = [], acsList = [] }: ProductionTableProps) {
  // Calculate production by ACS with shift breakdown
  const productionData = useMemo(() => {
    const acsProduction: Record<string, any> = {};

    // Initialize with all ACS
    acsList.forEach(acs => {
      acsProduction[acs.id] = {
        id: acs.id,
        name: acs.name,
        microarea: acs.microarea,
        morning: 0, // 06:00-11:59
        afternoon: 0, // 12:00-17:59
        night: 0, // 18:00-05:59
        total: 0
      };
    });

    // Count visits by shift
    visits.forEach(visit => {
      const acsId = visit.acs_id;
      if (!acsProduction[acsId]) {
        acsProduction[acsId] = {
          id: acsId,
          name: visit.acs_name || 'Desconhecido',
          microarea: visit.microarea || '-',
          morning: 0,
          afternoon: 0,
          night: 0,
          total: 0
        };
      }

      // Parse visit time
      let hour = 12; // default to afternoon
      if (visit.visit_time) {
        const timeParts = visit.visit_time.split(':');
        hour = parseInt(timeParts[0], 10);
      } else if (visit.visit_date) {
        const date = new Date(visit.visit_date);
        hour = date.getHours();
      }

      // Categorize by shift
      if (hour >= 6 && hour < 12) {
        acsProduction[acsId].morning++;
      } else if (hour >= 12 && hour < 18) {
        acsProduction[acsId].afternoon++;
      } else {
        acsProduction[acsId].night++;
      }
      acsProduction[acsId].total++;
    });

    // Convert to array and sort by total
    return Object.values(acsProduction)
      .filter(p => p.total > 0 || acsList.some(a => a.id === p.id))
      .sort((a, b) => b.total - a.total);
  }, [visits, acsList]);

  // Calculate totals
  const totals = useMemo(() => {
    return productionData.reduce((acc, curr) => ({
      morning: acc.morning + curr.morning,
      afternoon: acc.afternoon + curr.afternoon,
      night: acc.night + curr.night,
      total: acc.total + curr.total
    }), { morning: 0, afternoon: 0, night: 0, total: 0 });
  }, [productionData]);

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-green-600" />
            Produção por ACS
          </CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm">
              <Sun className="w-4 h-4 text-amber-500" />
              <span className="text-gray-600">Manhã: {totals.morning}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Sunset className="w-4 h-4 text-orange-500" />
              <span className="text-gray-600">Tarde: {totals.afternoon}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-gray-600">Noite: {totals.night}</span>
            </div>
            <Badge className="bg-green-100 text-green-700">
              Total: {totals.total}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">#</TableHead>
                <TableHead className="font-semibold">ACS Responsável</TableHead>
                <TableHead className="font-semibold">Microárea</TableHead>
                <TableHead className="font-semibold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Sun className="w-4 h-4 text-amber-500" />
                    Manhã
                  </div>
                  <span className="text-xs text-gray-400 font-normal">06:00-11:59</span>
                </TableHead>
                <TableHead className="font-semibold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Sunset className="w-4 h-4 text-orange-500" />
                    Tarde
                  </div>
                  <span className="text-xs text-gray-400 font-normal">12:00-17:59</span>
                </TableHead>
                <TableHead className="font-semibold text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Moon className="w-4 h-4 text-indigo-500" />
                    Noite
                  </div>
                  <span className="text-xs text-gray-400 font-normal">18:00-05:59</span>
                </TableHead>
                <TableHead className="font-semibold text-center">Total</TableHead>
                <TableHead className="font-semibold text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionData.map((prod, idx) => (
                <TableRow key={prod.id || idx} className="hover:bg-gray-50">
                  <TableCell>
                    <Badge variant={idx < 3 ? 'default' : 'outline'} className={
                      idx === 0 ? 'bg-amber-500' :
                      idx === 1 ? 'bg-gray-400' :
                      idx === 2 ? 'bg-amber-700' : ''
                    }>
                      {idx + 1}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{prod.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">MA {prod.microarea}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-amber-600">{prod.morning}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-orange-600">{prod.afternoon}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium text-indigo-600">{prod.night}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className="bg-green-100 text-green-700 font-bold">
                      {prod.total}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link to={createPageUrl(`ACSTimeline?acs_id=${prod.id}`)}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" />
                        Ver Timeline
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {productionData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                    Nenhum dado de produção encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
