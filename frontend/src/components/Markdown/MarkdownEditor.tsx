import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSave?: (v: string) => Promise<void> | void;
  autoSaveDelayMs?: number;   // 기본 1500ms
};

export default function MarkdownEditor({ value, onChange, onSave, autoSaveDelayMs = 1500 }: Props) {
  const [local, setLocal] = useState(value);
  const timer = useRef<number | null>(null);
  const dirty = useMemo(() => local !== value, [local, value]);

  useEffect(() => { setLocal(value); }, [value]);

  useEffect(() => {
    if (!onSave) return;
    if (!dirty) return;
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      await onSave(local);
    }, autoSaveDelayMs) as unknown as number;
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [local]); // eslint-disable-line

  return (
    <div className="space-y-2">
      <textarea
        className="w-full min-h-[200px] border rounded-md bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        value={local}
        onChange={(e) => { setLocal(e.target.value); onChange(e.target.value); }}
        placeholder="Markdown을 입력하세요…"
      />
      {onSave && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onSave(local)}>저장</Button>
        </div>
      )}
    </div>
  );
}
