import { PaperForm } from '@/components/papers/PaperForm'

export default function NewPaperPage() {
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <p className="text-text-secondary text-sm">
          Fill in the details below to add a new paper to your library.
        </p>
      </div>
      <div className="glass-card p-6 md:p-8">
        <PaperForm mode="create" />
      </div>
    </div>
  )
}
