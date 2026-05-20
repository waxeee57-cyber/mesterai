import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { audioUrl, jobId, masterId } = await req.json();

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    // Use Claude to structure the transcript into job data
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Te egy magyar mesterember asszisztens vagy.
          Az alábbi szöveges leírásból hozz létre strukturált munkafelvételt.
          A hangfelvétel szövege: "${audioUrl}"

          Válaszolj JSON formátumban:
          {
            "transcript": "a teljes szöveg",
            "suggested_title": "rövid munka cím",
            "suggested_description": "részletes leírás",
            "suggested_items": [{"description": "...", "quantity": 1, "unit": "db", "unit_price": 0, "type": "work"}]
          }`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');

    let parsed;
    try {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { transcript: content.text };
    } catch {
      parsed = { transcript: content.text };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
