import type { Metadata } from 'next'
import Link from 'next/link'
import { RegisterForm } from './RegisterForm'

export const metadata: Metadata = { title: 'Register to submit a build' }

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md">
      <p className="osd text-signal">Contributor account</p>
      <h1 className="mt-2 text-3xl font-bold">Share your build</h1>
      <p className="mt-3 text-muted">
        Create an account, verify your email, then write up your build in the editor. An admin reviews
        every submission before it goes live.
      </p>
      <div className="mt-8">
        <RegisterForm />
      </div>
      <p className="mt-6 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/admin/login" className="text-accent underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
