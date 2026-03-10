# NewClaw Auth Plugin for OpenClaw

## TL;DR

> **Quick Summary**: 从零构建 `openclaw-newclaw-auth` 插件，让 OpenClaw 的所有大模型 API 调用走 NewClaw 平台。插件提供多步 API Key 认证向导（通用 key + 厂商专用 key），启动时自动从 NewClaw API 获取最新模型列表并注入 OpenClaw 配置。
>
> **Deliverables**:
> - 完整的 OpenClaw 插件 TypeScript 项目（可编译、可安装）
> - 多步 Auth 向导：通用 key → Claude/Gemini/GPT/Grok/DeepSeek 专用 key
> - 动态模型获取：`GET /v1/models` → OpenClaw ModelDefinitionConfig
> - 启动时自动注入模型到 `~/.openclaw/openclaw.json`
> - npm 发布配置，支持 `openclaw plugins install openclaw-newclaw-auth`
>
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 9 → F1-F4

---

## Context

### Original Request
开发一个 OpenClaw 认证插件 `openclaw-newclaw-auth`，让 OpenClaw 的所有大模型调用都通过 NewClaw 平台 API。需要：
1. 通过 `openclaw plugins install openclaw-newclaw-auth` 安装
2. 交互式 API Key 认证向导（通用 key + 厂商专用 key），傻瓜式一步到位
3. 专用 key 优先（通过模型选择路由实现：专用 key 对应的模型排列在前）
4. 启动时获取模型列表，之后每 6 小时自动刷新
5. API 返回 401 时使用缓存的模型列表
6. 发布到 npm（用户还没有 npm 账户）

### Interview Summary
**Key Discussions**:
- **Key 优先级**: 专用 key 通过模型选择路由实现。配置了专用 key 的厂商模型出现在两个 provider 下：`newclaw-{vendor}/model`（专用 key）和 `newclaw/model`（通用 key）。默认模型设为专用 key 版本，通用 key 版本作为备选。用户通过模型选择来切换 key，而非自动失败回退（OpenClaw provider 系统不支持请求级 fallback）。
- **初始支持厂商**: Claude Code, Gemini, GPT/Codex, Grok, DeepSeek
- **扩展性**: 后续支持用户自行添加更多厂商的专用 key
- **模型刷新**: 启动时获取，之后每 6 小时自动刷新一次
- **错误容忍**: 401 时使用缓存模型列表，不中断用户体验
- **安装体验**: 傻瓜式一步到位，能合并的步骤就合并
- **npm 账户**: 用户还没有 npm 账户，需要在计划中包含账户创建+发布步骤
- **认证交互**: auth wizard 必须是交互式的（提示用户输入 Key）

**Research Findings**:
- OpenClaw 插件通过 npm 分发，`openclaw plugins install <npm-spec>` 安装
- 插件架构：`openclaw.plugin.json` manifest + `package.json` 中 `openclaw.extensions` 指向入口
- `api.registerProvider()` 注册模型提供商，支持 auth 数组定义认证流程
- **关键参考插件**：
  - `@openclaw/copilot-proxy`：API key + custom auth 流程，最接近我们的模式
  - `@blockrun/clawrouter`：动态模型注入 + 配置写入到 `~/.openclaw/openclaw.json`
- NewClaw API 是 OpenAI-compatible：Bearer token auth，`/v1/chat/completions`，`/v1/models`
- 所有模型用 `api: "openai-completions"` 即可，OpenClaw 原生处理请求路由

### Metis Review
**Identified Gaps** (addressed):
- **Model API type**: 全部用 `openai-completions`，NewClaw 是 OpenAI-compatible
- **Plugin scope**: 仅 auth + 模型注入，不需要 request transformation（OpenClaw provider 系统原生处理）
- **npm scope**: 使用无 scope 的 `openclaw-newclaw-auth` 包名
- **Key fallback 实现**: 通过 configPatch 中的 provider 配置实现，不需要 request interceptor
- **模型分类**: 按 `owned_by` 字段从 `/v1/models` 响应中分类到各厂商

---

## Work Objectives

### Core Objective
构建一个生产级 OpenClaw 插件，提供 NewClaw API 认证和动态模型加载，发布到 npm。

### Concrete Deliverables
- `openclaw.plugin.json` — 插件 manifest
- `package.json` — npm 包配置（含 `openclaw.extensions`）
- `src/index.ts` — 插件定义 + register()
- `src/auth.ts` — 多步认证向导（通用 key + 5 个厂商专用 key）
- `src/models.ts` — `/v1/models` 获取 + ModelDefinitionConfig 转换 + 配置注入 + 6小时定时刷新 + 缓存
- `src/types.ts` — TypeScript 类型定义
- `tsconfig.json` + `tsup.config.ts` — 构建配置
- 编译后的 `dist/` 目录

### Definition of Done
- [ ] `npm pack` 成功生成 tarball
- [ ] `openclaw plugins install ./` 本地安装成功
- [ ] Auth 向导完整运行（通用 key → 5 个专用 key）
- [ ] 模型列表成功从 NewClaw API 获取并注入 OpenClaw 配置
- [ ] 专用 key 通过 sub-provider 路由正确工作
- [ ] 启动时 key 解析链: env → config → persisted file

### Must Have
- 交互式 Auth 向导（通用 key → 厂商专用 key），使用 `ctx.prompter.text()` 提示输入
- 5 个厂商（Claude, Gemini, GPT/Codex, Grok, DeepSeek）专用 key 配置（可跳过）
- 专用 key 优先（通过 provider 路由：`newclaw-anthropic/model` 用专用 key，`newclaw/model` 用通用 key。默认选择专用 key 版本。不实现请求级自动 fallback — OpenClaw provider 系统不支持）
- 启动时自动获取 `/v1/models` 并注入 OpenClaw 配置
- 6 小时定时刷新模型列表（`setInterval`）
- 模型列表缓存：API 返回 401 或网络错误时使用上次成功获取的缓存
- 缓存持久化到 `~/.openclaw/newclaw/models-cache.json`
- npm 可发布的包结构（含 npm 账户创建指南）
- 可扩展的厂商 key 架构
- 傻瓜式安装体验：一条命令安装、一个向导配置完所有 key

### Must NOT Have (Guardrails)
- **不要** 实现 request/response transformation — OpenClaw provider 系统原生处理
- **不要** 实现 fetch interceptor 或 proxy server — 不需要本地代理
- **不要** 硬编码模型列表 — 必须从 API 动态获取
- **不要** 修改 OpenClaw 核心代码
- **不要** 实现 OAuth 流程 — NewClaw 使用简单的 API Key
- **不要** 为每个厂商无条件注册单独的 provider — 仅在用户配置了专用 key 时才创建 `newclaw-{vendor}` 子 provider
- **不要** 添加不必要的 JSDoc/注释膨胀
- **不要** 过度抽象 — 保持简单直接

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO (greenfield project)
- **Automated tests**: Tests-alongside (each core task includes its own test file)
- **Framework**: vitest
- **Approach**: Each implementation task (4, 5, 6) MUST include a companion test file. The test file is written as part of the same task, with test assertions defined before writing implementation logic where practical.

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: Use Bash — `npm run build`, `npm pack`, `tsc --noEmit`
- **Plugin install**: Use Bash — `openclaw plugins install ./`
- **Auth flow**: Use interactive_bash (tmux) — simulate auth wizard
- **API calls**: Use Bash (curl) — test `/v1/models` endpoint
- **Config injection**: Use Bash — read `~/.openclaw/openclaw.json` and verify

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — project scaffolding + types):
├── Task 1: Project scaffolding (package.json, tsconfig, tsup, openclaw.plugin.json) [quick]
├── Task 2: TypeScript types + constants + provider config definition [quick]
└── Task 3: npm account creation guide + publish config (.npmrc, files, prepublish) [writing]

