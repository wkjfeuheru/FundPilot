import type { ShellMode } from '../app/pages'
import Icon from '../components/Icon'
import styles from './AppShell.module.css'
interface TopbarProps { mode: ShellMode; title: string; onNotifications: () => void; onAccount: () => void }
export default function Topbar({ mode, title, onNotifications, onAccount }: TopbarProps) {
  return <header className={styles.topbar}>
    <div className={styles.breadcrumb}><span className={styles['breadcrumb-parent']}>{mode === 'advisor' ? '投顾业务平台' : '财富管理中心'}<Icon name="chevron" /></span><span aria-current="page">{title}</span></div>
    <div className={styles['topbar-actions']}>
      <span className={styles['demo-badge']}>演示环境 · 非真实交易</span>
      <span className={styles['business-date']} title="业务日期待接入">业务日期 <strong>—</strong></span>
      <button className={styles['icon-button']} type="button" onClick={onNotifications} aria-label="打开通知" title="通知中心"><Icon name="bell" /></button>
      <button className={styles['avatar-button']} type="button" onClick={onAccount} aria-label="账户信息" title="账户信息"><Icon name="user" /></button>
    </div>
  </header>
}
