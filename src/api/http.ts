<<<<<<< HEAD
﻿﻿import axios from "axios";
=======
﻿import axios from "axios";
>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938

export const http = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

http.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status;
    const data = err?.response?.data;
    return Promise.reject({
      status,
      message: data?.message ?? err.message,
      data,
    });
  }
<<<<<<< HEAD
);
=======
);


>>>>>>> eb9bb80ff9e1797f98fc85fa60bc6981315e4938
