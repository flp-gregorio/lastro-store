import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import ItemDetails from './pages/ItemDetails';
import Auth from './pages/Auth';
import Landing from './pages/Landing';
import Dashboard from './pages/Dashboard';
import CreateItem from './pages/CreateItem';
import Passaporte from './pages/Passaporte';
import Wishlist from './pages/Wishlist';
import Lembretes from './pages/Lembretes';
import Notificacoes from './pages/Notificacoes';

const App = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-200 flex flex-col">
      <Navbar />
      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/catalogo" element={<Catalog />} />
          <Route path="/peca/:id" element={<ItemDetails />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/nova-peca" element={<CreateItem />} />
          {/* RF01, RF02, RF04 — Consulta pública do Passaporte Digital por link ou QR Code */}
          <Route path="/passaporte/:identifier" element={<Passaporte />} />

          {/* Seção 3.3 · Hábito (investimento, alertas e lembretes) */}
          <Route path="/wishlist" element={<Wishlist />} />              {/* RF06 */}
          <Route path="/lembretes" element={<Lembretes />} />           {/* RF09 */}
          <Route path="/notificacoes" element={<Notificacoes />} />     {/* RF14 */}
        </Routes>
      </main>
    </div>
  );
};

export default App;
