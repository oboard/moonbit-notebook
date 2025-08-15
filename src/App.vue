<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, nextTick } from 'vue';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import "@xterm/xterm/css/xterm.css";
import { add_extern_fn, create, eval as eval_mb, expr_to_string } from './interpreter/moonbit-eval';
import MoonbitSyntaxHighlighter from './syntax-highlighter';
import { EditorView, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, rectangularSelection, crosshairCursor, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { foldGutter, indentOnInput, bracketMatching, foldKeymap } from '@codemirror/language';
import { history, defaultKeymap, historyKeymap } from '@codemirror/commands';
import { highlightSelectionMatches as highlightMatches } from '@codemirror/search';
import { moonbit } from './moonbit-lang';
import { oneDark } from '@codemirror/theme-one-dark';

// 多行编辑器相关状态
const showMultilineEditor = ref(false);
const multilineCode = ref('');
const editorRef = ref<HTMLElement | null>(null);
let editorView: EditorView | null = null;

// 初始化 CodeMirror 编辑器
const initCodeMirror = async () => {
    if (!editorRef.value) return;

    const state = EditorState.create({
        doc: multilineCode.value,
        extensions: [
            lineNumbers(),
            highlightActiveLineGutter(),
            highlightSpecialChars(),
            history(),
            foldGutter(),
            drawSelection(),
            dropCursor(),
            EditorState.allowMultipleSelections.of(true),
            indentOnInput(),
            bracketMatching(),
            rectangularSelection(),
            crosshairCursor(),
            highlightMatches(),
            keymap.of([
                ...defaultKeymap,
                ...historyKeymap,
                ...foldKeymap
            ]),
            moonbit(),
            oneDark,
            EditorView.updateListener.of((update) => {
                if (update.docChanged) {
                    multilineCode.value = update.state.doc.toString();
                }
            }),
            EditorView.domEventHandlers({
                keydown: (event) => {
                    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        executeMultilineCode();
                        return true;
                    }
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        cancelMultilineEditor();
                        return true;
                    }
                    return false;
                }
            })
        ]
    });

    editorView = new EditorView({
        state,
        parent: editorRef.value
    });

    // 聚焦编辑器并将光标定位到最后
    editorView.focus();
    const docLength = editorView.state.doc.length;
    editorView.dispatch({
        selection: { anchor: docLength, head: docLength }
    });
};

// 销毁编辑器
const destroyEditor = () => {
    if (editorView) {
        editorView.destroy();
        editorView = null;
    }
};

const vm = create(false);
const highlighter = new MoonbitSyntaxHighlighter();

// ANSI 转义码定义
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
// const BLUE = "\x1b[34m";
// const MAGENTA = "\x1b[35m";
// const CYAN = "\x1b[36m";
// const WHITE = "\x1b[37m";


const helloWorld = `${GREEN}Welcome to MoonRepl! ${YELLOW}Made with ${RED}❤️${YELLOW} by oboard${RESET}`

