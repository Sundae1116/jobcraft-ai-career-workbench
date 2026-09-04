from pathlib import Path
import argparse
from reportlab.lib import colors
from reportlab.lib.enums import TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, PageBreak

ROOT = Path(__file__).resolve().parents[1]
FONT = r"C:\Windows\Fonts\Deng.ttf"
FONT_BOLD = r"C:\Windows\Fonts\Dengb.ttf"
pdfmetrics.registerFont(TTFont("Deng", FONT))
pdfmetrics.registerFont(TTFont("Deng-Bold", FONT_BOLD))

INK = colors.HexColor("#15212D")
MUTED = colors.HexColor("#657383")
ACCENT = colors.HexColor("#315C9C")
LIGHT = colors.HexColor("#E8EEF5")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="NameCN", fontName="Deng-Bold", fontSize=25, leading=28, textColor=INK, spaceAfter=2))
styles.add(ParagraphStyle(name="Target", fontName="Deng", fontSize=10.5, leading=14, textColor=ACCENT))
styles.add(ParagraphStyle(name="Contact", fontName="Deng", fontSize=8.5, leading=11, textColor=MUTED, alignment=TA_RIGHT))
styles.add(ParagraphStyle(name="SectionCN", fontName="Deng-Bold", fontSize=11.5, leading=15, textColor=INK, spaceBefore=6, spaceAfter=4))
styles.add(ParagraphStyle(name="BodyCN", fontName="Deng", fontSize=8.8, leading=12.7, textColor=INK, wordWrap="CJK", spaceAfter=3))
styles.add(ParagraphStyle(name="BulletCN", fontName="Deng", fontSize=8.6, leading=12.4, leftIndent=10, firstLineIndent=-8, textColor=INK, wordWrap="CJK", spaceAfter=2.4))
styles.add(ParagraphStyle(name="JobCN", fontName="Deng-Bold", fontSize=9.6, leading=12.8, textColor=INK))
styles.add(ParagraphStyle(name="DateCN", fontName="Deng", fontSize=8.4, leading=11.5, textColor=MUTED, alignment=TA_RIGHT))

COMMON = {
    "current": ("杭州超级元气国际供应链有限公司", "跨境电商运营", "2025.12-至今", [
        "用DeepSeek、GPT完成竞品调研和定价策略报告，推动3款限量定制新品上市；用AI辅助评测盲盒短视频脚本并完成内容制作。",
        "负责TikTok、Shopee店铺策略与运营，月均GMV20万美元；优质达人短视频转化率提升25%，ROI稳定在2-3。",
    ]),
    "startup": ("创业", "品牌代运营 / 内容产品运营", "2024.07-2025.10", [
        "为情感赛道头部IP交付60+女性付费用户。根据用户讲述梳理关系困境、真实诉求和情绪状态，提供个性化建议、沟通策略和聊天话术。",
        "负责传统文化IP的产品设计、内容策划、短视频制作、直播引流和后端交付；小红书一转付费率37.5%，直播间最高在线1000+。",
        "从0到1搭建500+达人矩阵，首月全店GMV100万元；2个月搭建4人商务团队并建立岗位SOP，第三个月达人直播GMV120万元。",
    ]),
    "xunfeng": ("巽风科技有限公司（茅台子公司）", "电商 / 产品运营", "2023.10-2024.06", [
        "负责搜索、短视频、营销工具及运营后台等10项产品功能，从业务反馈和运营数据中梳理需求，与产品、研发协作推进上线。",
        "推动搜索词推荐和排行榜上线，主推品转化率提升21%，商城DAU提升10%。",
        "统筹年度营销节奏和互动玩法，协同PR、产品等团队完成营销共创，并带领运营团队完成10亿元以上GMV。",
    ]),
    "ali": ("阿里巴巴 - 淘天集团", "行业运营", "2019.07-2023.08", [
        "复盘产品链路Bug、库存偏仓等影响直播成交的问题，输出解决方案和跟播SOP；针对部分地区无法下单的问题，协同产品上线负卖功能。",
        "长期监控PV、UV、CVR、加购、ROI、用户画像和竞品动态，形成数据报告并持续调整运营策略。",
        "担任天猫520行业总PM，统筹9个行业，完成2.1亿元成交目标，以内部资源实现500万+曝光。",
        "搭建并带领6人TP团队，制定行业规划、直播策略和SOP协作机制，通过OKR拆解推进项目落地。",
    ]),
    "early": ("网易 & 波奇宠物", "内容社区与达人生态运营", "2016.02-2019.03", [
        "负责内容社区、赛事活动和达人生态运营；与技术团队协作优化推荐机制和达人成长体系，社区活跃UV与优质内容数环比增长100%+。",
    ]),
}

