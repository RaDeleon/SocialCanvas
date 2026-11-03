import { useState, type FormEvent } from "react";
import {
  Plus,
  Link2,
  ArrowUpRight,
  Copy,
  RefreshCw,
  Unplug,
  Trash2,
  Users,
  CheckCircle2,
  Clock,
  Instagram,
} from "lucide-react";
import type { Client, Workspace } from "../types";
import { send, copy } from "../api";
import { Empty, Modal, Notice } from "./ui";
export function ClientForm({
  onCreated,
  notify,
  compact = false,
}: {
  onCreated: (c: Client) => Promise<void> | void;
  notify: (s: string, e?: boolean) => void;
  compact?: boolean;
}) {
  const [name, setName] = useState(""),
    [website, setWebsite] = useState(""),
    [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const c = await send<Client>("/clients", {
        name,
        website: website.match(/^https?:\/\//) ? website : `https://${website}`,
        email,
      });
      setName("");
      setWebsite("");
      setEmail("");
      await onCreated(c);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className={compact ? "quick-client" : "client-form"}
      onSubmit={submit}
    >
      {compact && (
        <div className="quick-intro">
          <Users size={25} />
          <div>
            <strong>New client</strong>
            <p>
              Invite a client and create a connection link to manage their
              widget.
            </p>
          </div>
        </div>
      )}
      <label className="field">
        Client name
        <input
          required
          maxLength={100}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Acme Studio"
        />
      </label>
      <label className="field">
        Website
        <input
          required
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="e.g. acme.studio"
        />
      </label>
      {!compact && (
        <label className="field">
          Email <span className="muted">(optional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="client@example.com"
          />
        </label>
      )}
      <button className="button primary" disabled={busy}>
        <Link2 size={17} />
        {busy ? "Creating…" : "Create connection link"}
      </button>
    </form>
  );
}
export function InvitationModal({
  clientId,
  clientName,
  onClose,
  reload,
  notify,
}: {
  clientId: string;
  clientName: string;
  onClose: () => void;
  reload: () => Promise<void>;
  notify: (s: string, e?: boolean) => void;
}) {
  const [invitation, setInvitation] = useState<{
      url: string;
      expires: number;
    } | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function generate() {
    setBusy(true);
    setError("");
    try {
      setInvitation(await send(`/clients/${clientId}/invitations`));
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={`Connect ${clientName}`} onClose={onClose}>
      <p className="muted">
        Send your client a private link to authorize Instagram. You handle the
        widget setup afterward.
      </p>
      {error && <Notice error text={error} />}
      <div className="invite-steps">
        <span>1</span>
        <p>Client opens your invitation</p>
        <span>2</span>
        <p>They connect a Business or Creator account</p>
        <span>3</span>
        <p>You design and install their feed</p>
      </div>
      {invitation ? (
        <>
          <label className="field">
            Private connection link
            <input
              readOnly
              value={invitation.url}
              onFocus={(e) => e.target.select()}
            />
          </label>
          <small className="muted">
            Expires {new Date(invitation.expires).toLocaleString()}. This link
            can be used once.
          </small>
          <div className="modal-actions">
            <button
              className="button primary"
              onClick={async () => {
                try {
                  await copy(invitation.url);
                  notify("Connection link copied.");
                } catch (e) {
                  notify((e as Error).message, true);
                }
              }}
            >
              <Copy size={16} />
              Copy link
            </button>
            <a
              className="button"
              href={invitation.url}
              target="_blank"
              rel="noreferrer"
            >
              Preview invitation <ArrowUpRight size={16} />
            </a>
          </div>
          <p className="field-hint">
            Generating a new invitation revokes previous unused links for this
            client.
          </p>
          <button className="text-button" disabled={busy} onClick={generate}>
            Generate a replacement link
          </button>
        </>
      ) : (
        <button
          className="button primary full"
          disabled={busy}
          onClick={generate}
        >
          <Link2 size={17} />
          {busy ? "Generating…" : "Generate secure link"}
        </button>
      )}
    </Modal>
  );
}
export function Clients({
  data,
  connections = false,
  onInvite,
  onNew,
  onWidget,
  reload,
  notify,
}: {
  data: Workspace;
  connections?: boolean;
  onInvite: (c: Client) => void;
  onNew: () => void;
  onWidget: (c: Client) => void;
  reload: () => Promise<void>;
  notify: (s: string, e?: boolean) => void;
}) {
  const [search, setSearch] = useState(""),
    [busy, setBusy] = useState<string | null>(null);
  async function action(id: string, path: string, method = "POST") {
    setBusy(id);
    try {
      await send(path, undefined, method);
      await reload();
      notify(
        method === "DELETE"
          ? "Connection removed. Cached media has been deleted."
          : "Feed refreshed.",
      );
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(null);
    }
  }
  const clients = data.clients.filter((c) =>
    `${c.name} ${c.website}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            {connections
              ? "Keep your feeds connected."
              : "Good work starts with a connection."}
          </h1>
          <p>
            {connections
              ? "Monitor Instagram accounts and keep every client’s feed up to date."
              : "Invite your clients. They connect Instagram. You take it from there."}
          </p>
        </div>
        <button className="button primary" onClick={onNew}>
          <Plus size={18} />
          Add client
        </button>
      </div>
      <div className="list-toolbar">
        <input
          aria-label="Search clients"
          placeholder="Search clients…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span>
          {clients.length} {clients.length === 1 ? "client" : "clients"}
        </span>
      </div>
      {clients.length ? (
        <div className="client-list">
          {clients.map((c) => {
            const a = data.accounts.find((a) => a.clientId === c.id);
            const pending = data.invitations.find(
              (i) =>
                i.clientId === c.id &&
                !i.used &&
                !i.revoked &&
                i.expires > Date.now(),
            );
            return (
              <article className="client-row" key={c.id}>
                <div className="client-monogram">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="client-info">
                  <h3>{c.name}</h3>
                  <a href={c.website} target="_blank" rel="noreferrer">
                    {new URL(c.website).hostname}
                    <ArrowUpRight size={13} />
                  </a>
                </div>
                <div className="connection-info">
                  {a ? (
                    <>
                      <span
                        className={`connection-status ${a.error ? "warning" : ""}`}
                      >
                        <Instagram size={15} />@{a.username}
                        {a.demo && <span className="badge neutral">Demo</span>}
                      </span>
                      <small>
                        {a.error ??
                          `Last synced ${new Date(a.lastSync).toLocaleString()}`}
                      </small>
                    </>
                  ) : (
                    <>
                      <span className="connection-status muted">
                        <Clock size={15} />
                        {pending ? "Invitation pending" : "Not connected"}
                      </span>
                      <small>
                        {pending
                          ? "Waiting for client authorization"
                          : "Create a link to get started"}
                      </small>
                    </>
                  )}
                </div>
                <div className="row-actions">
                  <button className="button small" onClick={() => onInvite(c)}>
                    <Link2 size={15} />
                    {a ? "Reconnect" : "Invite"}
                  </button>
                  {a && (
                    <>
                      <button
                        className="icon-btn"
                        disabled={busy === c.id}
                        aria-label={`Refresh ${c.name}`}
                        onClick={() => action(c.id, `/clients/${c.id}/sync`)}
                      >
                        <RefreshCw
                          size={16}
                          className={busy === c.id ? "spinning" : ""}
                        />
                      </button>
                      <button
                        className="icon-btn"
                        aria-label={`Disconnect ${c.name}`}
                        onClick={() => {
                          if (
                            confirm(
                              "Disconnect Instagram and delete cached media? Published feeds will become empty.",
                            )
                          )
                            void action(
                              c.id,
                              `/clients/${c.id}/account`,
                              "DELETE",
                            );
                        }}
                      >
                        <Unplug size={17} />
                      </button>
                    </>
                  )}
                  <button className="button small" onClick={() => onWidget(c)}>
                    Create widget
                  </button>
                  <button
                    className="icon-btn danger-text"
                    aria-label={`Delete ${c.name}`}
                    onClick={() => {
                      if (
                        confirm(
                          `Delete ${c.name}, their widgets, invitations, and connected account?`,
                        )
                      )
                        void action(c.id, `/clients/${c.id}`, "DELETE");
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <Empty
          title="Your next client starts here"
          description="Add a client, then send them a secure Instagram connection link."
        >
          <button className="button primary" onClick={onNew}>
            Add client
          </button>
        </Empty>
      )}
      {connections &&
        data.invitations.some(
          (i) => !i.used && !i.revoked && i.expires > Date.now(),
        ) && (
          <section className="pending-section">
            <h2>Pending invitations</h2>
            {data.invitations
              .filter((i) => !i.used && !i.revoked && i.expires > Date.now())
              .map((i) => (
                <div className="pending-row" key={i.hash}>
                  <div>
                    <strong>
                      {data.clients.find((c) => c.id === i.clientId)?.name}
                    </strong>
                    <small>
                      Expires {new Date(i.expires).toLocaleString()}
                    </small>
                  </div>
                  <button
                    className="button small"
                    onClick={() =>
                      action(i.hash, `/invitations/${i.hash}`, "DELETE")
                    }
                  >
                    Revoke link
                  </button>
                </div>
              ))}
          </section>
        )}
    </>
  );
}
