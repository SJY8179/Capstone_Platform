type Doc = { id: number; title: string; url: string; type: string };

export default function FilesTab({ docs }: { docs: Doc[] }) {
  return (
    <div className="space-y-2">
      {docs.length === 0 && <p className="text-sm text-muted-foreground">등록된 파일/링크가 없습니다.</p>}
      {docs.map((d) => (
        <div key={d.id} className="text-sm">
          <a className="underline underline-offset-4" href={d.url} target="_blank" rel="noreferrer">{d.title}</a>
          <span className="ml-2 text-xs text-muted-foreground">[{d.type}]</span>
        </div>
      ))}
    </div>
  );
}
