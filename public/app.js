/**
 * Git 周报生成器 - 前端应用
 * 支持多项目管理
 */

// 项目列表
let repoPaths = [];

// DOM 元素
const elements = {
    repoList: document.getElementById('repoList'),
    newRepoPath: document.getElementById('newRepoPath'),
    addRepoBtn: document.getElementById('addRepoBtn'),
    repoStatus: document.getElementById('repoStatus'),
    author: document.getElementById('author'),
    startDate: document.getElementById('startDate'),
    endDate: document.getElementById('endDate'),
    apiBaseUrl: document.getElementById('apiBaseUrl'),
    apiKey: document.getElementById('apiKey'),
    modelName: document.getElementById('modelName'),
    previewBtn: document.getElementById('previewBtn'),
    generateBtn: document.getElementById('generateBtn'),
    previewPanel: document.getElementById('previewPanel'),
    commitCount: document.getElementById('commitCount'),
    commitsList: document.getElementById('commitsList'),
    reportPanel: document.getElementById('reportPanel'),
    reportContent: document.getElementById('reportContent'),
    copyBtn: document.getElementById('copyBtn'),
    downloadBtn: document.getElementById('downloadBtn'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    loadingText: document.getElementById('loadingText'),
    toast: document.getElementById('toast')
};

// 初始化
function init() {
    setDefaultDates();
    loadSavedConfig();
    bindEvents();
    renderRepoList();
}

// 设置默认日期范围（过去7天）
function setDefaultDates() {
    const today = new Date();
    const weekAgo = new Date();
    weekAgo.setDate(today.getDate() - 7);

    elements.endDate.value = formatDate(today);
    elements.startDate.value = formatDate(weekAgo);
}

// 格式化日期
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

// 绑定事件
function bindEvents() {
    elements.addRepoBtn.addEventListener('click', addRepo);
    elements.newRepoPath.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addRepo();
    });
    elements.previewBtn.addEventListener('click', previewCommits);
    elements.generateBtn.addEventListener('click', generateReport);
    elements.copyBtn.addEventListener('click', copyReport);
    elements.downloadBtn.addEventListener('click', downloadReport);

    // 保存配置到本地存储（任意配置变更时自动保存）
    elements.apiBaseUrl.addEventListener('change', saveConfig);
    elements.modelName.addEventListener('change', saveConfig);
    elements.apiKey.addEventListener('change', saveConfig);
    elements.author.addEventListener('change', saveConfig);
}

