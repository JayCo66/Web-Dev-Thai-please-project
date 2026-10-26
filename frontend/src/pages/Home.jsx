import React from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  HeartHandshake,
  ArrowRight,
  CreditCard,
  Gift,
  Grid
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
          {/* Link to Payment */}
          <Link
            to="/payment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 999,
              color: '#1E40AF',
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <CreditCard size={16} />
            <span>ชำระเงิน (60/40)</span>
          </Link>

          {/* Link to Charities */}
          <Link
            to="/charities"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 999,
              color: '#0F766E',
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <HeartHandshake size={16} />
            <span>ร่วมบริจาค</span>
          </Link>

          {/* Link to Bingo Board */}
          <Link
            to="/bingo"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: '#EEF2FF',
              border: '1px solid #C7D2FE',
              borderRadius: 999,
              color: '#4338CA',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Grid size={16} color="#4F46E5" />
            <span>ภารกิจบิงโก 5x5</span>
          </Link>

          {/* Link to ThaiPlus (Token Activities) */}
          <Link
            to="/plus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 999,
              color: '#92400E',
              fontSize: 13.5,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Gift size={16} color="#D97706" />
            <span>ไทยช่วยไทยพลัส (ใช้ Token)</span>
          </Link>

          {/* Simulated Balance Pill */}
          <div className="balance-pill" title="ยอดเงินจำลองในกระเป๋า">
            <Wallet size={16} />
            <span>฿{parseFloat(wallet?.balance || '500.00').toFixed(2)}</span>
          </div>

          {/* Tokens Pill */}
          <Link
            to="/plus"
            className="token-pill"
            style={{ textDecoration: 'none', cursor: 'pointer' }}
            title="คลิกเพื่อไปหน้าใช้โทเค็น"
          >
            <Coins size={16} />
            <span>{tokens} Tokens</span>
          </Link>

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
            <div className="info-card-desc" style={{ marginBottom: 8 }}>
              โทเค็นสำหรับร่วมบริจาคโครงการเพื่อสังคม หรือแลกรางวัล
            </div>
            <Link
              to="/plus"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12.5,
                fontWeight: 600,
                color: '#D97706',
                textDecoration: 'none',
              }}
            >
              <span>ใช้ Token แลกของ & ลุ้นโชค</span>
              <ArrowRight size={13} />
            </Link>
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

        {/* AI Bingo Mission Board Banner */}
        <Link
          to="/bingo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1E1B4B 0%, #4338CA 50%, #6366F1 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(79, 70, 229, 0.35)',
            marginBottom: 18,
            transition: 'all 0.2s ease',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 16, background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Grid size={28} color="#FDE047" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(238, 242, 255, 0.25)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#E0E7FF', marginBottom: 4 }}>
                <Sparkles size={12} /> ขับเคลื่อนด้วย Typhoon AI v2.5
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                🎯 ภารกิจบิงโก 5x5: ทำภารกิจพิชิตแถวบิงโกลุ้นรับโทเค็น
              </h3>
              <p style={{ fontSize: 13.5, opacity: 0.9 }}>
                กระดานภารกิจ 25 ช่องที่ออกแบบเฉพาะบุคคล | ศูนย์กลางบริจาคใจฟู + 12 เส้นทางบิงโกรับโบนัสสะสมโทเค็น
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, background: 'rgba(255,255,255,0.25)', padding: '8px 18px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            <span>เปิดกระดานบิงโก</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Thai Plus Token Activities Banner */}
        <Link
          to="/plus"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 40%, #B45309 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            textDecoration: 'none',
            boxShadow: '0 8px 24px rgba(49, 46, 129, 0.3)',
            marginBottom: 18,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gift size={28} color="#FBBF24" />
            </div>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(245, 158, 11, 0.3)', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: '#FDE68A', marginBottom: 4 }}>
                <Sparkles size={12} /> สิทธิประโยชน์ใหม่!
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                🎁 ไทยช่วยไทยพลัส: ใช้ Impact Tokens แลกของรางวัล & ลุ้นโชคใหญ่
              </h3>
              <p style={{ fontSize: 13.5, opacity: 0.9 }}>
                นำโทเค็นสะสมมาลงชื่อชิงโชคทองคำแท่ง 1 บาท, iPhone 16 Pro, แลกคูปองส่วนลดร้านค้า หรือสินค้าชุมชน
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, background: 'rgba(255,255,255,0.25)', padding: '8px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>
            <span>ไปใช้ Token</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Payment Co-Pay Banner */}
        <Link
          to="/payment"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #1E40AF 0%, #2563EB 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
            marginBottom: 18,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CreditCard size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                💳 ชำระเงินคนละครึ่ง (Co-Payment 60/40)
              </h3>
              <p style={{ fontSize: 13.5, opacity: 0.9 }}>
                เลือกร้านค้าเพื่อชำระเงิน รัฐช่วยจ่าย 60% ประชาชนจ่ายเพียง 40% บันทึกลงตาราง transactions
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: 999 }}>
            <span>ไปชำระเงิน</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* Charity Quick Action Banner */}
        <Link
          to="/charities"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '24px 28px',
            textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(13, 148, 136, 0.25)',
            marginBottom: 24,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 50, height: 50, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <HeartHandshake size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>
                🤝 มูลนิธิและโครงการเพื่อสังคม (Social Impact)
              </h3>
              <p style={{ fontSize: 13.5, opacity: 0.9 }}>
                จำลองการใช้ยอดเงินสิทธิร่วมบริจาค พร้อมรับเลขอ้างอิง e-Donation ลดหย่อนภาษี
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14, background: 'rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: 999 }}>
            <span>ร่วมบริจาค</span>
            <ArrowRight size={16} />
          </div>
        </Link>

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
