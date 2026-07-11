import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

interface ProfileImageResponse {
  status: string;
  photoUrl: string;
}

interface CvUploadResponse {
  status: string;
  cvUrl: string;
}

function buildUploadPayload(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}

export async function uploadProfileImage(file: File): Promise<{ url: string }> {
  try {
    const { data } = await api.post<ProfileImageResponse>(
      API_ENDPOINTS.uploads.profileImage,
      buildUploadPayload(file),
    );
    return { url: data.photoUrl };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Profile image upload failed"));
  }
}

export async function uploadCv(file: File): Promise<{ url: string }> {
  try {
    const { data } = await api.post<CvUploadResponse>(
      API_ENDPOINTS.uploads.freelancerCv,
      buildUploadPayload(file),
    );
    return { url: data.cvUrl };
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "CV upload failed"));
  }
}
