import React from 'react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, MapPin, User, Heart, Eye, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function CitizenCard({ citizen }) {
  const getInitials = (name) => {
    if (!name) return 'C';
    const names = name.split(' ');
    return names.length > 1 ? `${names[0][0]}${names[names.length - 1][0]}` : names[0][0];
  };

  const getStatusBadge = () => {
    const hasCPF = citizen.nu_cpf && citizen.nu_cpf.length > 0;
    const hasCNS = citizen.nu_cns && citizen.nu_cns.length > 0;
    const hasAddress = citizen.endereco && citizen.endereco.length > 0;

    if (hasCPF && hasCNS && hasAddress) {
      return <Badge className="bg-green-100 text-green-700">Completo</Badge>;
    }
    if (!hasCPF) {
      return <Badge className="bg-amber-100 text-amber-700">Falta CPF</Badge>;
    }
    if (!hasCNS) {
      return <Badge className="bg-amber-100 text-amber-700">Falta CNS</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-700">Pendente</Badge>;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow border-gray-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold">
                {getInitials(citizen.no_cidadao)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h4 className="font-semibold text-gray-900">{citizen.no_cidadao}</h4>
              {getStatusBadge()}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <p className="text-gray-500 text-xs">CNS</p>
            <p className="font-mono font-medium">{citizen.nu_cns || '-'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">CPF</p>
            <p className="font-mono font-medium">{citizen.nu_cpf || '-'}</p>
          </div>
        </div>

        {citizen.dt_nascimento && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            {format(new Date(citizen.dt_nascimento), 'dd/MM/yyyy')}
          </div>
        )}

        {citizen.endereco && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span className="truncate">{citizen.endereco}</span>
          </div>
        )}

        {(citizen.conditions && citizen.conditions.length > 0) && (
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-red-500" />
            <div className="flex flex-wrap gap-1">
              {citizen.conditions.map((condition, idx) => (
                <Badge key={idx} variant="outline" className="text-xs">
                  {condition}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div>
            <p className="text-xs text-gray-500">Última Visita</p>
            <p className="text-xs font-medium">
              {citizen.last_visit_date 
                ? format(new Date(citizen.last_visit_date), 'dd/MM/yyyy')
                : 'Sem registro'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Última Consulta</p>
            <p className="text-xs font-medium">
              {citizen.last_consultation_date 
                ? format(new Date(citizen.last_consultation_date), 'dd/MM/yyyy')
                : 'Sem registro'}
            </p>
          </div>
        </div>

        <Link to={createPageUrl(`CitizenProfile?id=${citizen.id}`)}>
          <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
            <Eye className="w-4 h-4" />
            Ver Perfil Completo
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}