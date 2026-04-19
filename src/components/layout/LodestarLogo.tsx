type Props = {
  size?: number;
  color?: string;
  title?: string;
};

/**
 * Lodestar wordmark icon — a 4-point north-star glyph with an elongated
 * vertical axis. Renders as a single filled path, inherits color from
 * `currentColor` (or accepts an explicit `color` prop).
 */
export function LodestarLogo({ size = 20, color = "currentColor", title = "Lodestar" }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>{title}</title>
      <path
        d="M12 1 L13.2 10.6 Q13.35 11.7 14.4 11.85 L21 12 L14.4 12.15 Q13.35 12.3 13.2 13.4 L12 23 L10.8 13.4 Q10.65 12.3 9.6 12.15 L3 12 L9.6 11.85 Q10.65 11.7 10.8 10.6 Z"
        fill={color}
      />
    </svg>
  );
}
