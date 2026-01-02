import React from 'react';
import { UploadCloud, FileJson } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (data: any) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text === 'string') {
          const json = JSON.parse(text);
          onFileLoaded(json);
        }
      } catch (err) {
        alert("Error al leer el archivo. Asegúrate de que es un JSON válido.");
        console.error(err);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="max-w-lg w-full bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8 text-center shadow-2xl">
        <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <UploadCloud className="text-blue-400" size={40} />
        </div>
        
        <h1 className="text-3xl font-bold text-white mb-2">Cargar Mapa PMR</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Selecciona el archivo GeoJSON de 
          <span className="text-blue-400 font-semibold mx-1">Aparcamientos de Movilidad Reducida</span> 
          para visualizar las plazas en el mapa.
        </p>

        <label className="group relative flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-slate-600 rounded-xl hover:border-blue-500 hover:bg-slate-800/50 transition-all cursor-pointer">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <FileJson className="w-10 h-10 text-slate-500 group-hover:text-blue-400 mb-3 transition-colors" />
            <p className="mb-2 text-sm text-slate-400 group-hover:text-white transition-colors">
              <span className="font-semibold">Haz clic para subir</span> o arrastra el archivo
            </p>
            <p className="text-xs text-slate-500">Formato .geojson soportado</p>
          </div>
          <input 
            type="file" 
            accept=".geojson,.json" 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>

        <div className="mt-8 text-xs text-slate-500">
          Tus datos se procesan localmente en el navegador.
        </div>
      </div>
    </div>
  );
};

export default FileUploader;