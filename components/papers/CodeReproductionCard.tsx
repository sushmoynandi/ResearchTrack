'use client'

import React, { useState } from 'react'
import {
  GitBranch,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Sparkles,
  ExternalLink,
  Edit,
  Save,
  X,
  FileCode,
  HardDrive,
  Copy,
  Check,
  Zap,
  Layers,
  Terminal,
  Trophy,
  RefreshCw,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import { useAuth } from '@/components/auth/AuthProvider'
import { useToast } from '@/components/ui/Toast'
import { GithubIcon, HuggingFaceIcon } from '@/components/ui/Icons'
import type { Paper, ReplicationStatus } from '@/lib/types'
import { REPLICATION_LABELS, REPLICATION_COLORS } from '@/lib/types'

interface CodeReproductionCardProps {
  paper: Paper
  onRefresh?: () => void
  canEdit?: boolean
}

const CHECKLIST_ITEMS = [
  { key: 'environmentTested', label: 'Environment & Dependencies Configured', desc: 'Python, PyTorch, CUDA environment builds without conflicts' },
  { key: 'weightsDownloaded', label: 'Pretrained Checkpoint Weights Verified', desc: 'Official model weights or checkpoint files downloaded and accessible' },
  { key: 'inferenceVerified', label: 'Sample Inference / Forward Pass Ran', desc: 'Demo script executed and generated valid predictions/outputs' },
  { key: 'fullEvalRun', label: 'Baseline Evaluation Dataset Tested', desc: 'Official evaluation benchmark script completed successfully' },
  { key: 'ablationVerified', label: 'Ablation Replicated (±2% Metric Delta)', desc: 'Reported scores verified within reasonable margin of error' },
]

export function CodeReproductionCard({
  paper,
  onRefresh,
  canEdit = true,
}: CodeReproductionCardProps) {
  const { user, isSupervisor, isAdmin } = useAuth()
  const { addToast } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)

  // Edit Modal form states
  const [status, setStatus] = useState<ReplicationStatus>(paper.replicationStatus || 'UNTESTED')
  const [codeUrl, setCodeUrl] = useState(paper.codeUrl || '')
  const [modelUrl, setModelUrl] = useState(paper.modelUrl || '')
  const [datasetUrl, setDatasetUrl] = useState(paper.datasetUrl || '')
  const [weightsUrl, setWeightsUrl] = useState(paper.weightsUrl || '')
  const [studentRepoUrl, setStudentRepoUrl] = useState(paper.studentRepoUrl || '')
  const [notebookUrl, setNotebookUrl] = useState(paper.notebookUrl || '')
  const [hardwareSpecs, setHardwareSpecs] = useState(paper.hardwareSpecs || '')
  const [replicationNotes, setReplicationNotes] = useState(paper.replicationNotes || '')

  const initialChecklist = React.useMemo(() => {
    if (paper.replicationChecklist) {
      try {
        return typeof paper.replicationChecklist === 'string'
          ? JSON.parse(paper.replicationChecklist)
          : paper.replicationChecklist
      } catch {
        return {}
      }
    }
    return {}
  }, [paper.replicationChecklist])

  const [checklist, setChecklist] = useState<Record<string, boolean>>(initialChecklist)
  const [saving, setSaving] = useState(false)

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text)
    setCopiedLink(id)
    addToast('success', 'Link copied to clipboard')
    setTimeout(() => setCopiedLink(null), 2000)
  }

  const handleToggleChecklist = async (key: string) => {
    if (!canEdit) return
    const newChecklist = { ...checklist, [key]: !checklist[key] }
    setChecklist(newChecklist)

    try {
      const res = await fetch(`/api/papers/${paper.id}/replication`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replicationChecklist: newChecklist }),
      })
      if (res.ok) {
        addToast('success', 'Checklist updated')
        onRefresh?.()
      }
    } catch {
      addToast('error', 'Failed to save checklist state')
    }
  }

  const handleAutoExtractArtifacts = async () => {
    setExtracting(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}/extract-artifacts`, {
        method: 'POST',
      })
      if (res.ok) {
        const data = await res.json()
        const appliedCount = Object.keys(data.applied || {}).length
        if (appliedCount > 0) {
          addToast('success', `Discovered & linked ${appliedCount} official artifacts!`)
        } else if (data.extracted?.codeUrl || data.extracted?.modelUrl) {
          addToast('info', 'Artifacts found. Review and save them in the editor.')
        } else {
          addToast('info', 'No additional GitHub/HuggingFace links detected in paper text.')
        }
        onRefresh?.()
      } else {
        addToast('error', 'Failed to scan paper for artifacts')
      }
    } catch {
      addToast('error', 'Network error during artifact scan')
    } finally {
      setExtracting(false)
    }
  }

  const handleSaveReport = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/papers/${paper.id}/replication`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replicationStatus: status,
          codeUrl,
          modelUrl,
          datasetUrl,
          weightsUrl,
          studentRepoUrl,
          notebookUrl,
          hardwareSpecs,
          replicationNotes,
          replicationChecklist: checklist,
        }),
      })
      if (res.ok) {
        addToast('success', 'Replication tracker updated successfully!')
        setIsEditModalOpen(false)
        onRefresh?.()
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('paper-status-changed'))
        }
      } else {
        const err = await res.json().catch(() => ({}))
        addToast('error', err.error || 'Failed to save report')
      }
    } catch {
      addToast('error', 'Network error saving reproduction report')
    } finally {
      setSaving(false)
    }
  }

  const completedCount = CHECKLIST_ITEMS.filter((item) => checklist[item.key]).length
  const statusVariant = REPLICATION_COLORS[paper.replicationStatus || 'UNTESTED'] || 'default'

  return (
    <div className="glass-card p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-default pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/15 text-accent flex items-center justify-center font-bold shrink-0">
            <GitBranch size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary font-display">
                Code Reproduction &amp; Artifact Tracker
              </h3>
              <Badge variant={statusVariant as any} size="sm">
                {REPLICATION_LABELS[paper.replicationStatus || 'UNTESTED']}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary mt-0.5">
              Verify code executability, track model checkpoints, datasets, and link student replication notebooks.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="xs"
            variant="ghost"
            onClick={handleAutoExtractArtifacts}
            loading={extracting}
            icon={<Sparkles size={13} className="text-accent" />}
            title="Auto-scan abstract and arXiv for GitHub & HuggingFace links"
          >
            Auto-Detect Artifacts
          </Button>

          {canEdit && (
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setIsEditModalOpen(true)}
              icon={<Edit size={13} />}
            >
              Edit Replication Report
            </Button>
          )}
        </div>
      </div>

      {/* Artifact Links Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Official GitHub */}
        <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <GithubIcon size={15} />
              <span>Official Code</span>
            </div>
            {paper.codeUrl && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400">
                Linked
              </span>
            )}
          </div>
          {paper.codeUrl ? (
            <div className="flex items-center justify-between gap-1.5 pt-1">
              <a
                href={paper.codeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent hover:underline truncate font-mono flex items-center gap-1"
              >
                {paper.codeUrl.replace(/^https?:\/\/(www\.)?github\.com\//i, '')}
                <ExternalLink size={11} className="shrink-0" />
              </a>
              <button
                type="button"
                onClick={() => copyToClipboard(paper.codeUrl!, 'codeUrl')}
                className="text-text-tertiary hover:text-text-primary p-1 cursor-pointer"
                title="Copy repository URL"
              >
                {copiedLink === 'codeUrl' ? <Check size={12} className="text-success" /> : <Copy size={12} />}
              </button>
            </div>
          ) : (
            <span className="text-xs text-text-tertiary italic">No repo attached yet</span>
          )}
        </div>

        {/* Hugging Face Model */}
        <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <HuggingFaceIcon size={15} />
              <span>Hugging Face</span>
            </div>
            {paper.modelUrl && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400">
                Model
              </span>
            )}
          </div>
          {paper.modelUrl ? (
            <a
              href={paper.modelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline truncate font-mono flex items-center gap-1 pt-1"
            >
              {paper.modelUrl.replace(/^https?:\/\/(www\.)?huggingface\.co\//i, '')}
              <ExternalLink size={11} className="shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-text-tertiary italic">No model card linked</span>
          )}
        </div>

        {/* Benchmark Dataset */}
        <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <Database size={15} className="text-cyan-400" />
              <span>Dataset &amp; Benchmarks</span>
            </div>
            {paper.datasetUrl && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400">
                Data
              </span>
            )}
          </div>
          {paper.datasetUrl ? (
            <a
              href={paper.datasetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline truncate font-mono flex items-center gap-1 pt-1"
            >
              {paper.datasetUrl.replace(/^https?:\/\//i, '').slice(0, 24)}...
              <ExternalLink size={11} className="shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-text-tertiary italic">No dataset attached</span>
          )}
        </div>

        {/* Student Replication Notebook */}
        <div className="p-3.5 rounded-2xl bg-bg-secondary border border-border-default flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-semibold text-text-primary">
              <FileCode size={15} className="text-purple-400" />
              <span>Student Notebook</span>
            </div>
            {paper.notebookUrl && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/15 text-purple-400">
                Colab / Jupyter
              </span>
            )}
          </div>
          {paper.notebookUrl ? (
            <a
              href={paper.notebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-purple-300 hover:underline truncate font-mono flex items-center gap-1 pt-1 font-semibold"
            >
              Open Notebook <ExternalLink size={11} className="shrink-0" />
            </a>
          ) : (
            <span className="text-xs text-text-tertiary italic">No student notebook linked</span>
          )}
        </div>
      </div>

      {/* Lab Reproduction Status Checklist & Progress */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-accent" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider font-display">
              Lab Reproduction Checklist ({completedCount}/{CHECKLIST_ITEMS.length} Passed)
            </h4>
          </div>

          {paper.hardwareSpecs && (
            <div className="flex items-center gap-1.5 text-xs text-text-secondary font-mono bg-bg-tertiary px-2.5 py-1 rounded-lg border border-border-default">
              <Cpu size={13} className="text-accent" />
              <span>{paper.hardwareSpecs}</span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-bg-tertiary h-2 rounded-full overflow-hidden border border-border-default">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 via-accent to-emerald-500 transition-all duration-300"
            style={{ width: `${(completedCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>

        {/* Checklist items */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
          {CHECKLIST_ITEMS.map((item) => {
            const isChecked = Boolean(checklist[item.key])
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleToggleChecklist(item.key)}
                disabled={!canEdit}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                  isChecked
                    ? 'bg-emerald-500/10 border-emerald-500/30'
                    : 'bg-bg-secondary border-border-default hover:border-border-hover'
                } ${!canEdit ? 'cursor-default' : ''}`}
              >
                <div
                  className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 border transition-all ${
                    isChecked
                      ? 'bg-emerald-500 border-emerald-400 text-white'
                      : 'bg-bg-tertiary border-border-default text-transparent'
                  }`}
                >
                  <Check size={13} strokeWidth={3} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className={`text-xs font-semibold ${isChecked ? 'text-emerald-300' : 'text-text-primary'}`}>
                    {item.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary leading-snug">{item.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Student Findings & Replication Notes */}
      {paper.replicationNotes && (
        <div className="p-4 rounded-2xl bg-bg-secondary border border-border-default space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider">
            <Terminal size={14} className="text-accent" />
            <span>Student Replication Findings &amp; Metric Delta</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap font-sans">
            {paper.replicationNotes}
          </p>
        </div>
      )}

      {/* ─── Edit Modal ─── */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Code Reproduction Report & Artifacts"
        size="lg"
      >
        <div className="space-y-5 p-1">
          {/* Reproduction Status */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Lab Reproduction Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ReplicationStatus)}
              className="w-full text-xs p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent"
            >
              <option value="UNTESTED">Untested / Initial</option>
              <option value="VERIFIED_RUNNABLE">✅ Verified Runnable (Code Runs &amp; Outputs Results)</option>
              <option value="MISSING_WEIGHTS">⚠️ Missing Model Weights (Code Exists, No Checkpoints)</option>
              <option value="DATASET_UNAVAILABLE">🚫 Dataset Unavailable / Paywalled</option>
              <option value="ABLATION_REPLICATED">🏆 Ablation Replicated (Within ±2% Metric Delta)</option>
              <option value="REPRODUCING">🔄 In Progress (Reproducing in Lab)</option>
              <option value="REPLICATED">✓ Verified Replicated</option>
              <option value="FAILED">❌ Failed / Irreproducible</option>
            </select>
          </div>

          {/* Links Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Official GitHub Repo URL</label>
              <input
                type="url"
                value={codeUrl}
                onChange={(e) => setCodeUrl(e.target.value)}
                placeholder="https://github.com/org/repo"
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Hugging Face Model Card URL</label>
              <input
                type="url"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                placeholder="https://huggingface.co/org/model"
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Dataset URL / Zenodo / Kaggle</label>
              <input
                type="url"
                value={datasetUrl}
                onChange={(e) => setDatasetUrl(e.target.value)}
                placeholder="https://huggingface.co/datasets/... or Zenodo"
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Student Colab / Jupyter Notebook URL</label>
              <input
                type="url"
                value={notebookUrl}
                onChange={(e) => setNotebookUrl(e.target.value)}
                placeholder="https://colab.research.google.com/..."
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Student Fork / Custom Repository</label>
              <input
                type="url"
                value={studentRepoUrl}
                onChange={(e) => setStudentRepoUrl(e.target.value)}
                placeholder="https://github.com/my-lab/paper-fork"
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-text-secondary">Hardware Specs &amp; Compute Budget</label>
              <input
                type="text"
                value={hardwareSpecs}
                onChange={(e) => setHardwareSpecs(e.target.value)}
                placeholder="e.g. 1x RTX 4090 (24GB) · 6 GPU Hours"
                className="w-full text-xs p-2 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent"
              />
            </div>
          </div>

          {/* Replication Findings & Notes */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-text-secondary">
              Replication Findings, Accuracy Delta &amp; Discrepancies
            </label>
            <textarea
              value={replicationNotes}
              onChange={(e) => setReplicationNotes(e.target.value)}
              placeholder="Record any discrepancies between reported paper numbers and your reproduction run (e.g. Paper reported 84.5% accuracy; our run reached 83.9% with batch size 16)..."
              rows={4}
              className="w-full text-xs p-2.5 rounded-xl bg-bg-tertiary border border-border-default text-text-primary outline-none focus:border-accent leading-relaxed"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-default">
            <Button size="sm" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" onClick={handleSaveReport} disabled={saving} loading={saving}>
              Save Reproduction Report
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
