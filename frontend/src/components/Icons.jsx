import React from "react";

function baseProps({ className = "", ...rest } = {}) {
  return {
    className: `inline-block align-[-0.125em] ${className}`.trim(),
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    "aria-hidden": true,
    focusable: false,
    ...rest,
  };
}

export function IconSparkles(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 2l1.2 3.6L17 7l-3.8 1.4L12 12l-1.2-3.6L7 7l3.8-1.4L12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M5 12l.9 2.7L9 16l-3.1 1.3L5 20l-.9-2.7L1 16l3.1-1.3L5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M19 13l.8 2.2L22 16l-2.2.8L19 19l-.8-2.2L16 16l2.2-.8L19 13Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconRefresh(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M21 12a9 9 0 0 1-15.4 6.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 12a9 9 0 0 1 15.4-6.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 18v-3h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 6v3h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconTrash(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 11v7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M14 11v7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconEdit(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 20h9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconShield(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 2l8 4v7c0 5-3.4 9.4-8 9.9C7.4 22.4 4 18 4 13V6l8-4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 12l2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLightbulb(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M9 18h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10 22h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 10a4 4 0 1 1 8 0c0 1.6-.8 2.7-1.8 3.7-.7.7-1.2 1.5-1.2 2.3v.5H11v-.5c0-.8-.5-1.6-1.2-2.3C8.8 12.7 8 11.6 8 10Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconDocument(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M7 3h7l3 3v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M14 3v4h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 12h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 16h8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBox(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M21 8l-9 5-9-5 9-5 9 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 8v10l9 5 9-5V8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 13v10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconWarning(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 3l10 18H2L12 3Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 9v5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconLocation(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 22s7-4.4 7-11a7 7 0 1 0-14 0c0 6.6 7 11 7 11Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLeaf(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M20 4c-6 0-10.5 2.6-13.3 6.2C4 13.6 4 17 4 20c3 0 6.4 0 9.8-2.7C17.4 14.5 20 10 20 4Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M20 4s-6 1-11 6-5 10-5 10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconGlobe(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M2 12h20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 2c3 3 4.5 6.5 4.5 10S15 19 12 22c-3-3-4.5-6.5-4.5-10S9 5 12 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconCalendar(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M7 3v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 3v3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8 11h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13 11h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M8 15h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M13 15h3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconBolt(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M13 2L3 14h7l-1 8 10-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChartLine(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M4 19V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 15l4-4 3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18 8v3h-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconChartBar(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M4 19V5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M7 19v-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 19v-10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M17 19v-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconTarget(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 22a10 10 0 1 0-9.2-6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 18a6 6 0 1 0-5.5-3"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M12 14a2 2 0 1 0-2-2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M22 2l-8 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M18 2h4v4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconMap(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M9 20l-6 2V6l6-2 6 2 6-2v16l-6 2-6-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 4v16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M15 6v16"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconPuzzle(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M13 3h-2a2 2 0 0 0-2 2v1H8a2 2 0 0 0-2 2v1H5a2 2 0 0 0-2 2v2h1a2 2 0 1 1 4 0H7v2a2 2 0 0 0 2 2h1v1a2 2 0 0 0 2 2h2v-1a2 2 0 1 1 4 0v1h1a2 2 0 0 0 2-2v-2h-1a2 2 0 1 1 0-4h1V9a2 2 0 0 0-2-2h-2V6a2 2 0 0 0-2-2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconSave(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8l4 4v12a2 2 0 0 1-2 2Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 21v-6h6v6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M9 3v4h6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconFlame(props) {
  return (
    <svg {...baseProps({ ...props })}>
      <path
        d="M12 22c4 0 7-3 7-7 0-3-2-5-3-6 0 2-1 3-3 4 0-3-2-6-5-8 0 4-2 6-3 8-1 1-2 3-2 5 0 4 3 7 9 7Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}
