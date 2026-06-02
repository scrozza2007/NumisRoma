import React from 'react';
import Head from 'next/head';
import Link from 'next/link';
import KofiPanel from '../components/KofiPanel';

const KOFI_URL = process.env.NEXT_PUBLIC_KOFI_URL || 'https://ko-fi.com/numisroma';
const KOFI_USERNAME = process.env.NEXT_PUBLIC_KOFI_USERNAME || 'numisroma';

const Donate = () => {
  const supportAreas = [
    ['Hosting', 'Keeps the catalog fast, stable, and available.'],
    ['Images', 'Supports storage and delivery for clear coin references.'],
    ['Research', 'Helps fund ongoing catalog cleanup, enrichment, and tooling.'],
  ];

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>Donate - NumisRoma</title>
        <meta name="description" content="Support NumisRoma through Ko-fi." />
      </Head>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="grid lg:grid-cols-[1fr_440px] gap-10 lg:gap-14 items-start">
          <section>
            <p className="font-sans text-xs font-medium tracking-widest uppercase mb-4 text-amber">
              Support NumisRoma
            </p>
            <h1 className="font-display font-semibold text-[clamp(40px,6vw,72px)] text-text-primary mb-5">
              Keep Roman coin research open.
            </h1>
            <p className="font-sans text-base sm:text-lg text-text-secondary max-w-2xl leading-relaxed">
              NumisRoma is built for collectors, enthusiasts, and researchers who care about Roman Republican and Imperial coinage. Support through Ko-fi helps cover the practical work behind the platform.
            </p>

            <div className="grid sm:grid-cols-3 gap-5 mt-10 border-t border-border pt-8">
              {supportAreas.map(([title, body]) => (
                <div key={title}>
                  <h2 className="font-display font-semibold text-2xl text-text-primary">{title}</h2>
                  <p className="font-sans text-sm text-text-secondary leading-relaxed mt-2">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-card border border-border rounded-lg p-5 sm:p-6">
            <h2 className="font-display font-semibold text-2xl text-text-primary mb-1">Support on Ko-fi</h2>
            <p className="font-sans text-sm text-text-muted mb-5">
              Use the embedded panel here, the floating Ko-fi button, or the fallback link if your browser blocks the embed.
            </p>

            <KofiPanel username={KOFI_USERNAME} />

            <a
              href={KOFI_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full py-2.5 font-sans text-sm font-semibold flex items-center justify-center gap-2 rounded-md border border-border-strong text-text-secondary hover:border-amber hover:text-text-primary transition-colors duration-150"
            >
              Open Ko-fi fallback page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H8m9 0v9" />
              </svg>
            </a>

            <p className="font-sans text-xs text-text-muted leading-relaxed mt-4">
              If the embedded panel does not load, the fallback opens your Ko-fi page in a new tab. Donations are optional and do not affect access to the core catalog or collection tools.
            </p>

            <div className="mt-6 pt-5 border-t border-border">
              <p className="font-sans text-sm text-text-secondary">
                Prefer to talk before supporting?
              </p>
              <Link href="/contact" className="inline-block mt-2 font-sans text-sm font-semibold text-amber hover:text-amber-hover">
                Contact NumisRoma
              </Link>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Donate;
