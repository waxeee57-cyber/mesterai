'use client';

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-[#F97316] hover:bg-[#FB923C] text-white font-semibold px-5 py-2 rounded-xl transition-colors text-sm"
    >
      🖨️ PDF letöltés / Nyomtatás
    </button>
  );
}
