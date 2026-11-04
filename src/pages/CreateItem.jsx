import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle, 
  Link2, 
  Image as ImageIcon, 
  X, 
  Sparkles,
  ShieldCheck,
  FileText
} from 'lucide-react';

const CATEGORIES = [
  'Arte',
  'Colecionáveis',
  'Mobiliário',
  'Relógios',
  'Automotivo',
  'Joias',
  'Diversos'
];

const CreateItem = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdPassportUrl, setCreatedPassportUrl] = useState('');
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imagePreview, setImagePreview] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: '',
    provenance: '',
    conservationState: 'Excelente',
    expertName: 'Perito Lastro Credenciado'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    // Only allow digits or empty string to ensure clean format without spin arrows
    const raw = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, price: raw }));
  };

  const formatDisplayPrice = (val) => {
    if (!val) return '';
    return Number(val).toLocaleString('pt-BR');
  };

  // Local file upload handling via FileReader (Base64 data URL)
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione um arquivo de imagem válido (PNG, JPEG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setImagePreview(base64String);
      setFormData((prev) => ({ ...prev, image: base64String }));
    };
    reader.readAsDataURL(file);
  };

  const handleUrlChange = (e) => {
    const url = e.target.value;
    setFormData((prev) => ({ ...prev, image: url }));
    setImagePreview(url);
  };

  const clearImage = () => {
    setImagePreview('');
    setFormData((prev) => ({ ...prev, image: '' }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const numericPrice = formData.price ? parseFloat(formData.price) : 0;
    const finalImage = formData.image.trim() || 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?q=80&w=1000&auto=format&fit=crop';

    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      price: numericPrice,
      description: formData.description.trim(),
      image: finalImage,
      provenance: formData.provenance.trim() || 'Acervo particular registrado pelo proprietário.',
      conservationState: formData.conservationState,
      expertName: formData.expertName.trim(),
      expertDate: new Date().toLocaleDateString('pt-BR'),
      history: [
        {
          date: String(new Date().getFullYear()),
          title: 'Registro Inicial no Acervo Lastro',
          details: 'Dossiê submetido pelo proprietário para avaliação e emissão do Passaporte Digital.',
          verifiedBy: 'Equipe Lastro'
        }
      ]
    };

    try {
      const response = await fetch('/api/pecas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao registrar peça');
      }

      const createdItem = await response.json();
      setCreatedPassportUrl(`/passaporte/${createdItem.shareToken || createdItem.passportId}`);
      setSuccess(true);
    } catch (error) {
      console.error(error);
      alert(`Erro ao cadastrar peça: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-4 bg-[#0a0a0a]">
        <div className="max-w-md w-full bg-[#111] border border-[#2a2a2a] p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full border border-emerald-500/40 bg-emerald-500/10 flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>

          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-2">Peça Registrada</h2>
            <p className="text-gray-400 font-sans text-xs leading-relaxed">
              O dossiê foi criado com sucesso e o Passaporte Digital já está disponível para consulta e compartilhamento.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <Link
              to={createdPassportUrl}
              className="w-full flex items-center justify-center gap-2 bg-[#A69076] text-black py-3.5 px-6 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors"
            >
              <FileText className="w-4 h-4" /> Visualizar Passaporte Digital
            </Link>
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 border border-gray-800 text-gray-300 py-3 px-6 font-sans uppercase tracking-widest text-xs hover:border-white transition-colors"
            >
              Voltar ao Painel
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28 min-h-screen bg-[#0a0a0a]">
      {/* Breadcrumb / Back button */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-[#A69076] transition-colors mb-8 font-sans uppercase tracking-widest text-xs"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
      </Link>

      <div className="mb-10 border-b border-[#1e1e1e] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#A69076] font-sans block mb-1">
            Curadoria & Registro
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-white">Nova Peça no Acervo</h1>
        </div>
        <p className="text-gray-500 font-sans text-xs max-w-sm">
          Cadastre as informações da peça para emissão automática do Passaporte Digital imutável.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Card 1: Informações Básicas */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#1e1e1e] pb-4">
            <Sparkles className="w-4 h-4 text-[#A69076]" />
            <h3 className="text-white font-serif text-lg">Informações Principais</h3>
          </div>
          
          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Nome da Peça *
            </label>
            <input 
              type="text" 
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
              placeholder="Ex: Rolex Daytona Cosmograph Ouro Branco 116509"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Categoria *
              </label>
              <select 
                name="category"
                required
                value={formData.category}
                onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm cursor-pointer"
              >
                <option value="" className="text-gray-500">Selecione uma categoria...</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#111] text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Valor pretendido sem setas de rolagem e com formatação elegante */}
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Valor Estimado (R$) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3.5 text-gray-500 font-sans text-sm pointer-events-none select-none">
                  R$
                </span>
                <input 
                  type="text" 
                  inputMode="numeric"
                  name="price"
                  required
                  value={formData.price ? formatDisplayPrice(formData.price) : ''}
                  onChange={handlePriceChange}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] pl-12 pr-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600 font-mono tracking-wider"
                  placeholder="0,00"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Descrição e Detalhes da Obra
            </label>
            <textarea 
              name="description"
              rows="4"
              value={formData.description}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] p-4 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600 leading-relaxed"
              placeholder="Descreva as características técnicas, materiais, dimensões e particularidades que valorizam o item..."
            />
          </div>
        </div>

        {/* Card 2: Fotografia / Mídia com Upload Local ou URL */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-[#A69076]" />
              <h3 className="text-white font-serif text-lg">Fotografia Principal da Peça</h3>
            </div>

            {/* Mode Toggle Buttons */}
            <div className="flex border border-[#2a2a2a] bg-[#0a0a0a] p-0.5">
              <button
                type="button"
                onClick={() => setImageMode('upload')}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-sans transition-colors cursor-pointer flex items-center gap-1.5 ${
                  imageMode === 'upload' 
                    ? 'bg-[#A69076] text-black font-semibold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Upload className="w-3 h-3" /> Arquivo Local
              </button>
              <button
                type="button"
                onClick={() => setImageMode('url')}
                className={`px-3 py-1.5 text-[10px] uppercase tracking-wider font-sans transition-colors cursor-pointer flex items-center gap-1.5 ${
                  imageMode === 'url' 
                    ? 'bg-[#A69076] text-black font-semibold' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Link2 className="w-3 h-3" /> URL Web
              </button>
            </div>
          </div>

          {/* Upload Mode */}
          {imageMode === 'upload' && (
            <div>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              
              {!imagePreview ? (
                <label 
                  htmlFor="file-upload"
                  className="border-2 border-dashed border-[#2a2a2a] hover:border-[#A69076] transition-colors p-8 flex flex-col items-center justify-center cursor-pointer bg-[#0a0a0a]/50 group"
                >
                  <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-gray-400 group-hover:text-[#A69076] transition-colors mb-3">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-sans text-gray-200 mb-1">
                    Clique para selecionar uma imagem do seu computador
                  </p>
                  <p className="text-xs font-sans text-gray-500">
                    Formatos suportados: PNG, JPG, JPEG, WEBP
                  </p>
                </label>
              ) : null}
            </div>
          )}

          {/* URL Mode */}
          {imageMode === 'url' && (
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Endereço Web da Fotografia
              </label>
              <div className="relative">
                <input 
                  type="url" 
                  value={formData.image.startsWith('data:') ? '' : formData.image}
                  onChange={handleUrlChange}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
                  placeholder="https://exemplo.com/foto-alta-resolucao.jpg"
                />
                <Link2 className="w-4 h-4 text-gray-500 absolute left-3.5 top-4" />
              </div>
            </div>
          )}

          {/* Image Preview Area */}
          {imagePreview && (
            <div className="mt-4 border border-[#2a2a2a] p-3 bg-[#0a0a0a] flex items-center justify-between">
              <div className="flex items-center gap-4 overflow-hidden">
                <div className="w-16 h-16 bg-[#111] overflow-hidden shrink-0 border border-[#2a2a2a]">
                  <img 
                    src={imagePreview} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                <div>
                  <p className="text-xs font-sans text-gray-300 font-medium">Fotografia pronta para o dossiê</p>
                  <p className="text-[10px] font-sans text-emerald-400 uppercase tracking-widest mt-0.5">
                    Imagem carregada com sucesso
                  </p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={clearImage}
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors cursor-pointer"
                title="Remover imagem"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Card 3: Dados de Procedência e Perícia (DRE v2.0 - Passaporte) */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center gap-2 border-b border-[#1e1e1e] pb-4">
            <ShieldCheck className="w-4 h-4 text-[#A69076]" />
            <h3 className="text-white font-serif text-lg">Procedência e Estado de Conservação</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Estado de Conservação
              </label>
              <select
                name="conservationState"
                value={formData.conservationState}
                onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm cursor-pointer"
              >
                <option value="Excelente">Excelente (5/5)</option>
                <option value="Como Novo">Como Novo (5/5)</option>
                <option value="Muito Bom">Muito Bom (4/5)</option>
                <option value="Bom">Bom (3/5)</option>
                <option value="Regular">Regular (2/5)</option>
              </select>
            </div>

            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Perito / Avaliador Responsável
              </label>
              <input 
                type="text"
                name="expertName"
                value={formData.expertName}
                onChange={handleChange}
                className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
                placeholder="Ex: Dr. Hans Werner — Swiss Expertise"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Histórico de Procedência
            </label>
            <input 
              type="text"
              name="provenance"
              value={formData.provenance}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
              placeholder="Ex: Adquirido diretamente na boutique oficial. Único proprietário com nota fiscal."
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4 pt-4">
          <Link 
            to="/dashboard" 
            className="w-full sm:w-auto text-center px-8 py-4 font-sans uppercase tracking-widest text-xs font-medium text-gray-400 hover:text-white transition-colors"
          >
            Cancelar
          </Link>
          <button 
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-[#A69076] text-black px-12 py-4 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors disabled:opacity-50 cursor-pointer shadow-lg"
          >
            {loading ? 'Emitindo Passaporte...' : 'Cadastrar Peça & Emitir Passaporte'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateItem;
