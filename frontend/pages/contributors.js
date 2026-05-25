import React from 'react';
import InfoPage, { InfoGrid, InfoSection } from '../components/InfoPage';

const Contributors = () => (
  <InfoPage
    title="Contributors"
    eyebrow="Community"
    description="NumisRoma grows through collectors, enthusiasts, and researchers who care about Roman history, careful cataloging, and better digital tools for ancient coin study."
    cta={[
      { href: '/register', label: 'Join the Community', primary: true },
      { href: '/contact', label: 'Contact the Team' },
    ]}
  >
    <InfoSection title="Ways to Contribute">
      <p>Contributions can be small and still valuable: reporting a typo, suggesting a missing reference, improving a description, flagging confusing data, or sharing feedback about how collection documentation should work.</p>
      <p>The long-term vision is community-oriented. NumisRoma is not only a private collection tool; it is also intended to become a shared space for people who want Roman coinage to be easier to study and discuss.</p>
    </InfoSection>

    <InfoGrid
      items={[
        {
          title: 'Corrections',
          body: 'Send fixes for rulers, denominations, dates, legends, mints, descriptions, provenance notes, or reference details that need another look.',
        },
        {
          title: 'References',
          body: 'Recommend books, articles, museum records, or stable online resources that improve catalog quality.',
        },
        {
          title: 'Feedback',
          body: 'Tell us where cataloging a coin feels slow, confusing, incomplete, or surprisingly useful.',
        },
      ]}
    />

    <InfoSection title="Recognition">
      <p>As the project matures, we plan to add clearer contributor recognition for substantial catalog and research help. For now, the best first step is to contact us with the area where you would like to help.</p>
    </InfoSection>
  </InfoPage>
);

export default Contributors;
