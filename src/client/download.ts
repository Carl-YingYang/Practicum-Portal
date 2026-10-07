export async function downloadFile(url: string, fallback: string) {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });
  if (!response.ok) {
    let message = "Download failed. Retry after saving.";
    try {
      message = (await response.json()).error ?? message;
    } catch {}
    throw Error(message);
  }
  const match = response.headers
    .get("content-disposition")
    ?.match(/filename\*=UTF-8''([^;]+)/i);
  const name = match ? decodeURIComponent(match[1]) : fallback;
  const href = URL.createObjectURL(await response.blob()),
    anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(href), 1000);
}
