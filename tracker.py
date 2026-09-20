import argparse, csv, json
from datetime import date
from pathlib import Path

CSV_PATH = Path("applications.csv")
DASHBOARD = Path("APPLICATIONS.md")
FIELDS = ["id","company","role","location","category","url","status","date_discovered","date_started","date_applied","last_updated","source","deadline","notes"]
STATUSES = ["Interested","Started","Applied","Assessment","Interview","Final Round","Offer","Rejected","Withdrawn"]

def rows():
    if not CSV_PATH.exists(): return []
    with CSV_PATH.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))

def save(data):
    with CSV_PATH.open("w", newline="", encoding="utf-8") as f:
        w=csv.DictWriter(f, fieldnames=FIELDS); w.writeheader(); w.writerows(data)

def next_id(data):
    nums=[]
    for r in data:
        try: nums.append(int(r["id"].split("-")[-1]))
        except: pass
    return f"APP-{max(nums, default=0)+1:04d}"

def dashboard(data):
    order={s:i for i,s in enumerate(STATUSES)}
    data=sorted(data,key=lambda r:(order.get(r["status"],99),r["company"].lower(),r["role"].lower()))
    lines=["# Applications","",f"Last generated: {date.today().isoformat()}","",
           "| ID | Company | Role | Location | Category | Status | Applied | Link |",
           "|---|---|---|---|---|---|---|---|"]
    for r in data:
        link=f'[Open]({r["url"]})' if r.get("url") else ""
        vals=[r.get("id",""),r.get("company",""),r.get("role",""),r.get("location",""),r.get("category",""),r.get("status",""),r.get("date_applied",""),link]
        lines.append("| "+" | ".join(v.replace("|","/") for v in vals)+" |")
    DASHBOARD.write_text("\n".join(lines)+"\n",encoding="utf-8")

def add(a):
    data=rows(); today=date.today().isoformat()
    # conservative duplicate check: same company+role or same non-empty URL
    for r in data:
        if a.url and r.get("url")==a.url:
            raise SystemExit(f'Duplicate URL already tracked as {r["id"]}')
        if r.get("company","").lower()==a.company.lower() and r.get("role","").lower()==a.role.lower():
            raise SystemExit(f'Company/role already tracked as {r["id"]}')
    status=a.status
    rec={k:"" for k in FIELDS}
    rec.update({"id":next_id(data),"company":a.company,"role":a.role,"location":a.location or "",
      "category":a.category or "Other","url":a.url or "","status":status,
      "date_discovered":today,"date_started":today if status=="Started" else "",
      "date_applied":today if status in ["Applied","Assessment","Interview","Final Round","Offer","Rejected"] else "",
      "last_updated":today,"source":a.source or "Manual","deadline":a.deadline or "","notes":a.notes or ""})
    data.append(rec); save(data); dashboard(data); print(rec["id"])

def update(a):
    data=rows(); found=False; today=date.today().isoformat()
    for r in data:
        if r["id"]==a.id:
            found=True
            if a.status:
                r["status"]=a.status
                if a.status=="Started" and not r.get("date_started"): r["date_started"]=today
                if a.status=="Applied" and not r.get("date_applied"): r["date_applied"]=today
            if a.notes is not None: r["notes"]=a.notes
            r["last_updated"]=today
    if not found: raise SystemExit("Application ID not found")
    save(data); dashboard(data)

def ingest():
    p=Path("inbox.json")
    if not p.exists(): return
    items=json.loads(p.read_text(encoding="utf-8") or "[]")
    data=rows(); today=date.today().isoformat()
    for x in items:
        company=str(x.get("company","")).strip(); role=str(x.get("role","")).strip(); url=str(x.get("url","")).strip()
        if not company or not role: continue
        if any((url and r.get("url")==url) or (r.get("company","").lower()==company.lower() and r.get("role","").lower()==role.lower()) for r in data): continue
        rec={k:"" for k in FIELDS}
        rec.update({"id":next_id(data),"company":company,"role":role,"location":x.get("location",""),
          "category":x.get("category","Other"),"url":url,"status":x.get("status","Started"),
          "date_discovered":today,"date_started":today,"last_updated":today,"source":x.get("source","Inbox"),
          "deadline":x.get("deadline",""),"notes":x.get("notes","")})
        data.append(rec)
    save(data); dashboard(data)

p=argparse.ArgumentParser(); sp=p.add_subparsers(dest="cmd",required=True)
a=sp.add_parser("add"); a.add_argument("--company",required=True); a.add_argument("--role",required=True); a.add_argument("--location"); a.add_argument("--category"); a.add_argument("--url"); a.add_argument("--status",choices=STATUSES,default="Interested"); a.add_argument("--source"); a.add_argument("--deadline"); a.add_argument("--notes")
u=sp.add_parser("update"); u.add_argument("--id",required=True); u.add_argument("--status",choices=STATUSES); u.add_argument("--notes")
sp.add_parser("dashboard"); sp.add_parser("ingest")
args=p.parse_args()
if args.cmd=="add": add(args)
elif args.cmd=="update": update(args)
elif args.cmd=="ingest": ingest()
else: dashboard(rows())
