import { Link } from 'react-router-dom'
import Icon from './Icon'
import styles from './Brand.module.css'
interface BrandProps { advisor?: boolean }

export default function Brand({ advisor = false }: BrandProps) {
  return <Link to="/" className={styles.brand} aria-label="返回平台入口" title="返回平台入口">
    <span className={styles.mark}><Icon name="chart" /></span>
    <span className={styles.words}><span className={styles.name}>FundPilot{advisor && <small>PRO</small>}</span>
      <span className={styles.subtitle}>{advisor ? 'ADVISOR WORKSPACE' : 'INTELLIGENT WEALTH'}</span>
    </span>
  </Link>
}
