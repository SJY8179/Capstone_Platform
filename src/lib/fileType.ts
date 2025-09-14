// === /lib/fileType.ts ===

const IMG_EXTS = ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif", "tif", "tiff", "heic"];
const VIDEO_EXTS = ["mp4", "webm", "mkv", "mov", "avi"];
const AUDIO_EXTS = ["mp3", "wav", "flac", "aac", "ogg", "m4a"];
const ARCHIVE_EXTS = ["zip", "tar", "gz", "tgz", "rar", "7z"];
const PDF_EXTS = ["pdf"];
const DOC_EXTS = ["doc", "docx", "txt", "md", "rtf", "pages"];
const SHEET_EXTS = ["xls", "xlsx", "csv", "tsv", "ods"];
const PPT_EXTS = ["ppt", "pptx", "odp", "key"];
const CODE_EXTS = [
  "js","ts","tsx","jsx","java","py","rb","go","rs",
  "c","cpp","cs","php","html","css","json","xml",
  "yml","yaml","sh","kt","sql","toml"
];

export type FileCategory =
  | "image" | "video" | "audio" | "archive" | "pdf"
  | "doc" | "sheet" | "ppt" | "code" | "other";

/** MIME → 대표 확장자 매핑 (쿼리스트링에 contentType/response-content-type 등으로 들어오는 경우 대응) */
const MIME_TO_EXT: Record<string, string> = {
  // images
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "image/tiff": "tiff",
  "image/heic": "heic",
  // video
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  // audio
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "audio/flac": "flac",
  "audio/aac": "aac",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  // archives
  "application/zip": "zip",
  "application/gzip": "gz",
  "application/x-7z-compressed": "7z",
  "application/x-rar-compressed": "rar",
  "application/x-tar": "tar",
  // pdf
  "application/pdf": "pdf",
  // docs
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "text/plain": "txt",
  "text/markdown": "md",
  "application/rtf": "rtf",
  // sheets
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/csv": "csv",
  "text/tab-separated-values": "tsv",
  // slides
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
};

/** 문자열에서 파일 이름(마지막 세그먼트) 기준으로 확장자 추출 */
function getExtFromBasename(s: string): string {
  const base = s.split(/[?#]/)[0].split("/").pop() ?? s;
  const dot = base.lastIndexOf(".");
  return dot > -1 ? base.slice(dot + 1).toLowerCase() : "";
}

/** 안전 디코딩(중첩 인코딩 대비 2~3회까지 시도) */
function safeDecode(s: string): string {
  let out = s;
  for (let i = 0; i < 3; i++) {
    try {
      const decoded = decodeURIComponent(out);
      if (decoded === out) break;
      out = decoded;
    } catch {
      break;
    }
  }
  return out;
}

/** 임의 문자열(파일명/경로)에서 확장자 추출 */
export function getExtFromString(s?: string | null): string {
  if (!s) return "";
  return getExtFromBasename(s);
}

/**
 * URL에서 확장자 추출
 * 1) 경로에서 시도
 * 2) 쿼리스트링 value들 디코드 후 시도 (key, filename, path 등도 포함)
 * 3) content-disposition/filename*=, filename= 패턴에서 추출
 * 4) MIME 타입 value에서 확장자 역매핑
 */
export function getExtFromUrl(url?: string | null): string {
  if (!url) return "";

  // 1) Path 우선
  const fromPath = getExtFromBasename(url);
  if (fromPath) return fromPath;

  // 2) Query 파라미터 탐색
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return "";

  const afterQ = url.slice(qIndex + 1);
  try {
    const params = new URLSearchParams(afterQ);
    for (const [k, raw] of params.entries()) {
      if (!raw) continue;

      const decoded = safeDecode(raw);

      // (2-a) 값 자체에서 일반 확장자 추출
      const extFromValue = getExtFromBasename(decoded);
      if (extFromValue) return extFromValue;

      // (2-b) key가 filename/file/name/key/path/object/download 류면 추가 시도
      const keyLower = k.toLowerCase();
      if (/(^|_)(filename|file|name|key|path|object|download)(_|$)/.test(keyLower)) {
        const extFromKeyed = getExtFromBasename(decoded);
        if (extFromKeyed) return extFromKeyed;
      }

      // (2-c) content-disposition 스타일에서 filename= / filename*= 추출
      // 예: attachment; filename="document.pdf"  또는  filename*=UTF-8''%E1%84%...
      const cdMatch = decoded.match(/filename\*?=(?:utf-8''|")?([^";]+)[";]?/i);
      if (cdMatch?.[1]) {
        const nameDecoded = safeDecode(cdMatch[1]);
        const extFromCD = getExtFromBasename(nameDecoded);
        if (extFromCD) return extFromCD;
      }

      // (2-d) MIME 문자열이 들어있는 경우 (application/pdf 등)
      const mimeMatch = decoded.match(/[a-z]+\/[a-z0-9+.\-]+/i);
      const mime = mimeMatch?.[0]?.toLowerCase();
      if (mime && MIME_TO_EXT[mime]) {
        return MIME_TO_EXT[mime];
      }
    }
  } catch {
    // ignore
  }

  return "";
}

/** 확장자로 카테고리 판별 */
export function getCategoryByExt(ext: string): FileCategory {
  const e = (ext || "").toLowerCase();

  if (IMG_EXTS.includes(e)) return "image";
  if (VIDEO_EXTS.includes(e)) return "video";
  if (AUDIO_EXTS.includes(e)) return "audio";
  if (ARCHIVE_EXTS.includes(e)) return "archive";
  if (PDF_EXTS.includes(e)) return "pdf";
  if (SHEET_EXTS.includes(e)) return "sheet";
  if (PPT_EXTS.includes(e)) return "ppt";
  if (DOC_EXTS.includes(e)) return "doc";
  if (CODE_EXTS.includes(e)) return "code";
  return "other";
}

/** URL이 이미지 미리보기에 적합한지(확장자 기준) */
export function isImageUrl(url?: string | null): boolean {
  const ext = getExtFromUrl(url || "");
  return IMG_EXTS.includes(ext);
}
