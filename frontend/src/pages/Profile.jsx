import { useState } from "react";
import { Link } from "react-router-dom";
import {
  UserRound,
  Wallet,
  Coins,
  ShieldCheck,
  LogOut,
  ArrowLeft,
  Plus,
} from "lucide-react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";

export default function Profile() {
  const { user, wallet, tokens, shop, resetBalance, logout } = useAuth();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const money = (value) =>
    Number(value || 0).toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  const role =
    {
      CITIZEN: "ผู้ใช้งาน",
      MERCHANT: "ร้านค้า",
      ADMIN: "ผู้ดูแลระบบ",
      GOV_EXECUTIVE: "ผู้บริหาร",
    }[user?.role] || "ผู้ใช้งาน";
  async function topup() {
    if (busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await resetBalance(500);
      if (result?.success === false) throw new Error(result.error);
      setNotice("เติมเงินทดลอง 500 บาทแล้ว");
    } catch (e) {
      setError(e.message || "เติมเงินไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <Navbar />
      <main id="main-content" className="app-main">
        <Link className="xp-back-link" to="/">
          <ArrowLeft size={17} />
          กลับหน้าหลัก
        </Link>
        <div className="page-heading">
          <div>
            <span className="page-eyebrow">ข้อมูลของคุณ</span>
            <h1>บัญชีของฉัน</h1>
            <p>ดูยอดคงเหลือและข้อมูลที่ใช้ในระบบ</p>
          </div>
        </div>
        {notice && (
          <p className="notice notice--success" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        <section className="panel xp-profile-identity">
          <span className="xp-profile-avatar">
            <UserRound size={30} />
          </span>
          <div>
            <span className="badge">{role}</span>
            <h2>{user?.fullName || user?.name || "ผู้ใช้งาน"}</h2>
            <p className="text-muted">
              <ShieldCheck size={15} />{" "}
              {wallet?.simulation
                ? "บัญชีทดลอง ไม่ได้เชื่อมต่อ ThaiD"
                : "บัญชีที่เข้าสู่ระบบแล้ว"}
            </p>
          </div>
        </section>
        <div className="xp-profile-grid">
          <section className="panel xp-profile-detail">
            <h2>ข้อมูลบัญชี</h2>
            <dl className="xp-receipt">
              <div>
                <dt>อีเมล</dt>
                <dd>{user?.maskedEmail || user?.email || "ยังไม่ได้ระบุ"}</dd>
              </div>
              <div>
                <dt>โทรศัพท์</dt>
                <dd>{user?.maskedPhone || "ยังไม่ได้ระบุ"}</dd>
              </div>
              {user?.maskedCitizenId && (
                <div>
                  <dt>เลขประจำตัวที่ปกปิดแล้ว</dt>
                  <dd>{user.maskedCitizenId}</dd>
                </div>
              )}
              {shop && (
                <div>
                  <dt>ร้านค้า</dt>
                  <dd>{shop.shopName || shop.name || "ร้านค้าของคุณ"}</dd>
                </div>
              )}
            </dl>
            <button className="button button--secondary" onClick={logout}>
              <LogOut size={17} />
              ออกจากระบบ
            </button>
          </section>
          <section className="panel xp-profile-detail">
            <h2>
              <Wallet size={20} />
              กระเป๋าเงินทดลอง
            </h2>
            <strong className="xp-profile-balance">
              ฿{money(wallet?.balance)}
            </strong>
            <p className="text-muted">
              ยอดนี้บันทึกที่ระบบ ใช้ทดลองชำระเงินและบริจาค
            </p>
            <button
              className="button button--primary"
              disabled={busy}
              onClick={topup}
            >
              <Plus size={17} />
              {busy ? "กำลังเติม…" : "เติมเงินทดลอง ฿500"}
            </button>
            <Link className="xp-inline-link" to="/payment">
              ไปหน้าชำระเงิน
            </Link>
          </section>
          <section className="panel xp-profile-detail">
            <h2>
              <Coins size={20} />
              โทเค็นของคุณ
            </h2>
            <strong className="xp-profile-balance">
              {Number(tokens || 0).toLocaleString("th-TH")} <small>แต้ม</small>
            </strong>
            <p className="text-muted">
              รับแต้มจากภารกิจแล้วเลือกสิทธิ์ลุ้นหรือแลกรางวัล
            </p>
            <Link className="button button--secondary" to="/rewards">
              ดูรางวัลและสิทธิ์ของฉัน
            </Link>
          </section>
        </div>
      </main>
    </div>
  );
}
