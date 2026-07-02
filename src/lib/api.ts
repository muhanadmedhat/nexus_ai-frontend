import axios from "axios";
import { supabase } from "./supabase";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Attach the Supabase access token to every backend request.
api.interceptors.request.use(async (config) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }

  return config;
});
