'use client';

import Image from 'next/image';
import { useTheme } from '~/lib/theme-context';

interface LogoProps {
  width?: number;
  height?: number;
  className?: string;
}

export default function Logo({ width = 150, height = 150, className = '' }: LogoProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {isDark ? (
        <Image
          src="/assets/images/logo_white.png"
          alt="Azotrace"
          width={width}
          height={height}
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      ) : (
        <Image
          src="/assets/images/logo.png"
          alt="Azotrace"
          width={width}
          height={height}
          style={{ width: 'auto', height: 'auto' }}
          priority
        />
      )}
    </div>
  );
}
