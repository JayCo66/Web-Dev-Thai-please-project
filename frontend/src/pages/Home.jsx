import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
import {
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
  Sparkles
} from 'lucide-react';

export default function Home() {
  const { tokens, wallet, addBalance, resetBalance } = useAuth();
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
            <Link
              to="/profile"
              className="wallet-security-seal"
              style={{ textDecoration: 'none', cursor: 'pointer' }}
              title="ดูข้อมูลสิทธิและโปรไฟล์ผู้ใช้งาน"
            >
              <CheckCircle2 size={13} color="#34D399" />
              <span>ยืนยันสิทธิแล้ว</span>
            </Link>
          </div>

          {/* Main Card Body: Left (Primary Balance) & Right (Stacked Quota + Tokens) */}
          <div className="wallet-main-layout">
            {/* Left Column: Primary Simulated Balance */}
            <div className="wallet-balance-col">
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
              <div className="wallet-balance-amount" style={{ fontSize: 'clamp(32px, 5.5vw, 42px)', fontWeight: 800 }}>
                {showBalance ? `฿${userBalance.toFixed(2)}` : '฿ ••••••'}
              </div>
            </div>

            {/* Right Column: Quota & Tokens Stacked (ทางขวาแบ่งบนล่าง) */}
            <div className="wallet-right-col">
              {/* บน: สิทธิคนละครึ่งวันนี้ */}
              <div className="wallet-meta-card-item">
                <span className="wallet-meta-label">สิทธิคนละครึ่งวันนี้ (รัฐช่วย 60%)</span>
                <span className="wallet-meta-value" style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800 }}>
                  ฿{wallet?.dailyQuota || '150.00'} <span style={{ fontSize: 13, fontWeight: 500, opacity: 0.85 }}>/ วัน</span>
                </span>
              </div>

              {/* ล่าง: เหรียญ Impact Tokens สะสม */}
              <div className="wallet-meta-card-item">
                <span className="wallet-meta-label">เหรียญ Impact Tokens สะสม</span>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                  <span className="wallet-token-amount" style={{ fontSize: 'clamp(18px, 3.5vw, 22px)', fontWeight: 800, color: '#FBBF24' }}>
                    {tokens} <span className="wallet-token-unit" style={{ fontSize: 13, color: '#FEF3C7', opacity: 0.9 }}>เหรียญ</span>
                  </span>
                  <Link
                    to="/rewards"
                    style={{
                      fontSize: 12.5,
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
                      minHeight: 30,
                      whiteSpace: 'nowrap'
                    }}
                    title="ไปหน้าแลกของรางวัลและชิงโชค"
                  >
                    <span>แลกของรางวัล</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Action Row: Top-up button placed at the bottom-right (ขวาล่าง) */}
          <div className="wallet-bottom-action-row">
            <button
              type="button"
              className="btn-wallet-topup"
              onClick={() => (addBalance || resetBalance)(500)}
              title="เติมเงินจำลอง 500 บาทสำหรับการทดสอบระบบ"
              aria-label="เติมเงินจำลอง 500 บาท"
            >
              <PlusCircle size={18} />
              <span>เติมเงิน ฿500</span>
            </button>
          </div>
        </section>

        {/* ========================================================
            2. 2x2 SQUARE ACTION GRID (4 เหลี่ยมจัตุรัส)
            ======================================================== */}
        <div className="square-actions-grid" role="navigation" aria-label="เมนูบริการหลักของระบบ">
          {/* Card 1: Bingo Game 5x5 */}
          <Link
            to="/bingo"
            className="square-action-card card-bingo"
            aria-label="เกมบิงโกคนละครึ่ง 5x5 ทำภารกิจรับโบนัสโทเค็น"
          >
            <div>
              <div className="square-card-top">
                <div className="square-card-icon icon-blue">
                  <Grid size={22} />
                </div>
                <div className="square-pill-tag tag-blue">
                  <Sparkles size={11} />
                  <span>ภารกิจพิเศษ</span>
                </div>
              </div>

              <h2 className="square-card-title">
                เกมบิงโกคนละครึ่ง (5x5)
              </h2>
              <p className="square-card-desc">
                ช้อปปิ้งร้านค้าชุมชนหรือร่วมบริจาค ครบแถวรับ +20 โทเค็น
              </p>

              {/* Live Progress Bar */}
              <div className="square-card-progress-box">
                <div className="square-card-progress-meta">
                  <span>กระดานเดือนนี้: {completedCount}/{totalCount} ช่อง</span>
                  {bingoStats.bingos > 0 ? (
                    <span style={{ color: '#FDE047', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                      <Trophy size={11} />
                      <span>{bingoStats.bingos} บิงโก</span>
                    </span>
                  ) : (
                    <span>{progressPercent}%</span>
                  )}
                </div>
                <div className="square-card-progress-bar">
                  <div
                    className="square-card-progress-fill"
                    style={{ width: `${Math.max(5, progressPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="square-card-btn btn-blue">
              <span>เข้าเล่นเกมบิงโก</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Card 2: Co-Pay 60/40 Scan Pay */}
          <Link
            to="/payment"
            className="square-action-card card-scan"
            aria-label="สแกนจ่ายคนละครึ่ง 60/40 ร้านค้าชุมชน"
          >
            <div>
              <div className="square-card-top">
                <div className="square-card-icon icon-royal">
                  <QrCode size={22} strokeWidth={2.4} />
                </div>
                <div className="square-pill-tag tag-royal">
                  <span>คนละครึ่ง 60/40</span>
                </div>
              </div>

              <h2 className="square-card-title">
                สแกนจ่าย คนละครึ่ง
              </h2>
              <p className="square-card-desc">
                รัฐช่วยจ่าย 60% สูงสุด 150 บาท/วัน ประชาชนจ่าย 40% ที่ร้านค้าชุมชน
              </p>
              <div className="square-card-highlight text-royal">
                สิทธิวันนี้: ฿{wallet?.dailyQuota || '150.00'}/วัน
              </div>
            </div>

            <div className="square-card-btn btn-royal">
              <span>สแกนจ่าย</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Card 3: Thai Plus Rewards */}
          <Link
            to="/rewards"
            className="square-action-card card-rewards"
            aria-label="แลกของรางวัลและชิงโชค ไทยช่วยไทยพลัส"
          >
            <div>
              <div className="square-card-top">
                <div className="square-card-icon icon-gold">
                  <Gift size={22} strokeWidth={2.3} />
                </div>
                <div className="square-pill-tag tag-gold">
                  <span>ไทยช่วยไทยพลัส</span>
                </div>
              </div>

              <h2 className="square-card-title">
                แลกรางวัล & ลุ้นโชค
              </h2>
              <p className="square-card-desc">
                ใช้เหรียญ Impact Tokens แลกคูปองส่วนลดร้านค้า ลุ้นทองคำ และรางวัลใหญ่
              </p>
              <div className="square-card-highlight text-gold">
                มี {tokens} Impact Tokens
              </div>
            </div>

            <div className="square-card-btn btn-gold">
              <span>แลกรางวัล</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          {/* Card 4: Charities e-Donation */}
          <Link
            to="/charities"
            className="square-action-card card-charity"
            aria-label="ร่วมบริจาค e-Donation ลดหย่อนภาษี 2 เท่า"
          >
            <div>
              <div className="square-card-top">
                <div className="square-card-icon icon-cyan">
                  <HeartHandshake size={22} strokeWidth={2.3} />
                </div>
                <div className="square-pill-tag tag-cyan">
                  <span>ลดหย่อนภาษี 2 เท่า</span>
                </div>
              </div>

              <h2 className="square-card-title">
                บริจาค e-Donation
              </h2>
              <p className="square-card-desc">
                ร่วมสนับสนุนโรงพยาบาล โรงเรียน มูลนิธิ ลดหย่อนภาษีได้ทันทีผ่านระบบสรรพากร
              </p>
              <div className="square-card-highlight text-cyan">
                ลดหย่อนภาษีอัตโนมัติ
              </div>
            </div>

            <div className="square-card-btn btn-cyan">
              <span>ร่วมบริจาค</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
