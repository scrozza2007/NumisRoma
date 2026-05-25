import React from 'react';
import InfoPage, { InfoSection } from '../components/InfoPage';

const Terms = () => (
  <InfoPage
    title="Terms of Use"
    eyebrow="Legal"
    description="These terms describe the basic rules for using NumisRoma and participating in the community."
    cta={[
      { href: '/register', label: 'Create an Account', primary: true },
      { href: '/contact', label: 'Ask a Question' },
    ]}
  >
    <InfoSection title="Using the Service">
      <p>
        Use NumisRoma lawfully and respectfully. Do not abuse accounts, messaging, uploads, contact forms, or any feature intended for collectors and researchers.
      </p>
    </InfoSection>

    <InfoSection title="Catalog Information">
      <p>
        Catalog records are provided for research and collection management. We work for accuracy, but numismatic attribution can be uncertain and may change. Do not rely on NumisRoma alone for purchase, sale, authentication, legal, or financial decisions.
      </p>
    </InfoSection>

    <InfoSection title="User Content">
      <p>
        You are responsible for the collections, profile details, messages, and images you add. Do not upload content you do not have the right to use or content that violates another person&apos;s privacy or rights.
      </p>
    </InfoSection>

    <InfoSection title="Accounts">
      <p>
        Keep your login credentials secure. We may limit or remove access for abuse, spam, security risks, or behavior that harms the community.
      </p>
    </InfoSection>

    <InfoSection title="Contact">
      <p>
        Questions about these terms can be sent to <a href="mailto:support@numisroma.com" className="text-amber hover:text-amber-hover">support@numisroma.com</a>.
      </p>
    </InfoSection>
  </InfoPage>
);

export default Terms;
