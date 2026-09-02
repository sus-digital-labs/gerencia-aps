// @ts-nocheck
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search, MapPin, Phone, Mail, Award } from "lucide-react";
import { toast } from "sonner";

export default function ACSManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    cns: "",
    cpf: "",
    microarea: "",
    ine: "",
    unidadeSaude: "",
    telefone: "",
    email: "",
  });

  const { data: acsData, isLoading, refetch } = trpc.acs.getAll.useQuery();
  const createACS = trpc.acs.create.useMutation({
    onSuccess: () => {
      toast.success("ACS cadastrado com sucesso!");
      setIsDialogOpen(false);
      refetch();
      setFormData({
        nome: "",
        cns: "",
        cpf: "",
        microarea: "",
        ine: "",
        unidadeSaude: "",
        telefone: "",
        email: "",
      });
    },
    onError: () => {
      toast.error("Erro ao cadastrar ACS");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createACS.mutate(formData);
  };

  const filteredACS = acsData?.filter((acs: any) =>
    acs.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-blue-600" />
              Gestão de ACS
            </h1>
            <p className="text-gray-600 mt-1">
              Gerenciamento de Agentes Comunitários de Saúde
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Novo ACS
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo ACS</DialogTitle>
                  <DialogDescription>
                    Preencha os dados do Agente Comunitário de Saúde
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input
                        id="nome"
                        value={formData.nome}
                        onChange={(e) =>
                          setFormData({ ...formData, nome: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cns">CNS</Label>
                      <Input
                        id="cns"
                        value={formData.cns}
                        onChange={(e) =>
                          setFormData({ ...formData, cns: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={formData.cpf}
                        onChange={(e) =>
                          setFormData({ ...formData, cpf: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="microarea">Microárea</Label>
                      <Input
                        id="microarea"
                        value={formData.microarea}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            microarea: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ine">INE</Label>
                      <Input
                        id="ine"
                        value={formData.ine}
                        onChange={(e) =>
                          setFormData({ ...formData, ine: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unidadeSaude">Unidade de Saúde</Label>
                      <Input
                        id="unidadeSaude"
                        value={formData.unidadeSaude}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            unidadeSaude: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={formData.telefone}
                        onChange={(e) =>
                          setFormData({ ...formData, telefone: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={createACS.isPending}>
                    {createACS.isPending ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Total de ACS</p>
                <p className="text-3xl font-bold mt-1">
                  {acsData?.length || 0}
                </p>
              </div>
              <Users className="h-12 w-12 text-blue-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">ACS Ativos</p>
                <p className="text-3xl font-bold mt-1">
                  {acsData?.length || 0}
                </p>
              </div>
              <Award className="h-12 w-12 text-green-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm">Microáreas</p>
                <p className="text-3xl font-bold mt-1">12</p>
              </div>
              <MapPin className="h-12 w-12 text-purple-200" />
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm">Visitas Hoje</p>
                <p className="text-3xl font-bold mt-1">87</p>
              </div>
              <Users className="h-12 w-12 text-orange-200" />
            </div>
          </Card>
        </div>

        {/* Search */}
        <Card className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar ACS por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </Card>

        {/* Table */}
        <Card>
          <div className="p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNS</TableHead>
                  <TableHead>Microárea</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredACS && filteredACS.length > 0 ? (
                  filteredACS.map((acs: any) => (
                    <TableRow key={acs.id}>
                      <TableCell className="font-medium">{acs.nome}</TableCell>
                      <TableCell>{acs.cns || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{acs.microarea || "-"}</Badge>
                      </TableCell>
                      <TableCell>{acs.unidadeSaude || "-"}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 text-sm">
                          {acs.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {acs.telefone}
                            </div>
                          )}
                          {acs.email && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {acs.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">Ativo</Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          Ver Detalhes
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Users className="h-12 w-12 text-gray-300" />
                        <p className="text-gray-500">
                          Nenhum ACS cadastrado ainda
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setIsDialogOpen(true)}
                        >
                          Cadastrar Primeiro ACS
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
