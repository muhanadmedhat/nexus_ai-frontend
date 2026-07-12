import { API_ENDPOINTS, api, getApiErrorMessage } from "@/lib/api";
import type {
  AnswerInput,
  AssessmentEventType,
  CurrentAssessmentResult,
  SaveAnswersResult,
  StartAssessmentInput,
  StartAssessmentResult,
  SubmitAssessmentResult,
  SubmitReason,
  TrackEventResult,
  VerificationChecklist,
} from "@/types/assessment";

// Every assessment route wraps its payload in { status, data }.
interface ApiDataResponse<T> {
  status: string;
  data: T;
}

async function unwrap<T>(promise: Promise<{ data: ApiDataResponse<T> }>): Promise<T> {
  const { data } = await promise;
  return data.data;
}

export async function getVerification(): Promise<VerificationChecklist> {
  try {
    return await unwrap<VerificationChecklist>(
      api.get(API_ENDPOINTS.freelancerVerification.me),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load verification status"));
  }
}

export async function startAssessment(
  input: StartAssessmentInput = {},
): Promise<StartAssessmentResult> {
  try {
    return await unwrap<StartAssessmentResult>(
      api.post(API_ENDPOINTS.freelancerAssessments.start, input),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not start the assessment"));
  }
}

export async function getCurrentAssessment(): Promise<CurrentAssessmentResult> {
  try {
    return await unwrap<CurrentAssessmentResult>(
      api.get(API_ENDPOINTS.freelancerAssessments.current),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load the assessment"));
  }
}

export async function getAssessment(id: string): Promise<CurrentAssessmentResult> {
  try {
    return await unwrap<CurrentAssessmentResult>(
      api.get(API_ENDPOINTS.freelancerAssessments.detail(id)),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not load the assessment"));
  }
}

export async function saveAnswers(
  id: string,
  answers: AnswerInput[],
  autosave = true,
): Promise<SaveAnswersResult> {
  try {
    return await unwrap<SaveAnswersResult>(
      api.post(API_ENDPOINTS.freelancerAssessments.answers(id), {
        answers,
        autosave,
      }),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not save your answers"));
  }
}

export async function trackEvent(
  id: string,
  eventType: AssessmentEventType,
  metadata?: Record<string, unknown>,
): Promise<TrackEventResult> {
  try {
    return await unwrap<TrackEventResult>(
      api.post(API_ENDPOINTS.freelancerAssessments.events(id), {
        eventType,
        metadata,
      }),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not record the session event"));
  }
}

export async function submitAssessment(
  id: string,
  options: { finalAnswers?: AnswerInput[]; reason?: SubmitReason } = {},
): Promise<SubmitAssessmentResult> {
  try {
    return await unwrap<SubmitAssessmentResult>(
      api.post(API_ENDPOINTS.freelancerAssessments.submit(id), {
        finalAnswers: options.finalAnswers,
        reason: options.reason ?? "manual_submit",
      }),
    );
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Could not submit the assessment"));
  }
}

// Skills for the "skills tested" panel come from the freelancer profile.
// Returns [] on failure since skills are supplementary to the lobby.
export async function getMySkills(): Promise<string[]> {
  try {
    const { data } = await api.get<{ status: string; profile: { skills: string[] | null } }>(
      API_ENDPOINTS.freelancers.me,
    );
    return data.profile?.skills ?? [];
  } catch {
    return [];
  }
}
