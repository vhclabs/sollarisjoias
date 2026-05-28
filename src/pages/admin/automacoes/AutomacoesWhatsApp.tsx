import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  MessageSquare, Plus, Pencil, Trash2, Check, Clock, Zap,
  Wand2, Loader2, Save, Eye, EyeOff, Copy, Info,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface WhatsAppAutomation {
  id: string;
  name: string;
  trigger: string;
  message_template: string;
  is_active: boolean;
  delay_minutes: number;
  created_at: string;
}

const TRIGGERS = [
  { value: "order_confirmed", label: "Pedido Confirmado", icon: "🛍️", category: "pedidos" },
  { value: "payment_approved", label: "Pagamento Aprovado", icon: "✅", category: "pedidos" },
  { value: "order_shipped", label: "Pedido Enviado", icon: "📦", category: "pedidos" },
  { value: "order_delivered", label: "Pedido Entregue", icon: "🏠", category: "pedidos" },
  { value: "new_customer", label: "Novo Cliente", icon: "👋", category: "clientes" },
  { value: "cart_abandoned", label: "Carrinho Abandonado", icon: "🛒", category: "marketing" },
  { value: "crediario_due", label: "Crediário Vencendo", icon: "💳", category: "financeiro" },
  { value: "crediario_overdue", label: "Crediário Vencido", icon: "⚠️", category: "financeiro" },
  { value: "birthday", label: "Aniversário do Cliente", icon: "🎂", category: "clientes" },
  { value: "reengagement", label: "Reengajamento (sem compras)", icon: "💎", category: "marketing" },
  { value: "custom", label: "Gatilho Personalizado", icon: "⚡", category: "outros" },
];

const VARIABLES = [
  { key: "{{customer_name}}", desc: "Nome do cliente" },
  { key: "{{order_id}}", desc: "Número do pedido" },
  { key: "{{order_total}}", desc: "Valor total do pedido" },
  { key: "{{order_items}}", desc: "Itens do pedido" },
  { key: "{{payment_method}}", desc: "Forma de pagamento" },
  { key: "{{tracking_code}}", desc: "Código de rastreio" },
  { key: "{{carrier}}", desc: "Transportadora" },
  { key: "{{due_date}}", desc: "Data de vencimento" },
  { key: "{{amount}}", desc: "Valor da cobrança" },
  { key: "{{installment}}", desc: "Número da parcela" },
  { key: "{{total_installments}}", desc: "Total de parcelas" },
  { key: "{{product_name}}", desc: "Nome do produto" },
  { key: "{{product_url}}", desc: "Link do produto" },
];

const CATEGORY_COLORS: Record<string, string> = {
  pedidos: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  clientes: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  marketing: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  financeiro: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  outros: "bg-muted text-muted-foreground border-border",
};

const emptyForm = {
  name: "",
  trigger: "order_confirmed",
  message_template: "",
  is_active: true,
  delay_minutes: 0,
};

