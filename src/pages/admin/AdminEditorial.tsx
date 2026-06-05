import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Search, Edit3, Copy, Trash2, Eye, EyeOff, FileText, Tag,
} from "lucide-react";
import { toast } from "sonner";
import { formatBlogDate, slugify } from "@/lib/blog";

const AdminEditorial = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [catDialog, setCatDialog] = useState(false);
  const [newCat, setNewCat] = useState({ name: "", color: "#c9a84c" });

  const { data: posts, isLoading } = useQuery({
    queryKey: ["admin-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name, color, slug)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: categories } = useQuery({
    queryKey: ["admin-blog-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Artigo excluído");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePublish = useMutation({
    mutationFn: async (post: any) => {
      const newStatus = post.status === "published" ? "draft" : "published";
      const update: any = { status: newStatus };
      if (newStatus === "published" && !post.published_at) {
        update.published_at = new Date().toISOString();
      }
      const { error } = await supabase.from("blog_posts").update(update).eq("id", post.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Status atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const duplicate = useMutation({
    mutationFn: async (post: any) => {
      const newSlug = `${post.slug}-copia-${Date.now().toString(36).slice(-4)}`;
      const { id, created_at, updated_at, blog_categories, views_count, ...rest } = post;
      const { error } = await supabase
        .from("blog_posts")
        .insert({
          ...rest,
          title: `${post.title} (cópia)`,
          slug: newSlug,
          status: "draft",
          is_featured: false,
          published_at: null,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Artigo duplicado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const createCategory = useMutation({
    mutationFn: async () => {
      if (!newCat.name.trim()) throw new Error("Nome obrigatório");
      const slug = slugify(newCat.name);
      const { error } = await supabase
        .from("blog_categories")
        .insert({ name: newCat.name.trim(), slug, color: newCat.color });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      toast.success("Categoria criada");
      setCatDialog(false);
      setNewCat({ name: "", color: "#c9a84c" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-blog-categories"] });
      qc.invalidateQueries({ queryKey: ["admin-blog-posts"] });
      toast.success("Categoria removida");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = posts?.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (categoryFilter !== "all" && p.category_id !== categoryFilter) return false;
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5 max-w-[1400px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Editorial</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestão dos artigos e categorias do blog Sollaris
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog open={catDialog} onOpenChange={setCatDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="rounded-lg gap-2 h-9 text-xs">
                <Tag className="h-3.5 w-3.5" /> Categorias
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Categorias do Blog</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5 max-h-64 overflow-y-auto">
                  {categories?.map((c) => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2 rounded-md border border-border">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color || "#c9a84c" }} />
                        <span className="text-[13px] font-medium">{c.name}</span>
                        <span className="text-[10px] text-muted-foreground">/{c.slug}</span>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Remover categoria "${c.name}"?`)) deleteCategory.mutate(c.id);
                        }}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-3 space-y-2">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nova categoria</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nome"
                      value={newCat.name}
                      onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                      className="rounded-lg h-9 text-xs"
                    />
                    <input
                      type="color"
                      value={newCat.color}
                      onChange={(e) => setNewCat({ ...newCat, color: e.target.value })}
                      className="h-9 w-12 rounded-lg border border-border bg-transparent cursor-pointer"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => createCategory.mutate()} disabled={!newCat.name} className="rounded-lg">
                  Criar categoria
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button
            size="sm"
            onClick={() => navigate("/admin/editorial/new")}
            className="rounded-lg gap-2 h-9 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Novo artigo
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar artigos…"
            className="rounded-lg pl-9 h-9 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px] h-9 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="published">Publicados</SelectItem>
            <SelectItem value="draft">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px] h-9 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories?.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-card/50 rounded-lg animate-pulse" />)}
        </div>
      ) : !filtered?.length ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl">
          <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum artigo encontrado.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/admin/editorial/new")}
            className="mt-3 rounded-lg gap-2 h-8 text-xs"
          >
            <Plus className="h-3.5 w-3.5" /> Criar primeiro artigo
          </Button>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr className="text-left">
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider">Artigo</th>
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider">Categoria</th>
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider">Status</th>
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider">Atualizado</th>
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider">Views</th>
                <th className="px-3 py-2.5 font-medium text-[11px] uppercase tracking-wider text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p: any) => (
                <tr key={p.id} className="border-t border-border hover:bg-muted/20 transition">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      {p.cover_image ? (
                        <img src={p.cover_image} alt="" className="h-10 w-14 object-cover rounded-md flex-shrink-0" />
                      ) : (
                        <div className="h-10 w-14 rounded-md bg-muted flex-shrink-0 flex items-center justify-center">
                          <FileText className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <Link to={`/admin/editorial/${p.id}`} className="font-medium hover:text-accent truncate block">
                          {p.title}
                          {p.is_featured && <span className="ml-1.5 text-[9px] uppercase tracking-wider text-accent">Destaque</span>}
                        </Link>
                        <p className="text-[10px] text-muted-foreground truncate">/{p.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    {p.blog_categories ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.blog_categories.color }} />
                        <span className="text-[12px]">{p.blog_categories.name}</span>
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-[12px]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant={p.status === "published" ? "default" : "outline"} className="text-[10px]">
                      {p.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-muted-foreground">
                    {formatBlogDate(p.updated_at)}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] tabular-nums">{p.views_count}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        title={p.status === "published" ? "Despublicar" : "Publicar"}
                        onClick={() => togglePublish.mutate(p)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        {p.status === "published" ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                      <Link
                        to={`/admin/editorial/${p.id}`}
                        title="Editar"
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Link>
                      <button
                        title="Duplicar"
                        onClick={() => duplicate.mutate(p)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="Excluir"
                        onClick={() => {
                          if (confirm(`Excluir "${p.title}"?`)) deletePost.mutate(p.id);
                        }}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminEditorial;
