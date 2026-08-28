import Tesseract from "tesseract.js";

export async function recognizeImage(file, onProgress) {
  const { data } = await Tesseract.recognize(file, "eng", {
    logger: (m) => {
      if (m.status === "recognizing text" && typeof m.progress === "number") {
        onProgress?.(Math.round(m.progress * 100));
      }
    },
  });
  return (data.text || "").trim();
}
