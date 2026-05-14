import { Outlet, Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Terminal, User as UserIcon, LogOut, TerminalSquare, Send, Search, Bell } from 'lucide-react';
import { UsernameModal } from './UsernameModal';
import { UserAvatar } from './UserAvatar';
import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { AuthModal } from './AuthModal';
import { Sidebar } from './Sidebar';

export function Layout() {
  const { user, profile, signOut } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [onlineUsers, setOnlineUsers] = useState(0);
  const [authModal, setAuthModal] = useState<{ open: boolean, mode: 'login' | 'register' }>({ open: false, mode: 'login' });
  const navigate = useNavigate();

  useEffect(() => {
    // Total users count
    const unsubscribeTotal = onSnapshot(collection(db, 'users'), (snap) => {
      setTotalUsers(snap.docs.length);
    }, (err) => {
      console.error('Total users count error:', err);
    });

    // Online users count from presence collection
    const qPresence = query(
      collection(db, 'presence'), 
      where('isOnline', '==', true)
    );
    
    const unsubscribeOnline = onSnapshot(qPresence, (snap) => {
      // Filter out stale sessions manually if they haven't been updated in 5 minutes
      // (in case heartbeat failed or user crashed)
      const now = Date.now();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const activeSessions = snap.docs.filter(doc => (doc.data().updatedAt || 0) > fiveMinutesAgo);
      setOnlineUsers(activeSessions.length);
    }, (err) => {
      console.error('Online users count error:', err);
    });

    return () => {
      unsubscribeTotal();
      unsubscribeOnline();
    };
  }, []);

  useEffect(() => {
    const handleOpenAuth = (e: any) => {
      setAuthModal({ open: true, mode: e.detail?.mode || 'login' });
    };
    window.addEventListener('open-auth-modal', handleOpenAuth);
    return () => window.removeEventListener('open-auth-modal', handleOpenAuth);
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false));
    const unsubscribe = onSnapshot(q, (snap) => {
      setUnreadNotifs(snap.docs.length);
    }, (err) => {
      console.error('Layout notifications error:', err);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const qMessages = query(
      collection(db, 'private_messages'), 
      where('participants', 'array-contains', user.uid),
      where('seen', '==', false)
    );
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      // Filter out messages where I am the sender
      const myUnreads = snap.docs.filter(d => d.data().senderId !== user.uid).length;
      setUnreadMessages(myUnreads);
    }, (err) => {
      console.error('Layout messages error:', err);
    });
    return () => unsubMessages();
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/u/${searchQuery.trim()}`);
      setSearchQuery('');
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark text-white selection:bg-neon-blue/30 flex flex-col">
      <UsernameModal />
      
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity group flex-shrink-0">
            <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-2xl tracking-tighter mt-0.5">T</span>
            </div>
            <span className="text-2xl font-black tracking-tight font-display hidden sm:inline-block">
              texta
            </span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-lg relative hidden sm:block">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-white/30" />
             </div>
             <input 
               type="text" 
               className="w-full bg-white/5 border border-white/10 text-white rounded-xl pl-10 pr-4 py-2 focus:outline-none focus:border-neon-blue/50 focus:bg-white/10 transition-all text-sm placeholder-white/30" 
               placeholder="Szukaj..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
             />
          </form>
          
          <div className="hidden md:flex items-center gap-4 px-4 py-1.5 bg-white/5 border border-white/10 rounded-2xl ml-2 backdrop-blur-md">
            <div className="flex flex-col items-center">
              <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider leading-none mb-0.5">Użytkownicy</span>
              <span className="text-sm font-bold text-white leading-none">{totalUsers}</span>
            </div>
            <div className="w-px h-6 bg-white/10"></div>
            <div className="flex flex-col items-center">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-[9px] font-medium text-white/40 uppercase tracking-wider leading-none">Live</span>
              </div>
              <span className="text-sm font-bold text-green-500 leading-none">{onlineUsers}</span>
            </div>
          </div>

          <nav className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
            {profile ? (
              <>
                <Link to="/notifications" className="text-white/60 hover:text-white transition-colors relative" title="Powiadomienia">
                   <Bell className="w-6 h-6" />
                   {unreadNotifs > 0 && (
                     <span className="absolute -top-1 -right-1 bg-neon-purple text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-black">
                       {unreadNotifs > 9 ? '9+' : unreadNotifs}
                     </span>
                   )}
                </Link>
                <Link to="/messages" className="text-white/60 hover:text-white transition-colors relative" title="Wiadomości">
                   <Send className="w-6 h-6" />
                   {unreadMessages > 0 && (
                     <span className="absolute -top-1 -right-1 bg-neon-blue text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full ring-2 ring-black">
                       {unreadMessages > 9 ? '9+' : unreadMessages}
                     </span>
                   )}
                </Link>
                <div className="flex items-center gap-4">
                  <Link to={`/u/${profile.username}`} className="flex items-center gap-2 group">
                    <UserAvatar userId={profile.uid} username={profile.username} className="w-8 h-8 rounded-full border border-white/10 group-hover:scale-105 transition-all" />
                    <span className="text-sm font-medium group-hover:text-neon-blue transition-colors hidden sm:block">
                      {profile.username}
                    </span>
                  </Link>
                  <button 
                    onClick={signOut}
                    className="text-white/40 hover:text-red-400 transition-colors"
                    title="Wyloguj się"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : user ? (
              <span className="text-sm font-medium text-white/40">Inicjalizacja...</span>
            ) : (
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setAuthModal({ open: true, mode: 'login' })}
                  className="text-sm text-white/80 px-4 py-2 rounded-xl font-semibold hover:bg-white/5 transition-all whitespace-nowrap"
                >
                  Zaloguj
                </button>
                <button 
                  onClick={() => setAuthModal({ open: true, mode: 'register' })}
                  className="text-sm bg-white text-black px-4 py-2 sm:px-6 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg whitespace-nowrap"
                >
                  Dołącz
                </button>
              </div>
            )}
          </nav>
        </div>
      </header>

      <AuthModal 
        isOpen={authModal.open} 
        onClose={() => setAuthModal(prev => ({ ...prev, open: false }))} 
        mode={authModal.mode} 
      />

      <div className="flex flex-1 relative">
        <Sidebar />
        
        <main className="flex-1 w-full pl-20 lg:pl-64 transition-all duration-300">
          <div className="max-w-[1600px] mx-auto px-4 sm:px-8 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
