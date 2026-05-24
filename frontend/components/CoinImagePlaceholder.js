const CoinImagePlaceholder = ({ className = 'w-full h-full', label = 'No image' }) => (
  <div className={`flex items-center justify-center bg-surface ${className}`}>
    <img
      src="/images/coin-placeholder.svg"
      alt={label}
      className="w-full h-full object-contain"
      loading="lazy"
    />
  </div>
);

export default CoinImagePlaceholder;