// Function to check if a character is CJK (2-column wide in terminals)
const isWideChar = (char: string) => {
    const code = char.charCodeAt(0);
    return (code >= 0x1100 && code <= 0x115F) || // Hangul Jamo
        (code >= 0x2E80 && code <= 0xA4CF) || // CJK Radicals Supplement to Yi Radicals
        (code >= 0xAC00 && code <= 0xD7A3) || // Hangul Syllables
        (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility Ideographs
        (code >= 0xFE30 && code <= 0xFE4F) || // CJK Compatibility Forms
        (code >= 0xFF00 && code <= 0xFFEF);   // Halfwidth and Fullwidth Forms
};


// Create a ref for the terminal element
const terminalRef = ref<HTMLElement | null>(null);
const term: Terminal = new Terminal({
    theme: {
        foreground: '#dcdcdc', // 字体颜色（浅灰色）
        background: '#2e3440', // 背景颜色（深灰蓝色）
        cursor: '#d8dee9', // 光标颜色（浅灰蓝色）
        selectionBackground: '#4c566a', // 选中文本背景颜色（中灰蓝色）
        selectionForeground: '#eceff4', // 选中文本前景颜色（近乎白色）
        selectionInactiveBackground: '#3b4252', // 非激活状态下的选中文本背景（更深的灰蓝色）
        black: '#3b4252', // 黑色（深灰蓝色）
        red: '#bf616a', // 红色（柔和的红色）
        green: '#a3be8c', // 绿色（柔和的绿色）
        yellow: '#ebcb8b', // 黄色（浅黄色）
        blue: '#81a1c1', // 蓝色（柔和的蓝色）
        magenta: '#b48ead', // 品红（淡紫色）
        cyan: '#88c0d0', // 青色（柔和的青色）
        white: '#e5e9f0', // 白色（浅灰色）
        brightBlack: '#4c566a', // 亮黑色（稍亮的灰蓝色）
        brightRed: '#d08770', // 亮红色（温暖的橙红色）
        brightGreen: '#8fbcbb', // 亮绿色（浅青绿）
        brightYellow: '#d8dee9', // 亮黄色（柔和的浅黄色）
        brightBlue: '#5e81ac', // 亮蓝色（浅灰蓝色）
        brightMagenta: '#a3be8c', // 亮品红（浅淡紫色）
        brightCyan: '#81a1c1', // 亮青色（柔和的浅青色）
        brightWhite: '#eceff4' // 亮白色（接近白色）
    },
    fontFamily: 'Menlo, courier-new, courier, monospace',
});
const fitAddon = new FitAddon();

const handleResize = () => {
    if (term && terminalRef.value) {
        fitAddon.fit();
    }
};
onMounted(() => {
    if (terminalRef.value) {
        term.loadAddon(fitAddon);
        term.open(terminalRef.value);
        handleResize();


        // 添加内置函数
        add_extern_fn(vm.interpreter, "println", (arg: { _0: { _0: { _0: string } } }) => {
            term.writeln(arg._0._0._0);
        })

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize);

        // 输出彩色字符
        term.writeln(helloWorld);

        let inputBuffer = ''; // 存储用户输入
        const history: string[] = []; // 历史记录
        let historyIndex = -1; // 当前历史记录索引
        let cursorPosition = 0; // 光标位置
        let bracketCount = 0; // 括号计数器
        let parenCount = 0; // 圆括号计数器

        // 计算括号数量
        const countBrackets = (text: string) => {
            let braces = 0;
            for (const char of text) {
                if (char === '{') braces++;
                else if (char === '}') braces--;
            }
            return { braces };
        };

        const writePrompt = () => {
            term.write(`${GREEN}❯ ${RESET}`); // 显示提示符
        };
        writePrompt();

        const refreshLine = () => {
            term.write('\r\x1b[K'); // 清除当前行
            writePrompt(); // 重新显示提示符

            // 应用语法高亮
            const highlightedText = highlighter.highlight(inputBuffer);
            term.write(highlightedText); // 显示高亮后的输入

            // 计算光标位置（需要考虑ANSI转义序列）
            const plainText = highlighter.getPlainText(highlightedText);
            const visibleLength = plainText.length;
            const moveBack = visibleLength - cursorPosition;
            if (moveBack > 0) {
                term.write(`\x1b[${moveBack}D`);
            }
        };



        // 检查是否应该执行代码
        const shouldExecute = () => {
            const counts = countBrackets(inputBuffer);
            return counts.braces === 0;
        };

        // 检测是否需要多行编辑器
        const checkMultilineInput = () => {
            const counts = countBrackets(inputBuffer);
            const hasNewlines = inputBuffer.includes('\n');
            const hasUnclosedBrackets = counts.braces > 0;

            if (hasNewlines || hasUnclosedBrackets || inputBuffer.length > 50) {
                // 显示多行编辑器
                multilineCode.value = inputBuffer;
                showMultilineEditor.value = true;
                // 清空terminal的输入
                inputBuffer = '';
                cursorPosition = 0;
                // 初始化 CodeMirror
                nextTick(() => {
                    initCodeMirror();
                });
                return true;
            }
            return false;
        };

        // 自定义事件处理程序，允许 Ctrl+V/Cmd+V 粘贴
        term.attachCustomKeyEventHandler((event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === "v") {
                return true; // 允许 Ctrl+V 或 Cmd+V 粘贴
            }
            return true; // 继续处理其他按键
        });

        // 捕获粘贴数据
        term.onData((data) => {
            const key = data;
            switch (key) {
                case '\r': // 回车键
                    term.write('\r\n'); // 换行
                    if (inputBuffer === 'clear') {
                        term.clear();
                        inputBuffer = ''; // 清空输入缓冲区
                        cursorPosition = 0; // 重置光标位置
                        bracketCount = 0; // 重置括号计数
                        parenCount = 0; // 重置圆括号计数
                        writePrompt(); // 重新显示提示符
                        break;
                    }

                    // 检查是否应该执行代码
                    if (shouldExecute()) {
                        // 括号已闭合，执行代码
                        try {
                            const result = eval_mb(vm, inputBuffer, false, false); // 执行表达式
                            if (result._0.value) {
                                term.writeln(expr_to_string(result._0.value)); // 显示结果
                            }
                        } catch (e: unknown) {
                            term.writeln(`${RED}${e}${RESET}`);
                        }

                        if (inputBuffer) {
                            history.push(inputBuffer); // 将输入内容添加到历史记录
                            historyIndex = history.length; // 重置历史索引
                        }
                        inputBuffer = ''; // 清空输入缓冲区
                        cursorPosition = 0; // 重置光标位置
                        bracketCount = 0; // 重置括号计数
                        parenCount = 0; // 重置圆括号计数
                        writePrompt(); // 重新显示提示符
                    } else {
                        // 检查是否需要切换到多行编辑器
                        if (!checkMultilineInput()) {
                            // 如果没有切换到多行编辑器，显示提示符
                            writePrompt();
                        }
                    }
                    break;
                case '\x7f': // Backspace key
                    if (cursorPosition > 0 && inputBuffer.length > 0) {
                        const charToDelete = inputBuffer[cursorPosition - 1];
                        inputBuffer =
                            inputBuffer.slice(0, cursorPosition - 1) + inputBuffer.slice(cursorPosition);
                        cursorPosition--; // Move cursor left

                        if (isWideChar(charToDelete)) {
                            term.write('\x1b[D\x1b[D'); // Move cursor 2 positions left for wide chars
                        } else {
                            term.write('\x1b[D'); // Move cursor 1 position left for regular chars
                        }

                        refreshLine(); // Refresh the current line to reflect the updated input
                    }
                    break;
                case '\x03': // Ctrl + C
                    term.write('\r\n'); // 换行
                    inputBuffer = ''; // 清空输入缓冲区
                    cursorPosition = 0; // 重置光标位置
                    bracketCount = 0; // 重置括号计数
                    parenCount = 0; // 重置圆括号计数
                    writePrompt(); // 重新显示提示符
                    break;

                // Assuming inputBuffer is an array of characters (string[]).
                case '\u001b[D': // Left arrow key
                    if (cursorPosition > 0) {
                        const prevChar = inputBuffer[cursorPosition - 1];
                        cursorPosition--;
                        if (isWideChar(prevChar)) {
                            term.write('\x1b[D\x1b[D'); // Move cursor 2 positions left for wide chars
                        } else {
                            term.write('\x1b[D'); // Move cursor 1 position left for regular chars
                        }
                    }
                    break;

                case '\u001b[C': // Right arrow key
                    if (cursorPosition < inputBuffer.length) {
                        const nextChar = inputBuffer[cursorPosition];
                        cursorPosition++;
                        if (isWideChar(nextChar)) {
                            term.write('\x1b[C\x1b[C'); // Move cursor 2 positions right for wide chars
                        } else {
                            term.write('\x1b[C'); // Move cursor 1 position right for regular chars
                        }
                    }
                    // 注意：右箭头键在行尾时移动到下一行的功能比较复杂，
                    // 因为需要重新设计多行编辑的数据结构，暂时不实现
                    break;

                case '\u001b[B': // 下箭头键
                    if (historyIndex < history.length - 1) {
                        historyIndex++;
                        inputBuffer = history[historyIndex];
                        cursorPosition = inputBuffer.length; // 将光标移到行尾
                        refreshLine();
                    } else if (historyIndex === history.length) {
                        // 当处于最底端时清空输入框
                        historyIndex++;
                        inputBuffer = '';
                        cursorPosition = 0;
                        refreshLine();
                    }
                    break;

                case '\u001b[A': // 上箭头键
                    if (historyIndex > 0) {
                        historyIndex--;
                        inputBuffer = history[historyIndex];
                        cursorPosition = inputBuffer.length; // 将光标移到行尾
                        refreshLine();
                    }
                    break;

                default:
                    if (key === undefined) break;
                    // 插入字符到当前光标位置
                    inputBuffer =
                        inputBuffer.slice(0, cursorPosition) + key + inputBuffer.slice(cursorPosition);
                    cursorPosition += key.length; // 光标位置向右移动一位

                    // 刷新整行以应用语法高亮
                    refreshLine();
                    break;
            }
        });

        // 多行编辑器功能定义
        executeMultilineCode = () => {
            const code = multilineCode.value.trim();
            if (!code) {
                showMultilineEditor.value = false;
                return;
            }

            // 在终端显示执行的代码
            term.writeln(`${GREEN}❯ ${RESET}${code.replace(/\n/g, `\n${GREEN}| ${RESET}`)}`);

            try {
                const result = eval_mb(vm, code, false, false);
                if (result._0.value) {
                    term.writeln(expr_to_string(result._0.value));
                }
            } catch (e: unknown) {
                term.writeln(`${RED}${e}${RESET}`);
            }

            // 添加到历史记录
            if (code) {
                history.push(code);
                historyIndex = history.length;
            }

            // 关闭编辑器并重置
            showMultilineEditor.value = false;
            multilineCode.value = '';
            destroyEditor();
            writePrompt();
        };

        cancelMultilineEditor = () => {
            showMultilineEditor.value = false;
            multilineCode.value = '';
            destroyEditor();
            writePrompt();
        };

        // 处理textarea的键盘事件
        handleTextareaKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                event.preventDefault();
                executeMultilineCode();
            } else if (event.key === 'Escape') {
                event.preventDefault();
                cancelMultilineEditor();
            }
        };

        // term.onKey(e => {
        //     const key = e.key;

        // });
    }
});

