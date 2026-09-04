type MokaJob = Record<string, unknown>;

export type ImportedMokaJob = {
  company: string;
  roleTitle: string;
  location: string;
  requirements: string;
  sourceUrl: string;
  readMode: string;
};

function decodeHtmlAttribute(value: string) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function text(value: unknown) {
  return typeof value === "string"
    ? value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/&amp;/gi, "&").replace(/[ \t]+/g, " ").replace(/\n\s+/g, "\n").trim()
    : "";
}

function firstString(job: MokaJob, keys: string[]) {
  for (const key of keys) {
    const value = text(job[key]);
    if (value) return value;
  }
  return "";
}

function locationText(job: MokaJob) {
  const rows = Array.isArray(job.locations) ? job.locations : job.location ? [job.location] : [];
  const values = rows.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const item = row as Record<string, unknown>;
    return [item.cityName, item.name, item.address].map(text).filter(Boolean);
  });
  return [...new Set(values)].join(" / ") || firstString(job, ["locationName", "workLocation", "location"]);
}

async function decryptMokaPayload(payload: { data?: unknown; necromancer?: unknown }, iv: string) {
  if (typeof payload.data !== "string" || typeof payload.necromancer !== "string") return payload as unknown as MokaJob;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(payload.necromancer), { name: "AES-CBC" }, false, ["decrypt"]);
  const encrypted = Uint8Array.from(atob(payload.data), (char) => char.charCodeAt(0));
  const decoded = await crypto.subtle.decrypt({ name: "AES-CBC", iv: new TextEncoder().encode(iv) }, key, encrypted);
  return JSON.parse(new TextDecoder().decode(decoded)) as MokaJob;
}

export function isMokaUrl(target: URL) {
  return target.hostname === "app.mokahr.com" && /\/social-recruitment\//.test(target.pathname);
}

export async function importMokaJob(target: URL): Promise<ImportedMokaJob> {
  const jobId = target.hash.match(/#\/job\/([^?&/]+)/)?.[1];
  const path = target.pathname.match(/^\/social-recruitment\/([^/]+)\/(\d+)/);
  if (!jobId || !path) throw new Error("链接中缺少 Moka 职位 ID，请复制职位详情页的完整链接");

  const [, orgSlug, siteId] = path;
  const portalUrl = new URL(`/social-recruitment/${orgSlug}/${siteId}`, target.origin);
  const pageResponse = await fetch(portalUrl, { headers: { accept: "text/html,application/xhtml+xml", "user-agent": "JobCraft/1.0 (candidate-owned job research)" } });
  if (!pageResponse.ok) throw new Error(`Moka 招聘页暂时无法访问（${pageResponse.status}）`);
  const html = await pageResponse.text();
  const initMatch = html.match(/<input[^>]+id=["']init-data["'][^>]+value=(["'])([\s\S]*?)\1[^>]*>/i);
  if (!initMatch) throw new Error("Moka 未返回公开岗位初始化数据");
  const init = JSON.parse(decodeHtmlAttribute(initMatch[2])) as Record<string, unknown>;
  const org = (init.org && typeof init.org === "object" ? init.org : {}) as Record<string, unknown>;
  const orgId = text(org.id) || orgSlug;
  const aesIv = text(init.aesIv);
  if (!aesIv) throw new Error("Moka 公开页面缺少岗位详情解码参数");

  const detailResponse = await fetch(`${target.origin}/api/outer/ats-apply/website/job`, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", referer: portalUrl.toString() },
    body: JSON.stringify({ orgId, siteId, jobId, locale: "zh-CN" }),
  });
  const raw = await detailResponse.text();
  let envelope: { data?: unknown; necromancer?: unknown; message?: string };
  try { envelope = JSON.parse(raw); }
  catch { throw new Error("Moka 岗位详情接口暂未返回结构化数据"); }
  if (!detailResponse.ok) throw new Error(text(envelope.message) || `Moka 岗位详情读取失败（${detailResponse.status}）`);
  const decoded = await decryptMokaPayload(envelope, aesIv);
  const job = decoded.data && typeof decoded.data === "object" ? decoded.data as MokaJob : decoded;

  const roleTitle = firstString(job, ["title", "name", "jobTitle"]);
  const description = firstString(job, ["description", "jobDescription", "responsibility", "responsibilities"]);
  const requirement = firstString(job, ["requirement", "requirements", "qualification", "qualifications"]);
  const requirements = [description && `【工作职责】\n${description}`, requirement && `【任职要求】\n${requirement}`].filter(Boolean).join("\n\n");
  if (!roleTitle || !requirements) throw new Error("Moka 返回了职位，但职位名称或完整 JD 为空；该职位可能已下架，请手工粘贴 JD");

  return {
    company: text(org.displayName) || text(org.name) || orgSlug,
    roleTitle,
    location: locationText(job),
    requirements,
    sourceUrl: target.toString(),
    readMode: "Moka 通用公开职位适配器",
  };
}
