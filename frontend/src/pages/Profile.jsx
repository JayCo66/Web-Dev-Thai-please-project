import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  User,
  ShieldCheck,
  CheckCircle2,
  Wallet,
  Coins,
  QrCode,
  ArrowLeft,
  PlusCircle,
  LogOut,
  CreditCard,
  Check,
  Copy,
  ChevronRight
} from 'lucide-react';

export default function Profile() {
  const { user, wallet, tokens, shop, resetBalance, logout } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [topupFeedback, setTopupFeedback] = useState(false);

  const userBalance = parseFloat(wallet?.balance || '500.00');

  const getRoleName = (role) => {
    switch (role) {
      case 'MERCHANT': return 'ร้านค้าผู้ประกอบการ';
      case 'ADMIN': return 'ผู้ดูแลระบบ';
      case 'GOV_EXECUTIVE': return 'ผู้บริหารภาครัฐ';
      default: return 'ประชาชนผู้มีสิทธิ';
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'MERCHANT': return 'role-merchant';
      case 'ADMIN': return 'role-admin';
      default: return 'role-citizen';
    }
  };

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleTopup = () => {
    resetBalance(500);
    setTopupFeedback(true);
    setTimeout(() => setTopupFeedback(false), 2500);
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Financial App Header & Mobile Nav */}
      <Navbar />

      <main className="home-container" id="main-content">
        {/* Navigation & Breadcrumb Header */}
        <div className="profile-page-header">
          <Link to="/" className="btn-profile-back" aria-label="กลับสู่หน้าหลัก">
            <ArrowLeft size={18} />
            <span>กลับหน้าหลัก</span>
          </Link>
          <div className="profile-header-meta">
            <span className="profile-header-badge">
              <ShieldCheck size={14} color="#059669" />
              <span>ข้อมูลยืนยันตัวตนระดับชาติ (ThaiD)</span>
            </span>
          </div>
        </div>

        {/* Hero Identity Banner */}
        <section className="profile-hero-card" aria-label="ข้อมูลตัวตนผู้ใช้งาน">
          <div className="profile-hero-avatar-wrap">
            <div className="profile-hero-avatar">
              {user?.fullName ? user.fullName.charAt(0) : <User size={30} />}
            </div>
            <div className="profile-hero-avatar-badge" title="ยืนยันตัวตนสำเร็จ">
              <CheckCircle2 size={16} color="#FFFFFF" />
            </div>
          </div>

          <div className="profile-hero-details">
            <div className="profile-hero-name-row">
              <h1 className="profile-hero-name">
                {user?.fullName || 'ประชาชนผู้มีสิทธิ'}
              </h1>
              <span className={`role-badge ${getRoleClass(user?.role)}`}>
                {getRoleName(user?.role)}
              </span>
            </div>

            <div className="profile-hero-tags">
              <div className="profile-tag-pill success">
                <CheckCircle2 size={13} />
                <span>ยืนยันสิทธิคนละครึ่งแล้ว</span>
              </div>
              <div className="profile-tag-pill info">
                <ShieldCheck size={13} />
                <span>ความปลอดภัยมาตรฐาน ETDA & DOPA</span>
              </div>
            </div>
          </div>
        </section>

        {/* Topup Feedback Banner */}
        {topupFeedback && (
          <div className="profile-feedback-alert" role="status">
            <CheckCircle2 size={18} color="#059669" />
            <span>เติมเงินจำลองเข้ากระเป๋า ฿500.00 สำเร็จ</span>
          </div>
        )}

        {/* ========================================================
            1. CITIZEN REGISTRATION INFORMATION (ข้อมูลผู้ลงทะเบียน)
            ======================================================== */}
        <section className="profile-card-section" aria-labelledby="heading-citizen-info">
          <div className="profile-section-header">
            <div className="profile-section-icon" style={{ background: '#EFF6FF', color: 'var(--bank-royal)' }}>
              <User size={20} />
            </div>
            <div>
              <h2 id="heading-citizen-info" className="profile-section-title">
                ข้อมูลผู้ลงทะเบียน
              </h2>
              <p className="profile-section-subtitle">
                ข้อมูลประจำตัวบุคคลที่เชื่อมโยงกับฐานข้อมูลทะเบียนราษฎร กรมการปกครอง
              </p>
            </div>
          </div>

          <div className="profile-info-grid">
            {/* Full Name */}
            <div className="profile-info-item">
              <span className="profile-info-label">ชื่อ - นามสกุล</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value">{user?.fullName || 'นายสมชาย ใจดี'}</span>
              </div>
            </div>

            {/* Citizen ID */}
            <div className="profile-info-item">
              <span className="profile-info-label">เลขประจำตัวประชาชน (13 หลัก)</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value tabular-num">
                  {user?.maskedCitizenId || '1-1005-xxxxx-45-1'}
                </span>
                <button
                  type="button"
                  className="btn-copy-mini"
                  onClick={() => handleCopy(user?.maskedCitizenId || '1-1005-xxxxx-45-1', 'citizenId')}
                  title="คัดลอกเลขบัตร ปชช."
                  aria-label="คัดลอกเลขบัตร ปชช."
                >
                  {copiedField === 'citizenId' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedField === 'citizenId' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            {/* Phone Number */}
            <div className="profile-info-item">
              <span className="profile-info-label">หมายเลขโทรศัพท์มือถือ</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value tabular-num">
                  {user?.maskedPhone || '081-xxx-5678'}
                </span>
                <button
                  type="button"
                  className="btn-copy-mini"
                  onClick={() => handleCopy(user?.maskedPhone || '081-xxx-5678', 'phone')}
                  title="คัดลอกเบอร์โทรศัพท์"
                  aria-label="คัดลอกเบอร์โทรศัพท์"
                >
                  {copiedField === 'phone' ? <Check size={13} color="#059669" /> : <Copy size={13} />}
                  <span>{copiedField === 'phone' ? 'คัดลอกแล้ว' : 'คัดลอก'}</span>
                </button>
              </div>
            </div>

            {/* Email */}
            <div className="profile-info-item">
              <span className="profile-info-label">ที่อยู่อีเมล</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value">
                  {user?.maskedEmail || 'ไม่ได้ระบุ'}
                </span>
              </div>
            </div>

            {/* Province / Area */}
            <div className="profile-info-item">
              <span className="profile-info-label">จังหวัด / พื้นที่ลงทะเบียน</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value">
                  {user?.provinceCode ? `รหัสจังหวัด ${user.provinceCode} (กรุงเทพมหานคร)` : 'กรุงเทพมหานคร'}
                </span>
              </div>
            </div>

            {/* Role Status */}
            <div className="profile-info-item">
              <span className="profile-info-label">สถานะในโครงการ</span>
              <div className="profile-info-val-row">
                <span className="profile-info-value" style={{ color: 'var(--bank-royal)', fontWeight: 700 }}>
                  {getRoleName(user?.role)}
                </span>
              </div>
            </div>

            {/* Merchant shop details if applicable */}
            {shop && (
              <>
                <div className="profile-info-item">
                  <span className="profile-info-label">ชื่อร้านค้า</span>
                  <div className="profile-info-val-row">
                    <span className="profile-info-value">{shop.shopName}</span>
                  </div>
                </div>
                <div className="profile-info-item">
                  <span className="profile-info-label">หมวดหมู่ร้านค้า</span>
                  <div className="profile-info-val-row">
                    <span className="profile-info-value">{shop.category || 'ร้านอาหารและเครื่องดื่ม'}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ========================================================
            2. PROJECT QUOTA & CO-PAY RIGHTS (สิทธิเงินร่วมจ่ายและกระเป๋าเงิน)
            ======================================================== */}
        <section className="profile-card-section" aria-labelledby="heading-quota-info">
          <div className="profile-section-header">
            <div className="profile-section-icon" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <Wallet size={20} />
            </div>
            <div>
              <h2 id="heading-quota-info" className="profile-section-title">
                สิทธิเงินร่วมจ่ายตลอดโครงการและกระเป๋าเงิน
              </h2>
              <p className="profile-section-subtitle">
                วงเงินสนับสนุนโครงการคนละครึ่ง 60/40 และยอดเงินในกระเป๋าพร้อมใช้
              </p>
            </div>
          </div>

          <div className="profile-quota-cards-grid">
            {/* Total Quota (สิทธิเงินร่วมจ่ายตลอดโครงการ) */}
            <div className="profile-quota-card highlight-royal">
              <div className="profile-quota-head">
                <span>สิทธิเงินร่วมจ่ายตลอดโครงการ</span>
                <Wallet size={16} color="var(--bank-royal)" />
              </div>
              <div className="profile-quota-amount text-royal">
                ฿{wallet?.totalQuota || '3,000.00'}
              </div>
              <div className="profile-quota-desc">
                วงเงินสนับสนุนรวมจากรัฐบาล 60% สำหรับใช้จ่ายที่ร้านค้าชุมชนและหาบเร่แผงลอยตลอดระยะเวลาโครงการ
              </div>
            </div>

            {/* Daily Quota */}
            <div className="profile-quota-card">
              <div className="profile-quota-head">
                <span>สิทธิคนละครึ่งวันนี้ (รัฐช่วย 60%)</span>
                <CreditCard size={16} color="#0284C7" />
              </div>
              <div className="profile-quota-amount" style={{ color: '#0284C7' }}>
                ฿{wallet?.dailyQuota || '150.00'} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-tertiary)' }}>/ วัน</span>
              </div>
              <div className="profile-quota-desc">
                จำกัดการใช้สิทธิร่วมจ่ายสูงสุด 150 บาทต่อวัน รีเซ็ตวงเงินรายวันทุก 06:00 น.
              </div>
            </div>

            {/* Wallet Balance */}
            <div className="profile-quota-card">
              <div className="profile-quota-head">
                <span>ยอดเงินคงเหลือพร้อมใช้ (จำลอง)</span>
                <button
                  type="button"
                  className="btn-topup-card"
                  onClick={handleTopup}
                  title="เติมเงินจำลอง ฿500"
                >
                  <PlusCircle size={13} />
                  <span>+ เติม ฿500</span>
                </button>
              </div>
              <div className="profile-quota-amount text-dark">
                ฿{userBalance.toFixed(2)}
              </div>
              <div className="profile-quota-desc">
                เงินส่วนของประชาชน 40% ที่จะถูกหักเมื่อสแกนจ่ายคนละครึ่ง
              </div>
            </div>

            {/* Impact Tokens */}
            <div className="profile-quota-card highlight-gold">
              <div className="profile-quota-head">
                <span>เหรียญ Impact Tokens สะสม</span>
                <Coins size={16} color="var(--accent-gold)" />
              </div>
              <div className="profile-quota-amount text-amber">
                {tokens} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--accent-gold)' }}>เหรียญ</span>
              </div>
              <div className="profile-quota-desc">
                รับจากการชำระเงินร้านชุมชน หรือทำภารกิจบิงโกสำเร็จ นำไปแลกของรางวัลได้
              </div>
              <div style={{ marginTop: 6 }}>
                <Link
                  to="/rewards"
                  className="profile-quota-link"
                >
                  <span>ไปหน้าแลกของรางวัล</span>
                  <ChevronRight size={13} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            3. DIGITAL ID & COMPLIANCE SUMMARY
            ======================================================== */}
        <section className="profile-card-section" aria-label="ความปลอดภัยและการคุ้มครองข้อมูล">
          <div className="profile-section-header">
            <div className="profile-section-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="profile-section-title">
                การรักษาความปลอดภัยและข้อมูลส่วนบุคคล
              </h2>
              <p className="profile-section-subtitle">
                มาตรฐานการคุ้มครองข้อมูลตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
              </p>
            </div>
          </div>

          <div className="profile-security-rows">
            <div className="profile-sec-row">
              <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
              <div>
                <strong>การยืนยันตัวตนดิจิทัล (ThaiD DOPA)</strong>
                <p>เชื่อมโยงอัตลักษณ์บุคคลระดับ IAL 2.3 ป้องกันการสวมสิทธิ 100%</p>
              </div>
            </div>

            <div className="profile-sec-row">
              <CheckCircle2 size={18} color="#059669" style={{ flexShrink: 0 }} />
              <div>
                <strong>การเข้ารหัสข้อมูลมาตรฐานสถาบันการเงิน</strong>
                <p>ข้อมูลทั้งหมดเข้ารหัสด้วยเทคโนโลยี End-to-End Encryption สอดคล้องตามมาตรฐาน ETDA และเกณฑ์สถาบันการเงิน</p>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            4. ACTIONS & LOGOUT
            ======================================================== */}
        <div className="profile-actions-bar">
          <Link to="/payment" className="btn-profile-primary">
            <QrCode size={18} />
            <span>สแกนชำระเงินคนละครึ่ง</span>
          </Link>

          <button
            type="button"
            className="btn-profile-secondary"
            onClick={handleTopup}
          >
            <PlusCircle size={18} />
            <span>เติมเงินจำลอง ฿500</span>
          </button>

          <button
            type="button"
            className="btn-profile-logout"
            onClick={logout}
          >
            <LogOut size={18} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </main>
    </div>
  );
}
