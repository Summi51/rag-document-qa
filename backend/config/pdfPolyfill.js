// pdf-parse v2 loads pdfjs-dist, which expects browser canvas APIs.
// Vercel Node does not provide DOMMatrix / ImageData / Path2D,
// so the serverless function crashes on import without these stubs.

class DOMMatrixPolyfill {
  constructor() {
    this.a = 1;
    this.b = 0;
    this.c = 0;
    this.d = 1;
    this.e = 0;
    this.f = 0;
    this.m11 = 1;
    this.m12 = 0;
    this.m13 = 0;
    this.m14 = 0;
    this.m21 = 0;
    this.m22 = 1;
    this.m23 = 0;
    this.m24 = 0;
    this.m31 = 0;
    this.m32 = 0;
    this.m33 = 1;
    this.m34 = 0;
    this.m41 = 0;
    this.m42 = 0;
    this.m43 = 0;
    this.m44 = 1;
    this.is2D = true;
    this.isIdentity = true;
  }

  multiply() {
    return new DOMMatrixPolyfill();
  }

  translate() {
    return new DOMMatrixPolyfill();
  }

  scale() {
    return new DOMMatrixPolyfill();
  }

  inverse() {
    return new DOMMatrixPolyfill();
  }

  transformPoint(point) {
    return point || { x: 0, y: 0, z: 0, w: 1 };
  }
}

class ImageDataPolyfill {
  constructor(data, width, height) {
    this.data = data;
    this.width = width;
    this.height = height;
  }
}

class Path2DPolyfill {}

class CanvasStub {
  constructor(width = 0, height = 0) {
    this.width = width;
    this.height = height;
  }

  getContext() {
    return {
      canvas: this,
      fillRect() {},
      clearRect() {},
      drawImage() {},
      getImageData(width = 0, height = 0) {
        return new ImageDataPolyfill([], width, height);
      },
      putImageData() {},
      setTransform() {},
      transform() {},
      save() {},
      restore() {},
      beginPath() {},
      closePath() {},
      clip() {},
      fill() {},
      stroke() {},
      measureText() {
        return { width: 0 };
      },
    };
  }
}

if (typeof globalThis.DOMMatrix === "undefined") {
  globalThis.DOMMatrix = DOMMatrixPolyfill;
}

if (typeof globalThis.ImageData === "undefined") {
  globalThis.ImageData = ImageDataPolyfill;
}

if (typeof globalThis.Path2D === "undefined") {
  globalThis.Path2D = Path2DPolyfill;
}

if (typeof globalThis.OffscreenCanvas === "undefined") {
  globalThis.OffscreenCanvas = CanvasStub;
}

export {};
