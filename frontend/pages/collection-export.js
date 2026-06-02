import React, { useContext, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { AuthContext } from '../context/AuthContext';
import { apiClient } from '../utils/apiClient';
import { fmt, fmtPeriod, fmtReference, fmtSubjects } from '../utils/formatters';
import CoinImagePlaceholder from '../components/CoinImagePlaceholder';
import { BrandMonogram } from '../components/BrandLockup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
const formatCurrency = (value, options = {}) => {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: options.currency || 'EUR',
  }).format(amount);
};
const formatDate = (value) => new Intl.DateTimeFormat('en-US').format(new Date(value));

export default function CollectionExportPage() {
  const router = useRouter();
  const { id } = router.query;
  const { user, isLoading } = useContext(AuthContext);
  const [collection, setCollection] = useState(null);
  const [customImages, setCustomImages] = useState({});

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!id || !user) return;
    apiClient.get(`/api/collections/${id}`).then(async data => {
      setCollection(data);
      try {
        const images = await apiClient.get(`/api/collections/${id}/entry-images`);
        const mapped = {};
        for (const [entryId, img] of Object.entries(images || {})) {
          const bust = img.updatedAt ? `?v=${new Date(img.updatedAt).getTime()}` : '';
          mapped[entryId] = {
            obverse: img.obverseImage ? `${API_URL}${img.obverseImage}${bust}` : null,
            reverse: img.reverseImage ? `${API_URL}${img.reverseImage}${bust}` : null
          };
        }
        setCustomImages(mapped);
      } catch {}
    }).catch(() => router.push('/collections'));
  }, [id, user, router]);

  if (!collection) {
    return <div className="min-h-screen bg-canvas flex items-center justify-center text-text-muted">Preparing export...</div>;
  }

  const stats = collection.statistics || {};
  const coverSrc = collection.image ? (collection.image.startsWith('/') ? `${API_URL}${collection.image}` : collection.image) : null;
  const catalogueReference = (coin) => {
    const ref = coin?.reference || coin?.references?.[0];
    return fmtReference(ref, coin?.title?.en) || '';
  };
  const coinImage = (entry, side) => {
    return customImages[entry._id]?.[side] || null;
  };
  const fieldRows = (rows) => rows.filter(([, value]) => value !== undefined && value !== null && value !== '');
  const coinTitle = (entry) => entry?.coin?.title?.en || entry?.name || '';
  const printCollection = () => {
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener('afterprint', restoreTitle);
    };

    document.title = '';
    window.addEventListener('afterprint', restoreTitle);
    window.print();
  };

  return (
    <div className="min-h-screen bg-canvas">
      <Head>
        <title>{collection.name} Export — NumisRoma</title>
      </Head>

      <style jsx global>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff !important; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-sheet { background: #fff !important; box-shadow: none !important; border: 0 !important; border-radius: 0 !important; margin: 0 !important; max-width: none !important; overflow: visible !important; padding: 0 !important; }
          .print-summary-page { break-inside: avoid-page; page-break-inside: avoid; break-after: page; page-break-after: always; }
          .print-overview { break-inside: avoid-page; page-break-inside: avoid; break-after: page; page-break-after: always; }
          .print-overview thead { display: table-header-group; }
          .print-overview-row { break-inside: avoid-page; page-break-inside: avoid; }
          .print-records { border: 0 !important; padding: 0 !important; }
          .print-records-title { margin: 0 0 4mm !important; font-size: 18pt !important; }
          .print-record-list { display: block !important; }
          .print-coin-record {
            border-radius: 0 !important;
            break-inside: avoid-page;
            page-break-inside: avoid;
            margin: 0 !important;
          }
          .print-coin-record + .print-coin-record {
            break-before: page;
            page-break-before: always;
          }
          .print-coin-header { padding: 3mm 4mm !important; }
          .print-coin-title { font-size: 18pt !important; line-height: 1.1 !important; }
          .print-coin-grid { display: grid !important; grid-template-columns: 56mm 1fr !important; }
          .print-coin-media { border-right: 1px solid #e8e0d0 !important; border-bottom: 0 !important; padding: 3mm !important; }
          .print-photo-grid { gap: 2mm !important; }
          .print-coin-meta { margin-top: 2.5mm !important; }
          .print-coin-meta > div { padding-bottom: 0.5mm !important; margin-bottom: 0.5mm !important; }
          .print-coin-body { padding: 3mm !important; gap: 3mm !important; }
          .print-section-heading { font-size: 9pt !important; margin-bottom: 1.5mm !important; }
          .print-field-grid { gap: 1.5mm !important; }
          .print-field { padding: 1.25mm !important; }
          .print-description-grid { gap: 3mm !important; }
          .print-long-data { margin-top: 0 !important; }
          .print-long-data h4 { margin-bottom: 0.5mm !important; font-size: 9pt !important; }
          .print-long-data p { line-height: 1.3 !important; }
          a[href]::after { content: none !important; }
          iframe[src*="ko-fi.com"],
          iframe[src*="storage.ko-fi.com"],
          [class*="floatingchat"],
          [class*="floating-chat"],
          [id*="kofi"] { display: none !important; }
        }
      `}</style>

      <div className="no-print sticky top-0 z-40 bg-surface/95 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href={`/collection-detail?id=${id}`} className="font-sans text-sm text-text-secondary hover:text-amber">Back to collection</Link>
          <p className="font-sans text-xs text-text-muted ml-auto">For a clean PDF, disable browser headers and footers in the print dialog.</p>
          <button onClick={printCollection} className="px-4 py-2 font-sans text-sm font-semibold rounded bg-amber text-[#fdf8f0] hover:bg-amber-hover shrink-0">
            Print / Save PDF
          </button>
        </div>
      </div>

      <main className="print-sheet max-w-6xl mx-auto my-8 bg-card border border-border rounded-md overflow-hidden shadow-sm">
        <div className="print-summary-page">
          <section className="grid grid-cols-1 md:grid-cols-[240px_1fr] border-b border-border">
            <div className="h-56 bg-surface-alt flex items-center justify-center">
              {coverSrc ? <img src={coverSrc} alt={collection.name} className="w-full h-full object-cover" /> : <BrandMonogram className="h-24 w-24" />}
            </div>
            <div className="p-8">
              <div className="flex items-center gap-3">
                <BrandMonogram className="h-9 w-9" />
                <p className="font-sans text-xs uppercase tracking-[0.2em] text-amber">NumisRoma Collection Archive</p>
              </div>
              <h1 className="font-display font-semibold text-5xl mt-3 text-text-primary">{collection.name}</h1>
              {collection.description && <p className="font-sans text-sm mt-4 max-w-3xl text-text-secondary">{collection.description}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
                {[
                  ['Coins', stats.totalCoins],
                  ['Estimated value', formatCurrency(stats.totalEstimatedValue)],
                  ['Purchase cost', formatCurrency(stats.totalPurchaseCost)],
                  ['Average value', formatCurrency(stats.averageCoinValue)]
                ].map(([label, value]) => (
                  <div key={label} className="p-3 border border-border bg-surface rounded">
                    <div className="font-display text-2xl text-amber">{value || 0}</div>
                    <div className="font-sans text-xs text-text-muted">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="p-8 border-b border-border">
            <h2 className="font-display font-semibold text-2xl mb-4">Collection Statistics</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Most represented issuer', fmt(stats.mostRepresentedEmperor)],
                ['Most represented mint', fmt(stats.mostRepresentedMint)],
                ['Oldest coin', coinTitle(stats.oldestCoin)],
                ['Newest coin', coinTitle(stats.newestCoin)],
                ['Most valuable coin', coinTitle(stats.mostValuableCoin)],
                ['Visibility', fmt(collection.visibility || (collection.isPublic ? 'Public' : 'Private'))]
              ].map(([label, value]) => (
                <div key={label} className="p-3 border border-border rounded bg-surface-alt">
                  <div className="font-sans text-xs text-text-muted">{label}</div>
                  <div className="font-sans text-sm font-semibold text-text-primary">{value || '-'}</div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="print-overview p-8">
          <h2 className="font-display font-semibold text-2xl mb-4">Coins Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-sans text-sm">
              <thead>
                <tr className="bg-surface-alt text-left">
                  {['Name', 'Authority', 'Period', 'Mint', 'Denomination', 'Material', 'Grade', 'Value'].map(header => (
                    <th key={header} className="p-3 border border-border text-text-secondary">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(collection.coins || []).map(entry => (
                  <tr key={entry._id} className="print-overview-row">
                    <td className="p-3 border border-border font-semibold">{entry.coin?.title?.en || entry.name}</td>
                    <td className="p-3 border border-border">{fmt(entry.coin?.authority?.issuer || entry.emperor)}</td>
                    <td className="p-3 border border-border">{fmtPeriod(entry.coin?.coinage?.date) || entry.dateOfIssue || '-'}</td>
                    <td className="p-3 border border-border">{fmt(entry.coin?.classification?.mint || entry.mint)}</td>
                    <td className="p-3 border border-border">{fmt(entry.coin?.classification?.denomination || entry.denomination)}</td>
                    <td className="p-3 border border-border">{fmt(entry.coin?.classification?.material || entry.material)}</td>
                    <td className="p-3 border border-border">{fmt(entry.grade) || '-'}</td>
                    <td className="p-3 border border-border">{entry.estimatedValue?.amount ? formatCurrency(entry.estimatedValue.amount, { currency: entry.estimatedValue.currency || undefined }) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="print-records p-8 border-t border-border">
          <h2 className="print-records-title font-display font-semibold text-2xl mb-5">Detailed Coin Records</h2>
          <div className="print-record-list space-y-8">
            {(collection.coins || []).map((entry, index) => {
              const coin = entry.coin || {};
              const obverse = coinImage(entry, 'obverse');
              const reverse = coinImage(entry, 'reverse');
              const reference = catalogueReference(coin);
              return (
                <article key={entry._id} className="print-coin-record border border-border rounded-md overflow-hidden bg-card break-inside-avoid">
                  <div className="print-coin-header p-5 bg-surface-alt border-b border-border flex items-start justify-between gap-4">
                    <div>
                      <p className="font-sans text-xs uppercase tracking-[0.16em] text-amber">Coin {index + 1}</p>
                      <h3 className="print-coin-title font-display font-semibold text-3xl mt-1 text-text-primary">{coin.title?.en || entry.name || 'Untitled coin'}</h3>
                      <p className="font-sans text-sm mt-1 text-text-secondary">
                        {[fmt(coin.authority?.issuer || entry.emperor), fmtPeriod(coin.coinage?.date), fmt(coin.classification?.mint || entry.mint)].filter(Boolean).join(' · ') || 'Catalog details unavailable'}
                      </p>
                    </div>
                    {reference && (
                      <div className="px-3 py-2 border border-border rounded bg-card font-sans text-sm font-semibold text-amber whitespace-nowrap">
                        {reference}
                      </div>
                    )}
                  </div>

                  <div className="print-coin-grid grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-0">
                    <div className="print-coin-media p-5 border-b lg:border-b-0 lg:border-r border-border bg-surface">
                      <div className="print-photo-grid grid grid-cols-2 gap-3">
                        {[
                          ['Obverse', obverse],
                          ['Reverse', reverse]
                        ].map(([label, src]) => (
                          <div key={label}>
                            <p className="font-sans text-xs font-semibold mb-1 text-text-muted">{label}</p>
                            <div className="aspect-square rounded border border-border bg-card flex items-center justify-center overflow-hidden">
                              {src ? (
                                <img src={src} alt={`${label} of ${coin.title?.en || entry.name}`} className="w-full h-full object-contain p-2" />
                              ) : <CoinImagePlaceholder label="No user photo" />}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="print-coin-meta mt-4 space-y-2 font-sans text-xs">
                        {fieldRows([
                          ['Weight', entry.weight ? `${entry.weight} g` : ''],
                          ['Diameter', entry.diameter ? `${entry.diameter} mm` : ''],
                          ['Thickness', entry.thickness ? `${entry.thickness} mm` : ''],
                          ['Axis', fmt(entry.axis)],
                          ['Shape', fmt(entry.shape)],
                          ['Grade', fmt(entry.grade)],
                          ['Patina', fmt(entry.patina)],
                          ['Authenticity', fmt(entry.authenticityStatus)]
                        ]).map(([label, value]) => (
                          <div key={label} className="flex justify-between gap-3 border-b border-border pb-1">
                            <span className="text-text-muted">{label}</span>
                            <span className="font-medium text-text-primary text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="print-coin-body p-5 space-y-5">
                      <div>
                        <h4 className="print-section-heading font-sans text-sm font-semibold mb-2 text-text-primary">Catalogue Information</h4>
                        <div className="print-field-grid grid grid-cols-2 md:grid-cols-3 gap-2 font-sans text-xs">
                          {fieldRows([
                            ['Authority', fmt(coin.authority?.issuer || entry.emperor)],
                            ['Dynasty', fmt(coin.authority?.dynasty || entry.dynasty)],
                            ['Date', fmtPeriod(coin.coinage?.date) || entry.dateOfIssue],
                            ['Mint', fmt(coin.classification?.mint || entry.mint)],
                            ['Denomination', fmt(coin.classification?.denomination || entry.denomination)],
                            ['Material', fmt(coin.classification?.material || entry.material)],
                            ['Subjects', fmtSubjects(coin.subjects)]
                          ]).map(([label, value]) => (
                            <div key={label} className="print-field p-2 border border-border rounded bg-surface-alt">
                              <div className="text-text-muted">{label}</div>
                              <div className="font-medium text-text-primary break-words">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="print-description-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="print-section-heading font-sans text-sm font-semibold mb-2 text-text-primary">Obverse</h4>
                          <dl className="space-y-2 font-sans text-xs">
                            {fieldRows([
                              ['Legend', entry.obverseLegend || coin.descriptions?.obverse?.legend],
                              ['Description', entry.obverseDescription || coin.descriptions?.obverse?.type],
                              ['Bust type', fmt(entry.bustType || coin.descriptions?.obverse?.portrait)],
                              ['Portrait direction', fmt(entry.portraitDirection)]
                            ]).map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-text-muted">{label}</dt>
                                <dd className="text-text-primary">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <div>
                          <h4 className="print-section-heading font-sans text-sm font-semibold mb-2 text-text-primary">Reverse</h4>
                          <dl className="space-y-2 font-sans text-xs">
                            {fieldRows([
                              ['Legend', entry.reverseLegend || coin.descriptions?.reverse?.legend],
                              ['Description', entry.reverseDescription || coin.descriptions?.reverse?.type],
                              ['Type', fmt(entry.reverseType)],
                              ['Symbol / deity / personification', fmt(entry.symbolDeityPersonification || coin.descriptions?.reverse?.portrait)]
                            ]).map(([label, value]) => (
                              <div key={label}>
                                <dt className="text-text-muted">{label}</dt>
                                <dd className="text-text-primary">{value}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      </div>

                      <div>
                        <h4 className="print-section-heading font-sans text-sm font-semibold mb-2 text-text-primary">Acquisition & Collection Data</h4>
                        <div className="print-field-grid grid grid-cols-2 md:grid-cols-3 gap-2 font-sans text-xs">
                          {fieldRows([
                            ['Acquisition date', entry.acquisitionDate ? formatDate(entry.acquisitionDate) : ''],
                            ['Purchase price', entry.purchasePrice?.amount ? formatCurrency(entry.purchasePrice.amount, { currency: entry.purchasePrice.currency }) : ''],
                            ['Estimated value', entry.estimatedValue?.amount ? formatCurrency(entry.estimatedValue.amount, { currency: entry.estimatedValue.currency }) : ''],
                            ['Seller', entry.seller],
                            ['Auction house', entry.auctionHouse],
                            ['Lot number', entry.lotNumber],
                            ['Invoice/ref.', entry.invoiceReferenceNumber],
                            ['Source type', fmt(entry.sourceType)],
                            ['Storage', fmt(entry.storageLocation)],
                            ['Rarity', fmt(entry.rarity)],
                            ['Tags', (entry.tags || []).map(fmt).join(', ')]
                          ]).map(([label, value]) => (
                            <div key={label} className="print-field p-2 border border-border rounded bg-surface-alt">
                              <div className="text-text-muted">{label}</div>
                              <div className="font-medium text-text-primary break-words">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {fieldRows([
                        ['References', [
                          entry.catalogReferences?.ric && `RIC ${fmt(entry.catalogReferences.ric)}`,
                          entry.catalogReferences?.rrcCrawford && `RRC/Crawford ${fmt(entry.catalogReferences.rrcCrawford)}`,
                          entry.catalogReferences?.sear && `Sear ${fmt(entry.catalogReferences.sear)}`,
                          entry.catalogReferences?.bmc && `BMC ${fmt(entry.catalogReferences.bmc)}`,
                          entry.catalogReferences?.cohen && `Cohen ${fmt(entry.catalogReferences.cohen)}`,
                          fmt(entry.catalogReferences?.other)
                        ].filter(Boolean).join('; ')],
                        ['Condition notes', entry.conditionNotes],
                        ['Provenance', entry.provenance],
                        ['Personal notes', entry.notes]
                      ]).map(([label, value]) => (
                        <div key={label} className="print-long-data">
                          <h4 className="font-sans text-sm font-semibold mb-1 text-text-primary">{label}</h4>
                          <p className="font-sans text-xs leading-relaxed text-text-secondary whitespace-pre-wrap">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}

CollectionExportPage.getLayout = (page) => page;
