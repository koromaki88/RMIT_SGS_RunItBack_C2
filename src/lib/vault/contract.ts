// Frozen MVP contract (docs/implementation/04-contract.md section 2). Types only.
// Changing a name or shape here requires the coordination process in 00-coordination.md.

export type ArchiveObject = {
  objectId: string;
  version: number;
  name: string;
  size: number;
  sha256: string;
  state: "AVAILABLE" | "PURGED";
};

export type PurgeManifest = {
  schema: "vault-purge-v1";
  requestId: string;
  operation: "PURGE_VERSIONS";
  vaultId: "harbourline-demo";
  objects: Array<{ objectId: string; version: number; sha256: string }>;
  requester: { issuer: string; subject: string };
  executorSubject: string;
  executorAudience: string;
  createdAt: string;
  expiresAt: string;
  reason: string;
};

export type GovernanceLink = { changeRequestId: string; actionType: string };

export type PurgeRequest = {
  requestId: string;
  manifest: PurgeManifest;
  manifestHash: string;
  entitlement: string;
  state: "FILED" | "EXECUTED" | "EXPIRED";
  governanceLinks: GovernanceLink[];
  executedAt: string | null;
};

export type GovernanceObservation = {
  changeRequestId: string;
  status: "PENDING" | "APPROVED" | "DENIED" | "CANCELLED" | "UNKNOWN";
  authorizationCount: number | null;
  threshold: number | null;
};

export type ApiError = { error: { code: string; message: string } };
