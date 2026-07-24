import React from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
export const StatsCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  trend,
  trendLabel,
  loading = false,
  onClick,
  delay = 0
}) => {
  const trendPositive = trend !== undefined && trend > 0;
  const trendNegative = trend !== undefined && trend < 0;
  const trendNeutral = trend !== undefined && trend === 0;
  if (loading) {
    return <div className="card-surface p-5">
        <div className="skeleton h-4 w-24 rounded mb-4" />
        <div className="skeleton h-8 w-32 rounded mb-2" />
        <div className="skeleton h-3 w-20 rounded" />
      </div>;
  }
  return <motion.div initial={{
    opacity: 0,
    y: 16
  }} animate={{
    opacity: 1,
    y: 0
  }} transition={{
    duration: 0.3,
    delay
  }} onClick={onClick} className={cn("card-surface p-5 flex flex-col gap-3", onClick && "cursor-pointer hover:shadow-card-hover")}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", iconBg)}>
          <Icon className={cn("h-4 w-4", iconColor)} />
        </div>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>

      {/* Trend */}
      {trend !== undefined && <div className={cn("flex items-center gap-1.5 text-xs font-medium", trendPositive && "text-emerald-600 dark:text-emerald-400", trendNegative && "text-red-500 dark:text-red-400", trendNeutral && "text-muted-foreground")}>
          {trendPositive && <TrendingUp className="h-3.5 w-3.5" />}
          {trendNegative && <TrendingDown className="h-3.5 w-3.5" />}
          {trendNeutral && <Minus className="h-3.5 w-3.5" />}
          <span>
            {trendPositive && "+"}
            {Math.abs(trend).toFixed(0)}%
            {trendLabel && <span className="text-muted-foreground font-normal ml-1">{trendLabel}</span>}
          </span>
        </div>}
    </motion.div>;
};
export default StatsCard;