# 强转型版仍然只使用同一证据库里的事实，但会重排重点、压缩弱相关电商执行细节。
TRANSITION_JOBS = {
    "current": ("杭州超级元气国际供应链有限公司", "跨境电商运营", "2025.12-至今", [
        "使用DeepSeek、GPT完成竞品调研和定价策略报告，推动3款限量定制新品上市；用AI辅助评测盲盒短视频脚本并完成内容制作。",
        "围绕月均20万美元GMV建立内容表现与转化数据观察，筛选优质达人素材，短视频转化率提升25%，ROI稳定在2-3。",
    ]),
    "startup": ("创业", "用户洞察 / 内容产品运营", "2024.07-2025.10", [
        "为情感赛道头部IP交付60+女性付费用户；根据多轮讲述梳理关系困境、真实诉求与情绪状态，形成个性化建议、沟通策略和聊天话术。",
        "从0到1负责传统文化IP的产品设计、内容策划和交付闭环，小红书一转付费率37.5%，直播间最高在线1000+。",
        "从0到1搭建500+达人协作矩阵与4人商务团队SOP，首月全店GMV100万元，第三个月达人直播GMV120万元，验证规模化交付能力。",
    ]),
    "xunfeng": ("巽风科技有限公司（茅台子公司）", "产品运营", "2023.10-2024.06", [
        "从业务反馈和运营数据中梳理搜索、短视频、营销工具及运营后台等10项功能需求，与产品、研发协作推进上线。",
        "推动搜索词推荐和排行榜上线，主推品转化率提升21%，商城DAU提升10%。",
        "统筹年度产品运营节奏和互动机制，协同PR、产品等团队完成共创，支撑10亿元以上GMV。",
    ]),
    "ali": ("阿里巴巴 - 淘天集团", "行业运营 / 产品协同", "2019.07-2023.08", [
        "复盘产品链路Bug、库存偏仓和地区无法下单等Badcase，定位业务影响并输出方案；协同产品上线负卖功能，沉淀跟播SOP。",
        "长期结合PV、UV、CVR、加购、ROI、用户画像与竞品动态诊断问题，形成数据报告并迭代运营策略。",
        "担任天猫520行业总PM并搭建6人TP团队，统筹跨行业协作，完成2.1亿元成交目标。",
    ]),
    "early": ("网易 & 波奇宠物", "内容社区与达人生态运营", "2016.02-2019.03", [
        "与技术团队协作优化内容推荐机制和达人成长体系，社区活跃UV与优质内容数环比增长100%+。",
    ]),
}

VARIANTS = {
    "balanced": {
        "label": "平衡版",
        "summary": "10年互联网平台、产品运营和内容生态经验，做过电商产品、行业运营，也有从0到1创业和团队管理经历。近一年持续使用DeepSeek、GPT等工具做调研、内容评测和产品验证；曾为情感赛道头部IP服务60+付费用户，对用户诉求、情绪变化和对话语境有较多一线观察。希望把这些经验用在情感智能产品的数据分析、体验优化和Badcase改进中。",
        "advantages": [
            "<b>用户理解：</b>服务过60+情感咨询付费用户，能够从具体对话中判断用户真正想解决的问题、情绪状态和沟通语境。",
            "<b>产品协作：</b>做过搜索、短视频、营销工具和运营后台等10项功能，熟悉从发现问题、梳理需求到协同产品研发上线的过程。",
            "<b>问题复盘：</b>处理过产品链路Bug、库存偏仓和地区无法下单等问题，能够复盘原因、提出方案并跟进结果。",
            "<b>AI工具实践：</b>日常使用DeepSeek、GPT、Kimi、Codex和Cursor，已用于竞品调研、脚本评测和工作流搭建。",
        ],
        "jobs": ["current", "startup", "xunfeng", "ali", "early"],
    },
    "transition": {
        "label": "强转型版",
        "summary": "长期做用户、内容和产品运营，擅长从用户反馈和业务数据中找问题，再推动产品改进。曾为情感赛道头部IP服务60+付费用户，直接处理关系困境、情绪变化和沟通语境；也处理过产品链路Badcase并推动功能上线。近一年持续用DeepSeek、GPT、Codex等工具做调研、内容评测和产品原型，希望转向情感智能产品的数据与体验工作。",
        "advantages": [
            "<b>情感场景经验：</b>服务60+真实付费用户，能够从多轮交流中区分表面诉求和实际困扰，并给出针对性的沟通建议。",
            "<b>Badcase处理：</b>有从一线问题复盘原因、制定方案、协同产品研发到跟进上线的完整经验。",
            "<b>数据与内容判断：</b>长期结合用户行为、内容表现和业务指标做判断，也做过AI短视频脚本评测。",
            "<b>动手能力：</b>使用DeepSeek、GPT、Codex、Cursor完成调研和工作流原型，能快速把想法做成可演示方案。",
        ],
        "jobs": ["current", "startup", "xunfeng", "ali", "early"],
    },
}

