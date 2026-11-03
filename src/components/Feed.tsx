import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Instagram,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Play,
  Layers,
  X,
  Heart,
  MessageCircle,
} from "lucide-react";
import type { Config, Media, PublicFeed } from "../types";
const safeUrl = (url: string) => {
  try {
    return ["https:", "http:"].includes(new URL(url).protocol) ? url : "#";
  } catch {
    return "#";
  }
};
export function Feed({
  config,
  account,
  posts,
  mobile = false,
}: {
  config: Config;
  account: PublicFeed["account"];
  posts: Media[];
  mobile?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null),
    [child, setChild] = useState(0),
    [visible, setVisible] = useState(9),
    [slide, setSlide] = useState(0);
  const rail = useRef<HTMLDivElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  const filtered = posts
    .filter(
      (p) =>
        !config.hiddenPosts.includes(p.id) &&
        (config.mediaFilter === "all" || p.type === config.mediaFilter),
    )
    .slice(0, config.limit);
  const selection = selected === null ? null : filtered[selected];
  useEffect(() => {
    setVisible(9);
    setSlide(0);
  }, [config.layout, config.limit, config.mediaFilter]);
  useEffect(() => {
    if (selection) dialog.current?.showModal();
    else dialog.current?.close();
  }, [selection]);
  function open(index: number) {
    if (config.clickAction === "lightbox") {
      setChild(0);
      setSelected(index);
    } else if (config.clickAction === "instagram")
      window.open(
        safeUrl(filtered[index].permalink),
        "_blank",
        "noopener,noreferrer",
      );
  }
  const styles = {
    "--feed-gap": `${config.gap}px`,
    "--feed-radius": `${config.radius}px`,
    "--feed-cols": config.columns,
    "--feed-mobile-cols": config.mobileColumns,
    "--feed-accent": config.accent,
  } as CSSProperties;
  const count =
    config.layout === "single"
      ? 1
      : config.layout === "slider"
        ? filtered.length
        : visible;
  return (
    <section
      className={`feed theme-${config.theme} ${mobile ? "force-mobile" : ""}`}
      style={styles}
      aria-label="Instagram feed"
    >
      {account?.demo && (
        <div className="demo-feed-note">Demo content · sample photography</div>
      )}
      {config.showProfile && (
        <header className="feed-profile">
          <div className="profile-avatar">
            {account?.avatar ? (
              <img src={safeUrl(account.avatar)} alt="" />
            ) : (
              <Instagram size={23} />
            )}
          </div>
          <div>
            <strong>@{account?.username ?? "your.account"}</strong>
            <p>{config.title}</p>
          </div>
          <a
            className="follow"
            style={{ color: config.accent, borderColor: config.accent }}
            href={`https://www.instagram.com/${encodeURIComponent(account?.username ?? "")}/`}
            target="_blank"
            rel="noreferrer"
          >
            Follow <ArrowUpRight size={14} />
          </a>
        </header>
      )}
      {!account || !filtered.length ? (
        <div className="feed-empty">
          <Instagram size={30} />
          <h3>
            {account
              ? "No posts to show yet"
              : "Connect Instagram to bring this feed to life"}
          </h3>
          <p>
            {account
              ? "Try changing your content filters."
              : "Your connected account’s posts will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div ref={rail} className={`feed-posts layout-${config.layout}`}>
            {(config.layout === "single"
              ? filtered.slice(slide, slide + 1)
              : filtered.slice(0, count)
            ).map((post, index) => {
              const idx = config.layout === "single" ? slide : index;
              return (
                <article
                  className={`post ${config.cardStyle === "classic" ? "classic" : ""}`}
                  key={post.id}
                >
                  {config.cardStyle === "classic" && (
                    <div className="post-header">
                      <Instagram size={15} />
                      <strong>@{account.username}</strong>
                    </div>
                  )}
                  <button
                    className="post-media"
                    aria-label={`Open post: ${post.caption.slice(0, 65) || "Instagram post"}`}
                    disabled={config.clickAction === "none"}
                    onClick={() => open(idx)}
                  >
                    <img
                      src={safeUrl(post.thumbnail ?? post.url)}
                      alt={post.caption || "Instagram post"}
                      loading={index < 3 ? "eager" : "lazy"}
                      onError={(e) => {
                        e.currentTarget.classList.add("image-error");
                        e.currentTarget.alt =
                          "Image unavailable. Open on Instagram to view.";
                      }}
                    />
                    {post.type !== "IMAGE" && (
                      <span className="post-type">
                        {post.type === "VIDEO" ? (
                          <Play size={18} fill="currentColor" />
                        ) : (
                          <Layers size={18} />
                        )}
                      </span>
                    )}
                    {config.clickAction !== "none" && (
                      <span className="post-hover">
                        <Instagram size={25} />
                        <span>View post</span>
                      </span>
                    )}
                  </button>
                  {(config.showCaptions || config.cardStyle === "classic") && (
                    <div className="post-caption">
                      {config.cardStyle === "classic" && (
                        <div className="post-actions">
                          <Heart size={17} />
                          <MessageCircle size={17} />
                        </div>
                      )}
                      <p>{post.caption}</p>
                      <time dateTime={post.timestamp}>
                        {new Date(post.timestamp).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric" },
                        )}
                      </time>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
          {["slider", "single"].includes(config.layout) ? (
            <div className="feed-navigation">
              <button
                className="icon-btn"
                aria-label="Previous posts"
                disabled={config.layout === "single" && slide === 0}
                onClick={() =>
                  config.layout === "single"
                    ? setSlide(Math.max(0, slide - 1))
                    : rail.current?.scrollBy({
                        left: -rail.current.clientWidth,
                        behavior: "smooth",
                      })
                }
              >
                <ChevronLeft size={19} />
              </button>
              <span>
                {config.layout === "single"
                  ? `${slide + 1} / ${filtered.length}`
                  : "More moments, this way"}
              </span>
              <button
                className="icon-btn"
                aria-label="Next posts"
                disabled={
                  config.layout === "single" && slide === filtered.length - 1
                }
                onClick={() =>
                  config.layout === "single"
                    ? setSlide(Math.min(filtered.length - 1, slide + 1))
                    : rail.current?.scrollBy({
                        left: rail.current.clientWidth,
                        behavior: "smooth",
                      })
                }
              >
                <ChevronRight size={19} />
              </button>
            </div>
          ) : (
            filtered.length > visible && (
              <button
                className="load-more"
                onClick={() => setVisible((v) => v + 9)}
              >
                Load more
              </button>
            )
          )}
        </>
      )}
      <dialog
        ref={dialog}
        className="lightbox"
        onCancel={() => setSelected(null)}
        onClick={(e) => {
          if (e.currentTarget === e.target) setSelected(null);
        }}
      >
        {selection && (
          <>
            <div className="lightbox-top">
              <strong>@{account?.username}</strong>
              <button
                className="icon-btn"
                aria-label="Close post"
                onClick={() => setSelected(null)}
              >
                <X size={22} />
              </button>
            </div>
            <LightboxMedia media={selection.children?.[child] ?? selection} />
            {selection.children?.length > 1 && (
              <div className="feed-navigation">
                <button
                  className="icon-btn"
                  aria-label="Previous image"
                  disabled={child === 0}
                  onClick={() => setChild((c) => c - 1)}
                >
                  <ChevronLeft />
                </button>
                <span>
                  {child + 1} / {selection.children.length}
                </span>
                <button
                  className="icon-btn"
                  aria-label="Next image"
                  disabled={child === selection.children.length - 1}
                  onClick={() => setChild((c) => c + 1)}
                >
                  <ChevronRight />
                </button>
              </div>
            )}
            <p className="lightbox-caption">{selection.caption}</p>
            <div className="lightbox-footer">
              <button
                className="icon-btn"
                aria-label="Previous post"
                disabled={selected === 0}
                onClick={() => {
                  setChild(0);
                  setSelected((i) => Math.max(0, (i ?? 0) - 1));
                }}
              >
                <ChevronLeft />
              </button>
              <a
                href={safeUrl(selection.permalink)}
                target="_blank"
                rel="noreferrer"
              >
                View on Instagram <ArrowUpRight size={16} />
              </a>
              <button
                className="icon-btn"
                aria-label="Next post"
                disabled={selected === filtered.length - 1}
                onClick={() => {
                  setChild(0);
                  setSelected((i) =>
                    Math.min(filtered.length - 1, (i ?? 0) + 1),
                  );
                }}
              >
                <ChevronRight />
              </button>
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}
function LightboxMedia({ media }: { media: Media }) {
  return media.type === "VIDEO" ? (
    <video
      key={media.url}
      src={safeUrl(media.url)}
      poster={media.thumbnail ? safeUrl(media.thumbnail) : undefined}
      controls
      playsInline
    />
  ) : (
    <img
      className="lightbox-image"
      src={safeUrl(media.url)}
      alt={media.caption || "Instagram media"}
    />
  );
}
