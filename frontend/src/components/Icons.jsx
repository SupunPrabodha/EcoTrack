import React from "react";

function Icon({ children, width = 20, height = 20, className = "", ...props }) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 ${className}`}
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconRefresh({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M20 12a8 8 0 1 1-2.34-5.66"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M20 4v6h-6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconWarning({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M12 9v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 17h.01"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10.29 3.86a2 2 0 0 1 3.42 0l8.02 13.86A2 2 0 0 1 20 21H4a2 2 0 0 1-1.73-3.28L10.29 3.86Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconTrash({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M4 7h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M14 11v6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M6 7l1 14h10l1-14"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M9 7V4h6v3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconSave({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M4 7a2 2 0 0 1 2-2h10l4 4v11a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 5v6h8V5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M8 22v-7h8v7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconBox({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M21 8l-9 5-9-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M3 8v8l9 5 9-5V8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 13v8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 3l9 5-9 5-9-5 9-5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  );
}

export function IconLightbulb({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M9 18h6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M10 22h4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 15.5C7.2 14.4 6 12.8 6 10.5a6 6 0 1 1 12 0c0 2.3-1.2 3.9-2.5 5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Icon>
  );
}

export function IconSparkles({ width = 20, height = 20, className = "", ...props }) {
  return (
    <Icon width={width} height={height} className={className} {...props}>
      <path
        d="M12 2l1.2 4.2L17.4 8 13.2 9.2 12 13.4 10.8 9.2 6.6 8l4.2-1.8L12 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M19 11l.7 2.4L22 14l-2.3.6L19 17l-.7-2.4L16 14l2.3-.6L19 11Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M5 13l.7 2.4L8 16l-2.3.6L5 19l-.7-2.4L2 16l2.3-.6L5 13Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Icon>
  );
}
