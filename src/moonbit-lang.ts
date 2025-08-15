import { StreamLanguage, LanguageSupport } from '@codemirror/language';

// MoonBit 语言的流式解析器
const moonbitLanguage = StreamLanguage.define({
  name: 'moonbit',
  
  startState() {
    return {
      inString: false,
      inComment: false,
      inBlockComment: false,
      stringDelimiter: null as string | null
    };
  },
  
  token(stream, state) {
    // 处理字符串
    if (state.inString) {
      if (stream.match(/\\./)) {
        return 'string escape';
      }
      if (stream.next() === state.stringDelimiter) {
        state.inString = false;
        state.stringDelimiter = null;
        return 'string';
      }
      stream.eatWhile(/[^"'\\]/);
      return 'string';
    }
    
    // 处理注释
    if (state.inComment) {
      stream.skipToEnd();
      state.inComment = false;
      return 'comment';
    }
    
    // 跳过空白字符
    if (stream.eatSpace()) {
      return null;
    }
    
    // 行注释
    if (stream.match('//')) {
      state.inComment = true;
      return 'comment';
    }
    
    // 文档注释
    if (stream.match('///')) {
      stream.skipToEnd();
      return 'comment';
    }
    
    // 字符串
    if (stream.match(/["']/)) {
      const delimiter = stream.current();
      state.inString = true;
      state.stringDelimiter = delimiter;
      return 'string';
    }
    
    // 特殊字符串语法
    if (stream.match(/#\|/)) {
      stream.skipToEnd();
      return 'string';
    }
    
    if (stream.match(/\$\|/)) {
      stream.skipToEnd();
      return 'string';
    }
    
    // 数字
    if (stream.match(/\b\d[\d_]*(?:\.[\d_]*)?(?:[Ee][+-]?\d[\d_]*)?\b/)) {
      return 'number';
    }
    
    // 十六进制数字
    if (stream.match(/\b0[Xx][\da-fA-F][\da-fA-F_]*\b/)) {
      return 'number';
    }
    
    // 八进制数字
    if (stream.match(/\b0[Oo][0-7][0-7_]*\b/)) {
      return 'number';
    }
    
    // 布尔值
    if (stream.match(/\b(true|false)\b/)) {
      return 'atom';
    }
    
    // 关键字
    if (stream.match(/\b(guard|if|while|break|continue|return|try|catch|except|raise|match|using|else|as|in|is|loop|for|async)\b/)) {
      return 'keyword';
    }
    
    // 定义关键字
    if (stream.match(/\b(type!|type|typealias|let|const|enum|struct|import|trait|traitalias|derive|test|impl|with|fnalias|recur|suberror|fn)\b/)) {
      return 'keyword';
    }
    
    // 修饰符
    if (stream.match(/\b(mut|pub|priv|readonly|extern)\b/)) {
      return 'modifier';
    }
    
    // self 关键字
    if (stream.match(/\bself\b/)) {
      return 'variable-2';
    }
    
    // 支持类
    if (stream.match(/\b(Eq|Compare|Hash|Show|Default|ToJson|FromJson)\b/)) {
      return 'type';
    }
    
    // 模块名
    if (stream.match(/@[A-Za-z][A-Za-z0-9_/]*/)) {
      return 'namespace';
    }
    
    // 类型名（大写开头）
    if (stream.match(/\b[A-Z][A-Za-z0-9_]*\??\b/)) {
      return 'type';
    }
    
    // 函数名（小写开头）
    if (stream.match(/\b[a-z_][a-zA-Z0-9_]*\b/)) {
      return 'variable';
    }
    
    // 操作符
    if (stream.match(/->|=>/)) {
      return 'operator';
    }
    
    if (stream.match(/===|==|!=|>=|<=|>|</)) {
      return 'operator';
    }
    
    if (stream.match(/&&|\|\||\bnot\b/)) {
      return 'operator';
    }
    
    if (stream.match(/\||&|\^|<<|>>/)) {
      return 'operator';
    }
    
    if (stream.match(/\+|-|\*|%|\//)) {
      return 'operator';
    }
    
    if (stream.match(/\|>/)) {
      return 'operator';
    }
    
    if (stream.match(/=/)) {
      return 'operator';
    }
    
    // 属性
    if (stream.match(/#[a-z][A-Za-z0-9_. ]*/)) {
      return 'meta';
    }
    
    // 其他字符
    stream.next();
    return null;
  },
  
  languageData: {
    commentTokens: { line: '//' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
    indentOnInput: /^\s*[}\])]$/
  }
});

// 创建完整的语言支持
export function moonbit() {
  return new LanguageSupport(moonbitLanguage);
}

export { moonbitLanguage };