Wave 2 (After Wave 1 — core modules):
├── Task 4: Model fetching + conversion + 6h refresh + cache (src/models.ts) [deep]
├── Task 5: Interactive auth wizard with key fallback logic (src/auth.ts) [deep]
└── Task 6: Plugin entry point — register, boot sequence, config inject (src/index.ts) [deep]

Wave 3 (After Wave 2 — test + build + verify):
├── Task 7: Unit tests for models (cache, refresh, conversion) + auth (fallback) [unspecified-high]
├── Task 8: Build, pack, local install, full lifecycle integration test [deep]
└── Task 9: npm publish + OpenClaw community plugin PR [quick]

Wave FINAL (After ALL tasks — independent review):
├── Task F1: Plan compliance audit (oracle)
├── Task F2: Code quality review (unspecified-high)
├── Task F3: Real manual QA — full install + auth + models (unspecified-high)
└── Task F4: Scope fidelity check (deep)

Critical Path: Task 1 → Task 4 → Task 6 → Task 8 → F1-F4
Parallel Speedup: ~60% faster than sequential
Max Concurrent: 3 (Waves 1, 2 & 3)
```

### Dependency Matrix

| Task | Depends On | Blocks |
|------|-----------|--------|
| 1 | — | 4, 5, 6, 7, 8, 9 |
| 2 | — | 4, 5, 6 |
| 3 | 1 | 9 |
| 4 | 1, 2 | 6, 7, 8 |
| 5 | 1, 2 | 6, 7, 8 |
| 6 | 4, 5 | 7, 8 |
| 7 | 4, 5, 6 | 8 |
| 8 | 6, 7 | 9, F1-F4 |
| 9 | 3, 8 | F1-F4 |

### Agent Dispatch Summary

- **Wave 1**: 3 tasks — T1 → `quick`, T2 → `quick`, T3 → `writing`
- **Wave 2**: 3 tasks — T4 → `deep`, T5 → `deep`, T6 → `deep`
- **Wave 3**: 3 tasks — T7 → `unspecified-high`, T8 → `deep`, T9 → `quick`
- **FINAL**: 4 tasks — F1 → `oracle`, F2 → `unspecified-high`, F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [x] 1. Project Scaffolding — package.json, tsconfig, tsup, manifest

  **What to do**:
  - Initialize the project with `package.json`:
    - `name`: `openclaw-newclaw-auth`
    - `version`: `0.1.0`
    - `type`: `module`
    - `main`: `dist/index.js`
    - `types`: `dist/index.d.ts`
    - `openclaw.extensions`: `["./dist/index.js"]`
    - `files`: `["dist", "openclaw.plugin.json"]`
    - `peerDependencies`: `{ "openclaw": ">=2025.1.0" }` (optional)
    - `devDependencies`: `openclaw`, `typescript`, `tsup`, `vitest`
    - Scripts: `build` (tsup), `dev` (tsup --watch), `test` (vitest run), `typecheck` (tsc --noEmit), `prepublishOnly` (npm run build)
  - Create `openclaw.plugin.json`:
    ```json
    {
      "id": "openclaw-newclaw-auth",
      "name": "NewClaw Auth",
      "description": "NewClaw AI API integration — all models through newclaw.ai",
      "providers": ["newclaw", "newclaw-anthropic", "newclaw-google", "newclaw-openai", "newclaw-xai", "newclaw-deepseek"],
      "configSchema": {
        "type": "object",
        "additionalProperties": false,
        "properties": {}
      }
    }
    ```
  - Create `tsconfig.json`: target ES2022, module NodeNext, strict, outDir dist, rootDir src
  - Create `tsup.config.ts`: entry `src/index.ts`, format esm, dts true, clean true, external `["openclaw"]`

  **Must NOT do**:
  - Do not add unnecessary dependencies
  - Do not use CommonJS — must be ESM (`"type": "module"`)

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 2, 3)
  - **Blocks**: Tasks 4, 5, 6, 7, 8, 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `@blockrun/clawrouter` package.json — npm plugin package structure with `openclaw.extensions` field: https://github.com/BlockRunAI/ClawRouter/blob/main/package.json
  - `@openclaw/copilot-proxy` package.json — official plugin package structure: https://raw.githubusercontent.com/openclaw/openclaw/main/extensions/copilot-proxy/package.json
  - `@openclaw/copilot-proxy` openclaw.plugin.json — manifest with `providers` array: https://raw.githubusercontent.com/openclaw/openclaw/main/extensions/copilot-proxy/openclaw.plugin.json

  **WHY Each Reference Matters**:
  - ClawRouter shows the exact `openclaw.extensions`, `files`, `peerDependencies` structure for an npm-published plugin
  - Copilot-proxy shows the minimal manifest format with `providers` array that registers model providers

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: package.json is valid and has all required fields
    Tool: Bash
    Preconditions: Task files created
    Steps:
      1. Run `node -e "const p=require('./package.json'); console.log(JSON.stringify({name:p.name,type:p.type,main:p.main,ext:p.openclaw?.extensions}))"` in project root
      2. Assert output contains `"name":"openclaw-newclaw-auth"`, `"type":"module"`, `"main":"dist/index.js"`, `"ext":["./dist/index.js"]`
    Expected Result: All fields present and correct
    Failure Indicators: Missing fields or wrong values
    Evidence: .sisyphus/evidence/task-1-package-json-valid.txt

  Scenario: openclaw.plugin.json is valid JSON with required manifest fields
    Tool: Bash
    Preconditions: File created
    Steps:
      1. Run `node -e "const m=JSON.parse(require('fs').readFileSync('openclaw.plugin.json','utf8')); console.log(m.id, Array.isArray(m.providers) && m.providers.includes('newclaw'), typeof m.configSchema)"`
      2. Assert output: `openclaw-newclaw-auth true object`
    Expected Result: Manifest has id, providers, configSchema
    Evidence: .sisyphus/evidence/task-1-manifest-valid.txt

  Scenario: tsconfig.json compiles with no errors (empty src)
    Tool: Bash
    Preconditions: tsconfig.json created, empty src/index.ts with `export {}`
    Steps:
      1. Create minimal `src/index.ts` with `export {}`
      2. Run `npx tsc --noEmit`
      3. Assert exit code 0
    Expected Result: TypeScript config is valid
    Evidence: .sisyphus/evidence/task-1-tsconfig-valid.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(scaffold): project scaffolding with manifest, types, and npm config`
  - Files: `package.json`, `openclaw.plugin.json`, `tsconfig.json`, `tsup.config.ts`