// 多行编辑器功能（需要在 onMounted 内部定义以访问局部变量）
let executeMultilineCode: () => void;
let cancelMultilineEditor: () => void;
let handleTextareaKeydown: (event: KeyboardEvent) => void;

onBeforeUnmount(() => {
    // 清理事件监听器
    window.removeEventListener('resize', handleResize);
});
</script>

<template>
    <div class="w-screen h-screen flex">
        <!-- Terminal 区域 -->
        <div :class="showMultilineEditor ? 'w-1/2' : 'w-full'" class="transition-all duration-300">
            <div ref="terminalRef" class="w-full h-full"></div>
        </div>

        <!-- 多行编辑器区域 -->
        <div v-if="showMultilineEditor"
            class="z-10 w-1/2 bg-gray-900 border-l border-gray-600 flex flex-col transition-all duration-300">
            <!-- 编辑器标题栏 -->
            <div class="flex justify-between items-center p-4 border-b border-gray-600 bg-gray-800">
                <h3 class="text-green-400 text-lg font-mono font-semibold flex items-center">
                    <span class="text-green-400 mr-2">❯</span>
                    多行代码编辑器
                </h3>
                <div class="flex gap-3">
                    <button @click="executeMultilineCode"
                        class="px-3 py-1.5 bg-transparent border border-green-500 text-green-400 rounded font-mono text-xs hover:bg-green-500 hover:text-gray-900 transition-all duration-200 shadow-lg hover:shadow-green-500/25 active:scale-95"
                        title="Ctrl/Cmd + Enter">
                        <span class="flex items-center gap-1.5">
                            <span>▶</span>
                            执行
                        </span>
                    </button>
                    <button @click="cancelMultilineEditor"
                        class="px-3 py-1.5 bg-transparent border border-red-500 text-red-400 rounded font-mono text-xs hover:bg-red-500 hover:text-gray-900 transition-all duration-200 shadow-lg hover:shadow-red-500/25 active:scale-95"
                        title="Esc">
                        <span class="flex items-center gap-1.5">
                            <span>✕</span>
                            关闭
                        </span>
                    </button>
                </div>
            </div>

            <!-- 编辑器内容区域 -->
            <div class="flex-1 flex flex-col p-4">
                <!-- 代码编辑器 -->
                <div class="flex-1 relative">
                    <div ref="editorRef"
                        class="absolute inset-0 bg-gray-800 border border-gray-500 rounded overflow-hidden focus-within:border-green-400 focus-within:ring-1 focus-within:ring-green-400/30 transition-all duration-200">
                        <!-- CodeMirror 编辑器将在这里初始化 -->
                    </div>
                </div>

                <!-- 底部提示 -->
                <div class="mt-4 text-xs text-gray-300 font-mono flex items-center gap-3">
                    <span class="text-yellow-400">💡</span>
                    <kbd
                        class="px-2 py-1 bg-gray-700 border border-gray-500 text-green-400 rounded text-xs font-mono shadow-sm">Ctrl/Cmd
                        + Enter</kbd>
                    <span class="text-gray-400">执行</span>
                    <kbd
                        class="px-2 py-1 bg-gray-700 border border-gray-500 text-red-400 rounded text-xs font-mono shadow-sm">Esc</kbd>
                    <span class="text-gray-400">关闭</span>
                </div>
            </div>
        </div>
    </div>

    <a href="https://github.com/oboard/moonrepl" target="_blank"
        class="fixed top-4 right-8 text-white hover:text-gray-300 active:text-gray-500 z-40">
        <svg width="24px" height="24px" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" clip-rule="evenodd"
                d="M16 0C7.16 0 0 7.3411 0 16.4047C0 23.6638 4.58 29.795 10.94 31.9687C11.74 32.1122 12.04 31.6201 12.04 31.1894C12.04 30.7998 12.02 29.508 12.02 28.1341C8 28.8928 6.96 27.1293 6.64 26.2065C6.46 25.7349 5.68 24.279 5 23.8893C4.44 23.5818 3.64 22.823 4.98 22.8025C6.24 22.782 7.14 23.9919 7.44 24.484C8.88 26.9652 11.18 26.268 12.1 25.8374C12.24 24.7711 12.66 24.0534 13.12 23.6433C9.56 23.2332 5.84 21.8183 5.84 15.5435C5.84 13.7594 6.46 12.283 7.48 11.1347C7.32 10.7246 6.76 9.04309 7.64 6.78745C7.64 6.78745 8.98 6.35682 12.04 8.46893C13.32 8.09982 14.68 7.91527 16.04 7.91527C17.4 7.91527 18.76 8.09982 20.04 8.46893C23.1 6.33632 24.44 6.78745 24.44 6.78745C25.32 9.04309 24.76 10.7246 24.6 11.1347C25.62 12.283 26.24 13.7389 26.24 15.5435C26.24 21.8388 22.5 23.2332 18.94 23.6433C19.52 24.1559 20.02 25.1402 20.02 26.6781C20.02 28.8723 20 30.6358 20 31.1894C20 31.6201 20.3 32.1327 21.1 31.9687C27.42 29.795 32 23.6433 32 16.4047C32 7.3411 24.84 0 16 0Z"
                fill="currentColor"></path>
        </svg>
    </a>
