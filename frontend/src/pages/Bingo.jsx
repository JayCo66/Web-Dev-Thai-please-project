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
  CreditCard,
  HeartHandshake,
  PartyPopper,
  Info,
  Calendar,
  Check,
  X,
  AlertCircle,
  HelpCircle,
  Utensils,
  Store,
  List,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  QrCode,
  RotateCcw,
  ShieldCheck
} from 'lucide-react';

export default function Bingo() {
  const { user, tokens, wallet, setTokensBalance } = useAuth();

  const [boardsSummary, setBoardsSummary] = useState([]);
  const [activeBoardIndex, setActiveBoardIndex] = useState(0);     // The single board currently ACTIVE
  const [selectedViewIndex, setSelectedViewIndex] = useState(0);   // The board the user is currently viewing
  const [currentBoard, setCurrentBoard] = useState(null);
  const [monthName, setMonthName] = useState('ตุลาคม 2569');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCell, setSelectedCell] = useState(null);
  const [inspectedCell, setInspectedCell] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [highlightedLinePositions, setHighlightedLinePositions] = useState([]);
  const [activeLineId, setActiveLineId] = useState(null);
  const [bingoCelebration, setBingoCelebration] = useState(null);
  const [showLinesModal, setShowLinesModal] = useState(false);

  // UX Toggles for Non-Tech / Elderly simplicity (Remembers preference in localStorage)
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [viewMode, setViewMode] = useState(() => {
    try {
      const saved = localStorage.getItem('bingo_preferred_view');
      if (saved === 'GRID' || saved === 'LIST') return saved;
    } catch {
      // ignore
    }
    return 'GRID';
  });
  const [filterMode, setFilterMode] = useState('ALL'); // 'ALL' | 'IN_PROGRESS' | 'COMPLETED'

  const handleSetViewMode = (mode) => {
    setViewMode(mode);
    try {
      localStorage.setItem('bingo_preferred_view', mode);
    } catch {
      // ignore
    }
  };

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
    setHighlightedLinePositions([]);
    setActiveLineId(null);
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

  // Sync inspected cell with currentBoard data (default to center FREE tile or first incomplete cell)
  useEffect(() => {
    if (!currentBoard?.cells?.length) return;
    setInspectedCell((prev) => {
      if (!prev) {
        const center = currentBoard.cells.find((c) => c.position === 12);
        const incomplete = currentBoard.cells.find((c) => c.status !== 'COMPLETED');
        return center || incomplete || currentBoard.cells[0];
      }
      const found = currentBoard.cells.find((c) => c.position === prev.position);
      return found || prev;
    });
  }, [currentBoard]);

  // Navigate through cells in the Live Inspector (Ergonomic Senior-Friendly Stepper)
  const handleStepCell = (delta) => {
    if (!currentBoard?.cells?.length || !inspectedCell) return;
    const currentPos = inspectedCell.position;
    const newPos = (currentPos + delta + 25) % 25;
    const nextCell = currentBoard.cells.find((c) => c.position === newPos);
    if (nextCell) {
      setInspectedCell(nextCell);
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

        // Update selected modal cell & inspected cell
        setSelectedCell(cell);
        setInspectedCell(cell);

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

  // Toggle highlight for a line on touch or click
  const handleToggleLineHighlight = (line) => {
    if (activeLineId === line.id) {
      setActiveLineId(null);
      setHighlightedLinePositions([]);
    } else {
      setActiveLineId(line.id);
      setHighlightedLinePositions(line.positions);
      if (viewMode === 'LIST') {
        setViewMode('GRID');
      }
    }
  };

  // Clear highlight
  const handleClearHighlight = () => {
    setActiveLineId(null);
    setHighlightedLinePositions([]);
  };

  // Family visual configuration (Matching Home brand colors & clean icons)
  const getFamilyConfig = (family) => {
    switch (family) {
      case 'ACTIVITY':
        return {
          label: 'หมวดอาหารและของใช้',
          badgeClass: 'badge-family-activity',
          color: '#1D4ED8',
          bgLight: '#EFF6FF',
          icon: <Utensils size={15} />,
        };
      case 'VARIETY':
        return {
          label: 'ร้านค้าหลากหลาย',
          badgeClass: 'badge-family-variety',
          color: '#0284C7',
          bgLight: '#E0F2FE',
          icon: <Store size={15} />,
        };
      case 'TIME':
        return {
          label: 'ช่วงเวลาและวันพิเศษ',
          badgeClass: 'badge-family-time',
          color: '#D97706',
          bgLight: '#FFFBEB',
          icon: <Clock size={15} />,
        };
      case 'SPEND':
        return {
          label: 'ยอดใช้จ่ายสะสม',
          badgeClass: 'badge-family-spend',
          color: '#059669',
          bgLight: '#ECFDF5',
          icon: <CreditCard size={15} />,
        };
      case 'DONATION':
        return {
          label: 'ร่วมบริจาคเพื่อสังคม (FREE)',
          badgeClass: 'badge-family-donation',
          color: '#DC2626',
          bgLight: '#FFF1F2',
          icon: <HeartHandshake size={15} />,
        };
      default:
        return {
          label: 'ภารกิจทั่วไป',
          badgeClass: 'badge-family-activity',
          color: '#1D4ED8',
          bgLight: '#EFF6FF',
          icon: <Grid size={15} />,
        };
    }
  };

  // Concise titles for compact phone tiles
  const getShortQuestTitle = (cell) => {
    if (!cell) return '';
    if (cell.position === 12 || cell.family === 'DONATION' || cell.quest_code === 'DONATION') {
      return 'FREE ร่วมบริจาค';
    }

    if (cell.short_title) return cell.short_title;

    let s = cell.title || '';
    s = s.replace(/\s+/g, ' ').trim();

    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มต่างร้าน/g, 'อาหารต่างร้าน');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มตอนเช้า/g, 'อาหารมื้อเช้า');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มมื้อกลางวัน/g, 'อาหารกลางวัน');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มช่วงบ่าย/g, 'อาหารช่วงบ่าย');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มใน/g, 'อาหาร');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่มรวมครบ/g, 'อาหารรวม');
    s = s.replace(/ใช้จ่ายหมวดอาหารและเครื่องดื่ม/g, 'หมวดอาหาร');
    s = s.replace(/จ่ายครั้งเดียวหมวดอาหารและเครื่องดื่มมูลค่าตั้งแต่/g, 'บิลอาหาร');

    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปต่างร้าน/g, 'สินค้าต่างร้าน');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปวันธรรมดา/g, 'สินค้าวันธรรมดา');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปใน/g, 'สินค้า');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไปรวมครบ/g, 'สินค้ารวม');
    s = s.replace(/ใช้จ่ายหมวดสินค้าทั่วไป/g, 'สินค้าทั่วไป');
    s = s.replace(/จ่ายครั้งเดียวหมวดสินค้าทั่วไปมูลค่าตั้งแต่/g, 'บิลสินค้า');

    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำในหมวดอาหารและเครื่องดื่ม/g, 'ร้านอาหารเดิม');
    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำในหมวดสินค้าทั่วไป/g, 'ร้านสินค้าเดิม');
    s = s.replace(/ใช้จ่ายร้านเดิมวันเสาร์-อาทิตย์ซ้ำ/g, 'ร้านเดิม ส.-อา.');
    s = s.replace(/ใช้จ่ายร้านเดิมซ้ำ/g, 'ร้านเดิมซ้ำ');
    s = s.replace(/ลองใช้จ่ายร้านที่ไม่เคยไปมาก่อน/g, 'ลองร้านใหม่');
    s = s.replace(/ใช้จ่ายต่างร้าน/g, 'ต่างร้าน');
    s = s.replace(/ใช้จ่ายร้านเดียวรวมครบ/g, 'ร้านเดียวรวม');

    s = s.replace(/ใช้จ่ายช่วงเช้า/g, 'ช่วงเช้า');
    s = s.replace(/ใช้จ่ายช่วงกลางวัน/g, 'มื้อกลางวัน');
    s = s.replace(/ใช้จ่ายช่วงบ่าย/g, 'ช่วงบ่าย');
    s = s.replace(/ใช้จ่ายวันเสาร์-อาทิตย์/g, 'เสาร์-อาทิตย์');
    s = s.replace(/ใช้จ่ายวันธรรมดา/g, 'วันธรรมดา');
    s = s.replace(/ใช้จ่ายวันศุกร์/g, 'วันศุกร์');
    s = s.replace(/ใช้จ่ายติดต่อกัน/g, 'ติดต่อกัน');

    s = s.replace(/ใช้จ่ายรวมครบ/g, 'ยอดรวม');
    s = s.replace(/จ่ายครั้งเดียวมูลค่าตั้งแต่/g, 'บิลเดียว');
    s = s.replace(/ใช้จ่ายครบ/g, 'ใช้จ่ายครบ');
    s = s.replace(/วันที่ต่างกัน/g, 'วันต่างกัน');

    return s.trim();
  };

  // Convert row, col to authentic B-I-N-G-O coordinates (e.g. B1, N3)
  const getCellCoordinate = (col, row) => {
    const letters = ['B', 'I', 'N', 'G', 'O'];
    return `${letters[col] || ''}${row + 1}`;
  };

  const completedCellsCount = currentBoard?.cells?.filter((c) => c.status === 'COMPLETED').length || 0;
  const progressPercent = Math.round((completedCellsCount / 25) * 100);
  const isViewingActive = selectedViewIndex === activeBoardIndex;

  // Filtered cells for accessible list view
  const filteredCells = (currentBoard?.cells || []).filter((c) => {
    if (filterMode === 'COMPLETED') return c.status === 'COMPLETED';
    if (filterMode === 'IN_PROGRESS') return c.status !== 'COMPLETED';
    return true;
  });

  return (
    <div style={{ minHeight: '100dvh', width: '100%', maxWidth: '100vw', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Official Top App Header & Mobile Navigation Dock */}
      <Navbar />

      {/* Main Banking App Shell (Using Home Page Container) */}
      <main className="home-container" id="main-content" style={{ width: '100%', maxWidth: 1040, boxSizing: 'border-box' }}>
        {/* Navigation Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0 8px', flexWrap: 'wrap', gap: 8 }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              color: 'var(--bank-royal)',
              textDecoration: 'none',
              fontSize: 13.5,
              fontWeight: 700,
              minHeight: 44,
              padding: '4px 6px',
              borderRadius: 'var(--radius-xs)',
              touchAction: 'manipulation'
            }}
          >
            <ArrowLeft size={18} />
            <span>กลับสู่หน้าหลัก</span>
          </Link>

          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text-secondary)' }}>
            <Calendar size={14} color="var(--bank-royal)" />
            <span>ภารกิจประจำงวด: <strong>{monthName}</strong></span>
          </div>
        </div>

        {/* ========================================================
            1. SIGNATURE FINANCIAL WALLET / BINGO CARD (From Home Style)
            ======================================================== */}
        <section className="financial-wallet-card" aria-label="บัตรภารกิจเกมบิงโก">
          {/* Top Row: Identity & Trust Badge */}
          <div className="wallet-card-top">
            <div className="wallet-badge">
              <Sparkles size={15} color="#FDE047" />
              <span>ภารกิจคนละครึ่ง 60/40 ประจำงวด</span>
            </div>
            <div className="wallet-security-seal" style={{ color: '#FDE047' }}>
              <Calendar size={13} color="#FDE047" />
              <span>{monthName}</span>
            </div>
          </div>

          {/* Bingo Main Title & Subtitle */}
          <div style={{ marginBottom: 16 }}>
            <h1 style={{ fontSize: 'clamp(20px, 4.5vw, 26px)', fontWeight: 800, margin: '0 0 6px 0', color: '#FFFFFF', lineHeight: 1.25 }}>
              เกมกระดานบิงโก 5x5
            </h1>
            <p style={{ fontSize: 13, color: '#CBD5E1', margin: 0, lineHeight: 1.45, maxWidth: 640 }}>
              ช้อปปิ้งร้านค้าชุมชนหรือร่วมบริจาค สำเร็จแต่ละช่องรับ +2 ถึง +10 โทเค็น และเรียงครบแถวรับโบนัส <strong style={{ color: '#FDE047' }}>+20 โทเค็น</strong> ทันที
            </p>
          </div>

          {/* Live Progress Box (Exact styling from Home dashboard-bingo-card) */}
          <div className="dashboard-bingo-progress-box" style={{ marginBottom: 16 }}>
            <div className="dashboard-bingo-progress-meta">
              <span>ความคืบหน้ากระดานนี้: {completedCellsCount} / 25 ช่อง ({progressPercent}%)</span>
              <button
                type="button"
                onClick={() => setShowLinesModal(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.16)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: 'var(--radius-full)',
                  padding: '3px 10px',
                  color: '#FDE047',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  fontWeight: 700,
                  fontSize: 12.5,
                  cursor: 'pointer'
                }}
                title="แตะเพื่อเปิดดูความคืบหน้า 12 เส้นบิงโก"
                aria-label="เปิดดูความคืบหน้า 12 เส้นบิงโก"
              >
                <Trophy size={14} />
                <span>{currentBoard?.bingoCount || 0} / 12 เส้นบิงโก (กดดู)</span>
              </button>
            </div>
            <div className="dashboard-bingo-progress-bar">
              <div
                className="dashboard-bingo-progress-fill"
                style={{ width: `${Math.max(4, progressPercent)}%` }}
              />
            </div>
          </div>

          {/* Bottom Meta Grid: Line Bonus & Impact Tokens (From Home wallet-meta-grid) */}
          <div className="wallet-meta-grid">
            <div className="wallet-meta-item">
              <span className="wallet-meta-label">โบนัสแถวละ (12 แนว)</span>
              <span className="wallet-meta-value" style={{ color: '#FDE047' }}>+20 โทเค็น / เส้น</span>
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
                  title="ไปหน้าแลกของรางวัล"
                >
                  <span>แลกของรางวัล</span>
                  <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================
            2. HERO SCAN & PAYMENT ACTION CARDS (From Home hero-scan-card)
            ======================================================== */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12, marginBottom: 20 }}>
          <Link
            to="/payment"
            className="hero-scan-card"
            style={{ marginBottom: 0, padding: '14px 16px' }}
            aria-label="สแกนจ่ายคนละครึ่ง 60/40"
          >
            <div className="hero-scan-left">
              <div className="hero-scan-icon-wrap" style={{ width: 44, height: 44, borderRadius: 12 }}>
                <QrCode size={24} strokeWidth={2.4} />
              </div>
              <div>
                <div className="hero-scan-title" style={{ fontSize: 15 }}>
                  สแกนจ่ายคนละครึ่ง (60/40)
                </div>
                <div className="hero-scan-desc" style={{ fontSize: 12 }}>
                  ทำภารกิจหมวดอาหารและสินค้าทั่วไป
                </div>
              </div>
            </div>
            <div className="hero-scan-btn" style={{ padding: '8px 14px', fontSize: 12.5 }}>
              <span>ไปใช้จ่าย</span>
              <ArrowRight size={14} />
            </div>
          </Link>

          <Link
            to="/charities"
            className="hero-scan-card"
            style={{ marginBottom: 0, padding: '14px 16px', background: 'var(--fin-success)' }}
            aria-label="ร่วมบริจาค e-Donation ช่องกลาง FREE"
          >
            <div className="hero-scan-left">
              <div className="hero-scan-icon-wrap" style={{ width: 44, height: 44, borderRadius: 12, color: '#059669' }}>
                <HeartHandshake size={24} strokeWidth={2.4} />
              </div>
              <div>
                <div className="hero-scan-title" style={{ fontSize: 15 }}>
                  บริจาค e-Donation (ช่อง FREE)
                </div>
                <div className="hero-scan-desc" style={{ fontSize: 12 }}>
                  พิชิตช่องใจกลาง เชื่อมโยงได้ถึง 4 แนวเส้น
                </div>
              </div>
            </div>
            <div className="hero-scan-btn" style={{ padding: '8px 14px', fontSize: 12.5, color: '#059669' }}>
              <span>ไปบริจาค</span>
              <ArrowRight size={14} />
            </div>
          </Link>
        </div>

        {/* ========================================================
            3. 4-BOARD SELECTOR (Using Home's financial-quick-grid)
            ======================================================== */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Grid size={16} color="var(--bank-royal)" />
            <span>เลือกกระดานบิงโกประจำงวด (4 กระดาน):</span>
          </div>

          <div className="financial-quick-grid" role="navigation" aria-label="เลือกกระดานบิงโก">
            {boardsSummary.map((b) => {
              const isSelected = b.boardIndex === selectedViewIndex;
              const isActive = b.boardIndex === activeBoardIndex;
              return (
                <button
                  key={b.boardIndex}
                  type="button"
                  className="quick-action-item"
                  onClick={() => handleSelectTab(b.boardIndex)}
                  style={{
                    borderColor: isSelected ? 'var(--bank-royal)' : isActive ? 'var(--fin-success)' : undefined,
                    background: isSelected ? 'var(--bank-royal-light)' : '#FFFFFF',
                    boxShadow: isSelected ? '0 2px 8px rgba(29, 78, 216, 0.15)' : undefined,
                    minHeight: 84,
                    width: '100%',
                    borderWidth: isSelected ? 2 : 1
                  }}
                  aria-pressed={isSelected}
                  aria-label={`${b.title?.split(':')[0] || `กระดานที่ ${b.boardIndex + 1}`} ${isActive ? 'กำลังสะสมแต้ม' : ''}`}
                >
                  <div
                    className="quick-action-icon-box"
                    style={{
                      background: isActive ? '#ECFDF5' : isSelected ? '#DBEAFE' : '#F1F5F9',
                      color: isActive ? '#059669' : isSelected ? '#1D4ED8' : '#475569'
                    }}
                  >
                    <Grid size={20} />
                  </div>
                  <span className="quick-action-label" style={{ color: isSelected ? 'var(--bank-royal)' : undefined }}>
                    {b.title?.split(':')[0] || `กระดานที่ ${b.boardIndex + 1}`}
                  </span>
                  <span style={{ fontSize: 11, color: isActive ? '#059669' : 'var(--text-secondary)', fontWeight: isActive ? 700 : 500, marginTop: 2 }}>
                    {isActive ? '● กำลังสะสมแต้ม' : `${b.completedCells || 0}/25 ช่อง`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inactive Board Notice & Switcher Button */}
          {!isViewingActive && (
            <div className="bingo-inactive-notice" style={{ background: '#FFFBEB', border: '1.5px solid #FCD34D', borderRadius: 'var(--radius-lg)', padding: '14px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
                <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0 }} />
                <div style={{ fontSize: 13.5, color: '#92400E', lineHeight: 1.45 }}>
                  คุณกำลังดูกระดานที่ {selectedViewIndex + 1} (ระบบกำลังบันทึกคะแนนที่: <strong>{boardsSummary[activeBoardIndex]?.title?.split(':')[0] || 'กระดานที่ 1'}</strong>)
                </div>
              </div>
              <button
                type="button"
                className="btn-switch-board"
                onClick={() => handleSetActiveBoard(selectedViewIndex)}
                disabled={actionLoading}
                aria-label={`สลับมาสะสมแต้มที่กระดานที่ ${selectedViewIndex + 1}`}
              >
                <Zap size={16} />
                <span>สลับมาสะสมแต้มกระดานนี้</span>
              </button>
            </div>
          )}
        </div>

        {/* ========================================================
            4. SENIOR 3-STEP GUIDE (Using Home's dashboard-steps-section)
            ======================================================== */}
        <section className="dashboard-steps-section" aria-label="วิธีเล่นบิงโกง่ายๆ ใน 3 ขั้นตอน">
          <div className="dashboard-section-header">
            <h2 className="dashboard-section-title">
              <Info size={18} color="var(--bank-royal)" />
              <span>วิธีเล่นบิงโกง่ายๆ ใน 3 ขั้นตอน</span>
            </h2>
            <button
              type="button"
              className="btn-toggle-balance"
              onClick={() => setShowHelpGuide(!showHelpGuide)}
              style={{ color: 'var(--bank-royal)', fontSize: 12.5, fontWeight: 700, minHeight: 36, width: 'auto', padding: '4px 10px', borderRadius: 'var(--radius-sm)' }}
              aria-label={showHelpGuide ? 'ย่อคำแนะนำ' : 'ดูคำแนะนำ'}
            >
              <span>{showHelpGuide ? 'ย่อคำแนะนำ' : 'ดูคำแนะนำ'}</span>
              {showHelpGuide ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            </button>
          </div>

          {showHelpGuide && (
            <div className="dashboard-steps-grid">
              <div className="step-card">
                <div className="step-num-badge">1</div>
                <div className="step-content">
                  <div className="step-title">ใช้จ่ายหรือร่วมบริจาค</div>
                  <div className="step-desc">
                    สแกนใช้สิทธิคนละครึ่ง 60/40 ที่ร้านค้าชุมชน หรือร่วมบริจาค e-Donation
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-num-badge">2</div>
                <div className="step-content">
                  <div className="step-title">ระบบกาช่องอัตโนมัติ</div>
                  <div className="step-desc">
                    เมื่อทำภารกิจครบตามเงื่อนไข ระบบจะขึ้นตราปั๊มสำเร็จบนกระดานให้ทันที
                  </div>
                </div>
              </div>

              <div className="step-card">
                <div className="step-num-badge">3</div>
                <div className="step-content">
                  <div className="step-title">รับโบนัสแถวละ +20 โทเค็น</div>
                  <div className="step-desc">
                    เรียงครบ 5 ช่องแนวนอน แนวตั้ง หรือแนวทแยง รับโบนัสพิเศษเส้นละ +20 โทเค็นทันที
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ========================================================
            5. VIEW MODE SWITCHER (Home's tab-switcher Segmented Control)
            ======================================================== */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="tab-switcher" style={{ maxWidth: 380, marginBottom: 0 }}>
            <button
              type="button"
              className={`tab-btn ${viewMode === 'GRID' ? 'active' : ''}`}
              onClick={() => handleSetViewMode('GRID')}
              aria-label="แสดงแบบตารางบิงโก 5x5"
            >
              <Grid size={16} />
              <span>ตารางบิงโก 5x5</span>
            </button>
            <button
              type="button"
              className={`tab-btn ${viewMode === 'LIST' ? 'active' : ''}`}
              onClick={() => handleSetViewMode('LIST')}
              aria-label="แสดงแบบรายการอ่านง่าย"
            >
              <List size={16} />
              <span>รายการอ่านง่าย (25 ช่อง)</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-trigger-lines-modal"
              onClick={() => setShowLinesModal(true)}
              aria-label="เปิดดูความคืบหน้า 12 เส้นบิงโก"
            >
              <Trophy size={16} color="#D97706" />
              <span>ความคืบหน้า 12 เส้นบิงโก ({currentBoard?.bingoCount || 0}/12 เส้น)</span>
            </button>

            {/* Active Highlight Banner if a line is being inspected */}
            {activeLineId && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#FEF3C7', padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1px solid #FDE68A', fontSize: 12.5, color: '#92400E' }}>
                <span>กำลังดู: <strong>{currentBoard?.lines?.find(l => l.id === activeLineId)?.name || activeLineId}</strong></span>
                <button
                  type="button"
                  onClick={handleClearHighlight}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#B45309', display: 'inline-flex', alignItems: 'center', gap: 2, fontWeight: 700, fontSize: 11.5 }}
                  aria-label="ยกเลิกการเน้นแถว"
                >
                  <X size={14} /> ยกเลิก
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Loading / Error States */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ display: 'inline-block', marginBottom: 12 }}>
              <Grid size={32} color="var(--bank-royal)" />
            </div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>กำลังโหลดข้อมูลกระดานบิงโก 5x5...</div>
          </div>
        ) : error ? (
          <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', color: '#991B1B', padding: 20, borderRadius: 'var(--radius-md)', textAlign: 'center', marginBottom: 24 }}>
            <p style={{ fontWeight: 700, marginBottom: 12 }}>{error}</p>
            <button
              type="button"
              onClick={() => fetchBoardData(selectedViewIndex)}
              className="btn-switch-board"
              style={{ background: '#DC2626' }}
            >
              <RotateCcw size={16} />
              <span>ลองใหม่อีกครั้ง</span>
            </button>
          </div>
        ) : (
          <div className="bingo-layout-full">
            {viewMode === 'GRID' ? (
                /* Authentic 5x5 Game Board */
                <div className="bingo-board-wrapper">
                  {/* B - I - N - G - O Header Badges */}
                  <div className="bingo-header-letters">
                    <div className="bingo-letter-badge bingo-letter-b">B</div>
                    <div className="bingo-letter-badge bingo-letter-i">I</div>
                    <div className="bingo-letter-badge bingo-letter-n">N</div>
                    <div className="bingo-letter-badge bingo-letter-g">G</div>
                    <div className="bingo-letter-badge bingo-letter-o">O</div>
                  </div>

                  {/* 5x5 Matrix - Visual Status Matrix on Mobile */}
                  <div className="bingo-grid-5x5">
                    {currentBoard?.cells?.map((cell) => {
                      const isCenter = cell.position === 12;
                      const isCompleted = cell.status === 'COMPLETED';
                      const isHighlighted = highlightedLinePositions.includes(cell.position);
                      const isInspected = inspectedCell?.position === cell.position;
                      const familyCfg = getFamilyConfig(cell.family);
                      const percent = Math.min(100, Math.round((cell.progress / cell.target_value) * 100));
                      const coord = getCellCoordinate(cell.col, cell.row);

                      return (
                        <div
                          key={cell.position}
                          className={`bingo-cell ${isCompleted ? 'completed' : ''} ${isCenter ? 'center-donation' : ''} ${isHighlighted ? 'highlighted-line' : ''} ${isInspected ? 'is-inspected' : ''}`}
                          onClick={() => {
                            setInspectedCell(cell);
                          }}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') setInspectedCell(cell);
                          }}
                          aria-label={`ช่อง ${coord}: ${cell.title} สถานะ: ${isCompleted ? 'สำเร็จ' : `${cell.progress}/${cell.target_value}`}`}
                          aria-selected={isInspected}
                        >
                          {/* Top Row: Coordinates + FREE Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span className="bingo-cell-position">{coord}</span>
                            {isCenter && (
                              <span style={{ fontSize: 8.5, fontWeight: 900, background: '#D97706', color: '#FFFFFF', padding: '1px 4px', borderRadius: 3 }}>
                                FREE
                              </span>
                            )}
                          </div>

                          {/* Icon + Desktop Title (Title hidden on mobile to avoid cramped unreadable text) */}
                          <div style={{ textAlign: 'center', margin: '2px 0' }}>
                            <div
                              className="bingo-cell-icon-box"
                              style={{
                                background: isCompleted ? '#BBF7D0' : familyCfg.bgLight,
                                color: isCompleted ? '#15803D' : familyCfg.color,
                              }}
                            >
                              {isCompleted ? <Check size={18} strokeWidth={3} /> : familyCfg.icon}
                            </div>

                            {/* Only visible on desktop/tablet (>=641px). Hidden on mobile (<640px) */}
                            <div className="bingo-cell-title bingo-cell-title-desktop" style={{ fontWeight: isCenter ? 800 : 700 }}>
                              {getShortQuestTitle(cell)}
                            </div>
                          </div>

                          {/* Footer: Mobile Status Fraction Badge or Desktop Full Progress Bar */}
                          <div style={{ width: '100%', marginTop: 'auto' }}>
                            {/* On Mobile: Clear readable badge e.g. "2/4" or "สำเร็จ" */}
                            <div className="bingo-cell-mobile-status">
                              {isCompleted ? (
                                <span className="bingo-mobile-done-badge">
                                  <Check size={11} strokeWidth={3} /> สำเร็จ
                                </span>
                              ) : (
                                <span className="bingo-mobile-count-badge">
                                  {cell.progress}/{cell.target_value}
                                </span>
                              )}
                            </div>

                            {/* On Desktop: Full stats + Progress bar */}
                            <div className="bingo-cell-desktop-progress">
                              <div className="bingo-cell-progress-stats">
                                <span>{cell.progress}/{cell.target_value}</span>
                                <span style={{ color: isCompleted ? '#15803D' : '#D97706', fontWeight: 800 }}>+{cell.token_reward}</span>
                              </div>
                              <div className="bingo-progress-container">
                                <div
                                  className="bingo-progress-fill"
                                  style={{
                                    width: `${percent}%`,
                                    background: isCompleted ? '#16A34A' : familyCfg.color,
                                  }}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Authentic Dabber Stamp Effect on Completed Tiles */}
                          {isCompleted && (
                            <div className="bingo-stamp-dab">
                              <Check size={11} strokeWidth={3} />
                              <span>สำเร็จ</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* ========================================================
                      LIVE ACTIVE CELL INSPECTOR CARD
                      Solves small-screen readability: 18px clear text,
                      direct payment/donation CTA, step buttons, simulation tools
                      ======================================================== */}
                  {inspectedCell && (
                    <div className="bingo-live-inspector" aria-live="polite">
                      {/* Top Meta Line: Coordinate, Category, and Status */}
                      <div className="inspector-header-row">
                        <div className="inspector-badge-group">
                          <span className="inspector-coord-pill">
                            {getCellCoordinate(inspectedCell.col, inspectedCell.row)}
                            {inspectedCell.position === 12 ? ' (ช่องฟรีกึ่งกลาง)' : ''}
                          </span>
                          <span
                            className="inspector-category-pill"
                            style={{
                              background: getFamilyConfig(inspectedCell.family).bgLight,
                              color: getFamilyConfig(inspectedCell.family).color,
                            }}
                          >
                            {getFamilyConfig(inspectedCell.family).icon}
                            <span>{getFamilyConfig(inspectedCell.family).label}</span>
                          </span>
                        </div>

                        <div className="inspector-status-group">
                          {inspectedCell.status === 'COMPLETED' ? (
                            <span className="inspector-pill-completed">
                              <Check size={14} strokeWidth={3} /> สำเร็จแล้ว (+{inspectedCell.token_reward} โทเค็น)
                            </span>
                          ) : (
                            <span className="inspector-pill-progress">
                              ความคืบหน้า {inspectedCell.progress} / {inspectedCell.target_value} {inspectedCell.unit}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Big Senior-Friendly Title (18px) */}
                      <h3 className="inspector-mission-title">
                        {inspectedCell.title}
                      </h3>

                      {/* Token Reward Badge (Answers user request: remove backend raw reason and state token reward clearly) */}
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          background: inspectedCell.status === 'COMPLETED' ? '#DCFCE7' : '#FEF3C7',
                          border: `1px solid ${inspectedCell.status === 'COMPLETED' ? '#86EFAC' : '#FDE68A'}`,
                          color: inspectedCell.status === 'COMPLETED' ? '#15803D' : '#92400E',
                          padding: '5px 12px',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: 13.5,
                          fontWeight: 700,
                          width: 'fit-content',
                        }}
                      >
                        <Coins size={16} color={inspectedCell.status === 'COMPLETED' ? '#16A34A' : '#D97706'} />
                        <span>
                          {inspectedCell.status === 'COMPLETED' ? 'ได้รับรางวัลช่องนี้แล้ว: ' : 'รางวัลเมื่อทำสำเร็จช่องนี้: '}
                          <strong style={{ color: inspectedCell.status === 'COMPLETED' ? '#15803D' : '#B45309' }}>
                            +{inspectedCell.token_reward} โทเค็น
                          </strong>
                        </span>
                      </div>

                      {/* Large Progress Bar Section */}
                      <div className="inspector-progress-box">
                        <div className="inspector-progress-labels">
                          <span className="progress-label-text">
                            {inspectedCell.status === 'COMPLETED'
                              ? 'ภารกิจนี้ทำสำเร็จเรียบร้อยแล้ว'
                              : `สะสมแล้ว ${inspectedCell.progress} จากเป้าหมาย ${inspectedCell.target_value} ${inspectedCell.unit} (ขาดอีก ${Math.max(0, inspectedCell.target_value - inspectedCell.progress)} ${inspectedCell.unit})`}
                          </span>
                          <span className="progress-percent-text" style={{ color: inspectedCell.status === 'COMPLETED' ? '#16A34A' : 'var(--bank-royal)' }}>
                            {Math.min(100, Math.round((inspectedCell.progress / inspectedCell.target_value) * 100))}%
                          </span>
                        </div>
                        <div className="bingo-progress-container" style={{ height: 8, background: '#E2E8F0' }}>
                          <div
                            className="bingo-progress-fill"
                            style={{
                              width: `${Math.min(100, Math.round((inspectedCell.progress / inspectedCell.target_value) * 100))}%`,
                              background: inspectedCell.status === 'COMPLETED' ? '#16A34A' : 'var(--bank-royal)',
                            }}
                          />
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div className="inspector-actions-wrap">
                        {/* Primary Action Button (Links to Payment or Charities) */}
                        {inspectedCell.position === 12 || inspectedCell.family === 'DONATION' ? (
                          <Link
                            to="/charities"
                            className="btn-inspector-action btn-charity"
                            aria-label="ไปร่วมบริจาค e-Donation ช่อง FREE"
                          >
                            <HeartHandshake size={18} />
                            <span>ไปร่วมบริจาค e-Donation (ช่อง FREE)</span>
                            <ArrowRight size={16} />
                          </Link>
                        ) : (
                          <Link
                            to="/payment"
                            className="btn-inspector-action btn-payment"
                            aria-label="ไปสแกนจ่ายคนละครึ่ง 60/40"
                          >
                            <QrCode size={18} />
                            <span>ไปสแกนจ่ายคนละครึ่ง (60/40)</span>
                            <ArrowRight size={16} />
                          </Link>
                        )}

                        {/* Simulation & Detail Tools */}
                        <div className="inspector-sim-group">
                          <button
                            type="button"
                            className="btn-inspector-sim"
                            onClick={() => handleProgressCell(inspectedCell.position, false)}
                            disabled={actionLoading || inspectedCell.status === 'COMPLETED'}
                            aria-label={`ทดลองเพิ่มความคืบหน้า 1 ${inspectedCell.unit}`}
                          >
                            <Zap size={14} />
                            <span>+1 {inspectedCell.unit} (จำลอง)</span>
                          </button>

                          <button
                            type="button"
                            className="btn-inspector-sim btn-finish"
                            onClick={() => handleProgressCell(inspectedCell.position, true)}
                            disabled={actionLoading || inspectedCell.status === 'COMPLETED'}
                            aria-label="ทดลองทำภารกิจช่องนี้ให้สำเร็จทันที"
                          >
                            <Check size={14} />
                            <span>สำเร็จ 100% (จำลอง)</span>
                          </button>

                          <button
                            type="button"
                            className="btn-inspector-expand"
                            onClick={() => setSelectedCell(inspectedCell)}
                            aria-label="เปิดดูรายละเอียดในแผ่นเต็ม"
                          >
                            <Maximize2 size={14} />
                            <span>แผ่นเต็ม</span>
                          </button>
                        </div>
                      </div>

                      {/* Stepper Navigation: Next / Prev Cell Buttons */}
                      <div className="inspector-stepper-bar">
                        <button
                          type="button"
                          className="btn-inspector-step"
                          onClick={() => handleStepCell(-1)}
                          aria-label="ดูภารกิจช่องก่อนหน้า"
                        >
                          <ChevronLeft size={16} />
                          <span>ช่องก่อนหน้า</span>
                        </button>

                        <span className="inspector-step-counter">
                          ช่องที่ {inspectedCell.position + 1} จาก 25 ช่อง
                        </span>

                        <button
                          type="button"
                          className="btn-inspector-step"
                          onClick={() => handleStepCell(1)}
                          aria-label="ดูภารกิจช่องถัดไป"
                        >
                          <span>ช่องถัดไป</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Senior-Friendly Accessible List View */
                <div className="bingo-list-wrapper">
                  {/* Filter Pills */}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    <button
                      type="button"
                      onClick={() => setFilterMode('ALL')}
                      style={{
                        padding: '8px 14px',
                        minHeight: 40,
                        borderRadius: 'var(--radius-full)',
                        border: '1.5px solid',
                        borderColor: filterMode === 'ALL' ? 'var(--bank-royal)' : 'var(--border-light)',
                        background: filterMode === 'ALL' ? 'var(--bank-royal-light)' : '#FFFFFF',
                        color: filterMode === 'ALL' ? 'var(--bank-royal)' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      ทั้งหมด ({currentBoard?.cells?.length || 25})
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode('IN_PROGRESS')}
                      style={{
                        padding: '8px 14px',
                        minHeight: 40,
                        borderRadius: 'var(--radius-full)',
                        border: '1.5px solid',
                        borderColor: filterMode === 'IN_PROGRESS' ? 'var(--bank-royal)' : 'var(--border-light)',
                        background: filterMode === 'IN_PROGRESS' ? 'var(--bank-royal-light)' : '#FFFFFF',
                        color: filterMode === 'IN_PROGRESS' ? 'var(--bank-royal)' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      รอทำ ({25 - completedCellsCount})
                    </button>

                    <button
                      type="button"
                      onClick={() => setFilterMode('COMPLETED')}
                      style={{
                        padding: '8px 14px',
                        minHeight: 40,
                        borderRadius: 'var(--radius-full)',
                        border: '1.5px solid',
                        borderColor: filterMode === 'COMPLETED' ? '#059669' : 'var(--border-light)',
                        background: filterMode === 'COMPLETED' ? '#ECFDF5' : '#FFFFFF',
                        color: filterMode === 'COMPLETED' ? '#059669' : 'var(--text-secondary)',
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      สำเร็จแล้ว ({completedCellsCount})
                    </button>
                  </div>

                  {/* List Cards */}
                  {filteredCells.map((cell) => {
                    const isCompleted = cell.status === 'COMPLETED';
                    const isCenter = cell.position === 12;
                    const familyCfg = getFamilyConfig(cell.family);
                    const coord = getCellCoordinate(cell.col, cell.row);

                    return (
                      <div
                        key={cell.position}
                        className={`bingo-list-card ${isCompleted ? 'completed' : ''} ${isCenter ? 'center-donation' : ''}`}
                        onClick={() => setSelectedCell(cell)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedCell(cell); }}
                        aria-label={`ภารกิจ ${cell.title}`}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 13, color: 'var(--bank-royal)', background: 'var(--bank-royal-light)', padding: '2px 8px', borderRadius: 4 }}>
                              {coord}
                            </span>
                            <span className={familyCfg.badgeClass} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                              {familyCfg.icon}
                              <span>{familyCfg.label}</span>
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#D97706', fontWeight: 800, fontSize: 13 }}>
                            <Coins size={15} />
                            <span>+{cell.token_reward} โทเค็น</span>
                          </div>
                        </div>

                        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, lineHeight: 1.4 }}>
                          {cell.title}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>
                          <span>
                            {isCompleted ? 'ทำสำเร็จเรียบร้อยแล้ว' : `ทำไปแล้ว ${cell.progress} จาก ${cell.target_value} ${cell.unit}`}
                          </span>
                          <span style={{ color: isCompleted ? '#059669' : 'var(--bank-royal)', fontWeight: 800 }}>
                            {Math.min(100, Math.round((cell.progress / cell.target_value) * 100))}%
                          </span>
                        </div>

                        <div className="bingo-progress-container" style={{ height: 6 }}>
                          <div
                            className="bingo-progress-fill"
                            style={{
                              width: `${Math.min(100, Math.round((cell.progress / cell.target_value) * 100))}%`,
                              background: isCompleted ? '#16A34A' : familyCfg.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        )}

        {/* ========================================================
            6. SECURITY & COMPLIANCE BANNER (Exact style from Home)
            ======================================================== */}
        <div className="compliance-box" role="region" aria-label="ความปลอดภัยและ PDPA" style={{ marginTop: 24 }}>
          <CheckCircle2 size={24} color="var(--fin-success)" style={{ flexShrink: 0 }} />
          <div>
            <div className="compliance-title">
              ระบบคำนวณและตรวจสอบภารกิจบิงโกอัตโนมัติตามมาตรฐานสถาบันการเงิน
            </div>
            <div className="compliance-text">
              ข้อมูลธุรกรรมการใช้จ่ายและการสแกนสิทธิ 60/40 ได้รับการตรวจสอบและเข้ารหัสความปลอดภัยขั้นสูง สอดคล้องตามมาตรฐาน ETDA และ พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)
            </div>
          </div>
        </div>
      </main>

      {/* ====================================================
          MODAL / BOTTOM SHEET: CELL DETAILS & ACTIONS
          ==================================================== */}
      {selectedCell && (
        <div
          className="bingo-modal-overlay"
          onClick={() => setSelectedCell(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-cell-title"
        >
          <div className="bingo-modal-sheet" onClick={(e) => e.stopPropagation()}>
            {/* Grab handle for mobile bottom sheet */}
            <div className="bingo-modal-grab-handle" />

            {/* Header: Tag + Close Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className={getFamilyConfig(selectedCell.family).badgeClass} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 4 }}>
                  {getFamilyConfig(selectedCell.family).label}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  พิกัด {getCellCoordinate(selectedCell.col, selectedCell.row)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  touchAction: 'manipulation'
                }}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            {/* Title */}
            <h2 id="modal-cell-title" style={{ fontSize: 'clamp(17px, 3.5vw, 20px)', fontWeight: 800, margin: 0, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {selectedCell.title}
            </h2>

            {/* Reward Pill */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A', padding: '6px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 700 }}>
                <Coins size={16} color="#D97706" />
                <span>รางวัลเมื่อสำเร็จช่องนี้: +{selectedCell.token_reward} โทเค็น</span>
              </div>
            </div>

            {/* Plain Explanation Box */}
            <div
              style={{
                background: '#F8FAFC',
                border: '1.5px solid var(--border-light)',
                borderRadius: 'var(--radius-md)',
                padding: '12px 14px',
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Info size={14} color="var(--bank-royal)" />
                <span>วิธีทำภารกิจนี้:</span>
              </div>
              <p style={{ fontSize: 13.5, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>
                {selectedCell.position === 12 || selectedCell.family === 'DONATION'
                  ? 'ร่วมบริจาค e-Donation ให้แก่มูลนิธิหรือโรงพยาบาลเพื่อสะสมช่องใจกลาง (FREE) รับ +10 โทเค็น'
                  : `สแกนใช้สิทธิคนละครึ่ง (60/40) ให้ครบเป้าหมาย ${selectedCell.target_value} ${selectedCell.unit} เพื่อพิชิตช่องนี้และรับ +${selectedCell.token_reward} โทเค็น`}
              </p>
            </div>

            {/* Progress Bar Indicator */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>
                <span>ความคืบหน้าปัจจุบัน</span>
                <span style={{ color: selectedCell.status === 'COMPLETED' ? '#16A34A' : 'var(--bank-royal)' }}>
                  {selectedCell.progress} / {selectedCell.target_value} {selectedCell.unit} (
                  {Math.min(100, Math.round((selectedCell.progress / selectedCell.target_value) * 100))}%)
                </span>
              </div>
              <div className="bingo-progress-container" style={{ height: 8 }}>
                <div
                  className="bingo-progress-fill"
                  style={{
                    width: `${Math.min(100, Math.round((selectedCell.progress / selectedCell.target_value) * 100))}%`,
                    background: selectedCell.status === 'COMPLETED' ? '#16A34A' : 'var(--bank-royal)',
                  }}
                />
              </div>
            </div>

            {/* Real Application Link Action Button (Flat solid 48px button) */}
            {selectedCell.position === 12 || selectedCell.family === 'DONATION' ? (
              <Link
                to="/charities"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  background: 'var(--fin-success)',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  minHeight: 48,
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14.5,
                  textDecoration: 'none',
                  touchAction: 'manipulation'
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
                  background: 'var(--bank-royal)',
                  color: '#FFFFFF',
                  padding: '12px 20px',
                  minHeight: 48,
                  borderRadius: 'var(--radius-md)',
                  fontWeight: 700,
                  fontSize: 14.5,
                  textDecoration: 'none',
                  touchAction: 'manipulation'
                }}
              >
                <CreditCard size={18} />
                <span>ไปสแกนใช้จ่ายคนละครึ่งที่ร้านค้า</span>
              </Link>
            )}

            {/* Interactive Simulation / Testing Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, borderTop: '1px dashed #CBD5E1', paddingTop: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
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
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => handleProgressCell(selectedCell.position, false)}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 14px',
                      minHeight: 48,
                      borderRadius: 'var(--radius-md)',
                      border: '1.5px solid #CBD5E1',
                      background: '#F8FAFC',
                      color: 'var(--text-primary)',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      touchAction: 'manipulation'
                    }}
                    aria-label={`ทดลองเพิ่มความคืบหน้า 1 ${selectedCell.unit}`}
                  >
                    <Zap size={16} color="#D97706" />
                    <span>+1 {selectedCell.unit} (จำลอง)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleProgressCell(selectedCell.position, true)}
                    disabled={actionLoading}
                    style={{
                      padding: '10px 14px',
                      minHeight: 48,
                      borderRadius: 'var(--radius-md)',
                      border: 'none',
                      background: '#16A34A',
                      color: '#FFFFFF',
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      touchAction: 'manipulation'
                    }}
                    aria-label="ทดลองทำให้ภารกิจนี้สำเร็จทันที 100%"
                  >
                    <Check size={16} />
                    <span>สำเร็จ 100% (จำลอง)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Dedicated Senior-Friendly Full-Width Close Button */}
            <button
              type="button"
              onClick={() => setSelectedCell(null)}
              style={{
                width: '100%',
                padding: '12px 16px',
                minHeight: 48,
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-light)',
                background: '#F1F5F9',
                color: 'var(--text-primary)',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
                marginTop: 4
              }}
              aria-label="ปิดหน้าต่างภารกิจ"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL: 12 LINES BINGO PROGRESS TRACKER POP-UP
          ==================================================== */}
      {showLinesModal && (
        <div
          className="bingo-modal-overlay"
          onClick={() => setShowLinesModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-lines-title"
        >
          <div className="bingo-modal-sheet" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            {/* Grab handle for mobile bottom sheet */}
            <div className="bingo-modal-grab-handle" />

            {/* Header: Title + Close Icon */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Trophy size={22} color="#D97706" />
                </div>
                <div>
                  <h3 id="modal-lines-title" style={{ fontSize: 17, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                    ความคืบหน้า 12 เส้นบิงโก
                  </h3>
                  <div style={{ fontSize: 12.5, color: '#D97706', fontWeight: 700 }}>
                    สำเร็จแล้ว {currentBoard?.bingoCount || 0} / 12 เส้น (โบนัส +{(currentBoard?.bingoCount || 0) * 20} โทเค็น)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLinesModal(false)}
                style={{
                  background: '#F1F5F9',
                  border: 'none',
                  borderRadius: 'var(--radius-full)',
                  width: 36,
                  height: 36,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  touchAction: 'manipulation'
                }}
                aria-label="ปิดหน้าต่าง"
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: '4px 0 6px 0', lineHeight: 1.45 }}>
              แตะที่แนวเส้นด้านล่างเพื่อเน้นตำแหน่ง 5 ช่องบนกระดานบิงโก (ช่อง FREE เชื่อมต่อได้ถึง 4 แนวเส้น)
            </p>

            {/* Lines List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: '60dvh', overflowY: 'auto', paddingRight: 4 }}>
              {currentBoard?.lines?.map((line) => {
                const isCompleted = line.isCompleted;
                const isHighlighted = activeLineId === line.id;

                return (
                  <button
                    key={line.id}
                    type="button"
                    className={`bingo-line-row-btn ${isHighlighted ? 'is-active-highlight' : ''} ${isCompleted ? 'is-completed' : ''}`}
                    onClick={() => {
                      handleToggleLineHighlight(line);
                    }}
                    aria-pressed={isHighlighted}
                    aria-label={`${line.name} สำเร็จ ${line.completedCount} จาก 5 ช่อง`}
                    style={{
                      padding: '11px 13px',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 800,
                            padding: '3px 7px',
                            borderRadius: 4,
                            background: isCompleted ? '#16A34A' : isHighlighted ? '#D97706' : '#E2E8F0',
                            color: isCompleted || isHighlighted ? '#FFFFFF' : '#475569',
                          }}
                        >
                          {line.id}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isCompleted ? '#15803D' : 'var(--text-primary)' }}>
                          {line.name}
                        </span>
                      </div>

                      {isCompleted ? (
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#16A34A', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Check size={14} strokeWidth={3} /> สำเร็จ (+20 โทเค็น)
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                          {line.completedCount}/5 ช่อง (+20)
                        </span>
                      )}
                    </div>

                    {/* Line Progress Fill */}
                    <div className="bingo-progress-container" style={{ height: 5 }}>
                      <div
                        className="bingo-progress-fill"
                        style={{
                          width: `${line.progressPercent}%`,
                          background: isCompleted ? '#16A34A' : '#1D4ED8',
                        }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer Close Button */}
            <button
              type="button"
              className="btn-modal-close"
              onClick={() => setShowLinesModal(false)}
              style={{
                width: '100%',
                padding: '12px 16px',
                minHeight: 46,
                borderRadius: 'var(--radius-md)',
                background: 'var(--bank-royal)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 14.5,
                border: 'none',
                cursor: 'pointer',
                marginTop: 6
              }}
            >
              {activeLineId ? 'ดูตำแหน่งที่เน้นบนกระดานบิงโก' : 'ปิดหน้าต่าง'}
            </button>
          </div>
        </div>
      )}

            {/* ====================================================
          MODAL: BINGO CELEBRATION!
          ==================================================== */}
      {bingoCelebration && (
        <div
          className="bingo-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bingo-win-title"
        >
          <div className="bingo-modal-sheet" style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 'var(--radius-full)',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px auto',
              }}
            >
              <PartyPopper size={36} />
            </div>

            <h2 id="bingo-win-title" style={{ fontSize: 22, fontWeight: 900, color: '#92400E', margin: '0 0 4px 0' }}>
              BINGO! พิชิตแถวสำเร็จ
            </h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', margin: 0 }}>
              ยินดีด้วย! คุณทำภารกิจเชื่อมโยงครบ 5 ช่องเป็นแนวเส้นสำเร็จ
            </p>

            <div
              style={{
                background: '#FEF3C7',
                border: '2px solid #F59E0B',
                borderRadius: 'var(--radius-lg)',
                padding: '18px 16px',
                margin: '12px 0',
              }}
            >
              <div style={{ fontSize: 13, color: '#B45309', fontWeight: 600 }}>โบนัสแถวบิงโก</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, margin: '6px 0' }}>
                <Coins size={28} />
                <span>+{bingoCelebration.bonusTokens} โทเค็น</span>
              </div>
              <div style={{ fontSize: 12.5, color: '#78350F', fontWeight: 600 }}>
                ยอดรวมแถวบิงโกที่ทำได้ทั้งหมด: {bingoCelebration.linesCount} เส้น
              </div>
            </div>

            <button
              type="button"
              onClick={() => setBingoCelebration(null)}
              style={{
                width: '100%',
                padding: '14px 20px',
                minHeight: 48,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                background: 'var(--bank-royal)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: 15,
                cursor: 'pointer',
                touchAction: 'manipulation'
              }}
              aria-label="รับรางวัลและเล่นต่อ"
            >
              รับรางวัล และเล่นต่อ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
