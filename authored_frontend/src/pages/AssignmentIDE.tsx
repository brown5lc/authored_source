import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { loadPyodide } from 'pyodide';
import type { PyodideInterface } from 'pyodide';
import { useTracking } from '../context/TrackingContext';
import type { TrackingEvent } from '../context/TrackingContext';
import { useUser } from '../context/UserContext';
import TutorChat from '../components/TutorChat';

const ASSIGNMENT_ID = 'hello-output';

const STARTER_CODE = `# Hello, Output!
# Complete each print statement below

print()  # Print "Hello, World!"
print()  # Print your name
print()  # Print the sum of 7 + 3
`;

const PROMPT = {
  title: 'Hello, Output!',
  body: [
    'Write a Python program that prints three lines:',
    '',
    '1. "Hello, World!"',
    '2. Your name',
    '3. The result of 7 + 3',
  ],
  expectedOutput: 'Hello, World!\nJane Doe\n10',
};

function storageKey(userId: string) {
  return `authored_session_${userId}_${ASSIGNMENT_ID}`;
}

export default function AssignmentIDE() {
  const navigate = useNavigate();
  const { addEvent, clearEvents, initEvents, getEvents } = useTracking();
  const { currentUser } = useUser();

  const [code, setCode] = useState(STARTER_CODE);
  const [output, setOutput] = useState('');
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTutor, setShowTutor] = useState(true);

  const isPasteRef = useRef(false);
  const lastEditRef = useRef(0);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Persists current tracking events to localStorage
  const persistSession = useCallback(() => {
    localStorage.setItem(storageKey(currentUser.id), JSON.stringify(getEvents()));
  }, [currentUser.id, getEvents]);

  // Wrapper: record event + immediately persist
  const trackEvent = useCallback(
    (event: TrackingEvent) => {
      addEvent(event);
      localStorage.setItem(storageKey(currentUser.id), JSON.stringify([...getEvents()]));
    },
    [addEvent, getEvents, currentUser.id]
  );

  // Keep a ref to trackEvent so Monaco's closure always uses the latest version
  const trackEventRef = useRef(trackEvent);
  useEffect(() => { trackEventRef.current = trackEvent; }, [trackEvent]);

  // Load saved session when user changes (or on first mount)
  useEffect(() => {
    isPasteRef.current = false;
    lastEditRef.current = 0;

    const raw = localStorage.getItem(storageKey(currentUser.id));
    if (raw) {
      try {
        const saved = JSON.parse(raw) as TrackingEvent[];
        initEvents(saved);
        const lastSnapshot = [...saved].reverse().find((e) => e.codeSnapshot);
        if (lastSnapshot?.codeSnapshot) {
          setCode(lastSnapshot.codeSnapshot);
          editorRef.current?.setValue(lastSnapshot.codeSnapshot);
        }
      } catch {
        clearEvents();
      }
    } else {
      clearEvents();
      setCode(STARTER_CODE);
      editorRef.current?.setValue(STARTER_CODE);
    }
  }, [currentUser.id, initEvents, clearEvents]);

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

    const handlePaste = (e: ClipboardEvent) => {
      isPasteRef.current = true;
      const pastedText = e.clipboardData?.getData('text') ?? '';
      setTimeout(() => {
        trackEventRef.current({
          type: 'paste',
          timestamp: Date.now(),
          detail: pastedText,
          codeSnapshot: editorRef.current?.getValue(),
        });
      }, 0);
    };

    const handleCopy = () => {
      trackEventRef.current({ type: 'copy', timestamp: Date.now() });
    };

    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('copy', handleCopy);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('copy', handleCopy);
    };
  }, []);

  function handleEditorMount(editorInstance: editor.IStandaloneCodeEditor) {
    editorRef.current = editorInstance;

    editorInstance.onDidChangeModelContent(() => {
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

  function handleSubmit() {
    trackEvent({ type: 'submit', timestamp: Date.now(), codeSnapshot: code });
    persistSession();
    navigate('/class/cs101');
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 112px)' }}>

      {/* IDE column — self-contained, never affected by tutor visibility */}
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
            <h2 style={{ margin: 0 }}>Hello, Output!</h2>
            <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>
              CS 101 · Print Statements · 10 pts · working as{' '}
              <span style={{ color: currentUser.color }}>{currentUser.name}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
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
            <h3 style={{ margin: '0 0 12px' }}>{PROMPT.title}</h3>
            {PROMPT.body.map((line, i) =>
              line === '' ? (
                <br key={i} />
              ) : (
                <p key={i} style={{ margin: '4px 0', fontSize: 14, color: '#ccc' }}>
                  {line}
                </p>
              )
            )}
            <div style={{ marginTop: 20 }}>
              <p style={{ fontSize: 12, color: '#888', margin: '0 0 6px' }}>Expected output:</p>
              <pre
                style={{
                  background: '#111',
                  padding: '10px',
                  borderRadius: 6,
                  fontSize: 12,
                  color: '#aaffaa',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {PROMPT.expectedOutput}
              </pre>
            </div>
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

      {/* Tutor column — sibling to IDE, never inside it */}
      <TutorChat currentCode={code} visible={showTutor} />
    </div>
  );
}
