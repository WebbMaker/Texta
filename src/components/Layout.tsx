import { Outlet, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, User as UserIcon, LogOut, TerminalSquare, Send, Search, Bell } from 'lucide-react';
import { UsernameModal } from './UsernameModal';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export function Layout() {
  const { user, profile, signInWithGoogle, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadNotifs(snap.docs.length);
    });
    return () => unsubscribe();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/u/${searchQuery.trim()}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white font-sans selection:bg-neon-blue/30 flex flex-col">
      <UsernameModal />
      
      <header className="sticky top-0 z-40 border-b border-gray-800 bg-bg-dark">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-[0_0_15px_rgba(0,242,255,0.4)] group-hover:shadow-[0_0_20px_rgba(188,19,254,0.6)] transition-shadow">
              <span className="text-bg-dark font-black text-2xl tracking-tighter mt-0.5">T</span>
            </div>
            <span className="text-3xl font-black tracking-tighter lowercase hidden sm:inline-block">
              texta<span className="text-neon-blue animate-pulse">_</span>
            </span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-xs relative hidden sm:block">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-500" />
             </div>
             <input 
               type="text" 
               className="w-full bg-surface border border-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-neon-purple text-sm font-mono placeholder-gray-500" 
               placeholder="Szukaj użytkownika..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </form>

          <nav className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            <Link to="/about" className="text-sm font-semibold text-gray-400 hover:text-white transition-colors hidden sm:block">
              O nas
            </Link>
            {profile ? (
              <>
                <Link to="/notifications" className="text-gray-400 hover:text-neon-purple transition-colors relative" title="Powiadomienia">
                   <Bell className="w-6 h-6" />
                   {unreadNotifs > 0 && (
                     <span className="absolute -top-1 -right-1 bg-neon-purple text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                       {unreadNotifs > 9 ? '9+' : unreadNotifs}
                     </span>
                   )}
                </Link>
                <Link to="/messages" className="text-gray-400 hover:text-neon-blue transition-colors relative" title="Wiadomości">
                   <Send className="w-6 h-6" />
                </Link>
                <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-gray-900 rounded-full border border-gray-800">
                  <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse"></div>
                  <span className="text-xs font-mono text-neon-blue">DOSTĘPNY</span>
                </div>
                <div className="flex items-center gap-4">
                  <Link to={`/u/${profile.username}`} className="text-sm font-semibold hover:text-neon-blue transition-colors hidden sm:block">
                    @{profile.username}
                  </Link>
                  <button 
                    onClick={signOut}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Wyloguj się"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : user ? (
              <span className="text-sm font-mono text-gray-500">SYSTEM.INICJALIZACJA()</span>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={signInWithGoogle}
                  className="text-sm border border-gray-700 text-white px-4 py-2 rounded-lg font-bold tracking-widest uppercase hover:bg-gray-800 transition-all whitespace-nowrap"
                >
                  Zaloguj się
                </button>
                <button 
                  onClick={signInWithGoogle}
                  className="text-sm bg-neon-purple text-white px-4 py-2 sm:px-6 rounded-lg font-bold tracking-widest uppercase hover:brightness-110 transition-all shadow-[0_0_15px_rgba(188,19,254,0.3)] whitespace-nowrap"
                >
                  Zarejestruj się
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
