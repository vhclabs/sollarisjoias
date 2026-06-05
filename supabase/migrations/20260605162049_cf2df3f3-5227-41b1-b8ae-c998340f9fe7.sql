
-- Categorias do blog
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  color text DEFAULT '#c9a84c',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.blog_categories TO anon, authenticated;
GRANT ALL ON public.blog_categories TO authenticated;
GRANT ALL ON public.blog_categories TO service_role;

ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read blog_categories" ON public.blog_categories
  FOR SELECT USING (true);

CREATE POLICY "Admins manage blog_categories" ON public.blog_categories
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Artigos
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  slug text NOT NULL UNIQUE,
  lead text,
  content text NOT NULL DEFAULT '',
  cover_image text,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  author_id uuid,
  author_name text,
  tags text[] DEFAULT '{}'::text[],
  reading_time_minutes integer DEFAULT 3,
  is_featured boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'draft',
  published_at timestamptz,
  seo_title text,
  seo_description text,
  og_image text,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX blog_posts_status_published_at_idx ON public.blog_posts(status, published_at DESC);
CREATE INDEX blog_posts_category_idx ON public.blog_posts(category_id);

GRANT SELECT ON public.blog_posts TO anon, authenticated;
GRANT ALL ON public.blog_posts TO authenticated;
GRANT ALL ON public.blog_posts TO service_role;

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read published blog_posts" ON public.blog_posts
  FOR SELECT USING (status = 'published');

CREATE POLICY "Admins read all blog_posts" ON public.blog_posts
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage blog_posts" ON public.blog_posts
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Função para incrementar views (qualquer um pode chamar)
CREATE OR REPLACE FUNCTION public.increment_blog_post_views(_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.blog_posts
  SET views_count = views_count + 1
  WHERE slug = _slug AND status = 'published';
$$;

GRANT EXECUTE ON FUNCTION public.increment_blog_post_views(text) TO anon, authenticated;

-- Seed categorias
INSERT INTO public.blog_categories (name, slug, color) VALUES
  ('Curadoria', 'curadoria', '#c9a84c'),
  ('Tendências', 'tendencias', '#d4b86a'),
  ('Cuidados', 'cuidados', '#a88b3d'),
  ('Editorial', 'editorial', '#e8c878'),
  ('Por Trás da Marca', 'por-tras-da-marca', '#b89538');
