import * as monaco from 'monaco-editor';

// 模块级别的语言注册状态
let isLanguageRegistered = false;

// 函数签名接口
interface FunctionSignature {
  name: string;
  params: string[];
  returnType?: string;
  signature: string;
}

// 提取函数签名
function extractFunctionSignatures(text: string, prefix: string): FunctionSignature[] {
  const functions: FunctionSignature[] = [];

  // 匹配函数定义: fn function_name(param1: Type1, param2: Type2) -> ReturnType
  const fnRegex = /fn\s+(\w+)\s*\(([^)]*)\)(?:\s*->\s*([^{]+))?\s*\{/g;
  let match: RegExpExecArray | null;

  match = fnRegex.exec(text);
  while (match !== null) {
    const [, name, paramsStr, returnType] = match;

    // 如果函数名以输入前缀开头，则包含在建议中
    if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
      // 解析参数
      const params: string[] = [];
      if (paramsStr.trim()) {
        const paramParts = paramsStr.split(',');
        for (const param of paramParts) {
          const trimmed = param.trim();
          if (trimmed) {
            // 提取参数名和类型: "name: Type" -> "name: Type"
            params.push(trimmed);
          }
        }
      }

      const signature = `fn ${name}(${paramsStr})${returnType ? ` -> ${returnType.trim()}` : ''}`;

      functions.push({
        name,
        params,
        returnType: returnType?.trim(),
        signature
      });
    }

    match = fnRegex.exec(text);
  }

  return functions;
}

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

// MoonBit 关键字和内置类型
const moonbitKeywords = [
  'fn', 'let', 'mut', 'if', 'else', 'match', 'for', 'while', 'loop', 'break', 'continue',
  'return', 'struct', 'enum', 'trait', 'impl', 'pub', 'priv', 'type', 'const', 'static',
  'import', 'export', 'as', 'use', 'try', 'catch', 'throw', 'defer', 'guard', 'using',
  'derive', 'test', 'with', 'extern', 'readonly'
];

const moonbitTypes = [
  'Int', 'Int64', 'Double', 'String', 'Bool', 'Unit', 'Array', 'Option', 'Result',
  'Char', 'Byte', 'Float', 'UInt', 'UInt64', 'BigInt'
];

