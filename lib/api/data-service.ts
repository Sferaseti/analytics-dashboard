/**
 * Data Service - сервис для получения реальных данных из базы данных
 * Заменяет демо данные на реальные данные из U-ON API
 */

import { db } from '@/lib/db/drizzle';
import { 
  uonRequests, 
  uonBills, 
  uonClients, 
  uonLeads, 
  uonManagers,
  type UonRequest as DbUonRequest,
  type UonBill as DbUonBill,
  type UonClient as DbUonClient,
  type UonLead as DbUonLead,
  type UonManager as DbUonManager
} from '@/lib/db/schema';
import { UonRequest, UonBill, UonClient, UonLead, UonManager } from '@/lib/api/uon-client';

export interface DataServiceResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

export class DataService {
  /**
   * Получить заявки с поддержкой фильтрации и пагинации
   */
  async getRequests(params?: {
    date_from?: string;
    date_to?: string;
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<DataServiceResponse<UonRequest[]>> {
    try {
      // Если есть параметры фильтрации, используем API роут
      if (params?.date_from || params?.date_to || params?.status) {
        const searchParams = new URLSearchParams();
        
        if (params.date_from) searchParams.set('date_from', params.date_from);
        if (params.date_to) searchParams.set('date_to', params.date_to);
        if (params.page) searchParams.set('page', params.page.toString());
        if (params.limit) searchParams.set('limit', params.limit.toString());
        if (params.status) searchParams.set('status', params.status);

        const response = await fetch(`/api/uon/requests?${searchParams.toString()}`);
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Ошибка получения данных с API');
        }
        
        return {
          success: true,
          data: result.data || []
        };
      }

      // Иначе получаем из локальной БД
      const dbRequests = await db.select().from(uonRequests);
      
      // Преобразуем данные из БД в формат API
      const requests: UonRequest[] = dbRequests.map(req => ({
        id: req.uonId,
        name: req.name,
        country: req.country || '',
        city: req.city || '',
        departure_date: req.departureDate || '',
        return_date: req.returnDate || '',
        adults: req.adults || 0,
        children: req.children || 0,
        total_amount: parseFloat(req.totalAmount || '0'),
        status: req.status as 'new' | 'in_progress' | 'confirmed' | 'cancelled',
        manager_id: req.managerId || 0,
        created_at: req.createdAt?.toISOString() || ''
      }));

      return {
        success: true,
        data: requests
      };
    } catch (error) {
      console.error('❌ [DataService] Ошибка получения заявок:', error);
      return {
        success: false,
        data: [],
        error: 'Ошибка получения заявок из базы данных'
      };
    }
  }

  /**
   * Получить все счета из базы данных с фильтрацией и пагинацией
   */
  async getBills(filters?: {
    paymentStatus?: string;
    minAmount?: number;
    maxAmount?: number;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<DataServiceResponse<UonBill[]>> {
    try {
      // Если есть фильтры, используем API маршрут
      if (filters && Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/uon/bills?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data: data.bills || [] };
      }

      // Иначе получаем из локальной базы данных
      const dbBills = await db.select().from(uonBills);
      
      const bills: UonBill[] = dbBills.map(bill => ({
        id: bill.uonId,
        request_id: bill.requestId || 0,
        amount: parseFloat(bill.amount || '0'),
        currency: bill.currency || 'RUB',
        status: bill.status as 'pending' | 'paid' | 'cancelled',
        created_at: bill.createdAt.toISOString(),
        paid_at: bill.paidAt || undefined
      }));

      return {
        success: true,
        data: bills
      };
    } catch (error) {
      console.error('Ошибка получения счетов из БД:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить всех клиентов из базы данных с фильтрацией и пагинацией
   */
  async getClients(filters?: {
    country?: string;
    city?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<DataServiceResponse<UonClient[]>> {
    try {
      // Если есть фильтры, используем API маршрут
      if (filters && Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/uon/clients?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data: data.clients || [] };
      }

      // Иначе получаем из локальной базы данных
      const dbClients = await db.select().from(uonClients);
      
      const clients: UonClient[] = dbClients.map(client => ({
        id: client.uonId,
        name: client.name,
        email: client.email || '',
        phone: client.phone || '',
        country: client.country || '',
        created_at: client.createdAt?.toISOString() || '',
        total_spent: parseFloat(client.totalSpent || '0'),
        requests_count: client.requestsCount || 0
      }));

      return {
        success: true,
        data: clients
      };
    } catch (error) {
      console.error('Ошибка получения клиентов из БД:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить всех лидов из базы данных с фильтрацией и пагинацией
   */
  async getLeads(filters?: {
    source?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    limit?: number;
  }): Promise<DataServiceResponse<UonLead[]>> {
    try {
      // Если есть фильтры, используем API маршрут
      if (filters && Object.keys(filters).length > 0) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });

        const response = await fetch(`/api/uon/leads?${params.toString()}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        return { success: true, data: data.leads || [] };
      }

      // Иначе получаем из локальной базы данных
      const dbLeads = await db.select().from(uonLeads);
      
      const leads: UonLead[] = dbLeads.map(lead => ({
        id: lead.uonId,
        name: lead.name,
        email: lead.email || '',
        phone: lead.phone || '',
        country_interest: lead.countryInterest || '',
        budget: parseFloat(lead.budget || '0'),
        source: lead.source || '',
        status: lead.status as 'new' | 'contacted' | 'qualified' | 'lost',
        manager_id: lead.managerId || 0,
        created_at: lead.createdAt?.toISOString() || ''
      }));

      return {
        success: true,
        data: leads
      };
    } catch (error) {
      console.error('Ошибка получения лидов из БД:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить всех менеджеров из базы данных
   */
  async getManagers(): Promise<DataServiceResponse<UonManager[]>> {
    try {
      const dbManagers = await db.select().from(uonManagers);
      
      const managers: UonManager[] = dbManagers.map(manager => ({
        id: manager.uonId,
        name: manager.name,
        email: manager.email || '',
        phone: manager.phone || '',
        position: '', // Убираем несуществующее поле position
        department: manager.department || '', // Используем существующее поле department
        active_requests: manager.activeRequests || 0,
        completed_requests: manager.completedRequests || 0,
        total_sales: parseFloat(manager.totalSales || '0'),
        created_at: manager.createdAt.toISOString()
      }));

      return {
        success: true,
        data: managers
      };
    } catch (error) {
      console.error('Ошибка получения менеджеров из БД:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Неизвестная ошибка'
      };
    }
  }

  /**
   * Получить все данные одним запросом
   */
  async getAllData() {
    const [requestsRes, billsRes, clientsRes, leadsRes, managersRes] = await Promise.all([
      this.getRequests(),
      this.getBills(),
      this.getClients(),
      this.getLeads(),
      this.getManagers()
    ]);

    return {
      requests: requestsRes.success ? requestsRes.data : [],
      bills: billsRes.success ? billsRes.data : [],
      clients: clientsRes.success ? clientsRes.data : [],
      leads: leadsRes.success ? leadsRes.data : [],
      managers: managersRes.success ? managersRes.data : []
    };
  }
}

// Экспортируем singleton экземпляр
export const dataService = new DataService();