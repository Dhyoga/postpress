"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useApi } from "@/lib/hooks/use-api";
import type { Post, PostStatus } from "@/lib/mock/types";

type PostsContextValue = {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateStatus: (id: string, status: PostStatus) => Promise<void>;
  addPost: (post: Post) => Promise<void>;
  removePost: (id: string) => Promise<void>;
};

const PostsContext = createContext<PostsContextValue | null>(null);

export function PostsProvider({ children }: { children: React.ReactNode }) {
  const { data, loading, error, refetch } = useApi<{ posts: Post[] }>("/api/posts");
  const [posts, setPosts] = useState<Post[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = window.localStorage.getItem("demo_user_id");
      if (id) setCurrentUserId(id);
    }
  }, []);

  useEffect(() => {
    if (data?.posts) setPosts(data.posts);
  }, [data]);

  const refresh = () => refetch();

  async function updateStatus(id: string, status: PostStatus) {
    const optimistic = posts.map((p) => (p.id === id ? { ...p, status } : p));
    setPosts(optimistic);
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      setPosts(posts);
      throw new Error(`Gagal memperbarui status: ${res.status}`);
    }
  }

  async function addPost(post: Post) {
    const optimistic = [...posts, post];
    setPosts(optimistic);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      setPosts(posts);
      throw new Error(`Gagal menambahkan post: ${res.status}`);
    }
  }

  async function removePost(id: string) {
    const optimistic = posts.filter((p) => p.id !== id);
    setPosts(optimistic);
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, { method: "DELETE" });
    if (!res.ok) {
      setPosts(posts);
      throw new Error(`Gagal menghapus post: ${res.status}`);
    }
  }

  return (
    <PostsContext.Provider value={{ posts, loading, error: error ?? null, refresh, updateStatus, addPost, removePost }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts harus dipakai di dalam PostsProvider");
  return ctx;
}
