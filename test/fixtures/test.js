// JavaScript test fixture for Color Trace

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
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e0e0e0',
    color: 'rgba(0, 0, 0, 0.87)',
    padding: '16px',
  },
};

export { COLORS, styledComponentStyles };
