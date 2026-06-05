import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Save, Send, Upload, ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { toast } from "sonner";
import { RichTextEditor } from "@/components/admin/editorial/RichTextEditor";
import { slugify, calcReadingMinutes } from "@/lib/blog";

type FormState = {
  title: string;
  subtitle: string;
  slug: string;
  lead: string;
  content: string;
  cover_image: string;
  category_id: string | null;
  author_name: string;
  tags: string[];
  reading_time_minutes: number;
  is_featured: boolean;
  status: "draft" | "published";
  published_at: string | null;
  seo_title: string;
  seo_description: string;
  og_image: string;
};

const empty: FormState = {
  title: "",
  subtitle: "",
  slug: "",
  lead: "",
  content: "",
  cover_image: "",
  category_id: null,
  author_name: "",
  tags: [],
  reading_time_minutes: 3,
  is_featured: false,
  status: "draft",
  published_at: null,
  seo_title: "",
  seo_description: "",
  og_image: "",
};

const AdminEditorialEdit = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [form, setForm] = useState<FormState>(empty);
  const [tagInput, setTagInput] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: post } = useQuery({
    queryKey: ["admin-blog-post", id],
    queryFn: async () => {
      if (isNew) return null;
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("blog_categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (post) {
      setForm({
        title: post.title || "",
        subtitle: post.subtitle || "",
        slug: post.slug || "",
        lead: post.lead || "",
        content: post.content || "",
        cover_image: post.cover_image || "",
        category_id: post.category_id,
        author_name: post.author_name || "",
        tags: post.tags || [],
        reading_time_minutes: post.reading_time_minutes || 3,
        is_featured: post.is_featured,
        status: (post.status as "draft" | "published") || "draft",
        published_at: post.published_at,
        seo_title: post.seo_title || "",
        seo_description: post.seo_description || "",
        og_image: post.og_image || "",
      });
      setSlugTouched(true);
    }
  }, [post]);

  // auto-slug from title
  useEffect(() => {
    if (!slugTouched && form.title) {
      setForm((f) => ({ ...f, slug: slugify(f.title) }));
    }
  }, [form.title, slugTouched]);

  // auto reading time
  useEffect(() => {
    setForm((f) => ({ ...f, reading_time_minutes: calcReadingMinutes(f.content) }));
  }, [form.content]);

  const uploadImage = async (file: File): Promise<string | null> => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      return data.publicUrl;
    } catch (e: any) {
      toast.error(e.message || "Falha no upload");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const onUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm({ ...form, cover_image: url });
  };

  const onInsertContentImage = async (): Promise<string | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const url = await uploadImage(file);
        resolve(url);
      };
      input.click();
    });
  };

  const save = useMutation({
    mutationFn: async (publish?: boolean) => {
      if (!form.title.trim()) throw new Error("Título é obrigatório");
      if (!form.slug.trim()) throw new Error("Slug é obrigatório");

      const payload: any = {
        title: form.title.trim(),
        subtitle: form.subtitle.trim() || null,
        slug: form.slug.trim(),
        lead: form.lead.trim() || null,
        content: form.content,
        cover_image: form.cover_image || null,
        category_id: form.category_id,
        author_id: user?.id,
        author_name: form.author_name.trim() || null,
        tags: form.tags,
        reading_time_minutes: form.reading_time_minutes,
        is_featured: form.is_featured,
        status: publish ? "published" : form.status,
        seo_title: form.seo_title.trim() || null,
        seo_description: form.seo_description.trim() || null,
        og_image: form.og_image.trim() || null,
      };

      if (publish && !form.published_at) {
        payload.published_at = new Date().toISOString();
      } else if (form.published_at) {
        payload.published_at = form.published_at;
      }

      if (isNew) {
        const { data, error } = await supabase.from("blog_posts").insert(payload).select("id").single();
        if (error) throw error;
        return data.id;
      } else {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id!);
        if (error) throw error;
        return id!;
      }
    },
    onSuccess: (newId, publish) => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      qc.invalidateQueries({ queryKey: ["admin-blog-post", newId] });
      toast.success(publish ? "Artigo publicado!" : "Artigo salvo");
      if (isNew) navigate(`/admin/editorial/${newId}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm({ ...form, tags: [...form.tags, t] });
    }
    setTagInput("");
  };

  return (
    <div className="max-w-[1400px] space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/admin/editorial"
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold truncate">{isNew ? "Novo artigo" : "Editar artigo"}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {form.status === "published" ? "Publicado" : "Rascunho"} · {form.reading_time_minutes} min de leitura
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && form.status === "published" && (
            <Button asChild variant="outline" size="sm" className="rounded-lg gap-2 h-9 text-xs">
              <a href={`/blog/${form.slug}`} target="_blank" rel="noopener">
                <ExternalLink className="h-3.5 w-3.5" /> Ver
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => save.mutate(false)}
            disabled={save.isPending}
            className="rounded-lg gap-2 h-9 text-xs"
          >
            <Save className="h-3.5 w-3.5" /> Salvar rascunho
          </Button>
          <Button
            size="sm"
            onClick={() => save.mutate(true)}
            disabled={save.isPending}
            className="rounded-lg gap-2 h-9 text-xs"
          >
            <Send className="h-3.5 w-3.5" /> Publicar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
        {/* Editor column */}
        <div className="space-y-4 min-w-0">
          <div className="space-y-3 bg-card border border-border rounded-xl p-4">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Título</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Título do artigo"
                className="rounded-lg h-11 mt-1 text-base font-medium"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Subtítulo</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                placeholder="Subtítulo opcional"
                className="rounded-lg h-9 mt-1 text-sm"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => { setForm({ ...form, slug: slugify(e.target.value) }); setSlugTouched(true); }}
                placeholder="url-do-artigo"
                className="rounded-lg h-9 mt-1 text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Lead / Resumo</Label>
              <Textarea
                value={form.lead}
                onChange={(e) => setForm({ ...form, lead: e.target.value })}
                placeholder="Parágrafo de abertura que aparece no card e no topo do artigo"
                rows={2}
                className="rounded-lg mt-1 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 block">
              Conteúdo
            </Label>
            <RichTextEditor
              value={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              onInsertImage={onInsertContentImage}
              placeholder="Comece a escrever seu artigo…"
            />
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">SEO</h3>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Title</Label>
              <Input
                value={form.seo_title}
                onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                placeholder={form.title}
                className="rounded-lg h-9 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Meta Description</Label>
              <Textarea
                value={form.seo_description}
                onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                placeholder={form.lead}
                rows={2}
                className="rounded-lg mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">OG Image URL</Label>
              <Input
                value={form.og_image}
                onChange={(e) => setForm({ ...form, og_image: e.target.value })}
                placeholder={form.cover_image || "URL para compartilhamento"}
                className="rounded-lg h-9 mt-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Sidebar column */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Publicação</h3>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: "draft" | "published") => setForm({ ...form, status: v })}
              >
                <SelectTrigger className="w-32 h-8 rounded-lg text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">Destaque (hero)</Label>
              <Switch
                checked={form.is_featured}
                onCheckedChange={(v) => setForm({ ...form, is_featured: v })}
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data de publicação</Label>
              <Input
                type="datetime-local"
                value={form.published_at ? new Date(form.published_at).toISOString().slice(0, 16) : ""}
                onChange={(e) => setForm({ ...form, published_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                className="rounded-lg h-9 mt-1 text-xs"
              />
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Imagem de capa</h3>
            {form.cover_image ? (
              <div className="relative group">
                <img src={form.cover_image} alt="" className="w-full aspect-[16/10] object-cover rounded-lg" />
                <button
                  onClick={() => setForm({ ...form, cover_image: "" })}
                  className="absolute top-2 right-2 h-7 w-7 rounded-full bg-background/90 border border-border flex items-center justify-center text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <label className="aspect-[16/10] w-full border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-accent transition">
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {uploading ? "Enviando…" : "Clique para enviar"}
                </span>
                <input type="file" accept="image/*" className="hidden" onChange={onUploadCover} />
              </label>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Organização</h3>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Categoria</Label>
              <Select
                value={form.category_id || ""}
                onValueChange={(v) => setForm({ ...form, category_id: v || null })}
              >
                <SelectTrigger className="h-9 rounded-lg text-xs mt-1">
                  <SelectValue placeholder="Selecionar categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Autor</Label>
              <Input
                value={form.author_name}
                onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                placeholder="Nome do autor"
                className="rounded-lg h-9 mt-1 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tags</Label>
              <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                {form.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted rounded-md text-[10px]"
                  >
                    {t}
                    <button
                      onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder="Adicionar tag e Enter"
                className="rounded-lg h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Tempo de leitura (min)</Label>
              <Input
                type="number"
                min={1}
                value={form.reading_time_minutes}
                onChange={(e) => setForm({ ...form, reading_time_minutes: Math.max(1, Number(e.target.value) || 1) })}
                className="rounded-lg h-9 mt-1 text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminEditorialEdit;
