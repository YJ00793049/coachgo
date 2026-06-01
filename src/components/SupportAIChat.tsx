import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, MessageSquare, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const SYSTEM_INSTRUCTION = `You are the CoachGo AI Support Agent.
CoachGo is the premier marketplace for specialized baseball instruction in San Diego.
Your goal is to help players find the right coaches and answer questions about the platform.

Key Information:
- Specialties: Hitting, Pitching, Fielding, Strength Training.
- Mission: Connect players with specialized coaches who live and breathe their discipline.
- Founder: Yuvraj Jindal, a Del Norte High School Varsity baseball player.
- Features: 1-on-1 private sessions, group sessions (available with Robert Congalton, Casey Henderson, and Brandon Decker only), easy booking, and transparent coach profiles.
- Support: Help with booking issues, finding coaches by specialty, or general platform questions.
- Contact: coachgonline@gmail.com

Tone: Professional, encouraging, knowledgeable about baseball, and helpful. Keep responses concise — 2-3 sentences max unless a detailed answer is needed.
If you don't know an answer, suggest they email coachgonline@gmail.com.`;

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function SupportAIChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hi! I'm the CoachGo AI assistant. How can I help you with your baseball journey today?" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const chat = ai.chats.create({
        model: "gemini-2.0-flash",
        config: { systemInstruction: SYSTEM_INSTRUCTION },
        history: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        }))
      });

      const response = await chat.sendMessage({ message: userMessage });
      const text = response.text || "I'm sorry, I couldn't process that. Please try again.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (error) {
      console.error("AI Chat Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "Sorry, I'm having trouble connecting right now. Please email coachgonline@gmail.com for help." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.2 }}
            className="rounded-3xl overflow-hidden flex flex-col mb-4"
            style={{
              width: '360px',
              height: '500px',
              background: '#0F1628',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="p-4 flex justify-between items-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #4F8EF7, #2563EB)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">CoachGo AI Support</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#22c55e' }}>Online</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl transition-all hover:bg-white/10"
                style={{ color: 'rgba(255,255,255,0.7)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-4 space-y-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{
                        background: m.role === 'user' ? '#4F8EF7' : 'rgba(79,142,247,0.2)',
                        color: 'white',
                      }}>
                      {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    {/* Bubble */}
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                      style={{
                        background: m.role === 'user' ? '#4F8EF7' : 'rgba(255,255,255,0.07)',
                        color: m.role === 'user' ? 'white' : 'rgba(255,255,255,0.85)',
                        border: m.role !== 'user' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                      }}>
                      {m.text}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'rgba(79,142,247,0.2)', color: 'white' }}>
                      <Bot size={12} />
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs"
                      style={{ background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <Loader2 size={12} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none transition-all text-white placeholder-white/30"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg font-bold transition-all disabled:opacity-40"
                  style={{ background: '#4F8EF7', color: 'white' }}
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-[8px] text-center mt-2 uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.2)' }}>
                CoachGo Support · coachgonline@gmail.com
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300"
        style={{
          background: 'linear-gradient(135deg, #4F8EF7, #2563EB)',
          boxShadow: '0 8px 30px rgba(79,142,247,0.4)',
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} className="text-white" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare size={22} className="text-white" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}