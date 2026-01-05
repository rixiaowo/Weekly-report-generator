#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// 配置
const config = {
  author: process.env.GIT_AUTHOR || '', // 留空则使用当前 git 用户
  days: parseInt(process.env.REPORT_DAYS) || 7,
  outputFile: process.env.OUTPUT_FILE || 'weekly-report.md',
  repos: process.argv.slice(2), // 从命令行参数获取仓库路径
};

function getGitAuthor() {
  if (config.author) return config.author;
  try {
    return execSync('git config user.name', { encoding: 'utf-8' }).trim();
  } catch {
    return '';
  }
}

function getDateRange(days) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getCommits(repoPath, author, since) {
  try {
    const cmd = `git -C "${repoPath}" log --author="${author}" --since="${since}" --pretty=format:"%H|%ad|%s" --date=short`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    if (!output.trim()) return [];
    
    return output.trim().split('\n').map(line => {
      const [hash, date, message] = line.split('|');
      return { hash, date, message, repo: repoPath.split('/').pop() };
    });
  } catch (error) {
    console.error(`读取仓库 ${repoPath} 失败:`, error.message);
    return [];
  }
}

function groupByDate(commits) {
  const grouped = {};
  commits.forEach(commit => {
    if (!grouped[commit.date]) {
      grouped[commit.date] = [];
    }
    grouped[commit.date].push(commit);
  });
  return grouped;
}

function generateReport(commits, dateRange, author) {
  const grouped = groupByDate(commits);
  const dates = Object.keys(grouped).sort().reverse();
  
  let report = `# 周报\n\n`;
  report += `**作者:** ${author}\n`;
  report += `**时间范围:** ${dateRange.start} ~ ${dateRange.end}\n`;
  report += `**提交总数:** ${commits.length}\n\n`;
  report += `---\n\n`;

  if (dates.length === 0) {
    report += `本周暂无提交记录。\n`;
    return report;
  }

  dates.forEach(date => {
    const dayCommits = grouped[date];
    const weekday = getWeekday(date);
    report += `## ${date} (${weekday})\n\n`;
    
    // 按仓库分组
    const byRepo = {};
    dayCommits.forEach(c => {
      if (!byRepo[c.repo]) byRepo[c.repo] = [];
      byRepo[c.repo].push(c);
    });

    Object.keys(byRepo).forEach(repo => {
      report += `### ${repo}\n\n`;
      byRepo[repo].forEach(commit => {
        report += `- ${commit.message}\n`;
      });
      report += '\n';
    });
  });

  return report;
}

function getWeekday(dateStr) {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[new Date(dateStr).getDay()];
}

function main() {
  const author = getGitAuthor();
  if (!author) {
    console.error('无法获取 Git 用户名，请设置 GIT_AUTHOR 环境变量');
    process.exit(1);
  }

  const repos = config.repos.length > 0 ? config.repos : [process.cwd()];
  const dateRange = getDateRange(config.days);
  
  console.log(`正在生成周报...`);
  console.log(`作者: ${author}`);
  console.log(`时间范围: ${dateRange.start} ~ ${dateRange.end}`);
  console.log(`扫描仓库: ${repos.join(', ')}`);

  let allCommits = [];
  repos.forEach(repo => {
    const repoPath = resolve(repo);
    const commits = getCommits(repoPath, author, dateRange.start);
    allCommits = allCommits.concat(commits);
  });

  const report = generateReport(allCommits, dateRange, author);
  writeFileSync(config.outputFile, report, 'utf-8');
  
  console.log(`\n✅ 周报已生成: ${config.outputFile}`);
  console.log(`共 ${allCommits.length} 条提交记录`);
}

main();
