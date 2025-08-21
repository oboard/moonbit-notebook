import { create, eval as eval_mb, value_to_json, eval_result_to_string, add_embedded_fn, value_to_string, stop } from '../interpreter/moonbit-eval';

interface WorkerMessage {
  type: 'execute' | 'abort';
  id: string;
  code?: string;
}

interface WorkerResponse {
  type: 'output' | 'result' | 'error' | 'aborted';
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
  vm = create(true, true);

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
    add_embedded_fn(vm, '%println_mono', (ctx: { arguments: { value: unknown }[] }) => {
      const str = `${value_to_string(ctx.arguments[0].value)}\n`;
      console.log(str)
      sendResponse({
        type: 'output',
        id,
        data: {
          startTime,
          endTime: new Date().toISOString(),
          hasValue: !!str,
          jsonValue: str ? value_to_json(ctx.arguments[0].value) : null,
          stringValue: str
        }
      });
      return {
        "$tag": 0
      }
    });
    // 执行代码
    const result = eval_mb(vm, code, false, false);

    // 再次检查是否被中断
    if (abortFlags.get(id)) {
      sendResponse({ type: 'aborted', id });
      return;
    }

    const endTime = new Date().toISOString();

    // 发送成功结果（只传递可序列化的数据）
    sendResponse({
      type: 'result',
      id,
      data: {
        startTime,
        endTime,
        hasValue: !!result._0.value,
        jsonValue: result._0.value ? value_to_json(result._0.value) : null,
        stringValue: eval_result_to_string(result._0)
      }
    });

  } catch (error) {
    console.error('Error executing code:', error);
    // 检查是否因中断而出错
    if (abortFlags.get(id)) {
      sendResponse({ type: 'aborted', id });
      return;
    }

    // 发送错误结果
    sendResponse({
      type: 'error',
      id,
      error: String(error)
    });
  } finally {
    // 清理中断标志
    abortFlags.delete(id);
  }
}

function abortExecution(id: string) {
  abortFlags.set(id, true);
  stop(vm);
  sendResponse({ type: 'aborted', id });
}

function sendResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// 导出类型供主线程使用
export type { WorkerMessage, WorkerResponse };