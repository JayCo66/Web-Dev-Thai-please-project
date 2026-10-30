import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowUpRight, RefreshCw, HeartHandshake, Building2, Receipt, GraduationCap, Trees, Users, HeartPulse, BarChart3 } from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import "../styles/charity-dashboard.css";
const icons = { EDUCATION: GraduationCap, ENVIRONMENT: Trees, COMMUNITY: Users, HEALTHCARE: HeartPulse };
const colors = { EDUCATION: "#3167db", ENVIRONMENT: "#16977e", COMMUNITY: "#dd9844", HEALTHCARE: "#9b6bcb" };
const money = value => Number(value || 0).toLocaleString("th-TH", {minimumFractionDigits:2,maximumFractionDigits:2});
const number = value => Number(value || 0).toLocaleString("th-TH", {maximumFractionDigits:2});
function DonationChart({ categories, metric, selected, onSelect }) {
  const maximum = Math.max(1, ...categories.map(g => g[metric]));
  const rawStep = maximum / 4;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  let step = [1,2,2.5,5,10].map(n => n*magnitude).find(n => n >= rawStep);
  if (metric === "donationCount") step = Math.max(1,Math.ceil(step));
  const ceiling = step * 4;
  const baseline = 276, plotHeight = 206;
  return <svg className="cd-bar-chart" viewBox="0 0 760 340" role="group" aria-label={metric === "totalAmount" ? "กราฟแท่งยอดบริจาคแยกประเภท หน่วยบาท" : "กราฟแท่งจำนวนรายการบริจาคแยกประเภท"}>
    <text x="24" y="25" className="cd-axis-title">{metric === "totalAmount" ? "ยอดบริจาค (บาท)" : "จำนวนรายการ"}</text>
    {[0,1,2,3,4].map(i => {const y=baseline-i*plotHeight/4;return <g key={i}><line x1="84" x2="738" y1={y} y2={y} className="cd-chart-grid"/><text x="70" y={y+4} textAnchor="end" className="cd-axis-tick">{number(step*i)}</text></g>})}
    {categories.map((g,i) => {
      const x=123+i*160, height=g[metric]/ceiling*plotHeight, active=selected === "ALL" || selected === g.impactType;
      return <g key={g.impactType} role="button" tabIndex={0} aria-pressed={selected===g.impactType} aria-label={`${g.label} ${metric === "totalAmount" ? 'ยอดบริจาค '+money(g.totalAmount)+' บาท' : g.donationCount+' รายการ'} กดเพื่อกรองรายละเอียด`} onClick={()=>onSelect(g.impactType)} onKeyDown={event=>{if(event.key === "Enter" || event.key === " "){event.preventDefault();onSelect(g.impactType);}}} className={`cd-chart-column${active ? "" : " is-muted"}`}>
        <title>{g.label}: ฿{money(g.totalAmount)} · {g.donationCount} รายการ · {number(g.sharePercent)}%</title>
        <rect x={x-19} y="43" width="126" height="287" rx="14" className="cd-chart-hit"/>
        <rect x={x} y={baseline-height} width="88" height={height} rx="9" fill={colors[g.impactType] || "#3167db"} className="cd-chart-bar"/>
        {g[metric] === 0 && <line x1={x+8} x2={x+80} y1={baseline} y2={baseline} stroke={colors[g.impactType]} strokeWidth="3" strokeLinecap="round"/>}
        <text x={x+44} y={baseline-height-13} textAnchor="middle" className="cd-bar-value">{metric === "totalAmount" ? '฿'+number(g.totalAmount) : number(g.donationCount)}</text>
        <text x={x+44} y="306" textAnchor="middle" className="cd-bar-label">{g.label}</text>
      </g>;
    })}
  </svg>;
}
export default function CharityDashboard() {
  const [data,setData] = useState(null), [loading,setLoading] = useState(true), [error,setError] = useState("");
  const [reload,setReload] = useState(0), [category,setCategory] = useState("ALL"), [page,setPage] = useState(1);
  const [metric,setMetric] = useState("totalAmount");
  useEffect(() => setPage(1), [category]);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    api.get("/charities/dashboard",{signal:controller.signal}).then(response => {
      if (!response.data.success) throw new Error("โหลดภาพรวมไม่สำเร็จ");
      setData(response.data.data);
    }).catch(e => { if (!controller.signal.aborted) setError(e.response?.data?.error || "โหลดภาพรวมไม่สำเร็จ กรุณาลองใหม่"); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  },[reload]);
  const rows = (data?.categories || []).filter(g => category === "ALL" || g.impactType === category).flatMap(g => g.charities.map(c => ({...c,label:g.label}))).sort((a,b)=>b.totalAmount-a.totalAmount || a.name.localeCompare(b.name,"th"));
  const pageCount = Math.max(1, Math.ceil(rows.length / 8));
  const currentPage = Math.min(page,pageCount);
  const visibleRows = rows.slice((currentPage-1)*8,currentPage*8);
  const leading = data?.summary.totalAmount > 0 ? [...data.categories].sort((a,b)=>b.totalAmount-a.totalAmount)[0] : null;
  const coverage = data?.summary.charityCount ? data.summary.receivingCharityCount / data.summary.charityCount * 100 : 0;
  const select = type => setCategory(current=>current===type ? "ALL" : type);
  return <div className="app-shell"><Navbar/><main id="main-content" className="app-main cd-dashboard">
    <Link to="/charities" className="xp-back"><ArrowLeft size={16}/>กลับหน้ามูลนิธิ</Link>
    <div className="page-heading cd-heading"><div><span className="page-eyebrow">ภาพรวมการให้ · DONATION OVERVIEW</span><h1>ทุกการให้ รวมเป็นพลัง</h1><p>ยอดบริจาคทั้งหมดของระบบ จากผู้ใช้ทุกบัญชี</p></div><button className="button button--secondary" onClick={()=>setReload(n=>n+1)} disabled={loading}><RefreshCw size={17}/>อัปเดตข้อมูล</button></div>
    <div className="cd-scope"><span><i/>ข้อมูลสะสมตั้งแต่เริ่มโครงการ</span><span className="badge">ยอดบริจาคทดลอง</span></div>
    {error ? <div className="notice notice--error" role="alert">{error}<button className="button button--secondary" onClick={()=>setReload(n=>n+1)}>ลองใหม่</button></div> : loading ? <div className="panel empty-state" role="status">กำลังรวบรวมยอดบริจาค…</div> : data && <>
      <section className="cd-summary" aria-label="ยอดรวมการบริจาค">
        <div className="cd-total"><span className="cd-stat-icon"><HeartHandshake size={23}/></span><span>ยอดบริจาครวมทุกบัญชี</span><strong>฿{money(data.summary.totalAmount)}</strong><small>ทุกยอดการให้ บันทึกไว้ในระบบ</small><HeartHandshake className="cd-total-art" aria-hidden="true"/></div>
        <div className="panel cd-stat"><span className="cd-stat-icon"><Receipt size={22}/></span><span>รายการบริจาคทั้งหมด</span><strong>{number(data.summary.donationCount)}<small> รายการ</small></strong><small>รวมรายการจากผู้ใช้ทุกบัญชี</small></div>
        <div className="panel cd-stat"><span className="cd-stat-icon is-teal"><Building2 size={22}/></span><span>มูลนิธิที่ได้รับการสนับสนุน</span><strong>{data.summary.receivingCharityCount}<small> / {data.summary.charityCount} แห่ง</small></strong><small>จากมูลนิธิทั้งหมดในโครงการ</small></div>
      </section>
      <div className="cd-analysis-grid">
        <section className="panel cd-chart-panel"><div className="cd-section-title"><div><span className="cd-kicker"><BarChart3 size={15}/>เปรียบเทียบตามประเภท</span><h2>การสนับสนุนในแต่ละด้าน</h2></div><div className="cd-chart-toggle" role="group" aria-label="ข้อมูลที่แสดงในกราฟ"><button aria-pressed={metric==="totalAmount"} onClick={()=>setMetric("totalAmount")}>ยอดบริจาค</button><button aria-pressed={metric==="donationCount"} onClick={()=>setMetric("donationCount")}>จำนวนรายการ</button></div></div>
          {data.summary.donationCount===0 && <p className="cd-empty">ยังไม่มีรายการบริจาค เริ่มการให้ครั้งแรกได้จากหน้ามูลนิธิ</p>}
          <DonationChart categories={data.categories} metric={metric} selected={category} onSelect={select}/>
          <p className="cd-chart-note">กดที่แท่งกราฟเพื่อดูรายชื่อมูลนิธิในประเภทนั้น</p>
        </section>
        <aside className="panel cd-insight" aria-label="สรุปข้อมูลการบริจาค"><span className="cd-kicker">การให้ในภาพรวม</span><h2>{leading ? <>ด้านที่ได้รับ<br/>การสนับสนุนมากที่สุด</> : <>เริ่มต้นการให้<br/>ไปด้วยกัน</>}</h2>
          {leading ? <><span className={`cd-leading-label cd-${leading.impactType}`}>{leading.label}</span><strong className="cd-leading-percent">{number(leading.sharePercent)}<span>%</span></strong><p>ของยอดบริจาคทั้งหมด · ฿{money(leading.totalAmount)}</p></> : <p>เมื่อมีรายการบริจาค คุณจะเห็นภาพการสนับสนุนของแต่ละด้านที่นี่</p>}
          <div className="cd-insight-divider"/><div className="cd-coverage-heading"><span>มูลนิธิที่ได้รับการสนับสนุน</span><strong>{data.summary.receivingCharityCount}/{data.summary.charityCount}</strong></div><div className="cd-coverage-track" aria-hidden="true"><span style={{width:`${coverage}%`}}/></div><small>ยอดเฉลี่ยต่อรายการ ฿{money(data.summary.donationCount ? data.summary.totalAmount/data.summary.donationCount : 0)}</small><Link to="/charities" className="cd-give-link">ส่งต่อการให้<ArrowUpRight size={17}/></Link>
        </aside>
      </div>
      <section className="cd-categories" aria-label="กรองประเภทมูลนิธิ">{data.categories.map(g=>{const Icon=icons[g.impactType] || HeartHandshake;return <button key={g.impactType} className={`panel cd-category cd-${g.impactType}`} aria-pressed={category===g.impactType} onClick={()=>select(g.impactType)}><span className="cd-category-heading"><span><Icon size={19}/></span>{g.label}<small>{number(g.sharePercent)}%</small></span><strong>฿{money(g.totalAmount)}</strong><small>{g.donationCount} รายการ · {g.charityCount} มูลนิธิ</small></button>})}</section>
      <section className="panel cd-details"><div className="cd-section-title"><div><h2>ยอดที่แต่ละมูลนิธิได้รับ</h2><p>เลือกประเภทด้านบนเพื่อดูรายละเอียด</p></div><button className="button button--secondary" aria-pressed={category==="ALL"} onClick={()=>setCategory("ALL")}>ดูทุกประเภท</button></div><div className="cd-table-scroll"><table><caption className="xp-visually-hidden">ยอดบริจาคแยกรายมูลนิธิ เรียงตามยอดสูงสุด</caption><thead><tr><th scope="col">มูลนิธิ</th><th scope="col">ประเภท</th><th scope="col">รายการ</th><th scope="col">ยอดสะสม</th></tr></thead><tbody>{visibleRows.map(c=><tr key={c.charityId}><th scope="row">{c.name}{!c.isActive&&<small>ปิดรับบริจาคแล้ว</small>}</th><td data-label="ประเภท">{c.label}</td><td data-label="รายการ">{c.donationCount}</td><td data-label="ยอดสะสม">฿{money(c.totalAmount)}</td></tr>)}</tbody></table></div>{rows.length>0&&<nav className="cd-pagination" aria-label="หน้ารายการมูลนิธิ"><span>แสดง {(currentPage-1)*8+1}–{Math.min(currentPage*8,rows.length)} จาก {rows.length} มูลนิธิ</span><div><button className="button button--secondary" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>ก่อนหน้า</button><span>{currentPage} / {pageCount}</span><button className="button button--secondary" disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)}>ถัดไป</button></div></nav>}{!rows.length&&<p className="empty-state">ยังไม่มีมูลนิธิในประเภทนี้</p>}</section>
      <p className="cd-updated">อัปเดต {new Date(data.updatedAt).toLocaleString("th-TH",{timeZone:"Asia/Bangkok"})} · รวมมูลนิธิที่ปิดรับแล้ว</p>
    </>}
  </main></div>;
}
