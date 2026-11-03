import { useEffect, useState } from "react";
import {
  Monitor,
  Smartphone,
  Instagram,
  Check,
  Code2,
  Copy,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { api, send, copy } from "../api";
import type { Widget, Account, Config, Layout } from "../types";
import { Feed } from "./Feed";
import { Modal, Toggle, Notice } from "./ui";
const layouts: { id: Layout; name: string }[] = [
  { id: "grid", name: "Grid" },
  { id: "masonry", name: "Masonry" },
  { id: "collage", name: "Collage" },
  { id: "slider", name: "Slider" },
  { id: "single", name: "Single post" },
  { id: "vertical", name: "Vertical" },
];
export function LayoutGlyph({ layout }: { layout: Layout }) {
  return (
    <span className={`layout-glyph glyph-${layout}`} aria-hidden="true">
      {Array.from({ length: layout === "single" ? 1 : 6 }, (_, i) => (
        <i key={i} />
      ))}
    </span>
  );
}
export function Editor({
  widget,
  account,
  appUrl,
  onChange,
  onDelete,
  onDirtyChange,
  notify,
}: {
  widget: Widget;
  account: Account | undefined;
  appUrl: string;
  onChange: (w: Widget) => void;
  onDelete: () => void;
  onDirtyChange: (dirty: boolean) => void;
  notify: (text: string, error?: boolean) => void;
}) {
  const [config, setConfig] = useState(widget.config),
    [name, setName] = useState(widget.name),
    [domains, setDomains] = useState(widget.domains.join(", ")),
    [tab, setTab] = useState("Layout"),
    [mobile, setMobile] = useState(false),
    [busy, setBusy] = useState(false),
    [embed, setEmbed] = useState(false),
    [more, setMore] = useState(false),
    [saved, setSaved] = useState(false);
  useEffect(() => {
    setConfig(widget.config);
    setName(widget.name);
    setDomains(widget.domains.join(", "));
    setSaved(false);
  }, [widget.id, widget.updated]);
  const dirty =
    JSON.stringify(config) !== JSON.stringify(widget.config) ||
    name !== widget.name ||
    domains !== widget.domains.join(", ");
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  const update = <K extends keyof Config>(key: K, value: Config[K]) => {
    setConfig((c) => ({ ...c, [key]: value }));
    setSaved(false);
  };
  async function save(publish = false) {
    setBusy(true);
    try {
      let w = await send<Widget>(
        `/widgets/${widget.id}`,
        {
          name,
          config,
          domains: domains
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
        },
        "PUT",
      );
      if (publish) w = await send<Widget>(`/widgets/${widget.id}/publish`);
      onChange(w);
      setSaved(true);
      notify(
        publish ? "Widget published. Your embed is ready." : "Draft saved.",
      );
      if (publish) setEmbed(true);
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy(false);
    }
  }
  const snippet = `<div data-socialcanvas="${widget.id}"></div>\n<script src="${appUrl}/embed.js" async></script>`;
  return (
    <section className="editor-card">
      <header className="editor-heading">
        <div>
          <Instagram size={21} />
          <strong>{widget.name}</strong>
          <span className="source-label">
            Source: {account ? `@${account.username}` : "Not connected"}
          </span>
          {account?.demo ? (
            <span className="badge">Demo content</span>
          ) : widget.published ? (
            <span className="badge">Published</span>
          ) : (
            <span className="badge neutral">Draft</span>
          )}
        </div>
        <div className="more-wrap">
          <button
            className="icon-btn"
            aria-label="Widget actions"
            onClick={() => setMore(!more)}
          >
            <MoreHorizontal size={20} />
          </button>
          {more && (
            <div className="dropdown">
              {widget.published && (
                <button
                  onClick={async () => {
                    try {
                      await send(`/widgets/${widget.id}/unpublish`);
                      onChange({ ...widget, published: null });
                      setMore(false);
                      notify("Widget unpublished.");
                    } catch (e) {
                      notify((e as Error).message, true);
                    }
                  }}
                >
                  Unpublish widget
                </button>
              )}
              <button
                className="danger-text"
                onClick={() => {
                  if (
                    window.confirm(
                      "Delete this widget? Existing embeds will stop displaying.",
                    )
                  )
                    onDelete();
                }}
              >
                <Trash2 size={15} />
                Delete widget
              </button>
            </div>
          )}
        </div>
      </header>
      <div className="editor-toolbar">
        <label className="widget-name">
          Widget name
          <input
            aria-label="Widget name"
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="device-switch" aria-label="Preview size">
          <button
            aria-label="Desktop preview"
            className={!mobile ? "selected" : ""}
            onClick={() => setMobile(false)}
          >
            <Monitor size={17} />
            <span>Desktop</span>
          </button>
          <button
            aria-label="Mobile preview"
            className={mobile ? "selected" : ""}
            onClick={() => setMobile(true)}
          >
            <Smartphone size={17} />
            <span>Mobile</span>
          </button>
        </div>
        <div className="toolbar-actions">
          {widget.published && (
            <button className="button small" onClick={() => setEmbed(true)}>
              <Code2 size={16} />
              Embed
            </button>
          )}
          <button
            className="button"
            disabled={busy || !name.trim()}
            onClick={() => save()}
          >
            Save draft
          </button>
          <button
            className="button primary"
            disabled={busy || !name.trim()}
            onClick={() => save(true)}
          >
            {busy
              ? "Saving…"
              : widget.published
                ? "Publish changes"
                : "Publish"}
          </button>
        </div>
      </div>
      <div className="editor-body">
        <aside className="inspector">
          <div className="inspector-tabs">
            {["Layout", "Style", "Content"].map((t) => (
              <button
                key={t}
                className={tab === t ? "active" : ""}
                onClick={() => setTab(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="inspector-content">
            {tab === "Layout" && (
              <>
                <h3>Layout</h3>
                <div className="layout-options">
                  {layouts.map((l) => (
                    <button
                      key={l.id}
                      className={config.layout === l.id ? "active" : ""}
                      aria-pressed={config.layout === l.id}
                      onClick={() => update("layout", l.id)}
                    >
                      <LayoutGlyph layout={l.id} />
                      <span>{l.name}</span>
                    </button>
                  ))}
                </div>
                <div className="control-section">
                  {!["single", "vertical"].includes(config.layout) && (
                    <>
                      <Range
                        label={mobile ? "Mobile columns" : "Columns"}
                        value={mobile ? config.mobileColumns : config.columns}
                        min={1}
                        max={mobile ? 3 : 6}
                        onChange={(v) =>
                          mobile
                            ? update("mobileColumns", v)
                            : update("columns", v)
                        }
                      />
                    </>
                  )}
                  <Range
                    label="Spacing"
                    value={config.gap}
                    min={0}
                    max={40}
                    unit=" px"
                    onChange={(v) => update("gap", v)}
                  />
                </div>
                <Toggle
                  label="Show profile"
                  value={config.showProfile}
                  onChange={(v) => update("showProfile", v)}
                />
              </>
            )}
            {tab === "Style" && (
              <>
                <h3>Make it yours</h3>
                <label className="field">
                  Color theme
                  <select
                    value={config.theme}
                    onChange={(e) =>
                      update("theme", e.target.value as Config["theme"])
                    }
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </label>
                <label className="field">
                  Accent color
                  <div className="color-field">
                    <input
                      aria-label="Accent color"
                      type="color"
                      value={config.accent}
                      onChange={(e) => update("accent", e.target.value)}
                    />
                    <span>{config.accent}</span>
                  </div>
                </label>
                <label className="field">
                  Post style
                  <select
                    value={config.cardStyle}
                    onChange={(e) =>
                      update("cardStyle", e.target.value as Config["cardStyle"])
                    }
                  >
                    <option value="tile">Photo tiles</option>
                    <option value="classic">Classic cards</option>
                  </select>
                </label>
                <Range
                  label="Corner radius"
                  value={config.radius}
                  min={0}
                  max={32}
                  unit=" px"
                  onChange={(v) => update("radius", v)}
                />
                <Toggle
                  label="Show captions"
                  value={config.showCaptions}
                  onChange={(v) => update("showCaptions", v)}
                />
                <label className="field">
                  Profile description
                  <textarea
                    rows={3}
                    maxLength={160}
                    value={config.title}
                    onChange={(e) => update("title", e.target.value)}
                  />
                </label>
              </>
            )}
            {tab === "Content" && (
              <>
                <h3>Feed content</h3>
                <label className="field">
                  Media type
                  <select
                    value={config.mediaFilter}
                    onChange={(e) => update("mediaFilter", e.target.value)}
                  >
                    <option value="all">All posts</option>
                    <option value="IMAGE">Photos</option>
                    <option value="VIDEO">Videos & Reels</option>
                    <option value="CAROUSEL_ALBUM">Carousel posts</option>
                  </select>
                </label>
                <Range
                  label="Maximum posts"
                  value={config.limit}
                  min={1}
                  max={100}
                  onChange={(v) => update("limit", v)}
                />
                <label className="field">
                  Click action
                  <select
                    value={config.clickAction}
                    onChange={(e) =>
                      update(
                        "clickAction",
                        e.target.value as Config["clickAction"],
                      )
                    }
                  >
                    <option value="lightbox">Open in lightbox</option>
                    <option value="instagram">Open on Instagram</option>
                    <option value="none">No action</option>
                  </select>
                </label>
                <label className="field">
                  Allowed website domains
                  <textarea
                    value={domains}
                    rows={3}
                    placeholder="example.com, www.example.com"
                    onChange={(e) => setDomains(e.target.value)}
                  />
                  <small>
                    Separate hostnames with commas. Include www if your website
                    uses it.
                  </small>
                </label>
                {account && (
                  <>
                    <h3 className="moderation-title">Choose visible posts</h3>
                    <p className="field-hint">
                      Uncheck a post to hide it from this widget.
                    </p>
                    <div className="moderation">
                      {account.posts.map((p) => (
                        <label key={p.id}>
                          <input
                            aria-label={`Show post ${p.id}`}
                            type="checkbox"
                            checked={!config.hiddenPosts.includes(p.id)}
                            onChange={(e) =>
                              update(
                                "hiddenPosts",
                                e.target.checked
                                  ? config.hiddenPosts.filter(
                                      (id) => id !== p.id,
                                    )
                                  : [...config.hiddenPosts, p.id],
                              )
                            }
                          />
                          <img
                            src={p.thumbnail ?? p.url}
                            alt={p.caption}
                            loading="lazy"
                          />
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </aside>
        <div className={`preview-stage ${mobile ? "mobile-preview" : ""}`}>
          <div className="preview-paper">
            <Feed
              config={config}
              account={account ?? null}
              posts={account?.posts ?? []}
              mobile={mobile}
            />
          </div>
        </div>
      </div>
      <footer className="editor-footer">
        <span>
          <Check size={15} />
          {dirty
            ? "Unsaved changes"
            : saved
              ? "Saved just now."
              : "All changes saved."}
        </span>
        <span>
          {account?.demo
            ? "Sample feed"
            : account?.lastSync
              ? `Synced ${new Date(account.lastSync).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`
              : "Waiting for Instagram connection"}
        </span>
      </footer>
      {embed && (
        <Modal
          title="Bring your feed to your website"
          onClose={() => setEmbed(false)}
        >
          <p className="muted">
            Paste this code into an HTML block where you want the feed to
            appear. Published changes update automatically.
          </p>
          {account?.demo && (
            <Notice text="This widget contains demo photography, not a live Instagram feed." />
          )}
          <pre className="code-block">
            <code>{snippet}</code>
          </pre>
          <button
            className="button primary full"
            onClick={async () => {
              try {
                await copy(snippet);
                notify("Embed code copied.");
              } catch (e) {
                notify((e as Error).message, true);
              }
            }}
          >
            <Copy size={17} />
            Copy embed code
          </button>
          <a
            className="text-link"
            href={`/embed/${widget.id}`}
            target="_blank"
            rel="noreferrer"
          >
            Open published preview <ExternalLink size={15} />
          </a>
          <div className="embed-help">
            <strong>Works with your website</strong>
            <p>
              Use a Custom HTML block in WordPress, an Embed block in Webflow or
              Squarespace, or a Custom Liquid section in Shopify. Your platform
              must allow scripts and frames.
            </p>
            <small>Allowed domains: {widget.domains.join(", ")}</small>
          </div>
        </Modal>
      )}
    </section>
  );
}
function Range({
  label,
  value,
  min,
  max,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="range-field">
      <span>
        {label}
        <output>
          {value}
          {unit}
        </output>
      </span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
