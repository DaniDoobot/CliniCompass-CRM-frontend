/**
 * Hook que actualiza el título del documento y el favicon
 * con el número de conversaciones con mensajes sin leer.
 */
import { useEffect, useRef } from "react";

const BASE_TITLE = "CRM";

let faviconImage: HTMLImageElement | null = null;

function loadFavicon(callback: () => void) {
  if (faviconImage) {
    callback();
    return;
  }
  const img = new Image();
  img.src = "/favicon.png";
  img.onload = () => {
    faviconImage = img;
    callback();
  };
}

function setFavicon(dataUrl: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/png";
  link.href = dataUrl;
}

function updateFaviconWithBadge(count: number) {
  loadFavicon(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx || !faviconImage) return;

    ctx.clearRect(0, 0, 64, 64);
    ctx.drawImage(faviconImage, 0, 0, 64, 64);

    if (count > 0) {
      const badgeRadius = count > 9 ? 18 : 14;
      const bx = 64 - badgeRadius;
      const by = badgeRadius;

      ctx.beginPath();
      ctx.arc(bx, by, badgeRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#ef4444";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.font = `bold ${count > 9 ? 16 : 18}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const label = count > 99 ? "99+" : String(count);
      ctx.fillText(label, bx, by + 1);
    }

    setFavicon(canvas.toDataURL("image/png"));
  });
}

export function useUnreadBadge(unreadCount: number) {
  const prevCount = useRef(-1);

  useEffect(() => {
    // Solo actualizar si cambió el conteo
    if (prevCount.current === unreadCount) return;
    prevCount.current = unreadCount;

    // Título
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;

    // Favicon
    updateFaviconWithBadge(unreadCount);
  }, [unreadCount]);
}
