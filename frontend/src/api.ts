export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body && !(options.body instanceof FormData))
    headers.set("Content-Type", "application/json");
  const token = sessionStorage.getItem("lexforum-token");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`/api${path}`, { ...options, headers });
  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: "The server could not complete this request." }));
    throw new Error(
      typeof body.detail === "string"
        ? body.detail
        : body.detail?.map((d: { msg: string }) => d.msg).join("; ") ||
            "Request failed.",
    );
  }
  return response.json();
}
export async function downloadReport(id: string, format: string) {
  const token = sessionStorage.getItem("lexforum-token");
  const response = await fetch(`/api/runs/${id}/export?format=${format}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("The report could not be downloaded.");
  const url = URL.createObjectURL(await response.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = `lexforum-${id.slice(0, 8)}.${format === "json" ? "json" : "md"}`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
