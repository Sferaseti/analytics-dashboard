import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { 
  getReportsByTeam, 
  getReportTemplatesByTeam, 
  createReport 
} from '@/lib/db/queries/reports';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const [reports, templates] = await Promise.all([
      getReportsByTeam(userWithTeam.teamId),
      getReportTemplatesByTeam(userWithTeam.teamId)
    ]);

    return NextResponse.json({ reports, templates });
  } catch (error) {
    console.error('Error fetching reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const body = await request.json();
    const {
      name,
      description,
      chartType,
      dataSource,
      xAxis,
      yAxis,
      groupBy,
      dateRange,
      isScheduled,
      scheduleFrequency,
    } = body;

    if (!name || !chartType || !dataSource || !xAxis || !yAxis) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const config = {
      chartType,
      dataSource,
      xAxis,
      yAxis,
      groupBy: groupBy || null,
      dateRange: dateRange || 'last_30_days',
      filters: {},
    };

    const report = await createReport({
      name,
      description: description || undefined,
      chartType,
      dataSource,
      config: JSON.stringify(config),
      isScheduled: isScheduled || false,
      scheduleFrequency: isScheduled ? scheduleFrequency : undefined,
    }, userWithTeam.teamId, user.id);

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error('Error creating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}