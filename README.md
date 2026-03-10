# openclaw-newclaw-auth

OpenClaw plugin that registers NewClaw AI as a provider, with an interactive auth wizard and dynamic model fetching for all major LLM providers.

## Install

```bash
openclaw plugins install openclaw-newclaw-auth
```

## Quick Setup

Run the auth wizard after installing:

```bash
openclaw auth newclaw
```

The wizard asks for your universal `NEWCLAW_API_KEY` first (required). Then you can optionally add provider-specific keys if you want to route requests to a specific underlying model provider (Claude, Gemini, GPT, etc.). If you skip provider keys, NewClaw routes automatically.

## Provider-Specific Keys

| Provider | Env Variable | Description |
|---|---|---|
| Claude / Claude Code | `NEWCLAW_ANTHROPIC_KEY` | Anthropic-specific key |
| Gemini | `NEWCLAW_GOOGLE_KEY` | Google-specific key |
| GPT / Codex | `NEWCLAW_OPENAI_KEY` | OpenAI-specific key |
| Grok | `NEWCLAW_XAI_KEY` | xAI-specific key |
| DeepSeek | `NEWCLAW_DEEPSEEK_KEY` | DeepSeek-specific key |

All provider-specific keys are optional.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEWCLAW_API_KEY` | Yes | Universal NewClaw API key |
| `NEWCLAW_ANTHROPIC_KEY` | No | Routes to Anthropic (Claude) |
| `NEWCLAW_GOOGLE_KEY` | No | Routes to Google (Gemini) |
| `NEWCLAW_OPENAI_KEY` | No | Routes to OpenAI (GPT/Codex) |
| `NEWCLAW_XAI_KEY` | No | Routes to xAI (Grok) |
| `NEWCLAW_DEEPSEEK_KEY` | No | Routes to DeepSeek |

## How It Works

NewClaw is an OpenAI-compatible platform hosted at `https://newclaw.ai`. The plugin fetches available models from `GET /v1/models` at startup and caches them for 6 hours before refreshing. This means you always get the current model list without manual updates.

Under the hood, the plugin registers a standard OpenClaw provider pointing at NewClaw's endpoint. Authentication flows through the wizard, which stores keys securely in your OpenClaw config.

## License

MIT
