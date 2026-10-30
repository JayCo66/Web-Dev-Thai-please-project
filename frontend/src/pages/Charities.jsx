import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  HeartHandshake,
  Search,
  X,
  GraduationCap,
  Trees,
  HeartPulse,
  Users,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
const categories = {
  EDUCATION: { label: "การศึกษา", icon: GraduationCap },
  ENVIRONMENT: { label: "สิ่งแวดล้อม", icon: Trees },
  COMMUNITY: { label: "ชุมชน", icon: Users },
  HEALTHCARE: { label: "สุขภาพ", icon: HeartPulse },
};
const official = {
  มูลนิธิยุวพัฒน์: {
    image: "yuvabadhana.png",
    url: "https://www.yuvabadhanafoundation.org/th/home/",
  },
  มูลนิธิสืบนาคะเสถียร: { image: "seub.png", url: "https://www.seub.or.th/" },
  มูลนิธิกระจกเงา: { image: "mirror.png", url: "https://www.mirror.or.th/" },
  "มูลนิธิรามาธิบดี ในพระราชูปถัมภ์ฯ": {
    image: "ramathibodi.png",
    url: "https://www.ramafoundation.or.th/",
  },
};
const money = (n) =>
  Number(n || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
const description = (text) =>
  String(text || "")
    .replace(/\s*\(สถานสาธารณกุศล.*$/, "")
    .trim();
export default function Charities() {
  const { wallet, refreshUser } = useAuth();
  const [list, setList] = useState([]),
    [history, setHistory] = useState([]),
    [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const resultsTop = useRef(null);
  const pageSize = 6;
  const [tab, setTab] = useState("discover"),
    [filter, setFilter] = useState("ALL"),
    [query, setQuery] = useState("");
  const [selected, setSelected] = useState(null),
    [amount, setAmount] = useState("50"),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [success, setSuccess] = useState(null);
  const dialog = useRef(null),
    request = useRef(null);
  const load = useCallback(async () => {
    try {
      const [a, b] = await Promise.all([
        api.get("/charities"),
        api.get("/charities/my-donations"),
      ]);
      setList(a.data.data);
      setHistory(b.data.data);
    } catch (e) {
      setError(e.response?.data?.error || "โหลดมูลนิธิไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    if (selected) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selected]);
  function choose(item) {
    setSelected(item);
    setAmount("50");
    setError("");
    setSuccess(null);
    request.current = null;
  }
  const close = () => {
    if (!busy) setSelected(null);
  };
  async function donate(e) {
    e.preventDefault();
    if (busy) return;
    const signature = `${selected.charityId}:${Number(amount)}`;
    if (request.current?.signature !== signature)
      request.current = { signature, id: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/charities/donate", {
        charityId: selected.charityId,
        amount: Number(amount),
        requestId: request.current.id,
      });
      setSuccess(data.data);
      setSelected(null);
      await refreshUser();
      await load();
    } catch (e) {
      setError(
        e.response?.data?.error ||
          "ยังยืนยันไม่ได้ กดลองใหม่เพื่อตรวจรายการเดิม",
      );
    } finally {
      setBusy(false);
    }
  }
  const filtered = list
    .filter(
      (item) =>
        (filter === "ALL" || item.impactType === filter) &&
        item.name.includes(query.trim()),
    )
    .sort((a, b) => Number(!!official[b.name]) - Number(!!official[a.name]));
  function goToPage(next) {
    setPage(next);
    resultsTop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const balance = Number(wallet?.balance || 0),
    total = history.reduce((sum, item) => sum + Number(item.amount), 0);
  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">สิ่งเล็ก ๆ ที่ส่งต่อได้</span>
            <h1>เลือกสิ่งที่อยากช่วย</h1>
            <p>ค้นหามูลนิธิที่ตรงใจ แล้วเริ่มให้ในแบบของคุณ</p>
          </div>
          <div className="xp-impact-total">
            <HeartHandshake />
            <span>
              คุณร่วมให้แล้ว<strong>฿{money(total)}</strong>
              <small>ยอดทดลองสะสม</small>
            </span>
          </div>
        </div>
        <div className="segmented xp-charity-tabs">
          <button
            aria-pressed={tab === "discover"}
            onClick={() => setTab("discover")}
          >
            เลือกมูลนิธิ
          </button>
          <button
            aria-pressed={tab === "history"}
            onClick={() => setTab("history")}
          >
            ประวัติของฉัน <span>{history.length}</span>
          </button>
        </div>
        {error && !selected && (
          <div className="notice notice--error" role="alert">
            {error}
            <button className="button button--ghost" onClick={load}>
              ลองใหม่
            </button>
          </div>
        )}
        {success && (
          <div className="notice notice--success" role="status">
            <CheckCircle2 />
            <span>
              บริจาคทดลอง ฿{money(success.amount)} ให้{success.charityName}แล้ว
              · ได้รับ{" "}
              {success.bonusTokensAwarded +
                (success.questUpdate?.tokensAwarded || 0)}{" "}
              แต้ม <Link to="/bingo">ดูภารกิจบิงโก</Link>
            </span>
          </div>
        )}
        {loading ? (
          <div className="empty-state" role="status">
            กำลังโหลดมูลนิธิ…
          </div>
        ) : tab === "discover" ? (
          <>
            <div className="xp-charity-tools" ref={resultsTop}>
              <label className="xp-search">
                <Search size={18} />
                <input
                  aria-label="ค้นหามูลนิธิ"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="ค้นหาชื่อมูลนิธิ"
                />
              </label>
              <div className="xp-category-chips">
                <button
                  aria-pressed={filter === "ALL"}
                  onClick={() => {
                    setFilter("ALL");
                    setPage(1);
                  }}
                >
                  ทั้งหมด
                </button>
                {Object.entries(categories).map(([key, cat]) => (
                  <button
                    key={key}
                    aria-pressed={filter === key}
                    onClick={() => {
                      setFilter(key);
                      setPage(1);
                    }}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
            <p className="xp-quiet-note">
              รายการบริจาคในหน้านี้เป็นการทดลอง ไม่มีการโอนเงินถึงมูลนิธิจริง
            </p>
            <div className="xp-charity-grid">
              {filtered
                .slice((page - 1) * pageSize, page * pageSize)
                .map((item) => {
                  const cat =
                      categories[item.impactType] || categories.COMMUNITY,
                    asset = official[item.name];
                  return (
                    <article
                      className="panel xp-charity-card"
                      key={item.charityId}
                    >
                      <div
                        className={`xp-charity-art xp-charity-art--${item.impactType.toLowerCase()}`}
                      >
                        <img
                          className="xp-charity-cover"
                          src={item.coverImageUrl}
                          alt={`${item.imageCaption} · ${item.name}`}
                          style={{
                            objectPosition: item.imagePosition || "center",
                          }}
                          loading="lazy"
                        />
                        {asset && (
                          <span className="xp-charity-brand">
                            <img
                              src={`/assets/charities/${asset.image}`}
                              alt={`ตราสัญลักษณ์${item.name}`}
                            />
                          </span>
                        )}
                        <span className="xp-photo-caption">
                          {item.imageCaption}
                        </span>
                        <span className="badge">{cat.label}</span>
                      </div>
                      <div className="xp-charity-copy">
                        <h2>{item.name}</h2>
                        <p>{description(item.description)}</p>
                        <div className="xp-charity-numbers">
                          <span>
                            ยอดทดลอง{" "}
                            <strong>฿{money(item.totalDonations)}</strong>
                          </span>
                          <span>{item.donorCount} คนร่วมให้</span>
                        </div>
                        <div className="xp-charity-card-actions">
                          <button
                            className="button button--primary"
                            onClick={() => choose(item)}
                          >
                            ร่วมให้
                            <ArrowRight size={16} />
                          </button>
                          {(asset || item.websiteUrl) && (
                            <a
                              href={item.websiteUrl || asset?.url}
                              target="_blank"
                              rel="noreferrer"
                              className="xp-official-link"
                            >
                              เว็บไซต์มูลนิธิ
                              <ExternalLink size={13} />
                            </a>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
            </div>
            {filtered.length === 0 && (
              <div className="empty-state">
                <Search />
                <h2>ยังไม่เจอมูลนิธิที่ค้นหา</h2>
                <button
                  className="button button--secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("ALL");
                  }}
                >
                  ดูทั้งหมด
                </button>
              </div>
            )}
            {filtered.length > 0 && (
              <nav className="xp-pagination" aria-label="หน้ามูลนิธิ">
                <p className="text-muted">
                  แสดง {(page - 1) * pageSize + 1}–
                  {Math.min(page * pageSize, filtered.length)} จาก{" "}
                  {filtered.length} มูลนิธิ
                </p>
                <div>
                  <button
                    className="button button--secondary"
                    disabled={page === 1}
                    onClick={() => goToPage(page - 1)}
                    aria-label="หน้าก่อนหน้า"
                  >
                    ←
                  </button>
                  {Array.from(
                    { length: Math.ceil(filtered.length / pageSize) },
                    (_, i) => i + 1,
                  ).map((n) => (
                    <button
                      key={n}
                      className={`button ${page === n ? "button--primary" : "button--secondary"}`}
                      aria-current={page === n ? "page" : undefined}
                      aria-label={`หน้า ${n}`}
                      onClick={() => goToPage(n)}
                    >
                      {n}
                    </button>
                  ))}
                  <button
                    className="button button--secondary"
                    disabled={page === Math.ceil(filtered.length / pageSize)}
                    onClick={() => goToPage(page + 1)}
                    aria-label="หน้าถัดไป"
                  >
                    →
                  </button>
                </div>
              </nav>
            )}
            <details className="xp-image-credit">
              <summary>เกี่ยวกับข้อมูลและภาพ</summary>
              <p>
                ใช้ชื่อมูลนิธิจากชุดข้อมูลโครงงาน
                ภาพกิจกรรมและตราสัญลักษณ์มาจากเว็บไซต์ทางการหลายมูลนิธิ
                ใช้ประกอบการศึกษา ไม่มีความร่วมมือหรือการรับรองจากมูลนิธิ
                ภาพที่ไม่ได้มาจากองค์กรนั้นระบุว่าเป็นภาพประกอบหมวดหมู่
              </p>
            </details>
          </>
        ) : (
          <section className="panel xp-token-history">
            {history.length === 0 ? (
              <div className="empty-state">
                <HeartHandshake />
                <h2>การให้ครั้งแรกเริ่มได้เลย</h2>
                <button
                  className="button button--primary"
                  onClick={() => setTab("discover")}
                >
                  เลือกมูลนิธิ
                </button>
              </div>
            ) : (
              history.map((item) => (
                <div key={item.donationId}>
                  <span>
                    <strong>{item.charityName}</strong>
                    <small>
                      {new Date(item.donatedAt).toLocaleString("th-TH", {
                        timeZone: "Asia/Bangkok",
                      })}{" "}
                      · บริจาคทดลอง
                    </small>
                  </span>
                  <strong>฿{money(item.amount)}</strong>
                </div>
              ))
            )}
          </section>
        )}
        <dialog
          ref={dialog}
          className="dialog-sheet"
          aria-labelledby="donation-title"
          onCancel={(e) => {
            e.preventDefault();
            close();
          }}
        >
          <form onSubmit={donate}>
            <div className="dialog-head">
              <span className="page-eyebrow">ร่วมให้ · ใช้เงินทดลอง</span>
              <button
                className="button button--icon"
                type="button"
                aria-label="ปิด"
                onClick={close}
                disabled={busy}
              >
                <X />
              </button>
            </div>
            <div className="dialog-body">
              <h2 id="donation-title">{selected?.name}</h2>
              <p className="text-muted">เงินทดลองคงเหลือ ฿{money(balance)}</p>
              <div className="xp-amount-presets">
                {[20, 50, 100, 200].map((n) => (
                  <button
                    type="button"
                    key={n}
                    aria-pressed={Number(amount) === n}
                    onClick={() => setAmount(String(n))}
                    disabled={busy}
                  >
                    ฿{n}
                  </button>
                ))}
              </div>
              <label className="form-field">
                <span className="field-label">จำนวนที่ร่วมให้ (บาท)</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  max={Math.min(100000, balance)}
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <p className="xp-quiet-note">
                รายการทดลอง ไม่มีใบรับบริจาคหรือสิทธิลดหย่อนภาษี
              </p>
              {error && (
                <p className="notice notice--error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  className="button button--secondary"
                  type="button"
                  disabled={busy}
                  onClick={close}
                >
                  ไว้ก่อน
                </button>
                <button
                  className="button button--primary"
                  disabled={
                    busy || Number(amount) <= 0 || Number(amount) > balance
                  }
                >
                  {busy ? "กำลังบันทึก…" : `ยืนยันร่วมให้ ฿${money(amount)}`}
                </button>
              </div>
            </div>
          </form>
        </dialog>
      </main>
    </div>
  );
}
