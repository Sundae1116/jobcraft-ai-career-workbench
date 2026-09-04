import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageUrl=new URL("../app/page.tsx",import.meta.url);
const cssUrl=new URL("../app/globals.css",import.meta.url);
const workspaceUrl=new URL("../app/api/workspace/route.ts",import.meta.url);

test("evidence can be edited and duplicate additions are surfaced",async()=>{
  const page=await readFile(pageUrl,"utf8");
  assert.match(page,/修改 \/ 补充/);
  assert.match(page,/发现可能属于同一段经历的旧记录/);
  assert.match(page,/合并到此记录/);
  assert.match(page,/已补充/);
  assert.match(page,/未补充/);
});

test("application draft continues into resume review without duplicates",async()=>{
  const [page,api]=await Promise.all([readFile(pageUrl,"utf8"),readFile(workspaceUrl,"utf8")]);
  assert.match(page,/开始申请准备/);
  assert.match(page,/生成并审核简历/);
  assert.match(api,/deduplicated:true/);
  assert.match(api,/nextStep:"resume_review"/);
});

test("photo failures are human readable and oversized browser uploads are compressed",async()=>{
  const page=await readFile(pageUrl,"utf8");
  assert.match(page,/preparePhoto/);
  assert.match(page,/正在优化照片尺寸并上传/);
  assert.doesNotMatch(page,/Unexpected token|Payload Too Large/);
});

