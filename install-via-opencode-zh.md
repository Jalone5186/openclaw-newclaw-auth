# 通过 OpenCode 一键安装 OpenClaw + NewClaw 插件

如果你的电脑上已经安装了 [OpenCode](https://github.com/opencode-ai/opencode)，可以直接把下面的提示词发给 OpenCode，让 AI 帮你自动完成所有安装步骤。

---

## 使用方法

1. 打开终端，启动 OpenCode
2. 把下面方框里的**全部内容**复制，粘贴发送给 OpenCode
3. 坐等 AI 自动执行安装，中间可能会暂停等你输入 NewClaw API Key

---

## 复制以下内容发送给 OpenCode

```
帮我安装 OpenClaw 和 NewClaw 插件。请严格按照以下步骤执行，每一步都要运行命令并确认结果，遇到错误要自动排查修复。

## 步骤 1：检查 Node.js 版本

运行 `node -v` 检查版本号。

- 如果版本 >= 22（如 v22.x.x），直接进入步骤 2
- 如果版本低于 22 或命令不存在，需要先安装 Node.js 22：
  - macOS：运行 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.zshrc && nvm install 22`，如果报 `nvm: command not found` 则改用 `source ~/.bashrc` 后重试
  - Linux：运行 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22`
- 安装后再次运行 `node -v` 确认版本 >= 22

## 步骤 2：安装 OpenClaw

先运行 `which openclaw` 或 `openclaw --version` 检查是否已安装。

- 如果已安装，跳到步骤 3
- 如果未安装，运行：`npm install -g openclaw@latest`（不需要 Git，纯 npm 安装）
- 安装完成后运行：`openclaw onboard --install-daemon`
- 如果遇到 sharp 相关错误，改用：`SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest`
- 如果安装后 `openclaw` 命令找不到，运行 `export PATH="$(npm prefix -g)/bin:$PATH"` 修复
- 确认安装成功：运行 `openclaw --version`，应该输出版本号

## 步骤 3：安装 NewClaw 插件

运行：`openclaw plugins install openclaw-newclaw-auth`

安装完成后运行 `openclaw plugins list` 确认列表中有 `openclaw-newclaw-auth`。

## 步骤 4：配置 NewClaw API Key

提醒用户："请提供你的 NewClaw API Key（从 https://newclaw.ai 获取，以 sk- 开头）"

拿到 Key 后，需要把 Key 写入 OpenClaw 配置。方法是直接写入配置文件：

读取 ~/.openclaw/openclaw.json（如果不存在就创建），在 models.providers 下添加 newclaw 配置：

```json
{
  "models": {
    "providers": {
      "newclaw": {
        "baseUrl": "https://newclaw.ai/v1",
        "api": "openai-completions",
        "apiKey": "用户提供的KEY"
      }
    }
  }
}
```

注意：如果文件已有其他内容，要合并而不是覆盖。写文件时使用原子写入（先写临时文件再 rename）。

## 步骤 5：验证

运行 `openclaw doctor` 确认没有红色错误。

## 完成

全部步骤执行完毕后，告诉用户：
- OpenClaw 和 NewClaw 插件已安装完成
- 可以运行 `openclaw models` 查看可用模型
- 可以运行 `openclaw dashboard` 打开管理面板
```

---

## 说明

- OpenCode 会自动检测你的操作系统并执行对应的命令
- 如果你的 Node.js 已经满足要求、OpenClaw 已经安装，AI 会自动跳过对应步骤
- 步骤 4 中 AI 会暂停问你要 API Key，把你从 [newclaw.ai](https://newclaw.ai) 拿到的 Key 粘贴给它即可
- 整个过程通常 2-3 分钟完成

## 如果 OpenCode 执行失败怎么办

可以回退到手动安装，参考 [手动安装教程](./install-guide-zh.md)。
