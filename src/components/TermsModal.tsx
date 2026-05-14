import React from 'react';
import { X, ShieldAlert, ScrollText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TermsModal({ isOpen, onClose }: TermsModalProps) {
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
                <div className="p-3 bg-neon-blue/10 rounded-2xl text-neon-blue">
                  <ScrollText className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-3xl font-black tracking-tighter text-white uppercase italic">Regulamin Serwisu</h2>
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
                  <span className="text-neon-blue font-mono text-xs">01.</span> Postanowienia ogólne
                </h3>
                <p className="text-sm">
                  Niniejszy regulamin określa zasady korzystania z platformy TEXTA. Korzystanie z serwisu oznacza pełną akceptację poniższych warunków. Serwis służy do wymiany informacji, multimediów oraz interakcji społecznościowej w środowisku chronionym.
                </p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-blue font-mono text-xs">02.</span> Konto Użytkownika
                </h3>
                <p className="text-sm">
                  Użytkownik zobowiązuje się do podawania prawdziwych danych podczas procesu rejestracji. Każdy użytkownik jest odpowiedzialny za bezpieczeństwo swojego konta i nieudostępnianie danych dostępowych osobom trzecim. System TEXTA wykorzystuje uwierzytelnianie Google dla zapewnienia najwyższego standardu bezpieczeństwa.
                </p>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-blue font-mono text-xs">03.</span> Zasady publikacji treści
                </h3>
                <ul className="list-disc pl-5 space-y-2 text-sm">
                  <li>Zakaz publikowania treści niezgodnych z polskim prawem.</li>
                  <li>Zakaz szerzenia nienawiści, dyskryminacji oraz przemocy.</li>
                  <li>Zakaz udostępniania materiałów naruszających prawa autorskie osób trzecich.</li>
                  <li>Administratorzy zastrzegają sobie prawo do usuwania treści naruszających powyższe zasady bez uprzedzenia.</li>
                </ul>
              </section>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-blue font-mono text-xs">04.</span> Prywatność i Dane Osobowe
                </h3>
                <p className="text-sm">
                  Twoje dane techniczne oraz informacje o profilu są przetwarzane zgodnie z naszą Polityką Prywatności. Stosujemy zaawansowane metody szyfrowania, aby zapewnić poufność Twoich interakcji. Nie sprzedajemy Twoich danych podmiotom zewnętrznym.
                </p>
              </section>

              <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-3xl flex gap-4 items-start">
                <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-1" />
                <div>
                  <h4 className="text-red-500 font-black text-sm uppercase mb-1">Uwaga Dotycząca Bezpieczeństwa</h4>
                  <p className="text-xs text-gray-400">
                    Nigdy nie podawaj haseł ani kluczy dostępu w wiadomościach prywatnych lub publicznych postach. Pracownicy serwisu nigdy nie poproszą Cię o takie informacje.
                  </p>
                </div>
              </div>

              <section>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2 uppercase tracking-tight">
                  <span className="text-neon-blue font-mono text-xs">05.</span> Zakończenie
                </h3>
                <p className="text-sm italic">
                  TEXTA zastrzega sobie prawo do zmiany regulaminu w dowolnym momencie. Dalsze korzystanie z serwisu po zmianach oznacza ich akceptację.
                </p>
              </section>
            </div>

            {/* Footer */}
            <div className="p-8 bg-surface/20 flex justify-end">
              <button
                onClick={onClose}
                className="bg-white text-black font-black py-4 px-10 rounded-2xl hover:scale-105 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Rozumiem i Akceptuję
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
