const ATS = [
  "greenhouse.io","lever.co","ashbyhq.com","myworkdayjobs.com","workdayjobs.com",
  "smartrecruiters.com","icims.com","jobvite.com","successfactors.com"
];
function text(el){ return (el?.textContent || "").replace(/\s+/g," ").trim(); }
function looksLikeJob(){
  const h=location.hostname.toLowerCase(), p=location.pathname.toLowerCase();
  const body=(document.body?.innerText||"").slice(0,12000).toLowerCase();
  return ATS.some(x=>h.includes(x)) ||
    /job|career|position|apply|intern|analyst/.test(p) &&
    /apply|application|job description|responsibilities|qualifications/.test(body);
}
function guess(){
  const h1=text(document.querySelector("h1"));
  const title=h1 || document.title.split(/[|–—-]/)[0].trim();
  const meta=[...document.querySelectorAll("meta")].map(m=>m.content||"").join(" ");
  const page=(document.body?.innerText||"").slice(0,15000);
  const companyCandidates=[
    document.querySelector('[data-company-name]'),
    document.querySelector('.company-name'),
    document.querySelector('[class*="company"]')
  ];
  let company=companyCandidates.map(text).find(Boolean)||"";
  if(!company){
    const dt=document.title.split(/[|–—]/).map(x=>x.trim());
    if(dt.length>1) company=dt[dt.length-1];
  }
  const locMatch=(page+" "+meta).match(/(?:location|office)\s*[:\n]\s*([^\n]{2,80})/i);
  return {company,role:title,location:locMatch?locMatch[1].trim():"",url:location.href,status:"Started",source:"Browser"};
}
if(looksLikeJob()){
  chrome.storage.local.set({currentJob:guess(), currentIsJob:true});
}else{
  chrome.storage.local.set({currentIsJob:false});
}
