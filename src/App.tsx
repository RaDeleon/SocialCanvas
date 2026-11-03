import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  PanelsTopLeft,
  Users,
  Link2,
  Settings,
  Code2,
  Plus,
  ChevronDown,
  Building2,
  LogOut,
  ArrowUpRight,
  CheckCircle2,
  ShieldCheck,
  Instagram,
  Menu,
  X,
} from "lucide-react";
import { api, send } from "./api";
import type { Client, Status, Widget, Workspace, PublicFeed } from "./types";
import { Brand, Empty, Modal, Notice } from "./components/ui";
import { Editor } from "./components/Editor";
import { ClientForm, Clients, InvitationModal } from "./components/Clients";
import { Connect, ConnectionResult } from "./components/Connect";
import { Feed } from "./components/Feed";
const blank: Workspace = {
  clients: [],
  accounts: [],
  widgets: [],
  invitations: [],
};
export default function App() {
  const path = location.pathname;
  if (path.startsWith("/connect/"))
    return <Connect token={path.split("/")[2]} />;
  if (path === "/connection-result") return <ConnectionResult />;
  if (path.startsWith("/embed/")) return <Embed id={path.split("/")[2]} />;
  if (path === "/privacy") return <Privacy />;
  if (path.startsWith("/data-deletion/"))
    return <DeletionStatus code={path.split("/")[2]} />;
  return <WorkspaceApp />;
}
function WorkspaceApp() {
  const [status, setStatus] = useState<Status | null>(null),
    [data, setData] = useState<Workspace>(blank),
    [page, setPage] = useState("Widgets"),
    [selected, setSelected] = useState<string | null>(null),
    [filter, setFilter] = useState("All widgets"),
    [toast, setToast] = useState<{ text: string; error: boolean } | null>(null),
    [modal, setModal] = useState<"client" | "widget" | null>(null),
    [inviteClient, setInviteClient] = useState<Client | null>(null),
    [loading, setLoading] = useState(true),
    [initialError, setInitialError] = useState(""),
    [navOpen, setNavOpen] = useState(false),
    [editorDirty, setEditorDirty] = useState(false);
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(id);
  }, [toast]);
  const reload = useCallback(async () => {
    const d = await api<Workspace>("/workspace");
    setData(d);
    setSelected((s) =>
      d.widgets.some((w) => w.id === s) ? s : (d.widgets[0]?.id ?? null),
    );
  }, []);
  useEffect(() => {
    api<Status>("/status")
      .then(async (s) => {
        setStatus(s);
        if (s.authenticated) await reload();
      })
      .catch((e) => setInitialError(e.message))
      .finally(() => setLoading(false));
  }, [reload]);
  async function afterLogin() {
    setLoading(true);
    try {
      await reload();
      setStatus((s) => (s ? { ...s, authenticated: true } : s));
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setLoading(false);
    }
  }
  if (loading)
    return (
      <div className="loading-page">
        <Brand />
        <p>Opening your workspace…</p>
      </div>
    );
  if (initialError)
    return (
      <div className="loading-page">
        <Brand />
        <Notice error text={initialError} />
        <button className="button" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    );
  if (!status?.authenticated)
    return <Login status={status} onLogin={afterLogin} />;
  const filtered = data.widgets.filter(
    (w) =>
      filter === "All widgets" ||
      (filter === "Published" ? Boolean(w.published) : !w.published),
  );
  const current = filtered.find((w) => w.id === selected) ?? filtered[0];
  async function newClient(c: Client) {
    setModal(null);
    await reload();
    setInviteClient(c);
  }
  function allowDiscard() {
    if (editorDirty && !window.confirm("Discard unsaved widget changes?"))
      return false;
    setEditorDirty(false);
    return true;
  }
  async function createWidget(c: Client, name = "Untitled widget") {
    if (!allowDiscard()) return;
    try {
      const w = await send<Widget>("/widgets", { clientId: c.id, name });
      await reload();
      setSelected(w.id);
      setPage("Widgets");
      setFilter("All widgets");
      setModal(null);
      notify("Widget created. Make it yours.");
    } catch (e) {
      notify((e as Error).message, true);
    }
  }
  return (
    <div className="app-shell">
      <button
        className="mobile-menu icon-btn"
        aria-label="Toggle navigation"
        onClick={() => setNavOpen(!navOpen)}
      >
        {navOpen ? <X /> : <Menu />}
      </button>
      <aside className={`sidebar ${navOpen ? "open" : ""}`}>
        <Brand />
        <div className="workspace-select">
          <small>Workspace</small>
          <div>
            <Building2 size={17} />
            <strong>Your workspace</strong>
          </div>
        </div>
        <nav>
          {[
            { name: "Widgets", icon: PanelsTopLeft },
            { name: "Clients", icon: Users },
            { name: "Connections", icon: Link2 },
          ].map(({ name, icon: Icon }) => (
            <button
              className={page === name ? "active" : ""}
              key={name}
              onClick={() => {
                if (!allowDiscard()) return;
                setPage(name);
                setNavOpen(false);
              }}
            >
              <Icon size={19} />
              {name}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={page === "Settings" ? "active" : ""}
            onClick={() => {
              if (!allowDiscard()) return;
              setPage("Settings");
              setNavOpen(false);
            }}
          >
            <Settings size={19} />
            Settings
          </button>
          <a href={status.sourceUrl} target="_blank" rel="noreferrer">
            <Code2 size={19} />
            Open source <ArrowUpRight size={13} />
          </a>
          <button
            onClick={async () => {
              try {
                await send("/logout");
                setStatus({ ...status, authenticated: false });
                setData(blank);
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <LogOut size={17} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="workspace-main">
        <div className="breadcrumb">
          Workspace <span>/</span>
          <strong>{page}</strong>
          {status.demo && (
            <span className="workspace-demo">Demo workspace</span>
          )}
        </div>
        {page === "Widgets" && (
          <>
            <div className="page-heading">
              <div>
                <h1>Your Instagram, beautifully embedded.</h1>
                <p>
                  Create a feed. Make it yours. Bring your clients’ websites to
                  life.
                </p>
              </div>
              <button
                className="button primary"
                onClick={() =>
                  setModal(data.clients.length ? "widget" : "client")
                }
              >
                <Plus size={18} />
                Create widget
              </button>
            </div>
            <div className="widget-tabs">
              {["All widgets", "Published", "Drafts"].map((t) => (
                <button
                  key={t}
                  className={filter === t ? "active" : ""}
                  onClick={() => {
                    if (t === filter || allowDiscard()) setFilter(t);
                  }}
                >
                  {t}
                  <span>
                    {
                      data.widgets.filter(
                        (w) =>
                          t === "All widgets" ||
                          (t === "Published"
                            ? Boolean(w.published)
                            : !w.published),
                      ).length
                    }
                  </span>
                </button>
              ))}
            </div>
            {filtered.length > 1 && (
              <div className="widget-selector">
                <label>
                  Editing widget
                  <select
                    aria-label="Choose widget"
                    value={current?.id ?? ""}
                    onChange={(e) => {
                      if (allowDiscard()) setSelected(e.target.value);
                    }}
                  >
                    {filtered.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ·{" "}
                        {data.clients.find((c) => c.id === w.clientId)?.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            {current ? (
              <Editor
                key={current.id}
                widget={current}
                account={data.accounts.find(
                  (a) => a.clientId === current.clientId,
                )}
                appUrl={status.appUrl}
                onDirtyChange={setEditorDirty}
                onChange={(w) =>
                  setData((d) => ({
                    ...d,
                    widgets: d.widgets.map((v) => (v.id === w.id ? w : v)),
                  }))
                }
                onDelete={async () => {
                  try {
                    await send(`/widgets/${current.id}`, undefined, "DELETE");
                    await reload();
                    notify("Widget deleted.");
                  } catch (e) {
                    notify((e as Error).message, true);
                  }
                }}
                notify={notify}
              />
            ) : (
              <Empty
                title={
                  filter === "Published"
                    ? "Ready when you are."
                    : "Give your Instagram a home."
                }
                description={
                  filter === "Published"
                    ? "Publish a widget to make it available on your website."
                    : "Create your first widget, choose a layout, and bring your feed to any website."
                }
              >
                <button
                  className="button primary"
                  onClick={() =>
                    setModal(data.clients.length ? "widget" : "client")
                  }
                >
                  Create widget
                </button>
              </Empty>
            )}
            <ClientForm compact onCreated={newClient} notify={notify} />
          </>
        )}
        {(page === "Clients" || page === "Connections") && (
          <Clients
            data={data}
            connections={page === "Connections"}
            onInvite={setInviteClient}
            onNew={() => setModal("client")}
            onWidget={createWidget}
            reload={reload}
            notify={notify}
          />
        )}
        {page === "Settings" && <SettingsPage status={status} />}
        <footer className="workspace-footer">
          <span>
            SocialCanvas <span className="version">v0.1 beta</span>
          </span>
          <a href="/privacy" target="_blank" rel="noreferrer">
            Privacy & data <ArrowUpRight size={12} />
          </a>
        </footer>
      </main>
      {modal === "client" && (
        <Modal
          title="A new connection starts here"
          onClose={() => setModal(null)}
        >
          <p className="muted">
            Add a client to generate their private Instagram connection link.
          </p>
          <ClientForm onCreated={newClient} notify={notify} />
        </Modal>
      )}
      {modal === "widget" && (
        <CreateWidget
          clients={data.clients}
          onClose={() => setModal(null)}
          onCreate={createWidget}
        />
      )}
      {inviteClient && (
        <InvitationModal
          clientId={inviteClient.id}
          clientName={inviteClient.name}
          onClose={() => setInviteClient(null)}
          reload={reload}
          notify={notify}
        />
      )}{" "}
      {toast && (
        <div className="toast">
          <Notice text={toast.text} error={toast.error} />
        </div>
      )}
    </div>
  );
}
function Login({
  status,
  onLogin,
}: {
  status: Status | null;
  onLogin: () => void;
}) {
  const [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function login(value: string) {
    setBusy(true);
    setError("");
    try {
      await send("/login", { password: value });
      onLogin();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="connect-page">
      <Brand />
      <main className="login-card">
        <span className="connect-icon">
          <PanelsTopLeft size={32} />
        </span>
        <h1>
          A beautiful feed
          <br />
          starts here.
        </h1>
        <p className="muted">Your clients, their Instagram, your canvas.</p>
        {error && <Notice text={error} error />}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void login(password);
          }}
        >
          <label className="field">
            Workspace password
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
          </label>
          <button className="button primary full" disabled={busy}>
            {busy ? "Opening…" : "Sign in to workspace"}
          </button>
        </form>
        {status?.demo && (
          <div className="demo-connect">
            <p>Explore with sample content. No Instagram account needed.</p>
            <button
              className="button full"
              disabled={busy}
              onClick={() => login("socialcanvas-demo")}
            >
              Open demo workspace <ArrowUpRight size={16} />
            </button>
          </div>
        )}
      </main>
      <footer>Open source. Made for a more connected web.</footer>
    </div>
  );
}
function CreateWidget({
  clients,
  onClose,
  onCreate,
}: {
  clients: Client[];
  onClose: () => void;
  onCreate: (c: Client, name: string) => Promise<void>;
}) {
  const [clientId, setClientId] = useState(clients[0]?.id ?? ""),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <Modal title="Your next canvas" onClose={onClose}>
      <form
        className="client-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await onCreate(
            clients.find((c) => c.id === clientId)!,
            name,
          );
          setBusy(false);
        }}
      >
        <label className="field">
          Widget name
          <input
            autoFocus
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Homepage gallery"
          />
        </label>
        <label className="field">
          Client
          <select
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            {clients.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary full" disabled={busy || !name.trim()}>
          {busy ? "Creating…" : "Create widget"}
        </button>
      </form>
    </Modal>
  );
}
function SettingsPage({ status }: { status: Status }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>A workspace that’s yours.</h1>
          <p>
            Connection settings, hosting details, and your open-source
            foundation.
          </p>
        </div>
      </div>
      <div className="settings-grid">
        <section className="settings-panel">
          <Instagram size={24} />
          <h2>Instagram integration</h2>
          <span className={`badge ${!status.configured ? "neutral" : ""}`}>
            {status.configured ? "Credentials configured" : "Setup required"}
          </span>
          <p>
            {status.configured
              ? "Instagram credentials are configured on the server. Test the invitation flow with an approved Instagram account."
              : "Set your Meta Instagram app credentials on the server to enable live account connections."}
          </p>
          <dl>
            <dt>OAuth callback URL</dt>
            <dd>
              <code>{status.appUrl}/api/oauth/instagram/callback</code>
            </dd>
            <dt>Requested permission</dt>
            <dd>
              <code>instagram_business_basic</code>
            </dd>
          </dl>
          <a
            className="text-link"
            href="https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/business-login"
            target="_blank"
            rel="noreferrer"
          >
            Meta setup documentation <ArrowUpRight size={15} />
          </a>
        </section>
        <section className="settings-panel">
          <ShieldCheck size={24} />
          <h2>Managed beta</h2>
          <p>
            Clients authorize their accounts through private invitations.
            Workspace access is reserved for you.
          </p>
          <ul>
            <li>Invitations expire after 72 hours</li>
            <li>Instagram credentials are encrypted at rest</li>
            <li>Live feeds refresh approximately hourly</li>
            <li>Published settings are separate from drafts</li>
          </ul>
          <p className="field-hint">
            Media sync currently retrieves the latest 100 posts. External
            customer onboarding depends on Meta’s access approval.
          </p>
        </section>
        <section className="settings-panel">
          <Code2 size={24} />
          <h2>Open by design</h2>
          <p>
            Self-host SocialCanvas with your own infrastructure and Meta app.
            The hosted service uses the same codebase.
          </p>
          <a
            className="button"
            href={status.sourceUrl}
            target="_blank"
            rel="noreferrer"
          >
            View source code <ArrowUpRight size={16} />
          </a>
          <p className="field-hint">
            AGPL-3.0 · Hosted subscriptions and customer self-service are
            planned for a later release.
          </p>
        </section>
      </div>
    </>
  );
}
function Embed({ id }: { id: string }) {
  const [feed, setFeed] = useState<PublicFeed | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<PublicFeed>(`/public/widgets/${id}`)
      .then(setFeed)
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    const resize = () =>
      window.parent.postMessage(
        {
          type: "socialcanvas:resize",
          height: Math.ceil(
            document.querySelector(".embed-page")?.getBoundingClientRect()
              .height ?? 100,
          ),
        },
        "*",
      );
    const observer = new ResizeObserver(resize);
    observer.observe(document.body);
    resize();
    return () => observer.disconnect();
  }, [feed, error]);
  return (
    <div className="embed-page">
      {error ? (
        <p className="embed-error">{error}</p>
      ) : feed ? (
        <Feed config={feed.config} account={feed.account} posts={feed.posts} />
      ) : (
        <p className="embed-error">Loading Instagram feed…</p>
      )}
    </div>
  );
}
function Privacy() {
  return (
    <div className="connect-page">
      <Brand />
      <article className="privacy-card">
        <h1>Your content. Your control.</h1>
        <p>
          SocialCanvas connects Instagram professional accounts to display their
          profiles and posts on authorized websites.
        </p>
        <h2>What is stored</h2>
        <p>
          Your website manager stores client contact details, Instagram profile
          information, cached post metadata and media URLs, widget settings, and
          encrypted access credentials on their SocialCanvas server. Media is
          loaded from Instagram’s content delivery network. Demo photography is
          loaded from Unsplash.
        </p>
        <h2>What is accessed</h2>
        <p>
          The connection requests read access to your profile and media.
          SocialCanvas does not request permission to publish posts or access
          direct messages. Your Instagram password is never shared with
          SocialCanvas.
        </p>
        <h2>Disconnecting and deletion</h2>
        <p>
          Contact the website manager who sent your invitation to disconnect
          your account or delete your data. Disconnecting removes the locally
          stored Instagram credential and cached feed. You may also remove
          authorization in your Instagram account settings.
        </p>
        <h2>Website visitors</h2>
        <p>
          Feed images and videos make requests to their media providers.
          SocialCanvas includes no analytics or advertising scripts. Your
          website manager is responsible for their own privacy notice and
          consent configuration.
        </p>
        <a
          className="text-link"
          href="https://github.com/RaDeleon/SocialCanvas"
          target="_blank"
          rel="noreferrer"
        >
          View SocialCanvas source <ArrowUpRight size={15} />
        </a>
      </article>
    </div>
  );
}

function DeletionStatus({ code }: { code: string }) {
  const [receipt, setReceipt] = useState<{
      status: string;
      completed: string;
    } | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    api<{ status: string; completed: string }>(`/meta/deletions/${code}`)
      .then(setReceipt)
      .catch((e) => setError(e.message));
  }, [code]);
  return (
    <div className="connect-page">
      <Brand />
      <main className="connect-card">
        <span className="connect-icon">
          <ShieldCheck size={34} />
        </span>
        <h1>
          {error
            ? "Confirmation unavailable"
            : receipt
              ? "Your data has been deleted."
              : "Checking deletion status…"}
        </h1>
        <p>
          {error ||
            (receipt
              ? `The connected account, cached Instagram data, and associated client workspace records were removed on ${new Date(receipt.completed).toLocaleString()}.`
              : "Please wait while we retrieve your confirmation.")}
        </p>
      </main>
    </div>
  );
}
