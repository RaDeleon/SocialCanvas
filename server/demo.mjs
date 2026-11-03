export const defaultConfig = {
  layout: "grid",
  columns: 3,
  mobileColumns: 2,
  gap: 12,
  radius: 6,
  limit: 9,
  title: "A slower kind of everyday.",
  showProfile: true,
  showCaptions: false,
  theme: "light",
  accent: "#235d48",
  clickAction: "lightbox",
  mediaFilter: "all",
  hiddenPosts: [],
  cardStyle: "tile",
};
const photos = [
  [
    "photo-1518837695005-2083093ee35b",
    "Salt air, slow mornings. A little reminder to take the scenic route.",
  ],
  ["photo-1445116572660-236099ec97a0", "Your morning, made a little sweeter."],
  ["photo-1616486338812-3dadae4b4ace", "Finding the quiet corners."],
  ["photo-1613490493576-7fde63acd811", "Some places feel like a deep breath."],
  ["photo-1416879595882-3373a0480b5b", "A little green goes a long way."],
  ["photo-1476514525535-07fb3b4ae5f1", "Away from the everyday."],
  ["photo-1499793983690-e29da59ef1c2", "A home for the weekend."],
  ["photo-1493857671505-72967e2e2760", "Meet me at our usual place."],
  [
    "photo-1470252649378-9c29740c9fa8",
    "Golden hour has a way of slowing things down.",
  ],
  ["photo-1500530855697-b586d89ba3ee", "Out here, the days feel different."],
  ["photo-1484154218962-a197022b5858", "Less rush. More room."],
  ["photo-1464822759023-fed622ff2c3b", "A different perspective."],
];
export function demoPosts() {
  return photos.map(([photo, caption], i) => ({
    id: `demo-${i + 1}`,
    type: "IMAGE",
    url: `https://images.unsplash.com/${photo}?auto=format&fit=crop&w=900&q=85`,
    thumbnail: null,
    caption,
    permalink: "https://www.instagram.com/",
    timestamp: new Date(Date.UTC(2026, 9, 30 - i)).toISOString(),
    children: [],
  }));
}
