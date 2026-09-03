import { useMemo } from 'react';
import { TileLayer } from 'react-leaflet';
import { trpc } from '@/lib/trpc';

/**
 * Provedores de mapa disponíveis
 */
export const MAP_PROVIDERS = {
  openstreetmap: {
    label: 'OpenStreetMap (Padrão)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
  carto_dark: {
    label: 'CARTO Dark',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  carto_light: {
    label: 'CARTO Light',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 19,
  },
  google_roadmap: {
    label: 'Google Maps (Ruas)',
    url: 'https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    maxZoom: 20,
  },
  google_satellite: {
    label: 'Google Satélite',
    url: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    maxZoom: 20,
  },
  google_hybrid: {
    label: 'Google Híbrido',
    url: 'https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    attribution: '&copy; <a href="https://maps.google.com">Google Maps</a>',
    maxZoom: 20,
  },
};

/**
 * Hook que retorna a configuração de mapa salva no banco.
 * Retorna o provedor ativo e os dados do tile layer.
 */
export function useMapConfig() {
  const { data: config, isLoading } = trpc.remapeamento.getMapConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache por 5 minutos
    refetchOnWindowFocus: false,
  });

  const tileConfig = useMemo(() => {
    const tipoMapa = config?.tipoMapa || 'carto_dark';
    const provider = MAP_PROVIDERS[tipoMapa] || MAP_PROVIDERS.openstreetmap;
    return {
      tipoMapa,
      ...provider,
      googleMapsApiKey: config?.googleMapsApiKey || null,
    };
  }, [config]);

  return { tileConfig, isLoading, config };
}

/**
 * Componente DynamicTileLayer — substitui o TileLayer estático.
 * Lê a configuração do banco automaticamente e aplica o provedor correto.
 *
 * Uso: <DynamicTileLayer /> (sem props necessárias)
 * Ou com fallback: <DynamicTileLayer fallbackProvider="openstreetmap" />
 */
export function DynamicTileLayer({ fallbackProvider = 'carto_dark' }) {
  const { tileConfig, isLoading } = useMapConfig();

  // Enquanto carrega, usa o fallback para não deixar o mapa em branco
  const provider = isLoading
    ? MAP_PROVIDERS[fallbackProvider] || MAP_PROVIDERS.openstreetmap
    : tileConfig;

  return (
    <TileLayer
      key={provider.url} // força re-render quando muda o provedor
      url={provider.url}
      attribution={provider.attribution}
      maxZoom={provider.maxZoom || 19}
    />
  );
}
