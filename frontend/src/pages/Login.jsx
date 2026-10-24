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
  Sparkles,
  QrCode,
  ArrowRight
} from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, loginThaiD } = useAuth();

  const [activeTab, setActiveTab] = useState('credentials'); // 'credentials' | 'thaid'
  
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

  // Fill Demo Account
  const fillDemo = (id, pass) => {
    setActiveTab('credentials');
    setIdentifier(id);
    setPassword(pass);
    setError('');
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-badge">
            <ShieldCheck size={14} /> โครงการกระตุ้นเศรษฐกิจดิจิทัล
          </div>
          <h1 className="brand-title">
            ไทยช่วยไทย<span>พลีส</span>
          </h1>
          <p className="brand-subtitle">
            เข้าสู่ระบบเพื่อใช้งานสิทธิประโยชน์ ภารกิจบิงโก และกระเป๋าเงินดิจิทัล
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'credentials' ? 'active' : ''}`}
            onClick={() => { setActiveTab('credentials'); setError(''); }}
          >
            <User size={16} /> เข้าสู่ระบบทั่วไป
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'thaid' ? 'active' : ''}`}
            onClick={() => { setActiveTab('thaid'); setError(''); }}
          >
            <QrCode size={16} /> เข้าสู่ระบบผ่าน ThaiD
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form 1: Standard Credentials */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit}>
            <div className="form-group">
              <label className="form-label">
                บัญชีผู้ใช้ <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เบอร์โทร 10 หลัก / เลขบัตร ปชช. / อีเมล"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
              <div className="form-hint">
                สามารถใช้เบอร์โทรศัพท์ (เช่น 0812345678) หรืออีเมลในการเข้าสู่ระบบ
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                รหัสผ่าน <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
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
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn size={18} /> เข้าสู่ระบบ
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: ThaiD Mock Login */}
        {activeTab === 'thaid' && (
          <form onSubmit={handleThaiDSubmit}>
            <div className="alert alert-info">
              <Sparkles size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>ระบบเชื่อมโยง Digital ID (ThaiD):</strong>
                <br />
                เข้าสู่ระบบสะดวกรวดเร็วโดยไม่ต้องใช้รหัสผ่าน หากยังไม่เคยมีบัญชี ระบบจะสร้างบัญชีและมอบกระดานบิงโกให้ทันที
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                เลขประจำตัวประชาชน (13 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <ShieldCheck size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น 1100501234561"
                  maxLength={13}
                  value={citizenId}
                  onChange={(e) => setCitizenId(e.target.value.replace(/\D/g, ''))}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                ชื่อ-นามสกุล (สำหรับบัญชีใหม่ ไม่บังคับ)
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  กำลังเชื่อมต่อ ThaiD...
                </>
              ) : (
                <>
                  <QrCode size={18} /> ยืนยันตัวตนผ่าน ThaiD
                </>
              )}
            </button>
          </form>
        )}

        {/* Quick Demo Fill Box */}
        <div className="demo-box">
          <div className="demo-title">
            <Sparkles size={14} color="#D97706" /> ข้อมูลทดสอบด่วน (คลิกเพื่อกรอกอัตโนมัติ):
          </div>
          <div className="demo-chips">
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0812345678', 'password123')}
            >
              👤 สมชาย (ประชาชน)
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0898765432', 'password123')}
            >
              🏪 ป้าพร (ร้านค้า)
            </button>
            <button
              type="button"
              className="demo-chip"
              onClick={() => fillDemo('0855550001', 'password123')}
            >
              ⚙️ แอดมินระบบ
            </button>
          </div>
        </div>

        {/* Register Link */}
        <div className="auth-footer">
          ยังไม่ได้ลงทะเบียนเข้าร่วมโครงการ?
          <Link to="/register" className="auth-link">
            ลงทะเบียนที่นี่ <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
