"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize2, Sparkles, Activity } from "lucide-react";

interface EngineShowcaseProps {
  title?: string;
  subtitle?: string;
  autoPlay?: boolean;
  compact?: boolean;
}

export function EngineShowcase({
  title = "ENGINE//OS CORE VISUAL PIPELINE",
  subtitle = "Real-time rendering, physics simulation, and architectural visualization engine.",
  autoPlay = true,
  compact = false,
}: EngineShowcaseProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Respect user's motion preferences per modern web guidance
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    }

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
      if (e.matches && videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    };

    motionQuery.addEventListener("change", handleMotionChange);
    return () => motionQuery.removeEventListener("change", handleMotionChange);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !videoRef.current.muted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div className={`engine-showcase-wrap ${compact ? "compact" : ""}`} ref={containerRef}>
      <div className="engine-showcase-frame">
        {/* HUD Top Bar */}
        <div className="engine-showcase-hud">
          <div className="hud-badge">
            <span className="hud-dot" />
            <span className="hud-label">ENGINE//CORE REEL</span>
          </div>
          <div className="hud-telemetry">
            <span className="hud-metric"><Activity size={12} className="cyan" /> 60 FPS</span>
            <span className="hud-metric">4K DCI</span>
            <span className="hud-metric"><Sparkles size={12} className="gold" /> REAL-TIME</span>
          </div>
        </div>

        {/* Video Element compliant with modern-web-guidance (lazy-load-video-and-audio) */}
        <div className="video-viewport">
          <video
            ref={videoRef}
            src="https://assets.cdn.filesafe.space/1iUkTwVsmyz7T0PnMiFY/media/6a2ddd71fe75e6864781301f.mp4"
            width={1280}
            height={720}
            preload="metadata"
            muted={isMuted}
            loop
            playsInline
            autoPlay={autoPlay && !prefersReducedMotion}
            className="engine-video-element"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            aria-label="NOTREAL ENGINE Showcase Reel"
            {...({ loading: "lazy" } as Record<string, unknown>)}
          />

          {/* Ambient Cyber Neon Gradient Overlay */}
          <div className="video-ambient-overlay" aria-hidden="true" />

          {/* Overlay Controls */}
          <div className="engine-video-controls" role="toolbar" aria-label="Engine Video Controls">
            <button
              type="button"
              className="ctrl-btn play-ctrl"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pause video" : "Play video"}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
              <span className="ctrl-text">{isPlaying ? "PAUSE" : "PLAY"}</span>
            </button>

            <button
              type="button"
              className="ctrl-btn mute-ctrl"
              onClick={toggleMute}
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span className="ctrl-text">{isMuted ? "MUTED" : "AUDIO"}</span>
            </button>

            <button
              type="button"
              className="ctrl-btn fs-ctrl"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              <Maximize2 size={18} />
            </button>
          </div>
        </div>

        {/* Footer Meta */}
        <div className="engine-showcase-footer">
          <div>
            <h3 className="showcase-title">{title}</h3>
            <p className="showcase-subtitle">{subtitle}</p>
          </div>
          <div className="showcase-status">
            <span className="mono status-tag ready">HARDWARE-ACCELERATED</span>
          </div>
        </div>
      </div>
    </div>
  );
}
