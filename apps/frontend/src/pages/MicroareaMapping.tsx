// @ts-nocheck
import React, { useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, useMap } from 'react-leaflet';
import { DynamicTileLayer } from '@/hooks/useMapConfig';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import JSZip from 'jszip';
import { trpc } from '@/lib/trpc';

// Corrigir ícone padrão do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Converter GeoJSON string para coordenadas Leaflet [lat, lng]
// Retorna array de arrays (suporta Polygon e MultiPolygon)
function geojsonToLeaflet(geojsonStr: string) {
  try {
    const geojson = JSON.parse(geojsonStr);
    const geom = geojson.geometry || geojson;
    if (!geom) return [[]];
    if (geom.type === 'MultiPolygon') {
      // Retorna todos os polígonos do MultiPolygon
      return geom.coordinates.map(poly => poly[0].map(([lng, lat]) => [lat, lng]));
    }
    // Polygon normal
    const coords = geom.coordinates?.[0] || [];
    return [coords.map(([lng, lat]) => [lat, lng])];
  } catch { return [[]]; }
}

// Verificar se é MultiPolygon
function isMultiPolygon(geojsonStr: string) {
  try {
    const geojson = JSON.parse(geojsonStr);
    const geom = geojson.geometry || geojson;
    return geom?.type === 'MultiPolygon';
  } catch { return false; }
}

// Coordenadas de Barra do Choça - BA
const BARRA_DO_CHOCA = { lat: -14.8619, lng: -40.5736 };

// Gerar KML a partir das microáreas
function gerarKML(microareas: any[]) {
  const placemarks = microareas.map(ma => {
    let coordStr = '';
    try {
      const geojson = JSON.parse(ma.geojsonPoligono || '{}');
      const coords = geojson.geometry?.coordinates[0] || geojson.coordinates?.[0] || [];
      coordStr = coords.map(([lng, lat]) => `${lng},${lat},0`).join(' ');
    } catch {}
    const cor = (ma.cor || '#3B82F6').replace('#', '');
    const r = parseInt(cor.slice(0, 2), 16);
    const g = parseInt(cor.slice(2, 4), 16);
    const b = parseInt(cor.slice(4, 6), 16);
    const kmlLine = `7f${b.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${r.toString(16).padStart(2,'0')}`;
    const kmlFill = `4f${b.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${r.toString(16).padStart(2,'0')}`;
    return `  <Placemark>
    <name>${ma.nome}</name>
    <description><![CDATA[<b>ACS:</b> ${ma.acsNome || 'Não atribuído'}<br/><b>Famílias:</b> ${ma.totalFamilias || 0}<br/><b>Cidadãos:</b> ${ma.totalCidadaos || 0}]]></description>
    <Style>
      <LineStyle><color>${kmlLine}</color><width>2</width></LineStyle>
      <PolyStyle><color>${kmlFill}</color></PolyStyle>
    </Style>
    <Polygon><outerBoundaryIs><LinearRing><coordinates>${coordStr}</coordinates></LinearRing></outerBoundaryIs></Polygon>
  </Placemark>`;
  }).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
<Document>
  <name>Microáreas ACS - SUS Analytics</name>
  <description>Mapeamento gerado em ${new Date().toLocaleDateString('pt-BR')}</description>
${placemarks}
</Document>
</kml>`;
}

// Converter cor KML (AABBGGRR) para hex CSS (#RRGGBB)
function kmlCorParaHex(kmlCor: string) {
  if (!kmlCor || kmlCor.length < 8) return '#3B82F6';
  const r = kmlCor.slice(6, 8);
  const g = kmlCor.slice(4, 6);
  const b = kmlCor.slice(2, 4);
  return `#${r}${g}${b}`;
}

// Extrair coordenadas de um elemento <Polygon>
function extrairCoordsPoligono(polygon: any) {
  const coordsText = polygon.querySelector('coordinates')?.textContent?.trim() || '';
  return coordsText.split(/\s+/).map(c => {
    const parts = c.split(',').map(Number);
    return [parts[0], parts[1]];
  }).filter(([lng, lat]) => !isNaN(lng) && !isNaN(lat) && (lng !== 0 || lat !== 0));
}

