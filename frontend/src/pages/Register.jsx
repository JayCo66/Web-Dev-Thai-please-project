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
  ArrowRight
} from 'lucide-react';

export default function Register() {
  const navigate = useNavigate();
  const { registerCitizen, registerMerchant } = useAuth();

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

  // Handle Citizen Register Submit
  const handleCitizenSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanId = citizenForm.citizenId.replace(/\D/g, '');
    if (cleanId.length !== 13) {
      setError('เลขประจำตัวประชาชนต้องมีครบ 13 หลัก');
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
    <div className="auth-wrapper">
      <div className="auth-card" style={{ maxWidth: 560 }}>
        {/* Brand Header */}
        <div className="brand-header">
          <div className="brand-badge">
            <UserPlus size={14} /> ลงทะเบียนเข้าร่วมโครงการ
          </div>
          <h1 className="brand-title">
            ไทยช่วยไทย<span>พลีส</span>
          </h1>
          <p className="brand-subtitle">
            เลือกประเภทบัญชีเพื่อลงทะเบียนรับสิทธิและเริ่มต้นใช้งานระบบ
          </p>
        </div>

        {/* Type Switcher (Touch-friendly min 44px) */}
        <div className="tab-switcher">
          <button
            type="button"
            className={`tab-btn ${registerType === 'citizen' ? 'active' : ''}`}
            onClick={() => { setRegisterType('citizen'); setError(''); }}
          >
            <User size={16} /> ประชาชนทั่วไป
          </button>
          <button
            type="button"
            className={`tab-btn ${registerType === 'merchant' ? 'active' : ''}`}
            onClick={() => { setRegisterType('merchant'); setError(''); }}
          >
            <Store size={16} /> ร้านค้า / ผู้ประกอบการ
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>{error}</div>
          </div>
        )}

        {/* Form 1: Citizen Registration */}
        {registerType === 'citizen' && (
          <form onSubmit={handleCitizenSubmit}>
            <div className="alert alert-info">
              <Gift size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>สิทธิประโยชน์ต้อนรับ:</strong> รับฟรี <strong>50 Impact Tokens</strong> ทันทีเมื่อลงทะเบียนสำเร็จเพื่อนำไปร่วมบริจาคให้มูลนิธิหรือร่วมสนุกในกระดานบิงโก
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
                  placeholder="เลขบัตร ปชช. 13 หลัก"
                  maxLength={13}
                  value={citizenForm.citizenId}
                  onChange={(e) => setCitizenForm({ ...citizenForm, citizenId: e.target.value.replace(/\D/g, '') })}
                  required
                  disabled={loading}
                />
              </div>
              <div className="form-hint">
                เข้ารหัส SHA-256 ตามมาตรฐาน PDPA ไม่จัดเก็บเลขบัตรประชาชนจริงแบบเปิดเผย
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                ชื่อ-นามสกุล จริง <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น นายรักชาติ ยิ่งชีพ"
                  value={citizenForm.fullName}
                  onChange={(e) => setCitizenForm({ ...citizenForm, fullName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                เบอร์โทรศัพท์มือถือ (10 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="เช่น 0812345678"
                  maxLength={10}
                  value={citizenForm.phoneNumber}
                  onChange={(e) => setCitizenForm({ ...citizenForm, phoneNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">อีเมล (ไม่บังคับ)</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="example@mail.com"
                  value={citizenForm.email}
                  onChange={(e) => setCitizenForm({ ...citizenForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">รหัสผ่าน (Password)</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={citizenForm.password}
                    onChange={(e) => setCitizenForm({ ...citizenForm, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ยืนยันรหัสผ่าน</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    value={citizenForm.confirmPassword}
                    onChange={(e) => setCitizenForm({ ...citizenForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">รหัส PIN ยืนยันการทำรายการ (6 หลัก)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type="password"
                    maxLength={6}
                    className="form-input"
                    placeholder="ตัวเลข 6 หลัก (เช่น 123456)"
                    value={citizenForm.pin}
                    onChange={(e) => setCitizenForm({ ...citizenForm, pin: e.target.value.replace(/\D/g, '') })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">จังหวัดที่อยู่ตามทะเบียนบ้าน</label>
                <div className="input-with-icon">
                  <MapPin size={18} className="input-icon" />
                  <select
                    className="form-select"
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

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังลงทะเบียน...</span>
                </>
              ) : (
                <>
                  <UserPlus size={18} /> <span>ยืนยันการลงทะเบียนประชาชน</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: Merchant Registration */}
        {registerType === 'merchant' && (
          <form onSubmit={handleMerchantSubmit}>
            <div className="alert alert-info">
              <Store size={20} style={{ flexShrink: 0 }} />
              <div>
                <strong>สำหรับผู้ประกอบการร้านค้า:</strong> ลงทะเบียนเพื่อรับชำระเงินในโครงการคนละครึ่ง 60/40 และรับเงินสนับสนุนโอนเข้าบัญชีร้านค้าทันที
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                ชื่อร้านค้า / สถานประกอบการ <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Store size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น ร้านข้าวมันไก่เฮียเจ๊ก นครปฐม"
                  value={merchantForm.shopName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, shopName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                หมวดหมู่ประเภทร้านค้า <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <select
                  className="form-select"
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

            <div className="form-group">
              <label className="form-label">ชื่อผู้ติดต่อ / เจ้าของร้าน</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น นายมานะ ค้าขายดี"
                  value={merchantForm.contactName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, contactName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                เบอร์โทรศัพท์ร้านค้า (10 หลัก) <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Phone size={18} className="input-icon" />
                <input
                  type="tel"
                  className="form-input"
                  placeholder="เช่น 0891234567"
                  maxLength={10}
                  value={merchantForm.phoneNumber}
                  onChange={(e) => setMerchantForm({ ...merchantForm, phoneNumber: e.target.value.replace(/\D/g, '') })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">อีเมลร้านค้า (ไม่บังคับ)</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="shop@mail.com"
                  value={merchantForm.email}
                  onChange={(e) => setMerchantForm({ ...merchantForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">รหัสผ่านร้านค้า (Password)</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={merchantForm.password}
                    onChange={(e) => setMerchantForm({ ...merchantForm, password: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ยืนยันรหัสผ่าน</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="กรอกรหัสผ่านซ้ำอีกครั้ง"
                    value={merchantForm.confirmPassword}
                    onChange={(e) => setMerchantForm({ ...merchantForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ที่อยู่ร้านค้า / ทำเลที่ตั้ง</label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น 123/4 ถ.เทศา ต.พระปฐมเจดีย์ อ.เมือง จ.นครปฐม"
                  value={merchantForm.addressLine}
                  onChange={(e) => setMerchantForm({ ...merchantForm, addressLine: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  <span>กำลังลงทะเบียนร้านค้า...</span>
                </>
              ) : (
                <>
                  <Store size={18} /> <span>ยืนยันการลงทะเบียนร้านค้า</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        <div className="auth-footer">
          มีบัญชีผู้ใช้งานอยู่แล้ว?
          <Link to="/login" className="auth-link">
            <span>เข้าสู่ระบบที่นี่</span>
            <ArrowRight size={14} style={{ marginLeft: 2 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
