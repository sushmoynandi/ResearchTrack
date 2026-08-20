'use client'

import React, { useState } from 'react'
import {
  Calendar,
  Clock,
  MapPin,
  Video,
  FileText,
  Users,
  Layers,
  Sparkles,
  Building,
} from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface ResearchGroupOption {
  id: string
  name: string
  color: string
}

interface ScheduleMeetingModalProps {
  isOpen: boolean
  onClose: () => void
  labId: string
  groups: ResearchGroupOption[]
  onMeetingScheduled: () => void
  initialGroupId?: string
}

export function ScheduleMeetingModal({
  isOpen,
  onClose,
  labId,
  groups,
  onMeetingScheduled,
  initialGroupId,
}: ScheduleMeetingModalProps) {
  const { addToast } = useToast()

  const [scope, setScope] = useState<'labwide' | 'group'>(initialGroupId ? 'group' : 'labwide')
  const [selectedGroupId, setSelectedGroupId] = useState<string>(initialGroupId || (groups[0]?.id ?? ''))
  const [title, setTitle] = useState('')
  const [meetingType, setMeetingType] = useState('LAB_SYNC')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [location, setLocation] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [agenda, setAgenda] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      addToast('error', 'Meeting title is required')
      return
    }
    if (!startTime) {
      addToast('error', 'Meeting start date & time is required')
      return
    }

    setSubmitting(true)

    try {
      const localFormattedTime = new Date(startTime).toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })

      const res = await fetch(`/api/labs/${labId}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          groupId: scope === 'group' ? selectedGroupId : null,
          meetingType: scope === 'group' ? 'SUB_GROUP' : meetingType,
          startTime: new Date(startTime).toISOString(),
          formattedTime: localFormattedTime,
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
          location: location.trim() || undefined,
          meetingUrl: meetingUrl.trim() || undefined,
          agenda: agenda.trim() || undefined,
        }),
      })

      if (res.ok) {
        addToast(
          'success',
          scope === 'group'
            ? 'Sub-group meeting scheduled and notifications dispatched!'
            : 'Lab-wide meeting scheduled and notifications dispatched!'
        )
        onMeetingScheduled()
        onClose()
      } else {
        const err = await res.json()
        addToast('error', err.error || 'Failed to schedule meeting')
      }
    } catch {
      addToast('error', 'Network error scheduling meeting')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Schedule Research Meeting"
      description="Coordinate lab-wide syncs or dedicated sub-group literature & milestone discussions."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {/* Scope Selection: Lab-wide vs Group-wise */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5">
            Meeting Audience &amp; Scope *
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setScope('labwide')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                scope === 'labwide'
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
              }`}
            >
              <Building size={18} className="mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">Lab-Wide Sync</span>
                <span className="text-[11px] opacity-80">All laboratory members</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setScope('group')}
              className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                scope === 'group'
                  ? 'bg-accent/15 border-accent text-accent'
                  : 'bg-bg-tertiary border-border-default text-text-secondary hover:border-border-hover'
              }`}
            >
              <Layers size={18} className="mt-0.5 shrink-0" />
              <div>
                <span className="text-xs font-bold block">Specific Sub-Group</span>
                <span className="text-[11px] opacity-80">Target research cluster</span>
              </div>
            </button>
          </div>
        </div>

        {/* Sub-Group Selector if Scope is Group */}
        {scope === 'group' && (
          <div className="p-3 bg-bg-tertiary rounded-xl border border-border-default space-y-2">
            <label className="block text-xs font-semibold text-text-secondary">
              Select Target Sub-Group *
            </label>
            {groups.length === 0 ? (
              <p className="text-xs text-amber-400">
                No research sub-groups created yet in this lab.
              </p>
            ) : (
              <select
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className="w-full bg-bg-secondary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
                required
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} Cluster
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Title & Meeting Type */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Meeting Title *
            </label>
            <input
              type="text"
              placeholder="e.g. Weekly Literature Synthesis & Progress Sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Meeting Type
            </label>
            <select
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            >
              <option value="LAB_SYNC">🤝 Weekly Progress Sync</option>
              <option value="PAPER_DISCUSSION">📖 Paper Discussion</option>
              <option value="RESEARCH_PRESENTATION">🎤 Research Presentation</option>
              <option value="DEFENSE_PREP">🎓 Thesis / Proposal Defense</option>
            </select>
          </div>
        </div>

        {/* Date & Times */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Start Date &amp; Time *
            </label>
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              End Date &amp; Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Location & Video Link */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <MapPin size={12} className="text-accent" /> Physical Location (Room / Lab Hall)
            </label>
            <input
              type="text"
              placeholder="e.g. Room 402, Gates Building"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
              <Video size={12} className="text-info" /> Meeting Link (Zoom / Google Meet)
            </label>
            <input
              type="url"
              placeholder="e.g. https://meet.google.com/xyz-abcd-efg"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              className="w-full bg-bg-tertiary border border-border-default rounded-lg px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Agenda & Pre-Reading */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1 flex items-center gap-1">
            <FileText size={12} className="text-purple-400" /> Agenda &amp; Discussion Topics
          </label>
          <textarea
            placeholder="1. Review baseline reproduction results&#10;2. Brainstorm ablation setups for next benchmark&#10;3. Distribute reading assignments for upcoming workshop"
            value={agenda}
            onChange={(e) => setAgenda(e.target.value)}
            rows={3}
            className="w-full bg-bg-tertiary border border-border-default rounded-lg p-3 text-xs text-text-primary focus:outline-none focus:border-accent resize-none font-mono"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border-default">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={submitting}
            disabled={scope === 'group' && groups.length === 0}
            icon={<Sparkles size={13} />}
          >
            Confirm &amp; Notify Members
          </Button>
        </div>
      </form>
    </Modal>
  )
}