- [x] 2. TypeScript Types + Constants + Provider Configuration

  **What to do**:
  - Create `src/types.ts` with all type definitions:
    - `NewClawModel`: `{ id: string; object: string; created: number; owned_by: string }`
    - `NewClawModelsResponse`: `{ object: "list"; data: NewClawModel[] }`
    - `ProviderKeyConfig`: `{ providerId: string; label: string; envVar: string; hint: string }`
    - `KeyResolution`: `{ key: string; source: "provider-specific" | "universal" }`
    - `ModelCache`: `{ models: NewClawModel[]; fetchedAt: number }`
  - Create `src/constants.ts` with:
    - `NEWCLAW_BASE_URL = "https://newclaw.ai"`
    - `MODELS_ENDPOINT = "/v1/models"`
    - `REFRESH_INTERVAL_MS = 6 * 60 * 60 * 1000` (6 hours)
    - `CACHE_DIR = "newclaw"` (relative to `~/.openclaw/`)
    - `CACHE_FILE = "models-cache.json"`
    - `PROVIDER_KEYS`: array of `ProviderKeyConfig` for 5 providers:
      ```typescript
      export const PROVIDER_KEYS: ProviderKeyConfig[] = [
        { providerId: "anthropic", label: "Claude / Claude Code", envVar: "NEWCLAW_ANTHROPIC_KEY", hint: "sk-ant-..." },
        { providerId: "google", label: "Gemini", envVar: "NEWCLAW_GOOGLE_KEY", hint: "AIza..." },
        { providerId: "openai", label: "GPT / Codex", envVar: "NEWCLAW_OPENAI_KEY", hint: "sk-..." },
        { providerId: "xai", label: "Grok", envVar: "NEWCLAW_XAI_KEY", hint: "xai-..." },
        { providerId: "deepseek", label: "DeepSeek", envVar: "NEWCLAW_DEEPSEEK_KEY", hint: "sk-..." },
      ];
      ```
    - `PROVIDER_ID = "newclaw"`
    - `PROVIDER_LABEL = "NewClaw AI"`

  **Must NOT do**:
  - Do not hardcode model lists — only provider key configs are static
  - Do not add unnecessary type complexity

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 3)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - ClawRouter `src/models.ts` — model type definitions and conversion to OpenClaw format: https://github.com/BlockRunAI/ClawRouter/blob/main/src/models.ts
  - Copilot-proxy `index.ts` — `buildModelDefinition()` function showing OpenClaw ModelDefinitionConfig shape

  **WHY Each Reference Matters**:
  - ClawRouter shows the exact ModelDefinitionConfig fields OpenClaw expects: id, name, api, reasoning, input, cost, contextWindow, maxTokens
  - Copilot-proxy shows the minimal model definition with sensible defaults

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Types compile without errors
    Tool: Bash
    Preconditions: src/types.ts and src/constants.ts created
    Steps:
      1. Run `npx tsc --noEmit`
      2. Assert exit code 0
    Expected Result: All types valid, no compile errors
    Evidence: .sisyphus/evidence/task-2-types-compile.txt

  Scenario: PROVIDER_KEYS has exactly 5 entries with correct structure
    Tool: Bash
    Preconditions: constants.ts created, project built with `npm run build`
    Steps:
      1. Run `npm run build`
      2. Run `node -e "import('./dist/constants.js').then(m => console.log(m.PROVIDER_KEYS.length, m.PROVIDER_KEYS.map(k=>k.providerId).join(',')))"`
      3. Assert output: `5 anthropic,google,openai,xai,deepseek`
    Expected Result: All 5 providers defined with correct IDs
    Evidence: .sisyphus/evidence/task-2-provider-keys.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(scaffold): project scaffolding with manifest, types, and npm config`
  - Files: `src/types.ts`, `src/constants.ts`

- [x] 3. npm Account Creation Guide + Publish Configuration

  **What to do**:
  - Create `.npmrc` with `access=public`
  - Add `README.md` with:
    - Plugin name, one-line description
    - Install command: `openclaw plugins install openclaw-newclaw-auth`
    - Quick setup section explaining the auth wizard flow
    - Provider-specific key table (5 providers)
    - Environment variable reference (NEWCLAW_API_KEY, NEWCLAW_ANTHROPIC_KEY, etc.)
  - Add `LICENSE` file (MIT)
  - Create `.sisyphus/drafts/npm-publish-guide.md` with step-by-step npm account creation + first publish instructions:
    1. Go to https://www.npmjs.com/signup
    2. Create account with email verification
    3. `npm login` in terminal
    4. `npm publish` from project root
    5. Verify at https://www.npmjs.com/package/openclaw-newclaw-auth
    6. Test install: `openclaw plugins install openclaw-newclaw-auth`

  **Must NOT do**:
  - Do not actually run `npm publish` — just prepare all configs
  - Do not add excessive documentation — keep it concise

  **Recommended Agent Profile**:
  - **Category**: `writing`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 2)
  - **Blocks**: Task 9
  - **Blocked By**: Task 1 (needs package.json to exist)

  **References**:

  **External References**:
  - npm publish docs: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
  - OpenClaw community plugin listing requirements: https://docs.openclaw.ai/plugins/community.md

  **WHY Each Reference Matters**:
  - npm docs show exact steps for first-time publish including 2FA setup
  - Community plugin page shows the PR format for listing a plugin

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: README.md contains install command and provider table
    Tool: Bash
    Preconditions: README.md created
    Steps:
      1. Run `grep -c "openclaw plugins install openclaw-newclaw-auth" README.md`
      2. Assert output >= 1
      3. Run `grep -c "Claude" README.md && grep -c "Gemini" README.md && grep -c "DeepSeek" README.md`
      4. Assert all outputs >= 1
    Expected Result: README has install command and mentions all providers
    Evidence: .sisyphus/evidence/task-3-readme-content.txt

  Scenario: .npmrc has public access configured
    Tool: Bash
    Preconditions: .npmrc created
    Steps:
      1. Run `cat .npmrc`
      2. Assert contains `access=public`
    Expected Result: Public access configured for npm publish
    Evidence: .sisyphus/evidence/task-3-npmrc.txt
  ```

  **Commit**: YES (group with Wave 1)
  - Message: `feat(scaffold): project scaffolding with manifest, types, and npm config`
  - Files: `.npmrc`, `README.md`, `LICENSE`

