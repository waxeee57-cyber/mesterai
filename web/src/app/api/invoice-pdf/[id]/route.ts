import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse('Unauthorized', { status: 401 });

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, clients(name, tax_number, address, phone, email), masters(name, company_name, tax_number, tax_type, address, bank_account, phone), invoice_items(*)')
    .eq('id', id)
    .single();

  if (!invoice) return new NextResponse('Not found', { status: 404 });

  const html = buildInvoiceHtml(invoice);

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function fmt(n: number) {
  return Math.round(n).toLocaleString('hu-HU') + ' Ft';
}
function fmtDate(s: string | null) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('hu-HU');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildInvoiceHtml(inv: any): string {
  const master = inv.masters ?? {};
  const client = inv.clients ?? {};
  const items: Array<{ description: string; quantity: number; unit: string; unit_price: number; vat_rate: number; total_net: number; total_gross: number }> = inv.invoice_items ?? [];
  const isAAM = master.tax_type === 'alanyi_mentes' || master.tax_type === 'kata';

  const payMethodLabel: Record<string, string> = { transfer: 'Átutalás', cash: 'Készpénz', card: 'Bankkártya' };

  const itemsRows = items.map(item => `
    <tr>
      <td>${escHtml(item.description)}</td>
      <td style="text-align:center">${item.quantity}</td>
      <td style="text-align:center">${escHtml(item.unit)}</td>
      <td style="text-align:right">${fmt(item.unit_price)}</td>
      <td style="text-align:center">${isAAM ? 'AAM' : item.vat_rate + '%'}</td>
      <td style="text-align:right">${fmt(item.total_gross)}</td>
    </tr>`).join('');

  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Számla ${escHtml(inv.invoice_number)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 44px; height: 44px; background: #F97316; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
    .logo-text { font-size: 22px; font-weight: 900; }
    .invoice-title { font-size: 28px; font-weight: 900; text-align: right; }
    .invoice-number { font-size: 14px; color: #666; text-align: right; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; padding: 24px; background: #f9f9f9; border-radius: 8px; }
    .party-label { font-size: 10px; font-weight: 700; color: #F97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .party-name { font-size: 16px; font-weight: 700; margin-bottom: 4px; }
    .party-detail { color: #555; margin-bottom: 2px; }
    .meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
    .meta-item { text-align: center; padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; }
    .meta-label { font-size: 10px; color: #666; text-transform: uppercase; }
    .meta-value { font-size: 14px; font-weight: 700; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #F97316; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; font-size: 12px; }
    tr:nth-child(even) td { background: #fafafa; }
    td:last-child, th:last-child { text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 32px; }
    .totals-box { width: 280px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f0f0f0; }
    .total-row.gross { font-size: 18px; font-weight: 900; color: #F97316; border-top: 2px solid #F97316; padding-top: 12px; border-bottom: none; }
    .notes { padding: 16px; background: #f9f9f9; border-radius: 6px; margin-bottom: 24px; }
    .notes-label { font-size: 10px; font-weight: 700; color: #666; text-transform: uppercase; margin-bottom: 6px; }
    .footer { text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #e5e5e5; padding-top: 16px; margin-top: 24px; }
    .print-btn { margin-top: 16px; padding: 8px 20px; background: #F97316; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 700; font-size: 13px; }
    @media print { .print-btn { display: none !important; } body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">M</div>
      <div>
        <div class="logo-text">MesterAI</div>
        <div style="font-size:11px;color:#666">mesterai.hu</div>
      </div>
    </div>
    <div>
      <div class="invoice-title">SZÁMLA</div>
      <div class="invoice-number">${escHtml(inv.invoice_number)}</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Eladó</div>
      <div class="party-name">${escHtml(master.company_name ?? master.name ?? '—')}</div>
      ${master.tax_number ? `<div class="party-detail">Adószám: ${escHtml(master.tax_number)}</div>` : ''}
      ${master.address ? `<div class="party-detail">${escHtml(master.address)}</div>` : ''}
      ${master.bank_account ? `<div class="party-detail">Bankszámla: ${escHtml(master.bank_account)}</div>` : ''}
      ${master.phone ? `<div class="party-detail">Tel: ${escHtml(master.phone)}</div>` : ''}
    </div>
    <div>
      <div class="party-label">Vevő</div>
      <div class="party-name">${escHtml(client.name ?? '—')}</div>
      ${client.tax_number ? `<div class="party-detail">Adószám: ${escHtml(client.tax_number)}</div>` : ''}
      ${client.address ? `<div class="party-detail">${escHtml(client.address)}</div>` : ''}
      ${client.phone ? `<div class="party-detail">Tel: ${escHtml(client.phone)}</div>` : ''}
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Kiállítás dátuma</div>
      <div class="meta-value">${fmtDate(inv.issue_date)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fizetési határidő</div>
      <div class="meta-value">${fmtDate(inv.due_date)}</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fizetési mód</div>
      <div class="meta-value">${escHtml(payMethodLabel[inv.payment_method] ?? inv.payment_method ?? '—')}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Leírás</th>
        <th style="text-align:center">Menny.</th>
        <th style="text-align:center">Egység</th>
        <th style="text-align:right">Egységár</th>
        <th style="text-align:center">ÁFA%</th>
        <th style="text-align:right">Összeg</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows || '<tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Nincs tétel</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Nettó összeg</span><span>${fmt(inv.total_net ?? 0)}</span></div>
      ${isAAM ? '' : `<div class="total-row"><span>ÁFA</span><span>${fmt((inv.total_gross ?? 0) - (inv.total_net ?? 0))}</span></div>`}
      <div class="total-row gross"><span>Bruttó összesen</span><span>${fmt(inv.total_gross ?? 0)}</span></div>
    </div>
  </div>

  ${isAAM ? '<div class="notes"><div class="notes-label">Megjegyzés</div><div>Alanyi adómentes az Áfa tv. 187. § (2) bek. alapján.</div></div>' : ''}
  ${inv.notes ? `<div class="notes"><div class="notes-label">Megjegyzés</div><div>${escHtml(inv.notes)}</div></div>` : ''}

  <div class="footer">
    <p>Generálva: MesterAI · mesterai.hu</p>
    <button class="print-btn" onclick="window.print()">🖨️ Nyomtatás / PDF mentés</button>
  </div>
</body>
</html>`;
}

function escHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
