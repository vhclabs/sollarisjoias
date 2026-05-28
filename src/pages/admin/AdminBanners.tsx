import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Image, Plus, Pencil, Trash2, GripVertical, Eye, EyeOff,
  Wand2, Loader2, Save, X, ArrowUp, ArrowDown, ExternalLink,
  Check, Link2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface Banner {
  id: string;
  title: string;
  subtitle: string | null;
  heading: string | null;
  description: string | null;
  image_url: string | null;
  button_2_label: string | null;
  button_2_url: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

const emptyForm = {
  title: "",
  subtitle: "",
  heading: "",
  description: "",
  image_url: "",
  button_2_label: "",
  button_2_url: "",
  is_active: false,
};

const AdminBanners = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["site-banners-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_banners")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Banner[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      if (editingId) {
        const { error } = await supabase
          .from("site_banners")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const maxOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.order_index)) + 1 : 0;
        const { error } = await supabase
          .from("site_banners")
          .insert({ ...payload, order_index: maxOrder });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Banner atualizado!" : "Banner criado!");
      qc.invalidateQueries({ queryKey: ["site-banners-admin"] });
      qc.invalidateQueries({ queryKey: ["site-banners"] });
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar banner"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_banners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Banner excluído");
      qc.invalidateQueries({ queryKey: ["site-banners-admin"] });
      qc.invalidateQueries({ queryKey: ["site-banners"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir banner"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("site_banners")
        .update({ is_active: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-banners-admin"] });
      qc.invalidateQueries({ queryKey: ["site-banners"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const reorderMutation = useMutation({
    mutationFn: async (ordered: { id: string; order_index: number }[]) => {
      for (const item of ordered) {
        await supabase
          .from("site_banners")
          .update({ order_index: item.order_index })
          .eq("id", item.id);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["site-banners-admin"] }),
    onError: () => toast.error("Erro ao reordenar"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setAiPrompt("");
    setDialogOpen(true);
  };

  const openEdit = (banner: Banner) => {
    setEditingId(banner.id);
    setForm({
      title: banner.title,
      subtitle: banner.subtitle || "",
      heading: banner.heading || "",
      description: banner.description || "",
      image_url: banner.image_url || "",
      button_2_label: banner.button_2_label || "",
      button_2_url: banner.button_2_url || "",
      is_active: banner.is_active,
    });
    setAiPrompt("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setAiPrompt("");
  };

  const moveItem = (id: string, direction: "up" | "down") => {
    const sorted = [...banners].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((b) => b.id === id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const reordered = sorted.map((b, i) => {
      if (i === idx) return { id: b.id, order_index: sorted[swapIdx].order_index };
      if (i === swapIdx) return { id: b.id, order_index: sorted[idx].order_index };
      return { id: b.id, order_index: b.order_index };
    });
    reorderMutation.mutate(reordered);
  };

  const generateWithAI = async () => {
    if (!aiPrompt.trim()) return toast.error("Descreva o banner antes de gerar");
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("brain-nalu", {
        body: {
          messages: [
            {
              role: "user",
              content: `Crie conteúdo para um banner principal de e-commerce de joias (Sollaris Joias).

Briefing do banner: "${aiPrompt}"

Retorne um JSON com esses campos exatos (sem markdown, somente o JSON):
{
  "subtitle": "texto pequeno acima do título, em maiúsculas, estilo etiqueta ex: 'Nova Coleção · Outono 2026'",
  "heading": "título principal impactante, até 8 palavras, pode ter quebra de linha com \\n",
  "description": "frase de suporte, 1-2 linhas, que reforce o valor da marca e mencione garantia 1 ano no banho",
  "button_2_label": "texto do botão secundário (ex: 'Ver Anéis', 'Explorar Colares')",
  "button_2_url": "URL do botão (ex: '/colecao?categoria=aneis')"
}`,
            },
          ],
          context: "banner-generator",
        },
      });
      if (error) throw error;
      const text: string = data?.content || data?.message || data?.text || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Resposta inválida da IA");
      const parsed = JSON.parse(jsonMatch[0]);
      setForm((prev) => ({
        ...prev,
        subtitle: parsed.subtitle || prev.subtitle,
        heading: parsed.heading || prev.heading,
        description: parsed.description || prev.description,
        button_2_label: parsed.button_2_label || prev.button_2_label,
        button_2_url: parsed.button_2_url || prev.button_2_url,
      }));
      toast.success("Banner gerado pela IA!");
    } catch {
      toast.error("Erro ao gerar com IA. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.title.trim()) return toast.error("Título interno é obrigatório");
    saveMutation.mutate(form);
  };

  const sorted = [...banners].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Banners do Site</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie os banners principais da home. O banner ativo com menor ordem será exibido.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Novo Banner
        </Button>
      </div>

      {/* Banner list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="admin-card p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="admin-card p-12 flex flex-col items-center gap-3 text-center">
          <Image className="h-10 w-10 text-muted-foreground/30" strokeWidth={1.2} />
          <p className="text-sm text-muted-foreground">Nenhum banner criado ainda.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar primeiro banner
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((banner, idx) => (
            <div
              key={banner.id}
              className={cn(
                "admin-card p-4 flex items-center gap-4 transition-all",
                banner.is_active && "border-accent/30 bg-accent/5"
              )}
            >
              {/* Thumbnail */}
              <div className="h-16 w-24 flex-shrink-0 rounded-md overflow-hidden bg-secondary border border-border/40">
                {banner.image_url ? (
                  <img src={banner.image_url} alt={banner.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-5 w-5 text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="font-medium text-sm truncate">{banner.title}</p>
                  {banner.is_active && (
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-400 bg-emerald-500/10">
                      Ativo
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {banner.heading || banner.subtitle || "Sem título de exibição"}
                </p>
                {banner.button_2_label && (
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5 flex items-center gap-1">
                    <Link2 className="h-2.5 w-2.5" />
                    Botão: {banner.button_2_label}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5">
                  <button
                    onClick={() => moveItem(banner.id, "up")}
                    disabled={idx === 0}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                    title="Mover para cima"
                  >
                    <ArrowUp className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => moveItem(banner.id, "down")}
                    disabled={idx === sorted.length - 1}
                    className="p-1 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 transition-colors"
                    title="Mover para baixo"
                  >
                    <ArrowDown className="h-3 w-3" />
                  </button>
                </div>

                {/* Toggle active */}
                <Switch
                  checked={banner.is_active}
                  onCheckedChange={(v) => toggleActiveMutation.mutate({ id: banner.id, value: v })}
                  title={banner.is_active ? "Desativar banner" : "Ativar banner"}
                />

                {/* Preview */}
                <button
                  onClick={() => setPreviewId(previewId === banner.id ? null : banner.id)}
                  className="p-2 rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Pré-visualizar"
                >
                  {previewId === banner.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>

                <button
                  onClick={() => openEdit(banner)}
                  className="p-2 rounded text-muted-foreground hover:text-accent transition-colors"
                  title="Editar"
                >
                  <Pencil className="h-4 w-4" />
                </button>

                <button
                  onClick={() => setDeleteId(banner.id)}
                  className="p-2 rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview pane */}
      {previewId && (() => {
        const b = banners.find((x) => x.id === previewId);
        if (!b) return null;
        return (
          <div className="admin-card overflow-hidden">
            <div className="relative h-56 bg-secondary">
              {b.image_url && (
                <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
              <div className="absolute inset-0 flex items-center px-8">
                <div className="text-white max-w-sm">
                  {b.subtitle && (
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em] text-yellow-200 mb-2">{b.subtitle}</p>
                  )}
                  {b.heading && (
                    <h2 className="font-display text-2xl leading-tight mb-2 whitespace-pre-line">{b.heading}</h2>
                  )}
                  {b.description && (
                    <p className="text-white/80 text-xs mb-4 leading-relaxed">{b.description}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <span className="bg-white text-gray-900 text-[9px] px-3 py-1.5 font-mono uppercase tracking-widest">
                      Ver coleção →
                    </span>
                    {b.button_2_label && (
                      <span className="border border-white/50 text-white text-[9px] px-3 py-1.5 font-mono uppercase tracking-widest">
                        {b.button_2_label} →
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Banner" : "Novo Banner"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* AI Generator */}
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-accent" />
                Gerar com IA
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: banner de lançamento de anéis primavera, tom romântico..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-sm"
                  onKeyDown={(e) => e.key === "Enter" && generateWithAI()}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateWithAI}
                  disabled={aiLoading}
                  className="shrink-0"
                >
                  {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                A IA vai preencher automaticamente o título, descrição e botão.
              </p>
            </div>

            {/* Internal title */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Título interno *</Label>
              <Input
                id="title"
                placeholder="Ex: Banner Verão 2026"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
              <p className="text-[10px] text-muted-foreground">Só aparece no painel admin.</p>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="image_url">URL da Imagem</Label>
              <Input
                id="image_url"
                placeholder="https://..."
                value={form.image_url}
                onChange={(e) => setForm((p) => ({ ...p, image_url: e.target.value }))}
              />
              {form.image_url && (
                <div className="mt-2 h-24 rounded-md overflow-hidden border border-border/40">
                  <img src={form.image_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            {/* Subtitle */}
            <div className="space-y-1.5">
              <Label htmlFor="subtitle">Subtítulo (eyebrow)</Label>
              <Input
                id="subtitle"
                placeholder="Ex: Nova Coleção · Outono 2026"
                value={form.subtitle}
                onChange={(e) => setForm((p) => ({ ...p, subtitle: e.target.value }))}
              />
            </div>

            {/* Heading */}
            <div className="space-y-1.5">
              <Label htmlFor="heading">Título principal</Label>
              <Textarea
                id="heading"
                placeholder="Ex: Joias para o\ndia a dia que importa."
                value={form.heading}
                onChange={(e) => setForm((p) => ({ ...p, heading: e.target.value }))}
                rows={2}
              />
              <p className="text-[10px] text-muted-foreground">Use \n para quebra de linha.</p>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Frase de suporte ao título..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Button 2 */}
            <div className="rounded-lg border border-border/40 p-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Botão Configurável
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="btn2label">Texto do botão</Label>
                  <Input
                    id="btn2label"
                    placeholder="Ex: Ver Anéis"
                    value={form.button_2_label}
                    onChange={(e) => setForm((p) => ({ ...p, button_2_label: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="btn2url">Destino (URL)</Label>
                  <Input
                    id="btn2url"
                    placeholder="Ex: /colecao?categoria=aneis"
                    value={form.button_2_url}
                    onChange={(e) => setForm((p) => ({ ...p, button_2_url: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground">
                O botão fixo "Ver coleção" sempre aparece. Este é o segundo botão opcional.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
              <div>
                <p className="text-sm font-medium">Ativar banner</p>
                <p className="text-xs text-muted-foreground">Banners ativos são exibidos na home ordenados por posição.</p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((p) => ({ ...p, is_active: v }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {editingId ? "Atualizar" : "Criar Banner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O banner será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminBanners;
