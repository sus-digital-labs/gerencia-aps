import trpc from '@/lib/trpc-adapter';
import React, { useState } from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Users, Plus, Search, Edit, Key, UserX, UserCheck, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const ROLES = [
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'gestor_municipal', label: 'Gestor Municipal' },
  { value: 'coordenador_ubs', label: 'Coordenador UBS' },
  { value: 'profissional', label: 'Profissional' },
  { value: 'acs', label: 'ACS' }
];

const ROLE_COLORS = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-purple-100 text-purple-700',
  gestor_municipal: 'bg-blue-100 text-blue-700',
  coordenador_ubs: 'bg-emerald-100 text-emerald-700',
  profissional: 'bg-amber-100 text-amber-700',
  acs: 'bg-gray-100 text-gray-700',
  user: 'bg-gray-100 text-gray-700'
};

export default function UserManagement() {
  const [search, setSearch] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'profissional',
    unit_id: '',
    team_id: ''
  });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => trpc.User.list()
  });

  const { data: units = [] } = useQuery({
    queryKey: ['healthUnits'],
    queryFn: () => trpc.HealthUnit.filter({ active: true })
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['teams'],
    queryFn: () => trpc.HealthTeam.filter({ active: true })
  });

  // Filter users
  const filteredUsers = users.filter(u => {
    if (!search) return true;
    const term = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term);
  });

  const paginatedUsers = filteredUsers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      full_name: user.full_name || '',
      email: user.email || '',
      role: user.role || 'profissional',
      unit_id: user.unit_id || '',
      team_id: user.team_id || ''
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingUser) {
      await trpc.User.update(editingUser.id, {
        unit_id: formData.unit_id,
        team_id: formData.team_id
      });
      toast.success('Usuário atualizado com sucesso');
    }
    queryClient.invalidateQueries(['users']);
    setIsDialogOpen(false);
    setEditingUser(null);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      email: '',
      role: 'profissional',
      unit_id: '',
      team_id: ''
    });
  };

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    active: users.length // All users are considered active
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <Users className="w-8 h-8 text-slate-600" />
              <div>
                <p className="text-2xl font-bold text-slate-700">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Usuários</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <Key className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.admins}</p>
                <p className="text-sm text-gray-500">Administradores</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-md bg-white/90">
            <CardContent className="p-4 flex items-center gap-3">
              <UserCheck className="w-8 h-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold text-emerald-700">{stats.active}</p>
                <p className="text-sm text-gray-500">Usuários Ativos</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Search and Actions */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button onClick={() => queryClient.invalidateQueries(['users'])} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-lg border-0 bg-white/90">
        <CardHeader className="border-b bg-gray-50">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários do Sistema
            <Badge className="ml-2 bg-slate-100 text-slate-700">{filteredUsers.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Equipe</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.id} className="hover:bg-gray-50">
                  <TableCell className="font-medium">{user.full_name || '-'}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={ROLE_COLORS[user.role] || ROLE_COLORS.user}>
                      {ROLES.find(r => r.value === user.role)?.label || user.role || 'Usuário'}
                    </Badge>
                  </TableCell>
                  <TableCell>{units.find(u => u.id === user.unit_id)?.name || '-'}</TableCell>
                  <TableCell>{teams.find(t => t.id === user.team_id)?.name || '-'}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(user)}>
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-gray-500">Página {page} de {totalPages}</p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Próxima</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={formData.full_name} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={formData.email} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Papel</Label>
              <Input value={ROLES.find(r => r.value === formData.role)?.label || formData.role} disabled className="bg-gray-50" />
            </div>
            <div className="space-y-2">
              <Label>Unidade de Saúde</Label>
              <Select value={formData.unit_id} onValueChange={(v) => setFormData({ ...formData, unit_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {units.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Equipe</Label>
              <Select value={formData.team_id} onValueChange={(v) => setFormData({ ...formData, team_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Nenhuma</SelectItem>
                  {teams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => { setIsDialogOpen(false); setEditingUser(null); }}>Cancelar</Button>
              <Button onClick={handleSave}>Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}