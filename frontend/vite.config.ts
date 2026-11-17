import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import type { Plugin, ProxyOptions } from 'vite'

// 端口拆分（Q5/AD-16）：investor :5173、advisor :5174、ta :5175
const SITE_PORTS: Record<string, number> = {
  investor: 5173,
  advisor: 5174,
  ta: 5175,
}

// 各站点默认入口：dev 下访问 "/" 时 rewrite 到本端 html（build 走 rollup 多入口）
const SITE_ENTRIES: Record<string, string> = {
  investor: '/index.html',
  advisor: '/index.advisor.html',
  ta: '/index.ta.html',
}

/** dev 首页 rewrite 插件：保证各端口 "/" 即本端站点入口 */
function siteEntryPlugin(mode: string): Plugin {
  return {
    name: 'site-entry-rewrite',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const path = req.url?.split('?')[0] ?? '/'
        const acceptsHtml = req.headers.accept?.includes('text/html')
        if (req.method === 'GET' && acceptsHtml && !path.startsWith('/api/') && !path.includes('.')) {
          req.url = SITE_ENTRIES[mode] ?? SITE_ENTRIES.investor
        }
        next()
      })
    },
  }
}

// 后端会话 Cookie 名（Tomcat: JSESSIONID；Spring Session Redis: SESSION）
const SESSION_COOKIE_NAMES = ['JSESSIONID', 'SESSION']
const ALL_SITE_SUFFIXES = ['__investor', '__advisor', '__ta']

/**
 * 开发期会话隔离：浏览器 Cookie 按主机名共享、忽略端口，5173 与 5174 同属
 * localhost，登录会互相覆盖 JSESSIONID，导致无法双端同时登录。
 * 这里给本端写出的会话 Cookie 加 `__<site>` 后缀，转发回后端前还原原名，
 * 并丢弃其他端的会话 Cookie；对浏览器表现为各端口独立会话。
 */
function isolateSessionCookie(site: string): Pick<ProxyOptions, 'configure'> {
  const suffix = `__${site}`
  const isSessionName = (name: string) => SESSION_COOKIE_NAMES.includes(name)

  const configure: NonNullable<ProxyOptions['configure']> = (proxy) => {
    // 请求：本端后缀还原为后端认识的原名，丢弃其他端与旧的裸会话 Cookie
    proxy.on('proxyReq', (proxyReq, req) => {
      const raw = req.headers.cookie
      if (!raw) return
      const kept: string[] = []
      for (const part of raw.split(';')) {
        const cookie = part.trim()
        if (!cookie) continue
        const eq = cookie.indexOf('=')
        const name = eq >= 0 ? cookie.slice(0, eq) : cookie
        if (name.endsWith(suffix)) {
          kept.push(name.slice(0, -suffix.length) + cookie.slice(eq))
        } else if (ALL_SITE_SUFFIXES.some((other) => name.endsWith(other))) {
          continue
        } else if (isSessionName(name)) {
          continue
        } else {
          kept.push(cookie)
        }
      }
      proxyReq.setHeader('cookie', kept.join('; '))
    })

    // 响应：本端会话 Cookie 加后缀，避免与其他端同名覆盖
    proxy.on('proxyRes', (proxyRes) => {
      const setCookie = proxyRes.headers['set-cookie']
      if (!setCookie) return
      proxyRes.headers['set-cookie'] = setCookie.map((cookie) => {
        const eq = cookie.indexOf('=')
        const name = eq >= 0 ? cookie.slice(0, eq) : cookie
        return isSessionName(name) ? name + suffix + cookie.slice(eq) : cookie
      })
    })
  }

  return { configure }
}

export default defineConfig(({ mode }) => ({
  // Three dev servers must not concurrently replace one shared dependency cache.
  cacheDir: `node_modules/.vite/${mode}`,
  resolve: { dedupe: ['react', 'react-dom'] },
  plugins: [react(), siteEntryPlugin(mode)],
  server: {
    port: SITE_PORTS[mode] ?? SITE_PORTS.investor,
    // output/ 存放验收产物（含被占用的 jar 等），监听会抛 EBUSY 直接终止 dev server
    watch: { ignored: ['**/output/**'] },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        ...isolateSessionCookie(mode),
      },
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        advisor: 'index.advisor.html',
        ta: 'index.ta.html',
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
  },
}))
