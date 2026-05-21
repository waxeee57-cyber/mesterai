'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-4">
      <div className="bg-[#1A1A1A] border border-[#2A2A2A] rounded-[16px] p-8 max-w-md w-full text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-xl font-bold text-[#F5F5F5] mb-2">Valami hiba történt</h2>
        <p className="text-[#A3A3A3] text-sm mb-6 break-words">
          {error.message || 'Ismeretlen hiba'}
        </p>
        <button
          onClick={reset}
          className="bg-[#F97316] hover:bg-[#FB923C] text-white font-bold py-2.5 px-6 rounded-[12px] transition-colors"
        >
          Újrapróbálkozás
        </button>
      </div>
    </div>
  );
}
