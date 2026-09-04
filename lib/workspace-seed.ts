export const candidateSeed = {
  id: "candidate-001",
  displayName: "示例候选人",
  headline: "互联网平台、产品运营与内容生态背景，转向 AI 数据产品岗位",
  profileJson: JSON.stringify({ location: "杭州", mode: "single-candidate", portfolioLink: "" }),
};

export const evidenceSeed = [
  { id: "EV-001", claim: "深度使用 DeepSeek、Kimi、GPT 等主流大模型，并使用 Codex、Cursor 进行 Vibe Coding。", source: "原始简历｜我的优势", confidence: "self_reported", tags: ["llm", "vibe-coding", "agent"] },
  { id: "EV-002", claim: "搭建面向业务方的自动化招聘工作流。", source: "原始简历｜作品展示链接", confidence: "verified", tags: ["automation", "workflow", "product"] },
  { id: "EV-003", claim: "情感陪伴多轮对话 Badcase 评测工作台。", source: "作品链接待补", confidence: "unverified", tags: ["evaluation", "emotional-ai", "badcase"] },
  { id: "EV-004", claim: "用 DeepSeek、GPT 完成竞品调研和定价策略报告，推动 3 款限量定制新品上市。", source: "原始简历｜杭州超级元气", confidence: "self_reported", tags: ["ai-tools", "research", "product-launch"] },
  { id: "EV-005", claim: "用 AI 辅助评测盲盒短视频脚本并完成内容制作。", source: "原始简历｜杭州超级元气", confidence: "self_reported", tags: ["ai-evaluation", "content"] },
  { id: "EV-006", claim: "为情感赛道头部 IP 交付 60+ 女性付费用户，分析关系困境、真实诉求、情绪状态与沟通语境。", source: "原始简历｜情感 IP 付费交付", confidence: "self_reported", tags: ["empathy", "conversation", "user-insight"] },
  { id: "EV-007", claim: "持有中科院心理咨询师证书。", source: "证书准确名称待核验", confidence: "unverified", tags: ["psychology", "qualification"] },
  { id: "EV-010", claim: "复盘产品链路 Bug、库存偏仓等 Badcase，输出解决方案与 SOP，并推动负卖功能上线。", source: "原始简历｜阿里巴巴项目经历", confidence: "self_reported", tags: ["badcase", "root-cause", "product-iteration"] },
  { id: "EV-008", claim: "从业务反馈和运营数据中梳理搜索、短视频、营销工具及后台等 10 项功能需求，与产品、研发协作上线。", source: "原始简历｜巽风科技", confidence: "self_reported", tags: ["product-ops", "requirements", "collaboration"] },
  { id: "EV-009", claim: "推动搜索词推荐和排行榜上线，主推品转化率提升 21%，商城 DAU 提升 10%。", source: "原始简历｜巽风科技", confidence: "self_reported", tags: ["search", "conversion", "dau"] },
  { id: "EV-011", claim: "长期监控 PV、UV、CVR、加购、ROI、用户画像与竞品动态，形成数据报告并调整策略。", source: "原始简历｜阿里巴巴", confidence: "self_reported", tags: ["analytics", "diagnosis"] },
  { id: "EV-012", claim: "担任天猫 520 行业总 PM，统筹 9 个行业，完成 2.1 亿元成交目标并获得 500 万+曝光。", source: "原始简历｜阿里巴巴", confidence: "self_reported", tags: ["program-management", "gmv", "cross-functional"] },
  { id: "EV-013", claim: "搭建并带领 6 人 TP 团队，通过 OKR 拆解和 SOP 推进项目落地。", source: "原始简历｜阿里巴巴", confidence: "self_reported", tags: ["team", "okr", "sop"] },
  { id: "EV-014", claim: "从 0 到 1 负责传统文化 IP 的产品设计、内容策划和交付闭环，小红书一转付费率 37.5%，直播间最高在线 1000+。", source: "原始简历｜创业经历", confidence: "self_reported", tags: ["zero-to-one", "content-product", "conversion"] },
  { id: "EV-015", claim: "搭建 500+ 达人矩阵与 4 人商务团队 SOP，首月全店 GMV 100 万元，第三个月达人直播 GMV 120 万元。", source: "原始简历｜创业经历", confidence: "self_reported", tags: ["scale", "creator-ecosystem", "gmv"] },
  { id: "EV-016", claim: "负责内容社区、赛事活动和达人生态运营，并与技术团队协作优化推荐机制和达人成长体系。", source: "原始简历｜网易与波奇宠物", confidence: "self_reported", tags: ["community", "recommendation", "creator"] },
  { id: "EV-017", claim: "社区活跃 UV 与优质内容数环比增长 100%+。", source: "原始简历｜网易与波奇宠物", confidence: "self_reported", tags: ["growth", "content-quality"] },
  { id: "EV-018", claim: "负责 TikTok、Shopee 运营，月均 GMV 20 万美元；优质达人短视频转化率提升 25%，ROI 稳定在 2-3。", source: "原始简历｜杭州超级元气", confidence: "self_reported", tags: ["content-performance", "conversion", "roi"] },
  { id: "EV-019", claim: "统筹年度产品运营节奏和互动机制，协同 PR、产品团队完成共创，支撑 10 亿元以上 GMV。", source: "原始简历｜巽风科技", confidence: "self_reported", tags: ["product-ops", "cross-functional", "scale"] },
] as const;

export const targetRolesSeed = [
  { id: "role-emotion", title: "情感智能数据产品经理", narrative: "情感洞察、Badcase 归因与 AI 互动体验", criteria: { score: 84 } },
  { id: "role-agent", title: "通用 Agent 数据产品经理", narrative: "搜索产品、自动化工作流与质量归因", criteria: { score: 78 } },
  { id: "role-writing", title: "AI 创作数据产品经理", narrative: "内容生态、文本质量与脚本评测", criteria: { score: 65 } },
] as const;

export const jobsSeed = [
  { externalId: "b8e62d9e-5cfb-4f24-bb6b-549bf45e1ee0", title: "情感智能数据产品经理", location: "杭州 / 北京", score: 84, decision: "priority", category: "non_technical_product" },
  { externalId: "bdffaaf8-5d88-4aa5-9869-8ab76fcd862a", title: "通用Agent数据产品经理（办公/生活/搜索）", location: "杭州 / 北京", score: 78, decision: "shortlist", category: "non_technical_product" },
  { externalId: "0238c1b1-7f2d-4b53-84da-581127a62954", title: "AI创作数据产品经理", location: "杭州 / 北京", score: 65, decision: "hold_for_portfolio", category: "non_technical_product" },
  { externalId: "141a78cd-784f-4139-9b72-8046afeec4e4", title: "专业领域数据产品经理（小语种、医学法律等学科）", location: "杭州 / 北京", score: 54, decision: "hold", category: "non_technical_product" },
  { externalId: "a4ad8628-286e-4395-ac3e-b8117ac695c6", title: "Code Agent 数据工程师", location: "北京", score: 18, decision: "exclude", category: "technical" },
] as const;

export const deepSeekSourceUrl = "https://app.mokahr.com/social-recruitment/high-flyer/140576#/jobs?zhineng%5B0%5D=16852&page=1&anchorName=jobsList";
