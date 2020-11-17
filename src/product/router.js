import Router from 'koa-router';
import productStore from './store';
import { broadcast } from "../utils";

export const router = new Router();

router.get('/', async (ctx) => {
    const response = ctx.response;
    const userId = ctx.state.user._id;
    response.body = await productStore.find({ userId });
    response.status = 200; // ok
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
        const updatedCount = await productStore.update({ _id: id }, product);
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
