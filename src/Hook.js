"use strict";

class Hook {
  constructor(args) {
    if (!Array.isArray(args)) {
      args = [];
    }

    this._args = args;
    this.taps = [];
    // User can run code during parts of Hook lifecycle, such as "tap", "call", "register"
    // https://github.com/webpack/tapable#interception
    this.interceptors = [];
    this._x = undefined;

    // These are defined with Object.defineProperties
    // TODO: Find out why these are defined that way.
    this.call = this._call;
    this.promise = this._promise;
    this.callAsync = this._callAsync;
  }

  // An abstract method is a method that is declared, but contains no implementation. Abstract classes may not be instantiated, and require subclasses to provide implementations for the abstract methods
  compile(options) {
    // TODO: Typo in this line of code.
    // https://github.com/webpack/tapable/blob/master/lib/Hook.js#L20
    // throw new Error("Abstract method: should be overriden");
    return () => {
      options.taps.forEach(tap => {
        tap.fn(options.args);
      })
    } 
    // options.taps.forEach(tap => {
    // });
  }

  _createCall(type) {
    // TODO: What do the .compile overrides look like
    return this.compile({
      type,
      taps: this.taps,
      interceptors: this.interceptors,
      args: this._args
    });
  }

  tap(options, fn) {
    let _options = options;
    // Can pass string name to identify plugin
    // myCar.hooks.brake.tap("WarningLampPlugin")
    if (typeof _options === "string") {
      _options = {
        name: options
      }
    }

    if (typeof _options !== "object" || _options === null) {
      throw new Error("Invalid arguments to tap(options: Object, fn: function)")
    }

    // TODO: What other options does "tap" method accept. Can we pass in "type"?
    _options = Object.assign(
      { type: "sync", fn },
      _options
    );

    if (typeof _options.name !== "string" || _options.name === "") {
      throw new Error("Missing name for tap");
    }
    _options = this._runRegisterInterceptors(_options);
    this._insert(_options);
  }

  _runRegisterInterceptors(options) {
    let _options = Object.assign(options);

    this.interceptors.forEach(interceptor => {
      if (interceptor.register) {
        const newOptions = interceptor.register(_options);
        if (newOptions !== undefined) {
          _options = newOptions;
        }
      }
    });
    return _options;
  }

  isUsed() {
    return this.taps.length > 0 || this.interceptors.length > 0;
  }

  intercept(interceptor) {
    this._resetCompilation();

    this.interceptors.push(interceptor);
    if (interceptor.register) {
      this.taps.forEach((tap, index) => {
        // Run interceptor on all taps
        this.taps[index] = interceptor.register(tap);
      });
    }
  }

  _insert(item) {
    this._resetCompilation();

    let before;
    /*
      https://github.com/webpack/tapable/blob/fc6621083f40d3dc7fbb77a5d321e13c600b00c5/lib/__tests__/Hook.js
      Undocumented. You can specify a "tap" to come before others
      hook.tap("OldPlugin");
      hook.tap({ name: "NewPlugin", before: "OldPlugin" });

      Other undocumented options are "before", "stage"
    */

    if (typeof item.before === "string") {
      before = new Set([item.before]);
    } else if (Array.isArray(item.before)) {
      before = new Set(item.before);
    }

    // TODO: What is the stage used for?
    let stage = 0;
    if (typeof item.stage === "number") {
      stage = item.stage;
    }

    let i = this.taps.length;
    while (i > 0) {
      // TODO: We're moving the taps backwards? Could we not use unshift?
      i--;
      const currentTap = this.taps[i];
      this.taps[i + 1] = currentTap;

      const currentTapStage = currentTap.stage || 0;

      if (before) {
        if (before.has(currentTap.name)) {
          before.delete(currentTap.name);
          continue;
        }

        if (before.size > 0) {
          continue;
        }
      }

      if (currentTapStage > stage) {
        continue;
      }
      i++;
      break;
    }
    this.taps[i] = item;
  }

  _resetCompilation() {
    this.call = this._call;
    this.callAsync = this._callAsync;
    this.promise = this._promise;
  }
}

function createCompileDelegate(name, type) {
  return function lazyCompileHook(...args) {
    this[name] = this._createCall(type);
    return this[name](...args);
  }
}

Object.defineProperties(Hook.prototype, {
  _call: {
    value: createCompileDelegate("call", "sync"),
    configurable: true,
    writable: true
  },
  _promise: {
    value: createCompileDelegate("promise", "promise"),
    configurable: true,
    writable: true

  },
  _callAsync: {
    value: createCompileDelegate("callAsync", "async"),
    configurable: true,
    writable: true
  }
})

module.exports = Hook;