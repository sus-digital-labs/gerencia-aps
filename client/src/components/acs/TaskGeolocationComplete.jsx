import trpc from '@/lib/trpc-adapter';
import React, { useState, useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Navigation, MapPin, CheckCircle2, AlertTriangle, Loader2, X, Target, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TaskGeolocationComplete({ task, onClose, onComplete, mode = 'complete' }) {
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  
  const queryClient = useQueryClient();
  const isStarting = mode === 'start';

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador');
      return;
    }

    setIsGettingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        };
        setLocation(loc);
        setIsGettingLocation(false);

        // Validate against expected location (only when completing)
        if (!isStarting && task.expected_latitude && task.expected_longitude) {
          const distance = calculateDistance(
            loc.latitude, loc.longitude,
            task.expected_latitude, task.expected_longitude
          );
          setValidationResult({
            distance,
            valid: distance <= 100,
            message: distance <= 100 
              ? 'Você está no local correto!' 
              : `Você está a ${Math.round(distance)}m do local esperado`
          });
        }
      },
      (error) => {
        setIsGettingLocation(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Permissão de localização negada. Habilite nas configurações do navegador.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Localização indisponível. Verifique o GPS.');
            break;
          case error.TIMEOUT:
            setLocationError('Tempo esgotado ao obter localização. Tente novamente.');
            break;
          default:
            setLocationError('Erro ao obter localização.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3;
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: (data) => trpc.ACSTask.update(task.id, data),
    onSuccess: () => {
      toast.success(isStarting ? 'Tarefa iniciada!' : 'Tarefa concluída com sucesso!');
      queryClient.invalidateQueries(['acsTasks']);
      onComplete?.();
      onClose();
    },
    onError: () => {
      toast.error('Erro ao atualizar tarefa');
    }
  });

  const handleSubmit = () => {
    let updateData;

    if (isStarting) {
      updateData = {
        status: 'em_andamento',
        start_latitude: location?.latitude,
        start_longitude: location?.longitude,
        start_time: new Date().toISOString(),
        start_accuracy: location?.accuracy,
        notes: notes
      };
    } else {
      updateData = {
        status: 'concluida',
        completed_at: new Date().toISOString(),
        completion_notes: notes,
        latitude: location?.latitude,
        longitude: location?.longitude,
        location_accuracy: location?.accuracy,
        location_validated: validationResult?.valid ?? null,
        location_distance: validationResult?.distance ?? null
      };
    }

    updateTaskMutation.mutate(updateData);
  };

  // Get location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <Card className="shadow-xl border-0 max-w-lg mx-auto">
      <CardHeader className={`bg-gradient-to-r ${isStarting ? 'from-blue-600 to-cyan-600' : 'from-emerald-600 to-teal-600'} text-white rounded-t-lg`}>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {isStarting ? <Clock className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
            {isStarting ? 'Iniciar Tarefa' : 'Concluir Tarefa'}
          </CardTitle>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/20" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Task Info */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-1">{task.title}</h3>
          {task.related_citizen_name && (
            <p className="text-sm text-gray-600">Cidadão: {task.related_citizen_name}</p>
          )}
          {task.related_address && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {task.related_address}
            </p>
          )}
        </div>

        {/* Show task start info if completing */}
        {!isStarting && task.start_time && (
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="font-medium text-blue-900">Tarefa Iniciada</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <p>Início: {format(new Date(task.start_time), 'dd/MM/yyyy HH:mm')}</p>
              {task.start_latitude && (
                <p>Local de início registrado ✓</p>
              )}
            </div>
          </div>
        )}

        {/* Geolocation Section */}
        <div className="space-y-3">
          <Label className="flex items-center gap-2">
            <Navigation className="w-4 h-4" />
            Geolocalização
          </Label>

          {isGettingLocation && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Obtendo localização...
            </div>
          )}

          {locationError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{locationError}</AlertDescription>
            </Alert>
          )}

          {location && (
            <div className="space-y-3">
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm font-medium text-green-800 mb-2">
                  Localização Capturada
                </p>
                <p className="text-xs text-green-600">
                  Lat: {location.latitude.toFixed(6)}, Lng: {location.longitude.toFixed(6)}
                </p>
                <p className="text-xs text-green-600">
                  Precisão: ±{Math.round(location.accuracy)}m
                </p>
              </div>

              {validationResult && (
                <Alert className={validationResult.valid ? 'border-green-500 bg-green-50' : 'border-amber-500 bg-amber-50'}>
                  {validationResult.valid ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                  )}
                  <AlertDescription className={validationResult.valid ? 'text-green-700' : 'text-amber-700'}>
                    {validationResult.message}
                    {!validationResult.valid && (
                      <span className="block text-xs mt-1">
                        A tarefa ainda pode ser concluída, mas será sinalizada para revisão.
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              {!validationResult && task.expected_latitude && !isStarting && (
                <p className="text-sm text-gray-500">
                  <Target className="w-3 h-3 inline mr-1" />
                  Localização esperada registrada - validação em andamento...
                </p>
              )}
            </div>
          )}

          {!isGettingLocation && !location && (
            <Button variant="outline" onClick={getCurrentLocation} className="w-full gap-2">
              <Navigation className="w-4 h-4" />
              Tentar Novamente
            </Button>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>{isStarting ? 'Observações' : 'Observações da Conclusão'}</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={isStarting ? "Observações ao iniciar a tarefa..." : "Descreva o que foi realizado..."}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={updateTaskMutation.isPending}
            className={`flex-1 gap-2 ${isStarting ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}`}
          >
            {updateTaskMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isStarting ? 'Iniciando...' : 'Concluindo...'}
              </>
            ) : (
              <>
                {isStarting ? <Clock className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                {isStarting ? 'Iniciar Tarefa' : 'Concluir Tarefa'}
              </>
            )}
          </Button>
        </div>

        {/* Warning if no location */}
        {!location && !isGettingLocation && (
          <p className="text-xs text-amber-600 text-center">
            ⚠️ Sem localização, a tarefa será {isStarting ? 'iniciada' : 'concluída'} sem validação geográfica
          </p>
        )}
      </CardContent>
    </Card>
  );
}