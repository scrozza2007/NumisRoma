import React, { useEffect, useState } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from 'lucide-react';

const semanticClasses = {
  success: 'bg-success-bg border-success-border text-success-text',
  error:   'bg-error-bg border-error-border text-error-text',
  warning: 'bg-warning-bg border-warning-border text-warning-text',
  info:    'bg-warning-bg border-warning-border text-warning-text',
};

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

const NotificationToast = ({ message, type = 'info', duration = 3000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose?.(), 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const semanticClass = semanticClasses[type] || semanticClasses.info;
  const StatusIcon = icons[type] || icons.info;

  return (
    <div
      className={`fixed top-6 right-6 z-50 flex items-start gap-3 px-4 py-3 max-w-[360px] rounded border shadow-[0_4px_12px_rgba(46,40,32,0.10)] transition-all duration-300 ${semanticClass} ${
        isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <StatusIcon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="font-sans text-sm flex-1">{message}</p>
      <button
        onClick={() => { setIsVisible(false); setTimeout(() => onClose?.(), 300); }}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default NotificationToast;