function delayLabel(minutes: number): string {
  if (minutes === 0) return "Imediato";
  if (minutes < 60) return `${minutes} min após`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h após`;
  return `${Math.round(minutes / 1440)}d após`;
}

const AutomacoesWhatsApp = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [showVars, setShowVars] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("todos");

  const { data: automations = [], isLoading } = useQuery<WhatsAppAutomation[]>({
    queryKey: ["whatsapp-automations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_automations")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as WhatsAppAutomation[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      if (editingId) {
        const { error } = await supabase
          .from("whatsapp_automations")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_automations")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingId ? "Automação atualizada!" : "Automação criada!");
      qc.invalidateQueries({ queryKey: ["whatsapp-automations"] });
      closeDialog();
    },
    onError: () => toast.error("Erro ao salvar automação"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_automations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Automação excluída");
      qc.invalidateQueries({ queryKey: ["whatsapp-automations"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_automations")
        .update({ is_active: value })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["whatsapp-automations"] }),
    onError: () => toast.error("Erro ao atualizar status"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setAiPrompt("");
    setDialogOpen(true);
  };

  const openEdit = (a: WhatsAppAutomation) => {
    setEditingId(a.id);
    setForm({
      name: a.name,
      trigger: a.trigger,
      message_template: a.message_template,
      is_active: a.is_active,
      delay_minutes: a.delay_minutes,
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

  const insertVariable = (key: string) => {
    setForm((p) => ({ ...p, message_template: p.message_template + key }));
  };

  const copyTemplate = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  const generateWithAI = async () => {
    const triggerInfo = TRIGGERS.find((t) => t.value === form.trigger);
    const basePrompt = aiPrompt.trim() || `mensagem automática de WhatsApp para o evento: ${triggerInfo?.label}`;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("brain-nalu", {
        body: {
          messages: [
            {
              role: "user",
              content: `Crie uma mensagem de WhatsApp automática para a joalheria Sollaris Joias.

Contexto: ${basePrompt}
Gatilho: ${triggerInfo?.label}

Regras:
- Tom elegante e caloroso, como uma joalheria premium
- Use as variáveis disponíveis quando relevante: {{customer_name}}, {{order_id}}, {{order_total}}, etc.
- Formatação WhatsApp: *negrito*, _itálico_
- Máximo 5-6 linhas
- Termine sempre com "— *Equipe Sollaris*" ou "— *Sofia, Sollaris*"
- Mencione a garantia de 1 ano no banho quando for mensagem pós-venda

Retorne SOMENTE o texto da mensagem, sem explicações.`,
            },
          ],
          context: "whatsapp-automation-generator",
        },
      });
      if (error) throw error;
      const text: string = data?.content || data?.message || data?.text || "";
      if (text) {
        setForm((p) => ({ ...p, message_template: text.trim() }));
        toast.success("Mensagem gerada pela IA!");
      }
    } catch {
      toast.error("Erro ao gerar com IA. Tente novamente.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSave = () => {
    if (!form.name.trim()) return toast.error("Nome é obrigatório");
    if (!form.message_template.trim()) return toast.error("Mensagem é obrigatória");
    saveMutation.mutate(form);
  };

  const getTriggerInfo = (triggerValue: string) =>
    TRIGGERS.find((t) => t.value === triggerValue);

  const filteredAutomations = filterCategory === "todos"
    ? automations
    : automations.filter((a) => {
        const t = getTriggerInfo(a.trigger);
        return t?.category === filterCategory;
      });

  const activeCount = automations.filter((a) => a.is_active).length;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold">Automações WhatsApp</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Configure mensagens automáticas enviadas pelo Evolution API.{" "}
            <span className="text-accent font-medium">{activeCount} ativas</span> de {automations.length} automações.
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Automação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: automations.length, color: "text-foreground" },
          { label: "Ativas", value: activeCount, color: "text-emerald-400" },
          { label: "Inativas", value: automations.length - activeCount, color: "text-muted-foreground" },
          { label: "Categorias", value: new Set(automations.map(a => getTriggerInfo(a.trigger)?.category)).size, color: "text-accent" },
        ].map((s) => (
          <div key={s.label} className="admin-card p-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter by category */}
      <div className="flex flex-wrap gap-1.5">
        {["todos", "pedidos", "clientes", "marketing", "financeiro", "outros"].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-[11px] font-medium capitalize transition-colors border",
              filterCategory === cat
                ? "bg-accent text-accent-foreground border-accent"
                : "text-muted-foreground border-border hover:border-foreground/40"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Automation list */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="admin-card p-4 animate-pulse h-20" />
          ))}
        </div>
      ) : filteredAutomations.length === 0 ? (
        <div className="admin-card p-12 flex flex-col items-center gap-3 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30" strokeWidth={1.2} />
          <p className="text-sm text-muted-foreground">Nenhuma automação nessa categoria.</p>
          <Button variant="outline" size="sm" onClick={openCreate}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar automação
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAutomations.map((automation) => {
            const triggerInfo = getTriggerInfo(automation.trigger);
            const catColor = CATEGORY_COLORS[triggerInfo?.category || "outros"];
            return (
              <div
                key={automation.id}
                className={cn(
                  "admin-card p-4 flex items-start gap-4 transition-all",
                  automation.is_active && "border-emerald-500/20"
                )}
              >
                {/* Trigger icon */}
                <div className="h-9 w-9 rounded-lg bg-secondary flex items-center justify-center text-lg flex-shrink-0">
                  {triggerInfo?.icon || "⚡"}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{automation.name}</p>
                    <Badge variant="outline" className={cn("text-[10px]", catColor)}>
                      {triggerInfo?.label || automation.trigger}
                    </Badge>
                    {automation.delay_minutes > 0 && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {delayLabel(automation.delay_minutes)}
                      </span>
                    )}
                    {!automation.is_active && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        Inativa
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2 whitespace-pre-line">
                    {automation.message_template}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Switch
                    checked={automation.is_active}
                    onCheckedChange={(v) => toggleMutation.mutate({ id: automation.id, value: v })}
                    title={automation.is_active ? "Desativar" : "Ativar"}
                  />
                  <button
                    onClick={() => copyTemplate(automation.message_template)}
                    className="p-2 rounded text-muted-foreground hover:text-foreground transition-colors"
                    title="Copiar mensagem"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openEdit(automation)}
                    className="p-2 rounded text-muted-foreground hover:text-accent transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setDeleteId(automation.id)}
                    className="p-2 rounded text-muted-foreground hover:text-destructive transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Variables reference */}
      <div className="admin-card p-4">
        <button
          onClick={() => setShowVars(!showVars)}
          className="flex items-center gap-2 w-full text-left"
        >
          <Info className="h-4 w-4 text-accent" />
          <span className="text-sm font-medium">Variáveis disponíveis nas mensagens</span>
          <span className="ml-auto text-xs text-muted-foreground">{showVars ? "Ocultar" : "Ver"}</span>
        </button>
        {showVars && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
            {VARIABLES.map((v) => (
              <div
                key={v.key}
                className="flex items-center gap-2 text-xs rounded border border-border/40 px-2 py-1.5 cursor-pointer hover:border-accent/40 hover:bg-accent/5 transition-colors"
                onClick={() => copyTemplate(v.key)}
                title="Clique para copiar"
              >
                <code className="text-accent font-mono text-[10px] shrink-0">{v.key}</code>
                <span className="text-muted-foreground truncate">{v.desc}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Automação" : "Nova Automação WhatsApp"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* AI Generator */}
            <div className="rounded-lg border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Wand2 className="h-3.5 w-3.5 text-accent" />
                Gerar mensagem com IA
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="Descreva o tom ou contexto (opcional)..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="text-sm"
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
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome da automação *</Label>
              <Input
                id="name"
                placeholder="Ex: Confirmação de Pedido"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Trigger */}
            <div className="space-y-1.5">
              <Label>Gatilho *</Label>
              <Select
                value={form.trigger}
                onValueChange={(v) => setForm((p) => ({ ...p, trigger: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.icon} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Delay */}
            <div className="space-y-1.5">
              <Label htmlFor="delay">Delay de envio (minutos)</Label>
              <div className="flex items-center gap-3">
                <Input
                  id="delay"
                  type="number"
                  min={0}
                  value={form.delay_minutes}
                  onChange={(e) => setForm((p) => ({ ...p, delay_minutes: parseInt(e.target.value) || 0 }))}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">
                  → {delayLabel(form.delay_minutes)}
                </span>
              </div>
            </div>

            {/* Message template */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="template">Mensagem *</Label>
                <button
                  type="button"
                  onClick={() => setShowVars(!showVars)}
                  className="text-[10px] text-accent hover:underline flex items-center gap-1"
                >
                  <Info className="h-3 w-3" />
                  Ver variáveis
                </button>
              </div>
              {showVars && (
                <div className="grid grid-cols-2 gap-1.5 mb-2 p-2 rounded-md bg-secondary/50">
                  {VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="flex items-center gap-1.5 text-left text-xs px-2 py-1 rounded hover:bg-accent/10 transition-colors"
                    >
                      <code className="text-accent font-mono text-[10px]">{v.key}</code>
                      <span className="text-muted-foreground truncate">{v.desc}</span>
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                id="template"
                placeholder="Olá {{customer_name}}! ..."
                value={form.message_template}
                onChange={(e) => setForm((p) => ({ ...p, message_template: e.target.value }))}
                rows={8}
                className="font-mono text-xs"
              />
              <p className="text-[10px] text-muted-foreground">
                Use *texto* para negrito, _texto_ para itálico no WhatsApp.
              </p>
            </div>

            {/* Active toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/40 p-4">
              <div>
                <p className="text-sm font-medium">Automação ativa</p>
                <p className="text-xs text-muted-foreground">Quando ativa, a mensagem é enviada automaticamente.</p>
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
              {editingId ? "Atualizar" : "Criar Automação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir automação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta automação será removida permanentemente e não será mais enviada.
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

export default AutomacoesWhatsApp;
