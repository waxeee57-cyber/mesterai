import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@17';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!);
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
  const signature = req.headers.get('stripe-signature');

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    return new Response(`Webhook error: ${err}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  const getTierFromPriceId = (priceId: string): string => {
    const proMonthly = Deno.env.get('STRIPE_PRICE_PRO_MONTHLY');
    const proYearly = Deno.env.get('STRIPE_PRICE_PRO_YEARLY');
    const bizMonthly = Deno.env.get('STRIPE_PRICE_BIZ_MONTHLY');
    const bizYearly = Deno.env.get('STRIPE_PRICE_BIZ_YEARLY');
    if (priceId === proMonthly || priceId === proYearly) return 'pro';
    if (priceId === bizMonthly || priceId === bizYearly) return 'business';
    return 'free';
  };

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

        await supabase.from('masters').update({
          subscription_tier: tier,
          subscription_expires_at: expiresAt,
          stripe_customer_id: customerId,
        }).eq('stripe_customer_id', customerId);

        await supabase.from('subscription_events').insert({
          event_type: 'checkout.completed',
          tier,
          stripe_payment_intent_id: session.payment_intent as string,
        });
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0]?.price.id;
        const tier = getTierFromPriceId(priceId);
        const expiresAt = new Date(subscription.current_period_end * 1000).toISOString();

        await supabase.from('masters').update({
          subscription_tier: tier,
          subscription_expires_at: expiresAt,
        }).eq('stripe_customer_id', customerId);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase.from('masters').update({
          subscription_tier: 'free',
          subscription_expires_at: null,
        }).eq('stripe_customer_id', customerId);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
