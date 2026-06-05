import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, Clock } from "lucide-react";
import { formatBlogDate } from "@/lib/blog";

const BlogPreview = () => {
  const { data: posts } = useQuery({
    queryKey: ["blog-preview-home"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, lead, slug, cover_image, published_at, reading_time_minutes, blog_categories(name)")
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) return [];
      return data || [];
    },
  });

  if (!posts || posts.length === 0) return null;

  return (
    <section className="bg-background py-16 sm:py-24">
      <div className="max-w-[1400px] mx-auto px-6 sm:px-10">
        <div className="flex items-end justify-between gap-6 mb-10 sm:mb-14">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-bordeaux mb-3">
              Diário Editorial
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-foreground tracking-tight leading-tight">
              Do nosso blog
            </h2>
          </div>
          <Link
            to="/blog"
            className="hidden sm:inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-foreground/70 hover:text-bordeaux transition-colors group whitespace-nowrap"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" strokeWidth={1.6} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {posts.map((post: any, i: number) => (
            <motion.article
              key={post.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Link to={`/blog/${post.slug}`} className="group block">
                <div className="aspect-[4/3] overflow-hidden bg-muted rounded-sm mb-5">
                  {post.cover_image ? (
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-muted to-bordeaux/10" />
                  )}
                </div>
                {(post as any).blog_categories && (
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-bordeaux">
                    {(post as any).blog_categories.name}
                  </span>
                )}
                <h3 className="font-display text-xl sm:text-2xl text-foreground mt-2 leading-[1.15] group-hover:text-bordeaux transition-colors line-clamp-2">
                  {post.title}
                </h3>
                {post.lead && (
                  <p className="text-sm text-foreground/60 mt-3 leading-relaxed line-clamp-2">
                    {post.lead}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-4 font-mono text-[9.5px] uppercase tracking-[0.22em] text-foreground/50">
                  <span>{formatBlogDate(post.published_at)}</span>
                  <span className="h-px w-4 bg-foreground/20" />
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" /> {post.reading_time_minutes} min
                  </span>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        <div className="sm:hidden mt-8 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.28em] text-bordeaux border-b border-bordeaux/40 pb-1"
          >
            Ver todos os artigos <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default BlogPreview;
