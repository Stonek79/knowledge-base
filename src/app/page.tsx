import { WelcomePageContent } from '@/components/home';

import styles from './page.module.css';

export default function Home() {
    return (
        <div className={styles.page}>
            <main className={styles.main}>
                <WelcomePageContent />
            </main>
            <footer className={styles.footer}>
                <p>Footer</p>
            </footer>
        </div>
    );
}