// 加载保存的配置
function loadSavedConfig() {
    const saved = localStorage.getItem('weeklyReportConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            if (config.apiBaseUrl) elements.apiBaseUrl.value = config.apiBaseUrl;
            if (config.modelName) elements.modelName.value = config.modelName;
            if (config.apiKey) elements.apiKey.value = config.apiKey;
            if (config.author) elements.author.value = config.author;
            if (config.repoPaths && Array.isArray(config.repoPaths)) {
                repoPaths = config.repoPaths;
            }
            console.log('✓ 已加载保存的配置');
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

// 保存配置
function saveConfig() {
    const config = {
        apiBaseUrl: elements.apiBaseUrl.value,
        modelName: elements.modelName.value,
        apiKey: elements.apiKey.value,
        author: elements.author.value,
        repoPaths: repoPaths
    };
    localStorage.setItem('weeklyReportConfig', JSON.stringify(config));
    console.log('✓ 配置已保存');
}

// 添加项目
async function addRepo() {
    const path = elements.newRepoPath.value.trim();
    if (!path) {
        showStatus('请输入项目路径', 'error');
        return;
    }

    // 检查是否已存在
    if (repoPaths.includes(path)) {
        showStatus('该项目已在列表中', 'error');
        return;
    }

    // 验证仓库
    showLoading('正在验证仓库...');
    try {
        const response = await fetch('/api/validate-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoPath: path })
        });

        const data = await response.json();

        if (data.valid) {
            repoPaths.push(path);
            elements.newRepoPath.value = '';
            renderRepoList();
            saveConfig();
            showStatus(`✓ 已添加: ${path.split('/').pop()}`, 'success');
        } else {
            showStatus(`✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ 验证失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 删除项目
function removeRepo(index) {
    repoPaths.splice(index, 1);
    renderRepoList();
    saveConfig();
}

// 渲染项目列表
function renderRepoList() {
    if (repoPaths.length === 0) {
        elements.repoList.innerHTML = `
            <div class="repo-list-empty">
                暂无项目，请在下方添加 Git 仓库路径
            </div>
        `;
        return;
    }

    elements.repoList.innerHTML = repoPaths.map((path, index) => {
        const name = path.split('/').pop();
        return `
            <div class="repo-item">
                <span class="repo-name">📁 ${escapeHtml(name)}</span>
                <span class="repo-path">${escapeHtml(path)}</span>
                <button class="btn-remove" onclick="removeRepo(${index})" title="删除">✕</button>
            </div>
        `;
    }).join('');
}

// 显示状态
function showStatus(message, type) {
    elements.repoStatus.textContent = message;
    elements.repoStatus.className = 'hint ' + type;
}

// 预览提交
async function previewCommits() {
    if (repoPaths.length === 0) {
        showToast('请先添加至少一个项目', 'error');
        return;
    }

    const config = getConfig();
    showLoading('正在获取提交记录...');

    try {
        const response = await fetch('/api/commits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        renderCommits(data.commits);
        elements.previewPanel.style.display = 'block';
        elements.commitCount.textContent = `${data.count} 条`;

        // 滚动到预览区域
        elements.previewPanel.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showToast(`获取失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 渲染提交列表
function renderCommits(commits) {
    if (commits.length === 0) {
        elements.commitsList.innerHTML = `
            <div class="commit-item">
                <p style="color: var(--text-muted); text-align: center;">
                    该时间范围内暂无提交记录
                </p>
            </div>
        `;
        return;
    }

    elements.commitsList.innerHTML = commits.map(commit => `
        <div class="commit-item">
            <div class="commit-header">
                <span class="commit-message">${escapeHtml(commit.message)}</span>
                <span class="commit-date">${commit.date}</span>
            </div>
            <div class="commit-repo">📁 ${escapeHtml(commit.repo)}</div>
            ${commit.files && commit.files.length > 0 ? `
                <div class="commit-files">
                    📝 ${commit.files.slice(0, 3).map(f => escapeHtml(f)).join(', ')}
                    ${commit.files.length > 3 ? ` 等 ${commit.files.length} 个文件` : ''}
                </div>
            ` : ''}
        </div>
    `).join('');
}

// 生成周报
async function generateReport() {
    if (repoPaths.length === 0) {
        showToast('请先添加至少一个项目', 'error');
        return;
    }

    const config = getConfig();
    showLoading(config.apiKey ? '正在使用 AI 生成周报...' : '正在生成周报...');

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });

        const data = await response.json();

        if (data.error) {
            showToast(data.error, 'error');
            return;
        }

        renderReport(data.report);
        elements.reportPanel.style.display = 'block';
        showToast(`周报生成成功！共 ${data.commits} 条提交`, 'success');

        // 滚动到周报区域
        elements.reportPanel.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        showToast(`生成失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 渲染周报
function renderReport(report) {
    elements.reportContent.textContent = report;
}

// 复制周报
async function copyReport() {
    const report = elements.reportContent.textContent;
    try {
        await navigator.clipboard.writeText(report);
        showToast('已复制到剪贴板', 'success');
    } catch (error) {
        showToast('复制失败', 'error');
    }
}

// 下载周报
function downloadReport() {
    const report = elements.reportContent.textContent;
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `周报_${formatDate(new Date())}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('周报已下载', 'success');
}

// 获取配置
function getConfig() {
    return {
        repoPaths: repoPaths,
        author: elements.author.value.trim(),
        startDate: elements.startDate.value,
        endDate: elements.endDate.value,
        apiBaseUrl: elements.apiBaseUrl.value.trim(),
        apiKey: elements.apiKey.value.trim(),
        modelName: elements.modelName.value.trim()
    };
}

// 显示加载
function showLoading(text) {
    elements.loadingText.textContent = text;
    elements.loadingOverlay.style.display = 'flex';
}

// 隐藏加载
function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// 显示提示
function showToast(message, type = 'info') {
    elements.toast.textContent = message;
    elements.toast.className = 'toast ' + type;
    elements.toast.classList.add('show');

    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 3000);
}

// HTML 转义
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 启动应用
init();
