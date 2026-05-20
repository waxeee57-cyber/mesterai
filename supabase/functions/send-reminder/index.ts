const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { to, masterName, scheduledAt, address } = await req.json();

    const date = new Date(scheduledAt);
    const timeStr = date.toLocaleTimeString('hu-HU', { hour: '2-digit', minute: '2-digit' });
    const dateStr = date.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' });

    const message = `Kedves Ügyfél!\n\nEmlékzetet küldünk: ${dateStr} ${timeStr}-kor érkezem a ${address ?? 'megbeszélt helyszínre'}.\n\n${masterName}\nMesterAI`;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return new Response(JSON.stringify({ success: false, error: 'Twilio not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: to, From: fromNumber, Body: message }),
      }
    );

    if (!response.ok) throw new Error(`Twilio error: ${await response.text()}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
