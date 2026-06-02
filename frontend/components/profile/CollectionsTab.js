import React from 'react';
import Link from 'next/link';
import { ChevronRight, LibraryBig, Plus } from 'lucide-react';
import { BrandMonogram } from '../BrandLockup';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const CollectionsTab = ({ collections, profile, isOwnProfile }) => (
  <div className="mt-8 pb-16">
    <div className="flex justify-between items-center mb-6">
      <div>
        <h2 className="font-display font-semibold text-2xl text-text-primary">Collections</h2>
        <p className="font-sans text-sm mt-0.5 text-text-muted">Explore numismatic collections</p>
      </div>
      {isOwnProfile && (
        <Link
          href="/new-collection"
          className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
        >
          <Plus className="w-4 h-4" />
          New Collection
        </Link>
      )}
    </div>

    {collections.length > 0 ? (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {collections.map(col => (
          <Link
            key={col._id}
            href={`/collection-detail?id=${col._id}`}
            className="flex flex-col overflow-hidden transition-all duration-200 bg-card border border-border rounded-lg hover:border-amber"
          >
            <div className="relative h-44 overflow-hidden bg-surface-alt">
              {col.image ? (
                <img
                  src={col.image.startsWith('http') ? col.image : `${API_URL}${col.image}`}
                  alt={col.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  width={400} height={176}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-16 h-16 flex items-center justify-center rounded-full bg-amber-bg">
                    <BrandMonogram className="w-11 h-11" />
                  </div>
                </div>
              )}
              <div className="absolute top-3 left-3">
                <span className={`font-sans text-xs px-2 py-0.5 rounded border ${
                  col.isPublic
                    ? 'bg-success-bg text-success-text border-success-border'
                    : 'bg-surface-alt text-text-muted border-border'
                }`}>
                  {col.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>

            <div className="p-4 flex flex-col flex-1">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-display font-semibold text-base line-clamp-1 text-text-primary">{col.name}</h3>
                <ChevronRight className="w-4 h-4 shrink-0 ml-2 mt-0.5 text-text-muted" />
              </div>
              <p className="font-sans text-xs leading-relaxed line-clamp-2 mb-3 flex-1 text-text-secondary">
                {col.description || 'A collection of ancient Roman coins'}
              </p>
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 font-sans text-xs text-text-muted">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber" />
                  {col.coins?.length || 0} {col.coins?.length === 1 ? 'coin' : 'coins'}
                </div>
                <span className="font-sans text-xs text-text-muted">
                  {new Date(col.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    ) : (
      <div className="p-12 text-center bg-card border border-border rounded-lg">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full bg-amber-bg">
          <LibraryBig className="w-8 h-8 text-amber" />
        </div>

        <div className="flex justify-center gap-8 mb-6">
          {[
            { label: 'Collections', value: '0' },
            { label: 'Coins', value: '0' },
            { label: 'Member since', value: new Date(profile.createdAt).getFullYear() },
          ].map(({ label, value }) => (
            <div key={label} className="text-center">
              <div className="font-display font-semibold text-xl text-amber">{value}</div>
              <div className="font-sans text-xs uppercase tracking-wide mt-0.5 text-text-muted">{label}</div>
            </div>
          ))}
        </div>

        <h3 className="font-display font-semibold text-xl mb-2 text-text-primary">No Collections</h3>
        <p className="font-sans text-sm mb-6 max-w-md mx-auto text-text-muted">
          {isOwnProfile
            ? 'Start your numismatic journey by creating your first Roman coin collection!'
            : "This user hasn't created any collections yet."}
        </p>
        {isOwnProfile && (
          <Link
            href="/new-collection"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
          >
            <Plus className="w-4 h-4" />
            Create Your First Collection
          </Link>
        )}
      </div>
    )}
  </div>
);

export default CollectionsTab;
