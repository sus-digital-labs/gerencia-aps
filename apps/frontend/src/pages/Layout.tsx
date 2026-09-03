
import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  LayoutDashboard, Target, Trophy, Shield, Users, Building2, 
  Settings, LogOut, Menu, X, ChevronRight, Activity, MapPin, Bell, Heart, Bug
} from 'lucide-react';
import GlobalSearchBar from '../components/GlobalSearchBar';
import { motion, AnimatePresence } from 'framer-motion';

// Mapa reverso: URL -> pageName para determinar a página ativa
const urlToPageName = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/acs': 'ACSManagement',
  '/acs/ranking': 'ACSRanking',
  '/acs/timeline': 'ACSTimeline',
  '/acs/tarefas': 'PendingTasks',
  '/territorio': 'TerritoryMapping',
  '/territorio/remapeamento': 'TerritoryRemapping',
  '/territorio/microareas': 'MicroareaMapping',
  '/territorio/remapeamento-inteligente': 'RemapeamentoInteligente',
  '/vigilancia/aedes': 'AedesVigilance',
  '/vigilancia/cardiovascular': 'CardiovascularRisk',
  '/relatorios': 'Reports',
  '/relatorios/customizados': 'CustomReports',
  '/qualidade': 'DataQuality',
  '/gamificacao': 'Gamification',
  '/equipes': 'Teams',
  '/configuracoes': 'Settings',
  '/indicador': 'IndicatorDetail',
  '/insights': 'HealthInsights',
  '/saude-mulher': 'WomensHealth',
};

const navigation = [
  { name: 'Dashboard', href: 'Dashboard', icon: LayoutDashboard, description: 'Visão geral dos indicadores' },
  { 
    name: 'Gestão ACS', 
    href: 'ACSManagement', 
    icon: Users, 
    description: 'Agentes e visitas',
    subItems: [
      { name: 'Visitas e ACS', href: 'ACSManagement' },
      { name: 'Ranking ACS', href: 'ACSRanking' },
      { name: 'Tarefas Pendentes', href: 'PendingTasks' },
    ]
  },
  { 
    name: 'Território', 
    href: 'TerritoryMapping', 
    icon: MapPin, 
    description: 'Mapeamento',
    subItems: [
      { name: 'Mapa do Território', href: 'TerritoryMapping' },
      { name: 'Remapeamento', href: 'TerritoryRemapping' },
      { name: 'Microáreas ACS', href: 'MicroareaMapping' },
      { name: '🧠 Remapeamento Inteligente', href: 'RemapeamentoInteligente' },
    ]
  },
  { 
    name: 'Vigilância', 
    href: 'AedesVigilance', 
    icon: Activity, 
    description: 'Saúde e riscos',
    subItems: [
      { name: 'Aedes aegypti', href: 'AedesVigilance' },
      { name: 'Risco Cardiovascular', href: 'CardiovascularRisk' },
    ]
  },
  { name: 'Relatórios', href: 'Reports', icon: Target, description: 'Produção, BPA, RAS, Imunização' },
  { name: 'Qualidade de Dados', href: 'DataQuality', icon: Shield, description: 'Gestão de cadastros' },
  { name: 'Gamificação', href: 'Gamification', icon: Trophy, description: 'Ranking e conquistas' },
  { name: 'Equipes', href: 'Teams', icon: Building2, description: 'Gestão de equipes' },
  { name: 'Configurações', href: 'Settings', icon: Settings, description: 'Sistema e usuários' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();

  // Determinar a página ativa baseado na URL atual
  const currentPageName = urlToPageName[location.pathname] || 
    Object.entries(urlToPageName).find(([url]) => 
      url !== '/' && location.pathname.startsWith(url)
    )?.[1] || '';

  const handleLogout = () => {
    logout();
  };

  const isActive = (pageName: string) => {
    return currentPageName === pageName;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full bg-white shadow-xl transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center h-16 px-4 border-b ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-black text-gray-900">SUS Analytics</h1>
                <p className="text-[10px] text-gray-500">Previne Brasil</p>
              </div>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navigation.map((item: any) => {
                const active = isActive(item.href);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isSubActive = hasSubItems && item.subItems.some(sub => isActive(sub.href));

                return (
                  <div key={item.name}>
                    <Link
                      to={createPageUrl(item.href)}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        active || isSubActive
                          ? 'bg-blue-50 text-blue-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      } ${isCollapsed ? 'justify-center' : ''}`}
                      title={isCollapsed ? item.name : undefined}
                    >
                      <item.icon className={`w-5 h-5 ${active || isSubActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {!isCollapsed && (
                        <div className="flex-1">
                          <span className={`font-medium ${active || isSubActive ? 'text-blue-600' : ''}`}>{item.name}</span>
                          <p className="text-[10px] text-gray-400 line-clamp-1">{item.description}</p>
                        </div>
                      )}
                      {!isCollapsed && (active || isSubActive) && (
                        <ChevronRight className="w-4 h-4 text-blue-400" />
                      )}
                    </Link>
                    {/* Sub Items */}
                    {!isCollapsed && hasSubItems && (active || isSubActive) && (
                      <div className="ml-8 mt-1 space-y-1">
                        {item.subItems.map((subItem: any) => (
                          <Link
                            key={subItem.href}
                            to={createPageUrl(subItem.href)}
                            onClick={() => setSidebarOpen(false)}
                            className={`block px-3 py-1.5 text-sm rounded-lg transition-all ${
                              isActive(subItem.href)
                                ? 'bg-blue-100 text-blue-700 font-medium'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {subItem.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
          </nav>

          {/* Collapse toggle (desktop only) */}
          <div className="hidden lg:flex justify-center p-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full justify-center"
            >
              <ChevronRight className={`w-4 h-4 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </Button>
          </div>

          {/* User */}
          {user && (
            <div className={`p-4 border-t ${isCollapsed ? 'flex justify-center' : ''}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`flex items-center gap-3 w-full p-2 rounded-xl hover:bg-gray-100 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-sm">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    {!isCollapsed && (
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-800 truncate">{user.name || 'Usuário'}</p>
                        <p className="text-xs text-gray-400 truncate">{user.email}</p>
                      </div>
                    )}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.name || 'Usuário'}</p>
                    <p className="text-xs text-gray-500">{user.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => window.location.href = '/configuracoes'}>
                    <Settings className="w-4 h-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="gap-2 text-red-600 cursor-pointer">
                    <LogOut className="w-4 h-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Desktop header with search */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center justify-end h-14 px-6 w-full gap-4">
            <GlobalSearchBar />
            {user && (
              <Button variant="ghost" size="icon">
                <Bell className="w-5 h-5" />
              </Button>
            )}
          </div>
        </header>

        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-white border-b">
          <div className="flex items-center justify-between h-14 px-4">
            <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-gray-800">SUS Analytics</span>
            </div>
            <div className="flex items-center gap-2">
              <GlobalSearchBar />
              {user && (
                <>
                  <Button variant="ghost" size="icon">
                    <Bell className="w-5 h-5" />
                  </Button>
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white font-bold text-xs">
                      {user.name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="min-h-[calc(100vh-3.5rem)]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
