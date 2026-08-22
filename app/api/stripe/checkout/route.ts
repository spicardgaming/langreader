import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {

    const body = await request.json();
    const { priceId, userId, email } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

    const isProPrice =
      priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_MONTHLY_PRICE_ID ||
      priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_YEARLY_PRICE_ID;
    const mode = isProPrice ? 'subscription' : 'payment';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/account?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      metadata: {
        userId,
      },
      subscription_data: mode === 'subscription' ? {
        metadata: {
          userId,
        },
      } : undefined,
      customer_email: email,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
        console.error('Error creating checkout session:', JSON.stringify(error));
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
