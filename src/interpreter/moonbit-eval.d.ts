import type * as MoonBit from "./moonbit.d.ts";

export function add_embedded_method(vm: any,
                                    name: MoonBit.String,
                                    method_name: MoonBit.String,
                                    func: (_arg0: any) => MoonBit.Result<any, any>): MoonBit.Unit;

export function add_embedded_fn(vm: any,
                                name: MoonBit.String,
                                func: (_arg0: any) => MoonBit.Result<any, any>): MoonBit.Unit;

export function add_extern_fn(vm: any,
                              name: MoonBit.String,
                              func: (_arg0: any) => MoonBit.Result<any, any>): MoonBit.Unit;

export function eval_result_to_string(result: any): MoonBit.String;

export function create(log$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): any;

export function value_to_string(value: any): MoonBit.String;

export function value_to_json(value: any): MoonBit.String;

export function eval(self: any,
                     code: MoonBit.String,
                     log: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>,
                     top$46$opt: MoonBit.UnboxedOptionAsInt<MoonBit.Bool>): MoonBit.Result<any, any>;
