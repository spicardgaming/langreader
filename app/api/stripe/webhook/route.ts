import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';



export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const body = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing stripe-signature header' },
        { status: 400 }
      );
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        if (userId && session.mode === 'subscription') {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              period_start: new Date().toISOString(),
              chars_used: 0,
              stripe_subscription_id: session.subscription as string,
              subscription_cancel_at: null,
            })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile:', error);
          }
        }
        break;
      }

      // Fires whenever the subscription object changes — including when
      // cancel_at_period_end is toggled (whether via our /api/stripe/cancel
      // route or directly in the Stripe dashboard). This is the authoritative
      // source for "is this subscription scheduled to cancel, and when."
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;

        if (userId) {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const currentPeriodEnd =
            (subscription as any).items?.data?.[0]?.current_period_end ??
            (subscription as any).current_period_end;
          const cancelAt = subscription.cancel_at_period_end && currentPeriodEnd
            ? new Date(currentPeriodEnd * 1000).toISOString()
            : null;

          const { error } = await supabase
            .from('profiles')
            .update({ subscription_cancel_at: cancelAt })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile:', error);
          }
        }
        break;
      }

      // Fires when a subscription actually ends — either it was cancelled
      // immediately, or (the normal path now) it was scheduled to cancel at
      // period end via cancel_at_period_end and that period has now passed.
      // This is the single place where the downgrade to 'free' actually
      // happens, so the person keeps Pro access for any time they already paid for.
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Retrieve the subscription to get metadata
        const fullSubscription = await stripe.subscriptions.retrieve(subscription.id);
        const userId = fullSubscription.metadata?.userId;

        if (userId) {
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          );

          const { error } = await supabase
            .from('profiles')
            .update({
              plan: 'free',
              stripe_subscription_id: null,
              subscription_cancel_at: null,
            })
            .eq('id', userId);

          if (error) {
            console.error('Error updating profile:', error);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}