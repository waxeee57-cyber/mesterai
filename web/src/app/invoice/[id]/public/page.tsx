interface Props { params: Promise<{ id: string }> }

export default async function PublicInvoice({ params }: Props) {
  const { id } = await params;
  return (
    <main className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-start mb-8">
          <div>
            <div className="w-10 h-10 bg-[#F97316] rounded-lg flex items-center justify-center text-white font-bold text-lg mb-2">M</div>
            <h1 className="text-2xl font-black text-gray-900">SZÁMLA</h1>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p>MesterAI által generált</p>
            <p>mesterai.hu</p>
          </div>
        </div>
        <div className="border border-gray-200 rounded-lg p-6 mb-6">
          <p className="text-gray-400 text-center py-8">Számla #{id} betöltése...</p>
        </div>
        <p className="text-center text-xs text-gray-400 mt-8">
          Powered by <a href="https://mesterai.hu" className="text-[#F97316]">MesterAI</a>
        </p>
      </div>
    </main>
  );
}
