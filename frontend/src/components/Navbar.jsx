import ProjectBrand from "./ProjectBrand";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Coins,
  Grid2X2,
  HeartHandshake,
  Home,
  Gift,
  LogOut,
  UserRound,
  X,
  FlaskConical,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/experience.css";
import "../styles/project-refinements.css";
import "../styles/auth-refinements.css";

const baseDestinations = [
  { to: "/", label: "หน้าหลัก", icon: Home, end: true },
  { to: "/bingo", label: "บิงโก", icon: Grid2X2 },
  { to: "/charities", label: "มูลนิธิ", icon: HeartHandshake },
  { to: "/rewards", label: "รางวัล", icon: Gift },
];

export default function Navbar() {
  const { user, tokens, logout } = useAuth();
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);

  const isAdmin = ["ADMIN", "GOV_EXECUTIVE"].includes(user?.role);
  const isMerchant = user?.role === "MERCHANT";
  const destinations = isMerchant
    ? [{ to: "/merchant", label: "ร้านของฉัน", icon: Store }]
    : isAdmin
      ? [...baseDestinations, { to: "/admin", label: "ภาครัฐ (Admin)", icon: ShieldCheck }]
      : baseDestinations;

  useEffect(() => {
    if (dialog) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [dialog]);

  const navItems = destinations.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) => `xp-nav-link${isActive ? " is-active" : ""}`}
    >
      <Icon size={19} aria-hidden="true" />
      <span>{label}</span>
    </NavLink>
  ));

  return (
    <>
      <a href="#main-content" className="xp-skip-link">
        ข้ามไปเนื้อหา
      </a>
      <header className="xp-header">
        <div className="xp-header-inner">
          <Link to="/" className="xp-brand" aria-label="ไทยช่วยไทยพลีส หน้าหลัก">
            <ProjectBrand/>
          </Link>
          <nav className="xp-desktop-nav" aria-label="เมนูหลัก">
            {navItems}
          </nav>
          <div className="xp-header-actions">
            <button
              type="button"
              className="xp-demo-label"
              onClick={() => setDialog("demo")}
            >
              <FlaskConical size={14} />
              <span>โหมดสาธิต</span>
            </button>
            {!isMerchant && <Link
              to="/rewards"
              className="xp-token-pill"
              aria-label={`${Number(tokens || 0).toLocaleString("th-TH")} โทเค็น ดูรางวัล`}
            >
              <Coins size={17} />
              <span>{Number(tokens || 0).toLocaleString("th-TH")}</span>
            </Link>}
            <button
              type="button"
              className="xp-avatar"
              onClick={() => setDialog("profile")}
              aria-label="เปิดบัญชีผู้ใช้"
            >
              <UserRound size={19} />
            </button>
          </div>
        </div>
      </header>
      <nav className="xp-mobile-nav" aria-label="เมนูหลักบนมือถือ">
        {navItems}
      </nav>
      <dialog
        ref={dialogRef}
        className="dialog-sheet xp-account-dialog"
        onClose={() => setDialog(null)}
        onCancel={() => setDialog(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setDialog(null);
        }}
      >
        <div className="dialog-head">
          <h2>
            {dialog === "demo" ? "พื้นที่ทดลอง THAI Please" : "บัญชีของคุณ"}
          </h2>
          <button
            type="button"
            className="button button--icon"
            aria-label="ปิด"
            onClick={() => setDialog(null)}
          >
            <X size={20} />
          </button>
        </div>
        <div className="dialog-body">
          {dialog === "demo" ? (
            <>
              <p>ทดลองใช้จ่าย ทำภารกิจ และแลกรางวัลด้วยยอดเงินจำลอง</p>
              <p className="text-muted">
                ไม่มีการโอนเงินจริงหรือออกเอกสารภาษี
                โครงการนี้เป็นผลงานเพื่อการศึกษา
              </p>
            </>
          ) : (
            <>
              <div className="xp-account-identity"><span className="xp-account-avatar"><UserRound size={26}/></span><div><strong className="xp-profile-name">
                {user?.fullName || user?.name || "ผู้ใช้งาน"}
              </strong>
              {user?.email && <p className="text-muted">{user.email}</p>}
              {user?.maskedPhone && (
                <p className="text-muted">{user.maskedPhone}</p>
              )}
              </div></div><div className="xp-account-actions">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="button button--primary xp-admin-nav-btn"
                  onClick={() => setDialog(null)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                >
                  <ShieldCheck size={18} /> จัดการระบบภาครัฐ (Admin)
                </Link>
              )}
              {!isMerchant && <Link
                to="/profile"
                className="button button--secondary"
                onClick={() => setDialog(null)}
              >
                <UserRound size={18}/>ดูข้อมูลบัญชีของฉัน
              </Link>}
              <button
                type="button"
                className="button button--ghost xp-logout"
                onClick={() => {
                  setDialog(null);
                  logout();
                }}
              >
                <LogOut size={17} />
                ออกจากระบบ
              </button></div>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
