import Image from 'next/image';

export const BrandMonogram = ({ className = 'h-10 w-10', priority = false }) => (
  <Image
    src="/brand/numisroma-monogram.svg"
    alt=""
    width={40}
    height={40}
    priority={priority}
    aria-hidden="true"
    className={`object-contain ${className}`}
  />
);

const BrandLockup = ({ stacked = false, priority = false, className = '' }) => (
  <span
    className={`inline-flex items-center ${
      stacked ? 'flex-col gap-3' : 'gap-2.5'
    } ${className}`}
  >
    <BrandMonogram
      priority={priority}
      className={stacked ? 'h-20 w-20' : 'h-10 w-10'}
    />
    <Image
      src="/brand/numisroma-wordmark.svg"
      alt="NumisRoma"
      width={171}
      height={40}
      priority={priority}
      sizes={stacked ? '171px' : '137px'}
      className={`${stacked ? 'h-10' : 'h-8'} w-auto object-contain`}
    />
  </span>
);

export default BrandLockup;
