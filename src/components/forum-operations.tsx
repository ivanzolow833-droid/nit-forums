"use client";

import { useState } from "react";
import { AlertTriangle, Check, Clock3, ExternalLink, Gauge, Inbox, Link2, ShieldCheck, Sparkles, UserCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { runForumAction, type ForumAction, type ForumAiTriage, type ForumCaseFile, type ForumPayload } from "@/lib/forum-store";

const reportStatus: Record<string, string> = { open: "Новая", review: "На проверке", resolved: "Решена", rejected: "Отклонена" };
const caseStatus: Record<string, string> = { open: "Открыто", review: "Разбор", waiting: "Ожидание", resolved: "Решено", rejected: "Отклонено" };

export function ForumOperations({ payload, onChanged }: { payload: ForumPayload; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [evidenceCase, setEvidenceCase] = useState<ForumCaseFile | null>(null);
  const [triage, setTriage] = useState<Record<string, ForumAiTriage>>({});
  const [evidence, setEvidence] = useState({ url: "", evidenceType: "video", description: "", timecode: "" });
  const availability = payload.staffAvailability ?? { available: true, maxActiveCases: 5 };
  const activeCases = payload.caseFiles.filter((item) => !["resolved", "rejected"].includes(item.status));

  async function act(action: ForumAction) {
    setBusy(true); setError("");
    try { await runForumAction(action); await onChanged(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Действие не выполнено."); }
    finally { setBusy(false); }
  }

  async function runTriage(caseId: string) {
    setBusy(true); setError("");
    try { const result = await runForumAction({ action: "ai_triage_case", caseId }); if (result.triage) setTriage((current) => ({ ...current, [caseId]: result.triage! })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "AI-разбор не выполнен."); }
    finally { setBusy(false); }
  }

  function resolveReport(reportId: string, status: "resolved" | "rejected") {
    const resolution = window.prompt(status === "resolved" ? "Как решена жалоба?" : "Причина отклонения:");
    if (!resolution?.trim()) return;
    void act({ action: "moderate_report", reportId, status, resolution: resolution.trim() });
  }

  function updateCase(item: ForumCaseFile, status: "review" | "waiting" | "resolved" | "rejected") {
    const final = status === "resolved" || status === "rejected";
    const resolution = final ? window.prompt("Итоговое решение:") : "";
    if (final && !resolution?.trim()) return;
    void act({ action: "update_case", caseId: item.id, status, resolution: resolution?.trim() });
  }

  return <div className="space-y-4">
    {error ? <div className="form-error">{error}</div> : null}
    <section className="dark-panel operations-toolbar">
      <div><div className="hero-kicker"><span /> Очередь работ</div><h3>Жалобы и дела</h3><p>Приоритет автоматически растёт с возрастом обращения. Просроченные SLA всегда поднимаются выше.</p></div>
      <div className="operations-availability">
        <label><input type="checkbox" defaultChecked={availability.available} id="staff-available" /> Принимать новые дела</label>
        <label>Лимит активных дел <Input id="staff-case-limit" type="number" min={1} max={50} defaultValue={availability.maxActiveCases} /></label>
        <Button disabled={busy} variant="outline" onClick={() => { const available = (document.getElementById("staff-available") as HTMLInputElement).checked; const maxActiveCases = Number((document.getElementById("staff-case-limit") as HTMLInputElement).value); void act({ action: "save_staff_availability", available, maxActiveCases }); }}><ShieldCheck /> Сохранить нагрузку</Button>
        <Button disabled={busy} className="bg-amber-600 font-bold hover:bg-amber-500" onClick={() => void act({ action: "claim_next_work" })}><Inbox /> Взять следующее</Button>
      </div>
    </section>

    <div className="moderation-grid">
      <Metric icon={<AlertTriangle />} label="Открытые жалобы" value={payload.contentReports.filter((item) => item.status === "open").length} />
      <Metric icon={<Gauge />} label="Активные дела" value={activeCases.length} />
      <Metric icon={<Clock3 />} label="SLA просрочен" value={activeCases.filter((item) => item.overdue).length} />
      <Metric icon={<UserCheck />} label="Назначено вам" value={activeCases.filter((item) => item.assignedName === payload.currentUser?.username).length} />
    </div>

    <section className="dark-panel overflow-hidden">
      <div className="panel-title"><AlertTriangle /> Жалобы <span className="panel-count">{payload.contentReports.length}</span></div>
      {payload.contentReports.length ? <div className="operations-list">{payload.contentReports.map((report) => <article key={report.id} className="operations-row">
        <div className="operations-priority"><strong>{report.priority}</strong><span>приоритет</span></div>
        <div className="min-w-0"><div className="operations-row-title"><strong>{report.targetType} · {report.targetId}</strong><span data-status={report.status}>{reportStatus[report.status]}</span></div><p>{report.reason}</p><small>{report.reporterName} · {Math.max(0, Math.round(report.ageHours))} ч назад{report.assignedName ? ` · ${report.assignedName}` : ""}</small></div>
        <div className="operations-actions">{report.status === "open" ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void act({ action: "moderate_report", reportId: report.id, status: "review" })}>В работу</Button> : null}{!(["resolved", "rejected"].includes(report.status)) ? <><Button size="icon-sm" title="Решить" disabled={busy} onClick={() => resolveReport(report.id, "resolved")}><Check /></Button><Button size="icon-sm" variant="destructive" title="Отклонить" disabled={busy} onClick={() => resolveReport(report.id, "rejected")}><X /></Button></> : null}</div>
      </article>)}</div> : <div className="empty-state">Жалоб пока нет.</div>}
    </section>

    <section className="dark-panel overflow-hidden">
      <div className="panel-title"><Gauge /> Дела и SLA <span className="panel-count">{payload.caseFiles.length}</span></div>
      {payload.caseFiles.length ? <div className="operations-list">{payload.caseFiles.map((item) => <article key={item.id} className={item.overdue ? "operations-case overdue" : "operations-case"}>
        <div className="operations-case-head"><div><span className="operations-case-type">{item.type}</span><h4>{item.title}</h4></div><div className="operations-priority"><strong>{item.priority}</strong><span>приоритет</span></div></div>
        <div className="operations-case-meta"><span data-status={item.status}>{caseStatus[item.status]}</span><span>{item.assignedName ? `Ответственный: ${item.assignedName}` : "Не назначено"}</span><span className={item.overdue ? "overdue-text" : ""}>{item.overdue ? "SLA просрочен" : `SLA до ${formatDate(item.slaDueAt)}`}</span></div>
        {item.resolution ? <p className="operations-resolution">Итог: {item.resolution}</p> : null}
        {triage[item.id] ? <div className="ai-triage-result"><div><Sparkles /><strong>AI-разбор · уверенность {triage[item.id].confidence}%</strong><span>Рекомендованный приоритет: {triage[item.id].priority}</span></div><p>{triage[item.id].summary}</p><p><b>Следующий шаг:</b> {triage[item.id].suggestedNextStep}</p>{triage[item.id].missingEvidence.length ? <p><b>Не хватает:</b> {triage[item.id].missingEvidence.join("; ")}</p> : null}{triage[item.id].duplicateThreadIds.length ? <p><b>Возможные дубликаты:</b> {triage[item.id].duplicateThreadIds.join(", ")}</p> : null}<small>Это рекомендация: статус и решение AI не меняет.</small></div> : null}
        {item.evidence.length ? <div className="evidence-list">{item.evidence.map((entry) => <div key={entry.id}><a href={entry.url} target="_blank" rel="noreferrer"><ExternalLink /> {entry.type}{entry.timecode ? ` · ${entry.timecode}` : ""}</a><span>{entry.description || "Без описания"} · {entry.submittedBy}</span><div>{entry.status === "pending" ? <><Button size="sm" variant="outline" onClick={() => void act({ action: "verify_evidence", evidenceId: entry.id, status: "verified" })}>Подтвердить</Button><Button size="sm" variant="ghost" onClick={() => void act({ action: "verify_evidence", evidenceId: entry.id, status: "rejected" })}>Отклонить</Button></> : <b data-status={entry.status}>{entry.status === "verified" ? "Проверено" : "Отклонено"}</b>}</div></div>)}</div> : null}
        <div className="operations-actions wrap">{payload.aiReplyAssistantEnabled ? <Button size="sm" variant="outline" disabled={busy} onClick={() => void runTriage(item.id)}><Sparkles /> AI-разбор</Button> : null}<Button size="sm" variant="outline" onClick={() => setEvidenceCase(item)}><Link2 /> Доказательство</Button>{item.status === "open" ? <Button size="sm" onClick={() => updateCase(item, "review")}>Начать разбор</Button> : null}{item.status === "review" ? <Button size="sm" variant="outline" onClick={() => updateCase(item, "waiting")}>Ожидание</Button> : null}{!["resolved", "rejected"].includes(item.status) ? <><Button size="sm" onClick={() => updateCase(item, "resolved")}><Check /> Решить</Button><Button size="sm" variant="destructive" onClick={() => updateCase(item, "rejected")}><X /> Отклонить</Button></> : null}</div>
      </article>)}</div> : <div className="empty-state">Дел пока нет.</div>}
    </section>

    {evidenceCase ? <div className="editor-backdrop"><div className="dark-panel editor-modal"><div className="editor-head"><h3>Добавить доказательство</h3><button onClick={() => setEvidenceCase(null)}><X /></button></div><div className="editor-content"><p className="account-info">{evidenceCase.title}</p><label className="editor-label">HTTPS-ссылка<Input value={evidence.url} onChange={(event) => setEvidence({ ...evidence, url: event.target.value })} placeholder="https://..." /></label><label className="editor-label">Тип<select className="forum-select" value={evidence.evidenceType} onChange={(event) => setEvidence({ ...evidence, evidenceType: event.target.value })}><option value="video">Видео</option><option value="screenshot">Скриншот</option><option value="log">Лог</option><option value="document">Документ</option></select></label><label className="editor-label">Таймкод<Input value={evidence.timecode} onChange={(event) => setEvidence({ ...evidence, timecode: event.target.value })} placeholder="01:24" /></label><label className="editor-label">Описание<Textarea value={evidence.description} onChange={(event) => setEvidence({ ...evidence, description: event.target.value })} /></label><Button disabled={busy || !evidence.url.trim()} className="bg-red-600" onClick={() => void act({ action: "add_evidence", caseId: evidenceCase.id, ...evidence }).then(() => { setEvidenceCase(null); setEvidence({ url: "", evidenceType: "video", description: "", timecode: "" }); })}><Link2 /> Сохранить</Button></div></div></div> : null}
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) { return <div className="moderation-metric operations-metric"><span>{icon}</span><strong>{value}</strong><small>{label}</small></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
