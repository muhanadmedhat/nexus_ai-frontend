import { api } from "@/lib/api";
import type { Brief, BriefMessage } from "@/types/project";

// ---------------------------------------------------------------------------
// Requirements agent mock chat. The brief routes do not exist yet:
//   GET  /api/projects/:id/brief
//   GET  /api/projects/:id/brief/messages
//   POST /api/projects/:id/brief/messages
// Until then this drives a deterministic local mock agent so the UI works.
// ---------------------------------------------------------------------------

const BRIEF_FIELDS = [
  "Goal",
  "Target users",
  "Core features",
  "Tech preferences",
  "Timeline",
  "Budget",
];

interface BriefState {
  brief: Brief;
  messages: BriefMessage[];
  askedIndex: number;
}

const briefsByProject = new Map<string, BriefState>();
let seq = 0;

function ensureState(projectId: string): BriefState {
  let state = briefsByProject.get(projectId);
  if (!state) {
    const briefId = `brief-${projectId}`;
    state = {
      brief: {
        id: briefId,
        projectId,
        isComplete: false,
        summary: null,
        completionPercent: 0,
        missingFields: [...BRIEF_FIELDS],
      },
      messages: [
        {
          id: `msg-${++seq}`,
          briefId,
          senderType: "agent",
          message:
            "Hi! I'm your requirements agent. Let's define your project. First — what is the main goal you want to achieve?",
          createdAt: new Date().toISOString(),
        },
      ],
      askedIndex: 0,
    };
    briefsByProject.set(projectId, state);
  }
  return state;
}

// Contract: GET /api/projects/:id/brief
export async function getBrief(projectId: string): Promise<Brief> {
  try {
    const { data } = await api.get<Brief>(`/projects/${projectId}/brief`);
    return data;
  } catch {
    return { ...ensureState(projectId).brief };
  }
}

// Contract: GET /api/projects/:id/brief/messages
export async function getBriefMessages(projectId: string): Promise<BriefMessage[]> {
  try {
    const { data } = await api.get<BriefMessage[]>(
      `/projects/${projectId}/brief/messages`,
    );
    return data;
  } catch {
    return [...ensureState(projectId).messages];
  }
}

// Contract: POST /api/projects/:id/brief/messages
// Returns the full updated conversation + brief so the UI can render in one pass.
export async function sendBriefMessage(
  projectId: string,
  message: string,
): Promise<{ messages: BriefMessage[]; brief: Brief }> {
  try {
    const { data } = await api.post<{ messages: BriefMessage[]; brief: Brief }>(
      `/projects/${projectId}/brief/messages`,
      { message },
    );
    return data;
  } catch {
    const state = ensureState(projectId);
    const briefId = state.brief.id;

    state.messages.push({
      id: `msg-${++seq}`,
      briefId,
      senderType: "customer",
      message,
      createdAt: new Date().toISOString(),
    });

    // Mock agent: acknowledge the answered field, then ask the next one.
    const answered = Math.min(state.askedIndex + 1, BRIEF_FIELDS.length);
    state.askedIndex = answered;
    state.brief.completionPercent = Math.round(
      (answered / BRIEF_FIELDS.length) * 100,
    );
    state.brief.missingFields = BRIEF_FIELDS.slice(answered);
    state.brief.summary = `Captured ${answered} of ${BRIEF_FIELDS.length} requirement areas.`;

    const nextField = BRIEF_FIELDS[answered];
    const reply = nextField
      ? `Got it. Next: tell me about the "${nextField.toLowerCase()}".`
      : "Thanks — I have everything I need. Your brief is complete and ready for review.";

    if (!nextField) state.brief.isComplete = true;

    state.messages.push({
      id: `msg-${++seq}`,
      briefId,
      senderType: "agent",
      message: reply,
      createdAt: new Date().toISOString(),
    });

    return { messages: [...state.messages], brief: { ...state.brief } };
  }
}
