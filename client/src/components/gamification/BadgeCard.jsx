import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

const badgeIcons = {
  META_C1: "🎯",
  META_C2: "👶",
  META_C3: "🤰",
  META_C4: "💉",
  META_C5: "❤️",
  META_C6: "🔬",
  META_C7: "🎗️",
  META_B1: "🦷",
  META_B2: "😁",
  META_B3: "📅",
  META_B4: "✅",
  META_B5: "🔧",
  META_B6: "👥",
  META_M1: "🏥",
  META_M2: "⚕️",
  CAMPEAO_MES: "🏆",
  MELHORIA_10: "📈",
  QUALIDADE_100: "💎",
  TODAS_METAS: "🌟",
  TOP3_CONSECUTIVO: "🔥",
};

const badgeColors = {
  META_C1: "from-blue-400 to-blue-600",
  META_C2: "from-pink-400 to-pink-600",
  META_C3: "from-purple-400 to-purple-600",
  META_C4: "from-teal-400 to-teal-600",
  META_C5: "from-red-400 to-red-600",
  META_C6: "from-indigo-400 to-indigo-600",
  META_C7: "from-rose-400 to-rose-600",
  META_B1: "from-cyan-400 to-cyan-600",
  META_B2: "from-emerald-400 to-emerald-600",
  META_B3: "from-amber-400 to-amber-600",
  META_B4: "from-green-400 to-green-600",
  META_B5: "from-orange-400 to-orange-600",
  META_B6: "from-violet-400 to-violet-600",
  META_M1: "from-sky-400 to-sky-600",
  META_M2: "from-lime-400 to-lime-600",
  CAMPEAO_MES: "from-yellow-400 to-amber-500",
  MELHORIA_10: "from-emerald-400 to-green-600",
  QUALIDADE_100: "from-cyan-400 to-blue-600",
  TODAS_METAS: "from-purple-400 to-pink-600",
  TOP3_CONSECUTIVO: "from-orange-400 to-red-600",
};

export default function BadgeCard({ badge, earned = true, showDate = true }) {
  const icon = badgeIcons[badge.badge_code] || "🏅";
  const gradient = badgeColors[badge.badge_code] || "from-gray-400 to-gray-600";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.05 }}
      className={earned ? '' : 'opacity-40 grayscale'}
    >
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className={`h-2 bg-gradient-to-r ${gradient}`} />
        <CardContent className="p-4 text-center">
          <div className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-3xl shadow-lg mb-3`}>
            {icon}
          </div>
          <h4 className="font-bold text-gray-800 text-sm mb-1">{badge.badge_name}</h4>
          <p className="text-xs text-gray-500 line-clamp-2">{badge.badge_description}</p>
          {showDate && badge.earned_date && earned && (
            <p className="text-xs text-gray-400 mt-2">
              {new Date(badge.earned_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}