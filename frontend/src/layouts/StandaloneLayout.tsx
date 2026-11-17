import { Outlet } from 'react-router-dom'
import Brand from '../components/Brand'
import styles from './StandaloneLayout.module.css'

export default function StandaloneLayout() {
  return <div className={styles.layout}>
    <header className={styles.header}><Brand /></header>
    <div className={styles.notice}>演示环境 · 非真实交易</div>
    <main className={styles.main}><Outlet /></main>
    <footer className={styles.footer}>FundPilot · 本系统仅用于演示，不构成投资建议。</footer>
  </div>
}
