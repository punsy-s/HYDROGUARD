import React from 'react';
import { 
  LayoutDashboard, Activity, Cpu, Waves, 
  Building2, Navigation, Bell, Shield, Info, Home 
} from 'lucide-react';

export type PageId = 
  | 'landing'
  | 'dashboard'
  | 'monitoring'
  | 'prediction'
  | 'simulation'
  | 'damage'
  | 'evacuation'
  | 'alerts'
  | 'admin'
  | 'info';

interface SidebarProps {
  activePage: PageId;
  onPageSelect: (page: PageId) => void;
  userRole: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageSelect, userRole }) => {
  const navItems = [
    { id: 'landing' as PageId, label: 'Overview', icon: Home, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'dashboard' as PageId, label: 'Live Dashboard', icon: LayoutDashboard, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'monitoring' as PageId, label: 'IoT Gauges', icon: Activity, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'prediction' as PageId, label: 'Flood Prediction', icon: Cpu, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'simulation' as PageId, label: 'HEC-RAS 2D Simulation', icon: Waves, roles: ['OFFICIAL', 'ADMIN'] },
    { id: 'damage' as PageId, label: 'Downstream Impact', icon: Building2, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'evacuation' as PageId, label: 'Safe Evacuation', icon: Navigation, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'alerts' as PageId, label: 'Alerts & Warnings', icon: Bell, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
    { id: 'admin' as PageId, label: 'System Health', icon: Shield, roles: ['ADMIN', 'OFFICIAL'] },
    { id: 'info' as PageId, label: 'Project Info', icon: Info, roles: ['PUBLIC', 'OFFICIAL', 'ADMIN'] },
  ];

  return (
    <aside className="w-64 bg-[#16131F]    border-r border-[#806C79] flex flex-col justify-between shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#C1A0AC]">
          Command Modules
        </div>
        {navItems.filter(item => item.roles.includes(userRole)).map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onPageSelect(item.id)}
              className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-[#F0D9E4] text-white font-semibold shadow-md shadow-blue-500/20' 
                  : 'text-[#C1A0AC]hover:text-white hover:bg-[#4A3F4B]/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-[#C1A0AC]'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info Box */}
      <div className="p-3 border-t border-[#806C79]/80 bg-[#16131F]   /50">
        <div className="bg-slate-800/60 rounded-lg p-2.5 border border-[#806C79]/50">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-300">
            <span>Hydraulic Engine:</span>
            <span className="text-[#20C7A2] text-[10px] font-bold">2D Ready</span>
          </div>
          <div className="text-[10px] text-[#C1A0AC] mt-1">
            Manning's n = 0.038 • Tc = 3.2h
          </div>
        </div>
      </div>
    </aside>
  );
};
