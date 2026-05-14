import React, { useState } from 'react';
import { X, Globe, Shield, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { TermsModal } from './TermsModal';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, mode }: AuthModalProps) {
  const { signInWithGoogle } = useAuth();
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

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
    <>
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
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#1c1c1e] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl"
            >
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors z-10"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 sm:p-10">
                <div className="flex justify-center mb-8">
                  <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white">
                    {mode === 'login' ? <Globe className="w-8 h-8" /> : <Shield className="w-8 h-8" />}
                  </div>
                </div>

                <div className="text-center mb-10">
                  <h2 className="text-3xl font-bold tracking-tight text-white mb-3 font-display">
                    {mode === 'login' ? 'Witaj ponowie' : 'Utwórz konto'}
                  </h2>
                  <p className="text-white/40 font-medium">
                    {mode === 'login' 
                      ? 'Więcej możliwości czeka na Ciebie.' 
                      : 'Dołącz do społeczności profesjonalistów.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={handleSignIn}
                    className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 rounded-xl hover:bg-white/90 transition-all shadow-lg"
                  >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    <span>
                      {mode === 'login' ? 'Zaloguj przez Google' : 'Dołącz przez Google'}
                    </span>
                  </button>

                  <div className="flex items-center gap-3 py-4">
                    <div className="h-px flex-1 bg-white/5" />
                    <span className="text-[10px] font-bold text-white/20 uppercase tracking-widest">Bezpieczeństwo</span>
                    <div className="h-px flex-1 bg-white/5" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 text-center backdrop-blur-sm">
                      <Shield className="w-4 h-4 text-white/60" />
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">End-to-End</span>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center gap-2 text-center backdrop-blur-sm">
                      <Globe className="w-4 h-4 text-white/60" />
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Globalny dostęp</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 text-center">
                  <p className="text-[11px] text-white/30 leading-relaxed font-medium">
                    Kontynuując, akceptujesz nasz <br />
                    <span 
                      onClick={() => setShowTerms(true)}
                      className="text-white/40 hover:text-white underline cursor-pointer"
                    >Regulamin</span> oraz <span 
                      onClick={() => setShowPrivacy(true)}
                      className="text-white/40 hover:text-white underline cursor-pointer"
                    >Politykę Prywatności</span>.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <TermsModal isOpen={showTerms} onClose={() => setShowTerms(false)} />
      <PrivacyPolicyModal isOpen={showPrivacy} onClose={() => setShowPrivacy(false)} />
    </>
  );
}
