import axios from "axios";

// Standard mobile API client pointing to FastAPI local dev or production URL
export const API_BASE_URL = "http://localhost:8000/api/v1";

export const mobileApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

let authToken: string | null = null;

export const setMobileAuthToken = (token: string | null) => {
  authToken = token;
  if (token) {
    mobileApi.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete mobileApi.defaults.headers.common["Authorization"];
  }
};
