import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Play, Pause, RotateCcw } from 'lucide-react';

const TOTAL_FRAMES = 240;
const FPS = 30;
const FRAME_DURATION = 1000 / FPS;

interface ClubFrameAnimationProps {
  clubId: 'nss' | 'rotaract' | 'studentcouncil';
  clubName: string;
  onClose: () => void;
}

const ClubFrameAnimation = ({ clubId, clubName, onClose }: ClubFrameAnimationProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [allLoaded, setAllLoaded] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const frameRef = useRef<number>(0);

  // Preload all frames
  useEffect(() => {
    const images: HTMLImageElement[] = [];
    let loaded = 0;

    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image();
      const frameNum = String(i).padStart(3, '0');
      img.src = `/frames/${clubId}/ezgif-frame-${frameNum}.jpg`;
      img.onload = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === TOTAL_FRAMES) setAllLoaded(true);
      };
      img.onerror = () => {
        loaded++;
        setLoadedCount(loaded);
        if (loaded === TOTAL_FRAMES) setAllLoaded(true);
      };
      images[i - 1] = img;
    }
    imagesRef.current = images;
    return () => { imagesRef.current = []; };
  }, [clubId]);

  // Draw a specific frame to canvas
  const drawFrame = useCallback((index: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = imagesRef.current[index];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
    }
    ctx.drawImage(img, 0, 0);
  }, []);

  // Auto-play loop using requestAnimationFrame
  useEffect(() => {
    if (!allLoaded || !isPlaying) return;

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= FRAME_DURATION) {
        lastTimeRef.current = timestamp - (elapsed % FRAME_DURATION);
        const nextFrame = (frameRef.current + 1) % TOTAL_FRAMES;
        frameRef.current = nextFrame;
        setCurrentFrame(nextFrame);
        drawFrame(nextFrame);
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [allLoaded, isPlaying, drawFrame]);

  // Draw first frame when loaded
  useEffect(() => {
    if (allLoaded) drawFrame(0);
  }, [allLoaded, drawFrame]);

  // Scrub bar handler
  const handleScrub = (e: React.ChangeEvent<HTMLInputElement>) => {
    const frame = parseInt(e.target.value);
    frameRef.current = frame;
    setCurrentFrame(frame);
    drawFrame(frame);
  };

  // Replay
  const handleReplay = () => {
    frameRef.current = 0;
    setCurrentFrame(0);
    drawFrame(0);
    lastTimeRef.current = 0;
    setIsPlaying(true);
  };

  // Close with Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') { e.preventDefault(); setIsPlaying(p => !p); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const loadProgress = Math.round((loadedCount / TOTAL_FRAMES) * 100);
  const playProgress = ((currentFrame + 1) / TOTAL_FRAMES) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.3 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 bg-black/80 backdrop-blur z-10">
          <div>
            <h2 className="text-white text-xl font-bold">{clubName}</h2>
            <p className="text-white/50 text-xs">Press Space to play/pause · Esc to close</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Canvas area */}
        <div className="flex-1 flex items-center justify-center overflow-hidden bg-black relative">
          {!allLoaded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
              <div className="w-72 h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadProgress}%` }}
                  transition={{ duration: 0.2 }}
                />
              </div>
              <p className="text-white/50 text-sm">Loading frames... {loadProgress}%</p>
            </div>
          )}
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              opacity: allLoaded ? 1 : 0,
            }}
          />
        </div>

        {/* Bottom controls */}
        {allLoaded && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-6 py-4 bg-black/80 backdrop-blur flex items-center gap-4 z-10"
          >
            <button
              onClick={() => setIsPlaying(p => !p)}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
            </button>
            <button
              onClick={handleReplay}
              className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/20 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Scrub bar */}
            <div className="flex-1 relative">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-[width] duration-75"
                  style={{ width: `${playProgress}%` }}
                />
              </div>
              <input
                type="range"
                min={0}
                max={TOTAL_FRAMES - 1}
                value={currentFrame}
                onChange={handleScrub}
                onMouseDown={() => setIsPlaying(false)}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            <span className="text-white/40 text-xs font-mono min-w-[80px] text-right">
              {currentFrame + 1} / {TOTAL_FRAMES}
            </span>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default ClubFrameAnimation;
