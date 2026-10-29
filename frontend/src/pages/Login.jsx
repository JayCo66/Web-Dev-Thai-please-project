import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LogIn,
  Lock,
  User,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertCircle,
  QrCode,
  ArrowRight
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginThaiD } = useAuth();

  const [activeTab, setActiveTab] = useState('credentials');

  // Credentials Form
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ThaiD Form
  const [citizenId, setCitizenId] = useState('');
  const [fullName, setFullName] = useState('');

  // Status & Error
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Standard Login
  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!identifier.trim()) {
      setError('กรุณากรอกเลขบัตรประชาชน, เบอร์โทรศัพท์ หรืออีเมล');
      return;
    }
    if (!password) {
      setError('กรุณากรอกรหัสผ่าน');
      return;
    }

    setLoading(true);
    const res = await login(identifier.trim(), password);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  // Handle ThaiD Login
  const handleThaiDSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanCitizenId = citizenId.replace(/\D/g, '');
    if (cleanCitizenId.length !== 13) {
      setError('กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก');
      return;
    }

    setLoading(true);
    const res = await loginThaiD(cleanCitizenId, fullName.trim() || undefined);
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  // Fill Demo Account (No Emojis)
  const fillDemo = (id, pass) => {
    setActiveTab('credentials');
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="auth-wrapper" style={{ minHeight: '100dvh' }}>
      <div className="auth-card">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-badge">
            <ShieldCheck size={14} />
            <span>โครงการกระตุ้นเศรษฐกิจดิจิทัลภาครัฐ</span>
          </div>
          <h1 className="brand-title">
            ไทยช่วยไทย<span>พลีส</span>
          </h1>
          <p className="brand-subtitle">
            เข้าสู่ระบบเพื่อใช้งานกระเป๋าเงินดิจิทัลและสิทธิประโยชน์คนละครึ่ง
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher" role="tablist">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => { setActiveTab('credentials'); setError(''); }}
            style={{ minHeight: 48, fontSize: 13.5 }}
          >
            <User size={16} />
            <span>เข้าสู่ระบบทั่วไป</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'thaid' ? 'active' : ''}`}
            onClick={() => { setActiveTab('thaid'); setError(''); }}
            style={{ minHeight: 48, fontSize: 13.5 }}
          >
            <QrCode size={16} />
            <span>เข้าสู่ระบบผ่าน ThaiD</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form 1: Standard Credentials */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                บัญชีผู้ใช้ <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เบอร์โทรศัพท์ 10 หลัก / เลขบัตร ปชช. / อีเมล"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              <div className="form-hint" style={{ fontSize: 12, marginTop: 4, color: 'var(--text-secondary)' }}>
                สามารถใช้เบอร์โทรศัพท์ (เช่น 0812345678) หรืออีเมลที่ลงทะเบียนไว้
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                รหัสผ่าน <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16, paddingRight: 48 }}
                  placeholder="กรอกรหัสผ่านของคุณ"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  className="input-action-icon"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="แสดงหรือซ่อนรหัสผ่าน"
                  style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ minHeight: 50, fontSize: 15.5, fontWeight: 800, width: '100%' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังเข้าสู่ระบบ...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>เข้าสู่ระบบ</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: ThaiD Mock Login */}
        {activeTab === 'thaid' && (
          <form onSubmit={handleThaiDSubmit}>
            <div className="alert alert-info" style={{ marginBottom: 16 }}>
              <ShieldCheck size={18} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                <strong>ระบบเชื่อมโยง Digital ID (ThaiD):</strong>
                <br />
                เข้าสู่ระบบสะดวกรวดเร็วโดยไม่ต้องใช้รหัสผ่าน หากยังไม่เคยมีบัญชี ระบบจะสร้างบัญชีให้อัตโนมัติ
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                เลขประจำตัวประชาชน (13 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <ShieldCheck size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น 1100501234561"
                  maxLength={13}
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                ชื่อ-นามสกุล (สำหรับบัญชีใหม่ ไม่บังคับ)
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ minHeight: 50, fontSize: 15.5, fontWeight: 800, width: '100%' }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังเชื่อมต่อ ThaiD...</span>
                </>
              ) : (
                <>
                  <QrCode size={18} />
                  <span>ยืนยันตัวตนผ่าน ThaiD</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Fill Box (Clean Touch Targets) */}
        <div className="demo-box" style={{ marginTop: 22 }}>
          <div className="demo-title" style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            <ShieldCheck size={15} color="var(--bank-royal)" />
            <span>บัญชีทดสอบด่วน:</span>
          </div>
          <div className="demo-chips" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0812345678', 'password123')}
              style={{ minHeight: 44, fontSize: 12.5, fontWeight: 700, padding: '8px 4px', textAlign: 'center' }}
            >
              ประชาชน
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0898765432', 'password123')}
              style={{ minHeight: 44, fontSize: 12.5, fontWeight: 700, padding: '8px 4px', textAlign: 'center' }}
            >
              ร้านค้า
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0855550001', 'password123')}
              style={{ minHeight: 44, fontSize: 12.5, fontWeight: 700, padding: '8px 4px', textAlign: 'center' }}
            >
              ผู้ดูแลระบบ
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="auth-footer" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>ยังไม่ได้ลงทะเบียนเข้าร่วมโครงการ?</span>
          <Link
            to="/register"
            className="auth-link"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
          >
            <span>ลงทะเบียนที่นี่</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
