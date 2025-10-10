import { UonRequest, UonBill, UonClient, UonLead, UonManager } from './uon-client'

export interface ClientDataServiceResponse {
  requests: UonRequest[]
  bills: UonBill[]
  clients: UonClient[]
  leads: UonLead[]
  managers: UonManager[]
}

class ClientDataService {
  async getAllData(): Promise<ClientDataServiceResponse> {
    try {
      const response = await fetch('/api/data')
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        requests: data.requests || [],
        bills: data.bills || [],
        clients: data.clients || [],
        leads: data.leads || [],
        managers: data.managers || []
      }
    } catch (error) {
      console.error('Error fetching data from API:', error)
      return {
        requests: [],
        bills: [],
        clients: [],
        leads: [],
        managers: []
      }
    }
  }
}

export const clientDataService = new ClientDataService()