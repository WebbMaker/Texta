import { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

export function UsernameModal() {
  const { user, profile, loading } = useAuth();
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading || !user || profile) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.match(/^[a-zA-Z0-9_\-]+$/)) {
      setError("Nazwa użytkownika może zawierać tylko litery, cyfry, _ i -");
      return;
    }
    if (username.length < 3 || username.length > 30) {
      setError("Nazwa użytkownika musi mieć od 3 do 30 znaków");
      return;
    }

    setIsSubmitting(true);
    setError('');

    const lower = username.toLowerCase();
    
    try {
      const usernameRef = doc(db, 'usernames', lower);
      const usernameDoc = await getDoc(usernameRef);
      
      if (usernameDoc.exists()) {
        setError('Ta nazwa użytkownika jest już zajęta.');
        setIsSubmitting(false);
        return;
      }

      const batch = writeBatch(db);
      
      const userRef = doc(db, 'users', user.uid);
      const newProfile: Omit<UserProfile, 'uid'> = {
        username,
        lowercaseUsername: lower,
        createdAt: Date.now(),
        // Optional bio omitted
      };
      
      batch.set(userRef, newProfile);
      batch.set(usernameRef, { userId: user.uid });
      
      await batch.commit();
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Nie udało się ustawić nazwy użytkownika');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="bg-surface p-8 rounded-2xl max-w-md w-full border border-gray-800 shadow-[0_0_30px_rgba(0,242,255,0.1)] relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-neon-blue to-neon-purple"></div>
        <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">INICJALIZACJA</h2>
        <p className="text-gray-400 mb-8 text-sm font-mono text-neon-blue/80">Oczekiwanie na przypisanie unikalnego identyfikatora...</p>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="flex bg-bg-dark border-2 border-gray-800 rounded-xl focus-within:border-neon-blue overflow-hidden transition-colors">
              <span className="flex items-center pl-4 pr-2 text-gray-500 font-mono">@</span>
              <input 
                type="text" 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="nazwa"
                className="w-full bg-transparent text-white px-2 py-4 outline-none font-mono"
                disabled={isSubmitting}
                autoFocus
              />
            </div>
            {error && <p className="text-red-400 mt-2 text-sm font-mono">{error}</p>}
          </div>
          <button 
            type="submit" 
            disabled={isSubmitting}
            className="w-full bg-neon-blue text-black font-bold tracking-widest uppercase py-4 rounded-xl transition-all hover:brightness-110 disabled:opacity-50 shadow-[0_0_15px_rgba(0,242,255,0.3)]"
          >
            {isSubmitting ? 'PRZETWARZANIE...' : 'ZAREZERWUJ NAZWĘ'}
          </button>
        </form>
      </div>
    </div>
  );
}
