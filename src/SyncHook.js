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
        factory.setup(this.options);
        return factory.create(options);
    }
}

module.exports = SyncHook;