const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export const apiUrl = (path: string) =>
  `${apiBaseUrl}/${path.replace(/^\//, "")}`;
