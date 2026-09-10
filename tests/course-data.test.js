const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'data', 'courses.json'), 'utf8')
);

const DAYS = new Set(['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma']);
const starts = new Set(data.timeSlots.map(s => s.start));
const ends = new Set(data.timeSlots.map(s => s.end));

function officialHours(program){
  return program.courses.reduce((sum, course) => {
    const groups = new Set(course.sessions.map(s => s.group).filter(Boolean));
    const multiplier = groups.size || 1;
    return sum + course.hds * multiplier;
  }, 0);
}

test('dataset metadata matches 2026-2027 fall source pages', () => {
  assert.equal(data.term, '2026-2027 Güz Dönemi');
  assert.deepEqual(data.source.pages, [1, 2]);
  assert.equal(data.source.generatedAt, '04.09.2026');
  assert.equal(data.timeSlots.length, 13);
  assert.deepEqual(data.timeSlots[0], { slot: 1, start: '08:30', end: '09:15' });
  assert.deepEqual(data.timeSlots[12], { slot: 13, start: '19:30', end: '20:15' });
});

test('official program totals are preserved', () => {
  const bp1 = data.programs.find(p => p.id === 'bp1');
  const bp2 = data.programs.find(p => p.id === 'bp2');

  assert.ok(bp1);
  assert.ok(bp2);
  assert.equal(bp1.totalHours, 28);
  assert.equal(bp2.totalHours, 34);
  assert.equal(officialHours(bp1), 28);
  assert.equal(officialHours(bp2), 34);
});

test('every course and session has complete official schedule metadata', () => {
  for (const program of data.programs){
    for (const course of program.courses){
      assert.ok(course.code, `${program.id}/${course.key}: missing code`);
      assert.ok(Number.isInteger(course.hds) && course.hds > 0, `${program.id}/${course.key}: invalid HDS`);
      assert.ok(course.sessions.length > 0, `${program.id}/${course.key}: missing sessions`);

      for (const session of course.sessions){
        assert.ok(DAYS.has(session.day), `${program.id}/${course.key}: invalid day ${session.day}`);
        assert.ok(starts.has(session.start), `${program.id}/${course.key}: invalid start ${session.start}`);
        assert.ok(ends.has(session.end), `${program.id}/${course.key}: invalid end ${session.end}`);
        assert.ok(session.room, `${program.id}/${course.key}: missing room`);
        assert.ok(session.teacher, `${program.id}/${course.key}: missing teacher`);
      }
    }
  }
});

test('key source sessions match the official first two pages', () => {
  const bp1 = data.programs.find(p => p.id === 'bp1');
  const bp2 = data.programs.find(p => p.id === 'bp2');

  const prog = bp1.courses.find(c => c.key === 'prog1');
  assert.deepEqual(
    prog.sessions.map(s => [s.group, s.day, s.start, s.end, s.room]),
    [
      [1, 'Pazartesi', '08:30', '12:35', 'M-306'],
      [2, 'Salı', '08:30', '12:35', 'M-306']
    ]
  );

  const web = bp1.courses.find(c => c.key === 'web1');
  assert.deepEqual(
    web.sessions.map(s => [s.group, s.day, s.start, s.end, s.room]),
    [
      [1, 'Çarşamba', '14:00', '18:25', 'M-306'],
      [2, 'Perşembe', '08:30', '12:35', 'M-306']
    ]
  );

  const law = bp2.courses.find(c => c.key === 'law');
  assert.deepEqual(
    [law.sessions[0].day, law.sessions[0].start, law.sessions[0].end, law.sessions[0].room],
    ['Çarşamba', '15:50', '18:25', 'C-121']
  );

  const ai = bp2.courses.find(c => c.key === 'ai');
  assert.deepEqual(
    [ai.sessions[0].day, ai.sessions[0].start, ai.sessions[0].end, ai.sessions[0].room],
    ['Cuma', '14:00', '17:30', 'M-302']
  );
});
