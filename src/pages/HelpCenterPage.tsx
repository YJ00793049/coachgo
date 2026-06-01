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
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }} className="last:border-0 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex justify-between items-center text-left transition-colors"
        style={{ color: 'white' }}
      >
        <span className="text-lg font-medium" style={{ color: 'white' }}>{question}</span>
        <span className="shrink-0 ml-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
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
            <p className="pb-6 leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
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
    category: "Booking",
    items: [
      {
        question: "How do I book a session?",
        answer: "To book a session, browse our marketplace of elite coaches, select a coach that fits your needs, and click 'Book Session' on their profile. You'll be guided through selecting a session type, date, and time."
      },
      {
        question: "Can I reschedule or cancel?",
        answer: "Yes, you can reschedule or cancel your session through your Dashboard up to 24 hours before the scheduled time. Cancellations within 24 hours may be subject to a fee depending on the coach's policy."
      },
      {
        question: "What happens after I book?",
        answer: "After booking, you'll receive a confirmation email with all the session details. Your coach will also be notified and will reach out if any additional preparation is needed. You can view all your upcoming sessions in your Dashboard."
      }
    ]
  },
  {
    category: "Payments",
    items: [
      {
        question: "What payment methods do you accept?",
        answer: "Payments are made directly to coaches via Venmo after the coach confirms your session. Each coach's Venmo handle is shown on their profile and on the booking confirmation page."
      },
      {
        question: "When am I charged?",
        answer: "You are not charged at the time of booking. Once the coach confirms your session, you'll send payment directly to the coach via Venmo. No payment is due until the coach accepts."
      },
      {
        question: "Do coaches set their own prices?",
        answer: "Yes, each coach on CoachGo sets their own rates based on their experience, specialty, and session type. You can see the pricing clearly listed on each coach's profile."
      }
    ]
  },
  {
    category: "Coaching Sessions",
    items: [
      {
        question: "What's the difference between 1-on-1 and Group sessions?",
        answer: "1-on-1 sessions provide personalized, focused instruction tailored specifically to your individual needs. Group sessions are more cost-effective and allow for peer learning and competitive drills in a small group setting."
      },
      {
        question: "How do I prepare for my first session?",
        answer: "Arrive 10-15 minutes early to warm up. Bring your own gear (glove, bat, helmet, etc.) and plenty of water. Come with a clear goal of what you want to work on during the session."
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
        answer: "Once logged in, navigate to your Dashboard and click on 'Edit Profile'. You can update your personal information, skill level, and primary position there."
      },
      {
        question: "How do I leave a review?",
        answer: "After completing a session, you'll receive an email invitation to rate and review your coach. You can also leave a review directly from the 'Past Sessions' section in your Dashboard."
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
          <h1 className="text-5xl font-bold tracking-tight mb-6" style={{ color: 'white' }}>Help Center</h1>
          <p className="text-lg mb-8" style={{ color: 'rgba(255,255,255,0.55)' }}>Find answers to common questions about CoachGo.</p>

          <div className="relative max-w-xl mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2" size={20} style={{ color: 'rgba(255,255,255,0.4)' }} />
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl py-4 pl-12 pr-4 focus:outline-none transition-colors"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
              }}
            />
          </div>
        </div>

        <div className="space-y-12">
          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((section) => (
              <section key={section.category}>
                <h2 className="text-2xl font-bold mb-6" style={{ color: 'rgba(255,255,255,0.9)' }}>{section.category}</h2>
                <div className="rounded-3xl px-8" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  {section.items.map((item, idx) => (
                    <FAQItem key={idx} question={item.question} answer={item.answer} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="text-center py-12">
              <p style={{ color: 'rgba(255,255,255,0.5)' }}>No results found for "{searchQuery}"</p>
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
