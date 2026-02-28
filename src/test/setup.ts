import "@testing-library/jest-dom/vitest";

class ResizeObserverMock {
  observe() {}

  unobserve() {}

  disconnect() {}
}

if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = ResizeObserverMock as unknown as typeof ResizeObserver;
}

if (!globalThis.DOMRectReadOnly) {
  globalThis.DOMRectReadOnly = class DOMRectReadOnlyMock {
    static fromRect({ x = 0, y = 0, width = 0, height = 0 } = {}) {
      return new DOMRectReadOnlyMock(x, y, width, height);
    }

    readonly x: number;

    readonly y: number;

    readonly width: number;

    readonly height: number;

    readonly top: number;

    readonly right: number;

    readonly bottom: number;

    readonly left: number;

    constructor(x = 0, y = 0, width = 0, height = 0) {
      this.x = x;
      this.y = y;
      this.width = width;
      this.height = height;
      this.top = y;
      this.right = x + width;
      this.bottom = y + height;
      this.left = x;
    }

    toJSON() {
      return {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        top: this.top,
        right: this.right,
        bottom: this.bottom,
        left: this.left
      };
    }
  } as unknown as typeof DOMRectReadOnly;
}

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
  configurable: true,
  value: 1024
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
  configurable: true,
  value: 768
});

Object.defineProperty(HTMLElement.prototype, "clientWidth", {
  configurable: true,
  value: 1024
});

Object.defineProperty(HTMLElement.prototype, "clientHeight", {
  configurable: true,
  value: 768
});

if (!HTMLElement.prototype.getBoundingClientRect) {
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
      top: 0,
      right: 1024,
      bottom: 768,
      left: 0,
      toJSON() {
        return {};
      }
    };
  };
}

if (!SVGElement.prototype.getBBox) {
  SVGElement.prototype.getBBox = function getBBox() {
    return {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
  };
}
