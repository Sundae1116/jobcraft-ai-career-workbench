import { env } from "cloudflare:workers";

const RESUMES = {
  balanced: { path: "/resumes/deepseek-emotion-balanced-v0.2.pdf", name: "DeepSeek-情感智能数据产品经理-示例候选人-平衡版-v0.2.pdf" },
  transition: { path: "/resumes/deepseek-emotion-transition-v0.2.pdf", name: "DeepSeek-情感智能数据产品经理-示例候选人-强转型版-v0.2.pdf" },
} as const;

export async function GET(request: Request, context: { params: Promise<{ variant: string }> }) {
  const { variant } = await context.params;
  const resume = RESUMES[variant as keyof typeof RESUMES];
  if (!resume) return Response.json({ error: "简历版本不存在" }, { status: 404 });
  const source = await env.ASSETS.fetch(new Request(new URL(resume.path, request.url)));
  if (!source.ok || !source.body) return Response.json({ error: "简历文件暂不可用" }, { status: 404 });
  return new Response(source.body, { headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(resume.name)}`,
    "Cache-Control": "private, no-store",
  }});
}
