import type { ReactNode } from 'react';
import { Modal } from 'reshaped';
import * as m from '../../../paraglide/messages.js';
import { Button } from '../button/Button';
import { CreateButton } from '../button/CreateButton';
import { CloseIcon } from '../icon/Icon';
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

type BannerHeadingProps = {
  action?: ReactNode;
  description: string;
  title: string;
};

type SubscriptionModalProps = {
  active: boolean;
  onClose: () => void;
};

function BannerHeading({ action, description, title }: BannerHeadingProps) {
  return (
    <div className={styles['heading']}>
      <h2 className={styles['title']}>{title}</h2>
      <p className={[styles['description'], typographyStyles['body']].join(' ')}>{description}</p>
      {action}
    </div>
  );
}

export function SubscriptionModal({ active, onClose }: SubscriptionModalProps) {
  const title = m.subscription_banner_title();

  return (
    <Modal
      active={active}
      ariaLabel={title}
      className={styles['subscriptionModal']}
      onClose={onClose}
      position="center"
    >
      <div className={styles['closeAction']}>
        <Button icon={<CloseIcon />} onClick={onClose} variant="ghost">
          {m.close()}
        </Button>
      </div>
      <div className={styles['content']}>
        <BannerHeading description={m.subscription_banner_description()} title={title} />
      </div>
    </Modal>
  );
}

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
        <BannerHeading
          action={
            <div className={styles['action']}>
              <CreateButton label={m.create_new()} onClick={onCreate} prominent />
            </div>
          }
          description={description}
          title={m.hit_your_goal()}
        />
        <Progress
          accessibleLabel={m.applications_generated_accessible({ current, total })}
          current={current}
          total={total}
        />
      </div>
    </section>
  );
}
