import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { Mail, Shield, FileText, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SupportPage() {
  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold tracking-tight mb-4">Support Center</h1>
          <p className="text-text-secondary text-lg">How can we help you today?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Help Center */}
          <section className="bg-card-bg p-8 rounded-3xl border border-border-navy hover:border-[rgba(27,24,19,0.14)] transition-colors">
            <div className="w-12 h-12 bg-border-navy rounded-2xl flex items-center justify-center mb-6 text-ink">
              <HelpCircle size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Help Center</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              Find answers to frequently asked questions about discovering coaches, connecting, and training.
            </p>
            <Link 
              to="/help"
              className="text-sm font-bold uppercase tracking-widest hover:text-ink transition-colors flex items-center gap-2"
            >
              Browse Articles
            </Link>
          </section>

          {/* Contact Us */}
          <section className="bg-card-bg p-8 rounded-3xl border border-border-navy hover:border-[rgba(27,24,19,0.14)] transition-colors">
            <div className="w-12 h-12 bg-border-navy rounded-2xl flex items-center justify-center mb-6 text-ink">
              <Mail size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              Have a specific question? Our team is here to help you get the most out of CoachGo.
            </p>
            <Link to="/contact" className="text-sm font-bold uppercase tracking-widest hover:text-ink transition-colors flex items-center gap-2">
              Send a Message
            </Link>
          </section>

          {/* Privacy Policy */}
          <section className="bg-card-bg p-8 rounded-3xl border border-border-navy hover:border-[rgba(27,24,19,0.14)] transition-colors">
            <div className="w-12 h-12 bg-border-navy rounded-2xl flex items-center justify-center mb-6 text-ink">
              <Shield size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Privacy Policy</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              Learn how we protect your data and maintain your privacy on our platform.
            </p>
            <Link 
              to="/privacy"
              className="text-sm font-bold uppercase tracking-widest hover:text-ink transition-colors flex items-center gap-2"
            >
              Read Policy
            </Link>
          </section>

          {/* Terms of Service */}
          <section className="bg-card-bg p-8 rounded-3xl border border-border-navy hover:border-[rgba(27,24,19,0.14)] transition-colors">
            <div className="w-12 h-12 bg-border-navy rounded-2xl flex items-center justify-center mb-6 text-ink">
              <FileText size={24} />
            </div>
            <h2 className="text-2xl font-bold mb-4">Terms of Service</h2>
            <p className="text-text-secondary mb-6 leading-relaxed">
              The legal agreement between you and CoachGo regarding the use of our services.
            </p>
            <Link 
              to="/terms"
              className="text-sm font-bold uppercase tracking-widest hover:text-ink transition-colors flex items-center gap-2"
            >
              View Terms
            </Link>
          </section>
        </div>
      </div>
    </PageTransition>
  );
}
