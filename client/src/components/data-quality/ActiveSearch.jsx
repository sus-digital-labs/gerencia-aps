import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, User, Loader2, Eye, FileText, ChevronDown, Filter, Grid, Table as TableIcon, ArrowUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import CitizenCard from '../citizens/CitizenCard';
import SavedSearches from '../search/SavedSearches';

export default function ActiveSearch() {
  const [searchParams, setSearchParams] = useState({
    nome: '',
    cpf: '',
    cns: '',
    nomeMae: '',
    endereco: '',
    microarea: '',
    condition: '',
    status: 'all'
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState('relevance'); // 'relevance', 'name', 'date'
  const [sortOrder, setSortOrder] = useState('asc');
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'active', 'inactive'
  const itemsPerPage = 12;

  // Fetch citizens for search
  const { data: allCitizens = [] } = useQuery({
    queryKey: ['citizenRecords'],
    queryFn: () => trpc.CitizenRecord.filter({}, 'no_cidadao', 1000)
  });

  // Get unique microareas for filter
  const microareas = useMemo(() => {
    const unique = new Set(allCitizens.map(c => c.microarea).filter(Boolean));
    return Array.from(unique).sort();
  }, [allCitizens]);

  // Filter and sort based on search
  const searchResults = useMemo(() => {
    if (!searchTerm && !searchParams.nome && !searchParams.cpf && !searchParams.cns && 
        !searchParams.nomeMae && !searchParams.endereco && !searchParams.microarea && 
        !searchParams.condition && searchParams.status === 'all' && activeFilter === 'all') {
      return [];
    }

    let filtered = allCitizens.filter(citizen => {
      // Active/Inactive filter
      if (activeFilter === 'active' && citizen.st_ativo !== 1) return false;
      if (activeFilter === 'inactive' && citizen.st_ativo === 1) return false;
      // Quick search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          citizen.no_cidadao?.toLowerCase().includes(term) ||
          citizen.nu_cpf?.includes(term) ||
          citizen.nu_cns?.includes(term) ||
          citizen.no_mae?.toLowerCase().includes(term) ||
          citizen.endereco?.toLowerCase().includes(term)
        );
      }

      // Advanced search
      let matches = true;
      if (searchParams.nome) {
        matches = matches && citizen.no_cidadao?.toLowerCase().includes(searchParams.nome.toLowerCase());
      }
      if (searchParams.cpf) {
        matches = matches && citizen.nu_cpf?.includes(searchParams.cpf.replace(/\D/g, ''));
      }
      if (searchParams.cns) {
        matches = matches && citizen.nu_cns?.includes(searchParams.cns);
      }
      if (searchParams.nomeMae) {
        matches = matches && citizen.no_mae?.toLowerCase().includes(searchParams.nomeMae.toLowerCase());
      }
      if (searchParams.endereco) {
        matches = matches && citizen.endereco?.toLowerCase().includes(searchParams.endereco.toLowerCase());
      }
      if (searchParams.microarea && searchParams.microarea !== 'all') {
        matches = matches && citizen.microarea === searchParams.microarea;
      }
      if (searchParams.condition && searchParams.condition !== 'all') {
        matches = matches && citizen.conditions?.includes(searchParams.condition);
      }
      if (searchParams.status !== 'all') {
        const hasCPF = citizen.nu_cpf && citizen.nu_cpf.length > 0;
        const hasCNS = citizen.nu_cns && citizen.nu_cns.length > 0;
        const hasAddress = citizen.endereco && citizen.endereco.length > 0;
        
        if (searchParams.status === 'completo') {
          matches = matches && hasCPF && hasCNS && hasAddress;
        } else if (searchParams.status === 'falta_cpf') {
          matches = matches && !hasCPF;
        } else if (searchParams.status === 'falta_cns') {
          matches = matches && !hasCNS;
        } else if (searchParams.status === 'sem_geo') {
          matches = matches && !hasAddress;
        }
      }
      return matches;
    });

    // Sort results
    filtered.sort((a, b) => {
      if (sortBy === 'relevance') {
        // Prioritize exact matches in name, then CPF, then CNS
        const term = searchTerm.toLowerCase();
        const aName = a.no_cidadao?.toLowerCase() || '';
        const bName = b.no_cidadao?.toLowerCase() || '';
        
        if (aName === term) return -1;
        if (bName === term) return 1;
        if (aName.startsWith(term)) return -1;
        if (bName.startsWith(term)) return 1;
        
        return aName.localeCompare(bName);
      } else if (sortBy === 'name') {
        const aName = a.no_cidadao || '';
        const bName = b.no_cidadao || '';
        return sortOrder === 'asc' ? aName.localeCompare(bName) : bName.localeCompare(aName);
      } else if (sortBy === 'date') {
        const aDate = new Date(a.updated_date || a.created_date || 0);
        const bDate = new Date(b.updated_date || b.created_date || 0);
        return sortOrder === 'asc' ? aDate - bDate : bDate - aDate;
      }
      return 0;
    });

    return filtered;
  }, [allCitizens, searchTerm, searchParams, sortBy, sortOrder, activeFilter]);

  // Pagination
  const totalPages = Math.ceil(searchResults.length / itemsPerPage);
  const paginatedResults = searchResults.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleQuickSearch = (e) => {
    e.preventDefault();
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500);
  };

  const handleAdvancedSearch = (e) => {
    e.preventDefault();
    setSearchTerm('');
    setIsSearching(true);
    setTimeout(() => setIsSearching(false), 500);
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchParams({ nome: '', cpf: '', cns: '', nomeMae: '', endereco: '', microarea: '', condition: '', status: 'all' });
    setActiveFilter('all');
    setCurrentPage(1);
  };

  const handleApplySavedSearch = (savedSearch) => {
    if (savedSearch.filters) {
      setSearchParams(savedSearch.filters);
    }
    if (savedSearch.search_term) {
      setSearchTerm(savedSearch.search_term);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick Search */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-t-lg">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Busca Ativa de Cadastro
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleQuickSearch} className="space-y-4">
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Busque por nome, CPF, CNS ou nome da mãe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 text-lg"
                />
              </div>
              <Button type="submit" className="h-12 px-8 bg-blue-600 hover:bg-blue-700">
                {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>
          </form>

          {/* Advanced Search */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <div className="mt-6 pt-6 border-t">
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="gap-2 w-full md:w-auto">
                  <Filter className="w-4 h-4" />
                  Filtros Avançados
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <form onSubmit={handleAdvancedSearch} className="mt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Cidadão</Label>
                      <Input
                        value={searchParams.nome}
                        onChange={(e) => setSearchParams({ ...searchParams, nome: e.target.value })}
                        placeholder="Nome completo ou parcial"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CPF</Label>
                      <Input
                        value={searchParams.cpf}
                        onChange={(e) => setSearchParams({ ...searchParams, cpf: e.target.value })}
                        placeholder="000.000.000-00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>CNS</Label>
                      <Input
                        value={searchParams.cns}
                        onChange={(e) => setSearchParams({ ...searchParams, cns: e.target.value })}
                        placeholder="Cartão Nacional de Saúde"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Nome da Mãe</Label>
                      <Input
                        value={searchParams.nomeMae}
                        onChange={(e) => setSearchParams({ ...searchParams, nomeMae: e.target.value })}
                        placeholder="Nome da mãe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Endereço</Label>
                      <Input
                        value={searchParams.endereco}
                        onChange={(e) => setSearchParams({ ...searchParams, endereco: e.target.value })}
                        placeholder="Rua, número, bairro"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Microárea</Label>
                      <Select value={searchParams.microarea} onValueChange={(v) => setSearchParams({ ...searchParams, microarea: v })}>
                        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as microáreas</SelectItem>
                          {microareas.map(ma => (
                            <SelectItem key={ma} value={ma}>{ma}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Condição de Saúde</Label>
                      <Select value={searchParams.condition} onValueChange={(v) => setSearchParams({ ...searchParams, condition: v })}>
                        <SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as condições</SelectItem>
                          <SelectItem value="hipertensao">Hipertensão</SelectItem>
                          <SelectItem value="diabetes">Diabetes</SelectItem>
                          <SelectItem value="gestante">Gestante</SelectItem>
                          <SelectItem value="tabagista">Tabagista</SelectItem>
                          <SelectItem value="alcoolista">Alcoolista</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Status Cadastral</Label>
                      <Select value={searchParams.status} onValueChange={(v) => setSearchParams({ ...searchParams, status: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="completo">Cadastro Completo</SelectItem>
                          <SelectItem value="falta_cpf">Falta CPF</SelectItem>
                          <SelectItem value="falta_cns">Falta CNS</SelectItem>
                          <SelectItem value="sem_geo">Sem Geolocalização</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ativo/Inativo</Label>
                      <Select value={activeFilter} onValueChange={setActiveFilter}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="active">Apenas Ativos</SelectItem>
                          <SelectItem value="inactive">Apenas Inativos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 mt-4">
                    <Button type="submit" variant="outline" className="gap-2">
                      <Search className="w-4 h-4" />
                      Buscar Avançado
                    </Button>
                    <Button type="button" variant="ghost" onClick={clearSearch}>
                      Limpar
                    </Button>
                  </div>
                </form>
              </CollapsibleContent>
            </div>
          </Collapsible>

          {/* Saved Searches */}
          <div className="mt-6 pt-6 border-t">
            <SavedSearches onApplySearch={handleApplySavedSearch} />
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {searchResults.length > 0 && (
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gray-50">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-gray-500" />
                Resultados da Busca
                <Badge className="ml-2 bg-blue-100 text-blue-700">{searchResults.length} encontrados</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Por Relevância</SelectItem>
                    <SelectItem value="name">Por Nome</SelectItem>
                    <SelectItem value="date">Por Data</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                  className="gap-1"
                >
                  <Grid className="w-4 h-4" />
                  Cards
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="gap-1"
                >
                  <TableIcon className="w-4 h-4" />
                  Tabela
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedResults.map((citizen) => (
                  <CitizenCard key={citizen.id} citizen={citizen} />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left p-3 font-medium text-sm">Nome</th>
                      <th className="text-left p-3 font-medium text-sm">Data Nasc.</th>
                      <th className="text-left p-3 font-medium text-sm">CPF</th>
                      <th className="text-left p-3 font-medium text-sm">CNS</th>
                      <th className="text-left p-3 font-medium text-sm">Status</th>
                      <th className="text-center p-3 font-medium text-sm">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedResults.map((citizen) => (
                      <tr key={citizen.id} className="border-b hover:bg-gray-50">
                        <td className="p-3 font-medium">{citizen.no_cidadao}</td>
                        <td className="p-3 text-sm">
                          {citizen.dt_nascimento 
                            ? new Date(citizen.dt_nascimento).toLocaleDateString('pt-BR') 
                            : '-'}
                        </td>
                        <td className="p-3 font-mono text-sm">{citizen.nu_cpf || '-'}</td>
                        <td className="p-3 font-mono text-sm">{citizen.nu_cns || '-'}</td>
                        <td className="p-3">
                          <Badge className={citizen.st_ativo === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                            {citizen.st_ativo === 1 ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Link to={createPageUrl(`CitizenProfile?id=${citizen.id}`)}>
                            <Button variant="outline" size="sm" className="gap-1">
                              <Eye className="w-4 h-4" />
                              Ver Perfil
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500">
                  Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, searchResults.length)} de {searchResults.length} resultados
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={currentPage === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setCurrentPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Próxima
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {(searchTerm || Object.values(searchParams).some(v => v && v !== 'all')) && searchResults.length === 0 && (
        <Card className="shadow-lg border-0 bg-white/90">
          <CardContent className="p-12 text-center text-gray-500">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhum cidadão encontrado</p>
            <p className="text-sm">Tente ajustar os termos de busca ou filtros</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}