export function getCurrentFormattedDate(): string {
  const date = new Date()
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
  }

  return date.toLocaleDateString("en-US", options)
}
