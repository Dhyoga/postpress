"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { useApi } from "@/lib/hooks/use-api";
import type { Post, PostStatus, PostType } from "@/lib/mock/types";

export type NewPostInput = {
  type: PostType;
  template: string;
  topic: string;
  planId?: string | null;
  scheduledFor?: string | null;
};

type PostsContextValue = {
  posts: Post[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  updateStatus: (id: string, status: PostStatus) => Promise<void>;
  updateSchedule: (id: string, scheduledFor: string) => Promise<void>;
  addPost: (post: NewPostInput) => Promise<void>;
  uploadManualPost: (formData: FormData) => Promise<void>;
  removePost: (id: string) => Promise<void>;
  generatePost: (id: string) => Promise<void>;
  publishNow: (id: string) => Promise<void>;
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

  async function updateSchedule(id: string, scheduledFor: string) {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledFor }),
    });
    if (!res.ok) {
      throw new Error(`Gagal mengubah jadwal: ${res.status}`);
    }
    refresh();
  }

  async function addPost(post: NewPostInput) {
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(post),
    });
    if (!res.ok) {
      throw new Error(`Gagal menambahkan post: ${res.status}`);
    }
    refresh();
  }

  async function uploadManualPost(formData: FormData) {
    const res = await fetch("/api/posts/upload", { method: "POST", body: formData });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || `Gagal mengunggah post: ${res.status}`);
    }
    refresh();
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

  async function generatePost(id: string) {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}/generate`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Gagal men-generate post: ${res.status}`);
    }
    refresh();
  }

  async function publishNow(id: string) {
    const res = await fetch(`/api/posts/${encodeURIComponent(id)}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    refresh();
    // `attemptPublish` bisa gagal (Graph API menolak) tanpa membuat request-nya
    // sendiri gagal (tetap HTTP 200) — cek `ok` di body, bukan cuma res.ok.
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || `Gagal publish post: ${res.status}`);
    }
  }

  return (
    <PostsContext.Provider
      value={{
        posts,
        loading,
        error: error ?? null,
        refresh,
        updateStatus,
        updateSchedule,
        addPost,
        uploadManualPost,
        removePost,
        generatePost,
        publishNow,
      }}
    >
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts harus dipakai di dalam PostsProvider");
  return ctx;
}
