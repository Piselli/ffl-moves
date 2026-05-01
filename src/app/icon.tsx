import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  const logoBuffer = readFileSync(join(process.cwd(), "public", "logo.png"));
  const logoBase64 = `data:image/png;base64,${logoBuffer.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "50%",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Logo is 235×150 (landscape) — fit within circle with padding */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoBase64} width={54} height={34} alt="" style={{ objectFit: "contain" }} />
      </div>
    ),
    { ...size },
  );
}
