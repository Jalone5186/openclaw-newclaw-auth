# npm Publish Guide for openclaw-newclaw-auth

## Step 1: Create npm Account
1. Go to https://www.npmjs.com/signup
2. Enter username, email, password
3. Verify email address (check inbox)
4. Enable 2FA at https://www.npmjs.com/settings/~/profile (recommended)

## Step 2: Create Automation Token (CRITICAL)

> **坑警告**：npm 新账户默认开启 2FA。直接 `npm login` + `npm publish` 会报 `E403 Forbidden`。
> 必须用 **Classic Automation Token** 才能绕过 2FA 发布。

### 为什么不能直接 `npm login`？

`npm login` 创建的会话 token 没有 bypass 2FA 权限。`npm publish` 会报：

```
npm error code E403
npm error 403 Forbidden - Two-factor authentication or granular access
token with bypass 2fa enabled is required to publish packages.
```

### Token 类型对比

| Token 类型 | Bypass 2FA | 能否 Publish |
|---|---|---|
| `npm login` 会话 | ❌ | ❌ E403 |
| Granular Access Token | ❌ 默认不行 | ❌ E403 |
| **Classic → Automation** | **✅ 自动绕过** | **✅ 成功** |

### 创建步骤

1. 打开 https://www.npmjs.com/settings/~/tokens
2. 点 **"Generate New Token"**
3. 选 **"Classic Token"**（不是 Granular！）
4. 类型选 **"Automation"**
5. 点 Generate，复制 token（以 `npm_` 开头，只显示一次）

### 配置 Token

```bash
# 清掉旧 token，写入新 token（替换 YOUR_TOKEN）
grep -v "authToken" ~/.npmrc > /tmp/npmrc_clean && \
echo "//registry.npmjs.org/:_authToken=YOUR_TOKEN" >> /tmp/npmrc_clean && \
mv /tmp/npmrc_clean ~/.npmrc

# 验证配置
grep -c "authToken" ~/.npmrc && echo "Token configured"
npm whoami
```

> ⚠️ **安全提醒**：永远不要把 token 发到聊天记录、代码仓库或任何公开场所。
> 如果 token 泄露，立即在 npm 网站撤销并重新生成。

## Step 3: Publish the Package

从项目目录执行：
```bash
npm publish
```
`prepublishOnly` 脚本会自动执行 `npm run build`。

## Step 4: Verify
```bash
npm info openclaw-newclaw-auth
```
Wait 30-60 seconds for npm registry to propagate.

## Step 5: Test Install
```bash
openclaw plugins install openclaw-newclaw-auth
```

## Step 6: List on OpenClaw Community Plugins (Optional)
Submit a PR to add to the community plugins list:
- File: `docs.openclaw.ai` repo → `plugins/community.md`
- Format:
  ```
  * **NewClaw Auth** — NewClaw AI API integration for all major LLM providers
    npm: `openclaw-newclaw-auth`
    install: `openclaw plugins install openclaw-newclaw-auth`
  ```

## Updating the Package
1. Bump version in package.json
2. `npm publish`

## Troubleshooting

### E403 Forbidden — Two-factor authentication required
**最常见的坑。** 原因：npm 默认开启 2FA，普通登录会话和 Granular Token 都没有 bypass 权限。
- **解决**：必须用 **Classic → Automation Token**，见 Step 2
- Granular Access Token 不行，即使勾了 Read and write 也不行
- `npm login` 的会话 token 也不行

### E403 Forbidden — 其他原因
- 包名被占用 → 换名字
- 没有登录 → `npm whoami` 检查

### E409 Conflict — Version already exists
版本号已经发布过 → `npm version patch` 升版本后重新发布

### Token 泄露了怎么办
1. 立即打开 https://www.npmjs.com/settings/~/tokens
2. 找到泄露的 token → 点 Revoke（撤销）
3. 生成新的 Automation Token
4. 更新 `~/.npmrc`
