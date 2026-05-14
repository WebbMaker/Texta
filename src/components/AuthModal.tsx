import React from 'react';
import { X, Globe, Shield, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      onClose();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, ignore the error
        return;
      }
      console.error('Auth error:', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-bg-dark border border-gray-800 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* Header Gradient */}
            <div className={`h-2 w-full bg-gradient-to-r ${mode === 'login' ? 'from-neon-blue to-neon-purple' : 'from-neon-purple to-pink-500'}`} />
            
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="p-8 sm:p-10">
              <div className="flex justify-center mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${mode === 'login' ? 'bg-neon-blue/10 text-neon-blue' : 'bg-neon-purple/10 text-neon-purple'}`}>
                  {mode === 'login' ? <Globe className="w-8 h-8" /> : <Terminal className="w-8 h-8" />}
                </div>
              </div>

              <div className="text-center mb-10">
                <h2 className="text-3xl font-black tracking-tighter text-white mb-3 uppercase">
                  {mode === 'login' ? 'Logowanie' : 'Rejestracja'}
                </h2>
                <p className="text-gray-400 font-mono text-sm">
                  {mode === 'login' 
                    ? 'Witaj z powrotem w systemie TEXTA.' 
                    : 'Dołącz do zdecentralizowanej sieci.'}
                </p>
              </div>

              <div className="space-y-4">
                <button
                  onClick={handleSignIn}
                  className="w-full group relative flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-100 transition-all overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/20 to-neon-purple/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  <span className="relative">
                    {mode === 'login' ? 'Zaloguj przez Google' : 'Zarejestruj przez Google'}
                  </span>
                </button>

                <div className="flex items-center gap-3 py-4">
                  <div className="h-px flex-1 bg-gray-800" />
                  <span className="text-[10px] font-mono text-gray-600 uppercase tracking-widest">Bezpieczeństwo</span>
                  <div className="h-px flex-1 bg-gray-800" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-surface border border-gray-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    <Shield className="w-4 h-4 text-neon-blue" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Szyfrowanie</span>
                  </div>
                  <div className="p-4 bg-surface border border-gray-800 rounded-xl flex flex-col items-center gap-2 text-center">
                    <Terminal className="w-4 h-4 text-neon-purple" />
                    <span className="text-[10px] font-mono text-gray-400 uppercase">Anonimowość</span>
                  </div>
                </div>
              </div>

              <div className="mt-10 text-center">
                <p className="text-xs text-gray-500 leading-relaxed font-mono">
                  Kontynuując, akceptujesz nasz <br />
                  <span className="text-gray-400 hover:text-white underline cursor-pointer">Regulamin</span> oraz <span className="text-gray-400 hover:text-white underline cursor-pointer">Politykę Prywatności</span>.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
