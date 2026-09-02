import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Bug, MapPin, AlertTriangle, Search, Download, TrendingUp, 
  Home, Activity, ThermometerSun, CheckCircle2, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { format, subDays } from 'date-fns';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import { DynamicTileLayer } from '@/hooks/useMapConfig';
import 'leaflet/dist/leaflet.css';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';

const FOCUS_TYPE_LABELS = {
  caixa_dagua: 'Caixa d\'água',
  pneu: 'Pneu',
  vaso_planta: 'Vaso de Planta',
  lixo: 'Lixo/Entulho',
  piscina: 'Piscina',
  calha: 'Calha',
  outro: 'Outro'
};

const PROPERTY_TYPE_LABELS = {
  residencial: 'Residencial',
  comercial: 'Comercial',
  terreno_baldio: 'Terreno Baldio',
  ponto_estrategico: 'Ponto Estratégico',
  outro: 'Outro'
};

const DISEASE_COLORS = {
  dengue: '#ef4444',
  zika: '#f59e0b',
  chikungunya: '#8b5cf6',
  febre_amarela: '#eab308'
};

function MapController({ center }) {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function AedesVigilance() {
  const [mapView, setMapView] = useState('focos');
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    neighborhood: 'all',
    focusType: 'all'
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Fetch focus data
  const { data: focuses = [] } = useQuery({
    queryKey: ['aedesFocuses'],
    queryFn: () => trpc.AedesFocus.filter({}, '-visit_date', 500)
  });

  // Fetch disease cases
  const { data: cases = [] } = useQuery({
    queryKey: ['diseaseCases'],
    queryFn: () => trpc.DiseaseCase.filter({}, '-notification_date', 500)
  });

  // Filter data
  const filteredFocuses = useMemo(() => {
    let data = focuses;
    if (filters.startDate) data = data.filter(f => f.visit_date >= filters.startDate);
    if (filters.endDate) data = data.filter(f => f.visit_date <= filters.endDate);
    if (filters.neighborhood !== 'all') data = data.filter(f => f.neighborhood === filters.neighborhood);
    if (filters.focusType !== 'all') data = data.filter(f => f.focus_type === filters.focusType);
    if (search) {
      const term = search.toLowerCase();
      data = data.filter(f => f.address?.toLowerCase().includes(term) || f.neighborhood?.toLowerCase().includes(term));
    }
    return data;
  }, [focuses, filters, search]);

  const filteredCases = useMemo(() => {
    let data = cases;
    if (filters.startDate) data = data.filter(c => c.notification_date >= filters.startDate);
    if (filters.endDate) data = data.filter(c => c.notification_date <= filters.endDate);
    if (filters.neighborhood !== 'all') data = data.filter(c => c.neighborhood === filters.neighborhood);
    return data;
  }, [cases, filters]);

  // Stats
  const stats = useMemo(() => {
    const totalFocos = filteredFocuses.length;
    const focosEliminados = filteredFocuses.filter(f => f.focus_eliminated).length;
    const imoveisVisitados = 1500; // Mock: would come from visits table
    const imoveisComFoco = new Set(filteredFocuses.map(f => f.address)).size;
    const iip = imoveisVisitados > 0 ? ((imoveisComFoco / imoveisVisitados) * 100).toFixed(1) : 0;
    
    const dengueSuspeitos = filteredCases.filter(c => c.disease_type === 'dengue' && c.status === 'suspeito').length;
    const dengueConfirmados = filteredCases.filter(c => c.disease_type === 'dengue' && c.status === 'confirmado').length;
    const zikaCases = filteredCases.filter(c => c.disease_type === 'zika').length;
    const chikungunyaCases = filteredCases.filter(c => c.disease_type === 'chikungunya').length;

    return { totalFocos, focosEliminados, iip, dengueSuspeitos, dengueConfirmados, zikaCases, chikungunyaCases };
  }, [filteredFocuses, filteredCases]);

  // Chart data
  const focusByType = useMemo(() => {
    const counts = {};
    filteredFocuses.forEach(f => {
      counts[f.focus_type] = (counts[f.focus_type] || 0) + 1;
    });
    return Object.entries(counts).map(([type, count]) => ({
      name: FOCUS_TYPE_LABELS[type] || type,
      value: count
    }));
  }, [filteredFocuses]);

  const casesByDisease = [
    { name: 'Dengue', suspeitos: stats.dengueSuspeitos, confirmados: stats.dengueConfirmados },
    { name: 'Zika', suspeitos: filteredCases.filter(c => c.disease_type === 'zika' && c.status === 'suspeito').length, confirmados: filteredCases.filter(c => c.disease_type === 'zika' && c.status === 'confirmado').length },
    { name: 'Chikungunya', suspeitos: filteredCases.filter(c => c.disease_type === 'chikungunya' && c.status === 'suspeito').length, confirmados: filteredCases.filter(c => c.disease_type === 'chikungunya' && c.status === 'confirmado').length }
  ];

  // Unique neighborhoods
  const neighborhoods = [...new Set([...focuses.map(f => f.neighborhood), ...cases.map(c => c.neighborhood)].filter(Boolean))];

  // Map data
  const mapData = mapView === 'focos' 
    ? filteredFocuses.filter(f => f.latitude && f.longitude)
    : filteredCases.filter(c => c.latitude && c.longitude);

  const defaultCenter = [-14.8683986, -40.5862535]; // Barra do Choça, BA
  const mapCenter = mapData.length > 0 && mapData[0].latitude 
    ? [mapData[0].latitude, mapData[0].longitude] 
    : defaultCenter;

  // Pagination
  const paginatedFocuses = filteredFocuses.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredFocuses.length / pageSize);

  const handleExportCSV = () => {
    const headers = ['Data', 'Endereço', 'Bairro', 'Tipo Imóvel', 'Tipo Foco', 'Eliminado', 'ACS'];
    const rows = filteredFocuses.map(f => [
      f.visit_date,
      f.address,
      f.neighborhood,
      PROPERTY_TYPE_LABELS[f.property_type] || f.property_type,
      FOCUS_TYPE_LABELS[f.focus_type] || f.focus_type,
      f.focus_eliminated ? 'Sim' : 'Não',
      f.acs_name
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focos_aedes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Bug className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Vigilância Aedes aegypti</h1>
                <p className="text-white/70">Monitoramento de focos e casos de Dengue, Zika e Chikungunya</p>
              </div>
            </div>
            <Button onClick={handleExportCSV} className="gap-2 bg-white text-red-600 hover:bg-red-50">
              <Download className="w-4 h-4" />
              Exportar Dados
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mt-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Bug className="w-6 h-6 text-red-200" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalFocos}</p>
                  <p className="text-xs text-white/70">Focos</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-6 h-6 text-green-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.focosEliminados}</p>
                  <p className="text-xs text-white/70">Eliminados</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Home className="w-6 h-6 text-amber-200" />
                <div>
                  <p className="text-2xl font-bold">{stats.iip}%</p>
                  <p className="text-xs text-white/70">IIP</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-yellow-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.dengueSuspeitos}</p>
                  <p className="text-xs text-white/70">Dengue Susp.</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <ThermometerSun className="w-6 h-6 text-red-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.dengueConfirmados}</p>
                  <p className="text-xs text-white/70">Dengue Conf.</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-purple-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.zikaCases}</p>
                  <p className="text-xs text-white/70">Zika</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <Activity className="w-6 h-6 text-orange-300" />
                <div>
                  <p className="text-2xl font-bold">{stats.chikungunyaCases}</p>
                  <p className="text-xs text-white/70">Chikungunya</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        {/* Filters */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" value={filters.startDate} onChange={(e) => setFilters({ ...filters, startDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" value={filters.endDate} onChange={(e) => setFilters({ ...filters, endDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Bairro</Label>
                <Select value={filters.neighborhood} onValueChange={(v) => setFilters({ ...filters, neighborhood: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {neighborhoods.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Foco</Label>
                <Select value={filters.focusType} onValueChange={(v) => setFilters({ ...filters, focusType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {Object.entries(FOCUS_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input placeholder="Buscar endereço..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Map */}
          <Card className="shadow-lg border-0 bg-white/90 overflow-hidden">
            <CardHeader className="border-b bg-gradient-to-r from-red-500 to-orange-500 text-white">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Mapa de {mapView === 'focos' ? 'Focos' : 'Casos'}
                </CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant={mapView === 'focos' ? 'secondary' : 'ghost'} onClick={() => setMapView('focos')} className={mapView === 'focos' ? '' : 'text-white hover:bg-white/20'}>
                    Focos
                  </Button>
                  <Button size="sm" variant={mapView === 'casos' ? 'secondary' : 'ghost'} onClick={() => setMapView('casos')} className={mapView === 'casos' ? '' : 'text-white hover:bg-white/20'}>
                    Casos
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-96">
              <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                <DynamicTileLayer fallbackProvider="openstreetmap" />
                <MapController center={mapCenter} />
                {mapData.map((item, idx) => (
                  <CircleMarker
                    key={idx}
                    center={[item.latitude, item.longitude]}
                    radius={8}
                    fillColor={mapView === 'focos' ? '#ef4444' : DISEASE_COLORS[item.disease_type] || '#ef4444'}
                    color="#fff"
                    weight={2}
                    opacity={1}
                    fillOpacity={0.7}
                  >
                    <Popup>
                      <div className="text-sm">
                        {mapView === 'focos' ? (
                          <>
                            <p className="font-bold">{FOCUS_TYPE_LABELS[item.focus_type]}</p>
                            <p>{item.address}</p>
                            <p className="text-gray-500">{item.visit_date}</p>
                          </>
                        ) : (
                          <>
                            <p className="font-bold">{item.disease_type?.toUpperCase()}</p>
                            <p>{item.citizen_name}</p>
                            <p className="text-gray-500">{item.notification_date}</p>
                            <Badge className={item.status === 'confirmado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}>
                              {item.status}
                            </Badge>
                          </>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="space-y-6">
            <Card className="shadow-lg border-0 bg-white/90">
              <CardHeader>
                <CardTitle className="text-lg">Focos por Tipo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={focusByType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {focusByType.map((entry, idx) => (
                          <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 bg-white/90">
              <CardHeader>
                <CardTitle className="text-lg">Casos por Doença</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={casesByDisease}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="suspeitos" fill="#f59e0b" name="Suspeitos" />
                      <Bar dataKey="confirmados" fill="#ef4444" name="Confirmados" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Table */}
        <Card className="shadow-lg border-0 bg-white/90">
          <CardHeader className="border-b bg-gray-50">
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Focos Encontrados
              <Badge className="ml-2 bg-red-100 text-red-700">{filteredFocuses.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Bairro</TableHead>
                  <TableHead>Tipo Imóvel</TableHead>
                  <TableHead>Tipo Foco</TableHead>
                  <TableHead>Eliminado</TableHead>
                  <TableHead>ACS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedFocuses.map((focus, idx) => (
                  <TableRow key={idx} className="hover:bg-gray-50">
                    <TableCell>{focus.visit_date ? new Date(focus.visit_date).toLocaleDateString('pt-BR') : '-'}</TableCell>
                    <TableCell className="max-w-xs truncate">{focus.address}</TableCell>
                    <TableCell>{focus.neighborhood}</TableCell>
                    <TableCell>{PROPERTY_TYPE_LABELS[focus.property_type] || focus.property_type}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{FOCUS_TYPE_LABELS[focus.focus_type] || focus.focus_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {focus.focus_eliminated ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                    </TableCell>
                    <TableCell>{focus.acs_name}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}