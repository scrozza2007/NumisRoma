import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';

const steps = [
  {
    number: 1,
    title: 'Browse the catalog',
    description: 'Search the catalog by issuer, dynasty, mint, material, or date range.',
    cta: 'Browse Catalog',
    href: '/browse',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: 'Create your first collection',
    description: 'Group coins around a theme — an issuer, a period, coins you own, or anything else.',
    cta: 'Create Collection',
    href: '/new-collection',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    number: 3,
    title: 'Find other collectors',
    description: 'Follow collectors with similar interests, share your collection, and start conversations.',
    cta: 'Explore Collectors',
    href: '/community',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const StepCard = ({ step }) => {
  const [hovered, setHovered] = React.useState(false);

  return (
    <Link
      href={step.href}
      className={`flex items-start gap-4 rounded-lg p-5 transition-all duration-200 border bg-card ${hovered ? 'border-amber shadow-md' : 'border-border shadow-sm'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${hovered ? 'bg-amber text-[#fdf8f0]' : 'bg-amber-bg text-amber'}`}>
        {step.icon}
      </div>
      <div className="flex-grow min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs font-semibold uppercase tracking-wide text-amber">
            Step {step.number}
          </span>
        </div>
        <h3 className="font-display font-semibold text-base mb-1 text-text-primary">
          {step.title}
        </h3>
        <p className="font-sans text-sm text-text-muted">
          {step.description}
        </p>
      </div>
      <div className={`flex-shrink-0 mt-1 transition-colors duration-200 ${hovered ? 'text-amber' : 'text-text-muted'}`}>
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
};

const Welcome = () => {
  const { user } = useContext(AuthContext);
  const router = useRouter();

  useEffect(() => {
    if (user === null) {
      router.replace('/login');
    }
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Head>
        <title>Welcome to NumisRoma</title>
      </Head>

      <main className="flex-grow flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-lg">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6 bg-amber-bg">
              <svg className="w-8 h-8 text-amber" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="font-display font-semibold text-3xl mb-3 text-text-primary">
              Welcome to NumisRoma, {user.username}!
            </h1>
            <p className="font-sans text-base text-text-secondary">
              Your account is ready. Here&apos;s how most collectors get started:
            </p>
          </div>

          <div className="space-y-3 mb-10">
            {steps.map((step) => (
              <StepCard key={step.number} step={step} />
            ))}
          </div>

          <div className="text-center">
            <Link
              href="/"
              className="font-sans text-sm text-text-muted hover:text-text-secondary transition-colors duration-200"
            >
              Skip for now — take me to the homepage
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Welcome;
