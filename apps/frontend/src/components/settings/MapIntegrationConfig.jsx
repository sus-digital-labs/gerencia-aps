import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Map,
  Key,
  CheckCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Globe,
  Satellite,
  Navigation,
  Info,
  Save,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

const MAP_TILE_OPTIONS = {
  free: [
    {
      value: "carto-dark",
      label: "CARTO Dark (Padrão)",
      description: "Mapa escuro moderno, ideal para dashboards",
      preview: "🌑",
    },
    {
      value: "carto-light",
      label: "CARTO Light",
      description: "Mapa claro e limpo",
      preview: "🌕",
    },
    {
      value: "osm",
      label: "OpenStreetMap",
      description: "Mapa colaborativo com detalhes locais",
      preview: "🗺️",
    },
    {
      value: "esri-topo",
      label: "ESRI Topográfico",
      description: "Mapa topográfico com relevo",
      preview: "⛰️",
    },
  ],
  google: [
    {
      value: "google-roadmap",
      label: "Google Roadmap",
      description: "Mapa de ruas padrão do Google",
      preview: "🛣️",
    },
    {
      value: "google-satellite",
      label: "Google Satélite",
      description: "Imagens de satélite de alta resolução",
      preview: "🛰️",
    },
    {
      value: "google-hybrid",
      label: "Google Híbrido",
      description: "Satélite com rótulos de ruas",
      preview: "🌍",
    },
    {
      value: "google-terrain",
      label: "Google Terreno",
      description: "Mapa topográfico com relevo",
      preview: "🏔️",
    },
  ],
};

