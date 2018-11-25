const Hook = require("./Hook");
const HookCodeFactory = require("./HookCodeFactory");

class SyncHookCodeFactory extends HookCodeFactory {
    content({
        onError, onResult, onDone, rethrowIfPossible
    }) {
        return this.callTapsSeries({
            onError: (i, err) => onError(err),
            onDone,
            rethrowIfPossible
        })
    }
}

const factory = new SyncHookCodeFactory();

class SyncHook extends Hook {
    compile(options) {
        factory.setup(this, options);
        return factory.create(options);
        // this.compile is called by Hook.js, inside this._createCall
        // this._createCall is called from the Object.defineProperties method
        // it lazily defines the this.call method.
        // factor.create(options) will return a function.

    }
}

module.exports = SyncHook;