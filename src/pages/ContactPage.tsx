import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { Mail, MessageSquare, Send, CheckCircle2, Loader2 } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: 'General Inquiry',
    message: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
        }),
      });

      if (!response.ok) throw new Error('Failed to send');
      setIsSubmitted(true);
    } catch (err) {
      setError('Something went wrong. Please email us directly at coachgonline@gmail.com');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-6 text-ink">Contact Us</h1>
          <p className="text-lg" style={{ color: 'var(--ink-soft)' }}>
            Have a question? We typically respond within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

          {/* Contact Info */}
          <div className="md:col-span-1 space-y-6">
            <div className="rounded-3xl p-8" style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.06)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                <Mail size={24} />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Email Us</h3>
              <p className="text-sm mb-4" style={{ color: 'rgba(27,24,19,0.4)' }}>
                Our team is ready to help.
              </p>
              <a href="mailto:coachgonline@gmail.com"
                className="text-sm font-bold break-words"
                style={{ color: '#1B1813' }}>
                coachgonline@gmail.com
              </a>
            </div>

            <div className="rounded-3xl p-8" style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.06)' }}>
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
                style={{ background: 'rgba(27,24,19,0.1)', color: '#1B1813' }}>
                <MessageSquare size={24} />
              </div>
              <h3 className="text-lg font-bold text-ink mb-2">Response Time</h3>
              <p className="text-sm" style={{ color: 'rgba(27,24,19,0.4)' }}>
                We respond to all inquiries within 24 hours, Monday–Sunday.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2">
            <div className="rounded-3xl p-8 md:p-12"
              style={{ background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.06)' }}>
              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3"
                        style={{ color: 'rgba(27,24,19,0.4)' }}>Name</label>
                      <input
                        type="text"
                        required
                        className="w-full rounded-xl p-4 text-ink focus:outline-none"
                        style={{ background: '#FFFFFF', border: '1px solid var(--line-strong)' }}
                        placeholder="Your name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest mb-3"
                        style={{ color: 'rgba(27,24,19,0.4)' }}>Email</label>
                      <input
                        type="email"
                        required
                        className="w-full rounded-xl p-4 text-ink focus:outline-none"
                        style={{ background: '#FFFFFF', border: '1px solid var(--line-strong)' }}
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: 'rgba(27,24,19,0.4)' }}>Subject</label>
                    <select
                      className="w-full rounded-xl p-4 text-ink focus:outline-none"
                      style={{ background: '#FFFFFF', border: '1px solid var(--line-strong)', colorScheme: 'light' }}
                      value={formData.subject}
                      onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    >
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Connecting Help">Connecting Help</option>
                      <option value="Coach Question">Coach Question</option>
                      <option value="Become a Coach">Become a Coach</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest mb-3"
                      style={{ color: 'rgba(27,24,19,0.4)' }}>Message</label>
                    <textarea
                      required
                      rows={6}
                      className="w-full rounded-xl p-4 text-ink focus:outline-none resize-none text-sm"
                      style={{ background: '#FFFFFF', border: '1px solid var(--line-strong)' }}
                      placeholder="How can we help you?"
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    />
                  </div>

                  {error && (
                    <p className="text-sm font-medium" style={{ color: '#BC5A48' }}>{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="btn-primary w-full py-4 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmitting
                      ? <><Loader2 size={18} className="animate-spin" /> Sending...</>
                      : <><Send size={18} /> Send Message</>
                    }
                  </button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
                    style={{ background: 'rgba(94,140,90,0.1)', color: '#5E8C5A' }}>
                    <CheckCircle2 size={40} />
                  </div>
                  <h2 className="text-3xl font-bold text-ink mb-4">Message Sent!</h2>
                  <p className="mb-8" style={{ color: 'rgba(27,24,19,0.4)' }}>
                    Thanks for reaching out. We'll get back to you at{' '}
                    <strong className="text-ink">{formData.email}</strong> within 24 hours.
                  </p>
                  <button
                    onClick={() => {
                      setIsSubmitted(false);
                      setFormData({ name: '', email: '', subject: 'General Inquiry', message: '' });
                    }}
                    className="btn-secondary py-3 px-8"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}