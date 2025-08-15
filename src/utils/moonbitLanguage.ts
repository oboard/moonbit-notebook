import * as monaco from 'monaco-editor';

// 模块级别的语言注册状态
let isLanguageRegistered = false;

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
      [/\b(fn|let|mut|if|else|match|for|while|loop|break|continue|return|struct|enum|trait|impl|pub|priv|type|const|static|import|export|as|use|try|catch|throw|defer|guard|using|derive|test|with|extern|readonly)\b/, 'keyword'],
      
      // 布尔值和特殊常量
      [/\b(true|false|None|Some)\b/, 'constant.builtin'],
      
      // 内置类型
      [/\b(Int|Int64|Double|String|Bool|Unit|Array|Option|Result|Char|Byte|Float|UInt|UInt64|BigInt)\b/, 'type.builtin'],
      
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
      [/\|>/, 'operator'],
      [/->|=>/, 'operator'],
      [/:=|=(?!=)/, 'operator'],
      [/===|==|!=|>=|<=|>|</, 'operator'],
      [/&&|\|\||\bnot\b/, 'operator'],
      [/[&|^](?![&|])/, 'operator'],
      [/<<|>>/, 'operator'],
      [/[+\-*/%]/, 'operator'],
      
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
  // 防止重复注册
  if (isLanguageRegistered) {
    return;
  }

  // 注册语言
  monaco.languages.register({ id: 'moonbit' });
  
  // 设置语言配置
  monaco.languages.setLanguageConfiguration('moonbit', moonbitLanguageConfig);
  
  // 设置语法高亮
  monaco.languages.setMonarchTokensProvider('moonbit', moonbitTokens);
  
  
  isLanguageRegistered = true;
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