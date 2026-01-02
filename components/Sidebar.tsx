
import React, { useState, useEffect, useRef } from 'react';
import { ParkingSpot, DataSource } from '../types';
import { Navigation, Accessibility, X, MessageSquare, Send, MapPin, Search, Upload, Database, Trash2, Share2, Smartphone, Info } from 'lucide-react';
import { generateParkingAdvice } from '../services/geminiService';

interface SidebarProps {
  selectedSpot: ParkingSpot | null;
  allSpots: ParkingSpot[];
  onClose: () => void;
  onSelectSpot: (spot: ParkingSpot) => void;
  onUploadFile: (file: File) => void;
  dataSource: DataSource;
  onClearCache: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ selectedSpot, allSpots, onClose, onSelectSpot, onUploadFile, dataSource, onClearCache }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'chat' | 'list'>('list');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai'; text: string }[]>([
    { role: 'ai', text: '¡Hola! Soy tu asistente de movilidad en Vitoria. ¿En qué puedo ayudarte hoy? Puedo buscar plazas por calle o darte consejos sobre la tarjeta azul.' }
  ]);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedSpot) {
      setActiveTab('details');
    }
  }, [selectedSpot]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activeTab]);

  const handleGetDirections = () => {
    if (!selectedSpot) return;
    const [lat, lng] = selectedSpot.coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  const handleWhatsApp = () => {
    if (!selectedSpot) return;
    const [lat, lng] = selectedSpot.coordinates;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const text = `Aparcamiento PMR en Vitoria:\n📍 ${selectedSpot.name}\n🗺️ Ver en Google Maps: ${mapUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handleShare = async () => {
    if (!selectedSpot) return;
    const [lat, lng] = selectedSpot.coordinates;
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    const shareData = {
        title: 'Aparcamiento PMR Vitoria',
        text: `📍 ${selectedSpot.name}`,
        url: mapUrl
    };

    if (navigator.share) {
        try {
            await navigator.share(shareData);
        } catch (err) {
            console.log('Error compartiendo:', err);
        }
    } else {
         navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
         alert('Enlace copiado al portapapeles. ¡Ya puedes pegarlo donde quieras!');
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoadingAi(true);

    const context = selectedSpot 
      ? `El usuario tiene seleccionada la plaza en la calle: ${selectedSpot.name}. Sus coordenadas son: ${selectedSpot.coordinates.join(', ')}. Propiedades adicionales: ${JSON.stringify(selectedSpot.properties)}.`
      : `El usuario está viendo la lista general de ${allSpots.length} aparcamientos PMR en Vitoria-Gasteiz.`;

    const response = await generateParkingAdvice(userMsg, context);

    setChatHistory(prev => [...prev, { role: 'ai', text: response }]);
    setIsLoadingAi(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
    }
  };

  const filteredSpots = allSpots.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSourceLabel = () => {
    switch (dataSource) {
      case 'server': return { text: 'Servidor', color: 'bg-green-100 text-green-700' };
      case 'local': return { text: 'Memoria Local', color: 'bg-blue-100 text-blue-700' };
      case 'sample': return { text: 'Modo Demo', color: 'bg-amber-100 text-amber-700' };
      default: return { text: 'Cargando...', color: 'bg-gray-100 text-gray-500' };
    }
  };

  const sourceInfo = getSourceLabel();

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-96 bg-white shadow-2xl z-20 flex flex-col border-r border-gray-200 transform transition-transform duration-300">
      {/* Header */}
      <div className="p-4 bg-slate-900 text-white flex justify-between items-start shrink-0">
        <div>
          <div className="flex items-center gap-2 font-bold text-lg">
            <Accessibility className="text-blue-400" />
            <span>Parking PMR Vitoria</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
             <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${sourceInfo.color}`}>
               {sourceInfo.text}
             </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
           {dataSource === 'local' && (
             <button
               onClick={onClearCache}
               className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-red-400"
               title="Borrar datos guardados"
             >
               <Trash2 size={18} />
             </button>
           )}
           <button 
             onClick={() => fileInputRef.current?.click()}
             className="p-2 hover:bg-slate-700 rounded-lg transition-colors text-slate-300 hover:text-white"
             title="Cargar GeoJSON"
           >
             <Upload size={18} />
           </button>
           <input 
             type="file" 
             ref={fileInputRef} 
             className="hidden" 
             accept=".geojson,.json" 
             onChange={handleFileChange}
           />
           <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-full transition-colors md:hidden">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 shrink-0 bg-gray-50">
        <button 
          onClick={() => setActiveTab('list')}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 border-b-2 transition-all ${activeTab === 'list' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <Search size={16} /> LISTA
        </button>
        <button 
          onClick={() => setActiveTab('details')}
          disabled={!selectedSpot}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 border-b-2 transition-all ${activeTab === 'details' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'} ${!selectedSpot ? 'opacity-30 cursor-not-allowed' : ''}`}
        >
          <MapPin size={16} /> INFO
        </button>
        <button 
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-bold flex justify-center items-center gap-2 border-b-2 transition-all ${activeTab === 'chat' ? 'text-blue-600 border-blue-600 bg-white' : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-100'}`}
        >
          <MessageSquare size={16} /> ASISTENTE
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 relative">
        
        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div className="p-4 space-y-4">
             <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Buscar calle o zona..." 
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none shadow-sm transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
             </div>
             
             {dataSource === 'sample' && (
               <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 flex flex-col gap-2 shadow-sm">
                 <div className="flex items-center gap-2 font-bold text-sm">
                    <Info size={16} /> <span>Aviso: Modo Demostración</span>
                 </div>
                 <p>No se han encontrado datos en el servidor ni en tu navegador.</p>
                 <button 
                   onClick={() => fileInputRef.current?.click()}
                   className="mt-2 bg-amber-200 hover:bg-amber-300 text-amber-900 py-2 px-3 rounded-lg transition-all text-center font-bold"
                 >
                   Cargar mi archivo GeoJSON
                 </button>
               </div>
             )}

             <div className="space-y-2">
               {filteredSpots.length === 0 ? (
                 <div className="text-center py-10">
                    <MapPin className="mx-auto text-gray-300 mb-2" size={40} />
                    <p className="text-gray-500">No se encontraron plazas.</p>
                 </div>
               ) : (
                 filteredSpots.map(spot => (
                   <button 
                    key={spot.id}
                    onClick={() => onSelectSpot(spot)}
                    className={`w-full text-left p-4 rounded-xl shadow-sm border transition-all flex items-center justify-between group ${selectedSpot?.id === spot.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-500' : 'bg-white border-gray-100 hover:border-blue-300 hover:shadow-md'}`}
                   >
                     <div className="flex-1 min-w-0 pr-2">
                       <span className={`block font-bold text-sm truncate ${selectedSpot?.id === spot.id ? 'text-blue-700' : 'text-slate-700 group-hover:text-blue-600'}`}>
                         {spot.name}
                       </span>
                       <span className="text-[10px] text-gray-400 uppercase font-semibold">Vitoria-Gasteiz</span>
                     </div>
                     <Navigation size={18} className={`${selectedSpot?.id === spot.id ? 'text-blue-500' : 'text-gray-300 group-hover:text-blue-400'}`} />
                   </button>
                 ))
               )}
             </div>
          </div>
        )}

        {/* DETAILS TAB */}
        {activeTab === 'details' && selectedSpot && (
          <div className="p-6 flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-xl font-black text-slate-800 mb-2 leading-tight">{selectedSpot.name}</h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400 mb-6">
                <span className="bg-blue-600 text-white px-2 py-1 rounded font-black tracking-tighter">PMR</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded font-mono">
                  {selectedSpot.coordinates[0].toFixed(5)}, {selectedSpot.coordinates[1].toFixed(5)}
                </span>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Atributos del Mapa</h3>
                <div className="grid grid-cols-1 gap-2">
                  {Object.entries(selectedSpot.properties).map(([key, value]) => {
                    if (['NOMBRE','Nombre','name','type','geometry','objectid','FID'].includes(key) || typeof value === 'object') return null;
                    return (
                      <div key={key} className="flex flex-col bg-slate-50 p-2 rounded-lg border border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase">{key}</span>
                        <span className="text-sm text-slate-700 font-medium">{String(value) || 'No disponible'}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleGetDirections}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-3 font-black text-lg group"
              >
                <Navigation size={24} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                ABRIR EN GPS
              </button>

              <div className="grid grid-cols-2 gap-3">
                 <button 
                    onClick={handleWhatsApp}
                    className="py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg shadow-green-500/10 transition-all flex flex-col items-center justify-center gap-1 font-bold text-xs"
                  >
                    <Smartphone size={20} />
                    ENVIAR A MÓVIL
                  </button>
                  <button 
                    onClick={handleShare}
                    className="py-3.5 bg-slate-800 hover:bg-black text-white rounded-2xl shadow-lg transition-all flex flex-col items-center justify-center gap-1 font-bold text-xs"
                  >
                    <Share2 size={20} />
                    COMPARTIR
                  </button>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
               <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
               <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                 Pulsa <b>'Enviar a móvil'</b> para abrir WhatsApp y enviarte la ubicación exacta directamente a tu teléfono para empezar la ruta.
               </p>
            </div>
          </div>
        )}

        {/* CHAT TAB */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full bg-slate-50">
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {chatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm ${
                    msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-none' 
                    : 'bg-white border border-gray-200 text-gray-700 rounded-bl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoadingAi && (
                 <div className="flex justify-start">
                    <div className="bg-white border border-gray-100 rounded-2xl p-4 rounded-bl-none flex gap-1.5 items-center shadow-sm">
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                 </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <div className="p-4 bg-white border-t border-gray-200 shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ej: ¿Hay plazas cerca de El Corte Inglés?"
                  className="flex-1 bg-gray-100 border-none rounded-2xl px-5 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  disabled={isLoadingAi}
                />
                <button 
                  onClick={handleSendMessage}
                  disabled={isLoadingAi || !chatInput.trim()}
                  className="p-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                  <Send size={20} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
