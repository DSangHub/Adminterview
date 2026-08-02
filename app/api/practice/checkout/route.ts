import { NextRequest, NextResponse } from "next/server";
import { addTokens } from "@/lib/store";
import { PLANS } from "@/lib/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Create a Stripe Checkout for a single session or a token pack.
// If Stripe isn't configured, grants immediately (demo) so it's testable.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const plan = PLANS[String(body.plan || "single")] ? String(body.plan) : "single";
  const email = String(body.email || "").trim();
  const cfg = PLANS[plan];
  const KEY = process.env.STRIPE_SECRET_KEY;
  const base = process.env.NEXT_PUBLIC_BASE_URL || req.nextUrl.origin || "http://localhost:3000";

  // ----- demo mode (no Stripe key) -----
  if (!KEY) {
    if (cfg.tokens > 0) {
      if (!email) return NextResponse.json({ error: "email required to buy tokens" }, { status: 400 });
      const balance = await addTokens(email, cfg.tokens);
      return NextResponse.json({ demo: true, granted: cfg.tokens, balance });
    }
    return NextResponse.json({ demo: true }); // single -> start free
  }

  // ----- real Stripe checkout -----
  try {
    const Stripe = (await import("stripe")).default as any;
    const stripe = new Stripe(KEY);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      metadata: { plan, email, tokens: String(cfg.tokens) },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: cfg.cents,
            product_data: { name: `Adminterview — ${cfg.label}` },
          },
        },
      ],
      success_url: `${base}/practice?paid=1&plan=${plan}`,
      cancel_url: `${base}/practice?canceled=1`,
    });
    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "checkout failed" }, { status: 500 });
  }
}
