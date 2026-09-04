import { env } from "cloudflare:workers";
import { desc } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidate, candidateFile } from "../../../db/schema";
import { candidateSeed } from "../../../lib/workspace-seed";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = new Map([
  ["application/pdf", ".pdf"],
  ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"],
]);

type FileStore = { put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown> };

export async function GET() {
  const files = await getDb().select().from(candidateFile).orderBy(desc(candidateFile.createdAt)).limit(10);
  return Response.json({ files });
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("resume");
  if (!(file instanceof File)) return Response.json({ error: "请选择一份简历文件" }, { status: 400 });
  const extension = file.name.toLowerCase().match(/\.(pdf|docx)$/)?.[0];
  if (!extension || !ACCEPTED.has(file.type) || ACCEPTED.get(file.type) !== extension) {
    return Response.json({ error: "仅支持 PDF 或 DOCX 格式" }, { status: 415 });
  }
  if (file.size > MAX_BYTES) return Response.json({ error: "文件不能超过 10MB" }, { status: 413 });

  const id = crypto.randomUUID();
  const objectKey = `candidate/${candidateSeed.id}/source-resumes/${id}${extension}`;
  const store = (env as unknown as { FILES: FileStore }).FILES;
  await store.put(objectKey, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  const record = { id, candidateId: candidateSeed.id, kind: "source_resume" as const, filename: file.name, objectKey, contentType: file.type, size: file.size, status: "uploaded" as const, createdAt: new Date() };
  const db = getDb();
  await db.insert(candidate).values({ ...candidateSeed, updatedAt: new Date() }).onConflictDoNothing();
  await db.insert(candidateFile).values(record);
  return Response.json({ file: record, message: "原始简历已安全保存。系统不会自动覆盖证据库，请到证据补全页核对并补充事实。" }, { status: 201 });
}
