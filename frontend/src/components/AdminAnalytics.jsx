import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, TrendingUp, Lightbulb } from 'lucide-react';
import api from '../services/api';
import '../styles/admin-analytics.css';

const money = (n) => Number(n || 0).toLocaleString('th-TH', { maximumFractionDigits: 0 });
const IMPACT = { EDUCATION: 'การศึกษา', ENVIRONMENT: 'สิ่งแวดล้อม', COMMUNITY: 'ชุมชน', HEALTHCARE: 'สาธารณสุข', OTHER: 'อื่น ๆ' };
const SOURCE = { AI: 'AI (Typhoon)', RULE_BASED: 'กฎสำรอง', UNKNOWN: 'ไม่ระบุ' };
const SORTS = {
  rateDesc: ['สำเร็จมากสุด', (a, b) => b.rate - a.rate || b.offered - a.offered],
  rateAsc: ['สำเร็จน้อยสุด', (a, b) => a.rate - b.rate || b.offered - a.offered],
  offered: ['ถูกเสนอมากสุด', (a, b) => b.offered - a.offered],
};
const tone = (rate) => (rate >= 60 ? 'good' : rate >= 30 ? 'mid' : 'low');

function Bar({ value, max = 100, tone: t = 'mid', label, hint }) {
  return (
    <div className="aa-bar" title={hint}>
      <span className="aa-bar-label">{label}</span>
      <span className="aa-bar-track"><span className={`aa-bar-fill aa-${t}`} style={{ width: `${Math.min(100, (value / (max || 1)) * 100)}%` }} /></span>
      <span className="aa-bar-value">{hint ?? `${value}%`}</span>
    </div>
  );
}

function Card({ title, note, children }) {
  return (
    <section className="aa-card">
      <h3>{title}</h3>
      {note && <p className="aa-note">{note}</p>}
      {children}
    </section>
  );
}