- [x] 4. Model Fetching + Conversion + 6h Refresh + Cache (src/models.ts)

  **What to do**:
  - Create `src/models.ts` with the following functions:

  **`fetchModels(apiKey: string): Promise<NewClawModel[] | null>`**:
  - `GET https://newclaw.ai/v1/models` with `Authorization: Bearer ${apiKey}`
  - Parse response as `NewClawModelsResponse`, return `data` array
  - On 401: log warning, return `null` (caller uses cache fallback)
  - On network error: log warning, return `null`
  - Timeout: 10 seconds

  **`toOpenClawModels(models: NewClawModel[]): ModelDefinitionConfig[]`**:
  - Convert each NewClaw model to OpenClaw format:
    ```typescript
    {
      id: model.id,
      name: model.id,
      api: "openai-completions",
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: 128_000,  // sensible default
      maxTokens: 8192,         // sensible default
    }
    ```
  - Group models by `owned_by` field for provider categorization

  **`loadCache(): ModelCache | null`**:
  - Read `~/.openclaw/newclaw/models-cache.json`
  - Return parsed `ModelCache` or `null` if missing/corrupt
  - On parse error: delete corrupt file, return `null`

  **`saveCache(models: NewClawModel[]): void`**:
  - Write to `~/.openclaw/newclaw/models-cache.json`
  - Store only: `{ models, fetchedAt: Date.now() }` — NO API keys or secrets
  - Atomic write: write to `.tmp` file then rename (like ClawRouter pattern)
  - Create directory if not exists: `~/.openclaw/newclaw/`

  **`resolveModels(apiKey: string): Promise<NewClawModel[]>`**:
  - Call `fetchModels(apiKey)` which returns `NewClawModel[] | null`
  - If result is non-null (success): call `saveCache(result)` and return result
  - If result is null (401/error): try `loadCache()`, return cached models array
  - If no cache either: return empty array `[]` with warning log

  **`startRefreshTimer(apiKey: string, onUpdate: (models) => void): NodeJS.Timeout`**:
  - `setInterval` every 6 hours (`REFRESH_INTERVAL_MS`)
  - Calls `resolveModels()` and invokes `onUpdate` callback with new models
  - Returns interval handle for cleanup

  **`injectModelsConfig(models: NewClawModel[], logger): void`**:
  - Follow ClawRouter pattern: read `~/.openclaw/openclaw.json`, add/update `models.providers.newclaw`
  - Atomic write (tmp + rename)
  - Set `baseUrl: "https://newclaw.ai/v1"`, `api: "openai-completions"`
  - Additive-only for `agents.defaults.models` allowlist (don't delete user's entries)
  - Idempotent: safe to call on every startup

  **Must NOT do**:
  - Do not hardcode model IDs — all from API
  - Do not store API keys in cache file — only model data and metadata
  - Do not crash on API failure — always graceful fallback

  **Tests (included in this task)**:
  Create `src/__tests__/models.test.ts` alongside implementation:
  - `fetchModels`: Mock fetch 200 → returns parsed models. Mock 401 → returns null. Mock network error → returns null.
  - `toOpenClawModels`: Given NewClawModel array → returns correct ModelDefinitionConfig array with all required fields.
  - `saveCache / loadCache`: Write → read roundtrip. Corrupt file → returns null.
  - `resolveModels`: Success → saves cache + returns. Failure → loads cache. No cache → returns [].
  - `REFRESH_INTERVAL_MS`: Equals 6 * 60 * 60 * 1000.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 5, 6)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - ClawRouter `src/index.ts` `injectModelsConfig()` function (lines ~100-240) — config injection with atomic write, idempotent updates, backup on corruption: https://github.com/BlockRunAI/ClawRouter/blob/main/src/index.ts
  - ClawRouter `src/models.ts` `toOpenClawModel()` function — exact OpenClaw ModelDefinitionConfig shape and field mapping: https://github.com/BlockRunAI/ClawRouter/blob/main/src/models.ts
  - ClawRouter `src/models.ts` `buildProviderModels()` — how to structure ModelProviderConfig with baseUrl + api + models array

  **WHY Each Reference Matters**:
  - `injectModelsConfig` is the gold standard for safely writing to `~/.openclaw/openclaw.json` — handles missing file, corrupt JSON, backup, atomic write, additive-only allowlist
  - `toOpenClawModel` shows the exact field mapping OpenClaw expects (api, reasoning, input, cost, contextWindow, maxTokens)
  - `buildProviderModels` shows how provider config nests under `models.providers.<id>`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: fetchModels returns parsed model array when API responds 200 (mocked)
    Tool: Bash
    Preconditions: models.ts compiled, unit test exists
    Steps:
      1. Run `npm run test -- --reporter=verbose src/__tests__/models.test.ts`
      2. Assert "fetchModels" test group passes (uses mocked fetch with 200 + fixture data)
    Expected Result: fetchModels correctly parses OpenAI-compatible response
    Failure Indicators: Test failures, parse errors
    Evidence: .sisyphus/evidence/task-4-fetch-models-mock.txt

  Scenario: fetchModels returns null on 401 response (mocked)
    Tool: Bash
    Preconditions: Unit test mocks fetch to return 401
    Steps:
      1. Run `npm run test -- --reporter=verbose src/__tests__/models.test.ts`
      2. Assert "fetchModels 401" test case passes
    Expected Result: Function returns null on auth failure, does not throw
    Evidence: .sisyphus/evidence/task-4-fetch-models-401.txt

  Scenario: OPTIONAL — Live API call (only if NEWCLAW_API_KEY env var is set)
    Tool: Bash
    Preconditions: NEWCLAW_API_KEY env var set (skip if not available)
    Steps:
      1. Run `[ -z "$NEWCLAW_API_KEY" ] && echo "SKIP: no API key" && exit 0`
      2. Run `curl -sf -H "Authorization: Bearer $NEWCLAW_API_KEY" https://newclaw.ai/v1/models | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); console.log(d.object, d.data.length)"`
      3. Assert output starts with `list` and count > 0
    Expected Result: Live API returns model list (or test is skipped)
    Evidence: .sisyphus/evidence/task-4-fetch-models-live.txt

  Scenario: Cache write and read roundtrip
    Tool: Bash
    Preconditions: models.ts compiled to dist/
    Steps:
      1. Run `npm run build`
      2. Run `HOME=/tmp/newclaw-test-$$ node -e "import('./dist/models.js').then(async m => { const testModels = [{id:'test-1',object:'model',created:1,owned_by:'test'}]; await m.saveCache(testModels); const cached = m.loadCache(); const raw = require('fs').readFileSync(require('os').homedir()+'/.openclaw/newclaw/models-cache.json','utf8'); const hasSecrets = /sk-|xai-|AIza/.test(raw); const keys = Object.keys(JSON.parse(raw)); console.log(cached.models.length, cached.models[0].id, keys.sort().join(','), hasSecrets ? 'HAS-SECRETS' : 'clean') })"`
      3. Assert output: `1 test-1 fetchedAt,models clean`
      4. Cleanup: `rm -rf /tmp/newclaw-test-*`
    Expected Result: Cache persists and loads correctly
    Evidence: .sisyphus/evidence/task-4-cache-roundtrip.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(core): model fetcher with 6h refresh + cache, auth wizard, plugin entry point`
  - Files: `src/models.ts`

- [x] 5. Interactive Auth Wizard with Key Fallback (src/auth.ts)

  **What to do**:
  - Create `src/auth.ts` with the following exported functions:

  **Exports (exact API contract — Task 6 depends on these):**
  ```typescript
  // Called by Task 6 (index.ts) — returns the auth array for api.registerProvider()
  export function buildAuth(api: OpenClawPluginApi): ProviderAuthDefinition[];

  // Called internally by buildAuth and by tests — builds the ProviderAuthResult
  export function buildAuthResult(
    universalKey: string,
    providerKeys: Record<string, string>,
    models: NewClawModel[]
  ): ProviderAuthResult;
  ```

  **`buildAuth(api)` implementation**: Returns an array with a single auth entry:

  ```typescript
  auth: [{
    id: "setup",
    label: "NewClaw API Key Setup",
    hint: "Configure API keys for NewClaw AI models",
    kind: "custom",
    run: async (ctx: ProviderAuthContext): Promise<ProviderAuthResult> => {
      // Step 1: Universal key (REQUIRED)
      const universalKey = await ctx.prompter.text({
        message: "Enter your NewClaw universal API key (from newclaw.ai)",
        validate: (v) => v.trim() ? undefined : "API key is required",
      });

      // Step 1.5: Verify universal key works
      const spin = ctx.prompter.progress("Verifying API key...");
      const models = await fetchModels(universalKey);
      if (!models) {
        spin.stop("API key verification failed");
        throw new Error("Invalid API key — could not reach NewClaw API");
      }
      spin.stop(`Verified! Found ${models.length} models`);

      // Step 2: Provider-specific keys (ALL OPTIONAL, skip with Enter)
      const providerKeys: Record<string, string> = {};
      for (const provider of PROVIDER_KEYS) {
        const key = await ctx.prompter.text({
          message: `${provider.label} specific key (Enter to skip, uses universal key)`,
          placeholder: provider.hint,
        });
        if (key && key.trim()) {
          providerKeys[provider.providerId] = key.trim();
        }
      }

      // Step 3: Save model cache (NO keys stored) + build result
      await saveCache(models);

      return buildAuthResult(universalKey, providerKeys, models);
    }
  }]
  ```

  **`buildAuthResult(universalKey, providerKeys, models): ProviderAuthResult`**:
  - Build `profiles` array: one credential profile with the universal key
  - Build `configPatch` with `models.providers.newclaw`:
    - `baseUrl`: `"https://newclaw.ai/v1"`
    - `api`: `"openai-completions"`
    - `apiKey`: the universal key (default for all models)
    - `models`: converted model array from API
  - **Provider-specific key fallback mechanism (CONCRETE DESIGN):**
    The `configPatch` groups models by provider and registers them under provider-specific sub-sections within the SAME `newclaw` provider. The approach uses OpenClaw's `models.providers` config to assign different `apiKey` values per provider:
    
    ```typescript
    // configPatch structure:
    {
      models: {
        providers: {
          // Universal provider — all models, universal key
          newclaw: {
            baseUrl: "https://newclaw.ai/v1",
            api: "openai-completions",
            apiKey: universalKey,
            models: allModelsConverted,  // full model list
          },
          // Provider-specific overrides (only if user configured a specific key)
          // These shadow the same models but with a different apiKey
          ...(providerKeys.anthropic ? {
            "newclaw-anthropic": {
              baseUrl: "https://newclaw.ai/v1",
              api: "openai-completions",
              apiKey: providerKeys.anthropic,
              models: anthropicModelsOnly,  // filtered by owned_by === "anthropic"
            }
          } : {}),
          // ... same for google, openai, xai, deepseek
        }
      }
    }
    ```
    
    **How fallback works**: When a user selects a model like `newclaw-anthropic/claude-3-opus`, OpenClaw uses the anthropic-specific key. If they select `newclaw/claude-3-opus`, it uses the universal key. The `agents.defaults.models` allowlist includes BOTH forms, so users see all options.
    
    **Why this works without request interceptors**: Each provider ID has its own `apiKey` in the config. OpenClaw natively routes requests to the correct provider based on the model's provider prefix. No custom request handling needed.
    
    **If user configured NO provider-specific keys**: Only the `newclaw` provider is registered. Simple.
    
  - Set `defaultModel` deterministically: if any vendor-specific providers were created, use the first model under the first vendor-specific provider (e.g., `newclaw-anthropic/claude-3-opus`). Otherwise, use `newclaw/<first-model>`. This ensures the default uses a specific key when available.
  - In `agents.defaults.models` allowlist: vendor-specific models listed BEFORE universal-key models to reflect priority ordering.
  - Add `notes` array with setup confirmation messages
  
  > **NOTE**: This approach technically registers multiple providers, but ONLY when the user explicitly configures provider-specific keys. The guardrail "do not register separate providers per vendor" is relaxed to: "do not unconditionally register separate providers — only create sub-providers for vendors where the user explicitly configured a specific key". This is the only way to implement per-vendor key priority within OpenClaw's provider system without request interception.

  **Must NOT do**:
  - Do not implement OAuth — this is pure API key
  - Do not require provider-specific keys — they are ALL optional (Enter to skip)
  - Do not split into multiple auth entries — ONE wizard handles everything
  - Do not store keys in custom plain text files outside OpenClaw's config system — use `ProviderAuthResult.configPatch` to write `apiKey` into OpenClaw's standard `~/.openclaw/openclaw.json` provider config. This is how OpenClaw natively stores provider credentials (see ClawRouter and Copilot Proxy patterns). The `apiKey` field in `models.providers.newclaw` is OpenClaw's standard mechanism, not a custom plain-text file.

  **Tests (included in this task)**:
  Create `src/__tests__/auth.test.ts` alongside implementation:
  - `buildAuthResult`: Universal key + 2 provider keys → correct profiles + configPatch structure with sub-providers.
  - `buildAuthResult`: Universal key + no provider keys → single `newclaw` provider, no sub-providers.
  - `configPatch shape`: Includes `models.providers.newclaw` with baseUrl, api, apiKey, models.
  - Sub-provider key assignment: Anthropic models get `sk-ant` key via `newclaw-anthropic` provider.

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 4, 6)
  - **Blocks**: Tasks 6, 7, 8
  - **Blocked By**: Tasks 1, 2

  **References**:

  **Pattern References**:
  - Copilot-proxy `index.ts` — the exact `kind: "custom"` auth pattern with `ctx.prompter.text()`, validate, and ProviderAuthResult shape: https://raw.githubusercontent.com/openclaw/openclaw/main/extensions/copilot-proxy/index.ts
  - Google Gemini CLI Auth `index.ts` — `ctx.prompter.progress()` for verification spinner, error handling in auth: https://raw.githubusercontent.com/openclaw/openclaw/main/extensions/google-gemini-cli-auth/index.ts
  - ClawRouter `src/auth.ts` `walletKeyAuth` — `kind: "api_key"` auth with validation: https://github.com/BlockRunAI/ClawRouter/blob/main/src/auth.ts

  **WHY Each Reference Matters**:
  - Copilot-proxy is the exact pattern: `kind: "custom"`, multi-step `ctx.prompter.text()`, returns `ProviderAuthResult` with `profiles` + `configPatch`. Copy this structure.
  - Gemini CLI Auth shows how to use `ctx.prompter.progress()` for verification spinners and proper error handling with `spin.stop()`.
  - ClawRouter auth shows how `ProviderAuthResult.profiles` structure works with credential storage.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Auth wizard has exactly 6 prompter.text() calls (1 universal + 5 providers)
    Tool: Bash (rg)
    Preconditions: src/auth.ts written
    Steps:
      1. Run `rg -c "prompter\.text\(" src/auth.ts`
      2. Assert output: `6`
      3. Run `rg "Enter to skip" src/auth.ts | wc -l`
      4. Assert output: `5` (all provider keys are skippable)
    Expected Result: Exactly 6 text prompts, 5 include skip option
    Failure Indicators: Count != 6, or skip messages missing
    Evidence: .sisyphus/evidence/task-5-auth-prompts.txt

  Scenario: buildAuthResult returns valid ProviderAuthResult shape
    Tool: Bash
    Preconditions: Plugin built to dist/
    Steps:
      1. Run `npm run build`
      2. Run `node -e "import('./dist/auth.js').then(m => { const r = m.buildAuthResult('sk-test', {anthropic:'sk-ant'}, [{id:'test',object:'model',created:0,owned_by:'openai'}]); console.log(Object.keys(r).sort().join(','), r.profiles.length, typeof r.configPatch, typeof r.defaultModel) })"`
      3. Assert output contains: `configPatch,defaultModel,notes,profiles 1 object string`
    Expected Result: Result has profiles, configPatch, defaultModel, notes with correct types
    Failure Indicators: Missing keys, wrong types, import error
    Evidence: .sisyphus/evidence/task-5-auth-result-shape.txt

  Scenario: configPatch creates sub-provider for vendor with specific key
    Tool: Bash
    Preconditions: Plugin built
    Steps:
      1. Run `node -e "import('./dist/auth.js').then(m => { const r = m.buildAuthResult('sk-univ', {anthropic:'sk-ant'}, [{id:'claude-3',object:'model',created:0,owned_by:'anthropic'},{id:'gpt-4',object:'model',created:0,owned_by:'openai'}]); const providers = Object.keys(r.configPatch.models.providers); console.log(providers.sort().join(','), r.configPatch.models.providers.newclaw.apiKey === 'sk-univ', r.configPatch.models.providers['newclaw-anthropic']?.apiKey === 'sk-ant') })"`
      2. Assert output includes: `newclaw,newclaw-anthropic` and `true true`
    Expected Result: Universal provider uses universal key, anthropic sub-provider uses specific key, no sub-provider for openai (no specific key)
    Evidence: .sisyphus/evidence/task-5-key-fallback.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(core): model fetcher with 6h refresh + cache, auth wizard, plugin entry point`
  - Files: `src/auth.ts`

