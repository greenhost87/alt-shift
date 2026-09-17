import * as m from '../../../paraglide/messages.js';
import { Button } from '../../ui/button/Button';
import { Heading } from '../../ui/message/Heading';
import styles from './Landing.module.css';

type LandingProps = {
  onCreate: () => void;
};

export function Landing({ onCreate }: LandingProps) {
  return (
    <div className={styles['landing']}>
      <section className={styles['hero']}>
        <p className={styles['eyebrow']}>{m.landing_eyebrow()}</p>
        <div className={styles['title']}>
          <Heading kind="page">{m.landing_title()}</Heading>
        </div>
        <p className={styles['lead']}>{m.landing_description()}</p>
        <Button onClick={onCreate} size="large">
          {m.landing_cta()}
        </Button>
      </section>

      <section aria-labelledby="how-it-works" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <p className={styles['eyebrow']}>{m.landing_for_whom()}</p>
          <h2 id="how-it-works">{m.landing_how_title()}</h2>
        </div>
        <ol className={styles['steps']}>
          <li>
            <strong>{m.landing_step_role_title()}</strong>
            <span>{m.landing_step_role_description()}</span>
          </li>
          <li>
            <strong>{m.landing_step_strengths_title()}</strong>
            <span>{m.landing_step_strengths_description()}</span>
          </li>
          <li>
            <strong>{m.landing_step_letter_title()}</strong>
            <span>{m.landing_step_letter_description()}</span>
          </li>
        </ol>
      </section>

      <section aria-labelledby="benefits" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <h2 id="benefits">{m.landing_benefits_title()}</h2>
          <p>{m.landing_benefits_description()}</p>
        </div>
        <ul className={styles['benefits']}>
          <li>{m.landing_benefit_tailored()}</li>
          <li>{m.landing_benefit_fast()}</li>
          <li>{m.landing_benefit_private()}</li>
        </ul>
      </section>

      <section aria-labelledby="faq" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <h2 id="faq">{m.landing_faq_title()}</h2>
        </div>
        <div className={styles['faq']}>
          <details>
            <summary>{m.landing_faq_edit_question()}</summary>
            <p>{m.landing_faq_edit_answer()}</p>
          </details>
          <details>
            <summary>{m.landing_faq_storage_question()}</summary>
            <p>{m.landing_faq_storage_answer()}</p>
          </details>
          <details>
            <summary>{m.landing_faq_input_question()}</summary>
            <p>{m.landing_faq_input_answer()}</p>
          </details>
        </div>
      </section>

      <section className={styles['cta']}>
        <div>
          <h2>{m.landing_final_title()}</h2>
          <p>{m.landing_final_description()}</p>
        </div>
        <Button onClick={onCreate} size="large">
          {m.landing_cta()}
        </Button>
      </section>
    </div>
  );
}
