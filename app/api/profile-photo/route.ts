import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { candidate, candidateFile } from "../../../db/schema";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = new Map([["image/jpeg",".jpg"],["image/png",".png"]]);
type StoredObject = { body:ReadableStream; httpMetadata?:{ contentType?:string } };
type FileStore = { put(key:string,value:ArrayBuffer,options?:{httpMetadata?:{contentType?:string}}):Promise<unknown>; get(key:string):Promise<StoredObject|null>; delete(key:string):Promise<void> };
const store = () => (env as unknown as { FILES:FileStore }).FILES;

export async function GET(request:Request) {
  const db=getDb(); const id=new URL(request.url).searchParams.get("id");
  if(id){ const row=(await db.select().from(candidateFile).where(eq(candidateFile.id,id)))[0]; if(!row || row.kind!=="profile_photo") return Response.json({error:"照片不存在"},{status:404}); const object=await store().get(row.objectKey); if(!object) return Response.json({error:"照片文件不存在"},{status:404}); return new Response(object.body,{headers:{"Content-Type":row.contentType,"Cache-Control":"private, no-store"}}); }
  const row=(await db.select().from(candidateFile).where(eq(candidateFile.kind,"profile_photo")).orderBy(desc(candidateFile.createdAt)).limit(1))[0];
  return Response.json({ photo:row ? {...row,url:`/api/profile-photo?id=${row.id}`} : null });
}

export async function POST(request:Request) {
  let form:FormData;
  try { form=await request.formData(); }
  catch { return Response.json({error:"照片数据未能完整接收，请缩小图片后重试"},{status:413}); }
  const file=form.get("photo");
  if(!(file instanceof File)) return Response.json({error:"请选择一张个人形象照"},{status:400});
  if(!ACCEPTED.has(file.type)) return Response.json({error:"仅支持 JPG 或 PNG 图片"},{status:415});
  if(file.size>MAX_BYTES) return Response.json({error:"照片不能超过 5MB"},{status:413});
  const db=getDb(); const old=await db.select().from(candidateFile).where(eq(candidateFile.kind,"profile_photo"));
  for(const item of old){ await store().delete(item.objectKey); await db.delete(candidateFile).where(eq(candidateFile.id,item.id)); }
  await db.insert(candidate).values({id:"candidate-001",displayName:"示例候选人",headline:"互联网平台、产品运营与内容生态背景，转向 AI 数据产品岗位",profileJson:"{}",updatedAt:new Date()}).onConflictDoNothing();
  const id=crypto.randomUUID(), extension=ACCEPTED.get(file.type)!; const objectKey=`candidate/candidate-001/profile/${id}${extension}`;
  await store().put(objectKey,await file.arrayBuffer(),{httpMetadata:{contentType:file.type}});
  const record={id,candidateId:"candidate-001",kind:"profile_photo" as const,filename:file.name,objectKey,contentType:file.type,size:file.size,status:"uploaded" as const,createdAt:new Date()}; await db.insert(candidateFile).values(record);
  return Response.json({photo:{...record,url:`/api/profile-photo?id=${id}`},message:"形象照已保存，并会用于新生成的简历 PDF"},{status:201});
}

export async function DELETE() {
  const db=getDb(); const old=await db.select().from(candidateFile).where(eq(candidateFile.kind,"profile_photo")); for(const item of old){await store().delete(item.objectKey);await db.delete(candidateFile).where(eq(candidateFile.id,item.id));} return Response.json({message:"形象照已删除"});
}
