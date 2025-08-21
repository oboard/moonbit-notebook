import * as monaco from 'monaco-editor';
import { useEffect, useRef } from 'react';
import { registerMoonbitLanguage } from '../utils/moonbitLanguage';

// 原生 Monaco 编辑器组件
interface CodeEditorProps {
    value: string;
    onChange: (value: string) => void;
    height: number;
    language: string;

}

const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, height, language }) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstanceRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const isInitialized = useRef(false);
    const onChangeRef = useRef(onChange);

    // 保持 onChange 引用最新
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // 初始化编辑器（只执行一次）
    useEffect(() => {
        if (!editorRef.current || isInitialized.current) return;

        // 注册 MoonBit 语言
        registerMoonbitLanguage();

        // 创建编辑器实例
        const editor = monaco.editor.create(editorRef.current, {
            value: '',
            language: language,
            theme: 'vs-dark',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 14,
            lineNumbers: 'on',
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            'semanticHighlighting.enabled': false,
            quickSuggestions: false,
            parameterHints: { enabled: false },
            suggestOnTriggerCharacters: false,
            acceptSuggestionOnEnter: 'off',
            tabCompletion: 'off',
            wordBasedSuggestions: 'off',
            hover: { enabled: false },
            links: false,
            colorDecorators: false
        });

        editorInstanceRef.current = editor;
        isInitialized.current = true;

        // 监听内容变化
        const disposable = editor.onDidChangeModelContent(() => {
            const newValue = editor.getValue();
            onChangeRef.current(newValue);
        });

        return () => {
            disposable.dispose();
            editor.dispose();
            isInitialized.current = false;
        };
    }, [language]); // 空依赖数组，只初始化一次

    // 更新编辑器值
    useEffect(() => {
        if (editorInstanceRef.current && editorInstanceRef.current.getValue() !== value) {
            editorInstanceRef.current.setValue(value);
        }
    }, [value]);

    // 更新编辑器高度
    useEffect(() => {
        if (editorInstanceRef.current) {
            editorInstanceRef.current.layout({ width: 0, height });
        }
    }, [height]);

    return <div ref={editorRef} style={{ width: '100%', height: `${height}px` }} />;
};

export default CodeEditor;