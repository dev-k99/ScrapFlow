import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  Truck, 
  Box, 
  Users, 
  Settings, 
  ShieldCheck, 
  ChevronRight 
} from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { name: 'Inbound Tickets', icon: Truck, path: '/tickets' },
    { name: 'Inventory & Lots', icon: Box, path: '/inventory' },
    { name: 'Materials', icon: FileText, path: '/materials' },
    { name: 'Suppliers', icon: Users, path: '/suppliers' },
    { name: 'Compliance', icon: ShieldCheck, path: '/compliance' },
    { name: 'Settings', icon: Settings, path: '/settings' },
  ];

  return (
    <aside className="w-72 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0 z-30 shadow-sm">
      <div className="p-8 pb-4">
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-100">
            <span className="text-white font-bold text-xl">SF</span>
          </div>
          <span className="text-xl font-black text-gray-900 tracking-tight">ScrapFlow SA</span>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) => `
              flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group
              ${isActive 
                ? 'bg-emerald-50 text-emerald-700 shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
            `}
          >
            <div className="flex items-center space-x-4">
              <item.icon size={20} className="transition-transform group-hover:scale-110" />
              <span className="font-semibold">{item.name}</span>
            </div>
            <ChevronRight className={`opacity-0 group-hover:opacity-100 transition-opacity`} size={16} />
          </NavLink>
        ))}
      </nav>

      <div className="p-6 mt-auto">
        <div className="p-4 bg-emerald-600 rounded-2xl text-white shadow-xl shadow-emerald-200">
          <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-1">Status</p>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            <p className="text-sm font-bold">Yard Online</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
