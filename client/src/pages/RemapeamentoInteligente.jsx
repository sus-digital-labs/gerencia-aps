// @ts-nocheck
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, LayersControl, LayerGroup, CircleMarker, useMap, useMapEvents } from 'react-leaflet';
import { DynamicTileLayer } from '@/hooks/useMapConfig';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as XLSX from 'xlsx';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger
} from '@/components/ui/tooltip';
import {
  MapPin, Users, Home, Lock, Unlock, RefreshCw, Settings,
  AlertTriangle, CheckCircle, Info, ChevronRight, ChevronLeft,
  Filter, Download, Upload, Layers, BarChart2, MessageSquare,
  ArrowRight, Zap, Shield, Clock, Eye, EyeOff, Plus, Trash2,
  Activity, Target, Map, GitBranch, FileSpreadsheet, FileText,
  MoveHorizontal, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { toast } from 'sonner';

// Fix leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Barra do Choça - BA
const CENTER = [-14.8619, -40.5736];
const ZOOM = 13;

// Componente de drag-and-drop de famílias no mapa
function DraggableFamiliaMarker({ familia, microareasData, onTransferir, isDragMode }) {
  const [dragging, setDragging] = useState(false);
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    if (!markerRef.current || !isDragMode) return;
    const marker = markerRef.current;
    marker.dragging.enable();
    const handleDragEnd = (e) => {
      const { lat, lng } = e.target.getLatLng();
      // Encontrar qual microárea contém o ponto de destino
      const microareaDestino = encontrarMicroareaPorPonto(lat, lng, microareasData);
      if (microareaDestino && microareaDestino.id !== familia.microareaId) {
        onTransferir(familia, microareaDestino, { lat, lng });
      } else {
        // Voltar para posição original
        marker.setLatLng([parseFloat(String(familia.lat)), parseFloat(String(familia.lng))]);
        if (!microareaDestino) toast.error('Solte a família dentro de uma microárea');
        else toast.info('Família já pertence a esta microárea');
      }
      setDragging(false);
    };
    const handleDragStart = () => setDragging(true);
    marker.on('dragend', handleDragEnd);
    marker.on('dragstart', handleDragStart);
    return () => {
      marker.off('dragend', handleDragEnd);
      marker.off('dragstart', handleDragStart);
      if (marker.dragging) marker.dragging.disable();
    };
  }, [familia, microareasData, onTransferir, isDragMode]);

  if (!familia.lat || !familia.lng) return null;
  return (
    <CircleMarker
      ref={markerRef}
      center={[parseFloat(String(familia.lat)), parseFloat(String(familia.lng))]}
      radius={isDragMode ? 7 : 4}
      pathOptions={{
        color: dragging ? '#F97316' : '#FBBF24',
        fillColor: dragging ? '#F97316' : '#FBBF24',
        fillOpacity: 0.9,
        weight: isDragMode ? 2 : 1,
      }}
    >
      <Popup>
        <div className="text-xs">
          <strong>{familia.nomeResponsavel || 'Família'}</strong><br />
          {familia.enderecoCompleto}<br />
          <span className="text-gray-500">{familia.totalCidadaos || 0} cidadão(s)</span>
          {isDragMode && <p className="text-blue-500 mt-1">Arraste para transferir</p>}
        </div>
      </Popup>
    </CircleMarker>
  );
}

// Encontrar microárea que contém um ponto lat/lng
function encontrarMicroareaPorPonto(lat, lng, microareasData) {
  for (const m of microareasData) {
    if (!m.geojsonPoligono) continue;
    try {
      const geojson = typeof m.geojsonPoligono === 'string' ? JSON.parse(m.geojsonPoligono) : m.geojsonPoligono;
      const geom = geojson.geometry || geojson;
      if (!geom || !geom.coordinates) continue;
      const coords = geom.type === 'MultiPolygon' ? geom.coordinates[0][0] : geom.coordinates[0];
      if (pontoNoPoligono(lng, lat, coords)) return m;
    } catch { continue; }
  }
  return null;
}

// Ray casting algorithm para ponto em polígono
function pontoNoPoligono(x, y, poligono) {
  let dentro = false;
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const xi = poligono[i][0], yi = poligono[i][1];
    const xj = poligono[j][0], yj = poligono[j][1];
    const intersecta = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
    if (intersecta) dentro = !dentro;
  }
  return dentro;
}

