import { env } from "cloudflare:workers";
import { desc, eq } from "drizzle-orm";
import { PDFDocument, PDFFont, PDFPage, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { getDb } from "../../../../db";
import { candidateFile, resumeReview } from "../../../../db/schema";
import type { GeneratedResume, ResumeBullet } from "../../../../lib/resume-engine";

const A4: [number, number] = [595.28, 841.89];

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = []; let line = "";
  for (const char of text) {
    const next = line + char;
    if (line && font.widthOfTextAtSize(next, size) > maxWidth) { lines.push(line); line = char; } else line = next;
  }
  if (line) lines.push(line); return lines;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const rows = await getDb().select().from(resumeReview).where(eq(resumeReview.id, id));
  const record = rows[0];
  if (!record?.contentJson) return Response.json({ error: "该版本还没有可导出的正文" }, { status: 404 });
  const resume = JSON.parse(record.contentJson) as GeneratedResume;
  const fontResponse = await env.ASSETS.fetch(new Request(new URL("/fonts/SourceHanSansCN-Regular.otf", request.url)));
  if (!fontResponse.ok) return Response.json({ error: "中文字体加载失败" }, { status: 500 });

  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  // Source Han's CFF outlines render reliably in pdf-lib when embedded as a complete font.
  const font = await pdf.embedFont(await fontResponse.arrayBuffer(), { subset: false });
  const template = resume.meta.template ?? "ats";
  const photoRecord=(await getDb().select().from(candidateFile).where(eq(candidateFile.kind,"profile_photo")).orderBy(desc(candidateFile.createdAt)).limit(1))[0];
  let profileImage:Awaited<ReturnType<typeof pdf.embedPng>>|null=null;
  if(photoRecord){try{const object=await (env as unknown as {FILES:{get(key:string):Promise<{arrayBuffer():Promise<ArrayBuffer>}|null>}}).FILES.get(photoRecord.objectKey);if(object){const bytes=await object.arrayBuffer();profileImage=photoRecord.contentType==="image/png"?await pdf.embedPng(bytes):await pdf.embedJpg(bytes);}}catch{}}
  const ink = rgb(0.08,0.13,0.18), muted = rgb(0.38,0.45,0.52);
  const accent = template === "product" ? rgb(.38,.23,.76) : template === "portfolio" ? rgb(.08,.48,.43) : rgb(0.19,0.36,0.61);
  let page: PDFPage = pdf.addPage(A4); let y = 785;
  const addPage = () => { page = pdf.addPage(A4); y = 792; };
  const ensure = (height: number) => { if (y - height < 50) addPage(); };
  const text = (value: string, x: number, size: number, color = ink, maxWidth = 495, leading = size * 1.55) => {
    const lines = wrap(value, font, size, maxWidth); ensure(lines.length * leading + 3);
    for (const line of lines) { page.drawText(line, { x, y, size, font, color }); y -= leading; }
    return lines.length;
  };
  const section = (title: string) => {
    ensure(34); y -= 5;
    if (template === "product") page.drawRectangle({x:46,y:y-4,width:503,height:21,color:rgb(.95,.93,.99)});
    if (template === "portfolio") page.drawRectangle({x:48,y:y-4,width:3,height:18,color:accent});
    page.drawText(title,{x:template === "portfolio" ? 58 : 50,y,size:12,font,color:template === "ats" ? ink : accent}); y -= 8;
    if (template === "ats") page.drawLine({start:{x:50,y},end:{x:545,y},thickness:.8,color:rgb(.25,.29,.34)});
    else if (template === "portfolio") page.drawLine({start:{x:58,y},end:{x:545,y},thickness:.65,color:accent});
    y -= 17;
  };
  const bullet = (item: ResumeBullet) => { text(`• ${item.text}`,60,8.6,ink,480,13.2); y -= 2; };
  const job = (item: GeneratedResume["experience"][number]) => { ensure(55); page.drawText(`${item.company}｜${item.role}`,{x:50,y,size:9.4,font,color:ink}); const dateWidth=font.widthOfTextAtSize(item.dates,8); page.drawText(item.dates,{x:545-dateWidth,y,size:8,font,color:muted}); y-=15; item.bullets.forEach(bullet); y-=4; };

  if (template === "ats") page.drawLine({start:{x:50,y:817},end:{x:545,y:817},thickness:2,color:accent});
  if (template === "product") page.drawRectangle({x:0,y:816,width:595.28,height:26,color:accent});
  if (template === "portfolio") page.drawRectangle({x:0,y:0,width:7,height:841.89,color:accent});
  page.drawText(resume.profile.name,{x:50,y,size:24,font,color:ink});
  if(profileImage){const scale=Math.min(72/profileImage.width,88/profileImage.height);const width=profileImage.width*scale,height=profileImage.height*scale;page.drawImage(profileImage,{x:545-width,y:704+88-height,width,height});}
  const contact = `${resume.profile.location}  ${resume.profile.phone}  ${resume.profile.email}`; page.drawText(contact,{x:profileImage?50:545-font.widthOfTextAtSize(contact,8),y:profileImage?y-17:y+8,size:8,font,color:muted}); y-=profileImage?43:25;
  page.drawText(`目标岗位：${resume.profile.target}`,{x:50,y,size:10,font,color:accent}); y-=24;
  section("自我评价"); bullet(resume.summary);
  section("我的优势"); resume.advantages.forEach(bullet);
  section("AI 实践与作品"); resume.projects.forEach(item => { text(item.title,50,9.3,ink); item.bullets.forEach(bullet); });
  section("工作经历"); resume.experience.forEach(job);
  section("教育与资质"); resume.education.forEach(item => text(item,50,9,ink,495,14));

  const pages = pdf.getPages(); pages.forEach((item,index) => { item.drawLine({start:{x:50,y:32},end:{x:545,y:32},thickness:.5,color:rgb(.82,.86,.9)}); item.drawText(`${resume.meta.roleTitle}｜${resume.meta.strategy === "transition" ? "强转型版" : "平衡版"} v${record.version}`,{x:50,y:18,size:6.5,font,color:muted}); const count=`${index+1} / ${pages.length}`; item.drawText(count,{x:545-font.widthOfTextAtSize(count,6.5),y:18,size:6.5,font,color:muted}); });
  const bytes = await pdf.save();
  const name = `${resume.profile.name}-${resume.meta.roleTitle}-${template}-v${record.version}.pdf`;
  const inline = new URL(request.url).searchParams.get("inline") === "1";
  return new Response(bytes as unknown as BodyInit, { headers: { "Content-Type":"application/pdf", "Content-Disposition":`${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`, "Cache-Control":"private, no-store", "X-Content-Type-Options":"nosniff" } });
}