</template>

<style>
.terminal {
    padding: 1rem;
}

/* 多行编辑器样式 */
.editor-container {
    position: relative;
    width: 100%;
    height: 100%;
}

/* CodeMirror 编辑器样式 */
.cm-editor {
    height: 100% !important;
}

.cm-scroller {
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, Courier, monospace !important;
    font-size: 0.875rem !important;
    line-height: 1.25rem !important;
}

.cm-focused {
    outline: none !important;
}

.highlight-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 1rem;
    margin: 0;
    border: none;
    background: transparent;
    color: transparent;
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    font-size: 0.875rem;
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    overflow: hidden;
    pointer-events: none;
    z-index: 1;
}

.multiline-textarea {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    padding: 1rem;
    margin: 0;
    border: none;
    background: transparent;
    color: #d1fae5;
    font-family: 'Courier New', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    font-size: 0.875rem;
    line-height: 1.25rem;
    white-space: pre-wrap;
    word-wrap: break-word;
    resize: none;
    outline: none;
    z-index: 2;
    caret-color: #4ade80;
}

.multiline-textarea::placeholder {
    color: #6b7280;
}

/* 语法高亮样式 */
.highlight-layer .hljs-keyword {
    color: #c678dd;
    font-weight: bold;
}

.highlight-layer .hljs-string {
    color: #98c379;
}

.highlight-layer .hljs-number {
    color: #d19a66;
}

.highlight-layer .hljs-comment {
    color: #5c6370;
    font-style: italic;
}

.highlight-layer .hljs-function {
    color: #61afef;
}

.highlight-layer .hljs-variable {
    color: #e06c75;
}

.highlight-layer .hljs-operator {
    color: #56b6c2;
}

.highlight-layer .hljs-punctuation {
    color: #abb2bf;
}
</style>