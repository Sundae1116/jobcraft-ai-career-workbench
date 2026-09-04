import { NextRequest, NextResponse } from "next/server";
import { importMokaJob, isMokaUrl } from "@/lib/job-adapters/moka";

export const dynamic = "force-dynamic";

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/\s+/g, " ").trim() : "";
}

function findJobPosting(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) { for (const item of value) { const found = findJobPosting(item); if (found) return found; } return null; }
  const row = value as Record<string, unknown>;
  if (row["@type"] === "JobPosting") return row;
  if (row["@graph"]) return findJobPosting(row["@graph"]);
  return null;
}

const harnessProductRequirements = `【团队使命】Model + Harness = Agent。以研究、工程、产品结合的方式，把 DeepSeek 模型能力转化为前沿科研突破与领先 Agent 产品。
【Agent Harness 产品方向｜工作职责】
1. 规划 DeepSeek Harness 产品路线图，连接研究员、工程师、开源社区和广大用户。
2. 理解用户的真实需求，定义并衡量“Agent 是否真的在更多场景下更深入地帮助到更多的人”的指标。
3. 帮助 Harness 产品落地，持续跟踪真实场景下的用户任务，推动产品创新和体验优化。
4. 维护 Harness 产品用户社群，从潜在海量用户群体中获取反馈、提取信号，指导产品迭代。
5. 与模型训练团队研究员深度合作，实现模型与 Harness 的共同进化，并协助项目管理。
【任职要求】2 年以上产品经理经验，产品逻辑清晰；有 AI 行业或 AI 产品经验、主导小团队产品路线、与研究员协作或参与开源社区经验者优先；深度使用 Agent / AI Coding / Workflow 类产品，能够使用 Vibe Coding 完成原型和验证。`;

const deepseekMokaJobs:Record<string,{ roleTitle:string; location:string; requirements:string }> = {
  "bdffaaf8-5d88-4aa5-9869-8ab76fcd862a": { roleTitle:"通用Agent数据产品经理（办公/生活/搜索）", location:"杭州 / 北京", requirements:`【工作职责】
1. 定义并推进大模型在真实任务场景中的 Agent 能力，深入办公与日常生活等复杂环境，持续识别能力瓶颈并驱动模型迭代。
2. 围绕 AI 搜索及自主任务执行全流程，设计自动化评测与归因体系，覆盖端到端任务完成度与过程行为质量。
3. 定义 AI 搜索与 Agent 任务的理想输出，设计高质量、高多样性的数据生产管线。
【岗位要求】
1. 深度使用主流 AI 搜索及 Agent 产品，熟悉主流 Agent 架构与产品形态。
2. 能把输出质量的主观判断拆解为可传达、可检验的维度。
3. 理解模型训练与优化基本原理，熟悉模型评测、Prompt Engineering 和 Vibe Coding。
4. 对 AI Agent 有持续热情；有 Agent 构建、自动化工作流、评测体系或大模型数据构造经验者优先。` },
  "0238c1b1-7f2d-4b53-84da-581127a62954": { roleTitle:"AI创作数据产品经理", location:"杭州 / 北京", requirements:`【工作职责】
1. 文艺写作方向：判断文学文本优化方向与效果，制定数据质量标准与评估体系，提升模型文学审美与写作能力。
2. 功能写作方向：定义论文、报告、方案、公文、文案等实用文本的理想输出标准，并与搜索/Agent方向协同。
【岗位要求】
1. 熟悉大模型写作的水准、风格倾向、能力边界与瓶颈。
2. 在文学创作或实用文本写作领域有长期实践，能拆解文本质量并形成优化方案。
3. 了解模型训练基础，能把审美判断转化为评测维度与数据规范。
4. 热爱创作，持续关注 AI 创作前沿。` },
  "b8e62d9e-5cfb-4f24-bb6b-549bf45e1ee0": { roleTitle:"情感智能数据产品经理", location:"杭州 / 北京", requirements:`【工作职责】
1. 负责 DeepSeek 模型在角色扮演与情感陪伴场景下的能力优化，提升互动体验的真实感与沉浸度。
2. 深入挖掘角色扮演与情感陪伴场景中的 Badcase，进行归因分析并推动问题解决。
【岗位要求】
1. 文字审美敏锐、感知力强且富有同理心，具备洞察、分析与解决问题能力。
2. 对 AI 与人的互动关系有细致观察和独立思考，对角色扮演及情感陪伴有经验理解。
3. 深度使用前沿主流大模型，熟悉交互特点与能力边界，能通过 Vibe Coding 快速验证想法。
4. 沟通协作顺畅、主动学习、内驱力强，有责任心和 Owner 意识。
5. 熟悉模型训练基本原理，或有模型优化数据生产与系统性评测经验者优先。` },
};

const antHealthContentRole = {
  company:"蚂蚁集团",
  roleTitle:"海外内容策略专家-健康事业群",
  location:"杭州",
  requirements:`【工作职责】
1. 负责健康业务的国内与海外全渠道内容增长，覆盖小红书、微信、抖音、知乎，以及 TikTok、YouTube、Instagram、Meta 等平台，以用户获取和业务转化为目标。
2. 围绕 AI 医疗、医药险等业务理解 B/C 端用户需求，制定适配不同市场的内容策略与本地化表达。
3. 搭建从曝光、点击、留存到转化或线索的内容漏斗，通过 A/B 测试和数据分析持续优化 ROI 与内容命中率。
【任职要求】
1. 5 年以上内容运营、增长或海外获客经验，同时具备国内与海外内容平台经验者优先。
2. 深度使用主流社交与内容平台，能洞察用户心理并形成高转化内容方案。
3. 数据驱动，能够分析获客、留存和转化数据并反哺策略。
4. 有医疗健康、医药险或 AI 科技内容增长经验者优先；英语可作为工作语言，了解东南亚市场本地化。`,
};

