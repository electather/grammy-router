import {
    Composer,
    Context,
    Middleware,
    MiddlewareFn,
    MiddlewareObj,
} from './deps.deno.ts'

type MaybePromise<T> = T | Promise<T>

/**
 * A router lets you specify a number of middlewares, each of them identified by
 * a key. You can then pass a routing function that decides based on the context
 * which middleware to choose by returning one of the keys.
 *
 * ```ts
 * const router = new Router(ctx => {
 *   // determine route to pick here
 *   return 'key'
 * })
 *
 * router.route('key',       ctx => { ... })
 * router.route('other-key', ctx => { ... })
 * router.route(42,          ctx => { ... }) // numbers and symbols work
 * router.otherwise(ctx => { ... }) // called if no route matches
 *
 * bot.use(router)
 * ```
 *
 * If you use a [custom context
 * type](https://grammy.dev/guide/context.html#customizing-the-context-object)
 * for your bot, you need to pass it when constructing the `Router` instance,
 * too.
 *
 * ```ts
 * const router = new Router<MyContext>(ctx => { ... })
 * ```
 */
export class Router<C extends Context> implements MiddlewareObj<C> {
    public routeHandlers: Record<PropertyKey, Middleware<C>>
    private otherwiseHandler: Composer<C> | undefined

    /**
     * Constructs a router with a routing function and optionally some
     * preinstalled middlewares. Note that you can always install more
     * middleware on the router by calling `route`.
     *
     * @param router A routing function that decides which middleware to run
     * @param routeHandlers A number of middlewares
     */
    constructor(
        private readonly router: (
            ctx: C
        ) => MaybePromise<PropertyKey | undefined>,
        routeHandlers:
            | Record<PropertyKey, Middleware<C>>
            | Map<PropertyKey, Middleware<C>> = {}
    ) {
        this.routeHandlers =
            routeHandlers instanceof Map
                ? Object.fromEntries(routeHandlers.entries())
                : { ...routeHandlers }
    }

    /**
     * Registers new middleware for a given route. The intially supplied routing
     * function may return this route to select the respective middleware for
     * execution for an incoming update.
     *
     * @param route The route for which to register the middleware
     * @param middleware The middleware to register
     */
    route(
        route: NonNullable<Awaited<ReturnType<typeof this.router>>>,
        ...middleware: Array<Middleware<C>>
    ) {
        const composer = new Composer(...middleware)
        this.routeHandlers[route] = composer
        return composer
    }

    /**
     * Allows to register middleware that is executed when no route matches, or
     * when the routing function returns `undefined`. If this method is not
     * called, then the router will simply pass through all requests to the
     * downstream middleware.
     *
     * @param middleware Middleware to run if no route matches
     */
    otherwise(...middleware: Array<Middleware<C>>) {
        return (this.otherwiseHandler = new Composer(...middleware))
    }

    middleware(): MiddlewareFn<C> {
        return new Composer<C>()
            .route(
                ctx => this.router(ctx),
                this.routeHandlers,
                this.otherwiseHandler
            )
            .middleware()
    }
}
