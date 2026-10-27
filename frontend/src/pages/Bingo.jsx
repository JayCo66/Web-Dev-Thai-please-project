import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import Navbar from '../components/Navbar';
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
    return `ระดับ ${level}`;
  };

  const getShortQuestTitle = (cell) => {
    if (!cell) return '';
    if (cell.position === 12 || cell.family === 'DONATION' || cell.quest_code === 'DONATION') {
      return 'บริจาคเพื่อสังคม';
    }

    if (cell.short_title) return cell.short_title;

    let s = cell.title || '';
    s = s.replace(/\s+/g, ' ').trim();

    // 1. หมวดอาหารและเครื่องดื่ม
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มต่างร้าน/g, 'อาหารต่างร้าน');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มตอนเช้า/g, 'อาหารมื้อเช้า');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มมื้อกลางวัน/g, 'อาหารกลางวัน');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มช่วงบ่าย/g, 'อาหารช่วงบ่าย');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มใน/g, 'อาหาร');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มรวมครบ/g, 'อาหารรวม');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่ม/g, 'หมวดอาหาร');
    s = s.replace(/จ่ายครั้งเดียวหมวดอาหารและเครื่องดื่มมูลค่าตั้งแต่/g, 'บิลอาหาร');

    // 2. หมวดสินค้าทั่วไป
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปต่างร้าน/g, 'สินค้าต่างร้าน');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปวันธรรมดา/g, 'สินค้าวันธรรมดา');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปใน/g, 'สินค้า');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปรวมครบ/g, 'สินค้ารวม');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไป/g, 'สินค้าทั่วไป');
    s = s.replace(/จ่ายครั้งเดียวหมวดสินค้าทั่วไปมูลค่าตั้งแต่/g, 'บิลสินค้า');

    // 3. ร้านเดิม / ร้านใหม่ / ต่างร้าน
    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำในหมวดอาหารและเครื่องดื่ม/g, 'ร้านอาหารเดิม');
    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำในหมวดสินค้าทั่วไป/g, 'ร้านสินค้าเดิม');
    s = s.replace(/ใช้จ่ายร้านเดิมวันเสาร์-อาทิตย์ซ้ำ/g, 'ร้านเดิม ส.-อา.');
    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำ/g, 'ร้านเดิมซ้ำ');
    s = s.replace(/ลองใช้จ่ายร้านที่ไม่เคยไปมาก่อน/g, 'ลองร้านใหม่');
    s = s.replace(/ใช้จ่ายต่างร้าน/g, 'ต่างร้าน');
    s = s.replace(/ใช้จ่ายร้านเดียวรวมครบ/g, 'ร้านเดียวรวม');

    // 4. เวลา / วัน
    s = s.replace(/ใช้จ่ายช่วงเช้า/g, 'ช่วงเช้า');
    s = s.replace(/ใช้จ่ายช่วงกลางวัน/g, 'มื้อกลางวัน');
    s = s.replace(/ใช้จ่ายช่วงบ่าย/g, 'ช่วงบ่าย');
    s = s.replace(/ใช้จ่ายวันเสาร์-อาทิตย์/g, 'เสาร์-อาทิตย์');
    s = s.replace(/ใช้จ่ายวันธรรมดา/g, 'วันธรรมดา');
    s = s.replace(/ใช้จ่ายวันศุกร์/g, 'วันศุกร์');
    s = s.replace(/ใช้จ่ายติดต่อกัน/g, 'ติดต่อกัน');

    // 5. ยอดเงิน / ทั่วไป
    s = s.replace(/ใช้จ่ายรวมครบ/g, 'ยอดรวม');
    s = s.replace(/จ่ายครั้งเดียวมูลค่าตั้งแต่/g, 'บิลเดียว');
    s = s.replace(/ใช้จ่ายครบ/g, 'ใช้จ่ายครบ');

    // 6. คำฟุ่มเฟือย
    s = s.replace(/วันที่ต่างกัน/g, 'วันต่างกัน');

    return s.trim();
  };

  const completedCellsCount = currentBoard?.cells?.filter((c) => c.status === 'COMPLETED').length || 0;
  const progressPercent = Math.round((completedCellsCount / 25) * 100);
  const isViewingActive = selectedViewIndex === activeBoardIndex;

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Official App Header */}
      <Navbar />

      {/* Main Container */}
      <main className="home-container">
        {/* Sub-navigation breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0 8px', flexWrap: 'wrap', gap: 10 }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--bank-royal)',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <ArrowLeft size={16} />
            <span>กลับสู่หน้าหลัก</span>
          </Link>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Calendar size={14} color="var(--bank-royal)" />
            <span>ภารกิจประจำงวด: <strong>{monthName}</strong></span>
          </div>
        </div>

        {/* Simple Game Hero */}
        <div className="bingo-hero" style={{ padding: '22px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#FDE68A', marginBottom: 6 }}>
            <Sparkles size={14} color="#FBBF24" />
            <span>ภารกิจคนละครึ่งประจำงวด {monthName}</span>
          </div>
          <h1 style={{ fontSize: 'clamp(20px, 3.5vw, 26px)', fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF' }}>
            เกมกระดานบิงโก 5x5
          </h1>
          <p style={{ fontSize: 13.5, opacity: 0.9, margin: 0, maxWidth: 680, lineHeight: 1.5 }}>
            ทำภารกิจให้สำเร็จครบ 5 ช่องในแนวเดียวกัน (แนวนอน, แนวตั้ง หรือแนวทแยง) จะได้ <strong>บิงโก!</strong> รับโบนัสแถวละ <strong>+100 โทเค็น</strong>
          </p>
        </div>

        {/* Simple 4-Board Selector */}
        <div className="bingo-tabs-bar">
          {boardsSummary.map((b) => {
            const isSelected = b.boardIndex === selectedViewIndex;
            const isActive = b.boardIndex === activeBoardIndex;
            return (
              <button
                key={b.boardIndex}
                type="button"
                className={`bingo-tab-btn ${isSelected ? 'selected' : ''} ${isActive ? 'active-board' : ''}`}
                onClick={() => handleSelectTab(b.boardIndex)}
              >
                <div className="bingo-tab-title">
                  {b.title?.split(':')[0] || `กระดานที่ ${b.boardIndex + 1}`}
                </div>
                <div className="bingo-tab-subtitle">
                  {isActive ? 'กำลังเล่นอยู่' : `${b.completedCells || 0}/25 ช่อง`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Notice when viewing inactive board */}
        {!isViewingActive && (
          <div className="bingo-inactive-notice">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={18} color="#D97706" />
              <span>คุณกำลังดูกระดานที่ {selectedViewIndex + 1} (ระบบกำลังบันทึกความคืบหน้าที่: <strong>{boardsSummary[activeBoardIndex]?.title?.split(':')[0] || 'กระดานที่ 1'}</strong>)</span>
            </div>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: 13, background: 'var(--bank-royal)', width: 'auto' }}
              onClick={() => handleSetActiveBoard(selectedViewIndex)}
              disabled={actionLoading}
            >
              <Zap size={14} />
              <span>สลับมาเล่นกระดานนี้</span>
            </button>
          </div>
        )}

        {/* Scoreboard */}
        <div className="bingo-scoreboard">
          <div className="scoreboard-card">
            <div className="scoreboard-icon">
              <Trophy size={24} />
            </div>
            <div>
              <div className="scoreboard-label">เส้นบิงโกที่ทำได้</div>
              <div className="scoreboard-value">{currentBoard?.bingoCount || 0} / 12 เส้น</div>
              <div className="scoreboard-sub">รับโบนัสเส้นละ +100 โทเค็น</div>
            </div>
          </div>

          <div className="scoreboard-card">
            <div className="scoreboard-icon" style={{ background: '#ECFDF5', color: '#059669' }}>
              <CheckCircle2 size={24} />
            </div>
            <div style={{ flex: 1 }}>
              <div className="scoreboard-label">ภารกิจที่สำเร็จแล้ว</div>
              <div className="scoreboard-value" style={{ color: '#059669' }}>{completedCellsCount} / 25 ช่อง</div>
              <div className="bingo-progress-container" style={{ height: 6, marginTop: 4 }}>
                <div className="bingo-progress-fill" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Direct Action Links */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
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
            <span>ร่วมบริจาค (ช่องกลาง FREE)</span>
          </Link>
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
          <div className="bingo-layout-grid">
            {/* Authentic BINGO Board Card */}
            <div className="bingo-board-wrapper">
              {/* B - I - N - G - O Top Letter Columns */}
              <div className="bingo-header-letters">
                <div className="bingo-letter-badge bingo-letter-b">B</div>
                <div className="bingo-letter-badge bingo-letter-i">I</div>
                <div className="bingo-letter-badge bingo-letter-n">N</div>
                <div className="bingo-letter-badge bingo-letter-g">G</div>
                <div className="bingo-letter-badge bingo-letter-o">O</div>
              </div>

              {/* 5x5 Game Tiles */}
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
                      {/* FREE space badge for center */}
                      {isCenter && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 4,
                            right: 4,
                            fontSize: 9,
                            fontWeight: 900,
                            background: '#FEF3C7',
                            color: '#B45309',
                            padding: '1px 5px',
                            borderRadius: 4,
                            border: '1px solid #FDE68A',
                            letterSpacing: '0.5px'
                          }}
                        >
                          FREE
                        </div>
                      )}

                      {/* Header Row: Position + Level/Category */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                        <span className="bingo-cell-position">
                          {cell.row + 1},{cell.col + 1}
                        </span>

                        <div className="bingo-cell-extra">
                          {!isCenter && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <span className={familyCfg.badgeClass} style={{ fontSize: 9.5, padding: '1px 5px' }}>
                                {cell.family}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Cell Icon + Title */}
                      <div style={{ textAlign: 'center', margin: '3px 0' }}>
                        <div
                          className="bingo-cell-icon-box"
                          style={{
                            background: isCompleted ? '#DCFCE7' : familyCfg.bgLight,
                            color: isCompleted ? '#15803D' : familyCfg.color,
                          }}
                        >
                          {isCompleted ? <CheckCircle2 size={18} /> : familyCfg.icon}
                        </div>

                        <div className="bingo-cell-title" style={{ fontWeight: isCenter ? 800 : 700 }}>
                          {getShortQuestTitle(cell)}
                        </div>
                      </div>

                      {/* Progress Bar in Cell */}
                      <div style={{ width: '100%', marginTop: 'auto' }}>
                        <div className="bingo-cell-progress-stats" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 2 }}>
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
                        <span>+{cell.token_reward}</span>
                      </div>

                      {/* Authentic Bingo Dabber Stamp (Stamp Effect) */}
                      {isCompleted && (
                        <div className="bingo-stamp-dab">
                          <Check size={12} strokeWidth={3} />
                          <span>สำเร็จ</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
                  <span>ความคืบหน้า 12 เส้นบิงโก</span>
                </h3>
              </div>

              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16, lineHeight: 1.5 }}>
                แตะหรือชี้ที่แถวเพื่อดูตำแหน่งบนกระดาน โดยช่องกึ่งกลาง (FREE) เชื่อมต่อถึง 4 แนวเส้นพร้อมกัน!
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
                  border: '1px solid #FDE68A',
                  borderRadius: 10,
                  fontSize: 12,
                  color: '#92400E',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
                  <Info size={14} />
                  <span>คำแนะนำการพิชิตบิงโก:</span>
                </div>
                <span>พิชิตช่องใจกลาง (ตำแหน่ง 12) จะช่วยให้คุณทำแนวบิงโกแถวนอนที่ 3, แถวตั้งที่ 3, และแนวทแยงทั้ง 2 เส้นได้พร้อมกัน</span>
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

            {/* Simple Mission Description */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
                marginBottom: 16,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="#3B82F6" />
                <span>รายละเอียดภารกิจ:</span>
              </div>
              <p style={{ fontSize: 13.5, color: '#1E293B', margin: 0, lineHeight: 1.5 }}>
                {selectedCell.reason || 'ทำภารกิจจากการใช้จ่ายหรือร่วมบริจาคเพื่อสะสมช่องบิงโก'}
              </p>
            </div>

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

            <h2 style={{ fontSize: 24, fontWeight: 900, color: '#92400E', marginBottom: 4 }}>
              BINGO! พิชิตแถวสำเร็จ
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
