type Decision = {
  id: number; title: string; decidedAt?: string | null; decidedBy?: { id: number; name: string } | null;
};

export default function DecisionsTab({ decisions }: { decisions: Decision[] }) {
  return (
    <div className="space-y-2">
      {decisions.length === 0 && <p className="text-sm text-muted-foreground">등록된 의견이 없습니다.</p>}
      {decisions.map((d) => (
        <div key={d.id} className="text-sm flex items-center justify-between">
          <div className="truncate">{d.title}</div>
          <div className="text-xs text-muted-foreground">
            {d.decidedAt ? new Date(d.decidedAt).toLocaleString("ko-KR") : "-"} {d.decidedBy ? `· ${d.decidedBy.name}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}
