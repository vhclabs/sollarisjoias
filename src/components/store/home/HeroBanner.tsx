import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-bg.jpg";
import heroVideo from "@/assets/hero-video.mp4";
import { useSiteContent } from "@/hooks/useSiteContent";

const HeroBanner = () => {
  const { get } = useSiteContent();
  const hero = get("hero");
  const media = get("hero_media");
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoReady, setVideoReady] = useState(false);

  const useCustomImage = media.type === "image" && !!media.url;
  const useCustomVideo = media.type === "video" && !!media.url;
  const useDefaultVideo = media.type === "default" || (!useCustomImage && !useCustomVideo);

  const posterSrc = media.poster_url || (useCustomImage ? media.url : heroImage);
  const videoSrc = useCustomVideo ? media.url : heroVideo;
  const showVideo = useCustomVideo || useDefaultVideo;

  useEffect(() => {
    if (!showVideo) {
      setVideoReady(false);
      return;
    }
    const v = videoRef.current;
    if (!v) return;
    setVideoReady(false);
    // Se o vídeo já tem dados (loadeddata pode ter disparado antes do listener),
    // marcamos como pronto na hora — corrige race condition.
    if (v.readyState >= 2) {
      setVideoReady(true);
    }
    const onReady = () => setVideoReady(true);
    const onError = () => setVideoReady(false);
    v.addEventListener("loadeddata", onReady);
    v.addEventListener("canplay", onReady);
    v.addEventListener("error", onError);
    v.play().catch(() => {});
    return () => {
      v.removeEventListener("loadeddata", onReady);
      v.removeEventListener("canplay", onReady);
      v.removeEventListener("error", onError);
    };
  }, [videoSrc, showVideo]);

  return (
    <section className="relative w-full h-[68vh] min-h-[520px] max-h-[760px] overflow-hidden bg-black">
      {/* Poster / imagem custom (fallback) */}
      <img
        src={posterSrc}
        alt="Joias Sollaris — coleção atemporal"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          showVideo && videoReady ? "opacity-0" : "opacity-100"
        }`}
        loading="eager"
      />

      {/* Vídeo de abertura (apenas quando aplicável) */}
      {showVideo && (
        <motion.video
          ref={videoRef}
          key={videoSrc}
          initial={{ scale: 1.08, opacity: 0 }}
          animate={{ scale: 1, opacity: videoReady ? 1 : 0 }}
          transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
          className="absolute inset-0 w-full h-full object-cover"
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster={posterSrc}
        />
      )}

      {/* Overlays para escurecer e destacar texto */}
      <div className="absolute inset-0 bg-black/55" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/45 to-black/30" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

      {/* Vignette sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      {/* Content */}
      <div className="relative h-full max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl text-maison-creme"
          style={{ textShadow: "0 2px 24px rgba(0,0,0,0.6)" }}
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-maison-gold-soft mb-5">
            {hero.eyebrow}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight mb-6">
            {hero.title_line1}<br />
            <em className="not-italic font-display italic text-maison-gold-soft">{hero.title_line2}</em>
          </h1>
          <p className="font-sans text-base sm:text-lg text-maison-creme/90 leading-relaxed mb-9 max-w-md">
            {hero.subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/colecao"
              className="inline-flex items-center gap-3 bg-maison-creme text-maison-bordeaux font-mono text-[11px] uppercase tracking-[0.22em] px-8 py-4 hover:bg-maison-gold hover:text-foreground transition-all duration-300 group"
            >
              {hero.cta_label}
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={1.6} />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