const moonbitConstants = ['true', 'false', 'None', 'Some'];

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

  // 注册参数提示提供器
  monaco.languages.registerSignatureHelpProvider('moonbit', {
    signatureHelpTriggerCharacters: ['(', ','],
    signatureHelpRetriggerCharacters: [','],
    provideSignatureHelp: (model, position) => {
      const text = model.getValue();
      const lineText = model.getLineContent(position.lineNumber);
      const beforeCursor = lineText.substring(0, position.column - 1);

      // 查找当前正在调用的函数
      const functionCallMatch = beforeCursor.match(/(\w+)\s*\([^)]*$/);
      if (!functionCallMatch) return null;

      const functionName = functionCallMatch[1];

      // 提取所有函数签名
      const allFunctions = extractFunctionSignatures(text, '');
      const targetFunction = allFunctions.find(func => func.name === functionName);

      if (!targetFunction) return null;

      // 计算当前参数位置
      const openParenIndex = beforeCursor.lastIndexOf('(');
      const paramText = beforeCursor.substring(openParenIndex + 1);
      const commaCount = (paramText.match(/,/g) || []).length;
      const activeParameter = commaCount;

      return {
        value: {
          signatures: [{
            label: targetFunction.signature,
            documentation: `Function: ${targetFunction.name}`,
            parameters: targetFunction.params.map(param => ({
              label: param,
              documentation: `Parameter: ${param}`
            }))
          }],
          activeSignature: 0,
          activeParameter: Math.min(activeParameter, targetFunction.params.length - 1)
        },
        dispose: () => { }
      };
    }
  });

  // 注册自动补全提供器
  monaco.languages.registerCompletionItemProvider('moonbit', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions: monaco.languages.CompletionItem[] = [];

      // 关键字补全
      for (const keyword of moonbitKeywords) {
        suggestions.push({
          label: keyword,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: keyword,
          range: range
        });
      }

      // 类型补全
      for (const type of moonbitTypes) {
        suggestions.push({
          label: type,
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: type,
          range: range
        });
      }

      // 常量补全
      for (const constant of moonbitConstants) {
        suggestions.push({
          label: constant,
          kind: monaco.languages.CompletionItemKind.Constant,
          insertText: constant,
          range: range
        });
      }

      // 函数模板补全
      suggestions.push({
        label: 'fn',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'fn ${1:name}(${2:params}) -> ${3:ReturnType} {\n  ${4:// function body}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Function definition template',
        range: range
      });

      // 结构体模板补全
      suggestions.push({
        label: 'struct',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'struct ${1:Name} {\n  ${2:field}: ${3:Type}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Struct definition template',
        range: range
      });

      // 枚举模板补全
      suggestions.push({
        label: 'enum',
        kind: monaco.languages.CompletionItemKind.Snippet,
        insertText: 'enum ${1:Name} {\n  ${2:Variant}\n}',
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: 'Enum definition template',
        range: range
      });

      // 动态函数补全
      const text = model.getValue();
      const functionSuggestions = extractFunctionSignatures(text, word.word);
      suggestions.push(...functionSuggestions.map((func: FunctionSignature) => ({
        label: func.name,
        kind: monaco.languages.CompletionItemKind.Function,
        insertText: `${func.name}(${func.params.map((_: string, i: number) => `\${${i + 1}:${func.params[i]}}`).join(', ')})`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        documentation: `${func.name}(${func.params.join(', ')})${func.returnType ? ` -> ${func.returnType}` : ''}`,
        detail: func.signature,
        range: range
      })));

      return { suggestions };
    }
  });

  // 注册悬停提示提供器
  monaco.languages.registerHoverProvider('moonbit', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const wordText = word.word;
      let hoverText = '';

      if (moonbitKeywords.includes(wordText)) {
        hoverText = `**${wordText}** - MoonBit keyword`;
      } else if (moonbitTypes.includes(wordText)) {
        hoverText = `**${wordText}** - Built-in type`;
      } else if (moonbitConstants.includes(wordText)) {
        hoverText = `**${wordText}** - Built-in constant`;
      }

      if (hoverText) {
        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn
          ),
          contents: [{ value: hoverText }]
        };
      }

      return null;
    }
  });

  // 注册定义跳转提供器
  monaco.languages.registerDefinitionProvider('moonbit', {
    provideDefinition: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const wordText = word.word;
      const text = model.getValue();

      // 查找函数定义: fn function_name(
      const fnRegex = new RegExp(`\\bfn\\s+${wordText}\\s*\\(`, 'g');
      let match: RegExpExecArray | null;

      match = fnRegex.exec(text);
      if (match !== null) {
        const pos = model.getPositionAt(match.index);
        return {
          uri: model.uri,
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column + match[0].length
          )
        };
      }

      // 查找结构体定义: struct StructName {
      const structRegex = new RegExp(`\\bstruct\\s+${wordText}\\s*\\{`, 'g');
      match = structRegex.exec(text);
      if (match !== null) {
        const pos = model.getPositionAt(match.index);
        return {
          uri: model.uri,
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column + match[0].length
          )
        };
      }

      // 查找枚举定义: enum EnumName {
      const enumRegex = new RegExp(`\\benum\\s+${wordText}\\s*\\{`, 'g');
      match = enumRegex.exec(text);
      if (match !== null) {
        const pos = model.getPositionAt(match.index);
        return {
          uri: model.uri,
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column + match[0].length
          )
        };
      }

      // 查找变量定义: let variable_name =
      const letRegex = new RegExp(`\\blet\\s+${wordText}\\s*=`, 'g');
      match = letRegex.exec(text);
      if (match !== null) {
        const pos = model.getPositionAt(match.index);
        return {
          uri: model.uri,
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            pos.lineNumber,
            pos.column + match[0].length
          )
        };
      }

      return null;
    }
  });

  // 注册重命名提供器
  monaco.languages.registerRenameProvider('moonbit', {
    provideRenameEdits: (model, position, newName) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const wordText = word.word;
      const text = model.getValue();
      const edits: monaco.languages.TextEdit[] = [];

      // 查找所有出现的位置
      const regex = new RegExp(`\\b${wordText}\\b`, 'g');
      let match: RegExpExecArray | null;

      match = regex.exec(text);
      while (match !== null) {
        const pos = model.getPositionAt(match.index);
        const endPos = model.getPositionAt(match.index + match[0].length);

        edits.push({
          range: new monaco.Range(
            pos.lineNumber,
            pos.column,
            endPos.lineNumber,
            endPos.column
          ),
          text: newName
        });

        match = regex.exec(text);
      }

      return {
        edits: edits.map(edit => ({
          resource: model.uri,
          versionId: model.getVersionId(),
          textEdit: edit
        }))
      };
    },

    resolveRenameLocation: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      return {
        range: new monaco.Range(
          position.lineNumber,
          word.startColumn,
          position.lineNumber,
          word.endColumn
        ),
        text: word.word
      };
    }
  });

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