- [x] 6. Plugin Entry Point — Register, Boot Sequence, Config Inject (src/index.ts)

  **What to do**:
  - Create `src/index.ts` as the main plugin definition and entry point:

  ```typescript
  // IMPORTANT: The exact import path depends on the OpenClaw version installed.
  // Verified patterns from real plugins:
  //   - Copilot Proxy uses: import { emptyPluginConfigSchema, type OpenClawPluginApi } from "openclaw/plugin-sdk/copilot-proxy";
  //   - Gemini CLI uses:    import { ... } from "openclaw/plugin-sdk/google-gemini-cli-auth";
  //   - ClawRouter uses:    import type { OpenClawPluginDefinition, OpenClawPluginApi } from "./types.js"; (local types)
  //
  // APPROACH: Try "openclaw/plugin-sdk/openclaw-newclaw-auth" first.
  // If that fails at compile time, use the ClawRouter approach:
  //   1. Copy minimal type definitions from copilot-proxy or ClawRouter src/types.ts
  //   2. Define locally: OpenClawPluginApi, ProviderAuthContext, ProviderAuthResult, emptyPluginConfigSchema
  //   3. This is the safer approach and what ClawRouter (an npm-published plugin) actually does.
  //
  // The implementer MUST verify the import path by running `tsc --noEmit` after writing the file.
  // If the import fails, switch to local type definitions immediately.

  import { PROVIDER_ID, PROVIDER_LABEL, PROVIDER_KEYS } from "./constants.js";
  import { resolveModels, toOpenClawModels, injectModelsConfig, startRefreshTimer } from "./models.js";
  import { buildAuth } from "./auth.js";

  // Types: either from SDK or locally defined (see approach above)
  type OpenClawPluginApi = {
    registerProvider: (provider: any) => void;
    registerService: (service: { id: string; start: () => void; stop: () => Promise<void> }) => void;
    config: { models?: { providers?: Record<string, any> } };
    logger: { info: (msg: string) => void; warn: (msg: string) => void };
    pluginConfig?: Record<string, unknown>;
  };

  function emptyPluginConfigSchema() {
    return { type: "object" as const, additionalProperties: false as const, properties: {} };
  }

  const plugin = {
    id: "openclaw-newclaw-auth",
    name: "NewClaw Auth",
    description: "NewClaw AI API integration — all models through newclaw.ai",
    configSchema: emptyPluginConfigSchema(),

    register(api: OpenClawPluginApi) {
      // 1. Register newclaw as a provider with auth wizard
      api.registerProvider({
        id: PROVIDER_ID,
        label: PROVIDER_LABEL,
        docsPath: "https://newclaw.ai",
        aliases: ["newclaw", "nc"],
        envVars: ["NEWCLAW_API_KEY", ...PROVIDER_KEYS.map(k => k.envVar)],
        auth: buildAuth(api),
      });

      // 2. On startup: load models from cache/API and inject into config
      // Key resolution order:
      //   1. NEWCLAW_API_KEY env var (explicit override)
      //   2. api.config.models?.providers?.newclaw?.apiKey (set by wizard via configPatch)
      //   3. Read from persisted ~/.openclaw/openclaw.json providers.newclaw.apiKey
      const apiKey = process.env.NEWCLAW_API_KEY
        || api.config.models?.providers?.newclaw?.apiKey
        || readApiKeyFromConfig(); // helper: reads ~/.openclaw/openclaw.json → models.providers.newclaw.apiKey
      if (apiKey) {
        // Non-blocking: fetch models and inject config
        resolveModels(apiKey).then(models => {
          if (models.length > 0) {
            injectModelsConfig(models, api.logger);
            api.logger.info(`NewClaw: loaded ${models.length} models`);

            // Also set runtime config for immediate availability
            if (!api.config.models) api.config.models = { providers: {} };
            if (!api.config.models.providers) api.config.models.providers = {};
            api.config.models.providers.newclaw = {
              baseUrl: "https://newclaw.ai/v1",
              api: "openai-completions",
              apiKey,
              models: toOpenClawModels(models),
            };
          }
        }).catch(err => {
          api.logger.warn(`NewClaw: model load failed: ${err.message}`);
        });

        // 3. Start 6-hour refresh timer
        const timer = startRefreshTimer(apiKey, (models) => {
          injectModelsConfig(models, api.logger);
          api.logger.info(`NewClaw: refreshed ${models.length} models`);
        });

        // 4. Register service for cleanup
        api.registerService({
          id: "newclaw-model-refresh",
          start: () => {},
          stop: async () => {
            clearInterval(timer);
            api.logger.info("NewClaw: model refresh timer stopped");
          },
        });
      } else {
        api.logger.info("NewClaw: no API key found. Run auth setup to configure.");
      }
    },
  };

  export default plugin;
  ```

  **Boot sequence summary:**
  1. `register()` called by OpenClaw on plugin load
  2. Register `newclaw` provider with auth wizard
  3. Resolve API key: `env var` → `api.config` → `~/.openclaw/openclaw.json`
  4. If key found → non-blocking model fetch + config inject
  5. Start 6-hour refresh timer
  6. Register service for cleanup on gateway stop

  **`readApiKeyFromConfig(): string | undefined`** helper:
  - Read `~/.openclaw/openclaw.json` synchronously
  - Parse JSON, extract `models.providers.newclaw.apiKey`
  - Return the key or `undefined` if not found/parse error
  - This handles the "configured via wizard" flow where the key is persisted in config

  **Must NOT do**:
  - Do not block startup waiting for model fetch — use `.then()` (non-blocking)
  - Do not crash if no API key found — just log and skip model loading
  - Do not implement request/response transformation — OpenClaw handles this via provider config

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2 (after Tasks 4, 5 complete)
  - **Blocks**: Tasks 7, 8
  - **Blocked By**: Tasks 4, 5

  **References**:

  **Pattern References**:
  - ClawRouter `src/index.ts` plugin definition (lines ~880-950) — exact `OpenClawPluginDefinition` structure with `register(api)`, `api.registerProvider()`, `api.registerService()`, non-blocking model injection: https://github.com/BlockRunAI/ClawRouter/blob/main/src/index.ts
  - ClawRouter `injectModelsConfig()` — runtime config injection via `api.config.models.providers.blockrun`: same file, lines ~910-930
  - Copilot-proxy `index.ts` — minimal plugin definition with single provider: https://raw.githubusercontent.com/openclaw/openclaw/main/extensions/copilot-proxy/index.ts

  **WHY Each Reference Matters**:
  - ClawRouter shows the complete boot sequence: registerProvider → injectModelsConfig → registerService(stop cleanup). This is exactly our pattern.
  - ClawRouter's runtime config injection (`api.config.models.providers`) makes models available immediately without waiting for config file reload.
  - Copilot-proxy shows the minimal, clean plugin export structure.

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Plugin exports default with correct id and register function
    Tool: Bash
    Preconditions: src/index.ts compiled
    Steps:
      1. Run build: `npm run build`
      2. Run `node -e "import('./dist/index.js').then(m => { const p=m.default; console.log(p.id, typeof p.register) })"`
      3. Assert output: `openclaw-newclaw-auth function`
    Expected Result: Plugin has correct id and register is a function
    Evidence: .sisyphus/evidence/task-6-plugin-export.txt

  Scenario: register() does not throw when no API key present
    Tool: Bash
    Preconditions: Plugin compiled
    Steps:
      1. Unset NEWCLAW_API_KEY
      2. Run `node -e "import('./dist/index.js').then(m => { const api = { registerProvider: ()=>{}, registerService: ()=>{}, config: {}, logger: { info: console.log, warn: console.warn } }; m.default.register(api); console.log('OK') })"`
      3. Assert output contains `OK` and `no API key found`
    Expected Result: Plugin loads gracefully without API key
    Evidence: .sisyphus/evidence/task-6-no-key-graceful.txt

  Scenario: register() calls api.registerProvider with correct structure
    Tool: Bash
    Preconditions: Plugin compiled
    Steps:
      1. Run with mock api that captures registerProvider call
      2. Verify: id="newclaw", label="NewClaw AI", auth array has 1 entry with kind="custom"
    Expected Result: Provider registered with correct config
    Evidence: .sisyphus/evidence/task-6-register-provider.txt
  ```

  **Commit**: YES (group with Wave 2)
  - Message: `feat(core): model fetcher with 6h refresh + cache, auth wizard, plugin entry point`
  - Files: `src/index.ts`

- [x] 7. Vitest Configuration + Test Runner + Constants Tests

  **What to do**:
  - Set up vitest config: `vitest.config.ts` with `test: { globals: true }`
  - Create `src/__tests__/constants.test.ts`:
    - **PROVIDER_KEYS**: Has 5 entries, each has providerId, label, envVar, hint
    - **NEWCLAW_BASE_URL**: Equals "https://newclaw.ai"
    - **REFRESH_INTERVAL_MS**: Equals 21600000 (6 hours)
  - Run ALL tests (models.test.ts + auth.test.ts + constants.test.ts from Tasks 4-6) and ensure they pass
  - Fix any test failures discovered during the full test run

  **Must NOT do**:
  - Do not mock OpenClaw internals — only mock `fetch` for API calls
  - Do not rewrite tests from Tasks 4/5 — only add constants tests and fix failures

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 4, 5, 6

  **References**:

  **Pattern References**:
  - ClawRouter `test/` directory — vitest test patterns for OpenClaw plugins
  - `@mnfst/manifest` packages/openclaw-plugin/__tests__/routing.test.ts — mock api pattern (`{ registerProvider: jest.fn() }`)

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: All unit tests pass
    Tool: Bash
    Preconditions: All source files compiled, vitest configured
    Steps:
      1. Run `npm run test`
      2. Assert exit code 0
      3. Assert output shows 0 failures
    Expected Result: All tests green
    Failure Indicators: Non-zero exit code, test failures
    Evidence: .sisyphus/evidence/task-7-unit-tests.txt

  Scenario: Cache roundtrip test
    Tool: Bash
    Preconditions: Tests written
    Steps:
      1. Run `npm run test -- --reporter=verbose src/__tests__/models.test.ts`
      2. Assert "saveCache / loadCache" test group passes
    Expected Result: Cache serialization/deserialization works
    Evidence: .sisyphus/evidence/task-7-cache-tests.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(release): unit tests, build verification, npm publish prep`
  - Files: `vitest.config.ts`, `src/__tests__/models.test.ts`, `src/__tests__/auth.test.ts`, `src/__tests__/constants.test.ts`

