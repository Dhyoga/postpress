"use client";

import { createContext, useContext, useState } from "react";
import { MOCK_POSTS } from "@/lib/mock/posts";
import type { Post, PostStatus } from "@/lib/mock/types";

type PostsContextValue = {
  posts: Post[];
  updateStatus: (id: string, status: PostStatus) => void;
  addPost: (post: Post) => void;
  removePost: (id: string) => void;
};

const PostsContext = createContext<PostsContextValue | null>(null);

// Menyimpan state posts di memori client, padanan `var posts` global di prototipe
// index.html — supaya aksi approve/reject/tambah draf terasa hidup lintas halaman
// tanpa backend. TODO: ganti ke query + mutation lib/db/queries/posts setelah Supabase siap.
export function PostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

  function updateStatus(id: string, status: PostStatus) {
    setPosts((prev) => prev.map((p) => (p.id === id ? { ...p, status } : p)));
  }
  function addPost(post: Post) {
    setPosts((prev) => [...prev, post]);
  }
  function removePost(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <PostsContext.Provider value={{ posts, updateStatus, addPost, removePost }}>
      {children}
    </PostsContext.Provider>
  );
}

export function usePosts(): PostsContextValue {
  const ctx = useContext(PostsContext);
  if (!ctx) throw new Error("usePosts harus dipakai di dalam PostsProvider");
  return ctx;
}
