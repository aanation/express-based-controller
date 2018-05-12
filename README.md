# Express based controller

> **Unstable! Don't use it in production!**

It's a simple class for writting your ExpressJS controllers in the OOP-style. 

## Usage example 


1. JS  

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
        // if you returb string|number|boolean, ot will be passed in res.end
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

// exoress app instance 
const { app } = require('../app.js');
app.get('/hello', actions.sayHello);

```

2. Typescript


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
    // You can use action method decorator in typescript 
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
    sayHello(req, res) {
        return {
            message: `Hello, ${req.message}!`
        };
    }
}; 

const myController = new MyController(); 

const actions = myController.compileActions(); 
app.get('/hello', actions.sayHello);
```





