import trpc from "@/lib/trpc-adapter";
import React, { useState, useMemo, useEffect } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Key,
  Shield,
  Save,
  RefreshCw,
  LayoutDashboard,
  Users,
  MapPin,
  FileText,
  Activity,
  Settings,
  ClipboardList,
  Database,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

// Roles
const ROLES = [
  {
    key: "super_admin",
    label: "Super Admin",
    color: "bg-purple-100 text-purple-700",
  },
  {
    key: "gestor_municipal",
    label: "Gestor Municipal",
    color: "bg-blue-100 text-blue-700",
  },
  {
    key: "coordenador_ubs",
    label: "Coordenador UBS",
    color: "bg-teal-100 text-teal-700",
  },
  {
    key: "profissional_saude",
    label: "Profissional Saúde",
    color: "bg-green-100 text-green-700",
  },
  { key: "acs", label: "ACS", color: "bg-amber-100 text-amber-700" },
  { key: "auditor", label: "Auditor", color: "bg-slate-100 text-slate-700" },
  { key: "digitador", label: "Digitador", color: "bg-pink-100 text-pink-700" },
];

// Permissions organized by module
const PERMISSIONS_BY_MODULE = {
  Dashboard: {
    icon: LayoutDashboard,
    permissions: [
      { key: "dashboard.view", name: "Visualizar o dashboard principal" },
      {
        key: "dashboard.view.quality_score",
        name: "Ver card de Qualidade dos Dados",
      },
      {
        key: "dashboard.view.data_problems",
        name: "Ver card de Problemas de Dados",
      },
    ],
  },
  "Gestão ACS": {
    icon: Users,
    permissions: [
      {
        key: "acs_management.visits.view_all",
        name: "Ver visitas de todo o município",
      },
      {
        key: "acs_management.visits.view_unit",
        name: "Ver visitas da sua unidade",
      },
      {
        key: "acs_management.visits.view_team",
        name: "Ver visitas da sua equipe",
      },
      {
        key: "acs_management.visits.view_own",
        name: "Ver apenas as próprias visitas",
      },
      { key: "acs_management.map.view", name: "Acessar o mapa de visitas" },
      {
        key: "acs_management.timeline.view_any",
        name: "Ver timeline de qualquer ACS",
      },
      {
        key: "acs_management.timeline.view_own",
        name: "Ver a própria timeline",
      },
      { key: "acs_management.tasks.create", name: "Criar tarefas para ACS" },
      {
        key: "acs_management.tasks.bulk_assign",
        name: "Atribuir tarefas em massa",
      },
    ],
  },
  "Qualidade de Dados": {
    icon: Database,
    permissions: [
      {
        key: "data_quality.search.execute",
        name: "Usar a busca ativa de cidadãos",
      },
      {
        key: "data_quality.duplicates.view",
        name: "Ver lista de cadastros duplicados",
      },
      {
        key: "data_quality.duplicates.unify",
        name: "Solicitar unificação de cadastros",
      },
      {
        key: "data_quality.no_cpf.view",
        name: "Ver lista de cadastros sem CPF",
      },
      {
        key: "data_quality.calculator.view",
        name: "Acessar a calculadora de pessoas",
      },
      { key: "data_quality.deaths.view", name: "Ver lista de óbitos" },
    ],
  },
  Administrativo: {
    icon: ClipboardList,
    permissions: [
      { key: "admin.itineraries.view", name: "Acessar tela de itinerários" },
      {
        key: "admin.itineraries.request_visit",
        name: "Solicitar visitas para os ACS",
      },
      {
        key: "admin.data_edit.request",
        name: "Solicitar edição de dados de cidadão",
      },
      {
        key: "admin.data_edit.approve",
        name: "Aprovar/rejeitar edição de dados",
      },
    ],
  },
  Relatórios: {
    icon: FileText,
    permissions: [
      { key: "reports.production.view", name: "Ver relatório de produção" },
      {
        key: "reports.production.export",
        name: "Exportar relatório de produção",
      },
      { key: "reports.bpa.generate", name: "Gerar arquivo do BPA" },
      { key: "reports.ras.generate", name: "Gerar arquivo do RAS" },
      { key: "reports.immunization.view", name: "Ver relatório de imunização" },
    ],
  },
  "Vigilância e Risco": {
    icon: Activity,
    permissions: [
      {
        key: "surveillance.aedes.view",
        name: "Acessar dashboard Aedes aegypti",
      },
      {
        key: "surveillance.cardiovascular_risk.view",
        name: "Acessar dashboard Risco Cardiovascular",
      },
      {
        key: "surveillance.cardiovascular_risk.view_nominal",
        name: "Ver lista nominal alto risco",
      },
    ],
  },
  Território: {
    icon: MapPin,
    permissions: [
      { key: "territory.view", name: "Visualizar mapeamento" },
      { key: "territory.edit", name: "Editar áreas e microáreas" },
      { key: "territory.remapping", name: "Acessar remapeamento" },
    ],
  },
  Configurações: {
    icon: Settings,
    permissions: [
      { key: "settings.users.view", name: "Ver lista de usuários" },
      { key: "settings.users.create", name: "Criar novos usuários" },
      { key: "settings.users.edit", name: "Editar usuários existentes" },
      {
        key: "settings.users.change_password",
        name: "Mudar senha de outros usuários",
      },
      {
        key: "settings.permissions.view",
        name: "Acessar gerenciamento de permissões",
      },
      {
        key: "settings.permissions.edit",
        name: "Alterar permissões dos perfis",
      },
      { key: "settings.logs.view", name: "Acessar logs de auditoria" },
      { key: "settings.connections.view", name: "Ver página de conexões" },
      {
        key: "settings.connections.edit",
        name: "Editar configurações de conexão",
      },
    ],
  },
};

