import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const hasProductPhoto = (p: any) =>
  (p.images && p.images.length > 0) ||
  !!p.foto_frontal ||
  !!p.foto_lateral ||
  !!p.foto_lifestyle ||
  !!p.foto_detalhe;

export const useCategories = () =>
  useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("categories").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

export const useSettings = () =>
  useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("settings").select("*").single();
      if (error) throw error;
      return data;
    },
  });

export const useProducts = (categorySlug?: string) =>
  useQuery({
    queryKey: ["products", categorySlug],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("stock_status", true)
        .order("created_at", { ascending: false });

      if (categorySlug) {
        query = query.eq("categories.slug", categorySlug);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data.filter((p: any) => hasProductPhoto(p));
      if (categorySlug) {
        result = result.filter((p: any) => p.categories?.slug === categorySlug);
      }
      return result;
    },
  });

export const useFeaturedProducts = () =>
  useQuery({
    queryKey: ["products", "featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("is_featured", true)
        .eq("stock_status", true)
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data.filter((p: any) => hasProductPhoto(p));
    },
  });

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const useProduct = (id: string) =>
  useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, categories(name, slug)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id && UUID_RE.test(id),
    retry: 1,
  });