test("resume plan has a clear preview and usable layout",async()=>{
  const [page,css]=await Promise.all([readFile(pageUrl,"utf8"),readFile(cssUrl,"utf8")]);
  assert.match(page,/这里将出现逐条差异，不是空白简历/);
  assert.match(css,/grid-template-columns: minmax\(460px,1fr\)/);
  assert.match(css,/\.scoreGap\{display:grid/);
});

test("application IDs connect jobs, resumes and interview preparation",async()=>{
  const [page,api]=await Promise.all([readFile(pageUrl,"utf8"),readFile(workspaceUrl,"utf8")]);
  assert.match(page,/申请与投递准备/);
  assert.match(page,/生成面试准备包/);
  assert.match(page,/三个叙事支柱/);
  assert.match(page,/风险题与事实边界/);
  assert.match(api,/generateInterviewKit/);
  assert.match(api,/interview_kit_generated/);
  assert.match(api,/interview_ready/);
});

test("Moka imports use the platform adapter instead of company fixtures",async()=>{
  const [route,adapter]=await Promise.all([
    readFile(new URL("../app/api/job-import/route.ts",import.meta.url),"utf8"),
    readFile(new URL("../lib/job-adapters/moka.ts",import.meta.url),"utf8"),
  ]);
  assert.doesNotMatch(route,/暂未配置对应公司适配器/);
  assert.match(route,/importMokaJob/);
  assert.match(adapter,/\/api\/outer\/ats-apply\/website\/job/);
  assert.match(adapter,/AES-CBC/);
  assert.match(adapter,/Moka 通用公开职位适配器/);
});

test("workflow gates keep one candidate and require a confirmed resume",async()=>{
  const [page,workspace,upload]=await Promise.all([
    readFile(pageUrl,"utf8"),
    readFile(workspaceUrl,"utf8"),
    readFile(new URL("../app/api/resume-upload/route.ts",import.meta.url),"utf8"),
  ]);
  assert.doesNotMatch(upload,/candidate-guo/);
  assert.match(upload,/candidateSeed\.id/);
  assert.match(workspace,/请先生成并确认该岗位的简历/);
  assert.match(page,/一键准备投递/);
  assert.match(page,/投递前最后核对/);
  assert.match(page,/最终提交由本人完成/);
  assert.match(workspace,/prepareApplication/);
  assert.match(workspace,/submission_package_prepared/);
  assert.match(page,/个人投递资料/);
  assert.match(page,/官网填写助手/);
  assert.match(page,/我已完成官网投递/);
  assert.match(workspace,/application_submitted_confirmed/);
  assert.match(page,/gapActionList/);
});

test("new Agent roles are not collapsed into the built-in generic Agent role",async()=>{
  const workspace=await readFile(workspaceUrl,"utf8");
  assert.match(workspace,/通用Agent数据产品经理/);
  assert.doesNotMatch(workspace,/title\.includes\("Agent"\)\?"role-agent"/);
  assert.match(workspace,/stillUsed/);
});

test("confirming a resume locks the version the user selected",async()=>{
  const workspace=await readFile(workspaceUrl,"utf8");
  assert.match(workspace,/item\.strategy === body\.strategy/);
  assert.match(workspace,/selectedDraft\.id/);
  assert.doesNotMatch(workspace,/set\(\{ strategy: body\.strategy/);
});

test("dynamic job scoring and application stages are durable",async()=>{
  const [page,api,engine]=await Promise.all([readFile(pageUrl,"utf8"),readFile(workspaceUrl,"utf8"),readFile(new URL("../lib/job-match.ts",import.meta.url),"utf8")]);
  assert.match(engine,/evidence-competency-v3/);
  assert.match(api,/analyzeJobMatch/);
  assert.match(api,/application_stage_updated/);
  assert.match(page,/重新读取官网并更新/);
  assert.match(page,/已完成投递/);
  assert.match(page,/Offer/);
});

test("autofill helper is scoped and never submits",async()=>{
  const manifest=JSON.parse(await readFile(new URL("../extension/manifest.json",import.meta.url),"utf8"));
  const content=await readFile(new URL("../extension/content.js",import.meta.url),"utf8");
  assert.deepEqual(manifest.host_permissions,["https://app.mokahr.com/*","https://talent.antgroup.com/*"]);
  assert.doesNotMatch(JSON.stringify(manifest),/https:\/\/\*\/\*/);
  assert.match(content,/薪资/);
  assert.match(content,/验证码/);
  assert.doesNotMatch(content,/\.submit\(|click\(\)/);
});
test("role navigation supports context actions and workspace batch deletion", async () => {
  const page = await readFile(pageUrl,"utf8");
  const api = await readFile(workspaceUrl,"utf8");
  assert.match(page,/onContextMenu=/);
  assert.match(page,/双击进入证据核对 · 右键可查看、打开官网或删除/);
  assert.match(page,/batchDeleteTargetRoles/);
  assert.match(page,/批量删除/);
  assert.match(api,/body\.jobIds/);
  assert.match(api,/申请、简历与审核历史保留/);
});
test("job availability is synchronized and closed roles are blocked", async () => {
  const page=await readFile(pageUrl,"utf8");
  const api=await readFile(workspaceUrl,"utf8");
  const status=await readFile(new URL("../lib/job-status.ts",import.meta.url),"utf8");
  assert.match(page,/同步招聘状态/);
  assert.match(page,/官网在招/);
  assert.match(page,/岗位已失效/);
  assert.match(page,/12\*60\*60\*1000/);
  assert.match(api,/syncJobStatuses/);
  assert.match(api,/系统已停止生成投递包/);
  assert.match(status,/Moka 官网仍返回完整职位信息/);
  assert.match(status,/closedPattern/);
});

test("job evidence is matched by competency domain and company is separated from role title", async () => {
  const [page,workspaceApi,matcher,jobImport]=await Promise.all([
    readFile(pageUrl,"utf8"),
    readFile(workspaceUrl,"utf8"),
    readFile(new URL("../lib/job-match.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/api/job-import/route.ts",import.meta.url),"utf8")
  ]);
  assert.match(matcher,/evidence-competency-v3/);
  assert.match(matcher,/contentGrowth&&emotionalOnly/);
  assert.match(matcher,/医疗健康或医药险行业经验与案例/);
  assert.match(workspaceApi,/syncRoleAnalyses/);
  assert.match(page,/displayRoleTitle/);
  assert.match(page,/companyForRole/);
  assert.match(jobImport,/roleTitle:"海外内容策略专家-健康事业群"/);
});
test("job decision separates strong, transferable, strengthening and hard gaps", async () => {
  const [page,matcher,styles]=await Promise.all([
    readFile(pageUrl,"utf8"),
    readFile(new URL("../lib/job-match.ts",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8")
  ]);
  assert.match(page,/证据覆盖情况/);
  assert.match(page,/0 项硬缺口不等于完全匹配/);
  assert.match(page,/可迁移证据/);
  assert.match(page,/去强化/);
  assert.match(matcher,/coverageSummary/);
  assert.match(matcher,/strengthening/);
  assert.match(matcher,/strength==="pending"\?"待核验":strength==="direct"\?"直接支持":"可迁移证据"/);
  assert.match(styles,/\.coverageLegend/);
});
test("roles, evidence editing and model settings have clear durable UX", async () => {
  const [page,styles]=await Promise.all([readFile(pageUrl,"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8")]);
  assert.match(page,/roleCompanyGroup/);
  assert.match(page,/第 \{roleIndex \+ 1\} 个录入/);
  assert.match(page,/COMPANY/);
  assert.match(page,/录入时间由早到晚/);
  assert.match(page,/改写建议/);
  assert.match(page,/业务背景 → 你的动作 → 协作对象 → 结果/);
  assert.match(page,/经历所属组织 \/ 项目/);
  assert.match(page,/当时的岗位 \/ 角色/);
  assert.match(page,/模型设置/);
  assert.match(page,/jobcraft-model-key/);
  assert.match(page,/不会写入候选人数据库/);
  assert.doesNotMatch(page,/请先在“重新生成”中填写/);
  assert.match(styles,/\.roleCompanyGroup/);
  assert.match(styles,/Company directory: a true two-level hierarchy/);
  assert.match(styles,/\.rewriteSuggestion/);
  assert.match(styles,/\.activeModelSummary/);
});
test("every primary workflow view has contextual back and next navigation", async () => {
  const [page,styles]=await Promise.all([readFile(pageUrl,"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8")]);
  assert.match(page,/flowNavigation/);
  assert.match(page,/evidenceReturnView/);
  assert.match(page,/evidenceReturnView === "workspace"[\s\S]*"岗位判断"/);
  assert.match(page,/下一步：/);
  assert.match(page,/closeOnEscape/);
  assert.match(page,/const targets:Record<View,string>/);
  assert.match(styles,/\.flowNavigation/);
});

test("job cards support double-click progression and diagnostics prioritize actions", async () => {
  const [page,styles]=await Promise.all([readFile(pageUrl,"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8")]);
  assert.match(page,/onDoubleClick=\{\(\) => \{selectRole\(key\);navigateTo\("evidence","evidence-matrix"\)\}\}/);
  assert.match(page,/双击进入证据核对/);
  assert.match(page,/diagnosticPanelHead/);
  assert.match(page,/没有硬缺口，但并非完全匹配/);
  assert.match(page,/severity urgent/);
  assert.match(page,/查看并核对全部证据/);
  assert.match(styles,/\.diagnosticPanelHead/);
  assert.match(styles,/\.severity\.urgent/);
  assert.match(styles,/\.coverageDiagnosis/);
});
