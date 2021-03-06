import { compose } from 'compose-middleware';
import { Schema as JoiSchema, ValidationError as JoiValidationError } from 'joi'; 
import { Request as ExpressRequest, 
         Response as ExpressResponse, 
         Handler as ExpressHandler,
         ErrorRequestHandler as ExpressErrorHandler,
         NextFunction } from 'express';

export type ErrorHandler = (err: any, req: ExpressRequest, res: ExpressResponse) => any;
export type ActionHandler = (req: ExpressRequest, res: ExpressResponse) => any;
export type AccessControlFunc = (req: ExpressRequest) => boolean|Promise<boolean>;

export interface ControllerAction {
  // проверка доступа, вызывается сразу после валидатора 
  accessControl?: AccessControlFunc;
  // джои схема для валидации запроса запроса
  validator?: JoiSchema; 
  // массив произвольных мидлвар, выполняющихся до основного экшена
  middlewares?: ExpressHandler[]; 
  // собственно сам обработчик. Представляет собой обычную функцию 
  // получающую req, res экспресса и возвращающую промис
  // если резолвится объект - к нему автоматически применяется res.json()
  handler: ActionHandler; 
  onError?: ErrorHandler; 
}

export interface ActionDecoratorParams {
  accessControl?: AccessControlFunc;
  validator?: JoiSchema; 
  middlewares?: ExpressHandler[]; 
  onError?: ErrorHandler; 
} 

// декоратор экшена
export function action(params?: ActionDecoratorParams) {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {    
    if (!target.actions) {
      target.actions = {}; 
    }
    target.actions[propertyKey] = Object.assign({ handler: descriptor.value }, params || {});
  };
}

export interface Actions {
  [key: string]: ControllerAction;
}

export interface CompiledActions {
  [key: string]: ExpressHandler;
}

export interface ExpressBasedController {
  actions: Actions;
  joiValidationFormatter: (error: JoiValidationError) => any;
  accessControl?: AccessControlFunc;
  validator?: JoiSchema;
  middlewares?: ExpressHandler[];
  onError?: ErrorHandler; 
  compileActions: () => any;
}

export class Controller implements ExpressBasedController {
  public actions: Actions;
  public validator?: JoiSchema;
  public accessControl?: AccessControlFunc;
  public middlewares?: ExpressHandler[] = [];
  public onError?: ErrorHandler; 

  public joiValidationFormatter(error: JoiValidationError) :any {
    return error;
  }

  public accessControlException() :any {
    return new Error('Access denied!'); 
  }

  private buildValidationMiddleware(schema: JoiSchema) :ExpressHandler {
    return (req, res, next) => {
      const error :JoiValidationError = schema.validate(req).error;
      if (error) {
        next(this.joiValidationFormatter(error)); 
      } else {
        next(); 
      }
    };
  }

  private buildAccessControlMiddleware(accessControl: AccessControlFunc) :ExpressHandler {
    return (req, res, next) => {
      const resolveMiddleware = (result: boolean) => {
        if (result) {
          next(); 
        } else {
          next(this.accessControlException()); 
        }
      }; 

      Promise
        .resolve(accessControl(req))
        .then((result: any) => resolveMiddleware(result))
        .catch((err: any) => next(err));
    }; 
  }

  private buildExpressErrorHandler(onError: ErrorHandler) :ExpressErrorHandler {
    return (err, req, res, next) => {
      const result = onError(err, req, res); 

      Promise
        .resolve(result)
        .then((errorHandler: any) => {
          if (!errorHandler) { return; }
          res.json(errorHandler);
        })
        .catch((err: any) => next(err));
    }; 
  }

  private buildActionMiddleware(handler: ActionHandler) :ExpressHandler {
    return (req, res, next) => {
      const result = handler.call(this, req, res);

      Promise
        .resolve(result)
        .then((actionResult: any) => {
          if (!actionResult) { return; }
          res.json(actionResult);
        })
        .catch((err: any) => {
          next(err);
        }); 
    };
  }

  // возвращает объект ключами которого являются названия экшенов, 
  // а значениями - скомпилированные мидлвары-экспресса 

  public compileActions() {
    const emptyMiddleware: ExpressHandler = (req, res, next) => { next(); }; 
    const emptyErrorHandler: ExpressErrorHandler = (err, req, res, next) => { next(err); };

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

    const compiledActions: CompiledActions = {}; 

    Object.getOwnPropertyNames(this.actions).forEach((actionName: string) => {
      const action: ControllerAction = this.actions[actionName];
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


      const resultMiddleware = compose<ExpressRequest, ExpressResponse, any>([
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
