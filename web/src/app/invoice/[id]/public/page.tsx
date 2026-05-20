export const dynamic = 'force-dynamic';

import { createClient } from '@/lib/supabase/server';

// ─── Types ────────────────────────────────────────────────────────────────────

type InvoiceItem = {
  id: string;
  description: string;
  qty: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  total_net: number;
  total_gross: number;
};

type MasterRecord = {
  name: string;
  tax_number: string | null;
  address: string | null;
  bank_account: string | null;
  phone: string | null;
  tax_type: string | null;
  company_name: string | null;
};

type ClientRecord = {
  name: string;
  address: string | null;
  tax_number: string | null;
};

type InvoiceRecord = {
  id: string;
  invoice_number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  payment_method: string | null;
  total_net: number;
  total_vat: number;
  total_gross: number;
  notes: string | null;
  public_token: string | null;
  nav_id: string | null;
  items: InvoiceItem[] | null;
  clients: ClientRecord | null;
  masters: MasterRecord | null;
};

// ─── PrintButton (client sub-component) ──────────────────────────────────────

import PrintButton from './PrintButton';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('hu-HU');
}

function formatAmount(n: number): string {
  return `${Math.round(n).toLocaleString('hu-HU')} Ft`;
}

function isAamOrKata(taxType: string | null): boolean {
  return taxType === 'alanyi' || taxType === 'kata';
}

// ─── Error page ───────────────────────────────────────────────────────────────

