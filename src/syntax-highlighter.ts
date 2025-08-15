import moonbitGrammar from './moonbit.tmLanguage.json';

// ANSI 颜色代码
const COLORS = {
  keyword: '\u001b[35m',        // 紫色 - 关键字
  string: '\u001b[32m',         // 绿色 - 字符串
  comment: '\u001b[90m',        // 灰色 - 注释
  number: '\u001b[33m',         // 黄色 - 数字
  function: '\u001b[36m',       // 青色 - 函数
  type: '\u001b[94m',           // 亮蓝色 - 类型
  variable: '\u001b[37m',       // 白色 - 变量
  operator: '\u001b[91m',       // 亮红色 - 操作符
  reset: '\u001b[0m'            // 重置
};

// 语法规则映射
const SCOPE_TO_COLOR: Record<string, string> = {
  'keyword.control.moonbit': COLORS.keyword,
  'keyword.moonbit': COLORS.keyword,
  'storage.modifier.moonbit': COLORS.keyword,
  'variable.language.moonbit': COLORS.keyword,
  'string.quoted.single.moonbit': COLORS.string,
  'string.quoted.double.moonbit': COLORS.string,
  'string.line': COLORS.string,
  'comment.line': COLORS.comment,
  'comment.block.documentation.moonbit': COLORS.comment,
  'constant.numeric.moonbit': COLORS.number,
  'constant.language.moonbit': COLORS.number,
  'entity.name.function.moonbit': COLORS.function,
  'entity.name.type.moonbit': COLORS.type,
  'variable.other.moonbit': COLORS.variable,
  'keyword.operator.assignment.moonbit': COLORS.operator,
  'keyword.operator.comparison.moonbit': COLORS.operator,
  'keyword.operator.logical.moonbit': COLORS.operator,
  'keyword.operator.bitwise.moonbit': COLORS.operator,
  'keyword.operator.math.moonbit': COLORS.operator,
  'keyword.operator.other.moonbit': COLORS.operator,
  'storage.type.function.arrow.moonbit': COLORS.operator,
  'entity.name.namespace.moonbit': COLORS.type,
  'support.class.moonbit': COLORS.type
};

interface Token {
  text: string;
  scope: string;
  start: number;
  end: number;
}

interface Pattern {
  match?: string;
  name?: string;
  include?: string;
  patterns?: Pattern[];
}

interface Repository {
  [key: string]: {
    patterns?: Pattern[];
  };
}

class MoonbitSyntaxHighlighter {
  private patterns: Pattern[];

  constructor() {
    this.patterns = moonbitGrammar.patterns as Pattern[];
  }

  // 编译正则表达式模式
  private compilePattern(pattern: Pattern): RegExp | null {
    if (pattern.match) {
      try {
        return new RegExp(pattern.match, 'g');
      } catch (e) {
        console.warn('Invalid regex pattern:', pattern.match);
        return null;
      }
    }
    return null;
  }

  // 获取模式的作用域名称
  private getPatternScope(pattern: Pattern): string {
    return pattern.name || '';
  }

  // 处理仓库中的模式
  private processRepositoryPatterns(includeName: string): Pattern[] {
    const repoName = includeName.replace('#', '');
    const repo = (moonbitGrammar.repository as Repository)?.[repoName];
    if (repo?.patterns) {
      return repo.patterns;
    }
    return [];
  }

  // 标记化文本
  private tokenize(text: string): Token[] {
    const tokens: Token[] = [];
    const processedRanges: Array<{start: number, end: number}> = [];

    // 处理所有模式
    const allPatterns = [...this.patterns];
    
    // 展开 include 引用
    for (let i = 0; i < allPatterns.length; i++) {
      const pattern = allPatterns[i];
      if (pattern.include) {
        const repoPatterns = this.processRepositoryPatterns(pattern.include);
        allPatterns.splice(i, 1, ...repoPatterns);
        i += repoPatterns.length - 1;
      }
    }

    // 应用每个模式
    for (const pattern of allPatterns) {
      const regex = this.compilePattern(pattern);
      if (!regex) continue;

      const scope = this.getPatternScope(pattern);
      let match: RegExpExecArray | null;

      let execResult = regex.exec(text);
      while (execResult !== null) {
        match = execResult;
        const start = match.index;
        const end = start + match[0].length;

        // 检查是否与已处理的范围重叠
        const overlaps = processedRanges.some(range => 
          (start < range.end && end > range.start)
        );

        if (!overlaps) {
          tokens.push({
            text: match[0],
            scope,
            start,
            end
          });
          processedRanges.push({ start, end });
        }
        execResult = regex.exec(text);
      }
    }

    // 按位置排序
    tokens.sort((a, b) => a.start - b.start);
    return tokens;
  }

  // 高亮文本
  highlight(text: string): string {
    if (!text.trim()) return text;

    const tokens = this.tokenize(text);
    let result = '';
    let lastIndex = 0;

    for (const token of tokens) {
      // 添加未匹配的文本
      if (token.start > lastIndex) {
        result += text.slice(lastIndex, token.start);
      }

      // 添加高亮的token
      const color = SCOPE_TO_COLOR[token.scope] || COLORS.reset;
      result += color + token.text + COLORS.reset;
      
      lastIndex = token.end;
    }

    // 添加剩余的文本
    if (lastIndex < text.length) {
      result += text.slice(lastIndex);
    }

    return result;
  }

  // 获取纯文本（移除ANSI颜色代码）
  getPlainText(highlightedText: string): string {
    const escapeChar = String.fromCharCode(27); // ESC character
    const ansiRegex = new RegExp(`${escapeChar}\\[[0-9;]*m`, 'g');
    return highlightedText.replace(ansiRegex, '');
  }
}

export default MoonbitSyntaxHighlighter;
export { COLORS };