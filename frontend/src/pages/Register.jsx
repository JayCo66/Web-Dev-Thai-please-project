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

        {/* Type Switcher */}
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
            <div className="alert alert-info" style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
              <Gift size={20} style={{ flexShrink: 0, color: '#059669' }} />
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
                  placeholder="your.email@example.com"
                  value={citizenForm.email}
                  onChange={(e) => setCitizenForm({ ...citizenForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">รหัสผ่านเข้าสู่ระบบ</label>
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
                    placeholder="พิมพ์รหัสผ่านซ้ำ"
                    value={citizenForm.confirmPassword}
                    onChange={(e) => setCitizenForm({ ...citizenForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">PIN 6 หลัก (ทำธุรกรรม)</label>
                <div className="input-with-icon">
                  <KeyRound size={18} className="input-icon" />
                  <input
                    type="password"
                    maxLength={6}
                    className="form-input"
                    placeholder="เช่น 123456"
                    value={citizenForm.pin}
                    onChange={(e) => setCitizenForm({ ...citizenForm, pin: e.target.value.replace(/\D/g, '') })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">จังหวัดที่พำนัก</label>
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
                    <option value="NON">นนทบุรี</option>
                    <option value="PTN">ปทุมธานี</option>
                    <option value="SPK">สมุทรปราการ</option>
                    <option value="CNX">เชียงใหม่</option>
                    <option value="KKN">ขอนแก่น</option>
                    <option value="HKT">ภูเก็ต</option>
                    <option value="OTH">จังหวัดอื่นๆ</option>
                  </select>
                </div>
              </div>
            </div>

            <button type="submit" className="btn-primary" disabled={loading} style={{ marginTop: 8 }}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                  กำลังลงทะเบียน...
                </>
              ) : (
                <>
                  <UserPlus size={18} /> ยืนยันลงทะเบียนประชาชน
                </>
              )}
            </button>
          </form>
        )}

        {/* Form 2: Merchant Registration */}
        {registerType === 'merchant' && (
          <form onSubmit={handleMerchantSubmit}>
            <div className="form-group">
              <label className="form-label">
                ชื่อร้านค้า <span className="req">*</span>
              </label>
              <div className="input-with-icon">
                <Store size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น ร้านข้าวแกงปักษ์ใต้ คุณแม่"
                  value={merchantForm.shopName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, shopName: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                หมวดหมู่ร้านค้า <span className="req">*</span>
              </label>
              <select
                className="form-select"
                style={{ paddingLeft: 14 }}
                value={merchantForm.category}
                onChange={(e) => setMerchantForm({ ...merchantForm, category: e.target.value })}
                disabled={loading}
              >
                <option value="อาหารและเครื่องดื่ม">อาหารและเครื่องดื่ม</option>
                <option value="สินค้าทั่วไปและของใช้">สินค้าทั่วไปและของใช้</option>
                <option value="สินค้า OTOP และวิสาหกิจชุมชน">สินค้า OTOP และวิสาหกิจชุมชน</option>
                <option value="บริการชุมชนและสุขภาพ">บริการชุมชนและสุขภาพ</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">ชื่อเจ้าของร้าน / ผู้ติดต่อ</label>
              <div className="input-with-icon">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เช่น นางวิภาวรรณ ชัยเจริญ"
                  value={merchantForm.contactName}
                  onChange={(e) => setMerchantForm({ ...merchantForm, contactName: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                เบอร์โทรศัพท์ติดต่อร้านค้า <span className="req">*</span>
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
              <label className="form-label">อีเมลร้านค้า (ถ้ามี)</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  className="form-input"
                  placeholder="shop@example.com"
                  value={merchantForm.email}
                  onChange={(e) => setMerchantForm({ ...merchantForm, email: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">รหัสผ่าน</label>
                <div className="input-with-icon">
                  <Lock size={18} className="input-icon" />
                  <input
                    type="password"
                    className="form-input"
                    placeholder="รหัสผ่านเข้าสู่ระบบ"
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
                    placeholder="พิมพ์รหัสผ่านซ้ำ"
                    value={merchantForm.confirmPassword}
                    onChange={(e) => setMerchantForm({ ...merchantForm, confirmPassword: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">ที่อยู่ร้านค้า / ตลาด</label>
              <div className="input-with-icon">
                <MapPin size={18} className="input-icon" />
                <input
                  type="text"
                  className="form-input"
                  placeholder="เลขที่ ถนน ซอย ตำบล อำเภอ จังหวัด"
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
                  กำลังลงทะเบียนร้านค้า...
                </>
              ) : (
                <>
                  <Store size={18} /> ยืนยันลงทะเบียนร้านค้า
                </>
              )}
            </button>
          </form>
        )}

        {/* Login Link */}
        <div className="auth-footer">
          มีบัญชีอยู่แล้วใช่หรือไม่?
          <Link to="/login" className="auth-link">
            เข้าสู่ระบบที่นี่ <ArrowRight size={14} style={{ verticalAlign: 'middle', marginLeft: 2 }} />
          </Link>
        </div>
      </div>
    </div>
  );
}
