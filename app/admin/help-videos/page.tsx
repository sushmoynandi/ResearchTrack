"use client";

import React, { useEffect, useState } from "react";
import {
  MonitorPlay,
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  PlayCircle,
  GripVertical,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import {
  parseYouTubeId,
  youTubeThumbnailUrl,
  youTubeWatchUrl,
} from "@/lib/youtube";

type Audience = "ALL" | "STUDENT" | "SUPERVISOR";

interface HelpVideo {
  id: string;
  title: string;
  description: string | null;
  youtubeUrl: string;
  videoId: string;
  audience: Audience;
  sortOrder: number;
  isPublished: boolean;
  createdAt: string;
}

const audienceOptions = [
  { value: "ALL", label: "Everyone (students + supervisors)" },
  { value: "STUDENT", label: "Students only" },
  { value: "SUPERVISOR", label: "Supervisors only" },
];

const audienceLabel: Record<Audience, string> = {
  ALL: "Everyone",
  STUDENT: "Students",
  SUPERVISOR: "Supervisors",
};

const emptyForm = {
  title: "",
  description: "",
  youtubeUrl: "",
  audience: "ALL" as Audience,
  sortOrder: 0,
  isPublished: true,
};

export default function AdminHelpVideosPage() {
  const { addToast } = useToast();
  const [videos, setVideos] = useState<HelpVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HelpVideo | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<HelpVideo | null>(null);

  const previewId = parseYouTubeId(form.youtubeUrl);
  const linkTouched = form.youtubeUrl.trim().length > 0;

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/help-videos");
      if (res.ok) {
        const data = await res.json();
        setVideos(data.videos || []);
      } else {
        addToast("error", "Could not load the videos");
      }
    } catch {
      addToast("error", "Network error loading the videos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, sortOrder: videos.length });
    setModalOpen(true);
  };

  const openEdit = (video: HelpVideo) => {
    setEditing(video);
    setForm({
      title: video.title,
      description: video.description || "",
      youtubeUrl: video.youtubeUrl,
      audience: video.audience,
      sortOrder: video.sortOrder,
      isPublished: video.isPublished,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      addToast("error", "Give the video a title");
      return;
    }
    if (!previewId) {
      addToast("error", "Paste a valid YouTube link");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        editing
          ? `/api/admin/help-videos/${editing.id}`
          : "/api/admin/help-videos",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        addToast("error", data.error || "Could not save the video");
        return;
      }
      addToast("success", editing ? "Video updated" : "Video added");
      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      fetchVideos();
    } catch {
      addToast("error", "Network error saving the video");
    } finally {
      setSaving(false);
    }
  };

  const togglePublished = async (video: HelpVideo) => {
    try {
      const res = await fetch(`/api/admin/help-videos/${video.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !video.isPublished }),
      });
      if (!res.ok) {
        addToast("error", "Could not change visibility");
        return;
      }
      addToast(
        "success",
        video.isPublished ? "Video hidden" : "Video is now visible",
      );
      fetchVideos();
    } catch {
      addToast("error", "Network error");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/admin/help-videos/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        addToast("error", "Could not delete the video");
        return;
      }
      addToast("success", "Video deleted");
      setDeleteTarget(null);
      fetchVideos();
    } catch {
      addToast("error", "Network error deleting the video");
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-6 border-border-default/80">
        <div>
          <span className="px-2.5 py-0.5 text-[11px] font-semibold uppercase rounded-md bg-accent-subtle text-accent border border-accent/30 inline-flex items-center gap-1">
            <MonitorPlay size={12} /> Tutorials
          </span>
          <h2 className="text-2xl font-bold text-text-primary font-display tracking-tight mt-1">
            How to Use — Video Library
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
            Upload the walkthrough to YouTube first, then paste its link here.
            Students and supervisors watch it under{" "}
            <strong>How to Use</strong> in their sidebar.
          </p>
        </div>

        <Button onClick={openCreate} icon={<Plus size={16} />}>
          Add video
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} variant="card" height="120px" />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <EmptyState
          icon={<MonitorPlay size={44} />}
          title="No videos yet"
          description="Add your first YouTube walkthrough so students and supervisors know where to start."
          actionLabel="Add video"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-3">
          {videos.map((video) => (
            <div
              key={video.id}
              className="glass-card p-4 border-border-default/80 flex flex-col sm:flex-row gap-4"
            >
              <a
                href={youTubeWatchUrl(video.videoId)}
                target="_blank"
                rel="noopener noreferrer"
                className="relative shrink-0 w-full sm:w-[190px] aspect-video rounded-lg overflow-hidden bg-bg-tertiary group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={youTubeThumbnailUrl(video.videoId)}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <span className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors" />
                <span className="absolute inset-0 flex items-center justify-center text-white">
                  <PlayCircle size={34} strokeWidth={1.5} />
                </span>
              </a>

              <div className="flex-1 min-w-0 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
                    <GripVertical size={12} /> #{video.sortOrder}
                  </span>
                  <h3 className="text-base font-semibold text-text-primary truncate">
                    {video.title}
                  </h3>
                  <Badge variant="outline" size="sm">
                    {audienceLabel[video.audience]}
                  </Badge>
                  <Badge
                    variant={video.isPublished ? "success" : "warning"}
                    size="sm"
                  >
                    {video.isPublished ? "Visible" : "Hidden"}
                  </Badge>
                </div>

                {video.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">
                    {video.description}
                  </p>
                )}

                <a
                  href={video.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-text-tertiary hover:text-accent inline-flex items-center gap-1 w-fit truncate max-w-full"
                >
                  {video.youtubeUrl}{" "}
                  <ExternalLink size={11} className="shrink-0" />
                </a>

                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openEdit(video)}
                    icon={<Pencil size={14} />}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => togglePublished(video)}
                    icon={
                      video.isPublished ? (
                        <EyeOff size={14} />
                      ) : (
                        <Eye size={14} />
                      )
                    }
                  >
                    {video.isPublished ? "Hide" : "Show"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(video)}
                    icon={<Trash2 size={14} />}
                    className="text-danger hover:text-danger"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / edit modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit video" : "Add a YouTube video"}
        description="Paste the link from YouTube — a watch, share or Shorts link all work."
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Adding your first paper"
            required
          />

          <Input
            label="YouTube link"
            value={form.youtubeUrl}
            onChange={(e) => setForm({ ...form, youtubeUrl: e.target.value })}
            placeholder="https://www.youtube.com/watch?v=..."
            error={
              linkTouched && !previewId
                ? "That does not look like a YouTube link"
                : undefined
            }
            helperText={previewId ? `Video id: ${previewId}` : undefined}
            required
          />

          {previewId && (
            <div className="rounded-lg overflow-hidden border border-border-default aspect-video bg-bg-tertiary">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={youTubeThumbnailUrl(previewId)}
                alt="Video preview"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <Textarea
            label="Short description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What this video covers, in one or two lines."
            rows={3}
            maxLength={400}
            showCount
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Who can see it"
              options={audienceOptions}
              value={form.audience}
              onChange={(e) =>
                setForm({ ...form, audience: e.target.value as Audience })
              }
            />
            <Input
              label="Order"
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) })
              }
              helperText="Lower numbers show first"
            />
          </div>

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) =>
                setForm({ ...form, isPublished: e.target.checked })
              }
              className="w-4 h-4 accent-[var(--accent)] cursor-pointer"
            />
            Visible to students and supervisors right away
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              {editing ? "Save changes" : "Add video"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        title="Delete this video?"
        size="sm"
      >
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">{deleteTarget?.title}</strong>{" "}
          will be removed from the How to Use page. The video stays on YouTube.
        </p>
        <div className="flex justify-end gap-3 pt-5">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
