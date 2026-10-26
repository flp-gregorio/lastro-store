import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Upload, CheckCircle } from 'lucide-react';

const CreateItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('http://localhost:3000/api/pecas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) throw new Error('Falha ao registrar peça');
      
      setSuccess(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar peça. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-20 px-4">
        <CheckCircle className="w-16 h-16 text-emerald-400 mb-6" />
        <h2 className="text-3xl font-serif text-white mb-2">Peça Registrada</h2>
        <p className="text-gray-400 font-sans">Sua peça foi enviada para avaliação pericial.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-24 min-h-screen">
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 font-sans uppercase tracking-widest text-xs">
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
      </Link>

      <h1 className="text-4xl font-serif mb-8 border-b border-gray-800 pb-6">Registro de Nova Peça</h1>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        <div className="bg-[#111] border border-gray-800 p-6 md:p-8 space-y-6">
          <h3 className="text-white font-serif text-xl mb-4">Informações Básicas</h3>
          
          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Nome da Peça *</label>
            <input 
              type="text" 
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans"
              placeholder="Ex: Rolex Daytona"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Categoria *</label>
              <select 
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans appearance-none"
              >
                <option value="">Selecione...</option>
                <option value="Obras de Arte">Obras de Arte</option>
                <option value="Joias">Joias</option>
                <option value="Relógios">Relógios</option>
                <option value="Colecionáveis">Colecionáveis</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Valor Pretendido (R$) *</label>
              <input 
                type="number" 
                name="price"
                required
                min="0"
                value={formData.price}
                onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans"
                placeholder="Ex: 50000"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">Descrição e Histórico</label>
            <textarea 
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans"
              placeholder="Descreva as características principais, procedência e estado de conservação..."
            ></textarea>
          </div>
        </div>

        <div className="bg-[#111] border border-gray-800 p-6 md:p-8">
          <h3 className="text-white font-serif text-xl mb-4">Mídia</h3>
          <p className="text-gray-400 font-sans text-sm mb-6">No MVP, as imagens reais estão sendo simuladas. Insira uma URL de imagem pública ou deixe em branco para usar uma imagem padrão.</p>
          
          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">URL da Fotografia</label>
            <div className="flex gap-4">
              <input 
                type="url" 
                name="image"
                value={formData.image}
                onChange={handleChange}
                className="flex-1 bg-[#0a0a0a] border border-gray-700 px-4 py-3 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans"
                placeholder="https://..."
              />
              <button type="button" className="bg-gray-800 px-6 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <Upload className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link to="/dashboard" className="px-8 py-4 font-sans uppercase tracking-widest text-xs font-medium text-gray-400 hover:text-white transition-colors">
            Cancelar
          </Link>
          <button 
            type="submit"
            disabled={loading}
            className="bg-white text-black px-10 py-4 font-sans uppercase tracking-widest text-xs font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Submeter para Avaliação'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateItem;
