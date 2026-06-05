import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Upload, Image as ImageIcon, Video as VideoIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  SITE_CONTENT_DEFAULTS,
  useSiteContent,
  type SiteContent,
} from "@/hooks/useSiteContent";
import heroVideo from "@/assets/hero-video.mp4";

type Key = keyof SiteContent;

const SECTIONS: { key: Key; label: string; fields: { name: string; label: string; type?: "text" | "textarea" | "list" }[] }[] = [
  {
    key: "hero",
    label: "Banner principal (Hero)",
    fields: [
      { name: "eyebrow", label: "Subtítulo superior" },
      { name: "title_line1", label: "Título – linha 1" },
      { name: "title_line2", label: "Título – linha 2 (em itálico)" },
      { name: "subtitle", label: "Descrição", type: "textarea" },
      { name: "cta_label", label: "Botão" },
    ],
  },
  {
    key: "pillars",
    label: "Barra de pilares (faixa fina)",
    fields: [{ name: "items", label: "Itens (um por linha)", type: "list" }],
  },
  {
    key: "featured_main",
    label: "Vitrine — Selecionadas pra você",
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Título" },
      { name: "subtitle", label: "Subtítulo", type: "textarea" },
    ],
  },
  {
    key: "concierge",
    label: "Bloco da consultora (Concierge)",
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Título" },
      { name: "title_emphasis", label: "Palavra em destaque (itálico dourado)" },
      { name: "subtitle", label: "Descrição", type: "textarea" },
      { name: "cta_label", label: "Botão" },
    ],
  },
  {
    key: "editorial",
    label: "Bloco editorial (A Sollaris)",
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title_line1", label: "Título – linha 1" },
      { name: "title_line2", label: "Título – linha 2 (em itálico)" },
      { name: "paragraph1", label: "Parágrafo 1", type: "textarea" },
      { name: "paragraph2", label: "Parágrafo 2", type: "textarea" },
      { name: "cta_label", label: "Link" },
    ],
  },
  {
    key: "featured_news",
    label: "Vitrine — Novidades",
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Título" },
      { name: "subtitle", label: "Subtítulo", type: "textarea" },
    ],
  },
  {
    key: "newsletter",
    label: "Newsletter (Lista privada)",
    fields: [
      { name: "eyebrow", label: "Eyebrow" },
      { name: "title", label: "Título" },
      { name: "subtitle", label: "Descrição", type: "textarea" },
      { name: "placeholder", label: "Placeholder do email" },
      { name: "cta_label", label: "Botão" },
    ],
  },
];

