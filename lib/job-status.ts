import { importMokaJob, isMokaUrl } from "@/lib/job-adapters/moka";

export type JobAvailability = {
  status: "open" | "closed" | "unknown";
  checkedAt: string;
  message: string;
  source: "moka" | "ant" | "structured-page" | "http";
};

const closedPattern = /职位(?:已)?(?:下线|关闭|失效|撤销|结束)|招聘(?:已)?结束|岗位(?:已)?(?:下线|关闭|失效|撤销|结束)|position (?:is )?(?:closed|expired|unavailable)|job (?:is )?(?:closed|expired|unavailable)|页面不存在/i;

function result(status:JobAvailability["status"], message:string, source:JobAvailability["source"]):JobAvailability {
  return { status, checkedAt:new Date().toISOString(), message, source };
}

export async function checkJobAvailability(rawUrl:string):Promise<JobAvailability> {
  let target:URL;
  try { target=new URL(rawUrl); } catch { return result("unknown","岗位链接格式无效","http"); }
  if(target.protocol!=="https:")return result("unknown","仅支持核验公开 HTTPS 招聘链接","http");

  if(isMokaUrl(target)){
    try {
      await importMokaJob(target);
      return result("open","Moka 官网仍返回完整职位信息","moka");
    } catch(error) {
      const message=error instanceof Error?error.message:"Moka 暂时无法读取";
      if(closedPattern.test(message)||message.includes("可能已下架"))return result("closed","Moka 已不再返回完整职位信息，岗位可能已下架","moka");
      return result("unknown",`Moka 暂时无法确认：${message}`,"moka");
    }
  }

  if(target.hostname==="talent.antgroup.com"&&target.searchParams.get("positionId")){
    try {
      const id=target.searchParams.get("positionId")!;
      const tid=target.searchParams.get("tid")??"";
      const response=await fetch("https://hrcareersweb.antgroup.com/api/social/position/detail",{method:"POST",headers:{"content-type":"application/json",accept:"application/json"},body:JSON.stringify({id,tid,language:"zh_CN"})});
      const text=await response.text();
      let payload:{success?:boolean;errorMsg?:string;content?:{name?:string;description?:string;requirement?:string}}={};
      try{payload=JSON.parse(text)}catch{return result("unknown","蚂蚁招聘暂未返回可核验的结构化数据","ant")}
      if(response.ok&&payload.success&&payload.content?.name)return result("open","蚂蚁招聘官网仍返回职位详情","ant");
      const message=payload.errorMsg||`职位接口返回 ${response.status}`;
      return closedPattern.test(message)||response.status===404?result("closed","蚂蚁招聘已不再返回该岗位","ant"):result("unknown",`蚂蚁招聘暂时无法确认：${message}`,"ant");
    }catch(error){return result("unknown",`蚂蚁招聘核验暂时失败：${error instanceof Error?error.message:"网络异常"}`,"ant")}
  }

  try {
    const response=await fetch(target,{redirect:"follow",headers:{"user-agent":"JobCraft/1.0 (candidate-owned availability check)",accept:"text/html,application/xhtml+xml"}});
    if(response.status===404||response.status===410)return result("closed",`招聘页面返回 ${response.status}，岗位可能已下线`,"http");
    if(!response.ok)return result("unknown",`招聘页面暂时返回 ${response.status}`,"http");
    const html=(await response.text()).slice(0,1_000_000);
    if(closedPattern.test(html.replace(/<[^>]+>/g," ").slice(0,200_000)))return result("closed","招聘页面显示岗位已结束或下线","structured-page");
    if(/"@type"\s*:\s*"JobPosting"/i.test(html))return result("open","官网仍公开返回结构化职位信息","structured-page");
    return result("unknown","页面可以访问，但官网未提供可确认在招状态的结构化信息","http");
  }catch(error){return result("unknown",`官网核验暂时失败：${error instanceof Error?error.message:"网络异常"}`,"http")}
}
