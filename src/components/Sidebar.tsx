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
    { icon: LayoutGrid, label: 'Forum', path: '/forum' },
    { icon: MessageCircle, label: 'Global Chat', path: '/global-chat' },
    { icon: Info, label: 'O nas', path: '/about' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="fixed left-0 top-[73px] bottom-0 w-20 lg:w-64 border-r border-white/5 z-30 transition-all duration-300 overflow-y-auto scrollbar-hide bg-black/40 backdrop-blur-xl">
      <div className="flex flex-col h-full py-6 px-4">
        <div className="space-y-2">
          {navItems.map((item) => (
            <Link 
              key={item.path}
              to={item.path} 
              className={`flex items-center gap-4 px-4 py-3 rounded-2xl transition-all group relative ${
                isActive(item.path) 
                ? 'bg-white/10 text-white shadow-sm' 
                : 'text-white/40 hover:bg-white/5 hover:text-white'
              }`}
            >
              <item.icon className={`w-5 h-5 transition-transform group-hover:scale-110`} />
              <span className="hidden lg:block font-semibold text-sm tracking-tight">
                {item.label}
              </span>
              
              {isActive(item.path) && (
                <motion.div 
                  layoutId="active-nav"
                  className="absolute left-1 top-3 bottom-3 w-1 bg-white rounded-full"
                />
              )}
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-6 border-t border-white/5">
          <button 
            onClick={() => {}} // placeholder
            className="w-full flex items-center gap-4 px-4 py-3 rounded-2xl text-white/40 hover:bg-white/5 hover:text-white transition-all group"
          >
            <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
            <span className="hidden lg:block font-semibold text-sm tracking-tight">
              Ustawienia
            </span>
          </button>
        </div>
      </div>
    </aside>
  );
}
