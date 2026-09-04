type EvidenceRow={id:string;claim:string;confidence:string;tagsJson:string};

type Competency={
  name:string;
  jdTerms:string[];
  evidenceTerms:string[];
  minimum:number;
  gap:string;
  weight:number;
};

const competencies:Competency[]=[
  {name:"海外内容增长",jdTerms:["海外全渠道内容增长","海外获客","tiktok","youtube","instagram","meta","海外内容"],evidenceTerms:["tiktok","shopee","海外","美元","达人","creator-ecosystem","content-performance","roi","gmv"],minimum:2,gap:"海外内容增长的渠道结果与量化指标",weight:1.3},
  {name:"内容策略与生态",jdTerms:["内容策略","内容增长","内容平台","内容质量","内容生态","创作","写作"],evidenceTerms:["内容策划","内容社区","内容制作","优质内容","达人","creator","content","脚本","传统文化ip"],minimum:2,gap:"内容策略、选题或内容生态运营成果",weight:1.15},
  {name:"增长与漏斗分析",jdTerms:["曝光","点击","留存","转化","线索","漏斗","a/b测试","roi","数据分析","增长"],evidenceTerms:["pv","uv","cvr","加购","roi","转化","dau","gmv","曝光","数据报告","analytics","diagnosis"],minimum:2,gap:"从曝光到转化的漏斗分析与优化案例",weight:1.25},
  {name:"用户需求洞察",jdTerms:["用户需求","用户心理","用户洞察","用户反馈","用户体验","真实需求"],evidenceTerms:["用户画像","用户反馈","用户洞察","真实诉求","业务反馈","需求","user-insight"],minimum:2,gap:"目标用户需求洞察及其转化为策略的证据",weight:1},
  {name:"产品需求与迭代",jdTerms:["产品经理","产品路线图","产品迭代","功能需求","体验优化","推动问题解决"],evidenceTerms:["功能需求","产品迭代","产品、研发","产品研发","产品链路","上线","product-ops","requirements"],minimum:2,gap:"产品需求、方案推进与上线结果",weight:1.1},
  {name:"跨团队项目推进",jdTerms:["跨团队","协同","项目管理","owner","研究员","研发协作","团队合作"],evidenceTerms:["跨团队","协同","统筹","项目管理","产品、研发","okr","sop","cross-functional","program-management"],minimum:2,gap:"跨团队协作、项目推进与交付结果",weight:1},
  {name:"模型评测与归因",jdTerms:["模型评测","badcase","归因","模型优化","数据生产","质量标准","评估体系"],evidenceTerms:["模型评测","badcase","归因","评测","质量标准","root-cause","evaluation"],minimum:2,gap:"模型评测、Badcase归因或数据生产案例",weight:1.15},
  {name:"Agent与自动化",jdTerms:["agent","workflow","vibe coding","ai coding","自动化工作流","自主任务"],evidenceTerms:["agent","workflow","vibe coding","自动化","codex","cursor"],minimum:2,gap:"Agent、自动化工作流或原型验证作品",weight:1.15},
  {name:"AI写作质量",jdTerms:["文学写作","功能写作","文本质量","文学审美","论文","报告","公文","文案"],evidenceTerms:["写作","脚本","文本","内容制作","文案","报告","审美"],minimum:2,gap:"可核验的文本质量判断、写作或编辑样本",weight:1.15},
  {name:"情感互动体验",jdTerms:["情感陪伴","角色扮演","情感智能","互动关系","同理心","沉浸度"],evidenceTerms:["情感陪伴","情感赛道","真实诉求","同理心","心理","emotional-ai","empathy","conversation"],minimum:2,gap:"情感互动场景的真实样本、归因或体验优化证据",weight:1.2},
  {name:"搜索与数据体系",jdTerms:["ai搜索","搜索","数据管线","数据构造","任务完成度","过程行为"],evidenceTerms:["搜索","数据管线","数据构造","搜索词","排行榜","任务完成","search"],minimum:2,gap:"搜索、任务评测或数据构造的完整案例",weight:1.05},
  {name:"医疗健康行业",jdTerms:["医疗","医药","医药险","健康业务","健康事业群"],evidenceTerms:["医疗","医药","保险","健康行业","healthcare","medicine"],minimum:1,gap:"医疗健康或医药险行业经验与案例",weight:1.05},
  {name:"英语与本地化",jdTerms:["英语可作为工作语言","本地化","东南亚市场","小语种","海外市场"],evidenceTerms:["英语","英文","本地化","东南亚","小语种","海外市场"],minimum:1,gap:"英语工作能力及海外市场本地化案例",weight:1},
  {name:"模型训练基础",jdTerms:["模型训练","训练基本原理","prompt engineering","模型能力边界"],evidenceTerms:["模型训练","prompt","模型能力边界","训练原理","大模型评测"],minimum:1,gap:"模型训练基础、Prompt或能力边界判断的可验证经历",weight:1}
];

