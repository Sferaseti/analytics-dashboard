import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { 
  getReportById, 
  updateReport, 
  deleteReport 
} from '@/lib/db/queries/reports';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const reportId = parseInt(resolvedParams.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    const report = await getReportById(reportId, userWithTeam.teamId);
    if (!report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const reportId = parseInt(resolvedParams.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
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

    const config = {
      chartType,
      dataSource,
      xAxis,
      yAxis,
      groupBy: groupBy || null,
      dateRange: dateRange || 'last_30_days',
      filters: {},
    };

    const updatedReport = await updateReport(reportId, {
      name,
      description: description || undefined,
      chartType,
      dataSource,
      config: JSON.stringify(config),
      isScheduled: isScheduled || false,
      scheduleFrequency: isScheduled ? scheduleFrequency : undefined,
    }, userWithTeam.teamId);

    return NextResponse.json(updatedReport);
  } catch (error) {
    console.error('Error updating report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params;
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userWithTeam = await getUserWithTeam(user.id);
    if (!userWithTeam?.teamId) {
      return NextResponse.json({ error: 'No team found' }, { status: 400 });
    }

    const reportId = parseInt(resolvedParams.id);
    if (isNaN(reportId)) {
      return NextResponse.json({ error: 'Invalid report ID' }, { status: 400 });
    }

    await deleteReport(reportId, userWithTeam.teamId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}