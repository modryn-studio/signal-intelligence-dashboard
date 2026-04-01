// Pricing confirmed March 2026 — platform.claude.com/docs/en/about-claude/pricing
// Sonnet 4.6: $3/MTok input · $15/MTok output
// web_search_20250305 + web_search_20260209: $0.01 per search ($10/1,000)
// Tool use system prompt overhead (346 tokens) is already included in input_tokens by the SDK.

const INPUT_PER_TOKEN = 3 / 1_000_000;
const OUTPUT_PER_TOKEN = 15 / 1_000_000;
const WEB_SEARCH_PER_USE = 0.01;

interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  // Anthropic SDK populates this for server-side tools (web_search_20260209)
  server_tool_use?: { web_search_requests?: number };
}

/**
 * Logs a cost breakdown for a single Claude API call and returns cost in USD.
 */
export function logTokenCost(reqId: string, label: string, usage: TokenUsage): number {
  const tokenCost = usage.input_tokens * INPUT_PER_TOKEN + usage.output_tokens * OUTPUT_PER_TOKEN;
  const searches = usage.server_tool_use?.web_search_requests ?? 0;
  const searchCost = searches * WEB_SEARCH_PER_USE;
  const total = tokenCost + searchCost;

  const parts = [
    `${usage.input_tokens}in`,
    `${usage.output_tokens}out`,
    searches ? `${searches} search` : null,
  ]
    .filter(Boolean)
    .join(' + ');

  console.log(`[cost] ${reqId} ${label}: ${parts} = $${total.toFixed(5)}`);
  return total;
}