- [x] 8. Build, Pack, Local Install, Full Lifecycle Integration Test

  **What to do**:
  - Run full build pipeline:
    1. `npm install` — install all dependencies
    2. `npm run build` — compile TypeScript to dist/
    3. `tsc --noEmit` — type check
    4. `npm run test` — run all unit tests
    5. `npm pack` — create tarball
  - Verify tarball contents:
    - Contains `dist/index.js`, `dist/index.d.ts`, `openclaw.plugin.json`, `package.json`
    - Does NOT contain `src/`, `node_modules/`, `.sisyphus/`
  - Test local install:
    - `openclaw plugins install ./openclaw-newclaw-auth-0.1.0.tgz` (or `openclaw plugins install ./`)
    - Verify plugin appears in `openclaw plugins list` (if OpenClaw is installed)
  - Integration test: import compiled plugin and verify:
    1. `default.id` === `"openclaw-newclaw-auth"`
    2. `default.register` is a function
    3. Calling `register(mockApi)` calls `mockApi.registerProvider` with correct args
    4. Provider has auth with `kind: "custom"`
    5. If NEWCLAW_API_KEY is set, model fetching is triggered (non-blocking)

  **Must NOT do**:
  - Do not skip the build step — tarball must contain compiled JS, not TS
  - Do not include dev files in tarball

  **Recommended Agent Profile**:
  - **Category**: `deep`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (sequential: after Tasks 6, 7)
  - **Blocks**: Task 9, F1-F4
  - **Blocked By**: Tasks 6, 7

  **References**:

  **Pattern References**:
  - ClawRouter package.json `files` field — controls what goes into npm tarball
  - OpenClaw voice-call plugin install docs — `openclaw plugins install @openclaw/voice-call` pattern

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build produces clean dist/ with no TypeScript errors
    Tool: Bash
    Preconditions: All source files written
    Steps:
      1. Run `npm install && npm run build`
      2. Assert exit code 0
      3. Run `ls dist/index.js dist/index.d.ts`
      4. Assert both files exist
      5. Run `tsc --noEmit`
      6. Assert exit code 0
    Expected Result: Clean build with JS + type definitions
    Failure Indicators: Build errors, missing files
    Evidence: .sisyphus/evidence/task-8-build.txt

  Scenario: npm pack produces tarball with correct contents
    Tool: Bash
    Preconditions: Build complete
    Steps:
      1. Run `npm pack --dry-run 2>&1`
      2. Assert output includes: `dist/index.js`, `openclaw.plugin.json`, `package.json`
      3. Assert output does NOT include: `src/`, `node_modules/`, `.sisyphus/`
      4. Run `npm pack`
      5. Assert produces `openclaw-newclaw-auth-0.1.0.tgz`
    Expected Result: Tarball has only published files
    Evidence: .sisyphus/evidence/task-8-pack.txt

  Scenario: Local plugin install succeeds (if openclaw available)
    Tool: Bash
    Preconditions: Tarball created, openclaw CLI available
    Steps:
      1. Run `openclaw plugins install ./openclaw-newclaw-auth-0.1.0.tgz`
      2. If openclaw not available, skip with note
      3. If available, run `openclaw plugins list` and verify `openclaw-newclaw-auth` appears
    Expected Result: Plugin installable locally
    Evidence: .sisyphus/evidence/task-8-local-install.txt

  Scenario: Compiled plugin export is valid
    Tool: Bash
    Preconditions: dist/ built
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => { const p=m.default; const calls=[]; const api={registerProvider:x=>calls.push(x),registerService:()=>{},config:{},logger:{info:()=>{},warn:()=>{}}}; p.register(api); console.log(calls[0].id, calls[0].auth.length, calls[0].auth[0].kind) })"`
      2. Assert output: `newclaw 1 custom`
    Expected Result: Plugin registers provider with correct auth config
    Evidence: .sisyphus/evidence/task-8-plugin-integration.txt
  ```

  **Commit**: YES (group with Wave 3)
  - Message: `feat(release): unit tests, build verification, npm publish prep`
  - Files: (no new files — verification only)

- [x] 9. npm Publish + OpenClaw Community Plugin PR Preparation

  **What to do**:
  - Guide user through npm account creation (reference `.sisyphus/drafts/npm-publish-guide.md` from Task 3)
  - Run `npm publish` to publish the package
  - Verify package is live: `npm info openclaw-newclaw-auth`
  - Test install from npm: `openclaw plugins install openclaw-newclaw-auth`
  - Prepare community plugin PR content for OpenClaw's `docs.openclaw.ai/plugins/community.md`:
    ```markdown
    * **NewClaw Auth** — NewClaw AI API integration for all major LLM providers (Claude, GPT, Gemini, Grok, DeepSeek)
      npm: `openclaw-newclaw-auth`
      repo: `https://github.com/<user>/openclaw-newclaw-auth`
      install: `openclaw plugins install openclaw-newclaw-auth`
    ```

  **Must NOT do**:
  - Do not publish if tests are failing
  - Do not publish without `prepublishOnly` script running build

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 3 (after Task 8)
  - **Blocks**: F1-F4
  - **Blocked By**: Tasks 3, 8

  **References**:

  **External References**:
  - npm publish docs: https://docs.npmjs.com/creating-and-publishing-unscoped-public-packages
  - OpenClaw community plugins page format: https://docs.openclaw.ai/plugins/community.md

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Package published and installable from npm
    Tool: Bash
    Preconditions: npm account configured, tests passing
    Steps:
      1. Run `npm publish`
      2. Wait 30 seconds for npm registry propagation
      3. Run `npm info openclaw-newclaw-auth version`
      4. Assert output: `0.1.0`
      5. Run `openclaw plugins install openclaw-newclaw-auth` (if openclaw available)
    Expected Result: Package live on npm and installable
    Evidence: .sisyphus/evidence/task-9-npm-publish.txt

  Scenario: npm publish fails gracefully if not authenticated
    Tool: Bash
    Preconditions: npm not logged in
    Steps:
      1. Run `npm whoami`
      2. If returns error, document: user needs to run `npm login` first
    Expected Result: Clear error message about authentication
    Evidence: .sisyphus/evidence/task-9-npm-auth-check.txt
  ```

  **Commit**: YES
  - Message: `chore: publish v0.1.0 to npm`
  - Pre-commit: `npm run build && npm run test`

