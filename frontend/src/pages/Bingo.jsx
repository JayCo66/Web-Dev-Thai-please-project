import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, ChevronRight, CircleHelp, Clock3, HeartHandshake, LayoutGrid, List, LoaderCircle, MapPin, RotateCcw, ShoppingBag, Sparkles, Target, Trophy, X } from 'lucide-react';
import api from '../services/api';
import demoInput from '../data/bingo-preview.json';
import './Bingo.css';

const families = {
  ACTIVITY: { label: 'ใช้จ่ายสม่ำเสมอ', icon: ShoppingBag, color: 'blue' },
  VARIETY: { label: 'ค้นพบร้านใหม่', icon: MapPin, color: 'violet' },
  TIME: { label: 'ช่วงเวลาดี ๆ', icon: Clock3, color: 'amber' },
  SPEND: { label: 'ใช้จ่ายตามเป้า', icon: Target, color: 'teal' },
  DONATION: { label: 'ส่งต่อสิ่งดี ๆ', icon: HeartHandshake, color: 'rose' },
};

function previewBoard() {
  const groups = Object.keys(families).filter(key => key !== 'DONATION').map(key => demoInput.quests.filter(q => q.family === key));
  const selected = [];
  for (let round = 0; selected.length < 24; round++) {
    for (const group of groups) if (group[round] && selected.length < 24) selected.push(group[round]);
  }
  const cells = selected.map((q, i) => {
    const level = i < 15 ? 3 : 2;
    const target = q.ladder[level - 1];
    return { quest_code: q.quest_code, title: q.text.replace(/\{n\}|\bn\b/g, String(target)), target_value: target, unit: q.unit, level, family: q.family, reason: `ผลงานย้อนหลังตัวอย่าง ${q.achieved_last_period} ${q.unit} · เป้าหมาย ${target} ${q.unit}` };
  });
  cells.splice(12, 0, { quest_code: 'DONATION', title: 'บริจาคให้มูลนิธิ 1 ครั้ง', target_value: 1, unit: 'ครั้ง', level: null, family: 'DONATION', reason: 'เปลี่ยนการให้เล็ก ๆ ของคุณให้เป็นโอกาสของใครอีกคน' });
  return cells.map((cell, position) => ({ ...cell, position }));
}

function normalizeBoard(data) {
  const cells = data?.bingo_board_5x5;
  if (!Array.isArray(cells) || cells.length !== 25 || new Set(cells.map(c => c.position)).size !== 25 || new Set(cells.map(c => c.quest_code)).size !== 25 || cells.filter(c => c.family === 'DONATION').length !== 1 || cells.some(c => !Number.isInteger(c.position) || c.position < 0 || c.position > 24 || !families[c.family] || typeof c.title !== 'string' || typeof c.unit !== 'string' || !Number.isFinite(c.target_value) || c.target_value <= 0 || (c.family !== 'DONATION' && ![1, 2, 3].includes(c.level)))) {
    throw new Error('ข้อมูลกระดานไม่ครบ กรุณาลองสร้างอีกครั้ง');
  }
  return [...cells].sort((a, b) => a.position - b.position);
}

