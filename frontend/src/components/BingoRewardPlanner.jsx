import { useState } from "react";
import { Coins, Trophy, ArrowUp, Check } from "lucide-react";
const done = cell => ["COMPLETED", "CLAIMED"].includes(cell.status);
export default function BingoRewardPlanner({ lines, cells, selectedId, onSelect, closed }) {
  const [filter,setFilter] = useState("ALL");
  const [sort,setSort] = useState("bonus");
  const comparisons = lines.map(line => {
    const members = line.positions.map(p => cells.find(c => c.position === p)).filter(Boolean);
    const remainingTokens = members.filter(c => !done(c)).reduce((n,c)=>n+Number(c.token_reward || 0),0);
    return {...line,members,remainingTokens,totalRemaining:remainingTokens+line.tokenReward};
  });
  const visible = comparisons.filter(l => filter === "ALL" || l.type === filter).sort((a,b) => sort === "bonus" ? b.tokenReward-a.tokenReward || b.completedCount-a.completedCount || a.id.localeCompare(b.id) : b.completedCount-a.completedCount || b.tokenReward-a.tokenReward || a.id.localeCompare(b.id));
  const selected = comparisons.find(l => l.id === selectedId);
  const highest = Math.max(0,...lines.map(l=>l.tokenReward));
  return <section className="brp" id="bingo-line-rewards" aria-label="เปรียบเทียบรางวัลบิงโก">
    <div className="brp-heading"><div><span><Trophy size={16}/>วางแผนเส้นที่อยากทำ</span><h3>เส้นไหน คุ้มกับคุณ</h3><p>โบนัสเมื่อครบ 5 ช่อง · เลือกรับได้ 1 เส้นต่อกระดาน</p></div><div className="brp-max"><small>โบนัสสูงสุด</small><strong>+{highest}<span> โทเค็น</span></strong></div></div>
    <div className="brp-tools"><div className="brp-filters" role="group" aria-label="ประเภทเส้นบิงโก">{[["ALL","ทั้งหมด"],["ROW","แถว"],["COL","คอลัมน์"],["DIAG","ทแยง"]].map(([value,label])=><button type="button" key={value} aria-pressed={filter===value} onClick={()=>setFilter(value)}>{label}</button>)}</div><label>เรียงตาม<select aria-label="เรียงรางวัลบิงโก" value={sort} onChange={e=>setSort(e.target.value)}><option value="bonus">โบนัสสูงสุด</option><option value="progress">ใกล้สำเร็จ</option></select></label></div>
    <div className="brp-lines">{visible.map(line=><button type="button" key={line.id} className={`brp-line${selectedId===line.id?" is-selected":""}${line.isClaimed?" is-claimed":""}`} aria-pressed={selectedId===line.id} aria-label={`${line.name} โบนัส ${line.tokenReward} โทเค็น สำเร็จ ${line.completedCount} จาก 5 ช่อง`} onClick={()=>onSelect(line.id)}><div className="brp-line-top"><span>{line.name}</span>{line.isClaimed?<small><Check size={11}/>รับแล้ว</small>:line.tokenReward===highest?<small>โบนัสสูงสุด</small>:null}</div><strong><Coins size={16}/>+{line.tokenReward}<span>โบนัส</span></strong><div className="brp-mini">{line.members.map(c=><i key={c.position} className={`${done(c)?"is-done":""} ${c.family==="DONATION"?"is-donation":""}`} aria-hidden="true">{done(c)?<Check size={11}/>:null}</i>)}</div><small>{line.completedCount}/5 ช่องสำเร็จ{line.isCompleted&&!line.isClaimed&&!closed?" · พร้อมรับ":""}</small></button>)}</div>
    {selected && <div className="brp-selection" aria-live="polite"><div><strong>{selected.name}</strong><button type="button" onClick={()=>document.querySelector(".xp-board-panel")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"})}><ArrowUp size={14}/>ดูบนกระดาน</button></div><div className="brp-selection-tokens"><span>โบนัสเส้น<strong>+{selected.tokenReward}</strong></span><span>ช่องที่ยังไม่สำเร็จ<strong>+{selected.remainingTokens}</strong></span>{!closed && <span>ยังรับเพิ่มได้รวม<strong>+{selected.totalRemaining}</strong></span>}</div><p>{closed?"กระดานนี้เลือกรับโบนัสแล้ว ตัวเลขนี้ใช้ดูรายละเอียดเส้นย้อนหลัง":"ยอดรวมเพิ่มได้เมื่อทำช่องที่เหลือครบและเลือกเส้นนี้ โดยไม่นับโทเค็นช่องที่รับไปแล้ว"}</p></div>}
    <p className="brp-note">ตัวเลขบนการ์ดคือโบนัสเส้น รางวัลรายช่องได้รับแยกต่างหาก กดการ์ดเพื่อไฮไลต์ 5 ช่องที่ต้องทำ</p>
  </section>;
}
