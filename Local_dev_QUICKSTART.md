# 本地开发快速启动指南

## 前置要求

确保已安装：
- Node.js 18+
- pnpm（推荐）或 npm

安装 pnpm（如果未安装）：
```bash
npm install -g pnpm
```

安装 Wrangler（Cloudflare CLI）：
```bash
npm install -g wrangler
```

## 安装依赖

### 后端（Worker）
```bash
cd worker
pnpm install
```

### 前端（Vue）
```bash
cd frontend
pnpm install
```

## 本地运行

### 1. 启动 Worker（终端 1）
```bash
cd worker
pnpm dev
```
Worker 将运行在 `http://localhost:8787`

### 2. 启动前端（终端 2）
```bash
cd frontend
pnpm dev
```
前端将运行在 `http://localhost:5173`

### 3. 访问应用
打开浏览器访问：`http://localhost:5173`

## 测试邮件发送

1. 获取 Resend API Key：
   - 访问 https://resend.com/api-keys
   - 创建一个新的 API key

2. 在表单中填写：
   - API Key：你的 Resend API key
   - 发件人：已在 Resend 验证的域名邮箱（如 `onboarding@resend.dev`）
   - 收件人：你的测试邮箱
   - 主题和内容

3. 点击"发送邮件"

## 测试功能清单

- [ ] 基础文本邮件发送
- [ ] HTML 邮件发送
- [ ] 多收件人（逗号分隔）
- [ ] 抄送（CC）
- [ ] 密送（BCC）
- [ ] 附件上传
- [ ] 错误处理（无效 API key）
- [ ] 表单验证

## 常见问题

### Worker 启动失败
- 检查是否已安装 `wrangler`
- 检查 Node.js 版本是否 ≥ 18

### 前端无法连接后端
- 确保 Worker 正在运行（端口 8787）
- 检查 `frontend/vite.config.ts` 中的代理配置

### 邮件发送失败
- 检查 API key 是否正确
- 检查发件人邮箱是否已在 Resend 验证
- 查看浏览器控制台和 Worker 日志
