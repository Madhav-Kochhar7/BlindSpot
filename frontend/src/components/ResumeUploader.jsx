import { useCallback, useRef, useState } from "react";
import { FileText, UploadCloud, X } from "lucide-react";

const ACCEPTED_EXTENSIONS = [".pdf", ".docx"];

function isAccepted(file) {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function ResumeUploader({ files, onFilesChange }) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const addFiles = useCallback(
    (incoming) => {
      if (!incoming) return;
      const accepted = Array.from(incoming).filter(isAccepted);
      const existingKeys = new Set(files.map((f) => `${f.name}-${f.size}`));
      const deduped = accepted.filter(
        (f) => !existingKeys.has(`${f.name}-${f.size}`),
      );
      onFilesChange([...files, ...deduped]);
    },
    [files, onFilesChange],
  );

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const removeFile = (index) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="text-sm font-semibold text-slate-700">Resumes</span>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition ${
          isDragging
            ? "border-brand-500 bg-brand-50"
            : "border-slate-300 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50"
        }`}
      >
        <UploadCloud className="h-8 w-8 text-brand-500" />
        <p className="text-sm font-medium text-slate-700">
          Drag & drop resumes here, or click to browse
        </p>
        <p className="text-xs text-slate-400">Accepts .pdf and .docx files</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {files.length > 0 && (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between rounded-md border border-slate-200 bg-transparent px-3 py-2 text-sm shadow-sm"
            >
              <span className="flex items-center gap-2 truncate text-slate-700">
                <FileText className="h-4 w-4 shrink-0 text-brand-500" />
                <span className="truncate">{file.name}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                className="shrink-0 rounded p-1 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                aria-label={`Remove ${file.name}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
