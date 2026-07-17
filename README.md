<span id="top" />

<div align="center">
<br><br>
<h1>
<a href="https://github.com/xulbux/vscode-ext-color-tracr"><img height="64" src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/icon.png?raw=true"></a>
<br>
Color Tracr
<br><br>
<a href="https://open-vsx.org/extension/xulbux/color-tracr"><img src="https://img.shields.io/open-vsx/v/xulbux/color-tracr?style=flat&labelColor=404560&color=7075FF"/></a> <a href="https://open-vsx.org/extension/xulbux/color-tracr"><img src="https://img.shields.io/open-vsx/dt/xulbux/color-tracr?style=flat&labelColor=404560&color=7075FF"/></a> <a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/LICENSE"><img src="https://img.shields.io/github/license/xulbux/vscode-ext-color-tracr?style=flat&labelColor=405055&color=70E0FF"/></a> <a href="https://github.com/xulbux/vscode-ext-color-tracr/commits"><img src="https://img.shields.io/github/last-commit/xulbux/vscode-ext-color-tracr?style=flat&labelColor=55404A&color=FF608A"/></a> <a href="https://github.com/xulbux/vscode-ext-color-tracr/issues"><img src="https://img.shields.io/github/issues/xulbux/vscode-ext-color-tracr?style=flat&labelColor=55404A&color=FF608A"/></a> <a href="https://github.com/xulbux/vscode-ext-color-tracr/stargazers"><img src="https://img.shields.io/github/stars/xulbux/vscode-ext-color-tracr?label=★&style=flat&labelColor=604055&color=FF9ECA"/></a>
</h1>
<h3>Highly performant, ultra-lightweight color marking extension for the editor.</h3>
<br><br>
</div>

This VS Code extension provides color marking for various formats, including CSS variables, Tailwind classes, and wide-gamut colors.<br>
It is built to be fast, lightweight, and resource-efficient, featuring **a fully bundled, hyper-optimized architecture**, so your editor never slows down.

> <br>
> 🎨 To get a better feeling of how the markers look on your code, continue at the <a href="#previews"><b>previews</b></a>.
> <br>
> <br>

<br>
<br>

<span id="installation" />

## Installation 📦

Search for **Color Tracr** in the VS Code extensions panel, or install via the command line:

```bash
ext install xulbux.color-tracr
```

<br>

<span id="features" />

## Features ⚡

<table>
  <thead>
    <tr>
      <th align="left">Feature</th>
      <th align="left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="left"><b>Standard Colors</b></td>
      <td align="left">HEX, RGB, HSL, HWB, HSV, CMYK, OKLCH, LCH, OKLAB, LAB</td>
    </tr>
    <tr>
      <td align="left"><b>Color Spaces</b></td>
      <td align="left"><code>color(display-p3 …)</code>, <code>color(srgb-linear …)</code>, <code>a98-rgb</code>, <code>rec2020</code>, <code>xyz</code>, etc.</td>
    </tr>
    <tr>
      <td align="left"><b>Apple / Swift</b></td>
      <td align="left"><code>UIColor(red: …)</code>, <code>Color(red: …)</code></td>
    </tr>
    <tr>
      <td align="left"><b>Raw Number Matching</b></td>
      <td align="left">Detects raw CSS channels (e.g., <code>255, 0, 0</code> or <code>60% 0.15 25</code>) to support opacity modifiers in frameworks like Tailwind CSS.</td>
    </tr>
    <tr>
      <td align="left"><b>Named Colors</b></td>
      <td align="left">Standard CSS color keywords (e.g., <code>red</code>, <code>transparent</code>, …)</td>
    </tr>
    <tr>
      <td align="left"><b>Tailwind CSS</b></td>
      <td align="left">Classes like <code>text-slate-900</code>, <code>border-white/20</code>, <code>bg-rose-500</code>, …</td>
    </tr>
    <tr>
      <td align="left"><b>Variable Tracing</b></td>
      <td align="left">Cross-file detection and marking of CSS variables (e.g., <code>var(--primary-color)</code>)</td>
    </tr>
  </tbody>
</table>

<br>

<span id="configuration" />

## Configuration ⚙️

Color Tracr is highly customizable. You can adjust the following options in your `settings.json` (user or workspace):

| Setting                      | Type      | Default       | Description                                                                    |
| :--------------------------- | :-------: | :-----------: | :----------------------------------------------------------------------------- |
| `colorTracr.enable`          | `array`   | `["*"]`       | Language IDs where Color Tracr marks colors. Prepend `!` to exclude.           |
| `colorTracr.markerType`      | `string`  | `"highlight"` | Choose how colors are marked: `"highlight"`, `"dot-before"`, or `"dot-after"`. |
| `colorTracr.showAlpha`       | `boolean` | `true`        | Render each marker using the color's parsed transparency.                      |
| `colorTracr.markNamedColors` | `boolean` | `true`        | Mark standard CSS named colors (like `red`, `tomato`).                         |
| `colorTracr.markTailwind`    | `array`   | `["*"]`       | Mark Tailwind CSS utility classes (e.g., `bg-red-400`).                        |
| `colorTracr.markVariables`   | `array`   | `["*"]`       | Mark cross-file CSS/SCSS/LESS variables (`var(--name)`).                       |
| `colorTracr.useARGB`         | `array`   | `[]`          | Language IDs to parse 4/8-digit hex codes as ARGB instead of RGBA.             |

(*For advanced settings like matching raw RGB/HSL values without functions, check the extension settings inside VS Code!*)

<br>

<span id="previews" />

## Extension Previews ✨

### CSS

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-dark.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-dark.png?raw=true" alt="CSS | Color Markers"></a>

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-light.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css-light.png?raw=true" alt="CSS | Color Markers"></a>

### TypeScript

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-dark.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-dark.png?raw=true" alt="TypeScript | Color Markers"></a>

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-light.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts-light.png?raw=true" alt="TypeScript | Color Markers"></a>

### React

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-dark.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-dark.png?raw=true" alt="CSS | Color Markers"></a>

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-light.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/tsx-light.png?raw=true" alt="CSS | Color Markers"></a>

<br>
<br>
<br>

## Troubleshooting 🛠️

If Color Tracr isn't marking colors the way you expect (or isn't working at all), check its log output:

1.  Open the **Output** panel (menu **View → Output**, or `Ctrl(⌘)`+`Shift`+`U`).
2.  Select **Color Tracr** from the dropdown in the top-right of the panel. **<span style="color:#97F">\*</span>**

Any errors or warnings (e.g., a Tailwind config that failed to load) are reported there.

> **<span style="color:#97F">\*</span>** If Color Tracr does **not** appear in the dropdown, that means nothing went wrong;<br>
> &nbsp;&nbsp;&nbsp;The channel is only created when there is an error or warning to report.

<br>

## Enjoying this extension? Have suggestions?

Please consider leaving a review on the [**Visual Studio Marketplace**](https://marketplace.visualstudio.com/items?itemName=xulbux.color-tracr) or giving a ⭐ on [**GitHub**](https://github.com/xulbux/vscode-ext-color-tracr).

<br>

## Acknowledgments 🤝

This extension was heavily inspired by the excellent [color-highlight](https://github.com/iamsergii/vscode-ext-color-highlight) extension by [Sergii Naumov](https://github.com/iamsergii).<br>
Color Tracr aims to build upon that concept with modern web format support and a high-performance, minimal-footprint architecture.

<br>
<br>
<br>

---

✨ Always creating more cool stuff for you! ✨ —⠀[**XulbuX**](https://github.com/xulbux)
