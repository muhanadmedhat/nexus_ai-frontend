"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, Loader2, FolderOpen, User, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { search, type SearchResult } from "@/services/search";
import { clsx } from "clsx";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
      setSelectedIndex(-1);
    }
  }, [isOpen]);

  useEffect(() => {
    const delay = setTimeout(async () => {
      if (query.trim()) {
        setLoading(true);
        const data = await search(query);
        setResults(data);
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 300);

    return () => clearTimeout(delay);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      }
      if (e.key === "Enter" && selectedIndex >= 0) {
        e.preventDefault();
        const result = results[selectedIndex];
        if (result) {
          router.push(result.href);
          onClose();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case "project":
        return <FolderOpen size={18} className="text-primary-container" />;
      case "freelancer":
        return <User size={18} className="text-blue-500" />;
      case "task":
        return <FileText size={18} className="text-yellow-500" />;
      default:
        return <Search size={18} className="text-outline" />;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] z-50 w-full max-w-2xl -translate-x-1/2 rounded-xl bg-surface-container-lowest shadow-2xl border border-outline-variant/30">
        <div className="flex items-center gap-3 border-b border-outline-variant/30 px-4 py-3">
          <Search size={20} className="text-outline" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search projects, freelancers, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-on-surface outline-none placeholder:text-outline/50"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-outline hover:text-on-surface">
              <X size={18} />
            </button>
          )}
          <kbd className="rounded bg-surface-container-high px-2 py-1 text-xs text-on-surface-variant">
            ESC
          </kbd>
        </div>

        {query && (
          <div className="max-h-80 overflow-y-auto p-2">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-container" />
              </div>
            ) : results.length === 0 ? (
              <div className="py-8 text-center text-sm text-on-surface-variant">
                No results found for &ldquo;{query}&rdquo;
              </div>
            ) : (
              <div className="space-y-1">
                {results.map((result, index) => (
                  <Link
                    key={`${result.type}-${result.id}`}
                    href={result.href}
                    onClick={onClose}
                    className={clsx(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      index === selectedIndex
                        ? "bg-primary-container/10"
                        : "hover:bg-surface-container-low"
                    )}
                  >
                    <div className="flex-shrink-0">{getIcon(result.type)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-on-surface">{result.title}</p>
                      <p className="text-xs text-on-surface-variant">{result.subtitle}</p>
                    </div>
                    <span className="text-xs text-on-surface-variant/60 capitalize">{result.type}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}