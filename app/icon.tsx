import { ImageResponse } from "next/og";

export const size = {
  width: 512,
  height: 512
};

export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(180deg, rgba(18,36,58,1) 0%, rgba(53,107,76,1) 100%)",
          color: "white",
          fontSize: 170,
          fontWeight: 700,
          letterSpacing: -12
        }}
      >
        Fy
      </div>
    ),
    size
  );
}

