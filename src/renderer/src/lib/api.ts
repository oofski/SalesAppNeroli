// Typed accessor for the preload bridge. Importing from here (rather than touching
// window.neroli directly) keeps call sites tidy and the dependency explicit.
export const api = window.neroli
