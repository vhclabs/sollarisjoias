-- Site banners table
CREATE TABLE IF NOT EXISTS site_banners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  heading TEXT,
  description TEXT,
  image_url TEXT,
  button_2_label TEXT,
  button_2_url TEXT,
  is_active BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on site_banners"
  ON site_banners FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Public read active site_banners"
  ON site_banners FOR SELECT
  USING (is_active = true);

CREATE OR REPLACE FUNCTION update_site_banners_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER site_banners_updated_at
  BEFORE UPDATE ON site_banners
  FOR EACH ROW EXECUTE FUNCTION update_site_banners_updated_at();

-- WhatsApp automations table
CREATE TABLE IF NOT EXISTS whatsapp_automations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  message_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  delay_minutes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access on whatsapp_automations"
  ON whatsapp_automations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION update_whatsapp_automations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER whatsapp_automations_updated_at
  BEFORE UPDATE ON whatsapp_automations
  FOR EACH ROW EXECUTE FUNCTION update_whatsapp_automations_updated_at();

-- Insert default WhatsApp automation templates
INSERT INTO whatsapp_automations (name, trigger, message_template, is_active, delay_minutes) VALUES
  ('Confirmação de Pedido', 'order_confirmed',
   'Olá {{customer_name}}! 🛍️

Seu pedido *#{{order_id}}* foi confirmado com sucesso!

💎 *Itens:* {{order_items}}
💰 *Total:* {{order_total}}
💳 *Pagamento:* {{payment_method}}

Você receberá atualizações sobre a entrega aqui. Qualquer dúvida, estamos à disposição! ✨

— *Equipe Sollaris*', true, 0),

  ('Pagamento Aprovado', 'payment_approved',
   'Olá {{customer_name}}! ✅

O pagamento do seu pedido *#{{order_id}}* foi *aprovado*!

Já estamos separando sua peça com todo o cuidado. 💛

*Prazo de envio:* 1–3 dias úteis
Você receberá o código de rastreio assim que despacharmos.

— *Equipe Sollaris*', true, 5),

  ('Pedido Enviado', 'order_shipped',
   'Olá {{customer_name}}! 📦

Sua peça Sollaris está a caminho! 🚚

*Pedido:* #{{order_id}}
*Transportadora:* {{carrier}}
*Código de rastreio:* {{tracking_code}}

Acompanhe pelo site da transportadora. Qualquer dúvida, fale conosco! 💛

— *Equipe Sollaris*', true, 0),

  ('Agradecimento Pós-Entrega', 'order_delivered',
   'Olá {{customer_name}}! 💎

Sua peça Sollaris chegou! Esperamos que você esteja encantada. ✨

Que tal nos contar o que achou? Sua opinião é muito especial para nós!

E lembre-se: sua garantia de *1 ano no banho* está ativa. Se precisar de qualquer suporte, estamos aqui.

Com carinho,
*Equipe Sollaris* 💛', true, 1440),

  ('Cobrança — Crediário Vencendo', 'crediario_due',
   'Olá {{customer_name}}!

Passando para lembrar que sua parcela do crediário Sollaris vence em *{{due_date}}*.

*Valor:* {{amount}}
*Parcela:* {{installment}}/{{total_installments}}

Para pagar ou esclarecer dúvidas, entre em contato conosco. 😊

— *Equipe Sollaris*', true, 0),

  ('Carrinho Abandonado', 'cart_abandoned',
   'Olá {{customer_name}}! 👋

Notamos que você deixou uma peça especial no carrinho... 💎

*{{product_name}}* ainda está esperando por você!

Que tal garantir antes que esgote? Qualquer dúvida sobre a peça, estou aqui para ajudar.

{{product_url}}

— *Sofia, Sollaris*', false, 60),

  ('Boas-Vindas — Novo Cliente', 'new_customer',
   'Olá {{customer_name}}! ✨

Seja muito bem-vinda à Sollaris! É uma alegria ter você aqui. 💛

Somos uma joalheria online especializada em peças folheadas de alta qualidade, com *garantia de 1 ano no banho*.

Se tiver dúvidas sobre nossas peças ou quiser uma consultoria personalizada, é só chamar!

— *Equipe Sollaris*', true, 0);
