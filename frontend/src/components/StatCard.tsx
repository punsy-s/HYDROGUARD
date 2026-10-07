import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  color?: 'blue' | 'emerald' | 'amber' | 'red' | 'purple';
  provenance?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  color = 'blue',
  provenance
}) => {
  const colorMap = {
  blue: "bg-[#F0D9E4]/10 text-[#C1A0AC] border-cyan-500/20",
  emerald: "bg-teal-500/10 text-teal-400 border-teal-500/20",
  amber: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  red: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  purple: "bg-sky-500/10 text-sky-300 border-sky-500/20",
 };

  return (
    <div className="bg-[#4A3F4B]    border border-[#806C79] rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-[#806C79] transition">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{title}</span>
          <div className="mt-1 flex items-baseline space-x-1">
            <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
            {unit && <span className="text-xs font-semibold text-slate-400">{unit}</span>}
          </div>
        </div>
        <div className={`p-2.5 rounded-lg border ${colorMap[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      
      <div className="mt-3 pt-2.5 border-t border-[#806C79]/80 flex items-center justify-between text-[11px]">
        <span className="text-slate-400 truncate">{subtitle || 'Telemetry stream active'}</span>
        {provenance && (
          <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
            {provenance}
          </span>
        )}
      </div>
    </div>
  );
};
