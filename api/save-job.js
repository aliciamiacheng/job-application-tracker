const REPO="aliciamiacheng/job-application-tracker";
const FILE="applications.csv";
const API="https://api.github.com";

function csvCell(v){
  const s=String(v??"");
  return /[",\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s;
}
function parseCSV(text){
  const rows=[];let row=[],cell="",q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i],n=text[i+1];
    if(q&&c==='"'&&n==='"'){cell+='"';i++;}
    else if(c==='"'){q=!q;}
    else if(c===","&&!q){row.push(cell);cell="";}
    else if((c==="\n"||c==="\r")&&!q){if(c==="\r"&&n==="\n")i++;row.push(cell);if(row.some(x=>x!==""))rows.push(row);row=[];cell="";}
    else cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row);}
  if(rows.length<1)return [];
  const h=rows[0];return rows.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]||""])));
}
export default async function handler(req,res){
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","Content-Type, X-Tracker-Key");
  res.setHeader("Access-Control-Allow-Methods","POST, OPTIONS");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({error:"POST only"});
  if(!process.env.INGEST_SECRET||req.headers["x-tracker-key"]!==process.env.INGEST_SECRET)return res.status(401).json({error:"Unauthorized"});
  if(!process.env.GITHUB_TOKEN)return res.status(500).json({error:"Server is missing GITHUB_TOKEN"});
  const x=req.body||{},company=String(x.company||"").trim(),role=String(x.role||"").trim(),url=String(x.url||"").trim();
  if(!company||!role||!url)return res.status(400).json({error:"company, role and url are required"});
  const headers={Authorization:"Bearer "+process.env.GITHUB_TOKEN,Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"};
  const file=await fetch(`${API}/repos/${REPO}/contents/${FILE}`,{headers});
  if(!file.ok)return res.status(502).json({error:"Could not read tracker from GitHub"});
  const meta=await file.json();
  const raw=Buffer.from(meta.content.replace(/\n/g,""),"base64").toString("utf8");
  const rows=parseCSV(raw);
  const dup=rows.find(r=>(url&&r.url===url)||(String(r.company).toLowerCase()===company.toLowerCase()&&String(r.role).toLowerCase()===role.toLowerCase()));
  if(dup)return res.status(200).json({ok:true,duplicate:true,id:dup.id});
  const max=rows.reduce((m,r)=>Math.max(m,parseInt(String(r.id||"").split("-").pop())||0),0);
  const id="APP-"+String(max+1).padStart(4,"0"),today=new Date().toISOString().slice(0,10);
  const fields=["id","company","role","location","category","url","status","date_discovered","date_started","date_applied","last_updated","source","deadline","notes"];
  const rec={id,company,role,location:String(x.location||""),category:String(x.category||"Other"),url,status:"Started",date_discovered:today,date_started:today,date_applied:"",last_updated:today,source:"Browser",deadline:"",notes:""};
  const all=[...rows,rec];
  const out=fields.join(",")+"\n"+all.map(r=>fields.map(f=>csvCell(r[f])).join(",")).join("\n")+"\n";
  const put=await fetch(`${API}/repos/${REPO}/contents/${FILE}`,{method:"PUT",headers:{...headers,"Content-Type":"application/json"},body:JSON.stringify({message:`Track ${company} - ${role}`,content:Buffer.from(out).toString("base64"),sha:meta.sha})});
  if(!put.ok){const detail=await put.text();return res.status(502).json({error:"GitHub update failed",detail:detail.slice(0,300)});}
  return res.status(200).json({ok:true,id});
}
