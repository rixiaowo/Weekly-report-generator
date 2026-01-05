import { execSync } from 'child_process';

/**
 * 获取指定日期范围内的提交记录
 * @param {string} repoPath - 仓库路径
 * @param {string} author - 作者名
 * @param {string} startDate - 开始日期 (YYYY-MM-DD)
 * @param {string} endDate - 结束日期 (YYYY-MM-DD)
 * @returns {Array} 提交记录数组
 */
export function getCommits(repoPath, author, startDate, endDate) {
  try {
    const authorFilter = author ? `--author="${author}"` : '';
    const cmd = `git -C "${repoPath}" log ${authorFilter} --since="${startDate}" --until="${endDate} 23:59:59" --pretty=format:"%H|%ad|%s" --date=short`;
    const output = execSync(cmd, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });

    if (!output.trim()) return [];

    return output.trim().split('\n').map(line => {
      const [hash, date, ...messageParts] = line.split('|');
      const message = messageParts.join('|'); // 处理 message 中可能包含 | 的情况
      return {
        hash,
        date,
        message,
        repo: repoPath.split('/').pop()
      };
    });
  } catch (error) {
    console.error(`读取仓库 ${repoPath} 失败:`, error.message);
    throw new Error(`无法读取仓库: ${error.message}`);
  }
}

/**
 * 获取单个提交的变更内容
 * @param {string} repoPath - 仓库路径
 * @param {string} commitHash - 提交哈希
 * @returns {Object} 变更详情
 */
export function getCommitDiff(repoPath, commitHash) {
  try {
    // 获取变更的文件列表和统计
    const statsCmd = `git -C "${repoPath}" show ${commitHash} --stat --format=""`;
    const stats = execSync(statsCmd, { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024 });

    // 获取变更的文件名
    const filesCmd = `git -C "${repoPath}" show ${commitHash} --name-only --format=""`;
    const filesOutput = execSync(filesCmd, { encoding: 'utf-8' });
    const files = filesOutput.trim().split('\n').filter(f => f);

    // 获取更完整的 diff（增加上下文行数和大小限制）
    const diffCmd = `git -C "${repoPath}" show ${commitHash} --format="" -U3`;
    let diff = '';
    try {
      diff = execSync(diffCmd, { encoding: 'utf-8', maxBuffer: 2 * 1024 * 1024 });
      // 限制 diff 长度（增加到 5000 字符以获取更多内容）
      if (diff.length > 5000) {
        diff = diff.substring(0, 5000) + '\n... (内容已截断，共 ' + diff.length + ' 字符)';
      }
    } catch {
      diff = '(diff 内容过大，已省略)';
    }

    return { stats: stats.trim(), files, diff };
  } catch (error) {
    console.error(`获取提交 ${commitHash} 详情失败:`, error.message);
    return { stats: '', files: [], diff: '' };
  }
}

/**
 * 获取提交记录及变更详情
 * @param {string} repoPath - 仓库路径
 * @param {string} author - 作者名
 * @param {string} startDate - 开始日期
 * @param {string} endDate - 结束日期
 * @returns {Array} 包含变更详情的提交记录
 */
export function getCommitsWithDiff(repoPath, author, startDate, endDate) {
  const commits = getCommits(repoPath, author, startDate, endDate);

  return commits.map(commit => {
    const diffInfo = getCommitDiff(repoPath, commit.hash);
    return {
      ...commit,
      ...diffInfo
    };
  });
}

/**
 * 获取 Git 用户名
 * @param {string} repoPath - 仓库路径（可选）
 * @returns {string} 用户名
 */
export function getGitUser(repoPath) {
  try {
    const cmd = repoPath
      ? `git -C "${repoPath}" config user.name`
      : 'git config user.name';
    return execSync(cmd, { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

/**
 * 验证路径是否是有效的 Git 仓库
 * @param {string} repoPath - 仓库路径
 * @returns {boolean}
 */
export function isValidGitRepo(repoPath) {
  try {
    execSync(`git -C "${repoPath}" rev-parse --git-dir`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    return true;
  } catch {
    return false;
  }
}
