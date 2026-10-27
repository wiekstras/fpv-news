export const DIFFICULTIES = [
  { label: 'Beginner', value: 'beginner' },
  { label: 'Intermediate', value: 'intermediate' },
  { label: 'Advanced', value: 'advanced' },
]

export const FRAME_SIZES = ['whoop', '2"', '2.5"', '3"', '3.5"', '4"', '5"', '6"', '7"', '8"+'].map((v) => ({
  label: v === 'whoop' ? 'Whoop (65–75mm)' : v,
  value: v,
}))

export const optionLabel = (options: { label: string; value: string }[], value?: string | null) =>
  options.find((o) => o.value === value)?.label ?? value ?? ''
