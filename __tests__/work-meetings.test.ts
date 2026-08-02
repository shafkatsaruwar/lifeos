import { formatWorkMeetingWhere, type WorkMeeting } from '@/app/components/OSDashboards';

describe('WorkOS meetings', () => {
  const base: WorkMeeting = {
    id: 'meet-1',
    title: 'Q3 Meeting',
    start: '2026-08-02T18:30:00.000Z',
    type: 'other',
    createdAt: '2026-08-02T12:00:00.000Z',
  };

  it('formats in-person location like an iOS event', () => {
    expect(formatWorkMeetingWhere({
      ...base,
      format: 'in_person',
      location: 'Office 4B',
    })).toBe('In person · Office 4B');
  });

  it('formats virtual meetings with a call link', () => {
    expect(formatWorkMeetingWhere({
      ...base,
      format: 'virtual',
      virtualUrl: 'https://meet.google.com/abc',
    })).toBe('Virtual · https://meet.google.com/abc');
  });

  it('formats hybrid meetings with place and link', () => {
    expect(formatWorkMeetingWhere({
      ...base,
      format: 'hybrid',
      location: 'HQ',
      virtualUrl: 'https://zoom.us/j/1',
    })).toBe('Hybrid · HQ · https://zoom.us/j/1');
  });
});
