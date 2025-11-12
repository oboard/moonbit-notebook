import { create, eval as eval_mb, value_to_json, eval_result_to_string, add_embedded_fn, value_to_string, code_to_ast } from '../interpreter/moonbit-eval';

interface WorkerMessage {
  type: 'execute' | 'abort';
  id: string;
  code?: string;
}

interface WorkerResponse {
  type: 'output' | 'result' | 'error' | 'aborted' | 'ast';
  id: string;
  data?: {
    startTime: string;
    endTime: string;
    hasValue: boolean;
    jsonValue: string | null;
    stringValue: string;
  };
  error?: string;
}

// 存储每个执行任务的中断标志
const abortFlags = new Map<string, boolean>();

// 创建MoonBit虚拟机实例
let vm: unknown;

try {
  vm = create(true);

} catch (error) {
  console.error('Failed to initialize MoonBit VM:', error);
}

// 监听主线程消息
self.addEventListener('message', (event: MessageEvent<WorkerMessage>) => {
  const { type, id, code } = event.data;

  switch (type) {
    case 'execute':
      if (code !== undefined) {
        // console.log('execute', id, code);
        executeCode(id, code);
      }
      break;
    case 'abort':
      abortExecution(id);
      break;
  }
});

function executeCode(id: string, code: string) {
  // 重置中断标志
  abortFlags.set(id, false);

  try {
    if (!vm) {
      throw new Error('MoonBit VM not initialized');
    }

    // 检查是否被中断
    if (abortFlags.get(id)) {
      sendResponse({ type: 'aborted', id });
      return;
    }

    const startTime = new Date().toISOString();

    // 添加内置函数
    add_embedded_fn(vm, '%println_mono', (ctx: { args: { val: unknown }[] }) => {
      console.log(ctx)
      const str = `${value_to_string(ctx.args[0].val)}\n`;
      console.log(str)
      sendResponse({
        type: 'output',
        id,
        data: {
          startTime,
          endTime: new Date().toISOString(),
          hasValue: !!str,
          jsonValue: str ? value_to_json(ctx.args[0].val) : null,
          stringValue: str
        }
      });
      return {
        "$tag": 1, // Result::Ok
        "_0": { "$tag": 0, value: { "$tag": 0 } },
      }
    });
    // 执行代码
    const result = eval_mb(vm, code, false, false);
    console.log(result)
    if (typeof result._0 === "string") {
      throw new Error(result._0)
    }
    // 再次检查是否被中断
    if (abortFlags.get(id)) {
      sendResponse({ type: 'aborted', id });
      return;
    }

    const endTime = new Date().toISOString();


    sendResponse({
      type: 'ast',
      id,
      data: {
        startTime,
        endTime,
        hasValue: true,
        jsonValue: code_to_ast(code),
        stringValue: ""
      }
    });

    // 发送成功结果（只传递可序列化的数据）
    sendResponse({
      type: 'result',
      id,
      data: {
        startTime,
        endTime,
        hasValue: true,
        jsonValue: result._0 ? value_to_json(result._0) : null,
        stringValue: eval_result_to_string(result)
      }
    });

  } catch (error) {
    console.error(error);
    // 检查是否因中断而出错
    if (abortFlags.get(id)) {
      sendResponse({ type: 'aborted', id });
      return;
    }

    // 发送错误结果
    if (error instanceof Error) {
      sendResponse({
        type: 'error',
        id,
        error: error.message
      });
    }
  } finally {
    // 清理中断标志
    abortFlags.delete(id);
  }
}

function abortExecution(id: string) {
  abortFlags.set(id, true);
  sendResponse({ type: 'aborted', id });
}

function sendResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// 导出类型供主线程使用
export type { WorkerMessage, WorkerResponse };