// Default permissions for each role
const DEFAULT_PERMISSIONS = {
  super_admin: Object.values(PERMISSIONS_BY_MODULE).flatMap(m =>
    m.permissions.map(p => p.key)
  ),
  gestor_municipal: [
    "dashboard.view",
    "dashboard.view.quality_score",
    "dashboard.view.data_problems",
    "acs_management.visits.view_all",
    "acs_management.map.view",
    "acs_management.timeline.view_any",
    "acs_management.tasks.create",
    "acs_management.tasks.bulk_assign",
    "data_quality.search.execute",
    "data_quality.duplicates.view",
    "data_quality.duplicates.unify",
    "data_quality.no_cpf.view",
    "data_quality.calculator.view",
    "data_quality.deaths.view",
    "admin.itineraries.view",
    "admin.itineraries.request_visit",
    "admin.data_edit.request",
    "admin.data_edit.approve",
    "reports.production.view",
    "reports.production.export",
    "reports.bpa.generate",
    "reports.ras.generate",
    "reports.immunization.view",
    "surveillance.aedes.view",
    "surveillance.cardiovascular_risk.view",
    "surveillance.cardiovascular_risk.view_nominal",
    "territory.view",
    "territory.edit",
    "territory.remapping",
    "settings.users.view",
    "settings.logs.view",
  ],
  coordenador_ubs: [
    "dashboard.view",
    "dashboard.view.quality_score",
    "acs_management.visits.view_unit",
    "acs_management.map.view",
    "acs_management.timeline.view_any",
    "acs_management.tasks.create",
    "data_quality.search.execute",
    "data_quality.duplicates.view",
    "data_quality.no_cpf.view",
    "admin.itineraries.view",
    "admin.itineraries.request_visit",
    "admin.data_edit.request",
    "admin.data_edit.approve",
    "reports.production.view",
    "reports.production.export",
    "reports.immunization.view",
    "surveillance.aedes.view",
    "surveillance.cardiovascular_risk.view",
    "territory.view",
  ],
  profissional_saude: [
    "dashboard.view",
    "acs_management.visits.view_team",
    "acs_management.map.view",
    "acs_management.timeline.view_own",
    "data_quality.search.execute",
    "data_quality.duplicates.view",
    "admin.data_edit.request",
    "reports.production.view",
    "reports.immunization.view",
    "surveillance.aedes.view",
    "surveillance.cardiovascular_risk.view",
    "territory.view",
  ],
  acs: [
    "dashboard.view",
    "acs_management.visits.view_own",
    "acs_management.timeline.view_own",
    "data_quality.search.execute",
    "admin.data_edit.request",
    "territory.view",
  ],
  auditor: [
    "dashboard.view",
    "dashboard.view.quality_score",
    "dashboard.view.data_problems",
    "acs_management.visits.view_all",
    "acs_management.map.view",
    "acs_management.timeline.view_any",
    "data_quality.search.execute",
    "data_quality.duplicates.view",
    "data_quality.no_cpf.view",
    "data_quality.calculator.view",
    "data_quality.deaths.view",
    "reports.production.view",
    "reports.immunization.view",
    "surveillance.aedes.view",
    "surveillance.cardiovascular_risk.view",
    "surveillance.cardiovascular_risk.view_nominal",
    "territory.view",
    "settings.logs.view",
  ],
  digitador: [
    "dashboard.view",
    "data_quality.search.execute",
    "data_quality.duplicates.view",
    "data_quality.no_cpf.view",
    "admin.data_edit.request",
  ],
};

