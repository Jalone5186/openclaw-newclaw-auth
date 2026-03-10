# 约定
- 用简体中文与我交互，用英文与大模型交互
- 开发过程中发现以下关键信息时，必须追加到本文件对应章节中持久化记录：
    - 项目新发现的约定、隐含规则、新增规范
    - 新需求带来的架构或模式变化
    - Bug 修复经验和踩坑记录
    - 新引入的依赖或工具的用法注意事项
    - 配置变更、环境差异（dev/test/prod）相关经验
    - 用户偏好：对代码风格、命名、架构方案的个人倾向和决策
    - 业务领域知识：项目特有的业务概念、术语、流程逻辑
    - 模块间隐含耦合：改 A 必须同步改 B 之类的依赖关系
    - 性能敏感点：慢查询、接口优化经验、SQL 写法注意事项
    - 第三方服务对接细节：外部 API 限制、签名规则、超时设置等实战经验
    - 数据库变更历史：手动加过的字段、索引、数据迁移脚本
    - 技术决策及原因：为什么选了方案 A 而不是 B，防止后续重复讨论

---

# AGENTS.md — openclaw-newclaw-auth

OpenClaw plugin: registers NewClaw AI as a provider with interactive auth wizard + dynamic model fetching.

## Build / Lint / Test Commands

```bash
npm run build          # tsup → dist/index.js + dist/index.d.ts (ESM)
npm run dev            # tsup --watch
npm run typecheck      # tsc --noEmit
npm run test           # vitest run (all tests)
npx vitest run src/__tests__/models.test.ts          # single test file
npx vitest run -t "fetchModels"                      # single test by name
npx vitest run src/__tests__/auth.test.ts -t "no vendor"  # file + name filter
npm pack --dry-run     # verify tarball contents before publish
```

## Project Structure

```
src/
  index.ts       — plugin entry: register(), boot sequence, config inject
  auth.ts        — buildAuth() interactive wizard, buildAuthResult() pure function
  models.ts      — fetchModels(), cache (save/load), resolveModels(), 6h refresh timer
  types.ts       — shared interfaces (NewClawModel, ModelCache, ProviderKeyConfig, etc.)
  constants.ts   — PROVIDER_KEYS, URLs, intervals, provider ID/label
  __tests__/     — vitest unit tests (models, auth, constants)
```

## Architecture Constraints

- **ESM only** — `"type": "module"` in package.json, no CommonJS
- **NodeNext resolution** — all imports must use `.js` extension (not `.ts`)
- **Local types only** — do NOT import from `openclaw` package; define interfaces locally (ClawRouter pattern)
- **No hardcoded models** — all model data fetched from `GET https://newclaw.ai/v1/models`
- **No API keys in cache** — `~/.openclaw/newclaw/models-cache.json` stores only `{ models, fetchedAt }`
- **Atomic writes** — all file writes use tmp + rename pattern (saveCache, injectModelsConfig)
- **Conditional sub-providers** — `newclaw-{vendor}` created ONLY when user configures a vendor-specific key
- **Non-blocking startup** — model fetch uses `.then()`, never blocks register()

## Code Style

### Imports
```typescript
import fs from "node:fs";              // Node builtins: node: prefix
import { FOO } from "./constants.js";  // Local: .js extension, named imports
import type { Bar } from "./types.js"; // Type-only: use `import type`
```

### Formatting
- 2-space indent, no tabs
- Double quotes for strings
- Trailing commas in multi-line
- No semicolons (project uses them — keep consistent)
- Actually: semicolons ARE used — keep them

### Types
- `strict: true` in tsconfig — no implicit any
- No `as any`, `@ts-ignore`, `@ts-expect-error`
- Use `as Record<string, unknown>` for JSON parsing, then narrow
- Interfaces over type aliases for object shapes
- Local interface definitions per-file for OpenClaw SDK types (not imported from openclaw)

### Naming
- Files: kebab-case or camelCase (match existing: `models.ts`, `auth.ts`)
- Constants: UPPER_SNAKE_CASE (`PROVIDER_KEYS`, `REFRESH_INTERVAL_MS`)
- Interfaces: PascalCase (`NewClawModel`, `ModelCache`)
- Functions: camelCase (`fetchModels`, `buildAuthResult`)
- Provider IDs: lowercase (`newclaw`, `newclaw-anthropic`)

### Error Handling
- `console.warn()` for expected failures (401, network error) — not console.log
- Return `null` from fetch functions on failure (caller decides fallback)
- Empty `catch {}` only for cleanup operations (e.g., unlinkSync on corrupt file)
- Never throw from plugin register() — log and degrade gracefully
- Auth wizard throws on invalid key (user-facing error)

### Testing
- Framework: vitest with `globals: true`
- Mock `global.fetch` for API tests (vi.fn().mockResolvedValue)
- Mock `os.homedir()` for cache/config tests (vi.spyOn)
- Use dynamic `import()` in tests (ESM module re-import)
- tmpdir-based isolation for filesystem tests (cleanup in afterEach)
- No test for interactive prompter flows — test `buildAuthResult` (pure function) instead

## Key Paths

| Path | Purpose |
|---|---|
| `~/.openclaw/openclaw.json` | OpenClaw config (models.providers.newclaw) |
| `~/.openclaw/newclaw/models-cache.json` | Cached model list (no secrets) |
| `dist/index.js` | Compiled plugin entry |
| `openclaw.plugin.json` | Plugin manifest |

## Key Resolution Order

```
1. process.env.NEWCLAW_API_KEY
2. api.config.models?.providers?.newclaw?.apiKey
3. ~/.openclaw/openclaw.json → models.providers.newclaw.apiKey
```

## Module Coupling

- `constants.ts` ← imported by all modules (types, models, auth, index)
- `types.ts` ← imported by models.ts, auth.ts
- `models.ts` ← imported by auth.ts (fetchModels, saveCache), index.ts (resolveModels, etc.)
- `auth.ts` ← imported by index.ts (buildAuth)
- Changing `PROVIDER_KEYS` shape → update types.ts + constants.ts + auth.ts

## npm Publish 踩坑记录

- `npm login` 会话 token 不能绕过 2FA → E403
- Granular Access Token 默认也不能 → E403
- **必须用 Classic → Automation Token** 才能 publish
- Token 配置: `//registry.npmjs.org/:_authToken=npm_xxx` 写入 `~/.npmrc`
- **永远不要在聊天/代码仓库中暴露 token**

## 技术决策记录

| 决策 | 原因 |
|---|---|
| 本地类型定义而非从 openclaw 导入 | openclaw 的 plugin-sdk 路径按插件名分隔，无法直接引用；ClawRouter 也是这么做的 |
| 条件子 provider (`newclaw-{vendor}`) | OpenClaw 不支持请求级 fallback，只能通过多 provider 实现 key 优先级 |
| `console.warn` 而非自定义 logger | models.ts 在 auth wizard 中也被调用，此时 api.logger 不可用 |
| vitest 而非 jest | ESM 原生支持更好，配置更简单 |
| tsup 而非 tsc 直接编译 | tsup 自动 bundle + 生成 .d.ts，适合 npm 发布 |
