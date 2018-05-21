"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const compose_middleware_1 = require("compose-middleware");
function action(params) {
    return (target, propertyKey, descriptor) => {
        if (!target.actions) {
            target.actions = {};
        }
        target.actions[propertyKey] = Object.assign({ handler: descriptor.value }, params || {});
    };
}
exports.action = action;
class Controller {
    constructor() {
        this.middlewares = [];
    }
    joiValidationFormatter(error) {
        return error;
    }
    accessControlException() {
        return new Error('Access denied!');
    }
    buildValudationMiddleware(schema) {
        return (req, res, next) => {
            const error = schema.validate(req.body).error;
            if (error) {
                next(this.joiValidationFormatter(error));
            }
            else {
                next();
            }
        };
    }
    buildAccessControlMiddleware(accessControl) {
        return (req, res, next) => {
            const resolveMiddleware = (result) => {
                if (result) {
                    next();
                }
                else {
                    next(this.accessControlException());
                }
            };
            const result = accessControl(req);
            if (typeof result === 'boolean') {
                resolveMiddleware(result);
            }
            else if (result instanceof Promise) {
                result
                    .then((accessControlResult) => {
                    resolveMiddleware(accessControlResult);
                })
                    .catch((err) => {
                    next(err);
                });
            }
        };
    }
    buildExpressErrorHandler(onError) {
        return (err, req, res, next) => {
            const result = onError(err, req, res);
            if (result instanceof Promise) {
                result
                    .then((errorHandlerResult) => {
                    if (errorHandlerResult && typeof errorHandlerResult === 'object') {
                        res.json(errorHandlerResult);
                    }
                    else if (errorHandlerResult) {
                        res.end(errorHandlerResult);
                    }
                })
                    .catch((err) => {
                    next(err);
                });
            }
            else if (result && typeof result === 'object') {
                res.json(result);
            }
            else if (result) {
                res.end(result);
            }
        };
    }
    buildActionMiddleware(handler) {
        return (req, res, next) => {
            const result = handler(req, res);
            if (result instanceof Promise) {
                result
                    .then((actionResult) => {
                    if (actionResult && typeof actionResult === 'object') {
                        res.json(actionResult);
                    }
                    else if (actionResult) {
                        res.end(actionResult);
                    }
                })
                    .catch((err) => {
                    next(err);
                });
            }
            else if (result && typeof result === 'object') {
                res.json(result);
            }
            else if (result) {
                res.end(result);
            }
        };
    }
    compileActions() {
        const emptyMiddleware = (req, res, next) => { next(); };
        const emptyErrorHandler = (err, req, res, next) => { next(err); };
        const globalMiddlewares = this.middlewares || [];
        const globalValidator = this.validator
            ? this.buildValudationMiddleware(this.validator)
            : emptyMiddleware;
        const globalAccessControl = this.accessControl
            ? this.buildAccessControlMiddleware(this.accessControl)
            : emptyMiddleware;
        const globalErrorHandler = this.onError
            ? this.buildExpressErrorHandler(this.onError)
            : emptyErrorHandler;
        const compiledActions = {};
        Object.getOwnPropertyNames(this.actions).forEach((actionName) => {
            const action = this.actions[actionName];
            const middlewares = action.middlewares || [];
            const validator = action.validator
                ? this.buildValudationMiddleware(action.validator)
                : emptyMiddleware;
            const accessControl = action.accessControl
                ? this.buildAccessControlMiddleware(action.accessControl)
                : emptyMiddleware;
            const errorHandler = action.onError
                ? this.buildExpressErrorHandler(action.onError)
                : emptyErrorHandler;
            const actionHandler = action.handler
                ? this.buildActionMiddleware(action.handler)
                : emptyMiddleware;
            const resultMiddleware = compose_middleware_1.compose([
                ...globalMiddlewares,
                ...middlewares,
                globalAccessControl,
                accessControl,
                globalValidator,
                validator,
                actionHandler,
                errorHandler,
                globalErrorHandler
            ]);
            compiledActions[actionName] = resultMiddleware.bind(this);
        });
        return compiledActions;
    }
}
exports.Controller = Controller;
//# sourceMappingURL=main.js.map