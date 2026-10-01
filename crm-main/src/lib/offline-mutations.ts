import type {SupabaseClient} from "@supabase/supabase-js";
import type {Database} from "@/lib/supabase/database";

export type PendingMutation =
  | {key: string; table: "leads"; organizationId: string; id: string; changes: {status: Database["public"]["Tables"]["leads"]["Row"]["status"]}}
  | {key: string; table: "tasks"; organizationId: string; id: string; changes: {completed_at: string | null}};

const storageKey = "masar:pending-mutations:v1";

export function readPendingMutations(organizationId?: string): PendingMutation[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(storageKey) ?? "[]") as PendingMutation[];
    return organizationId ? value.filter((item) => item.organizationId === organizationId) : value;
  } catch {
    return [];
  }
}

export function queuePendingMutation(mutation: PendingMutation) {
  const existing = readPendingMutations().filter((item) => item.key !== mutation.key);
  try {
    window.localStorage.setItem(storageKey, JSON.stringify([...existing, mutation]));
    window.dispatchEvent(new Event("masar:pending-mutation"));
    return true;
  } catch {
    return false;
  }
}

export function removePendingMutation(key: string) {
  try {
    const remaining = readPendingMutations().filter((item) => item.key !== key);
    window.localStorage.setItem(storageKey, JSON.stringify(remaining));
    window.dispatchEvent(new Event("masar:pending-mutation"));
  } catch {
    return;
  }
}

export async function flushPendingMutations(client: SupabaseClient<Database>, organizationId: string) {
  const queue = readPendingMutations(organizationId);
  const failedKeys = new Set<string>();
  const attemptedKeys = new Set(queue.map((item) => item.key));
  for (const item of queue) {
    const result = item.table === "leads"
      ? await client.from("leads").update(item.changes).eq("id", item.id).eq("organization_id", item.organizationId)
      : await client.from("tasks").update(item.changes).eq("id", item.id).eq("organization_id", item.organizationId);
    if (result.error) failedKeys.add(item.key);
  }

  try {
    const remaining = readPendingMutations().filter((item) => !attemptedKeys.has(item.key) || failedKeys.has(item.key));
    window.localStorage.setItem(storageKey, JSON.stringify(remaining));
    return {remaining: remaining.length, failed: failedKeys.size};
  } catch {
    return {remaining: queue.length, failed: queue.length};
  }
}
