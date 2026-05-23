import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user || (session.user.role !== 'SUPER_ADMIN' && session.user.role !== 'SUB_ADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { logId, logType } = body;

    if (!logId || !logType) {
      return NextResponse.json({ error: 'Log ID and type are required' }, { status: 400 });
    }

    if (logType === 'audit_logs') {
      await prisma.audit_logs.delete({
        where: { id: logId }
      });
      return NextResponse.json({ message: 'Audit log deleted successfully' });
    } else if (logType === 'bid_audit_log') {
      await prisma.bid_audit_log.delete({
        where: { id: logId }
      });
      return NextResponse.json({ message: 'Bid audit log deleted successfully' });
    } else if (logType === 'financial_ledger') {
      await prisma.financial_ledger.delete({
        where: { id: logId }
      });
      return NextResponse.json({ message: 'Financial ledger entry deleted successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid log type' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error deleting audit log:', error);
    return NextResponse.json(
      { error: 'Failed to delete audit log' },
      { status: 500 }
    );
  }
}
