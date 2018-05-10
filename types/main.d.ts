/// <reference types="express" />
import { Schema as JoiSchema, ValidationError as JoiValidationError } from 'joi';
import { Request as ExpressRequest, Response as ExpressResponse, Handler as ExpressHandler } from 'express';
export declare type ErrorHandler = (err: any, req: ExpressRequest, res: ExpressResponse) => any;
export declare type ActionHandler = (req: ExpressRequest, res: ExpressResponse) => any;
export declare type AccessControlFunc = (req: ExpressRequest) => boolean | Promise<boolean>;
export interface ControllerAction {
    accessControl?: AccessControlFunc;
    validator?: JoiSchema;
    middlewares?: ExpressHandler[];
    handler: ActionHandler;
    onError?: ErrorHandler;
}
export interface ActionDecoratorParams {
    accessControl?: AccessControlFunc;
    validator?: JoiSchema;
    middlewares?: ExpressHandler[];
    onError?: ErrorHandler;
}
export declare function action(params?: ActionDecoratorParams): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
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
export declare class Controller implements ExpressBasedController {
    actions: Actions;
    validator?: JoiSchema;
    accessControl?: AccessControlFunc;
    middlewares?: ExpressHandler[];
    onError?: ErrorHandler;
    joiValidationFormatter(error: JoiValidationError): any;
    accessControlException(): any;
    private buildValudationMiddleware(schema);
    private buildAccessControlMiddleware(accessControl);
    private buildExpressErrorHandler(onError);
    private buildActionMiddleware(handler);
    compileActions(): CompiledActions;
}
