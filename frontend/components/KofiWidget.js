import Script from 'next/script';
import { useEffect, useRef } from 'react';

const KOFI_USERNAME = process.env.NEXT_PUBLIC_KOFI_USERNAME || 'numisroma';

const KofiWidget = () => {
  const hasDrawnRef = useRef(false);

  const drawWidget = () => {
    if (hasDrawnRef.current || typeof window === 'undefined' || !window.kofiWidgetOverlay) return;
    if (window.__numisRomaKofiWidgetDrawn) {
      hasDrawnRef.current = true;
      return;
    }

    window.kofiWidgetOverlay.draw(KOFI_USERNAME, {
      type: 'floating-chat',
      'floating-chat.donateButton.text': 'Support Us',
      'floating-chat.donateButton.background-color': '#b7791f',
      'floating-chat.donateButton.text-color': '#fffaf0',
    });

    hasDrawnRef.current = true;
    window.__numisRomaKofiWidgetDrawn = true;
  };

  useEffect(() => {
    drawWidget();
  }, []);

  return (
    <Script
      src="https://storage.ko-fi.com/cdn/scripts/overlay-widget.js"
      strategy="afterInteractive"
      onLoad={drawWidget}
    />
  );
};

export default KofiWidget;
