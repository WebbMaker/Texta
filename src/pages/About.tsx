import { TerminalSquare, Shield, Zap, Users } from 'lucide-react';

export function About() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 space-y-12">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl shadow-[0_0_30px_rgba(188,19,254,0.4)] mb-4">
          <TerminalSquare className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white">
          O NASZYM <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple">SYSTEMIE</span>
        </h1>
        <p className="text-xl text-gray-400 font-mono max-w-2xl mx-auto">
          Zbudowany dla szybkiej, bezpiecznej i bezpośredniej komunikacji w czasie rzeczywistym.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 pt-8">
        <div className="bg-surface border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-600 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-neon-blue group-hover:shadow-[0_0_15px_rgba(0,242,255,0.5)] transition-shadow"></div>
          <Zap className="w-8 h-8 text-neon-blue mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Czas Rzeczywisty</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Wszystkie transmisje, posty i wiadomości prywatne są przesyłane strumieniowo natychmiastowo z wykorzystaniem WebSocketów. Brak odświeżania, brak opóźnień.
          </p>
        </div>

        <div className="bg-surface border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-600 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-neon-purple group-hover:shadow-[0_0_15px_rgba(188,19,254,0.5)] transition-shadow"></div>
          <Shield className="w-8 h-8 text-neon-purple mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Prywatność i Kontrola</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Dodawaj znajomych, zatwierdzaj prośby i komunikuj się w zamkniętych kanałach. Masz pełną kontrolę nad swoim profilem i listą kontaktów.
          </p>
        </div>

        <div className="bg-surface border border-gray-800 rounded-2xl p-6 relative overflow-hidden group hover:border-gray-600 transition-colors">
          <div className="absolute top-0 left-0 w-1 h-full bg-gray-400 group-hover:shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-shadow"></div>
          <Users className="w-8 h-8 text-white mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">Społeczność</h3>
          <p className="text-gray-400 text-sm leading-relaxed">
            Dziel się swoimi przemyśleniami z całym systemem, zbieraj polubienia, twórz wątki i rozmawiaj bezpośrednio z interesującymi węzłami.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-gray-800 rounded-2xl p-8 mt-12 text-center text-gray-300 font-mono text-sm leading-loose">
        <p>WERSJA SYSTEMU: v1.0.0</p>
        <p>STATUS PROTOKOŁU: ZABEZPIECZONY</p>
        <p>MODUŁY: AUTORYZACJA, GŁÓWNY_STRUMIEŃ, PRYWATNE_KANAŁY</p>
      </div>
    </div>
  );
}
