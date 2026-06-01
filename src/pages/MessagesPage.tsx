import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '../firebase';
import {
  collection, query, where, onSnapshot, addDoc, serverTimestamp,
  doc, getDoc, updateDoc, orderBy, getDocs, setDoc, increment
} from 'firebase/firestore';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Send, ArrowLeft, MessageSquare, Loader2, Search } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { MOCK_COACHES } from './CoachesPage';
import { handleFirestoreError, OperationType } from '../utils/firestoreErrorHandler';
import { SPRING } from '../tokens';

// ─── ANIMATED TYPING DOTS ───────────────────────────────────────────
function TypingDots() {
  const prefersReduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, x: -16, scale: 0.85 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -16, scale: 0.85 }}
      transition={SPRING}
      className="flex justify-start"
    >
      <div
        className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}
        aria-label="Partner is typing"
      >
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="block w-1.5 h-1.5 rounded-full"
            style={{ background: '#4F8EF7' }}
            animate={prefersReduced ? {} : { y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 1.0, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

interface Message {
  id: string;
  sender_id: string;
  text: string;
  created_at: any;
  read: boolean;
}

interface Conversation {
  id: string;
  coach_id: string;
  player_id: string;
  participants: string[];
  last_message: string;
  last_message_at: any;
  unread_count_player: number;
  unread_count_coach: number;
  coach_name?: string;
  player_name?: string;
}

export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [user] = useAuthState(auth);
  const [userRole, setUserRole] = useState<'player' | 'coach' | null>(null);
  const [userName, setUserName] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const prevMessageCount = useRef(0);
  const prefersReduced = useReducedMotion();

  // Fetch user role and name
  useEffect(() => {
    if (!user) return;
    const fetchUser = async () => {
      try {
        const snap = await getDoc(doc(db, 'users', user.uid));
        if (snap.exists()) {
          setUserRole(snap.data().role || 'player');
          setUserName(snap.data().name || user.displayName || 'User');
        } else {
          setUserRole('player');
          setUserName(user.displayName || 'Player');
        }
      } catch {
        setUserRole('player');
      }
    };
    fetchUser();
  }, [user]);

  // Listen to conversations
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const results = await Promise.all(snap.docs.map(async (d) => {
        const data = d.data() as Conversation;
        const coach = MOCK_COACHES.find(c => c.user_id === data.coach_id);
        let playerName = data.player_name || 'Player';
        let coachName = coach?.name || data.coach_name || 'Coach';
        if (!data.player_name) {
          try {
            const playerSnap = await getDoc(doc(db, 'users', data.player_id));
            if (playerSnap.exists()) playerName = playerSnap.data().name || 'Player';
          } catch {}
        }
        if (!coach && !data.coach_name) {
          try {
            const coachSnap = await getDoc(doc(db, 'coach_profiles', data.coach_id));
            if (coachSnap.exists()) coachName = coachSnap.data().name || 'Coach';
          } catch {}
        }
        return { ...data, id: d.id, coach_name: coachName, player_name: playerName };
      }));
      const convos = results.sort((a, b) => (b.last_message_at?.seconds || 0) - (a.last_message_at?.seconds || 0));
      setConversations(convos);
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'conversations'));
    return () => unsub();
  }, [user]);

  // Listen to messages in active conversation
  useEffect(() => {
    if (!conversationId || !user) return;
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('created_at', 'asc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as Message)));
      // Mark as read
      markAsRead(conversationId);
    }, (err) => handleFirestoreError(err, OperationType.GET, `conversations/${conversationId}/messages`));
    return () => unsub();
  }, [conversationId, user]);

  // Set active conversation when conversationId changes
  useEffect(() => {
    if (!conversationId) return;
    const convo = conversations.find(c => c.id === conversationId);
    if (convo) setActiveConversation(convo);
  }, [conversationId, conversations]);

  // Scroll to bottom on new messages only when there are messages
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Simulated partner-typing trigger — show typing dots briefly after partner sends
  useEffect(() => {
    if (messages.length > prevMessageCount.current) {
      const newest = messages[messages.length - 1];
      const isPartner = user && newest?.sender_id && newest.sender_id !== user.uid;
      if (isPartner) {
        setPartnerTyping(true);
        const t = setTimeout(() => setPartnerTyping(false), 1600);
        prevMessageCount.current = messages.length;
        return () => clearTimeout(t);
      }
    }
    prevMessageCount.current = messages.length;
  }, [messages, user]);

  const markAsRead = async (convoId: string, role?: 'player' | 'coach' | null) => {
    if (!user) return;
    const resolvedRole = role ?? userRole;
    if (!resolvedRole) return;
    try {
      const field = resolvedRole === 'coach' ? 'unread_count_coach' : 'unread_count_player';
      await updateDoc(doc(db, 'conversations', convoId), { [field]: 0 });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `conversations/${convoId}`);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !conversationId || !user || sending) return;
    setSending(true);
    const text = newMessage.trim();
    setNewMessage('');
    try {
      await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
        sender_id: user.uid,
        text,
        created_at: serverTimestamp(),
        read: false,
      });

      const isCoach = userRole === 'coach';
      await updateDoc(doc(db, 'conversations', conversationId), {
        last_message: text,
        last_message_at: serverTimestamp(),
        [`unread_count_${isCoach ? 'player' : 'coach'}`]: increment(1),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `conversations/${conversationId}/messages`);
    } finally {
      setSending(false);
    }
  };

  const getOtherName = (convo: Conversation) => {
    if (userRole === 'coach') return convo.player_name || 'Player';
    return convo.coach_name || 'Coach';
  };

  const getUnreadCount = (convo: Conversation) => {
    if (userRole === 'coach') return convo.unread_count_coach || 0;
    return convo.unread_count_player || 0;
  };

  const filteredConversations = conversations.filter(c =>
    getOtherName(c).toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <div className="text-center">
        <p className="text-white font-bold mb-4">Please log in to view messages.</p>
        <Link to="/auth" className="btn-primary">Log In</Link>
      </div>
    </div>
  );

  if (!userRole) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0A0F1E' }}>
      <Loader2 className="animate-spin" size={36} style={{ color: '#4F8EF7' }} />
    </div>
  );

  return (
    <PageTransition>
      <div className="min-h-screen pt-20" style={{ background: '#0A0F1E' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-4xl text-white">Messages</h1>
            <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 220px)' }}>

            {/* Conversation List */}
            <div className="md:col-span-1 rounded-3xl overflow-hidden flex flex-col"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

              {/* Search */}
              <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-xl py-2 pl-8 pr-3 text-xs text-white focus:outline-none"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  />
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin" size={24} style={{ color: '#4F8EF7' }} />
                  </div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-16 px-6">
                    <MessageSquare size={32} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.1)' }} />
                    <p className="text-sm font-bold text-white mb-2">No messages yet</p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {userRole === 'player' ? 'Message a coach from their profile page.' : 'Players will message you from your profile.'}
                    </p>
                    {userRole === 'player' && (
                      <Link to="/coaches" className="btn-primary py-2 px-4 text-xs mt-4 inline-block">
                        Browse Coaches
                      </Link>
                    )}
                  </div>
                ) : (
                  <motion.div
                    variants={{ visible: { transition: { staggerChildren: prefersReduced ? 0 : 0.05 } } }}
                    initial="hidden"
                    animate="visible"
                  >
                    {filteredConversations.map(convo => {
                      const isActive = convo.id === conversationId;
                      const unread = getUnreadCount(convo);
                      return (
                        <motion.button
                          key={convo.id}
                          variants={{
                            hidden: { opacity: 0, x: prefersReduced ? 0 : -20 },
                            visible: { opacity: 1, x: 0, transition: { ...SPRING } },
                          }}
                          whileHover={{ background: isActive ? 'rgba(79,142,247,0.12)' : 'rgba(255,255,255,0.04)' }}
                          onClick={() => navigate(`/messages/${convo.id}`)}
                          className="w-full text-left p-4 transition-colors"
                          style={{
                            background: isActive ? 'rgba(79,142,247,0.1)' : 'transparent',
                            borderLeft: isActive ? '2px solid #4F8EF7' : '2px solid transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                          }}
                        >
                          <div className="flex items-center gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-bold text-sm"
                              style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}>
                              {getOtherName(convo).charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-white text-sm truncate">{getOtherName(convo)}</p>
                                {unread > 0 && (
                                  <motion.span
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={SPRING}
                                    className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                                    style={{ background: '#4F8EF7', boxShadow: '0 0 12px rgba(79,142,247,0.6)' }}
                                  >
                                    {unread}
                                  </motion.span>
                                )}
                              </div>
                              <p className="text-xs truncate mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                {convo.last_message || 'No messages yet'}
                              </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Chat Window */}
            <div className="md:col-span-2 rounded-3xl overflow-hidden flex flex-col"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>

              {!conversationId ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <MessageSquare size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.08)' }} />
                    <p className="font-bold text-white mb-2">Select a conversation</p>
                    <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>Choose a conversation from the left to start messaging.</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="p-5 flex items-center gap-4 shrink-0"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <button onClick={() => navigate('/messages')} className="md:hidden p-2 rounded-xl"
                      style={{ color: 'rgba(255,255,255,0.4)' }}>
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                      style={{ background: 'rgba(79,142,247,0.15)', color: '#4F8EF7' }}>
                      {activeConversation ? getOtherName(activeConversation).charAt(0) : '?'}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-white">{activeConversation ? getOtherName(activeConversation) : '...'}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {userRole === 'player' && activeConversation
                          ? (MOCK_COACHES.find(c => c.user_id === activeConversation.coach_id)?.specialty || '').charAt(0).toUpperCase() + (MOCK_COACHES.find(c => c.user_id === activeConversation.coach_id)?.specialty || '').slice(1) + ' Specialist'
                          : 'Player'}
                      </p>
                    </div>
                    {activeConversation && userRole === 'player' && (
                      <Link
                        to={`/book/${MOCK_COACHES.find(c => c.user_id === activeConversation.coach_id)?.id || activeConversation.coach_id}`}
                        className="btn-primary py-2 px-4 text-xs"
                      >
                        Book Session
                      </Link>
                    )}
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
                          No messages yet. Say hello!
                        </p>
                      </div>
                    ) : (() => {
                      let lastDateLabel = '';
                      return messages.map(msg => {
                        const isMe = msg.sender_id === user.uid;
                        const msgDate = msg.created_at?.toDate?.();
                        const dateLabel = msgDate
                          ? msgDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          : '';
                        const showDivider = dateLabel && dateLabel !== lastDateLabel;
                        if (showDivider) lastDateLabel = dateLabel;
                        return (
                          <div key={msg.id}>
                            {showDivider && (
                              <div className="flex items-center gap-3 my-4">
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                                <span className="text-[10px] font-bold uppercase tracking-widest shrink-0" style={{ color: 'rgba(255,255,255,0.25)' }}>{dateLabel}</span>
                                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
                              </div>
                            )}
                            <motion.div
                              initial={{ opacity: 0, x: prefersReduced ? 0 : (isMe ? 40 : -40), scale: prefersReduced ? 1 : 0.88 }}
                              animate={{ opacity: 1, x: 0, scale: 1 }}
                              transition={SPRING}
                              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                            >
                              <div className={`max-w-[70%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${isMe ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
                                style={{
                                  background: isMe ? '#4F8EF7' : 'rgba(255,255,255,0.07)',
                                  color: isMe ? 'white' : 'rgba(255,255,255,0.85)',
                                  border: isMe ? 'none' : '1px solid rgba(255,255,255,0.08)',
                                  boxShadow: isMe ? '0 8px 22px rgba(79,142,247,0.25)' : '0 4px 16px rgba(0,0,0,0.25)',
                                }}>
                                {msg.text}
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : ''}`}
                                  style={{ color: isMe ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)' }}>
                                  {msgDate?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) || ''}
                                </p>
                              </div>
                            </motion.div>
                          </div>
                        );
                      });
                    })()}
                    <AnimatePresence>
                      {partnerTyping && <TypingDots />}
                    </AnimatePresence>
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="flex gap-3 items-center"
                      animate={inputFocused ? { scale: 1.005 } : { scale: 1 }}
                      transition={SPRING}
                    >
                      <motion.div
                        className="flex-1 relative rounded-xl"
                        animate={inputFocused
                          ? { boxShadow: '0 0 0 4px rgba(79,142,247,0.18), 0 0 28px rgba(79,142,247,0.20)' }
                          : { boxShadow: '0 0 0 0 rgba(79,142,247,0)' }
                        }
                        transition={{ duration: 0.25 }}
                      >
                        <motion.input
                          type="text"
                          value={newMessage}
                          onChange={e => setNewMessage(e.target.value)}
                          onFocus={() => setInputFocused(true)}
                          onBlur={() => setInputFocused(false)}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                          placeholder="Type a message..."
                          className="w-full rounded-xl px-4 py-3 text-sm text-white focus:outline-none"
                          animate={inputFocused
                            ? { paddingTop: 14, paddingBottom: 14, background: 'rgba(8,11,20,0.85)', borderColor: 'rgba(79,142,247,0.55)' }
                            : { paddingTop: 12, paddingBottom: 12, background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.10)' }
                          }
                          transition={SPRING}
                          style={{ border: '1px solid' }}
                        />
                      </motion.div>
                      <motion.button
                        onClick={sendMessage}
                        disabled={!newMessage.trim() || sending}
                        className="w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-40"
                        style={{ background: '#4F8EF7', color: 'white' }}
                        whileHover={{ scale: 1.06, boxShadow: '0 8px 24px rgba(79,142,247,0.5)' }}
                        whileTap={{ scale: 0.94 }}
                        transition={SPRING}
                      >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                      </motion.button>
                    </motion.div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}