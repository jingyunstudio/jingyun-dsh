import { exec } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';

import { getSessionAgentsConfig, baseHome } from '../agent/manager';
import { moveToRecycleBin, extractZipSafe } from '../common/fs';

const execAsync = promisify(exec);

export async function getInstalledAssets(sessionId?: string): Promise<any> {
  const skillsDir = path.join(baseHome, 'skills');
  const agentsDir = path.join(baseHome, 'agents');
  const pluginsDir = path.join(baseHome, 'plugins');
  const rulesDir = path.join(baseHome, 'rules');

  // 1.1 扫描技能
  const installedSkills: string[] = [];
  const skillsDetail: Array<{
    id: string;
    name: string;
    description: string;
    source?: string;
    author?: string;
    mtime?: number;
    path?: string;
  }> = [];

  if (fs.existsSync(skillsDir)) {
    fs.readdirSync(skillsDir).forEach((name) => {
      const p = path.join(skillsDir, name);
      if (fs.statSync(p).isDirectory()) {
        installedSkills.push(name);
        const stat = fs.statSync(p);
        let skillName = name;
        let desc = '';
        let source = 'marketplace';
        let author = 'official';

        const manifestFile = path.join(p, 'manifest.json');
        const metaFile = path.join(p, '_meta.json');
        if (fs.existsSync(manifestFile)) {
          try {
            const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
            if (m.displayName || m.name) skillName = m.displayName || m.name;
            if (m.description || m.summary) desc = m.description || m.summary;
            if (m.source) source = m.source;
            if (m.author) author = m.author;
          } catch {}
        } else if (fs.existsSync(metaFile)) {
          try {
            const m = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
            if (m.displayName || m.name) skillName = m.displayName || m.name;
          } catch {}
        }

        const skillMd = path.join(p, 'SKILL.md');
        if (fs.existsSync(skillMd)) {
          try {
            const content = fs.readFileSync(skillMd, 'utf8');
            const displayNameMatch = content.match(/displayName:\s*([^\r\n]+)/);
            const titleMatch = content.match(/title:\s*([^\r\n]+)/);
            const nameMatch = content.match(/name:\s*([^\r\n]+)/);
            if (displayNameMatch && displayNameMatch[1] && skillName === name) {
              skillName = displayNameMatch[1]
                .replace(/^['"]|['"]$/g, '')
                .trim();
            } else if (titleMatch && titleMatch[1] && skillName === name) {
              skillName = titleMatch[1].replace(/^['"]|['"]$/g, '').trim();
            } else if (nameMatch && nameMatch[1] && skillName === name) {
              const matched = nameMatch[1].replace(/^['"]|['"]$/g, '').trim();
              if (/[\u4e00-\u9fa5]/.test(matched)) {
                skillName = matched;
              }
            }
            const descMatch = content.match(/description:\s*([^\r\n]+)/);
            if (descMatch && descMatch[1] && !desc) {
              desc = descMatch[1].replace(/^['"]|['"]$/g, '').trim();
            }
            const sourceMatch = content.match(/source:\s*([^\r\n]+)/);
            if (sourceMatch && sourceMatch[1]) {
              source = sourceMatch[1].replace(/^['"]|['"]$/g, '').trim();
            }
            const authorMatch = content.match(/author:\s*([^\r\n]+)/);
            if (authorMatch && authorMatch[1]) {
              author = authorMatch[1].replace(/^['"]|['"]$/g, '').trim();
            }
            if (
              /agent_created:\s*true/i.test(content) ||
              /created_by:\s*user/i.test(content) ||
              author === 'user'
            ) {
              source = 'custom';
            }
          } catch {}
        }

        if (name === 'skill-creator' || name === 'agent-manager') {
          source = 'builtin';
          author = 'system';
          if (name === 'skill-creator') skillName = 'AI技能生成器';
          if (name === 'agent-manager') skillName = '智能体包管理器';
        }

        if (!desc) {
          if (name === 'skill-creator')
            desc = 'AI技能生成器：根据需求自动编写新技能';
          else if (name === 'agent-manager')
            desc = '智能体包管理器：自动创建/转化/审查AI智能体与工作流';
          else if (name === 'fec-image-generation')
            desc = '图片生成与创意作图工具';
          else if (name === 'word-docx-1') desc = 'Word 文档读写与样式排版工具';
          else desc = '本地已启用的扩展技能';
        }

        skillsDetail.push({
          id: name,
          name: skillName,
          description: desc,
          source,
          author,
          mtime: stat.mtimeMs,
          path: p,
        });
      }
    });
  }

  // 1.2 扫描全栈智能体能力包
  const installedAgents: string[] = [];
  const agentsDetail: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    skills?: string[];
    tools?: string[];
    prompt?: string;
    source?: string;
    author?: string;
    mtime?: number;
    path?: string;
  }> = [];

  if (fs.existsSync(agentsDir)) {
    fs.readdirSync(agentsDir).forEach((name) => {
      const p = path.join(agentsDir, name);
      if (fs.statSync(p).isDirectory()) {
        installedAgents.push(name);
        const stat = fs.statSync(p);
        let agName = name;
        let desc = '';
        let icon = 'user';
        let skills: string[] = [];
        let tools: string[] = [];
        let prompt = '';
        let source = 'marketplace';
        let author = 'official';

        const manifestFile = path.join(p, 'manifest.json');
        if (fs.existsSync(manifestFile)) {
          try {
            const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
            if (m.displayName || m.name) {
              const val = m.displayName || m.name;
              agName = typeof val === 'string' ? val : '';
            }
            if (m.summary || m.description) {
              const val = m.summary || m.description;
              desc = typeof val === 'string' ? val : '';
            }
            if (m.icon) icon = m.icon;
            if (m.source) source = m.source;
            if (m.author) author = m.author;
            if (m.isCustom || m.agent_created || m.author === 'user') {
              source = 'custom';
            }
            if (Array.isArray(m.skillSlugs || m.skills)) {
              skills = (m.skillSlugs || m.skills).map((s: any) =>
                typeof s === 'string' ? s : s.slug
              );
            }
            if (Array.isArray(m.tools)) tools = m.tools;
          } catch {}
        }

        // 根据配置清单定义的优先级标识符智能定位人设 Markdown 文件路径
        let promptFile = '';
        const agentsSubDir = path.join(p, 'agents');
        if (fs.existsSync(agentsSubDir)) {
          try {
            const candidates = fs
              .readdirSync(agentsSubDir)
              .filter((f) => f.endsWith('.md'));
            if (candidates.length > 0) {
              let manifestFile = path.join(p, 'manifest.json');

              let targetName = name;
              let leadAgentName = '';
              if (fs.existsSync(manifestFile)) {
                try {
                  const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
                  if (m.agentName) targetName = m.agentName;
                  if (m.expertType === 'team' && m.teamInfo?.leadAgent) {
                    leadAgentName = m.teamInfo.leadAgent;
                  }
                } catch {}
              }

              const lookupName = leadAgentName || targetName;
              const kebabId = name
                .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
                .toLowerCase();
              const nameMatch = candidates.find(
                (f) => path.basename(f, '.md') === lookupName
              );
              if (nameMatch) {
                promptFile = path.join(agentsSubDir, nameMatch);
              } else if (kebabId !== lookupName) {
                const kebabMatch = candidates.find(
                  (f) => path.basename(f, '.md') === kebabId
                );
                if (kebabMatch)
                  promptFile = path.join(agentsSubDir, kebabMatch);
              }

              if (!promptFile && candidates.length === 1) {
                promptFile = path.join(agentsSubDir, candidates[0]);
              }
            }
          } catch {}
        }

        if (promptFile && fs.existsSync(promptFile)) {
          try {
            prompt = fs.readFileSync(promptFile, 'utf8');
          } catch {}
        }

        if (agName === name) {
          const readmeFile = path.join(p, 'README.md');
          if (fs.existsSync(readmeFile)) {
            try {
              const content = fs.readFileSync(readmeFile, 'utf8');
              const titleMatch = content.match(/^#\s*([^\r\n]+)/m);
              if (titleMatch && titleMatch[1]) {
                agName = titleMatch[1].trim();
              }
              if (!desc) {
                const lines = content
                  .split(/\r?\n/)
                  .map((l) => l.trim())
                  .filter((l) => l && !l.startsWith('#'));
                if (lines.length > 0) desc = lines[0];
              }
            } catch {}
          }
        }

        if (!desc) {
          desc = '全栈业务智能体能力套件';
        }

        agentsDetail.push({
          id: name,
          name: agName,
          description: desc,
          icon,
          skills,
          tools,
          prompt,
          source,
          author,
          mtime: stat.mtimeMs,
          path: p,
        });
      }
    });
  }

  // 1.3 兜底扫描 rules
  if (fs.existsSync(rulesDir)) {
    fs.readdirSync(rulesDir).forEach((name) => {
      if (name.endsWith('.md')) {
        const ruleId = name.replace(/\.md$/, '').toLowerCase();
        if (!installedAgents.includes(ruleId)) {
          installedAgents.push(ruleId);
          agentsDetail.push({
            id: ruleId,
            name: ruleId,
            description: '已安装的领域规则智能体',
          });
        }
      }
    });
  }

  // 1.4 扫描插件
  const installedPlugins: string[] = [];
  if (fs.existsSync(pluginsDir)) {
    fs.readdirSync(pluginsDir).forEach((name) => {
      const p = path.join(pluginsDir, name);
      if (fs.statSync(p).isDirectory())
        installedPlugins.push(name.toLowerCase());
    });
  }

  const all = Array.from(
    new Set([
      ...installedSkills.map((s) => s.toLowerCase()),
      ...installedAgents,
      ...installedPlugins,
    ])
  );

  // 1.5 读取当前会话激活的智能体 (支持 query 参数 ?sessionId=xxx)

  const { sessions, globalDefault } = getSessionAgentsConfig();
  let activeAgentId = 'none';
  if (sessionId && sessions[sessionId]) {
    activeAgentId = sessions[sessionId];
  } else {
    activeAgentId = globalDefault || 'none';
  }

  return {
    skills: installedSkills,
    skillsDetail,
    agents: installedAgents,
    agentsDetail,
    activeAgentId,
    activeExpertId: activeAgentId,
    sessionExperts: sessions,
    plugins: installedPlugins,
    all,
  };
}

export async function openAssetFolder(
  options: { type?: string; slug?: string; category?: string } = {}
) {
  const t = options.type || options.category || '';
  const slug = options.slug || '';
  let targetDir = '';
  if (t === 'skill' || t === 'skills') {
    targetDir = path.join(baseHome, 'skills', slug || '');
  } else if (t === 'agent' || t === 'agents') {
    targetDir = path.join(baseHome, 'agents', slug || '');
  } else if (t === 'plugin' || t === 'plugins') {
    targetDir = path.join(baseHome, 'plugins', slug || '');
  } else if (t === 'rule' || t === 'rules') {
    targetDir = path.join(baseHome, 'rules', slug || '');
  } else {
    throw new Error('无效的资产类别');
  }

  if (!fs.existsSync(targetDir)) {
    throw new Error('目标文件夹不存在: ' + targetDir);
  }

  const platform = os.platform();
  if (platform === 'win32') {
    await execAsync(`explorer.exe "${targetDir}"`);
  } else if (platform === 'darwin') {
    await execAsync(`open "${targetDir}"`);
  } else {
    await execAsync(`xdg-open "${targetDir}"`);
  }
  return { path: targetDir };
}

export async function deleteAsset(
  options: { slug?: string; type?: string } = {}
) {
  const { slug, type } = options;
  if (!slug) throw new Error('缺少必要参数: slug');
  const targetDir =
    type === 'agent'
      ? path.join(baseHome, 'agents', slug)
      : path.join(baseHome, 'skills', slug);

  if (!fs.existsSync(targetDir)) {
    throw new Error('目标不存在: ' + targetDir);
  }

  await moveToRecycleBin(targetDir);
  return { success: true };
}

export async function installAsset(parsed: any) {
  const { category, slug, name, files } = parsed;
  if (!category || !slug) {
    throw new Error('缺少必要参数: category 或 slug');
  }

  let targetDir = '';
  if (category === 'skill' || category === 'skills') {
    targetDir = path.join(baseHome, 'skills', slug);
  } else if (category === 'agent' || category === 'agents') {
    targetDir = path.join(baseHome, 'agents', slug);
  } else if (category === 'plugin' || category === 'plugins') {
    targetDir = path.join(baseHome, 'plugins', slug);
  } else if (category === 'rule' || category === 'rules') {
    targetDir = path.join(baseHome, 'rules', slug);
  } else {
    throw new Error('不支持的资产分类: ' + category);
  }

  if (fs.existsSync(targetDir)) {
    throw new Error('目标已存在: ' + targetDir);
  }

  fs.mkdirSync(targetDir, { recursive: true });

  if (Array.isArray(files)) {
    for (const f of files) {
      if (!f.path) continue;
      const filePath = path.join(targetDir, f.path);
      const fileDir = path.dirname(filePath);
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }
      fs.writeFileSync(filePath, f.content || '', 'utf8');
    }
  }

  const manifestPath = path.join(targetDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    const manifest = {
      name: name || slug,
      slug,
      category,
      author: 'user',
      isCustom: true,
      createdAt: new Date().toISOString(),
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  return { success: true, targetDir };
}

export async function uninstallAsset(
  options: { slug?: string; category?: string } = {}
) {
  const { slug, category } = options;
  if (!slug) throw new Error('缺少必要参数: slug');

  const cat = category || 'skill';
  let targetDir = '';
  if (cat === 'skill' || cat === 'skills') {
    targetDir = path.join(baseHome, 'skills', slug);
  } else if (cat === 'agent' || cat === 'agents') {
    targetDir = path.join(baseHome, 'agents', slug);
  } else if (cat === 'plugin' || cat === 'plugins') {
    targetDir = path.join(baseHome, 'plugins', slug);
  } else if (cat === 'rule' || cat === 'rules') {
    targetDir = path.join(baseHome, 'rules', slug);
  } else {
    throw new Error('不支持的资产类别: ' + cat);
  }

  if (!fs.existsSync(targetDir)) {
    throw new Error('目标资产目录不存在: ' + targetDir);
  }

  const resolvedTarget = path.resolve(targetDir);
  const resolvedBase = path.resolve(baseHome);
  if (!resolvedTarget.startsWith(resolvedBase)) {
    throw new Error('非法路径访问');
  }

  await moveToRecycleBin(targetDir);
  return { success: true };
}

export async function importAssetZip(
  options: { filename?: string; dataBase64?: string; targetType?: string } = {}
) {
  const { filename = '', dataBase64 = '', targetType } = options;
  if (!dataBase64) {
    throw new Error('缺少压缩包数据');
  }

  const cleanBase64 = dataBase64.replace(/^data:.*?;base64,/, '');
  const zipBuffer = Buffer.from(cleanBase64, 'base64');

  const baseName = path.basename(
    filename || 'imported-asset',
    path.extname(filename || 'imported-asset')
  );
  let inferredType = targetType;
  if (!inferredType) {
    if (baseName.includes('skill')) inferredType = 'skills';
    else if (baseName.includes('agent')) inferredType = 'agents';
    else if (baseName.includes('plugin')) inferredType = 'plugins';
    else inferredType = 'skills';
  }
  const destFolder = path.join(baseHome, inferredType, baseName);

  const tempZipPath = path.join(os.tmpdir(), `jy_import_${Date.now()}.zip`);
  fs.writeFileSync(tempZipPath, zipBuffer);
  try {
    await extractZipSafe(tempZipPath, destFolder);
  } finally {
    try {
      if (fs.existsSync(tempZipPath)) fs.unlinkSync(tempZipPath);
    } catch {}
  }
  return { success: true, targetDir: destFolder, type: inferredType };
}
