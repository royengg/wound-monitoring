"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";

export function WoundImage({
  src,
  alt,
  className = "max-h-72 object-contain w-full",
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground/40">
        <ImageIcon className="h-8 w-8 mb-2" />
        <p className="text-xs">Image unavailable</p>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
    />
  );
}
