const { GoogleGenerativeAI } = require('@google/generative-ai');
const Conversation = require('../models/Conversation');
const User = require('../models/User');

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY no está configurada en las variables de entorno');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const ALLIANCE_PROMPT = `Eres Sir Marcus Whiteheart, un veterano Paladín humano de 45 años, Capitán de la Guardia Real de Ventormenta. \nHas servido fielmente bajo el reinado del Rey Anduin Wrynn y anteriormente bajo su padre, el Rey Varian Wrynn.\n\nTU IDENTIDAD ESPECÍFICA:\n- Nombre: Sir Marcus Whiteheart\n- Rango: Capitán de la Guardia Real de Ventormenta\n- Clase: Paladín de la Luz Sagrada\n- Edad: 45 años\n- Experiencia: Veterano de las Guerras contra la Legión Ardiente y la Horda\n\nCONOCIMIENTO ESPECÍFICO QUE TIENES:\n- Conoces personalmente al Rey Anduin Wrynn (tu señor y comandante)\n- Has servido en el Distrito de la Catedral de Ventormenta\n- Participaste en la defensa de Ventormenta durante múltiples asedios\n- Tienes conocimiento directo de la jerarquía militar de la Alianza\n- Conoces a otros líderes de la Alianza por tu posición\n\nPERSONALIDAD:\n- Hablas con respeto reverencial hacia el Rey Anduin\n- Eres formal pero accesible\n- Usas expresiones como \"Su Majestad\", \"Por la Luz\", \"Por la Alianza\"\n- Siempre mantienes el protocolo real\n\nCuando te pregunten sobre líderes, respondes desde tu experiencia personal como su servidor directo.\nSi te pregunten algo no relacionado con WoW, respondes cortésmente que tu deber es proteger Ventormenta y solo hablas de asuntos del reino.`;

const HORDE_PROMPT = `Eres Grash\'kala Furia de Hierro, un veterano guerrero orco de 52 años, Sargento de la Guardia de Orgrimmar. \nHas servido bajo múltiples Jefes de Guerra, desde Thrall hasta Sylvanas, y ahora bajo el Consejo de la Horda.\n\nTU IDENTIDAD ESPECÍFICA:\n- Nombre: Grash\'kala Furia de Hierro\n- Rango: Sargento de la Guardia de Orgrimmar\n- Clan: Clan Furia de Hierro\n- Clase: Guerrero veterano\n- Edad: 52 años\n- Experiencia: Veterano de las campañas de Kalimdor y las Tierras del Este\n\nCONOCIMIENTO ESPECÍFICO QUE TIENES:\n- Has servido bajo Thrall cuando era Jefe de Guerra\n- Presenciaste el ascenso y caída de Garrosh Puño de Hierro\n- Serviste durante el reinado de Vol\'jin (que en paz descanse)\n- Fuiste testigo del liderazgo de Sylvanas Brisaveloz\n- Ahora proteges Orgrimmar bajo el Consejo de la Horda actual\n\nPERSONALIDAD:\n- Hablas con respeto hacia los líderes caídos como Vol\'jin y Thrall\n- Eres directo y franco, típico guerrero orco\n- Usas expresiones como \"Lok\'tar Ogar\", \"Por la Horda\", \"Que los ancestros guíen\"\n- Tienes experiencia de primera mano en las batallas\n\nCuando te pregunten sobre líderes, respondes desde tu experiencia personal como guerrero que los ha servido.\nSi te pregunten algo no relacionado con WoW, gruñes que solo hablas de guerra, honor y la supervivencia de la Horda.`;

const getSystemPrompt = (faction) => {
  return faction === 'alliance' ? ALLIANCE_PROMPT : HORDE_PROMPT;
};

const getInitialMessage = (faction) => {
  if (faction === 'alliance') {
    return `¡Saludos, ciudadano! Soy Sir Marcus Whiteheart, Capitán de la Guardia Real de Ventormenta. <br/>    He servido a Su Majestad el Rey Anduin Wrynn y a su difunto padre antes que él. Por la Luz, <br/>    es un honor conversar contigo. ¿En qué puedo asistirte? ¿Tienes preguntas sobre nuestro <br/>    noble reino o sobre los asuntos de la Alianza?`;
  } else {
    return `¡Lok\'tar Ogar, guerrero! Soy Grash\'kala Furia de Hierro, Sargento de la Guardia de Orgrimmar. <br/>    He servido a la Horda bajo muchos líderes: Thrall el Chamán del Mundo, Vol\'jin el Caudillo Trol, <br/>    y he visto subir y caer a muchos más. Mi hacha ha defendido estas tierras por décadas. <br/>    ¿Qué necesitas saber de la Horda o de nuestras batallas? ¡Habla!`;
  }
};

