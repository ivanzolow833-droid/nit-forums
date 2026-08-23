export const SIGNATURE_IMAGE_URL_MAX_LENGTH = 1_000;

const SUPPORTED_IMAGE_PATH = /\.(?:png|jpe?g|webp|gif)$/i;

export function getSignatureImageUrlError(value: string): string | null {
  const imageUrl = value.trim();
  if (!imageUrl) return null;
  if (imageUrl.length > SIGNATURE_IMAGE_URL_MAX_LENGTH) {
    return `Ссылка на изображение не должна превышать ${SIGNATURE_IMAGE_URL_MAX_LENGTH} символов.`;
  }

  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return "Укажите корректную прямую HTTPS-ссылку на изображение.";
  }

  if (parsed.protocol !== "https:") return "Разрешены только безопасные HTTPS-ссылки на изображения.";
  if (!parsed.hostname || parsed.username || parsed.password) return "Укажите корректную прямую HTTPS-ссылку на изображение.";
  if (!SUPPORTED_IMAGE_PATH.test(parsed.pathname)) return "Укажите прямую ссылку на изображение, а не страницу сайта.";
  return null;
}
