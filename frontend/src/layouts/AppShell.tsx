import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../app/AuthProvider'
import SignOutButton from '../components/SignOutButton'
import { pages, type ShellMode } from '../app/pages'
import Drawer from '../components/Drawer'
import Icon from '../components/Icon'
import useProductTheme from '../hooks/useProductTheme'
import usePageTitle from '../hooks/usePageTitle'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import styles from './AppShell.module.css'
export type { ShellMode } from '../app/pages'
type DrawerKind = 'ai' | 'notifications' | 'account'
interface AppShellProps { mode: ShellMode; children?: ReactNode }
export interface ProductOutletContext { backgroundRef: RefObject<HTMLDivElement>; openAi: (prompt: string) => void }
const DRAWER_CONTENT = {
  ai: { icon: 'bot', heading: '对话空间', description: 'AI 对话功能将在后续开放。' },
  notifications: { icon: 'bell', heading: '通知空间', description: '通知功能将在后续开放。' },
  account: { icon: 'user', heading: '尚未登录', description: '账户功能将在后续开放。' },
} as const

export default function AppShell({ mode, children }: AppShellProps) {
  const user = useAuth(state => state.user)
  useProductTheme(mode)
  const location = useLocation()
  const [drawer, setDrawer] = useState<DrawerKind | null>(null)
  const [aiPrompt, setAiPrompt] = useState('')
  const openAi = useCallback((prompt: string) => { setAiPrompt(prompt); setDrawer('ai') }, [])
  const backgroundRef = useRef<HTMLDivElement>(null)
  const handleClose = useCallback(() => setDrawer(null), [])
  const page = pages[mode].find(item => location.pathname.replace(/\/$/, '') === `/${mode}/${item.path}`)
  const title = page?.label ?? '页面不存在'
  const aiTitle = mode === 'advisor' ? 'AI 研究助手' : 'AI 理财助手'
  const drawerTitles = { ai: aiTitle, notifications: '通知中心', account: '账户信息' }
  useEffect(() => { setDrawer(null) }, [location.pathname])
  usePageTitle(title)
  return <>
    <div ref={backgroundRef} className={styles.shell}>
      <a href="#main-content" className={styles['skip-link']}>跳转到主要内容</a>
      <Sidebar mode={mode} onAi={() => setDrawer('ai')} onAccount={() => setDrawer('account')} />
      <div className={styles['main-area']}>
        <Topbar mode={mode} title={title} onNotifications={() => setDrawer('notifications')} onAccount={() => setDrawer('account')} />
        <main id="main-content" tabIndex={-1} className={styles.content}>{children ?? <Outlet context={{ backgroundRef, openAi } satisfies ProductOutletContext} />}</main>
        <footer className={styles.footer}><span>FundPilot · 智能投顾平台</span><span>本系统仅用于演示，不构成投资建议。投资有风险，选择需谨慎。</span></footer>
      </div>
      <button type="button" className={styles['floating-ai']} aria-label="打开 AI 对话" title={aiTitle} onClick={() => setDrawer('ai')}><Icon name="sparkles" /></button>
    </div>
    {drawer && <Drawer title={drawerTitles[drawer]}
      backgroundRef={backgroundRef} onClose={handleClose}
      footer={drawer === 'ai' ? 'AI 内容仅供参考，不构成投资建议。' : undefined}>
      <div className={styles['drawer-empty']}><span className={styles['drawer-empty-icon']}><Icon name={DRAWER_CONTENT[drawer].icon} /></span>
        <h3>{drawer === 'account' ? user?.displayName : DRAWER_CONTENT[drawer].heading}</h3>
        <p>{drawer === 'account' ? `${user?.username ?? ''} · ${user?.role === 'ADVISOR' ? '投顾' : '投资者'}` : DRAWER_CONTENT[drawer].description}</p>
        {drawer === 'ai' && aiPrompt && <p>待分析问题：{aiPrompt}</p>}
        {drawer === 'account' && <SignOutButton />}
      </div>
    </Drawer>}
  </>
}
