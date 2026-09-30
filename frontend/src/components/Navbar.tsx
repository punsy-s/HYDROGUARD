import React, { useState } from 'react';
import { 
  ShieldAlert, Radio, AlertTriangle, UserCheck, 
  Mountain, Clock, CheckCircle2, ChevronDown 
} from 'lucide-react';
import { SimulationScenario } from '../types';

interface NavbarProps {
  scenarios: SimulationScenario[];
  activeScenarioId: string;
  onScenarioChange: (id: string) => void;
  userRole: string;
  onRoleChange: (role: string) => void;
  riskCategory: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  scenarios,
  activeScenarioId,
  onScenarioChange,
  userRole,
  onRoleChange,
  riskCategory
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeScenario = scenarios.find(s => s.id === activeScenarioId) || scenarios[0];

  const getRiskBadge = (risk: string) => {
    switch (risk?.toLowerCase()) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'moderate':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <header className="h-16 bg-slate-900/95 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between sticky top-0 z-50 backdrop-blur">
      {/* Brand & Catchment Tag */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-lg bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-sm">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center space-x-2">
            <span className="font-bold text-lg text-white tracking-wide">TerraGuard NE</span>
            <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">
              Dikrong Basin
            </span>
          </div>
          <div className="text-xs text-slate-400 hidden sm:block">
            Arunachal Pradesh & Assam Foothills • Papum Pare - Lakhimpur
          </div>
        </div>
      </div>

      {/* Center Controls: Live Scenario Selector */}
      <div className="relative">
        <div className="flex items-center space-x-2 bg-slate-800/80 border border-slate-700/80 rounded-lg px-3 py-1.5 shadow-inner">
          <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-xs text-slate-400 font-medium hidden md:inline">Mode:</span>
          <select 
            value={activeScenarioId}
            onChange={(e) => onScenarioChange(e.target.value)}
            className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer pr-2"
          >
            {scenarios.map(sc => (
              <option key={sc.id} value={sc.id} className="bg-slate-900 text-white">
                {sc.name} ({sc.risk_category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Right Side: Risk Badge & Role Selector */}
      <div className="flex items-center space-x-3">
        {/* Risk Badge */}
        <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center space-x-1.5 ${getRiskBadge(riskCategory)}`}>
          <AlertTriangle className="w-3.5 h-3.5" />
          <span className="uppercase">{riskCategory || 'Low'} Risk</span>
        </div>

        {/* User Role Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-300">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          <select
            value={userRole}
            onChange={(e) => onRoleChange(e.target.value)}
            className="bg-transparent text-xs font-medium text-white focus:outline-none cursor-pointer"
          >
            <option value="PUBLIC" className="bg-slate-900 text-white">Public User</option>
            <option value="OFFICIAL" className="bg-slate-900 text-white">Disaster Official (SDMA)</option>
            <option value="ADMIN" className="bg-slate-900 text-white">Administrator</option>
          </select>
        </div>
      </div>
    </header>
  );
};
