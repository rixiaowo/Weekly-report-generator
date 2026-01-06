# Git 周报生成器

根据 Git 提交记录自动生成周报的 Web 应用，支持 AI 智能生成。

## 功能特点

- 📊 **可视化界面** - 现代化 Web UI，深色主题
- 📁 **多项目支持** - 同时管理多个 Git 仓库
- 🔄 **所有分支** - 读取本地所有分支的提交记录
- 🤖 **AI 智能生成** - 集成 OpenAI 兼容 API（火山引擎、通义千问等）
- 💾 **配置缓存** - 项目列表和 API 配置自动保存到本地
- 📝 **详细变更** - 读取每个提交的具体变更文件和 diff

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

1. **添加项目** - 输入本地 Git 仓库路径，点击「➕ 添加」
2. **支持多项目** - 可添加多个仓库，生成汇总周报
3. **选择日期范围** - 默认为过去 7 天
4. **配置 AI（可选）**
   - API Base URL: 例如 `https://ark.cn-beijing.volces.com/api/v3`
   - API Key: 你的 API 密钥
   - 模型名称: 例如 `deepseek-v3-1-250821`
5. **点击生成周报** - 查看并下载生成的周报

### 配置自动保存

以下配置会自动保存到浏览器本地，刷新页面后自动恢复：
- 项目列表
- API Base URL / API Key / 模型名称
- 作者名称

### 支持的 AI 服务

支持所有 OpenAI 兼容的 API：

| 服务 | Base URL | 模型名称示例 |
|------|----------|-------------|
| 火山引擎 | `https://ark.cn-beijing.volces.com/api/v3` | `deepseek-v3-1-250821` |
| OpenAI | `https://api.openai.com/v1` | `gpt-3.5-turbo` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| 通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo` |

## 周报格式

生成的周报格式如下：

```
本周工作总结:
1. ai-gansu：
    a. 添加门票卡片，专题卡片为单独大卡
    b. 屏蔽大交通卡片，并用缓存数据进行代替
    c. 添加拍图实景功能
2. another-project：
    a. 完成用户认证模块

下周工作计划:
1. 待规划

其他思考:
-
```

## 自定义 Prompt

如需修改 AI 生成周报的提示词，编辑 `lib/llm.js` 文件：

- **主 Prompt**: 搜索 `const prompt =`（约第 24 行）
- **System Prompt**: 搜索 `role: 'system'`（约第 88 行）

## 项目结构

```
git-weekly-report/
├── server.js           # Express 服务器（支持多仓库）
├── index.js            # CLI 工具（旧版）
├── lib/
│   ├── git.js          # Git 操作模块（读取所有分支）
│   └── llm.js          # LLM API 模块（可自定义 Prompt）
├── public/
│   ├── index.html      # Web 界面
│   ├── style.css       # 深色主题样式
│   └── app.js          # 前端逻辑（多项目管理）
└── package.json
```

## License

MIT
