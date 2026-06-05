// ────────────────────────────────────────────────────────────────────────
// crediario-cobranca-ia
//
// Envia uma mensagem de cobrança ultra-amigável via Evolution API,
// gerada pela IA (Lovable AI Gateway), incluindo uma tentativa
// sutil de upsell com produtos em destaque.
//
// Body:
//   {
//     installmentId?: string,           // 1 parcela específica
//     installmentIds?: string[],        // várias parcelas em lote
//     dryRun?: boolean,                 // só gera a mensagem, não envia
//     forceUpsell?: boolean             // força upsell mesmo se desligado
//   }
// ────────────────────────────────────────────────────────────────────────
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const onlyDigits = (v?: string | null) => (v ?? "").replace(/\D/g, "");

const normalizePhoneE164 = (raw?: string | null) => {
  const d = onlyDigits(raw);
  if (!d) return null;
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 11 || d.length === 10) return `55${d}`;
  return d;
};

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("pt-BR");
};

const daysBetween = (iso: string) => {
  const d = new Date(iso + "T12:00:00").getTime();
  const today = new Date(new Date().toISOString().slice(0, 10) + "T12:00:00").getTime();
  return Math.round((today - d) / (1000 * 60 * 60 * 24));
};

async function generateMessage(
  apiKey: string,
  ctx: {
    storeName: string;
    customerName: string;
    amount: number;
    dueDate: string | null;
    daysLate: number;
    installmentNumber: number | null;
    installments: number | null;
    tone: string;
    upsellProducts: { name: string; price: number }[];
  }
): Promise<string> {
  const firstName = (ctx.customerName || "").split(" ")[0] || "cliente";
  const status =
    ctx.daysLate > 0
      ? `vencida há ${ctx.daysLate} dia(s)`
      : ctx.daysLate === 0
      ? `que vence hoje`
      : `que vence em ${Math.abs(ctx.daysLate)} dia(s)`;

  const upsellLine = ctx.upsellProducts.length
    ? `Sugestões sutis de peças que combinam com o perfil dela (mencione APENAS uma, e de forma elegante, no fim):\n${ctx.upsellProducts
        .map((p) => `- ${p.name} (${fmtBRL(p.price)})`)
        .join("\n")}`
    : "Não mencione produtos novos.";

  const prompt = `Você é uma consultora de joias da ${ctx.storeName}, com tom ${ctx.tone}, próximo, leve e elegante (nunca formal nem agressivo). Escreva UMA mensagem curta de WhatsApp para ${firstName} lembrando, com muito carinho, da parcela ${ctx.installmentNumber}/${ctx.installments} no valor de ${fmtBRL(ctx.amount)} ${status} (vencimento ${fmtDate(ctx.dueDate)}).

Regras:
- Comece com uma saudação calorosa usando o primeiro nome.
- NUNCA use palavras como "dívida", "cobrança", "inadimplência", "atraso" de forma dura. Use "lembrete carinhoso", "passando pra avisar".
- Ofereça canais de pagamento: Pix (com 5% off) ou cartão.
- Linhas curtas, 5 a 9 linhas no total, sem títulos, sem markdown.
- Use 1 ou 2 emojis discretos (✨ 💛 🤍 💎). Nada de spam.
- ${upsellLine}
- Encerre assinando como "— Equipe ${ctx.storeName}".
- NÃO inclua links nem números de telefone.
- Responda APENAS com o texto final da mensagem, sem aspas.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`AI gateway falhou: ${resp.status} ${text.slice(0, 200)}`);
  }
  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("AI sem resposta");
  return content;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
    const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const ids: string[] = body.installmentIds
      ? body.installmentIds
      : body.installmentId
      ? [body.installmentId]
      : [];
    const dryRun = !!body.dryRun;
    const forceUpsell = !!body.forceUpsell;

    if (ids.length === 0) {
      return new Response(JSON.stringify({ error: "installmentId(s) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Settings + instância
    const { data: settings } = await supabase
      .from("settings")
      .select("evolution_instance, store_name, auto_billing_tone, auto_billing_upsell, auto_billing_enabled")
      .limit(1)
      .maybeSingle();

    const storeName = settings?.store_name || "SOLLARIS";
    const instance = settings?.evolution_instance;
    const tone = settings?.auto_billing_tone || "amigavel";
    const upsellOn = forceUpsell || settings?.auto_billing_upsell !== false;

    // Produtos pra upsell (destaques)
    let upsellProducts: { name: string; price: number }[] = [];
    if (upsellOn) {
      const { data: prods } = await supabase
        .from("products")
        .select("name, price")
        .eq("is_featured", true)
        .eq("stock_status", true)
        .limit(4);
      upsellProducts = (prods || []).map((p: any) => ({ name: p.name, price: Number(p.price) }));
    }

    // Carrega parcelas
    const { data: insts, error: instErr } = await supabase
      .from("financial_transactions")
      .select("id, amount, due_date, installment_number, installments, customer_name, customer_phone, status, sub_type")
      .in("id", ids);
    if (instErr) throw instErr;

    const results: any[] = [];
    for (const inst of insts || []) {
      try {
        if (inst.status === "paid") {
          results.push({ id: inst.id, skipped: "already_paid" });
          continue;
        }
        if (!inst.customer_phone) {
          results.push({ id: inst.id, skipped: "no_phone" });
          continue;
        }
        const daysLate = inst.due_date ? daysBetween(inst.due_date) : 0;

        const message = await generateMessage(LOVABLE_API_KEY, {
          storeName,
          customerName: inst.customer_name || "cliente",
          amount: Number(inst.amount),
          dueDate: inst.due_date,
          daysLate,
          installmentNumber: inst.installment_number,
          installments: inst.installments,
          tone,
          upsellProducts: upsellProducts.slice(0, 2),
        });

        if (dryRun) {
          results.push({ id: inst.id, ok: true, dryRun: true, message });
          continue;
        }

        if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !instance) {
          results.push({
            id: inst.id,
            ok: false,
            error: "Evolution API não configurada (preencha EVOLUTION_API_URL/KEY e a instância em Configurações)",
            message,
          });
          continue;
        }

        const baseUrl = EVOLUTION_API_URL.replace(/\/+$/, "");
        const phoneE164 = normalizePhoneE164(inst.customer_phone);
        const sendResp = await fetch(`${baseUrl}/message/sendText/${instance}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: EVOLUTION_API_KEY },
          body: JSON.stringify({ number: phoneE164, text: message }),
        });
        const sendData = await sendResp.json().catch(() => ({}));
        if (!sendResp.ok) {
          results.push({
            id: inst.id,
            ok: false,
            error: sendData?.message || sendData?.error || `HTTP ${sendResp.status}`,
            message,
          });
        } else {
          results.push({ id: inst.id, ok: true, message });
        }
      } catch (e: any) {
        console.error("crediario-cobranca-ia error", inst.id, e);
        results.push({ id: inst.id, ok: false, error: e?.message || String(e) });
      }
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("crediario-cobranca-ia fatal", err);
    return new Response(JSON.stringify({ error: err?.message || String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
