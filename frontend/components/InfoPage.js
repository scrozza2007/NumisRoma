import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

const InfoPage = ({ title, eyebrow, description, children, cta }) => (
  <div className="min-h-screen bg-canvas">
    <Head>
      <title>{title} - NumisRoma</title>
      <meta name="description" content={description} />
    </Head>

    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
      <section className="border-b border-border pb-10 mb-10">
        <p className="font-sans text-xs font-medium tracking-widest uppercase mb-4 text-amber">
          {eyebrow}
        </p>
        <h1 className="font-display font-semibold text-[clamp(40px,6vw,68px)] text-text-primary mb-5">
          {title}
        </h1>
        <p className="font-sans text-base sm:text-lg text-text-secondary max-w-3xl leading-relaxed">
          {description}
        </p>
      </section>

      <div className="font-sans text-text-secondary leading-relaxed space-y-10">
        {children}
      </div>

      {cta && (
        <div className="mt-12 pt-8 border-t border-border flex flex-wrap gap-3">
          {cta.map(({ href, label, primary }) => (
            <Link
              key={href}
              href={href}
              className={`font-sans font-semibold px-5 py-2.5 text-sm rounded transition-colors duration-200 ${
                primary
                  ? 'bg-amber text-[#fdf8f0] hover:bg-amber-hover'
                  : 'border border-border-strong text-text-secondary hover:border-amber hover:text-text-primary'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      )}
    </main>
  </div>
);

export const InfoSection = ({ title, children }) => (
  <section>
    <h2 className="font-display font-semibold text-3xl text-text-primary mb-4">{title}</h2>
    <div className="space-y-4 text-sm sm:text-base">{children}</div>
  </section>
);

export const InfoGrid = ({ items }) => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {items.map(({ title, body }) => (
      <div key={title} className="border border-border bg-card rounded-lg p-5">
        <h3 className="font-display font-semibold text-2xl text-text-primary mb-2">{title}</h3>
        <p className="font-sans text-sm text-text-secondary leading-relaxed">{body}</p>
      </div>
    ))}
  </div>
);

export default InfoPage;