// Gerar relatório Excel
function gerarRelatorioExcel(relatorio, levantamento) {
  const wb = XLSX.utils.book_new();

  // Aba 1: Resumo por ACS
  const resumoData = [
    ['Relatório de Cobertura por ACS - PNAB'],
    ['Gerado em:', new Date().toLocaleString('pt-BR')],
    [],
    ['ACS', 'Microáreas', 'Famílias', 'Cidadãos', '% Cap. Famílias', '% Cap. Cidadãos', 'Status PNAB'],
    ...(relatorio || []).map(r => [
      r.acs?.nomeCompleto || 'N/A',
      r.microareas?.length || 0,
      r.totalFamilias || 0,
      r.totalCidadaos || 0,
      `${r.percentualCapacidadeFamilias || 0}%`,
      `${r.percentualCapacidadeCidadaos || 0}%`,
      r.statusPnab || 'N/A',
    ]),
    [],
    ['TOTAIS'],
    ['Total ACS:', relatorio?.length || 0],
    ['Total Famílias:', levantamento?.totalFamilias || 0],
    ['Total Cidadãos:', levantamento?.totalCidadaos || 0],
    ['Limite PNAB Famílias/ACS:', 150],
    ['Limite PNAB Cidadãos/ACS:', 750],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(resumoData);
  ws1['!cols'] = [{ wch: 30 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, ws1, 'Cobertura por ACS');

  // Aba 2: Microáreas por ACS
  const microareasData2 = [
    ['Microáreas por ACS'],
    [],
    ['ACS', 'Microárea', 'Famílias', 'Cidadãos', 'Status', 'Bloqueada'],
    ...(relatorio || []).flatMap(r =>
      (r.microareas || []).map(m => [
        r.acs?.nomeCompleto || 'N/A',
        m.nome || 'N/A',
        m.totalFamilias || 0,
        m.totalCidadaos || 0,
        m.statusPnab || 'N/A',
        m.locked ? 'Sim' : 'Não',
      ])
    ),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(microareasData2);
  ws2['!cols'] = [{ wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, ws2, 'Microáreas');

  XLSX.writeFile(wb, `relatorio-cobertura-pnab-${new Date().toISOString().slice(0,10)}.xlsx`);
  toast.success('Relatório Excel exportado com sucesso!');
}

// Gerar relatório PDF via impressão
function gerarRelatorioPDF(relatorio, levantamento) {
  const conteudo = `
    <html>
    <head>
      <title>Relatório de Cobertura PNAB</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #1a1a1a; }
        h1 { color: #1e3a5f; font-size: 18px; border-bottom: 2px solid #1e3a5f; padding-bottom: 8px; }
        h2 { color: #2563eb; font-size: 14px; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
        th { background: #1e3a5f; color: white; padding: 6px 8px; text-align: left; }
        td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background: #f8fafc; }
        .status-normal { color: #059669; font-weight: bold; }
        .status-excesso { color: #dc2626; font-weight: bold; }
        .status-baixa { color: #d97706; font-weight: bold; }
        .status-vazia { color: #6b7280; font-weight: bold; }
        .summary { background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 12px; margin: 16px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 8px; }
        .summary-item { text-align: center; }
        .summary-item .value { font-size: 20px; font-weight: bold; color: #1e3a5f; }
        .summary-item .label { font-size: 10px; color: #6b7280; }
        .footer { margin-top: 30px; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
        @media print { body { margin: 10px; } }
      </style>
    </head>
    <body>
      <h1>Relatório de Cobertura Territorial - PNAB</h1>
      <p style="font-size:11px;color:#6b7280">Gerado em: ${new Date().toLocaleString('pt-BR')} | Portaria MS nº 2.436/2017</p>

      <div class="summary">
        <strong>Resumo Geral</strong>
        <div class="summary-grid">
          <div class="summary-item"><div class="value">${levantamento?.totalAcs || 0}</div><div class="label">ACS Ativos</div></div>
          <div class="summary-item"><div class="value">${levantamento?.totalMicroareas || 0}</div><div class="label">Microáreas</div></div>
          <div class="summary-item"><div class="value">${(levantamento?.totalFamilias || 0).toLocaleString('pt-BR')}</div><div class="label">Famílias</div></div>
          <div class="summary-item"><div class="value">${(levantamento?.totalCidadaos || 0).toLocaleString('pt-BR')}</div><div class="label">Cidadãos</div></div>
        </div>
      </div>

      <h2>Ocupação por ACS (% da Capacidade PNAB)</h2>
      ${(() => {
        if (!relatorio || relatorio.length === 0) return '<p style="color:#9ca3af;font-size:11px">Nenhum dado disponível</p>';
        const BAR_HEIGHT = 22;
        const BAR_GAP = 6;
        const LABEL_W = 160;
        const BAR_MAX_W = 340;
        const TOTAL_H = relatorio.length * (BAR_HEIGHT + BAR_GAP) + 30;
        const bars = relatorio.map((r, i) => {
          const pct = Math.min(r.percentualCapacidadeFamilias || 0, 150);
          const barW = Math.round((pct / 100) * BAR_MAX_W);
          const cor = pct > 100 ? '#EF4444' : pct > 80 ? '#F59E0B' : '#10B981';
          const y = 20 + i * (BAR_HEIGHT + BAR_GAP);
          const nome = (r.acs?.nomeCompleto || 'N/A').substring(0, 22);
          return `
            <text x="0" y="${y + BAR_HEIGHT - 6}" font-size="10" fill="#374151" font-family="Arial">${nome}</text>
            <rect x="${LABEL_W}" y="${y}" width="${barW}" height="${BAR_HEIGHT}" fill="${cor}" rx="3"/>
            <rect x="${LABEL_W}" y="${y}" width="${BAR_MAX_W}" height="${BAR_HEIGHT}" fill="none" stroke="#E5E7EB" stroke-width="1" rx="3"/>
            <line x1="${LABEL_W + Math.round(BAR_MAX_W * 0.8)}" y1="${y}" x2="${LABEL_W + Math.round(BAR_MAX_W * 0.8)}" y2="${y + BAR_HEIGHT}" stroke="#F59E0B" stroke-width="1" stroke-dasharray="3,2"/>
            <line x1="${LABEL_W + BAR_MAX_W}" y1="${y}" x2="${LABEL_W + BAR_MAX_W}" y2="${y + BAR_HEIGHT}" stroke="#EF4444" stroke-width="1" stroke-dasharray="3,2"/>
            <text x="${LABEL_W + barW + 4}" y="${y + BAR_HEIGHT - 6}" font-size="9" fill="${cor}" font-family="Arial" font-weight="bold">${pct}%</text>
          `;
        }).join('');
        return `
          <svg width="${LABEL_W + BAR_MAX_W + 60}" height="${TOTAL_H}" style="display:block;margin:8px 0 16px">
            <text x="${LABEL_W}" y="14" font-size="9" fill="#9CA3AF" font-family="Arial">0%</text>
            <text x="${LABEL_W + Math.round(BAR_MAX_W * 0.8) - 8}" y="14" font-size="9" fill="#F59E0B" font-family="Arial">80%</text>
            <text x="${LABEL_W + BAR_MAX_W - 8}" y="14" font-size="9" fill="#EF4444" font-family="Arial">100%</text>
            ${bars}
          </svg>
          <p style="font-size:9px;color:#9ca3af;margin-bottom:12px">
            <span style="color:#10B981">■</span> Normal (&lt;80%)&nbsp;&nbsp;
            <span style="color:#F59E0B">■</span> Atenção (80-100%)&nbsp;&nbsp;
            <span style="color:#EF4444">■</span> Excesso (&gt;100%)
          </p>
        `;
      })()}

      <h2>Cobertura por ACS</h2>
      <table>
        <thead>
          <tr>
            <th>ACS</th>
            <th>Microáreas</th>
            <th>Famílias</th>
            <th>% Cap.</th>
            <th>Cidadãos</th>
            <th>Status PNAB</th>
          </tr>
        </thead>
        <tbody>
          ${(relatorio || []).map(r => {
            const statusClass = r.statusPnab === 'normal' ? 'status-normal' :
              r.statusPnab === 'excesso' ? 'status-excesso' :
              r.statusPnab === 'baixa_cobertura' ? 'status-baixa' : 'status-vazia';
            const statusLabel = r.statusPnab === 'normal' ? 'Normal' :
              r.statusPnab === 'excesso' ? 'Excesso PNAB' :
              r.statusPnab === 'baixa_cobertura' ? 'Baixa Cobertura' : 'Vazia';
            return `<tr>
              <td>${r.acs?.nomeCompleto || 'N/A'}</td>
              <td style="text-align:center">${r.microareas?.length || 0}</td>
              <td style="text-align:center">${r.totalFamilias || 0} / 150</td>
              <td style="text-align:center">${r.percentualCapacidadeFamilias || 0}%</td>
              <td style="text-align:center">${r.totalCidadaos || 0} / 750</td>
              <td class="${statusClass}">${statusLabel}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>

      <div class="footer">
        Sistema SUS Analytics - Faturamento Saúde Municipal | Limite PNAB: 150 famílias / 750 cidadãos por ACS
      </div>
    </body>
    </html>
  `;
  const janela = window.open('', '_blank');
  janela.document.write(conteudo);
  janela.document.close();
  janela.focus();
  setTimeout(() => { janela.print(); }, 500);
  toast.success('Relatório PDF aberto para impressão!');
}

const CORES_STATUS = {
  normal: '#10B981',
  excesso: '#EF4444',
  baixa_cobertura: '#F59E0B',
  vazia: '#9CA3AF',
};

const STATUS_LABELS = {
  normal: 'Normal',
  excesso: 'Excesso PNAB',
  baixa_cobertura: 'Baixa Cobertura',
  vazia: 'Vazia',
};

// Helper para parsear GeoJSON de polígono para coordenadas Leaflet
function geojsonParaLeaflet(geojsonStr) {
  try {
    const geojson = typeof geojsonStr === 'string' ? JSON.parse(geojsonStr) : geojsonStr;
    const geom = geojson.geometry || geojson;
    if (!geom || !geom.coordinates) return [[]];
    if (geom.type === 'MultiPolygon') {
      return geom.coordinates.map(poly => poly[0].map(([lng, lat]) => [lat, lng]));
    }
    const coords = geom.coordinates[0] || [];
    return [coords.map(([lng, lat]) => [lat, lng])];
  } catch { return [[]]; }
}

// Componente de controle de zoom do mapa
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && zoom) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

// Badge de status PNAB
function StatusBadge({ status, totalFamilias, totalCidadaos }) {
  const cor = CORES_STATUS[status] || '#9CA3AF';
  const label = STATUS_LABELS[status] || status;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
      style={{ backgroundColor: cor }}>
      {label}
    </span>
  );
}

export default function RemapeamentoInteligente() {
  // ─── Estado principal ───────────────────────────────────
  const [painelEsquerdoAberto, setPainelEsquerdoAberto] = useState(true);
  const [painelDireitoAberto, setPainelDireitoAberto] = useState(true);
  const [microareasSelecionadas, setMicroareasSelecionadas] = useState([]);
  const [microareaAtiva, setMicroareaAtiva] = useState(null);
  const [familiaAtiva, setFamiliaAtiva] = useState(null);
  const [tabAtiva, setTabAtiva] = useState('microareas');
  const [tabDireita, setTabDireita] = useState('info');

  // ─── Filtros ────────────────────────────────────────────
  const [filtros, setFiltros] = useState({
    minFamilias: 0,
    maxFamilias: 500,
    minCidadaos: 0,
    maxCidadaos: 2000,
    temCrianca: false,
    temIdoso: false,
    temGestante: false,
    status: 'todos',
    apenasBloqueadas: false,
  });
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // ─── Camadas visíveis ───────────────────────────────────
  const [camadas, setCamadas] = useState({
    microareas: true,
    familias: true,
    ubs: true,
    calor: false,
    cidadaos: false,
  });

  // ─── Modais ───────────────────────────────────────────────
  const [modalGerarAberto, setModalGerarAberto] = useState(false);
  const [modalRedistribuirAberto, setModalRedistribuirAberto] = useState(false);
  const [modalSolicitacaoAberto, setModalSolicitacaoAberto] = useState(false);
  const [modalConfigAberto, setModalConfigAberto] = useState(false);
  const [modalPreviewAberto, setModalPreviewAberto] = useState(false);
  const [modalDragConfirmAberto, setModalDragConfirmAberto] = useState(false);
  const [dragPendente, setDragPendente] = useState(null);
  const [isDragMode, setIsDragMode] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  // --- Formularios ---
  const [formGerar, setFormGerar] = useState({
    quantidadeMicroareas: 8,
    respeitarLocked: true,
    limparExistentes: false,
  });
  const [formRedistribuir, setFormRedistribuir] = useState({
    quantidadeFamilias: 10,
    respeitarLocked: true,
  });
  const [formSolicitacao, setFormSolicitacao] = useState({
    microareaOrigemId: '',
    motivo: '',
  });

  // ─── Queries tRPC ───────────────────────────────────────
  const utils = trpc.useUtils();

  const { data: levantamento, isLoading: loadingLevantamento } = trpc.remapeamento.levantamentoPopulacional.useQuery();
  const { data: microareasData = [], isLoading: loadingMicroareas } = trpc.remapeamento.listarMicroareas.useQuery({});
  const { data: acsData = [] } = trpc.remapeamento.listarAcs.useQuery({});
  const { data: areasData = [] } = trpc.remapeamento.listarAreas.useQuery({});
  const { data: configuracao } = trpc.remapeamento.getConfiguracao.useQuery();
  const { data: statusGeo } = trpc.remapeamento.statusGeocodificacao.useQuery();
  const { data: solicitacoes = [] } = trpc.remapeamento.listarSolicitacoes.useQuery({});
  const { data: logs = [] } = trpc.remapeamento.listarLogs.useQuery({ limit: 20 });

  const { data: familiasMicroarea = [] } = trpc.remapeamento.listarFamilias.useQuery(
    { microareaId: microareaAtiva?.id, limit: 200 },
    { enabled: !!microareaAtiva }
  );

  // ─── Mutations ──────────────────────────────────────────
  const gerarMicroareas = trpc.remapeamento.gerarMicroareasAutomatico.useMutation({
    onSuccess: () => {
      utils.remapeamento.listarMicroareas.invalidate();
      utils.remapeamento.levantamentoPopulacional.invalidate();
      setModalGerarAberto(false);
    },
  });

  const toggleLocked = trpc.remapeamento.toggleLocked.useMutation({
    onSuccess: () => utils.remapeamento.listarMicroareas.invalidate(),
  });

  const redistribuir = trpc.remapeamento.redistribuirFamilias.useMutation({
    onSuccess: () => {
      utils.remapeamento.listarMicroareas.invalidate();
      utils.remapeamento.levantamentoPopulacional.invalidate();
      setModalRedistribuirAberto(false);
    },
  });

  const transferirFamilia = trpc.remapeamento.transferirFamilia.useMutation({
    onSuccess: () => {
      utils.remapeamento.listarFamilias.invalidate();
      utils.remapeamento.listarMicroareas.invalidate();
    },
  });

  const criarSolicitacao = trpc.remapeamento.criarSolicitacao.useMutation({
    onSuccess: () => {
      utils.remapeamento.listarSolicitacoes.invalidate();
      setModalSolicitacaoAberto(false);
    },
  });

  const responderSolicitacao = trpc.remapeamento.responderSolicitacao.useMutation({
    onSuccess: () => utils.remapeamento.listarSolicitacoes.invalidate(),
  });

  const geocodificar = trpc.remapeamento.geocodificarFamilias.useMutation({
    onSuccess: () => utils.remapeamento.statusGeocodificacao.invalidate(),
  });

  const importarPEC = trpc.remapeamento.importarDadosPEC.useMutation({
    onSuccess: () => {
      utils.remapeamento.levantamentoPopulacional.invalidate();
      utils.remapeamento.statusGeocodificacao.invalidate();
    },
  });

  const previewRedistribuicao = trpc.remapeamento.previewRedistribuicao.useMutation({
    onSuccess: (data) => {
      setPreviewData(data);
      setModalPreviewAberto(true);
    },
    onError: (err) => toast.error(`Erro ao gerar preview: ${err.message}`),
  });

  const { data: relatorioData } = trpc.remapeamento.relatorioCobertura.useQuery();

  // ─── Filtrar microáreas ─────────────────────────────────
  const microareasFiltradas = microareasData.filter((m) => {
    if (filtros.status !== 'todos' && m.statusPnab !== filtros.status) return false;
    if (filtros.apenasBloqueadas && !m.locked) return false;
    if ((m.totalFamilias || 0) < filtros.minFamilias) return false;
    if ((m.totalFamilias || 0) > filtros.maxFamilias) return false;
    return true;
  });

  // ─── Cores das microáreas ───────────────────────────────
  const getCorMicroarea = (m) => {
    if (microareaAtiva?.id === m.id) return '#FBBF24';
    if (microareasSelecionadas.includes(m.id)) return '#A78BFA';
    return m.cor || CORES_STATUS[m.statusPnab] || '#3B82F6';
  };

  // ─── Handlers ───────────────────────────────────────────
  const handleClickMicroarea = (m) => {
    setMicroareaAtiva(m);
    setTabDireita('info');
    setPainelDireitoAberto(true);
  };

  const handleToggleLocked = (m, e) => {
    e.stopPropagation();
    toggleLocked.mutate({ id: m.id });
  };

  const handleGerarMicroareas = () => {
    gerarMicroareas.mutate(formGerar);
  };

  const handleRedistribuir = () => {
    if (!microareaAtiva) return;
    redistribuir.mutate({
      microareaDestinoId: microareaAtiva.id,
      ...formRedistribuir,
    });
  };

  const handleGerarComPreview = () => {
    previewRedistribuicao.mutate({
      numMicroareas: formGerar.quantidadeMicroareas,
      respeitarLocked: formGerar.respeitarLocked,
    });
  };

  const handleConfirmarGerarAposPreview = () => {
    setModalPreviewAberto(false);
    gerarMicroareas.mutate(formGerar);
  };

  const handleDragTransferir = useCallback((familia, microareaDestino) => {
    setDragPendente({ familia, microareaDestino });
    setModalDragConfirmAberto(true);
  }, []);

  const handleConfirmarDrag = () => {
    if (!dragPendente) return;
    transferirFamilia.mutate({
      familiaId: dragPendente.familia.id,
      microareaDestinoId: dragPendente.microareaDestino.id,
      motivo: 'Transferência via drag-and-drop no mapa',
    }, {
      onSuccess: (resultado) => {
        const nomeDestino = dragPendente.microareaDestino.nome;
        if (resultado?.notificacaoEnviada) {
          toast.success(`Família transferida para ${nomeDestino}! Notificação enviada ao ACS responsável.`, { duration: 5000 });
        } else {
          toast.success(`Família transferida para ${nomeDestino}!`);
        }
        setModalDragConfirmAberto(false);
        setDragPendente(null);
      },
      onError: (err) => {
        toast.error(`Erro na transferência: ${err.message}`);
        setModalDragConfirmAberto(false);
      },
    });
  };

  const handleExportarExcel = () => {
    if (!relatorioData || relatorioData.length === 0) {
      toast.error('Nenhum dado de relatório disponível');
      return;
    }
    gerarRelatorioExcel(relatorioData, levantamento);
  };

  const handleExportarPDF = () => {
    if (!relatorioData || relatorioData.length === 0) {
      toast.error('Nenhum dado de relatório disponível');
      return;
    }
    gerarRelatorioPDF(relatorioData, levantamento);
  };

  // ─── Renderização ───────────────────────────────────────
  const mapCenter = configuracao
    ? [parseFloat(String(configuracao.latCentro || CENTER[0])), parseFloat(String(configuracao.lngCentro || CENTER[1]))]
    : CENTER;

  const pendentesCount = solicitacoes.filter(s => s.status === 'pendente').length;

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100vh-64px)] bg-gray-950 text-white overflow-hidden">

        {/* ═══════════════════════════════════════════════════
            PAINEL ESQUERDO - Hierarquia e Controles
        ═══════════════════════════════════════════════════ */}
        <div className={`flex flex-col transition-all duration-300 bg-gray-900 border-r border-gray-800 ${painelEsquerdoAberto ? 'w-80' : 'w-12'} flex-shrink-0`}>
          {/* Header do painel */}
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            {painelEsquerdoAberto && (
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-blue-400" />
                <span className="font-semibold text-sm">Território</span>
              </div>
            )}
            <button
              onClick={() => setPainelEsquerdoAberto(!painelEsquerdoAberto)}
              className="p-1 rounded hover:bg-gray-800 text-gray-400"
            >
              {painelEsquerdoAberto ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {painelEsquerdoAberto && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <Tabs value={tabAtiva} onValueChange={setTabAtiva} className="flex flex-col flex-1">
                <TabsList className="mx-2 mt-2 bg-gray-800 grid grid-cols-3">
                  <TabsTrigger value="microareas" className="text-xs">Microáreas</TabsTrigger>
                  <TabsTrigger value="acs" className="text-xs">ACS</TabsTrigger>
                  <TabsTrigger value="acoes" className="text-xs">Ações</TabsTrigger>
                </TabsList>

                {/* Tab Microáreas */}
                <TabsContent value="microareas" className="flex-1 overflow-y-auto p-2 space-y-1">
                  {/* Filtros */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">{microareasFiltradas.length} microáreas</span>
                    <button
                      onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${filtrosAbertos ? 'bg-blue-600' : 'bg-gray-800'} hover:bg-blue-700`}
                    >
                      <Filter className="w-3 h-3" />
                      Filtros
                    </button>
                  </div>

                  {filtrosAbertos && (
                    <div className="bg-gray-800 rounded-lg p-3 space-y-3 mb-2">
                      <div>
                        <Label className="text-xs text-gray-400">Status</Label>
                        <Select value={filtros.status} onValueChange={(v) => setFiltros(f => ({ ...f, status: v }))}>
                          <SelectTrigger className="h-7 text-xs bg-gray-700 border-gray-600 mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="excesso">Excesso PNAB</SelectItem>
                            <SelectItem value="baixa_cobertura">Baixa Cobertura</SelectItem>
                            <SelectItem value="vazia">Vazia</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={filtros.apenasBloqueadas}
                          onCheckedChange={(v) => setFiltros(f => ({ ...f, apenasBloqueadas: v }))}
                          className="scale-75"
                        />
                        <Label className="text-xs text-gray-400">Apenas bloqueadas</Label>
                      </div>
                    </div>
                  )}

                  {loadingMicroareas ? (
                    <div className="text-center text-gray-500 py-4 text-sm">Carregando...</div>
                  ) : microareasFiltradas.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Map className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhuma microárea encontrada</p>
                      <p className="text-xs text-gray-600 mt-1">Use "Gerar Automaticamente" para criar</p>
                    </div>
                  ) : (
                    microareasFiltradas.map((m) => (
                      <div
                        key={m.id}
                        onClick={() => handleClickMicroarea(m)}
                        className={`p-2 rounded-lg cursor-pointer transition-all border ${
                          microareaAtiva?.id === m.id
                            ? 'bg-blue-900/50 border-blue-500'
                            : 'bg-gray-800 border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: m.cor || '#3B82F6' }} />
                            <span className="text-xs font-medium truncate">{m.nome}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={(e) => handleToggleLocked(m, e)}
                                  className={`p-0.5 rounded ${m.locked ? 'text-yellow-400' : 'text-gray-600 hover:text-gray-400'}`}
                                >
                                  {m.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {m.locked ? 'Bloqueada (clique para desbloquear)' : 'Desbloqueada (clique para bloquear)'}
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Home className="w-2.5 h-2.5" />{m.totalFamilias || 0}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-0.5">
                            <Users className="w-2.5 h-2.5" />{m.totalCidadaos || 0}
                          </span>
                          <StatusBadge status={m.statusPnab} />
                        </div>
                        {/* Barra de capacidade */}
                        <div className="mt-1.5 h-1 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(m.percentualCapacidadeFamilias || 0, 100)}%`,
                              backgroundColor: m.statusPnab === 'excesso' ? '#EF4444' :
                                m.statusPnab === 'baixa_cobertura' ? '#F59E0B' : '#10B981',
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tab ACS */}
                <TabsContent value="acs" className="flex-1 overflow-y-auto p-2 space-y-1">
                  {acsData.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhum ACS cadastrado</p>
                    </div>
                  ) : (
                    acsData.map((acs) => {
                      const microareasAcs = microareasData.filter(m => m.acsId === acs.id);
                      const totalFam = microareasAcs.reduce((s, m) => s + (m.totalFamilias || 0), 0);
                      const totalCid = microareasAcs.reduce((s, m) => s + (m.totalCidadaos || 0), 0);
                      const pctFam = Math.min(Math.round((totalFam / 150) * 100), 100);
                      return (
                        <div key={acs.id} className="p-2 bg-gray-800 rounded-lg border border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {acs.nome?.charAt(0) || 'A'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{acs.nome}</p>
                              <p className="text-xs text-gray-500">{microareasAcs.length} microárea(s)</p>
                            </div>
                          </div>
                          <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                            <span className="flex items-center gap-0.5"><Home className="w-2.5 h-2.5" />{totalFam}/150</span>
                            <span className="flex items-center gap-0.5"><Users className="w-2.5 h-2.5" />{totalCid}/750</span>
                          </div>
                          <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${pctFam}%`,
                                backgroundColor: pctFam > 100 ? '#EF4444' : pctFam > 80 ? '#F59E0B' : '#10B981',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </TabsContent>

                {/* Tab Ações */}
                <TabsContent value="acoes" className="flex-1 overflow-y-auto p-2 space-y-2">
                  {/* Importar PEC */}
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                      <Download className="w-3 h-3 text-blue-400" />
                      Importar dados do PEC
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 border-gray-600"
                      onClick={() => importarPEC.mutate({ limite: 500 })}
                      disabled={importarPEC.isPending}
                    >
                      {importarPEC.isPending ? 'Importando...' : 'Importar Famílias e ACS'}
                    </Button>
                    {importarPEC.data && (
                      <p className="text-xs text-green-400 mt-1">
                        ✓ {importarPEC.data.familias} famílias, {importarPEC.data.acs} ACS importados
                      </p>
                    )}
                  </div>

                  {/* Geocodificação */}
                  <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                    <p className="text-xs font-medium text-gray-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-green-400" />
                      Geocodificação
                    </p>
                    {statusGeo && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{statusGeo.geocodificadas}/{statusGeo.total} geocodificadas</span>
                          <span>{statusGeo.percentual}%</span>
                        </div>
                        <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{ width: `${statusGeo.percentual}%` }}
                          />
                        </div>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full text-xs h-7 border-gray-600"
                      onClick={() => geocodificar.mutate({ limite: 20 })}
                      disabled={geocodificar.isPending}
                    >
                      {geocodificar.isPending ? 'Geocodificando...' : 'Geocodificar 20 endereços'}
                    </Button>
                  </div>

                  {/* Gerar microáreas */}
                  <div className="bg-gray-800 rounded-lg p-3 border border-blue-800">
                    <p className="text-xs font-medium text-blue-300 mb-2 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Geração Automática
                    </p>
                    <Button
                      size="sm"
                      className="w-full text-xs h-7 bg-blue-600 hover:bg-blue-700"
                      onClick={() => setModalGerarAberto(true)}
                    >
                      Gerar Microáreas (K-Means++)
                    </Button>
                  </div>

                  {/* Redistribuir */}
                  {microareaAtiva && (
                    <div className="bg-gray-800 rounded-lg p-3 border border-purple-800">
                      <p className="text-xs font-medium text-purple-300 mb-2 flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" />
                        Redistribuir para: {microareaAtiva.nome}
                      </p>
                      <Button
                        size="sm"
                        className="w-full text-xs h-7 bg-purple-600 hover:bg-purple-700"
                        onClick={() => setModalRedistribuirAberto(true)}
                      >
                        Redistribuir Famílias
                      </Button>
                    </div>
                  )}

                  {/* Solicitar transferência */}
                  {microareaAtiva && (
                    <div className="bg-gray-800 rounded-lg p-3 border border-yellow-800">
                      <p className="text-xs font-medium text-yellow-300 mb-2 flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        Solicitar Transferência
                        {pendentesCount > 0 && (
                          <span className="ml-auto bg-yellow-500 text-black text-xs rounded-full px-1.5 py-0.5">
                            {pendentesCount}
                          </span>
                        )}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7 border-yellow-700 text-yellow-300"
                        onClick={() => setModalSolicitacaoAberto(true)}
                      >
                        Nova Solicitação
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════
            MAPA CENTRAL
        ═══════════════════════════════════════════════════ */}
        <div className="flex-1 relative">
          {/* Barra de status superior */}
          <div className="absolute top-0 left-0 right-0 z-[1000] bg-gray-900/90 backdrop-blur-sm border-b border-gray-800 px-4 py-2 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-gray-300 font-medium">Barra do Choça - BA</span>
            </div>
            {loadingLevantamento ? (
              <span className="text-xs text-gray-500">Carregando...</span>
            ) : levantamento && (
              <>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Home className="w-3 h-3" />{levantamento.totalFamilias?.toLocaleString('pt-BR')} famílias
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Users className="w-3 h-3" />{levantamento.totalCidadaos?.toLocaleString('pt-BR')} cidadãos
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Activity className="w-3 h-3" />{levantamento.totalAcs} ACS
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Map className="w-3 h-3" />{levantamento.totalMicroareas} microáreas
                </div>
                {levantamento.microareasExcesso > 0 && (
                  <div className="flex items-center gap-1 text-xs text-red-400">
                    <AlertTriangle className="w-3 h-3" />{levantamento.microareasExcesso} em excesso
                  </div>
                )}
              </>
            )}

            {/* Controles de camadas e exportação */}
            <div className="ml-auto flex items-center gap-2">
              {/* Toggle Drag Mode */}
              {microareaAtiva && (
                <button
                  onClick={() => setIsDragMode(!isDragMode)}
                  className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-all ${
                    isDragMode
                      ? 'bg-orange-600 border-orange-500 text-white animate-pulse'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'
                  }`}
                  title={isDragMode ? 'Desativar modo arrastar' : 'Ativar modo arrastar famílias'}
                >
                  <MoveHorizontal className="w-3 h-3" />
                  {isDragMode ? 'Arrastando' : 'Arrastar'}
                </button>
              )}
              {/* Exportar */}
              <button
                onClick={handleExportarExcel}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-400 hover:bg-green-800 hover:text-white transition-all"
                title="Exportar relatório Excel"
              >
                <FileSpreadsheet className="w-3 h-3" />
                Excel
              </button>
              <button
                onClick={handleExportarPDF}
                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded border bg-gray-800 border-gray-700 text-gray-400 hover:bg-red-800 hover:text-white transition-all"
                title="Exportar relatório PDF"
              >
                <FileText className="w-3 h-3" />
                PDF
              </button>
              {/* Camadas */}
              {Object.entries(camadas).map(([key, ativo]) => (
                <button
                  key={key}
                  onClick={() => setCamadas(c => ({ ...c, [key]: !c[key] }))}
                  className={`text-xs px-2 py-0.5 rounded border transition-all ${
                    ativo ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'
                  }`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          <MapContainer
            center={mapCenter}
            zoom={ZOOM}
            style={{ height: '100%', width: '100%', background: '#1a1a2e' }}
            className="z-0"
          >
            <DynamicTileLayer fallbackProvider="carto_dark" />

            {/* Camada de Microáreas */}
            {camadas.microareas && microareasFiltradas.map((m) => {
              if (!m.geojsonPoligono) return null;
              const poligonos = geojsonParaLeaflet(m.geojsonPoligono);
              return poligonos.map((coords, idx) => (
                coords.length >= 3 && (
                  <Polygon
                    key={`${m.id}-${idx}`}
                    positions={coords}
                    pathOptions={{
                      color: getCorMicroarea(m),
                      fillColor: getCorMicroarea(m),
                      fillOpacity: microareaAtiva?.id === m.id ? 0.4 : 0.2,
                      weight: microareaAtiva?.id === m.id ? 3 : 1.5,
                      dashArray: m.locked ? '5,5' : undefined,
                    }}
                    eventHandlers={{ click: () => handleClickMicroarea(m) }}
                  >
                    <Popup>
                      <div className="text-sm">
                        <strong>{m.nome}</strong>
                        {m.locked && <span className="ml-1 text-yellow-500">🔒</span>}
                        <br />
                        <span className="text-gray-600">{m.totalFamilias || 0} famílias · {m.totalCidadaos || 0} cidadãos</span>
                        <br />
                        <StatusBadge status={m.statusPnab} />
                      </div>
                    </Popup>
                  </Polygon>
                )
              ));
            })}

            {/* Camada de UBS */}
            {camadas.ubs && areasData.map((area) => {
              if (!area.latUbs || !area.lngUbs) return null;
              return (
                <Marker
                  key={area.id}
                  position={[parseFloat(String(area.latUbs)), parseFloat(String(area.lngUbs))]}
                  icon={L.divIcon({
                    html: `<div style="background:#3B82F6;color:white;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:bold;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.5)">UBS</div>`,
                    className: '',
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                  })}
                >
                  <Popup><strong>{area.nomeUbs || area.nome}</strong></Popup>
                </Marker>
              );
            })}

            {/* Famílias da microárea ativa - com suporte a drag-and-drop */}
            {camadas.familias && microareaAtiva && familiasMicroarea.map((f) => (
              <DraggableFamiliaMarker
                key={f.id}
                familia={f}
                microareasData={microareasData}
                onTransferir={handleDragTransferir}
                isDragMode={isDragMode}
              />
            ))}
          </MapContainer>

          {/* Legenda */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
            <p className="text-xs font-medium text-gray-300 mb-2">Legenda</p>
            {Object.entries(CORES_STATUS).map(([status, cor]) => (
              <div key={status} className="flex items-center gap-2 mb-1">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: cor }} />
                <span className="text-xs text-gray-400">{STATUS_LABELS[status]}</span>
              </div>
            ))}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-3 h-0.5 border-t-2 border-dashed border-yellow-400" />
              <span className="text-xs text-gray-400">Bloqueada</span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════
            PAINEL DIREITO - Informações e Auditoria
        ═══════════════════════════════════════════════════ */}
        <div className={`flex flex-col transition-all duration-300 bg-gray-900 border-l border-gray-800 ${painelDireitoAberto ? 'w-80' : 'w-12'} flex-shrink-0`}>
          <div className="flex items-center justify-between p-3 border-b border-gray-800">
            <button
              onClick={() => setPainelDireitoAberto(!painelDireitoAberto)}
              className="p-1 rounded hover:bg-gray-800 text-gray-400"
            >
              {painelDireitoAberto ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            {painelDireitoAberto && (
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-400" />
                <span className="font-semibold text-sm">Detalhes</span>
              </div>
            )}
          </div>

          {painelDireitoAberto && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <Tabs value={tabDireita} onValueChange={setTabDireita} className="flex flex-col flex-1">
                <TabsList className="mx-2 mt-2 bg-gray-800 grid grid-cols-3">
                  <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
                  <TabsTrigger value="solicitacoes" className="text-xs relative">
                    Transf.
                    {pendentesCount > 0 && (
                      <span className="absolute -top-1 -right-1 bg-yellow-500 text-black text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        {pendentesCount}
                      </span>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
                </TabsList>

                {/* Tab Info */}
                <TabsContent value="info" className="flex-1 overflow-y-auto p-3 space-y-3">
                  {microareaAtiva ? (
                    <>
                      {/* Header da microárea */}
                      <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: microareaAtiva.cor || '#3B82F6' }} />
                            <span className="font-medium text-sm">{microareaAtiva.nome}</span>
                          </div>
                          <button
                            onClick={() => toggleLocked.mutate({ id: microareaAtiva.id })}
                            className={`p-1 rounded ${microareaAtiva.locked ? 'text-yellow-400 bg-yellow-900/30' : 'text-gray-500 hover:text-gray-300'}`}
                          >
                            {microareaAtiva.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                          </button>
                        </div>
                        <StatusBadge status={microareaAtiva.statusPnab} />
                        {microareaAtiva.locked && (
                          <p className="text-xs text-yellow-400 mt-1 flex items-center gap-1">
                            <Shield className="w-3 h-3" />
                            Protegida contra redistribuição automática
                          </p>
                        )}
                      </div>

                      {/* Estatísticas */}
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { label: 'Famílias', value: microareaAtiva.totalFamilias || 0, max: 150, icon: Home, color: '#3B82F6' },
                          { label: 'Cidadãos', value: microareaAtiva.totalCidadaos || 0, max: 750, icon: Users, color: '#10B981' },
                        ].map(({ label, value, max, icon: Icon, color }) => (
                          <div key={label} className="bg-gray-800 rounded-lg p-2 border border-gray-700">
                            <div className="flex items-center gap-1 mb-1">
                              <Icon className="w-3 h-3" style={{ color }} />
                              <span className="text-xs text-gray-400">{label}</span>
                            </div>
                            <p className="text-lg font-bold">{value.toLocaleString('pt-BR')}</p>
                            <div className="mt-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.min((value / max) * 100, 100)}%`,
                                  backgroundColor: value > max ? '#EF4444' : color,
                                }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{Math.round((value / max) * 100)}% do limite</p>
                          </div>
                        ))}
                      </div>

                      {/* Área e densidade */}
                      {(microareaAtiva.areaKm2 || microareaAtiva.densidadePopulacional) && (
                        <div className="bg-gray-800 rounded-lg p-2 border border-gray-700 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-xs text-gray-500">Área</p>
                            <p className="text-sm font-medium">{parseFloat(microareaAtiva.areaKm2 || 0).toFixed(2)} km²</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Densidade</p>
                            <p className="text-sm font-medium">{parseFloat(microareaAtiva.densidadePopulacional || 0).toFixed(1)} hab/km²</p>
                          </div>
                        </div>
                      )}

                      {/* Famílias da microárea */}
                      <div>
                        <p className="text-xs font-medium text-gray-300 mb-2 flex items-center gap-1">
                          <Home className="w-3 h-3" />
                          Famílias ({familiasMicroarea.length})
                        </p>
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {familiasMicroarea.slice(0, 20).map((f) => (
                            <div
                              key={f.id}
                              className={`p-2 rounded bg-gray-800 border cursor-pointer transition-all ${
                                familiaAtiva?.id === f.id ? 'border-yellow-500' : 'border-gray-700 hover:border-gray-600'
                              }`}
                              onClick={() => setFamiliaAtiva(f)}
                            >
                              <p className="text-xs font-medium truncate">{f.nomeResponsavel || 'Família sem nome'}</p>
                              <p className="text-xs text-gray-500 truncate">{f.bairro || f.logradouro || 'Endereço não informado'}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-400">{f.totalCidadaos || 0} cidadão(s)</span>
                                {f.geocodificado ? (
                                  <span className="text-xs text-green-400">📍</span>
                                ) : (
                                  <span className="text-xs text-red-400">⚠️ sem coord.</span>
                                )}
                              </div>
                            </div>
                          ))}
                          {familiasMicroarea.length > 20 && (
                            <p className="text-xs text-gray-500 text-center py-1">
                              +{familiasMicroarea.length - 20} famílias
                            </p>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center text-gray-500 py-12">
                      <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">Selecione uma microárea</p>
                      <p className="text-xs text-gray-600 mt-1">Clique no mapa ou na lista</p>
                    </div>
                  )}
                </TabsContent>

                {/* Tab Solicitações */}
                <TabsContent value="solicitacoes" className="flex-1 overflow-y-auto p-3 space-y-2">
                  {solicitacoes.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhuma solicitação</p>
                    </div>
                  ) : (
                    solicitacoes.map((s) => (
                      <div key={s.id} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            s.status === 'pendente' ? 'bg-yellow-900 text-yellow-300' :
                            s.status === 'aceita' ? 'bg-green-900 text-green-300' :
                            s.status === 'negada' ? 'bg-red-900 text-red-300' :
                            'bg-blue-900 text-blue-300'
                          }`}>
                            {s.status}
                          </span>
                          <span className="text-xs text-gray-500">#{s.id}</span>
                        </div>
                        <p className="text-xs text-gray-300 mb-2">{s.motivo}</p>
                        {s.status === 'pendente' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              className="flex-1 text-xs h-6 bg-green-700 hover:bg-green-600"
                              onClick={() => responderSolicitacao.mutate({ id: s.id, status: 'aceita' })}
                            >
                              Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-6 border-red-700 text-red-400"
                              onClick={() => responderSolicitacao.mutate({ id: s.id, status: 'negada' })}
                            >
                              Negar
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Tab Logs */}
                <TabsContent value="logs" className="flex-1 overflow-y-auto p-3 space-y-1">
                  {logs.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="text-xs">Nenhuma ação registrada</p>
                    </div>
                  ) : (
                    logs.map((log) => (
                      <div key={log.id} className="p-2 bg-gray-800 rounded border border-gray-700">
                        <div className="flex items-center gap-1 mb-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            log.acao.includes('bloqueio') ? 'bg-yellow-400' :
                            log.acao.includes('geracao') ? 'bg-blue-400' :
                            log.acao.includes('transferencia') ? 'bg-purple-400' :
                            'bg-green-400'
                          }`} />
                          <span className="text-xs font-medium text-gray-300 truncate">{log.acao.replace(/_/g, ' ')}</span>
                        </div>
                        <p className="text-xs text-gray-500 truncate">{log.descricao}</p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {new Date(log.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          MODAIS
      ═══════════════════════════════════════════════════ */}

      {/* Modal: Gerar Microáreas */}
      <Dialog open={modalGerarAberto} onOpenChange={setModalGerarAberto}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-400" />
              Gerar Microáreas Automaticamente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-gray-300">Quantidade de microáreas</Label>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[formGerar.quantidadeMicroareas]}
                  onValueChange={([v]) => setFormGerar(f => ({ ...f, quantidadeMicroareas: v }))}
                  min={2}
                  max={30}
                  step={1}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-blue-400 w-8 text-center">
                  {formGerar.quantidadeMicroareas}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Estimativa: ~{Math.round((levantamento?.totalFamilias || 0) / formGerar.quantidadeMicroareas)} famílias/microárea
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-300">Respeitar microáreas bloqueadas</Label>
                  <p className="text-xs text-gray-500">Não redistribuir famílias de microáreas com 🔒</p>
                </div>
                <Switch
                  checked={formGerar.respeitarLocked}
                  onCheckedChange={(v) => setFormGerar(f => ({ ...f, respeitarLocked: v }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm text-gray-300">Limpar microáreas existentes</Label>
                  <p className="text-xs text-gray-500">Remove microáreas não bloqueadas antes de gerar</p>
                </div>
                <Switch
                  checked={formGerar.limparExistentes}
                  onCheckedChange={(v) => setFormGerar(f => ({ ...f, limparExistentes: v }))}
                />
              </div>
            </div>

            {levantamento && (
              <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-xs text-gray-400 space-y-1">
                <p>📊 {levantamento.totalFamilias?.toLocaleString('pt-BR')} famílias disponíveis</p>
                <p>📍 {levantamento.percentualGeocodificado}% geocodificadas</p>
                {levantamento.percentualGeocodificado < 50 && (
                  <p className="text-yellow-400">⚠️ Geocodifique mais endereços para melhores resultados</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setModalGerarAberto(false)} className="border-gray-600">
              Cancelar
            </Button>
            <Button
              onClick={handleGerarComPreview}
              disabled={previewRedistribuicao.isPending || gerarMicroareas.isPending}
              variant="outline"
              className="border-blue-500 text-blue-400 hover:bg-blue-900"
            >
              {previewRedistribuicao.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Calculando...</>
              ) : (
                <><Eye className="w-4 h-4 mr-2" />Ver Preview Antes/Depois</>
              )}
            </Button>
            <Button
              onClick={handleGerarMicroareas}
              disabled={gerarMicroareas.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {gerarMicroareas.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
              ) : (
                <><Zap className="w-4 h-4 mr-2" />Gerar Direto ({formGerar.quantidadeMicroareas})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Redistribuir Famílias */}
      <Dialog open={modalRedistribuirAberto} onOpenChange={setModalRedistribuirAberto}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-purple-400" />
              Redistribuir para: {microareaAtiva?.nome}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-gray-300">Quantidade de famílias a receber</Label>
              <div className="flex items-center gap-3 mt-2">
                <Slider
                  value={[formRedistribuir.quantidadeFamilias]}
                  onValueChange={([v]) => setFormRedistribuir(f => ({ ...f, quantidadeFamilias: v }))}
                  min={1}
                  max={100}
                  step={1}
                  className="flex-1"
                />
                <span className="text-lg font-bold text-purple-400 w-8 text-center">
                  {formRedistribuir.quantidadeFamilias}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm text-gray-300">Respeitar microáreas bloqueadas</Label>
                <p className="text-xs text-gray-500">Não tirar famílias de microáreas com 🔒</p>
              </div>
              <Switch
                checked={formRedistribuir.respeitarLocked}
                onCheckedChange={(v) => setFormRedistribuir(f => ({ ...f, respeitarLocked: v }))}
              />
            </div>
            <div className="bg-gray-800 rounded-lg p-3 border border-gray-700 text-xs text-gray-400">
              <p>📐 Algoritmo proporcional: distribui famílias das vizinhas proporcionalmente à sua população</p>
              <p className="mt-1">📍 Prioriza famílias geograficamente mais próximas do destino</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalRedistribuirAberto(false)} className="border-gray-600">
              Cancelar
            </Button>
            <Button
              onClick={handleRedistribuir}
              disabled={redistribuir.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {redistribuir.isPending ? 'Redistribuindo...' : `Redistribuir ${formRedistribuir.quantidadeFamilias} famílias`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Preview Antes/Depois da Redistribuição */}
      <Dialog open={modalPreviewAberto} onOpenChange={setModalPreviewAberto}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-400" />
              Preview: Antes vs Depois da Redistribuição
            </DialogTitle>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4 py-2">
              {/* Resumo geral */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'Famílias', value: previewData.totalFamilias?.toLocaleString('pt-BR') },
                  { label: 'Cidadãos', value: previewData.totalCidadaos?.toLocaleString('pt-BR') },
                  { label: 'ACS Ativos', value: previewData.numAcs },
                  { label: 'Geocodificadas', value: `${previewData.percentualGeocodificado}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-lg p-3 text-center border border-gray-700">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className="text-lg font-bold text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Tabela comparativa */}
              <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="text-left p-2 text-gray-300">ACS</th>
                      <th className="text-center p-2 text-gray-300">Fam. Atual</th>
                      <th className="text-center p-2 text-gray-300">Fam. Proposta</th>
                      <th className="text-center p-2 text-gray-300">Delta</th>
                      <th className="text-center p-2 text-gray-300">Status Atual</th>
                      <th className="text-center p-2 text-gray-300">Status Proposto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.estadoProposto?.map((proposto, idx) => {
                      const atual = previewData.estadoAtual?.[idx];
                      const delta = proposto.delta || 0;
                      return (
                        <tr key={proposto.acsId} className="border-t border-gray-700 hover:bg-gray-750">
                          <td className="p-2 text-gray-200 font-medium">{proposto.nomeAcs}</td>
                          <td className="p-2 text-center text-gray-400">{atual?.familias || 0}</td>
                          <td className="p-2 text-center text-white font-semibold">{proposto.familias}</td>
                          <td className="p-2 text-center">
                            <span className={`flex items-center justify-center gap-1 font-semibold ${
                              delta > 0 ? 'text-green-400' : delta < 0 ? 'text-red-400' : 'text-gray-400'
                            }`}>
                              {delta > 0 ? <TrendingUp className="w-3 h-3" /> : delta < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                              {delta > 0 ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                              atual?.statusPnab === 'normal' ? 'bg-green-900 text-green-300' :
                              atual?.statusPnab === 'excesso' ? 'bg-red-900 text-red-300' :
                              atual?.statusPnab === 'baixa_cobertura' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {atual?.statusPnab === 'normal' ? 'Normal' :
                               atual?.statusPnab === 'excesso' ? 'Excesso' :
                               atual?.statusPnab === 'baixa_cobertura' ? 'Baixa' : 'Vazia'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                              proposto.statusPnab === 'normal' ? 'bg-green-900 text-green-300' :
                              proposto.statusPnab === 'excesso' ? 'bg-red-900 text-red-300' :
                              proposto.statusPnab === 'baixa_cobertura' ? 'bg-yellow-900 text-yellow-300' :
                              'bg-gray-700 text-gray-400'
                            }`}>
                              {proposto.statusPnab === 'normal' ? 'Normal' :
                               proposto.statusPnab === 'excesso' ? 'Excesso' :
                               proposto.statusPnab === 'baixa_cobertura' ? 'Baixa' : 'Vazia'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {previewData.percentualGeocodificado < 50 && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-300">
                    Apenas {previewData.percentualGeocodificado}% das famílias estão geocodificadas. 
                    O K-Means++ funciona melhor com mais de 80% de cobertura. 
                    Considere geocodificar mais endereços antes de gerar.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalPreviewAberto(false)} className="border-gray-600">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarGerarAposPreview}
              disabled={gerarMicroareas.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {gerarMicroareas.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Gerando...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Confirmar e Gerar {formGerar.quantidadeMicroareas} Microáreas</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Confirmar Transferência por Drag-and-Drop */}
      <Dialog open={modalDragConfirmAberto} onOpenChange={setModalDragConfirmAberto}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MoveHorizontal className="w-5 h-5 text-orange-400" />
              Confirmar Transferência
            </DialogTitle>
          </DialogHeader>
          {dragPendente && (
            <div className="space-y-4 py-2">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-sm text-gray-300 mb-3">Você está transferindo a família:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-yellow-400" />
                    <span className="font-semibold">{dragPendente.familia.nomeResponsavel || 'Família'}</span>
                  </div>
                  <p className="text-xs text-gray-400 ml-6">{dragPendente.familia.enderecoCompleto}</p>
                  <p className="text-xs text-gray-400 ml-6">{dragPendente.familia.totalCidadaos || 0} cidadão(s)</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-lg p-3 border border-gray-700 text-center">
                  <p className="text-xs text-gray-400">De</p>
                  <p className="font-semibold text-sm">
                    {microareasData.find(m => m.id === dragPendente.familia.microareaId)?.nome || 'Microárea atual'}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-orange-400 shrink-0" />
                <div className="flex-1 bg-orange-900/30 rounded-lg p-3 border border-orange-700 text-center">
                  <p className="text-xs text-orange-300">Para</p>
                  <p className="font-semibold text-sm text-orange-200">{dragPendente.microareaDestino.nome}</p>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Esta ação será registrada no log de auditoria e pode ser desfeita pelo administrador.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setModalDragConfirmAberto(false); setDragPendente(null); }}
              className="border-gray-600"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarDrag}
              disabled={transferirFamilia.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {transferirFamilia.isPending ? (
                <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Transferindo...</>
              ) : (
                <><CheckCircle className="w-4 h-4 mr-2" />Confirmar Transferência</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Solicitar Transferência */}
      <Dialog open={modalSolicitacaoAberto} onOpenChange={setModalSolicitacaoAberto}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-yellow-400" />
              Solicitar Transferência de Família
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm text-gray-300">Microárea de origem</Label>
              <Select
                value={formSolicitacao.microareaOrigemId}
                onValueChange={(v) => setFormSolicitacao(f => ({ ...f, microareaOrigemId: v }))}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600 mt-1">
                  <SelectValue placeholder="Selecione a microárea origem" />
                </SelectTrigger>
                <SelectContent>
                  {microareasData.filter(m => m.id !== microareaAtiva?.id).map(m => (
                    <SelectItem key={m.id} value={String(m.id)}>{m.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm text-gray-300">Motivo da solicitação</Label>
              <Textarea
                value={formSolicitacao.motivo}
                onChange={(e) => setFormSolicitacao(f => ({ ...f, motivo: e.target.value }))}
                placeholder="Descreva o motivo da transferência..."
                className="bg-gray-800 border-gray-600 mt-1 text-sm"
                rows={3}
              />
            </div>
            <p className="text-xs text-gray-500">
              O ACS responsável pela microárea de origem receberá uma notificação para aceitar, negar ou discutir a transferência.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalSolicitacaoAberto(false)} className="border-gray-600">
              Cancelar
            </Button>
            <Button
              onClick={() => criarSolicitacao.mutate({
                microareaOrigemId: parseInt(formSolicitacao.microareaOrigemId),
                microareaDestinoId: microareaAtiva?.id,
                motivo: formSolicitacao.motivo,
              })}
              disabled={!formSolicitacao.microareaOrigemId || !formSolicitacao.motivo || criarSolicitacao.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              {criarSolicitacao.isPending ? 'Enviando...' : 'Enviar Solicitação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
