import { Button } from '../../ui/button/Button';
import { Heading } from '../../ui/message/Heading';
import styles from './Landing.module.css';

type LandingTexts = {
  eyebrow: string;
  title: string;
  description: string;
  cta: string;
  forWhom: string;
  howTitle: string;
  stepRoleTitle: string;
  stepRoleDescription: string;
  stepStrengthsTitle: string;
  stepStrengthsDescription: string;
  stepLetterTitle: string;
  stepLetterDescription: string;
  benefitsTitle: string;
  benefitsDescription: string;
  benefitTailored: string;
  benefitFast: string;
  benefitPrivate: string;
  faqTitle: string;
  faqEditQuestion: string;
  faqEditAnswer: string;
  faqStorageQuestion: string;
  faqStorageAnswer: string;
  faqInputQuestion: string;
  faqInputAnswer: string;
  finalTitle: string;
  finalDescription: string;
};

type LandingProps = {
  onCreate: () => void;
  texts: LandingTexts;
};

export function Landing({ onCreate, texts }: LandingProps) {
  return (
    <div className={styles['landing']}>
      <section className={styles['hero']}>
        <p className={styles['eyebrow']}>{texts.eyebrow}</p>
        <div className={styles['title']}>
          <Heading kind="page">{texts.title}</Heading>
        </div>
        <p className={styles['lead']}>{texts.description}</p>
        <Button onClick={onCreate} size="large">
          {texts.cta}
        </Button>
      </section>

      <section aria-labelledby="how-it-works" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <p className={styles['eyebrow']}>{texts.forWhom}</p>
          <h2 id="how-it-works">{texts.howTitle}</h2>
        </div>
        <ol className={styles['steps']}>
          <li>
            <strong>{texts.stepRoleTitle}</strong>
            <span>{texts.stepRoleDescription}</span>
          </li>
          <li>
            <strong>{texts.stepStrengthsTitle}</strong>
            <span>{texts.stepStrengthsDescription}</span>
          </li>
          <li>
            <h3 className={styles['stepTitle']}>{texts.stepLetterTitle}</h3>
            <p className={styles['stepDescription']}>{texts.stepLetterDescription}</p>
          </li>
        </ol>
      </section>

      <section aria-labelledby="benefits" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <h2 id="benefits">{texts.benefitsTitle}</h2>
          <p>{texts.benefitsDescription}</p>
        </div>
        <ul className={styles['benefits']}>
          <li>{texts.benefitTailored}</li>
          <li>{texts.benefitFast}</li>
          <li>{texts.benefitPrivate}</li>
        </ul>
      </section>

      <section aria-labelledby="faq" className={styles['section']}>
        <div className={styles['sectionHeading']}>
          <h2 id="faq">{texts.faqTitle}</h2>
        </div>
        <div className={styles['faq']}>
          <details>
            <summary>{texts.faqEditQuestion}</summary>
            <p>{texts.faqEditAnswer}</p>
          </details>
          <details>
            <summary>{texts.faqStorageQuestion}</summary>
            <p>{texts.faqStorageAnswer}</p>
          </details>
          <details>
            <summary>{texts.faqInputQuestion}</summary>
            <div className={styles['faqAnswer']}>{texts.faqInputAnswer}</div>
          </details>
        </div>
      </section>

      <section className={styles['cta']}>
        <div>
          <h2>{texts.finalTitle}</h2>
          <p>{texts.finalDescription}</p>
        </div>
        <Button onClick={onCreate} size="large">
          {texts.cta}
        </Button>
      </section>
    </div>
  );
}