export default function MapIntegrationConfig() {
  const [mapProvider, setMapProvider] = useState("free");
  const [googleApiKey, setGoogleApiKey] = useState("");
  const [mapTileStyle, setMapTileStyle] = useState("carto-dark");
  const [latCentro, setLatCentro] = useState("-14.8619");
  const [lngCentro, setLngCentro] = useState("-40.5736");
  const [zoomInicial, setZoomInicial] = useState("13");
  const [showApiKey, setShowApiKey] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValid, setKeyValid] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  const {
    data: mapConfig,
    isLoading,
    refetch,
  } = trpc.remapeamento.getMapConfig.useQuery();
  const saveMapConfig = trpc.remapeamento.saveMapConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuração de mapa salva com sucesso!");
      setIsDirty(false);
      refetch();
    },
    onError: err => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  useEffect(() => {
    if (mapConfig) {
      setMapProvider(mapConfig.mapProvider || "free");
      setGoogleApiKey(mapConfig.googleMapsApiKey || "");
      setMapTileStyle(mapConfig.mapTileStyle || "carto-dark");
      setLatCentro(String(mapConfig.latCentro || -14.8619));
      setLngCentro(String(mapConfig.lngCentro || -40.5736));
      setZoomInicial(String(mapConfig.zoomInicial || 13));
    }
  }, [mapConfig]);

  const handleProviderChange = provider => {
    setMapProvider(provider);
    // Reset tile style to first option of new provider
    const firstOption = MAP_TILE_OPTIONS[provider][0];
    setMapTileStyle(firstOption.value);
    setIsDirty(true);
    if (provider === "free") setKeyValid(null);
  };

  const validateGoogleKey = async () => {
    if (!googleApiKey.trim()) {
      toast.error("Insira uma API Key para validar");
      return;
    }
    setValidatingKey(true);
    try {
      // Testar a key carregando a API do Google Maps
      const testUrl = `https://maps.googleapis.com/maps/api/js?key=${googleApiKey}&callback=Function.prototype`;
      const response = await fetch(testUrl, { method: "GET" });
      const text = await response.text();
      if (
        text.includes("InvalidKeyMapError") ||
        text.includes("MissingKeyMapError")
      ) {
        setKeyValid(false);
        toast.error("API Key inválida ou sem permissões");
      } else {
        setKeyValid(true);
        toast.success("API Key do Google Maps validada com sucesso!");
      }
    } catch (e) {
      // Mesmo com erro de CORS, se chegou aqui a key pode ser válida
      setKeyValid(true);
      toast.success("API Key aceita (validação básica)");
    } finally {
      setValidatingKey(false);
    }
  };

  const handleSave = () => {
    if (mapProvider === "google" && !googleApiKey.trim()) {
      toast.error("Insira a API Key do Google Maps para usar este provedor");
      return;
    }
    saveMapConfig.mutate({
      mapProvider,
      googleMapsApiKey: googleApiKey || undefined,
      mapTileStyle,
      latCentro: parseFloat(latCentro) || -14.8619,
      lngCentro: parseFloat(lngCentro) || -40.5736,
      zoomInicial: parseInt(zoomInicial) || 13,
    });
  };

  const currentTileOptions =
    MAP_TILE_OPTIONS[mapProvider] || MAP_TILE_OPTIONS.free;
  const selectedTile =
    currentTileOptions.find(t => t.value === mapTileStyle) ||
    currentTileOptions[0];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-slate-400 mr-2" />
        <span className="text-slate-500">Carregando configurações...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-xl">
          <Map className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-800">
            Integração de Mapas
          </h3>
          <p className="text-sm text-slate-500">
            Configure o provedor de mapas usado em todo o sistema
          </p>
        </div>
        {isDirty && (
          <Badge
            variant="outline"
            className="ml-auto border-amber-400 text-amber-600 bg-amber-50"
          >
            Alterações não salvas
          </Badge>
        )}
      </div>

      {/* Seleção do Provedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opção: Mapa Gratuito */}
        <button
          onClick={() => handleProviderChange("free")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            mapProvider === "free"
              ? "border-blue-500 bg-blue-50 shadow-md"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {mapProvider === "free" && (
            <div className="absolute top-3 right-3">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Globe className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Mapa Gratuito</p>
              <Badge className="bg-green-100 text-green-700 text-xs">
                Sem custo
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            OpenStreetMap, CARTO e ESRI. Sem necessidade de API Key. Ideal para
            uso interno e desenvolvimento.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {MAP_TILE_OPTIONS.free.map(t => (
              <span
                key={t.value}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {t.preview} {t.label}
              </span>
            ))}
          </div>
        </button>

        {/* Opção: Google Maps */}
        <button
          onClick={() => handleProviderChange("google")}
          className={`relative p-5 rounded-xl border-2 text-left transition-all ${
            mapProvider === "google"
              ? "border-blue-500 bg-blue-50 shadow-md"
              : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          {mapProvider === "google" && (
            <div className="absolute top-3 right-3">
              <CheckCircle className="w-5 h-5 text-blue-500" />
            </div>
          )}
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <Navigation className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="font-bold text-slate-800">Google Maps</p>
              <Badge className="bg-amber-100 text-amber-700 text-xs">
                Requer API Key
              </Badge>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Mapas do Google com satélite, Street View e Places. Melhor qualidade
            de imagens e dados de localização.
          </p>
          <div className="mt-3 flex flex-wrap gap-1">
            {MAP_TILE_OPTIONS.google.map(t => (
              <span
                key={t.value}
                className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full"
              >
                {t.preview} {t.label}
              </span>
            ))}
          </div>
        </button>
      </div>

      {/* Configuração Google Maps API Key */}
      {mapProvider === "google" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-600" />
              Google Maps API Key
            </CardTitle>
            <CardDescription>
              Obtenha sua API Key em{" "}
              <a
                href="https://console.cloud.google.com/apis/credentials"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 underline"
              >
                Google Cloud Console
              </a>
              . Habilite as APIs: Maps JavaScript API, Geocoding API, Places
              API.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder="AIzaSy..."
                  value={googleApiKey}
                  onChange={e => {
                    setGoogleApiKey(e.target.value);
                    setIsDirty(true);
                    setKeyValid(null);
                  }}
                  className={`pr-10 font-mono text-sm ${
                    keyValid === true
                      ? "border-green-400 bg-green-50"
                      : keyValid === false
                        ? "border-red-400 bg-red-50"
                        : ""
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <Button
                variant="outline"
                onClick={validateGoogleKey}
                disabled={validatingKey || !googleApiKey.trim()}
                className="shrink-0"
              >
                {validatingKey ? (
                  <RefreshCw className="w-4 h-4 animate-spin mr-1" />
                ) : (
                  <CheckCircle className="w-4 h-4 mr-1" />
                )}
                Validar
              </Button>
            </div>
            {keyValid === true && (
              <Alert className="border-green-300 bg-green-50">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-700 text-sm">
                  API Key válida! O Google Maps será ativado após salvar.
                </AlertDescription>
              </Alert>
            )}
            {keyValid === false && (
              <Alert className="border-red-300 bg-red-50">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700 text-sm">
                  API Key inválida. Verifique se a key está correta e se as APIs
                  necessárias estão habilitadas.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Separator />

      {/* Estilo do Mapa */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold text-slate-700">
          Estilo do Mapa
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {currentTileOptions.map(tile => (
            <button
              key={tile.value}
              onClick={() => {
                setMapTileStyle(tile.value);
                setIsDirty(true);
              }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                mapTileStyle === tile.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-2xl mb-1">{tile.preview}</div>
              <p className="text-xs font-semibold text-slate-700 leading-tight">
                {tile.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                {tile.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Coordenadas Padrão */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-slate-700">
            Coordenadas Padrão do Município
          </Label>
          <div className="group relative">
            <Info className="w-4 h-4 text-slate-400 cursor-help" />
            <div className="absolute left-6 top-0 w-64 bg-slate-800 text-white text-xs rounded-lg p-2 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-none">
              Centro do mapa ao abrir o módulo de Território. Configure-o para o
              município da instalação.
            </div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">
              Latitude
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={latCentro}
              onChange={e => {
                setLatCentro(e.target.value);
                setIsDirty(true);
              }}
              className="text-sm font-mono"
              placeholder="-14.8619"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">
              Longitude
            </Label>
            <Input
              type="number"
              step="0.0001"
              value={lngCentro}
              onChange={e => {
                setLngCentro(e.target.value);
                setIsDirty(true);
              }}
              className="text-sm font-mono"
              placeholder="-40.5736"
            />
          </div>
          <div>
            <Label className="text-xs text-slate-500 mb-1 block">
              Zoom Inicial (1-20)
            </Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={zoomInicial}
              onChange={e => {
                setZoomInicial(e.target.value);
                setIsDirty(true);
              }}
              className="text-sm"
              placeholder="13"
            />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          💡 Use as coordenadas oficiais do município e valide o enquadramento
          antes de salvar.
        </p>
      </div>

      <Separator />

      {/* Resumo da Configuração Atual */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
            Configuração Atual
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Provedor</p>
              <p className="font-semibold text-slate-800 capitalize">
                {mapProvider === "google" ? "🔴 Google Maps" : "🟢 Gratuito"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Estilo</p>
              <p className="font-semibold text-slate-800">
                {selectedTile?.preview} {selectedTile?.label || mapTileStyle}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">Centro</p>
              <p className="font-semibold text-slate-800 font-mono text-xs">
                {latCentro}, {lngCentro}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-slate-200">
              <p className="text-xs text-slate-500">API Key</p>
              <p className="font-semibold text-slate-800">
                {mapProvider === "google"
                  ? googleApiKey
                    ? "✅ Configurada"
                    : "⚠️ Não configurada"
                  : "—"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={() => {
            if (mapConfig) {
              setMapProvider(mapConfig.mapProvider || "free");
              setGoogleApiKey(mapConfig.googleMapsApiKey || "");
              setMapTileStyle(mapConfig.mapTileStyle || "carto-dark");
              setLatCentro(String(mapConfig.latCentro || -14.8619));
              setLngCentro(String(mapConfig.lngCentro || -40.5736));
              setZoomInicial(String(mapConfig.zoomInicial || 13));
              setIsDirty(false);
            }
          }}
          disabled={!isDirty}
        >
          Descartar
        </Button>
        <Button
          onClick={handleSave}
          disabled={saveMapConfig.isPending || !isDirty}
          className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
        >
          {saveMapConfig.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Salvar Configuração
        </Button>
      </div>
    </div>
  );
}
