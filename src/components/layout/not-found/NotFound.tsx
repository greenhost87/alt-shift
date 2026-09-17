import { Link } from '@tanstack/react-router';
import * as m from '../../../paraglide/messages.js';
import { Message } from '../../ui/message/Message';
import styles from './NotFound.module.css';

export function NotFound() {
  return (
    <>
      <title>Page Not Found — Alt+Shift</title>
      <meta name="description" content="The requested page could not be found." />
      <meta name="robots" content="noindex, nofollow" />
      <main className={styles['main']}>
        <Message title={m.page_not_found()} description={m.page_not_found_description()} level="h1">
          <Link to="/applications">{m.back_to_applications()}</Link>
        </Message>
      </main>
    </>
  );
}
