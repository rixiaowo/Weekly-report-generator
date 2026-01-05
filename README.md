# Git 周报生成器

根据 Git 提交记录自动生成周报的 Web 应用，支持 AI 智能生成。

## 功能特点

- 📊 **可视化界面** - 现代化 Web UI，操作简单
- 🔧 **自定义配置** - 支持自定义仓库路径、日期范围
- 🤖 **AI 智能生成** - 集成 OpenAI 兼容 API，智能总结提交内容
- 📝 **详细变更** - 读取每个提交的具体变更文件

## 快速开始

### 1. 安装依赖

```bash
cd git-weekly-report
npm install
```

### 2. 启动服务器

```bash
npm run server
```

### 3. 打开浏览器

访问 http://localhost:3000

## 使用说明

### Web 界面使用

1. **输入仓库路径** - 输入本地 Git 仓库的完整路径
2. **选择日期范围** - 默认为过去 7 天
3. **配置 AI（可选）**
   - API Base URL: 例如 `https://api.openai.com/v1`
   - API Key: 你的 API 密钥
4. **点击生成周报** - 查看并下载生成的周报

### 支持的 AI 服务

支持所有 OpenAI 兼容的 API，包括：

| 服务 | Base URL |
|------|----------|
| OpenAI | `https://api.openai.com/v1` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` |
| 文心一言 | `https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop` |
| DeepSeek | `https://api.deepseek.com/v1` |
| 自定义部署 | 你的服务器地址 |

## 命令行使用（旧版）

```bash
# 在当前 Git 仓库生成周报
node index.js

# 指定多个仓库
node index.js /path/to/repo1 /path/to/repo2

# 自定义配置
REPORT_DAYS=14 GIT_AUTHOR="Your Name" node index.js
```

## 项目结构

```
git-weekly-report/
├── server.js           # Express 服务器
├── index.js            # CLI 工具（旧版）
├── lib/
│   ├── git.js          # Git 操作模块
│   └── llm.js          # LLM API 模块
├── public/
│   ├── index.html      # Web 界面
│   ├── style.css       # 样式文件
│   └── app.js          # 前端逻辑
└── package.json
```

## 输出示例

```markdown
# 周报

**作者:** Your Name
**时间范围:** 2026-01-01 ~ 2026-01-05

---

## 本周工作概述

本周主要完成了用户认证模块的开发和多个 Bug 修复...

## 功能开发

- 完成用户登录/注册功能
- 添加 JWT 令牌认证

## Bug 修复

- 修复表单验证问题
- 修复移动端显示异常

## 下周计划

- [ ] 待添加
```

## License

MIT
