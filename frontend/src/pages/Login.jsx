import ProjectBrand from "../components/ProjectBrand";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  Eye,
  EyeOff,
  FlaskConical,
  LoaderCircle,
  UserPlus,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "../styles/experience.css";
import "../styles/auth-refinements.css";
export default function Login() {
  const { login, demoLogin } = useAuth(),
    navigate = useNavigate();
  const [identifier, setIdentifier] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function enter(event, demo = false) {
    event?.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const result = demo
      ? await demoLogin()
      : await login(identifier.trim(), password);
    setBusy(false);
    if (result.success) navigate("/");
    else setError(result.error);
  }
  return (
    <div className="app-shell xp-login">
      <main className="xp-login-layout">
        <section className="xp-login-story">
          <Link className="xp-brand" to="/login">
            <ProjectBrand/>
          </Link>
          <div>
            <span className="page-eyebrow">ใช้จ่ายอย่างมีความหมาย</span>
            <h1>
              เรื่องดี ๆ<br />
              เริ่มได้ทุกวัน
            </h1>
            <p>
              ทำภารกิจเล็ก ๆ สนับสนุนชุมชน
              <br />
              แล้วเปลี่ยนแต้มสะสมเป็นรางวัล
            </p>
            <div className="xp-login-art" aria-hidden="true">
              {Array.from({ length: 9 }, (_, i) => (
                <span key={i} className={i === 4 ? "is-heart" : ""}>
                  {i === 4 ? "♡" : i === 0 || i === 8 ? "✓" : "·"}
                </span>
              ))}
            </div>
          </div>
          <small>โครงงานเพื่อการศึกษา · ใช้เงินและรางวัลทดลอง</small>
        </section>
        <section className="xp-login-form">
          <span className="page-eyebrow">ยินดีต้อนรับ</span>
          <h2>เข้าสู่บัญชีของคุณ</h2>
          <p className="text-muted">กลับมาทำภารกิจต่อจากที่ค้างไว้</p>
          {error && (
            <p className="notice notice--error" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={enter}>
            <label className="form-field">
              <span className="field-label">อีเมลหรือเบอร์โทรศัพท์</span>
              <input
                type="text"
                autoComplete="username"
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="form-field">
              <span className="field-label">รหัสผ่าน</span>
              <span className="xp-password-field">
                <input
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                <button
                  type="button"
                  onClick={() => setShow((v) => !v)}
                  aria-label={show ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                >
                  {show ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </span>
            </label>
            <button className="button button--primary xp-full" disabled={busy}>
              {busy ? (
                <LoaderCircle size={18} className="xp-spin" />
              ) : (
                "เข้าสู่ระบบ"
              )}
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="xp-login-divider">
            <span>หรือเริ่มลองใช้</span>
          </div>
          <button
            className="button button--secondary xp-full"
            onClick={(e) => enter(e, true)}
            disabled={busy}
          >
            <FlaskConical size={17} />
            เปิดบัญชีทดลอง
          </button>
          <p className="xp-quiet-note">
            เริ่มด้วยเงินทดลอง 500 บาท และ 50 แต้ม ไม่ต้องใช้ข้อมูลส่วนตัว
          </p>
          <p className="xp-login-register">
            <Link to="/register" className="button button--secondary xp-register-cta"><UserPlus size={20}/>สมัครบัญชีใหม่<ArrowRight size={18}/></Link>
          </p>
        </section>
      </main>
    </div>
  );
}
