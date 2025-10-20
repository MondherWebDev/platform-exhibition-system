"use client";
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function Logo() {
  const router = useRouter();

  const handleLogoClick = () => {
    router.push('/events');
  };

  return (
    <div className="fixed top-4 left-4 z-50">
      <button
        onClick={handleLogoClick}
        className="flex items-center space-x-2 hover:opacity-80 transition-opacity duration-200"
        title="Go to Events"
      >
        <div className="w-12 h-12 relative">
          <Image
            src="/QTM 2025 Logo-04.png"
            alt="QTM 2025 Logo"
            width={48}
            height={48}
            className="object-contain cursor-pointer"
            onError={(e) => {
              console.error('Logo failed to load:', e);
            }}
          />
        </div>
      </button>
    </div>
  );
}
