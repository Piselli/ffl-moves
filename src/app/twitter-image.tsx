import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const alt = "FORM8 — Premier League fantasy on Solana";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  const logoBuffer = readFileSync(join(process.cwd(), "public", "brand", "form8-mark.png"));
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(180deg, #1a1816 0%, #0D0F12 55%, #0a0b0d 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoBase64}
          width={96}
          height={130}
          alt=""
          style={{ objectFit: "contain" }}
        />
        <div
          style={{
            marginTop: 28,
            fontSize: 72,
            fontWeight: 800,
            letterSpacing: "-0.04em",
            textTransform: "lowercase",
          }}
        >
          form8
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 28,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          Premier League fantasy on Solana
        </div>
      </div>
    ),
    { ...size },
  );
}
