import styles from './PlaceholderPage.module.css'

interface PlaceholderPageProps {
  title: string
}

export default function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <section className={styles.page} aria-label={title}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.canvas} />
    </section>
  )
}
