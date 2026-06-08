import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import lookbookImg from "@/assets/lookbook-1.jpg";
import { useSiteContent } from "@/hooks/useSiteContent";

const EditorialBlock = () => {
  const { get } = useSiteContent();
  const c = get("editorial");
  return (
    <section className="bg-maison-creme-warm py-20 sm:py-28">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
        <div className="grid md:grid-cols-2 gap-10 sm:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7 }}
            className="aspect-[4/5] overflow-hidden bg-muted"
          >
            <img
              src={lookbookImg}
              alt="Editorial Sollaris"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-bordeaux mb-4">
              {c.eyebrow}
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl tracking-tight leading-[1.05] mb-6 text-foreground">
              {c.title_line1}<br />
              <em className="not-italic font-display italic text-bordeaux">{c.title_line2}</em>
            </h2>
            <p className="font-sans text-foreground/75 leading-relaxed text-[15px] mb-4 whitespace-pre-line">
              {c.paragraph1}
            </p>
            <p className="font-sans text-foreground/75 leading-relaxed text-[15px] mb-8 whitespace-pre-line">
              {c.paragraph2}
            </p>
            <Link
              to="/sobre"
              className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bordeaux border-b border-bordeaux/40 pb-1 hover:border-bordeaux transition-colors"
            >
              {c.cta_label}
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default EditorialBlock;
