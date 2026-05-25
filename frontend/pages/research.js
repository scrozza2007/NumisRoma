import React from 'react';
import InfoPage, { InfoGrid, InfoSection } from '../components/InfoPage';

const Research = () => (
  <InfoPage
    title="Research"
    eyebrow="Catalog Standards"
    description="Research on NumisRoma is built around structured Roman numismatic data: detailed enough for collectors and researchers, but organized enough to be useful in a digital environment."
    cta={[
      { href: '/browse', label: 'Search Records', primary: true },
      { href: '/contact', label: 'Suggest a Correction' },
    ]}
  >
    <InfoSection title="What We Track">
      <p>Records can include ruler or issuing authority, denomination, mint, date, material, weight, diameter, legends, types, references, provenance, photographs, and collector notes. The goal is to support both identification and long-term collection documentation.</p>
      <p>Roman Republican and Imperial coinage is complex, and attribution can change as scholarship improves. We treat the catalog as living work, with room for refinement, correction, and better source alignment over time.</p>
    </InfoSection>

    <InfoGrid
      items={[
        {
          title: 'Identification',
          body: 'Records are organized around rulers, authorities, denominations, mints, dates, legends, types, and other details that help identify a coin.',
        },
        {
          title: 'Documentation',
          body: 'Collection entries can preserve provenance, references, measurements, photographs, and notes so important details are not scattered across separate tools.',
        },
        {
          title: 'Study',
          body: 'The platform is designed to make comparison and review easier, connecting historical context with practical collection management.',
        },
      ]}
    />

    <InfoSection title="Using NumisRoma Responsibly">
      <p>NumisRoma is a research and collection aid. It should be used alongside primary references, auction records, museum catalogs, and specialist publications, especially for high-value attribution, authenticity, or provenance work.</p>
    </InfoSection>
  </InfoPage>
);

export default Research;
