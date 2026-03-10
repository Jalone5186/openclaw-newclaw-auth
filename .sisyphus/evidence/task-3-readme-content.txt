QA 1 - README has install command and all providers:
Command: grep -c "openclaw plugins install openclaw-newclaw-auth" README.md && grep -c "Claude" README.md && grep -c "Gemini" README.md && grep -c "DeepSeek" README.md

Output:
1   (install command count)
3   (Claude count)
3   (Gemini count)
2   (DeepSeek count)

All counts >= 1. PASS.
