let current=null;
const byId=id=>document.getElementById(id),clean=v=>String(v||"").trim();
async function activeJob(){const tabs=await chrome.tabs.query({active:true,currentWindow:true});const tab=tabs[0];if(!tab?.id||!/^https?:/i.test(tab.url||""))return null;try{return (await chrome.tabs.sendMessage(tab.id,{type:"GET_JOB"}))?.job||null}catch{return null}}
async function init(){current=await activeJob();if(!current){byId("notjob").hidden=false;byId("form").hidden=true;return}byId("notjob").hidden=true;byId("form").hidden=false;["company","role","location"].forEach(k=>byId(k).value=clean(current[k]))}
byId("settings").onclick=()=>chrome.runtime.openOptionsPage();
byId("save").onclick=async()=>{
 if(!current)return;
 const job={...current,company:clean(byId("company").value),role:clean(byId("role").value),location:clean(byId("location").value),status:"Started",source:"Browser"};
 if(!job.company||!job.role||!job.url){byId("msg").className="err";byId("msg").textContent="Confirm company and role first.";return}
 const cfg=await chrome.storage.local.get({syncUrl:"",syncKey:""});
 if(!cfg.syncUrl||!cfg.syncKey){byId("msg").className="err";byId("msg").textContent="Open Sync settings first.";return}
 byId("save").disabled=true;byId("msg").className="muted";byId("msg").textContent="Saving...";
 try{
   const endpoint=cfg.syncUrl.replace(/\/$/,"")+"/api/save-job";
   const r=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","X-Tracker-Key":cfg.syncKey},body:JSON.stringify(job)});
   const data=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(data.error||("HTTP "+r.status));
   byId("msg").className="ok";byId("msg").textContent=data.duplicate?"Already in tracker - "+data.id:"Saved to tracker - "+data.id;
 }catch(e){byId("msg").className="err";byId("msg").textContent="Sync failed: "+e.message}
 finally{byId("save").disabled=false}
};
init();