import React from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';

const FollowModal = ({ title, isOpen, onClose, users, loading, onNavigate }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(46,40,32,0.6)]"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md max-h-[80vh] overflow-hidden bg-card border border-border rounded-lg">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display font-semibold text-xl text-text-primary">{title}</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-alt text-text-secondary hover:bg-border transition-colors duration-150"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-[calc(80vh-72px)] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-7 w-7 border-2 border-amber border-t-transparent mx-auto mb-2" />
              <p className="font-sans text-sm text-text-muted">Loading {title.toLowerCase()}…</p>
            </div>
          ) : users.length > 0 ? (
            <div>
              {users.map(u => (
                <div
                  key={u._id}
                  className="flex items-center gap-3 p-4 cursor-pointer transition-colors duration-100 border-b border-border hover:bg-surface-alt"
                  onClick={() => { onClose(); onNavigate(u._id); }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 bg-amber-bg">
                    {u.avatar ? (
                      <Image src={u.avatar} alt={u.username} width={36} height={36} className="rounded-full" />
                    ) : (
                      <span className="font-display font-semibold text-amber">{u.username.charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <p className="font-sans text-sm font-medium text-text-primary">{u.username}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center font-sans text-sm text-text-muted">
              {title === 'Followers' ? 'No followers yet' : 'Not following anyone yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FollowModal;
