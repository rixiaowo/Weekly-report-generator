/**
 * Git 周报生成器 - 前端应用
 */

// DOM 元素
const elements = {
    repoPath: document.getElementById('repoPath'),
    validateBtn: document.getElementById('validateBtn'),
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
    bindEvents();
    loadSavedConfig();
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
    elements.validateBtn.addEventListener('click', validateRepo);
    elements.previewBtn.addEventListener('click', previewCommits);
    elements.generateBtn.addEventListener('click', generateReport);
    elements.copyBtn.addEventListener('click', copyReport);
    elements.downloadBtn.addEventListener('click', downloadReport);

    // 保存配置到本地存储
    elements.apiBaseUrl.addEventListener('change', saveConfig);
    elements.repoPath.addEventListener('change', saveConfig);
}

// 加载保存的配置
function loadSavedConfig() {
    const saved = localStorage.getItem('weeklyReportConfig');
    if (saved) {
        try {
            const config = JSON.parse(saved);
            if (config.apiBaseUrl) elements.apiBaseUrl.value = config.apiBaseUrl;
            if (config.repoPath) elements.repoPath.value = config.repoPath;
            if (config.modelName) elements.modelName.value = config.modelName;
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }
}

// 保存配置
function saveConfig() {
    const config = {
        apiBaseUrl: elements.apiBaseUrl.value,
        repoPath: elements.repoPath.value,
        modelName: elements.modelName.value
    };
    localStorage.setItem('weeklyReportConfig', JSON.stringify(config));
}

// 验证仓库
async function validateRepo() {
    const repoPath = elements.repoPath.value.trim();
    if (!repoPath) {
        showStatus('请输入仓库路径', 'error');
        return;
    }

    showLoading('正在验证仓库...');

    try {
        const response = await fetch('/api/validate-repo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repoPath })
        });

        const data = await response.json();

        if (data.valid) {
            showStatus(`✓ 有效的 Git 仓库${data.author ? `，作者: ${data.author}` : ''}`, 'success');
            if (data.author && !elements.author.value) {
                elements.author.value = data.author;
            }
        } else {
            showStatus(`✗ ${data.error}`, 'error');
        }
    } catch (error) {
        showStatus(`✗ 验证失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

// 显示仓库状态
function showStatus(message, type) {
    elements.repoStatus.textContent = message;
    elements.repoStatus.className = 'hint ' + type;
}

// 预览提交
async function previewCommits() {
    const config = getConfig();
    if (!config.repoPath) {
        showToast('请输入仓库路径', 'error');
        return;
    }

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
    const config = getConfig();
    if (!config.repoPath) {
        showToast('请输入仓库路径', 'error');
        return;
    }

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
        repoPath: elements.repoPath.value.trim(),
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
