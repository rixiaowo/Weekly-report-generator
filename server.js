import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { getCommitsWithDiff, getGitUser, isValidGitRepo } from './lib/git.js';
import { generateWeeklyReport } from './lib/llm.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// API: 验证仓库路径
app.post('/api/validate-repo', (req, res) => {
    const { repoPath } = req.body;

    if (!repoPath) {
        return res.status(400).json({ valid: false, error: '请提供仓库路径' });
    }

    const valid = isValidGitRepo(repoPath);
    if (valid) {
        const author = getGitUser(repoPath);
        res.json({ valid: true, author });
    } else {
        res.json({ valid: false, error: '无效的 Git 仓库路径' });
    }
});

// API: 获取提交记录预览（支持多仓库）
app.post('/api/commits', (req, res) => {
    try {
        const { repoPaths, repoPath, author, startDate, endDate } = req.body;

        // 支持单个 repoPath 或多个 repoPaths
        const paths = repoPaths || (repoPath ? [repoPath] : []);

        if (paths.length === 0) {
            return res.status(400).json({ error: '请提供至少一个仓库路径' });
        }

        let allCommits = [];
        for (const path of paths) {
            if (!isValidGitRepo(path)) {
                console.warn(`跳过无效仓库: ${path}`);
                continue;
            }
            const commits = getCommitsWithDiff(path, author || '', startDate, endDate);
            allCommits = allCommits.concat(commits);
        }

        // 按日期排序（最新的在前）
        allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ commits: allCommits, count: allCommits.length });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// API: 生成周报（支持多仓库）
app.post('/api/generate', async (req, res) => {
    try {
        const { repoPaths, repoPath, author, startDate, endDate, apiKey, apiBaseUrl, modelName } = req.body;

        // 支持单个 repoPath 或多个 repoPaths
        const paths = repoPaths || (repoPath ? [repoPath] : []);

        if (paths.length === 0) {
            return res.status(400).json({ error: '请提供至少一个仓库路径' });
        }

        // 从所有仓库获取提交记录
        let allCommits = [];
        let firstValidAuthor = author;

        for (const path of paths) {
            if (!isValidGitRepo(path)) {
                console.warn(`跳过无效仓库: ${path}`);
                continue;
            }
            const commits = getCommitsWithDiff(path, author || '', startDate, endDate);
            allCommits = allCommits.concat(commits);

            if (!firstValidAuthor) {
                firstValidAuthor = getGitUser(path);
            }
        }

        // 按日期排序（最新的在前）
        allCommits.sort((a, b) => new Date(b.date) - new Date(a.date));

        // 生成周报
        let report;
        if (apiKey && apiBaseUrl) {
            // 使用 AI 生成
            report = await generateWeeklyReport(apiKey, apiBaseUrl, allCommits, {
                author: firstValidAuthor || '',
                startDate,
                endDate,
                modelName: modelName || 'gpt-3.5-turbo'
            });
        } else {
            // 不使用 AI，生成基础周报
            const { generateBasicReport } = await import('./lib/llm.js');
            report = generateBasicReport ?
                generateBasicReport(allCommits, firstValidAuthor || '', startDate, endDate) :
                await generateWeeklyReport('', '', allCommits, { author: firstValidAuthor, startDate, endDate });
        }

        res.json({ report, commits: allCommits.length });
    } catch (error) {
        console.error('生成周报失败:', error);
        res.status(500).json({ error: error.message });
    }
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`\n🚀 周报生成器已启动!`);
    console.log(`📍 访问地址: http://localhost:${PORT}`);
    console.log(`\n按 Ctrl+C 停止服务\n`);
});
