import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Heart, FileText, Syringe } from "lucide-react";
import { motion } from "framer-motion";
import PreventivoTracking from "../components/womens-health/PreventivoTracking";
import MamografiaTracking from "../components/womens-health/MamografiaTracking";
import HPVVaccineTracking from "../components/womens-health/HPVVaccineTracking";

export default function WomensHealth() {
  const [activeTab, setActiveTab] = useState("preventivo");

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-rose-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white">
        <div className="max-w-[1600px] mx-auto px-6 py-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-2xl">
              <Heart className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">
                Saúde da Mulher
              </h1>
              <p className="text-white/70">
                Acompanhamento de Preventivo, Mamografia e Vacinas
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-lg mb-6">
            <TabsTrigger
              value="preventivo"
              className="gap-2 data-[state=active]:bg-pink-600 data-[state=active]:text-white"
            >
              <FileText className="w-4 h-4" />
              Exame Preventivo
            </TabsTrigger>
            <TabsTrigger
              value="mamografia"
              className="gap-2 data-[state=active]:bg-purple-600 data-[state=active]:text-white"
            >
              <Heart className="w-4 h-4" />
              Mamografia
            </TabsTrigger>
            <TabsTrigger
              value="vacina"
              className="gap-2 data-[state=active]:bg-rose-600 data-[state=active]:text-white"
            >
              <Syringe className="w-4 h-4" />
              Vacina HPV
            </TabsTrigger>
          </TabsList>

          <TabsContent value="preventivo">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <PreventivoTracking />
            </motion.div>
          </TabsContent>

          <TabsContent value="mamografia">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <MamografiaTracking />
            </motion.div>
          </TabsContent>

          <TabsContent value="vacina">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <HPVVaccineTracking />
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
