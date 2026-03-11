# OpenClaw + NewClaw 插件完整安装教程

从零开始，一步步教你安装 OpenClaw 并配置 NewClaw AI 插件，让所有大模型 API 调用通过 NewClaw 平台路由。

---

## 前置条件

OpenClaw 需要 **Node.js 22+** 和 **Git**。下面分别检查和安装。

### 1. 安装 Node.js

打开终端（macOS/Linux）或 PowerShell（Windows），检查是否已安装：

```bash
node -v
```

如果输出 `v22.x.x` 或更高版本，跳到「[安装 Git](#2-安装-git)」。

如果没有安装或版本低于 22，按你的操作系统选择安装方式：

#### macOS

打开「终端」应用（在启动台搜索"终端"），粘贴以下命令并按回车：

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.zshrc && nvm install 22
```

> ⚠️ 如果上面的命令执行后提示 `nvm: command not found`，说明你的终端用的是 bash 而不是 zsh，改用这条命令：
> ```bash
> curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22
> ```

安装完成后验证：

```bash
node -v
# 应该输出 v22.x.x
```

#### Linux（Ubuntu/Debian）

打开终端，粘贴以下命令：

```bash
# 安装 nvm，然后通过 nvm 安装 Node 22
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash && source ~/.bashrc && nvm install 22
```

安装完成后验证：

```bash
node -v
# 应该输出 v22.x.x
```

#### Windows

Windows 有两种方式，选一种即可：

**方式 A：直接下载安装包（推荐新手）**

1. 打开浏览器访问 https://nodejs.org/zh-cn
2. 下载 **LTS 版本**（确保版本号 ≥ 22）
3. 双击下载的 `.msi` 文件，一路点「下一步」直到安装完成
4. **重启 PowerShell**（关掉再重新打开）

**方式 B：通过 winget 安装（如果你熟悉命令行）**

以管理员身份打开 PowerShell，运行：

```powershell
winget install OpenJS.NodeJS.LTS
```

安装完成后**重启 PowerShell**，然后验证：

```powershell
node -v
# 应该输出 v22.x.x
```

### 2. 安装 Git

Git 用于版本控制和代码管理。OpenClaw 的部分依赖包需要通过 Git 拉取，**不安装 Git 会导致 OpenClaw 安装失败**。

检查是否已安装：

```bash
git --version
```

如果输出 `git version x.x.x`，跳到「[第一步：安装 OpenClaw](#第一步安装-openclaw)」。

如果提示命令不存在，按操作系统安装：

#### macOS

```bash
xcode-select --install
```

弹出安装对话框后点「安装」，等待完成即可（会自动安装 Git）。

#### Linux（Ubuntu/Debian）

```bash
sudo apt update && sudo apt install -y git
```

#### Windows

以管理员身份打开 PowerShell，运行：

```powershell
winget install Git.Git
```

安装完成后**关闭并重新打开 PowerShell**（⚠️ 必须重启，否则 Git 不会生效），然后验证：

```powershell
git --version
# 应该输出 git version x.x.x
```

> ⚠️ 如果重启 PowerShell 后仍然提示找不到 `git` 命令，需要手动添加 Git 到 PATH：
> ```powershell
> # 临时添加（当前会话生效）
> $env:PATH = "C:\Program Files\Git\cmd;$env:PATH"
>
> # 永久添加（以管理员身份运行）
> [Environment]::SetEnvironmentVariable("PATH", "C:\Program Files\Git\cmd;" + [Environment]::GetEnvironmentVariable("PATH", "Machine"), "Machine")
> ```
> 添加后重启 PowerShell 再验证。

---

## 第一步：安装 OpenClaw

### macOS / Linux

打开终端，运行：

```bash
npm install -g openclaw@latest
```

> ⚠️ 安装过程中可能出现 `node-llama-cpp` 相关的红色报错（如 `cmake` 找不到、编译失败），**这是正常的，不影响安装**。`node-llama-cpp` 是可选的本地 AI 嵌入组件，编译失败只会产生警告，不会中断 OpenClaw 的安装。AI 聊天、模型调用、插件等核心功能完全不受影响。

> ⚠️ 如果安装过程中提示 `sharp` 相关错误，改用这条命令安装：
> ```bash
> SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
> ```

> ⚠️ 如果安装完成后运行 `openclaw` 提示「命令未找到」，执行以下命令修复：
>
> **macOS（zsh）：**
> ```bash
> echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
> ```
>
> **Linux（bash）：**
> ```bash
> echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
> ```
>
> 执行后 `openclaw` 命令立刻可用，且下次打开终端也不会丢失。

### Windows

以**管理员身份**打开 PowerShell，运行：

```powershell
npm install -g openclaw@latest
```

> ⚠️ 安装过程中可能出现 `node-llama-cpp` 相关的红色报错（如 `cmake` 找不到、编译失败），**这是正常的，不影响安装**。`node-llama-cpp` 是可选的本地 AI 嵌入组件，编译失败只会产生警告，不会中断安装。AI 聊天、模型调用、插件等核心功能完全不受影响。

> ⚠️ 如果 PowerShell 提示执行策略错误，先运行：
> ```powershell
> Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
> ```
> 然后重新运行安装命令。

> ⚠️ 如果安装完成后 `openclaw` 命令找不到，重启 PowerShell 再试。如果仍然找不到，运行以下命令把 npm 全局路径永久加到系统 PATH：
> ```powershell
> # 一条命令搞定（以管理员身份运行 PowerShell）
> $npmPath = (npm prefix -g); [Environment]::SetEnvironmentVariable("PATH", "$npmPath;" + [Environment]::GetEnvironmentVariable("PATH", "Machine"), "Machine")
> ```
> 运行后重启 PowerShell，`openclaw` 即可使用。
>
> > 💡 npm 全局路径通常是 `C:\Users\你的用户名\AppData\Roaming\npm`，上面的命令会自动检测，不需要手动查找。

### 验证安装成功

```bash
openclaw --version
```

如果输出版本号，说明安装成功。

> ⚠️ **先不要运行 `openclaw onboard`**！需要先安装插件和配置 API Key，这样初始化引导时才能选到 NewClaw 的模型。

---

## 第二步：安装 NewClaw 插件

在终端（macOS/Linux）或 PowerShell（Windows）中运行：

```bash
openclaw plugins install openclaw-newclaw-auth
```

等待安装完成，终端会提示安装成功。

然后启用插件：

```bash
openclaw plugins enable openclaw-newclaw-auth
```

> ⚠️ 如果 gateway 正在运行，需要重启才能加载新插件：
> ```bash
> openclaw gateway stop
> openclaw gateway run
> ```

> ⚠️ **关于安全警告**：安装时 OpenClaw 可能会弹出安全提示，提示该插件存在"环境变量访问+网络发送"代码模式。**这是正常的**——NewClaw 插件需要读取你的 API Key（环境变量）并发送到 `newclaw.ai` 进行认证和模型调用，属于插件的正常行为。选择「允许」即可。

---

## 第三步：配置 NewClaw API Key

### 3.1 获取 API Key

1. 打开浏览器访问 [https://newclaw.ai](https://newclaw.ai)
2. 注册账号（如果还没有）
3. 在控制台找到你的 **API Key**（通常以 `sk-` 开头）
4. 复制这个 Key，接下来要用

### 3.2 运行认证向导

在终端运行：

```bash
openclaw models auth login --provider newclaw --set-default
```

向导会一步步提示你输入（如果之前配置过，会检测到已有 Key 并询问是否复用）：

```
? Enter your NewClaw universal API key (from newclaw.ai)
> 粘贴你的 API Key，按回车

  ✓ Verifying API key...
  ✓ Verified! Found 42 models

? Claude / Claude Code specific key (Enter to skip, uses universal key)
> 直接按回车跳过（除非你有 Anthropic 专用 Key）

? Gemini specific key (Enter to skip, uses universal key)
> 直接按回车跳过

? GPT / Codex specific key (Enter to skip, uses universal key)
> 直接按回车跳过

? Grok specific key (Enter to skip, uses universal key)
> 直接按回车跳过

? DeepSeek specific key (Enter to skip, uses universal key)
> 直接按回车跳过
```

> 💡 **厂商专用 Key 全部是可选的**。如果你只有一个通用 Key，全部按回车跳过即可。所有模型都会通过通用 Key 路由。
>
> 💡 如果你有某个厂商的专用 Key（比如 Anthropic 的 Key），输入后该厂商的模型会优先使用专用 Key 调用，获得更好的性能。

配置完成后，向导会显示类似：

```
✓ Universal provider registered: newclaw (42 models)
✓ Default model: newclaw/claude-3.5-sonnet
```

---

## 第四步：初始化配置（首次安装必须）

现在插件和 API Key 都已就绪，运行 OpenClaw 的初始化引导。**因为插件已经加载，引导过程中你可以直接选择 NewClaw 提供的模型：**

```bash
openclaw onboard --install-daemon
```

引导流程中的关键选择：

1. **选择是否安装守护进程** → 选 Yes
2. **选择配置方式** → 选 Quick Start
3. **是否使用已有配置** → 选 Use existing（因为上一步已经配置了 NewClaw）
4. **选择模型供应商** → 跳过（NewClaw 已通过插件配置好）
5. **选择默认模型** → 选 `newclaw/` 开头的模型（如 `newclaw/claude-3-opus`）
6. **后续选项**（聊天渠道、skills 等） → 按需选择或跳过

> 💡 如果你不是第一次安装 OpenClaw（之前已经运行过 onboard），可以跳过这一步。

---

## 第五步：验证一切正常

### 5.1 检查插件状态

```bash
openclaw plugins list
```

在输出列表中应该能看到 `openclaw-newclaw-auth`。

### 5.2 检查模型是否可用

```bash
openclaw models
```

应该能看到通过 NewClaw 加载的模型列表（如 `newclaw/claude-3.5-sonnet`、`newclaw/gpt-4o` 等）。

### 5.3 打开仪表板（可选）

```bash
openclaw dashboard
```

会在浏览器中打开 OpenClaw 的管理界面，你可以在这里看到所有已配置的模型和提供商。

---

## 常见问题

### Q: `openclaw` 命令找不到？

**macOS/Linux：**

```bash
# 检查 npm 全局路径是否在 PATH 中
echo "$PATH" | tr ':' '\n' | grep npm

# 如果没有输出，添加到 PATH
echo 'export PATH="$(npm prefix -g)/bin:$PATH"' >> ~/.zshrc && source ~/.zshrc
```

> 💡 如果你用的是 bash，把 `~/.zshrc` 换成 `~/.bashrc`

**Windows：**

重启 PowerShell。如果仍然找不到，运行以下命令永久添加 npm 全局路径到 PATH：

```powershell
# 一条命令搞定（以管理员身份运行 PowerShell）
$npmPath = (npm prefix -g); [Environment]::SetEnvironmentVariable("PATH", "$npmPath;" + [Environment]::GetEnvironmentVariable("PATH", "Machine"), "Machine")
```

运行后重启 PowerShell 即可。

### Q: 安装 OpenClaw 时 `sharp` 报错？

```bash
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm install -g openclaw@latest
```

### Q: 运行 `openclaw models auth login --provider newclaw` 时提示找不到 provider？

确认插件已安装并启用：

```bash
openclaw plugins list
```

如果列表中没有 `openclaw-newclaw-auth`，重新安装：

```bash
openclaw plugins install openclaw-newclaw-auth
openclaw plugins enable openclaw-newclaw-auth
```

如果已安装但未启用，只需启用：

```bash
openclaw plugins enable openclaw-newclaw-auth
```

如果 gateway 正在运行，重启一下：

```bash
openclaw gateway stop
openclaw gateway run
```

### Q: API Key 验证失败？

- 确认 Key 复制完整（没有多余空格）
- 确认网络能访问 `https://newclaw.ai`（可以在浏览器打开试试）
- 如果使用了代理/VPN，确保终端也走了代理：
  ```bash
  # macOS/Linux
  export https_proxy=http://127.0.0.1:7890  # 换成你的代理地址
  
  # Windows PowerShell
  $env:https_proxy = "http://127.0.0.1:7890"
  ```

### Q: 想重新配置 Key？

重新运行认证向导即可。向导会检测到已有 Key，你可以选择复用或输入新 Key：

```bash
openclaw models auth login --provider newclaw --set-default
```

### Q: 想卸载插件？

```bash
openclaw plugins uninstall openclaw-newclaw-auth
```

---

## 快速参考

| 操作 | 命令 |
|---|---|
| 安装 OpenClaw（全平台） | `npm install -g openclaw@latest` |
| 安装 NewClaw 插件 | `openclaw plugins install openclaw-newclaw-auth` |
| 启用插件 | `openclaw plugins enable openclaw-newclaw-auth` |
| 配置 API Key | `openclaw models auth login --provider newclaw --set-default` |
| 初始化引导（首次安装） | `openclaw onboard --install-daemon` |
| 重启 gateway | `openclaw gateway stop && openclaw gateway run` |
| 检查安装状态 | `openclaw doctor` |
| 查看已装插件 | `openclaw plugins list` |
| 查看可用模型 | `openclaw models` |
| 打开管理面板 | `openclaw dashboard` |
| 重新配置 Key | `openclaw models auth login --provider newclaw --set-default` |
| 卸载插件 | `openclaw plugins uninstall openclaw-newclaw-auth` |
| 更新 OpenClaw | `npm install -g openclaw@latest` |
