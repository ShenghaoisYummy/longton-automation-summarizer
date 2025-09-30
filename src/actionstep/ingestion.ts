import { randomUUID } from 'node:crypto';
import { config } from '../shared/config.js';
import { InvoiceContext, TimeEntry } from '../shared/types.js';

type Primitive = string | number | null | undefined;

interface ActionstepLinks {
  primaryClient?: Primitive | Primitive[];
  theirParticipant?: Primitive | Primitive[];
  primaryParticipants?: Primitive | Primitive[];
  owner?: Primitive;
  createdBy?: Primitive;
  action?: Primitive | Primitive[];
}

interface ActionstepAction {
  id: Primitive;
  number?: Primitive;
  actionNumber?: Primitive;
  name?: string;
  actionName?: string;
  currency?: string;
  links?: ActionstepLinks;
}

interface ActionstepParticipant {
  id: Primitive;
  displayName?: string;
  email?: string | null;
}

interface ActionResponse {
  action?: ActionstepAction;
  actions?: ActionstepAction | ActionstepAction[];
  linked?: {
    participants?: ActionstepParticipant[];
  };
}

interface ParticipantResponse {
  participant?: ActionstepParticipant;
  participants?: ActionstepParticipant | ActionstepParticipant[];
}

interface TimeEntryLinks extends ActionstepLinks {
  rate?: Primitive;
}

interface ActionstepTimeEntry {
  id: Primitive;
  description?: string;
  timestampDate?: string;
  createdTimestamp?: string;
  actualHours?: Primitive;
  billableHours?: Primitive;
  billableAmount?: Primitive;
  billReference?: Primitive;
  isBillable?: Primitive;
  links?: TimeEntryLinks;
}

interface TimeEntriesResponse {
  timeentries: ActionstepTimeEntry[];
  linked?: {
    participants?: ActionstepParticipant[];
  };
  meta?: {
    paging?: {
      timeentries?: {
        nextPage?: Primitive;
        page?: Primitive;
      };
    };
  };
}

interface ActionstepBill {
  id: Primitive;
  status?: string;
  currency?: string;
  totalInclusive?: Primitive;
  totalPaid?: Primitive;
  totalDue?: Primitive;
}

interface BillsResponse {
  bills?: ActionstepBill[];
}

interface ActionstepConfig {
  baseUrl: string;
  accessToken: string;
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function toStringValue(value: Primitive): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return String(value);
}

function parseNumber(value: Primitive, fallback = 0): number {
  const raw = typeof value === 'string' ? value.trim() : value;
  if (raw === null || raw === undefined) {
    return fallback;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function parseBoolean(value: Primitive): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  if (value === null || value === undefined) {
    return false;
  }

  const normalized = String(value).toLowerCase();
  return normalized === 't' || normalized === 'true' || normalized === '1' || normalized === 'y';
}

function extractFirstLink(value: Primitive | Primitive[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value.length > 0 ? toStringValue(value[0]) : undefined;
  }

  return toStringValue(value);
}

async function actionstepRequest<T>(client: ActionstepConfig, path: string, query?: Record<string, string | undefined>): Promise<T> {
  const base = ensureTrailingSlash(client.baseUrl);
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  const url = new URL(normalizedPath, base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, value);
      }
    }
  }

  const requestId = randomUUID();
  // eslint-disable-next-line no-console
  console.log(`[Actionstep] ${requestId} → ${url.toString()}`);

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${client.accessToken}`,
        Accept: 'application/vnd.api+json',
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`[Actionstep] ${requestId} network error`, error);
    throw error;
  }

  if (!response.ok) {
    let body = '';
    try {
      body = await response.text();
    } catch (readError) {
      body = '[unreadable body]';
    }

    // eslint-disable-next-line no-console
    console.error(
      `[Actionstep] ${requestId} ${response.status} ${response.statusText} body: ${body.slice(0, 500)}`
    );

    const error = new Error(`Actionstep request failed: ${response.status} ${response.statusText}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }

  // eslint-disable-next-line no-console
  console.log(`[Actionstep] ${requestId} ✓ ${response.status} ${response.statusText}`);

  return (await response.json()) as T;
}

