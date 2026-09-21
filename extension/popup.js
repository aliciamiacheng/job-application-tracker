let current=null;
const byId=id=>document.getElementById(id);
const clean=v=>String(v||"").trim();

async function activeJob(){
  const tabs=await chrome.tabs.query({active:true,currentWindow:true});
  const tab=tabs[0];
  if(!tab?.id || !/^https?:/i.test(tab.url||"")) return null;
  try{
    const r=await chrome.tabs.sendMessage(tab.id,{type:"GET_JOB"});
    return r?.job||null;
  }catch(e){ return null; }
}

async function init(){
  current=await activeJob();
  if(!current){ byId("notjob").hidden=false; byId("form").hidden=true; return; }
  byId("notjob").hidden=true; byId("form").hidden=false;
  ["company","role","location"].forEach(k=>byId(k).value=clean(current[k]));
}

byId("save").onclick=async()=>{
  if(!current){ byId("msg").textContent="No job detected."; return; }
  const job={...current,company:clean(byId("company").value),role:clean(byId("role").value),location:clean(byId("location").value),status:"Started",source:"Browser",saved_at:new Date().toISOString()};
  if(!job.company||!job.role||!job.url){ byId("msg").textContent="Confirm company and role first."; return; }
  const stored=await chrome.storage.local.get({savedJobs:[]});
  const jobs=Array.isArray(stored.savedJobs)?stored.savedJobs:[];
  const i=jobs.findIndex(x=>(x.url&&x.url===job.url)||(clean(x.company).toLowerCase()===job.company.toLowerCase()&&clean(x.role).toLowerCase()===job.role.toLowerCase()));
  if(i>=0) jobs[i]={...jobs[i],...job}; else jobs.push(job);
  await chrome.storage.local.set({savedJobs:jobs});
  const verify=await chrome.storage.local.get({savedJobs:[]});
  byId("msg").textContent="Saved as Started - "+verify.savedJobs.length+" saved";
};

byId("export").onclick=async()=>{
  const stored=await chrome.storage.local.get({savedJobs:[]});
  const jobs=Array.isArray(stored.savedJobs)?stored.savedJobs:[];
  const blob=new Blob([JSON.stringify(jobs,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="inbox.json";document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  byId("msg").textContent="Exported "+jobs.length+" saved job(s).";
};
init();
