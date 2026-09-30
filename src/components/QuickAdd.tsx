import { useState, type FormEvent } from 'react'
import { Icon } from './Icon'

export function QuickAdd({ placeholder, buttonLabel = 'Add', onAdd, autoFocus = false }: { placeholder: string; buttonLabel?: string; onAdd: (title: string) => void; autoFocus?: boolean }) {
  const [value, setValue] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    const clean = value.trim()
    if (!clean) return
    onAdd(clean)
    setValue('')
  }
  return <form className="quick-add" onSubmit={submit}>
    <input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} enterKeyHint="done" />
    <button className="button primary" type="submit"><Icon name="plus" />{buttonLabel}</button>
  </form>
}
