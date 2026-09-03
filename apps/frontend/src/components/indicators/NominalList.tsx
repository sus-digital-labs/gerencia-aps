import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ExternalLink, AlertCircle, CheckCircle2, Filter, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface Citizen {
  citizen_name?: string;
  citizen_cns?: string;
  birth_date?: string;
  status?: string;
  pending_criteria?: string[];
  [key: string]: any;
}

export interface NominalListProps {
  citizens?: Citizen[];
  type?: 'all' | 'numerator' | 'denominator' | 'pending';
  indicatorCode?: string;
  onOpenProntuario?: (citizen: Citizen) => void;
  title?: string;
}

export default function NominalList({ 
  citizens = [], 
  type = 'all',
  indicatorCode,
  onOpenProntuario,
  title
}: NominalListProps) {
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredCitizens = citizens.filter(c => 
    c.citizen_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.citizen_cns?.includes(search)
  );

  const totalPages = Math.ceil(filteredCitizens.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedCitizens = filteredCitizens.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'completo':
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="w-3 h-3 mr-1" />Completo</Badge>;
      case 'pendente':
        return <Badge className="bg-amber-100 text-amber-700"><AlertCircle className="w-3 h-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Não Elegível</Badge>;
    }
  };

  const titles: Record<string, string> = {
    all: 'Lista Nominal Completa',
    numerator: 'Cidadãos no Numerador',
    denominator: 'Cidadãos no Denominador',
    pending: 'Cidadãos com Pendências'
  };

  return (
    <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
      <CardHeader className="border-b bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <CardTitle className="text-xl font-bold text-gray-800">
            {title || titles[type]}
            {indicatorCode && <Badge className="ml-3 bg-blue-100 text-blue-700">{indicatorCode}</Badge>}
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou CNS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </Button>
          </div>
        </div>
        <div className="flex gap-4 mt-4 text-sm text-gray-600">
          <span>Total: <strong>{citizens.length}</strong></span>
          {type === 'pending' && (
            <span className="text-amber-600">
              Com Pendências: <strong>{citizens.filter(c => c.status === 'pendente').length}</strong>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">CNS</TableHead>
                <TableHead className="font-semibold">Nome</TableHead>
                <TableHead className="font-semibold">Data de Nasc.</TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                {type === 'pending' && (
                  <TableHead className="font-semibold">Critérios Pendentes</TableHead>
                )}
                <TableHead className="font-semibold text-center">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {paginatedCitizens.map((citizen, index) => (
                  <motion.tr
                    key={citizen.citizen_cns || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <TableCell className="font-mono text-sm">{citizen.citizen_cns}</TableCell>
                    <TableCell className="font-medium">{citizen.citizen_name}</TableCell>
                    <TableCell className="text-gray-600">
                      {citizen.birth_date ? new Date(citizen.birth_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(citizen.status)}</TableCell>
                    {type === 'pending' && (
                      <TableCell>
                        {citizen.pending_criteria && citizen.pending_criteria.length > 0 ? (
                          <ul className="text-sm space-y-1">
                            {citizen.pending_criteria.map((criteria, idx) => (
                              <li key={idx} className="flex items-start gap-1 text-red-600">
                                <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                <span>{criteria}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                        onClick={() => onOpenProntuario?.(citizen)}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir PEC
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        </div>

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-gray-600">
              Mostrando {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredCitizens.length)} de {filteredCitizens.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-3">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
