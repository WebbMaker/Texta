import React from 'react';
import { Link, useLocation } from 'react-router';
import { 
  Home, 
  Film, 
  Globe, 
  Info, 
  Settings, 
  LayoutGrid, 
  MessageCircle,
  Hash,
  Library
} from 'lucide-react';
import { motion } from 'motion/react';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Główna', path: '/' },
    { icon: Film, label: 'Wideo', path: '/videos' },
    { icon: Library, label: 'Forum', path: '/forum' },
    { icon: Globe, label: 'Global Chat', path: '/global-chat' },
    { icon: Info, label: 'O nas', path: '/about' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className="fixed left-0 top-[73px] bottom-0 w-20 lg:w-64 bg-bg-dark border-r border-gray-800 z-30 transition-all duration-300 overflow-y-auto scrollbar-hide">
      <div className="flex flex-col h-full py-6 px-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group relative ${
                isActive(item.path) 
                ? 'bg-neon-blue/10 text-neon-blue shadow-[0_0_20px_rgba(0,242,255,0.1)]' 
                : 'text-gray-500 hover:bg-surface hover:text-gray-200'
              }`}
            >
              <item.icon className={`w-6 h-6 transition-transform group-hover:scale-110 ${isActive(item.path) ? 'animate-pulse' : ''}`} />
              <span className="hidden lg:block font-black uppercase tracking-tighter text-sm">
                {item.label}
              </span>
              
              {isActive(item.path) && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-0 top-2 bottom-2 w-1.5 bg-neon-blue rounded-r-full shadow-[0_0_15px_rgba(0,242,255,0.8)]"
                />
              )}
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-gray-800/50">
          <button 
            onClick={() => {}} // placeholder
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-gray-500 hover:bg-surface hover:text-gray-200 transition-all group"
          >
            <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
            <span className="hidden lg:block font-black uppercase tracking-tighter text-sm">
              Ustawienia
            </span>
          </button>
          
          <div className="mt-8 hidden lg:block">
            <div className="p-4 bg-surface/50 border border-gray-800 rounded-2xl backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid className="w-4 h-4 text-neon-purple" />
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Wersja 2.4.0</span>
              </div>
              <p className="text-[10px] text-gray-600 font-mono leading-relaxed">
                SYSTEM REDYSTYBUCJI DANYCH OPERACJA: TEXTA_CORE
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
