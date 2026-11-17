import { Link } from 'react-router-dom'
import usePageTitle from '../hooks/usePageTitle'
import styles from './NotFoundPage.module.css'
interface NotFoundPageProps { home?: string }
export default function NotFoundPage({ home = '/' }: NotFoundPageProps) {
  usePageTitle('页面不存在')
  return <section className={styles.page}><span>404</span><h1>页面不存在</h1><p>请检查页面地址，或返回首页继续浏览。</p><Link to={home}>返回首页</Link></section>
}
