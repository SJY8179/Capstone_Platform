import { cn } from "@/lib/utils";
import {
  File as FileGeneric,
  FileImage,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import type { FileCategory } from "@/lib/fileType";
import { getCategoryByExt, getExtFromUrl, getExtFromString } from "@/lib/fileType";

type Props = {
  /** 확장자 직접 지정 (없으면 url/filename에서 추출) */
  ext?: string | null;
  url?: string | null;
  filename?: string | null;
  /** 아이콘 정사각 크기(px) - 외곽 박스 크기 */
  size?: number;
  className?: string;
  title?: string;
};

/** 카테고리별 팔레트 (가독성 중심) */
const COLOR: Record<FileCategory, { icon: string; bg: string; ring: string; badge: string; badgeText?: string }> = {
  pdf:     { icon: "text-red-600",     bg: "bg-red-50",     ring: "ring-red-200",     badge: "bg-red-600",     badgeText: "text-white" },
  doc:     { icon: "text-blue-600",    bg: "bg-blue-50",    ring: "ring-blue-200",    badge: "bg-blue-600",    badgeText: "text-white" },
  sheet:   { icon: "text-green-700",   bg: "bg-green-50",   ring: "ring-green-200",   badge: "bg-green-700",   badgeText: "text-white" },
  ppt:     { icon: "text-orange-600",  bg: "bg-orange-50",  ring: "ring-orange-200",  badge: "bg-orange-600",  badgeText: "text-white" },
  image:   { icon: "text-slate-700",   bg: "bg-slate-50",   ring: "ring-slate-200",   badge: "bg-slate-700",   badgeText: "text-white" },
  video:   { icon: "text-teal-700",    bg: "bg-teal-50",    ring: "ring-teal-200",    badge: "bg-teal-700",    badgeText: "text-white" },
  audio:   { icon: "text-purple-700",  bg: "bg-purple-50",  ring: "ring-purple-200",  badge: "bg-purple-700",  badgeText: "text-white" },
  archive: { icon: "text-amber-700",   bg: "bg-amber-50",   ring: "ring-amber-200",   badge: "bg-amber-700",   badgeText: "text-white" },
  code:    { icon: "text-indigo-700",  bg: "bg-indigo-50",  ring: "ring-indigo-200",  badge: "bg-indigo-700",  badgeText: "text-white" },
  other:   { icon: "text-muted-foreground", bg: "bg-muted/30", ring: "ring-border",   badge: "bg-foreground",  badgeText: "text-background" },
};

export function FileIcon({ ext, url, filename, size = 24, className, title }: Props) {
  // filename 우선 → URL → prop ext (모두 소문자)
  const finalExt =
    (ext && ext.toLowerCase()) ||
    getExtFromString(filename) ||
    getExtFromUrl(url);

  const cat: FileCategory = getCategoryByExt(finalExt);
  const pal = COLOR[cat];

  // 아이콘 본체: Lucide의 file-* 계열로 통일 (가독성 ↑)
  let Icon = FileGeneric;
  switch (cat) {
    case "image":  Icon = FileImage; break;
    case "video":  Icon = FileVideo; break;
    case "audio":  Icon = FileAudio; break;
    case "archive":Icon = FileArchive; break;
    case "code":   Icon = FileCode; break;
    case "sheet":  Icon = FileSpreadsheet; break;
    case "ppt":    Icon = Presentation; break;
    case "pdf":
    case "doc":    Icon = FileText; break;
    default:       Icon = FileGeneric;
  }

  const label = (finalExt || "").toUpperCase().slice(0, 5);

  // ===== 크기/패딩 계산 (스트로크 안전 여백 확보) =====
  const box = Math.max(16, Math.round(size));              // 외곽 박스
  const pad = Math.max(2, Math.ceil(box * 0.06));          // 안전 패딩 (스트로크가 모서리에 닿지 않게)
  const inner = Math.max(12, box - pad * 2);               // 패딩 제외 내부 콘텐츠 영역
  const iconSize = Math.round(inner * 0.82);               // 아이콘 본체는 내부의 82% 사용
  const showBadge = !!label && box >= 28;                  // 작은 썸네일에서는 배지 숨김

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-md ring-1 overflow-visible", // ← 잘림 방지
        pal.bg, pal.ring,
        className
      )}
      style={{ width: box, height: box, padding: pad, boxSizing: "border-box" }}
      title={title || finalExt || undefined}
      role="img"
      aria-label={finalExt || cat}
      data-cat={cat}
    >
      <Icon
        className={cn("block", pal.icon)} // ← inline SVG의 베이스라인 이슈 제거
        aria-hidden
        style={{ width: iconSize, height: iconSize }}
        preserveAspectRatio="xMidYMid meet"
        strokeWidth={2}
        focusable={false}
      />

      {showBadge && (
        <span
          className={cn(
            "absolute rounded font-medium",
            pal.badge, pal.badgeText
          )}
          style={{
            bottom: Math.max(1, Math.floor(pad * 0.6)),
            right:  Math.max(1, Math.floor(pad * 0.6)),
            fontSize: Math.max(9, Math.round(box * 0.30)),
            lineHeight: 1,
            padding: "0 4px",
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
