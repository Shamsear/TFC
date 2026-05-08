/**
 * Player Card Image Component
 * Automatically uses CDN URLs in production and local URLs in development
 */

import Image from 'next/image';
import { getPlayerCardUrl } from '@/lib/image-cdn';

interface PlayerCardImageProps {
  filename: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

export default function PlayerCardImage({
  filename,
  alt,
  width = 300,
  height = 400,
  className = '',
  priority = false,
}: PlayerCardImageProps) {
  const imageUrl = getPlayerCardUrl(filename);

  return (
    <Image
      src={imageUrl}
      alt={alt}
      width={width}
      height={height}
      className={className}
      priority={priority}
      unoptimized // Since we're using external CDN
    />
  );
}
