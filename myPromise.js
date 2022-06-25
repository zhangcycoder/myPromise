// 定义状态常量
const PENDING = 'PENDING',
    FULEILLED = 'FULEILLED',
    REJECTED = 'REJECTED';
//resolvePromise方法PromiseA+实现 根据详细请看2.3: The Promise Resolution Procedure
function resolvePromise(promise2, x, resolve, reject) {
    // 所有的逻辑都交给resolvePromise来处理
    // If promise and x refer to the same object, reject promise with a TypeError as the reason.
    if (promise2 === x) {
        return reject(new TypeError('Chaining cycle detected for promise #<MyPromise>'))
    }
    let called = false;
    //判断是否是一个promise
    if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
        try {
            let then = x.then;
            if (typeof then === 'function') {
                // If then is a function, call it with x as this, first argument resolvePromise, and second argument rejectPromise
                then.call(x, (y) => {
                    if (called) return
                    called = true;
                    //If/when resolvePromise is called with a value y, run [[Resolve]](promise, y).
                    resolvePromise(promise2, y, resolve, reject)//递归调用确保resolve内嵌套传入Promise
                }, (r) => {
                    if (called) return
                    called = true;
                    // If/when rejectPromise is called with a reason r, reject promise with r.
                    reject(r)
                })
            } else {
                if (called) return
                called = true;
                resolve(x)
            }
        } catch (e) {
            if (called) return
            called = true;
            reject(e)
        }
    } else {
        resolve(x)
    }
}
function isPromise(x) {
    if ((x && typeof x === 'object') || typeof x === 'function') {
        let then = x.then;
        return typeof then === 'function'
    }
    return false
}
// 是否是可迭代对象
function isIerable(value) {
    return value !== null && value !== undefined && typeof value[Symbol.iterator] === 'function'
}
class MyPromise {
    constructor(executor) {
        //定义初始状态及返回值
        this.status = PENDING;
        this.value = undefined;
        this.reason = undefined;
        //添加容器收集异步 
        this.onFulfilledCallbacks = [];
        this.onRejectedCallbacks = [];
        // resolve、reject需要在constructor内定义,定义在外部的话相当于定义到了prototype上
        const resolve = (value) => {
            if (value instanceof MyPromise) {
                value.then(resolve, reject)
                return;
            }
            if (this.status === PENDING) {
                this.status = FULEILLED;
                this.value = value;
                this.onFulfilledCallbacks.forEach(fn => fn())//发布
            }
        }
        const reject = (reason) => {
            if (this.status === PENDING) {
                this.status = REJECTED;
                this.reason = reason;
                this.onRejectedCallbacks.forEach(fn => fn())//发布  
            }
        }
        // 捕获执行异常
        try {
            executor(resolve, reject);
        } catch (error) {
            reject(error)
        }
    }
    // x可能是普通值或者promise
    then(onFulfilled, onRejected) {
        onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : value => value;
        onRejected = typeof onRejected === 'function' ? onRejected : reason => { throw reason }
        //链式调用
        let promist2 = new MyPromise((resolve, reject) => {
            if (this.status === FULEILLED) {
                /**PromiseA+  3.1: 
                 * In practice, this requirement ensures that onFulfilled and onRejected execute asynchronously, after the event loop turn in which then is called, and with a fresh stack. This can be implemented with either a “macro-task” mechanism such as setTimeout or setImmediate, or with a “micro-task” mechanism such as MutationObserver or process.nextTick. 
                 */
                setTimeout(() => {
                    try {
                        let x = onFulfilled(this.value);
                        // 判断时promise还是普通值
                        resolvePromise(promist2, x, resolve, reject)
                        //promist2最后需要抛出去但是他的成功或者失败是不知道的所以需要传入进去,同时需要把成功和失败的回调传过去
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            }
            if (this.status === REJECTED) {
                setTimeout(() => {
                    try {
                        let x = onRejected(this.reason);
                        resolvePromise(promist2, x, resolve, reject)
                    } catch (e) {
                        reject(e);
                    }
                }, 0);
            }
            // pendding时订阅
            if (this.status === PENDING) {
                this.onFulfilledCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onFulfilled(this.value);
                            resolvePromise(promist2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0);
                });
                this.onRejectedCallbacks.push(() => {
                    setTimeout(() => {
                        try {
                            let x = onRejected(this.reason);
                            resolvePromise(promist2, x, resolve, reject)
                        } catch (e) {
                            reject(e)
                        }
                    }, 0);
                })
            }
        })
        return promist2;
    }
    // 用then来模拟 catch
    catch(errorCallback) {
        return this.then(null, errorCallback);
    }
    finally(finallyCallback) {
        return this.then((value) => {
            return MyPromise.resolve(finallyCallback()).then(() => value)
        }, (reason) => {
            return MyPromise.resolve(finallyCallback()).then(() => {
                throw reason
            })
        })
    }
    static resolve(value) {
        return new MyPromise((resolve, reject) => {
            resolve(value)
        })
    }
    static reject(value) {
        return new MyPromise((resolve, reject) => {
            reject(value)
        })
    }

    static all(promiseArr) {
        let resArr = [],
            ind = 0;
        function formatResArr(value, index, resolve) {
            resArr[index] = value;
            if (++ind === promiseArr.length) {
                resolve(resArr)
            }
        }
        return new MyPromise((resolve, reject) => {
            promiseArr.map((promise, index) => {
                if (isPromise(promise)) {
                    promise.then(res => {
                        formatResArr(res, index, resolve)
                    }, resolve)
                } else {
                    formatResArr(promise, index, resolve)
                }
            })
        })
    }
    static allSettled(promiseArr) {
        let resArr = [],
            idx = 0;
        if (!isIerable(promiseArr)) {
            throw new TypeError(promiseArr + 'is not iterable (cannot read property Symbol(Symbol.iterator))')
        }
        return new Promise((resolve, reject) => {
            if (!promiseArr.length) {
                resolve([])
            }
            promiseArr.forEach((promise, index) => {
                if (isPromise(promise)) {
                    promise.then((value) => { formatResArr('fulfilled', value, index, resolve) }, (reason) => {
                        formatResArr('rejected', reason, index, resolve)
                    })
                } else {
                    formatResArr('fulfilled', promise, index, value)
                }
            })
        })
        function formatResArr(status, value, index, resolve) {
            switch (status) {
                case 'fulfilled':
                    resArr[index] = {
                        status, value
                    }
                    break;
                case "rejected":
                    resArr[index] = {
                        status, value
                    }
                    break;
                default:
                    break
            }
            if (++idx === promiseArr.length) {
                resolve(resArr)
            }
        }
    }

    static race(promiseArr) {
        return new MyPromise((resolve, reject) => {
            promiseArr.map((promise) => {
                if (isPromise(promise)) {
                    promise.then(resolve, reject);
                } else {
                    resolve(promise)
                }
            })
        })
    }
}

module.exports = MyPromise