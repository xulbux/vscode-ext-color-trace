// JavaScript test fixture for Color Tracr

const COLORS = {
  ACCENT: 'hsl(281, 100%, 72%)',
  BLUE: '#7075ff',
  BRAND_MAIN: 'goldenrod',
  DARK: 'rgb(20, 20, 20)',
  GREEN: '#40db80',
  LIGHT: 'rgba(240, 240, 240, 0.8)',
  RED: '#ff5a5c',
};

// CSS-in-JS style example
const styledComponentStyles = {
  button: {
    background: 'linear-gradient(45deg, #FE6B8B 30%, #FF8E53 90%)',
    boxShadow: '0 3px 5px 2px rgba(255, 105, 135, .3)',
    color: '#fff',
  },
  container: {
    '--raw-oklch-token': '60% 0.15 25',
    '--tw-bg-opacity': '1',
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e0e0e0',
    color: 'rgba(0, 0, 0, 0.87)',
    padding: '16px',
  },
};

// Swift/Apple mock examples for regex tests
const iOSColors = [
  'UIColor(red: 1.0, green: 0.2, blue: 0.25, alpha: 1.0)',
  'Color(red: 0.5, green: 0.5, blue: 0.6)',
  'UIColor(red: 0.8, green: 0.8, blue: 0.9)',
  'Color(red: 1, green: 0, blue: 0, opacity: 0.5)',
];

export { COLORS, styledComponentStyles, iOSColors };
