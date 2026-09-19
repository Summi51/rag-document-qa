import { createRequire } from "module";
import { pathToFileURL } from "url";
import "./pdfPolyfill.js";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Text-only extraction. Avoids pdf-parse canvas APIs that crash on Vercel.

const require = createRequire(import.meta.url);
const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;
}

const canvasFactory = {
  create(width, height) {
    return {
      canvas: { width, height },
      context: {
        fillRect() {},
        clearRect() {},
        drawImage() {},
        getImageData() {
          return { data: new Uint8ClampedArray(Math.max(width, 1) * Math.max(height, 1) * 4) };
        },
      },
    };
  },
  reset() {},
  destroy() {},
};

const extractPdfText = async (buffer) => {
  // Copy into a real Uint8Array. Node Buffer is a Uint8Array subclass,
  // and pdfjs rejects Buffer with this exact error.
  const data = new Uint8Array(buffer);

  const loadingTask = pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
    disableFontFace: true,
    verbosity: 0,
    canvasFactory,
  });

  const doc = await loadingTask.promise;
  const total = doc.numPages;
  let text = "";
  const pages = [];

  try {
    for (let pageNumber = 1; pageNumber <= total; pageNumber++) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => (item && item.str ? item.str : ""))
        .join(" ")
        .trim();

      // Keep page text (even empty) so pages[i] lines up with page i + 1.
      pages.push(pageText);

      if (pageText) {
        text += `${pageText}\n`;
      }
    }
  } finally {
    await doc.destroy();
  }

  return {
    text: text.trim(),
    pages,
    total,
  };
};

export default extractPdfText;