function ErrorPage({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-8">
      <div className="text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Érvénytelen link</h1>
        <p className="text-gray-500 text-sm">{message}</p>
        <p className="text-xs text-gray-400 mt-6">
          Powered by <a href="https://mesterai.hu" className="text-[#F97316]">MesterAI</a> · mesterai.hu
        </p>
      </div>
    </main>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}

export default async function PublicInvoicePage({ params, searchParams }: Props) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <ErrorPage message="Hiányzó hozzáférési token. Kérje a számla kiállítóját a helyes link küldéséért." />;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('invoices')
    .select('*, clients(*), masters(name, tax_number, address, bank_account, phone, tax_type, company_name)')
    .eq('id', id)
    .single();

  if (error || !data) {
    return <ErrorPage message="A számla nem található." />;
  }

  const invoice = data as unknown as InvoiceRecord;

  if (!invoice.public_token || invoice.public_token !== token) {
    return <ErrorPage message="Érvénytelen hozzáférési token." />;
  }

  const master = invoice.masters;
  const client = invoice.clients;
  const sellerName = master?.company_name ?? master?.name ?? 'MesterAI Felhasználó';
  const aamOrKata = isAamOrKata(master?.tax_type ?? null);

  // Build items array — if stored as JSONB column
  const items: InvoiceItem[] = Array.isArray(invoice.items) ? invoice.items : [];

  return (
    <main className="min-h-screen bg-white print:bg-white">
      {/* Action bar — hidden on print */}
      <div className="print:hidden bg-gray-50 border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => history.back()}
          className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          ← Vissza
        </button>
        <div className="flex-1" />
        <PrintButton />
      </div>

      {/* Invoice body */}
      <div className="max-w-2xl mx-auto px-6 py-10 print:py-6 print:px-4">

        {/* ─── Header ────────────────────────────────────────────────── */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <div className="w-10 h-10 bg-[#F97316] rounded-lg flex items-center justify-center text-white font-black text-lg mb-3">
              M
            </div>
            <p className="font-bold text-gray-900 text-lg">{sellerName}</p>
            {master?.address && <p className="text-gray-500 text-sm mt-0.5">{master.address}</p>}
            {master?.tax_number && <p className="text-gray-500 text-sm">Adószám: {master.tax_number}</p>}
            {master?.phone && <p className="text-gray-500 text-sm">Tel: {master.phone}</p>}
          </div>
          <div className="text-right">
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">SZÁMLA</h1>
            <p className="text-[#F97316] font-bold text-lg mt-1">{invoice.invoice_number}</p>
            {invoice.nav_id && (
              <p className="text-gray-400 text-xs mt-1">NAV ID: {invoice.nav_id}</p>
            )}
          </div>
        </div>

        {/* ─── Meta row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4 mb-8 text-sm">
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Kiállítás dátuma</p>
            <p className="text-gray-900 font-medium">{formatDate(invoice.issue_date)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Fizetési határidő</p>
            <p className="text-gray-900 font-medium">{formatDate(invoice.due_date)}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-1">Fizetési mód</p>
            <p className="text-gray-900 font-medium">{invoice.payment_method ?? 'Átutalás'}</p>
          </div>
        </div>

        {/* ─── Seller / Buyer ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Eladó</p>
            <p className="font-bold text-gray-900">{sellerName}</p>
            {master?.address && <p className="text-gray-600 text-sm mt-0.5">{master.address}</p>}
            {master?.tax_number && (
              <p className="text-gray-500 text-xs mt-1">Adószám: {master.tax_number}</p>
            )}
            {master?.bank_account && (
              <p className="text-gray-500 text-xs">Bankszámlaszám: {master.bank_account}</p>
            )}
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Vevő</p>
            {client ? (
              <>
                <p className="font-bold text-gray-900">{client.name}</p>
                {client.address && <p className="text-gray-600 text-sm mt-0.5">{client.address}</p>}
                {client.tax_number && (
                  <p className="text-gray-500 text-xs mt-1">Adószám: {client.tax_number}</p>
                )}
              </>
            ) : (
              <p className="text-gray-400 text-sm">—</p>
            )}
          </div>
        </div>

        {/* ─── Items table ───────────────────────────────────────────── */}
        <div className="mb-6">
          {items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 text-gray-400 text-xs uppercase tracking-wide">
                  <th className="text-left pb-3 font-semibold w-2/5">Megnevezés</th>
                  <th className="text-right pb-3 font-semibold">Menny.</th>
                  <th className="text-right pb-3 font-semibold">Egység</th>
                  <th className="text-right pb-3 font-semibold">Egységár</th>
                  <th className="text-right pb-3 font-semibold">ÁFA%</th>
                  <th className="text-right pb-3 font-semibold">Összeg</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id ?? idx} className="border-b border-gray-100">
                    <td className="py-3 text-gray-900 font-medium">{item.description}</td>
                    <td className="py-3 text-right text-gray-700">{item.qty}</td>
                    <td className="py-3 text-right text-gray-700">{item.unit}</td>
                    <td className="py-3 text-right text-gray-700">{formatAmount(item.unit_price)}</td>
                    <td className="py-3 text-right text-gray-500">{item.vat_rate}%</td>
                    <td className="py-3 text-right text-gray-900 font-semibold">{formatAmount(item.total_gross)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Fallback if no items array — show description from notes
            <div className="border border-gray-200 rounded-xl p-4">
              <p className="text-gray-600 text-sm">{invoice.notes ?? 'Nincs tételes leírás.'}</p>
            </div>
          )}
        </div>

        {/* ─── Summary ───────────────────────────────────────────────── */}
        <div className="flex justify-end mb-8">
          <div className="w-64 text-sm">
            {!aamOrKata && (
              <>
                <div className="flex justify-between py-2 text-gray-500">
                  <span>Nettó összeg</span>
                  <span>{formatAmount(invoice.total_net)}</span>
                </div>
                <div className="flex justify-between py-2 text-gray-500">
                  <span>ÁFA</span>
                  <span>{formatAmount(invoice.total_vat)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between py-3 border-t-2 border-gray-900 font-black text-gray-900 text-base">
              <span>Bruttó összeg</span>
              <span>{formatAmount(invoice.total_gross)}</span>
            </div>
          </div>
        </div>

        {/* ─── AAM / KATA note ───────────────────────────────────────── */}
        {aamOrKata && (
          <div className="border border-gray-300 rounded-xl p-4 mb-6 text-sm text-gray-600 bg-gray-50">
            <strong>Megjegyzés:</strong>{' '}
            {master?.tax_type === 'kata'
              ? 'A számla kiállítója kisadózó (KATA). Az ügylet adómentes.'
              : 'Alanyi adómentes – AAM. A számla áfát nem tartalmaz.'}
          </div>
        )}

        {/* ─── Notes ─────────────────────────────────────────────────── */}
        {invoice.notes && items.length > 0 && (
          <div className="border border-gray-200 rounded-xl p-4 mb-6 text-sm text-gray-600">
            <strong className="text-gray-900">Megjegyzés:</strong> {invoice.notes}
          </div>
        )}

        {/* ─── Footer ────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 pt-6 text-center">
          <p className="text-xs text-gray-400">
            Powered by{' '}
            <a href="https://mesterai.hu" className="text-[#F97316] hover:underline">
              MesterAI
            </a>{' '}
            · mesterai.hu
          </p>
        </div>
      </div>
    </main>
  );
}
