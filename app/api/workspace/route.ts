import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { application, applicationEvent, candidate, evidence, job, resumeReview, resumeVersion, targetRole } from "../../../db/schema";
import { candidateSeed, deepSeekSourceUrl, evidenceSeed, jobsSeed, targetRolesSeed } from "../../../lib/workspace-seed";
import { generateResume } from "../../../lib/resume-engine";
import { rewriteWithProvider, type ModelProvider } from "../../../lib/model-providers";
import { analyzeJobMatch } from "../../../lib/job-match";
import { checkJobAvailability } from "../../../lib/job-status";

export const dynamic = "force-dynamic";

function canonicalJobKey(rawUrl:string) {
  try {
    const value = new URL(rawUrl);
    const positionId = value.searchParams.get("positionId");
    const hashJobId = value.hash.match(/#\/job\/([^?&/]+)/)?.[1];
    if (positionId) return `${value.hostname}${value.pathname}?positionId=${positionId}`.toLowerCase();
    if (hashJobId) return `${value.hostname}${value.pathname}#/job/${hashJobId}`.toLowerCase();
    ["utm_source","utm_medium","utm_campaign","tid"].forEach(key => value.searchParams.delete(key));
    return `${value.hostname}${value.pathname}${value.search}`.replace(/\/$/,"").toLowerCase();
  } catch { return rawUrl.trim().toLowerCase(); }
}

function normalizedText(value:string) { return value.replace(/[\s·｜|_-]+/g,"").toLowerCase(); }

function builtInRoleId(title:string) {
  const value=normalizedText(title);
  if(value.includes("情感智能数据产品经理")) return "role-emotion";
  if(value.includes("AI创作数据产品经理")) return "role-writing";
  if(value.includes("通用Agent数据产品经理")) return "role-agent";
  return null;
}

function reviewRoleKey(targetRoleId:string) {
  return targetRoleId==="role-emotion"?"emotion":targetRoleId==="role-writing"?"writing":targetRoleId==="role-agent"?"agent":targetRoleId;
}

type ApplicationDecision = { interviewKit?: Record<string, unknown>; submissionPackage?: Record<string, unknown> };
function parseApplicationDecision(raw:string|null):ApplicationDecision {
  if(!raw)return {};
  try {
    const value=JSON.parse(raw) as Record<string,unknown>;
    if(value.interviewKit||value.submissionPackage)return value as ApplicationDecision;
    if(value.intro30&&value.applicationId)return {interviewKit:value};
  } catch {}
  return {};
}

async function syncBuiltInRoleDetails(db:ReturnType<typeof getDb>) {
  const [jobRows,roleRows]=await Promise.all([db.select().from(job),db.select().from(targetRole)]);
  for(const item of jobRows){const roleId=builtInRoleId(item.title);if(!roleId)continue;let meta:{requirements?:string;targetRoleId?:string;archived?:boolean;[key:string]:unknown}={};try{meta=JSON.parse(item.description);}catch{}if(meta.archived===true||!meta.requirements)continue;const target=roleRows.find(row=>row.id===roleId);if(!target)continue;let criteria:{score?:number;[key:string]:unknown}={};try{criteria=JSON.parse(target.criteriaJson);}catch{}await db.update(targetRole).set({title:item.title,criteriaJson:JSON.stringify({...criteria,company:item.company,sourceUrl:item.sourceUrl,requirements:meta.requirements,targetRoleId:roleId}),active:true}).where(eq(targetRole.id,roleId));if(meta.targetRoleId!==roleId)await db.update(job).set({description:JSON.stringify({...meta,targetRoleId:roleId})}).where(eq(job.id,item.id));}
}

async function syncRoleAnalyses(db:ReturnType<typeof getDb>) {
  const [jobRows,roleRows,evidenceRows]=await Promise.all([db.select().from(job),db.select().from(targetRole),db.select().from(evidence)]);
  for(const item of jobRows){
    let meta:{requirements?:string;targetRoleId?:string;archived?:boolean;[key:string]:unknown}={};try{meta=JSON.parse(item.description)}catch{}
    if(meta.archived===true||!meta.requirements)continue;
    const roleId=meta.targetRoleId||builtInRoleId(item.title)||item.externalId;
    const roleRow=roleRows.find(row=>row.id===roleId);if(!roleRow)continue;
    const analysis=analyzeJobMatch(meta.requirements,evidenceRows);
    let criteria:Record<string,unknown>={};try{criteria=JSON.parse(roleRow.criteriaJson)}catch{}
    const decision=analysis.score>=75?"优先投递":analysis.score>=60?"继续评估":"谨慎投递";
    await db.update(job).set({description:JSON.stringify({...meta,...analysis,decision})}).where(eq(job.id,item.id));
    await db.update(targetRole).set({criteriaJson:JSON.stringify({...criteria,...analysis,company:item.company,sourceUrl:item.sourceUrl,requirements:meta.requirements,targetRoleId:roleId})}).where(eq(targetRole.id,roleId));
  }
}

async function permanentlyDeleteJob(db:ReturnType<typeof getDb>, selected:typeof job.$inferSelect) {
  let meta:{targetRoleId?:string}={}; try{meta=JSON.parse(selected.description);}catch{}
  const roleId=meta.targetRoleId || builtInRoleId(selected.title) || selected.externalId;
  const related=await db.select().from(application).where(eq(application.jobId,selected.id));
  for(const item of related){await db.delete(applicationEvent).where(eq(applicationEvent.applicationId,item.id));await db.delete(resumeVersion).where(eq(resumeVersion.applicationId,item.id));await db.delete(application).where(eq(application.id,item.id));}
  await db.delete(job).where(eq(job.id,selected.id));
  if(roleId){
    const remaining=await db.select().from(job);
    const stillUsed=remaining.some(item=>{let itemMeta:{targetRoleId?:string}={};try{itemMeta=JSON.parse(item.description)}catch{}return (itemMeta.targetRoleId||builtInRoleId(item.title)||item.externalId)===roleId;});
    if(!stillUsed){await db.delete(resumeReview).where(eq(resumeReview.roleKey,reviewRoleKey(roleId)));await db.delete(targetRole).where(eq(targetRole.id,roleId));}
  }
}

async function purgeExpiredTrash(db:ReturnType<typeof getDb>) {
  const cutoff=Date.now()-30*24*60*60*1000; const rows=await db.select().from(job);
  for(const item of rows){try{const meta=JSON.parse(item.description);if(meta.archived===true && meta.archivedAt && new Date(meta.archivedAt).getTime()<cutoff) await permanentlyDeleteJob(db,item);}catch{}}
}

async function workspaceSnapshot() {
  const db = getDb();
  await purgeExpiredTrash(db);
  await syncBuiltInRoleDetails(db);
  await syncRoleAnalyses(db);
  const [candidates, evidenceRows, roleRows, jobRows, applications, resumes, reviews, events] = await Promise.all([
    db.select().from(candidate).where(eq(candidate.id,candidateSeed.id)),
    db.select().from(evidence),
    db.select().from(targetRole),
    db.select().from(job).orderBy(desc(job.discoveredAt)),
    db.select().from(application).orderBy(desc(application.createdAt)),
    db.select().from(resumeVersion).orderBy(desc(resumeVersion.createdAt)),
    db.select().from(resumeReview).orderBy(desc(resumeReview.createdAt)),
    db.select().from(applicationEvent).orderBy(desc(applicationEvent.occurredAt)),
  ]);
  const jobs = jobRows.filter(item => { try { return JSON.parse(item.description).archived !== true; } catch { return true; } });
  const trash = jobRows.filter(item => { try { return JSON.parse(item.description).archived === true; } catch { return false; } });
  return { candidate: candidates[0] ?? null, evidence: evidenceRows, targetRoles: roleRows, jobs, trash, applications, resumes, reviews, events };
}

export async function GET() {
  try {
    return NextResponse.json(await workspaceSnapshot());
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "读取工作台失败" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; id?: string; applicationId?:string; claim?: string; source?: string; confidence?: "verified" | "self_reported" | "unverified"; jobId?: string; jobIds?: string[]; targetRoleId?: string; roleKey?: string; strategy?: "balanced" | "transition" | "both"; template?: "ats" | "product" | "portfolio"; feedback?: string; reviewActions?: Record<string,string>; status?: "draft" | "confirmed"; company?: string; roleTitle?: string; dates?: string; responsibility?: string; result?: string; provider?: ModelProvider; apiKey?: string; roleTitleOverride?: string; requirements?: string; sourceUrl?: string; location?: string; displayName?:string; phone?:string; email?:string; yearsExperience?:string; currentCity?:string; stage?:string };
    const db = getDb();
    const now = new Date();

    if (body.action === "seed") {
      await db.insert(candidate).values({ ...candidateSeed, updatedAt: now }).onConflictDoUpdate({ target: candidate.id, set: { headline: candidateSeed.headline, profileJson: candidateSeed.profileJson, updatedAt: now } });
      for (const item of evidenceSeed) {
        await db.insert(evidence).values({ id: item.id, candidateId: candidateSeed.id, claim: item.claim, source: item.source, confidence: item.confidence, tagsJson: JSON.stringify(item.tags) }).onConflictDoNothing();
      }
      for (const item of targetRolesSeed) {
        await db.insert(targetRole).values({ id: item.id, candidateId: candidateSeed.id, title: item.title, narrative: item.narrative, criteriaJson: JSON.stringify(item.criteria), active: true }).onConflictDoNothing();
      }
      for (const item of jobsSeed) {
        await db.insert(job).values({
          id: `moka-${item.externalId}`,
          source: "moka",
          externalId: item.externalId,
          sourceUrl: `${deepSeekSourceUrl.split("#/jobs")[0]}#/job/${item.externalId}`,
          company: "DeepSeek",
          title: item.title,
          location: item.location,
          description: JSON.stringify({ department: "模型数据策略", score: item.score, decision: item.decision, category: item.category }),
          contentHash: `deepseek-${item.externalId}-2026-08-04`,
          discoveredAt: now,
        }).onConflictDoNothing();
      }
      return NextResponse.json(await workspaceSnapshot());
    }

    if(body.action==="updateCandidateProfile"){
      const existing=(await db.select().from(candidate)).find(item=>item.id===candidateSeed.id);
      let profile:Record<string,unknown>={};try{profile=JSON.parse(existing?.profileJson??candidateSeed.profileJson)}catch{}
      const nextProfile={...profile,phone:(body.phone??"").trim(),email:(body.email??"").trim(),location:(body.currentCity??body.location??"").trim(),yearsExperience:(body.yearsExperience??"").trim(),profileConfirmedAt:now.toISOString()};
      await db.insert(candidate).values({...candidateSeed,displayName:(body.displayName??candidateSeed.displayName).trim(),profileJson:JSON.stringify(nextProfile),updatedAt:now}).onConflictDoUpdate({target:candidate.id,set:{displayName:(body.displayName??existing?.displayName??candidateSeed.displayName).trim(),profileJson:JSON.stringify(nextProfile),updatedAt:now}});
      return NextResponse.json({...(await workspaceSnapshot()),profileSaved:true});
    }

    if (body.action === "updateEvidence" && body.id && body.claim && body.confidence) {
      await db.update(evidence).set({ claim: body.claim, source: body.source ?? "", confidence: body.confidence }).where(eq(evidence.id, body.id));
      return NextResponse.json(await workspaceSnapshot());
    }

    if (body.action === "addEvidence" && body.company && body.roleTitle && body.dates && body.responsibility && body.confidence) {
      await db.insert(candidate).values({ ...candidateSeed, updatedAt: now }).onConflictDoNothing();
      const id = `EV-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const claim = `${body.company}｜${body.roleTitle}｜${body.dates}：${body.responsibility}${body.result ? `；结果：${body.result}` : ""}`;
      await db.insert(evidence).values({ id, candidateId: candidateSeed.id, claim, source: body.source ?? "本人新增经历", confidence: body.confidence, tagsJson: JSON.stringify(["新增经历", body.company, body.roleTitle]) });
      return NextResponse.json({ ...(await workspaceSnapshot()), createdEvidenceId: id });
    }

    if (body.action === "addTargetRole" && body.company && body.roleTitle && body.requirements && body.sourceUrl) {
      await db.insert(candidate).values({ ...candidateSeed, updatedAt: now }).onConflictDoNothing();
      const analysis=analyzeJobMatch(body.requirements,await db.select().from(evidence));
      const existingJobs = await db.select().from(job);
      const duplicate = existingJobs.find(item => canonicalJobKey(item.sourceUrl) === canonicalJobKey(body.sourceUrl!) || (normalizedText(item.company) === normalizedText(body.company!) && normalizedText(item.title) === normalizedText(body.roleTitle!)));
      if (duplicate) {
        let previous:{ targetRoleId?:string; score?:number; decision?:string; category?:string; [key:string]:unknown } = {};
        try { previous = JSON.parse(duplicate.description); } catch {}
        const existingRoleId = builtInRoleId(body.roleTitle) || previous.targetRoleId || duplicate.externalId;
        const matchingRole = (await db.select().from(targetRole)).find(item => item.id === existingRoleId);
        let previousCriteria:{ score?:number; [key:string]:unknown } = {};
        try { if (matchingRole) previousCriteria = JSON.parse(matchingRole.criteriaJson); } catch {}
        const score = analysis.score;
        const criteria = { ...previousCriteria, ...analysis, sourceUrl:body.sourceUrl, company:body.company, requirements:body.requirements, targetRoleId:existingRoleId };
        await db.update(job).set({ sourceUrl:body.sourceUrl, company:body.company, title:body.roleTitle, location:body.location || null, description:JSON.stringify({ ...previous, score, decision:previous.decision ?? "待完成岗位分析", category:previous.category ?? "non_technical", targetRoleId:existingRoleId, requirements:body.requirements, archived:false, archivedAt:null }), contentHash:`updated-${crypto.randomUUID()}`, discoveredAt:now }).where(eq(job.id, duplicate.id));
        if (matchingRole) await db.update(targetRole).set({ title:body.roleTitle, narrative:`围绕「${body.roleTitle}」拆解岗位要求，并用统一证据库生成平衡版与强转型版简历。`, criteriaJson:JSON.stringify(criteria), active:true }).where(eq(targetRole.id, existingRoleId));
        return NextResponse.json({ ...(await workspaceSnapshot()), createdTargetRoleId:existingRoleId, deduplicated:true, importMessage:"检测到同一岗位：已更新原岗位明细，原申请与审核历史均已保留。" });
      }
      const roleId = `role-${crypto.randomUUID().slice(0, 8)}`;
      const jobId = `manual-${crypto.randomUUID().slice(0, 8)}`;
      const applicationId = crypto.randomUUID();
      const criteria = { ...analysis, sourceUrl: body.sourceUrl, company: body.company, requirements: body.requirements, targetRoleId: roleId };
      await db.insert(targetRole).values({ id: roleId, candidateId: candidateSeed.id, title: body.roleTitle, narrative: `围绕「${body.roleTitle}」拆解岗位要求，并用统一证据库生成平衡版与强转型版简历。`, criteriaJson: JSON.stringify(criteria), active: true });
      await db.insert(job).values({ id: jobId, source: "manual", externalId: roleId, sourceUrl: body.sourceUrl, company: body.company, title: body.roleTitle, location: body.location || null, description: JSON.stringify({ ...analysis, decision: analysis.score>=75?"优先投递":analysis.score>=60?"继续评估":"谨慎投递", category: "non_technical", targetRoleId: roleId, requirements: body.requirements }), contentHash: `manual-${roleId}`, discoveredAt: now });
      await db.insert(application).values({ id: applicationId, jobId, targetRoleId: roleId, status: "role_analysis", createdAt: now });
      await db.insert(applicationEvent).values({ id: crypto.randomUUID(), applicationId, eventType: "target_role_added", fromStatus: null, toStatus: "role_analysis", source: "user", note: "新增目标岗位并创建申请草稿；尚未进入外部投递页面。", occurredAt: now });
      return NextResponse.json({ ...(await workspaceSnapshot()), createdTargetRoleId: roleId, createdApplicationId: applicationId });
    }

    if (body.action === "syncJobStatuses") {
      const rows=await db.select().from(job);
      const activeRows=rows.filter(item=>{try{return JSON.parse(item.description).archived!==true}catch{return true}}).slice(0,30);
      const checks=await Promise.all(activeRows.map(async item=>({item,availability:await checkJobAvailability(item.sourceUrl)})));
      for(const {item,availability} of checks){
        let meta:Record<string,unknown>={};try{meta=JSON.parse(item.description)}catch{}
        await db.update(job).set({description:JSON.stringify({...meta,jobStatus:availability.status,statusCheckedAt:availability.checkedAt,statusMessage:availability.message,statusSource:availability.source})}).where(eq(job.id,item.id));
      }
      return NextResponse.json({...(await workspaceSnapshot()),statusSync:{checked:checks.length,open:checks.filter(x=>x.availability.status==="open").length,closed:checks.filter(x=>x.availability.status==="closed").length,unknown:checks.filter(x=>x.availability.status==="unknown").length}});
    }

    if (body.action === "deleteTargetRole" && body.jobId) {
      const selected = (await db.select().from(job)).find(item => item.id === body.jobId);
      if (!selected) return NextResponse.json({ error:"岗位不存在或已经移除" }, { status:404 });
      let meta:{ targetRoleId?:string; [key:string]:unknown } = {};
      try { meta = JSON.parse(selected.description); } catch {}
      const roleId = meta.targetRoleId || builtInRoleId(selected.title) || selected.externalId;
      await db.update(job).set({ description:JSON.stringify({ ...meta, archived:true, archivedAt:now.toISOString() }) }).where(eq(job.id, selected.id));
      if (roleId) await db.update(targetRole).set({ active:false }).where(eq(targetRole.id, roleId));
      const related = (await db.select().from(application)).filter(item => item.jobId === selected.id);
      for (const item of related) await db.insert(applicationEvent).values({ id:crypto.randomUUID(), applicationId:item.id, eventType:"target_role_archived", fromStatus:item.status, toStatus:item.status, source:"user", note:"用户从目标岗位列表移除该岗位；申请与审核历史保留。", occurredAt:now });
      return NextResponse.json({ ...(await workspaceSnapshot()), deletedJobId:selected.id, deletedTargetRoleId:roleId });
    }

    if (body.action === "batchDeleteTargetRoles" && body.jobIds?.length) {
      const requestedIds = [...new Set(body.jobIds)].slice(0, 100);
      const allJobs = await db.select().from(job);
      const selectedJobs = allJobs.filter(item => requestedIds.includes(item.id));
      if (!selectedJobs.length) return NextResponse.json({ error:"没有找到可删除的岗位" }, { status:404 });
      for (const selected of selectedJobs) {
        let meta:{ targetRoleId?:string; archived?:boolean; [key:string]:unknown } = {};
        try { meta = JSON.parse(selected.description); } catch {}
        if (meta.archived) continue;
        const roleId = meta.targetRoleId || builtInRoleId(selected.title) || selected.externalId;
        await db.update(job).set({ description:JSON.stringify({ ...meta, archived:true, archivedAt:now.toISOString() }) }).where(eq(job.id, selected.id));
        if (roleId) await db.update(targetRole).set({ active:false }).where(eq(targetRole.id, roleId));
        const related = (await db.select().from(application)).filter(item => item.jobId === selected.id);
        for (const item of related) await db.insert(applicationEvent).values({ id:crypto.randomUUID(), applicationId:item.id, eventType:"target_role_archived", fromStatus:item.status, toStatus:item.status, source:"user", note:"用户批量移除目标岗位；申请、简历与审核历史保留。", occurredAt:now });
      }
      return NextResponse.json({ ...(await workspaceSnapshot()), deletedJobIds:selectedJobs.map(item=>item.id), deletedCount:selectedJobs.length });
    }

    if (body.action === "restoreTargetRole" && body.jobId) {
      const selected=(await db.select().from(job)).find(item=>item.id===body.jobId); if(!selected)return NextResponse.json({error:"回收站中未找到该岗位"},{status:404});
      let meta:{targetRoleId?:string;[key:string]:unknown}={};try{meta=JSON.parse(selected.description);}catch{} delete meta.archived; delete meta.archivedAt;
      const roleId=meta.targetRoleId || builtInRoleId(selected.title) || selected.externalId;
      await db.update(job).set({description:JSON.stringify(meta)}).where(eq(job.id,selected.id)); if(roleId)await db.update(targetRole).set({active:true}).where(eq(targetRole.id,roleId));
      return NextResponse.json({...(await workspaceSnapshot()),restoredJobId:selected.id});
    }

    if (body.action === "permanentlyDeleteTargetRole" && body.jobId) {
      const selected=(await db.select().from(job)).find(item=>item.id===body.jobId); if(!selected)return NextResponse.json({error:"岗位不存在"},{status:404}); await permanentlyDeleteJob(db,selected); return NextResponse.json(await workspaceSnapshot());
    }

    if (body.action === "generateResumePair" && body.roleKey && body.reviewActions) {
      await db.insert(candidate).values({ ...candidateSeed, updatedAt: now }).onConflictDoNothing();
      for (const item of evidenceSeed) {
        await db.insert(evidence).values({ id: item.id, candidateId: candidateSeed.id, claim: item.claim, source: item.source, confidence: item.confidence, tagsJson: JSON.stringify(item.tags) }).onConflictDoNothing();
      }
      const evidenceRows = await db.select().from(evidence).where(eq(evidence.candidateId, candidateSeed.id));
      const existing = await db.select().from(resumeReview).orderBy(desc(resumeReview.version));
      let version = existing.find(item => item.roleKey === body.roleKey)?.version ?? 1;
      const template = body.template ?? "ats";
      const pair: Array<{ id:string; version:number; strategy:"balanced"|"transition"; content:ReturnType<typeof generateResume> }> = [];
      for (const strategy of ["balanced", "transition"] as const) {
        version += 1;
        const id = crypto.randomUUID();
        const base = generateResume(body.roleKey, strategy, template, body.feedback ?? "", evidenceRows, body.roleTitleOverride);
        const content = await rewriteWithProvider(body.provider ?? "local", body.apiKey ?? "", base, evidenceRows);
        const evidenceMap = Object.fromEntries([content.summary, ...content.advantages, ...content.projects.flatMap(item => item.bullets), ...content.experience.flatMap(item => item.bullets)].map((item, index) => [`claim-${index + 1}`, item.evidenceIds]));
        await db.insert(resumeReview).values({ id, candidateId: candidateSeed.id, roleKey: body.roleKey, version, strategy, template, feedback: body.feedback ?? "", actionsJson: JSON.stringify(body.reviewActions), contentJson: JSON.stringify(content), evidenceMapJson: JSON.stringify(evidenceMap), status: "draft", createdAt: new Date(now.getTime() + version) });
        pair.push({ id, version, strategy, content });
      }
      return NextResponse.json({ ...(await workspaceSnapshot()), generatedPair: pair });
    }

    if ((body.action === "regenerateReview" || body.action === "confirmReview") && body.roleKey && body.strategy && body.reviewActions) {
      await db.insert(candidate).values({ ...candidateSeed, updatedAt: now }).onConflictDoNothing();
      for (const item of evidenceSeed) {
        await db.insert(evidence).values({ id: item.id, candidateId: candidateSeed.id, claim: item.claim, source: item.source, confidence: item.confidence, tagsJson: JSON.stringify(item.tags) }).onConflictDoNothing();
      }
      const existing = await db.select().from(resumeReview).orderBy(desc(resumeReview.version));
      const latest = existing.find(item => item.roleKey === body.roleKey);
      const selectedDraft = existing.find(item => item.roleKey === body.roleKey && item.strategy === body.strategy) ?? latest;
      if (body.action === "confirmReview" && selectedDraft?.contentJson) {
        await db.update(resumeReview).set({ template: body.template ?? selectedDraft.template, feedback: body.feedback ?? selectedDraft.feedback, actionsJson: JSON.stringify(body.reviewActions), status: "confirmed" }).where(eq(resumeReview.id, selectedDraft.id));
        return NextResponse.json({ ...(await workspaceSnapshot()), savedReview: { id: selectedDraft.id, version: selectedDraft.version, status: "confirmed" } });
      }
      const version = (latest?.version ?? 1) + 1;
      const id = crypto.randomUUID();
      const evidenceRows = await db.select().from(evidence).where(eq(evidence.candidateId, candidateSeed.id));
      const template = body.template ?? "ats";
      const baseContent = generateResume(body.roleKey, body.strategy, template, body.feedback ?? "", evidenceRows, body.roleTitleOverride);
      const content = await rewriteWithProvider(body.provider ?? "local", body.apiKey ?? "", baseContent, evidenceRows);
      const evidenceMap = Object.fromEntries([
        content.summary,
        ...content.advantages,
        ...content.projects.flatMap(item => item.bullets),
        ...content.experience.flatMap(item => item.bullets),
      ].map((item, index) => [`claim-${index + 1}`, item.evidenceIds]));
      await db.insert(resumeReview).values({ id, candidateId: candidateSeed.id, roleKey: body.roleKey, version, strategy: body.strategy, template, feedback: body.feedback ?? "", actionsJson: JSON.stringify(body.reviewActions), contentJson: JSON.stringify(content), evidenceMapJson: JSON.stringify(evidenceMap), status: body.action === "confirmReview" ? "confirmed" : "draft", createdAt: now });
      return NextResponse.json({ ...(await workspaceSnapshot()), savedReview: { id, version, status: body.action === "confirmReview" ? "confirmed" : "draft", content } });
    }

    if (body.action === "createApplication" && body.jobId && body.targetRoleId) {
      const selectedJob=(await db.select().from(job)).find(item=>item.id===body.jobId);
      let selectedMeta:{jobStatus?:string}={};try{if(selectedJob)selectedMeta=JSON.parse(selectedJob.description)}catch{}
      if(selectedMeta.jobStatus==="closed")return NextResponse.json({error:"该岗位官网已显示下线或失效，不能继续创建申请。可先重新同步或打开官网人工复核。"},{status:409});
      const currentApplications=await db.select().from(application);
      const existing=currentApplications.find(item=>item.jobId===body.jobId&&item.targetRoleId===body.targetRoleId);
      if(existing) return NextResponse.json({...(await workspaceSnapshot()),applicationId:existing.id,deduplicated:true,nextStep:"resume_review"});
      const id = crypto.randomUUID();
      await db.insert(application).values({ id, jobId: body.jobId, targetRoleId: body.targetRoleId, status: "resume_review", createdAt: now });
      await db.insert(applicationEvent).values({ id: crypto.randomUUID(), applicationId: id, eventType: "application_created", fromStatus: null, toStatus: "resume_review", source: "user", note: "创建申请草稿，未进入投递页面", occurredAt: now });
      return NextResponse.json({...(await workspaceSnapshot()),applicationId:id,deduplicated:false,nextStep:"resume_review"});
    }

    if(body.action==="prepareApplication"&&body.applicationId){
      const selected=(await db.select().from(application)).find(item=>item.id===body.applicationId);
      if(!selected)return NextResponse.json({error:"申请记录不存在"},{status:404});
      const selectedJob=(await db.select().from(job)).find(item=>item.id===selected.jobId);
      if(!selectedJob)return NextResponse.json({error:"关联岗位不存在"},{status:404});
      let jobMeta:{archived?:boolean;jobStatus?:string;statusCheckedAt?:string;statusMessage?:string}={};try{jobMeta=JSON.parse(selectedJob.description)}catch{}
      if(jobMeta.archived)return NextResponse.json({error:"岗位已在回收站，请先恢复岗位"},{status:409});
      const availability=await checkJobAvailability(selectedJob.sourceUrl);
      jobMeta={...jobMeta,jobStatus:availability.status,statusCheckedAt:availability.checkedAt,statusMessage:availability.message};
      await db.update(job).set({description:JSON.stringify(jobMeta)}).where(eq(job.id,selectedJob.id));
      if(availability.status==="closed")return NextResponse.json({error:"官网复核显示该岗位已经下线或失效，系统已停止生成投递包，避免继续浪费准备时间。"},{status:409});
      const confirmed=(await db.select().from(resumeReview)).filter(item=>item.roleKey===reviewRoleKey(selected.targetRoleId)&&item.status==="confirmed"&&item.contentJson).sort((a,b)=>b.version-a.version)[0];
      if(!confirmed)return NextResponse.json({error:"请先生成并确认该岗位的简历"},{status:409});
      const host=(()=>{try{return new URL(selectedJob.sourceUrl).hostname}catch{return ""}})();
      const adapter=host.includes("mokahr.com")?"Moka":host.includes("antgroup.com")?"蚂蚁招聘":host||"通用官网";
      const submissionPackage={applicationId:selected.id,jobId:selected.jobId,company:selectedJob.company,roleTitle:selectedJob.title,jobUrl:selectedJob.sourceUrl,adapter,resumeReviewId:confirmed.id,resumeVersion:confirmed.version,resumeStrategy:confirmed.strategy,resumeTemplate:confirmed.template,resumeDownloadUrl:`/api/generated-resume/${confirmed.id}`,preparedAt:now.toISOString(),status:"awaiting_human_confirmation",checks:{jobAndResume:true,contact:false,sensitiveAnswers:false,finalSubmit:false}};
      const state=parseApplicationDecision(selected.decisionJson);state.submissionPackage=submissionPackage;
      await db.update(application).set({status:"application_preflight",decisionJson:JSON.stringify(state)}).where(eq(application.id,selected.id));
      await db.insert(applicationEvent).values({id:crypto.randomUUID(),applicationId:selected.id,eventType:"submission_package_prepared",fromStatus:selected.status,toStatus:"application_preflight",source:"user",note:`已锁定简历 v${confirmed.version} 并生成投递前检查包；未打开或提交招聘表。`,occurredAt:now});
      return NextResponse.json({...(await workspaceSnapshot()),submissionPackage});
    }

    if(body.action==="updateApplicationStage"&&body.applicationId&&body.stage){
      const allowed=["role_analysis","resume_review","application_preflight","submitted","written_test","interview_ready","interview","offer","rejected","withdrawn"];
      if(!allowed.includes(body.stage))return NextResponse.json({error:"不支持的申请状态"},{status:400});
      const selected=(await db.select().from(application)).find(item=>item.id===body.applicationId);if(!selected)return NextResponse.json({error:"申请记录不存在"},{status:404});
      await db.update(application).set({status:body.stage}).where(eq(application.id,selected.id));
      await db.insert(applicationEvent).values({id:crypto.randomUUID(),applicationId:selected.id,eventType:"application_stage_updated",fromStatus:selected.status,toStatus:body.stage,source:"user",note:"候选人更新求职进度。",occurredAt:now});
      return NextResponse.json(await workspaceSnapshot());
    }
    if(body.action==="markApplicationSubmitted"&&body.applicationId){
      const selected=(await db.select().from(application)).find(item=>item.id===body.applicationId);if(!selected)return NextResponse.json({error:"申请记录不存在"},{status:404});
      const state=parseApplicationDecision(selected.decisionJson);if(!state.submissionPackage)return NextResponse.json({error:"请先生成投递包"},{status:409});
      await db.update(application).set({status:"submitted",decisionJson:JSON.stringify({...state,submittedAt:now.toISOString()})}).where(eq(application.id,selected.id));
      await db.insert(applicationEvent).values({id:crypto.randomUUID(),applicationId:selected.id,eventType:"application_submitted_confirmed",fromStatus:selected.status,toStatus:"submitted",source:"user",note:"候选人确认已在招聘官网完成投递。",occurredAt:now});
      return NextResponse.json({...(await workspaceSnapshot()),submittedApplicationId:selected.id});
    }

    if(body.action==="generateInterviewKit"&&body.applicationId){
      const selected=(await db.select().from(application)).find(item=>item.id===body.applicationId);if(!selected)return NextResponse.json({error:"申请记录不存在"},{status:404});
      const confirmed=(await db.select().from(resumeReview)).some(item=>item.roleKey===reviewRoleKey(selected.targetRoleId)&&item.status==="confirmed");
      if(!confirmed)return NextResponse.json({error:"请先生成并确认该岗位的简历，再进入面试准备"},{status:409});
      const [selectedJob]=(await db.select().from(job)).filter(item=>item.id===selected.jobId);const roleRow=(await db.select().from(targetRole)).find(item=>item.id===selected.targetRoleId);const evidenceRows=await db.select().from(evidence);let meta:{requirements?:string}={};try{meta=JSON.parse(selectedJob.description)}catch{}
      const strongest=evidenceRows.filter(item=>item.confidence!=="unverified").slice(0,3);const risks=evidenceRows.filter(item=>item.confidence==="unverified").slice(0,3);
      const kit={applicationId:selected.id,jobId:selected.jobId,roleId:selected.targetRoleId,roleTitle:selectedJob.title,company:selectedJob.company,positioning:`以产品运营、用户洞察和跨团队推进经验切入 ${selectedJob.title}，所有结论继续绑定真实证据。`,pillars:strongest.map(item=>({evidenceId:item.id,title:item.claim})),intro30:`我有长期互联网产品运营与内容生态经验，擅长从用户反馈和业务数据中定位问题，并推动产品改进。针对 ${selectedJob.title}，我最相关的优势是用户洞察、Badcase 归因和跨团队落地。`,intro90:`我过去的经历横跨平台、产品运营和内容生态。工作中不仅关注执行，也持续从用户反馈和数据中发现问题、推动产品与研发协同解决。现在转向 ${selectedJob.title}，是因为这些能力可以迁移到 AI 产品的场景理解、质量判断和迭代闭环。面试中我会重点展开三段有证据支撑的经历，并明确说明尚未补齐的模型经验。`,questions:["请介绍一个从用户反馈中发现产品问题并推动解决的案例","你如何定义和分析一个 Badcase","为什么从原行业转向 AI 产品经理","如何判断一项 AI 能力是否真正改善了用户体验"],caseFramework:["澄清目标用户与使用场景","定义成功指标与失败样本","拆解产品、模型、数据和交互环节","设计最小验证方案","复盘指标与下一轮迭代"],riskQuestions:risks.map(item=>({evidenceId:item.id,question:`${item.claim}目前仍待验证，面试时如何准确说明边界？`})),reverseQuestions:["这个岗位当前最关键的业务目标和质量指标是什么？","团队如何划分产品、模型与数据策略的协作边界？","入职前三个月最希望新成员解决什么问题？"],jdSnapshot:meta.requirements??roleRow?.narrative??""};
      const state=parseApplicationDecision(selected.decisionJson);state.interviewKit=kit;
      await db.update(application).set({status:state.submissionPackage?"application_preflight":"interview_ready",decisionJson:JSON.stringify(state)}).where(eq(application.id,selected.id));await db.insert(applicationEvent).values({id:crypto.randomUUID(),applicationId:selected.id,eventType:"interview_kit_generated",fromStatus:selected.status,toStatus:state.submissionPackage?"application_preflight":"interview_ready",source:"user",note:"依据岗位、确认简历和证据库生成面试准备包",occurredAt:now});return NextResponse.json({...(await workspaceSnapshot()),interviewKit:kit});
    }

    return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "保存失败" }, { status: 500 });
  }
}
