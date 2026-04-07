import { Router } from 'express';
import type { DatabaseSync } from 'node:sqlite';
import { getDb } from '../db';

const router = Router();

router.get('/', (req, res) => {
  const { classId } = req.query;
  const db = getDb();

  const rows = classId
    ? db.prepare('SELECT * FROM assignments WHERE class_id = ? ORDER BY created_at ASC').all(classId)
    : db.prepare('SELECT * FROM assignments ORDER BY created_at ASC').all();

  res.json(rows.map(deserialize));
});

router.get('/:id', (req, res) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);

  if (!row) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  res.json(deserialize(row));
});

router.post('/', (req, res) => {
  const { id, classId = 'cs101', title, subtitle, prompt, starterCode, dueDate, points = 10, testCases = [], allowTutor = true } = req.body;

  if (!id || !title || !prompt || !starterCode) {
    res.status(400).json({ error: 'id, title, prompt, and starterCode are required' });
    return;
  }

  const db = getDb();

  try {
    db.prepare(`
      INSERT INTO assignments (id, class_id, title, subtitle, prompt, starter_code, due_date, points, test_cases, allow_tutor)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, classId, title, subtitle ?? null, JSON.stringify(prompt), starterCode, dueDate ?? null, points, JSON.stringify(testCases), allowTutor ? 1 : 0);

    const created = db.prepare('SELECT * FROM assignments WHERE id = ?').get(id);
    res.status(201).json(deserialize(created));
  } catch (err: any) {
    if (err.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') {
      res.status(409).json({ error: 'Assignment with this id already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }
});

router.put('/:id', (req, res) => {
  const { title, subtitle, prompt, starterCode, dueDate, points, testCases, allowTutor = true } = req.body;

  if (!title || !prompt || !starterCode) {
    res.status(400).json({ error: 'title, prompt, and starterCode are required' });
    return;
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM assignments WHERE id = ?').get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  db.prepare(`
    UPDATE assignments SET
      title = ?, subtitle = ?, prompt = ?, starter_code = ?,
      due_date = ?, points = ?, test_cases = ?, allow_tutor = ?
    WHERE id = ?
  `).run(
    title,
    subtitle ?? null,
    JSON.stringify(prompt),
    starterCode,
    dueDate ?? null,
    points ?? 10,
    JSON.stringify(testCases ?? []),
    allowTutor ? 1 : 0,
    req.params.id,
  );

  const updated = db.prepare('SELECT * FROM assignments WHERE id = ?').get(req.params.id);
  res.json(deserialize(updated));
});

router.delete('/:id', (req, res) => {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM assignments WHERE id = ?').get(req.params.id);

  if (!existing) {
    res.status(404).json({ error: 'Assignment not found' });
    return;
  }

  db.prepare('DELETE FROM assignments WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

function deserialize(row: any) {
  return {
    ...row,
    classId: row.class_id,
    starterCode: row.starter_code,
    dueDate: row.due_date,
    createdAt: row.created_at,
    prompt: JSON.parse(row.prompt),
    testCases: JSON.parse(row.test_cases ?? '[]'),
    allowTutor: row.allow_tutor !== 0,
    class_id: undefined,
    starter_code: undefined,
    due_date: undefined,
    created_at: undefined,
    test_cases: undefined,
    allow_tutor: undefined,
  };
}

export default router;
