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

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <Skeleton className={`absolute inset-0 ${className}`} />
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onLoad={handleLoad}
        onError={handleError}
      />
    </div>
  );
};