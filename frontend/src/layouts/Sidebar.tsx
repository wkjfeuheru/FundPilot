import { NavLink } from 'react-router-dom'
import { pages, type ShellMode } from '../app/pages'
import Brand from '../components/Brand'
import Icon from '../components/Icon'
import styles from './AppShell.module.css'
import { useAuth } from '../app/AuthProvider'
interface SidebarProps { mode: ShellMode; onAi: () => void; onAccount: () => void }
export default function Sidebar({ mode, onAi, onAccount }: SidebarProps) {
  const user = useAuth(state => state.user)
  const advisor = mode === 'advisor'
  const group = advisor ? '投顾业务' : '我的财富'
  return <aside className={styles.sidebar} data-product-sidebar>
    <div className={styles.brand}><Brand advisor={advisor} /></div>
    <nav className={styles.nav} aria-label={group}>
      <div className={styles.group}>{group}</div>
      {pages[mode].map(page => <NavLink key={page.path} to={`/${mode}/${page.path}`} end
        title={page.label} aria-label={page.label}
        className={({ isActive }) => `${styles['nav-link']} ${isActive ? styles.active : ''}`}>
        <Icon name={page.icon} /><span className={styles['nav-label']}>{page.label}</span>
      </NavLink>)}
    </nav>
    <div className={styles['sidebar-bottom']}>
      <div className={styles['ai-card']}>
        <div className={styles['ai-card-title']}><Icon name="sparkles" />{advisor ? '投顾 Copilot' : 'AI 理财助手'}</div>
        <p>{advisor ? '您的智能研究伙伴' : '让财富管理更简单'}</p>
        <button type="button" onClick={onAi}>开启 AI 对话<Icon name="arrow" /></button>
      </div>
      <button className={styles.account} type="button" onClick={onAccount} aria-label="打开账户" title="打开账户">
        <span className={styles['account-avatar']}><Icon name="user" /></span>
        <span className={styles['account-text']}><strong>{user?.displayName}</strong><small>{advisor ? '投顾账户' : '投资者账户'}</small></span>
        <span className={styles['account-chevron']}><Icon name="chevron" /></span>
      </button>
    </div>
  </aside>
}