export default function PermissionsManagerV2() {
  const queryClient = useQueryClient();
  const [permissions, setPermissions] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [openModules, setOpenModules] = useState(["Dashboard"]);

  // Fetch saved permissions
  const { data: savedPermissions = [], isLoading } = useQuery({
    queryKey: ["rolePermissions"],
    queryFn: () => trpc.RolePermission.filter({}),
  });

  // Initialize permissions state
  useEffect(() => {
    const state = {};
    ROLES.forEach(role => {
      state[role.key] = {};
      Object.values(PERMISSIONS_BY_MODULE).forEach(module => {
        module.permissions.forEach(perm => {
          const saved = savedPermissions.find(
            sp => sp.role === role.key && sp.permission_key === perm.key
          );
          state[role.key][perm.key] = saved
            ? saved.is_allowed
            : (DEFAULT_PERMISSIONS[role.key]?.includes(perm.key) ?? false);
        });
      });
    });
    setPermissions(state);
  }, [savedPermissions]);

  // Toggle single permission
  const togglePermission = (role, permKey) => {
    if (role === "super_admin") return;
    setPermissions(prev => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: !prev[role]?.[permKey],
      },
    }));
    setHasChanges(true);
  };

  // Toggle all permissions in a module for a role
  const toggleModuleForRole = (moduleName, role) => {
    if (role === "super_admin") return;
    const modulePerms = PERMISSIONS_BY_MODULE[moduleName].permissions;
    const allChecked = modulePerms.every(p => permissions[role]?.[p.key]);

    setPermissions(prev => {
      const updated = { ...prev[role] };
      modulePerms.forEach(p => {
        updated[p.key] = !allChecked;
      });
      return { ...prev, [role]: updated };
    });
    setHasChanges(true);
  };

  // Toggle all permissions in a module for all roles
  const toggleEntireModule = moduleName => {
    const modulePerms = PERMISSIONS_BY_MODULE[moduleName].permissions;
    const allChecked = ROLES.filter(r => r.key !== "super_admin").every(role =>
      modulePerms.every(p => permissions[role.key]?.[p.key])
    );

    setPermissions(prev => {
      const updated = { ...prev };
      ROLES.filter(r => r.key !== "super_admin").forEach(role => {
        updated[role.key] = { ...updated[role.key] };
        modulePerms.forEach(p => {
          updated[role.key][p.key] = !allChecked;
        });
      });
      return updated;
    });
    setHasChanges(true);
  };

  // Check if all permissions in module are checked for a role
  const isModuleFullyChecked = (moduleName, role) => {
    const modulePerms = PERMISSIONS_BY_MODULE[moduleName].permissions;
    return modulePerms.every(p => permissions[role]?.[p.key]);
  };

  // Check if module is partially checked
  const isModulePartiallyChecked = (moduleName, role) => {
    const modulePerms = PERMISSIONS_BY_MODULE[moduleName].permissions;
    const checked = modulePerms.filter(p => permissions[role]?.[p.key]).length;
    return checked > 0 && checked < modulePerms.length;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing
      const existing = await trpc.RolePermission.filter({});
      for (const p of existing) {
        await trpc.RolePermission.delete(p.id);
      }

      // Create new
      const toCreate = [];
      ROLES.forEach(role => {
        Object.entries(PERMISSIONS_BY_MODULE).forEach(
          ([moduleName, module]) => {
            module.permissions.forEach(perm => {
              toCreate.push({
                role: role.key,
                permission_key: perm.key,
                permission_name: perm.name,
                module: moduleName,
                is_allowed: permissions[role.key]?.[perm.key] ?? false,
              });
            });
          }
        );
      });

      await trpc.RolePermission.bulkCreate(toCreate);
    },
    onSuccess: () => {
      toast.success("Permissões salvas com sucesso!");
      setHasChanges(false);
      queryClient.invalidateQueries(["rolePermissions"]);
    },
    onError: () => {
      toast.error("Erro ao salvar permissões");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-t-lg">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Gerenciamento de Permissões (RBAC)
            </CardTitle>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-2 bg-white text-purple-600 hover:bg-purple-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Roles Header Row */}
          <div className="sticky top-0 z-10 bg-gray-50 border-b">
            <div className="flex">
              <div className="w-80 p-4 font-medium text-gray-700 border-r">
                Módulo / Permissão
              </div>
              <div className="flex-1 flex">
                {ROLES.map(role => (
                  <div
                    key={role.key}
                    className="flex-1 p-3 text-center border-r last:border-r-0 min-w-24"
                  >
                    <Badge className={role.color + " text-xs"}>
                      {role.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Accordion Modules */}
          <Accordion
            type="multiple"
            value={openModules}
            onValueChange={setOpenModules}
            className="w-full"
          >
            {Object.entries(PERMISSIONS_BY_MODULE).map(
              ([moduleName, module]) => {
                const Icon = module.icon;
                return (
                  <AccordionItem
                    key={moduleName}
                    value={moduleName}
                    className="border-b"
                  >
                    <div className="flex items-center bg-slate-100 hover:bg-slate-200 transition-colors">
                      <div className="w-80 border-r">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={ROLES.filter(
                                r => r.key !== "super_admin"
                              ).every(r =>
                                isModuleFullyChecked(moduleName, r.key)
                              )}
                              onCheckedChange={() =>
                                toggleEntireModule(moduleName)
                              }
                              onClick={e => e.stopPropagation()}
                            />
                            <Icon className="w-4 h-4 text-gray-600" />
                            <span className="font-semibold text-gray-700">
                              {moduleName}
                            </span>
                          </div>
                        </AccordionTrigger>
                      </div>
                      <div className="flex-1 flex">
                        {ROLES.map(role => (
                          <div
                            key={role.key}
                            className="flex-1 p-3 text-center border-r last:border-r-0 flex justify-center items-center"
                          >
                            <Checkbox
                              checked={isModuleFullyChecked(
                                moduleName,
                                role.key
                              )}
                              onCheckedChange={() =>
                                toggleModuleForRole(moduleName, role.key)
                              }
                              disabled={role.key === "super_admin"}
                              className={
                                isModulePartiallyChecked(moduleName, role.key)
                                  ? "data-[state=checked]:bg-blue-300"
                                  : ""
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <AccordionContent className="pb-0">
                      {module.permissions.map((perm, idx) => (
                        <div
                          key={perm.key}
                          className={`flex items-center hover:bg-gray-50 ${idx < module.permissions.length - 1 ? "border-b" : ""}`}
                        >
                          <div className="w-80 p-3 pl-12 text-sm text-gray-600 border-r">
                            {perm.name}
                          </div>
                          <div className="flex-1 flex">
                            {ROLES.map(role => (
                              <div
                                key={role.key}
                                className="flex-1 p-3 text-center border-r last:border-r-0 flex justify-center"
                              >
                                <Checkbox
                                  checked={
                                    permissions[role.key]?.[perm.key] ?? false
                                  }
                                  onCheckedChange={() =>
                                    togglePermission(role.key, perm.key)
                                  }
                                  disabled={role.key === "super_admin"}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                );
              }
            )}
          </Accordion>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card className="border-0 shadow-lg bg-white/90">
        <CardContent className="p-4">
          <div className="flex items-center gap-6 text-sm text-gray-600 flex-wrap">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              <span className="font-medium">Legenda:</span>
            </div>
            {ROLES.map(role => (
              <div key={role.key} className="flex items-center gap-2">
                <Badge className={role.color + " text-xs"}>{role.label}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
