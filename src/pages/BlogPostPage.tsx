import { useEffect } from "react";
import { Link, useParams, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DOMPurify from "dompurify";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Share2 } from "lucide-react";
import { formatBlogDate } from "@/lib/blog";
import { toast } from "sonner";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();

  const { data: post, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name, slug, color)")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: related } = useQuery({
    queryKey: ["blog-related", post?.category_id, post?.id],
    queryFn: async () => {
      if (!post) return [];
      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, slug, title, lead, cover_image, reading_time_minutes, published_at, blog_categories(name, color)")
        .eq("status", "published")
        .eq("category_id", post.category_id as string)
        .neq("id", post.id)
        .order("published_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
    enabled: !!post?.category_id,
  });

  // Increment views once
  useEffect(() => {
    if (post?.slug) {
      supabase.rpc("increment_blog_post_views", { _slug: post.slug });
    }
  }, [post?.slug]);

  // SEO
  useEffect(() => {
    if (!post) return;
    const prevTitle = document.title;
    document.title = post.seo_title || `${post.title} · Blog Sollaris`;

    const setMeta = (name: string, content: string, isProperty = false) => {
      const attr = isProperty ? "property" : "name";
      let tag = document.head.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(attr, name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };

    const desc = post.seo_description || post.lead || "";
    setMeta("description", desc);
    setMeta("og:title", post.title, true);
    setMeta("og:description", desc, true);
    setMeta("og:type", "article", true);
    setMeta("og:url", `/blog/${post.slug}`, true);
    if (post.og_image || post.cover_image) setMeta("og:image", post.og_image || post.cover_image!, true);

    // Canonical
    let canonical = document.head.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `/blog/${post.slug}`;

    // JSON-LD
    const ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: desc,
      image: post.cover_image || post.og_image,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Person", name: post.author_name || "Sollaris" },
    });
    ld.id = "blog-post-ld";
    document.head.appendChild(ld);

    return () => {
      document.title = prevTitle;
      document.getElementById("blog-post-ld")?.remove();
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <div className="h-5 w-5 border-2 border-bordeaux/30 border-t-bordeaux rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !post) {
    return <Navigate to="/blog" replace />;
  }

  const sanitized = DOMPurify.sanitize(post.content || "", {
    ALLOWED_TAGS: [
      "p", "h2", "h3", "h4", "strong", "em", "u", "a", "ul", "ol", "li",
      "blockquote", "img", "hr", "br", "span", "code", "pre",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "class", "target", "rel"],
  });

  const share = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: post.title, url }); } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("Link copiado");
    }
  };

  return (
    <article className="min-h-screen bg-background pt-24 pb-20">
      {/* Cover */}
      {post.cover_image && (
        <div className="relative h-[55vh] sm:h-[68vh] max-h-[720px] overflow-hidden bg-muted">
          <motion.img
            initial={{ scale: 1.08 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
            src={post.cover_image}
            alt={post.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
        </div>
      )}

      <header className="max-w-3xl mx-auto px-5 sm:px-8 -mt-20 sm:-mt-32 relative">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="bg-background/95 backdrop-blur-xl border border-border rounded-lg p-7 sm:p-10"
        >
          <div className="flex items-center gap-3 flex-wrap font-mono text-[10px] uppercase tracking-[0.24em]">
            {(post as any).blog_categories && (
              <span className="text-bordeaux">{(post as any).blog_categories.name}</span>
            )}
            <span className="h-px w-4 bg-foreground/20" />
            <span className="text-foreground/55">{formatBlogDate(post.published_at)}</span>
            <span className="h-px w-4 bg-foreground/20" />
            <span className="inline-flex items-center gap-1.5 text-foreground/55">
              <Clock className="h-3 w-3" /> {post.reading_time_minutes} min de leitura
            </span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl text-foreground mt-5 leading-[1.05]">
            {post.title}
          </h1>
          {post.subtitle && (
            <p className="font-display text-lg sm:text-xl text-foreground/65 mt-4 italic leading-snug">
              {post.subtitle}
            </p>
          )}
          {post.lead && (
            <p className="text-base sm:text-lg text-foreground/70 mt-6 leading-relaxed">
              {post.lead}
            </p>
          )}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-border">
            {post.author_name ? (
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-bordeaux text-maison-creme flex items-center justify-center font-mono text-[11px] uppercase">
                  {post.author_name.slice(0, 2)}
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-foreground/45">Por</p>
                  <p className="text-sm font-medium text-foreground">{post.author_name}</p>
                </div>
              </div>
            ) : <span />}
            <button
              onClick={share}
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.24em] text-bordeaux border-b border-bordeaux/30 pb-1 hover:gap-3 transition-all"
            >
              <Share2 className="h-3 w-3" /> Compartilhar
            </button>
          </div>
        </motion.div>
      </header>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 mt-14">
        <div
          className="prose prose-lg max-w-none font-body
            prose-headings:font-display prose-headings:text-foreground prose-headings:tracking-tight
            prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-4
            prose-h3:text-2xl prose-h3:mt-10 prose-h3:mb-3
            prose-p:text-foreground/80 prose-p:leading-relaxed prose-p:text-[17px]
            prose-a:text-bordeaux prose-a:no-underline hover:prose-a:underline
            prose-strong:text-foreground
            prose-blockquote:border-l-bordeaux prose-blockquote:font-display prose-blockquote:text-xl prose-blockquote:italic prose-blockquote:text-foreground/75
            prose-img:rounded-md
            prose-hr:border-border prose-hr:my-12"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-14 pt-8 border-t border-border flex items-center gap-2 flex-wrap">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-foreground/45 mr-1">Tags:</span>
            {post.tags.map((t: string) => (
              <span key={t} className="font-mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1 border border-border rounded-full text-foreground/65">
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.28em] text-foreground/60 hover:text-bordeaux transition"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar ao blog
          </Link>
        </div>
      </div>

      {/* Related */}
      {related && related.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-5 sm:px-8 mt-24 pt-14 border-t border-border">
          <h2 className="font-display text-2xl sm:text-3xl text-foreground mb-8">
            Continue lendo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-8 gap-y-10">
            {related.map((r: any) => (
              <Link key={r.id} to={`/blog/${r.slug}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden bg-muted rounded-md mb-4">
                  {r.cover_image && (
                    <img src={r.cover_image} alt={r.title} loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.04]" />
                  )}
                </div>
                {r.blog_categories && (
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.26em] text-bordeaux">
                    {r.blog_categories.name}
                  </span>
                )}
                <h3 className="font-display text-lg sm:text-xl text-foreground mt-2 leading-[1.15] group-hover:text-bordeaux transition-colors">
                  {r.title}
                </h3>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
};

export default BlogPostPage;
