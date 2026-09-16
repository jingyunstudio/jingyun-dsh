import fs from 'fs';
import path from 'path';

import type { Context } from '@deepseek-ai/cordis';

import {
  dingtalkConnector,
  imaConnector,
  larkConnector,
  wecomConnector,
} from '../connectors';
import { baseHome, getSessionAgentsConfig } from './manager';

interface CachedAgent {
  mtimeMs: number;
  content: string;
}

const agentCache = new Map<string, CachedAgent>();

export function initSystemPromptHook(ctx: Context) {
  ctx.inject(['systemPrompt'], (sctx: any) => {
    try {
      console.log(
        '[UIBranding] Registering systemPrompt section for session-isolated agents and workspace agents.'
      );
      sctx.systemPrompt.section({
        name: 'jy-agent-loader',
        order: -50,
        text: (context: any) => {
          let agentsPrompt = '';

          const agent = context.agent;
          const sessionId =
            agent?.session?.header?.id ||
            agent?.session?.header?.sessionId ||
            agent?.session?.sessionId ||
            agent?.session?.id ||
            context?.sessionId ||
            context?.session?.id;

          const { sessions, globalDefault } = getSessionAgentsConfig();
          let agentId = 'none';
          if (sessionId && sessions[sessionId]) {
            agentId = sessions[sessionId];
          } else if (globalDefault && globalDefault !== 'none') {
            agentId = globalDefault;
          }

          if (agentId && agentId !== 'none') {
            const agentDir = path.join(baseHome, 'agents', agentId);
            const manifestFile = path.join(agentDir, 'manifest.json');

            let agentName = agentId;
            let targetAgentName = '';
            let leadAgentName = '';

            if (fs.existsSync(manifestFile)) {
              try {
                const m = JSON.parse(fs.readFileSync(manifestFile, 'utf8'));
                if (m.displayName || m.name) {
                  const val = m.displayName || m.name;
                  agentName =
                    typeof val === 'string' ? val : val.zh || val.en || agentId;
                }
                if (m.agentName) {
                  targetAgentName = m.agentName;
                }
                if (m.expertType === 'team' && m.teamInfo?.leadAgent) {
                  leadAgentName = m.teamInfo.leadAgent;
                }
              } catch {}
            }

            // 根据配置清单定义的优先级标识符智能定位人设 Markdown 文件路径
            let agentMarkdownPath = '';
            const lookupName = leadAgentName || targetAgentName || agentId;
            const kebabId = agentId
              .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
              .toLowerCase();
            const agentsSubDir = path.join(agentDir, 'agents');

            if (fs.existsSync(agentsSubDir)) {
              try {
                const candidates = fs
                  .readdirSync(agentsSubDir)
                  .filter((f) => f.endsWith('.md'));
                if (candidates.length > 0) {
                  // 1. 优先级一：文件名与 lookupName 一致
                  const nameMatch = candidates.find(
                    (f) => path.basename(f, '.md') === lookupName
                  );
                  if (nameMatch) {
                    agentMarkdownPath = path.join(agentsSubDir, nameMatch);
                  }

                  // 2. 优先级二：文件名与 kebab-case ID 一致
                  if (!agentMarkdownPath && kebabId !== lookupName) {
                    const kebabMatch = candidates.find(
                      (f) => path.basename(f, '.md') === kebabId
                    );
                    if (kebabMatch) {
                      agentMarkdownPath = path.join(agentsSubDir, kebabMatch);
                    }
                  }

                  // 3. 优先级三：如果文件夹下仅有一个 md 文件，直接采用它
                  if (!agentMarkdownPath && candidates.length === 1) {
                    agentMarkdownPath = path.join(agentsSubDir, candidates[0]);
                  }
                }
              } catch {}
            }

            if (agentMarkdownPath && fs.existsSync(agentMarkdownPath)) {
              try {
                const stat = fs.statSync(agentMarkdownPath);
                const cacheKey = `global:${agentId}`;
                const cached = agentCache.get(cacheKey);
                let content = '';
                if (cached && cached.mtimeMs === stat.mtimeMs) {
                  content = cached.content;
                } else {
                  content = fs.readFileSync(agentMarkdownPath, 'utf8');
                  agentCache.set(cacheKey, { mtimeMs: stat.mtimeMs, content });
                }
                agentsPrompt += `\n\n<active_agent id="${agentId}" role="${agentName}">
### 【当前激活智能体身份：${agentName}】
**重要身份与交互准则（最高优先级执行）**：
1. **身份代入**：你当前已被指派为专职**【${agentName}】**。在与用户交流、自我介绍或打招呼（如用户说“你好”）时，你必须**直接以【${agentName}】的专业身份、口吻和视角进行回应**，主动介绍你在该领域的擅长项与服务方向，**绝对禁止**套用通用的“我是 AI 开发助手”等机械化默认开场。
2. **专业履职**：严格遵循下方智能体的核心能力、分析思维体系、行业规范和输出标准进行深度解答与专业交付。

--- 【智能体详细设定与指引】 ---
${content}
--------------------------------
</active_agent>\n`;
              } catch (e: any) {
                console.warn(
                  '[UIBranding] Failed to assemble active agent prompt:',
                  e.message
                );
              }
            }
          }

          // 2. 扫描并兼容当前工作区项目目录下的 agents/ 文件夹
          const workspacePath = agent?.session?.header?.cwd;
          if (workspacePath) {
            const wsAgentsDir = path.resolve(workspacePath, 'agents');
            if (fs.existsSync(wsAgentsDir)) {
              try {
                const files = fs
                  .readdirSync(wsAgentsDir)
                  .filter((f) => f.endsWith('.md'));
                if (files.length > 0) {
                  agentsPrompt += '\n\n<workspace_custom_agents>\n';
                  for (const file of files) {
                    const filePath = path.join(wsAgentsDir, file);
                    const name = path.basename(file, '.md');
                    try {
                      const stat = fs.statSync(filePath);
                      const cacheKey = `${workspacePath}:${file}`;
                      const cached = agentCache.get(cacheKey);
                      let content = '';
                      if (cached && cached.mtimeMs === stat.mtimeMs) {
                        content = cached.content;
                      } else {
                        content = fs.readFileSync(filePath, 'utf8');
                        agentCache.set(cacheKey, {
                          mtimeMs: stat.mtimeMs,
                          content,
                        });
                      }
                      agentsPrompt += `### Agent: ${name}\n${content}\n\n`;
                    } catch {}
                  }
                  agentsPrompt += '</workspace_custom_agents>\n';
                }
              } catch {}
            }
          }

          // 3. 动态扫描并注入已授权连接器状态与操作指引
          try {
            let connectorsPrompt = '';
            const wecomState = wecomConnector.getStatus();
            if (wecomState.status === 'connected') {
              connectorsPrompt += `\n- 【企业微信连接器 (WeCom Connector)】：已就绪（Bot ID: ${wecomState.botId || 'connected'}）。
  * 核心能力：可向企业微信发送单聊、群聊消息或通知（支持纯文本与 Markdown 格式）。
  * 技能指引：当用户要求“发到企业微信”、“向企微发送通知/周报/总结”时，请使用 \`wecom-connector\` 技能执行发送。`;
            }

            const larkCached = larkConnector.getCachedStatus();
            if (larkCached && larkCached.status !== 'needs_login') {
              connectorsPrompt += `\n- 【飞书连接器 (Feishu/Lark Connector)】：已就绪（App ID: ${larkCached.appId || 'configured'}）。
  * 核心能力：可向飞书发送群聊/单聊消息、查询与创建日程、读取与追加多维表格记录。
  * 技能指引：当用户要求“发到飞书群”、“查飞书日程”、“追加飞书多维表格”时，请使用 \`feishu-connector\` 技能执行。`;
            }

            const dingtalkState = dingtalkConnector.getStatus();
            if (dingtalkState.status === 'connected') {
              connectorsPrompt += `\n- 【钉钉连接器 (DingTalk Connector)】：已就绪（${dingtalkState.appKey ? '主体: ' + dingtalkState.appKey : '已连接'}）。
  * 核心能力：已通过钉钉官方工作区生态（dws）授权就绪。支持协同钉钉群聊、文档、日程、待办、多维表与通讯录。
  * 技能指引：当用户需要向钉钉发消息、通知或与钉钉交互时，请使用 \`dingtalk-connector\` 技能，或直接调用标准 \`dws\` 命令。
  * 常用命令示例（非交互环境请带 --yes）：
    - 发送私信/单聊（发给自己或指定人）：\`dws chat +dm --to "<姓名/花名>" --content "<内容>" --yes\`
    - 发送群聊消息：\`dws chat +send-to-group --group "<群名>" --content "<内容>" --yes\`
    - 查看最近@我：\`dws chat +at-me\`
    - 查看当前账号身份：\`dws profile list --format json\`
  * 沙箱注意事项：dws 运行时需读写连接器数据锁文件，若在 workspace-write 沙箱模式下提示文件锁 Access is denied，请指定 sandbox_permissions="danger-full-access"`;
            }

            const imaState = imaConnector.getStatus();
            if (imaState.status === 'connected') {
              connectorsPrompt += `\n- 【腾讯 ima 知识库与笔记 (ima-skill)】：已就绪（${imaState.nickname ? '用户: ' + imaState.nickname : '已连接'}）。
  * 核心能力：腾讯 ima 知识管家，已连接个人知识库与笔记。支持读取/检索知识库资料及笔记管理。
  * 技能指引：当用户需要检索知识库（“从我的 ima 知识库查找...”）或读取/更新笔记时，请使用 \`ima-skill\` 技能。`;
            }

            if (connectorsPrompt) {
              agentsPrompt += `\n\n<active_connectors>
### 【当前已授权就绪的连接器与可用技能】
${connectorsPrompt}
</active_connectors>\n`;
            }
          } catch {}

          return agentsPrompt;
        },
      });
    } catch (e: any) {
      console.warn(
        '[UIBranding] Failed to register systemPrompt section:',
        e.message
      );
    }
  });
}
