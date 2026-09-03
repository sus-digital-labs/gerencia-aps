import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';

const positionColors: Record<number, string> = {
  1: 'bg-gradient-to-r from-amber-400 to-yellow-500',
  2: 'bg-gradient-to-r from-gray-300 to-gray-400',
  3: 'bg-gradient-to-r from-amber-600 to-amber-700'
};

export interface Ranking {
  acs_name: string;
  unit_name: string;
  microarea: string;
  points: number;
  position: number;
  variation?: number;
  photo_url?: string;
}

export interface ACSRankingCardProps {
  ranking: Ranking;
  index: number;
  showVariation?: boolean;
  compact?: boolean;
}

export default function ACSRankingCard({ 
  ranking, 
  index, 
  showVariation = true,
  compact = false 
}: ACSRankingCardProps) {
  const { acs_name, unit_name, microarea, points, position, variation, photo_url } = ranking;

  const getVariationIcon = () => {
    if (!variation || variation === 0) return <Minus className="w-4 h-4 text-gray-400" />;
    if (variation > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    return <TrendingDown className="w-4 h-4 text-red-500" />;
  };

  const getVariationText = () => {
    if (!variation || variation === 0) return '';
    return variation > 0 ? `+${variation}` : `${variation}`;
  };

  const getMedal = () => {
    if (position === 1) return '🥇';
    if (position === 2) return '🥈';
    if (position === 3) return '🥉';
    return null;
  };

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.05 }}
        className={`flex items-center gap-3 p-3 rounded-xl ${
          position <= 3 ? positionColors[position] + ' text-white' : 'bg-white shadow-sm'
        }`}
      >
        <span className="text-lg font-bold w-8 text-center">
          {getMedal() || `#${position}`}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarImage src={photo_url} />
          <AvatarFallback className={position <= 3 ? 'bg-white/20 text-white' : 'bg-gray-100'}>
            {acs_name?.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${position <= 3 ? '' : 'text-gray-800'}`}>
            {acs_name}
          </p>
        </div>
        <Badge className={position <= 3 ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}>
          {points} pts
        </Badge>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ scale: 1.02 }}
      className={`relative overflow-hidden rounded-2xl ${
        position <= 3 
          ? positionColors[position] + ' text-white shadow-lg' 
          : 'bg-white shadow-md border'
      }`}
    >
      {/* Champion Crown */}
      {position === 1 && (
        <motion.div
          initial={{ rotate: -30, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="absolute -top-2 -right-2 text-4xl"
        >
          👑
        </motion.div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-4">
          {/* Position */}
          <div className="text-center">
            <span className="text-3xl font-black">
              {getMedal() || `#${position}`}
            </span>
            {showVariation && variation !== undefined && (
              <div className={`flex items-center justify-center gap-1 text-xs mt-1 ${
                position <= 3 ? 'text-white/80' : ''
              }`}>
                {getVariationIcon()}
                <span>{getVariationText()}</span>
              </div>
            )}
          </div>

          {/* Avatar */}
          <Avatar className="h-14 w-14 border-2 border-white/50">
            <AvatarImage src={photo_url} />
            <AvatarFallback className={position <= 3 ? 'bg-white/20 text-white text-xl' : 'bg-gray-100 text-xl'}>
              {acs_name?.charAt(0)}
            </AvatarFallback>
          </Avatar>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className={`font-bold text-lg truncate ${position <= 3 ? '' : 'text-gray-800'}`}>
              {acs_name}
            </p>
            <p className={`text-sm truncate ${position <= 3 ? 'text-white/70' : 'text-gray-500'}`}>
              {unit_name}
            </p>
            <Badge className={`mt-1 ${
              position <= 3 ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              MA {microarea}
            </Badge>
          </div>

          {/* Points */}
          <div className="text-right">
            <p className="text-3xl font-black">{points}</p>
            <p className={`text-xs ${position <= 3 ? 'text-white/70' : 'text-gray-500'}`}>
              pontos
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
