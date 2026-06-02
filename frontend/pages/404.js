import React from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

const Custom404 = () => {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-canvas">
      <Head>
        <title>404 — Page Not Found | NumisRoma</title>
        <meta name="description" content="Page not found — NumisRoma Roman coinage catalog" />
      </Head>

      <div className="text-center max-w-md">
        <p className="font-mono text-sm font-medium mb-6 text-amber">404</p>
        <h1 className="font-display font-semibold mb-4 text-[clamp(32px,6vw,52px)] leading-[1.1] text-text-primary">
          Lost to History
        </h1>
        <p className="font-sans text-base mb-8 leading-relaxed text-text-secondary">
          This page has been lost to time, like a coin dropped in the Colosseum. Even Augustus couldn&apos;t find it now.
        </p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 font-sans text-sm border border-border rounded bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
          >
            ← Go back
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Custom404;
