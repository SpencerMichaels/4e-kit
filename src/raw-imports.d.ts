// Vite and Vitest load `?raw` imports as the file's text (used by tests).
declare module '*?raw' {
  const text: string
  export default text
}
