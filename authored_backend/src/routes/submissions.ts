import { Router } from 'express';
import { getDb } from '../db';

const router = Router();

// Save (or replace) a session's events
router.post('/', (req, res) => {
  const { userId, assignmentId, events, score } = req.body;

  if (!userId || !assignmentId || !Array.isArray(events)) {
    res.status(400).json({ error: 'userId, assignmentId, and events[] are required' });
    return;
  }

  const db = getDb();

  try {
    db.prepare(`
      INSERT INTO submissions (user_id, assignment_id, events, score)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, assignment_id) DO UPDATE SET
        events = excluded.events,
        score = excluded.score,
        submitted_at = unixepoch()
    `).run(userId, assignmentId, JSON.stringify(events), score ?? null);

    res.status(201).json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Recent submissions across all assignments (for dashboard)
router.get('/recent', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  const db = getDb();
  const rows = db.prepare(`
    SELECT s.user_id, s.assignment_id, s.submitted_at, s.score,
           a.title AS assignment_title, a.class_id, a.points
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    ORDER BY s.submitted_at DESC
    LIMIT ?
  `).all(limit) as any[];

  res.json(rows.map((r) => ({
    userId: r.user_id,
    assignmentId: r.assignment_id,
    submittedAt: r.submitted_at,
    score: r.score ?? null,
    assignmentTitle: r.assignment_title,
    classId: r.class_id,
    points: r.points,
  })));
});

// Get all submissions for an assignment (professor view — must be before /:userId/:assignmentId)
router.get('/assignment/:assignmentId', (req, res) => {
  const { assignmentId } = req.params;
  const db = getDb();

  const rows = db
    .prepare('SELECT user_id, assignment_id, submitted_at, score FROM submissions WHERE assignment_id = ?')
    .all(assignmentId) as any[];

  res.json(
    rows.map((r) => ({
      userId: r.user_id,
      assignmentId: r.assignment_id,
      submittedAt: r.submitted_at,
      score: r.score ?? null,
    }))
  );
});

// Get a single student's session events
router.get('/:userId/:assignmentId', (req, res) => {
  const { userId, assignmentId } = req.params;
  const db = getDb();

  const row = db
    .prepare('SELECT * FROM submissions WHERE user_id = ? AND assignment_id = ?')
    .get(userId, assignmentId) as any;

  if (!row) {
    res.status(404).json({ error: 'No submission found' });
    return;
  }

  res.json({
    userId: row.user_id,
    assignmentId: row.assignment_id,
    submittedAt: row.submitted_at,
    score: row.score ?? null,
    comments: row.comments ?? '',
    events: JSON.parse(row.events),
  });
});

// Update grade and/or comments for a submission
router.patch('/:userId/:assignmentId', (req, res) => {
  const { userId, assignmentId } = req.params;
  const { score, comments } = req.body;
  const db = getDb();

  const row = db
    .prepare('SELECT id FROM submissions WHERE user_id = ? AND assignment_id = ?')
    .get(userId, assignmentId);

  if (!row) {
    res.status(404).json({ error: 'No submission found' });
    return;
  }

  db.prepare(`
    UPDATE submissions SET
      score = COALESCE(?, score),
      comments = COALESCE(?, comments)
    WHERE user_id = ? AND assignment_id = ?
  `).run(score ?? null, comments ?? null, userId, assignmentId);

  res.json({ ok: true });
});

export default router;
