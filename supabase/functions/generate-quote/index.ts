import Anthropic from 'npm:@anthropic-ai/sdk@0.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { description, trade, masterId } = await req.json();

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! });

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `Te egy tapasztalt magyar ${trade ?? 'mesterember'} vagy, aki árajánlatokat készít.
Mindig reális, piaci árakkal dolgozz (2024-2025 magyarországi árak).
Válaszolj CSAK valid JSON tömbben, más szöveg nélkül.`,
      messages: [
        {
          role: 'user',
          content: `Magyar mesterember munkája: "${description}"

Generálj árajánlat tételeket. Válaszolj JSON tömbben:
[{"description": "string", "quantity": number, "unit": "db|ora|m|m2|m3|kg|liter", "unit_price": number, "type": "work|material", "vat_rate": 27}]

Fontos:
- Munkaerő típusnál type="work", unit="ora", reális óradíj
- Anyag típusnál type="material", reális anyagár
- 2-8 tétel legyen
- Árak Ft-ban (egész szám)`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response');

    let items;
    try {
      const jsonMatch = content.text.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      items = [];
    }

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
