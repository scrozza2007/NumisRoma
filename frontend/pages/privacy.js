import React from 'react';
import InfoPage, { InfoSection } from '../components/InfoPage';

const Privacy = () => (
  <InfoPage
    title="Privacy Policy"
    eyebrow="Legal"
    description="This page explains what NumisRoma collects, why we collect it, and how we use it to operate the service."
    cta={[
      { href: '/contact', label: 'Contact Support', primary: true },
    ]}
  >
    <InfoSection title="Information We Collect">
      <p>
        We collect account details such as username, email address, password hash, profile information you choose to provide, collection data, wishlist data, messages, contact form submissions, and technical information needed to keep the service secure.
      </p>
    </InfoSection>

    <InfoSection title="How We Use It">
      <p>
        We use this information to provide accounts, collections, messaging, notifications, support, security checks, password resets, email verification, and product improvements.
      </p>
    </InfoSection>

    <InfoSection title="Payments">
      <p>
        Donations are processed by Ko-fi. NumisRoma does not store card numbers, payment credentials, or payment method details.
      </p>
    </InfoSection>

    <InfoSection title="Your Choices">
      <p>
        You can update your profile and privacy settings from your account. You can also request account deletion from the settings area or contact support if you need help.
      </p>
    </InfoSection>

    <InfoSection title="Contact">
      <p>
        For privacy questions, contact <a href="mailto:support@numisroma.com" className="text-amber hover:text-amber-hover">support@numisroma.com</a>.
      </p>
    </InfoSection>
  </InfoPage>
);

export default Privacy;
