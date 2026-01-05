/**
 * LLM 模块 - 使用大模型生成智能周报
 * 支持 OpenAI 兼容 API（可配置 base URL）
 */

/**
 * 调用 LLM API 生成周报
 * @param {string} apiKey - API Key
 * @param {string} baseUrl - API Base URL
 * @param {Array} commits - 提交记录数组
 * @param {Object} options - 其他选项
 * @returns {Promise<string>} 生成的周报内容
 */
export async function generateWeeklyReport(apiKey, baseUrl, commits, options = {}) {
    const { author = '', startDate = '', endDate = '' } = options;

    if (!commits || commits.length === 0) {
        return generateEmptyReport(author, startDate, endDate);
    }

    // 构建提交信息摘要（包含详细变更内容）
    const commitSummary = formatCommitsForLLM(commits);

    const prompt = `你是一个专业的AI算法工程师周报撰写助手。请根据以下 Git 提交记录和代码变更内容，生成一份简洁专业的周报。

## 基本信息
- 作者: ${author || '未指定'}
- 时间范围: ${startDate} ~ ${endDate}
- 提交总数: ${commits.length}

## 提交记录及代码变更详情
${commitSummary}

## 周报格式要求（非常重要，请严格遵守）

请严格按照以下格式输出周报，注意使用数字和字母的层级结构：

本周工作总结:
1. [项目名称]：
    a. [具体工作内容1]
    b. [具体工作内容2]
    c. [具体工作内容3]
2. [另一个项目名称]：
    a. [具体工作内容]

下周工作计划:
1. [计划内容]

其他思考:
- [如果有的话]

## 生成要求
1. 分析代码变更内容，理解具体做了什么改动
2. 将相似的提交合并总结，不要重复列出
3. 用简洁专业的中文描述每项工作（一句话概括）
4. 按项目/模块分组描述
5. 不要输出 Markdown 标题符号（#），直接输出文字
6. 下周工作计划可以写"待规划"或根据本周工作推测
7. 其他思考部分如果没有可以写 "-"

请直接输出周报内容，不需要其他解释。`;

    try {
        const response = await callLLMAPI(apiKey, baseUrl, prompt, options.modelName);
        return response;
    } catch (error) {
        console.error('LLM API 调用失败:', error.message);
        // 降级为基础周报格式
        return generateBasicReport(commits, author, startDate, endDate);
    }
}

/**
 * 调用 LLM API
 */
async function callLLMAPI(apiKey, baseUrl, prompt, modelName = 'gpt-3.5-turbo') {
    const url = baseUrl.endsWith('/')
        ? `${baseUrl}chat/completions`
        : `${baseUrl}/chat/completions`;

    console.log('\n========== LLM API 调试信息 ==========');
    console.log('请求 URL:', url);
    console.log('API Key (前8位):', apiKey ? apiKey.substring(0, 8) + '...' : '未提供');
    console.log('使用模型:', modelName);

    const requestBody = {
        model: modelName,
        messages: [
            { role: 'system', content: '你是一个专业的AI算法工程师周报撰写助手，擅长分析代码变更内容并将其转化为简洁专业的工作报告。你需要仔细阅读代码diff，理解具体的改动内容，将相关工作合并总结，用简洁的语言描述工作成果。' },
            { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 3000
    };

    console.log('Prompt 长度:', prompt.length, '字符');
    console.log('==========================================\n');

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(requestBody)
        });

        console.log('响应状态:', response.status, response.statusText);

        if (!response.ok) {
            const error = await response.text();
            console.log('错误响应内容:', error);
            throw new Error(`API 请求失败: ${response.status} - ${error}`);
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        console.error('LLM API 请求过程中发生错误:', error.message);
        throw error; // 重新抛出错误以便上层捕获
    }
}

/**
 * 格式化提交记录供 LLM 使用（包含详细变更内容）
 */
function formatCommitsForLLM(commits) {
    return commits.map(c => {
        let entry = `### 提交: ${c.message}\n`;
        entry += `- **日期**: ${c.date}\n`;
        entry += `- **仓库**: ${c.repo}\n`;

        if (c.files && c.files.length > 0) {
            entry += `- **修改文件** (${c.files.length} 个):\n`;
            c.files.forEach(file => {
                entry += `  - ${file}\n`;
            });
        }

        if (c.stats) {
            entry += `- **变更统计**: ${c.stats.split('\n').pop().trim()}\n`;
        }

        // 添加详细的 diff 内容
        if (c.diff && c.diff.trim()) {
            entry += `- **代码变更详情**:\n\`\`\`diff\n${c.diff}\n\`\`\`\n`;
        }

        return entry;
    }).join('\n---\n\n');
}

/**
 * 生成空周报
 */
function generateEmptyReport(author, startDate, endDate) {
    return `本周工作总结:
1. 本周暂无提交记录

下周工作计划:
1. 待规划

其他思考:
-
`;
}

/**
 * 生成基础周报（不使用 AI）
 * 按项目分组，合并相似提交
 */
export function generateBasicReport(commits, author, startDate, endDate) {
    // 按仓库（项目）分组
    const byRepo = {};
    commits.forEach(commit => {
        const repo = commit.repo;
        if (!byRepo[repo]) byRepo[repo] = [];
        byRepo[repo].push(commit);
    });

    let report = `本周工作总结:\n`;

    let projectIndex = 1;
    Object.keys(byRepo).forEach(repo => {
        const repoCommits = byRepo[repo];
        report += `${projectIndex}. ${repo}：\n`;

        // 合并相似的提交消息
        const uniqueMessages = [...new Set(repoCommits.map(c => c.message))];
        let itemIndex = 'a';

        uniqueMessages.forEach(message => {
            // 获取该消息相关的所有文件
            const relatedCommits = repoCommits.filter(c => c.message === message);
            const allFiles = [...new Set(relatedCommits.flatMap(c => c.files || []))];

            report += `    ${itemIndex}. ${message}`;
            if (allFiles.length > 0 && allFiles.length <= 3) {
                report += `（${allFiles.join(', ')}）`;
            }
            report += '\n';

            itemIndex = String.fromCharCode(itemIndex.charCodeAt(0) + 1);
        });

        projectIndex++;
    });

    report += `\n下周工作计划:\n`;
    report += `1. 待规划\n`;
    report += `\n其他思考:\n`;
    report += `-\n`;

    return report;
}
