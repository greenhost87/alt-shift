import { CreateButton } from '../button/CreateButton';
import { Progress } from '../progress/Progress';
import typographyStyles from '../text/Typography.module.css';
import styles from './Banner.module.css';

type GoalBannerProps = {
  current: number;
  description: string;
  onCreate: () => void;
  total: number;
  visible?: boolean;
};

export function GoalBanner({
  current,
  description,
  onCreate,
  total,
  visible = true,
}: GoalBannerProps) {
  if (!visible) return null;
  return (
    <section className={styles['banner']}>
      <div className={styles['content']}>
        <div className={styles['heading']}>
          <h2 className={styles['title']}>Hit your goal</h2>
          <p className={[styles['description'], typographyStyles['body']].join(' ')}>
            {description}
          </p>
          <div className={styles['action']}>
            <CreateButton label="Create New" onClick={onCreate} prominent />
          </div>
        </div>
        <Progress
          accessibleLabel={`${current} of ${total} applications generated`}
          current={current}
          total={total}
        />
      </div>
    </section>
  );
}
