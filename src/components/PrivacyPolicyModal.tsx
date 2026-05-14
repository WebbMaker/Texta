import React from 'react';
import { X, Lock, Eye, ShieldCheck, Database } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/90 backdrop-blur-md"
          />
          
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-2xl bg-[#0a0a0a] border border-gray-800 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="p-8 border-b border-gray-800 flex items-center justify-between bg-surface/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-neon-purple/10 rounded-2xl text-neon-purple">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Polityka Prywatności</h2>
                  <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Ostatnia aktualizacja: 14 maja 2024</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-3 hover:bg-gray-800 rounded-2xl text-gray-400 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto font-sans text-gray-300 leading-relaxed space-y-8 scrollbar-hide">
              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-purple font-mono text-xs">A.</span> Gromadzenie danych
                </h3>
                <p className="text-sm">
                  Serwis TEXTA gromadzi minimalny zakres danych niezbędny do poprawnego działania platformy. Są to przede wszystkim: adres e-mail (pozyskiwany przez OAuth Google), nazwa użytkownika oraz opcjonalne zdjęcie profilowe. Dane te są niezbędne do identyfikacji użytkownika w systemie i personalizacji doświadczenia.
                </p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-purple font-mono text-xs">B.</span> Wykorzystanie danych
                </h3>
                <p className="text-sm">
                  Twoje dane są wykorzystywane wyłącznie w celu:
                </p>
                <ul className="list-disc pl-5 space-y-2 text-sm mt-2">
                  <li>Umożliwienia logowania i autoryzacji sesji.</li>
                  <li>Wyświetlania Twojego profilu przy publikowanych postach i komentarzach.</li>
                  <li>Przesyłania powiadomień systemowych dotyczących Twojej aktywności.</li>
                  <li>Zapewnienia bezpieczeństwa i zapobiegania nadużyciom.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-purple font-mono text-xs">C.</span> Bezpieczeństwo i Przechowywanie
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
                  <div className="p-4 bg-surface border border-gray-800 rounded-2xl">
                    <Lock className="w-5 h-5 text-neon-blue mb-2" />
                    <h4 className="text-white text-xs font-bold uppercase mb-1">Szyfrowanie</h4>
                    <p className="text-[10px] text-gray-500">Wszystkie połączenia są szyfrowane protokołem TLS 1.3.</p>
                  </div>
                  <div className="p-4 bg-surface border border-gray-800 rounded-2xl">
                    <Database className="w-5 h-5 text-neon-purple mb-2" />
                    <h4 className="text-white text-xs font-bold uppercase mb-1">Firestore</h4>
                    <p className="text-[10px] text-gray-500">Dane przechowywane są w zabezpieczonych bazach danych Google Cloud.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-purple font-mono text-xs">D.</span> Prawa Użytkownika
                </h3>
                <p className="text-sm">
                  Zgodnie z RODO, każdemu użytkownikowi przysługuje prawo do wglądu w swoje dane, ich sprostowania, usunięcia ("prawo do bycia zapomnianym") oraz ograniczenia ich przetwarzania. Możesz w każdej chwili usunąć swój profil wraz ze wszystkimi powiązanymi treściami.
                </p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-purple font-mono text-xs">E.</span> Pliki Cookies
                </h3>
                <p className="text-sm">
                  Wykorzystujemy pliki cookies wyłącznie w celach technicznych (utrzymanie sesji użytkownika). Nie stosujemy ciasteczek śledzących ani reklamowych od podmiotów trzecich.
                </p>
              </section>

              <div className="p-6 bg-neon-blue/5 border border-neon-blue/20 rounded-3xl flex gap-4 items-start">
                <Eye className="w-6 h-6 text-neon-blue shrink-0 mt-1" />
                <div>
                  <h4 className="text-neon-blue font-black text-sm uppercase mb-1">Transparentność</h4>
                  <p className="text-xs text-gray-400">
                    Wierzymy w pełną przejrzystość. Jeśli masz pytania dotyczące przetwarzania Twoich danych, skontaktuj się z administratorem systemu TEXTA.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-8 bg-surface/20 flex justify-end">
              <button
                onClick={onClose}
                className="bg-neon-purple text-white font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(168,85,247,0.3)]"
              >
                Akceptuję Zasady
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
