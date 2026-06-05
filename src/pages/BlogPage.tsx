import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Search, Clock, ArrowRight } from "lucide-react";
import { formatBlogDate } from "@/lib/blog";

const BlogPage = () => {
  const [search, setSearch] = useState("");
  const [activeCat, setActiveCat] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["blog-categories-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["blog-posts-public"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name, slug, color)")
        .eq("status", "published")
        .order("published_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });

  const featured = useMemo(
    () => posts?.find((p) => p.is_featured) || posts?.[0],
    [posts]
  );

  const rest = useMemo(() => {
    if (!posts) return [];
    return posts
      .filter((p) => p.id !== featured?.id)
      .filter((p) => !activeCat || p.category_id === activeCat)
      .filter((p) =>
        !search ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.lead || "").toLowerCase().includes(search.toLowerCase())
      );
  }, [posts, featured, activeCat, search]);

  return (
    <div className="min-h-screen bg-background pt-24 pb-20">
      {/* Header */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-bordeaux">
            Diário Editorial
          </span>
          <h1 className="font-display text-4xl sm:text-6xl text-foreground mt-3 leading-[1.05]">
            Blog Sollaris
          </h1>
          <p className="text-sm sm:text-base text-foreground/65 mt-5 max-w-xl mx-auto leading-relaxed">
            Curadoria, tendências e os bastidores da joalheria que pensamos com intenção.
          </p>
        </motion.div>
      </section>

      {/* Featured hero */}
      {featured && (
        <section className="max-w-[1400px] mx-auto px-5 sm:px-8 mb-14">
          <motion.article
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            <Link
              to={`/blog/${featured.slug}`}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 group items-center"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-muted">
                {featured.cover_image ? (
                  <img
                    src={featured.cover_image}
                    alt={featured.title}
                    className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.04]"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
                )}
                <span className="absolute top-4 left-4 bg-background/95 backdrop-blur px-3 py-1 font-mono text-[9px] uppercase tracking-[0.24em] text-bordeaux">
                  Em destaque
                </span>
              </div>
              <div>
                {(featured as any).blog_categories && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-bordeaux">
                    {(featured as any).blog_categories.name}
                  </span>
                )}
                <h2 className="font-display text-3xl sm:text-5xl text-foreground mt-3 leading-[1.05] group-hover:text-bordeaux transition-colors">
                  {featured.title}
                </h2>
                {featured.lead && (
                  <p className="text-base text-foreground/65 mt-5 leading-relaxed line-clamp-3">
                    {featured.lead}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/50">
                  <span>{formatBlogDate(featured.published_at)}</span>
                  <span className="h-px w-6 bg-foreground/20" />
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3 w-3" /> {featured.reading_time_minutes} min
                  </span>
                </div>
                <span className="inline-flex items-center gap-2 mt-7 font-mono text-[10px] uppercase tracking-[0.28em] text-bordeaux border-b border-bordeaux/30 pb-1 group-hover:gap-3 transition-all">
                  Ler artigo <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          </motion.article>
        </section>
      )}

      {/* Filters */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8 mb-10">
        <div className="border-t border-b border-border py-5 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setActiveCat(null)}
              className={`font-mono text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 rounded-full transition ${
                !activeCat
                  ? "bg-bordeaux text-maison-creme"
                  : "text-foreground/60 hover:text-bordeaux"
              }`}
            >
              Tudo
            </button>
            {categories?.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCat(c.id)}
                className={`font-mono text-[10px] uppercase tracking-[0.22em] px-3 py-1.5 rounded-full transition ${
                  activeCat === c.id
                    ? "bg-bordeaux text-maison-creme"
                    : "text-foreground/60 hover:text-bordeaux"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="relative sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-foreground/40" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar artigos…"
              className="w-full bg-transparent border border-border rounded-full pl-9 pr-4 py-2 text-xs focus:outline-none focus:border-bordeaux/50"
            />
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-[1400px] mx-auto px-5 sm:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-4">
                <div className="aspect-[4/5] bg-muted/50 animate-pulse rounded-md" />
                <div className="h-5 bg-muted/50 animate-pulse w-3/4" />
                <div className="h-3 bg-muted/40 animate-pulse w-1/2" />
              </div>
            ))}
          </div>
        ) : rest.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/50">
              Nenhum artigo encontrado
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14">
            {rest.map((p: any, i) => (
              <motion.article
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.36) }}
              >
                <Link to={`/blog/${p.slug}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden bg-muted rounded-md mb-5">
                    {p.cover_image ? (
                      <img
                        src={p.cover_image}
                        alt={p.title}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/10" />
                    )}
                  </div>
                  {p.blog_categories && (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-bordeaux">
                      {p.blog_categories.name}
                    </span>
                  )}
                  <h3 className="font-display text-xl sm:text-2xl text-foreground mt-2 leading-[1.15] group-hover:text-bordeaux transition-colors">
                    {p.title}
                  </h3>
                  {p.lead && (
                    <p className="text-sm text-foreground/60 mt-3 leading-relaxed line-clamp-2">
                      {p.lead}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-4 font-mono text-[9.5px] uppercase tracking-[0.22em] text-foreground/50">
                    <span>{formatBlogDate(p.published_at)}</span>
                    <span className="h-px w-4 bg-foreground/20" />
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {p.reading_time_minutes} min
                    </span>
                  </div>
                </Link>
              </motion.article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default BlogPage;
