"use strict";

// The following methods are used inside the SyncHook
// factory.setup
// factory.create
class HookCodeFactory {
    constructor(config) {
        this.config = config;
        this.options = undefined;
        this._args = undefined;
    }

    create(options) {
        this.init(options);

        let fn;
        switch(this.options.type) {
            case "sync":
                // this.content is an abstract method.
                // it is implemented inside SyncHook.js
                fn = new Function(
                    this.args(),
                    `
                        "use strict"
                        ${this.header()}
                        ${this.content({
                            onError: err => `throw ${err};`,
                            onResult: result => `return ${result};`,
                            onDone: () => "",
                            rethrowIfPossible: true
                        })}
                    `
                );
                break;
            default:
                break;
        }
        this.deinit();
        return fn;
    }

    // This is used to join together arguments as a string
    // This can be used to pass the "context" object
    args({ before, after } = {}) {
        let allArgs = this._args;
        if (before) allArgs = [before].concat(allArgs);
        if (after) allArgs = allArgs.concat(after);
        if (allArgs.length === 0) {
            return "";
        } else {
            return allArgs.join();
        }
    }

    header() {
        let code = "";
        if (this.needContext()) {
            code += "var _context = {};\n";
        } else {
            code += "var _context;\n";
        }

        code += "var _x = this._x;\n";
        if (this.options.interceptors.length > 0) {
            code += "var _taps = this.taps;\n";
            code += "var _interceptors = this.interceptors;\n";
        }

        this.options.interceptors.forEach(interceptor => {
            // Interceptor call hooks are invoked here
            if (interceptor.call) {
                code += `${this.getInterceptor(i)}.call(${this.args({
                    before: interceptor.context ? "_context" : undefined
                })});\n`;
            }
        });

        return code;
    }

    getInterceptor(idx) {
        return `_interceptors[${idx}]`;
    }

    getTap(idx) {
        return `_taps[${idx}]`;
    }

    getTapFn(idx) {
        return `_x[${idx}]`;
    }

    needContext() {
        return this.options.taps.some(tap => typeof tap.context !== "undefined");
    }

    init(options) {
        this.options = options;
        this._args = options.args.slice();
    }

    setup(instance, options) {
        instance._x = options.taps.map(t => t.fn);
    }

    deinit() {
        this.options = undefined;
        this._args = undefined;
    }

    callTap(tapIndex, { onError, onResult, onDone, rethrowIfPossible }) {
        let code = "";
        let hasTapCached = false;

        this.options.interceptors.forEach(interceptor => {
            if (interceptor.tap) {
                // trigger interceptor.tap
                if (!hasTapCached) {
                    code += `var _tap${tapIndex} = ${this.getTap(tapIndex)};\n`;
                    hasTapCached = true;

                }
                code += `${this.getInterceptor(i)}.tap(${
                    interceptor.context ? "_context, " : ""
                }_tap${tapIndex});\n`;
            }
        });
        code += `var _fn${tapIndex} = ${this.getTapFn(tapIndex)};\n`;
        const tap = this.options.taps[tapIndex];
        switch (tap.type) {
            case "sync":
                // create dynamic code.
                if (!rethrowIfPossible) {
                    code += `var _hasError${tapIndex} = false;
                    try {\n`;
                }
                if (onResult) {
                    code += `var _results${tapIndex} = _fn${tapIndex}(${this.args({
                        before: tap.contenxt ? "_context" : undefined
                    })});\n`
                } else {
                    code += `_fn${tapIndex}(${this.args({
                        before: tap.context ? "_context" : undefined
                    })});\n`
                }
                if (!rethrowIfPossible) {
                    code += `} catch (_err) {
                        _hasError${tapIndex} = true;
                        ${onError("_err")}
                    }
                    if (!_hasError${tapIndex}) {\n
                    `;
                }

                if (onResult) {
                    code += onResult(`_results${tapIndex}`);
                }
                if (onDone) {
                    code += onDone();
                }

                if (!rethrowIfPossible) {
                    code += "}\n";
                }
            default:
        }

        return code;
    }

    callTapSeries({ onError, onResult, onDone, rethrowIfPossible }) {
        // this is called by this.content
        // this.content is an abstract method that must be overriden
        /* For sync hook, these are the options getting passed in
        onError: err => `throw ${err};`,
        onResult: result => `return ${result};`,
        onDone: () => "",
        */
        if (this.options.taps.length === 0) return onDone();

        // look for non-sync taps
        // this will be -1 if there is none found
        const firstAsync = this.options.taps.findIndex(t => t.type !== "sync");

        const next = i => {
            if (i >= this.options.taps.length) {
                // if there are no taps, return...
                // this seems uncessary; we are already doing this check on line 179
                return onDone();
            }

            const done = () => next(i + 1);
            const doneBreak = skipDone => {
                if (skipDone) return "";
                return onDone();
            };
            return this.callTap(i, {
                onError: error => onError(i, error, done, doneBreak),
                onResult:
                    onResult && (result => onResult(i, result, done, doneBreak)),
                onDone: !onResult && done,
                rethrowIfPossible: rethrowIfPossible && (firstAsync < 0 || i < firstAsync)
            });
        };
        return next(0);
    }

}

module.exports = HookCodeFactory;