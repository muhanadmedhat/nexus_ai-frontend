import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";

export interface UpdateMeInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

function buildUpdatePayload(input: UpdateMeInput): UpdateMeInput {
  const payload: UpdateMeInput = {};
  const firstName = input.firstName?.trim();
  const lastName = input.lastName?.trim();

  if (firstName) payload.firstName = firstName;
  if (lastName) payload.lastName = lastName;
  if (input.phoneNumber) payload.phoneNumber = input.phoneNumber;

  return payload;
}

export async function updateMe(input: UpdateMeInput): Promise<void> {
  try {
    await api.patch(API_ENDPOINTS.users.me, buildUpdatePayload(input));
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not update profile"));
  }
}
