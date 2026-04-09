export const forumChannelValues = [
  "general",
  "fuites",
  "matos",
  "terrain",
] as const;

export type ForumChannel = (typeof forumChannelValues)[number];

export const forumChannelLabels: Record<ForumChannel, string> = {
  general: "Général",
  fuites: "Fuites",
  matos: "Matos",
  terrain: "Terrain",
};

export const forumFeedFilterValues = [
  "recent",
  "media",
  "popular",
] as const;

export type ForumFeedFilter = (typeof forumFeedFilterValues)[number];

export const forumFeedFilterLabels: Record<ForumFeedFilter, string> = {
  media: "Médias",
  popular: "Populaire",
  recent: "Récent",
};

export const forumPostDisplayModeValues = [
  "standard",
  "media",
] as const;

export type ForumPostDisplayMode = (typeof forumPostDisplayModeValues)[number];

export const forumPostDisplayModeLabels: Record<ForumPostDisplayMode, string> = {
  media: "Carte média",
  standard: "Post",
};

export function getForumChannelLabel(channel: ForumChannel) {
  return forumChannelLabels[channel];
}

export function getForumFeedFilterLabel(filter: ForumFeedFilter) {
  return forumFeedFilterLabels[filter];
}
