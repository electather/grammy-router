import {
    Composer,
    Context,
    Middleware,
    MiddlewareFn,
    MiddlewareObj,
} from './deps.deno.ts'

type RouteMatcher<T> = (ctx: T) => PropertyKey

export class CustomRouter<C extends Context> implements MiddlewareObj<C> {
    private readonly routeHandlers: Partial<
        Record<ReturnType<typeof this.routeMatcher>, Middleware<C>>
    > = {}

    constructor(private readonly routeMatcher: RouteMatcher<C>) {
        this.routeMatcher = routeMatcher
    }

    route(
        route: ReturnType<typeof this.routeMatcher>,
        ...middleware: Array<Middleware<C>>
    ) {
        const composer = new Composer(...middleware)
        this.routeHandlers[route] = composer
        return composer
    }

    middleware(): MiddlewareFn<C> {
        return new Composer<C>()
            .route(ctx => this.routeMatcher(ctx), this.routeHandlers as any)
            .middleware()
    }
}
