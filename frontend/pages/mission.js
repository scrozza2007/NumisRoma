import React from 'react';
import InfoPage, { InfoGrid, InfoSection } from '../components/InfoPage';

const Mission = () => (
  <InfoPage
    title="Our Mission"
    eyebrow="About NumisRoma"
    description="NumisRoma is a modern web platform dedicated to Roman numismatics, built to make the study and management of Roman Republican and Imperial coins more accessible, organized, and interactive."
    cta={[
      { href: '/browse', label: 'Browse the Catalog', primary: true },
      { href: '/contact', label: 'Share Feedback' },
    ]}
  >
    <InfoSection title="A Bridge Between Study and Technology">
      <p>NumisRoma was created for collectors, enthusiasts, and researchers who want a cleaner way to document, study, and understand ancient Roman coins. The platform combines the historical identity of Rome with a modern digital experience, turning traditional numismatic work into something easier to search, compare, organize, and share.</p>
      <p>The name reflects that identity: a combination of numismatics and Rome. It represents both the academic foundation of the project and the cultural world at its center.</p>
    </InfoSection>

    <InfoSection title="For Collections, Research, and Community">
      <p>The platform helps users catalog personal collections with detailed coin entries, including rulers, denominations, mints, dates, materials, weights, references, provenance, and photographs. It is designed to simplify collection documentation while preserving the depth and precision valued in traditional numismatics.</p>
      <p>Beyond collection management, NumisRoma aims to become a place where passion for Roman history and coinage can be shared with a wider community.</p>
    </InfoSection>

    <InfoGrid
      items={[
        {
          title: 'Roman Focus',
          body: 'The project is centered on Roman Republican and Imperial coinage, with tools and language shaped around ancient Roman numismatic study.',
        },
        {
          title: 'Detailed Records',
          body: 'Coin entries support the information collectors actually use: authority, denomination, mint, date, material, measurements, references, provenance, notes, and images.',
        },
        {
          title: 'Long-Term Vision',
          body: 'NumisRoma will continue expanding with new research tools, collection features, and community-oriented functions while staying focused on ancient Roman coins.',
        },
      ]}
    />

    <InfoSection title="Why It Matters">
      <p>Roman coins are historical documents in miniature. They preserve rulers, offices, mints, religious symbols, political messages, reforms, victories, and local identities. NumisRoma exists to help that material remain approachable without losing the seriousness of the field.</p>
    </InfoSection>
  </InfoPage>
);

export default Mission;