def section(title):
    return [Spacer(1, 1*mm), Paragraph(title, styles["SectionCN"]), Table([[""]], colWidths=[174*mm], rowHeights=[0.45*mm], style=TableStyle([("BACKGROUND",(0,0),(-1,-1),ACCENT)])), Spacer(1, 1.3*mm)]

def bullet(text):
    return Paragraph("• " + text, styles["BulletCN"])

def job(company, role, dates, bullets):
    head = Table([[Paragraph(f"{company}｜{role}", styles["JobCN"]), Paragraph(dates, styles["DateCN"])]], colWidths=[130*mm, 44*mm])
    head.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0), ("TOPPADDING",(0,0),(-1,-1),0), ("BOTTOMPADDING",(0,0),(-1,-1),2)]))
    return KeepTogether([head] + [bullet(x) for x in bullets] + [Spacer(1, .8*mm)])

def generate(kind):
    cfg = VARIANTS[kind]
    out = ROOT / "output" / "pdf" / f"DeepSeek-情感智能数据产品经理-示例候选人-{cfg['label']}-v0.2.pdf"
    out.parent.mkdir(parents=True, exist_ok=True)
    def decor(canvas, doc):
        canvas.saveState(); w, h = A4
        canvas.setFillColor(ACCENT); canvas.rect(0, h-7*mm, w, 7*mm, fill=1, stroke=0)
        canvas.setStrokeColor(LIGHT); canvas.line(18*mm, 13*mm, w-18*mm, 13*mm)
        canvas.setFont("Deng", 7); canvas.setFillColor(MUTED)
        canvas.drawString(18*mm, 8.5*mm, f"DeepSeek 情感智能数据产品经理｜{cfg['label']} v0.2")
        canvas.drawRightString(w-18*mm, 8.5*mm, f"{doc.page} / 2"); canvas.restoreState()
    doc = BaseDocTemplate(str(out), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=17*mm, title=f"示例候选人 - {cfg['label']}")
    doc.addPageTemplates([PageTemplate(id="resume", frames=[Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal", leftPadding=0, rightPadding=0, topPadding=0, bottomPadding=0)], onPage=decor)])
    story = []
    header = Table([[Paragraph("示例候选人", styles["NameCN"]), Paragraph("杭州 13800000000<br/>candidate@example.com", styles["Contact"])], [Paragraph("目标岗位：DeepSeek 情感智能数据产品经理", styles["Target"]), ""]], colWidths=[118*mm,56*mm])
    header.setStyle(TableStyle([("SPAN",(0,1),(1,1)), ("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0), ("TOPPADDING",(0,0),(-1,-1),0), ("BOTTOMPADDING",(0,0),(-1,-1),0)]))
    story += [header, Spacer(1, 2.5*mm)]
    story += section("自我评价"); story.append(Paragraph(cfg["summary"], styles["BodyCN"]))
    story += section("我的优势"); story += [bullet(x) for x in cfg["advantages"]]
    story += section("AI实践与作品")
    story.append(bullet("<b>情感陪伴多轮对话Badcase评测工作台｜个人项目（开发中）：</b>围绕情感陪伴多轮对话中的体验问题进行产品化探索，作品链接待补。"))
    story.append(bullet("<b>自动化招聘工作流｜个人项目：</b>搭建岗位、候选人证据和简历版本协同的工作流。my.feishu.cn/base/N0cAbqmUSaHftTsdOpAc3Bzan6f"))
    story += section("工作经历")
    jobs_source = COMMON if kind == "balanced" else TRANSITION_JOBS
    story.append(job(*jobs_source[cfg["jobs"][0]])); story.append(job(*jobs_source[cfg["jobs"][1]])); story.append(PageBreak())
    for key in cfg["jobs"][2:]: story.append(job(*jobs_source[key]))
    story += section("教育与资质")
    edu = Table([[Paragraph("浙江理工大学｜市场营销｜全日制本科", styles["JobCN"]), Paragraph("2010.09-2014.06", styles["DateCN"])], [Paragraph("中科院心理咨询师证书", styles["BodyCN"]), ""]], colWidths=[130*mm,44*mm])
    edu.setStyle(TableStyle([("VALIGN",(0,0),(-1,-1),"TOP"), ("LEFTPADDING",(0,0),(-1,-1),0), ("RIGHTPADDING",(0,0),(-1,-1),0), ("TOPPADDING",(0,0),(-1,-1),0)])); story.append(edu)
    doc.build(story); return out

if __name__ == "__main__":
    parser = argparse.ArgumentParser(); parser.add_argument("--variant", choices=["balanced", "transition", "all"], default="all"); args = parser.parse_args()
    variants = ["balanced", "transition"] if args.variant == "all" else [args.variant]
    for variant in variants: print(generate(variant))
