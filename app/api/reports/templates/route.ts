import { NextRequest, NextResponse } from 'next/server';
import { getUser, getUserWithTeam } from '@/lib/db/queries';
import { 
  getReportTemplatesByTeam,
  getPublicReportTemplates,
  createReportTemplate 
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

    const [teamTemplates, publicTemplates] = await Promise.all([
      getReportTemplatesByTeam(userWithTeam.teamId),
      getPublicReportTemplates(userWithTeam.teamId)
    ]);

    return NextResponse.json({ 
      teamTemplates, 
      publicTemplates 
    });
  } catch (error) {
    console.error('Error fetching report templates:', error);
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
      config,
      isPublic = false
    } = body;

    if (!name || !chartType || !dataSource || !config) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const template = await createReportTemplate({
      name,
      description: description || undefined,
      chartType,
      dataSource,
      config: typeof config === 'string' ? config : JSON.stringify(config),
      isPublic
    }, userWithTeam.teamId, user.id);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating report template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}