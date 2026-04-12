import "@testing-library/jest-dom/vitest";

// jsdom doesn't provide ResizeObserver by default (used by charts / responsive layouts).
if (!globalThis.ResizeObserver) {
	globalThis.ResizeObserver = class ResizeObserver {
		observe() {}
		unobserve() {}
		disconnect() {}
	};
}

// jsdom doesn't implement URL.createObjectURL (used for PDF/blob downloads).
if (!globalThis.URL.createObjectURL) {
	globalThis.URL.createObjectURL = () => "blob:mock";
}

if (!globalThis.URL.revokeObjectURL) {
	globalThis.URL.revokeObjectURL = () => {};
}
