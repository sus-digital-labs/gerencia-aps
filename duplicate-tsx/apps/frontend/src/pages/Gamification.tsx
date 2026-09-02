import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Medal, Award, Star, TrendingUp, Crown } from "lucide-react";

export default function Gamification() {
  const [selectedPeriod, setSelectedPeriod] = useState("mes");
  
  const { data: rankings, isLoading } = trpc.teamScores.filter.useQuery({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const medals = [
    { name: "Bronze", color: "from-amber-600 to-amber-700", icon: Medal, min: 0, max: 500 },
    { name: "Prata", color: "from-gray-400 to-gray-500", icon: Medal, min: 501, max: 1000 },
    { name: "Ouro", color: "from-yellow-400 to-yellow-500", icon: Trophy, min: 1001, max: 2000 },
    { name: "Platina", color: "from-blue-400 to-blue-600", icon: Crown, min: 2001, max: 5000 },
    { name: "Diamante", color: "from-purple-400 to-purple-600", icon: Star, min: 5001, max: 999999 },
  ];

  const achievements = [
    { name: "Primeira Visita", description: "Realize sua primeira visita domiciliar", points: 10, icon: "🏠" },
    { name: "Maratonista", description: "Complete 100 visitas em um mês", points: 100, icon: "🏃" },
    { name: "Vacinador Expert", description: "Registre 50 vacinações", points: 75, icon: "💉" },
    { name: "Gestor de Hipertensos", description: "Acompanhe 30 hipertensos", points: 80, icon: "❤️" },
    { name: "Cuidador de Gestantes", description: "Acompanhe 20 gestantes", points: 90, icon: "🤰" },
    { name: "Mestre dos Dados", description: "100% de cadastros completos", points: 150, icon: "📊" },
  ];

  const getMedalForScore = (score: number) => {
    return medals.find(m => score >= m.min && score <= m.max) || medals[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Trophy className="h-8 w-8 text-purple-600" />
              Gamificação
            </h1>
            <p className="text-gray-600 mt-1">
              Rankings, conquistas e medalhas dos ACS
            </p>
          </div>
        </div>

        {/* Medals Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {medals.map((medal, idx) => {
            const Icon = medal.icon;
            return (
              <Card key={idx} className={`p-6 bg-gradient-to-br ${medal.color} text-white`}>
                <div className="flex flex-col items-center text-center">
                  <Icon className="h-12 w-12 mb-3" />
                  <h3 className="font-bold text-lg">{medal.name}</h3>
                  <p className="text-sm opacity-90 mt-1">
                    {medal.min} - {medal.max === 999999 ? "∞" : medal.max} pts
                  </p>
                </div>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="ranking" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="conquistas">Conquistas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
          </TabsList>

          <TabsContent value="ranking" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Top 10 ACS do Mês
              </h2>

              {isLoading ? (
                <div className="text-center py-12">Carregando rankings...</div>
              ) : (
                <div className="space-y-3">
                  {rankings && rankings.length > 0 ? (
                    rankings.slice(0, 10).map((team: any, idx: number) => {
                      const medal = getMedalForScore(team.score || 0);
                      const MedalIcon = medal.icon;
                      
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all hover:shadow-lg ${
                            idx === 0
                              ? "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-400"
                              : idx === 1
                              ? "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-400"
                              : idx === 2
                              ? "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-400"
                              : "bg-white border-gray-200"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div
                              className={`flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg ${
                                idx === 0
                                  ? "bg-yellow-400 text-yellow-900"
                                  : idx === 1
                                  ? "bg-gray-400 text-gray-900"
                                  : idx === 2
                                  ? "bg-orange-400 text-orange-900"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              {idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : idx + 1}
                            </div>

                            <div>
                              <h3 className="font-bold text-lg">{team.team_name || `Equipe ${team.team_id}`}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={`bg-gradient-to-r ${medal.color} text-white`}>
                                  <MedalIcon className="h-3 w-3 mr-1" />
                                  {medal.name}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  {team.visits_count || 0} visitas
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-3xl font-bold text-purple-600">
                              {team.score || 0}
                            </div>
                            <div className="text-sm text-gray-500">pontos</div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Trophy className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                      <p>Nenhum dado de ranking disponível ainda</p>
                    </div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="conquistas" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-purple-600" />
                Conquistas Disponíveis
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {achievements.map((achievement, idx) => (
                  <Card key={idx} className="p-4 border-2 border-gray-200 hover:border-purple-400 transition-all">
                    <div className="flex items-start gap-4">
                      <div className="text-4xl">{achievement.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{achievement.name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {achievement.description}
                        </p>
                        <div className="mt-2">
                          <Badge className="bg-purple-600">
                            +{achievement.points} pontos
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="historico" className="space-y-4">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Crown className="h-5 w-5 text-purple-600" />
                Campeões Anteriores
              </h2>

              <div className="space-y-4">
                {[
                  { month: "Dezembro 2024", winner: "Maria Silva", score: 2450, medal: "Ouro" },
                  { month: "Novembro 2024", winner: "João Santos", score: 2180, medal: "Ouro" },
                  { month: "Outubro 2024", winner: "Ana Costa", score: 1950, medal: "Prata" },
                ].map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-bold">{record.month}</h3>
                      <p className="text-sm text-gray-600">{record.winner}</p>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-yellow-500 text-white">
                        {record.medal}
                      </Badge>
                      <p className="text-sm text-gray-600 mt-1">{record.score} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
