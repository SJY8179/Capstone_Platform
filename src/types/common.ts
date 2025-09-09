<<<<<<< HEAD
﻿﻿export interface Page<T> {
=======
﻿export interface Page<T> {
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
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
<<<<<<< HEAD
}
=======
}


>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
