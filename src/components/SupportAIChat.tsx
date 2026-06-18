import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from "@google/genai";
import { Send, Bot, User, Loader2, MessageSquare, X, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MOCK_COACHES } from '../pages/CoachesPage';

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

const COACH_ROSTER = MOCK_COACHES.map(c =>
  `#${c.id} ${c.name} — ${c.specialty}${c.secondary_specialty ? '/' + c.secondary_specialty : ''}, $${c.price_per_session}/session, ${c.city}`
).join('\n');

const SYSTEM_INSTRUCTION = `You are the CoachGo AI Concierge.
CoachGo is the discovery and connection platform for specialized baseball coaching in San Diego — think of it as a personal LinkedIn for baseball coaching.
Your goal is to help players discover the right coach AND take action for them.

Key Information:
- Specialties: Hitting, Pitching, Fielding, Strength Training.
- Mission: Help players discover specialized coaches, connect with them, and train their way.
- Founder: Yuvraj Jindal, a Del Norte High School Varsity baseball player.
- How it works: players browse coaches, click Connect, and share their contact info. The coach then reaches out directly to plan training. Coaches offer 1-on-1 and/or group sessions (shown on each profile). Scheduling and payment are arranged directly between the player and coach — there is no in-app booking or payment.
- Contact: coachgonline@gmail.com

Coaches you can recommend (use the id in actions):
${COACH_ROSTER}

ACTION PROTOCOL — you can give the player ONE tappable button.
When it helps (they want to open a coach, connect, or browse a discipline), append on a NEW FINAL LINE exactly one token in this format:
[[ACTION|Button label|/path]]
Valid paths:
- /coaches  (browse all)
- /coaches?specialty=hitting  (or pitching, fielding, strength)
- /coaches/<id>  (open a specific coach's profile, where they can tap Connect)
Rules: include at most one token, only when useful; write a natural sentence first; NEVER mention or explain the token.

Tone: professional, encouraging, knowledgeable about baseball. Keep responses to 2-3 sentences.
If you don't know an answer, suggest emailing coachgonline@gmail.com.`;

interface Message {
  role: 'user' | 'model';
  text: string;
  action?: { label: string; path: string };
}

const ACTION_RE = /\[\[ACTION\|([^|]+)\|([^\]]+)\]\]/;

export default function SupportAIChat() {
  const navigate = useNavigate();
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
      const raw = response.text || "I'm sorry, I couldn't process that. Please try again.";
      const m = raw.match(ACTION_RE);
      const text = (m ? raw.replace(m[0], '') : raw).trim();
      const action = m ? { label: m[1].trim(), path: m[2].trim() } : undefined;
      setMessages(prev => [...prev, { role: 'model', text, action }]);
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
              background: '#FBFAF6',
              border: '1px solid rgba(27,24,19,0.08)',
              boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="p-4 flex justify-between items-center shrink-0"
              style={{ background: 'var(--paper-warm)', borderBottom: '1px solid rgba(27,24,19,0.1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'rgba(27,24,19,0.2)' }}>
                  <Bot size={18} className="text-ink" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-ink">CoachGo AI Support</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5E8C5A' }} />
                    <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: '#5E8C5A' }}>Online</p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl transition-all hover:bg-[rgba(27,24,19,0.05)]"
                style={{ color: 'rgba(27,24,19,0.7)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-grow overflow-y-auto p-4 space-y-4"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(27,24,19,0.1) transparent' }}
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    {/* Avatar */}
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-1"
                      style={{
                        background: m.role === 'user' ? '#1B1813' : 'var(--paper-warm)',
                        color: m.role === 'user' ? 'white' : 'var(--ink)',
                        border: m.role === 'user' ? 'none' : '1px solid var(--line)',
                      }}>
                      {m.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                    </div>
                    {/* Bubble + optional action */}
                    <div className="flex flex-col gap-2 items-start">
                      <div className={`p-3 rounded-2xl text-xs leading-relaxed ${m.role === 'user' ? 'rounded-tr-none' : 'rounded-tl-none'}`}
                        style={{
                          background: m.role === 'user' ? '#1B1813' : 'rgba(27,24,19,0.07)',
                          color: m.role === 'user' ? 'white' : 'rgba(27,24,19,0.85)',
                          border: m.role !== 'user' ? '1px solid rgba(27,24,19,0.08)' : 'none',
                        }}>
                        {m.text}
                      </div>
                      {m.action && (
                        <button
                          onClick={() => { setIsOpen(false); navigate(m.action!.path); }}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs transition-colors"
                          style={{ background: '#1B1813', color: '#F6F4EF' }}
                        >
                          {m.action.label} <ArrowRight size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: 'var(--paper-warm)', color: 'var(--ink)', border: '1px solid var(--line)' }}>
                      <Bot size={12} />
                    </div>
                    <div className="p-3 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs"
                      style={{ background: 'rgba(27,24,19,0.07)', color: 'rgba(27,24,19,0.6)', border: '1px solid rgba(27,24,19,0.08)' }}>
                      <Loader2 size={12} className="animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(27,24,19,0.06)' }}>
              <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="w-full rounded-xl py-3 pl-4 pr-12 text-xs focus:outline-none transition-all text-ink placeholder-[rgba(27,24,19,0.4)]"
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(27,24,19,0.16)',
                  }}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="absolute right-1.5 top-1.5 bottom-1.5 px-3 rounded-lg font-bold transition-all disabled:opacity-40"
                  style={{ background: '#1B1813', color: 'white' }}
                >
                  <Send size={14} />
                </button>
              </form>
              <p className="text-[8px] text-center mt-2 uppercase tracking-widest"
                style={{ color: 'rgba(27,24,19,0.2)' }}>
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
        className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300"
        style={{
          background: 'var(--black)',
          boxShadow: '0 10px 30px rgba(27,24,19,0.25)',
        }}
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X size={22} className="text-paper" />
            </motion.div>
          ) : (
            <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare size={22} className="text-paper" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}