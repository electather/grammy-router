import {
    Composer,
    Context,
    Middleware,
    MiddlewareFn,
    MiddlewareObj,
} from './deps.deno.ts'

type RouteMatcher<T extends Context> = (ctx: T) => PropertyKey

export class CustomRouter<C extends Context, RM extends RouteMatcher<C>>
    implements MiddlewareObj<C>
{
    private readonly routeHandlers: Partial<
        Record<ReturnType<RM>, Middleware<C>>
    > = {}

    constructor(private readonly routeMatcher: RM) {
        this.routeMatcher = routeMatcher
    }

    route(route: ReturnType<RM>, ...middleware: Array<Middleware<C>>) {
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