---

## Final Verification Wave (MANDATORY — after ALL implementation tasks)

> 4 review agents run in PARALLEL. ALL must APPROVE. Rejection → fix → re-run.

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists (read file, check exports). For each "Must NOT Have": search codebase for forbidden patterns — reject with file:line if found. Check evidence files exist in .sisyphus/evidence/. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `tsc --noEmit` + `npm run build`. Review all source files for: `as any`/`@ts-ignore`, empty catches, console.log in prod code, commented-out code, unused imports. Check AI slop: excessive comments, over-abstraction, generic names (data/result/item/temp). Verify all imports resolve.
  Output: `Build [PASS/FAIL] | TypeCheck [PASS/FAIL] | Tests [N pass/N fail] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Real Manual QA** — `unspecified-high`
  Start from clean state. Run `npm run build && npm pack`. Verify tarball contents. Test `openclaw plugins install ./openclaw-newclaw-auth-*.tgz` (or local path). Verify plugin appears in `openclaw plugins list`. Check that `openclaw.plugin.json` is valid. Test auth flow if possible (may need mock). Verify config injection writes to `~/.openclaw/openclaw.json`. Save evidence to `.sisyphus/evidence/final-qa/`.
  Output: `Build [PASS/FAIL] | Pack [PASS/FAIL] | Install [PASS/FAIL] | Manifest [PASS/FAIL] | VERDICT`

- [x] F4. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual implementation. Verify 1:1 — everything in spec was built (no missing), nothing beyond spec was built (no creep). Check "Must NOT do" compliance: no request transformation, no proxy server, no hardcoded models, no OAuth. For multi-provider registration: verify sub-providers (e.g., `newclaw-anthropic`) are ONLY created when the user configured a specific key for that vendor — unconditional per-vendor providers are a violation, conditional ones are correct. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Guardrails [N/N respected] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Wave 1**: `feat(scaffold): project scaffolding with manifest, types, and npm config` — package.json, tsconfig, tsup, openclaw.plugin.json, types.ts
- **Wave 2**: `feat(core): model fetcher with 6h refresh + cache, auth wizard, plugin entry point` — models.ts, auth.ts, index.ts
- **Wave 3**: `feat(release): unit tests, build verification, npm publish prep` — tests, build config, README
- **Final**: `chore: final QA evidence and cleanup` — evidence files only

---

## Success Criteria

### Verification Commands
```bash
npm run build          # Expected: clean compile, dist/ created
tsc --noEmit           # Expected: 0 errors
npm pack               # Expected: openclaw-newclaw-auth-*.tgz created
npm run test           # Expected: all tests pass
```

### Final Checklist
- [ ] All "Must Have" present
- [ ] All "Must NOT Have" absent
- [ ] Build + typecheck clean
- [ ] npm pack produces valid tarball
- [ ] Plugin installable via `openclaw plugins install`
- [ ] Auth wizard is interactive — prompts user for each key via `ctx.prompter.text()`
- [ ] Auth wizard allows skipping optional provider-specific keys (Enter to skip)
- [ ] Models fetched from `/v1/models` and injected into config
- [ ] 6-hour refresh interval active (`setInterval`)
- [ ] 401/network error gracefully falls back to cached models
- [ ] Cache persisted to `~/.openclaw/newclaw/models-cache.json`
- [ ] Provider-specific key via sub-provider routing (`newclaw-anthropic/model` etc.)
- [ ] Startup key resolution: env var → api.config → persisted config file
