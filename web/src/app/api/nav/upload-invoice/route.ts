import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { tokenExchange, manageInvoice } from '@/lib/nav/client';
import { generateNavInvoiceXml } from '@/lib/nav/xml';
import type { NavCredentials, NavInvoiceData, NavLineItem } from '@/lib/nav/types';
import { passwordHash } from '@/lib/nav/crypto';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json() as { invoiceId: string };
    if (!invoiceId) {
      return NextResponse.json({ error: 'invoiceId required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Load master + NAV credentials
    const { data: master } = await supabase
      .from('masters')
      .select('id, name, company_name, tax_number, address, bank_account, tax_type, nav_username, nav_password_hash, nav_signature_key, nav_exchange_key, nav_environment')
      .eq('auth_id', user.id)
      .single();

    if (!master) return NextResponse.json({ error: 'Master not found' }, { status: 404 });
    if (!master.nav_username || !master.nav_password_hash || !master.nav_signature_key || !master.nav_exchange_key) {
      return NextResponse.json({ error: 'NAV credentials not configured' }, { status: 400 });
    }

    // Load invoice with items and client
    const { data: invoice } = await supabase
      .from('invoices')
      .select('*, clients(name, tax_number, address), invoice_items(*)')
      .eq('id', invoiceId)
      .eq('master_id', master.id)
      .single();

    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const taxNumber = (master.tax_number ?? '').replace(/-/g, '');
    const creds: NavCredentials = {
      username: master.nav_username,
      passwordHash: master.nav_password_hash,
      signatureKey: master.nav_signature_key,
      exchangeKey: master.nav_exchange_key,
      environment: (master.nav_environment as 'test' | 'prod') ?? 'test',
      taxNumber,
    };

    const isAAM = master.tax_type === 'alanyi_mentes' || master.tax_type === 'kata';
    const items = ((invoice.invoice_items ?? []) as Array<{
      description: string; quantity: number; unit: string; unit_price: number; vat_rate: number;
    }>).map((item, i): NavLineItem => ({
      lineNumber: i + 1,
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unitPrice: item.unit_price,
      vatRate: isAAM ? -1 : item.vat_rate,
      ...(isAAM ? { vatExemptionReason: 'TAM' } : {}),
    }));

    const clientData = invoice.clients as { name: string; tax_number?: string; address?: string } | null;
    const invoiceData: NavInvoiceData = {
      invoiceNumber: invoice.invoice_number,
      invoiceIssueDate: invoice.issue_date ?? new Date().toISOString().split('T')[0],
      invoiceDeliveryDate: invoice.completion_date ?? invoice.issue_date ?? new Date().toISOString().split('T')[0],
      paymentDate: invoice.due_date ?? new Date().toISOString().split('T')[0],
      paymentMethod: invoice.payment_method === 'cash' ? 'CASH' : invoice.payment_method === 'card' ? 'CARD' : 'TRANSFER',
      supplier: {
        taxNumber: master.tax_number ?? '',
        name: master.company_name ?? master.name,
        address: master.address ?? 'Magyarország',
        ...(master.bank_account ? { bankAccountNumber: master.bank_account } : {}),
      },
      customer: {
        name: clientData?.name ?? 'Ismeretlen',
        address: clientData?.address ?? 'Magyarország',
        ...(clientData?.tax_number ? { taxNumber: clientData.tax_number } : {}),
      },
      items,
      isSelfBilled: false,
      invoiceAppearance: 'ELECTRONIC',
      isAAM,
    };

    const invoiceXml = generateNavInvoiceXml(invoiceData);

    // Token exchange
    const { encodedExchangeToken } = await tokenExchange(creds);

    // Upload invoice
    const result = await manageInvoice(creds, encodedExchangeToken, invoiceXml, 'CREATE');

    // Update invoice with NAV transaction ID and status
    await supabase.from('invoices').update({
      nav_id: result.transactionId,
      nav_status: 'pending',
    }).eq('id', invoiceId);

    return NextResponse.json({ success: true, transactionId: result.transactionId, requestStatus: result.requestStatus });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
