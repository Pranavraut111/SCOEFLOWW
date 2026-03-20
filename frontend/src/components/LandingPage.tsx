import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Settings, Users, BookOpen, BarChart3, Shield, ChevronDown } from 'lucide-react';

/* ── CONFIG ── */
const TOTAL_FRAMES = 240;
const SCENES = [
  { start: 0,   end: 59,  num: '01', title: 'Exterior · Main Entry' },
  { start: 60,  end: 119, num: '02', title: 'Entrance Lobby · Student Section' },
  { start: 120, end: 179, num: '03', title: 'Corridor · Staircase Ascent' },
  { start: 180, end: 239, num: '04', title: 'Inner Lobby · Saraswati Statue' },
];

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function padNum(n: number) { return String(n).padStart(3, '0'); }

const LandingPage = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const scrollDriverRef = useRef<HTMLDivElement>(null);

  const [loadedCount, setLoadedCount] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);
  const [loadingDone, setLoadingDone] = useState(false);

  // Animation state refs (no re-renders)
  const scrollProgressRef = useRef(0);
  const smoothProgressRef = useRef(0);
  const swayTimeRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);
  const currentSceneRef = useRef(-1);
  const rafRef = useRef(0);

  // Scene label state
  const [sceneLabel, setSceneLabel] = useState({ num: '01', title: 'Exterior · Main Entry', visible: true });
  const [brandVisible, setBrandVisible] = useState(true);
  const [scrollStarted, setScrollStarted] = useState(false);

  /* ── PRELOAD FRAMES ── */
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loaded = 0;
    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.src = `/frames/landing/ezgif-frame-${padNum(i + 1)}.jpg`;
      img.onload = img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === TOTAL_FRAMES) {
          setAllLoaded(true);
          setTimeout(() => setLoadingDone(true), 800);
        }
      };
      images[i] = img;
    }
    framesRef.current = images;
  }, []);

  /* ── DRAW FRAME ── */
  const drawFrame = useCallback((idx: number, swayX = 0, swayY = 0) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(idx)));
    const img = framesRef.current[idx];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const cw = canvas.width;
    const ch = canvas.height;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih);
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2 + swayX;
    const dy = (ch - dh) / 2 + swayY;

    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
  }, []);

  /* ── RESIZE CANVAS ── */
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  /* ── SCROLL HANDLER ── */
  useEffect(() => {
    const onScroll = () => {
      const stickyH = window.innerHeight * 7;
      scrollProgressRef.current = Math.max(0, Math.min(1, window.scrollY / (stickyH - window.innerHeight)));
      if (window.scrollY > 80) setScrollStarted(true);
      if (scrollProgressRef.current > 0.03) setBrandVisible(false);
      else setBrandVisible(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── ANIMATION LOOP ── */
  useEffect(() => {
    if (!allLoaded) return;
    drawFrame(0);

    const animate = (ts: number) => {
      const dt = lastTsRef.current ? Math.min((ts - lastTsRef.current) / 1000, 0.05) : 0.016;
      lastTsRef.current = ts;

      smoothProgressRef.current = lerp(smoothProgressRef.current, scrollProgressRef.current, 1 - Math.pow(0.005, dt));
      const rawFrame = smoothProgressRef.current * (TOTAL_FRAMES - 1);

      // Micro-sway
      const scrollSpeed = Math.abs(scrollProgressRef.current - smoothProgressRef.current);
      swayTimeRef.current += dt * (0.8 + scrollSpeed * 10);
      const swayX = Math.sin(swayTimeRef.current * 1.4) * 5;
      const swayY = Math.abs(Math.sin(swayTimeRef.current * 2.8)) * 3 - 1.5;

      drawFrame(rawFrame, swayX, swayY);

      // Scene detection
      const frameIdx = Math.round(rawFrame);
      let s = 0;
      for (let i = SCENES.length - 1; i >= 0; i--) {
        if (frameIdx >= SCENES[i].start) { s = i; break; }
      }
      if (s !== currentSceneRef.current) {
        currentSceneRef.current = s;
        setSceneLabel({ num: '', title: '', visible: false });
        setTimeout(() => {
          setSceneLabel({ num: SCENES[s].num, title: SCENES[s].title, visible: true });
        }, 300);
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [allLoaded, drawFrame]);

  const loadPct = Math.round((loadedCount / TOTAL_FRAMES) * 100);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: '#0e0d0b', color: '#f8f4ee' }}>
      {/* ── LOADING SCREEN ── */}
      <div style={{
        position: 'fixed', inset: 0, background: '#0e0d0b', zIndex: 9999,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24,
        opacity: loadingDone ? 0 : 1, pointerEvents: loadingDone ? 'none' : 'auto',
        transition: 'opacity 1.4s ease',
      }}>
        <div style={{
          width: 60, height: 60, border: '1px solid rgba(201,151,58,0.3)',
          borderTopColor: '#c9973a', borderRadius: '50%',
          animation: 'spin 1.2s linear infinite',
        }} />
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(16px,3vw,24px)', fontWeight: 300, letterSpacing: 6, textAlign: 'center', padding: '0 20px' }}>
          Saraswati College of Engineering
        </div>
        <div style={{ fontSize: 10, letterSpacing: 4, color: '#c9973a', textTransform: 'uppercase' as const }}>Loading Campus Tour</div>
        <div style={{ width: 260, height: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg,#c9973a,#f0c668)', width: `${loadPct}%`, borderRadius: 1, transition: 'width 0.15s linear' }} />
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', letterSpacing: 2 }}>{loadedCount} / {TOTAL_FRAMES}</div>
      </div>

      {/* ── SCROLL DRIVER (tall container for scroll-based animation) ── */}
      <div ref={scrollDriverRef} style={{ height: '700vh' }}>
        <div style={{ position: 'sticky', top: 0, height: '100vh', width: '100%', overflow: 'hidden' }}>
          {/* Canvas */}
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />

          {/* Cinematic letterbox */}
          <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '7vh', background: '#000', zIndex: 5, pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '7vh', background: '#000', zIndex: 5, pointerEvents: 'none' }} />

          {/* Vignette */}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.72) 100%)', zIndex: 6, pointerEvents: 'none' }} />

          {/* Film grain */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 7, pointerEvents: 'none', opacity: 0.04, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`, backgroundSize: '128px 128px' }} />

          {/* Color grade */}
          <div style={{ position: 'absolute', inset: 0, zIndex: 9, pointerEvents: 'none', mixBlendMode: 'multiply' as const, opacity: 0.18, background: 'linear-gradient(160deg,#1a0e00 0%,transparent 60%,#001018 100%)' }} />

          {/* Brand watermark (intro) */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', zIndex: 15, pointerEvents: 'none',
            opacity: brandVisible ? 1 : 0, transition: 'opacity 1.2s ease',
          }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(28px,5vw,60px)', fontWeight: 300, letterSpacing: 6, color: '#fff', textShadow: '0 2px 40px rgba(0,0,0,0.9)', lineHeight: 1.2 }}>
              Saraswati College<br />of Engineering
            </div>
            <div style={{ fontSize: 'clamp(9px,1.2vw,12px)', letterSpacing: 6, color: '#f0c668', textTransform: 'uppercase' as const, marginTop: 14 }}>
              Campus Walkthrough
            </div>
            <div style={{ width: 60, height: 1, background: '#c9973a', margin: '16px auto 0' }} />
          </div>

          {/* Scene label */}
          <div style={{ position: 'absolute', top: '10vh', left: '50%', transform: 'translateX(-50%)', zIndex: 20, textAlign: 'center', pointerEvents: 'none' }}>
            <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 10, letterSpacing: 5, color: '#c9973a', textTransform: 'uppercase' as const, marginBottom: 6, opacity: sceneLabel.visible ? 1 : 0, transition: 'opacity 0.6s' }}>
              {sceneLabel.num}
            </div>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(18px,2.5vw,28px)', fontWeight: 300, letterSpacing: 2, color: '#f8f4ee', opacity: sceneLabel.visible ? 1 : 0, transition: 'opacity 0.6s' }}>
              {sceneLabel.title}
            </div>
          </div>

          {/* Scroll indicator */}
          {!scrollStarted && (
            <div style={{ position: 'absolute', bottom: '13vh', left: '50%', transform: 'translateX(-50%)', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, pointerEvents: 'none' }}>
              <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase' as const }}>Scroll to walk</div>
              <div style={{ width: 22, height: 34, border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 12, display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: 6, background: 'rgba(255,255,255,0.7)', borderRadius: 2, marginTop: 6, animation: 'wheel 1.8s ease-in-out infinite' }} />
              </div>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ position: 'absolute', bottom: '8vh', left: '50%', transform: 'translateX(-50%)', width: 200, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, pointerEvents: 'none' }}>
            <div style={{ width: '100%', height: 1, background: 'rgba(255,255,255,0.2)', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: 'linear-gradient(90deg,#c9973a,#f0c668)', borderRadius: 1, transition: 'width 0.08s linear', width: `${(smoothProgressRef.current || 0) * 100}%` }} />
            </div>
            <div style={{ fontSize: 9, letterSpacing: 4, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' as const }}>Campus Tour</div>
          </div>
        </div>
      </div>

      {/* ── AFTER-SCROLL CONTENT ── */}
      {/* College Info Section */}
      <div style={{ background: '#0e0d0b', padding: '80px 40px', textAlign: 'center', borderTop: '1px solid rgba(201,151,58,0.2)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(24px,4vw,48px)', fontWeight: 300, letterSpacing: 4, color: '#f8f4ee', marginBottom: 16 }}>
          Where Engineers Are Born
        </div>
        <div style={{ fontSize: 12, letterSpacing: 4, color: '#c9973a', textTransform: 'uppercase' as const, marginBottom: 40 }}>
          Saraswati College of Engineering — Kharghar, Navi Mumbai
        </div>
        <div style={{ width: 80, height: 1, background: '#c9973a', margin: '0 auto 40px' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(30px,6vw,100px)', flexWrap: 'wrap' as const, marginBottom: 60 }}>
          {[
            { num: '20+', label: 'Years of Excellence' },
            { num: '8', label: 'Engineering Departments' },
            { num: '5000+', label: 'Alumni Worldwide' },
            { num: 'NBA', label: 'Accredited' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(32px,5vw,56px)', fontWeight: 300, color: '#f0c668', display: 'block' }}>{s.num}</span>
              <span style={{ fontSize: 10, letterSpacing: 3, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, marginTop: 6, display: 'block' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PORTAL LOGIN SECTION ── */}
      <div style={{ background: 'linear-gradient(180deg, #0e0d0b 0%, #141210 100%)', padding: '60px 20px 100px', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 'clamp(22px,3.5vw,42px)', fontWeight: 300, letterSpacing: 4, color: '#f8f4ee', marginBottom: 8 }}>
          Access Your Portal
        </div>
        <div style={{ fontSize: 12, letterSpacing: 3, color: 'rgba(255,255,255,0.4)', marginBottom: 50 }}>
          Choose your dashboard to get started
        </div>

        <div style={{ display: 'flex', gap: 30, justifyContent: 'center', flexWrap: 'wrap' as const, maxWidth: 800, margin: '0 auto' }}>
          {/* Admin Card */}
          <div
            onClick={() => navigate('/admin')}
            style={{
              flex: '1 1 320px', maxWidth: 380, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(201,151,58,0.2)',
              borderRadius: 16, padding: '40px 30px', cursor: 'pointer', transition: 'all 0.3s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#c9973a'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(201,151,58,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(201,151,58,0.2)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(201,151,58,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={28} color="#c9973a" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#f8f4ee', marginBottom: 8 }}>Admin Portal</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 24 }}>
              Manage students, exams, results, and administrative functions
            </div>
            <div style={{
              padding: '12px 32px', background: 'linear-gradient(135deg, #c9973a, #f0c668)', color: '#0e0d0b',
              borderRadius: 8, fontWeight: 600, fontSize: 14, letterSpacing: 1, display: 'inline-block',
            }}>
              Access Dashboard →
            </div>
          </div>

          {/* Student Card */}
          <div
            onClick={() => navigate('/student')}
            style={{
              flex: '1 1 320px', maxWidth: 380, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '40px 30px', cursor: 'pointer', transition: 'all 0.3s ease',
              textAlign: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#f8f4ee'; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 20px 60px rgba(255,255,255,0.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GraduationCap size={28} color="#f8f4ee" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 600, color: '#f8f4ee', marginBottom: 8 }}>Student Portal</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, marginBottom: 24 }}>
              View your dashboard, AI assistant, clubs, recommendations, and results
            </div>
            <div style={{
              padding: '12px 32px', border: '1px solid rgba(255,255,255,0.3)', color: '#f8f4ee',
              borderRadius: 8, fontWeight: 600, fontSize: 14, letterSpacing: 1, display: 'inline-block',
            }}>
              Access Dashboard →
            </div>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <div style={{ background: '#0a0908', padding: '30px 20px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', letterSpacing: 2 }}>
          © 2025 Saraswati College of Engineering · All Rights Reserved
        </div>
      </div>

      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Inter:wght@300;400;500&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes wheel { 0%,100%{opacity:1;transform:translateY(0)} 50%{opacity:0;transform:translateY(8px)} }
        html { scroll-behavior: smooth; }
      `}</style>
    </div>
  );
};

export default LandingPage;