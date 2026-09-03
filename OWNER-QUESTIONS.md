# Owner questions — SEO-automation research, 2026-09-03

Each line is a question only the owner can answer because the answer
changes what the product promises. Grounds for each are in the evidence
file named; nothing here has been written into a requirement.

1. **Asynchronous AI Overviews.** DataForSEO returns `ai_overview: null` for an AI Overview Google serves asynchronously unless `load_async_ai_overview` is set, and says Google "frequently" serves them that way; fetching them costs at most one extra base price per SERP (free report worst case ~8.7¢ against the 12¢ cap). Should the free report buy them so "AI answers appear on N of your 12 biggest searches" counts Google's actual AI answers, or keep the 0¢ rule and have the card say it counts only answers Google had ready? — `registry/evidence/RESEARCH-dataforseo-endpoints.md` §2.3.

2. **Weekly movement per question.** Repeat runs of the same prompt agree on cited domains only 21% (ChatGPT) to 32% (AI Overviews) of the time, and the incumbents' own controlled experiment shows one run is equivalent to ten only when averaged over hundreds of prompts, not twelve. Should the paid product promise week-over-week movement on the AI-answers card and in "is it working", or promise presence over a window (e.g. cited in k of the last n weeks) and show movement only at the aggregate? — `registry/evidence/RESEARCH-ai-answer-stability.md` §4, §6.

3. **Google's own AI-visibility report.** Since 2026-08-31 Search Console reports, for every site worldwide, which of its URLs appeared in AI Overviews and AI Mode (impressions by page, country, device, date). Should ReachKit ask customers to connect Search Console and show Google's observed figure beside its own sampled one, a new customer-side dataset outside `BUILD.md` §6.3's closed list? — `registry/evidence/RESEARCH-competitor-visibility-measurement.md` §4.
