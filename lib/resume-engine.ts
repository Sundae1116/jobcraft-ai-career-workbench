export type ResumeEvidence = { id: string; claim: string; confidence: string; tagsJson?: string };
export type ResumeBullet = { text: string; evidenceIds: string[] };
export type GeneratedResume = {
  meta: { roleKey: string; roleTitle: string; strategy: string; template: "ats" | "product" | "portfolio"; feedback: string; generator: "evidence-rules-v1" | "openai" | "deepseek" };
  profile: { name: string; location: string; phone: string; email: string; target: string };
  summary: ResumeBullet;
  advantages: ResumeBullet[];
  projects: Array<{ title: string; bullets: ResumeBullet[] }>;
  experience: Array<{ company: string; role: string; dates: string; bullets: ResumeBullet[] }>;
  education: string[];
};

const roleTitles: Record<string, string> = { emotion: "DeepSeek 情感智能数据产品经理", agent: "DeepSeek 通用 Agent 数据产品经理", writing: "DeepSeek AI 创作数据产品经理" };

export function generateResume(roleKey: string, strategy: string, template: "ats" | "product" | "portfolio", feedback: string, evidence: ResumeEvidence[], customRoleTitle?: string): GeneratedResume {
  const available = new Map(evidence.map(item => [item.id, item]));
  const claim = (ids: string[], fallback: string) => ids.some(id => available.has(id)) ? fallback : "";
  const compact = strategy === "transition" || /压缩|精简/.test(feedback);
  const natural = /减少.*AI味|自然|口语/.test(feedback);
  const bullet = (text: string, ids: string[]): ResumeBullet => ({ text, evidenceIds: ids.filter(id => available.has(id)) });

  const summary = strategy === "transition"
    ? (natural ? "长期从事用户、内容和产品运营，习惯从反馈与数据中找出问题，再和产品、研发一起推动改进。服务过 60+ 情感赛道付费用户，也处理过产品链路 Badcase；近一年持续把大模型用于调研、内容评测和工作流搭建。" : "长期从事用户、内容与产品运营，具备真实情感场景洞察、产品 Badcase 归因和跨团队推动经验；持续使用 DeepSeek、GPT、Codex 等工具完成调研、内容评测与产品原型。")
    : "10 年互联网平台、产品运营和内容生态经验，覆盖电商产品、行业运营、从 0 到 1 创业与团队管理。服务过 60+ 情感赛道付费用户，具备用户洞察、数据诊断、产品协作和 AI 工具实践经验。";

  const roleAdvantages: Record<string, ResumeBullet[]> = {
    emotion: [
      bullet("用户洞察：服务 60+ 情感赛道付费用户，能够从多轮交流中识别真实诉求、情绪状态和沟通语境。", ["EV-006"]),
      bullet("产品协作：从反馈和数据中梳理需求，协同产品与研发推动 10 项功能及问题解决方案上线。", ["EV-008", "EV-010"]),
      bullet("数据诊断：结合 PV、UV、CVR、ROI、用户画像与内容表现定位问题，跟进优化结果。", ["EV-009", "EV-011", "EV-018"]),
      bullet("AI 实践：使用 DeepSeek、GPT、Codex、Cursor 完成调研、脚本评测与自动化工作流搭建。", ["EV-001", "EV-002", "EV-004", "EV-005"]),
    ],
    agent: [
      bullet("AI 工具与工作流：深度使用主流大模型和 Vibe Coding，并完成自动化招聘工作流。", ["EV-001", "EV-002"]),
      bullet("问题归因：复盘产品链路 Badcase，输出解决方案和 SOP，并推动产品功能上线。", ["EV-010"]),
      bullet("产品协同：从业务反馈和数据中梳理 10 项功能需求，协同产品、研发落地。", ["EV-008", "EV-009"]),
      bullet("数据判断：长期结合用户行为、转化指标和内容表现定位问题并验证结果。", ["EV-011", "EV-018"]),
    ],
    writing: [
      bullet("内容质量判断：使用 AI 辅助评测短视频脚本，并结合内容表现和转化结果筛选素材。", ["EV-005", "EV-018"]),
      bullet("内容产品经验：从 0 到 1 负责传统文化 IP 的内容策划、产品设计和交付闭环。", ["EV-014"]),
      bullet("内容生态：协同技术团队优化推荐机制与达人成长体系，优质内容数环比增长 100%+。", ["EV-016", "EV-017"]),
      bullet("规模化协作：搭建 500+ 达人矩阵与团队 SOP，验证内容获客和交付效率。", ["EV-015"]),
    ],
  };
  const resolvedRoleTitle = roleTitles[roleKey] ?? customRoleTitle ?? roleKey;
  const result: GeneratedResume = {
    meta: { roleKey, roleTitle: resolvedRoleTitle, strategy, template, feedback, generator: "evidence-rules-v1" },
    profile: { name: "示例候选人", location: "杭州", phone: "13800000000", email: "candidate@example.com", target: resolvedRoleTitle },
    summary: bullet(summary, ["EV-001", "EV-006", "EV-008", "EV-010"]),
    advantages: roleAdvantages[roleKey] ?? roleAdvantages.emotion,
    projects: [{ title: "自动化招聘工作流｜个人项目", bullets: [bullet("搭建岗位、候选人证据、简历版本和人工确认协同的求职决策工作流。", ["EV-002"])] }],
    experience: [
      { company: "杭州超级元气国际供应链有限公司", role: "跨境电商运营 / 内容策略", dates: "2025.12-至今", bullets: [
        bullet("使用 DeepSeek、GPT 完成竞品调研和定价策略报告，推动 3 款限量定制新品上市；用 AI 辅助评测短视频脚本。", ["EV-004", "EV-005"]),
        bullet("围绕月均 20 万美元 GMV 建立内容表现与转化观察，优质达人短视频转化率提升 25%，ROI 稳定在 2-3。", ["EV-018"]),
      ] },
      { company: "创业", role: "用户洞察 / 内容产品运营", dates: "2024.07-2025.10", bullets: [
        bullet("为情感赛道头部 IP 交付 60+ 女性付费用户，分析关系困境、真实诉求、情绪状态与沟通语境。", ["EV-006"]),
        bullet("从 0 到 1 负责传统文化 IP 产品与交付闭环，小红书一转付费率 37.5%，直播间最高在线 1000+。", ["EV-014"]),
        bullet("搭建 500+ 达人协作矩阵与 4 人团队 SOP，首月 GMV 100 万元，第三个月达人直播 GMV 120 万元。", ["EV-015"]),
      ] },
      { company: "巽风科技有限公司（茅台子公司）", role: "产品运营", dates: "2023.10-2024.06", bullets: [
        bullet("从业务反馈和运营数据中梳理搜索、短视频、营销工具与后台等 10 项需求，协同产品、研发推进上线。", ["EV-008"]),
        bullet("推动搜索词推荐和排行榜上线，主推品转化率提升 21%，商城 DAU 提升 10%。", ["EV-009"]),
        bullet("统筹年度产品运营节奏和互动机制，协同 PR、产品团队完成共创，支撑 10 亿元以上 GMV。", ["EV-019"]),
      ] },
      { company: "阿里巴巴 - 淘天集团", role: "行业运营 / 产品协同", dates: "2019.07-2023.08", bullets: [
        bullet("复盘产品链路 Bug、库存偏仓和地区无法下单等 Badcase，输出方案与 SOP，协同产品上线负卖功能。", ["EV-010"]),
        bullet("结合 PV、UV、CVR、加购、ROI、用户画像和竞品动态诊断问题，形成数据报告并迭代策略。", ["EV-011"]),
        bullet("担任天猫 520 行业总 PM，统筹 9 个行业和 6 人团队，完成 2.1 亿元成交目标。", ["EV-012", "EV-013"]),
      ] },
      { company: "网易 & 波奇宠物", role: "内容社区与达人生态运营", dates: "2016.02-2019.03", bullets: [bullet("协同技术团队优化推荐机制和达人成长体系，社区活跃 UV 与优质内容数环比增长 100%+。", ["EV-016", "EV-017"])] },
    ],
    education: ["浙江理工大学｜市场营销｜全日制本科｜2010.09-2014.06", "中科院心理咨询师证书"],
  };

  if (compact) result.experience = result.experience.map((item, index) => ({ ...item, bullets: index >= 2 ? item.bullets.slice(0, 2) : item.bullets }));
  const fixed = new Set(result.experience.flatMap(item => item.bullets.flatMap(x => x.evidenceIds)).concat(result.advantages.flatMap(x => x.evidenceIds)));
  const additions = evidence.filter(item => item.id.startsWith("EV-") && !fixed.has(item.id) && /新增经历/.test(item.tagsJson ?? ""));
  for (const item of additions) result.experience.unshift({ company: "新增经历（待整理）", role: "来自证据库", dates: "", bullets: [bullet(item.claim, [item.id])] });
  result.experience = result.experience.map(item => ({ ...item, bullets: item.bullets.filter(x => x.text && x.evidenceIds.length) }));
  return result;
}
