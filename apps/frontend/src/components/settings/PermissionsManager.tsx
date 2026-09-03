import trpc from '@/lib/trpc-adapter';
import React, { useState, useMemo } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Key, Shield, Save, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

const ROLES = ['super_admin', 'gestor_municipal', 'coordenador_ubs', 'profissional', 'acs'];

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  gestor_municipal: 'Gestor Municipal',
  coordenador_ubs: 'Coordenador UBS',
  profissional: 'Profissional',
  acs: 'ACS'
};

const PERMISSIONS = [
  { key: 'dashboard.view', name: 'Ver Dashboard', module: 'Dashboard' },
  { key: 'dashboard.export', name: 'Exportar Dados do Dashboard', module: 'Dashboard' },
  { key: 'acs.view', name: 'Ver Gestão ACS', module: 'Gestão ACS' },
  { key: 'acs.edit', name: 'Editar ACS', module: 'Gestão ACS' },
  { key: 'acs.tasks.create', name: 'Criar Tarefas ACS', module: 'Gestão ACS' },
  { key: 'territory.view', name: 'Ver Território', module: 'Território' },
  { key: 'territory.edit', name: 'Editar Território', module: 'Território' },
  { key: 'reports.view', name: 'Ver Relatórios', module: 'Relatórios' },
  { key: 'reports.bpa.generate', name: 'Gerar BPA', module: 'Relatórios' },
  { key: 'reports.ras.generate', name: 'Gerar RAS', module: 'Relatórios' },
  { key: 'reports.export', name: 'Exportar Relatórios', module: 'Relatórios' },
  { key: 'vigilancia.view', name: 'Ver Vigilância', module: 'Vigilância' },
  { key: 'vigilancia.edit', name: 'Editar Dados Vigilância', module: 'Vigilância' },
  { key: 'data_quality.view', name: 'Ver Qualidade de Dados', module: 'Qualidade' },
  { key: 'data_quality.request_edit', name: 'Solicitar Edição', module: 'Qualidade' },
  { key: 'data_quality.approve_edit', name: 'Aprovar Edições', module: 'Qualidade' },
  { key: 'settings.view', name: 'Ver Configurações', module: 'Configurações' },
  { key: 'settings.users', name: 'Gerenciar Usuários', module: 'Configurações' },
  { key: 'settings.permissions', name: 'Gerenciar Permissões', module: 'Configurações' },
  { key: 'settings.logs', name: 'Ver Logs', module: 'Configurações' }
];

// Default permissions by role
const DEFAULT_PERMISSIONS = {
  super_admin: PERMISSIONS.map((p: any) => p.key),
  gestor_municipal: ['dashboard.view', 'dashboard.export', 'acs.view', 'acs.edit', 'acs.tasks.create', 'territory.view', 'territory.edit', 'reports.view', 'reports.bpa.generate', 'reports.ras.generate', 'reports.export', 'vigilancia.view', 'vigilancia.edit', 'data_quality.view', 'data_quality.request_edit', 'data_quality.approve_edit', 'settings.view', 'settings.logs'],
  coordenador_ubs: ['dashboard.view', 'acs.view', 'acs.edit', 'acs.tasks.create', 'territory.view', 'reports.view', 'reports.export', 'vigilancia.view', 'data_quality.view', 'data_quality.request_edit'],
  profissional: ['dashboard.view', 'acs.view', 'territory.view', 'reports.view', 'vigilancia.view', 'data_quality.view', 'data_quality.request_edit'],
  acs: ['dashboard.view', 'territory.view', 'data_quality.view']
};

export default function PermissionsManager() {
  const queryClient = useQueryClient();

  const { data: savedPermissions = [] } = useQuery({
    queryKey: ['rolePermissions'],
    queryFn: () => trpc.RolePermission.filter({})
  });

  // Build permissions state
  const [permissions, setPermissions] = useState(() => {
    const state = {};
    ROLES.forEach((role: any) => {
      state[role] = {};
      PERMISSIONS.forEach((perm: any) => {
        const saved = savedPermissions.find((sp: any) => sp.role === role && sp.permission_key === perm.key);
        state[role][perm.key] = saved ? saved.is_allowed : DEFAULT_PERMISSIONS[role]?.includes(perm.key);
      });
    });
    return state;
  });

  const [hasChanges, setHasChanges] = useState(false);

  const togglePermission = (role, permKey: any) => {
    if (role === 'super_admin') return; // Super admin always has all permissions
    setPermissions((prev: any) => ({
      ...prev,
      [role]: {
        ...prev[role],
        [permKey]: !prev[role][permKey]
      }
    }));
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // Delete existing and recreate
      const existing = await trpc.RolePermission.filter({});
      for (const p of existing) {
        await trpc.RolePermission.delete(p.id);
      }
      // Create new
      const toCreate = [];
      ROLES.forEach((role: any) => {
        PERMISSIONS.forEach((perm: any) => {
          toCreate.push({
            role,
            permission_key: perm.key,
            permission_name: perm.name,
            module: perm.module,
            is_allowed: permissions[role]?.[perm.key] ?? false
          });
        });
      });
      await trpc.RolePermission.bulkCreate(toCreate);
    },
    onSuccess: () => {
      toast.success('Permissões salvas com sucesso');
      setHasChanges(false);
      queryClient.invalidateQueries(['rolePermissions']);
    }
  });

  // Group permissions by module
  const groupedPermissions = useMemo(() => {
    const groups = {};
    PERMISSIONS.forEach((p: any) => {
      if (!groups[p.module]) groups[p.module] = [];
      groups[p.module].push(p);
    });
    return groups;
  }, []);

  return (
    <div className="space-y-6">
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Key className="w-5 h-5" />
              Matriz de Permissões (RBAC)
            </CardTitle>
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-2 bg-white text-purple-600 hover:bg-purple-50"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-64 sticky left-0 bg-gray-50 z-10">Permissão</TableHead>
                  {ROLES.map((role: any) => (
                    <TableHead key={role} className="text-center min-w-32">
                      <Badge className={role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}>
                        {ROLE_LABELS[role]}
                      </Badge>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(groupedPermissions).map(([module, perms]) => (
                  <React.Fragment key={module}>
                    <TableRow className="bg-slate-100">
                      <TableCell colSpan={ROLES.length + 1} className="font-bold text-slate-700">
                        <Shield className="w-4 h-4 inline mr-2" />
                        {module}
                      </TableCell>
                    </TableRow>
                    {perms.map((perm: any) => (
                      <TableRow key={perm.key} className="hover:bg-gray-50">
                        <TableCell className="sticky left-0 bg-white">{perm.name}</TableCell>
                        {ROLES.map((role: any) => (
                          <TableCell key={role} className="text-center">
                            <Checkbox
                              checked={permissions[role]?.[perm.key] ?? false}
                              onCheckedChange={() => togglePermission(role, perm.key)}
                              disabled={role === 'super_admin'}
                              className="mx-auto"
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}