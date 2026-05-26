import React, { useState, useEffect, useContext } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Image from 'next/image';
import { AuthContext } from '../context/AuthContext';
import { fmt, fmtPeriod } from '../utils/formatters';

const formatCatalogCount = (count) => {
  if (!Number.isFinite(count)) return 'Thousands';
  if (count >= 1000) return `${Math.floor(count / 1000).toLocaleString()}k+`;
  return count.toLocaleString();
};

const primaryCoinImage = (coin) =>
  coin?.images?.[0]?.files?.obverse || coin?.images?.[0]?.files?.unified || null;

const obverseBackdropImage = (coin) =>
  coin?.images?.find((image) => image.layout === 'split' && image.files?.obverse)?.files.obverse || null;

const backdropSlots = [
  { position: 'w-[53%] right-[1%] top-[18%]', opacity: 0.8 },
  { position: 'w-[43%] right-[36%] top-[4%]', opacity: 0.56 },
  { position: 'w-[46%] right-[34%] bottom-[0%]', opacity: 0.62 },
];

const Home = () => {
  const { user } = useContext(AuthContext);
  const [featuredCoins, setFeaturedCoins] = useState([]);
  const [backdropCoins, setBackdropCoins] = useState([]);
  const [catalogTotal, setCatalogTotal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRandomCoins = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const [featuredRes, backdropRes] = await Promise.all([
          fetch(`${apiUrl}/api/coins/random?limit=4`, {
            headers: { Accept: 'application/json' },
          }),
          fetch(`${apiUrl}/api/coins/random?limit=3&layout=split`, {
            headers: { Accept: 'application/json' },
          }),
        ]);
        if (!featuredRes.ok || !backdropRes.ok) throw new Error();
        const [data, backdropData] = await Promise.all([featuredRes.json(), backdropRes.json()]);
        const imageCoins = (data.results || []).filter(primaryCoinImage);
        const backdropEligibleCoins = (backdropData.results || []).filter(obverseBackdropImage);
        setFeaturedCoins(imageCoins.slice(0, 4));
        setBackdropCoins(backdropEligibleCoins.slice(0, 3));
        if (Number.isFinite(data.total)) setCatalogTotal(data.total);
      } catch {
        setFeaturedCoins([]);
        setBackdropCoins([]);
      } finally {
        setLoading(false);
      }
    };
    fetchRandomCoins();
  }, []);

  return (
    <div className="bg-canvas">
      <Head>
        <title>NumisRoma — Roman Republican and Imperial Coins Cataloged</title>
        <meta
          name="description"
          content="NumisRoma is a modern platform for Roman numismatics. Browse Roman Republican and Imperial coins, document your collection, and connect study with digital tools."
        />
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
      </Head>

      <main>
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="bg-surface border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 lg:py-32">
            <div className="grid lg:grid-cols-2 gap-16 items-center">

              {/* Left: editorial heading */}
              <div className="animate-fade-up">
                <div className="flex items-center gap-4 mb-7">
                  <Image
                    src="/brand/numisroma-monogram.svg"
                    alt=""
                    width={56}
                    height={56}
                    aria-hidden="true"
                    className="shrink-0 w-14 h-14 object-contain"
                  />
                  <p className="font-sans text-xs font-medium tracking-widest uppercase text-amber">
                    Roman Republican and Imperial Coinage
                  </p>
                </div>
                <h1
                  className="font-display font-semibold leading-none mb-8 text-text-primary"
                  style={{ fontSize: 'clamp(48px, 6vw, 80px)' }}
                >
                  Roman Coins.
                  <br />
                  Carefully Managed.
                  <br />
                  <span className="text-amber">Digitally Organized.</span>
                </h1>
                <p className="font-sans text-lg mb-10 max-w-md text-text-secondary" style={{ lineHeight: '1.7' }}>
                  Catalog and study Roman Republican and Imperial coins with structured records for rulers, denominations, mints, dates, materials, references, provenance, and photographs.
                </p>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={user ? '/new-collection' : '/register'}
                    className="font-sans font-semibold px-6 py-3 text-sm rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200"
                  >
                    {user ? 'Create a Collection' : 'Start for free'}
                  </Link>
                  <Link
                    href="/browse"
                    className="font-sans font-medium px-6 py-3 text-sm rounded border border-border-strong text-text-secondary hover:border-amber hover:text-text-primary transition-colors duration-200"
                  >
                    Browse the catalog →
                  </Link>
                  <Link
                    href="/donate"
                    className="font-sans font-medium px-6 py-3 text-sm rounded border border-border-strong text-text-secondary hover:border-amber hover:text-text-primary transition-colors duration-200"
                  >
                    Support NumisRoma
                  </Link>
                </div>

                {/* Social proof */}
                <div className="flex flex-wrap items-center gap-6 sm:gap-8 mt-12 pt-8 border-t border-border">
                  {[
                    { value: formatCatalogCount(catalogTotal), label: 'coins documented' },
                    { value: 'Republic', label: 'to Empire covered' },
                    { value: 'Modern', label: 'numismatic tools' },
                  ].map(({ value, label }) => (
                    <div key={label}>
                      <p className="font-display font-semibold text-2xl text-text-primary">{value}</p>
                      <p className="font-sans text-xs mt-0.5 text-text-muted">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: coin grid preview */}
              <div className="hidden lg:grid grid-cols-2 gap-3">
                {loading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-md animate-pulse bg-surface-alt" />
                    ))
                  : featuredCoins.slice(0, 4).map((coin) => (
                      <Link
                        key={coin._id}
                        href={`/coin-detail?id=${coin._id}`}
                        className="group relative aspect-square rounded-md overflow-hidden bg-surface border border-border"
                      >
                        <Image
                          src={primaryCoinImage(coin) || '/images/coin-placeholder.svg'}
                          alt={coin.title?.en || coin.name || 'Coin'}
                          fill
                          className="object-contain p-5 mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                          unoptimized
                        />
                        <div className="absolute inset-x-0 bottom-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          style={{ background: 'linear-gradient(to top, rgba(46,40,32,0.85), transparent)' }}
                        >
                          <p className="font-sans text-xs font-medium truncate text-[#fdf8f0]">{fmt(coin.authority?.issuer)}</p>
                          <p className="font-sans text-xs truncate text-[#e8d8b0]">{coin.title?.en}</p>
                        </div>
                      </Link>
                    ))
                }
              </div>
            </div>
          </div>
        </section>

        {/* ── Catalog preview ───────────────────────────────────────── */}
        <section className="py-12 sm:py-20 bg-card border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-10">
              <div>
                <p className="font-sans text-xs font-medium tracking-widest uppercase mb-3 text-amber">
                  From the catalog
                </p>
                <h2 className="font-display font-semibold text-4xl text-text-primary">
                  A glimpse inside
                </h2>
              </div>
              <Link
                href="/browse"
                className="font-sans text-sm font-medium text-amber hover:text-amber-hover transition-colors duration-200 hidden sm:block"
              >
                View all coins →
              </Link>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-md animate-pulse bg-surface-alt" style={{ aspectRatio: '3/4' }} />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {featuredCoins.map((coin) => (
                  <Link
                    key={coin._id}
                    href={`/coin-detail?id=${coin._id}`}
                    className="group rounded-md overflow-hidden border border-border bg-card hover:shadow-md transition-shadow duration-200"
                  >
                    <div className="aspect-square relative bg-surface">
                      <Image
                        src={primaryCoinImage(coin) || '/images/coin-placeholder.svg'}
                        alt={coin.title?.en || coin.name || 'Coin'}
                        fill
                        className="object-contain p-5 mix-blend-multiply"
                        unoptimized
                      />
                    </div>
                    <div className="p-4 border-t border-border">
                      <p className="font-sans text-xs font-medium uppercase tracking-wide mb-1 text-text-muted">
                        {fmt(coin.authority?.issuer)}
                      </p>
                      <h3 className="font-display font-semibold text-base leading-tight mb-1 line-clamp-2 text-text-primary">
                        {coin.title?.en || coin.name}
                      </h3>
                      <p className="font-sans text-xs text-text-muted">
                        {fmtPeriod(coin.coinage?.date)}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="text-center mt-8 sm:hidden">
              <Link href="/browse" className="font-sans text-sm font-medium text-amber">
                View all coins →
              </Link>
            </div>
          </div>
        </section>

        {/* ── Coins image section ───────────────────────────────────── */}
        <section className="relative overflow-hidden h-[300px] sm:h-[380px] md:h-[480px] bg-surface">
          <div
            className="absolute inset-0 z-10"
            style={{ background: 'linear-gradient(to right, #fdf8f0 0%, #fdf8f0 43%, rgba(253,248,240,0.94) 51%, rgba(253,248,240,0.38) 68%, rgba(253,248,240,0.08) 83%)' }}
          />
          <div className="absolute inset-0 bg-surface-alt" aria-hidden="true">
            <div className="absolute hidden sm:block inset-y-0 right-[0%] w-[60%] md:right-[2%] md:w-[57%] lg:right-[max(calc((100vw-80rem)/2 + 10px),10px)] lg:w-[56%]">
              {backdropCoins.map((coin, index) => (
                <div
                  key={coin._id}
                  className={`absolute aspect-square ${backdropSlots[index].position}`}
                >
                  <Image
                    src={obverseBackdropImage(coin)}
                    alt=""
                    fill
                    unoptimized
                    className="object-contain mix-blend-multiply"
                    style={{
                      filter: 'sepia(0.06) saturate(0.9) contrast(1.04)',
                      opacity: backdropSlots[index].opacity,
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex items-center z-20">
            <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
              <p className="font-sans text-xs font-medium tracking-widest uppercase mb-4 text-amber">
                Republic — Empire
              </p>
              <h2
                className="font-display font-semibold mb-4 max-w-xl text-text-primary"
                style={{ fontSize: 'clamp(28px, 3.5vw, 48px)', lineHeight: '1.15' }}
              >
                A digital home for Roman numismatics
              </h2>
              <p className="font-sans text-base max-w-sm text-text-secondary" style={{ lineHeight: '1.7' }}>
                Built for collectors, enthusiasts, and researchers who want ancient coins documented with clarity and depth.
              </p>
            </div>
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────── */}
        <section className="py-12 sm:py-20 bg-canvas border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  n: '01',
                  title: 'Study Roman coinage',
                  body: 'Search Roman Republican and Imperial coin records by issuer, dynasty, mint, material, denomination, and date range.',
                },
                {
                  n: '02',
                  title: 'Document your collection',
                  body: 'Create detailed entries with measurements, references, provenance, photographs, condition notes, and personal observations.',
                },
                {
                  n: '03',
                  title: 'Connect with a community',
                  body: 'Share public collections, follow other collectors, and help build a focused space for Roman history and numismatics.',
                },
              ].map(({ n, title, body }) => (
                <div key={n} className="flex flex-col gap-4">
                  <span className="font-mono text-sm font-medium text-amber">{n}</span>
                  <div className="w-8 h-px bg-amber opacity-40" />
                  <h3 className="font-display font-semibold text-2xl text-text-primary">{title}</h3>
                  <p className="font-sans text-sm leading-relaxed text-text-secondary">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA band (logged-out only) ────────────────────────────── */}
        {!user && (
          <section className="py-12 sm:py-20 bg-surface-alt border-t-2 border-amber">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center">
              <p className="font-sans text-xs font-medium tracking-widest uppercase mb-4 text-amber">
                Join NumisRoma
              </p>
              <h2
                className="font-display font-semibold mb-4 text-text-primary"
                style={{ fontSize: 'clamp(28px, 4vw, 44px)' }}
              >
                Bring your Roman coin collection online.
              </h2>
              <p className="font-sans text-lg mb-10 mx-auto max-w-md text-text-secondary">
                A clean, structured workspace for documenting, studying, and sharing ancient Roman coins.
              </p>
              <Link
                href="/register"
                className="font-sans font-semibold px-8 py-3.5 text-sm rounded inline-block bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-200"
              >
                Create your free account
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
};

export default Home;