// Parsear KML e extrair polígonos (suporta Folders, MultiGeometry, estilos)
function parsearKML(kmlText: string) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlText, 'text/xml');

  // Extrair estilos do documento
  const estilos = {};
  doc.querySelectorAll('Style').forEach(style => {
    const id = style.getAttribute('id');
    if (!id) return;
    const cor = style.querySelector('PolyStyle > color')?.textContent;
    if (cor) estilos[id] = kmlCorParaHex(cor);
  });

  // Agrupar placemarks por nome para unir MultiGeometry (mesmo ACS, vários polígonos)
  const grupos = {};
  const placemarks = doc.querySelectorAll('Placemark');

  placemarks.forEach(pm => {
    const nomeCompleto = pm.querySelector('name')?.textContent?.trim() || 'Área importada';

    // Extrair nome do ACS e número da microárea do padrão "ACS - NOME - M. ÁREA XX"
    let nomeArea = nomeCompleto;
    let nomeAcs = '';
    const matchAcs = nomeCompleto.match(/^ACS\s*-\s*([^-]+)\s*-\s*(.+)$/i);
    if (matchAcs) {
      nomeAcs = matchAcs[1].trim();
      nomeArea = matchAcs[2].trim();
    }

    // Determinar cor do estilo
    const styleUrl = pm.querySelector('styleUrl')?.textContent?.replace('#', '') || '';
    const cor = estilos[styleUrl] || '#8B5CF6';

    // Coletar todos os polígonos (Polygon direto ou dentro de MultiGeometry)
    const polygons = pm.querySelectorAll('Polygon');
    const todasCoords = [];
    polygons.forEach(polygon => {
      const coords = extrairCoordsPoligono(polygon);
      if (coords.length >= 3) todasCoords.push(coords);
    });
    if (todasCoords.length === 0) return;

    // Agrupar polígonos do mesmo ACS (MultiGeometry)
    const chave = nomeArea;
    if (!grupos[chave]) {
      grupos[chave] = { nomeArea, nomeAcs, cor, coordsList: [] };
    }
    todasCoords.forEach(c => grupos[chave].coordsList.push(c as any));
  });

  // Converter grupos em resultado final
  return Object.values(grupos).map(({ nomeArea, nomeAcs, cor, coordsList }) => {
    // Usar o maior polígono como polígono principal
    const coordsPrincipal = coordsList.reduce((a, b) => a.length >= b.length ? a : b, coordsList[0]);
    return {
      nome: nomeArea,
      acsNome: nomeAcs || undefined,
      geojsonPoligono: JSON.stringify({
        type: 'Feature',
        properties: { nome: nomeArea, acs: nomeAcs },
        geometry: {
          type: coordsList.length > 1 ? 'MultiPolygon' : 'Polygon',
          coordinates: coordsList.length > 1 ? coordsList.map(c => [c]) : [coordsPrincipal],
        }
      }),
      cor,
    };
  });
}

function MapController({ center }: { center: any }) {
  const map = useMap();
  React.useEffect(() => { if (center) map.setView(center, map.getZoom()); }, [center]);
  return null;
}

const statusCor = (s: any) => s === 'excesso' ? '#EF4444' : s === 'baixa_cobertura' ? '#F59E0B' : '#10B981';
const statusLabel = (s: any) => s === 'excesso' ? 'Excesso' : s === 'baixa_cobertura' ? 'Baixa Cobertura' : s === 'inativa' ? 'Inativa' : 'Normal';

