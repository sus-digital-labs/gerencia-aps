import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Syringe, TrendingUp, TrendingDown, Users } from 'lucide-react';

export default function VaccinationCoverage({ data = [] }) {
  const calculateCoverage = (vaccinated, total) => {
    return total > 0 ? ((vaccinated / total) * 100).toFixed(1) : 0;
  };

  const vaccines = [
    { name: 'Influenza', vaccinated: 850, target: 1200, group: 'Idosos' },
    { name: 'COVID-19', vaccinated: 1450, target: 1800, group: 'Adultos' },
    { name: 'Tríplice Viral', vaccinated: 320, target: 350, group: 'Crianças' },
    { name: 'Hepatite B', vaccinated: 290, target: 400, group: 'Gestantes' },
  ];

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-500 to-pink-500 text-white">
        <CardTitle className="flex items-center gap-2">
          <Syringe className="w-5 h-5" />
          Taxa de Cobertura Vacinal
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {vaccines.map((vaccine, idx) => {
          const coverage = calculateCoverage(vaccine.vaccinated, vaccine.target);
          const isGood = coverage >= 80;
          
          return (
            <div key={idx} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{vaccine.name}</p>
                  <p className="text-xs text-gray-500">{vaccine.group}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={isGood ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                    {coverage}%
                  </Badge>
                  {isGood ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-500" />
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Progress value={parseFloat(coverage)} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>{vaccine.vaccinated} vacinados</span>
                  <span>Meta: {vaccine.target}</span>
                </div>
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-purple-900">Cobertura Geral</span>
          </div>
          <p className="text-2xl font-bold text-purple-600">
            {calculateCoverage(
              vaccines.reduce((sum, v) => sum + v.vaccinated, 0),
              vaccines.reduce((sum, v) => sum + v.target, 0)
            )}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}