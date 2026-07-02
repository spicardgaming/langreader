import Stripe from 'stripe';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  try {
    
    const body = await request.json();
    const { priceId, userId, email } = body;

    if (!priceId) {
      return NextResponse.json(
        { error: 'Price ID is required' },
        { status: 400 }
      );
    }

const mode = priceId === process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ? 'subscription' : 'payment';
console.log('priceId:', priceId, 'PRO_PRICE_ID:', process.env.STRIPE_PRO_PRICE_ID, 'mode:', mode);

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
