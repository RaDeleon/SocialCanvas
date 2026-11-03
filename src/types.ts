export type Layout =
  "grid" | "masonry" | "collage" | "slider" | "single" | "vertical";
export type Config = {
  layout: Layout;
  columns: number;
  mobileColumns: number;
  gap: number;
  radius: number;
  limit: number;
  title: string;
  showProfile: boolean;
  showCaptions: boolean;
  theme: "light" | "dark";
  accent: string;
  clickAction: "lightbox" | "instagram" | "none";
  mediaFilter: string;
  hiddenPosts: string[];
  cardStyle: "tile" | "classic";
};
export type Media = {
  id: string;
  type: string;
  url: string;
  thumbnail: string | null;
  caption: string;
  permalink: string;
  timestamp: string;
  children: Media[];
};
export type Client = {
  id: string;
  name: string;
  website: string;
  email: string;
  created: string;
};
export type Account = {
  id: string;
  clientId: string;
  username: string;
  name: string;
  avatar: string | null;
  demo: boolean;
  lastSync: string;
  expires: number | null;
  error: string | null;
  posts: Media[];
};
export type Widget = {
  id: string;
  clientId: string;
  name: string;
  config: Config;
  published: Config | null;
  domains: string[];
  updated: string;
};
export type Invitation = {
  hash: string;
  clientId: string;
  expires: number;
  used: number;
  revoked: number;
  created: string;
};
export type Workspace = {
  clients: Client[];
  accounts: Account[];
  widgets: Widget[];
  invitations: Invitation[];
};
export type Status = {
  authenticated: boolean;
  demo: boolean;
  configured: boolean;
  appUrl: string;
  sourceUrl: string;
};
export type PublicFeed = {
  id: string;
  name: string;
  config: Config;
  account: Pick<Account, "username" | "name" | "avatar" | "demo"> | null;
  posts: Media[];
};
