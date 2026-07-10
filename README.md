<span id="top" />

# Color Tracr<a href="https://github.com/xulbux/vscode-ext-color-tracr"><img align="right" width="36" src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/icon.png?raw=true"></a>

### Highly performant, ultra-lightweight color marking extension for the editor.

This VS Code extension provides color marking for various formats, including CSS variables, Tailwind classes, and wide-gamut colors.<br>
It is built to be fast, lightweight, and resource-efficient, featuring **zero runtime dependencies**, so your editor never slows down.

> <br>
> 🎨 To get a better feeling of how the markers look on your code, continue at the <a href="#previews"><strong>previews</strong></a>.
> <br>
> <br>

<br>

### **Enjoying this extension? Have suggestions?**

Please consider leaving a review on the [**Visual Studio Marketplace**](https://marketplace.visualstudio.com/items?itemName=xulbux.color-tracr) or giving a ⭐ on [**GitHub**](https://github.com/xulbux/vscode-ext-color-tracr).

<br>
<br>

<span id="features" />

## Features 📋

<table>
  <thead>
    <tr>
      <th align="left">Feature</th>
      <th align="left">Description</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td align="left"><strong>Standard Colors</strong></td>
      <td align="left">HEX, RGB, HSL, HWB, HSV, CMYK, OKLCH, LCH, OKLAB, LAB</td>
    </tr>
    <tr>
      <td align="left"><strong>Color Spaces</strong></td>
      <td align="left"><code>color(display-p3 …)</code>, <code>color(srgb-linear …)</code>, <code>a98-rgb</code>, <code>rec2020</code>, <code>xyz</code>, etc.</td>
    </tr>
    <tr>
      <td align="left"><strong>Apple / Swift</strong></td>
      <td align="left"><code>UIColor(red: …)</code>, <code>Color(red: …)</code></td>
    </tr>
    <tr>
      <td align="left"><strong>Raw Number Matching</strong></td>
      <td align="left">Detects raw CSS channels (e.g., <code>255, 0, 0</code> or <code>60% 0.15 25</code>) to support opacity modifiers in frameworks like Tailwind CSS.</td>
    </tr>
    <tr>
      <td align="left"><strong>Named Colors</strong></td>
      <td align="left">Standard CSS color keywords (e.g., <code>red</code>, <code>transparent</code>, …)</td>
    </tr>
    <tr>
      <td align="left"><strong>Tailwind CSS</strong></td>
      <td align="left">Classes like <code>bg-red-500</code>, <code>text-blue-200/50</code>, <code>border-slate-900</code>, …</td>
    </tr>
    <tr>
      <td align="left"><strong>Variable Tracing</strong></td>
      <td align="left">Cross-file detection and marking of CSS variables (e.g., <code>var(--primary-color)</code>)</td>
    </tr>
  </tbody>
</table>

<br>
<br>

<span id="previews" />

## Extension Previews ✨

### CSS

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/css.png?raw=true" alt="CSS | Color Markers"></a>

### TypeScript

<a href="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts.png"><img src="https://github.com/xulbux/vscode-ext-color-tracr/blob/main/assets/preview/ts.png?raw=true" alt="TypeScript | Color Markers"></a>

<br>
<br>

## Acknowledgments 🤝

This extension was heavily inspired by the excellent [color-highlight](https://github.com/iamsergii/vscode-ext-color-highlight) extension by [Sergii Naumov](https://github.com/iamsergii).<br>
`Color Tracr` aims to build upon that concept with modern web format support and a high-performance, zero-dependency architecture.

<br>
<br>

---

✨ Always creating more cool stuff for you! ✨ —⠀[**XulbuX**](https://github.com/xulbux)
