import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/drizzle';
import { amoCrmSettings } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { createConnector } from '@/lib/services/uon-amocrm-connector';

// Типы событий amoCRM webhook
interface AmoCrmWebhookEvent {
  contacts?: {
    add?: Array<{ id: string; name: string; [key: string]: any }>;
    update?: Array<{ id: string; name: string; [key: string]: any }>;
    delete?: Array<{ id: string }>;
  };
  leads?: {
    add?: Array<{ id: string; name: string; price?: string; status_id?: string; [key: string]: any }>;
    update?: Array<{ id: string; name: string; price?: string; status_id?: string; [key: string]: any }>;
    delete?: Array<{ id: string }>;
  };
  account?: {
    id: string;
    subdomain: string;
  };
}

// POST - обработка webhook от amoCRM
export async function POST(request: NextRequest) {
  try {
    // Получаем данные webhook
    const contentType = request.headers.get('content-type') || '';
    let webhookData: AmoCrmWebhookEvent;

    if (contentType.includes('application/json')) {
      webhookData = await request.json();
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      webhookData = Object.fromEntries(formData.entries()) as any;
    } else {
      const text = await request.text();
      try {
        webhookData = JSON.parse(text);
      } catch {
        // Попробуем распарсить как form data
        const params = new URLSearchParams(text);
        webhookData = Object.fromEntries(params.entries()) as any;
      }
    }

    console.log('📥 [Webhook] Получен webhook от amoCRM:', JSON.stringify(webhookData, null, 2));

    // Определяем аккаунт по subdomain
    const subdomain = webhookData.account?.subdomain;
    if (!subdomain) {
      console.log('⚠️ [Webhook] Subdomain не указан в webhook');
      return NextResponse.json({ success: true, message: 'No subdomain' });
    }

    // Находим команду по subdomain
    const [settings] = await db
      .select()
      .from(amoCrmSettings)
      .where(eq(amoCrmSettings.subdomain, subdomain))
      .limit(1);

    if (!settings) {
      console.log(`⚠️ [Webhook] Настройки для subdomain "${subdomain}" не найдены`);
      return NextResponse.json({ success: true, message: 'Settings not found' });
    }

    // Создаем коннектор
    const connector = await createConnector(settings.teamId);
    if (!connector) {
      console.log('❌ [Webhook] Не удалось создать коннектор');
      return NextResponse.json({ success: false, message: 'Connector creation failed' });
    }

    const results: Array<{ success: boolean; message: string }> = [];

    // Обрабатываем события контактов
    if (webhookData.contacts) {
      for (const contact of webhookData.contacts.add || []) {
        const result = await connector.handleWebhook({
          type: 'add',
          entity: 'contacts',
          entityId: parseInt(contact.id),
          data: contact,
        });
        results.push(result);
      }

      for (const contact of webhookData.contacts.update || []) {
        const result = await connector.handleWebhook({
          type: 'update',
          entity: 'contacts',
          entityId: parseInt(contact.id),
          data: contact,
        });
        results.push(result);
      }

      for (const contact of webhookData.contacts.delete || []) {
        const result = await connector.handleWebhook({
          type: 'delete',
          entity: 'contacts',
          entityId: parseInt(contact.id),
        });
        results.push(result);
      }
    }

    // Обрабатываем события сделок
    if (webhookData.leads) {
      for (const lead of webhookData.leads.add || []) {
        const result = await connector.handleWebhook({
          type: 'add',
          entity: 'leads',
          entityId: parseInt(lead.id),
          data: {
            ...lead,
            price: lead.price ? parseFloat(lead.price) : undefined,
            status_id: lead.status_id ? parseInt(lead.status_id) : undefined,
          },
        });
        results.push(result);
      }

      for (const lead of webhookData.leads.update || []) {
        const result = await connector.handleWebhook({
          type: 'update',
          entity: 'leads',
          entityId: parseInt(lead.id),
          data: {
            ...lead,
            price: lead.price ? parseFloat(lead.price) : undefined,
            status_id: lead.status_id ? parseInt(lead.status_id) : undefined,
          },
        });
        results.push(result);
      }

      for (const lead of webhookData.leads.delete || []) {
        const result = await connector.handleWebhook({
          type: 'delete',
          entity: 'leads',
          entityId: parseInt(lead.id),
        });
        results.push(result);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(`✅ [Webhook] Обработано: ${successCount} успешно, ${failCount} с ошибками`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
    });
  } catch (error) {
    console.error('❌ [Webhook] Ошибка обработки:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET - проверка работоспособности webhook endpoint
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'amoCRM webhook endpoint is active',
    timestamp: new Date().toISOString(),
  });
}
