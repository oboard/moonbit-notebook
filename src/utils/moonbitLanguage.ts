import * as monaco from 'monaco-editor';

// MoonBit 语言配置
const moonbitLanguageConfig: monaco.languages.LanguageConfiguration = {
  comments: {
    lineComment: '//'
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" }
  ]
};

// MoonBit 语法高亮规则
const moonbitTokens: monaco.languages.IMonarchLanguage = {
  tokenizer: {
    root: [
      // 注释
      [/\/\/.*$/, 'comment'],
      
      // 关键字
      [/\b(fn|let|mut|if|else|match|for|while|loop|break|continue|return|struct|enum|trait|impl|pub|priv|type|const|static|import|export|as|use|try|catch|throw|defer)\b/, 'keyword'],
      
      // 布尔值和特殊常量
      [/\b(true|false|None|Some)\b/, 'constant.builtin'],
      
      // 内置类型
      [/\b(Int|Double|String|Bool|Unit|Array|Option|Result|Char|Byte)\b/, 'type.builtin'],
      
      // 数字
      [/\b\d+(\.\d+)?\b/, 'number'],
      
      // 字符串
      [/"([^"\\]|\\.)*$/, 'string.invalid'],  // 未闭合的字符串
      [/"/, 'string', '@string'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],  // 未闭合的字符
      [/'/, 'string', '@string_single'],
      
      // 标识符
      [/[a-zA-Z_]\w*/, 'identifier'],
      
      // 操作符
      [/[=><!~?:&|+\-*\/\^%]+/, 'operator'],
      
      // 分隔符
      [/[{}\[\]()]/, '@brackets'],
      [/[;,.]/, 'delimiter']
    ],
    
    string: [
      [/[^\\"]+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/"/, 'string', '@pop']
    ],
    
    string_single: [
      [/[^\\']+/, 'string'],
      [/\\./, 'string.escape.invalid'],
      [/'/, 'string', '@pop']
    ]
  }
};

// 注册 MoonBit 语言
export function registerMoonbitLanguage() {
  try {
    // 强制重新注册语言
    const languages = monaco.languages.getLanguages();
    const moonbitExists = languages.some(lang => lang.id === 'moonbit');
    
    if (!moonbitExists) {
      monaco.languages.register({ id: 'moonbit' });
      console.log('✅ MoonBit 语言已注册');
    } else {
      console.log('✅ MoonBit 语言已存在');
    }
    
    // 设置语言配置
    monaco.languages.setLanguageConfiguration('moonbit', moonbitLanguageConfig);
    console.log('✅ MoonBit 语言配置已设置');
    
    // 设置语法高亮
    monaco.languages.setMonarchTokensProvider('moonbit', moonbitTokens);
    console.log('✅ MoonBit 语法高亮已设置');
    
    // 定义主题
    monaco.editor.defineTheme('moonbit-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'keyword', foreground: 'C586C0' },
        { token: 'constant.builtin', foreground: '569CD6' },
        { token: 'type.builtin', foreground: '4EC9B0' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'string.invalid', foreground: 'F44747' },
        { token: 'identifier', foreground: '9CDCFE' },
        { token: 'operator', foreground: 'D4D4D4' },
        { token: 'delimiter', foreground: 'D4D4D4' }
      ],
      colors: {}
    });
    console.log('✅ MoonBit 主题已定义');
    
  } catch (error) {
    console.error('❌ 注册 MoonBit 语言失败:', error);
  }
}

// 获取 Monaco 语言映射
export function getMonacoLanguage(cellType: string): string {
  switch (cellType) {
    case 'code':
      return 'moonbit';
    case 'markdown':
      return 'markdown';
    default:
      return 'plaintext';
  }
}

// 应用 MoonBit 主题
export function applyMoonbitTheme() {
  try {
    monaco.editor.setTheme('moonbit-dark');
    console.log('✅ MoonBit 主题已应用');
  } catch (error) {
    console.error('❌ 应用 MoonBit 主题失败:', error);
  }
}