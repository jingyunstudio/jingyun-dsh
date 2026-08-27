export interface TemplateItem {
  id: string
  title: string
  desc: string
  prompt: string
  iconType: 'news' | 'english' | 'story' | 'report' | 'movie' | 'history' | 'qa' | 'family' | 'health' | 'interview' | 'meeting' | 'wallpaper'
}

export const AUTOMATION_TEMPLATES: TemplateItem[] = [
  {
    id: 'tpl_news',
    title: '每日 AI 新闻推送',
    desc: '关注当天 AI 领域的重要动态与编程工具进展，筛选行业高价值快报。',
    prompt: '每日早上 8 点，自动抓取并获取当天全球 AI 领域的重要动态，侧重 AI coding (编程助手) 与具身智能进展，筛选 5 条高价值新闻并整理成排版优雅的简报。',
    iconType: 'news'
  },
  {
    id: 'tpl_english',
    title: '每日 5 个英语单词',
    desc: '每天精选 5 个高频实用英语单词，包含释义、音标、例句与记忆提示。',
    prompt: '每天推荐 5 个高频实用英语单词，包含词义、美式音标、实用例句与记忆线索。请结合日常职场或开发具体场景编写例句。',
    iconType: 'english'
  },
  {
    id: 'tpl_story',
    title: '每日科技原理故事',
    desc: '用通俗有趣的语言讲解一个前沿科技原理，3分钟即可读完，生动活泼。',
    prompt: '每日下午生成一个 3-5 分钟可读的科技原理小故事。要求结合日常事物（例如：为什么光纤能传导光），将复杂的技术理论通过有趣的故事化角色形象生动地解释清楚。',
    iconType: 'story'
  },
  {
    id: 'tpl_report',
    title: '每周工作周报',
    desc: '每周五自动汇总仓库 PR 与 Issue 进展，输出关键变更与待关注事项。',
    prompt: '每周五下午 17:00，自动汇总当前工作区的代码仓库 PR 与 Issue 进展，分析代码改动，输出关键变更、重点贡献者与下周待关注事项。',
    iconType: 'report'
  },
  {
    id: 'tpl_movie',
    title: '经典电影推荐',
    desc: '每日推荐一部高分经典电影，简要介绍剧情梗概、核心亮点与推荐理由。',
    prompt: '每天推荐一部豆瓣或 IMDB 8.0 分以上的经典电影，简要介绍其核心剧情梗概、亮点、名场面台词与核心推荐理由，避免剧透过多。',
    iconType: 'movie'
  },
  {
    id: 'tpl_history',
    title: '历史上的今天',
    desc: '从科技、文化等领域精选一件“今天发生过”的有趣或重大里程碑事件。',
    prompt: '每天早上获取历史上的今天。从科技发明、经典电影上映、知名历史事件等领域挑选一件“今天发生过”的有趣或重大事件，用 200-300 字生动讲述其背景与影响。',
    iconType: 'history'
  },
  {
    id: 'tpl_qa',
    title: '每日一个为什么',
    desc: '每天剖析一个有趣的自然或社会现象问题，轻松普及科学生活常识。',
    prompt: '每天中午 12:00 提出一个关于日常生活或自然科学的有趣“为什么”问题（例如：为什么天空是蓝色的），采用先悬念提问再科普解答的方式，语气轻松幽默、通俗易懂。',
    iconType: 'qa'
  },
  {
    id: 'tpl_family',
    title: '父母联系提醒',
    desc: '每周日 10:00 提醒你给家人打电话或发消息，简单问候彼此近况。',
    prompt: '每周日上午 10:00，触发提醒发消息给家人，提醒我简单问候父母身体和工作近况。',
    iconType: 'family'
  },
  {
    id: 'tpl_health',
    title: '体检预约提醒',
    desc: '在体检前发送提醒，详细列出所需携带证件及空腹等注意事项。',
    prompt: '在 2026 年 4 月 8 日早上 7:00，触发体检预约确认提醒。提醒我确认具体的医院门诊与体检时间，携带身份证件，并注意体检前 8 小时禁食空腹。',
    iconType: 'health'
  },
  {
    id: 'tpl_interview',
    title: '面试准备提醒',
    desc: '工作日每 2 小时提醒你复习大模型面试内容，并生成 3 个模拟问题。',
    prompt: '工作日内每隔 2 小时提醒我进行大模型（LLM）面试准备。每次提醒时随机生成 3 道大模型技术或算法面试真题，让我可以在脑中模拟回答。',
    iconType: 'interview'
  },
  {
    id: 'tpl_meeting',
    title: '会议前准备',
    desc: '在日程会议开始前提醒你整理议题、核心目标、待确认问题和结论。',
    prompt: '在重要日程会议开始前 15 分钟触发提醒，引导我整理该会议的核心议题、目标、待确认的问题以及我预备达成的关键结论。',
    iconType: 'meeting'
  },
  {
    id: 'tpl_wallpaper',
    title: '设计壁纸精选',
    desc: '随机从 7 种风格中挑选一种，为你生成一张 9:16 竖版高清精美手机壁纸。',
    prompt: '每天下午自动从扁平手绘、3D 渲染、水彩等 7 种不同风格中随机挑选一种，调用图片生成模型为我设计一张 9:16 竖版高清艺术或风景手机壁纸。',
    iconType: 'wallpaper'
  }
]
