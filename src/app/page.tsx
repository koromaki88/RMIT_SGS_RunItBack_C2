/**
 * Agent 3. Single product route with the two views the brief requires (Archive,
 * Purge Requests). Holds shared data state and refresh callbacks so both views
 * re-read real backend state after any mutation. No routing detours, no dashboard.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchObjects, fetchRequests, type UiError } from "@/components/client-api";
import type { ArchiveObject, PurgeRequest } from "@/components/merge-seam";
import { ArchiveSection } from "@/components/archive-section";
import { RequestsSection } from "@/components/requests-section";
import { useAuthStatus } from "@/components/use-auth-status";

export default function Page() {
  const { authenticated } = useAuthStatus();
  const [objects, setObjects] = useState<ArchiveObject[]>([]);
  const [requests, setRequests] = useState<PurgeRequest[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [objectsError, setObjectsError] = useState<UiError | null>(null);
  const [requestsError, setRequestsError] = useState<UiError | null>(null);

  const loadArchive = useCallback(async () => {
    setObjectsLoading(true);
    const result = await fetchObjects();
    if (result.ok) {
      setObjects(result.objects);
      setObjectsError(null);
    } else {
      setObjectsError(result.error);
    }
    setObjectsLoading(false);
  }, []);

  const loadRequests = useCallback(async () => {
    setRequestsLoading(true);
    const result = await fetchRequests();
    if (result.ok) {
      setRequests(result.requests);
      setRequestsError(null);
    } else {
      setRequestsError(result.error);
    }
    setRequestsLoading(false);
  }, []);

  const reloadAll = useCallback(() => {
    void loadArchive();
    void loadRequests();
  }, [loadArchive, loadRequests]);

  useEffect(() => {
    if (!authenticated) {
      setObjects([]);
      setRequests([]);
      return;
    }
    void loadArchive();
    void loadRequests();
  }, [authenticated, loadArchive, loadRequests]);

  const availableOptions = objects
    .filter((object) => object.state === "AVAILABLE")
    .map((object) => ({
      objectId: object.objectId,
      version: object.version,
      name: object.name,
    }));

  return (
    <>
      <ArchiveSection
        objects={objects}
        loading={objectsLoading}
        error={objectsError}
        onRefresh={() => void loadArchive()}
      />
      <RequestsSection
        requests={requests}
        availableOptions={availableOptions}
        requestsLoading={requestsLoading}
        requestsError={requestsError}
        onSubmit={reloadAll}
        onStateMutated={reloadAll}
      />
    </>
  );
}
