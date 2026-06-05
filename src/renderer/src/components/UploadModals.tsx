import { useState } from 'react'
import { Upload } from 'lucide-react'
import { LOCATIONS } from '@shared/locations'
import { useAuth } from '../store/auth'
import { useUpload } from '../store/upload'
import { Modal } from './Modal'
import { Button } from './Button'

const TYPE_TITLE: Record<string, string> = {
  metrics: 'Which location is this report for?',
  service: 'Which location does this report cover?'
}

// Rendered once at the app root; reacts to the upload store's pending state.
export function UploadModals(): JSX.Element {
  const { pending, goalsPrompt, chooseLocation, cancel, promptGoalsUpload, dismissGoalsPrompt } = useUpload()
  const allowed = useAuth((s) => s.user?.locations ?? [])
  const [selected, setSelected] = useState<string | null>(null)

  const options = LOCATIONS.filter((l) => allowed.includes(l.id))

  return (
    <>
      <Modal
        open={!!pending}
        onClose={cancel}
        title={pending ? TYPE_TITLE[pending.type] : ''}
        footer={
          <>
            <Button variant="secondary" onClick={cancel}>
              Cancel
            </Button>
            <Button
              disabled={!selected}
              onClick={() => {
                if (selected) {
                  chooseLocation(selected)
                  setSelected(null)
                }
              }}
            >
              Continue
            </Button>
          </>
        }
      >
        <p className="mb-4 text-body text-text-secondary">
          The file you selected doesn’t embed a location we can scope to, so tag it here. Your view is
          limited to the locations you manage.
        </p>
        <div className="space-y-2">
          {options.map((loc) => (
            <label
              key={loc.id}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                selected === loc.id ? 'border-brand-mid bg-brand-light' : 'border-brand-stone hover:bg-surface-gray'
              }`}
            >
              <input
                type="radio"
                name="upload-location"
                checked={selected === loc.id}
                onChange={() => setSelected(loc.id)}
                className="accent-brand-dark"
              />
              <span className="text-body font-medium text-text-primary">{loc.name}</span>
              {!loc.hasSpa && <span className="text-body-sm text-text-secondary">· Hair & nails only</span>}
            </label>
          ))}
        </div>
      </Modal>

      <Modal
        open={!!goalsPrompt}
        onClose={dismissGoalsPrompt}
        title="Do you have a goals sheet for this period?"
        footer={
          <>
            <Button variant="secondary" onClick={dismissGoalsPrompt}>
              Skip
            </Button>
            <Button icon={<Upload size={16} />} onClick={promptGoalsUpload}>
              Upload goals sheet
            </Button>
          </>
        }
      >
        <p className="text-body text-text-secondary">
          If you previously exported a goals sheet for this location, upload it now to turn on the
          actual-vs-goal comparison across the coaching view. Employees are matched by Employee Code —
          new hires without a goal row are shown without a comparison. This step is optional.
        </p>
      </Modal>
    </>
  )
}
