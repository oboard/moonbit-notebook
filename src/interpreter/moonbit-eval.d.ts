import type * as MoonBit from "./moonbit.d.ts";

export function eval(self: any,
                     code: MoonBit.String,
                     log: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>,
                     top$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): MoonBit.Result<any, any>;

export function create(log$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): any;

export function add_extern_fn(self: any,
                              name: MoonBit.String,
                              f: (_arg0: any) => any): MoonBit.Unit;

export function expr_to_string(expr: any): MoonBit.String;