const s = {
  btn: (bg, color = 'white') => ({ padding: '8px 14px', background: bg, color, border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }),
  card: { background: 'white', borderRadius: '12px', padding: '16px', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' },
};

export default function MicroareaMapping() {
  const [activeTab, setActiveTab] = useState('mapa');
  const [selecionada, setSelecionada] = useState(null);
  const [numMicroareas, setNumMicroareas] = useState('');
  const [kmlImportado, setKmlImportado] = useState(null);
  const [mensagem, setMensagem] = useState(null);
  const fileInputRef = useRef(null);
  const utils = trpc.useUtils();

  // Queries tRPC
  const levantamentoQuery = trpc.microareas.levantamentoPopulacional.useQuery();
  const acsQuery = trpc.microareas.listarAcs.useQuery();
  const microareasQuery = trpc.microareas.listarMicroareas.useQuery();
  const relatorioQuery = trpc.microareas.relatorioCobertura.useQuery(undefined, { enabled: activeTab === 'relatorio' });

  const levantamento = levantamentoQuery.data;
  const acsList = acsQuery.data || [];
  const microareas = microareasQuery.data || [];
  const relatorio = relatorioQuery.data;
  const loading = levantamentoQuery.isLoading || microareasQuery.isLoading;

  // Mutations
  const gerarMutation = trpc.microareas.gerarMicroareas.useMutation({
    onSuccess: (res) => {
      utils.microareas.listarMicroareas.invalidate();
      msg(`${res.microareasGeradas} microáreas geradas!${res.alertas?.length > 0 ? ` ⚠️ ${res.alertas.length} alertas.` : ''}`, res.alertas?.length > 0 ? 'warning' : 'success');
      setActiveTab('mapa');
    },
    onError: (e: any) => msg('Erro ao gerar: ' + e.message, 'error'),
  });

  const salvarMutation = trpc.microareas.salvarMicroarea.useMutation({
    onSuccess: () => utils.microareas.listarMicroareas.invalidate(),
    onError: (e: any) => msg('Erro ao salvar: ' + e.message, 'error'),
  });

  React.useEffect(() => {
    if (levantamento && !numMicroareas) {
      setNumMicroareas(String(levantamento.numeroDeMicroareasRecomendado));
    }
  }, [levantamento]);

  function msg(texto: string, tipo: string = 'success') {
    setMensagem({ texto, tipo });
    setTimeout(() => setMensagem(null), 5000);
  }

  async function gerarMicroareasHandler() {
    gerarMutation.mutate({
      numeroDeMicroareas: parseInt(numMicroareas) || undefined,
      usarPerfilAcs: true,
      coordenadasMunicipio: BARRA_DO_CHOCA,
    });
  }

  async function exportarKML() {
    if (microareas.length === 0) { msg('Nenhuma microárea para exportar.', 'warning'); return; }
    try {
      const kmlContent = gerarKML(microareas);
      // Criar arquivo KMZ (ZIP contendo doc.kml)
      const zip = new JSZip();
      zip.file('doc.kml', kmlContent);
      const kmzBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const url = URL.createObjectURL(kmzBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `microareas-barra-do-choca-${new Date().toISOString().split('T')[0]}.kmz`;
      document.body.appendChild(a as any);
      a.click();
      document.body.removeChild(a as any);
      URL.revokeObjectURL(url);
      msg('KMZ exportado com sucesso! Abra no Google Earth ou Google Maps.');
    } catch (err) {
      msg('Erro ao exportar KMZ: ' + err.message, 'error');
    }
  }

  async function importarKML(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      const isKmz = file.name.toLowerCase().endsWith('.kmz');
      let kmlText = '';
      if (isKmz) {
        // Descompactar KMZ (ZIP) e extrair doc.kml
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        // Procurar o arquivo .kml dentro do ZIP
        const kmlFile = Object.values(zip.files).find(f => f.name.endsWith('.kml'));
        if (!kmlFile) { msg('Nenhum arquivo .kml encontrado dentro do KMZ.', 'error'); return; }
        kmlText = await kmlFile.async('string');
      } else {
        // Ler KML diretamente como texto
        kmlText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e: any) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsText(file);
        });
      }
      const areas = parsearKML(kmlText);
      if (areas.length === 0) { msg('Nenhum polígono encontrado no arquivo.', 'error'); return; }
      setKmlImportado(areas);
      msg(`${areas.length} área(s: any) importada(s: any) do ${isKmz ? 'KMZ' : 'KML'}. Clique em "Aplicar" para salvar.`);
    } catch (err) {
      msg('Erro ao importar arquivo: ' + err.message, 'error');
    }
    event.target.value = '';
  }

  async function aplicarKML() {
    if (!kmlImportado) return;
    for (const area of kmlImportado) {
      await salvarMutation.mutateAsync(area);
    }
    msg(`${kmlImportado.length} microáreas salvas!`);
    setKmlImportado(null);
  }

  const mapCenter = [BARRA_DO_CHOCA.lat, BARRA_DO_CHOCA.lng];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 3.5rem)', background: '#f8fafc', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e2e8f0', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>🗺️ Mapeamento de Microáreas ACS</h1>
          <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>Distribuição territorial inteligente — Portaria MS 2.436/2017</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => fileInputRef.current?.click()} style={s.btn('#8B5CF6')}>📂 Importar KMZ/KML</button>
          <input ref={fileInputRef} type="file" accept=".kmz,.kml" style={{ display: 'none' }} onChange={importarKML} />
          <button onClick={exportarKML} style={s.btn('#0ea5e9')}>⬇️ Exportar KMZ</button>
        </div>
      </div>

      {/* Feedback */}
      {mensagem && (
        <div style={{ position: 'fixed', top: '80px', right: '24px', zIndex: 9999, padding: '12px 20px', borderRadius: '8px', fontSize: '14px', fontWeight: 500, background: mensagem.tipo === 'error' ? '#FEE2E2' : mensagem.tipo === 'warning' ? '#FEF3C7' : '#D1FAE5', color: mensagem.tipo === 'error' ? '#991B1B' : mensagem.tipo === 'warning' ? '#92400E' : '#065F46', border: `1px solid ${mensagem.tipo === 'error' ? '#FCA5A5' : mensagem.tipo === 'warning' ? '#FCD34D' : '#6EE7B7'}`, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
          {mensagem.texto}
        </div>
      )}

      {/* Banner KML importado */}
      {kmlImportado && (
        <div style={{ background: '#EDE9FE', borderBottom: '1px solid #C4B5FD', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
          <span style={{ fontSize: '14px', color: '#5B21B6' }}>📂 <strong>{kmlImportado.length} área(s: any)</strong> carregada(s: any) do arquivo KMZ/KML.</span>
          <button onClick={aplicarKML} style={s.btn('#7C3AED')}>✅ Aplicar</button>
          <button onClick={() => setKmlImportado(null)} style={{ ...s.btn('transparent', '#7C3AED'), border: '1px solid #7C3AED' }}>Cancelar</button>
        </div>
      )}

      {/* Cards de levantamento */}
      {levantamento && (
        <div style={{ display: 'flex', gap: '10px', padding: '10px 24px', flexShrink: 0, overflowX: 'auto', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
          {[
            { label: 'Cidadãos', value: levantamento.totalCidadaos?.toLocaleString('pt-BR'), icon: '👥', color: '#3B82F6' },
            { label: 'Famílias', value: levantamento.totalFamilias?.toLocaleString('pt-BR'), icon: '🏠', color: '#10B981' },
            { label: 'ACS', value: levantamento.totalAcs, icon: '🧑‍⚕️', color: '#8B5CF6' },
            { label: 'Recomendadas', value: levantamento.numeroDeMicroareasRecomendado, icon: '🗺️', color: '#F59E0B' },
            { label: 'Criadas', value: microareas.length, icon: '✅', color: '#06B6D4' },
            { label: 'Limite MS (Fam.)', value: levantamento.limiteMsFamilias, icon: '⚖️', color: '#EF4444' },
          ].map((c, i) => (
            <div key={i} style={{ background: '#f8fafc', borderRadius: '10px', padding: '8px 12px', minWidth: '110px', flexShrink: 0, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '16px' }}>{c.icon}</div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: '10px', color: '#64748b' }}>{c.label}</div>
            </div>
          ))}
          {levantamento.fonte === 'mock' && (
            <div style={{ background: '#FEF3C7', borderRadius: '10px', padding: '8px 12px', minWidth: '200px', flexShrink: 0, border: '1px solid #FCD34D', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#92400E' }}>⚠️ Dados de demonstração. Conecte ao PEC para dados reais.</span>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', padding: '0 24px', borderBottom: '1px solid #e2e8f0', background: 'white', flexShrink: 0 }}>
        {[
          { id: 'mapa', label: '🗺️ Mapa' },
          { id: 'gerar', label: '⚡ Gerar Automaticamente' },
          { id: 'acs', label: '🧑‍⚕️ Perfil ACS' },
          { id: 'lista', label: '📋 Lista' },
          { id: 'relatorio', label: '📊 Relatório' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', fontWeight: activeTab === tab.id ? 700 : 500, color: activeTab === tab.id ? '#3B82F6' : '#64748b', borderBottom: activeTab === tab.id ? '2px solid #3B82F6' : '2px solid transparent', whiteSpace: 'nowrap' }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', minHeight: 0 }}>

        {/* TAB MAPA */}
        {activeTab === 'mapa' && (
          <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <MapContainer center={mapCenter} zoom={13} style={{ width: '100%', height: '100%' }}>
                <DynamicTileLayer fallbackProvider="openstreetmap" />
                {microareas.map((ma: any, i: number) => {
                  const coordsLists = geojsonToLeaflet(ma.geojsonPoligono || '');
                  const cor = ma.cor || '#3B82F6';
                  const popup = (
                    <Popup>
                      <div style={{ minWidth: '180px' }}>
                        <strong style={{ color: cor }}>{ma.nome}</strong>
                        <hr style={{ margin: '6px 0' }} />
                        <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
                          <div>👤 <b>ACS:</b> {ma.acsNome || 'Não atribuído'}</div>
                          <div>🏠 <b>Famílias:</b> {ma.totalFamilias || 0}</div>
                          <div>👥 <b>Cidadãos:</b> {ma.totalCidadaos || 0}</div>
                          <div>📊 <b>Status:</b> <span style={{ color: statusCor(ma.status) }}>{statusLabel(ma.status)}</span></div>
                        </div>
                      </div>
                    </Popup>
                  );
                  return coordsLists.map((coords: any, j: number) => {
                    if (!coords || coords.length < 3) return null;
                    return (
                      <Polygon key={`${ma.id || i}-${j}`} positions={coords}
                        pathOptions={{ color: cor, fillColor: cor, fillOpacity: selecionada?.id === ma.id ? 0.5 : 0.25, weight: selecionada?.id === ma.id ? 3 : 2 }}
                        eventHandlers={{ click: () => setSelecionada(ma) }}>
                        {popup}
                      </Polygon>
                    );
                  });
                })}
                {kmlImportado && kmlImportado.map((area: any, i: number) => {
                  const coordsLists = geojsonToLeaflet(area.geojsonPoligono || '');
                  return coordsLists.map((coords: any, j: number) => {
                    if (!coords || coords.length < 3) return null;
                    return (
                      <Polygon key={`kml-${i}-${j}`} positions={coords}
                        pathOptions={{ color: area.cor || '#7C3AED', fillColor: area.cor || '#7C3AED', fillOpacity: 0.3, weight: 2, dashArray: '5,5' }}>
                        <Popup>
                          <strong style={{ color: area.cor || '#7C3AED' }}>{area.nome}</strong>
                          {area.acsNome && <div style={{ fontSize: '12px', color: '#64748b' }}>👤 ACS: {area.acsNome}</div>}
                          <br /><small>Aguardando aplicação</small>
                        </Popup>
                      </Polygon>
                    );
                  });
                })}
              </MapContainer>

              {/* Legenda */}
              {microareas.length > 0 && (
                <div style={{ position: 'absolute', bottom: '20px', left: '20px', zIndex: 1000, background: 'white', borderRadius: '10px', padding: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.15)', maxHeight: '220px', overflowY: 'auto', minWidth: '180px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#374151', marginBottom: '8px' }}>MICROÁREAS ({microareas.length})</div>
                  {microareas.slice(0, 15).map((ma: any, i: number) => (
                    <div key={i} onClick={() => setSelecionada(ma)} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', background: selecionada?.id === ma.id ? '#EFF6FF' : 'transparent' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: ma.cor || '#3B82F6', flexShrink: 0 }} />
                      <span style={{ fontSize: '11px', color: '#374151' }}>{ma.nome}</span>
                      <span style={{ fontSize: '9px', color: statusCor(ma.status), marginLeft: 'auto' }}>●</span>
                    </div>
                  ))}
                  {microareas.length > 15 && <div style={{ fontSize: '10px', color: '#94a3b8', textAlign: 'center' }}>+{microareas.length - 15} mais</div>}
                </div>
              )}

              {/* Empty state */}
              {microareas.length === 0 && !loading && (
                <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000, background: 'white', borderRadius: '16px', padding: '32px', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: '320px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🗺️</div>
                  <h3 style={{ margin: '0 0 8px', fontSize: '16px', color: '#1e293b' }}>Nenhuma microárea criada</h3>
                  <p style={{ margin: '0 0 16px', fontSize: '13px', color: '#64748b' }}>Use a aba "Gerar Automaticamente" para criar microáreas com K-Means, ou importe um arquivo KML.</p>
                  <button onClick={() => setActiveTab('gerar')} style={s.btn('#3B82F6')}>⚡ Gerar Automaticamente</button>
                </div>
              )}
            </div>

            {/* Painel lateral da área selecionada */}
            {selecionada && (
              <div style={{ width: '280px', background: 'white', borderLeft: '1px solid #e2e8f0', padding: '20px', overflowY: 'auto', flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>{selecionada.nome}</h3>
                  <button onClick={() => setSelecionada(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#94a3b8' }}>✕</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '3px', background: selecionada.cor || '#3B82F6' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, color: statusCor(selecionada.status), background: `${statusCor(selecionada.status)}20`, padding: '2px 8px', borderRadius: '10px' }}>{statusLabel(selecionada.status)}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Famílias', value: selecionada.totalFamilias || 0, max: 450, icon: '🏠' },
                    { label: 'Cidadãos', value: selecionada.totalCidadaos || 0, max: 750, icon: '👥' },
                  ].map((stat, i) => (
                    <div key={i} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', color: '#64748b' }}>{stat.icon} {stat.label}</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: stat.value > stat.max ? '#EF4444' : '#1e293b' }}>{stat.value}</div>
                      <div style={{ fontSize: '10px', color: '#94a3b8' }}>Limite: {stat.max}</div>
                      <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, stat.value / stat.max * 100)}%`, background: stat.value > stat.max ? '#EF4444' : '#10B981', borderRadius: '2px' }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '11px', color: '#64748b' }}>ACS Responsável</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{selecionada.acsNome || 'Não atribuído'}</div>
                </div>
                {selecionada.status === 'excesso' && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '12px', color: '#991B1B' }}>
                    ⚠️ Excede limite do MS. Redistribua os domicílios.
                  </div>
                )}
                <button onClick={() => {
                  const kml = gerarKML([selecionada]);
                  const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${selecionada.nome.replace(/\s+/g, '-')}.kml`;
                  a.click();
                  URL.revokeObjectURL(url);
                }} style={{ ...s.btn('#0ea5e9'), width: '100%' }}>
                  ⬇️ Exportar esta área KML
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB GERAR */}
        {activeTab === 'gerar' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '680px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>⚡ Geração Automática de Microáreas</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>Algoritmo K-Means agrupa domicílios geograficamente respeitando os limites do Ministério da Saúde e o perfil de cada ACS.</p>

              {levantamento && (
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: '13px', fontWeight: 700, color: '#1D4ED8' }}>📊 Levantamento Populacional</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    {[
                      { label: 'Cidadãos', value: levantamento.totalCidadaos?.toLocaleString('pt-BR') },
                      { label: 'Famílias', value: levantamento.totalFamilias?.toLocaleString('pt-BR') },
                      { label: 'ACS', value: levantamento.totalAcs },
                      { label: 'Média Cid./ACS', value: levantamento.mediaCidadaosPorAcs?.toLocaleString('pt-BR') },
                      { label: 'Média Fam./ACS', value: levantamento.mediaFamiliasPorAcs?.toLocaleString('pt-BR') },
                      { label: 'Microáreas Rec.', value: levantamento.numeroDeMicroareasRecomendado },
                    ].map((item: any, i: number) => (
                      <div key={i} style={{ background: 'white', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{item.label}</div>
                        <div style={{ fontSize: '18px', fontWeight: 700, color: '#1D4ED8' }}>{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ ...s.card, marginBottom: '16px' }}>
                <h3 style={{ margin: '0 0 14px', fontSize: '13px', fontWeight: 700, color: '#374151' }}>⚙️ Configuração</h3>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '6px' }}>Número de Microáreas</label>
                  <input type="number" value={numMicroareas} onChange={e => setNumMicroareas(e.target.value)} min="1" max="200"
                    placeholder={levantamento?.numeroDeMicroareasRecomendado || '41'}
                    style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', boxSizing: 'border-box' }} />
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Recomendado: {levantamento?.numeroDeMicroareasRecomendado || '—'}</div>
                </div>
              </div>

              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '14px', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: '#166534' }}>✅ Limites do Ministério da Saúde (Portaria 2.436/2017)</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '13px', color: '#166534' }}>
                  <div>• Máx. 750 famílias por ACS</div>
                  <div>• Máx. 3.500 cidadãos por ACS</div>
                  <div>• Máx. 450 famílias por microárea</div>
                  <div>• Máx. 750 cidadãos por microárea</div>
                </div>
              </div>

              <button onClick={gerarMicroareasHandler} disabled={gerarMutation.isPending}
                style={{ width: '100%', padding: '14px', background: gerarMutation.isPending ? '#94a3b8' : '#3B82F6', color: 'white', border: 'none', borderRadius: '10px', cursor: gerarMutation.isPending ? 'not-allowed' : 'pointer', fontSize: '15px', fontWeight: 700 }}>
                {gerarMutation.isPending ? '⏳ Gerando microáreas com K-Means...' : `⚡ Gerar ${numMicroareas || levantamento?.numeroDeMicroareasRecomendado || '?'} Microáreas`}
              </button>
            </div>
          </div>
        )}

        {/* TAB ACS */}
        {activeTab === 'acs' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>🧑‍⚕️ Perfil dos ACS</h2>
              <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>O sistema ajusta automaticamente as microáreas com base no perfil de cada ACS: idade, experiência e localização.</p>
              {acsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '48px' }}>🧑‍⚕️</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px' }}>Nenhum ACS encontrado</div>
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>Conecte ao banco PEC para carregar os ACS reais.</div>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
                  {acsList.map((acs: any, i: number) => (
                    <div key={acs.id || i} style={s.card}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: `hsl(${i * 47 % 360}, 65%, 55%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '15px', flexShrink: 0 }}>
                          {acs.nomeAcs?.charAt(0) || '?'}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '13px', color: '#1e293b' }}>{acs.nomeAcs}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>CNS: {acs.cnsAcs || '—'}</div>
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px' }}>
                        {[
                          { label: 'Idade', value: acs.idadeAcs ? `${acs.idadeAcs} anos` : '—' },
                          { label: 'Experiência', value: acs.anosExperiencia ? `${acs.anosExperiencia} anos` : '—' },
                          { label: 'Cap. Famílias', value: acs.capacidadeMaxFamilias || 450, warn: (acs.capacidadeMaxFamilias || 450) < 400 },
                          { label: 'Cap. Cidadãos', value: acs.capacidadeMaxCidadaos || 750, warn: (acs.capacidadeMaxCidadaos || 750) < 600 },
                        ].map((item: any, j: number) => (
                          <div key={j} style={{ background: '#f8fafc', borderRadius: '6px', padding: '8px' }}>
                            <div style={{ color: '#94a3b8', fontSize: '10px' }}>{item.label}</div>
                            <div style={{ fontWeight: 600, color: item.warn ? '#F59E0B' : '#374151' }}>{item.value}</div>
                          </div>
                        ))}
                      </div>
                      {acs.idadeAcs >= 55 && <div style={{ marginTop: '8px', fontSize: '11px', color: '#92400E', background: '#FEF3C7', padding: '4px 8px', borderRadius: '4px' }}>⚠️ ACS sênior — capacidade reduzida</div>}
                      {acs.anosExperiencia >= 10 && <div style={{ marginTop: '6px', fontSize: '11px', color: '#065F46', background: '#D1FAE5', padding: '4px 8px', borderRadius: '4px' }}>⭐ Experiente — pode assumir áreas complexas</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB LISTA */}
        {activeTab === 'lista' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', margin: 0 }}>📋 Lista de Microáreas ({microareas.length})</h2>
                <button onClick={exportarKML} style={s.btn('#0ea5e9')}>⬇️ Exportar todas KML</button>
              </div>
              {microareas.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '48px' }}>🗺️</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px' }}>Nenhuma microárea criada</div>
                </div>
              ) : (
                <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        {['', 'Nome', 'ACS', 'Famílias', 'Cidadãos', '% Limite', 'Status', ''].map((h: any, i: number) => (
                          <th key={i} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {microareas.map((ma: any, i: number) => (
                        <tr key={ma.id || i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}><div style={{ width: '14px', height: '14px', borderRadius: '3px', background: ma.cor || '#3B82F6' }} /></td>
                          <td style={{ padding: '10px 12px', fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>{ma.nome}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#374151' }}>{ma.acsNome || '—'}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: (ma.totalFamilias || 0) > 450 ? '#EF4444' : '#374151', fontWeight: (ma.totalFamilias || 0) > 450 ? 700 : 400 }}>{ma.totalFamilias || 0}</td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: (ma.totalCidadaos || 0) > 750 ? '#EF4444' : '#374151', fontWeight: (ma.totalCidadaos || 0) > 750 ? 700 : 400 }}>{ma.totalCidadaos || 0}</td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px', minWidth: '50px' }}>
                                <div style={{ height: '100%', width: `${Math.min(100, (ma.totalFamilias || 0) / 450 * 100)}%`, background: (ma.totalFamilias || 0) > 450 ? '#EF4444' : '#10B981', borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '10px', color: '#64748b' }}>{Math.round((ma.totalFamilias || 0) / 450 * 100)}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: statusCor(ma.status), background: `${statusCor(ma.status)}20`, padding: '2px 8px', borderRadius: '10px' }}>{statusLabel(ma.status)}</span>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button onClick={() => { setSelecionada(ma); setActiveTab('mapa'); }} style={{ ...s.btn('#EFF6FF', '#3B82F6'), padding: '4px 8px', fontSize: '11px' }}>🗺️</button>
                              <button onClick={() => {
                                const kml = gerarKML([ma]);
                                const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `${ma.nome.replace(/\s+/g, '-')}.kml`;
                                a.click();
                                URL.revokeObjectURL(url);
                              }} style={{ ...s.btn('#F0F9FF', '#0EA5E9'), padding: '4px 8px', fontSize: '11px' }}>⬇️</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB RELATÓRIO */}
        {activeTab === 'relatorio' && (
          <div style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '16px' }}>📊 Relatório de Cobertura Territorial</h2>
              {relatorioQuery.isLoading ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '48px' }}>⏳</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px' }}>Carregando relatório...</div>
                </div>
              ) : !relatorio ? (
                <div style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                  <div style={{ fontSize: '48px' }}>📊</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, marginTop: '16px' }}>Sem dados para exibir</div>
                  <div style={{ fontSize: '13px', marginTop: '8px' }}>Gere microáreas primeiro para ver o relatório.</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { label: 'Total Microáreas', value: relatorio.resumo.totalMicroareas, color: '#3B82F6', icon: '🗺️' },
                      { label: 'Dentro do Limite', value: relatorio.resumo.microareasNormais, color: '#10B981', icon: '✅' },
                      { label: 'Com Excesso', value: relatorio.resumo.microareasExcesso, color: '#EF4444', icon: '⚠️' },
                      { label: 'Baixa Cobertura', value: relatorio.resumo.microareasBaixaCobertura, color: '#F59E0B', icon: '📉' },
                    ].map((item: any, i: number) => (
                      <div key={i} style={{ ...s.card, textAlign: 'center' }}>
                        <div style={{ fontSize: '24px' }}>{item.icon}</div>
                        <div style={{ fontSize: '28px', fontWeight: 700, color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: '12px', color: '#64748b' }}>{item.label}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ ...s.card, marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#374151' }}>Cobertura Geral</h3>
                      <span style={{ fontSize: '24px', fontWeight: 700, color: relatorio.resumo.percentualCobertura >= 80 ? '#10B981' : '#EF4444' }}>{relatorio.resumo.percentualCobertura}%</span>
                    </div>
                    <div style={{ height: '10px', background: '#e2e8f0', borderRadius: '5px' }}>
                      <div style={{ height: '100%', width: `${relatorio.resumo.percentualCobertura}%`, background: relatorio.resumo.percentualCobertura >= 80 ? '#10B981' : '#F59E0B', borderRadius: '5px' }} />
                    </div>
                  </div>

                  {relatorio.alertas?.length > 0 && (
                    <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', padding: '14px', marginBottom: '16px' }}>
                      <h3 style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 700, color: '#991B1B' }}>⚠️ Alertas ({relatorio.alertas.length})</h3>
                      {relatorio.alertas.map((alerta: any, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 0', borderBottom: i < relatorio.alertas.length - 1 ? '1px solid #FEE2E2' : 'none' }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: alerta.tipo === 'excesso' ? '#EF4444' : '#F59E0B', background: alerta.tipo === 'excesso' ? '#FEE2E2' : '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>{alerta.tipo === 'excesso' ? 'EXCESSO' : 'BAIXA'}</span>
                          <span style={{ fontSize: '13px', color: '#374151' }}><strong>{alerta.microarea}:</strong> {alerta.mensagem}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {relatorio.porAcs?.length > 0 && (
                    <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: '16px' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#374151' }}>Distribuição por ACS</h3>
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f8fafc' }}>
                            {['ACS', 'Microáreas', 'Famílias', '% Limite', 'Cidadãos', 'Status'].map(h => (
                              <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 700, color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {relatorio.porAcs.map((acs: any, i: number) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 12px', fontWeight: 600, fontSize: '13px' }}>{acs.nomeAcs}</td>
                              <td style={{ padding: '8px 12px', fontSize: '13px' }}>{acs.totalMicroareas}</td>
                              <td style={{ padding: '8px 12px', fontSize: '13px', color: acs.totalFamilias > 750 ? '#EF4444' : '#374151' }}>{acs.totalFamilias}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <div style={{ flex: 1, height: '5px', background: '#e2e8f0', borderRadius: '3px' }}>
                                    <div style={{ height: '100%', width: `${Math.min(100, acs.percentualLimiteFamilias)}%`, background: acs.percentualLimiteFamilias > 100 ? '#EF4444' : acs.percentualLimiteFamilias > 80 ? '#F59E0B' : '#10B981', borderRadius: '3px' }} />
                                  </div>
                                  <span style={{ fontSize: '10px', color: '#64748b' }}>{acs.percentualLimiteFamilias}%</span>
                                </div>
                              </td>
                              <td style={{ padding: '8px 12px', fontSize: '13px' }}>{acs.totalCidadaos}</td>
                              <td style={{ padding: '8px 12px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: acs.dentroDoLimite ? '#10B981' : '#EF4444', background: acs.dentroDoLimite ? '#D1FAE5' : '#FEE2E2', padding: '2px 8px', borderRadius: '10px' }}>
                                  {acs.dentroDoLimite ? '✅ OK' : '⚠️ Excesso'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <button onClick={exportarKML} style={s.btn('#0ea5e9')}>⬇️ Exportar Mapa KML</button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
