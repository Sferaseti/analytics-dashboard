/**
 * Fallback данные для туристов
 * Используются когда API недоступен или возвращает ошибку
 */

import { UonTourist } from '../api/uon-client'
import { TouristCacheData } from './tourist-cache'

export const fallbackTourists: UonTourist[] = [
  {
    id: 1,
    name: 'Иван Петров',
    email: 'ivan.petrov@example.com',
    phone: '+7 (999) 123-45-67',
    country: 'Россия',
    city: 'Москва',
    birth_date: '1985-03-15',
    passport_number: '1234 567890',
    created_at: '2023-01-15T10:30:00Z',
    last_trip_date: '2024-08-20',
    total_trips: 5,
    total_spent: 250000,
    status: 'active'
  },
  {
    id: 2,
    name: 'Мария Сидорова',
    email: 'maria.sidorova@example.com',
    phone: '+7 (999) 234-56-78',
    country: 'Россия',
    city: 'Санкт-Петербург',
    birth_date: '1990-07-22',
    passport_number: '2345 678901',
    created_at: '2023-02-10T14:20:00Z',
    last_trip_date: '2024-09-15',
    total_trips: 3,
    total_spent: 180000,
    status: 'active'
  },
  {
    id: 3,
    name: 'Алексей Козлов',
    email: 'alexey.kozlov@example.com',
    phone: '+7 (999) 345-67-89',
    country: 'Россия',
    city: 'Екатеринбург',
    birth_date: '1982-11-08',
    passport_number: '3456 789012',
    created_at: '2023-03-05T09:15:00Z',
    last_trip_date: '2024-06-10',
    total_trips: 8,
    total_spent: 420000,
    status: 'active'
  },
  {
    id: 4,
    name: 'Елена Волкова',
    email: 'elena.volkova@example.com',
    phone: '+7 (999) 456-78-90',
    country: 'Россия',
    city: 'Новосибирск',
    birth_date: '1988-05-30',
    passport_number: '4567 890123',
    created_at: '2023-04-12T16:45:00Z',
    last_trip_date: '2024-07-25',
    total_trips: 4,
    total_spent: 320000,
    status: 'active'
  },
  {
    id: 5,
    name: 'Дмитрий Морозов',
    email: 'dmitry.morozov@example.com',
    phone: '+7 (999) 567-89-01',
    country: 'Россия',
    city: 'Казань',
    birth_date: '1975-12-03',
    passport_number: '5678 901234',
    created_at: '2023-05-20T11:30:00Z',
    last_trip_date: '2023-12-15',
    total_trips: 12,
    total_spent: 680000,
    status: 'inactive'
  },
  {
    id: 6,
    name: 'Анна Лебедева',
    email: 'anna.lebedeva@example.com',
    phone: '+7 (999) 678-90-12',
    country: 'Россия',
    city: 'Ростов-на-Дону',
    birth_date: '1993-09-18',
    passport_number: '6789 012345',
    created_at: '2023-06-08T13:20:00Z',
    last_trip_date: '2024-10-05',
    total_trips: 2,
    total_spent: 95000,
    status: 'active'
  },
  {
    id: 7,
    name: 'Сергей Николаев',
    email: 'sergey.nikolaev@example.com',
    phone: '+7 (999) 789-01-23',
    country: 'Россия',
    city: 'Уфа',
    birth_date: '1980-04-25',
    passport_number: '7890 123456',
    created_at: '2023-07-14T08:10:00Z',
    last_trip_date: '2024-05-30',
    total_trips: 6,
    total_spent: 380000,
    status: 'active'
  },
  {
    id: 8,
    name: 'Ольга Федорова',
    email: 'olga.fedorova@example.com',
    phone: '+7 (999) 890-12-34',
    country: 'Россия',
    city: 'Воронеж',
    birth_date: '1987-01-12',
    passport_number: '8901 234567',
    created_at: '2023-08-22T15:40:00Z',
    last_trip_date: '2024-04-18',
    total_trips: 7,
    total_spent: 450000,
    status: 'active'
  },
  {
    id: 9,
    name: 'Павел Смирнов',
    email: 'pavel.smirnov@example.com',
    phone: '+7 (999) 901-23-45',
    country: 'Россия',
    city: 'Пермь',
    birth_date: '1991-08-07',
    passport_number: '9012 345678',
    created_at: '2023-09-30T12:25:00Z',
    last_trip_date: '2024-03-22',
    total_trips: 3,
    total_spent: 210000,
    status: 'active'
  },
  {
    id: 10,
    name: 'Татьяна Кузнецова',
    email: 'tatyana.kuznetsova@example.com',
    phone: '+7 (999) 012-34-56',
    country: 'Россия',
    city: 'Волгоград',
    birth_date: '1984-06-14',
    passport_number: '0123 456789',
    created_at: '2023-10-18T17:55:00Z',
    last_trip_date: '2023-11-28',
    total_trips: 9,
    total_spent: 520000,
    status: 'inactive'
  }
]

export function getFallbackTouristData(): TouristCacheData {
  const now = new Date()
  const nextUpdate = new Date(now.getTime() + 60 * 60 * 1000) // +1 час

  return {
    tourists: fallbackTourists,
    totalCount: fallbackTourists.length,
    lastUpdated: now.toISOString(),
    nextUpdate: nextUpdate.toISOString()
  }
}

export function getRandomTourists(count: number = 5): UonTourist[] {
  const shuffled = [...fallbackTourists].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, count)
}