import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy', alternates: { canonical: '/privacy' } }

// Plain-language privacy notice. Review and complete it (controller name, contact) before launch.
export default function PrivacyPage() {
  return (
    <article className="prose mx-auto max-w-2xl dark:prose-invert prose-a:text-accent">
      <h1>Privacy</h1>
      <p>We keep this short and collect as little as we can.</p>
      <h2>Newsletter</h2>
      <ul>
        <li>We store your email address, when you gave consent (and the exact text you agreed to), and when you confirmed.</li>
        <li>We send with Resend (an email provider). To see what is useful we record whether you open a digest and which links you click.</li>
        <li>Every email has a one-click unsubscribe link. After unsubscribing we keep only your address and the dates, as proof of consent and opt-out.</li>
        <li>Want everything deleted? Email us and we will remove it.</li>
      </ul>
      <h2>Contributor accounts</h2>
      <p>For build submissions we store your name, email address and the content you upload. Your name is shown on published builds.</p>
      <h2>News and affiliate links</h2>
      <p>
        News items link to the original sources. Some parts lists contain affiliate links: the shop may know you came from
        us, and we may earn a commission. We don&apos;t use analytics or advertising cookies.
      </p>
    </article>
  )
}
