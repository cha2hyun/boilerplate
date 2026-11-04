import { createRef, type ReactElement } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance } from 'i18next'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it, vi } from 'vitest'
import { resources } from '@/shared/lib/i18n/resources'
import { RouterTextLink, TextLink } from './text-link'

async function renderLocalized(ui: ReactElement, locale: 'en-US' | 'ko-KR' = 'en-US') {
  const instance = createInstance()
  await instance.init({ resources, lng: locale, initAsync: false })
  return render(<I18nextProvider i18n={instance}>{ui}</I18nextProvider>)
}

async function renderRouterLinks() {
  const rootRoute = createRootRoute({ component: Outlet })
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <>
        <RouterTextLink to="/projects">Open projects</RouterTextLink>
        <RouterTextLink to="/projects" target="_blank">
          Projects in a new tab
        </RouterTextLink>
        <RouterTextLink to="/projects" disabled data-testid="disabled-projects">
          Unavailable projects
        </RouterTextLink>
      </>
    ),
  })
  const projectsRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/projects',
    component: () => <h1>Projects destination</h1>,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([indexRoute, projectsRoute]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
    defaultPreload: false,
  })
  await act(async () => {
    await router.load()
  })
  await renderLocalized(<RouterProvider router={router} />)
  return router
}

describe('TextLink', () => {
  it.each([
    ['en-US', 'Opens in a new tab'],
    ['ko-KR', '새 탭에서 열림'],
  ] as const)(
    'preserves anchor props and adds a localized description despite aria-label in %s',
    async (locale, newTabDescription) => {
      const ref = createRef<HTMLAnchorElement>()
      await renderLocalized(
        <>
          <p id="source-description">Project source code.</p>
          <TextLink
            href="https://github.com/cha2hyun/boilerplate"
            target="_self"
            rel="nofollow opener"
            ref={ref}
            title="Repository"
            aria-label="Source repository"
            aria-describedby="source-description"
            data-source="github"
          >
            GitHub
          </TextLink>
        </>,
        locale,
      )
      const link = screen.getByRole('link', { name: 'Source repository' })

      expect(link.tagName).toBe('A')
      expect(ref.current).toBe(link)
      expect(link).toHaveAttribute('href', 'https://github.com/cha2hyun/boilerplate')
      expect(link).toHaveAttribute('target', '_blank')
      expect(link).toHaveAttribute('title', 'Repository')
      expect(link).toHaveAttribute('data-source', 'github')
      expect(link).toHaveAccessibleDescription(`Project source code. ${newTabDescription}`)
      expect(link.getAttribute('rel')?.split(/\s+/)).toEqual(
        expect.arrayContaining(['nofollow', 'noopener', 'noreferrer']),
      )
      expect(link.getAttribute('rel')?.split(/\s+/)).not.toContain('opener')
    },
  )

  it.each([
    { href: 'javascript:alert(1)', disabled: false },
    { href: 'https://github.com/cha2hyun/boilerplate', disabled: true },
  ])('blocks native and caller click behavior when unavailable: %j', async (props) => {
    const onClick = vi.fn()
    await renderLocalized(
      <TextLink {...props} target="_blank" onClick={onClick} data-testid="unavailable-link">
        Unavailable destination
      </TextLink>,
    )
    const link = screen.getByTestId('unavailable-link')

    expect(link).not.toHaveAttribute('href')
    expect(link).not.toHaveAttribute('target')
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(link).toHaveAttribute('tabindex', '-1')
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(fireEvent.click(link)).toBe(false)
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('RouterTextLink', () => {
  it('navigates to an internal route through the actual router on a normal click', async () => {
    const router = await renderRouterLinks()

    await userEvent.click(screen.getByRole('link', { name: 'Open projects' }))

    expect(await screen.findByRole('heading', { name: 'Projects destination' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/projects')
  })

  it('leaves an explicit new-tab click to the browser without navigating the current route', async () => {
    const router = await renderRouterLinks()
    const navigate = vi.spyOn(router, 'navigate')
    const link = screen.getByRole('link', { name: 'Projects in a new tab' })

    expect(link).toHaveAttribute('target', '_blank')
    expect(fireEvent.click(link, { button: 0 })).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/')
  })

  it('does not invoke router navigation for a disabled link', async () => {
    const router = await renderRouterLinks()
    const navigate = vi.spyOn(router, 'navigate')
    const link = screen.getByTestId('disabled-projects')

    expect(link).not.toHaveAttribute('href')
    expect(link).toHaveAttribute('aria-disabled', 'true')
    expect(fireEvent.click(link, { button: 0 })).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/')
  })
})
