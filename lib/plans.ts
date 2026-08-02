// Pricing. 1 token = 1 practice session ($2 value). Tokens never expire.
export const PLANS: Record<string, { cents: number; tokens: number; label: string }> = {
  single: { cents: 200, tokens: 0, label: "Single practice session" },
  pack10: { cents: 1000, tokens: 5, label: "5 practice tokens" },
  pack20: { cents: 2000, tokens: 10, label: "10 practice tokens (max)" },
};
