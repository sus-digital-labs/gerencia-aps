import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { motion } from 'framer-motion';

export default function StatsCard({ 
  title, 
  value, 
  subtitle,
  icon: Icon, 
  trend,
  trendValue,
  color = "blue"
}) {
  const colorClasses = {
    blue: {
      bg: "bg-blue-50",
      iconBg: "bg-blue-500",
      text: "text-blue-600",
      border: "border-blue-100"
    },
    green: {
      bg: "bg-emerald-50",
      iconBg: "bg-emerald-500",
      text: "text-emerald-600",
      border: "border-emerald-100"
    },
    purple: {
      bg: "bg-purple-50",
      iconBg: "bg-purple-500",
      text: "text-purple-600",
      border: "border-purple-100"
    },
    orange: {
      bg: "bg-orange-50",
      iconBg: "bg-orange-500",
      text: "text-orange-600",
      border: "border-orange-100"
    },
    red: {
      bg: "bg-red-50",
      iconBg: "bg-red-500",
      text: "text-red-600",
      border: "border-red-100"
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <Card className={`border-0 shadow-lg ${colors.bg} overflow-hidden`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
              <h3 className="text-3xl font-black text-gray-900">{value}</h3>
              {subtitle && (
                <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
              )}
              {trend && (
                <div className={`flex items-center gap-1 mt-2 text-sm ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
                  <span>{trend === 'up' ? '↑' : '↓'}</span>
                  <span>{trendValue}</span>
                </div>
              )}
            </div>
            {Icon && (
              <div className={`${colors.iconBg} p-3 rounded-xl text-white shadow-lg`}>
                <Icon className="w-6 h-6" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}