import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, Search, Copy, CreditCard, Calculator, Skull, RefreshCw,
  AlertTriangle, CheckCircle2, XCircle, TrendingUp, FileWarning
} from 'lucide-react';
import { motion } from 'framer-motion';
import ActiveSearch from '../components/data-quality/ActiveSearch';
import DuplicatesList from '../components/data-quality/DuplicatesList';
import MissingCPFList from '../components/data-quality/MissingCPFList';
import PeopleCalculator from '../components/data-quality/PeopleCalculator';
import DeathsList from '../components/data-quality/DeathsList';

export default function DataQuality() {
  const [activeTab, setActiveTab] = useState('busca');
  
  const queryClient = useQueryClient();

  const { data: issues = [], refetch } = useQuery<any[]>({
    queryKey: ['qualityIssues'],
    queryFn: () => trpc.DataQualityIssue.filter({}, '-created_date', 500)
  });

  const { data: citizens = [] } = useQuery<any[]>({
    queryKey: ['citizenRecordsStats'],
    queryFn: () => trpc.CitizenRecord.filter({}, 'no_cidadao', 5000)
  });

  const { data: duplicates = [] } = useQuery<any[]>({
    queryKey: ['duplicateGroupsCount'],
    queryFn: () => trpc.DuplicateGroup.filter({ status: 'pendente' })
  });

  const openIssues = issues.filter(i => i.status === 'aberto').length;
  const resolvedIssues = issues.filter(i => i.status === 'resolvido').length;
  const criticalIssues = issues.filter(i => i.severity === 'critica' && i.status === 'aberto').length;
  const activeCitizens = citizens.filter(c => c.st_ativo === 1);
  const withoutCPF = activeCitizens.filter(c => !c.nu_cpf || c.nu_cpf.trim() === '').length;
  const deathRecords = citizens.filter(c => c.st_obito === 1).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-2xl">
                <Shield className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight">Qualidade de Dados</h1>
                <p className="text-white/70">Central de gestão e correção de cadastros</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm" 
              onClick={() => {
                queryClient.invalidateQueries();
                refetch();
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-300" />
                <div>
                  <p className="text-white/70 text-sm">Problemas Abertos</p>
                  <p className="text-2xl font-bold">{openIssues}</p>
                </div>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Copy className="w-8 h-8 text-orange-300" />
                <div>
                  <p className="text-white/70 text-sm">Duplicados</p>
                  <p className="text-2xl font-bold">{duplicates.length}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-8 h-8 text-purple-300" />
                <div>
                  <p className="text-white/70 text-sm">Sem CPF</p>
                  <p className="text-2xl font-bold">{withoutCPF}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <Skull className="w-8 h-8 text-gray-300" />
                <div>
                  <p className="text-white/70 text-sm">Óbitos</p>
                  <p className="text-2xl font-bold">{deathRecords}</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                <div>
                  <p className="text-white/70 text-sm">Taxa Resolução</p>
                  <p className="text-2xl font-bold">
                    {issues.length > 0 ? Math.round((resolvedIssues / issues.length) * 100) : 0}%
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Tabs Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white/80 shadow-lg p-1 h-auto flex-wrap">
            <TabsTrigger value="busca" className="gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
              <Search className="w-4 h-4" />
              Busca Ativa
            </TabsTrigger>
            <TabsTrigger value="duplicados" className="gap-2 data-[state=active]:bg-amber-500 data-[state=active]:text-white">
              <Copy className="w-4 h-4" />
              Duplicados
              {duplicates.length > 0 && (
                <Badge className="ml-1 bg-amber-600 text-white">{duplicates.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="sem-cpf" className="gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
              <CreditCard className="w-4 h-4" />
              Sem CPF
              {withoutCPF > 0 && (
                <Badge className="ml-1 bg-purple-600 text-white">{withoutCPF}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="calculadora" className="gap-2 data-[state=active]:bg-cyan-500 data-[state=active]:text-white">
              <Calculator className="w-4 h-4" />
              Calculadora
            </TabsTrigger>
            <TabsTrigger value="obitos" className="gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white">
              <Skull className="w-4 h-4" />
              Óbitos
              {deathRecords > 0 && (
                <Badge className="ml-1 bg-gray-600 text-white">{deathRecords}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="busca" className="mt-6">
            <ActiveSearch />
          </TabsContent>

          <TabsContent value="duplicados" className="mt-6">
            <DuplicatesList />
          </TabsContent>

          <TabsContent value="sem-cpf" className="mt-6">
            <MissingCPFList />
          </TabsContent>

          <TabsContent value="calculadora" className="mt-6">
            <PeopleCalculator />
          </TabsContent>

          <TabsContent value="obitos" className="mt-6">
            <DeathsList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
