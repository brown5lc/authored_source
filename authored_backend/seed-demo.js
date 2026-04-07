// Demo seed script — run with: node seed-demo.js
// Seeds "The Ethics of AI in Higher Education" assignment + two contrasting submissions.
// Uses jane-doe (Alice, low-risk) and alex-smith (Bob, high-risk).

'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'authored.db');
const db = new DatabaseSync(DB_PATH);

// ── Timestamps ────────────────────────────────────────────────────────────────
// Alice: 2026-04-04 14:00 UTC  |  Bob: 2026-04-05 10:30 UTC
const BASE_A = Date.UTC(2026, 3, 4, 14, 0, 0);   // ms
const BASE_B = Date.UTC(2026, 3, 5, 10, 30, 0);  // ms
const ta = (s) => BASE_A + s * 1000;
const tb = (s) => BASE_B + s * 1000;

// ── Starter code (stored in the assignment) ────────────────────────────────────
const STARTER = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

def categorize_concern(concern):
    # Your code here
    pass

def generate_report(concerns):
    # Your code here
    pass
`;

// ── Alice's snapshots (gradual, human-paced growth) ───────────────────────────
const A1 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity"]

def categorize_concern(concern):
    # Your code here
    pass

def generate_report(concerns):
    # Your code here
    pass
`;

const A2 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    # Your code here
    pass
`;

const A3 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access", "transparency"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1
`;

const A4 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access", "transparency"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1

    print("Ethics Report")
    print("-" * 20)
    for cat, count in report.items():
        print(cat + ": " + str(count))
`;

const A5 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access", "transparency"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1

    print("Ethics Report")
    print("-" * 20)
    for cat, count in report.items():
        print(cat + ": " + str(count))

test_concerns = [
    "AI tools may compromise student privacy",
    "Grading bias in automated systems",
]
generate_report(test_concerns)
`;

const A6 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access", "transparency"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1

    print("AI Ethics Report")
    print("-" * 20)
    for cat, count in report.items():
        print(cat + ": " + str(count))

test_concerns = [
    "AI tools may compromise student privacy",
    "Grading bias in automated systems",
    "Students using AI to cheat on work",
]
generate_report(test_concerns)
`;

const A7 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ["privacy", "bias", "academic integrity", "access", "transparency"]

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return "other"

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1

    print("AI Ethics Report")
    print("-" * 20)
    for cat, count in report.items():
        print(cat + ": " + str(count))

test_concerns = [
    "AI tools may compromise student privacy",
    "Grading bias in automated systems",
    "Students using AI to cheat on work",
    "Not all students have access to these tools",
]
generate_report(test_concerns)
`;

// A8: tiny cleanup — changed double-quote to single and fixed spacing
const A8 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns

CATEGORIES = ['privacy', 'bias', 'academic integrity', 'access', 'transparency']

def categorize_concern(concern):
    concern = concern.lower()
    for cat in CATEGORIES:
        if cat in concern:
            return cat
    return 'other'

def generate_report(concerns):
    report = {}
    for concern in concerns:
        cat = categorize_concern(concern)
        if cat not in report:
            report[cat] = 0
        report[cat] += 1

    print('AI Ethics Report')
    print('-' * 20)
    for cat, count in report.items():
        print(f'{cat}: {count}')

test_concerns = [
    'AI tools may compromise student privacy',
    'Grading bias in automated systems',
    'Students using AI to cheat on work',
    'Not all students have access to these tools',
]
generate_report(test_concerns)
`;

// ── Bob's snapshots ────────────────────────────────────────────────────────────
// Bob barely types before pasting a fully-formed AI-written solution

const BOB_SNAP1 = `# The Ethics of AI in Higher Education
# Write functions to analyze and categorize AI ethics concerns
# TODO: implement

def categorize_concern(concern):
    # Your code here
    pass

def generate_report(concerns):
    # Your code here
    pass
`;

// The paste content — obviously AI-generated: verbose docstrings, type hints, sorted output, __main__ guard
const BOB_PASTE = `# The Ethics of AI in Higher Education
# Comprehensive implementation of an AI ethics concern categorization and reporting system

ETHICAL_CATEGORIES = {
    "privacy": ["privacy", "data", "surveillance", "tracking", "personal information"],
    "bias": ["bias", "discrimination", "fairness", "equity", "prejudice"],
    "academic integrity": ["cheat", "plagiarism", "dishonesty", "integrity", "misconduct"],
    "access": ["access", "inequality", "digital divide", "affordability", "availability"],
    "transparency": ["transparency", "explainability", "interpretability", "accountability"],
}

