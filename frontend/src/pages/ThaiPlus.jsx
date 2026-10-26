import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Coins,
  Gift,
  Ticket,
  Trophy,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Tag,
  ShieldCheck,
  ShoppingBag,
  RotateCw,
  QrCode,
  Copy,
  Check,
  Crown,
  Smartphone,
  Bike,
  Fuel,
  PartyPopper,
  Flame,
  Zap,
  Info
} from 'lucide-react';

export default function ThaiPlus() {
  const { user, tokens, setTokensBalance, deductTokens, addTokens } = useAuth();

  // Active Tab: 'LUCKY_DRAW' | 'REWARDS' | 'SPIN_WHEEL' | 'MY_ITEMS' | 'HISTORY'
  const [activeTab, setActiveTab] = useState('LUCKY_DRAW');

  // Rewards and campaign state
  const [rewards, setRewards] = useState([]);
  const [campaign, setCampaign] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [faucetLoading, setFaucetLoading] = useState(false);

  // Sub-filter for rewards tab ('ALL' | 'COUPON' | 'PHYSICAL')
  const [rewardFilter, setRewardFilter] = useState('ALL');

  // Lucky Draw Entry State
  const [selectedPackage, setSelectedPackage] = useState(1); // 1, 3, or 5 tickets
  const [enteringDraw, setEnteringDraw] = useState(false);
  const [drawSuccessData, setDrawSuccessData] = useState(null);

  // Reward Redemption State
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccessData, setRedeemSuccessData] = useState(null);

  // Spin Wheel State
  const [spinning, setSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [spinResult, setSpinResult] = useState(null);

  // User's Local Vouchers & Tickets
  const [myTickets, setMyTickets] = useState(() => {
    try {
      const saved = localStorage.getItem('user_thaiplus_tickets');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [myVouchers, setMyVouchers] = useState(() => {
    try {
      const saved = localStorage.getItem('user_thaiplus_vouchers');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Token Transaction History from API
  const [tokenHistory, setTokenHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Copied code feedback
  const [copiedCode, setCopiedCode] = useState(false);

  // Fetch initial rewards and campaign on mount
  useEffect(() => {
    fetchRewards();
  }, []);

  // Sync tickets & vouchers to localStorage
  useEffect(() => {
    localStorage.setItem('user_thaiplus_tickets', JSON.stringify(myTickets));
  }, [myTickets]);

  useEffect(() => {
    localStorage.setItem('user_thaiplus_vouchers', JSON.stringify(myVouchers));
  }, [myVouchers]);

  // Load history when switching to HISTORY tab
  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchTokenHistory();
    }
  }, [activeTab]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rewards');
      if (res.data && res.data.success) {
        setRewards(res.data.data.rewards);
        setCampaign(res.data.data.luckyDrawCampaign);
      }
    } catch (err) {
      console.error('Error fetching rewards:', err);
      setError('ไม่สามารถโหลดข้อมูลของรางวัลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const fetchTokenHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await api.get('/rewards/my-history');
      if (res.data && res.data.success) {
        setTokenHistory(res.data.data.history);
        if (res.data.data.totalTokens !== undefined) {
          setTokensBalance(res.data.data.totalTokens);
        }
      }
    } catch (err) {
      console.error('Error loading token history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Demo Faucet (+50 Tokens)
  const handleFaucetTokens = async () => {
    try {
      setFaucetLoading(true);
      const res = await api.post('/rewards/demo-faucet');
      if (res.data && res.data.success) {
        setTokensBalance(res.data.data.totalTokens);
      }
    } catch (err) {
      console.error('Faucet error:', err);
      // Fallback local update
      addTokens(50);
    } finally {
      setFaucetLoading(false);
    }
  };

  // Enter Lucky Draw
  const handleConfirmLuckyDraw = async () => {
    let cost = 20;
    if (selectedPackage === 3) cost = 50;
    if (selectedPackage === 5) cost = 80;

    if (tokens < cost) {
      alert(`Impact Tokens ของคุณไม่พอ (ต้องการ ${cost} Tokens แต่คุณมี ${tokens} Tokens) คุณสามารถกดรับโทเค็นจำลองฟรีได้`);
      return;
    }

    try {
      setEnteringDraw(true);
      const res = await api.post('/rewards/lucky-draw', {
        ticketsCount: selectedPackage,
        campaignId: campaign?.campaignId || 'LUCKY-2026-M10',
      });

      if (res.data && res.data.success) {
        const { tickets, remainingTokens, drawDate } = res.data.data;
        setTokensBalance(remainingTokens);

        const newTickets = tickets.map((t) => ({
          ...t,
          campaignTitle: campaign?.title || 'ไทยช่วยไทยพลัส สัญจรลุ้นโชคใหญ่',
          drawDate,
        }));

        setMyTickets((prev) => [...newTickets, ...prev]);
        setDrawSuccessData(res.data.data);
      } else {
        alert(res.data.error || 'เกิดข้อผิดพลาดในการลงชื่อชิงโชค');
      }
    } catch (err) {
      console.error('Error entering lucky draw:', err);
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาดในการส่งสิทธิ์ชิงโชค';
      alert(msg);
    } finally {
      setEnteringDraw(false);
    }
  };

  // Redeem Reward
  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;

    if (tokens < selectedReward.tokenCost) {
      alert(`Impact Tokens ของคุณไม่เพียงพอ (ต้องการ ${selectedReward.tokenCost} Tokens แต่คุณมี ${tokens} Tokens)`);
      return;
    }

    try {
      setRedeeming(true);
      const res = await api.post('/rewards/redeem', {
        rewardId: selectedReward.rewardId,
      });

      if (res.data && res.data.success) {
        const voucherData = res.data.data;
        setTokensBalance(voucherData.remainingTokens);

        const newVoucher = {
          ...voucherData,
          category: selectedReward.category,
          partner: selectedReward.partner,
        };

        setMyVouchers((prev) => [newVoucher, ...prev]);
        setRedeemSuccessData(newVoucher);
        setSelectedReward(null);
      } else {
        alert(res.data.error || 'เกิดข้อผิดพลาดในการแลกของรางวัล');
      }
    } catch (err) {
      console.error('Error redeeming reward:', err);
      const msg = err.response?.data?.error || 'ไม่สามารถแลกของรางวัลได้';
      alert(msg);
    } finally {
      setRedeeming(false);
    }
  };

  // Instant Spin Wheel
  const handleSpinWheel = async () => {
    if (spinning) return;
    const spinCost = 15;

    if (tokens < spinCost) {
      alert(`คุณต้องมีอย่างน้อย ${spinCost} Tokens เพื่อหมุนวงล้อเสี่ยงโชค (คุณมี ${tokens} Tokens)`);
      return;
    }

    try {
      setSpinning(true);
      setSpinResult(null);

      // Call API
      const res = await api.post('/rewards/instant-spin');
      if (res.data && res.data.success) {
        const { outcomeIndex, prize, remainingTokens } = res.data.data;

        // Calculate rotation degrees (6 sectors = 60 deg each)
        // Add 5 full rotations (1800 deg) + sector offset
        const sectorAngle = 60;
        const targetSectorCenter = outcomeIndex * sectorAngle + 30;
        const newRotation = wheelRotation + 1800 + (360 - (targetSectorCenter % 360));
        setWheelRotation(newRotation);

        // Wait 3.5s for spin animation to finish
        setTimeout(() => {
          setTokensBalance(remainingTokens);
          setSpinResult(prize);
          setSpinning(false);

          // If won lucky tickets or coupon, add to user's saved items
          if (prize.type === 'LUCKY_TICKETS') {
            const bonusTicket = {
              ticketNumber: 'TP-WHEEL-' + Math.floor(100000 + Math.random() * 900000),
              campaignTitle: 'รางวัลจากวงล้อเสี่ยงโชคไทยช่วยไทยพลัส',
              issuedAt: new Date().toISOString(),
              drawDate: '31 มีนาคม 2026',
            };
            setMyTickets((prev) => [bonusTicket, ...prev]);
          } else if (prize.type === 'COUPON') {
            const bonusVoucher = {
              rewardName: prize.label,
              rewardType: 'COUPON',
              voucherCode: 'TP-WHEEL-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
              barcodeNumber: '885' + Math.floor(100000000 + Math.random() * 900000000),
              redeemedAt: new Date().toISOString(),
              expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
              instructions: 'แสดงรหัสนี้เพื่อรับสิทธิพิเศษที่ร้านค้าชุมชนที่ร่วมรายการ',
            };
            setMyVouchers((prev) => [bonusVoucher, ...prev]);
          }
        }, 3600);
      } else {
        setSpinning(false);
        alert(res.data.error || 'หมุนวงล้อไม่สำเร็จ');
      }
    } catch (err) {
      setSpinning(false);
      console.error('Spin error:', err);
      const msg = err.response?.data?.error || 'เกิดข้อผิดพลาดในการหมุนวงล้อ';
      alert(msg);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const filteredRewards = rewards.filter((r) => {
    if (rewardFilter === 'ALL') return r.rewardType !== 'LUCKY_DRAW';
    return r.rewardType === rewardFilter;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* App Header */}
      <header className="app-header">
        <div className="header-brand">
          <Link
            to="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div className="header-logo" style={{ width: 34, height: 34, fontSize: 16 }}>
              <ArrowLeft size={18} />
            </div>
            <div>
              <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>ไทยช่วยไทยพลัส</span>
                <span
                  style={{
                    fontSize: 11,
                    background: '#F59E0B',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  PLUS
                </span>
              </div>
              <div className="header-tag">Token Rewards & Lucky Draw Platform</div>
            </div>
          </Link>
        </div>

        <div className="header-user">
          {/* Quick Nav Links */}
          <Link
            to="/payment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 999,
              color: '#1E40AF',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>ชำระเงิน (60/40)</span>
          </Link>

          <Link
            to="/charities"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 999,
              color: '#0F766E',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <span>ร่วมบริจาค</span>
          </Link>

          {/* Tokens Pill */}
          <div className="token-pill" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Coins size={16} />
            <span>{tokens} Tokens</span>
            <button
              type="button"
              onClick={handleFaucetTokens}
              disabled={faucetLoading}
              title="กดรับโทเค็นจำลอง 50 Tokens สำหรับทดสอบระบบ"
              style={{
                background: '#D97706',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 999,
                padding: '2px 8px',
                fontSize: 11,
                cursor: 'pointer',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <Zap size={10} />
              <span>+50 ฟรี</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="home-container" style={{ marginTop: 24 }}>
        {/* Hero Banner */}
        <div className="thaiplus-hero">
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(255,255,255,0.15)',
              padding: '4px 14px',
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            <Sparkles size={15} color="#FBBF24" />
            <span>สิทธิประโยชน์สุดพิเศษ เฉพาะผู้ถือ Impact Tokens</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
            ไทยช่วยไทยพลัส (Thai Chuay Thai Plus) 🎁
          </h1>
          <p style={{ fontSize: 15, opacity: 0.92, maxWidth: 740, lineHeight: 1.6 }}>
            ศูนย์รวมการใช้ <strong>Impact Tokens</strong> ที่สะสมจากการร่วมโครงการคนละครึ่งและการบริจาคเพื่อสังคม
            นำมา<strong>ลงชื่อชิงโชครางวัลใหญ่</strong> แลก<strong>คูปองส่วนลดร้านค้าชุมชน</strong> และ{' '}
            <strong>สินค้าพรีเมียมส่งตรงถึงบ้าน</strong>
          </p>
        </div>

        {/* Stats Grid */}
        <div className="thaiplus-stat-grid">
          {/* Card 1: Token Balance */}
          <div className="thaiplus-stat-card">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: '#FEF3C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#D97706',
              }}
            >
              <Coins size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ยอด Tokens ของคุณ</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#D97706' }}>{tokens} Tokens</div>
            </div>
          </div>

          {/* Card 2: Lucky Tickets Held */}
          <div className="thaiplus-stat-card">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: '#FEE2E2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#DC2626',
              }}
            >
              <Ticket size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>สิทธิ์ชิงโชคที่ถืออยู่</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#DC2626' }}>
                {myTickets.length} สิทธิ์
              </div>
            </div>
          </div>

          {/* Card 3: Redeemed Rewards */}
          <div className="thaiplus-stat-card">
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#2563EB',
              }}
            >
              <Gift size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>ของรางวัลที่แลกแล้ว</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: '#2563EB' }}>
                {myVouchers.length} รายการ
              </div>
            </div>
          </div>

          {/* Card 4: Faucet Action */}
          <div
            className="thaiplus-stat-card"
            style={{
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 100%)',
              border: '1px solid #A7F3D0',
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
              }}
            >
              <Zap size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#047857', fontWeight: 600 }}>โหมดทดสอบระบบ</div>
              <button
                type="button"
                onClick={handleFaucetTokens}
                disabled={faucetLoading}
                style={{
                  background: '#059669',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 6,
                  padding: '4px 10px',
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 2,
                }}
              >
                {faucetLoading ? 'กำลังเติม...' : '+ รับ 50 Tokens ฟรี'}
              </button>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="thaiplus-tabs">
          <button
            type="button"
            className={`thaiplus-tab-item ${activeTab === 'LUCKY_DRAW' ? 'active' : ''}`}
            onClick={() => setActiveTab('LUCKY_DRAW')}
          >
            <Ticket size={17} />
            <span>1. ลงชื่อชิงโชครางวัลใหญ่</span>
            <span
              style={{
                fontSize: 11,
                background: activeTab === 'LUCKY_DRAW' ? 'rgba(255,255,255,0.3)' : '#FEE2E2',
                color: activeTab === 'LUCKY_DRAW' ? '#fff' : '#DC2626',
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              ยอดนิยม 🔥
            </span>
          </button>

          <button
            type="button"
            className={`thaiplus-tab-item ${activeTab === 'REWARDS' ? 'active' : ''}`}
            onClick={() => setActiveTab('REWARDS')}
          >
            <Gift size={17} />
            <span>2. แลกของรางวัลไทยช่วยไทยพลัส</span>
          </button>

          <button
            type="button"
            className={`thaiplus-tab-item ${activeTab === 'SPIN_WHEEL' ? 'active' : ''}`}
            onClick={() => setActiveTab('SPIN_WHEEL')}
          >
            <RotateCw size={17} />
            <span>3. วงล้อเสี่ยงโชคจำลอง</span>
            <span
              style={{
                fontSize: 11,
                background: activeTab === 'SPIN_WHEEL' ? 'rgba(255,255,255,0.3)' : '#FEF3C7',
                color: activeTab === 'SPIN_WHEEL' ? '#fff' : '#D97706',
                padding: '1px 6px',
                borderRadius: 999,
              }}
            >
              มินิเกม
            </span>
          </button>

          <button
            type="button"
            className={`thaiplus-tab-item ${activeTab === 'MY_ITEMS' ? 'active' : ''}`}
            onClick={() => setActiveTab('MY_ITEMS')}
          >
            <ShoppingBag size={17} />
            <span>4. สิทธิ์และคูปองของฉัน ({myTickets.length + myVouchers.length})</span>
          </button>

          <button
            type="button"
            className={`thaiplus-tab-item ${activeTab === 'HISTORY' ? 'active' : ''}`}
            onClick={() => setActiveTab('HISTORY')}
          >
            <Clock size={17} />
            <span>5. ประวัติการใช้ Token</span>
          </button>
        </div>

        {/* ====================================================
            TAB 1: LUCKY DRAW (ลงชื่อชิงโชคของรางวัล)
            ==================================================== */}
        {activeTab === 'LUCKY_DRAW' && (
          <div>
            {/* Grand Campaign Showcase Card */}
            {campaign && (
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #FCD34D',
                  borderRadius: 'var(--radius-xl)',
                  padding: '30px 28px',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.12)',
                  marginBottom: 28,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Decorative Top Stripe */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 5,
                    background: 'linear-gradient(90deg, #F59E0B, #DC2626, #2563EB)',
                  }}
                />

                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 20 }}>
                  <div>
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        background: '#FEF3C7',
                        color: '#92400E',
                        padding: '4px 12px',
                        borderRadius: 999,
                        fontSize: 12.5,
                        fontWeight: 700,
                        marginBottom: 10,
                      }}
                    >
                      <Crown size={15} color="#D97706" />
                      <span>{campaign.title}</span>
                    </div>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
                      ชิงโชคทองคำแท่ง 1 บาท, iPhone 16 Pro และรถมอเตอร์ไซค์ไฟฟ้า 🛵
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
                      {campaign.subtitle} • จับรางวัล:{' '}
                      <strong style={{ color: '#DC2626' }}>{campaign.drawDate}</strong>
                    </p>
                  </div>

                  {/* Draw Countdown Badge */}
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1px solid #FDE68A',
                      padding: '10px 16px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'right',
                    }}
                  >
                    <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>สถานะรอบชิงโชค</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#92400E', display: 'flex', alignItems: 'center', gap: 5 }}>
                      <Clock size={15} />
                      <span>เปิดรับสิทธิ์ลุ้นโชค</span>
                    </div>
                  </div>
                </div>

                {/* Prizes Grid */}
                <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: '#334155' }}>
                  🏆 รายการของรางวัลใหญ่ประจำงวดนี้:
                </h4>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: 12,
                    marginBottom: 24,
                  }}
                >
                  {campaign.prizes.map((p, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          background: idx === 0 ? '#FEF3C7' : idx === 1 ? '#EFF6FF' : '#F1F5F9',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: idx === 0 ? '#D97706' : idx === 1 ? '#2563EB' : '#475569',
                          fontWeight: 700,
                          fontSize: 14,
                        }}
                      >
                        #{p.rank}
                      </div>
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-main)' }}>
                          {p.name}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                          มูลค่า {p.value} ({p.quantity} รางวัล)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Entry Action Area */}
                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                    borderRadius: 'var(--radius-lg)',
                    padding: 20,
                  }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>
                        เลือกแพ็กเกจส่งสิทธิ์ชิงโชค
                      </div>
                      <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
                        ใช้ Impact Tokens เพื่อรับสลากดิจิทัล (สุ่มหมายเลขและจัดเก็บอัตโนมัติ)
                      </div>
                    </div>

                    {/* Packages Selector */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {campaign.packages.map((pkg) => (
                        <button
                          key={pkg.tickets}
                          type="button"
                          onClick={() => setSelectedPackage(pkg.tickets)}
                          style={{
                            padding: '10px 16px',
                            borderRadius: 'var(--radius-md)',
                            border:
                              selectedPackage === pkg.tickets
                                ? '2px solid #2563EB'
                                : '1px solid #CBD5E1',
                            background: selectedPackage === pkg.tickets ? '#EFF6FF' : '#FFFFFF',
                            color: selectedPackage === pkg.tickets ? '#1E40AF' : '#334155',
                            fontWeight: 700,
                            fontSize: 13.5,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            position: 'relative',
                          }}
                        >
                          <div>{pkg.label}</div>
                          {pkg.badge && (
                            <span
                              style={{
                                display: 'block',
                                fontSize: 10,
                                color: '#D97706',
                                fontWeight: 600,
                              }}
                            >
                              {pkg.badge}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="button"
                      onClick={handleConfirmLuckyDraw}
                      disabled={enteringDraw}
                      style={{
                        background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 'var(--radius-md)',
                        padding: '12px 24px',
                        fontSize: 14.5,
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
                      }}
                    >
                      <Ticket size={18} />
                      <span>
                        {enteringDraw
                          ? 'กำลังลงชื่อ...'
                          : `ลงชื่อลุ้นโชค (${
                              selectedPackage === 1 ? 20 : selectedPackage === 3 ? 50 : 80
                            } Tokens)`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Specific Lucky Draw Items from Database */}
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Sparkles size={18} color="#D97706" />
              <span>หรือเลือกลงชื่อชิงโชคเฉพาะรายการของรางวัล:</span>
            </h3>

            <div className="rewards-grid">
              {rewards
                .filter((r) => r.rewardType === 'LUCKY_DRAW')
                .map((item) => (
                  <div key={item.rewardId} className="reward-card">
                    <div className="reward-card-header">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        {item.tag}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 700 }}>
                        <Coins size={15} />
                        <span>{item.tokenCost} Tokens / สิทธิ์</span>
                      </div>
                    </div>

                    <div className="reward-card-body">
                      <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
                        {item.name}
                      </h4>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {item.description}
                      </p>
                    </div>

                    <div className="reward-card-footer">
                      <span style={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                        ✓ สุ่มจับรางวัลสิ้นเดือน
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackage(1);
                          handleConfirmLuckyDraw();
                        }}
                        style={{
                          background: tokens >= item.tokenCost ? '#1E40AF' : '#94A3B8',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 14px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: tokens >= item.tokenCost ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <span>ส่ง 1 สิทธิ์</span>
                        <ArrowRight size={14} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 2: REDEEM REWARDS (ใช้ TOKEN แลกของ ไทยช่วยไทยพลัส)
            ==================================================== */}
        {activeTab === 'REWARDS' && (
          <div>
            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => setRewardFilter('ALL')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: rewardFilter === 'ALL' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  background: rewardFilter === 'ALL' ? '#EFF6FF' : '#FFFFFF',
                  color: rewardFilter === 'ALL' ? '#1E40AF' : '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                ทั้งหมด ({rewards.filter((r) => r.rewardType !== 'LUCKY_DRAW').length})
              </button>

              <button
                type="button"
                onClick={() => setRewardFilter('COUPON')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: rewardFilter === 'COUPON' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  background: rewardFilter === 'COUPON' ? '#EFF6FF' : '#FFFFFF',
                  color: rewardFilter === 'COUPON' ? '#1E40AF' : '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🏷️ คูปองส่วนลดร้านค้า (E-Coupons)
              </button>

              <button
                type="button"
                onClick={() => setRewardFilter('PHYSICAL')}
                style={{
                  padding: '7px 16px',
                  borderRadius: 999,
                  border: rewardFilter === 'PHYSICAL' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                  background: rewardFilter === 'PHYSICAL' ? '#EFF6FF' : '#FFFFFF',
                  color: rewardFilter === 'PHYSICAL' ? '#1E40AF' : '#475569',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                🎁 สินค้าพรีเมียมชุมชน (ส่งฟรีถึงบ้าน)
              </button>
            </div>

            {/* Rewards Cards Grid */}
            <div className="rewards-grid">
              {filteredRewards.map((reward) => {
                const canAfford = tokens >= reward.tokenCost;
                return (
                  <div key={reward.rewardId} className="reward-card">
                    <div className="reward-card-header">
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 999,
                          background:
                            reward.rewardType === 'PHYSICAL'
                              ? '#ECFDF5'
                              : '#EFF6FF',
                          color:
                            reward.rewardType === 'PHYSICAL'
                              ? '#047857'
                              : '#1E40AF',
                        }}
                      >
                        {reward.tag}
                      </span>

                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          color: '#D97706',
                          fontWeight: 800,
                          fontSize: 15,
                        }}
                      >
                        <Coins size={16} />
                        <span>{reward.tokenCost} Tokens</span>
                      </div>
                    </div>

                    <div className="reward-card-body">
                      <h4 style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--text-main)' }}>
                        {reward.name}
                      </h4>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>
                        {reward.description}
                      </p>
                      <div style={{ fontSize: 12, color: 'var(--text-light)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={14} color="#10B981" />
                        <span>{reward.partner}</span>
                      </div>
                    </div>

                    <div className="reward-card-footer">
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        สต็อก: เหลือ {reward.stock} ชิ้น
                      </span>

                      <button
                        type="button"
                        onClick={() => setSelectedReward(reward)}
                        style={{
                          background: canAfford ? '#059669' : '#94A3B8',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: 8,
                          padding: '8px 16px',
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: canAfford ? 'pointer' : 'not-allowed',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          boxShadow: canAfford ? '0 2px 6px rgba(5, 150, 105, 0.25)' : 'none',
                        }}
                      >
                        <Gift size={14} />
                        <span>{canAfford ? 'แลกรางวัล' : `ขาดอีก ${reward.tokenCost - tokens}`}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 3: INSTANT SPIN WHEEL (วงล้อเสี่ยงโชคจำลอง)
            ==================================================== */}
        {activeTab === 'SPIN_WHEEL' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px 24px',
              textAlign: 'center',
              boxShadow: 'var(--shadow-sm)',
              maxWidth: 680,
              margin: '0 auto',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                background: '#FEF3C7',
                color: '#B45309',
                padding: '4px 14px',
                borderRadius: 999,
                fontSize: 13,
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              <Flame size={15} color="#D97706" />
              <span>มินิเกมลุ้นโชคทันใจ</span>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              วงล้อเสี่ยงโชคไทยช่วยไทยพลัส 🎡
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>
              ใช้เพียง <strong>15 Impact Tokens</strong> ต่อการหมุน 1 ครั้ง ลุ้นรับโบนัสคืนสูงสุด 50 Tokens,
              คูปองเครื่องดื่มฟรี, หรือสิทธิ์ชิงโชคทองคำแท่ง!
            </p>

            {/* The Wheel Container */}
            <div style={{ position: 'relative', width: 280, height: 280, margin: '0 auto 28px' }}>
              <div className="spin-pointer" />
              <div
                className="spin-wheel"
                style={{
                  transform: `rotate(${wheelRotation}deg)`,
                  background:
                    'conic-gradient(#D97706 0deg 60deg, #2563EB 60deg 120deg, #DC2626 120deg 180deg, #059669 180deg 240deg, #7C3AED 240deg 300deg, #F59E0B 300deg 360deg)',
                }}
              >
                {/* Wheel Center Button */}
                <div
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 70,
                    height: 70,
                    borderRadius: '50%',
                    background: '#FFFFFF',
                    border: '4px solid #F59E0B',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: 13,
                    color: '#92400E',
                    zIndex: 10,
                  }}
                >
                  <Sparkles size={16} />
                  <span>SPIN</span>
                </div>
              </div>
            </div>

            {/* Spin Result Alert */}
            {spinResult && (
              <div
                style={{
                  background: '#ECFDF5',
                  border: '1px solid #A7F3D0',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  marginBottom: 20,
                  animation: 'fadeIn 0.3s ease-out',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#065F46', fontWeight: 700, fontSize: 16 }}>
                  <PartyPopper size={20} color="#10B981" />
                  <span>ยินดีด้วย! คุณได้รับ: {spinResult.label}</span>
                </div>
              </div>
            )}

            {/* Spin Action Button */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
              <button
                type="button"
                onClick={handleSpinWheel}
                disabled={spinning || tokens < 15}
                style={{
                  background:
                    tokens >= 15
                      ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                      : '#94A3B8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  padding: '14px 32px',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: tokens >= 15 && !spinning ? 'pointer' : 'not-allowed',
                  boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <RotateCw size={18} className={spinning ? 'animate-spin' : ''} />
                <span>{spinning ? 'กำลังหมุนวงล้อ...' : 'หมุนวงล้อเสี่ยงโชค (15 Tokens)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 4: MY ITEMS (สิทธิ์และคูปองของฉัน)
            ==================================================== */}
        {activeTab === 'MY_ITEMS' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 24 }}>
              {/* Left Column: My Lucky Tickets */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Ticket size={20} color="#DC2626" />
                  <span>สลากชิงโชคดิจิทัลของฉัน ({myTickets.length})</span>
                </h3>

                {myTickets.length === 0 ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px dashed #CBD5E1',
                      borderRadius: 'var(--radius-lg)',
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Ticket size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: 14, marginBottom: 12 }}>คุณยังไม่มีสิทธิ์ชิงโชคในรอบนี้</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('LUCKY_DRAW')}
                      style={{
                        background: '#DC2626',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ไปลงชื่อชิงโชคเลย
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {myTickets.map((t, idx) => (
                      <div key={idx} className="ticket-container">
                        <div>
                          <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                            {t.campaignTitle || 'ไทยช่วยไทยพลัส สัญจรลุ้นโชคใหญ่'}
                          </div>
                          <div className="ticket-number">{t.ticketNumber}</div>
                          <div style={{ fontSize: 11, color: '#78350F' }}>
                            จับรางวัล: {t.drawDate || '31 มีนาคม 2026'}
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#F59E0B',
                            color: '#FFFFFF',
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CheckCircle2 size={20} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: My Redeemed Vouchers */}
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Gift size={20} color="#2563EB" />
                  <span>คูปองและของรางวัลที่แลกแล้ว ({myVouchers.length})</span>
                </h3>

                {myVouchers.length === 0 ? (
                  <div
                    style={{
                      background: '#FFFFFF',
                      border: '1px dashed #CBD5E1',
                      borderRadius: 'var(--radius-lg)',
                      padding: 32,
                      textAlign: 'center',
                      color: 'var(--text-muted)',
                    }}
                  >
                    <Gift size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <p style={{ fontSize: 14, marginBottom: 12 }}>คุณยังไม่ได้แลกของรางวัลใดๆ</p>
                    <button
                      type="button"
                      onClick={() => setActiveTab('REWARDS')}
                      style={{
                        background: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: 6,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ไปเลือกแลกรางวัล
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {myVouchers.map((v, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid #E2E8F0',
                          borderRadius: 'var(--radius-lg)',
                          padding: 18,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 999,
                                background: '#EFF6FF',
                                color: '#1E40AF',
                              }}
                            >
                              {v.rewardType || 'COUPON'}
                            </span>
                            <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginTop: 4 }}>
                              {v.rewardName}
                            </h4>
                          </div>

                          <button
                            type="button"
                            onClick={() => setRedeemSuccessData(v)}
                            style={{
                              background: '#F1F5F9',
                              border: '1px solid #CBD5E1',
                              borderRadius: 6,
                              padding: '4px 10px',
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            <QrCode size={13} />
                            <span>ดู QR/บาร์โค้ด</span>
                          </button>
                        </div>

                        <div
                          style={{
                            background: '#F8FAFC',
                            padding: '8px 12px',
                            borderRadius: 6,
                            fontFamily: 'monospace',
                            fontSize: 14,
                            fontWeight: 700,
                            letterSpacing: 1,
                            color: '#1E40AF',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span>รหัส: {v.voucherCode}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(v.voucherCode)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#64748B' }}
                            title="คัดลอกรหัส"
                          >
                            <Copy size={14} />
                          </button>
                        </div>

                        <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                          แลกเมื่อ: {new Date(v.redeemedAt).toLocaleDateString('th-TH')} • หมดอายุ:{' '}
                          {new Date(v.expiresAt).toLocaleDateString('th-TH')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ====================================================
            TAB 5: TOKEN TRANSACTION HISTORY
            ==================================================== */}
        {activeTab === 'HISTORY' && (
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-xl)',
              padding: 24,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-main)' }}>
                  ประวัติการได้รับและการใช้ Impact Tokens
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  รายการเคลื่อนไหว Token ทั้งหมดที่ผูกกับบัญชีของคุณ
                </p>
              </div>

              <button
                type="button"
                onClick={fetchTokenHistory}
                style={{
                  background: '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 8,
                  padding: '6px 12px',
                  fontSize: 13,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <RotateCw size={14} />
                <span>รีเฟรช</span>
              </button>
            </div>

            {historyLoading ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                กำลังโหลดประวัติโทเค็น...
              </div>
            ) : tokenHistory.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                ยังไม่มีประวัติการทำรายการโทเค็น
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {tokenHistory.map((item) => {
                  const isPositive = item.amount > 0;
                  return (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: '50%',
                            background: isPositive ? '#ECFDF5' : '#FEE2E2',
                            color: isPositive ? '#059669' : '#DC2626',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Coins size={18} />
                        </div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)' }}>
                            {item.description}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                            {new Date(item.createdAt).toLocaleString('th-TH')} • ประเภท: {item.type}
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: isPositive ? '#059669' : '#DC2626',
                        }}
                      >
                        {isPositive ? `+${item.amount}` : item.amount} Tokens
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ====================================================
          MODAL 1: CONFIRM REWARD REDEMPTION
          ==================================================== */}
      {selectedReward && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440 }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, color: 'var(--text-main)' }}>
              ยืนยันการแลกของรางวัล
            </h3>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginBottom: 20 }}>
              กรุณาตรวจสอบรายละเอียดก่อนทำการหัก Impact Tokens
            </p>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-lg)',
                padding: 16,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-main)', marginBottom: 4 }}>
                {selectedReward.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
                {selectedReward.description}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed #CBD5E1', paddingTop: 10, fontSize: 14 }}>
                <span>จำนวน Tokens ที่ใช้:</span>
                <strong style={{ color: '#D97706' }}>{selectedReward.tokenCost} Tokens</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                <span>ยอด Tokens คงเหลือหลังแลก:</span>
                <span>{tokens - selectedReward.tokenCost} Tokens</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid #CBD5E1',
                  background: '#FFFFFF',
                  color: '#475569',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                ยกเลิก
              </button>

              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                style={{
                  flex: 1,
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#059669',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {redeeming ? 'กำลังแลก...' : 'ยืนยันแลกรางวัล'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: REDEEM SUCCESS & DIGITAL VOUCHER
          ==================================================== */}
      {redeemSuccessData && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#ECFDF5',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <PartyPopper size={30} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                แลกของรางวัลสำเร็จ!
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                บันทึกลงกระเป๋าสิทธิ์ของคุณเรียบร้อยแล้ว
              </p>
            </div>

            {/* Digital Voucher Presentation */}
            <div className="digital-voucher-box">
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 999,
                  background: '#EFF6FF',
                  color: '#1E40AF',
                }}
              >
                บัตรกำนัลดิจิทัล (Digital Voucher)
              </span>

              <h4 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-main)', marginTop: 8, marginBottom: 4 }}>
                {redeemSuccessData.rewardName}
              </h4>

              {/* Barcode Simulation */}
              <div className="barcode-sim">
                |||| || |||||| | |||||
              </div>

              <div
                style={{
                  fontFamily: 'monospace',
                  fontSize: 17,
                  fontWeight: 800,
                  letterSpacing: 2,
                  color: '#1E40AF',
                  marginBottom: 10,
                }}
              >
                {redeemSuccessData.voucherCode}
              </div>

              <button
                type="button"
                onClick={() => copyToClipboard(redeemSuccessData.voucherCode)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  background: copiedCode ? '#ECFDF5' : '#F1F5F9',
                  border: '1px solid #CBD5E1',
                  borderRadius: 6,
                  padding: '5px 12px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: copiedCode ? '#059669' : '#334155',
                  cursor: 'pointer',
                  marginBottom: 12,
                }}
              >
                {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedCode ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัสคูปอง'}</span>
              </button>

              <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {redeemSuccessData.instructions}
              </div>

              <div style={{ fontSize: 11, color: 'var(--text-light)', marginTop: 8 }}>
                ใช้ได้ถึงวันที่:{' '}
                {new Date(redeemSuccessData.expiresAt).toLocaleDateString('th-TH', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={() => setRedeemSuccessData(null)}
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: '#2563EB',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                รับทราบ และปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 3: LUCKY DRAW SUCCESS (สลากชิงโชค)
          ==================================================== */}
      {drawSuccessData && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 460 }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: '#FEF3C7',
                  color: '#D97706',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 10px',
                }}
              >
                <Crown size={30} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-main)' }}>
                ลงชื่อชิงโชคสำเร็จ! 🎉
              </h3>
              <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
                ได้รับสิทธิ์ลุ้นรางวัลทั้งหมด {drawSuccessData.ticketsCount} สิทธิ์
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {drawSuccessData.tickets.map((t, idx) => (
                <div key={idx} className="ticket-container">
                  <div>
                    <div style={{ fontSize: 11, color: '#B45309', fontWeight: 600 }}>
                      ตั๋วดิจิทัลใบที่ {idx + 1}
                    </div>
                    <div className="ticket-number">{t.ticketNumber}</div>
                  </div>
                  <Ticket size={24} color="#D97706" />
                </div>
              ))}
            </div>

            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: 12,
                fontSize: 12.5,
                color: 'var(--text-muted)',
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              📅 <strong>กำหนดการสุ่มจับรางวัล:</strong> {drawSuccessData.drawDate}
              <br />
              📢 ระบบจะแจ้งเตือนผลการจับรางวัลผ่านแอปพลิเคชันและบันทึกประวัติให้คุณทราบ
            </div>

            <button
              type="button"
              onClick={() => setDrawSuccessData(null)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: '#DC2626',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              เสร็จสิ้น
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
