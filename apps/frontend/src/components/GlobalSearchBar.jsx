import trpc from '@/lib/trpc-adapter';
import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';

import { useQuery } from '@tanstack/react-query';
import { 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList 
} from "@/components/ui/command";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Search as SearchIcon, ExternalLink } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useDebounce } from 'use-debounce';

export default function GlobalSearchBar() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // Fetch search results
  const { data: searchResults = [], isLoading } = useQuery({
    queryKey: ['globalCitizenSearch', debouncedSearchTerm],
    queryFn: async () => {
      if (!debouncedSearchTerm || debouncedSearchTerm.length < 3) return [];
      
      // Direct search on CitizenRecord entity
      const results = await trpc.CitizenRecord.filter(
        {
          $or: [
            { no_cidadao: { $ilike: `%${debouncedSearchTerm}%` } },
            { nu_cns: { $ilike: `%${debouncedSearchTerm}%` } },
            { nu_cpf: { $ilike: `%${debouncedSearchTerm}%` } },
          ],
          st_ativo: 1
        },
        'no_cidadao',
        10
      );
      return results;
    },
    enabled: debouncedSearchTerm.length >= 3,
  });

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className="w-48 justify-start text-muted-foreground sm:pr-12 lg:w-64"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="w-4 h-4 mr-2" />
        <span className="hidden lg:inline-flex">Buscar cidadão...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Buscar por nome, CPF ou CNS..."
          value={searchTerm}
          onValueChange={setSearchTerm}
        />
        <CommandList>
          <CommandEmpty>
            {isLoading && debouncedSearchTerm.length >= 3 ? (
              <div className="py-6 text-center text-sm">
                Carregando resultados...
              </div>
            ) : (
              <div className="py-6 text-center text-sm">
                {searchTerm.length < 3 ? 'Digite ao menos 3 caracteres...' : 'Nenhum resultado encontrado.'}
              </div>
            )}
          </CommandEmpty>
          {searchResults.length > 0 && (
            <CommandGroup heading="Cidadãos">
              {searchResults.map((citizen) => (
                <CommandItem
                  key={citizen.id}
                  value={citizen.no_cidadao + citizen.nu_cpf + citizen.nu_cns}
                  onSelect={() => {
                    setOpen(false);
                    window.location.href = createPageUrl(`CitizenProfile?id=${citizen.id}`);
                  }}
                  className="flex items-center gap-2"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-blue-100 text-blue-700">
                      {citizen.no_cidadao?.charAt(0) || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{citizen.no_cidadao}</p>
                    <p className="text-xs text-gray-500">
                      {citizen.nu_cns && `CNS: ${citizen.nu_cns}`} 
                      {citizen.nu_cpf && ` | CPF: ${citizen.nu_cpf}`}
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}