def categorize_concern(concern: str) -> str:
    """
    Categorizes an ethical concern related to AI in higher education.

    Args:
        concern: A string describing an ethical concern.

    Returns:
        The category that best matches the concern, or 'other' if no match found.
    """
    concern_lower = concern.lower()
    for category, keywords in ETHICAL_CATEGORIES.items():
        if any(keyword in concern_lower for keyword in keywords):
            return category
    return "other"

def generate_report(concerns: list) -> None:
    """
    Generates a comprehensive categorized report of AI ethics concerns.

    Args:
        concerns: A list of concern strings to analyze and categorize.
    """
    category_counts = {}
    categorized_concerns = {}

    for concern in concerns:
        category = categorize_concern(concern)
        if category not in category_counts:
            category_counts[category] = 0
            categorized_concerns[category] = []
        category_counts[category] += 1
        categorized_concerns[category].append(concern)

    print("=" * 50)
    print("AI Ethics in Higher Education: Concern Report")
    print("=" * 50)

    for category, count in sorted(category_counts.items()):
        print(f"\\n{category.upper()} ({count} concern{'s' if count != 1 else ''})")
        print("-" * 30)
        for c in categorized_concerns[category]:
            print(f"  - {c}")

    print("\\n" + "=" * 50)
    print(f"Total concerns analyzed: {len(concerns)}")

if __name__ == "__main__":
    sample_concerns = [
        "AI systems may compromise student privacy through behavioral tracking",
        "Automated grading systems could perpetuate existing societal biases",
        "Students may leverage AI to complete assignments dishonestly",
        "Not all students have equal access to AI-powered learning tools",
        "AI decision-making in admissions processes lacks transparency",
        "Personal data collected by AI tutoring platforms raises privacy concerns",
        "AI-generated content recommendations may reflect and amplify inequalities",
    ]
    generate_report(sample_concerns)
`;

// After paste, Bob removes the __main__ guard and directly calls the function
const BOB_FINAL = `# The Ethics of AI in Higher Education
# Comprehensive implementation of an AI ethics concern categorization and reporting system

ETHICAL_CATEGORIES = {
    "privacy": ["privacy", "data", "surveillance", "tracking", "personal information"],
    "bias": ["bias", "discrimination", "fairness", "equity", "prejudice"],
    "academic integrity": ["cheat", "plagiarism", "dishonesty", "integrity", "misconduct"],
    "access": ["access", "inequality", "digital divide", "affordability", "availability"],
    "transparency": ["transparency", "explainability", "interpretability", "accountability"],
}

def categorize_concern(concern: str) -> str:
    """
    Categorizes an ethical concern related to AI in higher education.

    Args:
        concern: A string describing an ethical concern.

    Returns:
        The category that best matches the concern, or 'other' if no match found.
    """
    concern_lower = concern.lower()
    for category, keywords in ETHICAL_CATEGORIES.items():
        if any(keyword in concern_lower for keyword in keywords):
            return category
    return "other"

def generate_report(concerns: list) -> None:
    """
    Generates a comprehensive categorized report of AI ethics concerns.

    Args:
        concerns: A list of concern strings to analyze and categorize.
    """
    category_counts = {}
    categorized_concerns = {}

    for concern in concerns:
        category = categorize_concern(concern)
        if category not in category_counts:
            category_counts[category] = 0
            categorized_concerns[category] = []
        category_counts[category] += 1
        categorized_concerns[category].append(concern)

    print("=" * 50)
    print("AI Ethics in Higher Education: Concern Report")
    print("=" * 50)

    for category, count in sorted(category_counts.items()):
        print(f"\\n{category.upper()} ({count} concern{'s' if count != 1 else ''})")
        print("-" * 30)
        for c in categorized_concerns[category]:
            print(f"  - {c}")

    print("\\n" + "=" * 50)
    print(f"Total concerns analyzed: {len(concerns)}")

