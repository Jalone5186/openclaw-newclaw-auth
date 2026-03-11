# 通过 OpenCode 一键安装 OpenClaw + NewClaw 插件

如果你的电脑上已经安装了 [OpenCode](https://github.com/opencode-ai/opencode)，可以直接把下面的提示词发给 OpenCode，让 AI 帮你自动完成所有安装步骤。

> ⚠️ **Windows 用户注意**：OpenCode 的 bash 工具在 Windows 上可能使用 cmd.exe 执行命令，`export` 等 Linux 语法会报错但不影响后续命令执行。如果遇到反复报错，建议回退到 [手动安装教程](./install-guide-zh.md)。

---

## 使用方法

1. 打开终端，启动 OpenCode
2. 把下面方框里的**全部内容**复制，粘贴发送给 OpenCode
3. 坐等 AI 自动执行安装，中间可能会暂停等你输入 NewClaw API Key

---

## 复制以下内容发送给 OpenCode

```
帮我安装 OpenClaw 和 NewClaw 插件。请严格按照以下步骤执行，每一步都要运行命令并确认结果，遇到错误要自动排查修复。

重要提醒：
- 在 Windows 上不要使用 export 命令（那是 Linux 语法），用 set 或 PowerShell 的 $env: 语法
- 安装 OpenClaw 时 node-llama-cpp 相关的红色报错是正常的，不影响安装，不要尝试修复
- 安装 Git 后必须重启终端再继续，否则 git 命令不可用

## 步骤 1：检查 Node.js 版本

运行 `node -v` 检查版本号。

- 如果版本 >= 22（如 v22.x.x），直接进入步骤 2
- 如果版本低于 22 或命令不存在，需要先安装 Node.js 22：
  - macOS：运行 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.zshrc && nvm install 22`，如果报 `nvm: command not found` 则改用 `source ~/.bashrc` 后重试
  - Linux：运行 `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22`
  - Windows：运行 `winget install OpenJS.NodeJS.LTS`，安装后重启终端
- 安装后再次运行 `node -v` 确认版本 >= 22

## 步骤 2：检查 Git

运行 `git --version` 检查是否已安装。OpenClaw 的部分依赖包使用 git URL 格式，不装 Git 会导致 npm install 失败。

- 如果输出版本号（如 `git version 2.x.x`），直接进入步骤 3
- 如果命令不存在，需要安装 Git：
  - macOS：运行 `xcode-select --install`，弹出对话框后点安装
  - Linux：运行 `sudo apt update && sudo apt install -y git`
  - Windows：运行 `winget install Git.Git`，安装后必须重启终端（关闭再重新打开），否则 git 命令不可用。重启后如果仍然找不到 git，手动添加 PATH：在 PowerShell 中运行 `$env:PATH = "C:\Program Files\Git\cmd;$env:PATH"`
- 安装后再次运行 `git --version` 确认成功

## 步骤 3：安装 OpenClaw

先运行 `openclaw --version` 检查是否已安装。

- 如果已安装，跳到步骤 4
- 如果未安装，运行：`npm install -g openclaw@latest`
  - 安装过程中可能出现 node-llama-cpp 相关的红色报错（如 cmake 找不到），这是正常的，不影响安装。它是可选的本地 AI 组件，编译失败只产生警告不会中断安装
- 如果遇到 sharp 相关错误，改用：`SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest`
- 如果安装后 `openclaw` 命令找不到：
  - macOS（zsh）：运行 `echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc`
  - Linux（bash）：运行 `echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc`
  - Windows：重启终端再试。如果仍然找不到，以管理员身份运行 PowerShell 执行：`$npmPath = (npm prefix -g); [Environment]::SetEnvironmentVariable("PATH", "$npmPath;" + [Environment]::GetEnvironmentVariable("PATH", "Machine"), "Machine")`，然后重启终端
- 确认安装成功：运行 `openclaw --version`，应该输出版本号
- **重要：先不要运行 `openclaw onboard`！需要先安装插件和配置 API Key**

## 步骤 4：安装 NewClaw 插件

先检查插件是否已经安装过：运行 `ls ~/.openclaw/extensions/openclaw-newclaw-auth 2>/dev/null && echo "已存在" || echo "未安装"`

- 如果已存在，需要先删除再重装（OpenClaw 不支持覆盖安装）：`rm -rf ~/.openclaw/extensions/openclaw-newclaw-auth`
- Windows 上用：`Remove-Item -Recurse -Force "$env:USERPROFILE\.openclaw\extensions\openclaw-newclaw-auth"`

然后安装：`openclaw plugins install openclaw-newclaw-auth`

如果安装时报 `plugin already exists` 错误，说明没删干净，重新执行上面的删除命令后再装。更新插件到最新版本也是同样的操作（先删后装），API Key 配置不会丢失。

安装过程中如果 OpenClaw 弹出安全警告（提示插件存在"环境变量访问+网络发送"），这是正常的——插件需要读取 API Key 并发送到 newclaw.ai，选择「允许」即可。

安装完成后启用插件：`openclaw plugins enable openclaw-newclaw-auth`

如果 gateway 正在运行，需要重启：先运行 `openclaw gateway stop`，再运行 `openclaw gateway run`。

最后运行 `openclaw plugins list` 确认列表中有 `openclaw-newclaw-auth` 且状态为已启用。

## 步骤 5：配置 NewClaw API Key

提醒用户："请提供你的 NewClaw API Key（从 https://newclaw.ai 获取，以 sk- 开头）"

拿到 Key 后，需要把 Key 写入 OpenClaw 配置。方法是直接写入配置文件：

读取 ~/.openclaw/openclaw.json（如果不存在就创建），在 models.providers 下添加 newclaw 配置，同时添加 auth.order 让 OpenClaw 知道用哪个认证配置：

```json
{
  "auth": {
    "order": {
      "newclaw": ["newclaw:default"]
    }
  },
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

## 步骤 6：初始化引导（首次安装）

如果是第一次安装 OpenClaw，运行：`openclaw onboard --install-daemon`

在引导过程中，因为插件已经加载，用户可以选择 NewClaw 提供的模型作为默认模型。引导中的关键选择：
- 选择配置方式 → 选 Quick Start
- 是否使用已有配置 → 选 Use existing（上一步已配好 NewClaw）
- 选择模型供应商 → 跳过（已通过插件配置）
- 选择默认模型 → 选 newclaw/ 开头的模型

如果之前已经运行过 onboard，可以跳过这一步。

## 步骤 7：验证

运行 `openclaw doctor` 确认没有红色错误。
运行 `openclaw models` 确认能看到 newclaw/ 开头的模型。

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
- 步骤 5 中 AI 会暂停问你要 API Key，把你从 [newclaw.ai](https://newclaw.ai) 拿到的 Key 粘贴给它即可
- 整个过程通常 2-3 分钟完成

## Windows 用户常见问题

- **`export` 命令报错**：这是因为 OpenCode 在 Windows 上可能用 cmd.exe 执行命令，`export` 是 Linux 语法。如果影响安装，请使用 [手动安装教程](./install-guide-zh.md)
- **安装 Git 后仍然找不到 git**：需要关闭并重新打开终端窗口，或手动添加 `C:\Program Files\Git\cmd` 到 PATH
- **`node-llama-cpp` 编译失败**：这是正常的，不影响安装和使用。它是可选的本地 AI 嵌入组件，编译失败只产生警告

## 如果 OpenCode 执行失败怎么办

可以回退到手动安装，参考 [手动安装教程](./install-guide-zh.md)。
