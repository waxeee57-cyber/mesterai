import { NextRequest, NextResponse } from 'next/server';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // HTML-based PDF that browsers can print
  const htmlContent = generateInvoiceHtml(id);

  return new NextResponse(htmlContent, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Invoice-Id': id,
    },
  });
}

function generateInvoiceHtml(invoiceId: string): string {
  return `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Számla</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #1a1a1a; background: #fff; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
    .logo { display: flex; align-items: center; gap: 12px; }
    .logo-icon { width: 44px; height: 44px; background: #F97316; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-size: 20px; }
    .logo-text { font-size: 22px; font-weight: 900; }
    .invoice-title { font-size: 28px; font-weight: 900; text-align: right; }
    .invoice-number { font-size: 14px; color: #666; }
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
    .footer { text-align: center; color: #aaa; font-size: 10px; border-top: 1px solid #e5e5e5; padding-top: 16px; }
    @media print {
      body { padding: 20px; }
      button { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">
      <div class="logo-icon">M</div>
      <div>
        <div class="logo-text">MesterAI</div>
        <div style="font-size: 11px; color: #666;">mesterai.hu</div>
      </div>
    </div>
    <div>
      <div class="invoice-title">SZÁMLA</div>
      <div class="invoice-number" id="invoice-number">Betöltés...</div>
    </div>
  </div>

  <div class="parties">
    <div>
      <div class="party-label">Eladó</div>
      <div class="party-name" id="seller-name">—</div>
      <div class="party-detail" id="seller-tax">—</div>
      <div class="party-detail" id="seller-address">—</div>
    </div>
    <div>
      <div class="party-label">Vevő</div>
      <div class="party-name" id="buyer-name">—</div>
      <div class="party-detail" id="buyer-tax">—</div>
      <div class="party-detail" id="buyer-address">—</div>
    </div>
  </div>

  <div class="meta">
    <div class="meta-item">
      <div class="meta-label">Kiállítás dátuma</div>
      <div class="meta-value" id="issue-date">—</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fizetési határidő</div>
      <div class="meta-value" id="due-date">—</div>
    </div>
    <div class="meta-item">
      <div class="meta-label">Fizetési mód</div>
      <div class="meta-value" id="payment-method">—</div>
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
    <tbody id="items">
      <tr><td colspan="6" style="text-align:center;color:#aaa;padding:24px">Betöltés...</td></tr>
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-box">
      <div class="total-row"><span>Nettó összeg</span><span id="total-net">—</span></div>
      <div class="total-row"><span>ÁFA</span><span id="total-vat">—</span></div>
      <div class="total-row gross"><span>Bruttó összesen</span><span id="total-gross">—</span></div>
    </div>
  </div>

  <div id="tax-note" style="display:none" class="notes">
    <div class="notes-label">Megjegyzés</div>
    <div>Alanyi adómentes az Áfa tv. 187. § (2) bek. alapján.</div>
  </div>

  <div class="footer">
    <p>Generálva: MesterAI · mesterai.hu · Számlaszám: ${invoiceId}</p>
    <button onclick="window.print()" style="margin-top:12px;padding:8px 20px;background:#F97316;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:700">🖨️ Nyomtatás / PDF mentés</button>
  </div>

  <script>
    // In production this would fetch from Supabase
    document.getElementById('invoice-number').textContent = 'Számla #${invoiceId}';
  </script>
</body>
</html>`;
}
