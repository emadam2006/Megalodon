import React from "react";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color?: "cyan" | "emerald" | "rose" | "amber" | "indigo" | "white";
  trend?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  badge,
}) => {
  return (
    <div className="group relative rounded-xl border border-zinc-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5 transition-all hover:border-zinc-300 dark:hover:border-neutral-700 hover:shadow-sm dark:hover:bg-neutral-900/50">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500 dark:text-neutral-400">{title}</span>
        <div className="p-2 rounded-lg border border-zinc-200 dark:border-neutral-800 bg-zinc-100 dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 group-hover:text-zinc-900 dark:group-hover:text-white group-hover:border-zinc-300 dark:group-hover:border-neutral-700 transition-colors">
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-2xl font-semibold font-mono tracking-tight text-zinc-900 dark:text-white">{value}</span>
        {badge && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-100 dark:bg-neutral-900 text-zinc-700 dark:text-neutral-300 border border-zinc-200 dark:border-neutral-800">
            {badge}
          </span>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-zinc-500 dark:text-neutral-500 font-mono">
          {subtitle && <span>{subtitle}</span>}
          {trend && <span className="text-zinc-700 dark:text-neutral-300">{trend}</span>}
        </div>
      )}
    </div>
  );
};
