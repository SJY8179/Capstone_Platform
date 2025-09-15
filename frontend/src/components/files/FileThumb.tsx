import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { FileIcon } from "./FileIcon";
import { getExtFromString, getExtFromUrl, getCategoryByExt } from "@/lib/fileType";

/**
 * 이미지로 렌더 가능한 경우에만 <img>를 시도.
 * 그 외(문서/압축/PDF 등)는 항상 아이콘을 렌더한다.
 * size: 정사각 px (기본 48)
 */
export function FileThumb({
  url,
  filename,
  alt,
  size = 64,
  className,
  style,
  rounded = true,
}: {
  url: string;
  filename?: string | null;
  alt?: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
  rounded?: boolean;
}) {
  const [error, setError] = useState(false);

  // 확장자 → 카테고리 판별 (filename 우선, 없으면 URL에서 추출)
  const ext = useMemo(
    () => getExtFromString(filename) || getExtFromUrl(url),
    [filename, url]
  );
  const category = useMemo(() => getCategoryByExt(ext), [ext]);

  // 이미지인 경우에만 <img> 시도 (에러 나면 폴백 아이콘)
  const shouldTryImg = !error && category === "image";

  if (!shouldTryImg) {
    return (
      <div
        className={cn(
          "flex items-center justify-center shrink-0", // overflow는 내부(FileIcon)에서 관리
          rounded && "rounded-md",
          className
        )}
        style={{ width: size, height: size, ...style }}
      >
        <FileIcon
          url={url}
          filename={filename ?? undefined}
          ext={ext}
          size={size}              // 사이즈 원본 전달 → 내부에서 안전 패딩/아이콘 크기 계산
          title={filename ?? undefined}
          className={rounded ? "rounded-md" : undefined}
        />
      </div>
    );
  }

  // 이미지 썸네일
  return (
    <img
      src={url}
      alt={alt ?? filename ?? ""}
      loading="lazy"
      referrerPolicy="no-referrer"
      draggable={false}
      className={cn("object-cover", rounded && "rounded-md", className)}
      style={{ width: size, height: size, ...style }}
      onError={() => setError(true)}
    />
  );
}
