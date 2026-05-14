import { HashRouter, Routes, Route } from 'react-router-dom';
// Zaimportuj swoje komponenty (AI Studio mogło je nazwać inaczej, sprawdź nazwy plików w src/components)
// np. import Home from './pages/Home';

function App() {
  return (
    <HashRouter>
      <Routes>
        {/* Path="/" oznacza teraz stronę główną, a HashRouter sam zadba o /Texta/ */}
        <Route path="/" element={<HomeComponent />} /> 
        {/* Jeśli masz inne strony, dodaj je tutaj */}
      </Routes>
    </HashRouter>
  );
}

// Jeśli nie masz osobnych plików, AI Studio mogło napisać treść tutaj:
function HomeComponent() {
  return (
    <div>
      <h1>Strona załadowana!</h1>
      {/* Tutaj powinna być reszta Twojego kodu strony */}
    </div>
  );
}

export default App;
