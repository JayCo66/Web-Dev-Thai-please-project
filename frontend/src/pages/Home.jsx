import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LogOut, 
  Coins, 
  Wallet, 
  ShieldCheck, 
  Store, 
  User, 
  Sparkles,
  CheckCircle2,
  Calendar
} from 'lucide-react';

export default function Home() {
  const { user, tokens, wallet, shop, logout } = useAuth();

  const getRoleName = (role) => {
    switch (role) {
      case 'MERCHANT': return 'ร้านค้าผู้ประกอบการ';
      case 'ADMIN': return 'ผู้ดูแลระบบ';
      case 'GOV_EXECUTIVE': return 'ผู้บริหารภาครัฐ';
      default: return 'ประชาชนผู้ใช้สิทธิ';
    }
  };

  const getRoleClass = (role) => {
    switch (role) {
      case 'MERCHANT': return 'role-merchant';
      case 'ADMIN': return 'role-admin';
      default: return 'role-citizen';
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-logo">TP</div>
          <div>
            <div className="header-title">ไทยช่วยไทยพลีส</div>
            <div className="header-tag">Digital Co-Payment & Gamification Platform</div>
          </div>
        </div>

        <div className="header-user">
          {/* Tokens Pill */}
          <div className="token-pill">
            <Coins size={16} />
            <span>{tokens} Tokens</span>
          </div>

          {/* Role Badge */}
          <span className={`role-badge ${getRoleClass(user?.role)}`}>
            {getRoleName(user?.role)}
          </span>

          {/* Logout Button */}
          <button type="button" className="btn-logout" onClick={logout}>
            <LogOut size={16} />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="home-container">
        {/* Welcome Hero Banner */}
        <div className="hero-banner">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: 999, fontSize: 13, marginBottom: 12 }}>
            <Sparkles size={14} /> เข้าสู่ระบบสำเร็จ
          </div>
          <h1 className="hero-title">
            สวัสดี, {user?.fullName || 'ผู้ใช้งาน'}! 👋
          </h1>
          <p className="hero-subtitle">
            ยินดีต้อนรับเข้าสู่แพลตฟอร์มไทยช่วยไทยพลีส ขณะนี้บัญชีของคุณได้รับการยืนยันตัวตนเรียบร้อยแล้ว
          </p>
        </div>

        {/* User Status Information Grid */}
        <div className="info-grid">
          {/* Card 1: User Profile */}
          <div className="info-card">
            <div className="info-card-header">
              <span>ข้อมูลบัญชีผู้ใช้</span>
              <User size={18} />
            </div>
            <div className="info-card-value" style={{ fontSize: 20 }}>
              {user?.fullName}
            </div>
            <div className="info-card-desc">
              {user?.maskedCitizenId && <div>เลขบัตร ปชช: {user.maskedCitizenId}</div>}
              {user?.maskedPhone && <div>เบอร์โทรศัพท์: {user.maskedPhone}</div>}
              {shop && <div>ร้านค้า: <strong>{shop.shopName}</strong> ({shop.category})</div>}
            </div>
          </div>

          {/* Card 2: Impact Tokens */}
          <div className="info-card">
            <div className="info-card-header">
              <span>Impact Tokens สะสม</span>
              <Coins size={18} color="#D97706" />
            </div>
            <div className="info-card-value" style={{ color: '#D97706' }}>
              {tokens}
            </div>
            <div className="info-card-desc">
              โทเค็นสำหรับร่วมบริจาคโครงการเพื่อสังคม หรือแลกรางวัล
            </div>
          </div>

          {/* Card 3: Co-Pay Wallet Quota */}
          <div className="info-card">
            <div className="info-card-header">
              <span>สิทธิเงินร่วมจ่าย (Co-Pay)</span>
              <Wallet size={18} color="#059669" />
            </div>
            <div className="info-card-value" style={{ color: '#059669' }}>
              ฿{wallet?.dailyQuota || '150.00'}/วัน
            </div>
            <div className="info-card-desc">
              รัฐร่วมจ่าย 60% สูงสุด ฿{wallet?.totalQuota || '3,000.00'} ตลอดโครงการ
            </div>
          </div>
        </div>

        {/* Ready Notification Box */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 16
        }}>
          <CheckCircle2 size={32} color="#10B981" style={{ flexShrink: 0 }} />
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4 }}>
              ระบบ Authentication & Session พร้อมใช้งานสมบูรณ์
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
              หน้า Login และ Register เชื่อมต่อ API กับ Backend และฐานข้อมูลเรียบร้อยแล้ว โดยบันทึก Token ลงใน LocalStorage และมีระบบรักษาความปลอดภัยตามมาตรฐาน PDPA
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
