import type { ReactNode } from 'react';
import styles from './Banner.module.css';

type BannerProps = {
  action: ReactNode;
  description: string;
  footer: ReactNode;
  title: string;
};

export function Banner({ action, description, footer, title }: BannerProps) {
  return (
    <section className={styles['banner']}>
      <div className={styles['content']}>
        <div className={styles['heading']}>
          <h2 className={styles['title']}>{title}</h2>
          <p className={styles['description']}>{description}</p>
          {action}
        </div>
        {footer}
      </div>
    </section>
  );
}
