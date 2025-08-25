import { useState } from 'react';
import { User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface CandidateImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export const CandidateImage = ({ src, alt, className = "" }: CandidateImageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Check if image source is valid
  const hasValidSrc = src && src.trim() !== '';

  if (!hasValidSrc || hasError) {
    return (
      <div className={`bg-muted flex items-center justify-center ${className}`}>
        <User className="w-1/3 h-1/3 text-muted-foreground" />
      </div>
    );
  }

  // Add cache busting parameter to prevent loading old images (but not for data URLs)
  const isDataUrl = src?.startsWith('data:');
  const cacheBustedSrc = hasValidSrc && !isDataUrl ? `${src}?t=${Date.now()}` : src;

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <Skeleton className={`absolute inset-0 ${className}`} />
      )}
      <img
        src={cacheBustedSrc}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};