import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import img1 from "@/assets/uploads/Elegant_editorial_39f35f167c.jpeg";
import img2 from "@/assets/uploads/Gold_choker_necklace_with_stones_5c0fa1201d.jpeg";
import img3 from "@/assets/uploads/Dramatic_closeup_neck_8d451d02d9.jpeg";
import img4 from "@/assets/uploads/Womans_ear_with_gold_jewelry_2d2145e569.jpeg";
import img5 from "@/assets/uploads/Woman_touching_gold_bracelet_7475e92bd8.jpeg";
import img6 from "@/assets/uploads/Jewelry_gift_set_on_fabric_3e4d4a7e02.jpeg";

const PHOTOS = [
  { src: img1, alt: "Editorial Sollaris" },
  { src: img2, alt: "Colar banhado a ouro" },
  { src: img3, alt: "Close editorial pescoço" },
  { src: img4, alt: "Brincos dourados" },
  { src: img5, alt: "Pulseira banhada a ouro" },
  { src: img6, alt: "Conjunto de joias" },
];

const LookbookStrip = () => (
  <section className="bg-background py-10 sm:py-14">
    <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
      <div className="flex items-end justify-between gap-4 mb-7 sm:mb-10">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bordeaux mb-2">
            Lookbook
          </p>
          <h2 className="font-display text-[26px] sm:text-[40px] leading-[1.05] text-foreground">
            Veja como usar
          </h2>
        </div>
        <Link
          to="/vitrine"
          className="hidden sm:inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60 hover:text-bordeaux transition-colors group whitespace-nowrap"
        >
          Ver vitrine
          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" strokeWidth={1.6} />
        </Link>
      </div>

      <div className="-mx-6 sm:-mx-10 px-6 sm:px-10 overflow-x-auto scrollbar-hide">
        <div className="flex gap-3 sm:gap-4 pb-2">
          {PHOTOS.map((photo, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.97 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              className="flex-shrink-0"
            >
              <Link
                to="/vitrine"
                className="group block relative w-[180px] sm:w-[240px] aspect-[3/4] overflow-hidden bg-muted"
              >
                <img
                  src={photo.src}
                  alt={photo.alt}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-500" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="sm:hidden mt-6 text-center">
        <Link
          to="/vitrine"
          className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-bordeaux border-b border-bordeaux/40 pb-1"
        >
          Ver vitrine <ArrowRight className="h-3 w-3" strokeWidth={1.6} />
        </Link>
      </div>
    </div>
  </section>
);

export default LookbookStrip;
