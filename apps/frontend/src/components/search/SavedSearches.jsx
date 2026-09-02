import trpc from "@/lib/trpc-adapter";
import React, { useState } from "react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Star, Save, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

export default function SavedSearches({ onApplySearch }) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchName, setSearchName] = useState("");
  const queryClient = useQueryClient();

  const { data: savedSearches = [] } = useQuery({
    queryKey: ["savedSearches"],
    queryFn: () => trpc.SavedSearch.filter({}, "-created_date"),
  });

  const createMutation = useMutation({
    mutationFn: data => trpc.SavedSearch.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["savedSearches"]);
      setIsDialogOpen(false);
      setSearchName("");
      toast.success("Busca salva com sucesso");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: id => trpc.SavedSearch.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(["savedSearches"]);
      toast.success("Busca excluída");
    },
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ id, is_favorite }) =>
      trpc.SavedSearch.update(id, { is_favorite }),
    onSuccess: () => {
      queryClient.invalidateQueries(["savedSearches"]);
    },
  });

  const handleSaveSearch = (filters, searchTerm) => {
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Buscas Salvas</h3>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Save className="w-4 h-4" />
              Salvar Busca Atual
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Salvar Busca</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nome da Busca</Label>
                <Input
                  placeholder="Ex: Idosos sem CPF"
                  value={searchName}
                  onChange={e => setSearchName(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={() => {
                    createMutation.mutate({
                      name: searchName,
                      search_type: "active",
                      filters: {},
                      search_term: "",
                    });
                  }}
                  disabled={!searchName}
                >
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        {savedSearches.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            Nenhuma busca salva
          </p>
        ) : (
          savedSearches.map(search => (
            <div
              key={search.id}
              className="flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <button
                  onClick={() =>
                    toggleFavoriteMutation.mutate({
                      id: search.id,
                      is_favorite: !search.is_favorite,
                    })
                  }
                  className="text-gray-400 hover:text-yellow-500 transition-colors"
                >
                  <Star
                    className={`w-4 h-4 ${search.is_favorite ? "fill-yellow-500 text-yellow-500" : ""}`}
                  />
                </button>
                <button
                  onClick={() => onApplySearch?.(search)}
                  className="flex-1 text-left"
                >
                  <p className="font-medium text-gray-900">{search.name}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {search.search_type === "global"
                      ? "Busca Global"
                      : "Busca Ativa"}
                  </Badge>
                </button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (confirm("Deseja excluir esta busca salva?")) {
                    deleteMutation.mutate(search.id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