export default function Bingo() {
  const [cells, setCells] = useState(previewBoard);
  const [completed, setCompleted] = useState([]);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');
  const [view, setView] = useState('grid');
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('ตัวอย่างกระดาน');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [help, setHelp] = useState(false);
  const dialog = useRef(null);
  const request = useRef(null);
  const trigger = useRef(null);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (selected || help) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected, help]);

  const close = () => { setSelected(null); setHelp(false); trigger.current?.focus(); };
  const openCell = (cell, event) => { trigger.current = event.currentTarget; setSelected(cell); };

  async function generate() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setBusy(true); setError(''); setNotice('');
    try {
      const response = await api.post('/quests/generate', demoInput, { signal: controller.signal, timeout: 135000 });
      const next = normalizeBoard(response.data.data);
      setCells(next); setCompleted([]); setFilter('ALL'); setSource('สร้างด้วย AI · ข้อมูลตัวอย่าง');
      setNotice('กระดานใหม่พร้อมแล้ว เลือกภารกิจที่อยากเริ่มได้เลย');
    } catch (err) {
      if (err.code !== 'ERR_CANCELED') setError(err.response?.data?.error || err.message || 'สร้างกระดานไม่สำเร็จ กรุณาลองอีกครั้ง');
    } finally {
      request.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  const done = completed.length;
  const selectedDone = selected && completed.includes(selected.quest_code);
  const activeFamily = selected ? families[selected.family] : null;
  const ModalIcon = activeFamily?.icon || CircleHelp;

  return <div className="bingo-page">
    <header className="bingo-nav"><div className="bingo-nav-inner">
      <Link to="/" className="bingo-brand"><span className="bingo-brand-mark">TP<span /></span><span>THAI Please<small>ทุกวันดีขึ้นได้ ด้วยกัน</small></span></Link>
      <nav aria-label="เมนูหลัก"><Link to="/">หน้าหลัก</Link><span aria-current="page">บิงโกของฉัน</span><Link to="/charities">ส่งต่อสิ่งดี ๆ</Link></nav>
      <span className="bingo-preview-badge"><span /> ทดลองใช้งาน</span>
    </div></header>

    <main className="bingo-main">
      <Link to="/" className="bingo-back"><ArrowLeft size={15} /> กลับหน้าหลัก</Link>
      <section className="bingo-hero">
        <div><span className="bingo-eyebrow"><Sparkles size={15} /> LITTLE MISSIONS, BIG IMPACT</span>
          <h1>ทุกช่องคือโอกาส<br /><em>สร้างสิ่งดี ๆ</em> ในทุกวัน</h1>
          <p>ค้นพบร้านใกล้ตัว ทำภารกิจที่ใช่สำหรับคุณ<br className="bingo-desktop-break" /> แล้วเติมเต็มกระดานด้วยเรื่องราวดี ๆ ไปด้วยกัน</p>
          <div className="bingo-hero-tags"><span><LayoutGrid size={15} /> 25 ช่องแห่งโอกาส</span><span><HeartHandshake size={15} /> 1 ภารกิจเพื่อสังคม</span></div>
        </div>
        <div className="bingo-art" aria-hidden="true"><span className="bingo-art-spark">✦</span><div className="bingo-art-board">{Array.from({ length: 9 }, (_, i) => <span key={i} className={i === 4 ? 'heart' : [0, 2, 6].includes(i) ? 'checked' : ''}>{i === 4 ? <HeartHandshake /> : [0, 2, 6].includes(i) ? <Check /> : <span />}</span>)}</div><div className="bingo-art-note"><span>เล็ก ๆ ที่คุณทำ</span><strong>ยิ่งใหญ่สำหรับใครบางคน ♡</strong></div><span className="bingo-art-dot" /></div>
      </section>

      <div className="bingo-workspace">
        <section className="bingo-board-panel" aria-label="กระดานภารกิจ">
          <div className="bingo-board-heading"><div><span className="bingo-eyebrow">YOUR BINGO BOARD</span><h2>กระดานของคุณ <span>5 × 5</span></h2><p>{source}</p></div><button className="bingo-icon-button" aria-label="วิธีใช้งาน" onClick={e => { trigger.current = e.currentTarget; setHelp(true); }}><CircleHelp size={21} /></button></div>
          <div className="bingo-toolbar"><div className="bingo-filters" aria-label="กรองประเภทภารกิจ"><button aria-pressed={filter === 'ALL'} onClick={() => setFilter('ALL')}>ทั้งหมด</button>{Object.entries(families).filter(([key]) => key !== 'DONATION').map(([key, info]) => <button key={key} aria-pressed={filter === key} onClick={() => setFilter(key)}><i className={info.color} />{info.label}</button>)}</div><div className="bingo-view"><button aria-label="มุมมองกระดาน" aria-pressed={view === 'grid'} onClick={() => setView('grid')}><LayoutGrid size={17} /></button><button aria-label="มุมมองรายการ" aria-pressed={view === 'list'} onClick={() => setView('list')}><List size={18} /></button></div></div>
          <p className="bingo-grid-hint">แตะช่องเพื่อดูรายละเอียด{filter !== 'ALL' && view === 'grid' ? ' · ช่องที่ตรงประเภทจะถูกเน้น โดยคงตำแหน่งกระดานเดิม' : ''}</p>
          {busy && <div className="bingo-loading" role="status"><LoaderCircle size={20} className="bingo-spin" /> AI กำลังจัดภารกิจให้คุณ อาจใช้เวลาประมาณ 1–2 นาที</div>}
          {error && <div className="bingo-error" role="alert">{error}<button onClick={generate} disabled={busy}>ลองใหม่</button></div>}
          {notice && <p className="bingo-notice" role="status">{notice}</p>}
          <div className={`bingo-cells ${view === 'list' ? 'list' : ''}`}>
            {cells.filter(cell => view === 'grid' || filter === 'ALL' || filter === cell.family).map(cell => {
              const info = families[cell.family]; const Icon = info.icon; const isDone = completed.includes(cell.quest_code);
              return <button key={cell.position} className={`bingo-cell ${info.color} ${cell.family === 'DONATION' ? 'donation' : ''} ${isDone ? 'done' : ''} ${view === 'grid' && filter !== 'ALL' && filter !== cell.family ? 'muted' : ''}`} onClick={e => openCell(cell, e)} aria-label={`ช่อง ${cell.position + 1}: ${cell.title}${isDone ? ' สำเร็จแบบจำลอง' : ''}`}>
                <div className="bingo-cell-top"><span className="bingo-cell-icon">{isDone ? <Check size={18} /> : <Icon size={19} />}</span><span className="bingo-cell-number">{String(cell.position + 1).padStart(2, '0')}</span></div>
                <span className="bingo-cell-title">{cell.title}</span>
                <span className="bingo-cell-footer">{cell.family === 'DONATION' ? <span>ส่งต่อด้วยใจ ♡</span> : <span className="bingo-level" aria-label={`ระดับ ${cell.level}`}>{[1, 2, 3].map(level => <i key={level} className={level <= cell.level ? 'filled' : ''} />)}<span>ระดับ {cell.level}</span></span>}{isDone && <Check size={13} />}</span>
              </button>;
            })}
          </div>
          <div className="bingo-board-foot"><span><span className="bingo-status-dot" /> พร้อมเริ่มภารกิจ</span><span>ความคืบหน้าในหน้านี้เป็นการจำลอง</span></div>
        </section>

        <aside className="bingo-sidebar">
          <section className="bingo-progress-card"><div className="bingo-side-heading"><span className="bingo-side-icon"><Trophy size={21} /></span><span>ทีละช่อง ใกล้เป้าหมาย</span></div><div className="bingo-progress-number">{done}<span>/ 25</span><small>ภารกิจสำเร็จ · แบบจำลอง</small></div><progress aria-label="ภารกิจสำเร็จแบบจำลอง" value={done} max={25} /><p>{done ? 'ทุกก้าวเล็ก ๆ มีความหมาย ไปต่อด้วยกันนะ' : 'เริ่มจากภารกิจง่าย ๆ ที่เข้ากับวันของคุณ'}</p><div className="bingo-mini-stats"><div><strong>{25 - done}</strong><span>รอให้คุณลอง</span></div><div><strong>{Math.round(done / 25 * 100)}%</strong><span>ของกระดาน</span></div></div></section>
          <section className="bingo-impact-card"><span className="bingo-impact-icon"><HeartHandshake size={29} /></span><span className="bingo-eyebrow">A LITTLE KINDNESS</span><h3>ช่องเล็ก ๆ<br />ที่ส่งต่อได้ไกล</h3><p>ร่วมสนับสนุนมูลนิธิที่คุณใส่ใจ<br />ให้การใช้จ่ายมีความหมายมากขึ้น</p><Link to="/charities">รู้จักโครงการเพื่อสังคม <ArrowRight size={17} /></Link></section>
          <section className="bingo-ai-card"><h3><Sparkles size={18} /> ลองกระดานที่ AI เลือก</h3><p>สร้างจากข้อมูลผู้ใช้ตัวอย่าง 30 วัน ยังไม่ใช่ประวัติของบัญชีคุณ</p><button className="bingo-primary" disabled={busy} onClick={generate}>{busy ? <LoaderCircle size={17} className="bingo-spin" /> : <Sparkles size={17} />}{busy ? 'กำลังสร้างกระดาน…' : 'สร้างกระดานด้วย AI'}</button><small>ใช้ API จริงเมื่อกด · การสร้างใหม่จะล้างความคืบหน้าจำลอง</small><button className="bingo-reset" disabled={busy} onClick={() => { setCells(previewBoard()); setCompleted([]); setFilter('ALL'); setError(''); setNotice('กลับสู่กระดานตัวอย่างแล้ว'); setSource('ตัวอย่างกระดาน'); }}><RotateCcw size={14} /> กลับกระดานตัวอย่าง</button></section>
        </aside>
      </div>
      <footer className="bingo-footer"><span>THAI Please</span> ใช้จ่ายใกล้ตัว ส่งต่อให้สังคม</footer>
    </main>

    <dialog ref={dialog} className="bingo-dialog" onCancel={close} onClose={() => { setSelected(null); setHelp(false); }} onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="bingo-dialog-content"><button autoFocus className="bingo-dialog-close bingo-icon-button" onClick={close} aria-label="ปิดรายละเอียด"><X size={22} /></button>
        {selected ? <><span className={`bingo-modal-icon ${activeFamily.color}`}><ModalIcon size={30} /></span><span className="bingo-eyebrow">{activeFamily.label} · ช่อง {selected.position + 1}</span><h2>{selected.title}</h2><p>{selected.reason}</p><div className="bingo-modal-target"><span>เป้าหมายภารกิจ</span><strong>{selected.target_value.toLocaleString()} <small>{selected.unit}</small></strong></div><p className="bingo-demo-note">กระดานทดลอง: ปุ่มด้านล่างจำลองสถานะบนหน้านี้เท่านั้น ยังไม่เชื่อมการชำระเงินหรือรับรางวัล และจะเริ่มใหม่เมื่อรีเฟรชหน้า</p><button className="bingo-primary" onClick={() => { setCompleted(previous => selectedDone ? previous.filter(code => code !== selected.quest_code) : [...previous, selected.quest_code]); close(); }}>{selectedDone ? <RotateCcw size={18} /> : <Check size={18} />}{selectedDone ? 'ยกเลิกสถานะจำลอง' : 'ทดลองทำภารกิจสำเร็จ'}</button><Link className="bingo-modal-link" to={selected.family === 'DONATION' ? '/charities' : '/payment'}>{selected.family === 'DONATION' ? 'ดูโครงการที่ร่วมบริจาคได้' : 'ไปหน้าชำระเงิน'}<ChevronRight size={16} /></Link></> : <><span className="bingo-modal-icon blue"><CircleHelp size={30} /></span><h2>เริ่มต้นบิงโกของคุณ</h2><ol><li>เลือกดูภารกิจบนกระดาน 25 ช่อง</li><li>แตะช่องเพื่อดูเป้าหมายและระดับ 1–3</li><li>ลองเปลี่ยนสถานะสำเร็จ เพื่อดูความคืบหน้าจำลอง</li><li>กดสร้างด้วย AI เพื่อทดลองภารกิจชุดใหม่</li></ol><p className="bingo-demo-note">รุ่นทดลองนี้ยังไม่มีการตรวจเส้นชนะหรือแจกโทเค็น ผลงานจำลองไม่ถูกบันทึกลงฐานข้อมูล</p><button className="bingo-primary" onClick={close}>เข้าใจแล้ว เริ่มสำรวจเลย <ArrowRight size={17} /></button></>}
      </div>
    </dialog>
  </div>;
}
