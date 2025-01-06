import * as vscode from 'vscode';

let colorPickerPanel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
    console.log('CSS Color Buddy is now active!');

    const openColorWheel = vscode.commands.registerCommand('css-color-buddy.openColorWheel', () => {
        createOrShowColorWheel();
    });

    context.subscriptions.push(openColorWheel);
}

function createOrShowColorWheel() {
    if (colorPickerPanel) {
        colorPickerPanel.reveal(vscode.ViewColumn.Beside);
        return;
    }

    colorPickerPanel = vscode.window.createWebviewPanel(
        'colorWheel',
        'Color Picker',
        vscode.ViewColumn.Beside,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    colorPickerPanel.webview.html = getColorPickerHTML();

    colorPickerPanel.onDidDispose(() => {
        colorPickerPanel = undefined;
    });
}

function getColorPickerHTML(): string {
    const colorPickerScript = `
        const vscode = acquireVsCodeApi();
        const picker = document.getElementById('picker');
        const preview = document.getElementById('preview');
        const value = document.getElementById('value');
        const opacity = document.getElementById('opacity');
        const opacityValue = document.getElementById('opacityValue');
        let currentFormat = 'hex';
        let currentOpacity = 1;

        function hexToRgb(hex) {
            const cleanHex = hex.replace('#', '');
            return {
                r: parseInt(cleanHex.slice(0, 2), 16),
                g: parseInt(cleanHex.slice(2, 4), 16),
                b: parseInt(cleanHex.slice(4, 6), 16)
            };
        }

        function rgbToHsl(r, g, b) {
            r /= 255;
            g /= 255;
            b /= 255;

            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            let h = 0;
            let s = 0;
            let l = (max + min) / 2;

            if (max !== min) {
                const d = max - min;
                s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
                
                switch (max) {
                    case r:
                        h = (g - b) / d + (g < b ? 6 : 0);
                        break;
                    case g:
                        h = (b - r) / d + 2;
                        break;
                    case b:
                        h = (r - g) / d + 4;
                        break;
                }
                h /= 6;
            }

            return {
                h: Math.round(h * 360),
                s: Math.round(s * 100),
                l: Math.round(l * 100)
            };
        }

        function formatColor(color) {
            const ctx = document.createElement('canvas').getContext('2d');
            ctx.fillStyle = color;
            const hex = ctx.fillStyle;
            const hasOpacity = currentOpacity < 1;

            switch(currentFormat) {
                case 'rgb': {
                    const rgb = hexToRgb(hex);
                    return hasOpacity 
                        ? 'rgba(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ', ' + currentOpacity + ')'
                        : 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
                }
                case 'hsl': {
                    const rgb = hexToRgb(hex);
                    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
                    return hasOpacity
                        ? 'hsla(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%, ' + currentOpacity + ')'
                        : 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
                }
                default:
                    if (hasOpacity) {
                        const alpha = Math.round(currentOpacity * 255).toString(16).padStart(2, '0');
                        return hex.toUpperCase() + alpha;
                    }
                    return hex.toUpperCase();
            }
        }

        function updateColor(color) {
            preview.style.backgroundColor = color;
            preview.style.opacity = currentOpacity;
            const formatted = formatColor(color);
            value.textContent = formatted;
        }

        function toggleFormat(format) {
            currentFormat = format;
            updateColor(picker.value);
        }

        function copyColor() {
            const colorText = value.textContent;
            const copyButton = document.getElementById('copyButton');
            
            navigator.clipboard.writeText(colorText).then(() => {
                const originalText = copyButton.textContent;
                copyButton.textContent = 'Copied!';
                copyButton.classList.add('copied');
                
                setTimeout(() => {
                    copyButton.textContent = originalText;
                    copyButton.classList.remove('copied');
                }, 300);
                
                const tooltip = value.querySelector('.copied-tooltip');
                tooltip.classList.add('show');
                setTimeout(() => tooltip.classList.remove('show'), 1500);
            });
        }

        picker.addEventListener('input', (e) => {
            updateColor(e.target.value);
        });

        opacity.addEventListener('input', (e) => {
            currentOpacity = e.target.value / 100;
            opacityValue.textContent = e.target.value + '%';
            updateColor(picker.value);
        });

        updateColor(picker.value);
    `;

    return `
<!DOCTYPE html>
<html>
<head>
    <style>
        body {
            margin: 0;
            padding: 16px;
            background: #1e1e1e;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }
        .color-preview {
            width: 100%;
            height: 60px;
            border-radius: 6px;
            border: 1px solid #333;
            background-image: linear-gradient(45deg, #808080 25%, transparent 25%),
                            linear-gradient(-45deg, #808080 25%, transparent 25%),
                            linear-gradient(45deg, transparent 75%, #808080 75%),
                            linear-gradient(-45deg, transparent 75%, #808080 75%);
            background-size: 20px 20px;
            background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
        }
        .controls {
            display: flex;
            flex-direction: column;
            gap: 12px;
        }
        .picker-container {
            display: flex;
            gap: 12px;
        }
        input[type="color"] {
            width: 100%;
            height: 40px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            background: #2d2d2d;
        }
        .opacity-control {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px;
            background: #2d2d2d;
            border-radius: 4px;
        }
        input[type="range"] {
            flex: 1;
            height: 6px;
            -webkit-appearance: none;
            background: #444;
            border-radius: 3px;
        }
        input[type="range"]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 16px;
            height: 16px;
            background: #fff;
            border-radius: 50%;
            cursor: pointer;
        }
        .color-value {
            font-family: monospace;
            padding: 12px;
            background: #2d2d2d;
            border-radius: 4px;
            text-align: center;
            user-select: all;
            cursor: pointer;
            position: relative;
        }
        .color-value:hover {
            background: #383838;
        }
        .format-toggle {
            display: flex;
            gap: 8px;
        }
        button {
            padding: 8px 16px;
            background: #333;
            border: none;
            border-radius: 4px;
            color: white;
            cursor: pointer;
            font-size: 14px;
        }
        button:hover {
            background: #444;
        }
        .copy-button {
            width: 100%;
            margin-top: 4px;
            background: #2d2d2d;
            border: 1px solid #444;
            transition: background-color 0.2s;
            position: relative;
            overflow: hidden;
        }
        .copy-button:hover {
            background: #383838;
        }
        .copy-button.copied {
            background: #2c533a;
        }
        .copied-tooltip {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            background: #000;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            opacity: 0;
            transition: opacity 0.2s;
        }
        .copied-tooltip.show {
            opacity: 1;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="color-preview" id="preview"></div>
        <div class="controls">
            <div class="picker-container">
                <input type="color" id="picker" value="#ff0000">
            </div>
            <div class="opacity-control">
                <span>Opacity:</span>
                <input type="range" id="opacity" min="0" max="100" value="100">
                <span id="opacityValue">100%</span>
            </div>
            <div class="format-toggle">
                <button onclick="toggleFormat('hex')">HEX</button>
                <button onclick="toggleFormat('rgb')">RGB</button>
                <button onclick="toggleFormat('hsl')">HSL</button>
            </div>
            <div class="color-value" id="value">#FF0000
                <div class="copied-tooltip">Copied!</div>
            </div>
            <button class="copy-button" onclick="copyColor()" id="copyButton">Copy Color</button>
        </div>
    </div>
    <script>${colorPickerScript}</script>
</body>
</html>`;
}

export function deactivate() {
    colorPickerPanel?.dispose();
}