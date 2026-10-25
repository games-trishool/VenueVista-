import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
export function CelebrationArch({ size = 240 }: { size?: number }) {
  return (
    <Svg
      width={size}
      height={size * 1.12}
      viewBox="0 0 250 280"
      accessibilityLabel="An original illustration of a celebration arch"
    >
      <Defs>
        <LinearGradient id="arch" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#B6A0E8" />
          <Stop offset="1" stopColor="#6B4E9D" />
        </LinearGradient>
        <LinearGradient id="door" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#3C2A59" />
          <Stop offset="1" stopColor="#20182E" />
        </LinearGradient>
      </Defs>
      <Circle cx="132" cy="130" r="100" fill="#9C80FF" opacity=".055" />
      <Circle cx="132" cy="130" r="82" fill="none" stroke="#A88FC4" strokeWidth=".5" opacity=".3" />
      <Path d="M62 235V120a65 65 0 0 1 130 0v115z" fill="url(#arch)" />
      <Path
        d="M76 235V122a51 51 0 0 1 102 0v113z"
        fill="url(#door)"
        stroke="#CFB6ED"
        strokeWidth="1"
      />
      <Path d="M88 235V124a39 39 0 0 1 78 0v111" fill="none" stroke="#8D6AA9" strokeWidth=".8" />
      <Path d="M127 84v150M87 133h80" stroke="#76578E" strokeWidth=".6" />
      <Circle cx="127" cy="120" r="19" fill="#D8B979" opacity=".9" />
      <Path d="M108 120h38M127 101v38" stroke="#3C2A59" strokeWidth=".9" />
      <Rect x="52" y="235" width="150" height="8" rx="1" fill="#AA90C5" />
      <Rect x="42" y="243" width="170" height="9" rx="1" fill="#76568E" />
      <Rect x="31" y="252" width="192" height="9" rx="1" fill="#4D375E" />
      <Path
        d="M31 232v-49M31 205c-20-13-19-30-12-38 13 8 19 19 12 38M32 217c19-14 20-27 15-34-13 5-20 18-15 34M216 232v-41M216 211c-17-10-17-25-11-32 11 6 16 17 11 32M216 221c16-12 17-23 13-29-11 4-17 15-13 29"
        stroke="#B59C67"
        strokeWidth="1.7"
        fill="#A48C5C"
        fillOpacity=".3"
      />
      <Path
        d="M40 76l3 9 9 3-9 3-3 9-3-9-9-3 9-3zM208 96l2 6 6 2-6 2-2 6-2-6-6-2 6-2zM170 36l2 7 7 2-7 2-2 7-2-7-7-2 7-2z"
        fill="#D8B979"
      />
      <Circle cx="72" cy="42" r="2" fill="#C9B5E6" />
      <Circle cx="212" cy="153" r="2" fill="#C9B5E6" />
      <Circle cx="31" cy="139" r="1.5" fill="#C9B5E6" />
    </Svg>
  );
}
