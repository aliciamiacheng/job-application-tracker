const ATS=["greenhouse.io","lever.co","ashbyhq.com","myworkdayjobs.com","workdayjobs.com","smartrecruiters.com","icims.com","jobvite.com","successfactors.com"];
function text(el){return (el?.textContent||"").replace(/\s+/g," ").trim();}
function looksLikeJob(){
  const h=location.hostname.toLowerCase(),p=location.pathname.toLowerCase(),body=(document.body?.innerText||"").slice(0,16000).toLowerCase();
  return ATS.some(x=>h.includes(x))||((/job|career|position|apply|intern|analyst/.test(p))&&(/apply|application|job description|responsibilities|qualifications/.test(body)));
}
function guess(){
  const h1=text(document.querySelector("h1"));
  const title=h1||document.title.split(/[|–—]/)[0].trim();
  const page=(document.body?.innerText||"").slice(0,20000);
  const candidates=[document.querySelector("[data-company-name]"),document.querySelector(".company-name"),document.querySelector('[class*="company"]')];
  let company=candidates.map(text).find(Boolean)||"";
  if(!company){const parts=document.title.split(/[|–—]/).map(x=>x.trim()).filter(Boolean);if(parts.length>1)company=parts[parts.length-1];}
  const m=page.match(/(?:location|office)\s*[:\n]\s*([^\n]{2,80})/i);
  return {company,role:title,location:m?m[1].trim():"",url:location.href,status:"Started",source:"Browser"};
}
chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
  if(message?.type==="GET_JOB") sendResponse({job:looksLikeJob()?guess():null});
});
