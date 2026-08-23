"use client";

/* eslint-disable @next/next/no-img-element */

import { ImageOff } from "lucide-react";
import { useState } from "react";

export function SignatureImage({ src, alt, errorText = "Изображение подписи не загрузилось" }: { src: string; alt: string; errorText?: string }) {
  return <SignatureImageLoader key={src} src={src} alt={alt} errorText={errorText} />;
}

function SignatureImageLoader({ src, alt, errorText }: { src: string; alt: string; errorText: string }) {
  const [state, setState] = useState<"loading" | "loaded" | "error">("loading");

  return (
    <div className="signature-image-shell">
      {state !== "loaded" ? (
        <div className={state === "error" ? "signature-image-placeholder error" : "signature-image-placeholder"} role="status">
          <ImageOff />
          <span>{state === "error" ? errorText : "Загрузка изображения…"}</span>
        </div>
      ) : null}
      <img
        className={state === "loaded" ? "" : "signature-image-hidden"}
        src={src}
        alt={alt}
        onLoad={() => setState("loaded")}
        onError={() => setState("error")}
      />
    </div>
  );
}
