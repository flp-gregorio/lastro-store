import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Upload, 
  CheckCircle2, 
  Link2, 
  Image as ImageIcon, 
  X, 
  FileCheck2,
  Clock,
  ShieldAlert,
  SendHorizontal
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
  const [submitted, setSubmitted] = useState(false);
  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [imagePreview, setImagePreview] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    price: '',
    description: '',
    image: '',
    provenance: '',
    ownerConservationNotes: 'Excelente'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '');
    setFormData((prev) => ({ ...prev, price: raw }));
  };

  const formatDisplayPrice = (val) => {
    if (!val) return '';
    return Number(val).toLocaleString('pt-BR');
  };

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

    // DRE v2.0: Submetido para perícia e curadoria da equipe Lastro.
    // O passaporte NÃO é emitido pelo usuário. Fica em status "em revisão" e expert "Aguardando perícia credenciada".
    const payload = {
      name: formData.name.trim(),
      category: formData.category,
      price: numericPrice,
      description: formData.description.trim(),
      image: finalImage,
      provenance: formData.provenance.trim() || 'Não informado pelo solicitante',
      conservationState: formData.ownerConservationNotes,
      status: 'em revisão',
      expertName: 'Aguardando atribuição de perito credenciado',
      expertDate: 'Pendente de laudo',
      isPublished: false,
      history: [
        {
          date: String(new Date().getFullYear()),
          title: 'Submissão de Dossiê para Curadoria',
          details: 'Peça submetida pelo proprietário para conferência documental e perícia técnica.',
          verifiedBy: 'Triagem Lastro'
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
        throw new Error(errorData.message || 'Falha ao submeter peça');
      }

      setSubmitted(true);
    } catch (error) {
      console.error(error);
      alert(`Erro ao submeter proposta: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center pt-24 pb-20 px-4 bg-[#0a0a0a]">
        <div className="max-w-lg w-full bg-[#111] border border-[#2a2a2a] p-8 md:p-10 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full border border-[#A69076]/40 bg-[#A69076]/10 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-[#A69076]" />
          </div>

          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#A69076] font-sans block mb-1">
              Dossiê Enviado com Sucesso
            </span>
            <h2 className="text-2xl md:text-3xl font-serif text-white mb-3">Submetido à Curadoria</h2>
            <p className="text-gray-400 font-sans text-xs leading-relaxed">
              Sua peça foi recebida e encaminhada para o corpo de <strong>peritos credenciados Lastro</strong>. 
              Após análise física e documental, o laudo pericial será concluído e o Passaporte Digital emitido.
            </p>
          </div>

          <div className="bg-[#161616] border border-[#222] p-4 text-left space-y-2 font-sans text-xs">
            <div className="flex items-center gap-2 text-gray-300 font-medium">
              <FileCheck2 className="w-4 h-4 text-[#A69076]" /> Próximas etapas:
            </div>
            <ul className="text-gray-400 text-[11px] space-y-1.5 pl-6 list-disc">
              <li>Triagem preliminar de procedência pela equipe Lastro (até 48h).</li>
              <li>Atribuição de perito especializado no nicho da peça.</li>
              <li>Emissão do laudo técnico com assinatura digital imutável.</li>
            </ul>
          </div>

          <div className="pt-2">
            <Link
              to="/dashboard"
              className="w-full flex items-center justify-center gap-2 bg-white text-black py-3.5 px-6 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-gray-200 transition-colors"
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
      {/* Breadcrumb */}
      <Link 
        to="/dashboard" 
        className="inline-flex items-center gap-2 text-gray-400 hover:text-[#A69076] transition-colors mb-8 font-sans uppercase tracking-widest text-xs"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar ao Painel
      </Link>

      <div className="mb-10 border-b border-[#1e1e1e] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.25em] text-[#A69076] font-sans block mb-1">
            Curadoria & Dossiê
          </span>
          <h1 className="text-3xl md:text-5xl font-serif text-white">Submissão de Peça</h1>
        </div>
        <p className="text-gray-500 font-sans text-xs max-w-sm">
          Envie os dados da sua peça para análise pericial. O Passaporte Digital é emitido exclusivamente após avaliação de perito credenciado.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-10">
        
        {/* Card 1: Informações Básicas */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-[#1e1e1e] pb-4">
            <h3 className="text-white font-serif text-lg">Informações Principais da Peça</h3>
            <p className="text-gray-500 font-sans text-xs mt-1">Identificação inicial do objeto para abertura do processo de curadoria.</p>
          </div>
          
          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Nome ou Título da Peça *
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

            {/* Valor estimado sem setas */}
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Expectativa de Avaliação (R$) *
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
              placeholder="Descreva as características conhecidas, histórico com o proprietário atual e particularidades relevantes..."
            />
          </div>
        </div>

        {/* Card 2: Fotografia / Mídia */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="flex items-center justify-between border-b border-[#1e1e1e] pb-4">
            <div>
              <h3 className="text-white font-serif text-lg">Registros Fotográficos</h3>
              <p className="text-gray-500 font-sans text-xs mt-1">Fotos nítidas auxiliam a triagem da curadoria.</p>
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
                <Link2 className="w-3 h-3" /> Link Web
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
                    Selecione a foto principal do item no seu computador
                  </p>
                  <p className="text-xs font-sans text-gray-500">
                    Formatos: PNG, JPG, JPEG, WEBP (fotos adicionais podem ser solicitadas na perícia)
                  </p>
                </label>
              ) : null}
            </div>
          )}

          {/* URL Mode */}
          {imageMode === 'url' && (
            <div>
              <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
                Link Público da Imagem
              </label>
              <div className="relative">
                <input 
                  type="url" 
                  value={formData.image.startsWith('data:') ? '' : formData.image}
                  onChange={handleUrlChange}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] pl-10 pr-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
                  placeholder="https://exemplo.com/foto-da-peca.jpg"
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
                  <p className="text-xs font-sans text-gray-300 font-medium">Registro visual anexado</p>
                  <p className="text-[10px] font-sans text-emerald-400 uppercase tracking-widest mt-0.5">
                    Pronto para conferência da curadoria
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

        {/* Card 3: Declaração de Procedência pelo Solicitante */}
        <div className="bg-[#111] border border-[#1e1e1e] p-6 md:p-8 space-y-6 shadow-xl">
          <div className="border-b border-[#1e1e1e] pb-4">
            <h3 className="text-white font-serif text-lg">Declaração de Procedência do Solicitante</h3>
            <p className="text-gray-500 font-sans text-xs mt-1">
              Informe a origem conhecida da peça. O laudo técnico e as notas de conservação oficiais serão determinados pelo perito designado pela Lastro.
            </p>
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Estado Aparente Informado pelo Solicitante
            </label>
            <select
              name="ownerConservationNotes"
              value={formData.ownerConservationNotes}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm cursor-pointer"
            >
              <option value="Excelente">Aparentemente Excelente (sem desgastes visíveis)</option>
              <option value="Muito Bom">Muito Bom (sinais leves de uso)</option>
              <option value="Bom">Bom (necessita de limpeza ou revisão estética)</option>
              <option value="Regular">Regular (requer eventual restauro pericial)</option>
            </select>
            <p className="text-[11px] text-gray-600 font-sans mt-2">
              * Nota: A escala oficial e a nota técnica final (1 a 5) são atribuição exclusiva do laudo pericial.
            </p>
          </div>

          <div>
            <label className="block text-gray-400 font-sans text-xs tracking-widest uppercase mb-2">
              Origem e Documentos Disponíveis
            </label>
            <input 
              type="text"
              name="provenance"
              value={formData.provenance}
              onChange={handleChange}
              className="w-full bg-[#0a0a0a] border border-[#2a2a2a] px-4 py-3.5 text-white focus:outline-none focus:border-[#A69076] transition-colors font-sans text-sm placeholder:text-gray-600"
              placeholder="Ex: Adquirido em galeria/boutique oficial em 2022. Possui certificado e recibo original."
            />
          </div>

          {/* Aviso sobre processo de curadoria */}
          <div className="border border-[#2a2a2a] bg-[#0d0d0d] p-4 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-[#A69076] shrink-0 mt-0.5" />
            <div className="font-sans text-xs text-gray-400 leading-relaxed">
              <strong className="text-gray-200">Garantia do Padrão Lastro:</strong> O Passaporte Digital só é emitido após conferência física e documental realizada por perito credenciado e homologação da curadoria.
            </div>
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
            className="w-full sm:w-auto bg-[#A69076] text-black px-12 py-4 font-sans uppercase tracking-widest text-xs font-semibold hover:bg-[#b8a287] transition-colors disabled:opacity-50 cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <SendHorizontal className="w-4 h-4" />
            {loading ? 'Enviando Dossiê...' : 'Submeter Peça à Curadoria Lastro'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateItem;
