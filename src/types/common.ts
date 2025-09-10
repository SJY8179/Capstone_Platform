export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number; // 0-based page index
}

export interface ApiError {
  status?: number;
  message?: string;
  data?: unknown;
}