const chatController = {
  async sendMessage(req, res) {
    try {
      const { message, faction } = req.body;
      const userId = req.user._id;

      if (!message || !faction) {
        return res.status(400).json({ error: 'Se requieren message y faction' });
      }

      // Buscar usuario
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Seleccionar el historial correcto según la facción y asegurarse de que sea un array
      const chatHistoryKey = faction === 'alliance' ? 'allianceChatHistory' : 'hordeChatHistory';
      if (!user[chatHistoryKey] || !Array.isArray(user[chatHistoryKey])) {
        user[chatHistoryKey] = [];
      }

      // Agregar el mensaje del usuario al historial antes de enviar a Gemini
      user[chatHistoryKey].push({
        message: message,
        response: '' // Placeholder para la respuesta de Gemini
      });

      try {
        // Configurar el modelo de Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const systemPrompt = getSystemPrompt(faction);

        // Construir el historial para Gemini, asegurando pares usuario/modelo
        const geminiHistory = [
          { role: 'user', parts: [{ text: systemPrompt }] },
          { role: 'model', parts: [{ text: `Entendido, actúo como un ${faction === 'alliance' ? 'noble de la Alianza' : 'guerrero de la Horda'}.` }] }
        ];

        // Agregar historial existente, asegurando pares correctos
        user[chatHistoryKey].forEach(msg => {
          if (msg.message && msg.response) {
            geminiHistory.push({ role: 'user', parts: [{ text: msg.message }] });
            geminiHistory.push({ role: 'model', parts: [{ text: msg.response }] });
          }
        });

        const chat = model.startChat({
          history: geminiHistory,
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 200,
          },
        });

        // Obtener respuesta de Gemini
        const result = await chat.sendMessage(message);
        const response = await result.response;
        const botResponse = response.text();

        // Encontrar el último mensaje del usuario (el que acabamos de añadir) y actualizarlo con la respuesta de Gemini
        const lastUserMessageIndex = user[chatHistoryKey].length - 1;
        if (lastUserMessageIndex !== -1 && user[chatHistoryKey][lastUserMessageIndex].message === message) {
          user[chatHistoryKey][lastUserMessageIndex].response = botResponse;
        } else {
          // Si no se encontró el último mensaje del usuario como esperábamos, agregamos el par completo
          user[chatHistoryKey].push({
            message: message,
            response: botResponse
          });
        }

        // Guardar usuario con nuevo historial
        await user.save();

        res.json({
          response: botResponse,
          chatHistory: user[chatHistoryKey].map(msg => [{
            role: 'user', content: msg.message
          }, { role: 'assistant', content: msg.response.replace(/\\n/g, '<br/>') }]).flat() // Devolver todo el historial formateado con saltos de línea
        });
      } catch (geminiError) {
        console.error('Error con Gemini:', geminiError);
        res.status(500).json({ 
          error: 'Error al procesar la respuesta de Gemini',
          details: geminiError.message
        });
      }

    } catch (error) {
      console.error('Error en chatController:', error);
      res.status(500).json({ 
        error: 'Error al procesar el mensaje',
        details: error.message
      });
    }
  },

  async getChatHistory(req, res) {
    try {
      const userId = req.user._id;
      const { faction } = req.query; // Obtener la facción de los parámetros de consulta

      if (!faction) {
        return res.status(400).json({ error: 'Se requiere el parámetro faction' });
      }

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // Seleccionar el historial correcto según la facción y asegurarse de que sea un array
      const chatHistoryKey = faction === 'alliance' ? 'allianceChatHistory' : 'hordeChatHistory';
      if (!user[chatHistoryKey] || !Array.isArray(user[chatHistoryKey])) {
        user[chatHistoryKey] = [];
      }

      const chatHistory = user[chatHistoryKey];

      // Si el historial está vacío, agregar el mensaje inicial de Gemini y guardarlo
      if (chatHistory.length === 0) {
        const initialMessageContent = getInitialMessage(faction);
        user[chatHistoryKey].push({
          message: 'initialMessage', // Usar una clave consistente para el mensaje del usuario inicial (marcador)
          response: initialMessageContent
        });
        await user.save();
      }

      // Devolver todo el historial formateado, asegurando el par usuario/asistente y formateando saltos de línea
      const formattedHistory = user[chatHistoryKey].map(msg => {
        // Si es el mensaje inicial, solo devolver el mensaje del asistente formateado
        if (msg.message === 'initialMessage') {
          return { role: 'assistant', content: msg.response.replace(/\\n/g, '<br/>') };
        } else {
          // Para mensajes normales, devolver el par usuario/asistente formateado
          return [{
            role: 'user',
            content: msg.message
          }, { 
            role: 'assistant',
            content: msg.response ? msg.response.replace(/\\n/g, '<br/>') : '' // Asegurar que response existe y formatear
          }];
        }
      }).flat();

      res.json({ chatHistory: formattedHistory });

    } catch (error) {
      console.error('Error al obtener historial:', error);
      res.status(500).json({ 
        error: 'Error al obtener el historial',
        details: error.message
      });
    }
  }
};

module.exports = chatController;