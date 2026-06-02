import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';

const ProfileHeader = ({
  profile,
  collectionsCount,
  isOwnProfile,
  isPrivateGated,
  user,
  followLoading,
  chatLoading,
  isEditingBio,
  bioText,
  bioLoading,
  activeTab,
  onFollow,
  onChat,
  onSetActiveTab,
  onEditBioStart,
  onBioChange,
  onBioSave,
  onBioCancelEdit,
  onShowFollowers,
  onShowFollowing,
}) => {
  const router = useRouter();
  const followStatus = profile.followStatus ?? (profile.isFollowing ? 'accepted' : 'none');
  const pendingCount = profile.pendingFollowRequestsCount ?? 0;

  const followLabel = () => {
    if (followLoading) return null;
    if (followStatus === 'accepted') return 'Following';
    if (followStatus === 'pending') return 'Requested';
    return 'Follow';
  };

  return (
    <div className="-mt-24 md:-mt-32 overflow-hidden bg-card border border-border rounded-lg">
      <div className="p-6 md:p-8 flex flex-col md:flex-row">
        {/* Avatar */}
        <div className="flex justify-center md:justify-start">
          <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden flex items-center justify-center shrink-0 border-[3px] border-border bg-amber-bg">
            {profile.avatar ? (
              <Image src={profile.avatar} alt={profile.username} width={160} height={160} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display font-semibold text-5xl text-amber">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 mt-5 md:mt-0 md:ml-8 flex flex-col items-center md:items-start">
          <div className="flex flex-col md:flex-row md:items-center w-full gap-4">
            <div className="flex items-center gap-2">
              <h1 className="font-display font-semibold text-3xl text-center md:text-left text-text-primary">{profile.username}</h1>
              {profile.isPrivate && (
                <svg className="w-5 h-5 text-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              )}
            </div>

            {user && (
              <div className="flex gap-2 md:ml-auto flex-wrap justify-center">
                {isOwnProfile ? (
                  <>
                    <Link
                      href="/settings"
                      className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit Profile
                    </Link>
                    {pendingCount > 0 && (
                      <button
                        onClick={() => router.push('/follow-requests')}
                        className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {pendingCount} Requests
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      onClick={onFollow} disabled={followLoading}
                      className={`flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold rounded-md transition-colors duration-150 disabled:opacity-60 ${
                        followStatus === 'accepted'
                          ? 'border border-border bg-card text-text-secondary hover:bg-surface-alt'
                          : followStatus === 'pending'
                          ? 'border border-amber bg-amber-bg text-amber hover:bg-amber hover:text-[#fdf8f0]'
                          : 'bg-amber text-[#fdf8f0] hover:bg-amber-hover'
                      }`}
                    >
                      {followLoading ? (
                        <div className={`animate-spin w-4 h-4 rounded-full border-2 border-t-transparent ${followStatus === 'accepted' ? 'border-text-secondary' : 'border-white'}`} />
                      ) : (
                        <>
                          {followStatus === 'accepted' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          {followStatus === 'pending' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                          {followStatus === 'none' && (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                            </svg>
                          )}
                          {followLabel()}
                        </>
                      )}
                    </button>

                    {!isPrivateGated && (
                      <button
                        onClick={onChat} disabled={chatLoading}
                        className="flex items-center gap-1.5 px-4 py-2 font-sans text-sm font-semibold border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150 disabled:opacity-60"
                      >
                        {chatLoading ? (
                          <div className="animate-spin w-4 h-4 rounded-full border-2 border-text-secondary border-t-transparent" />
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        )}
                        {chatLoading ? 'Opening…' : 'Message'}
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <p className="font-sans text-xs mt-2 text-center md:text-left text-text-muted">
            Member since {new Date(profile.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>

          {/* Stats */}
          <div className="flex justify-center md:justify-start gap-8 mt-5 p-4 w-full md:w-auto bg-surface-alt border border-border rounded-md">
            {[
              { label: 'Followers', value: profile.followersCount || 0, onClick: onShowFollowers },
              { label: 'Following', value: profile.followingCount || 0, onClick: onShowFollowing },
              { label: 'Collections', value: collectionsCount },
            ].map(({ label, value, onClick }) => (
              <div
                key={label}
                className={`text-center ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={onClick}
              >
                <div className="font-display font-semibold text-2xl text-amber">{value}</div>
                <div className="font-sans text-xs uppercase tracking-wide mt-0.5 text-text-muted">{label}</div>
              </div>
            ))}
          </div>

          {/* Bio */}
          <div className="mt-5 p-4 w-full bg-surface-alt border border-border rounded-md">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-sans font-semibold text-sm text-text-primary">Bio</h3>
              {isOwnProfile && !isEditingBio && (
                <button onClick={onEditBioStart} className="text-text-muted hover:text-amber transition-colors duration-150">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              )}
            </div>

            {isEditingBio && isOwnProfile ? (
              <div>
                <textarea
                  value={bioText}
                  onChange={e => onBioChange(e.target.value)}
                  placeholder="Write something about yourself…"
                  maxLength={500}
                  rows={4}
                  className="w-full px-3 py-2 font-sans text-sm bg-canvas border border-border rounded-md outline-none focus:border-amber transition-colors duration-150 text-text-primary resize-none"
                />
                <div className="flex items-center justify-between mt-2">
                  <span className="font-sans text-xs text-text-muted">{bioText.length}/500 characters</span>
                  <div className="flex gap-2">
                    <button
                      onClick={onBioCancelEdit} disabled={bioLoading}
                      className="px-3 py-1.5 font-sans text-xs border border-border rounded-md bg-card text-text-secondary hover:border-border-strong transition-colors duration-150"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={onBioSave} disabled={bioLoading}
                      className="flex items-center gap-1 px-3 py-1.5 font-sans text-xs font-semibold rounded-md bg-amber text-[#fdf8f0] hover:bg-amber-hover transition-colors duration-150"
                    >
                      {bioLoading ? (
                        <><div className="animate-spin w-3 h-3 rounded-full border-2 border-white border-t-transparent" />Saving…</>
                      ) : 'Save'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className={`font-sans text-sm leading-relaxed whitespace-pre-wrap ${profile.bio ? 'text-text-secondary' : 'text-text-muted'}`}>
                {profile.bio || "This user hasn't added a bio yet."}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-t border-border">
        <div className="flex">
          {['collections', 'activity'].map(tab => (
            <button
              key={tab}
              onClick={() => onSetActiveTab(tab)}
              className={`flex-1 py-3.5 px-6 font-sans text-sm font-medium text-center capitalize transition-all duration-150 ${
                activeTab === tab
                  ? 'text-amber border-b-2 border-amber'
                  : 'text-text-muted border-b-2 border-transparent hover:text-text-secondary'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
