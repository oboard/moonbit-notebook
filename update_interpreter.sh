#!/bin/bash

cd ../moonbit-eval
moon build --target js --release
cp target/js/release/build/moonbit-eval.js ../moonbit-notebook/src/interpreter
cp target/js/release/build/moonbit-eval.d.ts ../moonbit-notebook/src/interpreter
