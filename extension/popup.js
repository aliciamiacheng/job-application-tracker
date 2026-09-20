let current=null;
chrome.storage.local.get(["currentJob","currentIsJob","savedJobs"],r=>{
  if(r.currentIsJob && r.currentJob){
    current=r.currentJob; document.getElementById("notjob").hidden=true; document.getElementById("form").hidden=false;
    for(const k of ["company","role","location"]) document.getElementById(k).value=current[k]||"";
  }
});
document.getElementById("save").onclick=()=>{
  const job={...current,company:company.value.trim(),role:role.value.trim(),location:location.value.trim(),saved_at:new Date().toISOString()};
  chrome.storage.local.get(["savedJobs"],r=>{
    const jobs=r.savedJobs||[];
    const i=jobs.findIndex(x=>x.url===job.url || (x.company.toLowerCase()===job.company.toLowerCase()&&x.role.toLowerCase()===job.role.toLowerCase()));
    if(i>=0) jobs[i]={...jobs[i],...job}; else jobs.push(job);
    chrome.storage.local.set({savedJobs:jobs},()=>msg.textContent="Saved as Started ✓");
  });
};
document.getElementById("export").onclick=()=>{
  chrome.storage.local.get(["savedJobs"],r=>{
    const blob=new Blob([JSON.stringify(r.savedJobs||[],null,2)],{type:"application/json"});
    const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="inbox.json"; a.click(); URL.revokeObjectURL(a.href);
  });
};