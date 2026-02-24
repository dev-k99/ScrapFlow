import React from 'react';
import { Search, Bell, User, LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Navbar = () => {
  const { user } = useAuth();

  return (
    <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 fixed top-0 right-0 left-72 z-20 flex items-center justify-between px-10">
      <div className="relative w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text" 
          placeholder="Search tickets, materials or suppliers..."
          className="w-full bg-gray-100/50 border-none rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none text-sm"
        />
      </div>

      <div className="flex items-center space-x-6">
        <button className="p-3 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all relative">
          <Bell size={20} />
          <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>

        <div className="h-10 w-px bg-gray-100 mx-2"></div>

        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900 leading-none">{user?.fullName}</p>
            <p className="text-xs font-medium text-emerald-600 mt-1 uppercase tracking-wider">{user?.role}</p>
          </div>
          <div className="w-11 h-11 bg-gray-100 rounded-2xl flex items-center justify-center text-gray-400 border border-gray-50 shadow-inner">
            <User size={22} />
          </div>
          <button className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
