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
    throw new Error("Abstract method: should be overriden");
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
    let _options;
    // Can pass string name to identify plugin
    // myCar.hooks.brake.tap("WarningLampPlugin")
    if (typeof options === "string") {
      _options = {
        name: options
      }
    }

    if (typeof options !== "object" || options === null) {
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
    _options = this._runRegisterInterceptors(options);
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

      return _options;
    });
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

  _insert(options) {

  }

  _resetCompilation() {
    this.call = this._call;
    this.callAsync = this._callAsync;
    this.promise = this._promise;
  }
}
