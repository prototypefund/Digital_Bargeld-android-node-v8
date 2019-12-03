'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var crypto = _interopDefault(require('crypto'));
var http = _interopDefault(require('http'));
var https = _interopDefault(require('https'));
var url = _interopDefault(require('url'));
var assert = _interopDefault(require('assert'));
var stream = _interopDefault(require('stream'));
var tty = _interopDefault(require('tty'));
var util = _interopDefault(require('util'));
var os = _interopDefault(require('os'));
var zlib = _interopDefault(require('zlib'));
var querystring = _interopDefault(require('querystring'));
var fs = _interopDefault(require('fs'));

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

function getCjsExportFromNamespace (n) {
	return n && n['default'] || n;
}

var timer = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
class IntervalHandle {
    constructor(h) {
        this.h = h;
    }
    clear() {
        clearInterval(this.h);
    }
}
class TimeoutHandle {
    constructor(h) {
        this.h = h;
    }
    clear() {
        clearTimeout(this.h);
    }
}
/**
 * Get a performance counter in milliseconds.
 */
exports.performanceNow = (() => {
    if (typeof process !== "undefined" && process.hrtime) {
        return () => {
            const t = process.hrtime();
            return t[0] * 1e9 + t[1];
        };
    }
    else {
        return () => performance.now();
    }
})();
/**
 * Call a function every time the delay given in milliseconds passes.
 */
function every(delayMs, callback) {
    return new IntervalHandle(setInterval(callback, delayMs));
}
exports.every = every;
/**
 * Call a function after the delay given in milliseconds passes.
 */
function after(delayMs, callback) {
    return new TimeoutHandle(setTimeout(callback, delayMs));
}
exports.after = after;
const nullTimerHandle = {
    clear() {
        // do nothing
        return;
    },
};
/**
 * Group of timers that can be destroyed at once.
 */
class TimerGroup {
    constructor() {
        this.stopped = false;
        this.timerMap = {};
        this.idGen = 1;
    }
    stopCurrentAndFutureTimers() {
        this.stopped = true;
        for (const x in this.timerMap) {
            if (!this.timerMap.hasOwnProperty(x)) {
                continue;
            }
            this.timerMap[x].clear();
            delete this.timerMap[x];
        }
    }
    resolveAfter(delayMs) {
        return new Promise((resolve, reject) => {
            this.after(delayMs, () => {
                resolve();
            });
        });
    }
    after(delayMs, callback) {
        if (this.stopped) {
            console.warn("dropping timer since timer group is stopped");
            return nullTimerHandle;
        }
        const h = after(delayMs, callback);
        const myId = this.idGen++;
        this.timerMap[myId] = h;
        const tm = this.timerMap;
        return {
            clear() {
                h.clear();
                delete tm[myId];
            },
        };
    }
    every(delayMs, callback) {
        if (this.stopped) {
            console.warn("dropping timer since timer group is stopped");
            return nullTimerHandle;
        }
        const h = every(delayMs, callback);
        const myId = this.idGen++;
        this.timerMap[myId] = h;
        const tm = this.timerMap;
        return {
            clear() {
                h.clear();
                delete tm[myId];
            },
        };
    }
}
exports.TimerGroup = TimerGroup;

});

unwrapExports(timer);
var timer_1 = timer.performanceNow;
var timer_2 = timer.every;
var timer_3 = timer.after;
var timer_4 = timer.TimerGroup;

var cryptoApi = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const timer$1 = __importStar(timer);
/**
 * Number of different priorities. Each priority p
 * must be 0 <= p < NUM_PRIO.
 */
const NUM_PRIO = 5;
class BrowserCryptoWorkerFactory {
    startWorker() {
        const workerCtor = Worker;
        const workerPath = "/dist/cryptoWorker-bundle.js";
        return new workerCtor(workerPath);
    }
    getConcurrency() {
        let concurrency = 2;
        try {
            // only works in the browser
            // tslint:disable-next-line:no-string-literal
            concurrency = navigator["hardwareConcurrency"];
            concurrency = Math.max(1, Math.ceil(concurrency / 2));
        }
        catch (e) {
            concurrency = 2;
        }
        return concurrency;
    }
}
exports.BrowserCryptoWorkerFactory = BrowserCryptoWorkerFactory;
/**
 * Crypto API that interfaces manages a background crypto thread
 * for the execution of expensive operations.
 */
class CryptoApi {
    constructor(workerFactory) {
        this.nextRpcId = 1;
        /**
         * Number of busy workers.
         */
        this.numBusy = 0;
        /**
         * Did we stop accepting new requests?
         */
        this.stopped = false;
        this.workerFactory = workerFactory;
        this.workers = new Array(workerFactory.getConcurrency());
        for (let i = 0; i < this.workers.length; i++) {
            this.workers[i] = {
                currentWorkItem: null,
                terminationTimerHandle: null,
                w: null,
            };
        }
        this.workQueues = [];
        for (let i = 0; i < NUM_PRIO; i++) {
            this.workQueues.push([]);
        }
    }
    /**
     * Terminate all worker threads.
     */
    terminateWorkers() {
        for (let worker of this.workers) {
            if (worker.w) {
                CryptoApi.enableTracing && console.log("terminating worker");
                worker.w.terminate();
                if (worker.terminationTimerHandle) {
                    worker.terminationTimerHandle.clear();
                    worker.terminationTimerHandle = null;
                }
                if (worker.currentWorkItem) {
                    worker.currentWorkItem.reject(Error("explicitly terminated"));
                    worker.currentWorkItem = null;
                }
                worker.w = null;
            }
        }
    }
    stop() {
        this.terminateWorkers();
        this.stopped = true;
    }
    /**
     * Start a worker (if not started) and set as busy.
     */
    wake(ws, work) {
        if (this.stopped) {
            console.log("cryptoApi is stopped");
            CryptoApi.enableTracing && console.log("not waking, as cryptoApi is stopped");
            return;
        }
        if (ws.currentWorkItem !== null) {
            throw Error("assertion failed");
        }
        ws.currentWorkItem = work;
        this.numBusy++;
        if (!ws.w) {
            const w = this.workerFactory.startWorker();
            w.onmessage = (m) => this.handleWorkerMessage(ws, m);
            w.onerror = (e) => this.handleWorkerError(ws, e);
            ws.w = w;
        }
        const msg = {
            args: work.args,
            id: work.rpcId,
            operation: work.operation,
        };
        this.resetWorkerTimeout(ws);
        work.startTime = timer$1.performanceNow();
        setImmediate(() => ws.w.postMessage(msg));
    }
    resetWorkerTimeout(ws) {
        if (ws.terminationTimerHandle !== null) {
            ws.terminationTimerHandle.clear();
            ws.terminationTimerHandle = null;
        }
        const destroy = () => {
            // terminate worker if it's idle
            if (ws.w && ws.currentWorkItem === null) {
                ws.w.terminate();
                ws.w = null;
            }
        };
        ws.terminationTimerHandle = timer$1.after(15 * 1000, destroy);
    }
    handleWorkerError(ws, e) {
        if (ws.currentWorkItem) {
            console.error(`error in worker during ${ws.currentWorkItem.operation}`, e);
        }
        else {
            console.error("error in worker", e);
        }
        console.error(e.message);
        try {
            ws.w.terminate();
            ws.w = null;
        }
        catch (e) {
            console.error(e);
        }
        if (ws.currentWorkItem !== null) {
            ws.currentWorkItem.reject(e);
            ws.currentWorkItem = null;
            this.numBusy--;
        }
        this.findWork(ws);
    }
    findWork(ws) {
        // try to find more work for this worker
        for (let i = 0; i < NUM_PRIO; i++) {
            const q = this.workQueues[NUM_PRIO - i - 1];
            if (q.length !== 0) {
                const work = q.shift();
                this.wake(ws, work);
                return;
            }
        }
    }
    handleWorkerMessage(ws, msg) {
        const id = msg.data.id;
        if (typeof id !== "number") {
            console.error("rpc id must be number");
            return;
        }
        const currentWorkItem = ws.currentWorkItem;
        ws.currentWorkItem = null;
        this.numBusy--;
        this.findWork(ws);
        if (!currentWorkItem) {
            console.error("unsolicited response from worker");
            return;
        }
        if (id !== currentWorkItem.rpcId) {
            console.error(`RPC with id ${id} has no registry entry`);
            return;
        }
        CryptoApi.enableTracing &&
            console.log(`rpc ${currentWorkItem.operation} took ${timer$1.performanceNow() -
                currentWorkItem.startTime}ms`);
        currentWorkItem.resolve(msg.data.result);
    }
    doRpc(operation, priority, ...args) {
        const p = new Promise((resolve, reject) => {
            const rpcId = this.nextRpcId++;
            const workItem = {
                operation,
                args,
                resolve,
                reject,
                rpcId,
                startTime: 0,
            };
            if (this.numBusy === this.workers.length) {
                const q = this.workQueues[priority];
                if (!q) {
                    throw Error("assertion failed");
                }
                this.workQueues[priority].push(workItem);
                return;
            }
            for (const ws of this.workers) {
                if (ws.currentWorkItem !== null) {
                    continue;
                }
                this.wake(ws, workItem);
                return;
            }
            throw Error("assertion failed");
        });
        return p;
    }
    createPlanchet(req) {
        return this.doRpc("createPlanchet", 1, req);
    }
    createTipPlanchet(denom) {
        return this.doRpc("createTipPlanchet", 1, denom);
    }
    hashString(str) {
        return this.doRpc("hashString", 1, str);
    }
    hashDenomPub(denomPub) {
        return this.doRpc("hashDenomPub", 1, denomPub);
    }
    isValidDenom(denom, masterPub) {
        return this.doRpc("isValidDenom", 2, denom, masterPub);
    }
    isValidWireFee(type, wf, masterPub) {
        return this.doRpc("isValidWireFee", 2, type, wf, masterPub);
    }
    isValidPaymentSignature(sig, contractHash, merchantPub) {
        return this.doRpc("isValidPaymentSignature", 1, sig, contractHash, merchantPub);
    }
    signDeposit(contractTerms, cds, totalAmount) {
        return this.doRpc("signDeposit", 3, contractTerms, cds, totalAmount);
    }
    createEddsaKeypair() {
        return this.doRpc("createEddsaKeypair", 1);
    }
    rsaUnblind(sig, bk, pk) {
        return this.doRpc("rsaUnblind", 4, sig, bk, pk);
    }
    createPaybackRequest(coin) {
        return this.doRpc("createPaybackRequest", 1, coin);
    }
    createRefreshSession(exchangeBaseUrl, kappa, meltCoin, newCoinDenoms, meltFee) {
        return this.doRpc("createRefreshSession", 4, exchangeBaseUrl, kappa, meltCoin, newCoinDenoms, meltFee);
    }
    signCoinLink(oldCoinPriv, newDenomHash, oldCoinPub, transferPub, coinEv) {
        return this.doRpc("signCoinLink", 4, oldCoinPriv, newDenomHash, oldCoinPub, transferPub, coinEv);
    }
    benchmark(repetitions) {
        return this.doRpc("benchmark", 1, repetitions);
    }
}
exports.CryptoApi = CryptoApi;
CryptoApi.enableTracing = false;

});

unwrapExports(cryptoApi);
var cryptoApi_1 = cryptoApi.BrowserCryptoWorkerFactory;
var cryptoApi_2 = cryptoApi.CryptoApi;

var promiseUtils = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Get an unresolved promise together with its extracted resolve / reject
 * function.
 */
function openPromise() {
    let resolve = null;
    let reject = null;
    const promise = new Promise((res, rej) => {
        resolve = res;
        reject = rej;
    });
    if (!(resolve && reject)) {
        // Never happens, unless JS implementation is broken
        throw Error();
    }
    return { resolve, reject, promise };
}
exports.openPromise = openPromise;
class AsyncCondition {
    constructor() {
        const op = openPromise();
        this._waitPromise = op.promise;
        this._resolveWaitPromise = op.resolve;
    }
    wait() {
        return this._waitPromise;
    }
    trigger() {
        this._resolveWaitPromise();
        const op = openPromise();
        this._waitPromise = op.promise;
        this._resolveWaitPromise = op.resolve;
    }
}
exports.AsyncCondition = AsyncCondition;

});

unwrapExports(promiseUtils);
var promiseUtils_1 = promiseUtils.openPromise;
var promiseUtils_2 = promiseUtils.AsyncCondition;

var query = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Database query abstractions.
 * @module Query
 * @author Florian Dold
 */
/**
 * Imports.
 */

/**
 * Definition of an object store.
 */
class Store {
    constructor(name, storeParams, validator) {
        this.name = name;
        this.storeParams = storeParams;
        this.validator = validator;
    }
}
exports.Store = Store;
function requestToPromise(req) {
    const stack = Error("Failed request was started here.");
    return new Promise((resolve, reject) => {
        req.onsuccess = () => {
            resolve(req.result);
        };
        req.onerror = () => {
            console.log("error in DB request", req.error);
            reject(req.error);
            console.log("Request failed:", stack);
        };
    });
}
function transactionToPromise(tx) {
    const stack = Error("Failed transaction was started here.");
    return new Promise((resolve, reject) => {
        tx.onabort = () => {
            reject(exports.TransactionAbort);
        };
        tx.oncomplete = () => {
            resolve();
        };
        tx.onerror = () => {
            console.error("Transaction failed:", stack);
            reject(tx.error);
        };
    });
}
function oneShotGet(db, store, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = db.transaction([store.name], "readonly");
        const req = tx.objectStore(store.name).get(key);
        const v = yield requestToPromise(req);
        yield transactionToPromise(tx);
        return v;
    });
}
exports.oneShotGet = oneShotGet;
function oneShotGetIndexed(db, index, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = db.transaction([index.storeName], "readonly");
        const req = tx
            .objectStore(index.storeName)
            .index(index.indexName)
            .get(key);
        const v = yield requestToPromise(req);
        yield transactionToPromise(tx);
        return v;
    });
}
exports.oneShotGetIndexed = oneShotGetIndexed;
function oneShotPut(db, store, value, key) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = db.transaction([store.name], "readwrite");
        const req = tx.objectStore(store.name).put(value, key);
        const v = yield requestToPromise(req);
        yield transactionToPromise(tx);
        return v;
    });
}
exports.oneShotPut = oneShotPut;
function applyMutation(req, f) {
    return new Promise((resolve, reject) => {
        req.onsuccess = () => {
            const cursor = req.result;
            if (cursor) {
                const val = cursor.value;
                const modVal = f(val);
                if (modVal !== undefined && modVal !== null) {
                    const req2 = cursor.update(modVal);
                    req2.onerror = () => {
                        reject(req2.error);
                    };
                    req2.onsuccess = () => {
                        cursor.continue();
                    };
                }
                else {
                    cursor.continue();
                }
            }
            else {
                resolve();
            }
        };
        req.onerror = () => {
            reject(req.error);
        };
    });
}
function oneShotMutate(db, store, key, f) {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = db.transaction([store.name], "readwrite");
        const req = tx.objectStore(store.name).openCursor(key);
        yield applyMutation(req, f);
        yield transactionToPromise(tx);
    });
}
exports.oneShotMutate = oneShotMutate;
class ResultStream {
    constructor(req) {
        this.req = req;
        this.gotCursorEnd = false;
        this.awaitingResult = false;
        this.awaitingResult = true;
        let p = promiseUtils.openPromise();
        this.currentPromise = p.promise;
        req.onsuccess = () => {
            if (!this.awaitingResult) {
                throw Error("BUG: invariant violated");
            }
            const cursor = req.result;
            if (cursor) {
                this.awaitingResult = false;
                p.resolve();
                p = promiseUtils.openPromise();
                this.currentPromise = p.promise;
            }
            else {
                this.gotCursorEnd = true;
                p.resolve();
            }
        };
        req.onerror = () => {
            p.reject(req.error);
        };
    }
    toArray() {
        return __awaiter(this, void 0, void 0, function* () {
            const arr = [];
            while (true) {
                const x = yield this.next();
                if (x.hasValue) {
                    arr.push(x.value);
                }
                else {
                    break;
                }
            }
            return arr;
        });
    }
    map(f) {
        return __awaiter(this, void 0, void 0, function* () {
            const arr = [];
            while (true) {
                const x = yield this.next();
                if (x.hasValue) {
                    arr.push(f(x.value));
                }
                else {
                    break;
                }
            }
            return arr;
        });
    }
    forEach(f) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                const x = yield this.next();
                if (x.hasValue) {
                    f(x.value);
                }
                else {
                    break;
                }
            }
        });
    }
    filter(f) {
        return __awaiter(this, void 0, void 0, function* () {
            const arr = [];
            while (true) {
                const x = yield this.next();
                if (x.hasValue) {
                    if (f(x.value)) {
                        arr.push(x.value);
                    }
                }
                else {
                    break;
                }
            }
            return arr;
        });
    }
    next() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.gotCursorEnd) {
                return { hasValue: false };
            }
            if (!this.awaitingResult) {
                const cursor = this.req.result;
                if (!cursor) {
                    throw Error("assertion failed");
                }
                this.awaitingResult = true;
                cursor.continue();
            }
            yield this.currentPromise;
            if (this.gotCursorEnd) {
                return { hasValue: false };
            }
            const cursor = this.req.result;
            if (!cursor) {
                throw Error("assertion failed");
            }
            return { hasValue: true, value: cursor.value };
        });
    }
}
function oneShotIter(db, store) {
    const tx = db.transaction([store.name], "readonly");
    const req = tx.objectStore(store.name).openCursor();
    return new ResultStream(req);
}
exports.oneShotIter = oneShotIter;
function oneShotIterIndex(db, index, query) {
    const tx = db.transaction([index.storeName], "readonly");
    const req = tx
        .objectStore(index.storeName)
        .index(index.indexName)
        .openCursor(query);
    return new ResultStream(req);
}
exports.oneShotIterIndex = oneShotIterIndex;
class TransactionHandle {
    constructor(tx) {
        this.tx = tx;
    }
    put(store, value, key) {
        const req = this.tx.objectStore(store.name).put(value, key);
        return requestToPromise(req);
    }
    add(store, value, key) {
        const req = this.tx.objectStore(store.name).add(value, key);
        return requestToPromise(req);
    }
    get(store, key) {
        const req = this.tx.objectStore(store.name).get(key);
        return requestToPromise(req);
    }
    getIndexed(index, key) {
        const req = this.tx
            .objectStore(index.storeName)
            .index(index.indexName)
            .get(key);
        return requestToPromise(req);
    }
    iter(store, key) {
        const req = this.tx.objectStore(store.name).openCursor(key);
        return new ResultStream(req);
    }
    delete(store, key) {
        const req = this.tx.objectStore(store.name).delete(key);
        return requestToPromise(req);
    }
    mutate(store, key, f) {
        const req = this.tx.objectStore(store.name).openCursor(key);
        return applyMutation(req, f);
    }
}
function runWithReadTransaction(db, stores, f) {
    return runWithTransaction(db, stores, f, "readonly");
}
exports.runWithReadTransaction = runWithReadTransaction;
function runWithWriteTransaction(db, stores, f) {
    return runWithTransaction(db, stores, f, "readwrite");
}
exports.runWithWriteTransaction = runWithWriteTransaction;
function runWithTransaction(db, stores, f, mode) {
    const stack = Error("Failed transaction was started here.");
    return new Promise((resolve, reject) => {
        const storeName = stores.map(x => x.name);
        const tx = db.transaction(storeName, mode);
        let funResult = undefined;
        let gotFunResult = false;
        tx.oncomplete = () => {
            // This is a fatal error: The transaction completed *before*
            // the transaction function returned.  Likely, the transaction
            // function waited on a promise that is *not* resolved in the
            // microtask queue, thus triggering the auto-commit behavior.
            // Unfortunately, the auto-commit behavior of IDB can't be switched
            // of.  There are some proposals to add this functionality in the future.
            if (!gotFunResult) {
                const msg = "BUG: transaction closed before transaction function returned";
                console.error(msg);
                reject(Error(msg));
            }
            resolve(funResult);
        };
        tx.onerror = () => {
            console.error("error in transaction");
        };
        tx.onabort = () => {
            if (tx.error) {
                console.error("Transaction aborted with error:", tx.error);
            }
            else {
                console.log("Trasaction aborted (no error)");
            }
            reject(exports.TransactionAbort);
        };
        const th = new TransactionHandle(tx);
        const resP = f(th);
        resP
            .then(result => {
            gotFunResult = true;
            funResult = result;
        })
            .catch(e => {
            if (e == exports.TransactionAbort) {
                console.info("aborting transaction");
            }
            else {
                tx.abort();
                console.error("Transaction failed:", e);
                console.error(stack);
            }
        });
    });
}
/**
 * Definition of an index.
 */
class Index {
    constructor(s, indexName, keyPath, options) {
        this.indexName = indexName;
        this.keyPath = keyPath;
        const defaultOptions = {
            multiEntry: false,
        };
        this.options = Object.assign(Object.assign({}, defaultOptions), (options || {}));
        this.storeName = s.name;
    }
}
exports.Index = Index;
/**
 * Exception that should be thrown by client code to abort a transaction.
 */
exports.TransactionAbort = Symbol("transaction_abort");

});

unwrapExports(query);
var query_1 = query.Store;
var query_2 = query.oneShotGet;
var query_3 = query.oneShotGetIndexed;
var query_4 = query.oneShotPut;
var query_5 = query.oneShotMutate;
var query_6 = query.oneShotIter;
var query_7 = query.oneShotIterIndex;
var query_8 = query.runWithReadTransaction;
var query_9 = query.runWithWriteTransaction;
var query_10 = query.Index;
var query_11 = query.TransactionAbort;

var checkable = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Decorators for validating JSON objects and converting them to a typed
 * object.
 *
 * The decorators are put onto classes, and the validation is done
 * via a static method that is filled in by the annotation.
 *
 * Example:
 * ```
 *  @Checkable.Class
 *  class Person {
 *    @Checkable.String
 *    name: string;
 *    @Checkable.Number
 *    age: number;
 *
 *    // Method will be implemented automatically
 *    static checked(obj: any): Person;
 *  }
 * ```
 */
var Checkable;
(function (Checkable) {
    // tslint:disable-next-line:no-shadowed-variable
    Checkable.SchemaError = (function SchemaError(message) {
        const that = this;
        that.name = "SchemaError";
        that.message = message;
        that.stack = new Error().stack;
    });
    Checkable.SchemaError.prototype = new Error();
    /**
     * Classes that are checkable are annotated with this
     * checkable info symbol, which contains the information necessary
     * to check if they're valid.
     */
    const checkableInfoSym = Symbol("checkableInfo");
    /**
     * Get the current property list for a checkable type.
     */
    function getCheckableInfo(target) {
        let chk = target[checkableInfoSym];
        if (!chk) {
            chk = { props: [], extraAllowed: false };
            target[checkableInfoSym] = chk;
        }
        return chk;
    }
    function checkNumber(target, prop, path) {
        if ((typeof target) !== "number") {
            throw new Checkable.SchemaError(`expected number for ${path}`);
        }
        return target;
    }
    function checkString(target, prop, path) {
        if (typeof target !== "string") {
            throw new Checkable.SchemaError(`expected string for ${path}, got ${typeof target} instead`);
        }
        if (prop.stringChecker && !prop.stringChecker(target)) {
            throw new Checkable.SchemaError(`string property ${path} malformed`);
        }
        return target;
    }
    function checkBoolean(target, prop, path) {
        if (typeof target !== "boolean") {
            throw new Checkable.SchemaError(`expected boolean for ${path}, got ${typeof target} instead`);
        }
        return target;
    }
    function checkAnyObject(target, prop, path) {
        if (typeof target !== "object") {
            throw new Checkable.SchemaError(`expected (any) object for ${path}, got ${typeof target} instead`);
        }
        return target;
    }
    function checkAny(target, prop, path) {
        return target;
    }
    function checkList(target, prop, path) {
        if (!Array.isArray(target)) {
            throw new Checkable.SchemaError(`array expected for ${path}, got ${typeof target} instead`);
        }
        for (let i = 0; i < target.length; i++) {
            const v = target[i];
            prop.elementChecker(v, prop.elementProp, path.concat([i]));
        }
        return target;
    }
    function checkMap(target, prop, path) {
        if (typeof target !== "object") {
            throw new Checkable.SchemaError(`expected object for ${path}, got ${typeof target} instead`);
        }
        for (const key in target) {
            prop.keyProp.checker(key, prop.keyProp, path.concat([key]));
            const value = target[key];
            prop.valueProp.checker(value, prop.valueProp, path.concat([key]));
        }
        return target;
    }
    function checkOptional(target, prop, path) {
        console.assert(prop.propertyKey);
        prop.elementChecker(target, prop.elementProp, path.concat([prop.propertyKey]));
        return target;
    }
    function checkValue(target, prop, path) {
        let type;
        if (prop.type) {
            type = prop.type;
        }
        else if (prop.typeThunk) {
            type = prop.typeThunk();
            if (!type) {
                throw Error(`assertion failed: typeThunk returned null (prop is ${JSON.stringify(prop)})`);
            }
        }
        else {
            throw Error(`assertion failed: type/typeThunk missing (prop is ${JSON.stringify(prop)})`);
        }
        const typeName = type.name || "??";
        const v = target;
        if (!v || typeof v !== "object") {
            throw new Checkable.SchemaError(`expected object for ${path.join(".")}, got ${typeof v} instead`);
        }
        const chk = type.prototype[checkableInfoSym];
        const props = chk.props;
        const remainingPropNames = new Set(Object.getOwnPropertyNames(v));
        const obj = new type();
        for (const innerProp of props) {
            if (!remainingPropNames.has(innerProp.propertyKey)) {
                if (innerProp.optional) {
                    continue;
                }
                throw new Checkable.SchemaError(`Property '${innerProp.propertyKey}' missing on '${path}' of '${typeName}'`);
            }
            if (!remainingPropNames.delete(innerProp.propertyKey)) {
                throw new Checkable.SchemaError("assertion failed");
            }
            const propVal = v[innerProp.propertyKey];
            obj[innerProp.propertyKey] = innerProp.checker(propVal, innerProp, path.concat([innerProp.propertyKey]));
        }
        if (!chk.extraAllowed && remainingPropNames.size !== 0) {
            const err = `superfluous properties ${JSON.stringify(Array.from(remainingPropNames.values()))} of ${typeName}`;
            throw new Checkable.SchemaError(err);
        }
        return obj;
    }
    /**
     * Class with checkable annotations on fields.
     * This annotation adds the implementation of the `checked`
     * static method.
     */
    function Class(opts = {}) {
        return (target) => {
            const chk = getCheckableInfo(target.prototype);
            chk.extraAllowed = !!opts.extra;
            target.checked = (v) => {
                const cv = checkValue(v, {
                    checker: checkValue,
                    propertyKey: "(root)",
                    type: target,
                }, ["(root)"]);
                if (opts.validate) {
                    if (typeof target.validate !== "function") {
                        throw Error("invalid Checkable annotion: validate method required");
                    }
                    // May throw exception
                    target.validate(cv);
                }
                return cv;
            };
            return target;
        };
    }
    Checkable.Class = Class;
    /**
     * Target property must be a Checkable object of the given type.
     */
    function Value(typeThunk) {
        function deco(target, propertyKey) {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkValue,
                propertyKey,
                typeThunk,
            });
        }
        return deco;
    }
    Checkable.Value = Value;
    /**
     * List of values that match the given annotation.  For example, `@Checkable.List(Checkable.String)` is
     * an annotation for a list of strings.
     */
    function List(type) {
        const stub = {};
        type(stub, "(list-element)");
        const elementProp = getCheckableInfo(stub).props[0];
        const elementChecker = elementProp.checker;
        if (!elementChecker) {
            throw Error("assertion failed");
        }
        function deco(target, propertyKey) {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkList,
                elementChecker,
                elementProp,
                propertyKey,
            });
        }
        return deco;
    }
    Checkable.List = List;
    /**
     * Map from the key type to value type.  Takes two annotations,
     * one for the key type and one for the value type.
     */
    function Map(keyType, valueType) {
        const keyStub = {};
        keyType(keyStub, "(map-key)");
        const keyProp = getCheckableInfo(keyStub).props[0];
        if (!keyProp) {
            throw Error("assertion failed");
        }
        const valueStub = {};
        valueType(valueStub, "(map-value)");
        const valueProp = getCheckableInfo(valueStub).props[0];
        if (!valueProp) {
            throw Error("assertion failed");
        }
        function deco(target, propertyKey) {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkMap,
                keyProp,
                propertyKey,
                valueProp,
            });
        }
        return deco;
    }
    Checkable.Map = Map;
    /**
     * Makes another annotation optional, for example `@Checkable.Optional(Checkable.Number)`.
     */
    function Optional(type) {
        const stub = {};
        type(stub, "(optional-element)");
        const elementProp = getCheckableInfo(stub).props[0];
        const elementChecker = elementProp.checker;
        if (!elementChecker) {
            throw Error("assertion failed");
        }
        function deco(target, propertyKey) {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkOptional,
                elementChecker,
                elementProp,
                optional: true,
                propertyKey,
            });
        }
        return deco;
    }
    Checkable.Optional = Optional;
    /**
     * Target property must be a number.
     */
    function Number() {
        const deco = (target, propertyKey) => {
            const chk = getCheckableInfo(target);
            chk.props.push({ checker: checkNumber, propertyKey });
        };
        return deco;
    }
    Checkable.Number = Number;
    /**
     * Target property must be an arbitary object.
     */
    function AnyObject() {
        const deco = (target, propertyKey) => {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkAnyObject,
                propertyKey,
            });
        };
        return deco;
    }
    Checkable.AnyObject = AnyObject;
    /**
     * Target property can be anything.
     *
     * Not useful by itself, but in combination with higher-order annotations
     * such as List or Map.
     */
    function Any() {
        const deco = (target, propertyKey) => {
            const chk = getCheckableInfo(target);
            chk.props.push({
                checker: checkAny,
                optional: true,
                propertyKey,
            });
        };
        return deco;
    }
    Checkable.Any = Any;
    /**
     * Target property must be a string.
     */
    function String(stringChecker) {
        const deco = (target, propertyKey) => {
            const chk = getCheckableInfo(target);
            chk.props.push({ checker: checkString, propertyKey, stringChecker });
        };
        return deco;
    }
    Checkable.String = String;
    /**
     * Target property must be a boolean value.
     */
    function Boolean() {
        const deco = (target, propertyKey) => {
            const chk = getCheckableInfo(target);
            chk.props.push({ checker: checkBoolean, propertyKey });
        };
        return deco;
    }
    Checkable.Boolean = Boolean;
})(Checkable = exports.Checkable || (exports.Checkable = {}));

});

unwrapExports(checkable);
var checkable_1 = checkable.Checkable;

var amounts = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Types and helper functions for dealing with Taler amounts.
 */
/**
 * Imports.
 */

/**
 * Number of fractional units that one value unit represents.
 */
exports.fractionalBase = 1e8;
/**
 * How many digits behind the comma are required to represent the
 * fractional value in human readable decimal format?  Must match
 * lg(fractionalBase)
 */
exports.fractionalLength = 8;
/**
 * Maximum allowed value field of an amount.
 */
exports.maxAmountValue = Math.pow(2, 52);
/**
 * Non-negative financial amount.  Fractional values are expressed as multiples
 * of 1e-8.
 */
let AmountJson = class AmountJson {
};
__decorate([
    checkable.Checkable.Number()
], AmountJson.prototype, "value", void 0);
__decorate([
    checkable.Checkable.Number()
], AmountJson.prototype, "fraction", void 0);
__decorate([
    checkable.Checkable.String()
], AmountJson.prototype, "currency", void 0);
AmountJson = __decorate([
    checkable.Checkable.Class()
], AmountJson);
exports.AmountJson = AmountJson;
/**
 * Get an amount that represents zero units of a currency.
 */
function getZero(currency) {
    return {
        currency,
        fraction: 0,
        value: 0,
    };
}
exports.getZero = getZero;
function sum(amounts) {
    if (amounts.length <= 0) {
        throw Error("can't sum zero amounts");
    }
    return add(amounts[0], ...amounts.slice(1));
}
exports.sum = sum;
/**
 * Add two amounts.  Return the result and whether
 * the addition overflowed.  The overflow is always handled
 * by saturating and never by wrapping.
 *
 * Throws when currencies don't match.
 */
function add(first, ...rest) {
    const currency = first.currency;
    let value = first.value + Math.floor(first.fraction / exports.fractionalBase);
    if (value > exports.maxAmountValue) {
        return {
            amount: { currency, value: exports.maxAmountValue, fraction: exports.fractionalBase - 1 },
            saturated: true
        };
    }
    let fraction = first.fraction % exports.fractionalBase;
    for (const x of rest) {
        if (x.currency !== currency) {
            throw Error(`Mismatched currency: ${x.currency} and ${currency}`);
        }
        value = value + x.value + Math.floor((fraction + x.fraction) / exports.fractionalBase);
        fraction = Math.floor((fraction + x.fraction) % exports.fractionalBase);
        if (value > exports.maxAmountValue) {
            return {
                amount: { currency, value: exports.maxAmountValue, fraction: exports.fractionalBase - 1 },
                saturated: true
            };
        }
    }
    return { amount: { currency, value, fraction }, saturated: false };
}
exports.add = add;
/**
 * Subtract two amounts.  Return the result and whether
 * the subtraction overflowed.  The overflow is always handled
 * by saturating and never by wrapping.
 *
 * Throws when currencies don't match.
 */
function sub(a, ...rest) {
    const currency = a.currency;
    let value = a.value;
    let fraction = a.fraction;
    for (const b of rest) {
        if (b.currency !== currency) {
            throw Error(`Mismatched currency: ${b.currency} and ${currency}`);
        }
        if (fraction < b.fraction) {
            if (value < 1) {
                return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
            }
            value--;
            fraction += exports.fractionalBase;
        }
        console.assert(fraction >= b.fraction);
        fraction -= b.fraction;
        if (value < b.value) {
            return { amount: { currency, value: 0, fraction: 0 }, saturated: true };
        }
        value -= b.value;
    }
    return { amount: { currency, value, fraction }, saturated: false };
}
exports.sub = sub;
/**
 * Compare two amounts.  Returns 0 when equal, -1 when a < b
 * and +1 when a > b.  Throws when currencies don't match.
 */
function cmp(a, b) {
    if (a.currency !== b.currency) {
        throw Error(`Mismatched currency: ${a.currency} and ${b.currency}`);
    }
    const av = a.value + Math.floor(a.fraction / exports.fractionalBase);
    const af = a.fraction % exports.fractionalBase;
    const bv = b.value + Math.floor(b.fraction / exports.fractionalBase);
    const bf = b.fraction % exports.fractionalBase;
    switch (true) {
        case av < bv:
            return -1;
        case av > bv:
            return 1;
        case af < bf:
            return -1;
        case af > bf:
            return 1;
        case af === bf:
            return 0;
        default:
            throw Error("assertion failed");
    }
}
exports.cmp = cmp;
/**
 * Create a copy of an amount.
 */
function copy(a) {
    return {
        currency: a.currency,
        fraction: a.fraction,
        value: a.value,
    };
}
exports.copy = copy;
/**
 * Divide an amount.  Throws on division by zero.
 */
function divide(a, n) {
    if (n === 0) {
        throw Error(`Division by 0`);
    }
    if (n === 1) {
        return { value: a.value, fraction: a.fraction, currency: a.currency };
    }
    const r = a.value % n;
    return {
        currency: a.currency,
        fraction: Math.floor(((r * exports.fractionalBase) + a.fraction) / n),
        value: Math.floor(a.value / n),
    };
}
exports.divide = divide;
/**
 * Check if an amount is non-zero.
 */
function isNonZero(a) {
    return a.value > 0 || a.fraction > 0;
}
exports.isNonZero = isNonZero;
/**
 * Parse an amount like 'EUR:20.5' for 20 Euros and 50 ct.
 */
function parse(s) {
    const res = s.match(/^([a-zA-Z0-9_*-]+):([0-9]+)([.][0-9]+)?$/);
    if (!res) {
        return undefined;
    }
    const tail = res[3] || ".0";
    if (tail.length > exports.fractionalLength + 1) {
        return undefined;
    }
    let value = Number.parseInt(res[2]);
    if (value > exports.maxAmountValue) {
        return undefined;
    }
    return {
        currency: res[1],
        fraction: Math.round(exports.fractionalBase * Number.parseFloat(tail)),
        value,
    };
}
exports.parse = parse;
/**
 * Parse amount in standard string form (like 'EUR:20.5'),
 * throw if the input is not a valid amount.
 */
function parseOrThrow(s) {
    const res = parse(s);
    if (!res) {
        throw Error(`Can't parse amount: "${s}"`);
    }
    return res;
}
exports.parseOrThrow = parseOrThrow;
/**
 * Convert a float to a Taler amount.
 * Loss of precision possible.
 */
function fromFloat(floatVal, currency) {
    return {
        currency,
        fraction: Math.floor((floatVal - Math.floor(floatVal)) * exports.fractionalBase),
        value: Math.floor(floatVal),
    };
}
exports.fromFloat = fromFloat;
/**
 * Convert to standard human-readable string representation that's
 * also used in JSON formats.
 */
function toString(a) {
    const av = a.value + Math.floor(a.fraction / exports.fractionalBase);
    const af = a.fraction % exports.fractionalBase;
    let s = av.toString();
    if (af) {
        s = s + ".";
        let n = af;
        for (let i = 0; i < exports.fractionalLength; i++) {
            if (!n) {
                break;
            }
            s = s + Math.floor(n / exports.fractionalBase * 10).toString();
            n = (n * 10) % exports.fractionalBase;
        }
    }
    return `${a.currency}:${s}`;
}
exports.toString = toString;
/**
 * Check if the argument is a valid amount in string form.
 */
function check(a) {
    if (typeof a !== "string") {
        return false;
    }
    try {
        const parsedAmount = parse(a);
        return !!parsedAmount;
    }
    catch (_a) {
        return false;
    }
}
exports.check = check;

});

unwrapExports(amounts);
var amounts_1 = amounts.fractionalBase;
var amounts_2 = amounts.fractionalLength;
var amounts_3 = amounts.maxAmountValue;
var amounts_4 = amounts.AmountJson;
var amounts_5 = amounts.getZero;
var amounts_6 = amounts.sum;
var amounts_7 = amounts.add;
var amounts_8 = amounts.sub;
var amounts_9 = amounts.cmp;
var amounts_10 = amounts.copy;
var amounts_11 = amounts.divide;
var amounts_12 = amounts.isNonZero;
var amounts_13 = amounts.parse;
var amounts_14 = amounts.parseOrThrow;
var amounts_15 = amounts.fromFloat;
var amounts_16 = amounts.check;

var helpers = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Amounts = __importStar(amounts);
/**
 * Show an amount in a form suitable for the user.
 * FIXME:  In the future, this should consider currency-specific
 * settings such as significant digits or currency symbols.
 */
function amountToPretty(amount) {
    const x = amount.value + amount.fraction / Amounts.fractionalBase;
    return `${x} ${amount.currency}`;
}
exports.amountToPretty = amountToPretty;
/**
 * Canonicalize a base url, typically for the exchange.
 *
 * See http://api.taler.net/wallet.html#general
 */
function canonicalizeBaseUrl(url) {
    if (!url.startsWith("http") && !url.startsWith("https")) {
        url = "https://" + url;
    }
    const x = new URL(url);
    if (!x.pathname.endsWith("/")) {
        x.pathname = x.pathname + "/";
    }
    x.search = "";
    x.hash = "";
    return x.href;
}
exports.canonicalizeBaseUrl = canonicalizeBaseUrl;
/**
 * Convert object to JSON with canonical ordering of keys
 * and whitespace omitted.
 */
function canonicalJson(obj) {
    // Check for cycles, etc.
    JSON.stringify(obj);
    if (typeof obj === "string" || typeof obj === "number" || obj === null) {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        const objs = obj.map((e) => canonicalJson(e));
        return `[${objs.join(",")}]`;
    }
    const keys = [];
    for (const key in obj) {
        keys.push(key);
    }
    keys.sort();
    let s = "{";
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        s += JSON.stringify(key) + ":" + canonicalJson(obj[key]);
        if (i !== keys.length - 1) {
            s += ",";
        }
    }
    return s + "}";
}
exports.canonicalJson = canonicalJson;
/**
 * Check for deep equality of two objects.
 * Only arrays, objects and primitives are supported.
 */
function deepEquals(x, y) {
    if (x === y) {
        return true;
    }
    if (Array.isArray(x) && x.length !== y.length) {
        return false;
    }
    const p = Object.keys(x);
    return Object.keys(y).every((i) => p.indexOf(i) !== -1) &&
        p.every((i) => deepEquals(x[i], y[i]));
}
exports.deepEquals = deepEquals;
/**
 * Map from a collection to a list or results and then
 * concatenate the results.
 */
function flatMap(xs, f) {
    return xs.reduce((acc, next) => [...f(next), ...acc], []);
}
exports.flatMap = flatMap;
/**
 * Extract a numeric timstamp (in seconds) from the Taler date format
 * ("/Date([n])/").  Returns null if input is not in the right format.
 */
function getTalerStampSec(stamp) {
    const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
    if (!m || !m[1]) {
        return null;
    }
    return parseInt(m[1], 10);
}
exports.getTalerStampSec = getTalerStampSec;
/**
 * Extract a timestamp from a Taler timestamp string.
 */
function extractTalerStamp(stamp) {
    const m = stamp.match(/\/?Date\(([0-9]*)\)\/?/);
    if (!m || !m[1]) {
        return undefined;
    }
    return {
        t_ms: parseInt(m[1], 10) * 1000,
    };
}
exports.extractTalerStamp = extractTalerStamp;
/**
 * Extract a timestamp from a Taler timestamp string.
 */
function extractTalerStampOrThrow(stamp) {
    const r = extractTalerStamp(stamp);
    if (!r) {
        throw Error("invalid time stamp");
    }
    return r;
}
exports.extractTalerStampOrThrow = extractTalerStampOrThrow;
/**
 * Check if a timestamp is in the right format.
 */
function timestampCheck(stamp) {
    return getTalerStampSec(stamp) !== null;
}
exports.timestampCheck = timestampCheck;
/**
 * Get a JavaScript Date object from a Taler date string.
 * Returns null if input is not in the right format.
 */
function getTalerStampDate(stamp) {
    const sec = getTalerStampSec(stamp);
    if (sec == null) {
        return null;
    }
    return new Date(sec * 1000);
}
exports.getTalerStampDate = getTalerStampDate;
/**
 * Compute the hash function of a JSON object.
 */
function hash(val) {
    const str = canonicalJson(val);
    // https://github.com/darkskyapp/string-hash
    let h = 5381;
    let i = str.length;
    while (i) {
        h = (h * 33) ^ str.charCodeAt(--i);
    }
    /* JavaScript does bitwise operations (like XOR, above) on 32-bit signed
    * integers. Since we want the results to be always positive, convert the
    * signed int to an unsigned by doing an unsigned bitshift. */
    return h >>> 0;
}
exports.hash = hash;
/**
 * Lexically compare two strings.
 */
function strcmp(s1, s2) {
    if (s1 < s2) {
        return -1;
    }
    if (s1 > s2) {
        return 1;
    }
    return 0;
}
exports.strcmp = strcmp;

});

unwrapExports(helpers);
var helpers_1 = helpers.amountToPretty;
var helpers_2 = helpers.canonicalizeBaseUrl;
var helpers_3 = helpers.canonicalJson;
var helpers_4 = helpers.deepEquals;
var helpers_5 = helpers.flatMap;
var helpers_6 = helpers.getTalerStampSec;
var helpers_7 = helpers.extractTalerStamp;
var helpers_8 = helpers.extractTalerStampOrThrow;
var helpers_9 = helpers.timestampCheck;
var helpers_10 = helpers.getTalerStampDate;
var helpers_11 = helpers.hash;
var helpers_12 = helpers.strcmp;

var talerTypes = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Type and schema definitions for the base taler protocol.
 *
 * All types here should be "@Checkable".
 *
 * Even though the rest of the wallet uses camelCase for fields, use snake_case
 * here, since that's the convention for the Taler JSON+HTTP API.
 */
/**
 * Imports.
 */

const Amounts = __importStar(amounts);

/**
 * Denomination as found in the /keys response from the exchange.
 */
let Denomination = class Denomination {
};
__decorate([
    checkable.Checkable.String(Amounts.check)
], Denomination.prototype, "value", void 0);
__decorate([
    checkable.Checkable.String()
], Denomination.prototype, "denom_pub", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], Denomination.prototype, "fee_withdraw", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], Denomination.prototype, "fee_deposit", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], Denomination.prototype, "fee_refresh", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], Denomination.prototype, "fee_refund", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], Denomination.prototype, "stamp_start", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], Denomination.prototype, "stamp_expire_withdraw", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], Denomination.prototype, "stamp_expire_legal", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], Denomination.prototype, "stamp_expire_deposit", void 0);
__decorate([
    checkable.Checkable.String()
], Denomination.prototype, "master_sig", void 0);
Denomination = __decorate([
    checkable.Checkable.Class()
], Denomination);
exports.Denomination = Denomination;
/**
 * Signature by the auditor that a particular denomination key is audited.
 */
let AuditorDenomSig = class AuditorDenomSig {
};
__decorate([
    checkable.Checkable.String()
], AuditorDenomSig.prototype, "denom_pub_h", void 0);
__decorate([
    checkable.Checkable.String()
], AuditorDenomSig.prototype, "auditor_sig", void 0);
AuditorDenomSig = __decorate([
    checkable.Checkable.Class()
], AuditorDenomSig);
exports.AuditorDenomSig = AuditorDenomSig;
/**
 * Auditor information as given by the exchange in /keys.
 */
let Auditor = class Auditor {
};
__decorate([
    checkable.Checkable.String()
], Auditor.prototype, "auditor_pub", void 0);
__decorate([
    checkable.Checkable.String()
], Auditor.prototype, "auditor_url", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => AuditorDenomSig))
], Auditor.prototype, "denomination_keys", void 0);
Auditor = __decorate([
    checkable.Checkable.Class()
], Auditor);
exports.Auditor = Auditor;
/**
 * Response that we get from the exchange for a payback request.
 */
let PaybackConfirmation = class PaybackConfirmation {
};
__decorate([
    checkable.Checkable.String()
], PaybackConfirmation.prototype, "reserve_pub", void 0);
__decorate([
    checkable.Checkable.String()
], PaybackConfirmation.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.String()
], PaybackConfirmation.prototype, "timestamp", void 0);
__decorate([
    checkable.Checkable.String()
], PaybackConfirmation.prototype, "exchange_sig", void 0);
__decorate([
    checkable.Checkable.String()
], PaybackConfirmation.prototype, "exchange_pub", void 0);
PaybackConfirmation = __decorate([
    checkable.Checkable.Class()
], PaybackConfirmation);
exports.PaybackConfirmation = PaybackConfirmation;
/**
 * Information about an exchange as stored inside a
 * merchant's contract terms.
 */
let ExchangeHandle = class ExchangeHandle {
};
__decorate([
    checkable.Checkable.String()
], ExchangeHandle.prototype, "master_pub", void 0);
__decorate([
    checkable.Checkable.String()
], ExchangeHandle.prototype, "url", void 0);
ExchangeHandle = __decorate([
    checkable.Checkable.Class()
], ExchangeHandle);
exports.ExchangeHandle = ExchangeHandle;
/**
 * Contract terms from a merchant.
 */
let ContractTerms = class ContractTerms {
    static validate(x) {
        if (x.exchanges.length === 0) {
            throw Error("no exchanges in contract terms");
        }
    }
};
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "H_wire", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "wire_method", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], ContractTerms.prototype, "summary", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], ContractTerms.prototype, "nonce", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], ContractTerms.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.AnyObject())
], ContractTerms.prototype, "auditors", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], ContractTerms.prototype, "pay_deadline", void 0);
__decorate([
    checkable.Checkable.Any()
], ContractTerms.prototype, "locations", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], ContractTerms.prototype, "max_fee", void 0);
__decorate([
    checkable.Checkable.Any()
], ContractTerms.prototype, "merchant", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "merchant_pub", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => ExchangeHandle))
], ContractTerms.prototype, "exchanges", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.AnyObject())
], ContractTerms.prototype, "products", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], ContractTerms.prototype, "refund_deadline", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "wire_transfer_deadline", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], ContractTerms.prototype, "timestamp", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "order_id", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "merchant_base_url", void 0);
__decorate([
    checkable.Checkable.String()
], ContractTerms.prototype, "fulfillment_url", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.Number())
], ContractTerms.prototype, "wire_fee_amortization", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], ContractTerms.prototype, "max_wire_fee", void 0);
__decorate([
    checkable.Checkable.Any()
], ContractTerms.prototype, "extra", void 0);
ContractTerms = __decorate([
    checkable.Checkable.Class({ validate: true })
], ContractTerms);
exports.ContractTerms = ContractTerms;
/**
 * Refund permission in the format that the merchant gives it to us.
 */
let MerchantRefundPermission = class MerchantRefundPermission {
};
__decorate([
    checkable.Checkable.String(Amounts.check)
], MerchantRefundPermission.prototype, "refund_amount", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], MerchantRefundPermission.prototype, "refund_fee", void 0);
__decorate([
    checkable.Checkable.String()
], MerchantRefundPermission.prototype, "coin_pub", void 0);
__decorate([
    checkable.Checkable.Number()
], MerchantRefundPermission.prototype, "rtransaction_id", void 0);
__decorate([
    checkable.Checkable.String()
], MerchantRefundPermission.prototype, "merchant_sig", void 0);
MerchantRefundPermission = __decorate([
    checkable.Checkable.Class()
], MerchantRefundPermission);
exports.MerchantRefundPermission = MerchantRefundPermission;
/**
 * Response for a refund pickup or a /pay in abort mode.
 */
let MerchantRefundResponse = class MerchantRefundResponse {
};
__decorate([
    checkable.Checkable.String()
], MerchantRefundResponse.prototype, "merchant_pub", void 0);
__decorate([
    checkable.Checkable.String()
], MerchantRefundResponse.prototype, "h_contract_terms", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => MerchantRefundPermission))
], MerchantRefundResponse.prototype, "refund_permissions", void 0);
MerchantRefundResponse = __decorate([
    checkable.Checkable.Class()
], MerchantRefundResponse);
exports.MerchantRefundResponse = MerchantRefundResponse;
/**
 * Reserve signature, defined as separate class to facilitate
 * schema validation with "@Checkable".
 */
let ReserveSigSingleton = class ReserveSigSingleton {
};
__decorate([
    checkable.Checkable.String()
], ReserveSigSingleton.prototype, "reserve_sig", void 0);
ReserveSigSingleton = __decorate([
    checkable.Checkable.Class()
], ReserveSigSingleton);
exports.ReserveSigSingleton = ReserveSigSingleton;
/**
 * Response to /reserve/status
 */
let ReserveStatus = class ReserveStatus {
};
__decorate([
    checkable.Checkable.String()
], ReserveStatus.prototype, "balance", void 0);
__decorate([
    checkable.Checkable.Any()
], ReserveStatus.prototype, "history", void 0);
ReserveStatus = __decorate([
    checkable.Checkable.Class()
], ReserveStatus);
exports.ReserveStatus = ReserveStatus;
/**
 * Response of the merchant
 * to the TipPickupRequest.
 */
let TipResponse = class TipResponse {
};
__decorate([
    checkable.Checkable.String()
], TipResponse.prototype, "reserve_pub", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => ReserveSigSingleton))
], TipResponse.prototype, "reserve_sigs", void 0);
TipResponse = __decorate([
    checkable.Checkable.Class()
], TipResponse);
exports.TipResponse = TipResponse;
/**
 * Element of the payback list that the
 * exchange gives us in /keys.
 */
let Payback = class Payback {
};
__decorate([
    checkable.Checkable.String()
], Payback.prototype, "h_denom_pub", void 0);
Payback = __decorate([
    checkable.Checkable.Class()
], Payback);
exports.Payback = Payback;
/**
 * Structure that the exchange gives us in /keys.
 */
let KeysJson = class KeysJson {
};
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => Denomination))
], KeysJson.prototype, "denoms", void 0);
__decorate([
    checkable.Checkable.String()
], KeysJson.prototype, "master_public_key", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => Auditor))
], KeysJson.prototype, "auditors", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], KeysJson.prototype, "list_issue_date", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.List(checkable.Checkable.Value(() => Payback)))
], KeysJson.prototype, "payback", void 0);
__decorate([
    checkable.Checkable.Any()
], KeysJson.prototype, "signkeys", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], KeysJson.prototype, "version", void 0);
KeysJson = __decorate([
    checkable.Checkable.Class({ extra: true })
], KeysJson);
exports.KeysJson = KeysJson;
/**
 * Wire fees as anounced by the exchange.
 */
let WireFeesJson = class WireFeesJson {
};
__decorate([
    checkable.Checkable.String(Amounts.check)
], WireFeesJson.prototype, "wire_fee", void 0);
__decorate([
    checkable.Checkable.String(Amounts.check)
], WireFeesJson.prototype, "closing_fee", void 0);
__decorate([
    checkable.Checkable.String()
], WireFeesJson.prototype, "sig", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], WireFeesJson.prototype, "start_date", void 0);
__decorate([
    checkable.Checkable.String(helpers.timestampCheck)
], WireFeesJson.prototype, "end_date", void 0);
WireFeesJson = __decorate([
    checkable.Checkable.Class()
], WireFeesJson);
exports.WireFeesJson = WireFeesJson;
let AccountInfo = class AccountInfo {
};
__decorate([
    checkable.Checkable.String()
], AccountInfo.prototype, "url", void 0);
__decorate([
    checkable.Checkable.String()
], AccountInfo.prototype, "master_sig", void 0);
AccountInfo = __decorate([
    checkable.Checkable.Class({ extra: true })
], AccountInfo);
exports.AccountInfo = AccountInfo;
let ExchangeWireJson = class ExchangeWireJson {
};
__decorate([
    checkable.Checkable.Map(checkable.Checkable.String(), checkable.Checkable.List(checkable.Checkable.Value(() => WireFeesJson)))
], ExchangeWireJson.prototype, "fees", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.Value(() => AccountInfo))
], ExchangeWireJson.prototype, "accounts", void 0);
ExchangeWireJson = __decorate([
    checkable.Checkable.Class({ extra: true })
], ExchangeWireJson);
exports.ExchangeWireJson = ExchangeWireJson;
/**
 * Proposal returned from the contract URL.
 */
let Proposal = class Proposal {
};
__decorate([
    checkable.Checkable.Value(() => ContractTerms)
], Proposal.prototype, "contract_terms", void 0);
__decorate([
    checkable.Checkable.String()
], Proposal.prototype, "sig", void 0);
Proposal = __decorate([
    checkable.Checkable.Class({ extra: true })
], Proposal);
exports.Proposal = Proposal;
/**
 * Response from the internal merchant API.
 */
let CheckPaymentResponse = class CheckPaymentResponse {
};
__decorate([
    checkable.Checkable.Boolean()
], CheckPaymentResponse.prototype, "paid", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.Boolean())
], CheckPaymentResponse.prototype, "refunded", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], CheckPaymentResponse.prototype, "refunded_amount", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.Value(() => ContractTerms))
], CheckPaymentResponse.prototype, "contract_terms", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], CheckPaymentResponse.prototype, "taler_pay_uri", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], CheckPaymentResponse.prototype, "contract_url", void 0);
CheckPaymentResponse = __decorate([
    checkable.Checkable.Class({ extra: true })
], CheckPaymentResponse);
exports.CheckPaymentResponse = CheckPaymentResponse;
/**
 * Response from the bank.
 */
let WithdrawOperationStatusResponse = class WithdrawOperationStatusResponse {
};
__decorate([
    checkable.Checkable.Boolean()
], WithdrawOperationStatusResponse.prototype, "selection_done", void 0);
__decorate([
    checkable.Checkable.Boolean()
], WithdrawOperationStatusResponse.prototype, "transfer_done", void 0);
__decorate([
    checkable.Checkable.String()
], WithdrawOperationStatusResponse.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], WithdrawOperationStatusResponse.prototype, "sender_wire", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], WithdrawOperationStatusResponse.prototype, "suggested_exchange", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], WithdrawOperationStatusResponse.prototype, "confirm_transfer_url", void 0);
__decorate([
    checkable.Checkable.List(checkable.Checkable.String())
], WithdrawOperationStatusResponse.prototype, "wire_types", void 0);
WithdrawOperationStatusResponse = __decorate([
    checkable.Checkable.Class({ extra: true })
], WithdrawOperationStatusResponse);
exports.WithdrawOperationStatusResponse = WithdrawOperationStatusResponse;
/**
 * Response from the merchant.
 */
let TipPickupGetResponse = class TipPickupGetResponse {
};
__decorate([
    checkable.Checkable.AnyObject()
], TipPickupGetResponse.prototype, "extra", void 0);
__decorate([
    checkable.Checkable.String()
], TipPickupGetResponse.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.String()
], TipPickupGetResponse.prototype, "amount_left", void 0);
__decorate([
    checkable.Checkable.String()
], TipPickupGetResponse.prototype, "exchange_url", void 0);
__decorate([
    checkable.Checkable.String()
], TipPickupGetResponse.prototype, "stamp_expire", void 0);
__decorate([
    checkable.Checkable.String()
], TipPickupGetResponse.prototype, "stamp_created", void 0);
TipPickupGetResponse = __decorate([
    checkable.Checkable.Class({ extra: true })
], TipPickupGetResponse);
exports.TipPickupGetResponse = TipPickupGetResponse;

});

unwrapExports(talerTypes);
var talerTypes_1 = talerTypes.Denomination;
var talerTypes_2 = talerTypes.AuditorDenomSig;
var talerTypes_3 = talerTypes.Auditor;
var talerTypes_4 = talerTypes.PaybackConfirmation;
var talerTypes_5 = talerTypes.ExchangeHandle;
var talerTypes_6 = talerTypes.ContractTerms;
var talerTypes_7 = talerTypes.MerchantRefundPermission;
var talerTypes_8 = talerTypes.MerchantRefundResponse;
var talerTypes_9 = talerTypes.ReserveSigSingleton;
var talerTypes_10 = talerTypes.ReserveStatus;
var talerTypes_11 = talerTypes.TipResponse;
var talerTypes_12 = talerTypes.Payback;
var talerTypes_13 = talerTypes.KeysJson;
var talerTypes_14 = talerTypes.WireFeesJson;
var talerTypes_15 = talerTypes.AccountInfo;
var talerTypes_16 = talerTypes.ExchangeWireJson;
var talerTypes_17 = talerTypes.Proposal;
var talerTypes_18 = talerTypes.CheckPaymentResponse;
var talerTypes_19 = talerTypes.WithdrawOperationStatusResponse;
var talerTypes_20 = talerTypes.TipPickupGetResponse;

var walletTypes = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2015-2017 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Types used by clients of the wallet.
 *
 * These types are defined in a separate file make tree shaking easier, since
 * some components use these types (via RPC) but do not depend on the wallet
 * code directly.
 */
/**
 * Imports.
 */


/**
 * Response for the create reserve request to the wallet.
 */
let CreateReserveResponse = class CreateReserveResponse {
};
__decorate([
    checkable.Checkable.String()
], CreateReserveResponse.prototype, "exchange", void 0);
__decorate([
    checkable.Checkable.String()
], CreateReserveResponse.prototype, "reservePub", void 0);
CreateReserveResponse = __decorate([
    checkable.Checkable.Class()
], CreateReserveResponse);
exports.CreateReserveResponse = CreateReserveResponse;
/**
 * For terseness.
 */
function mkAmount(value, fraction, currency) {
    return { value, fraction, currency };
}
exports.mkAmount = mkAmount;
/**
 * Request to mark a reserve as confirmed.
 */
let CreateReserveRequest = class CreateReserveRequest {
};
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], CreateReserveRequest.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.String()
], CreateReserveRequest.prototype, "exchange", void 0);
__decorate([
    checkable.Checkable.String()
], CreateReserveRequest.prototype, "exchangeWire", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], CreateReserveRequest.prototype, "senderWire", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], CreateReserveRequest.prototype, "bankWithdrawStatusUrl", void 0);
CreateReserveRequest = __decorate([
    checkable.Checkable.Class()
], CreateReserveRequest);
exports.CreateReserveRequest = CreateReserveRequest;
/**
 * Request to mark a reserve as confirmed.
 */
let ConfirmReserveRequest = class ConfirmReserveRequest {
};
__decorate([
    checkable.Checkable.String()
], ConfirmReserveRequest.prototype, "reservePub", void 0);
ConfirmReserveRequest = __decorate([
    checkable.Checkable.Class()
], ConfirmReserveRequest);
exports.ConfirmReserveRequest = ConfirmReserveRequest;
/**
 * Wire coins to the user's own bank account.
 */
let ReturnCoinsRequest = class ReturnCoinsRequest {
};
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], ReturnCoinsRequest.prototype, "amount", void 0);
__decorate([
    checkable.Checkable.String()
], ReturnCoinsRequest.prototype, "exchange", void 0);
__decorate([
    checkable.Checkable.Any()
], ReturnCoinsRequest.prototype, "senderWire", void 0);
ReturnCoinsRequest = __decorate([
    checkable.Checkable.Class()
], ReturnCoinsRequest);
exports.ReturnCoinsRequest = ReturnCoinsRequest;
let Timestamp = class Timestamp {
};
__decorate([
    checkable.Checkable.Number()
], Timestamp.prototype, "t_ms", void 0);
Timestamp = __decorate([
    checkable.Checkable.Class()
], Timestamp);
exports.Timestamp = Timestamp;
function getTimestampNow() {
    return {
        t_ms: new Date().getTime(),
    };
}
exports.getTimestampNow = getTimestampNow;

});

unwrapExports(walletTypes);
var walletTypes_1 = walletTypes.CreateReserveResponse;
var walletTypes_2 = walletTypes.mkAmount;
var walletTypes_3 = walletTypes.CreateReserveRequest;
var walletTypes_4 = walletTypes.ConfirmReserveRequest;
var walletTypes_5 = walletTypes.ReturnCoinsRequest;
var walletTypes_6 = walletTypes.Timestamp;
var walletTypes_7 = walletTypes.getTimestampNow;

var dbTypes = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2018 GNUnet e.V. and INRIA

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __decorate = (commonjsGlobal && commonjsGlobal.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Types for records stored in the wallet's database.
 *
 * Types for the objects in the database should end in "-Record".
 */
/**
 * Imports.
 */





/**
 * Current database version, should be incremented
 * each time we do incompatible schema changes on the database.
 * In the future we might consider adding migration functions for
 * each version increment.
 */
exports.WALLET_DB_VERSION = 28;
var ReserveRecordStatus;
(function (ReserveRecordStatus) {
    /**
     * Waiting for manual confirmation.
     */
    ReserveRecordStatus["UNCONFIRMED"] = "unconfirmed";
    /**
     * Reserve must be registered with the bank.
     */
    ReserveRecordStatus["REGISTERING_BANK"] = "registering-bank";
    /**
     * We've registered reserve's information with the bank
     * and are now waiting for the user to confirm the withdraw
     * with the bank (typically 2nd factor auth).
     */
    ReserveRecordStatus["WAIT_CONFIRM_BANK"] = "wait-confirm-bank";
    /**
     * Querying reserve status with the exchange.
     */
    ReserveRecordStatus["QUERYING_STATUS"] = "querying-status";
    /**
     * Status is queried, the wallet must now select coins
     * and start withdrawing.
     */
    ReserveRecordStatus["WITHDRAWING"] = "withdrawing";
    /**
     * The corresponding withdraw record has been created.
     * No further processing is done, unless explicitly requested
     * by the user.
     */
    ReserveRecordStatus["DORMANT"] = "dormant";
})(ReserveRecordStatus = exports.ReserveRecordStatus || (exports.ReserveRecordStatus = {}));
/**
 * Status of a denomination.
 */
var DenominationStatus;
(function (DenominationStatus) {
    /**
     * Verification was delayed.
     */
    DenominationStatus[DenominationStatus["Unverified"] = 0] = "Unverified";
    /**
     * Verified as valid.
     */
    DenominationStatus[DenominationStatus["VerifiedGood"] = 1] = "VerifiedGood";
    /**
     * Verified as invalid.
     */
    DenominationStatus[DenominationStatus["VerifiedBad"] = 2] = "VerifiedBad";
})(DenominationStatus = exports.DenominationStatus || (exports.DenominationStatus = {}));
/**
 * Denomination record as stored in the wallet's database.
 */
let DenominationRecord = class DenominationRecord {
};
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], DenominationRecord.prototype, "value", void 0);
__decorate([
    checkable.Checkable.String()
], DenominationRecord.prototype, "denomPub", void 0);
__decorate([
    checkable.Checkable.String()
], DenominationRecord.prototype, "denomPubHash", void 0);
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], DenominationRecord.prototype, "feeWithdraw", void 0);
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], DenominationRecord.prototype, "feeDeposit", void 0);
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], DenominationRecord.prototype, "feeRefresh", void 0);
__decorate([
    checkable.Checkable.Value(() => amounts.AmountJson)
], DenominationRecord.prototype, "feeRefund", void 0);
__decorate([
    checkable.Checkable.Value(() => walletTypes.Timestamp)
], DenominationRecord.prototype, "stampStart", void 0);
__decorate([
    checkable.Checkable.Value(() => walletTypes.Timestamp)
], DenominationRecord.prototype, "stampExpireWithdraw", void 0);
__decorate([
    checkable.Checkable.Value(() => walletTypes.Timestamp)
], DenominationRecord.prototype, "stampExpireLegal", void 0);
__decorate([
    checkable.Checkable.Value(() => walletTypes.Timestamp)
], DenominationRecord.prototype, "stampExpireDeposit", void 0);
__decorate([
    checkable.Checkable.String()
], DenominationRecord.prototype, "masterSig", void 0);
__decorate([
    checkable.Checkable.Number()
], DenominationRecord.prototype, "status", void 0);
__decorate([
    checkable.Checkable.Boolean()
], DenominationRecord.prototype, "isOffered", void 0);
__decorate([
    checkable.Checkable.String()
], DenominationRecord.prototype, "exchangeBaseUrl", void 0);
DenominationRecord = __decorate([
    checkable.Checkable.Class()
], DenominationRecord);
exports.DenominationRecord = DenominationRecord;
var ExchangeUpdateStatus;
(function (ExchangeUpdateStatus) {
    ExchangeUpdateStatus["FETCH_KEYS"] = "fetch_keys";
    ExchangeUpdateStatus["FETCH_WIRE"] = "fetch_wire";
    ExchangeUpdateStatus["FINISHED"] = "finished";
})(ExchangeUpdateStatus = exports.ExchangeUpdateStatus || (exports.ExchangeUpdateStatus = {}));
/**
 * Status of a coin.
 */
var CoinStatus;
(function (CoinStatus) {
    /**
     * Withdrawn and never shown to anybody.
     */
    CoinStatus["Fresh"] = "fresh";
    /**
     * Used for a completed transaction and now dirty.
     */
    CoinStatus["Dirty"] = "dirty";
    /**
     * A coin that has been spent and refreshed.
     */
    CoinStatus["Dormant"] = "dormant";
})(CoinStatus = exports.CoinStatus || (exports.CoinStatus = {}));
var CoinSource;
(function (CoinSource) {
    CoinSource["Withdraw"] = "withdraw";
    CoinSource["Refresh"] = "refresh";
    CoinSource["Tip"] = "tip";
})(CoinSource = exports.CoinSource || (exports.CoinSource = {}));
var ProposalStatus;
(function (ProposalStatus) {
    /**
     * Not downloaded yet.
     */
    ProposalStatus["DOWNLOADING"] = "downloading";
    /**
     * Proposal downloaded, but the user needs to accept/reject it.
     */
    ProposalStatus["PROPOSED"] = "proposed";
    /**
     * The user has accepted the proposal.
     */
    ProposalStatus["ACCEPTED"] = "accepted";
    /**
     * The user has rejected the proposal.
     */
    ProposalStatus["REJECTED"] = "rejected";
    /**
     * Downloaded proposal was detected as a re-purchase.
     */
    ProposalStatus["REPURCHASE"] = "repurchase";
})(ProposalStatus = exports.ProposalStatus || (exports.ProposalStatus = {}));
let ProposalDownload = class ProposalDownload {
};
__decorate([
    checkable.Checkable.Value(() => talerTypes.ContractTerms)
], ProposalDownload.prototype, "contractTerms", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalDownload.prototype, "merchantSig", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalDownload.prototype, "contractTermsHash", void 0);
ProposalDownload = __decorate([
    checkable.Checkable.Class()
], ProposalDownload);
exports.ProposalDownload = ProposalDownload;
/**
 * Record for a downloaded order, stored in the wallet's database.
 */
let ProposalRecord = class ProposalRecord {
};
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "url", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "proposalId", void 0);
__decorate([
    checkable.Checkable.Number()
], ProposalRecord.prototype, "timestamp", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "noncePriv", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "noncePub", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "proposalStatus", void 0);
__decorate([
    checkable.Checkable.String()
], ProposalRecord.prototype, "repurchaseProposalId", void 0);
__decorate([
    checkable.Checkable.Optional(checkable.Checkable.String())
], ProposalRecord.prototype, "downloadSessionId", void 0);
ProposalRecord = __decorate([
    checkable.Checkable.Class()
], ProposalRecord);
exports.ProposalRecord = ProposalRecord;
/* tslint:disable:completed-docs */
/**
 * The stores and indices for the wallet database.
 */
var Stores;
(function (Stores) {
    class ExchangesStore extends query.Store {
        constructor() {
            super("exchanges", { keyPath: "baseUrl" });
        }
    }
    class CoinsStore extends query.Store {
        constructor() {
            super("coins", { keyPath: "coinPub" });
            this.exchangeBaseUrlIndex = new query.Index(this, "exchangeBaseUrl", "exchangeBaseUrl");
            this.denomPubIndex = new query.Index(this, "denomPubIndex", "denomPub");
            this.byWithdrawalWithIdx = new query.Index(this, "planchetsByWithdrawalWithIdxIndex", ["withdrawSessionId", "coinIndex"]);
        }
    }
    class ProposalsStore extends query.Store {
        constructor() {
            super("proposals", { keyPath: "proposalId" });
            this.urlIndex = new query.Index(this, "urlIndex", "url");
        }
    }
    class PurchasesStore extends query.Store {
        constructor() {
            super("purchases", { keyPath: "proposalId" });
            this.fulfillmentUrlIndex = new query.Index(this, "fulfillmentUrlIndex", "contractTerms.fulfillment_url");
            this.orderIdIndex = new query.Index(this, "orderIdIndex", "contractTerms.order_id");
        }
    }
    class DenominationsStore extends query.Store {
        constructor() {
            // cast needed because of bug in type annotations
            super("denominations", {
                keyPath: ["exchangeBaseUrl", "denomPub"],
            });
            this.denomPubHashIndex = new query.Index(this, "denomPubHashIndex", "denomPubHash");
            this.exchangeBaseUrlIndex = new query.Index(this, "exchangeBaseUrlIndex", "exchangeBaseUrl");
            this.denomPubIndex = new query.Index(this, "denomPubIndex", "denomPub");
        }
    }
    class CurrenciesStore extends query.Store {
        constructor() {
            super("currencies", { keyPath: "name" });
        }
    }
    class ConfigStore extends query.Store {
        constructor() {
            super("config", { keyPath: "key" });
        }
    }
    class ReservesStore extends query.Store {
        constructor() {
            super("reserves", { keyPath: "reservePub" });
        }
    }
    class TipsStore extends query.Store {
        constructor() {
            super("tips", { keyPath: "tipId" });
        }
    }
    class SenderWiresStore extends query.Store {
        constructor() {
            super("senderWires", { keyPath: "paytoUri" });
        }
    }
    class WithdrawalSessionsStore extends query.Store {
        constructor() {
            super("withdrawals", { keyPath: "withdrawSessionId" });
        }
    }
    class BankWithdrawUrisStore extends query.Store {
        constructor() {
            super("bankWithdrawUris", { keyPath: "talerWithdrawUri" });
        }
    }
    Stores.coins = new CoinsStore();
    Stores.coinsReturns = new query.Store("coinsReturns", {
        keyPath: "contractTermsHash",
    });
    Stores.config = new ConfigStore();
    Stores.currencies = new CurrenciesStore();
    Stores.denominations = new DenominationsStore();
    Stores.exchanges = new ExchangesStore();
    Stores.proposals = new ProposalsStore();
    Stores.refresh = new query.Store("refresh", {
        keyPath: "refreshSessionId",
    });
    Stores.reserves = new ReservesStore();
    Stores.purchases = new PurchasesStore();
    Stores.tips = new TipsStore();
    Stores.senderWires = new SenderWiresStore();
    Stores.withdrawalSession = new WithdrawalSessionsStore();
    Stores.bankWithdrawUris = new BankWithdrawUrisStore();
})(Stores = exports.Stores || (exports.Stores = {}));
/* tslint:enable:completed-docs */

});

unwrapExports(dbTypes);
var dbTypes_1 = dbTypes.WALLET_DB_VERSION;
var dbTypes_2 = dbTypes.ReserveRecordStatus;
var dbTypes_3 = dbTypes.DenominationStatus;
var dbTypes_4 = dbTypes.DenominationRecord;
var dbTypes_5 = dbTypes.ExchangeUpdateStatus;
var dbTypes_6 = dbTypes.CoinStatus;
var dbTypes_7 = dbTypes.CoinSource;
var dbTypes_8 = dbTypes.ProposalStatus;
var dbTypes_9 = dbTypes.ProposalDownload;
var dbTypes_10 = dbTypes.ProposalRecord;
var dbTypes_11 = dbTypes.Stores;

var taleruri = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
function parseWithdrawUri(s) {
    const pfx = "taler://withdraw/";
    if (!s.startsWith(pfx)) {
        return undefined;
    }
    const rest = s.substring(pfx.length);
    let [host, path, withdrawId] = rest.split("/");
    if (path === "-") {
        path = "api/withdraw-operation";
    }
    return {
        statusUrl: `https://${host}/${path}/${withdrawId}`,
    };
}
exports.parseWithdrawUri = parseWithdrawUri;
function parsePayUri(s) {
    if (s.startsWith("https://") || s.startsWith("http://")) {
        return {
            downloadUrl: s,
            sessionId: undefined,
        };
    }
    const pfx = "taler://pay/";
    if (!s.startsWith(pfx)) {
        return undefined;
    }
    const [path, search] = s.slice(pfx.length).split("?");
    let [host, maybePath, maybeInstance, orderId, maybeSessionid] = path.split("/");
    if (!host) {
        return undefined;
    }
    if (!maybePath) {
        return undefined;
    }
    if (!orderId) {
        return undefined;
    }
    if (maybePath === "-") {
        maybePath = "public/";
    }
    else {
        maybePath = decodeURIComponent(maybePath) + "/";
    }
    let maybeInstancePath = "";
    if (maybeInstance !== "-") {
        maybeInstancePath = `instances/${maybeInstance}/`;
    }
    let protocol = "https";
    const searchParams = new URLSearchParams(search);
    if (searchParams.get("insecure") === "1") {
        protocol = "http";
    }
    const downloadUrl = `${protocol}://${host}/` +
        decodeURIComponent(maybePath) +
        maybeInstancePath +
        `proposal?order_id=${orderId}`;
    return {
        downloadUrl,
        sessionId: maybeSessionid,
    };
}
exports.parsePayUri = parsePayUri;
function parseTipUri(s) {
    const pfx = "taler://tip/";
    if (!s.startsWith(pfx)) {
        return undefined;
    }
    const path = s.slice(pfx.length);
    let [host, maybePath, maybeInstance, tipId] = path.split("/");
    if (!host) {
        return undefined;
    }
    if (!maybePath) {
        return undefined;
    }
    if (!tipId) {
        return undefined;
    }
    if (maybePath === "-") {
        maybePath = "public/";
    }
    else {
        maybePath = decodeURIComponent(maybePath) + "/";
    }
    let maybeInstancePath = "";
    if (maybeInstance !== "-") {
        maybeInstancePath = `instances/${maybeInstance}/`;
    }
    const merchantBaseUrl = `https://${host}/${maybePath}${maybeInstancePath}`;
    return {
        merchantTipId: tipId,
        merchantOrigin: new URL(merchantBaseUrl).origin,
        merchantBaseUrl,
    };
}
exports.parseTipUri = parseTipUri;
function parseRefundUri(s) {
    const pfx = "taler://refund/";
    if (!s.startsWith(pfx)) {
        return undefined;
    }
    const path = s.slice(pfx.length);
    let [host, maybePath, maybeInstance, orderId] = path.split("/");
    if (!host) {
        return undefined;
    }
    if (!maybePath) {
        return undefined;
    }
    if (!orderId) {
        return undefined;
    }
    if (maybePath === "-") {
        maybePath = "public/";
    }
    else {
        maybePath = decodeURIComponent(maybePath) + "/";
    }
    let maybeInstancePath = "";
    if (maybeInstance !== "-") {
        maybeInstancePath = `instances/${maybeInstance}/`;
    }
    const refundUrl = "https://" +
        host +
        "/" +
        maybePath +
        maybeInstancePath +
        "refund" +
        "?order_id=" +
        orderId;
    return {
        refundUrl,
    };
}
exports.parseRefundUri = parseRefundUri;

});

unwrapExports(taleruri);
var taleruri_1 = taleruri.parseWithdrawUri;
var taleruri_2 = taleruri.parsePayUri;
var taleruri_3 = taleruri.parseTipUri;
var taleruri_4 = taleruri.parseRefundUri;

var logging = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
class Logger {
    constructor(tag) {
        this.tag = tag;
    }
    info(message, ...args) {
        console.log(`${new Date().toISOString()} ${this.tag} INFO ` + message, ...args);
    }
    trace(message, ...args) {
        console.log(`${new Date().toISOString()} ${this.tag} TRACE ` + message, ...args);
    }
}
exports.Logger = Logger;

});

unwrapExports(logging);
var logging_1 = logging.Logger;

var payto = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
function parsePaytoUri(s) {
    const pfx = "payto://";
    if (!s.startsWith(pfx)) {
        return undefined;
    }
    const [acct, search] = s.slice(pfx.length).split("?");
    const firstSlashPos = acct.indexOf("/");
    if (firstSlashPos === -1) {
        return undefined;
    }
    const targetType = acct.slice(0, firstSlashPos);
    const targetPath = acct.slice(firstSlashPos + 1);
    const params = {};
    const searchParams = new URLSearchParams(search || "");
    searchParams.forEach((v, k) => {
        params[v] = k;
    });
    return {
        targetPath,
        targetType,
        params,
    };
}
exports.parsePaytoUri = parsePaytoUri;

});

unwrapExports(payto);
var payto_1 = payto.parsePaytoUri;

var exchanges = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });






const Amounts = __importStar(amounts);

function denominationRecordFromKeys(ws, exchangeBaseUrl, denomIn) {
    return __awaiter(this, void 0, void 0, function* () {
        const denomPubHash = yield ws.cryptoApi.hashDenomPub(denomIn.denom_pub);
        const d = {
            denomPub: denomIn.denom_pub,
            denomPubHash,
            exchangeBaseUrl,
            feeDeposit: Amounts.parseOrThrow(denomIn.fee_deposit),
            feeRefresh: Amounts.parseOrThrow(denomIn.fee_refresh),
            feeRefund: Amounts.parseOrThrow(denomIn.fee_refund),
            feeWithdraw: Amounts.parseOrThrow(denomIn.fee_withdraw),
            isOffered: true,
            masterSig: denomIn.master_sig,
            stampExpireDeposit: helpers.extractTalerStampOrThrow(denomIn.stamp_expire_deposit),
            stampExpireLegal: helpers.extractTalerStampOrThrow(denomIn.stamp_expire_legal),
            stampExpireWithdraw: helpers.extractTalerStampOrThrow(denomIn.stamp_expire_withdraw),
            stampStart: helpers.extractTalerStampOrThrow(denomIn.stamp_start),
            status: dbTypes.DenominationStatus.Unverified,
            value: Amounts.parseOrThrow(denomIn.value),
        };
        return d;
    });
}
function setExchangeError(ws, baseUrl, err) {
    return __awaiter(this, void 0, void 0, function* () {
        const mut = (exchange) => {
            exchange.lastError = err;
            return exchange;
        };
        yield query.oneShotMutate(ws.db, dbTypes.Stores.exchanges, baseUrl, mut);
    });
}
/**
 * Fetch the exchange's /keys and update our database accordingly.
 *
 * Exceptions thrown in this method must be caught and reported
 * in the pending operations.
 */
function updateExchangeWithKeys(ws, baseUrl) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        const existingExchangeRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, baseUrl);
        if (((_a = existingExchangeRecord) === null || _a === void 0 ? void 0 : _a.updateStatus) != dbTypes.ExchangeUpdateStatus.FETCH_KEYS) {
            return;
        }
        const keysUrl = new URL("keys", baseUrl);
        keysUrl.searchParams.set("cacheBreaker", wallet.WALLET_CACHE_BREAKER_CLIENT_VERSION);
        let keysResp;
        try {
            keysResp = yield ws.http.get(keysUrl.href);
        }
        catch (e) {
            const m = `Fetching keys failed: ${e.message}`;
            yield setExchangeError(ws, baseUrl, {
                type: "network",
                details: {
                    requestUrl: (_b = e.config) === null || _b === void 0 ? void 0 : _b.url,
                },
                message: m,
            });
            throw new wallet.OperationFailedAndReportedError(m);
        }
        let exchangeKeysJson;
        try {
            exchangeKeysJson = talerTypes.KeysJson.checked(keysResp.responseJson);
        }
        catch (e) {
            const m = `Parsing /keys response failed: ${e.message}`;
            yield setExchangeError(ws, baseUrl, {
                type: "protocol-violation",
                details: {},
                message: m,
            });
            throw new wallet.OperationFailedAndReportedError(m);
        }
        const lastUpdateTimestamp = helpers.extractTalerStamp(exchangeKeysJson.list_issue_date);
        if (!lastUpdateTimestamp) {
            const m = `Parsing /keys response failed: invalid list_issue_date.`;
            yield setExchangeError(ws, baseUrl, {
                type: "protocol-violation",
                details: {},
                message: m,
            });
            throw new wallet.OperationFailedAndReportedError(m);
        }
        if (exchangeKeysJson.denoms.length === 0) {
            const m = "exchange doesn't offer any denominations";
            yield setExchangeError(ws, baseUrl, {
                type: "protocol-violation",
                details: {},
                message: m,
            });
            throw new wallet.OperationFailedAndReportedError(m);
        }
        const protocolVersion = exchangeKeysJson.version;
        if (!protocolVersion) {
            const m = "outdate exchange, no version in /keys response";
            yield setExchangeError(ws, baseUrl, {
                type: "protocol-violation",
                details: {},
                message: m,
            });
            throw new wallet.OperationFailedAndReportedError(m);
        }
        const currency = Amounts.parseOrThrow(exchangeKeysJson.denoms[0].value)
            .currency;
        const newDenominations = yield Promise.all(exchangeKeysJson.denoms.map(d => denominationRecordFromKeys(ws, baseUrl, d)));
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.exchanges, dbTypes.Stores.denominations], (tx) => __awaiter(this, void 0, void 0, function* () {
            const r = yield tx.get(dbTypes.Stores.exchanges, baseUrl);
            if (!r) {
                console.warn(`exchange ${baseUrl} no longer present`);
                return;
            }
            if (r.details) ;
            r.details = {
                auditors: exchangeKeysJson.auditors,
                currency: currency,
                lastUpdateTime: lastUpdateTimestamp,
                masterPublicKey: exchangeKeysJson.master_public_key,
                protocolVersion: protocolVersion,
            };
            r.updateStatus = dbTypes.ExchangeUpdateStatus.FETCH_WIRE;
            r.lastError = undefined;
            yield tx.put(dbTypes.Stores.exchanges, r);
            for (const newDenom of newDenominations) {
                const oldDenom = yield tx.get(dbTypes.Stores.denominations, [
                    baseUrl,
                    newDenom.denomPub,
                ]);
                if (oldDenom) ;
                else {
                    yield tx.put(dbTypes.Stores.denominations, newDenom);
                }
            }
        }));
    });
}
/**
 * Fetch wire information for an exchange and store it in the database.
 *
 * @param exchangeBaseUrl Exchange base URL, assumed to be already normalized.
 */
function updateExchangeWithWireInfo(ws, exchangeBaseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const exchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, exchangeBaseUrl);
        if (!exchange) {
            return;
        }
        if (exchange.updateStatus != dbTypes.ExchangeUpdateStatus.FETCH_WIRE) {
            return;
        }
        const reqUrl = new URL("wire", exchangeBaseUrl);
        reqUrl.searchParams.set("cacheBreaker", wallet.WALLET_CACHE_BREAKER_CLIENT_VERSION);
        const resp = yield ws.http.get(reqUrl.href);
        const wiJson = resp.responseJson;
        if (!wiJson) {
            throw Error("/wire response malformed");
        }
        const wireInfo = talerTypes.ExchangeWireJson.checked(wiJson);
        const feesForType = {};
        for (const wireMethod of Object.keys(wireInfo.fees)) {
            const feeList = [];
            for (const x of wireInfo.fees[wireMethod]) {
                const startStamp = helpers.extractTalerStamp(x.start_date);
                if (!startStamp) {
                    throw Error("wrong date format");
                }
                const endStamp = helpers.extractTalerStamp(x.end_date);
                if (!endStamp) {
                    throw Error("wrong date format");
                }
                feeList.push({
                    closingFee: Amounts.parseOrThrow(x.closing_fee),
                    endStamp,
                    sig: x.sig,
                    startStamp,
                    wireFee: Amounts.parseOrThrow(x.wire_fee),
                });
            }
            feesForType[wireMethod] = feeList;
        }
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.exchanges], (tx) => __awaiter(this, void 0, void 0, function* () {
            const r = yield tx.get(dbTypes.Stores.exchanges, exchangeBaseUrl);
            if (!r) {
                return;
            }
            if (r.updateStatus != dbTypes.ExchangeUpdateStatus.FETCH_WIRE) {
                return;
            }
            r.wireInfo = {
                accounts: wireInfo.accounts,
                feesForType: feesForType,
            };
            r.updateStatus = dbTypes.ExchangeUpdateStatus.FINISHED;
            r.lastError = undefined;
            yield tx.put(dbTypes.Stores.exchanges, r);
        }));
    });
}
/**
 * Update or add exchange DB entry by fetching the /keys and /wire information.
 * Optionally link the reserve entry to the new or existing
 * exchange entry in then DB.
 */
function updateExchangeFromUrl(ws, baseUrl, force = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = walletTypes.getTimestampNow();
        baseUrl = helpers.canonicalizeBaseUrl(baseUrl);
        const r = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, baseUrl);
        if (!r) {
            const newExchangeRecord = {
                baseUrl: baseUrl,
                details: undefined,
                wireInfo: undefined,
                updateStatus: dbTypes.ExchangeUpdateStatus.FETCH_KEYS,
                updateStarted: now,
                updateReason: "initial",
                timestampAdded: walletTypes.getTimestampNow(),
            };
            yield query.oneShotPut(ws.db, dbTypes.Stores.exchanges, newExchangeRecord);
        }
        else {
            yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.exchanges], (t) => __awaiter(this, void 0, void 0, function* () {
                const rec = yield t.get(dbTypes.Stores.exchanges, baseUrl);
                if (!rec) {
                    return;
                }
                if (rec.updateStatus != dbTypes.ExchangeUpdateStatus.FETCH_KEYS && !force) {
                    return;
                }
                if (rec.updateStatus != dbTypes.ExchangeUpdateStatus.FETCH_KEYS && force) {
                    rec.updateReason = "forced";
                }
                rec.updateStarted = now;
                rec.updateStatus = dbTypes.ExchangeUpdateStatus.FETCH_KEYS;
                rec.lastError = undefined;
                t.put(dbTypes.Stores.exchanges, rec);
            }));
        }
        yield updateExchangeWithKeys(ws, baseUrl);
        yield updateExchangeWithWireInfo(ws, baseUrl);
        const updatedExchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, baseUrl);
        if (!updatedExchange) {
            // This should practically never happen
            throw Error("exchange not found");
        }
        return updatedExchange;
    });
}
exports.updateExchangeFromUrl = updateExchangeFromUrl;
/**
 * Check if and how an exchange is trusted and/or audited.
 */
function getExchangeTrust(ws, exchangeInfo) {
    return __awaiter(this, void 0, void 0, function* () {
        let isTrusted = false;
        let isAudited = false;
        const exchangeDetails = exchangeInfo.details;
        if (!exchangeDetails) {
            throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
        }
        const currencyRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.currencies, exchangeDetails.currency);
        if (currencyRecord) {
            for (const trustedExchange of currencyRecord.exchanges) {
                if (trustedExchange.exchangePub === exchangeDetails.masterPublicKey) {
                    isTrusted = true;
                    break;
                }
            }
            for (const trustedAuditor of currencyRecord.auditors) {
                for (const exchangeAuditor of exchangeDetails.auditors) {
                    if (trustedAuditor.auditorPub === exchangeAuditor.auditor_pub) {
                        isAudited = true;
                        break;
                    }
                }
            }
        }
        return { isTrusted, isAudited };
    });
}
exports.getExchangeTrust = getExchangeTrust;
function getExchangePaytoUri(ws, exchangeBaseUrl, supportedTargetTypes) {
    return __awaiter(this, void 0, void 0, function* () {
        // We do the update here, since the exchange might not even exist
        // yet in our database.
        const exchangeRecord = yield updateExchangeFromUrl(ws, exchangeBaseUrl);
        if (!exchangeRecord) {
            throw Error(`Exchange '${exchangeBaseUrl}' not found.`);
        }
        const exchangeWireInfo = exchangeRecord.wireInfo;
        if (!exchangeWireInfo) {
            throw Error(`Exchange wire info for '${exchangeBaseUrl}' not found.`);
        }
        for (let account of exchangeWireInfo.accounts) {
            const res = payto.parsePaytoUri(account.url);
            if (!res) {
                continue;
            }
            if (supportedTargetTypes.includes(res.targetType)) {
                return account.url;
            }
        }
        throw Error("no matching exchange account found");
    });
}
exports.getExchangePaytoUri = getExchangePaytoUri;

});

unwrapExports(exchanges);
var exchanges_1 = exchanges.updateExchangeFromUrl;
var exchanges_2 = exchanges.getExchangeTrust;
var exchanges_3 = exchanges.getExchangePaytoUri;

var assertUnreachable_1 = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
function assertUnreachable(x) {
    throw new Error("Didn't expect to get here");
}
exports.assertUnreachable = assertUnreachable;

});

unwrapExports(assertUnreachable_1);
var assertUnreachable_2 = assertUnreachable_1.assertUnreachable;

var naclFast = createCommonjsModule(function (module, exports) {
// Ported in 2014 by Dmitry Chestnykh and Devi Mandiri.
// TypeScript port in 2019 by Florian Dold.
// Public domain.
//
// Implementation derived from TweetNaCl version 20140427.
// See for details: http://tweetnacl.cr.yp.to/
Object.defineProperty(exports, "__esModule", { value: true });
const gf = function (init = []) {
    const r = new Float64Array(16);
    if (init)
        for (let i = 0; i < init.length; i++)
            r[i] = init[i];
    return r;
};
//  Pluggable, initialized in high-level API below.
let randombytes = function (x, n) {
    throw new Error("no PRNG");
};
const _0 = new Uint8Array(16);
const _9 = new Uint8Array(32);
_9[0] = 9;
// prettier-ignore
const gf0 = gf();
const gf1 = gf([1]);
const _121665 = gf([0xdb41, 1]);
const D = gf([
    0x78a3,
    0x1359,
    0x4dca,
    0x75eb,
    0xd8ab,
    0x4141,
    0x0a4d,
    0x0070,
    0xe898,
    0x7779,
    0x4079,
    0x8cc7,
    0xfe73,
    0x2b6f,
    0x6cee,
    0x5203,
]);
const D2 = gf([
    0xf159,
    0x26b2,
    0x9b94,
    0xebd6,
    0xb156,
    0x8283,
    0x149a,
    0x00e0,
    0xd130,
    0xeef3,
    0x80f2,
    0x198e,
    0xfce7,
    0x56df,
    0xd9dc,
    0x2406,
]);
const X = gf([
    0xd51a,
    0x8f25,
    0x2d60,
    0xc956,
    0xa7b2,
    0x9525,
    0xc760,
    0x692c,
    0xdc5c,
    0xfdd6,
    0xe231,
    0xc0a4,
    0x53fe,
    0xcd6e,
    0x36d3,
    0x2169,
]);
const Y = gf([
    0x6658,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
    0x6666,
]);
const I = gf([
    0xa0b0,
    0x4a0e,
    0x1b27,
    0xc4ee,
    0xe478,
    0xad2f,
    0x1806,
    0x2f43,
    0xd7a7,
    0x3dfb,
    0x0099,
    0x2b4d,
    0xdf0b,
    0x4fc1,
    0x2480,
    0x2b83,
]);
function ts64(x, i, h, l) {
    x[i] = (h >> 24) & 0xff;
    x[i + 1] = (h >> 16) & 0xff;
    x[i + 2] = (h >> 8) & 0xff;
    x[i + 3] = h & 0xff;
    x[i + 4] = (l >> 24) & 0xff;
    x[i + 5] = (l >> 16) & 0xff;
    x[i + 6] = (l >> 8) & 0xff;
    x[i + 7] = l & 0xff;
}
function vn(x, xi, y, yi, n) {
    var i, d = 0;
    for (i = 0; i < n; i++)
        d |= x[xi + i] ^ y[yi + i];
    return (1 & ((d - 1) >>> 8)) - 1;
}
function crypto_verify_16(x, xi, y, yi) {
    return vn(x, xi, y, yi, 16);
}
function crypto_verify_32(x, xi, y, yi) {
    return vn(x, xi, y, yi, 32);
}
// prettier-ignore
function core_salsa20(o, p, k, c) {
    var j0 = c[0] & 0xff | (c[1] & 0xff) << 8 | (c[2] & 0xff) << 16 | (c[3] & 0xff) << 24, j1 = k[0] & 0xff | (k[1] & 0xff) << 8 | (k[2] & 0xff) << 16 | (k[3] & 0xff) << 24, j2 = k[4] & 0xff | (k[5] & 0xff) << 8 | (k[6] & 0xff) << 16 | (k[7] & 0xff) << 24, j3 = k[8] & 0xff | (k[9] & 0xff) << 8 | (k[10] & 0xff) << 16 | (k[11] & 0xff) << 24, j4 = k[12] & 0xff | (k[13] & 0xff) << 8 | (k[14] & 0xff) << 16 | (k[15] & 0xff) << 24, j5 = c[4] & 0xff | (c[5] & 0xff) << 8 | (c[6] & 0xff) << 16 | (c[7] & 0xff) << 24, j6 = p[0] & 0xff | (p[1] & 0xff) << 8 | (p[2] & 0xff) << 16 | (p[3] & 0xff) << 24, j7 = p[4] & 0xff | (p[5] & 0xff) << 8 | (p[6] & 0xff) << 16 | (p[7] & 0xff) << 24, j8 = p[8] & 0xff | (p[9] & 0xff) << 8 | (p[10] & 0xff) << 16 | (p[11] & 0xff) << 24, j9 = p[12] & 0xff | (p[13] & 0xff) << 8 | (p[14] & 0xff) << 16 | (p[15] & 0xff) << 24, j10 = c[8] & 0xff | (c[9] & 0xff) << 8 | (c[10] & 0xff) << 16 | (c[11] & 0xff) << 24, j11 = k[16] & 0xff | (k[17] & 0xff) << 8 | (k[18] & 0xff) << 16 | (k[19] & 0xff) << 24, j12 = k[20] & 0xff | (k[21] & 0xff) << 8 | (k[22] & 0xff) << 16 | (k[23] & 0xff) << 24, j13 = k[24] & 0xff | (k[25] & 0xff) << 8 | (k[26] & 0xff) << 16 | (k[27] & 0xff) << 24, j14 = k[28] & 0xff | (k[29] & 0xff) << 8 | (k[30] & 0xff) << 16 | (k[31] & 0xff) << 24, j15 = c[12] & 0xff | (c[13] & 0xff) << 8 | (c[14] & 0xff) << 16 | (c[15] & 0xff) << 24;
    var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
    for (var i = 0; i < 20; i += 2) {
        u = x0 + x12 | 0;
        x4 ^= u << 7 | u >>> (32 - 7);
        u = x4 + x0 | 0;
        x8 ^= u << 9 | u >>> (32 - 9);
        u = x8 + x4 | 0;
        x12 ^= u << 13 | u >>> (32 - 13);
        u = x12 + x8 | 0;
        x0 ^= u << 18 | u >>> (32 - 18);
        u = x5 + x1 | 0;
        x9 ^= u << 7 | u >>> (32 - 7);
        u = x9 + x5 | 0;
        x13 ^= u << 9 | u >>> (32 - 9);
        u = x13 + x9 | 0;
        x1 ^= u << 13 | u >>> (32 - 13);
        u = x1 + x13 | 0;
        x5 ^= u << 18 | u >>> (32 - 18);
        u = x10 + x6 | 0;
        x14 ^= u << 7 | u >>> (32 - 7);
        u = x14 + x10 | 0;
        x2 ^= u << 9 | u >>> (32 - 9);
        u = x2 + x14 | 0;
        x6 ^= u << 13 | u >>> (32 - 13);
        u = x6 + x2 | 0;
        x10 ^= u << 18 | u >>> (32 - 18);
        u = x15 + x11 | 0;
        x3 ^= u << 7 | u >>> (32 - 7);
        u = x3 + x15 | 0;
        x7 ^= u << 9 | u >>> (32 - 9);
        u = x7 + x3 | 0;
        x11 ^= u << 13 | u >>> (32 - 13);
        u = x11 + x7 | 0;
        x15 ^= u << 18 | u >>> (32 - 18);
        u = x0 + x3 | 0;
        x1 ^= u << 7 | u >>> (32 - 7);
        u = x1 + x0 | 0;
        x2 ^= u << 9 | u >>> (32 - 9);
        u = x2 + x1 | 0;
        x3 ^= u << 13 | u >>> (32 - 13);
        u = x3 + x2 | 0;
        x0 ^= u << 18 | u >>> (32 - 18);
        u = x5 + x4 | 0;
        x6 ^= u << 7 | u >>> (32 - 7);
        u = x6 + x5 | 0;
        x7 ^= u << 9 | u >>> (32 - 9);
        u = x7 + x6 | 0;
        x4 ^= u << 13 | u >>> (32 - 13);
        u = x4 + x7 | 0;
        x5 ^= u << 18 | u >>> (32 - 18);
        u = x10 + x9 | 0;
        x11 ^= u << 7 | u >>> (32 - 7);
        u = x11 + x10 | 0;
        x8 ^= u << 9 | u >>> (32 - 9);
        u = x8 + x11 | 0;
        x9 ^= u << 13 | u >>> (32 - 13);
        u = x9 + x8 | 0;
        x10 ^= u << 18 | u >>> (32 - 18);
        u = x15 + x14 | 0;
        x12 ^= u << 7 | u >>> (32 - 7);
        u = x12 + x15 | 0;
        x13 ^= u << 9 | u >>> (32 - 9);
        u = x13 + x12 | 0;
        x14 ^= u << 13 | u >>> (32 - 13);
        u = x14 + x13 | 0;
        x15 ^= u << 18 | u >>> (32 - 18);
    }
    x0 = x0 + j0 | 0;
    x1 = x1 + j1 | 0;
    x2 = x2 + j2 | 0;
    x3 = x3 + j3 | 0;
    x4 = x4 + j4 | 0;
    x5 = x5 + j5 | 0;
    x6 = x6 + j6 | 0;
    x7 = x7 + j7 | 0;
    x8 = x8 + j8 | 0;
    x9 = x9 + j9 | 0;
    x10 = x10 + j10 | 0;
    x11 = x11 + j11 | 0;
    x12 = x12 + j12 | 0;
    x13 = x13 + j13 | 0;
    x14 = x14 + j14 | 0;
    x15 = x15 + j15 | 0;
    o[0] = x0 >>> 0 & 0xff;
    o[1] = x0 >>> 8 & 0xff;
    o[2] = x0 >>> 16 & 0xff;
    o[3] = x0 >>> 24 & 0xff;
    o[4] = x1 >>> 0 & 0xff;
    o[5] = x1 >>> 8 & 0xff;
    o[6] = x1 >>> 16 & 0xff;
    o[7] = x1 >>> 24 & 0xff;
    o[8] = x2 >>> 0 & 0xff;
    o[9] = x2 >>> 8 & 0xff;
    o[10] = x2 >>> 16 & 0xff;
    o[11] = x2 >>> 24 & 0xff;
    o[12] = x3 >>> 0 & 0xff;
    o[13] = x3 >>> 8 & 0xff;
    o[14] = x3 >>> 16 & 0xff;
    o[15] = x3 >>> 24 & 0xff;
    o[16] = x4 >>> 0 & 0xff;
    o[17] = x4 >>> 8 & 0xff;
    o[18] = x4 >>> 16 & 0xff;
    o[19] = x4 >>> 24 & 0xff;
    o[20] = x5 >>> 0 & 0xff;
    o[21] = x5 >>> 8 & 0xff;
    o[22] = x5 >>> 16 & 0xff;
    o[23] = x5 >>> 24 & 0xff;
    o[24] = x6 >>> 0 & 0xff;
    o[25] = x6 >>> 8 & 0xff;
    o[26] = x6 >>> 16 & 0xff;
    o[27] = x6 >>> 24 & 0xff;
    o[28] = x7 >>> 0 & 0xff;
    o[29] = x7 >>> 8 & 0xff;
    o[30] = x7 >>> 16 & 0xff;
    o[31] = x7 >>> 24 & 0xff;
    o[32] = x8 >>> 0 & 0xff;
    o[33] = x8 >>> 8 & 0xff;
    o[34] = x8 >>> 16 & 0xff;
    o[35] = x8 >>> 24 & 0xff;
    o[36] = x9 >>> 0 & 0xff;
    o[37] = x9 >>> 8 & 0xff;
    o[38] = x9 >>> 16 & 0xff;
    o[39] = x9 >>> 24 & 0xff;
    o[40] = x10 >>> 0 & 0xff;
    o[41] = x10 >>> 8 & 0xff;
    o[42] = x10 >>> 16 & 0xff;
    o[43] = x10 >>> 24 & 0xff;
    o[44] = x11 >>> 0 & 0xff;
    o[45] = x11 >>> 8 & 0xff;
    o[46] = x11 >>> 16 & 0xff;
    o[47] = x11 >>> 24 & 0xff;
    o[48] = x12 >>> 0 & 0xff;
    o[49] = x12 >>> 8 & 0xff;
    o[50] = x12 >>> 16 & 0xff;
    o[51] = x12 >>> 24 & 0xff;
    o[52] = x13 >>> 0 & 0xff;
    o[53] = x13 >>> 8 & 0xff;
    o[54] = x13 >>> 16 & 0xff;
    o[55] = x13 >>> 24 & 0xff;
    o[56] = x14 >>> 0 & 0xff;
    o[57] = x14 >>> 8 & 0xff;
    o[58] = x14 >>> 16 & 0xff;
    o[59] = x14 >>> 24 & 0xff;
    o[60] = x15 >>> 0 & 0xff;
    o[61] = x15 >>> 8 & 0xff;
    o[62] = x15 >>> 16 & 0xff;
    o[63] = x15 >>> 24 & 0xff;
}
function core_hsalsa20(o, p, k, c) {
    var j0 = (c[0] & 0xff) |
        ((c[1] & 0xff) << 8) |
        ((c[2] & 0xff) << 16) |
        ((c[3] & 0xff) << 24), j1 = (k[0] & 0xff) |
        ((k[1] & 0xff) << 8) |
        ((k[2] & 0xff) << 16) |
        ((k[3] & 0xff) << 24), j2 = (k[4] & 0xff) |
        ((k[5] & 0xff) << 8) |
        ((k[6] & 0xff) << 16) |
        ((k[7] & 0xff) << 24), j3 = (k[8] & 0xff) |
        ((k[9] & 0xff) << 8) |
        ((k[10] & 0xff) << 16) |
        ((k[11] & 0xff) << 24), j4 = (k[12] & 0xff) |
        ((k[13] & 0xff) << 8) |
        ((k[14] & 0xff) << 16) |
        ((k[15] & 0xff) << 24), j5 = (c[4] & 0xff) |
        ((c[5] & 0xff) << 8) |
        ((c[6] & 0xff) << 16) |
        ((c[7] & 0xff) << 24), j6 = (p[0] & 0xff) |
        ((p[1] & 0xff) << 8) |
        ((p[2] & 0xff) << 16) |
        ((p[3] & 0xff) << 24), j7 = (p[4] & 0xff) |
        ((p[5] & 0xff) << 8) |
        ((p[6] & 0xff) << 16) |
        ((p[7] & 0xff) << 24), j8 = (p[8] & 0xff) |
        ((p[9] & 0xff) << 8) |
        ((p[10] & 0xff) << 16) |
        ((p[11] & 0xff) << 24), j9 = (p[12] & 0xff) |
        ((p[13] & 0xff) << 8) |
        ((p[14] & 0xff) << 16) |
        ((p[15] & 0xff) << 24), j10 = (c[8] & 0xff) |
        ((c[9] & 0xff) << 8) |
        ((c[10] & 0xff) << 16) |
        ((c[11] & 0xff) << 24), j11 = (k[16] & 0xff) |
        ((k[17] & 0xff) << 8) |
        ((k[18] & 0xff) << 16) |
        ((k[19] & 0xff) << 24), j12 = (k[20] & 0xff) |
        ((k[21] & 0xff) << 8) |
        ((k[22] & 0xff) << 16) |
        ((k[23] & 0xff) << 24), j13 = (k[24] & 0xff) |
        ((k[25] & 0xff) << 8) |
        ((k[26] & 0xff) << 16) |
        ((k[27] & 0xff) << 24), j14 = (k[28] & 0xff) |
        ((k[29] & 0xff) << 8) |
        ((k[30] & 0xff) << 16) |
        ((k[31] & 0xff) << 24), j15 = (c[12] & 0xff) |
        ((c[13] & 0xff) << 8) |
        ((c[14] & 0xff) << 16) |
        ((c[15] & 0xff) << 24);
    var x0 = j0, x1 = j1, x2 = j2, x3 = j3, x4 = j4, x5 = j5, x6 = j6, x7 = j7, x8 = j8, x9 = j9, x10 = j10, x11 = j11, x12 = j12, x13 = j13, x14 = j14, x15 = j15, u;
    for (var i = 0; i < 20; i += 2) {
        u = (x0 + x12) | 0;
        x4 ^= (u << 7) | (u >>> (32 - 7));
        u = (x4 + x0) | 0;
        x8 ^= (u << 9) | (u >>> (32 - 9));
        u = (x8 + x4) | 0;
        x12 ^= (u << 13) | (u >>> (32 - 13));
        u = (x12 + x8) | 0;
        x0 ^= (u << 18) | (u >>> (32 - 18));
        u = (x5 + x1) | 0;
        x9 ^= (u << 7) | (u >>> (32 - 7));
        u = (x9 + x5) | 0;
        x13 ^= (u << 9) | (u >>> (32 - 9));
        u = (x13 + x9) | 0;
        x1 ^= (u << 13) | (u >>> (32 - 13));
        u = (x1 + x13) | 0;
        x5 ^= (u << 18) | (u >>> (32 - 18));
        u = (x10 + x6) | 0;
        x14 ^= (u << 7) | (u >>> (32 - 7));
        u = (x14 + x10) | 0;
        x2 ^= (u << 9) | (u >>> (32 - 9));
        u = (x2 + x14) | 0;
        x6 ^= (u << 13) | (u >>> (32 - 13));
        u = (x6 + x2) | 0;
        x10 ^= (u << 18) | (u >>> (32 - 18));
        u = (x15 + x11) | 0;
        x3 ^= (u << 7) | (u >>> (32 - 7));
        u = (x3 + x15) | 0;
        x7 ^= (u << 9) | (u >>> (32 - 9));
        u = (x7 + x3) | 0;
        x11 ^= (u << 13) | (u >>> (32 - 13));
        u = (x11 + x7) | 0;
        x15 ^= (u << 18) | (u >>> (32 - 18));
        u = (x0 + x3) | 0;
        x1 ^= (u << 7) | (u >>> (32 - 7));
        u = (x1 + x0) | 0;
        x2 ^= (u << 9) | (u >>> (32 - 9));
        u = (x2 + x1) | 0;
        x3 ^= (u << 13) | (u >>> (32 - 13));
        u = (x3 + x2) | 0;
        x0 ^= (u << 18) | (u >>> (32 - 18));
        u = (x5 + x4) | 0;
        x6 ^= (u << 7) | (u >>> (32 - 7));
        u = (x6 + x5) | 0;
        x7 ^= (u << 9) | (u >>> (32 - 9));
        u = (x7 + x6) | 0;
        x4 ^= (u << 13) | (u >>> (32 - 13));
        u = (x4 + x7) | 0;
        x5 ^= (u << 18) | (u >>> (32 - 18));
        u = (x10 + x9) | 0;
        x11 ^= (u << 7) | (u >>> (32 - 7));
        u = (x11 + x10) | 0;
        x8 ^= (u << 9) | (u >>> (32 - 9));
        u = (x8 + x11) | 0;
        x9 ^= (u << 13) | (u >>> (32 - 13));
        u = (x9 + x8) | 0;
        x10 ^= (u << 18) | (u >>> (32 - 18));
        u = (x15 + x14) | 0;
        x12 ^= (u << 7) | (u >>> (32 - 7));
        u = (x12 + x15) | 0;
        x13 ^= (u << 9) | (u >>> (32 - 9));
        u = (x13 + x12) | 0;
        x14 ^= (u << 13) | (u >>> (32 - 13));
        u = (x14 + x13) | 0;
        x15 ^= (u << 18) | (u >>> (32 - 18));
    }
    o[0] = (x0 >>> 0) & 0xff;
    o[1] = (x0 >>> 8) & 0xff;
    o[2] = (x0 >>> 16) & 0xff;
    o[3] = (x0 >>> 24) & 0xff;
    o[4] = (x5 >>> 0) & 0xff;
    o[5] = (x5 >>> 8) & 0xff;
    o[6] = (x5 >>> 16) & 0xff;
    o[7] = (x5 >>> 24) & 0xff;
    o[8] = (x10 >>> 0) & 0xff;
    o[9] = (x10 >>> 8) & 0xff;
    o[10] = (x10 >>> 16) & 0xff;
    o[11] = (x10 >>> 24) & 0xff;
    o[12] = (x15 >>> 0) & 0xff;
    o[13] = (x15 >>> 8) & 0xff;
    o[14] = (x15 >>> 16) & 0xff;
    o[15] = (x15 >>> 24) & 0xff;
    o[16] = (x6 >>> 0) & 0xff;
    o[17] = (x6 >>> 8) & 0xff;
    o[18] = (x6 >>> 16) & 0xff;
    o[19] = (x6 >>> 24) & 0xff;
    o[20] = (x7 >>> 0) & 0xff;
    o[21] = (x7 >>> 8) & 0xff;
    o[22] = (x7 >>> 16) & 0xff;
    o[23] = (x7 >>> 24) & 0xff;
    o[24] = (x8 >>> 0) & 0xff;
    o[25] = (x8 >>> 8) & 0xff;
    o[26] = (x8 >>> 16) & 0xff;
    o[27] = (x8 >>> 24) & 0xff;
    o[28] = (x9 >>> 0) & 0xff;
    o[29] = (x9 >>> 8) & 0xff;
    o[30] = (x9 >>> 16) & 0xff;
    o[31] = (x9 >>> 24) & 0xff;
}
function crypto_core_salsa20(out, inp, k, c) {
    core_salsa20(out, inp, k, c);
}
function crypto_core_hsalsa20(out, inp, k, c) {
    core_hsalsa20(out, inp, k, c);
}
var sigma = new Uint8Array([
    101,
    120,
    112,
    97,
    110,
    100,
    32,
    51,
    50,
    45,
    98,
    121,
    116,
    101,
    32,
    107,
]);
// "expand 32-byte k"
function crypto_stream_salsa20_xor(c, cpos, m, mpos, b, n, k) {
    var z = new Uint8Array(16), x = new Uint8Array(64);
    var u, i;
    for (i = 0; i < 16; i++)
        z[i] = 0;
    for (i = 0; i < 8; i++)
        z[i] = n[i];
    while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);
        for (i = 0; i < 64; i++)
            c[cpos + i] = m[mpos + i] ^ x[i];
        u = 1;
        for (i = 8; i < 16; i++) {
            u = (u + (z[i] & 0xff)) | 0;
            z[i] = u & 0xff;
            u >>>= 8;
        }
        b -= 64;
        cpos += 64;
        mpos += 64;
    }
    if (b > 0) {
        crypto_core_salsa20(x, z, k, sigma);
        for (i = 0; i < b; i++)
            c[cpos + i] = m[mpos + i] ^ x[i];
    }
    return 0;
}
function crypto_stream_salsa20(c, cpos, b, n, k) {
    var z = new Uint8Array(16), x = new Uint8Array(64);
    var u, i;
    for (i = 0; i < 16; i++)
        z[i] = 0;
    for (i = 0; i < 8; i++)
        z[i] = n[i];
    while (b >= 64) {
        crypto_core_salsa20(x, z, k, sigma);
        for (i = 0; i < 64; i++)
            c[cpos + i] = x[i];
        u = 1;
        for (i = 8; i < 16; i++) {
            u = (u + (z[i] & 0xff)) | 0;
            z[i] = u & 0xff;
            u >>>= 8;
        }
        b -= 64;
        cpos += 64;
    }
    if (b > 0) {
        crypto_core_salsa20(x, z, k, sigma);
        for (i = 0; i < b; i++)
            c[cpos + i] = x[i];
    }
    return 0;
}
function crypto_stream(c, cpos, d, n, k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s, n, k, sigma);
    var sn = new Uint8Array(8);
    for (var i = 0; i < 8; i++)
        sn[i] = n[i + 16];
    return crypto_stream_salsa20(c, cpos, d, sn, s);
}
function crypto_stream_xor(c, cpos, m, mpos, d, n, k) {
    var s = new Uint8Array(32);
    crypto_core_hsalsa20(s, n, k, sigma);
    var sn = new Uint8Array(8);
    for (var i = 0; i < 8; i++)
        sn[i] = n[i + 16];
    return crypto_stream_salsa20_xor(c, cpos, m, mpos, d, sn, s);
}
/*
 * Port of Andrew Moon's Poly1305-donna-16. Public domain.
 * https://github.com/floodyberry/poly1305-donna
 */
class poly1305 {
    constructor(key) {
        this.buffer = new Uint8Array(16);
        this.r = new Uint16Array(10);
        this.h = new Uint16Array(10);
        this.pad = new Uint16Array(8);
        this.leftover = 0;
        this.fin = 0;
        var t0, t1, t2, t3, t4, t5, t6, t7;
        t0 = (key[0] & 0xff) | ((key[1] & 0xff) << 8);
        this.r[0] = t0 & 0x1fff;
        t1 = (key[2] & 0xff) | ((key[3] & 0xff) << 8);
        this.r[1] = ((t0 >>> 13) | (t1 << 3)) & 0x1fff;
        t2 = (key[4] & 0xff) | ((key[5] & 0xff) << 8);
        this.r[2] = ((t1 >>> 10) | (t2 << 6)) & 0x1f03;
        t3 = (key[6] & 0xff) | ((key[7] & 0xff) << 8);
        this.r[3] = ((t2 >>> 7) | (t3 << 9)) & 0x1fff;
        t4 = (key[8] & 0xff) | ((key[9] & 0xff) << 8);
        this.r[4] = ((t3 >>> 4) | (t4 << 12)) & 0x00ff;
        this.r[5] = (t4 >>> 1) & 0x1ffe;
        t5 = (key[10] & 0xff) | ((key[11] & 0xff) << 8);
        this.r[6] = ((t4 >>> 14) | (t5 << 2)) & 0x1fff;
        t6 = (key[12] & 0xff) | ((key[13] & 0xff) << 8);
        this.r[7] = ((t5 >>> 11) | (t6 << 5)) & 0x1f81;
        t7 = (key[14] & 0xff) | ((key[15] & 0xff) << 8);
        this.r[8] = ((t6 >>> 8) | (t7 << 8)) & 0x1fff;
        this.r[9] = (t7 >>> 5) & 0x007f;
        this.pad[0] = (key[16] & 0xff) | ((key[17] & 0xff) << 8);
        this.pad[1] = (key[18] & 0xff) | ((key[19] & 0xff) << 8);
        this.pad[2] = (key[20] & 0xff) | ((key[21] & 0xff) << 8);
        this.pad[3] = (key[22] & 0xff) | ((key[23] & 0xff) << 8);
        this.pad[4] = (key[24] & 0xff) | ((key[25] & 0xff) << 8);
        this.pad[5] = (key[26] & 0xff) | ((key[27] & 0xff) << 8);
        this.pad[6] = (key[28] & 0xff) | ((key[29] & 0xff) << 8);
        this.pad[7] = (key[30] & 0xff) | ((key[31] & 0xff) << 8);
    }
    blocks(m, mpos, bytes) {
        var hibit = this.fin ? 0 : 1 << 11;
        var t0, t1, t2, t3, t4, t5, t6, t7, c;
        var d0, d1, d2, d3, d4, d5, d6, d7, d8, d9;
        var h0 = this.h[0], h1 = this.h[1], h2 = this.h[2], h3 = this.h[3], h4 = this.h[4], h5 = this.h[5], h6 = this.h[6], h7 = this.h[7], h8 = this.h[8], h9 = this.h[9];
        var r0 = this.r[0], r1 = this.r[1], r2 = this.r[2], r3 = this.r[3], r4 = this.r[4], r5 = this.r[5], r6 = this.r[6], r7 = this.r[7], r8 = this.r[8], r9 = this.r[9];
        while (bytes >= 16) {
            t0 = (m[mpos + 0] & 0xff) | ((m[mpos + 1] & 0xff) << 8);
            h0 += t0 & 0x1fff;
            t1 = (m[mpos + 2] & 0xff) | ((m[mpos + 3] & 0xff) << 8);
            h1 += ((t0 >>> 13) | (t1 << 3)) & 0x1fff;
            t2 = (m[mpos + 4] & 0xff) | ((m[mpos + 5] & 0xff) << 8);
            h2 += ((t1 >>> 10) | (t2 << 6)) & 0x1fff;
            t3 = (m[mpos + 6] & 0xff) | ((m[mpos + 7] & 0xff) << 8);
            h3 += ((t2 >>> 7) | (t3 << 9)) & 0x1fff;
            t4 = (m[mpos + 8] & 0xff) | ((m[mpos + 9] & 0xff) << 8);
            h4 += ((t3 >>> 4) | (t4 << 12)) & 0x1fff;
            h5 += (t4 >>> 1) & 0x1fff;
            t5 = (m[mpos + 10] & 0xff) | ((m[mpos + 11] & 0xff) << 8);
            h6 += ((t4 >>> 14) | (t5 << 2)) & 0x1fff;
            t6 = (m[mpos + 12] & 0xff) | ((m[mpos + 13] & 0xff) << 8);
            h7 += ((t5 >>> 11) | (t6 << 5)) & 0x1fff;
            t7 = (m[mpos + 14] & 0xff) | ((m[mpos + 15] & 0xff) << 8);
            h8 += ((t6 >>> 8) | (t7 << 8)) & 0x1fff;
            h9 += (t7 >>> 5) | hibit;
            c = 0;
            d0 = c;
            d0 += h0 * r0;
            d0 += h1 * (5 * r9);
            d0 += h2 * (5 * r8);
            d0 += h3 * (5 * r7);
            d0 += h4 * (5 * r6);
            c = d0 >>> 13;
            d0 &= 0x1fff;
            d0 += h5 * (5 * r5);
            d0 += h6 * (5 * r4);
            d0 += h7 * (5 * r3);
            d0 += h8 * (5 * r2);
            d0 += h9 * (5 * r1);
            c += d0 >>> 13;
            d0 &= 0x1fff;
            d1 = c;
            d1 += h0 * r1;
            d1 += h1 * r0;
            d1 += h2 * (5 * r9);
            d1 += h3 * (5 * r8);
            d1 += h4 * (5 * r7);
            c = d1 >>> 13;
            d1 &= 0x1fff;
            d1 += h5 * (5 * r6);
            d1 += h6 * (5 * r5);
            d1 += h7 * (5 * r4);
            d1 += h8 * (5 * r3);
            d1 += h9 * (5 * r2);
            c += d1 >>> 13;
            d1 &= 0x1fff;
            d2 = c;
            d2 += h0 * r2;
            d2 += h1 * r1;
            d2 += h2 * r0;
            d2 += h3 * (5 * r9);
            d2 += h4 * (5 * r8);
            c = d2 >>> 13;
            d2 &= 0x1fff;
            d2 += h5 * (5 * r7);
            d2 += h6 * (5 * r6);
            d2 += h7 * (5 * r5);
            d2 += h8 * (5 * r4);
            d2 += h9 * (5 * r3);
            c += d2 >>> 13;
            d2 &= 0x1fff;
            d3 = c;
            d3 += h0 * r3;
            d3 += h1 * r2;
            d3 += h2 * r1;
            d3 += h3 * r0;
            d3 += h4 * (5 * r9);
            c = d3 >>> 13;
            d3 &= 0x1fff;
            d3 += h5 * (5 * r8);
            d3 += h6 * (5 * r7);
            d3 += h7 * (5 * r6);
            d3 += h8 * (5 * r5);
            d3 += h9 * (5 * r4);
            c += d3 >>> 13;
            d3 &= 0x1fff;
            d4 = c;
            d4 += h0 * r4;
            d4 += h1 * r3;
            d4 += h2 * r2;
            d4 += h3 * r1;
            d4 += h4 * r0;
            c = d4 >>> 13;
            d4 &= 0x1fff;
            d4 += h5 * (5 * r9);
            d4 += h6 * (5 * r8);
            d4 += h7 * (5 * r7);
            d4 += h8 * (5 * r6);
            d4 += h9 * (5 * r5);
            c += d4 >>> 13;
            d4 &= 0x1fff;
            d5 = c;
            d5 += h0 * r5;
            d5 += h1 * r4;
            d5 += h2 * r3;
            d5 += h3 * r2;
            d5 += h4 * r1;
            c = d5 >>> 13;
            d5 &= 0x1fff;
            d5 += h5 * r0;
            d5 += h6 * (5 * r9);
            d5 += h7 * (5 * r8);
            d5 += h8 * (5 * r7);
            d5 += h9 * (5 * r6);
            c += d5 >>> 13;
            d5 &= 0x1fff;
            d6 = c;
            d6 += h0 * r6;
            d6 += h1 * r5;
            d6 += h2 * r4;
            d6 += h3 * r3;
            d6 += h4 * r2;
            c = d6 >>> 13;
            d6 &= 0x1fff;
            d6 += h5 * r1;
            d6 += h6 * r0;
            d6 += h7 * (5 * r9);
            d6 += h8 * (5 * r8);
            d6 += h9 * (5 * r7);
            c += d6 >>> 13;
            d6 &= 0x1fff;
            d7 = c;
            d7 += h0 * r7;
            d7 += h1 * r6;
            d7 += h2 * r5;
            d7 += h3 * r4;
            d7 += h4 * r3;
            c = d7 >>> 13;
            d7 &= 0x1fff;
            d7 += h5 * r2;
            d7 += h6 * r1;
            d7 += h7 * r0;
            d7 += h8 * (5 * r9);
            d7 += h9 * (5 * r8);
            c += d7 >>> 13;
            d7 &= 0x1fff;
            d8 = c;
            d8 += h0 * r8;
            d8 += h1 * r7;
            d8 += h2 * r6;
            d8 += h3 * r5;
            d8 += h4 * r4;
            c = d8 >>> 13;
            d8 &= 0x1fff;
            d8 += h5 * r3;
            d8 += h6 * r2;
            d8 += h7 * r1;
            d8 += h8 * r0;
            d8 += h9 * (5 * r9);
            c += d8 >>> 13;
            d8 &= 0x1fff;
            d9 = c;
            d9 += h0 * r9;
            d9 += h1 * r8;
            d9 += h2 * r7;
            d9 += h3 * r6;
            d9 += h4 * r5;
            c = d9 >>> 13;
            d9 &= 0x1fff;
            d9 += h5 * r4;
            d9 += h6 * r3;
            d9 += h7 * r2;
            d9 += h8 * r1;
            d9 += h9 * r0;
            c += d9 >>> 13;
            d9 &= 0x1fff;
            c = ((c << 2) + c) | 0;
            c = (c + d0) | 0;
            d0 = c & 0x1fff;
            c = c >>> 13;
            d1 += c;
            h0 = d0;
            h1 = d1;
            h2 = d2;
            h3 = d3;
            h4 = d4;
            h5 = d5;
            h6 = d6;
            h7 = d7;
            h8 = d8;
            h9 = d9;
            mpos += 16;
            bytes -= 16;
        }
        this.h[0] = h0;
        this.h[1] = h1;
        this.h[2] = h2;
        this.h[3] = h3;
        this.h[4] = h4;
        this.h[5] = h5;
        this.h[6] = h6;
        this.h[7] = h7;
        this.h[8] = h8;
        this.h[9] = h9;
    }
    finish(mac, macpos) {
        var g = new Uint16Array(10);
        var c, mask, f, i;
        if (this.leftover) {
            i = this.leftover;
            this.buffer[i++] = 1;
            for (; i < 16; i++)
                this.buffer[i] = 0;
            this.fin = 1;
            this.blocks(this.buffer, 0, 16);
        }
        c = this.h[1] >>> 13;
        this.h[1] &= 0x1fff;
        for (i = 2; i < 10; i++) {
            this.h[i] += c;
            c = this.h[i] >>> 13;
            this.h[i] &= 0x1fff;
        }
        this.h[0] += c * 5;
        c = this.h[0] >>> 13;
        this.h[0] &= 0x1fff;
        this.h[1] += c;
        c = this.h[1] >>> 13;
        this.h[1] &= 0x1fff;
        this.h[2] += c;
        g[0] = this.h[0] + 5;
        c = g[0] >>> 13;
        g[0] &= 0x1fff;
        for (i = 1; i < 10; i++) {
            g[i] = this.h[i] + c;
            c = g[i] >>> 13;
            g[i] &= 0x1fff;
        }
        g[9] -= 1 << 13;
        mask = (c ^ 1) - 1;
        for (i = 0; i < 10; i++)
            g[i] &= mask;
        mask = ~mask;
        for (i = 0; i < 10; i++)
            this.h[i] = (this.h[i] & mask) | g[i];
        this.h[0] = (this.h[0] | (this.h[1] << 13)) & 0xffff;
        this.h[1] = ((this.h[1] >>> 3) | (this.h[2] << 10)) & 0xffff;
        this.h[2] = ((this.h[2] >>> 6) | (this.h[3] << 7)) & 0xffff;
        this.h[3] = ((this.h[3] >>> 9) | (this.h[4] << 4)) & 0xffff;
        this.h[4] =
            ((this.h[4] >>> 12) | (this.h[5] << 1) | (this.h[6] << 14)) & 0xffff;
        this.h[5] = ((this.h[6] >>> 2) | (this.h[7] << 11)) & 0xffff;
        this.h[6] = ((this.h[7] >>> 5) | (this.h[8] << 8)) & 0xffff;
        this.h[7] = ((this.h[8] >>> 8) | (this.h[9] << 5)) & 0xffff;
        f = this.h[0] + this.pad[0];
        this.h[0] = f & 0xffff;
        for (i = 1; i < 8; i++) {
            f = (((this.h[i] + this.pad[i]) | 0) + (f >>> 16)) | 0;
            this.h[i] = f & 0xffff;
        }
        mac[macpos + 0] = (this.h[0] >>> 0) & 0xff;
        mac[macpos + 1] = (this.h[0] >>> 8) & 0xff;
        mac[macpos + 2] = (this.h[1] >>> 0) & 0xff;
        mac[macpos + 3] = (this.h[1] >>> 8) & 0xff;
        mac[macpos + 4] = (this.h[2] >>> 0) & 0xff;
        mac[macpos + 5] = (this.h[2] >>> 8) & 0xff;
        mac[macpos + 6] = (this.h[3] >>> 0) & 0xff;
        mac[macpos + 7] = (this.h[3] >>> 8) & 0xff;
        mac[macpos + 8] = (this.h[4] >>> 0) & 0xff;
        mac[macpos + 9] = (this.h[4] >>> 8) & 0xff;
        mac[macpos + 10] = (this.h[5] >>> 0) & 0xff;
        mac[macpos + 11] = (this.h[5] >>> 8) & 0xff;
        mac[macpos + 12] = (this.h[6] >>> 0) & 0xff;
        mac[macpos + 13] = (this.h[6] >>> 8) & 0xff;
        mac[macpos + 14] = (this.h[7] >>> 0) & 0xff;
        mac[macpos + 15] = (this.h[7] >>> 8) & 0xff;
    }
    update(m, mpos, bytes) {
        var i, want;
        if (this.leftover) {
            want = 16 - this.leftover;
            if (want > bytes)
                want = bytes;
            for (i = 0; i < want; i++)
                this.buffer[this.leftover + i] = m[mpos + i];
            bytes -= want;
            mpos += want;
            this.leftover += want;
            if (this.leftover < 16)
                return;
            this.blocks(this.buffer, 0, 16);
            this.leftover = 0;
        }
        if (bytes >= 16) {
            want = bytes - (bytes % 16);
            this.blocks(m, mpos, want);
            mpos += want;
            bytes -= want;
        }
        if (bytes) {
            for (i = 0; i < bytes; i++)
                this.buffer[this.leftover + i] = m[mpos + i];
            this.leftover += bytes;
        }
    }
}
function crypto_onetimeauth(out, outpos, m, mpos, n, k) {
    var s = new poly1305(k);
    s.update(m, mpos, n);
    s.finish(out, outpos);
    return 0;
}
function crypto_onetimeauth_verify(h, hpos, m, mpos, n, k) {
    var x = new Uint8Array(16);
    crypto_onetimeauth(x, 0, m, mpos, n, k);
    return crypto_verify_16(h, hpos, x, 0);
}
function crypto_secretbox(c, m, d, n, k) {
    var i;
    if (d < 32)
        return -1;
    crypto_stream_xor(c, 0, m, 0, d, n, k);
    crypto_onetimeauth(c, 16, c, 32, d - 32, c);
    for (i = 0; i < 16; i++)
        c[i] = 0;
    return 0;
}
function crypto_secretbox_open(m, c, d, n, k) {
    var i;
    var x = new Uint8Array(32);
    if (d < 32)
        return -1;
    crypto_stream(x, 0, 32, n, k);
    if (crypto_onetimeauth_verify(c, 16, c, 32, d - 32, x) !== 0)
        return -1;
    crypto_stream_xor(m, 0, c, 0, d, n, k);
    for (i = 0; i < 32; i++)
        m[i] = 0;
    return 0;
}
function set25519(r, a) {
    var i;
    for (i = 0; i < 16; i++)
        r[i] = a[i] | 0;
}
function car25519(o) {
    var i, v, c = 1;
    for (i = 0; i < 16; i++) {
        v = o[i] + c + 65535;
        c = Math.floor(v / 65536);
        o[i] = v - c * 65536;
    }
    o[0] += c - 1 + 37 * (c - 1);
}
function sel25519(p, q, b) {
    var t, c = ~(b - 1);
    for (var i = 0; i < 16; i++) {
        t = c & (p[i] ^ q[i]);
        p[i] ^= t;
        q[i] ^= t;
    }
}
function pack25519(o, n) {
    var i, j, b;
    var m = gf(), t = gf();
    for (i = 0; i < 16; i++)
        t[i] = n[i];
    car25519(t);
    car25519(t);
    car25519(t);
    for (j = 0; j < 2; j++) {
        m[0] = t[0] - 0xffed;
        for (i = 1; i < 15; i++) {
            m[i] = t[i] - 0xffff - ((m[i - 1] >> 16) & 1);
            m[i - 1] &= 0xffff;
        }
        m[15] = t[15] - 0x7fff - ((m[14] >> 16) & 1);
        b = (m[15] >> 16) & 1;
        m[14] &= 0xffff;
        sel25519(t, m, 1 - b);
    }
    for (i = 0; i < 16; i++) {
        o[2 * i] = t[i] & 0xff;
        o[2 * i + 1] = t[i] >> 8;
    }
}
function neq25519(a, b) {
    var c = new Uint8Array(32), d = new Uint8Array(32);
    pack25519(c, a);
    pack25519(d, b);
    return crypto_verify_32(c, 0, d, 0);
}
function par25519(a) {
    var d = new Uint8Array(32);
    pack25519(d, a);
    return d[0] & 1;
}
function unpack25519(o, n) {
    var i;
    for (i = 0; i < 16; i++)
        o[i] = n[2 * i] + (n[2 * i + 1] << 8);
    o[15] &= 0x7fff;
}
function A(o, a, b) {
    for (var i = 0; i < 16; i++)
        o[i] = a[i] + b[i];
}
function Z(o, a, b) {
    for (var i = 0; i < 16; i++)
        o[i] = a[i] - b[i];
}
function M(o, a, b) {
    var v, c, t0 = 0, t1 = 0, t2 = 0, t3 = 0, t4 = 0, t5 = 0, t6 = 0, t7 = 0, t8 = 0, t9 = 0, t10 = 0, t11 = 0, t12 = 0, t13 = 0, t14 = 0, t15 = 0, t16 = 0, t17 = 0, t18 = 0, t19 = 0, t20 = 0, t21 = 0, t22 = 0, t23 = 0, t24 = 0, t25 = 0, t26 = 0, t27 = 0, t28 = 0, t29 = 0, t30 = 0, b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3], b4 = b[4], b5 = b[5], b6 = b[6], b7 = b[7], b8 = b[8], b9 = b[9], b10 = b[10], b11 = b[11], b12 = b[12], b13 = b[13], b14 = b[14], b15 = b[15];
    v = a[0];
    t0 += v * b0;
    t1 += v * b1;
    t2 += v * b2;
    t3 += v * b3;
    t4 += v * b4;
    t5 += v * b5;
    t6 += v * b6;
    t7 += v * b7;
    t8 += v * b8;
    t9 += v * b9;
    t10 += v * b10;
    t11 += v * b11;
    t12 += v * b12;
    t13 += v * b13;
    t14 += v * b14;
    t15 += v * b15;
    v = a[1];
    t1 += v * b0;
    t2 += v * b1;
    t3 += v * b2;
    t4 += v * b3;
    t5 += v * b4;
    t6 += v * b5;
    t7 += v * b6;
    t8 += v * b7;
    t9 += v * b8;
    t10 += v * b9;
    t11 += v * b10;
    t12 += v * b11;
    t13 += v * b12;
    t14 += v * b13;
    t15 += v * b14;
    t16 += v * b15;
    v = a[2];
    t2 += v * b0;
    t3 += v * b1;
    t4 += v * b2;
    t5 += v * b3;
    t6 += v * b4;
    t7 += v * b5;
    t8 += v * b6;
    t9 += v * b7;
    t10 += v * b8;
    t11 += v * b9;
    t12 += v * b10;
    t13 += v * b11;
    t14 += v * b12;
    t15 += v * b13;
    t16 += v * b14;
    t17 += v * b15;
    v = a[3];
    t3 += v * b0;
    t4 += v * b1;
    t5 += v * b2;
    t6 += v * b3;
    t7 += v * b4;
    t8 += v * b5;
    t9 += v * b6;
    t10 += v * b7;
    t11 += v * b8;
    t12 += v * b9;
    t13 += v * b10;
    t14 += v * b11;
    t15 += v * b12;
    t16 += v * b13;
    t17 += v * b14;
    t18 += v * b15;
    v = a[4];
    t4 += v * b0;
    t5 += v * b1;
    t6 += v * b2;
    t7 += v * b3;
    t8 += v * b4;
    t9 += v * b5;
    t10 += v * b6;
    t11 += v * b7;
    t12 += v * b8;
    t13 += v * b9;
    t14 += v * b10;
    t15 += v * b11;
    t16 += v * b12;
    t17 += v * b13;
    t18 += v * b14;
    t19 += v * b15;
    v = a[5];
    t5 += v * b0;
    t6 += v * b1;
    t7 += v * b2;
    t8 += v * b3;
    t9 += v * b4;
    t10 += v * b5;
    t11 += v * b6;
    t12 += v * b7;
    t13 += v * b8;
    t14 += v * b9;
    t15 += v * b10;
    t16 += v * b11;
    t17 += v * b12;
    t18 += v * b13;
    t19 += v * b14;
    t20 += v * b15;
    v = a[6];
    t6 += v * b0;
    t7 += v * b1;
    t8 += v * b2;
    t9 += v * b3;
    t10 += v * b4;
    t11 += v * b5;
    t12 += v * b6;
    t13 += v * b7;
    t14 += v * b8;
    t15 += v * b9;
    t16 += v * b10;
    t17 += v * b11;
    t18 += v * b12;
    t19 += v * b13;
    t20 += v * b14;
    t21 += v * b15;
    v = a[7];
    t7 += v * b0;
    t8 += v * b1;
    t9 += v * b2;
    t10 += v * b3;
    t11 += v * b4;
    t12 += v * b5;
    t13 += v * b6;
    t14 += v * b7;
    t15 += v * b8;
    t16 += v * b9;
    t17 += v * b10;
    t18 += v * b11;
    t19 += v * b12;
    t20 += v * b13;
    t21 += v * b14;
    t22 += v * b15;
    v = a[8];
    t8 += v * b0;
    t9 += v * b1;
    t10 += v * b2;
    t11 += v * b3;
    t12 += v * b4;
    t13 += v * b5;
    t14 += v * b6;
    t15 += v * b7;
    t16 += v * b8;
    t17 += v * b9;
    t18 += v * b10;
    t19 += v * b11;
    t20 += v * b12;
    t21 += v * b13;
    t22 += v * b14;
    t23 += v * b15;
    v = a[9];
    t9 += v * b0;
    t10 += v * b1;
    t11 += v * b2;
    t12 += v * b3;
    t13 += v * b4;
    t14 += v * b5;
    t15 += v * b6;
    t16 += v * b7;
    t17 += v * b8;
    t18 += v * b9;
    t19 += v * b10;
    t20 += v * b11;
    t21 += v * b12;
    t22 += v * b13;
    t23 += v * b14;
    t24 += v * b15;
    v = a[10];
    t10 += v * b0;
    t11 += v * b1;
    t12 += v * b2;
    t13 += v * b3;
    t14 += v * b4;
    t15 += v * b5;
    t16 += v * b6;
    t17 += v * b7;
    t18 += v * b8;
    t19 += v * b9;
    t20 += v * b10;
    t21 += v * b11;
    t22 += v * b12;
    t23 += v * b13;
    t24 += v * b14;
    t25 += v * b15;
    v = a[11];
    t11 += v * b0;
    t12 += v * b1;
    t13 += v * b2;
    t14 += v * b3;
    t15 += v * b4;
    t16 += v * b5;
    t17 += v * b6;
    t18 += v * b7;
    t19 += v * b8;
    t20 += v * b9;
    t21 += v * b10;
    t22 += v * b11;
    t23 += v * b12;
    t24 += v * b13;
    t25 += v * b14;
    t26 += v * b15;
    v = a[12];
    t12 += v * b0;
    t13 += v * b1;
    t14 += v * b2;
    t15 += v * b3;
    t16 += v * b4;
    t17 += v * b5;
    t18 += v * b6;
    t19 += v * b7;
    t20 += v * b8;
    t21 += v * b9;
    t22 += v * b10;
    t23 += v * b11;
    t24 += v * b12;
    t25 += v * b13;
    t26 += v * b14;
    t27 += v * b15;
    v = a[13];
    t13 += v * b0;
    t14 += v * b1;
    t15 += v * b2;
    t16 += v * b3;
    t17 += v * b4;
    t18 += v * b5;
    t19 += v * b6;
    t20 += v * b7;
    t21 += v * b8;
    t22 += v * b9;
    t23 += v * b10;
    t24 += v * b11;
    t25 += v * b12;
    t26 += v * b13;
    t27 += v * b14;
    t28 += v * b15;
    v = a[14];
    t14 += v * b0;
    t15 += v * b1;
    t16 += v * b2;
    t17 += v * b3;
    t18 += v * b4;
    t19 += v * b5;
    t20 += v * b6;
    t21 += v * b7;
    t22 += v * b8;
    t23 += v * b9;
    t24 += v * b10;
    t25 += v * b11;
    t26 += v * b12;
    t27 += v * b13;
    t28 += v * b14;
    t29 += v * b15;
    v = a[15];
    t15 += v * b0;
    t16 += v * b1;
    t17 += v * b2;
    t18 += v * b3;
    t19 += v * b4;
    t20 += v * b5;
    t21 += v * b6;
    t22 += v * b7;
    t23 += v * b8;
    t24 += v * b9;
    t25 += v * b10;
    t26 += v * b11;
    t27 += v * b12;
    t28 += v * b13;
    t29 += v * b14;
    t30 += v * b15;
    t0 += 38 * t16;
    t1 += 38 * t17;
    t2 += 38 * t18;
    t3 += 38 * t19;
    t4 += 38 * t20;
    t5 += 38 * t21;
    t6 += 38 * t22;
    t7 += 38 * t23;
    t8 += 38 * t24;
    t9 += 38 * t25;
    t10 += 38 * t26;
    t11 += 38 * t27;
    t12 += 38 * t28;
    t13 += 38 * t29;
    t14 += 38 * t30;
    // t15 left as is
    // first car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    // second car
    c = 1;
    v = t0 + c + 65535;
    c = Math.floor(v / 65536);
    t0 = v - c * 65536;
    v = t1 + c + 65535;
    c = Math.floor(v / 65536);
    t1 = v - c * 65536;
    v = t2 + c + 65535;
    c = Math.floor(v / 65536);
    t2 = v - c * 65536;
    v = t3 + c + 65535;
    c = Math.floor(v / 65536);
    t3 = v - c * 65536;
    v = t4 + c + 65535;
    c = Math.floor(v / 65536);
    t4 = v - c * 65536;
    v = t5 + c + 65535;
    c = Math.floor(v / 65536);
    t5 = v - c * 65536;
    v = t6 + c + 65535;
    c = Math.floor(v / 65536);
    t6 = v - c * 65536;
    v = t7 + c + 65535;
    c = Math.floor(v / 65536);
    t7 = v - c * 65536;
    v = t8 + c + 65535;
    c = Math.floor(v / 65536);
    t8 = v - c * 65536;
    v = t9 + c + 65535;
    c = Math.floor(v / 65536);
    t9 = v - c * 65536;
    v = t10 + c + 65535;
    c = Math.floor(v / 65536);
    t10 = v - c * 65536;
    v = t11 + c + 65535;
    c = Math.floor(v / 65536);
    t11 = v - c * 65536;
    v = t12 + c + 65535;
    c = Math.floor(v / 65536);
    t12 = v - c * 65536;
    v = t13 + c + 65535;
    c = Math.floor(v / 65536);
    t13 = v - c * 65536;
    v = t14 + c + 65535;
    c = Math.floor(v / 65536);
    t14 = v - c * 65536;
    v = t15 + c + 65535;
    c = Math.floor(v / 65536);
    t15 = v - c * 65536;
    t0 += c - 1 + 37 * (c - 1);
    o[0] = t0;
    o[1] = t1;
    o[2] = t2;
    o[3] = t3;
    o[4] = t4;
    o[5] = t5;
    o[6] = t6;
    o[7] = t7;
    o[8] = t8;
    o[9] = t9;
    o[10] = t10;
    o[11] = t11;
    o[12] = t12;
    o[13] = t13;
    o[14] = t14;
    o[15] = t15;
}
function S(o, a) {
    M(o, a, a);
}
function inv25519(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 253; a >= 0; a--) {
        S(c, c);
        if (a !== 2 && a !== 4)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function pow2523(o, i) {
    var c = gf();
    var a;
    for (a = 0; a < 16; a++)
        c[a] = i[a];
    for (a = 250; a >= 0; a--) {
        S(c, c);
        if (a !== 1)
            M(c, c, i);
    }
    for (a = 0; a < 16; a++)
        o[a] = c[a];
}
function crypto_scalarmult(q, n, p) {
    var z = new Uint8Array(32);
    var x = new Float64Array(80), r, i;
    var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf();
    for (i = 0; i < 31; i++)
        z[i] = n[i];
    z[31] = (n[31] & 127) | 64;
    z[0] &= 248;
    unpack25519(x, p);
    for (i = 0; i < 16; i++) {
        b[i] = x[i];
        d[i] = a[i] = c[i] = 0;
    }
    a[0] = d[0] = 1;
    for (i = 254; i >= 0; --i) {
        r = (z[i >>> 3] >>> (i & 7)) & 1;
        sel25519(a, b, r);
        sel25519(c, d, r);
        A(e, a, c);
        Z(a, a, c);
        A(c, b, d);
        Z(b, b, d);
        S(d, e);
        S(f, a);
        M(a, c, a);
        M(c, b, e);
        A(e, a, c);
        Z(a, a, c);
        S(b, a);
        Z(c, d, f);
        M(a, c, _121665);
        A(a, a, d);
        M(c, c, a);
        M(a, d, f);
        M(d, b, x);
        S(b, e);
        sel25519(a, b, r);
        sel25519(c, d, r);
    }
    for (i = 0; i < 16; i++) {
        x[i + 16] = a[i];
        x[i + 32] = c[i];
        x[i + 48] = b[i];
        x[i + 64] = d[i];
    }
    var x32 = x.subarray(32);
    var x16 = x.subarray(16);
    inv25519(x32, x32);
    M(x16, x16, x32);
    pack25519(q, x16);
    return 0;
}
function crypto_scalarmult_base(q, n) {
    return crypto_scalarmult(q, n, _9);
}
function crypto_box_keypair(y, x) {
    randombytes(x, 32);
    return crypto_scalarmult_base(y, x);
}
function crypto_box_beforenm(k, y, x) {
    var s = new Uint8Array(32);
    crypto_scalarmult(s, x, y);
    return crypto_core_hsalsa20(k, _0, s, sigma);
}
// prettier-ignore
var K = [
    0x428a2f98, 0xd728ae22, 0x71374491, 0x23ef65cd,
    0xb5c0fbcf, 0xec4d3b2f, 0xe9b5dba5, 0x8189dbbc,
    0x3956c25b, 0xf348b538, 0x59f111f1, 0xb605d019,
    0x923f82a4, 0xaf194f9b, 0xab1c5ed5, 0xda6d8118,
    0xd807aa98, 0xa3030242, 0x12835b01, 0x45706fbe,
    0x243185be, 0x4ee4b28c, 0x550c7dc3, 0xd5ffb4e2,
    0x72be5d74, 0xf27b896f, 0x80deb1fe, 0x3b1696b1,
    0x9bdc06a7, 0x25c71235, 0xc19bf174, 0xcf692694,
    0xe49b69c1, 0x9ef14ad2, 0xefbe4786, 0x384f25e3,
    0x0fc19dc6, 0x8b8cd5b5, 0x240ca1cc, 0x77ac9c65,
    0x2de92c6f, 0x592b0275, 0x4a7484aa, 0x6ea6e483,
    0x5cb0a9dc, 0xbd41fbd4, 0x76f988da, 0x831153b5,
    0x983e5152, 0xee66dfab, 0xa831c66d, 0x2db43210,
    0xb00327c8, 0x98fb213f, 0xbf597fc7, 0xbeef0ee4,
    0xc6e00bf3, 0x3da88fc2, 0xd5a79147, 0x930aa725,
    0x06ca6351, 0xe003826f, 0x14292967, 0x0a0e6e70,
    0x27b70a85, 0x46d22ffc, 0x2e1b2138, 0x5c26c926,
    0x4d2c6dfc, 0x5ac42aed, 0x53380d13, 0x9d95b3df,
    0x650a7354, 0x8baf63de, 0x766a0abb, 0x3c77b2a8,
    0x81c2c92e, 0x47edaee6, 0x92722c85, 0x1482353b,
    0xa2bfe8a1, 0x4cf10364, 0xa81a664b, 0xbc423001,
    0xc24b8b70, 0xd0f89791, 0xc76c51a3, 0x0654be30,
    0xd192e819, 0xd6ef5218, 0xd6990624, 0x5565a910,
    0xf40e3585, 0x5771202a, 0x106aa070, 0x32bbd1b8,
    0x19a4c116, 0xb8d2d0c8, 0x1e376c08, 0x5141ab53,
    0x2748774c, 0xdf8eeb99, 0x34b0bcb5, 0xe19b48a8,
    0x391c0cb3, 0xc5c95a63, 0x4ed8aa4a, 0xe3418acb,
    0x5b9cca4f, 0x7763e373, 0x682e6ff3, 0xd6b2b8a3,
    0x748f82ee, 0x5defb2fc, 0x78a5636f, 0x43172f60,
    0x84c87814, 0xa1f0ab72, 0x8cc70208, 0x1a6439ec,
    0x90befffa, 0x23631e28, 0xa4506ceb, 0xde82bde9,
    0xbef9a3f7, 0xb2c67915, 0xc67178f2, 0xe372532b,
    0xca273ece, 0xea26619c, 0xd186b8c7, 0x21c0c207,
    0xeada7dd6, 0xcde0eb1e, 0xf57d4f7f, 0xee6ed178,
    0x06f067aa, 0x72176fba, 0x0a637dc5, 0xa2c898a6,
    0x113f9804, 0xbef90dae, 0x1b710b35, 0x131c471b,
    0x28db77f5, 0x23047d84, 0x32caab7b, 0x40c72493,
    0x3c9ebe0a, 0x15c9bebc, 0x431d67c4, 0x9c100d4c,
    0x4cc5d4be, 0xcb3e42b6, 0x597f299c, 0xfc657e2a,
    0x5fcb6fab, 0x3ad6faec, 0x6c44198c, 0x4a475817
];
function crypto_hashblocks_hl(hh, hl, m, n) {
    var wh = new Int32Array(16), wl = new Int32Array(16), bh0, bh1, bh2, bh3, bh4, bh5, bh6, bh7, bl0, bl1, bl2, bl3, bl4, bl5, bl6, bl7, th, tl, i, j, h, l, a, b, c, d;
    var ah0 = hh[0], ah1 = hh[1], ah2 = hh[2], ah3 = hh[3], ah4 = hh[4], ah5 = hh[5], ah6 = hh[6], ah7 = hh[7], al0 = hl[0], al1 = hl[1], al2 = hl[2], al3 = hl[3], al4 = hl[4], al5 = hl[5], al6 = hl[6], al7 = hl[7];
    var pos = 0;
    while (n >= 128) {
        for (i = 0; i < 16; i++) {
            j = 8 * i + pos;
            wh[i] = (m[j + 0] << 24) | (m[j + 1] << 16) | (m[j + 2] << 8) | m[j + 3];
            wl[i] = (m[j + 4] << 24) | (m[j + 5] << 16) | (m[j + 6] << 8) | m[j + 7];
        }
        for (i = 0; i < 80; i++) {
            bh0 = ah0;
            bh1 = ah1;
            bh2 = ah2;
            bh3 = ah3;
            bh4 = ah4;
            bh5 = ah5;
            bh6 = ah6;
            bh7 = ah7;
            bl0 = al0;
            bl1 = al1;
            bl2 = al2;
            bl3 = al3;
            bl4 = al4;
            bl5 = al5;
            bl6 = al6;
            bl7 = al7;
            // add
            h = ah7;
            l = al7;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma1
            h =
                ((ah4 >>> 14) | (al4 << (32 - 14))) ^
                    ((ah4 >>> 18) | (al4 << (32 - 18))) ^
                    ((al4 >>> (41 - 32)) | (ah4 << (32 - (41 - 32))));
            l =
                ((al4 >>> 14) | (ah4 << (32 - 14))) ^
                    ((al4 >>> 18) | (ah4 << (32 - 18))) ^
                    ((ah4 >>> (41 - 32)) | (al4 << (32 - (41 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Ch
            h = (ah4 & ah5) ^ (~ah4 & ah6);
            l = (al4 & al5) ^ (~al4 & al6);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // K
            h = K[i * 2];
            l = K[i * 2 + 1];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // w
            h = wh[i % 16];
            l = wl[i % 16];
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            th = (c & 0xffff) | (d << 16);
            tl = (a & 0xffff) | (b << 16);
            // add
            h = th;
            l = tl;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            // Sigma0
            h =
                ((ah0 >>> 28) | (al0 << (32 - 28))) ^
                    ((al0 >>> (34 - 32)) | (ah0 << (32 - (34 - 32)))) ^
                    ((al0 >>> (39 - 32)) | (ah0 << (32 - (39 - 32))));
            l =
                ((al0 >>> 28) | (ah0 << (32 - 28))) ^
                    ((ah0 >>> (34 - 32)) | (al0 << (32 - (34 - 32)))) ^
                    ((ah0 >>> (39 - 32)) | (al0 << (32 - (39 - 32))));
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            // Maj
            h = (ah0 & ah1) ^ (ah0 & ah2) ^ (ah1 & ah2);
            l = (al0 & al1) ^ (al0 & al2) ^ (al1 & al2);
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh7 = (c & 0xffff) | (d << 16);
            bl7 = (a & 0xffff) | (b << 16);
            // add
            h = bh3;
            l = bl3;
            a = l & 0xffff;
            b = l >>> 16;
            c = h & 0xffff;
            d = h >>> 16;
            h = th;
            l = tl;
            a += l & 0xffff;
            b += l >>> 16;
            c += h & 0xffff;
            d += h >>> 16;
            b += a >>> 16;
            c += b >>> 16;
            d += c >>> 16;
            bh3 = (c & 0xffff) | (d << 16);
            bl3 = (a & 0xffff) | (b << 16);
            ah1 = bh0;
            ah2 = bh1;
            ah3 = bh2;
            ah4 = bh3;
            ah5 = bh4;
            ah6 = bh5;
            ah7 = bh6;
            ah0 = bh7;
            al1 = bl0;
            al2 = bl1;
            al3 = bl2;
            al4 = bl3;
            al5 = bl4;
            al6 = bl5;
            al7 = bl6;
            al0 = bl7;
            if (i % 16 === 15) {
                for (j = 0; j < 16; j++) {
                    // add
                    h = wh[j];
                    l = wl[j];
                    a = l & 0xffff;
                    b = l >>> 16;
                    c = h & 0xffff;
                    d = h >>> 16;
                    h = wh[(j + 9) % 16];
                    l = wl[(j + 9) % 16];
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma0
                    th = wh[(j + 1) % 16];
                    tl = wl[(j + 1) % 16];
                    h =
                        ((th >>> 1) | (tl << (32 - 1))) ^
                            ((th >>> 8) | (tl << (32 - 8))) ^
                            (th >>> 7);
                    l =
                        ((tl >>> 1) | (th << (32 - 1))) ^
                            ((tl >>> 8) | (th << (32 - 8))) ^
                            ((tl >>> 7) | (th << (32 - 7)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    // sigma1
                    th = wh[(j + 14) % 16];
                    tl = wl[(j + 14) % 16];
                    h =
                        ((th >>> 19) | (tl << (32 - 19))) ^
                            ((tl >>> (61 - 32)) | (th << (32 - (61 - 32)))) ^
                            (th >>> 6);
                    l =
                        ((tl >>> 19) | (th << (32 - 19))) ^
                            ((th >>> (61 - 32)) | (tl << (32 - (61 - 32)))) ^
                            ((tl >>> 6) | (th << (32 - 6)));
                    a += l & 0xffff;
                    b += l >>> 16;
                    c += h & 0xffff;
                    d += h >>> 16;
                    b += a >>> 16;
                    c += b >>> 16;
                    d += c >>> 16;
                    wh[j] = (c & 0xffff) | (d << 16);
                    wl[j] = (a & 0xffff) | (b << 16);
                }
            }
        }
        // add
        h = ah0;
        l = al0;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[0];
        l = hl[0];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[0] = ah0 = (c & 0xffff) | (d << 16);
        hl[0] = al0 = (a & 0xffff) | (b << 16);
        h = ah1;
        l = al1;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[1];
        l = hl[1];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[1] = ah1 = (c & 0xffff) | (d << 16);
        hl[1] = al1 = (a & 0xffff) | (b << 16);
        h = ah2;
        l = al2;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[2];
        l = hl[2];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[2] = ah2 = (c & 0xffff) | (d << 16);
        hl[2] = al2 = (a & 0xffff) | (b << 16);
        h = ah3;
        l = al3;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[3];
        l = hl[3];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[3] = ah3 = (c & 0xffff) | (d << 16);
        hl[3] = al3 = (a & 0xffff) | (b << 16);
        h = ah4;
        l = al4;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[4];
        l = hl[4];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[4] = ah4 = (c & 0xffff) | (d << 16);
        hl[4] = al4 = (a & 0xffff) | (b << 16);
        h = ah5;
        l = al5;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[5];
        l = hl[5];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[5] = ah5 = (c & 0xffff) | (d << 16);
        hl[5] = al5 = (a & 0xffff) | (b << 16);
        h = ah6;
        l = al6;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[6];
        l = hl[6];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[6] = ah6 = (c & 0xffff) | (d << 16);
        hl[6] = al6 = (a & 0xffff) | (b << 16);
        h = ah7;
        l = al7;
        a = l & 0xffff;
        b = l >>> 16;
        c = h & 0xffff;
        d = h >>> 16;
        h = hh[7];
        l = hl[7];
        a += l & 0xffff;
        b += l >>> 16;
        c += h & 0xffff;
        d += h >>> 16;
        b += a >>> 16;
        c += b >>> 16;
        d += c >>> 16;
        hh[7] = ah7 = (c & 0xffff) | (d << 16);
        hl[7] = al7 = (a & 0xffff) | (b << 16);
        pos += 128;
        n -= 128;
    }
    return n;
}
function crypto_hash(out, m, n) {
    const hh = new Int32Array(8);
    const hl = new Int32Array(8);
    const x = new Uint8Array(256);
    let b = n;
    hh[0] = 0x6a09e667;
    hh[1] = 0xbb67ae85;
    hh[2] = 0x3c6ef372;
    hh[3] = 0xa54ff53a;
    hh[4] = 0x510e527f;
    hh[5] = 0x9b05688c;
    hh[6] = 0x1f83d9ab;
    hh[7] = 0x5be0cd19;
    hl[0] = 0xf3bcc908;
    hl[1] = 0x84caa73b;
    hl[2] = 0xfe94f82b;
    hl[3] = 0x5f1d36f1;
    hl[4] = 0xade682d1;
    hl[5] = 0x2b3e6c1f;
    hl[6] = 0xfb41bd6b;
    hl[7] = 0x137e2179;
    crypto_hashblocks_hl(hh, hl, m, n);
    n %= 128;
    for (let i = 0; i < n; i++)
        x[i] = m[b - n + i];
    x[n] = 128;
    n = 256 - 128 * (n < 112 ? 1 : 0);
    x[n - 9] = 0;
    ts64(x, n - 8, (b / 0x20000000) | 0, b << 3);
    crypto_hashblocks_hl(hh, hl, x, n);
    for (let i = 0; i < 8; i++)
        ts64(out, 8 * i, hh[i], hl[i]);
    return 0;
}
/**
 * Incremental version of crypto_hash.
 */
class HashState {
    constructor() {
        this.hh = new Int32Array(8);
        this.hl = new Int32Array(8);
        this.next = new Uint8Array(128);
        this.p = 0;
        this.total = 0;
        this.hh[0] = 0x6a09e667;
        this.hh[1] = 0xbb67ae85;
        this.hh[2] = 0x3c6ef372;
        this.hh[3] = 0xa54ff53a;
        this.hh[4] = 0x510e527f;
        this.hh[5] = 0x9b05688c;
        this.hh[6] = 0x1f83d9ab;
        this.hh[7] = 0x5be0cd19;
        this.hl[0] = 0xf3bcc908;
        this.hl[1] = 0x84caa73b;
        this.hl[2] = 0xfe94f82b;
        this.hl[3] = 0x5f1d36f1;
        this.hl[4] = 0xade682d1;
        this.hl[5] = 0x2b3e6c1f;
        this.hl[6] = 0xfb41bd6b;
        this.hl[7] = 0x137e2179;
    }
    update(data) {
        this.total += data.length;
        let i = 0;
        while (i < data.length) {
            const r = 128 - this.p;
            if (r > (data.length - i)) {
                for (let j = 0; i + j < data.length; j++) {
                    this.next[this.p + j] = data[i + j];
                }
                this.p += data.length - i;
                break;
            }
            else {
                for (let j = 0; this.p + j < 128; j++) {
                    this.next[this.p + j] = data[i + j];
                }
                crypto_hashblocks_hl(this.hh, this.hl, this.next, 128);
                i += 128 - this.p;
                this.p = 0;
            }
        }
        return this;
    }
    finish() {
        const out = new Uint8Array(64);
        let n = this.p;
        const x = new Uint8Array(256);
        let b = this.total;
        for (let i = 0; i < n; i++)
            x[i] = this.next[i];
        x[n] = 128;
        n = 256 - 128 * (n < 112 ? 1 : 0);
        x[n - 9] = 0;
        ts64(x, n - 8, (b / 0x20000000) | 0, b << 3);
        crypto_hashblocks_hl(this.hh, this.hl, x, n);
        for (let i = 0; i < 8; i++)
            ts64(out, 8 * i, this.hh[i], this.hl[i]);
        return out;
    }
}
exports.HashState = HashState;
function add(p, q) {
    var a = gf(), b = gf(), c = gf(), d = gf(), e = gf(), f = gf(), g = gf(), h = gf(), t = gf();
    Z(a, p[1], p[0]);
    Z(t, q[1], q[0]);
    M(a, a, t);
    A(b, p[0], p[1]);
    A(t, q[0], q[1]);
    M(b, b, t);
    M(c, p[3], q[3]);
    M(c, c, D2);
    M(d, p[2], q[2]);
    A(d, d, d);
    Z(e, b, a);
    Z(f, d, c);
    A(g, d, c);
    A(h, b, a);
    M(p[0], e, f);
    M(p[1], h, g);
    M(p[2], g, f);
    M(p[3], e, h);
}
function cswap(p, q, b) {
    var i;
    for (i = 0; i < 4; i++) {
        sel25519(p[i], q[i], b);
    }
}
function pack(r, p) {
    var tx = gf(), ty = gf(), zi = gf();
    inv25519(zi, p[2]);
    M(tx, p[0], zi);
    M(ty, p[1], zi);
    pack25519(r, ty);
    r[31] ^= par25519(tx) << 7;
}
function scalarmult(p, q, s) {
    var b, i;
    set25519(p[0], gf0);
    set25519(p[1], gf1);
    set25519(p[2], gf1);
    set25519(p[3], gf0);
    for (i = 255; i >= 0; --i) {
        b = (s[(i / 8) | 0] >> (i & 7)) & 1;
        cswap(p, q, b);
        add(q, p);
        add(p, p);
        cswap(p, q, b);
    }
}
function scalarbase(p, s) {
    const q = [gf(), gf(), gf(), gf()];
    set25519(q[0], X);
    set25519(q[1], Y);
    set25519(q[2], gf1);
    M(q[3], X, Y);
    scalarmult(p, q, s);
}
function crypto_sign_keypair(pk, sk, seeded) {
    const d = new Uint8Array(64);
    const p = [gf(), gf(), gf(), gf()];
    if (!seeded)
        randombytes(sk, 32);
    crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    for (let i = 0; i < 32; i++)
        sk[i + 32] = pk[i];
    return 0;
}
var L = new Float64Array([
    0xed,
    0xd3,
    0xf5,
    0x5c,
    0x1a,
    0x63,
    0x12,
    0x58,
    0xd6,
    0x9c,
    0xf7,
    0xa2,
    0xde,
    0xf9,
    0xde,
    0x14,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0x10,
]);
function modL(r, x) {
    var carry, i, j, k;
    for (i = 63; i >= 32; --i) {
        carry = 0;
        for (j = i - 32, k = i - 12; j < k; ++j) {
            x[j] += carry - 16 * x[i] * L[j - (i - 32)];
            carry = (x[j] + 128) >> 8;
            x[j] -= carry * 256;
        }
        x[j] += carry;
        x[i] = 0;
    }
    carry = 0;
    for (j = 0; j < 32; j++) {
        x[j] += carry - (x[31] >> 4) * L[j];
        carry = x[j] >> 8;
        x[j] &= 255;
    }
    for (j = 0; j < 32; j++)
        x[j] -= carry * L[j];
    for (i = 0; i < 32; i++) {
        x[i + 1] += x[i] >> 8;
        r[i] = x[i] & 255;
    }
}
function reduce(r) {
    const x = new Float64Array(64);
    for (let i = 0; i < 64; i++)
        x[i] = r[i];
    for (let i = 0; i < 64; i++)
        r[i] = 0;
    modL(r, x);
}
// Note: difference from C - smlen returned, not passed as argument.
function crypto_sign(sm, m, n, sk) {
    var d = new Uint8Array(64), h = new Uint8Array(64), r = new Uint8Array(64);
    var i, j, x = new Float64Array(64);
    var p = [gf(), gf(), gf(), gf()];
    crypto_hash(d, sk, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    var smlen = n + 64;
    for (i = 0; i < n; i++)
        sm[64 + i] = m[i];
    for (i = 0; i < 32; i++)
        sm[32 + i] = d[32 + i];
    crypto_hash(r, sm.subarray(32), n + 32);
    reduce(r);
    scalarbase(p, r);
    pack(sm, p);
    for (i = 32; i < 64; i++)
        sm[i] = sk[i];
    crypto_hash(h, sm, n + 64);
    reduce(h);
    for (i = 0; i < 64; i++)
        x[i] = 0;
    for (i = 0; i < 32; i++)
        x[i] = r[i];
    for (i = 0; i < 32; i++) {
        for (j = 0; j < 32; j++) {
            x[i + j] += h[i] * d[j];
        }
    }
    modL(sm.subarray(32), x);
    return smlen;
}
function unpackneg(r, p) {
    const t = gf();
    const chk = gf();
    const num = gf();
    const den = gf();
    const den2 = gf();
    const den4 = gf();
    const den6 = gf();
    set25519(r[2], gf1);
    unpack25519(r[1], p);
    S(num, r[1]);
    M(den, num, D);
    Z(num, num, r[2]);
    A(den, r[2], den);
    S(den2, den);
    S(den4, den2);
    M(den6, den4, den2);
    M(t, den6, num);
    M(t, t, den);
    pow2523(t, t);
    M(t, t, num);
    M(t, t, den);
    M(t, t, den);
    M(r[0], t, den);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        M(r[0], r[0], I);
    S(chk, r[0]);
    M(chk, chk, den);
    if (neq25519(chk, num))
        return -1;
    if (par25519(r[0]) === p[31] >> 7)
        Z(r[0], gf0, r[0]);
    M(r[3], r[0], r[1]);
    return 0;
}
function crypto_sign_open(m, sm, n, pk) {
    var i, mlen;
    var t = new Uint8Array(32), h = new Uint8Array(64);
    var p = [gf(), gf(), gf(), gf()], q = [gf(), gf(), gf(), gf()];
    mlen = -1;
    if (n < 64)
        return -1;
    if (unpackneg(q, pk))
        return -1;
    for (i = 0; i < n; i++)
        m[i] = sm[i];
    for (i = 0; i < 32; i++)
        m[i + 32] = pk[i];
    crypto_hash(h, m, n);
    reduce(h);
    scalarmult(p, q, h);
    scalarbase(q, sm.subarray(32));
    add(p, q);
    pack(t, p);
    n -= 64;
    if (crypto_verify_32(sm, 0, t, 0)) {
        for (i = 0; i < n; i++)
            m[i] = 0;
        return -1;
    }
    for (i = 0; i < n; i++)
        m[i] = sm[i + 64];
    mlen = n;
    return mlen;
}
var crypto_secretbox_KEYBYTES = 32, crypto_secretbox_NONCEBYTES = 24, crypto_secretbox_ZEROBYTES = 32, crypto_secretbox_BOXZEROBYTES = 16, crypto_scalarmult_BYTES = 32, crypto_scalarmult_SCALARBYTES = 32, crypto_box_PUBLICKEYBYTES = 32, crypto_box_SECRETKEYBYTES = 32, crypto_box_BEFORENMBYTES = 32, crypto_box_NONCEBYTES = crypto_secretbox_NONCEBYTES, crypto_sign_BYTES = 64, crypto_sign_PUBLICKEYBYTES = 32, crypto_sign_SECRETKEYBYTES = 64, crypto_sign_SEEDBYTES = 32, crypto_hash_BYTES = 64;
/* High-level API */
function checkLengths(k, n) {
    if (k.length !== crypto_secretbox_KEYBYTES)
        throw new Error("bad key size");
    if (n.length !== crypto_secretbox_NONCEBYTES)
        throw new Error("bad nonce size");
}
function checkBoxLengths(pk, sk) {
    if (pk.length !== crypto_box_PUBLICKEYBYTES)
        throw new Error("bad public key size");
    if (sk.length !== crypto_box_SECRETKEYBYTES)
        throw new Error("bad secret key size");
}
function checkArrayTypes(...args) {
    for (var i = 0; i < args.length; i++) {
        if (!(args[i] instanceof Uint8Array))
            throw new TypeError("unexpected type, use Uint8Array");
    }
}
function cleanup(arr) {
    for (var i = 0; i < arr.length; i++)
        arr[i] = 0;
}
function randomBytes(n) {
    var b = new Uint8Array(n);
    randombytes(b, n);
    return b;
}
exports.randomBytes = randomBytes;
function secretbox(msg, nonce, key) {
    checkArrayTypes(msg, nonce, key);
    checkLengths(key, nonce);
    var m = new Uint8Array(crypto_secretbox_ZEROBYTES + msg.length);
    var c = new Uint8Array(m.length);
    for (var i = 0; i < msg.length; i++)
        m[i + crypto_secretbox_ZEROBYTES] = msg[i];
    crypto_secretbox(c, m, m.length, nonce, key);
    return c.subarray(crypto_secretbox_BOXZEROBYTES);
}
exports.secretbox = secretbox;
function secretbox_open(box, nonce, key) {
    checkArrayTypes(box, nonce, key);
    checkLengths(key, nonce);
    var c = new Uint8Array(crypto_secretbox_BOXZEROBYTES + box.length);
    var m = new Uint8Array(c.length);
    for (var i = 0; i < box.length; i++)
        c[i + crypto_secretbox_BOXZEROBYTES] = box[i];
    if (c.length < 32)
        return null;
    if (crypto_secretbox_open(m, c, c.length, nonce, key) !== 0)
        return null;
    return m.subarray(crypto_secretbox_ZEROBYTES);
}
exports.secretbox_open = secretbox_open;
exports.secretbox_keyLength = crypto_secretbox_KEYBYTES;
exports.secretbox_nonceLength = crypto_secretbox_NONCEBYTES;
exports.secretbox_overheadLength = crypto_secretbox_BOXZEROBYTES;
function scalarMult(n, p) {
    checkArrayTypes(n, p);
    if (n.length !== crypto_scalarmult_SCALARBYTES)
        throw new Error("bad n size");
    if (p.length !== crypto_scalarmult_BYTES)
        throw new Error("bad p size");
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult(q, n, p);
    return q;
}
exports.scalarMult = scalarMult;
function scalarMult_base(n) {
    checkArrayTypes(n);
    if (n.length !== crypto_scalarmult_SCALARBYTES)
        throw new Error("bad n size");
    var q = new Uint8Array(crypto_scalarmult_BYTES);
    crypto_scalarmult_base(q, n);
    return q;
}
exports.scalarMult_base = scalarMult_base;
exports.scalarMult_scalarLength = crypto_scalarmult_SCALARBYTES;
exports.scalarMult_groupElementLength = crypto_scalarmult_BYTES;
function box(msg, nonce, publicKey, secretKey) {
    var k = box_before(publicKey, secretKey);
    return secretbox(msg, nonce, k);
}
exports.box = box;
function box_before(publicKey, secretKey) {
    checkArrayTypes(publicKey, secretKey);
    checkBoxLengths(publicKey, secretKey);
    var k = new Uint8Array(crypto_box_BEFORENMBYTES);
    crypto_box_beforenm(k, publicKey, secretKey);
    return k;
}
exports.box_before = box_before;
exports.box_after = secretbox;
function box_open(msg, nonce, publicKey, secretKey) {
    var k = box_before(publicKey, secretKey);
    return secretbox_open(msg, nonce, k);
}
exports.box_open = box_open;
exports.box_open_after = secretbox_open;
function box_keyPair() {
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_box_SECRETKEYBYTES);
    crypto_box_keypair(pk, sk);
    return { publicKey: pk, secretKey: sk };
}
exports.box_keyPair = box_keyPair;
function box_keyPair_fromSecretKey(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_box_SECRETKEYBYTES)
        throw new Error("bad secret key size");
    var pk = new Uint8Array(crypto_box_PUBLICKEYBYTES);
    crypto_scalarmult_base(pk, secretKey);
    return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
}
exports.box_keyPair_fromSecretKey = box_keyPair_fromSecretKey;
exports.box_publicKeyLength = crypto_box_PUBLICKEYBYTES;
exports.box_secretKeyLength = crypto_box_SECRETKEYBYTES;
exports.box_sharedKeyLength = crypto_box_BEFORENMBYTES;
exports.box_nonceLength = crypto_box_NONCEBYTES;
exports.box_overheadLength = exports.secretbox_overheadLength;
function sign(msg, secretKey) {
    checkArrayTypes(msg, secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error("bad secret key size");
    var signedMsg = new Uint8Array(crypto_sign_BYTES + msg.length);
    crypto_sign(signedMsg, msg, msg.length, secretKey);
    return signedMsg;
}
exports.sign = sign;
function sign_open(signedMsg, publicKey) {
    checkArrayTypes(signedMsg, publicKey);
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
        throw new Error("bad public key size");
    var tmp = new Uint8Array(signedMsg.length);
    var mlen = crypto_sign_open(tmp, signedMsg, signedMsg.length, publicKey);
    if (mlen < 0)
        return null;
    var m = new Uint8Array(mlen);
    for (var i = 0; i < m.length; i++)
        m[i] = tmp[i];
    return m;
}
exports.sign_open = sign_open;
function sign_detached(msg, secretKey) {
    var signedMsg = sign(msg, secretKey);
    var sig = new Uint8Array(crypto_sign_BYTES);
    for (var i = 0; i < sig.length; i++)
        sig[i] = signedMsg[i];
    return sig;
}
exports.sign_detached = sign_detached;
function sign_detached_verify(msg, sig, publicKey) {
    checkArrayTypes(msg, sig, publicKey);
    if (sig.length !== crypto_sign_BYTES)
        throw new Error("bad signature size");
    if (publicKey.length !== crypto_sign_PUBLICKEYBYTES)
        throw new Error("bad public key size");
    var sm = new Uint8Array(crypto_sign_BYTES + msg.length);
    var m = new Uint8Array(crypto_sign_BYTES + msg.length);
    var i;
    for (i = 0; i < crypto_sign_BYTES; i++)
        sm[i] = sig[i];
    for (i = 0; i < msg.length; i++)
        sm[i + crypto_sign_BYTES] = msg[i];
    return crypto_sign_open(m, sm, sm.length, publicKey) >= 0;
}
exports.sign_detached_verify = sign_detached_verify;
function sign_keyPair() {
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    crypto_sign_keypair(pk, sk, false);
    return { publicKey: pk, secretKey: sk };
}
exports.sign_keyPair = sign_keyPair;
function x25519_edwards_keyPair_fromSecretKey(secretKey) {
    const p = [gf(), gf(), gf(), gf()];
    const pk = new Uint8Array(32);
    const d = new Uint8Array(64);
    if (secretKey.length != 32) {
        throw new Error("bad secret key size");
    }
    d.set(secretKey, 0);
    //crypto_hash(d, secretKey, 32);
    d[0] &= 248;
    d[31] &= 127;
    d[31] |= 64;
    scalarbase(p, d);
    pack(pk, p);
    return pk;
}
exports.x25519_edwards_keyPair_fromSecretKey = x25519_edwards_keyPair_fromSecretKey;
function sign_keyPair_fromSecretKey(secretKey) {
    checkArrayTypes(secretKey);
    if (secretKey.length !== crypto_sign_SECRETKEYBYTES)
        throw new Error("bad secret key size");
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    for (var i = 0; i < pk.length; i++)
        pk[i] = secretKey[32 + i];
    return { publicKey: pk, secretKey: new Uint8Array(secretKey) };
}
exports.sign_keyPair_fromSecretKey = sign_keyPair_fromSecretKey;
function sign_keyPair_fromSeed(seed) {
    checkArrayTypes(seed);
    if (seed.length !== crypto_sign_SEEDBYTES)
        throw new Error("bad seed size");
    var pk = new Uint8Array(crypto_sign_PUBLICKEYBYTES);
    var sk = new Uint8Array(crypto_sign_SECRETKEYBYTES);
    for (var i = 0; i < 32; i++)
        sk[i] = seed[i];
    crypto_sign_keypair(pk, sk, true);
    return { publicKey: pk, secretKey: sk };
}
exports.sign_keyPair_fromSeed = sign_keyPair_fromSeed;
exports.sign_publicKeyLength = crypto_sign_PUBLICKEYBYTES;
exports.sign_secretKeyLength = crypto_sign_SECRETKEYBYTES;
exports.sign_seedLength = crypto_sign_SEEDBYTES;
exports.sign_signatureLength = crypto_sign_BYTES;
function hash(msg) {
    checkArrayTypes(msg);
    var h = new Uint8Array(crypto_hash_BYTES);
    crypto_hash(h, msg, msg.length);
    return h;
}
exports.hash = hash;
exports.hash_hashLength = crypto_hash_BYTES;
function verify(x, y) {
    checkArrayTypes(x, y);
    // Zero length arguments are considered not equal.
    if (x.length === 0 || y.length === 0)
        return false;
    if (x.length !== y.length)
        return false;
    return vn(x, 0, y, 0, x.length) === 0 ? true : false;
}
exports.verify = verify;
function setPRNG(fn) {
    randombytes = fn;
}
exports.setPRNG = setPRNG;
function sign_ed25519_pk_to_curve25519(ed25519_pk) {
    const ge_a = [gf(), gf(), gf(), gf()];
    const x = gf();
    const one_minus_y = gf();
    const x25519_pk = new Uint8Array(32);
    if (unpackneg(ge_a, ed25519_pk)) {
        throw Error("invalid public key");
    }
    set25519(one_minus_y, gf1);
    Z(one_minus_y, one_minus_y, ge_a[1]);
    set25519(x, gf1);
    A(x, x, ge_a[1]);
    inv25519(one_minus_y, one_minus_y);
    M(x, x, one_minus_y);
    pack25519(x25519_pk, x);
    return x25519_pk;
}
exports.sign_ed25519_pk_to_curve25519 = sign_ed25519_pk_to_curve25519;
(function () {
    // Initialize PRNG if environment provides CSPRNG.
    // If not, methods calling randombytes will throw.
    const crypto$1 = typeof self !== "undefined" ? self.crypto || self.msCrypto : null;
    if (crypto$1 && crypto$1.getRandomValues) {
        // Browsers.
        var QUOTA = 65536;
        setPRNG(function (x, n) {
            var i, v = new Uint8Array(n);
            for (i = 0; i < n; i += QUOTA) {
                crypto$1.getRandomValues(v.subarray(i, i + Math.min(n - i, QUOTA)));
            }
            for (i = 0; i < n; i++)
                x[i] = v[i];
            cleanup(v);
        });
    }
    else if (typeof require !== "undefined") {
        // Node.js.
        const cr = crypto;
        if (cr && cr.randomBytes) {
            setPRNG(function (x, n) {
                var i, v = cr.randomBytes(n);
                for (i = 0; i < n; i++)
                    x[i] = v[i];
                cleanup(v);
            });
        }
    }
})();

});

unwrapExports(naclFast);
var naclFast_1 = naclFast.HashState;
var naclFast_2 = naclFast.randomBytes;
var naclFast_3 = naclFast.secretbox;
var naclFast_4 = naclFast.secretbox_open;
var naclFast_5 = naclFast.secretbox_keyLength;
var naclFast_6 = naclFast.secretbox_nonceLength;
var naclFast_7 = naclFast.secretbox_overheadLength;
var naclFast_8 = naclFast.scalarMult;
var naclFast_9 = naclFast.scalarMult_base;
var naclFast_10 = naclFast.scalarMult_scalarLength;
var naclFast_11 = naclFast.scalarMult_groupElementLength;
var naclFast_12 = naclFast.box;
var naclFast_13 = naclFast.box_before;
var naclFast_14 = naclFast.box_after;
var naclFast_15 = naclFast.box_open;
var naclFast_16 = naclFast.box_open_after;
var naclFast_17 = naclFast.box_keyPair;
var naclFast_18 = naclFast.box_keyPair_fromSecretKey;
var naclFast_19 = naclFast.box_publicKeyLength;
var naclFast_20 = naclFast.box_secretKeyLength;
var naclFast_21 = naclFast.box_sharedKeyLength;
var naclFast_22 = naclFast.box_nonceLength;
var naclFast_23 = naclFast.box_overheadLength;
var naclFast_24 = naclFast.sign;
var naclFast_25 = naclFast.sign_open;
var naclFast_26 = naclFast.sign_detached;
var naclFast_27 = naclFast.sign_detached_verify;
var naclFast_28 = naclFast.sign_keyPair;
var naclFast_29 = naclFast.x25519_edwards_keyPair_fromSecretKey;
var naclFast_30 = naclFast.sign_keyPair_fromSecretKey;
var naclFast_31 = naclFast.sign_keyPair_fromSeed;
var naclFast_32 = naclFast.sign_publicKeyLength;
var naclFast_33 = naclFast.sign_secretKeyLength;
var naclFast_34 = naclFast.sign_seedLength;
var naclFast_35 = naclFast.sign_signatureLength;
var naclFast_36 = naclFast.hash;
var naclFast_37 = naclFast.hash_hashLength;
var naclFast_38 = naclFast.verify;
var naclFast_39 = naclFast.setPRNG;
var naclFast_40 = naclFast.sign_ed25519_pk_to_curve25519;

var BigInteger = createCommonjsModule(function (module) {
var bigInt = (function (undefined$1) {

    var BASE = 1e7,
        LOG_BASE = 7,
        MAX_INT = 9007199254740992,
        MAX_INT_ARR = smallToArray(MAX_INT),
        DEFAULT_ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyz";

    var supportsNativeBigInt = typeof BigInt === "function";

    function Integer(v, radix, alphabet, caseSensitive) {
        if (typeof v === "undefined") return Integer[0];
        if (typeof radix !== "undefined") return +radix === 10 && !alphabet ? parseValue(v) : parseBase(v, radix, alphabet, caseSensitive);
        return parseValue(v);
    }

    function BigInteger(value, sign) {
        this.value = value;
        this.sign = sign;
        this.isSmall = false;
    }
    BigInteger.prototype = Object.create(Integer.prototype);

    function SmallInteger(value) {
        this.value = value;
        this.sign = value < 0;
        this.isSmall = true;
    }
    SmallInteger.prototype = Object.create(Integer.prototype);

    function NativeBigInt(value) {
        this.value = value;
    }
    NativeBigInt.prototype = Object.create(Integer.prototype);

    function isPrecise(n) {
        return -MAX_INT < n && n < MAX_INT;
    }

    function smallToArray(n) { // For performance reasons doesn't reference BASE, need to change this function if BASE changes
        if (n < 1e7)
            return [n];
        if (n < 1e14)
            return [n % 1e7, Math.floor(n / 1e7)];
        return [n % 1e7, Math.floor(n / 1e7) % 1e7, Math.floor(n / 1e14)];
    }

    function arrayToSmall(arr) { // If BASE changes this function may need to change
        trim(arr);
        var length = arr.length;
        if (length < 4 && compareAbs(arr, MAX_INT_ARR) < 0) {
            switch (length) {
                case 0: return 0;
                case 1: return arr[0];
                case 2: return arr[0] + arr[1] * BASE;
                default: return arr[0] + (arr[1] + arr[2] * BASE) * BASE;
            }
        }
        return arr;
    }

    function trim(v) {
        var i = v.length;
        while (v[--i] === 0);
        v.length = i + 1;
    }

    function createArray(length) { // function shamelessly stolen from Yaffle's library https://github.com/Yaffle/BigInteger
        var x = new Array(length);
        var i = -1;
        while (++i < length) {
            x[i] = 0;
        }
        return x;
    }

    function truncate(n) {
        if (n > 0) return Math.floor(n);
        return Math.ceil(n);
    }

    function add(a, b) { // assumes a and b are arrays with a.length >= b.length
        var l_a = a.length,
            l_b = b.length,
            r = new Array(l_a),
            carry = 0,
            base = BASE,
            sum, i;
        for (i = 0; i < l_b; i++) {
            sum = a[i] + b[i] + carry;
            carry = sum >= base ? 1 : 0;
            r[i] = sum - carry * base;
        }
        while (i < l_a) {
            sum = a[i] + carry;
            carry = sum === base ? 1 : 0;
            r[i++] = sum - carry * base;
        }
        if (carry > 0) r.push(carry);
        return r;
    }

    function addAny(a, b) {
        if (a.length >= b.length) return add(a, b);
        return add(b, a);
    }

    function addSmall(a, carry) { // assumes a is array, carry is number with 0 <= carry < MAX_INT
        var l = a.length,
            r = new Array(l),
            base = BASE,
            sum, i;
        for (i = 0; i < l; i++) {
            sum = a[i] - base + carry;
            carry = Math.floor(sum / base);
            r[i] = sum - carry * base;
            carry += 1;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    BigInteger.prototype.add = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.subtract(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall) {
            return new BigInteger(addSmall(a, Math.abs(b)), this.sign);
        }
        return new BigInteger(addAny(a, b), this.sign);
    };
    BigInteger.prototype.plus = BigInteger.prototype.add;

    SmallInteger.prototype.add = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.subtract(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            if (isPrecise(a + b)) return new SmallInteger(a + b);
            b = smallToArray(Math.abs(b));
        }
        return new BigInteger(addSmall(b, Math.abs(a)), a < 0);
    };
    SmallInteger.prototype.plus = SmallInteger.prototype.add;

    NativeBigInt.prototype.add = function (v) {
        return new NativeBigInt(this.value + parseValue(v).value);
    };
    NativeBigInt.prototype.plus = NativeBigInt.prototype.add;

    function subtract(a, b) { // assumes a and b are arrays with a >= b
        var a_l = a.length,
            b_l = b.length,
            r = new Array(a_l),
            borrow = 0,
            base = BASE,
            i, difference;
        for (i = 0; i < b_l; i++) {
            difference = a[i] - borrow - b[i];
            if (difference < 0) {
                difference += base;
                borrow = 1;
            } else borrow = 0;
            r[i] = difference;
        }
        for (i = b_l; i < a_l; i++) {
            difference = a[i] - borrow;
            if (difference < 0) difference += base;
            else {
                r[i++] = difference;
                break;
            }
            r[i] = difference;
        }
        for (; i < a_l; i++) {
            r[i] = a[i];
        }
        trim(r);
        return r;
    }

    function subtractAny(a, b, sign) {
        var value;
        if (compareAbs(a, b) >= 0) {
            value = subtract(a, b);
        } else {
            value = subtract(b, a);
            sign = !sign;
        }
        value = arrayToSmall(value);
        if (typeof value === "number") {
            if (sign) value = -value;
            return new SmallInteger(value);
        }
        return new BigInteger(value, sign);
    }

    function subtractSmall(a, b, sign) { // assumes a is array, b is number with 0 <= b < MAX_INT
        var l = a.length,
            r = new Array(l),
            carry = -b,
            base = BASE,
            i, difference;
        for (i = 0; i < l; i++) {
            difference = a[i] + carry;
            carry = Math.floor(difference / base);
            difference %= base;
            r[i] = difference < 0 ? difference + base : difference;
        }
        r = arrayToSmall(r);
        if (typeof r === "number") {
            if (sign) r = -r;
            return new SmallInteger(r);
        } return new BigInteger(r, sign);
    }

    BigInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        if (this.sign !== n.sign) {
            return this.add(n.negate());
        }
        var a = this.value, b = n.value;
        if (n.isSmall)
            return subtractSmall(a, Math.abs(b), this.sign);
        return subtractAny(a, b, this.sign);
    };
    BigInteger.prototype.minus = BigInteger.prototype.subtract;

    SmallInteger.prototype.subtract = function (v) {
        var n = parseValue(v);
        var a = this.value;
        if (a < 0 !== n.sign) {
            return this.add(n.negate());
        }
        var b = n.value;
        if (n.isSmall) {
            return new SmallInteger(a - b);
        }
        return subtractSmall(b, Math.abs(a), a >= 0);
    };
    SmallInteger.prototype.minus = SmallInteger.prototype.subtract;

    NativeBigInt.prototype.subtract = function (v) {
        return new NativeBigInt(this.value - parseValue(v).value);
    };
    NativeBigInt.prototype.minus = NativeBigInt.prototype.subtract;

    BigInteger.prototype.negate = function () {
        return new BigInteger(this.value, !this.sign);
    };
    SmallInteger.prototype.negate = function () {
        var sign = this.sign;
        var small = new SmallInteger(-this.value);
        small.sign = !sign;
        return small;
    };
    NativeBigInt.prototype.negate = function () {
        return new NativeBigInt(-this.value);
    };

    BigInteger.prototype.abs = function () {
        return new BigInteger(this.value, false);
    };
    SmallInteger.prototype.abs = function () {
        return new SmallInteger(Math.abs(this.value));
    };
    NativeBigInt.prototype.abs = function () {
        return new NativeBigInt(this.value >= 0 ? this.value : -this.value);
    };


    function multiplyLong(a, b) {
        var a_l = a.length,
            b_l = b.length,
            l = a_l + b_l,
            r = createArray(l),
            base = BASE,
            product, carry, i, a_i, b_j;
        for (i = 0; i < a_l; ++i) {
            a_i = a[i];
            for (var j = 0; j < b_l; ++j) {
                b_j = b[j];
                product = a_i * b_j + r[i + j];
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
                r[i + j + 1] += carry;
            }
        }
        trim(r);
        return r;
    }

    function multiplySmall(a, b) { // assumes a is array, b is number with |b| < BASE
        var l = a.length,
            r = new Array(l),
            base = BASE,
            carry = 0,
            product, i;
        for (i = 0; i < l; i++) {
            product = a[i] * b + carry;
            carry = Math.floor(product / base);
            r[i] = product - carry * base;
        }
        while (carry > 0) {
            r[i++] = carry % base;
            carry = Math.floor(carry / base);
        }
        return r;
    }

    function shiftLeft(x, n) {
        var r = [];
        while (n-- > 0) r.push(0);
        return r.concat(x);
    }

    function multiplyKaratsuba(x, y) {
        var n = Math.max(x.length, y.length);

        if (n <= 30) return multiplyLong(x, y);
        n = Math.ceil(n / 2);

        var b = x.slice(n),
            a = x.slice(0, n),
            d = y.slice(n),
            c = y.slice(0, n);

        var ac = multiplyKaratsuba(a, c),
            bd = multiplyKaratsuba(b, d),
            abcd = multiplyKaratsuba(addAny(a, b), addAny(c, d));

        var product = addAny(addAny(ac, shiftLeft(subtract(subtract(abcd, ac), bd), n)), shiftLeft(bd, 2 * n));
        trim(product);
        return product;
    }

    // The following function is derived from a surface fit of a graph plotting the performance difference
    // between long multiplication and karatsuba multiplication versus the lengths of the two arrays.
    function useKaratsuba(l1, l2) {
        return -0.012 * l1 - 0.012 * l2 + 0.000015 * l1 * l2 > 0;
    }

    BigInteger.prototype.multiply = function (v) {
        var n = parseValue(v),
            a = this.value, b = n.value,
            sign = this.sign !== n.sign,
            abs;
        if (n.isSmall) {
            if (b === 0) return Integer[0];
            if (b === 1) return this;
            if (b === -1) return this.negate();
            abs = Math.abs(b);
            if (abs < BASE) {
                return new BigInteger(multiplySmall(a, abs), sign);
            }
            b = smallToArray(abs);
        }
        if (useKaratsuba(a.length, b.length)) // Karatsuba is only faster for certain array sizes
            return new BigInteger(multiplyKaratsuba(a, b), sign);
        return new BigInteger(multiplyLong(a, b), sign);
    };

    BigInteger.prototype.times = BigInteger.prototype.multiply;

    function multiplySmallAndArray(a, b, sign) { // a >= 0
        if (a < BASE) {
            return new BigInteger(multiplySmall(b, a), sign);
        }
        return new BigInteger(multiplyLong(b, smallToArray(a)), sign);
    }
    SmallInteger.prototype._multiplyBySmall = function (a) {
        if (isPrecise(a.value * this.value)) {
            return new SmallInteger(a.value * this.value);
        }
        return multiplySmallAndArray(Math.abs(a.value), smallToArray(Math.abs(this.value)), this.sign !== a.sign);
    };
    BigInteger.prototype._multiplyBySmall = function (a) {
        if (a.value === 0) return Integer[0];
        if (a.value === 1) return this;
        if (a.value === -1) return this.negate();
        return multiplySmallAndArray(Math.abs(a.value), this.value, this.sign !== a.sign);
    };
    SmallInteger.prototype.multiply = function (v) {
        return parseValue(v)._multiplyBySmall(this);
    };
    SmallInteger.prototype.times = SmallInteger.prototype.multiply;

    NativeBigInt.prototype.multiply = function (v) {
        return new NativeBigInt(this.value * parseValue(v).value);
    };
    NativeBigInt.prototype.times = NativeBigInt.prototype.multiply;

    function square(a) {
        //console.assert(2 * BASE * BASE < MAX_INT);
        var l = a.length,
            r = createArray(l + l),
            base = BASE,
            product, carry, i, a_i, a_j;
        for (i = 0; i < l; i++) {
            a_i = a[i];
            carry = 0 - a_i * a_i;
            for (var j = i; j < l; j++) {
                a_j = a[j];
                product = 2 * (a_i * a_j) + r[i + j] + carry;
                carry = Math.floor(product / base);
                r[i + j] = product - carry * base;
            }
            r[i + l] = carry;
        }
        trim(r);
        return r;
    }

    BigInteger.prototype.square = function () {
        return new BigInteger(square(this.value), false);
    };

    SmallInteger.prototype.square = function () {
        var value = this.value * this.value;
        if (isPrecise(value)) return new SmallInteger(value);
        return new BigInteger(square(smallToArray(Math.abs(this.value))), false);
    };

    NativeBigInt.prototype.square = function (v) {
        return new NativeBigInt(this.value * this.value);
    };

    function divMod1(a, b) { // Left over from previous version. Performs faster than divMod2 on smaller input sizes.
        var a_l = a.length,
            b_l = b.length,
            base = BASE,
            result = createArray(b.length),
            divisorMostSignificantDigit = b[b_l - 1],
            // normalization
            lambda = Math.ceil(base / (2 * divisorMostSignificantDigit)),
            remainder = multiplySmall(a, lambda),
            divisor = multiplySmall(b, lambda),
            quotientDigit, shift, carry, borrow, i, l, q;
        if (remainder.length <= a_l) remainder.push(0);
        divisor.push(0);
        divisorMostSignificantDigit = divisor[b_l - 1];
        for (shift = a_l - b_l; shift >= 0; shift--) {
            quotientDigit = base - 1;
            if (remainder[shift + b_l] !== divisorMostSignificantDigit) {
                quotientDigit = Math.floor((remainder[shift + b_l] * base + remainder[shift + b_l - 1]) / divisorMostSignificantDigit);
            }
            // quotientDigit <= base - 1
            carry = 0;
            borrow = 0;
            l = divisor.length;
            for (i = 0; i < l; i++) {
                carry += quotientDigit * divisor[i];
                q = Math.floor(carry / base);
                borrow += remainder[shift + i] - (carry - q * base);
                carry = q;
                if (borrow < 0) {
                    remainder[shift + i] = borrow + base;
                    borrow = -1;
                } else {
                    remainder[shift + i] = borrow;
                    borrow = 0;
                }
            }
            while (borrow !== 0) {
                quotientDigit -= 1;
                carry = 0;
                for (i = 0; i < l; i++) {
                    carry += remainder[shift + i] - base + divisor[i];
                    if (carry < 0) {
                        remainder[shift + i] = carry + base;
                        carry = 0;
                    } else {
                        remainder[shift + i] = carry;
                        carry = 1;
                    }
                }
                borrow += carry;
            }
            result[shift] = quotientDigit;
        }
        // denormalization
        remainder = divModSmall(remainder, lambda)[0];
        return [arrayToSmall(result), arrayToSmall(remainder)];
    }

    function divMod2(a, b) { // Implementation idea shamelessly stolen from Silent Matt's library http://silentmatt.com/biginteger/
        // Performs faster than divMod1 on larger input sizes.
        var a_l = a.length,
            b_l = b.length,
            result = [],
            part = [],
            base = BASE,
            guess, xlen, highx, highy, check;
        while (a_l) {
            part.unshift(a[--a_l]);
            trim(part);
            if (compareAbs(part, b) < 0) {
                result.push(0);
                continue;
            }
            xlen = part.length;
            highx = part[xlen - 1] * base + part[xlen - 2];
            highy = b[b_l - 1] * base + b[b_l - 2];
            if (xlen > b_l) {
                highx = (highx + 1) * base;
            }
            guess = Math.ceil(highx / highy);
            do {
                check = multiplySmall(b, guess);
                if (compareAbs(check, part) <= 0) break;
                guess--;
            } while (guess);
            result.push(guess);
            part = subtract(part, check);
        }
        result.reverse();
        return [arrayToSmall(result), arrayToSmall(part)];
    }

    function divModSmall(value, lambda) {
        var length = value.length,
            quotient = createArray(length),
            base = BASE,
            i, q, remainder, divisor;
        remainder = 0;
        for (i = length - 1; i >= 0; --i) {
            divisor = remainder * base + value[i];
            q = truncate(divisor / lambda);
            remainder = divisor - q * lambda;
            quotient[i] = q | 0;
        }
        return [quotient, remainder | 0];
    }

    function divModAny(self, v) {
        var value, n = parseValue(v);
        if (supportsNativeBigInt) {
            return [new NativeBigInt(self.value / n.value), new NativeBigInt(self.value % n.value)];
        }
        var a = self.value, b = n.value;
        var quotient;
        if (b === 0) throw new Error("Cannot divide by zero");
        if (self.isSmall) {
            if (n.isSmall) {
                return [new SmallInteger(truncate(a / b)), new SmallInteger(a % b)];
            }
            return [Integer[0], self];
        }
        if (n.isSmall) {
            if (b === 1) return [self, Integer[0]];
            if (b == -1) return [self.negate(), Integer[0]];
            var abs = Math.abs(b);
            if (abs < BASE) {
                value = divModSmall(a, abs);
                quotient = arrayToSmall(value[0]);
                var remainder = value[1];
                if (self.sign) remainder = -remainder;
                if (typeof quotient === "number") {
                    if (self.sign !== n.sign) quotient = -quotient;
                    return [new SmallInteger(quotient), new SmallInteger(remainder)];
                }
                return [new BigInteger(quotient, self.sign !== n.sign), new SmallInteger(remainder)];
            }
            b = smallToArray(abs);
        }
        var comparison = compareAbs(a, b);
        if (comparison === -1) return [Integer[0], self];
        if (comparison === 0) return [Integer[self.sign === n.sign ? 1 : -1], Integer[0]];

        // divMod1 is faster on smaller input sizes
        if (a.length + b.length <= 200)
            value = divMod1(a, b);
        else value = divMod2(a, b);

        quotient = value[0];
        var qSign = self.sign !== n.sign,
            mod = value[1],
            mSign = self.sign;
        if (typeof quotient === "number") {
            if (qSign) quotient = -quotient;
            quotient = new SmallInteger(quotient);
        } else quotient = new BigInteger(quotient, qSign);
        if (typeof mod === "number") {
            if (mSign) mod = -mod;
            mod = new SmallInteger(mod);
        } else mod = new BigInteger(mod, mSign);
        return [quotient, mod];
    }

    BigInteger.prototype.divmod = function (v) {
        var result = divModAny(this, v);
        return {
            quotient: result[0],
            remainder: result[1]
        };
    };
    NativeBigInt.prototype.divmod = SmallInteger.prototype.divmod = BigInteger.prototype.divmod;


    BigInteger.prototype.divide = function (v) {
        return divModAny(this, v)[0];
    };
    NativeBigInt.prototype.over = NativeBigInt.prototype.divide = function (v) {
        return new NativeBigInt(this.value / parseValue(v).value);
    };
    SmallInteger.prototype.over = SmallInteger.prototype.divide = BigInteger.prototype.over = BigInteger.prototype.divide;

    BigInteger.prototype.mod = function (v) {
        return divModAny(this, v)[1];
    };
    NativeBigInt.prototype.mod = NativeBigInt.prototype.remainder = function (v) {
        return new NativeBigInt(this.value % parseValue(v).value);
    };
    SmallInteger.prototype.remainder = SmallInteger.prototype.mod = BigInteger.prototype.remainder = BigInteger.prototype.mod;

    BigInteger.prototype.pow = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value,
            value, x, y;
        if (b === 0) return Integer[1];
        if (a === 0) return Integer[0];
        if (a === 1) return Integer[1];
        if (a === -1) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.sign) {
            return Integer[0];
        }
        if (!n.isSmall) throw new Error("The exponent " + n.toString() + " is too large.");
        if (this.isSmall) {
            if (isPrecise(value = Math.pow(a, b)))
                return new SmallInteger(truncate(value));
        }
        x = this;
        y = Integer[1];
        while (true) {
            if (b & 1 === 1) {
                y = y.times(x);
                --b;
            }
            if (b === 0) break;
            b /= 2;
            x = x.square();
        }
        return y;
    };
    SmallInteger.prototype.pow = BigInteger.prototype.pow;

    NativeBigInt.prototype.pow = function (v) {
        var n = parseValue(v);
        var a = this.value, b = n.value;
        var _0 = BigInt(0), _1 = BigInt(1), _2 = BigInt(2);
        if (b === _0) return Integer[1];
        if (a === _0) return Integer[0];
        if (a === _1) return Integer[1];
        if (a === BigInt(-1)) return n.isEven() ? Integer[1] : Integer[-1];
        if (n.isNegative()) return new NativeBigInt(_0);
        var x = this;
        var y = Integer[1];
        while (true) {
            if ((b & _1) === _1) {
                y = y.times(x);
                --b;
            }
            if (b === _0) break;
            b /= _2;
            x = x.square();
        }
        return y;
    };

    BigInteger.prototype.modPow = function (exp, mod) {
        exp = parseValue(exp);
        mod = parseValue(mod);
        if (mod.isZero()) throw new Error("Cannot take modPow with modulus 0");
        var r = Integer[1],
            base = this.mod(mod);
        if (exp.isNegative()) {
            exp = exp.multiply(Integer[-1]);
            base = base.modInv(mod);
        }
        while (exp.isPositive()) {
            if (base.isZero()) return Integer[0];
            if (exp.isOdd()) r = r.multiply(base).mod(mod);
            exp = exp.divide(2);
            base = base.square().mod(mod);
        }
        return r;
    };
    NativeBigInt.prototype.modPow = SmallInteger.prototype.modPow = BigInteger.prototype.modPow;

    function compareAbs(a, b) {
        if (a.length !== b.length) {
            return a.length > b.length ? 1 : -1;
        }
        for (var i = a.length - 1; i >= 0; i--) {
            if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
        }
        return 0;
    }

    BigInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) return 1;
        return compareAbs(a, b);
    };
    SmallInteger.prototype.compareAbs = function (v) {
        var n = parseValue(v),
            a = Math.abs(this.value),
            b = n.value;
        if (n.isSmall) {
            b = Math.abs(b);
            return a === b ? 0 : a > b ? 1 : -1;
        }
        return -1;
    };
    NativeBigInt.prototype.compareAbs = function (v) {
        var a = this.value;
        var b = parseValue(v).value;
        a = a >= 0 ? a : -a;
        b = b >= 0 ? b : -b;
        return a === b ? 0 : a > b ? 1 : -1;
    };

    BigInteger.prototype.compare = function (v) {
        // See discussion about comparison with Infinity:
        // https://github.com/peterolson/BigInteger.js/issues/61
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (this.sign !== n.sign) {
            return n.sign ? 1 : -1;
        }
        if (n.isSmall) {
            return this.sign ? -1 : 1;
        }
        return compareAbs(a, b) * (this.sign ? -1 : 1);
    };
    BigInteger.prototype.compareTo = BigInteger.prototype.compare;

    SmallInteger.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }

        var n = parseValue(v),
            a = this.value,
            b = n.value;
        if (n.isSmall) {
            return a == b ? 0 : a > b ? 1 : -1;
        }
        if (a < 0 !== n.sign) {
            return a < 0 ? -1 : 1;
        }
        return a < 0 ? 1 : -1;
    };
    SmallInteger.prototype.compareTo = SmallInteger.prototype.compare;

    NativeBigInt.prototype.compare = function (v) {
        if (v === Infinity) {
            return -1;
        }
        if (v === -Infinity) {
            return 1;
        }
        var a = this.value;
        var b = parseValue(v).value;
        return a === b ? 0 : a > b ? 1 : -1;
    };
    NativeBigInt.prototype.compareTo = NativeBigInt.prototype.compare;

    BigInteger.prototype.equals = function (v) {
        return this.compare(v) === 0;
    };
    NativeBigInt.prototype.eq = NativeBigInt.prototype.equals = SmallInteger.prototype.eq = SmallInteger.prototype.equals = BigInteger.prototype.eq = BigInteger.prototype.equals;

    BigInteger.prototype.notEquals = function (v) {
        return this.compare(v) !== 0;
    };
    NativeBigInt.prototype.neq = NativeBigInt.prototype.notEquals = SmallInteger.prototype.neq = SmallInteger.prototype.notEquals = BigInteger.prototype.neq = BigInteger.prototype.notEquals;

    BigInteger.prototype.greater = function (v) {
        return this.compare(v) > 0;
    };
    NativeBigInt.prototype.gt = NativeBigInt.prototype.greater = SmallInteger.prototype.gt = SmallInteger.prototype.greater = BigInteger.prototype.gt = BigInteger.prototype.greater;

    BigInteger.prototype.lesser = function (v) {
        return this.compare(v) < 0;
    };
    NativeBigInt.prototype.lt = NativeBigInt.prototype.lesser = SmallInteger.prototype.lt = SmallInteger.prototype.lesser = BigInteger.prototype.lt = BigInteger.prototype.lesser;

    BigInteger.prototype.greaterOrEquals = function (v) {
        return this.compare(v) >= 0;
    };
    NativeBigInt.prototype.geq = NativeBigInt.prototype.greaterOrEquals = SmallInteger.prototype.geq = SmallInteger.prototype.greaterOrEquals = BigInteger.prototype.geq = BigInteger.prototype.greaterOrEquals;

    BigInteger.prototype.lesserOrEquals = function (v) {
        return this.compare(v) <= 0;
    };
    NativeBigInt.prototype.leq = NativeBigInt.prototype.lesserOrEquals = SmallInteger.prototype.leq = SmallInteger.prototype.lesserOrEquals = BigInteger.prototype.leq = BigInteger.prototype.lesserOrEquals;

    BigInteger.prototype.isEven = function () {
        return (this.value[0] & 1) === 0;
    };
    SmallInteger.prototype.isEven = function () {
        return (this.value & 1) === 0;
    };
    NativeBigInt.prototype.isEven = function () {
        return (this.value & BigInt(1)) === BigInt(0);
    };

    BigInteger.prototype.isOdd = function () {
        return (this.value[0] & 1) === 1;
    };
    SmallInteger.prototype.isOdd = function () {
        return (this.value & 1) === 1;
    };
    NativeBigInt.prototype.isOdd = function () {
        return (this.value & BigInt(1)) === BigInt(1);
    };

    BigInteger.prototype.isPositive = function () {
        return !this.sign;
    };
    SmallInteger.prototype.isPositive = function () {
        return this.value > 0;
    };
    NativeBigInt.prototype.isPositive = SmallInteger.prototype.isPositive;

    BigInteger.prototype.isNegative = function () {
        return this.sign;
    };
    SmallInteger.prototype.isNegative = function () {
        return this.value < 0;
    };
    NativeBigInt.prototype.isNegative = SmallInteger.prototype.isNegative;

    BigInteger.prototype.isUnit = function () {
        return false;
    };
    SmallInteger.prototype.isUnit = function () {
        return Math.abs(this.value) === 1;
    };
    NativeBigInt.prototype.isUnit = function () {
        return this.abs().value === BigInt(1);
    };

    BigInteger.prototype.isZero = function () {
        return false;
    };
    SmallInteger.prototype.isZero = function () {
        return this.value === 0;
    };
    NativeBigInt.prototype.isZero = function () {
        return this.value === BigInt(0);
    };

    BigInteger.prototype.isDivisibleBy = function (v) {
        var n = parseValue(v);
        if (n.isZero()) return false;
        if (n.isUnit()) return true;
        if (n.compareAbs(2) === 0) return this.isEven();
        return this.mod(n).isZero();
    };
    NativeBigInt.prototype.isDivisibleBy = SmallInteger.prototype.isDivisibleBy = BigInteger.prototype.isDivisibleBy;

    function isBasicPrime(v) {
        var n = v.abs();
        if (n.isUnit()) return false;
        if (n.equals(2) || n.equals(3) || n.equals(5)) return true;
        if (n.isEven() || n.isDivisibleBy(3) || n.isDivisibleBy(5)) return false;
        if (n.lesser(49)) return true;
        // we don't know if it's prime: let the other functions figure it out
    }

    function millerRabinTest(n, a) {
        var nPrev = n.prev(),
            b = nPrev,
            r = 0,
            d, i, x;
        while (b.isEven()) b = b.divide(2), r++;
        next: for (i = 0; i < a.length; i++) {
            if (n.lesser(a[i])) continue;
            x = bigInt(a[i]).modPow(b, n);
            if (x.isUnit() || x.equals(nPrev)) continue;
            for (d = r - 1; d != 0; d--) {
                x = x.square().mod(n);
                if (x.isUnit()) return false;
                if (x.equals(nPrev)) continue next;
            }
            return false;
        }
        return true;
    }

    // Set "strict" to true to force GRH-supported lower bound of 2*log(N)^2
    BigInteger.prototype.isPrime = function (strict) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined$1) return isPrime;
        var n = this.abs();
        var bits = n.bitLength();
        if (bits <= 64)
            return millerRabinTest(n, [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37]);
        var logN = Math.log(2) * bits.toJSNumber();
        var t = Math.ceil((strict === true) ? (2 * Math.pow(logN, 2)) : logN);
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt(i + 2));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isPrime = SmallInteger.prototype.isPrime = BigInteger.prototype.isPrime;

    BigInteger.prototype.isProbablePrime = function (iterations, rng) {
        var isPrime = isBasicPrime(this);
        if (isPrime !== undefined$1) return isPrime;
        var n = this.abs();
        var t = iterations === undefined$1 ? 5 : iterations;
        for (var a = [], i = 0; i < t; i++) {
            a.push(bigInt.randBetween(2, n.minus(2), rng));
        }
        return millerRabinTest(n, a);
    };
    NativeBigInt.prototype.isProbablePrime = SmallInteger.prototype.isProbablePrime = BigInteger.prototype.isProbablePrime;

    BigInteger.prototype.modInv = function (n) {
        var t = bigInt.zero, newT = bigInt.one, r = parseValue(n), newR = this.abs(), q, lastT, lastR;
        while (!newR.isZero()) {
            q = r.divide(newR);
            lastT = t;
            lastR = r;
            t = newT;
            r = newR;
            newT = lastT.subtract(q.multiply(newT));
            newR = lastR.subtract(q.multiply(newR));
        }
        if (!r.isUnit()) throw new Error(this.toString() + " and " + n.toString() + " are not co-prime");
        if (t.compare(0) === -1) {
            t = t.add(n);
        }
        if (this.isNegative()) {
            return t.negate();
        }
        return t;
    };

    NativeBigInt.prototype.modInv = SmallInteger.prototype.modInv = BigInteger.prototype.modInv;

    BigInteger.prototype.next = function () {
        var value = this.value;
        if (this.sign) {
            return subtractSmall(value, 1, this.sign);
        }
        return new BigInteger(addSmall(value, 1), this.sign);
    };
    SmallInteger.prototype.next = function () {
        var value = this.value;
        if (value + 1 < MAX_INT) return new SmallInteger(value + 1);
        return new BigInteger(MAX_INT_ARR, false);
    };
    NativeBigInt.prototype.next = function () {
        return new NativeBigInt(this.value + BigInt(1));
    };

    BigInteger.prototype.prev = function () {
        var value = this.value;
        if (this.sign) {
            return new BigInteger(addSmall(value, 1), true);
        }
        return subtractSmall(value, 1, this.sign);
    };
    SmallInteger.prototype.prev = function () {
        var value = this.value;
        if (value - 1 > -MAX_INT) return new SmallInteger(value - 1);
        return new BigInteger(MAX_INT_ARR, true);
    };
    NativeBigInt.prototype.prev = function () {
        return new NativeBigInt(this.value - BigInt(1));
    };

    var powersOfTwo = [1];
    while (2 * powersOfTwo[powersOfTwo.length - 1] <= BASE) powersOfTwo.push(2 * powersOfTwo[powersOfTwo.length - 1]);
    var powers2Length = powersOfTwo.length, highestPower2 = powersOfTwo[powers2Length - 1];

    function shift_isSmall(n) {
        return Math.abs(n) <= BASE;
    }

    BigInteger.prototype.shiftLeft = function (v) {
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftRight(-n);
        var result = this;
        if (result.isZero()) return result;
        while (n >= powers2Length) {
            result = result.multiply(highestPower2);
            n -= powers2Length - 1;
        }
        return result.multiply(powersOfTwo[n]);
    };
    NativeBigInt.prototype.shiftLeft = SmallInteger.prototype.shiftLeft = BigInteger.prototype.shiftLeft;

    BigInteger.prototype.shiftRight = function (v) {
        var remQuo;
        var n = parseValue(v).toJSNumber();
        if (!shift_isSmall(n)) {
            throw new Error(String(n) + " is too large for shifting.");
        }
        if (n < 0) return this.shiftLeft(-n);
        var result = this;
        while (n >= powers2Length) {
            if (result.isZero() || (result.isNegative() && result.isUnit())) return result;
            remQuo = divModAny(result, highestPower2);
            result = remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
            n -= powers2Length - 1;
        }
        remQuo = divModAny(result, powersOfTwo[n]);
        return remQuo[1].isNegative() ? remQuo[0].prev() : remQuo[0];
    };
    NativeBigInt.prototype.shiftRight = SmallInteger.prototype.shiftRight = BigInteger.prototype.shiftRight;

    function bitwise(x, y, fn) {
        y = parseValue(y);
        var xSign = x.isNegative(), ySign = y.isNegative();
        var xRem = xSign ? x.not() : x,
            yRem = ySign ? y.not() : y;
        var xDigit = 0, yDigit = 0;
        var xDivMod = null, yDivMod = null;
        var result = [];
        while (!xRem.isZero() || !yRem.isZero()) {
            xDivMod = divModAny(xRem, highestPower2);
            xDigit = xDivMod[1].toJSNumber();
            if (xSign) {
                xDigit = highestPower2 - 1 - xDigit; // two's complement for negative numbers
            }

            yDivMod = divModAny(yRem, highestPower2);
            yDigit = yDivMod[1].toJSNumber();
            if (ySign) {
                yDigit = highestPower2 - 1 - yDigit; // two's complement for negative numbers
            }

            xRem = xDivMod[0];
            yRem = yDivMod[0];
            result.push(fn(xDigit, yDigit));
        }
        var sum = fn(xSign ? 1 : 0, ySign ? 1 : 0) !== 0 ? bigInt(-1) : bigInt(0);
        for (var i = result.length - 1; i >= 0; i -= 1) {
            sum = sum.multiply(highestPower2).add(bigInt(result[i]));
        }
        return sum;
    }

    BigInteger.prototype.not = function () {
        return this.negate().prev();
    };
    NativeBigInt.prototype.not = SmallInteger.prototype.not = BigInteger.prototype.not;

    BigInteger.prototype.and = function (n) {
        return bitwise(this, n, function (a, b) { return a & b; });
    };
    NativeBigInt.prototype.and = SmallInteger.prototype.and = BigInteger.prototype.and;

    BigInteger.prototype.or = function (n) {
        return bitwise(this, n, function (a, b) { return a | b; });
    };
    NativeBigInt.prototype.or = SmallInteger.prototype.or = BigInteger.prototype.or;

    BigInteger.prototype.xor = function (n) {
        return bitwise(this, n, function (a, b) { return a ^ b; });
    };
    NativeBigInt.prototype.xor = SmallInteger.prototype.xor = BigInteger.prototype.xor;

    var LOBMASK_I = 1 << 30, LOBMASK_BI = (BASE & -BASE) * (BASE & -BASE) | LOBMASK_I;
    function roughLOB(n) { // get lowestOneBit (rough)
        // SmallInteger: return Min(lowestOneBit(n), 1 << 30)
        // BigInteger: return Min(lowestOneBit(n), 1 << 14) [BASE=1e7]
        var v = n.value,
            x = typeof v === "number" ? v | LOBMASK_I :
                typeof v === "bigint" ? v | BigInt(LOBMASK_I) :
                    v[0] + v[1] * BASE | LOBMASK_BI;
        return x & -x;
    }

    function integerLogarithm(value, base) {
        if (base.compareTo(value) <= 0) {
            var tmp = integerLogarithm(value, base.square(base));
            var p = tmp.p;
            var e = tmp.e;
            var t = p.multiply(base);
            return t.compareTo(value) <= 0 ? { p: t, e: e * 2 + 1 } : { p: p, e: e * 2 };
        }
        return { p: bigInt(1), e: 0 };
    }

    BigInteger.prototype.bitLength = function () {
        var n = this;
        if (n.compareTo(bigInt(0)) < 0) {
            n = n.negate().subtract(bigInt(1));
        }
        if (n.compareTo(bigInt(0)) === 0) {
            return bigInt(0);
        }
        return bigInt(integerLogarithm(n, bigInt(2)).e).add(bigInt(1));
    };
    NativeBigInt.prototype.bitLength = SmallInteger.prototype.bitLength = BigInteger.prototype.bitLength;

    function max(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.greater(b) ? a : b;
    }
    function min(a, b) {
        a = parseValue(a);
        b = parseValue(b);
        return a.lesser(b) ? a : b;
    }
    function gcd(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        if (a.equals(b)) return a;
        if (a.isZero()) return b;
        if (b.isZero()) return a;
        var c = Integer[1], d, t;
        while (a.isEven() && b.isEven()) {
            d = min(roughLOB(a), roughLOB(b));
            a = a.divide(d);
            b = b.divide(d);
            c = c.multiply(d);
        }
        while (a.isEven()) {
            a = a.divide(roughLOB(a));
        }
        do {
            while (b.isEven()) {
                b = b.divide(roughLOB(b));
            }
            if (a.greater(b)) {
                t = b; b = a; a = t;
            }
            b = b.subtract(a);
        } while (!b.isZero());
        return c.isUnit() ? a : a.multiply(c);
    }
    function lcm(a, b) {
        a = parseValue(a).abs();
        b = parseValue(b).abs();
        return a.divide(gcd(a, b)).multiply(b);
    }
    function randBetween(a, b, rng) {
        a = parseValue(a);
        b = parseValue(b);
        var usedRNG = rng || Math.random;
        var low = min(a, b), high = max(a, b);
        var range = high.subtract(low).add(1);
        if (range.isSmall) return low.add(Math.floor(usedRNG() * range));
        var digits = toBase(range, BASE).value;
        var result = [], restricted = true;
        for (var i = 0; i < digits.length; i++) {
            var top = restricted ? digits[i] : BASE;
            var digit = truncate(usedRNG() * top);
            result.push(digit);
            if (digit < top) restricted = false;
        }
        return low.add(Integer.fromArray(result, BASE, false));
    }

    var parseBase = function (text, base, alphabet, caseSensitive) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        text = String(text);
        if (!caseSensitive) {
            text = text.toLowerCase();
            alphabet = alphabet.toLowerCase();
        }
        var length = text.length;
        var i;
        var absBase = Math.abs(base);
        var alphabetValues = {};
        for (i = 0; i < alphabet.length; i++) {
            alphabetValues[alphabet[i]] = i;
        }
        for (i = 0; i < length; i++) {
            var c = text[i];
            if (c === "-") continue;
            if (c in alphabetValues) {
                if (alphabetValues[c] >= absBase) {
                    if (c === "1" && absBase === 1) continue;
                    throw new Error(c + " is not a valid digit in base " + base + ".");
                }
            }
        }
        base = parseValue(base);
        var digits = [];
        var isNegative = text[0] === "-";
        for (i = isNegative ? 1 : 0; i < text.length; i++) {
            var c = text[i];
            if (c in alphabetValues) digits.push(parseValue(alphabetValues[c]));
            else if (c === "<") {
                var start = i;
                do { i++; } while (text[i] !== ">" && i < text.length);
                digits.push(parseValue(text.slice(start + 1, i)));
            }
            else throw new Error(c + " is not a valid character");
        }
        return parseBaseFromArray(digits, base, isNegative);
    };

    function parseBaseFromArray(digits, base, isNegative) {
        var val = Integer[0], pow = Integer[1], i;
        for (i = digits.length - 1; i >= 0; i--) {
            val = val.add(digits[i].times(pow));
            pow = pow.times(base);
        }
        return isNegative ? val.negate() : val;
    }

    function stringify(digit, alphabet) {
        alphabet = alphabet || DEFAULT_ALPHABET;
        if (digit < alphabet.length) {
            return alphabet[digit];
        }
        return "<" + digit + ">";
    }

    function toBase(n, base) {
        base = bigInt(base);
        if (base.isZero()) {
            if (n.isZero()) return { value: [0], isNegative: false };
            throw new Error("Cannot convert nonzero numbers to base 0.");
        }
        if (base.equals(-1)) {
            if (n.isZero()) return { value: [0], isNegative: false };
            if (n.isNegative())
                return {
                    value: [].concat.apply([], Array.apply(null, Array(-n.toJSNumber()))
                        .map(Array.prototype.valueOf, [1, 0])
                    ),
                    isNegative: false
                };

            var arr = Array.apply(null, Array(n.toJSNumber() - 1))
                .map(Array.prototype.valueOf, [0, 1]);
            arr.unshift([1]);
            return {
                value: [].concat.apply([], arr),
                isNegative: false
            };
        }

        var neg = false;
        if (n.isNegative() && base.isPositive()) {
            neg = true;
            n = n.abs();
        }
        if (base.isUnit()) {
            if (n.isZero()) return { value: [0], isNegative: false };

            return {
                value: Array.apply(null, Array(n.toJSNumber()))
                    .map(Number.prototype.valueOf, 1),
                isNegative: neg
            };
        }
        var out = [];
        var left = n, divmod;
        while (left.isNegative() || left.compareAbs(base) >= 0) {
            divmod = left.divmod(base);
            left = divmod.quotient;
            var digit = divmod.remainder;
            if (digit.isNegative()) {
                digit = base.minus(digit).abs();
                left = left.next();
            }
            out.push(digit.toJSNumber());
        }
        out.push(left.toJSNumber());
        return { value: out.reverse(), isNegative: neg };
    }

    function toBaseString(n, base, alphabet) {
        var arr = toBase(n, base);
        return (arr.isNegative ? "-" : "") + arr.value.map(function (x) {
            return stringify(x, alphabet);
        }).join('');
    }

    BigInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    SmallInteger.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    NativeBigInt.prototype.toArray = function (radix) {
        return toBase(this, radix);
    };

    BigInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined$1) radix = 10;
        if (radix !== 10) return toBaseString(this, radix, alphabet);
        var v = this.value, l = v.length, str = String(v[--l]), zeros = "0000000", digit;
        while (--l >= 0) {
            digit = String(v[l]);
            str += zeros.slice(digit.length) + digit;
        }
        var sign = this.sign ? "-" : "";
        return sign + str;
    };

    SmallInteger.prototype.toString = function (radix, alphabet) {
        if (radix === undefined$1) radix = 10;
        if (radix != 10) return toBaseString(this, radix, alphabet);
        return String(this.value);
    };

    NativeBigInt.prototype.toString = SmallInteger.prototype.toString;

    NativeBigInt.prototype.toJSON = BigInteger.prototype.toJSON = SmallInteger.prototype.toJSON = function () { return this.toString(); };

    BigInteger.prototype.valueOf = function () {
        return parseInt(this.toString(), 10);
    };
    BigInteger.prototype.toJSNumber = BigInteger.prototype.valueOf;

    SmallInteger.prototype.valueOf = function () {
        return this.value;
    };
    SmallInteger.prototype.toJSNumber = SmallInteger.prototype.valueOf;
    NativeBigInt.prototype.valueOf = NativeBigInt.prototype.toJSNumber = function () {
        return parseInt(this.toString(), 10);
    };

    function parseStringValue(v) {
        if (isPrecise(+v)) {
            var x = +v;
            if (x === truncate(x))
                return supportsNativeBigInt ? new NativeBigInt(BigInt(x)) : new SmallInteger(x);
            throw new Error("Invalid integer: " + v);
        }
        var sign = v[0] === "-";
        if (sign) v = v.slice(1);
        var split = v.split(/e/i);
        if (split.length > 2) throw new Error("Invalid integer: " + split.join("e"));
        if (split.length === 2) {
            var exp = split[1];
            if (exp[0] === "+") exp = exp.slice(1);
            exp = +exp;
            if (exp !== truncate(exp) || !isPrecise(exp)) throw new Error("Invalid integer: " + exp + " is not a valid exponent.");
            var text = split[0];
            var decimalPlace = text.indexOf(".");
            if (decimalPlace >= 0) {
                exp -= text.length - decimalPlace - 1;
                text = text.slice(0, decimalPlace) + text.slice(decimalPlace + 1);
            }
            if (exp < 0) throw new Error("Cannot include negative exponent part for integers");
            text += (new Array(exp + 1)).join("0");
            v = text;
        }
        var isValid = /^([0-9][0-9]*)$/.test(v);
        if (!isValid) throw new Error("Invalid integer: " + v);
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(sign ? "-" + v : v));
        }
        var r = [], max = v.length, l = LOG_BASE, min = max - l;
        while (max > 0) {
            r.push(+v.slice(min, max));
            min -= l;
            if (min < 0) min = 0;
            max -= l;
        }
        trim(r);
        return new BigInteger(r, sign);
    }

    function parseNumberValue(v) {
        if (supportsNativeBigInt) {
            return new NativeBigInt(BigInt(v));
        }
        if (isPrecise(v)) {
            if (v !== truncate(v)) throw new Error(v + " is not an integer.");
            return new SmallInteger(v);
        }
        return parseStringValue(v.toString());
    }

    function parseValue(v) {
        if (typeof v === "number") {
            return parseNumberValue(v);
        }
        if (typeof v === "string") {
            return parseStringValue(v);
        }
        if (typeof v === "bigint") {
            return new NativeBigInt(v);
        }
        return v;
    }
    // Pre-define numbers in range [-999,999]
    for (var i = 0; i < 1000; i++) {
        Integer[i] = parseValue(i);
        if (i > 0) Integer[-i] = parseValue(-i);
    }
    // Backwards compatibility
    Integer.one = Integer[1];
    Integer.zero = Integer[0];
    Integer.minusOne = Integer[-1];
    Integer.max = max;
    Integer.min = min;
    Integer.gcd = gcd;
    Integer.lcm = lcm;
    Integer.isInstance = function (x) { return x instanceof BigInteger || x instanceof SmallInteger || x instanceof NativeBigInt; };
    Integer.randBetween = randBetween;

    Integer.fromArray = function (digits, base, isNegative) {
        return parseBaseFromArray(digits.map(parseValue), parseValue(base || 10), isNegative);
    };

    return Integer;
})();

// Node.js check
if ( module.hasOwnProperty("exports")) {
    module.exports = bigInt;
}
});

var sha256_1 = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });
// SHA-256 for JavaScript.
//
// Written in 2014-2016 by Dmitry Chestnykh.
// Public domain, no warranty.
//
// Functions (accept and return Uint8Arrays):
//
//   sha256(message) -> hash
//   sha256.hmac(key, message) -> mac
//
//  Classes:
//
//   new sha256.Hash()
exports.digestLength = 32;
exports.blockSize = 64;
// SHA-256 constants
const K = new Uint32Array([
    0x428a2f98,
    0x71374491,
    0xb5c0fbcf,
    0xe9b5dba5,
    0x3956c25b,
    0x59f111f1,
    0x923f82a4,
    0xab1c5ed5,
    0xd807aa98,
    0x12835b01,
    0x243185be,
    0x550c7dc3,
    0x72be5d74,
    0x80deb1fe,
    0x9bdc06a7,
    0xc19bf174,
    0xe49b69c1,
    0xefbe4786,
    0x0fc19dc6,
    0x240ca1cc,
    0x2de92c6f,
    0x4a7484aa,
    0x5cb0a9dc,
    0x76f988da,
    0x983e5152,
    0xa831c66d,
    0xb00327c8,
    0xbf597fc7,
    0xc6e00bf3,
    0xd5a79147,
    0x06ca6351,
    0x14292967,
    0x27b70a85,
    0x2e1b2138,
    0x4d2c6dfc,
    0x53380d13,
    0x650a7354,
    0x766a0abb,
    0x81c2c92e,
    0x92722c85,
    0xa2bfe8a1,
    0xa81a664b,
    0xc24b8b70,
    0xc76c51a3,
    0xd192e819,
    0xd6990624,
    0xf40e3585,
    0x106aa070,
    0x19a4c116,
    0x1e376c08,
    0x2748774c,
    0x34b0bcb5,
    0x391c0cb3,
    0x4ed8aa4a,
    0x5b9cca4f,
    0x682e6ff3,
    0x748f82ee,
    0x78a5636f,
    0x84c87814,
    0x8cc70208,
    0x90befffa,
    0xa4506ceb,
    0xbef9a3f7,
    0xc67178f2,
]);
function hashBlocks(w, v, p, pos, len) {
    let a, b, c, d, e, f, g, h, u, i, j, t1, t2;
    while (len >= 64) {
        a = v[0];
        b = v[1];
        c = v[2];
        d = v[3];
        e = v[4];
        f = v[5];
        g = v[6];
        h = v[7];
        for (i = 0; i < 16; i++) {
            j = pos + i * 4;
            w[i] =
                ((p[j] & 0xff) << 24) |
                    ((p[j + 1] & 0xff) << 16) |
                    ((p[j + 2] & 0xff) << 8) |
                    (p[j + 3] & 0xff);
        }
        for (i = 16; i < 64; i++) {
            u = w[i - 2];
            t1 =
                ((u >>> 17) | (u << (32 - 17))) ^
                    ((u >>> 19) | (u << (32 - 19))) ^
                    (u >>> 10);
            u = w[i - 15];
            t2 =
                ((u >>> 7) | (u << (32 - 7))) ^
                    ((u >>> 18) | (u << (32 - 18))) ^
                    (u >>> 3);
            w[i] = ((t1 + w[i - 7]) | 0) + ((t2 + w[i - 16]) | 0);
        }
        for (i = 0; i < 64; i++) {
            t1 =
                ((((((e >>> 6) | (e << (32 - 6))) ^
                    ((e >>> 11) | (e << (32 - 11))) ^
                    ((e >>> 25) | (e << (32 - 25)))) +
                    ((e & f) ^ (~e & g))) |
                    0) +
                    ((h + ((K[i] + w[i]) | 0)) | 0)) |
                    0;
            t2 =
                ((((a >>> 2) | (a << (32 - 2))) ^
                    ((a >>> 13) | (a << (32 - 13))) ^
                    ((a >>> 22) | (a << (32 - 22)))) +
                    ((a & b) ^ (a & c) ^ (b & c))) |
                    0;
            h = g;
            g = f;
            f = e;
            e = (d + t1) | 0;
            d = c;
            c = b;
            b = a;
            a = (t1 + t2) | 0;
        }
        v[0] += a;
        v[1] += b;
        v[2] += c;
        v[3] += d;
        v[4] += e;
        v[5] += f;
        v[6] += g;
        v[7] += h;
        pos += 64;
        len -= 64;
    }
    return pos;
}
// Hash implements SHA256 hash algorithm.
class HashSha256 {
    constructor() {
        this.digestLength = exports.digestLength;
        this.blockSize = exports.blockSize;
        // Note: Int32Array is used instead of Uint32Array for performance reasons.
        this.state = new Int32Array(8); // hash state
        this.temp = new Int32Array(64); // temporary state
        this.buffer = new Uint8Array(128); // buffer for data to hash
        this.bufferLength = 0; // number of bytes in buffer
        this.bytesHashed = 0; // number of total bytes hashed
        this.finished = false; // indicates whether the hash was finalized
        this.reset();
    }
    // Resets hash state making it possible
    // to re-use this instance to hash other data.
    reset() {
        this.state[0] = 0x6a09e667;
        this.state[1] = 0xbb67ae85;
        this.state[2] = 0x3c6ef372;
        this.state[3] = 0xa54ff53a;
        this.state[4] = 0x510e527f;
        this.state[5] = 0x9b05688c;
        this.state[6] = 0x1f83d9ab;
        this.state[7] = 0x5be0cd19;
        this.bufferLength = 0;
        this.bytesHashed = 0;
        this.finished = false;
        return this;
    }
    // Cleans internal buffers and re-initializes hash state.
    clean() {
        for (let i = 0; i < this.buffer.length; i++) {
            this.buffer[i] = 0;
        }
        for (let i = 0; i < this.temp.length; i++) {
            this.temp[i] = 0;
        }
        this.reset();
    }
    // Updates hash state with the given data.
    //
    // Optionally, length of the data can be specified to hash
    // fewer bytes than data.length.
    //
    // Throws error when trying to update already finalized hash:
    // instance must be reset to use it again.
    update(data, dataLength = data.length) {
        if (this.finished) {
            throw new Error("SHA256: can't update because hash was finished.");
        }
        let dataPos = 0;
        this.bytesHashed += dataLength;
        if (this.bufferLength > 0) {
            while (this.bufferLength < 64 && dataLength > 0) {
                this.buffer[this.bufferLength++] = data[dataPos++];
                dataLength--;
            }
            if (this.bufferLength === 64) {
                hashBlocks(this.temp, this.state, this.buffer, 0, 64);
                this.bufferLength = 0;
            }
        }
        if (dataLength >= 64) {
            dataPos = hashBlocks(this.temp, this.state, data, dataPos, dataLength);
            dataLength %= 64;
        }
        while (dataLength > 0) {
            this.buffer[this.bufferLength++] = data[dataPos++];
            dataLength--;
        }
        return this;
    }
    // Finalizes hash state and puts hash into out.
    //
    // If hash was already finalized, puts the same value.
    finish(out) {
        if (!this.finished) {
            const bytesHashed = this.bytesHashed;
            const left = this.bufferLength;
            const bitLenHi = (bytesHashed / 0x20000000) | 0;
            const bitLenLo = bytesHashed << 3;
            const padLength = bytesHashed % 64 < 56 ? 64 : 128;
            this.buffer[left] = 0x80;
            for (let i = left + 1; i < padLength - 8; i++) {
                this.buffer[i] = 0;
            }
            this.buffer[padLength - 8] = (bitLenHi >>> 24) & 0xff;
            this.buffer[padLength - 7] = (bitLenHi >>> 16) & 0xff;
            this.buffer[padLength - 6] = (bitLenHi >>> 8) & 0xff;
            this.buffer[padLength - 5] = (bitLenHi >>> 0) & 0xff;
            this.buffer[padLength - 4] = (bitLenLo >>> 24) & 0xff;
            this.buffer[padLength - 3] = (bitLenLo >>> 16) & 0xff;
            this.buffer[padLength - 2] = (bitLenLo >>> 8) & 0xff;
            this.buffer[padLength - 1] = (bitLenLo >>> 0) & 0xff;
            hashBlocks(this.temp, this.state, this.buffer, 0, padLength);
            this.finished = true;
        }
        for (let i = 0; i < 8; i++) {
            out[i * 4 + 0] = (this.state[i] >>> 24) & 0xff;
            out[i * 4 + 1] = (this.state[i] >>> 16) & 0xff;
            out[i * 4 + 2] = (this.state[i] >>> 8) & 0xff;
            out[i * 4 + 3] = (this.state[i] >>> 0) & 0xff;
        }
        return this;
    }
    // Returns the final hash digest.
    digest() {
        const out = new Uint8Array(this.digestLength);
        this.finish(out);
        return out;
    }
    // Internal function for use in HMAC for optimization.
    _saveState(out) {
        for (let i = 0; i < this.state.length; i++) {
            out[i] = this.state[i];
        }
    }
    // Internal function for use in HMAC for optimization.
    _restoreState(from, bytesHashed) {
        for (let i = 0; i < this.state.length; i++) {
            this.state[i] = from[i];
        }
        this.bytesHashed = bytesHashed;
        this.finished = false;
        this.bufferLength = 0;
    }
}
exports.HashSha256 = HashSha256;
// HMAC implements HMAC-SHA256 message authentication algorithm.
class HMAC {
    constructor(key) {
        this.inner = new HashSha256();
        this.outer = new HashSha256();
        this.blockSize = this.inner.blockSize;
        this.digestLength = this.inner.digestLength;
        const pad = new Uint8Array(this.blockSize);
        if (key.length > this.blockSize) {
            new HashSha256()
                .update(key)
                .finish(pad)
                .clean();
        }
        else {
            for (let i = 0; i < key.length; i++) {
                pad[i] = key[i];
            }
        }
        for (let i = 0; i < pad.length; i++) {
            pad[i] ^= 0x36;
        }
        this.inner.update(pad);
        for (let i = 0; i < pad.length; i++) {
            pad[i] ^= 0x36 ^ 0x5c;
        }
        this.outer.update(pad);
        this.istate = new Uint32Array(8);
        this.ostate = new Uint32Array(8);
        this.inner._saveState(this.istate);
        this.outer._saveState(this.ostate);
        for (let i = 0; i < pad.length; i++) {
            pad[i] = 0;
        }
    }
    // Returns HMAC state to the state initialized with key
    // to make it possible to run HMAC over the other data with the same
    // key without creating a new instance.
    reset() {
        this.inner._restoreState(this.istate, this.inner.blockSize);
        this.outer._restoreState(this.ostate, this.outer.blockSize);
        return this;
    }
    // Cleans HMAC state.
    clean() {
        for (let i = 0; i < this.istate.length; i++) {
            this.ostate[i] = this.istate[i] = 0;
        }
        this.inner.clean();
        this.outer.clean();
    }
    // Updates state with provided data.
    update(data) {
        this.inner.update(data);
        return this;
    }
    // Finalizes HMAC and puts the result in out.
    finish(out) {
        if (this.outer.finished) {
            this.outer.finish(out);
        }
        else {
            this.inner.finish(out);
            this.outer.update(out, this.digestLength).finish(out);
        }
        return this;
    }
    // Returns message authentication code.
    digest() {
        const out = new Uint8Array(this.digestLength);
        this.finish(out);
        return out;
    }
}
exports.HMAC = HMAC;
// Returns SHA256 hash of data.
function sha256(data) {
    const h = new HashSha256().update(data);
    const digest = h.digest();
    h.clean();
    return digest;
}
exports.sha256 = sha256;
// Returns HMAC-SHA256 of data under the key.
function hmacSha256(key, data) {
    const h = new HMAC(key).update(data);
    const digest = h.digest();
    h.clean();
    return digest;
}
exports.hmacSha256 = hmacSha256;

});

unwrapExports(sha256_1);
var sha256_2 = sha256_1.digestLength;
var sha256_3 = sha256_1.blockSize;
var sha256_4 = sha256_1.HashSha256;
var sha256_5 = sha256_1.HMAC;
var sha256_6 = sha256_1.sha256;
var sha256_7 = sha256_1.hmacSha256;

var kdf_1 = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });


function sha512(data) {
    return naclFast.hash(data);
}
exports.sha512 = sha512;
function hmac(digest, blockSize, key, message) {
    if (key.byteLength > blockSize) {
        key = digest(key);
    }
    if (key.byteLength < blockSize) {
        const k = key;
        key = new Uint8Array(blockSize);
        key.set(k, 0);
    }
    const okp = new Uint8Array(blockSize);
    const ikp = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i++) {
        ikp[i] = key[i] ^ 0x36;
        okp[i] = key[i] ^ 0x5c;
    }
    const b1 = new Uint8Array(blockSize + message.byteLength);
    b1.set(ikp, 0);
    b1.set(message, blockSize);
    const h0 = digest(b1);
    const b2 = new Uint8Array(blockSize + h0.length);
    b2.set(okp, 0);
    b2.set(h0, blockSize);
    return digest(b2);
}
exports.hmac = hmac;
function hmacSha512(key, message) {
    return hmac(sha512, 128, key, message);
}
exports.hmacSha512 = hmacSha512;
function hmacSha256(key, message) {
    return hmac(sha256_1.sha256, 64, key, message);
}
exports.hmacSha256 = hmacSha256;
function kdf(outputLength, ikm, salt, info) {
    // extract
    const prk = hmacSha512(salt, ikm);
    // expand
    const N = Math.ceil(outputLength / 32);
    const output = new Uint8Array(N * 32);
    for (let i = 0; i < N; i++) {
        let buf;
        if (i == 0) {
            buf = new Uint8Array(info.byteLength + 1);
            buf.set(info, 0);
        }
        else {
            buf = new Uint8Array(info.byteLength + 1 + 32);
            for (let j = 0; j < 32; j++) {
                buf[j] = output[(i - 1) * 32 + j];
            }
            buf.set(info, 32);
        }
        buf[buf.length - 1] = i + 1;
        const chunk = hmacSha256(prk, buf);
        output.set(chunk, i * 32);
    }
    return output.slice(0, outputLength);
}
exports.kdf = kdf;

});

unwrapExports(kdf_1);
var kdf_2 = kdf_1.sha512;
var kdf_3 = kdf_1.hmac;
var kdf_4 = kdf_1.hmacSha512;
var kdf_5 = kdf_1.hmacSha256;
var kdf_6 = kdf_1.kdf;

var talerCrypto = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Native implementation of GNU Taler crypto.
 */

const big_integer_1 = __importDefault(BigInteger);

function getRandomBytes(n) {
    return naclFast.randomBytes(n);
}
exports.getRandomBytes = getRandomBytes;
const encTable = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
class EncodingError extends Error {
    constructor() {
        super("Encoding error");
        Object.setPrototypeOf(this, EncodingError.prototype);
    }
}
function getValue(chr) {
    let a = chr;
    switch (chr) {
        case "O":
        case "o":
            a = "0;";
            break;
        case "i":
        case "I":
        case "l":
        case "L":
            a = "1";
            break;
        case "u":
        case "U":
            a = "V";
    }
    if (a >= "0" && a <= "9") {
        return a.charCodeAt(0) - "0".charCodeAt(0);
    }
    if (a >= "a" && a <= "z")
        a = a.toUpperCase();
    let dec = 0;
    if (a >= "A" && a <= "Z") {
        if ("I" < a)
            dec++;
        if ("L" < a)
            dec++;
        if ("O" < a)
            dec++;
        if ("U" < a)
            dec++;
        return a.charCodeAt(0) - "A".charCodeAt(0) + 10 - dec;
    }
    throw new EncodingError();
}
function encodeCrock(data) {
    const dataBytes = new Uint8Array(data);
    let sb = "";
    const size = data.byteLength;
    let bitBuf = 0;
    let numBits = 0;
    let pos = 0;
    while (pos < size || numBits > 0) {
        if (pos < size && numBits < 5) {
            const d = dataBytes[pos++];
            bitBuf = (bitBuf << 8) | d;
            numBits += 8;
        }
        if (numBits < 5) {
            // zero-padding
            bitBuf = bitBuf << (5 - numBits);
            numBits = 5;
        }
        const v = (bitBuf >>> (numBits - 5)) & 31;
        sb += encTable[v];
        numBits -= 5;
    }
    return sb;
}
exports.encodeCrock = encodeCrock;
function decodeCrock(encoded) {
    const size = encoded.length;
    let bitpos = 0;
    let bitbuf = 0;
    let readPosition = 0;
    const outLen = Math.floor((size * 5) / 8);
    const out = new Uint8Array(outLen);
    let outPos = 0;
    while (readPosition < size || bitpos > 0) {
        if (readPosition < size) {
            const v = getValue(encoded[readPosition++]);
            bitbuf = (bitbuf << 5) | v;
            bitpos += 5;
        }
        while (bitpos >= 8) {
            const d = (bitbuf >>> (bitpos - 8)) & 0xff;
            out[outPos++] = d;
            bitpos -= 8;
        }
        if (readPosition == size && bitpos > 0) {
            bitbuf = (bitbuf << (8 - bitpos)) & 0xff;
            bitpos = bitbuf == 0 ? 0 : 8;
        }
    }
    return out;
}
exports.decodeCrock = decodeCrock;
function eddsaGetPublic(eddsaPriv) {
    const pair = naclFast.sign_keyPair_fromSeed(eddsaPriv);
    return pair.publicKey;
}
exports.eddsaGetPublic = eddsaGetPublic;
function ecdheGetPublic(ecdhePriv) {
    return naclFast.scalarMult_base(ecdhePriv);
}
exports.ecdheGetPublic = ecdheGetPublic;
function keyExchangeEddsaEcdhe(eddsaPriv, ecdhePub) {
    const ph = naclFast.hash(eddsaPriv);
    const a = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
        a[i] = ph[i];
    }
    const x = naclFast.scalarMult(a, ecdhePub);
    return naclFast.hash(x);
}
exports.keyExchangeEddsaEcdhe = keyExchangeEddsaEcdhe;
function keyExchangeEcdheEddsa(ecdhePriv, eddsaPub) {
    const curve25519Pub = naclFast.sign_ed25519_pk_to_curve25519(eddsaPub);
    const x = naclFast.scalarMult(ecdhePriv, curve25519Pub);
    return naclFast.hash(x);
}
exports.keyExchangeEcdheEddsa = keyExchangeEcdheEddsa;
/**
 * KDF modulo a big integer.
 */
function kdfMod(n, ikm, salt, info) {
    const nbits = n.bitLength().toJSNumber();
    const buflen = Math.floor((nbits - 1) / 8 + 1);
    const mask = (1 << (8 - (buflen * 8 - nbits))) - 1;
    let counter = 0;
    while (true) {
        const ctx = new Uint8Array(info.byteLength + 2);
        ctx.set(info, 0);
        ctx[ctx.length - 2] = (counter >>> 8) & 0xff;
        ctx[ctx.length - 1] = counter & 0xff;
        const buf = kdf_1.kdf(buflen, ikm, salt, ctx);
        const arr = Array.from(buf);
        arr[0] = arr[0] & mask;
        const r = big_integer_1.default.fromArray(arr, 256, false);
        if (r.lt(n)) {
            return r;
        }
        counter++;
    }
}
function stringToBytes(s) {
    const te = new TextEncoder();
    return te.encode(s);
}
exports.stringToBytes = stringToBytes;
function loadBigInt(arr) {
    return big_integer_1.default.fromArray(Array.from(arr), 256, false);
}
function rsaBlindingKeyDerive(rsaPub, bks) {
    const salt = stringToBytes("Blinding KDF extrator HMAC key");
    const info = stringToBytes("Blinding KDF");
    return kdfMod(rsaPub.N, bks, salt, info);
}
/*
 * Test for malicious RSA key.
 *
 * Assuming n is an RSA modulous and r is generated using a call to
 * GNUNET_CRYPTO_kdf_mod_mpi, if gcd(r,n) != 1 then n must be a
 * malicious RSA key designed to deanomize the user.
 *
 * @param r KDF result
 * @param n RSA modulus of the public key
 */
function rsaGcdValidate(r, n) {
    const t = big_integer_1.default.gcd(r, n);
    if (!t.equals(big_integer_1.default.one)) {
        throw Error("malicious RSA public key");
    }
}
function rsaFullDomainHash(hm, rsaPub) {
    const info = stringToBytes("RSA-FDA FTpsW!");
    const salt = rsaPubEncode(rsaPub);
    const r = kdfMod(rsaPub.N, hm, salt, info);
    rsaGcdValidate(r, rsaPub.N);
    return r;
}
function rsaPubDecode(rsaPub) {
    const modulusLength = (rsaPub[0] << 8) | rsaPub[1];
    const exponentLength = (rsaPub[2] << 8) | rsaPub[3];
    if (4 + exponentLength + modulusLength != rsaPub.length) {
        throw Error("invalid RSA public key (format wrong)");
    }
    const modulus = rsaPub.slice(4, 4 + modulusLength);
    const exponent = rsaPub.slice(4 + modulusLength, 4 + modulusLength + exponentLength);
    const res = {
        N: loadBigInt(modulus),
        e: loadBigInt(exponent),
    };
    return res;
}
function rsaPubEncode(rsaPub) {
    const mb = rsaPub.N.toArray(256).value;
    const eb = rsaPub.e.toArray(256).value;
    const out = new Uint8Array(4 + mb.length + eb.length);
    out[0] = (mb.length >>> 8) & 0xff;
    out[1] = mb.length & 0xff;
    out[2] = (eb.length >>> 8) & 0xff;
    out[3] = eb.length & 0xff;
    out.set(mb, 4);
    out.set(eb, 4 + mb.length);
    return out;
}
function rsaBlind(hm, bks, rsaPubEnc) {
    const rsaPub = rsaPubDecode(rsaPubEnc);
    const data = rsaFullDomainHash(hm, rsaPub);
    const r = rsaBlindingKeyDerive(rsaPub, bks);
    const r_e = r.modPow(rsaPub.e, rsaPub.N);
    const bm = r_e.multiply(data).mod(rsaPub.N);
    return new Uint8Array(bm.toArray(256).value);
}
exports.rsaBlind = rsaBlind;
function rsaUnblind(sig, rsaPubEnc, bks) {
    const rsaPub = rsaPubDecode(rsaPubEnc);
    const blinded_s = loadBigInt(sig);
    const r = rsaBlindingKeyDerive(rsaPub, bks);
    const r_inv = r.modInv(rsaPub.N);
    const s = blinded_s.multiply(r_inv).mod(rsaPub.N);
    return new Uint8Array(s.toArray(256).value);
}
exports.rsaUnblind = rsaUnblind;
function rsaVerify(hm, rsaSig, rsaPubEnc) {
    const rsaPub = rsaPubDecode(rsaPubEnc);
    const d = rsaFullDomainHash(hm, rsaPub);
    const sig = loadBigInt(rsaSig);
    const sig_e = sig.modPow(rsaPub.e, rsaPub.N);
    return sig_e.equals(d);
}
exports.rsaVerify = rsaVerify;
function createEddsaKeyPair() {
    const eddsaPriv = naclFast.randomBytes(32);
    const eddsaPub = eddsaGetPublic(eddsaPriv);
    return { eddsaPriv, eddsaPub };
}
exports.createEddsaKeyPair = createEddsaKeyPair;
function createEcdheKeyPair() {
    const ecdhePriv = naclFast.randomBytes(32);
    const ecdhePub = ecdheGetPublic(ecdhePriv);
    return { ecdhePriv, ecdhePub };
}
exports.createEcdheKeyPair = createEcdheKeyPair;
function createBlindingKeySecret() {
    return naclFast.randomBytes(32);
}
exports.createBlindingKeySecret = createBlindingKeySecret;
function hash(d) {
    return naclFast.hash(d);
}
exports.hash = hash;
function eddsaSign(msg, eddsaPriv) {
    const pair = naclFast.sign_keyPair_fromSeed(eddsaPriv);
    return naclFast.sign_detached(msg, pair.secretKey);
}
exports.eddsaSign = eddsaSign;
function eddsaVerify(msg, sig, eddsaPub) {
    return naclFast.sign_detached_verify(msg, sig, eddsaPub);
}
exports.eddsaVerify = eddsaVerify;
function createHashContext() {
    return new naclFast.HashState();
}
exports.createHashContext = createHashContext;
function setupRefreshPlanchet(secretSeed, coinNumber) {
    const info = stringToBytes("taler-coin-derivation");
    const saltArrBuf = new ArrayBuffer(4);
    const salt = new Uint8Array(saltArrBuf);
    const saltDataView = new DataView(saltArrBuf);
    saltDataView.setUint32(0, coinNumber);
    const out = kdf_1.kdf(64, secretSeed, salt, info);
    const coinPriv = out.slice(0, 32);
    const bks = out.slice(32, 64);
    return {
        bks,
        coinPriv,
        coinPub: eddsaGetPublic(coinPriv),
    };
}
exports.setupRefreshPlanchet = setupRefreshPlanchet;

});

unwrapExports(talerCrypto);
var talerCrypto_1 = talerCrypto.getRandomBytes;
var talerCrypto_2 = talerCrypto.encodeCrock;
var talerCrypto_3 = talerCrypto.decodeCrock;
var talerCrypto_4 = talerCrypto.eddsaGetPublic;
var talerCrypto_5 = talerCrypto.ecdheGetPublic;
var talerCrypto_6 = talerCrypto.keyExchangeEddsaEcdhe;
var talerCrypto_7 = talerCrypto.keyExchangeEcdheEddsa;
var talerCrypto_8 = talerCrypto.stringToBytes;
var talerCrypto_9 = talerCrypto.rsaBlind;
var talerCrypto_10 = talerCrypto.rsaUnblind;
var talerCrypto_11 = talerCrypto.rsaVerify;
var talerCrypto_12 = talerCrypto.createEddsaKeyPair;
var talerCrypto_13 = talerCrypto.createEcdheKeyPair;
var talerCrypto_14 = talerCrypto.createBlindingKeySecret;
var talerCrypto_15 = talerCrypto.hash;
var talerCrypto_16 = talerCrypto.eddsaSign;
var talerCrypto_17 = talerCrypto.eddsaVerify;
var talerCrypto_18 = talerCrypto.createHashContext;
var talerCrypto_19 = talerCrypto.setupRefreshPlanchet;

var reserves = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });





const Amounts = __importStar(amounts);







const logger = new logging.Logger("reserves.ts");
/**
 * Create a reserve, but do not flag it as confirmed yet.
 *
 * Adds the corresponding exchange as a trusted exchange if it is neither
 * audited nor trusted already.
 */
function createReserve(ws, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const keypair = yield ws.cryptoApi.createEddsaKeypair();
        const now = walletTypes.getTimestampNow();
        const canonExchange = helpers.canonicalizeBaseUrl(req.exchange);
        let reserveStatus;
        if (req.bankWithdrawStatusUrl) {
            reserveStatus = dbTypes.ReserveRecordStatus.REGISTERING_BANK;
        }
        else {
            reserveStatus = dbTypes.ReserveRecordStatus.UNCONFIRMED;
        }
        const currency = req.amount.currency;
        const reserveRecord = {
            created: now,
            withdrawAllocatedAmount: Amounts.getZero(currency),
            withdrawCompletedAmount: Amounts.getZero(currency),
            withdrawRemainingAmount: Amounts.getZero(currency),
            exchangeBaseUrl: canonExchange,
            hasPayback: false,
            initiallyRequestedAmount: req.amount,
            reservePriv: keypair.priv,
            reservePub: keypair.pub,
            senderWire: req.senderWire,
            timestampConfirmed: undefined,
            timestampReserveInfoPosted: undefined,
            bankWithdrawStatusUrl: req.bankWithdrawStatusUrl,
            exchangeWire: req.exchangeWire,
            reserveStatus,
            lastStatusQuery: undefined,
        };
        const senderWire = req.senderWire;
        if (senderWire) {
            const rec = {
                paytoUri: senderWire,
            };
            yield query.oneShotPut(ws.db, dbTypes.Stores.senderWires, rec);
        }
        const exchangeInfo = yield exchanges.updateExchangeFromUrl(ws, req.exchange);
        const exchangeDetails = exchangeInfo.details;
        if (!exchangeDetails) {
            console.log(exchangeDetails);
            throw Error("exchange not updated");
        }
        const { isAudited, isTrusted } = yield exchanges.getExchangeTrust(ws, exchangeInfo);
        let currencyRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.currencies, exchangeDetails.currency);
        if (!currencyRecord) {
            currencyRecord = {
                auditors: [],
                exchanges: [],
                fractionalDigits: 2,
                name: exchangeDetails.currency,
            };
        }
        if (!isAudited && !isTrusted) {
            currencyRecord.exchanges.push({
                baseUrl: req.exchange,
                exchangePub: exchangeDetails.masterPublicKey,
            });
        }
        const cr = currencyRecord;
        const resp = yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.currencies, dbTypes.Stores.reserves, dbTypes.Stores.bankWithdrawUris], (tx) => __awaiter(this, void 0, void 0, function* () {
            // Check if we have already created a reserve for that bankWithdrawStatusUrl
            if (reserveRecord.bankWithdrawStatusUrl) {
                const bwi = yield tx.get(dbTypes.Stores.bankWithdrawUris, reserveRecord.bankWithdrawStatusUrl);
                if (bwi) {
                    const otherReserve = yield tx.get(dbTypes.Stores.reserves, bwi.reservePub);
                    if (otherReserve) {
                        logger.trace("returning existing reserve for bankWithdrawStatusUri");
                        return {
                            exchange: otherReserve.exchangeBaseUrl,
                            reservePub: otherReserve.reservePub,
                        };
                    }
                }
                yield tx.put(dbTypes.Stores.bankWithdrawUris, {
                    reservePub: reserveRecord.reservePub,
                    talerWithdrawUri: reserveRecord.bankWithdrawStatusUrl,
                });
            }
            yield tx.put(dbTypes.Stores.currencies, cr);
            yield tx.put(dbTypes.Stores.reserves, reserveRecord);
            const r = {
                exchange: canonExchange,
                reservePub: keypair.pub,
            };
            return r;
        }));
        // Asynchronously process the reserve, but return
        // to the caller already.
        processReserve(ws, resp.reservePub).catch(e => {
            console.error("Processing reserve failed:", e);
        });
        return resp;
    });
}
exports.createReserve = createReserve;
/**
 * First fetch information requred to withdraw from the reserve,
 * then deplete the reserve, withdrawing coins until it is empty.
 *
 * The returned promise resolves once the reserve is set to the
 * state DORMANT.
 */
function processReserve(ws, reservePub) {
    return __awaiter(this, void 0, void 0, function* () {
        const p = ws.memoProcessReserve.find(reservePub);
        if (p) {
            return p;
        }
        else {
            return ws.memoProcessReserve.put(reservePub, processReserveImpl(ws, reservePub));
        }
    });
}
exports.processReserve = processReserve;
function registerReserveWithBank(ws, reservePub) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        switch ((_a = reserve) === null || _a === void 0 ? void 0 : _a.reserveStatus) {
            case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
            case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                break;
            default:
                return;
        }
        const bankStatusUrl = reserve.bankWithdrawStatusUrl;
        if (!bankStatusUrl) {
            return;
        }
        console.log("making selection");
        if (reserve.timestampReserveInfoPosted) {
            throw Error("bank claims that reserve info selection is not done");
        }
        const bankResp = yield ws.http.postJson(bankStatusUrl, {
            reserve_pub: reservePub,
            selected_exchange: reserve.exchangeWire,
        });
        console.log("got response", bankResp);
        yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, reservePub, r => {
            switch (r.reserveStatus) {
                case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
                    break;
                default:
                    return;
            }
            r.timestampReserveInfoPosted = walletTypes.getTimestampNow();
            r.reserveStatus = dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK;
            return r;
        });
        return processReserveBankStatus(ws, reservePub);
    });
}
function processReserveBankStatus(ws, reservePub) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        let reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        switch ((_a = reserve) === null || _a === void 0 ? void 0 : _a.reserveStatus) {
            case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
            case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                break;
            default:
                return;
        }
        const bankStatusUrl = reserve.bankWithdrawStatusUrl;
        if (!bankStatusUrl) {
            return;
        }
        let status;
        try {
            const statusResp = yield ws.http.get(bankStatusUrl);
            status = talerTypes.WithdrawOperationStatusResponse.checked(statusResp.responseJson);
        }
        catch (e) {
            throw e;
        }
        if (status.selection_done) {
            if (reserve.reserveStatus === dbTypes.ReserveRecordStatus.REGISTERING_BANK) {
                yield registerReserveWithBank(ws, reservePub);
                return yield processReserveBankStatus(ws, reservePub);
            }
        }
        else {
            yield registerReserveWithBank(ws, reservePub);
            return yield processReserveBankStatus(ws, reservePub);
        }
        if (status.transfer_done) {
            yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, reservePub, r => {
                switch (r.reserveStatus) {
                    case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                    case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
                        break;
                    default:
                        return;
                }
                const now = walletTypes.getTimestampNow();
                r.timestampConfirmed = now;
                r.reserveStatus = dbTypes.ReserveRecordStatus.QUERYING_STATUS;
                return r;
            });
            yield processReserveImpl(ws, reservePub);
        }
        else {
            yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, reservePub, r => {
                switch (r.reserveStatus) {
                    case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
                        break;
                    default:
                        return;
                }
                r.bankWithdrawConfirmUrl = status.confirm_transfer_url;
                return r;
            });
        }
    });
}
exports.processReserveBankStatus = processReserveBankStatus;
function setReserveError(ws, reservePub, err) {
    return __awaiter(this, void 0, void 0, function* () {
        const mut = (reserve) => {
            reserve.lastError = err;
            return reserve;
        };
        yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, reservePub, mut);
    });
}
/**
 * Update the information about a reserve that is stored in the wallet
 * by quering the reserve's exchange.
 */
function updateReserve(ws, reservePub) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        if (!reserve) {
            throw Error("reserve not in db");
        }
        if (reserve.timestampConfirmed === undefined) {
            throw Error("reserve not confirmed yet");
        }
        if (reserve.reserveStatus !== dbTypes.ReserveRecordStatus.QUERYING_STATUS) {
            return;
        }
        const reqUrl = new URL("reserve/status", reserve.exchangeBaseUrl);
        reqUrl.searchParams.set("reserve_pub", reservePub);
        let resp;
        try {
            resp = yield ws.http.get(reqUrl.href);
        }
        catch (e) {
            if (((_a = e.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                const m = "The exchange does not know about this reserve (yet).";
                yield setReserveError(ws, reservePub, {
                    type: "waiting",
                    details: {},
                    message: "The exchange does not know about this reserve (yet).",
                });
                throw new wallet.OperationFailedAndReportedError(m);
            }
            else {
                const m = e.message;
                yield setReserveError(ws, reservePub, {
                    type: "network",
                    details: {},
                    message: m,
                });
                throw new wallet.OperationFailedAndReportedError(m);
            }
        }
        const reserveInfo = talerTypes.ReserveStatus.checked(resp.responseJson);
        const balance = Amounts.parseOrThrow(reserveInfo.balance);
        yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, reserve.reservePub, r => {
            if (r.reserveStatus !== dbTypes.ReserveRecordStatus.QUERYING_STATUS) {
                return;
            }
            // FIXME: check / compare history!
            if (!r.lastStatusQuery) {
                // FIXME: check if this matches initial expectations
                r.withdrawRemainingAmount = balance;
            }
            else {
                const expectedBalance = Amounts.sub(r.withdrawAllocatedAmount, r.withdrawCompletedAmount);
                const cmp = Amounts.cmp(balance, expectedBalance.amount);
                if (cmp == 0) {
                    // Nothing changed.
                    return;
                }
                if (cmp > 0) {
                    const extra = Amounts.sub(balance, expectedBalance.amount).amount;
                    r.withdrawRemainingAmount = Amounts.add(r.withdrawRemainingAmount, extra).amount;
                }
            }
            r.lastStatusQuery = walletTypes.getTimestampNow();
            r.reserveStatus = dbTypes.ReserveRecordStatus.WITHDRAWING;
            return r;
        });
        ws.notifier.notify();
    });
}
function processReserveImpl(ws, reservePub) {
    return __awaiter(this, void 0, void 0, function* () {
        const reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        if (!reserve) {
            console.log("not processing reserve: reserve does not exist");
            return;
        }
        logger.trace(`Processing reserve ${reservePub} with status ${reserve.reserveStatus}`);
        switch (reserve.reserveStatus) {
            case dbTypes.ReserveRecordStatus.UNCONFIRMED:
                // nothing to do
                break;
            case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                yield processReserveBankStatus(ws, reservePub);
                return processReserveImpl(ws, reservePub);
            case dbTypes.ReserveRecordStatus.QUERYING_STATUS:
                yield updateReserve(ws, reservePub);
                return processReserveImpl(ws, reservePub);
            case dbTypes.ReserveRecordStatus.WITHDRAWING:
                yield depleteReserve(ws, reservePub);
                break;
            case dbTypes.ReserveRecordStatus.DORMANT:
                // nothing to do
                break;
            case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
                yield processReserveBankStatus(ws, reservePub);
                break;
            default:
                console.warn("unknown reserve record status:", reserve.reserveStatus);
                assertUnreachable_1.assertUnreachable(reserve.reserveStatus);
                break;
        }
    });
}
function confirmReserve(ws, req) {
    return __awaiter(this, void 0, void 0, function* () {
        const now = walletTypes.getTimestampNow();
        yield query.oneShotMutate(ws.db, dbTypes.Stores.reserves, req.reservePub, reserve => {
            if (reserve.reserveStatus !== dbTypes.ReserveRecordStatus.UNCONFIRMED) {
                return;
            }
            reserve.timestampConfirmed = now;
            reserve.reserveStatus = dbTypes.ReserveRecordStatus.QUERYING_STATUS;
            return reserve;
        });
        ws.notifier.notify();
        processReserve(ws, req.reservePub).catch(e => {
            console.log("processing reserve failed:", e);
        });
    });
}
exports.confirmReserve = confirmReserve;
/**
 * Withdraw coins from a reserve until it is empty.
 *
 * When finished, marks the reserve as depleted by setting
 * the depleted timestamp.
 */
function depleteReserve(ws, reservePub) {
    return __awaiter(this, void 0, void 0, function* () {
        const reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        if (!reserve) {
            return;
        }
        if (reserve.reserveStatus !== dbTypes.ReserveRecordStatus.WITHDRAWING) {
            return;
        }
        logger.trace(`depleting reserve ${reservePub}`);
        const withdrawAmount = reserve.withdrawRemainingAmount;
        logger.trace(`getting denom list`);
        const denomsForWithdraw = yield withdraw.getVerifiedWithdrawDenomList(ws, reserve.exchangeBaseUrl, withdrawAmount);
        logger.trace(`got denom list`);
        if (denomsForWithdraw.length === 0) {
            const m = `Unable to withdraw from reserve, no denominations are available to withdraw.`;
            yield setReserveError(ws, reserve.reservePub, {
                type: "internal",
                message: m,
                details: {},
            });
            console.log(m);
            throw new wallet.OperationFailedAndReportedError(m);
        }
        logger.trace("selected denominations");
        const withdrawalSessionId = talerCrypto.encodeCrock(naclFast.randomBytes(32));
        const totalCoinValue = Amounts.sum(denomsForWithdraw.map(x => x.value)).amount;
        const withdrawalRecord = {
            withdrawSessionId: withdrawalSessionId,
            exchangeBaseUrl: reserve.exchangeBaseUrl,
            source: {
                type: "reserve",
                reservePub: reserve.reservePub,
            },
            rawWithdrawalAmount: withdrawAmount,
            startTimestamp: walletTypes.getTimestampNow(),
            denoms: denomsForWithdraw.map(x => x.denomPub),
            withdrawn: denomsForWithdraw.map(x => false),
            planchets: denomsForWithdraw.map(x => undefined),
            totalCoinValue,
        };
        const totalCoinWithdrawFee = Amounts.sum(denomsForWithdraw.map(x => x.feeWithdraw)).amount;
        const totalWithdrawAmount = Amounts.add(totalCoinValue, totalCoinWithdrawFee)
            .amount;
        function mutateReserve(r) {
            const remaining = Amounts.sub(r.withdrawRemainingAmount, totalWithdrawAmount);
            if (remaining.saturated) {
                console.error("can't create planchets, saturated");
                throw query.TransactionAbort;
            }
            const allocated = Amounts.add(r.withdrawAllocatedAmount, totalWithdrawAmount);
            if (allocated.saturated) {
                console.error("can't create planchets, saturated");
                throw query.TransactionAbort;
            }
            r.withdrawRemainingAmount = remaining.amount;
            r.withdrawAllocatedAmount = allocated.amount;
            r.reserveStatus = dbTypes.ReserveRecordStatus.DORMANT;
            return r;
        }
        const success = yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.withdrawalSession, dbTypes.Stores.reserves], (tx) => __awaiter(this, void 0, void 0, function* () {
            const myReserve = yield tx.get(dbTypes.Stores.reserves, reservePub);
            if (!myReserve) {
                return false;
            }
            if (myReserve.reserveStatus !== dbTypes.ReserveRecordStatus.WITHDRAWING) {
                return false;
            }
            yield tx.mutate(dbTypes.Stores.reserves, reserve.reservePub, mutateReserve);
            yield tx.put(dbTypes.Stores.withdrawalSession, withdrawalRecord);
            return true;
        }));
        if (success) {
            console.log("processing new withdraw session");
            yield withdraw.processWithdrawSession(ws, withdrawalSessionId);
        }
        else {
            console.trace("withdraw session already existed");
        }
    });
}

});

unwrapExports(reserves);
var reserves_1 = reserves.createReserve;
var reserves_2 = reserves.processReserve;
var reserves_3 = reserves.processReserveBankStatus;
var reserves_4 = reserves.confirmReserve;

var libtoolVersion = createCommonjsModule(function (module, exports) {
/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Compare two libtool-style version strings.
 */
function compare(me, other) {
    const meVer = parseVersion(me);
    const otherVer = parseVersion(other);
    if (!(meVer && otherVer)) {
        return undefined;
    }
    const compatible = (meVer.current - meVer.age <= otherVer.current &&
        meVer.current >= (otherVer.current - otherVer.age));
    const currentCmp = Math.sign(meVer.current - otherVer.current);
    return { compatible, currentCmp };
}
exports.compare = compare;
function parseVersion(v) {
    const [currentStr, revisionStr, ageStr, ...rest] = v.split(":");
    if (rest.length !== 0) {
        return undefined;
    }
    const current = Number.parseInt(currentStr);
    const revision = Number.parseInt(revisionStr);
    const age = Number.parseInt(ageStr);
    if (Number.isNaN(current)) {
        return undefined;
    }
    if (Number.isNaN(revision)) {
        return undefined;
    }
    if (Number.isNaN(age)) {
        return undefined;
    }
    return { current, revision, age };
}

});

unwrapExports(libtoolVersion);
var libtoolVersion_1 = libtoolVersion.compare;

var withdraw = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });

const Amounts = __importStar(amounts);








const LibtoolVersion = __importStar(libtoolVersion);
const logger = new logging.Logger("withdraw.ts");
function isWithdrawableDenom(d) {
    const now = walletTypes.getTimestampNow();
    const started = now.t_ms >= d.stampStart.t_ms;
    const stillOkay = d.stampExpireWithdraw.t_ms + 60 * 1000 > now.t_ms;
    return started && stillOkay;
}
/**
 * Get a list of denominations (with repetitions possible)
 * whose total value is as close as possible to the available
 * amount, but never larger.
 */
function getWithdrawDenomList(amountAvailable, denoms) {
    let remaining = Amounts.copy(amountAvailable);
    const ds = [];
    denoms = denoms.filter(isWithdrawableDenom);
    denoms.sort((d1, d2) => Amounts.cmp(d2.value, d1.value));
    // This is an arbitrary number of coins
    // we can withdraw in one go.  It's not clear if this limit
    // is useful ...
    for (let i = 0; i < 1000; i++) {
        let found = false;
        for (const d of denoms) {
            const cost = Amounts.add(d.value, d.feeWithdraw).amount;
            if (Amounts.cmp(remaining, cost) < 0) {
                continue;
            }
            found = true;
            remaining = Amounts.sub(remaining, cost).amount;
            ds.push(d);
            break;
        }
        if (!found) {
            break;
        }
    }
    return ds;
}
exports.getWithdrawDenomList = getWithdrawDenomList;
/**
 * Get information about a withdrawal from
 * a taler://withdraw URI.
 */
function getWithdrawalInfo(ws, talerWithdrawUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const uriResult = taleruri.parseWithdrawUri(talerWithdrawUri);
        if (!uriResult) {
            throw Error("can't parse URL");
        }
        const resp = yield ws.http.get(uriResult.statusUrl);
        console.log("resp:", resp.responseJson);
        const status = talerTypes.WithdrawOperationStatusResponse.checked(resp.responseJson);
        return {
            amount: Amounts.parseOrThrow(status.amount),
            confirmTransferUrl: status.confirm_transfer_url,
            extractedStatusUrl: uriResult.statusUrl,
            selectionDone: status.selection_done,
            senderWire: status.sender_wire,
            suggestedExchange: status.suggested_exchange,
            transferDone: status.transfer_done,
            wireTypes: status.wire_types,
        };
    });
}
exports.getWithdrawalInfo = getWithdrawalInfo;
function acceptWithdrawal(ws, talerWithdrawUri, selectedExchange) {
    return __awaiter(this, void 0, void 0, function* () {
        const withdrawInfo = yield getWithdrawalInfo(ws, talerWithdrawUri);
        const exchangeWire = yield exchanges.getExchangePaytoUri(ws, selectedExchange, withdrawInfo.wireTypes);
        const reserve = yield reserves.createReserve(ws, {
            amount: withdrawInfo.amount,
            bankWithdrawStatusUrl: withdrawInfo.extractedStatusUrl,
            exchange: selectedExchange,
            senderWire: withdrawInfo.senderWire,
            exchangeWire: exchangeWire,
        });
        ws.badge.showNotification();
        ws.notifier.notify();
        // We do this here, as the reserve should be registered before we return,
        // so that we can redirect the user to the bank's status page.
        yield reserves.processReserveBankStatus(ws, reserve.reservePub);
        ws.notifier.notify();
        console.log("acceptWithdrawal: returning");
        return {
            reservePub: reserve.reservePub,
            confirmTransferUrl: withdrawInfo.confirmTransferUrl,
        };
    });
}
exports.acceptWithdrawal = acceptWithdrawal;
function getPossibleDenoms(ws, exchangeBaseUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, exchangeBaseUrl).filter(d => {
            return (d.status === dbTypes.DenominationStatus.Unverified ||
                d.status === dbTypes.DenominationStatus.VerifiedGood);
        });
    });
}
/**
 * Given a planchet, withdraw a coin from the exchange.
 */
function processPlanchet(ws, withdrawalSessionId, coinIdx) {
    return __awaiter(this, void 0, void 0, function* () {
        const withdrawalSession = yield query.oneShotGet(ws.db, dbTypes.Stores.withdrawalSession, withdrawalSessionId);
        if (!withdrawalSession) {
            return;
        }
        if (withdrawalSession.withdrawn[coinIdx]) {
            return;
        }
        if (withdrawalSession.source.type === "reserve") ;
        const planchet = withdrawalSession.planchets[coinIdx];
        if (!planchet) {
            console.log("processPlanchet: planchet not found");
            return;
        }
        const exchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, withdrawalSession.exchangeBaseUrl);
        if (!exchange) {
            console.error("db inconsistent: exchange for planchet not found");
            return;
        }
        const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
            withdrawalSession.exchangeBaseUrl,
            planchet.denomPub,
        ]);
        if (!denom) {
            console.error("db inconsistent: denom for planchet not found");
            return;
        }
        const wd = {};
        wd.denom_pub_hash = planchet.denomPubHash;
        wd.reserve_pub = planchet.reservePub;
        wd.reserve_sig = planchet.withdrawSig;
        wd.coin_ev = planchet.coinEv;
        const reqUrl = new URL("reserve/withdraw", exchange.baseUrl).href;
        const resp = yield ws.http.postJson(reqUrl, wd);
        const r = resp.responseJson;
        const denomSig = yield ws.cryptoApi.rsaUnblind(r.ev_sig, planchet.blindingKey, planchet.denomPub);
        const coin = {
            blindingKey: planchet.blindingKey,
            coinPriv: planchet.coinPriv,
            coinPub: planchet.coinPub,
            currentAmount: planchet.coinValue,
            denomPub: planchet.denomPub,
            denomPubHash: planchet.denomPubHash,
            denomSig,
            exchangeBaseUrl: withdrawalSession.exchangeBaseUrl,
            reservePub: planchet.reservePub,
            status: dbTypes.CoinStatus.Fresh,
            coinIndex: coinIdx,
            withdrawSessionId: withdrawalSessionId,
        };
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.withdrawalSession, dbTypes.Stores.reserves], (tx) => __awaiter(this, void 0, void 0, function* () {
            const ws = yield tx.get(dbTypes.Stores.withdrawalSession, withdrawalSessionId);
            if (!ws) {
                return;
            }
            if (ws.withdrawn[coinIdx]) {
                // Already withdrawn
                return;
            }
            ws.withdrawn[coinIdx] = true;
            yield tx.put(dbTypes.Stores.withdrawalSession, ws);
            if (!planchet.isFromTip) {
                const r = yield tx.get(dbTypes.Stores.reserves, planchet.reservePub);
                if (r) {
                    r.withdrawCompletedAmount = Amounts.add(r.withdrawCompletedAmount, Amounts.add(denom.value, denom.feeWithdraw).amount).amount;
                    yield tx.put(dbTypes.Stores.reserves, r);
                }
            }
            yield tx.add(dbTypes.Stores.coins, coin);
        }));
        ws.notifier.notify();
        logger.trace(`withdraw of one coin ${coin.coinPub} finished`);
    });
}
/**
 * Get a list of denominations to withdraw from the given exchange for the
 * given amount, making sure that all denominations' signatures are verified.
 *
 * Writes to the DB in order to record the result from verifying
 * denominations.
 */
function getVerifiedWithdrawDenomList(ws, exchangeBaseUrl, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const exchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, exchangeBaseUrl);
        if (!exchange) {
            console.log("exchange not found");
            throw Error(`exchange ${exchangeBaseUrl} not found`);
        }
        const exchangeDetails = exchange.details;
        if (!exchangeDetails) {
            console.log("exchange details not available");
            throw Error(`exchange ${exchangeBaseUrl} details not available`);
        }
        console.log("getting possible denoms");
        const possibleDenoms = yield getPossibleDenoms(ws, exchange.baseUrl);
        console.log("got possible denoms");
        let allValid = false;
        let selectedDenoms;
        do {
            allValid = true;
            selectedDenoms = getWithdrawDenomList(amount, possibleDenoms);
            console.log("got withdraw denom list");
            for (const denom of selectedDenoms || []) {
                if (denom.status === dbTypes.DenominationStatus.Unverified) {
                    console.log("checking validity", denom, exchangeDetails.masterPublicKey);
                    const valid = yield ws.cryptoApi.isValidDenom(denom, exchangeDetails.masterPublicKey);
                    console.log("done checking validity");
                    if (!valid) {
                        denom.status = dbTypes.DenominationStatus.VerifiedBad;
                        allValid = false;
                    }
                    else {
                        denom.status = dbTypes.DenominationStatus.VerifiedGood;
                    }
                    yield query.oneShotPut(ws.db, dbTypes.Stores.denominations, denom);
                }
            }
        } while (selectedDenoms.length > 0 && !allValid);
        console.log("returning denoms");
        return selectedDenoms;
    });
}
exports.getVerifiedWithdrawDenomList = getVerifiedWithdrawDenomList;
function makePlanchet(ws, withdrawalSessionId, coinIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        const withdrawalSession = yield query.oneShotGet(ws.db, dbTypes.Stores.withdrawalSession, withdrawalSessionId);
        if (!withdrawalSession) {
            return;
        }
        const src = withdrawalSession.source;
        if (src.type !== "reserve") {
            throw Error("invalid state");
        }
        const reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, src.reservePub);
        if (!reserve) {
            return;
        }
        const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
            withdrawalSession.exchangeBaseUrl,
            withdrawalSession.denoms[coinIndex],
        ]);
        if (!denom) {
            return;
        }
        const r = yield ws.cryptoApi.createPlanchet({
            denomPub: denom.denomPub,
            feeWithdraw: denom.feeWithdraw,
            reservePriv: reserve.reservePriv,
            reservePub: reserve.reservePub,
            value: denom.value,
        });
        const newPlanchet = {
            blindingKey: r.blindingKey,
            coinEv: r.coinEv,
            coinPriv: r.coinPriv,
            coinPub: r.coinPub,
            coinValue: r.coinValue,
            denomPub: r.denomPub,
            denomPubHash: r.denomPubHash,
            isFromTip: false,
            reservePub: r.reservePub,
            withdrawSig: r.withdrawSig,
        };
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.withdrawalSession], (tx) => __awaiter(this, void 0, void 0, function* () {
            const myWs = yield tx.get(dbTypes.Stores.withdrawalSession, withdrawalSessionId);
            if (!myWs) {
                return;
            }
            if (myWs.planchets[coinIndex]) {
                return;
            }
            myWs.planchets[coinIndex] = newPlanchet;
            yield tx.put(dbTypes.Stores.withdrawalSession, myWs);
        }));
    });
}
function processWithdrawCoin(ws, withdrawalSessionId, coinIndex) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.trace("starting withdraw for coin", coinIndex);
        const withdrawalSession = yield query.oneShotGet(ws.db, dbTypes.Stores.withdrawalSession, withdrawalSessionId);
        if (!withdrawalSession) {
            console.log("ws doesn't exist");
            return;
        }
        const coin = yield query.oneShotGetIndexed(ws.db, dbTypes.Stores.coins.byWithdrawalWithIdx, [withdrawalSessionId, coinIndex]);
        if (coin) {
            console.log("coin already exists");
            return;
        }
        if (!withdrawalSession.planchets[coinIndex]) {
            logger.trace("creating planchet for coin", coinIndex);
            const key = `${withdrawalSessionId}-${coinIndex}`;
            const p = ws.memoMakePlanchet.find(key);
            if (p) {
                yield p;
            }
            else {
                ws.memoMakePlanchet.put(key, makePlanchet(ws, withdrawalSessionId, coinIndex));
            }
            yield makePlanchet(ws, withdrawalSessionId, coinIndex);
            logger.trace("done creating planchet for coin", coinIndex);
        }
        yield processPlanchet(ws, withdrawalSessionId, coinIndex);
        logger.trace("starting withdraw for coin", coinIndex);
    });
}
function processWithdrawSession(ws, withdrawalSessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.trace("processing withdraw session", withdrawalSessionId);
        const withdrawalSession = yield query.oneShotGet(ws.db, dbTypes.Stores.withdrawalSession, withdrawalSessionId);
        if (!withdrawalSession) {
            logger.trace("withdraw session doesn't exist");
            return;
        }
        const ps = withdrawalSession.denoms.map((d, i) => processWithdrawCoin(ws, withdrawalSessionId, i));
        yield Promise.all(ps);
        ws.badge.showNotification();
        return;
    });
}
exports.processWithdrawSession = processWithdrawSession;
function getWithdrawDetailsForAmount(ws, baseUrl, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const exchangeInfo = yield exchanges.updateExchangeFromUrl(ws, baseUrl);
        const exchangeDetails = exchangeInfo.details;
        if (!exchangeDetails) {
            throw Error(`exchange ${exchangeInfo.baseUrl} details not available`);
        }
        const exchangeWireInfo = exchangeInfo.wireInfo;
        if (!exchangeWireInfo) {
            throw Error(`exchange ${exchangeInfo.baseUrl} wire details not available`);
        }
        const selectedDenoms = yield getVerifiedWithdrawDenomList(ws, baseUrl, amount);
        let acc = Amounts.getZero(amount.currency);
        for (const d of selectedDenoms) {
            acc = Amounts.add(acc, d.feeWithdraw).amount;
        }
        const actualCoinCost = selectedDenoms
            .map((d) => Amounts.add(d.value, d.feeWithdraw).amount)
            .reduce((a, b) => Amounts.add(a, b).amount);
        const exchangeWireAccounts = [];
        for (let account of exchangeWireInfo.accounts) {
            exchangeWireAccounts.push(account.url);
        }
        const { isTrusted, isAudited } = yield exchanges.getExchangeTrust(ws, exchangeInfo);
        let earliestDepositExpiration = selectedDenoms[0].stampExpireDeposit;
        for (let i = 1; i < selectedDenoms.length; i++) {
            const expireDeposit = selectedDenoms[i].stampExpireDeposit;
            if (expireDeposit.t_ms < earliestDepositExpiration.t_ms) {
                earliestDepositExpiration = expireDeposit;
            }
        }
        const possibleDenoms = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, baseUrl).filter(d => d.isOffered);
        const trustedAuditorPubs = [];
        const currencyRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.currencies, amount.currency);
        if (currencyRecord) {
            trustedAuditorPubs.push(...currencyRecord.auditors.map(a => a.auditorPub));
        }
        let versionMatch;
        if (exchangeDetails.protocolVersion) {
            versionMatch = LibtoolVersion.compare(wallet.WALLET_PROTOCOL_VERSION, exchangeDetails.protocolVersion);
            if (versionMatch &&
                !versionMatch.compatible &&
                versionMatch.currentCmp === -1) {
                console.warn(`wallet version ${wallet.WALLET_PROTOCOL_VERSION} might be outdated ` +
                    `(exchange has ${exchangeDetails.protocolVersion}), checking for updates`);
            }
        }
        const ret = {
            earliestDepositExpiration,
            exchangeInfo,
            exchangeWireAccounts,
            exchangeVersion: exchangeDetails.protocolVersion || "unknown",
            isAudited,
            isTrusted,
            numOfferedDenoms: possibleDenoms.length,
            overhead: Amounts.sub(amount, actualCoinCost).amount,
            selectedDenoms,
            trustedAuditorPubs,
            versionMatch,
            walletVersion: wallet.WALLET_PROTOCOL_VERSION,
            wireFees: exchangeWireInfo,
            withdrawFee: acc,
        };
        return ret;
    });
}
exports.getWithdrawDetailsForAmount = getWithdrawDetailsForAmount;
function getWithdrawDetailsForUri(ws, talerWithdrawUri, maybeSelectedExchange) {
    return __awaiter(this, void 0, void 0, function* () {
        const info = yield getWithdrawalInfo(ws, talerWithdrawUri);
        let rci = undefined;
        if (maybeSelectedExchange) {
            rci = yield getWithdrawDetailsForAmount(ws, maybeSelectedExchange, info.amount);
        }
        return {
            withdrawInfo: info,
            reserveCreationInfo: rci,
        };
    });
}
exports.getWithdrawDetailsForUri = getWithdrawDetailsForUri;

});

unwrapExports(withdraw);
var withdraw_1 = withdraw.getWithdrawDenomList;
var withdraw_2 = withdraw.getWithdrawalInfo;
var withdraw_3 = withdraw.acceptWithdrawal;
var withdraw_4 = withdraw.getVerifiedWithdrawDenomList;
var withdraw_5 = withdraw.processWithdrawSession;
var withdraw_6 = withdraw.getWithdrawDetailsForAmount;
var withdraw_7 = withdraw.getWithdrawDetailsForUri;

var refresh_1 = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const Amounts = __importStar(amounts);






const logger = new logging.Logger("refresh.ts");
/**
 * Get the amount that we lose when refreshing a coin of the given denomination
 * with a certain amount left.
 *
 * If the amount left is zero, then the refresh cost
 * is also considered to be zero.  If a refresh isn't possible (e.g. due to lack of
 * the right denominations), then the cost is the full amount left.
 *
 * Considers refresh fees, withdrawal fees after refresh and amounts too small
 * to refresh.
 */
function getTotalRefreshCost(denoms, refreshedDenom, amountLeft) {
    const withdrawAmount = Amounts.sub(amountLeft, refreshedDenom.feeRefresh)
        .amount;
    const withdrawDenoms = withdraw.getWithdrawDenomList(withdrawAmount, denoms);
    const resultingAmount = Amounts.add(Amounts.getZero(withdrawAmount.currency), ...withdrawDenoms.map(d => d.value)).amount;
    const totalCost = Amounts.sub(amountLeft, resultingAmount).amount;
    logger.trace("total refresh cost for", helpers.amountToPretty(amountLeft), "is", helpers.amountToPretty(totalCost));
    return totalCost;
}
exports.getTotalRefreshCost = getTotalRefreshCost;
function refreshMelt(ws, refreshSessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const refreshSession = yield query.oneShotGet(ws.db, dbTypes.Stores.refresh, refreshSessionId);
        if (!refreshSession) {
            return;
        }
        if (refreshSession.norevealIndex !== undefined) {
            return;
        }
        const coin = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, refreshSession.meltCoinPub);
        if (!coin) {
            console.error("can't melt coin, it does not exist");
            return;
        }
        const reqUrl = new URL("refresh/melt", refreshSession.exchangeBaseUrl);
        const meltReq = {
            coin_pub: coin.coinPub,
            confirm_sig: refreshSession.confirmSig,
            denom_pub_hash: coin.denomPubHash,
            denom_sig: coin.denomSig,
            rc: refreshSession.hash,
            value_with_fee: refreshSession.valueWithFee,
        };
        logger.trace("melt request:", meltReq);
        const resp = yield ws.http.postJson(reqUrl.href, meltReq);
        logger.trace("melt response:", resp.responseJson);
        if (resp.status !== 200) {
            console.error(resp.responseJson);
            throw Error("refresh failed");
        }
        const respJson = resp.responseJson;
        const norevealIndex = respJson.noreveal_index;
        if (typeof norevealIndex !== "number") {
            throw Error("invalid response");
        }
        refreshSession.norevealIndex = norevealIndex;
        yield query.oneShotMutate(ws.db, dbTypes.Stores.refresh, refreshSessionId, rs => {
            if (rs.norevealIndex !== undefined) {
                return;
            }
            if (rs.finished) {
                return;
            }
            rs.norevealIndex = norevealIndex;
            return rs;
        });
        ws.notifier.notify();
    });
}
function refreshReveal(ws, refreshSessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const refreshSession = yield query.oneShotGet(ws.db, dbTypes.Stores.refresh, refreshSessionId);
        if (!refreshSession) {
            return;
        }
        const norevealIndex = refreshSession.norevealIndex;
        if (norevealIndex === undefined) {
            throw Error("can't reveal without melting first");
        }
        const privs = Array.from(refreshSession.transferPrivs);
        privs.splice(norevealIndex, 1);
        const planchets = refreshSession.planchetsForGammas[norevealIndex];
        if (!planchets) {
            throw Error("refresh index error");
        }
        const meltCoinRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, refreshSession.meltCoinPub);
        if (!meltCoinRecord) {
            throw Error("inconsistent database");
        }
        const evs = planchets.map((x) => x.coinEv);
        const linkSigs = [];
        for (let i = 0; i < refreshSession.newDenoms.length; i++) {
            const linkSig = yield ws.cryptoApi.signCoinLink(meltCoinRecord.coinPriv, refreshSession.newDenomHashes[i], refreshSession.meltCoinPub, refreshSession.transferPubs[norevealIndex], planchets[i].coinEv);
            linkSigs.push(linkSig);
        }
        const req = {
            coin_evs: evs,
            new_denoms_h: refreshSession.newDenomHashes,
            rc: refreshSession.hash,
            transfer_privs: privs,
            transfer_pub: refreshSession.transferPubs[norevealIndex],
            link_sigs: linkSigs,
        };
        const reqUrl = new URL("refresh/reveal", refreshSession.exchangeBaseUrl);
        logger.trace("reveal request:", req);
        let resp;
        try {
            resp = yield ws.http.postJson(reqUrl.href, req);
        }
        catch (e) {
            console.error("got error during /refresh/reveal request");
            console.error(e);
            return;
        }
        logger.trace("session:", refreshSession);
        logger.trace("reveal response:", resp);
        if (resp.status !== 200) {
            console.error("error: /refresh/reveal returned status " + resp.status);
            return;
        }
        const respJson = resp.responseJson;
        if (!respJson.ev_sigs || !Array.isArray(respJson.ev_sigs)) {
            console.error("/refresh/reveal did not contain ev_sigs");
            return;
        }
        const exchange = query.oneShotGet(ws.db, dbTypes.Stores.exchanges, refreshSession.exchangeBaseUrl);
        if (!exchange) {
            console.error(`exchange ${refreshSession.exchangeBaseUrl} not found`);
            return;
        }
        const coins = [];
        for (let i = 0; i < respJson.ev_sigs.length; i++) {
            const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
                refreshSession.exchangeBaseUrl,
                refreshSession.newDenoms[i],
            ]);
            if (!denom) {
                console.error("denom not found");
                continue;
            }
            const pc = refreshSession.planchetsForGammas[refreshSession.norevealIndex][i];
            const denomSig = yield ws.cryptoApi.rsaUnblind(respJson.ev_sigs[i].ev_sig, pc.blindingKey, denom.denomPub);
            const coin = {
                blindingKey: pc.blindingKey,
                coinPriv: pc.privateKey,
                coinPub: pc.publicKey,
                currentAmount: denom.value,
                denomPub: denom.denomPub,
                denomPubHash: denom.denomPubHash,
                denomSig,
                exchangeBaseUrl: refreshSession.exchangeBaseUrl,
                reservePub: undefined,
                status: dbTypes.CoinStatus.Fresh,
                coinIndex: -1,
                withdrawSessionId: "",
            };
            coins.push(coin);
        }
        refreshSession.finished = true;
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.refresh], (tx) => __awaiter(this, void 0, void 0, function* () {
            const rs = yield tx.get(dbTypes.Stores.refresh, refreshSessionId);
            if (!rs) {
                return;
            }
            if (rs.finished) {
                return;
            }
            for (let coin of coins) {
                yield tx.put(dbTypes.Stores.coins, coin);
            }
            yield tx.put(dbTypes.Stores.refresh, refreshSession);
        }));
        ws.notifier.notify();
    });
}
function processRefreshSession(ws, refreshSessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const refreshSession = yield query.oneShotGet(ws.db, dbTypes.Stores.refresh, refreshSessionId);
        if (!refreshSession) {
            return;
        }
        if (refreshSession.finished) {
            return;
        }
        if (typeof refreshSession.norevealIndex !== "number") {
            yield refreshMelt(ws, refreshSession.refreshSessionId);
        }
        yield refreshReveal(ws, refreshSession.refreshSessionId);
        logger.trace("refresh finished");
    });
}
exports.processRefreshSession = processRefreshSession;
function refresh(ws, oldCoinPub, force = false) {
    return __awaiter(this, void 0, void 0, function* () {
        const coin = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, oldCoinPub);
        if (!coin) {
            console.warn("can't refresh, coin not in database");
            return;
        }
        switch (coin.status) {
            case dbTypes.CoinStatus.Dirty:
                break;
            case dbTypes.CoinStatus.Dormant:
                return;
            case dbTypes.CoinStatus.Fresh:
                if (!force) {
                    return;
                }
                break;
        }
        const exchange = yield exchanges.updateExchangeFromUrl(ws, coin.exchangeBaseUrl);
        if (!exchange) {
            throw Error("db inconsistent: exchange of coin not found");
        }
        const oldDenom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
            exchange.baseUrl,
            coin.denomPub,
        ]);
        if (!oldDenom) {
            throw Error("db inconsistent: denomination for coin not found");
        }
        const availableDenoms = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
        const availableAmount = Amounts.sub(coin.currentAmount, oldDenom.feeRefresh)
            .amount;
        const newCoinDenoms = withdraw.getWithdrawDenomList(availableAmount, availableDenoms);
        if (newCoinDenoms.length === 0) {
            logger.trace(`not refreshing, available amount ${helpers.amountToPretty(availableAmount)} too small`);
            yield query.oneShotMutate(ws.db, dbTypes.Stores.coins, oldCoinPub, x => {
                if (x.status != coin.status) {
                    // Concurrent modification?
                    return;
                }
                x.status = dbTypes.CoinStatus.Dormant;
                return x;
            });
            ws.notifier.notify();
            return;
        }
        const refreshSession = yield ws.cryptoApi.createRefreshSession(exchange.baseUrl, 3, coin, newCoinDenoms, oldDenom.feeRefresh);
        function mutateCoin(c) {
            const r = Amounts.sub(c.currentAmount, refreshSession.valueWithFee);
            if (r.saturated) {
                // Something else must have written the coin value
                throw query.TransactionAbort;
            }
            c.currentAmount = r.amount;
            c.status = dbTypes.CoinStatus.Dormant;
            return c;
        }
        // Store refresh session and subtract refreshed amount from
        // coin in the same transaction.
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.refresh, dbTypes.Stores.coins], (tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.put(dbTypes.Stores.refresh, refreshSession);
            yield tx.mutate(dbTypes.Stores.coins, coin.coinPub, mutateCoin);
        }));
        logger.info(`created refresh session ${refreshSession.refreshSessionId}`);
        ws.notifier.notify();
        yield processRefreshSession(ws, refreshSession.refreshSessionId);
    });
}
exports.refresh = refresh;

});

unwrapExports(refresh_1);
var refresh_2 = refresh_1.getTotalRefreshCost;
var refresh_3 = refresh_1.processRefreshSession;
var refresh_4 = refresh_1.refresh;

var pay = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });




const Amounts = __importStar(amounts);





const logger = new logging.Logger("pay.ts");
/**
 * Select coins for a payment under the merchant's constraints.
 *
 * @param denoms all available denoms, used to compute refresh fees
 */
function selectPayCoins(denoms, cds, paymentAmount, depositFeeLimit) {
    if (cds.length === 0) {
        return undefined;
    }
    // Sort by ascending deposit fee and denomPub if deposit fee is the same
    // (to guarantee deterministic results)
    cds.sort((o1, o2) => Amounts.cmp(o1.denom.feeDeposit, o2.denom.feeDeposit) ||
        helpers.strcmp(o1.denom.denomPub, o2.denom.denomPub));
    const currency = cds[0].denom.value.currency;
    const cdsResult = [];
    let accDepositFee = Amounts.getZero(currency);
    let accAmount = Amounts.getZero(currency);
    for (const { coin, denom } of cds) {
        if (coin.suspended) {
            continue;
        }
        if (coin.status !== dbTypes.CoinStatus.Fresh) {
            continue;
        }
        if (Amounts.cmp(denom.feeDeposit, coin.currentAmount) >= 0) {
            continue;
        }
        cdsResult.push({ coin, denom });
        accDepositFee = Amounts.add(denom.feeDeposit, accDepositFee).amount;
        let leftAmount = Amounts.sub(coin.currentAmount, Amounts.sub(paymentAmount, accAmount).amount).amount;
        accAmount = Amounts.add(coin.currentAmount, accAmount).amount;
        const coversAmount = Amounts.cmp(accAmount, paymentAmount) >= 0;
        const coversAmountWithFee = Amounts.cmp(accAmount, Amounts.add(paymentAmount, denom.feeDeposit).amount) >= 0;
        const isBelowFee = Amounts.cmp(accDepositFee, depositFeeLimit) <= 0;
        logger.trace("candidate coin selection", {
            coversAmount,
            isBelowFee,
            accDepositFee,
            accAmount,
            paymentAmount,
        });
        if ((coversAmount && isBelowFee) || coversAmountWithFee) {
            const depositFeeToCover = Amounts.sub(accDepositFee, depositFeeLimit)
                .amount;
            leftAmount = Amounts.sub(leftAmount, depositFeeToCover).amount;
            logger.trace("deposit fee to cover", helpers.amountToPretty(depositFeeToCover));
            let totalFees = Amounts.getZero(currency);
            if (coversAmountWithFee && !isBelowFee) {
                // these are the fees the customer has to pay
                // because the merchant doesn't cover them
                totalFees = Amounts.sub(depositFeeLimit, accDepositFee).amount;
            }
            totalFees = Amounts.add(totalFees, refresh_1.getTotalRefreshCost(denoms, denom, leftAmount)).amount;
            return { cds: cdsResult, totalFees };
        }
    }
    return undefined;
}
exports.selectPayCoins = selectPayCoins;
/**
 * Get exchanges and associated coins that are still spendable, but only
 * if the sum the coins' remaining value covers the payment amount and fees.
 */
function getCoinsForPayment(ws, args) {
    return __awaiter(this, void 0, void 0, function* () {
        const { allowedAuditors, allowedExchanges, depositFeeLimit, paymentAmount, wireFeeAmortization, wireFeeLimit, wireFeeTime, wireMethod, } = args;
        let remainingAmount = paymentAmount;
        const exchanges = yield query.oneShotIter(ws.db, dbTypes.Stores.exchanges).toArray();
        for (const exchange of exchanges) {
            let isOkay = false;
            const exchangeDetails = exchange.details;
            if (!exchangeDetails) {
                continue;
            }
            const exchangeFees = exchange.wireInfo;
            if (!exchangeFees) {
                continue;
            }
            // is the exchange explicitly allowed?
            for (const allowedExchange of allowedExchanges) {
                if (allowedExchange.master_pub === exchangeDetails.masterPublicKey) {
                    isOkay = true;
                    break;
                }
            }
            // is the exchange allowed because of one of its auditors?
            if (!isOkay) {
                for (const allowedAuditor of allowedAuditors) {
                    for (const auditor of exchangeDetails.auditors) {
                        if (auditor.auditor_pub === allowedAuditor.auditor_pub) {
                            isOkay = true;
                            break;
                        }
                    }
                    if (isOkay) {
                        break;
                    }
                }
            }
            if (!isOkay) {
                continue;
            }
            const coins = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.coins.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
            const denoms = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
            if (!coins || coins.length === 0) {
                continue;
            }
            // Denomination of the first coin, we assume that all other
            // coins have the same currency
            const firstDenom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
                exchange.baseUrl,
                coins[0].denomPub,
            ]);
            if (!firstDenom) {
                throw Error("db inconsistent");
            }
            const currency = firstDenom.value.currency;
            const cds = [];
            for (const coin of coins) {
                const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
                    exchange.baseUrl,
                    coin.denomPub,
                ]);
                if (!denom) {
                    throw Error("db inconsistent");
                }
                if (denom.value.currency !== currency) {
                    console.warn(`same pubkey for different currencies at exchange ${exchange.baseUrl}`);
                    continue;
                }
                if (coin.suspended) {
                    continue;
                }
                if (coin.status !== dbTypes.CoinStatus.Fresh) {
                    continue;
                }
                cds.push({ coin, denom });
            }
            let totalFees = Amounts.getZero(currency);
            let wireFee;
            for (const fee of exchangeFees.feesForType[wireMethod] || []) {
                if (fee.startStamp <= wireFeeTime && fee.endStamp >= wireFeeTime) {
                    wireFee = fee.wireFee;
                    break;
                }
            }
            if (wireFee) {
                const amortizedWireFee = Amounts.divide(wireFee, wireFeeAmortization);
                if (Amounts.cmp(wireFeeLimit, amortizedWireFee) < 0) {
                    totalFees = Amounts.add(amortizedWireFee, totalFees).amount;
                    remainingAmount = Amounts.add(amortizedWireFee, remainingAmount).amount;
                }
            }
            const res = selectPayCoins(denoms, cds, remainingAmount, depositFeeLimit);
            if (res) {
                totalFees = Amounts.add(totalFees, res.totalFees).amount;
                return {
                    cds: res.cds,
                    exchangeUrl: exchange.baseUrl,
                    totalAmount: remainingAmount,
                    totalFees,
                };
            }
        }
        return undefined;
    });
}
/**
 * Record all information that is necessary to
 * pay for a proposal in the wallet's database.
 */
function recordConfirmPay(ws, proposal, payCoinInfo, chosenExchange) {
    return __awaiter(this, void 0, void 0, function* () {
        const d = proposal.download;
        if (!d) {
            throw Error("proposal is in invalid state");
        }
        const payReq = {
            coins: payCoinInfo.sigs,
            merchant_pub: d.contractTerms.merchant_pub,
            mode: "pay",
            order_id: d.contractTerms.order_id,
        };
        const t = {
            abortDone: false,
            abortRequested: false,
            contractTerms: d.contractTerms,
            contractTermsHash: d.contractTermsHash,
            finished: false,
            lastSessionId: undefined,
            merchantSig: d.merchantSig,
            payReq,
            refundsDone: {},
            refundsPending: {},
            timestamp: walletTypes.getTimestampNow(),
            timestamp_refund: undefined,
            proposalId: proposal.proposalId,
        };
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.purchases, dbTypes.Stores.proposals], (tx) => __awaiter(this, void 0, void 0, function* () {
            const p = yield tx.get(dbTypes.Stores.proposals, proposal.proposalId);
            if (p) {
                p.proposalStatus = dbTypes.ProposalStatus.ACCEPTED;
                yield tx.put(dbTypes.Stores.proposals, p);
            }
            yield tx.put(dbTypes.Stores.purchases, t);
            for (let c of payCoinInfo.updatedCoins) {
                yield tx.put(dbTypes.Stores.coins, c);
            }
        }));
        ws.badge.showNotification();
        ws.notifier.notify();
        return t;
    });
}
function getNextUrl(contractTerms) {
    const f = contractTerms.fulfillment_url;
    if (f.startsWith("http://") || f.startsWith("https://")) {
        const fu = new URL(contractTerms.fulfillment_url);
        fu.searchParams.set("order_id", contractTerms.order_id);
        return fu.href;
    }
    else {
        return f;
    }
}
function abortFailedPayment(ws, proposalId) {
    return __awaiter(this, void 0, void 0, function* () {
        const purchase = yield query.oneShotGet(ws.db, dbTypes.Stores.purchases, proposalId);
        if (!purchase) {
            throw Error("Purchase not found, unable to abort with refund");
        }
        if (purchase.finished) {
            throw Error("Purchase already finished, not aborting");
        }
        if (purchase.abortDone) {
            console.warn("abort requested on already aborted purchase");
            return;
        }
        purchase.abortRequested = true;
        // From now on, we can't retry payment anymore,
        // so mark this in the DB in case the /pay abort
        // does not complete on the first try.
        yield query.oneShotPut(ws.db, dbTypes.Stores.purchases, purchase);
        let resp;
        const abortReq = Object.assign(Object.assign({}, purchase.payReq), { mode: "abort-refund" });
        const payUrl = new URL("pay", purchase.contractTerms.merchant_base_url).href;
        try {
            resp = yield ws.http.postJson(payUrl, abortReq);
        }
        catch (e) {
            // Gives the user the option to retry / abort and refresh
            console.log("aborting payment failed", e);
            throw e;
        }
        const refundResponse = talerTypes.MerchantRefundResponse.checked(resp.responseJson);
        yield acceptRefundResponse(ws, refundResponse);
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.purchases], (tx) => __awaiter(this, void 0, void 0, function* () {
            const p = yield tx.get(dbTypes.Stores.purchases, proposalId);
            if (!p) {
                return;
            }
            p.abortDone = true;
            yield tx.put(dbTypes.Stores.purchases, p);
        }));
    });
}
exports.abortFailedPayment = abortFailedPayment;
function processDownloadProposal(ws, proposalId) {
    return __awaiter(this, void 0, void 0, function* () {
        const proposal = yield query.oneShotGet(ws.db, dbTypes.Stores.proposals, proposalId);
        if (!proposal) {
            return;
        }
        if (proposal.proposalStatus != dbTypes.ProposalStatus.DOWNLOADING) {
            return;
        }
        const parsed_url = new URL(proposal.url);
        parsed_url.searchParams.set("nonce", proposal.noncePub);
        const urlWithNonce = parsed_url.href;
        console.log("downloading contract from '" + urlWithNonce + "'");
        let resp;
        try {
            resp = yield ws.http.get(urlWithNonce);
        }
        catch (e) {
            console.log("contract download failed", e);
            throw e;
        }
        const proposalResp = talerTypes.Proposal.checked(resp.responseJson);
        const contractTermsHash = yield ws.cryptoApi.hashString(helpers.canonicalJson(proposalResp.contract_terms));
        const fulfillmentUrl = proposalResp.contract_terms.fulfillment_url;
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.proposals, dbTypes.Stores.purchases], (tx) => __awaiter(this, void 0, void 0, function* () {
            const p = yield tx.get(dbTypes.Stores.proposals, proposalId);
            if (!p) {
                return;
            }
            if (p.proposalStatus !== dbTypes.ProposalStatus.DOWNLOADING) {
                return;
            }
            if (fulfillmentUrl.startsWith("http://") ||
                fulfillmentUrl.startsWith("https://")) {
                const differentPurchase = yield tx.getIndexed(dbTypes.Stores.purchases.fulfillmentUrlIndex, fulfillmentUrl);
                if (differentPurchase) {
                    p.proposalStatus = dbTypes.ProposalStatus.REPURCHASE;
                    p.repurchaseProposalId = differentPurchase.proposalId;
                    yield tx.put(dbTypes.Stores.proposals, p);
                    return;
                }
            }
            p.download = {
                contractTerms: proposalResp.contract_terms,
                merchantSig: proposalResp.sig,
                contractTermsHash,
            };
            p.proposalStatus = dbTypes.ProposalStatus.PROPOSED;
            yield tx.put(dbTypes.Stores.proposals, p);
        }));
        ws.notifier.notify();
    });
}
exports.processDownloadProposal = processDownloadProposal;
/**
 * Download a proposal and store it in the database.
 * Returns an id for it to retrieve it later.
 *
 * @param sessionId Current session ID, if the proposal is being
 *  downloaded in the context of a session ID.
 */
function startDownloadProposal(ws, url, sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const oldProposal = yield query.oneShotGetIndexed(ws.db, dbTypes.Stores.proposals.urlIndex, url);
        if (oldProposal) {
            yield processDownloadProposal(ws, oldProposal.proposalId);
            return oldProposal.proposalId;
        }
        const { priv, pub } = yield ws.cryptoApi.createEddsaKeypair();
        const proposalId = talerCrypto.encodeCrock(talerCrypto.getRandomBytes(32));
        const proposalRecord = {
            download: undefined,
            noncePriv: priv,
            noncePub: pub,
            timestamp: walletTypes.getTimestampNow(),
            url,
            downloadSessionId: sessionId,
            proposalId: proposalId,
            proposalStatus: dbTypes.ProposalStatus.DOWNLOADING,
            repurchaseProposalId: undefined,
        };
        yield query.oneShotPut(ws.db, dbTypes.Stores.proposals, proposalRecord);
        yield processDownloadProposal(ws, proposalId);
        return proposalId;
    });
}
function submitPay(ws, proposalId, sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        const purchase = yield query.oneShotGet(ws.db, dbTypes.Stores.purchases, proposalId);
        if (!purchase) {
            throw Error("Purchase not found: " + proposalId);
        }
        if (purchase.abortRequested) {
            throw Error("not submitting payment for aborted purchase");
        }
        let resp;
        const payReq = Object.assign(Object.assign({}, purchase.payReq), { session_id: sessionId });
        const payUrl = new URL("pay", purchase.contractTerms.merchant_base_url).href;
        try {
            resp = yield ws.http.postJson(payUrl, payReq);
        }
        catch (e) {
            // Gives the user the option to retry / abort and refresh
            console.log("payment failed", e);
            throw e;
        }
        const merchantResp = resp.responseJson;
        console.log("got success from pay URL");
        const merchantPub = purchase.contractTerms.merchant_pub;
        const valid = yield ws.cryptoApi.isValidPaymentSignature(merchantResp.sig, purchase.contractTermsHash, merchantPub);
        if (!valid) {
            console.error("merchant payment signature invalid");
            // FIXME: properly display error
            throw Error("merchant payment signature invalid");
        }
        purchase.finished = true;
        const modifiedCoins = [];
        for (const pc of purchase.payReq.coins) {
            const c = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, pc.coin_pub);
            if (!c) {
                console.error("coin not found");
                throw Error("coin used in payment not found");
            }
            c.status = dbTypes.CoinStatus.Dirty;
            modifiedCoins.push(c);
        }
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.purchases], (tx) => __awaiter(this, void 0, void 0, function* () {
            for (let c of modifiedCoins) {
                yield tx.put(dbTypes.Stores.coins, c);
            }
            yield tx.put(dbTypes.Stores.purchases, purchase);
        }));
        for (const c of purchase.payReq.coins) {
            refresh_1.refresh(ws, c.coin_pub).catch(e => {
                console.log("error in refreshing after payment:", e);
            });
        }
        const nextUrl = getNextUrl(purchase.contractTerms);
        ws.cachedNextUrl[purchase.contractTerms.fulfillment_url] = {
            nextUrl,
            lastSessionId: sessionId,
        };
        return { nextUrl };
    });
}
exports.submitPay = submitPay;
/**
 * Check if a payment for the given taler://pay/ URI is possible.
 *
 * If the payment is possible, the signature are already generated but not
 * yet send to the merchant.
 */
function preparePay(ws, talerPayUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const uriResult = taleruri.parsePayUri(talerPayUri);
        if (!uriResult) {
            return {
                status: "error",
                error: "URI not supported",
            };
        }
        const proposalId = yield startDownloadProposal(ws, uriResult.downloadUrl, uriResult.sessionId);
        let proposal = yield query.oneShotGet(ws.db, dbTypes.Stores.proposals, proposalId);
        if (!proposal) {
            throw Error(`could not get proposal ${proposalId}`);
        }
        if (proposal.proposalStatus === dbTypes.ProposalStatus.REPURCHASE) {
            const existingProposalId = proposal.repurchaseProposalId;
            if (!existingProposalId) {
                throw Error("invalid proposal state");
            }
            proposal = yield query.oneShotGet(ws.db, dbTypes.Stores.proposals, existingProposalId);
            if (!proposal) {
                throw Error("existing proposal is in wrong state");
            }
        }
        const d = proposal.download;
        if (!d) {
            console.error("bad proposal", proposal);
            throw Error("proposal is in invalid state");
        }
        const contractTerms = d.contractTerms;
        const merchantSig = d.merchantSig;
        if (!contractTerms || !merchantSig) {
            throw Error("BUG: proposal is in invalid state");
        }
        console.log("proposal", proposal);
        // First check if we already payed for it.
        const purchase = yield query.oneShotGet(ws.db, dbTypes.Stores.purchases, proposalId);
        if (!purchase) {
            const paymentAmount = Amounts.parseOrThrow(contractTerms.amount);
            let wireFeeLimit;
            if (contractTerms.max_wire_fee) {
                wireFeeLimit = Amounts.parseOrThrow(contractTerms.max_wire_fee);
            }
            else {
                wireFeeLimit = Amounts.getZero(paymentAmount.currency);
            }
            // If not already payed, check if we could pay for it.
            const res = yield getCoinsForPayment(ws, {
                allowedAuditors: contractTerms.auditors,
                allowedExchanges: contractTerms.exchanges,
                depositFeeLimit: Amounts.parseOrThrow(contractTerms.max_fee),
                paymentAmount,
                wireFeeAmortization: contractTerms.wire_fee_amortization || 1,
                wireFeeLimit,
                wireFeeTime: helpers.extractTalerStampOrThrow(contractTerms.timestamp),
                wireMethod: contractTerms.wire_method,
            });
            if (!res) {
                console.log("not confirming payment, insufficient coins");
                return {
                    status: "insufficient-balance",
                    contractTerms: contractTerms,
                    proposalId: proposal.proposalId,
                };
            }
            // Only create speculative signature if we don't already have one for this proposal
            if (!ws.speculativePayData ||
                (ws.speculativePayData &&
                    ws.speculativePayData.orderDownloadId !== proposalId)) {
                const { exchangeUrl, cds, totalAmount } = res;
                const payCoinInfo = yield ws.cryptoApi.signDeposit(contractTerms, cds, totalAmount);
                ws.speculativePayData = {
                    exchangeUrl,
                    payCoinInfo,
                    proposal,
                    orderDownloadId: proposalId,
                };
                logger.trace("created speculative pay data for payment");
            }
            return {
                status: "payment-possible",
                contractTerms: contractTerms,
                proposalId: proposal.proposalId,
                totalFees: res.totalFees,
            };
        }
        if (uriResult.sessionId) {
            yield submitPay(ws, proposalId, uriResult.sessionId);
        }
        return {
            status: "paid",
            contractTerms: purchase.contractTerms,
            nextUrl: getNextUrl(purchase.contractTerms),
        };
    });
}
exports.preparePay = preparePay;
/**
 * Get the speculative pay data, but only if coins have not changed in between.
 */
function getSpeculativePayData(ws, proposalId) {
    return __awaiter(this, void 0, void 0, function* () {
        const sp = ws.speculativePayData;
        if (!sp) {
            return;
        }
        if (sp.orderDownloadId !== proposalId) {
            return;
        }
        const coinKeys = sp.payCoinInfo.updatedCoins.map(x => x.coinPub);
        const coins = [];
        for (let coinKey of coinKeys) {
            const cc = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, coinKey);
            if (cc) {
                coins.push(cc);
            }
        }
        for (let i = 0; i < coins.length; i++) {
            const specCoin = sp.payCoinInfo.originalCoins[i];
            const currentCoin = coins[i];
            // Coin does not exist anymore!
            if (!currentCoin) {
                return;
            }
            if (Amounts.cmp(specCoin.currentAmount, currentCoin.currentAmount) !== 0) {
                return;
            }
        }
        return sp;
    });
}
/**
 * Add a contract to the wallet and sign coins, and send them.
 */
function confirmPay(ws, proposalId, sessionIdOverride) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.trace(`executing confirmPay with proposalId ${proposalId} and sessionIdOverride ${sessionIdOverride}`);
        const proposal = yield query.oneShotGet(ws.db, dbTypes.Stores.proposals, proposalId);
        if (!proposal) {
            throw Error(`proposal with id ${proposalId} not found`);
        }
        const d = proposal.download;
        if (!d) {
            throw Error("proposal is in invalid state");
        }
        const sessionId = sessionIdOverride || proposal.downloadSessionId;
        let purchase = yield query.oneShotGet(ws.db, dbTypes.Stores.purchases, d.contractTermsHash);
        if (purchase) {
            return submitPay(ws, proposalId, sessionId);
        }
        const contractAmount = Amounts.parseOrThrow(d.contractTerms.amount);
        let wireFeeLimit;
        if (!d.contractTerms.max_wire_fee) {
            wireFeeLimit = Amounts.getZero(contractAmount.currency);
        }
        else {
            wireFeeLimit = Amounts.parseOrThrow(d.contractTerms.max_wire_fee);
        }
        const res = yield getCoinsForPayment(ws, {
            allowedAuditors: d.contractTerms.auditors,
            allowedExchanges: d.contractTerms.exchanges,
            depositFeeLimit: Amounts.parseOrThrow(d.contractTerms.max_fee),
            paymentAmount: Amounts.parseOrThrow(d.contractTerms.amount),
            wireFeeAmortization: d.contractTerms.wire_fee_amortization || 1,
            wireFeeLimit,
            wireFeeTime: helpers.extractTalerStampOrThrow(d.contractTerms.timestamp),
            wireMethod: d.contractTerms.wire_method,
        });
        logger.trace("coin selection result", res);
        if (!res) {
            // Should not happen, since checkPay should be called first
            console.log("not confirming payment, insufficient coins");
            throw Error("insufficient balance");
        }
        const sd = yield getSpeculativePayData(ws, proposalId);
        if (!sd) {
            const { exchangeUrl, cds, totalAmount } = res;
            const payCoinInfo = yield ws.cryptoApi.signDeposit(d.contractTerms, cds, totalAmount);
            purchase = yield recordConfirmPay(ws, proposal, payCoinInfo);
        }
        else {
            purchase = yield recordConfirmPay(ws, sd.proposal, sd.payCoinInfo, sd.exchangeUrl);
        }
        return submitPay(ws, proposalId, sessionId);
    });
}
exports.confirmPay = confirmPay;
function getFullRefundFees(ws, refundPermissions) {
    return __awaiter(this, void 0, void 0, function* () {
        if (refundPermissions.length === 0) {
            throw Error("no refunds given");
        }
        const coin0 = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, refundPermissions[0].coin_pub);
        if (!coin0) {
            throw Error("coin not found");
        }
        let feeAcc = Amounts.getZero(Amounts.parseOrThrow(refundPermissions[0].refund_amount).currency);
        const denoms = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, coin0.exchangeBaseUrl).toArray();
        for (const rp of refundPermissions) {
            const coin = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, rp.coin_pub);
            if (!coin) {
                throw Error("coin not found");
            }
            const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
                coin0.exchangeBaseUrl,
                coin.denomPub,
            ]);
            if (!denom) {
                throw Error(`denom not found (${coin.denomPub})`);
            }
            // FIXME:  this assumes that the refund already happened.
            // When it hasn't, the refresh cost is inaccurate.  To fix this,
            // we need introduce a flag to tell if a coin was refunded or
            // refreshed normally (and what about incremental refunds?)
            const refundAmount = Amounts.parseOrThrow(rp.refund_amount);
            const refundFee = Amounts.parseOrThrow(rp.refund_fee);
            const refreshCost = refresh_1.getTotalRefreshCost(denoms, denom, Amounts.sub(refundAmount, refundFee).amount);
            feeAcc = Amounts.add(feeAcc, refreshCost, refundFee).amount;
        }
        return feeAcc;
    });
}
exports.getFullRefundFees = getFullRefundFees;
function submitRefunds(ws, proposalId) {
    return __awaiter(this, void 0, void 0, function* () {
        const purchase = yield query.oneShotGet(ws.db, dbTypes.Stores.purchases, proposalId);
        if (!purchase) {
            console.error("not submitting refunds, payment not found:");
            return;
        }
        const pendingKeys = Object.keys(purchase.refundsPending);
        if (pendingKeys.length === 0) {
            return;
        }
        for (const pk of pendingKeys) {
            const perm = purchase.refundsPending[pk];
            const req = {
                coin_pub: perm.coin_pub,
                h_contract_terms: purchase.contractTermsHash,
                merchant_pub: purchase.contractTerms.merchant_pub,
                merchant_sig: perm.merchant_sig,
                refund_amount: perm.refund_amount,
                refund_fee: perm.refund_fee,
                rtransaction_id: perm.rtransaction_id,
            };
            console.log("sending refund permission", perm);
            // FIXME: not correct once we support multiple exchanges per payment
            const exchangeUrl = purchase.payReq.coins[0].exchange_url;
            const reqUrl = new URL("refund", exchangeUrl);
            const resp = yield ws.http.postJson(reqUrl.href, req);
            if (resp.status !== 200) {
                console.error("refund failed", resp);
                continue;
            }
            // Transactionally mark successful refunds as done
            const transformPurchase = (t) => {
                if (!t) {
                    console.warn("purchase not found, not updating refund");
                    return;
                }
                if (t.refundsPending[pk]) {
                    t.refundsDone[pk] = t.refundsPending[pk];
                    delete t.refundsPending[pk];
                }
                return t;
            };
            const transformCoin = (c) => {
                if (!c) {
                    console.warn("coin not found, can't apply refund");
                    return;
                }
                const refundAmount = Amounts.parseOrThrow(perm.refund_amount);
                const refundFee = Amounts.parseOrThrow(perm.refund_fee);
                c.status = dbTypes.CoinStatus.Dirty;
                c.currentAmount = Amounts.add(c.currentAmount, refundAmount).amount;
                c.currentAmount = Amounts.sub(c.currentAmount, refundFee).amount;
                return c;
            };
            yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.purchases, dbTypes.Stores.coins], (tx) => __awaiter(this, void 0, void 0, function* () {
                yield tx.mutate(dbTypes.Stores.purchases, proposalId, transformPurchase);
                yield tx.mutate(dbTypes.Stores.coins, perm.coin_pub, transformCoin);
            }));
            refresh_1.refresh(ws, perm.coin_pub);
        }
        ws.badge.showNotification();
        ws.notifier.notify();
    });
}
function acceptRefundResponse(ws, refundResponse) {
    return __awaiter(this, void 0, void 0, function* () {
        const refundPermissions = refundResponse.refund_permissions;
        if (!refundPermissions.length) {
            console.warn("got empty refund list");
            throw Error("empty refund");
        }
        /**
         * Add refund to purchase if not already added.
         */
        function f(t) {
            if (!t) {
                console.error("purchase not found, not adding refunds");
                return;
            }
            t.timestamp_refund = walletTypes.getTimestampNow();
            for (const perm of refundPermissions) {
                if (!t.refundsPending[perm.merchant_sig] &&
                    !t.refundsDone[perm.merchant_sig]) {
                    t.refundsPending[perm.merchant_sig] = perm;
                }
            }
            return t;
        }
        const hc = refundResponse.h_contract_terms;
        // Add the refund permissions to the purchase within a DB transaction
        yield query.oneShotMutate(ws.db, dbTypes.Stores.purchases, hc, f);
        ws.notifier.notify();
        yield submitRefunds(ws, hc);
        return hc;
    });
}
exports.acceptRefundResponse = acceptRefundResponse;
/**
 * Accept a refund, return the contract hash for the contract
 * that was involved in the refund.
 */
function applyRefund(ws, talerRefundUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const parseResult = taleruri.parseRefundUri(talerRefundUri);
        if (!parseResult) {
            throw Error("invalid refund URI");
        }
        const refundUrl = parseResult.refundUrl;
        logger.trace("processing refund");
        let resp;
        try {
            resp = yield ws.http.get(refundUrl);
        }
        catch (e) {
            console.error("error downloading refund permission", e);
            throw e;
        }
        const refundResponse = talerTypes.MerchantRefundResponse.checked(resp.responseJson);
        return acceptRefundResponse(ws, refundResponse);
    });
}
exports.applyRefund = applyRefund;

});

unwrapExports(pay);
var pay_1 = pay.selectPayCoins;
var pay_2 = pay.abortFailedPayment;
var pay_3 = pay.processDownloadProposal;
var pay_4 = pay.submitPay;
var pay_5 = pay.preparePay;
var pay_6 = pay.confirmPay;
var pay_7 = pay.getFullRefundFees;
var pay_8 = pay.acceptRefundResponse;
var pay_9 = pay.applyRefund;

var asyncMemo = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
Object.defineProperty(exports, "__esModule", { value: true });
class AsyncOpMemo {
    constructor() {
        this.n = 0;
        this.memo = {};
    }
    put(key, p) {
        const n = this.n++;
        this.memo[key] = {
            p,
            n,
            t: new Date().getTime(),
        };
        p.finally(() => {
            const r = this.memo[key];
            if (r && r.n === n) {
                delete this.memo[key];
            }
        });
        return p;
    }
    find(key) {
        const res = this.memo[key];
        const tNow = new Date().getTime();
        if (res && res.t < tNow - 10 * 1000) {
            delete this.memo[key];
            return;
        }
        else if (res) {
            return res.p;
        }
        return;
    }
}
exports.AsyncOpMemo = AsyncOpMemo;

});

unwrapExports(asyncMemo);
var asyncMemo_1 = asyncMemo.AsyncOpMemo;

var history = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });


const Amounts = __importStar(amounts);
/**
 * Retrive the full event history for this wallet.
 */
function getHistory(ws, historyQuery) {
    return __awaiter(this, void 0, void 0, function* () {
        const history = [];
        // FIXME: do pagination instead of generating the full history
        // We uniquely identify history rows via their timestamp.
        // This works as timestamps are guaranteed to be monotonically
        // increasing even
        /*
        const proposals = await oneShotIter(ws.db, Stores.proposals).toArray();
        for (const p of proposals) {
          history.push({
            detail: {
              contractTermsHash: p.contractTermsHash,
              merchantName: p.contractTerms.merchant.name,
            },
            timestamp: p.timestamp,
            type: "claim-order",
            explicit: false,
          });
        }
        */
        const withdrawals = yield query.oneShotIter(ws.db, dbTypes.Stores.withdrawalSession).toArray();
        for (const w of withdrawals) {
            history.push({
                detail: {
                    withdrawalAmount: w.rawWithdrawalAmount,
                },
                timestamp: w.startTimestamp,
                type: "withdraw",
                explicit: false,
            });
        }
        const purchases = yield query.oneShotIter(ws.db, dbTypes.Stores.purchases).toArray();
        for (const p of purchases) {
            history.push({
                detail: {
                    amount: p.contractTerms.amount,
                    contractTermsHash: p.contractTermsHash,
                    fulfillmentUrl: p.contractTerms.fulfillment_url,
                    merchantName: p.contractTerms.merchant.name,
                },
                timestamp: p.timestamp,
                type: "pay",
                explicit: false,
            });
            if (p.timestamp_refund) {
                const contractAmount = Amounts.parseOrThrow(p.contractTerms.amount);
                const amountsPending = Object.keys(p.refundsPending).map(x => Amounts.parseOrThrow(p.refundsPending[x].refund_amount));
                const amountsDone = Object.keys(p.refundsDone).map(x => Amounts.parseOrThrow(p.refundsDone[x].refund_amount));
                const amounts = amountsPending.concat(amountsDone);
                const amount = Amounts.add(Amounts.getZero(contractAmount.currency), ...amounts).amount;
                history.push({
                    detail: {
                        contractTermsHash: p.contractTermsHash,
                        fulfillmentUrl: p.contractTerms.fulfillment_url,
                        merchantName: p.contractTerms.merchant.name,
                        refundAmount: amount,
                    },
                    timestamp: p.timestamp_refund,
                    type: "refund",
                    explicit: false,
                });
            }
        }
        const reserves = yield query.oneShotIter(ws.db, dbTypes.Stores.reserves).toArray();
        for (const r of reserves) {
            const reserveType = r.bankWithdrawStatusUrl ? "taler-bank" : "manual";
            history.push({
                detail: {
                    exchangeBaseUrl: r.exchangeBaseUrl,
                    requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
                    reservePub: r.reservePub,
                    reserveType,
                    bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
                },
                timestamp: r.created,
                type: "reserve-created",
                explicit: false,
            });
            if (r.timestampConfirmed) {
                history.push({
                    detail: {
                        exchangeBaseUrl: r.exchangeBaseUrl,
                        requestedAmount: Amounts.toString(r.initiallyRequestedAmount),
                        reservePub: r.reservePub,
                        reserveType,
                        bankWithdrawStatusUrl: r.bankWithdrawStatusUrl,
                    },
                    timestamp: r.created,
                    type: "reserve-confirmed",
                    explicit: false,
                });
            }
        }
        const tips = yield query.oneShotIter(ws.db, dbTypes.Stores.tips).toArray();
        for (const tip of tips) {
            history.push({
                detail: {
                    accepted: tip.accepted,
                    amount: tip.amount,
                    merchantBaseUrl: tip.merchantBaseUrl,
                    tipId: tip.merchantTipId,
                },
                timestamp: tip.timestamp,
                explicit: false,
                type: "tip",
            });
        }
        yield query.oneShotIter(ws.db, dbTypes.Stores.exchanges).forEach(exchange => {
            history.push({
                type: "exchange-added",
                explicit: false,
                timestamp: exchange.timestampAdded,
                detail: {
                    exchangeBaseUrl: exchange.baseUrl,
                },
            });
        });
        history.sort((h1, h2) => Math.sign(h1.timestamp.t_ms - h2.timestamp.t_ms));
        return { history };
    });
}
exports.getHistory = getHistory;

});

unwrapExports(history);
var history_1 = history.getHistory;

var pending = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Imports.
 */



function getPendingOperations(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        const pendingOperations = [];
        let minRetryDurationMs = 5000;
        yield query.runWithReadTransaction(ws.db, [
            dbTypes.Stores.exchanges,
            dbTypes.Stores.reserves,
            dbTypes.Stores.refresh,
            dbTypes.Stores.coins,
            dbTypes.Stores.withdrawalSession,
            dbTypes.Stores.proposals,
            dbTypes.Stores.tips,
        ], (tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.iter(dbTypes.Stores.exchanges).forEach(e => {
                switch (e.updateStatus) {
                    case dbTypes.ExchangeUpdateStatus.FINISHED:
                        if (e.lastError) {
                            pendingOperations.push({
                                type: "bug",
                                message: "Exchange record is in FINISHED state but has lastError set",
                                details: {
                                    exchangeBaseUrl: e.baseUrl,
                                },
                            });
                        }
                        if (!e.details) {
                            pendingOperations.push({
                                type: "bug",
                                message: "Exchange record does not have details, but no update in progress.",
                                details: {
                                    exchangeBaseUrl: e.baseUrl,
                                },
                            });
                        }
                        if (!e.wireInfo) {
                            pendingOperations.push({
                                type: "bug",
                                message: "Exchange record does not have wire info, but no update in progress.",
                                details: {
                                    exchangeBaseUrl: e.baseUrl,
                                },
                            });
                        }
                        break;
                    case dbTypes.ExchangeUpdateStatus.FETCH_KEYS:
                        pendingOperations.push({
                            type: "exchange-update",
                            stage: "fetch-keys",
                            exchangeBaseUrl: e.baseUrl,
                            lastError: e.lastError,
                            reason: e.updateReason || "unknown",
                        });
                        break;
                    case dbTypes.ExchangeUpdateStatus.FETCH_WIRE:
                        pendingOperations.push({
                            type: "exchange-update",
                            stage: "fetch-wire",
                            exchangeBaseUrl: e.baseUrl,
                            lastError: e.lastError,
                            reason: e.updateReason || "unknown",
                        });
                        break;
                    default:
                        pendingOperations.push({
                            type: "bug",
                            message: "Unknown exchangeUpdateStatus",
                            details: {
                                exchangeBaseUrl: e.baseUrl,
                                exchangeUpdateStatus: e.updateStatus,
                            },
                        });
                        break;
                }
            });
            yield tx.iter(dbTypes.Stores.reserves).forEach(reserve => {
                const reserveType = reserve.bankWithdrawStatusUrl
                    ? "taler-bank"
                    : "manual";
                const now = walletTypes.getTimestampNow();
                switch (reserve.reserveStatus) {
                    case dbTypes.ReserveRecordStatus.DORMANT:
                        // nothing to report as pending
                        break;
                    case dbTypes.ReserveRecordStatus.WITHDRAWING:
                    case dbTypes.ReserveRecordStatus.UNCONFIRMED:
                    case dbTypes.ReserveRecordStatus.QUERYING_STATUS:
                    case dbTypes.ReserveRecordStatus.REGISTERING_BANK:
                        pendingOperations.push({
                            type: "reserve",
                            stage: reserve.reserveStatus,
                            timestampCreated: reserve.created,
                            reserveType,
                            reservePub: reserve.reservePub,
                        });
                        if (reserve.created.t_ms < now.t_ms - 5000) {
                            minRetryDurationMs = 500;
                        }
                        else if (reserve.created.t_ms < now.t_ms - 30000) {
                            minRetryDurationMs = 2000;
                        }
                        break;
                    case dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK:
                        pendingOperations.push({
                            type: "reserve",
                            stage: reserve.reserveStatus,
                            timestampCreated: reserve.created,
                            reserveType,
                            reservePub: reserve.reservePub,
                            bankWithdrawConfirmUrl: reserve.bankWithdrawConfirmUrl,
                        });
                        if (reserve.created.t_ms < now.t_ms - 5000) {
                            minRetryDurationMs = 500;
                        }
                        else if (reserve.created.t_ms < now.t_ms - 30000) {
                            minRetryDurationMs = 2000;
                        }
                        break;
                    default:
                        pendingOperations.push({
                            type: "bug",
                            message: "Unknown reserve record status",
                            details: {
                                reservePub: reserve.reservePub,
                                reserveStatus: reserve.reserveStatus,
                            },
                        });
                        break;
                }
            });
            yield tx.iter(dbTypes.Stores.refresh).forEach(r => {
                if (r.finished) {
                    return;
                }
                let refreshStatus;
                if (r.norevealIndex === undefined) {
                    refreshStatus = "melt";
                }
                else {
                    refreshStatus = "reveal";
                }
                pendingOperations.push({
                    type: "refresh",
                    oldCoinPub: r.meltCoinPub,
                    refreshStatus,
                    refreshOutputSize: r.newDenoms.length,
                    refreshSessionId: r.refreshSessionId,
                });
            });
            yield tx.iter(dbTypes.Stores.coins).forEach(coin => {
                if (coin.status == dbTypes.CoinStatus.Dirty) {
                    pendingOperations.push({
                        type: "dirty-coin",
                        coinPub: coin.coinPub,
                    });
                }
            });
            yield tx.iter(dbTypes.Stores.withdrawalSession).forEach(ws => {
                const numCoinsWithdrawn = ws.withdrawn.reduce((a, x) => a + (x ? 1 : 0), 0);
                const numCoinsTotal = ws.withdrawn.length;
                if (numCoinsWithdrawn < numCoinsTotal) {
                    pendingOperations.push({
                        type: "withdraw",
                        numCoinsTotal,
                        numCoinsWithdrawn,
                        source: ws.source,
                        withdrawSessionId: ws.withdrawSessionId,
                    });
                }
            });
            yield tx.iter(dbTypes.Stores.proposals).forEach((proposal) => {
                if (proposal.proposalStatus == dbTypes.ProposalStatus.PROPOSED) {
                    pendingOperations.push({
                        type: "proposal-choice",
                        merchantBaseUrl: proposal.download.contractTerms.merchant_base_url,
                        proposalId: proposal.proposalId,
                        proposalTimestamp: proposal.timestamp,
                    });
                }
                else if (proposal.proposalStatus == dbTypes.ProposalStatus.DOWNLOADING) {
                    pendingOperations.push({
                        type: "proposal-download",
                        merchantBaseUrl: proposal.download.contractTerms.merchant_base_url,
                        proposalId: proposal.proposalId,
                        proposalTimestamp: proposal.timestamp,
                    });
                }
            });
            yield tx.iter(dbTypes.Stores.tips).forEach((tip) => {
                if (tip.accepted && !tip.pickedUp) {
                    pendingOperations.push({
                        type: "tip",
                        merchantBaseUrl: tip.merchantBaseUrl,
                        tipId: tip.tipId,
                        merchantTipId: tip.merchantTipId,
                    });
                }
            });
        }));
        return {
            pendingOperations,
            nextRetryDelay: {
                d_ms: minRetryDurationMs,
            },
        };
    });
}
exports.getPendingOperations = getPendingOperations;

});

unwrapExports(pending);
var pending_1 = pending.getPendingOperations;

var balance = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });


const Amounts = __importStar(amounts);

const logger = new logging.Logger("withdraw.ts");
/**
 * Get detailed balance information, sliced by exchange and by currency.
 */
function getBalances(ws) {
    return __awaiter(this, void 0, void 0, function* () {
        /**
         * Add amount to a balance field, both for
         * the slicing by exchange and currency.
         */
        function addTo(balance, field, amount, exchange) {
            const z = Amounts.getZero(amount.currency);
            const balanceIdentity = {
                available: z,
                paybackAmount: z,
                pendingIncoming: z,
                pendingPayment: z,
                pendingIncomingDirty: z,
                pendingIncomingRefresh: z,
                pendingIncomingWithdraw: z,
            };
            let entryCurr = balance.byCurrency[amount.currency];
            if (!entryCurr) {
                balance.byCurrency[amount.currency] = entryCurr = Object.assign({}, balanceIdentity);
            }
            let entryEx = balance.byExchange[exchange];
            if (!entryEx) {
                balance.byExchange[exchange] = entryEx = Object.assign({}, balanceIdentity);
            }
            entryCurr[field] = Amounts.add(entryCurr[field], amount).amount;
            entryEx[field] = Amounts.add(entryEx[field], amount).amount;
        }
        const balanceStore = {
            byCurrency: {},
            byExchange: {},
        };
        yield query.runWithReadTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.refresh, dbTypes.Stores.reserves, dbTypes.Stores.purchases, dbTypes.Stores.withdrawalSession], (tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.iter(dbTypes.Stores.coins).forEach(c => {
                if (c.suspended) {
                    return;
                }
                if (c.status === dbTypes.CoinStatus.Fresh) {
                    addTo(balanceStore, "available", c.currentAmount, c.exchangeBaseUrl);
                }
                if (c.status === dbTypes.CoinStatus.Dirty) {
                    addTo(balanceStore, "pendingIncoming", c.currentAmount, c.exchangeBaseUrl);
                    addTo(balanceStore, "pendingIncomingDirty", c.currentAmount, c.exchangeBaseUrl);
                }
            });
            yield tx.iter(dbTypes.Stores.refresh).forEach(r => {
                // Don't count finished refreshes, since the refresh already resulted
                // in coins being added to the wallet.
                if (r.finished) {
                    return;
                }
                addTo(balanceStore, "pendingIncoming", r.valueOutput, r.exchangeBaseUrl);
                addTo(balanceStore, "pendingIncomingRefresh", r.valueOutput, r.exchangeBaseUrl);
            });
            yield tx.iter(dbTypes.Stores.withdrawalSession).forEach(wds => {
                let w = wds.totalCoinValue;
                for (let i = 0; i < wds.planchets.length; i++) {
                    if (wds.withdrawn[i]) {
                        const p = wds.planchets[i];
                        if (p) {
                            w = Amounts.sub(w, p.coinValue).amount;
                        }
                    }
                }
                addTo(balanceStore, "pendingIncoming", w, wds.exchangeBaseUrl);
            });
            yield tx.iter(dbTypes.Stores.purchases).forEach(t => {
                if (t.finished) {
                    return;
                }
                for (const c of t.payReq.coins) {
                    addTo(balanceStore, "pendingPayment", Amounts.parseOrThrow(c.contribution), c.exchange_url);
                }
            });
        }));
        logger.trace("computed balances:", balanceStore);
        return balanceStore;
    });
}
exports.getBalances = getBalances;

});

unwrapExports(balance);
var balance_1 = balance.getBalances;

var tip = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });




const Amounts = __importStar(amounts);





function getTipStatus(ws, talerTipUri) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = taleruri.parseTipUri(talerTipUri);
        if (!res) {
            throw Error("invalid taler://tip URI");
        }
        const tipStatusUrl = new URL("tip-pickup", res.merchantBaseUrl);
        tipStatusUrl.searchParams.set("tip_id", res.merchantTipId);
        console.log("checking tip status from", tipStatusUrl.href);
        const merchantResp = yield ws.http.get(tipStatusUrl.href);
        console.log("resp:", merchantResp.responseJson);
        const tipPickupStatus = talerTypes.TipPickupGetResponse.checked(merchantResp.responseJson);
        console.log("status", tipPickupStatus);
        let amount = Amounts.parseOrThrow(tipPickupStatus.amount);
        let tipRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.tips, [
            res.merchantTipId,
            res.merchantOrigin,
        ]);
        if (!tipRecord) {
            const withdrawDetails = yield withdraw.getWithdrawDetailsForAmount(ws, tipPickupStatus.exchange_url, amount);
            const tipId = talerCrypto.encodeCrock(talerCrypto.getRandomBytes(32));
            tipRecord = {
                tipId,
                accepted: false,
                amount,
                deadline: helpers.getTalerStampSec(tipPickupStatus.stamp_expire),
                exchangeUrl: tipPickupStatus.exchange_url,
                merchantBaseUrl: res.merchantBaseUrl,
                nextUrl: undefined,
                pickedUp: false,
                planchets: undefined,
                response: undefined,
                timestamp: walletTypes.getTimestampNow(),
                merchantTipId: res.merchantTipId,
                totalFees: Amounts.add(withdrawDetails.overhead, withdrawDetails.withdrawFee).amount,
            };
            yield query.oneShotPut(ws.db, dbTypes.Stores.tips, tipRecord);
        }
        const tipStatus = {
            accepted: !!tipRecord && tipRecord.accepted,
            amount: Amounts.parseOrThrow(tipPickupStatus.amount),
            amountLeft: Amounts.parseOrThrow(tipPickupStatus.amount_left),
            exchangeUrl: tipPickupStatus.exchange_url,
            nextUrl: tipPickupStatus.extra.next_url,
            merchantOrigin: res.merchantOrigin,
            merchantTipId: res.merchantTipId,
            expirationTimestamp: helpers.getTalerStampSec(tipPickupStatus.stamp_expire),
            timestamp: helpers.getTalerStampSec(tipPickupStatus.stamp_created),
            totalFees: tipRecord.totalFees,
            tipId: tipRecord.tipId,
        };
        return tipStatus;
    });
}
exports.getTipStatus = getTipStatus;
function processTip(ws, tipId) {
    return __awaiter(this, void 0, void 0, function* () {
        let tipRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.tips, tipId);
        if (!tipRecord) {
            return;
        }
        if (tipRecord.pickedUp) {
            console.log("tip already picked up");
            return;
        }
        if (!tipRecord.planchets) {
            yield exchanges.updateExchangeFromUrl(ws, tipRecord.exchangeUrl);
            const denomsForWithdraw = yield withdraw.getVerifiedWithdrawDenomList(ws, tipRecord.exchangeUrl, tipRecord.amount);
            const planchets = yield Promise.all(denomsForWithdraw.map(d => ws.cryptoApi.createTipPlanchet(d)));
            yield query.oneShotMutate(ws.db, dbTypes.Stores.tips, tipId, r => {
                if (!r.planchets) {
                    r.planchets = planchets;
                }
                return r;
            });
        }
        tipRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.tips, tipId);
        if (!tipRecord) {
            throw Error("tip not in database");
        }
        if (!tipRecord.planchets) {
            throw Error("invariant violated");
        }
        console.log("got planchets for tip!");
        // Planchets in the form that the merchant expects
        const planchetsDetail = tipRecord.planchets.map(p => ({
            coin_ev: p.coinEv,
            denom_pub_hash: p.denomPubHash,
        }));
        let merchantResp;
        const tipStatusUrl = new URL("tip-pickup", tipRecord.merchantBaseUrl);
        try {
            const req = { planchets: planchetsDetail, tip_id: tipRecord.merchantTipId };
            merchantResp = yield ws.http.postJson(tipStatusUrl.href, req);
            console.log("got merchant resp:", merchantResp);
        }
        catch (e) {
            console.log("tipping failed", e);
            throw e;
        }
        const response = talerTypes.TipResponse.checked(merchantResp.responseJson);
        if (response.reserve_sigs.length !== tipRecord.planchets.length) {
            throw Error("number of tip responses does not match requested planchets");
        }
        const planchets = [];
        for (let i = 0; i < tipRecord.planchets.length; i++) {
            const tipPlanchet = tipRecord.planchets[i];
            const planchet = {
                blindingKey: tipPlanchet.blindingKey,
                coinEv: tipPlanchet.coinEv,
                coinPriv: tipPlanchet.coinPriv,
                coinPub: tipPlanchet.coinPub,
                coinValue: tipPlanchet.coinValue,
                denomPub: tipPlanchet.denomPub,
                denomPubHash: tipPlanchet.denomPubHash,
                reservePub: response.reserve_pub,
                withdrawSig: response.reserve_sigs[i].reserve_sig,
                isFromTip: true,
            };
            planchets.push(planchet);
        }
        const withdrawalSessionId = talerCrypto.encodeCrock(talerCrypto.getRandomBytes(32));
        const withdrawalSession = {
            denoms: planchets.map((x) => x.denomPub),
            exchangeBaseUrl: tipRecord.exchangeUrl,
            planchets: planchets,
            source: {
                type: "tip",
                tipId: tipRecord.tipId,
            },
            startTimestamp: walletTypes.getTimestampNow(),
            withdrawSessionId: withdrawalSessionId,
            rawWithdrawalAmount: tipRecord.amount,
            withdrawn: planchets.map((x) => false),
            totalCoinValue: Amounts.sum(planchets.map((p) => p.coinValue)).amount,
        };
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.tips, dbTypes.Stores.withdrawalSession], (tx) => __awaiter(this, void 0, void 0, function* () {
            const tr = yield tx.get(dbTypes.Stores.tips, tipId);
            if (!tr) {
                return;
            }
            if (tr.pickedUp) {
                return;
            }
            tr.pickedUp = true;
            yield tx.put(dbTypes.Stores.tips, tr);
            yield tx.put(dbTypes.Stores.withdrawalSession, withdrawalSession);
        }));
        yield withdraw.processWithdrawSession(ws, withdrawalSessionId);
        ws.notifier.notify();
        ws.badge.showNotification();
        return;
    });
}
exports.processTip = processTip;
function acceptTip(ws, tipId) {
    return __awaiter(this, void 0, void 0, function* () {
        const tipRecord = yield query.oneShotGet(ws.db, dbTypes.Stores.tips, tipId);
        if (!tipRecord) {
            console.log("tip not found");
            return;
        }
        tipRecord.accepted = true;
        yield query.oneShotPut(ws.db, dbTypes.Stores.tips, tipRecord);
        yield processTip(ws, tipId);
        return;
    });
}
exports.acceptTip = acceptTip;

});

unwrapExports(tip);
var tip_1 = tip.getTipStatus;
var tip_2 = tip.processTip;
var tip_3 = tip.acceptTip;

var _return = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });


const Amounts = __importStar(amounts);



const logger = new logging.Logger("return.ts");
function getCoinsForReturn(ws, exchangeBaseUrl, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        const exchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, exchangeBaseUrl);
        if (!exchange) {
            throw Error(`Exchange ${exchangeBaseUrl} not known to the wallet`);
        }
        const coins = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.coins.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
        if (!coins || !coins.length) {
            return [];
        }
        const denoms = yield query.oneShotIterIndex(ws.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, exchange.baseUrl).toArray();
        // Denomination of the first coin, we assume that all other
        // coins have the same currency
        const firstDenom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
            exchange.baseUrl,
            coins[0].denomPub,
        ]);
        if (!firstDenom) {
            throw Error("db inconsistent");
        }
        const currency = firstDenom.value.currency;
        const cds = [];
        for (const coin of coins) {
            const denom = yield query.oneShotGet(ws.db, dbTypes.Stores.denominations, [
                exchange.baseUrl,
                coin.denomPub,
            ]);
            if (!denom) {
                throw Error("db inconsistent");
            }
            if (denom.value.currency !== currency) {
                console.warn(`same pubkey for different currencies at exchange ${exchange.baseUrl}`);
                continue;
            }
            if (coin.suspended) {
                continue;
            }
            if (coin.status !== dbTypes.CoinStatus.Fresh) {
                continue;
            }
            cds.push({ coin, denom });
        }
        const res = pay.selectPayCoins(denoms, cds, amount, amount);
        if (res) {
            return res.cds;
        }
        return undefined;
    });
}
/**
 * Trigger paying coins back into the user's account.
 */
function returnCoins(ws, req) {
    return __awaiter(this, void 0, void 0, function* () {
        logger.trace("got returnCoins request", req);
        const wireType = req.senderWire.type;
        logger.trace("wireType", wireType);
        if (!wireType || typeof wireType !== "string") {
            console.error(`wire type must be a non-empty string, not ${wireType}`);
            return;
        }
        const stampSecNow = Math.floor(new Date().getTime() / 1000);
        const exchange = yield query.oneShotGet(ws.db, dbTypes.Stores.exchanges, req.exchange);
        if (!exchange) {
            console.error(`Exchange ${req.exchange} not known to the wallet`);
            return;
        }
        const exchangeDetails = exchange.details;
        if (!exchangeDetails) {
            throw Error("exchange information needs to be updated first.");
        }
        logger.trace("selecting coins for return:", req);
        const cds = yield getCoinsForReturn(ws, req.exchange, req.amount);
        logger.trace(cds);
        if (!cds) {
            throw Error("coin return impossible, can't select coins");
        }
        const { priv, pub } = yield ws.cryptoApi.createEddsaKeypair();
        const wireHash = yield ws.cryptoApi.hashString(helpers.canonicalJson(req.senderWire));
        const contractTerms = {
            H_wire: wireHash,
            amount: Amounts.toString(req.amount),
            auditors: [],
            exchanges: [
                { master_pub: exchangeDetails.masterPublicKey, url: exchange.baseUrl },
            ],
            extra: {},
            fulfillment_url: "",
            locations: [],
            max_fee: Amounts.toString(req.amount),
            merchant: {},
            merchant_pub: pub,
            order_id: "none",
            pay_deadline: `/Date(${stampSecNow + 30 * 5})/`,
            wire_transfer_deadline: `/Date(${stampSecNow + 60 * 5})/`,
            merchant_base_url: "taler://return-to-account",
            products: [],
            refund_deadline: `/Date(${stampSecNow + 60 * 5})/`,
            timestamp: `/Date(${stampSecNow})/`,
            wire_method: wireType,
        };
        const contractTermsHash = yield ws.cryptoApi.hashString(helpers.canonicalJson(contractTerms));
        const payCoinInfo = yield ws.cryptoApi.signDeposit(contractTerms, cds, Amounts.parseOrThrow(contractTerms.amount));
        logger.trace("pci", payCoinInfo);
        const coins = payCoinInfo.sigs.map(s => ({ coinPaySig: s }));
        const coinsReturnRecord = {
            coins,
            contractTerms,
            contractTermsHash,
            exchange: exchange.baseUrl,
            merchantPriv: priv,
            wire: req.senderWire,
        };
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coinsReturns, dbTypes.Stores.coins], (tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.put(dbTypes.Stores.coinsReturns, coinsReturnRecord);
            for (let c of payCoinInfo.updatedCoins) {
                yield tx.put(dbTypes.Stores.coins, c);
            }
        }));
        ws.badge.showNotification();
        ws.notifier.notify();
        depositReturnedCoins(ws, coinsReturnRecord);
    });
}
exports.returnCoins = returnCoins;
function depositReturnedCoins(ws, coinsReturnRecord) {
    return __awaiter(this, void 0, void 0, function* () {
        for (const c of coinsReturnRecord.coins) {
            if (c.depositedSig) {
                continue;
            }
            const req = {
                H_wire: coinsReturnRecord.contractTerms.H_wire,
                coin_pub: c.coinPaySig.coin_pub,
                coin_sig: c.coinPaySig.coin_sig,
                contribution: c.coinPaySig.contribution,
                denom_pub: c.coinPaySig.denom_pub,
                h_contract_terms: coinsReturnRecord.contractTermsHash,
                merchant_pub: coinsReturnRecord.contractTerms.merchant_pub,
                pay_deadline: coinsReturnRecord.contractTerms.pay_deadline,
                refund_deadline: coinsReturnRecord.contractTerms.refund_deadline,
                timestamp: coinsReturnRecord.contractTerms.timestamp,
                ub_sig: c.coinPaySig.ub_sig,
                wire: coinsReturnRecord.wire,
                wire_transfer_deadline: coinsReturnRecord.contractTerms.pay_deadline,
            };
            logger.trace("req", req);
            const reqUrl = new URL("deposit", coinsReturnRecord.exchange);
            const resp = yield ws.http.postJson(reqUrl.href, req);
            if (resp.status !== 200) {
                console.error("deposit failed due to status code", resp);
                continue;
            }
            const respJson = resp.responseJson;
            if (respJson.status !== "DEPOSIT_OK") {
                console.error("deposit failed", resp);
                continue;
            }
            if (!respJson.sig) {
                console.error("invalid 'sig' field", resp);
                continue;
            }
            // FIXME: verify signature
            // For every successful deposit, we replace the old record with an updated one
            const currentCrr = yield query.oneShotGet(ws.db, dbTypes.Stores.coinsReturns, coinsReturnRecord.contractTermsHash);
            if (!currentCrr) {
                console.error("database inconsistent");
                continue;
            }
            for (const nc of currentCrr.coins) {
                if (nc.coinPaySig.coin_pub === c.coinPaySig.coin_pub) {
                    nc.depositedSig = respJson.sig;
                }
            }
            yield query.oneShotPut(ws.db, dbTypes.Stores.coinsReturns, currentCrr);
            ws.notifier.notify();
        }
    });
}

});

unwrapExports(_return);
var _return_1 = _return.returnCoins;

var payback_1 = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Imports.
 */





const logger = new logging.Logger("payback.ts");
function payback(ws, coinPub) {
    return __awaiter(this, void 0, void 0, function* () {
        let coin = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, coinPub);
        if (!coin) {
            throw Error(`Coin ${coinPub} not found, can't request payback`);
        }
        const reservePub = coin.reservePub;
        if (!reservePub) {
            throw Error(`Can't request payback for a refreshed coin`);
        }
        const reserve = yield query.oneShotGet(ws.db, dbTypes.Stores.reserves, reservePub);
        if (!reserve) {
            throw Error(`Reserve of coin ${coinPub} not found`);
        }
        switch (coin.status) {
            case dbTypes.CoinStatus.Dormant:
                throw Error(`Can't do payback for coin ${coinPub} since it's dormant`);
        }
        coin.status = dbTypes.CoinStatus.Dormant;
        // Even if we didn't get the payback yet, we suspend withdrawal, since
        // technically we might update reserve status before we get the response
        // from the reserve for the payback request.
        reserve.hasPayback = true;
        yield query.runWithWriteTransaction(ws.db, [dbTypes.Stores.coins, dbTypes.Stores.reserves], (tx) => __awaiter(this, void 0, void 0, function* () {
            yield tx.put(dbTypes.Stores.coins, coin);
            yield tx.put(dbTypes.Stores.reserves, reserve);
        }));
        ws.notifier.notify();
        const paybackRequest = yield ws.cryptoApi.createPaybackRequest(coin);
        const reqUrl = new URL("payback", coin.exchangeBaseUrl);
        const resp = yield ws.http.postJson(reqUrl.href, paybackRequest);
        if (resp.status !== 200) {
            throw Error();
        }
        const paybackConfirmation = talerTypes.PaybackConfirmation.checked(resp.responseJson);
        if (paybackConfirmation.reserve_pub !== coin.reservePub) {
            throw Error(`Coin's reserve doesn't match reserve on payback`);
        }
        coin = yield query.oneShotGet(ws.db, dbTypes.Stores.coins, coinPub);
        if (!coin) {
            throw Error(`Coin ${coinPub} not found, can't confirm payback`);
        }
        coin.status = dbTypes.CoinStatus.Dormant;
        yield query.oneShotPut(ws.db, dbTypes.Stores.coins, coin);
        ws.notifier.notify();
        yield exchanges.updateExchangeFromUrl(ws, coin.exchangeBaseUrl, true);
    });
}
exports.payback = payback;

});

unwrapExports(payback_1);
var payback_2 = payback_1.payback;

var wallet = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2015-2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * High-level wallet operations that should be indepentent from the underlying
 * browser extension interface.
 */
/**
 * Imports.
 */


const Amounts = __importStar(amounts);








const reserves_2 = reserves;

const withdraw_2 = withdraw;








/**
 * Wallet protocol version spoken with the exchange
 * and merchant.
 *
 * Uses libtool's current:revision:age versioning.
 */
exports.WALLET_PROTOCOL_VERSION = "3:0:0";
exports.WALLET_CACHE_BREAKER_CLIENT_VERSION = "3";
const builtinCurrencies = [
    {
        auditors: [
            {
                auditorPub: "BW9DC48PHQY4NH011SHHX36DZZ3Q22Y6X7FZ1VD1CMZ2PTFZ6PN0",
                baseUrl: "https://auditor.demo.taler.net/",
                expirationStamp: new Date(2027, 1).getTime(),
            },
        ],
        exchanges: [],
        fractionalDigits: 2,
        name: "KUDOS",
    },
];
/**
 * This error is thrown when an
 */
class OperationFailedAndReportedError extends Error {
    constructor(message) {
        super(message);
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, OperationFailedAndReportedError.prototype);
    }
}
exports.OperationFailedAndReportedError = OperationFailedAndReportedError;
const logger = new logging.Logger("wallet.ts");
/**
 * The platform-independent wallet implementation.
 */
class Wallet {
    constructor(db, http, badge, notifier, cryptoWorkerFactory) {
        this.timerGroup = new timer.TimerGroup();
        this.latch = new promiseUtils.AsyncCondition();
        this.stopped = false;
        this.ws = {
            badge,
            cachedNextUrl: {},
            cryptoApi: new cryptoApi.CryptoApi(cryptoWorkerFactory),
            db,
            http,
            notifier,
            speculativePayData: undefined,
            memoProcessReserve: new asyncMemo.AsyncOpMemo(),
            memoMakePlanchet: new asyncMemo.AsyncOpMemo(),
        };
    }
    get db() {
        return this.ws.db;
    }
    get badge() {
        return this.ws.badge;
    }
    get cryptoApi() {
        return this.ws.cryptoApi;
    }
    get notifier() {
        return this.ws.notifier;
    }
    getExchangePaytoUri(exchangeBaseUrl, supportedTargetTypes) {
        return exchanges.getExchangePaytoUri(this.ws, exchangeBaseUrl, supportedTargetTypes);
    }
    getWithdrawDetailsForAmount(baseUrl, amount) {
        return withdraw.getWithdrawDetailsForAmount(this.ws, baseUrl, amount);
    }
    /**
     * Execute one operation based on the pending operation info record.
     */
    processOnePendingOperation(pending, forceNow = false) {
        return __awaiter(this, void 0, void 0, function* () {
            switch (pending.type) {
                case "bug":
                    return;
                case "dirty-coin":
                    yield refresh_1.refresh(this.ws, pending.coinPub);
                    break;
                case "exchange-update":
                    yield exchanges.updateExchangeFromUrl(this.ws, pending.exchangeBaseUrl);
                    break;
                case "refresh":
                    yield refresh_1.processRefreshSession(this.ws, pending.refreshSessionId);
                    break;
                case "reserve":
                    yield reserves.processReserve(this.ws, pending.reservePub);
                    break;
                case "withdraw":
                    yield withdraw_2.processWithdrawSession(this.ws, pending.withdrawSessionId);
                    break;
                case "proposal-choice":
                    // Nothing to do, user needs to accept/reject
                    break;
                case "proposal-download":
                    yield pay.processDownloadProposal(this.ws, pending.proposalId);
                    break;
                case "tip":
                    yield tip.processTip(this.ws, pending.tipId);
                    break;
                case "pay":
                    break;
                default:
                    assertUnreachable_1.assertUnreachable(pending);
            }
        });
    }
    /**
     * Process pending operations.
     */
    runPending(forceNow = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const pendingOpsResponse = yield this.getPendingOperations();
            for (const p of pendingOpsResponse.pendingOperations) {
                try {
                    yield this.processOnePendingOperation(p, forceNow);
                }
                catch (e) {
                    console.error(e);
                }
            }
        });
    }
    /**
     * Process pending operations and wait for scheduled operations in
     * a loop until the wallet is stopped explicitly.
     */
    runLoopScheduledRetries() {
        return __awaiter(this, void 0, void 0, function* () {
            while (!this.stopped) {
                console.log("running wallet retry loop iteration");
                let pending = yield this.getPendingOperations();
                console.log("waiting for", pending.nextRetryDelay);
                const timeout = this.timerGroup.resolveAfter(pending.nextRetryDelay.d_ms);
                yield Promise.race([timeout, this.latch.wait()]);
                pending = yield this.getPendingOperations();
                for (const p of pending.pendingOperations) {
                    try {
                        this.processOnePendingOperation(p);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
    }
    /**
     * Run until all coins have been withdrawn from the given reserve,
     * or an error has occured.
     */
    runUntilReserveDepleted(reservePub) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                const r = yield this.getPendingOperations();
                const allPending = r.pendingOperations;
                const relevantPending = allPending.filter(x => {
                    switch (x.type) {
                        case "reserve":
                            return x.reservePub === reservePub;
                        case "withdraw":
                            return (x.source.type === "reserve" && x.source.reservePub === reservePub);
                        default:
                            return false;
                    }
                });
                if (relevantPending.length === 0) {
                    return;
                }
                for (const p of relevantPending) {
                    yield this.processOnePendingOperation(p);
                }
            }
        });
    }
    /**
     * Insert the hard-coded defaults for exchanges, coins and
     * auditors into the database, unless these defaults have
     * already been applied.
     */
    fillDefaults() {
        return __awaiter(this, void 0, void 0, function* () {
            yield query.runWithWriteTransaction(this.db, [dbTypes.Stores.config, dbTypes.Stores.currencies], (tx) => __awaiter(this, void 0, void 0, function* () {
                let applied = false;
                yield tx.iter(dbTypes.Stores.config).forEach(x => {
                    if (x.key == "currencyDefaultsApplied" && x.value == true) {
                        applied = true;
                    }
                });
                if (!applied) {
                    for (let c of builtinCurrencies) {
                        yield tx.put(dbTypes.Stores.currencies, c);
                    }
                }
            }));
        });
    }
    /**
     * Check if a payment for the given taler://pay/ URI is possible.
     *
     * If the payment is possible, the signature are already generated but not
     * yet send to the merchant.
     */
    preparePay(talerPayUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return pay.preparePay(this.ws, talerPayUri);
        });
    }
    /**
     * Refresh all dirty coins.
     * The returned promise resolves only after all refresh
     * operations have completed.
     */
    refreshDirtyCoins() {
        return __awaiter(this, void 0, void 0, function* () {
            let n = 0;
            const coins = yield query.oneShotIter(this.db, dbTypes.Stores.coins).toArray();
            for (let coin of coins) {
                if (coin.status == dbTypes.CoinStatus.Dirty) {
                    try {
                        yield this.refresh(coin.coinPub);
                    }
                    catch (e) {
                        console.log("error during refresh");
                    }
                    n += 1;
                }
            }
            return { numRefreshed: n };
        });
    }
    /**
     * Add a contract to the wallet and sign coins, and send them.
     */
    confirmPay(proposalId, sessionIdOverride) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield pay.confirmPay(this.ws, proposalId, sessionIdOverride);
            }
            finally {
                this.latch.trigger();
            }
        });
    }
    /**
     * First fetch information requred to withdraw from the reserve,
     * then deplete the reserve, withdrawing coins until it is empty.
     *
     * The returned promise resolves once the reserve is set to the
     * state DORMANT.
     */
    processReserve(reservePub) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield reserves.processReserve(this.ws, reservePub);
            }
            finally {
                this.latch.trigger();
            }
        });
    }
    /**
     * Create a reserve, but do not flag it as confirmed yet.
     *
     * Adds the corresponding exchange as a trusted exchange if it is neither
     * audited nor trusted already.
     */
    createReserve(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return reserves_2.createReserve(this.ws, req);
            }
            finally {
                this.latch.trigger();
            }
        });
    }
    /**
     * Mark an existing reserve as confirmed.  The wallet will start trying
     * to withdraw from that reserve.  This may not immediately succeed,
     * since the exchange might not know about the reserve yet, even though the
     * bank confirmed its creation.
     *
     * A confirmed reserve should be shown to the user in the UI, while
     * an unconfirmed reserve should be hidden.
     */
    confirmReserve(req) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return reserves_2.confirmReserve(this.ws, req);
            }
            finally {
                this.latch.trigger();
            }
        });
    }
    /**
     * Check if and how an exchange is trusted and/or audited.
     */
    getExchangeTrust(exchangeInfo) {
        return __awaiter(this, void 0, void 0, function* () {
            return exchanges.getExchangeTrust(this.ws, exchangeInfo);
        });
    }
    getWithdrawDetailsForUri(talerWithdrawUri, maybeSelectedExchange) {
        return __awaiter(this, void 0, void 0, function* () {
            return withdraw.getWithdrawDetailsForUri(this.ws, talerWithdrawUri, maybeSelectedExchange);
        });
    }
    /**
     * Update or add exchange DB entry by fetching the /keys and /wire information.
     * Optionally link the reserve entry to the new or existing
     * exchange entry in then DB.
     */
    updateExchangeFromUrl(baseUrl, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return exchanges.updateExchangeFromUrl(this.ws, baseUrl, force);
        });
    }
    /**
     * Get detailed balance information, sliced by exchange and by currency.
     */
    getBalances() {
        return __awaiter(this, void 0, void 0, function* () {
            return balance.getBalances(this.ws);
        });
    }
    refresh(oldCoinPub, force = false) {
        return __awaiter(this, void 0, void 0, function* () {
            return refresh_1.refresh(this.ws, oldCoinPub, force);
        });
    }
    findExchange(exchangeBaseUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotGet(this.db, dbTypes.Stores.exchanges, exchangeBaseUrl);
        });
    }
    /**
     * Retrive the full event history for this wallet.
     */
    getHistory(historyQuery) {
        return __awaiter(this, void 0, void 0, function* () {
            return history.getHistory(this.ws, historyQuery);
        });
    }
    getPendingOperations() {
        return __awaiter(this, void 0, void 0, function* () {
            return pending.getPendingOperations(this.ws);
        });
    }
    getDenoms(exchangeUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            const denoms = yield query.oneShotIterIndex(this.db, dbTypes.Stores.denominations.exchangeBaseUrlIndex, exchangeUrl).toArray();
            return denoms;
        });
    }
    getProposal(proposalId) {
        return __awaiter(this, void 0, void 0, function* () {
            const proposal = yield query.oneShotGet(this.db, dbTypes.Stores.proposals, proposalId);
            return proposal;
        });
    }
    getExchanges() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.exchanges).toArray();
        });
    }
    getCurrencies() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.currencies).toArray();
        });
    }
    updateCurrency(currencyRecord) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.trace("updating currency to", currencyRecord);
            yield query.oneShotPut(this.db, dbTypes.Stores.currencies, currencyRecord);
            this.notifier.notify();
        });
    }
    getReserves(exchangeBaseUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.reserves).filter(r => r.exchangeBaseUrl === exchangeBaseUrl);
        });
    }
    getCoinsForExchange(exchangeBaseUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.coins).filter(c => c.exchangeBaseUrl === exchangeBaseUrl);
        });
    }
    getCoins() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.coins).toArray();
        });
    }
    payback(coinPub) {
        return __awaiter(this, void 0, void 0, function* () {
            return payback_1.payback(this.ws, coinPub);
        });
    }
    getPaybackReserves() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield query.oneShotIter(this.db, dbTypes.Stores.reserves).filter(r => r.hasPayback);
        });
    }
    /**
     * Stop ongoing processing.
     */
    stop() {
        this.stopped = true;
        this.timerGroup.stopCurrentAndFutureTimers();
        this.cryptoApi.stop();
    }
    getSenderWireInfos() {
        return __awaiter(this, void 0, void 0, function* () {
            const m = {};
            yield query.oneShotIter(this.db, dbTypes.Stores.exchanges).forEach(x => {
                const wi = x.wireInfo;
                if (!wi) {
                    return;
                }
                const s = (m[x.baseUrl] = m[x.baseUrl] || new Set());
                Object.keys(wi.feesForType).map(k => s.add(k));
            });
            const exchangeWireTypes = {};
            Object.keys(m).map(e => {
                exchangeWireTypes[e] = Array.from(m[e]);
            });
            const senderWiresSet = new Set();
            yield query.oneShotIter(this.db, dbTypes.Stores.senderWires).forEach(x => {
                senderWiresSet.add(x.paytoUri);
            });
            const senderWires = Array.from(senderWiresSet);
            return {
                exchangeWireTypes,
                senderWires,
            };
        });
    }
    /**
     * Trigger paying coins back into the user's account.
     */
    returnCoins(req) {
        return __awaiter(this, void 0, void 0, function* () {
            return _return.returnCoins(this.ws, req);
        });
    }
    /**
     * Accept a refund, return the contract hash for the contract
     * that was involved in the refund.
     */
    applyRefund(talerRefundUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return pay.applyRefund(this.ws, talerRefundUri);
        });
    }
    getPurchase(contractTermsHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return query.oneShotGet(this.db, dbTypes.Stores.purchases, contractTermsHash);
        });
    }
    getFullRefundFees(refundPermissions) {
        return __awaiter(this, void 0, void 0, function* () {
            return pay.getFullRefundFees(this.ws, refundPermissions);
        });
    }
    acceptTip(talerTipUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return tip.acceptTip(this.ws, talerTipUri);
        });
    }
    getTipStatus(talerTipUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return tip.getTipStatus(this.ws, talerTipUri);
        });
    }
    abortFailedPayment(contractTermsHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return pay.abortFailedPayment(this.ws, contractTermsHash);
        });
    }
    handleNotifyReserve() {
        return __awaiter(this, void 0, void 0, function* () {
            const reserves = yield query.oneShotIter(this.db, dbTypes.Stores.reserves).toArray();
            for (const r of reserves) {
                if (r.reserveStatus === dbTypes.ReserveRecordStatus.WAIT_CONFIRM_BANK) {
                    try {
                        this.processReserve(r.reservePub);
                    }
                    catch (e) {
                        console.error(e);
                    }
                }
            }
        });
    }
    /**
     * Remove unreferenced / expired data from the wallet's database
     * based on the current system time.
     */
    collectGarbage() {
        return __awaiter(this, void 0, void 0, function* () {
            // FIXME(#5845)
            // We currently do not garbage-collect the wallet database.  This might change
            // after the feature has been properly re-designed, and we have come up with a
            // strategy to test it.
        });
    }
    /**
     * Get information about a withdrawal from
     * a taler://withdraw URI.
     */
    getWithdrawalInfo(talerWithdrawUri) {
        return __awaiter(this, void 0, void 0, function* () {
            return withdraw.getWithdrawalInfo(this.ws, talerWithdrawUri);
        });
    }
    acceptWithdrawal(talerWithdrawUri, selectedExchange) {
        return __awaiter(this, void 0, void 0, function* () {
            return withdraw.acceptWithdrawal(this.ws, talerWithdrawUri, selectedExchange);
        });
    }
    getPurchaseDetails(hc) {
        return __awaiter(this, void 0, void 0, function* () {
            const purchase = yield query.oneShotGet(this.db, dbTypes.Stores.purchases, hc);
            if (!purchase) {
                throw Error("unknown purchase");
            }
            const refundsDoneAmounts = Object.values(purchase.refundsDone).map(x => Amounts.parseOrThrow(x.refund_amount));
            const refundsPendingAmounts = Object.values(purchase.refundsPending).map(x => Amounts.parseOrThrow(x.refund_amount));
            const totalRefundAmount = Amounts.sum([
                ...refundsDoneAmounts,
                ...refundsPendingAmounts,
            ]).amount;
            const refundsDoneFees = Object.values(purchase.refundsDone).map(x => Amounts.parseOrThrow(x.refund_amount));
            const refundsPendingFees = Object.values(purchase.refundsPending).map(x => Amounts.parseOrThrow(x.refund_amount));
            const totalRefundFees = Amounts.sum([
                ...refundsDoneFees,
                ...refundsPendingFees,
            ]).amount;
            const totalFees = totalRefundFees;
            return {
                contractTerms: purchase.contractTerms,
                hasRefund: purchase.timestamp_refund !== undefined,
                totalRefundAmount: totalRefundAmount,
                totalRefundAndRefreshFees: totalFees,
            };
        });
    }
    clearNotification() {
        this.badge.clearNotification();
    }
    benchmarkCrypto(repetitions) {
        return this.cryptoApi.benchmark(repetitions);
    }
}
exports.Wallet = Wallet;

});

unwrapExports(wallet);
var wallet_1 = wallet.WALLET_PROTOCOL_VERSION;
var wallet_2 = wallet.WALLET_CACHE_BREAKER_CLIENT_VERSION;
var wallet_3 = wallet.OperationFailedAndReportedError;
var wallet_4 = wallet.Wallet;

var errors = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
/* tslint:disable: max-classes-per-file max-line-length */
var messages = {
    AbortError: "A request was aborted, for example through a call to IDBTransaction.abort.",
    ConstraintError: "A mutation operation in the transaction failed because a constraint was not satisfied. For example, an object such as an object store or index already exists and a request attempted to create a new one.",
    DataCloneError: "The data being stored could not be cloned by the internal structured cloning algorithm.",
    DataError: "Data provided to an operation does not meet requirements.",
    InvalidAccessError: "An invalid operation was performed on an object. For example transaction creation attempt was made, but an empty scope was provided.",
    InvalidStateError: "An operation was called on an object on which it is not allowed or at a time when it is not allowed. Also occurs if a request is made on a source object that has been deleted or removed. Use TransactionInactiveError or ReadOnlyError when possible, as they are more specific variations of InvalidStateError.",
    NotFoundError: "The operation failed because the requested database object could not be found. For example, an object store did not exist but was being opened.",
    ReadOnlyError: 'The mutating operation was attempted in a "readonly" transaction.',
    TransactionInactiveError: "A request was placed against a transaction which is currently not active, or which is finished.",
    VersionError: "An attempt was made to open a database using a lower version than the existing version.",
};
var AbortError = /** @class */ (function (_super) {
    __extends(AbortError, _super);
    function AbortError(message) {
        if (message === void 0) { message = messages.AbortError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, ConstraintError.prototype);
        _this.name = "AbortError";
        _this.message = message;
        return _this;
    }
    return AbortError;
}(Error));
exports.AbortError = AbortError;
var ConstraintError = /** @class */ (function (_super) {
    __extends(ConstraintError, _super);
    function ConstraintError(message) {
        if (message === void 0) { message = messages.ConstraintError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, ConstraintError.prototype);
        _this.name = "ConstraintError";
        _this.message = message;
        return _this;
    }
    return ConstraintError;
}(Error));
exports.ConstraintError = ConstraintError;
var DataCloneError = /** @class */ (function (_super) {
    __extends(DataCloneError, _super);
    function DataCloneError(message) {
        if (message === void 0) { message = messages.DataCloneError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, DataCloneError.prototype);
        _this.name = "DataCloneError";
        _this.message = message;
        return _this;
    }
    return DataCloneError;
}(Error));
exports.DataCloneError = DataCloneError;
var DataError = /** @class */ (function (_super) {
    __extends(DataError, _super);
    function DataError(message) {
        if (message === void 0) { message = messages.DataError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, DataError.prototype);
        _this.name = "DataError";
        _this.message = message;
        return _this;
    }
    return DataError;
}(Error));
exports.DataError = DataError;
var InvalidAccessError = /** @class */ (function (_super) {
    __extends(InvalidAccessError, _super);
    function InvalidAccessError(message) {
        if (message === void 0) { message = messages.InvalidAccessError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, InvalidAccessError.prototype);
        _this.name = "InvalidAccessError";
        _this.message = message;
        return _this;
    }
    return InvalidAccessError;
}(Error));
exports.InvalidAccessError = InvalidAccessError;
var InvalidStateError = /** @class */ (function (_super) {
    __extends(InvalidStateError, _super);
    function InvalidStateError(message) {
        if (message === void 0) { message = messages.InvalidStateError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, InvalidStateError.prototype);
        _this.name = "InvalidStateError";
        _this.message = message;
        return _this;
    }
    return InvalidStateError;
}(Error));
exports.InvalidStateError = InvalidStateError;
var NotFoundError = /** @class */ (function (_super) {
    __extends(NotFoundError, _super);
    function NotFoundError(message) {
        if (message === void 0) { message = messages.NotFoundError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, NotFoundError.prototype);
        _this.name = "NotFoundError";
        _this.message = message;
        return _this;
    }
    return NotFoundError;
}(Error));
exports.NotFoundError = NotFoundError;
var ReadOnlyError = /** @class */ (function (_super) {
    __extends(ReadOnlyError, _super);
    function ReadOnlyError(message) {
        if (message === void 0) { message = messages.ReadOnlyError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, ReadOnlyError.prototype);
        _this.name = "ReadOnlyError";
        _this.message = message;
        return _this;
    }
    return ReadOnlyError;
}(Error));
exports.ReadOnlyError = ReadOnlyError;
var TransactionInactiveError = /** @class */ (function (_super) {
    __extends(TransactionInactiveError, _super);
    function TransactionInactiveError(message) {
        if (message === void 0) { message = messages.TransactionInactiveError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, TransactionInactiveError.prototype);
        _this.name = "TransactionInactiveError";
        _this.message = message;
        return _this;
    }
    return TransactionInactiveError;
}(Error));
exports.TransactionInactiveError = TransactionInactiveError;
var VersionError = /** @class */ (function (_super) {
    __extends(VersionError, _super);
    function VersionError(message) {
        if (message === void 0) { message = messages.VersionError; }
        var _this = _super.call(this) || this;
        Object.setPrototypeOf(_this, VersionError.prototype);
        _this.name = "VersionError";
        _this.message = message;
        return _this;
    }
    return VersionError;
}(Error));
exports.VersionError = VersionError;

});

unwrapExports(errors);
var errors_1 = errors.AbortError;
var errors_2 = errors.ConstraintError;
var errors_3 = errors.DataCloneError;
var errors_4 = errors.DataError;
var errors_5 = errors.InvalidAccessError;
var errors_6 = errors.InvalidStateError;
var errors_7 = errors.NotFoundError;
var errors_8 = errors.ReadOnlyError;
var errors_9 = errors.TransactionInactiveError;
var errors_10 = errors.VersionError;

var valueToKey_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

// https://w3c.github.io/IndexedDB/#convert-a-value-to-a-input
function valueToKey(input, seen) {
    if (typeof input === "number") {
        if (isNaN(input)) {
            throw new errors.DataError();
        }
        return input;
    }
    else if (input instanceof Date) {
        var ms = input.valueOf();
        if (isNaN(ms)) {
            throw new errors.DataError();
        }
        return new Date(ms);
    }
    else if (typeof input === "string") {
        return input;
    }
    else if (input instanceof ArrayBuffer ||
        (typeof ArrayBuffer !== "undefined" &&
            ArrayBuffer.isView &&
            ArrayBuffer.isView(input))) {
        if (input instanceof ArrayBuffer) {
            return new Uint8Array(input).buffer;
        }
        return new Uint8Array(input.buffer).buffer;
    }
    else if (Array.isArray(input)) {
        if (seen === undefined) {
            seen = new Set();
        }
        else if (seen.has(input)) {
            throw new errors.DataError();
        }
        seen.add(input);
        var keys = [];
        for (var i = 0; i < input.length; i++) {
            var hop = input.hasOwnProperty(i);
            if (!hop) {
                throw new errors.DataError();
            }
            var entry = input[i];
            var key = valueToKey(entry, seen);
            keys.push(key);
        }
        return keys;
    }
    else {
        throw new errors.DataError();
    }
}
exports.default = valueToKey;

});

unwrapExports(valueToKey_1);

var cmp = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });


var getType = function (x) {
    if (typeof x === "number") {
        return "Number";
    }
    if (x instanceof Date) {
        return "Date";
    }
    if (Array.isArray(x)) {
        return "Array";
    }
    if (typeof x === "string") {
        return "String";
    }
    if (x instanceof ArrayBuffer) {
        return "Binary";
    }
    throw new errors.DataError();
};
// https://w3c.github.io/IndexedDB/#compare-two-keys
var compareKeys = function (first, second) {
    if (second === undefined) {
        throw new TypeError();
    }
    first = valueToKey_1.default(first);
    second = valueToKey_1.default(second);
    var t1 = getType(first);
    var t2 = getType(second);
    if (t1 !== t2) {
        if (t1 === "Array") {
            return 1;
        }
        if (t1 === "Binary" &&
            (t2 === "String" || t2 === "Date" || t2 === "Number")) {
            return 1;
        }
        if (t1 === "String" && (t2 === "Date" || t2 === "Number")) {
            return 1;
        }
        if (t1 === "Date" && t2 === "Number") {
            return 1;
        }
        return -1;
    }
    if (t1 === "Binary") {
        first = new Uint8Array(first);
        second = new Uint8Array(second);
    }
    if (t1 === "Array" || t1 === "Binary") {
        var length = Math.min(first.length, second.length);
        for (var i = 0; i < length; i++) {
            var result = compareKeys(first[i], second[i]);
            if (result !== 0) {
                return result;
            }
        }
        if (first.length > second.length) {
            return 1;
        }
        if (first.length < second.length) {
            return -1;
        }
        return 0;
    }
    if (t1 === "Date") {
        if (first.getTime() === second.getTime()) {
            return 0;
        }
    }
    else {
        if (first === second) {
            return 0;
        }
    }
    return first > second ? 1 : -1;
};
exports.default = compareKeys;

});

unwrapExports(cmp);

var BridgeIDBKeyRange_1 = createCommonjsModule(function (module, exports) {
/*
  Copyright 2019 Florian Dold
  Copyright 2017 Jeremy Scheff

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
  or implied. See the License for the specific language governing
  permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });



// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#range-concept
var BridgeIDBKeyRange = /** @class */ (function () {
    function BridgeIDBKeyRange(lower, upper, lowerOpen, upperOpen) {
        this.lower = lower;
        this.upper = upper;
        this.lowerOpen = lowerOpen;
        this.upperOpen = upperOpen;
    }
    BridgeIDBKeyRange.only = function (value) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        value = valueToKey_1.default(value);
        return new BridgeIDBKeyRange(value, value, false, false);
    };
    BridgeIDBKeyRange.lowerBound = function (lower, open) {
        if (open === void 0) { open = false; }
        if (arguments.length === 0) {
            throw new TypeError();
        }
        lower = valueToKey_1.default(lower);
        return new BridgeIDBKeyRange(lower, undefined, open, true);
    };
    BridgeIDBKeyRange.upperBound = function (upper, open) {
        if (open === void 0) { open = false; }
        if (arguments.length === 0) {
            throw new TypeError();
        }
        upper = valueToKey_1.default(upper);
        return new BridgeIDBKeyRange(undefined, upper, true, open);
    };
    BridgeIDBKeyRange.bound = function (lower, upper, lowerOpen, upperOpen) {
        if (lowerOpen === void 0) { lowerOpen = false; }
        if (upperOpen === void 0) { upperOpen = false; }
        if (arguments.length < 2) {
            throw new TypeError();
        }
        var cmpResult = cmp.default(lower, upper);
        if (cmpResult === 1 || (cmpResult === 0 && (lowerOpen || upperOpen))) {
            throw new errors.DataError();
        }
        lower = valueToKey_1.default(lower);
        upper = valueToKey_1.default(upper);
        return new BridgeIDBKeyRange(lower, upper, lowerOpen, upperOpen);
    };
    // https://w3c.github.io/IndexedDB/#dom-idbkeyrange-includes
    BridgeIDBKeyRange.prototype.includes = function (key) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        key = valueToKey_1.default(key);
        if (this.lower !== undefined) {
            var cmpResult = cmp.default(this.lower, key);
            if (cmpResult === 1 || (cmpResult === 0 && this.lowerOpen)) {
                return false;
            }
        }
        if (this.upper !== undefined) {
            var cmpResult = cmp.default(this.upper, key);
            if (cmpResult === -1 || (cmpResult === 0 && this.upperOpen)) {
                return false;
            }
        }
        return true;
    };
    BridgeIDBKeyRange.prototype.toString = function () {
        return "[object IDBKeyRange]";
    };
    BridgeIDBKeyRange._valueToKeyRange = function (value, nullDisallowedFlag) {
        if (nullDisallowedFlag === void 0) { nullDisallowedFlag = false; }
        if (value instanceof BridgeIDBKeyRange) {
            return value;
        }
        if (value === null || value === undefined) {
            if (nullDisallowedFlag) {
                throw new errors.DataError();
            }
            return new BridgeIDBKeyRange(undefined, undefined, false, false);
        }
        var key = valueToKey_1.default(value);
        return BridgeIDBKeyRange.only(key);
    };
    return BridgeIDBKeyRange;
}());
exports.default = BridgeIDBKeyRange;

});

unwrapExports(BridgeIDBKeyRange_1);

var structuredClone_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
function structuredCloneImpl(val, visited) {
    // FIXME: replace with real implementation!
    return JSON.parse(JSON.stringify(val));
}
/**
 * Structured clone for IndexedDB.
 */
function structuredClone(val) {
    return structuredCloneImpl(val);
}
exports.structuredClone = structuredClone;
exports.default = structuredClone;

});

unwrapExports(structuredClone_1);
var structuredClone_2 = structuredClone_1.structuredClone;

var backendInterface = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
var ResultLevel;
(function (ResultLevel) {
    ResultLevel[ResultLevel["OnlyCount"] = 0] = "OnlyCount";
    ResultLevel[ResultLevel["OnlyKeys"] = 1] = "OnlyKeys";
    ResultLevel[ResultLevel["Full"] = 2] = "Full";
})(ResultLevel = exports.ResultLevel || (exports.ResultLevel = {}));
var StoreLevel;
(function (StoreLevel) {
    StoreLevel[StoreLevel["NoOverwrite"] = 0] = "NoOverwrite";
    StoreLevel[StoreLevel["AllowOverwrite"] = 1] = "AllowOverwrite";
    StoreLevel[StoreLevel["UpdateExisting"] = 2] = "UpdateExisting";
})(StoreLevel = exports.StoreLevel || (exports.StoreLevel = {}));

});

unwrapExports(backendInterface);
var backendInterface_1 = backendInterface.ResultLevel;
var backendInterface_2 = backendInterface.StoreLevel;

var BridgeIDBCursor_1 = createCommonjsModule(function (module, exports) {
/*

 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });








/**
 * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#cursor
 */
var BridgeIDBCursor = /** @class */ (function () {
    function BridgeIDBCursor(source, objectStoreName, indexName, range, direction, request, keyOnly) {
        this._gotValue = false;
        this._indexPosition = undefined; // Key of previously returned record
        this._objectStorePosition = undefined;
        this._key = undefined;
        this._primaryKey = undefined;
        this._value = undefined;
        this._indexName = indexName;
        this._objectStoreName = objectStoreName;
        this._range = range;
        this._source = source;
        this._direction = direction;
        this._request = request;
        this._keyOnly = keyOnly;
    }
    Object.defineProperty(BridgeIDBCursor.prototype, "_effectiveObjectStore", {
        get: function () {
            if (this.source instanceof BridgeIDBObjectStore_1.default) {
                return this.source;
            }
            return this.source.objectStore;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "_backend", {
        get: function () {
            return this._source._backend;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "source", {
        // Read only properties
        get: function () {
            return this._source;
        },
        set: function (val) {
            /* For babel */
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "direction", {
        get: function () {
            return this._direction;
        },
        set: function (val) {
            /* For babel */
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "key", {
        get: function () {
            return this._key;
        },
        set: function (val) {
            /* For babel */
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "primaryKey", {
        get: function () {
            return this._primaryKey;
        },
        set: function (val) {
            /* For babel */
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursor.prototype, "_isValueCursor", {
        get: function () {
            return false;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * https://w3c.github.io/IndexedDB/#iterate-a-cursor
     */
    BridgeIDBCursor.prototype._iterate = function (key, primaryKey) {
        return __awaiter(this, void 0, void 0, function () {
            var recordGetRequest, btx, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        BridgeIDBFactory_1.default.enableTracing &&
                            console.log("iterating cursor os=" + this._objectStoreName + ",idx=" + this._indexName);
                        BridgeIDBFactory_1.default.enableTracing && console.log("cursor type ", this.toString());
                        recordGetRequest = {
                            direction: this.direction,
                            indexName: this._indexName,
                            lastIndexPosition: this._indexPosition,
                            lastObjectStorePosition: this._objectStorePosition,
                            limit: 1,
                            range: this._range,
                            objectStoreName: this._objectStoreName,
                            advanceIndexKey: key,
                            advancePrimaryKey: primaryKey,
                            resultLevel: this._keyOnly ? backendInterface.ResultLevel.OnlyKeys : backendInterface.ResultLevel.Full,
                        };
                        btx = this.source._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, recordGetRequest)];
                    case 1:
                        response = _a.sent();
                        if (response.count === 0) {
                            if (BridgeIDBFactory_1.default.enableTracing) {
                                console.log("cursor is returning empty result");
                            }
                            this._gotValue = false;
                            return [2 /*return*/, null];
                        }
                        if (response.count !== 1) {
                            throw Error("invariant failed");
                        }
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("request is:", JSON.stringify(recordGetRequest));
                            console.log("get response is:", JSON.stringify(response));
                        }
                        if (this._indexName !== undefined) {
                            this._key = response.indexKeys[0];
                        }
                        else {
                            this._key = response.primaryKeys[0];
                        }
                        this._primaryKey = response.primaryKeys[0];
                        if (!this._keyOnly) {
                            this._value = response.values[0];
                        }
                        this._gotValue = true;
                        this._objectStorePosition = structuredClone_1.default(response.primaryKeys[0]);
                        if (response.indexKeys !== undefined && response.indexKeys.length > 0) {
                            this._indexPosition = structuredClone_1.default(response.indexKeys[0]);
                        }
                        return [2 /*return*/, this];
                }
            });
        });
    };
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-update-IDBRequest-any-value
    BridgeIDBCursor.prototype.update = function (value) {
        var _this = this;
        if (value === undefined) {
            throw new TypeError();
        }
        var transaction = this._effectiveObjectStore.transaction;
        if (transaction._state !== "active") {
            throw new errors.TransactionInactiveError();
        }
        if (transaction.mode === "readonly") {
            throw new errors.ReadOnlyError();
        }
        if (this._effectiveObjectStore._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!(this.source instanceof BridgeIDBObjectStore_1.default) &&
            this.source._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!this._gotValue || !this._isValueCursor) {
            throw new errors.InvalidStateError();
        }
        var storeReq = {
            key: this._primaryKey,
            value: value,
            objectStoreName: this._objectStoreName,
            storeLevel: backendInterface.StoreLevel.UpdateExisting,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("updating at cursor");
                        }
                        btx = this.source._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.storeRecord(btx, storeReq)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); };
        return transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    /**
     * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-advance-void-unsigned-long-count
     */
    BridgeIDBCursor.prototype.advance = function (count) {
        throw Error("not implemented");
    };
    /**
     * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBCursor-continue-void-any-key
     */
    BridgeIDBCursor.prototype.continue = function (key) {
        var _this = this;
        var transaction = this._effectiveObjectStore.transaction;
        if (transaction._state !== "active") {
            throw new errors.TransactionInactiveError();
        }
        if (this._effectiveObjectStore._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!(this.source instanceof BridgeIDBObjectStore_1.default) &&
            this.source._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!this._gotValue) {
            throw new errors.InvalidStateError();
        }
        if (key !== undefined) {
            key = valueToKey_1.default(key);
            var lastKey = this._indexName === undefined
                ? this._objectStorePosition
                : this._indexPosition;
            var cmpResult = cmp.default(key, lastKey);
            if ((cmpResult <= 0 &&
                (this.direction === "next" || this.direction === "nextunique")) ||
                (cmpResult >= 0 &&
                    (this.direction === "prev" || this.direction === "prevunique"))) {
                throw new errors.DataError();
            }
        }
        if (this._request) {
            this._request.readyState = "pending";
        }
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, this._iterate(key)];
            });
        }); };
        transaction._execRequestAsync({
            operation: operation,
            request: this._request,
            source: this.source,
        });
        this._gotValue = false;
    };
    // https://w3c.github.io/IndexedDB/#dom-idbcursor-continueprimarykey
    BridgeIDBCursor.prototype.continuePrimaryKey = function (key, primaryKey) {
        throw Error("not implemented");
    };
    BridgeIDBCursor.prototype.delete = function () {
        var _this = this;
        var transaction = this._effectiveObjectStore.transaction;
        if (transaction._state !== "active") {
            throw new errors.TransactionInactiveError();
        }
        if (transaction.mode === "readonly") {
            throw new errors.ReadOnlyError();
        }
        if (this._effectiveObjectStore._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!(this.source instanceof BridgeIDBObjectStore_1.default) &&
            this.source._deleted) {
            throw new errors.InvalidStateError();
        }
        if (!this._gotValue || !this._isValueCursor) {
            throw new errors.InvalidStateError();
        }
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx;
            return __generator(this, function (_a) {
                btx = this.source._confirmActiveTransaction().btx;
                this._backend.deleteRecord(btx, this._objectStoreName, BridgeIDBKeyRange_1.default._valueToKeyRange(this._primaryKey));
                return [2 /*return*/];
            });
        }); };
        return transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    BridgeIDBCursor.prototype.toString = function () {
        return "[object IDBCursor]";
    };
    return BridgeIDBCursor;
}());
exports.BridgeIDBCursor = BridgeIDBCursor;
exports.default = BridgeIDBCursor;

});

unwrapExports(BridgeIDBCursor_1);
var BridgeIDBCursor_2 = BridgeIDBCursor_1.BridgeIDBCursor;

var BridgeIDBCursorWithValue_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });

var BridgeIDBCursorWithValue = /** @class */ (function (_super) {
    __extends(BridgeIDBCursorWithValue, _super);
    function BridgeIDBCursorWithValue(source, objectStoreName, indexName, range, direction, request) {
        return _super.call(this, source, objectStoreName, indexName, range, direction, request, false) || this;
    }
    Object.defineProperty(BridgeIDBCursorWithValue.prototype, "value", {
        get: function () {
            return this._value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBCursorWithValue.prototype, "_isValueCursor", {
        get: function () {
            return true;
        },
        enumerable: true,
        configurable: true
    });
    BridgeIDBCursorWithValue.prototype.toString = function () {
        return "[object IDBCursorWithValue]";
    };
    return BridgeIDBCursorWithValue;
}(BridgeIDBCursor_1.default));
exports.default = BridgeIDBCursorWithValue;

});

unwrapExports(BridgeIDBCursorWithValue_1);

var FakeEventTarget_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });

var stopped = function (event, listener) {
    return (event.immediatePropagationStopped ||
        (event.eventPhase === event.CAPTURING_PHASE &&
            listener.capture === false) ||
        (event.eventPhase === event.BUBBLING_PHASE && listener.capture === true));
};
// http://www.w3.org/TR/dom/#concept-event-listener-invoke
var invokeEventListeners = function (event, obj) {
    event.currentTarget = obj;
    // The callback might cause obj.listeners to mutate as we traverse it.
    // Take a copy of the array so that nothing sneaks in and we don't lose
    // our place.
    for (var _i = 0, _a = obj.listeners.slice(); _i < _a.length; _i++) {
        var listener = _a[_i];
        if (event.type !== listener.type || stopped(event, listener)) {
            continue;
        }
        // @ts-ignore
        listener.callback.call(event.currentTarget, event);
    }
    var typeToProp = {
        abort: "onabort",
        blocked: "onblocked",
        complete: "oncomplete",
        error: "onerror",
        success: "onsuccess",
        upgradeneeded: "onupgradeneeded",
        versionchange: "onversionchange",
    };
    var prop = typeToProp[event.type];
    if (prop === undefined) {
        throw new Error("Unknown event type: \"" + event.type + "\"");
    }
    var callback = event.currentTarget[prop];
    if (callback) {
        var listener = {
            callback: callback,
            capture: false,
            type: event.type,
        };
        if (!stopped(event, listener)) {
            // @ts-ignore
            listener.callback.call(event.currentTarget, event);
        }
    }
};
var FakeEventTarget = /** @class */ (function () {
    function FakeEventTarget() {
        this.listeners = [];
    }
    FakeEventTarget.prototype.addEventListener = function (type, callback, capture) {
        if (capture === void 0) { capture = false; }
        this.listeners.push({
            callback: callback,
            capture: capture,
            type: type,
        });
    };
    FakeEventTarget.prototype.removeEventListener = function (type, callback, capture) {
        if (capture === void 0) { capture = false; }
        var i = this.listeners.findIndex(function (listener) {
            return (listener.type === type &&
                listener.callback === callback &&
                listener.capture === capture);
        });
        this.listeners.splice(i, 1);
    };
    // http://www.w3.org/TR/dom/#dispatching-events
    FakeEventTarget.prototype.dispatchEvent = function (event) {
        if (event.dispatched || !event.initialized) {
            throw new errors.InvalidStateError("The object is in an invalid state.");
        }
        event.isTrusted = false;
        event.dispatched = true;
        event.target = this;
        // NOT SURE WHEN THIS SHOULD BE SET        event.eventPath = [];
        event.eventPhase = event.CAPTURING_PHASE;
        if (FakeEventTarget.enableTracing) {
            console.log("dispatching '" + event.type + "' event along path with " + event.eventPath.length + " elements");
        }
        for (var _i = 0, _a = event.eventPath; _i < _a.length; _i++) {
            var obj = _a[_i];
            if (!event.propagationStopped) {
                invokeEventListeners(event, obj);
            }
        }
        event.eventPhase = event.AT_TARGET;
        if (!event.propagationStopped) {
            invokeEventListeners(event, event.target);
        }
        if (event.bubbles) {
            event.eventPath.reverse();
            event.eventPhase = event.BUBBLING_PHASE;
            if (event.eventPath.length === 0 && event.type === "error") {
                console.error("Unhandled error event: ", event.target);
            }
            for (var _b = 0, _c = event.eventPath; _b < _c.length; _b++) {
                var obj = _c[_b];
                if (!event.propagationStopped) {
                    invokeEventListeners(event, obj);
                }
            }
        }
        event.dispatched = false;
        event.eventPhase = event.NONE;
        event.currentTarget = null;
        if (event.canceled) {
            return false;
        }
        return true;
    };
    FakeEventTarget.enableTracing = false;
    return FakeEventTarget;
}());
exports.default = FakeEventTarget;

});

unwrapExports(FakeEventTarget_1);

var FakeEvent = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
var Event = /** @class */ (function () {
    function Event(type, eventInitDict) {
        if (eventInitDict === void 0) { eventInitDict = {}; }
        this.eventPath = [];
        this.NONE = 0;
        this.CAPTURING_PHASE = 1;
        this.AT_TARGET = 2;
        this.BUBBLING_PHASE = 3;
        // Flags
        this.propagationStopped = false;
        this.immediatePropagationStopped = false;
        this.canceled = false;
        this.initialized = true;
        this.dispatched = false;
        this.target = null;
        this.currentTarget = null;
        this.eventPhase = 0;
        this.defaultPrevented = false;
        this.isTrusted = false;
        this.timeStamp = Date.now();
        this.type = type;
        this.bubbles =
            eventInitDict.bubbles !== undefined ? eventInitDict.bubbles : false;
        this.cancelable =
            eventInitDict.cancelable !== undefined
                ? eventInitDict.cancelable
                : false;
    }
    Event.prototype.preventDefault = function () {
        if (this.cancelable) {
            this.canceled = true;
        }
    };
    Event.prototype.stopPropagation = function () {
        this.propagationStopped = true;
    };
    Event.prototype.stopImmediatePropagation = function () {
        this.propagationStopped = true;
        this.immediatePropagationStopped = true;
    };
    return Event;
}());
exports.Event = Event;
exports.default = Event;

});

unwrapExports(FakeEvent);
var FakeEvent_1 = FakeEvent.Event;

var BridgeIDBRequest_1 = createCommonjsModule(function (module, exports) {
/*
 * Copyright 2017 Jeremy Scheff
 * Copyright 2019 Florian Dold
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });



var BridgeIDBRequest = /** @class */ (function (_super) {
    __extends(BridgeIDBRequest, _super);
    function BridgeIDBRequest() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this._result = null;
        _this._error = null;
        _this.source = null;
        _this.transaction = null;
        _this.readyState = "pending";
        _this.onsuccess = null;
        _this.onerror = null;
        return _this;
    }
    Object.defineProperty(BridgeIDBRequest.prototype, "error", {
        get: function () {
            if (this.readyState === "pending") {
                throw new errors.InvalidStateError();
            }
            return this._error;
        },
        set: function (value) {
            this._error = value;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBRequest.prototype, "result", {
        get: function () {
            if (this.readyState === "pending") {
                throw new errors.InvalidStateError();
            }
            return this._result;
        },
        set: function (value) {
            this._result = value;
        },
        enumerable: true,
        configurable: true
    });
    BridgeIDBRequest.prototype.toString = function () {
        return "[object IDBRequest]";
    };
    BridgeIDBRequest.prototype._finishWithError = function (err) {
        this.result = undefined;
        this.readyState = "done";
        this.error = new Error(err.message);
        this.error.name = err.name;
        var event = new FakeEvent.default("error", {
            bubbles: true,
            cancelable: true,
        });
        event.eventPath = [];
        this.dispatchEvent(event);
    };
    BridgeIDBRequest.prototype._finishWithResult = function (result) {
        this.result = result;
        this.readyState = "done";
        var event = new FakeEvent.default("success");
        event.eventPath = [];
        this.dispatchEvent(event);
    };
    return BridgeIDBRequest;
}(FakeEventTarget_1.default));
exports.default = BridgeIDBRequest;

});

unwrapExports(BridgeIDBRequest_1);

var BridgeIDBIndex_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });







var confirmActiveTransaction = function (index) {
    if (index._deleted || index.objectStore._deleted) {
        throw new errors.InvalidStateError();
    }
    if (index.objectStore.transaction._state !== "active") {
        throw new errors.TransactionInactiveError();
    }
    return index.objectStore.transaction;
};
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#idl-def-IDBIndex
var BridgeIDBIndex = /** @class */ (function () {
    function BridgeIDBIndex(objectStore, name) {
        this._deleted = false;
        this._name = name;
        this.objectStore = objectStore;
    }
    Object.defineProperty(BridgeIDBIndex.prototype, "_schema", {
        get: function () {
            return this.objectStore.transaction.db._schema;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBIndex.prototype, "keyPath", {
        get: function () {
            return this._schema.objectStores[this.objectStore.name].indexes[this._name].keyPath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBIndex.prototype, "multiEntry", {
        get: function () {
            return this._schema.objectStores[this.objectStore.name].indexes[this._name].multiEntry;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBIndex.prototype, "unique", {
        get: function () {
            return this._schema.objectStores[this.objectStore.name].indexes[this._name].unique;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBIndex.prototype, "_backend", {
        get: function () {
            return this.objectStore._backend;
        },
        enumerable: true,
        configurable: true
    });
    BridgeIDBIndex.prototype._confirmActiveTransaction = function () {
        return this.objectStore._confirmActiveTransaction();
    };
    Object.defineProperty(BridgeIDBIndex.prototype, "name", {
        get: function () {
            return this._name;
        },
        // https://w3c.github.io/IndexedDB/#dom-idbindex-name
        set: function (name) {
            var transaction = this.objectStore.transaction;
            if (!transaction.db._runningVersionchangeTransaction) {
                throw new errors.InvalidStateError();
            }
            if (transaction._state !== "active") {
                throw new errors.TransactionInactiveError();
            }
            var btx = this._confirmActiveTransaction().btx;
            var oldName = this._name;
            var newName = String(name);
            if (newName === oldName) {
                return;
            }
            this._backend.renameIndex(btx, this.objectStore.name, oldName, newName);
            if (this.objectStore.indexNames.indexOf(name) >= 0) {
                throw new errors.ConstraintError();
            }
        },
        enumerable: true,
        configurable: true
    });
    // tslint:disable-next-line max-line-length
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openCursor-IDBRequest-any-range-IDBCursorDirection-direction
    BridgeIDBIndex.prototype.openCursor = function (range, direction) {
        var _this = this;
        if (direction === void 0) { direction = "next"; }
        confirmActiveTransaction(this);
        if (range === null) {
            range = undefined;
        }
        if (range !== undefined && !(range instanceof BridgeIDBKeyRange_1.default)) {
            range = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(range));
        }
        var request = new BridgeIDBRequest_1.default();
        request.source = this;
        request.transaction = this.objectStore.transaction;
        var cursor = new BridgeIDBCursorWithValue_1.default(this, this.objectStore.name, this._name, range, direction, request);
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, cursor._iterate()];
            });
        }); };
        return this.objectStore.transaction._execRequestAsync({
            operation: operation,
            request: request,
            source: this,
        });
    };
    // tslint:disable-next-line max-line-length
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-openKeyCursor-IDBRequest-any-range-IDBCursorDirection-direction
    BridgeIDBIndex.prototype.openKeyCursor = function (range, direction) {
        if (direction === void 0) { direction = "next"; }
        confirmActiveTransaction(this);
        if (range === null) {
            range = undefined;
        }
        if (range !== undefined && !(range instanceof BridgeIDBKeyRange_1.default)) {
            range = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(range));
        }
        var request = new BridgeIDBRequest_1.default();
        request.source = this;
        request.transaction = this.objectStore.transaction;
        var cursor = new BridgeIDBCursor_1.default(this, this.objectStore.name, this._name, range, direction, request, true);
        return this.objectStore.transaction._execRequestAsync({
            operation: cursor._iterate.bind(cursor),
            request: request,
            source: this,
        });
    };
    BridgeIDBIndex.prototype.get = function (key) {
        var _this = this;
        confirmActiveTransaction(this);
        if (!(key instanceof BridgeIDBKeyRange_1.default)) {
            key = BridgeIDBKeyRange_1.default._valueToKeyRange(key);
        }
        var getReq = {
            direction: "next",
            indexName: this._name,
            limit: 1,
            range: key,
            objectStoreName: this.objectStore._name,
            resultLevel: backendInterface.ResultLevel.Full,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, getReq)];
                    case 1:
                        result = _a.sent();
                        if (result.count == 0) {
                            return [2 /*return*/, undefined];
                        }
                        values = result.values;
                        if (!values) {
                            throw Error("invariant violated");
                        }
                        return [2 /*return*/, values[0]];
                }
            });
        }); };
        return this.objectStore.transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    // http://w3c.github.io/IndexedDB/#dom-idbindex-getall
    BridgeIDBIndex.prototype.getAll = function (query, count) {
        throw Error("not implemented");
    };
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-getKey-IDBRequest-any-key
    BridgeIDBIndex.prototype.getKey = function (key) {
        var _this = this;
        confirmActiveTransaction(this);
        if (!(key instanceof BridgeIDBKeyRange_1.default)) {
            key = BridgeIDBKeyRange_1.default._valueToKeyRange(key);
        }
        var getReq = {
            direction: "next",
            indexName: this._name,
            limit: 1,
            range: key,
            objectStoreName: this.objectStore._name,
            resultLevel: backendInterface.ResultLevel.OnlyKeys,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result, primaryKeys;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, getReq)];
                    case 1:
                        result = _a.sent();
                        if (result.count == 0) {
                            return [2 /*return*/, undefined];
                        }
                        primaryKeys = result.primaryKeys;
                        if (!primaryKeys) {
                            throw Error("invariant violated");
                        }
                        return [2 /*return*/, primaryKeys[0]];
                }
            });
        }); };
        return this.objectStore.transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    // http://w3c.github.io/IndexedDB/#dom-idbindex-getallkeys
    BridgeIDBIndex.prototype.getAllKeys = function (query, count) {
        throw Error("not implemented");
    };
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBIndex-count-IDBRequest-any-key
    BridgeIDBIndex.prototype.count = function (key) {
        var _this = this;
        confirmActiveTransaction(this);
        if (key === null) {
            key = undefined;
        }
        if (key !== undefined && !(key instanceof BridgeIDBKeyRange_1.default)) {
            key = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(key));
        }
        var getReq = {
            direction: "next",
            indexName: this._name,
            limit: 1,
            range: key,
            objectStoreName: this.objectStore._name,
            resultLevel: backendInterface.ResultLevel.OnlyCount,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, getReq)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.count];
                }
            });
        }); };
        return this.objectStore.transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    BridgeIDBIndex.prototype.toString = function () {
        return "[object IDBIndex]";
    };
    return BridgeIDBIndex;
}());
exports.BridgeIDBIndex = BridgeIDBIndex;
exports.default = BridgeIDBIndex;

});

unwrapExports(BridgeIDBIndex_1);
var BridgeIDBIndex_2 = BridgeIDBIndex_1.BridgeIDBIndex;

var fakeDOMStringList_1 = createCommonjsModule(function (module, exports) {
/*
 * Copyright 2017 Jeremy Scheff
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
// Would be nicer to sublcass Array, but I'd have to sacrifice Node 4 support to do that.
var fakeDOMStringList = function (arr) {
    var arr2 = arr.slice();
    Object.defineProperty(arr2, "contains", {
        // tslint:disable-next-line object-literal-shorthand
        value: function (value) { return arr2.indexOf(value) >= 0; },
    });
    Object.defineProperty(arr2, "item", {
        // tslint:disable-next-line object-literal-shorthand
        value: function (i) { return arr2[i]; },
    });
    return arr2;
};
exports.default = fakeDOMStringList;

});

unwrapExports(fakeDOMStringList_1);

var validateKeyPath_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-valid-key-path
var validateKeyPath = function (keyPath, parent) {
    // This doesn't make sense to me based on the spec, but it is needed to pass the W3C KeyPath tests (see same
    // comment in extractKey)
    if (keyPath !== undefined &&
        keyPath !== null &&
        typeof keyPath !== "string" &&
        keyPath.toString &&
        (parent === "array" || !Array.isArray(keyPath))) {
        keyPath = keyPath.toString();
    }
    if (typeof keyPath === "string") {
        if (keyPath === "" && parent !== "string") {
            return;
        }
        try {
            // https://mathiasbynens.be/demo/javascript-identifier-regex for ECMAScript 5.1 / Unicode v7.0.0, with
            // reserved words at beginning removed
            // tslint:disable-next-line max-line-length
            var validIdentifierRegex = /^(?:[\$A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0-\u08B2\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC])(?:[\$0-9A-Z_a-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u08A0-\u08B2\u08E4-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58\u0C59\u0C60-\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D01-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D57\u0D60-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1CD0-\u1CD2\u1CD4-\u1CF6\u1CF8\u1CF9\u1D00-\u1DF5\u1DFC-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u200C\u200D\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA69D\uA69F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA7AD\uA7B0\uA7B1\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C4\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB5F\uAB64\uAB65\uABC0-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2D\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC])*$/;
            if (keyPath.length >= 1 && validIdentifierRegex.test(keyPath)) {
                return;
            }
        }
        catch (err) {
            throw new SyntaxError(err.message);
        }
        if (keyPath.indexOf(" ") >= 0) {
            throw new SyntaxError("The keypath argument contains an invalid key path (no spaces allowed).");
        }
    }
    if (Array.isArray(keyPath) && keyPath.length > 0) {
        if (parent) {
            // No nested arrays
            throw new SyntaxError("The keypath argument contains an invalid key path (nested arrays).");
        }
        for (var _i = 0, keyPath_1 = keyPath; _i < keyPath_1.length; _i++) {
            var part = keyPath_1[_i];
            validateKeyPath(part, "array");
        }
        return;
    }
    else if (typeof keyPath === "string" && keyPath.indexOf(".") >= 0) {
        keyPath = keyPath.split(".");
        for (var _a = 0, keyPath_2 = keyPath; _a < keyPath_2.length; _a++) {
            var part = keyPath_2[_a];
            validateKeyPath(part, "string");
        }
        return;
    }
    throw new SyntaxError();
};
exports.default = validateKeyPath;

});

unwrapExports(validateKeyPath_1);

var BridgeIDBObjectStore_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold
 Copyright 2017 Jeremy Scheff

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });











// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#object-store
var BridgeIDBObjectStore = /** @class */ (function () {
    function BridgeIDBObjectStore(transaction, name) {
        this._indexesCache = new Map();
        this._deleted = false;
        this._name = name;
        this.transaction = transaction;
    }
    Object.defineProperty(BridgeIDBObjectStore.prototype, "autoIncrement", {
        get: function () {
            return this._schema.objectStores[this._name].autoIncrement;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "indexNames", {
        get: function () {
            return fakeDOMStringList_1.default(Object.keys(this._schema.objectStores[this._name].indexes)).sort();
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "keyPath", {
        get: function () {
            return this._schema.objectStores[this._name].keyPath;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "_schema", {
        get: function () {
            return this.transaction.db._schema;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "name", {
        get: function () {
            return this._name;
        },
        // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-name
        set: function (newName) {
            var transaction = this.transaction;
            if (!transaction.db._runningVersionchangeTransaction) {
                throw new errors.InvalidStateError();
            }
            var btx = this._confirmActiveTransaction().btx;
            newName = String(newName);
            var oldName = this._name;
            if (newName === oldName) {
                return;
            }
            this._backend.renameObjectStore(btx, oldName, newName);
            this.transaction.db._schema = this._backend.getSchema(this._backendConnection);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "_backend", {
        get: function () {
            return this.transaction.db._backend;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBObjectStore.prototype, "_backendConnection", {
        get: function () {
            return this.transaction.db._backendConnection;
        },
        enumerable: true,
        configurable: true
    });
    BridgeIDBObjectStore.prototype._confirmActiveTransaction = function () {
        var btx = this.transaction._backendTransaction;
        if (!btx) {
            throw new errors.InvalidStateError();
        }
        return { btx: btx };
    };
    BridgeIDBObjectStore.prototype._store = function (value, key, overwrite) {
        var _this = this;
        if (BridgeIDBFactory_1.default.enableTracing) {
            console.log("TRACE: IDBObjectStore._store");
        }
        if (this.transaction.mode === "readonly") {
            throw new errors.ReadOnlyError();
        }
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.storeRecord(btx, {
                                objectStoreName: this._name,
                                key: key,
                                value: value,
                                storeLevel: overwrite
                                    ? backendInterface.StoreLevel.AllowOverwrite
                                    : backendInterface.StoreLevel.NoOverwrite,
                            })];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.key];
                }
            });
        }); };
        return this.transaction._execRequestAsync({ operation: operation, source: this });
    };
    BridgeIDBObjectStore.prototype.put = function (value, key) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        return this._store(value, key, true);
    };
    BridgeIDBObjectStore.prototype.add = function (value, key) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        return this._store(value, key, false);
    };
    BridgeIDBObjectStore.prototype.delete = function (key) {
        var _this = this;
        if (arguments.length === 0) {
            throw new TypeError();
        }
        if (this.transaction.mode === "readonly") {
            throw new errors.ReadOnlyError();
        }
        var keyRange;
        if (key instanceof BridgeIDBKeyRange_1.default) {
            keyRange = key;
        }
        else {
            keyRange = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(key));
        }
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx;
            return __generator(this, function (_a) {
                btx = this._confirmActiveTransaction().btx;
                return [2 /*return*/, this._backend.deleteRecord(btx, this._name, keyRange)];
            });
        }); };
        return this.transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    BridgeIDBObjectStore.prototype.get = function (key) {
        var _this = this;
        if (BridgeIDBFactory_1.default.enableTracing) {
            console.log("getting from object store " + this._name + " key " + key);
        }
        if (arguments.length === 0) {
            throw new TypeError();
        }
        var keyRange;
        if (key instanceof BridgeIDBKeyRange_1.default) {
            keyRange = key;
        }
        else {
            keyRange = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(key));
        }
        var recordRequest = {
            objectStoreName: this._name,
            indexName: undefined,
            lastIndexPosition: undefined,
            lastObjectStorePosition: undefined,
            direction: "next",
            limit: 1,
            resultLevel: backendInterface.ResultLevel.Full,
            range: keyRange,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result, values;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("running get operation:", recordRequest);
                        }
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, recordRequest)];
                    case 1:
                        result = _a.sent();
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("get operation result count:", result.count);
                        }
                        if (result.count === 0) {
                            return [2 /*return*/, undefined];
                        }
                        values = result.values;
                        if (!values) {
                            throw Error("invariant violated");
                        }
                        return [2 /*return*/, values[0]];
                }
            });
        }); };
        return this.transaction._execRequestAsync({
            operation: operation,
            source: this,
        });
    };
    // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getall
    BridgeIDBObjectStore.prototype.getAll = function (query, count) {
        throw Error("not implemented");
    };
    // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getkey
    BridgeIDBObjectStore.prototype.getKey = function (key) {
        throw Error("not implemented");
    };
    // http://w3c.github.io/IndexedDB/#dom-idbobjectstore-getallkeys
    BridgeIDBObjectStore.prototype.getAllKeys = function (query, count) {
        throw Error("not implemented");
    };
    BridgeIDBObjectStore.prototype.clear = function () {
        throw Error("not implemented");
    };
    BridgeIDBObjectStore.prototype.openCursor = function (range, direction) {
        if (direction === void 0) { direction = "next"; }
        if (range === null) {
            range = undefined;
        }
        if (range !== undefined && !(range instanceof BridgeIDBKeyRange_1.default)) {
            range = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(range));
        }
        var request = new BridgeIDBRequest_1.default();
        request.source = this;
        request.transaction = this.transaction;
        var cursor = new BridgeIDBCursorWithValue_1.default(this, this._name, undefined, range, direction, request);
        return this.transaction._execRequestAsync({
            operation: function () { return cursor._iterate(); },
            request: request,
            source: this,
        });
    };
    BridgeIDBObjectStore.prototype.openKeyCursor = function (range, direction) {
        if (range === null) {
            range = undefined;
        }
        if (range !== undefined && !(range instanceof BridgeIDBKeyRange_1.default)) {
            range = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(range));
        }
        if (!direction) {
            direction = "next";
        }
        var request = new BridgeIDBRequest_1.default();
        request.source = this;
        request.transaction = this.transaction;
        var cursor = new BridgeIDBCursor_1.default(this, this._name, undefined, range, direction, request, true);
        return this.transaction._execRequestAsync({
            operation: cursor._iterate.bind(cursor),
            request: request,
            source: this,
        });
    };
    // tslint:disable-next-line max-line-length
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-createIndex-IDBIndex-DOMString-name-DOMString-sequence-DOMString--keyPath-IDBIndexParameters-optionalParameters
    BridgeIDBObjectStore.prototype.createIndex = function (indexName, keyPath, optionalParameters) {
        if (optionalParameters === void 0) { optionalParameters = {}; }
        if (arguments.length < 2) {
            throw new TypeError();
        }
        if (!this.transaction.db._runningVersionchangeTransaction) {
            throw new errors.InvalidStateError();
        }
        var btx = this._confirmActiveTransaction().btx;
        var multiEntry = optionalParameters.multiEntry !== undefined
            ? optionalParameters.multiEntry
            : false;
        var unique = optionalParameters.unique !== undefined
            ? optionalParameters.unique
            : false;
        if (this.transaction.mode !== "versionchange") {
            throw new errors.InvalidStateError();
        }
        if (this.indexNames.indexOf(indexName) >= 0) {
            throw new errors.ConstraintError();
        }
        validateKeyPath_1.default(keyPath);
        if (Array.isArray(keyPath) && multiEntry) {
            throw new errors.InvalidAccessError();
        }
        this._backend.createIndex(btx, indexName, this._name, keyPath, multiEntry, unique);
        return new BridgeIDBIndex_1.default(this, indexName);
    };
    // https://w3c.github.io/IndexedDB/#dom-idbobjectstore-index
    BridgeIDBObjectStore.prototype.index = function (name) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        if (this.transaction._state === "finished") {
            throw new errors.InvalidStateError();
        }
        var index = this._indexesCache.get(name);
        if (index !== undefined) {
            return index;
        }
        return new BridgeIDBIndex_1.default(this, name);
    };
    BridgeIDBObjectStore.prototype.deleteIndex = function (indexName) {
        if (arguments.length === 0) {
            throw new TypeError();
        }
        if (this.transaction.mode !== "versionchange") {
            throw new errors.InvalidStateError();
        }
        if (!this.transaction.db._runningVersionchangeTransaction) {
            throw new errors.InvalidStateError();
        }
        var btx = this._confirmActiveTransaction().btx;
        var index = this._indexesCache.get(indexName);
        if (index !== undefined) {
            index._deleted = true;
        }
        this._backend.deleteIndex(btx, this._name, indexName);
    };
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBObjectStore-count-IDBRequest-any-key
    BridgeIDBObjectStore.prototype.count = function (key) {
        var _this = this;
        if (key === null) {
            key = undefined;
        }
        if (key !== undefined && !(key instanceof BridgeIDBKeyRange_1.default)) {
            key = BridgeIDBKeyRange_1.default.only(valueToKey_1.default(key));
        }
        var recordGetRequest = {
            direction: "next",
            indexName: undefined,
            lastIndexPosition: undefined,
            limit: -1,
            objectStoreName: this._name,
            lastObjectStorePosition: undefined,
            range: key,
            resultLevel: backendInterface.ResultLevel.OnlyCount,
        };
        var operation = function () { return __awaiter(_this, void 0, void 0, function () {
            var btx, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        btx = this._confirmActiveTransaction().btx;
                        return [4 /*yield*/, this._backend.getRecords(btx, recordGetRequest)];
                    case 1:
                        result = _a.sent();
                        return [2 /*return*/, result.count];
                }
            });
        }); };
        return this.transaction._execRequestAsync({ operation: operation, source: this });
    };
    BridgeIDBObjectStore.prototype.toString = function () {
        return "[object IDBObjectStore]";
    };
    return BridgeIDBObjectStore;
}());
exports.default = BridgeIDBObjectStore;

});

unwrapExports(BridgeIDBObjectStore_1);

var queueTask_1 = createCommonjsModule(function (module, exports) {
/*
  Copyright 2019 Florian Dold

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
  or implied. See the License for the specific language governing
  permissions and limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function queueTask(fn) {
    setImmediate(fn);
}
exports.queueTask = queueTask;
exports.default = queueTask;

});

unwrapExports(queueTask_1);
var queueTask_2 = queueTask_1.queueTask;

var openPromise_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
function openPromise() {
    var resolve;
    var reject;
    var promise = new Promise(function (resolve2, reject2) {
        resolve = resolve2;
        reject = reject2;
    });
    if (!resolve) {
        throw Error("broken invariant");
    }
    if (!reject) {
        throw Error("broken invariant");
    }
    return { promise: promise, resolve: resolve, reject: reject };
}
exports.default = openPromise;

});

unwrapExports(openPromise_1);

var BridgeIDBTransaction_1 = createCommonjsModule(function (module, exports) {
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });









// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#transaction
var BridgeIDBTransaction = /** @class */ (function (_super) {
    __extends(BridgeIDBTransaction, _super);
    function BridgeIDBTransaction(storeNames, mode, db, backendTransaction) {
        var _this = _super.call(this) || this;
        _this._state = "active";
        _this._started = false;
        _this._objectStoresCache = new Map();
        _this.error = null;
        _this.onabort = null;
        _this.oncomplete = null;
        _this.onerror = null;
        _this._requests = [];
        var myOpenPromise = openPromise_1.default();
        _this._waitPromise = myOpenPromise.promise;
        _this._resolveWait = myOpenPromise.resolve;
        _this._scope = new Set(storeNames);
        _this._backendTransaction = backendTransaction;
        _this.mode = mode;
        _this.db = db;
        _this.objectStoreNames = fakeDOMStringList_1.default(Array.from(_this._scope).sort());
        _this.db._transactions.push(_this);
        return _this;
    }
    Object.defineProperty(BridgeIDBTransaction.prototype, "_backend", {
        get: function () {
            return this.db._backend;
        },
        enumerable: true,
        configurable: true
    });
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-aborting-a-transaction
    BridgeIDBTransaction.prototype._abort = function (errName) {
        return __awaiter(this, void 0, void 0, function () {
            var e, _i, _a, request, event, maybeBtx;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        this._state = "finished";
                        if (errName !== null) {
                            e = new Error();
                            e.name = errName;
                            this.error = e;
                        }
                        // Should this directly remove from _requests?
                        for (_i = 0, _a = this._requests; _i < _a.length; _i++) {
                            request = _a[_i].request;
                            if (request.readyState !== "done") {
                                request.readyState = "done"; // This will cancel execution of this request's operation
                                if (request.source) {
                                    request.result = undefined;
                                    request.error = new errors.AbortError();
                                    event = new FakeEvent.default("error", {
                                        bubbles: true,
                                        cancelable: true,
                                    });
                                    event.eventPath = [this.db, this];
                                    request.dispatchEvent(event);
                                }
                            }
                        }
                        maybeBtx = this._backendTransaction;
                        if (!maybeBtx) return [3 /*break*/, 2];
                        return [4 /*yield*/, this._backend.rollback(maybeBtx)];
                    case 1:
                        _b.sent();
                        _b.label = 2;
                    case 2:
                        queueTask_1.default(function () {
                            var event = new FakeEvent.default("abort", {
                                bubbles: true,
                                cancelable: false,
                            });
                            event.eventPath = [_this.db];
                            _this.dispatchEvent(event);
                        });
                        return [2 /*return*/];
                }
            });
        });
    };
    BridgeIDBTransaction.prototype.abort = function () {
        if (this._state === "committing" || this._state === "finished") {
            throw new errors.InvalidStateError();
        }
        this._state = "active";
        this._abort(null);
    };
    // http://w3c.github.io/IndexedDB/#dom-idbtransaction-objectstore
    BridgeIDBTransaction.prototype.objectStore = function (name) {
        if (this._state !== "active") {
            throw new errors.InvalidStateError();
        }
        var objectStore = this._objectStoresCache.get(name);
        if (objectStore !== undefined) {
            return objectStore;
        }
        return new BridgeIDBObjectStore_1.default(this, name);
    };
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-asynchronously-executing-a-request
    BridgeIDBTransaction.prototype._execRequestAsync = function (obj) {
        var source = obj.source;
        var operation = obj.operation;
        var request = obj.hasOwnProperty("request") ? obj.request : null;
        if (this._state !== "active") {
            throw new errors.TransactionInactiveError();
        }
        // Request should only be passed for cursors
        if (!request) {
            if (!source) {
                // Special requests like indexes that just need to run some code
                request = new BridgeIDBRequest_1.default();
            }
            else {
                request = new BridgeIDBRequest_1.default();
                request.source = source;
                request.transaction = source.transaction;
            }
        }
        this._requests.push({
            operation: operation,
            request: request,
        });
        return request;
    };
    /**
     * Actually execute the scheduled work for this transaction.
     */
    BridgeIDBTransaction.prototype._start = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a, operation, request, r, event, result, err_1, event, idx;
            var _this = this;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("TRACE: IDBTransaction._start, " + this._requests.length + " queued");
                        }
                        this._started = true;
                        if (!!this._backendTransaction) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, this._backend.beginTransaction(this.db._backendConnection, Array.from(this._scope), this.mode)];
                    case 1:
                        _a._backendTransaction = _b.sent();
                        _b.label = 2;
                    case 2:
                        while (this._requests.length > 0) {
                            r = this._requests.shift();
                            // This should only be false if transaction was aborted
                            if (r && r.request.readyState !== "done") {
                                request = r.request;
                                operation = r.operation;
                                break;
                            }
                        }
                        if (!(request && operation)) return [3 /*break*/, 9];
                        if (!!request.source) return [3 /*break*/, 4];
                        // Special requests like indexes that just need to run some code, with error handling already built into
                        // operation
                        return [4 /*yield*/, operation()];
                    case 3:
                        // Special requests like indexes that just need to run some code, with error handling already built into
                        // operation
                        _b.sent();
                        return [3 /*break*/, 8];
                    case 4:
                        event = void 0;
                        _b.label = 5;
                    case 5:
                        _b.trys.push([5, 7, , 8]);
                        BridgeIDBFactory_1.default.enableTracing &&
                            console.log("TRACE: running operation in transaction");
                        return [4 /*yield*/, operation()];
                    case 6:
                        result = _b.sent();
                        BridgeIDBFactory_1.default.enableTracing &&
                            console.log("TRACE: operation in transaction finished with success");
                        request.readyState = "done";
                        request.result = result;
                        request.error = undefined;
                        // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-a-success-event
                        if (this._state === "inactive") {
                            this._state = "active";
                        }
                        event = new FakeEvent.default("success", {
                            bubbles: false,
                            cancelable: false,
                        });
                        try {
                            event.eventPath = [request, this, this.db];
                            request.dispatchEvent(event);
                        }
                        catch (err) {
                            if (this._state !== "committing") {
                                this._abort("AbortError");
                            }
                            throw err;
                        }
                        return [3 /*break*/, 8];
                    case 7:
                        err_1 = _b.sent();
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("TRACING: error during operation: ", err_1);
                        }
                        request.readyState = "done";
                        request.result = undefined;
                        request.error = err_1;
                        // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-fire-an-error-event
                        if (this._state === "inactive") {
                            this._state = "active";
                        }
                        event = new FakeEvent.default("error", {
                            bubbles: true,
                            cancelable: true,
                        });
                        try {
                            event.eventPath = [this.db, this];
                            request.dispatchEvent(event);
                        }
                        catch (err) {
                            if (this._state !== "committing") {
                                this._abort("AbortError");
                            }
                            throw err;
                        }
                        if (!event.canceled) {
                            this._abort(err_1.name);
                        }
                        return [3 /*break*/, 8];
                    case 8:
                        // On to the next one
                        if (this._requests.length > 0) {
                            this._start();
                        }
                        else {
                            // Give it another chance for new handlers to be set before finishing
                            queueTask_1.default(function () { return _this._start(); });
                        }
                        return [2 /*return*/];
                    case 9:
                        if (!(this._state !== "finished" && this._state !== "committing")) return [3 /*break*/, 11];
                        if (BridgeIDBFactory_1.default.enableTracing) {
                            console.log("finishing transaction");
                        }
                        this._state = "committing";
                        return [4 /*yield*/, this._backend.commit(this._backendTransaction)];
                    case 10:
                        _b.sent();
                        this._state = "finished";
                        if (!this.error) {
                            if (BridgeIDBFactory_1.default.enableTracing) {
                                console.log("dispatching 'complete' event on transaction");
                            }
                            event = new FakeEvent.default("complete");
                            event.eventPath = [this, this.db];
                            this.dispatchEvent(event);
                        }
                        idx = this.db._transactions.indexOf(this);
                        if (idx < 0) {
                            throw Error("invariant failed");
                        }
                        this.db._transactions.splice(idx, 1);
                        this._resolveWait();
                        _b.label = 11;
                    case 11: return [2 /*return*/];
                }
            });
        });
    };
    BridgeIDBTransaction.prototype.commit = function () {
        if (this._state !== "active") {
            throw new errors.InvalidStateError();
        }
        this._state = "committing";
        // We now just wait for auto-commit ...
    };
    BridgeIDBTransaction.prototype.toString = function () {
        return "[object IDBRequest]";
    };
    BridgeIDBTransaction.prototype._waitDone = function () {
        return this._waitPromise;
    };
    return BridgeIDBTransaction;
}(FakeEventTarget_1.default));
exports.default = BridgeIDBTransaction;

});

unwrapExports(BridgeIDBTransaction_1);

var BridgeIDBDatabase_1 = createCommonjsModule(function (module, exports) {
/*
 * Copyright 2017 Jeremy Scheff
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });






/**
 * Ensure that an active version change transaction is currently running.
 */
var confirmActiveVersionchangeTransaction = function (database) {
    if (!database._runningVersionchangeTransaction) {
        throw new errors.InvalidStateError();
    }
    // Find the latest versionchange transaction
    var transactions = database._transactions.filter(function (tx) {
        return tx.mode === "versionchange";
    });
    var transaction = transactions[transactions.length - 1];
    if (!transaction || transaction._state === "finished") {
        throw new errors.InvalidStateError();
    }
    if (transaction._state !== "active") {
        throw new errors.TransactionInactiveError();
    }
    return transaction;
};
// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-interface
var BridgeIDBDatabase = /** @class */ (function (_super) {
    __extends(BridgeIDBDatabase, _super);
    function BridgeIDBDatabase(backend, backendConnection) {
        var _this = _super.call(this) || this;
        _this._closePending = false;
        _this._closed = false;
        _this._runningVersionchangeTransaction = false;
        _this._transactions = [];
        _this._schema = backend.getSchema(backendConnection);
        _this._backend = backend;
        _this._backendConnection = backendConnection;
        return _this;
    }
    Object.defineProperty(BridgeIDBDatabase.prototype, "name", {
        get: function () {
            return this._schema.databaseName;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBDatabase.prototype, "version", {
        get: function () {
            return this._schema.databaseVersion;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BridgeIDBDatabase.prototype, "objectStoreNames", {
        get: function () {
            return fakeDOMStringList_1.default(Object.keys(this._schema.objectStores)).sort();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#database-closing-steps
     */
    BridgeIDBDatabase.prototype._closeConnection = function () {
        var _this = this;
        this._closePending = true;
        var transactionsComplete = this._transactions.every(function (transaction) {
            return transaction._state === "finished";
        });
        if (transactionsComplete) {
            this._closed = true;
            this._backend.close(this._backendConnection);
        }
        else {
            queueTask_1.default(function () {
                _this._closeConnection();
            });
        }
    };
    // http://w3c.github.io/IndexedDB/#dom-idbdatabase-createobjectstore
    BridgeIDBDatabase.prototype.createObjectStore = function (name, options) {
        if (options === void 0) { options = {}; }
        if (name === undefined) {
            throw new TypeError();
        }
        var transaction = confirmActiveVersionchangeTransaction(this);
        var backendTx = transaction._backendTransaction;
        if (!backendTx) {
            throw Error("invariant violated");
        }
        var keyPath = options !== null && options.keyPath !== undefined
            ? options.keyPath
            : null;
        var autoIncrement = options !== null && options.autoIncrement !== undefined
            ? options.autoIncrement
            : false;
        if (keyPath !== null) {
            validateKeyPath_1.default(keyPath);
        }
        if (Object.keys(this._schema.objectStores).includes(name)) {
            throw new errors.ConstraintError();
        }
        if (autoIncrement && (keyPath === "" || Array.isArray(keyPath))) {
            throw new errors.InvalidAccessError();
        }
        transaction._backend.createObjectStore(backendTx, name, keyPath, autoIncrement);
        this._schema = this._backend.getSchema(this._backendConnection);
        return transaction.objectStore(name);
    };
    BridgeIDBDatabase.prototype.deleteObjectStore = function (name) {
        if (name === undefined) {
            throw new TypeError();
        }
        var transaction = confirmActiveVersionchangeTransaction(this);
        transaction._objectStoresCache.delete(name);
    };
    BridgeIDBDatabase.prototype._internalTransaction = function (storeNames, mode, backendTransaction) {
        var _this = this;
        mode = mode !== undefined ? mode : "readonly";
        if (mode !== "readonly" &&
            mode !== "readwrite" &&
            mode !== "versionchange") {
            throw new TypeError("Invalid mode: " + mode);
        }
        var hasActiveVersionchange = this._transactions.some(function (transaction) {
            return (transaction._state === "active" &&
                transaction.mode === "versionchange" &&
                transaction.db === _this);
        });
        if (hasActiveVersionchange) {
            throw new errors.InvalidStateError();
        }
        if (this._closePending) {
            throw new errors.InvalidStateError();
        }
        if (!Array.isArray(storeNames)) {
            storeNames = [storeNames];
        }
        if (storeNames.length === 0 && mode !== "versionchange") {
            throw new errors.InvalidAccessError();
        }
        for (var _i = 0, storeNames_1 = storeNames; _i < storeNames_1.length; _i++) {
            var storeName = storeNames_1[_i];
            if (this.objectStoreNames.indexOf(storeName) < 0) {
                throw new errors.NotFoundError("No objectStore named " + storeName + " in this database");
            }
        }
        var tx = new BridgeIDBTransaction_1.default(storeNames, mode, this, backendTransaction);
        this._transactions.push(tx);
        queueTask_1.default(function () { return tx._start(); });
        return tx;
    };
    BridgeIDBDatabase.prototype.transaction = function (storeNames, mode) {
        if (mode === "versionchange") {
            throw new TypeError("Invalid mode: " + mode);
        }
        return this._internalTransaction(storeNames, mode);
    };
    BridgeIDBDatabase.prototype.close = function () {
        this._closeConnection();
    };
    BridgeIDBDatabase.prototype.toString = function () {
        return "[object IDBDatabase]";
    };
    return BridgeIDBDatabase;
}(FakeEventTarget_1.default));
exports.default = BridgeIDBDatabase;

});

unwrapExports(BridgeIDBDatabase_1);

var BridgeIDBOpenDBRequest_1 = createCommonjsModule(function (module, exports) {
/*
  Copyright 2019 Florian Dold
  Copyright 2017 Jeremy Scheff

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
  or implied. See the License for the specific language governing
  permissions and limitations under the License.
*/
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });

var BridgeIDBOpenDBRequest = /** @class */ (function (_super) {
    __extends(BridgeIDBOpenDBRequest, _super);
    function BridgeIDBOpenDBRequest() {
        var _this = _super.call(this) || this;
        _this.onupgradeneeded = null;
        _this.onblocked = null;
        // https://www.w3.org/TR/IndexedDB/#open-requests
        _this.source = null;
        return _this;
    }
    BridgeIDBOpenDBRequest.prototype.toString = function () {
        return "[object IDBOpenDBRequest]";
    };
    return BridgeIDBOpenDBRequest;
}(BridgeIDBRequest_1.default));
exports.default = BridgeIDBOpenDBRequest;

});

unwrapExports(BridgeIDBOpenDBRequest_1);

var BridgeIDBVersionChangeEvent_1 = createCommonjsModule(function (module, exports) {
/*
  Copyright 2019 Florian Dold
  Copyright 2017 Jeremy Scheff

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
  or implied. See the License for the specific language governing
  permissions and limitations under the License.
 */
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });

var BridgeIDBVersionChangeEvent = /** @class */ (function (_super) {
    __extends(BridgeIDBVersionChangeEvent, _super);
    function BridgeIDBVersionChangeEvent(type, parameters) {
        if (parameters === void 0) { parameters = {}; }
        var _this = _super.call(this, type) || this;
        _this.newVersion =
            parameters.newVersion !== undefined ? parameters.newVersion : null;
        _this.oldVersion =
            parameters.oldVersion !== undefined ? parameters.oldVersion : 0;
        return _this;
    }
    BridgeIDBVersionChangeEvent.prototype.toString = function () {
        return "[object IDBVersionChangeEvent]";
    };
    return BridgeIDBVersionChangeEvent;
}(FakeEvent.default));
exports.default = BridgeIDBVersionChangeEvent;

});

unwrapExports(BridgeIDBVersionChangeEvent_1);

var enforceRange_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });
// https://heycam.github.io/webidl/#EnforceRange
var enforceRange = function (num, type) {
    var min = 0;
    var max = type === "unsigned long" ? 4294967295 : 9007199254740991;
    if (isNaN(num) || num < min || num > max) {
        throw new TypeError();
    }
    if (num >= 0) {
        return Math.floor(num);
    }
};
exports.default = enforceRange;

});

unwrapExports(enforceRange_1);

var BridgeIDBFactory_1 = createCommonjsModule(function (module, exports) {
/*
 * Copyright 2017 Jeremy Scheff
 * Copyright 2019 Florian Dold
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });








var BridgeIDBFactory = /** @class */ (function () {
    function BridgeIDBFactory(backend) {
        this.cmp = cmp.default;
        this.connections = [];
        this.backend = backend;
    }
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-deleteDatabase-IDBOpenDBRequest-DOMString-name
    BridgeIDBFactory.prototype.deleteDatabase = function (name) {
        var _this = this;
        var request = new BridgeIDBOpenDBRequest_1.default();
        request.source = null;
        queueTask_1.default(function () { return __awaiter(_this, void 0, void 0, function () {
            var databases, dbInfo, event, oldVersion, dbconn, backendTransaction, event2, err_1, event;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.backend.getDatabases()];
                    case 1:
                        databases = _a.sent();
                        dbInfo = databases.find(function (x) { return x.name == name; });
                        if (!dbInfo) {
                            event = new BridgeIDBVersionChangeEvent_1.default("success", {
                                newVersion: null,
                                oldVersion: 0,
                            });
                            request.dispatchEvent(event);
                            return [2 /*return*/];
                        }
                        oldVersion = dbInfo.version;
                        _a.label = 2;
                    case 2:
                        _a.trys.push([2, 8, , 9]);
                        return [4 /*yield*/, this.backend.connectDatabase(name)];
                    case 3:
                        dbconn = _a.sent();
                        return [4 /*yield*/, this.backend.enterVersionChange(dbconn, 0)];
                    case 4:
                        backendTransaction = _a.sent();
                        return [4 /*yield*/, this.backend.deleteDatabase(backendTransaction, name)];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, this.backend.commit(backendTransaction)];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, this.backend.close(dbconn)];
                    case 7:
                        _a.sent();
                        request.result = undefined;
                        request.readyState = "done";
                        event2 = new BridgeIDBVersionChangeEvent_1.default("success", {
                            newVersion: null,
                            oldVersion: oldVersion,
                        });
                        request.dispatchEvent(event2);
                        return [3 /*break*/, 9];
                    case 8:
                        err_1 = _a.sent();
                        request.error = new Error();
                        request.error.name = err_1.name;
                        request.readyState = "done";
                        event = new FakeEvent.default("error", {
                            bubbles: true,
                            cancelable: true,
                        });
                        event.eventPath = [];
                        request.dispatchEvent(event);
                        return [3 /*break*/, 9];
                    case 9: return [2 /*return*/];
                }
            });
        }); });
        return request;
    };
    // tslint:disable-next-line max-line-length
    // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#widl-IDBFactory-open-IDBOpenDBRequest-DOMString-name-unsigned-long-long-version
    BridgeIDBFactory.prototype.open = function (name, version) {
        var _this = this;
        if (arguments.length > 1 && version !== undefined) {
            // Based on spec, not sure why "MAX_SAFE_INTEGER" instead of "unsigned long long", but it's needed to pass
            // tests
            version = enforceRange_1.default(version, "MAX_SAFE_INTEGER");
        }
        if (version === 0) {
            throw new TypeError();
        }
        var request = new BridgeIDBOpenDBRequest_1.default();
        queueTask_1.default(function () { return __awaiter(_this, void 0, void 0, function () {
            var dbconn, err_2, schema, existingVersion, requestedVersion, db, event2, _i, _a, otherConn, event_1, event_2, backendTransaction, transaction, event, event2;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        _b.trys.push([0, 2, , 3]);
                        return [4 /*yield*/, this.backend.connectDatabase(name)];
                    case 1:
                        dbconn = _b.sent();
                        return [3 /*break*/, 3];
                    case 2:
                        err_2 = _b.sent();
                        request._finishWithError(err_2);
                        return [2 /*return*/];
                    case 3:
                        schema = this.backend.getSchema(dbconn);
                        existingVersion = schema.databaseVersion;
                        if (version === undefined) {
                            version = existingVersion !== 0 ? existingVersion : 1;
                        }
                        requestedVersion = version;
                        BridgeIDBFactory.enableTracing &&
                            console.log("TRACE: existing version " + existingVersion + ", requested version " + requestedVersion);
                        if (existingVersion > requestedVersion) {
                            request._finishWithError(new errors.VersionError());
                            return [2 /*return*/];
                        }
                        db = new BridgeIDBDatabase_1.default(this.backend, dbconn);
                        if (existingVersion == requestedVersion) {
                            request.result = db;
                            request.readyState = "done";
                            event2 = new FakeEvent.default("success", {
                                bubbles: false,
                                cancelable: false,
                            });
                            event2.eventPath = [request];
                            request.dispatchEvent(event2);
                        }
                        if (!(existingVersion < requestedVersion)) return [3 /*break*/, 6];
                        // http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-running-a-versionchange-transaction
                        for (_i = 0, _a = this.connections; _i < _a.length; _i++) {
                            otherConn = _a[_i];
                            event_1 = new BridgeIDBVersionChangeEvent_1.default("versionchange", {
                                newVersion: version,
                                oldVersion: existingVersion,
                            });
                            otherConn.dispatchEvent(event_1);
                        }
                        if (this._anyOpen()) {
                            event_2 = new BridgeIDBVersionChangeEvent_1.default("blocked", {
                                newVersion: version,
                                oldVersion: existingVersion,
                            });
                            request.dispatchEvent(event_2);
                        }
                        return [4 /*yield*/, this.backend.enterVersionChange(dbconn, requestedVersion)];
                    case 4:
                        backendTransaction = _b.sent();
                        db._runningVersionchangeTransaction = true;
                        transaction = db._internalTransaction([], "versionchange", backendTransaction);
                        event = new BridgeIDBVersionChangeEvent_1.default("upgradeneeded", {
                            newVersion: version,
                            oldVersion: existingVersion,
                        });
                        request.result = db;
                        request.readyState = "done";
                        request.transaction = transaction;
                        request.dispatchEvent(event);
                        return [4 /*yield*/, transaction._waitDone()];
                    case 5:
                        _b.sent();
                        // We don't explicitly exit the versionchange transaction,
                        // since this is already done by the BridgeIDBTransaction.
                        db._runningVersionchangeTransaction = false;
                        event2 = new FakeEvent.default("success", {
                            bubbles: false,
                            cancelable: false,
                        });
                        event2.eventPath = [request];
                        request.dispatchEvent(event2);
                        _b.label = 6;
                    case 6:
                        this.connections.push(db);
                        return [2 /*return*/, db];
                }
            });
        }); });
        return request;
    };
    // https://w3c.github.io/IndexedDB/#dom-idbfactory-databases
    BridgeIDBFactory.prototype.databases = function () {
        return this.backend.getDatabases();
    };
    BridgeIDBFactory.prototype.toString = function () {
        return "[object IDBFactory]";
    };
    BridgeIDBFactory.prototype._anyOpen = function () {
        return this.connections.some(function (c) { return !c._closed && !c._closePending; });
    };
    BridgeIDBFactory.enableTracing = false;
    return BridgeIDBFactory;
}());
exports.BridgeIDBFactory = BridgeIDBFactory;
exports.default = BridgeIDBFactory;

});

unwrapExports(BridgeIDBFactory_1);
var BridgeIDBFactory_2 = BridgeIDBFactory_1.BridgeIDBFactory;

var b_tree = createCommonjsModule(function (module, exports) {
/*
Copyright (c) 2018 David Piepgrass

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

SPDX-License-Identifier: MIT
*/
var __extends = (commonjsGlobal && commonjsGlobal.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
// Informative microbenchmarks & stuff:
// http://www.jayconrod.com/posts/52/a-tour-of-v8-object-representation (very educational)
// https://blog.mozilla.org/luke/2012/10/02/optimizing-javascript-variable-access/ (local vars are faster than properties)
// http://benediktmeurer.de/2017/12/13/an-introduction-to-speculative-optimization-in-v8/ (other stuff)
// https://jsperf.com/js-in-operator-vs-alternatives (avoid 'in' operator; `.p!==undefined` faster than `hasOwnProperty('p')` in all browsers)
// https://jsperf.com/instanceof-vs-typeof-vs-constructor-vs-member (speed of type tests varies wildly across browsers)
// https://jsperf.com/detecting-arrays-new (a.constructor===Array is best across browsers, assuming a is an object)
// https://jsperf.com/shallow-cloning-methods (a constructor is faster than Object.create; hand-written clone faster than Object.assign)
// https://jsperf.com/ways-to-fill-an-array (slice-and-replace is fastest)
// https://jsperf.com/math-min-max-vs-ternary-vs-if (Math.min/max is slow on Edge)
// https://jsperf.com/array-vs-property-access-speed (v.x/v.y is faster than a[0]/a[1] in major browsers IF hidden class is constant)
// https://jsperf.com/detect-not-null-or-undefined (`x==null` slightly slower than `x===null||x===undefined` on all browsers)
// Overall, microbenchmarks suggest Firefox is the fastest browser for JavaScript and Edge is the slowest.
// Lessons from https://v8project.blogspot.com/2017/09/elements-kinds-in-v8.html:
//   - Avoid holes in arrays. Avoid `new Array(N)`, it will be "holey" permanently.
//   - Don't read outside bounds of an array (it scans prototype chain).
//   - Small integer arrays are stored differently from doubles
//   - Adding non-numbers to an array deoptimizes it permanently into a general array
//   - Objects can be used like arrays (e.g. have length property) but are slower
//   - V8 source (NewElementsCapacity in src/objects.h): arrays grow by 50% + 16 elements
/** Compares two numbers, strings, arrays of numbers/strings, Dates,
 *  or objects that have a valueOf() method returning a number or string.
 *  Optimized for numbers. Returns 1 if a>b, -1 if a<b, and 0 if a===b.
 */
function defaultComparator(a, b) {
    var c = a - b;
    if (c === c)
        return c; // a & b are number
    // General case (c is NaN): string / arrays / Date / incomparable things
    if (a)
        a = a.valueOf();
    if (b)
        b = b.valueOf();
    return a < b ? -1 : a > b ? 1 : a == b ? 0 : c;
}
exports.defaultComparator = defaultComparator;
/**
 * A reasonably fast collection of key-value pairs with a powerful API.
 * Largely compatible with the standard Map. BTree is a B+ tree data structure,
 * so the collection is sorted by key.
 *
 * B+ trees tend to use memory more efficiently than hashtables such as the
 * standard Map, especially when the collection contains a large number of
 * items. However, maintaining the sort order makes them modestly slower:
 * O(log size) rather than O(1). This B+ tree implementation supports O(1)
 * fast cloning. It also supports freeze(), which can be used to ensure that
 * a BTree is not changed accidentally.
 *
 * Confusingly, the ES6 Map.forEach(c) method calls c(value,key) instead of
 * c(key,value), in contrast to other methods such as set() and entries()
 * which put the key first. I can only assume that the order was reversed on
 * the theory that users would usually want to examine values and ignore keys.
 * BTree's forEach() therefore works the same way, but a second method
 * `.forEachPair((key,value)=>{...})` is provided which sends you the key
 * first and the value second; this method is slightly faster because it is
 * the "native" for-each method for this class.
 *
 * Out of the box, BTree supports keys that are numbers, strings, arrays of
 * numbers/strings, Date, and objects that have a valueOf() method returning a
 * number or string. Other data types, such as arrays of Date or custom
 * objects, require a custom comparator, which you must pass as the second
 * argument to the constructor (the first argument is an optional list of
 * initial items). Symbols cannot be used as keys because they are unordered
 * (one Symbol is never "greater" or "less" than another).
 *
 * @example
 * Given a {name: string, age: number} object, you can create a tree sorted by
 * name and then by age like this:
 *
 *     var tree = new BTree(undefined, (a, b) => {
 *       if (a.name > b.name)
 *         return 1; // Return a number >0 when a > b
 *       else if (a.name < b.name)
 *         return -1; // Return a number <0 when a < b
 *       else // names are equal (or incomparable)
 *         return a.age - b.age; // Return >0 when a.age > b.age
 *     });
 *
 *     tree.set({name:"Bill", age:17}, "happy");
 *     tree.set({name:"Fran", age:40}, "busy & stressed");
 *     tree.set({name:"Bill", age:55}, "recently laid off");
 *     tree.forEachPair((k, v) => {
 *       console.log(`Name: ${k.name} Age: ${k.age} Status: ${v}`);
 *     });
 *
 * @description
 * The "range" methods (`forEach, forRange, editRange`) will return the number
 * of elements that were scanned. In addition, the callback can return {break:R}
 * to stop early and return R from the outer function.
 *
 * - TODO: Test performance of preallocating values array at max size
 * - TODO: Add fast initialization when a sorted array is provided to constructor
 *
 * For more documentation see https://github.com/qwertie/btree-typescript
 *
 * Are you a C# developer? You might like the similar data structures I made for C#:
 * BDictionary, BList, etc. See http://core.loyc.net/collections/
 *
 * @author David Piepgrass
 */
var BTree = /** @class */ (function () {
    /**
     * Initializes an empty B+ tree.
     * @param compare Custom function to compare pairs of elements in the tree.
     *   This is not required for numbers, strings and arrays of numbers/strings.
     * @param entries A set of key-value pairs to initialize the tree
     * @param maxNodeSize Branching factor (maximum items or children per node)
     *   Must be in range 4..256. If undefined or <4 then default is used; if >256 then 256.
     */
    function BTree(entries, compare, maxNodeSize) {
        this._root = EmptyLeaf;
        this._size = 0;
        this._maxNodeSize = maxNodeSize >= 4 ? Math.min(maxNodeSize, 256) : 32;
        this._compare = compare || defaultComparator;
        if (entries)
            this.setPairs(entries);
    }
    Object.defineProperty(BTree.prototype, "size", {
        // ES6 Map<K,V> methods ///////////////////////////////////////////////////
        /** Gets the number of key-value pairs in the tree. */
        get: function () { return this._size; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BTree.prototype, "length", {
        /** Gets the number of key-value pairs in the tree. */
        get: function () { return this._size; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(BTree.prototype, "isEmpty", {
        /** Returns true iff the tree contains no key-value pairs. */
        get: function () { return this._size === 0; },
        enumerable: true,
        configurable: true
    });
    /** Releases the tree so that its size is 0. */
    BTree.prototype.clear = function () {
        this._root = EmptyLeaf;
        this._size = 0;
    };
    /** Runs a function for each key-value pair, in order from smallest to
     *  largest key. For compatibility with ES6 Map, the argument order to
     *  the callback is backwards: value first, then key. Call forEachPair
     *  instead to receive the key as the first argument.
     * @param thisArg If provided, this parameter is assigned as the `this`
     *        value for each callback.
     * @returns the number of values that were sent to the callback,
     *        or the R value if the callback returned {break:R}. */
    BTree.prototype.forEach = function (callback, thisArg) {
        var _this = this;
        if (thisArg !== undefined)
            callback = callback.bind(thisArg);
        return this.forEachPair(function (k, v) { return callback(v, k, _this); });
    };
    /** Runs a function for each key-value pair, in order from smallest to
     *  largest key. The callback can return {break:R} (where R is any value
     *  except undefined) to stop immediately and return R from forEachPair.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return {break:R} to stop early with result R.
     *        The reason that you must return {break:R} instead of simply R
     *        itself is for consistency with editRange(), which allows
     *        multiple actions, not just breaking.
     * @param initialCounter This is the value of the third argument of
     *        `onFound` the first time it is called. The counter increases
     *        by one each time `onFound` is called. Default value: 0
     * @returns the number of pairs sent to the callback (plus initialCounter,
     *        if you provided one). If the callback returned {break:R} then
     *        the R value is returned instead. */
    BTree.prototype.forEachPair = function (callback, initialCounter) {
        var low = this.minKey(), high = this.maxKey();
        return this.forRange(low, high, true, callback, initialCounter);
    };
    /**
     * Finds a pair in the tree and returns the associated value.
     * @param defaultValue a value to return if the key was not found.
     * @returns the value, or defaultValue if the key was not found.
     * @description Computational complexity: O(log size)
     */
    BTree.prototype.get = function (key, defaultValue) {
        return this._root.get(key, defaultValue, this);
    };
    /**
     * Adds or overwrites a key-value pair in the B+ tree.
     * @param key the key is used to determine the sort order of
     *        data in the tree.
     * @param value data to associate with the key (optional)
     * @param overwrite Whether to overwrite an existing key-value pair
     *        (default: true). If this is false and there is an existing
     *        key-value pair then this method has no effect.
     * @returns true if a new key-value pair was added.
     * @description Computational complexity: O(log size)
     * Note: when overwriting a previous entry, the key is updated
     * as well as the value. This has no effect unless the new key
     * has data that does not affect its sort order.
     */
    BTree.prototype.set = function (key, value, overwrite) {
        if (this._root.isShared)
            this._root = this._root.clone();
        var result = this._root.set(key, value, overwrite, this);
        if (result === true || result === false)
            return result;
        // Root node has split, so create a new root node.
        this._root = new BNodeInternal([this._root, result]);
        return true;
    };
    /**
     * Returns true if the key exists in the B+ tree, false if not.
     * Use get() for best performance; use has() if you need to
     * distinguish between "undefined value" and "key not present".
     * @param key Key to detect
     * @description Computational complexity: O(log size)
     */
    BTree.prototype.has = function (key) {
        return this.forRange(key, key, true, undefined) !== 0;
    };
    /**
     * Removes a single key-value pair from the B+ tree.
     * @param key Key to find
     * @returns true if a pair was found and removed, false otherwise.
     * @description Computational complexity: O(log size)
     */
    BTree.prototype.delete = function (key) {
        return this.editRange(key, key, true, DeleteRange) !== 0;
    };
    BTree.prototype.with = function (key, value, overwrite) {
        var nu = this.clone();
        return nu.set(key, value, overwrite) || overwrite ? nu : this;
    };
    /** Returns a copy of the tree with the specified key-value pairs set. */
    BTree.prototype.withPairs = function (pairs, overwrite) {
        var nu = this.clone();
        return nu.setPairs(pairs, overwrite) !== 0 || overwrite ? nu : this;
    };
    /** Returns a copy of the tree with the specified keys present.
     *  @param keys The keys to add. If a key is already present in the tree,
     *         neither the existing key nor the existing value is modified.
     *  @param returnThisIfUnchanged if true, returns this if all keys already
     *  existed. Performance note: due to the architecture of this class, all
     *  node(s) leading to existing keys are cloned even if the collection is
     *  ultimately unchanged.
    */
    BTree.prototype.withKeys = function (keys, returnThisIfUnchanged) {
        var nu = this.clone(), changed = false;
        for (var i = 0; i < keys.length; i++)
            changed = nu.set(keys[i], undefined, false) || changed;
        return returnThisIfUnchanged && !changed ? this : nu;
    };
    /** Returns a copy of the tree with the specified key removed.
     * @param returnThisIfUnchanged if true, returns this if the key didn't exist.
     *  Performance note: due to the architecture of this class, node(s) leading
     *  to where the key would have been stored are cloned even when the key
     *  turns out not to exist and the collection is unchanged.
     */
    BTree.prototype.without = function (key, returnThisIfUnchanged) {
        return this.withoutRange(key, key, true, returnThisIfUnchanged);
    };
    /** Returns a copy of the tree with the specified keys removed.
     * @param returnThisIfUnchanged if true, returns this if none of the keys
     *  existed. Performance note: due to the architecture of this class,
     *  node(s) leading to where the key would have been stored are cloned
     *  even when the key turns out not to exist.
     */
    BTree.prototype.withoutKeys = function (keys, returnThisIfUnchanged) {
        var nu = this.clone();
        return nu.deleteKeys(keys) || !returnThisIfUnchanged ? nu : this;
    };
    /** Returns a copy of the tree with the specified range of keys removed. */
    BTree.prototype.withoutRange = function (low, high, includeHigh, returnThisIfUnchanged) {
        var nu = this.clone();
        if (nu.deleteRange(low, high, includeHigh) === 0 && returnThisIfUnchanged)
            return this;
        return nu;
    };
    /** Returns a copy of the tree with pairs removed whenever the callback
     *  function returns false. `where()` is a synonym for this method. */
    BTree.prototype.filter = function (callback, returnThisIfUnchanged) {
        var nu = this.greedyClone();
        var del;
        nu.editAll(function (k, v, i) {
            if (!callback(k, v, i))
                return del = Delete;
        });
        if (!del && returnThisIfUnchanged)
            return this;
        return nu;
    };
    /** Returns a copy of the tree with all values altered by a callback function. */
    BTree.prototype.mapValues = function (callback) {
        var tmp = {};
        var nu = this.greedyClone();
        nu.editAll(function (k, v, i) {
            return tmp.value = callback(v, k, i), tmp;
        });
        return nu;
    };
    BTree.prototype.reduce = function (callback, initialValue) {
        var i = 0, p = initialValue;
        var it = this.entries(this.minKey(), ReusedArray), next;
        while (!(next = it.next()).done)
            p = callback(p, next.value, i++, this);
        return p;
    };
    // Iterator methods ///////////////////////////////////////////////////////
    /** Returns an iterator that provides items in order (ascending order if
     *  the collection's comparator uses ascending order, as is the default.)
     *  @param lowestKey First key to be iterated, or undefined to start at
     *         minKey(). If the specified key doesn't exist then iteration
     *         starts at the next higher key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     */
    BTree.prototype.entries = function (lowestKey, reusedArray) {
        var info = this.findPath(lowestKey);
        if (info === undefined)
            return iterator();
        var nodequeue = info.nodequeue, nodeindex = info.nodeindex, leaf = info.leaf;
        var state = reusedArray !== undefined ? 1 : 0;
        var i = (lowestKey === undefined ? -1 : leaf.indexOf(lowestKey, 0, this._compare) - 1);
        return iterator(function () {
            jump: for (;;) {
                switch (state) {
                    case 0:
                        if (++i < leaf.keys.length)
                            return { done: false, value: [leaf.keys[i], leaf.values[i]] };
                        state = 2;
                        continue;
                    case 1:
                        if (++i < leaf.keys.length) {
                            reusedArray[0] = leaf.keys[i], reusedArray[1] = leaf.values[i];
                            return { done: false, value: reusedArray };
                        }
                        state = 2;
                    case 2:
                        // Advance to the next leaf node
                        for (var level = -1;;) {
                            if (++level >= nodequeue.length) {
                                state = 3;
                                continue jump;
                            }
                            if (++nodeindex[level] < nodequeue[level].length)
                                break;
                        }
                        for (; level > 0; level--) {
                            nodequeue[level - 1] = nodequeue[level][nodeindex[level]].children;
                            nodeindex[level - 1] = 0;
                        }
                        leaf = nodequeue[0][nodeindex[0]];
                        i = -1;
                        state = reusedArray !== undefined ? 1 : 0;
                        continue;
                    case 3:
                        return { done: true, value: undefined };
                }
            }
        });
    };
    /** Returns an iterator that provides items in reversed order.
     *  @param highestKey Key at which to start iterating, or undefined to
     *         start at minKey(). If the specified key doesn't exist then iteration
     *         starts at the next lower key (according to the comparator).
     *  @param reusedArray Optional array used repeatedly to store key-value
     *         pairs, to avoid creating a new array on every iteration.
     *  @param skipHighest Iff this flag is true and the highestKey exists in the
     *         collection, the pair matching highestKey is skipped, not iterated.
     */
    BTree.prototype.entriesReversed = function (highestKey, reusedArray, skipHighest) {
        if ((highestKey = highestKey || this.maxKey()) === undefined)
            return iterator(); // collection is empty
        var _a = this.findPath(highestKey) || this.findPath(this.maxKey()), nodequeue = _a.nodequeue, nodeindex = _a.nodeindex, leaf = _a.leaf;
        check(!nodequeue[0] || leaf === nodequeue[0][nodeindex[0]], "wat!");
        var i = leaf.indexOf(highestKey, 0, this._compare);
        if (!(skipHighest || this._compare(leaf.keys[i], highestKey) > 0))
            i++;
        var state = reusedArray !== undefined ? 1 : 0;
        return iterator(function () {
            jump: for (;;) {
                switch (state) {
                    case 0:
                        if (--i >= 0)
                            return { done: false, value: [leaf.keys[i], leaf.values[i]] };
                        state = 2;
                        continue;
                    case 1:
                        if (--i >= 0) {
                            reusedArray[0] = leaf.keys[i], reusedArray[1] = leaf.values[i];
                            return { done: false, value: reusedArray };
                        }
                        state = 2;
                    case 2:
                        // Advance to the next leaf node
                        for (var level = -1;;) {
                            if (++level >= nodequeue.length) {
                                state = 3;
                                continue jump;
                            }
                            if (--nodeindex[level] >= 0)
                                break;
                        }
                        for (; level > 0; level--) {
                            nodequeue[level - 1] = nodequeue[level][nodeindex[level]].children;
                            nodeindex[level - 1] = nodequeue[level - 1].length - 1;
                        }
                        leaf = nodequeue[0][nodeindex[0]];
                        i = leaf.keys.length;
                        state = reusedArray !== undefined ? 1 : 0;
                        continue;
                    case 3:
                        return { done: true, value: undefined };
                }
            }
        });
    };
    /* Used by entries() and entriesReversed() to prepare to start iterating.
     * It develops a "node queue" for each non-leaf level of the tree.
     * Levels are numbered "bottom-up" so that level 0 is a list of leaf
     * nodes from a low-level non-leaf node. The queue at a given level L
     * consists of nodequeue[L] which is the children of a BNodeInternal,
     * and nodeindex[L], the current index within that child list, such
     * such that nodequeue[L-1] === nodequeue[L][nodeindex[L]].children.
     * (However inside this function the order is reversed.)
     */
    BTree.prototype.findPath = function (key) {
        var nextnode = this._root;
        var nodequeue, nodeindex;
        if (nextnode.isLeaf) {
            nodequeue = EmptyArray, nodeindex = EmptyArray; // avoid allocations
        }
        else {
            nodequeue = [], nodeindex = [];
            for (var d = 0; !nextnode.isLeaf; d++) {
                nodequeue[d] = nextnode.children;
                nodeindex[d] = key === undefined ? 0 : nextnode.indexOf(key, 0, this._compare);
                if (nodeindex[d] >= nodequeue[d].length)
                    return; // first key > maxKey()
                nextnode = nodequeue[d][nodeindex[d]];
            }
            nodequeue.reverse();
            nodeindex.reverse();
        }
        return { nodequeue: nodequeue, nodeindex: nodeindex, leaf: nextnode };
    };
    /** Returns a new iterator for iterating the keys of each pair in ascending order.
     *  @param firstKey: Minimum key to include in the output. */
    BTree.prototype.keys = function (firstKey) {
        var it = this.entries(firstKey, ReusedArray);
        return iterator(function () {
            var n = it.next();
            if (n.value)
                n.value = n.value[0];
            return n;
        });
    };
    /** Returns a new iterator for iterating the values of each pair in order by key.
     *  @param firstKey: Minimum key whose associated value is included in the output. */
    BTree.prototype.values = function (firstKey) {
        var it = this.entries(firstKey, ReusedArray);
        return iterator(function () {
            var n = it.next();
            if (n.value)
                n.value = n.value[1];
            return n;
        });
    };
    Object.defineProperty(BTree.prototype, "maxNodeSize", {
        // Additional methods /////////////////////////////////////////////////////
        /** Returns the maximum number of children/values before nodes will split. */
        get: function () {
            return this._maxNodeSize;
        },
        enumerable: true,
        configurable: true
    });
    /** Gets the lowest key in the tree. Complexity: O(log size) */
    BTree.prototype.minKey = function () { return this._root.minKey(); };
    /** Gets the highest key in the tree. Complexity: O(1) */
    BTree.prototype.maxKey = function () { return this._root.maxKey(); };
    /** Quickly clones the tree by marking the root node as shared.
     *  Both copies remain editable. When you modify either copy, any
     *  nodes that are shared (or potentially shared) between the two
     *  copies are cloned so that the changes do not affect other copies.
     *  This is known as copy-on-write behavior, or "lazy copying". */
    BTree.prototype.clone = function () {
        this._root.isShared = true;
        var result = new BTree(undefined, this._compare, this._maxNodeSize);
        result._root = this._root;
        result._size = this._size;
        return result;
    };
    /** Performs a greedy clone, immediately duplicating any nodes that are
     *  not currently marked as shared, in order to avoid marking any nodes
     *  as shared.
     *  @param force Clone all nodes, even shared ones.
     */
    BTree.prototype.greedyClone = function (force) {
        var result = new BTree(undefined, this._compare, this._maxNodeSize);
        result._root = this._root.greedyClone(force);
        result._size = this._size;
        return result;
    };
    /** Gets an array filled with the contents of the tree, sorted by key */
    BTree.prototype.toArray = function (maxLength) {
        if (maxLength === void 0) { maxLength = 0x7FFFFFFF; }
        var min = this.minKey(), max = this.maxKey();
        if (min !== undefined)
            return this.getRange(min, max, true, maxLength);
        return [];
    };
    /** Gets an array of all keys, sorted */
    BTree.prototype.keysArray = function () {
        var results = [];
        this._root.forRange(this.minKey(), this.maxKey(), true, false, this, 0, function (k, v) { results.push(k); });
        return results;
    };
    /** Gets an array of all values, sorted by key */
    BTree.prototype.valuesArray = function () {
        var results = [];
        this._root.forRange(this.minKey(), this.maxKey(), true, false, this, 0, function (k, v) { results.push(v); });
        return results;
    };
    /** Gets a string representing the tree's data based on toArray(). */
    BTree.prototype.toString = function () {
        return this.toArray().toString();
    };
    /** Stores a key-value pair only if the key doesn't already exist in the tree.
     * @returns true if a new key was added
    */
    BTree.prototype.setIfNotPresent = function (key, value) {
        return this.set(key, value, false);
    };
    /** Returns the next pair whose key is larger than the specified key (or undefined if there is none) */
    BTree.prototype.nextHigherPair = function (key) {
        var it = this.entries(key, ReusedArray);
        var r = it.next();
        if (!r.done && this._compare(r.value[0], key) <= 0)
            r = it.next();
        return r.value;
    };
    /** Returns the next key larger than the specified key (or undefined if there is none) */
    BTree.prototype.nextHigherKey = function (key) {
        var p = this.nextHigherPair(key);
        return p ? p[0] : p;
    };
    /** Returns the next pair whose key is smaller than the specified key (or undefined if there is none) */
    BTree.prototype.nextLowerPair = function (key) {
        var it = this.entriesReversed(key, ReusedArray, true);
        return it.next().value;
    };
    /** Returns the next key smaller than the specified key (or undefined if there is none) */
    BTree.prototype.nextLowerKey = function (key) {
        var p = this.nextLowerPair(key);
        return p ? p[0] : p;
    };
    /** Edits the value associated with a key in the tree, if it already exists.
     * @returns true if the key existed, false if not.
    */
    BTree.prototype.changeIfPresent = function (key, value) {
        return this.editRange(key, key, true, function (k, v) { return ({ value: value }); }) !== 0;
    };
    /**
     * Builds an array of pairs from the specified range of keys, sorted by key.
     * Each returned pair is also an array: pair[0] is the key, pair[1] is the value.
     * @param low The first key in the array will be greater than or equal to `low`.
     * @param high This method returns when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, its pair will be included
     *        in the output if and only if this parameter is true. Note: if the
     *        `low` key is present, it is always included in the output.
     * @param maxLength Length limit. getRange will stop scanning the tree when
     *                  the array reaches this size.
     * @description Computational complexity: O(result.length + log size)
     */
    BTree.prototype.getRange = function (low, high, includeHigh, maxLength) {
        if (maxLength === void 0) { maxLength = 0x3FFFFFF; }
        var results = [];
        this._root.forRange(low, high, includeHigh, false, this, 0, function (k, v) {
            results.push([k, v]);
            return results.length > maxLength ? Break : undefined;
        });
        return results;
    };
    /** Adds all pairs from a list of key-value pairs.
     * @param pairs Pairs to add to this tree. If there are duplicate keys,
     *        later pairs currently overwrite earlier ones (e.g. [[0,1],[0,7]]
     *        associates 0 with 7.)
     * @param overwrite Whether to overwrite pairs that already exist (if false,
     *        pairs[i] is ignored when the key pairs[i][0] already exists.)
     * @returns The number of pairs added to the collection.
     * @description Computational complexity: O(pairs.length * log(size + pairs.length))
     */
    BTree.prototype.setPairs = function (pairs, overwrite) {
        var added = 0;
        for (var i = 0; i < pairs.length; i++)
            if (this.set(pairs[i][0], pairs[i][1], overwrite))
                added++;
        return added;
    };
    /**
     * Scans the specified range of keys, in ascending order by key.
     * Note: the callback `onFound` must not insert or remove items in the
     * collection. Doing so may cause incorrect data to be sent to the
     * callback afterward.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, `onFound` is called for
     *        that final pair if and only if this parameter is true.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return {break:R} to stop early with result R.
     * @param initialCounter Initial third argument of onFound. This value
     *        increases by one each time `onFound` is called. Default: 0
     * @returns The number of values found, or R if the callback returned
     *        `{break:R}` to stop early.
     * @description Computational complexity: O(number of items scanned + log size)
     */
    BTree.prototype.forRange = function (low, high, includeHigh, onFound, initialCounter) {
        var r = this._root.forRange(low, high, includeHigh, false, this, initialCounter || 0, onFound);
        return typeof r === "number" ? r : r.break;
    };
    /**
     * Scans and potentially modifies values for a subsequence of keys.
     * Note: the callback `onFound` should ideally be a pure function.
     *   Specfically, it must not insert items, call clone(), or change
     *   the collection except via return value; out-of-band editing may
     *   cause an exception or may cause incorrect data to be sent to
     *   the callback (duplicate or missed items). It must not cause a
     *   clone() of the collection, otherwise the clone could be modified
     *   by changes requested by the callback.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh If the `high` key is present, `onFound` is called for
     *        that final pair if and only if this parameter is true.
     * @param onFound A function that is called for each key-value pair. This
     *        function can return `{value:v}` to change the value associated
     *        with the current key, `{delete:true}` to delete the current pair,
     *        `{break:R}` to stop early with result R, or it can return nothing
     *        (undefined or {}) to cause no effect and continue iterating.
     *        `{break:R}` can be combined with one of the other two commands.
     *        The third argument `counter` is the number of items iterated
     *        previously; it equals 0 when `onFound` is called the first time.
     * @returns The number of values scanned, or R if the callback returned
     *        `{break:R}` to stop early.
     * @description
     *   Computational complexity: O(number of items scanned + log size)
     *   Note: if the tree has been cloned with clone(), any shared
     *   nodes are copied before `onFound` is called. This takes O(n) time
     *   where n is proportional to the amount of shared data scanned.
     */
    BTree.prototype.editRange = function (low, high, includeHigh, onFound, initialCounter) {
        var root = this._root;
        if (root.isShared)
            this._root = root = root.clone();
        try {
            var r = root.forRange(low, high, includeHigh, true, this, initialCounter || 0, onFound);
            return typeof r === "number" ? r : r.break;
        }
        finally {
            while (root.keys.length <= 1 && !root.isLeaf)
                this._root = root = root.keys.length === 0 ? EmptyLeaf :
                    root.children[0];
        }
    };
    /** Same as `editRange` except that the callback is called for all pairs. */
    BTree.prototype.editAll = function (onFound, initialCounter) {
        return this.editRange(this.minKey(), this.maxKey(), true, onFound, initialCounter);
    };
    /**
     * Removes a range of key-value pairs from the B+ tree.
     * @param low The first key scanned will be greater than or equal to `low`.
     * @param high Scanning stops when a key larger than this is reached.
     * @param includeHigh Specifies whether the `high` key, if present, is deleted.
     * @returns The number of key-value pairs that were deleted.
     * @description Computational complexity: O(log size + number of items deleted)
     */
    BTree.prototype.deleteRange = function (low, high, includeHigh) {
        return this.editRange(low, high, includeHigh, DeleteRange);
    };
    /** Deletes a series of keys from the collection. */
    BTree.prototype.deleteKeys = function (keys) {
        for (var i = 0, r = 0; i < keys.length; i++)
            if (this.delete(keys[i]))
                r++;
        return r;
    };
    Object.defineProperty(BTree.prototype, "height", {
        /** Gets the height of the tree: the number of internal nodes between the
         *  BTree object and its leaf nodes (zero if there are no internal nodes). */
        get: function () {
            for (var node = this._root, h = -1; node != null; h++)
                node = node.children;
            return h;
        },
        enumerable: true,
        configurable: true
    });
    /** Makes the object read-only to ensure it is not accidentally modified.
     *  Freezing does not have to be permanent; unfreeze() reverses the effect.
     *  This is accomplished by replacing mutator functions with a function
     *  that throws an Error. Compared to using a property (e.g. this.isFrozen)
     *  this implementation gives better performance in non-frozen BTrees.
     */
    BTree.prototype.freeze = function () {
        var t = this;
        // Note: all other mutators ultimately call set() or editRange() 
        //       so we don't need to override those others.
        t.clear = t.set = t.editRange = function () {
            throw new Error("Attempted to modify a frozen BTree");
        };
    };
    /** Ensures mutations are allowed, reversing the effect of freeze(). */
    BTree.prototype.unfreeze = function () {
        delete this.clear;
        delete this.set;
        delete this.editRange;
    };
    Object.defineProperty(BTree.prototype, "isFrozen", {
        /** Returns true if the tree appears to be frozen. */
        get: function () {
            return this.hasOwnProperty('editRange');
        },
        enumerable: true,
        configurable: true
    });
    /** Scans the tree for signs of serious bugs (e.g. this.size doesn't match
     *  number of elements, internal nodes not caching max element properly...)
     *  Computational complexity: O(number of nodes), i.e. O(size). This method
     *  skips the most expensive test - whether all keys are sorted - but it
     *  does check that maxKey() of the children of internal nodes are sorted. */
    BTree.prototype.checkValid = function () {
        var size = this._root.checkValid(0, this);
        check(size === this.size, "size mismatch: counted ", size, "but stored", this.size);
    };
    return BTree;
}());
exports.default = BTree;
if (Symbol && Symbol.iterator) // iterator is equivalent to entries()
    BTree.prototype[Symbol.iterator] = BTree.prototype.entries;
BTree.prototype.where = BTree.prototype.filter;
BTree.prototype.setRange = BTree.prototype.setPairs;
BTree.prototype.add = BTree.prototype.set;
function iterator(next) {
    if (next === void 0) { next = (function () { return ({ done: true, value: undefined }); }); }
    var result = { next: next };
    if (Symbol && Symbol.iterator)
        result[Symbol.iterator] = function () { return this; };
    return result;
}
/** Leaf node / base class. **************************************************/
var BNode = /** @class */ (function () {
    function BNode(keys, values) {
        if (keys === void 0) { keys = []; }
        this.keys = keys;
        this.values = values || undefVals;
        this.isShared = undefined;
    }
    Object.defineProperty(BNode.prototype, "isLeaf", {
        get: function () { return this.children === undefined; },
        enumerable: true,
        configurable: true
    });
    // Shared methods /////////////////////////////////////////////////////////
    BNode.prototype.maxKey = function () {
        return this.keys[this.keys.length - 1];
    };
    // If key not found, returns i^failXor where i is the insertion index.
    // Callers that don't care whether there was a match will set failXor=0.
    BNode.prototype.indexOf = function (key, failXor, cmp) {
        // TODO: benchmark multiple search strategies
        var keys = this.keys;
        var lo = 0, hi = keys.length, mid = hi >> 1;
        while (lo < hi) {
            var c = cmp(keys[mid], key);
            if (c < 0)
                lo = mid + 1;
            else if (c > 0) // key < keys[mid]
                hi = mid;
            else if (c === 0)
                return mid;
            else {
                // c is NaN or otherwise invalid
                if (key === key) // at least the search key is not NaN
                    return keys.length;
                else
                    throw new Error("BTree: NaN was used as a key");
            }
            mid = (lo + hi) >> 1;
        }
        return mid ^ failXor;
        // Unrolled version: benchmarks show same speed, not worth using
        /*var i = 1, c: number = 0, sum = 0;
        if (keys.length >= 4) {
          i = 3;
          if (keys.length >= 8) {
            i = 7;
            if (keys.length >= 16) {
              i = 15;
              if (keys.length >= 32) {
                i = 31;
                if (keys.length >= 64) {
                  i = 127;
                  i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 64 : -64;
                  sum += c;
                  i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 32 : -32;
                  sum += c;
                }
                i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 16 : -16;
                sum += c;
              }
              i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 8 : -8;
              sum += c;
            }
            i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 4 : -4;
            sum += c;
          }
          i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 2 : -2;
          sum += c;
        }
        i += (c = i < keys.length ? cmp(keys[i], key) : 1) < 0 ? 1 : -1;
        c = i < keys.length ? cmp(keys[i], key) : 1;
        sum += c;
        if (c < 0) {
          ++i;
          c = i < keys.length ? cmp(keys[i], key) : 1;
          sum += c;
        }
        if (sum !== sum) {
          if (key === key) // at least the search key is not NaN
            return keys.length ^ failXor;
          else
            throw new Error("BTree: NaN was used as a key");
        }
        return c === 0 ? i : i ^ failXor;*/
    };
    // Leaf Node: misc //////////////////////////////////////////////////////////
    BNode.prototype.minKey = function () {
        return this.keys[0];
    };
    BNode.prototype.clone = function () {
        var v = this.values;
        return new BNode(this.keys.slice(0), v === undefVals ? v : v.slice(0));
    };
    BNode.prototype.greedyClone = function (force) {
        return this.isShared && !force ? this : this.clone();
    };
    BNode.prototype.get = function (key, defaultValue, tree) {
        var i = this.indexOf(key, -1, tree._compare);
        return i < 0 ? defaultValue : this.values[i];
    };
    BNode.prototype.checkValid = function (depth, tree) {
        var kL = this.keys.length, vL = this.values.length;
        check(this.values === undefVals ? kL <= vL : kL === vL, "keys/values length mismatch: depth", depth, "with lengths", kL, vL);
        // Note: we don't check for "node too small" because sometimes a node
        // can legitimately have size 1. This occurs if there is a batch 
        // deletion, leaving a node of size 1, and the siblings are full so
        // it can't be merged with adjacent nodes. However, the parent will
        // verify that the average node size is at least half of the maximum.
        check(depth == 0 || kL > 0, "empty leaf at depth", depth);
        return kL;
    };
    // Leaf Node: set & node splitting //////////////////////////////////////////
    BNode.prototype.set = function (key, value, overwrite, tree) {
        var i = this.indexOf(key, -1, tree._compare);
        if (i < 0) {
            // key does not exist yet
            i = ~i;
            tree._size++;
            if (this.keys.length < tree._maxNodeSize) {
                return this.insertInLeaf(i, key, value, tree);
            }
            else {
                // This leaf node is full and must split
                var newRightSibling = this.splitOffRightSide(), target = this;
                if (i > this.keys.length) {
                    i -= this.keys.length;
                    target = newRightSibling;
                }
                target.insertInLeaf(i, key, value, tree);
                return newRightSibling;
            }
        }
        else {
            // Key already exists
            if (overwrite !== false) {
                if (value !== undefined)
                    this.reifyValues();
                // usually this is a no-op, but some users may wish to edit the key
                this.keys[i] = key;
                this.values[i] = value;
            }
            return false;
        }
    };
    BNode.prototype.reifyValues = function () {
        if (this.values === undefVals)
            return this.values = this.values.slice(0, this.keys.length);
        return this.values;
    };
    BNode.prototype.insertInLeaf = function (i, key, value, tree) {
        this.keys.splice(i, 0, key);
        if (this.values === undefVals) {
            while (undefVals.length < tree._maxNodeSize)
                undefVals.push(undefined);
            if (value === undefined) {
                return true;
            }
            else {
                this.values = undefVals.slice(0, this.keys.length - 1);
            }
        }
        this.values.splice(i, 0, value);
        return true;
    };
    BNode.prototype.takeFromRight = function (rhs) {
        // Reminder: parent node must update its copy of key for this node
        // assert: neither node is shared
        // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
        var v = this.values;
        if (rhs.values === undefVals) {
            if (v !== undefVals)
                v.push(undefined);
        }
        else {
            v = this.reifyValues();
            v.push(rhs.values.shift());
        }
        this.keys.push(rhs.keys.shift());
    };
    BNode.prototype.takeFromLeft = function (lhs) {
        // Reminder: parent node must update its copy of key for this node
        // assert: neither node is shared
        // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
        var v = this.values;
        if (lhs.values === undefVals) {
            if (v !== undefVals)
                v.unshift(undefined);
        }
        else {
            v = this.reifyValues();
            v.unshift(lhs.values.pop());
        }
        this.keys.unshift(lhs.keys.pop());
    };
    BNode.prototype.splitOffRightSide = function () {
        // Reminder: parent node must update its copy of key for this node
        var half = this.keys.length >> 1, keys = this.keys.splice(half);
        var values = this.values === undefVals ? undefVals : this.values.splice(half);
        return new BNode(keys, values);
    };
    // Leaf Node: scanning & deletions //////////////////////////////////////////
    BNode.prototype.forRange = function (low, high, includeHigh, editMode, tree, count, onFound) {
        var cmp = tree._compare;
        var iLow, iHigh;
        if (high === low) {
            if (!includeHigh)
                return count;
            iHigh = (iLow = this.indexOf(low, -1, cmp)) + 1;
            if (iLow < 0)
                return count;
        }
        else {
            iLow = this.indexOf(low, 0, cmp);
            iHigh = this.indexOf(high, -1, cmp);
            if (iHigh < 0)
                iHigh = ~iHigh;
            else if (includeHigh === true)
                iHigh++;
        }
        var keys = this.keys, values = this.values;
        if (onFound !== undefined) {
            for (var i = iLow; i < iHigh; i++) {
                var key = keys[i];
                var result = onFound(key, values[i], count++);
                if (result !== undefined) {
                    if (editMode === true) {
                        if (key !== keys[i] || this.isShared === true)
                            throw new Error("BTree illegally changed or cloned in editRange");
                        if (result.delete) {
                            this.keys.splice(i, 1);
                            if (this.values !== undefVals)
                                this.values.splice(i, 1);
                            tree._size--;
                            i--;
                            iHigh--;
                        }
                        else if (result.hasOwnProperty('value')) {
                            values[i] = result.value;
                        }
                    }
                    if (result.break !== undefined)
                        return result;
                }
            }
        }
        else
            count += iHigh - iLow;
        return count;
    };
    /** Adds entire contents of right-hand sibling (rhs is left unchanged) */
    BNode.prototype.mergeSibling = function (rhs, _) {
        this.keys.push.apply(this.keys, rhs.keys);
        if (this.values === undefVals) {
            if (rhs.values === undefVals)
                return;
            this.values = this.values.slice(0, this.keys.length);
        }
        this.values.push.apply(this.values, rhs.reifyValues());
    };
    return BNode;
}());
/** Internal node (non-leaf node) ********************************************/
var BNodeInternal = /** @class */ (function (_super) {
    __extends(BNodeInternal, _super);
    function BNodeInternal(children, keys) {
        var _this = this;
        if (!keys) {
            keys = [];
            for (var i = 0; i < children.length; i++)
                keys[i] = children[i].maxKey();
        }
        _this = _super.call(this, keys) || this;
        _this.children = children;
        return _this;
    }
    BNodeInternal.prototype.clone = function () {
        var children = this.children.slice(0);
        for (var i = 0; i < children.length; i++)
            children[i].isShared = true;
        return new BNodeInternal(children, this.keys.slice(0));
    };
    BNodeInternal.prototype.greedyClone = function (force) {
        if (this.isShared && !force)
            return this;
        var nu = new BNodeInternal(this.children.slice(0), this.keys.slice(0));
        for (var i = 0; i < nu.children.length; i++)
            nu.children[i] = nu.children[i].greedyClone();
        return nu;
    };
    BNodeInternal.prototype.minKey = function () {
        return this.children[0].minKey();
    };
    BNodeInternal.prototype.get = function (key, defaultValue, tree) {
        var i = this.indexOf(key, 0, tree._compare), children = this.children;
        return i < children.length ? children[i].get(key, defaultValue, tree) : undefined;
    };
    BNodeInternal.prototype.checkValid = function (depth, tree) {
        var kL = this.keys.length, cL = this.children.length;
        check(kL === cL, "keys/children length mismatch: depth", depth, "lengths", kL, cL);
        check(kL > 1, "internal node has length", kL, "at depth", depth);
        var size = 0, c = this.children, k = this.keys, childSize = 0;
        for (var i = 0; i < cL; i++) {
            size += c[i].checkValid(depth + 1, tree);
            childSize += c[i].keys.length;
            check(size >= childSize, "wtf"); // no way this will ever fail
            check(i === 0 || c[i - 1].constructor === c[i].constructor, "type mismatch");
            if (c[i].maxKey() != k[i])
                check(false, "keys[", i, "] =", k[i], "is wrong, should be ", c[i].maxKey(), "at depth", depth);
            if (!(i === 0 || tree._compare(k[i - 1], k[i]) < 0))
                check(false, "sort violation at depth", depth, "index", i, "keys", k[i - 1], k[i]);
        }
        var toofew = childSize < (tree.maxNodeSize >> 1) * cL;
        if (toofew || childSize > tree.maxNodeSize * cL)
            check(false, toofew ? "too few" : "too many", "children (", childSize, size, ") at depth", depth, ", maxNodeSize:", tree.maxNodeSize, "children.length:", cL);
        return size;
    };
    // Internal Node: set & node splitting //////////////////////////////////////
    BNodeInternal.prototype.set = function (key, value, overwrite, tree) {
        var c = this.children, max = tree._maxNodeSize, cmp = tree._compare;
        var i = Math.min(this.indexOf(key, 0, cmp), c.length - 1), child = c[i];
        if (child.isShared)
            c[i] = child = child.clone();
        if (child.keys.length >= max) {
            // child is full; inserting anything else will cause a split.
            // Shifting an item to the left or right sibling may avoid a split.
            // We can do a shift if the adjacent node is not full and if the
            // current key can still be placed in the same node after the shift.
            var other;
            if (i > 0 && (other = c[i - 1]).keys.length < max && cmp(child.keys[0], key) < 0) {
                if (other.isShared)
                    c[i - 1] = other = other.clone();
                other.takeFromRight(child);
                this.keys[i - 1] = other.maxKey();
            }
            else if ((other = c[i + 1]) !== undefined && other.keys.length < max && cmp(child.maxKey(), key) < 0) {
                if (other.isShared)
                    c[i + 1] = other = other.clone();
                other.takeFromLeft(child);
                this.keys[i] = c[i].maxKey();
            }
        }
        var result = child.set(key, value, overwrite, tree);
        if (result === false)
            return false;
        this.keys[i] = child.maxKey();
        if (result === true)
            return true;
        // The child has split and `result` is a new right child... does it fit?
        if (this.keys.length < max) { // yes
            this.insert(i + 1, result);
            return true;
        }
        else { // no, we must split also
            var newRightSibling = this.splitOffRightSide(), target = this;
            if (cmp(result.maxKey(), this.maxKey()) > 0) {
                target = newRightSibling;
                i -= this.keys.length;
            }
            target.insert(i + 1, result);
            return newRightSibling;
        }
    };
    BNodeInternal.prototype.insert = function (i, child) {
        this.children.splice(i, 0, child);
        this.keys.splice(i, 0, child.maxKey());
    };
    BNodeInternal.prototype.splitOffRightSide = function () {
        var half = this.children.length >> 1;
        return new BNodeInternal(this.children.splice(half), this.keys.splice(half));
    };
    BNodeInternal.prototype.takeFromRight = function (rhs) {
        // Reminder: parent node must update its copy of key for this node
        // assert: neither node is shared
        // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
        this.keys.push(rhs.keys.shift());
        this.children.push(rhs.children.shift());
    };
    BNodeInternal.prototype.takeFromLeft = function (lhs) {
        // Reminder: parent node must update its copy of key for this node
        // assert: neither node is shared
        // assert rhs.keys.length > (maxNodeSize/2 && this.keys.length<maxNodeSize)
        this.keys.unshift(lhs.keys.pop());
        this.children.unshift(lhs.children.pop());
    };
    // Internal Node: scanning & deletions //////////////////////////////////////
    BNodeInternal.prototype.forRange = function (low, high, includeHigh, editMode, tree, count, onFound) {
        var cmp = tree._compare;
        var iLow = this.indexOf(low, 0, cmp), i = iLow;
        var iHigh = Math.min(high === low ? iLow : this.indexOf(high, 0, cmp), this.keys.length - 1);
        var keys = this.keys, children = this.children;
        if (!editMode) {
            // Simple case
            for (; i <= iHigh; i++) {
                var result = children[i].forRange(low, high, includeHigh, editMode, tree, count, onFound);
                if (typeof result !== 'number')
                    return result;
                count = result;
            }
        }
        else if (i <= iHigh) {
            try {
                for (; i <= iHigh; i++) {
                    if (children[i].isShared)
                        children[i] = children[i].clone();
                    var result = children[i].forRange(low, high, includeHigh, editMode, tree, count, onFound);
                    keys[i] = children[i].maxKey();
                    if (typeof result !== 'number')
                        return result;
                    count = result;
                }
            }
            finally {
                // Deletions may have occurred, so look for opportunities to merge nodes.
                var half = tree._maxNodeSize >> 1;
                if (iLow > 0)
                    iLow--;
                for (i = iHigh; i >= iLow; i--) {
                    if (children[i].keys.length <= half)
                        this.tryMerge(i, tree._maxNodeSize);
                }
                // Are we completely empty?
                if (children[0].keys.length === 0) {
                    check(children.length === 1 && keys.length === 1, "emptiness bug");
                    children.shift();
                    keys.shift();
                }
            }
        }
        return count;
    };
    /** Merges child i with child i+1 if their combined size is not too large */
    BNodeInternal.prototype.tryMerge = function (i, maxSize) {
        var children = this.children;
        if (i >= 0 && i + 1 < children.length) {
            if (children[i].keys.length + children[i + 1].keys.length <= maxSize) {
                if (children[i].isShared) // cloned already UNLESS i is outside scan range
                    children[i] = children[i].clone();
                children[i].mergeSibling(children[i + 1], maxSize);
                children.splice(i + 1, 1);
                this.keys.splice(i + 1, 1);
                this.keys[i] = children[i].maxKey();
                return true;
            }
        }
        return false;
    };
    BNodeInternal.prototype.mergeSibling = function (rhs, maxNodeSize) {
        // assert !this.isShared;
        var oldLength = this.keys.length;
        this.keys.push.apply(this.keys, rhs.keys);
        this.children.push.apply(this.children, rhs.children);
        // If our children are themselves almost empty due to a mass-delete,
        // they may need to be merged too (but only the oldLength-1 and its
        // right sibling should need this).
        this.tryMerge(oldLength - 1, maxNodeSize);
    };
    return BNodeInternal;
}(BNode));
// Optimization: this array of `undefined`s is used instead of a normal
// array of values in nodes where `undefined` is the only value.
// Its length is extended to max node size on first use; since it can
// be shared between trees with different maximums, its length can only
// increase, never decrease. Its type should be undefined[] but strangely
// TypeScript won't allow the comparison V[] === undefined[]. To prevent
// users from making this array too large, BTree has a maximum node size.
var undefVals = [];
var Delete = { delete: true }, DeleteRange = function () { return Delete; };
var Break = { break: true };
var EmptyLeaf = (function () {
    var n = new BNode();
    n.isShared = true;
    return n;
})();
var EmptyArray = [];
var ReusedArray = []; // assumed thread-local
function check(fact) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    if (!fact) {
        args.unshift('B+ tree '); // at beginning of message
        throw new Error(args.join(' '));
    }
}
/** A BTree frozen in the empty state. */
exports.EmptyBTree = (function () { var t = new BTree(); t.freeze(); return t; })();

});

unwrapExports(b_tree);
var b_tree_1 = b_tree.defaultComparator;
var b_tree_2 = b_tree.EmptyBTree;

var extractKey_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });

// http://www.w3.org/TR/2015/REC-IndexedDB-20150108/#dfn-steps-for-extracting-a-key-from-a-value-using-a-key-path
var extractKey = function (keyPath, value) {
    if (Array.isArray(keyPath)) {
        var result = [];
        for (var _i = 0, keyPath_1 = keyPath; _i < keyPath_1.length; _i++) {
            var item = keyPath_1[_i];
            // This doesn't make sense to me based on the spec, but it is needed to pass the W3C KeyPath tests (see same
            // comment in validateKeyPath)
            if (item !== undefined &&
                item !== null &&
                typeof item !== "string" &&
                item.toString) {
                item = item.toString();
            }
            result.push(valueToKey_1.default(extractKey(item, value)));
        }
        return result;
    }
    if (keyPath === "") {
        return value;
    }
    var remainingKeyPath = keyPath;
    var object = value;
    while (remainingKeyPath !== null) {
        var identifier = void 0;
        var i = remainingKeyPath.indexOf(".");
        if (i >= 0) {
            identifier = remainingKeyPath.slice(0, i);
            remainingKeyPath = remainingKeyPath.slice(i + 1);
        }
        else {
            identifier = remainingKeyPath;
            remainingKeyPath = null;
        }
        if (!object.hasOwnProperty(identifier)) {
            return;
        }
        object = object[identifier];
    }
    return object;
};
exports.default = extractKey;

});

unwrapExports(extractKey_1);

var injectKey_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });

function injectKey(keyPath, value, key) {
    if (Array.isArray(keyPath)) {
        // tslint:disable-next-line max-line-length
        throw new Error("The key paths used in this section are always strings and never sequences, since it is not possible to create a object store which has a key generator and also has a key path that is a sequence.");
    }
    var identifiers = keyPath.split(".");
    if (identifiers.length === 0) {
        throw new Error("Assert: identifiers is not empty");
    }
    var lastIdentifier = identifiers.pop();
    if (lastIdentifier === null || lastIdentifier === undefined) {
        throw Error();
    }
    for (var _i = 0, identifiers_1 = identifiers; _i < identifiers_1.length; _i++) {
        var identifier = identifiers_1[_i];
        if (typeof value !== "object" && !Array.isArray(value)) {
            return false;
        }
        var hop = value.hasOwnProperty(identifier);
        if (!hop) {
            return true;
        }
        value = value[identifier];
    }
    if (!(typeof value === "object" || Array.isArray(value))) {
        throw new Error("can't inject key");
    }
    var newValue = structuredClone_1.default(value);
    newValue[lastIdentifier] = structuredClone_1.default(key);
    return newValue;
}
exports.injectKey = injectKey;
exports.default = injectKey;

});

unwrapExports(injectKey_1);
var injectKey_2 = injectKey_1.injectKey;

var makeStoreKeyValue_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });





function makeStoreKeyValue(value, key, currentKeyGenerator, autoIncrement, keyPath) {
    var haveKey = key !== null && key !== undefined;
    var haveKeyPath = keyPath !== null && keyPath !== undefined;
    // This models a decision table on (haveKey, haveKeyPath, autoIncrement)
    value = structuredClone_1.default(value);
    if (haveKey) {
        if (haveKeyPath) {
            // (yes, yes, no)
            // (yes, yes, yes)
            throw new errors.DataError();
        }
        else {
            if (autoIncrement) {
                // (yes, no, yes)
                key = valueToKey_1.default(key);
                var updatedKeyGenerator = void 0;
                if (typeof key !== "number") {
                    updatedKeyGenerator = currentKeyGenerator;
                }
                else {
                    updatedKeyGenerator = key;
                }
                return {
                    key: key,
                    value: value,
                    updatedKeyGenerator: updatedKeyGenerator,
                };
            }
            else {
                // (yes, no, no)
                throw new errors.DataError();
            }
        }
    }
    else {
        if (haveKeyPath) {
            if (autoIncrement) {
                // (no, yes, yes)
                var updatedKeyGenerator = void 0;
                var maybeInlineKey = extractKey_1.default(keyPath, value);
                if (maybeInlineKey === undefined) {
                    value = injectKey_1.default(keyPath, value, currentKeyGenerator);
                    key = currentKeyGenerator;
                    updatedKeyGenerator = currentKeyGenerator + 1;
                }
                else if (typeof maybeInlineKey === "number") {
                    key = maybeInlineKey;
                    if (maybeInlineKey >= currentKeyGenerator) {
                        updatedKeyGenerator = maybeInlineKey + 1;
                    }
                    else {
                        updatedKeyGenerator = currentKeyGenerator;
                    }
                }
                else {
                    key = maybeInlineKey;
                    updatedKeyGenerator = currentKeyGenerator;
                }
                return {
                    key: key,
                    value: value,
                    updatedKeyGenerator: updatedKeyGenerator,
                };
            }
            else {
                // (no, yes, no)
                key = extractKey_1.default(keyPath, value);
                key = valueToKey_1.default(key);
                return {
                    key: key,
                    value: value,
                    updatedKeyGenerator: currentKeyGenerator,
                };
            }
        }
        else {
            if (autoIncrement) {
                // (no, no, yes)
                return {
                    key: currentKeyGenerator,
                    value: value,
                    updatedKeyGenerator: currentKeyGenerator + 1,
                };
            }
            else {
                // (no, no, no)
                throw new errors.DataError();
            }
        }
    }
}
exports.makeStoreKeyValue = makeStoreKeyValue;

});

unwrapExports(makeStoreKeyValue_1);
var makeStoreKeyValue_2 = makeStoreKeyValue_1.makeStoreKeyValue;

var getIndexKeys_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2017 Jeremy Scheff
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
*/
Object.defineProperty(exports, "__esModule", { value: true });


function getIndexKeys(value, keyPath, multiEntry) {
    if (multiEntry && Array.isArray(keyPath)) {
        var keys = [];
        for (var _i = 0, keyPath_1 = keyPath; _i < keyPath_1.length; _i++) {
            var subkeyPath = keyPath_1[_i];
            var key = extractKey_1.default(subkeyPath, value);
            try {
                var k = valueToKey_1.default(key);
                keys.push(k);
            }
            catch (_a) {
                // Ignore invalid subkeys
            }
        }
        return keys;
    }
    else {
        var key = extractKey_1.default(keyPath, value);
        return [valueToKey_1.default(key)];
    }
}
exports.getIndexKeys = getIndexKeys;
exports.default = getIndexKeys;

});

unwrapExports(getIndexKeys_1);
var getIndexKeys_2 = getIndexKeys_1.getIndexKeys;

var MemoryBackend_1 = createCommonjsModule(function (module, exports) {
/*
 Copyright 2019 Florian Dold

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 or implied. See the License for the specific language governing
 permissions and limitations under the License.
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (commonjsGlobal && commonjsGlobal.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArrays = (commonjsGlobal && commonjsGlobal.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });









var TransactionLevel;
(function (TransactionLevel) {
    TransactionLevel[TransactionLevel["Disconnected"] = 0] = "Disconnected";
    TransactionLevel[TransactionLevel["Connected"] = 1] = "Connected";
    TransactionLevel[TransactionLevel["Read"] = 2] = "Read";
    TransactionLevel[TransactionLevel["Write"] = 3] = "Write";
    TransactionLevel[TransactionLevel["VersionChange"] = 4] = "VersionChange";
})(TransactionLevel || (TransactionLevel = {}));
var AsyncCondition = /** @class */ (function () {
    function AsyncCondition() {
        var op = openPromise_1.default();
        this._waitPromise = op.promise;
        this._resolveWaitPromise = op.resolve;
    }
    AsyncCondition.prototype.wait = function () {
        return this._waitPromise;
    };
    AsyncCondition.prototype.trigger = function () {
        this._resolveWaitPromise();
        var op = openPromise_1.default();
        this._waitPromise = op.promise;
        this._resolveWaitPromise = op.resolve;
    };
    return AsyncCondition;
}());
function nextStoreKey(forward, data, k) {
    if (k === undefined || k === null) {
        return undefined;
    }
    var res = forward ? data.nextHigherPair(k) : data.nextLowerPair(k);
    if (!res) {
        return undefined;
    }
    return res[1].primaryKey;
}
function furthestKey(forward, key1, key2) {
    if (key1 === undefined) {
        return key2;
    }
    if (key2 === undefined) {
        return key1;
    }
    var cmpResult = cmp.default(key1, key2);
    if (cmpResult === 0) {
        // Same result
        return key1;
    }
    if (forward && cmpResult === 1) {
        return key1;
    }
    if (forward && cmpResult === -1) {
        return key2;
    }
    if (!forward && cmpResult === 1) {
        return key2;
    }
    if (!forward && cmpResult === -1) {
        return key1;
    }
}
/**
 * Primitive in-memory backend.
 */
var MemoryBackend = /** @class */ (function () {
    function MemoryBackend() {
        this.databases = {};
        this.connectionIdCounter = 1;
        this.transactionIdCounter = 1;
        /**
         * Connections by connection cookie.
         */
        this.connections = {};
        /**
         * Connections by transaction (!!) cookie.  In this implementation,
         * at most one transaction can run at the same time per connection.
         */
        this.connectionsByTransaction = {};
        /**
         * Condition that is triggered whenever a client disconnects.
         */
        this.disconnectCond = new AsyncCondition();
        /**
         * Conditation that is triggered whenever a transaction finishes.
         */
        this.transactionDoneCond = new AsyncCondition();
        this.enableTracing = false;
    }
    /**
     * Load the data in this IndexedDB backend from a dump in JSON format.
     *
     * Must be called before any connections to the database backend have
     * been made.
     */
    MemoryBackend.prototype.importDump = function (data) {
        if (this.enableTracing) {
            console.log("importing dump (a)");
        }
        if (this.transactionIdCounter != 1 || this.connectionIdCounter != 1) {
            throw Error("data must be imported before first transaction or connection");
        }
        this.databases = {};
        for (var _i = 0, _a = Object.keys(data.databases); _i < _a.length; _i++) {
            var dbName = _a[_i];
            var schema = data.databases[dbName].schema;
            if (typeof schema !== "object") {
                throw Error("DB dump corrupt");
            }
            var objectStores = {};
            for (var _b = 0, _c = Object.keys(data.databases[dbName].objectStores); _b < _c.length; _b++) {
                var objectStoreName = _c[_b];
                var dumpedObjectStore = data.databases[dbName].objectStores[objectStoreName];
                var indexes = {};
                for (var _d = 0, _e = Object.keys(dumpedObjectStore.indexes); _d < _e.length; _d++) {
                    var indexName = _e[_d];
                    var dumpedIndex = dumpedObjectStore.indexes[indexName];
                    var pairs_1 = dumpedIndex.records.map(function (r) {
                        return structuredClone_1.default([r.indexKey, r]);
                    });
                    var indexData = new b_tree.default(pairs_1, cmp.default);
                    var index = {
                        deleted: false,
                        modifiedData: undefined,
                        modifiedName: undefined,
                        originalName: indexName,
                        originalData: indexData,
                    };
                    indexes[indexName] = index;
                }
                var pairs = dumpedObjectStore.records.map(function (r) {
                    return structuredClone_1.default([r.primaryKey, r]);
                });
                var objectStoreData = new b_tree.default(pairs, cmp.default);
                var objectStore = {
                    deleted: false,
                    modifiedData: undefined,
                    modifiedName: undefined,
                    modifiedKeyGenerator: undefined,
                    originalData: objectStoreData,
                    originalName: objectStoreName,
                    originalKeyGenerator: dumpedObjectStore.keyGenerator,
                    committedIndexes: indexes,
                    modifiedIndexes: {},
                };
                objectStores[objectStoreName] = objectStore;
            }
            var db = {
                deleted: false,
                committedObjectStores: objectStores,
                committedSchema: structuredClone_1.default(schema),
                connectionCookie: undefined,
                modifiedObjectStores: {},
                txLevel: TransactionLevel.Disconnected,
                txRestrictObjectStores: undefined,
            };
            this.databases[dbName] = db;
        }
    };
    MemoryBackend.prototype.makeObjectStoreMap = function (database) {
        var map = {};
        for (var objectStoreName in database.committedObjectStores) {
            var store = database.committedObjectStores[objectStoreName];
            var entry = {
                store: store,
                indexMap: Object.assign({}, store.committedIndexes),
            };
            map[objectStoreName] = entry;
        }
        return map;
    };
    /**
     * Export the contents of the database to JSON.
     *
     * Only exports data that has been committed.
     */
    MemoryBackend.prototype.exportDump = function () {
        this.enableTracing && console.log("exporting dump");
        var dbDumps = {};
        for (var _i = 0, _a = Object.keys(this.databases); _i < _a.length; _i++) {
            var dbName = _a[_i];
            var db = this.databases[dbName];
            var objectStores = {};
            var _loop_1 = function (objectStoreName) {
                var objectStore = db.committedObjectStores[objectStoreName];
                var indexes = {};
                var _loop_2 = function (indexName) {
                    var index = objectStore.committedIndexes[indexName];
                    var indexRecords = [];
                    index.originalData.forEach(function (v) {
                        indexRecords.push(structuredClone_1.default(v));
                    });
                    indexes[indexName] = { name: indexName, records: indexRecords };
                };
                for (var _i = 0, _a = Object.keys(objectStore.committedIndexes); _i < _a.length; _i++) {
                    var indexName = _a[_i];
                    _loop_2(indexName);
                }
                var objectStoreRecords = [];
                objectStore.originalData.forEach(function (v) {
                    objectStoreRecords.push(structuredClone_1.default(v));
                });
                objectStores[objectStoreName] = {
                    name: objectStoreName,
                    records: objectStoreRecords,
                    keyGenerator: objectStore.originalKeyGenerator,
                    indexes: indexes,
                };
            };
            for (var _b = 0, _c = Object.keys(db.committedObjectStores); _b < _c.length; _b++) {
                var objectStoreName = _c[_b];
                _loop_1(objectStoreName);
            }
            var dbDump = {
                objectStores: objectStores,
                schema: structuredClone_1.default(this.databases[dbName].committedSchema),
            };
            dbDumps[dbName] = dbDump;
        }
        return { databases: dbDumps };
    };
    MemoryBackend.prototype.getDatabases = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dbList, name;
            return __generator(this, function (_a) {
                if (this.enableTracing) {
                    console.log("TRACING: getDatabase");
                }
                dbList = [];
                for (name in this.databases) {
                    dbList.push({
                        name: name,
                        version: this.databases[name].committedSchema.databaseVersion,
                    });
                }
                return [2 /*return*/, dbList];
            });
        });
    };
    MemoryBackend.prototype.deleteDatabase = function (tx, name) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, myDb;
            return __generator(this, function (_a) {
                if (this.enableTracing) {
                    console.log("TRACING: deleteDatabase");
                }
                myConn = this.connectionsByTransaction[tx.transactionCookie];
                if (!myConn) {
                    throw Error("no connection associated with transaction");
                }
                myDb = this.databases[name];
                if (!myDb) {
                    throw Error("db not found");
                }
                if (myDb.committedSchema.databaseName !== name) {
                    throw Error("name does not match");
                }
                if (myDb.txLevel < TransactionLevel.VersionChange) {
                    throw new errors.InvalidStateError();
                }
                if (myDb.connectionCookie !== tx.transactionCookie) {
                    throw new errors.InvalidAccessError();
                }
                myDb.deleted = true;
                return [2 /*return*/];
            });
        });
    };
    MemoryBackend.prototype.connectDatabase = function (name) {
        return __awaiter(this, void 0, void 0, function () {
            var connectionId, connectionCookie, database, schema, myConn;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.enableTracing) {
                            console.log("TRACING: connectDatabase(" + name + ")");
                        }
                        connectionId = this.connectionIdCounter++;
                        connectionCookie = "connection-" + connectionId;
                        database = this.databases[name];
                        if (!database) {
                            schema = {
                                databaseName: name,
                                databaseVersion: 0,
                                objectStores: {},
                            };
                            database = {
                                committedSchema: schema,
                                deleted: false,
                                committedObjectStores: {},
                                modifiedObjectStores: {},
                                txLevel: TransactionLevel.Disconnected,
                                connectionCookie: undefined,
                                txRestrictObjectStores: undefined,
                            };
                            this.databases[name] = database;
                        }
                        _a.label = 1;
                    case 1:
                        if (!(database.txLevel !== TransactionLevel.Disconnected)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.disconnectCond.wait()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        database.txLevel = TransactionLevel.Connected;
                        database.txRestrictObjectStores = undefined;
                        database.connectionCookie = connectionCookie;
                        myConn = {
                            dbName: name,
                            deleted: false,
                            objectStoreMap: this.makeObjectStoreMap(database),
                            modifiedSchema: structuredClone_1.default(database.committedSchema),
                        };
                        this.connections[connectionCookie] = myConn;
                        return [2 /*return*/, { connectionCookie: connectionCookie }];
                }
            });
        });
    };
    MemoryBackend.prototype.beginTransaction = function (conn, objectStores, mode) {
        return __awaiter(this, void 0, void 0, function () {
            var transactionCookie, myConn, myDb;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.enableTracing) {
                            console.log("TRACING: beginTransaction");
                        }
                        transactionCookie = "tx-" + this.transactionIdCounter++;
                        myConn = this.connections[conn.connectionCookie];
                        if (!myConn) {
                            throw Error("connection not found");
                        }
                        myDb = this.databases[myConn.dbName];
                        if (!myDb) {
                            throw Error("db not found");
                        }
                        _a.label = 1;
                    case 1:
                        if (!(myDb.txLevel !== TransactionLevel.Connected)) return [3 /*break*/, 3];
                        if (this.enableTracing) {
                            console.log("TRACING: beginTransaction -- waiting for others to close");
                        }
                        return [4 /*yield*/, this.transactionDoneCond.wait()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        if (mode === "readonly") {
                            myDb.txLevel = TransactionLevel.Read;
                        }
                        else if (mode === "readwrite") {
                            myDb.txLevel = TransactionLevel.Write;
                        }
                        else {
                            throw Error("unsupported transaction mode");
                        }
                        myDb.txRestrictObjectStores = __spreadArrays(objectStores);
                        this.connectionsByTransaction[transactionCookie] = myConn;
                        return [2 /*return*/, { transactionCookie: transactionCookie }];
                }
            });
        });
    };
    MemoryBackend.prototype.enterVersionChange = function (conn, newVersion) {
        return __awaiter(this, void 0, void 0, function () {
            var transactionCookie, myConn, myDb;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.enableTracing) {
                            console.log("TRACING: enterVersionChange");
                        }
                        transactionCookie = "tx-vc-" + this.transactionIdCounter++;
                        myConn = this.connections[conn.connectionCookie];
                        if (!myConn) {
                            throw Error("connection not found");
                        }
                        myDb = this.databases[myConn.dbName];
                        if (!myDb) {
                            throw Error("db not found");
                        }
                        _a.label = 1;
                    case 1:
                        if (!(myDb.txLevel !== TransactionLevel.Connected)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.transactionDoneCond.wait()];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 1];
                    case 3:
                        myDb.txLevel = TransactionLevel.VersionChange;
                        myDb.txRestrictObjectStores = undefined;
                        this.connectionsByTransaction[transactionCookie] = myConn;
                        myConn.modifiedSchema.databaseVersion = newVersion;
                        return [2 /*return*/, { transactionCookie: transactionCookie }];
                }
            });
        });
    };
    MemoryBackend.prototype.close = function (conn) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, myDb;
            return __generator(this, function (_a) {
                if (this.enableTracing) {
                    console.log("TRACING: close");
                }
                myConn = this.connections[conn.connectionCookie];
                if (!myConn) {
                    throw Error("connection not found - already closed?");
                }
                if (!myConn.deleted) {
                    myDb = this.databases[myConn.dbName];
                    if (myDb.txLevel != TransactionLevel.Connected) {
                        throw Error("invalid state");
                    }
                    myDb.txLevel = TransactionLevel.Disconnected;
                    myDb.txRestrictObjectStores = undefined;
                }
                delete this.connections[conn.connectionCookie];
                this.disconnectCond.trigger();
                return [2 /*return*/];
            });
        });
    };
    MemoryBackend.prototype.getSchema = function (dbConn) {
        if (this.enableTracing) {
            console.log("TRACING: getSchema");
        }
        var myConn = this.connections[dbConn.connectionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        return myConn.modifiedSchema;
    };
    MemoryBackend.prototype.renameIndex = function (btx, objectStoreName, oldName, newName) {
        if (this.enableTracing) {
            console.log("TRACING: renameIndex(?, " + oldName + ", " + newName + ")");
        }
        var myConn = this.connectionsByTransaction[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error();
        }
        var indexesSchema = schema.objectStores[objectStoreName].indexes;
        if (indexesSchema[newName]) {
            throw new Error("new index name already used");
        }
        if (!indexesSchema) {
            throw new Error("new index name already used");
        }
        var index = myConn.objectStoreMap[objectStoreName].indexMap[oldName];
        if (!index) {
            throw Error("old index missing in connection's index map");
        }
        indexesSchema[newName] = indexesSchema[newName];
        delete indexesSchema[oldName];
        myConn.objectStoreMap[objectStoreName].indexMap[newName] = index;
        delete myConn.objectStoreMap[objectStoreName].indexMap[oldName];
        index.modifiedName = newName;
    };
    MemoryBackend.prototype.deleteIndex = function (btx, objectStoreName, indexName) {
        if (this.enableTracing) {
            console.log("TRACING: deleteIndex(" + indexName + ")");
        }
        var myConn = this.connections[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error();
        }
        if (!schema.objectStores[objectStoreName].indexes[indexName]) {
            throw new Error("index does not exist");
        }
        var index = myConn.objectStoreMap[objectStoreName].indexMap[indexName];
        if (!index) {
            throw Error("old index missing in connection's index map");
        }
        index.deleted = true;
        delete schema.objectStores[objectStoreName].indexes[indexName];
        delete myConn.objectStoreMap[objectStoreName].indexMap[indexName];
    };
    MemoryBackend.prototype.deleteObjectStore = function (btx, name) {
        if (this.enableTracing) {
            console.log("TRACING: deleteObjectStore(" + name + ")");
        }
        var myConn = this.connections[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error();
        }
        var objectStoreProperties = schema.objectStores[name];
        if (!objectStoreProperties) {
            throw Error("object store not found");
        }
        var objectStoreMapEntry = myConn.objectStoreMap[name];
        if (!objectStoreMapEntry) {
            throw Error("object store not found in map");
        }
        var indexNames = Object.keys(objectStoreProperties.indexes);
        for (var _i = 0, indexNames_1 = indexNames; _i < indexNames_1.length; _i++) {
            var indexName = indexNames_1[_i];
            this.deleteIndex(btx, name, indexName);
        }
        objectStoreMapEntry.store.deleted = true;
        delete myConn.objectStoreMap[name];
        delete schema.objectStores[name];
    };
    MemoryBackend.prototype.renameObjectStore = function (btx, oldName, newName) {
        if (this.enableTracing) {
            console.log("TRACING: renameObjectStore(?, " + oldName + ", " + newName + ")");
        }
        var myConn = this.connections[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error();
        }
        if (!schema.objectStores[oldName]) {
            throw Error("object store not found");
        }
        if (schema.objectStores[newName]) {
            throw Error("new object store already exists");
        }
        var objectStoreMapEntry = myConn.objectStoreMap[oldName];
        if (!objectStoreMapEntry) {
            throw Error("object store not found in map");
        }
        objectStoreMapEntry.store.modifiedName = newName;
        schema.objectStores[newName] = schema.objectStores[oldName];
        delete schema.objectStores[oldName];
        delete myConn.objectStoreMap[oldName];
        myConn.objectStoreMap[newName] = objectStoreMapEntry;
    };
    MemoryBackend.prototype.createObjectStore = function (btx, name, keyPath, autoIncrement) {
        if (this.enableTracing) {
            console.log("TRACING: createObjectStore(" + btx.transactionCookie + ", " + name + ")");
        }
        var myConn = this.connectionsByTransaction[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var newObjectStore = {
            deleted: false,
            modifiedName: undefined,
            originalName: name,
            modifiedData: undefined,
            originalData: new b_tree.default([], cmp.default),
            modifiedKeyGenerator: undefined,
            originalKeyGenerator: 1,
            committedIndexes: {},
            modifiedIndexes: {},
        };
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error("no schema for versionchange tx");
        }
        schema.objectStores[name] = {
            autoIncrement: autoIncrement,
            keyPath: keyPath,
            indexes: {},
        };
        myConn.objectStoreMap[name] = { store: newObjectStore, indexMap: {} };
        db.modifiedObjectStores[name] = newObjectStore;
    };
    MemoryBackend.prototype.createIndex = function (btx, indexName, objectStoreName, keyPath, multiEntry, unique) {
        var _this = this;
        if (this.enableTracing) {
            console.log("TRACING: createIndex(" + indexName + ")");
        }
        var myConn = this.connectionsByTransaction[btx.transactionCookie];
        if (!myConn) {
            throw Error("unknown connection");
        }
        var db = this.databases[myConn.dbName];
        if (!db) {
            throw Error("db not found");
        }
        if (db.txLevel < TransactionLevel.VersionChange) {
            throw Error("only allowed in versionchange transaction");
        }
        var indexProperties = {
            keyPath: keyPath,
            multiEntry: multiEntry,
            unique: unique,
        };
        var newIndex = {
            deleted: false,
            modifiedData: undefined,
            modifiedName: undefined,
            originalData: new b_tree.default([], cmp.default),
            originalName: indexName,
        };
        myConn.objectStoreMap[objectStoreName].indexMap[indexName] = newIndex;
        db.modifiedObjectStores[objectStoreName].modifiedIndexes[indexName] = newIndex;
        var schema = myConn.modifiedSchema;
        if (!schema) {
            throw Error("no schema in versionchange tx");
        }
        var objectStoreProperties = schema.objectStores[objectStoreName];
        if (!objectStoreProperties) {
            throw Error("object store not found");
        }
        objectStoreProperties.indexes[indexName] = indexProperties;
        var objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];
        if (!objectStoreMapEntry) {
            throw Error("object store does not exist");
        }
        var storeData = objectStoreMapEntry.store.modifiedData ||
            objectStoreMapEntry.store.originalData;
        storeData.forEach(function (v, k) {
            _this.insertIntoIndex(newIndex, k, v.value, indexProperties);
        });
    };
    MemoryBackend.prototype.deleteRecord = function (btx, objectStoreName, range) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, db, schema, objectStoreMapEntry, modifiedData, currKey, firstValue, storeEntry, _i, _a, indexName, index, indexProperties;
            return __generator(this, function (_b) {
                if (this.enableTracing) {
                    console.log("TRACING: deleteRecord from store " + objectStoreName);
                }
                myConn = this.connectionsByTransaction[btx.transactionCookie];
                if (!myConn) {
                    throw Error("unknown connection");
                }
                db = this.databases[myConn.dbName];
                if (!db) {
                    throw Error("db not found");
                }
                if (db.txLevel < TransactionLevel.Write) {
                    throw Error("only allowed in write transaction");
                }
                if (db.txRestrictObjectStores &&
                    !db.txRestrictObjectStores.includes(objectStoreName)) {
                    throw Error("Not allowed to access store '" + objectStoreName + "', transaction is over " + JSON.stringify(db.txRestrictObjectStores));
                }
                if (typeof range !== "object") {
                    throw Error("deleteRecord got invalid range (must be object)");
                }
                if (!("lowerOpen" in range)) {
                    throw Error("deleteRecord got invalid range (sanity check failed, 'lowerOpen' missing)");
                }
                schema = myConn.modifiedSchema;
                objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];
                if (!objectStoreMapEntry.store.modifiedData) {
                    objectStoreMapEntry.store.modifiedData =
                        objectStoreMapEntry.store.originalData;
                }
                modifiedData = objectStoreMapEntry.store.modifiedData;
                if (range.lower === undefined || range.lower === null) {
                    currKey = modifiedData.minKey();
                }
                else {
                    currKey = range.lower;
                    // We have a range with an lowerOpen lower bound, so don't start
                    // deleting the lower bound.  Instead start with the next higher key.
                    if (range.lowerOpen && currKey !== undefined) {
                        currKey = modifiedData.nextHigherKey(currKey);
                    }
                }
                firstValue = modifiedData.get(currKey);
                if (!firstValue) {
                    if (currKey !== undefined) {
                        currKey = modifiedData.nextHigherKey(currKey);
                    }
                }
                // loop invariant: (currKey is undefined) or (currKey is a valid key)
                while (true) {
                    if (currKey === undefined) {
                        // nothing more to delete!
                        break;
                    }
                    if (range.upper !== null && range.upper !== undefined) {
                        if (range.upperOpen && cmp.default(currKey, range.upper) === 0) {
                            // We have a range that's upperOpen, so stop before we delete the upper bound.
                            break;
                        }
                        if (!range.upperOpen && cmp.default(currKey, range.upper) > 0) {
                            // The upper range is inclusive, only stop if we're after the upper range.
                            break;
                        }
                    }
                    storeEntry = modifiedData.get(currKey);
                    if (!storeEntry) {
                        throw Error("assertion failed");
                    }
                    for (_i = 0, _a = Object.keys(schema.objectStores[objectStoreName].indexes); _i < _a.length; _i++) {
                        indexName = _a[_i];
                        index = myConn.objectStoreMap[objectStoreName].indexMap[indexName];
                        if (!index) {
                            throw Error("index referenced by object store does not exist");
                        }
                        this.enableTracing &&
                            console.log("deleting from index " + indexName + " for object store " + objectStoreName);
                        indexProperties = schema.objectStores[objectStoreName].indexes[indexName];
                        this.deleteFromIndex(index, storeEntry.primaryKey, storeEntry.value, indexProperties);
                    }
                    modifiedData = modifiedData.without(currKey);
                    currKey = modifiedData.nextHigherKey(currKey);
                }
                objectStoreMapEntry.store.modifiedData = modifiedData;
                return [2 /*return*/];
            });
        });
    };
    MemoryBackend.prototype.deleteFromIndex = function (index, primaryKey, value, indexProperties) {
        if (this.enableTracing) {
            console.log("deleteFromIndex(" + (index.modifiedName || index.originalName) + ")");
        }
        if (value === undefined || value === null) {
            throw Error("cannot delete null/undefined value from index");
        }
        var indexData = index.modifiedData || index.originalData;
        var indexKeys = getIndexKeys_1.default(value, indexProperties.keyPath, indexProperties.multiEntry);
        for (var _i = 0, indexKeys_1 = indexKeys; _i < indexKeys_1.length; _i++) {
            var indexKey = indexKeys_1[_i];
            var existingRecord = indexData.get(indexKey);
            if (!existingRecord) {
                throw Error("db inconsistent: expected index entry missing");
            }
            var newPrimaryKeys = existingRecord.primaryKeys.filter(function (x) { return cmp.default(x, primaryKey) !== 0; });
            if (newPrimaryKeys.length === 0) {
                index.modifiedData = indexData.without(indexKey);
            }
            else {
                var newIndexRecord = {
                    indexKey: indexKey,
                    primaryKeys: newPrimaryKeys,
                };
                index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
            }
        }
    };
    MemoryBackend.prototype.getRecords = function (btx, req) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, db, objectStoreMapEntry, range, numResults, indexKeys, primaryKeys, values, forward, unique, storeData, haveIndex, index, indexData, indexPos, primaryPos, compareResult, primCompareResult, indexEntry, res, primkeySubPos, pos, cmpResult, cmpResult, res, skip, i, result, storePos, storeEntry, res;
            return __generator(this, function (_a) {
                if (this.enableTracing) {
                    console.log("TRACING: getRecords");
                    console.log("query", req);
                }
                myConn = this.connectionsByTransaction[btx.transactionCookie];
                if (!myConn) {
                    throw Error("unknown connection");
                }
                db = this.databases[myConn.dbName];
                if (!db) {
                    throw Error("db not found");
                }
                if (db.txLevel < TransactionLevel.Read) {
                    throw Error("only allowed while running a transaction");
                }
                if (db.txRestrictObjectStores &&
                    !db.txRestrictObjectStores.includes(req.objectStoreName)) {
                    throw Error("Not allowed to access store '" + req.objectStoreName + "', transaction is over " + JSON.stringify(db.txRestrictObjectStores));
                }
                objectStoreMapEntry = myConn.objectStoreMap[req.objectStoreName];
                if (!objectStoreMapEntry) {
                    throw Error("object store not found");
                }
                if (req.range == null || req.range === undefined) {
                    range = new BridgeIDBKeyRange_1.default(undefined, undefined, true, true);
                }
                else {
                    range = req.range;
                }
                if (typeof range !== "object") {
                    throw Error("getRecords was given an invalid range (sanity check failed, not an object)");
                }
                if (!("lowerOpen" in range)) {
                    throw Error("getRecords was given an invalid range (sanity check failed, lowerOpen missing)");
                }
                numResults = 0;
                indexKeys = [];
                primaryKeys = [];
                values = [];
                forward = req.direction === "next" || req.direction === "nextunique";
                unique = req.direction === "prevunique" || req.direction === "nextunique";
                storeData = objectStoreMapEntry.store.modifiedData ||
                    objectStoreMapEntry.store.originalData;
                haveIndex = req.indexName !== undefined;
                if (haveIndex) {
                    index = myConn.objectStoreMap[req.objectStoreName].indexMap[req.indexName];
                    indexData = index.modifiedData || index.originalData;
                    indexPos = req.lastIndexPosition;
                    if (indexPos === undefined) {
                        // First time we iterate!  So start at the beginning (lower/upper)
                        // of our allowed range.
                        indexPos = forward ? range.lower : range.upper;
                    }
                    primaryPos = req.lastObjectStorePosition;
                    // We might have to advance the index key further!
                    if (req.advanceIndexKey !== undefined) {
                        compareResult = cmp.default(req.advanceIndexKey, indexPos);
                        if ((forward && compareResult > 0) || (!forward && compareResult > 0)) {
                            indexPos = req.advanceIndexKey;
                        }
                        else if (compareResult == 0 && req.advancePrimaryKey !== undefined) {
                            // index keys are the same, so advance the primary key
                            if (primaryPos === undefined) {
                                primaryPos = req.advancePrimaryKey;
                            }
                            else {
                                primCompareResult = cmp.default(req.advancePrimaryKey, primaryPos);
                                if ((forward && primCompareResult > 0) ||
                                    (!forward && primCompareResult < 0)) {
                                    primaryPos = req.advancePrimaryKey;
                                }
                            }
                        }
                    }
                    if (indexPos === undefined || indexPos === null) {
                        indexPos = forward ? indexData.minKey() : indexData.maxKey();
                    }
                    indexEntry = void 0;
                    indexEntry = indexData.get(indexPos);
                    if (!indexEntry) {
                        res = indexData.nextHigherPair(indexPos);
                        if (res) {
                            indexEntry = res[1];
                            indexPos = indexEntry.indexKey;
                        }
                    }
                    primkeySubPos = 0;
                    // Sort out the case where the index key is the same, so we have
                    // to get the prev/next primary key
                    if (indexEntry !== undefined &&
                        req.lastIndexPosition !== undefined &&
                        cmp.default(indexEntry.indexKey, req.lastIndexPosition) === 0) {
                        pos = forward ? 0 : indexEntry.primaryKeys.length - 1;
                        this.enableTracing &&
                            console.log("number of primary keys", indexEntry.primaryKeys.length);
                        this.enableTracing && console.log("start pos is", pos);
                        // Advance past the lastObjectStorePosition
                        do {
                            cmpResult = cmp.default(req.lastObjectStorePosition, indexEntry.primaryKeys[pos]);
                            this.enableTracing && console.log("cmp result is", cmpResult);
                            if ((forward && cmpResult < 0) || (!forward && cmpResult > 0)) {
                                break;
                            }
                            pos += forward ? 1 : -1;
                            this.enableTracing && console.log("now pos is", pos);
                        } while (pos >= 0 && pos < indexEntry.primaryKeys.length);
                        // Make sure we're at least at advancedPrimaryPos
                        while (primaryPos !== undefined &&
                            pos >= 0 &&
                            pos < indexEntry.primaryKeys.length) {
                            cmpResult = cmp.default(primaryPos, indexEntry.primaryKeys[pos]);
                            if ((forward && cmpResult <= 0) || (!forward && cmpResult >= 0)) {
                                break;
                            }
                            pos += forward ? 1 : -1;
                        }
                        primkeySubPos = pos;
                    }
                    else if (indexEntry !== undefined) {
                        primkeySubPos = forward ? 0 : indexEntry.primaryKeys.length - 1;
                    }
                    if (this.enableTracing) {
                        console.log("subPos=", primkeySubPos);
                        console.log("indexPos=", indexPos);
                    }
                    while (1) {
                        if (req.limit != 0 && numResults == req.limit) {
                            break;
                        }
                        if (indexPos === undefined) {
                            break;
                        }
                        if (!range.includes(indexPos)) {
                            break;
                        }
                        if (indexEntry === undefined) {
                            break;
                        }
                        if (primkeySubPos < 0 ||
                            primkeySubPos >= indexEntry.primaryKeys.length) {
                            res = forward
                                ? indexData.nextHigherPair(indexPos)
                                : indexData.nextLowerPair(indexPos);
                            if (res) {
                                indexPos = res[1].indexKey;
                                indexEntry = res[1];
                                primkeySubPos = forward ? 0 : indexEntry.primaryKeys.length - 1;
                                continue;
                            }
                            else {
                                break;
                            }
                        }
                        skip = false;
                        if (unique) {
                            if (indexKeys.length > 0 &&
                                cmp.default(indexEntry.indexKey, indexKeys[indexKeys.length - 1]) === 0) {
                                skip = true;
                            }
                            if (req.lastIndexPosition !== undefined &&
                                cmp.default(indexPos, req.lastIndexPosition) === 0) {
                                skip = true;
                            }
                        }
                        if (!skip) {
                            if (this.enableTracing) {
                                console.log("not skipping!, subPos=" + primkeySubPos);
                            }
                            indexKeys.push(indexEntry.indexKey);
                            primaryKeys.push(indexEntry.primaryKeys[primkeySubPos]);
                            numResults++;
                        }
                        else {
                            if (this.enableTracing) {
                                console.log("skipping!");
                            }
                        }
                        primkeySubPos += forward ? 1 : -1;
                    }
                    // Now we can collect the values based on the primary keys,
                    // if requested.
                    if (req.resultLevel === backendInterface.ResultLevel.Full) {
                        for (i = 0; i < numResults; i++) {
                            result = storeData.get(primaryKeys[i]);
                            if (!result) {
                                console.error("invariant violated during read");
                                console.error("request was", req);
                                throw Error("invariant violated during read");
                            }
                            values.push(structuredClone_1.default(result.value));
                        }
                    }
                }
                else {
                    storePos = req.lastObjectStorePosition;
                    if (storePos === undefined) {
                        storePos = forward ? range.lower : range.upper;
                    }
                    if (req.advanceIndexKey !== undefined) {
                        throw Error("unsupported request");
                    }
                    storePos = furthestKey(forward, req.advancePrimaryKey, storePos);
                    if (storePos !== null && storePos !== undefined) {
                        storeEntry = storeData.get(storePos);
                        if (this.enableTracing) {
                            console.log("store entry:", storeEntry);
                        }
                        if (!storeEntry ||
                            (req.lastObjectStorePosition !== undefined &&
                                cmp.default(req.lastObjectStorePosition, storePos) === 0)) {
                            storePos = storeData.nextHigherKey(storePos);
                        }
                    }
                    else {
                        storePos = forward ? storeData.minKey() : storeData.maxKey();
                        if (this.enableTracing) {
                            console.log("setting starting store pos to", storePos);
                        }
                    }
                    while (1) {
                        if (req.limit != 0 && numResults == req.limit) {
                            break;
                        }
                        if (storePos === null || storePos === undefined) {
                            break;
                        }
                        if (!range.includes(storePos)) {
                            break;
                        }
                        res = storeData.get(storePos);
                        if (res === undefined) {
                            break;
                        }
                        if (req.resultLevel >= backendInterface.ResultLevel.OnlyKeys) {
                            primaryKeys.push(structuredClone_1.default(storePos));
                        }
                        if (req.resultLevel >= backendInterface.ResultLevel.Full) {
                            values.push(structuredClone_1.default(res.value));
                        }
                        numResults++;
                        storePos = nextStoreKey(forward, storeData, storePos);
                    }
                }
                if (this.enableTracing) {
                    console.log("TRACING: getRecords got " + numResults + " results");
                }
                return [2 /*return*/, {
                        count: numResults,
                        indexKeys: req.resultLevel >= backendInterface.ResultLevel.OnlyKeys && haveIndex
                            ? indexKeys
                            : undefined,
                        primaryKeys: req.resultLevel >= backendInterface.ResultLevel.OnlyKeys ? primaryKeys : undefined,
                        values: req.resultLevel >= backendInterface.ResultLevel.Full ? values : undefined,
                    }];
            });
        });
    };
    MemoryBackend.prototype.storeRecord = function (btx, storeReq) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, db, schema, objectStoreMapEntry, modifiedData, key, value, keygen, autoIncrement, keyPath, storeKeyResult, kp, n, m, hasKey, objectStoreRecord, _i, _a, indexName, index, indexProperties;
            return __generator(this, function (_b) {
                if (this.enableTracing) {
                    console.log("TRACING: storeRecord");
                }
                myConn = this.connectionsByTransaction[btx.transactionCookie];
                if (!myConn) {
                    throw Error("unknown connection");
                }
                db = this.databases[myConn.dbName];
                if (!db) {
                    throw Error("db not found");
                }
                if (db.txLevel < TransactionLevel.Write) {
                    throw Error("only allowed while running a transaction");
                }
                if (db.txRestrictObjectStores &&
                    !db.txRestrictObjectStores.includes(storeReq.objectStoreName)) {
                    throw Error("Not allowed to access store '" + storeReq.objectStoreName + "', transaction is over " + JSON.stringify(db.txRestrictObjectStores));
                }
                schema = myConn.modifiedSchema;
                objectStoreMapEntry = myConn.objectStoreMap[storeReq.objectStoreName];
                if (!objectStoreMapEntry.store.modifiedData) {
                    objectStoreMapEntry.store.modifiedData =
                        objectStoreMapEntry.store.originalData;
                }
                modifiedData = objectStoreMapEntry.store.modifiedData;
                if (storeReq.storeLevel === backendInterface.StoreLevel.UpdateExisting) {
                    if (storeReq.key === null || storeReq.key === undefined) {
                        throw Error("invalid update request (key not given)");
                    }
                    if (!objectStoreMapEntry.store.modifiedData.has(storeReq.key)) {
                        throw Error("invalid update request (record does not exist)");
                    }
                    key = storeReq.key;
                    value = storeReq.value;
                }
                else {
                    keygen = objectStoreMapEntry.store.modifiedKeyGenerator ||
                        objectStoreMapEntry.store.originalKeyGenerator;
                    autoIncrement = schema.objectStores[storeReq.objectStoreName].autoIncrement;
                    keyPath = schema.objectStores[storeReq.objectStoreName].keyPath;
                    storeKeyResult = void 0;
                    try {
                        storeKeyResult = makeStoreKeyValue_1.makeStoreKeyValue(storeReq.value, storeReq.key, keygen, autoIncrement, keyPath);
                    }
                    catch (e) {
                        if (e instanceof errors.DataError) {
                            kp = JSON.stringify(keyPath);
                            n = storeReq.objectStoreName;
                            m = "Could not extract key from value, objectStore=" + n + ", keyPath=" + kp;
                            if (this.enableTracing) {
                                console.error(e);
                                console.error("value was:", storeReq.value);
                                console.error("key was:", storeReq.key);
                            }
                            throw new errors.DataError(m);
                        }
                        else {
                            throw e;
                        }
                    }
                    key = storeKeyResult.key;
                    value = storeKeyResult.value;
                    objectStoreMapEntry.store.modifiedKeyGenerator =
                        storeKeyResult.updatedKeyGenerator;
                    hasKey = modifiedData.has(key);
                    if (hasKey && storeReq.storeLevel !== backendInterface.StoreLevel.AllowOverwrite) {
                        throw Error("refusing to overwrite");
                    }
                }
                objectStoreRecord = {
                    primaryKey: structuredClone_1.default(key),
                    value: structuredClone_1.default(value),
                };
                objectStoreMapEntry.store.modifiedData = modifiedData.with(key, objectStoreRecord, true);
                for (_i = 0, _a = Object.keys(schema.objectStores[storeReq.objectStoreName].indexes); _i < _a.length; _i++) {
                    indexName = _a[_i];
                    index = myConn.objectStoreMap[storeReq.objectStoreName].indexMap[indexName];
                    if (!index) {
                        throw Error("index referenced by object store does not exist");
                    }
                    indexProperties = schema.objectStores[storeReq.objectStoreName].indexes[indexName];
                    this.insertIntoIndex(index, key, value, indexProperties);
                }
                return [2 /*return*/, { key: key }];
            });
        });
    };
    MemoryBackend.prototype.insertIntoIndex = function (index, primaryKey, value, indexProperties) {
        if (this.enableTracing) {
            console.log("insertIntoIndex(" + (index.modifiedName || index.originalName) + ")");
        }
        var indexData = index.modifiedData || index.originalData;
        var indexKeys;
        try {
            indexKeys = getIndexKeys_1.default(value, indexProperties.keyPath, indexProperties.multiEntry);
        }
        catch (e) {
            if (e instanceof errors.DataError) {
                var n = index.modifiedName || index.originalName;
                var p = JSON.stringify(indexProperties.keyPath);
                var m = "Failed to extract index keys from index " + n + " for keyPath " + p + ".";
                if (this.enableTracing) {
                    console.error(m);
                    console.error("value was", value);
                }
                throw new errors.DataError(m);
            }
            else {
                throw e;
            }
        }
        for (var _i = 0, indexKeys_2 = indexKeys; _i < indexKeys_2.length; _i++) {
            var indexKey = indexKeys_2[_i];
            var existingRecord = indexData.get(indexKey);
            if (existingRecord) {
                if (indexProperties.unique) {
                    throw new errors.ConstraintError();
                }
                else {
                    var pred = function (x) { return cmp.default(x, primaryKey) === 0; };
                    if (existingRecord.primaryKeys.findIndex(pred) === -1) {
                        var newIndexRecord = {
                            indexKey: indexKey,
                            primaryKeys: __spreadArrays(existingRecord.primaryKeys, [primaryKey]).sort(cmp.default),
                        };
                        index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
                    }
                }
            }
            else {
                var newIndexRecord = {
                    indexKey: indexKey,
                    primaryKeys: [primaryKey],
                };
                index.modifiedData = indexData.with(indexKey, newIndexRecord, true);
            }
        }
    };
    MemoryBackend.prototype.rollback = function (btx) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, db, objectStoreName, objectStore, _i, _a, indexName, index;
            return __generator(this, function (_b) {
                if (this.enableTracing) {
                    console.log("TRACING: rollback");
                }
                myConn = this.connectionsByTransaction[btx.transactionCookie];
                if (!myConn) {
                    throw Error("unknown connection");
                }
                db = this.databases[myConn.dbName];
                if (!db) {
                    throw Error("db not found");
                }
                if (db.txLevel < TransactionLevel.Read) {
                    throw Error("only allowed while running a transaction");
                }
                db.modifiedObjectStores = {};
                db.txLevel = TransactionLevel.Connected;
                db.txRestrictObjectStores = undefined;
                myConn.modifiedSchema = structuredClone_1.default(db.committedSchema);
                myConn.objectStoreMap = this.makeObjectStoreMap(db);
                for (objectStoreName in db.committedObjectStores) {
                    objectStore = db.committedObjectStores[objectStoreName];
                    objectStore.deleted = false;
                    objectStore.modifiedData = undefined;
                    objectStore.modifiedName = undefined;
                    objectStore.modifiedKeyGenerator = undefined;
                    objectStore.modifiedIndexes = {};
                    for (_i = 0, _a = Object.keys(db.committedSchema.objectStores[objectStoreName].indexes); _i < _a.length; _i++) {
                        indexName = _a[_i];
                        index = objectStore.committedIndexes[indexName];
                        index.deleted = false;
                        index.modifiedData = undefined;
                        index.modifiedName = undefined;
                    }
                }
                delete this.connectionsByTransaction[btx.transactionCookie];
                this.transactionDoneCond.trigger();
                return [2 /*return*/];
            });
        });
    };
    MemoryBackend.prototype.commit = function (btx) {
        return __awaiter(this, void 0, void 0, function () {
            var myConn, db, txLevel, objectStoreName, objectStoreMapEntry, store, indexName, index;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.enableTracing) {
                            console.log("TRACING: commit");
                        }
                        myConn = this.connectionsByTransaction[btx.transactionCookie];
                        if (!myConn) {
                            throw Error("unknown connection");
                        }
                        db = this.databases[myConn.dbName];
                        if (!db) {
                            throw Error("db not found");
                        }
                        txLevel = db.txLevel;
                        if (txLevel < TransactionLevel.Read) {
                            throw Error("only allowed while running a transaction");
                        }
                        db.committedSchema = structuredClone_1.default(myConn.modifiedSchema);
                        db.txLevel = TransactionLevel.Connected;
                        db.txRestrictObjectStores = undefined;
                        db.committedObjectStores = {};
                        db.committedObjectStores = {};
                        for (objectStoreName in myConn.objectStoreMap) {
                            objectStoreMapEntry = myConn.objectStoreMap[objectStoreName];
                            store = objectStoreMapEntry.store;
                            store.deleted = false;
                            store.originalData = store.modifiedData || store.originalData;
                            store.originalName = store.modifiedName || store.originalName;
                            store.modifiedIndexes = {};
                            if (store.modifiedKeyGenerator !== undefined) {
                                store.originalKeyGenerator = store.modifiedKeyGenerator;
                            }
                            db.committedObjectStores[objectStoreName] = store;
                            for (indexName in objectStoreMapEntry.indexMap) {
                                index = objectStoreMapEntry.indexMap[indexName];
                                index.deleted = false;
                                index.originalData = index.modifiedData || index.originalData;
                                index.originalName = index.modifiedName || index.originalName;
                                store.committedIndexes[indexName] = index;
                            }
                        }
                        myConn.objectStoreMap = this.makeObjectStoreMap(db);
                        delete this.connectionsByTransaction[btx.transactionCookie];
                        this.transactionDoneCond.trigger();
                        if (!(this.afterCommitCallback && txLevel >= TransactionLevel.Write)) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.afterCommitCallback()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2: return [2 /*return*/];
                }
            });
        });
    };
    return MemoryBackend;
}());
exports.MemoryBackend = MemoryBackend;
exports.default = MemoryBackend;

});

unwrapExports(MemoryBackend_1);
var MemoryBackend_2 = MemoryBackend_1.MemoryBackend;

var build = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });

exports.BridgeIDBFactory = BridgeIDBFactory_1.BridgeIDBFactory;

exports.BridgeIDBCursor = BridgeIDBCursor_1.BridgeIDBCursor;









exports.MemoryBackend = MemoryBackend_1.MemoryBackend;
// globalThis polyfill, see https://mathiasbynens.be/notes/globalthis
(function () {
    if (typeof globalThis === "object")
        return;
    Object.defineProperty(Object.prototype, "__magic__", {
        get: function () {
            return this;
        },
        configurable: true,
    });
    // @ts-ignore: polyfill magic
    __magic__.globalThis = __magic__; // lolwat
    // @ts-ignore: polyfill magic
    delete Object.prototype.__magic__;
})();
/**
 * Populate the global name space such that the given IndexedDB factory is made
 * available globally.
 */
function shimIndexedDB(factory) {
    // @ts-ignore: shimming
    globalThis.indexedDB = factory;
    // @ts-ignore: shimming
    globalThis.IDBCursor = BridgeIDBCursor_1.BridgeIDBCursor;
    // @ts-ignore: shimming
    globalThis.IDBKeyRange = BridgeIDBKeyRange_1.default;
    // @ts-ignore: shimming
    globalThis.IDBDatabase = BridgeIDBDatabase_1.default;
    // @ts-ignore: shimming
    globalThis.IDBFactory = BridgeIDBFactory_1.BridgeIDBFactory;
    // @ts-ignore: shimming
    globalThis.IDBIndex = BridgeIDBIndex_1.BridgeIDBIndex;
    // @ts-ignore: shimming
    globalThis.IDBKeyRange = BridgeIDBKeyRange_1.default;
    // @ts-ignore: shimming
    globalThis.IDBObjectStore = BridgeIDBObjectStore_1.default;
    // @ts-ignore: shimming
    globalThis.IDBOpenDBRequest = BridgeIDBOpenDBRequest_1.default;
    // @ts-ignore: shimming
    globalThis.IDBRequest = BridgeIDBRequest_1.default;
    // @ts-ignore: shimming
    globalThis.IDBTransaction = BridgeIDBTransaction_1.default;
    // @ts-ignore: shimming
    globalThis.IDBVersionChangeEvent = BridgeIDBVersionChangeEvent_1.default;
}
exports.shimIndexedDB = shimIndexedDB;

});

unwrapExports(build);
var build_1 = build.BridgeIDBFactory;
var build_2 = build.BridgeIDBCursor;
var build_3 = build.MemoryBackend;
var build_4 = build.shimIndexedDB;

var cryptoImplementation = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Synchronous implementation of crypto-related functions for the wallet.
 *
 * The functionality is parameterized over an Emscripten environment.
 */
/**
 * Imports.
 */


const Amounts = __importStar(amounts);
const timer$1 = __importStar(timer);


var SignaturePurpose;
(function (SignaturePurpose) {
    SignaturePurpose[SignaturePurpose["RESERVE_WITHDRAW"] = 1200] = "RESERVE_WITHDRAW";
    SignaturePurpose[SignaturePurpose["WALLET_COIN_DEPOSIT"] = 1201] = "WALLET_COIN_DEPOSIT";
    SignaturePurpose[SignaturePurpose["MASTER_DENOMINATION_KEY_VALIDITY"] = 1025] = "MASTER_DENOMINATION_KEY_VALIDITY";
    SignaturePurpose[SignaturePurpose["WALLET_COIN_MELT"] = 1202] = "WALLET_COIN_MELT";
    SignaturePurpose[SignaturePurpose["TEST"] = 4242] = "TEST";
    SignaturePurpose[SignaturePurpose["MERCHANT_PAYMENT_OK"] = 1104] = "MERCHANT_PAYMENT_OK";
    SignaturePurpose[SignaturePurpose["MASTER_WIRE_FEES"] = 1028] = "MASTER_WIRE_FEES";
    SignaturePurpose[SignaturePurpose["WALLET_COIN_PAYBACK"] = 1203] = "WALLET_COIN_PAYBACK";
    SignaturePurpose[SignaturePurpose["WALLET_COIN_LINK"] = 1204] = "WALLET_COIN_LINK";
})(SignaturePurpose || (SignaturePurpose = {}));
function amountToBuffer(amount) {
    const buffer = new ArrayBuffer(8 + 4 + 12);
    const dvbuf = new DataView(buffer);
    const u8buf = new Uint8Array(buffer);
    const te = new TextEncoder();
    const curr = te.encode(amount.currency);
    dvbuf.setBigUint64(0, BigInt(amount.value));
    dvbuf.setUint32(8, amount.fraction);
    u8buf.set(curr, 8 + 4);
    return u8buf;
}
function timestampToBuffer(ts) {
    const b = new ArrayBuffer(8);
    const v = new DataView(b);
    const s = BigInt(ts.t_ms) * BigInt(1000);
    v.setBigUint64(0, s);
    return new Uint8Array(b);
}
function talerTimestampStringToBuffer(ts) {
    const t_sec = helpers.getTalerStampSec(ts);
    if (t_sec === null || t_sec === undefined) {
        // Should have been validated before!
        throw Error("invalid timestamp");
    }
    const buffer = new ArrayBuffer(8);
    const dvbuf = new DataView(buffer);
    const s = BigInt(t_sec) * BigInt(1000 * 1000);
    dvbuf.setBigUint64(0, s);
    return new Uint8Array(buffer);
}
class SignaturePurposeBuilder {
    constructor(purposeNum) {
        this.purposeNum = purposeNum;
        this.chunks = [];
    }
    put(bytes) {
        this.chunks.push(Uint8Array.from(bytes));
        return this;
    }
    build() {
        let payloadLen = 0;
        for (let c of this.chunks) {
            payloadLen += c.byteLength;
        }
        const buf = new ArrayBuffer(4 + 4 + payloadLen);
        const u8buf = new Uint8Array(buf);
        let p = 8;
        for (let c of this.chunks) {
            u8buf.set(c, p);
            p += c.byteLength;
        }
        const dvbuf = new DataView(buf);
        dvbuf.setUint32(0, payloadLen + 4 + 4);
        dvbuf.setUint32(4, this.purposeNum);
        return u8buf;
    }
}
function buildSigPS(purposeNum) {
    return new SignaturePurposeBuilder(purposeNum);
}
class CryptoImplementation {
    constructor() {
    }
    /**
     * Create a pre-coin of the given denomination to be withdrawn from then given
     * reserve.
     */
    createPlanchet(req) {
        const reservePub = talerCrypto.decodeCrock(req.reservePub);
        const reservePriv = talerCrypto.decodeCrock(req.reservePriv);
        const denomPub = talerCrypto.decodeCrock(req.denomPub);
        const coinKeyPair = talerCrypto.createEddsaKeyPair();
        const blindingFactor = talerCrypto.createBlindingKeySecret();
        const coinPubHash = talerCrypto.hash(coinKeyPair.eddsaPub);
        const ev = talerCrypto.rsaBlind(coinPubHash, blindingFactor, denomPub);
        const amountWithFee = Amounts.add(req.value, req.feeWithdraw).amount;
        const denomPubHash = talerCrypto.hash(denomPub);
        const evHash = talerCrypto.hash(ev);
        const withdrawRequest = buildSigPS(SignaturePurpose.RESERVE_WITHDRAW)
            .put(reservePub)
            .put(amountToBuffer(amountWithFee))
            .put(amountToBuffer(req.feeWithdraw))
            .put(denomPubHash)
            .put(evHash)
            .build();
        const sig = talerCrypto.eddsaSign(withdrawRequest, reservePriv);
        const planchet = {
            blindingKey: talerCrypto.encodeCrock(blindingFactor),
            coinEv: talerCrypto.encodeCrock(ev),
            coinPriv: talerCrypto.encodeCrock(coinKeyPair.eddsaPriv),
            coinPub: talerCrypto.encodeCrock(coinKeyPair.eddsaPub),
            coinValue: req.value,
            denomPub: talerCrypto.encodeCrock(denomPub),
            denomPubHash: talerCrypto.encodeCrock(denomPubHash),
            reservePub: talerCrypto.encodeCrock(reservePub),
            withdrawSig: talerCrypto.encodeCrock(sig),
        };
        return planchet;
    }
    /**
     * Create a planchet used for tipping, including the private keys.
     */
    createTipPlanchet(denom) {
        const denomPub = talerCrypto.decodeCrock(denom.denomPub);
        const coinKeyPair = talerCrypto.createEddsaKeyPair();
        const blindingFactor = talerCrypto.createBlindingKeySecret();
        const coinPubHash = talerCrypto.hash(coinKeyPair.eddsaPub);
        const ev = talerCrypto.rsaBlind(coinPubHash, blindingFactor, denomPub);
        const tipPlanchet = {
            blindingKey: talerCrypto.encodeCrock(blindingFactor),
            coinEv: talerCrypto.encodeCrock(ev),
            coinPriv: talerCrypto.encodeCrock(coinKeyPair.eddsaPriv),
            coinPub: talerCrypto.encodeCrock(coinKeyPair.eddsaPub),
            coinValue: denom.value,
            denomPub: talerCrypto.encodeCrock(denomPub),
            denomPubHash: talerCrypto.encodeCrock(talerCrypto.hash(denomPub)),
        };
        return tipPlanchet;
    }
    /**
     * Create and sign a message to request payback for a coin.
     */
    createPaybackRequest(coin) {
        const p = buildSigPS(SignaturePurpose.WALLET_COIN_PAYBACK)
            .put(talerCrypto.decodeCrock(coin.coinPub))
            .put(talerCrypto.decodeCrock(coin.denomPubHash))
            .put(talerCrypto.decodeCrock(coin.blindingKey))
            .build();
        const coinPriv = talerCrypto.decodeCrock(coin.coinPriv);
        const coinSig = talerCrypto.eddsaSign(p, coinPriv);
        const paybackRequest = {
            coin_blind_key_secret: coin.blindingKey,
            coin_pub: coin.coinPub,
            coin_sig: talerCrypto.encodeCrock(coinSig),
            denom_pub: coin.denomPub,
            denom_sig: coin.denomSig,
        };
        return paybackRequest;
    }
    /**
     * Check if a payment signature is valid.
     */
    isValidPaymentSignature(sig, contractHash, merchantPub) {
        const p = buildSigPS(SignaturePurpose.MERCHANT_PAYMENT_OK)
            .put(talerCrypto.decodeCrock(contractHash))
            .build();
        const sigBytes = talerCrypto.decodeCrock(sig);
        const pubBytes = talerCrypto.decodeCrock(merchantPub);
        return talerCrypto.eddsaVerify(p, sigBytes, pubBytes);
    }
    /**
     * Check if a wire fee is correctly signed.
     */
    isValidWireFee(type, wf, masterPub) {
        const p = buildSigPS(SignaturePurpose.MASTER_WIRE_FEES)
            .put(talerCrypto.hash(talerCrypto.stringToBytes(type + "\0")))
            .put(timestampToBuffer(wf.startStamp))
            .put(timestampToBuffer(wf.endStamp))
            .put(amountToBuffer(wf.wireFee))
            .build();
        const sig = talerCrypto.decodeCrock(wf.sig);
        const pub = talerCrypto.decodeCrock(masterPub);
        return talerCrypto.eddsaVerify(p, sig, pub);
    }
    /**
     * Check if the signature of a denomination is valid.
     */
    isValidDenom(denom, masterPub) {
        const p = buildSigPS(SignaturePurpose.MASTER_DENOMINATION_KEY_VALIDITY)
            .put(talerCrypto.decodeCrock(masterPub))
            .put(timestampToBuffer(denom.stampStart))
            .put(timestampToBuffer(denom.stampExpireWithdraw))
            .put(timestampToBuffer(denom.stampExpireDeposit))
            .put(timestampToBuffer(denom.stampExpireLegal))
            .put(amountToBuffer(denom.value))
            .put(amountToBuffer(denom.feeWithdraw))
            .put(amountToBuffer(denom.feeDeposit))
            .put(amountToBuffer(denom.feeRefresh))
            .put(amountToBuffer(denom.feeRefund))
            .put(talerCrypto.decodeCrock(denom.denomPubHash))
            .build();
        const sig = talerCrypto.decodeCrock(denom.masterSig);
        const pub = talerCrypto.decodeCrock(masterPub);
        return talerCrypto.eddsaVerify(p, sig, pub);
    }
    /**
     * Create a new EdDSA key pair.
     */
    createEddsaKeypair() {
        const pair = talerCrypto.createEddsaKeyPair();
        return {
            priv: talerCrypto.encodeCrock(pair.eddsaPriv),
            pub: talerCrypto.encodeCrock(pair.eddsaPub),
        };
    }
    /**
     * Unblind a blindly signed value.
     */
    rsaUnblind(sig, bk, pk) {
        const denomSig = talerCrypto.rsaUnblind(talerCrypto.decodeCrock(sig), talerCrypto.decodeCrock(pk), talerCrypto.decodeCrock(bk));
        return talerCrypto.encodeCrock(denomSig);
    }
    /**
     * Generate updated coins (to store in the database)
     * and deposit permissions for each given coin.
     */
    signDeposit(contractTerms, cds, totalAmount) {
        const ret = {
            originalCoins: [],
            sigs: [],
            updatedCoins: [],
        };
        const contractTermsHash = this.hashString(helpers.canonicalJson(contractTerms));
        const feeList = cds.map(x => x.denom.feeDeposit);
        let fees = Amounts.add(Amounts.getZero(feeList[0].currency), ...feeList)
            .amount;
        // okay if saturates
        fees = Amounts.sub(fees, Amounts.parseOrThrow(contractTerms.max_fee))
            .amount;
        const total = Amounts.add(fees, totalAmount).amount;
        let amountSpent = Amounts.getZero(cds[0].coin.currentAmount.currency);
        let amountRemaining = total;
        for (const cd of cds) {
            const originalCoin = Object.assign({}, cd.coin);
            if (amountRemaining.value === 0 && amountRemaining.fraction === 0) {
                break;
            }
            let coinSpend;
            if (Amounts.cmp(amountRemaining, cd.coin.currentAmount) < 0) {
                coinSpend = amountRemaining;
            }
            else {
                coinSpend = cd.coin.currentAmount;
            }
            amountSpent = Amounts.add(amountSpent, coinSpend).amount;
            const feeDeposit = cd.denom.feeDeposit;
            // Give the merchant at least the deposit fee, otherwise it'll reject
            // the coin.
            if (Amounts.cmp(coinSpend, feeDeposit) < 0) {
                coinSpend = feeDeposit;
            }
            const newAmount = Amounts.sub(cd.coin.currentAmount, coinSpend).amount;
            cd.coin.currentAmount = newAmount;
            cd.coin.status = dbTypes.CoinStatus.Dirty;
            const d = buildSigPS(SignaturePurpose.WALLET_COIN_DEPOSIT)
                .put(talerCrypto.decodeCrock(contractTermsHash))
                .put(talerCrypto.decodeCrock(contractTerms.H_wire))
                .put(talerTimestampStringToBuffer(contractTerms.timestamp))
                .put(talerTimestampStringToBuffer(contractTerms.refund_deadline))
                .put(amountToBuffer(coinSpend))
                .put(amountToBuffer(cd.denom.feeDeposit))
                .put(talerCrypto.decodeCrock(contractTerms.merchant_pub))
                .put(talerCrypto.decodeCrock(cd.coin.coinPub))
                .build();
            const coinSig = talerCrypto.eddsaSign(d, talerCrypto.decodeCrock(cd.coin.coinPriv));
            const s = {
                coin_pub: cd.coin.coinPub,
                coin_sig: talerCrypto.encodeCrock(coinSig),
                contribution: Amounts.toString(coinSpend),
                denom_pub: cd.coin.denomPub,
                exchange_url: cd.denom.exchangeBaseUrl,
                ub_sig: cd.coin.denomSig,
            };
            ret.sigs.push(s);
            ret.updatedCoins.push(cd.coin);
            ret.originalCoins.push(originalCoin);
        }
        return ret;
    }
    /**
     * Create a new refresh session.
     */
    createRefreshSession(exchangeBaseUrl, kappa, meltCoin, newCoinDenoms, meltFee) {
        let valueWithFee = Amounts.getZero(newCoinDenoms[0].value.currency);
        for (const ncd of newCoinDenoms) {
            valueWithFee = Amounts.add(valueWithFee, ncd.value, ncd.feeWithdraw)
                .amount;
        }
        // melt fee
        valueWithFee = Amounts.add(valueWithFee, meltFee).amount;
        const sessionHc = talerCrypto.createHashContext();
        const transferPubs = [];
        const transferPrivs = [];
        const planchetsForGammas = [];
        for (let i = 0; i < kappa; i++) {
            const transferKeyPair = talerCrypto.createEcdheKeyPair();
            sessionHc.update(transferKeyPair.ecdhePub);
            transferPrivs.push(talerCrypto.encodeCrock(transferKeyPair.ecdhePriv));
            transferPubs.push(talerCrypto.encodeCrock(transferKeyPair.ecdhePub));
        }
        for (const denom of newCoinDenoms) {
            const r = talerCrypto.decodeCrock(denom.denomPub);
            sessionHc.update(r);
        }
        sessionHc.update(talerCrypto.decodeCrock(meltCoin.coinPub));
        sessionHc.update(amountToBuffer(valueWithFee));
        for (let i = 0; i < kappa; i++) {
            const planchets = [];
            for (let j = 0; j < newCoinDenoms.length; j++) {
                const transferPriv = talerCrypto.decodeCrock(transferPrivs[i]);
                const oldCoinPub = talerCrypto.decodeCrock(meltCoin.coinPub);
                const transferSecret = talerCrypto.keyExchangeEcdheEddsa(transferPriv, oldCoinPub);
                const fresh = talerCrypto.setupRefreshPlanchet(transferSecret, j);
                const coinPriv = fresh.coinPriv;
                const coinPub = fresh.coinPub;
                const blindingFactor = fresh.bks;
                const pubHash = talerCrypto.hash(coinPub);
                const denomPub = talerCrypto.decodeCrock(newCoinDenoms[j].denomPub);
                const ev = talerCrypto.rsaBlind(pubHash, blindingFactor, denomPub);
                const planchet = {
                    blindingKey: talerCrypto.encodeCrock(blindingFactor),
                    coinEv: talerCrypto.encodeCrock(ev),
                    privateKey: talerCrypto.encodeCrock(coinPriv),
                    publicKey: talerCrypto.encodeCrock(coinPub),
                };
                planchets.push(planchet);
                sessionHc.update(ev);
            }
            planchetsForGammas.push(planchets);
        }
        const sessionHash = sessionHc.finish();
        const confirmData = buildSigPS(SignaturePurpose.WALLET_COIN_MELT)
            .put(sessionHash)
            .put(amountToBuffer(valueWithFee))
            .put(amountToBuffer(meltFee))
            .put(talerCrypto.decodeCrock(meltCoin.coinPub))
            .build();
        const confirmSig = talerCrypto.eddsaSign(confirmData, talerCrypto.decodeCrock(meltCoin.coinPriv));
        let valueOutput = Amounts.getZero(newCoinDenoms[0].value.currency);
        for (const denom of newCoinDenoms) {
            valueOutput = Amounts.add(valueOutput, denom.value).amount;
        }
        const refreshSessionId = talerCrypto.encodeCrock(talerCrypto.getRandomBytes(32));
        const refreshSession = {
            refreshSessionId,
            confirmSig: talerCrypto.encodeCrock(confirmSig),
            exchangeBaseUrl,
            finished: false,
            hash: talerCrypto.encodeCrock(sessionHash),
            meltCoinPub: meltCoin.coinPub,
            newDenomHashes: newCoinDenoms.map(d => d.denomPubHash),
            newDenoms: newCoinDenoms.map(d => d.denomPub),
            norevealIndex: undefined,
            planchetsForGammas: planchetsForGammas,
            transferPrivs,
            transferPubs,
            valueOutput,
            valueWithFee,
        };
        return refreshSession;
    }
    /**
     * Hash a string including the zero terminator.
     */
    hashString(str) {
        const ts = new TextEncoder();
        const b = ts.encode(str + "\0");
        return talerCrypto.encodeCrock(talerCrypto.hash(b));
    }
    /**
     * Hash a denomination public key.
     */
    hashDenomPub(denomPub) {
        return talerCrypto.encodeCrock(talerCrypto.hash(talerCrypto.decodeCrock(denomPub)));
    }
    signCoinLink(oldCoinPriv, newDenomHash, oldCoinPub, transferPub, coinEv) {
        const coinEvHash = talerCrypto.hash(talerCrypto.decodeCrock(coinEv));
        const coinLink = buildSigPS(SignaturePurpose.WALLET_COIN_LINK)
            .put(talerCrypto.decodeCrock(newDenomHash))
            .put(talerCrypto.decodeCrock(oldCoinPub))
            .put(talerCrypto.decodeCrock(transferPub))
            .put(coinEvHash)
            .build();
        const coinPriv = talerCrypto.decodeCrock(oldCoinPriv);
        const sig = talerCrypto.eddsaSign(coinLink, coinPriv);
        return talerCrypto.encodeCrock(sig);
    }
    benchmark(repetitions) {
        let time_hash = 0;
        for (let i = 0; i < repetitions; i++) {
            const start = timer$1.performanceNow();
            this.hashString("hello world");
            time_hash += timer$1.performanceNow() - start;
        }
        let time_hash_big = 0;
        for (let i = 0; i < repetitions; i++) {
            const ba = naclFast.randomBytes(4096);
            const start = timer$1.performanceNow();
            talerCrypto.hash(ba);
            time_hash_big += timer$1.performanceNow() - start;
        }
        let time_eddsa_create = 0;
        for (let i = 0; i < repetitions; i++) {
            const start = timer$1.performanceNow();
            const pair = talerCrypto.createEddsaKeyPair();
            time_eddsa_create += timer$1.performanceNow() - start;
        }
        let time_eddsa_sign = 0;
        const p = naclFast.randomBytes(4096);
        const pair = talerCrypto.createEddsaKeyPair();
        for (let i = 0; i < repetitions; i++) {
            const start = timer$1.performanceNow();
            talerCrypto.eddsaSign(p, pair.eddsaPriv);
            time_eddsa_sign += timer$1.performanceNow() - start;
        }
        const sig = talerCrypto.eddsaSign(p, pair.eddsaPriv);
        let time_eddsa_verify = 0;
        for (let i = 0; i < repetitions; i++) {
            const start = timer$1.performanceNow();
            talerCrypto.eddsaVerify(p, sig, pair.eddsaPub);
            time_eddsa_verify += timer$1.performanceNow() - start;
        }
        return {
            repetitions,
            time: {
                hash_small: time_hash,
                hash_big: time_hash_big,
                eddsa_create: time_eddsa_create,
                eddsa_sign: time_eddsa_sign,
                eddsa_verify: time_eddsa_verify,
            },
        };
    }
}
exports.CryptoImplementation = CryptoImplementation;
CryptoImplementation.enableTracing = false;

});

unwrapExports(cryptoImplementation);
var cryptoImplementation_1 = cryptoImplementation.CryptoImplementation;

var synchronousWorker = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * The synchronous crypto worker produced by this factory doesn't run in the
 * background, but actually blocks the caller until the operation is done.
 */
class SynchronousCryptoWorkerFactory {
    startWorker() {
        if (typeof require === "undefined") {
            throw Error("cannot make worker, require(...) not defined");
        }
        const workerCtor = synchronousWorker.SynchronousCryptoWorker;
        return new workerCtor();
    }
    getConcurrency() {
        return 1;
    }
}
exports.SynchronousCryptoWorkerFactory = SynchronousCryptoWorkerFactory;
/**
 * Worker implementation that uses node subprocesses.
 */
class SynchronousCryptoWorker {
    constructor() {
        this.onerror = undefined;
        this.onmessage = undefined;
    }
    /**
     * Add an event listener for either an "error" or "message" event.
     */
    addEventListener(event, fn) {
        switch (event) {
            case "message":
                this.onmessage = fn;
                break;
            case "error":
                this.onerror = fn;
                break;
        }
    }
    dispatchMessage(msg) {
        if (this.onmessage) {
            this.onmessage({ data: msg });
        }
    }
    handleRequest(operation, id, args) {
        return __awaiter(this, void 0, void 0, function* () {
            const impl = new cryptoImplementation.CryptoImplementation();
            if (!(operation in impl)) {
                console.error(`crypto operation '${operation}' not found`);
                return;
            }
            let result;
            try {
                result = impl[operation](...args);
            }
            catch (e) {
                console.log("error during operation", e);
                return;
            }
            try {
                setImmediate(() => this.dispatchMessage({ result, id }));
            }
            catch (e) {
                console.log("got error during dispatch", e);
            }
        });
    }
    /**
     * Send a message to the worker thread.
     */
    postMessage(msg) {
        const args = msg.args;
        if (!Array.isArray(args)) {
            console.error("args must be array");
            return;
        }
        const id = msg.id;
        if (typeof id !== "number") {
            console.error("RPC id must be number");
            return;
        }
        const operation = msg.operation;
        if (typeof operation !== "string") {
            console.error("RPC operation must be string");
            return;
        }
        this.handleRequest(operation, id, args).catch(e => {
            console.error("Error while handling crypto request:", e);
        });
    }
    /**
     * Forcibly terminate the worker thread.
     */
    terminate() {
        // This is a no-op.
    }
}
exports.SynchronousCryptoWorker = SynchronousCryptoWorker;

});

unwrapExports(synchronousWorker);
var synchronousWorker_1 = synchronousWorker.SynchronousCryptoWorkerFactory;
var synchronousWorker_2 = synchronousWorker.SynchronousCryptoWorker;

var db = createCommonjsModule(function (module, exports) {
Object.defineProperty(exports, "__esModule", { value: true });


const DB_NAME = "taler";
/**
 * Return a promise that resolves
 * to the taler wallet db.
 */
function openTalerDb(idbFactory, onVersionChange, onUpgradeUnsupported) {
    return new Promise((resolve, reject) => {
        const req = idbFactory.open(DB_NAME, dbTypes.WALLET_DB_VERSION);
        req.onerror = e => {
            console.log("taler database error", e);
            reject(new Error("database error"));
        };
        req.onsuccess = e => {
            req.result.onversionchange = (evt) => {
                console.log(`handling live db version change from ${evt.oldVersion} to ${evt.newVersion}`);
                req.result.close();
                onVersionChange();
            };
            resolve(req.result);
        };
        req.onupgradeneeded = e => {
            const db = req.result;
            console.log(`DB: upgrade needed: oldVersion=${e.oldVersion}, newVersion=${e.newVersion}`);
            switch (e.oldVersion) {
                case 0: // DB does not exist yet
                    for (const n in dbTypes.Stores) {
                        if (dbTypes.Stores[n] instanceof query.Store) {
                            const si = dbTypes.Stores[n];
                            const s = db.createObjectStore(si.name, si.storeParams);
                            for (const indexName in si) {
                                if (si[indexName] instanceof query.Index) {
                                    const ii = si[indexName];
                                    s.createIndex(ii.indexName, ii.keyPath, ii.options);
                                }
                            }
                        }
                    }
                    break;
                default:
                    if (e.oldVersion !== dbTypes.WALLET_DB_VERSION) {
                        onUpgradeUnsupported(e.oldVersion, dbTypes.WALLET_DB_VERSION);
                        throw Error("incompatible DB");
                    }
                    break;
            }
        };
    });
}
exports.openTalerDb = openTalerDb;
function exportDb(db) {
    const dump = {
        name: db.name,
        stores: {},
        version: db.version,
    };
    return new Promise((resolve, reject) => {
        const tx = db.transaction(Array.from(db.objectStoreNames));
        tx.addEventListener("complete", () => {
            resolve(dump);
        });
        // tslint:disable-next-line:prefer-for-of
        for (let i = 0; i < db.objectStoreNames.length; i++) {
            const name = db.objectStoreNames[i];
            const storeDump = {};
            dump.stores[name] = storeDump;
            tx.objectStore(name)
                .openCursor()
                .addEventListener("success", (e) => {
                const cursor = e.target.result;
                if (cursor) {
                    storeDump[cursor.key] = cursor.value;
                    cursor.continue();
                }
            });
        }
    });
}
exports.exportDb = exportDb;
function importDb(db, dump) {
    console.log("importing db", dump);
    return new Promise((resolve, reject) => {
        const tx = db.transaction(Array.from(db.objectStoreNames), "readwrite");
        if (dump.stores) {
            for (const storeName in dump.stores) {
                const objects = [];
                const dumpStore = dump.stores[storeName];
                for (const key in dumpStore) {
                    objects.push(dumpStore[key]);
                }
                console.log(`importing ${objects.length} records into ${storeName}`);
                const store = tx.objectStore(storeName);
                for (const obj of objects) {
                    store.put(obj);
                }
            }
        }
        tx.addEventListener("complete", () => {
            resolve();
        });
    });
}
exports.importDb = importDb;
function deleteDb(idbFactory) {
    idbFactory.deleteDatabase(DB_NAME);
}
exports.deleteDb = deleteDb;

});

unwrapExports(db);
var db_1 = db.openTalerDb;
var db_2 = db.exportDb;
var db_3 = db.importDb;
var db_4 = db.deleteDb;

var bind = function bind(fn, thisArg) {
  return function wrap() {
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }
    return fn.apply(thisArg, args);
  };
};

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

var isBuffer = function isBuffer (obj) {
  return obj != null && obj.constructor != null &&
    typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
};

/*global toString:true*/

// utils is a library of generic helper functions non-specific to axios

var toString = Object.prototype.toString;

/**
 * Determine if a value is an Array
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Array, otherwise false
 */
function isArray(val) {
  return toString.call(val) === '[object Array]';
}

/**
 * Determine if a value is an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an ArrayBuffer, otherwise false
 */
function isArrayBuffer(val) {
  return toString.call(val) === '[object ArrayBuffer]';
}

/**
 * Determine if a value is a FormData
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an FormData, otherwise false
 */
function isFormData(val) {
  return (typeof FormData !== 'undefined') && (val instanceof FormData);
}

/**
 * Determine if a value is a view on an ArrayBuffer
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a view on an ArrayBuffer, otherwise false
 */
function isArrayBufferView(val) {
  var result;
  if ((typeof ArrayBuffer !== 'undefined') && (ArrayBuffer.isView)) {
    result = ArrayBuffer.isView(val);
  } else {
    result = (val) && (val.buffer) && (val.buffer instanceof ArrayBuffer);
  }
  return result;
}

/**
 * Determine if a value is a String
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a String, otherwise false
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a value is a Number
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Number, otherwise false
 */
function isNumber(val) {
  return typeof val === 'number';
}

/**
 * Determine if a value is undefined
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if the value is undefined, otherwise false
 */
function isUndefined(val) {
  return typeof val === 'undefined';
}

/**
 * Determine if a value is an Object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is an Object, otherwise false
 */
function isObject(val) {
  return val !== null && typeof val === 'object';
}

/**
 * Determine if a value is a Date
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Date, otherwise false
 */
function isDate(val) {
  return toString.call(val) === '[object Date]';
}

/**
 * Determine if a value is a File
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a File, otherwise false
 */
function isFile(val) {
  return toString.call(val) === '[object File]';
}

/**
 * Determine if a value is a Blob
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Blob, otherwise false
 */
function isBlob(val) {
  return toString.call(val) === '[object Blob]';
}

/**
 * Determine if a value is a Function
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Function, otherwise false
 */
function isFunction(val) {
  return toString.call(val) === '[object Function]';
}

/**
 * Determine if a value is a Stream
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a Stream, otherwise false
 */
function isStream(val) {
  return isObject(val) && isFunction(val.pipe);
}

/**
 * Determine if a value is a URLSearchParams object
 *
 * @param {Object} val The value to test
 * @returns {boolean} True if value is a URLSearchParams object, otherwise false
 */
function isURLSearchParams(val) {
  return typeof URLSearchParams !== 'undefined' && val instanceof URLSearchParams;
}

/**
 * Trim excess whitespace off the beginning and end of a string
 *
 * @param {String} str The String to trim
 * @returns {String} The String freed of excess whitespace
 */
function trim(str) {
  return str.replace(/^\s*/, '').replace(/\s*$/, '');
}

/**
 * Determine if we're running in a standard browser environment
 *
 * This allows axios to run in a web worker, and react-native.
 * Both environments support XMLHttpRequest, but not fully standard globals.
 *
 * web workers:
 *  typeof window -> undefined
 *  typeof document -> undefined
 *
 * react-native:
 *  navigator.product -> 'ReactNative'
 * nativescript
 *  navigator.product -> 'NativeScript' or 'NS'
 */
function isStandardBrowserEnv() {
  if (typeof navigator !== 'undefined' && (navigator.product === 'ReactNative' ||
                                           navigator.product === 'NativeScript' ||
                                           navigator.product === 'NS')) {
    return false;
  }
  return (
    typeof window !== 'undefined' &&
    typeof document !== 'undefined'
  );
}

/**
 * Iterate over an Array or an Object invoking a function for each item.
 *
 * If `obj` is an Array callback will be called passing
 * the value, index, and complete array for each item.
 *
 * If 'obj' is an Object callback will be called passing
 * the value, key, and complete object for each property.
 *
 * @param {Object|Array} obj The object to iterate
 * @param {Function} fn The callback to invoke for each item
 */
function forEach(obj, fn) {
  // Don't bother if no value provided
  if (obj === null || typeof obj === 'undefined') {
    return;
  }

  // Force an array if not already something iterable
  if (typeof obj !== 'object') {
    /*eslint no-param-reassign:0*/
    obj = [obj];
  }

  if (isArray(obj)) {
    // Iterate over array values
    for (var i = 0, l = obj.length; i < l; i++) {
      fn.call(null, obj[i], i, obj);
    }
  } else {
    // Iterate over object keys
    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        fn.call(null, obj[key], key, obj);
      }
    }
  }
}

/**
 * Accepts varargs expecting each argument to be an object, then
 * immutably merges the properties of each object and returns result.
 *
 * When multiple objects contain the same key the later object in
 * the arguments list will take precedence.
 *
 * Example:
 *
 * ```js
 * var result = merge({foo: 123}, {foo: 456});
 * console.log(result.foo); // outputs 456
 * ```
 *
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function merge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = merge(result[key], val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Function equal to merge with the difference being that no reference
 * to original objects is kept.
 *
 * @see merge
 * @param {Object} obj1 Object to merge
 * @returns {Object} Result of all merge properties
 */
function deepMerge(/* obj1, obj2, obj3, ... */) {
  var result = {};
  function assignValue(val, key) {
    if (typeof result[key] === 'object' && typeof val === 'object') {
      result[key] = deepMerge(result[key], val);
    } else if (typeof val === 'object') {
      result[key] = deepMerge({}, val);
    } else {
      result[key] = val;
    }
  }

  for (var i = 0, l = arguments.length; i < l; i++) {
    forEach(arguments[i], assignValue);
  }
  return result;
}

/**
 * Extends object a by mutably adding to it the properties of object b.
 *
 * @param {Object} a The object to be extended
 * @param {Object} b The object to copy properties from
 * @param {Object} thisArg The object to bind function to
 * @return {Object} The resulting value of object a
 */
function extend(a, b, thisArg) {
  forEach(b, function assignValue(val, key) {
    if (thisArg && typeof val === 'function') {
      a[key] = bind(val, thisArg);
    } else {
      a[key] = val;
    }
  });
  return a;
}

var utils = {
  isArray: isArray,
  isArrayBuffer: isArrayBuffer,
  isBuffer: isBuffer,
  isFormData: isFormData,
  isArrayBufferView: isArrayBufferView,
  isString: isString,
  isNumber: isNumber,
  isObject: isObject,
  isUndefined: isUndefined,
  isDate: isDate,
  isFile: isFile,
  isBlob: isBlob,
  isFunction: isFunction,
  isStream: isStream,
  isURLSearchParams: isURLSearchParams,
  isStandardBrowserEnv: isStandardBrowserEnv,
  forEach: forEach,
  merge: merge,
  deepMerge: deepMerge,
  extend: extend,
  trim: trim
};

function encode(val) {
  return encodeURIComponent(val).
    replace(/%40/gi, '@').
    replace(/%3A/gi, ':').
    replace(/%24/g, '$').
    replace(/%2C/gi, ',').
    replace(/%20/g, '+').
    replace(/%5B/gi, '[').
    replace(/%5D/gi, ']');
}

/**
 * Build a URL by appending params to the end
 *
 * @param {string} url The base of the url (e.g., http://www.google.com)
 * @param {object} [params] The params to be appended
 * @returns {string} The formatted url
 */
var buildURL = function buildURL(url, params, paramsSerializer) {
  /*eslint no-param-reassign:0*/
  if (!params) {
    return url;
  }

  var serializedParams;
  if (paramsSerializer) {
    serializedParams = paramsSerializer(params);
  } else if (utils.isURLSearchParams(params)) {
    serializedParams = params.toString();
  } else {
    var parts = [];

    utils.forEach(params, function serialize(val, key) {
      if (val === null || typeof val === 'undefined') {
        return;
      }

      if (utils.isArray(val)) {
        key = key + '[]';
      } else {
        val = [val];
      }

      utils.forEach(val, function parseValue(v) {
        if (utils.isDate(v)) {
          v = v.toISOString();
        } else if (utils.isObject(v)) {
          v = JSON.stringify(v);
        }
        parts.push(encode(key) + '=' + encode(v));
      });
    });

    serializedParams = parts.join('&');
  }

  if (serializedParams) {
    var hashmarkIndex = url.indexOf('#');
    if (hashmarkIndex !== -1) {
      url = url.slice(0, hashmarkIndex);
    }

    url += (url.indexOf('?') === -1 ? '?' : '&') + serializedParams;
  }

  return url;
};

function InterceptorManager() {
  this.handlers = [];
}

/**
 * Add a new interceptor to the stack
 *
 * @param {Function} fulfilled The function to handle `then` for a `Promise`
 * @param {Function} rejected The function to handle `reject` for a `Promise`
 *
 * @return {Number} An ID used to remove interceptor later
 */
InterceptorManager.prototype.use = function use(fulfilled, rejected) {
  this.handlers.push({
    fulfilled: fulfilled,
    rejected: rejected
  });
  return this.handlers.length - 1;
};

/**
 * Remove an interceptor from the stack
 *
 * @param {Number} id The ID that was returned by `use`
 */
InterceptorManager.prototype.eject = function eject(id) {
  if (this.handlers[id]) {
    this.handlers[id] = null;
  }
};

/**
 * Iterate over all the registered interceptors
 *
 * This method is particularly useful for skipping over any
 * interceptors that may have become `null` calling `eject`.
 *
 * @param {Function} fn The function to call for each interceptor
 */
InterceptorManager.prototype.forEach = function forEach(fn) {
  utils.forEach(this.handlers, function forEachHandler(h) {
    if (h !== null) {
      fn(h);
    }
  });
};

var InterceptorManager_1 = InterceptorManager;

/**
 * Transform the data for a request or a response
 *
 * @param {Object|String} data The data to be transformed
 * @param {Array} headers The headers for the request or response
 * @param {Array|Function} fns A single function or Array of functions
 * @returns {*} The resulting transformed data
 */
var transformData = function transformData(data, headers, fns) {
  /*eslint no-param-reassign:0*/
  utils.forEach(fns, function transform(fn) {
    data = fn(data, headers);
  });

  return data;
};

var isCancel = function isCancel(value) {
  return !!(value && value.__CANCEL__);
};

var normalizeHeaderName = function normalizeHeaderName(headers, normalizedName) {
  utils.forEach(headers, function processHeader(value, name) {
    if (name !== normalizedName && name.toUpperCase() === normalizedName.toUpperCase()) {
      headers[normalizedName] = value;
      delete headers[name];
    }
  });
};

/**
 * Update an Error with the specified config, error code, and response.
 *
 * @param {Error} error The error to update.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The error.
 */
var enhanceError = function enhanceError(error, config, code, request, response) {
  error.config = config;
  if (code) {
    error.code = code;
  }

  error.request = request;
  error.response = response;
  error.isAxiosError = true;

  error.toJSON = function() {
    return {
      // Standard
      message: this.message,
      name: this.name,
      // Microsoft
      description: this.description,
      number: this.number,
      // Mozilla
      fileName: this.fileName,
      lineNumber: this.lineNumber,
      columnNumber: this.columnNumber,
      stack: this.stack,
      // Axios
      config: this.config,
      code: this.code
    };
  };
  return error;
};

/**
 * Create an Error with the specified message, config, error code, request and response.
 *
 * @param {string} message The error message.
 * @param {Object} config The config.
 * @param {string} [code] The error code (for example, 'ECONNABORTED').
 * @param {Object} [request] The request.
 * @param {Object} [response] The response.
 * @returns {Error} The created error.
 */
var createError = function createError(message, config, code, request, response) {
  var error = new Error(message);
  return enhanceError(error, config, code, request, response);
};

/**
 * Resolve or reject a Promise based on response status.
 *
 * @param {Function} resolve A function that resolves the promise.
 * @param {Function} reject A function that rejects the promise.
 * @param {object} response The response.
 */
var settle = function settle(resolve, reject, response) {
  var validateStatus = response.config.validateStatus;
  if (!validateStatus || validateStatus(response.status)) {
    resolve(response);
  } else {
    reject(createError(
      'Request failed with status code ' + response.status,
      response.config,
      null,
      response.request,
      response
    ));
  }
};

/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} [options]
 * @throws {Error} throw an error if val is not a non-empty string or a number
 * @return {String|Number}
 * @api public
 */

var ms = function(val, options) {
  options = options || {};
  var type = typeof val;
  if (type === 'string' && val.length > 0) {
    return parse(val);
  } else if (type === 'number' && isNaN(val) === false) {
    return options.long ? fmtLong(val) : fmtShort(val);
  }
  throw new Error(
    'val is not a non-empty string or a valid number. val=' +
      JSON.stringify(val)
  );
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  str = String(str);
  if (str.length > 100) {
    return;
  }
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(
    str
  );
  if (!match) {
    return;
  }
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
    default:
      return undefined;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtShort(ms) {
  if (ms >= d) {
    return Math.round(ms / d) + 'd';
  }
  if (ms >= h) {
    return Math.round(ms / h) + 'h';
  }
  if (ms >= m) {
    return Math.round(ms / m) + 'm';
  }
  if (ms >= s) {
    return Math.round(ms / s) + 's';
  }
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function fmtLong(ms) {
  return plural(ms, d, 'day') ||
    plural(ms, h, 'hour') ||
    plural(ms, m, 'minute') ||
    plural(ms, s, 'second') ||
    ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) {
    return;
  }
  if (ms < n * 1.5) {
    return Math.floor(ms / n) + ' ' + name;
  }
  return Math.ceil(ms / n) + ' ' + name + 's';
}

var debug = createCommonjsModule(function (module, exports) {
/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = createDebug.debug = createDebug['default'] = createDebug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = ms;

/**
 * Active `debug` instances.
 */
exports.instances = [];

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
 */

exports.formatters = {};

/**
 * Select a color.
 * @param {String} namespace
 * @return {Number}
 * @api private
 */

function selectColor(namespace) {
  var hash = 0, i;

  for (i in namespace) {
    hash  = ((hash << 5) - hash) + namespace.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  return exports.colors[Math.abs(hash) % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function createDebug(namespace) {

  var prevTime;

  function debug() {
    // disabled?
    if (!debug.enabled) return;

    var self = debug;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // turn the `arguments` into a proper Array
    var args = new Array(arguments.length);
    for (var i = 0; i < args.length; i++) {
      args[i] = arguments[i];
    }

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %O
      args.unshift('%O');
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-zA-Z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    // apply env-specific formatting (colors, etc.)
    exports.formatArgs.call(self, args);

    var logFn = debug.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }

  debug.namespace = namespace;
  debug.enabled = exports.enabled(namespace);
  debug.useColors = exports.useColors();
  debug.color = selectColor(namespace);
  debug.destroy = destroy;

  // env-specific initialization logic for debug instances
  if ('function' === typeof exports.init) {
    exports.init(debug);
  }

  exports.instances.push(debug);

  return debug;
}

function destroy () {
  var index = exports.instances.indexOf(this);
  if (index !== -1) {
    exports.instances.splice(index, 1);
    return true;
  } else {
    return false;
  }
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  exports.names = [];
  exports.skips = [];

  var i;
  var split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/);
  var len = split.length;

  for (i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }

  for (i = 0; i < exports.instances.length; i++) {
    var instance = exports.instances[i];
    instance.enabled = exports.enabled(instance.namespace);
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  if (name[name.length - 1] === '*') {
    return true;
  }
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}
});
var debug_1 = debug.coerce;
var debug_2 = debug.disable;
var debug_3 = debug.enable;
var debug_4 = debug.enabled;
var debug_5 = debug.humanize;
var debug_6 = debug.instances;
var debug_7 = debug.names;
var debug_8 = debug.skips;
var debug_9 = debug.formatters;

var browser = createCommonjsModule(function (module, exports) {
/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;
exports.storage = 'undefined' != typeof chrome
               && 'undefined' != typeof chrome.storage
                  ? chrome.storage.local
                  : localstorage();

/**
 * Colors.
 */

exports.colors = [
  '#0000CC', '#0000FF', '#0033CC', '#0033FF', '#0066CC', '#0066FF', '#0099CC',
  '#0099FF', '#00CC00', '#00CC33', '#00CC66', '#00CC99', '#00CCCC', '#00CCFF',
  '#3300CC', '#3300FF', '#3333CC', '#3333FF', '#3366CC', '#3366FF', '#3399CC',
  '#3399FF', '#33CC00', '#33CC33', '#33CC66', '#33CC99', '#33CCCC', '#33CCFF',
  '#6600CC', '#6600FF', '#6633CC', '#6633FF', '#66CC00', '#66CC33', '#9900CC',
  '#9900FF', '#9933CC', '#9933FF', '#99CC00', '#99CC33', '#CC0000', '#CC0033',
  '#CC0066', '#CC0099', '#CC00CC', '#CC00FF', '#CC3300', '#CC3333', '#CC3366',
  '#CC3399', '#CC33CC', '#CC33FF', '#CC6600', '#CC6633', '#CC9900', '#CC9933',
  '#CCCC00', '#CCCC33', '#FF0000', '#FF0033', '#FF0066', '#FF0099', '#FF00CC',
  '#FF00FF', '#FF3300', '#FF3333', '#FF3366', '#FF3399', '#FF33CC', '#FF33FF',
  '#FF6600', '#FF6633', '#FF9900', '#FF9933', '#FFCC00', '#FFCC33'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // NB: In an Electron preload script, document will be defined but not fully
  // initialized. Since we know we're in Chrome, we'll just detect this case
  // explicitly
  if (typeof window !== 'undefined' && window.process && window.process.type === 'renderer') {
    return true;
  }

  // Internet Explorer and Edge do not support colors.
  if (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/(edge|trident)\/(\d+)/)) {
    return false;
  }

  // is webkit? http://stackoverflow.com/a/16459606/376773
  // document is undefined in react-native: https://github.com/facebook/react-native/pull/1632
  return (typeof document !== 'undefined' && document.documentElement && document.documentElement.style && document.documentElement.style.WebkitAppearance) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (typeof window !== 'undefined' && window.console && (window.console.firebug || (window.console.exception && window.console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31) ||
    // double check webkit in userAgent just in case we are in a worker
    (typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.toLowerCase().match(/applewebkit\/(\d+)/));
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  try {
    return JSON.stringify(v);
  } catch (err) {
    return '[UnexpectedJSONParseError]: ' + err.message;
  }
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return;

  var c = 'color: ' + this.color;
  args.splice(1, 0, c, 'color: inherit');

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-zA-Z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      exports.storage.removeItem('debug');
    } else {
      exports.storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = exports.storage.debug;
  } catch(e) {}

  // If debug isn't set in LS, and we're in Electron, try to load $DEBUG
  if (!r && typeof process !== 'undefined' && 'env' in process) {
    r = process.env.DEBUG;
  }

  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage() {
  try {
    return window.localStorage;
  } catch (e) {}
}
});
var browser_1 = browser.log;
var browser_2 = browser.formatArgs;
var browser_3 = browser.save;
var browser_4 = browser.load;
var browser_5 = browser.useColors;
var browser_6 = browser.storage;
var browser_7 = browser.colors;

var hasFlag = (flag, argv) => {
	argv = argv || process.argv;
	const prefix = flag.startsWith('-') ? '' : (flag.length === 1 ? '-' : '--');
	const pos = argv.indexOf(prefix + flag);
	const terminatorPos = argv.indexOf('--');
	return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
};

const {env} = process;

let forceColor;
if (hasFlag('no-color') ||
	hasFlag('no-colors') ||
	hasFlag('color=false') ||
	hasFlag('color=never')) {
	forceColor = 0;
} else if (hasFlag('color') ||
	hasFlag('colors') ||
	hasFlag('color=true') ||
	hasFlag('color=always')) {
	forceColor = 1;
}
if ('FORCE_COLOR' in env) {
	if (env.FORCE_COLOR === true || env.FORCE_COLOR === 'true') {
		forceColor = 1;
	} else if (env.FORCE_COLOR === false || env.FORCE_COLOR === 'false') {
		forceColor = 0;
	} else {
		forceColor = env.FORCE_COLOR.length === 0 ? 1 : Math.min(parseInt(env.FORCE_COLOR, 10), 3);
	}
}

function translateLevel(level) {
	if (level === 0) {
		return false;
	}

	return {
		level,
		hasBasic: true,
		has256: level >= 2,
		has16m: level >= 3
	};
}

function supportsColor(stream) {
	if (forceColor === 0) {
		return 0;
	}

	if (hasFlag('color=16m') ||
		hasFlag('color=full') ||
		hasFlag('color=truecolor')) {
		return 3;
	}

	if (hasFlag('color=256')) {
		return 2;
	}

	if (stream && !stream.isTTY && forceColor === undefined) {
		return 0;
	}

	const min = forceColor || 0;

	if (env.TERM === 'dumb') {
		return min;
	}

	if (process.platform === 'win32') {
		// Node.js 7.5.0 is the first version of Node.js to include a patch to
		// libuv that enables 256 color output on Windows. Anything earlier and it
		// won't work. However, here we target Node.js 8 at minimum as it is an LTS
		// release, and Node.js 7 is not. Windows 10 build 10586 is the first Windows
		// release that supports 256 colors. Windows 10 build 14931 is the first release
		// that supports 16m/TrueColor.
		const osRelease = os.release().split('.');
		if (
			Number(process.versions.node.split('.')[0]) >= 8 &&
			Number(osRelease[0]) >= 10 &&
			Number(osRelease[2]) >= 10586
		) {
			return Number(osRelease[2]) >= 14931 ? 3 : 2;
		}

		return 1;
	}

	if ('CI' in env) {
		if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(sign => sign in env) || env.CI_NAME === 'codeship') {
			return 1;
		}

		return min;
	}

	if ('TEAMCITY_VERSION' in env) {
		return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
	}

	if (env.COLORTERM === 'truecolor') {
		return 3;
	}

	if ('TERM_PROGRAM' in env) {
		const version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

		switch (env.TERM_PROGRAM) {
			case 'iTerm.app':
				return version >= 3 ? 3 : 2;
			case 'Apple_Terminal':
				return 2;
			// No default
		}
	}

	if (/-256(color)?$/i.test(env.TERM)) {
		return 2;
	}

	if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
		return 1;
	}

	if ('COLORTERM' in env) {
		return 1;
	}

	return min;
}

function getSupportLevel(stream) {
	const level = supportsColor(stream);
	return translateLevel(level);
}

var supportsColor_1 = {
	supportsColor: getSupportLevel,
	stdout: getSupportLevel(process.stdout),
	stderr: getSupportLevel(process.stderr)
};

var node = createCommonjsModule(function (module, exports) {
/**
 * Module dependencies.
 */




/**
 * This is the Node.js implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.init = init;
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Colors.
 */

exports.colors = [ 6, 2, 3, 4, 5, 1 ];

try {
  var supportsColor = supportsColor_1;
  if (supportsColor && supportsColor.level >= 2) {
    exports.colors = [
      20, 21, 26, 27, 32, 33, 38, 39, 40, 41, 42, 43, 44, 45, 56, 57, 62, 63, 68,
      69, 74, 75, 76, 77, 78, 79, 80, 81, 92, 93, 98, 99, 112, 113, 128, 129, 134,
      135, 148, 149, 160, 161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171,
      172, 173, 178, 179, 184, 185, 196, 197, 198, 199, 200, 201, 202, 203, 204,
      205, 206, 207, 208, 209, 214, 215, 220, 221
    ];
  }
} catch (err) {
  // swallow - we only care if `supports-color` is available; it doesn't have to be.
}

/**
 * Build up the default `inspectOpts` object from the environment variables.
 *
 *   $ DEBUG_COLORS=no DEBUG_DEPTH=10 DEBUG_SHOW_HIDDEN=enabled node script.js
 */

exports.inspectOpts = Object.keys(process.env).filter(function (key) {
  return /^debug_/i.test(key);
}).reduce(function (obj, key) {
  // camel-case
  var prop = key
    .substring(6)
    .toLowerCase()
    .replace(/_([a-z])/g, function (_, k) { return k.toUpperCase() });

  // coerce string value into JS value
  var val = process.env[key];
  if (/^(yes|on|true|enabled)$/i.test(val)) val = true;
  else if (/^(no|off|false|disabled)$/i.test(val)) val = false;
  else if (val === 'null') val = null;
  else val = Number(val);

  obj[prop] = val;
  return obj;
}, {});

/**
 * Is stdout a TTY? Colored output is enabled when `true`.
 */

function useColors() {
  return 'colors' in exports.inspectOpts
    ? Boolean(exports.inspectOpts.colors)
    : tty.isatty(process.stderr.fd);
}

/**
 * Map %o to `util.inspect()`, all on a single line.
 */

exports.formatters.o = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts)
    .split('\n').map(function(str) {
      return str.trim()
    }).join(' ');
};

/**
 * Map %o to `util.inspect()`, allowing multiple lines if needed.
 */

exports.formatters.O = function(v) {
  this.inspectOpts.colors = this.useColors;
  return util.inspect(v, this.inspectOpts);
};

/**
 * Adds ANSI color escape codes if enabled.
 *
 * @api public
 */

function formatArgs(args) {
  var name = this.namespace;
  var useColors = this.useColors;

  if (useColors) {
    var c = this.color;
    var colorCode = '\u001b[3' + (c < 8 ? c : '8;5;' + c);
    var prefix = '  ' + colorCode + ';1m' + name + ' ' + '\u001b[0m';

    args[0] = prefix + args[0].split('\n').join('\n' + prefix);
    args.push(colorCode + 'm+' + exports.humanize(this.diff) + '\u001b[0m');
  } else {
    args[0] = getDate() + name + ' ' + args[0];
  }
}

function getDate() {
  if (exports.inspectOpts.hideDate) {
    return '';
  } else {
    return new Date().toISOString() + ' ';
  }
}

/**
 * Invokes `util.format()` with the specified arguments and writes to stderr.
 */

function log() {
  return process.stderr.write(util.format.apply(util, arguments) + '\n');
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  if (null == namespaces) {
    // If you set a process.env field to null or undefined, it gets cast to the
    // string 'null' or 'undefined'. Just delete instead.
    delete process.env.DEBUG;
  } else {
    process.env.DEBUG = namespaces;
  }
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  return process.env.DEBUG;
}

/**
 * Init logic for `debug` instances.
 *
 * Create a new `inspectOpts` object in case `useColors` is set
 * differently for a particular `debug` instance.
 */

function init (debug) {
  debug.inspectOpts = {};

  var keys = Object.keys(exports.inspectOpts);
  for (var i = 0; i < keys.length; i++) {
    debug.inspectOpts[keys[i]] = exports.inspectOpts[keys[i]];
  }
}

/**
 * Enable namespaces listed in `process.env.DEBUG` initially.
 */

exports.enable(load());
});
var node_1 = node.init;
var node_2 = node.log;
var node_3 = node.formatArgs;
var node_4 = node.save;
var node_5 = node.load;
var node_6 = node.useColors;
var node_7 = node.colors;
var node_8 = node.inspectOpts;

var src = createCommonjsModule(function (module) {
/**
 * Detect Electron renderer process, which is node, but we should
 * treat as a browser.
 */

if (typeof process === 'undefined' || process.type === 'renderer') {
  module.exports = browser;
} else {
  module.exports = node;
}
});

var Writable = stream.Writable;
var debug$1 = src("follow-redirects");

// RFC7231§4.2.1: Of the request methods defined by this specification,
// the GET, HEAD, OPTIONS, and TRACE methods are defined to be safe.
var SAFE_METHODS = { GET: true, HEAD: true, OPTIONS: true, TRACE: true };

// Create handlers that pass events from native requests
var eventHandlers = Object.create(null);
["abort", "aborted", "error", "socket", "timeout"].forEach(function (event) {
  eventHandlers[event] = function (arg) {
    this._redirectable.emit(event, arg);
  };
});

// An HTTP(S) request that can be redirected
function RedirectableRequest(options, responseCallback) {
  // Initialize the request
  Writable.call(this);
  options.headers = options.headers || {};
  this._options = options;
  this._redirectCount = 0;
  this._redirects = [];
  this._requestBodyLength = 0;
  this._requestBodyBuffers = [];

  // Since http.request treats host as an alias of hostname,
  // but the url module interprets host as hostname plus port,
  // eliminate the host property to avoid confusion.
  if (options.host) {
    // Use hostname if set, because it has precedence
    if (!options.hostname) {
      options.hostname = options.host;
    }
    delete options.host;
  }

  // Attach a callback if passed
  if (responseCallback) {
    this.on("response", responseCallback);
  }

  // React to responses of native requests
  var self = this;
  this._onNativeResponse = function (response) {
    self._processResponse(response);
  };

  // Complete the URL object when necessary
  if (!options.pathname && options.path) {
    var searchPos = options.path.indexOf("?");
    if (searchPos < 0) {
      options.pathname = options.path;
    }
    else {
      options.pathname = options.path.substring(0, searchPos);
      options.search = options.path.substring(searchPos);
    }
  }

  // Perform the first request
  this._performRequest();
}
RedirectableRequest.prototype = Object.create(Writable.prototype);

// Writes buffered data to the current native request
RedirectableRequest.prototype.write = function (data, encoding, callback) {
  // Validate input and shift parameters if necessary
  if (!(typeof data === "string" || typeof data === "object" && ("length" in data))) {
    throw new Error("data should be a string, Buffer or Uint8Array");
  }
  if (typeof encoding === "function") {
    callback = encoding;
    encoding = null;
  }

  // Ignore empty buffers, since writing them doesn't invoke the callback
  // https://github.com/nodejs/node/issues/22066
  if (data.length === 0) {
    if (callback) {
      callback();
    }
    return;
  }
  // Only write when we don't exceed the maximum body length
  if (this._requestBodyLength + data.length <= this._options.maxBodyLength) {
    this._requestBodyLength += data.length;
    this._requestBodyBuffers.push({ data: data, encoding: encoding });
    this._currentRequest.write(data, encoding, callback);
  }
  // Error when we exceed the maximum body length
  else {
    this.emit("error", new Error("Request body larger than maxBodyLength limit"));
    this.abort();
  }
};

// Ends the current native request
RedirectableRequest.prototype.end = function (data, encoding, callback) {
  // Shift parameters if necessary
  if (typeof data === "function") {
    callback = data;
    data = encoding = null;
  }
  else if (typeof encoding === "function") {
    callback = encoding;
    encoding = null;
  }

  // Write data and end
  var currentRequest = this._currentRequest;
  this.write(data || "", encoding, function () {
    currentRequest.end(null, null, callback);
  });
};

// Sets a header value on the current native request
RedirectableRequest.prototype.setHeader = function (name, value) {
  this._options.headers[name] = value;
  this._currentRequest.setHeader(name, value);
};

// Clears a header value on the current native request
RedirectableRequest.prototype.removeHeader = function (name) {
  delete this._options.headers[name];
  this._currentRequest.removeHeader(name);
};

// Proxy all other public ClientRequest methods
[
  "abort", "flushHeaders", "getHeader",
  "setNoDelay", "setSocketKeepAlive", "setTimeout",
].forEach(function (method) {
  RedirectableRequest.prototype[method] = function (a, b) {
    return this._currentRequest[method](a, b);
  };
});

// Proxy all public ClientRequest properties
["aborted", "connection", "socket"].forEach(function (property) {
  Object.defineProperty(RedirectableRequest.prototype, property, {
    get: function () { return this._currentRequest[property]; },
  });
});

// Executes the next native request (initial or redirect)
RedirectableRequest.prototype._performRequest = function () {
  // Load the native protocol
  var protocol = this._options.protocol;
  var nativeProtocol = this._options.nativeProtocols[protocol];
  if (!nativeProtocol) {
    this.emit("error", new Error("Unsupported protocol " + protocol));
    return;
  }

  // If specified, use the agent corresponding to the protocol
  // (HTTP and HTTPS use different types of agents)
  if (this._options.agents) {
    var scheme = protocol.substr(0, protocol.length - 1);
    this._options.agent = this._options.agents[scheme];
  }

  // Create the native request
  var request = this._currentRequest =
        nativeProtocol.request(this._options, this._onNativeResponse);
  this._currentUrl = url.format(this._options);

  // Set up event handlers
  request._redirectable = this;
  for (var event in eventHandlers) {
    /* istanbul ignore else */
    if (event) {
      request.on(event, eventHandlers[event]);
    }
  }

  // End a redirected request
  // (The first request must be ended explicitly with RedirectableRequest#end)
  if (this._isRedirect) {
    // Write the request entity and end.
    var i = 0;
    var buffers = this._requestBodyBuffers;
    (function writeNext() {
      if (i < buffers.length) {
        var buffer = buffers[i++];
        request.write(buffer.data, buffer.encoding, writeNext);
      }
      else {
        request.end();
      }
    }());
  }
};

// Processes a response from the current native request
RedirectableRequest.prototype._processResponse = function (response) {
  // Store the redirected response
  if (this._options.trackRedirects) {
    this._redirects.push({
      url: this._currentUrl,
      headers: response.headers,
      statusCode: response.statusCode,
    });
  }

  // RFC7231§6.4: The 3xx (Redirection) class of status code indicates
  // that further action needs to be taken by the user agent in order to
  // fulfill the request. If a Location header field is provided,
  // the user agent MAY automatically redirect its request to the URI
  // referenced by the Location field value,
  // even if the specific status code is not understood.
  var location = response.headers.location;
  if (location && this._options.followRedirects !== false &&
      response.statusCode >= 300 && response.statusCode < 400) {
    // RFC7231§6.4: A client SHOULD detect and intervene
    // in cyclical redirections (i.e., "infinite" redirection loops).
    if (++this._redirectCount > this._options.maxRedirects) {
      this.emit("error", new Error("Max redirects exceeded."));
      return;
    }

    // RFC7231§6.4: Automatic redirection needs to done with
    // care for methods not known to be safe […],
    // since the user might not wish to redirect an unsafe request.
    // RFC7231§6.4.7: The 307 (Temporary Redirect) status code indicates
    // that the target resource resides temporarily under a different URI
    // and the user agent MUST NOT change the request method
    // if it performs an automatic redirection to that URI.
    var header;
    var headers = this._options.headers;
    if (response.statusCode !== 307 && !(this._options.method in SAFE_METHODS)) {
      this._options.method = "GET";
      // Drop a possible entity and headers related to it
      this._requestBodyBuffers = [];
      for (header in headers) {
        if (/^content-/i.test(header)) {
          delete headers[header];
        }
      }
    }

    // Drop the Host header, as the redirect might lead to a different host
    if (!this._isRedirect) {
      for (header in headers) {
        if (/^host$/i.test(header)) {
          delete headers[header];
        }
      }
    }

    // Perform the redirected request
    var redirectUrl = url.resolve(this._currentUrl, location);
    debug$1("redirecting to", redirectUrl);
    Object.assign(this._options, url.parse(redirectUrl));
    this._isRedirect = true;
    this._performRequest();

    // Discard the remainder of the response to avoid waiting for data
    response.destroy();
  }
  else {
    // The response is not a redirect; return it as-is
    response.responseUrl = this._currentUrl;
    response.redirects = this._redirects;
    this.emit("response", response);

    // Clean up
    this._requestBodyBuffers = [];
  }
};

// Wraps the key/value object of protocols with redirect functionality
function wrap(protocols) {
  // Default settings
  var exports = {
    maxRedirects: 21,
    maxBodyLength: 10 * 1024 * 1024,
  };

  // Wrap each protocol
  var nativeProtocols = {};
  Object.keys(protocols).forEach(function (scheme) {
    var protocol = scheme + ":";
    var nativeProtocol = nativeProtocols[protocol] = protocols[scheme];
    var wrappedProtocol = exports[scheme] = Object.create(nativeProtocol);

    // Executes a request, following redirects
    wrappedProtocol.request = function (options, callback) {
      if (typeof options === "string") {
        options = url.parse(options);
        options.maxRedirects = exports.maxRedirects;
      }
      else {
        options = Object.assign({
          protocol: protocol,
          maxRedirects: exports.maxRedirects,
          maxBodyLength: exports.maxBodyLength,
        }, options);
      }
      options.nativeProtocols = nativeProtocols;
      assert.equal(options.protocol, protocol, "protocol mismatch");
      debug$1("options", options);
      return new RedirectableRequest(options, callback);
    };

    // Executes a GET request, following redirects
    wrappedProtocol.get = function (options, callback) {
      var request = wrappedProtocol.request(options, callback);
      request.end();
      return request;
    };
  });
  return exports;
}

// Exports
var followRedirects = wrap({ http: http, https: https });
var wrap_1 = wrap;
followRedirects.wrap = wrap_1;

var name = "axios";
var version = "0.19.0";
var description = "Promise based HTTP client for the browser and node.js";
var main = "index.js";
var scripts = {
	test: "grunt test && bundlesize",
	start: "node ./sandbox/server.js",
	build: "NODE_ENV=production grunt build",
	preversion: "npm test",
	version: "npm run build && grunt version && git add -A dist && git add CHANGELOG.md bower.json package.json",
	postversion: "git push && git push --tags",
	examples: "node ./examples/server.js",
	coveralls: "cat coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js",
	fix: "eslint --fix lib/**/*.js"
};
var repository = {
	type: "git",
	url: "https://github.com/axios/axios.git"
};
var keywords = [
	"xhr",
	"http",
	"ajax",
	"promise",
	"node"
];
var author = "Matt Zabriskie";
var license = "MIT";
var bugs = {
	url: "https://github.com/axios/axios/issues"
};
var homepage = "https://github.com/axios/axios";
var devDependencies = {
	bundlesize: "^0.17.0",
	coveralls: "^3.0.0",
	"es6-promise": "^4.2.4",
	grunt: "^1.0.2",
	"grunt-banner": "^0.6.0",
	"grunt-cli": "^1.2.0",
	"grunt-contrib-clean": "^1.1.0",
	"grunt-contrib-watch": "^1.0.0",
	"grunt-eslint": "^20.1.0",
	"grunt-karma": "^2.0.0",
	"grunt-mocha-test": "^0.13.3",
	"grunt-ts": "^6.0.0-beta.19",
	"grunt-webpack": "^1.0.18",
	"istanbul-instrumenter-loader": "^1.0.0",
	"jasmine-core": "^2.4.1",
	karma: "^1.3.0",
	"karma-chrome-launcher": "^2.2.0",
	"karma-coverage": "^1.1.1",
	"karma-firefox-launcher": "^1.1.0",
	"karma-jasmine": "^1.1.1",
	"karma-jasmine-ajax": "^0.1.13",
	"karma-opera-launcher": "^1.0.0",
	"karma-safari-launcher": "^1.0.0",
	"karma-sauce-launcher": "^1.2.0",
	"karma-sinon": "^1.0.5",
	"karma-sourcemap-loader": "^0.3.7",
	"karma-webpack": "^1.7.0",
	"load-grunt-tasks": "^3.5.2",
	minimist: "^1.2.0",
	mocha: "^5.2.0",
	sinon: "^4.5.0",
	typescript: "^2.8.1",
	"url-search-params": "^0.10.0",
	webpack: "^1.13.1",
	"webpack-dev-server": "^1.14.1"
};
var browser$1 = {
	"./lib/adapters/http.js": "./lib/adapters/xhr.js"
};
var typings = "./index.d.ts";
var dependencies = {
	"follow-redirects": "1.5.10",
	"is-buffer": "^2.0.2"
};
var bundlesize = [
	{
		path: "./dist/axios.min.js",
		threshold: "5kB"
	}
];
var _package = {
	name: name,
	version: version,
	description: description,
	main: main,
	scripts: scripts,
	repository: repository,
	keywords: keywords,
	author: author,
	license: license,
	bugs: bugs,
	homepage: homepage,
	devDependencies: devDependencies,
	browser: browser$1,
	typings: typings,
	dependencies: dependencies,
	bundlesize: bundlesize
};

var _package$1 = /*#__PURE__*/Object.freeze({
	__proto__: null,
	name: name,
	version: version,
	description: description,
	main: main,
	scripts: scripts,
	repository: repository,
	keywords: keywords,
	author: author,
	license: license,
	bugs: bugs,
	homepage: homepage,
	devDependencies: devDependencies,
	browser: browser$1,
	typings: typings,
	dependencies: dependencies,
	bundlesize: bundlesize,
	'default': _package
});

var pkg = getCjsExportFromNamespace(_package$1);

var httpFollow = followRedirects.http;
var httpsFollow = followRedirects.https;






var isHttps = /https:?/;

/*eslint consistent-return:0*/
var http_1 = function httpAdapter(config) {
  return new Promise(function dispatchHttpRequest(resolvePromise, rejectPromise) {
    var timer;
    var resolve = function resolve(value) {
      clearTimeout(timer);
      resolvePromise(value);
    };
    var reject = function reject(value) {
      clearTimeout(timer);
      rejectPromise(value);
    };
    var data = config.data;
    var headers = config.headers;

    // Set User-Agent (required by some servers)
    // Only set header if it hasn't been set in config
    // See https://github.com/axios/axios/issues/69
    if (!headers['User-Agent'] && !headers['user-agent']) {
      headers['User-Agent'] = 'axios/' + pkg.version;
    }

    if (data && !utils.isStream(data)) {
      if (Buffer.isBuffer(data)) ; else if (utils.isArrayBuffer(data)) {
        data = Buffer.from(new Uint8Array(data));
      } else if (utils.isString(data)) {
        data = Buffer.from(data, 'utf-8');
      } else {
        return reject(createError(
          'Data after transformation must be a string, an ArrayBuffer, a Buffer, or a Stream',
          config
        ));
      }

      // Add Content-Length header if data exists
      headers['Content-Length'] = data.length;
    }

    // HTTP basic authentication
    var auth = undefined;
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      auth = username + ':' + password;
    }

    // Parse url
    var parsed = url.parse(config.url);
    var protocol = parsed.protocol || 'http:';

    if (!auth && parsed.auth) {
      var urlAuth = parsed.auth.split(':');
      var urlUsername = urlAuth[0] || '';
      var urlPassword = urlAuth[1] || '';
      auth = urlUsername + ':' + urlPassword;
    }

    if (auth) {
      delete headers.Authorization;
    }

    var isHttpsRequest = isHttps.test(protocol);
    var agent = isHttpsRequest ? config.httpsAgent : config.httpAgent;

    var options = {
      path: buildURL(parsed.path, config.params, config.paramsSerializer).replace(/^\?/, ''),
      method: config.method.toUpperCase(),
      headers: headers,
      agent: agent,
      auth: auth
    };

    if (config.socketPath) {
      options.socketPath = config.socketPath;
    } else {
      options.hostname = parsed.hostname;
      options.port = parsed.port;
    }

    var proxy = config.proxy;
    if (!proxy && proxy !== false) {
      var proxyEnv = protocol.slice(0, -1) + '_proxy';
      var proxyUrl = process.env[proxyEnv] || process.env[proxyEnv.toUpperCase()];
      if (proxyUrl) {
        var parsedProxyUrl = url.parse(proxyUrl);
        var noProxyEnv = process.env.no_proxy || process.env.NO_PROXY;
        var shouldProxy = true;

        if (noProxyEnv) {
          var noProxy = noProxyEnv.split(',').map(function trim(s) {
            return s.trim();
          });

          shouldProxy = !noProxy.some(function proxyMatch(proxyElement) {
            if (!proxyElement) {
              return false;
            }
            if (proxyElement === '*') {
              return true;
            }
            if (proxyElement[0] === '.' &&
                parsed.hostname.substr(parsed.hostname.length - proxyElement.length) === proxyElement &&
                proxyElement.match(/\./g).length === parsed.hostname.match(/\./g).length) {
              return true;
            }

            return parsed.hostname === proxyElement;
          });
        }


        if (shouldProxy) {
          proxy = {
            host: parsedProxyUrl.hostname,
            port: parsedProxyUrl.port
          };

          if (parsedProxyUrl.auth) {
            var proxyUrlAuth = parsedProxyUrl.auth.split(':');
            proxy.auth = {
              username: proxyUrlAuth[0],
              password: proxyUrlAuth[1]
            };
          }
        }
      }
    }

    if (proxy) {
      options.hostname = proxy.host;
      options.host = proxy.host;
      options.headers.host = parsed.hostname + (parsed.port ? ':' + parsed.port : '');
      options.port = proxy.port;
      options.path = protocol + '//' + parsed.hostname + (parsed.port ? ':' + parsed.port : '') + options.path;

      // Basic proxy authorization
      if (proxy.auth) {
        var base64 = Buffer.from(proxy.auth.username + ':' + proxy.auth.password, 'utf8').toString('base64');
        options.headers['Proxy-Authorization'] = 'Basic ' + base64;
      }
    }

    var transport;
    var isHttpsProxy = isHttpsRequest && (proxy ? isHttps.test(proxy.protocol) : true);
    if (config.transport) {
      transport = config.transport;
    } else if (config.maxRedirects === 0) {
      transport = isHttpsProxy ? https : http;
    } else {
      if (config.maxRedirects) {
        options.maxRedirects = config.maxRedirects;
      }
      transport = isHttpsProxy ? httpsFollow : httpFollow;
    }

    if (config.maxContentLength && config.maxContentLength > -1) {
      options.maxBodyLength = config.maxContentLength;
    }

    // Create the request
    var req = transport.request(options, function handleResponse(res) {
      if (req.aborted) return;

      // uncompress the response body transparently if required
      var stream = res;
      switch (res.headers['content-encoding']) {
      /*eslint default-case:0*/
      case 'gzip':
      case 'compress':
      case 'deflate':
        // add the unzipper to the body stream processing pipeline
        stream = (res.statusCode === 204) ? stream : stream.pipe(zlib.createUnzip());

        // remove the content-encoding in order to not confuse downstream operations
        delete res.headers['content-encoding'];
        break;
      }

      // return the last request in case of redirects
      var lastRequest = res.req || req;

      var response = {
        status: res.statusCode,
        statusText: res.statusMessage,
        headers: res.headers,
        config: config,
        request: lastRequest
      };

      if (config.responseType === 'stream') {
        response.data = stream;
        settle(resolve, reject, response);
      } else {
        var responseBuffer = [];
        stream.on('data', function handleStreamData(chunk) {
          responseBuffer.push(chunk);

          // make sure the content length is not over the maxContentLength if specified
          if (config.maxContentLength > -1 && Buffer.concat(responseBuffer).length > config.maxContentLength) {
            stream.destroy();
            reject(createError('maxContentLength size of ' + config.maxContentLength + ' exceeded',
              config, null, lastRequest));
          }
        });

        stream.on('error', function handleStreamError(err) {
          if (req.aborted) return;
          reject(enhanceError(err, config, null, lastRequest));
        });

        stream.on('end', function handleStreamEnd() {
          var responseData = Buffer.concat(responseBuffer);
          if (config.responseType !== 'arraybuffer') {
            responseData = responseData.toString(config.responseEncoding);
          }

          response.data = responseData;
          settle(resolve, reject, response);
        });
      }
    });

    // Handle errors
    req.on('error', function handleRequestError(err) {
      if (req.aborted) return;
      reject(enhanceError(err, config, null, req));
    });

    // Handle request timeout
    if (config.timeout) {
      timer = setTimeout(function handleRequestTimeout() {
        req.abort();
        reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED', req));
      }, config.timeout);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (req.aborted) return;

        req.abort();
        reject(cancel);
      });
    }

    // Send the request
    if (utils.isStream(data)) {
      data.on('error', function handleStreamError(err) {
        reject(enhanceError(err, config, null, req));
      }).pipe(req);
    } else {
      req.end(data);
    }
  });
};

// Headers whose duplicates are ignored by node
// c.f. https://nodejs.org/api/http.html#http_message_headers
var ignoreDuplicateOf = [
  'age', 'authorization', 'content-length', 'content-type', 'etag',
  'expires', 'from', 'host', 'if-modified-since', 'if-unmodified-since',
  'last-modified', 'location', 'max-forwards', 'proxy-authorization',
  'referer', 'retry-after', 'user-agent'
];

/**
 * Parse headers into an object
 *
 * ```
 * Date: Wed, 27 Aug 2014 08:58:49 GMT
 * Content-Type: application/json
 * Connection: keep-alive
 * Transfer-Encoding: chunked
 * ```
 *
 * @param {String} headers Headers needing to be parsed
 * @returns {Object} Headers parsed into an object
 */
var parseHeaders = function parseHeaders(headers) {
  var parsed = {};
  var key;
  var val;
  var i;

  if (!headers) { return parsed; }

  utils.forEach(headers.split('\n'), function parser(line) {
    i = line.indexOf(':');
    key = utils.trim(line.substr(0, i)).toLowerCase();
    val = utils.trim(line.substr(i + 1));

    if (key) {
      if (parsed[key] && ignoreDuplicateOf.indexOf(key) >= 0) {
        return;
      }
      if (key === 'set-cookie') {
        parsed[key] = (parsed[key] ? parsed[key] : []).concat([val]);
      } else {
        parsed[key] = parsed[key] ? parsed[key] + ', ' + val : val;
      }
    }
  });

  return parsed;
};

var isURLSameOrigin = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs have full support of the APIs needed to test
  // whether the request URL is of the same origin as current location.
    (function standardBrowserEnv() {
      var msie = /(msie|trident)/i.test(navigator.userAgent);
      var urlParsingNode = document.createElement('a');
      var originURL;

      /**
    * Parse a URL to discover it's components
    *
    * @param {String} url The URL to be parsed
    * @returns {Object}
    */
      function resolveURL(url) {
        var href = url;

        if (msie) {
        // IE needs attribute set twice to normalize properties
          urlParsingNode.setAttribute('href', href);
          href = urlParsingNode.href;
        }

        urlParsingNode.setAttribute('href', href);

        // urlParsingNode provides the UrlUtils interface - http://url.spec.whatwg.org/#urlutils
        return {
          href: urlParsingNode.href,
          protocol: urlParsingNode.protocol ? urlParsingNode.protocol.replace(/:$/, '') : '',
          host: urlParsingNode.host,
          search: urlParsingNode.search ? urlParsingNode.search.replace(/^\?/, '') : '',
          hash: urlParsingNode.hash ? urlParsingNode.hash.replace(/^#/, '') : '',
          hostname: urlParsingNode.hostname,
          port: urlParsingNode.port,
          pathname: (urlParsingNode.pathname.charAt(0) === '/') ?
            urlParsingNode.pathname :
            '/' + urlParsingNode.pathname
        };
      }

      originURL = resolveURL(window.location.href);

      /**
    * Determine if a URL shares the same origin as the current location
    *
    * @param {String} requestURL The URL to test
    * @returns {boolean} True if URL shares the same origin, otherwise false
    */
      return function isURLSameOrigin(requestURL) {
        var parsed = (utils.isString(requestURL)) ? resolveURL(requestURL) : requestURL;
        return (parsed.protocol === originURL.protocol &&
            parsed.host === originURL.host);
      };
    })() :

  // Non standard browser envs (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return function isURLSameOrigin() {
        return true;
      };
    })()
);

var cookies = (
  utils.isStandardBrowserEnv() ?

  // Standard browser envs support document.cookie
    (function standardBrowserEnv() {
      return {
        write: function write(name, value, expires, path, domain, secure) {
          var cookie = [];
          cookie.push(name + '=' + encodeURIComponent(value));

          if (utils.isNumber(expires)) {
            cookie.push('expires=' + new Date(expires).toGMTString());
          }

          if (utils.isString(path)) {
            cookie.push('path=' + path);
          }

          if (utils.isString(domain)) {
            cookie.push('domain=' + domain);
          }

          if (secure === true) {
            cookie.push('secure');
          }

          document.cookie = cookie.join('; ');
        },

        read: function read(name) {
          var match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
          return (match ? decodeURIComponent(match[3]) : null);
        },

        remove: function remove(name) {
          this.write(name, '', Date.now() - 86400000);
        }
      };
    })() :

  // Non standard browser env (web workers, react-native) lack needed support.
    (function nonStandardBrowserEnv() {
      return {
        write: function write() {},
        read: function read() { return null; },
        remove: function remove() {}
      };
    })()
);

var xhr = function xhrAdapter(config) {
  return new Promise(function dispatchXhrRequest(resolve, reject) {
    var requestData = config.data;
    var requestHeaders = config.headers;

    if (utils.isFormData(requestData)) {
      delete requestHeaders['Content-Type']; // Let the browser set it
    }

    var request = new XMLHttpRequest();

    // HTTP basic authentication
    if (config.auth) {
      var username = config.auth.username || '';
      var password = config.auth.password || '';
      requestHeaders.Authorization = 'Basic ' + btoa(username + ':' + password);
    }

    request.open(config.method.toUpperCase(), buildURL(config.url, config.params, config.paramsSerializer), true);

    // Set the request timeout in MS
    request.timeout = config.timeout;

    // Listen for ready state
    request.onreadystatechange = function handleLoad() {
      if (!request || request.readyState !== 4) {
        return;
      }

      // The request errored out and we didn't get a response, this will be
      // handled by onerror instead
      // With one exception: request that using file: protocol, most browsers
      // will return status as 0 even though it's a successful request
      if (request.status === 0 && !(request.responseURL && request.responseURL.indexOf('file:') === 0)) {
        return;
      }

      // Prepare the response
      var responseHeaders = 'getAllResponseHeaders' in request ? parseHeaders(request.getAllResponseHeaders()) : null;
      var responseData = !config.responseType || config.responseType === 'text' ? request.responseText : request.response;
      var response = {
        data: responseData,
        status: request.status,
        statusText: request.statusText,
        headers: responseHeaders,
        config: config,
        request: request
      };

      settle(resolve, reject, response);

      // Clean up request
      request = null;
    };

    // Handle browser request cancellation (as opposed to a manual cancellation)
    request.onabort = function handleAbort() {
      if (!request) {
        return;
      }

      reject(createError('Request aborted', config, 'ECONNABORTED', request));

      // Clean up request
      request = null;
    };

    // Handle low level network errors
    request.onerror = function handleError() {
      // Real errors are hidden from us by the browser
      // onerror should only fire if it's a network error
      reject(createError('Network Error', config, null, request));

      // Clean up request
      request = null;
    };

    // Handle timeout
    request.ontimeout = function handleTimeout() {
      reject(createError('timeout of ' + config.timeout + 'ms exceeded', config, 'ECONNABORTED',
        request));

      // Clean up request
      request = null;
    };

    // Add xsrf header
    // This is only done if running in a standard browser environment.
    // Specifically not if we're in a web worker, or react-native.
    if (utils.isStandardBrowserEnv()) {
      var cookies$1 = cookies;

      // Add xsrf header
      var xsrfValue = (config.withCredentials || isURLSameOrigin(config.url)) && config.xsrfCookieName ?
        cookies$1.read(config.xsrfCookieName) :
        undefined;

      if (xsrfValue) {
        requestHeaders[config.xsrfHeaderName] = xsrfValue;
      }
    }

    // Add headers to the request
    if ('setRequestHeader' in request) {
      utils.forEach(requestHeaders, function setRequestHeader(val, key) {
        if (typeof requestData === 'undefined' && key.toLowerCase() === 'content-type') {
          // Remove Content-Type if data is undefined
          delete requestHeaders[key];
        } else {
          // Otherwise add header to the request
          request.setRequestHeader(key, val);
        }
      });
    }

    // Add withCredentials to request if needed
    if (config.withCredentials) {
      request.withCredentials = true;
    }

    // Add responseType to request if needed
    if (config.responseType) {
      try {
        request.responseType = config.responseType;
      } catch (e) {
        // Expected DOMException thrown by browsers not compatible XMLHttpRequest Level 2.
        // But, this can be suppressed for 'json' type as it can be parsed by default 'transformResponse' function.
        if (config.responseType !== 'json') {
          throw e;
        }
      }
    }

    // Handle progress if needed
    if (typeof config.onDownloadProgress === 'function') {
      request.addEventListener('progress', config.onDownloadProgress);
    }

    // Not all browsers support upload events
    if (typeof config.onUploadProgress === 'function' && request.upload) {
      request.upload.addEventListener('progress', config.onUploadProgress);
    }

    if (config.cancelToken) {
      // Handle cancellation
      config.cancelToken.promise.then(function onCanceled(cancel) {
        if (!request) {
          return;
        }

        request.abort();
        reject(cancel);
        // Clean up request
        request = null;
      });
    }

    if (requestData === undefined) {
      requestData = null;
    }

    // Send the request
    request.send(requestData);
  });
};

var DEFAULT_CONTENT_TYPE = {
  'Content-Type': 'application/x-www-form-urlencoded'
};

function setContentTypeIfUnset(headers, value) {
  if (!utils.isUndefined(headers) && utils.isUndefined(headers['Content-Type'])) {
    headers['Content-Type'] = value;
  }
}

function getDefaultAdapter() {
  var adapter;
  // Only Node.JS has a process variable that is of [[Class]] process
  if (typeof process !== 'undefined' && Object.prototype.toString.call(process) === '[object process]') {
    // For node use HTTP adapter
    adapter = http_1;
  } else if (typeof XMLHttpRequest !== 'undefined') {
    // For browsers use XHR adapter
    adapter = xhr;
  }
  return adapter;
}

var defaults = {
  adapter: getDefaultAdapter(),

  transformRequest: [function transformRequest(data, headers) {
    normalizeHeaderName(headers, 'Accept');
    normalizeHeaderName(headers, 'Content-Type');
    if (utils.isFormData(data) ||
      utils.isArrayBuffer(data) ||
      utils.isBuffer(data) ||
      utils.isStream(data) ||
      utils.isFile(data) ||
      utils.isBlob(data)
    ) {
      return data;
    }
    if (utils.isArrayBufferView(data)) {
      return data.buffer;
    }
    if (utils.isURLSearchParams(data)) {
      setContentTypeIfUnset(headers, 'application/x-www-form-urlencoded;charset=utf-8');
      return data.toString();
    }
    if (utils.isObject(data)) {
      setContentTypeIfUnset(headers, 'application/json;charset=utf-8');
      return JSON.stringify(data);
    }
    return data;
  }],

  transformResponse: [function transformResponse(data) {
    /*eslint no-param-reassign:0*/
    if (typeof data === 'string') {
      try {
        data = JSON.parse(data);
      } catch (e) { /* Ignore */ }
    }
    return data;
  }],

  /**
   * A timeout in milliseconds to abort a request. If set to 0 (default) a
   * timeout is not created.
   */
  timeout: 0,

  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',

  maxContentLength: -1,

  validateStatus: function validateStatus(status) {
    return status >= 200 && status < 300;
  }
};

defaults.headers = {
  common: {
    'Accept': 'application/json, text/plain, */*'
  }
};

utils.forEach(['delete', 'get', 'head'], function forEachMethodNoData(method) {
  defaults.headers[method] = {};
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  defaults.headers[method] = utils.merge(DEFAULT_CONTENT_TYPE);
});

var defaults_1 = defaults;

/**
 * Determines whether the specified URL is absolute
 *
 * @param {string} url The URL to test
 * @returns {boolean} True if the specified URL is absolute, otherwise false
 */
var isAbsoluteURL = function isAbsoluteURL(url) {
  // A URL is considered absolute if it begins with "<scheme>://" or "//" (protocol-relative URL).
  // RFC 3986 defines scheme name as a sequence of characters beginning with a letter and followed
  // by any combination of letters, digits, plus, period, or hyphen.
  return /^([a-z][a-z\d\+\-\.]*:)?\/\//i.test(url);
};

/**
 * Creates a new URL by combining the specified URLs
 *
 * @param {string} baseURL The base URL
 * @param {string} relativeURL The relative URL
 * @returns {string} The combined URL
 */
var combineURLs = function combineURLs(baseURL, relativeURL) {
  return relativeURL
    ? baseURL.replace(/\/+$/, '') + '/' + relativeURL.replace(/^\/+/, '')
    : baseURL;
};

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
function throwIfCancellationRequested(config) {
  if (config.cancelToken) {
    config.cancelToken.throwIfRequested();
  }
}

/**
 * Dispatch a request to the server using the configured adapter.
 *
 * @param {object} config The config that is to be used for the request
 * @returns {Promise} The Promise to be fulfilled
 */
var dispatchRequest = function dispatchRequest(config) {
  throwIfCancellationRequested(config);

  // Support baseURL config
  if (config.baseURL && !isAbsoluteURL(config.url)) {
    config.url = combineURLs(config.baseURL, config.url);
  }

  // Ensure headers exist
  config.headers = config.headers || {};

  // Transform request data
  config.data = transformData(
    config.data,
    config.headers,
    config.transformRequest
  );

  // Flatten headers
  config.headers = utils.merge(
    config.headers.common || {},
    config.headers[config.method] || {},
    config.headers || {}
  );

  utils.forEach(
    ['delete', 'get', 'head', 'post', 'put', 'patch', 'common'],
    function cleanHeaderConfig(method) {
      delete config.headers[method];
    }
  );

  var adapter = config.adapter || defaults_1.adapter;

  return adapter(config).then(function onAdapterResolution(response) {
    throwIfCancellationRequested(config);

    // Transform response data
    response.data = transformData(
      response.data,
      response.headers,
      config.transformResponse
    );

    return response;
  }, function onAdapterRejection(reason) {
    if (!isCancel(reason)) {
      throwIfCancellationRequested(config);

      // Transform response data
      if (reason && reason.response) {
        reason.response.data = transformData(
          reason.response.data,
          reason.response.headers,
          config.transformResponse
        );
      }
    }

    return Promise.reject(reason);
  });
};

/**
 * Config-specific merge-function which creates a new config-object
 * by merging two configuration objects together.
 *
 * @param {Object} config1
 * @param {Object} config2
 * @returns {Object} New object resulting from merging config2 to config1
 */
var mergeConfig = function mergeConfig(config1, config2) {
  // eslint-disable-next-line no-param-reassign
  config2 = config2 || {};
  var config = {};

  utils.forEach(['url', 'method', 'params', 'data'], function valueFromConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    }
  });

  utils.forEach(['headers', 'auth', 'proxy'], function mergeDeepProperties(prop) {
    if (utils.isObject(config2[prop])) {
      config[prop] = utils.deepMerge(config1[prop], config2[prop]);
    } else if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (utils.isObject(config1[prop])) {
      config[prop] = utils.deepMerge(config1[prop]);
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  utils.forEach([
    'baseURL', 'transformRequest', 'transformResponse', 'paramsSerializer',
    'timeout', 'withCredentials', 'adapter', 'responseType', 'xsrfCookieName',
    'xsrfHeaderName', 'onUploadProgress', 'onDownloadProgress', 'maxContentLength',
    'validateStatus', 'maxRedirects', 'httpAgent', 'httpsAgent', 'cancelToken',
    'socketPath'
  ], function defaultToConfig2(prop) {
    if (typeof config2[prop] !== 'undefined') {
      config[prop] = config2[prop];
    } else if (typeof config1[prop] !== 'undefined') {
      config[prop] = config1[prop];
    }
  });

  return config;
};

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 */
function Axios(instanceConfig) {
  this.defaults = instanceConfig;
  this.interceptors = {
    request: new InterceptorManager_1(),
    response: new InterceptorManager_1()
  };
}

/**
 * Dispatch a request
 *
 * @param {Object} config The config specific for this request (merged with this.defaults)
 */
Axios.prototype.request = function request(config) {
  /*eslint no-param-reassign:0*/
  // Allow for axios('example/url'[, config]) a la fetch API
  if (typeof config === 'string') {
    config = arguments[1] || {};
    config.url = arguments[0];
  } else {
    config = config || {};
  }

  config = mergeConfig(this.defaults, config);
  config.method = config.method ? config.method.toLowerCase() : 'get';

  // Hook up interceptors middleware
  var chain = [dispatchRequest, undefined];
  var promise = Promise.resolve(config);

  this.interceptors.request.forEach(function unshiftRequestInterceptors(interceptor) {
    chain.unshift(interceptor.fulfilled, interceptor.rejected);
  });

  this.interceptors.response.forEach(function pushResponseInterceptors(interceptor) {
    chain.push(interceptor.fulfilled, interceptor.rejected);
  });

  while (chain.length) {
    promise = promise.then(chain.shift(), chain.shift());
  }

  return promise;
};

Axios.prototype.getUri = function getUri(config) {
  config = mergeConfig(this.defaults, config);
  return buildURL(config.url, config.params, config.paramsSerializer).replace(/^\?/, '');
};

// Provide aliases for supported request methods
utils.forEach(['delete', 'get', 'head', 'options'], function forEachMethodNoData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url
    }));
  };
});

utils.forEach(['post', 'put', 'patch'], function forEachMethodWithData(method) {
  /*eslint func-names:0*/
  Axios.prototype[method] = function(url, data, config) {
    return this.request(utils.merge(config || {}, {
      method: method,
      url: url,
      data: data
    }));
  };
});

var Axios_1 = Axios;

/**
 * A `Cancel` is an object that is thrown when an operation is canceled.
 *
 * @class
 * @param {string=} message The message.
 */
function Cancel(message) {
  this.message = message;
}

Cancel.prototype.toString = function toString() {
  return 'Cancel' + (this.message ? ': ' + this.message : '');
};

Cancel.prototype.__CANCEL__ = true;

var Cancel_1 = Cancel;

/**
 * A `CancelToken` is an object that can be used to request cancellation of an operation.
 *
 * @class
 * @param {Function} executor The executor function.
 */
function CancelToken(executor) {
  if (typeof executor !== 'function') {
    throw new TypeError('executor must be a function.');
  }

  var resolvePromise;
  this.promise = new Promise(function promiseExecutor(resolve) {
    resolvePromise = resolve;
  });

  var token = this;
  executor(function cancel(message) {
    if (token.reason) {
      // Cancellation has already been requested
      return;
    }

    token.reason = new Cancel_1(message);
    resolvePromise(token.reason);
  });
}

/**
 * Throws a `Cancel` if cancellation has been requested.
 */
CancelToken.prototype.throwIfRequested = function throwIfRequested() {
  if (this.reason) {
    throw this.reason;
  }
};

/**
 * Returns an object that contains a new `CancelToken` and a function that, when called,
 * cancels the `CancelToken`.
 */
CancelToken.source = function source() {
  var cancel;
  var token = new CancelToken(function executor(c) {
    cancel = c;
  });
  return {
    token: token,
    cancel: cancel
  };
};

var CancelToken_1 = CancelToken;

/**
 * Syntactic sugar for invoking a function and expanding an array for arguments.
 *
 * Common use case would be to use `Function.prototype.apply`.
 *
 *  ```js
 *  function f(x, y, z) {}
 *  var args = [1, 2, 3];
 *  f.apply(null, args);
 *  ```
 *
 * With `spread` this example can be re-written.
 *
 *  ```js
 *  spread(function(x, y, z) {})([1, 2, 3]);
 *  ```
 *
 * @param {Function} callback
 * @returns {Function}
 */
var spread = function spread(callback) {
  return function wrap(arr) {
    return callback.apply(null, arr);
  };
};

/**
 * Create an instance of Axios
 *
 * @param {Object} defaultConfig The default config for the instance
 * @return {Axios} A new instance of Axios
 */
function createInstance(defaultConfig) {
  var context = new Axios_1(defaultConfig);
  var instance = bind(Axios_1.prototype.request, context);

  // Copy axios.prototype to instance
  utils.extend(instance, Axios_1.prototype, context);

  // Copy context to instance
  utils.extend(instance, context);

  return instance;
}

// Create the default instance to be exported
var axios = createInstance(defaults_1);

// Expose Axios class to allow class inheritance
axios.Axios = Axios_1;

// Factory for creating new instances
axios.create = function create(instanceConfig) {
  return createInstance(mergeConfig(axios.defaults, instanceConfig));
};

// Expose Cancel & CancelToken
axios.Cancel = Cancel_1;
axios.CancelToken = CancelToken_1;
axios.isCancel = isCancel;

// Expose all/spread
axios.all = function all(promises) {
  return Promise.all(promises);
};
axios.spread = spread;

var axios_1 = axios;

// Allow use of default import syntax in TypeScript
var default_1 = axios;
axios_1.default = default_1;

var axios$1 = axios_1;

var bank = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Helper functions to deal with the GNU Taler demo bank.
 *
 * Mostly useful for automated tests.
 */
/**
 * Imports.
 */
const axios_1 = __importDefault(axios$1);

function makeId(length) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}
class Bank {
    constructor(bankBaseUrl) {
        this.bankBaseUrl = bankBaseUrl;
    }
    generateWithdrawUri(bankUser, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = {
                amount,
            };
            const reqUrl = new URL("api/withdraw-headless-uri", this.bankBaseUrl).href;
            const resp = yield axios_1.default({
                method: "post",
                url: reqUrl,
                data: body,
                responseType: "json",
                headers: {
                    "X-Taler-Bank-Username": bankUser.username,
                    "X-Taler-Bank-Password": bankUser.password,
                },
            });
            if (resp.status != 200) {
                throw Error("failed to create bank reserve");
            }
            const withdrawUri = resp.data["taler_withdraw_uri"];
            if (!withdrawUri) {
                throw Error("Bank's response did not include withdraw URI");
            }
            return withdrawUri;
        });
    }
    createReserve(bankUser, amount, reservePub, exchangePaytoUri) {
        return __awaiter(this, void 0, void 0, function* () {
            const reqUrl = new URL("api/withdraw-headless", this.bankBaseUrl).href;
            const body = {
                auth: { type: "basic" },
                username: bankUser,
                amount,
                reserve_pub: reservePub,
                exchange_wire_detail: exchangePaytoUri,
            };
            const resp = yield axios_1.default({
                method: "post",
                url: reqUrl,
                data: body,
                responseType: "json",
                headers: {
                    "X-Taler-Bank-Username": bankUser.username,
                    "X-Taler-Bank-Password": bankUser.password,
                },
            });
            if (resp.status != 200) {
                throw Error("failed to create bank reserve");
            }
        });
    }
    registerRandomUser() {
        return __awaiter(this, void 0, void 0, function* () {
            const reqUrl = new URL("api/register", this.bankBaseUrl).href;
            const randId = makeId(8);
            const bankUser = {
                username: `testuser-${randId}`,
                password: `testpw-${randId}`,
            };
            const resp = yield axios_1.default({
                method: "post",
                url: reqUrl,
                data: querystring.stringify(bankUser),
                responseType: "json",
            });
            if (resp.status != 200) {
                throw Error("could not register bank user");
            }
            return bankUser;
        });
    }
}
exports.Bank = Bank;

});

unwrapExports(bank);
var bank_1 = bank.Bank;

var helpers$1 = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (commonjsGlobal && commonjsGlobal.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (commonjsGlobal && commonjsGlobal.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Helpers to create headless wallets.
 */
/**
 * Imports.
 */




const axios_1 = __importDefault(axios$1);
const amounts$1 = __importStar(amounts);



const logger = new logging.Logger("helpers.ts");
class ConsoleBadge {
    startBusy() {
    }
    stopBusy() {
    }
    showNotification() {
    }
    clearNotification() {
    }
}
class NodeHttpLib {
    get(url) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield axios_1.default({
                    method: "get",
                    url: url,
                    responseType: "json",
                });
                return {
                    responseJson: resp.data,
                    status: resp.status,
                };
            }
            catch (e) {
                throw e;
            }
        });
    }
    postJson(url, body) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const resp = yield axios_1.default({
                    method: "post",
                    url: url,
                    responseType: "json",
                    data: body,
                });
                return {
                    responseJson: resp.data,
                    status: resp.status,
                };
            }
            catch (e) {
                throw e;
            }
        });
    }
}
exports.NodeHttpLib = NodeHttpLib;
/**
 * Get a wallet instance with default settings for node.
 */
function getDefaultNodeWallet(args = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const myNotifier = {
            notify() {
                if (args.notifyHandler) {
                    args.notifyHandler("");
                }
            }
        };
        const myBadge = new ConsoleBadge();
        build.BridgeIDBFactory.enableTracing = false;
        const myBackend = new build.MemoryBackend();
        myBackend.enableTracing = false;
        const storagePath = args.persistentStoragePath;
        if (storagePath) {
            try {
                const dbContentStr = fs.readFileSync(storagePath, { encoding: "utf-8" });
                const dbContent = JSON.parse(dbContentStr);
                myBackend.importDump(dbContent);
            }
            catch (e) {
                console.error("could not read wallet file");
            }
            myBackend.afterCommitCallback = () => __awaiter(this, void 0, void 0, function* () {
                // Allow caller to stop persisting the wallet.
                if (args.persistentStoragePath === undefined) {
                    return;
                }
                const dbContent = myBackend.exportDump();
                fs.writeFileSync(storagePath, JSON.stringify(dbContent, undefined, 2), { encoding: "utf-8" });
            });
        }
        build.BridgeIDBFactory.enableTracing = false;
        const myBridgeIdbFactory = new build.BridgeIDBFactory(myBackend);
        const myIdbFactory = myBridgeIdbFactory;
        let myHttpLib;
        if (args.httpLib) {
            myHttpLib = args.httpLib;
        }
        else {
            myHttpLib = new NodeHttpLib();
        }
        const myVersionChange = () => {
            console.error("version change requested, should not happen");
            throw Error();
        };
        const myUnsupportedUpgrade = () => {
            console.error("unsupported database migration");
            throw Error();
        };
        build.shimIndexedDB(myBridgeIdbFactory);
        const myDb = yield db.openTalerDb(myIdbFactory, myVersionChange, myUnsupportedUpgrade);
        const worker = new synchronousWorker.SynchronousCryptoWorkerFactory();
        //const worker = new NodeCryptoWorkerFactory();
        return new wallet.Wallet(myDb, myHttpLib, myBadge, myNotifier, worker);
    });
}
exports.getDefaultNodeWallet = getDefaultNodeWallet;
function withdrawTestBalance(myWallet, amount = "TESTKUDOS:10", bankBaseUrl = "https://bank.test.taler.net/", exchangeBaseUrl = "https://exchange.test.taler.net/") {
    return __awaiter(this, void 0, void 0, function* () {
        const reserveResponse = yield myWallet.createReserve({
            amount: amounts$1.parseOrThrow(amount),
            exchange: exchangeBaseUrl,
            exchangeWire: "payto://unknown",
        });
        const reservePub = reserveResponse.reservePub;
        const bank$1 = new bank.Bank(bankBaseUrl);
        const bankUser = yield bank$1.registerRandomUser();
        logger.trace(`Registered bank user ${JSON.stringify(bankUser)}`);
        const exchangePaytoUri = yield myWallet.getExchangePaytoUri(exchangeBaseUrl, ["x-taler-bank"]);
        yield bank$1.createReserve(bankUser, amount, reservePub, exchangePaytoUri);
        yield myWallet.confirmReserve({ reservePub: reserveResponse.reservePub });
        yield myWallet.runUntilReserveDepleted(reservePub);
    });
}
exports.withdrawTestBalance = withdrawTestBalance;

});

unwrapExports(helpers$1);
var helpers_1$1 = helpers$1.NodeHttpLib;
var helpers_2$1 = helpers$1.getDefaultNodeWallet;
var helpers_3$1 = helpers$1.withdrawTestBalance;

var android = createCommonjsModule(function (module, exports) {
/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
var __awaiter = (commonjsGlobal && commonjsGlobal.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });



// @ts-ignore: special built-in module
//import akono = require("akono");
class AndroidHttpLib {
    constructor(sendMessage) {
        this.sendMessage = sendMessage;
        this.useNfcTunnel = false;
        this.nodeHttpLib = new helpers$1.NodeHttpLib();
        this.requestId = 1;
        this.requestMap = {};
    }
    get(url) {
        if (this.useNfcTunnel) {
            const myId = this.requestId++;
            const p = promiseUtils.openPromise();
            this.requestMap[myId] = p;
            const request = {
                method: "get",
                url,
            };
            this.sendMessage(JSON.stringify({
                type: "tunnelHttp",
                request,
                id: myId,
            }));
            return p.promise;
        }
        else {
            return this.nodeHttpLib.get(url);
        }
    }
    postJson(url, body) {
        if (this.useNfcTunnel) {
            const myId = this.requestId++;
            const p = promiseUtils.openPromise();
            this.requestMap[myId] = p;
            const request = {
                method: "postJson",
                url,
                body,
            };
            this.sendMessage(JSON.stringify({ type: "tunnelHttp", request, id: myId }));
            return p.promise;
        }
        else {
            return this.nodeHttpLib.postJson(url, body);
        }
    }
    handleTunnelResponse(msg) {
        const myId = msg.id;
        const p = this.requestMap[myId];
        if (!p) {
            console.error(`no matching request for tunneled HTTP response, id=${myId}`);
        }
        if (msg.status == 200) {
            p.resolve({ responseJson: msg.responseJson, status: msg.status });
        }
        else {
            p.reject(new Error(`unexpected HTTP status code ${msg.status}`));
        }
        delete this.requestMap[myId];
    }
}
exports.AndroidHttpLib = AndroidHttpLib;
function installAndroidWalletListener() {
    // @ts-ignore
    const sendMessage = globalThis.__akono_sendMessage;
    if (typeof sendMessage !== "function") {
        const errMsg = "FATAL: cannot install android wallet listener: akono functions missing";
        console.error(errMsg);
        throw new Error(errMsg);
    }
    let wp = promiseUtils.openPromise();
    let httpLib = new AndroidHttpLib(sendMessage);
    let walletArgs;
    const onMessage = (msgStr) => __awaiter(this, void 0, void 0, function* () {
        if (typeof msgStr !== "string") {
            console.error("expected string as message");
            return;
        }
        const msg = JSON.parse(msgStr);
        const operation = msg.operation;
        if (typeof operation !== "string") {
            console.error("message to android wallet helper must contain operation of type string");
            return;
        }
        const id = msg.id;
        let result;
        switch (operation) {
            case "init": {
                walletArgs = {
                    notifyHandler: () => __awaiter(this, void 0, void 0, function* () {
                        sendMessage(JSON.stringify({ type: "notification" }));
                    }),
                    persistentStoragePath: msg.args.persistentStoragePath,
                    httpLib: httpLib,
                };
                const w = yield helpers$1.getDefaultNodeWallet(walletArgs);
                w.runLoopScheduledRetries().catch((e) => {
                    console.error("Error during wallet retry loop", e);
                });
                wp.resolve(w);
                result = true;
                break;
            }
            case "getBalances": {
                const wallet = yield wp.promise;
                result = yield wallet.getBalances();
                break;
            }
            case "getPendingOperations": {
                const wallet = yield wp.promise;
                result = yield wallet.getPendingOperations();
                break;
            }
            case "withdrawTestkudos": {
                const wallet = yield wp.promise;
                yield helpers$1.withdrawTestBalance(wallet);
                result = {};
                break;
            }
            case "getHistory": {
                const wallet = yield wp.promise;
                result = yield wallet.getHistory();
                break;
            }
            case "retryPendingNow": {
                const wallet = yield wp.promise;
                yield wallet.runPending(true);
                result = {};
                break;
            }
            case "preparePay": {
                const wallet = yield wp.promise;
                result = yield wallet.preparePay(msg.args.url);
                break;
            }
            case "confirmPay": {
                const wallet = yield wp.promise;
                result = yield wallet.confirmPay(msg.args.proposalId, msg.args.sessionId);
                break;
            }
            case "startTunnel": {
                httpLib.useNfcTunnel = true;
                break;
            }
            case "stopTunnel": {
                httpLib.useNfcTunnel = false;
                break;
            }
            case "tunnelResponse": {
                httpLib.handleTunnelResponse(msg.args);
                break;
            }
            case "getWithdrawalInfo": {
                const wallet = yield wp.promise;
                result = yield wallet.getWithdrawalInfo(msg.args.talerWithdrawUri);
                break;
            }
            case "acceptWithdrawal": {
                const wallet = yield wp.promise;
                result = yield wallet.acceptWithdrawal(msg.args.talerWithdrawUri, msg.args.selectedExchange);
                break;
            }
            case "reset": {
                const oldArgs = walletArgs;
                walletArgs = Object.assign({}, oldArgs);
                if (oldArgs && oldArgs.persistentStoragePath) {
                    try {
                        fs.unlinkSync(oldArgs.persistentStoragePath);
                    }
                    catch (e) {
                        console.error("Error while deleting the wallet db:", e);
                    }
                    // Prevent further storage!
                    walletArgs.persistentStoragePath = undefined;
                }
                const wallet = yield wp.promise;
                wallet.stop();
                wp = promiseUtils.openPromise();
                const w = yield helpers$1.getDefaultNodeWallet(walletArgs);
                w.runLoopScheduledRetries().catch((e) => {
                    console.error("Error during wallet retry loop", e);
                });
                wp.resolve(w);
                result = {};
                break;
            }
            default:
                console.error(`operation "${operation}" not understood`);
                return;
        }
        const respMsg = { result, id, operation, type: "response" };
        sendMessage(JSON.stringify(respMsg));
    });
    // @ts-ignore
    globalThis.__akono_onMessage = onMessage;
    console.log("android wallet listener installed");
}
exports.installAndroidWalletListener = installAndroidWalletListener;

});

var index = unwrapExports(android);
var android_1 = android.AndroidHttpLib;
var android_2 = android.installAndroidWalletListener;

exports.AndroidHttpLib = android_1;
exports.default = index;
exports.installAndroidWalletListener = android_2;
