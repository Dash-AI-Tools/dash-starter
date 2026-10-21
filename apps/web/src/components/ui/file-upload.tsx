import { useRef, useState, type ReactNode } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * A file input with the selected file shown next to it. The size and type
 * limits are enforced by the browser and by the API validator.
 */
export function FileUpload({
  /** Called with the selected files, or an empty list when they are removed. */
  onFilesChange,
  /** The accepted MIME types or file extensions. */
  accept,
  /** The label of the file input. */
  label,
  /** The hint shown under the label. */
  hint,
  /** The name of the input, used when the form is submitted natively. */
  name,
  /** Rendered instead of the default trigger, for example a card. */
  children,
  className,
}: {
  onFilesChange: (files: File[]) => void
  accept?: string
  label?: ReactNode
  hint?: ReactNode
  name?: string
  children?: ReactNode
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])

  function update(next: File[]) {
    setFiles(next)
    onFilesChange(next)
  }

  return (
    <div data-slot="file-upload" className={cn('flex flex-col gap-2', className)}>
      {label ? <span className="text-sm font-medium">{label}</span> : null}

      {children ?? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="size-4" />
            {files.length ? files[0].name : 'Choose a file'}
          </Button>

          {files.length ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Remove the file"
              onClick={() => update([])}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="sr-only"
        onChange={(event) => update(Array.from(event.target.files ?? []))}
      />

      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  )
}
