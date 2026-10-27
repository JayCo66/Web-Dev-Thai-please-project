import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Grid,
  Trophy,
  Sparkles,
  Coins,
  Wallet,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Zap,
  Compass,
  CreditCard,
  HeartHandshake,
  PartyPopper,
  Flame,
  Info,
  Calendar,
  Layers,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Play
} from 'lucide-react';

export default function Bingo() {
  const { user, tokens, wallet, setTokensBalance } = useAuth();

  const [boardsSummary, setBoardsSummary] = useState([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);     // The single board that is currently ACTIVE
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);   // The board the user is currently looking at
  const [currentBoard, setCurrentBoard] = useState(null);
  const [monthName, setMonthName] = useState('ตุลาคม 2569');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [highlightedLinePositions, setHighlightedLinePositions] = useState([]);
  const [bingoCelebration, setBingoCelebration] = useState(null);
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'IN_PROGRESS' | 'COMPLETED'

  // Fetch active board on mount or when changing viewed board
  useEffect(() => {
    fetchBoardData(selectedViewIndex);
  }, [selectedViewIndex]);

  const fetchBoardData = async (viewIndex = 0) => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/quests/active-board?boardIndex=${viewIndex}`);
      if (res.data && res.data.success) {
        const d = res.data.data;
        setCurrentBoard(d.currentBoard);
        setBoardsSummary(d.boardsSummary || []);
        setActiveBoardIndex(d.activeBoardIndex ?? 0);
        setSelectedViewIndex(d.selectedBoardIndex ?? viewIndex);
        if (d.monthName) setMonthName(d.monthName);
        if (d.userTokens !== undefined) {
          setTokensBalance(d.userTokens);
        }
      } else {
        setError(res.data.error || 'ไม่สามารถโหลดข้อมูลกระดานบิงโกได้');
      }
    } catch (err) {
      console.error('Error fetching bingo board:', err);
      setError('เกิดข้อผิดพลาดในการโหลดกระดานบิงโก');
    } finally {
      setLoading(false);
    }
  };

  // Switch which board to VIEW
  const handleSelectTab = (index) => {
    if (index === selectedViewIndex) return;
    setSelectedCell(null);
    setSelectedViewIndex(index);
  };

  // Enforce Single Active Board: Set chosen board as the ONLY ACTIVE board
  const handleSetActiveBoard = async (targetIndex) => {
    try {
      setActionLoading(true);
      const res = await api.post('/quests/set-active', { boardIndex: targetIndex });
      if (res.data && res.data.success) {
        setActiveBoardIndex(res.data.data.activeBoardIndex);
        setBoardsSummary(res.data.data.boardsSummary);
        setCurrentBoard(res.data.data.currentBoard);
      } else {
        alert(res.data.error || 'ไม่สามารถเปิดใช้งานตารางได้');
      }
    } catch (err) {
      console.error('Set active error:', err);
      alert('เกิดข้อผิดพลาดในการเปิดใช้งานตาราง');
    } finally {
      setActionLoading(false);
    }
  };

  // Progress a cell (interactive simulator)
  const handleProgressCell = async (position, markComplete = false) => {
    try {
      setActionLoading(true);
      const res = await api.post('/quests/progress', {
        position,
        increment: 1,
        markComplete,
        boardIndex: selectedViewIndex,
      });

      if (res.data && res.data.success) {
        const { cell, isBingo, bingoBonusTokens, newBingoLinesCount, userTokens, boardLines } = res.data.data;

        // Update cell in current board
        setCurrentBoard((prev) => {
          if (!prev) return prev;
          const updatedCells = prev.cells.map((c) => (c.position === cell.position ? cell : c));
          return {
            ...prev,
            cells: updatedCells,
            lines: boardLines || prev.lines,
            bingoCount: newBingoLinesCount ?? prev.bingoCount,
          };
        });

        // Update selected modal cell
        setSelectedCell(cell);

        // Update token balance
        if (userTokens !== undefined) {
          setTokensBalance(userTokens);
        }

        // Update summary of current board in boardsSummary
        setBoardsSummary((prev) =>
          prev.map((b) =>
            b.boardIndex === selectedViewIndex
              ? {
                  ...b,
                  completedCells: (currentBoard?.cells || []).filter((c) =>
                    c.position === cell.position ? cell.status === 'COMPLETED' : c.status === 'COMPLETED'
                  ).length,
                  bingoCount: newBingoLinesCount ?? b.bingoCount,
                }
              : b
          )
        );

        // Trigger BINGO celebration if a new line was achieved
        if (isBingo && bingoBonusTokens > 0) {
          setBingoCelebration({
            linesCount: newBingoLinesCount,
            bonusTokens: bingoBonusTokens,
          });
        }
      } else {
        alert(res.data.error || 'ไม่สามารถอัปเดตภารกิจได้');
      }
    } catch (err) {
      console.error('Progress error:', err);
      alert('เกิดข้อผิดพลาดในการบันทึกความคืบหน้า');
    } finally {
      setActionLoading(false);
    }
  };

  // Helper for family visual styling
  const getFamilyConfig = (family) => {
    switch (family) {
      case 'ACTIVITY':
        return {
          label: 'กิจกรรมการใช้จ่าย',
          badgeClass: 'badge-family-activity',
          color: '#3B82F6',
          bgLight: '#EFF6FF',
          icon: <Zap size={14} />,
        };
      case 'VARIETY':
        return {
          label: 'ความหลากหลายร้านค้า',
          badgeClass: 'badge-family-variety',
          color: '#8B5CF6',
          bgLight: '#F5F3FF',
          icon: <Compass size={14} />,
        };
      case 'TIME':
        return {
          label: 'ช่วงเวลา / วันพิเศษ',
          badgeClass: 'badge-family-time',
          color: '#F59E0B',
          bgLight: '#FFFBEB',
          icon: <Clock size={14} />,
        };
      case 'SPEND':
        return {
          label: 'ยอดใช้จ่ายสะสม',
          badgeClass: 'badge-family-spend',
          color: '#10B981',
          bgLight: '#ECFDF5',
          icon: <CreditCard size={14} />,
        };
      case 'DONATION':
        return {
          label: 'บริจาคเพื่อสังคม (ศูนย์กลาง)',
          badgeClass: 'badge-family-donation',
          color: '#E11D48',
          bgLight: '#FFF1F2',
          icon: <HeartHandshake size={14} />,
        };
      default:
        return {
          label: 'ภารกิจทั่วไป',
          badgeClass: 'badge-family-activity',
          color: '#64748B',
          bgLight: '#F8FAFC',
          icon: <Grid size={14} />,
        };
    }
  };

  const getLevelStars = (level) => {
    if (!level) return null;
    return '★'.repeat(level);
  };

  const completedCellsCount = currentBoard?.cells?.filter((c) => c.status === 'COMPLETED').length || 0;
  const progressPercent = Math.round((completedCellsCount / 25) * 100);
  const isViewingActive = selectedViewIndex === activeBoardIndex;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
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
                <span>ภารกิจบิงโก 5x5 (4 ตารางประจำเดือน)</span>
                <span
                  style={{
                    fontSize: 11,
                    background: '#3B82F6',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontWeight: 700,
                  }}
                >
                  {monthName}
                </span>
              </div>
              <div className="header-tag">Personalized Mission Boards by Typhoon AI Engine</div>
            </div>
          </Link>
        </div>

        <div className="header-user">
          {/* Quick Navigation Links */}
          <Link
            to="/payment"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#EFF6FF',
              border: '1px solid #BFDBFE',
              borderRadius: 999,
              color: '#1E40AF',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <CreditCard size={15} />
            <span>ชำระเงิน (60/40)</span>
          </Link>

          <Link
            to="/charities"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#F0FDFA',
              border: '1px solid #99F6E4',
              borderRadius: 999,
              color: '#0F766E',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <HeartHandshake size={15} />
            <span>ร่วมบริจาค</span>
          </Link>

          <Link
            to="/plus"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              background: '#FEF3C7',
              border: '1px solid #FDE68A',
              borderRadius: 999,
              color: '#92400E',
              fontSize: 13,
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <span>ไทยช่วยไทยพลัส</span>
          </Link>

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
        </div>
      </header>

      {/* Main Container */}
      <main className="home-container" style={{ marginTop: 24 }}>
        {/* Hero Banner */}
        <div className="bingo-hero">
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
              marginBottom: 12,
            }}
          >
            <Sparkles size={14} color="#FBBF24" />
            <span>ภารกิจประจำเดือน {monthName} (โหลด 4 ตารางถาวรสำหรับประชาชน ตารางละ 25 ช่อง)</span>
          </div>

          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>
            {currentBoard?.title || 'กระดานภารกิจบิงโก 5x5 สำหรับประชาชน 🎯'}
          </h1>
          <p style={{ fontSize: 14.5, opacity: 0.92, maxWidth: 840, lineHeight: 1.6, marginBottom: 18 }}>
            กฎกติกาโครงการ: <strong>สามารถ Active เพื่อบันทึกภารกิจได้ทีละ 1 ตาราง</strong> โดยระบบจะตรวจจับความคืบหน้าอัตโนมัติจากการชำระเงินคนละครึ่ง
            และการร่วมบริจาคผ่าน e-Donation ลงในตารางที่กำลัง Active อยู่เท่านั้น ยิ่งพิชิตเรียงแถวเป็นแนวเส้น ยิ่งได้รับ <strong>โบนัสพิเศษ +100 Tokens ต่อเส้น</strong>
          </p>

          {/* Metadata Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={15} color="#34D399" />
              <span>
                ตารางที่ ACTIVE ปัจจุบัน: <strong>{boardsSummary[activeBoardIndex]?.title?.split(':')[0] || 'ตารางที่ 1'}</strong> (บันทึกแต้มลงตารางนี้)
              </span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={15} color="#FDE047" />
              <span>Budget รวม 24 ช่อง: <strong>63 ระดับ</strong></span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.12)', padding: '6px 14px', borderRadius: 8, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <HeartHandshake size={15} color="#F43F5E" />
              <span>ช่องกึ่งกลาง: <strong>บริจาคใจฟู (DONATION) ตรวจจับจากระบบจริง</strong></span>
            </div>
          </div>
        </div>

        {/* ====================================================
            4 MONTHLY BOARDS SELECTOR TABS
            ==================================================== */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={17} color="#4F46E5" />
              <span>เลือกดูตารางภารกิจประจำเดือน {monthName} (4 ตาราง):</span>
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              คลิกเพื่อดูรายละเอียดแต่ละตาราง และสลับตารางที่ Active ได้
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {boardsSummary.map((b) => {
              const isSelectedView = b.boardIndex === selectedViewIndex;
              const isCurrentActive = b.boardIndex === activeBoardIndex;

              return (
                <button
                  key={b.boardIndex}
                  type="button"
                  onClick={() => handleSelectTab(b.boardIndex)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-lg)',
                    border: isSelectedView
                      ? '2px solid #4F46E5'
                      : isCurrentActive
                      ? '2px solid #10B981'
                      : '1px solid var(--border)',
                    background: isSelectedView ? '#EEF2FF' : isCurrentActive ? '#F0FDF4' : '#FFFFFF',
                    boxShadow: isSelectedView ? '0 6px 18px rgba(79, 70, 229, 0.18)' : 'var(--shadow-sm)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  {/* Top line indicator */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: isCurrentActive ? '#10B981' : isSelectedView ? '#4F46E5' : 'transparent',
                    }}
                  />

                  {/* Header Row: Title & Active Badge */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: isSelectedView ? '#4338CA' : 'var(--text)' }}>
                      {b.title.split(':')[0]}
                    </div>
                    {isCurrentActive ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#DCFCE7',
                          color: '#166534',
                          border: '1px solid #86EFAC',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                        }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }} />
                        ACTIVE
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: 999,
                          background: '#F1F5F9',
                          color: '#64748B',
                        }}
                      >
                        ACCEPTED
                      </span>
                    )}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--text-muted)',
                      marginBottom: 10,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={b.subtitle}
                  >
                    {b.subtitle || b.title.split(':')[1]}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, fontWeight: 700 }}>
                    <span style={{ color: b.bingoCount > 0 ? '#D97706' : '#94A3B8', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Trophy size={13} />
                      <span>{b.bingoCount} เส้นบิงโก</span>
                    </span>
                    <span style={{ color: isCurrentActive ? '#15803D' : '#64748B' }}>
                      {b.completedCells}/25 ช่อง ({b.progressPercent}%)
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ====================================================
            ACTIVE / STANDBY STATUS BANNER
            ==================================================== */}
        {isViewingActive ? (
          <div
            style={{
              background: '#F0FDF4',
              border: '1px solid #86EFAC',
              borderRadius: 'var(--radius-lg)',
              padding: '12px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#16A34A', boxShadow: '0 0 0 4px rgba(22, 163, 74, 0.2)' }} />
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#166534' }}>
                  🟢 ตารางนี้กำลัง ACTIVE (ตารางที่ {activeBoardIndex + 1}): ระบบกำลังบันทึกความคืบหน้าลงตารางนี้
                </div>
                <div style={{ fontSize: 12.5, color: '#15803D' }}>
                  ทุกการชำระเงินคนละครึ่งและการร่วมบริจาคจะถูกตรวจจับและบันทึกความคืบหน้าลงในตารางนี้โดยอัตโนมัติ
                </div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#166534', background: '#DCFCE7', padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap' }}>
              กำลังทำงาน (Active)
            </div>
          </div>
        ) : (
          <div
            style={{
              background: '#FFFBEB',
              border: '1px solid #FCD34D',
              borderRadius: 'var(--radius-lg)',
              padding: '14px 20px',
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: '#FEF3C7',
                  color: '#B45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14, color: '#92400E' }}>
                  ตารางนี้อยู่ในสถานะ "รอเปิดใช้งาน (ACCEPTED)"
                </div>
                <div style={{ fontSize: 12.5, color: '#B45309' }}>
                  ตามกติกาโครงการ <strong>สามารถ Active ได้ทีละ 1 ตาราง</strong> (ขณะนี้กำลัง Active ที่: <strong>{boardsSummary[activeBoardIndex]?.title?.split(':')[0]}</strong>)
                  หากต้องการทำภารกิจของตารางนี้ กรุณากดปุ่มเปิดใช้งานด้านขวา
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSetActiveBoard(selectedViewIndex)}
              disabled={actionLoading}
              style={{
                background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 'var(--radius-md)',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
              }}
            >
              <Zap size={15} />
              <span>เปิดใช้งานตารางนี้ (Set as Active)</span>
            </button>
          </div>
        )}

        {/* Board Dashboard Stats Bar */}
        <div
          style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            marginBottom: 24,
            boxShadow: 'var(--shadow-sm)',
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
          }}
        >
          {/* Stat 1: Completed Quests Progress */}
          <div style={{ minWidth: 200, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, fontWeight: 700, marginBottom: 6 }}>
              <span>ภารกิจสำเร็จใน {currentBoard?.title?.split(':')[0] || 'ตารางปัจจุบัน'}</span>
              <span style={{ color: '#10B981' }}>{completedCellsCount} / 25 ช่อง ({progressPercent}%)</span>
            </div>
            <div className="bingo-progress-container" style={{ height: 8 }}>
              <div className="bingo-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>

          {/* Stat 2: Bingo Lines Count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trophy size={24} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>แถวบิงโกที่ทำได้</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#D97706' }}>
                {currentBoard?.bingoCount || 0} / 12 แถว
              </div>
            </div>
          </div>

          {/* Direct Actions */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link
              to="/payment"
              style={{
                background: '#1E40AF',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <CreditCard size={15} />
              <span>ไปใช้จ่ายคนละครึ่ง</span>
            </Link>

            <Link
              to="/charities"
              style={{
                background: '#059669',
                color: '#FFFFFF',
                borderRadius: 'var(--radius-md)',
                padding: '10px 18px',
                fontSize: 13,
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <HeartHandshake size={15} />
              <span>ร่วมบริจาค (พิชิตช่องกลาง)</span>
            </Link>
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilterMode('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                border: filterMode === 'ALL' ? '1px solid #3B82F6' : '1px solid var(--border)',
                background: filterMode === 'ALL' ? '#EFF6FF' : '#FFFFFF',
                color: filterMode === 'ALL' ? '#1D4ED8' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              ทั้งหมด (25 ช่อง)
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('IN_PROGRESS')}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                border: filterMode === 'IN_PROGRESS' ? '1px solid #F59E0B' : '1px solid var(--border)',
                background: filterMode === 'IN_PROGRESS' ? '#FFFBEB' : '#FFFFFF',
                color: filterMode === 'IN_PROGRESS' ? '#B45309' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              กำลังทำ ({25 - completedCellsCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterMode('COMPLETED')}
              style={{
                padding: '6px 14px',
                borderRadius: 999,
                fontSize: 12.5,
                fontWeight: 600,
                border: filterMode === 'COMPLETED' ? '1px solid #10B981' : '1px solid var(--border)',
                background: filterMode === 'COMPLETED' ? '#ECFDF5' : '#FFFFFF',
                color: filterMode === 'COMPLETED' ? '#047857' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              สำเร็จแล้ว ({completedCellsCount})
            </button>
          </div>

          <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            คลิกที่ช่องเพื่อดูเหตุผลจาก AI หรือทดสอบความคืบหน้า
          </div>
        </div>

        {/* ====================================================
            5x5 BINGO GRID & SIDEBAR
            ==================================================== */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <div className="animate-spin" style={{ display: 'inline-block', marginBottom: 12 }}>
              <Grid size={32} color="#3B82F6" />
            </div>
            <div>กำลังโหลดกระดานภารกิจบิงโก 5x5...</div>
          </div>
        ) : error ? (
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', padding: 20, borderRadius: 12, textAlign: 'center' }}>
            <p style={{ fontWeight: 700, marginBottom: 8 }}>{error}</p>
            <button
              type="button"
              onClick={() => fetchBoardData(selectedViewIndex)}
              style={{ background: '#DC2626', color: '#FFFFFF', padding: '8px 16px', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 24, alignItems: 'start', marginBottom: 40 }}>
            {/* Left: 5x5 Grid */}
            <div className="bingo-grid-5x5">
              {currentBoard?.cells?.map((cell) => {
                const isCenter = cell.position === 12;
                const isCompleted = cell.status === 'COMPLETED';
                const isHighlighted = highlightedLinePositions.includes(cell.position);
                const familyCfg = getFamilyConfig(cell.family);
                const percent = Math.min(100, Math.round((cell.progress / cell.target_value) * 100));

                return (
                  <div
                    key={cell.position}
                    className={`bingo-cell ${isCompleted ? 'completed' : ''} ${isCenter ? 'center-donation' : ''} ${isHighlighted ? 'highlighted-line' : ''}`}
                    onClick={() => setSelectedCell(cell)}
                    title={`ตำแหน่ง [${cell.row + 1}, ${cell.col + 1}]: ${cell.title}`}
                  >
                    {/* Header Row: Position + Level/Category */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                      <span className="bingo-cell-position">
                        {cell.row + 1},{cell.col + 1}
                      </span>

                      {isCenter ? (
                        <span className="badge-family-donation" style={{ fontSize: 10, padding: '2px 6px' }}>
                          DONATION
                        </span>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span className={familyCfg.badgeClass} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                            {cell.family}
                          </span>
                          <span className="bingo-cell-level" title={`ระดับความยาก ${cell.level}/3`}>
                            {getLevelStars(cell.level)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Cell Icon + Title */}
                    <div style={{ textAlign: 'center', margin: '4px 0' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: isCompleted ? '#DCFCE7' : familyCfg.bgLight,
                          color: isCompleted ? '#15803D' : familyCfg.color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 4,
                        }}
                      >
                        {isCompleted ? <CheckCircle2 size={18} /> : familyCfg.icon}
                      </div>

                      <div className="bingo-cell-title" style={{ fontWeight: isCenter ? 800 : 700 }}>
                        {cell.title}
                      </div>
                    </div>

                    {/* Progress Bar in Cell */}
                    <div style={{ width: '100%', marginTop: 'auto' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
                        <span>{cell.progress}/{cell.target_value} {cell.unit}</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="bingo-progress-container">
                        <div
                          className="bingo-progress-fill"
                          style={{
                            width: `${percent}%`,
                            background: isCompleted ? '#10B981' : familyCfg.color,
                          }}
                        />
                      </div>
                    </div>

                    {/* Footer: Token Reward */}
                    <div className="bingo-cell-reward">
                      <Coins size={11} color="#D97706" />
                      <span>+{cell.token_reward} Tokens</span>
                    </div>

                    {/* Completed Overlay Banner */}
                    {isCompleted && (
                      <div className="completed-badge-ribbon">
                        <Check size={11} /> สำเร็จแล้ว
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right: Bingo Lines Status Tracker */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xl)',
                padding: '20px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, margin: 0 }}>
                  <Trophy size={18} color="#D97706" />
                  <span>เส้นบิงโก 12 แนว (แถวละ +100 Tokens)</span>
                </h3>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                ชี้เมาส์ที่แถวเพื่อไฮไลต์ตำแหน่งช่องบนกระดาน 5x5 โดยช่องกึ่งกลาง (บริจาคใจฟู) ตัดผ่านถึง 4 แนวเส้น!
              </p>

              {/* Lines list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
                {currentBoard?.lines?.map((line) => {
                  const isCompleted = line.isCompleted;
                  return (
                    <div
                      key={line.id}
                      onMouseEnter={() => setHighlightedLinePositions(line.positions)}
                      onMouseLeave={() => setHighlightedLinePositions([])}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: isCompleted ? '1px solid #86EFAC' : '1px solid var(--border)',
                        background: isCompleted ? '#F0FDF4' : '#FAFAFA',
                        transition: 'all 0.15s ease',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: 4,
                              background: isCompleted ? '#22C55E' : '#E2E8F0',
                              color: isCompleted ? '#FFFFFF' : '#475569',
                            }}
                          >
                            {line.id}
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: isCompleted ? '#15803D' : 'var(--text)' }}>
                            {line.name}
                          </span>
                        </div>

                        {isCompleted ? (
                          <span style={{ fontSize: 11, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Check size={13} /> สำเร็จ! (+100)
                          </span>
                        ) : (
                          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>
                            {line.completedCount} / 5 ช่อง
                          </span>
                        )}
                      </div>

                      {/* Line Progress Bar */}
                      <div className="bingo-progress-container" style={{ height: 5 }}>
                        <div
                          className="bingo-progress-fill"
                          style={{
                            width: `${line.progressPercent}%`,
                            background: isCompleted ? '#22C55E' : '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Bonus Explanation */}
              <div
                style={{
                  marginTop: 16,
                  padding: 12,
                  background: '#FEF3C7',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#92400E',
                  lineHeight: 1.5,
                }}
              >
                <strong>💡 เคล็ดลับบิงโก:</strong> พิชิตช่องใจกลาง (ตำแหน่ง 12) จะช่วยให้คุณทำแนวบิงโกแถวนอนที่ 3, แถวตั้งที่ 3, และแนวทแยงทั้ง 2 เส้นได้พร้อมกัน!
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ====================================================
          MODAL 1: CELL DETAILS & PROGRESS
          ==================================================== */}
      {selectedCell && (
        <div className="modal-backdrop" onClick={() => setSelectedCell(null)}>
          <div className="modal-card" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={getFamilyConfig(selectedCell.family).badgeClass} style={{ fontSize: 12 }}>
                  {selectedCell.family}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  ช่องที่ {selectedCell.position + 1} (แถว {selectedCell.row + 1}, คอลัมน์ {selectedCell.col + 1})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Title & Level */}
            <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{selectedCell.title}</span>
            </h2>

            {/* Token Reward Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <div className="token-pill" style={{ background: '#FEF3C7', color: '#92400E', borderColor: '#FDE68A' }}>
                <Coins size={15} color="#D97706" />
                <span>รางวัลสำเร็จช่องนี้: +{selectedCell.token_reward} Impact Tokens</span>
              </div>
              {selectedCell.level && (
                <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>
                  ระดับความท้าทาย {selectedCell.level}/3
                </span>
              )}
            </div>

            {/* AI Reasoning / Justification */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Sparkles size={14} color="#6366F1" />
                <span>ที่มาและเหตุผลจาก AI (Typhoon AI v2.5):</span>
              </div>
              <p style={{ fontSize: 13.5, color: '#1E293B', margin: 0, lineHeight: 1.5 }}>
                {selectedCell.reason || 'ภารกิจที่ออกแบบตามพฤติกรรมการใช้งานจริงเพื่อความคุ้มค่าสูงสุด'}
              </p>
            </div>

            {/* Real-time system check info */}
            {selectedCell.family === 'DONATION' || selectedCell.position === 12 ? (
              <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#166534', fontSize: 13, marginBottom: 2 }}>
                  ❤️ ตรวจภารกิจอัตโนมัติจากประวัติการบริจาคจริง (e-Donation)
                </div>
                <p style={{ fontSize: 12.5, color: '#15803D', margin: 0 }}>
                  ระบบเชื่อมต่อกับฐานข้อมูลการบริจาค เมื่อคุณบริจาคผ่านหน้าร่วมบริจาค ช่องนี้จะสำเร็จโดยอัตโนมัติ (เฉพาะในตารางที่ Active)
                </p>
              </div>
            ) : (
              <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '12px 14px', borderRadius: 10, marginBottom: 16 }}>
                <div style={{ fontWeight: 700, color: '#1E40AF', fontSize: 13, marginBottom: 2 }}>
                  💳 ตรวจภารกิจอัตโนมัติจากการชำระเงินคนละครึ่ง
                </div>
                <p style={{ fontSize: 12.5, color: '#1E3A8A', margin: 0 }}>
                  ระบบเชื่อมต่อกับประวัติธุรกรรมการใช้จ่ายจริงที่ร้านค้า เมื่อมียอดใช้จ่ายตรงตามเงื่อนไข ช่องนี้จะอัปเดตทันที (เฉพาะในตารางที่ Active)
                </p>
              </div>
            )}

            {/* Current Progress Indicator */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <span>ความคืบหน้าปัจจุบัน</span>
                <span style={{ color: selectedCell.status === 'COMPLETED' ? '#10B981' : '#3B82F6' }}>
                  {selectedCell.progress} / {selectedCell.target_value} {selectedCell.unit} (
                  {Math.min(100, Math.round((selectedCell.progress / selectedCell.target_value) * 100))}%)
                </span>
              </div>
              <div className="bingo-progress-container" style={{ height: 8 }}>
                <div
                  className="bingo-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((selectedCell.progress / selectedCell.target_value) * 100))}%`,
                    background: selectedCell.status === 'COMPLETED' ? '#10B981' : undefined,
                  }}
                />
              </div>
            </div>

            {/* Real Application Link Buttons */}
            {selectedCell.position === 12 || selectedCell.family === 'DONATION' ? (
              <Link
                to="/charities"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  marginBottom: 12,
                }}
              >
                <HeartHandshake size={18} />
                <span>ไปร่วมบริจาคที่หน้ามูลนิธิทันที (e-Donation)</span>
              </Link>
            ) : (
              <Link
                to="/payment"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14,
                  textDecoration: 'none',
                  marginBottom: 12,
                }}
              >
                <CreditCard size={18} />
                <span>ไปใช้จ่ายคนละครึ่งที่ร้านค้า</span>
              </Link>
            )}

            {/* Interactive Simulation / Demo Action Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px dashed #CBD5E1', paddingTop: 14 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-muted)' }}>
                สำหรับจำลองและทดสอบระบบ (Simulation):
              </div>
              {selectedCell.status === 'COMPLETED' ? (
                <div
                  style={{
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    color: '#065F46',
                    padding: 10,
                    borderRadius: 'var(--radius-md)',
                    textAlign: 'center',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>ภารกิจนี้สำเร็จเรียบร้อยแล้ว</span>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleProgressCell(selectedCell.position, false)}
                    disabled={actionLoading}
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: '#334155',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Zap size={14} color="#F59E0B" />
                    <span>+1 {selectedCell.unit} (จำลอง)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProgressCell(selectedCell.position, true)}
                    disabled={actionLoading}
                    style={{
                      padding: 10,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: '#10B981',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 4,
                    }}
                  >
                    <Check size={14} />
                    <span>สำเร็จ 100% (จำลอง)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: BINGO LINE CELEBRATION!
          ==================================================== */}
      {bingoCelebration && (
        <div className="modal-backdrop">
          <div className="modal-card" style={{ maxWidth: 440, textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <PartyPopper size={36} />
            </div>

            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#92400E', marginBottom: 4 }}>
              BINGO! พิชิตแถวสำเร็จ! 🎉
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 20 }}>
              ยินดีด้วย! คุณทำภารกิจเชื่อมโยงครบ 5 ช่องเป็นแนวเส้นสำเร็จ
            </p>

            <div
              style={{
                background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)',
                border: '2px dashed #F59E0B',
                borderRadius: 'var(--radius-lg)',
                padding: 20,
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 13, color: '#B45309', fontWeight: 600 }}>โบนัสแถวบิงโก</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '6px 0' }}>
                <Coins size={28} />
                <span>+{bingoCelebration.bonusTokens} Tokens</span>
              </div>
              <div style={{ fontSize: 12, color: '#78350F' }}>
                ยอดรวมแถวบิงโกที่ทำได้ทั้งหมด: {bingoCelebration.linesCount} เส้น
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBingoCelebration(null)}
              style={{
                width: '100%',
                padding: 12,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: '#1E40AF',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
              }}
            >
              รับรางวัล และเล่นต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
