import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
  Wallet,
  User,
  CheckCircle2,
  HeartHandshake,
  ArrowRight,
  Gift,
  Grid,
  ShieldCheck,
  Eye,
  EyeOff,
  QrCode,
  PlusCircle,
  Trophy,
  Sparkles,
  Info
} from 'lucide-react';

export default function Home() {
  const { user, tokens, wallet, shop, resetBalance } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  const [bingoStats, setBingoStats] = useState({
    completed: 0,
    total: 25,
    bingos: 0,
    loading: true
  });

  const userBalance = parseFloat(wallet?.balance || '500.00');

  useEffect(() => {
    let isMounted = true;
    api.get('/quests/active-board?boardIndex=0')
      .then((res) => {
        if (isMounted && res.data && res.data.success) {
          const board = res.data.data.currentBoard;
          if (board) {
            const completed = board.cells ? board.cells.filter((c) => c.status === 'COMPLETED').length : 0;
            const bingos = board.bingoCount || 0;
            setBingoStats({
              completed,
              total: 25,
              bingos,
              loading: false
            });
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setBingoStats((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const completedCount = bingoStats.completed;
  const totalCount = bingoStats.total || 25;
  const progressPercent = Math.min(100, Math.round((completedCount / totalCount) * 100));

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Official Financial Header & Fixed Mobile Navigation Dock */}
      <Navbar />

      {/* Main Banking App Shell */}
      <main className="home-container" id="main-content">
        {/* ========================================================
            1. SIGNATURE G-WALLET / FINANCIAL ACCOUNT CARD
            ======================================================== */}
        <section className="financial-wallet-card" aria-label="บัตรกระเป๋าเงินดิจิทัล">
          {/* Top Row: Identity & Trust Badge */}
          <div className="wallet-card-top">
            <div className="wallet-badge">
              <ShieldCheck size={15} color="#93C5FD" />
              <span>กระเป๋าเงินดิจิทัลเพื่อประชาชน</span>
            </div>
            <div className="wallet-security-seal">
              <CheckCircle2 size={13} color="#34D399" />
              <span>ยืนยันสิทธิแล้ว</span>
            </div>
          </div>

          {/* Balance Section with Big Accessible Font and Eye Toggle */}
          <div className="wallet-balance-row">
            <div>
              <div className="wallet-balance-title">
                <span>ยอดเงินคงเหลือพร้อมใช้ (จำลอง)</span>
                <button
                  type="button"
                  className="btn-toggle-balance"
                  onClick={() => setShowBalance(!showBalance)}
                  title={showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}
                  aria-label={showBalance ? 'ซ่อนยอดเงิน' : 'แสดงยอดเงิน'}
                >
                  {showBalance ? <Eye size={18} /> : <EyeOff size={18} />}
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
              aria-label="เติมเงินจำลอง 500 บาท"
            >
              <PlusCircle size={18} />
              <span>เติมเงิน ฿500</span>
            </button>
          </div>

          {/* Bottom Meta Grid: Co-Pay 60/40 Quota & Tokens */}
          <div className="wallet-meta-grid">
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">สิทธิคนละครึ่งวันนี้ (รัฐช่วย 60%)</span>
              <span className="wallet-meta-value">฿{wallet?.dailyQuota || '150.00'} / วัน</span>
            </div>
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">เหรียญ Impact Tokens สะสม</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <span className="wallet-meta-value" style={{ color: '#FDE68A' }}>
                  {tokens} เหรียญ
                </span>
                <Link
                  to="/rewards"
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: '#FEF3C7',
                    background: 'rgba(255, 255, 255, 0.16)',
                    border: '1px solid rgba(255, 255, 255, 0.28)',
                    padding: '5px 12px',
                    borderRadius: 'var(--radius-full)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    minHeight: 32,
                    whiteSpace: 'nowrap'
                  }}
                  title="ไปหน้าแลกของรางวัลและชิงโชค"
                >
                  <span>แลกของรางวัล</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            2. HERO SCAN / QUICK PAY BUTTON FOR CITIZENS & SENIORS
            ======================================================== */}
        <Link
          to="/payment"
          className="hero-scan-card"
          aria-label="สแกนจ่ายคนละครึ่ง 60/40 แตะเพื่อเปิดกล้องสแกนคิวอาร์โค้ดร้านค้า"
        >
          <div className="hero-scan-left">
            <div className="hero-scan-icon-wrap">
              <QrCode size={30} strokeWidth={2.5} />
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
            3. BANKING QUICK ACTION GRID (4 Clean Large Thumb Buttons)
            ======================================================== */}
        <div className="financial-quick-grid" role="navigation" aria-label="บริการหลักของระบบ">
          <Link to="/payment" className="quick-action-item" aria-label="บริการคนละครึ่ง 60/40 สแกนชำระเงิน">
            <div className="quick-action-icon-box" style={{ background: '#EFF6FF', color: '#1E40AF' }}>
              <QrCode size={22} />
            </div>
            <span className="quick-action-label">คนละครึ่ง</span>
          </Link>

          <Link to="/bingo" className="quick-action-item" aria-label="เกมบิงโกภารกิจ 5x5">
            <div className="quick-action-icon-box" style={{ background: '#EEF2FF', color: '#4F46E5' }}>
              <Grid size={22} />
            </div>
            <span className="quick-action-label">เกมบิงโก</span>
          </Link>

          <Link to="/rewards" className="quick-action-item" aria-label="แลกของรางวัลและชิงโชค">
            <div className="quick-action-icon-box" style={{ background: '#FEF3C7', color: '#B45309' }}>
              <Gift size={22} />
            </div>
            <span className="quick-action-label">แลกรางวัล</span>
          </Link>

          <Link to="/charities" className="quick-action-item" aria-label="บริจาคภาษี e-Donation ลดหย่อนภาษี">
            <div className="quick-action-icon-box" style={{ background: '#E0F2FE', color: '#0369A1' }}>
              <HeartHandshake size={22} />
            </div>
            <span className="quick-action-label">บริจาคภาษี</span>
          </Link>
        </div>

        {/* ========================================================
            4. FRIENDLY BINGO GAME & MISSION PROGRESS SPOTLIGHT
            ======================================================== */}
        <Link
          to="/bingo"
          className="dashboard-bingo-card"
          aria-label="เกมบิงโกคนละครึ่ง ทำภารกิจรับโบนัสโทเค็น"
        >
          <div className="dashboard-bingo-top">
            <div className="dashboard-bingo-header">
              <div className="dashboard-bingo-icon">
                <Grid size={24} />
              </div>
              <div>
                <div className="dashboard-bingo-pill">
                  <Sparkles size={11} />
                  <span>ภารกิจรับเหรียญรางวัลพิเศษ</span>
                </div>
                <h2 className="dashboard-bingo-title">
                  เกมบิงโกคนละครึ่ง (5x5)
                </h2>
                <p className="dashboard-bingo-desc">
                  ช้อปปิ้งร้านค้าชุมชนหรือร่วมบริจาค ครบแถวรับโบนัส +100 โทเค็นทันที
                </p>
              </div>
            </div>
          </div>

          {/* Live Progress Bar */}
          <div className="dashboard-bingo-progress-box">
            <div className="dashboard-bingo-progress-meta">
              <span>ความคืบหน้ากระดานเดือนนี้: {completedCount} / {totalCount} ช่อง</span>
              {bingoStats.bingos > 0 ? (
                <span style={{ color: '#FDE047', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Trophy size={13} />
                  <span>{bingoStats.bingos} บิงโก</span>
                </span>
              ) : (
                <span>{progressPercent}%</span>
              )}
            </div>
            <div className="dashboard-bingo-progress-bar">
              <div
                className="dashboard-bingo-progress-fill"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>

          <div className="dashboard-bingo-action-btn">
            <span>เข้าเล่นเกมบิงโก</span>
            <ArrowRight size={15} />
          </div>
        </Link>

        {/* ========================================================
            5. SENIOR & CITIZEN 3-STEP GUIDE (Simple & Practical)
            ======================================================== */}
        <section className="dashboard-steps-section" aria-label="วิธีใช้งานง่ายๆ ใน 3 ขั้นตอน">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">
              <Info size={18} color="var(--bank-royal)" />
              <span>วิธีใช้งานคนละครึ่งง่ายๆ</span>
            </h2>
          </div>

          <div className="dashboard-steps-grid">
            <div className="step-card">
              <div className="step-num-badge">1</div>
              <div className="step-content">
                <div className="step-title">เลือกร้านค้าชุมชน</div>
                <div className="step-desc">
                  มองหาป้ายร้านค้าที่มีสัญลักษณ์ คนละครึ่ง 60/40 หรือร้านค้าใกล้บ้านคุณ
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num-badge">2</div>
              <div className="step-content">
                <div className="step-title">สแกนจ่ายผ่านแอป</div>
                <div className="step-desc">
                  รัฐร่วมจ่าย 60% สูงสุด 150 บาทต่อวัน ประชาชนจ่ายเองเพียง 40%
                </div>
              </div>
            </div>

            <div className="step-card">
              <div className="step-num-badge">3</div>
              <div className="step-content">
                <div className="step-title">รับเหรียญรางวัล</div>
                <div className="step-desc">
                  ทุกการใช้จ่ายได้รับเหรียญ Impact Tokens สะสมแลกของรางวัลและชิงโชค
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            6. CITIZEN ACCOUNT & PROJECT QUOTA SUMMARY
            ======================================================== */}
        <section className="citizen-summary-grid" aria-label="ข้อมูลผู้ลงทะเบียนและวงเงินโครงการ">
          <div className="citizen-summary-card">
            <div className="citizen-summary-head">
              <span>ข้อมูลผู้ลงทะเบียน</span>
              <User size={16} color="var(--bank-royal)" />
            </div>
            <div className="citizen-summary-val">
              {user?.fullName || 'ประชาชนผู้มีสิทธิ'}
            </div>
            <div className="citizen-summary-meta">
              <div>เลขบัตร ปชช: {user?.maskedCitizenId || '1-xxxx-xxxxx-xx-1'}</div>
              <div>เบอร์โทรศัพท์: {user?.maskedPhone || '08x-xxx-xxxx'}</div>
              {shop && <div>ร้านค้า: {shop.shopName}</div>}
            </div>
          </div>

          <div className="citizen-summary-card">
            <div className="citizen-summary-head">
              <span>สิทธิเงินร่วมจ่ายตลอดโครงการ</span>
              <Wallet size={16} color="var(--bank-royal)" />
            </div>
            <div className="citizen-summary-val" style={{ color: 'var(--bank-royal)' }}>
              ฿{wallet?.totalQuota || '3,000.00'}
            </div>
            <div className="citizen-summary-meta">
              วงเงินสนับสนุนรวมจากรัฐบาล 60% สำหรับใช้จ่ายที่ร้านค้าชุมชนและหาบเร่แผงลอย
            </div>
          </div>
        </section>

        {/* ========================================================
            7. SECURITY & PDPA COMPLIANCE (ETDA, DOPA & Bank Standard)
            ======================================================== */}
        <div className="compliance-box" role="region" aria-label="ความปลอดภัยและ PDPA">
          <CheckCircle2 size={24} color="var(--fin-success)" style={{ flexShrink: 0 }} />
          <div>
            <div className="compliance-title">
              ระบบรักษาความปลอดภัยมาตรฐานสถาบันการเงินและ PDPA
            </div>
            <div className="compliance-text">
              ข้อมูลธุรกรรมและตัวตนได้รับการเข้ารหัสมาตรฐานความปลอดภัยขั้นสูง (End-to-End Encryption) สอดคล้องตามมาตรฐาน ETDA และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
