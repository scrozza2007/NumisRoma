import React, { useMemo } from 'react';

const KofiPanel = ({ username }) => {
  const src = useMemo(() => {
    const safeUsername = encodeURIComponent(username || 'numisroma');
    return `https://ko-fi.com/${safeUsername}/?hidefeed=true&widget=true&embed=true&preview=true`;
  }, [username]);

  return (
    <div className="relative w-full min-h-[640px] h-[min(720px,78vh)] overflow-hidden rounded-md border border-border bg-surface shadow-sm">
      <iframe
        title="Support NumisRoma on Ko-fi"
        src={src}
        className="absolute inset-0 h-full w-full border-0"
        loading="lazy"
        allow="payment *"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
};

export default KofiPanel;
