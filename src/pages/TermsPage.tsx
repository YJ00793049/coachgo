import React from 'react';
import PageTransition from '../components/PageTransition';
import { FileText, CheckCircle, User, CreditCard, AlertTriangle, Scale, Mail } from 'lucide-react';

const sectionHeadingStyle = { color: 'var(--ink)' };
const bodyStyle = { color: 'rgba(27,24,19,0.7)' };
const iconStyle = { color: 'rgba(27,24,19,0.4)' };
const cardStyle = { background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.08)' };

export default function TermsPage() {
  const lastUpdated = "March 18, 2026";

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(27,24,19,0.05)', color: 'var(--ink)' }}>
            <FileText size={32} />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--ink)' }}>Terms of Service</h1>
          <p className="text-lg" style={{ color: 'rgba(27,24,19,0.5)' }}>Last updated: {lastUpdated}</p>
        </div>

        <div className="p-8 md:p-12 rounded-3xl space-y-12" style={cardStyle}>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <CheckCircle size={24} style={iconStyle} />
              1. Acceptance of Terms
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                By accessing or using the CoachGo platform, you agree to be bound by these Terms of Service. If you do not agree to all the terms and conditions, then you may not access the platform or use any services.
              </p>
              <p>
                CoachGo reserves the right to update, change or replace any part of these Terms of Service by posting updates and/or changes to our website. It is your responsibility to check this page periodically for changes.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <User size={24} style={iconStyle} />
              2. Use of Platform
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                You must be at least 13 years of age to use this platform. If you are under 18, you must have the consent of a parent or legal guardian.
              </p>
              <p>
                You are responsible for maintaining the confidentiality of your account and password and for restricting access to your computer or mobile device. You agree to accept responsibility for all activities that occur under your account.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Scale size={24} style={iconStyle} />
              3. Coach and Player Responsibilities
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Players:</strong> You agree to provide accurate information about yourself, share contact details responsibly when connecting, and communicate respectfully with coaches.</p>
              <p><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Coaches:</strong> You agree to provide professional instruction, maintain a safe environment, and accurately represent your qualifications and experience.</p>
              <p>
                CoachGo is a discovery and connection platform between players and coaches. We do not employ the coaches and are not responsible for their individual conduct or the quality of instruction provided.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <CreditCard size={24} style={iconStyle} />
              4. Scheduling and Payments
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                CoachGo does not process payments or schedule sessions. Once a player connects with a coach, all scheduling, pricing, and payment are arranged directly between the player and the coach.
              </p>
              <p>
                Any agreements about pricing, refunds, or cancellations are between the player and the coach. If you have a concern about a coach, please contact our support team and we'll do our best to help.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <AlertTriangle size={24} style={iconStyle} />
              5. Connections and Conduct
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                When you send a connection request, you choose what contact information to share with a coach. The coach may use it to reach out to you about training.
              </p>
              <p>
                Misuse of contact information, spam, or harassment is prohibited and may result in removal from the platform.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Scale size={24} style={iconStyle} />
              6. Liability and Governing Law
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                CoachGo and its affiliates shall not be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
              <p>
                These Terms shall be governed and construed in accordance with the laws of California, United States, without regard to its conflict of law provisions.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Mail size={24} style={iconStyle} />
              7. Contact Us
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                If you have any questions about these Terms of Service, please contact us at:
              </p>
              <p className="font-bold" style={{ color: 'var(--ink)' }}>
                support@coachgonline.com
              </p>
            </div>
          </section>

        </div>
      </div>
    </PageTransition>
  );
}
