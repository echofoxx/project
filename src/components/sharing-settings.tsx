"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Cable, Copy, KeyRound, RefreshCw, Trash2 } from "lucide-react";
import { createApiToken, revokeApiToken } from "@/app/actions/api-tokens";
import { saveSharePointConnection, deleteSharePointConnection } from "@/app/actions/sharepoint";

type Token = {
  id: string;
  name: string;
  tokenPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
};

type SharePointConnection = {
  tenantId: string;
  clientId: string;
  siteUrl: string;
  listName: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
};

export function SharingSettings({
  projectId,
  tokens,
  sharePointConnection,
}: {
  projectId: string;
  tokens: Token[];
  sharePointConnection: SharePointConnection | null;
}) {
  const router = useRouter();

  const [tokenList, setTokenList] = useState(tokens);
  const [tokenName, setTokenName] = useState("");
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [tokenPending, startTokenTransition] = useTransition();

  const [spConfig, setSpConfig] = useState({
    tenantId: sharePointConnection?.tenantId ?? "",
    clientId: sharePointConnection?.clientId ?? "",
    clientSecret: "",
    siteUrl: sharePointConnection?.siteUrl ?? "",
    listName: sharePointConnection?.listName ?? "",
  });
  const [spSaved, setSpSaved] = useState(!!sharePointConnection);
  const [spMessage, setSpMessage] = useState<string | null>(null);
  const [spSavePending, startSpSaveTransition] = useTransition();
  const [spSyncPending, setSpSyncPending] = useState(false);

  const externalPath = `/api/external/projects/${projectId}`;
  const [externalUrl, setExternalUrl] = useState(externalPath);
  useEffect(() => {
    // Reads a browser-only global, so this can't be computed during SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExternalUrl(`${window.location.origin}${externalPath}`);
  }, [externalPath]);

  function handleCreateToken(e: React.FormEvent) {
    e.preventDefault();
    startTokenTransition(async () => {
      const result = await createApiToken(projectId, tokenName || "Untitled token");
      setTokenList((prev) => [result.apiToken, ...prev]);
      setMintedToken(result.token);
      setTokenName("");
    });
  }

  function handleRevokeToken(tokenId: string) {
    startTokenTransition(async () => {
      await revokeApiToken(projectId, tokenId);
      setTokenList((prev) => prev.filter((t) => t.id !== tokenId));
    });
  }

  function handleSaveSharePoint(e: React.FormEvent) {
    e.preventDefault();
    setSpMessage(null);
    startSpSaveTransition(async () => {
      await saveSharePointConnection(projectId, spConfig);
      setSpConfig((prev) => ({ ...prev, clientSecret: "" }));
      setSpSaved(true);
      setSpMessage("Connection saved.");
      router.refresh();
    });
  }

  function handleDeleteSharePoint() {
    startSpSaveTransition(async () => {
      await deleteSharePointConnection(projectId);
      setSpConfig({ tenantId: "", clientId: "", clientSecret: "", siteUrl: "", listName: "" });
      setSpSaved(false);
      setSpMessage(null);
      router.refresh();
    });
  }

  async function handleSyncNow() {
    setSpSyncPending(true);
    setSpMessage(null);
    const res = await fetch(`/api/projects/${projectId}/sharepoint/sync`, { method: "POST" });
    const data = await res.json();
    setSpSyncPending(false);
    setSpMessage(
      res.ok
        ? `Synced ${data.itemsSynced} task${data.itemsSynced === 1 ? "" : "s"} to SharePoint.`
        : (data.error ?? "Sync failed."),
    );
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <KeyRound className="h-4 w-4 text-slate-400" />
          API access
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Create a token to let another instance of this app (or any external tool) pull this
          project&apos;s data over HTTP. Send it as{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs dark:bg-slate-800">
            Authorization: Bearer &lt;token&gt;
          </code>{" "}
          to:
        </p>
        <code className="mt-1 block break-all rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400">
          GET {externalUrl}
        </code>

        <ul className="mt-3 space-y-1.5">
          {tokenList.map((t) => (
            <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate text-slate-700 dark:text-slate-300">
                {t.name}{" "}
                <code className="text-xs text-slate-400 dark:text-slate-500">
                  {t.tokenPrefix}…
                </code>
              </span>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  {t.lastUsedAt
                    ? `used ${new Date(t.lastUsedAt).toLocaleDateString()}`
                    : "never used"}
                </span>
                <button
                  type="button"
                  title="Revoke token"
                  onClick={() => handleRevokeToken(t.id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
          {tokenList.length === 0 && (
            <p className="text-sm text-slate-400 dark:text-slate-500">No tokens yet.</p>
          )}
        </ul>

        <form onSubmit={handleCreateToken} className="mt-3 flex items-center gap-2">
          <input
            value={tokenName}
            onChange={(e) => setTokenName(e.target.value)}
            placeholder="Token name (e.g. Staging instance)"
            className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            type="submit"
            disabled={tokenPending}
            className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
          >
            <KeyRound className="h-3.5 w-3.5" />
            New token
          </button>
        </form>

        {mintedToken && (
          <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-amber-800 dark:text-amber-300">
              Copy this token now — it won&apos;t be shown again.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-xs dark:bg-slate-900">
                {mintedToken}
              </code>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(mintedToken)}
                className="flex items-center gap-1 rounded-md border border-amber-300 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-100 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
          <Cable className="h-4 w-4 text-slate-400" />
          SharePoint sync
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Push this project&apos;s tasks to a SharePoint list via Microsoft Graph. Requires an
          Azure AD app registration with app-only access to the target site, and a list with
          Title, Status, PlannedStart, PlannedEnd, PercentComplete, and AssigneeEmail columns.
        </p>

        <form onSubmit={handleSaveSharePoint} className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            value={spConfig.tenantId}
            onChange={(e) => setSpConfig((p) => ({ ...p, tenantId: e.target.value }))}
            placeholder="Tenant ID"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={spConfig.clientId}
            onChange={(e) => setSpConfig((p) => ({ ...p, clientId: e.target.value }))}
            placeholder="Client (application) ID"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            type="password"
            value={spConfig.clientSecret}
            onChange={(e) => setSpConfig((p) => ({ ...p, clientSecret: e.target.value }))}
            placeholder={spSaved ? "Client secret (leave blank to keep current)" : "Client secret"}
            required={!spSaved}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={spConfig.siteUrl}
            onChange={(e) => setSpConfig((p) => ({ ...p, siteUrl: e.target.value }))}
            placeholder="https://contoso.sharepoint.com/sites/ProjectX"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <input
            value={spConfig.listName}
            onChange={(e) => setSpConfig((p) => ({ ...p, listName: e.target.value }))}
            placeholder="List name"
            required
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <div className="flex items-center gap-2 sm:col-span-2">
            <button
              type="submit"
              disabled={spSavePending}
              className="flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-60"
            >
              {spSavePending ? "Saving..." : "Save connection"}
            </button>
            {spSaved && (
              <>
                <button
                  type="button"
                  onClick={handleSyncNow}
                  disabled={spSyncPending}
                  className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${spSyncPending ? "animate-spin" : ""}`} />
                  {spSyncPending ? "Syncing..." : "Sync now"}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSharePoint}
                  className="flex items-center gap-1.5 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                  title="Remove connection"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </form>

        {sharePointConnection?.lastSyncAt && (
          <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
            Last synced {new Date(sharePointConnection.lastSyncAt).toLocaleString()}
          </p>
        )}
        {spMessage && (
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{spMessage}</p>
        )}
      </section>
    </div>
  );
}
