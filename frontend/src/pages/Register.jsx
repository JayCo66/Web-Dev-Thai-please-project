import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  UserPlus,
  User,
  Store,
  ShieldCheck,
  Lock,
  Phone,
  Mail,
  MapPin,
  KeyRound,
  AlertCircle,
  Gift,
  ArrowRight,
  FlaskConical
} from 'lucide-react';
import '../styles/auth-refinements.css';

function validCitizenId(value) {
  if (!/^\d{13}$/.test(value)) return false;
  const sum = [...value.slice(0, 12)].reduce((total, digit, index) => total + Number(digit) * (13 - index), 0);
  return (11 - sum % 11) % 10 === Number(value[12]);
}


export default function Register() {
  const navigate = useNavigate();
  const { registerCitizen, registerMerchant, demoLogin } = useAuth();

  const [registerType, setRegisterType] = useState('citizen'); // 'citizen' | 'merchant'

  // Citizen Form States
  const [citizenForm, setCitizenForm] = useState({
    citizenId: '',
    fullName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    pin: '',
    provinceCode: 'BKK',
  });

  // Merchant Form States
  const [merchantForm, setMerchantForm] = useState({
    shopName: '',
    category: 'อาหารและเครื่องดื่ม',
    contactName: '',
    phoneNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    addressLine: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [idTouched, setIdTouched] = useState(false);
  const idError = idTouched && !validCitizenId(citizenForm.citizenId)
    ? citizenForm.citizenId.length !== 13 ? 'กรอกเลขบัตรให้ครบ 13 หลัก' : 'เลขบัตรไม่ผ่านการตรวจหลักสุดท้าย กรุณาตรวจเลขอีกครั้ง หรือเลือกเปิดบัญชีทดลอง'
    : '';
  async function openDemo() {
    if (loading) return;
    setLoading(true);
    setError('');
    try {
      const result = await demoLogin();
      if (result.success) navigate('/');
      else setError(result.error);
    } catch { setError('เปิดบัญชีทดลองไม่สำเร็จ กรุณาลองอีกครั้ง'); }
    finally { setLoading(false); }
  }


  // Handle Citizen Register Submit
  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanId = citizenForm.citizenId.replace(/\D/g, '');
    if (!validCitizenId(cleanId)) {
      setIdTouched(true);
      document.getElementById('citizen-id')?.focus();
      return;
    }

    if (!citizenForm.fullName.trim() || citizenForm.fullName.trim().length < 3) {
      setError('กรุณาระบุชื่อ-นามสกุลจริงอย่างน้อย 3 ตัวอักษร');
      return;
    }

    const cleanPhone = citizenForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('เบอร์โทรศัพท์ต้องมี 10 หลัก (เช่น 0812345678)');
      return;
    }

    if (citizenForm.password && citizenForm.password !== citizenForm.confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (citizenForm.pin && citizenForm.pin.length !== 6) {
      setError('รหัส PIN ต้องเป็นตัวเลข 6 หลัก');
      return;
    }

    setLoading(true);
    const res = await registerCitizen({
      citizenId: cleanId,
      fullName: citizenForm.fullName.trim(),
      phoneNumber: cleanPhone,
      email: citizenForm.email.trim() || undefined,
      password: citizenForm.password || undefined,
      pin: citizenForm.pin || undefined,
      provinceCode: citizenForm.provinceCode,
    });
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  // Handle Merchant Register Submit
  const handleMerchantSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!merchantForm.shopName.trim()) {
      setError('กรุณาระบุชื่อร้านค้า');
      return;
    }

    const cleanPhone = merchantForm.phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setError('เบอร์โทรศัพท์ร้านค้าต้องมี 10 หลัก');
      return;
    }

    if (merchantForm.password && merchantForm.password !== merchantForm.confirmPassword) {
      setError('รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    setLoading(true);
    const res = await registerMerchant({
      shopName: merchantForm.shopName.trim(),
      category: merchantForm.category,
      contactName: merchantForm.contactName.trim() || undefined,
      phoneNumber: cleanPhone,
      email: merchantForm.email.trim() || undefined,
      password: merchantForm.password || undefined,
      addressLine: merchantForm.addressLine.trim() || undefined,
    });
    setLoading(false);

    if (res.success) {
      navigate('/');
    } else {
      setError(res.error);
    }
  };

  return (
    <div className="auth-wrapper xp-register-page" style={{ minHeight: '100dvh' }}>
      <div className="auth-card" style={{ maxWidth: 560 }}>
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-badge">
            <UserPlus size={14} />
            <span>ลงทะเบียนเข้าร่วมโครงการ</span>
          </div>
          <h1 className="brand-title">
            ไทยช่วยไทย<span>พลีส</span>
          </h1>
          <p className="brand-subtitle">
            เลือกประเภทบัญชีเพื่อลงทะเบียนรับสิทธิและเริ่มต้นใช้งานระบบ
          </p>
        </div>

        {/* Type Switcher (Touch-friendly min 48px) */}
        <div className="tab-switcher" role="tablist">
          <button
            type="button"
            className={`tab-btn ${registerType === 'citizen' ? 'active' : ''}`}
            onClick={() => { setRegisterType('citizen'); setError(''); }}
            style={{ minHeight: 48, fontSize: 13.5 }}
          >
            <User size={16} />
            <span>ประชาชนทั่วไป</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${registerType === 'merchant' ? 'active' : ''}`}
            onClick={() => { setRegisterType('merchant'); setError(''); }}
            style={{ minHeight: 48, fontSize: 13.5 }}
          >
            <Store size={16} />
            <span>ร้านค้า / ผู้ประกอบการ</span>
          </button>
        </div>

        <div className="xp-register-demo">
          <div><strong>อยากลองใช้งานก่อน?</strong><span>เปิดบัญชีทดลองได้โดยไม่ต้องกรอกเลขบัตร</span></div>
          <button type="button" className="button button--secondary" onClick={openDemo} disabled={loading}><FlaskConical size={18}/>เปิดบัญชีทดลอง</button>
        </div>
        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger" role="alert" style={{ marginBottom: 16 }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form 1: Citizen Registration */}
        {registerType === 'citizen' && (
          <form onSubmit={handleCitizenSubmit}>
            <div className="alert alert-info" style={{ marginBottom: 18 }}>
              <Gift size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                <strong>สิทธิประโยชน์ต้อนรับ:</strong> รับ <strong>50 โทเค็น</strong> เมื่อลงทะเบียนสำเร็จ ใช้สะสมเพื่อแลกรางวัล
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label htmlFor="citizen-id" className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                เลขประจำตัวประชาชน (13 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <ShieldCheck size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เลขบัตร ปชช. 13 หลัก"
                  id="citizen-id"
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(idError)}
                  aria-describedby={idError ? 'citizen-id-error citizen-id-hint' : 'citizen-id-hint'}
                  onBlur={() => setIdTouched(true)}
                  maxLength={17}
                  value={citizenForm.citizenId}
                  onChange={(e) => setCitizenForm({ ...citizenForm, citizenId: e.target.value.replace(/\D/g, '').slice(0, 13) })}
                  required
                  disabled={loading}
                />
              </div>
              {idError && <p id="citizen-id-error" className="xp-field-error" role="alert">{idError}</p>}
              <div id="citizen-id-hint" className="form-hint" style={{ fontSize: 12, marginTop: 4, color: 'var(--text-tertiary)' }}>
                ตรวจเลขหลักสุดท้ายก่อนสมัคร และจัดเก็บเลขบัตรเป็นค่าแฮช SHA-256
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                ชื่อ-นามสกุล จริง <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น นายสมชาย ใจดี"
                  value={citizenForm.fullName}
                  onChange={(e) => setCitizenForm({ ...citizenForm, fullName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                เบอร์โทรศัพท์มือถือ (10 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น 0812345678"
                  maxLength={10}
                  value={citizenForm.phoneNumber}
                  onChange={(e) => setCitizenForm({ ...citizenForm, phoneNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                อีเมล (ไม่บังคับ)
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="example@mail.com"
                  value={citizenForm.email}
                  onChange={(e) => setCitizenForm({ ...citizenForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  รหัสผ่าน (Password)
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    style={{ minHeight: 48, fontSize: 16 }}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={citizenForm.password}
                    onChange={(e) => setCitizenForm({ ...citizenForm, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  ยืนยันรหัสผ่าน
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    style={{ minHeight: 48, fontSize: 16 }}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    value={citizenForm.confirmPassword}
                    onChange={(e) => setCitizenForm({ ...citizenForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  รหัส PIN ยืนยันทำรายการ (6 หลัก)
                </label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type="password"
                    maxLength={6}
                    className="form-input"
                    style={{ minHeight: 48, fontSize: 16 }}
                    placeholder="ตัวเลข 6 หลัก (เช่น 123456)"
                    value={citizenForm.pin}
                    onChange={(e) => setCitizenForm({ ...citizenForm, pin: e.target.value.replace(/\D/g, '') })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  จังหวัดที่อยู่
                </label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <select
                    className="form-select"
                    style={{ minHeight: 48, fontSize: 15 }}
                    value={citizenForm.provinceCode}
                    onChange={(e) => setCitizenForm({ ...citizenForm, provinceCode: e.target.value })}
                    disabled={loading}
                  >
                    <option value="BKK">กรุงเทพมหานคร</option>
                    <option value="NPT">นครปฐม</option>
                    <option value="NBI">นนทบุรี</option>
                    <option value="PTE">ปทุมธานี</option>
                    <option value="SPK">สมุทรปราการ</option>
                    <option value="OTHER">จังหวัดอื่นๆ</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ minHeight: 56, fontSize: 16, fontWeight: 700, width: '100%', marginTop: 8 }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังลงทะเบียน...</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>ยืนยันการลงทะเบียนประชาชน</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: Merchant Registration */}
        {registerType === 'merchant' && (
          <form onSubmit={handleMerchantSubmit}>
            <div className="alert alert-info" style={{ marginBottom: 18 }}>
              <Store size={20} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: 13, lineHeight: 1.45 }}>
                <strong>สำหรับผู้ประกอบการร้านค้า:</strong> ลงทะเบียนเพื่อรับชำระเงินในโครงการคนละครึ่ง 60/40 และรับเงินสนับสนุนโอนเข้าบัญชีร้านค้าทันที
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                ชื่อร้านค้า / สถานประกอบการ <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Store size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น ร้านข้าวมันไก่เฮียเจ๊ก นครปฐม"
                  value={merchantForm.shopName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, shopName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                หมวดหมู่ประเภทร้านค้า <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <select
                  className="form-select"
                  style={{ minHeight: 48, fontSize: 15 }}
                  value={merchantForm.category}
                  onChange={(e) => setMerchantForm({ ...merchantForm, category: e.target.value })}
                  disabled={loading}
                >
                  <option value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</option>
                  <option value="สินค้า OTOP และชุมชน">สินค้า OTOP และชุมชน</option>
                  <option value="ร้านค้าทั่วไป">ร้านค้าทั่วไป / ของใช้</option>
                  <option value="บริการและสุขภาพ">บริการและสุขภาพ</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                ชื่อผู้ติดต่อ / เจ้าของร้าน
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น นายมานะ ค้าขายดี"
                  value={merchantForm.contactName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, contactName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                เบอร์โทรศัพท์ร้านค้า (10 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น 0891234567"
                  maxLength={10}
                  value={merchantForm.phoneNumber}
                  onChange={(e) => setMerchantForm({ ...merchantForm, phoneNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                อีเมลร้านค้า (ไม่บังคับ)
              </label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="shop@mail.com"
                  value={merchantForm.email}
                  onChange={(e) => setMerchantForm({ ...merchantForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  รหัสผ่านร้านค้า (Password)
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    style={{ minHeight: 48, fontSize: 16 }}
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={merchantForm.password}
                    onChange={(e) => setMerchantForm({ ...merchantForm, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                  ยืนยันรหัสผ่าน
                </label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    style={{ minHeight: 48, fontSize: 16 }}
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    value={merchantForm.confirmPassword}
                    onChange={(e) => setMerchantForm({ ...merchantForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
                ที่อยู่ร้านค้า / ทำเลที่ตั้ง
              </label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  style={{ minHeight: 48, fontSize: 16 }}
                  placeholder="เช่น 123/4 ถ.เทศา ต.พระปฐมเจดีย์ อ.เมือง จ.นครปฐม"
                  value={merchantForm.addressLine}
                  onChange={(e) => setMerchantForm({ ...merchantForm, addressLine: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ minHeight: 56, fontSize: 16, fontWeight: 700, width: '100%', marginTop: 8 }}
            >
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังลงทะเบียนร้านค้า...</span>
                </>
              ) : (
                <>
                  <Store size={18} />
                  <span>ยืนยันการลงทะเบียนร้านค้า</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        <div className="auth-footer" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-light)' }}>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
          <Link
            to="/login"
            className="auth-link"
            style={{ minHeight: 44, display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 700 }}
          >
            <span>เข้าสู่ระบบที่นี่</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
