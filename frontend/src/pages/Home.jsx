import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Coins,
  Wallet,
  User,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  CreditCard,
  Gift,
  Grid,
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  Clock,
  PlusCircle,
  Building2,
  Sparkles
} from 'lucide-react';

export default function Home() {
  const { user, tokens, wallet, shop, resetBalance } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const userBalance = parseFloat(wallet?.balance || '500.00');

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Official Financial App Header & Bottom Dock */}
      <Navbar />

      {/* Main Banking App Container */}
      <main className="home-container">
        {/* ========================================================
            SIGNATURE G-WALLET / FINANCIAL ACCOUNT CARD
            ======================================================== */}
        <section className="financial-wallet-card" aria-label="บัตรกระเป๋าเงินดิจิทัล">
          {/* Top Row: Product Identity & Security Seal */}
          <div className="wallet-card-top">
            <div className="wallet-badge">
              <ShieldCheck size={14} color="#93C5FD" />
              <span>กระเป๋าเงินดิจิทัลเพื่อเศรษฐกิจฐานราก</span>
            </div>
            <div className="wallet-security-seal">
              <span>ยืนยันตัวตนแล้ว</span>
            </div>
          </div>

          {/* Balance Section with Eye Toggle */}
          <div className="wallet-balance-row">
            <div>
              <div className="wallet-balance-title">
                <span>ยอดเงินในกระเป๋า (จำลอง)</span>
                <button
                  type="button"
                  className="btn-toggle-balance"
                  onClick={() => setShowBalance(!showBalance)}
                  title={showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}
                  aria-label="สลับการแสดงผลยอดเงิน"
                >
                  {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>
              <div className="wallet-balance-amount">
                {showBalance ? `฿${userBalance.toFixed(2)}` : '฿ ••••••'}
              </div>
            </div>

            <button
              type="button"
              className="btn-wallet-topup"
              onClick={() => resetBalance(500)}
              title="เติมเงินจำลอง 500 บาทสำหรับการทดสอบระบบ"
            >
              <PlusCircle size={15} />
              <span>เติมเงิน ฿500</span>
            </button>
          </div>

          {/* Bottom Meta Grid: Co-Pay 60/40 Quota & Tokens */}
          <div className="wallet-meta-grid">
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">สิทธิรัฐร่วมจ่าย 60% วันนี้</span>
              <span className="wallet-meta-value">฿{wallet?.dailyQuota || '150.00'}/วัน</span>
            </div>
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">Impact Tokens สะสม</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
                <span className="wallet-meta-value" style={{ color: '#FDE68A' }}>
                  {tokens} Tokens
                </span>
                <Link
                  to="/rewards"
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: '#FEF3C7',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.25)',
                    padding: '3px 9px',
                    borderRadius: 'var(--radius-full)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 3,
                    whiteSpace: 'nowrap'
                  }}
                  title="ไปหน้าแลกของรางวัลและชิงโชค"
                >
                  <span>แลกรางวัล</span>
                  <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            HERO SCAN / QUICK PAY BUTTON FOR SENIORS & GENERAL USERS
            ======================================================== */}
        <Link to="/payment" className="hero-scan-card" aria-label="สแกนจ่ายคนละครึ่ง">
          <div className="hero-scan-left">
            <div className="hero-scan-icon-wrap">
              <QrCode size={28} strokeWidth={2.5} />
            </div>
            <div>
              <div className="hero-scan-title">
                สแกนจ่าย คนละครึ่ง (60/40)
              </div>
              <div className="hero-scan-desc">
                รัฐช่วยจ่าย 60% สูงสุด 150 บาท/วัน ประชาชนจ่าย 40% ที่ร้านค้าชุมชน
              </div>
            </div>
          </div>
          <div className="hero-scan-btn">
            <span>สแกนจ่าย</span>
            <ArrowRight size={16} />
          </div>
        </Link>

        {/* ========================================================
            BANKING QUICK ACTION GRID (4 Clean Thumb Buttons)
            ======================================================== */}
        <div className="financial-quick-grid" role="navigation" aria-label="บริการหลัก">
          <Link to="/payment" className="quick-action-item">
            <div className="quick-action-icon-box">
              <QrCode size={20} />
            </div>
            <span className="quick-action-label">คนละครึ่ง</span>
          </Link>

          <Link to="/bingo" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <Grid size={20} />
            </div>
            <span className="quick-action-label">เกมบิงโก</span>
          </Link>

          <Link to="/rewards" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
              <Gift size={20} />
            </div>
            <span className="quick-action-label">แลกรางวัล</span>
          </Link>

          <Link to="/charities" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <HeartHandshake size={20} />
            </div>
            <span className="quick-action-label">บริจาคภาษี</span>
          </Link>
        </div>

        {/* ========================================================
            FRIENDLY BINGO GAME BANNER
            ======================================================== */}
        <Link
          to="/bingo"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 14,
            background: 'linear-gradient(135deg, #0A192F 0%, #1E3A8A 100%)',
            color: '#FFFFFF',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 22px',
            textDecoration: 'none',
            boxShadow: '0 6px 20px rgba(10, 25, 47, 0.18)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            marginBottom: 20,
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 240 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.14)',
                border: '1px solid rgba(255, 255, 255, 0.22)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FDE047',
                flexShrink: 0
              }}
            >
              <Grid size={26} />
            </div>
            <div>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  background: 'rgba(254, 243, 199, 0.2)',
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  color: '#FDE68A',
                  marginBottom: 3,
                }}
              >
                <Sparkles size={11} /> สนุกกับการทำภารกิจ
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: '2px 0', color: '#FFFFFF' }}>
                เกมบิงโกคนละครึ่ง 5x5
              </h2>
              <p style={{ fontSize: 12.5, opacity: 0.88, margin: 0, lineHeight: 1.4 }}>
                ทำภารกิจง่ายๆ จากการใช้จ่ายหรือทำบุญ ครบแถวรับโบนัส +100 โทเค็นทันที
              </p>
            </div>
          </div>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 800,
              fontSize: 13,
              background: '#FFFFFF',
              color: '#1E40AF',
              padding: '8px 16px',
              borderRadius: 999,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
            }}
          >
            <span>เข้าเล่นบิงโก</span>
            <ArrowRight size={14} />
          </div>
        </Link>

        {/* ========================================================
            ACCOUNT INFORMATION METRICS (Compact & Simple)
            ======================================================== */}
        <section className="banking-info-grid" aria-label="ข้อมูลบัญชี">
          <div className="banking-info-card">
            <div className="banking-info-header">
              <span>เจ้าของบัญชี</span>
              <User size={16} color="var(--bank-royal)" />
            </div>
            <div className="banking-info-value" style={{ fontSize: 16 }}>
              {user?.fullName}
            </div>
            <div className="banking-info-desc">
              {user?.maskedCitizenId && <div>เลขบัตร ปชช: {user.maskedCitizenId}</div>}
              {user?.maskedPhone && <div>เบอร์โทร: {user.maskedPhone}</div>}
              {shop && <div>ร้านค้า: {shop.shopName}</div>}
            </div>
          </div>

          <div className="banking-info-card">
            <div className="banking-info-header">
              <span>สิทธิเงินร่วมจ่ายสะสม</span>
              <Wallet size={16} color="var(--bank-royal)" />
            </div>
            <div className="banking-info-value">
              ฿{wallet?.totalQuota || '3,000.00'}
            </div>
            <div className="banking-info-desc">
              วงเงินสนับสนุนรวมตลอดทั้งโครงการ
            </div>
          </div>

          <div className="banking-info-card">
            <div className="banking-info-header">
              <span>Impact Tokens สะสม</span>
              <Coins size={16} color="var(--accent-gold)" />
            </div>
            <div className="banking-info-value" style={{ color: 'var(--accent-gold)' }}>
              {tokens}
            </div>
            <div className="banking-info-desc">
              คะแนนสะสมสำหรับแลกของรางวัลและชิงโชค
            </div>
            <Link
              to="/rewards"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                fontSize: 12,
                fontWeight: 700,
                color: '#D97706',
                textDecoration: 'none',
                marginTop: 4,
              }}
            >
              <span>ไปหน้าแลกรางวัล</span>
              <ArrowRight size={12} />
            </Link>
          </div>
        </section>

        {/* ========================================================
            COMPLIANCE & SYSTEM SECURITY
            ======================================================== */}
        <div className="compliance-box">
          <CheckCircle2 size={24} color="var(--fin-success)" style={{ flexShrink: 0 }} />
          <div>
            <div className="compliance-title">
              ระบบรักษาความปลอดภัยมาตรฐานสถาบันการเงินและ PDPA
            </div>
            <div className="compliance-text">
              ข้อมูลธุรกรรมและการยืนยันตัวตนได้รับการเข้ารหัสมาตรฐานความปลอดภัยขั้นสูง (End-to-End Encryption) สอดคล้องตามข้อกำหนดของสำนักงานพัฒนาธุรกรรมทางอิเล็กทรอนิกส์ (ETDA)
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
