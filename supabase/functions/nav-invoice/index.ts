import { createClient } from 'npm:@supabase/supabase-js@2';
import { crypto } from 'https://deno.land/std@0.177.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const NAV_BASE_URL = 'https://api.onlineszamla.nav.gov.hu/invoiceService/v3';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { invoiceId, masterId } = await req.json();

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, masters(*), clients(*), jobs(job_items(*))')
      .eq('id', invoiceId)
      .single();
    if (invErr || !invoice) throw new Error('Invoice not found');

    const master = invoice.masters;
    if (!master?.nav_token) throw new Error('NAV token not configured');

    await supabase.from('invoices').update({ nav_status: 'pending' }).eq('id', invoiceId);

    const requestId = crypto.randomUUID().replace(/-/g, '').toUpperCase().substring(0, 30);
    const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

    const tokenXml = `<?xml version="1.0" encoding="UTF-8"?>
<TokenExchangeRequest xmlns="http://schemas.nav.gov.hu/OSA/3.0/api">
  <header>
    <requestId>${requestId}</requestId>
    <timestamp>${timestamp}</timestamp>
    <requestVersion>3.0</requestVersion>
    <headerVersion>1.0</headerVersion>
  </header>
  <user>
    <login>${master.nav_token}</login>
    <passwordHash encryptionMethod="SHA-512"></passwordHash>
    <taxNumber>${master.tax_number ?? ''}</taxNumber>
    <requestSignature encryptionMethod="SHA3-512"></requestSignature>
  </user>
  <software>
    <softwareId>MESTERAI-001</softwareId>
    <softwareName>MesterAI</softwareName>
    <softwareOperation>ONLINE_SERVICE</softwareOperation>
    <softwareMainVersion>1.0</softwareMainVersion>
    <softwareDevName>MesterAI Kft.</softwareDevName>
    <softwareDevContact>dev@mesterai.hu</softwareDevContact>
    <softwareDevCountryCode>HU</softwareDevCountryCode>
    <softwareDevTaxNumber>00000000</softwareDevTaxNumber>
  </software>
</TokenExchangeRequest>`;

    const navResponse = await fetch(`${NAV_BASE_URL}/tokenExchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/xml', 'Accept': 'application/xml' },
      body: tokenXml,
    });

    if (!navResponse.ok) {
      await supabase.from('invoices').update({ nav_status: 'error' }).eq('id', invoiceId);
      throw new Error(`NAV error: ${navResponse.status}`);
    }

    await supabase.from('invoices').update({ nav_status: 'sent', nav_id: requestId }).eq('id', invoiceId);

    return new Response(JSON.stringify({ success: true, navRequestId: requestId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