const SiteContentEditor = () => {
  const queryClient = useQueryClient();
  const { get, isLoading } = useSiteContent();
  const [draft, setDraft] = useState<Record<string, any>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const initial: Record<string, any> = {};
    SECTIONS.forEach((s) => (initial[s.key] = get(s.key)));
    setDraft(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const updateField = (sectionKey: string, fieldName: string, value: any) => {
    setDraft((prev) => ({
      ...prev,
      [sectionKey]: { ...(prev[sectionKey] ?? {}), [fieldName]: value },
    }));
  };

  const handleSave = async (sectionKey: string) => {
    setSavingKey(sectionKey);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert({ key: sectionKey, value: draft[sectionKey] }, { onConflict: "key" });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Conteúdo atualizado");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSavingKey(null);
    }
  };

  const handleReset = (sectionKey: Key) => {
    setDraft((prev) => ({ ...prev, [sectionKey]: SITE_CONTENT_DEFAULTS[sectionKey] }));
  };

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <HeroMediaEditor />

      <div className="admin-card">
        <div className="p-4 border-b border-border">
          <h2 className="admin-card-title">Legendas, banners e textos</h2>
          <p className="admin-card-subtitle mt-0.5">
            Edite os textos exibidos na home da loja. As alterações aparecem em segundos no site.
          </p>
        </div>

      <Accordion type="multiple" defaultValue={["hero"]} className="px-4 pb-4">
        {SECTIONS.map((section) => {
          const values = draft[section.key] ?? {};
          return (
            <AccordionItem key={section.key} value={section.key}>
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                {section.label}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  {section.fields.map((f) => (
                    <div key={f.name} className="space-y-1.5">
                      <Label className="text-xs">{f.label}</Label>
                      {f.type === "textarea" ? (
                        <Textarea
                          rows={3}
                          value={values[f.name] ?? ""}
                          onChange={(e) => updateField(section.key, f.name, e.target.value)}
                        />
                      ) : f.type === "list" ? (
                        <Textarea
                          rows={5}
                          value={(values[f.name] ?? []).join("\n")}
                          onChange={(e) =>
                            updateField(
                              section.key,
                              f.name,
                              e.target.value.split("\n").map((s) => s.trim()).filter(Boolean),
                            )
                          }
                        />
                      ) : (
                        <Input
                          value={values[f.name] ?? ""}
                          onChange={(e) => updateField(section.key, f.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 pt-2">
                    <Button
                      size="sm"
                      onClick={() => handleSave(section.key)}
                      disabled={savingKey === section.key}
                    >
                      {savingKey === section.key ? (
                        <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      Salvar seção
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleReset(section.key)}>
                      Restaurar padrão
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Hero Media Editor — upload de imagem ou vídeo para o banner
// ─────────────────────────────────────────────────────────────
const HeroMediaEditor = () => {
  const queryClient = useQueryClient();
  const { get, isLoading } = useSiteContent();
  const stored = get("hero_media");
  const [type, setType] = useState<"image" | "video" | "default">(stored.type);
  const [url, setUrl] = useState(stored.url || "");
  const [posterUrl, setPosterUrl] = useState(stored.poster_url || "");
  const [uploading, setUploading] = useState<null | "media" | "poster">(null);
  const [saving, setSaving] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const posterInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isLoading) return;
    setType(stored.type);
    setUrl(stored.url || "");
    setPosterUrl(stored.poster_url || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const handleUpload = async (file: File, target: "media" | "poster") => {
    setUploading(target);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `hero/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("product-images")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      if (target === "media") {
        setUrl(data.publicUrl);
        const isVideo = file.type.startsWith("video/");
        setType(isVideo ? "video" : "image");
      } else {
        setPosterUrl(data.publicUrl);
      }
      toast.success("Upload concluído");
    } catch (e: any) {
      toast.error(e.message ?? "Erro no upload");
    } finally {
      setUploading(null);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("site_content")
        .upsert(
          { key: "hero_media", value: { type, url, poster_url: posterUrl } },
          { onConflict: "key" }
        );
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["site_content"] });
      toast.success("Mídia do banner atualizada");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  };

  const resetDefault = async () => {
    setType("default");
    setUrl("");
    setPosterUrl("");
  };

  return (
    <div className="admin-card">
      <div className="p-4 border-b border-border">
        <h2 className="admin-card-title">Mídia do banner principal</h2>
        <p className="admin-card-subtitle mt-0.5">
          Substitua o vídeo padrão do hero por outro vídeo ou por uma imagem estática.
        </p>
      </div>

      <div className="p-4 space-y-5">
        {/* Tipo */}
        <div className="flex gap-2">
          {([
            { v: "default", label: "Vídeo padrão", Icon: RotateCcw },
            { v: "video", label: "Meu vídeo", Icon: VideoIcon },
            { v: "image", label: "Imagem", Icon: ImageIcon },
          ] as const).map(({ v, label, Icon }) => (
            <button
              key={v}
              type="button"
              onClick={() => setType(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition ${
                type === v
                  ? "bg-accent/15 border-accent text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Preview */}
        <div className="relative w-full aspect-video bg-black rounded-md overflow-hidden border border-border">
          {type === "video" && url ? (
            <video src={url} className="w-full h-full object-cover" muted autoPlay loop playsInline />
          ) : type === "image" && url ? (
            <img src={url} alt="Preview do banner" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                key={heroVideo}
                src={heroVideo}
                className="w-full h-full object-cover"
                muted
                autoPlay
                loop
                playsInline
              />
              <span className="absolute bottom-2 right-2 text-[10px] uppercase tracking-wider text-white/70 bg-black/40 px-2 py-0.5 rounded">
                Vídeo padrão da Sollaris
              </span>
            </>
          )}
        </div>

        {/* Upload mídia (apenas se não for default) */}
        {type !== "default" && (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">
                URL da {type === "video" ? "vídeo" : "imagem"} (ou faça upload)
              </Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://..."
                />
                <input
                  ref={mediaInputRef}
                  type="file"
                  accept={type === "video" ? "video/*" : "image/*"}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, "media");
                    if (mediaInputRef.current) mediaInputRef.current.value = "";
                  }}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => mediaInputRef.current?.click()}
                  disabled={uploading === "media"}
                >
                  {uploading === "media" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Upload className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>

            {type === "video" && (
              <div>
                <Label className="text-xs">
                  Imagem de capa (poster) — exibida enquanto o vídeo carrega
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    value={posterUrl}
                    onChange={(e) => setPosterUrl(e.target.value)}
                    placeholder="https://... (opcional)"
                  />
                  <input
                    ref={posterInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUpload(f, "poster");
                      if (posterInputRef.current) posterInputRef.current.value = "";
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => posterInputRef.current?.click()}
                    disabled={uploading === "poster"}
                  >
                    {uploading === "poster" ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t border-border">
          <Button size="sm" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
            Salvar mídia
          </Button>
          <Button size="sm" variant="ghost" onClick={resetDefault}>
            Voltar ao vídeo padrão
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SiteContentEditor;
