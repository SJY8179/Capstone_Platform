import MarkdownEditor from "@/components/Markdown/MarkdownEditor";

type Props = {
  value: string;
  status?: "PUBLISHED" | "PENDING";
  updatedAt?: string | null;
  canPublish?: boolean;
  onChange?: (md: string) => void;
  onSubmit?: (md: string) => void;
  onSave?: (md: string) => void;
  onApprove?: () => void;
  onReject?: () => void;
};

export default function OverviewTab({
  value, status = "PUBLISHED", updatedAt, canPublish,
  onChange, onSubmit, onSave, onApprove, onReject
}: Props) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        상태: <b>{status}</b>{updatedAt ? ` · 업데이트: ${new Date(updatedAt).toLocaleString("ko-KR")}` : ""}
      </div>
      <MarkdownEditor value={value} onChange={(v) => onChange?.(v)} onSave={onSave} />
      <div className="flex gap-2 justify-end">
        {canPublish ? (
          <>
            <button className="btn" onClick={() => onSave?.(value)}>게시 저장</button>
            {status === "PENDING" && (
              <>
                <button className="btn" onClick={onApprove}>제안 승인</button>
                <button className="btn" onClick={onReject}>제안 반려</button>
              </>
            )}
          </>
        ) : (
          <button className="btn" onClick={() => onSubmit?.(value)}>검토 요청</button>
        )}
      </div>
    </div>
  );
}
