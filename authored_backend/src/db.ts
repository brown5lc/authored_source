import { DatabaseSync } from 'node:sqlite';
import path from 'path';

const DB_PATH = path.join(__dirname, '..', 'authored.db');

let db: DatabaseSync;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
  }
  return db;
}

export function initDb(): void {
  const db = getDb();

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL DEFAULT 'cs101',
      title TEXT NOT NULL,
      subtitle TEXT,
      prompt TEXT NOT NULL,
      starter_code TEXT NOT NULL,
      due_date TEXT,
      points INTEGER NOT NULL DEFAULT 10,
      test_cases TEXT NOT NULL DEFAULT '[]',
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      assignment_id TEXT NOT NULL,
      events TEXT NOT NULL,
      score REAL,
      submitted_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_id, assignment_id)
    );
  `);

  // Migrate existing tables if columns are missing
  migrate(db);
  seedAssignments(db);
}

function migrate(db: DatabaseSync): void {
  const assignmentCols = (db.prepare('PRAGMA table_info(assignments)').all() as { name: string }[]).map((r) => r.name);
  if (!assignmentCols.includes('test_cases')) {
    db.exec(`ALTER TABLE assignments ADD COLUMN test_cases TEXT NOT NULL DEFAULT '[]'`);
  }
  if (!assignmentCols.includes('allow_tutor')) {
    db.exec(`ALTER TABLE assignments ADD COLUMN allow_tutor INTEGER NOT NULL DEFAULT 1`);
  }

  const submissionCols = (db.prepare('PRAGMA table_info(submissions)').all() as { name: string }[]).map((r) => r.name);
  if (!submissionCols.includes('score')) {
    db.exec(`ALTER TABLE submissions ADD COLUMN score REAL`);
  }
  if (!submissionCols.includes('comments')) {
    db.exec(`ALTER TABLE submissions ADD COLUMN comments TEXT`);
  }
}

function seedAssignments(db: DatabaseSync): void {
  if (!db.prepare('SELECT id FROM assignments WHERE id = ?').get('hello-output')) {
    db.prepare(`
      INSERT INTO assignments (id, class_id, title, subtitle, prompt, starter_code, due_date, points, test_cases)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'hello-output',
      'cs101',
      'Hello, Output!',
      'Print Statements',
      JSON.stringify([
        'Write a Python program that prints three lines:',
        '',
        '1. "Hello, World!"',
        '2. Your name',
        '3. The result of 7 + 3',
      ]),
      `# Hello, Output!\n# Complete each print statement below\n\nprint()  # Print "Hello, World!"\nprint()  # Print your name\nprint()  # Print the sum of 7 + 3\n`,
      'Apr 10, 2026',
      10,
      '[]',
    );
  }

  if (!db.prepare('SELECT id FROM assignments WHERE id = ?').get('recursive-sum')) {
    db.prepare(`
      INSERT INTO assignments (id, class_id, title, subtitle, prompt, starter_code, due_date, points, test_cases)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'recursive-sum',
      'cs201',
      'Recursive Sum',
      'Recursion',
      JSON.stringify([
        'Write a recursive function called recursive_sum that takes a list of numbers and returns their total.',
        '',
        'Requirements:',
        '- You may not use the built-in sum() function',
        '- Your solution must be recursive (no loops)',
        '',
        'Example:',
        '  recursive_sum([1, 2, 3, 4, 5])  →  15',
        '  recursive_sum([])               →  0',
      ]),
      `def recursive_sum(lst):\n    # Base case: empty list\n    if len(lst) == 0:\n        return 0\n    # Recursive case: first element + sum of the rest\n    # Your code here\n    pass\n\nprint(recursive_sum([1, 2, 3, 4, 5]))  # Should print 15\n`,
      'Apr 17, 2026',
      20,
      JSON.stringify([
        { description: 'Empty list', input: '', expectedOutput: '0' },
        { description: 'Single element', input: '', expectedOutput: '5' },
        { description: 'Multiple elements', input: '', expectedOutput: '15' },
      ]),
    );
  }
}
