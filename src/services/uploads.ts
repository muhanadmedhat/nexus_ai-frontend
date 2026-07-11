import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface UploadResponse {
  url: string;
  filePath: string;
}

export async function uploadProfileImage(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await api.post<UploadResponse>(
      API_ENDPOINTS.users.profileImage,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to upload profile image"));
  }
}

export async function uploadCv(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const { data } = await api.post<UploadResponse>(
      API_ENDPOINTS.users.freelancerCv,
      formData,
      {
        headers: { "Content-Type": "multipart/form-data" },
      }
    );
    return data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Failed to upload CV"));
  }
}