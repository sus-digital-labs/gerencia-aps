import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  AlertTriangle,
  Eye,
  ChevronLeft,
  ChevronRight,
  FileText,
  Calendar,
  MapPin,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const visitTypeLabels = {
  cadastro: "Cadastro",
  acompanhamento: "Acompanhamento",
  busca_ativa: "Busca Ativa",
  campanha: "Campanha",
  entrega_medicamento: "Entrega Med.",
  outros: "Outros",
};

const desfechoLabels = {
  visita_realizada: "Realizada",
  ausente: "Ausente",
  recusou: "Recusou",
  mudou: "Mudou",
  obito: "Óbito",
  outros: "Outros",
};

const desfechoColors = {
  visita_realizada: "bg-green-100 text-green-700",
  ausente: "bg-amber-100 text-amber-700",
  recusou: "bg-red-100 text-red-700",
  mudou: "bg-blue-100 text-blue-700",
  obito: "bg-gray-100 text-gray-700",
  outros: "bg-slate-100 text-slate-700",
};

export default function VisitsTable({
  visits = [],
  onViewDetails,
  pageSize = 15,
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter visits by search
  const filteredVisits = useMemo(() => {
    if (!search) return visits;
    const searchLower = search.toLowerCase();
    return visits.filter(
      v =>
        v.citizen_name?.toLowerCase().includes(searchLower) ||
        v.acs_name?.toLowerCase().includes(searchLower) ||
        v.address?.toLowerCase().includes(searchLower) ||
        v.microarea?.includes(search)
    );
  }, [visits, search]);

  // Pagination
  const totalPages = Math.ceil(filteredVisits.length / pageSize);
  const paginatedVisits = filteredVisits.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Check for inconsistencies
  const hasInconsistency = visit => {
    return !visit.citizen_cns || !visit.latitude || !visit.longitude;
  };

  return (
    <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-green-600" />
            Visitas no Município
          </CardTitle>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              {filteredVisits.length} visitas
            </Badge>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={e => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Data/Hora</TableHead>
                <TableHead className="font-semibold">
                  Responsável Familiar
                </TableHead>
                <TableHead className="font-semibold">Endereço</TableHead>
                <TableHead className="font-semibold">ACS Responsável</TableHead>
                <TableHead className="font-semibold">Tipo</TableHead>
                <TableHead className="font-semibold">Desfecho</TableHead>
                <TableHead className="font-semibold text-center">⚠️</TableHead>
                <TableHead className="font-semibold text-right">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedVisits.map((visit, idx) => (
                <TableRow key={visit.id || idx} className="hover:bg-gray-50">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium">
                          {visit.visit_date
                            ? format(new Date(visit.visit_date), "dd/MM/yyyy", {
                                locale: ptBR,
                              })
                            : "-"}
                        </p>
                        <p className="text-xs text-gray-500">
                          {visit.visit_time || "-"}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span
                        className="font-medium truncate max-w-[150px]"
                        title={visit.citizen_name}
                      >
                        {visit.citizen_name || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span
                        className="truncate max-w-[180px]"
                        title={visit.address}
                      >
                        {visit.address || "-"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{visit.acs_name || "-"}</span>
                    <p className="text-xs text-gray-500">
                      MA: {visit.microarea || "-"}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {visitTypeLabels[visit.visit_type] || visit.visit_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={`text-xs ${desfechoColors[visit.desfecho] || "bg-gray-100 text-gray-700"}`}
                    >
                      {desfechoLabels[visit.desfecho] || visit.desfecho}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {hasInconsistency(visit) && (
                      <AlertTriangle
                        className="w-4 h-4 text-amber-500 mx-auto"
                        title="Pendências cadastrais"
                      />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      to={createPageUrl(
                        `ACSTimeline?visit_id=${visit.id}&acs_id=${visit.acs_id}&date=${visit.visit_date}`
                      )}
                    >
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="w-4 h-4" />
                        Detalhar
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {paginatedVisits.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-8 text-gray-500"
                  >
                    Nenhuma visita encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-gray-500">
              Mostrando {(currentPage - 1) * pageSize + 1} a{" "}
              {Math.min(currentPage * pageSize, filteredVisits.length)} de{" "}
              {filteredVisits.length}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm font-medium px-2">
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
