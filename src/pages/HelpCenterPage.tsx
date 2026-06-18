import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';

interface FAQItemProps {
  question: string;
  answer: string;
  key?: React.Key;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ borderBottom: '1px solid rgba(27,24,19,0.08)' }} className="last:border-0 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex justify-between items-center text-left transition-colors"
        style={{ color: 'var(--ink)' }}
      >
        <span className="text-lg font-display text-2xl" style={{ color: 'var(--ink)' }}>{question}</span>
        <span className="shrink-0 ml-4" style={{ color: 'rgba(27,24,19,0.4)' }}>
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </span>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <p className="pb-6 leading-relaxed" style={{ color: 'rgba(27,24,19,0.7)' }}>
              {answer}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const FAQ_DATA = [
  {
    category: "Connecting",
    items: [
      {
        question: "How do I connect with a coach?",
        answer: "Browse coaches, open the profile of one who fits your needs, and click 'Connect'. Share a phone number or email (and an optional note), and the coach reaches out to you directly."
      },
      {
        question: "What happens after I connect?",
        answer: "The coach receives your request and contact info by email and in their dashboard. They reach out directly to talk through training. You'll also get a confirmation email that your request was sent."
      },
      {
        question: "When can I message a coach in the app?",
        answer: "In-app messaging unlocks once a coach accepts your connection request. Before that, the coach can still reach you using the phone or email you shared."
      }
    ]
  },
  {
    category: "Scheduling & Payments",
    items: [
      {
        question: "How are sessions scheduled?",
        answer: "Scheduling is arranged directly between you and your coach after you connect. CoachGo doesn't handle in-app booking — you set times together that work for both of you."
      },
      {
        question: "How do payments work?",
        answer: "Payments are handled directly between you and your coach. CoachGo doesn't process or store any payments — you and your coach agree on pricing once you connect."
      },
      {
        question: "Do coaches set their own prices?",
        answer: "Yes. Each coach lists a starting price on their profile for reference, and final pricing is arranged directly with the coach based on what you need."
      }
    ]
  },
  {
    category: "Coaches",
    items: [
      {
        question: "What's the difference between 1-on-1 and Group sessions?",
        answer: "1-on-1 sessions provide personalized, focused instruction tailored to you. Group sessions are more cost-effective and allow for peer learning and competitive drills in a small group. Each profile shows which a coach offers."
      },
      {
        question: "How do I know a coach is the right fit?",
        answer: "Every profile includes an intro video, verified credentials, real reviews, and a clear specialty — and you can connect with as many specialists as you like to find your best match."
      }
    ]
  },
  {
    category: "Account",
    items: [
      {
        question: "How do I create an account?",
        answer: "Click the 'Get Started' button in the navigation bar. You can sign up using your email or quickly with your Google account. It only takes a few seconds to get started."
      },
      {
        question: "How do I update my profile?",
        answer: "Once logged in, go to your profile from the navigation bar. Players can add their age, position, skill level, goals, and bio; coaches edit their profile from the dashboard."
      },
      {
        question: "How do I see my connections?",
        answer: "Your Dashboard shows every connection request you've sent (or received, if you're a coach), its status, and quick access to message coaches once a request is accepted."
      }
    ]
  }
];

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFaqs = FAQ_DATA.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="display-lg mb-6">Help Center</h1>
          <p className="text-lg mb-8" style={{ color: 'rgba(27,24,19,0.55)' }}>Find answers to common questions about CoachGo.</p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: 'rgba(27,24,19,0.4)' }} />
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl py-4 pl-12 pr-4 focus:outline-none transition-colors"
              style={{
                background: '#FFFFFF',
                border: '1px solid rgba(27,24,19,0.16)',
                color: 'var(--ink)',
              }}
            />
          </div>
        </div>

        <div className="space-y-12">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((section) => (
              <section key={section.category}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgba(27,24,19,0.9)' }}>{section.category}</h2>
                <div className="rounded-3xl px-8" style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.08)' }}>
                  {section.items.map((item, idx) => (
                    <FAQItem key={idx} question={item.question} answer={item.answer} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'rgba(27,24,19,0.5)' }}>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