sample_concerns = [
    "AI systems may compromise student privacy through behavioral tracking",
    "Automated grading systems could perpetuate existing societal biases",
    "Students may leverage AI to complete assignments dishonestly",
    "Not all students have equal access to AI-powered learning tools",
    "AI decision-making in admissions processes lacks transparency",
    "Personal data collected by AI tutoring platforms raises privacy concerns",
    "AI-generated content recommendations may reflect and amplify inequalities",
]
generate_report(sample_concerns)
`;

// ── Alice events ──────────────────────────────────────────────────────────────
const aliceEvents = [
  { type: 'edit',         timestamp: ta(0),    codeSnapshot: A1 },
  { type: 'edit',         timestamp: ta(45),   codeSnapshot: A2 },
  { type: 'edit',         timestamp: ta(120),  codeSnapshot: A3 },
  { type: 'focus_lost',   timestamp: ta(180)                    },
  { type: 'focus_gained', timestamp: ta(300)                    },
  { type: 'edit',         timestamp: ta(360),  codeSnapshot: A4 },
  { type: 'edit',         timestamp: ta(480),  codeSnapshot: A5 },
  { type: 'focus_lost',   timestamp: ta(600)                    },
  { type: 'focus_gained', timestamp: ta(780)                    },
  { type: 'edit',         timestamp: ta(840),  codeSnapshot: A6 },
  { type: 'edit',         timestamp: ta(960),  codeSnapshot: A7 },
  { type: 'run',          timestamp: ta(1080), codeSnapshot: A7 },
  { type: 'edit',         timestamp: ta(1140), codeSnapshot: A8 },
  { type: 'submit',       timestamp: ta(1320), codeSnapshot: A8 },
];

// ── Bob events ────────────────────────────────────────────────────────────────
const bobEvents = [
  { type: 'edit',         timestamp: tb(0),   codeSnapshot: BOB_SNAP1 },
  { type: 'focus_lost',   timestamp: tb(20)                            },
  { type: 'focus_gained', timestamp: tb(55)                            },
  { type: 'focus_lost',   timestamp: tb(75)                            },
  { type: 'focus_gained', timestamp: tb(110)                           },
  { type: 'paste',        timestamp: tb(130), detail: BOB_PASTE, codeSnapshot: BOB_PASTE },
  { type: 'edit',         timestamp: tb(140), codeSnapshot: BOB_FINAL  },
  { type: 'run',          timestamp: tb(170), codeSnapshot: BOB_FINAL  },
  { type: 'submit',       timestamp: tb(200), codeSnapshot: BOB_FINAL  },
];

// ── Risk score computation (mirrors Timeline.tsx computeRisk) ─────────────────
function computeRisk(events, starterCode) {
  let score = 0;
  const findings = [];

  const pastes       = events.filter(e => e.type === 'paste');
  const focusLosses  = events.filter(e => e.type === 'focus_lost');
  const snapshots    = events.filter(e => e.codeSnapshot);

  const finalCode    = snapshots.length > 0 ? snapshots[snapshots.length - 1].codeSnapshot : starterCode;
  const starterChars = starterCode.replace(/\s/g, '').length;
  const finalChars   = finalCode.replace(/\s/g, '').length;
  const addedChars   = Math.max(1, finalChars - starterChars);

  const totalPastedChars = pastes.reduce((s, e) => s + (e.detail?.replace(/\s/g, '').length ?? 0), 0);
  const totalPastedLines = pastes.reduce((s, e) => s + (e.detail?.split('\n').length ?? 1), 0);
  const pasteRatio       = Math.min(1, totalPastedChars / addedChars);

  const durationMin = events.length > 1
    ? (events[events.length - 1].timestamp - events[0].timestamp) / 60000
    : 0;

  // Paste count
  if (pastes.length > 0) {
    score += pastes.length >= 3 ? 25 : pastes.length === 2 ? 15 : 8;
    findings.push({ label: `${pastes.length} paste event(s) · ${totalPastedLines} lines`, severity: pastes.length >= 3 ? 'critical' : 'warning' });
  }

  // Paste ratio
  if (pasteRatio > 0.35) {
    score += pasteRatio > 0.6 ? 30 : 15;
    findings.push({ label: `${Math.round(pasteRatio * 100)}% of solution came from paste`, severity: pasteRatio > 0.6 ? 'critical' : 'warning' });
  }

  // Large single pastes
  const largePastes = pastes.filter(e => (e.detail?.split('\n').length ?? 0) > 5);
  if (largePastes.length > 0) {
    const maxLines = Math.max(...largePastes.map(e => e.detail?.split('\n').length ?? 0));
    score += 20;
    findings.push({ label: `${largePastes.length} large paste(s) — up to ${maxLines} lines`, severity: 'critical' });
  }

  // Tab switching
  if (focusLosses.length >= 1) {
    score += focusLosses.length >= 4 ? 20 : focusLosses.length >= 2 ? 10 : 5;
    findings.push({ label: `Left page ${focusLosses.length} time(s)`, severity: focusLosses.length >= 4 ? 'critical' : 'warning' });
  }

  // Fast completion
  if (durationMin > 0 && durationMin < 4 && addedChars > 100) {
    score += 15;
    findings.push({ label: `Completed in ${durationMin.toFixed(1)}m`, severity: 'warning' });
  }

  // Ghost typing
  const editSnaps = snapshots.filter(e => e.type === 'edit');
  let maxGhostChars = 0;
  for (let i = 1; i < editSnaps.length; i++) {
    const timeSec  = (editSnaps[i].timestamp - editSnaps[i - 1].timestamp) / 1000;
    const charDelta = editSnaps[i].codeSnapshot.length - editSnaps[i - 1].codeSnapshot.length;
    if (charDelta > 0 && timeSec > 0 && timeSec < charDelta / 10) {
      maxGhostChars = Math.max(maxGhostChars, charDelta);
    }
  }
  if (maxGhostChars > 80) {
    score += 15;
    findings.push({ label: `${maxGhostChars} chars appeared faster than possible typing`, severity: maxGhostChars > 200 ? 'critical' : 'warning' });
  }

  const level = score >= 50 ? 'high' : score >= 20 ? 'medium' : 'low';
  return { score: Math.min(100, score), level, findings };
}

// ── Seed assignment ────────────────────────────────────────────────────────────
function seedAssignment() {
  const existing = db.prepare('SELECT id FROM assignments WHERE id = ?').get('ai-ethics-analysis');
  if (existing) {
    console.log('  Assignment already exists — skipping insert.');
    return;
  }
  db.prepare(`
    INSERT INTO assignments (id, class_id, title, subtitle, prompt, starter_code, due_date, points, test_cases, allow_tutor)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'ai-ethics-analysis',
    'cs101',
    'The Ethics of AI in Higher Education',
    'Ethics & Society',
    JSON.stringify([
      'Write two Python functions to analyze ethical concerns about AI in education:',
      '',
      '1. categorize_concern(concern) — takes a string and returns which ethical category it belongs to',
      '   (privacy, bias, academic integrity, access, transparency, or other)',
      '',
      '2. generate_report(concerns) — takes a list of concern strings, categorizes each,',
      '   and prints a summary report.',
      '',
      'Test your functions with at least three different concern strings.',
    ]),
    STARTER,
    'Apr 14, 2026',
    15,
    '[]',
    1,
  );
  console.log('  Created assignment: ai-ethics-analysis');
}

