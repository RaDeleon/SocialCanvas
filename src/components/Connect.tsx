import { useEffect, useState } from "react";
import {
  Instagram,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  FlaskConical,
} from "lucide-react";
import { api, send } from "../api";
import { Brand, Notice } from "./ui";
type Invite = {
  name: string;
  website: string;
  expires: number;
  demo: boolean;
  configured: boolean;
};
export function Connect({ token }: { token: string }) {
  const [invite, setInvite] = useState<Invite | null>(null),
    [error, setError] = useState(""),
    [done, setDone] = useState(false),
    [busy, setBusy] = useState(false),
    [consent, setConsent] = useState(false);
  useEffect(() => {
    api<Invite>(`/connect/${token}`)
      .then(setInvite)
      .catch((e) => setError(e.message));
  }, [token]);
  return (
    <div className="connect-page">
      <Brand />
      <main className="connect-card">
        {done ? (
          <>
            <span className="connect-icon success">
              <CheckCircle2 size={34} />
            </span>
            <h1>You’re all connected.</h1>
            <p>
              Your demo account is connected. Your website manager can now
              configure your feed. No real Instagram account was accessed.
            </p>
          </>
        ) : error ? (
          <>
            <span className="connect-icon">
              <ShieldCheck size={34} />
            </span>
            <h1>Let’s get you a fresh link.</h1>
            <Notice error text={error} />
            <p>Contact your website manager for another invitation.</p>
          </>
        ) : !invite ? (
          <p>Opening your invitation…</p>
        ) : (
          <>
            <span className="connect-icon">
              <Instagram size={34} />
            </span>
            <h1>
              A little Instagram.
              <br />A lot more you.
            </h1>
            <p>
              <strong>{invite.name}</strong> has invited you to connect
              Instagram for{" "}
              <a href={invite.website} target="_blank" rel="noreferrer">
                {new URL(invite.website).hostname}
                <ExternalLink size={13} />
              </a>
              .
            </p>
            <div className="permission-box">
              <ShieldCheck size={21} />
              <div>
                <strong>Your account stays yours.</strong>
                <p>
                  SocialCanvas reads your profile and posts to display a feed on
                  your website. It cannot publish posts or read your messages.
                  Your password is entered only on Instagram.
                </p>
              </div>
            </div>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              <span>
                I authorize my website manager to display my Instagram content
                on my website.
              </span>
            </label>
            {invite.configured ? (
              <a
                className={`button primary full ${!consent ? "disabled" : ""}`}
                aria-disabled={!consent}
                href={consent ? `/api/connect/${token}/authorize` : undefined}
              >
                <Instagram size={19} />
                Connect with Instagram
                <ArrowRight size={18} />
              </a>
            ) : (
              <Notice text="Live Instagram connection isn’t configured yet. Your website manager needs to finish setup." />
            )}
            {invite.demo && (
              <div className="demo-connect">
                <p>
                  <FlaskConical size={16} />
                  Demo workspace
                </p>
                <button
                  className="button full"
                  disabled={busy || !consent}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await send(`/connect/${token}/demo`);
                      setDone(true);
                    } catch (e) {
                      setError((e as Error).message);
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Connecting…" : "Try with a demo account"}
                </button>
                <small>
                  Uses sample photography. No Instagram login required.
                </small>
              </div>
            )}
            <p className="connect-footnote">
              Requires an Instagram Business or Creator account.
              <br />
              Invitation expires {new Date(invite.expires).toLocaleDateString()}
              .
            </p>
          </>
        )}
      </main>
      <footer>
        Powered by SocialCanvas · <a href="/privacy">Privacy & data</a>
      </footer>
    </div>
  );
}
export function ConnectionResult() {
  const status = new URLSearchParams(location.search).get("status"),
    success = status === "success";
  return (
    <div className="connect-page">
      <Brand />
      <main className="connect-card">
        <span className="connect-icon">
          <CheckCircle2 size={34} />
        </span>
        <h1>
          {success
            ? "You’re all connected."
            : status === "cancelled"
              ? "You’re in control."
              : "Let’s try that again."}
        </h1>
        <p>
          {success
            ? "Your Instagram account is connected. Your website manager will take care of the design and installation. You can close this page."
            : status === "cancelled"
              ? "You cancelled the connection. Open your invitation again whenever you’re ready."
              : "Instagram could not complete the connection. Reopen your invitation to try again, or contact your website manager."}
        </p>
      </main>
    </div>
  );
}
