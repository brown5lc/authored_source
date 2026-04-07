import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { loadPyodide } from 'pyodide';
import type { PyodideInterface } from 'pyodide';
import { useTracking } from '../context/TrackingContext';
import type { TrackingEvent } from '../context/TrackingContext';
import { useUser } from '../context/UserContext';
import TutorChat from '../components/TutorChat';
import { API_BASE } from '../lib/api';

interface TestCase {
  description: string;
  input: string;
  expectedOutput: string;
}

interface Assignment {
  id: string;
  title: string;
  subtitle: string;
  prompt: string[];
  starterCode: string;
  dueDate: string;
  points: number;
  testCases: TestCase[];
  allowTutor: boolean;
}

export default function AssignmentIDE() {
  const navigate = useNavigate();
  const { classId = 'cs101', assignmentId } = useParams<{ classId: string; assignmentId: string }>();
  const { addEvent, clearEvents, initEvents, getEvents } = useTracking();
  const { currentUser } = useUser();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutor, setShowTutor] = useState(false);

  const isPasteRef = useRef(false);
  const lastEditRef = useRef(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const isRevertingRef = useRef(false);
  const decorationsRef = useRef<string[]>([]);
  const editableRegionRef = useRef<{ before: number; after: number } | null>(null);

  function stripMarkers(code: string): string {
    return code
      .split('\n')
      .filter((l) => l.trim() !== '# [editable]' && l.trim() !== '# [/editable]')
      .join('\n');
  }

  function computeEditableRegion(starterCode: string): { before: number; after: number } | null {
    const lines = starterCode.split('\n');
    const startIdx = lines.findIndex((l) => l.trim() === '# [editable]');
    const endIdx   = lines.findIndex((l) => l.trim() === '# [/editable]');
    if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return null;
    const stripped     = lines.filter((l) => l.trim() !== '# [editable]' && l.trim() !== '# [/editable]');
    const contentLines = endIdx - startIdx - 1;
    return { before: startIdx, after: stripped.length - startIdx - contentLines };
  }

  // Fetch assignment metadata
  useEffect(() => {
    if (!assignmentId) return;
    fetch(`${API_BASE}/api/assignments/${assignmentId}`)
      .then((r) => r.json())
      .then((data: Assignment) => {
        setAssignment(data);
        editableRegionRef.current = computeEditableRegion(data.starterCode);
        setCode(stripMarkers(data.starterCode));
        setShowTutor(data.allowTutor ?? true);
      })
      .catch(() => {});
  }, [assignmentId]);

  // Load saved session from API (fall back to starterCode if none)
  useEffect(() => {
    if (!assignmentId || !assignment) return;
    isPasteRef.current = false;
    lastEditRef.current = 0;

    fetch(`${API_BASE}/api/submissions/${currentUser.id}/${assignmentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.events?.length) {
          initEvents(data.events);
          const lastSnapshot = [...data.events].reverse().find((e: TrackingEvent) => e.codeSnapshot);
          if (lastSnapshot?.codeSnapshot) {
            const clean = stripMarkers(lastSnapshot.codeSnapshot);
            setCode(clean);
            editorRef.current?.setValue(clean);
          }
        } else {
          clearEvents();
          const clean = stripMarkers(assignment.starterCode);
          setCode(clean);
          editorRef.current?.setValue(clean);
        }
      })
      .catch(() => {
        clearEvents();
      });
  }, [currentUser.id, assignmentId, assignment, initEvents, clearEvents]);

  const trackEvent = useCallback(
    (event: TrackingEvent) => {
      addEvent(event);
    },
    [addEvent]
  );

  const trackEventRef = useRef(trackEvent);
  useEffect(() => { trackEventRef.current = trackEvent; }, [trackEvent]);

  // Initialize Pyodide once
  useEffect(() => {
    const init = async () => {
      try {
        const py = await loadPyodide({
          indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/',
        });
        py.setStdout({ batched: (t: string) => setOutput((p) => p + t + '\n') });
        py.setStderr({ batched: (t: string) => setOutput((p) => p + t + '\n') });
        setPyodide(py);
      } catch (err) {
        setOutput(`Failed to load Python runtime:\n${String(err)}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Attach document-level tracking listeners
  useEffect(() => {
    const handleVisibility = () => {
      trackEventRef.current({
        type: document.hidden ? 'focus_lost' : 'focus_gained',
        timestamp: Date.now(),
      });
    };

    const handleCopy = () => {
      trackEventRef.current({ type: 'copy', timestamp: Date.now() });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  function applyDecorations(editorInstance: editor.IStandaloneCodeEditor, monacoApi: Monaco) {
    const model  = editorInstance.getModel();
    const region = editableRegionRef.current;
    if (!model || !region) {
      decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);
      return;
    }
    const total      = model.getLineCount();
    const startLine  = region.before + 1;
    const endLine    = total - region.after;
    const decors: editor.IModelDeltaDecoration[] = [];

    if (startLine > 1) {
      decors.push({
        range: new monacoApi.Range(1, 1, startLine - 1, 1),
        options: { isWholeLine: true, inlineClassName: 'locked-line' },
      });
    }
    if (endLine < total) {
      decors.push({
        range: new monacoApi.Range(endLine + 1, 1, total, 1),
        options: { isWholeLine: true, inlineClassName: 'locked-line' },
      });
    }

    decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, decors);
  }

  function handleEditorMount(editorInstance: editor.IStandaloneCodeEditor, monacoApi: Monaco) {
    editorRef.current = editorInstance;

    applyDecorations(editorInstance, monacoApi);

    // Monaco intercepts paste before it reaches document, so detect it here
    editorInstance.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && e.keyCode === monacoApi.KeyCode.KeyV) {
        isPasteRef.current = true;
        navigator.clipboard.readText()
          .then((pastedText) => {
            // Delay so the content change fires first and isPasteRef suppresses the edit event
            setTimeout(() => {
              trackEventRef.current({
                type: 'paste',
                timestamp: Date.now(),
                detail: pastedText,
                codeSnapshot: editorRef.current?.getValue(),
              });
            }, 50);
          })
          .catch(() => {
            setTimeout(() => {
              trackEventRef.current({
                type: 'paste',
                timestamp: Date.now(),
                codeSnapshot: editorRef.current?.getValue(),
              });
            }, 50);
          });
      }
    });

    editorInstance.onDidChangeModelContent((e) => {
      if (isRevertingRef.current) return;

      const model  = editorInstance.getModel();
      const region = editableRegionRef.current;
      if (!model || !region) return;

      // Derive the old total line count from the line delta of the changes
      const lineDelta = e.changes.reduce((sum, c) => {
        return sum + c.text.split('\n').length - (c.range.endLineNumber - c.range.startLineNumber + 1);
      }, 0);
      const oldTotal    = model.getLineCount() - lineDelta;
      const startLine   = region.before + 1;          // always fixed
      const oldEndLine  = oldTotal - region.after;    // in old coordinates

      const touchedLocked = e.changes.some(
        (c) => c.range.startLineNumber < startLine || c.range.endLineNumber > oldEndLine
      );

      if (touchedLocked) {
        isRevertingRef.current = true;
        editorInstance.trigger('locked', 'undo', null);
        isRevertingRef.current = false;
        applyDecorations(editorInstance, monacoApi);
        return;
      }

      applyDecorations(editorInstance, monacoApi);

      if (isPasteRef.current) {
        isPasteRef.current = false;
        return;
      }
      const now = Date.now();
      if (now - lastEditRef.current > 800) {
        trackEventRef.current({
          type: 'edit',
          timestamp: now,
          codeSnapshot: editorInstance.getValue(),
        });
        lastEditRef.current = now;
      }
    });
  }

  async function handleRun() {
    if (!pyodide) {
      setOutput('Python runtime is still loading...');
      return;
    }
    trackEvent({ type: 'run', timestamp: Date.now(), codeSnapshot: code });
    setOutput('');
    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      setOutput(String(err));
    }
  }

  async function autograde(testCases: TestCase[]): Promise<number | null> {
    if (!pyodide || testCases.length === 0) return null;

    let passed = 0;
    for (const tc of testCases) {
      let stdout = '';
      pyodide.setStdout({ batched: (t: string) => { stdout += t + '\n'; } });

      const preamble = tc.input
        ? `import sys\nfrom io import StringIO\nsys.stdin = StringIO(${JSON.stringify(tc.input)})\n`
        : '';

      try {
        await pyodide.runPythonAsync(preamble + code);
        if (stdout.trim() === tc.expectedOutput.trim()) passed++;
      } catch {
        // test case fails on error
      }
    }

    // Restore stdout for the output panel
    pyodide.setStdout({ batched: (t: string) => setOutput((p) => p + t + '\n') });

    return Math.round((passed / testCases.length) * (assignment?.points ?? 0));
  }

  async function handleSubmit() {
    if (!assignmentId || !assignment) return;
    trackEvent({ type: 'submit', timestamp: Date.now(), codeSnapshot: code });
    const events = getEvents();

    const score = await autograde(assignment.testCases);

    await fetch(`${API_BASE}/api/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: currentUser.id, assignmentId, events, score }),
    }).catch(() => {});

    navigate(`/class/${classId}`);
  }

  if (!assignment) {
    return <p style={{ color: '#888' }}>Loading assignment...</p>;
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 112px)' }}>

      {/* IDE column */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>{assignment.title}</h2>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>
              {classId.toUpperCase()} · {assignment.subtitle ? `${assignment.subtitle} · ` : ''}{assignment.points} pts · working as{' '}
              <span style={{ color: currentUser.color }}>{currentUser.name}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {assignment.allowTutor && (
              <button
                onClick={() => setShowTutor((v) => !v)}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: `1px solid ${showTutor ? '#693ed6' : '#333'}`,
                  background: showTutor ? 'rgba(105,62,214,0.15)' : 'transparent',
                  color: showTutor ? '#a87df0' : '#666',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                AI Tutor
              </button>
            )}
            <button
              onClick={handleRun}
              disabled={loading}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: 'none',
                background: loading ? '#444' : '#693ed6',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14,
              }}
            >
              {loading ? 'Loading Python...' : '▶ Run'}
            </button>
            <button
              onClick={handleSubmit}
              style={{
                padding: '8px 20px',
                borderRadius: 8,
                border: '1px solid #4caf50',
                background: 'transparent',
                color: '#4caf50',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Submit
            </button>
          </div>
        </div>

        {/* Prompt + Editor row */}
        <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
          {/* Left: Prompt */}
          <div
            style={{
              width: 260,
              flexShrink: 0,
              background: '#1e1e1e',
              borderRadius: 12,
              padding: '20px',
              overflowY: 'auto',
            }}
          >
            <h3 style={{ margin: '0 0 12px' }}>{assignment.title}</h3>
            {assignment.prompt.map((line, i) =>
              line === '' ? (
                <br key={i} />
              ) : (
                <p key={i} style={{ margin: '4px 0', fontSize: 14, color: '#ccc' }}>
                  {line}
                </p>
              )
            )}
          </div>

          {/* Editor + Output */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>
              <Editor
                height="100%"
                defaultLanguage="python"
                theme="vs-dark"
                value={code}
                onChange={(v) => setCode(v ?? '')}
                onMount={handleEditorMount}
                options={{ fontSize: 14, minimap: { enabled: false } }}
              />
            </div>
            <div
              style={{
                height: 140,
                padding: '12px',
                background: '#111',
                color: '#ddd',
                borderRadius: 12,
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: 13,
                overflowY: 'auto',
                flexShrink: 0,
              }}
            >
              {output || 'Output will appear here after you run your code.'}
            </div>
          </div>
        </div>
      </div>

      {/* Tutor column */}
      <TutorChat
        currentCode={code}
        visible={showTutor && assignment.allowTutor}
        assignment={{ title: assignment.title, prompt: assignment.prompt }}
      />
    </div>
  );
}
