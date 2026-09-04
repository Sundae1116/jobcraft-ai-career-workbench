"use client";

import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type Role = string;
type View = "compare" | "evidence" | "resume" | "workspace";
type ResumeStrategy = "balanced" | "transition" | "both";
type ReviewAction = "keep" | "rewrite" | "compress";

const actionLabels: Record<ReviewAction, string> = { keep: "保留", rewrite: "改写", compress: "压缩" };

const resumeDiffs = [
  {
    id: "D-01", section: "自我评价", evidence: "EV-004 · EV-006 · EV-010", defaultAction: "rewrite" as ReviewAction,
    balanced: "10年互联网平台、产品运营和内容生态经验，做过电商产品、行业运营，也有从0到1创业和团队管理经历。",
    transition: "长期做用户、内容和产品运营，擅长从用户反馈和业务数据中找问题，再推动产品改进。",
    note: "平衡版交代职业连续性；强转型版更快进入目标岗位能力。",
  },
  {
    id: "D-02", section: "我的优势 · 用户理解", evidence: "EV-006 · EV-007", defaultAction: "keep" as ReviewAction,
    balanced: "服务过60+情感咨询付费用户，能够从具体对话中判断用户真正想解决的问题、情绪状态和沟通语境。",
    transition: "服务60+真实付费用户，能够从多轮交流中区分表面诉求和实际困扰，并给出针对性的沟通建议。",
    note: "核心差异化证据，两版都保留；证书名称仍需本人核验。",
  },
  {
    id: "D-03", section: "创业经历 · 电商成果", evidence: "EV-014 · EV-019", defaultAction: "compress" as ReviewAction,
    balanced: "保留传统文化IP、小红书转化率、直播在线人数、达人矩阵和GMV结果。",
    transition: "转译为从0到1的规模化协作与交付能力，保留500+达人、首月100万元和第三个月120万元等结果数字。",
    note: "这些结果证明执行力，但篇幅过大会削弱AI岗位定位。",
  },
  {
    id: "D-04", section: "巽风经历 · 产品协作", evidence: "EV-008 · EV-009", defaultAction: "keep" as ReviewAction,
    balanced: "负责搜索、短视频、营销工具及运营后台等10项产品功能，推动搜索词推荐和排行榜上线。",
    transition: "从业务反馈和数据中梳理问题，与产品、研发协作推进功能上线；保留转化率提升21%、DAU提升10%及支撑10亿元以上GMV。",
    note: "保留事实和数字，改写时不把产品运营扩大成产品经理职责。",
  },
  {
    id: "D-05", section: "阿里经历 · Badcase", evidence: "EV-010 · EV-011 · EV-012", defaultAction: "rewrite" as ReviewAction,
    balanced: "保留Badcase处理、数据诊断、天猫520项目和团队管理四部分。",
    transition: "前置产品链路Badcase和数据诊断；大型营销项目与团队管理压缩为结果证明。",
    note: "目标岗位最相关的是问题归因和产品推动，不改变原始业务场景。",
  },
] as const;

const agentDiffs = [
  { id:"A-01", section:"自我评价", evidence:"EV-001 · EV-002 · EV-010", defaultAction:"rewrite" as ReviewAction, balanced:"保留平台、产品运营和团队协作背景，再说明AI工具与自动化工作流实践。", transition:"前置大模型工具、自动化工作流和Badcase归因，快速建立Agent岗位关联。", note:"不把工具使用扩大为模型或Agent研发经历。" },
  { id:"A-02", section:"巽风经历 · 产品能力", evidence:"EV-008 · EV-009", defaultAction:"keep" as ReviewAction, balanced:"完整保留10项功能、搜索推荐、转化率和DAU结果。", transition:"翻译为需求发现、跨团队上线和指标验证闭环，保留21%与10%结果。", note:"这是通用Agent岗位最直接的产品协作证据。" },
  { id:"A-03", section:"阿里经历 · 问题归因", evidence:"EV-010 · EV-011", defaultAction:"rewrite" as ReviewAction, balanced:"保留Badcase、数据诊断、项目统筹与团队管理。", transition:"前置产品链路问题定位、方案输出与功能推动，压缩营销执行描述。", note:"强调可迁移的问题拆解能力，不改写为模型评测经验。" },
] as const;

const writingDiffs = [
  { id:"W-01", section:"自我评价", evidence:"EV-005 · EV-014 · EV-016", defaultAction:"rewrite" as ReviewAction, balanced:"交代内容生态、产品运营与AI脚本评测的连续经验。", transition:"前置内容质量判断、文化语境和AI辅助评测，弱化纯电商定位。", note:"不将内容运营包装成文学创作专家。" },
  { id:"W-02", section:"创业经历 · 内容产品", evidence:"EV-014 · EV-015", defaultAction:"keep" as ReviewAction, balanced:"保留传统文化IP、转化率、直播在线与达人矩阵结果。", transition:"翻译为内容产品设计、用户反馈闭环和规模化内容协作，保留关键数字。", note:"兼顾内容判断与商业结果。" },
  { id:"W-03", section:"早期经历 · 内容生态", evidence:"EV-016 · EV-017", defaultAction:"rewrite" as ReviewAction, balanced:"保留社区、赛事、达人运营和推荐机制协作。", transition:"前置内容质量标准、推荐机制和优质内容增长100%+。", note:"这是AI创作岗位最相关的长期内容证据。" },
] as const;
const allResumeDiffs = [...resumeDiffs, ...agentDiffs, ...writingDiffs];

const roles = {
  agent: {
    short: "通用 Agent",
    title: "通用 Agent 数据产品经理",
    score: 78,
    accent: "#ff6b35",
    verdict: "值得投递",
    mission: "定义真实任务场景中的 Agent 能力，建立自动化评测和归因体系，用高质量数据推动模型迭代。",
    matched: [
      ["EV-001", "深度使用主流大模型与 Vibe Coding", "已自述"],
      ["EV-002", "搭建自动化招聘工作流", "有链接"],
      ["EV-008", "推动搜索等10项产品功能上线", "已自述"],
      ["EV-010", "产品 Badcase 归因并推动功能解决", "已自述"],
    ],
    gaps: ["大模型系统性评测项目", "大模型数据生产或构造", "Agent 架构认知证明"],
    strengthening: [] as string[],
    narrative: "从搜索产品、Badcase 归因和自动化工作流切入，证明能把模糊质量问题拆成产品机制与验证闭环。",
    resume: ["前置搜索产品与功能迭代经历", "突出自动化招聘工作流作品", "用库存Badcase展示归因与推动能力", "保留模型评测经验缺口，不反向虚构"],
  },
  writing: {
    short: "AI 创作",
    title: "AI 创作数据产品经理",
    score: 65,
    accent: "#d3528d",
    verdict: "补作品后投递",
    mission: "定义文学与实用文本的理想输出和评测体系，用数据提升模型写作与审美能力。",
    matched: [
      ["EV-005", "使用 AI 进行短视频脚本评测", "已自述"],
      ["EV-014", "传统文化 IP 内容与产品运营", "已自述"],
      ["EV-016", "内容社区与达人生态运营", "已自述"],
      ["EV-017", "优质内容数环比增长100%+", "已自述"],
    ],
    gaps: ["长期文学或实用写作作品集", "大模型写作横向评测", "审美到数据规范的完整案例"],
    strengthening: [] as string[],
    narrative: "强调内容生态、文化语境、脚本评测与内容质量增长，但不把内容运营包装成文学创作专家。",
    resume: ["前置内容社区和传统文化IP经历", "突出脚本评测与内容质量结果", "补充实用文本评测作品", "删除与文本质量无关的电商细节"],
  },
  emotion: {
    short: "情感智能",
    title: "情感智能数据产品经理",
    score: 84,
    accent: "#745cff",
    verdict: "优先投递",
    mission: "优化角色扮演与情感陪伴能力，通过 Badcase 归因提升互动的真实感和沉浸度。",
    matched: [
      ["EV-006", "交付60+女性付费情感咨询用户", "已自述"],
      ["EV-007", "持有心理咨询师证书", "待证书"],
      ["EV-010", "Badcase 归因与跨团队推动", "已自述"],
      ["EV-003", "情感陪伴 Badcase 评测工作台", "待验证"],
    ],
    gaps: ["评测工作台有效链接或截图", "情感陪伴模型评测样本", "模型优化数据生产经历"],
    strengthening: [] as string[],
    narrative: "以60+真实情感咨询为差异化核心，把人类需求洞察、Badcase归因与 Vibe Coding 转译为 AI 互动体验评测能力。",
    resume: ["将情感咨询交付提升至核心优势", "前置情绪、语境和需求洞察", "以产品Badcase证明归因与推动能力", "作品链接保持待验证，不计入已证实能力"],
  },
} as const;

type WorkspaceEvidence = { id: string; claim: string; source: string | null; confidence: "verified" | "self_reported" | "unverified"; tagsJson?:string };
type WorkspaceJob = { id: string; title: string; company: string; location: string | null; sourceUrl: string; description: string };
type GeneratedContent = { meta: { roleTitle: string; strategy: string; template?: "ats" | "product" | "portfolio"; feedback: string; generator: "evidence-rules-v1" | "openai" | "deepseek" }; profile: { name: string; target: string }; summary: { text: string; evidenceIds: string[] }; advantages: Array<{ text: string; evidenceIds: string[] }>; experience: Array<{ company: string; role: string; dates: string; bullets: Array<{ text: string; evidenceIds: string[] }> }> };
type ReviewRecord = { id: string; roleKey: string; version: number; strategy: ResumeStrategy; template: "ats" | "product" | "portfolio"; feedback: string | null; status: "draft" | "confirmed"; contentJson: string | null; evidenceMapJson: string | null; createdAt: string };
type WorkspaceTargetRole = { id:string; title:string; narrative:string; criteriaJson:string; active:boolean };
type InterviewKit={applicationId:string;jobId:string;roleId:string;roleTitle:string;company:string;positioning:string;pillars:Array<{evidenceId:string;title:string}>;intro30:string;intro90:string;questions:string[];caseFramework:string[];riskQuestions:Array<{evidenceId:string;question:string}>;reverseQuestions:string[]};
type SubmissionPackage={applicationId:string;jobId:string;company:string;roleTitle:string;jobUrl:string;adapter:string;resumeReviewId:string;resumeVersion:number;resumeStrategy:"balanced"|"transition";resumeTemplate:"ats"|"product"|"portfolio";resumeDownloadUrl:string;preparedAt:string;status:"awaiting_human_confirmation";checks:{jobAndResume:boolean;contact:boolean;sensitiveAnswers:boolean;finalSubmit:boolean}};
type ApplicationDecision={interviewKit?:InterviewKit;submissionPackage?:SubmissionPackage;submittedAt?:string};
type CandidateProfile={phone?:string;email?:string;location?:string;yearsExperience?:string;profileConfirmedAt?:string};
type WorkspaceData = { candidate:{displayName:string;profileJson:string}|null; evidence:WorkspaceEvidence[]; targetRoles:WorkspaceTargetRole[]; jobs:WorkspaceJob[]; trash:WorkspaceJob[]; applications:Array<{id:string;jobId:string;targetRoleId:string;status:string;decisionJson?:string|null}>; reviews:ReviewRecord[] };

const views: [View, string][] = [["compare", "岗位判断"], ["evidence", "证据补全"], ["resume", "简历审核"], ["workspace", "投递工作台"]];

function displayRoleTitle(title:string,company?:string){let value=title.trim();for(const prefix of [company,"蚂蚁集团","DeepSeek"].filter(Boolean) as string[]){if(value.toLowerCase().startsWith(prefix.toLowerCase())){value=value.slice(prefix.length).replace(/^[\s·｜|_\-—:：]+/,"");break;}}return value||title;}

