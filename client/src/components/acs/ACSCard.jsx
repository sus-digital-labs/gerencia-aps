import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Phone, Mail, Calendar, Eye, BarChart2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ACSCard({ acs, visitCount, onViewDetails, onViewMap }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
    >
      <Card className="shadow-lg border-0 bg-white/90 backdrop-blur-sm hover:shadow-xl transition-all overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
        <CardContent className="p-5">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-14 h-14 border-2 border-green-100">
              <AvatarImage src={acs.photo_url} />
              <AvatarFallback className="bg-gradient-to-br from-green-500 to-emerald-600 text-white font-bold text-lg">
                {acs.name?.split(' ').map(n => n[0]).slice(0, 2).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-gray-800">{acs.name}</h3>
              <Badge className="bg-green-100 text-green-700 mt-1">
                Microárea {acs.microarea}
              </Badge>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {acs.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4 text-gray-400" />
                {acs.phone}
              </div>
            )}
            {acs.email && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                {acs.email}
              </div>
            )}
            {acs.hire_date && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4 text-gray-400" />
                Desde {new Date(acs.hire_date).toLocaleDateString('pt-BR')}
              </div>
            )}
          </div>

          {/* Estatísticas */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-2xl font-black text-green-600">{visitCount?.month || 0}</p>
                <p className="text-xs text-gray-500">Visitas no mês</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-black text-blue-600">{visitCount?.year || 0}</p>
                <p className="text-xs text-gray-500">Visitas no ano</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => onViewDetails?.(acs)}
            >
              <BarChart2 className="w-4 h-4" />
              Detalhes
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1"
              onClick={() => onViewMap?.(acs)}
            >
              <MapPin className="w-4 h-4" />
              Mapa
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}