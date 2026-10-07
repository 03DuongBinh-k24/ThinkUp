export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content?: string;
  category: string;
  author: {
    name: string;
    avatar?: string;
    role?: string;
  };
  publishedAt: string;
  readTimeMinutes: number;
  tags: string[];
  coverUrl?: string;
  viewsCount?: number;
  likesCount?: number;
}
