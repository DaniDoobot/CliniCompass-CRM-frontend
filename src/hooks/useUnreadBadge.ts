/**
 * Hook que actualiza el título del documento y el favicon
 * con el número de conversaciones con mensajes sin leer.
 */
import { useEffect, useRef } from "react";

const BASE_TITLE = "CRM";

/**
 * Dibuja un badge rojo con número sobre un favicon base.
 * Devuelve un data-URL listo para usar como href del <link rel="icon">.
 */
function drawBadge(count: number): string | null {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  // Fondo del favicon (círculo con gradiente como el primary del CRM)
  const grad = ctx.createLinearGradient(0, 0, 64, 64);
  grad.addColorStop(0, "#6366f1");
  grad.addColorStop(1, "#8b5cf6");
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  // Letra "C" blanca centrada
  ctx.fillStyle = "#fff";
  ctx.font = "bold 32px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("C", 32, 34);

  if (count > 0) {
    // Badge rojo arriba-derecha
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

    // Número
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${count > 9 ? 16 : 18}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = count > 99 ? "99+" : String(count);
    ctx.fillText(label, bx, by + 1);
  }

  return canvas.toDataURL("image/png");
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

export function useUnreadBadge(unreadCount: number) {
  const prevCount = useRef(-1);

  useEffect(() => {
    // Solo actualizar si cambió el conteo
    if (prevCount.current === unreadCount) return;
    prevCount.current = unreadCount;

    // Título
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;

    // Favicon
    const dataUrl = drawBadge(unreadCount);
    if (dataUrl) setFavicon(dataUrl);
  }, [unreadCount]);
}
