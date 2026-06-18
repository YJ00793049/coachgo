import React from 'react';
import PageTransition from '../components/PageTransition';
import { Shield, Lock, Eye, Globe, UserCheck, Mail } from 'lucide-react';

const sectionHeadingStyle = { color: 'var(--ink)' };
const bodyStyle = { color: 'rgba(27,24,19,0.7)' };
const iconStyle = { color: 'rgba(27,24,19,0.4)' };
const cardStyle = { background: 'rgba(27,24,19,0.03)', border: '1px solid rgba(27,24,19,0.08)' };

export default function PrivacyPage() {
  const lastUpdated = "March 18, 2026";

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(27,24,19,0.05)', color: 'var(--ink)' }}>
            <Shield size={32} />
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--ink)' }}>Privacy Policy</h1>
          <p className="text-lg" style={{ color: 'rgba(27,24,19,0.5)' }}>Last updated: {lastUpdated}</p>
        </div>

        <div className="p-8 md:p-12 rounded-3xl space-y-12" style={cardStyle}>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Eye size={24} style={iconStyle} />
              1. Information We Collect
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                We collect information that you provide directly to us when you create an account, connect with a coach, or communicate with us. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Personal Information:</strong> Name, email address, phone number, and profile picture.</li>
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Player Information:</strong> Age, grade, skill level, position, and goals for personalized coaching.</li>
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Connection Information:</strong> The contact details you choose to share with a coach when you send a connection request.</li>
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Communications:</strong> Any messages you send to coaches or our support team.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Globe size={24} style={iconStyle} />
              2. How We Use Your Information
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve our services.</li>
                <li>Facilitate connections and communication between players and coaches.</li>
                <li>Send you technical notices, updates, and support messages.</li>
                <li>Personalize your experience on our platform.</li>
                <li>Protect against fraudulent or illegal activity.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Lock size={24} style={iconStyle} />
              3. Cookies and Tracking
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                We use cookies and similar tracking technologies to track the activity on our service and hold certain information. Cookies are files with small amount of data which may include an anonymous unique identifier.
              </p>
              <p>
                You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. However, if you do not accept cookies, you may not be able to use some portions of our service.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <UserCheck size={24} style={iconStyle} />
              4. Third-Party Services
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                We may employ third-party companies and individuals to facilitate our service, provide the service on our behalf, or perform service-related services. These third parties have access to your Personal Information only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Firebase:</strong> For authentication and database management.</li>
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Resend:</strong> To send connection and account emails on our behalf.</li>
                <li><strong style={{ color: 'rgba(27,24,19,0.9)' }}>Google Analytics:</strong> To analyze how our service is used.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Shield size={24} style={iconStyle} />
              5. Your Rights
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                Depending on your location, you may have certain rights regarding your personal information, including:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>The right to access the personal information we hold about you.</li>
                <li>The right to request that we correct any inaccurate information.</li>
                <li>The right to request that we delete your personal information.</li>
                <li>The right to object to our processing of your information.</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3" style={sectionHeadingStyle}>
              <Mail size={24} style={iconStyle} />
              6. Contact Us
            </h2>
            <div className="space-y-4 leading-relaxed" style={bodyStyle}>
              <p>
                If you have any questions about this Privacy Policy, please contact us at:
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
