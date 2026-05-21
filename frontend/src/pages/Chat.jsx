import React, { useState, useEffect, useRef } from 'react';
import './chat.css';
import Sidebar from '../components/Sidebar.jsx';
import TranslatedText from '../components/TranslatedText';
import { apiFetch } from '../utils/api';

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [language, setLanguage] = useState('english');
  const [farmerContext, setFarmerContext] = useState(null);
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  const session = (() => {
    try { return JSON.parse(localStorage.getItem('ammachi_session') || '{}'); } catch { return {}; }
  })();

  useEffect(() => {
    // Initialize with welcome message
    setMessages([{
      id: 1,
      text: language === 'malayalam' 
        ? "നമസ്കാരം! ഞാൻ നിങ്ങളുടെ കൃഷി സഖിയാണ്. എങ്ങനെ സഹായിക്കാം?"
        : "Namaste! I'm your Krishi Sakhi (farming companion). How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
      type: 'welcome'
    }]);

    // Fetch farmer context for personalized advice
    fetchFarmerContext();
    
    // Initialize speech recognition
    initializeSpeechRecognition();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Reinitialize speech recognition when language changes
    if (recognitionRef.current) {
      recognitionRef.current.lang = language === 'malayalam' ? 'ml-IN' : 'en-IN';
      console.log(`Speech recognition language updated to: ${language === 'malayalam' ? 'ml-IN' : 'en-IN'}`);
    }
  }, [language]);

  const fetchFarmerContext = async () => {
    if (!session.userId) return;
    
    try {
      const response = await apiFetch(`/api/farmers/${session.userId}/dashboard/`);
      const data = await response.json();
      setFarmerContext(data);
    } catch (error) {
      console.error('Error fetching farmer context:', error);
    }
  };

  const initializeSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = language === 'malayalam' ? 'ml-IN' : 'en-IN';
      recognitionRef.current.maxAlternatives = 1;
      
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognition result:', transcript);
        setInputMessage(transcript);
        setIsListening(false);
      };
      
      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        alert(`Speech recognition error: ${event.error}. Please check microphone permissions.`);
      };
      
      recognitionRef.current.onend = () => {
        console.log('Speech recognition ended');
        setIsListening(false);
      };
      
      recognitionRef.current.onstart = () => {
        console.log('Speech recognition started');
      };
    } else {
      console.error('Speech recognition not supported in this browser');
      alert('Speech recognition is not supported in your browser. Please use Chrome or Edge.');
    }
  };

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setIsListening(true);
        recognitionRef.current.start();
        console.log('Starting speech recognition...');
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
        alert('Could not start speech recognition. Please check microphone permissions.');
      }
    } else {
      alert('Speech recognition not initialized. Please refresh the page.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const speakMessage = (text) => {
    if ('speechSynthesis' in window) {
      // Stop any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = language === 'malayalam' ? 'ml-IN' : 'en-IN';
      utterance.rate = 0.8; // Slightly slower for better clarity
      utterance.pitch = 1;
      utterance.volume = 0.9;
      
      utterance.onstart = () => {
        console.log('Started speaking:', text.substring(0, 50) + '...');
      };
      
      utterance.onend = () => {
        console.log('Finished speaking');
      };
      
      utterance.onerror = (event) => {
        console.error('Speech synthesis error:', event.error);
      };
      
      speechSynthesis.speak(utterance);
    } else {
      alert('Text-to-speech is not supported in your browser.');
    }
  };

  const generatePersonalizedPromptSystem = () => {
    const contextInfo = farmerContext ? `
Farmer Context:
- Name: ${farmerContext.farmer.name}
- District: ${farmerContext.farmer.district}
- Experience: ${farmerContext.farmer.experience_years} years
- Farms: ${farmerContext.farms.map(f => `${f.name} (${f.land_size_acres} acres, ${f.primary_crops})`).join(', ')}
- Recent Activities: ${farmerContext.recent_activities.slice(0, 3).map(a => a.text_note).join(', ')}
- Upcoming Reminders: ${farmerContext.upcoming_reminders.slice(0, 2).map(r => r.title).join(', ')}
` : '';

    return `You are Krishi Sakhi, an AI farming assistant for Kerala farmers. Respond in ${language === 'malayalam' ? 'Malayalam' : 'English'}.

${contextInfo}

Current weather and farming context for Kerala:
- Season: Post-monsoon (October-December)
- Common crops: Rice, Coconut, Pepper, Cardamom, Rubber
- Current concerns: Post-harvest activities, pest management, soil preparation

Provide practical, actionable advice specific to Kerala farming conditions. If relevant, mention:
- Weather-based recommendations
- Seasonal farming activities
- Local pest/disease alerts
- Government schemes
- Best practices for their specific crops

CRITICAL GREETING RULES:
1. Greet the user by name (e.g., "Hello ${farmerContext?.farmer?.name || 'farmer'}!") ONLY in the very first turn of the conversation.
2. If this is a follow-up turn (i.e. you have already had some conversation history), DO NOT repeat the initial greeting, do not say "Welcome to farming" or "Welcome rspahn chettan", and do not repeat the intro. Go straight to answering the user's question.

Keep responses conversational, helpful, and under 150 words.`;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      text: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Track questions asked for activity statistics
    const currentCount = parseInt(localStorage.getItem('questionsAsked') || '0');
    localStorage.setItem('questionsAsked', (currentCount + 1).toString());
    
    // Track daily activity
    const today = new Date().toDateString();
    const activeDays = JSON.parse(localStorage.getItem('activeDays') || '[]');
    if (!activeDays.includes(today)) {
      activeDays.push(today);
      localStorage.setItem('activeDays', JSON.stringify(activeDays));
    }
    setIsLoading(true);

    try {
      // Try Gemini API first, fallback to smart responses
      let botReply = "";
      
      try {
        // Build history from existing messages
        const historyPayload = messages
          .filter(m => m.type !== 'welcome' && m.type !== 'error')
          .slice(-10)
          .map(m => ({
            role: m.sender === 'user' ? 'user' : 'model',
            parts: [{ text: m.text }]
          }));

        const response = await apiFetch('/api/chatbot/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: inputMessage,
            history: historyPayload,
            system_prompt: generatePersonalizedPromptSystem(),
            language: language,
            farmer_id: session.userId
          })
        });

        if (response.ok) {
          const data = await response.json();
          botReply = data.reply;
        }
      } catch (apiError) {
        console.log('Gemini API not available, using smart fallback');
      }

      // If no API response, use smart local responses
      if (!botReply) {
        botReply = generateSmartResponse(inputMessage, language);
      }
      
      const botMessage = {
        id: Date.now() + 1,
        text: botReply,
        sender: 'bot',
        timestamp: new Date(),
        type: 'advice'
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Speak the response automatically for better accessibility
      // Auto-speak for Malayalam, and provide manual option for English
      if (language === 'malayalam') {
        setTimeout(() => speakMessage(botMessage.text), 500); // Small delay for better UX
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: language === 'malayalam' 
          ? "ക്ഷമിക്കണം, ഇപ്പോൾ പ്രശ്നമുണ്ട്. ദയവായി വീണ്ടും ശ്രമിക്കുക."
          : "Sorry, I'm having trouble right now. Please try again.",
        sender: 'bot',
        timestamp: new Date(),
        type: 'error'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getQuickSuggestions = () => {
    const suggestions = language === 'malayalam' ? [
      "എന്റെ നെല്ലിന് എന്ത് രോഗമാണ്?",
      "ഇന്ന് മഴ പെയ്യുമോ?",
      "തെങ്ങിന് വളം എപ്പോൾ ഇടണം?",
      "കുരുമുളകിന്റെ വില എത്രയാണ്?"
    ] : [
      "What disease does my rice crop have?",
      "Will it rain today?",
      "When should I fertilize coconut trees?",
      "What's the current pepper price?"
    ];

    return suggestions;
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const generateSmartResponse = (message, language) => {
    const messageLower = message.toLowerCase();
    
    // Malayalam responses
    const malayalamResponses = {
      weather: "കാലാവസ്ഥാ വിവരങ്ങൾക്ക് Weather പേജ് സന്ദർശിക്കുക. മഴയുടെ സാധ്യത ഉണ്ടെങ്കിൽ കീടനാശിനി തളിക്കരുത്. ഇന്ന് വൈകുന്നേരം മഴയ്ക്ക് സാധ്യതയുണ്ട്.",
      disease: "രോഗം കണ്ടെത്താൻ Detect പേജിൽ ഇലയുടെ ഫോട്ടോ അപ്‌ലോഡ് ചെയ്യുക. വ്യക്തമായ ഫോട്ടോ എടുക്കുക. സാധാരണ രോഗങ്ങൾ: ഇല പൊള്ളൽ, പൂപ്പൽ രോഗം.",
      price: "വിപണി വിലകൾക്ക് Market പേജ് പരിശോധിക്കുക. ഇന്നത്തെ വില: നെല്ല് ₹2850/ക്വിന്റൽ, തെങ്ങ് ₹12/എണ്ണം.",
      fertilizer: "വളം ഇടുന്നതിന് മുമ്പ് മണ്ണ് പരിശോധന നടത്തുക. ജൈവ വളം ഉപയോഗിക്കുക. NPK അനുപാതം 4:2:1 നല്ലതാണ്.",
      pest: "കീടങ്ങൾക്ക് നീം എണ്ണ ഉപയോഗിക്കുക. രാവിലെ അല്ലെങ്കിൽ വൈകുന്നേരം തളിക്കുക. ഇലപ്പേൻ, തുരപ്പൻ പുഴു സാധാരണ കീടങ്ങളാണ്.",
      coconut: "തെങ്ങിന് മാസത്തിൽ ഒരിക്കൽ വളം ഇടുക. വേനൽക്കാലത്ത് വെള്ളം കൂടുതൽ കൊടുക്കുക. ഇലപ്പേൻ കണ്ടാൽ ഉടനെ ചികിത്സിക്കുക.",
      rice: "നെല്ലിന് വെള്ളം നിൽക്കാൻ പാടില്ല. കളകൾ നീക്കം ചെയ്യുക. 45 ദിവസത്തിൽ യൂറിയ ഇടുക.",
      default: "ഞാൻ നിങ്ങളുടെ കൃഷി സഖിയാണ്. കൂടുതൽ വിവരങ്ങൾക്ക് വിവിധ പേജുകൾ സന്ദർശിക്കുക. എന്തെങ്കിലും പ്രത്യേക സഹായം വേണോ?"
    };
    
    // English responses
    const englishResponses = {
      weather: "Check the Weather page for forecasts. Avoid spraying if rain is expected. Today evening has 70% chance of rain in Kerala.",
      disease: "Upload a clear photo of affected leaves on the Detect page. Common diseases: Leaf blight, fungal infections, bacterial spots.",
      price: "Visit the Market page for current prices. Today's rates: Rice ₹2850/quintal, Coconut ₹12/piece, Pepper ₹58000/quintal.",
      fertilizer: "Conduct soil testing before fertilizing. Use organic fertilizers for better soil health. NPK ratio 4:2:1 is recommended for most crops.",
      pest: "Use neem oil for pest control. Apply during early morning or evening. Common pests: Aphids, stem borers, leaf miners.",
      coconut: "Fertilize coconut trees monthly. Increase watering in summer. Treat rhinoceros beetle and red palm weevil immediately if spotted.",
      rice: "Ensure proper drainage for rice. Remove weeds regularly. Apply urea at 45 days after transplanting.",
      default: "I'm your Krishi Sakhi farming companion. I can help with weather, diseases, market prices, and farming advice. What specific help do you need?"
    };
    
    const responses = language === 'malayalam' ? malayalamResponses : englishResponses;
    
    // Keyword matching with more specific responses
    if (messageLower.includes('rain') || messageLower.includes('weather') || messageLower.includes('മഴ') || messageLower.includes('കാലാവസ്ഥ')) {
      return responses.weather;
    } else if (messageLower.includes('disease') || messageLower.includes('sick') || messageLower.includes('രോഗം') || messageLower.includes('അസുഖം')) {
      return responses.disease;
    } else if (messageLower.includes('price') || messageLower.includes('market') || messageLower.includes('വില') || messageLower.includes('വിപണി')) {
      return responses.price;
    } else if (messageLower.includes('fertilizer') || messageLower.includes('വളം') || messageLower.includes('manure')) {
      return responses.fertilizer;
    } else if (messageLower.includes('pest') || messageLower.includes('insect') || messageLower.includes('കീടം') || messageLower.includes('പുഴു')) {
      return responses.pest;
    } else if (messageLower.includes('coconut') || messageLower.includes('തെങ്ങ്')) {
      return responses.coconut;
    } else if (messageLower.includes('rice') || messageLower.includes('നെല്ല്') || messageLower.includes('paddy')) {
      return responses.rice;
    } else {
      return responses.default;
    }
  };

  return (
    <div className="dash-layout">
      <Sidebar />
      <main className="dashboard-main page-scroll dash-container">
        <div className="dashboard-content-wrapper">
        <div className="dash-card chat-container">
          <header className="chat-header">
            <div className="chat-title">
              <h1>🌾 Krishi Sakhi</h1>
              <p>{language === 'malayalam' ? 'നിങ്ങളുടെ കൃഷി സഖി' : 'Your Digital Farming Companion'}</p>
            </div>
            
            <div className="chat-controls">
              <button 
                className={`language-toggle ${language === 'malayalam' ? 'active' : ''}`}
                onClick={() => setLanguage(language === 'malayalam' ? 'english' : 'malayalam')}
              >
                {language === 'malayalam' ? 'മലയാളം' : 'English'}
              </button>
            </div>
          </header>

          <div className="messages-container">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <div className="message-content">
                  <div className="message-text">{message.text}</div>
                  <div className="message-time">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                {message.sender === 'bot' && (
                  <button 
                    className="speak-button"
                    onClick={() => speakMessage(message.text)}
                    title="Speak message"
                  >
                    🔊
                  </button>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="message bot">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions */}
          <div className="quick-suggestions">
            {getQuickSuggestions().map((suggestion, index) => (
              <button
                key={index}
                className="suggestion-chip"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={language === 'malayalam' 
                  ? "നിങ്ങളുടെ കൃഷി സംബന്ധിയായ ചോദ്യം ചോദിക്കുക..."
                  : "Ask your farming question..."
                }
                rows={1}
                disabled={isLoading}
              />
              
              <div className="input-actions">
                <button
                  className={`voice-button ${isListening ? 'listening' : ''}`}
                  onClick={isListening ? stopListening : startListening}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? '🔴' : '🎤'}
                </button>
                
                <button
                  className="send-button"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                >
                  📤
                </button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </main>
    </div>
  );
}
