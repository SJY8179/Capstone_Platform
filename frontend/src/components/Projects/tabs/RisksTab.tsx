type Risk = {
  id: number; title: string; impact: number; likelihood: number;
  mitigation?: string | null; owner?: string | null; dueDate?: string | null; status: string;
};

export default function RisksTab({ risks }: { risks: Risk[] }) {
  const score = (i: number, l: number) => i * l;
  return (
    <div className="space-y-2">
      {risks.length === 0 && <p className="text-sm text-muted-foreground">등록된 리스크가 없습니다.</p>}
      {risks.map((r) => (
        <div key={r.id} className="text-sm flex items-center justify-between">
          <div className="truncate">{r.title}</div>
          <div className="text-xs text-muted-foreground">
            영향 {r.impact} · 가능성 {r.likelihood} · 점수 {score(r.impact, r.likelihood)}
          </div>
        </div>
      ))}
    </div>
  );
}