// ── Seed submissions ──────────────────────────────────────────────────────────
function seedSubmission(userId, assignmentId, events, submittedAtMs) {
  const submittedAtSec = Math.floor(submittedAtMs / 1000);
  db.prepare(`
    INSERT INTO submissions (user_id, assignment_id, events, score, submitted_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, assignment_id) DO UPDATE SET
      events = excluded.events,
      score = excluded.score,
      submitted_at = excluded.submitted_at
  `).run(userId, assignmentId, JSON.stringify(events), null, submittedAtSec);
  console.log(`  Upserted submission: ${userId} → ${assignmentId}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n=== SEEDING DEMO DATA ===\n');

seedAssignment();
seedSubmission('jane-doe',   'ai-ethics-analysis', aliceEvents, ta(1320));
seedSubmission('alex-smith', 'ai-ethics-analysis', bobEvents,   tb(200));

// ── Risk score verification ───────────────────────────────────────────────────
console.log('\n=== RISK SCORE ANALYSIS ===\n');

const aliceRisk = computeRisk(aliceEvents, STARTER);
const bobRisk   = computeRisk(bobEvents,   STARTER);

function printRisk(name, risk, target) {
  const ok = target === 'low' ? risk.score < 20 : risk.score > 75;
  console.log(`${name}:`);
  console.log(`  Score: ${risk.score}/100  Level: ${risk.level}  Target: ${target}  ${ok ? '✓ PASS' : '✗ FAIL'}`);
  risk.findings.forEach(f => console.log(`    [${f.severity}] ${f.label}`));
  if (!ok) console.log(`  *** TARGET MISSED — needs adjustment ***`);
  console.log();
}

printRisk('Jane Doe (Alice / low-risk)',    aliceRisk, 'low');
printRisk('Alex Smith (Bob / high-risk)',   bobRisk,   'high');

// ── Derived metrics summary ───────────────────────────────────────────────────
console.log('=== SIGNAL BREAKDOWN ===\n');

function analyzeSignals(name, events, starterCode) {
  const pastes      = events.filter(e => e.type === 'paste');
  const focusLosses = events.filter(e => e.type === 'focus_lost');
  const snapshots   = events.filter(e => e.codeSnapshot);
  const finalCode   = snapshots.length > 0 ? snapshots[snapshots.length - 1].codeSnapshot : starterCode;
  const addedChars  = Math.max(1, finalCode.replace(/\s/g,'').length - starterCode.replace(/\s/g,'').length);
  const pastedChars = pastes.reduce((s,e) => s + (e.detail?.replace(/\s/g,'').length ?? 0), 0);
  const durationMin = events.length > 1 ? (events[events.length-1].timestamp - events[0].timestamp) / 60000 : 0;

  console.log(`${name}:`);
  console.log(`  Duration:     ${durationMin.toFixed(1)} min`);
  console.log(`  Paste events: ${pastes.length}`);
  console.log(`  Paste ratio:  ${Math.round(Math.min(1, pastedChars / addedChars) * 100)}%  (${pastedChars} / ${addedChars} non-ws chars added)`);
  console.log(`  Tab switches: ${focusLosses.length}`);
  console.log(`  Snapshots:    ${snapshots.length}`);
  console.log();
}

analyzeSignals('Jane Doe',   aliceEvents, STARTER);
analyzeSignals('Alex Smith', bobEvents,   STARTER);

// ── Endpoint check via DB ─────────────────────────────────────────────────────
console.log('=== ENDPOINT / DB CHECKS ===\n');

const recent = db.prepare(`
  SELECT s.user_id, s.assignment_id, s.submitted_at, a.title, a.class_id
  FROM submissions s JOIN assignments a ON s.assignment_id = a.id
  ORDER BY s.submitted_at DESC LIMIT 5
`).all();

console.log('Recent submissions (mirrors /api/submissions/recent):');
recent.forEach(r => console.log(`  ${r.user_id} → "${r.title}" (${r.class_id}) at ${new Date(r.submitted_at * 1000).toISOString()}`));

const aliceSub = db.prepare('SELECT user_id, assignment_id, events FROM submissions WHERE user_id = ? AND assignment_id = ?')
  .get('jane-doe', 'ai-ethics-analysis');
const bobSub   = db.prepare('SELECT user_id, assignment_id, events FROM submissions WHERE user_id = ? AND assignment_id = ?')
  .get('alex-smith', 'ai-ethics-analysis');

const aliceEventsDB = JSON.parse(aliceSub.events);
const bobEventsDB   = JSON.parse(bobSub.events);

console.log(`\nAlice events in DB: ${aliceEventsDB.length} — sequence: ${aliceEventsDB.map(e => e.type).join(' → ')}`);
const aliceSorted = aliceEventsDB.every((e, i) => i === 0 || e.timestamp >= aliceEventsDB[i-1].timestamp);
console.log(`  Timestamps in order: ${aliceSorted ? '✓ yes' : '✗ NO — out of order!'}`);
const aliceSnaps  = aliceEventsDB.filter(e => e.codeSnapshot);
console.log(`  Snapshots with data: ${aliceSnaps.length} / ${aliceEventsDB.length}`);

console.log(`\nBob events in DB: ${bobEventsDB.length} — sequence: ${bobEventsDB.map(e => e.type).join(' → ')}`);
const bobSorted = bobEventsDB.every((e, i) => i === 0 || e.timestamp >= bobEventsDB[i-1].timestamp);
console.log(`  Timestamps in order: ${bobSorted ? '✓ yes' : '✗ NO — out of order!'}`);
const bobSnaps  = bobEventsDB.filter(e => e.codeSnapshot);
console.log(`  Snapshots with data: ${bobSnaps.length} / ${bobEventsDB.length}`);
console.log(`  Paste detail present: ${bobEventsDB.find(e => e.type === 'paste')?.detail ? '✓ yes' : '✗ missing'}`);

console.log('\n=== ENDPOINT NOTE ===');
console.log('GET /api/submissions/:id/timeline — does NOT exist.');
console.log('The actual endpoint is: GET /api/submissions/:userId/:assignmentId');
console.log('The timeline UI lives at: /class/:classId/assignment/:assignmentId/timeline/:userId');
console.log('These do work — the frontend fetches submissions and assignments separately.\n');

db.close();
console.log('Done.\n');
