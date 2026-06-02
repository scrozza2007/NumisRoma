import React, { useContext, useEffect } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Check, ChevronRight, LibraryBig, Search, UsersRound } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const steps = [
  {
    number: 1,
    title: 'Browse the catalog',
    description: 'Search the catalog by issuer, dynasty, mint, material, or date range.',
    cta: 'Browse Catalog',
    href: '/browse',
    icon: <Search className="w-6 h-6" />,
  },
  {
    number: 2,
    title: 'Create your first collection',
    description: 'Group coins around a theme — an issuer, a period, coins you own, or anything else.',
    cta: 'Create Collection',
    href: '/new-collection',
    icon: <LibraryBig className="w-6 h-6" />,
  },
  {
    number: 3,
    title: 'Find other collectors',
    description: 'Follow collectors with similar interests, share your collection, and start conversations.',
    cta: 'Explore Collectors',
    href: '/community',
    icon: <UsersRound className="w-6 h-6" />,
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
        <ChevronRight className="w-5 h-5" />
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
              <Check className="w-8 h-8 text-amber" />
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
