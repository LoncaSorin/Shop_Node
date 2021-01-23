import Router from 'koa-router';
import productStore from './store';
import { broadcast } from "../utils";

export const router = new Router();

router.get('/', async (ctx) => {
    const response = ctx.response;
    const userId = ctx.state.user._id;

    let ifModifiedSince = ctx.request.headers['if-modified-since'];

    let resp = []
    if (ifModifiedSince) {
        ifModifiedSince = new Date(ifModifiedSince);
    }
    const products = await productStore.find({ userId });
    products.forEach(product => {
        const thisProductModif = new Date(product.lastModified)
        if(!ifModifiedSince || thisProductModif.getTime() > ifModifiedSince.getTime()){
            //console.log(product);
            resp.push(product);
        }
    });
    if(resp.length == 0){
        response.status = 304; // Not modified
    }
    else {
        response.body = resp;
        response.status = 200; // ok
    }
});

router.get('/:id', async (ctx) => {
    const userId = ctx.state.user._id;
    const product = await productStore.findOne({ _id: ctx.params.id });
    const response = ctx.response;
    if (product) {
        if (product.userId === userId) {
            response.body = product;
            response.status = 200; // ok
        } else {
            response.status = 403; // forbidden
        }
    } else {
        response.status = 404; // not found
    }
});

const createProduct = async (ctx, product, response) => {
    try {
        const userId = ctx.state.user._id;
        product.userId = userId;
        response.body = await productStore.insert(product);
        response.status = 201; // created
        broadcast(userId, { type: 'created', payload: product });
    } catch (err) {
        console.log(err);
        response.body = { message: err.message };
        response.status = 400; // bad request
    }
};

router.post('/', async ctx => await createProduct(ctx, ctx.request.body, ctx.response));

router.put('/:id', async (ctx) => {
    const product = ctx.request.body;
    const id = ctx.params.id;
    const productId = product._id;
    const response = ctx.response;
    if (productId && productId !== id) {
        response.body = { message: 'Param id and body _id should be the same' };
        response.status = 400; // bad request
        return;
    }
    if (!productId) {
        await createProduct(ctx, product, response);
    } else {
        const userId = ctx.state.user._id;
        product.userId = userId;
        const productStored = await productStore.findOne({ _id: ctx.params.id });
        console.log(product);
        console.log(productStored);
        if(((productStored.version === product.version) || (productStored.version > product.version)) && product.hasConflicts === false){
            console.log('Conflict!');
            productStored.hasConflicts = true;
            response.body = productStored;
            response.status = 412;
            return;
        }
        const updatedCount = await productStore.update({ _id: id }, product);
        product.hasConflicts = false;
        if (updatedCount === 1) {
            response.body = product;
            response.status = 200; // ok
            broadcast(userId, { type: 'updated', payload: product });
        } else {
            response.body = { message: 'Resource no longer exists' };
            response.status = 405; // method not allowed
        }
    }
});

router.del('/:id', async (ctx) => {
    const userId = ctx.state.user._id;
    const product = await productStore.findOne({ _id: ctx.params.id });
    if (product && userId !== product.userId) {
        ctx.response.status = 403; // forbidden
    } else {
        await noteStore.remove({ _id: ctx.params.id });
        ctx.response.status = 204; // no content
    }
});

router.post('/sync', async (ctx) =>{
    let ok = 0
    const products = ctx.request.body;
    const response = ctx.response;
    let body = [];
    const userId = products[0].userId
    for(const prod of products){
        const product = await productStore.findOne({ _id: prod._id});
        if(product){
            if (product.description !== prod.description || product.price !== prod.price || product.size !== product.size || product.availability !== prod.availability) {
                const updatedCount = await productStore.update({_id: prod._id}, prod);
                if (updatedCount !== 1) {
                    ok = 1
                    response.body = {message: 'Resource no longer exists'};
                    response.status = 405;
                }
                else{
                    console.log("Intra")
                    body[body.length] = prod;
                    body[body.length] = product;
                    //console.log(body)
                    broadcast(userId, {type: 'updated', payload: prod});
                }
            }
        }
        else{
            await createProduct(ctx, product, response);
        }
    }

    console.log(ok)
    if( ok === 0){
        console.log("Body",body)
        response.body = body;
        response.status = 200;
    }
})


router.get('/photo/:nr', async (ctx) => {
    const response = ctx.response;

    let img = {
        "message": [
            "https://images.dog.ceo/breeds/spaniel-japanese/n02085782_313.jpg",
            "https://images.dog.ceo/breeds/clumber/n02101556_3736.jpg",
            "https://images.dog.ceo/breeds/borzoi/n02090622_6851.jpg"
        ],
        "status": "success"
    }
    response.body = img;
    response.status = 200;
});
