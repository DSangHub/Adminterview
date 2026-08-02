import { NextRequest, NextResponse } from "next/server";
import { addTokens } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Production-correct crediting: Stripe calls this after a successful
// payment. We read the plan metadata and add the tokens to the wallet.
// Configure in Stripe Dashboard -> Developers -> Webhooks:
//   endpoint: https://<your-app>/api/stripe/webhook
//   event:    checkout.session.completed
//   secret:   STRIPE_WEBHOOK_SECRET (add to env)
export async function POST(req: NextRequest) {
  const KEY = process.env.STRIPE_SECRET_KEY;
  const WH = process.env.STRIPE_WEBHOOK_SECRET;
  if (!KEY || !WH) return NextResponse.json({ ok: true, skipped: "stripe not configured" });

  try {
    const Stripe = (await import("stripe")).default as any;
    const stripe = new Stripe(KEY);
    const sig = req.headers.get("stripe-signature") as string;
    const raw = await req.text();
    const event = stripe.webhooks.constructEvent(raw, sig, WH);

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const email = s.metadata?.email;
      const tokens = parseInt(s.metadata?.tokens || "0", 10);
      if (email && tokens > 0) await addTokens(email, tokens);
    }
    return NextResponse.json({ received: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "webhook error" }, { status: 400 });
  }
}
