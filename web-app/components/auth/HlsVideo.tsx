"use client";

import { useEffect, useRef } from "react";

export function HlsVideo({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari — native HLS
      video.src = src;
      return;
    }

    let hls: import("hls.js").default | null = null;
    import("hls.js").then(({ default: Hls }) => {
      if (!Hls.isSupported() || !videoRef.current) return;
      hls = new Hls({ autoStartLoad: true, startLevel: -1 });
      hls.loadSource(src);
      hls.attachMedia(videoRef.current);
    });

    return () => {
      hls?.destroy();
    };
  }, [src]);

  return (
    <video
      ref={videoRef}
      autoPlay
      loop
      muted
      playsInline
      className={className}
    />
  );
}
