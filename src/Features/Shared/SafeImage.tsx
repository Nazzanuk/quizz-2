'use client';

import { useState } from 'react';
import type { ImgHTMLAttributes } from 'react';

type SafeImageProps = ImgHTMLAttributes<HTMLImageElement>;

export default function SafeImage({ onError, ...props }: SafeImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <img
      {...props}
      onError={(e) => {
        setFailed(true);
        onError?.(e);
      }}
    />
  );
}
