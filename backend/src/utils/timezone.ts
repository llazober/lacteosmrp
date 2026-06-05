import { PrismaService } from '../prisma.service';

export async function getTimezoneOffsetMinutes(
  prisma: PrismaService,
): Promise<{ offsetMinutes: number; offsetStr: string; timezone: string }> {
  const config = await prisma.configuracion.findUnique({
    where: { clave: 'system_timezone' },
  });
  const tz = config?.valor || 'America/El_Salvador';
  let tzOffset = -360; // default UTC-6 (El Salvador)

  try {
    const now = new Date();
    const tzString = now.toLocaleString('en-US', { timeZone: tz });
    const localDate = new Date(tzString);
    const utcString = now.toLocaleString('en-US', { timeZone: 'UTC' });
    const utcDate = new Date(utcString);
    tzOffset = Math.round((localDate.getTime() - utcDate.getTime()) / 60000);
  } catch (e) {
    if (tz === 'America/Santiago') tzOffset = -240;
    else if (tz === 'America/Bogota') tzOffset = -300;
  }

  const absOffset = Math.abs(tzOffset);
  const offsetHours = Math.floor(absOffset / 60);
  const offsetMins = absOffset % 60;
  const sign = tzOffset >= 0 ? '+' : '-';
  const offsetStr = `${sign}${String(offsetHours).padStart(2, '0')}:${String(offsetMins).padStart(2, '0')}`;

  return {
    offsetMinutes: tzOffset,
    offsetStr,
    timezone: tz,
  };
}
