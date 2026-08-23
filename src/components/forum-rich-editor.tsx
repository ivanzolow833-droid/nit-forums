"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Bold, Eye, Image as ImageIcon, Italic, Link, List, MessageSquareQuote, Redo2, RotateCcw, Smile, Undo2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export function ForumRichEditor({ value, onChange, placeholder, rows = 7, maxLength = 10_000, toolbar = true }: { value: string; onChange: (value: string) => void; placeholder: string; rows?: number; maxLength?: number; toolbar?: boolean }) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const history = useRef<string[]>([value]);
  const historyIndex = useRef(0);
  const [historyStatus, setHistoryStatus] = useState({ canUndo: false, canRedo: false });
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    if (history.current[historyIndex.current] === value) return;
    const timer = window.setTimeout(() => {
      history.current = [...history.current.slice(0, historyIndex.current + 1), value].slice(-80);
      historyIndex.current = history.current.length - 1;
      setHistoryStatus({ canUndo: historyIndex.current > 0, canRedo: false });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [value]);

  function setText(next: string) {
    if (next === value || next.length > maxLength) return;
    history.current = [...history.current.slice(0, historyIndex.current + 1), next].slice(-80);
    historyIndex.current = history.current.length - 1;
    setHistoryStatus({ canUndo: historyIndex.current > 0, canRedo: false });
    onChange(next);
  }

  function undo() {
    if (historyIndex.current <= 0) return;
    historyIndex.current -= 1;
    onChange(history.current[historyIndex.current]);
    setHistoryStatus({ canUndo: historyIndex.current > 0, canRedo: true });
  }

  function redo() {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current += 1;
    onChange(history.current[historyIndex.current]);
    setHistoryStatus({ canUndo: historyIndex.current > 0, canRedo: historyIndex.current < history.current.length - 1 });
  }

  function wrap(before: string, after = before, fallback = "текст") {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || fallback;
    setText(`${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`);
    window.setTimeout(() => { textarea?.focus(); textarea?.setSelectionRange(start + before.length, start + before.length + selected.length); }, 0);
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || "текст";
    setText(`${value.slice(0, start)}${selected.split("\n").map((line) => `${prefix}${line}`).join("\n")}${value.slice(end)}`);
  }

  return <div className="rich-editor">
    {toolbar ? <div className="rich-editor-toolbar">
      <button type="button" disabled={!historyStatus.canUndo} onClick={undo} title="Отменить (Ctrl+Z)"><Undo2 /><span>Отменить</span></button>
      <button type="button" disabled={!historyStatus.canRedo} onClick={redo} title="Повторить (Ctrl+Y)"><Redo2 /><span>Повторить</span></button>
      <i />
      <button type="button" onClick={() => wrap("**")} title="Жирный"><Bold /></button>
      <button type="button" onClick={() => wrap("*")} title="Курсив"><Italic /></button>
      <button type="button" onClick={() => prefixLines("> ")} title="Цитата"><MessageSquareQuote /></button>
      <button type="button" onClick={() => prefixLines("- ")} title="Список"><List /></button>
      <button type="button" onClick={() => wrap("[", "](https://)", "ссылка")} title="Ссылка"><Link /></button>
      <button type="button" onClick={() => wrap("![", "](https://)", "изображение")} title="Изображение по ссылке"><ImageIcon /></button>
      <button type="button" onClick={() => wrap("", "", "🙂")} title="Emoji"><Smile /></button>
      <i />
      <button type="button" className={preview ? "active" : ""} onClick={() => setPreview(!preview)} title="Предпросмотр"><Eye /><span>Предпросмотр</span></button>
      <button type="button" onClick={() => { if (!value || window.confirm("Очистить весь текст редактора?")) setText(""); }} title="Очистить"><RotateCcw /></button>
    </div> : null}
    {preview ? <div className="rich-editor-preview"><ForumFormattedText text={value || "Предпросмотр появится после ввода текста."} /></div> : <Textarea ref={textareaRef} value={value} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") { event.preventDefault(); if (event.shiftKey) redo(); else undo(); } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") { event.preventDefault(); redo(); } }} placeholder={placeholder} rows={rows} maxLength={maxLength} />}
    <div className="rich-editor-footer"><span>Ctrl+Z — отменить · Ctrl+Y — повторить</span><span>{value.length.toLocaleString("ru-RU")} / {maxLength.toLocaleString("ru-RU")}</span></div>
  </div>;
}

function inlineParts(text: string) {
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|!\[[^\]]*\]\(https:\/\/[^)]+\)|\[[^\]]+\]\(https:\/\/[^)]+\))/g;
  return text.split(pattern).filter(Boolean).map<ReactNode>((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*")) return <em key={index}>{part.slice(1, -1)}</em>;
    const image = part.match(/^!\[([^\]]*)\]\((https:\/\/[^)]+)\)$/);
    if (image) return <a key={index} href={image[2]} target="_blank" rel="noreferrer" className="formatted-image-link">🖼 {image[1] || "Изображение"}</a>;
    const link = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>;
    return part;
  });
}

export function ForumFormattedText({ text }: { text: string }) {
  return <div className="formatted-text">{text.split("\n").map((line, index) => line.startsWith("> ") ? <blockquote key={index}>{inlineParts(line.slice(2))}</blockquote> : line.startsWith("- ") ? <div key={index} className="formatted-list-item"><span>•</span><p>{inlineParts(line.slice(2))}</p></div> : line ? <p key={index}>{inlineParts(line)}</p> : <br key={index} />)}</div>;
}
