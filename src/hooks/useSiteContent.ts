import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SiteContent = {
  hero: {
    eyebrow: string;
    title_line1: string;
    title_line2: string;
    subtitle: string;
    cta_label: string;
  };
  hero_media: {
    type: "image" | "video" | "default";
    url: string;
    poster_url: string;
  };
  pillars: { items: string[] };
  concierge: {
    eyebrow: string;
    title: string;
    title_emphasis: string;
    subtitle: string;
    cta_label: string;
  };
  editorial: {
    eyebrow: string;
    title_line1: string;
    title_line2: string;
    paragraph1: string;
    paragraph2: string;
    cta_label: string;
  };
  newsletter: {
    eyebrow: string;
    title: string;
    subtitle: string;
    cta_label: string;
    placeholder: string;
  };
  featured_main: { eyebrow: string; title: string; subtitle: string };
  featured_news: { eyebrow: string; title: string; subtitle: string };
};

export const SITE_CONTENT_DEFAULTS: SiteContent = {
  hero: {
    eyebrow: "Nova Coleção · Outono 2026",
    title_line1: "Joias para o",
    title_line2: "dia a dia que importa.",
    subtitle:
      "Banho de ouro 18k e garantia Sollaris de 1 ano. Peças pensadas para você usar todo dia, sem medo.",
    cta_label: "Ver coleção",
  },
  hero_media: {
    type: "default",
    url: "",
    poster_url: "",
  },
  pillars: {
    items: [
      "Frete grátis acima de R$ 499",
      "Garantia vitalícia · Banho 18k",
      "Troca em 30 dias",
      "Embalagem cortesia",
    ],
  },
  concierge: {
    eyebrow: "Atendimento personalizado",
    title: "Fale com nossa",
    title_emphasis: "consultora",
    subtitle:
      "Conte a ocasião, o estilo, o orçamento — e a Sollaris monta uma seleção sob medida pra você. Conversa, escolha e fechamento, tudo aqui.",
    cta_label: "Iniciar conversa",
  },
  editorial: {
    eyebrow: "A Sollaris",
    title_line1: "Curadoria com",
    title_line2: "intenção.",
    paragraph1:
      "Cada peça do nosso portfólio é escolhida sob um olhar editorial rigoroso. Trabalhamos com semijoias em banho de ouro 18k, feitas para durar e acompanhar seus dias.",
    paragraph2:
      "Sem hype. Sem trend efêmero. Só peças que ficam bem em você hoje, amanhã, daqui a cinco anos.",
    cta_label: "Conhecer a Sollaris →",
  },
  newsletter: {
    eyebrow: "Lista privada",
    title: "Acesso antecipado às coleções.",
    subtitle:
      "Receba os lançamentos antes de irem ao público — e ofertas exclusivas só para clientes da casa.",
    cta_label: "Inscrever",
    placeholder: "seu@email.com",
  },
  featured_main: {
    eyebrow: "Mais desejadas",
    title: "Selecionadas pra você",
    subtitle:
      "As peças que mais saem da casa este mês — escolhidas a dedo pela curadoria.",
  },
  featured_news: {
    eyebrow: "Acabou de chegar",
    title: "Novidades",
    subtitle: "",
  },
};

export function useSiteContent() {
  const query = useQuery({
    queryKey: ["site_content"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_content").select("key, value");
      if (error) throw error;
      const map: Record<string, any> = {};
      (data ?? []).forEach((r: any) => (map[r.key] = r.value));
      return map;
    },
    staleTime: 60_000,
  });

  const get = <K extends keyof SiteContent>(key: K): SiteContent[K] => {
    const stored = query.data?.[key as string];
    const def = SITE_CONTENT_DEFAULTS[key];
    return { ...(def as any), ...(stored ?? {}) };
  };

  return { get, ...query };
}
