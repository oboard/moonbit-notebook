import type * as MoonBit from "./moonbit.d.ts";

export function eval(self: any,
                     code: MoonBit.String,
                     log: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>,
                     top$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): MoonBit.Result<any, any>;

export function create(log$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>,
                       core$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): any;

export function add_extern_fn(vm: any,
                              name: MoonBit.String,
                              func: (_arg0: any) => any): MoonBit.Unit;

export function eval_result_to_string(result: any): MoonBit.String;
