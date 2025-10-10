import { NextResponse } from 'next/server'
import { dataService } from '@/lib/api/data-service'

export async function GET() {
  try {
    const data = await dataService.getAllData()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch data' },
      { status: 500 }
    )
  }
}