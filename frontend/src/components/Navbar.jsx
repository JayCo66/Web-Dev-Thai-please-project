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
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/experience.css";
import "../styles/project-refinements.css";

const destinations = [
  { to: "/", label: "หน้าหลัก", icon: Home, end: true },
  { to: "/bingo", label: "บิงโก", icon: Grid2X2 },
  { to: "/charities", label: "มูลนิธิ", icon: HeartHandshake },
  { to: "/rewards", label: "รางวัล", icon: Gift },
];

export default function Navbar() {
  const { user, tokens, logout } = useAuth();
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);

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
          <Link to="/" className="xp-brand" aria-label="THAI Please หน้าหลัก">
            <span className="xp-brand-mark" aria-hidden="true">
              tp
              <span />
            </span>
            <span>
              THAI <strong>Please</strong>
            </span>
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
            <Link
              to="/rewards"
              className="xp-token-pill"
              aria-label={`${Number(tokens || 0).toLocaleString("th-TH")} โทเค็น ดูรางวัล`}
            >
              <Coins size={17} />
              <span>{Number(tokens || 0).toLocaleString("th-TH")}</span>
            </Link>
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
        className="dialog-sheet"
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
              <strong className="xp-profile-name">
                {user?.fullName || user?.name || "ผู้ใช้งาน"}
              </strong>
              {user?.email && <p className="text-muted">{user.email}</p>}
              {user?.maskedPhone && (
                <p className="text-muted">{user.maskedPhone}</p>
              )}
              <Link
                to="/profile"
                className="button button--secondary"
                onClick={() => setDialog(null)}
              >
                ดูข้อมูลบัญชีของฉัน
              </Link>
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
              </button>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
