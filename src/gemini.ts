import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function searchAttractions(query: string) {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Zoek naar bezienswaardigheden of plekken in Londen of Oxford die overeenkomen met: "${query}". 
      Geef de resultaten terug in JSON formaat met een array genaamd 'results'. 
      Elk object moet hebben: 'name', 'shortDescription', 'address', 'lat' (number), 'lng' (number), 'ticketRequired' (boolean), en optioneel 'bookingUrl' (string, de officiële website om tickets te boeken).`,
      config: {
        tools: [{ googleMaps: {} }],
        // We cannot use responseMimeType with googleMaps tool, so we ask for JSON in the prompt and parse it carefully.
      }
    });

    const text = response.text || '';
    // Try to extract JSON from markdown block if present
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const data = JSON.parse(jsonString);
      return data.results || [];
    } catch (e) {
      console.error("Failed to parse Gemini response as JSON", text);
      return [];
    }
  } catch (error) {
    console.error("Error searching attractions:", error);
    return [];
  }
}

export async function getRouteSteps(destination: string, city: string, originLat?: number, originLng?: number) {
  try {
    let originText = originLat && originLng ? `mijn huidige locatie (coördinaten: ${originLat}, ${originLng})` : `het centrum van ${city}`;
    
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: `Je bent een behulpzame reisassistent. Geef een overzichtelijke, stapsgewijze routebeschrijving (bij voorkeur met openbaar vervoer of lopend) van ${originText} naar de bezienswaardigheid "${destination}" in ${city}. 
      Geef de resultaten terug in strikt JSON formaat met een array genaamd 'steps'. Elk element in de array is een string die één stap van de route beschrijft.`,
      config: {
        tools: [{ googleMaps: {} }],
      }
    });

    const text = response.text || '';
    const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/```\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    
    try {
      const data = JSON.parse(jsonString);
      return data.steps || ["Geen route gevonden."];
    } catch (e) {
      console.error("Failed to parse route JSON", text);
      return ["Kon de routebeschrijving niet verwerken."];
    }
  } catch (error) {
    console.error("Error fetching route steps:", error);
    return ["Kon de routebeschrijving momenteel niet ophalen. Gebruik de 'Route' knop om Google Maps te openen."];
  }
}

export async function chatWithAssistant(history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) {
  try {
    const chat = ai.chats.create({
      model: 'gemini-3.1-pro-preview',
      config: {
        systemInstruction: `Je bent een vriendelijke, behulpzame reisassistent voor een familietrip naar Londen en Oxford. 
        Je helpt met vragen over bezienswaardigheden, routes, openingstijden en tips voor kinderen.
        Geef beknopte, duidelijke antwoorden in het Nederlands. 
        Als iemand naar een route vraagt, geef dan algemene tips voor het openbaar vervoer (zoals de Tube of treinen) in Londen en Oxford.`,
        tools: [{ googleSearch: {} }] // Use search grounding for up-to-date info
      }
    });

    // Send previous history if any (this is a simplified way, ideally we'd use the chat object's history)
    // For simplicity in this stateless function, we just send the new message. 
    // To maintain history properly with the SDK, we should keep the `chat` object around, 
    // but we can also just pass the full conversation as contents to generateContent.
    
    const contents = history.map(h => ({ role: h.role, parts: h.parts })).concat([{ role: 'user', parts: [{ text: message }] }]);

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: contents as any,
      config: {
        systemInstruction: `Je bent een vriendelijke, behulpzame reisassistent voor een familietrip naar Londen en Oxford. 
        Je helpt met vragen over bezienswaardigheden, routes, openingstijden en tips voor kinderen.
        Geef beknopte, duidelijke antwoorden in het Nederlands.`,
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text;
  } catch (error) {
    console.error("Chat error:", error);
    return "Sorry, ik kon even geen verbinding maken. Probeer het later nog eens.";
  }
}
