import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import heroImage from "@/assets/hero-bg.jpg";

interface SiteBanner {
  id: string;
  subtitle: string | null;
  heading: string | null;
  description: string | null;
  image_url: string | null;
  button_2_label: string | null;
  button_2_url: string | null;
  order_index: number;
}

const useActiveBanner = () =>
  useQuery<SiteBanner | null>({
    queryKey: ["site-banners"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_banners")
        .select("id, subtitle, heading, description, image_url, button_2_label, button_2_url, order_index")
        .eq("is_active", true)
        .order("order_index", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data as SiteBanner | null;
    },
    staleTime: 60 * 1000,
  });

const DEFAULT = {
  subtitle: "Nova Coleção · Outono 2026",
  heading: "Joias para o\ndia a dia que importa.",
  description:
    "Banho de ouro 18k e garantia Sollaris de 1 ano no banho. Peças pensadas para você usar todo dia, sem medo.",
  image_url: null as string | null,
  button_2_label: null as string | null,
  button_2_url: null as string | null,
};

const HeroBanner = () => {
  const { data: banner } = useActiveBanner();

  const content = banner
    ? {
        subtitle: banner.subtitle || DEFAULT.subtitle,
        heading: banner.heading || DEFAULT.heading,
        description: banner.description || DEFAULT.description,
        image_url: banner.image_url || DEFAULT.image_url,
        button_2_label: banner.button_2_label,
        button_2_url: banner.button_2_url,
      }
    : DEFAULT;

  const imgSrc = content.image_url || heroImage;

  return (
    <section className="relative w-full h-[68vh] min-h-[520px] max-h-[760px] overflow-hidden bg-maison-creme-warm">
      {/* Image */}
      <div className="absolute inset-0">
        <img
          src={imgSrc}
          alt="Joias Sollaris — coleção atemporal"
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative h-full max-w-[1400px] mx-auto px-6 sm:px-10 flex items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl text-maison-creme"
        >
          <p className="font-mono text-[10.5px] uppercase tracking-[0.32em] text-maison-gold-soft mb-5">
            {content.subtitle}
          </p>
          <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight mb-6 whitespace-pre-line">
            {content.heading}
          </h1>
          <p className="font-sans text-base sm:text-lg text-maison-creme/85 leading-relaxed mb-9 max-w-md">
            {content.description}
          </p>
          <div className="flex flex-wrap items-center gap-4">
            {/* Fixed button */}
            <Link
              to="/colecao"
              className="inline-flex items-center gap-3 bg-maison-creme text-maison-bordeaux font-mono text-[11px] uppercase tracking-[0.22em] px-8 py-4 hover:bg-maison-gold hover:text-foreground transition-all duration-300 group"
            >
              Ver coleção
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={1.6} />
            </Link>

            {/* Configurable button */}
            {content.button_2_label && content.button_2_url && (
              <Link
                to={content.button_2_url}
                className="inline-flex items-center gap-3 border border-maison-creme/60 text-maison-creme font-mono text-[11px] uppercase tracking-[0.22em] px-8 py-4 hover:border-maison-gold hover:text-maison-gold transition-all duration-300 group"
              >
                {content.button_2_label}
                <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={1.6} />
              </Link>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroBanner;
