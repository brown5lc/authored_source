import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import type { Monaco } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { loadPyodide } from 'pyodide';
import type { PyodideInterface } from 'pyodide';
import { API_BASE } from '../lib/api';
import TutorChat from '../components/TutorChat';

interface TestCase {
  description: string;
  input: string;
  expectedOutput: string;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

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

const DEFAULT_STARTER = '# Write your solution below\n\n';

export default function CreateAssignment() {
  const navigate = useNavigate();
  const { classId, assignmentId } = useParams<{ classId: string; assignmentId?: string }>();
  const isEditing = !!assignmentId;

  const [tab, setTab] = useState<'details' | 'preview'>('details');

  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [prompt, setPrompt] = useState('');
  const [starterCode, setStarterCode] = useState(DEFAULT_STARTER);
  const [dueDate, setDueDate] = useState('');
  const [points, setPoints] = useState(10);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [allowTutor, setAllowTutor] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const starterEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  // Preview state
  const [previewCode, setPreviewCode] = useState('');
  const [previewOutput, setPreviewOutput] = useState('');
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [pyLoading, setPyLoading] = useState(false);
  const [showTutor, setShowTutor] = useState(true);
  const previewEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const previewDecorationsRef = useRef<string[]>([]);
  const previewRegionRef = useRef<{ before: number; after: number } | null>(null);
  const isRevertingRef = useRef(false);

  function applyPreviewDecorations(editorInstance: editor.IStandaloneCodeEditor, monacoApi: Monaco) {
    const model  = editorInstance.getModel();
    const region = previewRegionRef.current;
    if (!model || !region) {
      previewDecorationsRef.current = editorInstance.deltaDecorations(previewDecorationsRef.current, []);
      return;
    }
    const total     = model.getLineCount();
    const startLine = region.before + 1;
    const endLine   = total - region.after;
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
    previewDecorationsRef.current = editorInstance.deltaDecorations(previewDecorationsRef.current, decors);
  }

  function handlePreviewMount(editorInstance: editor.IStandaloneCodeEditor, monacoApi: Monaco) {
    previewEditorRef.current = editorInstance;
    applyPreviewDecorations(editorInstance, monacoApi);

    editorInstance.onDidChangeModelContent((e) => {
      if (isRevertingRef.current) return;
      const model  = editorInstance.getModel();
      const region = previewRegionRef.current;
      if (!model || !region) return;

      const lineDelta = e.changes.reduce((sum, c) => {
        return sum + c.text.split('\n').length - (c.range.endLineNumber - c.range.startLineNumber + 1);
      }, 0);
      const oldTotal   = model.getLineCount() - lineDelta;
      const startLine  = region.before + 1;
      const oldEndLine = oldTotal - region.after;

      const touchedLocked = e.changes.some(
        (c) => c.range.startLineNumber < startLine || c.range.endLineNumber > oldEndLine
      );

      if (touchedLocked) {
        isRevertingRef.current = true;
        editorInstance.trigger('locked', 'undo', null);
        isRevertingRef.current = false;
        applyPreviewDecorations(editorInstance, monacoApi);
        return;
      }
      applyPreviewDecorations(editorInstance, monacoApi);
      setPreviewCode(editorInstance.getValue());
    });
  }

  // When switching to preview, sync editor content from starterCode
  useEffect(() => {
    if (tab !== 'preview') return;
    const clean = stripMarkers(starterCode);
    previewRegionRef.current = computeEditableRegion(starterCode);
    setPreviewCode(clean);
    setPreviewOutput('');
    previewEditorRef.current?.setValue(clean);

    // Lazy-load Pyodide on first preview open
    if (!pyodide && !pyLoading) {
      setPyLoading(true);
      loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.29.3/full/' })
        .then((py) => {
          py.setStdout({ batched: (t: string) => setPreviewOutput((p) => p + t + '\n') });
          py.setStderr({ batched: (t: string) => setPreviewOutput((p) => p + t + '\n') });
          setPyodide(py);
        })
        .catch((err) => setPreviewOutput(`Failed to load Python:\n${String(err)}`))
        .finally(() => setPyLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handlePreviewRun() {
    if (!pyodide) {
      setPreviewOutput('Python runtime is still loading...');
      return;
    }
    setPreviewOutput('');
    try {
      await pyodide.runPythonAsync(previewCode);
    } catch (err) {
      setPreviewOutput(String(err));
    }
  }

  function insertEditableMarkers() {
    const ed = starterEditorRef.current;
    if (!ed) return;
    const selection = ed.getSelection();
    if (!selection) return;
    const hasSelection = !selection.isEmpty();
    const selectedText = hasSelection ? ed.getModel()?.getValueInRange(selection) ?? '' : '    pass';
    ed.executeEdits('insert-markers', [{
      range: selection,
      text: `# [editable]\n${selectedText}\n# [/editable]`,
    }]);
    ed.focus();
  }

  // Pre-populate form when editing
  useEffect(() => {
    if (!isEditing) return;
    fetch(`${API_BASE}/api/assignments/${assignmentId}`)
      .then((r) => r.json())
      .then((data) => {
        setTitle(data.title ?? '');
        setSubtitle(data.subtitle ?? '');
        setPrompt(Array.isArray(data.prompt) ? data.prompt.join('\n') : '');
        setStarterCode(data.starterCode ?? DEFAULT_STARTER);
        setDueDate(data.dueDate ?? '');
        setPoints(data.points ?? 10);
        setTestCases(data.testCases ?? []);
        setAllowTutor(data.allowTutor ?? true);
      })
      .catch(() => {});
  }, [isEditing, assignmentId]);

  function addTestCase() {
    setTestCases((prev) => [...prev, { description: '', input: '', expectedOutput: '' }]);
  }

  function removeTestCase(i: number) {
    setTestCases((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateTestCase(i: number, field: keyof TestCase, value: string) {
    setTestCases((prev) => prev.map((tc, idx) => idx === i ? { ...tc, [field]: value } : tc));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !prompt.trim()) {
      setError('Title and prompt are required.');
      return;
    }

    const invalidCase = testCases.findIndex((tc) => !tc.expectedOutput.trim());
    if (invalidCase !== -1) {
      setError(`Test case ${invalidCase + 1} is missing expected output.`);
      return;
    }

    setSaving(true);
    setError('');

    const url = isEditing
      ? `${API_BASE}/api/assignments/${assignmentId}`
      : `${API_BASE}/api/assignments`;

    const body: Record<string, unknown> = {
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      prompt: prompt.split('\n'),
      starterCode,
      dueDate: dueDate || undefined,
      points,
      testCases,
      allowTutor,
    };
    if (!isEditing) {
      body.id = slugify(title);
      body.classId = classId ?? 'cs101';
    }

    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => null);

    setSaving(false);

    if (!res || !res.ok) {
      const body = res ? await res.json().catch(() => ({})) : {};
      setError(body.error ?? 'Failed to create assignment. Try a different title.');
      return;
    }

    navigate(`/class/${classId ?? 'cs101'}`);
  }

  const promptLines = prompt.split('\n');

  return (
    <div style={{ maxWidth: tab === 'preview' ? '100%' : 760 }}>
      <button
        onClick={() => navigate(`/class/${classId ?? 'cs101'}`)}
        style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', marginBottom: 16, fontSize: 14 }}
      >
        ← Back to class
      </button>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: '0 0 4px' }}>{isEditing ? 'Edit Assignment' : 'New Assignment'}</h2>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>CS 101: Intro to Programming</p>
        </div>
        {/* Tab switcher */}
        <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 8, padding: 3, border: '1px solid #2a2a2a' }}>
          {(['details', 'preview'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                background: tab === t ? '#693ed6' : 'transparent',
                color: tab === t ? 'white' : '#666',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: tab === t ? 600 : 400,
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'details' && (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Title + Subtitle */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Title *" style={{ flex: 2 }}>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder='e.g. "Hello, Output!"'
                style={inputStyle}
              />
            </Field>
            <Field label="Topic / Subtitle" style={{ flex: 1 }}>
              <input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder='e.g. "Print Statements"'
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Due date + Points */}
          <div style={{ display: 'flex', gap: 16 }}>
            <Field label="Due Date" style={{ flex: 1 }}>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={inputStyle}
              />
            </Field>
            <Field label="Points" style={{ flex: 1 }}>
              <input
                type="number"
                min={1}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                style={inputStyle}
              />
            </Field>
          </div>

          {/* Prompt */}
          <Field label="Assignment Prompt *">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={'Describe what students need to do.\nEach line will appear as a separate paragraph.'}
              rows={5}
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
            />
          </Field>

          {/* Starter Code */}
          <Field label="Starter Code">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 12, color: '#555' }}>
                Wrap lines with <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}># [editable]</code> / <code style={{ background: '#1a1a1a', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}># [/editable]</code> to lock everything else.
              </p>
              <button
                type="button"
                onClick={insertEditableMarkers}
                style={{
                  padding: '4px 12px', borderRadius: 6, fontSize: 12,
                  border: '1px solid #693ed6', background: 'transparent',
                  color: '#a87df0', cursor: 'pointer', flexShrink: 0,
                }}
              >
                + Mark editable region
              </button>
            </div>
            <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #2a2a2a' }}>
              <Editor
                height="220px"
                defaultLanguage="python"
                theme="vs-dark"
                value={starterCode}
                onChange={(v) => setStarterCode(v ?? '')}
                onMount={(ed) => { starterEditorRef.current = ed; }}
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  lineNumbers: 'on',
                }}
              />
            </div>
          </Field>

          {/* Test Cases */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <p style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 500 }}>Test Cases</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>
                  {testCases.length === 0
                    ? 'No test cases — this assignment will not be auto-graded.'
                    : `${testCases.length} test case${testCases.length !== 1 ? 's' : ''} · auto-grading enabled`}
                </p>
              </div>
              <button
                type="button"
                onClick={addTestCase}
                style={{
                  padding: '6px 14px',
                  borderRadius: 7,
                  border: '1px solid #333',
                  background: 'transparent',
                  color: '#aaa',
                  cursor: 'pointer',
                  fontSize: 13,
                }}
              >
                + Add Test Case
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {testCases.map((tc, i) => (
                <div
                  key={i}
                  style={{
                    background: '#1a1a1a',
                    border: '1px solid #2a2a2a',
                    borderRadius: 10,
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 12, color: '#555', fontWeight: 600 }}>TEST CASE {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeTestCase(i)}
                      style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 0 }}
                    >
                      ×
                    </button>
                  </div>

                  <input
                    value={tc.description}
                    onChange={(e) => updateTestCase(i, 'description', e.target.value)}
                    placeholder='Description (optional) — e.g. "Prints Hello World"'
                    style={{ ...inputStyle, fontSize: 13 }}
                  />

                  <div style={{ display: 'flex', gap: 10 }}>
                    <Field label="Stdin Input (optional)" style={{ flex: 1 }}>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(i, 'input', e.target.value)}
                        placeholder="Leave empty if the program reads no input"
                        rows={3}
                        style={{ ...inputStyle, fontSize: 13, resize: 'vertical', fontFamily: 'monospace' }}
                      />
                    </Field>
                    <Field label="Expected Output *" style={{ flex: 1 }}>
                      <textarea
                        value={tc.expectedOutput}
                        onChange={(e) => updateTestCase(i, 'expectedOutput', e.target.value)}
                        placeholder="Exact expected stdout"
                        rows={3}
                        style={{ ...inputStyle, fontSize: 13, resize: 'vertical', fontFamily: 'monospace' }}
                      />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Tutor permission */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#1a1a1a',
              border: '1px solid #2a2a2a',
              borderRadius: 10,
              padding: '14px 16px',
            }}
          >
            <div>
              <p style={{ margin: 0, fontSize: 13, color: '#888', fontWeight: 500 }}>AI Tutor</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#555' }}>
                {allowTutor ? 'Students can use the AI Tutor on this assignment.' : 'AI Tutor is disabled for this assignment.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAllowTutor((v) => !v)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                background: allowTutor ? '#693ed6' : '#333',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                transition: 'background 0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 3,
                  left: allowTutor ? 23 : 3,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: 'white',
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>

          {error && (
            <p style={{ margin: 0, color: '#f44336', fontSize: 13 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => navigate(`/class/${classId ?? 'cs101'}`)}
              style={{
                padding: '10px 20px',
                borderRadius: 8,
                border: '1px solid #333',
                background: 'transparent',
                color: '#888',
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 24px',
                borderRadius: 8,
                border: 'none',
                background: saving ? '#444' : '#693ed6',
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      )}

      {tab === 'preview' && (
        <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 160px)' }}>
          {/* IDE column */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>

            {/* Preview header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexShrink: 0 }}>
              <div>
                <h2 style={{ margin: 0 }}>{title || 'Untitled Assignment'}</h2>
                <p style={{ margin: '2px 0 0', color: '#888', fontSize: 13 }}>
                  {(classId ?? 'cs101').toUpperCase()}{subtitle ? ` · ${subtitle}` : ''} · {points} pts · preview as student
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setShowTutor((v) => !v)}
                  disabled={!allowTutor}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: `1px solid ${!allowTutor ? '#2a2a2a' : showTutor ? '#693ed6' : '#333'}`,
                    background: !allowTutor ? 'transparent' : showTutor ? 'rgba(105,62,214,0.15)' : 'transparent',
                    color: !allowTutor ? '#3a3a3a' : showTutor ? '#a87df0' : '#666',
                    cursor: allowTutor ? 'pointer' : 'not-allowed',
                    fontSize: 13,
                  }}
                  title={allowTutor ? undefined : 'AI Tutor is disabled for this assignment'}
                >
                  AI Tutor{!allowTutor ? ' (disabled)' : ''}
                </button>
                <button
                  onClick={handlePreviewRun}
                  disabled={pyLoading || !pyodide}
                  style={{
                    padding: '8px 20px',
                    borderRadius: 8,
                    border: 'none',
                    background: pyLoading || !pyodide ? '#444' : '#693ed6',
                    color: 'white',
                    cursor: pyLoading || !pyodide ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                  }}
                >
                  {pyLoading ? 'Loading Python...' : '▶ Run'}
                </button>
              </div>
            </div>

            {/* Prompt + Editor row */}
            <div style={{ display: 'flex', gap: 16, flex: 1, minHeight: 0 }}>
              {/* Prompt panel */}
              <div style={{ width: 260, flexShrink: 0, background: '#1e1e1e', borderRadius: 12, padding: '20px', overflowY: 'auto' }}>
                <h3 style={{ margin: '0 0 12px' }}>{title || 'Untitled'}</h3>
                {promptLines.map((line, i) =>
                  line === '' ? (
                    <br key={i} />
                  ) : (
                    <p key={i} style={{ margin: '4px 0', fontSize: 14, color: '#ccc' }}>
                      {line}
                    </p>
                  )
                )}
                {promptLines.every((l) => !l.trim()) && (
                  <p style={{ fontSize: 13, color: '#444', fontStyle: 'italic' }}>
                    Prompt will appear here once you fill in the Details tab.
                  </p>
                )}
              </div>

              {/* Editor + Output */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
                <div style={{ flex: 1, minHeight: 0, borderRadius: 12, overflow: 'hidden' }}>
                  <Editor
                    height="100%"
                    defaultLanguage="python"
                    theme="vs-dark"
                    value={previewCode}
                    onChange={(v) => setPreviewCode(v ?? '')}
                    onMount={handlePreviewMount}
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
                  {previewOutput || 'Output will appear here after you run your code.'}
                </div>
              </div>
            </div>
          </div>

          {/* Tutor column */}
          <TutorChat
            currentCode={previewCode}
            visible={showTutor}
            assignment={{ title: title || 'Untitled Assignment', prompt: promptLines }}
          />
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      <label style={{ fontSize: 13, color: '#888', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: '#1e1e1e',
  border: '1px solid #2a2a2a',
  borderRadius: 8,
  padding: '10px 12px',
  color: '#e0e0e0',
  fontSize: 14,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
};
