import { useEffect, useState } from "react";
import Editor from "@monaco-editor/react";
import { loadPyodide } from "pyodide";
import type { PyodideInterface } from "pyodide";

function FreeCode() {
  const [code, setCode] = useState("print('hello world')");
  const [output, setOutput] = useState("");
  const [pyodide, setPyodide] = useState<PyodideInterface | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const py = await loadPyodide({
          indexURL: "https://cdn.jsdelivr.net/pyodide/v0.29.3/full/",
        });

        py.setStdout({
          batched: (text: string) => {
            setOutput((prev) => prev + text + "\n");
          },
        });

        py.setStderr({
          batched: (text: string) => {
            setOutput((prev) => prev + text + "\n");
          },
        });

        setPyodide(py);
      } catch (err) {
        setOutput(`Failed to load Pyodide:\n${String(err)}`);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleRun = async () => {
    if (!pyodide) {
      setOutput("Python runtime is still loading...");
      return;
    }

    setOutput("");

    try {
      await pyodide.runPythonAsync(code);
    } catch (err) {
      setOutput(String(err));
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <h1>FreeCode</h1>

      <button onClick={handleRun} disabled={loading}>
        {loading ? "Loading Python..." : "Run"}
      </button>

      <Editor
        height="60vh"
        defaultLanguage="python"
        theme="vs-dark"
        value={code}
        onChange={(value) => setCode(value || "")}
      />

      <div
        style={{
          marginTop: "16px",
          padding: "12px",
          background: "#111",
          color: "#ddd",
          minHeight: "120px",
          whiteSpace: "pre-wrap",
          borderRadius: "8px",
          textAlign: "left",
          fontFamily: "monospace",
        }}
      >
        {output || "No output yet."}
      </div>
    </div>
  );
}

export default FreeCode;