function resolveParticipant(response: ParticipantResponse): ActionstepParticipant | undefined {
  if (response.participant) {
    return response.participant;
  }

  const participants = response.participants;
  if (Array.isArray(participants)) {
    return participants[0];
  }

  if (participants && typeof participants === 'object') {
    return participants as ActionstepParticipant;
  }

  return undefined;
}

async function fetchParticipantsByIds(client: ActionstepConfig, ids: string[]): Promise<Map<string, ActionstepParticipant>> {
  const map = new Map<string, ActionstepParticipant>();
  if (ids.length === 0) {
    return map;
  }

  await Promise.all(
    ids.map(async (id) => {
      try {
        const response = await actionstepRequest<ParticipantResponse>(client, `/api/rest/participants/${id}`);
        const participant = resolveParticipant(response);
        if (participant) {
          map.set(id, participant);
        } else {
          // eslint-disable-next-line no-console
          console.warn(`[Actionstep] participant ${id} not found in response`);
        }
      } catch (error) {
        const status = (error as { status?: number }).status;
        if (status === 404) {
          // eslint-disable-next-line no-console
          console.warn(`[Actionstep] participant ${id} returned 404`);
          return;
        }

        throw error;
      }
    })
  );

  return map;
}

async function fetchAction(client: ActionstepConfig, actionId: string): Promise<{ action: ActionstepAction; participants: Map<string, ActionstepParticipant> }> {
  const data = await actionstepRequest<ActionResponse>(client, `/api/rest/actions/${actionId}`);
  const actionsField = data.actions;
  const action =
    data.action ??
    (Array.isArray(actionsField) ? actionsField[0] : actionsField ?? undefined);

  if (!action) {
    const error = new Error(`Action ${actionId} not found`);
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const participantMap = new Map<string, ActionstepParticipant>();
  data.linked?.participants?.forEach((participant) => {
    const id = toStringValue(participant.id);
    if (id) {
      participantMap.set(id, participant);
    }
  });

  const participantIds = new Set<string>();
  const addId = (value: Primitive | Primitive[] | undefined) => {
    if (Array.isArray(value)) {
      value.forEach((item) => {
        const id = toStringValue(item);
        if (id) {
          participantIds.add(id);
        }
      });
      return;
    }

    const id = toStringValue(value);
    if (id) {
      participantIds.add(id);
    }
  };

  addId(action.links?.primaryClient);
  addId(action.links?.theirParticipant);
  addId(action.links?.primaryParticipants);

  const missingIds = [...participantIds].filter((id) => !participantMap.has(id));
  if (missingIds.length > 0) {
    const fetched = await fetchParticipantsByIds(client, missingIds);
    fetched.forEach((participant, id) => participantMap.set(id, participant));
  }

  return { action, participants: participantMap };
}

async function fetchAllTimeEntries(client: ActionstepConfig, actionId: string): Promise<{ entries: ActionstepTimeEntry[]; participants: Map<string, ActionstepParticipant> }> {
  const entries: ActionstepTimeEntry[] = [];
  const participantMap = new Map<string, ActionstepParticipant>();

  let page = 1;
  // The API uses numeric paging. Continue until nextPage is null/undefined.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await actionstepRequest<TimeEntriesResponse>(client, '/api/rest/timeentries', {
      action_eq: actionId,
      page: page > 1 ? String(page) : undefined,
      pageSize: '200',
    });

    entries.push(...response.timeentries);
    response.linked?.participants?.forEach((participant) => {
      const id = toStringValue(participant.id);
      if (id && !participantMap.has(id)) {
        participantMap.set(id, participant);
      }
    });

    const pagination = response.meta?.paging?.timeentries;
    const nextPageRaw = pagination?.nextPage;
    if (nextPageRaw === null || nextPageRaw === undefined) {
      break;
    }

    const nextPage = Number(nextPageRaw);
    if (!Number.isFinite(nextPage) || nextPage <= page) {
      break;
    }

    page = nextPage;
  }

  return { entries, participants: participantMap };
}

