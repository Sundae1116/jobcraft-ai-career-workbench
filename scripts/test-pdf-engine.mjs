import fs from "node:fs/promises";
import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";

await fs.mkdir(new URL("../tmp/pdfs/", import.meta.url), { recursive: true });
for (const [name,color] of [["ats",rgb(.19,.36,.61)],["product",rgb(.38,.23,.76)],["portfolio",rgb(.08,.48,.43)]]) {
  const pdf = await PDFDocument.create(); pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await fs.readFile(new URL("../public/fonts/SourceHanSansCN-Regular.otf", import.meta.url)), { subset: false });
  const page = pdf.addPage([595.28,841.89]); page.drawRectangle({x:0,y:822,width:595.28,height:20,color});
  if(name === "portfolio") page.drawRectangle({x:0,y:0,width:7,height:841.89,color});
  page.drawText(`示例候选人｜情感智能数据产品经理｜${name}`,{x:50,y:775,size:20,font,color:rgb(.08,.13,.18)});
  page.drawText("中文 PDF 模板测试：60+ 用户、转化率提升 21%、证据映射 EV-006。",{x:50,y:735,size:10,font});
  await fs.writeFile(new URL(`../tmp/pdfs/engine-${name}.pdf`,import.meta.url),await pdf.save());
}
