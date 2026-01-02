import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

// Initialize the Gemini client only if the key exists
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const generateParkingAdvice = async (
  query: string, 
  contextData?: string
): Promise<string> => {
  if (!ai) {
    return "API Key no configurada. Por favor configura la variable de entorno API_KEY.";
  }

  try {
    const modelId = 'gemini-2.5-flash';
    
    let prompt = `Eres un asistente experto en accesibilidad y movilidad urbana en Vitoria-Gasteiz.
    Tu objetivo es ayudar a personas con movilidad reducida (PMR) a encontrar aparcamiento y resolver dudas sobre accesibilidad, normativas de la tarjeta azul o consejos de ubicación.
    Responde de forma concisa, empática y útil.
    
    Pregunta del usuario: "${query}"`;

    if (contextData) {
      prompt += `\n\nContexto sobre el aparcamiento o zona seleccionada: ${contextData}`;
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
    });

    return response.text || "Lo siento, no pude generar una respuesta en este momento.";
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Hubo un error al conectar con el asistente inteligente.";
  }
};