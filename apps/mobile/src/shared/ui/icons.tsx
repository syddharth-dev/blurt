import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';
import { sizes } from '@/theme';

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
