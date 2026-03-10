# Learnings

## [2026-03-09] Session ses_32c4ddd96ffe0ZUHAbevBTdiXY — Initial Setup

### Project Context
- Package: `openclaw-newclaw-auth` (no npm scope, public)
- Target: OpenClaw plugin system — install via `openclaw plugins install`
- NewClaw API: OpenAI-compatible, `https://newclaw.ai/v1`, Bearer token auth
- Plugin entry: `openclaw.extensions` in package.json → `["./dist/index.js"]`
- Manifest: `openclaw.plugin.json` with `providers` array

### Key Architecture Decisions
- ESM only (`"type": "module"`) — no CommonJS
- TypeScript → tsup → ESM dist
- Local type definitions (NOT from `openclaw/plugin-sdk/*`) — ClawRouter pattern is safer
- Sub-providers (`newclaw-anthropic`, etc.) created ONLY when user configures specific key
- Model cache: `~/.openclaw/newclaw/models-cache.json` — NO API keys in cache
- Config injection: atomic write (tmp + rename) to `~/.openclaw/openclaw.json`
- Key resolution: `env var` → `api.config` → persisted `~/.openclaw/openclaw.json`

### Reference Plugins
- `@openclaw/copilot-proxy`: kind:"custom" auth pattern, ProviderAuthResult shape
- `@blockrun/clawrouter`: dynamic model injection + config write + atomic write pattern
- Google Gemini CLI Auth: `ctx.prompter.progress()` spinner usage

### Working Directory
`/Users/jalone/Desktop/Work/00Work/WorkSpace/AIPluginWorkspace/openclaw-newclaw-auth`

## [2026-03-10] Task 1: Project Scaffolding — COMPLETE
- package.json created: name=openclaw-newclaw-auth, type=module, main=dist/index.js
- openclaw.extensions: ["./dist/index.js"]
- tsconfig: target ES2022, module NodeNext, strict enabled
- npm install succeeded: 724 packages added
- tsc --noEmit: no errors
- All QA scenarios passed

## [2026-03-09] Task 3: npm Config + README — COMPLETE
- .npmrc: access=public
- README.md: install command + 5-provider table + env vars
- LICENSE: MIT 2026
- npm-publish-guide.md: created in .sisyphus/drafts/

## [2026-03-10] Task 2: Types + Constants — COMPLETE
- src/types.ts: 5 interfaces (NewClawModel, NewClawModelsResponse, ProviderKeyConfig, KeyResolution, ModelCache)
- src/constants.ts: PROVIDER_KEYS has 5 entries (anthropic, google, openai, xai, deepseek), REFRESH_INTERVAL_MS=21600000 (6 hours)
- Import statements use .js extension for NodeNext module resolution (critical for ESM)
- src/index.ts updated to export both types and constants (needed for tsup bundling)
- QA 1: TypeScript compilation—clean, no errors
- QA 2: Build and PROVIDER_KEYS verification—expected output matched (5 anthropic,google,openai,xai,deepseek)
- Evidence saved: .sisyphus/evidence/task-2-types-compile.txt, task-2-provider-keys.txt

## [2026-03-10] npm Publish 2FA 踩坑

### 问题
npm 新账户默认开启 2FA，`npm publish` 报 E403 Forbidden。

### 尝试过的方案（失败）
1. `npm login` → publish → E403（会话 token 没有 bypass 2FA 权限）
2. Granular Access Token → publish → E403（也没有 bypass 权限）

### 最终解决方案
- 创建 **Classic → Automation Token**（唯一能绕过 2FA 的 token 类型）
- 写入 `~/.npmrc`：`//registry.npmjs.org/:_authToken=npm_xxx`
- `npm publish` 成功

### 关键教训
- npm 的 3 种认证方式中，只有 Classic Automation Token 能 bypass 2FA
- Granular Token 看起来权限更细，但默认不能 bypass 2FA
- 新账户首次发布最容易踩这个坑
- **永远不要在聊天/代码中暴露 token**