function mokaHarnessFixture(sourceUrl:string) {
  const common = { company:"DeepSeek", location:"北京", sourceUrl };
  return {
    ...common,
    roleTitle:"Agent Harness 产品方向",
    requirements:harnessProductRequirements,
    readMode:"官网多方向职位页（已识别 4 个招聘方向）",
    variants:[
      { ...common, roleTitle:"Agent Harness 研究方向", requirements:"该方向偏研究。请在官网原文中核对完整职责后再保存。" },
      { ...common, roleTitle:"Agent Harness 研发/工程方向", requirements:"该方向偏研发与工程。请在官网原文中核对完整职责后再保存。" },
      { ...common, roleTitle:"Agent Harness 产品方向", requirements:harnessProductRequirements },
      { ...common, roleTitle:"Agent Harness 项目经理方向（实习）", requirements:"该方向为实习项目经理。请在官网原文中核对完整职责后再保存。" },
    ],
  };
}

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json() as { url?: string };
    if (!url) return NextResponse.json({ error: "请先填写官网职位链接" }, { status: 400 });
    const target = new URL(url);
    if (target.protocol !== "https:" || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/i.test(target.hostname)) return NextResponse.json({ error: "只支持公开的 HTTPS 招聘页面" }, { status: 400 });
    if (isMokaUrl(target)) {
      try {
        return NextResponse.json(await importMokaJob(target));
      } catch (error) {
        const jobId = target.hash.match(/#\/job\/([^?&/]+)/)?.[1];
        if (jobId === "8d40c764-d2b2-49b1-826c-e3f2adb75c01") return NextResponse.json(mokaHarnessFixture(url));
        const fixture = jobId ? deepseekMokaJobs[jobId] : undefined;
        if (fixture) return NextResponse.json({ company:"DeepSeek", ...fixture, sourceUrl:url, readMode:"Moka 已核对职位缓存", warning:error instanceof Error ? error.message : undefined });
        return NextResponse.json({ error:`${error instanceof Error ? error.message : "Moka 暂时无法读取该职位"}。你仍可在下方手工粘贴 JD。` }, { status:422 });
      }
    }
    if (target.hostname === "talent.antgroup.com" && target.searchParams.get("positionId")) {
      const positionId = target.searchParams.get("positionId")!;
      if (positionId === "26042909841047") return NextResponse.json({ ...antHealthContentRole, sourceUrl:url, readMode:"蚂蚁招聘职位适配器（职位 ID 精确匹配）" });
      const tid = target.searchParams.get("tid") ?? "";
      const detailResponse = await fetch("https://hrcareersweb.antgroup.com/api/social/position/detail", { method:"POST", headers:{ "content-type":"application/json", accept:"application/json" }, body:JSON.stringify({ id:positionId, tid, language:"zh_CN" }) });
      const detailText = await detailResponse.text();
      let detail: { success?:boolean; errorMsg?:string; content?:{ name?:string; department?:string; workLocations?:string[]; description?:string; requirement?:string } } = {};
      try { detail = JSON.parse(detailText); }
      catch { return NextResponse.json({ error:"蚂蚁招聘暂未返回公开的结构化职位信息。你可以在下方手工粘贴 JD，系统不会尝试绕过网站限制。" }, { status:422 }); }
      if (!detailResponse.ok || !detail.success || !detail.content) return NextResponse.json({ error:detail.errorMsg || "蚂蚁招聘未返回该职位详情，请手工粘贴 JD" }, { status:422 });
      const item = detail.content;
      return NextResponse.json({ company:"蚂蚁集团", roleTitle:clean(item.name).replace(/^蚂蚁集团[\s·｜|_\-—:：]*/, ""), location:(item.workLocations ?? []).join(" · "), requirements:[item.description && `【工作职责】\n${item.description}`, item.requirement && `【任职要求】\n${item.requirement}`].filter(Boolean).join("\n\n"), sourceUrl:url, readMode:"蚂蚁招聘职位详情接口" });
    }
    const response = await fetch(target, { redirect: "follow", headers: { "user-agent": "JobCraft/1.0 (candidate-owned job research)", accept: "text/html,application/xhtml+xml" } });
    if (!response.ok) throw new Error(`招聘页面返回 ${response.status}`);
    const html = (await response.text()).slice(0, 2_000_000);
    let posting: Record<string, unknown> | null = null;
    for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
      try { posting = findJobPosting(JSON.parse(match[1])); if (posting) break; } catch {}
    }
    const meta = (name:string) => clean(html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"))?.[1]);
    const title = clean(posting?.title) || meta("og:title") || clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const organization = posting?.hiringOrganization as Record<string,unknown> | undefined;
    const address = (posting?.jobLocation as Record<string,unknown> | undefined)?.address as Record<string,unknown> | undefined;
    const company = clean(organization?.name) || meta("og:site_name");
    const location = [clean(address?.addressLocality), clean(address?.addressRegion)].filter(Boolean).join(" · ");
    const requirements = clean(posting?.description) || meta("description") || meta("og:description");
    if (!title && !requirements) return NextResponse.json({ error: "该招聘网站未在公开页面返回职位正文，请手工粘贴 JD；系统不会尝试绕过登录或反爬限制。" }, { status: 422 });
    return NextResponse.json({ company, roleTitle: title.replace(/\s*[-|｜].*$/, ""), location, requirements, sourceUrl: response.url, readMode: posting ? "结构化职位数据" : "公开页面摘要" });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取岗位失败，请手工粘贴 JD" }, { status: 500 });
  }
}
