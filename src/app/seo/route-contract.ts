import type { FileRoutesByTo } from '../routeTree.gen'
import type { PagePath } from './metadata'

type AssertNever<T extends never> = T
/** Adding/removing a router destination requires a matching metadata entry. */
export type RoutesMissingMetadata = AssertNever<Exclude<keyof FileRoutesByTo, PagePath>>
export type MetadataMissingRoutes = AssertNever<Exclude<PagePath, keyof FileRoutesByTo>>
