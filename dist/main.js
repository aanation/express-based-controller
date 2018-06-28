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
    buildValidationMiddleware(schema) {
        return (req, res, next) => {
            const error = schema.validate(req).error;
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
            Promise
                .resolve(accessControl(req))
                .then((result) => resolveMiddleware(result))
                .catch((err) => next(err));
        };
    }
    buildExpressErrorHandler(onError) {
        return (err, req, res, next) => {
            const result = onError(err, req, res);
            Promise
                .resolve(result)
                .then((errorHandler) => {
                if (!errorHandler) {
                    return;
                }
                res.json(errorHandler);
            })
                .catch((err) => next(err));
        };
    }
    buildActionMiddleware(handler) {
        return (req, res, next) => {
            const result = handler.call(this, req, res);
            Promise
                .resolve(result)
                .then((actionResult) => {
                if (!actionResult) {
                    return;
                }
                res.json(actionResult);
            })
                .catch((err) => {
                next(err);
            });
        };
    }
    compileActions() {
        const emptyMiddleware = (req, res, next) => { next(); };
        const emptyErrorHandler = (err, req, res, next) => { next(err); };
        const globalMiddlewares = this.middlewares || [];
        const globalValidator = this.validator
            ? this.buildValidationMiddleware(this.validator)
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
                ? this.buildValidationMiddleware(action.validator)
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
            compiledActions[actionName] = resultMiddleware;
        });
        return compiledActions;
    }
}
exports.Controller = Controller;
//# sourceMappingURL=main.js.map