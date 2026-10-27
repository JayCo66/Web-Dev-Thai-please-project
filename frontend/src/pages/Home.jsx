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
  Grid
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  Clock,
  PlusCircle,
  Building2,
  Gift
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
            BANKING QUICK ACTION GRID (4 Main Financial Actions)
            ======================================================== */}
        <div className="financial-quick-grid" role="navigation" aria-label="เมนูด่วน">
          <Link to="/payment" className="quick-action-item">
            <div className="quick-action-icon-box">
              <QrCode size={20} />
            </div>
            <span className="quick-action-label">คนละครึ่ง 60/40</span>
          </Link>

          <Link to="/rewards" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
              <Gift size={20} />
            </div>
            <span className="quick-action-label">แลกรางวัล</span>
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

          <Link to="/charities" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <HeartHandshake size={20} />
            </div>
            <span className="quick-action-label">บริจาคภาษี</span>
          </Link>

          <button
            type="button"
            className="quick-action-item"
            onClick={() => resetBalance(500)}
            style={{ border: '1px solid var(--border-light)', width: '100%' }}
          >
            <div className="quick-action-icon-box" style={{ background: '#ECFDF5', color: '#059669' }}>
              <Wallet size={20} />
            </div>
            <span className="quick-action-label">เติมเงิน ฿500</span>
          </button>
        </div>

        {/* ========================================================
            FINANCIAL SERVICE CARDS (Payment, Rewards & Social Impact)
            ======================================================== */}
        <section aria-label="บริการสิทธิประโยชน์">
          {/* Card 1: Co-Pay 60/40 */}
          <Link to="/payment" className="financial-service-card">
            <div className="service-card-left">
              <div className="service-icon-box">
                <CreditCard size={22} />
              </div>
              <div>
                <h2 className="service-card-title">
                  ชำระเงินร้านค้าคนละครึ่งพลีส (Co-Payment 60/40)
                </h2>
                <p className="service-card-desc">
                  รัฐบาลช่วยจ่าย 60% สูงสุด 150 บาทต่อวัน ประชาชนจ่ายเพียง 40% บันทึกตรงเข้าบัญชีผู้ประกอบการ
                </p>
              </div>
            </div>
            <div className="service-card-btn">
              <span>ไปชำระเงิน</span>
              <ArrowRight size={15} />
            </div>
          </Link>

          {/* Card 2: ThaiPlus Rewards & Lucky Draw */}
          <Link to="/rewards" className="financial-service-card">
            <div className="service-card-left">
              <div className="service-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
                <Gift size={22} />
              </div>
              <div>
                <h2 className="service-card-title">
                  ไทยช่วยไทยพลัส (แลกของรางวัล & ชิงโชคทองคำ)
                </h2>
                <p className="service-card-desc">
                  ใช้ Impact Tokens แลกคูปองส่วนลดร้านค้า, สินค้าพรีเมียมชุมชน หรือลงชื่อชิงโชครางวัลใหญ่ประจำงวด
                </p>
              </div>
            </div>
            <div className="service-card-btn" style={{ background: 'linear-gradient(135deg, #B45309 0%, #D97706 100%)' }}>
              <span>ไปหน้าแลกรางวัล</span>
              <ArrowRight size={15} />
            </div>
          </Link>

          {/* Card 3: Social Impact Charities (e-Donation) */}
          <Link to="/charities" className="financial-service-card">
            <div className="service-card-left">
              <div className="service-icon-box accent-teal">
                <Building2 size={22} />
              </div>
              <div>
                <h2 className="service-card-title">
                  ระบบบริจาคอิเล็กทรอนิกส์เพื่อสังคม (e-Donation)
                </h2>
                <p className="service-card-desc">
                  ส่งต่อความช่วยเหลือแก่มูลนิธิที่ได้รับการรับรอง พร้อมรับเลขอ้างอิงกรมสรรพากรเพื่อลดหย่อนภาษีเงินได้
                </p>
              </div>
            </div>
            <div className="service-card-btn" style={{ background: 'linear-gradient(135deg, #0369A1 0%, #0284C7 100%)' }}>
              <span>ร่วมบริจาค</span>
              <ArrowRight size={15} />
            </div>
          </Link>
        </section>

        {/* ========================================================
            ACCOUNT INFORMATION METRICS
            ======================================================== */}
        <section className="banking-info-grid" aria-label="ข้อมูลบัญชี">
          <div className="banking-info-card">
            <div className="banking-info-header">
              <span>เจ้าของบัญชี</span>
              <User size={16} color="var(--bank-royal)" />
            </div>
            <div className="banking-info-value" style={{ fontSize: 17 }}>
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
              วงเงินสนับสนุนรวมตลอดระยะเวลาโครงการ
            </div>
            <Link
              to="/rewards"
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

          <div className="banking-info-card">
            <div className="banking-info-header">
              <span>Impact Tokens</span>
              <Coins size={16} color="var(--accent-gold)" />
            </div>
            <div className="banking-info-value" style={{ color: 'var(--accent-gold)' }}>
              {tokens}
            </div>
            <div className="banking-info-desc">
              คะแนนสะสมความดีสำหรับร่วมกิจกรรมและรับสิทธิพิเศษ
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
