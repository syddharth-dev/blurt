import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { colors, sizes } from '@/theme';

/** Simple line icons on a 24×24 grid. Decorative: label the button, not the icon. */
type IconProps = { color: string; size?: number };

export function MicIcon({ color, size = 36 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={9} y={3} width={6} height={11} rx={3} fill={color} />
      <Path
        d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CloseIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function HeartIcon({ color, size = sizes.iconSmall }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 21s-7.5-4.6-9.5-9.2C1 8.4 3.2 5 6.6 5c2 0 3.6 1.1 4.4 2.6h2C13.8 6.1 15.4 5 17.4 5 20.8 5 23 8.4 21.5 11.8 19.5 16.4 12 21 12 21z"
        fill={color}
      />
    </Svg>
  );
}

export function BulbIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.5 1.1 1.3 1.1 2.2h5c0-.9.4-1.7 1.1-2.2A6 6 0 0 0 12 3z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function SkipIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 5l9 7-9 7V5z" fill={color} />
      <Path d="M18 5v14" stroke={color} strokeWidth={2.5} strokeLinecap="round" />
    </Svg>
  );
}

export function SpeakerIcon({ color, size = sizes.iconSmall }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 9h4l5-4v14l-5-4H4V9z" fill={color} />
      <Path
        d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AtomIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={2} fill={color} />
      <Ellipse cx={12} cy={12} rx={10} ry={4} stroke={color} strokeWidth={1.6} />
      <Ellipse
        cx={12}
        cy={12}
        rx={10}
        ry={4}
        stroke={color}
        strokeWidth={1.6}
        transform="rotate(60 12 12)"
      />
      <Ellipse
        cx={12}
        cy={12}
        rx={10}
        ry={4}
        stroke={color}
        strokeWidth={1.6}
        transform="rotate(-60 12 12)"
      />
    </Svg>
  );
}

export function KeyboardIcon({ color, size = sizes.iconSmall }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={2} y={6} width={20} height={12} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function FlameIcon({ size = sizes.iconSmall }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-5 3-6 0 2 1 3 2 3 0-3-1-6 1-9z"
        fill={colors.coral}
      />
      <Path
        d="M12 12c1 2 3 3 3 5a3 3 0 0 1-6 0c0-1 1-2 1.5-2.5.5 1 1 1.5 1.5 1.5 0-1.5-.5-2.5 0-4z"
        fill={colors.sunny}
      />
    </Svg>
  );
}

export function GemIcon({ size = sizes.iconSmall }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 3h12l4 6-10 12L2 9z" fill={colors.mint} />
      <Path
        d="M2 9h20M12 21L8 9l4-6 4 6z"
        fill="none"
        stroke={colors.night}
        strokeOpacity={0.35}
        strokeWidth={1.4}
      />
    </Svg>
  );
}

export function ClockIcon({ color, size = 12 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={13} r={8} stroke={color} strokeWidth={3} />
      <Path d="M12 9v4l2 2M9 2h6" stroke={color} strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

export function PersonIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4} stroke={color} strokeWidth={2} />
      <Path d="M4 21a8 8 0 0 1 16 0" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function PlayIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 4l13 8-13 8z" fill={color} />
    </Svg>
  );
}

export function DecksIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={5} width={13} height={16} rx={3} stroke={color} strokeWidth={2} />
      <Path d="M8 3h10a3 3 0 0 1 3 3v12" stroke={color} strokeWidth={2} strokeLinejoin="round" />
    </Svg>
  );
}

export function TrophyIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function LockIcon({ color, size = 40 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={10} rx={2} stroke={color} strokeWidth={2} />
      <Path d="M8 11V7a4 4 0 0 1 8 0v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

/** Subject icons for topic cards and the daily card's fanned mini cards. */
export function CellIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx={12} cy={12} rx={10} ry={8} stroke={color} strokeWidth={2} />
      <Circle cx={13} cy={11} r={3} fill={color} />
      <Ellipse cx={7} cy={14} rx={2} ry={1.2} fill={color} />
      <Circle cx={17} cy={15} r={1} fill={color} />
    </Svg>
  );
}

export function FlaskIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3M7.5 15h9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function ForcesIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={8} y={9} width={8} height={6} rx={1.5} stroke={color} strokeWidth={2.2} />
      <Path
        d="M2 12h5M5 10l2 2-2 2M17 12h5M20 10l2 2-2 2"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function PlanetIcon({ color, size = sizes.icon }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={6} stroke={color} strokeWidth={2} />
      <Ellipse
        cx={12}
        cy={12}
        rx={11}
        ry={3.5}
        stroke={color}
        strokeWidth={2}
        transform="rotate(-20 12 12)"
      />
    </Svg>
  );
}
