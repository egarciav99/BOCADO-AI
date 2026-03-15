/**
 * Debug Console Component
 * Muestra los logs guardados de debugging
 * Accesible solo en desarrollo o con query param especial
 */

import React, { useState } from "react";
import { getDebugLogs, clearDebugLogs, exportDebugLogs } from "../utils/debugLogger";

interface DebugLog {
  timestamp: number;
  type: "info" | "warn" | "error" | "state";
  message: string;
  data?: any;
}

export const DebugConsole: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);

  const handleOpen = () => {
    setLogs(getDebugLogs());
    setIsOpen(true);
  };

  const handleClear = () => {
    clearDebugLogs();
    setLogs([]);
  };

  const handleExport = () => {
    const data = exportDebugLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "debug-logs.json";
    a.click();
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="fixed bottom-4 right-4 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 z-50"
        title="Debug Console (Development Only)"
      >
        🔧 Debug
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
      <div className="bg-slate-900 text-white w-full max-h-96 flex flex-col rounded-t-lg shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-800 px-4 py-3 border-b border-slate-700">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <span>🔧 Debug Console</span>
            <span className="text-xs bg-slate-700 px-2 py-1 rounded">
              {logs.length} logs
            </span>
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded transition-colors"
            >
              📥 Export
            </button>
            <button
              onClick={handleClear}
              className="text-xs bg-red-600 hover:bg-red-700 px-3 py-1 rounded transition-colors"
            >
              🗑️ Clear
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="text-xl hover:text-slate-300 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="overflow-y-auto flex-1 font-mono text-xs p-3 space-y-1">
          {logs.length === 0 ? (
            <div className="text-slate-500 text-center py-8">No logs yet</div>
          ) : (
            logs.map((log, idx) => {
              const date = new Date(log.timestamp).toLocaleTimeString();
              const typeStyles = {
                info: "text-blue-400",
                warn: "text-yellow-400",
                error: "text-red-400",
                state: "text-green-400 font-bold",
              };

              return (
                <div key={idx} className="text-slate-300">
                  <span className="text-slate-500">[{date}]</span>
                  <span className={`ml-2 ${typeStyles[log.type]}`}>
                    {log.type.toUpperCase()}
                  </span>
                  <span className="ml-2">{log.message}</span>
                  {log.data && (
                    <div className="ml-4 text-slate-400 text-xs bg-slate-800 p-1 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Instructions */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-2 text-xs text-slate-400">
          💡 Usa este panel para debuggear. Export para compartir logs.
        </div>
      </div>
    </div>
  );
};