async function fetchBills(client: ActionstepConfig, actionId: string): Promise<ActionstepBill[]> {
  const data = await actionstepRequest<BillsResponse>(client, '/api/rest/bills', {
    'action[id_eq]': actionId,
    pageSize: '200',
  });

  return (data.bills ?? []).filter((bill) => bill.status?.toLowerCase() !== 'draft');
}

function buildTimeEntries(rawEntries: ActionstepTimeEntry[], participants: Map<string, ActionstepParticipant>): TimeEntry[] {
  return rawEntries.map((entry) => {
    const ownerId = toStringValue(entry.links?.owner);
    const owner = ownerId ?? 'unknown';
    const ownerParticipant = ownerId ? participants.get(ownerId) : undefined;

    return {
      id: toStringValue(entry.id) ?? randomUUID(),
      description: entry.description ?? 'No description provided',
      timestamp: entry.timestampDate ?? entry.createdTimestamp ?? new Date().toISOString(),
      actualHours: parseNumber(entry.actualHours),
      billableHours: parseNumber(entry.billableHours),
      billableAmount: parseNumber(entry.billableAmount),
      isBillable: parseBoolean(entry.isBillable),
      owner,
      ownerName: ownerParticipant?.displayName ?? owner,
      billReference: entry.billReference ? String(entry.billReference) : null,
    };
  });
}

function buildTotals(bills: ActionstepBill[], timeEntries: TimeEntry[]): { billed: number; payments: number; outstanding: number } {
  if (bills.length === 0) {
    const billed = timeEntries.reduce((acc, entry) => acc + (entry.isBillable ? entry.billableAmount : 0), 0);
    return {
      billed,
      payments: 0,
      outstanding: billed,
    };
  }

  const billed = bills.reduce((acc, bill) => acc + parseNumber(bill.totalInclusive), 0);
  const payments = bills.reduce((acc, bill) => acc + parseNumber(bill.totalPaid), 0);
  const outstanding = bills.reduce((acc, bill) => acc + parseNumber(bill.totalDue), 0);

  return { billed, payments, outstanding };
}

export async function fetchInvoiceContext(actionId: string): Promise<InvoiceContext> {
  const { actionstep } = config.load();
  const client: ActionstepConfig = {
    baseUrl: actionstep.baseUrl,
    accessToken: actionstep.accessToken,
  };

  const [{ action, participants: actionParticipants }, { entries: rawEntries, participants: entryParticipants }, bills] =
    await Promise.all([
      fetchAction(client, actionId),
      fetchAllTimeEntries(client, actionId),
      fetchBills(client, actionId),
    ]);

  const participantMap = new Map<string, ActionstepParticipant>([...actionParticipants, ...entryParticipants]);

  const primaryClientId = extractFirstLink(
    action.links?.primaryClient ?? action.links?.theirParticipant ?? action.links?.primaryParticipants
  );
  const clientParticipant = primaryClientId ? participantMap.get(primaryClientId) : undefined;

  const timeEntries = buildTimeEntries(rawEntries, participantMap);
  const totals = buildTotals(bills, timeEntries);
  const writeOffs = Math.max(0, totals.billed - totals.payments - totals.outstanding);

  const currency = bills[0]?.currency ?? action.currency ?? 'AUD';
  const matterNumber = toStringValue(action.number ?? action.actionNumber ?? action.id) ?? actionId;
  const matterName = action.name ?? action.actionName ?? `Matter ${matterNumber}`;
  const clientName = clientParticipant?.displayName ?? action.name ?? matterName;
  const clientEmail = clientParticipant?.email ?? undefined;

  return {
    actionId,
    matterNumber,
    matterName,
    clientName,
    clientEmail,
    currency,
    totals,
    timeEntries,
    writeOffs,
  };
}

export async function bootstrapActionstepIngestion() {
  // TODO: wire Actionstep webhook handlers and delta polling here.
  // Keep this lightweight; orchestration will live in pipeline module.
  return Promise.resolve();
}
