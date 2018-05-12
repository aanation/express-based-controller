# Express based controller

> **Unstable! Don't use it in production!**

It's a simple class for writting your ExpressJS controllers in the OOP-style. 

## Usage example 

### Javascript  

```javascript
const { Controller } = require('express-based-controller'); 

const keys = [
    's3Alvx3JJsP',
    '22AzxlevFs2',
    'S2fs33kAj3l'
];

class MyConstroller extends Controller {
    constructor() {
        super(); 
        this.actions = {};
        this.actions.sayHello = {};
        this.actions.sayHello.middlewares = [
            (req, res, next) => {
                req.message = req.query.name;
                req.accessKey = req.query.key; 
                next(); 
            }
        ]; 

        this.actions.sayHello.accessControl = (req) => {
            return keys.includes(req.accessKey); 
        }; 

        // if you return object, it will be passed in res.json
        // if you return string|number|boolean, ot will be passed in res.end
        this.actions.sayHello.handler = (req, res) => {
            return {
                message: `Hello, ${req.message}!`
            };
        }; 
        this.actions.sayHello.onError = (err, req, res) => {
            return {
                errors: true,
                message: err.message
            }; 
        }; 
    }
};

const myController = new MyController(); 

const actions = myController.compileActions(); 

// express app instance 
const { app } = require('../app.js');
app.get('/hello', actions.sayHello);

```

### Typescript


```typescript
import { Controller, action } from 'express-based-controller';
import { app } from '../app.ts';

const keys = [
    's3Alvx3JJsP',
    '22AzxlevFs2',
    'S2fs33kAj3l'
];

function ExtractQuery(req, res, next) {
    req.message = req.query.name;
    req.accessKey = req.query.key; 
    next(); 
}

export class MyController extends Controller {
    // You can use action method decorator
    @action({
        middlewares: [ExtractQuery], 
        accessControl: (req) => keys.includes(req.accessKey),
        onError: (err, res, res) => {
            return {
                errors: true,
                message: err.message
            }; 
        }

    })
    async sayHello(req, res) {
        return {
            message: `Hello, ${req.message}!`
        };
    }
}; 

const myController = new MyController(); 

const actions = myController.compileActions(); 
app.get('/hello', actions.sayHello);
```

## Global Middlewares 

You can use global middlewares, access control functions and error handlers:

```typescript
    import auth  from '../middlewares/auth';
    import { Controller, action } from 'express-based-controller'; 

    const keys = [
        's3Alvx3JJsP',
        '22AzxlevFs2',
        'S2fs33kAj3l'
    ];


const checkKeys = req => keys.includes(req.key); 

    class SomeController extends Controller {
        public middleware = [auth];
        public accessControl = checkKeys;
        public onError = (err, req, res) => {
            return {
                errors: true, 
                message: err.message
            }; 
        }; 

        @action()
        sayHello(req, res, next) {
            return {
                message: `hello, ${req.query.name || 'anonymous'}!`
            }; 
        }, 

        @action() 
        sayBye(req, res, next) {
            return {
                message: `bye, ${req.query.name || 'anonymous'}!`
            }
        }

    }
```

After compilation **auth**, **accessControl** and **onError** will be called with every action (sayHello, sayBye). 

## Joi-validator

If you set the validator, req.body will be validated by Joi-schema:

local: 
```typescript
import { authenticate } from '../auth'; 
import { Controller } from 'express-based-controller';
 
class SomeController extends Controller {
    @action({
        validator: Joi.object().keys({
            username: Joi.string().required(),
            password: Joi.string().required()
        }), 
        onError: (err, req, res) => {
            return {
                errors: true,
                message: err.message
            }; 
        }
    })
    async authenticate(req, res) {
        if (authenticate(req.body)) {
            return {
                message: `Hello, ${req.body.username}!`
            }
        } else {
            throw new Error('Wrong credentials!');
        }
    }
}
```

global:

```typescript
import { Controller } from 'express-based-controller';
 
class SomeController extends Controller {
    public validator = Joi.object().keys({
        message: Joi.string().required()
    }), 
    @action()
    sayHello(req, res, next) {
        return {
            message: `hello, ${req.body.message}`
        }; 
    }, 
}
```

## Wrapping Exceptions

By default, Joi-validator throw's native Joi *ValidationError*:

```typescript
export interface JoiObject {
    isJoi: boolean;
}

export interface ValidationError extends Error, JoiObject {
    details: ValidationErrorItem[];
    annotate(): string;
    _object: any;
}
```

But, you can override **joiValidationFormatter** method:

```typescript
import { ValidationError as JoiValidationError } from 'joi';

class SomeController extends Controller {
    public joiValidationFormatter(error: JoiValidationError) :any {
        error.name = "Request Validation Error!";
        return error; 
    }
}
```

Also, you can change access control error:

```typescript
import { ValidationError as JoiValidationError } from 'joi';
class SomeController extends Controller {
    public joiValidationFormatter(error: JoiValidationError) :any {
        error.name = "Request Validation Error!";
        return error; 
    }, 
    public accessControlException() :any {
        const error =  new Error('Access denied!');
        error.name = 'Access Error'; 
        return error; 
    }
}

```


## Compilation

**compileActions** public method compiles's your actions, middlewares and access controll functions to a simple object, that has some middleware properties

For example:

```typescript 
import * as express from 'exoress';
import auth  from '../middlewares/auth';
import { Controller, action } from 'express-based-controller'; 

const keys = [
    's3Alvx3JJsP',
    '22AzxlevFs2',
    'S2fs33kAj3l'
];

class SomeController extends Controller {
    public middlewares = [auth];

    @action()
    sayHello(req, res, next) {
        return {
            message: `hello, ${req.query.name || 'anonymous'}!`
        }; 
    }, 

    @action() 
    sayBye(req, res, next) {
        return {
            message: `bye, ${req.query.name || 'anonymous'}!`
        }
    }
} 

const compiledActions = new SomeController().compileActions(); 

const app = express();
app.listen(3000); 

app.get('/hello', compiledActions.hello);
app.get('/bye', compiledActions.bye);
```

Order of middlewares into action after compilation:

1. global middlewares
2. action middlewares
3. global access control func
4. action access control func
5. global request joi-validator,
6. action request joi-validator, 
7. main action handler,
8. action error handler,
9. global error handler


## Inheritance

```typescript 
import { authenticate } from '../auth'; 
import { Controller } from 'express-based-controller';

class AuthController extends Controller {
    public middlewares = [authenticate];
    public onError = (err, req, res, next) => {
        return {
            message: err.message
        }; 
    }
}

class SomeController extends AuthController {
    @action()
    sayHello(req, res, next) {
        return {
            message: `hello, ${req.query.name || 'anonymous'}!`
        }; 
    }, 
}
```

add middlewares:

```typescript
import { authenticate } from '../auth'; 
import { Controller } from 'express-based-controller';

class AuthController extends Controller {
    public middlewares = [authenticate];
    public onError = (err, req, res, next) => {
        return {
            message: err.message
        }; 
    }
}

class SomeController extends AuthController {
    constructor() {
        super();
        this.middlewares.push((req, res, next) => {
            debug(req);
            next(); 
        });
    }

    @action()
    sayHello(req, res, next) {
        return {
            message: `hello, ${req.query.name || 'anonymous'}!`
        }; 
    }, 
}
```















