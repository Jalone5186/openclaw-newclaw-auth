# openclaw-newclaw-auth

[English](./README.md) | **中文**

OpenClaw 插件 —— 将 NewClaw AI 注册为模型提供商，通过交互式向导配置 API Key，自动获取并刷新模型列表。

## 安装教程

> **第一次使用 OpenClaw？** 请按照完整教程一步步操作：
>
> - [完整安装教程（中文）](./install-guide-zh.md) — 从 Node.js 安装到插件配置，覆盖 macOS / Linux / Windows 三大平台
> - [通过 OpenCode 一键安装（中文）](./install-via-opencode-zh.md) — 复制一段提示词给 OpenCode，AI 自动完成全部安装

## 快速安装

如果你已经在用 OpenClaw：

```bash
openclaw plugins install openclaw-newclaw-auth
```

## 快速配置

安装后运行认证向导：

```bash
openclaw auth newclaw
```

向导流程：
1. 输入 NewClaw 通用 API Key（必填，从 [newclaw.ai](https://newclaw.ai) 获取）
2. 自动验证 Key 有效性并拉取模型列表
3. 逐个提示输入厂商专用 Key（全部可跳过，按回车即可）

配置完成后，所有模型自动注入 OpenClaw 配置，即刻可用。

## 厂商专用 Key

| 厂商 | 环境变量 | 说明 |
|---|---|---|
| Claude / Claude Code | `NEWCLAW_ANTHROPIC_KEY` | Anthropic 专用 Key |
| Gemini | `NEWCLAW_GOOGLE_KEY` | Google 专用 Key |
| GPT / Codex | `NEWCLAW_OPENAI_KEY` | OpenAI 专用 Key |
| Grok | `NEWCLAW_XAI_KEY` | xAI 专用 Key |
| DeepSeek | `NEWCLAW_DEEPSEEK_KEY` | DeepSeek 专用 Key |

所有厂商专用 Key 均为可选。未配置专用 Key 的厂商模型会使用通用 Key 路由。

## 环境变量

| 变量 | 必填 | 说明 |
|---|---|---|
| `NEWCLAW_API_KEY` | 是 | NewClaw 通用 API Key |
| `NEWCLAW_ANTHROPIC_KEY` | 否 | 路由到 Anthropic (Claude) |
| `NEWCLAW_GOOGLE_KEY` | 否 | 路由到 Google (Gemini) |
| `NEWCLAW_OPENAI_KEY` | 否 | 路由到 OpenAI (GPT/Codex) |
| `NEWCLAW_XAI_KEY` | 否 | 路由到 xAI (Grok) |
| `NEWCLAW_DEEPSEEK_KEY` | 否 | 路由到 DeepSeek |

## 工作原理

NewClaw 是一个 OpenAI 兼容的 AI 平台（`https://newclaw.ai`）。本插件的运行机制：

1. **启动时**：从 `GET /v1/models` 获取最新模型列表，写入 OpenClaw 配置
2. **每 6 小时**：自动刷新模型列表（`setInterval`）
3. **API 异常时**：使用本地缓存的模型列表（`~/.openclaw/newclaw/models-cache.json`）
4. **Key 优先级**：配置了专用 Key 的厂商通过子 provider（如 `newclaw-anthropic`）路由，使用专用 Key 调用

### Key 解析链

```
环境变量 NEWCLAW_API_KEY → OpenClaw 运行时配置 → ~/.openclaw/openclaw.json
```

### 专用 Key 路由

配置了专用 Key 后，对应厂商的模型会同时出现在两个 provider 下：

- `newclaw-anthropic/claude-3-opus` → 使用 Anthropic 专用 Key
- `newclaw/claude-3-opus` → 使用通用 Key

默认模型优先选择专用 Key 版本。

## 开发

```bash
npm run build       # 构建到 dist/
npm run dev         # 监听模式构建
npm run test        # 运行所有测试
npm run typecheck   # TypeScript 类型检查
npm pack            # 打包 tarball
```

## 许可证

MIT