const normalize=(value:string)=>value.toLowerCase().replace(/[\s·｜|_\-—、，。；：:（）()【】\/]+/g,"");
const has=(text:string,term:string)=>text.includes(normalize(term));

function evidenceScore(row:EvidenceRow,competency:Competency,jd:string){
  const text=normalize(row.claim+" "+row.tagsJson);
  const matches=competency.evidenceTerms.filter(term=>has(text,term)).length;
  if(matches<competency.minimum)return 0;
  let score=matches*competency.weight;
  if(row.confidence==="verified")score+=.8;
  if(row.confidence==="unverified")score-=2.5;
  if(/[0-9]|%|万|亿|提升|增长|达成/.test(row.claim))score+=1.2;
  const emotionalOnly=/emotional-ai|empathy|conversation|情感陪伴|情感赛道|心理/.test(text);
  const contentGrowth=/海外全渠道内容增长|海外获客|内容增长|内容策略/.test(jd);
  if(contentGrowth&&emotionalOnly&&!/内容|增长|转化|roi|达人|海外/.test(text))score-=5;
  return score;
}

export function analyzeJobMatch(requirements:string,evidence:EvidenceRow[]){
  const jd=normalize(requirements);
  const requested=competencies.filter(item=>item.jdTerms.some(term=>has(jd,term)));
  const selected=requested.length?requested:competencies.filter(item=>["用户需求洞察","产品需求与迭代","跨团队项目推进"].includes(item.name));
  const gaps:string[]=[];
  const strengthening:string[]=[];
  const rowScores=new Map<string,{row:EvidenceRow;score:number;maxScore:number;dimensions:Set<string>}>();
  for(const competency of selected){
    const ranked=evidence.map(row=>({row,score:evidenceScore(row,competency,jd)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score);
    if(!ranked.length){gaps.push(competency.gap);continue;}
    const strongest=ranked[0];
    if(strongest.row.confidence==="unverified") strengthening.push(`${competency.name}：已有相关经历，但证据仍待核验`);
    else if(strongest.score<4.2) strengthening.push(`${competency.name}：已有可迁移经历，建议补充更直接的岗位场景、结果或作品`);
    for(const candidate of ranked.slice(0,3)){
      const current=rowScores.get(candidate.row.id)??{row:candidate.row,score:0,maxScore:0,dimensions:new Set<string>()};
      current.score+=candidate.score;
      current.maxScore=Math.max(current.maxScore,candidate.score);
      current.dimensions.add(competency.name);
      rowScores.set(candidate.row.id,current);
    }
  }
  const ranked=[...rowScores.values()].sort((a,b)=>b.score-a.score||a.row.id.localeCompare(b.row.id)).filter(item=>item.score>=2);
  const matched=ranked.slice(0,5).map(item=>{
    const dimension=[...item.dimensions].join(" · ");
    const strength=item.row.confidence==="unverified"?"pending":item.maxScore>=4.2?"direct":"transferable";
    const label=strength==="pending"?"待核验":strength==="direct"?"直接支持":"可迁移证据";
    return {dimension,evidenceId:item.row.id,claim:item.row.claim,confidence:item.row.confidence,relevance:Math.min(100,Math.round(item.score*14)),strength,reason:`${label}：${[...item.dimensions].join("、")}`};
  });
  const coverage=selected.length?Math.round((selected.length-gaps.length)/selected.length*100):0;
  const verifiedBonus=matched.filter(hit=>evidence.find(item=>item.id===hit.evidenceId)?.confidence==="verified").length;
  const score=Math.max(35,Math.min(90,Math.round(38+coverage*.48+verifiedBonus*1.5)));
  const strongCoverage=Math.max(0,selected.length-gaps.length-strengthening.length);
  return {score,matched,gaps:gaps.slice(0,5),strengthening:strengthening.slice(0,5),coverage,coverageSummary:{strong:strongCoverage,needsStrengthening:strengthening.length,hardGaps:gaps.length},method:"evidence-competency-v3"};
}