export default function Home() {
  const [role, setRole] = useState<Role>("emotion");
  const [view, setView] = useState<View>("compare");
  const [evidenceReturnView, setEvidenceReturnView] = useState<View>("compare");
  const [planReady, setPlanReady] = useState(false);
  const [strategy, setStrategy] = useState<ResumeStrategy>("balanced");
  const [reviewActions, setReviewActions] = useState<Record<string, ReviewAction>>(() => Object.fromEntries(allResumeDiffs.map(item => [item.id, item.defaultAction])));
  const [selectedVersion, setSelectedVersion] = useState<"balanced" | "transition">("balanced");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [showResumePreview, setShowResumePreview] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [showRegenerate, setShowRegenerate] = useState(false);
  const [regenerateFeedback, setRegenerateFeedback] = useState("保留关键数字，减少模板化表达，用产品运营语言重写");
  const [modelProvider, setModelProvider] = useState<"local" | "openai" | "deepseek">("local");
  const [modelApiKey, setModelApiKey] = useState("");
  const [showModelSettings, setShowModelSettings] = useState(false);
  const [rememberModelKey, setRememberModelKey] = useState(false);
  const [resumeTemplate, setResumeTemplate] = useState<"ats" | "product" | "portfolio">("ats");
  const [reviewVersion, setReviewVersion] = useState(2);
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");
  const [generatedReview, setGeneratedReview] = useState<{ id: string; version: number; content: GeneratedContent } | null>(null);
  const [showGeneratedPreview, setShowGeneratedPreview] = useState(false);
  const [generatedPair, setGeneratedPair] = useState<Array<{ id:string; version:number; strategy:"balanced"|"transition"; content:GeneratedContent }> | null>(null);
  const [showAddEvidence, setShowAddEvidence] = useState(false);
  const [showAddRole, setShowAddRole] = useState(false);
  const [newRole, setNewRole] = useState({ company: "", roleTitle: "", location: "", sourceUrl: "", requirements: "" });
  const [jobImporting, setJobImporting] = useState(false);
  const [jobImportMessage, setJobImportMessage] = useState("");
  const [jobVariants, setJobVariants] = useState<Array<{ company:string; roleTitle:string; location:string; requirements:string; sourceUrl:string }>>([]);
  const [selectedJob, setSelectedJob] = useState<WorkspaceJob | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [roleContextMenu, setRoleContextMenu] = useState<{x:number;y:number;job:WorkspaceJob}|null>(null);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [statusSyncing, setStatusSyncing] = useState(false);
  const statusSyncKey = useRef("");
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoFile, setPhotoFile] = useState<File|null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState("");
  const [photoMessage, setPhotoMessage] = useState("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [newExperience, setNewExperience] = useState({ company: "", roleTitle: "", dates: "", responsibility: "", result: "", source: "", confidence: "self_reported" as WorkspaceEvidence["confidence"] });
  const [editingEvidenceId, setEditingEvidenceId] = useState<string|null>(null);
  const [editingEvidence, setEditingEvidence] = useState({ claim:"", source:"", confidence:"self_reported" as WorkspaceEvidence["confidence"] });
  const [interviewKit,setInterviewKit]=useState<InterviewKit|null>(null);
  const [showInterviewKit,setShowInterviewKit]=useState(false);
  const [submissionPackage,setSubmissionPackage]=useState<SubmissionPackage|null>(null);
  const [showSubmissionPackage,setShowSubmissionPackage]=useState(false);
  const [preflightChecks,setPreflightChecks]=useState({contact:false,resume:false,sensitive:false,noAutoSubmit:false});
  const [showCandidateProfile,setShowCandidateProfile]=useState(false);
  const [candidateDraft,setCandidateDraft]=useState({displayName:"",phone:"",email:"",currentCity:"",yearsExperience:""});
  const [copyNotice,setCopyNotice]=useState("");
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceMessage, setWorkspaceMessage] = useState("");
  const [workflowNotice, setWorkflowNotice] = useState("");
  const [targetMatchScore, setTargetMatchScore] = useState(90);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, { claim: string; source: string }>>({});
  const dynamicRoles = useMemo(() => {
    const result: Record<string, typeof roles.emotion> = { ...roles };
    const staticIds: Record<string,string> = { "role-agent": "agent", "role-writing": "writing", "role-emotion": "emotion" };
    for (const item of workspace?.targetRoles ?? []) if (!item.active && staticIds[item.id]) delete result[staticIds[item.id]];
    for (const item of workspace?.targetRoles ?? []) {
      if (!item.active) continue;
      let criteria: { score?: number; company?: string; requirements?: string; matched?:Array<{evidenceId:string;claim:string;dimension?:string;reason?:string;relevance?:number;confidence?:string;strength?:string}>; gaps?:string[]; strengthening?:string[]; coverage?:number; method?:string } = {};
      try { criteria = JSON.parse(item.criteriaJson); } catch {}
      const cleanTitle=displayRoleTitle(item.title,criteria.company);
      const staticKey=staticIds[item.id];
      if(staticKey){const base=result[staticKey];result[staticKey]={...base,title:cleanTitle,short:cleanTitle.length>11?cleanTitle.slice(0,11)+"…":cleanTitle,score:criteria.score??base.score,mission:criteria.requirements||base.mission,matched:criteria.matched?.length?criteria.matched.map(x=>[x.evidenceId,x.claim,x.confidence==="unverified"?"待验证":x.reason||("强匹配｜"+(x.dimension||"岗位核心任务"))]):base.matched,gaps:Array.isArray(criteria.gaps)?criteria.gaps:base.gaps,strengthening:Array.isArray(criteria.strengthening)?criteria.strengthening:base.strengthening,narrative:item.narrative||base.narrative};continue;}
      result[item.id] = {
        short: cleanTitle.length > 11 ? cleanTitle.slice(0,11)+"…" : cleanTitle,
        title: cleanTitle,
        score: criteria.score ?? 60,
        accent: "#745cff",
        verdict: "待完成岗位分析",
        mission: criteria.requirements || "拆解"+cleanTitle+"的核心要求，并与真实履历逐项匹配。",
        matched: criteria.matched?.length ? criteria.matched.map(item => [item.evidenceId,item.claim,item.confidence==="unverified"?"待验证":item.reason||("强匹配｜"+(item.dimension||"岗位核心任务"))]) : [],
        gaps: Array.isArray(criteria.gaps) ? criteria.gaps : ["岗位要求仍需逐项确认"],
        strengthening: Array.isArray(criteria.strengthening) ? criteria.strengthening : [],
        narrative: item.narrative,
        resume: ["保留关键数字证据", "将原行业语言迁移为目标岗位语言", "同时生成平衡版与强转型版", "本人审核后才能进入投递"],
      } as typeof roles.emotion;
    }
    return result;
  }, [workspace]);
  const current = dynamicRoles[role] ?? roles.emotion;
  const roleGroups = useMemo(() => {
    const groups = new Map<string,string[]>();
    for (const key of Object.keys(dynamicRoles)) {
      const company=companyForRole(key);
      groups.set(company,[...(groups.get(company)??[]),key]);
    }
    return [...groups.entries()];
  }, [dynamicRoles,workspace]);
  const customDiffs = useMemo(() => [
    { id:`${role}-01`, section:"自我评价", evidence:"EV-001 · EV-008 · EV-010", defaultAction:"rewrite" as ReviewAction, balanced:`保留完整职业连续性，并说明与「${current.title}」相关的产品协作和用户洞察。`, transition:`前置与「${current.title}」最相关的真实证据，压缩弱相关行业背景。`, note:"迁移岗位语言，不扩大原有职责。" },
    { id:`${role}-02`, section:"我的优势", evidence:"EV-008 · EV-009 · EV-011", defaultAction:"keep" as ReviewAction, balanced:"保留产品需求、数据诊断和跨团队推进能力，并保留原始数字结果。", transition:"按目标岗位要求重排优势，但每条结论仍绑定证据 ID。", note:"数字证据不因转型而删除。" },
    { id:`${role}-03`, section:"工作经历", evidence:"统一证据库 · 时间倒序", defaultAction:"rewrite" as ReviewAction, balanced:"保留主要工作经历和业务结果，以产品运营语言解释可迁移能力。", transition:"压缩弱相关执行细节，前置问题发现、方案推进和结果验证。", note:"两版内容强度不同，事实范围完全相同。" },
  ], [role, current.title]);
  const activeDiffs = role === "emotion" ? resumeDiffs : role === "agent" ? agentDiffs : role === "writing" ? writingDiffs : customDiffs;
  const actionFor = (item: { id:string; defaultAction:ReviewAction }) => reviewActions[item.id] ?? item.defaultAction;
  const verifiedCount = useMemo(() => current.matched.filter((x) => x[2] !== "待验证").length, [current]);
  const strengtheningItems = useMemo(() => current.strengthening.length ? current.strengthening : current.gaps.length === 0 && current.score < 90 ? ["核心要求已有相关经历，但岗位直接场景、结果或作品证据仍可强化"] : [], [current]);
  const directEvidenceCount = useMemo(() => current.matched.filter((x) => !String(x[2]).startsWith("可迁移") && x[2] !== "待验证").length, [current]);
  const transferableEvidenceCount = useMemo(() => current.matched.filter((x) => String(x[2]).startsWith("可迁移")).length, [current]);
  const evidenceRewriteSuggestion = useMemo(() => {
    const hasNumber=/[0-9]|%|万|亿|提升|增长|降低|达成/.test(editingEvidence.claim);
    return {structure:"建议按「业务背景 → 你的动作 → 协作对象 → 结果」组织，先写你实际做了什么，再写结果。",evidence:hasNumber?"当前内容已有数字，改写时应原样保留并说明数字对应的业务口径。":"当前内容缺少量化结果；如确有数据，可补充规模、效率、转化率或业务结果，没有则不要编造。",example:"结构示例：在【真实业务场景】中，基于【真实反馈/数据】梳理【问题或需求】，协同【真实协作方】推进【实际动作】，最终取得【已有结果】。"};
  }, [editingEvidence.claim]);

  async function loadWorkspace() {
    setWorkspaceLoading(true);
    try {
      const response = await fetch("/api/workspace", { cache: "no-store" });
      const data = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "读取失败");
      setWorkspace(data);
      if(data.candidate){let profile:CandidateProfile={};try{profile=JSON.parse(data.candidate.profileJson)}catch{}setCandidateDraft({displayName:data.candidate.displayName,phone:profile.phone??"",email:profile.email??"",currentCity:profile.location??"",yearsExperience:profile.yearsExperience??""});}
      setEvidenceDrafts(Object.fromEntries(data.evidence.map(item => [item.id, { claim: item.claim, source: item.source ?? "" }])));
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "读取工作台失败");
    } finally {
      setWorkspaceLoading(false);
    }
  }

  useEffect(() => { if (!workspace && !workspaceLoading) void loadWorkspace(); void loadProfilePhoto(); const savedProvider=localStorage.getItem("jobcraft-model-provider") as "openai"|"deepseek"|null;const savedKey=localStorage.getItem("jobcraft-model-key");if(savedProvider)setModelProvider(savedProvider);if(savedKey){setModelApiKey(savedKey);setRememberModelKey(true)} }, []);
  useEffect(() => { const close=()=>setRoleContextMenu(null); window.addEventListener("click",close); window.addEventListener("scroll",close,true); return()=>{window.removeEventListener("click",close);window.removeEventListener("scroll",close,true)}; }, []);
  useEffect(() => { const closeOnEscape=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;setRoleContextMenu(null);setSelectedJob(null);setShowTrash(false);setShowInterviewKit(false);setShowSubmissionPackage(false);setShowCandidateProfile(false);setShowPhotoUpload(false);setShowResumePreview(false);setShowAddRole(false);setShowUpload(false);setShowRegenerate(false);setShowModelSettings(false);setShowAddEvidence(false);setShowGeneratedPreview(false);};window.addEventListener("keydown",closeOnEscape);return()=>window.removeEventListener("keydown",closeOnEscape);}, []);
  useEffect(() => { if(!workspace?.jobs.length||statusSyncing)return; const stale=workspace.jobs.some(item=>{const checked=jobStatusMeta(item).checkedAt;return !checked||Date.now()-new Date(checked).getTime()>12*60*60*1000}); const key=workspace.jobs.map(item=>item.id).sort().join("|"); if(stale&&statusSyncKey.current!==key){statusSyncKey.current=key;void syncJobStatuses(false)} }, [workspace?.jobs,statusSyncing]);

  async function loadProfilePhoto(){try{const response=await fetch("/api/profile-photo",{cache:"no-store"});const data=await response.json() as {photo?:{url:string}|null};setProfilePhotoUrl(data.photo?.url?`${data.photo.url}&t=${Date.now()}`:"");}catch{}}

  async function preparePhoto(file:File){if(file.size<=900*1024)return file;const image=await createImageBitmap(file);const max=1600,scale=Math.min(1,max/Math.max(image.width,image.height));const canvas=document.createElement("canvas");canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext("2d")!.drawImage(image,0,0,canvas.width,canvas.height);const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",.84));image.close();if(!blob)throw new Error("照片压缩失败，请换一张 JPG 或 PNG 图片");return new File([blob],file.name.replace(/\.(png|jpe?g)$/i,".jpg"),{type:"image/jpeg"});}
  async function uploadProfilePhoto(){if(!photoFile){setPhotoMessage("请先选择一张 JPG 或 PNG 照片");return;}setPhotoUploading(true);setPhotoMessage("正在优化照片尺寸并上传…");try{const uploadFile=await preparePhoto(photoFile);const form=new FormData();form.append("photo",uploadFile);const response=await fetch("/api/profile-photo",{method:"POST",body:form});const text=await response.text();let data:{error?:string;message?:string;photo?:{url:string}}={};try{data=JSON.parse(text)}catch{if(response.status===413)throw new Error("照片虽然小于 5MB，但超过了站点单次上传限制。系统已尝试自动压缩，请重新选择或截图后再上传。");throw new Error("照片上传没有完成，请稍后重试");}if(!response.ok)throw new Error(data.error??(response.status===413?"照片超过当前站点可接收的大小，请压缩后重试":"照片上传失败，请稍后重试"));setProfilePhotoUrl(`${data.photo!.url}&t=${Date.now()}`);setPhotoFile(null);setPhotoMessage(`形象照已保存${uploadFile.size<photoFile.size?`（已自动从 ${(photoFile.size/1048576).toFixed(2)}MB 优化为 ${(uploadFile.size/1048576).toFixed(2)}MB）`:""}`);}catch(error){setPhotoMessage(error instanceof Error?error.message:"照片上传失败，请稍后重试");}finally{setPhotoUploading(false);}}

  function openNewEvidence(){setEditingEvidenceId(null);setNewExperience({company:"",roleTitle:"",dates:"",responsibility:"",result:"",source:"",confidence:"self_reported"});setShowAddEvidence(true);}
  function openGapEvidence(gap:string){setEditingEvidenceId(null);setNewExperience({company:"",roleTitle:"",dates:"",responsibility:`待补强方向：${gap}\n请在这里填写你真实做过的具体事情，不要照抄岗位要求。`,result:"",source:"",confidence:"unverified"});setShowAddEvidence(true);}
  function saveModelSettings(){if(modelProvider!=="local"&&!modelApiKey.trim()){setReviewMessage("请填写 API Key，或选择本地证据引擎");return;}if(rememberModelKey&&modelProvider!=="local"){localStorage.setItem("jobcraft-model-provider",modelProvider);localStorage.setItem("jobcraft-model-key",modelApiKey)}else{localStorage.removeItem("jobcraft-model-provider");localStorage.removeItem("jobcraft-model-key")}setShowModelSettings(false);setReviewMessage(modelProvider==="local"?"已切换为本地证据引擎":"模型设置已保存到当前浏览器");}
  function openEditEvidence(id:string){const item=workspace?.evidence.find(x=>x.id===id);if(!item){openNewEvidence();return;}setEditingEvidenceId(id);setEditingEvidence({claim:item.claim,source:item.source??"",confidence:item.confidence});setShowAddEvidence(true);}
  const similarEvidence=useMemo(()=>{if(editingEvidenceId||!workspace)return[];const terms=[newExperience.company,newExperience.roleTitle,newExperience.dates].map(x=>x.trim()).filter(x=>x.length>=2);if(!terms.length)return[];return workspace.evidence.filter(item=>terms.filter(term=>item.claim.includes(term)||(item.tagsJson??"").includes(term)).length>=Math.min(2,terms.length)).slice(0,4);},[editingEvidenceId,newExperience.company,newExperience.roleTitle,newExperience.dates,workspace]);

  async function trashAction(action:"restoreTargetRole"|"permanentlyDeleteTargetRole",item:WorkspaceJob){if(action==="permanentlyDeleteTargetRole"&&!window.confirm(`永久删除“${item.title}”吗？此操作不可恢复。`))return;await workspaceAction({action,jobId:item.id},action==="restoreTargetRole"?"岗位已从回收站恢复":"岗位已永久删除");}

  async function workspaceAction(payload: Record<string, unknown>, success: string) {
    setWorkspaceLoading(true); setWorkspaceMessage("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as WorkspaceData & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      setWorkspace(data); setWorkspaceMessage(success);
      if (payload.action === "updateEvidence") setWorkflowNotice("证据已保存。请重新查看岗位匹配度；如证据覆盖了缺口，再生成新版简历。");
      setEvidenceDrafts(Object.fromEntries(data.evidence.map(item => [item.id, { claim: item.claim, source: item.source ?? "" }])));
    } catch (error) {
      setWorkspaceMessage(error instanceof Error ? error.message : "保存失败");
    } finally { setWorkspaceLoading(false); }
  }

  function jobStatusMeta(item?:WorkspaceJob) {
    let meta:{jobStatus?:"open"|"closed"|"unknown";statusCheckedAt?:string;statusMessage?:string}={};
    try{if(item)meta=JSON.parse(item.description)}catch{}
    const status=meta.jobStatus??"unknown";
    return {status,label:status==="open"?"官网在招":status==="closed"?"已下线":meta.statusCheckedAt?"待人工确认":"尚未核验",checkedAt:meta.statusCheckedAt,message:meta.statusMessage};
  }

  async function syncJobStatuses(manual=true) {
    if(statusSyncing)return;
    setStatusSyncing(true);
    try{
      const response=await fetch("/api/workspace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"syncJobStatuses"})});
      const data=await response.json() as WorkspaceData&{error?:string;statusSync?:{checked:number;open:number;closed:number;unknown:number}};
      if(!response.ok)throw new Error(data.error??"岗位状态同步失败");
      setWorkspace(data);
      const summary=data.statusSync;
      if(manual||summary?.closed)setWorkspaceMessage(summary?"已核验 "+summary.checked+" 个岗位："+summary.open+" 个在招、"+summary.closed+" 个已下线、"+summary.unknown+" 个待人工确认":"岗位状态已同步");
    }catch(error){if(manual)setWorkspaceMessage(error instanceof Error?error.message:"岗位状态同步失败");}
    finally{setStatusSyncing(false);}
  }

  async function createApplicationDraft(item:WorkspaceJob, targetRoleId:string){setWorkspaceLoading(true);setWorkspaceMessage("");try{const response=await fetch("/api/workspace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"createApplication",jobId:item.id,targetRoleId})});const data=await response.json() as WorkspaceData&{error?:string;applicationId?:string;deduplicated?:boolean};if(!response.ok)throw new Error(data.error??"创建申请草稿失败");setWorkspace(data);setRole(targetRoleId==="role-emotion"?"emotion":targetRoleId==="role-writing"?"writing":targetRoleId==="role-agent"?"agent":targetRoleId);goToView("resume");setPlanReady(false);setWorkflowNotice(data.deduplicated?`“${item.title}”已有申请草稿，已为你打开下一步：生成并审核岗位简历。`:`“${item.title}”的申请草稿已建立。下一步请生成并审核简历；确认后再回到投递工作台。`);}catch(error){setWorkspaceMessage(error instanceof Error?error.message:"创建申请草稿失败");}finally{setWorkspaceLoading(false);}}
  async function generateInterviewKit(applicationId:string){setWorkspaceLoading(true);try{const response=await fetch("/api/workspace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"generateInterviewKit",applicationId})});const data=await response.json() as WorkspaceData&{error?:string;interviewKit?:InterviewKit};if(!response.ok||!data.interviewKit)throw new Error(data.error??"生成面试准备包失败");setWorkspace(data);setInterviewKit(data.interviewKit);setShowInterviewKit(true);}catch(error){setWorkspaceMessage(error instanceof Error?error.message:"生成面试准备包失败");}finally{setWorkspaceLoading(false);}}
  async function prepareApplication(applicationId:string){setWorkspaceLoading(true);setWorkspaceMessage("");try{const response=await fetch("/api/workspace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"prepareApplication",applicationId})});const data=await response.json() as WorkspaceData&{error?:string;submissionPackage?:SubmissionPackage};if(!response.ok||!data.submissionPackage)throw new Error(data.error??"生成投递包失败");setWorkspace(data);setSubmissionPackage(data.submissionPackage);setPreflightChecks({contact:false,resume:false,sensitive:false,noAutoSubmit:false});setShowSubmissionPackage(true);}catch(error){setWorkspaceMessage(error instanceof Error?error.message:"生成投递包失败");}finally{setWorkspaceLoading(false);}}
  async function saveCandidateProfile(){if(!candidateDraft.displayName.trim()||!candidateDraft.phone.trim()||!candidateDraft.email.trim()){setWorkspaceMessage("请至少填写姓名、电话和邮箱");return;}await workspaceAction({action:"updateCandidateProfile",...candidateDraft},"个人投递资料已保存");setShowCandidateProfile(false);}
  async function copyField(value:string,label:string){if(!value){setCopyNotice(`${label}尚未填写，请先完善个人资料`);return;}await navigator.clipboard.writeText(value);setCopyNotice(`${label}已复制`);}
  async function markApplicationSubmitted(applicationId:string){await workspaceAction({action:"markApplicationSubmitted",applicationId},"已记录为官网投递完成");setShowSubmissionPackage(false);}
  async function updateApplicationStage(applicationId:string,stage:string){await workspaceAction({action:"updateApplicationStage",applicationId,stage},"求职进度已更新");}

  function selectRole(next: Role) {
    setRole(next);
    setPlanReady(false);
    setStrategy("balanced");
    setReviewConfirmed(false);
    setWorkflowNotice("");
  }

  function openAddRole() {
    setNewRole({ company:"", roleTitle:"", location:"", sourceUrl:"", requirements:"" });
    setJobVariants([]); setJobImportMessage(""); setWorkspaceMessage(""); setShowAddRole(true);
  }

  function navigateTo(nextView:View, targetId:string) {
    if(nextView === "evidence" && view !== "evidence") setEvidenceReturnView(view);
    setView(nextView);
    window.setTimeout(() => document.getElementById(targetId)?.scrollIntoView({behavior:"smooth",block:"start"}), 80);
  }

  function goToView(nextView:View) {
    const targets:Record<View,string>={compare:"decision-view",evidence:"evidence-matrix",resume:"resume-workflow",workspace:"application-workspace"};
    navigateTo(nextView,targets[nextView]);
  }

  async function addTargetRole() {
    if (!newRole.company.trim() || !newRole.roleTitle.trim() || !newRole.sourceUrl.trim() || !newRole.requirements.trim()) { setWorkspaceMessage("请填写公司、岗位名称、官网岗位链接和岗位要求"); return; }
    setWorkspaceLoading(true); setWorkspaceMessage("");
    try {
      const response = await fetch("/api/workspace", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ action:"addTargetRole", ...newRole }) });
      const data = await response.json() as WorkspaceData & { error?:string; createdTargetRoleId?:string; deduplicated?:boolean; importMessage?:string };
      if (!response.ok) throw new Error(data.error ?? "新增岗位失败");
      setWorkspace(data); setRole(data.createdTargetRoleId ?? "emotion"); goToView("compare"); setPlanReady(false); setShowAddRole(false);
      setNewRole({ company:"", roleTitle:"", location:"", sourceUrl:"", requirements:"" });
      setWorkspaceMessage(data.importMessage ?? "目标岗位已加入导航，并已创建岗位分析与申请草稿");
    } catch (error) { setWorkspaceMessage(error instanceof Error ? error.message : "新增岗位失败"); }
    finally { setWorkspaceLoading(false); }
  }

  async function deleteSelectedJob(jobToDelete?:WorkspaceJob) {
    const targetJob = jobToDelete ?? selectedJob;
    if (!targetJob || !window.confirm(`确认删除“${targetJob.title}”吗？\n\n岗位会从导航和工作台移除，但申请、简历审核和操作历史会保留。`)) return;
    setWorkspaceLoading(true); setWorkspaceMessage("");
    try {
      const response = await fetch("/api/workspace", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ action:"deleteTargetRole", jobId:targetJob.id }) });
      const data = await response.json() as WorkspaceData & { error?:string };
      if (!response.ok) throw new Error(data.error ?? "删除岗位失败");
      setWorkspace(data); setSelectedJob(null); setPlanReady(false);
      const staticIds:Record<string,string>={"role-agent":"agent","role-writing":"writing","role-emotion":"emotion"};
      const next=data.targetRoles.find(item=>item.active); if(next) setRole(staticIds[next.id] ?? next.id); else setRole("emotion");
      setWorkspaceMessage("岗位已从目标列表移除；相关申请、简历版本和审核历史仍然保留。");
    } catch(error) { setWorkspaceMessage(error instanceof Error ? error.message : "删除岗位失败"); }
    finally { setWorkspaceLoading(false); }
  }

  function jobForRole(roleKey:string) {
    const targetRoleId = roleKey === "agent" ? "role-agent" : roleKey === "writing" ? "role-writing" : roleKey === "emotion" ? "role-emotion" : roleKey;
    return workspace?.jobs.find(item => { try { return (JSON.parse(item.description) as {targetRoleId?:string}).targetRoleId === targetRoleId; } catch { return item.externalId === targetRoleId; } });
  }

  function companyForRole(roleKey:string) {
    return jobForRole(roleKey)?.company || "DeepSeek";
  }

  function openRoleContextMenu(event:ReactMouseEvent, roleKey:string) {
    const linkedJob=jobForRole(roleKey); if(!linkedJob)return;
    event.preventDefault(); event.stopPropagation();
    setRoleContextMenu({x:Math.min(event.clientX,window.innerWidth-210),y:Math.min(event.clientY,window.innerHeight-170),job:linkedJob});
  }

  async function batchDeleteJobs() {
    const ids=[...selectedJobIds]; if(!ids.length){setWorkspaceMessage("请先勾选要删除的岗位");return;}
    if(!window.confirm("确认将已选中的 "+ids.length+" 个岗位移入回收站吗？\n\n相关申请、简历版本和审核历史会继续保留。"))return;
    await workspaceAction({action:"batchDeleteTargetRoles",jobIds:ids},"已将 "+ids.length+" 个岗位移入回收站，可在 30 天内恢复");
    setSelectedJobIds(new Set()); setPlanReady(false);
  }

  async function importJobFromUrl() {
    if (!newRole.sourceUrl.trim()) { setJobImportMessage("请先粘贴官网职位链接"); return; }
    setJobImporting(true); setJobImportMessage("");
    try {
      const response = await fetch("/api/job-import", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ url:newRole.sourceUrl }) });
      const responseText = await response.text();
      let data: Partial<typeof newRole> & { error?:string; warning?:string; readMode?:string; variants?:Array<{ company:string; roleTitle:string; location:string; requirements:string; sourceUrl:string }> };
      try { data = JSON.parse(responseText); }
      catch { throw new Error("职位读取服务返回了非结构化页面，请重试或在下方手工粘贴 JD"); }
      if (!response.ok) throw new Error(data.error ?? "读取岗位失败");
      setNewRole(currentRole => ({ ...currentRole, company:data.company || currentRole.company, roleTitle:data.roleTitle || currentRole.roleTitle, location:data.location || currentRole.location, requirements:data.requirements || currentRole.requirements, sourceUrl:data.sourceUrl || currentRole.sourceUrl }));
      setJobVariants(data.variants ?? []);
      setJobImportMessage(`已读取${data.readMode ?? "公开岗位信息"}，请核对后保存${data.warning ? `（实时读取提示：${data.warning}）` : ""}`);
    } catch (error) { setJobImportMessage(error instanceof Error ? error.message : "读取岗位失败，请手工粘贴 JD"); }
    finally { setJobImporting(false); }
  }

  async function refreshJobFromOfficialSite(item:WorkspaceJob){
    setWorkspaceLoading(true);setWorkspaceMessage("正在重新读取官网并更新岗位分析…");
    try{
      const imported=await fetch("/api/job-import",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({url:item.sourceUrl})});
      const data=await imported.json() as {error?:string;company?:string;roleTitle?:string;location?:string;requirements?:string;sourceUrl?:string;variants?:Array<{company:string;roleTitle:string;location:string;requirements:string;sourceUrl:string}>};
      if(!imported.ok)throw new Error(data.error??"官网岗位读取失败");
      if(data.variants?.length){setNewRole({company:data.company??item.company,roleTitle:data.roleTitle??item.title,location:data.location??item.location??"",requirements:data.requirements??"",sourceUrl:data.sourceUrl??item.sourceUrl});setJobVariants(data.variants);setShowAddRole(true);setSelectedJob(null);setWorkspaceMessage("该页面包含多个方向，请选择后更新原岗位。");return;}
      if(!data.company||!data.roleTitle||!data.requirements)throw new Error("官网返回字段不完整，请打开编辑窗口手工核对");
      const saved=await fetch("/api/workspace",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action:"addTargetRole",company:data.company,roleTitle:data.roleTitle,location:data.location??"",requirements:data.requirements,sourceUrl:data.sourceUrl??item.sourceUrl})});
      const snapshot=await saved.json() as WorkspaceData&{error?:string;importMessage?:string};if(!saved.ok)throw new Error(snapshot.error??"岗位更新失败");setWorkspace(snapshot);setSelectedJob(null);setWorkspaceMessage(snapshot.importMessage??"官网岗位与匹配分析已更新");
    }catch(error){setWorkspaceMessage(error instanceof Error?error.message:"官网岗位更新失败");}
    finally{setWorkspaceLoading(false);}
  }
  async function openResumePair() {
    if (modelProvider !== "local" && !modelApiKey.trim()) { setReviewMessage(`请先在顶部“模型设置”中配置${modelProvider === "openai" ? "OpenAI" : "DeepSeek"} API Key，或切换为本地证据引擎`); setShowModelSettings(true); return; }
    setReviewSaving(true); setReviewMessage("");
    try {
      const goalFeedback = `${regenerateFeedback}\n岗位匹配度目标：${targetMatchScore} 分；当前证据支持度：${current.score} 分。不得为了达到目标编造事实；差额必须列为待补证据。`;
      const response = await fetch("/api/workspace", { method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({ action:"generateResumePair", roleKey:role, roleTitleOverride:current.title, template:resumeTemplate, feedback:goalFeedback, targetMatchScore, evidenceCeiling:current.score, reviewActions:Object.fromEntries(activeDiffs.map(item => [item.id, actionFor(item)])), provider:modelProvider, apiKey:modelProvider === "local" ? "" : modelApiKey }) });
      const data = await response.json() as WorkspaceData & { error?:string; generatedPair?:Array<{ id:string; version:number; strategy:"balanced"|"transition"; content:GeneratedContent }> };
      if (!response.ok) throw new Error(data.error ?? "生成双版本失败");
      setWorkspace(data); setGeneratedPair(data.generatedPair ?? null); setShowResumePreview(true);
    } catch (error) { setReviewMessage(error instanceof Error ? error.message : "生成双版本失败"); }
    finally { setReviewSaving(false); }
  }

  function updateReview(id: string, action: ReviewAction) {
    setReviewActions(currentActions => ({ ...currentActions, [id]: action }));
    setReviewConfirmed(false);
  }

  async function uploadResume() {
    if (!uploadFile) { setUploadMessage("请先选择 PDF 或 DOCX 简历"); return; }
    setUploading(true); setUploadMessage("");
    try {
      const form = new FormData(); form.append("resume", uploadFile);
      const response = await fetch("/api/resume-upload", { method: "POST", body: form });
      const data = await response.json() as { error?: string; message?: string };
      if (!response.ok) throw new Error(data.error ?? "上传失败");
      setUploadMessage(data.message ?? "上传成功"); setUploadFile(null); setShowUpload(false); goToView("evidence");
      setWorkflowNotice("原始简历已保存。请在证据补全页核对已有事实、补充数字和证明材料；系统不会未经确认直接覆盖证据库。");
    } catch (error) { setUploadMessage(error instanceof Error ? error.message : "上传失败"); }
    finally { setUploading(false); }
  }

  async function saveReview(action: "regenerateReview" | "confirmReview") {
    setReviewSaving(true); setReviewMessage("");
    try {
      const goalFeedback = `${regenerateFeedback}\n岗位匹配度目标：${targetMatchScore} 分；当前证据支持度：${current.score} 分。不得为了达到目标编造事实；差额必须列为待补证据。`;
      const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, roleKey: role, roleTitleOverride: current.title, strategy: strategy === "both" ? selectedVersion : strategy, template: resumeTemplate, feedback: goalFeedback, targetMatchScore, evidenceCeiling:current.score, reviewActions: Object.fromEntries(activeDiffs.map(item => [item.id, actionFor(item)])), provider: modelProvider, apiKey: action === "regenerateReview" ? modelApiKey : "" }) });
      const data = await response.json() as WorkspaceData & { error?: string; savedReview?: { id: string; version: number; status: string; content?: GeneratedContent } };
      if (!response.ok) throw new Error(data.error ?? "保存失败");
      setWorkspace(data); setReviewVersion(data.savedReview?.version ?? reviewVersion);
      if (data.savedReview?.content) setGeneratedReview({ id: data.savedReview.id, version: data.savedReview.version, content: data.savedReview.content });
      if (action === "regenerateReview") { setPlanReady(true); setReviewConfirmed(false); setShowRegenerate(false); setShowGeneratedPreview(!!data.savedReview?.content); setReviewMessage(`已使用${modelProvider === "openai" ? "ChatGPT" : modelProvider === "deepseek" ? "DeepSeek" : "本地证据引擎"}生成 v${data.savedReview?.version ?? reviewVersion + 1}`); }
      else { setReviewConfirmed(true); setReviewMessage(`v${data.savedReview?.version ?? reviewVersion} 已锁定，可以下载或进入投递工作台`); }
    } catch (error) { setReviewMessage(error instanceof Error ? error.message : "保存失败"); }
    finally { setReviewSaving(false); }
  }

  async function addExperience() {
    if (!newExperience.company || !newExperience.roleTitle || !newExperience.dates || !newExperience.responsibility) { setReviewMessage("请填写公司、岗位、时间和主要经历"); return; }
    setReviewSaving(true); setReviewMessage("");
    try {
      const response = await fetch("/api/workspace", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "addEvidence", ...newExperience }) });
      const data = await response.json() as WorkspaceData & { error?: string; createdEvidenceId?: string };
      if (!response.ok) throw new Error(data.error ?? "新增失败");
      setWorkspace(data); setShowAddEvidence(false); setNewExperience({ company: "", roleTitle: "", dates: "", responsibility: "", result: "", source: "", confidence: "self_reported" });
      setReviewMessage(`${data.createdEvidenceId ?? "新证据"} 已进入统一证据库；重新生成后才会影响简历`);
      setWorkflowNotice(`${data.createdEvidenceId ?? "新证据"} 已保存。下一步请重新查看岗位匹配度，确认缺口是否缩小，再生成新版简历。`);
    } catch (error) { setReviewMessage(error instanceof Error ? error.message : "新增失败"); }
    finally { setReviewSaving(false); }
  }

  async function saveEditedEvidence(){if(!editingEvidenceId||!editingEvidence.claim.trim()){setWorkspaceMessage("请填写完整的经历事实");return;}await workspaceAction({action:"updateEvidence",id:editingEvidenceId,claim:editingEvidence.claim,source:editingEvidence.source,confidence:editingEvidence.confidence},`${editingEvidenceId} 已更新`);setShowAddEvidence(false);setEditingEvidenceId(null);}

  return (
    <main className="product" style={{ "--accent": current.accent } as React.CSSProperties}>
      <header className="appHeader">
        <a className="brand" href="#top"><span className="brandMark">J</span><span>JobCraft</span><small>求职决策系统</small></a>
        <nav className="mainNav" aria-label="产品功能">
          {views.map(([key, label]) => <button key={key} className={view === key ? "active" : ""} onClick={() => navigateTo(key,key === "compare" ? "decision-view" : key === "evidence" ? "evidence-matrix" : key === "resume" ? "resume-workflow" : "application-workspace")}>{label}</button>)}
        </nav>
        <div className="headerActions"><button className="uploadEntry" onClick={() => setShowModelSettings(true)}>模型设置</button><button className="uploadEntry" onClick={() => setShowCandidateProfile(true)}>个人投递资料</button><button className="uploadEntry" onClick={() => {setShowPhotoUpload(true);setPhotoMessage("");setPhotoFile(null);}}>上传形象照</button><button className="uploadEntry" onClick={() => { setShowUpload(true); setUploadMessage(""); }}>上传简历</button><div className="privacy"><i /> 私有系统 · 联系方式已隐藏</div></div>
      </header>

      <section className="appHero" id="top">
        <div>
          <span className="overline">DEEPSEEK APPLICATION CASE · 2026</span>
          <h1>一份真实履历，<br /><em>适配每一个目标岗位。</em></h1>
        </div>
        <div className="heroIntro">
          <p>系统不替候选人“编故事”。它把岗位要求逐项映射到真实证据，暴露缺口，再决定简历该说什么、不该说什么。</p>
          <div className="datasetStats"><button onClick={() => navigateTo("evidence","evidence-matrix")} aria-label="查看和补充事实证据"><b>{workspace?.evidence.length || 20}</b><span>事实证据</span><small>查看与补充 →</small></button><button onClick={() => navigateTo("compare","target-role-navigation")} aria-label="查看当前目标岗位"><b>{workspace?.targetRoles.filter(item=>item.active).length || Object.keys(dynamicRoles).length}</b><span>当前目标岗位</span><small>选择岗位 →</small></button><button onClick={() => navigateTo("workspace","unverified-evidence-center")} aria-label="查看待验证证据"><b>{String(workspace?.evidence.filter(item => item.confidence === "unverified").length ?? 1).padStart(2,"0")}</b><span>待验证证据</span><small>前往核验 →</small></button></div>
        </div>
      </section>

      {workflowNotice && <section className="workflowNotice" aria-live="polite"><div><b>下一步已准备</b><span>{workflowNotice}</span></div><div><button onClick={() => { goToView("compare"); setWorkflowNotice(""); }}>查看岗位匹配</button><button className="primaryAction" onClick={() => { goToView("resume"); setPlanReady(false); setWorkflowNotice(""); }}>生成并审核简历 →</button></div></section>}
      {workspaceMessage && !showAddRole && view !== "workspace" && <section className={`systemNotice ${workspaceMessage.includes("检测到同一岗位") ? "dedupeNotice" : ""}`} aria-live="polite"><div><b>{workspaceMessage.includes("检测到同一岗位") ? "重复岗位已合并" : "操作已完成"}</b><span>{workspaceMessage}</span></div><button onClick={() => setWorkspaceMessage("")} aria-label="关闭提示">×</button></section>}

      <section className="roleBar" id="target-role-navigation" aria-label="选择目标岗位">
        {roleGroups.map(([company,keys],groupIndex) => <div className="roleCompanyGroup" key={company}><div className="roleCompanyLabel"><span>COMPANY {String(groupIndex + 1).padStart(2,"0")}</span><b>{company}</b><em>{keys.length} 个目标岗位 · 录入时间由早到晚</em></div>{keys.map((key,roleIndex) => {
          return <button key={key} className={role === key ? "active" : ""} onClick={() => selectRole(key)} onDoubleClick={() => {selectRole(key);navigateTo("evidence","evidence-matrix")}} onContextMenu={event=>openRoleContextMenu(event,key)} title="单击切换岗位；双击进入证据核对；右键查看更多操作">
            <span>{String(roleIndex + 1).padStart(2,"0")}</span><div><small>第 {roleIndex + 1} 个录入</small><b>{dynamicRoles[key].short}</b><em className={"roleStatus "+jobStatusMeta(jobForRole(key)).status}>{jobStatusMeta(jobForRole(key)).label}</em></div><strong>{dynamicRoles[key].score}</strong>
          </button>})}</div>)}
        <button className="addRoleButton" onClick={openAddRole}><span>＋</span><div><small>DATABASE DRIVEN</small><b>新增目标岗位</b></div><strong>→</strong></button>
      </section>
      <div className="roleBarHint">单击切换岗位 · 双击进入证据核对 · 右键可查看、打开官网或删除</div>
      {roleContextMenu&&<div className="roleContextMenu" role="menu" style={{left:roleContextMenu.x,top:roleContextMenu.y}} onClick={event=>event.stopPropagation()}><b>{displayRoleTitle(roleContextMenu.job.title,roleContextMenu.job.company)}</b><button role="menuitem" onClick={()=>{setSelectedJob(roleContextMenu.job);setRoleContextMenu(null)}}>查看岗位明细</button><a role="menuitem" href={roleContextMenu.job.sourceUrl} target="_blank" rel="noreferrer" onClick={()=>setRoleContextMenu(null)}>打开招聘官网 ↗</a><button role="menuitem" className="danger" onClick={()=>{const item=roleContextMenu.job;setRoleContextMenu(null);void deleteSelectedJob(item)}}>删除岗位</button></div>}

      <section className="flowNavigation" aria-label="当前任务导航">
        <div><span>当前步骤 · {view === "compare" ? "岗位判断" : view === "evidence" ? "证据补全" : view === "resume" ? "简历审核" : "投递工作台"}</span><b>{companyForRole(role)} · {current.short}</b></div>
        <div>
          {view === "compare" ? <button onClick={() => document.getElementById("top")?.scrollIntoView({behavior:"smooth"})}>↑ 返回首页概览</button> : <button onClick={() => goToView(view === "evidence" ? evidenceReturnView : view === "resume" ? "evidence" : "resume")}>← 返回{view === "evidence" ? evidenceReturnView === "workspace" ? "投递工作台" : evidenceReturnView === "resume" ? "简历审核" : "岗位判断" : view === "resume" ? "证据补全" : "简历审核"}</button>}
          {view !== "workspace" && <button className="flowNext" onClick={() => goToView(view === "compare" ? "evidence" : view === "evidence" ? "resume" : "workspace")}>下一步：{view === "compare" ? "核对证据" : view === "evidence" ? "生成简历" : "准备投递"} →</button>}
        </div>
      </section>
      {view === "compare" && (
        <section className="decisionView" id="decision-view">
          <article className="missionPanel">
            <span className="panelLabel">岗位核心使命</span>
            <h2>{current.title}</h2>
            <div className="missionScroll"><p>{current.mission}</p></div>
            <div className="scoreBlock"><strong>{current.score}</strong><div><b>/ 100</b><span>{current.verdict}</span></div></div>
            <div className="meter"><i style={{ width: `${current.score}%` }} /></div>
            <small className="scoreNote">基于现有简历明示证据的保守初筛，不代表录用概率。</small>
          </article>

          <article className="evidencePanel">
            <div className="diagnosticPanelHead"><div><i>✓</i><span><b>最强匹配证据</b><small>简历中建议优先保留并前置</small></span></div><strong>{verifiedCount} / {current.matched.length} 可用</strong></div>
            <div className="evidenceDiagnosticSummary"><b>{directEvidenceCount} 条直接证据</b><span>{transferableEvidenceCount > 0 ? `另有 ${transferableEvidenceCount} 条经历需要转译成岗位语言` : "核心证据与岗位要求直接相关"}</span></div>
            <div className="evidenceList diagnosticList">
              {current.matched.map(([id, claim, status]) => (
                <button key={id} onClick={() => navigateTo("evidence","evidence-matrix")}>
                  <em className={status === "待验证" ? "severity urgent" : String(status).startsWith("可迁移") ? "severity normal" : "severity important"}>{status === "待验证" ? "待核验" : String(status).startsWith("可迁移") ? "可迁移" : "强匹配"}</em><span><b>{claim}</b><small>{id} · {status}</small></span><i>查看 →</i>
                </button>
              ))}
            </div>
            <button className="diagnosticPrimaryAction" onClick={() => navigateTo("evidence","evidence-matrix")}>查看并核对全部证据 →</button>
          </article>

          <article className="gapPanel">
            <div className="diagnosticPanelHead gapDiagnosticHead"><div><i>!</i><span><b>证据覆盖情况</b><small>按风险优先级处理后再生成简历</small></span></div><strong>{current.gaps.length + strengtheningItems.length} 项需处理</strong></div>
            <div className="coverageDiagnosis"><strong>{current.score}</strong><div><b>{current.gaps.length === 0 ? "没有硬缺口，但并非完全匹配" : `存在 ${current.gaps.length} 项硬缺口`}</b><span>{strengtheningItems.length > 0 ? `还有 ${strengtheningItems.length} 项证据不够直接，建议补充场景、数字或作品。` : "现有证据已覆盖核心要求，投递前仍需核验真实性。"}</span></div></div>
            <div className="coverageLegend" aria-label="证据覆盖分类"><span className="covered"><b>{directEvidenceCount}</b>充分覆盖</span><span className="transferable"><b>{transferableEvidenceCount}</b>可迁移证据</span><span className="strengthen"><b>{strengtheningItems.length}</b>待强化</span><span className="hardGap"><b>{current.gaps.length}</b>硬缺口</span></div>
            <div className="gapProgress"><span><i style={{width:`${current.score}%`}} /></span><small>现有证据保守支持约 {current.score} 分；0 项硬缺口不等于完全匹配，弱证据仍需强化</small></div>
            {strengtheningItems.length > 0 && <><h3 className="coverageSectionTitle">优先处理</h3><ol className="gapActionList strengtheningList">{strengtheningItems.map((gap) => <li key={gap}><em className="severity important">重要</em><div><b>{gap}</b><small>已有相关经历 · 需要更直接的场景、量化结果或作品</small></div><button onClick={() => openGapEvidence(gap)}>去强化</button></li>)}</ol></>}
            {current.gaps.length > 0 && <><h3 className="coverageSectionTitle">必须补齐</h3><ol className="gapActionList">{current.gaps.map((gap) => <li key={gap}><em className="severity urgent">紧急</em><div><b>{gap}</b><small>不能靠改写解决 · 必须补充真实事实或作品</small></div><button onClick={() => openGapEvidence(gap)}>补充证据</button></li>)}</ol></>}
            {strengtheningItems.length === 0 && current.gaps.length === 0 && <div className="coverageComplete"><b>核心要求已被直接证据覆盖</b><p>仍建议在投递前核验链接、数据口径和敏感信息。</p></div>}
            <div className="guardrail compact"><b>事实护栏已开启</b><p>待验证内容可用于准备，但不会写成已经完成的成果。</p></div>
          </article>
        </section>
      )}

      {view === "evidence" && (
        <section className="matrixView" id="evidence-matrix">
          <div className="viewHeading"><div><span className="panelLabel">EVIDENCE MATRIX</span><h2>岗位要求如何落到真实经历</h2><p>已有事实可以直接修改补全；新事实会先提示同公司、同岗位或同时段的相似记录，避免重复堆叠。</p></div><div className="evidenceHeadingActions"><button onClick={openNewEvidence}>＋ 新增经历 / 证据</button><button className="primaryContinue" onClick={() => goToView("resume")}>继续生成简历计划 →</button></div></div>
          <div className="matrixHeader"><span>证据 ID</span><span>候选人事实</span><span>可信状态</span><span>简历使用规则</span></div>
          {current.matched.map(([id, claim, status]) => (
            <div className="matrixRow" key={id}><b>{id}</b><p>{claim}</p><span className={status === "待验证" ? "pendingPill" : "okPill"}>{status}</span><small>{status === "待验证" ? "仅作为待补作品，不写成已完成项目" : "可改写表达，不得扩大职责或结果"}<button className="inlineEditEvidence" onClick={()=>openEditEvidence(id)}>修改 / 补充</button></small></div>
          ))}
          <div className="matrixGap"><b>尚无证据</b><div>{current.gaps.map(x => <span key={x}>{x}</span>)}</div><small>这些能力不能从岗位描述反向推导。</small></div>
        </section>
      )}

      {view === "resume" && (
        <section className={`resumeView ${planReady ? "reviewing" : ""}`} id="resume-workflow">
          <div className="resumeBrief">
            <span className="panelLabel">ROLE-SPECIFIC RESUME</span>
            <h2>{current.title}</h2>
            <p>{current.narrative}</p>
            <div className="matchGoalControl">
              <div><span>岗位匹配度目标</span><b>{targetMatchScore} 分</b></div>
              <input aria-label="岗位匹配度目标" type="range" min="60" max="95" step="5" value={targetMatchScore} onChange={event => { setTargetMatchScore(Number(event.target.value)); setReviewConfirmed(false); }} />
              {targetMatchScore > current.score ? <div className="scoreGap"><b>当前证据支持上限约 {current.score} 分，还差 {targetMatchScore - current.score} 分</b><p>改写只能迁移和翻译已有经历，不能把表达优化当成新证据。请补充：{current.gaps.join("、")}。</p><button onClick={() => openGapEvidence(current.gaps[0])}>补充缺失证据 →</button></div> : <div className="scoreReady"><b>当前证据可支持这个目标</b><span>系统仍会保留证据 ID，不扩大职责或结果。</span></div>}
            </div>
            <div className="strategyPicker">
              <span>生成策略</span>
              <div>
                <button className={strategy === "balanced" ? "active" : ""} onClick={() => { setStrategy("balanced"); setPlanReady(false); }}><b>平衡版</b><small>正式投递 · 默认</small></button>
                <button className={strategy === "transition" ? "active" : ""} onClick={() => { setStrategy("transition"); setPlanReady(false); }}><b>强转型版</b><small>突出AI迁移能力</small></button>
                <button className={strategy === "both" ? "active" : ""} onClick={() => { setStrategy("both"); setPlanReady(false); }}><b>双版本</b><small>生成后对比</small></button>
              </div>
              <p>{strategy === "balanced" ? "保留职业连续性和关键业务成绩，用自然语言说明可迁移能力。" : strategy === "transition" ? "压缩弱相关执行细节，前置情感场景、Badcase和AI实践。" : "基于同一证据库生成两版，并逐项展示保留、改写与压缩差异。"}</p>
            </div>
            <div className="templatePicker"><div className="templateTitle"><span>简历模板</span><em>只改变字体、颜色、层级与排版，不改变工作经历内容</em></div><div><button className={resumeTemplate === "ats" ? "active" : ""} onClick={() => setResumeTemplate("ats")}><i className="templateThumb atsThumb"><u/><u/><u/></i><b>ATS 标准版</b><small>黑白单栏 · 官网网申</small></button><button className={resumeTemplate === "product" ? "active" : ""} onClick={() => setResumeTemplate("product")}><i className="templateThumb productThumb"><u/><u/><u/></i><b>产品运营版</b><small>紫色标题 · 数字突出</small></button><button className={resumeTemplate === "portfolio" ? "active" : ""} onClick={() => setResumeTemplate("portfolio")}><i className="templateThumb portfolioThumb"><u/><u/><u/></i><b>面试作品版</b><small>青色侧栏 · 展示感更强</small></button></div><p><b>内容由岗位、证据、平衡/强转型策略和所选模型决定；模板只负责视觉。</b>{resumeTemplate === "ats" ? " 当前为单栏克制设计，优先保证招聘系统解析。" : resumeTemplate === "product" ? " 当前强化关键数字和成果层级，适合内推与直接发送 HR。" : " 当前增加视觉识别与项目表达，适合面试展示；正式网申仍建议 ATS 版。"} 切换后请重新生成新版 PDF。</p></div>
            <div className="resumeActions">
              <button className="primaryAction" onClick={() => { setPlanReady(true); setReviewConfirmed(false); }}>{planReady ? "差异已生成 ✓" : "生成简历差异"}</button>
              <button onClick={() => goToView("evidence")}>返回证据矩阵</button>
            </div>
          </div>
          <div className={`planSheet ${planReady ? "ready compareReady" : ""}`}>
            {!planReady ? <div className="emptyPlan"><span>生成前预览</span><h3>这里将出现逐条差异，不是空白简历</h3><p>点击左侧“生成简历差异”后，你会依次看到证据来源、平衡版写法、强转型版写法和你的决定。</p><ol><li><b>01</b>核对证据</li><li><b>02</b>比较两种表达</li><li><b>03</b>保留、改写或压缩</li></ol></div> : <>
              <div className="compareHeader">
                <div><span>RESUME DIFF · V0.2</span><h3>{current.short}简历差异审核</h3></div>
                <div className="compareTools">
                  <div className="reviewStats">{(["keep","rewrite","compress"] as ReviewAction[]).map(action => <span key={action}><b>{activeDiffs.filter(item => actionFor(item) === action).length}</b>{actionLabels[action]}</span>)}</div>
                  {activeDiffs.length > 0 && <button className="openResumeCompare" onClick={openResumePair} disabled={reviewSaving}>{reviewSaving ? "正在生成两版…" : "生成、查看并下载"} <span>↗</span></button>}
                </div>
              </div>
              <div className="diffList">
                {activeDiffs.length === 0 && <div className="diffUnavailable"><b>该岗位的双版本差异尚未生成</b><p>当前可完整演示的是“情感智能数据产品经理”。系统不会套用另一岗位的比较结果。</p></div>}
                {activeDiffs.map(item => <article className={`diffItem action-${actionFor(item)}`} key={item.id}>
                  <div className="diffSource"><em>证据来源</em><b>{item.id}</b><strong>{item.section}</strong><div className="diffEvidenceRefs">{item.evidence.split(/\s*[·路]\s*/).map(id=>{const found=workspace?.evidence.find(x=>x.id===id);return <button key={id} className={found?`evidenceRef ${found.confidence}`:"evidenceRef missing"} onClick={()=>found?openEditEvidence(id):openNewEvidence()} title={found?.claim??"证据库中尚无此记录"}>{id}<i>{found?(found.confidence==="verified"?"已验证":found.confidence==="self_reported"?"已补充":"待验证"):"未补充"}</i></button>})}</div><button onClick={openNewEvidence}>＋ 新增证据</button></div>
                  <div className="draftCopy"><em>平衡版</em><p>{item.balanced}</p></div>
                  <div className="draftCopy"><em>强转型版</em><p>{item.transition}</p></div>
                  <div className="decisionCell">
                    <em>你的决定</em>
                    <div>{(["keep","rewrite","compress"] as ReviewAction[]).map(action => <button key={action} className={actionFor(item) === action ? "active" : ""} onClick={() => updateReview(item.id, action)} aria-pressed={actionFor(item) === action}>{actionLabels[action]}</button>)}</div>
                    <small>{item.note}</small>
                  </div>
                </article>)}
              </div>
              {activeDiffs.length > 0 && <div className="finalGate">
                <div><span>正式投递候选 · 当前 v{reviewVersion}</span><div className="versionChoice"><button className={selectedVersion === "balanced" ? "active" : ""} onClick={() => { setSelectedVersion("balanced"); setReviewConfirmed(false); }}>平衡版</button><button className={selectedVersion === "transition" ? "active" : ""} onClick={() => { setSelectedVersion("transition"); setReviewConfirmed(false); }}>强转型版</button></div></div>
                <div className="gateCopy"><b>{reviewConfirmed ? `已锁定：${selectedVersion === "balanced" ? "平衡版" : "强转型版"} v${reviewVersion}` : "确认后保存本轮审核决定，不会自动投递"}</b><small>{reviewMessage || "薪资、个人声明和最终提交仍必须由本人确认。"}</small></div>
                <div className="gateActions"><button onClick={() => setShowRegenerate(true)}>不满意，重新生成</button><button className="confirmReview" onClick={() => saveReview("confirmReview")} disabled={reviewSaving}>{reviewSaving ? "保存中…" : reviewConfirmed ? "本轮已确认 ✓" : "确认审核结果"}</button></div>
              </div>}
              {reviewConfirmed && <div className="reviewNext"><div><b>审核完成，下一步</b><span>下载最终简历，或创建岗位申请草稿继续准备投递。</span></div><button onClick={() => setShowResumePreview(true)}>查看并下载简历</button><button onClick={() => goToView("workspace")}>进入投递工作台 →</button></div>}
              {generatedReview && <div className="generatedResult"><div><span>GENERATED RESUME</span><b>v{generatedReview.version} 已生成实际正文</b><small>每条内容均保留证据 ID 映射，可预览并下载该版本 PDF。</small></div><button onClick={() => setShowGeneratedPreview(true)}>查看生成结果</button><a href={`/api/generated-resume/${generatedReview.id}`}>下载 v{generatedReview.version} PDF ↓</a></div>}
              {(workspace?.reviews?.length ?? 0) > 0 && <div className="versionHistory"><span>版本历史</span>{workspace!.reviews.filter(item => item.roleKey === role).slice(0,5).map(item => <button key={item.id} onClick={() => { setReviewVersion(item.version); setSelectedVersion(item.strategy === "transition" ? "transition" : "balanced"); setResumeTemplate(item.template ?? "ats"); setRegenerateFeedback(item.feedback ?? ""); setReviewConfirmed(item.status === "confirmed"); if (item.contentJson) { setGeneratedReview({ id:item.id, version:item.version, content:JSON.parse(item.contentJson) as GeneratedContent }); setShowGeneratedPreview(true); } }}>{`v${item.version} · ${item.status === "confirmed" ? "已确认" : "草稿"}`}</button>)}</div>}
            </>}
          </div>
        </section>
      )}

      {view === "workspace" && <section className="workspaceView" id="application-workspace">
        <div className="workspaceHeading">
          <div><span className="panelLabel">DURABLE APPLICATION WORKSPACE</span><h2>真实数据工作台</h2><p>岗位、证据和申请草稿保存在数据库中。创建申请只进入简历审核，不会打开或提交招聘表。</p></div>
          <div><button className="syncStatusButton" onClick={()=>syncJobStatuses(true)} disabled={statusSyncing}>{statusSyncing?"正在核验官网…":"同步招聘状态"}</button><a className="extensionDownload" href="/jobcraft-autofill-extension.zip" download>下载自动填表助手</a><button onClick={() => setShowTrash(true)}>回收站{workspace?.trash?.length ? `（${workspace.trash.length}）` : ""}</button><button onClick={openNewEvidence}>＋ 新增经历/证据</button><button onClick={() => workspaceAction({ action: "seed" }, "DeepSeek 岗位与候选人证据已写入数据库")} disabled={workspaceLoading}>{workspaceLoading ? "处理中…" : workspace?.jobs.length ? "重新核对基础数据" : "初始化真实数据"}</button><button onClick={() => loadWorkspace()} disabled={workspaceLoading}>刷新</button></div>
        </div>
        {workspaceMessage && <div className="workspaceNotice">{workspaceMessage}</div>}
        {!workspace?.jobs.length ? <div className="workspaceEmpty"><b>数据库尚未初始化</b><p>点击“初始化真实数据”，将已核验的候选人证据和 DeepSeek 官网岗位写入 D1。</p></div> : <>
          <div className="workspaceStats"><span><b>{workspace.jobs.length}</b>官网岗位</span><span><b>{workspace.evidence.length}</b>证据记录</span><span><b>{workspace.applications.length}</b>申请记录</span><span><b>{workspace.applications.filter(item=>item.status==="submitted").length}</b>已完成投递</span></div>
          <div className="workspaceGrid">
            <div className="jobsPanel"><div className="workspacePanelHead jobPoolHead"><div><span>官网岗位池</span><small>勾选后可批量移入回收站</small></div><div><label><input type="checkbox" checked={workspace.jobs.length>0&&selectedJobIds.size===workspace.jobs.length} onChange={event=>setSelectedJobIds(event.target.checked?new Set(workspace.jobs.map(item=>item.id)):new Set())}/> 全选</label><button className="batchDeleteButton" disabled={!selectedJobIds.size||workspaceLoading} onClick={batchDeleteJobs}>批量删除{selectedJobIds.size?"（"+selectedJobIds.size+"）":""}</button></div></div>
              {workspace.jobs.map(item => { const meta = JSON.parse(item.description) as { score:number; decision:string; category:string; targetRoleId?:string; requirements?:string; jobStatus?:"open"|"closed"|"unknown"; statusCheckedAt?:string; statusMessage?:string }; return <article className="workspaceJob" key={item.id}>
                <label className="jobSelect"><input type="checkbox" aria-label={"选择"+displayRoleTitle(item.title,item.company)} checked={selectedJobIds.has(item.id)} onChange={event=>setSelectedJobIds(current=>{const next=new Set(current);if(event.target.checked)next.add(item.id);else next.delete(item.id);return next})}/></label><div><span>{meta.category === "technical" ? "自动排除" : meta.decision === "priority" ? "优先投递" : "继续评估"}</span><h3>{displayRoleTitle(item.title,item.company)}</h3><small>{item.location} · 匹配 {meta.score}</small><em className={"jobAvailability "+(meta.jobStatus??"unknown")} title={meta.statusMessage??"尚未完成官网核验"}>{meta.jobStatus==="open"?"官网在招":meta.jobStatus==="closed"?"已下线":"待人工确认"}{meta.statusCheckedAt?" · "+new Date(meta.statusCheckedAt).toLocaleDateString("zh-CN"):""}</em></div>
                <div className="jobActions"><button onClick={() => setSelectedJob(item)}>查看岗位明细</button><a href={item.sourceUrl} target="_blank" rel="noreferrer">查看官网</a>{meta.category !== "technical" && <button disabled={meta.jobStatus==="closed"} title={meta.jobStatus==="closed"?"岗位已下线，不能继续准备":undefined} onClick={() => createApplicationDraft(item,meta.targetRoleId || (item.title.includes("情感") ? "role-emotion" : item.title.includes("创作") ? "role-writing" : "role-agent"))}>{meta.jobStatus==="closed"?"岗位已失效":"开始申请准备 →"}</button>}<button className="deleteJobButton" onClick={() => deleteSelectedJob(item)}>删除</button></div>
              </article>})}
            </div>
            <div className="evidenceCenter" id="unverified-evidence-center"><div className="workspacePanelHead"><span>证据补全中心</span><small>修改后持久保存</small></div>
              {workspace.evidence.map(item => <article className="workspaceEvidence" key={item.id}>
                <div className="evidenceMeta"><b>{item.id}</b><select value={item.confidence} onChange={event => workspaceAction({ action: "updateEvidence", id: item.id, claim: evidenceDrafts[item.id]?.claim ?? item.claim, source: evidenceDrafts[item.id]?.source ?? item.source, confidence: event.target.value }, "证据可信状态已更新")}><option value="unverified">待验证</option><option value="self_reported">本人陈述</option><option value="verified">已验证</option></select></div>
                <textarea value={evidenceDrafts[item.id]?.claim ?? item.claim} onChange={event => setEvidenceDrafts(drafts => ({ ...drafts, [item.id]: { claim: event.target.value, source: drafts[item.id]?.source ?? item.source ?? "" } }))} />
                <input aria-label={`${item.id}来源说明`} value={evidenceDrafts[item.id]?.source ?? item.source ?? ""} placeholder="填写来源、作品链接或核验说明" onChange={event => setEvidenceDrafts(drafts => ({ ...drafts, [item.id]: { claim: drafts[item.id]?.claim ?? item.claim, source: event.target.value } }))} />
                <button onClick={() => workspaceAction({ action: "updateEvidence", id: item.id, claim: evidenceDrafts[item.id]?.claim ?? item.claim, source: evidenceDrafts[item.id]?.source ?? item.source, confidence: item.confidence }, `${item.id} 已保存`)}>保存证据</button>
              </article>)}
            </div>
          </div>
          {workspace.applications.length>0&&<div className="applicationPipeline"><div className="workspacePanelHead"><span>申请与投递准备</span><small>岗位 → 已确认简历 → 投递包 → 官网人工终审</small></div>{workspace.applications.map(item=>{const linkedJob=[...workspace.jobs,...workspace.trash].find(job=>job.id===item.jobId);const roleKey=item.targetRoleId==="role-emotion"?"emotion":item.targetRoleId==="role-writing"?"writing":item.targetRoleId==="role-agent"?"agent":item.targetRoleId;const confirmed=workspace.reviews.some(review=>review.roleKey===roleKey&&review.status==="confirmed");let state:ApplicationDecision={};try{const raw=item.decisionJson?JSON.parse(item.decisionJson) as InterviewKit|ApplicationDecision:null;if(raw&&"intro30" in raw)state={interviewKit:raw};else state=raw??{}}catch{}const saved=state.interviewKit;const prepared=state.submissionPackage;return <article key={item.id}><div><b>{linkedJob?displayRoleTitle(linkedJob.title,linkedJob.company):item.jobId}</b><span>申请 ID：{item.id.slice(0,8)} · {workspace.trash.some(job=>job.id===item.jobId)?"岗位已在回收站":item.status==="submitted"?"已确认完成官网投递":prepared?`投递包已锁定简历 v${prepared.resumeVersion}`:confirmed?"简历已确认":"等待简历审核"}</span></div><div className="pipelineActions"><select aria-label="更新求职进度" value={item.status} onChange={event=>updateApplicationStage(item.id,event.target.value)}><option value="role_analysis">岗位分析</option><option value="resume_review">简历准备</option><option value="application_preflight">投递准备</option><option value="submitted">已投递</option><option value="written_test">笔试</option><option value="interview_ready">面试准备</option><option value="interview">面试</option><option value="offer">Offer</option><option value="rejected">未通过</option><option value="withdrawn">已撤回</option></select>{item.status==="submitted"?<button onClick={()=>prepared&&(setSubmissionPackage(prepared),setShowSubmissionPackage(true))}>查看投递记录</button>:!confirmed?<button onClick={()=>{setRole(roleKey);setView("resume");setPlanReady(false);window.setTimeout(()=>document.getElementById("resume-workflow")?.scrollIntoView({behavior:"smooth",block:"start"}),80)}}>先生成并确认简历 →</button>:<><button className="primaryPipeline" onClick={()=>prepared?(setSubmissionPackage(prepared),setPreflightChecks({contact:false,resume:false,sensitive:false,noAutoSubmit:false}),setShowSubmissionPackage(true)):prepareApplication(item.id)} disabled={workspaceLoading||workspace.trash.some(job=>job.id===item.jobId)}>{prepared?"继续投递准备":"一键准备投递 →"}</button><button onClick={()=>saved?(setInterviewKit(saved),setShowInterviewKit(true)):generateInterviewKit(item.id)} disabled={workspaceLoading}>{saved?"查看面试准备":"生成面试准备"}</button></>}</div></article>})}</div>}
        </>}
      </section>}

      {showTrash && <div className="resumeModal" role="dialog" aria-modal="true" aria-labelledby="trash-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowTrash(false)}}><section className="trashPanel"><header><div><span>RECYCLE BIN · 30 DAYS</span><h2 id="trash-title">岗位回收站</h2><p>删除后的岗位保留 30 天，可随时恢复；到期后自动清理。</p></div><button className="closeModal" onClick={()=>setShowTrash(false)}>×</button></header><div className="trashList">{!workspace?.trash?.length?<div className="trashEmpty">回收站是空的</div>:workspace.trash.map(item=>{let archivedAt="";try{archivedAt=JSON.parse(item.description).archivedAt??""}catch{}const left=Math.max(0,30-Math.floor((Date.now()-new Date(archivedAt).getTime())/86400000));return <article key={item.id}><div><b>{displayRoleTitle(item.title,item.company)}</b><span>{item.company} · {item.location||"地点待确认"}</span><small>剩余 {left} 天自动清理</small></div><button onClick={()=>trashAction("restoreTargetRole",item)}>恢复岗位</button><button className="danger" onClick={()=>trashAction("permanentlyDeleteTargetRole",item)}>永久删除</button></article>})}</div></section></div>}

      {showInterviewKit&&interviewKit&&<div className="resumeModal" role="dialog" aria-modal="true" aria-labelledby="interview-kit-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowInterviewKit(false)}}><section className="interviewKitPanel"><header><div><span>PM INTERVIEW RESCUE</span><h2 id="interview-kit-title">{interviewKit.roleTitle} · 面试准备包</h2><p>{interviewKit.company} · 申请 ID {interviewKit.applicationId.slice(0,8)}</p></div><button className="closeModal" onClick={()=>setShowInterviewKit(false)}>×</button></header><div className="interviewKitBody"><section><h3>候选人定位</h3><p>{interviewKit.positioning}</p></section><section><h3>三个叙事支柱</h3>{interviewKit.pillars.map(item=><p key={item.evidenceId}><b>{item.evidenceId}</b>{item.title}</p>)}</section><section><h3>30 秒自我介绍</h3><p>{interviewKit.intro30}</p></section><section><h3>90 秒自我介绍</h3><p>{interviewKit.intro90}</p></section><section><h3>高频问题</h3><ol>{interviewKit.questions.map(x=><li key={x}>{x}</li>)}</ol></section><section><h3>Case 拆解框架</h3><ol>{interviewKit.caseFramework.map(x=><li key={x}>{x}</li>)}</ol></section><section><h3>风险题与事实边界</h3>{interviewKit.riskQuestions.length?interviewKit.riskQuestions.map(x=><p key={x.evidenceId}><b>{x.evidenceId}</b>{x.question}</p>):<p>当前没有待验证证据进入核心叙事。</p>}</section><section><h3>反问面试官</h3><ol>{interviewKit.reverseQuestions.map(x=><li key={x}>{x}</li>)}</ol></section></div></section></div>}

      {showSubmissionPackage&&submissionPackage&&<div className="resumeModal" role="dialog" aria-modal="true" aria-labelledby="submission-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowSubmissionPackage(false)}}><section className="submissionPanel"><header><div><span>APPLICATION PREFLIGHT</span><h2 id="submission-title">投递前最后核对</h2><p>{submissionPackage.company} · {submissionPackage.roleTitle}</p></div><button className="closeModal" onClick={()=>setShowSubmissionPackage(false)}>×</button></header><div className="submissionBody"><section className="lockedResume"><span>本次锁定简历</span><b>v{submissionPackage.resumeVersion} · {submissionPackage.resumeStrategy==="balanced"?"平衡版":"强转型版"} · {submissionPackage.resumeTemplate.toUpperCase()}</b><a href={submissionPackage.resumeDownloadUrl}>下载核对 PDF ↓</a></section><div className="quickFields"><span>官网填写助手</span><button onClick={()=>copyField(candidateDraft.displayName,"姓名")}><b>{candidateDraft.displayName||"姓名待补"}</b><small>复制姓名</small></button><button onClick={()=>copyField(candidateDraft.phone,"电话")}><b>{candidateDraft.phone?`${candidateDraft.phone.slice(0,3)}****${candidateDraft.phone.slice(-4)}`:"电话待补"}</b><small>复制电话</small></button><button onClick={()=>copyField(candidateDraft.email,"邮箱")}><b>{candidateDraft.email||"邮箱待补"}</b><small>复制邮箱</small></button><button onClick={()=>copyField(candidateDraft.currentCity,"所在地")}><b>{candidateDraft.currentCity||"所在地待补"}</b><small>复制所在地</small></button></div>{copyNotice&&<div className="copyNotice">{copyNotice}</div>}<section className="adapterState"><span>官网适配状态</span><b>{submissionPackage.adapter}</b><p>投递包已生成。先下载简历，再用上方按钮复制字段到官网；薪资、工作许可和法律声明必须由你本人确认。</p></section><div className="preflightList"><label><input type="checkbox" checked={preflightChecks.resume} onChange={event=>setPreflightChecks(x=>({...x,resume:event.target.checked}))}/><span><b>岗位与简历版本正确</b><small>确认将 v{submissionPackage.resumeVersion} 用于该岗位</small></span></label><label><input type="checkbox" checked={preflightChecks.contact} onChange={event=>setPreflightChecks(x=>({...x,contact:event.target.checked}))}/><span><b>联系方式已核对</b><small>姓名、电话、邮箱由本人确认无误</small></span></label><label><input type="checkbox" checked={preflightChecks.sensitive} onChange={event=>setPreflightChecks(x=>({...x,sensitive:event.target.checked}))}/><span><b>敏感问题由本人填写</b><small>薪资、工作许可、法律声明不交给系统代答</small></span></label><label><input type="checkbox" checked={preflightChecks.noAutoSubmit} onChange={event=>setPreflightChecks(x=>({...x,noAutoSubmit:event.target.checked}))}/><span><b>最终提交由本人完成</b><small>系统停在提交按钮之前</small></span></label></div></div><footer><button onClick={()=>markApplicationSubmitted(submissionPackage.applicationId)} disabled={workspaceLoading}>我已完成官网投递 ✓</button><a className={Object.values(preflightChecks).every(Boolean)?"":"disabled"} href={Object.values(preflightChecks).every(Boolean)?submissionPackage.jobUrl:undefined} target="_blank" rel="noreferrer" onClick={event=>{if(!Object.values(preflightChecks).every(Boolean))event.preventDefault()}}>打开官网并开始填写 ↗</a></footer></section></div>}

      {showCandidateProfile&&<div className="resumeModal" role="dialog" aria-modal="true" aria-labelledby="candidate-profile-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowCandidateProfile(false)}}><section className="uploadPanel candidatePanel"><header><div><span>APPLICATION PROFILE</span><h2 id="candidate-profile-title">个人投递资料</h2><p>只需维护一次，用于官网填写助手；联系方式不会出现在公开页面。</p></div><button className="closeModal" onClick={()=>setShowCandidateProfile(false)}>×</button></header><div className="candidateGrid"><label><span>姓名 *</span><input value={candidateDraft.displayName} onChange={event=>setCandidateDraft(x=>({...x,displayName:event.target.value}))}/></label><label><span>电话 *</span><input type="tel" value={candidateDraft.phone} onChange={event=>setCandidateDraft(x=>({...x,phone:event.target.value}))}/></label><label><span>邮箱 *</span><input type="email" value={candidateDraft.email} onChange={event=>setCandidateDraft(x=>({...x,email:event.target.value}))}/></label><label><span>当前城市</span><input value={candidateDraft.currentCity} onChange={event=>setCandidateDraft(x=>({...x,currentCity:event.target.value}))}/></label><label><span>工作年限</span><input value={candidateDraft.yearsExperience} placeholder="例如：10年" onChange={event=>setCandidateDraft(x=>({...x,yearsExperience:event.target.value}))}/></label></div><div className="uploadActions"><button onClick={()=>setShowCandidateProfile(false)}>取消</button><button className="primaryAction" onClick={saveCandidateProfile} disabled={workspaceLoading}>保存投递资料</button></div></section></div>}

      {showPhotoUpload && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="photo-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowPhotoUpload(false)}}><section className="uploadPanel photoPanel"><header><div><span>PROFILE PHOTO</span><h2 id="photo-title">上传个人形象照</h2><p>只保留一张，新上传会替换旧照片，并用于之后生成的简历 PDF。</p></div><button className="closeModal" onClick={()=>setShowPhotoUpload(false)}>×</button></header><div className="photoUploadBody"><div className="photoPreview">{photoFile?<img src={URL.createObjectURL(photoFile)} alt="待上传形象照预览"/>:profilePhotoUrl?<img src={profilePhotoUrl} alt="当前个人形象照"/>:<span>暂无照片</span>}</div><label className="uploadDrop"><input type="file" accept="image/jpeg,image/png,.jpg,.jpeg,.png" onChange={event=>{setPhotoFile(event.target.files?.[0]??null);setPhotoMessage("")}}/><span>{photoFile?photoFile.name:"选择 JPG 或 PNG 图片"}</span><small>建议使用职业半身照 · 不超过 5MB</small></label></div>{photoMessage&&<div className="uploadMessage">{photoMessage}</div>}<div className="uploadActions"><button onClick={()=>setShowPhotoUpload(false)}>关闭</button><button className="primaryAction" onClick={uploadProfilePhoto} disabled={photoUploading}>{photoUploading?"上传中…":"保存形象照"}</button></div></section></div>}

      {showResumePreview && generatedPair && <div className="resumeModal" role="dialog" aria-modal="true" aria-labelledby="resume-modal-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowResumePreview(false); }}>
        <section className="resumeModalPanel">
          <header>
            <div><span>FULL RESUME COMPARISON</span><h2 id="resume-modal-title">两版完整简历，一屏对照</h2><p>左侧保留完整职业连续性，右侧突出AI岗位迁移能力。可滚动查看两页内容，再单独下载。</p></div>
            <button className="closeModal" onClick={() => setShowResumePreview(false)} aria-label="关闭简历对比">×</button>
          </header>
          <div className="downloadGuide"><div><b>当前模板：{resumeTemplate === "ats" ? "ATS 标准版" : resumeTemplate === "product" ? "产品运营版" : "面试作品版"}</b><span>两份 PDF 已按当前模板现场生成，下载不会触发投递</span></div><a href={`/api/generated-resume/${generatedPair.find(item => item.strategy === "balanced")?.id}`}>下载平衡版 PDF ↓</a><a href={`/api/generated-resume/${generatedPair.find(item => item.strategy === "transition")?.id}`}>下载强转型版 PDF ↓</a></div>
          <div className="resumePreviewGrid">
            <article className="resumePreviewCard balancedCard">
              <div className="resumeCardHead"><div><span>推荐正式投递</span><h3>平衡版简历</h3></div><small>职业经历更完整 · 业务结果保留更多</small></div>
              <iframe src={`/api/generated-resume/${generatedPair.find(item => item.strategy === "balanced")?.id}?inline=1#view=FitH&toolbar=0`} title={`${current.title}平衡版简历预览`} />
              <a className="resumeDownload" href={`/api/generated-resume/${generatedPair.find(item => item.strategy === "balanced")?.id}`}>下载平衡版简历 PDF <span>↓</span></a>
            </article>
            <article className="resumePreviewCard transitionCard">
              <div className="resumeCardHead"><div><span>适合内推与面试</span><h3>强转型版简历</h3></div><small>AI能力更前置 · 弱相关内容更精简</small></div>
              <iframe src={`/api/generated-resume/${generatedPair.find(item => item.strategy === "transition")?.id}?inline=1#view=FitH&toolbar=0`} title={`${current.title}强转型版简历预览`} />
              <a className="resumeDownload" href={`/api/generated-resume/${generatedPair.find(item => item.strategy === "transition")?.id}`}>下载强转型版简历 PDF <span>↓</span></a>
            </article>
          </div>
          <footer className="modalNote"><b>下载前建议完成证书名称与作品链接核验</b><span>下载不会改变证据库，也不会触发投递。</span></footer>
        </section>
      </div>}

      {selectedJob && <div className="resumeModal jobDetailModal" role="dialog" aria-modal="true" aria-labelledby="job-detail-title" onMouseDown={event => { if (event.target === event.currentTarget) setSelectedJob(null); }}><section className="jobDetailPanel"><header><div><span>JOB DETAIL</span><h2 id="job-detail-title">{displayRoleTitle(selectedJob.title,selectedJob.company)}</h2><p>{selectedJob.company} · {selectedJob.location || "地点待确认"}</p></div><button className="closeModal" onClick={() => setSelectedJob(null)}>×</button></header><div className="jobDetailScroll">{(() => { let meta:{ requirements?:string; department?:string; decision?:string; score?:number; jobStatus?:string; statusCheckedAt?:string; statusMessage?:string }={}; try { meta=JSON.parse(selectedJob.description); } catch {} const staticKey = selectedJob.title.includes("情感") ? "emotion" : selectedJob.title.includes("创作") ? "writing" : selectedJob.title.includes("Agent") ? "agent" : null; const fallback = staticKey ? roles[staticKey].mission : "该历史岗位只保存了分析结果，尚未保存完整官网 JD。可通过官网链接重新读取并更新本条记录。"; return <><div className="jobDetailMeta"><span>匹配度 <b>{meta.score ?? "待分析"}</b></span><span>判断 <b>{meta.decision ?? "待分析"}</b></span><span>招聘状态 <b className={"detailAvailability "+(meta.jobStatus??"unknown")}>{meta.jobStatus==="open"?"官网在招":meta.jobStatus==="closed"?"已下线":"待人工确认"}</b></span>{meta.statusCheckedAt&&<span>最后核验 <b>{new Date(meta.statusCheckedAt).toLocaleString("zh-CN")}</b></span>}{meta.department && <span>部门 <b>{meta.department}</b></span>}</div>{meta.statusMessage&&<div className="statusReason">{meta.statusMessage}</div>}<h3>工作内容与岗位要求</h3><p>{meta.requirements || fallback}</p>{!meta.requirements && <div className="historicJobNote">历史记录未保存完整 JD，当前展示岗位分析摘要。重新导入同一官网链接后，系统会更新本记录，不会生成重复岗位。</div>}</>; })()}</div><footer><button onClick={()=>refreshJobFromOfficialSite(selectedJob)} disabled={workspaceLoading}>重新读取官网并更新</button><a href={selectedJob.sourceUrl} target="_blank" rel="noreferrer">打开招聘官网 ↗</a><button onClick={() => setSelectedJob(null)}>关闭</button></footer></section></div>}

      {showAddRole && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="add-role-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddRole(false); }}><section className="uploadPanel evidenceForm addRolePanel"><header><div><span>NEW TARGET ROLE</span><h2 id="add-role-title">粘贴官网链接，自动读取岗位</h2><p>优先读取官网公开的结构化职位信息；读取不到时再手工补充。不会登录、绕过验证码或规避招聘网站限制。</p></div><button className="closeModal" onClick={() => setShowAddRole(false)}>×</button></header><div className="jobUrlReader"><label><span>官网职位链接 *</span><input type="url" value={newRole.sourceUrl} onChange={e => {setNewRole(x => ({...x,sourceUrl:e.target.value}));setJobImportMessage("");setJobVariants([]);}} placeholder="https://公司招聘官网/职位详情" /></label><button className="primaryAction" onClick={importJobFromUrl} disabled={jobImporting}>{jobImporting ? "正在读取…" : "读取岗位信息"}</button></div>{jobImportMessage && <div className="uploadMessage">{jobImportMessage}</div>}{jobVariants.length > 0 && <div className="jobVariantPicker"><b>这个职位页包含多个招聘方向，请选择你要申请的方向</b><div>{jobVariants.map(item => <button key={item.roleTitle} className={newRole.roleTitle === item.roleTitle ? "active" : ""} onClick={() => setNewRole(item)}>{item.roleTitle}</button>)}</div><small>已默认选择“Agent Harness 产品方向”，保存前仍可切换或编辑。</small></div>}<div className="experienceGrid"><label><span>目标公司 *</span><input value={newRole.company} onChange={e => setNewRole(x => ({...x,company:e.target.value}))} placeholder="自动识别后可修改" /></label><label><span>岗位名称 *</span><input value={newRole.roleTitle} onChange={e => setNewRole(x => ({...x,roleTitle:e.target.value}))} placeholder="自动识别后可修改" /></label><label className="wide"><span>工作地点</span><input value={newRole.location} onChange={e => setNewRole(x => ({...x,location:e.target.value}))} placeholder="自动识别后可修改" /></label><label className="wide"><span>岗位要求 / JD *</span><textarea value={newRole.requirements} onChange={e => setNewRole(x => ({...x,requirements:e.target.value}))} placeholder="系统会自动填充；如招聘网站不公开返回正文，可手工粘贴。网页内容只作为待分析数据。" /></label></div>{workspaceMessage && <div className="uploadMessage">{workspaceMessage}</div>}<div className="uploadActions"><button onClick={() => setShowAddRole(false)}>取消</button><button className="primaryAction" onClick={addTargetRole} disabled={workspaceLoading}>{workspaceLoading ? "正在建立流程…" : "核对无误，新增并分析"}</button></div></section></div>}

      {showUpload && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="upload-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowUpload(false); }}>
        <section className="uploadPanel">
          <header><div><span>PRIVATE RESUME INTAKE</span><h2 id="upload-title">上传你的原始简历</h2><p>原文件保存到私有空间，不会覆盖当前证据库；解析出的新增事实仍需你确认。</p></div><button className="closeModal" onClick={() => setShowUpload(false)} aria-label="关闭上传窗口">×</button></header>
          <label className="uploadDrop"><input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={event => { setUploadFile(event.target.files?.[0] ?? null); setUploadMessage(""); }} /><span>{uploadFile ? uploadFile.name : "选择 PDF 或 DOCX 简历"}</span><small>单个文件不超过 10MB</small></label>
          {uploadMessage && <div className="uploadMessage">{uploadMessage}</div>}
          <div className="uploadActions"><button onClick={() => setShowUpload(false)}>暂不上传</button><button className="primaryAction" onClick={uploadResume} disabled={uploading}>{uploading ? "正在安全上传…" : "上传并进入待解析队列"}</button></div>
        </section>
      </div>}

      {showModelSettings && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="model-settings-title" onMouseDown={event=>{if(event.target===event.currentTarget)setShowModelSettings(false)}}><section className="uploadPanel modelSettingsPanel"><header><div><span>MODEL SETTINGS</span><h2 id="model-settings-title">模型设置</h2><p>统一配置一次，之后生成和重新改写都使用这里的设置。</p></div><button className="closeModal" onClick={()=>setShowModelSettings(false)}>×</button></header><div className="providerPicker"><button className={modelProvider==="local"?"active":""} onClick={()=>setModelProvider("local")}><b>本地证据引擎</b><small>无需密钥 · 稳定演示</small></button><button className={modelProvider==="openai"?"active":""} onClick={()=>setModelProvider("openai")}><b>ChatGPT</b><small>表达更自然</small></button><button className={modelProvider==="deepseek"?"active":""} onClick={()=>setModelProvider("deepseek")}><b>DeepSeek</b><small>中文改写</small></button></div>{modelProvider!=="local"&&<label className="apiKeyField"><span>{modelProvider==="openai"?"OpenAI":"DeepSeek"} API Key</span><input type="password" autoComplete="off" value={modelApiKey} onChange={event=>setModelApiKey(event.target.value)} placeholder="输入后可选择仅保存在当前浏览器"/><small>不会写入候选人数据库，也不会展示在简历或演示页面。</small></label>}<label className="rememberKey"><input type="checkbox" checked={rememberModelKey} onChange={event=>setRememberModelKey(event.target.checked)}/><span>记住在当前浏览器（适合自己的私人设备；公共设备请勿勾选）</span></label><div className="uploadActions"><button onClick={()=>setShowModelSettings(false)}>取消</button><button className="primaryAction" onClick={saveModelSettings}>保存模型设置</button></div></section></div>}
      {showRegenerate && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="regenerate-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRegenerate(false); }}><section className="uploadPanel regeneratePanel"><header><div><span>VERSIONED REWRITE</span><h2 id="regenerate-title">重新生成简历版本</h2><p>模型只能迁移和翻译已有经历，不能增加没有证据的事实。</p></div><button className="closeModal" onClick={() => setShowRegenerate(false)}>×</button></header><div className="activeModelSummary"><div><span>当前模型</span><b>{modelProvider==="local"?"本地证据引擎":modelProvider==="openai"?"ChatGPT":"DeepSeek"}</b><small>{modelProvider==="local"?"无需 API Key":modelApiKey?"API Key 已配置":"尚未配置 API Key"}</small></div><button onClick={()=>setShowModelSettings(true)}>修改模型设置</button></div><label><span>告诉系统这次重点怎么改</span><textarea value={regenerateFeedback} onChange={event => setRegenerateFeedback(event.target.value)} placeholder="例如：保留所有数字、减少AI味、压缩自我评价、突出产品协作" /></label><div className="rewritePresets"><button onClick={() => setRegenerateFeedback("保留全部关键数字，将电商语言翻译成产品运营语言")}>保留数字</button><button onClick={() => setRegenerateFeedback("减少模板化和AI味，使用更自然、具体的表达")}>减少AI味</button><button onClick={() => setRegenerateFeedback("只压缩弱相关执行细节，不删除业务结果")}>只压缩弱相关内容</button></div><div className="uploadActions"><button onClick={() => setShowRegenerate(false)}>取消</button><button className="primaryAction" onClick={() => saveReview("regenerateReview")} disabled={reviewSaving || (modelProvider !== "local" && !modelApiKey.trim())}>{reviewSaving ? `${modelProvider === "openai" ? "ChatGPT" : modelProvider === "deepseek" ? "DeepSeek" : "本地引擎"}生成中…` : `生成 v${reviewVersion + 1}`}</button></div></section></div>}

      {showAddEvidence && <div className="resumeModal uploadModal" role="dialog" aria-modal="true" aria-labelledby="evidence-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowAddEvidence(false); }}><section className="uploadPanel evidenceForm"><header><div><span>CANONICAL EVIDENCE</span><h2 id="evidence-title">{editingEvidenceId?`修改 / 补充 ${editingEvidenceId}`:"新增工作经历 / 证据"}</h2><p>{editingEvidenceId?"直接完善原记录，不会新增重复证据。保存后所有岗位简历都会继续引用同一个证据 ID。":"系统会检查同组织、同角色和同时段的记录；发现相似内容时，建议优先合并到旧记录。"}</p></div><button className="closeModal" onClick={() => setShowAddEvidence(false)}>×</button></header>{editingEvidenceId?<div className="experienceGrid"><div className="rewriteSuggestion wide"><b>改写建议</b><p>{evidenceRewriteSuggestion.structure}</p><p>{evidenceRewriteSuggestion.evidence}</p><code>{evidenceRewriteSuggestion.example}</code></div><label className="wide"><span>完整经历事实 *</span><textarea value={editingEvidence.claim} onChange={e=>setEditingEvidence(x=>({...x,claim:e.target.value}))}/><small>只补充真实做过的动作和结果；不要把建议模板中的方括号原样保存。</small></label><label className="wide"><span>来源、链接或证明材料</span><input value={editingEvidence.source} onChange={e=>setEditingEvidence(x=>({...x,source:e.target.value}))} placeholder="例如：原始简历、作品链接、截图或数据报表"/></label><label><span>可信状态</span><select value={editingEvidence.confidence} onChange={e=>setEditingEvidence(x=>({...x,confidence:e.target.value as WorkspaceEvidence["confidence"]}))}><option value="self_reported">本人陈述</option><option value="verified">已验证</option><option value="unverified">待验证</option></select></label></div>:<><div className="experienceGrid"><label><span>经历所属组织 / 项目 *</span><input placeholder="例如：阿里巴巴；个人项目请写项目名称" value={newExperience.company} onChange={e => setNewExperience(x => ({...x,company:e.target.value}))} /></label><label><span>当时的岗位 / 角色 *</span><input placeholder="例如：产品运营；个人项目可写项目负责人" value={newExperience.roleTitle} onChange={e => setNewExperience(x => ({...x,roleTitle:e.target.value}))} /></label><label><span>经历时间 *</span><input placeholder="例如：2024.01–2025.06" value={newExperience.dates} onChange={e => setNewExperience(x => ({...x,dates:e.target.value}))} /></label><label><span>可信状态</span><select value={newExperience.confidence} onChange={e => setNewExperience(x => ({...x,confidence:e.target.value as WorkspaceEvidence["confidence"]}))}><option value="self_reported">本人陈述</option><option value="verified">已验证</option><option value="unverified">待验证</option></select></label><label className="wide"><span>你实际负责的事情 *</span><textarea placeholder="写清业务背景、你的动作和协作对象，不要粘贴目标岗位要求" value={newExperience.responsibility} onChange={e => setNewExperience(x => ({...x,responsibility:e.target.value}))} /></label><label className="wide"><span>可核实的结果（如有）</span><textarea placeholder="填写真实的规模、转化率、增长率、效率或金额；没有数据可以留空" value={newExperience.result} onChange={e => setNewExperience(x => ({...x,result:e.target.value}))} /></label><label className="wide"><span>来源或证明材料</span><input placeholder="例如：原始简历、作品链接、截图或数据报表" value={newExperience.source} onChange={e => setNewExperience(x => ({...x,source:e.target.value}))} /></label></div>{similarEvidence.length>0&&<div className="similarEvidence"><b>发现可能属于同一段经历的旧记录</b><p>建议先打开旧记录补充，避免同一组织、同一时间段被拆成多条。</p>{similarEvidence.map(item=><button key={item.id} onClick={()=>openEditEvidence(item.id)}><span>{item.id}</span><small>{item.claim}</small><em>合并到此记录 →</em></button>)}</div>}</>}<div className="uploadActions"><button onClick={() => setShowAddEvidence(false)}>取消</button><button className="primaryAction" onClick={editingEvidenceId?saveEditedEvidence:addExperience} disabled={reviewSaving}>{reviewSaving ? "保存中…" : editingEvidenceId?"保存修改":"保存为新证据"}</button></div></section></div>}

      {showGeneratedPreview && generatedReview && <div className="resumeModal generatedModal" role="dialog" aria-modal="true" aria-labelledby="generated-title" onMouseDown={event => { if(event.target===event.currentTarget)setShowGeneratedPreview(false); }}><section className="generatedPanel"><header><div><span>EVIDENCE-CONSTRAINED OUTPUT · V{generatedReview.version}</span><h2 id="generated-title">真实生成结果与证据映射</h2><p>{generatedReview.content.meta.feedback || "依据当前证据库生成"}</p></div><button className="closeModal" onClick={() => setShowGeneratedPreview(false)}>×</button></header><div className="generatedBody"><section><h3>自我评价</h3><p>{generatedReview.content.summary.text}</p><small>{generatedReview.content.summary.evidenceIds.join(" · ")}</small></section><section><h3>我的优势</h3>{generatedReview.content.advantages.map((item,index)=><article key={index}><p>{item.text}</p><small>{item.evidenceIds.join(" · ")}</small></article>)}</section><section><h3>工作经历</h3>{generatedReview.content.experience.map((item,index)=><article className="generatedJob" key={index}><div><b>{item.company}｜{item.role}</b><span>{item.dates}</span></div>{item.bullets.map((bullet,i)=><div className="mappedBullet" key={i}><p>• {bullet.text}</p><small>{bullet.evidenceIds.join(" · ")}</small></div>)}</article>)}</section></div><footer><div><b>证据护栏已启用</b><span>没有证据 ID 的内容不会进入导出文件。</span></div><a href={`/api/generated-resume/${generatedReview.id}`}>下载此版本 PDF ↓</a></footer></section></div>}

      <section className="logicStrip">
        <div><span>01</span><b>岗位要求</b><small>拆成可判断的能力项</small></div><i>→</i>
        <div><span>02</span><b>事实证据</b><small>匹配来源与可信等级</small></div><i>→</i>
        <div><span>03</span><b>能力缺口</b><small>明确不能声称什么</small></div><i>→</i>
        <div><span>04</span><b>专属简历</b><small>重排而不虚构</small></div><i>→</i>
        <div><span>05</span><b>本人确认</b><small>最终决定始终在人</small></div>
      </section>

      <footer><b>JobCraft</b><span>Evidence-first job application system</span><small>MVP · DeepSeek case</small></footer>
    </main>
  );
}