export default function AdminAnalytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState('ALL');
  const [sort, setSort] = useState('rateAsc');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/analytics');
      setData(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || 'โหลดข้อมูลวิเคราะห์ไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (error) return <p className="notice notice--error" role="alert">{error}</p>;
  if (!data) return <p>กำลังคำนวณข้อมูลวิเคราะห์...</p>;

  const { quests, spending, funnel, donations, tokens, insights } = data;
  const rows = quests.quests.filter((q) => family === 'ALL' || q.family === family).sort(SORTS[sort][1]);
  const maxDay = Math.max(1, ...spending.trend.map((d) => d.total));
  const maxHour = Math.max(1, ...spending.hours.map((h) => h.count));
  const sources = Object.entries(quests.boards.source);

  return (
    <section aria-label="ข้อมูลวิเคราะห์ BI" className="aa">
      <div className="aa-head">
        <p className="aa-note">ข้อมูลทั้งหมดคำนวณสดจากฐานข้อมูล ณ {new Date(data.generatedAt).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}</p>
        <button type="button" className="button button--secondary" onClick={load} disabled={loading}><RefreshCw size={16} />รีเฟรช</button>
      </div>

      <div className="aa-kpis">
        <div><span>อัตราสำเร็จภารกิจรวม</span><strong>{quests.boards.completionRate}%</strong><small>{quests.boards.cellsDone}/{quests.boards.cellsTotal} ช่อง · {quests.boards.count} กระดาน</small></div>
        <div><span>ยอดใช้จ่ายรวม</span><strong>฿{money(spending.summary.total)}</strong><small>{spending.summary.count} รายการ · เฉลี่ย ฿{money(spending.summary.average)}</small></div>
        <div><span>ผู้ใช้ที่จ่ายซ้ำ</span><strong>{spending.summary.repeatRate}%</strong><small>{spending.summary.repeatPayers}/{spending.summary.payers} คนที่เคยจ่าย</small></div>
        <div><span>โทเค็นที่ถูกใช้</span><strong>{tokens.redemptionRate}%</strong><small>ออก {money(tokens.issued)} · ใช้ {money(tokens.spent)}</small></div>
      </div>

      <Card title="ข้อสังเกตจากข้อมูล">
        <ul className="aa-insights">
          {insights.map((i) => <li key={i.text} className={`aa-insight aa-insight--${i.tone}`}><Lightbulb size={16} />{i.text}</li>)}
        </ul>
      </Card>

      <Card title="อัตราสำเร็จรายภารกิจ" note="สำเร็จ = ช่องที่ผู้ใช้ทำครบ ÷ ช่องที่ระบบเสนอ รวมกระดานที่ยังเล่นไม่จบ ภารกิจที่ถูกเสนอน้อยกว่า 5 ช่องแสดงไว้แต่ยังไม่ควรใช้สรุป">
        <div className="aa-toolbar">
          <div className="aa-chips" role="group" aria-label="กรองกลุ่มภารกิจ">
            <button type="button" className={family === 'ALL' ? 'is-active' : ''} onClick={() => setFamily('ALL')}>ทุกกลุ่ม</button>
            {quests.families.map((f) => <button type="button" key={f.family} className={family === f.family ? 'is-active' : ''} onClick={() => setFamily(f.family)}>{f.label}</button>)}
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="เรียงลำดับ">
            {Object.entries(SORTS).map(([key, [label]]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </div>
        <div className="aa-table-wrap">
          <table className="aa-table">
            <thead><tr><th>ภารกิจ</th><th>เสนอ</th><th>สำเร็จ</th><th className="aa-rate-col">อัตราสำเร็จ</th><th>ระดับเฉลี่ย</th><th>คืบหน้าเฉลี่ย</th></tr></thead>
            <tbody>
              {rows.map((q) => (
                <tr key={q.questCode} className={q.reliable ? '' : 'aa-faint'}>
                  <td><strong>{q.title}</strong><small>{quests.families.find((f) => f.family === q.family)?.label}{q.reliable ? '' : ' · ข้อมูลน้อย'}</small></td>
                  <td>{q.offered}</td>
                  <td>{q.completed}</td>
                  <td><Bar value={q.rate} tone={tone(q.rate)} label="" /></td>
                  <td>{q.avgLevel}</td>
                  <td>{q.avgProgress}%</td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan="6">ยังไม่มีข้อมูลกระดาน</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="aa-grid">
        <Card title="อัตราสำเร็จตามกลุ่มภารกิจ">
          {quests.families.map((f) => <Bar key={f.family} label={f.label} value={f.rate} tone={tone(f.rate)} hint={`${f.rate}% (${f.completed}/${f.offered})`} />)}
        </Card>
        <Card title="อัตราสำเร็จตามระดับความยาก" note="ถ้าระดับยากสำเร็จน้อยมากอาจตั้งเป้าสูงเกินไป">
          {quests.levels.map((l) => <Bar key={l.level} label={`ระดับ ${l.level}`} value={l.rate} tone={tone(l.rate)} hint={`${l.rate}% (${l.completed}/${l.offered})`} />)}
        </Card>
        <Card title="เส้นทางผู้ใช้ (Funnel)" note="แต่ละขั้นนับเฉพาะคนที่ผ่านขั้นก่อนหน้า">
          {funnel.map((f) => <Bar key={f.label} label={f.label} value={f.percentOfTotal} tone="mid" hint={`${f.count} คน (${f.percentOfTotal}%)`} />)}
        </Card>
        <Card title="แหล่งที่มาของกระดาน" note="ใช้เทียบ AI กับกฎสำรองเมื่อมีทั้งสองกลุ่ม">
          {sources.map(([key, count]) => <Bar key={key} label={SOURCE[key] || key} value={count} max={quests.boards.count} tone="mid" hint={`${count} กระดาน`} />)}
        </Card>
      </div>

      <div className="aa-grid">
        <Card title="ยอดใช้จ่ายรายวัน (14 วัน)">
          <div className="aa-columns" role="img" aria-label="กราฟแท่งยอดใช้จ่ายรายวัน">
            {spending.trend.map((d) => (
              <div key={d.date} title={`${d.date}: ฿${money(d.total)} · ${d.count} รายการ`}>
                <span style={{ height: `${Math.max(d.total > 0 ? 6 : 2, (d.total / maxDay) * 100)}%` }} />
                <small>{d.date.slice(8)}</small>
              </div>
            ))}
          </div>
        </Card>
        <Card title="ช่วงเวลาที่ใช้จ่าย" note="ใช้ออกแบบภารกิจตามช่วงเวลา">
          {spending.hours.map((h) => <Bar key={h.key} label={h.label} value={h.count} max={maxHour} tone="mid" hint={`${h.count} รายการ`} />)}
        </Card>
        <Card title="ยอดใช้จ่ายตามหมวดร้านค้า">
          {spending.categories.map((c) => <Bar key={c.category} label={c.category} value={c.share} tone="mid" hint={`฿${money(c.total)} (${c.share}%)`} />)}
        </Card>
        <Card title="การบริจาคตามด้าน" note={`รวม ${donations.count} ครั้ง ฿${money(donations.total)}`}>
          {donations.byImpact.length === 0 && <p className="aa-note">ยังไม่มีการบริจาค</p>}
          {donations.byImpact.map((d) => <Bar key={d.impactType} label={IMPACT[d.impactType] || d.impactType} value={d.total} max={donations.total} tone="mid" hint={`฿${money(d.total)} (${d.count} ครั้ง)`} />)}
        </Card>
      </div>

      <Card title="ร้านค้ายอดขายสูงสุด" note="อันดับตามยอดขายรวม">
        <table className="aa-table">
          <thead><tr><th>ร้าน</th><th>หมวด</th><th>รายการ</th><th>ลูกค้า</th><th>ยอดขาย</th></tr></thead>
          <tbody>
            {spending.topShops.map((s) => <tr key={s.name}><td><strong>{s.name}</strong></td><td>{s.category}</td><td>{s.count}</td><td>{s.customers}</td><td>฿{money(s.total)}</td></tr>)}
          </tbody>
        </table>
      </Card>
      <p className="aa-note"><TrendingUp size={14} /> ตัวเลขใช้ข้อมูลในฐานข้อมูลปัจจุบันทั้งหมด หากเป็นข้อมูลทดลองให้ตีความเป็นตัวอย่างการทำงานของรายงาน ไม่ใช่ผลของผู้ใช้จริง</p>
    </section>
  );
}
