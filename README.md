# Resend-Online

基于 Resend API 的在线邮件发送工具

## 快速部署

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/sean908/resend-cloudflare-workers)

点击上方按钮即可一键部署到 Cloudflare。部署完成后：
1. 获取你的 Resend API Key（访问 [resend.com/api-keys](https://resend.com/api-keys)）
2. 在部署的应用中输入 API Key 开始使用

> **注意**：此项目包含前后端两部分。一键部署会部署 Worker 后端，前端需要单独部署到 Cloudflare Pages（见下方"部署"章节）。

## 技术栈
- 前端：Vue 3 + Vite + Tailwind CSS
- 后端：Cloudflare Workers
- 邮件服务：Resend API

## 架构
- 前后端分离
- 无状态设计（API key 不存储）
- 全球边缘部署

## 目录结构
- `frontend/` - Vue 3 应用
- `worker/` - Cloudflare Worker API

## 功能特性
- 基础文本/HTML 邮件发送
- 附件上传支持
- 抄送/密送（CC/BCC）
- 实时发送状态反馈

## 本地开发

### 前置要求
- Node.js 18+
- pnpm 8+
- Wrangler CLI

### 后端（Worker）
```bash
cd worker
pnpm install
pnpm dev  # 启动在 http://localhost:8787
```

### 前端（Vue）
```bash
cd frontend
pnpm install
pnpm dev  # 启动在 http://localhost:5173
```

## 部署

### 方式一：一键部署（推荐）

#### 1. 部署 Worker 后端
点击上方的 "Deploy to Cloudflare Workers" 按钮，按照提示完成部署。

#### 2. 部署前端到 Cloudflare Pages
有两种方式：

**方式 A：通过 Cloudflare Dashboard（推荐）**
1. 访问 [Cloudflare Pages](https://dash.cloudflare.com/pages)
2. 点击 "Create a project" → "Connect to Git"
3. 选择你 fork 的仓库
4. 配置构建设置：
   - **构建命令**: `cd frontend && npm install && npm run build`
   - **构建输出目录**: `frontend/dist`
   - **Root directory**: `/`（保持为空或选择根目录）
5. 点击 "Save and Deploy"

**方式 B：使用 Wrangler CLI**
```bash
cd frontend
pnpm install
pnpm build
npx wrangler pages deploy dist --project-name=resend-online-frontend
```

#### 3. 配置前端 API 地址
部署完成后，需要将前端的 API 请求指向你的 Worker 域名。修改 `frontend/vite.config.ts` 中的 proxy 配置为你的 Worker URL。

### 方式二：手动部署

#### 部署 Worker
```bash
cd worker
pnpm install
wrangler login
wrangler deploy
```

#### 部署前端（Cloudflare Pages）
```bash
cd frontend
pnpm install
pnpm build
wrangler pages deploy dist
```

## 环境变量

Worker 需要配置 `.dev.vars`（本地开发）或通过 Wrangler 设置环境变量（生产环境）。

## 安全说明

- API key 仅在请求体中传输，不存储在服务端
- 每次发送邮件需要重新输入 API key
- 建议在生产环境使用 HTTPS
