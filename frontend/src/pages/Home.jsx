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
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  Clock,
  PlusCircle,
  Building2
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
              <span className="wallet-meta-value" style={{ color: '#FDE68A' }}>
                {tokens} Tokens
              </span>
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

          <Link to="/payment" className="quick-action-item">
            <div className="quick-action-icon-box" style={{ background: '#F1F5F9', color: '#475569' }}>
              <Clock size={20} />
            </div>
            <span className="quick-action-label">ประวัติธุรกรรม</span>
          </Link>
        </div>

        {/* ========================================================
            FINANCIAL SERVICE CARDS (Payment & Social Impact)
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

          {/* Card 2: Social Impact Charities (e-Donation) */}
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
